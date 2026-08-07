import { createHash, timingSafeEqual } from "node:crypto";
import { TextDecoder, types as nodeTypes } from "node:util";

/**
 * The legacy credential is always this one file in Cairn's user-data folder.
 * Callers resolve the user-data folder; neither persisted data nor renderer
 * input is allowed to supply a path.
 */
export const LEGACY_CONDUCTOR_FILE_NAME = "conductor.json" as const;

/** A fixed, deliberately non-legacy record used only while recovery removes
 * two conflicting credential locations. It contains no credential or path. */
export const LEGACY_CONDUCTOR_RECOVERY_MARKER = '{"cairnRecovery":"erase-pending/v1"}' as const;

export const LEGACY_CONDUCTOR_LIMITS = Object.freeze({
  fileBytes: 64 * 1024,
  baseUrlCharacters: 2_048,
  modelCharacters: 256,
  ciphertextBase64Characters: 32_768,
  ciphertextBytes: 24_576,
  authorizedDataScopeCharacters: 4_096,
  decryptedSecretBytes: 32_768,
});

export const CONNECTION_SECRET_LIMITS = Object.freeze({
  plaintextBytes: LEGACY_CONDUCTOR_LIMITS.decryptedSecretBytes,
  ciphertextBytes: 192 * 1024,
} as const);

export interface ConnectionSecretEncryptor {
  encrypt(secret: string): Uint8Array;
}

export interface ConnectionSecretDecryptor {
  decrypt(ciphertext: Uint8Array): string;
}

function boundedPlaintextSecret(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && Buffer.byteLength(value, "utf8") <= CONNECTION_SECRET_LIMITS.plaintextBytes;
}

/** Bound untrusted pasted/OAuth plaintext before invoking OS encryption. */
export function encryptBoundedConnectionSecret(
  value: unknown,
  encryptor: ConnectionSecretEncryptor,
): Buffer | null {
  if (!boundedPlaintextSecret(value)) return null;
  let encrypted: Uint8Array;
  try {
    encrypted = encryptor.encrypt(value);
  } catch {
    return null;
  }
  if (!(encrypted instanceof Uint8Array)
    || encrypted.byteLength === 0
    || encrypted.byteLength > CONNECTION_SECRET_LIMITS.ciphertextBytes) {
    if (encrypted instanceof Uint8Array) encrypted.fill(0);
    return null;
  }
  return Buffer.from(encrypted.buffer, encrypted.byteOffset, encrypted.byteLength);
}

/** Bound encrypted bytes before invoking OS decryption, then bound plaintext
 * again before it can become a provider credential. */
export function decryptBoundedConnectionSecret(
  ciphertext: Uint8Array,
  decryptor: ConnectionSecretDecryptor,
): string | null {
  if (!(ciphertext instanceof Uint8Array)
    || ciphertext.byteLength === 0
    || ciphertext.byteLength > CONNECTION_SECRET_LIMITS.ciphertextBytes) return null;
  try {
    const plaintext = decryptor.decrypt(ciphertext);
    return boundedPlaintextSecret(plaintext) ? plaintext : null;
  } catch {
    return null;
  }
}

export type LegacyConductorShape = "three-key" | "four-key";

export interface LegacyConductorConnection {
  readonly baseUrl: string;
  readonly model: string;
  /** Encrypted bytes encoded with canonical standard base64. Never log this. */
  readonly keyB64: string;
  readonly authorizedDataScope: string | null;
  /** Records whether authorizedDataScope existed in the historical file. */
  readonly shape: LegacyConductorShape;
}

export type LegacyConductorParseResult =
  | Readonly<{ kind: "absent" }>
  | Readonly<{ kind: "valid"; value: LegacyConductorConnection }>
  | Readonly<{ kind: "malformed" }>;

const ABSENT = Object.freeze({ kind: "absent" }) as LegacyConductorParseResult;
const MALFORMED = Object.freeze({ kind: "malformed" }) as LegacyConductorParseResult;

const THREE_KEYS = Object.freeze(["baseUrl", "model", "keyB64"]);
const FOUR_KEYS = Object.freeze([...THREE_KEYS, "authorizedDataScope"]);
const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._/:@+-]*$/;
const DRIVE_PATH_MODEL_ID = /^[A-Za-z]:\//;
const DANGEROUS_MODEL_SCHEME = /^(?:data|file|ftp|https?|javascript):/i;
const CANONICAL_BASE64 =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const SHA256_HEX = /^[a-f0-9]{64}$/;
const FORBIDDEN_TEXT =
  /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/u;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  try {
    if (
      typeof value !== "object" ||
      value === null ||
      Array.isArray(value) ||
      nodeTypes.isProxy(value)
    ) {
      return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  try {
    const keys = Reflect.ownKeys(value);
    if (
      keys.length !== expected.length ||
      keys.some((key) => typeof key !== "string" || !expected.includes(key))
    ) {
      return false;
    }
    return expected.every((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor !== undefined && "value" in descriptor && descriptor.enumerable;
    });
  } catch {
    return false;
  }
}

function isWellFormedText(value: string): boolean {
  // String#isWellFormed is not present in every Node version Cairn supports.
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function isCanonicalBaseUrl(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > LEGACY_CONDUCTOR_LIMITS.baseUrlCharacters ||
    value.trim() !== value ||
    !isWellFormedText(value) ||
    /[\\\s\u0000-\u001f\u007f]/.test(value)
  ) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    parsed.hostname === ""
  ) {
    return false;
  }

  // Preserve the historical spelling byte-for-byte. URL is used only to
  // establish a constrained HTTP(S) endpoint; migration must not silently
  // normalize a valid endpoint that the owner previously approved.
  return true;
}

function isCanonicalModel(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > LEGACY_CONDUCTOR_LIMITS.modelCharacters ||
    value.trim() !== value ||
    !isWellFormedText(value) ||
    value.normalize("NFC") !== value ||
    !MODEL_ID.test(value) ||
    value.includes("://") ||
    DRIVE_PATH_MODEL_ID.test(value) ||
    DANGEROUS_MODEL_SCHEME.test(value)
  ) {
    return false;
  }

  return value.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function isAuthorizedDataScope(value: unknown): value is string | null {
  if (value === null) return true;
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= LEGACY_CONDUCTOR_LIMITS.authorizedDataScopeCharacters &&
    value.trim() === value &&
    isWellFormedText(value) &&
    value.normalize("NFC") === value &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function decodeCanonicalCiphertext(value: unknown): Buffer | null {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > LEGACY_CONDUCTOR_LIMITS.ciphertextBase64Characters ||
    value.length % 4 !== 0 ||
    !CANONICAL_BASE64.test(value)
  ) {
    return null;
  }

  const decoded = Buffer.from(value, "base64");
  if (
    decoded.length === 0 ||
    decoded.length > LEGACY_CONDUCTOR_LIMITS.ciphertextBytes ||
    decoded.toString("base64") !== value
  ) {
    decoded.fill(0);
    return null;
  }
  return decoded;
}

function isCanonicalCiphertext(value: unknown): value is string {
  const decoded = decodeCanonicalCiphertext(value);
  if (decoded === null) return false;
  decoded.fill(0);
  return true;
}

function decodeInput(input: string | Uint8Array): string | null {
  const byteLength =
    typeof input === "string" ? Buffer.byteLength(input, "utf8") : input.byteLength;
  if (byteLength === 0 || byteLength > LEGACY_CONDUCTOR_LIMITS.fileBytes) return null;

  if (typeof input === "string") return input;
  try {
    // Keep an input BOM in the decoded value so the strict parser can reject it.
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(input);
  } catch {
    return null;
  }
}

/**
 * Parses only the two files written by historical Cairn releases:
 * {baseUrl, model, keyB64} and the same object plus authorizedDataScope.
 * `null`/`undefined` means the fixed file is absent. Every other condition is
 * malformed so callers enter recovery instead of silently treating corruption
 * as a disconnected state.
 */
export function parseLegacyConductorConnection(
  input: string | Uint8Array | null | undefined,
): LegacyConductorParseResult {
  if (input === null || input === undefined) return ABSENT;
  const text = decodeInput(input);
  if (text === null || text.charCodeAt(0) === 0xfeff) return MALFORMED;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return MALFORMED;
  }

  // Historical Cairn wrote this small record with JSON.stringify and fixed
  // insertion order. Requiring that exact encoding also rejects duplicate
  // textual keys that JSON.parse alone would silently collapse.
  if (JSON.stringify(parsed) !== text) return MALFORMED;

  if (!isPlainRecord(parsed)) return MALFORMED;
  const threeKey = hasExactKeys(parsed, THREE_KEYS);
  const fourKey = hasExactKeys(parsed, FOUR_KEYS);
  if (!threeKey && !fourKey) return MALFORMED;

  const scope = fourKey ? parsed.authorizedDataScope : null;
  if (
    !isCanonicalBaseUrl(parsed.baseUrl) ||
    !isCanonicalModel(parsed.model) ||
    !isCanonicalCiphertext(parsed.keyB64) ||
    !isAuthorizedDataScope(scope)
  ) {
    return MALFORMED;
  }

  return Object.freeze({
    kind: "valid",
    value: Object.freeze({
      baseUrl: parsed.baseUrl,
      model: parsed.model,
      keyB64: parsed.keyB64,
      authorizedDataScope: scope,
      shape: fourKey ? "four-key" : "three-key",
    }),
  });
}

/**
 * The production adapter must resolve the fixed filename inside app userData
 * and enforce `maxBytes` before returning bytes. Tests can implement this with
 * an in-memory value; no Electron dependency is needed here.
 */
export interface LegacyConductorFileReader {
  readConductorFile(maxBytes: number): string | Uint8Array | null;
}

export interface LegacyConductorFileAccess extends LegacyConductorFileReader {
  conductorFileExists(): boolean;
  removeConductorFile(): void;
  replaceConductorFileWithRecoveryMarker(marker: string): void;
}

export interface LegacySecretDecryptor {
  decryptLegacyCiphertext(ciphertext: Uint8Array): string;
}

export function readLegacyConductorConnection(
  reader: LegacyConductorFileReader,
): LegacyConductorParseResult {
  try {
    return parseLegacyConductorConnection(
      reader.readConductorFile(LEGACY_CONDUCTOR_LIMITS.fileBytes),
    );
  } catch {
    return MALFORMED;
  }
}

export interface LegacyConductorFacts {
  readonly baseUrl: string;
  readonly model: string;
  readonly authorizedDataScope: string | null;
}

export interface LegacyConductorSecretReference {
  readonly kind: "legacy-conductor-file";
  readonly fileName: typeof LEGACY_CONDUCTOR_FILE_NAME;
  readonly ciphertextSha256: string;
}

/** Returns the lowercase SHA-256 of the decoded encrypted bytes. */
export function legacyCiphertextSha256(keyB64: string): string | null {
  const ciphertext = decodeCanonicalCiphertext(keyB64);
  if (ciphertext === null) return null;
  try {
    return createHash("sha256").update(ciphertext).digest("hex");
  } finally {
    ciphertext.fill(0);
  }
}

export function createLegacyConductorSecretReference(
  connection: LegacyConductorConnection,
): LegacyConductorSecretReference | null {
  const ciphertextSha256 = legacyCiphertextSha256(connection.keyB64);
  if (ciphertextSha256 === null) return null;
  return Object.freeze({
    kind: "legacy-conductor-file",
    fileName: LEGACY_CONDUCTOR_FILE_NAME,
    ciphertextSha256,
  });
}

export type LegacySecretFailureCode =
  | "reference-invalid"
  | "credential-missing"
  | "credential-malformed"
  | "connection-facts-changed"
  | "ciphertext-changed"
  | "decryption-failed"
  | "deletion-failed"
  | "deletion-unverified";

export type LegacySecretFailure = Readonly<{
  ok: false;
  code: LegacySecretFailureCode;
  /** Stable, redacted text safe to surface and record. */
  message: string;
}>;

const FAILURE_MESSAGES: Readonly<Record<LegacySecretFailureCode, string>> = Object.freeze({
  "reference-invalid": "Cairn could not verify the saved model credential reference.",
  "credential-missing": "The saved model credential is missing, so recovery is required.",
  "credential-malformed": "The saved model credential could not be read safely.",
  "connection-facts-changed":
    "The saved model credential no longer matches Cairn's connection record.",
  "ciphertext-changed": "The saved model credential changed unexpectedly.",
  "decryption-failed": "The saved model credential could not be unlocked.",
  "deletion-failed":
    "The saved model credential could not be deleted. No later recovery data was erased.",
  "deletion-unverified":
    "Cairn could not confirm credential deletion. Connection recovery is still required.",
});

function failure(code: LegacySecretFailureCode): LegacySecretFailure {
  return Object.freeze({ ok: false, code, message: FAILURE_MESSAGES[code] });
}

function isFailure(
  value: VerifiedLegacyReference | LegacySecretFailure,
): value is LegacySecretFailure {
  return "ok" in value && value.ok === false;
}

function isReference(value: unknown): value is LegacyConductorSecretReference {
  return (
    isPlainRecord(value) &&
    hasExactKeys(value, ["kind", "fileName", "ciphertextSha256"]) &&
    value.kind === "legacy-conductor-file" &&
    value.fileName === LEGACY_CONDUCTOR_FILE_NAME &&
    typeof value.ciphertextSha256 === "string" &&
    SHA256_HEX.test(value.ciphertextSha256)
  );
}

function isFacts(value: unknown): value is LegacyConductorFacts {
  return (
    isPlainRecord(value) &&
    hasExactKeys(value, ["baseUrl", "model", "authorizedDataScope"]) &&
    isCanonicalBaseUrl(value.baseUrl) &&
    isCanonicalModel(value.model) &&
    isAuthorizedDataScope(value.authorizedDataScope)
  );
}

function digestMatches(actual: string, expected: string): boolean {
  if (!SHA256_HEX.test(actual) || !SHA256_HEX.test(expected)) return false;
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

type VerifiedLegacyReference = Readonly<{
  connection: LegacyConductorConnection;
  ciphertext: Buffer;
}>;

function verifyLegacyReference(
  reference: LegacyConductorSecretReference,
  expectedFacts: LegacyConductorFacts,
  reader: LegacyConductorFileReader,
): VerifiedLegacyReference | LegacySecretFailure {
  if (!isReference(reference) || !isFacts(expectedFacts)) return failure("reference-invalid");

  const parsed = readLegacyConductorConnection(reader);
  if (parsed.kind === "absent") return failure("credential-missing");
  if (parsed.kind === "malformed") return failure("credential-malformed");

  if (
    parsed.value.baseUrl !== expectedFacts.baseUrl ||
    parsed.value.model !== expectedFacts.model ||
    parsed.value.authorizedDataScope !== expectedFacts.authorizedDataScope
  ) {
    return failure("connection-facts-changed");
  }

  const ciphertext = decodeCanonicalCiphertext(parsed.value.keyB64);
  if (ciphertext === null) return failure("credential-malformed");
  const actualDigest = createHash("sha256").update(ciphertext).digest("hex");
  if (!digestMatches(actualDigest, reference.ciphertextSha256)) {
    ciphertext.fill(0);
    return failure("ciphertext-changed");
  }

  return Object.freeze({ connection: parsed.value, ciphertext });
}

export type LegacySecretDecryptResult =
  | Readonly<{ ok: true; secret: string }>
  | LegacySecretFailure;

/**
 * Decryption is deliberately last: the file must strictly parse, its public
 * connection facts must match, and its ciphertext digest must match the fixed
 * reference before the injected OS credential adapter is invoked.
 */
export function verifyAndDecryptLegacyConductorSecret(
  reference: LegacyConductorSecretReference,
  expectedFacts: LegacyConductorFacts,
  reader: LegacyConductorFileReader,
  decryptor: LegacySecretDecryptor,
): LegacySecretDecryptResult {
  const verified = verifyLegacyReference(reference, expectedFacts, reader);
  if (isFailure(verified)) return verified;

  try {
    const secret = decryptor.decryptLegacyCiphertext(verified.ciphertext);
    if (
      typeof secret !== "string" ||
      secret.length === 0 ||
      Buffer.byteLength(secret, "utf8") > LEGACY_CONDUCTOR_LIMITS.decryptedSecretBytes
    ) {
      return failure("decryption-failed");
    }
    return Object.freeze({ ok: true, secret });
  } catch {
    return failure("decryption-failed");
  } finally {
    verified.ciphertext.fill(0);
  }
}

export type LegacySecretDeletionResult =
  | Readonly<{ ok: true; deleted: boolean }>
  | LegacySecretFailure;

function confirmAbsent(access: LegacyConductorFileAccess): LegacySecretFailure | null {
  try {
    return access.conductorFileExists() ? failure("deletion-unverified") : null;
  } catch {
    return failure("deletion-unverified");
  }
}

/**
 * Normal Forget path. Refuses to delete if the fixed file is not the exact
 * credential bound to the authority record, then verifies absence after the
 * delete. Callers may erase caches/authority only after an `ok: true` result.
 */
export function deleteReferencedLegacyConductorSecret(
  reference: LegacyConductorSecretReference,
  expectedFacts: LegacyConductorFacts,
  access: LegacyConductorFileAccess,
): LegacySecretDeletionResult {
  const verified = verifyLegacyReference(reference, expectedFacts, access);
  if (isFailure(verified)) return verified;
  verified.ciphertext.fill(0);

  try {
    access.removeConductorFile();
  } catch {
    return failure("deletion-failed");
  }

  return confirmAbsent(access) ?? Object.freeze({ ok: true, deleted: true });
}

/**
 * Recovery path. Erases only the fixed legacy credential, even when corrupt,
 * and treats an already absent credential as success. Absence is checked both
 * before and after deletion; no later recovery step is safe unless this returns
 * `ok: true`.
 */
export function eraseLegacyConductorSecretForRecovery(
  access: LegacyConductorFileAccess,
): LegacySecretDeletionResult {
  try {
    if (!access.conductorFileExists()) {
      return Object.freeze({ ok: true, deleted: false });
    }
  } catch {
    return failure("deletion-unverified");
  }

  try {
    access.removeConductorFile();
  } catch {
    return failure("deletion-failed");
  }

  return confirmAbsent(access) ?? Object.freeze({ ok: true, deleted: true });
}

/**
 * Mixed-custody recovery path. Atomically replacing the unexpected legacy
 * file with this non-secret marker removes its credential while keeping both
 * new and old readers fail-closed until the inline credential rewrite has
 * been verified. The caller removes the marker only after that rewrite.
 */
export function armLegacyConductorRecoveryMarker(
  access: LegacyConductorFileAccess,
): LegacySecretDeletionResult {
  try {
    if (!access.conductorFileExists()) return failure("deletion-unverified");
    access.replaceConductorFileWithRecoveryMarker(LEGACY_CONDUCTOR_RECOVERY_MARKER);
    if (!access.conductorFileExists()) return failure("deletion-unverified");
    const readback = access.readConductorFile(LEGACY_CONDUCTOR_LIMITS.fileBytes);
    const matches = typeof readback === "string"
      ? readback === LEGACY_CONDUCTOR_RECOVERY_MARKER
      : readback !== null
        && Buffer.from(readback).equals(Buffer.from(LEGACY_CONDUCTOR_RECOVERY_MARKER, "utf8"));
    return matches
      ? Object.freeze({ ok: true, deleted: true })
      : failure("deletion-unverified");
  } catch {
    return failure("deletion-failed");
  }
}
