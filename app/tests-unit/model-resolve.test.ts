import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  CatalogSnapshot,
  ConductorAssignment,
  ConductorGrant,
  GatewayRoutingPolicy,
  LinkMetadataGrant,
  ModelOption,
  ProjectAuthorityId,
  ProviderManagedRuntimeLink,
  WorkerAssignment,
} from "../src/shared/model-connections.js";
import { parseResolvedRoute } from "../src/main/connections/schema.js";
import { normalizeCatalog, projectCatalogFreshness } from "../src/main/connections/catalog.js";
import { createModelCatalogCache } from "../src/main/connections/catalog-cache.js";
import { createFakeCatalogDriver } from "../src/main/connections/drivers/fake.js";
import type {
  DriverModelCandidate,
  ModelConnectionDriver,
  ReviewedAutoRecommendation,
} from "../src/main/connections/drivers/types.js";
import { createModelConnectionDriverRegistry } from "../src/main/connections/registry.js";
import {
  calculateConversationBindingDigest,
  calculateRouteAuthorityDigest,
  createConversationRouteBinding,
  resolvePinnedSelection,
  resolveConductorRoute,
  resolveWorkerRoute,
  type RouteConnectionAuthority,
} from "../src/main/connections/resolve.js";

const PROJECT_A = "11111111-1111-4111-8111-111111111111" as ProjectAuthorityId;
const PROJECT_B = "22222222-2222-4222-8222-222222222222" as ProjectAuthorityId;
const CONNECTION_A = "33333333-3333-4333-8333-333333333333";
const RUNTIME_ID = "55555555-5555-4555-8555-555555555555";
const ROUTE_A = "66666666-6666-4666-8666-666666666666";
const ROUTE_B = "77777777-7777-4777-8777-777777777777";
const RESOLVED_AT = "2026-08-07T12:00:00.000Z";
const BOUND_AT = "2026-08-07T12:00:01.000Z";

const NOT_A_GATEWAY: GatewayRoutingPolicy = Object.freeze({
  mode: "not-a-gateway",
  allowedServingProviders: Object.freeze([]),
  allowServingProviderFallback: false,
  allowByok: false,
  allowSharedCapacityAfterByok: false,
  region: null,
});

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

function catalog(
  models: readonly DriverModelCandidate[],
  connectionId = CONNECTION_A,
  authenticationRevision = "auth-r1",
  fetchedAt = RESOLVED_AT,
): CatalogSnapshot {
  const result = normalizeCatalog({
    identity: { connectionId, authenticationRevision },
    catalogSource: "authenticated",
    candidates: models,
    fetchedAt,
  });
  assert.equal(result.kind, "ready");
  if (result.kind !== "ready") throw new Error("catalog fixture failed");
  return result.snapshot;
}

function driver(
  models: readonly DriverModelCandidate[],
  options: {
    policies?: readonly {
      policyVersion: string;
      role: "conductor" | "worker";
      orderedExactModelIds: readonly string[];
      reasonCode: string;
      costBand: "low" | "balanced" | "premium" | "unknown";
    }[];
    providerDefaultSemantics?: "verified-exact" | "not-verified";
    modelAuthors?: Readonly<Record<string, string | null>>;
  } = {},
) {
  return createFakeCatalogDriver({
    driverId: "fake-driver",
    accessProvider: "Fake Provider",
    models,
    autoPolicies: options.policies ?? [],
    providerDefaultSemantics: options.providerDefaultSemantics ?? "not-verified",
    modelAuthors: options.modelAuthors,
  });
}

function connection(overrides: Partial<RouteConnectionAuthority> = {}): RouteConnectionAuthority {
  return {
    summary: {
      id: CONNECTION_A,
      driverId: "fake-driver",
      accessProvider: "Fake Provider",
      displayName: "Fake primary",
      accountSafeLabel: "safe-account",
      accountLabelProvenance: "provider-verified",
      authKind: "api-key",
      billingKind: "pay-as-you-go",
      supportedRoles: ["conductor"],
      runtimeId: null,
      status: "ready",
      authenticationRevision: "auth-r1",
    },
    credentialState: "ready",
    billingRoute: {
      kind: "pay-as-you-go",
      source: "provider-account",
      certainty: "provider-reported",
      label: "Expected billing: Fake Provider account",
    },
    billingRevision: "billing-r1",
    capabilityRevision: "capability-r1",
    gatewayRouting: NOT_A_GATEWAY,
    routingPolicyRevision: "routing-r1",
    runtime: null,
    ...overrides,
  };
}

function assignment(
  mode: "pinned" | "auto",
  value: string,
  connectionId = CONNECTION_A,
): ConductorAssignment {
  return mode === "pinned"
    ? {
        role: "conductor",
        mode,
        connectionId,
        modelId: value,
        assignmentRevision: `assignment-${connectionId === CONNECTION_A ? "a" : "b"}`,
      }
    : {
        role: "conductor",
        mode,
        connectionId,
        policyVersion: value,
        assignmentRevision: `assignment-${connectionId === CONNECTION_A ? "a" : "b"}`,
      };
}

function linkGrant(overrides: Partial<LinkMetadataGrant> = {}): LinkMetadataGrant {
  return {
    grantRevision: "link-r1",
    connectionId: CONNECTION_A,
    authenticationRevision: "auth-r1",
    authorizationBasis: "explicit",
    metadataScope: ["models.list"],
    metadataCostCertainty: "documented-no-charge",
    routingPolicyRevision: "routing-r1",
    grantedAt: RESOLVED_AT,
    ...overrides,
  };
}

function conductorGrant(
  modelAuthorization: ConductorGrant["modelAuthorization"],
  overrides: Partial<ConductorGrant> = {},
): ConductorGrant {
  return {
    grantRevision: "conductor-r1",
    projectAuthorityId: PROJECT_A,
    connectionId: CONNECTION_A,
    authenticationRevision: "auth-r1",
    authorizationBasis: "explicit",
    authorizedDataScope: "conductor-data-scope-v4",
    billingKind: "pay-as-you-go",
    billingRevision: "billing-r1",
    routingPolicyRevision: "routing-r1",
    modelAuthorization,
    grantedAt: RESOLVED_AT,
    ...overrides,
  };
}

function resolveNew(
  selected: ConductorAssignment,
  snapshot: CatalogSnapshot | null,
  selectedDriver: ModelConnectionDriver = driver([]),
  overrides: Partial<Parameters<typeof resolveConductorRoute>[0]> = {},
) {
  return resolveConductorRoute({
    projectAuthorityId: PROJECT_A,
    conversationId: "001",
    selection: { kind: "new", assignment: selected },
    connection: connection(),
    linkGrant: linkGrant(),
    conductorGrant: conductorGrant(selected.mode === "auto"
      ? { mode: "auto", policyVersion: selected.policyVersion }
      : { mode: "pinned", modelId: selected.modelId }),
    catalog: snapshot,
    manualModel: null,
    registry: createModelConnectionDriverRegistry([selectedDriver]),
    routeInstanceId: ROUTE_A,
    resolvedAt: RESOLVED_AT,
    boundAt: BOUND_AT,
    ...overrides,
  });
}

test("a pinned catalog model resolves to one complete parseable route; removal never falls back", () => {
  const pinned = candidate("author/pinned");
  const fallback = candidate("author/default", { providerDefault: true });
  const snapshot = catalog([fallback, pinned]);
  const resolved = resolveNew(assignment("pinned", pinned.modelId), snapshot, driver([fallback, pinned], {
    providerDefaultSemantics: "verified-exact",
  }));

  assert.equal(resolved.kind, "resolved");
  if (resolved.kind !== "resolved") return;
  assert.equal(resolved.reason, "PINNED_MODEL");
  assert.equal(resolved.route.modelId, pinned.modelId);
  assert.equal(parseResolvedRoute(resolved.route).kind, "valid");
  assert.equal(resolved.binding.resolvedRoute.modelId, pinned.modelId);

  assert.deepEqual(resolveNew(
    assignment("pinned", pinned.modelId),
    snapshot,
    driver([fallback, pinned], { providerDefaultSemantics: "verified-exact" }),
    { linkGrant: linkGrant({ metadataScope: ["account.identity"] }) },
  ), { kind: "needs-attention", code: "GRANT_MISMATCH" });

  const removed = resolveNew(
    assignment("pinned", pinned.modelId),
    catalog([fallback]),
    driver([fallback], { providerDefaultSemantics: "verified-exact" }),
  );
  assert.deepEqual(removed, { kind: "needs-attention", code: "MODEL_REMOVED" });
});

test("new resolution cannot cross connection, driver, provider, role, or billing authority", () => {
  const model = candidate("author/isolated");
  const snapshot = catalog([model]);
  const selectedDriver = driver([model]);
  assert.deepEqual(resolveNew(
    assignment("pinned", model.modelId, "22222222-2222-4222-8222-222222222222"),
    snapshot,
    selectedDriver,
  ), { kind: "needs-attention", code: "CONNECTION_OR_DRIVER_MISMATCH" });
  assert.deepEqual(resolveNew(
    assignment("pinned", model.modelId),
    snapshot,
    selectedDriver,
    {
      connection: connection({
        summary: { ...connection().summary, driverId: "different-driver" },
      }),
    },
  ), { kind: "needs-attention", code: "CONNECTION_OR_DRIVER_MISMATCH" });
  assert.deepEqual(resolveNew(
    assignment("pinned", model.modelId),
    snapshot,
    selectedDriver,
    {
      connection: connection({
        summary: { ...connection().summary, accessProvider: "Different Provider" },
      }),
    },
  ), { kind: "needs-attention", code: "CONNECTION_OR_DRIVER_MISMATCH" });
  assert.deepEqual(resolveNew(
    assignment("pinned", model.modelId),
    snapshot,
    selectedDriver,
    {
      connection: connection({
        summary: { ...connection().summary, supportedRoles: [] },
      }),
    },
  ), { kind: "needs-attention", code: "ROLE_INCOMPATIBLE" });
  assert.deepEqual(resolveNew(
    assignment("pinned", model.modelId),
    snapshot,
    selectedDriver,
    {
      connection: connection({
        billingRoute: {
          kind: "unknown",
          source: "unknown",
          certainty: "unknown",
          label: "Billing could not be verified",
        },
      }),
    },
  ), { kind: "needs-attention", code: "ROUTE_AUTHORITY_CHANGED" });
});

test("new Auto uses reviewed exact order, then verified exact provider default, never catalog sort", () => {
  const alphabetical = candidate("author/aaa-new");
  const reviewedFirst = candidate("author/z-reviewed", { driverRecommendationEligible: true });
  const reviewedSecond = candidate("author/y-reviewed", { driverRecommendationEligible: true });
  const providerDefault = candidate("author/provider-default", { providerDefault: true });
  const preview = candidate("author/preview", { lifecycle: "preview", providerDefault: true });
  const deprecated = candidate("author/deprecated", { lifecycle: "deprecated" });
  const unknown = candidate("author/unknown", { lifecycle: "unknown" });
  const models = [alphabetical, reviewedSecond, reviewedFirst, providerDefault];
  const selectedDriver = driver(models, {
    policies: [{
      policyVersion: "quality-v1",
      role: "conductor",
      orderedExactModelIds: [reviewedFirst.modelId, reviewedSecond.modelId],
      reasonCode: "REVIEWED_QUALITY_COST",
      costBand: "balanced",
    }],
    providerDefaultSemantics: "verified-exact",
  });
  const resolved = resolveNew(assignment("auto", "quality-v1"), catalog(models), selectedDriver);
  assert.equal(resolved.kind, "resolved");
  if (resolved.kind === "resolved") {
    assert.equal(resolved.reason, "REVIEWED_RECOMMENDATION");
    assert.equal(resolved.route.modelId, reviewedFirst.modelId);
  }

  const noRecommendation = driver([alphabetical, providerDefault], {
    policies: [{
      policyVersion: "quality-v1",
      role: "conductor",
      orderedExactModelIds: ["author/not-present"],
      reasonCode: "REVIEWED_QUALITY_COST",
      costBand: "balanced",
    }],
    providerDefaultSemantics: "verified-exact",
  });
  const defaulted = resolveNew(
    assignment("auto", "quality-v1"),
    catalog([alphabetical, providerDefault]),
    noRecommendation,
  );
  assert.equal(defaulted.kind, "resolved");
  if (defaulted.kind === "resolved") {
    assert.equal(defaulted.reason, "VERIFIED_PROVIDER_DEFAULT");
    assert.equal(defaulted.route.modelId, providerDefault.modelId);
  }

  const defaultWithoutRecommendation = resolveNew(
    assignment("auto", "provider-default-v1"),
    catalog([alphabetical, providerDefault]),
    driver([alphabetical, providerDefault], {
      policies: [],
      providerDefaultSemantics: "verified-exact",
    }),
    {
      conductorGrant: conductorGrant({ mode: "auto", policyVersion: "provider-default-v1" }),
    },
  );
  assert.equal(defaultWithoutRecommendation.kind, "resolved");
  if (defaultWithoutRecommendation.kind === "resolved") {
    assert.equal(defaultWithoutRecommendation.reason, "VERIFIED_PROVIDER_DEFAULT");
    assert.equal(defaultWithoutRecommendation.route.modelId, providerDefault.modelId);
  }

  const unavailable = resolveNew(
    assignment("auto", "quality-v1"),
    catalog([alphabetical, preview, deprecated, unknown]),
    driver([alphabetical, preview, deprecated, unknown], {
      policies: [{
        policyVersion: "quality-v1",
        role: "conductor",
        orderedExactModelIds: [preview.modelId, deprecated.modelId, unknown.modelId, alphabetical.modelId],
        reasonCode: "REVIEWED_QUALITY_COST",
        costBand: "balanced",
      }],
      providerDefaultSemantics: "not-verified",
    }),
  );
  assert.deepEqual(unavailable, { kind: "needs-attention", code: "AUTO_UNAVAILABLE" });
});

test("a conversation binding retains its exact model across profile policy/catalog change and restart", (t) => {
  const modelA = candidate("author/model-a", { driverRecommendationEligible: true });
  const modelB = candidate("author/model-b", { driverRecommendationEligible: true });
  const policies = [
    {
      policyVersion: "quality-v1",
      role: "conductor" as const,
      orderedExactModelIds: [modelA.modelId],
      reasonCode: "REVIEWED_V1",
      costBand: "balanced" as const,
    },
    {
      policyVersion: "quality-v2",
      role: "conductor" as const,
      orderedExactModelIds: [modelB.modelId],
      reasonCode: "REVIEWED_V2",
      costBand: "balanced" as const,
    },
  ];
  const selectedDriver = driver([modelA, modelB], { policies });
  const updatedDriver = driver([modelA, modelB], { policies: [policies[1]!] });
  const first = resolveNew(assignment("auto", "quality-v1"), catalog([modelA, modelB]), selectedDriver);
  assert.equal(first.kind, "resolved");
  if (first.kind !== "resolved") return;
  assert.equal(first.route.modelId, modelA.modelId);

  const retained = resolveConductorRoute({
    projectAuthorityId: PROJECT_A,
    conversationId: "001",
    selection: {
      kind: "bound",
      binding: first.binding,
    },
    connection: connection(),
    linkGrant: linkGrant(),
    conductorGrant: conductorGrant({ mode: "auto", policyVersion: "quality-v1" }),
    catalog: catalog([
      { ...modelB, displayName: "Model B metadata revised" },
      modelA,
    ], CONNECTION_A, "auth-r1", "2026-08-07T12:10:00.000Z"),
    manualModel: null,
    registry: createModelConnectionDriverRegistry([updatedDriver]),
    routeInstanceId: ROUTE_B,
    resolvedAt: "2026-08-07T12:10:00.000Z",
    boundAt: "2026-08-07T12:10:01.000Z",
  });
  assert.equal(retained.kind, "resolved");
  if (retained.kind !== "resolved") return;
  assert.equal(retained.reason, "RETAINED_CONVERSATION_MODEL");
  assert.equal(retained.route.modelId, modelA.modelId);
  assert.notEqual(retained.route.catalogRevision, first.route.catalogRevision);

  const secondConversation = resolveConductorRoute({
    projectAuthorityId: PROJECT_A,
    conversationId: "002",
    selection: { kind: "new", assignment: assignment("auto", "quality-v2") },
    connection: connection(),
    linkGrant: linkGrant(),
    conductorGrant: conductorGrant(
      { mode: "auto", policyVersion: "quality-v2" },
      { grantRevision: "conductor-r2" },
    ),
    catalog: catalog([modelA, modelB]),
    manualModel: null,
    registry: createModelConnectionDriverRegistry([selectedDriver]),
    routeInstanceId: "99999999-9999-4999-8999-999999999999",
    resolvedAt: RESOLVED_AT,
    boundAt: BOUND_AT,
  });
  assert.equal(secondConversation.kind, "resolved");
  if (secondConversation.kind !== "resolved") return;
  assert.equal(secondConversation.route.modelId, modelB.modelId);

  const root = mkdtempSync(join(tmpdir(), "cairn-binding-cache-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const cachePath = join(root, "model-catalogs.json");
  const cache = createModelCatalogCache(cachePath, {
    now: () => "2026-08-07T12:10:01.000Z",
  });
  assert.equal(cache.putBinding(retained.binding).kind, "written");
  assert.equal(cache.putBinding(secondConversation.binding).kind, "written");
  const restarted = createModelCatalogCache(cachePath, {
    now: () => "2026-08-07T12:10:02.000Z",
  });
  const found = restarted.lookupBinding(PROJECT_A, "001");
  assert.equal(found.kind, "hit");
  if (found.kind === "hit") assert.deepEqual(found.binding, retained.binding);
  const foundSecond = restarted.lookupBinding(PROJECT_A, "002");
  assert.equal(foundSecond.kind, "hit");
  if (foundSecond.kind === "hit") assert.deepEqual(foundSecond.binding, secondConversation.binding);
  assert.equal(restarted.lookupBinding(PROJECT_B, "001").kind, "miss");

  const projectBGrant = conductorGrant(
    { mode: "auto", policyVersion: "quality-v2" },
    { projectAuthorityId: PROJECT_B },
  );
  const projectB = resolveConductorRoute({
    projectAuthorityId: PROJECT_B,
    conversationId: "001",
    selection: { kind: "new", assignment: assignment("auto", "quality-v2") },
    connection: connection(),
    linkGrant: linkGrant(),
    conductorGrant: projectBGrant,
    catalog: catalog([modelA, modelB]),
    manualModel: null,
    registry: createModelConnectionDriverRegistry([selectedDriver]),
    routeInstanceId: "88888888-8888-4888-8888-888888888888",
    resolvedAt: RESOLVED_AT,
    boundAt: BOUND_AT,
  });
  assert.equal(projectB.kind, "resolved");
  if (projectB.kind !== "resolved") return;
  assert.equal(projectB.route.modelId, modelB.modelId);
  assert.equal(restarted.putBinding(projectB.binding).kind, "written");
  assert.equal(restarted.lookupBinding(PROJECT_A, "001").kind, "hit");
  const other = restarted.lookupBinding(PROJECT_B, "001");
  assert.equal(other.kind, "hit");
  if (other.kind === "hit") assert.equal(other.binding.resolvedRoute.modelId, modelB.modelId);
});

test("an invalidated bound Auto route pauses and never falls through to another model", () => {
  const retainedModel = candidate("author/retained", { driverRecommendationEligible: true });
  const replacement = candidate("author/replacement", {
    driverRecommendationEligible: true,
    providerDefault: true,
  });
  const selectedDriver = driver([retainedModel, replacement], {
    policies: [{
      policyVersion: "quality-v1",
      role: "conductor",
      orderedExactModelIds: [retainedModel.modelId, replacement.modelId],
      reasonCode: "REVIEWED",
      costBand: "balanced",
    }],
    providerDefaultSemantics: "verified-exact",
  });
  const first = resolveNew(
    assignment("auto", "quality-v1"),
    catalog([retainedModel, replacement]),
    selectedDriver,
  );
  assert.equal(first.kind, "resolved");
  if (first.kind !== "resolved") return;
  const base = {
    projectAuthorityId: PROJECT_A,
    conversationId: "001",
    selection: {
      kind: "bound" as const,
      binding: first.binding,
    },
    connection: connection(),
    linkGrant: linkGrant(),
    conductorGrant: conductorGrant({ mode: "auto", policyVersion: "quality-v1" }),
    catalog: catalog([replacement]),
    manualModel: null,
    registry: createModelConnectionDriverRegistry([selectedDriver]),
    routeInstanceId: ROUTE_B,
    resolvedAt: "2026-08-07T12:00:02.000Z",
    boundAt: "2026-08-07T12:00:03.000Z",
  };

  assert.deepEqual(resolveConductorRoute(base), {
    kind: "needs-attention",
    code: "MODEL_REMOVED",
  });
  assert.deepEqual(resolveConductorRoute({
    ...base,
    catalog: catalog([retainedModel, replacement], CONNECTION_A, "auth-r2"),
    connection: connection({ summary: {
      ...connection().summary,
      authenticationRevision: "auth-r2",
    } }),
    linkGrant: linkGrant({ authenticationRevision: "auth-r2" }),
    conductorGrant: conductorGrant(
      { mode: "auto", policyVersion: "quality-v1" },
      { authenticationRevision: "auth-r2" },
    ),
  }), { kind: "needs-attention", code: "AUTHENTICATION_CHANGED" });

  const stale = projectCatalogFreshness(
    catalog([retainedModel, replacement]),
    { staleAfterMs: 1, hardTtlMs: 10_000 },
    "2026-08-07T12:00:00.002Z",
  );
  assert.deepEqual(resolveConductorRoute({
    ...base,
    catalog: stale,
    resolvedAt: "2026-08-07T12:02:00.000Z",
    boundAt: "2026-08-07T12:02:01.000Z",
  }), {
    kind: "needs-attention",
    code: "CATALOG_STALE",
  });
  const forgedFreshOld = catalog(
    [retainedModel, replacement],
    CONNECTION_A,
    "auth-r1",
    "2026-08-07T11:00:00.000Z",
  );
  assert.equal(forgedFreshOld.freshness, "fresh", "the stored label is deliberately forged/stale");
  assert.deepEqual(resolveConductorRoute({ ...base, catalog: forgedFreshOld }), {
    kind: "needs-attention",
    code: "CATALOG_STALE",
  });
  const tamperedRevision = {
    ...catalog([retainedModel, replacement]),
    catalogRevision: `sha256:${"f".repeat(64)}`,
  };
  assert.deepEqual(resolveConductorRoute({ ...base, catalog: tamperedRevision }), {
    kind: "needs-attention",
    code: "INVALID_AUTHORITY",
  });
  assert.deepEqual(resolveConductorRoute({
    ...base,
    catalog: catalog([retainedModel, replacement]),
    connection: connection({ billingRevision: "billing-r2" }),
    conductorGrant: conductorGrant(
      { mode: "auto", policyVersion: "quality-v1" },
      { billingRevision: "billing-r2" },
    ),
  }), { kind: "needs-attention", code: "ROUTE_AUTHORITY_CHANGED" });

  const currentCatalog = catalog([retainedModel, replacement]);
  assert.deepEqual(resolveConductorRoute({
    ...base,
    catalog: currentCatalog,
    connection: connection({ credentialState: "unavailable" }),
  }), { kind: "needs-attention", code: "CONNECTION_NOT_READY" });
  assert.deepEqual(resolveConductorRoute({
    ...base,
    catalog: currentCatalog,
    connection: connection({ capabilityRevision: "capability-r2" }),
  }), { kind: "needs-attention", code: "ROUTE_AUTHORITY_CHANGED" });
  assert.deepEqual(resolveConductorRoute({
    ...base,
    catalog: currentCatalog,
    connection: connection({
      summary: {
        ...connection().summary,
        accountSafeLabel: "different-safe-account",
        accountLabelProvenance: "provider-verified",
      },
    }),
  }), { kind: "needs-attention", code: "ROUTE_AUTHORITY_CHANGED" });
  const changedGateway: GatewayRoutingPolicy = {
    mode: "gateway-managed",
    allowedServingProviders: [],
    allowServingProviderFallback: true,
    allowByok: true,
    allowSharedCapacityAfterByok: true,
    region: null,
  };
  assert.deepEqual(resolveConductorRoute({
    ...base,
    catalog: currentCatalog,
    connection: connection({
      billingRoute: {
        kind: "pay-as-you-go",
        source: "byok-with-provider-fallback",
        certainty: "provider-reported",
        label: "Expected billing: BYOK with shared-capacity fallback",
      },
      gatewayRouting: changedGateway,
    }),
  }), { kind: "needs-attention", code: "ROUTE_AUTHORITY_CHANGED" });
  assert.deepEqual(resolveConductorRoute({
    ...base,
    catalog: currentCatalog,
    conductorGrant: conductorGrant(
      { mode: "auto", policyVersion: "quality-v1" },
      { grantRevision: "conductor-r2" },
    ),
  }), { kind: "needs-attention", code: "GRANT_MISMATCH" });
});

test("raw API models never resolve as workers; a fixed trusted worker is pinned-only", () => {
  const manualModel: ModelOption = {
    connectionId: CONNECTION_A,
    modelId: "author/fixed-worker",
    displayName: "Fixed worker",
    supportedRoles: ["worker"],
    reasoningOptions: [],
    modalities: ["text"],
    lifecycle: "stable",
    catalogSource: "manual",
    availabilityEvidence: "configured-manually",
    price: { inputPerMillion: null, outputPerMillion: null, currency: null },
    driverRecommendationEligible: false,
    providerDefault: false,
    fetchedAt: RESOLVED_AT,
  };
  const pinned: WorkerAssignment = {
    role: "worker",
    mode: "pinned",
    connectionId: CONNECTION_A,
    runtimeId: RUNTIME_ID,
    modelId: manualModel.modelId,
    assignmentRevision: "worker-assignment-r1",
  };
  const rawApi = connection({
    summary: {
      ...connection().summary,
      supportedRoles: ["worker"],
      runtimeId: RUNTIME_ID,
    },
  });
  const selectedDriver = driver([]);
  const common = {
    projectAuthorityId: PROJECT_A,
    assignment: pinned,
    authoritySource: { kind: "assignment" as const, assignmentRevision: pinned.assignmentRevision },
    linkGrant: linkGrant(),
    catalog: null,
    manualModel,
    registry: createModelConnectionDriverRegistry([selectedDriver]),
    routeInstanceId: ROUTE_A,
    resolvedAt: RESOLVED_AT,
  };

  assert.deepEqual(resolveWorkerRoute({ ...common, connection: rawApi }), {
    kind: "needs-attention",
    code: "RAW_API_WORKER_UNSUPPORTED",
  });

  const runtime: ProviderManagedRuntimeLink = {
    runtimeId: RUNTIME_ID,
    runtimeKind: "fake-fixed-worker",
    executableRevision: `sha256:${"a".repeat(64)}`,
    accountState: "account-uninspectable",
    runtimeRevision: "runtime-r1",
  };
  const fixed = connection({
    summary: {
      ...connection().summary,
      authKind: "provider-managed",
      billingKind: "unknown",
      supportedRoles: ["worker"],
      runtimeId: RUNTIME_ID,
    },
    billingRoute: {
      kind: "unknown",
      source: "unknown",
      certainty: "unknown",
      label: "Billing could not be verified",
    },
    runtime,
  });
  const resolved = resolveWorkerRoute({ ...common, connection: fixed });
  assert.equal(resolved.kind, "resolved");
  if (resolved.kind === "resolved") {
    assert.equal(resolved.route.selection, "pinned");
    assert.equal(resolved.route.catalogSource, "manual");
    assert.equal(parseResolvedRoute(resolved.route).kind, "valid");
  }
  assert.deepEqual(resolveWorkerRoute({
    ...common,
    authoritySource: {
      kind: "one-task-selection",
      selectionRevision: "unvalidated-selection-r1",
    },
    connection: fixed,
  }), { kind: "needs-attention", code: "INVALID_AUTHORITY" });
  assert.deepEqual(resolveWorkerRoute({
    ...common,
    assignment: {
      ...pinned,
      runtimeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    },
    connection: fixed,
  }), { kind: "needs-attention", code: "RUNTIME_MISMATCH" });

  const auto: WorkerAssignment = {
    role: "worker",
    mode: "auto",
    connectionId: CONNECTION_A,
    runtimeId: RUNTIME_ID,
    policyVersion: "worker-auto-v1",
    assignmentRevision: "worker-assignment-r2",
  };
  assert.deepEqual(resolveWorkerRoute({
    ...common,
    assignment: auto,
    authoritySource: { kind: "assignment", assignmentRevision: auto.assignmentRevision },
    connection: fixed,
  }), { kind: "needs-attention", code: "AUTO_UNAVAILABLE" });
});

test("worker Auto retains its last eligible exact model before reviewed policy", () => {
  const retained = candidate("author/worker-retained", {
    supportedRoles: ["worker"],
  });
  const recommended = candidate("author/worker-recommended", {
    supportedRoles: ["worker"],
    driverRecommendationEligible: true,
  });
  const runtime: ProviderManagedRuntimeLink = {
    runtimeId: RUNTIME_ID,
    runtimeKind: "fake-worker",
    executableRevision: `sha256:${"a".repeat(64)}`,
    accountState: "provider-verified",
    runtimeRevision: "runtime-r1",
  };
  const workerConnection = connection({
    summary: {
      ...connection().summary,
      authKind: "provider-managed",
      supportedRoles: ["worker"],
      runtimeId: RUNTIME_ID,
    },
    runtime,
  });
  const selectedDriver = driver([retained, recommended], { policies: [] });
  const auto: WorkerAssignment = {
    role: "worker",
    mode: "auto",
    connectionId: CONNECTION_A,
    runtimeId: RUNTIME_ID,
    lastResolvedModelId: retained.modelId,
    policyVersion: "worker-quality-v1",
    assignmentRevision: "worker-assignment-r1",
  };
  const result = resolveWorkerRoute({
    projectAuthorityId: PROJECT_A,
    assignment: auto,
    authoritySource: { kind: "assignment", assignmentRevision: auto.assignmentRevision },
    connection: workerConnection,
    linkGrant: linkGrant(),
    catalog: catalog([recommended, retained]),
    manualModel: null,
    registry: createModelConnectionDriverRegistry([selectedDriver]),
    routeInstanceId: ROUTE_A,
    resolvedAt: RESOLVED_AT,
  });

  assert.equal(result.kind, "resolved");
  if (result.kind === "resolved") {
    assert.equal(result.reason, "RETAINED_ASSIGNMENT_MODEL");
    assert.equal(result.route.modelId, retained.modelId);
  }
});

test("route and binding digests cover stable/display authority and exact project/conversation scope", () => {
  const model = candidate("author/digest", { driverRecommendationEligible: true });
  const selectedDriver = driver([model], {
    policies: [{
      policyVersion: "quality-v1",
      role: "conductor",
      orderedExactModelIds: [model.modelId],
      reasonCode: "REVIEWED",
      costBand: "balanced",
    }],
    modelAuthors: { [model.modelId]: "Known Model Author" },
  });
  const result = resolveNew(assignment("auto", "quality-v1"), catalog([model]), selectedDriver);
  assert.equal(result.kind, "resolved");
  if (result.kind !== "resolved") return;
  assert.equal(result.route.modelAuthor, "Known Model Author");

  const auditOnly = {
    ...result.route,
    routeInstanceId: ROUTE_B,
    resolvedAt: "2026-08-07T12:30:00.000Z",
  };
  assert.equal(calculateRouteAuthorityDigest(auditOnly), result.route.routeAuthorityDigest);
  assert.notEqual(calculateRouteAuthorityDigest({
    ...result.route,
    accountSafeLabel: "different-safe-label",
  }), result.route.routeAuthorityDigest);
  assert.notEqual(calculateRouteAuthorityDigest({
    ...result.route,
    billingRoute: { ...result.route.billingRoute, label: "Different displayed billing" },
  }), result.route.routeAuthorityDigest);

  const sameRouteOtherConversation = createConversationRouteBinding(
    result.route,
    "002",
    BOUND_AT,
  );
  assert.notEqual(sameRouteOtherConversation.resolvedRouteDigest, result.binding.resolvedRouteDigest);
  assert.notEqual(calculateConversationBindingDigest({
    ...result.binding,
    projectAuthorityId: PROJECT_B,
  }), result.binding.resolvedRouteDigest);
  assert.notEqual(calculateConversationBindingDigest({
    ...result.binding,
    resolvedRoute: auditOnly,
  }), result.binding.resolvedRouteDigest);
});

test("driver policy and attribution failures stop with fixed codes and never expose raw errors", () => {
  const model = candidate("author/driver-callback", {
    driverRecommendationEligible: true,
    providerDefault: true,
  });
  const base = driver([model], { providerDefaultSemantics: "verified-exact" });
  const throwingDriver: ModelConnectionDriver = {
    ...base,
    recommendation() {
      throw new Error("raw-driver-canary");
    },
    modelAuthor() {
      throw new Error("raw-driver-canary");
    },
  };

  const autoResult = resolveNew(
    assignment("auto", "quality-v1"),
    catalog([model]),
    throwingDriver,
  );
  assert.deepEqual(autoResult, { kind: "needs-attention", code: "AUTO_POLICY_UNAVAILABLE" });
  assert.equal(JSON.stringify(autoResult).includes("raw-driver-canary"), false);

  const hostilePolicy = new Proxy({}, {
    get() {
      throw new Error("raw-driver-canary");
    },
  }) as ReviewedAutoRecommendation;
  const malformedPolicyResult = resolveNew(
    assignment("auto", "quality-v1"),
    catalog([model]),
    { ...base, recommendation: () => hostilePolicy },
  );
  assert.deepEqual(malformedPolicyResult, {
    kind: "needs-attention",
    code: "AUTO_POLICY_UNAVAILABLE",
  });
  assert.equal(JSON.stringify(malformedPolicyResult).includes("raw-driver-canary"), false);

  const pinnedResult = resolveNew(
    assignment("pinned", model.modelId),
    catalog([model]),
    throwingDriver,
  );
  assert.deepEqual(pinnedResult, { kind: "needs-attention", code: "INVALID_AUTHORITY" });
  assert.equal(JSON.stringify(pinnedResult).includes("raw-driver-canary"), false);
});

test("the current conductor service feeds one unchanged pinned result to seat note and transport", () => {
  assert.deepEqual(resolvePinnedSelection({
    role: "conductor",
    connectionId: CONNECTION_A,
    modelId: "author/current-pinned",
    conductorTransportAvailable: true,
    runtimeId: null,
    catalog: null,
    catalogSource: "legacy-pinned-bridge",
  }), { kind: "resolved", modelId: "author/current-pinned" });
  const untypedPinnedSelection = resolvePinnedSelection as unknown as (
    input: Readonly<Record<string, unknown>>,
  ) => ReturnType<typeof resolvePinnedSelection>;
  assert.deepEqual(untypedPinnedSelection({
    role: "worker",
    connectionId: CONNECTION_A,
    modelId: "author/current-pinned",
    conductorTransportAvailable: true,
    runtimeId: RUNTIME_ID,
    catalog: null,
    catalogSource: "manual",
  }), { kind: "needs-attention", code: "PINNED_SELECTION_INVALID" });

  const source = readFileSync(join(
    __dirname,
    "..",
    "..",
    "src",
    "main",
    "conductor",
    "service.ts",
  ), "utf8");
  const streamStart = source.indexOf("async function streamTurn(");
  assert.notEqual(streamStart, -1);
  const stream = source.slice(streamStart);

  assert.match(source, /import \{ resolvePinnedSelection \} from "\.\.\/connections\/resolve\.js";/);
  assert.match(stream, /const pinnedSelection = resolvePinnedSelection\(\{/);
  assert.match(stream, /modelId: conn\.model/);
  assert.match(stream, /const selectedModel = pinnedSelection\.modelId/);
  assert.match(stream, /connectionNoteFor\(conn\.baseUrl, selectedModel\)/);
  assert.match(stream, /model: selectedModel/);
  assert.equal(stream.match(/streamWithTransport\(/g)?.length, 1);
});
