import { app, safeStorage } from "electron";
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import { atomicWriteText } from "../atomicwrite.js";
import {
  eraseModelConnectionsForRecovery,
  forgetModelConnections,
  loadOrMigrateLegacyConnection,
  renewCompatibleConnection,
  replaceCompatibleConnection,
  replaceInlineCompatibleConnection,
  replaceLegacyCredentialAtomically,
  type CompatibleConnectionAuthority,
  type ConnectionAuthorityLoadResult,
  type ProjectConnectionExpectation,
} from "../connections/migrate.js";
import { inspectProjectRoot } from "../connections/project-authority.js";
import {
  decryptBoundedConnectionSecret,
  encryptBoundedConnectionSecret,
  LEGACY_CONDUCTOR_RECOVERY_MARKER,
  LEGACY_CONDUCTOR_LIMITS,
  verifyAndDecryptLegacyConductorSecret,
  type LegacyConductorFileAccess,
} from "../connections/secrets.js";
import {
  createInlineEncryptedCredential,
  createModelConnectionsStore,
  decodeInlineEncryptedCredential,
  MODEL_CONNECTIONS_STORE_FILE,
  modelConnectionsStorePath,
  type ModelConnectionsStore,
} from "../connections/store.js";

export type StoredConnection = CompatibleConnectionAuthority;
export type StoredConnectionReadResult = ConnectionAuthorityLoadResult;

export type ConnectionMutationResult =
  | Readonly<{ ok: true }>
  | Readonly<{
      ok: false;
      code: "stale" | "recovery-required" | "project-reauthorization-required" | "write-failed";
      message: string;
    }>;

const RECOVERY_MESSAGE = "Cairn's local model connection needs recovery before it can be used or changed.";
const STALE_MESSAGE = "That connection changed while this action was open. Review the current connection and try again.";
const PROJECT_MESSAGE = "This project must be explicitly re-authorized before Cairn can use the saved connection.";
const WRITE_MESSAGE = "Cairn could not safely finish saving the model connection.";
const CONDUCTOR_FILE = "conductor.json";
const CATALOG_FILE = "model-catalogs.json";

let cachedStore: { root: string; store: ModelConnectionsStore } | null = null;

function profileRoot(): string {
  return app.getPath("userData");
}

function conductorPath(): string {
  return path.join(profileRoot(), CONDUCTOR_FILE);
}

function catalogPath(): string {
  return path.join(profileRoot(), CATALOG_FILE);
}

function authorityPath(): string {
  return modelConnectionsStorePath(profileRoot());
}

function connectionStore(): ModelConnectionsStore {
  const root = profileRoot();
  if (cachedStore?.root !== root) {
    cachedStore = { root, store: createModelConnectionsStore(modelConnectionsStorePath(root)) };
  }
  return cachedStore.store;
}

function sameIdentity(
  left: { dev: bigint; ino: bigint },
  right: { dev: bigint; ino: bigint },
): boolean {
  return left.dev === right.dev && left.ino > 0n && left.ino === right.ino;
}

function fixedFileExists(file: string): boolean {
  try {
    lstatSync(file);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

/** Bounded, no-follow read of the fixed legacy credential path. */
function readConductorBytes(maximumBytes: number): Buffer | null {
  const file = conductorPath();
  if (!fixedFileExists(file)) return null;
  let descriptor: number | null = null;
  try {
    const beforePath = lstatSync(file, { bigint: true });
    if (!beforePath.isFile() || beforePath.isSymbolicLink() || beforePath.nlink !== 1n
      || beforePath.size > BigInt(maximumBytes)) throw new Error("CONDUCTOR_FILE_UNSAFE");
    descriptor = openSync(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const before = fstatSync(descriptor, { bigint: true });
    if (!before.isFile() || before.nlink !== 1n || !sameIdentity(beforePath, before)
      || before.size > BigInt(maximumBytes)) throw new Error("CONDUCTOR_FILE_UNSAFE");
    const bytes = Buffer.alloc(Number(before.size));
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(descriptor, bytes, offset, bytes.length - offset, offset);
      if (count <= 0) throw new Error("CONDUCTOR_FILE_UNSAFE");
      offset += count;
    }
    const after = fstatSync(descriptor, { bigint: true });
    const afterPath = lstatSync(file, { bigint: true });
    if (!afterPath.isFile() || afterPath.isSymbolicLink() || afterPath.nlink !== 1n
      || !sameIdentity(before, after) || !sameIdentity(after, afterPath)
      || after.size !== before.size) throw new Error("CONDUCTOR_FILE_UNSAFE");
    return bytes;
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
}

const legacyAccess: LegacyConductorFileAccess = Object.freeze({
  readConductorFile(maximumBytes: number) {
    return readConductorBytes(maximumBytes);
  },
  conductorFileExists() {
    return fixedFileExists(conductorPath());
  },
  removeConductorFile() {
    rmSync(conductorPath(), { force: true });
  },
  replaceConductorFileWithRecoveryMarker(marker: string) {
    if (marker !== LEGACY_CONDUCTOR_RECOVERY_MARKER) {
      throw new Error("CONDUCTOR_RECOVERY_MARKER_REFUSED");
    }
    atomicWriteText(conductorPath(), marker);
    const readback = readConductorBytes(LEGACY_CONDUCTOR_LIMITS.fileBytes);
    if (readback === null || !readback.equals(Buffer.from(marker, "utf8"))) {
      throw new Error("CONDUCTOR_RECOVERY_MARKER_READBACK_FAILED");
    }
  },
});

function writeLegacyConnection(
  baseUrl: string,
  model: string,
  keyB64: string,
  authorizedDataScope: string,
): void {
  const serialized = JSON.stringify({ baseUrl, model, keyB64, authorizedDataScope });
  if (Buffer.byteLength(serialized, "utf8") > LEGACY_CONDUCTOR_LIMITS.fileBytes) {
    throw new Error("CONDUCTOR_CONNECTION_INVALID");
  }
  atomicWriteText(conductorPath(), serialized);
  const readback = readConductorBytes(LEGACY_CONDUCTOR_LIMITS.fileBytes);
  if (readback === null || !readback.equals(Buffer.from(serialized, "utf8"))) {
    throw new Error("CONDUCTOR_CONNECTION_READBACK_FAILED");
  }
}

function restoreLegacyConnection(previous: Buffer | null): boolean {
  try {
    if (previous === null) return removeAndVerify(conductorPath());
    atomicWriteText(conductorPath(), previous.toString("utf8"));
    const readback = readConductorBytes(LEGACY_CONDUCTOR_LIMITS.fileBytes);
    return readback !== null && readback.equals(previous);
  } catch {
    return false;
  }
}

function fixedFailure(
  code: Exclude<ConnectionMutationResult, { ok: true }>["code"],
  message: string,
): ConnectionMutationResult {
  return Object.freeze({ ok: false, code, message });
}

export function encryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

/** Main-only load/migration. A malformed file is never collapsed to null. */
export function readConnection(
  currentProjectRoot?: string | null,
  expectedProject?: ProjectConnectionExpectation | null,
): StoredConnectionReadResult {
  return loadOrMigrateLegacyConnection({
    store: connectionStore(),
    legacy: legacyAccess,
    currentProjectRoot,
    expectedProject,
  });
}

/** Revision captured before asynchronous OAuth work. No credential is written
 * if another reconnect/Forget wins before completion. */
export function expectedStoreRevision(
  currentProjectRoot?: string | null,
  expectedProject?: ProjectConnectionExpectation | null,
): string | null | "recovery-required" | "project-reauthorization-required" {
  const state = readConnection(currentProjectRoot, expectedProject);
  if (state.kind === "recovery-required") return "recovery-required";
  if (state.kind === "project-reauthorization-required") return "project-reauthorization-required";
  return state.kind === "ready" ? state.value.storeRevision : null;
}

/** Capture only the digests needed to bind asynchronous authorization to the
 * exact project identity reviewed at its start. Raw roots stay main-only. */
export function captureProjectSelection(
  currentProjectRoot?: string | null,
): Readonly<{ canonicalRoot: string; expectation: ProjectConnectionExpectation }> | null {
  if (!currentProjectRoot) return null;
  const snapshot = inspectProjectRoot(currentProjectRoot);
  if (!snapshot) return null;
  return Object.freeze({
    canonicalRoot: snapshot.canonicalRoot,
    expectation: Object.freeze({
      canonicalRootDigest: snapshot.canonicalRootDigest,
      filesystemIdentityDigest: snapshot.filesystemIdentityDigest,
    }),
  });
}

export function captureProjectExpectation(
  currentProjectRoot?: string | null,
): ProjectConnectionExpectation | null {
  return captureProjectSelection(currentProjectRoot)?.expectation ?? null;
}

/** Encrypt and save the compatibility slot. Fresh pasted/OAuth credentials
 * live inline in the authority store. A migrated legacy connection keeps its
 * one conductor.json location so reconnect never creates duplicate custody or
 * silently ends the documented old-binary rollback path. */
export function saveKey(
  baseUrl: string,
  model: string,
  apiKey: string,
  authorizedDataScope: string,
  authenticationOrigin: "pasted-api-key" | "openrouter-oauth",
  currentProjectRoot?: string | null,
  expectedRevision?: string | null,
  expectedProject?: ProjectConnectionExpectation | null,
): ConnectionMutationResult {
  // A reconnect is allowed to replace a valid existing connection, including
  // one whose project binding needs explicit renewal. It must never overwrite
  // malformed or half-erased credential state, though, so classify the fixed
  // profile files before writing any new ciphertext.
  const classified = readConnection(null);
  if (classified.kind !== "absent" && classified.kind !== "ready") {
    return fixedFailure("recovery-required", RECOVERY_MESSAGE);
  }
  const store = connectionStore();
  const beforeStore = store.read();
  if (beforeStore.kind === "recovery-required") return fixedFailure("recovery-required", RECOVERY_MESSAGE);
  const actualRevision = beforeStore.kind === "ready" ? beforeStore.value.storeRevision : null;
  const requiredRevision = expectedRevision === undefined ? actualRevision : expectedRevision;
  if (requiredRevision !== actualRevision) return fixedFailure("stale", STALE_MESSAGE);
  if (expectedProject !== undefined) {
    const currentProject = captureProjectExpectation(currentProjectRoot);
    if (expectedProject === null || !currentProject
      || currentProject.canonicalRootDigest !== expectedProject.canonicalRootDigest
      || currentProject.filesystemIdentityDigest !== expectedProject.filesystemIdentityDigest) {
      return fixedFailure("project-reauthorization-required", PROJECT_MESSAGE);
    }
  }

  const encrypted = encryptBoundedConnectionSecret(apiKey, {
    encrypt: (secret) => safeStorage.encryptString(secret),
  });
  if (encrypted === null) return fixedFailure("write-failed", WRITE_MESSAGE);

  const inline = classified.kind === "absent"
    || classified.value.credential.kind === "inline-encrypted";
  if (inline) {
    try {
      const credential = createInlineEncryptedCredential(encrypted);
      if (credential === null) return fixedFailure("write-failed", WRITE_MESSAGE);
      const replacement = replaceInlineCompatibleConnection({
        store,
        legacy: legacyAccess,
        currentProjectRoot,
        authenticationOrigin,
        expectedStoreRevision: requiredRevision,
        baseUrl,
        model,
        authorizedDataScope,
        credential,
        expectedProject,
      });
      if (replacement.kind === "ready") return Object.freeze({ ok: true });
      if (replacement.kind === "stale") return fixedFailure("stale", STALE_MESSAGE);
      if (replacement.kind === "write-failed") return fixedFailure("write-failed", WRITE_MESSAGE);
      if (replacement.kind === "project-reauthorization-required") {
        return fixedFailure("project-reauthorization-required", PROJECT_MESSAGE);
      }
      return fixedFailure("recovery-required", RECOVERY_MESSAGE);
    } finally {
      encrypted.fill(0);
    }
  }

  let replacement: ReturnType<typeof replaceLegacyCredentialAtomically>;
  try {
    replacement = replaceLegacyCredentialAtomically({
      readPreviousCredential: () => readConductorBytes(LEGACY_CONDUCTOR_LIMITS.fileBytes),
      writeReplacementCredential: () => {
        writeLegacyConnection(baseUrl, model, encrypted.toString("base64"), authorizedDataScope);
      },
      restorePreviousCredential: (previous) => restoreLegacyConnection(previous),
      replaceAuthority: () => replaceCompatibleConnection({
        store,
        legacy: legacyAccess,
        currentProjectRoot,
        authenticationOrigin,
        expectedStoreRevision: requiredRevision,
        expectedProject,
      }),
      authorityUnchanged: () => {
        const afterStore = store.read();
        return beforeStore.kind === "absent"
          ? afterStore.kind === "absent"
          : beforeStore.kind === "ready" && afterStore.kind === "ready"
            && beforeStore.value.storeRevision === afterStore.value.storeRevision;
      },
    });
  } finally {
    encrypted.fill(0);
  }
  if (replacement.kind === "ready") return Object.freeze({ ok: true });
  if (replacement.kind === "stale") return fixedFailure("stale", STALE_MESSAGE);
  if (replacement.kind === "write-failed") return fixedFailure("write-failed", WRITE_MESSAGE);
  if (replacement.kind === "project-reauthorization-required") {
    return fixedFailure("project-reauthorization-required", PROJECT_MESSAGE);
  }
  return fixedFailure("recovery-required", RECOVERY_MESSAGE);
}

/** Store a renewed project grant without touching or decrypting conductor.json. */
export function updateAuthorizedDataScope(
  authorizedDataScope: string,
  currentProjectRoot: string | null | undefined,
  expectedRevision: string,
  expectedProject?: ProjectConnectionExpectation | null,
): ConnectionMutationResult {
  const renewed = renewCompatibleConnection({
    store: connectionStore(),
    legacy: legacyAccess,
    currentProjectRoot,
    authorizedDataScope,
    expectedStoreRevision: expectedRevision,
    expectedProject,
  });
  if (renewed.kind === "ready") return Object.freeze({ ok: true });
  if (renewed.kind === "stale") return fixedFailure("stale", STALE_MESSAGE);
  if (renewed.kind === "write-failed") return fixedFailure("write-failed", WRITE_MESSAGE);
  if (renewed.kind === "project-reauthorization-required") {
    return fixedFailure("project-reauthorization-required", PROJECT_MESSAGE);
  }
  return fixedFailure("recovery-required", RECOVERY_MESSAGE);
}

/** Task 3's legacy bridge is pinned. The connection-first picker replaces
 * this free-text mutation in Task 6; until then a changed route has no grant. */
export function updateModel(_model: string): boolean {
  return false;
}

function removeAndVerify(file: string): boolean {
  try {
    rmSync(file, { force: true });
    return !fixedFileExists(file);
  } catch {
    return false;
  }
}

function forgetPending(): ConnectionMutationResult {
  const store = connectionStore();
  // Revocation is profile-wide. A moved or replaced project may block model
  // use, but it must never block deletion of the saved credential.
  const authority = readConnection(null);
  if (authority.kind !== "absent" && authority.kind !== "ready") {
    return fixedFailure("recovery-required", RECOVERY_MESSAGE);
  }
  const result = forgetModelConnections({
    store,
    legacy: legacyAccess,
    removeCache: () => removeAndVerify(catalogPath()),
    removeAuthority: () => removeAndVerify(authorityPath()),
  });
  if (result.kind === "deleted") return Object.freeze({ ok: true });
  if (result.stage === "cache") {
    return fixedFailure("write-failed", `${result.message} Surviving file: ${CATALOG_FILE}`);
  }
  if (result.stage === "authority") {
    return fixedFailure("write-failed", `${result.message} Surviving file: ${MODEL_CONNECTIONS_STORE_FILE}`);
  }
  return fixedFailure(result.stage === "credential" ? "write-failed" : "recovery-required", result.message);
}

/** Ordinary Forget. It never runs while corruption/pending recovery exists. */
export function clearConnection(currentProjectRoot?: string | null): ConnectionMutationResult {
  void currentProjectRoot;
  return forgetPending();
}

export function recoveryTargets(): readonly string[] {
  return Object.freeze([CONDUCTOR_FILE, CATALOG_FILE, MODEL_CONNECTIONS_STORE_FILE]);
}

/** Re-probe the project registry and credential reference immediately before
 * provider I/O. Renderer path aliases and stale in-memory snapshots confer no
 * continuing authority. */
export function revalidateConnection(
  conn: StoredConnection,
  projectRoot: string,
  expectedProject?: ProjectConnectionExpectation | null,
): boolean {
  const current = readConnection(projectRoot, expectedProject);
  const credentialMatches = current.kind === "ready"
    && current.value.credential.kind === conn.credential.kind
    && current.value.credential.ciphertextSha256 === conn.credential.ciphertextSha256
    && (current.value.credential.kind !== "inline-encrypted"
      || conn.credential.kind !== "inline-encrypted"
      || current.value.credential.ciphertextB64 === conn.credential.ciphertextB64);
  return current.kind === "ready"
    && current.value.projectAuthorized
    && current.value.projectAuthorityId === conn.projectAuthorityId
    && current.value.connectionId === conn.connectionId
    && current.value.authenticationRevision === conn.authenticationRevision
    && current.value.storeRevision === conn.storeRevision
    && current.value.baseUrl === conn.baseUrl
    && current.value.model === conn.model
    && current.value.legacyAuthorizedDataScope === conn.legacyAuthorizedDataScope
    && current.value.authorizedDataScope === conn.authorizedDataScope
    && credentialMatches;
}

/** Corrupt-state exit. Static main-owned targets; secret first, cache second,
 * authority last. Any failure stops before the later target. */
export function eraseConnectionsForRecovery(): ConnectionMutationResult {
  const result = eraseModelConnectionsForRecovery({
    store: connectionStore(),
    legacy: legacyAccess,
    removeCache: () => removeAndVerify(catalogPath()),
    removeAuthority: () => removeAndVerify(authorityPath()),
  });
  if (result.kind === "deleted") return Object.freeze({ ok: true });
  const surviving = result.stage === "credential"
    ? CONDUCTOR_FILE
    : result.stage === "cache"
      ? CATALOG_FILE
      : MODEL_CONNECTIONS_STORE_FILE;
  return fixedFailure("write-failed", `${result.message} Surviving file: ${surviving}`);
}

/** Decrypt only after the persisted endpoint/model/file-scope/digest all match. */
export function decryptedKey(conn: StoredConnection): string {
  if (conn.credential.kind === "inline-encrypted") {
    const ciphertext = decodeInlineEncryptedCredential(conn.credential);
    if (ciphertext === null) throw new Error("CONDUCTOR_CREDENTIAL_UNAVAILABLE");
    try {
      const plaintext = decryptBoundedConnectionSecret(ciphertext, {
        decrypt: (bytes) => safeStorage.decryptString(bytes as Buffer),
      });
      if (plaintext === null) throw new Error("CONDUCTOR_CREDENTIAL_UNAVAILABLE");
      return plaintext;
    } finally {
      ciphertext.fill(0);
    }
  }
  const result = verifyAndDecryptLegacyConductorSecret(
    {
      kind: "legacy-conductor-file",
      fileName: "conductor.json",
      ciphertextSha256: conn.credential.ciphertextSha256,
    },
    {
      baseUrl: conn.baseUrl,
      model: conn.model,
      authorizedDataScope: conn.legacyAuthorizedDataScope,
    },
    legacyAccess,
    { decryptLegacyCiphertext: (ciphertext) => safeStorage.decryptString(ciphertext as Buffer) },
  );
  if (!result.ok) throw new Error("CONDUCTOR_CREDENTIAL_UNAVAILABLE");
  return result.secret;
}
