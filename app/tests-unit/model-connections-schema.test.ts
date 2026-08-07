import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MODEL_CONNECTIONS_SCHEMA_VERSION } from "../src/shared/model-connections.js";
import type { ConnectionSummary as IpcConnectionSummary } from "../src/shared/ipc.js";
import {
  MODEL_CONNECTION_LIMITS,
  parseCatalogSnapshot,
  parseConnectionBaseUrl,
  parseConnectionSummary,
  parseConductorAssignment,
  parseConductorGrant,
  parseConversationRouteBinding,
  parseGatewayRoutingPolicy,
  parseLinkMetadataGrant,
  parseModelConnectionsSchemaVersion,
  parseModelOption,
  parseOneTaskWorkerSelection,
  parsePendingWorkerRouteAuthority,
  parseProjectAuthorityId,
  parseProviderManagedRuntimeLink,
  parseResolvedRoute,
  parseRouteAuthoritySource,
  parseWorkerAssignment,
  type SchemaParseResult,
} from "../src/main/connections/schema.js";

const PROJECT_A = "11111111-1111-4111-8111-111111111111";
const PROJECT_B = "22222222-2222-4222-8222-222222222222";
const CONNECTION_ID = "33333333-3333-4333-8333-333333333333";
const ROUTE_ID = "44444444-4444-4444-8444-444444444444";
const SELECTION_ID = "55555555-5555-4555-8555-555555555555";
const PREVIEW_ID = "66666666-6666-4666-8666-666666666666";
const RUNTIME_ID = "77777777-7777-4777-8777-777777777777";
const FETCHED_AT = "2026-08-06T12:00:00.000Z";
const BOUND_AT = "2026-08-06T12:01:00.000Z";
const EXPIRES_AT = "2026-08-06T12:15:00.000Z";
const ROUTE_DIGEST = "a".repeat(64);
const BINDING_DIGEST = "b".repeat(64);
const DISCLOSURE_DIGEST = "c".repeat(64);

const CONNECTION = {
  id: CONNECTION_ID,
  driverId: "openrouter",
  accessProvider: "OpenRouter",
  displayName: "OpenRouter primary",
  accountSafeLabel: "account@example.invalid",
  accountLabelProvenance: "provider-verified",
  authKind: "api-key",
  billingKind: "pay-as-you-go",
  supportedRoles: ["conductor"],
  runtimeId: null,
  status: "ready",
  authenticationRevision: "auth-r1",
};

const MODEL = {
  connectionId: CONNECTION_ID,
  modelId: "moonshotai/kimi-k2",
  displayName: "Kimi K2",
  supportedRoles: ["conductor"],
  reasoningOptions: ["standard"],
  modalities: ["text"],
  lifecycle: "stable",
  catalogSource: "authenticated",
  availabilityEvidence: "account-confirmed",
  price: { inputPerMillion: "0.5", outputPerMillion: "2", currency: "USD" },
  driverRecommendationEligible: true,
  providerDefault: false,
  fetchedAt: FETCHED_AT,
};

const CATALOG = {
  connectionId: CONNECTION_ID,
  authenticationRevision: "auth-r1",
  catalogRevision: "catalog-r1",
  fetchedAt: FETCHED_AT,
  freshness: "fresh",
  models: [MODEL],
};

const RUNTIME_LINK = {
  runtimeId: RUNTIME_ID,
  runtimeKind: "codex-exec",
  executableRevision: `sha256:${"d".repeat(64)}`,
  accountState: "account-uninspectable",
  runtimeRevision: "runtime-r1",
};

const CONDUCTOR_AUTO = {
  role: "conductor",
  mode: "auto",
  connectionId: CONNECTION_ID,
  policyVersion: "quality-cost-v1",
  assignmentRevision: "assignment-r1",
};

const CONDUCTOR_PINNED = {
  role: "conductor",
  mode: "pinned",
  connectionId: CONNECTION_ID,
  modelId: MODEL.modelId,
  assignmentRevision: "assignment-r1",
};

const WORKER_AUTO = {
  role: "worker",
  mode: "auto",
  connectionId: CONNECTION_ID,
  runtimeId: RUNTIME_ID,
  lastResolvedModelId: "openai/gpt-5.2-codex",
  policyVersion: "builder-quality-v1",
  assignmentRevision: "worker-assignment-r1",
};

const WORKER_PINNED = {
  role: "worker",
  mode: "pinned",
  connectionId: CONNECTION_ID,
  runtimeId: RUNTIME_ID,
  modelId: "openai/gpt-5.2-codex",
  assignmentRevision: "worker-assignment-r1",
};

const LINK_GRANT = {
  grantRevision: "link-grant-r1",
  connectionId: CONNECTION_ID,
  authenticationRevision: "auth-r1",
  authorizationBasis: "explicit",
  metadataScope: ["account.identity", "models.list"],
  metadataCostCertainty: "documented-no-charge",
  routingPolicyRevision: "routing-r1",
  grantedAt: FETCHED_AT,
};

const CONDUCTOR_GRANT = {
  grantRevision: "conductor-grant-r1",
  projectAuthorityId: PROJECT_A,
  connectionId: CONNECTION_ID,
  authenticationRevision: "auth-r1",
  authorizationBasis: "explicit",
  authorizedDataScope: "conductor-data-scope-v4",
  billingKind: "pay-as-you-go",
  billingRevision: "billing-r1",
  routingPolicyRevision: "routing-r1",
  modelAuthorization: { mode: "pinned", modelId: MODEL.modelId },
  grantedAt: FETCHED_AT,
};

const NOT_A_GATEWAY = {
  mode: "not-a-gateway",
  allowedServingProviders: [],
  allowServingProviderFallback: false,
  allowByok: false,
  allowSharedCapacityAfterByok: false,
  region: null,
};

const CONDUCTOR_ROUTE = {
  role: "conductor",
  routeInstanceId: ROUTE_ID,
  projectAuthorityId: PROJECT_A,
  connectionId: CONNECTION_ID,
  driverId: "openrouter",
  accessProvider: "OpenRouter",
  accountSafeLabel: "account@example.invalid",
  accountLabelProvenance: "provider-verified",
  modelAuthor: "Moonshot AI",
  modelId: MODEL.modelId,
  billingRoute: {
    kind: "pay-as-you-go",
    source: "provider-account",
    certainty: "provider-reported",
    label: "Expected billing: provider account",
  },
  billingRevision: "billing-r1",
  authoritySource: { kind: "assignment", assignmentRevision: "assignment-r1" },
  linkGrantRevision: "link-grant-r1",
  conductorGrantRevision: "conductor-grant-r1",
  authenticationRevision: "auth-r1",
  catalogRevision: "catalog-r1",
  catalogSource: "authenticated",
  capabilityRevision: "capability-r1",
  runtimeRevision: null,
  executableRevision: null,
  gatewayRouting: NOT_A_GATEWAY,
  routingPolicyRevision: "routing-r1",
  selection: "pinned",
  policyVersion: null,
  runtimeId: null,
  routeAuthorityDigest: ROUTE_DIGEST,
  resolvedAt: FETCHED_AT,
};

const WORKER_ROUTE = {
  ...CONDUCTOR_ROUTE,
  role: "worker",
  modelAuthor: "OpenAI",
  modelId: "openai/gpt-5.2-codex",
  billingRoute: {
    kind: "unknown",
    source: "unknown",
    certainty: "unknown",
    label: "Billing could not be verified",
  },
  authoritySource: { kind: "assignment", assignmentRevision: "worker-assignment-r1" },
  conductorGrantRevision: null,
  catalogRevision: null,
  catalogSource: "manual",
  runtimeRevision: "runtime-r1",
  executableRevision: `sha256:${"d".repeat(64)}`,
  runtimeId: RUNTIME_ID,
};

const SELECTION_ROUTE = {
  ...WORKER_ROUTE,
  authoritySource: { kind: "one-task-selection", selectionRevision: "selection-r1" },
};

const BINDING = {
  projectAuthorityId: PROJECT_A,
  conversationId: "001",
  resolvedRoute: CONDUCTOR_ROUTE,
  resolvedRouteDigest: BINDING_DIGEST,
  boundAt: BOUND_AT,
};

const ONE_TASK_SELECTION = {
  selectionId: SELECTION_ID,
  selectionRevision: "selection-r1",
  projectAuthorityId: PROJECT_A,
  connectionId: CONNECTION_ID,
  runtimeId: RUNTIME_ID,
  model: { mode: "pinned", modelId: "openai/gpt-5.2-codex" },
  createdAt: FETCHED_AT,
  expiresAt: EXPIRES_AT,
};

const PENDING_SELECTION = {
  previewId: PREVIEW_ID,
  projectAuthorityId: PROJECT_A,
  resolvedRoute: SELECTION_ROUTE,
  disclosureDigest: DISCLOSURE_DIGEST,
  expiresAt: EXPIRES_AT,
};

type AnyParser = (value: unknown) => SchemaParseResult<unknown>;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function valid<T>(result: SchemaParseResult<T>): T {
  assert.equal(result.kind, "valid");
  if (result.kind !== "valid") throw new Error("expected valid schema result");
  return result.value;
}

function malformed(parser: AnyParser, value: unknown): void {
  assert.deepEqual(parser(value), { kind: "malformed" });
}

function assertDeepFrozen(value: unknown, seen = new Set<unknown>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}

test("every durable shape parses exactly, detaches, freezes, and round-trips", () => {
  const cases: readonly [string, AnyParser, unknown][] = [
    ["connection", parseConnectionSummary, CONNECTION],
    ["model", parseModelOption, MODEL],
    ["catalog", parseCatalogSnapshot, CATALOG],
    ["runtime link", parseProviderManagedRuntimeLink, RUNTIME_LINK],
    ["conductor auto", parseConductorAssignment, CONDUCTOR_AUTO],
    ["conductor pinned", parseConductorAssignment, CONDUCTOR_PINNED],
    ["worker auto", parseWorkerAssignment, WORKER_AUTO],
    ["worker pinned", parseWorkerAssignment, WORKER_PINNED],
    ["binding", parseConversationRouteBinding, BINDING],
    ["one-task selection", parseOneTaskWorkerSelection, ONE_TASK_SELECTION],
    ["assignment authority", parseRouteAuthoritySource, CONDUCTOR_ROUTE.authoritySource],
    ["selection authority", parseRouteAuthoritySource, SELECTION_ROUTE.authoritySource],
    ["link grant", parseLinkMetadataGrant, LINK_GRANT],
    ["conductor grant", parseConductorGrant, CONDUCTOR_GRANT],
    ["gateway", parseGatewayRoutingPolicy, NOT_A_GATEWAY],
    ["conductor route", parseResolvedRoute, CONDUCTOR_ROUTE],
    ["worker route", parseResolvedRoute, WORKER_ROUTE],
    ["pending", parsePendingWorkerRouteAuthority, PENDING_SELECTION],
  ];

  for (const [name, parser, fixture] of cases) {
    const input = clone(fixture);
    const output = valid(parser(input));
    assert.deepEqual(output, fixture, name);
    assert.notEqual(output, input, name);
    assertDeepFrozen(output);
    assert.deepEqual(valid(parser(JSON.parse(JSON.stringify(output)))), output, `${name} JSON round-trip`);
    assert.deepEqual(parser(undefined), { kind: "absent" }, `${name} absence`);
    assert.deepEqual(parser(null), { kind: "malformed" }, `${name} null is present and malformed`);
    malformed(parser, { ...(fixture as Record<string, unknown>), unknownField: true });
  }

  const typedThroughIpc: IpcConnectionSummary = valid(parseConnectionSummary(CONNECTION));
  assert.equal(typedThroughIpc.id, CONNECTION_ID);

  const mutableCatalog = clone(CATALOG);
  const parsedCatalog = valid(parseCatalogSnapshot(mutableCatalog));
  mutableCatalog.models[0].displayName = "changed after parse";
  mutableCatalog.models.push({ ...MODEL, modelId: "another/model" });
  assert.equal(parsedCatalog.models[0]?.displayName, MODEL.displayName);
  assert.equal(parsedCatalog.models.length, 1);
});

test("schema version keeps legacy absence distinct from malformed current data", () => {
  assert.equal(MODEL_CONNECTIONS_SCHEMA_VERSION, "cairn-model-connections/v1");
  assert.deepEqual(parseModelConnectionsSchemaVersion(undefined), { kind: "absent" });
  assert.deepEqual(
    parseModelConnectionsSchemaVersion(MODEL_CONNECTIONS_SCHEMA_VERSION),
    { kind: "valid", value: MODEL_CONNECTIONS_SCHEMA_VERSION },
  );
  for (const value of [null, "", "cairn-model-connections/v2", {}, []]) {
    assert.deepEqual(parseModelConnectionsSchemaVersion(value), { kind: "malformed" });
  }
});

test("every current record refuses each missing required root field", () => {
  const cases: readonly [string, AnyParser, Record<string, unknown>][] = [
    ["connection", parseConnectionSummary, CONNECTION],
    ["model", parseModelOption, MODEL],
    ["catalog", parseCatalogSnapshot, CATALOG],
    ["runtime link", parseProviderManagedRuntimeLink, RUNTIME_LINK],
    ["conductor auto", parseConductorAssignment, CONDUCTOR_AUTO],
    ["conductor pinned", parseConductorAssignment, CONDUCTOR_PINNED],
    ["worker pinned", parseWorkerAssignment, WORKER_PINNED],
    ["binding", parseConversationRouteBinding, BINDING],
    ["one-task selection", parseOneTaskWorkerSelection, ONE_TASK_SELECTION],
    ["assignment authority", parseRouteAuthoritySource, CONDUCTOR_ROUTE.authoritySource],
    ["selection authority", parseRouteAuthoritySource, SELECTION_ROUTE.authoritySource],
    ["link grant", parseLinkMetadataGrant, LINK_GRANT],
    ["conductor grant", parseConductorGrant, CONDUCTOR_GRANT],
    ["gateway", parseGatewayRoutingPolicy, NOT_A_GATEWAY],
    ["conductor route", parseResolvedRoute, CONDUCTOR_ROUTE],
    ["worker route", parseResolvedRoute, WORKER_ROUTE],
    ["pending", parsePendingWorkerRouteAuthority, PENDING_SELECTION],
  ];
  for (const [name, parser, fixture] of cases) {
    for (const key of Object.keys(fixture)) {
      const missing = clone(fixture);
      delete missing[key];
      assert.deepEqual(parser(missing), { kind: "malformed" }, `${name} requires ${key}`);
    }
  }
  const workerAutoWithoutContinuity = clone(WORKER_AUTO) as Record<string, unknown>;
  delete workerAutoWithoutContinuity.lastResolvedModelId;
  assert.equal(parseWorkerAssignment(workerAutoWithoutContinuity).kind, "valid");
});

test("nested authority records refuse every missing required field", () => {
  const cases: readonly [
    string,
    AnyParser,
    Record<string, unknown>,
    string,
  ][] = [
    ["model price", parseModelOption, MODEL, "price"],
    ["route billing", parseResolvedRoute, CONDUCTOR_ROUTE, "billingRoute"],
    ["route gateway", parseResolvedRoute, CONDUCTOR_ROUTE, "gatewayRouting"],
    ["route source", parseResolvedRoute, CONDUCTOR_ROUTE, "authoritySource"],
    ["conductor authorization", parseConductorGrant, CONDUCTOR_GRANT, "modelAuthorization"],
    ["one-task authorization", parseOneTaskWorkerSelection, ONE_TASK_SELECTION, "model"],
  ];
  for (const [name, parser, fixture, field] of cases) {
    const nested = fixture[field] as Record<string, unknown>;
    for (const nestedKey of Object.keys(nested)) {
      const input = clone(fixture);
      delete (input[field] as Record<string, unknown>)[nestedKey];
      assert.deepEqual(parser(input), { kind: "malformed" }, `${name} requires ${nestedKey}`);
    }
  }
});

test("hardened records and arrays reject hidden authority without invoking accessors", () => {
  let getterCalls = 0;
  const accessor = { ...CONNECTION } as Record<string, unknown>;
  Object.defineProperty(accessor, "displayName", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "must not be read";
    },
  });
  malformed(parseConnectionSummary, accessor);
  assert.equal(getterCalls, 0);

  const hidden = { ...CONNECTION };
  Object.defineProperty(hidden, "token", { enumerable: false, value: "inert-token-canary" });
  malformed(parseConnectionSummary, hidden);

  const symbol = { ...CONNECTION } as Record<PropertyKey, unknown>;
  symbol[Symbol("secret")] = "inert-symbol-canary";
  malformed(parseConnectionSummary, symbol);

  malformed(parseConnectionSummary, Object.assign(Object.create({ inherited: true }), CONNECTION));
  malformed(parseConnectionSummary, new Proxy({ ...CONNECTION }, {}));

  const sparseModels = new Array(MODEL_CONNECTION_LIMITS.catalogModels + 1);
  malformed(parseCatalogSnapshot, { ...CATALOG, models: sparseModels });
  const extraArray = [...MODEL.supportedRoles] as unknown[] & { hidden?: boolean };
  extraArray.hidden = true;
  malformed(parseModelOption, { ...MODEL, supportedRoles: extraArray });
  class RoleArray extends Array<string> {}
  malformed(parseModelOption, { ...MODEL, supportedRoles: new RoleArray("conductor") });
});

test("visible labels are bounded plain text and account provenance never upgrades itself", () => {
  const atCap = { ...CONNECTION, displayName: "a".repeat(MODEL_CONNECTION_LIMITS.humanLabel) };
  assert.equal(parseConnectionSummary(atCap).kind, "valid");
  malformed(parseConnectionSummary, { ...atCap, displayName: `${atCap.displayName}a` });

  for (const displayName of [
    "", "   ", " padded", "padded ", "line\nbreak", "<b>trusted</b>", "x\u0000y",
    "x\u061cy", "x\u200by", "x\u2028y", "x\u202ey", "x\u2060y", "x\ufeffy", "\ud800",
  ]) {
    malformed(parseConnectionSummary, { ...CONNECTION, displayName });
  }

  const ownerLabel = valid(parseConnectionSummary({
    ...CONNECTION,
    accountSafeLabel: "My work account",
    accountLabelProvenance: "owner-label",
  }));
  assert.equal(ownerLabel.accountLabelProvenance, "owner-label");
  assert.equal(ownerLabel.accountSafeLabel, "My work account");

  assert.equal(parseConnectionSummary({
    ...CONNECTION,
    accountSafeLabel: null,
    accountLabelProvenance: "unavailable",
  }).kind, "valid");
  malformed(parseConnectionSummary, { ...CONNECTION, accountSafeLabel: null });
  malformed(parseConnectionSummary, {
    ...CONNECTION,
    accountSafeLabel: "unverified",
    accountLabelProvenance: "unavailable",
  });
  malformed(parseConnectionSummary, {
    ...CONNECTION,
    accountSafeLabel: null,
    accountLabelProvenance: "owner-label",
  });
  malformed(parseConnectionSummary, { ...CONNECTION, accountVerified: true });

  assert.equal(parseConnectionSummary({
    ...CONNECTION,
    supportedRoles: ["worker"],
    runtimeId: RUNTIME_ID,
  }).kind, "valid");
  assert.equal(parseConnectionSummary({
    ...CONNECTION,
    supportedRoles: ["conductor", "worker"],
    runtimeId: RUNTIME_ID,
  }).kind, "valid");
  malformed(parseConnectionSummary, { ...CONNECTION, supportedRoles: ["worker"], runtimeId: null });
  malformed(parseConnectionSummary, { ...CONNECTION, supportedRoles: ["worker"], runtimeId: "runtime-r1" });
});

test("model ids, normalized prices, collections, and catalog identity are strict and bounded", () => {
  for (const modelId of [
    "moonshotai/kimi-k2",
    "openai/gpt-5.2-codex",
    "openrouter/model:free",
    "llama:latest",
    "accounts/fireworks/models/llama-v3p1-8b-instruct",
  ]) assert.equal(parseModelOption({ ...MODEL, modelId }).kind, "valid", modelId);

  for (const modelId of [
    "", "../model", "/leading", "model/../other", "model\\other", "model id",
    "model?key=x", "model#frag", "<model>", "https://model.invalid", "C:/tools/codex.exe",
    "data:text", "file:model", "file:C:/tmp", "file:/tmp/model", "ftp:model", "http:model",
    "https:model", "javascript:alert", "javascript:model", "javascript:/model", "x\u0000y",
  ]) {
    malformed(parseModelOption, { ...MODEL, modelId });
  }
  assert.equal(parseModelOption({
    ...MODEL,
    modelId: "m".repeat(MODEL_CONNECTION_LIMITS.modelId),
  }).kind, "valid");
  malformed(parseModelOption, {
    ...MODEL,
    modelId: "m".repeat(MODEL_CONNECTION_LIMITS.modelId + 1),
  });

  for (const price of ["-1", "1e3", "01", "1.0", " 1", "NaN", "Infinity", ".5", "1."]) {
    malformed(parseModelOption, { ...MODEL, price: { ...MODEL.price, inputPerMillion: price } });
  }
  assert.equal(parseModelOption({ ...MODEL, price: { inputPerMillion: "0", outputPerMillion: null, currency: "USD" } }).kind, "valid");
  malformed(parseModelOption, { ...MODEL, price: { inputPerMillion: "1", outputPerMillion: null, currency: null } });
  malformed(parseModelOption, { ...MODEL, price: { inputPerMillion: null, outputPerMillion: null, currency: "USD" } });
  malformed(parseModelOption, { ...MODEL, price: { ...MODEL.price, currency: "usd" } });

  malformed(parseModelOption, { ...MODEL, supportedRoles: ["conductor", "conductor"] });
  malformed(parseModelOption, { ...MODEL, reasoningOptions: ["standard", "standard"] });
  malformed(parseModelOption, { ...MODEL, modalities: ["text", "text"] });
  malformed(parseCatalogSnapshot, { ...CATALOG, models: [MODEL, { ...MODEL }] });
  malformed(parseCatalogSnapshot, {
    ...CATALOG,
    models: [{ ...MODEL, connectionId: "77777777-7777-4777-8777-777777777777" }],
  });
  malformed(parseCatalogSnapshot, {
    ...CATALOG,
    models: [{ ...MODEL, fetchedAt: BOUND_AT }],
  });

  const maximumOptions = Array.from(
    { length: MODEL_CONNECTION_LIMITS.optionList },
    (_, index) => `option-${index}`,
  );
  assert.equal(parseModelOption({ ...MODEL, reasoningOptions: maximumOptions }).kind, "valid");
  malformed(parseModelOption, { ...MODEL, reasoningOptions: [...maximumOptions, "one-too-many"] });

  const maximumModels = Array.from(
    { length: MODEL_CONNECTION_LIMITS.catalogModels },
    (_, index) => ({ ...MODEL, modelId: `provider/model-${index}` }),
  );
  assert.equal(parseCatalogSnapshot({ ...CATALOG, models: maximumModels }).kind, "valid");
  malformed(parseCatalogSnapshot, {
    ...CATALOG,
    models: [...maximumModels, { ...MODEL, modelId: "provider/over-cap" }],
  });

  const otherConnection = "88888888-8888-4888-8888-888888888888";
  assert.equal(parseCatalogSnapshot({
    ...CATALOG,
    connectionId: otherConnection,
    models: [{ ...MODEL, connectionId: otherConnection }],
  }).kind, "valid", "model IDs are scoped to a connection, not globally deduplicated");

  const manual = {
    ...MODEL,
    catalogSource: "manual",
    availabilityEvidence: "configured-manually",
    driverRecommendationEligible: false,
    providerDefault: false,
  };
  assert.equal(parseModelOption(manual).kind, "valid");
  malformed(parseModelOption, { ...manual, availabilityEvidence: "provider-catalog" });
  malformed(parseModelOption, { ...MODEL, availabilityEvidence: "configured-manually" });
  malformed(parseModelOption, { ...manual, driverRecommendationEligible: true });
  malformed(parseModelOption, { ...manual, providerDefault: true });
  assert.equal(parseModelOption({
    ...MODEL,
    lifecycle: "preview",
    driverRecommendationEligible: false,
    providerDefault: true,
  }).kind, "valid",
    "providerDefault records a provider fact; Task 4 decides Auto eligibility");
  malformed(parseModelOption, { ...MODEL, lifecycle: "preview", driverRecommendationEligible: true });

  malformed(parseCatalogSnapshot, {
    ...CATALOG,
    models: [
      { ...MODEL, providerDefault: true },
      { ...MODEL, modelId: "provider/second-default", providerDefault: true },
    ],
  });
});

test("base URLs are main-only, bounded, credential-free, and fail closed by scheme", () => {
  for (const url of [
    "https://openrouter.ai/api/v1",
    "https://models.example.invalid/custom/path/",
    "http://127.0.0.1:12345/v1",
    "http://[::1]:12345/v1",
    "http://localhost:12345/v1",
    "http://models.example.invalid/v1",
  ]) assert.deepEqual(parseConnectionBaseUrl(url), { kind: "valid", value: url });

  for (const url of [
    "ftp://models.example.invalid/v1",
    "file:///tmp/model",
    "data:text/plain,model",
    "javascript:alert(1)",
    "https://user:password@models.example.invalid/v1",
    "https://models.example.invalid/v1?token=inert",
    "https://models.example.invalid/v1#fragment",
    " https://models.example.invalid/v1",
    "https:models.example.invalid/v1",
    "https:/models.example.invalid/v1",
    "https:///models.example.invalid/v1",
    "https:////models.example.invalid/v1",
    "https:\\models.example.invalid\\v1",
    "http:127.0.0.1:12345/v1",
    "not a url",
    `https://models.example.invalid/${"a".repeat(MODEL_CONNECTION_LIMITS.url)}`,
  ]) malformed(parseConnectionBaseUrl, url);
  assert.deepEqual(parseConnectionBaseUrl(undefined), { kind: "absent" });
});

test("every reusable string limit accepts its boundary and rejects one over", () => {
  const machineAtCap = "a".repeat(MODEL_CONNECTION_LIMITS.machineId);
  assert.equal(parseConnectionSummary({ ...CONNECTION, driverId: machineAtCap }).kind, "valid");
  malformed(parseConnectionSummary, {
    ...CONNECTION,
    driverId: `${machineAtCap}a`,
  });
  assert.equal(parseConnectionSummary({
    ...CONNECTION,
    authenticationRevision: machineAtCap,
  }).kind, "valid");
  malformed(parseConnectionSummary, {
    ...CONNECTION,
    authenticationRevision: `${machineAtCap}a`,
  });

  assert.equal(parseLinkMetadataGrant({
    ...LINK_GRANT,
    metadataScope: [machineAtCap],
  }).kind, "valid");
  malformed(parseLinkMetadataGrant, {
    ...LINK_GRANT,
    metadataScope: [`${machineAtCap}a`],
  });

  const dataScopeAtCap = "a".repeat(MODEL_CONNECTION_LIMITS.dataScope);
  assert.equal(parseConductorGrant({
    ...CONDUCTOR_GRANT,
    authorizedDataScope: dataScopeAtCap,
  }).kind, "valid");
  malformed(parseConductorGrant, {
    ...CONDUCTOR_GRANT,
    authorizedDataScope: `${dataScopeAtCap}a`,
  });

  const billingLabelAtCap = "a".repeat(MODEL_CONNECTION_LIMITS.billingLabel);
  assert.equal(parseResolvedRoute({
    ...CONDUCTOR_ROUTE,
    billingRoute: { ...CONDUCTOR_ROUTE.billingRoute, label: billingLabelAtCap },
  }).kind, "valid");
  malformed(parseResolvedRoute, {
    ...CONDUCTOR_ROUTE,
    billingRoute: { ...CONDUCTOR_ROUTE.billingRoute, label: `${billingLabelAtCap}a` },
  });

  const urlPrefix = "https://models.example.invalid/";
  const urlAtCap = `${urlPrefix}${"a".repeat(MODEL_CONNECTION_LIMITS.url - urlPrefix.length)}`;
  assert.equal(urlAtCap.length, MODEL_CONNECTION_LIMITS.url);
  assert.deepEqual(parseConnectionBaseUrl(urlAtCap), { kind: "valid", value: urlAtCap });
  malformed(parseConnectionBaseUrl, `${urlAtCap}a`);
});

test("grants and project-scoped records cannot fall back to conversation-local authority", () => {
  assert.deepEqual(parseProjectAuthorityId(PROJECT_A), { kind: "valid", value: PROJECT_A });
  assert.deepEqual(parseProjectAuthorityId(undefined), { kind: "absent" });
  for (const value of [null, "001", "C:\\project", "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA", "not-random"]) {
    assert.deepEqual(parseProjectAuthorityId(value), { kind: "malformed" });
  }
  const scopedCases: readonly [AnyParser, Record<string, unknown>][] = [
    [parseConductorGrant, CONDUCTOR_GRANT],
    [parseConversationRouteBinding, BINDING],
    [parseOneTaskWorkerSelection, ONE_TASK_SELECTION],
    [parseResolvedRoute, CONDUCTOR_ROUTE],
    [parsePendingWorkerRouteAuthority, PENDING_SELECTION],
  ];
  for (const [parser, fixture] of scopedCases) {
    const missing = clone(fixture);
    delete missing.projectAuthorityId;
    malformed(parser, missing);
    malformed(parser, { ...fixture, projectAuthorityId: "001" });
    malformed(parser, { ...fixture, projectAuthorityId: "C:\\project" });
  }

  malformed(parseConversationRouteBinding, {
    ...BINDING,
    projectAuthorityId: PROJECT_B,
  });
  malformed(parseConversationRouteBinding, {
    ...BINDING,
    resolvedRoute: { ...CONDUCTOR_ROUTE, projectAuthorityId: PROJECT_B },
  });
  assert.equal(parseConversationRouteBinding(BINDING).kind, "valid");
  assert.equal(parseConversationRouteBinding({
    ...BINDING,
    projectAuthorityId: PROJECT_B,
    resolvedRoute: { ...CONDUCTOR_ROUTE, projectAuthorityId: PROJECT_B },
  }).kind, "valid", "the schema preserves both project IDs for Task 3's composite store key");
  malformed(parsePendingWorkerRouteAuthority, {
    ...PENDING_SELECTION,
    projectAuthorityId: PROJECT_B,
  });
});

test("assignments and grants keep Auto, pinned, runtime, and legacy authority disjoint", () => {
  malformed(parseConductorAssignment, { ...CONDUCTOR_AUTO, lastResolvedModelId: MODEL.modelId });
  malformed(parseConductorAssignment, { ...CONDUCTOR_AUTO, policyVersion: undefined });
  malformed(parseConductorAssignment, { ...CONDUCTOR_PINNED, policyVersion: "quality-cost-v1" });
  malformed(parseWorkerAssignment, { ...WORKER_PINNED, runtimeId: undefined });
  malformed(parseWorkerAssignment, { ...WORKER_PINNED, role: "conductor" });
  malformed(parseWorkerAssignment, { ...WORKER_AUTO, lastResolvedModelId: "unsafe model" });

  const legacyLink = {
    ...LINK_GRANT,
    authorizationBasis: "legacy-pinned-bridge",
    metadataScope: [],
    metadataCostCertainty: "unknown",
  };
  assert.equal(parseLinkMetadataGrant(legacyLink).kind, "valid");
  malformed(parseLinkMetadataGrant, { ...legacyLink, metadataScope: ["models.list"] });
  malformed(parseLinkMetadataGrant, { ...LINK_GRANT, metadataScope: ["models.list", "models.list"] });
  const maximumScopes = Array.from(
    { length: MODEL_CONNECTION_LIMITS.metadataScopes },
    (_, index) => `scope.${index}`,
  );
  assert.equal(parseLinkMetadataGrant({ ...LINK_GRANT, metadataScope: maximumScopes }).kind, "valid");
  malformed(parseLinkMetadataGrant, { ...LINK_GRANT, metadataScope: [...maximumScopes, "scope.over"] });

  assert.equal(parseConductorGrant({
    ...CONDUCTOR_GRANT,
    modelAuthorization: { mode: "auto", policyVersion: "quality-cost-v1" },
  }).kind, "valid");
  malformed(parseConductorGrant, {
    ...CONDUCTOR_GRANT,
    authorizationBasis: "legacy-pinned-bridge",
    billingKind: "unknown",
    modelAuthorization: { mode: "auto", policyVersion: "quality-cost-v1" },
  });
  assert.equal(parseConductorGrant({
    ...CONDUCTOR_GRANT,
    authorizationBasis: "legacy-pinned-bridge",
    billingKind: "unknown",
  }).kind, "valid");
  malformed(parseConductorGrant, {
    ...CONDUCTOR_GRANT,
    authorizationBasis: "legacy-pinned-bridge",
    billingKind: "pay-as-you-go",
  });
  malformed(parseConductorGrant, {
    ...CONDUCTOR_GRANT,
    modelAuthorization: { mode: "pinned", modelId: MODEL.modelId, policyVersion: "extra" },
  });
});

test("resolved routes require every authority field and enforce conductor/worker branches", () => {
  for (const key of Object.keys(CONDUCTOR_ROUTE)) {
    const missing = clone(CONDUCTOR_ROUTE) as Record<string, unknown>;
    delete missing[key];
    malformed(parseResolvedRoute, missing);
  }

  malformed(parseResolvedRoute, {
    ...CONDUCTOR_ROUTE,
    authoritySource: { kind: "one-task-selection", selectionRevision: "selection-r1" },
  });
  malformed(parseResolvedRoute, { ...CONDUCTOR_ROUTE, conductorGrantRevision: null });
  malformed(parseResolvedRoute, { ...CONDUCTOR_ROUTE, runtimeId: RUNTIME_ID });
  malformed(parseResolvedRoute, { ...CONDUCTOR_ROUTE, runtimeRevision: "runtime-r1" });
  malformed(parseResolvedRoute, { ...CONDUCTOR_ROUTE, executableRevision: "exec-r1" });
  assert.equal(parseResolvedRoute({
    ...CONDUCTOR_ROUTE,
    runtimeId: RUNTIME_ID,
    runtimeRevision: "runtime-r1",
    executableRevision: `sha256:${"d".repeat(64)}`,
  }).kind, "valid", "provider-managed conductors carry complete runtime custody");

  malformed(parseResolvedRoute, { ...WORKER_ROUTE, conductorGrantRevision: "borrowed-grant" });
  malformed(parseResolvedRoute, { ...WORKER_ROUTE, runtimeId: null });
  malformed(parseResolvedRoute, { ...WORKER_ROUTE, runtimeRevision: null });
  malformed(parseResolvedRoute, { ...WORKER_ROUTE, executableRevision: null });
  malformed(parseResolvedRoute, { ...WORKER_ROUTE, executableRevision: "exec-r1" });
  malformed(parseResolvedRoute, { ...WORKER_ROUTE, linkGrantRevision: null });

  assert.equal(parseResolvedRoute({
    ...CONDUCTOR_ROUTE,
    selection: "auto",
    policyVersion: "quality-cost-v1",
  }).kind, "valid");
  malformed(parseResolvedRoute, { ...CONDUCTOR_ROUTE, selection: "auto", policyVersion: null });
  malformed(parseResolvedRoute, {
    ...CONDUCTOR_ROUTE,
    selection: "auto",
    policyVersion: "quality-cost-v1",
    catalogRevision: null,
  });
  malformed(parseResolvedRoute, {
    ...CONDUCTOR_ROUTE,
    selection: "auto",
    policyVersion: "quality-cost-v1",
    catalogSource: "manual",
  });
  malformed(parseResolvedRoute, { ...CONDUCTOR_ROUTE, catalogRevision: null });
  malformed(parseResolvedRoute, { ...CONDUCTOR_ROUTE, catalogSource: "manual" });
  assert.equal(parseResolvedRoute({
    ...CONDUCTOR_ROUTE,
    catalogRevision: null,
    catalogSource: "legacy-pinned-bridge",
  }).kind, "valid");
  malformed(parseResolvedRoute, {
    ...CONDUCTOR_ROUTE,
    catalogRevision: null,
    catalogSource: "legacy-pinned-bridge",
    runtimeId: RUNTIME_ID,
    runtimeRevision: "runtime-r1",
    executableRevision: `sha256:${"d".repeat(64)}`,
  });
  malformed(parseResolvedRoute, { ...WORKER_ROUTE, catalogSource: "authenticated" });
  malformed(parseResolvedRoute, { ...WORKER_ROUTE, catalogSource: "legacy-pinned-bridge" });
  malformed(parseResolvedRoute, { ...CONDUCTOR_ROUTE, policyVersion: "quality-cost-v1" });
  malformed(parseResolvedRoute, { ...CONDUCTOR_ROUTE, routeAuthorityDigest: "A".repeat(64) });
  malformed(parseResolvedRoute, { ...CONDUCTOR_ROUTE, resolvedAt: "2026-08-06" });

  malformed(parseResolvedRoute, {
    ...CONDUCTOR_ROUTE,
    billingRoute: { ...CONDUCTOR_ROUTE.billingRoute, rawProviderPayload: { charged: true } },
  });
  malformed(parseResolvedRoute, {
    ...CONDUCTOR_ROUTE,
    gatewayRouting: { ...NOT_A_GATEWAY, unknownPolicy: true },
  });
});

test("billing and gateway policy preserve structured uncertainty and reject incoherent combinations", () => {
  const gatewayManaged = {
    mode: "gateway-managed",
    allowedServingProviders: ["provider-a", "provider-b"],
    allowServingProviderFallback: true,
    allowByok: true,
    allowSharedCapacityAfterByok: true,
    region: "us-east",
  };
  const pinnedProvider = {
    mode: "pinned-serving-provider",
    allowedServingProviders: ["provider-a"],
    allowServingProviderFallback: false,
    allowByok: false,
    allowSharedCapacityAfterByok: false,
    region: null,
  };
  assert.equal(parseGatewayRoutingPolicy(gatewayManaged).kind, "valid");
  assert.equal(parseGatewayRoutingPolicy(pinnedProvider).kind, "valid");
  malformed(parseGatewayRoutingPolicy, { ...NOT_A_GATEWAY, allowByok: true });
  malformed(parseGatewayRoutingPolicy, { ...gatewayManaged, allowByok: false });
  malformed(parseGatewayRoutingPolicy, { ...pinnedProvider, allowedServingProviders: [] });
  malformed(parseGatewayRoutingPolicy, { ...pinnedProvider, allowedServingProviders: ["provider-a", "provider-b"] });
  malformed(parseGatewayRoutingPolicy, { ...pinnedProvider, allowServingProviderFallback: true });
  malformed(parseGatewayRoutingPolicy, { ...gatewayManaged, allowedServingProviders: ["provider-a", "provider-a"] });
  const maximumProviders = Array.from(
    { length: MODEL_CONNECTION_LIMITS.servingProviders },
    (_, index) => `provider-${index}`,
  );
  assert.equal(parseGatewayRoutingPolicy({ ...gatewayManaged, allowedServingProviders: maximumProviders }).kind, "valid");
  malformed(parseGatewayRoutingPolicy, {
    ...gatewayManaged,
    allowedServingProviders: [...maximumProviders, "provider-over"],
  });

  const byokRoute = {
    ...CONDUCTOR_ROUTE,
    gatewayRouting: gatewayManaged,
    billingRoute: {
      kind: "pay-as-you-go",
      source: "byok-with-provider-fallback",
      certainty: "provider-reported",
      label: "Expected billing: BYOK, then shared capacity",
    },
  };
  assert.equal(parseResolvedRoute(byokRoute).kind, "valid");
  malformed(parseResolvedRoute, { ...byokRoute, gatewayRouting: { ...gatewayManaged, allowByok: false, allowSharedCapacityAfterByok: false } });
  malformed(parseResolvedRoute, {
    ...CONDUCTOR_ROUTE,
    gatewayRouting: gatewayManaged,
  });
  malformed(parseResolvedRoute, {
    ...byokRoute,
    billingRoute: { ...byokRoute.billingRoute, source: "byok" },
  });

  const byokOnlyGateway = {
    ...gatewayManaged,
    allowServingProviderFallback: false,
    allowSharedCapacityAfterByok: false,
  };
  const byokOnlyRoute = {
    ...CONDUCTOR_ROUTE,
    gatewayRouting: byokOnlyGateway,
    billingRoute: {
      kind: "pay-as-you-go",
      source: "byok",
      certainty: "verified",
      label: "Expected billing: BYOK only",
    },
  };
  assert.equal(parseResolvedRoute(byokOnlyRoute).kind, "valid");
  assert.equal(parseResolvedRoute({
    ...byokOnlyRoute,
    gatewayRouting: { ...byokOnlyGateway, allowServingProviderFallback: true },
  }).kind, "valid", "serving-provider fallback can remain BYOK-only without shared capacity");
  malformed(parseResolvedRoute, {
    ...byokOnlyRoute,
    billingRoute: { ...byokOnlyRoute.billingRoute, source: "provider-account" },
  });
  malformed(parseResolvedRoute, {
    ...byokRoute,
    gatewayRouting: byokOnlyGateway,
  });

  assert.equal(parseResolvedRoute({
    ...CONDUCTOR_ROUTE,
    billingRoute: {
      kind: "subscription",
      source: "subscription-quota",
      certainty: "provider-reported",
      label: "Expected billing: subscription quota",
    },
  }).kind, "valid");
  assert.equal(parseResolvedRoute({
    ...CONDUCTOR_ROUTE,
    billingRoute: {
      kind: "local",
      source: "local",
      certainty: "verified",
      label: "Expected billing: local runtime",
    },
  }).kind, "valid");
  malformed(parseResolvedRoute, {
    ...CONDUCTOR_ROUTE,
    billingRoute: { kind: "unknown", source: "provider-account", certainty: "unknown", label: "Unknown" },
  });
  malformed(parseResolvedRoute, {
    ...CONDUCTOR_ROUTE,
    billingRoute: { kind: "local", source: "unknown", certainty: "unknown", label: "Local" },
  });
});

test("one-task selection and pending preview authority are bounded, disjoint, and immutable", () => {
  assert.equal(parseOneTaskWorkerSelection(ONE_TASK_SELECTION).kind, "valid");
  assert.equal(parseOneTaskWorkerSelection({
    ...ONE_TASK_SELECTION,
    model: { mode: "auto", policyVersion: "builder-quality-v1" },
  }).kind, "valid");
  assert.equal(parsePendingWorkerRouteAuthority(PENDING_SELECTION).kind, "valid");
  assert.equal(parsePendingWorkerRouteAuthority({
    ...PENDING_SELECTION,
    resolvedRoute: WORKER_ROUTE,
  }).kind, "valid", "persistent-assignment previews use the same immutable pending shape");

  malformed(parseOneTaskWorkerSelection, { ...ONE_TASK_SELECTION, expiresAt: FETCHED_AT });
  malformed(parseOneTaskWorkerSelection, { ...ONE_TASK_SELECTION, expiresAt: "2026-08-06T11:59:59.999Z" });
  malformed(parseOneTaskWorkerSelection, {
    ...ONE_TASK_SELECTION,
    expiresAt: new Date(Date.parse(FETCHED_AT) + MODEL_CONNECTION_LIMITS.oneTaskLifetimeMs + 1).toISOString(),
  });
  assert.equal(parseOneTaskWorkerSelection({
    ...ONE_TASK_SELECTION,
    expiresAt: new Date(Date.parse(FETCHED_AT) + MODEL_CONNECTION_LIMITS.oneTaskLifetimeMs).toISOString(),
  }).kind, "valid");
  malformed(parseOneTaskWorkerSelection, { ...ONE_TASK_SELECTION, assignmentRevision: "must-not-mutate-default" });
  malformed(parseOneTaskWorkerSelection, { ...ONE_TASK_SELECTION, previewId: PREVIEW_ID });
  malformed(parseOneTaskWorkerSelection, { ...ONE_TASK_SELECTION, redeemed: true });
  malformed(parsePendingWorkerRouteAuthority, { ...PENDING_SELECTION, selectionId: SELECTION_ID });
  malformed(parsePendingWorkerRouteAuthority, { ...PENDING_SELECTION, model: ONE_TASK_SELECTION.model });
  malformed(parsePendingWorkerRouteAuthority, { ...PENDING_SELECTION, resolvedRoute: CONDUCTOR_ROUTE });

  const pendingInput = clone(PENDING_SELECTION);
  const parsedPending = valid(parsePendingWorkerRouteAuthority(pendingInput));
  pendingInput.resolvedRoute.modelId = "changed/after-preview";
  pendingInput.expiresAt = FETCHED_AT;
  const selectionInput = clone(ONE_TASK_SELECTION);
  const parsedSelection = valid(parseOneTaskWorkerSelection(selectionInput));
  selectionInput.expiresAt = FETCHED_AT;
  selectionInput.model.modelId = "changed/after-selection";
  assert.equal(parsedPending.resolvedRoute.modelId, SELECTION_ROUTE.modelId);
  assert.equal(parsedPending.expiresAt, EXPIRES_AT);
  assert.equal(parsedSelection.model.mode, "pinned");
  if (parsedSelection.model.mode === "pinned") {
    assert.equal(parsedSelection.model.modelId, ONE_TASK_SELECTION.model.modelId);
  }
  assert.equal(parsedSelection.expiresAt, EXPIRES_AT);
  assertDeepFrozen(parsedPending);
  assertDeepFrozen(parsedSelection);
});

test("renderer-safe shared projections reject secret and launch-configuration fields", () => {
  const forbidden = [
    "apiKey",
    "keyB64",
    "token",
    "accessToken",
    "refreshToken",
    "authorization",
    "credential",
    "credentialRef",
    "ciphertext",
    "secret",
    "cookie",
    "privateKey",
    "executablePath",
    "args",
    "env",
    "rawProviderPayload",
    "providerRuntimeConfig",
  ];
  for (const field of forbidden) {
    malformed(parseConnectionSummary, { ...CONNECTION, [field]: `inert-${field}-canary` });
    malformed(parseCatalogSnapshot, {
      ...CATALOG,
      models: [{ ...MODEL, [field]: `inert-${field}-canary` }],
    });
    malformed(parseResolvedRoute, { ...CONDUCTOR_ROUTE, [field]: `inert-${field}-canary` });
  }

  const sharedSource = readFileSync(join(process.cwd(), "src", "shared", "model-connections.ts"), "utf8");
  assert.doesNotMatch(
    sharedSource,
    /\b(?:apiKey|keyB64|token|accessToken|refreshToken|authorization|credential|credentialRef|ciphertext|secret|cookie|privateKey|executablePath|args|env|rawProviderPayload|providerRuntimeConfig)\??\s*:/,
  );
  malformed(parseProviderManagedRuntimeLink, { ...RUNTIME_LINK, executableRevision: "C:\\tools\\codex.exe" });
  malformed(parseProviderManagedRuntimeLink, { ...RUNTIME_LINK, executableRevision: "/usr/bin/codex" });
  malformed(parseProviderManagedRuntimeLink, { ...RUNTIME_LINK, executableRevision: "exec-r1" });
  malformed(parseProviderManagedRuntimeLink, {
    ...RUNTIME_LINK,
    executableRevision: `sha256:${"D".repeat(64)}`,
  });
});

test("unknown enums and nested keys always return the one fixed malformed result", () => {
  const cases: readonly [AnyParser, unknown][] = [
    [parseConnectionSummary, { ...CONNECTION, authKind: "password" }],
    [parseConnectionSummary, { ...CONNECTION, status: "connected-ish" }],
    [parseModelOption, { ...MODEL, lifecycle: "experimental" }],
    [parseCatalogSnapshot, { ...CATALOG, freshness: "fresh-enough" }],
    [parseProviderManagedRuntimeLink, { ...RUNTIME_LINK, accountState: "probably-same-account" }],
    [parseRouteAuthoritySource, { kind: "renderer-choice", assignmentRevision: "assignment-r1" }],
    [parseLinkMetadataGrant, { ...LINK_GRANT, metadataCostCertainty: "free" }],
    [parseConductorGrant, { ...CONDUCTOR_GRANT, authorizationBasis: "implicit" }],
    [parseGatewayRoutingPolicy, { ...NOT_A_GATEWAY, mode: "automatic" }],
    [parseResolvedRoute, { ...CONDUCTOR_ROUTE, selection: "fallback" }],
  ];
  for (const [parser, value] of cases) {
    const result = parser(value);
    assert.deepEqual(result, { kind: "malformed" });
    assert.doesNotMatch(JSON.stringify(result), /password|connected-ish|experimental|renderer-choice|implicit|fallback/);
  }

  malformed(parseModelOption, { ...MODEL, price: { ...MODEL.price, providerRaw: true } });
  malformed(parseConductorGrant, {
    ...CONDUCTOR_GRANT,
    modelAuthorization: { ...CONDUCTOR_GRANT.modelAuthorization, extra: true },
  });
});
