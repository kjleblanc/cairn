export const Q9_HARNESS_REVISION_DISCLOSURE_VERSION =
  "cairn-q9-harness-revision-disclosure/v1" as const;
export const Q9_HARNESS_REVISION_DECISION_VERSION =
  "cairn-q9-harness-revision-decision/v1" as const;

export const Q9_HARNESS_REVISION_PURPOSE =
  "Rerun only the preregistered check that timed out before its assertion, with its timeout raised from 1 second to the fixed 60-second ceiling. The command, Task Spec, references, and every other check remain unchanged." as const;
export const Q9_HARNESS_REVISION_DATA_SCOPE =
  "The guarded offline Q9 fixture receives only its already-preregistered command contract. No project content is sent to a model or external service." as const;
export const Q9_HARNESS_REVISION_BILLING =
  "Injected local Q9 fixture only; no provider, network, credential, billing, or quota is used." as const;

export type Q9HarnessRevisionActionV1 = "approve-revision" | "stop-task";
export const Q9_HARNESS_REVISION_ACTIONS = Object.freeze([
  "approve-revision",
  "stop-task",
] as const);

/** Output-only owner surface. The failed command text and executable path are
 * deliberately absent: only Core's bounded failure output and immutable
 * plan identities are shown. Renderer bytes never become revision authority. */
export type Q9HarnessRevisionDisclosureV1 = Readonly<{
  version: typeof Q9_HARNESS_REVISION_DISCLOSURE_VERSION;
  approvalId: string;
  taskNumber: number;
  criterionId: `c${number}`;
  failureCode: "TIMED_OUT_BEFORE_ASSERTION";
  exitCode: 124;
  boundedOutput: string;
  outputSha256: string;
  failureSha256: string;
  evidenceRef: string;
  taskSpecSha256: string;
  fromEvidencePlanSha256: string;
  toEvidencePlanSha256: string;
  changeKind: "timeout-increase";
  originalTimeoutMs: 1_000;
  revisedTimeoutMs: 60_000;
  purpose: typeof Q9_HARNESS_REVISION_PURPOSE;
  dataScope: typeof Q9_HARNESS_REVISION_DATA_SCOPE;
  billingBasis: typeof Q9_HARNESS_REVISION_BILLING;
  actions: readonly Q9HarnessRevisionActionV1[];
}>;

export type Q9HarnessRevisionDecisionRequest = Readonly<{
  dir: string;
  approvalId: string;
  action: Q9HarnessRevisionActionV1;
  disclosure: Q9HarnessRevisionDisclosureV1;
}>;

export type Q9HarnessRevisionDecisionV1 = Readonly<{
  version: typeof Q9_HARNESS_REVISION_DECISION_VERSION;
  approvalId: string;
  outcome: "approved" | "task-stopped";
}>;

/** Positional canonical bytes make an echoed renderer card an exact equality
 * check, independent of property insertion order. */
export function canonicalQ9HarnessRevisionDisclosure(
  value: Q9HarnessRevisionDisclosureV1,
): string {
  return JSON.stringify([
    value.version,
    value.approvalId,
    value.taskNumber,
    value.criterionId,
    value.failureCode,
    value.exitCode,
    value.boundedOutput,
    value.outputSha256,
    value.failureSha256,
    value.evidenceRef,
    value.taskSpecSha256,
    value.fromEvidencePlanSha256,
    value.toEvidencePlanSha256,
    value.changeKind,
    value.originalTimeoutMs,
    value.revisedTimeoutMs,
    value.purpose,
    value.dataScope,
    value.billingBasis,
    [...value.actions],
  ]);
}
