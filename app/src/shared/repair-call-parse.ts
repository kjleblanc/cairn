import { types as nodeTypes } from "node:util";

import {
  REPAIR_CALL_ACTIONS,
  REPAIR_CALL_ATTEMPT,
  REPAIR_CALL_ATTEMPT_CAP,
  REPAIR_CALL_CAPTURED_OUTPUT_BYTES_CAP,
  REPAIR_CALL_DISCLOSURE_VERSION,
  REPAIR_CALL_PURPOSE_TEXT,
  REPAIR_CALL_ROUND,
  REPAIR_CALL_TIMEOUT_MS_CAP,
  type RepairCallArtifactViewV1,
  type RepairCallBlockerViewV1,
  type RepairCallDecisionRequest,
  type RepairCallDisclosureV1,
} from "./repair-call.js";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const MACHINE_ID = /^[a-z][a-z0-9._:-]{0,127}$/u;
const CRITERION_ID = /^c[1-9][0-9]*$/u;
const FORBIDDEN_VISIBLE_CONTROLS = /[\u0000\u202a-\u202e\u2066-\u2069]/u;
const FORBIDDEN_PATH_CONTROLS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;
const DISCLOSURE_KEYS = Object.freeze([
  "version", "approvalId", "provider", "model", "purpose", "dataScope", "quota", "taskNumber", "round", "attempt", "attemptCap",
  "taskSpecSha256", "evidencePlanSha256", "candidateSha256", "repairInstructionSha256", "repairPreviewSha256",
  "blockerAuthoritySha256", "routeReceiptSha256", "routeRequestFingerprintSha256", "blockers",
  "timeoutMs", "maxCapturedOutputBytes", "billingBasis", "actions",
] as const);

type InspectedRecord = Record<string, unknown>;

function isProxy(value: object): boolean {
  try { return nodeTypes.isProxy(value); } catch { return true; }
}

/** Inspect descriptors without reading a caller-owned accessor. */
function inspectRecord(value: unknown, keys: readonly string[]): InspectedRecord | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (!descriptor || !descriptor.enumerable || descriptor.get || descriptor.set || !("value" in descriptor)) return null;
      output[key] = descriptor.value;
    }
    return output;
  } catch {
    return null;
  }
}

/** Inspect a dense ordinary array without invoking iteration hooks. */
function inspectArray(value: unknown, cap: number): readonly unknown[] | null {
  try {
    if (value === null || typeof value !== "object" || isProxy(value) || !Array.isArray(value)
      || Object.getPrototypeOf(value) !== Array.prototype) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const lengthDescriptor = descriptors.length;
    if (!lengthDescriptor || lengthDescriptor.enumerable || lengthDescriptor.get || lengthDescriptor.set
      || !("value" in lengthDescriptor) || !Number.isSafeInteger(lengthDescriptor.value)
      || lengthDescriptor.value < 0 || lengthDescriptor.value > cap) return null;
    const length = lengthDescriptor.value as number;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== length + 1 || keys.some((key) => typeof key !== "string"
      || (key !== "length" && !/^(?:0|[1-9][0-9]*)$/u.test(key)))) return null;
    const output: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !descriptor.enumerable || descriptor.get || descriptor.set || !("value" in descriptor)) return null;
      output.push(descriptor.value);
    }
    return output;
  } catch {
    return null;
  }
}

function validUtf16(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      if (index + 1 >= value.length) return false;
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}

function safeText(value: unknown, cap: number): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= cap && validUtf16(value)
    && !FORBIDDEN_VISIBLE_CONTROLS.test(value) ? value : null;
}

function safeCount(value: unknown, minimum: number, maximum: number): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && !Object.is(value, -0)
    && value >= minimum && value <= maximum ? value : null;
}

function parseArtifact(value: unknown): RepairCallArtifactViewV1 | null {
  const record = inspectRecord(value, ["kind", "id"]);
  if (record === null || (record.kind !== "adapter-command-attestation" && record.kind !== "packet-artifact"
    && record.kind !== "owner-observation" && record.kind !== "comparison-capture")
    || typeof record.id !== "string" || !MACHINE_ID.test(record.id)) return null;
  return Object.freeze({ kind: record.kind, id: record.id });
}

function parseBlocker(value: unknown): RepairCallBlockerViewV1 | null {
  const record = inspectRecord(value, [
    "criterionId", "promise", "failureConditionId", "failureCondition", "source", "sourceSha256", "artifacts",
  ]);
  if (record === null || typeof record.criterionId !== "string" || !CRITERION_ID.test(record.criterionId)
    || typeof record.failureConditionId !== "string" || !MACHINE_ID.test(record.failureConditionId)
    || (record.source !== "cairn" && record.source !== "owner" && record.source !== "critic")
    || typeof record.sourceSha256 !== "string" || !SHA256.test(record.sourceSha256)) return null;
  const promise = safeText(record.promise, 4_000);
  const failureCondition = safeText(record.failureCondition, 4_000);
  const rows = inspectArray(record.artifacts, 8);
  if (promise === null || failureCondition === null || rows === null || rows.length === 0) return null;
  const artifacts: RepairCallArtifactViewV1[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const artifact = parseArtifact(row);
    const identity = artifact === null ? null : `${artifact.kind}\u0000${artifact.id}`;
    if (artifact === null || identity === null || seen.has(identity)) return null;
    seen.add(identity);
    artifacts.push(artifact);
  }
  return Object.freeze({
    criterionId: record.criterionId as `c${number}`,
    promise,
    failureConditionId: record.failureConditionId,
    failureCondition,
    source: record.source,
    sourceSha256: record.sourceSha256,
    artifacts: Object.freeze(artifacts),
  });
}

export function parseRepairCallDisclosure(value: unknown): RepairCallDisclosureV1 | null {
  const record = inspectRecord(value, DISCLOSURE_KEYS);
  if (record === null || record.version !== REPAIR_CALL_DISCLOSURE_VERSION
    || record.purpose !== REPAIR_CALL_PURPOSE_TEXT || record.round !== REPAIR_CALL_ROUND
    || record.attempt !== REPAIR_CALL_ATTEMPT || record.attemptCap !== REPAIR_CALL_ATTEMPT_CAP) return null;
  const approvalId = typeof record.approvalId === "string" && UUID_V4.test(record.approvalId) ? record.approvalId : null;
  const provider = safeText(record.provider, 256);
  const model = safeText(record.model, 256);
  const dataScope = safeText(record.dataScope, 4_000);
  const quota = safeText(record.quota, 4_000);
  const taskNumber = safeCount(record.taskNumber, 1, 1_000_000_000);
  const timeoutMs = safeCount(record.timeoutMs, 1, REPAIR_CALL_TIMEOUT_MS_CAP);
  const maxCapturedOutputBytes = safeCount(record.maxCapturedOutputBytes, 1, REPAIR_CALL_CAPTURED_OUTPUT_BYTES_CAP);
  const billingBasis = safeText(record.billingBasis, 1_000);
  if (approvalId === null || provider === null || model === null || dataScope === null || quota === null
    || taskNumber === null || timeoutMs === null || maxCapturedOutputBytes === null || billingBasis === null) return null;

  for (const key of [
    "taskSpecSha256", "evidencePlanSha256", "candidateSha256", "repairInstructionSha256", "repairPreviewSha256",
    "blockerAuthoritySha256", "routeReceiptSha256", "routeRequestFingerprintSha256",
  ] as const) {
    if (typeof record[key] !== "string" || !SHA256.test(record[key])) return null;
  }

  const blockerRows = inspectArray(record.blockers, 12);
  if (blockerRows === null || blockerRows.length === 0) return null;
  const blockers: RepairCallBlockerViewV1[] = [];
  const criterionIds = new Set<string>();
  for (const row of blockerRows) {
    const blocker = parseBlocker(row);
    if (blocker === null || criterionIds.has(blocker.criterionId)) return null;
    criterionIds.add(blocker.criterionId);
    blockers.push(blocker);
  }

  const actions = inspectArray(record.actions, REPAIR_CALL_ACTIONS.length);
  if (actions === null || actions.length !== REPAIR_CALL_ACTIONS.length
    || actions.some((action, index) => action !== REPAIR_CALL_ACTIONS[index])) return null;

  return Object.freeze({
    version: REPAIR_CALL_DISCLOSURE_VERSION,
    approvalId,
    provider,
    model,
    purpose: REPAIR_CALL_PURPOSE_TEXT,
    dataScope,
    quota,
    taskNumber,
    round: REPAIR_CALL_ROUND,
    attempt: REPAIR_CALL_ATTEMPT,
    attemptCap: REPAIR_CALL_ATTEMPT_CAP,
    taskSpecSha256: record.taskSpecSha256 as string,
    evidencePlanSha256: record.evidencePlanSha256 as string,
    candidateSha256: record.candidateSha256 as string,
    repairInstructionSha256: record.repairInstructionSha256 as string,
    repairPreviewSha256: record.repairPreviewSha256 as string,
    blockerAuthoritySha256: record.blockerAuthoritySha256 as string,
    routeReceiptSha256: record.routeReceiptSha256 as string,
    routeRequestFingerprintSha256: record.routeRequestFingerprintSha256 as string,
    blockers: Object.freeze(blockers),
    timeoutMs,
    maxCapturedOutputBytes,
    billingBasis,
    actions: REPAIR_CALL_ACTIONS,
  });
}

export function parseRepairCallDecisionRequest(value: unknown): RepairCallDecisionRequest | null {
  const record = inspectRecord(value, ["dir", "approvalId", "action", "disclosure"]);
  if (record === null || typeof record.approvalId !== "string" || !UUID_V4.test(record.approvalId)
    || (record.action !== "approve" && record.action !== "stop-task")) return null;
  const dir = safeText(record.dir, 4_000);
  const disclosure = parseRepairCallDisclosure(record.disclosure);
  if (dir === null || FORBIDDEN_PATH_CONTROLS.test(dir) || disclosure === null
    || disclosure.approvalId !== record.approvalId) return null;
  return Object.freeze({ dir, approvalId: record.approvalId, action: record.action, disclosure });
}
