import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  normalizeCatalog,
  projectCatalogFreshness,
  refreshCatalog,
} from "../src/main/connections/catalog.js";
import { createModelCatalogCache } from "../src/main/connections/catalog-cache.js";
import { createFakeCatalogDriver } from "../src/main/connections/drivers/fake.js";
import type {
  DriverModelCandidate,
  ModelConnectionDriver,
} from "../src/main/connections/drivers/types.js";
import { createModelConnectionDriverRegistry } from "../src/main/connections/registry.js";

const CONNECTION_A = "11111111-1111-4111-8111-111111111111";
const CONNECTION_B = "22222222-2222-4222-8222-222222222222";
const FETCHED_AT = "2026-08-07T12:00:00.000Z";

function candidate(
  modelId: string,
  overrides: Partial<DriverModelCandidate> = {},
): DriverModelCandidate {
  return {
    modelId,
    displayName: modelId,
    supportedRoles: ["conductor"],
    reasoningOptions: ["standard"],
    modalities: ["text"],
    lifecycle: "stable",
    catalogSource: "authenticated",
    availabilityEvidence: "account-confirmed",
    price: { inputPerMillion: "1", outputPerMillion: "2", currency: "USD" },
    driverRecommendationEligible: false,
    providerDefault: false,
    exactModelAttribution: true,
    ...overrides,
  };
}

function normalized(
  models: readonly DriverModelCandidate[],
  authenticationRevision = "auth-r1",
) {
  return normalizeCatalog({
    identity: { connectionId: CONNECTION_A, authenticationRevision },
    catalogSource: "authenticated",
    candidates: models,
    fetchedAt: FETCHED_AT,
  });
}

test("catalog normalization is bounded, canonical, and never turns sort order into selection", () => {
  const alpha = candidate("author/alpha", {
    reasoningOptions: ["slow", "fast"],
    modalities: ["image", "text"],
  });
  const zeta = candidate("author/zeta", {
    supportedRoles: ["worker", "conductor"],
  });
  const first = normalized([zeta, alpha]);
  const second = normalizeCatalog({
    identity: { connectionId: CONNECTION_A, authenticationRevision: "auth-r1" },
    catalogSource: "authenticated",
    candidates: [
      { ...alpha, reasoningOptions: ["fast", "slow"], modalities: ["text", "image"] },
      { ...zeta, supportedRoles: ["conductor", "worker"] },
    ],
    fetchedAt: "2026-08-07T12:30:00.000Z",
  });

  assert.equal(first.kind, "ready");
  assert.equal(second.kind, "ready");
  if (first.kind !== "ready" || second.kind !== "ready") return;
  assert.equal(first.snapshot.catalogRevision, second.snapshot.catalogRevision);
  assert.deepEqual(first.snapshot.models.map((model) => model.modelId), ["author/alpha", "author/zeta"]);
  assert.deepEqual(first.snapshot.models[0]?.reasoningOptions, ["fast", "slow"]);
  assert.deepEqual(first.snapshot.models[0]?.modalities, ["text", "image"]);
  assert.equal(first.snapshot.models.every((model) => model.driverRecommendationEligible === false), true);

  const changed = normalized([{ ...alpha, displayName: "Alpha revised" }, zeta]);
  assert.equal(changed.kind, "ready");
  if (changed.kind === "ready") {
    assert.notEqual(changed.snapshot.catalogRevision, first.snapshot.catalogRevision);
  }
});

test("one malformed, duplicate, control-bearing, or oversized entry rejects the entire catalog", () => {
  const malformed: readonly (readonly DriverModelCandidate[])[] = [
    [candidate("author/one"), candidate("author/one")],
    [candidate("author/control", { displayName: "bad\u0000label" })],
    [candidate("author/oversized", { displayName: "x".repeat(161) })],
    [candidate("../escape")],
    [candidate("author/duplicate-option", { reasoningOptions: ["same", "same"] })],
    [candidate("author/bad-price", {
      price: { inputPerMillion: "01", outputPerMillion: "2", currency: "USD" },
    })],
    [candidate("author/default-a", { providerDefault: true }), candidate("author/default-b", { providerDefault: true })],
    [candidate("author/preview-recommendation", {
      lifecycle: "preview",
      driverRecommendationEligible: true,
    })],
    [{ ...candidate("author/not-exact"), exactModelAttribution: false } as unknown as DriverModelCandidate],
    [new Proxy(candidate("author/proxy"), {})],
  ];

  for (const models of malformed) {
    assert.equal(normalized(models).kind, "malformed");
  }
});

test("the fake driver receives only connection/auth identity and raw failures stay redacted", async () => {
  const fake = createFakeCatalogDriver({
    driverId: "fake-catalog",
    accessProvider: "Fake Provider",
    models: [candidate("author/safe")],
    autoPolicies: [],
    providerDefaultSemantics: "not-verified",
  });

  const result = await refreshCatalog(fake, {
    connectionId: CONNECTION_A,
    authenticationRevision: "auth-r1",
  }, { now: () => FETCHED_AT });

  assert.equal(result.kind, "ready");
  assert.deepEqual(fake.requests, [{
    connectionId: CONNECTION_A,
    authenticationRevision: "auth-r1",
  }]);
  assert.deepEqual(Object.keys(fake.requests[0] ?? {}).sort(), [
    "authenticationRevision",
    "connectionId",
  ]);

  for (const [failure, expected] of [
    [{ kind: "failed", code: "CATALOG_NETWORK_UNAVAILABLE", rawCanary: "must-not-escape" }, "offline"],
    [{ kind: "failed", code: "CATALOG_PROVIDER_UNAVAILABLE", rawCanary: "must-not-escape" }, "unavailable"],
    [{ kind: "failed", code: "CATALOG_AUTHENTICATION_REJECTED", rawCanary: "must-not-escape" }, "reconnect-required"],
  ] as const) {
    const failing = createFakeCatalogDriver({
      driverId: "fake-failure",
      accessProvider: "Fake Provider",
      result: failure,
      autoPolicies: [],
      providerDefaultSemantics: "not-verified",
    });
    const observed = await refreshCatalog(failing, {
      connectionId: CONNECTION_A,
      authenticationRevision: "auth-r1",
    }, { now: () => FETCHED_AT });
    assert.equal(observed.kind, expected);
    assert.equal(JSON.stringify(observed).includes("must-not-escape"), false);
  }
});

test("401/403 alone classify authentication as revoked; outage, 429, and 5xx do not", async () => {
  for (const status of [401, 403, 429, 500, 503]) {
    const fake = createFakeCatalogDriver({
      driverId: `fake-http-${status}`,
      accessProvider: "Fake Provider",
      result: { kind: "http-failure", status, rawCanary: "provider-body" },
      autoPolicies: [],
      providerDefaultSemantics: "not-verified",
    });
    const result = await refreshCatalog(fake, {
      connectionId: CONNECTION_A,
      authenticationRevision: "auth-r1",
    }, { now: () => FETCHED_AT });
    assert.equal(result.kind, status === 401 || status === 403 ? "reconnect-required" : "unavailable");
    assert.equal(JSON.stringify(result).includes("provider-body"), false);
  }
});

test("hidden entries stay inside the driver and opaque router aliases reject exact attribution", async () => {
  const hiddenId = "author/hidden";
  const visibleId = "author/visible";
  const hiding = createFakeCatalogDriver({
    driverId: "fake-hidden",
    accessProvider: "Fake Provider",
    models: [candidate(hiddenId), candidate(visibleId)],
    hiddenModelIds: [hiddenId],
    autoPolicies: [],
    providerDefaultSemantics: "not-verified",
  });
  const shown = await refreshCatalog(hiding, {
    connectionId: CONNECTION_A,
    authenticationRevision: "auth-r1",
  }, { now: () => FETCHED_AT });
  assert.equal(shown.kind, "ready");
  if (shown.kind === "ready") {
    assert.deepEqual(shown.snapshot.models.map((model) => model.modelId), [visibleId]);
  }

  const alias = "router/auto";
  const opaque = createFakeCatalogDriver({
    driverId: "fake-opaque",
    accessProvider: "Fake Provider",
    models: [candidate(alias)],
    opaqueRouterAliases: [alias],
    autoPolicies: [],
    providerDefaultSemantics: "not-verified",
  });
  const refused = await refreshCatalog(opaque, {
    connectionId: CONNECTION_A,
    authenticationRevision: "auth-r1",
  }, { now: () => FETCHED_AT });
  assert.deepEqual(refused, { kind: "unavailable", code: "MODEL_CATALOG_UNAVAILABLE" });
});

test("freshness uses an injected clock and hard-expired snapshots become display-only", () => {
  const result = normalized([candidate("author/model")]);
  assert.equal(result.kind, "ready");
  if (result.kind !== "ready") return;
  const policy = { staleAfterMs: 60_000, hardTtlMs: 300_000 };

  assert.equal(projectCatalogFreshness(result.snapshot, policy, FETCHED_AT).freshness, "fresh");
  assert.equal(projectCatalogFreshness(
    result.snapshot,
    policy,
    "2026-08-07T12:01:00.001Z",
  ).freshness, "stale");
  assert.equal(projectCatalogFreshness(
    result.snapshot,
    policy,
    "2026-08-07T12:05:00.001Z",
  ).freshness, "display-only");
  assert.equal(projectCatalogFreshness(
    result.snapshot,
    policy,
    "2026-08-07T11:59:59.999Z",
  ).freshness, "display-only", "a future observation fails closed");
});

test("cache identity is the exact connection/authentication tuple and reauth cannot reuse old data", (t) => {
  const root = mkdtempSync(join(tmpdir(), "cairn-catalog-cache-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  let now = FETCHED_AT;
  const freshnessPolicy = { staleAfterMs: 60_000, hardTtlMs: 300_000 };
  const cache = createModelCatalogCache(join(root, "model-catalogs.json"), {
    now: () => now,
  });
  const first = normalized([candidate("author/old")]);
  assert.equal(first.kind, "ready");
  if (first.kind !== "ready") return;
  assert.equal(cache.putCatalog(first.snapshot, {
    connectionId: CONNECTION_A,
    authenticationRevision: "auth-r1",
  }).kind, "written");

  assert.equal(cache.lookupCatalog({
    connectionId: CONNECTION_A,
    authenticationRevision: "auth-r1",
  }, freshnessPolicy).kind, "hit");
  assert.equal(cache.lookupCatalog({
    connectionId: CONNECTION_B,
    authenticationRevision: "auth-r1",
  }, freshnessPolicy).kind, "miss");
  assert.equal(cache.lookupCatalog({
    connectionId: CONNECTION_A,
    authenticationRevision: "auth-r2",
  }, freshnessPolicy).kind, "miss");

  const second = normalized([candidate("author/new")], "auth-r2");
  assert.equal(second.kind, "ready");
  if (second.kind !== "ready") return;
  assert.equal(cache.putCatalog(second.snapshot, {
    connectionId: CONNECTION_A,
    authenticationRevision: "auth-r2",
  }).kind, "written");
  assert.equal(cache.lookupCatalog({
    connectionId: CONNECTION_A,
    authenticationRevision: "auth-r1",
  }, freshnessPolicy).kind, "miss");
  assert.equal(cache.lookupCatalog({
    connectionId: CONNECTION_A,
    authenticationRevision: "auth-r2",
  }, freshnessPolicy).kind, "hit");

  assert.equal(cache.putCatalog(first.snapshot, {
    connectionId: CONNECTION_A,
    authenticationRevision: "auth-r2",
  }).kind, "invalid", "a late pre-reauth refresh cannot replace the current cache");
  assert.equal(cache.lookupCatalog({
    connectionId: CONNECTION_A,
    authenticationRevision: "auth-r2",
  }, freshnessPolicy).kind, "hit");
  assert.equal(cache.lookupCatalog({
    connectionId: CONNECTION_A,
    authenticationRevision: "auth-r1",
  }, freshnessPolicy).kind, "miss");

  now = "2026-08-07T12:06:00.000Z";
  const hardExpired = cache.lookupCatalog({
    connectionId: CONNECTION_A,
    authenticationRevision: "auth-r2",
  }, freshnessPolicy);
  assert.equal(hardExpired.kind, "hit");
  if (hardExpired.kind === "hit") assert.equal(hardExpired.snapshot.freshness, "display-only");
});

test("cache integrity rejects timestamp-only catalog tampering after restart", (t) => {
  const root = mkdtempSync(join(tmpdir(), "cairn-catalog-cache-tamper-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const cachePath = join(root, "model-catalogs.json");
  const freshnessPolicy = { staleAfterMs: 60_000, hardTtlMs: 300_000 };
  const cache = createModelCatalogCache(cachePath, { now: () => FETCHED_AT });
  const first = normalized([candidate("author/timestamp-bound")]);
  assert.equal(first.kind, "ready");
  if (first.kind !== "ready") return;
  assert.equal(cache.putCatalog(first.snapshot, {
    connectionId: CONNECTION_A,
    authenticationRevision: "auth-r1",
  }).kind, "written");

  const original = readFileSync(cachePath, "utf8");
  writeFileSync(cachePath, ` ${original}`, "utf8");
  assert.equal(createModelCatalogCache(cachePath, { now: () => FETCHED_AT }).lookupCatalog({
    connectionId: CONNECTION_A,
    authenticationRevision: "auth-r1",
  }, freshnessPolicy).kind, "invalid", "non-canonical persisted bytes fail closed");
  writeFileSync(cachePath, original, "utf8");

  const stored = JSON.parse(original) as {
    catalogs: Array<{
      fetchedAt: string;
      models: Array<{ fetchedAt: string }>;
    }>;
  };
  const altered = "2026-08-07T12:00:30.000Z";
  const persisted = stored.catalogs[0];
  assert.ok(persisted);
  persisted.fetchedAt = altered;
  for (const model of persisted.models) model.fetchedAt = altered;
  writeFileSync(cachePath, `${JSON.stringify(stored)}\n`, "utf8");

  const restarted = createModelCatalogCache(cachePath, { now: () => altered });
  assert.deepEqual(restarted.lookupCatalog({
    connectionId: CONNECTION_A,
    authenticationRevision: "auth-r1",
  }, freshnessPolicy), {
    kind: "invalid",
    code: "MODEL_CATALOG_CACHE_INVALID",
  });
});

test("the immutable registry rejects duplicate drivers and exposes exact reviewed policies", () => {
  const driver = createFakeCatalogDriver({
    driverId: "fake-registry",
    accessProvider: "Fake Provider",
    models: [candidate("author/model")],
    autoPolicies: [{
      policyVersion: "quality-v1",
      role: "conductor",
      orderedExactModelIds: ["author/model"],
      reasonCode: "REVIEWED_QUALITY_COST",
      costBand: "balanced",
    }],
    providerDefaultSemantics: "verified-exact",
  });
  const registry = createModelConnectionDriverRegistry([driver]);

  assert.equal(registry.get("fake-registry"), driver);
  assert.equal(registry.get("missing"), null);
  assert.equal(driver.recommendation("quality-v1", "conductor")?.orderedExactModelIds[0], "author/model");
  assert.equal(driver.recommendation("other", "conductor"), null);
  assert.throws(() => createModelConnectionDriverRegistry([driver, driver]), /duplicate/i);
  assert.throws(() => createModelConnectionDriverRegistry([{
    ...driver,
    driverId: "bad driver id",
  } as ModelConnectionDriver]), /driver/i);
});
