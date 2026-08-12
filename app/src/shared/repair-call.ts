export const REPAIR_CALL_DISCLOSURE_VERSION = "cairn-repair-call-disclosure/v1" as const;
export const REPAIR_CALL_DECISION_VERSION = "cairn-repair-call-decision/v1" as const;

/** One repair is the whole Q9 budget. These constants are part of the card so
 * neither a caller nor a renderer can make the owner approve a larger loop. */
export const REPAIR_CALL_ATTEMPT = 1 as const;
export const REPAIR_CALL_ATTEMPT_CAP = 1 as const;
export const REPAIR_CALL_ROUND = 0 as const;
export const REPAIR_CALL_TIMEOUT_MS_CAP = 3_600_000;
export const REPAIR_CALL_CAPTURED_OUTPUT_BYTES_CAP = 2_000_000;

export const REPAIR_CALL_PURPOSE_TEXT =
  "Apply one bounded Builder repair to the frozen Task Spec using only the confirmed blocker authority shown below. The repair cannot change the Task Spec, Evidence Plan, or references.";

export type RepairCallActionV1 = "approve" | "stop-task";
export const REPAIR_CALL_ACTIONS = Object.freeze(["approve", "stop-task"] as const);

export type RepairCallArtifactKindV1 =
  | "adapter-command-attestation"
  | "packet-artifact"
  | "owner-observation"
  | "comparison-capture";

/** A typed id is enough to identify evidence on this approval card. Content is
 * not copied into the renderer and cannot come back as repair authority. */
export type RepairCallArtifactViewV1 = Readonly<{
  kind: RepairCallArtifactKindV1;
  id: string;
}>;

export type RepairCallBlockerViewV1 = Readonly<{
  criterionId: `c${number}`;
  promise: string;
  failureConditionId: string;
  failureCondition: string;
  source: "cairn" | "owner" | "critic";
  sourceSha256: string;
  artifacts: readonly RepairCallArtifactViewV1[];
}>;

/**
 * Main's output-only description of exactly one proposed Builder repair.
 *
 * It contains hashes and human-readable frozen blocker rows, never the repair
 * instruction object, a process command, a project path, or Main authority.
 */
export type RepairCallDisclosureV1 = Readonly<{
  version: typeof REPAIR_CALL_DISCLOSURE_VERSION;
  approvalId: string;
  provider: string;
  model: string;
  purpose: typeof REPAIR_CALL_PURPOSE_TEXT;
  dataScope: string;
  quota: string;
  taskNumber: number;
  round: typeof REPAIR_CALL_ROUND;
  attempt: typeof REPAIR_CALL_ATTEMPT;
  attemptCap: typeof REPAIR_CALL_ATTEMPT_CAP;
  taskSpecSha256: string;
  evidencePlanSha256: string;
  candidateSha256: string;
  repairInstructionSha256: string;
  repairPreviewSha256: string;
  blockerAuthoritySha256: string;
  routeReceiptSha256: string;
  routeRequestFingerprintSha256: string;
  blockers: readonly RepairCallBlockerViewV1[];
  timeoutMs: number;
  maxCapturedOutputBytes: number;
  billingBasis: string;
  actions: readonly RepairCallActionV1[];
}>;

/** The renderer may return only its project routing key, one closed press, one
 * opaque id, and the exact output-only card it displayed. Project authority
 * and repair instructions are deliberately absent. Main canonicalizes the
 * routing key and requires it to match the authorization's project. */
export type RepairCallDecisionRequest = Readonly<{
  dir: string;
  approvalId: string;
  action: RepairCallActionV1;
  disclosure: RepairCallDisclosureV1;
}>;

export type RepairCallDecisionV1 = Readonly<{
  version: typeof REPAIR_CALL_DECISION_VERSION;
  approvalId: string;
  outcome: "approved" | "task-stopped";
}>;

/** Positional canonical bytes make the renderer echo an exact comparison, not
 * a collection of field-by-field judgments with key-order ambiguity. */
export function canonicalRepairCallDisclosure(value: RepairCallDisclosureV1): string {
  return JSON.stringify([
    value.version,
    value.approvalId,
    value.provider,
    value.model,
    value.purpose,
    value.dataScope,
    value.quota,
    value.taskNumber,
    value.round,
    value.attempt,
    value.attemptCap,
    value.taskSpecSha256,
    value.evidencePlanSha256,
    value.candidateSha256,
    value.repairInstructionSha256,
    value.repairPreviewSha256,
    value.blockerAuthoritySha256,
    value.routeReceiptSha256,
    value.routeRequestFingerprintSha256,
    value.blockers.map((blocker) => [
      blocker.criterionId,
      blocker.promise,
      blocker.failureConditionId,
      blocker.failureCondition,
      blocker.source,
      blocker.sourceSha256,
      blocker.artifacts.map((artifact) => [artifact.kind, artifact.id]),
    ]),
    value.timeoutMs,
    value.maxCapturedOutputBytes,
    value.billingBasis,
    [...value.actions],
  ]);
}
