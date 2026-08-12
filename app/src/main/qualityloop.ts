import { createHash, randomUUID } from "node:crypto";

import {
  CRITIC_SYNTHETIC_TASK_PACKET_AUTHORITY_CONTEXT_VERSION,
  CRITIC_SYNTHETIC_TASK_SELECTION_VERSION,
  activateSerialCandidateQualityLoop,
  admitSerialCandidateRepair,
  adoptSerialCandidateEvidencePlanRevisionForRun,
  adoptSerialCandidateRepairResult,
  authorizeSerialCandidateQ9HarnessRevision,
  cairnCriterionFailureConfirmationSha256,
  canonicalCairnCriterionFailureConfirmation,
  authorizeSerialCandidateOptionalCriticDecline,
  authorizeQ9SyntheticRepair,
  authorizeSerialCandidateSealFromCompletion,
  authorizeSerialRepairPreview,
  canonicalCriticAssessment,
  captureSerialCandidateAfterRepair,
  composeCriticAssessment,
  composeCriticCallAuthorization,
  composeCriticCompletionAuthority,
  composeCriticPolicyAuthorityContext,
  composeCriticPolicyDecision,
  composeCriticRepairAuthority,
  composeCriticRequest,
  composeCriticSyntheticTaskPacketAuthorityContext,
  composeSerialCandidatePolicyEvidence,
  composeSerialRepairPreview,
  consumeQ9SyntheticRepairAuthorization,
  criticAssessmentSha256,
  criticCallAuthorizationSha256,
  criticPolicyDecisionSha256,
  criticRequestSha256,
  deriveCriticPolicy,
  evidencePlanSha256,
  prepareQ9SyntheticRepairRequest,
  previewSerialCandidateQ9HarnessRevision,
  q9SyntheticRepairAuthorizationSha256,
  q9SyntheticRepairDisclosure,
  q9SyntheticRepairDisclosureSha256,
  q9SyntheticRepairRequestSha256,
  reserveSerialCandidateCritic,
  reserveSerialCandidateRepair,
  rerunSerialCandidateQ9RevisedEvidence,
  serialCandidateAttemptCustody,
  serialCandidateAttemptReservationSha256,
  serialCandidateCurrentIdentity,
  serialCandidatePolicyEvidenceSha256,
  serialCandidateCurrentAvailableAssessment,
  serialCandidatePriorConfirmedFindings,
  serialCandidateQ9HarnessFailure,
  serialQ9HarnessFailureSha256,
  serialCandidateQualityLoopAuthorityRequired,
  serialCandidateTaskSpecAuthority,
  serialCandidateTerminalResultSha256,
  serialRepairPreviewSha256,
  settleSerialCandidateCritic,
  settleSerialCandidateOptionalCriticDecline,
  settleSerialCandidateOwnerResolution,
  type CairnCriterionFailureConfirmationV1,
  type CriticAssessmentV1,
  type CriticCallAuthorizationV1,
  type CriticRequestV1,
  type EvidencePlanV1,
  type Q9SyntheticRepairDisclosureV1,
  type Q9SyntheticRepairAuthorizationV1,
  type Q9SyntheticRepairRequestV1,
  type SerialRepairAuthorizationV1,
  type SerialCandidateAttemptReservationV1,
  type SerialCandidateRepairReservationV1,
  type SerialCandidateRunResult,
  type SerialCandidateSealAuthorizationV1,
  type SerialCandidateTerminalResult,
  type SerialCandidateV1,
  type SerialCandidateWriterIsolationV1,
  type SerialRepairPreviewV1,
  type SerialRepairInstructionV1,
  type SerialStopReason,
  type TaskRequestView,
  type TaskSpecV1,
  type TaskAdapter,
} from "@cairn/core";

import type {
  ResultCard,
  RunSessionSnapshot,
  TaskReviewProjectionV1,
} from "../shared/ipc.js";
import { isEvidenceRunId } from "../shared/ipc.js";
import type { CriticCallDecisionV1, CriticCallDisclosureV1 } from "../shared/critic-call.js";
import type { RepairCallDecisionV1, RepairCallDisclosureV1 } from "../shared/repair-call.js";
import { parseTaskReviewActionRequest, type TaskReviewActionRequest } from "../shared/task-review.js";
import type {
  Q9HarnessRevisionDecisionV1,
  Q9HarnessRevisionDisclosureV1,
} from "../shared/harness-revision.js";
import { composeResultCard } from "./conductor/relay.js";
import { isConversationId } from "./conductor/conversation-id.js";
import { canonicalProjectKey } from "./conductor/turnauth.js";
import {
  SYNTHETIC_TASK_CRITIC_ROUTE_V1,
  clearCriticCallApprovalIfCurrent,
  commitCriticCallDecision,
  openSyntheticTaskCriticCallApproval,
  preflightCriticCallDecision,
  takeCriticCallAuthorization,
} from "./criticapproval.js";
import type { CriticCallResultV1 } from "./critictransport.js";
import {
  applyTaskReviewAction,
  composeCandidateTaskReviewAuthority,
  invalidateTaskReviewAuthority,
  mainOwnerEvidence,
  taskReviewProjection,
  type MainTaskReviewAuthorityV1,
} from "./ownercheck.js";
import {
  appendPendingSerialCandidateWorkflowEvent,
  checkpointPendingSerialCandidate,
  checkpointPendingSerialCandidateHarnessRerun,
  checkpointPendingSerialCandidateWithWorkflowEvent,
  currentPendingSerialCandidate,
  finalizePendingSerialCandidate,
  pendingSerialCandidateProjects,
  persistPendingSerialCandidate,
  stopPendingSerialCandidate,
  type PendingSerialCandidateTerminalAttemptV1,
} from "./pendingcandidate.js";
import type {
  PendingRunAuthorityEventInputV1,
  PendingRunDecisionEventInputV1,
  PendingRunDecisionEventV1,
  PendingRunEvidencePlanEventInputV1,
  PendingRunHarnessDecisionPayloadV1,
  PendingRunCairnFailureDecisionPayloadV1,
  PendingRunOperationEventInputV1,
  PendingRunStateV1,
  PendingRunTerminalCardInputV1,
  PendingRunWorkflowEventInputV1,
} from "./pendingrun.js";
import { PENDING_RUN_HARNESS_DECISION_VERSION } from "./pendingrun.js";
import { PENDING_RUN_CAIRN_FAILURE_DECISION_VERSION } from "./pendingrun.js";
import {
  clearRepairCallApprovalIfCurrent,
  commitRepairCallDecision,
  mintRepairCallAuthorization,
  openRepairCallApproval,
  preflightRepairCallDecision,
  repairCallAuthorizationCoversDisclosure,
  repairCallAuthorizationCoversPreview,
  takeRepairCallAuthorization,
  type RepairCallAuthorizationV1,
} from "./repairapproval.js";
import {
  q9E2eGuardPresent,
  q9SyntheticReferenceContent,
  type Q9FakeCutPoint,
} from "./q9fake.js";
import {
  _resetQ9HarnessRevisionApprovalsForTests,
  clearQ9HarnessRevisionApprovalIfCurrent,
  commitQ9HarnessRevisionDecision,
  openQ9HarnessRevisionApproval,
  preflightQ9HarnessRevisionDecision,
  type PreparedQ9HarnessRevisionV1,
} from "./harnessapproval.js";

export const Q9_QUALITY_LOOP_VERSION = "cairn-q9-quality-loop/v1" as const;
const SHA256 = /^[a-f0-9]{64}$/u;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

export type Q9QualityLoopStatus =
  | "checking"
  | "awaiting-owner"
  | "awaiting-repair-approval"
  | "repair-running"
  | "awaiting-harness-revision"
  | "harness-running"
  | "awaiting-critic-approval"
  | "critic-running"
  | "stopping"
  | "settled"
  | "recovery-required";

export type Q9QualityLoopSessionV1 = Readonly<{
  conversationId: string | null;
  startedAt: string;
  adapterIdentitySha256: string;
  evidenceRunId: string | null;
  acceptedRequest: TaskRequestView | null;
}>;

export type Q9RepairWriterV1 = Readonly<{
  kind: "synthetic-q9-builder";
  run(input: Readonly<{
    projectRoot: string;
    request: Q9SyntheticRepairRequestV1;
    candidate: SerialCandidateV1;
    instruction: SerialRepairInstructionV1;
    signal: AbortSignal;
  }>): Promise<unknown>;
}>;

export type Q9CriticTransportV1 = Readonly<{
  kind: "synthetic-q9-critic";
  send(input: Readonly<{
    request: CriticRequestV1;
    authorization: CriticCallAuthorizationV1;
    candidate: SerialCandidateV1;
    reservation: SerialCandidateAttemptReservationV1;
    signal: AbortSignal;
  }>): Promise<CriticCallResultV1>;
}>;

export type Q9TerminalSettlementV1 = Readonly<{
  settle(input:
    | Readonly<{
        projectRoot: string;
        kind: "stop";
        reason: SerialStopReason;
        cardForResult(result: SerialCandidateTerminalResult): PendingRunTerminalCardInputV1 | undefined;
      }>
    | Readonly<{
        projectRoot: string;
        kind: "finalize";
        sealAuthorization: SerialCandidateSealAuthorizationV1;
        cardForResult(result: SerialCandidateTerminalResult): PendingRunTerminalCardInputV1 | undefined;
      }>
  ): PendingSerialCandidateTerminalAttemptV1 | null;
}>;

/** Exact adapter for Main integration. PendingCandidate invokes the supplied
 * card factory only after Core returns the authenticated terminal result. */
export const Q9_PENDING_CANDIDATE_TERMINAL: Q9TerminalSettlementV1 = Object.freeze({
  settle(input) {
    return input.kind === "stop"
      ? stopPendingSerialCandidate(input.projectRoot, input.reason, input.cardForResult)
      : finalizePendingSerialCandidate(input.projectRoot, input.sealAuthorization, input.cardForResult);
  },
});

export type Q9QualityLoopDependenciesV1 = Readonly<{
  repairWriter: Q9RepairWriterV1;
  criticTransport: Q9CriticTransportV1;
  terminal: Q9TerminalSettlementV1;
  harnessRevision?: Readonly<{
    kind: "synthetic-q9-harness-revision";
    adapter: TaskAdapter;
    writerIsolation: SerialCandidateWriterIsolationV1;
  }>;
  /** Unit-test-only shorter deadlines. Production always uses the disclosed
   * 60-minute Builder / 10-minute critic caps. */
  testDeadlineMs?: Readonly<{ repair?: number; critic?: number; harness?: number }>;
  now?: () => Date;
  onChanged?: (projectRoot: string) => void;
  /** Guarded E2E hard-cut observer. Main may terminate the injected process;
   * this orchestrator only marks exact post-durability boundaries. */
  onCutPoint?: (point: Q9FakeCutPoint, projectRoot: string) => boolean;
  onTerminal?: (projectRoot: string, result: SerialCandidateTerminalResult, card: ResultCard | null) => void;
}>;

export type Q9QualityLoopSnapshotV1 = Readonly<{
  version: typeof Q9_QUALITY_LOOP_VERSION;
  projectRoot: string;
  status: Q9QualityLoopStatus;
  phase: SerialCandidateV1["phase"];
  round: 0 | 1;
  repairSpent: 0 | 1;
  criticSpent: 0 | 1 | 2 | 3;
  taskReview: TaskReviewProjectionV1 | null;
  repairCall: RepairCallDisclosureV1 | null;
  criticCall: CriticCallDisclosureV1 | null;
  harnessRevision: Q9HarnessRevisionDisclosureV1 | null;
  result: SerialCandidateTerminalResult | null;
  refusal: string | null;
}>;

export type Q9QualityLoopDecision<T> =
  | Readonly<{ handled: false }>
  | Readonly<{ handled: true; ok: false; code: string }>
  | Readonly<{ handled: true; ok: true; value: T }>;

type PreparedCritic = Readonly<{
  request: CriticRequestV1;
  authorization: CriticCallAuthorizationV1;
  disclosure: CriticCallDisclosureV1;
  requestSha256: string;
  authorizationSha256: string;
  operationId: string;
  retryOfOperationId: string | null;
}>;

type PreparedRepair = Readonly<{
  preview: SerialRepairPreviewV1;
  route: Q9SyntheticRepairDisclosureV1;
  approvalAuthorization: RepairCallAuthorizationV1;
  disclosure: RepairCallDisclosureV1;
  operationId: string;
}>;

type ApprovedRepair = Readonly<{
  prepared: PreparedRepair;
  ownerAuthorization: SerialRepairAuthorizationV1;
  routeAuthorization: Q9SyntheticRepairAuthorizationV1;
  request: Q9SyntheticRepairRequestV1;
  authorizationSha256: string;
  requestSha256: string;
  routeReceiptSha256: string;
}>;

type ApprovedHarnessRevision = Readonly<{
  prepared: PreparedQ9HarnessRevisionV1;
  authorized: NonNullable<ReturnType<typeof authorizeSerialCandidateQ9HarnessRevision>>;
  authorizationSha256: string;
}>;

type Loop = {
  key: string;
  projectRoot: string;
  evidence: Parameters<typeof persistPendingSerialCandidate>[0]["evidence"];
  session: Q9QualityLoopSessionV1;
  dependencies: Q9QualityLoopDependenciesV1;
  status: Q9QualityLoopStatus;
  refusal: string | null;
  taskReviewAuthority: MainTaskReviewAuthorityV1 | null;
  taskReview: TaskReviewProjectionV1 | null;
  assessment: CriticAssessmentV1 | null;
  repair: PreparedRepair | null;
  critic: PreparedCritic | null;
  harness: PreparedQ9HarnessRevisionV1 | null;
  controller: AbortController;
  chain: Promise<void>;
  settled: Promise<SerialCandidateTerminalResult>;
  resolve: (result: SerialCandidateTerminalResult) => void;
  reject: (error: unknown) => void;
  result: SerialCandidateTerminalResult | null;
};

const loops = new Map<string, Loop>();

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalData(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => item === undefined ? null : canonicalData(item));
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, item]) => [key, canonicalData(item)]));
}

/** PendingRun uses the same sorted-key JSON predicate when accepting a card. */
export function canonicalQ9Json(value: unknown): string {
  return JSON.stringify(canonicalData(value));
}

export function q9TerminalCardFor(
  result: SerialCandidateTerminalResult,
  session: Pick<Q9QualityLoopSessionV1, "evidenceRunId">,
  _taskReview: TaskReviewProjectionV1 | null = null,
): ResultCard | null {
  // Terminal bytes deliberately exclude the pre-seal review. Its action ids
  // are process-local and cannot be reconstructed at the boot terminal seam;
  // the authenticated terminal result already carries the Task Spec evidence.
  return serialCandidateTerminalResultSha256(result) === null
    ? null
    : composeResultCard(result, session.evidenceRunId);
}

export function canonicalQ9TerminalCard(
  result: SerialCandidateTerminalResult,
  session: Pick<Q9QualityLoopSessionV1, "evidenceRunId">,
  taskReview: TaskReviewProjectionV1 | null = null,
): string | null {
  const card = q9TerminalCardFor(result, session, taskReview);
  return card === null ? null : canonicalQ9Json(card);
}

/** Shared by live settlement and `installPendingSerialCandidateRecovery`.
 * The session is already authenticated by PendingRun; only deterministic
 * evidenceRunId participates in terminal card bytes. */
export function q9TerminalCardInputForResult(
  result: SerialCandidateTerminalResult,
  session: Pick<Q9QualityLoopSessionV1, "conversationId" | "startedAt" | "evidenceRunId">,
): PendingRunTerminalCardInputV1 | undefined {
  const canonicalCard = canonicalQ9TerminalCard(result, session);
  return session.conversationId === null || canonicalCard === null ? undefined : Object.freeze({
    conversationId: session.conversationId,
    turnTimestamp: session.startedAt,
    canonicalCard,
  });
}

export function q9TerminalCardInputFromPendingState(
  result: SerialCandidateTerminalResult,
  state: PendingRunStateV1,
): PendingRunTerminalCardInputV1 | undefined {
  const event = state.workflow?.events.find((row) => row.kind === "session");
  if (!event || event.kind !== "session") return undefined;
  try {
    const session = JSON.parse(event.canonicalPayload) as Q9QualityLoopSessionV1;
    if (!validSession(session) || session.conversationId !== event.conversationId
      || session.evidenceRunId !== state.evidenceRunId) return undefined;
    return q9TerminalCardInputForResult(result, session);
  } catch {
    return undefined;
  }
}

function projectKey(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 4_096 || value.includes("\0")) return null;
  try { return canonicalProjectKey(value); } catch { return null; }
}

function callNow(loop: Loop): Date {
  const value = (loop.dependencies.now ?? (() => new Date()))();
  if (!(value instanceof Date) || !Number.isFinite(value.valueOf())) throw new Error("Q9_CLOCK_INVALID");
  return value;
}

type BoundedCallOutcome<T> =
  | Readonly<{ status: "returned"; value: T }>
  | Readonly<{ status: "threw"; error: unknown }>
  | Readonly<{ status: "aborted"; timedOut: boolean }>;

async function boundedCall<T>(
  loop: Loop,
  kind: "repair" | "critic" | "harness",
  disclosedTimeoutMs: number,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<BoundedCallOutcome<T>> {
  const testOverride = process.env.NODE_TEST_CONTEXT === "child-v8"
    ? loop.dependencies.testDeadlineMs?.[kind]
    : undefined;
  const timeoutMs = Number.isSafeInteger(testOverride) && (testOverride as number) > 0
    && (testOverride as number) <= disclosedTimeoutMs
    ? testOverride as number
    : disclosedTimeoutMs;
  const controller = new AbortController();
  let timedOut = false;
  let finishAbort!: () => void;
  const aborted = new Promise<BoundedCallOutcome<T>>((resolve) => {
    finishAbort = () => resolve(Object.freeze({ status: "aborted", timedOut }));
  });
  const parentAbort = () => {
    controller.abort(loop.controller.signal.reason);
    finishAbort();
  };
  if (loop.controller.signal.aborted) parentAbort();
  else loop.controller.signal.addEventListener("abort", parentAbort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error(`Q9_${kind.toUpperCase()}_TIMED_OUT`));
    finishAbort();
  }, timeoutMs);
  timer.unref?.();
  const called = Promise.resolve()
    .then(() => run(controller.signal))
    .then<BoundedCallOutcome<T>, BoundedCallOutcome<T>>(
      (value) => Object.freeze({ status: "returned", value }),
      (error) => Object.freeze({ status: "threw", error }),
    );
  try {
    return await Promise.race([called, aborted]);
  } finally {
    clearTimeout(timer);
    loop.controller.signal.removeEventListener("abort", parentAbort);
  }
}

function notify(loop: Loop): void {
  try { loop.dependencies.onChanged?.(loop.projectRoot); } catch { /* observers hold no lifecycle authority */ }
}

function cutPoint(loop: Loop, point: Q9FakeCutPoint): boolean {
  if (!q9E2eGuardPresent()) return false;
  try { return loop.dependencies.onCutPoint?.(point, loop.projectRoot) === true; } catch {
    /* An E2E observer holds no workflow authority. */
    return false;
  }
}

function current(loop: Loop): ReturnType<typeof currentPendingSerialCandidate> {
  return currentPendingSerialCandidate(loop.projectRoot);
}

function candidateIdentity(candidate: SerialCandidateV1): string | null {
  const identity = serialCandidateCurrentIdentity(candidate);
  return identity === null ? null : sha256(JSON.stringify(identity));
}

function operationEvent(
  candidate: SerialCandidateV1,
  input: Omit<PendingRunOperationEventInputV1,
    "kind" | "candidateSha256" | "candidateIdentitySha256" | "taskSpecSha256" | "activeEvidencePlanSha256" | "round">,
): PendingRunOperationEventInputV1 | null {
  const identity = candidateIdentity(candidate);
  if (identity === null) return null;
  return Object.freeze({
    kind: "operation",
    ...input,
    candidateSha256: candidate.candidateSha256,
    candidateIdentitySha256: identity,
    taskSpecSha256: candidate.taskSpecSha256,
    activeEvidencePlanSha256: candidate.evidencePlanSha256,
    round: candidate.round,
  });
}

function decisionEvent(
  candidate: SerialCandidateV1,
  input: Omit<PendingRunDecisionEventInputV1,
    "kind" | "candidateSha256" | "candidateIdentitySha256" | "taskSpecSha256" | "activeEvidencePlanSha256" | "round">,
): PendingRunDecisionEventInputV1 | null {
  const identity = candidateIdentity(candidate);
  if (identity === null) return null;
  return Object.freeze({
    kind: "decision",
    ...input,
    candidateSha256: candidate.candidateSha256,
    candidateIdentitySha256: identity,
    taskSpecSha256: candidate.taskSpecSha256,
    activeEvidencePlanSha256: candidate.evidencePlanSha256,
    round: candidate.round,
  });
}

function appendEvent(loop: Loop, event: PendingRunWorkflowEventInputV1): boolean {
  return appendPendingSerialCandidateWorkflowEvent(loop.projectRoot, event).ok;
}

function durableDecision(loop: Loop, operationId: string): PendingRunDecisionEventV1 | null {
  return [...(current(loop)?.workflow.events ?? [])].reverse().find((event): event is PendingRunDecisionEventV1 =>
    event.kind === "decision" && event.operationId === operationId) ?? null;
}

function outstandingDecision(loop: Loop): PendingRunDecisionEventV1 | null {
  const events = current(loop)?.workflow.events ?? [];
  const operated = new Set<string>();
  for (const event of events) if (event.kind === "operation") operated.add(event.operationId);
  return [...events].reverse().find((event): event is PendingRunDecisionEventV1 =>
    event.kind === "decision" && !operated.has(event.operationId)) ?? null;
}

function decisionMatchesCandidate(decision: PendingRunDecisionEventV1, candidate: SerialCandidateV1): boolean {
  return decision.candidateSha256 === candidate.candidateSha256
    && decision.taskSpecSha256 === candidate.taskSpecSha256
    && decision.activeEvidencePlanSha256 === candidate.evidencePlanSha256
    && decision.round === candidate.round;
}

function checkpoint(loop: Loop, candidate: SerialCandidateV1): boolean {
  return checkpointPendingSerialCandidate(loop.projectRoot, candidate, loop.evidence).ok;
}

function checkpointWithEvent(
  loop: Loop,
  candidate: SerialCandidateV1,
  event: PendingRunWorkflowEventInputV1,
): boolean {
  return checkpointPendingSerialCandidateWithWorkflowEvent(loop.projectRoot, candidate, loop.evidence, event).ok;
}

function durableAuthorityValues(loop: Loop, candidate: SerialCandidateV1): Readonly<{
  ownerObservations: readonly unknown[];
  ownerResolutions: readonly unknown[];
  cairnFailureDecisions: readonly PendingRunCairnFailureDecisionPayloadV1[];
}> {
  const workflow = current(loop)?.workflow;
  const ownerObservations: unknown[] = [];
  const ownerResolutions: unknown[] = [];
  const cairnFailureDecisions: PendingRunCairnFailureDecisionPayloadV1[] = [];
  for (const event of workflow?.events ?? []) {
    if (event.kind !== "authority" || event.candidateSha256 !== candidate.candidateSha256
      || event.taskSpecSha256 !== candidate.taskSpecSha256
      || event.activeEvidencePlanSha256 !== candidate.evidencePlanSha256 || event.round !== candidate.round) continue;
    try {
      const value = JSON.parse(event.canonicalPayload) as unknown;
      if (event.authorityKind === "owner-observation") ownerObservations.push(value);
      else if (event.authorityKind === "owner-resolution") ownerResolutions.push(value);
      else if (event.authorityKind === "cairn-failure-decision") {
        cairnFailureDecisions.push(value as PendingRunCairnFailureDecisionPayloadV1);
      }
    } catch { /* the authenticated journal parser already rejects this */ }
  }
  return Object.freeze({
    ownerObservations: Object.freeze(ownerObservations),
    ownerResolutions: Object.freeze(ownerResolutions),
    cairnFailureDecisions: Object.freeze(cairnFailureDecisions),
  });
}

function uniqueCanonical(values: readonly unknown[]): readonly unknown[] {
  const seen = new Set<string>();
  const output: unknown[] = [];
  for (const value of values) {
    const canonical = canonicalQ9Json(value);
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    output.push(value);
  }
  return Object.freeze(output);
}

function policyFor(loop: Loop, candidate: SerialCandidateV1, assessment: CriticAssessmentV1 | null) {
  const authority = serialCandidateTaskSpecAuthority(candidate);
  const evidence = composeSerialCandidatePolicyEvidence(candidate);
  if (!authority || !evidence || serialCandidatePolicyEvidenceSha256(evidence) === null) return null;
  const liveOwner = loop.taskReviewAuthority === null ? null : mainOwnerEvidence(loop.taskReviewAuthority);
  const durable = durableAuthorityValues(loop, candidate);
  const ownerObservations = uniqueCanonical([
    ...durable.ownerObservations,
    ...(liveOwner?.ownerObservations ?? []),
  ]);
  const ownerResolutions = uniqueCanonical([
    ...durable.ownerResolutions,
    ...(liveOwner?.ownerResolutions ?? []),
  ]);
  const assessmentSha = assessment === null ? null : criticAssessmentSha256(assessment);
  if (assessment !== null && assessmentSha === null) return null;
  const context = composeCriticPolicyAuthorityContext(authority.taskSpec, authority.evidencePlan, assessment, {
    version: "cairn-critic-policy-authority-context/v1",
    projectHash: candidate.projectRootSha256,
    runId: candidate.runId,
    taskSpecSha256: candidate.taskSpecSha256,
    evidencePlanSha256: candidate.evidencePlanSha256,
    candidateSha256: candidate.candidateSha256,
    assessmentSha256: assessmentSha,
    criterionResults: evidence.criterionResults,
    ownerObservations,
    ownerResolutions,
    nativeBoundaryResults: [],
  });
  if (!context) return null;
  const confirmations: CairnCriterionFailureConfirmationV1[] = [];
  const missingLiveCairnConfirmations: `c${number}`[] = [];
  const liveConfirmations = new Map((liveOwner?.cairnFailureConfirmations ?? [])
    .map((confirmation) => [confirmation.criterionId, confirmation] as const));
  for (const decision of durable.cairnFailureDecisions) {
    if (decision.outcome !== "confirmed") continue;
    const live = liveConfirmations.get(decision.criterionId);
    if (live) {
      if (cairnCriterionFailureConfirmationSha256(live) !== decision.confirmationSha256) return null;
      confirmations.push(live);
      liveConfirmations.delete(decision.criterionId);
      continue;
    }
    // Persisted JSON is custody, not authority. The live brand is consumed
    // into the candidate before the process can proceed to a repair call. A
    // restart in the persistence/checkpoint gap is detected below and closes
    // honestly; it never rebrands JSON or re-renders this owner decision.
    missingLiveCairnConfirmations.push(decision.criterionId);
  }
  if (liveConfirmations.size !== 0) return null;
  return Object.freeze({
    authority,
    evidence,
    context,
    confirmations: Object.freeze(confirmations),
    missingLiveCairnConfirmations: Object.freeze(missingLiveCairnConfirmations),
    cairnFailureDecisions: durable.cairnFailureDecisions,
    policy: deriveCriticPolicy(authority.taskSpec, authority.evidencePlan, assessment, context),
  });
}

function incompleteNonCairnOwnerRows(review: TaskReviewProjectionV1 | null): boolean {
  return review?.criteria.some((criterion) => criterion.ownerChecks.some((row) =>
    (row.kind === "owner-observation" && row.status === "cant-tell")
    || (row.kind === "critic-allegation" && row.status === "cant-tell"))) ?? false;
}

function artifactRegistry(plan: EvidencePlanV1, assessment: CriticAssessmentV1 | null) {
  const ids = new Set<string>();
  for (const procedure of plan.procedures) for (const id of procedure.artifactIds) ids.add(id);
  for (const id of plan.revisionReasonEvidenceRefs) ids.add(id);
  if (assessment !== null) {
    for (const finding of assessment.output.findings) {
      for (const id of finding.evidenceRefs) ids.add(id);
      for (const id of finding.counterEvidenceRefs) ids.add(id);
    }
    for (const finding of assessment.output.unscopedFindings) {
      for (const id of finding.evidenceRefs) ids.add(id);
      for (const id of finding.counterEvidenceRefs) ids.add(id);
    }
    for (const comparison of assessment.output.comparisons) for (const id of comparison.evidenceRefs) ids.add(id);
  }
  return Object.freeze([...ids].sort().map((id) => Object.freeze({ id, label: `Q9 evidence ${id}` })));
}

function replaceReview(loop: Loop, assessment: CriticAssessmentV1 | null): boolean {
  const active = current(loop);
  if (!active) return false;
  const policyEvidence = composeSerialCandidatePolicyEvidence(active.candidate);
  const authority = serialCandidateTaskSpecAuthority(active.candidate);
  if (!policyEvidence || !authority) return false;
  const seedOwnerEvidence = durableAuthorityValues(loop, active.candidate);
  const next = composeCandidateTaskReviewAuthority({
    dir: loop.projectRoot,
    runId: active.candidate.runId,
    taskSpec: authority.taskSpec,
    evidencePlan: authority.evidencePlan,
    candidateSha256: active.candidate.candidateSha256,
    assessment,
    criterionResults: policyEvidence.criterionResults,
    artifactRegistry: artifactRegistry(authority.evidencePlan, assessment),
    seedOwnerEvidence,
  });
  const projection = next ? taskReviewProjection(next) : null;
  if (!next || !projection) return false;
  if (loop.taskReviewAuthority) invalidateTaskReviewAuthority(loop.taskReviewAuthority);
  loop.taskReviewAuthority = next;
  loop.taskReview = projection;
  return true;
}

function retireReview(loop: Loop): void {
  if (loop.taskReviewAuthority) invalidateTaskReviewAuthority(loop.taskReviewAuthority);
  loop.taskReviewAuthority = null;
  loop.taskReview = null;
}

function canonicalAuthorityEvent(
  candidate: SerialCandidateV1,
  authorityKind: "owner-observation" | "owner-resolution" | "cairn-failure-decision",
  authority: unknown,
  assessmentSha256: string | null,
): PendingRunWorkflowEventInputV1 | null {
  const identity = candidateIdentity(candidate);
  const canonicalPayload = canonicalQ9Json(authority);
  if (identity === null || canonicalPayload.length < 2) return null;
  return Object.freeze({
    kind: "authority",
    authorityKind,
    authoritySha256: sha256(canonicalPayload),
    canonicalPayload,
    assessmentSha256,
    candidateSha256: candidate.candidateSha256,
    candidateIdentitySha256: identity,
    taskSpecSha256: candidate.taskSpecSha256,
    activeEvidencePlanSha256: candidate.evidencePlanSha256,
    round: candidate.round,
  });
}

function harnessAuthorityEvent(
  candidate: SerialCandidateV1,
  authorityKind: "harness-decision" | "harness-authorization",
  payload: unknown,
): PendingRunAuthorityEventInputV1 | null {
  const identity = candidateIdentity(candidate);
  const canonicalPayload = canonicalQ9Json(payload);
  if (identity === null || canonicalPayload.length < 2) return null;
  return Object.freeze({
    kind: "authority",
    authorityKind,
    authoritySha256: sha256(canonicalPayload),
    canonicalPayload,
    assessmentSha256: null,
    candidateSha256: candidate.candidateSha256,
    candidateIdentitySha256: identity,
    taskSpecSha256: candidate.taskSpecSha256,
    activeEvidencePlanSha256: candidate.evidencePlanSha256,
    round: candidate.round,
  });
}

function durableHarnessDecision(loop: Loop, candidate: SerialCandidateV1): Readonly<{
  event: Extract<PendingRunWorkflowEventInputV1, { kind: "authority" }> & Readonly<{ eventSha256?: string }>;
  payload: PendingRunHarnessDecisionPayloadV1;
}> | null {
  const event = [...(current(loop)?.workflow.events ?? [])].reverse().find((row) =>
    row.kind === "authority" && row.authorityKind === "harness-decision"
      && row.candidateSha256 === candidate.candidateSha256
      && row.taskSpecSha256 === candidate.taskSpecSha256
      && row.activeEvidencePlanSha256 === candidate.evidencePlanSha256
      && row.round === candidate.round);
  if (!event || event.kind !== "authority") return null;
  try {
    const value = JSON.parse(event.canonicalPayload) as Record<string, unknown>;
    if (!value || Object.keys(value).sort().join("|") !== [
      "approvalId", "authorizationSha256", "decidedAt", "failureSha256", "outcome", "previewSha256", "version",
      "failureCanonicalPayload",
    ].sort().join("|")
      || value.version !== PENDING_RUN_HARNESS_DECISION_VERSION
      || typeof value.approvalId !== "string"
      || (value.outcome !== "approved" && value.outcome !== "task-stopped")
      || typeof value.failureSha256 !== "string" || !SHA256.test(value.failureSha256)
      || typeof value.failureCanonicalPayload !== "string"
      || typeof value.previewSha256 !== "string" || !SHA256.test(value.previewSha256)
      || (value.authorizationSha256 !== null
        && (typeof value.authorizationSha256 !== "string" || !SHA256.test(value.authorizationSha256)))
      || (value.outcome === "approved") !== (value.authorizationSha256 !== null)
      || typeof value.decidedAt !== "string" || !ISO_INSTANT.test(value.decidedAt)) return null;
    return Object.freeze({ event, payload: Object.freeze(value) as PendingRunHarnessDecisionPayloadV1 });
  } catch {
    return null;
  }
}

function persistNewOwnerEvidence(loop: Loop): boolean {
  const active = current(loop);
  const evidence = loop.taskReviewAuthority ? mainOwnerEvidence(loop.taskReviewAuthority) : null;
  if (!active || !evidence) return false;
  const durable = durableAuthorityValues(loop, active.candidate);
  const known = new Set([
    ...durable.ownerObservations,
    ...durable.ownerResolutions,
    ...durable.cairnFailureDecisions,
  ].map(canonicalQ9Json));
  for (const observation of evidence.ownerObservations) {
    const canonical = canonicalQ9Json(observation);
    if (known.has(canonical)) continue;
    const event = canonicalAuthorityEvent(active.candidate, "owner-observation", observation, null);
    if (!event || !appendEvent(loop, event)) return false;
    known.add(canonical);
  }
  const assessmentSha = loop.assessment ? criticAssessmentSha256(loop.assessment) : null;
  for (const resolution of evidence.ownerResolutions) {
    const canonical = canonicalQ9Json(resolution);
    if (known.has(canonical)) continue;
    if (assessmentSha === null) return false;
    const event = canonicalAuthorityEvent(active.candidate, "owner-resolution", resolution, assessmentSha);
    if (!event || !appendEvent(loop, event)) return false;
    known.add(canonical);
  }
  for (const decision of evidence.cairnFailureDecisions) {
    const confirmationCanonicalPayload = decision.confirmation === null
      ? null
      : canonicalCairnCriterionFailureConfirmation(decision.confirmation);
    const confirmationSha256 = decision.confirmation === null
      ? null
      : cairnCriterionFailureConfirmationSha256(decision.confirmation);
    if ((decision.outcome === "confirmed") !== (confirmationCanonicalPayload !== null)
      || (decision.outcome === "confirmed") !== (confirmationSha256 !== null)) return false;
    const payload: PendingRunCairnFailureDecisionPayloadV1 = Object.freeze({
      version: PENDING_RUN_CAIRN_FAILURE_DECISION_VERSION,
      actionId: decision.actionId,
      outcome: decision.outcome,
      criterionId: decision.criterionId,
      failureConditionId: decision.failureConditionId,
      criterionResultSha256: decision.criterionResultSha256,
      evidenceRefsSeen: decision.evidenceRefsSeen,
      actionNonce: decision.actionNonce,
      decidedAt: decision.decidedAt,
      ownerActionReceiptSha256: decision.ownerActionReceiptSha256,
      confirmationSha256,
      confirmationCanonicalPayload,
    });
    const canonical = canonicalQ9Json(payload);
    if (known.has(canonical)) continue;
    const event = canonicalAuthorityEvent(active.candidate, "cairn-failure-decision", payload, null);
    if (!event || !appendEvent(loop, event)) return false;
    known.add(canonical);
  }
  return true;
}

function syntheticCriticEvidence(
  candidate: SerialCandidateV1,
  taskSpec: TaskSpecV1,
  plan: EvidencePlanV1,
  fixtureId: string,
) {
  const ids = new Set<string>();
  for (const procedure of plan.procedures) for (const id of procedure.artifactIds) ids.add(id);
  const selected: Array<Readonly<{
    id: string;
    syntheticPath: string;
    sha256: string;
    content: string;
    truncated: false;
  }>> = [...ids].sort().map((id, index) => {
    const content = `Cairn Q9 fake evidence ${index + 1} for ${id}; candidate ${candidate.candidateSha256}.`;
    return Object.freeze({
      id,
      syntheticPath: `synthetic-q9/${fixtureId}/artifact-${index + 1}.txt`,
      sha256: sha256(content),
      content,
      truncated: false,
    });
  });
  const declared = [...taskSpec.quality.acceptanceChecks, ...taskSpec.quality.qualityPreferences]
    .filter((row) => row.comparison !== null);
  const comparisonTrials = [];
  for (let index = 0; index < declared.length; index += 1) {
    const row = declared[index]!;
    const comparison = row.comparison!;
    const reference = taskSpec.quality.references.find((item) => item.id === comparison.referenceId);
    const referenceContent = reference ? q9SyntheticReferenceContent(reference.snapshotSha256) : null;
    if (!reference || referenceContent === null) return null;
    const candidateArtifactId = `q9-cmp-${index + 1}-candidate`;
    const referenceArtifactId = `q9-cmp-${index + 1}-reference`;
    if (ids.has(candidateArtifactId) || ids.has(referenceArtifactId)) return null;
    const candidateContent = `Cairn Q9 comparison candidate ${index + 1}; state ${comparison.candidateStateId}; candidate ${candidate.candidateSha256}.`;
    selected.push(Object.freeze({
      id: candidateArtifactId,
      syntheticPath: `synthetic-q9/${fixtureId}/comparison-${index + 1}-candidate.txt`,
      sha256: sha256(candidateContent),
      content: candidateContent,
      truncated: false,
    }), Object.freeze({
      id: referenceArtifactId,
      syntheticPath: `synthetic-q9/${fixtureId}/comparison-${index + 1}-reference.txt`,
      sha256: reference.snapshotSha256,
      content: referenceContent,
      truncated: false,
    }));
    comparisonTrials.push(Object.freeze({
      comparisonId: comparison.id,
      criterionId: row.id,
      referenceId: comparison.referenceId,
      dimensionId: comparison.dimensionId,
      candidateArtifactId,
      referenceArtifactId,
      presentationOrder: (index + candidate.round) % 2 === 0 ? "A-B" as const : "B-A" as const,
    }));
  }
  return Object.freeze({
    selected: Object.freeze(selected),
    comparisonTrials: Object.freeze(comparisonTrials),
  });
}

function latestRetryableCriticEvent(loop: Loop, candidate: SerialCandidateV1) {
  return [...(current(loop)?.workflow.events ?? [])].reverse().find((event) =>
    event.kind === "operation" && event.operationKind === "critic"
      && (event.status === "unavailable" || event.status === "interrupted")
      && event.round === candidate.round && event.candidateSha256 === candidate.candidateSha256
      && event.taskSpecSha256 === candidate.taskSpecSha256
      && event.activeEvidencePlanSha256 === candidate.evidencePlanSha256) ?? null;
}

/** A Q9 task gets one unavailable retry across both rounds. Once that retry
 * itself is unavailable, asking the owner to approve another card would be a
 * lie: Core must refuse it. */
function criticRetryExhausted(loop: Loop, candidate: SerialCandidateV1): boolean {
  const workflow = current(loop)?.workflow;
  return workflow?.unavailableRetryUsed === true && latestRetryableCriticEvent(loop, candidate) !== null;
}

function prepareCritic(loop: Loop, candidate: SerialCandidateV1): PreparedCritic | null {
  if (!q9E2eGuardPresent() || candidate.criticMode === "off" || candidate.phase !== "awaiting-critic") return null;
  if (criticRetryExhausted(loop, candidate)) return null;
  const authority = serialCandidateTaskSpecAuthority(candidate);
  const evidence = composeSerialCandidatePolicyEvidence(candidate);
  if (!authority || !evidence) return null;
  const attempt = candidate.callsUsed.critic + 1;
  if (attempt < 1 || attempt > 3) return null;
  const fixtureId = `q9-task-r${candidate.round}-a${attempt}`;
  const synthetic = syntheticCriticEvidence(candidate, authority.taskSpec, authority.evidencePlan, fixtureId);
  if (!synthetic) return null;
  const priorConfirmedFindings = candidate.round === 0
    ? Object.freeze([])
    : serialCandidatePriorConfirmedFindings(candidate);
  if (priorConfirmedFindings === null) return null;
  const manifestSha256 = sha256(canonicalQ9Json(synthetic.selected));
  const packetAuthority = composeCriticSyntheticTaskPacketAuthorityContext(authority.taskSpec, authority.evidencePlan, {
    version: CRITIC_SYNTHETIC_TASK_PACKET_AUTHORITY_CONTEXT_VERSION,
    selectionVersion: CRITIC_SYNTHETIC_TASK_SELECTION_VERSION,
    manifestSha256,
    fixtureId,
    syntheticScopeSha256: candidate.projectRootSha256,
    connectionConsentVersion: SYNTHETIC_TASK_CRITIC_ROUTE_V1.connectionConsentVersion,
    taskSpecSha256: candidate.taskSpecSha256,
    evidencePlanSha256: candidate.evidencePlanSha256,
    candidateSha256: candidate.candidateSha256,
    selectedSyntheticText: synthetic.selected,
    checkEvidence: evidence.checkEvidence,
    priorConfirmedFindings,
    comparisonTrials: synthetic.comparisonTrials,
  });
  const request = packetAuthority
    ? composeCriticRequest(authority.taskSpec, authority.evidencePlan, packetAuthority)
    : null;
  const authorization = request ? composeCriticCallAuthorization(request, {
    ...SYNTHETIC_TASK_CRITIC_ROUTE_V1,
    runId: candidate.runId,
    candidateRound: candidate.round,
    callAttempt: attempt,
  }) : null;
  const requestDigest = request ? criticRequestSha256(request) : null;
  const authorizationDigest = authorization ? criticCallAuthorizationSha256(authorization) : null;
  if (!request || !authorization || !requestDigest || !authorizationDigest) return null;
  const disclosure = openSyntheticTaskCriticCallApproval({
    dir: loop.projectRoot,
    request,
    authorization,
    mode: candidate.criticMode,
  });
  if (!disclosure) return null;
  const latestUnavailable = latestRetryableCriticEvent(loop, candidate);
  return Object.freeze({
    request,
    authorization,
    disclosure,
    requestSha256: requestDigest,
    authorizationSha256: authorizationDigest,
    operationId: randomUUID(),
    retryOfOperationId: latestUnavailable?.kind === "operation" ? latestUnavailable.operationId : null,
  });
}

function clearCards(loop: Loop): void {
  if (loop.repair) clearRepairCallApprovalIfCurrent(loop.projectRoot, loop.repair.disclosure);
  if (loop.critic) clearCriticCallApprovalIfCurrent(loop.projectRoot, loop.critic.disclosure);
  if (loop.harness) clearQ9HarnessRevisionApprovalIfCurrent(loop.projectRoot, loop.harness.disclosure);
  loop.repair = null;
  loop.critic = null;
  loop.harness = null;
}

function terminalCardInput(loop: Loop, result: SerialCandidateTerminalResult): PendingRunTerminalCardInputV1 | undefined {
  return q9TerminalCardInputForResult(result, loop.session);
}

function terminalize(
  loop: Loop,
  input: Readonly<{ kind: "stop"; reason: SerialStopReason }>
    | Readonly<{ kind: "finalize"; sealAuthorization: SerialCandidateSealAuthorizationV1 }>,
): void {
  if (loop.result || loop.status === "stopping") return;
  loop.status = "stopping";
  clearCards(loop);
  if (loop.taskReviewAuthority) invalidateTaskReviewAuthority(loop.taskReviewAuthority);
  loop.taskReviewAuthority = null;
  loop.taskReview = null;
  notify(loop);
  let attempted: PendingSerialCandidateTerminalAttemptV1 | null = null;
  try {
    attempted = input.kind === "stop"
      ? loop.dependencies.terminal.settle({
          projectRoot: loop.projectRoot,
          kind: "stop",
          reason: input.reason,
          cardForResult: (result) => terminalCardInput(loop, result),
        })
      : loop.dependencies.terminal.settle({
          projectRoot: loop.projectRoot,
          kind: "finalize",
          sealAuthorization: input.sealAuthorization,
          cardForResult: (result) => terminalCardInput(loop, result),
        });
  } catch {
    loop.status = "recovery-required";
    loop.refusal = "Q9_TERMINAL_THROW";
    notify(loop);
    return;
  }
  if (!attempted?.journal.ok || !attempted.result) {
    loop.status = "recovery-required";
    loop.refusal = attempted?.journal.ok === false ? attempted.journal.code : "Q9_TERMINAL_REFUSED";
    notify(loop);
    return;
  }
  const result = attempted.result;
  loop.result = result;
  loop.status = "settled";
  const card = loop.session.conversationId === null ? null : q9TerminalCardFor(result, loop.session, loop.taskReview);
  loops.delete(loop.key);
  loop.resolve(result);
  try { loop.dependencies.onTerminal?.(loop.projectRoot, result, card); } catch { /* output observer only */ }
  notify(loop);
}

function failClosed(loop: Loop, code: string, reason: SerialStopReason = "Q9_WORKFLOW_VERIFICATION_FAILED"): void {
  loop.refusal = code;
  terminalize(loop, { kind: "stop", reason });
}

function requireRecovery(loop: Loop, code: string): void {
  loop.status = "recovery-required";
  loop.refusal = code;
  clearCards(loop);
  if (loop.taskReviewAuthority) invalidateTaskReviewAuthority(loop.taskReviewAuthority);
  loop.taskReviewAuthority = null;
  notify(loop);
}

function transitionOptionalDecline(
  loop: Loop,
  candidate: SerialCandidateV1,
  ownerActionReceiptSha256: string,
  actionNonce: string,
  decidedAt: string,
): boolean {
  const authorization = authorizeSerialCandidateOptionalCriticDecline(candidate, {
    declined: true,
    actionNonce,
    decidedAt,
    ownerActionReceiptSha256,
  });
  const next = authorization
    ? settleSerialCandidateOptionalCriticDecline(candidate, authorization)
    : null;
  if (next === null || !checkpoint(loop, next)) return false;
  retireReview(loop);
  return true;
}

function interruptedCriticEventFor(
  loop: Loop,
  candidate: SerialCandidateV1,
  reservation: Readonly<{
    attempt: number;
    authorizationSha256: string;
    requestSha256: string | null;
    routeRequestFingerprintSha256: string | null;
  }>,
) {
  const identity = candidateIdentity(candidate);
  if (identity === null || reservation.requestSha256 === null
    || reservation.routeRequestFingerprintSha256 === null) return null;
  return [...(current(loop)?.workflow.events ?? [])].reverse().find((event) =>
    event.kind === "operation" && event.operationKind === "critic" && event.status === "interrupted"
      && event.candidateSha256 === candidate.candidateSha256
      && event.candidateIdentitySha256 === identity
      && event.taskSpecSha256 === candidate.taskSpecSha256
      && event.activeEvidencePlanSha256 === candidate.evidencePlanSha256
      && event.round === candidate.round && event.attempt === reservation.attempt
      && event.authorizationSha256 === reservation.authorizationSha256
      && event.requestSha256 === reservation.requestSha256
      && event.routeReceiptSha256 === reservation.routeRequestFingerprintSha256) ?? null;
}

function openRepair(loop: Loop, candidate: SerialCandidateV1): boolean {
  if (!q9E2eGuardPresent() || loop.dependencies.repairWriter.kind !== "synthetic-q9-builder") return false;
  const preview = composeSerialRepairPreview(loop.projectRoot, candidate);
  if (!preview || serialRepairPreviewSha256(preview) === null) return false;
  const route = q9SyntheticRepairDisclosure(loop.projectRoot, preview);
  if (!route || q9SyntheticRepairDisclosureSha256(route) === null) return false;
  const approvalAuthorization = mintRepairCallAuthorization({ dir: loop.projectRoot, preview, route });
  if (!approvalAuthorization || !repairCallAuthorizationCoversPreview(approvalAuthorization, preview, route)) return false;
  const disclosure = openRepairCallApproval({ dir: loop.projectRoot, authorization: approvalAuthorization });
  if (!disclosure || !repairCallAuthorizationCoversDisclosure(approvalAuthorization, disclosure)) return false;
  loop.repair = Object.freeze({
    preview,
    route,
    approvalAuthorization,
    disclosure,
    operationId: randomUUID(),
  });
  loop.status = "awaiting-repair-approval";
  notify(loop);
  return true;
}

function assessmentEvent(candidate: SerialCandidateV1, assessment: CriticAssessmentV1): PendingRunWorkflowEventInputV1 | null {
  const canonicalPayload = canonicalCriticAssessment(assessment);
  const digest = criticAssessmentSha256(assessment);
  const identity = candidateIdentity(candidate);
  if (!canonicalPayload || !digest || identity === null || sha256(canonicalPayload) !== digest) return null;
  return Object.freeze({
    kind: "authority",
    authorityKind: "assessment",
    authoritySha256: digest,
    canonicalPayload,
    assessmentSha256: null,
    candidateSha256: candidate.candidateSha256,
    candidateIdentitySha256: identity,
    taskSpecSha256: candidate.taskSpecSha256,
    activeEvidencePlanSha256: candidate.evidencePlanSha256,
    round: candidate.round,
  });
}

function unavailableReason(result: CriticCallResultV1): "transport-unavailable" | "malformed-output" | "process-crash" {
  if (result.kind === "refused") return "process-crash";
  if (result.kind !== "unavailable") return "malformed-output";
  return result.code === "CRITIC_CALL_MALFORMED_RESPONSE" || result.code === "CRITIC_CALL_OUTPUT_TOO_LARGE"
    || result.code === "CRITIC_CALL_MODEL_MISMATCH" || result.code === "CRITIC_CALL_CUSTODY_UNAVAILABLE"
    ? "malformed-output" : "transport-unavailable";
}

async function runApprovedCritic(loop: Loop, prepared: PreparedCritic, grant: object): Promise<void> {
  const before = current(loop);
  const taken = takeCriticCallAuthorization(grant);
  if (!before || !taken || taken !== prepared.authorization) {
    failClosed(loop, "Q9_CRITIC_GRANT_MISMATCH");
    return;
  }
  const latestCriticCustody = [...(serialCandidateAttemptCustody(before.candidate) ?? [])].reverse().find((row) =>
    row.reservation.kind === "critic" && row.reservation.round === before.candidate.round
      && row.reservation.candidateSha256 === before.candidate.candidateSha256
      && row.reservation.taskSpecSha256 === before.candidate.taskSpecSha256
      && row.reservation.evidencePlanSha256 === before.candidate.evidencePlanSha256);
  const priorUnavailable = latestCriticCustody?.status === "unavailable"
    ? latestCriticCustody.reservation
    : undefined;
  const reserved = reserveSerialCandidateCritic(before.candidate, taken, priorUnavailable);
  const base = reserved && operationEvent(reserved.candidate, {
    operationKind: "critic",
    operationId: prepared.operationId,
    status: "reserved",
    previewId: prepared.disclosure.approvalId,
    previewSha256: sha256(canonicalQ9Json(prepared.disclosure)),
    authorizationSha256: prepared.authorizationSha256,
    routeReceiptSha256: prepared.authorization.routeRequestFingerprintSha256,
    requestSha256: prepared.requestSha256,
    attempt: prepared.authorization.callAttempt,
    retryOfOperationId: prepared.retryOfOperationId,
    outcomeSha256: null,
  });
  if (!reserved) {
    failClosed(loop, "Q9_CRITIC_RESERVATION_REFUSED");
    return;
  }
  if (!base || !checkpointWithEvent(loop, reserved.candidate, base)) {
    requireRecovery(loop, "Q9_CRITIC_RESERVATION_NOT_DURABLE");
    return;
  }
  if (cutPoint(loop, "after-reserve")) return;
  const sending = Object.freeze({ ...base, status: "sending" as const });
  if (!appendEvent(loop, sending)) {
    requireRecovery(loop, "Q9_CRITIC_SEND_NOT_DURABLE");
    return;
  }
  loop.status = "critic-running";
  loop.critic = null;
  notify(loop);
  let result: CriticCallResultV1;
  const call = await boundedCall(loop, "critic", prepared.disclosure.timeoutMs, (signal) =>
    loop.dependencies.criticTransport.send({
      request: prepared.request,
      authorization: taken,
      candidate: reserved.candidate,
      reservation: reserved.reservation,
      signal,
    }));
  if (call.status === "returned") {
    result = call.value;
  } else if (call.status === "aborted") {
    result = Object.freeze({
      kind: "unavailable",
      sent: true,
      code: "CRITIC_CALL_NETWORK_ERROR",
      status: null,
      ownerMessage: call.timedOut
        ? "The injected Q9 critic reached its disclosed deadline."
        : "The injected Q9 critic was cancelled before returning a result.",
    });
  } else {
    result = Object.freeze({
      kind: "refused",
      sent: false,
      code: "CRITIC_CALL_AUTHORIZATION_INVALID",
      ownerMessage: "The injected Q9 critic stopped before returning a result.",
    });
  }
  if (cutPoint(loop, "after-send")) return;
  const active = current(loop);
  if (!active || active.candidate !== reserved.candidate) {
    requireRecovery(loop, "Q9_CRITIC_CANDIDATE_CHANGED");
    return;
  }
  if (result.kind !== "answered") {
    const reason = unavailableReason(result);
    const outcome = Object.freeze({ ...base, status: "unavailable" as const, outcomeSha256: sha256(canonicalQ9Json({ reason })) });
    const next = settleSerialCandidateCritic(active.candidate, reserved.reservation, null, reason);
    if (!next) {
      failClosed(loop, "Q9_CRITIC_UNAVAILABLE_SETTLE_REFUSED");
      return;
    }
    if (!checkpointWithEvent(loop, next, outcome)) {
      requireRecovery(loop, "Q9_CRITIC_UNAVAILABLE_NOT_DURABLE");
      return;
    }
    loop.assessment = null;
    retireReview(loop);
    loop.status = "checking";
    await progress(loop);
    return;
  }
  const assessment = composeCriticAssessment(prepared.request, result.rawOutput, result.custody);
  if (!assessment) {
    const outcome = Object.freeze({ ...base, status: "unavailable" as const, outcomeSha256: sha256("malformed-output") });
    const next = settleSerialCandidateCritic(active.candidate, reserved.reservation, null, "malformed-output");
    if (!next) {
      failClosed(loop, "Q9_CRITIC_OUTPUT_SETTLE_REFUSED");
      return;
    }
    if (!checkpointWithEvent(loop, next, outcome)) {
      requireRecovery(loop, "Q9_CRITIC_OUTPUT_NOT_DURABLE");
      return;
    }
    loop.assessment = null;
    retireReview(loop);
    loop.status = "checking";
    await progress(loop);
    return;
  }
  const assessmentDigest = criticAssessmentSha256(assessment);
  const authorityEvent = assessmentEvent(active.candidate, assessment);
  if (!assessmentDigest || !authorityEvent || !appendEvent(loop, authorityEvent)) {
    requireRecovery(loop, "Q9_CRITIC_ASSESSMENT_NOT_DURABLE");
    return;
  }
  const answered = Object.freeze({ ...base, status: "answered" as const, outcomeSha256: assessmentDigest });
  loop.assessment = assessment;
  if (!replaceReview(loop, assessment)) {
    requireRecovery(loop, "Q9_CRITIC_REVIEW_REFUSED");
    return;
  }
  const policy = policyFor(loop, active.candidate, assessment);
  const decision = policy ? composeCriticPolicyDecision(
    policy.authority.taskSpec,
    policy.authority.evidencePlan,
    policy.context,
  ) : null;
  const decisionDigest = decision ? criticPolicyDecisionSha256(decision) : null;
  if (!policy || !decision || !decisionDigest) {
    requireRecovery(loop, "Q9_CRITIC_POLICY_REFUSED");
    return;
  }
  // A usable critic result is settled before any Cairn failure confirmation.
  // Core moves a Cairn-blocked result to its exact owner-confirmation wait;
  // Main must not mint/spend repair authority speculatively here.
  const next = settleSerialCandidateCritic(active.candidate, reserved.reservation, decision);
  if (!next) {
    requireRecovery(loop, "Q9_CRITIC_SETTLE_REFUSED");
    return;
  }
  if (!checkpointWithEvent(loop, next, answered)) {
    requireRecovery(loop, "Q9_CRITIC_ANSWER_NOT_DURABLE");
    return;
  }
  retireReview(loop);
  loop.status = "checking";
  await progress(loop);
}

async function runApprovedRepair(loop: Loop, approved: ApprovedRepair, grant: object): Promise<void> {
  const { prepared } = approved;
  const before = current(loop);
  const taken = takeRepairCallAuthorization(grant);
  if (!before || !taken || taken !== prepared.approvalAuthorization
    || !repairCallAuthorizationCoversPreview(taken, prepared.preview, prepared.route)
    || !repairCallAuthorizationCoversDisclosure(taken, prepared.disclosure)) {
    failClosed(loop, "Q9_REPAIR_GRANT_MISMATCH");
    return;
  }
  const reserved = reserveSerialCandidateRepair(
    loop.projectRoot,
    before.candidate,
    prepared.preview,
    approved.ownerAuthorization,
  );
  const base = reserved && operationEvent(reserved.candidate, {
    operationKind: "repair",
    operationId: prepared.operationId,
    status: "reserved",
    previewId: prepared.disclosure.approvalId,
    previewSha256: prepared.preview.repairPreviewSha256,
    authorizationSha256: approved.authorizationSha256,
    routeReceiptSha256: approved.routeReceiptSha256,
    requestSha256: approved.requestSha256,
    attempt: 1,
    retryOfOperationId: null,
    outcomeSha256: null,
  });
  if (!reserved) {
    failClosed(loop, "Q9_REPAIR_RESERVATION_REFUSED");
    return;
  }
  if (!base || !checkpointWithEvent(loop, reserved.candidate, base)) {
    requireRecovery(loop, "Q9_REPAIR_RESERVATION_NOT_DURABLE");
    return;
  }
  if (cutPoint(loop, "after-reserve")) return;
  const sending = Object.freeze({ ...base, status: "sending" as const });
  if (!appendEvent(loop, sending)) {
    requireRecovery(loop, "Q9_REPAIR_SEND_NOT_DURABLE");
    return;
  }
  if (!consumeQ9SyntheticRepairAuthorization(
    approved.routeAuthorization,
    approved.request,
    reserved.candidate,
    reserved.reservation,
  )) {
    requireRecovery(loop, "Q9_REPAIR_AUTHORIZATION_NOT_CONSUMABLE");
    return;
  }
  loop.status = "repair-running";
  loop.repair = null;
  notify(loop);
  const call = await boundedCall(loop, "repair", prepared.disclosure.timeoutMs, (signal) =>
    loop.dependencies.repairWriter.run({
      projectRoot: loop.projectRoot,
      request: approved.request,
      candidate: reserved.candidate,
      instruction: reserved.instruction,
      signal,
    }));
  if (cutPoint(loop, "after-send")) return;
  if (call.status !== "returned") {
    const timedOut = call.status === "aborted" && call.timedOut;
    const cancelled = !timedOut && loop.controller.signal.aborted;
    const outcome = Object.freeze({
      ...base,
      status: cancelled ? "cancelled" as const : "unavailable" as const,
      outcomeSha256: sha256(cancelled ? "repair-cancelled" : timedOut ? "repair-timed-out" : "repair-failed"),
    });
    if (!appendEvent(loop, outcome)) loop.refusal = "Q9_REPAIR_FAILURE_NOT_DURABLE";
    terminalize(loop, {
      kind: "stop",
      reason: cancelled ? "CANCELLED_BY_OWNER" : timedOut ? "ADAPTER_TIMED_OUT" : "ADAPTER_FAILED",
    });
    return;
  }
  const workerResult = call.value;
  const active = current(loop);
  if (!active || active.candidate !== reserved.candidate) {
    requireRecovery(loop, "Q9_REPAIR_CANDIDATE_CHANGED");
    return;
  }
  const rawDigest = sha256(canonicalQ9Json(workerResult));
  const answered = Object.freeze({ ...base, status: "answered" as const, outcomeSha256: rawDigest });
  const captured = captureSerialCandidateAfterRepair(active.candidate, reserved.instruction);
  if (!captured.eligible) {
    const unavailable = Object.freeze({
      ...base,
      status: "unavailable" as const,
      outcomeSha256: sha256(canonicalQ9Json(["repair-capture", captured.reason])),
    });
    if (!appendEvent(loop, unavailable)) requireRecovery(loop, "Q9_REPAIR_CAPTURE_NOT_DURABLE");
    else failClosed(loop, `Q9_REPAIR_CAPTURE_${captured.reason}`);
    return;
  }
  const replacement = adoptSerialCandidateRepairResult(
    active.candidate,
    reserved.instruction,
    captured.bundle,
    workerResult,
  );
  if (!replacement) {
    const unavailable = Object.freeze({
      ...base,
      status: "unavailable" as const,
      outcomeSha256: sha256(canonicalQ9Json(["repair-adoption", rawDigest])),
    });
    if (!appendEvent(loop, unavailable)) requireRecovery(loop, "Q9_REPAIR_ADOPTION_NOT_DURABLE");
    else failClosed(loop, "Q9_REPAIR_ADOPTION_REFUSED");
    return;
  }
  if (!checkpointWithEvent(loop, replacement, answered)) {
    requireRecovery(loop, "Q9_REPAIR_RESULT_NOT_DURABLE");
    return;
  }
  loop.assessment = null;
  retireReview(loop);
  loop.status = "checking";
  await progress(loop);
}

async function runApprovedHarnessRevision(
  loop: Loop,
  approved: ApprovedHarnessRevision,
): Promise<void> {
  const active = current(loop);
  const { prepared, authorized, authorizationSha256 } = approved;
  if (!active || active.candidate !== prepared.candidate
    || authorized.authorization.fromPlanSha256 !== active.candidate.evidencePlanSha256
    || authorized.authorization.toPlanSha256 !== prepared.preview.toPlanSha256) {
    failClosed(loop, "Q9_HARNESS_AUTHORIZATION_MISMATCH");
    return;
  }
  const authorizationEvent = harnessAuthorityEvent(
    active.candidate,
    "harness-authorization",
    authorized.authorization,
  );
  if (!authorizationEvent || authorizationEvent.authoritySha256 !== authorizationSha256
    || !appendEvent(loop, authorizationEvent)) {
    requireRecovery(loop, "Q9_HARNESS_AUTHORIZATION_NOT_DURABLE");
    return;
  }
  const revised = adoptSerialCandidateEvidencePlanRevisionForRun(active.candidate, authorized);
  const revisionEvent: PendingRunEvidencePlanEventInputV1 = Object.freeze({
    kind: "evidence-plan-revision",
    fromEvidencePlanSha256: prepared.preview.fromPlanSha256,
    toEvidencePlanSha256: prepared.preview.toPlanSha256,
    authorizationSha256,
    failedOutputSha256: prepared.failure.outputSha256,
  });
  if (!revised || revised.lineage.evidencePlan.revision !== 1
    || revised.evidencePlanSha256 !== prepared.preview.toPlanSha256
    || !checkpointWithEvent(loop, revised, revisionEvent)) {
    requireRecovery(loop, "Q9_HARNESS_REVISION_NOT_DURABLE");
    return;
  }
  const harness = loop.dependencies.harnessRevision;
  if (!harness || harness.kind !== "synthetic-q9-harness-revision") {
    failClosed(loop, "Q9_HARNESS_DEPENDENCY_MISSING");
    return;
  }
  loop.status = "harness-running";
  notify(loop);
  const rerun = await boundedCall(loop, "harness", 60_000, (signal) =>
    rerunSerialCandidateQ9RevisedEvidence(
      revised,
      harness.adapter,
      harness.writerIsolation,
      signal,
    ));
  if (rerun.status !== "returned" || rerun.value === null) {
    terminalize(loop, {
      kind: "stop",
      reason: rerun.status === "aborted" && rerun.timedOut ? "ADAPTER_TIMED_OUT"
        : loop.controller.signal.aborted ? "CANCELLED_BY_OWNER" : "ADAPTER_FAILED",
    });
    return;
  }
  if (rerun.value !== revised) {
    requireRecovery(loop, "Q9_HARNESS_RERUN_IDENTITY_MISMATCH");
    return;
  }
  const rerunCheckpoint = checkpointPendingSerialCandidateHarnessRerun(
    loop.projectRoot,
    rerun.value,
    loop.evidence,
  );
  if (!rerunCheckpoint.ok) {
    requireRecovery(loop, "Q9_HARNESS_RERUN_NOT_DURABLE");
    return;
  }
  loop.status = "checking";
  await progress(loop);
}

async function progress(loop: Loop): Promise<void> {
  if (loop.result || loop.status === "stopping" || loop.status === "recovery-required"
    || loop.status === "repair-running" || loop.status === "critic-running"
    || loop.status === "harness-running" || loop.status === "awaiting-harness-revision"
    || loop.status === "awaiting-repair-approval" || loop.status === "awaiting-critic-approval") return;
  if (loop.controller.signal.aborted) {
    terminalize(loop, { kind: "stop", reason: "CANCELLED_BY_OWNER" });
    return;
  }
  const active = current(loop);
  if (!active) {
    loop.status = "recovery-required";
    loop.refusal = "Q9_PENDING_CANDIDATE_MISSING";
    notify(loop);
    return;
  }
  const candidate = active.candidate;
  const harnessFailure = serialCandidateQ9HarnessFailure(candidate);
  if (harnessFailure !== null) {
    const failureSha256 = serialQ9HarnessFailureSha256(harnessFailure);
    const preview = previewSerialCandidateQ9HarnessRevision(candidate, harnessFailure);
    const previewSha256 = preview ? sha256(canonicalQ9Json(preview)) : null;
    if (!failureSha256 || !preview || !previewSha256) {
      failClosed(loop, "Q9_HARNESS_FAILURE_CUSTODY_REFUSED");
      return;
    }
    const durable = durableHarnessDecision(loop, candidate);
    if (durable !== null) {
      if (durable.payload.failureSha256 !== failureSha256
        || durable.payload.previewSha256 !== previewSha256) {
        failClosed(loop, "Q9_HARNESS_DECISION_CUSTODY_MISMATCH");
        return;
      }
      // A durable refusal must move forward to STOP. A durable approval whose
      // process-local authorization/rerun did not checkpoint is never replayed.
      terminalize(loop, {
        kind: "stop",
        reason: durable.payload.outcome === "task-stopped"
          ? "CANCELLED_BY_OWNER"
          : "Q9_WORKFLOW_VERIFICATION_FAILED",
      });
      return;
    }
    if (loop.dependencies.harnessRevision?.kind !== "synthetic-q9-harness-revision") {
      failClosed(loop, "Q9_HARNESS_DEPENDENCY_MISSING");
      return;
    }
    const prepared = openQ9HarnessRevisionApproval({ dir: loop.projectRoot, candidate });
    if (!prepared || prepared.failure.failureSha256 !== failureSha256
      || sha256(canonicalQ9Json(prepared.preview)) !== previewSha256) {
      failClosed(loop, "Q9_HARNESS_APPROVAL_REFUSED");
      return;
    }
    retireReview(loop);
    loop.harness = prepared;
    loop.status = "awaiting-harness-revision";
    notify(loop);
    return;
  }
  const durableChoice = outstandingDecision(loop);
  if (durableChoice) {
    if (!decisionMatchesCandidate(durableChoice, candidate)) {
      failClosed(loop, "Q9_DURABLE_DECISION_CANDIDATE_MISMATCH");
      return;
    }
    if (durableChoice.outcome === "approved") {
      // The owner choice survived, but its one-use in-memory grant did not.
      // Reopening or auto-sending would turn one press into a second call.
      failClosed(loop, "Q9_APPROVED_DECISION_INTERRUPTED");
      return;
    }
    if (durableChoice.outcome === "task-stopped" || durableChoice.decisionKind === "repair") {
      terminalize(loop, { kind: "stop", reason: "CANCELLED_BY_OWNER" });
      return;
    }
    if (candidate.phase === "awaiting-critic") {
      if (durableChoice.candidateIdentitySha256 !== candidateIdentity(candidate)
        || !transitionOptionalDecline(
          loop,
          candidate,
          durableChoice.eventSha256,
          durableChoice.approvalId,
          durableChoice.decidedAt,
        )) {
        failClosed(loop, "Q9_OPTIONAL_DECLINE_RESTORE_REFUSED");
        return;
      }
      loop.status = "checking";
      await progress(loop);
      return;
    }
    if (candidate.criticMode !== "optional" || candidate.phase !== "ready-to-seal") {
      failClosed(loop, "Q9_OPTIONAL_DECLINE_STATE_MISMATCH");
      return;
    }
    // Crash after the strict Core transition but before terminal preparation:
    // ready-to-seal proves this same guarded optional path already applied.
  }
  if (candidate.phase === "awaiting-repair-result") {
    failClosed(loop, "Q9_REPAIR_INTERRUPTED");
    return;
  }
  if (candidate.phase === "awaiting-critic-result") {
    const custody = serialCandidateAttemptCustody(candidate)?.find((row) =>
      row.reservation.kind === "critic" && row.status === "reserved"
      && row.reservation.attempt === candidate.callsUsed.critic);
    const interrupted = custody ? interruptedCriticEventFor(loop, candidate, custody.reservation) : null;
    if (!custody || !interrupted || serialCandidateAttemptReservationSha256(custody.reservation) === null) {
      failClosed(loop, "Q9_CRITIC_RESERVATION_MISSING");
      return;
    }
    const next = settleSerialCandidateCritic(candidate, custody.reservation, null, "process-crash");
    if (!next || !checkpoint(loop, next)) {
      failClosed(loop, "Q9_CRITIC_INTERRUPTED_SETTLE_REFUSED");
      return;
    }
    loop.assessment = null;
    retireReview(loop);
    loop.status = "checking";
    await progress(loop);
    return;
  }
  if (!loop.taskReviewAuthority && !replaceReview(loop, loop.assessment)) {
    failClosed(loop, "Q9_TASK_REVIEW_REFUSED");
    return;
  }
  const evaluated = policyFor(loop, candidate, loop.assessment);
  if (!evaluated) {
    failClosed(loop, "Q9_POLICY_CONTEXT_REFUSED");
    return;
  }
  if (candidate.phase === "awaiting-owner-resolution") {
    // A native boundary is already terminal. It has precedence over every
    // optional owner-review surface: Cairn must not ask the owner to confirm,
    // dismiss, or reinterpret a failed check after the native STOP controls.
    if (evaluated.policy.state === "stopped" || evaluated.policy.state === "critic-unavailable") {
      terminalize(loop, {
        kind: "stop",
        reason: evaluated.policy.state === "stopped"
          ? "Q9_NATIVE_BOUNDARY_STOPPED"
          : "Q9_CRITIC_CALLS_EXHAUSTED",
      });
      return;
    }
    if (incompleteNonCairnOwnerRows(loop.taskReview)) {
      terminalize(loop, { kind: "stop", reason: "Q9_REQUIRED_EVIDENCE_INCOMPLETE" });
      return;
    }
    if (evaluated.policy.waitingOwner.length > 0) {
      const actionable = loop.taskReview?.criteria.some((criterion) => criterion.ownerChecks.some((row) =>
        row.kind !== "cairn-failure" && row.action !== null)) ?? false;
      if (actionable) {
        loop.status = "awaiting-owner";
        notify(loop);
      } else {
        terminalize(loop, { kind: "stop", reason: "Q9_REQUIRED_EVIDENCE_INCOMPLETE" });
      }
      return;
    }
    const unconfirmedCairn = loop.taskReview?.criteria.some((criterion) => criterion.ownerChecks.some((row) =>
      row.kind === "cairn-failure" && (row.status === "not-ready" || row.status === "awaiting-confirmation"))) ?? false;
    const refusedCairn = evaluated.cairnFailureDecisions.some((decision) => decision.outcome !== "confirmed");
    if (refusedCairn) {
      terminalize(loop, { kind: "stop", reason: "Q9_REQUIRED_EVIDENCE_INCOMPLETE" });
      return;
    }
    if (unconfirmedCairn) {
      loop.status = "awaiting-owner";
      notify(loop);
      return;
    }
    if (evaluated.missingLiveCairnConfirmations.length > 0) {
      // The owner decision made it to the authenticated journal, but the
      // process stopped before its live Core confirmation was consumed into
      // the checkpointed candidate. Never recreate that authority or show the
      // decision card again. The exact safe recovery is one terminal STOP.
      terminalize(loop, { kind: "stop", reason: "Q9_WORKFLOW_VERIFICATION_FAILED" });
      return;
    }
    if (evaluated.policy.state === "waiting-owner") {
      loop.status = "awaiting-owner";
      notify(loop);
      return;
    }
    const decision = composeCriticPolicyDecision(
      evaluated.authority.taskSpec,
      evaluated.authority.evidencePlan,
      evaluated.context,
    );
    const repairAuthority = evaluated.policy.state === "blocked"
      ? composeCriticRepairAuthority(
          evaluated.authority.taskSpec,
          evaluated.authority.evidencePlan,
          evaluated.context,
          evaluated.confirmations,
        )
      : null;
    const next = decision ? settleSerialCandidateOwnerResolution(
      candidate,
      decision,
      repairAuthority ?? undefined,
    ) : null;
    if (!next || !checkpoint(loop, next)) {
      failClosed(loop, "Q9_OWNER_RESOLUTION_SETTLE_REFUSED");
      return;
    }
    retireReview(loop);
    loop.status = "checking";
    await progress(loop);
    return;
  }
  if (evaluated.policy.state === "stopped") {
    terminalize(loop, { kind: "stop", reason: "Q9_NATIVE_BOUNDARY_STOPPED" });
    return;
  }
  // An authenticated original-check regression after the one permitted repair
  // is already terminal. It must not be hidden behind a final required-critic
  // approval that cannot authorize another repair or change that Cairn fact.
  // Round-zero required-critic failures still keep their bounded retry
  // precedence below, even when another verifier has found a blocker.
  if (evaluated.policy.state === "blocked"
    && (candidate.round !== 0 || candidate.callsUsed.repair !== 0)) {
    terminalize(loop, { kind: "stop", reason: "Q9_REQUIRED_CHECK_STILL_FAILED" });
    return;
  }
  // A frozen required critic must finish its own bounded route before any
  // deterministic Cairn blocker can be offered for repair. In particular, an
  // unavailable first call gets only its permitted retry, and exhaustion
  // STOPs even when another verifier already found a repairable failure.
  if (candidate.phase === "awaiting-critic" && candidate.criticMode === "required") {
    if (candidate.callsUsed.critic >= 3 || criticRetryExhausted(loop, candidate)) {
      terminalize(loop, { kind: "stop", reason: "Q9_CRITIC_CALLS_EXHAUSTED" });
      return;
    }
    const prepared = prepareCritic(loop, candidate);
    if (!prepared) {
      failClosed(loop, "Q9_SYNTHETIC_CRITIC_ROUTE_REFUSED");
      return;
    }
    loop.critic = prepared;
    loop.status = "awaiting-critic-approval";
    notify(loop);
    return;
  }
  if (evaluated.policy.state === "blocked") {
    if (evaluated.policy.waitingOwner.length > 0 || incompleteNonCairnOwnerRows(loop.taskReview)) {
      terminalize(loop, { kind: "stop", reason: "Q9_REQUIRED_EVIDENCE_INCOMPLETE" });
      return;
    }
    const unconfirmedCairn = loop.taskReview?.criteria.some((criterion) => criterion.ownerChecks.some((row) =>
      row.kind === "cairn-failure" && (row.status === "not-ready" || row.status === "awaiting-confirmation"))) ?? false;
    const refusedCairn = evaluated.cairnFailureDecisions.some((decision) => decision.outcome !== "confirmed");
    const hasOtherOwnerActions = loop.taskReview?.criteria.some((criterion) => criterion.ownerChecks.some((row) =>
      row.kind !== "cairn-failure" && row.action !== null)) ?? false;
    if (refusedCairn) {
      terminalize(loop, { kind: "stop", reason: "Q9_REQUIRED_EVIDENCE_INCOMPLETE" });
      return;
    }
    if (hasOtherOwnerActions || unconfirmedCairn) {
      loop.status = "awaiting-owner";
      notify(loop);
      return;
    }
    if (evaluated.missingLiveCairnConfirmations.length > 0
      && candidate.phase !== "awaiting-repair") {
      terminalize(loop, { kind: "stop", reason: "Q9_WORKFLOW_VERIFICATION_FAILED" });
      return;
    }
    let repairCandidate = candidate;
    if (candidate.phase !== "awaiting-repair") {
      const repairAuthority = composeCriticRepairAuthority(
        evaluated.authority.taskSpec,
        evaluated.authority.evidencePlan,
        evaluated.context,
        evaluated.confirmations,
      );
      if (!repairAuthority) {
        failClosed(loop, "Q9_REPAIR_AUTHORITY_REFUSED");
        return;
      }
      const admitted = admitSerialCandidateRepair(candidate, repairAuthority);
      if (!admitted || !checkpoint(loop, admitted.candidate)) {
        failClosed(loop, "Q9_REPAIR_ADMISSION_REFUSED");
        return;
      }
      repairCandidate = admitted.candidate;
      if (!replaceReview(loop, loop.assessment)) {
        failClosed(loop, "Q9_REPAIR_REVIEW_REFUSED");
        return;
      }
    }
    if (!openRepair(loop, repairCandidate)) failClosed(loop, "Q9_SYNTHETIC_REPAIR_ROUTE_REFUSED");
    return;
  }
  if (evaluated.policy.state === "waiting-owner") {
    loop.status = "awaiting-owner";
    notify(loop);
    return;
  }
  if (candidate.phase === "awaiting-critic") {
    if (candidate.callsUsed.critic >= 3 || criticRetryExhausted(loop, candidate)) {
      terminalize(loop, { kind: "stop", reason: "Q9_CRITIC_CALLS_EXHAUSTED" });
      return;
    }
    const prepared = prepareCritic(loop, candidate);
    if (!prepared) {
      failClosed(loop, "Q9_SYNTHETIC_CRITIC_ROUTE_REFUSED");
      return;
    }
    loop.critic = prepared;
    loop.status = "awaiting-critic-approval";
    notify(loop);
    return;
  }
  if (evaluated.policy.state === "critic-unavailable") {
    terminalize(loop, { kind: "stop", reason: "Q9_CRITIC_CALLS_EXHAUSTED" });
    return;
  }
  if (candidate.phase !== "ready-to-seal") {
    failClosed(loop, "Q9_CANDIDATE_PHASE_UNSUPPORTED");
    return;
  }
  const completion = composeCriticCompletionAuthority(
    evaluated.authority.taskSpec,
    evaluated.authority.evidencePlan,
    evaluated.context,
  );
  const seal = completion ? authorizeSerialCandidateSealFromCompletion(candidate, completion) : null;
  if (!seal) {
    // Missing owner evidence remains a visible human-judgment wait, never an
    // invented DONE. A fully answered surface that still cannot seal stops.
    const hasActions = loop.taskReview?.criteria.some((criterion) =>
      criterion.ownerChecks.some((row) => row.action !== null)) ?? false;
    if (hasActions) {
      loop.status = "awaiting-owner";
      notify(loop);
    } else terminalize(loop, { kind: "stop", reason: "Q9_REQUIRED_EVIDENCE_INCOMPLETE" });
    return;
  }
  terminalize(loop, { kind: "finalize", sealAuthorization: seal });
}

function schedule(loop: Loop, task: () => Promise<void> | void): void {
  loop.chain = loop.chain.then(async () => {
    if (loops.get(loop.key) !== loop || loop.result || loop.status === "recovery-required") return;
    await task();
  }).catch(() => {
    if (loops.get(loop.key) === loop) requireRecovery(loop, "Q9_ORCHESTRATOR_THROW");
  });
}

function validSession(value: Q9QualityLoopSessionV1): boolean {
  try {
    return (value.conversationId === null || isConversationId(value.conversationId))
      && typeof value.startedAt === "string" && ISO_INSTANT.test(value.startedAt)
      && new Date(value.startedAt).toISOString() === value.startedAt
      && typeof value.adapterIdentitySha256 === "string" && SHA256.test(value.adapterIdentitySha256)
      && (value.evidenceRunId === null || isEvidenceRunId(value.evidenceRunId))
      && (value.acceptedRequest === null || typeof value.acceptedRequest === "object");
  } catch {
    return false;
  }
}

function sessionEvent(candidate: SerialCandidateV1, session: Q9QualityLoopSessionV1): PendingRunWorkflowEventInputV1 | null {
  const identity = candidateIdentity(candidate);
  const canonicalPayload = canonicalQ9Json(session);
  if (identity === null || !validSession(session)) return null;
  return Object.freeze({
    kind: "session",
    sessionSha256: sha256(canonicalPayload),
    canonicalPayload,
    conversationId: session.conversationId,
    startedAt: session.startedAt,
    adapterIdentitySha256: session.adapterIdentitySha256,
    candidateSha256: candidate.candidateSha256,
    candidateIdentitySha256: identity,
    taskSpecSha256: candidate.taskSpecSha256,
    activeEvidencePlanSha256: candidate.evidencePlanSha256,
    round: candidate.round,
  });
}

function makeLoop(input: Readonly<{
  projectRoot: string;
  evidence: Loop["evidence"];
  session: Q9QualityLoopSessionV1;
  dependencies: Q9QualityLoopDependenciesV1;
}>): Loop {
  let resolve!: (result: SerialCandidateTerminalResult) => void;
  let reject!: (error: unknown) => void;
  const settled = new Promise<SerialCandidateTerminalResult>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  // Restored loops have no original IPC promise consumer. A later graceful
  // suspend deliberately rejects this process-local wait while preserving the
  // durable candidate; observe that rejection without changing what explicit
  // start callers receive from the original promise.
  void settled.catch(() => undefined);
  return {
    key: canonicalProjectKey(input.projectRoot),
    projectRoot: input.projectRoot,
    evidence: input.evidence,
    session: input.session,
    dependencies: input.dependencies,
    status: "checking",
    refusal: null,
    taskReviewAuthority: null,
    taskReview: null,
    assessment: null,
    repair: null,
    critic: null,
    harness: null,
    controller: new AbortController(),
    chain: Promise.resolve(),
    settled,
    resolve,
    reject,
    result: null,
  };
}

export function startQ9QualityLoop(input: Readonly<{
  projectRoot: string;
  candidate: Extract<SerialCandidateRunResult, { status: "candidate" }>;
  evidence: Loop["evidence"];
  session: Q9QualityLoopSessionV1;
  dependencies: Q9QualityLoopDependenciesV1;
}>): Promise<SerialCandidateTerminalResult> {
  if (!q9E2eGuardPresent() || !validSession(input.session)
    || (input.evidence?.runId ?? null) !== input.session.evidenceRunId
    || input.dependencies.repairWriter.kind !== "synthetic-q9-builder"
    || input.dependencies.criticTransport.kind !== "synthetic-q9-critic") {
    return Promise.reject(new Error("Q9_QUALITY_LOOP_INACTIVE"));
  }
  const key = projectKey(input.projectRoot);
  if (key === null || loops.has(key)) return Promise.reject(new Error("Q9_QUALITY_LOOP_ACTIVE"));
  const activated = activateSerialCandidateQualityLoop(input.candidate.candidate);
  if (!activated || activated !== input.candidate.candidate
    || !serialCandidateQualityLoopAuthorityRequired(activated)) {
    return Promise.reject(new Error("Q9_QUALITY_LOOP_ACTIVATION_REFUSED"));
  }
  const persisted = persistPendingSerialCandidate({
    projectRoot: input.projectRoot,
    result: input.candidate,
    evidence: input.evidence,
  });
  if (!persisted.ok) return Promise.reject(new Error(persisted.code));
  const active = currentPendingSerialCandidate(input.projectRoot);
  if (!active || active.candidate !== input.candidate.candidate) {
    return Promise.reject(new Error("Q9_PENDING_CANDIDATE_IDENTITY_MISMATCH"));
  }
  const loop = makeLoop({
    projectRoot: active.projectRoot,
    evidence: input.evidence,
    session: input.session,
    dependencies: input.dependencies,
  });
  loops.set(key, loop);
  const event = sessionEvent(active.candidate, input.session);
  if (!event || !appendEvent(loop, event)) {
    schedule(loop, () => failClosed(loop, "Q9_SESSION_NOT_DURABLE"));
    return loop.settled;
  }
  schedule(loop, () => progress(loop));
  return loop.settled;
}

export function currentQ9QualityLoop(projectRoot: string): Q9QualityLoopSnapshotV1 | null {
  const key = projectKey(projectRoot);
  const loop = key ? loops.get(key) : undefined;
  const active = loop ? current(loop) : null;
  if (!loop || !active) return null;
  return Object.freeze({
    version: Q9_QUALITY_LOOP_VERSION,
    projectRoot: loop.projectRoot,
    status: loop.status,
    phase: active.candidate.phase,
    round: active.candidate.round,
    repairSpent: active.candidate.callsUsed.repair,
    criticSpent: active.candidate.callsUsed.critic,
    taskReview: loop.taskReview,
    repairCall: loop.repair?.disclosure ?? null,
    criticCall: loop.critic?.disclosure ?? null,
    harnessRevision: loop.harness?.disclosure ?? null,
    result: loop.result,
    refusal: loop.refusal,
  });
}

function loopFromRawDir(raw: unknown): Loop | null {
  if (raw === null || typeof raw !== "object") return null;
  let dir: unknown;
  try { dir = (raw as { dir?: unknown }).dir; } catch { return null; }
  const key = projectKey(dir);
  return key ? loops.get(key) ?? null : null;
}

export function decideQ9TaskReview(raw: unknown): Q9QualityLoopDecision<TaskReviewProjectionV1> {
  const loop = loopFromRawDir(raw);
  if (!loop) return Object.freeze({ handled: false });
  if (!loop.taskReviewAuthority || loop.status !== "awaiting-owner") {
    return Object.freeze({ handled: true, ok: false, code: "Q9_TASK_REVIEW_NOT_WAITING" });
  }
  const projection = applyTaskReviewAction(loop.taskReviewAuthority, raw as TaskReviewActionRequest);
  if (!projection) return Object.freeze({ handled: true, ok: false, code: "Q9_TASK_REVIEW_STALE" });
  loop.taskReview = projection;
  if (!persistNewOwnerEvidence(loop)) {
    schedule(loop, () => failClosed(loop, "Q9_OWNER_AUTHORITY_NOT_DURABLE"));
    return Object.freeze({ handled: true, ok: false, code: "Q9_OWNER_AUTHORITY_NOT_DURABLE" });
  }
  const parsed = parseTaskReviewActionRequest(raw);
  if (parsed?.action.kind === "review-cairn-failure" && parsed.action.decision === "confirmed") {
    if (cutPoint(loop, "after-cairn-confirmation")) {
      return Object.freeze({ handled: true, ok: true, value: projection });
    }
  }
  loop.status = "checking";
  notify(loop);
  schedule(loop, () => progress(loop));
  return Object.freeze({ handled: true, ok: true, value: projection });
}

export function decideQ9Repair(raw: unknown): Q9QualityLoopDecision<RepairCallDecisionV1> {
  const loop = loopFromRawDir(raw);
  if (!loop) return Object.freeze({ handled: false });
  const prepared = loop.repair;
  if (!prepared || loop.status !== "awaiting-repair-approval") {
    return Object.freeze({ handled: true, ok: false, code: "Q9_REPAIR_NOT_WAITING" });
  }
  const preflight = preflightRepairCallDecision(raw);
  if (!preflight.ok) return Object.freeze({ handled: true, ok: false, code: preflight.code });
  const active = current(loop);
  const decidedAt = callNow(loop).toISOString();
  const previewSha = serialRepairPreviewSha256(prepared.preview);
  const routeSha = q9SyntheticRepairDisclosureSha256(prepared.route);
  let approved: ApprovedRepair | null = null;
  if (active && previewSha && routeSha && preflight.decision.outcome === "approved") {
    const ownerAuthorization = authorizeSerialRepairPreview(active.candidate, prepared.preview, {
      approved: true,
      actionNonce: prepared.disclosure.approvalId,
      approvedAt: decidedAt,
    });
    const routeAuthorization = ownerAuthorization
      ? authorizeQ9SyntheticRepair(prepared.route, prepared.preview, ownerAuthorization)
      : null;
    const request = routeAuthorization
      ? prepareQ9SyntheticRepairRequest(loop.projectRoot, prepared.preview, routeAuthorization)
      : null;
    const authorizationSha256 = q9SyntheticRepairAuthorizationSha256(routeAuthorization);
    const requestSha256 = q9SyntheticRepairRequestSha256(request);
    if (ownerAuthorization && routeAuthorization && request && authorizationSha256 && requestSha256) {
      approved = Object.freeze({
        prepared,
        ownerAuthorization,
        routeAuthorization,
        request,
        authorizationSha256,
        requestSha256,
        routeReceiptSha256: routeSha,
      });
    }
  }
  if (!active || !previewSha || !routeSha
    || (preflight.decision.outcome === "approved" && approved === null)) {
    return Object.freeze({ handled: true, ok: false, code: "Q9_REPAIR_ROUTE_REFUSED" });
  }
  const event = decisionEvent(active.candidate, {
    decisionKind: "repair",
    approvalId: prepared.disclosure.approvalId,
    operationId: prepared.operationId,
    outcome: preflight.decision.outcome,
    decidedAt,
    disclosureSha256: sha256(canonicalQ9Json(prepared.disclosure)),
    previewSha256: previewSha,
    authorizationSha256: approved?.authorizationSha256 ?? null,
    routeReceiptSha256: routeSha,
    requestSha256: approved?.requestSha256 ?? null,
    attempt: 1,
    retryOfOperationId: null,
  });
  if (!event || !appendEvent(loop, event)) {
    return Object.freeze({ handled: true, ok: false, code: "Q9_REPAIR_DECISION_NOT_DURABLE" });
  }
  const outcome = commitRepairCallDecision(preflight.preflight);
  if (!outcome.ok || outcome.decision !== preflight.decision
    || (preflight.decision.outcome === "approved") !== (outcome.grant !== null)) {
    requireRecovery(loop, "Q9_REPAIR_DECISION_COMMIT_REFUSED");
    return Object.freeze({ handled: true, ok: false, code: "Q9_REPAIR_DECISION_COMMIT_REFUSED" });
  }
  loop.repair = null;
  loop.status = "checking";
  notify(loop);
  if (outcome.grant === null) {
    schedule(loop, () => terminalize(loop, { kind: "stop", reason: "CANCELLED_BY_OWNER" }));
  } else {
    schedule(loop, () => runApprovedRepair(loop, approved!, outcome.grant as object));
  }
  return Object.freeze({ handled: true, ok: true, value: outcome.decision });
}

export function decideQ9Critic(raw: unknown): Q9QualityLoopDecision<CriticCallDecisionV1> {
  const loop = loopFromRawDir(raw);
  if (!loop) return Object.freeze({ handled: false });
  const prepared = loop.critic;
  if (!prepared || loop.status !== "awaiting-critic-approval") {
    return Object.freeze({ handled: true, ok: false, code: "Q9_CRITIC_NOT_WAITING" });
  }
  const preflight = preflightCriticCallDecision(raw);
  if (!preflight.ok) return Object.freeze({ handled: true, ok: false, code: preflight.code });
  const active = current(loop);
  const decidedAt = callNow(loop).toISOString();
  const previewSha256 = sha256(canonicalQ9Json(prepared.disclosure));
  const event = active ? decisionEvent(active.candidate, {
    decisionKind: "critic",
    approvalId: prepared.disclosure.approvalId,
    operationId: prepared.operationId,
    outcome: preflight.decision.outcome,
    decidedAt,
    disclosureSha256: previewSha256,
    previewSha256,
    authorizationSha256: prepared.authorizationSha256,
    routeReceiptSha256: prepared.authorization.routeRequestFingerprintSha256,
    requestSha256: prepared.requestSha256,
    attempt: prepared.authorization.callAttempt,
    retryOfOperationId: prepared.retryOfOperationId,
  }) : null;
  if (!event || !appendEvent(loop, event)) {
    return Object.freeze({ handled: true, ok: false, code: "Q9_CRITIC_DECISION_NOT_DURABLE" });
  }
  const receipt = durableDecision(loop, prepared.operationId);
  const outcome = commitCriticCallDecision(preflight.preflight);
  if (!receipt || !outcome.ok || outcome.decision !== preflight.decision
    || (preflight.decision.outcome === "approved") !== (outcome.grant !== null)) {
    requireRecovery(loop, "Q9_CRITIC_DECISION_COMMIT_REFUSED");
    return Object.freeze({ handled: true, ok: false, code: "Q9_CRITIC_DECISION_COMMIT_REFUSED" });
  }
  loop.critic = null;
  loop.status = "checking";
  notify(loop);
  if (outcome.grant === null) {
    if (outcome.decision.outcome === "continued-without-critic" && active
      && transitionOptionalDecline(
        loop,
        active.candidate,
        receipt.eventSha256,
        prepared.disclosure.approvalId,
        decidedAt,
      )) {
      schedule(loop, () => progress(loop));
    } else {
      schedule(loop, () => terminalize(loop, { kind: "stop", reason: "CANCELLED_BY_OWNER" }));
    }
  } else {
    schedule(loop, () => runApprovedCritic(loop, prepared, outcome.grant as object));
  }
  return Object.freeze({ handled: true, ok: true, value: outcome.decision });
}

/** One closed owner action over Core's exact Q9 failure/preview. The decision
 * is journaled synchronously while the card is still current. Only then is
 * the card consumed, revision authority persisted, and the one cN rerun
 * scheduled. */
export function decideQ9HarnessRevision(
  raw: unknown,
): Q9QualityLoopDecision<Q9HarnessRevisionDecisionV1> {
  const loop = loopFromRawDir(raw);
  if (!loop) return Object.freeze({ handled: false });
  const prepared = loop.harness;
  if (!prepared || loop.status !== "awaiting-harness-revision") {
    return Object.freeze({ handled: true, ok: false, code: "Q9_HARNESS_NOT_WAITING" });
  }
  const preflight = preflightQ9HarnessRevisionDecision(raw);
  if (!preflight.ok) return Object.freeze({ handled: true, ok: false, code: preflight.code });
  const active = current(loop);
  const decidedAt = callNow(loop).toISOString();
  const previewSha256 = sha256(canonicalQ9Json(prepared.preview));
  const failureSha256 = serialQ9HarnessFailureSha256(prepared.failure);
  let approved: ApprovedHarnessRevision | null = null;
  if (active && active.candidate === prepared.candidate && failureSha256
    && preflight.decision.outcome === "approved") {
    const authorized = authorizeSerialCandidateQ9HarnessRevision(
      active.candidate,
      prepared.failure,
      prepared.preview,
      { ownerActionNonce: prepared.disclosure.approvalId, approvedAt: decidedAt },
    );
    if (authorized) {
      approved = Object.freeze({
        prepared,
        authorized,
        authorizationSha256: sha256(canonicalQ9Json(authorized.authorization)),
      });
    }
  }
  if (!active || active.candidate !== prepared.candidate || !failureSha256
    || (preflight.decision.outcome === "approved" && approved === null)) {
    return Object.freeze({ handled: true, ok: false, code: "Q9_HARNESS_AUTHORIZATION_REFUSED" });
  }
  const payload: PendingRunHarnessDecisionPayloadV1 = Object.freeze({
    version: PENDING_RUN_HARNESS_DECISION_VERSION,
    approvalId: prepared.disclosure.approvalId,
    outcome: preflight.decision.outcome,
    failureSha256,
    // Core's authenticated failure digest deliberately covers its exact
    // construction-order JSON. Preserve those bytes inside the outer
    // sorted-key decision payload; re-sorting the nested failure would break
    // its Core digest even though the data looked equivalent.
    failureCanonicalPayload: JSON.stringify(prepared.failure),
    previewSha256,
    authorizationSha256: approved?.authorizationSha256 ?? null,
    decidedAt,
  });
  const event = harnessAuthorityEvent(active.candidate, "harness-decision", payload);
  if (!event || !appendEvent(loop, event)) {
    return Object.freeze({ handled: true, ok: false, code: "Q9_HARNESS_DECISION_NOT_DURABLE" });
  }
  const outcome = commitQ9HarnessRevisionDecision(preflight.preflight);
  if (!outcome.ok || outcome.decision !== preflight.decision) {
    requireRecovery(loop, "Q9_HARNESS_DECISION_COMMIT_REFUSED");
    return Object.freeze({ handled: true, ok: false, code: "Q9_HARNESS_DECISION_COMMIT_REFUSED" });
  }
  loop.harness = null;
  loop.status = "checking";
  notify(loop);
  if (outcome.decision.outcome === "task-stopped") {
    schedule(loop, () => terminalize(loop, { kind: "stop", reason: "CANCELLED_BY_OWNER" }));
  } else {
    schedule(loop, () => runApprovedHarnessRevision(loop, approved!));
  }
  return Object.freeze({ handled: true, ok: true, value: outcome.decision });
}

export function cancelQ9QualityLoop(projectRoot: string): boolean {
  const key = projectKey(projectRoot);
  const loop = key ? loops.get(key) : undefined;
  // Recovery-required means the ordinary terminal seam already refused or
  // became unverifiable. `schedule` deliberately runs no work in that state,
  // so claiming success here would acknowledge a cancellation that can never
  // execute. Leave every retained byte/action exactly as-is and let Main show
  // the honest recovery refusal.
  if (!loop || loop.result || loop.status === "recovery-required") return false;
  loop.controller.abort();
  clearCards(loop);
  schedule(loop, () => terminalize(loop, { kind: "stop", reason: "CANCELLED_BY_OWNER" }));
  return true;
}

function parkable(loop: Loop): boolean {
  return !loop.result && (loop.status === "awaiting-owner"
    || loop.status === "awaiting-repair-approval"
    || loop.status === "awaiting-critic-approval"
    || loop.status === "awaiting-harness-revision");
}

/** Drop only process-local actions before `parkPendingSerialCandidatesForRestart`.
 * No decision, reservation, send, or terminal transition is synthesized. */
export function suspendQ9QualityLoopForRestart(projectRoot: string): boolean {
  const key = projectKey(projectRoot);
  const loop = key ? loops.get(key) : undefined;
  if (!loop || !parkable(loop) || current(loop) === null) return false;
  clearCards(loop);
  if (loop.taskReviewAuthority) invalidateTaskReviewAuthority(loop.taskReviewAuthority);
  loop.taskReviewAuthority = null;
  loop.taskReview = null;
  loop.controller.abort(new Error("Q9_SUSPENDED_FOR_RESTART"));
  loops.delete(loop.key);
  loop.reject(new Error("Q9_SUSPENDED_FOR_RESTART"));
  notify(loop);
  return true;
}

export function activeQ9QualityLoops(): Readonly<{
  dirs: readonly string[];
  parkableDirs: readonly string[];
  allParkable: boolean;
  cancelAll(): void;
  settled(): Promise<void>;
}> {
  const currentLoops = [...loops.values()];
  const parkableDirs = currentLoops.filter(parkable).map((loop) => loop.projectRoot).sort();
  return Object.freeze({
    dirs: Object.freeze(currentLoops.map((loop) => loop.projectRoot).sort()),
    parkableDirs: Object.freeze(parkableDirs),
    allParkable: currentLoops.length > 0 && parkableDirs.length === currentLoops.length,
    cancelAll() { for (const loop of currentLoops) cancelQ9QualityLoop(loop.projectRoot); },
    async settled() { await Promise.allSettled(currentLoops.map((loop) => loop.chain)); },
  });
}

export function restoreQ9QualityLoops(input: Readonly<{
  dependenciesFor(projectRoot: string, session: Q9QualityLoopSessionV1): Q9QualityLoopDependenciesV1 | null;
}>): Readonly<{ restored: number; refused: number }> {
  if (!q9E2eGuardPresent()) return Object.freeze({ restored: 0, refused: pendingSerialCandidateProjects().length });
  let restored = 0;
  let refused = 0;
  for (const projectRoot of pendingSerialCandidateProjects()) {
    const active = currentPendingSerialCandidate(projectRoot);
    const sessionEventValue = active?.workflow.session;
    if (!active || !sessionEventValue || loops.has(canonicalProjectKey(projectRoot))) {
      refused += 1;
      continue;
    }
    let session: Q9QualityLoopSessionV1 | null = null;
    try {
      const value = JSON.parse(sessionEventValue.canonicalPayload) as Q9QualityLoopSessionV1;
      session = validSession(value) ? Object.freeze(value) : null;
    } catch { session = null; }
    const dependencies = session ? input.dependenciesFor(projectRoot, session) : null;
    if (!session || (active.evidence?.runId ?? null) !== session.evidenceRunId
      || !dependencies || dependencies.repairWriter.kind !== "synthetic-q9-builder"
      || dependencies.criticTransport.kind !== "synthetic-q9-critic") {
      refused += 1;
      continue;
    }
    if (activateSerialCandidateQualityLoop(active.candidate) !== active.candidate
      || !serialCandidateQualityLoopAuthorityRequired(active.candidate)) {
      refused += 1;
      continue;
    }
    const loop = makeLoop({ projectRoot, evidence: active.evidence, session, dependencies });
    loop.assessment = serialCandidateCurrentAvailableAssessment(active.candidate);
    loops.set(loop.key, loop);
    restored += 1;
    schedule(loop, () => progress(loop));
  }
  return Object.freeze({ restored, refused });
}

/** Main/session adapter: only output projection, never authority. */
export function applyQ9QualityLoopToSession(
  session: RunSessionSnapshot,
  snapshot: Q9QualityLoopSnapshotV1 | null,
): RunSessionSnapshot {
  if (!snapshot) return session;
  return {
    ...session,
    taskReview: snapshot.taskReview ?? undefined,
    ...(snapshot.criticCall ? { criticCall: snapshot.criticCall } : { criticCall: undefined }),
    ...(snapshot.repairCall ? { repairCall: snapshot.repairCall } : { repairCall: undefined }),
    ...(snapshot.harnessRevision ? { harnessRevision: snapshot.harnessRevision } : { harnessRevision: undefined }),
  };
}

export function _resetQ9QualityLoopsForTests(): void {
  if (!process.env.NODE_TEST_CONTEXT && process.env.NODE_ENV !== "test") return;
  for (const loop of loops.values()) {
    loop.controller.abort();
    clearCards(loop);
    loop.reject(new Error("Q9_TEST_RESET"));
  }
  loops.clear();
  _resetQ9HarnessRevisionApprovalsForTests();
}
