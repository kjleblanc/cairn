import { createHash } from "node:crypto";
import { types as nodeTypes } from "node:util";
import type {
  CairnRole,
  CatalogSnapshot,
  ModelModality,
  ModelOption,
} from "../../shared/model-connections.js";
import {
  MODEL_CONNECTION_LIMITS,
  parseCatalogSnapshot,
  parseModelOption,
} from "./schema.js";
import type {
  CatalogFreshnessPolicy,
  CatalogIdentity,
  DriverModelCandidate,
  ModelConnectionDriver,
} from "./drivers/types.js";

export type CatalogNormalizationResult =
  | Readonly<{ kind: "ready"; snapshot: CatalogSnapshot }>
  | Readonly<{ kind: "malformed"; code: "MODEL_CATALOG_MALFORMED" }>;

export type CatalogRefreshResult =
  | Readonly<{ kind: "ready"; snapshot: CatalogSnapshot }>
  | Readonly<{ kind: "offline"; code: "MODEL_CATALOG_OFFLINE" }>
  | Readonly<{ kind: "reconnect-required"; code: "MODEL_CATALOG_AUTHENTICATION_REJECTED" }>
  | Readonly<{ kind: "unavailable"; code: "MODEL_CATALOG_UNAVAILABLE" }>;

const CANDIDATE_KEYS = [
  "modelId", "displayName", "supportedRoles", "reasoningOptions", "modalities",
  "lifecycle", "catalogSource", "availabilityEvidence", "price",
  "driverRecommendationEligible", "providerDefault", "exactModelAttribution",
] as const;
const ROLE_ORDER: readonly CairnRole[] = ["conductor", "worker"];
const MODALITY_ORDER: readonly ModelModality[] = ["text", "image", "audio", "video", "file"];

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function detachedCandidate(value: unknown): Record<(typeof CANDIDATE_KEYS)[number], unknown> | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)
      || nodeTypes.isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.length !== CANDIDATE_KEYS.length
      || ownKeys.some((key) => typeof key !== "string" || !CANDIDATE_KEYS.includes(key as never))) return null;
    const output = Object.create(null) as Record<(typeof CANDIDATE_KEYS)[number], unknown>;
    for (const key of CANDIDATE_KEYS) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return null;
      output[key] = descriptor.value;
    }
    return output;
  } catch {
    return null;
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Readonly<Record<string, unknown>>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function canonicalModel(model: ModelOption): ModelOption | null {
  const candidate = {
    ...model,
    supportedRoles: [...model.supportedRoles].sort(
      (left, right) => ROLE_ORDER.indexOf(left) - ROLE_ORDER.indexOf(right),
    ),
    reasoningOptions: [...model.reasoningOptions].sort(compareCodeUnits),
    modalities: [...model.modalities].sort(
      (left, right) => MODALITY_ORDER.indexOf(left) - MODALITY_ORDER.indexOf(right),
    ),
  };
  const parsed = parseModelOption(candidate);
  return parsed.kind === "valid" ? parsed.value : null;
}

function revisionFor(
  identity: CatalogIdentity,
  source: "authenticated" | "provider-managed",
  models: readonly ModelOption[],
): string {
  const stableModels = models.map(({ fetchedAt: _fetchedAt, ...model }) => model);
  const bytes = stableJson({
    domain: "cairn-model-catalog-revision/v1",
    connectionId: identity.connectionId,
    authenticationRevision: identity.authenticationRevision,
    catalogSource: source,
    models: stableModels,
  });
  return `sha256:${createHash("sha256").update(bytes, "utf8").digest("hex")}`;
}

export function normalizeCatalog(input: Readonly<{
  identity: CatalogIdentity;
  catalogSource: "authenticated" | "provider-managed";
  candidates: readonly DriverModelCandidate[];
  fetchedAt: string;
}>): CatalogNormalizationResult {
  try {
    if (!Array.isArray(input.candidates)
      || input.candidates.length > MODEL_CONNECTION_LIMITS.catalogModels) {
      return Object.freeze({ kind: "malformed", code: "MODEL_CATALOG_MALFORMED" });
    }
    const models: ModelOption[] = [];
    for (const raw of input.candidates) {
      const detached = detachedCandidate(raw);
      if (!detached || detached.catalogSource !== input.catalogSource
        || detached.exactModelAttribution !== true) {
        return Object.freeze({ kind: "malformed", code: "MODEL_CATALOG_MALFORMED" });
      }
      const { exactModelAttribution: _exactModelAttribution, ...modelFields } = detached;
      const parsed = parseModelOption({
        connectionId: input.identity.connectionId,
        ...modelFields,
        fetchedAt: input.fetchedAt,
      });
      if (parsed.kind !== "valid") {
        return Object.freeze({ kind: "malformed", code: "MODEL_CATALOG_MALFORMED" });
      }
      const canonical = canonicalModel(parsed.value);
      if (!canonical) return Object.freeze({ kind: "malformed", code: "MODEL_CATALOG_MALFORMED" });
      models.push(canonical);
    }
    models.sort((left, right) => compareCodeUnits(left.modelId, right.modelId));
    const snapshot = {
      connectionId: input.identity.connectionId,
      authenticationRevision: input.identity.authenticationRevision,
      catalogRevision: revisionFor(input.identity, input.catalogSource, models),
      fetchedAt: input.fetchedAt,
      freshness: "fresh" as const,
      models,
    };
    const parsed = parseCatalogSnapshot(snapshot);
    return parsed.kind === "valid"
      ? Object.freeze({ kind: "ready", snapshot: parsed.value })
      : Object.freeze({ kind: "malformed", code: "MODEL_CATALOG_MALFORMED" });
  } catch {
    return Object.freeze({ kind: "malformed", code: "MODEL_CATALOG_MALFORMED" });
  }
}

/** Rebuild the normalized stable projection instead of trusting a persisted
 * digest. Empty catalogs are tried against both allowed sources because the
 * shared snapshot shape intentionally does not duplicate a top-level source. */
export function verifyCatalogRevision(snapshot: CatalogSnapshot): boolean {
  const parsed = parseCatalogSnapshot(snapshot);
  if (parsed.kind !== "valid") return false;
  const sources = parsed.value.models.length === 0
    ? (["authenticated", "provider-managed"] as const)
    : ([parsed.value.models[0]?.catalogSource] as const);
  if (sources.some((source) => source !== "authenticated" && source !== "provider-managed")) return false;
  if (parsed.value.models.some((model) => model.catalogSource !== sources[0])) return false;
  const candidates = parsed.value.models.map(({ connectionId: _connectionId, fetchedAt: _fetchedAt, ...model }) => ({
    ...model,
    exactModelAttribution: true as const,
  }));
  return sources.some((source) => {
    if (source !== "authenticated" && source !== "provider-managed") return false;
    const normalized = normalizeCatalog({
      identity: {
        connectionId: parsed.value.connectionId,
        authenticationRevision: parsed.value.authenticationRevision,
      },
      catalogSource: source,
      candidates,
      fetchedAt: parsed.value.fetchedAt,
    });
    return normalized.kind === "ready"
      && normalized.snapshot.catalogRevision === parsed.value.catalogRevision;
  });
}

function validFreshnessPolicy(policy: CatalogFreshnessPolicy): boolean {
  return Number.isSafeInteger(policy.staleAfterMs)
    && Number.isSafeInteger(policy.hardTtlMs)
    && policy.staleAfterMs > 0
    && policy.hardTtlMs >= policy.staleAfterMs;
}

/** Persisted freshness is presentation only. Every lookup projects it again
 * from the current driver's explicit policy and an injected main clock. */
export function projectCatalogFreshness(
  snapshot: CatalogSnapshot,
  policy: CatalogFreshnessPolicy,
  now: string,
): CatalogSnapshot {
  const parsed = parseCatalogSnapshot(snapshot);
  const current = Date.parse(now);
  const fetched = Date.parse(snapshot.fetchedAt);
  let freshness: CatalogSnapshot["freshness"] = "display-only";
  if (parsed.kind === "valid" && validFreshnessPolicy(policy)
    && Number.isFinite(current) && new Date(current).toISOString() === now
    && Number.isFinite(fetched)) {
    const age = current - fetched;
    freshness = age < 0 || age > policy.hardTtlMs
      ? "display-only"
      : age > policy.staleAfterMs
        ? "stale"
        : "fresh";
  }
  const projected = { ...snapshot, freshness };
  const checked = parseCatalogSnapshot(projected);
  return checked.kind === "valid" ? checked.value : Object.freeze(projected);
}

export async function refreshCatalog(
  driver: ModelConnectionDriver,
  identity: CatalogIdentity,
  dependencies: Readonly<{ now: () => string; signal?: AbortSignal }>,
): Promise<CatalogRefreshResult> {
  let result: Awaited<ReturnType<ModelConnectionDriver["fetchCatalog"]>>;
  try {
    result = await driver.fetchCatalog(Object.freeze({
      connectionId: identity.connectionId,
      authenticationRevision: identity.authenticationRevision,
    }), dependencies.signal);
  } catch {
    return Object.freeze({ kind: "offline", code: "MODEL_CATALOG_OFFLINE" });
  }
  try {
    if (result.kind === "failed") {
      if (result.code === "CATALOG_NETWORK_UNAVAILABLE") {
        return Object.freeze({ kind: "offline", code: "MODEL_CATALOG_OFFLINE" });
      }
      if (result.code === "CATALOG_AUTHENTICATION_REJECTED") {
        return Object.freeze({
          kind: "reconnect-required",
          code: "MODEL_CATALOG_AUTHENTICATION_REJECTED",
        });
      }
      return Object.freeze({ kind: "unavailable", code: "MODEL_CATALOG_UNAVAILABLE" });
    }
    const normalized = normalizeCatalog({
      identity,
      catalogSource: result.catalogSource,
      candidates: result.models,
      fetchedAt: dependencies.now(),
    });
    return normalized.kind === "ready"
      ? normalized
      : Object.freeze({ kind: "unavailable", code: "MODEL_CATALOG_UNAVAILABLE" });
  } catch {
    return Object.freeze({ kind: "unavailable", code: "MODEL_CATALOG_UNAVAILABLE" });
  }
}
