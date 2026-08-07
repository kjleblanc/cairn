import { createHash } from "node:crypto";
import type {
  BillingRoute,
  CatalogSnapshot,
  ConnectionSummary,
  ConductorAssignment,
  ConductorGrant,
  ConductorResolvedRoute,
  ConversationRouteBinding,
  GatewayRoutingPolicy,
  LinkMetadataGrant,
  ModelOption,
  ProjectAuthorityId,
  ProviderManagedRuntimeLink,
  RouteAuthoritySource,
  WorkerAssignment,
  WorkerResolvedRoute,
} from "../../shared/model-connections.js";
import {
  parseCatalogSnapshot,
  parseConductorAssignment,
  parseConductorGrant,
  parseConnectionSummary,
  parseConversationRouteBinding,
  parseGatewayRoutingPolicy,
  parseLinkMetadataGrant,
  parseModelOption,
  parseProjectAuthorityId,
  parseProviderManagedRuntimeLink,
  parseResolvedRoute,
  parseRouteAuthoritySource,
  parseWorkerAssignment,
} from "./schema.js";
import type { ModelConnectionDriverRegistry } from "./registry.js";
import type {
  ModelConnectionDriver,
  ReviewedAutoRecommendation,
} from "./drivers/types.js";
import { projectCatalogFreshness, verifyCatalogRevision } from "./catalog.js";

export interface RouteConnectionAuthority {
  readonly summary: ConnectionSummary;
  /** A presence/status fact only. No credential bytes or references enter the
   * resolver. */
  readonly credentialState: "ready" | "unavailable";
  readonly billingRoute: BillingRoute;
  readonly billingRevision: string;
  readonly capabilityRevision: string;
  readonly gatewayRouting: GatewayRoutingPolicy;
  readonly routingPolicyRevision: string;
  readonly runtime: ProviderManagedRuntimeLink | null;
}

export type ConductorSelectionAuthority =
  | Readonly<{ kind: "new"; assignment: ConductorAssignment }>
  | Readonly<{
      kind: "bound";
      binding: ConversationRouteBinding;
    }>;

export type RouteResolutionCode =
  | "AUTHENTICATION_CHANGED"
  | "AUTO_POLICY_UNAVAILABLE"
  | "AUTO_UNAVAILABLE"
  | "BINDING_INVALID"
  | "BINDING_SCOPE_MISMATCH"
  | "CATALOG_IDENTITY_CHANGED"
  | "CATALOG_REQUIRED"
  | "CATALOG_STALE"
  | "CONNECTION_NOT_READY"
  | "CONNECTION_OR_DRIVER_MISMATCH"
  | "GRANT_MISMATCH"
  | "INVALID_AUTHORITY"
  | "MODEL_REMOVED"
  | "RAW_API_WORKER_UNSUPPORTED"
  | "ROLE_INCOMPATIBLE"
  | "ROUTE_AUTHORITY_CHANGED"
  | "RUNTIME_MISMATCH";

export type ConductorRouteResolution =
  | Readonly<{
      kind: "resolved";
      reason:
        | "PINNED_MODEL"
        | "REVIEWED_RECOMMENDATION"
        | "VERIFIED_PROVIDER_DEFAULT"
        | "RETAINED_CONVERSATION_MODEL";
      route: ConductorResolvedRoute;
      binding: ConversationRouteBinding;
    }>
  | Readonly<{ kind: "needs-attention"; code: RouteResolutionCode }>;

export type WorkerRouteResolution =
  | Readonly<{
      kind: "resolved";
      reason:
        | "PINNED_MODEL"
        | "REVIEWED_RECOMMENDATION"
        | "VERIFIED_PROVIDER_DEFAULT"
        | "RETAINED_ASSIGNMENT_MODEL";
      route: WorkerResolvedRoute;
    }>
  | Readonly<{ kind: "needs-attention"; code: RouteResolutionCode }>;

export interface ResolveConductorRouteInput {
  readonly projectAuthorityId: ProjectAuthorityId;
  readonly conversationId: string;
  readonly selection: ConductorSelectionAuthority;
  readonly connection: RouteConnectionAuthority;
  readonly linkGrant: LinkMetadataGrant;
  readonly conductorGrant: ConductorGrant;
  readonly catalog: CatalogSnapshot | null;
  readonly manualModel: ModelOption | null;
  readonly registry: ModelConnectionDriverRegistry;
  readonly routeInstanceId: string;
  readonly resolvedAt: string;
  readonly boundAt: string;
}

export interface ResolveWorkerRouteInput {
  readonly projectAuthorityId: ProjectAuthorityId;
  readonly assignment: WorkerAssignment;
  readonly authoritySource: RouteAuthoritySource;
  readonly connection: RouteConnectionAuthority;
  readonly linkGrant: LinkMetadataGrant;
  readonly catalog: CatalogSnapshot | null;
  readonly manualModel: ModelOption | null;
  readonly registry: ModelConnectionDriverRegistry;
  readonly routeInstanceId: string;
  readonly resolvedAt: string;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Readonly<Record<string, unknown>>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  const primitive = JSON.stringify(value);
  return primitive === undefined ? "null" : primitive;
}

function domainDigest(domain: string, value: unknown): string {
  return createHash("sha256")
    .update(canonicalJson({ domain, value }), "utf8")
    .digest("hex");
}

/** Stable route comparison digest. Only the audit identity/time and this
 * digest slot are excluded; display labels remain covered. */
export function calculateRouteAuthorityDigest(route: object): string {
  const record = route as Readonly<Record<string, unknown>>;
  const {
    routeAuthorityDigest: _routeAuthorityDigest,
    routeInstanceId: _routeInstanceId,
    resolvedAt: _resolvedAt,
    ...stableAuthority
  } = record;
  return domainDigest("cairn-route-authority/v1", stableAuthority);
}

type BindingDigestInput = Omit<ConversationRouteBinding, "resolvedRouteDigest">
  & Partial<Pick<ConversationRouteBinding, "resolvedRouteDigest">>;

/** Complete binding custody includes its project+conversation tuple and all
 * route audit fields. Only the digest slot itself is excluded. */
export function calculateConversationBindingDigest(binding: BindingDigestInput): string {
  const {
    resolvedRouteDigest: _resolvedRouteDigest,
    projectAuthorityId,
    conversationId,
    resolvedRoute,
    boundAt,
  } = binding;
  return domainDigest("cairn-conversation-route-binding/v1", {
    projectAuthorityId,
    conversationId,
    resolvedRoute,
    boundAt,
  });
}

export function createConversationRouteBinding(
  route: ConductorResolvedRoute,
  conversationId: string,
  boundAt: string,
): ConversationRouteBinding {
  const unsigned = {
    projectAuthorityId: route.projectAuthorityId,
    conversationId,
    resolvedRoute: route,
    boundAt,
  };
  const candidate = {
    ...unsigned,
    resolvedRouteDigest: calculateConversationBindingDigest(unsigned),
  };
  const parsed = parseConversationRouteBinding(candidate);
  if (parsed.kind !== "valid") throw new Error("CONVERSATION_ROUTE_BINDING_INVALID");
  return parsed.value;
}

export function verifyConversationRouteBinding(binding: ConversationRouteBinding): boolean {
  const parsed = parseConversationRouteBinding(binding);
  return parsed.kind === "valid"
    && parsed.value.resolvedRoute.routeAuthorityDigest
      === calculateRouteAuthorityDigest(parsed.value.resolvedRoute)
    && parsed.value.resolvedRouteDigest
      === calculateConversationBindingDigest(parsed.value);
}

export type PinnedSelectionResult =
  | Readonly<{ kind: "resolved"; modelId: string }>
  | Readonly<{ kind: "needs-attention"; code: "PINNED_SELECTION_INVALID" }>;

/** Today's service uses only this conductor/legacy branch. Catalog-backed and
 * worker selection must use the complete resolver below; Task 5+ owns the
 * production route-receipt cutover. */
export function resolvePinnedSelection(input: Readonly<{
  role: "conductor";
  connectionId: string;
  modelId: string;
  conductorTransportAvailable: true;
  runtimeId: null;
  catalog: null;
  catalogSource: "legacy-pinned-bridge";
}>): PinnedSelectionResult {
  if (input.role !== "conductor" || input.conductorTransportAvailable !== true
    || input.runtimeId !== null || input.catalog !== null
    || input.catalogSource !== "legacy-pinned-bridge") {
    return Object.freeze({ kind: "needs-attention", code: "PINNED_SELECTION_INVALID" });
  }
  const parsed = parseConductorAssignment({
    role: "conductor",
    mode: "pinned",
    connectionId: input.connectionId,
    modelId: input.modelId,
    assignmentRevision: "pinned-selection-r1",
  });
  if (parsed.kind !== "valid") {
    return Object.freeze({ kind: "needs-attention", code: "PINNED_SELECTION_INVALID" });
  }
  return Object.freeze({ kind: "resolved", modelId: input.modelId });
}

const NEEDS = (code: RouteResolutionCode) => Object.freeze({ kind: "needs-attention", code } as const);

function same(left: unknown, right: unknown): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function checkedConnection(
  connection: RouteConnectionAuthority,
  registry: ModelConnectionDriverRegistry,
): Readonly<{ driver: NonNullable<ReturnType<ModelConnectionDriverRegistry["get"]>> }> | RouteResolutionCode {
  const summary = parseConnectionSummary(connection.summary);
  const routing = parseGatewayRoutingPolicy(connection.gatewayRouting);
  if (summary.kind !== "valid" || routing.kind !== "valid") return "INVALID_AUTHORITY";
  if (summary.value.status !== "ready" || connection.credentialState !== "ready") return "CONNECTION_NOT_READY";
  const driver = registry.get(summary.value.driverId);
  if (!driver) return "CONNECTION_OR_DRIVER_MISMATCH";
  let accessProvider: string | null;
  try {
    accessProvider = driver.accessProvider(Object.freeze({
      connectionId: summary.value.id,
      authenticationRevision: summary.value.authenticationRevision,
    }));
  } catch {
    return "CONNECTION_OR_DRIVER_MISMATCH";
  }
  if (accessProvider !== summary.value.accessProvider) return "CONNECTION_OR_DRIVER_MISMATCH";
  if (summary.value.runtimeId === null) {
    if (connection.runtime !== null) return "RUNTIME_MISMATCH";
  } else {
    const runtime = connection.runtime === null ? null : parseProviderManagedRuntimeLink(connection.runtime);
    if (runtime?.kind !== "valid" || runtime.value.runtimeId !== summary.value.runtimeId) return "RUNTIME_MISMATCH";
  }
  if (connection.billingRoute.kind !== summary.value.billingKind) return "ROUTE_AUTHORITY_CHANGED";
  return Object.freeze({ driver });
}

function checkedLink(
  grant: LinkMetadataGrant,
  connection: RouteConnectionAuthority,
): RouteResolutionCode | null {
  const parsed = parseLinkMetadataGrant(grant);
  if (parsed.kind !== "valid") return "GRANT_MISMATCH";
  if (grant.connectionId !== connection.summary.id
    || grant.authenticationRevision !== connection.summary.authenticationRevision
    || grant.routingPolicyRevision !== connection.routingPolicyRevision) return "GRANT_MISMATCH";
  return null;
}

function checkedCatalog(
  catalog: CatalogSnapshot | null,
  connection: RouteConnectionAuthority,
  registry: ModelConnectionDriverRegistry,
  now: string,
): CatalogSnapshot | RouteResolutionCode {
  if (catalog === null) return "CATALOG_REQUIRED";
  const parsed = parseCatalogSnapshot(catalog);
  if (parsed.kind !== "valid" || !verifyCatalogRevision(parsed.value)) return "INVALID_AUTHORITY";
  if (parsed.value.connectionId !== connection.summary.id
    || parsed.value.authenticationRevision !== connection.summary.authenticationRevision) {
    return "CATALOG_IDENTITY_CHANGED";
  }
  const driver = registry.get(connection.summary.driverId);
  if (!driver) return "CONNECTION_OR_DRIVER_MISMATCH";
  const projected = projectCatalogFreshness(parsed.value, driver.freshnessPolicy, now);
  if (projected.freshness !== "fresh") return "CATALOG_STALE";
  return projected;
}

function autoEligible(model: ModelOption, role: "conductor" | "worker"): boolean {
  return model.lifecycle === "stable" && (model.supportedRoles as readonly string[]).includes(role);
}

function roleEligible(model: ModelOption, role: "conductor" | "worker"): boolean {
  return (model.supportedRoles as readonly string[]).includes(role);
}

function reviewedPolicyIsValid(
  policy: ReviewedAutoRecommendation | null,
  policyVersion: string,
  role: "conductor" | "worker",
  connectionId: string,
): policy is ReviewedAutoRecommendation {
  try {
    if (!policy || policy.policyVersion !== policyVersion || policy.role !== role
      || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(policy.reasonCode)
      || !["low", "balanced", "premium", "unknown"].includes(policy.costBand)
      || !Array.isArray(policy.orderedExactModelIds)
      || policy.orderedExactModelIds.length === 0
      || policy.orderedExactModelIds.length > 1_024
      || new Set(policy.orderedExactModelIds).size !== policy.orderedExactModelIds.length) return false;
    return policy.orderedExactModelIds.every((modelId) => parseConductorAssignment({
      role: "conductor",
      mode: "pinned",
      connectionId,
      modelId,
      assignmentRevision: "reviewed-policy-validation-r1",
    }).kind === "valid");
  } catch {
    return false;
  }
}

type DriverRecommendationResult =
  | Readonly<{ kind: "absent" }>
  | Readonly<{ kind: "candidate"; value: ReviewedAutoRecommendation }>
  | Readonly<{ kind: "invalid" }>;

function driverRecommendation(
  driver: ModelConnectionDriver,
  policyVersion: string,
  role: "conductor" | "worker",
): DriverRecommendationResult {
  try {
    const value: unknown = driver.recommendation(policyVersion, role);
    if (value === null) return Object.freeze({ kind: "absent" });
    if (typeof value !== "object") return Object.freeze({ kind: "invalid" });
    return Object.freeze({ kind: "candidate", value: value as ReviewedAutoRecommendation });
  } catch {
    return Object.freeze({ kind: "invalid" });
  }
}

function driverModelAuthor(
  driver: ModelConnectionDriver,
  modelId: string,
): Readonly<{ kind: "ready"; value: string | null }> | Readonly<{ kind: "invalid" }> {
  try {
    const value = driver.modelAuthor(modelId);
    return typeof value === "string" || value === null
      ? Object.freeze({ kind: "ready", value })
      : Object.freeze({ kind: "invalid" });
  } catch {
    return Object.freeze({ kind: "invalid" });
  }
}

type SelectedModel = Readonly<{
  model: ModelOption | null;
  modelId: string;
  catalogRevision: string | null;
  catalogSource: "authenticated" | "provider-managed" | "manual" | "legacy-pinned-bridge";
  selection: "auto" | "pinned";
  policyVersion: string | null;
  reason:
    | "PINNED_MODEL"
    | "REVIEWED_RECOMMENDATION"
    | "VERIFIED_PROVIDER_DEFAULT"
    | "RETAINED_ASSIGNMENT_MODEL"
    | "RETAINED_CONVERSATION_MODEL";
}>;

function selectNewModel(
  role: "conductor" | "worker",
  assignment: ConductorAssignment | WorkerAssignment,
  connection: RouteConnectionAuthority,
  catalog: CatalogSnapshot | null,
  manualModel: ModelOption | null,
  registry: ModelConnectionDriverRegistry,
  now: string,
  legacyBridge = false,
): SelectedModel | RouteResolutionCode {
  if (assignment.connectionId !== connection.summary.id) return "CONNECTION_OR_DRIVER_MISMATCH";
  if (!(connection.summary.supportedRoles as readonly string[]).includes(role)) return "ROLE_INCOMPATIBLE";
  const driver = registry.get(connection.summary.driverId);
  if (!driver) return "CONNECTION_OR_DRIVER_MISMATCH";

  if (assignment.mode === "auto") {
    const checked = checkedCatalog(catalog, connection, registry, now);
    if (typeof checked === "string") return catalog === null ? "AUTO_UNAVAILABLE" : checked;
    if (role === "worker" && "lastResolvedModelId" in assignment
      && assignment.lastResolvedModelId !== undefined) {
      const retained = checked.models.find((item) => item.modelId === assignment.lastResolvedModelId);
      if (retained && autoEligible(retained, "worker")) {
        return Object.freeze({
          model: retained,
          modelId: retained.modelId,
          catalogRevision: checked.catalogRevision,
          catalogSource: retained.catalogSource as "authenticated" | "provider-managed",
          selection: "auto",
          policyVersion: assignment.policyVersion,
          reason: "RETAINED_ASSIGNMENT_MODEL",
        });
      }
    }
    const recommendation = driverRecommendation(driver, assignment.policyVersion, role);
    if (recommendation.kind === "invalid") return "AUTO_POLICY_UNAVAILABLE";
    if (recommendation.kind === "candidate") {
      const policy = recommendation.value;
      if (!reviewedPolicyIsValid(policy, assignment.policyVersion, role, connection.summary.id)) {
        return "AUTO_POLICY_UNAVAILABLE";
      }
      for (const modelId of policy.orderedExactModelIds) {
        const model = checked.models.find((item) => item.modelId === modelId);
        if (model && autoEligible(model, role) && model.driverRecommendationEligible) {
          return Object.freeze({
            model,
            modelId: model.modelId,
            catalogRevision: checked.catalogRevision,
            catalogSource: model.catalogSource as "authenticated" | "provider-managed",
            selection: "auto",
            policyVersion: assignment.policyVersion,
            reason: "REVIEWED_RECOMMENDATION",
          });
        }
      }
    }
    if (driver.providerDefaultSemantics === "verified-exact") {
      const model = checked.models.find((item) => item.providerDefault && autoEligible(item, role));
      if (model) {
        return Object.freeze({
          model,
          modelId: model.modelId,
          catalogRevision: checked.catalogRevision,
          catalogSource: model.catalogSource as "authenticated" | "provider-managed",
          selection: "auto",
          policyVersion: assignment.policyVersion,
          reason: "VERIFIED_PROVIDER_DEFAULT",
        });
      }
    }
    return "AUTO_UNAVAILABLE";
  }

  if (legacyBridge) {
    if (catalog !== null || manualModel !== null) return "GRANT_MISMATCH";
    return Object.freeze({
      model: null,
      modelId: assignment.modelId,
      catalogRevision: null,
      catalogSource: "legacy-pinned-bridge",
      selection: "pinned",
      policyVersion: null,
      reason: "PINNED_MODEL",
    });
  }
  if (catalog !== null) {
    const checked = checkedCatalog(catalog, connection, registry, now);
    if (typeof checked === "string") return checked;
    const model = checked.models.find((item) => item.modelId === assignment.modelId);
    if (!model) return "MODEL_REMOVED";
    if (!roleEligible(model, role)) return "ROLE_INCOMPATIBLE";
    return Object.freeze({
      model,
      modelId: model.modelId,
      catalogRevision: checked.catalogRevision,
      catalogSource: model.catalogSource as "authenticated" | "provider-managed",
      selection: "pinned",
      policyVersion: null,
      reason: "PINNED_MODEL",
    });
  }
  const parsedManual = manualModel === null ? null : parseModelOption(manualModel);
  if (parsedManual?.kind !== "valid" || parsedManual.value.catalogSource !== "manual"
    || parsedManual.value.connectionId !== connection.summary.id
    || parsedManual.value.modelId !== assignment.modelId
    || !roleEligible(parsedManual.value, role)) return "MODEL_REMOVED";
  return Object.freeze({
    model: parsedManual.value,
    modelId: parsedManual.value.modelId,
    catalogRevision: null,
    catalogSource: "manual",
    selection: "pinned",
    policyVersion: null,
    reason: "PINNED_MODEL",
  });
}

function routeCommon(
  input: {
    projectAuthorityId: ProjectAuthorityId;
    connection: RouteConnectionAuthority;
    linkGrant: LinkMetadataGrant;
    selected: SelectedModel;
    authoritySource: RouteAuthoritySource;
    routeInstanceId: string;
    resolvedAt: string;
    modelAuthor: string | null;
  },
) {
  return {
    routeInstanceId: input.routeInstanceId,
    projectAuthorityId: input.projectAuthorityId,
    connectionId: input.connection.summary.id,
    driverId: input.connection.summary.driverId,
    accessProvider: input.connection.summary.accessProvider,
    accountSafeLabel: input.connection.summary.accountSafeLabel,
    accountLabelProvenance: input.connection.summary.accountLabelProvenance,
    modelAuthor: input.modelAuthor,
    modelId: input.selected.modelId,
    billingRoute: input.connection.billingRoute,
    billingRevision: input.connection.billingRevision,
    authoritySource: input.authoritySource,
    linkGrantRevision: input.linkGrant.grantRevision,
    authenticationRevision: input.connection.summary.authenticationRevision,
    catalogRevision: input.selected.catalogRevision,
    catalogSource: input.selected.catalogSource,
    capabilityRevision: input.connection.capabilityRevision,
    gatewayRouting: input.connection.gatewayRouting,
    routingPolicyRevision: input.connection.routingPolicyRevision,
    selection: input.selected.selection,
    policyVersion: input.selected.policyVersion,
    resolvedAt: input.resolvedAt,
  } as const;
}

function buildConductorRoute(
  input: ResolveConductorRouteInput,
  selected: SelectedModel,
  authoritySource: Readonly<{ kind: "assignment"; assignmentRevision: string }>,
): ConductorResolvedRoute | null {
  const runtime = input.connection.runtime;
  const driver = input.registry.get(input.connection.summary.driverId);
  if (!driver) return null;
  const modelAuthor = driverModelAuthor(driver, selected.modelId);
  if (modelAuthor.kind === "invalid") return null;
  const common = routeCommon({ ...input, selected, authoritySource, modelAuthor: modelAuthor.value });
  const unsigned = {
    ...common,
    role: "conductor" as const,
    conductorGrantRevision: input.conductorGrant.grantRevision,
    runtimeRevision: runtime?.runtimeRevision ?? null,
    executableRevision: runtime?.executableRevision ?? null,
    runtimeId: runtime?.runtimeId ?? null,
    routeAuthorityDigest: "0".repeat(64),
  };
  const candidate = { ...unsigned, routeAuthorityDigest: calculateRouteAuthorityDigest(unsigned) };
  const parsed = parseResolvedRoute(candidate);
  return parsed.kind === "valid" && parsed.value.role === "conductor" ? parsed.value : null;
}

function buildWorkerRoute(
  input: ResolveWorkerRouteInput,
  selected: SelectedModel,
): WorkerResolvedRoute | null {
  const runtime = input.connection.runtime;
  if (runtime === null) return null;
  const driver = input.registry.get(input.connection.summary.driverId);
  if (!driver) return null;
  const modelAuthor = driverModelAuthor(driver, selected.modelId);
  if (modelAuthor.kind === "invalid") return null;
  const common = routeCommon({
    ...input,
    selected,
    authoritySource: input.authoritySource,
    modelAuthor: modelAuthor.value,
  });
  const unsigned = {
    ...common,
    role: "worker" as const,
    conductorGrantRevision: null,
    runtimeRevision: runtime.runtimeRevision,
    executableRevision: runtime.executableRevision,
    runtimeId: runtime.runtimeId,
    routeAuthorityDigest: "0".repeat(64),
  };
  const candidate = { ...unsigned, routeAuthorityDigest: calculateRouteAuthorityDigest(unsigned) };
  const parsed = parseResolvedRoute(candidate);
  return parsed.kind === "valid" && parsed.value.role === "worker" ? parsed.value : null;
}

function grantMatchesAssignment(
  grant: ConductorGrant,
  assignment: ConductorAssignment,
  projectAuthorityId: ProjectAuthorityId,
  connection: RouteConnectionAuthority,
): boolean {
  if (grant.projectAuthorityId !== projectAuthorityId
    || grant.connectionId !== connection.summary.id
    || grant.authenticationRevision !== connection.summary.authenticationRevision
    || grant.billingKind !== connection.billingRoute.kind
    || grant.billingRevision !== connection.billingRevision
    || grant.routingPolicyRevision !== connection.routingPolicyRevision) return false;
  return assignment.mode === "auto"
    ? grant.modelAuthorization.mode === "auto"
      && grant.modelAuthorization.policyVersion === assignment.policyVersion
    : grant.modelAuthorization.mode === "pinned"
      && grant.modelAuthorization.modelId === assignment.modelId;
}

function retainedSelection(
  binding: ConversationRouteBinding,
  connection: RouteConnectionAuthority,
  catalog: CatalogSnapshot | null,
  manualModel: ModelOption | null,
  registry: ModelConnectionDriverRegistry,
  now: string,
): SelectedModel | RouteResolutionCode {
  const route = binding.resolvedRoute;
  if (connection.summary.authenticationRevision !== route.authenticationRevision) return "AUTHENTICATION_CHANGED";
  if (connection.summary.id !== route.connectionId
    || connection.summary.driverId !== route.driverId
    || connection.summary.accessProvider !== route.accessProvider) return "CONNECTION_OR_DRIVER_MISMATCH";
  if (connection.summary.accountSafeLabel !== route.accountSafeLabel
    || connection.summary.accountLabelProvenance !== route.accountLabelProvenance
    || connection.billingRevision !== route.billingRevision
    || connection.capabilityRevision !== route.capabilityRevision
    || connection.routingPolicyRevision !== route.routingPolicyRevision
    || !same(connection.billingRoute, route.billingRoute)
    || !same(connection.gatewayRouting, route.gatewayRouting)) return "ROUTE_AUTHORITY_CHANGED";
  if ((connection.runtime?.runtimeId ?? null) !== route.runtimeId
    || (connection.runtime?.runtimeRevision ?? null) !== route.runtimeRevision
    || (connection.runtime?.executableRevision ?? null) !== route.executableRevision) return "RUNTIME_MISMATCH";

  if (route.catalogRevision !== null) {
    const checked = checkedCatalog(catalog, connection, registry, now);
    if (typeof checked === "string") return checked;
    const model = checked.models.find((item) => item.modelId === route.modelId);
    if (!model) return "MODEL_REMOVED";
    if (!roleEligible(model, "conductor") || (route.selection === "auto" && !autoEligible(model, "conductor"))) {
      return "ROLE_INCOMPATIBLE";
    }
    return Object.freeze({
      model,
      modelId: model.modelId,
      catalogRevision: checked.catalogRevision,
      catalogSource: model.catalogSource as "authenticated" | "provider-managed",
      selection: route.selection,
      policyVersion: route.policyVersion,
      reason: "RETAINED_CONVERSATION_MODEL",
    });
  }
  if (catalog !== null || route.selection !== "pinned"
    || (route.catalogSource !== "manual" && route.catalogSource !== "legacy-pinned-bridge")) {
    return "ROUTE_AUTHORITY_CHANGED";
  }
  if (route.catalogSource === "manual") {
    const parsedManual = manualModel === null ? null : parseModelOption(manualModel);
    if (parsedManual?.kind !== "valid" || parsedManual.value.catalogSource !== "manual"
      || parsedManual.value.connectionId !== route.connectionId
      || parsedManual.value.modelId !== route.modelId
      || !roleEligible(parsedManual.value, "conductor")) return "MODEL_REMOVED";
    return Object.freeze({
      model: parsedManual.value,
      modelId: route.modelId,
      catalogRevision: null,
      catalogSource: "manual",
      selection: "pinned",
      policyVersion: null,
      reason: "RETAINED_CONVERSATION_MODEL",
    });
  }
  if (manualModel !== null) return "ROUTE_AUTHORITY_CHANGED";
  return Object.freeze({
    model: null,
    modelId: route.modelId,
    catalogRevision: null,
    catalogSource: route.catalogSource,
    selection: "pinned",
    policyVersion: null,
    reason: "RETAINED_CONVERSATION_MODEL",
  });
}

export function resolveConductorRoute(input: ResolveConductorRouteInput): ConductorRouteResolution {
  if (parseProjectAuthorityId(input.projectAuthorityId).kind !== "valid") return NEEDS("INVALID_AUTHORITY");
  const connection = checkedConnection(input.connection, input.registry);
  if (typeof connection === "string") return NEEDS(connection);
  if (!(input.connection.summary.supportedRoles as readonly string[]).includes("conductor")) return NEEDS("ROLE_INCOMPATIBLE");
  const linkFailure = checkedLink(input.linkGrant, input.connection);
  if (linkFailure) return NEEDS(linkFailure);
  if (input.catalog !== null && (input.linkGrant.authorizationBasis !== "explicit"
    || !input.linkGrant.metadataScope.includes("models.list"))) return NEEDS("GRANT_MISMATCH");
  if (parseConductorGrant(input.conductorGrant).kind !== "valid") return NEEDS("GRANT_MISMATCH");

  let selected: SelectedModel | RouteResolutionCode;
  let authoritySource: Readonly<{ kind: "assignment"; assignmentRevision: string }>;
  if (input.selection.kind === "bound") {
    const binding = input.selection.binding;
    if (!verifyConversationRouteBinding(binding)) return NEEDS("BINDING_INVALID");
    if (binding.projectAuthorityId !== input.projectAuthorityId
      || binding.conversationId !== input.conversationId) return NEEDS("BINDING_SCOPE_MISMATCH");
    const route = binding.resolvedRoute;
    const expectedBasis = route.catalogSource === "legacy-pinned-bridge"
      ? "legacy-pinned-bridge"
      : "explicit";
    if (input.linkGrant.grantRevision !== route.linkGrantRevision
      || input.conductorGrant.grantRevision !== route.conductorGrantRevision
      || input.linkGrant.authorizationBasis !== expectedBasis
      || input.conductorGrant.authorizationBasis !== expectedBasis
      || !grantMatchesAssignment(input.conductorGrant, route.selection === "auto"
        ? {
            role: "conductor",
            mode: "auto",
            connectionId: route.connectionId,
            policyVersion: route.policyVersion ?? "",
            assignmentRevision: route.authoritySource.assignmentRevision,
          }
        : {
            role: "conductor",
            mode: "pinned",
            connectionId: route.connectionId,
            modelId: route.modelId,
            assignmentRevision: route.authoritySource.assignmentRevision,
          }, input.projectAuthorityId, input.connection)) return NEEDS("GRANT_MISMATCH");
    selected = retainedSelection(
      binding,
      input.connection,
      input.catalog,
      input.manualModel,
      input.registry,
      input.resolvedAt,
    );
    authoritySource = route.authoritySource;
  } else {
    const parsedAssignment = parseConductorAssignment(input.selection.assignment);
    if (parsedAssignment.kind !== "valid") return NEEDS("INVALID_AUTHORITY");
    if (!grantMatchesAssignment(
      input.conductorGrant,
      parsedAssignment.value,
      input.projectAuthorityId,
      input.connection,
    )) return NEEDS("GRANT_MISMATCH");
    const legacyBridge = input.linkGrant.authorizationBasis === "legacy-pinned-bridge"
      || input.conductorGrant.authorizationBasis === "legacy-pinned-bridge";
    if (legacyBridge && (input.linkGrant.authorizationBasis !== "legacy-pinned-bridge"
      || input.conductorGrant.authorizationBasis !== "legacy-pinned-bridge"
      || parsedAssignment.value.mode !== "pinned")) return NEEDS("GRANT_MISMATCH");
    selected = selectNewModel(
      "conductor",
      parsedAssignment.value,
      input.connection,
      input.catalog,
      input.manualModel,
      input.registry,
      input.resolvedAt,
      legacyBridge,
    );
    authoritySource = Object.freeze({
      kind: "assignment",
      assignmentRevision: parsedAssignment.value.assignmentRevision,
    });
  }
  if (typeof selected === "string") return NEEDS(selected);
  const route = buildConductorRoute(input, selected, authoritySource);
  if (!route) return NEEDS("INVALID_AUTHORITY");
  if (selected.reason === "RETAINED_ASSIGNMENT_MODEL") return NEEDS("INVALID_AUTHORITY");
  try {
    const binding = createConversationRouteBinding(route, input.conversationId, input.boundAt);
    return Object.freeze({ kind: "resolved", reason: selected.reason, route, binding });
  } catch {
    return NEEDS("INVALID_AUTHORITY");
  }
}

export function resolveWorkerRoute(input: ResolveWorkerRouteInput): WorkerRouteResolution {
  if (parseProjectAuthorityId(input.projectAuthorityId).kind !== "valid") return NEEDS("INVALID_AUTHORITY");
  const assignment = parseWorkerAssignment(input.assignment);
  const authoritySource = parseRouteAuthoritySource(input.authoritySource);
  if (assignment.kind !== "valid" || authoritySource.kind !== "valid") return NEEDS("INVALID_AUTHORITY");
  if (authoritySource.value.kind !== "assignment") return NEEDS("INVALID_AUTHORITY");
  if (input.connection.runtime === null) return NEEDS("RAW_API_WORKER_UNSUPPORTED");
  const connection = checkedConnection(input.connection, input.registry);
  if (typeof connection === "string") return NEEDS(connection);
  if (!(input.connection.summary.supportedRoles as readonly string[]).includes("worker")) return NEEDS("ROLE_INCOMPATIBLE");
  if (assignment.value.runtimeId !== input.connection.runtime.runtimeId) return NEEDS("RUNTIME_MISMATCH");
  if (authoritySource.value.assignmentRevision !== assignment.value.assignmentRevision) {
    return NEEDS("ROUTE_AUTHORITY_CHANGED");
  }
  const linkFailure = checkedLink(input.linkGrant, input.connection);
  if (linkFailure) return NEEDS(linkFailure);
  if (input.linkGrant.authorizationBasis !== "explicit") return NEEDS("GRANT_MISMATCH");
  if (input.catalog !== null && !input.linkGrant.metadataScope.includes("models.list")) {
    return NEEDS("GRANT_MISMATCH");
  }
  const selected = selectNewModel(
    "worker",
    assignment.value,
    input.connection,
    input.catalog,
    input.manualModel,
    input.registry,
    input.resolvedAt,
  );
  if (typeof selected === "string") return NEEDS(selected);
  const route = buildWorkerRoute(input, selected);
  return route
    ? Object.freeze({ kind: "resolved", reason: selected.reason as Exclude<SelectedModel["reason"], "RETAINED_CONVERSATION_MODEL">, route })
    : NEEDS("INVALID_AUTHORITY");
}
