import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
} from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { types as nodeTypes } from "node:util";
import { MODEL_CONNECTIONS_SCHEMA_VERSION } from "../../shared/model-connections.js";
import type {
  ConductorAssignment,
  ConductorGrant,
  LinkMetadataGrant,
} from "../../shared/model-connections.js";
import { atomicWriteText } from "../atomicwrite.js";
import {
  MODEL_CONNECTION_LIMITS,
  parseConnectionBaseUrl,
  parseConductorAssignment,
  parseConductorGrant,
  parseLinkMetadataGrant,
  parseModelConnectionsSchemaVersion,
} from "./schema.js";
import {
  parseProjectAuthorityEntries,
  type ProjectAuthorityEntry,
} from "./project-authority.js";

export const MODEL_CONNECTIONS_STORE_FILE = "model-connections.json" as const;

export const MODEL_CONNECTIONS_STORE_LIMITS = Object.freeze({
  bytes: 2 * 1024 * 1024,
  connections: 32,
  linkGrants: 64,
  conductorGrants: 512,
  projectAuthorities: 256,
  inlineCiphertextBase64: 256 * 1024,
} as const);

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const MACHINE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const FORBIDDEN_TEXT = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/u;

export type LegacyConductorCredentialReference = Readonly<{
  kind: "legacy-conductor-file";
  file: "conductor.json";
  ciphertextSha256: string;
}>;

export type InlineEncryptedCredential = Readonly<{
  kind: "inline-encrypted";
  ciphertextB64: string;
  ciphertextSha256: string;
}>;

export type StoredConnectionCredential =
  | LegacyConductorCredentialReference
  | InlineEncryptedCredential;

export type CompatibleAuthenticationOrigin =
  | "legacy-unknown"
  | "pasted-api-key"
  | "openrouter-oauth";

/** Main-only connection metadata. The renderer-safe ConnectionSummary is a
 * derived projection: runtime status is deliberately not trusted from disk. */
export type StoredCompatibleConnection = Readonly<{
  kind: "openai-compatible";
  connectionId: string;
  driverId: "openai-compatible";
  baseUrl: string;
  authenticationOrigin: CompatibleAuthenticationOrigin;
  authenticationRevision: string;
  credential: StoredConnectionCredential;
  /** Exact scope bytes still present in conductor.json. Renewal changes the
   * grant/current scope below, never this credential-file evidence. */
  legacyAuthorizedDataScope: string | null;
  authorizedDataScope: string | null;
  billingRevision: string;
  capabilityRevision: string;
  routingPolicyRevision: string;
}>;

export type PinnedConductorAssignment = Extract<ConductorAssignment, { mode: "pinned" }>;

export type ModelConnectionsRecovery =
  | Readonly<{ kind: "none" }>
  | Readonly<{
      kind: "forget-pending";
      connectionId: string;
      credentialKind: StoredConnectionCredential["kind"];
    }>;

export interface ModelConnectionsStoreContent {
  readonly recovery: ModelConnectionsRecovery;
  readonly connections: readonly StoredCompatibleConnection[];
  readonly conductorAssignment: PinnedConductorAssignment | null;
  /** Reserved explicitly in v1; Task 3 has no authorized Builder connection. */
  readonly workerAssignment: null;
  readonly linkGrants: readonly LinkMetadataGrant[];
  readonly conductorGrants: readonly ConductorGrant[];
  readonly projectAuthorities: readonly ProjectAuthorityEntry[];
}

export interface ModelConnectionsStoreV1 extends ModelConnectionsStoreContent {
  readonly version: typeof MODEL_CONNECTIONS_SCHEMA_VERSION;
  readonly storeRevision: string;
}

export type ModelConnectionsStoreParseResult =
  | Readonly<{ kind: "valid"; value: ModelConnectionsStoreV1 }>
  | Readonly<{ kind: "malformed" }>;

export type ModelConnectionsStoreReadResult =
  | Readonly<{ kind: "absent" }>
  | Readonly<{ kind: "ready"; value: ModelConnectionsStoreV1 }>
  | Readonly<{ kind: "recovery-required"; code: "MODEL_CONNECTIONS_RECOVERY_REQUIRED" }>;

export type ModelConnectionsStoreMutationResult =
  | Readonly<{ kind: "written"; value: ModelConnectionsStoreV1 }>
  | Readonly<{ kind: "stale"; code: "MODEL_CONNECTIONS_STORE_STALE" }>
  | Readonly<{ kind: "busy"; code: "MODEL_CONNECTIONS_STORE_BUSY" }>
  | Readonly<{ kind: "invalid"; code: "MODEL_CONNECTIONS_STORE_INVALID" }>
  | Readonly<{ kind: "write-failed"; code: "MODEL_CONNECTIONS_STORE_WRITE_FAILED" }>
  | Readonly<{ kind: "recovery-required"; code: "MODEL_CONNECTIONS_RECOVERY_REQUIRED" }>;

export type ModelConnectionsStoreFailpoint =
  | "before-atomic-write"
  | "after-atomic-write"
  | "before-readback"
  | "after-readback";

export interface ModelConnectionsStoreDependencies {
  readonly exists?: (filePath: string) => boolean;
  readonly readBytes?: (filePath: string, maximumBytes: number) => Buffer;
  readonly atomicWrite?: (filePath: string, text: string) => void;
  readonly newRevision?: () => string;
  readonly failpoint?: (point: ModelConnectionsStoreFailpoint) => void;
}

export interface ModelConnectionsStore {
  read(): ModelConnectionsStoreReadResult;
  /** `null` means the caller expects no store yet. */
  write(
    expectedRevision: string | null,
    content: ModelConnectionsStoreContent,
  ): ModelConnectionsStoreMutationResult;
  mutate(
    expectedRevision: string,
    update: (current: ModelConnectionsStoreV1) => ModelConnectionsStoreContent,
  ): ModelConnectionsStoreMutationResult;
}

type DataRecord = Readonly<Record<string, unknown>>;

const MALFORMED = Object.freeze({ kind: "malformed" } as const);
const RECOVERY_REQUIRED = Object.freeze({
  kind: "recovery-required",
  code: "MODEL_CONNECTIONS_RECOVERY_REQUIRED",
} as const);

function exactDataRecord(value: unknown, keys: readonly string[]): DataRecord | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || nodeTypes.isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.length !== keys.length
      || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))) return null;
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
    if (!Array.isArray(value) || nodeTypes.isProxy(value)
      || Object.getPrototypeOf(value) !== Array.prototype) return null;
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

function revision(value: unknown): value is string {
  return typeof value === "string"
    && value.length <= MODEL_CONNECTION_LIMITS.machineId
    && MACHINE_TOKEN.test(value);
}

function dataScope(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= MODEL_CONNECTION_LIMITS.dataScope
    && value.trim() === value
    && value.normalize("NFC") === value
    && wellFormedUtf16(value)
    && !FORBIDDEN_TEXT.test(value);
}

function canonicalBase64(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0
    || value.length > MODEL_CONNECTIONS_STORE_LIMITS.inlineCiphertextBase64
    || value.length % 4 !== 0
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return false;
  try {
    return Buffer.from(value, "base64").toString("base64") === value;
  } catch {
    return false;
  }
}

function ciphertextDigest(ciphertextB64: string): string {
  return createHash("sha256").update(Buffer.from(ciphertextB64, "base64")).digest("hex");
}

function parseCredential(value: unknown): StoredConnectionCredential | null {
  const legacy = exactDataRecord(value, ["kind", "file", "ciphertextSha256"]);
  if (legacy?.kind === "legacy-conductor-file" && legacy.file === "conductor.json"
    && typeof legacy.ciphertextSha256 === "string" && SHA256.test(legacy.ciphertextSha256)) {
    return Object.freeze({
      kind: "legacy-conductor-file",
      file: "conductor.json",
      ciphertextSha256: legacy.ciphertextSha256,
    });
  }
  const inline = exactDataRecord(value, ["kind", "ciphertextB64", "ciphertextSha256"]);
  if (inline?.kind !== "inline-encrypted" || !canonicalBase64(inline.ciphertextB64)
    || typeof inline.ciphertextSha256 !== "string" || !SHA256.test(inline.ciphertextSha256)
    || ciphertextDigest(inline.ciphertextB64) !== inline.ciphertextSha256) return null;
  return Object.freeze({
    kind: "inline-encrypted",
    ciphertextB64: inline.ciphertextB64,
    ciphertextSha256: inline.ciphertextSha256,
  });
}

/** Shape a new OS-encrypted credential for the v1 store without ever
 * retaining the caller's mutable bytes. Migration deliberately does not use
 * this: historical credentials remain referenced from conductor.json. */
export function createInlineEncryptedCredential(
  ciphertext: Uint8Array,
): InlineEncryptedCredential | null {
  let copy: Buffer | null = null;
  try {
    if (ciphertext.byteLength === 0
      || Math.ceil(ciphertext.byteLength / 3) * 4
        > MODEL_CONNECTIONS_STORE_LIMITS.inlineCiphertextBase64) return null;
    copy = Buffer.from(ciphertext);
    const candidate = {
      kind: "inline-encrypted" as const,
      ciphertextB64: copy.toString("base64"),
      ciphertextSha256: createHash("sha256").update(copy).digest("hex"),
    };
    const parsed = parseCredential(candidate);
    return parsed?.kind === "inline-encrypted" ? parsed : null;
  } catch {
    return null;
  } finally {
    copy?.fill(0);
  }
}

/** Strictly re-parse and bound an inline credential before allocating its
 * decoded bytes for OS decryption. The caller owns and must zero the result. */
export function decodeInlineEncryptedCredential(value: unknown): Buffer | null {
  try {
    const parsed = parseCredential(value);
    if (parsed?.kind !== "inline-encrypted") return null;
    return Buffer.from(parsed.ciphertextB64, "base64");
  } catch {
    return null;
  }
}

function parseConnection(value: unknown): StoredCompatibleConnection | null {
  const record = exactDataRecord(value, [
    "kind", "connectionId", "driverId", "baseUrl", "authenticationOrigin",
    "authenticationRevision", "credential", "legacyAuthorizedDataScope", "authorizedDataScope", "billingRevision",
    "capabilityRevision", "routingPolicyRevision",
  ]);
  if (!record || record.kind !== "openai-compatible" || record.driverId !== "openai-compatible"
    || typeof record.connectionId !== "string" || !UUID_V4.test(record.connectionId)
    || !["legacy-unknown", "pasted-api-key", "openrouter-oauth"].includes(String(record.authenticationOrigin))
    || !revision(record.authenticationRevision) || !revision(record.billingRevision)
    || !revision(record.capabilityRevision) || !revision(record.routingPolicyRevision)
    || (record.legacyAuthorizedDataScope !== null && !dataScope(record.legacyAuthorizedDataScope))
    || (record.authorizedDataScope !== null && !dataScope(record.authorizedDataScope))) return null;
  const baseUrl = parseConnectionBaseUrl(record.baseUrl);
  const credential = parseCredential(record.credential);
  if (baseUrl.kind !== "valid" || !credential
    || (record.authenticationOrigin === "legacy-unknown" && credential.kind !== "legacy-conductor-file")
    || (credential.kind === "inline-encrypted" && record.legacyAuthorizedDataScope !== null)) return null;
  return Object.freeze({
    kind: "openai-compatible",
    connectionId: record.connectionId,
    driverId: "openai-compatible",
    baseUrl: baseUrl.value,
    authenticationOrigin: record.authenticationOrigin as CompatibleAuthenticationOrigin,
    authenticationRevision: record.authenticationRevision,
    credential,
    legacyAuthorizedDataScope: record.legacyAuthorizedDataScope as string | null,
    authorizedDataScope: record.authorizedDataScope as string | null,
    billingRevision: record.billingRevision,
    capabilityRevision: record.capabilityRevision,
    routingPolicyRevision: record.routingPolicyRevision,
  });
}

function parseRecovery(value: unknown): ModelConnectionsRecovery | null {
  const none = exactDataRecord(value, ["kind"]);
  if (none?.kind === "none") return Object.freeze({ kind: "none" });
  const pending = exactDataRecord(value, ["kind", "connectionId", "credentialKind"]);
  if (pending?.kind !== "forget-pending" || typeof pending.connectionId !== "string"
    || !UUID_V4.test(pending.connectionId)
    || (pending.credentialKind !== "legacy-conductor-file" && pending.credentialKind !== "inline-encrypted")) return null;
  return Object.freeze({
    kind: "forget-pending",
    connectionId: pending.connectionId,
    credentialKind: pending.credentialKind,
  });
}

function parseConnections(value: unknown): readonly StoredCompatibleConnection[] | null {
  const source = denseDataArray(value, MODEL_CONNECTIONS_STORE_LIMITS.connections);
  if (!source) return null;
  const output: StoredCompatibleConnection[] = [];
  const ids = new Set<string>();
  const authenticationRevisions = new Set<string>();
  const legacyFiles = new Set<string>();
  const ciphertextDigests = new Set<string>();
  for (const item of source) {
    const connection = parseConnection(item);
    if (!connection || ids.has(connection.connectionId)
      || authenticationRevisions.has(connection.authenticationRevision)
      || ciphertextDigests.has(connection.credential.ciphertextSha256)
      || (connection.credential.kind === "legacy-conductor-file"
        && legacyFiles.has(connection.credential.file))) return null;
    ids.add(connection.connectionId);
    authenticationRevisions.add(connection.authenticationRevision);
    ciphertextDigests.add(connection.credential.ciphertextSha256);
    if (connection.credential.kind === "legacy-conductor-file") legacyFiles.add(connection.credential.file);
    output.push(connection);
  }
  return Object.freeze(output);
}

function parsePinnedAssignment(value: unknown): PinnedConductorAssignment | null | false {
  if (value === null) return null;
  const parsed = parseConductorAssignment(value);
  return parsed.kind === "valid" && parsed.value.mode === "pinned" ? parsed.value : false;
}

function parseGrantArray<T>(
  value: unknown,
  cap: number,
  parser: (item: unknown) => { kind: "valid"; value: T } | { kind: "absent" | "malformed" },
): readonly T[] | null {
  const source = denseDataArray(value, cap);
  if (!source) return null;
  const output: T[] = [];
  for (const item of source) {
    const parsed = parser(item);
    if (parsed.kind !== "valid") return null;
    output.push(parsed.value);
  }
  return Object.freeze(output);
}

function crossValidate(store: ModelConnectionsStoreV1): boolean {
  const connections = new Map(store.connections.map((connection) => [connection.connectionId, connection]));
  const projects = new Set(store.projectAuthorities.map((entry) => entry.projectAuthorityId));
  const recovery = store.recovery;
  const recoveryTarget = recovery.kind === "forget-pending" ? recovery.connectionId : null;
  const mayReferenceMissing = (connectionId: string): boolean => connectionId === recoveryTarget;

  if (recovery.kind === "forget-pending") {
    const recoveringConnection = connections.get(recovery.connectionId);
    if (recoveringConnection && recoveringConnection.credential.kind !== recovery.credentialKind) return false;
    if (recovery.credentialKind === "inline-encrypted" && recoveringConnection) return false;
    const referenced = recoveringConnection !== undefined
      || store.conductorAssignment?.connectionId === recovery.connectionId
      || store.linkGrants.some((grant) => grant.connectionId === recovery.connectionId)
      || store.conductorGrants.some((grant) => grant.connectionId === recovery.connectionId);
    if (!referenced) return false;
  }

  const assignment = store.conductorAssignment;
  if (assignment && !connections.has(assignment.connectionId) && !mayReferenceMissing(assignment.connectionId)) return false;

  const linkRevisionSet = new Set<string>();
  const linkConnectionSet = new Set<string>();
  const linkByConnection = new Map<string, LinkMetadataGrant>();
  for (const grant of store.linkGrants) {
    if (linkRevisionSet.has(grant.grantRevision) || linkConnectionSet.has(grant.connectionId)) return false;
    linkRevisionSet.add(grant.grantRevision);
    linkConnectionSet.add(grant.connectionId);
    linkByConnection.set(grant.connectionId, grant);
    const connection = connections.get(grant.connectionId);
    if (!connection) {
      if (!mayReferenceMissing(grant.connectionId)) return false;
      continue;
    }
    if (grant.authenticationRevision !== connection.authenticationRevision
      || grant.routingPolicyRevision !== connection.routingPolicyRevision
      || (grant.authorizationBasis === "legacy-pinned-bridge"
        && (connection.authenticationOrigin !== "legacy-unknown"
          || connection.credential.kind !== "legacy-conductor-file"))) return false;
  }

  const grantRevisionSet = new Set<string>();
  const grantAuthoritySet = new Set<string>();
  for (const grant of store.conductorGrants) {
    const authorityKey = `${grant.projectAuthorityId}:${grant.connectionId}`;
    if (grantRevisionSet.has(grant.grantRevision) || grantAuthoritySet.has(authorityKey)
      || !projects.has(grant.projectAuthorityId)) return false;
    grantRevisionSet.add(grant.grantRevision);
    grantAuthoritySet.add(authorityKey);
    const connection = connections.get(grant.connectionId);
    if (!connection) {
      if (!mayReferenceMissing(grant.connectionId)) return false;
      continue;
    }
    const linkGrant = linkByConnection.get(grant.connectionId);
    if (!linkGrant || !assignment || assignment.connectionId !== grant.connectionId
      || grant.authenticationRevision !== connection.authenticationRevision
      || grant.billingRevision !== connection.billingRevision
      || grant.routingPolicyRevision !== connection.routingPolicyRevision
      || grant.modelAuthorization.mode !== "pinned"
      || grant.modelAuthorization.modelId !== assignment.modelId
      || connection.authorizedDataScope !== grant.authorizedDataScope
      || (grant.authorizationBasis === "legacy-pinned-bridge"
        && (connection.authenticationOrigin !== "legacy-unknown"
          || connection.credential.kind !== "legacy-conductor-file"
          || linkGrant.authorizationBasis !== "legacy-pinned-bridge"
          || connection.legacyAuthorizedDataScope === null
          || connection.legacyAuthorizedDataScope !== grant.authorizedDataScope))) return false;
  }
  return true;
}

/** Exact in-memory parser. File-level canonical-byte validation is deliberately
 * separate so callers can validate a proposed value before writing it. */
export function parseModelConnectionsStore(value: unknown): ModelConnectionsStoreParseResult {
  const record = exactDataRecord(value, [
    "version", "storeRevision", "recovery", "connections", "conductorAssignment",
    "workerAssignment", "linkGrants", "conductorGrants", "projectAuthorities",
  ]);
  if (!record || parseModelConnectionsSchemaVersion(record.version).kind !== "valid"
    || !revision(record.storeRevision) || record.workerAssignment !== null) return MALFORMED;
  const recovery = parseRecovery(record.recovery);
  const connections = parseConnections(record.connections);
  const assignment = parsePinnedAssignment(record.conductorAssignment);
  const linkGrants = parseGrantArray(
    record.linkGrants,
    MODEL_CONNECTIONS_STORE_LIMITS.linkGrants,
    parseLinkMetadataGrant,
  );
  const conductorGrants = parseGrantArray(
    record.conductorGrants,
    MODEL_CONNECTIONS_STORE_LIMITS.conductorGrants,
    parseConductorGrant,
  );
  const projectAuthorities = parseProjectAuthorityEntries(record.projectAuthorities);
  if (!recovery || !connections || assignment === false || !linkGrants || !conductorGrants
    || projectAuthorities.kind !== "valid"
    || projectAuthorities.value.length > MODEL_CONNECTIONS_STORE_LIMITS.projectAuthorities) return MALFORMED;
  const store = Object.freeze({
    version: MODEL_CONNECTIONS_SCHEMA_VERSION,
    storeRevision: record.storeRevision,
    recovery,
    connections,
    conductorAssignment: assignment,
    workerAssignment: null,
    linkGrants,
    conductorGrants,
    projectAuthorities: projectAuthorities.value,
  });
  return crossValidate(store) ? Object.freeze({ kind: "valid", value: store }) : MALFORMED;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new Error("MODEL_CONNECTIONS_STORE_INVALID");
    return encoded;
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
}

/** One canonical byte spelling, including its final newline. Strict reads
 * reject duplicate JSON keys, alternate whitespace/order, and ambiguous legacy
 * encodings because parse -> canonical serialize must reproduce exact bytes. */
export function serializeModelConnectionsStore(value: ModelConnectionsStoreV1): string {
  const parsed = parseModelConnectionsStore(value);
  if (parsed.kind !== "valid") throw new Error("MODEL_CONNECTIONS_STORE_INVALID");
  return `${canonicalJson(parsed.value)}\n`;
}

function sameIdentity(
  left: { dev: bigint; ino: bigint },
  right: { dev: bigint; ino: bigint },
): boolean {
  return left.dev === right.dev && left.ino !== 0n && right.ino !== 0n && left.ino === right.ino;
}

function nodeReadBytes(filePath: string, maximumBytes: number): Buffer {
  const absolute = resolve(filePath);
  const beforePath = lstatSync(absolute, { bigint: true });
  if (!beforePath.isFile() || beforePath.isSymbolicLink() || beforePath.nlink !== 1n) {
    throw new Error("MODEL_CONNECTIONS_STORE_UNSAFE");
  }
  let descriptor: number | null = null;
  try {
    descriptor = openSync(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const before = fstatSync(descriptor, { bigint: true });
    if (!before.isFile() || before.nlink !== 1n || !sameIdentity(beforePath, before)
      || before.size > BigInt(maximumBytes)) throw new Error("MODEL_CONNECTIONS_STORE_UNSAFE");
    const size = Number(before.size);
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const count = readSync(descriptor, bytes, offset, size - offset, offset);
      if (count <= 0) throw new Error("MODEL_CONNECTIONS_STORE_UNSAFE");
      offset += count;
    }
    const after = fstatSync(descriptor, { bigint: true });
    const afterPath = lstatSync(absolute, { bigint: true });
    if (!afterPath.isFile() || afterPath.isSymbolicLink() || afterPath.nlink !== 1n
      || !sameIdentity(before, after) || !sameIdentity(after, afterPath)
      || after.size !== before.size) throw new Error("MODEL_CONNECTIONS_STORE_UNSAFE");
    return bytes;
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
}

function nodeFileExists(filePath: string): boolean {
  try {
    lstatSync(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export function modelConnectionsStorePath(profileRoot: string): string {
  if (typeof profileRoot !== "string" || !isAbsolute(profileRoot) || profileRoot.includes("\0")) {
    throw new Error("MODEL_CONNECTIONS_STORE_PATH_INVALID");
  }
  return join(profileRoot, MODEL_CONNECTIONS_STORE_FILE);
}

function contentFrom(store: ModelConnectionsStoreV1): ModelConnectionsStoreContent {
  return {
    recovery: store.recovery,
    connections: store.connections,
    conductorAssignment: store.conductorAssignment,
    workerAssignment: null,
    linkGrants: store.linkGrants,
    conductorGrants: store.conductorGrants,
    projectAuthorities: store.projectAuthorities,
  };
}

export function createModelConnectionsStore(
  filePath: string,
  dependencies: ModelConnectionsStoreDependencies = {},
): ModelConnectionsStore {
  if (typeof filePath !== "string" || !isAbsolute(filePath) || filePath.includes("\0")) {
    throw new Error("MODEL_CONNECTIONS_STORE_PATH_INVALID");
  }
  const exists = dependencies.exists ?? nodeFileExists;
  const readBytes = dependencies.readBytes ?? nodeReadBytes;
  const atomicWrite = dependencies.atomicWrite ?? atomicWriteText;
  const newRevision = dependencies.newRevision ?? randomUUID;
  const failpoint = dependencies.failpoint ?? (() => {});
  let mutationActive = false;

  function read(): ModelConnectionsStoreReadResult {
    try {
      if (!exists(filePath)) return Object.freeze({ kind: "absent" });
      const bytes = readBytes(filePath, MODEL_CONNECTIONS_STORE_LIMITS.bytes);
      if (bytes.length > MODEL_CONNECTIONS_STORE_LIMITS.bytes) return RECOVERY_REQUIRED;
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      const parsedJson = JSON.parse(text) as unknown;
      const parsed = parseModelConnectionsStore(parsedJson);
      if (parsed.kind !== "valid") return RECOVERY_REQUIRED;
      const canonical = Buffer.from(serializeModelConnectionsStore(parsed.value), "utf8");
      if (!bytes.equals(canonical)) return RECOVERY_REQUIRED;
      return Object.freeze({ kind: "ready", value: parsed.value });
    } catch {
      return RECOVERY_REQUIRED;
    }
  }

  function persist(
    current: ModelConnectionsStoreReadResult,
    expectedRevision: string | null,
    content: ModelConnectionsStoreContent,
  ): ModelConnectionsStoreMutationResult {
    if (current.kind === "recovery-required") return RECOVERY_REQUIRED;
    if (current.kind === "ready" && current.value.recovery.kind !== "none") {
      return RECOVERY_REQUIRED;
    }
    if (expectedRevision === null ? current.kind !== "absent"
      : current.kind !== "ready" || current.value.storeRevision !== expectedRevision) {
      return Object.freeze({ kind: "stale", code: "MODEL_CONNECTIONS_STORE_STALE" });
    }

    let revisionValue: string;
    try {
      revisionValue = newRevision();
    } catch {
      return Object.freeze({ kind: "invalid", code: "MODEL_CONNECTIONS_STORE_INVALID" });
    }
    if (!revision(revisionValue)
      || (current.kind === "ready" && current.value.storeRevision === revisionValue)) {
      return Object.freeze({ kind: "invalid", code: "MODEL_CONNECTIONS_STORE_INVALID" });
    }
    const proposed = {
      version: MODEL_CONNECTIONS_SCHEMA_VERSION,
      storeRevision: revisionValue,
      ...content,
    };
    const parsed = parseModelConnectionsStore(proposed);
    if (parsed.kind !== "valid") {
      return Object.freeze({ kind: "invalid", code: "MODEL_CONNECTIONS_STORE_INVALID" });
    }
    const serialized = serializeModelConnectionsStore(parsed.value);
    if (Buffer.byteLength(serialized, "utf8") > MODEL_CONNECTIONS_STORE_LIMITS.bytes) {
      return Object.freeze({ kind: "invalid", code: "MODEL_CONNECTIONS_STORE_INVALID" });
    }
    try {
      failpoint("before-atomic-write");
      atomicWrite(filePath, serialized);
    } catch {
      const afterFailure = read();
      const unchanged = current.kind === "absent"
        ? afterFailure.kind === "absent"
        : afterFailure.kind === "ready"
          && serializeModelConnectionsStore(afterFailure.value)
            === serializeModelConnectionsStore(current.value);
      return unchanged
        ? Object.freeze({ kind: "write-failed", code: "MODEL_CONNECTIONS_STORE_WRITE_FAILED" })
        : RECOVERY_REQUIRED;
    }
    try {
      failpoint("after-atomic-write");
      failpoint("before-readback");
      const readback = read();
      if (readback.kind !== "ready"
        || serializeModelConnectionsStore(readback.value) !== serialized) return RECOVERY_REQUIRED;
      failpoint("after-readback");
      return Object.freeze({ kind: "written", value: readback.value });
    } catch {
      return RECOVERY_REQUIRED;
    }
  }

  function exclusive(
    operation: () => ModelConnectionsStoreMutationResult,
  ): ModelConnectionsStoreMutationResult {
    if (mutationActive) return Object.freeze({ kind: "busy", code: "MODEL_CONNECTIONS_STORE_BUSY" });
    mutationActive = true;
    try {
      return operation();
    } finally {
      mutationActive = false;
    }
  }

  return Object.freeze({
    read,
    write(expectedRevision: string | null, content: ModelConnectionsStoreContent) {
      return exclusive(() => persist(read(), expectedRevision, content));
    },
    mutate(
      expectedRevision: string,
      update: (current: ModelConnectionsStoreV1) => ModelConnectionsStoreContent,
    ) {
      return exclusive(() => {
        const current = read();
        if (current.kind === "recovery-required") return RECOVERY_REQUIRED;
        if (current.kind !== "ready" || current.value.storeRevision !== expectedRevision) {
          return Object.freeze({ kind: "stale", code: "MODEL_CONNECTIONS_STORE_STALE" });
        }
        let next: ModelConnectionsStoreContent;
        try {
          next = update(current.value);
        } catch {
          return Object.freeze({ kind: "invalid", code: "MODEL_CONNECTIONS_STORE_INVALID" });
        }
        return persist(current, expectedRevision, next);
      });
    },
  });
}

/** Convenient safe copy for mutation callbacks; it deliberately excludes the
 * root version/revision which the store alone authors. */
export function modelConnectionsStoreContent(
  store: ModelConnectionsStoreV1,
): ModelConnectionsStoreContent {
  return contentFrom(store);
}
