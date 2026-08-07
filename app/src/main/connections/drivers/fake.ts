import type { CairnRole } from "../../../shared/model-connections.js";
import type {
  CatalogFreshnessPolicy,
  CatalogIdentity,
  DriverCatalogResult,
  DriverModelCandidate,
  ModelConnectionDriver,
  ReviewedAutoRecommendation,
} from "./types.js";

const MACHINE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._/:@+-]{0,255}$/;

export interface FakeCatalogDriverOptions {
  readonly driverId: string;
  readonly accessProvider: string;
  readonly models?: readonly DriverModelCandidate[];
  /** Deliberately unknown: fake tests may attach raw canaries. The driver
   * translates them to fixed results without leaking the object. */
  readonly result?: unknown;
  readonly catalogSource?: "authenticated" | "provider-managed";
  readonly autoPolicies: readonly ReviewedAutoRecommendation[];
  readonly providerDefaultSemantics: "verified-exact" | "not-verified";
  readonly freshnessPolicy?: CatalogFreshnessPolicy;
  readonly modelAuthors?: Readonly<Record<string, string | null>>;
  /** Simulates provider entries a real driver must keep inside its raw
   * response boundary rather than exposing as selectable options. */
  readonly hiddenModelIds?: readonly string[];
  readonly opaqueRouterAliases?: readonly string[];
}

export interface FakeCatalogDriver extends ModelConnectionDriver {
  readonly requests: readonly CatalogIdentity[];
}

function exactFailure(value: unknown): DriverCatalogResult | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const kind = Reflect.get(value, "kind");
  if (kind === "http-failure") {
    const status = Reflect.get(value, "status");
    if (!Number.isInteger(status) || Number(status) < 100 || Number(status) > 599) {
      return Object.freeze({ kind: "failed", code: "CATALOG_RESPONSE_MALFORMED" });
    }
    return Object.freeze({
      kind: "failed",
      code: status === 401 || status === 403
        ? "CATALOG_AUTHENTICATION_REJECTED"
        : "CATALOG_PROVIDER_UNAVAILABLE",
    });
  }
  if (kind !== "failed") return null;
  const code = Reflect.get(value, "code");
  if (code !== "CATALOG_NETWORK_UNAVAILABLE"
    && code !== "CATALOG_PROVIDER_UNAVAILABLE"
    && code !== "CATALOG_AUTHENTICATION_REJECTED"
    && code !== "CATALOG_RESPONSE_MALFORMED") {
    return Object.freeze({ kind: "failed", code: "CATALOG_RESPONSE_MALFORMED" });
  }
  return Object.freeze({ kind: "failed", code });
}

function checkedPolicies(
  policies: readonly ReviewedAutoRecommendation[],
): readonly ReviewedAutoRecommendation[] {
  const seen = new Set<string>();
  return Object.freeze(policies.map((policy) => {
    const key = `${policy.role}\u0000${policy.policyVersion}`;
    if ((policy.role !== "conductor" && policy.role !== "worker")
      || !MACHINE_TOKEN.test(policy.policyVersion)
      || !MACHINE_TOKEN.test(policy.reasonCode)
      || !["low", "balanced", "premium", "unknown"].includes(policy.costBand)
      || policy.orderedExactModelIds.length === 0
      || policy.orderedExactModelIds.length > 1_024
      || policy.orderedExactModelIds.some((modelId) => !MODEL_ID.test(modelId))
      || new Set(policy.orderedExactModelIds).size !== policy.orderedExactModelIds.length
      || seen.has(key)) throw new Error("FAKE_CATALOG_POLICY_INVALID");
    seen.add(key);
    return Object.freeze({
      ...policy,
      orderedExactModelIds: Object.freeze([...policy.orderedExactModelIds]),
    });
  }));
}

export function createFakeCatalogDriver(options: FakeCatalogDriverOptions): FakeCatalogDriver {
  const requests: CatalogIdentity[] = [];
  const policies = checkedPolicies(options.autoPolicies);
  const fixedResult = options.result === undefined ? null : exactFailure(options.result);
  const hidden = new Set(options.hiddenModelIds ?? []);
  const opaqueAliases = new Set(options.opaqueRouterAliases ?? []);
  const suppliedModels = [...(options.models ?? [])];
  const hasOpaqueAlias = suppliedModels.some((model) => opaqueAliases.has(model.modelId));
  const models = Object.freeze(suppliedModels.filter((model) => !hidden.has(model.modelId)));
  const source = options.catalogSource ?? "authenticated";
  const freshnessPolicy = Object.freeze(options.freshnessPolicy ?? {
    staleAfterMs: 60_000,
    hardTtlMs: 300_000,
  });
  const driver: FakeCatalogDriver = {
    driverId: options.driverId,
    freshnessPolicy,
    providerDefaultSemantics: options.providerDefaultSemantics,
    get requests() {
      return Object.freeze(requests.map((request) => Object.freeze({ ...request })));
    },
    accessProvider(): string {
      return options.accessProvider;
    },
    async fetchCatalog(identity: CatalogIdentity): Promise<DriverCatalogResult> {
      requests.push(Object.freeze({
        connectionId: identity.connectionId,
        authenticationRevision: identity.authenticationRevision,
      }));
      if (options.result !== undefined) {
        return fixedResult ?? Object.freeze({ kind: "failed", code: "CATALOG_RESPONSE_MALFORMED" });
      }
      if (hasOpaqueAlias) {
        return Object.freeze({ kind: "failed", code: "CATALOG_RESPONSE_MALFORMED" });
      }
      return Object.freeze({
        kind: "loaded",
        catalogSource: source,
        models,
      });
    },
    recommendation(policyVersion: string, role: CairnRole): ReviewedAutoRecommendation | null {
      return policies.find((policy) => policy.policyVersion === policyVersion && policy.role === role) ?? null;
    },
    modelAuthor(modelId: string): string | null {
      const author = options.modelAuthors?.[modelId];
      return typeof author === "string" || author === null ? author : null;
    },
  };
  return Object.freeze(driver);
}
