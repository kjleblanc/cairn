import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
} from "node:fs";
import { TextDecoder } from "node:util";
import type {
  CatalogSnapshot,
  ConversationRouteBinding,
  ProjectAuthorityId,
} from "../../shared/model-connections.js";
import { atomicWriteText } from "../atomicwrite.js";
import {
  projectCatalogFreshness,
  verifyCatalogRevision,
} from "./catalog.js";
import type { CatalogFreshnessPolicy, CatalogIdentity } from "./drivers/types.js";
import { parseCatalogSnapshot, parseConversationRouteBinding } from "./schema.js";
import { verifyConversationRouteBinding } from "./resolve.js";

export const MODEL_CATALOG_CACHE_VERSION = "cairn-model-catalogs/v1" as const;
const MAX_CACHE_BYTES = 8 * 1024 * 1024;
const MAX_CATALOGS = 64;
const MAX_BINDINGS = 4_096;

interface ModelCatalogStateV1 {
  readonly version: typeof MODEL_CATALOG_CACHE_VERSION;
  readonly cacheRevision: string;
  readonly integrityDigest: string;
  readonly catalogs: readonly CatalogSnapshot[];
  readonly bindings: readonly ConversationRouteBinding[];
}

type ModelCatalogStatePayloadV1 = Omit<ModelCatalogStateV1, "integrityDigest">;

export type CatalogCacheLookup =
  | Readonly<{ kind: "hit"; snapshot: CatalogSnapshot }>
  | Readonly<{ kind: "miss" }>
  | Readonly<{ kind: "invalid"; code: "MODEL_CATALOG_CACHE_INVALID" }>;

export type ConversationBindingLookup =
  | Readonly<{ kind: "hit"; binding: ConversationRouteBinding }>
  | Readonly<{ kind: "miss" }>
  | Readonly<{ kind: "invalid"; code: "MODEL_CATALOG_CACHE_INVALID" }>;

export type CatalogCacheWriteResult =
  | Readonly<{ kind: "written"; cacheRevision: string }>
  | Readonly<{ kind: "invalid"; code: "MODEL_CATALOG_CACHE_INVALID" }>
  | Readonly<{ kind: "write-failed"; code: "MODEL_CATALOG_CACHE_WRITE_FAILED" }>;

export interface ModelCatalogCache {
  lookupCatalog(identity: CatalogIdentity, policy: CatalogFreshnessPolicy): CatalogCacheLookup;
  /** The caller must re-read main's current connection identity after an
   * asynchronous refresh. A completion from an earlier authentication
   * revision cannot replace the current account's cache. */
  putCatalog(snapshot: CatalogSnapshot, currentIdentity: CatalogIdentity): CatalogCacheWriteResult;
  lookupBinding(projectAuthorityId: ProjectAuthorityId, conversationId: string): ConversationBindingLookup;
  putBinding(binding: ConversationRouteBinding): CatalogCacheWriteResult;
}

export interface ModelCatalogCacheDependencies {
  readonly now: () => string;
  readonly newRevision?: () => string;
  readonly exists?: (path: string) => boolean;
  readonly readText?: (path: string) => string;
  readonly writeText?: (path: string, text: string) => void;
}

const INVALID = Object.freeze({ kind: "invalid", code: "MODEL_CATALOG_CACHE_INVALID" } as const);
const MISS = Object.freeze({ kind: "miss" } as const);
const SHA256_DIGEST = /^sha256:[0-9a-f]{64}$/;

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Readonly<Record<string, unknown>>;
    return `{${Object.keys(record).sort(compareCodeUnits)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function integrityDigestFor(state: ModelCatalogStatePayloadV1): string {
  return `sha256:${createHash("sha256")
    .update(canonicalJson({ domain: "cairn-model-catalog-cache-integrity/v1", state }), "utf8")
    .digest("hex")}`;
}

function sameFileIdentity(
  left: { dev: bigint; ino: bigint },
  right: { dev: bigint; ino: bigint },
): boolean {
  return left.dev === right.dev && left.ino > 0n && left.ino === right.ino;
}

function readBoundedCacheText(path: string): string {
  let descriptor: number | null = null;
  try {
    const beforePath = lstatSync(path, { bigint: true });
    if (!beforePath.isFile() || beforePath.isSymbolicLink() || beforePath.nlink !== 1n
      || beforePath.size > BigInt(MAX_CACHE_BYTES)) throw new Error("MODEL_CATALOG_CACHE_UNSAFE");
    descriptor = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const before = fstatSync(descriptor, { bigint: true });
    if (!before.isFile() || before.nlink !== 1n || !sameFileIdentity(beforePath, before)
      || before.size > BigInt(MAX_CACHE_BYTES)) throw new Error("MODEL_CATALOG_CACHE_UNSAFE");
    const bytes = Buffer.alloc(Number(before.size));
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(descriptor, bytes, offset, bytes.length - offset, offset);
      if (count <= 0) throw new Error("MODEL_CATALOG_CACHE_UNSAFE");
      offset += count;
    }
    const after = fstatSync(descriptor, { bigint: true });
    const afterPath = lstatSync(path, { bigint: true });
    if (!afterPath.isFile() || afterPath.isSymbolicLink() || afterPath.nlink !== 1n
      || !sameFileIdentity(before, after) || !sameFileIdentity(after, afterPath)
      || before.size !== after.size) throw new Error("MODEL_CATALOG_CACHE_UNSAFE");
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
}

function exactRecord(value: unknown, keys: readonly string[]): Readonly<Record<string, unknown>> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    if (Object.getPrototypeOf(value) !== Object.prototype) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.length !== keys.length
      || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))) return null;
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return null;
      output[key] = descriptor.value;
    }
    return output;
  } catch {
    return null;
  }
}

function normalizedStatePayload(value: unknown): ModelCatalogStatePayloadV1 | null {
  const record = exactRecord(value, ["version", "cacheRevision", "catalogs", "bindings"]);
  if (!record || record.version !== MODEL_CATALOG_CACHE_VERSION
    || typeof record.cacheRevision !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(record.cacheRevision)
    || !Array.isArray(record.catalogs) || record.catalogs.length > MAX_CATALOGS
    || !Array.isArray(record.bindings) || record.bindings.length > MAX_BINDINGS) return null;
  const catalogs: CatalogSnapshot[] = [];
  const catalogKeys = new Set<string>();
  const catalogConnections = new Set<string>();
  for (const raw of record.catalogs) {
    const parsed = parseCatalogSnapshot(raw);
    if (parsed.kind !== "valid" || !verifyCatalogRevision(parsed.value)) return null;
    const key = `${parsed.value.connectionId}\u0000${parsed.value.authenticationRevision}`;
    if (catalogKeys.has(key) || catalogConnections.has(parsed.value.connectionId)) return null;
    catalogKeys.add(key);
    catalogConnections.add(parsed.value.connectionId);
    catalogs.push(parsed.value);
  }
  const bindings: ConversationRouteBinding[] = [];
  const bindingKeys = new Set<string>();
  for (const raw of record.bindings) {
    const parsed = parseConversationRouteBinding(raw);
    if (parsed.kind !== "valid" || !verifyConversationRouteBinding(parsed.value)) return null;
    const key = `${parsed.value.projectAuthorityId}\u0000${parsed.value.conversationId}`;
    if (bindingKeys.has(key)) return null;
    bindingKeys.add(key);
    bindings.push(parsed.value);
  }
  catalogs.sort((left, right) => {
    const connection = compareCodeUnits(left.connectionId, right.connectionId);
    return connection || compareCodeUnits(left.authenticationRevision, right.authenticationRevision);
  });
  bindings.sort((left, right) => {
    const project = compareCodeUnits(left.projectAuthorityId, right.projectAuthorityId);
    return project || compareCodeUnits(left.conversationId, right.conversationId);
  });
  return Object.freeze({
    version: MODEL_CATALOG_CACHE_VERSION,
    cacheRevision: record.cacheRevision,
    catalogs: Object.freeze(catalogs),
    bindings: Object.freeze(bindings),
  });
}

function stateFrom(value: unknown): ModelCatalogStateV1 | null {
  const record = exactRecord(value, [
    "version", "cacheRevision", "integrityDigest", "catalogs", "bindings",
  ]);
  if (!record || typeof record.integrityDigest !== "string"
    || !SHA256_DIGEST.test(record.integrityDigest)) return null;
  const payload = normalizedStatePayload({
    version: record.version,
    cacheRevision: record.cacheRevision,
    catalogs: record.catalogs,
    bindings: record.bindings,
  });
  if (!payload || integrityDigestFor(payload) !== record.integrityDigest) return null;
  return Object.freeze({ ...payload, integrityDigest: record.integrityDigest });
}

function stateForWrite(value: unknown): ModelCatalogStateV1 | null {
  const payload = normalizedStatePayload(value);
  return payload === null
    ? null
    : Object.freeze({ ...payload, integrityDigest: integrityDigestFor(payload) });
}

function serialized(state: ModelCatalogStateV1): string {
  return `${JSON.stringify({
    version: state.version,
    cacheRevision: state.cacheRevision,
    integrityDigest: state.integrityDigest,
    catalogs: state.catalogs,
    bindings: state.bindings,
  })}\n`;
}

export function createModelCatalogCache(
  path: string,
  dependencies: ModelCatalogCacheDependencies,
): ModelCatalogCache {
  const exists = dependencies.exists ?? existsSync;
  const readText = dependencies.readText ?? readBoundedCacheText;
  const writeText = dependencies.writeText ?? atomicWriteText;
  const read = (): { kind: "absent" } | { kind: "ready"; state: ModelCatalogStateV1 } | typeof INVALID => {
    try {
      if (!exists(path)) return { kind: "absent" };
      const text = readText(path);
      if (Buffer.byteLength(text, "utf8") > MAX_CACHE_BYTES) return INVALID;
      const parsed = stateFrom(JSON.parse(text) as unknown);
      return parsed && serialized(parsed) === text ? { kind: "ready", state: parsed } : INVALID;
    } catch {
      return INVALID;
    }
  };
  const write = (
    catalogs: readonly CatalogSnapshot[],
    bindings: readonly ConversationRouteBinding[],
  ): CatalogCacheWriteResult => {
    let revision: string;
    try {
      revision = dependencies.newRevision?.() ?? randomUUID();
      const next = stateForWrite({
        version: MODEL_CATALOG_CACHE_VERSION,
        cacheRevision: revision,
        catalogs,
        bindings,
      });
      if (!next) return INVALID;
      const text = serialized(next);
      if (Buffer.byteLength(text, "utf8") > MAX_CACHE_BYTES) return INVALID;
      writeText(path, text);
      const readback = read();
      if (readback.kind !== "ready" || serialized(readback.state) !== text) {
        return Object.freeze({ kind: "write-failed", code: "MODEL_CATALOG_CACHE_WRITE_FAILED" });
      }
      return Object.freeze({ kind: "written", cacheRevision: revision });
    } catch {
      return Object.freeze({ kind: "write-failed", code: "MODEL_CATALOG_CACHE_WRITE_FAILED" });
    }
  };

  return Object.freeze({
    lookupCatalog(identity: CatalogIdentity, policy: CatalogFreshnessPolicy): CatalogCacheLookup {
      if (!Number.isSafeInteger(policy.staleAfterMs)
        || !Number.isSafeInteger(policy.hardTtlMs)
        || policy.staleAfterMs <= 0 || policy.hardTtlMs < policy.staleAfterMs) return INVALID;
      const loaded = read();
      if (loaded.kind === "invalid") return loaded;
      if (loaded.kind === "absent") return MISS;
      const snapshot = loaded.state.catalogs.find((item) => item.connectionId === identity.connectionId
        && item.authenticationRevision === identity.authenticationRevision);
      return snapshot
        ? Object.freeze({
            kind: "hit",
            snapshot: projectCatalogFreshness(snapshot, policy, dependencies.now()),
          })
        : MISS;
    },
    putCatalog(snapshot: CatalogSnapshot, currentIdentity: CatalogIdentity): CatalogCacheWriteResult {
      const parsed = parseCatalogSnapshot(snapshot);
      if (parsed.kind !== "valid" || !verifyCatalogRevision(parsed.value)) return INVALID;
      if (parsed.value.connectionId !== currentIdentity.connectionId
        || parsed.value.authenticationRevision !== currentIdentity.authenticationRevision) return INVALID;
      const loaded = read();
      if (loaded.kind === "invalid") return loaded;
      const previous = loaded.kind === "ready" ? loaded.state : null;
      // A new authentication revision for one connection evicts every old
      // catalog for that connection. Bindings remain as invalidation evidence;
      // the resolver pauses them on the auth mismatch instead of falling back.
      const catalogs = [
        ...(previous?.catalogs.filter((item) => item.connectionId !== parsed.value.connectionId) ?? []),
        parsed.value,
      ];
      return write(catalogs, previous?.bindings ?? []);
    },
    lookupBinding(projectAuthorityId: ProjectAuthorityId, conversationId: string): ConversationBindingLookup {
      const loaded = read();
      if (loaded.kind === "invalid") return loaded;
      if (loaded.kind === "absent") return MISS;
      const binding = loaded.state.bindings.find((item) => item.projectAuthorityId === projectAuthorityId
        && item.conversationId === conversationId);
      return binding ? Object.freeze({ kind: "hit", binding }) : MISS;
    },
    putBinding(binding: ConversationRouteBinding): CatalogCacheWriteResult {
      const parsed = parseConversationRouteBinding(binding);
      if (parsed.kind !== "valid" || !verifyConversationRouteBinding(parsed.value)) return INVALID;
      const loaded = read();
      if (loaded.kind === "invalid") return loaded;
      const previous = loaded.kind === "ready" ? loaded.state : null;
      const bindings = [
        ...(previous?.bindings.filter((item) => item.projectAuthorityId !== parsed.value.projectAuthorityId
          || item.conversationId !== parsed.value.conversationId) ?? []),
        parsed.value,
      ];
      return write(previous?.catalogs ?? [], bindings);
    },
  });
}
