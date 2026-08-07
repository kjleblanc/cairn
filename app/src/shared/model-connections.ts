/**
 * Secret-free model-connection vocabulary shared across main, preload, and
 * renderer code. Persisted connection authority and launch configuration stay
 * in main-only modules; these records are safe projections and immutable route
 * descriptions, never credentials or executable instructions.
 */

export const MODEL_CONNECTIONS_SCHEMA_VERSION = "cairn-model-connections/v1" as const;

declare const projectAuthorityIdBrand: unique symbol;

/** A syntactically valid candidate for a random, main-owned project identity.
 * Task 3's registry resolver supplies authority by matching it to one
 * canonical project root; this brand alone is not registry evidence. */
export type ProjectAuthorityId = string & {
  readonly [projectAuthorityIdBrand]: "ProjectAuthorityId";
};

export type CairnRole = "conductor" | "worker";
export type AuthKind = "api-key" | "oauth" | "provider-managed" | "none";
export type BillingKind = "pay-as-you-go" | "subscription" | "local" | "unknown";
export type AccountLabelProvenance = "provider-verified" | "owner-label" | "unavailable";

export type ConnectionStatus =
  | "checking"
  | "linked-not-authorized"
  | "ready"
  | "offline"
  | "reconnect-required"
  | "runtime-missing"
  | "policy-blocked"
  | "catalog-stale"
  | "model-removed"
  | "role-incompatible"
  | "unavailable"
  | "unsupported"
  | "recovery-required";

type AccountIdentityProjection =
  | Readonly<{
      accountSafeLabel: null;
      accountLabelProvenance: "unavailable";
    }>
  | Readonly<{
      accountSafeLabel: string;
      accountLabelProvenance: "provider-verified" | "owner-label";
    }>;

type ConnectionRoleProjection =
  | Readonly<{
      supportedRoles: readonly [] | readonly ["conductor"];
      runtimeId: string | null;
    }>
  | Readonly<{
      supportedRoles:
        | readonly ["worker"]
        | readonly ["conductor", "worker"]
        | readonly ["worker", "conductor"];
      runtimeId: string;
    }>;

interface ConnectionSummaryBase {
  readonly id: string;
  readonly driverId: string;
  readonly accessProvider: string;
  readonly displayName: string;
  readonly authKind: AuthKind;
  readonly billingKind: BillingKind;
  readonly status: ConnectionStatus;
  /** Revision of Cairn's saved link. It does not prove an external account or
   * subscription remained unchanged. */
  readonly authenticationRevision: string;
}

export type ConnectionSummary = Readonly<ConnectionSummaryBase>
  & AccountIdentityProjection
  & ConnectionRoleProjection;

export type ModelLifecycle = "stable" | "preview" | "deprecated" | "unknown";
export type CatalogSource = "authenticated" | "provider-managed" | "manual";
export type AvailabilityEvidence =
  | "account-confirmed"
  | "provider-catalog"
  | "configured-manually";
export type ModelModality = "text" | "image" | "audio" | "video" | "file";

export interface NormalizedModelPrice {
  readonly inputPerMillion: string | null;
  readonly outputPerMillion: string | null;
  readonly currency: string | null;
}

export interface ModelOption {
  readonly connectionId: string;
  readonly modelId: string;
  readonly displayName: string;
  readonly supportedRoles: readonly CairnRole[];
  readonly reasoningOptions: readonly string[];
  readonly modalities: readonly ModelModality[];
  readonly lifecycle: ModelLifecycle;
  readonly catalogSource: CatalogSource;
  readonly availabilityEvidence: AvailabilityEvidence;
  readonly price: NormalizedModelPrice;
  readonly driverRecommendationEligible: boolean;
  readonly providerDefault: boolean;
  readonly fetchedAt: string;
}

export interface CatalogSnapshot {
  readonly connectionId: string;
  readonly authenticationRevision: string;
  readonly catalogRevision: string;
  readonly fetchedAt: string;
  /** Display projection only. A caller must recompute freshness from fetchedAt
   * with the current driver policy and clock before authorizing metadata or a
   * model call; persisted `fresh` is never authority by itself. */
  readonly freshness: "fresh" | "stale" | "display-only";
  readonly models: readonly ModelOption[];
}

export type ExecutableRevision = `sha256:${string}`;

export interface ProviderManagedRuntimeLink {
  readonly runtimeId: string;
  readonly runtimeKind: string;
  readonly executableRevision: ExecutableRevision;
  readonly accountState: "provider-verified" | "account-uninspectable";
  readonly runtimeRevision: string;
}

export type ConductorAssignment =
  | Readonly<{
      role: "conductor";
      mode: "auto";
      connectionId: string;
      policyVersion: string;
      assignmentRevision: string;
    }>
  | Readonly<{
      role: "conductor";
      mode: "pinned";
      connectionId: string;
      modelId: string;
      assignmentRevision: string;
    }>;

export type WorkerAssignment =
  | Readonly<{
      role: "worker";
      mode: "auto";
      connectionId: string;
      runtimeId: string;
      lastResolvedModelId?: string;
      policyVersion: string;
      assignmentRevision: string;
    }>
  | Readonly<{
      role: "worker";
      mode: "pinned";
      connectionId: string;
      runtimeId: string;
      modelId: string;
      assignmentRevision: string;
    }>;

export type ModelAuthorization =
  | Readonly<{ mode: "auto"; policyVersion: string }>
  | Readonly<{ mode: "pinned"; modelId: string }>;

export interface OneTaskWorkerSelection {
  readonly selectionId: string;
  readonly selectionRevision: string;
  readonly projectAuthorityId: ProjectAuthorityId;
  readonly connectionId: string;
  readonly runtimeId: string;
  readonly model: ModelAuthorization;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export type RouteAuthoritySource =
  | Readonly<{ kind: "assignment"; assignmentRevision: string }>
  | Readonly<{ kind: "one-task-selection"; selectionRevision: string }>;

export interface LinkMetadataGrant {
  readonly grantRevision: string;
  readonly connectionId: string;
  readonly authenticationRevision: string;
  readonly authorizationBasis: "explicit" | "legacy-pinned-bridge";
  readonly metadataScope: readonly string[];
  readonly metadataCostCertainty: "documented-no-charge" | "may-charge" | "unknown";
  readonly routingPolicyRevision: string;
  readonly grantedAt: string;
}

export interface ConductorGrant {
  readonly grantRevision: string;
  readonly projectAuthorityId: ProjectAuthorityId;
  readonly connectionId: string;
  readonly authenticationRevision: string;
  readonly authorizationBasis: "explicit" | "legacy-pinned-bridge";
  readonly authorizedDataScope: string;
  readonly billingKind: BillingKind;
  readonly billingRevision: string;
  readonly routingPolicyRevision: string;
  readonly modelAuthorization: ModelAuthorization;
  readonly grantedAt: string;
}

export interface GatewayRoutingPolicy {
  readonly mode: "not-a-gateway" | "gateway-managed" | "pinned-serving-provider";
  readonly allowedServingProviders: readonly string[];
  readonly allowServingProviderFallback: boolean;
  readonly allowByok: boolean;
  readonly allowSharedCapacityAfterByok: boolean;
  readonly region: string | null;
}

export type BillingSource =
  | "provider-account"
  | "subscription-quota"
  | "byok"
  | "byok-with-provider-fallback"
  | "local"
  | "unknown";
export type BillingCertainty = "verified" | "provider-reported" | "unknown";

/** `label` is presentation only. Authority comes from the structured kind,
 * source, certainty, revisions, and grants—not from this sentence. */
type BillingRouteLabel = Readonly<{ label: string }>;

export type BillingRoute = BillingRouteLabel & (
  | Readonly<{ kind: "unknown"; source: "unknown"; certainty: "unknown" }>
  | Readonly<{
      kind: "local";
      source: "local";
      certainty: "verified" | "provider-reported";
    }>
  | Readonly<{
      kind: "subscription";
      source: "subscription-quota";
      certainty: "verified" | "provider-reported";
    }>
  | Readonly<{
      kind: "pay-as-you-go";
      source: "provider-account" | "byok" | "byok-with-provider-fallback";
      certainty: "verified" | "provider-reported";
    }>
);

interface ResolvedRouteCommonBase {
  readonly routeInstanceId: string;
  readonly projectAuthorityId: ProjectAuthorityId;
  readonly connectionId: string;
  readonly driverId: string;
  readonly accessProvider: string;
  readonly modelAuthor: string | null;
  readonly modelId: string;
  readonly billingRoute: BillingRoute;
  readonly billingRevision: string;
  readonly linkGrantRevision: string;
  readonly authenticationRevision: string;
  readonly capabilityRevision: string;
  readonly gatewayRouting: GatewayRoutingPolicy;
  readonly routingPolicyRevision: string;
  readonly routeAuthorityDigest: string;
  readonly resolvedAt: string;
}

export type ResolvedCatalogSource = CatalogSource | "legacy-pinned-bridge";

type ResolvedSelectionAuthority =
  | Readonly<{
      selection: "auto";
      policyVersion: string;
      catalogRevision: string;
      catalogSource: "authenticated" | "provider-managed";
    }>
  | Readonly<{
      selection: "pinned";
      policyVersion: null;
      catalogRevision: string;
      catalogSource: "authenticated" | "provider-managed";
    }>
  | Readonly<{
      selection: "pinned";
      policyVersion: null;
      catalogRevision: null;
      catalogSource: "manual";
    }>;

type LegacyPinnedSelectionAuthority = Readonly<{
  selection: "pinned";
  policyVersion: null;
  catalogRevision: null;
  catalogSource: "legacy-pinned-bridge";
}>;

type ApiConductorRuntimeAuthority = Readonly<{
  runtimeRevision: null;
  executableRevision: null;
  runtimeId: null;
}>;

type ProviderManagedConductorRuntimeAuthority = Readonly<{
  runtimeRevision: string;
  executableRevision: ExecutableRevision;
  runtimeId: string;
}>;

type ConductorSelectionAndRuntimeAuthority =
  | (ResolvedSelectionAuthority
    & (ApiConductorRuntimeAuthority | ProviderManagedConductorRuntimeAuthority))
  | (LegacyPinnedSelectionAuthority & ApiConductorRuntimeAuthority);

/** Role is explicit even though the design sketch allowed it to be inferred.
 * The discriminator prevents ambiguous Cairn-grant/runtime combinations. */
export type ConductorResolvedRoute = Readonly<ResolvedRouteCommonBase>
  & AccountIdentityProjection
  & ConductorSelectionAndRuntimeAuthority
  & Readonly<{
      role: "conductor";
      authoritySource: Readonly<{ kind: "assignment"; assignmentRevision: string }>;
      conductorGrantRevision: string;
    }>;

export type WorkerResolvedRoute = Readonly<ResolvedRouteCommonBase>
  & AccountIdentityProjection
  & ResolvedSelectionAuthority
  & Readonly<{
      role: "worker";
      authoritySource: RouteAuthoritySource;
      conductorGrantRevision: null;
      runtimeRevision: string;
      executableRevision: ExecutableRevision;
      runtimeId: string;
    }>;

export type ResolvedRoute = ConductorResolvedRoute | WorkerResolvedRoute;

export interface ConversationRouteBinding {
  readonly projectAuthorityId: ProjectAuthorityId;
  readonly conversationId: string;
  readonly resolvedRoute: ConductorResolvedRoute;
  /** Authenticates the complete bound snapshot. This is distinct from the
   * route's stable authority-comparison digest. */
  readonly resolvedRouteDigest: string;
  readonly boundAt: string;
}

/** This immutable preview authority deliberately contains no reusable
 * selection ID. Task 8 owns the serialized one-time redemption registry. */
export interface PendingWorkerRouteAuthority {
  readonly previewId: string;
  readonly projectAuthorityId: ProjectAuthorityId;
  readonly resolvedRoute: WorkerResolvedRoute;
  readonly disclosureDigest: string;
  readonly expiresAt: string;
}
