import type {
  CairnRole,
  ModelOption,
} from "../../../shared/model-connections.js";

/** The only identity a catalog driver receives. Project roots, conversation
 * IDs, prompts, file names/content, grants, and credentials are deliberately
 * absent from this request. Driver implementations close over their own
 * main-only credential access instead of accepting it as data. */
export interface CatalogIdentity {
  readonly connectionId: string;
  readonly authenticationRevision: string;
}

export interface CatalogFreshnessPolicy {
  readonly staleAfterMs: number;
  readonly hardTtlMs: number;
}

/** Provider-specific raw responses never leave a driver. This is the bounded,
 * provider-neutral candidate it may hand to main for strict normalization.
 * The explicit literal prevents a router alias from being treated as an exact
 * model merely because it resembles an ordinary provider model ID. */
export type DriverModelCandidate = Omit<ModelOption, "connectionId" | "fetchedAt">
  & Readonly<{ exactModelAttribution: true }>;

export type DriverCatalogResult =
  | Readonly<{
      kind: "loaded";
      catalogSource: "authenticated" | "provider-managed";
      models: readonly DriverModelCandidate[];
    }>
  | Readonly<{
      kind: "failed";
      code:
        | "CATALOG_NETWORK_UNAVAILABLE"
        | "CATALOG_PROVIDER_UNAVAILABLE"
        | "CATALOG_AUTHENTICATION_REJECTED"
        | "CATALOG_RESPONSE_MALFORMED";
    }>;

export interface ReviewedAutoRecommendation {
  readonly policyVersion: string;
  readonly role: CairnRole;
  /** Order is reviewed policy, not provider/catalog/alphabetical order. */
  readonly orderedExactModelIds: readonly string[];
  readonly reasonCode: string;
  readonly costBand: "low" | "balanced" | "premium" | "unknown";
}

export interface ModelConnectionDriver {
  readonly driverId: string;
  readonly freshnessPolicy: CatalogFreshnessPolicy;
  readonly providerDefaultSemantics: "verified-exact" | "not-verified";

  /** Derive the access/billing provider from this exact main-owned connection,
   * rather than assuming one driver can represent only one provider/host. */
  accessProvider(identity: CatalogIdentity): string | null;
  fetchCatalog(identity: CatalogIdentity, signal?: AbortSignal): Promise<DriverCatalogResult>;
  recommendation(policyVersion: string, role: CairnRole): ReviewedAutoRecommendation | null;
  modelAuthor(modelId: string): string | null;
}
