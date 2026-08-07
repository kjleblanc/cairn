import { createHash } from "node:crypto";
import { types as nodeTypes } from "node:util";

const IDENTITY_KEYS = Object.freeze([
  "version",
  "taskTarget",
  "baseUrl",
  "providerIdentity",
  "modelSelection",
  "modelResolution",
  "configuredModel",
  "resolvedModelRevision",
  "connectionConsentVersion",
  "transportRevision",
  "requestSerializerSha256",
  "generation",
  "systemPromptVersion",
  "systemPromptSha256",
  "schemas",
  "policySha256",
  "modality",
  "toolPolicy",
] as const);
const GENERATION_KEYS = Object.freeze(["temperature", "topP", "maxOutputTokens"] as const);
const SCHEMA_KEYS = Object.freeze(["taskSpec", "packet", "output"] as const);
const ACTIVATION_LITERAL_KEYS = Object.freeze(["identity", "routeRequestFingerprintSha256"] as const);

const SHA256 = /^[0-9a-f]{64}$/;
const MACHINE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._/:@+-]*$/;
const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._/:@+-]*$/;
const DRIVE_PATH_MODEL_ID = /^[A-Za-z]:\//;
const DANGEROUS_MODEL_SCHEME = /^(?:data|file|ftp|https?|javascript):/i;
const FORBIDDEN_TEXT = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/u;

type DataRecord = Readonly<Record<string, unknown>>;

export type CriticActivationIdentityV1 = Readonly<{
  version: "cairn-critic-route-request-identity/v1";
  taskTarget: "local-task";
  baseUrl: string;
  providerIdentity: string;
  modelSelection: "pinned";
  modelResolution: "exact";
  configuredModel: string;
  resolvedModelRevision: string;
  connectionConsentVersion: string;
  transportRevision: string;
  requestSerializerSha256: string;
  generation: Readonly<{
    temperature: 0;
    topP: 1;
    maxOutputTokens: 8_192;
  }>;
  systemPromptVersion: "cairn-critic-system/v1";
  systemPromptSha256: string;
  schemas: Readonly<{
    taskSpec: "cairn-task-spec/v1";
    packet: "cairn-critic-packet/v1";
    output: "cairn-critic-output/v1";
  }>;
  policySha256: string;
  modality: "text";
  toolPolicy: "none";
}>;

export type CriticActivationResultV1 =
  | Readonly<{
      kind: "invalid";
      code: "CRITIC_ACTIVATION_IDENTITY_INVALID";
    }>
  | Readonly<{
      kind: "inactive";
      code: "CRITIC_ACTIVATION_NOT_CALIBRATED";
      routeRequestFingerprintSha256: string;
    }>
  | Readonly<{
      kind: "active";
      routeRequestFingerprintSha256: string;
    }>;

type ValidatedActivation = Readonly<{
  canonicalIdentity: string;
  routeRequestFingerprintSha256: string;
}>;

const INVALID = Object.freeze({
  kind: "invalid",
  code: "CRITIC_ACTIVATION_IDENTITY_INVALID",
} as const);

/**
 * Q1 deliberately contains no calibrated tuple. Q10 may add only the exact
 * reviewed identity and its independently recorded fingerprint here. The
 * loader below re-parses and re-hashes every literal before it can be active.
 */
const CALIBRATED_ACTIVATION_LITERALS: readonly unknown[] = Object.freeze([]);

function exactDataRecord(value: unknown, keys: readonly string[]): DataRecord | null {
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

function wellFormedUtf16(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      if (index + 1 >= value.length) return false;
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function boundedText(value: unknown, max: number): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > max || value.trim() !== value
    || !wellFormedUtf16(value) || FORBIDDEN_TEXT.test(value)) return null;
  return value;
}

function machineToken(value: unknown, max: number): string | null {
  const text = boundedText(value, max);
  return text !== null && MACHINE_TOKEN.test(text) ? text : null;
}

function digest(value: unknown): string | null {
  return typeof value === "string" && SHA256.test(value) ? value : null;
}

function exactBaseUrl(value: unknown): string | null {
  const text = boundedText(value, 2_048);
  if (text === null || /[\\\s]/u.test(text) || !/^https?:\/\/[^/]/i.test(text)) return null;
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    return null;
  }
  if (!parsed.hostname || parsed.username || parsed.password || parsed.search || parsed.hash
    || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) return null;
  return text;
}

function exactConfiguredModel(value: unknown): string | null {
  const text = boundedText(value, 256);
  if (text === null || !MODEL_ID.test(text) || DRIVE_PATH_MODEL_ID.test(text)
    || DANGEROUS_MODEL_SCHEME.test(text)) return null;
  const segments = text.toLowerCase().split(/[/@:]/u);
  return segments.includes("auto") ? null : text;
}

function exactResolvedRevision(value: unknown): string | null {
  const text = boundedText(value, 256);
  if (text === null || /^(?:auto|unresolved)$/i.test(text)) return null;
  return text;
}

function parseIdentity(value: unknown): CriticActivationIdentityV1 | null {
  const record = exactDataRecord(value, IDENTITY_KEYS);
  if (record === null
    || record.version !== "cairn-critic-route-request-identity/v1"
    || record.taskTarget !== "local-task"
    || record.modelSelection !== "pinned"
    || record.modelResolution !== "exact"
    || record.systemPromptVersion !== "cairn-critic-system/v1"
    || record.modality !== "text"
    || record.toolPolicy !== "none") return null;

  const baseUrl = exactBaseUrl(record.baseUrl);
  const providerIdentity = machineToken(record.providerIdentity, 160);
  const configuredModel = exactConfiguredModel(record.configuredModel);
  const resolvedModelRevision = exactResolvedRevision(record.resolvedModelRevision);
  const connectionConsentVersion = machineToken(record.connectionConsentVersion, 256);
  const transportRevision = machineToken(record.transportRevision, 256);
  const requestSerializerSha256 = digest(record.requestSerializerSha256);
  const systemPromptSha256 = digest(record.systemPromptSha256);
  const policySha256 = digest(record.policySha256);
  if (baseUrl === null || providerIdentity === null || configuredModel === null
    || resolvedModelRevision === null || connectionConsentVersion === null
    || transportRevision === null || requestSerializerSha256 === null
    || systemPromptSha256 === null || policySha256 === null) return null;

  const generation = exactDataRecord(record.generation, GENERATION_KEYS);
  if (generation === null || !Object.is(generation.temperature, 0)
    || !Object.is(generation.topP, 1) || generation.maxOutputTokens !== 8_192) return null;
  const schemas = exactDataRecord(record.schemas, SCHEMA_KEYS);
  if (schemas === null || schemas.taskSpec !== "cairn-task-spec/v1"
    || schemas.packet !== "cairn-critic-packet/v1"
    || schemas.output !== "cairn-critic-output/v1") return null;

  return Object.freeze({
    version: "cairn-critic-route-request-identity/v1",
    taskTarget: "local-task",
    baseUrl,
    providerIdentity,
    modelSelection: "pinned",
    modelResolution: "exact",
    configuredModel,
    resolvedModelRevision,
    connectionConsentVersion,
    transportRevision,
    requestSerializerSha256,
    generation: Object.freeze({ temperature: 0, topP: 1, maxOutputTokens: 8_192 }),
    systemPromptVersion: "cairn-critic-system/v1",
    systemPromptSha256,
    schemas: Object.freeze({
      taskSpec: "cairn-task-spec/v1",
      packet: "cairn-critic-packet/v1",
      output: "cairn-critic-output/v1",
    }),
    policySha256,
    modality: "text",
    toolPolicy: "none",
  });
}

function quotedJsonString(value: string): string {
  let quoted = "\"";
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit === 0x22) quoted += "\\\"";
    else if (unit === 0x5c) quoted += "\\\\";
    else if (unit === 0x08) quoted += "\\b";
    else if (unit === 0x0c) quoted += "\\f";
    else if (unit === 0x0a) quoted += "\\n";
    else if (unit === 0x0d) quoted += "\\r";
    else if (unit === 0x09) quoted += "\\t";
    else if (unit < 0x20) quoted += `\\u${unit.toString(16).padStart(4, "0")}`;
    else quoted += value[index];
  }
  return `${quoted}\"`;
}

/**
 * Fixed field order is part of the activation identity. This serializer uses
 * only validated primitives; inherited object hooks cannot replace its bytes.
 */
function canonicalFingerprintIdentity(identity: CriticActivationIdentityV1): string {
  const text = quotedJsonString;
  return `{`
    + `\"fingerprintVersion\":${text("cairn-critic-route-request-fingerprint/v1")},`
    + `\"identityVersion\":${text(identity.version)},`
    + `\"taskTarget\":${text(identity.taskTarget)},`
    + `\"baseUrl\":${text(identity.baseUrl)},`
    + `\"providerIdentity\":${text(identity.providerIdentity)},`
    + `\"modelSelection\":${text(identity.modelSelection)},`
    + `\"modelResolution\":${text(identity.modelResolution)},`
    + `\"configuredModel\":${text(identity.configuredModel)},`
    + `\"resolvedModelRevision\":${text(identity.resolvedModelRevision)},`
    + `\"connectionConsentVersion\":${text(identity.connectionConsentVersion)},`
    + `\"transportRevision\":${text(identity.transportRevision)},`
    + `\"requestSerializerSha256\":${text(identity.requestSerializerSha256)},`
    + `\"generation\":{\"temperature\":0,\"topP\":1,\"maxOutputTokens\":8192},`
    + `\"systemPromptVersion\":${text(identity.systemPromptVersion)},`
    + `\"systemPromptSha256\":${text(identity.systemPromptSha256)},`
    + `\"schemas\":{\"taskSpec\":${text(identity.schemas.taskSpec)},`
    + `\"packet\":${text(identity.schemas.packet)},\"output\":${text(identity.schemas.output)}},`
    + `\"policySha256\":${text(identity.policySha256)},`
    + `\"modality\":${text(identity.modality)},`
    + `\"toolPolicy\":${text(identity.toolPolicy)}}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function loadCalibratedActivations(values: readonly unknown[]): readonly ValidatedActivation[] {
  const validated: ValidatedActivation[] = [];
  const fingerprints = new Set<string>();
  for (const value of values) {
    const literal = exactDataRecord(value, ACTIVATION_LITERAL_KEYS);
    const identity = literal === null ? null : parseIdentity(literal.identity);
    const expected = literal === null ? null : digest(literal.routeRequestFingerprintSha256);
    if (identity === null || expected === null) throw new Error("CRITIC_ACTIVATION_LITERAL_INVALID");
    const canonicalIdentity = canonicalFingerprintIdentity(identity);
    const actual = sha256(canonicalIdentity);
    if (actual !== expected) throw new Error("CRITIC_ACTIVATION_FINGERPRINT_MISMATCH");
    if (fingerprints.has(actual)) throw new Error("CRITIC_ACTIVATION_DUPLICATE");
    fingerprints.add(actual);
    validated.push(Object.freeze({
      canonicalIdentity,
      routeRequestFingerprintSha256: actual,
    }));
  }
  return Object.freeze(validated);
}

const CALIBRATED_ACTIVATIONS = loadCalibratedActivations(CALIBRATED_ACTIVATION_LITERALS);

/**
 * The only positive gate. Malformed identities and valid but uncalibrated
 * identities remain visibly distinct, but both fail closed.
 */
export function criticActivationStatus(value: unknown): CriticActivationResultV1 {
  const identity = parseIdentity(value);
  if (identity === null) return INVALID;
  const canonicalIdentity = canonicalFingerprintIdentity(identity);
  const routeRequestFingerprintSha256 = sha256(canonicalIdentity);
  const active = CALIBRATED_ACTIVATIONS.some((entry) =>
    entry.routeRequestFingerprintSha256 === routeRequestFingerprintSha256
    && entry.canonicalIdentity === canonicalIdentity);
  return Object.freeze(active
    ? { kind: "active", routeRequestFingerprintSha256 } as const
    : {
        kind: "inactive",
        code: "CRITIC_ACTIVATION_NOT_CALIBRATED",
        routeRequestFingerprintSha256,
      } as const);
}

/** A read-only test/diagnostic fact; no registry collection is exposed. */
export function activeCriticActivationCount(): number {
  return CALIBRATED_ACTIVATIONS.length;
}
