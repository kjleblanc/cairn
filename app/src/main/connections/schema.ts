import { types as nodeTypes } from "node:util";
import {
  MODEL_CONNECTIONS_SCHEMA_VERSION,
  type AccountLabelProvenance,
  type AuthKind,
  type BillingCertainty,
  type BillingKind,
  type BillingRoute,
  type BillingSource,
  type CairnRole,
  type CatalogSnapshot,
  type ConnectionStatus,
  type ConnectionSummary,
  type ConductorAssignment,
  type ConductorGrant,
  type ConductorResolvedRoute,
  type ConversationRouteBinding,
  type GatewayRoutingPolicy,
  type LinkMetadataGrant,
  type ModelAuthorization,
  type ModelModality,
  type ModelOption,
  type NormalizedModelPrice,
  type OneTaskWorkerSelection,
  type PendingWorkerRouteAuthority,
  type ProjectAuthorityId,
  type ProviderManagedRuntimeLink,
  type ResolvedRoute,
  type RouteAuthoritySource,
  type WorkerAssignment,
  type WorkerResolvedRoute,
} from "../../shared/model-connections.js";

/** Main-owned parser limits. Later stores and drivers reuse these values so a
 * renderer cannot enlarge authority by choosing a more permissive surface. */
export const MODEL_CONNECTION_LIMITS = Object.freeze({
  humanLabel: 160,
  machineId: 128,
  modelId: 256,
  dataScope: 4_096,
  billingLabel: 240,
  optionList: 16,
  catalogModels: 1_024,
  metadataScopes: 16,
  servingProviders: 32,
  url: 2_048,
  oneTaskLifetimeMs: 30 * 60 * 1_000,
  pendingLifetimeMs: 30 * 60 * 1_000,
} as const);

export type SchemaParseResult<T> =
  | Readonly<{ kind: "absent" }>
  | Readonly<{ kind: "valid"; value: T }>
  | Readonly<{ kind: "malformed" }>;

const ABSENT = Object.freeze({ kind: "absent" } as const);
const MALFORMED = Object.freeze({ kind: "malformed" } as const);
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const EXECUTABLE_REVISION = /^sha256:[0-9a-f]{64}$/;
const CONVERSATION_ID = /^(?:00[1-9]|0[1-9][0-9]|[1-9][0-9]{2})$/;
const MACHINE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._/:@+-]*$/;
const DRIVE_PATH_MODEL_ID = /^[A-Za-z]:\//;
const DANGEROUS_MODEL_SCHEME = /^(?:data|file|ftp|https?|javascript):/i;
const CANONICAL_DECIMAL = /^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{0,11}[1-9])?$/;
const CURRENCY = /^[A-Z]{3}$/;
const FORBIDDEN_TEXT = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/u;

type DataRecord = Readonly<Record<string, unknown>>;
type ValueParser<T> = (value: unknown) => T | null;

function result<T>(value: unknown, parser: ValueParser<T>): SchemaParseResult<T> {
  if (value === undefined) return ABSENT;
  try {
    const parsed = parser(value);
    return parsed === null ? MALFORMED : Object.freeze({ kind: "valid", value: parsed });
  } catch {
    return MALFORMED;
  }
}

/** Exact JSON-data record inspection. This intentionally avoids property
 * access, rejects accessors/proxies/hidden fields, and returns detached values. */
function exactDataRecord(value: unknown, keys: readonly string[]): DataRecord | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || nodeTypes.isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))) return null;
    const detached: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return null;
      detached[key] = descriptor.value;
    }
    return detached;
  } catch {
    return null;
  }
}

function denseDataArray(value: unknown, cap: number): readonly unknown[] | null {
  try {
    if (!Array.isArray(value) || nodeTypes.isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (!lengthDescriptor || !("value" in lengthDescriptor)
      || typeof lengthDescriptor.value !== "number" || lengthDescriptor.value > cap) return null;
    const length = lengthDescriptor.value;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.length !== length + 1 || !ownKeys.includes("length")) return null;
    const detached: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return null;
      detached.push(descriptor.value);
    }
    return detached;
  } catch {
    return null;
  }
}

function wellFormedUtf16(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function plainText(value: unknown, cap: number, rejectHtml = true): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= cap
    && value.trim() === value
    && value.normalize("NFC") === value
    && wellFormedUtf16(value)
    && !FORBIDDEN_TEXT.test(value)
    && (!rejectHtml || !/[<>]/.test(value));
}

function machineToken(value: unknown): value is string {
  return typeof value === "string"
    && value.length <= MODEL_CONNECTION_LIMITS.machineId
    && MACHINE_TOKEN.test(value);
}

function revision(value: unknown): value is string {
  return machineToken(value);
}

function executableRevision(value: unknown): value is `sha256:${string}` {
  return typeof value === "string" && EXECUTABLE_REVISION.test(value);
}

function randomId(value: unknown): value is string {
  return typeof value === "string" && UUID_V4.test(value);
}

function projectAuthorityId(value: unknown): ProjectAuthorityId | null {
  return randomId(value) ? value as ProjectAuthorityId : null;
}

function digest(value: unknown): value is string {
  return typeof value === "string" && SHA256.test(value);
}

function canonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length !== 24) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

function modelId(value: unknown): value is string {
  if (typeof value !== "string" || value.length > MODEL_CONNECTION_LIMITS.modelId
    || !MODEL_ID.test(value) || value.includes("://") || DRIVE_PATH_MODEL_ID.test(value)
    || DANGEROUS_MODEL_SCHEME.test(value)) return false;
  const segments = value.split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function oneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function uniqueStringArray<T extends string>(
  value: unknown,
  cap: number,
  parseItem: (item: unknown) => item is T,
  minimum = 0,
): readonly T[] | null {
  const source = denseDataArray(value, cap);
  if (!source || source.length < minimum) return null;
  const output: T[] = [];
  const seen = new Set<string>();
  for (const item of source) {
    if (!parseItem(item) || seen.has(item)) return null;
    seen.add(item);
    output.push(item);
  }
  return Object.freeze(output);
}

function roles(value: unknown, minimum = 0): readonly CairnRole[] | null {
  return uniqueStringArray(value, 2, (item): item is CairnRole => oneOf(item, ["conductor", "worker"]), minimum);
}

function accountLabel(
  label: unknown,
  provenance: unknown,
): Readonly<{ label: string | null; provenance: AccountLabelProvenance }> | null {
  if (provenance === "unavailable") {
    return label === null ? Object.freeze({ label: null, provenance }) : null;
  }
  if ((provenance === "provider-verified" || provenance === "owner-label")
    && plainText(label, MODEL_CONNECTION_LIMITS.humanLabel)) {
    return Object.freeze({ label, provenance });
  }
  return null;
}

function normalizedPriceValue(value: unknown): NormalizedModelPrice | null {
  const record = exactDataRecord(value, ["inputPerMillion", "outputPerMillion", "currency"]);
  if (!record) return null;
  const input = record.inputPerMillion;
  const output = record.outputPerMillion;
  if (input !== null && (typeof input !== "string" || !CANONICAL_DECIMAL.test(input))) return null;
  if (output !== null && (typeof output !== "string" || !CANONICAL_DECIMAL.test(output))) return null;
  const hasPrice = input !== null || output !== null;
  if (hasPrice ? typeof record.currency !== "string" || !CURRENCY.test(record.currency) : record.currency !== null) return null;
  return Object.freeze({
    inputPerMillion: input as string | null,
    outputPerMillion: output as string | null,
    currency: record.currency as string | null,
  });
}

function connectionSummaryValue(value: unknown): ConnectionSummary | null {
  const record = exactDataRecord(value, [
    "id",
    "driverId",
    "accessProvider",
    "displayName",
    "accountSafeLabel",
    "accountLabelProvenance",
    "authKind",
    "billingKind",
    "supportedRoles",
    "runtimeId",
    "status",
    "authenticationRevision",
  ]);
  if (!record || !randomId(record.id) || !machineToken(record.driverId)
    || !plainText(record.accessProvider, MODEL_CONNECTION_LIMITS.humanLabel)
    || !plainText(record.displayName, MODEL_CONNECTION_LIMITS.humanLabel)
    || !oneOf<AuthKind>(record.authKind, ["api-key", "oauth", "provider-managed", "none"])
    || !oneOf<BillingKind>(record.billingKind, ["pay-as-you-go", "subscription", "local", "unknown"])
    || !oneOf<ConnectionStatus>(record.status, [
      "checking", "linked-not-authorized", "ready", "offline", "reconnect-required",
      "runtime-missing", "policy-blocked", "catalog-stale", "model-removed",
      "role-incompatible", "unavailable", "unsupported", "recovery-required",
    ]) || !revision(record.authenticationRevision)) return null;
  const parsedRoles = roles(record.supportedRoles);
  const parsedLabel = accountLabel(record.accountSafeLabel, record.accountLabelProvenance);
  if (!parsedRoles || !parsedLabel
    || (record.runtimeId !== null && !randomId(record.runtimeId))
    || (parsedRoles.includes("worker") && record.runtimeId === null)) return null;
  return Object.freeze({
    id: record.id,
    driverId: record.driverId,
    accessProvider: record.accessProvider,
    displayName: record.displayName,
    accountSafeLabel: parsedLabel.label,
    accountLabelProvenance: parsedLabel.provenance,
    authKind: record.authKind,
    billingKind: record.billingKind,
    supportedRoles: parsedRoles,
    runtimeId: record.runtimeId as string | null,
    status: record.status,
    authenticationRevision: record.authenticationRevision,
  }) as ConnectionSummary;
}

function modelOptionValue(value: unknown): ModelOption | null {
  const record = exactDataRecord(value, [
    "connectionId", "modelId", "displayName", "supportedRoles", "reasoningOptions",
    "modalities", "lifecycle", "catalogSource", "availabilityEvidence", "price",
    "driverRecommendationEligible", "providerDefault", "fetchedAt",
  ]);
  if (!record || !randomId(record.connectionId) || !modelId(record.modelId)
    || !plainText(record.displayName, MODEL_CONNECTION_LIMITS.humanLabel)
    || !oneOf(record.lifecycle, ["stable", "preview", "deprecated", "unknown"] as const)
    || !oneOf(record.catalogSource, ["authenticated", "provider-managed", "manual"] as const)
    || !oneOf(record.availabilityEvidence, ["account-confirmed", "provider-catalog", "configured-manually"] as const)
    || typeof record.driverRecommendationEligible !== "boolean"
    || typeof record.providerDefault !== "boolean"
    || !canonicalTimestamp(record.fetchedAt)) return null;
  const parsedRoles = roles(record.supportedRoles, 1);
  const reasoningOptions = uniqueStringArray(
    record.reasoningOptions,
    MODEL_CONNECTION_LIMITS.optionList,
    (item): item is string => machineToken(item),
  );
  const modalities = uniqueStringArray(
    record.modalities,
    8,
    (item): item is ModelModality => oneOf(item, ["text", "image", "audio", "video", "file"]),
    1,
  );
  const price = normalizedPriceValue(record.price);
  if (!parsedRoles || !reasoningOptions || !modalities || !price) return null;
  const manual = record.catalogSource === "manual";
  if (manual !== (record.availabilityEvidence === "configured-manually")) return null;
  if (manual && (record.driverRecommendationEligible || record.providerDefault)) return null;
  if (record.driverRecommendationEligible && record.lifecycle !== "stable") return null;
  return Object.freeze({
    connectionId: record.connectionId,
    modelId: record.modelId,
    displayName: record.displayName,
    supportedRoles: parsedRoles,
    reasoningOptions,
    modalities,
    lifecycle: record.lifecycle,
    catalogSource: record.catalogSource,
    availabilityEvidence: record.availabilityEvidence,
    price,
    driverRecommendationEligible: record.driverRecommendationEligible,
    providerDefault: record.providerDefault,
    fetchedAt: record.fetchedAt,
  });
}

function catalogSnapshotValue(value: unknown): CatalogSnapshot | null {
  const record = exactDataRecord(value, [
    "connectionId", "authenticationRevision", "catalogRevision", "fetchedAt", "freshness", "models",
  ]);
  if (!record || !randomId(record.connectionId) || !revision(record.authenticationRevision)
    || !revision(record.catalogRevision) || !canonicalTimestamp(record.fetchedAt)
    || !oneOf(record.freshness, ["fresh", "stale", "display-only"] as const)) return null;
  const source = denseDataArray(record.models, MODEL_CONNECTION_LIMITS.catalogModels);
  if (!source) return null;
  const models: ModelOption[] = [];
  const modelIds = new Set<string>();
  const defaultRoles = new Set<CairnRole>();
  for (const raw of source) {
    const model = modelOptionValue(raw);
    if (!model || model.connectionId !== record.connectionId || model.fetchedAt !== record.fetchedAt
      || modelIds.has(model.modelId)) return null;
    modelIds.add(model.modelId);
    if (model.providerDefault) {
      for (const role of model.supportedRoles) {
        if (defaultRoles.has(role)) return null;
        defaultRoles.add(role);
      }
    }
    models.push(model);
  }
  return Object.freeze({
    connectionId: record.connectionId,
    authenticationRevision: record.authenticationRevision,
    catalogRevision: record.catalogRevision,
    fetchedAt: record.fetchedAt,
    freshness: record.freshness,
    models: Object.freeze(models),
  });
}

function providerManagedRuntimeLinkValue(value: unknown): ProviderManagedRuntimeLink | null {
  const record = exactDataRecord(value, [
    "runtimeId", "runtimeKind", "executableRevision", "accountState", "runtimeRevision",
  ]);
  if (!record || !randomId(record.runtimeId) || !machineToken(record.runtimeKind)
    || !executableRevision(record.executableRevision) || !revision(record.runtimeRevision)
    || !oneOf(record.accountState, ["provider-verified", "account-uninspectable"] as const)) return null;
  return Object.freeze({
    runtimeId: record.runtimeId,
    runtimeKind: record.runtimeKind,
    executableRevision: record.executableRevision,
    accountState: record.accountState,
    runtimeRevision: record.runtimeRevision,
  });
}

function conductorAssignmentValue(value: unknown): ConductorAssignment | null {
  const head = exactDataRecord(value, ["role", "mode", "connectionId", "policyVersion", "assignmentRevision"])
    ?? exactDataRecord(value, ["role", "mode", "connectionId", "modelId", "assignmentRevision"]);
  if (!head || head.role !== "conductor" || !randomId(head.connectionId) || !revision(head.assignmentRevision)) return null;
  if (head.mode === "auto" && revision(head.policyVersion)) {
    return Object.freeze({
      role: "conductor", mode: "auto", connectionId: head.connectionId,
      policyVersion: head.policyVersion, assignmentRevision: head.assignmentRevision,
    });
  }
  if (head.mode === "pinned" && modelId(head.modelId)) {
    return Object.freeze({
      role: "conductor", mode: "pinned", connectionId: head.connectionId,
      modelId: head.modelId, assignmentRevision: head.assignmentRevision,
    });
  }
  return null;
}

function workerAssignmentValue(value: unknown): WorkerAssignment | null {
  const pinned = exactDataRecord(value, [
    "role", "mode", "connectionId", "runtimeId", "modelId", "assignmentRevision",
  ]);
  if (pinned) {
    if (pinned.role !== "worker" || pinned.mode !== "pinned" || !randomId(pinned.connectionId)
      || !randomId(pinned.runtimeId) || !modelId(pinned.modelId) || !revision(pinned.assignmentRevision)) return null;
    return Object.freeze({
      role: "worker", mode: "pinned", connectionId: pinned.connectionId,
      runtimeId: pinned.runtimeId, modelId: pinned.modelId, assignmentRevision: pinned.assignmentRevision,
    });
  }
  const auto = exactDataRecord(value, [
    "role", "mode", "connectionId", "runtimeId", "policyVersion", "assignmentRevision",
  ]) ?? exactDataRecord(value, [
    "role", "mode", "connectionId", "runtimeId", "lastResolvedModelId", "policyVersion", "assignmentRevision",
  ]);
  if (!auto || auto.role !== "worker" || auto.mode !== "auto" || !randomId(auto.connectionId)
    || !randomId(auto.runtimeId) || !revision(auto.policyVersion) || !revision(auto.assignmentRevision)) return null;
  const hasLast = Object.prototype.hasOwnProperty.call(auto, "lastResolvedModelId");
  if (hasLast && !modelId(auto.lastResolvedModelId)) return null;
  return Object.freeze({
    role: "worker",
    mode: "auto",
    connectionId: auto.connectionId,
    runtimeId: auto.runtimeId,
    ...(hasLast ? { lastResolvedModelId: auto.lastResolvedModelId as string } : {}),
    policyVersion: auto.policyVersion,
    assignmentRevision: auto.assignmentRevision,
  });
}

function modelAuthorizationValue(value: unknown): ModelAuthorization | null {
  const auto = exactDataRecord(value, ["mode", "policyVersion"]);
  if (auto?.mode === "auto" && revision(auto.policyVersion)) {
    return Object.freeze({ mode: "auto", policyVersion: auto.policyVersion });
  }
  const pinned = exactDataRecord(value, ["mode", "modelId"]);
  if (pinned?.mode === "pinned" && modelId(pinned.modelId)) {
    return Object.freeze({ mode: "pinned", modelId: pinned.modelId });
  }
  return null;
}

function oneTaskWorkerSelectionValue(value: unknown): OneTaskWorkerSelection | null {
  const record = exactDataRecord(value, [
    "selectionId", "selectionRevision", "projectAuthorityId", "connectionId", "runtimeId",
    "model", "createdAt", "expiresAt",
  ]);
  if (!record || !randomId(record.selectionId) || !revision(record.selectionRevision)
    || !randomId(record.connectionId) || !randomId(record.runtimeId)
    || !canonicalTimestamp(record.createdAt) || !canonicalTimestamp(record.expiresAt)) return null;
  const projectId = projectAuthorityId(record.projectAuthorityId);
  const model = modelAuthorizationValue(record.model);
  if (!projectId || !model) return null;
  const lifetime = Date.parse(record.expiresAt) - Date.parse(record.createdAt);
  if (lifetime <= 0 || lifetime > MODEL_CONNECTION_LIMITS.oneTaskLifetimeMs) return null;
  return Object.freeze({
    selectionId: record.selectionId,
    selectionRevision: record.selectionRevision,
    projectAuthorityId: projectId,
    connectionId: record.connectionId,
    runtimeId: record.runtimeId,
    model,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
  });
}

function routeAuthoritySourceValue(value: unknown): RouteAuthoritySource | null {
  const assignment = exactDataRecord(value, ["kind", "assignmentRevision"]);
  if (assignment?.kind === "assignment" && revision(assignment.assignmentRevision)) {
    return Object.freeze({ kind: "assignment", assignmentRevision: assignment.assignmentRevision });
  }
  const selection = exactDataRecord(value, ["kind", "selectionRevision"]);
  if (selection?.kind === "one-task-selection" && revision(selection.selectionRevision)) {
    return Object.freeze({ kind: "one-task-selection", selectionRevision: selection.selectionRevision });
  }
  return null;
}

function linkMetadataGrantValue(value: unknown): LinkMetadataGrant | null {
  const record = exactDataRecord(value, [
    "grantRevision", "connectionId", "authenticationRevision", "authorizationBasis",
    "metadataScope", "metadataCostCertainty", "routingPolicyRevision", "grantedAt",
  ]);
  if (!record || !revision(record.grantRevision) || !randomId(record.connectionId)
    || !revision(record.authenticationRevision)
    || !oneOf(record.authorizationBasis, ["explicit", "legacy-pinned-bridge"] as const)
    || !oneOf(record.metadataCostCertainty, ["documented-no-charge", "may-charge", "unknown"] as const)
    || !revision(record.routingPolicyRevision) || !canonicalTimestamp(record.grantedAt)) return null;
  const metadataScope = uniqueStringArray(
    record.metadataScope,
    MODEL_CONNECTION_LIMITS.metadataScopes,
    (item): item is string => machineToken(item),
  );
  if (!metadataScope) return null;
  if (record.authorizationBasis === "legacy-pinned-bridge"
    && (metadataScope.length !== 0 || record.metadataCostCertainty !== "unknown")) return null;
  return Object.freeze({
    grantRevision: record.grantRevision,
    connectionId: record.connectionId,
    authenticationRevision: record.authenticationRevision,
    authorizationBasis: record.authorizationBasis,
    metadataScope,
    metadataCostCertainty: record.metadataCostCertainty,
    routingPolicyRevision: record.routingPolicyRevision,
    grantedAt: record.grantedAt,
  });
}

function conductorGrantValue(value: unknown): ConductorGrant | null {
  const record = exactDataRecord(value, [
    "grantRevision", "projectAuthorityId", "connectionId", "authenticationRevision",
    "authorizationBasis", "authorizedDataScope", "billingKind", "billingRevision", "routingPolicyRevision",
    "modelAuthorization", "grantedAt",
  ]);
  if (!record || !revision(record.grantRevision) || !randomId(record.connectionId)
    || !revision(record.authenticationRevision)
    || !oneOf(record.authorizationBasis, ["explicit", "legacy-pinned-bridge"] as const)
    || !plainText(record.authorizedDataScope, MODEL_CONNECTION_LIMITS.dataScope)
    || !oneOf<BillingKind>(record.billingKind, ["pay-as-you-go", "subscription", "local", "unknown"])
    || !revision(record.billingRevision) || !revision(record.routingPolicyRevision)
    || !canonicalTimestamp(record.grantedAt)) return null;
  const projectId = projectAuthorityId(record.projectAuthorityId);
  const modelAuthorization = modelAuthorizationValue(record.modelAuthorization);
  if (!projectId || !modelAuthorization
    || (record.authorizationBasis === "legacy-pinned-bridge"
      && (modelAuthorization.mode !== "pinned" || record.billingKind !== "unknown"))) return null;
  return Object.freeze({
    grantRevision: record.grantRevision,
    projectAuthorityId: projectId,
    connectionId: record.connectionId,
    authenticationRevision: record.authenticationRevision,
    authorizationBasis: record.authorizationBasis,
    authorizedDataScope: record.authorizedDataScope,
    billingKind: record.billingKind,
    billingRevision: record.billingRevision,
    routingPolicyRevision: record.routingPolicyRevision,
    modelAuthorization,
    grantedAt: record.grantedAt,
  });
}

function gatewayRoutingPolicyValue(value: unknown): GatewayRoutingPolicy | null {
  const record = exactDataRecord(value, [
    "mode", "allowedServingProviders", "allowServingProviderFallback", "allowByok",
    "allowSharedCapacityAfterByok", "region",
  ]);
  if (!record || !oneOf(record.mode, ["not-a-gateway", "gateway-managed", "pinned-serving-provider"] as const)
    || typeof record.allowServingProviderFallback !== "boolean" || typeof record.allowByok !== "boolean"
    || typeof record.allowSharedCapacityAfterByok !== "boolean"
    || (record.region !== null && !machineToken(record.region))) return null;
  const providers = uniqueStringArray(
    record.allowedServingProviders,
    MODEL_CONNECTION_LIMITS.servingProviders,
    (item): item is string => machineToken(item),
  );
  if (!providers) return null;
  if (record.mode === "not-a-gateway") {
    if (providers.length !== 0 || record.allowServingProviderFallback || record.allowByok
      || record.allowSharedCapacityAfterByok || record.region !== null) return null;
  } else if (record.mode === "pinned-serving-provider") {
    if (providers.length !== 1 || record.allowServingProviderFallback || record.allowSharedCapacityAfterByok) return null;
  }
  if (record.allowSharedCapacityAfterByok && (!record.allowByok || !record.allowServingProviderFallback)) return null;
  return Object.freeze({
    mode: record.mode,
    allowedServingProviders: providers,
    allowServingProviderFallback: record.allowServingProviderFallback,
    allowByok: record.allowByok,
    allowSharedCapacityAfterByok: record.allowSharedCapacityAfterByok,
    region: record.region as string | null,
  });
}

function billingRouteValue(value: unknown): BillingRoute | null {
  const record = exactDataRecord(value, ["kind", "source", "certainty", "label"]);
  if (!record || !oneOf<BillingKind>(record.kind, ["pay-as-you-go", "subscription", "local", "unknown"])
    || !oneOf<BillingSource>(record.source, [
      "provider-account", "subscription-quota", "byok", "byok-with-provider-fallback", "local", "unknown",
    ]) || !oneOf<BillingCertainty>(record.certainty, ["verified", "provider-reported", "unknown"])
    || !plainText(record.label, MODEL_CONNECTION_LIMITS.billingLabel)) return null;
  if (record.kind === "unknown") {
    if (record.source !== "unknown" || record.certainty !== "unknown") return null;
  } else if (record.kind === "local") {
    if (record.source !== "local" || record.certainty === "unknown") return null;
  } else if (record.kind === "subscription") {
    if (record.source !== "subscription-quota" || record.certainty === "unknown") return null;
  } else if (!oneOf(record.source, ["provider-account", "byok", "byok-with-provider-fallback"] as const)
    || record.certainty === "unknown") return null;
  return Object.freeze({
    kind: record.kind,
    source: record.source,
    certainty: record.certainty,
    label: record.label,
  }) as BillingRoute;
}

const RESOLVED_ROUTE_KEYS = [
  "role", "routeInstanceId", "projectAuthorityId", "connectionId", "driverId",
  "accessProvider", "accountSafeLabel", "accountLabelProvenance", "modelAuthor", "modelId",
  "billingRoute", "billingRevision", "authoritySource", "linkGrantRevision",
  "conductorGrantRevision", "authenticationRevision", "catalogRevision", "catalogSource", "capabilityRevision",
  "runtimeRevision", "executableRevision", "gatewayRouting", "routingPolicyRevision", "selection",
  "policyVersion", "runtimeId", "routeAuthorityDigest", "resolvedAt",
] as const;

function resolvedRouteValue(value: unknown): ResolvedRoute | null {
  const record = exactDataRecord(value, RESOLVED_ROUTE_KEYS);
  if (!record || !oneOf(record.role, ["conductor", "worker"] as const)
    || !randomId(record.routeInstanceId) || !randomId(record.connectionId)
    || !machineToken(record.driverId) || !plainText(record.accessProvider, MODEL_CONNECTION_LIMITS.humanLabel)
    || (record.modelAuthor !== null && !plainText(record.modelAuthor, MODEL_CONNECTION_LIMITS.humanLabel))
    || !modelId(record.modelId) || !revision(record.billingRevision) || !revision(record.linkGrantRevision)
    || !revision(record.authenticationRevision)
    || (record.catalogRevision !== null && !revision(record.catalogRevision))
    || !oneOf(record.catalogSource, ["authenticated", "provider-managed", "manual", "legacy-pinned-bridge"] as const)
    || !revision(record.capabilityRevision) || !revision(record.routingPolicyRevision)
    || !oneOf(record.selection, ["auto", "pinned"] as const)
    || !digest(record.routeAuthorityDigest) || !canonicalTimestamp(record.resolvedAt)) return null;
  const projectId = projectAuthorityId(record.projectAuthorityId);
  const label = accountLabel(record.accountSafeLabel, record.accountLabelProvenance);
  const billingRoute = billingRouteValue(record.billingRoute);
  const authoritySource = routeAuthoritySourceValue(record.authoritySource);
  const gatewayRouting = gatewayRoutingPolicyValue(record.gatewayRouting);
  if (!projectId || !label || !billingRoute || !authoritySource || !gatewayRouting) return null;
  if (record.selection === "auto") {
    if (!revision(record.policyVersion) || record.catalogRevision === null
      || !oneOf(record.catalogSource, ["authenticated", "provider-managed"] as const)) return null;
  } else {
    if (record.policyVersion !== null) return null;
    const hasCatalogRevision = record.catalogRevision !== null;
    const catalogBacked = oneOf(record.catalogSource, ["authenticated", "provider-managed"] as const);
    const exactOnly = oneOf(record.catalogSource, ["manual", "legacy-pinned-bridge"] as const);
    if ((hasCatalogRevision && !catalogBacked) || (!hasCatalogRevision && !exactOnly)) return null;
  }

  const byokSource = billingRoute.source === "byok"
    || billingRoute.source === "byok-with-provider-fallback";
  if (!byokSource && (gatewayRouting.allowByok || gatewayRouting.allowSharedCapacityAfterByok)) return null;
  if (billingRoute.source === "byok"
    && (!gatewayRouting.allowByok || gatewayRouting.mode === "not-a-gateway"
      || gatewayRouting.allowSharedCapacityAfterByok)) return null;
  if (billingRoute.source === "byok-with-provider-fallback"
    && (gatewayRouting.mode !== "gateway-managed" || !gatewayRouting.allowByok
      || !gatewayRouting.allowSharedCapacityAfterByok || !gatewayRouting.allowServingProviderFallback)) return null;

  const common = {
    routeInstanceId: record.routeInstanceId,
    projectAuthorityId: projectId,
    connectionId: record.connectionId,
    driverId: record.driverId,
    accessProvider: record.accessProvider,
    accountSafeLabel: label.label,
    accountLabelProvenance: label.provenance,
    modelAuthor: record.modelAuthor as string | null,
    modelId: record.modelId,
    billingRoute,
    billingRevision: record.billingRevision,
    linkGrantRevision: record.linkGrantRevision,
    authenticationRevision: record.authenticationRevision,
    catalogRevision: record.catalogRevision as string | null,
    catalogSource: record.catalogSource,
    capabilityRevision: record.capabilityRevision,
    gatewayRouting,
    routingPolicyRevision: record.routingPolicyRevision,
    selection: record.selection,
    policyVersion: record.policyVersion as string | null,
    routeAuthorityDigest: record.routeAuthorityDigest,
    resolvedAt: record.resolvedAt,
  } as const;

  if (record.role === "conductor") {
    if (authoritySource.kind !== "assignment" || !revision(record.conductorGrantRevision)) return null;
    const apiTransport = record.runtimeId === null
      && record.runtimeRevision === null
      && record.executableRevision === null;
    const managedRuntime = randomId(record.runtimeId)
      && revision(record.runtimeRevision)
      && executableRevision(record.executableRevision);
    if ((!apiTransport && !managedRuntime)
      || (record.catalogSource === "legacy-pinned-bridge" && !apiTransport)) return null;
    return Object.freeze({
      ...common,
      role: "conductor",
      authoritySource,
      conductorGrantRevision: record.conductorGrantRevision,
      runtimeRevision: record.runtimeRevision,
      executableRevision: record.executableRevision,
      runtimeId: record.runtimeId,
    }) as ConductorResolvedRoute;
  }

  if (record.catalogSource === "legacy-pinned-bridge" || record.conductorGrantRevision !== null || !randomId(record.runtimeId)
    || !revision(record.runtimeRevision) || !executableRevision(record.executableRevision)) return null;
  return Object.freeze({
    ...common,
    role: "worker",
    authoritySource,
    conductorGrantRevision: null,
    runtimeRevision: record.runtimeRevision,
    executableRevision: record.executableRevision,
    runtimeId: record.runtimeId,
  }) as WorkerResolvedRoute;
}

function conversationRouteBindingValue(value: unknown): ConversationRouteBinding | null {
  const record = exactDataRecord(value, [
    "projectAuthorityId", "conversationId", "resolvedRoute", "resolvedRouteDigest", "boundAt",
  ]);
  if (!record || typeof record.conversationId !== "string" || !CONVERSATION_ID.test(record.conversationId)
    || !digest(record.resolvedRouteDigest) || !canonicalTimestamp(record.boundAt)) return null;
  const projectId = projectAuthorityId(record.projectAuthorityId);
  const route = resolvedRouteValue(record.resolvedRoute);
  if (!projectId || !route || route.role !== "conductor" || route.projectAuthorityId !== projectId
    || Date.parse(record.boundAt) < Date.parse(route.resolvedAt)) return null;
  return Object.freeze({
    projectAuthorityId: projectId,
    conversationId: record.conversationId,
    resolvedRoute: route,
    resolvedRouteDigest: record.resolvedRouteDigest,
    boundAt: record.boundAt,
  });
}

function pendingWorkerRouteAuthorityValue(value: unknown): PendingWorkerRouteAuthority | null {
  const record = exactDataRecord(value, [
    "previewId", "projectAuthorityId", "resolvedRoute", "disclosureDigest", "expiresAt",
  ]);
  if (!record || !randomId(record.previewId) || !digest(record.disclosureDigest)
    || !canonicalTimestamp(record.expiresAt)) return null;
  const projectId = projectAuthorityId(record.projectAuthorityId);
  const route = resolvedRouteValue(record.resolvedRoute);
  if (!projectId || !route || route.role !== "worker" || route.projectAuthorityId !== projectId) return null;
  const lifetime = Date.parse(record.expiresAt) - Date.parse(route.resolvedAt);
  if (lifetime <= 0 || lifetime > MODEL_CONNECTION_LIMITS.pendingLifetimeMs) return null;
  return Object.freeze({
    previewId: record.previewId,
    projectAuthorityId: projectId,
    resolvedRoute: route,
    disclosureDigest: record.disclosureDigest,
    expiresAt: record.expiresAt,
  });
}

function connectionBaseUrlValue(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > MODEL_CONNECTION_LIMITS.url
    || value.trim() !== value || !wellFormedUtf16(value) || FORBIDDEN_TEXT.test(value)
    || !/^https?:\/\/[^/\\]/i.test(value) || /[\\\s]/u.test(value)) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash || !parsed.hostname
    || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) return null;
  return value;
}

export function parseModelConnectionsSchemaVersion(
  value: unknown,
): SchemaParseResult<typeof MODEL_CONNECTIONS_SCHEMA_VERSION> {
  return result(value, (item) => item === MODEL_CONNECTIONS_SCHEMA_VERSION ? item : null);
}

export function parseConnectionBaseUrl(value: unknown): SchemaParseResult<string> {
  return result(value, connectionBaseUrlValue);
}

/** Syntax validation only. Task 3 must resolve this candidate against the
 * main-owned canonical-project registry before using it as authority. */
export function parseProjectAuthorityId(value: unknown): SchemaParseResult<ProjectAuthorityId> {
  return result(value, projectAuthorityId);
}

export function parseConnectionSummary(value: unknown): SchemaParseResult<ConnectionSummary> {
  return result(value, connectionSummaryValue);
}

export function parseModelOption(value: unknown): SchemaParseResult<ModelOption> {
  return result(value, modelOptionValue);
}

export function parseCatalogSnapshot(value: unknown): SchemaParseResult<CatalogSnapshot> {
  return result(value, catalogSnapshotValue);
}

export function parseProviderManagedRuntimeLink(value: unknown): SchemaParseResult<ProviderManagedRuntimeLink> {
  return result(value, providerManagedRuntimeLinkValue);
}

export function parseConductorAssignment(value: unknown): SchemaParseResult<ConductorAssignment> {
  return result(value, conductorAssignmentValue);
}

export function parseWorkerAssignment(value: unknown): SchemaParseResult<WorkerAssignment> {
  return result(value, workerAssignmentValue);
}

export function parseConversationRouteBinding(value: unknown): SchemaParseResult<ConversationRouteBinding> {
  return result(value, conversationRouteBindingValue);
}

export function parseOneTaskWorkerSelection(value: unknown): SchemaParseResult<OneTaskWorkerSelection> {
  return result(value, oneTaskWorkerSelectionValue);
}

export function parseRouteAuthoritySource(value: unknown): SchemaParseResult<RouteAuthoritySource> {
  return result(value, routeAuthoritySourceValue);
}

export function parseLinkMetadataGrant(value: unknown): SchemaParseResult<LinkMetadataGrant> {
  return result(value, linkMetadataGrantValue);
}

export function parseConductorGrant(value: unknown): SchemaParseResult<ConductorGrant> {
  return result(value, conductorGrantValue);
}

export function parseGatewayRoutingPolicy(value: unknown): SchemaParseResult<GatewayRoutingPolicy> {
  return result(value, gatewayRoutingPolicyValue);
}

export function parseResolvedRoute(value: unknown): SchemaParseResult<ResolvedRoute> {
  return result(value, resolvedRouteValue);
}

export function parsePendingWorkerRouteAuthority(
  value: unknown,
): SchemaParseResult<PendingWorkerRouteAuthority> {
  return result(value, pendingWorkerRouteAuthorityValue);
}
