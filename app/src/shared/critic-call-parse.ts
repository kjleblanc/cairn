import { types as nodeTypes } from "node:util";

import {
  CRITIC_CALL_ACTIONS_BY_MODE,
  CRITIC_CALL_ATTEMPT_CAP,
  CRITIC_CALL_CREDENTIAL_TEXT_BY_KIND,
  CRITIC_CALL_DISCLOSURE_VERSION,
  CRITIC_CALL_FILE_CAP,
  CRITIC_CALL_NOT_SENT_BY_KIND,
  CRITIC_CALL_OUTPUT_CHARACTER_CAP,
  CRITIC_CALL_PER_FILE_CHARACTER_CAP,
  CRITIC_CALL_PURPOSE_BY_KIND,
  CRITIC_CALL_REQUEST_CHARACTER_CAP,
  CRITIC_CALL_TIMEOUT_MS_CAP,
  CRITIC_CALL_TOTAL_CHARACTER_CAP,
  PLAN_METADATA_ITEM_CAP,
  PLAN_METADATA_KEYS,
  type CriticCallDecisionRequest,
  type CriticCallDisclosureV1,
  type CriticCallCalibrationViewV1,
  type CriticCallSelectedFileViewV1,
} from "./critic-call.js";

/**
 * The main-side parsers.
 *
 * They live apart from the card's types and constants because they need
 * Node's proxy detection, and the renderer imports those constants as values —
 * a `node:util` import in that path would break the renderer bundle. The
 * renderer never parses a card; it only displays one and echoes it back.
 */

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const FORBIDDEN_VISIBLE_CONTROLS = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/u;

type InspectedRecord = Record<string, unknown>;

const DISCLOSURE_KEYS = Object.freeze([
  "version", "approvalId", "callKind", "mode", "attempt", "attemptCap", "provider", "baseUrl", "configuredModel",
  "resolvedModel", "resolvedModelRevision", "connectionConsentVersion", "routeRequestFingerprintSha256",
  "purpose", "notSent", "credentialText", "selection", "selectedFiles", "selectedCharacters", "planMetadata", "calibration",
  "totalRequestCharacters", "fileCap", "perFileCharacterCap",
  "totalCharacterCap", "timeoutMs", "maxOutputCharacters", "billingBasis", "actions",
] as const);

function validUtf16(value: string): boolean {
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

function safeText(value: unknown, cap = 512): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= cap && validUtf16(value)
    && !FORBIDDEN_VISIBLE_CONTROLS.test(value)
    ? value
    : null;
}

function inspectRecord(value: unknown, keys: readonly string[]): InspectedRecord | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || nodeTypes.isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))) return null;
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) return null;
      output[key] = descriptor.value;
    }
    return output;
  } catch {
    return null;
  }
}

function inspectArray(value: unknown, cap: number): readonly unknown[] | null {
  try {
    if (!Array.isArray(value) || nodeTypes.isProxy(value) || value.length > cap) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key === "symbol" || (key !== "length" && !/^(?:0|[1-9]\d*)$/u.test(key)))) return null;
    if (keys.length !== value.length + 1) return null;
    const output: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) return null;
      output.push(descriptor.value);
    }
    return output;
  } catch {
    return null;
  }
}

function wholeCount(value: unknown, max: number): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && !Object.is(value, -0)
    && value >= 0 && value <= max
    ? value
    : null;
}

/**
 * A path the packet already disclosed. The card must never be able to show an
 * absolute path, a drive path, a traversal, or a reserved area even if some
 * future caller hands one over.
 */
function safeProjectRelativePath(value: unknown): string | null {
  const path = safeText(value, 1_000);
  if (path === null || path.includes("\\") || path.startsWith("/") || /^[A-Za-z]:/u.test(path)) return null;
  if (path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) return null;
  return /(?:^|\/)(?:\.git|\.cairn|node_modules)(?:\/|$)/u.test(path) ? null : path;
}

function parseSelectedFile(value: unknown): CriticCallSelectedFileViewV1 | null {
  const row = inspectRecord(value, ["path", "sha256", "characters"]);
  if (row === null) return null;
  const path = safeProjectRelativePath(row.path);
  const sha256 = typeof row.sha256 === "string" && SHA256.test(row.sha256) ? row.sha256 : null;
  const characters = wholeCount(row.characters, CRITIC_CALL_PER_FILE_CHARACTER_CAP);
  if (path === null || sha256 === null || characters === null) return null;
  return Object.freeze({ path, sha256, characters });
}

function parseCalibration(value: unknown, selection: readonly CriticCallSelectedFileViewV1[]): CriticCallCalibrationViewV1 | null {
  const record = inspectRecord(value, [
    "manifestSha256", "fixtureId", "fixtureIndex", "fixtureCount", "fixtureSha256", "packetSha256",
    "requestSha256", "requestBodySha256", "text",
  ]);
  if (record === null || typeof record.fixtureId !== "string" || !/^C\d{2}$/u.test(record.fixtureId)) return null;
  for (const key of ["manifestSha256", "fixtureSha256", "packetSha256", "requestSha256", "requestBodySha256"] as const) {
    if (typeof record[key] !== "string" || !SHA256.test(record[key])) return null;
  }
  const fixtureCount = wholeCount(record.fixtureCount, 16);
  const fixtureIndex = wholeCount(record.fixtureIndex, fixtureCount ?? 0);
  const items = inspectArray(record.text, CRITIC_CALL_FILE_CAP);
  if (fixtureCount === null || fixtureCount < 1 || fixtureIndex === null || fixtureIndex < 1 || items === null
    || items.length !== selection.length) return null;
  const text: Array<{ path: string; sha256: string; content: string }> = [];
  for (let index = 0; index < items.length; index += 1) {
    const row = inspectRecord(items[index], ["path", "sha256", "content"]);
    const selected = selection[index];
    if (row === null || selected === undefined || row.path !== selected.path || row.sha256 !== selected.sha256
      || typeof row.content !== "string" || row.content.length !== selected.characters
      || row.content.length > CRITIC_CALL_PER_FILE_CHARACTER_CAP) return null;
    text.push(Object.freeze({ path: selected.path, sha256: selected.sha256, content: row.content }));
  }
  return Object.freeze({
    manifestSha256: record.manifestSha256 as string,
    fixtureId: record.fixtureId,
    fixtureIndex,
    fixtureCount,
    fixtureSha256: record.fixtureSha256 as string,
    packetSha256: record.packetSha256 as string,
    requestSha256: record.requestSha256 as string,
    requestBodySha256: record.requestBodySha256 as string,
    text: Object.freeze(text),
  });
}

/**
 * The renderer's echo, re-parsed on the way back in. It is compared against a
 * freshly derived card, so this only has to refuse anything malformed — it
 * never has to decide whether a value is true.
 */
export function parseCriticCallDisclosure(value: unknown): CriticCallDisclosureV1 | null {
  const record = inspectRecord(value, DISCLOSURE_KEYS);
  if (record === null || record.version !== CRITIC_CALL_DISCLOSURE_VERSION) return null;

  const mode = record.mode === "required" || record.mode === "optional" ? record.mode : null;
  const callKind = record.callKind === "provider" || record.callKind === "synthetic-calibration" ? record.callKind : null;
  const approvalId = typeof record.approvalId === "string" && UUID_V4.test(record.approvalId) ? record.approvalId : null;
  const provider = safeText(record.provider, 256);
  const baseUrl = safeText(record.baseUrl, 512);
  const configuredModel = safeText(record.configuredModel, 256);
  const resolvedModel = safeText(record.resolvedModel, 256);
  const resolvedModelRevision = safeText(record.resolvedModelRevision, 256);
  const connectionConsentVersion = safeText(record.connectionConsentVersion, 256);
  const billingBasis = safeText(record.billingBasis, 256);
  const fingerprint = typeof record.routeRequestFingerprintSha256 === "string"
    && SHA256.test(record.routeRequestFingerprintSha256)
    ? record.routeRequestFingerprintSha256
    : null;
  if (mode === null || callKind === null || approvalId === null || provider === null || baseUrl === null || configuredModel === null
    || resolvedModel === null || resolvedModelRevision === null || connectionConsentVersion === null
    || billingBasis === null || fingerprint === null) return null;

  const attemptCap = wholeCount(record.attemptCap, CRITIC_CALL_ATTEMPT_CAP);
  const attempt = wholeCount(record.attempt, attemptCap ?? 0);
  const fileCap = wholeCount(record.fileCap, CRITIC_CALL_FILE_CAP);
  const perFileCharacterCap = wholeCount(record.perFileCharacterCap, CRITIC_CALL_PER_FILE_CHARACTER_CAP);
  const totalCharacterCap = wholeCount(record.totalCharacterCap, CRITIC_CALL_TOTAL_CHARACTER_CAP);
  const timeoutMs = wholeCount(record.timeoutMs, CRITIC_CALL_TIMEOUT_MS_CAP);
  const maxOutputCharacters = wholeCount(record.maxOutputCharacters, CRITIC_CALL_OUTPUT_CHARACTER_CAP);
  if (attemptCap === null || attempt === null || attempt < 1 || fileCap === null || perFileCharacterCap === null
    || totalCharacterCap === null || timeoutMs === null || timeoutMs < 1 || maxOutputCharacters === null) return null;

  const expectedNotSent = CRITIC_CALL_NOT_SENT_BY_KIND[callKind];
  const expectedCredentialText = CRITIC_CALL_CREDENTIAL_TEXT_BY_KIND[callKind];
  const expectedPurpose = CRITIC_CALL_PURPOSE_BY_KIND[callKind];
  const notSentItems = inspectArray(record.notSent, expectedNotSent.length);
  if (notSentItems === null || notSentItems.length !== expectedNotSent.length
    || notSentItems.some((item, index) => item !== expectedNotSent[index])
    || record.credentialText !== expectedCredentialText || record.purpose !== expectedPurpose) return null;

  const actionItems = inspectArray(record.actions, 2);
  const expectedActions = CRITIC_CALL_ACTIONS_BY_MODE[mode];
  if (actionItems === null || actionItems.length !== expectedActions.length
    || actionItems.some((item, index) => item !== expectedActions[index])) return null;

  const selectionItems = inspectArray(record.selection, CRITIC_CALL_FILE_CAP);
  if (selectionItems === null) return null;
  const selection: CriticCallSelectedFileViewV1[] = [];
  let characters = 0;
  const seen = new Set<string>();
  for (const item of selectionItems) {
    const row = parseSelectedFile(item);
    if (row === null || seen.has(row.path)) return null;
    seen.add(row.path);
    characters += row.characters;
    selection.push(row);
  }
  if (selection.length > fileCap || characters > totalCharacterCap) return null;

  const metadataRecord = inspectRecord(record.planMetadata, PLAN_METADATA_KEYS);
  if (metadataRecord === null) return null;
  const metadataCounts = PLAN_METADATA_KEYS.map((key) => wholeCount(metadataRecord[key], PLAN_METADATA_ITEM_CAP));
  const totalRequestCharacters = wholeCount(record.totalRequestCharacters, CRITIC_CALL_REQUEST_CHARACTER_CAP);
  if (metadataCounts.some((count) => count === null) || totalRequestCharacters === null) return null;

  const selectedFiles = wholeCount(record.selectedFiles, CRITIC_CALL_FILE_CAP);
  const selectedCharacters = wholeCount(record.selectedCharacters, CRITIC_CALL_TOTAL_CHARACTER_CAP);
  // The stated totals must be the totals of the rows shown. A card that
  // undercounts what it is about to send is the one lie that matters most.
  if (selectedFiles !== selection.length || selectedCharacters !== characters) return null;
  // The whole request cannot be smaller than the file contents inside it.
  if (totalRequestCharacters < characters) return null;
  const calibration = record.calibration === null ? null : parseCalibration(record.calibration, selection);
  if ((callKind === "provider") !== (calibration === null)) return null;

  return Object.freeze({
    version: CRITIC_CALL_DISCLOSURE_VERSION,
    approvalId,
    callKind,
    mode,
    attempt,
    attemptCap,
    provider,
    baseUrl,
    configuredModel,
    resolvedModel,
    resolvedModelRevision,
    connectionConsentVersion,
    routeRequestFingerprintSha256: fingerprint,
    purpose: expectedPurpose,
    notSent: expectedNotSent,
    credentialText: expectedCredentialText,
    selection: Object.freeze(selection),
    selectedFiles,
    selectedCharacters,
    planMetadata: Object.freeze({
      checks: metadataCounts[0] as number,
      preferences: metadataCounts[1] as number,
      references: metadataCounts[2] as number,
      evidenceItems: metadataCounts[3] as number,
      priorFindings: metadataCounts[4] as number,
      comparisonTrials: metadataCounts[5] as number,
    }),
    calibration,
    totalRequestCharacters,
    fileCap,
    perFileCharacterCap,
    totalCharacterCap,
    timeoutMs,
    maxOutputCharacters,
    billingBasis,
    actions: expectedActions,
  });
}

export function parseCriticCallDecisionRequest(value: unknown): CriticCallDecisionRequest | null {
  const record = inspectRecord(value, ["dir", "approvalId", "action", "disclosure"]);
  if (record === null) return null;
  const dir = typeof record.dir === "string" && record.dir.length > 0 && record.dir.length <= 32_767 ? record.dir : null;
  const approvalId = typeof record.approvalId === "string" && UUID_V4.test(record.approvalId) ? record.approvalId : null;
  const action = record.action === "approve" || record.action === "stop-task" || record.action === "continue-without-critic"
    ? record.action
    : null;
  const disclosure = parseCriticCallDisclosure(record.disclosure);
  if (dir === null || approvalId === null || action === null || disclosure === null) return null;
  // The press must be one the card itself offered, and it must name that card.
  if (!disclosure.actions.includes(action) || disclosure.approvalId !== approvalId) return null;
  return Object.freeze({ dir, approvalId, action, disclosure });
}
