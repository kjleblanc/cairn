import { createHash, randomUUID } from "node:crypto";
import { lstatSync, realpathSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { platform } from "node:os";
import { types as nodeTypes } from "node:util";
import type { ProjectAuthorityId } from "../../shared/model-connections.js";

const PROJECT_ROOT_DIGEST_DOMAIN = "cairn-project-root/v1";
const FILESYSTEM_IDENTITY_DIGEST_DOMAIN = "cairn-project-filesystem-identity/v1";
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const MAX_PROJECT_AUTHORITIES = 4_096;

/** The only project identity data that may be persisted. In particular, this
 * record deliberately has no path or project-local conversation identifier. */
export type ProjectAuthorityEntry = Readonly<{
  projectAuthorityId: ProjectAuthorityId;
  canonicalRootDigest: string;
  filesystemIdentityDigest: string;
  authorityRevision: string;
}>;

/** Main-only evidence about the root selected by the owner. `canonicalRoot`
 * must never be copied into the profile store or a renderer projection. */
export type ProjectSnapshot = Readonly<{
  canonicalRoot: string;
  deviceId: bigint;
  fileId: bigint;
  canonicalRootDigest: string;
  filesystemIdentityDigest: string;
}>;

export type ProjectAuthorityEntriesParseResult =
  | Readonly<{ kind: "valid"; value: readonly ProjectAuthorityEntry[] }>
  | Readonly<{ kind: "malformed" }>;

export type ProjectAuthorityResolution =
  | Readonly<{
      kind: "authorized";
      projectAuthorityId: ProjectAuthorityId;
      authorityRevision: string;
    }>
  | Readonly<{ kind: "registration-required" }>
  | Readonly<{
      kind: "reauthorization-required";
      reason: "moved" | "replaced" | "ambiguous";
    }>;

export type ProjectRootAuthorization = ProjectAuthorityResolution
  | Readonly<{ kind: "reauthorization-required"; reason: "unavailable" }>;

export type ProjectRootObservation = Readonly<{
  canonicalRoot: string;
  deviceId: bigint;
  fileId: bigint;
}>;

export type ProjectAuthorityInspectionDeps = Readonly<{
  observe?: (root: string) => ProjectRootObservation | null;
}>;

export type ProjectAuthorityIdFactory = Readonly<{
  projectAuthorityId?: () => string;
  authorityRevision?: () => string;
}>;

function sha256(domain: string, value: string): string {
  return createHash("sha256").update(domain).update("\0").update(platform()).update("\0").update(value).digest("hex");
}

function normalizedCanonicalRoot(value: string): string {
  // Windows APIs may return either separator spelling for the same path.
  // POSIX treats backslash as an ordinary filename byte, so rewriting it there
  // would collapse two genuinely distinct canonical roots.
  return platform() === "win32" ? value.replace(/\\/g, "/") : value;
}

export function canonicalRootDigest(canonicalRoot: string): string {
  return sha256(PROJECT_ROOT_DIGEST_DOMAIN, normalizedCanonicalRoot(canonicalRoot));
}

export function filesystemIdentityDigest(deviceId: bigint, fileId: bigint): string {
  return sha256(
    FILESYSTEM_IDENTITY_DIGEST_DOMAIN,
    `dev:${deviceId.toString(10)}\0ino:${fileId.toString(10)}`,
  );
}

function validObservation(value: ProjectRootObservation | null): value is ProjectRootObservation {
  return value !== null
    && typeof value.canonicalRoot === "string"
    && value.canonicalRoot.length > 0
    && isAbsolute(value.canonicalRoot)
    && typeof value.deviceId === "bigint"
    && typeof value.fileId === "bigint"
    && value.deviceId > 0n
    && value.fileId > 0n;
}

function sameObservation(left: ProjectRootObservation, right: ProjectRootObservation): boolean {
  return normalizedCanonicalRoot(left.canonicalRoot) === normalizedCanonicalRoot(right.canonicalRoot)
    && left.deviceId === right.deviceId
    && left.fileId === right.fileId;
}

function observeProjectRoot(root: string): ProjectRootObservation | null {
  try {
    if (typeof root !== "string" || root.length === 0 || root.includes("\0")) return null;
    const lexicalRoot = resolve(root);
    const beforeRoot = realpathSync.native(lexicalRoot);
    const before = lstatSync(beforeRoot, { bigint: true });
    const afterRoot = realpathSync.native(lexicalRoot);
    const after = lstatSync(afterRoot, { bigint: true });
    if (!before.isDirectory() || !after.isDirectory()
      || normalizedCanonicalRoot(beforeRoot) !== normalizedCanonicalRoot(afterRoot)
      || before.dev !== after.dev || before.ino !== after.ino || before.dev <= 0n || before.ino <= 0n) return null;
    return Object.freeze({ canonicalRoot: afterRoot, deviceId: after.dev, fileId: after.ino });
  } catch {
    return null;
  }
}

/** Resolve and identity-probe twice. A rename, replacement, alias change, or
 * unavailable stable inode during inspection therefore fails closed. */
export function inspectProjectRoot(
  root: string,
  deps: ProjectAuthorityInspectionDeps = {},
): ProjectSnapshot | null {
  const observe = deps.observe ?? observeProjectRoot;
  try {
    const before = observe(root);
    const after = observe(root);
    if (!validObservation(before) || !validObservation(after) || !sameObservation(before, after)) return null;
    return Object.freeze({
      canonicalRoot: after.canonicalRoot,
      deviceId: after.deviceId,
      fileId: after.fileId,
      canonicalRootDigest: canonicalRootDigest(after.canonicalRoot),
      filesystemIdentityDigest: filesystemIdentityDigest(after.deviceId, after.fileId),
    });
  } catch {
    return null;
  }
}

function exactDataRecord(value: unknown, keys: readonly string[]): Readonly<Record<string, unknown>> | null {
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

function denseDataArray(value: unknown): readonly unknown[] | null {
  try {
    if (!Array.isArray(value) || nodeTypes.isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (!lengthDescriptor || !("value" in lengthDescriptor)
      || typeof lengthDescriptor.value !== "number" || lengthDescriptor.value > MAX_PROJECT_AUTHORITIES) return null;
    const length = lengthDescriptor.value;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.length !== length + 1 || !ownKeys.includes("length")) return null;
    const output: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return null;
      output.push(descriptor.value);
    }
    return output;
  } catch {
    return null;
  }
}

function parseEntry(value: unknown): ProjectAuthorityEntry | null {
  const record = exactDataRecord(value, [
    "projectAuthorityId", "canonicalRootDigest", "filesystemIdentityDigest", "authorityRevision",
  ]);
  if (!record || typeof record.projectAuthorityId !== "string" || !UUID_V4.test(record.projectAuthorityId)
    || typeof record.canonicalRootDigest !== "string" || !SHA256.test(record.canonicalRootDigest)
    || typeof record.filesystemIdentityDigest !== "string" || !SHA256.test(record.filesystemIdentityDigest)
    || typeof record.authorityRevision !== "string" || !UUID_V4.test(record.authorityRevision)) return null;
  return Object.freeze({
    projectAuthorityId: record.projectAuthorityId as ProjectAuthorityId,
    canonicalRootDigest: record.canonicalRootDigest,
    filesystemIdentityDigest: record.filesystemIdentityDigest,
    authorityRevision: record.authorityRevision,
  });
}

/** Exact, detached parsing rejects extra/accessor fields, sparse arrays, and
 * duplicate registry identities. Store-level absence/version handling stays
 * with the model-connections store. */
export function parseProjectAuthorityEntries(value: unknown): ProjectAuthorityEntriesParseResult {
  const source = denseDataArray(value);
  if (!source) return Object.freeze({ kind: "malformed" });
  const entries: ProjectAuthorityEntry[] = [];
  const authorityIds = new Set<string>();
  const authorityRevisions = new Set<string>();
  const rootDigests = new Set<string>();
  const identityDigests = new Set<string>();
  for (const item of source) {
    const entry = parseEntry(item);
    if (!entry || authorityIds.has(entry.projectAuthorityId) || authorityRevisions.has(entry.authorityRevision)
      || rootDigests.has(entry.canonicalRootDigest)
      || identityDigests.has(entry.filesystemIdentityDigest)) {
      return Object.freeze({ kind: "malformed" });
    }
    authorityIds.add(entry.projectAuthorityId);
    authorityRevisions.add(entry.authorityRevision);
    rootDigests.add(entry.canonicalRootDigest);
    identityDigests.add(entry.filesystemIdentityDigest);
    entries.push(entry);
  }
  return Object.freeze({ kind: "valid", value: Object.freeze(entries) });
}

export function resolveProjectAuthority(
  entries: readonly ProjectAuthorityEntry[],
  snapshot: ProjectSnapshot,
): ProjectAuthorityResolution {
  const rootMatches = entries.filter((entry) => entry.canonicalRootDigest === snapshot.canonicalRootDigest);
  const identityMatches = entries.filter((entry) => entry.filesystemIdentityDigest === snapshot.filesystemIdentityDigest);
  if (rootMatches.length > 1 || identityMatches.length > 1) {
    return Object.freeze({ kind: "reauthorization-required", reason: "ambiguous" });
  }
  const rootMatch = rootMatches[0];
  const identityMatch = identityMatches[0];
  if (rootMatch && identityMatch) {
    if (rootMatch.projectAuthorityId !== identityMatch.projectAuthorityId) {
      return Object.freeze({ kind: "reauthorization-required", reason: "ambiguous" });
    }
    return Object.freeze({
      kind: "authorized",
      projectAuthorityId: rootMatch.projectAuthorityId,
      authorityRevision: rootMatch.authorityRevision,
    });
  }
  if (rootMatch) return Object.freeze({ kind: "reauthorization-required", reason: "replaced" });
  if (identityMatch) return Object.freeze({ kind: "reauthorization-required", reason: "moved" });
  return Object.freeze({ kind: "registration-required" });
}

function newUuid(factory: (() => string) | undefined): string {
  const value = factory?.() ?? randomUUID();
  if (!UUID_V4.test(value)) throw new Error("PROJECT_AUTHORITY_ID_GENERATION_FAILED");
  return value;
}

/** Register only a genuinely new stable root. Existing and reauthorization
 * cases stay explicit so a replacement can never silently inherit grants. */
export function registerProjectAuthority(
  entries: readonly ProjectAuthorityEntry[],
  snapshot: ProjectSnapshot,
  ids: ProjectAuthorityIdFactory = {},
): Readonly<{ entry: ProjectAuthorityEntry; entries: readonly ProjectAuthorityEntry[] }> {
  if (resolveProjectAuthority(entries, snapshot).kind !== "registration-required") {
    throw new Error("PROJECT_AUTHORITY_REGISTRATION_REFUSED");
  }
  if (entries.length >= MAX_PROJECT_AUTHORITIES) throw new Error("PROJECT_AUTHORITY_REGISTRY_FULL");
  const projectAuthorityId = newUuid(ids.projectAuthorityId) as ProjectAuthorityId;
  const authorityRevision = newUuid(ids.authorityRevision);
  if (entries.some((entry) => entry.projectAuthorityId === projectAuthorityId
    || entry.authorityRevision === authorityRevision)) {
    throw new Error("PROJECT_AUTHORITY_ID_COLLISION");
  }
  const entry = Object.freeze({
    projectAuthorityId,
    canonicalRootDigest: snapshot.canonicalRootDigest,
    filesystemIdentityDigest: snapshot.filesystemIdentityDigest,
    authorityRevision,
  });
  return Object.freeze({ entry, entries: Object.freeze([...entries, entry]) });
}

export function authorizeProjectRoot(
  root: string,
  entries: readonly ProjectAuthorityEntry[],
  deps: ProjectAuthorityInspectionDeps = {},
): ProjectRootAuthorization {
  const snapshot = inspectProjectRoot(root, deps);
  return snapshot === null
    ? Object.freeze({ kind: "reauthorization-required", reason: "unavailable" })
    : resolveProjectAuthority(entries, snapshot);
}
