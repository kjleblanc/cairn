import { randomUUID } from "node:crypto";
import { types as nodeTypes } from "node:util";

import {
  previewSerialCandidateQ9HarnessRevision,
  serialCandidateQ9HarnessFailure,
  serialQ9HarnessFailureSha256,
  type EvidencePlanRevisionPreviewV1,
  type SerialCandidateV1,
  type SerialQ9HarnessFailureV1,
} from "@cairn/core";

import {
  Q9_HARNESS_REVISION_ACTIONS,
  Q9_HARNESS_REVISION_BILLING,
  Q9_HARNESS_REVISION_DATA_SCOPE,
  Q9_HARNESS_REVISION_DECISION_VERSION,
  Q9_HARNESS_REVISION_DISCLOSURE_VERSION,
  Q9_HARNESS_REVISION_PURPOSE,
  canonicalQ9HarnessRevisionDisclosure,
  type Q9HarnessRevisionDecisionV1,
  type Q9HarnessRevisionDisclosureV1,
} from "../shared/harness-revision.js";
import { canonicalProjectKey } from "./conductor/turnauth.js";

export const Q9_HARNESS_REVISION_PREFLIGHT_VERSION =
  "cairn-q9-harness-revision-preflight/v1" as const;

export type PreparedQ9HarnessRevisionV1 = Readonly<{
  candidate: SerialCandidateV1;
  failure: SerialQ9HarnessFailureV1;
  preview: EvidencePlanRevisionPreviewV1;
  disclosure: Q9HarnessRevisionDisclosureV1;
}>;

export type Q9HarnessRevisionDecisionPreflightV1 = Readonly<{
  version: typeof Q9_HARNESS_REVISION_PREFLIGHT_VERSION;
}>;

export type Q9HarnessRevisionDecisionRefusal =
  | "Q9_HARNESS_DECISION_MALFORMED"
  | "Q9_HARNESS_DECISION_UNKNOWN_APPROVAL"
  | "Q9_HARNESS_DECISION_ECHO_MISMATCH";

export type Q9HarnessRevisionDecisionPreflightOutcome =
  | Readonly<{
      ok: true;
      decision: Q9HarnessRevisionDecisionV1;
      preflight: Q9HarnessRevisionDecisionPreflightV1;
    }>
  | Readonly<{ ok: false; code: Q9HarnessRevisionDecisionRefusal }>;

export type Q9HarnessRevisionDecisionCommitOutcome =
  | Readonly<{ ok: true; decision: Q9HarnessRevisionDecisionV1 }>
  | Readonly<{ ok: false; code: Q9HarnessRevisionDecisionRefusal }>;

type Held = Readonly<{
  projectKey: string;
  approvalId: string;
  prepared: PreparedQ9HarnessRevisionV1;
  canonical: string;
}>;

const pendingByProject = new Map<string, Held>();
const pendingByApproval = new Map<string, Held>();
const preflightBindings = new WeakMap<object, Readonly<{
  held: Held;
  decision: Q9HarnessRevisionDecisionV1;
}>>();
const issuedApprovalIds = new Set<string>();
const SHA256 = /^[a-f0-9]{64}$/u;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const CRITERION_ID = /^c[1-9][0-9]*$/u;
const EVIDENCE_REF = /^q9-harness-[a-f0-9]{24}$/u;
const MAX_PENDING = 64;

function inspectRecord(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || nodeTypes.isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (!descriptor || !descriptor.enumerable || descriptor.get || descriptor.set || !("value" in descriptor)) return null;
      result[key] = descriptor.value;
    }
    return result;
  } catch {
    return null;
  }
}

function exactActions(value: unknown): boolean {
  try {
    if (!Array.isArray(value) || nodeTypes.isProxy(value) || value.length !== 2) return false;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== 3 || keys.some((key) => typeof key !== "string" || !["0", "1", "length"].includes(key))) return false;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    return ["0", "1"].every((key) => {
      const descriptor = descriptors[key];
      return !!descriptor && descriptor.enumerable && !descriptor.get && !descriptor.set && "value" in descriptor;
    }) && descriptors["0"].value === Q9_HARNESS_REVISION_ACTIONS[0]
      && descriptors["1"].value === Q9_HARNESS_REVISION_ACTIONS[1];
  } catch {
    return false;
  }
}

function parseDisclosure(value: unknown): Q9HarnessRevisionDisclosureV1 | null {
  const row = inspectRecord(value, [
    "version", "approvalId", "taskNumber", "criterionId", "failureCode", "exitCode", "boundedOutput",
    "outputSha256", "failureSha256", "evidenceRef", "taskSpecSha256", "fromEvidencePlanSha256",
    "toEvidencePlanSha256", "changeKind", "originalTimeoutMs", "revisedTimeoutMs", "purpose", "dataScope",
    "billingBasis", "actions",
  ]);
  const invalid = (_reason: string): null => null;
  if (!row) return invalid("record");
  if (row.version !== Q9_HARNESS_REVISION_DISCLOSURE_VERSION) return invalid("version");
  if (typeof row.approvalId !== "string" || !UUID_V4.test(row.approvalId)) return invalid("approval");
  if (!Number.isSafeInteger(row.taskNumber) || (row.taskNumber as number) < 1) return invalid("task");
  if (typeof row.criterionId !== "string" || !CRITERION_ID.test(row.criterionId)) return invalid("criterion");
  if (row.failureCode !== "TIMED_OUT_BEFORE_ASSERTION" || row.exitCode !== 124) return invalid("failure");
  if (typeof row.boundedOutput !== "string" || row.boundedOutput.length === 0 || row.boundedOutput.length > 4_096) return invalid("output");
  if ([row.outputSha256, row.failureSha256, row.taskSpecSha256, row.fromEvidencePlanSha256, row.toEvidencePlanSha256]
    .some((entry) => typeof entry !== "string" || !SHA256.test(entry))) return invalid("sha");
  if (typeof row.evidenceRef !== "string" || !EVIDENCE_REF.test(row.evidenceRef)) return invalid("evidence");
  if (row.changeKind !== "timeout-increase" || row.originalTimeoutMs !== 1_000 || row.revisedTimeoutMs !== 60_000) return invalid("change");
  if (row.purpose !== Q9_HARNESS_REVISION_PURPOSE || row.dataScope !== Q9_HARNESS_REVISION_DATA_SCOPE) return invalid("scope");
  if (row.billingBasis !== Q9_HARNESS_REVISION_BILLING || !exactActions(row.actions)) return invalid("billing-actions");
  return Object.freeze({
    version: Q9_HARNESS_REVISION_DISCLOSURE_VERSION,
    approvalId: row.approvalId,
    taskNumber: row.taskNumber,
    criterionId: row.criterionId,
    failureCode: "TIMED_OUT_BEFORE_ASSERTION",
    exitCode: 124,
    boundedOutput: row.boundedOutput,
    outputSha256: row.outputSha256,
    failureSha256: row.failureSha256,
    evidenceRef: row.evidenceRef,
    taskSpecSha256: row.taskSpecSha256,
    fromEvidencePlanSha256: row.fromEvidencePlanSha256,
    toEvidencePlanSha256: row.toEvidencePlanSha256,
    changeKind: "timeout-increase",
    originalTimeoutMs: 1_000,
    revisedTimeoutMs: 60_000,
    purpose: Q9_HARNESS_REVISION_PURPOSE,
    dataScope: Q9_HARNESS_REVISION_DATA_SCOPE,
    billingBasis: Q9_HARNESS_REVISION_BILLING,
    actions: Q9_HARNESS_REVISION_ACTIONS,
  } as Q9HarnessRevisionDisclosureV1);
}

function projectKey(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 4_096 || value.includes("\0")) return null;
  try { return canonicalProjectKey(value); } catch { return null; }
}

/** Derive the complete card and retain the exact Core-branded failure/preview
 * in Main. Nothing supplied by the renderer can select a command or change. */
export function openQ9HarnessRevisionApproval(value: unknown): PreparedQ9HarnessRevisionV1 | null {
  const input = inspectRecord(value, ["dir", "candidate"]);
  const key = input ? projectKey(input.dir) : null;
  if (!input || key === null || typeof input.candidate !== "object" || input.candidate === null
    || pendingByProject.has(key) || pendingByProject.size >= MAX_PENDING) return null;
  const candidate = input.candidate as SerialCandidateV1;
  const failure = serialCandidateQ9HarnessFailure(candidate);
  const failureSha256 = serialQ9HarnessFailureSha256(failure);
  const preview = failure ? previewSerialCandidateQ9HarnessRevision(candidate, failure) : null;
  if (!failure || !failureSha256 || !preview || preview.changeKind !== "timeout-increase"
    || preview.fromPlanSha256 !== candidate.evidencePlanSha256
    || preview.taskSpecSha256 !== candidate.taskSpecSha256) return null;
  const before = candidate.lineage.evidencePlan.procedures.find((row) => row.criterionId === failure.criterionId);
  const after = preview.plan.procedures.find((row) => row.criterionId === failure.criterionId);
  if (!before?.command || !after?.command || before.command.timeoutMs !== 1_000 || after.command.timeoutMs !== 60_000) return null;
  let approvalId: string | null = null;
  for (let attempt = 0; attempt < 4 && approvalId === null; attempt += 1) {
    const next = randomUUID();
    if (!issuedApprovalIds.has(next)) approvalId = next;
  }
  if (approvalId === null) return null;
  const rawDisclosure = Object.freeze({
    version: Q9_HARNESS_REVISION_DISCLOSURE_VERSION,
    approvalId,
    taskNumber: candidate.taskNumber,
    criterionId: failure.criterionId,
    failureCode: failure.code,
    exitCode: failure.exitCode,
    boundedOutput: failure.boundedOutput,
    outputSha256: failure.outputSha256,
    failureSha256,
    evidenceRef: failure.evidenceRef,
    taskSpecSha256: candidate.taskSpecSha256,
    fromEvidencePlanSha256: preview.fromPlanSha256,
    toEvidencePlanSha256: preview.toPlanSha256,
    changeKind: preview.changeKind,
    originalTimeoutMs: before.command.timeoutMs,
    revisedTimeoutMs: after.command.timeoutMs,
    purpose: Q9_HARNESS_REVISION_PURPOSE,
    dataScope: Q9_HARNESS_REVISION_DATA_SCOPE,
    billingBasis: Q9_HARNESS_REVISION_BILLING,
    actions: Q9_HARNESS_REVISION_ACTIONS,
  });
  const disclosure = parseDisclosure(rawDisclosure);
  if (!disclosure) return null;
  const prepared = Object.freeze({ candidate, failure, preview, disclosure });
  const held = Object.freeze({ projectKey: key, approvalId, prepared, canonical: canonicalQ9HarnessRevisionDisclosure(disclosure) });
  pendingByProject.set(key, held);
  pendingByApproval.set(approvalId, held);
  issuedApprovalIds.add(approvalId);
  return prepared;
}

export function clearQ9HarnessRevisionApprovalIfCurrent(
  dir: string,
  disclosure: Q9HarnessRevisionDisclosureV1,
): boolean {
  const key = projectKey(dir);
  const held = key ? pendingByProject.get(key) : undefined;
  if (!held || held.prepared.disclosure !== disclosure) return false;
  pendingByProject.delete(held.projectKey);
  pendingByApproval.delete(held.approvalId);
  return true;
}

export function preflightQ9HarnessRevisionDecision(value: unknown): Q9HarnessRevisionDecisionPreflightOutcome {
  const request = inspectRecord(value, ["dir", "approvalId", "action", "disclosure"]);
  const key = request ? projectKey(request.dir) : null;
  if (!request || key === null || typeof request.approvalId !== "string"
    || (request.action !== "approve-revision" && request.action !== "stop-task")) {
    return Object.freeze({ ok: false, code: "Q9_HARNESS_DECISION_MALFORMED" });
  }
  const echoed = parseDisclosure(request.disclosure);
  if (!echoed) return Object.freeze({ ok: false, code: "Q9_HARNESS_DECISION_MALFORMED" });
  const held = pendingByApproval.get(request.approvalId);
  if (!held || held.projectKey !== key || pendingByProject.get(key) !== held) {
    return Object.freeze({ ok: false, code: "Q9_HARNESS_DECISION_UNKNOWN_APPROVAL" });
  }
  if (canonicalQ9HarnessRevisionDisclosure(echoed) !== held.canonical) {
    return Object.freeze({ ok: false, code: "Q9_HARNESS_DECISION_ECHO_MISMATCH" });
  }
  const decision = Object.freeze({
    version: Q9_HARNESS_REVISION_DECISION_VERSION,
    approvalId: held.approvalId,
    outcome: request.action === "approve-revision" ? "approved" as const : "task-stopped" as const,
  });
  const preflight = Object.freeze({ version: Q9_HARNESS_REVISION_PREFLIGHT_VERSION });
  preflightBindings.set(preflight, Object.freeze({ held, decision }));
  return Object.freeze({ ok: true, decision, preflight });
}

export function commitQ9HarnessRevisionDecision(
  preflight: Q9HarnessRevisionDecisionPreflightV1,
): Q9HarnessRevisionDecisionCommitOutcome {
  const binding = preflightBindings.get(preflight);
  if (!binding || pendingByProject.get(binding.held.projectKey) !== binding.held
    || pendingByApproval.get(binding.held.approvalId) !== binding.held) {
    return Object.freeze({ ok: false, code: "Q9_HARNESS_DECISION_UNKNOWN_APPROVAL" });
  }
  pendingByProject.delete(binding.held.projectKey);
  pendingByApproval.delete(binding.held.approvalId);
  preflightBindings.delete(preflight);
  return Object.freeze({ ok: true, decision: binding.decision });
}

export function _resetQ9HarnessRevisionApprovalsForTests(): void {
  if (!process.env.NODE_TEST_CONTEXT && process.env.NODE_ENV !== "test") return;
  pendingByProject.clear();
  pendingByApproval.clear();
  issuedApprovalIds.clear();
}
