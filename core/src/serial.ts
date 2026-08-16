import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  closeSync,
  constants,
  existsSync,
  fchmodSync,
  fstatSync,
  fsyncSync,
  ftruncateSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readlinkSync,
  readSync,
  realpathSync,
  renameSync,
  rmSync,
  writeSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { types as nodeTypes } from "node:util";
import {
  parseTaskSpecWorkerClaims,
  parseWorkerClaims,
  type TaskSpecWorkerClaims,
  type WorkerClaims,
} from "./claims.js";
import {
  SERIAL_CANDIDATE_VERSION,
  SERIAL_CANDIDATE_BUNDLE_VERSION,
  SERIAL_CANDIDATE_TRANSITION_VERSION,
  activateSerialCandidateAfterPendingRestore,
  advanceSerialCandidate,
  adoptSerialCandidateEvidencePlanRevision,
  beginSerialCandidateTerminal,
  captureSerialCandidateBundleAfterRepair,
  captureSerialCandidateIgnoredBoundary,
  captureSerialCandidateBundle,
  completeSerialCandidateTerminal,
  composeSerialCandidate,
  composeSerialCandidateSealAuthorization,
  composeSerialCandidateTaskSpecAuthority,
  composeSerialCandidateTransition,
  composeSerialCandidateRepairEligibility,
  composeSerialRepairInstruction,
  isCurrentSerialCandidate,
  isSerialCandidateSealAuthorization,
  isSerialCandidateTaskSpecAuthority,
  parkCurrentSerialCandidate,
  serialCandidateBundleSha256,
  serialCandidateCompletionAuthority,
  serialCandidateGitEnvironmentNameDenied,
  serialCandidateGitEnvironmentSafe,
  serialCandidateLineageIdentity,
  serialCandidatePendingRepairLineage,
  serialCandidatePendingTransitionHistory,
  serialCandidateQ9PendingCustody,
  serialCandidateEvidencePlanRevisionCustody,
  serialCandidateRepairAvailability,
  serialCandidateReservedRecordClass,
  serialCandidateCurrentIdentity,
  serialCandidateSha256,
  serialCandidateTaskSpecAuthority,
  serialCandidateWorkspaceStillExact,
  restoreSerialCandidateBundleForPending,
  restoreSerialCandidateAfterRepairForPending,
  restoreSerialCandidateRepairEligibilityForPending,
  restoreSerialCandidateQ9ForPending,
  replaceSerialCandidateAfterRepair,
  type SerialCandidateBundleCaptureV1,
  type SerialCandidateBundleV1,
  type SerialCandidateSealAuthorizationV1,
  type SerialCandidateTaskSpecAuthorityV1,
  type SerialCandidateTransitionDecisionV1,
  type SerialCandidateV1,
  type SerialCandidatePendingRepairLineageV1,
  type SerialRepairInstructionV1,
} from "./candidate.js";
import { restoreSerialCandidateSealAuthorizationForPending } from "./candidate-seal-internal.js";
import { composeSerialPendingRestoreAuthority } from "./pending-restore-internal.js";
import {
  consumeSerialAuthenticatedPendingJournalAuthority,
  type SerialAuthenticatedPendingJournalAuthority,
} from "./pending-journal-auth-internal.js";
import { CODEX_EXEC_ADAPTER_ID } from "./codex.js";
import type { CriticCheckEvidenceV1, CriterionResultV1 } from "./critic.js";
import { KIMI_EXEC_ADAPTER_ID } from "./kimi.js";
import {
  taskRequestSha256,
  taskRequestView,
  type TaskIntent,
  type TaskIntentSourceInput,
  type TaskRequestView,
} from "./intent.js";
import {
  composeSerialTaskPromiseAnswers,
  projectCheckMenu,
  runProjectCheck,
  serialTaskPromisesSatisfied,
  type SerialProjectCheckResultV1,
  type SerialTaskPromiseAnswerV1,
  type SerialTaskPromiseOwnerAnswerV1,
  type SerialTaskPromisesV1,
} from "./taskcard.js";
import {
  serialCandidateRepairRequest,
  type SerialCandidateRepairRequestV1,
  type SerialCritiqueFindingV1,
  type SerialCritiqueJudgmentV1,
} from "./critique.js";
import {
  ADAPTER_COMMAND_ATTESTATION_VERSION,
  ENVELOPE_RESULT_VERSION,
  TASK_SPEC_RUN_RECORD_VERSION,
  composeTaskSpecRunRecord,
  composeWorkerReport,
  composeWorkerRowSummary,
  renderAcceptedTaskRequest,
  stopReasonInPlainWords,
  type ComposedRecordInput,
  type AdapterCommandAttestationV1,
  type TaskSpecRunRecordV1,
} from "./records.js";
import { appendLogRow, canonicalPath, isCairnProject, nextTaskNumber, pad, parseFacts, parseLog, paths, type LogRow } from "./files.js";
import { acquireRunLock, type RunLock } from "./lock.js";
import {
  CANONICAL_EVIDENCE_COMMAND_EVENT_REPRESENTATION,
  parseWorkerProcessEventBundle,
  routeTask,
  authorizeTaskAdapterQ9E2eCandidateRun,
  isTaskAdapterQ9E2eRevisedEvidence,
  isTaskAdapterCandidateStateTestSupport,
  runTaskAdapterQ9E2eRevisedEvidence,
  taskAdapterQ9E2eCairnBlockerResult,
  taskAdapterQ9E2eHarnessFailureResult,
  taskAdapterQ9E2eFakeCandidateBoundTo,
  taskAdapterCandidateWriterSupportBoundTo,
  WorkerBoundaryError,
  WorkerProcessError,
  type AdapterTaskContract,
  type AdapterTaskQualityBinding,
  type QualityBoundAdapterTaskContractV4,
  type QualityBoundWorkerRunResultV3,
  type Q9E2eHarnessFailureResultV1,
  type Q9E2eCairnBlockerResultV1,
  type RouteResult,
  type TaskAdapter,
  type WorkerRunResult,
} from "./routing.js";
import {
  EVIDENCE_PLAN_CANDIDATE_VERSION,
  EVIDENCE_PLAN_VERSION,
  EVIDENCE_PLAN_REVISION_AUTHORITY_CONTEXT_VERSION,
  EVIDENCE_PLAN_REVISION_AUTHORIZATION_VERSION,
  authorizeEvidencePlanRevision,
  bindInitialEvidencePlan,
  evidencePlanSha256,
  previewEvidencePlanRevision,
  taskSpecReviewView,
  taskSpecSha256,
  validateTaskSpec,
  type ContractSectionAuthorityV1,
  type AuthorizedEvidencePlanRevisionV1,
  type EvidencePlanRevisionPreviewV1,
  type EvidencePlanV1,
  type TaskSpecV1,
} from "./quality.js";

const OFFLINE_SUPPORTED_OUTCOME = "Demonstrate serial routing and verify honest task records without implementing the requested product change.";
const WORKER_SUPPORTED_OUTCOME = "Run one explicitly confirmed worker task through the connected adapter and verify its result and Git state.";
const CANDIDATE_SUPPORTED_OUTCOME = "Run one explicitly confirmed Builder task into a frozen pre-seal candidate without authoring a terminal result.";
const activeRoots = new Set<string>();

export type SerialStage = "Route" | "Run" | "Check" | "Result";
export interface SerialActivity { stage: SerialStage; state: "working" | "done" | "stopped"; detail: string }
export interface SerialRunEvents { onActivity?: (activity: SerialActivity) => void }
export interface SerialRunOptions {
  adapters: readonly TaskAdapter[];
  adapterId?: string;
  commitRecords?: boolean;
  events?: SerialRunEvents;
  signal?: AbortSignal;
  /** Staged Q4 authority. Omitted keeps the live v3 route byte-for-byte. */
  taskSpecAuthority?: SerialTaskSpecAuthorityV1;
  /**
   * The exact rows the owner was shown before dispatch. Optional for the same
   * reason `onUnsealedCandidate` is: a run given none reaches the current close
   * unchanged. When present, the run carries them to the worker, runs each
   * `cairn-check` row's command itself after the worker, and refuses to seal
   * DONE until every row is actually answered.
   */
  taskPromises?: SerialTaskPromisesV1;
  /**
   * One process-local pause before this run authors anything terminal. It is
   * offered once, after the worker result, claims, and Git checks have all
   * passed and before the report, log row, commit, and result exist — so the
   * caller can show the owner an unsealed candidate and answer `continue` or
   * `stop`.
   *
   * The run stays open across the wait: same lock, same starting snapshot,
   * same adapter, same abort signal. Omitting it keeps the current terminal
   * close byte-for-byte, which is why it is optional rather than a new
   * required stage.
   *
   * A rejection propagates: the run throws, nothing terminal is written, and
   * the workspace is left dirty for inspection. It is deliberately NOT
   * swallowed into a DONE.
   */
  onUnsealedCandidate?: (
    candidate: SerialUnsealedCandidateV1,
    signal: AbortSignal | undefined,
  ) => Promise<SerialUnsealedCandidateChoiceV1>;
}

export const SERIAL_UNSEALED_CANDIDATE_VERSION = "cairn-serial-unsealed-candidate/v1" as const;

/**
 * What the owner is shown at the pre-terminal pause. Deliberately a bounded
 * display projection, not an authority: it carries no lock, adapter, snapshot,
 * or capability, so passing it to a renderer hands out nothing that could seal,
 * commit, or resume the run. Everything decisive stays inside the still-open
 * runner.
 *
 * `changedPaths` is Git's own answer (the same bounded set every record uses),
 * never the worker's list. `claims` is the worker speaking and is labelled that
 * way wherever it is displayed.
 */
export type SerialUnsealedCandidateV1 = Readonly<{
  version: typeof SERIAL_UNSEALED_CANDIDATE_VERSION;
  taskNumber: number;
  /** Output-only projection of the request this run accepted. */
  acceptedRequest: TaskRequestView;
  /** Inert notes kept with that request; never owner-attributed requirements. */
  requestContext: readonly string[];
  route: Readonly<{ adapterId: string; adapterLabel: string; provider: string; model: string }>;
  /** From Git, never from claims. */
  changedPaths: readonly string[];
  /** The worker's own account, or null when it left none Cairn could read. */
  claims: WorkerClaims | null;
  /** The bounded numeric evidence line, or null. */
  evidenceSummary: string | null;
  /**
   * Every displayed promise, answered in three separate voices: what Cairn ran
   * and found, what the worker said, and what the owner still owes. Empty when
   * the run carried no promises, which is the Slice 1 shape unchanged.
   */
  answers: readonly SerialTaskPromiseAnswerV1[];
  /**
   * Task 244. Whether this pause may still ask for the one repair. False at the
   * reopened pause after a repair has been spent, and false for a run carrying
   * no frozen rows at all — there is no promise for an allegation to name.
   */
  repairAvailable: boolean;
  /** What the repair already spent on this run asked for, or null before one. */
  repair: SerialCandidateRepairRequestV1 | null;
}>;

/**
 * The bare words remain valid so a caller with nothing to report keeps working
 * exactly as before. The object form is how the owner's own row judgments come
 * back; anything else at all is read as `stop`.
 *
 * Task 244 adds `repair`: the owner confirmed one allegation against one frozen
 * row and approved one correction. It is accepted only while `repairAvailable`
 * was true and only for a row Cairn has not itself proved; every other case
 * falls through to the honest stop, because a choice this pause never offered
 * is not a continue.
 */
/** Task 252: what a separately approved critic said, carried from the pause
 * into the seal. It is the reviewer's words and nothing more - recording it
 * gives the critic no authority it did not already have, and the runner never
 * reads a judgment to decide anything. */
export type SerialRunCritiqueRecordV1 = Readonly<{
  reviewer: string;
  findings: readonly SerialCritiqueFindingV1[];
}>;

export type SerialUnsealedCandidateChoiceV1 =
  | "continue"
  | "stop"
  | Readonly<{
      choice: "continue";
      ownerAnswers: Readonly<Record<string, SerialTaskPromiseOwnerAnswerV1>>;
      /** Task 252: optional, and purely a record. */
      critique?: SerialRunCritiqueRecordV1;
    }>
  | Readonly<{
      choice: "repair";
      repair: SerialCandidateRepairRequestV1;
      /** Task 252: carried here too, so a run that repairs and then stops still
       * seals with what the critic said rather than losing it. */
      critique?: SerialRunCritiqueRecordV1;
    }>;

/**
 * Task 252. Fail closed, like every other value crossing this seam: a malformed
 * critique records nothing rather than recording something wrong. Recording is
 * all this does - no judgment here is ever read to decide an outcome, so the
 * worst a bad parse can cost is an absent section, never a wrong seal.
 */
const CRITIQUE_JUDGMENTS: readonly SerialCritiqueJudgmentV1[] = ["met", "not_met", "unclear"];

function unsealedCandidateCritique(value: unknown): SerialRunCritiqueRecordV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as { reviewer?: unknown; findings?: unknown };
  if (typeof record.reviewer !== "string" || record.reviewer.length === 0
    || record.reviewer.length > 200 || !Array.isArray(record.findings)
    || record.findings.length === 0 || record.findings.length > 12) return null;
  const findings: SerialCritiqueFindingV1[] = [];
  for (const entry of record.findings) {
    if (entry === null || typeof entry !== "object") return null;
    const finding = entry as {
      checkId?: unknown; judgment?: unknown; observation?: unknown; evidenceRefs?: unknown;
    };
    if (typeof finding.checkId !== "string" || !/^c[1-9][0-9]?$/u.test(finding.checkId)) return null;
    if (typeof finding.judgment !== "string"
      || !CRITIQUE_JUDGMENTS.includes(finding.judgment as SerialCritiqueJudgmentV1)) return null;
    if (typeof finding.observation !== "string" || finding.observation.length > 2000) return null;
    if (!Array.isArray(finding.evidenceRefs)
      || finding.evidenceRefs.some((ref) => typeof ref !== "string" || ref.length > 64)) return null;
    findings.push(Object.freeze({
      checkId: finding.checkId as `c${number}`,
      judgment: finding.judgment as SerialCritiqueJudgmentV1,
      observation: finding.observation,
      evidenceRefs: Object.freeze([...finding.evidenceRefs as readonly string[]]),
    }));
  }
  return Object.freeze({ reviewer: record.reviewer, findings: Object.freeze(findings) });
}

/** Fail closed: only an exact continue, in either accepted shape, seals. */
function unsealedCandidateContinuation(
  value: unknown,
): Readonly<{ ownerAnswers: Readonly<Record<string, SerialTaskPromiseOwnerAnswerV1>> }> | null {
  if (value === "continue") return Object.freeze({ ownerAnswers: Object.freeze({}) });
  if (value === null || typeof value !== "object") return null;
  const record = value as { choice?: unknown; ownerAnswers?: unknown };
  if (record.choice !== "continue") return null;
  const given = record.ownerAnswers;
  if (given === null || typeof given !== "object" || Array.isArray(given)) return null;
  const answers: Record<string, SerialTaskPromiseOwnerAnswerV1> = Object.create(null) as Record<
    string,
    SerialTaskPromiseOwnerAnswerV1
  >;
  for (const key of Object.keys(given)) {
    const answer = (given as Record<string, unknown>)[key];
    // An unrecognised word is not an answer. Dropping it leaves the row
    // `pending`, which cannot seal — never silently "met".
    if (answer === "met" || answer === "not-met") answers[key] = answer;
  }
  return Object.freeze({ ownerAnswers: Object.freeze(answers) });
}

/**
 * Read a repair out of the pause's answer, or null.
 *
 * Null is not an error here — it is every other answer, including a repair the
 * pause did not offer or one naming a row Cairn's own passing check already
 * disproved. The caller then falls through to `unsealedCandidateContinuation`,
 * which reads anything that is not an exact continue as the honest stop.
 */
function unsealedCandidateRepair(
  value: unknown,
  available: boolean,
  answers: readonly SerialTaskPromiseAnswerV1[],
): SerialCandidateRepairRequestV1 | null {
  if (!available) return null;
  if (value === null || typeof value !== "object") return null;
  const record = value as { choice?: unknown; repair?: unknown };
  if (record.choice !== "repair") return null;
  return serialCandidateRepairRequest(record.repair, answers);
}

export interface SerialCandidateRunOptions {
  adapters: readonly TaskAdapter[];
  adapterId?: string;
  authority: SerialCandidateTaskSpecAuthorityV1;
  writerIsolation: SerialCandidateWriterIsolationV1;
  events?: SerialRunEvents;
  signal?: AbortSignal;
}

export const SERIAL_CANDIDATE_WRITER_ISOLATION_VERSION =
  "cairn-serial-candidate-writer-isolation/v1" as const;

export type SerialCandidateWriterIsolationV1 = Readonly<{
  version: typeof SERIAL_CANDIDATE_WRITER_ISOLATION_VERSION;
  adapterId: string;
  projectRootSha256: string;
  excludedUserDataRootSha256: string;
}>;

type CandidateWriterIsolationBinding = Readonly<{
  adapter: TaskAdapter;
  projectRootReal: string;
  excludedUserDataRootReal: string;
}>;

const candidateWriterIsolationBrand = new WeakSet<object>();
const candidateWriterIsolationBindings = new WeakMap<object, CandidateWriterIsolationBinding>();
const candidateStateTestWriterIsolationBrand = new WeakSet<object>();
const candidateStateTestWriterIsolationBindings = new WeakMap<object, CandidateWriterIsolationBinding>();

export const SERIAL_PENDING_CANDIDATE_CAPSULE_VERSION =
  "cairn-serial-pending-candidate-capsule/v1" as const;

export type SerialPendingCandidateCapsuleV1 = Readonly<{
  version: typeof SERIAL_PENDING_CANDIDATE_CAPSULE_VERSION;
  canonicalBytes: string;
  capsuleSha256: string;
}>;

export type SerialPendingCandidateResumeResultV1 =
  | Readonly<{ status: "resumed"; candidate: SerialCandidateV1 }>
  | Readonly<{
      status: "stale";
      reason:
        | "INVALID_CAPSULE"
        | "PROJECT_MISMATCH"
        | "LIVE_LOCK_UNAVAILABLE"
        | "WORKSPACE_CHANGED"
        | "UNSUPPORTED_EVIDENCE_REVISION"
        | "UNSUPPORTED_ROUND_ONE";
    }>;

export const SERIAL_CANDIDATE_TERMINAL_PREPARATION_VERSION =
  "cairn-serial-candidate-terminal-preparation/v1" as const;
export const SERIAL_CANDIDATE_TERMINAL_RECEIPT_VERSION =
  "cairn-serial-candidate-terminal-receipt/v1" as const;

export type SerialCandidateTerminalActionV1 = Readonly<{
  actionId: string;
  kind: "finalize" | "stop";
  candidateSha256: string;
  capsuleSha256: string;
}>;

export type SerialCandidateTerminalPreparationV1 = Readonly<{
  version: typeof SERIAL_CANDIDATE_TERMINAL_PREPARATION_VERSION;
  action: SerialCandidateTerminalActionV1;
  capsule: SerialPendingCandidateCapsuleV1;
}>;

export type SerialCandidateTerminalReceiptV1 = Readonly<{
  version: typeof SERIAL_CANDIDATE_TERMINAL_RECEIPT_VERSION;
  actionId: string;
  kind: "finalize" | "stop";
  disposition: "DONE" | "STOPPED";
  taskNumber: number;
  candidateSha256: string;
  preparedCapsuleSha256: string;
  reportSha256: string;
  logSha256: string;
  commitStatus: "created" | "skipped";
  commitHash: string | null;
  terminalReceiptSha256: string;
}>;

export type SerialCandidateTerminalExecutionV1 = Readonly<{
  result: SerialCandidateTerminalResult;
  receipt: SerialCandidateTerminalReceiptV1;
}>;

export type SerialCandidateTerminalReconcileResultV1 =
  | Readonly<{
      status: "resumed";
      candidate: SerialCandidateV1;
      preparation: SerialCandidateTerminalPreparationV1;
    }>
  | Readonly<{
      status: "terminal";
      receipt: SerialCandidateTerminalReceiptV1;
      result: SerialCandidateTerminalResult;
    }>
  | Readonly<{
      status: "stale";
      reason:
        | "INVALID_PREPARATION"
        | "PROJECT_MISMATCH"
        | "LIVE_LOCK_UNAVAILABLE"
        | "MANUAL_RECOVERY_REQUIRED"
        | "UNSUPPORTED_EVIDENCE_REVISION"
        | "UNSUPPORTED_ROUND_ONE";
    }>;

const SERIAL_PENDING_CANDIDATE_INNER_VERSION =
  "cairn-serial-pending-candidate-state/v1" as const;
const SERIAL_PREPARED_CANDIDATE_TERMINAL_INNER_VERSION =
  "cairn-serial-prepared-candidate-terminal-state/v1" as const;
const SERIAL_PENDING_CANDIDATE_BYTE_CAP = 4 * 1024 * 1024;
const SHA256_RE = /^[a-f0-9]{64}$/u;
const ACTION_UUID_V4_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u;

const exportedPendingCandidateCapsules = new WeakMap<object, Readonly<{
  canonicalBytes: string;
  capsuleSha256: string;
}>>();
const terminalPreparationBrand = new WeakSet<object>();
const terminalPreparationBindings = new WeakMap<object, Readonly<{
  candidate: SerialCandidateV1;
  plan: PendingTerminalPlanV1;
  baseCapsule: SerialPendingCandidateCapsuleV1;
  sealAuthorization: SerialCandidateSealAuthorizationV1 | null;
}>>();
const terminalPreparationByCandidate = new WeakMap<object, SerialCandidateTerminalPreparationV1>();
const terminalResultBrand = new WeakSet<object>();
const terminalResultShaBindings = new WeakMap<object, string>();

export const SERIAL_TASK_SPEC_AUTHORITY_VERSION = "cairn-serial-task-spec-authority/v1" as const;

export type SerialTaskSpecAuthorityV1 = Readonly<{
  version: typeof SERIAL_TASK_SPEC_AUTHORITY_VERSION;
  taskSpec: TaskSpecV1;
  taskSpecSha256: string;
  taskSpecReview: NonNullable<ReturnType<typeof taskSpecReviewView>>;
  evidencePlan: EvidencePlanV1;
  evidencePlanSha256: string;
}>;

const serialTaskSpecAuthorityBrand = new WeakSet<object>();

/**
 * Main's sole Q4 serial authority mint. Both inputs must already carry Core's
 * brands; a structural clone cannot be upgraded merely by repeating hashes.
 */
export function composeSerialTaskSpecAuthority(
  taskSpec: unknown,
  evidencePlan: unknown,
): SerialTaskSpecAuthorityV1 | null {
  try {
    const specSha = taskSpecSha256(taskSpec);
    const planSha = evidencePlanSha256(evidencePlan);
    const review = taskSpecReviewView(taskSpec);
    if (!specSha || !planSha || !review || review.taskSpecSha256 !== specSha) return null;
    const spec = taskSpec as TaskSpecV1;
    const plan = evidencePlan as EvidencePlanV1;
    // Q4 has no critic execution/custody. A Task Spec that makes critic review
    // mandatory cannot be honestly completed through this route.
    if (spec.quality.critic.mode === "required"
      || plan.taskSpecSha256 !== specSha
      || plan.procedures.length !== spec.quality.acceptanceChecks.length
      || plan.procedures.some((procedure, index) => procedure.criterionId !== spec.quality.acceptanceChecks[index]?.id)) {
      return null;
    }
    const commandHashes: string[] = [];
    for (const procedure of plan.procedures) {
      // Q4's worker route can authenticate only exact adapter-command events.
      // Packet, owner, or comparison procedures remain valid Core plans, but
      // must not be upgraded into an authority whose missing evidence could be
      // skipped on the way to DONE.
      if (procedure.kind !== "adapter-command-attestation" || !procedure.command
        || !/^[a-f0-9]{64}$/.test(procedure.command.sha256)) return null;
      commandHashes.push(procedure.command.sha256);
    }
    // One event hash must map to exactly one required cN. Reusing a command
    // hash across criteria would make process-event custody ambiguous.
    if (new Set(commandHashes).size !== commandHashes.length) return null;
    const authority = Object.freeze({
      version: SERIAL_TASK_SPEC_AUTHORITY_VERSION,
      taskSpec: spec,
      taskSpecSha256: specSha,
      taskSpecReview: review,
      evidencePlan: plan,
      evidencePlanSha256: planSha,
    }) as SerialTaskSpecAuthorityV1;
    serialTaskSpecAuthorityBrand.add(authority);
    return authority;
  } catch {
    return null;
  }
}

function serialTaskSpecAuthorityFor(
  intent: TaskIntent,
  value: SerialTaskSpecAuthorityV1 | undefined,
): SerialTaskSpecAuthorityV1 | null {
  if (value === undefined) return null;
  try {
    if (!serialTaskSpecAuthorityBrand.has(value) || value.taskSpec.intent !== intent
      || value.taskSpecSha256 !== taskSpecSha256(value.taskSpec)
      || value.taskSpecReview.taskSpecSha256 !== value.taskSpecSha256
      || value.evidencePlan.taskSpecSha256 !== value.taskSpecSha256
      || value.evidencePlanSha256 !== evidencePlanSha256(value.evidencePlan)) return null;
    return value;
  } catch {
    return null;
  }
}

function serialCandidateAuthorityFor(
  intent: TaskIntent,
  value: SerialCandidateTaskSpecAuthorityV1 | undefined,
): SerialCandidateTaskSpecAuthorityV1 | null {
  if (value === undefined || !isSerialCandidateTaskSpecAuthority(value)) return null;
  try {
    return value.taskSpec.intent === intent
      && taskRequestSha256(value.taskSpec.intent) === taskRequestSha256(intent)
      ? value
      : null;
  } catch {
    return null;
  }
}

function exactCandidateStateTestWriterSupport(adapter: unknown): adapter is TaskAdapter {
  try {
    if (typeof adapter !== "object" || adapter === null) return false;
    const descriptor = Object.getOwnPropertyDescriptor(adapter, "candidateWriterSupport");
    if (!descriptor || descriptor.get || descriptor.set || !("value" in descriptor)) return false;
    return isTaskAdapterCandidateStateTestSupport(descriptor.value);
  } catch {
    return false;
  }
}

function canonicalExistingDirectory(path: unknown): string | null {
  try {
    if (typeof path !== "string" || path.length === 0 || path.includes("\0")) return null;
    const resolved = resolve(path);
    const input = lstatSync(resolved);
    if (!input.isDirectory() || input.isSymbolicLink()) return null;
    const real = realpathSync.native(resolved);
    const actual = lstatSync(real);
    return actual.isDirectory() && !actual.isSymbolicLink() ? resolve(real) : null;
  } catch {
    return null;
  }
}

function rootContains(parent: string, child: string): boolean {
  const relation = relative(parent, child);
  return relation === "" || (!isAbsolute(relation) && relation !== ".."
    && !relation.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`));
}

function rootIdentitySha256(rootReal: string): string {
  return createHash("sha256").update(Buffer.from(rootReal, "utf8")).digest("hex");
}

function candidateProjectRootIdentitySha256(rootReal: string): string {
  return createHash("sha256")
    .update(process.platform === "win32" ? rootReal.toLowerCase() : rootReal, "utf8")
    .digest("hex");
}

/**
 * Mint the candidate writer receipt only after binding one exact adapter to
 * two existing, canonical, non-overlapping filesystem roots. The receipt is
 * process-local authority; repeating its frozen fields cannot recreate it.
 */
export function composeSerialCandidateWriterIsolation(
  adapter: unknown,
  projectRoot: string,
  excludedUserDataRoot: string,
): SerialCandidateWriterIsolationV1 | null {
  try {
    const projectRootReal = canonicalExistingDirectory(projectRoot);
    const excludedUserDataRootReal = canonicalExistingDirectory(excludedUserDataRoot);
    if (!projectRootReal || !excludedUserDataRootReal
      || rootContains(projectRootReal, excludedUserDataRootReal)
      || rootContains(excludedUserDataRootReal, projectRootReal)
      || !taskAdapterCandidateWriterSupportBoundTo(adapter, projectRootReal, excludedUserDataRootReal)
      || !adapter.descriptor.capabilities.includes("serial-task")
      || !adapter.descriptor.capabilities.includes("serial-task-candidate")) return null;
    const receipt = Object.freeze({
      version: SERIAL_CANDIDATE_WRITER_ISOLATION_VERSION,
      adapterId: adapter.descriptor.id,
      projectRootSha256: rootIdentitySha256(projectRootReal),
      excludedUserDataRootSha256: rootIdentitySha256(excludedUserDataRootReal),
    }) as SerialCandidateWriterIsolationV1;
    candidateWriterIsolationBrand.add(receipt);
    candidateWriterIsolationBindings.set(receipt, Object.freeze({
      adapter,
      projectRootReal,
      excludedUserDataRootReal,
    }));
    return receipt;
  } catch {
    return null;
  }
}

/**
 * Source-test-only state harness. This receipt is deliberately held under a
 * different brand and is rejected by public Q7 preview/run.
 */
export function composeSerialCandidateStateTestWriterIsolation(
  adapter: unknown,
  projectRoot: string,
  excludedUserDataRoot: string,
): SerialCandidateWriterIsolationV1 | null {
  try {
    if (!exactCandidateStateTestWriterSupport(adapter)
      || !adapter.descriptor.capabilities.includes("serial-task")
      || !adapter.descriptor.capabilities.includes("serial-task-candidate")) return null;
    const projectRootReal = canonicalExistingDirectory(projectRoot);
    const excludedUserDataRootReal = canonicalExistingDirectory(excludedUserDataRoot);
    if (!projectRootReal || !excludedUserDataRootReal
      || rootContains(projectRootReal, excludedUserDataRootReal)
      || rootContains(excludedUserDataRootReal, projectRootReal)) return null;
    const receipt = Object.freeze({
      version: SERIAL_CANDIDATE_WRITER_ISOLATION_VERSION,
      adapterId: adapter.descriptor.id,
      projectRootSha256: rootIdentitySha256(projectRootReal),
      excludedUserDataRootSha256: rootIdentitySha256(excludedUserDataRootReal),
    }) as SerialCandidateWriterIsolationV1;
    candidateStateTestWriterIsolationBrand.add(receipt);
    candidateStateTestWriterIsolationBindings.set(receipt, Object.freeze({
      adapter,
      projectRootReal,
      excludedUserDataRootReal,
    }));
    return receipt;
  } catch {
    return null;
  }
}

/** Public only for the opt-in Electron Q9 matrix. The returned receipt uses
 * the state-test brand, so normal preview/run paths continue to reject it. */
export function composeSerialCandidateE2eFakeWriterIsolation(
  adapter: unknown,
  projectRoot: string,
  excludedUserDataRoot: string,
): SerialCandidateWriterIsolationV1 | null {
  try {
    const projectRootReal = canonicalExistingDirectory(projectRoot);
    const excludedUserDataRootReal = canonicalExistingDirectory(excludedUserDataRoot);
    if (!projectRootReal || !excludedUserDataRootReal
      || !taskAdapterQ9E2eFakeCandidateBoundTo(adapter, projectRootReal, excludedUserDataRootReal)) return null;
    return composeSerialCandidateStateTestWriterIsolation(adapter, projectRootReal, excludedUserDataRootReal);
  } catch {
    return null;
  }
}

function candidateWriterIsolationBinding(
  value: unknown,
  projectRoot?: string,
): CandidateWriterIsolationBinding | null {
  try {
    if (typeof value !== "object" || value === null || !candidateWriterIsolationBrand.has(value)) return null;
    const receipt = value as SerialCandidateWriterIsolationV1;
    const binding = candidateWriterIsolationBindings.get(value);
    if (!binding || !taskAdapterCandidateWriterSupportBoundTo(
      binding.adapter,
      binding.projectRootReal,
      binding.excludedUserDataRootReal,
    )
      || receipt.version !== SERIAL_CANDIDATE_WRITER_ISOLATION_VERSION
      || receipt.adapterId !== binding.adapter.descriptor.id
      || receipt.projectRootSha256 !== rootIdentitySha256(binding.projectRootReal)
      || receipt.excludedUserDataRootSha256 !== rootIdentitySha256(binding.excludedUserDataRootReal)) return null;
    if (canonicalExistingDirectory(binding.projectRootReal) !== binding.projectRootReal
      || canonicalExistingDirectory(binding.excludedUserDataRootReal) !== binding.excludedUserDataRootReal
      || rootContains(binding.projectRootReal, binding.excludedUserDataRootReal)
      || rootContains(binding.excludedUserDataRootReal, binding.projectRootReal)) return null;
    if (projectRoot !== undefined && canonicalExistingDirectory(projectRoot) !== binding.projectRootReal) return null;
    return binding;
  } catch {
    return null;
  }
}

function candidateStateTestWriterIsolationBinding(
  value: unknown,
  projectRoot?: string,
): CandidateWriterIsolationBinding | null {
  try {
    if (typeof value !== "object" || value === null || !candidateStateTestWriterIsolationBrand.has(value)) return null;
    const receipt = value as SerialCandidateWriterIsolationV1;
    const binding = candidateStateTestWriterIsolationBindings.get(value);
    if (!binding || !exactCandidateStateTestWriterSupport(binding.adapter)
      || receipt.version !== SERIAL_CANDIDATE_WRITER_ISOLATION_VERSION
      || receipt.adapterId !== binding.adapter.descriptor.id
      || receipt.projectRootSha256 !== rootIdentitySha256(binding.projectRootReal)
      || receipt.excludedUserDataRootSha256 !== rootIdentitySha256(binding.excludedUserDataRootReal)) return null;
    if (canonicalExistingDirectory(binding.projectRootReal) !== binding.projectRootReal
      || canonicalExistingDirectory(binding.excludedUserDataRootReal) !== binding.excludedUserDataRootReal
      || rootContains(binding.projectRootReal, binding.excludedUserDataRootReal)
      || rootContains(binding.excludedUserDataRootReal, binding.projectRootReal)) return null;
    if (projectRoot !== undefined && canonicalExistingDirectory(projectRoot) !== binding.projectRootReal) return null;
    return binding;
  } catch {
    return null;
  }
}

function candidateCapableAdapters(
  adapters: readonly TaskAdapter[],
  isolation: SerialCandidateWriterIsolationV1,
  projectRoot?: string,
  stateTest = false,
): readonly TaskAdapter[] {
  const binding = stateTest
    ? candidateStateTestWriterIsolationBinding(isolation, projectRoot)
    : candidateWriterIsolationBinding(isolation, projectRoot);
  if (!binding || !adapters.includes(binding.adapter)) return Object.freeze([]);
  return adapters.filter((adapter) => adapter === binding.adapter
    && (stateTest
      ? exactCandidateStateTestWriterSupport(adapter)
      : taskAdapterCandidateWriterSupportBoundTo(
          adapter,
          binding.projectRootReal,
          binding.excludedUserDataRootReal,
        ))
    && adapter.descriptor.capabilities.includes("serial-task-candidate"));
}

type PendingJson = null | boolean | number | string | PendingJson[] | { [key: string]: PendingJson };

type PendingDetachState = {
  nodes: number;
  ancestors: WeakSet<object>;
};

/** Detach JSON without invoking accessors, callbacks, proxies, or toJSON. */
function detachPendingJson(
  value: unknown,
  state: PendingDetachState = { nodes: 0, ancestors: new WeakSet<object>() },
  depth = 0,
): PendingJson | undefined {
  try {
    state.nodes += 1;
    if (state.nodes > 200_000 || depth > 64) return undefined;
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "string") {
      return Buffer.from(value, "utf8").toString("utf8") === value ? value : undefined;
    }
    if (typeof value === "number") {
      return Number.isFinite(value) && !Object.is(value, -0) ? value : undefined;
    }
    if (typeof value !== "object" || nodeTypes.isProxy(value) || state.ancestors.has(value)) return undefined;
    state.ancestors.add(value);
    try {
      if (Array.isArray(value)) {
        if (Object.getPrototypeOf(value) !== Array.prototype) return undefined;
        const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
        const length = descriptors.length;
        if (!length || length.enumerable || length.get || length.set || !("value" in length)
          || !Number.isSafeInteger(length.value) || length.value < 0 || length.value > 200_000) return undefined;
        const keys = Reflect.ownKeys(value);
        if (keys.length !== length.value + 1 || keys.some((key) => typeof key !== "string")) return undefined;
        const output: PendingJson[] = [];
        for (let index = 0; index < length.value; index += 1) {
          const descriptor = descriptors[String(index)];
          if (!descriptor || !descriptor.enumerable || descriptor.get || descriptor.set || !("value" in descriptor)) return undefined;
          const detached = detachPendingJson(descriptor.value, state, depth + 1);
          if (detached === undefined) return undefined;
          output.push(detached);
        }
        return output;
      }
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) return undefined;
      const keys = Reflect.ownKeys(value);
      if (keys.length > 200_000 || keys.some((key) => typeof key !== "string")) return undefined;
      const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
      const output = Object.create(null) as { [key: string]: PendingJson };
      for (const key of keys as string[]) {
        const descriptor = descriptors[key];
        if (!descriptor || !descriptor.enumerable || descriptor.get || descriptor.set || !("value" in descriptor)) return undefined;
        const detached = detachPendingJson(descriptor.value, state, depth + 1);
        if (detached === undefined) return undefined;
        output[key] = detached;
      }
      return output;
    } finally {
      state.ancestors.delete(value);
    }
  } catch {
    return undefined;
  }
}

function exactPendingKeys(value: unknown, expected: readonly string[]): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return keys.length === wanted.length && keys.every((key, index) => key === wanted[index]);
}

const LEGACY_PENDING_CANDIDATE_INNER_KEYS = [
  "version", "projectRootReal", "projectRootSha256", "start", "startHeadRef", "contract", "route",
  "activities", "taskPaths", "protectedPaths", "ownedPaths", "ownedRecordIndexAuthority", "attestations",
  "attestationsCompleteForDone", "evidence", "taskSpec", "evidencePlan", "round0Bundle", "candidate",
  "claimsText", "transitionHistory", "repairLineage", "sealableCandidateSha256", "sealableClaimsSha256",
  "sealableBundleSha256",
] as const;

const Q9_PENDING_CANDIDATE_INNER_KEYS = [
  "version", "projectRootReal", "projectRootSha256", "start", "startHeadRef", "contract", "route",
  "activities", "taskPaths", "protectedPaths", "ownedPaths", "ownedRecordIndexAuthority", "attestations",
  "attestationsCompleteForDone", "evidence", "taskSpec", "initialEvidencePlan", "evidencePlan",
  "evidencePlanRevisionCustody", "round0Bundle", "candidate", "claimsText", "transitionHistory", "repairLineage",
  "sealableCandidateSha256", "sealableClaimsSha256", "sealableBundleSha256", "q9Custody",
] as const;

function exactPendingQ9Custody(value: unknown): value is Record<string, unknown> {
  return exactPendingKeys(value, [
    "qualityLoopAuthorityRequired", "assessmentRestartCustody", "repairAuthority", "repairAuthoritySha256",
    "policyDecision", "completionAuthority", "attempts",
  ]) && value.qualityLoopAuthorityRequired === true && Array.isArray(value.attempts);
}

function q9PendingCustodyCarriesAuthority(value: unknown): boolean {
  if (!exactPendingQ9Custody(value)) return true;
  return value.assessmentRestartCustody !== null
    || value.repairAuthority !== null
    || value.repairAuthoritySha256 !== null
    || value.policyDecision !== null
    || value.completionAuthority !== null
    || (value.attempts as unknown[]).length !== 0;
}

function q9PendingInnerCarriesAuthority(value: Record<string, unknown>): boolean {
  if (value.evidencePlanRevisionCustody !== null || q9PendingCustodyCarriesAuthority(value.q9Custody)) return true;
  const repair = value.repairLineage;
  return repair !== null && typeof repair === "object" && !Array.isArray(repair)
    && q9PendingCustodyCarriesAuthority((repair as Record<string, unknown>).preRepairQ9Custody);
}

function pendingCandidateInnerKind(value: unknown): "legacy" | "q9" | null {
  if (exactPendingKeys(value, Q9_PENDING_CANDIDATE_INNER_KEYS)) {
    return exactPendingQ9Custody(value.q9Custody) ? "q9" : null;
  }
  return exactPendingKeys(value, LEGACY_PENDING_CANDIDATE_INNER_KEYS) ? "legacy" : null;
}

function pendingSha256(bytes: string): string {
  return createHash("sha256").update(Buffer.from(bytes, "utf8")).digest("hex");
}

function pendingCanonicalBytes(value: unknown): string | null {
  const detached = detachPendingJson(value);
  if (detached === undefined) return null;
  const bytes = JSON.stringify(detached);
  return typeof bytes === "string" && Buffer.byteLength(bytes, "utf8") <= SERIAL_PENDING_CANDIDATE_BYTE_CAP
    ? bytes
    : null;
}

function parseAnyPendingCapsule(value: unknown): Readonly<{
  canonicalBytes: string;
  capsuleSha256: string;
  inner: Record<string, unknown>;
}> | null {
  try {
    const detached = detachPendingJson(value);
    if (!exactPendingKeys(detached, ["version", "canonicalBytes", "capsuleSha256"])
      || detached.version !== SERIAL_PENDING_CANDIDATE_CAPSULE_VERSION
      || typeof detached.canonicalBytes !== "string"
      || typeof detached.capsuleSha256 !== "string" || !SHA256_RE.test(detached.capsuleSha256)) return null;
    const canonicalBytes = detached.canonicalBytes;
    if (Buffer.byteLength(canonicalBytes, "utf8") > SERIAL_PENDING_CANDIDATE_BYTE_CAP
      || Buffer.from(canonicalBytes, "utf8").toString("utf8") !== canonicalBytes
      || pendingSha256(canonicalBytes) !== detached.capsuleSha256) return null;
    const parsed = JSON.parse(canonicalBytes) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)
      || JSON.stringify(parsed) !== canonicalBytes) return null;
    return Object.freeze({
      canonicalBytes,
      capsuleSha256: detached.capsuleSha256,
      inner: parsed as Record<string, unknown>,
    });
  } catch {
    return null;
  }
}

function parsePendingCapsule(value: unknown): ReturnType<typeof parseAnyPendingCapsule> {
  const parsed = parseAnyPendingCapsule(value);
  return parsed && pendingCandidateInnerKind(parsed.inner) !== null ? parsed : null;
}

function stalePendingCandidate(
  reason: Extract<SerialPendingCandidateResumeResultV1, { status: "stale" }>["reason"],
): SerialPendingCandidateResumeResultV1 {
  return Object.freeze({ status: "stale", reason });
}

export function serialTaskSpecQualityBinding(
  intent: TaskIntent,
  authority: SerialTaskSpecAuthorityV1,
): AdapterTaskQualityBinding | null {
  if (serialTaskSpecAuthorityFor(intent, authority) !== authority) return null;
  return Object.freeze({
    taskSpec: authority.taskSpec,
    taskSpecSha256: authority.taskSpecSha256,
    taskSpecReview: authority.taskSpecReview,
    evidencePlan: authority.evidencePlan,
    evidencePlanSha256: authority.evidencePlanSha256,
  });
}
export interface RecordCommit {
  status: "created" | "skipped";
  reason: string;
  hash?: string;
}
interface ClosedSerialResult {
  taskNumber: number;
  disposition: "DONE" | "STOPPED";
  briefPath: string;
  reportPath: string;
  reportText: string;
  row: LogRow;
  route: Extract<RouteResult, { status: "ready" }>;
  activities: SerialActivity[];
  commit: RecordCommit;
  /**
   * Task 066 (Phase 3 Task 7): the same structured truth Cairn composed its own
   * record from, carried out of the envelope so a result card can be authored
   * from data instead of scraped from rendered Markdown. It is ADDITIVE — no
   * report byte depends on it — and it is not a second account of the run:
   * `filesChanged` and `protectedIntact` are Git's answers, `commit` is the real
   * commit result, and `claims` is the worker's own CLAIMS, never a verified
   * fact. Only a closed run has one; the connection-required arm carries none.
   */
  composed: ComposedRecordInput;
}
export type SerialRunResult =
  | { status: "connection-required"; route: Extract<RouteResult, { status: "connection-required" }>; activities: SerialActivity[] }
  | ({ status: "done" } & ClosedSerialResult & { disposition: "DONE" })
  | ({ status: "stopped"; reason: SerialStopReason } & ClosedSerialResult & { disposition: "STOPPED" });

export type SerialCandidateRunResult =
  | Extract<SerialRunResult, { status: "connection-required" }>
  | Extract<SerialRunResult, { status: "stopped" }>
  | {
      status: "candidate";
      taskNumber: number;
      briefPath: string;
      route: Extract<RouteResult, { status: "ready" }>;
      activities: SerialActivity[];
      candidate: SerialCandidateV1;
    };

export type SerialCandidateTerminalResult = (
  | Extract<SerialRunResult, { status: "done" }>
  | Extract<SerialRunResult, { status: "stopped" }>
) & { candidate: SerialCandidateV1 };

function terminalResultCanonicalBytes(value: SerialCandidateTerminalResult): string | null {
  const candidate = serialCandidateCurrentIdentity(value.candidate);
  if (!candidate) return null;
  return pendingCanonicalBytes(Object.freeze({
    status: value.status,
    reason: value.status === "stopped" ? value.reason : null,
    taskNumber: value.taskNumber,
    disposition: value.disposition,
    briefPath: value.briefPath,
    reportPath: value.reportPath,
    reportText: value.reportText,
    row: value.row,
    route: value.route,
    activities: value.activities,
    commit: Object.freeze({
      status: value.commit.status,
      reason: value.commit.reason,
      hash: value.commit.hash ?? null,
    }),
    composed: value.composed,
    candidate,
  }));
}

function brandSerialCandidateTerminalResult(
  value: SerialCandidateTerminalResult,
): SerialCandidateTerminalResult | null {
  const canonicalBytes = terminalResultCanonicalBytes(value);
  if (!canonicalBytes) return null;
  const result = Object.freeze(value);
  terminalResultBrand.add(result);
  terminalResultShaBindings.set(result, pendingSha256(canonicalBytes));
  return result;
}

/** Exact Core-minted terminal-result identity for Main's durable card/outbox
 * join. Structural clones and results whose nested card inputs changed after
 * minting are refused. */
export function serialCandidateTerminalResultSha256(value: unknown): string | null {
  if (!value || typeof value !== "object" || !terminalResultBrand.has(value)) return null;
  const expected = terminalResultShaBindings.get(value);
  const canonicalBytes = terminalResultCanonicalBytes(value as SerialCandidateTerminalResult);
  return expected && canonicalBytes && pendingSha256(canonicalBytes) === expected ? expected : null;
}

export type SerialStopReason =
  | "ADAPTER_FAILED"
  | "INVALID_ADAPTER_RESULT"
  | "PROTECTED_WORK_CHANGED"
  | "RECORD_VERIFICATION_FAILED"
  | "WORKER_CLAIMS_MISSING"
  | "REAL_MODEL_CALL_NOT_AUTHORIZED"
  | "MODEL_REPORTED_STOPPED"
  | "MODEL_RESULT_NOT_VERIFIED"
  | "Q9_CRITIC_CALLS_EXHAUSTED"
  | "Q9_REQUIRED_CHECK_STILL_FAILED"
  | "Q9_NATIVE_BOUNDARY_STOPPED"
  | "Q9_REQUIRED_EVIDENCE_INCOMPLETE"
  | "Q9_WORKFLOW_VERIFICATION_FAILED"
  | "ADAPTER_TIMED_OUT"
  | "CANCELLED_BY_OWNER"
  /** Task 235: the owner read the unsealed candidate and kept the work instead
   * of letting Cairn finish. Distinct from CANCELLED_BY_OWNER, which means the
   * worker was interrupted and produced no result to look at. */
  | "OWNER_STOPPED_AT_CANDIDATE"
  /** Task 237: the worker finished, but at least one promise the owner accepted
   * was not shown to be kept — Cairn's own check did not pass, or the owner did
   * not confirm a row only they can judge. The worker's own account is never
   * what settles this. */
  | "TASK_PROMISE_NOT_MET";

interface GitSnapshot {
  head: string;
  status: string[];
  staged: string[];
  logText: string;
  protectedPaths: ReadonlyMap<string, { worktree: string; index: string }>;
  /** Q6-only raw-z and no-follow custody. Omitted preserves legacy readers. */
  candidateProtection?: true;
}

interface OpenSerialCandidateContext {
  projectRoot: string;
  start: GitSnapshot;
  startHeadRef: string | null;
  contract: QualityBoundAdapterTaskContractV4;
  contractMarkdown: string;
  route: Extract<RouteResult, { status: "ready" }>;
  activities: SerialActivity[];
  events: SerialRunEvents | undefined;
  lock: RunLock;
  released: boolean;
  taskPaths: readonly string[];
  protectedPaths: readonly string[];
  ownedPaths: readonly string[];
  ownedRecordIndexAuthority: CandidateOwnedRecordIndexAuthority;
  claims: TaskSpecWorkerClaims;
  attestations: readonly AdapterCommandAttestationV1[];
  attestationsCompleteForDone: boolean;
  evidence: Record<string, number>;
  authority: SerialCandidateTaskSpecAuthorityV1;
  lineageIdentity: object;
  sealableCandidateSha256: string;
  sealableClaimsSha256: string;
  sealableBundleSha256: string;
  /** Authenticated restart after a one-use repair process may have changed
   * task bytes before crashing. The old candidate is restored solely so Core
   * can author one honest STOP; it can never recapture/adopt those unaudited
   * bytes or return to the quality loop. */
  interruptedRepairStopOnly: boolean;
}

export const SERIAL_CANDIDATE_POLICY_EVIDENCE_VERSION = "cairn-serial-candidate-policy-evidence/v1" as const;

export type SerialCandidatePolicyEvidenceV1 = Readonly<{
  version: typeof SERIAL_CANDIDATE_POLICY_EVIDENCE_VERSION;
  projectHash: string;
  runId: string;
  round: 0 | 1;
  taskSpecSha256: string;
  evidencePlanSha256: string;
  candidateSha256: string;
  bundleSha256: string;
  criterionResults: readonly CriterionResultV1[];
  checkEvidence: readonly CriticCheckEvidenceV1[];
  artifactIds: readonly string[];
  policyEvidenceSha256: string;
}>;

const serialCandidatePolicyEvidenceBrand = new WeakSet<object>();

export const SERIAL_Q9_HARNESS_FAILURE_VERSION = "cairn-serial-q9-harness-failure/v1" as const;
export type SerialQ9HarnessFailureV1 = Readonly<{
  version: typeof SERIAL_Q9_HARNESS_FAILURE_VERSION;
  projectHash: string;
  runId: string;
  candidateSha256: string;
  taskSpecSha256: string;
  evidencePlanSha256: string;
  criterionId: `c${number}`;
  commandSha256: string;
  code: "TIMED_OUT_BEFORE_ASSERTION";
  exitCode: 124;
  boundedOutput: string;
  outputSha256: string;
  evidenceRef: string;
  failureSha256: string;
}>;

export type SerialQ9HarnessRevisionOwnerApprovalV1 = Readonly<{
  ownerActionNonce: string;
  approvedAt: string;
}>;

const serialQ9HarnessFailureBrand = new WeakSet<object>();
const serialQ9HarnessFailureBindings = new WeakMap<object, Readonly<{
  candidate: SerialCandidateV1;
  context: OpenSerialCandidateContext;
}>>();
const serialQ9HarnessPreviewBindings = new WeakMap<object, Readonly<{
  candidate: SerialCandidateV1;
  failure: SerialQ9HarnessFailureV1;
}>>();

export function serialCandidatePolicyEvidenceSha256(value: unknown): string | null {
  return typeof value === "object" && value !== null && serialCandidatePolicyEvidenceBrand.has(value)
    ? (value as SerialCandidatePolicyEvidenceV1).policyEvidenceSha256
    : null;
}

const openSerialCandidates = new Map<string, OpenSerialCandidateContext>();

function git(root: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  }).trimEnd();
}

function gitZ(root: string, args: string[]): string[] {
  const output = execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  return output.split("\0").filter(Boolean);
}

function lines(text: string): string[] {
  return text ? text.split(/\r?\n/).filter(Boolean) : [];
}

function statusPath(entry: string): string {
  const raw = entry.length > 3 ? entry.slice(3) : entry;
  const rename = raw.lastIndexOf(" -> ");
  return (rename >= 0 ? raw.slice(rename + 4) : raw).replace(/\\/g, "/");
}

function worktreeHash(root: string, path: string): string {
  const absolute = resolve(root, path);
  if (!existsSync(absolute)) return "missing";
  return createHash("sha256").update(readFileSync(absolute)).digest("hex");
}

function protectedPathSnapshot(root: string, status: readonly string[]): ReadonlyMap<string, { worktree: string; index: string }> {
  const values = new Map<string, { worktree: string; index: string }>();
  const pathsToProtect = new Set(status.map(statusPath));
  for (const path of lines(git(root, ["ls-files", "--", "docs/ai-work/tasks"]))) pathsToProtect.add(path.replace(/\\/g, "/"));
  for (const path of pathsToProtect) {
    values.set(path, {
      worktree: worktreeHash(root, path),
      index: git(root, ["ls-files", "--stage", "--", path]),
    });
  }
  return values;
}

/**
 * `git status --porcelain` counts a file as modified on stat or line-ending
 * differences alone — identical content, e.g. a CRLF working copy over an LF
 * index under autocrlf — and `git update-index --refresh` does not clear that
 * state. Counting such phantom dirt as a dirty start made a DONE task skip its
 * own commit and poisoned the rerun (Tasks 010/011). A worktree-only
 * modification entry is kept only when a content diff confirms it; every other
 * entry (staged, untracked, renamed, deleted) already reflects real work.
 */
function statusLines(root: string): string[] {
  const raw = lines(git(root, ["status", "--porcelain=v1", "--untracked-files=all"]));
  if (!raw.some((entry) => entry.startsWith(" M"))) return raw;
  const contentDirty = new Set(gitZ(root, ["diff", "--name-only", "-z", "--"]).map((path) => path.replace(/\\/g, "/")));
  return raw.filter((entry) => !entry.startsWith(" M") || contentDirty.has(statusPath(entry)));
}

function snapshot(root: string): GitSnapshot {
  const topRaw = git(root, ["rev-parse", "--show-toplevel"]);
  const top = canonicalPath(topRaw);
  const rootCanonical = canonicalPath(root);
  if (top.toLowerCase() !== rootCanonical.toLowerCase()) {
    // Name every spelling: when canonicalization falls back (a transient
    // realpath failure), the canonical spelling equals the resolved one and
    // this message is the evidence that says so.
    throw new Error(
      `PROJECT_ROOT_MISMATCH: git's toplevel "${topRaw}" (canonical "${top}") does not match the project root "${root}" (canonical "${rootCanonical}").`,
    );
  }
  const status = statusLines(root);
  return {
    head: git(root, ["rev-parse", "HEAD"]),
    status,
    staged: lines(git(root, ["diff", "--cached", "--name-only"])),
    logText: readFileSync(paths.log(root), "utf8"),
    protectedPaths: protectedPathSnapshot(root, status),
  };
}

function candidateProtectedWorktreeState(root: string, path: string): string {
  const parts = path.split("/");
  let cursor = root;
  for (const part of parts.slice(0, -1)) {
    cursor = join(cursor, part);
    const parent = lstatSync(cursor, { bigint: true });
    if (!parent.isDirectory() || parent.isSymbolicLink()) {
      throw new Error("UNSAFE_CANDIDATE_PROTECTED_PARENT");
    }
  }
  const absolute = resolve(root, ...parts);
  let before: ReturnType<typeof lstatSync>;
  try {
    before = lstatSync(absolute, { bigint: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "missing";
    throw error;
  }
  if (before.isSymbolicLink()) {
    const target = readlinkSync(absolute, { encoding: "buffer" });
    return [
      "symlink",
      before.dev.toString(),
      before.ino.toString(),
      before.nlink.toString(),
      createHash("sha256").update(target).digest("hex"),
    ].join(":");
  }
  if (!before.isFile()) throw new Error("UNSAFE_CANDIDATE_PROTECTED_PATH");
  let descriptor: number | null = null;
  try {
    descriptor = openSync(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) {
      throw new Error("CANDIDATE_PROTECTED_PATH_CHANGED");
    }
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor, { bigint: true });
    const named = lstatSync(absolute, { bigint: true });
    if (!named.isFile() || after.dev !== opened.dev || after.ino !== opened.ino
      || after.size !== opened.size || after.mtimeNs !== opened.mtimeNs || after.ctimeNs !== opened.ctimeNs
      || named.dev !== after.dev || named.ino !== after.ino || named.size !== after.size
      || named.mtimeNs !== after.mtimeNs || named.ctimeNs !== after.ctimeNs) {
      throw new Error("CANDIDATE_PROTECTED_PATH_CHANGED");
    }
    return [
      "regular",
      after.dev.toString(),
      after.ino.toString(),
      after.nlink.toString(),
      (Number(after.mode) & 0o111) !== 0 ? "executable" : "plain",
      createHash("sha256").update(bytes).digest("hex"),
    ].join(":");
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
}

function candidateProtectedIndexState(root: string, path: string): string {
  return candidateGitZ(root, ["ls-files", "--stage", "-z", "--", `:(top,literal)${path}`]).join("\0");
}

/** Q6 keeps its protected-path authority in raw `-z` Git paths. Legacy runs
 * retain the historical porcelain snapshot unchanged. Typed no-follow path
 * state prevents quoted Unicode aliases and symlink retargets from escaping
 * the held candidate boundary. */
function candidateSnapshot(root: string, ownedPaths: readonly string[] = Object.freeze([])): GitSnapshot {
  if (!serialCandidateGitEnvironmentSafe()) throw new Error("UNSAFE_SERIAL_CANDIDATE_GIT_ENVIRONMENT");
  const topRaw = candidateGit(root, ["rev-parse", "--show-toplevel"]);
  const top = canonicalPath(topRaw);
  const rootCanonical = canonicalPath(root);
  if (top.toLowerCase() !== rootCanonical.toLowerCase()) {
    throw new Error(
      `PROJECT_ROOT_MISMATCH: git's toplevel "${topRaw}" (canonical "${top}") does not match the project root "${root}" (canonical "${rootCanonical}").`,
    );
  }
  const unstaged = candidateGitZ(root, [
    ...CANDIDATE_NEUTRAL_RESERVED_FILTERS,
    "diff", "--no-ext-diff", "--no-textconv", "--name-only", "--no-renames", "-z", "--",
  ]);
  const staged = candidateGitZ(root, [
    "diff", "--no-ext-diff", "--no-textconv", "--cached", "--name-only", "--no-renames", "-z", "--",
  ]).sort();
  const untracked = candidateGitZ(root, ["ls-files", "--others", "--exclude-standard", "-z", "--"]);
  const changed = [...new Set([...unstaged, ...staged, ...untracked])].sort();
  const taskHistory = candidateGitZ(root, ["ls-files", "-z", "--", "docs/ai-work/tasks"]);
  const ownedKeys = new Set(ownedPaths.map((path) => process.platform === "win32" ? path.toLowerCase() : path));
  const protectedPaths = new Map<string, { worktree: string; index: string }>();
  for (const path of [...new Set([...changed, ...taskHistory])].sort()) {
    const key = process.platform === "win32" ? path.toLowerCase() : path;
    // Candidate-owned brief/report/LOG state has its own no-follow byte, mode,
    // and stage-0 index authority. Treating it as protected too would make the
    // authorized terminal report/log write invalidate its own dirty-start run.
    if (ownedKeys.has(key)) continue;
    protectedPaths.set(path, {
      worktree: candidateProtectedWorktreeState(root, path),
      index: candidateProtectedIndexState(root, path),
    });
  }
  const logText = candidateOwnedTextNoFollow(paths.log(root));
  if (logText === null) throw new Error("MISSING_CANDIDATE_LOG");
  return {
    head: candidateGit(root, ["rev-parse", "HEAD"]),
    // Only path identity and dirty/clean cardinality are consumed from this
    // candidate-private representation; three prefix bytes preserve statusPath.
    status: changed.map((path) => `C  ${path}`),
    staged,
    logText,
    protectedPaths,
    candidateProtection: true,
  };
}

function rel(root: string, path: string): string {
  const value = relative(root, path).replace(/\\/g, "/");
  if (!value || value.startsWith("../") || isAbsolute(value)) throw new Error("OWNED_PATH_OUTSIDE_PROJECT");
  return value;
}

function statusWithoutOwned(status: readonly string[], owned: ReadonlySet<string>): string[] {
  return status.filter((entry) => !owned.has(statusPath(entry)));
}

function sameLines(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function assertGoverned(root: string, gitReader: (root: string, args: string[]) => string = git): void {
  if (!isCairnProject(root)) {
    throw new Error("No Cairn contract here. Start a new project in an empty folder, or use Project Conversion for existing work.");
  }
  const facts = parseFacts(root);
  if (facts.status && facts.status !== "ACTIVE") throw new Error(`CONTRACT_NOT_ACTIVE: The contract status is ${facts.status}.`);
  const gitDirRaw = gitReader(root, ["rev-parse", "--git-dir"]);
  const gitDir = resolve(root, gitDirRaw);
  if (existsSync(join(gitDir, "cairn"))) {
    throw new Error("LEGACY_STATE_PRESENT: This project has legacy Cairn runtime state. It was preserved unchanged; migration needs a separate reviewed task.");
  }
}

function emit(activities: SerialActivity[], events: SerialRunEvents | undefined, activity: SerialActivity): void {
  activities.push(activity);
  events?.onActivity?.(activity);
}

/** Once candidate records/ref state is terminal, observers are notification
 * only. Their exception cannot truthfully roll back the terminal transaction. */
function emitCandidateTerminal(
  activities: SerialActivity[],
  events: SerialRunEvents | undefined,
  activity: SerialActivity,
): void {
  try {
    activities.push(activity);
    events?.onActivity?.(activity);
  } catch {
    // The terminal result remains authoritative and is still returned.
  }
}

function candidateActivityView(activities: readonly SerialActivity[]): SerialActivity[] {
  return activities.map((activity) => ({ ...activity }));
}

function indentTaskSpecBriefData(value: string): string {
  return value.replace(/\r\n|\r|\n/g, (lineBreak) => `${lineBreak}  `);
}

/**
 * The promises the owner accepted, written into the brief exactly as they were
 * displayed, with who answers each one. Empty when the run carried none, which
 * leaves the brief byte-for-byte what it was before Task 237.
 */
function promisesSection(contract: AdapterTaskContract): string {
  const promises = contract.version === "cairn-serial-task/v3" ? contract.promises : undefined;
  if (!promises || promises.rows.length === 0) return "";
  const rows = promises.rows.map((row) => {
    const answerer = row.verification.kind === "cairn-check"
      ? `Cairn checks this by running \`${row.verification.checkId}\``
      : "You look at this yourself";
    return `- ${row.id}: ${indentTaskSpecBriefData(row.text)}\n  - ${answerer}`;
  }).join("\n");
  return `
## Promises the owner accepted — every cN must be answered

${rows}
`;
}

function briefText(contract: AdapterTaskContract, demo: boolean): string {
  const status = contract.protectedGit.dirty ? "existing changes protected" : "clean";
  const label = contract.route.adapterLabel;
  const provider = contract.route.provider;
  if (contract.version === "cairn-serial-task/v4") {
    const required = contract.taskSpecReview.criteria
      .map((criterion) => `- ${criterion.id}: ${indentTaskSpecBriefData(criterion.promise)}`)
      .join("\n");
    const preferences = contract.taskSpecReview.preferences.length > 0
      ? contract.taskSpecReview.preferences
        .map((preference) => `- ${preference.id}: ${indentTaskSpecBriefData(preference.dimension)} — ${indentTaskSpecBriefData(preference.desiredDirection)}`)
        .join("\n")
      : "- None.";
    const terminalMeaning = contract.supportedOutcome === CANDIDATE_SUPPORTED_OUTCOME
      ? "Candidate creation is a non-terminal pause: it writes the brief and freezes one hash-bound candidate, but writes no report, log row, DONE disposition, or commit.\n\n" +
        "DONE means a later explicit, exact branded seal proves complete required evidence with no confirmed blocker or native stop; Cairn then re-verifies the candidate, protected Git state, and exact task paths before authoring one terminal report, one log row, and one exact-path commit when the task started clean.\n\n" +
        "STOPPED means the Builder or lossless bundle checks failed, protected work changed, evidence remained unavailable, or the current candidate was explicitly stopped; its product bytes remain retained for inspection."
      : `DONE means the one ${label} process completed, the Task-Spec-bound worker account and exact command events were retained separately, the append-only log row matches, protected starting work remains intact, and Cairn verified Git isolation and created the exact-path commit when the task started clean. It does not mean a worker claim became criterion evidence or a critic verdict.\n\n` +
        "STOPPED means the call was not authorized, the model reported a stop, required process-event custody failed, protected work changed, or the result records could not be verified.";
    return `# Task ${pad(contract.taskNumber)} — one confirmed real ${label} task

Supported outcome: ${contract.supportedOutcome}

Lane: **Standard** — one explicitly confirmed ${provider} ${label} call; the model may make in-scope local workspace changes.

${renderAcceptedTaskRequest(contract.intent)}

## Frozen Task Spec

- Task Spec SHA-256: \`${contract.taskSpecSha256}\`
- Evidence Plan SHA-256: \`${contract.evidencePlanSha256}\`

### Required promises

${required}

### Advisory preferences — not DONE gates

${preferences}

## Route

- Adapter: ${contract.route.adapterLabel}
- Provider: ${contract.route.provider}
- Model: ${contract.route.model}
- Reason: ${contract.route.reason}

## Owned records

${contract.ownedRecords.map((path) => `- \`${path}\``).join("\n")}

## Protected starting Git state

- HEAD: \`${contract.protectedGit.head}\`
- Working tree: ${status}
- Existing staged work: ${contract.protectedGit.staged ? "yes — no record commit is allowed" : "no"}

## Envelope checks — separate from cN

${contract.envelopeChecks.map((check) => `- ${check}`).join("\n")}

## Stop conditions

${contract.stopConditions.map((condition) => `- ${condition}`).join("\n")}

${terminalMeaning}
`;
  }
  const title = demo ? "offline serial demonstration" : `one confirmed real ${label} task`;
  const lane = demo
    ? "local, deterministic, record-only demonstration"
    : `one explicitly confirmed ${provider} ${label} call; the model may make in-scope local workspace changes`;
  const done = demo
    ? "DONE means the offline route and its three records are verified. It does not mean the requested product change was implemented."
    : `DONE means the one ${label} process completed, the requested outcome and checks are reported, the append-only log row matches, protected starting work remains intact, and Cairn verified Git isolation and created the exact-path commit when the task started clean.`;
  const stopped = demo
    ? "STOPPED means the serial demonstration or its protection checks did not complete."
    : "STOPPED means the call was not authorized, the model reported a stop, process evidence failed, protected work changed, or the result records could not be verified.";
  return `# Task ${pad(contract.taskNumber)} — ${title}

Supported outcome: ${contract.supportedOutcome}

Lane: **Standard** — ${lane}.

${renderAcceptedTaskRequest(contract.intent)}
${promisesSection(contract)}
## Route

- Adapter: ${contract.route.adapterLabel}
- Provider: ${contract.route.provider}
- Model: ${contract.route.model}
- Reason: ${contract.route.reason}

## Owned records

${contract.ownedRecords.map((path) => `- \`${path}\``).join("\n")}

## Protected starting Git state

- HEAD: \`${contract.protectedGit.head}\`
- Working tree: ${status}
- Existing staged work: ${contract.protectedGit.staged ? "yes — no record commit is allowed" : "no"}

## Checks

${contract.checks.map((check) => `- ${check}`).join("\n")}

## Stop conditions

${contract.stopConditions.map((condition) => `- ${condition}`).join("\n")}

${done}

${stopped}
`;
}

function acceptedRequestForRecord(contract: AdapterTaskContract): Pick<ComposedRecordInput, "acceptedRequest" | "requestContext"> {
  const acceptedRequest = taskRequestView(contract.intent);
  if (!acceptedRequest) throw new Error("INVALID_TASK_INTENT");
  return { acceptedRequest, requestContext: contract.intent.context };
}

/**
 * The one bounded-evidence line for any adapter: its numeric evidence map,
 * sorted by key, rendered `key=value` and joined by "; ". Adapter-agnostic —
 * codex's nine fields, a third adapter's own keys, all render the same way.
 */
function boundedEvidenceSummary(evidence: Record<string, number>): string {
  const entries = Object.keys(evidence).sort().map((key) => `${key}=${evidence[key]}`);
  return `Bounded worker evidence: ${entries.join("; ")}.`;
}

interface ProcessFailureNote {
  code: string;
  debugPath: string | null;
}

interface SerialCandidateReportCustody {
  runId: string;
  round: 0 | 1;
  taskSpecSha256: string;
  evidencePlanSha256: string;
  candidateSha256: string;
  bundleSha256: string;
  evidenceStateSha256: string;
  repairEligibility: "available" | "spent"
    | "unavailable — ignored write set could not be proven empty"
    | "unavailable — candidate workspace no longer matches captured bundle";
}

interface SerialCandidateTerminalActionCustody {
  actionId: string;
  kind: "finalize" | "stop";
  baseCapsuleSha256: string;
}

function reportWithCandidateCustody(
  report: string,
  disposition: "DONE" | "STOPPED",
  custody: SerialCandidateReportCustody | undefined,
  terminalAction?: SerialCandidateTerminalActionCustody,
): string {
  if (custody === undefined) return report;
  const terminal = `Disposition: **${disposition}**\n`;
  if (!report.endsWith(terminal)) throw new Error("INVALID_CANDIDATE_TERMINAL_REPORT");
  const block = [
    "## Candidate custody — identifiers verified by Cairn",
    "",
    `- Run ID: \`${custody.runId}\``,
    `- Candidate round: ${custody.round}`,
    `- Task Spec SHA-256: \`${custody.taskSpecSha256}\``,
    `- Evidence Plan SHA-256: \`${custody.evidencePlanSha256}\``,
    `- Candidate SHA-256: \`${custody.candidateSha256}\``,
    `- Candidate bundle SHA-256: \`${custody.bundleSha256}\``,
    `- Evidence-state SHA-256: \`${custody.evidenceStateSha256}\``,
    `- Repair eligibility: ${custody.repairEligibility}`,
    ...(terminalAction ? [
      `- Terminal action ID: \`${terminalAction.actionId}\``,
      `- Terminal action kind: ${terminalAction.kind}`,
      `- Pre-terminal capsule SHA-256: \`${terminalAction.baseCapsuleSha256}\``,
    ] : []),
    "",
  ].join("\n");
  return `${report.slice(0, -terminal.length)}${block}${terminal}`;
}

/**
 * Task 052: the owned-records gate's recovery instruction for the honest stop
 * close. `disclosure` is the Cairn-authored line naming which recoveries were
 * applied (rendered under "Verified by Cairn"); `overwriteReport` lets the stop
 * close replace a worker-pre-written report path with the honest record (plain
 * write instead of "wx") — the one disclosed case where Cairn overwrites.
 */
type CandidateOwnedTextObservation =
  | Readonly<{ state: "missing" }>
  | Readonly<{
      state: "regular";
      text: string;
      dev: bigint;
      ino: bigint;
      size: bigint;
      mtimeNs: bigint;
      ctimeNs: bigint;
      mode: bigint;
    }>;

interface RecordRecovery {
  disclosure: string | null;
  overwriteReport: boolean;
  /** Candidate-only exact no-follow observations. Legacy recovery deliberately
   * has no value here and keeps its established byte behavior. */
  candidateObserved?: Readonly<{
    report: CandidateOwnedTextObservation;
    log: CandidateOwnedTextObservation;
    logCreateMode: "100644" | "100755";
  }>;
}

/**
 * Did this run's worker process actually start — is any cost for it already
 * spent? A timeout always spent a started process; a cancel spent one only when
 * it actually started, and a pre-spawn cancel carries a null debug path; both
 * process-failure codes (spawn and stdin) fail before any request reaches the
 * model; a boundary stop started nothing; and the offline lane starts no paid
 * call at all.
 *
 * Task 066: the stop report's already-spent sentence and the composed record's
 * `paidCallStarted` both read THIS one function, so Cairn can never tell a
 * result card one thing about a run and its own report another. Moving the
 * expression here changed no rendered byte — it is the same expression.
 */
function paidCallAlreadyStarted(
  demo: boolean,
  reason: SerialStopReason | null,
  processFailure?: ProcessFailureNote,
): boolean {
  return !demo && (reason === "ADAPTER_TIMED_OUT" ||
    (reason === "CANCELLED_BY_OWNER" && processFailure?.debugPath != null));
}

/**
 * The one place a report names the CLI invocation the owner would recognize,
 * keyed on the routed adapter id so a kimi stop never claims `codex exec`. A
 * future third adapter adds its case here; until then its own id is the most
 * honest string the envelope has.
 */
function invocationName(adapterId: string): string {
  if (adapterId === CODEX_EXEC_ADAPTER_ID) return "codex exec";
  if (adapterId === KIMI_EXEC_ADAPTER_ID) return "kimi -p";
  return adapterId;
}

function reportText(
  contract: AdapterTaskContract,
  demo: boolean,
  disposition: "DONE" | "STOPPED",
  reason: SerialStopReason | null,
  commitRequested: boolean,
  processEvidence?: Record<string, number>,
  processFailure?: ProcessFailureNote,
  orphanRisk = false,
): string {
  const taskNumber = contract.taskNumber;
  const acceptedRequestText = renderAcceptedTaskRequest(contract.intent);
  // Task 119: brand every non-demo record from the ROUTED adapter — the idiom
  // `rowFor` already uses — so a kimi timeout or boundary stop never claims
  // Codex or OpenAI. Codex output stays byte-identical (label "Codex Exec",
  // provider "OpenAI", invocation "codex exec"); only the source changed.
  const realCall = !demo;
  const label = contract.route.adapterLabel;
  const provider = contract.route.provider;
  if (disposition === "DONE") {
    return `# Task ${pad(taskNumber)} — offline serial demonstration report

## Result

Routing demonstration: **verified**

Requested product change: **not attempted**

The deterministic offline adapter completed the serial route. It received no project root, files, tools, process, network client, credential, or delegation surface.

## Verification

- The adapter result matched the exact fixed schema.
- Only this brief, this report, and one append-only log row were written.
- Protected starting Git work remained unchanged.
- Automatic record commit: ${commitRequested ? "requested; the returned run result records whether exact-name isolation allowed it" : "not requested; the three record changes remain visible for inspection"}.

${acceptedRequestText}

## Limitation

This was an offline lifecycle demonstration, not AI work and not implementation of the requested outcome.

Milestone movement: **NO**

Disposition: **DONE**
`;
  }
  if (realCall && reason === "REAL_MODEL_CALL_NOT_AUTHORIZED") {
    return `# Task ${pad(taskNumber)} — ${label} real-call boundary report

## Result

${label} readiness: **installed and connected**

Requested product change: **not attempted**

Cairn prepared one ephemeral, workspace-scoped ${label} request and stopped with the fixed code \`REAL_MODEL_CALL_NOT_AUTHORIZED\` before starting the execution process. No task data was sent to ${provider}, no model was called, and no credential value or authentication method was read, retained, or displayed.

## Verification

- Installation and connection were represented only as booleans.
- The real \`${invocationName(contract.route.adapterId)}\` process was not started.
- Cairn did not retry, resume, continue, schedule, delegate, or choose another provider.
- Existing work was not cleaned, reset, stashed, moved, or overwritten by Cairn.

${acceptedRequestText}

## Limitation

This task proved readiness detection and the call boundary only. It did not implement the requested outcome or authorize paid or data-bearing model work.

Milestone movement: **NO**

Disposition: **STOPPED**
`;
  }
  const title = realCall ? `${label} adapter report` : "offline serial demonstration report";
  const subject = realCall ? `${label} route` : "serial demonstration";
  const boundedEvidence = realCall && processEvidence
    ? `\n## Bounded process evidence\n\n${boundedEvidenceSummary(processEvidence)} Cairn retained only the worker's final message (for claims verification) and these bounded counts; no other item text, reasoning, commands, paths, stdout, stderr, thread IDs, account details, authentication data, or credentials.\n`
    : "";
  // A timeout always spent a started process; a cancel spent one only when it
  // actually started — a pre-spawn cancel carries a null debugPath and spent
  // nothing, so it earns no "already spent" sentence.
  const paidStarted = paidCallAlreadyStarted(demo, reason, processFailure);
  const orphanSentence = orphanRisk
    ? " The worker process could not be confirmed dead; the run lock was deliberately left in place — close the orphaned process (check your system's process list), then the next task will report the lock holder until this app restarts."
    : "";
  return `# Task ${pad(taskNumber)} — ${title}

## Result

Routing demonstration: **stopped**

Requested product change: **${realCall ? "not verified" : "not attempted"}**
${boundedEvidence}

The ${subject} stopped with the fixed error code \`${reason}\`. Cairn did not retry and did not include raw adapter output or error text. ${realCall ? "The workspace may contain retained model-authored evidence and must be inspected before another task." : ""}${paidStarted ? " The worker process had already started before Cairn stopped it; any cost for that call is already spent." : ""}${orphanSentence}
${processFailure ? `\nProcess failure: \`${processFailure.code}\`. Raw run evidence stays on the owner's own disk at: ${processFailure.debugPath ?? "unavailable (the local debug directory could not be created)"}. It is never committed to the repository.\n` : ""}

## Verification

- Existing work was not cleaned, reset, stashed, moved, or overwritten by Cairn.
- Unexpected changes, if any, were retained as evidence.
- No unverified product implementation or model work was claimed as complete.

${acceptedRequestText}

Milestone movement: **NO**

Disposition: **STOPPED**
`;
}

function cleanCell(value: string): string {
  return value.replace(/\|/g, "/").replace(/\r?\n/g, " ").trim();
}

function expectedLogLine(row: LogRow): string {
  return `| ${cleanCell(row.task)} | ${cleanCell(row.date)} | ${cleanCell(row.lane)} | ${cleanCell(row.mode)} | ${cleanCell(row.outcome)} | ${cleanCell(row.decision)} | ${cleanCell(row.summary)} | ${cleanCell(row.moved)} |\n`;
}

function rowFor(contract: AdapterTaskContract, demo: boolean, disposition: "DONE" | "STOPPED", reason: SerialStopReason | null): LogRow {
  const label = contract.route.adapterLabel;
  const workerBoundary = !demo && reason === "REAL_MODEL_CALL_NOT_AUTHORIZED";
  return {
    task: pad(contract.taskNumber),
    date: new Date().toISOString().slice(0, 10),
    lane: "Standard",
    mode: "Applied",
    outcome: disposition,
    decision: disposition === "DONE" ? "completed" : "stopped",
    summary: workerBoundary
      ? `${label} was installed and connected; Cairn stopped before the real process or model call.`
      : !demo
        ? `${label} stopped safely (${reason}); requested change was not verified.`
      : disposition === "DONE"
        ? "Offline routing demonstration verified; requested product change not attempted."
        : `Offline routing demonstration stopped safely (${reason}); requested product change not attempted.`,
    moved: "NO",
  };
}

/**
 * The evidence map is a plain object of at most 24 bounded numeric entries:
 * string keys ≤ 40 chars, values finite numbers with |v| ≤ 1e12. Negatives
 * are allowed — `exitCode: -1` is the honest translation of a child that
 * closed without a numeric exit code; count-vs-sign semantics belong to the
 * adapter that produced the key, and the envelope never trusts evidence as
 * ground truth anyway. A NaN value or a 25-entry map fails closed.
 */
function validEvidence(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const keys = Reflect.ownKeys(value);
  if (keys.length > 24) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of keys) {
    if (typeof key !== "string" || key.length > 40) return false;
    const descriptor = descriptors[key];
    if (!descriptor || descriptor.get || descriptor.set || !("value" in descriptor) || !descriptor.enumerable) return false;
    const entry = descriptor.value;
    if (typeof entry !== "number" || !Number.isFinite(entry) || Math.abs(entry) > 1_000_000_000_000) return false;
  }
  return true;
}

/**
 * The ONE result validator every adapter passes through — codex, offline demo,
 * a future third adapter alike. Exactly six own string keys, an ordinary
 * object prototype, all data descriptors (no getter/setter can run), the
 * literal kind and matching task identity, a completed/failed status, a
 * null-or-capped claims string, and a bounded numeric evidence map. All the
 * hostile-object paranoia the two old validators carried, in one place.
 */
function parseWorkerResult(value: unknown, contract: AdapterTaskContract): WorkerRunResult | null {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(value);
    const expected = contract.version === "cairn-serial-task/v4"
      ? [
        "claimsText", "evidence", "evidencePlanSha256", "kind", "processEvents",
        "requestSha256", "status", "taskNumber", "taskSpecSha256",
      ]
      : ["claimsText", "evidence", "kind", "requestSha256", "status", "taskNumber"];
    if (keys.some((key) => typeof key !== "string") || !sameLines((keys as string[]).sort(), expected)) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of expected) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || !("value" in descriptor) || !descriptor.enumerable) return null;
    }
    const claimsText = descriptors.claimsText.value;
    if (descriptors.taskNumber.value !== contract.taskNumber
      || descriptors.requestSha256.value !== contract.requestSha256
      || (descriptors.status.value !== "completed" && descriptors.status.value !== "failed")
      || (claimsText !== null && (typeof claimsText !== "string" || claimsText.length > 262_144))
      || !validEvidence(descriptors.evidence.value)) return null;
    if (contract.version === "cairn-serial-task/v3") {
      return descriptors.kind.value === "worker-result/v2" ? value as WorkerRunResult : null;
    }
    if (descriptors.kind.value !== "worker-result/v3"
      || descriptors.taskSpecSha256.value !== contract.taskSpecSha256
      || descriptors.evidencePlanSha256.value !== contract.evidencePlanSha256
      || (typeof claimsText === "string" && Buffer.byteLength(claimsText, "utf8") > 262_144)) return null;
    const processEvents = parseWorkerProcessEventBundle(descriptors.processEvents.value);
    if (!processEvents || !processEvents.complete
      || processEvents.representation !== CANONICAL_EVIDENCE_COMMAND_EVENT_REPRESENTATION
      || new Set(processEvents.events.map((event) => event.commandSha256)).size !== processEvents.events.length) return null;
    return Object.freeze({
      kind: "worker-result/v3",
      taskNumber: contract.taskNumber,
      requestSha256: contract.requestSha256,
      taskSpecSha256: contract.taskSpecSha256,
      evidencePlanSha256: contract.evidencePlanSha256,
      status: descriptors.status.value,
      claimsText,
      evidence: Object.freeze(Object.fromEntries(Object.entries(descriptors.evidence.value as Record<string, number>))),
      processEvents,
    }) as QualityBoundWorkerRunResultV3;
  } catch {
    return null;
  }
}

function validateWorkerResult(value: unknown, contract: AdapterTaskContract): value is WorkerRunResult {
  return parseWorkerResult(value, contract) !== null;
}

function verifyProtectedStartingPaths(root: string, start: GitSnapshot): boolean {
  if (!start.candidateProtection) {
    const currentStaged = lines(git(root, ["diff", "--cached", "--name-only"]));
    if (!sameLines(currentStaged, start.staged)) return false;
  }
  for (const [path, expected] of start.protectedPaths) {
    const currentWorktree = start.candidateProtection
      ? candidateProtectedWorktreeState(root, path)
      : worktreeHash(root, path);
    const currentIndex = start.candidateProtection
      ? candidateProtectedIndexState(root, path)
      : git(root, ["ls-files", "--stage", "--", path]);
    if (currentWorktree !== expected.worktree || currentIndex !== expected.index) return false;
  }
  return true;
}

/**
 * The bounded set of changed and untracked paths, forward-slashed and sorted.
 * This is the ground truth for what the worker (and Cairn's own record writes)
 * touched — always from Git, never from the worker's claims.
 */
function scanChangedPaths(root: string): string[] {
  return [...new Set([
    ...gitZ(root, ["diff", "--name-only", "-z", "--"]),
    ...gitZ(root, ["ls-files", "--others", "--exclude-standard", "-z", "--"]),
  ].map((path) => path.replace(/\\/g, "/")))].sort();
}

/**
 * The one bounded, Git-derived change set every composed record carries — the
 * same value and the same 100-path cap at every close site, so the result card
 * reads one answer to "what changed" and it is always Git's, never a claim.
 */
function changedSetForRecord(root: string): readonly string[] {
  return scanChangedPaths(root).slice(0, 100);
}

function taskSpecClaimExpectation(contract: QualityBoundAdapterTaskContractV4): {
  taskSpecSha256: string;
  criterionIds: readonly `c${number}`[];
  preferenceIds: readonly `p${number}`[];
} {
  return Object.freeze({
    taskSpecSha256: contract.taskSpecSha256,
    criterionIds: Object.freeze(contract.taskSpecReview.criteria.map((criterion) => criterion.id)),
    preferenceIds: Object.freeze(contract.taskSpecReview.preferences.map((preference) => preference.id)),
  });
}

/** Main maps immutable plan command hashes to cN. The adapter event never gets
 * to choose a criterion id, artifact id, result, source, or disposition. */
function deriveAdapterAttestations(
  contract: QualityBoundAdapterTaskContractV4,
  result: QualityBoundWorkerRunResultV3,
): readonly AdapterCommandAttestationV1[] | null {
  // Only adapter-command procedures consume process-event rows.  Owner
  // observations, packet artifacts, and comparison captures remain exact
  // EvidencePlan procedures, but their evidence is admitted later through
  // their own branded policy inputs; their presence must not manufacture a
  // missing command or make a mixed plan impossible to run.
  const plannedCommandHashes = contract.evidencePlan.procedures
    .filter((procedure) => procedure.kind === "adapter-command-attestation")
    .map((procedure) => procedure.command?.sha256 ?? null);
  const plannedHashSet = new Set(plannedCommandHashes);
  if (plannedCommandHashes.some((hash) => hash === null)
    || plannedHashSet.size !== plannedCommandHashes.length
    || result.processEvents.events.length !== plannedCommandHashes.length
    || result.processEvents.events.some((event) => !plannedHashSet.has(event.commandSha256))) return null;
  const attestations: AdapterCommandAttestationV1[] = [];
  const seenCommandHashes = new Set<string>();
  for (const procedure of contract.evidencePlan.procedures) {
    if (procedure.kind !== "adapter-command-attestation") continue;
    const commandSha256 = procedure.command?.sha256;
    if (!commandSha256 || seenCommandHashes.has(commandSha256)) return null;
    seenCommandHashes.add(commandSha256);
    const matches = result.processEvents.events.filter((event) => event.commandSha256 === commandSha256);
    if (matches.length !== 1) return null;
    attestations.push(Object.freeze({
      version: ADAPTER_COMMAND_ATTESTATION_VERSION,
      taskSpecSha256: contract.taskSpecSha256,
      evidencePlanSha256: contract.evidencePlanSha256,
      criterionId: procedure.criterionId,
      sequence: matches[0].sequence,
      commandSha256,
      exitCode: matches[0].exitCode,
    }));
  }
  return Object.freeze(attestations);
}

function hasUnexpectedPlannedExit(
  contract: QualityBoundAdapterTaskContractV4,
  attestations: readonly AdapterCommandAttestationV1[],
): boolean {
  const byCriterion = new Map(attestations.map((attestation) => [attestation.criterionId, attestation]));
  return contract.evidencePlan.procedures.some((procedure) => {
    if (procedure.kind !== "adapter-command-attestation" || !procedure.command) return false;
    const attestation = byCriterion.get(procedure.criterionId);
    return !attestation || !procedure.command.expectedExitCodes.includes(attestation.exitCode);
  });
}

function q9SerialHarnessGuardPresent(): boolean {
  return (typeof process.versions.electron === "string" && process.versions.electron.length > 0
      || process.env.NODE_TEST_CONTEXT === "child-v8")
    && process.env.CAIRN_E2E === "1"
    && process.env.CAIRN_MOCK === "1"
    && process.env.CAIRN_TEST_Q9 === "1";
}

function q9HarnessRouteExact(route: Extract<RouteResult, { status: "ready" }>): boolean {
  const fixture = route.recommended.id === "cairn-q9-e2e-q9-harness-revision"
    ? "q9-harness-revision"
    : route.recommended.id === "cairn-q9-e2e-q9-harness-refusal"
      ? "q9-harness-refusal"
      : null;
  return fixture !== null
    && route.recommended.provider === "Cairn E2E Fixture"
    && route.recommended.model === `synthetic-q9/${fixture}`
    && route.recommended.capabilities.length === 3
    && route.recommended.capabilities.includes("serial-task")
    && route.recommended.capabilities.includes("serial-task-candidate")
    && route.recommended.capabilities.includes("offline-demo");
}

function q9CairnBlockerRouteExact(route: Extract<RouteResult, { status: "ready" }>): boolean {
  return route.recommended.id === "cairn-q9-e2e-q9-cairn-blocker-confirmation"
    && route.recommended.provider === "Cairn E2E Fixture"
    && route.recommended.model === "synthetic-q9/q9-cairn-blocker-confirmation"
    && route.recommended.capabilities.length === 3
    && route.recommended.capabilities.includes("serial-task")
    && route.recommended.capabilities.includes("serial-task-candidate")
    && route.recommended.capabilities.includes("offline-demo");
}

function q9HarnessFailureProcedure(
  plan: EvidencePlanV1,
  attestations: readonly AdapterCommandAttestationV1[],
): Readonly<{ procedure: EvidencePlanV1["procedures"][number]; attestation: AdapterCommandAttestationV1 }> | null {
  const commands = plan.procedures.filter((row) => row.kind === "adapter-command-attestation" && row.command !== null);
  if (commands.length === 0 || attestations.length !== commands.length) return null;
  let failure: Readonly<{ procedure: EvidencePlanV1["procedures"][number]; attestation: AdapterCommandAttestationV1 }> | null = null;
  for (let index = 0; index < commands.length; index += 1) {
    const procedure = commands[index];
    const command = procedure.command;
    const attestation = attestations.find((row) => row.criterionId === procedure.criterionId);
    if (!command || !attestation || attestation.sequence !== index
      || attestation.commandSha256 !== command.sha256) return null;
    if (command.expectedExitCodes.includes(attestation.exitCode)) continue;
    if (failure !== null || attestation.exitCode !== 124 || command.timeoutMs !== 1_000) return null;
    failure = Object.freeze({ procedure, attestation });
  }
  return failure;
}

function revisionBaseAttestationsValid(
  taskSpecSha256Value: string,
  initialPlan: EvidencePlanV1,
  attestations: readonly AdapterCommandAttestationV1[],
): boolean {
  const initialPlanSha256 = evidencePlanSha256(initialPlan);
  if (!initialPlanSha256) return false;
  const failure = q9HarnessFailureProcedure(initialPlan, attestations);
  return failure !== null && attestations.every((row) => row.version === ADAPTER_COMMAND_ATTESTATION_VERSION
    && row.taskSpecSha256 === taskSpecSha256Value && row.evidencePlanSha256 === initialPlanSha256);
}

/** Exact revision-zero process custody retained after an authorized plan
 * revision. These rows are deliberately incomplete for DONE, but they remain
 * authenticated facts about the initial plan and may therefore survive a
 * trusted pending-journal restart. */
function revisionBaseAttestationsExact(
  taskSpecSha256Value: string,
  initialPlan: EvidencePlanV1,
  attestations: readonly AdapterCommandAttestationV1[],
): boolean {
  const initialPlanSha256 = evidencePlanSha256(initialPlan);
  const procedures = initialPlan.procedures.filter((row) => row.kind === "adapter-command-attestation");
  if (!initialPlanSha256 || procedures.length === 0 || attestations.length !== procedures.length) return false;
  const criterionIds = new Set<string>();
  const commandShas = new Set<string>();
  const sequences = new Set<number>();
  for (const row of attestations) {
    if (!exactPendingKeys(row, [
      "version", "taskSpecSha256", "evidencePlanSha256", "criterionId", "sequence", "commandSha256", "exitCode",
    ]) || row.version !== ADAPTER_COMMAND_ATTESTATION_VERSION
      || row.taskSpecSha256 !== taskSpecSha256Value || row.evidencePlanSha256 !== initialPlanSha256
      || typeof row.criterionId !== "string" || criterionIds.has(row.criterionId)
      || typeof row.commandSha256 !== "string" || !SHA256_RE.test(row.commandSha256)
      || commandShas.has(row.commandSha256) || !Number.isSafeInteger(row.sequence)
      || row.sequence < 0 || row.sequence >= attestations.length || sequences.has(row.sequence)
      || !Number.isSafeInteger(row.exitCode) || Object.is(row.exitCode, -0)
      || row.exitCode < -1 || row.exitCode > 255) return false;
    const procedure = procedures.find((item) => item.criterionId === row.criterionId);
    if (!procedure?.command || procedure.command.sha256 !== row.commandSha256) return false;
    criterionIds.add(row.criterionId);
    commandShas.add(row.commandSha256);
    sequences.add(row.sequence);
  }
  return sequences.size === attestations.length;
}

/** Authenticate the exact failed command facts retained while Q9 waits for an
 * owner decision or bounded repair. Failure is evidence in this lifecycle,
 * not a reason to discard the already-validated adapter event rows on
 * restart. */
function retainedQ9FailureAttestationsValid(
  taskSpecSha256Value: string,
  plan: EvidencePlanV1,
  attestations: readonly AdapterCommandAttestationV1[],
): boolean {
  const planSha256 = evidencePlanSha256(plan);
  const procedures = plan.procedures.filter((row) => row.kind === "adapter-command-attestation");
  if (!planSha256 || procedures.length === 0 || attestations.length !== procedures.length) return false;
  const criterionIds = new Set<string>();
  const commandShas = new Set<string>();
  const sequences = new Set<number>();
  let unexpectedExit = false;
  for (const row of attestations) {
    if (!exactPendingKeys(row, [
      "version", "taskSpecSha256", "evidencePlanSha256", "criterionId", "sequence", "commandSha256", "exitCode",
    ]) || row.version !== ADAPTER_COMMAND_ATTESTATION_VERSION
      || row.taskSpecSha256 !== taskSpecSha256Value || row.evidencePlanSha256 !== planSha256
      || typeof row.criterionId !== "string" || criterionIds.has(row.criterionId)
      || typeof row.commandSha256 !== "string" || !SHA256_RE.test(row.commandSha256)
      || commandShas.has(row.commandSha256) || !Number.isSafeInteger(row.sequence)
      || (row.sequence as number) < 0 || (row.sequence as number) >= attestations.length
      || sequences.has(row.sequence as number) || !Number.isSafeInteger(row.exitCode)
      || Object.is(row.exitCode, -0) || (row.exitCode as number) < -1 || (row.exitCode as number) > 255) return false;
    const procedure = procedures.find((item) => item.criterionId === row.criterionId);
    if (!procedure?.command || procedure.command.sha256 !== row.commandSha256) return false;
    criterionIds.add(row.criterionId);
    commandShas.add(row.commandSha256);
    sequences.add(row.sequence as number);
    if (!procedure.command.expectedExitCodes.includes(row.exitCode as number)) unexpectedExit = true;
  }
  return unexpectedExit && sequences.size === attestations.length;
}

function q9HarnessFailureFromContext(
  candidate: SerialCandidateV1,
  context: OpenSerialCandidateContext,
): SerialQ9HarnessFailureV1 | null {
  if (!q9SerialHarnessGuardPresent() || candidate.round !== 0 || candidate.callsUsed.repair !== 0
    || candidate.callsUsed.critic !== 0 || candidate.lineage.evidencePlan.revision !== 0
    || context.attestationsCompleteForDone || !q9HarnessRouteExact(context.route)) return null;
  const pair = q9HarnessFailureProcedure(candidate.lineage.evidencePlan, context.attestations);
  if (!pair?.procedure.command || pair.attestation.taskSpecSha256 !== candidate.taskSpecSha256
    || pair.attestation.evidencePlanSha256 !== candidate.evidencePlanSha256) return null;
  const boundedOutput = "The injected Q9 harness timed out before reaching its preregistered assertion.";
  const outputSha256 = pendingSha256(boundedOutput);
  const evidenceRef = `q9-harness-${candidate.candidateSha256.slice(0, 24)}`;
  const withoutSha = Object.freeze({
    version: SERIAL_Q9_HARNESS_FAILURE_VERSION,
    projectHash: candidate.projectRootSha256,
    runId: candidate.runId,
    candidateSha256: candidate.candidateSha256,
    taskSpecSha256: candidate.taskSpecSha256,
    evidencePlanSha256: candidate.evidencePlanSha256,
    criterionId: pair.procedure.criterionId,
    commandSha256: pair.procedure.command.sha256,
    code: "TIMED_OUT_BEFORE_ASSERTION" as const,
    exitCode: 124 as const,
    boundedOutput,
    outputSha256,
    evidenceRef,
  });
  const failure = Object.freeze({
    ...withoutSha,
    failureSha256: pendingSha256(JSON.stringify(withoutSha)),
  }) as SerialQ9HarnessFailureV1;
  serialQ9HarnessFailureBrand.add(failure);
  serialQ9HarnessFailureBindings.set(failure, Object.freeze({ candidate, context }));
  return failure;
}

/** Exact, bounded pre-assertion failure observed from the guarded offline Q9
 * adapter. A structural clone is not revision authority. */
export function serialCandidateQ9HarnessFailure(value: unknown): SerialQ9HarnessFailureV1 | null {
  const open = openContextForCandidate(value);
  return open ? q9HarnessFailureFromContext(open.candidate, open.context) : null;
}

export function serialQ9HarnessFailureSha256(value: unknown): string | null {
  return typeof value === "object" && value !== null && serialQ9HarnessFailureBrand.has(value)
    ? (value as SerialQ9HarnessFailureV1).failureSha256
    : null;
}

/** Q9's only proposed correction: raise the exact timed-out cN command to the
 * preregistered 60-second ceiling. No caller-provided command/path/parser can
 * enter this preview. */
export function previewSerialCandidateQ9HarnessRevision(
  value: unknown,
  rawFailure: unknown,
): EvidencePlanRevisionPreviewV1 | null {
  const open = openContextForCandidate(value);
  if (!open || typeof rawFailure !== "object" || rawFailure === null
    || !serialQ9HarnessFailureBrand.has(rawFailure)) return null;
  const failure = rawFailure as SerialQ9HarnessFailureV1;
  const binding = serialQ9HarnessFailureBindings.get(rawFailure);
  if (!binding || binding.candidate !== open.candidate || binding.context !== open.context) return null;
  const procedure = open.candidate.lineage.evidencePlan.procedures.find((row) => row.criterionId === failure.criterionId);
  if (!procedure?.command || procedure.command.sha256 !== failure.commandSha256) return null;
  const { sha256: _sha256, text: _text, ...command } = procedure.command;
  void _sha256;
  void _text;
  const preview = previewEvidencePlanRevision(
    open.candidate.lineage.taskSpec,
    open.candidate.lineage.evidencePlan,
    {
      criterionId: failure.criterionId,
      changeKind: "timeout-increase",
      replacementCommand: { ...command, timeoutMs: 60_000 },
    },
    [failure.evidenceRef],
  );
  if (!preview) return null;
  serialQ9HarnessPreviewBindings.set(preview, Object.freeze({ candidate: open.candidate, failure }));
  return preview;
}

/** Join the exact Q9 failure/preview to one owner action and quality.ts's
 * immutable authorized revision tuple. */
export function authorizeSerialCandidateQ9HarnessRevision(
  value: unknown,
  rawFailure: unknown,
  rawPreview: unknown,
  ownerApproval: SerialQ9HarnessRevisionOwnerApprovalV1,
): AuthorizedEvidencePlanRevisionV1 | null {
  const open = openContextForCandidate(value);
  if (!open || typeof rawFailure !== "object" || rawFailure === null
    || typeof rawPreview !== "object" || rawPreview === null
    || !serialQ9HarnessFailureBrand.has(rawFailure)
    || !ACTION_UUID_V4_RE.test(ownerApproval?.ownerActionNonce ?? "")) return null;
  const parsedTime = new Date(ownerApproval?.approvedAt ?? "");
  if (Number.isNaN(parsedTime.valueOf()) || parsedTime.toISOString() !== ownerApproval.approvedAt) return null;
  const failure = rawFailure as SerialQ9HarnessFailureV1;
  const preview = rawPreview as EvidencePlanRevisionPreviewV1;
  const failureBinding = serialQ9HarnessFailureBindings.get(rawFailure);
  const previewBinding = serialQ9HarnessPreviewBindings.get(rawPreview);
  if (!failureBinding || failureBinding.candidate !== open.candidate || failureBinding.context !== open.context
    || !previewBinding || previewBinding.candidate !== open.candidate || previewBinding.failure !== failure) return null;
  const authorization = Object.freeze({
    version: EVIDENCE_PLAN_REVISION_AUTHORIZATION_VERSION,
    runId: open.candidate.runId,
    taskSpecSha256: open.candidate.taskSpecSha256,
    criterionId: failure.criterionId,
    fromPlanSha256: preview.fromPlanSha256,
    toPlanSha256: preview.toPlanSha256,
    unchangedAuthoritySha256: preview.unchangedAuthoritySha256,
    changeKind: "timeout-increase" as const,
    mainHarnessFailureCode: "TIMED_OUT_BEFORE_ASSERTION" as const,
    mainEvidenceRefs: Object.freeze([failure.evidenceRef]),
    ownerActionNonce: ownerApproval.ownerActionNonce,
    approvedAt: ownerApproval.approvedAt,
  });
  return authorizeEvidencePlanRevision(
    open.candidate.lineage.taskSpec,
    open.candidate.lineage.evidencePlan,
    preview,
    authorization,
    Object.freeze({ ...authorization, version: EVIDENCE_PLAN_REVISION_AUTHORITY_CONTEXT_VERSION }),
  );
}

function composeBoundRunRecord(
  contract: AdapterTaskContract,
  disposition: "DONE" | "STOPPED",
  stopReason: SerialStopReason | null,
  claims: TaskSpecWorkerClaims | null,
  attestations: readonly AdapterCommandAttestationV1[],
  completionAuthority?: unknown,
): TaskSpecRunRecordV1 | null {
  if (contract.version !== "cairn-serial-task/v4") return null;
  return composeTaskSpecRunRecord(contract.taskSpec, contract.evidencePlan, {
    version: TASK_SPEC_RUN_RECORD_VERSION,
    requestSha256: contract.requestSha256,
    taskSpecSha256: contract.taskSpecSha256,
    evidencePlanSha256: contract.evidencePlanSha256,
    criteria: contract.taskSpecReview.criteria.map((criterion) => Object.freeze({
      id: criterion.id,
      promise: criterion.promise,
    })),
    preferences: contract.taskSpecReview.preferences.map((preference) => Object.freeze({
      id: preference.id,
      dimension: preference.dimension,
      desiredDirection: preference.desiredDirection,
    })),
    workerClaims: claims,
    adapterAttestations: attestations,
    envelopeResult: Object.freeze({
      version: ENVELOPE_RESULT_VERSION,
      taskNumber: contract.taskNumber,
      requestSha256: contract.requestSha256,
      taskSpecSha256: contract.taskSpecSha256,
      disposition,
      stopReason,
    }),
  }, completionAuthority);
}

function serialCompletionRecordAuthority(candidate: SerialCandidateV1): unknown | null {
  const authority = serialCandidateCompletionAuthority(candidate);
  return authority === null ? null : Object.freeze({
    authority,
    projectHash: candidate.projectRootSha256,
    runId: candidate.runId,
    candidateSha256: candidate.candidateSha256,
  });
}

function restorePreparedSealAuthorization(
  candidate: SerialCandidateV1,
  raw: unknown,
  capsuleSha256: string,
): SerialCandidateSealAuthorizationV1 | null {
  const legacy = composeSerialCandidateSealAuthorization(candidate, raw);
  if (legacy) return legacy;
  return restoreSerialCandidateSealAuthorizationForPending(
    candidate,
    raw,
    composeSerialPendingRestoreAuthority(
      capsuleSha256,
      candidate.projectRootSha256,
      candidate.runId,
      candidate.candidateSha256,
    ),
    capsuleSha256,
  );
}

function composeCairnWorkerRecordValues(
  root: string,
  contract: AdapterTaskContract,
  disposition: "DONE" | "STOPPED",
  stopReason: SerialStopReason | null,
  claims: WorkerClaims | null,
  protectedValid: boolean,
  commit: { status: "created" | "skipped"; reason: string } | null,
  evidence: Record<string, number> | null,
  recovery?: RecordRecovery,
  taskSpecEvidence?: Readonly<{
    claims: TaskSpecWorkerClaims | null;
    attestations: readonly AdapterCommandAttestationV1[];
    completionAuthority?: unknown;
  }>,
  candidateCustody?: SerialCandidateReportCustody,
  candidateFilesChanged?: readonly string[],
  terminalAction?: SerialCandidateTerminalActionCustody,
  recordDate = new Date().toISOString().slice(0, 10),
  /** Task 238: the accepted promises and how each was answered. */
  promiseAnswers?: readonly SerialTaskPromiseAnswerV1[],
  /** Task 244: the one approved repair, or nothing when none was. */
  repair?: SerialCandidateRepairRequestV1 | null,
  /** Task 252: the separately approved critic's findings, so a run that paid
   * for a second opinion seals with what it bought instead of losing it. */
  critique?: SerialRunCritiqueRecordV1 | null,
): { reportText: string; row: LogRow; composed: ComposedRecordInput } {
  const taskSpecRunRecord = composeBoundRunRecord(
    contract,
    disposition,
    stopReason,
    taskSpecEvidence?.claims ?? null,
    taskSpecEvidence?.attestations ?? Object.freeze([]),
    taskSpecEvidence?.completionAuthority,
  );
  if (contract.version === "cairn-serial-task/v4" && !taskSpecRunRecord) {
    throw new Error("INVALID_TASK_SPEC_RUN_RECORD");
  }
  const input: ComposedRecordInput = {
    taskNumber: contract.taskNumber,
    route: contract.route,
    ...acceptedRequestForRecord(contract),
    disposition,
    stopReason,
    claims,
    filesChanged: candidateFilesChanged ?? changedSetForRecord(root),
    protectedIntact: protectedValid,
    commit,
    evidenceSummary: evidence ? boundedEvidenceSummary(evidence) : null,
    processFailure: null,
    paidCallStarted: true,
    ...(taskSpecRunRecord ? { taskSpecRunRecord } : {}),
    recordRecovery: recovery?.disclosure ?? null,
    ...(promiseAnswers && promiseAnswers.length > 0 ? { promiseAnswers } : {}),
    ...(repair ? { repair } : {}),
    ...(critique && critique.findings.length > 0 ? { critique } : {}),
  };
  const report = reportWithCandidateCustody(
    composeWorkerReport(input),
    disposition,
    candidateCustody,
    terminalAction,
  );
  const row: LogRow = {
    task: pad(contract.taskNumber),
    date: recordDate,
    lane: "Standard",
    mode: "Applied",
    outcome: disposition,
    decision: disposition === "DONE" ? "completed" : "stopped",
    summary: composeWorkerRowSummary(input),
    moved: taskSpecRunRecord?.workerClaims?.milestone ?? claims?.milestone ?? "NO",
  };
  return { reportText: report, row, composed: input };
}

/**
 * Cairn authors the worker's task records from the parsed claims and its own
 * Git verification (Task 048, the inversion). The worker writes no record; this
 * writes the report (flag "wx" — never overwriting) and appends exactly one
 * log row, then verifies its own writes byte-back exactly as writeClosedRecords
 * does. `filesChanged` is the bounded Git-derived change set (never the claims);
 * on a stop it lists the RETAINED evidence.
 */
function cairnWorkerRecords(
  root: string,
  contract: AdapterTaskContract,
  start: GitSnapshot,
  disposition: "DONE" | "STOPPED",
  stopReason: SerialStopReason | null,
  claims: WorkerClaims | null,
  protectedValid: boolean,
  commit: { status: "created" | "skipped"; reason: string } | null,
  evidence: Record<string, number> | null,
  recovery?: RecordRecovery,
  taskSpecEvidence?: Readonly<{
    claims: TaskSpecWorkerClaims | null;
    attestations: readonly AdapterCommandAttestationV1[];
    completionAuthority?: unknown;
  }>,
  candidateCustody?: SerialCandidateReportCustody,
  candidateFilesChanged?: readonly string[],
  terminalAction?: SerialCandidateTerminalActionCustody,
  recordDate?: string,
  candidateBriefText?: string,
  /** Task 238: the accepted promises and how each was answered. */
  promiseAnswers?: readonly SerialTaskPromiseAnswerV1[],
  /** Task 244: the one approved repair, or nothing when none was. */
  repair?: SerialCandidateRepairRequestV1 | null,
  /** Task 252: the separately approved critic's findings. */
  critique?: SerialRunCritiqueRecordV1 | null,
): { reportText: string; row: LogRow; verified: boolean; composed: ComposedRecordInput } {
  const values = composeCairnWorkerRecordValues(
    root,
    contract,
    disposition,
    stopReason,
    claims,
    protectedValid,
    commit,
    evidence,
    recovery,
    taskSpecEvidence,
    candidateCustody,
    candidateFilesChanged,
    terminalAction,
    recordDate,
    promiseAnswers,
    repair,
    critique,
  );
  const report = values.reportText;
  const row = values.row;
  // The report path is Cairn-owned and normally authored with "wx" so Cairn
  // never overwrites an existing file. Only in the one disclosed case where the
  // owned-records gate found the worker had pre-written this exact path does it
  // overwrite (plain "w") with this honest STOPPED report; the worker's product
  // files stay retained in the workspace for inspection.
  const briefPath = paths.brief(root, contract.taskNumber);
  const reportPath = paths.report(root, contract.taskNumber);
  const logPath = paths.log(root);
  const candidateOwnedWrite = candidateFilesChanged !== undefined;
  if (candidateOwnedWrite) {
    const exactRecovery = recovery?.candidateObserved;
    candidateWriteOwnedTextNoFollow(
      reportPath,
      report,
      exactRecovery?.report ?? (recovery?.overwriteReport ? undefined : null),
    );
    candidateWriteOwnedTextNoFollow(
      logPath,
      start.logText + expectedLogLine(row),
      exactRecovery?.log ?? (recovery ? undefined : start.logText),
      exactRecovery?.log.state === "missing" ? exactRecovery.logCreateMode : undefined,
    );
  } else {
    writeFileSync(reportPath, report, {
      encoding: "utf8",
      flag: recovery?.overwriteReport ? "w" : "wx",
    });
    appendLogRow(root, row);
  }
  const actualLog = candidateOwnedWrite
    ? candidateOwnedTextNoFollow(logPath) ?? ""
    : existsSync(logPath) ? readFileSync(logPath, "utf8") : "";
  // Every read is existsSync-guarded so a worker that deleted a record can only
  // make the corresponding check false — never throw a raw ENOENT after the
  // log row was already appended (that was how a failed byte-back left a
  // standing forged record behind). The brief is Cairn's start-of-task text; on
  // a DONE it is committed, so its byte-match is verified here. On a STOPPED the
  // brief is retained evidence, not committed — its integrity is not part of
  // what makes the honest STOPPED records themselves verified, and the DONE path
  // already checks the brief before any DONE record is authored (see below).
  const checks = {
    brief: disposition === "STOPPED" || (candidateOwnedWrite
      ? candidateOwnedTextNoFollow(briefPath) === (candidateBriefText ?? briefText(contract, false))
      : existsSync(briefPath) && readFileSync(briefPath, "utf8") === briefText(contract, false)),
    report: candidateOwnedWrite
      ? candidateOwnedTextNoFollow(reportPath) === report
      : existsSync(reportPath) && readFileSync(reportPath, "utf8") === report,
    log: actualLog === start.logText + expectedLogLine(row),
    row: candidateOwnedWrite
      || parseLog(root).filter((item) => item.task === pad(contract.taskNumber)).length === 1,
  };
  const verified = checks.brief && checks.report && checks.log && checks.row;
  // The composed input travels with the records it authored: the card reads the
  // very value this report was rendered from, so the two cannot disagree.
  return { reportText: report, row, verified, composed: values.composed };
}

/**
 * Task 066: the structured truth for a close site that renders one of the legacy
 * `reportText()` templates and therefore composes no record input of its own —
 * the safety close, both record rewrites, and the offline demonstration lane.
 * Nothing here is rendered: the report bytes at those sites are unchanged. Every
 * field is required so a new close site cannot quietly inherit someone else's
 * value; each caller passes the REAL value its own site knows.
 */
function composedForClose(
  contract: AdapterTaskContract,
  disposition: "DONE" | "STOPPED",
  stopReason: SerialStopReason | null,
  site: {
    claims: WorkerClaims | null;
    filesChanged: readonly string[];
    protectedIntact: boolean;
    commit: { status: "created" | "skipped"; reason: string } | null;
    evidenceSummary: string | null;
    processFailure: ProcessFailureNote | null;
    paidCallStarted: boolean;
    taskSpecClaims?: TaskSpecWorkerClaims | null;
    adapterAttestations?: readonly AdapterCommandAttestationV1[];
    /** Task 244: the one approved repair, or absent when none was. */
    repair?: SerialCandidateRepairRequestV1 | null;
  },
): ComposedRecordInput {
  const taskSpecRunRecord = composeBoundRunRecord(
    contract,
    disposition,
    stopReason,
    site.taskSpecClaims ?? null,
    site.adapterAttestations ?? Object.freeze([]),
  );
  if (contract.version === "cairn-serial-task/v4" && !taskSpecRunRecord) {
    throw new Error("INVALID_TASK_SPEC_RUN_RECORD");
  }
  return {
    taskNumber: contract.taskNumber,
    route: contract.route,
    ...acceptedRequestForRecord(contract),
    disposition,
    stopReason,
    claims: site.claims,
    filesChanged: site.filesChanged,
    protectedIntact: site.protectedIntact,
    commit: site.commit,
    evidenceSummary: site.evidenceSummary,
    processFailure: site.processFailure,
    paidCallStarted: site.paidCallStarted,
    ...(taskSpecRunRecord ? { taskSpecRunRecord } : {}),
    ...(site.repair ? { repair: site.repair } : {}),
    // Only the Task 052 owned-records gate authors a recovery line, and it
    // closes through cairnWorkerRecords; no legacy-template site has one.
    recordRecovery: null,
  };
}

/**
 * Task 067: the two Git-derived facts the adapter-throw safety close composes
 * its record from — or null when Git cannot answer.
 *
 * Both must be read BEFORE Cairn writes its own stop records: reading them
 * afterwards would let Cairn's own log append read back as a protected-work
 * change on a start-dirty log, which is a false record rather than a forced
 * inspection. That puts Git reads in the one window where an unwrapped throw
 * escapes as a raw child-process error — writing no stop record AND skipping
 * the throw-site log restore, reopening the hole Tasks 058/059 closed. This
 * codebase's threat model includes a worker corrupting the repository, so the
 * failure is caught here and the caller closes through the same door every
 * other unverifiable close uses.
 *
 * The protected-work question is asked in the form each site deserves: a
 * boundary stop started no process and the offline adapter receives no root, so
 * the cheap status-level check answers exactly what those two raise (did
 * anything outside Cairn's own records move at all?); any other throw may follow
 * real worker activity, where new files are expected work rather than a
 * protection failure, so the hash-level protected-path check answers there.
 */
function safetyCloseFacts(
  root: string,
  start: GitSnapshot,
  owned: ReadonlySet<string>,
  demo: boolean,
  reason: SerialStopReason,
): { filesChanged: readonly string[]; protectedIntact: boolean } | null {
  try {
    return {
      filesChanged: changedSetForRecord(root),
      protectedIntact: demo || reason === "REAL_MODEL_CALL_NOT_AUTHORIZED"
        ? verifyProtected(root, start, owned)
        : verifyProtectedStartingPaths(root, start),
    };
  } catch {
    // Git itself is unreadable. No honest record can be composed from it, and
    // the caller must not let the raw error escape.
    return null;
  }
}

/**
 * Task 080: the worker lane's protected-work answer, or null when Git cannot
 * give one. Task 067's ledgered sibling, in Task 067's shape.
 *
 * This is the FIRST Git read after a worker returns, and it runs BEFORE the
 * owned-records gate — so a row the worker forged into Cairn's own append-only
 * log is still standing when it executes. A worker that corrupts the repository
 * (Task 067's own recipe: write garbage over `.git/index`) and then returns a
 * valid `completed` result makes this read throw. Unwrapped, that raw
 * child-process error escapes `runSerialTask`, skipping the throw-site log
 * restore, and the forged DONE row survives to earn a stone. Caught here, the
 * caller closes through the same door every other unverifiable close uses.
 */
function protectedStartingPathsOrNull(root: string, start: GitSnapshot): boolean | null {
  try {
    return verifyProtectedStartingPaths(root, start);
  } catch {
    return null;
  }
}

function isAncestor(root: string, ancestor: string, descendant: string): boolean {
  try {
    git(root, ["merge-base", "--is-ancestor", ancestor, descendant]);
    return true;
  } catch {
    return false;
  }
}

function changedTaskPaths(root: string, contract: AdapterTaskContract): string[] | null {
  const values = new Set([
    ...gitZ(root, ["diff", "--name-only", "-z", "--"]),
    ...gitZ(root, ["ls-files", "--others", "--exclude-standard", "-z", "--"]),
  ].map((path) => path.replace(/\\/g, "/")));
  const owned = new Set(contract.ownedRecords);
  for (const path of values) {
    const absolute = resolve(root, path);
    const relativePath = relative(root, absolute).replace(/\\/g, "/");
    if (!path || isAbsolute(path) || relativePath.startsWith("../") || isAbsolute(relativePath)) return null;
    if (path.split("/").includes(".git")) return null;
    const reservedRecord = serialCandidateReservedRecordClass(path);
    if (reservedRecord === "task" && !owned.has(path)) return null;
    // Task 212: a verdict is a record ABOUT a completed run — Cairn's, on the
    // owner's behalf — and no run ever owns one. Without this, a file under
    // `docs/ai-work/verdicts/` was returned as a product path and committed
    // inside "complete verified worker task", attributing the owner's judgment
    // to the worker and letting a worker plant one. The rejection is flat
    // rather than owned-gated because the owned set is only ever the brief,
    // the report, and the log.
    if (reservedRecord === "verdict") return null;
  }
  // Cairn now authors the owned records AFTER this scan (Task 048), so they are
  // no longer required to pre-exist in the change set. Every other safety line
  // stays: no path escapes the project, touches .git, or writes a task record
  // Cairn does not own.
  return [...values].sort();
}

function changedCandidateTaskPaths(root: string, contract: AdapterTaskContract): string[] | null {
  const scanned = candidateScanChangedPaths(root, contract.ownedRecords);
  if (!scanned) return null;
  const values = new Set(scanned);
  const owned = new Set(contract.ownedRecords);
  for (const path of values) {
    const absolute = resolve(root, path);
    const relativePath = relative(root, absolute).replace(/\\/g, "/");
    if (!path || isAbsolute(path) || relativePath.startsWith("../") || isAbsolute(relativePath)) return null;
    if (path.split("/").includes(".git")) return null;
    const reservedRecord = serialCandidateReservedRecordClass(path);
    if (reservedRecord === "task" && !owned.has(path)) return null;
    if (reservedRecord === "verdict") return null;
  }
  return [...values].sort();
}

function unstageExactPaths(root: string, pathsToUnstage: readonly string[]): void {
  try {
    git(root, ["restore", "--staged", "--", ...pathsToUnstage]);
  } catch {
    // Retain the staged evidence if Git cannot safely restore the index.
  }
}

/**
 * Stages exactly the expected set (product paths ∪ owned records) and creates
 * one isolated exact-path task commit. The full changed set must already equal
 * the expected set; the staged list must match it with nothing else changed or
 * untracked; ancestry and a single-commit count confirm one isolated commit.
 * Any failure returns null with the index restored, and the caller closes
 * MODEL_RESULT_NOT_VERIFIED.
 */
function commitExactPaths(root: string, start: GitSnapshot, expected: readonly string[], taskNumber: number): RecordCommit | null {
  if (expected.length === 0) return null;
  const expectedSorted = [...expected].sort();
  try {
    // Recompute the full changed set now that the records are written; it must
    // be exactly the product paths plus the owned records, nothing else.
    if (!sameLines(scanChangedPaths(root), expectedSorted)) return null;
    git(root, ["add", "--", ...expectedSorted]);
    const staged = gitZ(root, ["diff", "--cached", "--name-only", "-z", "--"]).map((path) => path.replace(/\\/g, "/")).sort();
    if (!sameLines(staged, expectedSorted) ||
        gitZ(root, ["diff", "--name-only", "-z", "--"]).length > 0 ||
        gitZ(root, ["ls-files", "--others", "--exclude-standard", "-z", "--"]).length > 0) {
      unstageExactPaths(root, expectedSorted);
      return null;
    }
    git(root, ["commit", "-m", `Task ${pad(taskNumber)}: complete verified worker task`]);
  } catch {
    if (git(root, ["rev-parse", "HEAD"]) === start.head) unstageExactPaths(root, expectedSorted);
    return null;
  }
  const committedHead = git(root, ["rev-parse", "HEAD"]);
  if (!isAncestor(root, start.head, committedHead)) return null;
  if (Number(git(root, ["rev-list", "--count", `${start.head}..${committedHead}`])) !== 1) return null;
  // The commit's correctness is fully established before and by the commit:
  // the pre-commit checks proved exactly the expected set was staged with
  // nothing else changed or untracked, and the ancestry and single-commit count
  // confirm one isolated commit. A post-commit whole-tree cleanliness check is
  // not re-run here: it can report a file as dirty on a stat difference alone
  // (identical content, e.g. a CRLF working copy over an LF index) and would
  // tear a correct DONE commit into STOPPED (Task 006).
  return { status: "created", reason: "Cairn created one isolated exact-path local task commit.", hash: committedHead };
}

type CandidateGitBlobEntry = Readonly<{ mode: "100644" | "100755"; oid: string }> | null;

interface CandidateGitCommandOptions {
  indexPath?: string;
  input?: Buffer | string;
  commitIdentity?: boolean;
}

const CANDIDATE_NEUTRAL_RESERVED_FILTERS = ["unspecified", "unset"].flatMap((name) => [
  "-c", `filter.${name}.clean=`,
  "-c", `filter.${name}.smudge=`,
  "-c", `filter.${name}.process=`,
  "-c", `filter.${name}.required=false`,
]);

const CANDIDATE_NEUTRAL_WORKTREE_GIT = [
  "-c", "core.fsmonitor=false",
  "-c", "core.ignoreCase=false",
  "-c", "trace2.normalTarget=0",
  "-c", "trace2.eventTarget=0",
  "-c", "trace2.perfTarget=0",
] as const;

type CandidateGitEnvironmentSnapshot = readonly Readonly<{ name: string; value: string }>[];

function candidateGitEnvironmentSnapshot(): CandidateGitEnvironmentSnapshot {
  return Object.freeze(Object.entries(process.env)
    .filter(([name, value]) => value !== undefined && serialCandidateGitEnvironmentNameDenied(name))
    .map(([name, value]) => Object.freeze({ name, value: value! })));
}

function restoreCandidateGitEnvironment(snapshot: CandidateGitEnvironmentSnapshot): void {
  for (const name of Object.keys(process.env)) {
    if (serialCandidateGitEnvironmentNameDenied(name)) delete process.env[name];
  }
  for (const entry of snapshot) process.env[entry.name] = entry.value;
}

function candidateChildGitEnvironment(indexPath?: string, commitIdentity = false): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { ...process.env };
  for (const name of Object.keys(environment)) {
    if (serialCandidateGitEnvironmentNameDenied(name)) delete environment[name];
  }
  environment.GIT_OPTIONAL_LOCKS = "0";
  environment.GIT_TERMINAL_PROMPT = "0";
  environment.GIT_NO_REPLACE_OBJECTS = "1";
  const nullConfig = process.platform === "win32" ? "NUL" : "/dev/null";
  environment.GIT_CONFIG_NOSYSTEM = "1";
  environment.GIT_CONFIG_SYSTEM = nullConfig;
  environment.GIT_CONFIG_GLOBAL = nullConfig;
  for (const name of [
    "GIT_TRACE", "GIT_TRACE_PACK_ACCESS", "GIT_TRACE_PACKFILE", "GIT_TRACE_PACKET",
    "GIT_TRACE_PERFORMANCE", "GIT_TRACE_SETUP", "GIT_TRACE_SHALLOW", "GIT_TRACE_CURL",
    "GIT_TRACE_FSMONITOR", "GIT_TRACE2", "GIT_TRACE2_EVENT", "GIT_TRACE2_PERF",
  ]) environment[name] = "0";
  const commitEnvironmentNames = new Set([
    "GIT_AUTHOR_NAME", "GIT_AUTHOR_EMAIL", "GIT_AUTHOR_DATE",
    "GIT_COMMITTER_NAME", "GIT_COMMITTER_EMAIL", "GIT_COMMITTER_DATE",
  ]);
  for (const name of Object.keys(environment)) {
    if (commitEnvironmentNames.has(name.toUpperCase())) delete environment[name];
  }
  if (commitIdentity) {
    // This commit is authored by Cairn's verified terminal transaction, not by
    // an inherited shell identity or mutable global Git configuration. Dates
    // remain Git-generated after the inherited date overrides are removed.
    environment.GIT_AUTHOR_NAME = "Cairn";
    environment.GIT_AUTHOR_EMAIL = "cairn@local.invalid";
    environment.GIT_COMMITTER_NAME = "Cairn";
    environment.GIT_COMMITTER_EMAIL = "cairn@local.invalid";
  }
  if (indexPath) environment.GIT_INDEX_FILE = indexPath;
  return environment;
}

/** The lock helper now performs its own closed Git-environment validation and
 * scrub. Keep this candidate wrapper as the explicit pre-call assertion. */
function acquireCandidateRunLock(root: string): RunLock {
  if (!serialCandidateGitEnvironmentSafe()) throw new Error("UNSAFE_SERIAL_CANDIDATE_GIT_ENVIRONMENT");
  return acquireRunLock(root);
}

function candidateGit(root: string, args: string[], options: CandidateGitCommandOptions = {}): string {
  return execFileSync("git", [...CANDIDATE_NEUTRAL_WORKTREE_GIT, ...args], {
    cwd: root,
    encoding: "utf8",
    input: options.input,
    stdio: ["pipe", "pipe", "pipe"],
    env: candidateChildGitEnvironment(options.indexPath, options.commitIdentity),
    maxBuffer: 4 * 1024 * 1024,
  }).trimEnd();
}

function candidateGitZ(root: string, args: string[], options: CandidateGitCommandOptions = {}): string[] {
  const output = execFileSync("git", [...CANDIDATE_NEUTRAL_WORKTREE_GIT, ...args], {
    cwd: root,
    encoding: "utf8",
    input: options.input,
    stdio: ["pipe", "pipe", "pipe"],
    env: candidateChildGitEnvironment(options.indexPath, options.commitIdentity),
    maxBuffer: 4 * 1024 * 1024,
  });
  return output.split("\0").filter(Boolean);
}

function candidateReservedFilterConfigAbsent(root: string): boolean {
  for (const name of ["unspecified", "unset"] as const) {
    for (const slot of ["clean", "process"] as const) {
      try {
        const values = candidateGitZ(root, ["config", "--null", "--get-all", `filter.${name}.${slot}`]);
        if (values.some((value) => value.length > 0)) return false;
      } catch (error) {
        if ((error as { status?: number }).status !== 1) return false;
      }
    }
  }
  return true;
}

function candidateFsmonitorConfigSafe(root: string): boolean {
  const values = (key: string): readonly string[] | null => {
    try {
      return candidateGitZ(root, ["config", "--null", "--get-all", key]);
    } catch (error) {
      return (error as { status?: number }).status === 1 ? Object.freeze([]) : null;
    }
  };
  const configured = values("core.fsmonitor");
  const hookVersions = values("core.fsmonitorHookVersion");
  if (configured === null || hookVersions === null || hookVersions.length > 0) return false;
  return configured.every((value) => /^(?:false|no|off|0)$/iu.test(value.trim()));
}

/** Candidate visibility authority. No diff is trusted while Git can hide an
 * index entry or run an external clean/process driver for a tracked/relevant
 * path. Built-in text/eol/ident attributes remain eligible. */
function candidateGitMetadataSafe(root: string, relevantPaths: readonly string[]): boolean {
  try {
    if (!serialCandidateGitEnvironmentSafe()
      || !candidateReservedFilterConfigAbsent(root) || !candidateFsmonitorConfigSafe(root)) return false;
    const verbose = candidateGitZ(root, ["ls-files", "-v", "-z"]);
    const fsmonitor = candidateGitZ(root, ["ls-files", "-f", "-z"]);
    const validTaggedRecord = (record: string): boolean => record.length > 2 && record[1] === " ";
    if (verbose.some((record) => !validTaggedRecord(record)
      || record[0] === "S" || /[a-z]/u.test(record[0]))) return false;
    if (fsmonitor.some((record) => !validTaggedRecord(record) || /[a-z]/u.test(record[0]))) return false;
    const tracked = candidateGitZ(root, ["ls-files", "-z"]);
    const pathsToCheck = [...new Set([...tracked, ...relevantPaths])];
    if (pathsToCheck.length === 0) return true;
    const attributes = candidateGitZ(root, ["check-attr", "-z", "--stdin", "filter"], {
      input: `${pathsToCheck.join("\0")}\0`,
    });
    if (attributes.length !== pathsToCheck.length * 3) return false;
    for (let index = 0; index < attributes.length; index += 3) {
      const path = attributes[index];
      if (path !== pathsToCheck[index / 3] || attributes[index + 1] !== "filter"
        || (attributes[index + 2] !== "unspecified" && attributes[index + 2] !== "unset")) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function candidateScanChangedPaths(root: string, relevantPaths: readonly string[]): string[] | null {
  if (!candidateGitMetadataSafe(root, relevantPaths)) return null;
  try {
    const changed = [...new Set([
      ...candidateGitZ(root, [
        ...CANDIDATE_NEUTRAL_RESERVED_FILTERS,
        "diff", "--no-ext-diff", "--no-textconv", "--name-only", "-z", "--",
      ]),
      ...candidateGitZ(root, [
        "diff", "--no-ext-diff", "--no-textconv", "--cached", "--name-only", "-z", "--",
      ]),
      ...candidateGitZ(root, ["ls-files", "--others", "--exclude-standard", "-z", "--"]),
    ])].sort();
    return candidateGitMetadataSafe(root, relevantPaths) ? changed : null;
  } catch {
    return null;
  }
}

function candidateChangedPathsExactly(
  root: string,
  relevantPaths: readonly string[],
  expected: readonly string[],
): boolean {
  const changed = candidateScanChangedPaths(root, relevantPaths);
  return changed !== null && sameLines(changed, expected);
}

const CANDIDATE_REDACTED_GIT_PATH = "[redacted unsafe Git path]";

function candidateReportChangedPaths(paths: readonly string[]): readonly string[] {
  const safe = paths.map((path) => {
    if (path !== path.normalize("NFC")
      || /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\uFFFD]/u.test(path)
      || path.includes("\\")
      || isAbsolute(path)
      || path.split("/").some((part) => part.length === 0 || part === "." || part === "..")) {
      return CANDIDATE_REDACTED_GIT_PATH;
    }
    // Record renderers use inline-code delimiters. Remove the delimiter byte
    // while retaining a readable escaped spelling for otherwise safe names.
    return path.replace(/`/gu, "&#96;");
  });
  return Object.freeze([...new Set(safe)].slice(0, 100));
}

function candidateIndexBlobEntry(root: string, path: string, indexPath?: string): CandidateGitBlobEntry {
  const records = candidateGitZ(root, ["ls-files", "--stage", "-z", "--", `:(top,literal)${path}`], { indexPath });
  if (records.length === 0) return null;
  if (records.length !== 1) throw new Error("INVALID_CANDIDATE_INDEX_ENTRY");
  const match = /^(100644|100755) ([a-f0-9]{40}|[a-f0-9]{64}) 0\t(.+)$/u.exec(records[0]);
  if (!match || match[3] !== path) throw new Error("INVALID_CANDIDATE_INDEX_ENTRY");
  return Object.freeze({ mode: match[1] as "100644" | "100755", oid: match[2] });
}

function candidateHeadBlobEntry(root: string, head: string, path: string): CandidateGitBlobEntry {
  const records = candidateGitZ(root, ["ls-tree", "-z", head, "--", `:(top,literal)${path}`]);
  if (records.length === 0) return null;
  if (records.length !== 1) throw new Error("INVALID_CANDIDATE_TREE_ENTRY");
  const match = /^(100644|100755) blob ([a-f0-9]{40}|[a-f0-9]{64})\t(.+)$/u.exec(records[0]);
  if (!match || match[3] !== path) throw new Error("INVALID_CANDIDATE_TREE_ENTRY");
  return Object.freeze({ mode: match[1] as "100644" | "100755", oid: match[2] });
}

function candidateBundleMatchesGitBlobs(
  root: string,
  bundle: SerialCandidateBundleV1,
  entryForPath: (path: string) => CandidateGitBlobEntry,
): boolean {
  try {
    for (const expected of bundle.entries) {
      const actual = entryForPath(expected.projectRelativePath);
      if (expected.state === "deleted") {
        if (actual !== null || expected.gitBlobOid !== null || expected.gitMode !== null) return false;
        continue;
      }
      if (!actual || expected.gitBlobOid === null || expected.gitMode === null
        || actual.mode !== expected.gitMode
        || actual.oid !== expected.gitBlobOid) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function candidateBundleMatchesIndex(root: string, bundle: SerialCandidateBundleV1): boolean {
  return candidateBundleMatchesGitBlobs(root, bundle, (path) => candidateIndexBlobEntry(root, path));
}

function candidateBundleMatchesHead(root: string, head: string, bundle: SerialCandidateBundleV1): boolean {
  return candidateBundleMatchesGitBlobs(root, bundle, (path) => candidateHeadBlobEntry(root, head, path));
}

function currentSymbolicHead(root: string): string | null {
  try {
    const value = candidateGit(root, ["symbolic-ref", "--quiet", "HEAD"]);
    return /^refs\/heads\/[A-Za-z0-9][A-Za-z0-9._\/-]*$/u.test(value) ? value : null;
  } catch {
    return null;
  }
}

type CandidateOwnedRecordBlob = Readonly<{
  projectRelativePath: string;
  text: string;
  gitMode: "100644" | "100755";
}>;
type CandidateExpectedBlob = Readonly<{ mode: "100644" | "100755"; oid: string }> | null;
type CandidateOwnedRecordIndexAuthority = readonly Readonly<{
  projectRelativePath: string;
  startingEntry: CandidateGitBlobEntry;
  terminalMode: "100644" | "100755";
}>[];

function captureCandidateOwnedRecordIndexAuthority(
  root: string,
  taskNumber: number,
  ownedPaths: readonly string[],
): CandidateOwnedRecordIndexAuthority | null {
  try {
    const logRelative = rel(root, paths.log(root));
    const values = ownedPaths.map((projectRelativePath) => {
      const startingEntry = candidateIndexBlobEntry(root, projectRelativePath);
      if (projectRelativePath === logRelative ? startingEntry === null : startingEntry !== null) {
        throw new Error("INVALID_CANDIDATE_OWNED_RECORD_INDEX");
      }
      return Object.freeze({
        projectRelativePath,
        startingEntry,
        terminalMode: projectRelativePath === logRelative ? startingEntry!.mode : "100644" as const,
      });
    });
    if (values.length !== 3
      || !values.some((value) => value.projectRelativePath === rel(root, paths.brief(root, taskNumber)))
      || !values.some((value) => value.projectRelativePath === rel(root, paths.report(root, taskNumber)))
      || !values.some((value) => value.projectRelativePath === logRelative)) return null;
    return Object.freeze(values);
  } catch {
    return null;
  }
}

function candidateOwnedRecordIndexStillExact(
  root: string,
  authority: CandidateOwnedRecordIndexAuthority,
): boolean {
  try {
    return authority.every((value) => {
      const current = candidateIndexBlobEntry(root, value.projectRelativePath);
      return value.startingEntry === null
        ? current === null
        : current !== null && current.mode === value.startingEntry.mode && current.oid === value.startingEntry.oid;
    });
  } catch {
    return false;
  }
}

function candidateCoreFileModeEnabled(root: string): boolean | null {
  try {
    const value = candidateGit(root, ["config", "--bool", "--default=true", "core.fileMode"]);
    if (value === "true") return true;
    if (value === "false") return false;
    return null;
  } catch {
    return null;
  }
}

function candidateOwnedRecordWorktreeModesStillExact(
  root: string,
  authority: CandidateOwnedRecordIndexAuthority,
): boolean {
  const enforce = candidateCoreFileModeEnabled(root);
  if (enforce === null) return false;
  if (!enforce) return true;
  try {
    return authority.every((value) => {
      const absolute = resolve(root, ...value.projectRelativePath.split("/"));
      let info: ReturnType<typeof lstatSync>;
      try {
        info = lstatSync(absolute, { bigint: true });
      } catch (error) {
        return value.startingEntry === null && (error as NodeJS.ErrnoException).code === "ENOENT";
      }
      return info.isFile() && !info.isSymbolicLink() && info.nlink === 1n
        && ((Number(info.mode) & 0o111) !== 0) === (value.terminalMode === "100755");
    });
  } catch {
    return false;
  }
}

function candidateBundlePathWithRealParents(root: string, projectRelativePath: string): string | null {
  try {
    const parts = projectRelativePath.split("/");
    let cursor = root;
    for (const part of parts.slice(0, -1)) {
      cursor = join(cursor, part);
      const parent = lstatSync(cursor, { bigint: true });
      if (!parent.isDirectory() || parent.isSymbolicLink()) return null;
    }
    return resolve(root, ...parts);
  } catch {
    return null;
  }
}

function candidateBundleWorktreeBytesStillExact(root: string, bundle: SerialCandidateBundleV1): boolean {
  try {
    for (const entry of bundle.entries) {
      const absolute = candidateBundlePathWithRealParents(root, entry.projectRelativePath);
      if (absolute === null) return false;
      if (entry.state === "deleted") {
        try {
          lstatSync(absolute);
          return false;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") return false;
        }
        if (candidateBundlePathWithRealParents(root, entry.projectRelativePath) !== absolute) return false;
        continue;
      }
      if (entry.contentBase64 === null) return false;
      let descriptor: number | null = null;
      try {
        const namedBefore = lstatSync(absolute, { bigint: true });
        if (!namedBefore.isFile() || namedBefore.isSymbolicLink() || namedBefore.nlink !== 1n) return false;
        descriptor = openSync(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
        const before = fstatSync(descriptor, { bigint: true });
        if (!before.isFile() || before.dev !== namedBefore.dev || before.ino !== namedBefore.ino || before.nlink !== 1n) return false;
        const bytes = readFileSync(descriptor);
        const after = fstatSync(descriptor, { bigint: true });
        const namedAfter = lstatSync(absolute, { bigint: true });
        if (after.dev !== before.dev || after.ino !== before.ino || after.size !== before.size
          || after.mtimeNs !== before.mtimeNs || after.ctimeNs !== before.ctimeNs
          || namedAfter.dev !== after.dev || namedAfter.ino !== after.ino || namedAfter.size !== after.size
          || namedAfter.mtimeNs !== after.mtimeNs || namedAfter.ctimeNs !== after.ctimeNs
          || ((Number(after.mode) & 0o111) !== 0) !== entry.executable
          || !bytes.equals(Buffer.from(entry.contentBase64, "base64"))) return false;
        if (candidateBundlePathWithRealParents(root, entry.projectRelativePath) !== absolute) return false;
      } finally {
        if (descriptor !== null) closeSync(descriptor);
      }
    }
    return true;
  } catch {
    return false;
  }
}

function candidateOwnedRecordsStillExact(root: string, records: readonly CandidateOwnedRecordBlob[]): boolean {
  const enforceMode = candidateCoreFileModeEnabled(root);
  if (enforceMode === null) return false;
  try {
    return records.every((record) => {
      const absolute = resolve(root, ...record.projectRelativePath.split("/"));
      return candidateOwnedTextNoFollow(
        absolute,
        enforceMode ? record.gitMode === "100755" : undefined,
      ) === record.text;
    });
  } catch {
    return false;
  }
}

function candidateExpectedBlobsMatchTree(
  root: string,
  tree: string,
  expected: ReadonlyMap<string, CandidateExpectedBlob>,
): boolean {
  try {
    for (const [path, value] of expected) {
      const actual = candidateHeadBlobEntry(root, tree, path);
      if (value === null ? actual !== null
        : actual === null || actual.mode !== value.mode || actual.oid !== value.oid) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function candidateExpectedBlobsMatchIndex(
  root: string,
  expected: ReadonlyMap<string, CandidateExpectedBlob>,
): boolean {
  try {
    for (const [path, value] of expected) {
      const actual = candidateIndexBlobEntry(root, path);
      if (value === null ? actual !== null
        : actual === null || actual.mode !== value.mode || actual.oid !== value.oid) return false;
    }
    return true;
  } catch {
    return false;
  }
}

type CandidateBundleIndexCustody = readonly Readonly<{
  path: string;
  index: CandidateGitBlobEntry;
  base: CandidateGitBlobEntry;
}>[];

function sameCandidateGitBlob(left: CandidateGitBlobEntry, right: CandidateGitBlobEntry): boolean {
  return left === null
    ? right === null
    : right !== null && left.oid === right.oid && left.mode === right.mode;
}

function candidateBundleIndexCustody(bundle: SerialCandidateBundleV1): CandidateBundleIndexCustody | null {
  const values: Array<CandidateBundleIndexCustody[number]> = [];
  for (const entry of bundle.entries) {
    const index = entry.indexState === "absent"
      ? entry.indexBlobOid === null && entry.indexMode === null ? null : undefined
      : entry.indexBlobOid !== null && entry.indexMode !== null
        ? Object.freeze({ oid: entry.indexBlobOid, mode: entry.indexMode })
        : undefined;
    const base = entry.baseBlobOid === null && entry.baseMode === null
      ? null
      : entry.baseBlobOid !== null && entry.baseMode !== null
        ? Object.freeze({ oid: entry.baseBlobOid, mode: entry.baseMode })
        : undefined;
    const product = entry.state === "deleted"
      ? entry.gitBlobOid === null && entry.gitMode === null ? null : undefined
      : entry.gitBlobOid !== null && entry.gitMode !== null
        ? Object.freeze({ oid: entry.gitBlobOid, mode: entry.gitMode })
        : undefined;
    if (index === undefined || base === undefined || product === undefined
      || (entry.indexRelation === "base"
        ? !sameCandidateGitBlob(index, base)
        : !sameCandidateGitBlob(index, product))) return null;
    values.push(Object.freeze({ path: entry.projectRelativePath, index, base }));
  }
  return Object.freeze(values);
}

function candidateBundleIndexStateStillExact(root: string, bundle: SerialCandidateBundleV1): boolean {
  try {
    const custody = candidateBundleIndexCustody(bundle);
    return custody !== null && custody.every((entry) => sameCandidateGitBlob(
      candidateIndexBlobEntry(root, entry.path),
      entry.index,
    ));
  } catch {
    return false;
  }
}

function candidateStagedBundleEntriesExact(
  root: string,
  bundle: SerialCandidateBundleV1,
  stagedPaths: readonly string[],
): boolean {
  try {
    const custody = candidateBundleIndexCustody(bundle);
    if (custody === null || !candidateBundleIndexStateStillExact(root, bundle)) return false;
    const expectedStaged = custody
      .filter((entry) => !sameCandidateGitBlob(entry.index, entry.base))
      .map((entry) => entry.path)
      .sort();
    return sameLines(expectedStaged, [...stagedPaths].sort());
  } catch {
    return false;
  }
}

function candidateNoUnexpectedWorktreeChanges(
  root: string,
  ownedPaths: readonly string[],
  relevantPaths: readonly string[],
): boolean {
  if (!candidateGitMetadataSafe(root, relevantPaths)) return false;
  try {
    const exact = candidateGitZ(root, [
      ...CANDIDATE_NEUTRAL_RESERVED_FILTERS,
      "diff",
      "--no-ext-diff",
      "--no-textconv",
      "--name-only",
      "--no-renames",
      "-z",
      "--",
      ".",
      ...ownedPaths.map((path) => `:(top,literal,exclude)${path}`),
    ]).length === 0
      && candidateGitZ(root, ["ls-files", "--others", "--exclude-standard", "-z", "--"]).length === 0;
    return exact && candidateGitMetadataSafe(root, relevantPaths);
  } catch {
    return false;
  }
}

type CandidateBoundFileSnapshot = Readonly<{
  bytes: Buffer;
  dev: bigint;
  ino: bigint;
  nlink: bigint;
  mode: bigint;
  size: bigint;
  mtimeNs: bigint;
  ctimeNs: bigint;
}>;

type CandidateOpenLock = {
  descriptor: number;
  dev: bigint;
  ino: bigint;
  closed: boolean;
};

const CANDIDATE_INDEX_BYTE_LIMIT = 16 * 1024 * 1024;

function candidateReadBoundRegularFile(path: string): CandidateBoundFileSnapshot | null {
  let descriptor: number | null = null;
  try {
    const namedBefore = lstatSync(path, { bigint: true });
    if (!namedBefore.isFile() || namedBefore.isSymbolicLink() || namedBefore.nlink !== 1n) return null;
    descriptor = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const before = fstatSync(descriptor, { bigint: true });
    if (!before.isFile() || before.dev !== namedBefore.dev || before.ino !== namedBefore.ino
      || before.nlink !== 1n || before.size < 0n || before.size > BigInt(CANDIDATE_INDEX_BYTE_LIMIT)) return null;
    const byteLength = Number(before.size);
    if (!Number.isSafeInteger(byteLength)) return null;
    const bytes = Buffer.alloc(byteLength);
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(descriptor, bytes, offset, bytes.length - offset, offset);
      if (count === 0) return null;
      offset += count;
    }
    const after = fstatSync(descriptor, { bigint: true });
    const namedAfter = lstatSync(path, { bigint: true });
    if (!after.isFile() || after.dev !== before.dev || after.ino !== before.ino || after.nlink !== 1n
      || after.size !== before.size || after.mtimeNs !== before.mtimeNs || after.ctimeNs !== before.ctimeNs
      || namedAfter.dev !== after.dev || namedAfter.ino !== after.ino || namedAfter.nlink !== 1n
      || namedAfter.size !== after.size || namedAfter.mtimeNs !== after.mtimeNs
      || namedAfter.ctimeNs !== after.ctimeNs || namedAfter.mode !== after.mode) return null;
    return Object.freeze({
      bytes,
      dev: after.dev,
      ino: after.ino,
      nlink: after.nlink,
      mode: after.mode,
      size: after.size,
      mtimeNs: after.mtimeNs,
      ctimeNs: after.ctimeNs,
    });
  } catch {
    return null;
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
}

function candidateBoundFileStillExact(path: string, expected: CandidateBoundFileSnapshot): boolean {
  const current = candidateReadBoundRegularFile(path);
  return current !== null
    && current.dev === expected.dev
    && current.ino === expected.ino
    && current.nlink === expected.nlink
    && current.mode === expected.mode
    && current.size === expected.size
    && current.mtimeNs === expected.mtimeNs
    && current.ctimeNs === expected.ctimeNs
    && current.bytes.equals(expected.bytes);
}

function candidateCreateOpenLock(path: string, mode: number): CandidateOpenLock | null {
  let descriptor: number | null = null;
  try {
    descriptor = openSync(
      path,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0),
      mode,
    );
    // O_CREAT permissions are subject to the process umask. Git's real index
    // mode is part of candidate custody, so seed/restore lockfiles must be
    // forced back to its exact permission bits before they can be renamed.
    fchmodSync(descriptor, mode & 0o777);
    const opened = fstatSync(descriptor, { bigint: true });
    const named = lstatSync(path, { bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n || !named.isFile() || named.isSymbolicLink()
      || named.nlink !== 1n || named.dev !== opened.dev || named.ino !== opened.ino
      || (process.platform !== "win32" && Number(opened.mode & 0o777n) !== (mode & 0o777))) {
      const removeOwnLeaf = named.dev === opened.dev && named.ino === opened.ino;
      closeSync(descriptor);
      descriptor = null;
      if (removeOwnLeaf) {
        try {
          const rebound = lstatSync(path, { bigint: true });
          if (rebound.dev === opened.dev && rebound.ino === opened.ino) rmSync(path);
        } catch { /* never remove a replacement lock */ }
      }
      return null;
    }
    return { descriptor, dev: opened.dev, ino: opened.ino, closed: false };
  } catch {
    if (descriptor !== null) closeSync(descriptor);
    return null;
  }
}

function candidateForceBoundFileMode(path: string, mode: number): CandidateBoundFileSnapshot | null {
  const before = candidateReadBoundRegularFile(path);
  if (!before) return null;
  let descriptor: number | null = null;
  try {
    // Windows rejects fsync on a read-only descriptor. This is Cairn's own
    // temporary index, so open it read/write while retaining the same bound
    // inode checks before and after the mode/durability operation.
    descriptor = openSync(path, constants.O_RDWR | (constants.O_NOFOLLOW ?? 0));
    const opened = fstatSync(descriptor, { bigint: true });
    if (opened.dev !== before.dev || opened.ino !== before.ino || opened.nlink !== 1n) return null;
    fchmodSync(descriptor, mode & 0o777);
    fsyncSync(descriptor);
  } catch {
    return null;
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
  const after = candidateReadBoundRegularFile(path);
  return after && after.dev === before.dev && after.ino === before.ino
    && after.nlink === before.nlink && after.bytes.equals(before.bytes)
    && (process.platform === "win32" || Number(after.mode & 0o777n) === (mode & 0o777))
    ? after
    : null;
}

function candidateOpenLockStillBound(path: string, lock: CandidateOpenLock): boolean {
  if (lock.closed) return false;
  try {
    const opened = fstatSync(lock.descriptor, { bigint: true });
    const named = lstatSync(path, { bigint: true });
    return opened.isFile() && opened.nlink === 1n && named.isFile() && !named.isSymbolicLink()
      && named.nlink === 1n && opened.dev === lock.dev && opened.ino === lock.ino
      && named.dev === opened.dev && named.ino === opened.ino;
  } catch {
    return false;
  }
}

function candidateWriteOpenLock(path: string, lock: CandidateOpenLock, bytes: Buffer): boolean {
  try {
    if (!candidateOpenLockStillBound(path, lock)) return false;
    ftruncateSync(lock.descriptor, 0);
    let offset = 0;
    while (offset < bytes.length) {
      offset += writeSync(lock.descriptor, bytes, offset, bytes.length - offset, offset);
    }
    fsyncSync(lock.descriptor);
    const after = fstatSync(lock.descriptor, { bigint: true });
    return after.dev === lock.dev && after.ino === lock.ino && after.nlink === 1n
      && after.size === BigInt(bytes.length) && candidateOpenLockStillBound(path, lock);
  } catch {
    return false;
  }
}

function candidateReleaseOpenLock(path: string, lock: CandidateOpenLock | null): void {
  if (!lock || lock.closed) return;
  const remove = candidateOpenLockStillBound(path, lock);
  try { closeSync(lock.descriptor); } catch { /* best effort */ }
  lock.closed = true;
  if (remove) {
    try {
      const named = lstatSync(path, { bigint: true });
      if (named.dev === lock.dev && named.ino === lock.ino && named.nlink === 1n) rmSync(path);
    } catch { /* a failed/raced lock leaf is never followed or broadly removed */ }
  }
}

function candidateCommitOpenLock(path: string, target: string, lock: CandidateOpenLock): boolean {
  if (!candidateOpenLockStillBound(path, lock)) return false;
  try {
    fsyncSync(lock.descriptor);
    closeSync(lock.descriptor);
    lock.closed = true;
    const named = lstatSync(path, { bigint: true });
    if (named.dev !== lock.dev || named.ino !== lock.ino || named.nlink !== 1n
      || !named.isFile() || named.isSymbolicLink()) return false;
    renameSync(path, target);
    return true;
  } catch {
    try {
      const named = lstatSync(path, { bigint: true });
      if (named.dev === lock.dev && named.ino === lock.ino && named.nlink === 1n) rmSync(path);
    } catch { /* preserve any replacement */ }
    return false;
  }
}

/** Candidate-only exact commit. Legacy and Q4 keep `commitExactPaths` above
 * byte-for-byte. All fallible checks happen against the index and an inert
 * tree/commit object before one compare-and-swap ref update. `commit-tree`
 * bypasses commit hooks; the explicit hooksPath also disables index/reference
 * hooks. After the successful CAS there is no read that can downgrade a DONE
 * commit into a later STOPPED workspace record. */
function commitCandidateExactPaths(
  root: string,
  start: GitSnapshot,
  expected: readonly string[],
  taskNumber: number,
  bundle: SerialCandidateBundleV1,
  startHeadRef: string,
  ownedRecords: readonly CandidateOwnedRecordBlob[],
  terminalActionId?: string,
): RecordCommit | null {
  if (expected.length === 0) return null;
  const expectedSorted = [...expected].sort();
  const noHooks = ["-c", "core.hooksPath=/dev/null"];
  let originalIndexFile: CandidateBoundFileSnapshot | null = null;
  let installedIndexFile: CandidateBoundFileSnapshot | null = null;
  let installedIndexIdentity: Readonly<{ dev: bigint; ino: bigint; mode: bigint; bytes: Buffer }> | null = null;
  let candidateIndexBytes: Buffer | null = null;
  let indexPath: string | null = null;
  let indexLockPath: string | null = null;
  let heldIndexLock: CandidateOpenLock | null = null;
  let candidateIndexOwned = false;
  let committed = false;
  let temporaryIndex: string | null = null;
  const rollbackIndex = (): void => {
    try {
      if (!committed && candidateIndexOwned && indexPath && indexLockPath && heldIndexLock
        && originalIndexFile && installedIndexIdentity && candidateIndexBytes && temporaryIndex) {
        const current = candidateReadBoundRegularFile(indexPath);
        if (!current || current.dev !== installedIndexIdentity.dev || current.ino !== installedIndexIdentity.ino
          || current.mode !== installedIndexIdentity.mode || !current.bytes.equals(installedIndexIdentity.bytes)) return;
        const restoreLockPath = `${temporaryIndex}.lock`;
        const restoreLock = candidateCreateOpenLock(
          restoreLockPath,
          Number(originalIndexFile.mode & 0o777n),
        );
        if (restoreLock) {
          try {
            if (candidateWriteOpenLock(restoreLockPath, restoreLock, originalIndexFile.bytes)
              && candidateCommitOpenLock(restoreLockPath, temporaryIndex, restoreLock)) {
              const restored = candidateReadBoundRegularFile(temporaryIndex);
              if (restored && restored.mode === originalIndexFile.mode
                && restored.bytes.equals(originalIndexFile.bytes)) {
                renameSync(temporaryIndex, indexPath);
                const installedRestore = candidateReadBoundRegularFile(indexPath);
                if (installedRestore && installedRestore.mode === originalIndexFile.mode
                  && installedRestore.bytes.equals(originalIndexFile.bytes)) candidateIndexOwned = false;
              }
            }
          } finally {
            candidateReleaseOpenLock(restoreLockPath, restoreLock);
          }
        }
      }
    } catch {
      // Restore only through the bound lock while the installed bytes and inode
      // remain ours. Any concurrent replacement retains its own authority.
    } finally {
      if (indexLockPath) candidateReleaseOpenLock(indexLockPath, heldIndexLock);
      heldIndexLock = null;
    }
  };
  try {
    const bundlePaths = bundle.entries.map((entry) => entry.projectRelativePath);
    const ownedPaths = ownedRecords.map((record) => record.projectRelativePath);
    if (new Set(expectedSorted).size !== expectedSorted.length
      || new Set([...bundlePaths, ...ownedPaths]).size !== expectedSorted.length
      || !sameLines([...bundlePaths, ...ownedPaths].sort(), expectedSorted)) {
      return null;
    }
    const rawIndexPath = candidateGit(root, ["rev-parse", "--git-path", "index"]);
    indexPath = isAbsolute(rawIndexPath) ? resolve(rawIndexPath) : resolve(root, rawIndexPath);
    indexLockPath = `${indexPath}.lock`;
    originalIndexFile = candidateReadBoundRegularFile(indexPath);
    if (!originalIndexFile) {
      return null;
    }
    const stagedBefore = candidateGitZ(root, [
      "diff", "--no-ext-diff", "--no-textconv", "--cached", "--name-only", "--no-renames", "-z", start.head, "--",
    ]).sort();
    const gitDir = resolve(root, candidateGit(root, ["rev-parse", "--git-dir"]));
    temporaryIndex = join(gitDir, `cairn-candidate-${randomUUID()}.index`);
    const initialChecks = Object.freeze({
      paths: candidateChangedPathsExactly(root, expectedSorted, expectedSorted),
      bundleBytes: candidateBundleWorktreeBytesStillExact(root, bundle),
      recordBytes: candidateOwnedRecordsStillExact(root, ownedRecords),
      stagedBundle: candidateStagedBundleEntriesExact(root, bundle, stagedBefore),
      head: candidateGit(root, ["rev-parse", "HEAD"]) === start.head,
      headRef: currentSymbolicHead(root) === startHeadRef,
    });
    if (Object.values(initialChecks).some((value) => !value)) {
      return null;
    }

    const temporarySeedLockPath = `${temporaryIndex}.lock`;
    const temporarySeedLock = candidateCreateOpenLock(
      temporarySeedLockPath,
      Number(originalIndexFile.mode & 0o777n),
    );
    if (!temporarySeedLock) {
      return null;
    }
    try {
      if (!candidateWriteOpenLock(temporarySeedLockPath, temporarySeedLock, originalIndexFile.bytes)
        || !candidateCommitOpenLock(temporarySeedLockPath, temporaryIndex, temporarySeedLock)) {
        return null;
      }
    } finally {
      candidateReleaseOpenLock(temporarySeedLockPath, temporarySeedLock);
    }
    const expectedBlobs = new Map<string, CandidateExpectedBlob>();
    for (const entry of bundle.entries) {
      if (entry.state === "deleted") {
        if (entry.gitBlobOid !== null || entry.gitMode !== null) return null;
        candidateGit(root, [...noHooks, "update-index", "--force-remove", "--", entry.projectRelativePath], {
          indexPath: temporaryIndex,
        });
        expectedBlobs.set(entry.projectRelativePath, null);
      } else {
        if (entry.gitBlobOid === null || entry.gitMode === null) return null;
        candidateGit(root, [
          ...noHooks,
          "update-index",
          "--add",
          "--cacheinfo",
          `${entry.gitMode},${entry.gitBlobOid},${entry.projectRelativePath}`,
        ], { indexPath: temporaryIndex });
        expectedBlobs.set(entry.projectRelativePath, Object.freeze({ mode: entry.gitMode, oid: entry.gitBlobOid }));
      }
    }
    for (const record of ownedRecords) {
      const oid = candidateGit(root, [
        ...noHooks,
        ...CANDIDATE_NEUTRAL_RESERVED_FILTERS,
        "hash-object",
        "-w",
        `--path=${record.projectRelativePath}`,
        "--stdin",
      ], {
        input: Buffer.from(record.text, "utf8"),
      });
      if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(oid)) return null;
      candidateGit(root, [
        ...noHooks,
        "update-index",
        "--add",
        "--cacheinfo",
        `${record.gitMode},${oid},${record.projectRelativePath}`,
      ], { indexPath: temporaryIndex });
      expectedBlobs.set(record.projectRelativePath, Object.freeze({ mode: record.gitMode, oid }));
    }
    if (!candidateGitMetadataSafe(root, expectedSorted)) {
      return null;
    }
    const tree = candidateGit(root, [...noHooks, "write-tree"], { indexPath: temporaryIndex });
    const treePaths = candidateGitZ(root, [
      "diff", "--no-ext-diff", "--no-textconv", "--name-only", "--no-renames", "-z", start.head, tree, "--",
    ]).sort();
    const treeChecks = Object.freeze({
      tree: /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(tree),
      paths: sameLines(treePaths, expectedSorted),
      bundleTree: candidateBundleMatchesHead(root, tree, bundle),
      recordsTree: candidateExpectedBlobsMatchTree(root, tree, expectedBlobs),
      changedPaths: candidateChangedPathsExactly(root, expectedSorted, expectedSorted),
      bundleBytes: candidateBundleWorktreeBytesStillExact(root, bundle),
      recordBytes: candidateOwnedRecordsStillExact(root, ownedRecords),
      head: candidateGit(root, ["rev-parse", "HEAD"]) === start.head,
      headRef: currentSymbolicHead(root) === startHeadRef,
    });
    if (Object.values(treeChecks).some((value) => !value)) {
      return null;
    }

    const candidateIndexFile = candidateForceBoundFileMode(
      temporaryIndex,
      Number(originalIndexFile.mode & 0o777n),
    );
    if (!candidateIndexFile || !originalIndexFile || !indexPath || !indexLockPath) {
      return null;
    }
    candidateIndexBytes = candidateIndexFile.bytes;
    heldIndexLock = candidateCreateOpenLock(indexLockPath, Number(originalIndexFile.mode & 0o777n));
    if (!heldIndexLock) {
      return null;
    }
    if (!candidateBoundFileStillExact(indexPath, originalIndexFile)
      || !candidateBoundFileStillExact(temporaryIndex, candidateIndexFile)) {
      return null;
    }
    renameSync(temporaryIndex, indexPath);
    installedIndexIdentity = Object.freeze({
      dev: candidateIndexFile.dev,
      ino: candidateIndexFile.ino,
      mode: candidateIndexFile.mode,
      bytes: candidateIndexBytes,
    });
    candidateIndexOwned = true;
    installedIndexFile = candidateReadBoundRegularFile(indexPath);
    if (!installedIndexFile || installedIndexFile.dev !== candidateIndexFile.dev
      || installedIndexFile.ino !== candidateIndexFile.ino
      || installedIndexFile.mode !== originalIndexFile.mode
      || !installedIndexFile.bytes.equals(candidateIndexBytes)) {
      return null;
    }
    const staged = candidateGitZ(root, [
      "diff", "--no-ext-diff", "--no-textconv", "--cached", "--name-only", "--no-renames", "-z", start.head, "--",
    ]).sort();
    const installedChecks = Object.freeze({
      staged: sameLines(staged, expectedSorted),
      worktree: candidateNoUnexpectedWorktreeChanges(root, ownedPaths, expectedSorted),
      bundleIndex: candidateBundleMatchesIndex(root, bundle),
      recordsIndex: candidateExpectedBlobsMatchIndex(root, expectedBlobs),
      bundleBytes: candidateBundleWorktreeBytesStillExact(root, bundle),
      recordBytes: candidateOwnedRecordsStillExact(root, ownedRecords),
      indexBytes: candidateBoundFileStillExact(indexPath, installedIndexFile),
      head: candidateGit(root, ["rev-parse", "HEAD"]) === start.head,
      headRef: currentSymbolicHead(root) === startHeadRef,
    });
    if (Object.values(installedChecks).some((value) => !value)) {
      return null;
    }

    const message = candidateTerminalCommitMessage(taskNumber, terminalActionId);
    const commit = candidateGit(
      root,
      [...noHooks, "commit-tree", tree, "-p", start.head, "-m", message],
      { commitIdentity: true },
    );
    const preCasChecks = Object.freeze({
      commit: /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(commit),
      tree: candidateGit(root, ["rev-parse", `${commit}^{tree}`]) === tree,
      worktree: candidateNoUnexpectedWorktreeChanges(root, ownedPaths, expectedSorted),
      bundleBytes: candidateBundleWorktreeBytesStillExact(root, bundle),
      recordBytes: candidateOwnedRecordsStillExact(root, ownedRecords),
      indexBytes: candidateBoundFileStillExact(indexPath, installedIndexFile),
      head: candidateGit(root, ["rev-parse", "HEAD"]) === start.head,
      headRef: currentSymbolicHead(root) === startHeadRef,
    });
    if (Object.values(preCasChecks).some((value) => !value)) {
      return null;
    }
    // The last symbolic-ref check rejects observable branch drift. The CAS
    // intentionally targets HEAD: if a different branch at the identical base
    // OID wins only the final instant, Git applies the exact verified tree to
    // the branch actually current, matching normal `git commit` semantics. Q6
    // candidate custody binds the base OID/content, not a branch-name promise.
    candidateGit(root, [...noHooks, "update-ref", "HEAD", commit, start.head]);
    committed = true;
    return {
      status: "created",
      reason: "One exact-path commit contains the candidate product changes and terminal records.",
      hash: commit,
    };
  } catch {
    rollbackIndex();
    return null;
  } finally {
    rollbackIndex();
    if (temporaryIndex) {
      try { rmSync(temporaryIndex, { force: true }); } catch { /* unreachable temporary index only */ }
      try { rmSync(`${temporaryIndex}.lock`, { force: true }); } catch { /* failed Git child may leave its lock */ }
    }
  }
}

function candidateTerminalCommitMessage(taskNumber: number, terminalActionId?: string): string {
  const subject = `Task ${pad(taskNumber)}: complete verified worker task`;
  return terminalActionId === undefined
    ? subject
    : `${subject}\n\nCairn-Terminal-Action: ${terminalActionId}`;
}

function freezeContract(contract: AdapterTaskContract): AdapterTaskContract {
  Object.freeze(contract.route);
  Object.freeze(contract.protectedGit);
  Object.freeze(contract.ownedRecords);
  Object.freeze(contract.checks);
  if (contract.version === "cairn-serial-task/v4") Object.freeze(contract.envelopeChecks);
  Object.freeze(contract.stopConditions);
  return Object.freeze(contract);
}

function verifyProtected(root: string, start: GitSnapshot, owned: ReadonlySet<string>): boolean {
  // The same phantom filter as the start snapshot, or a stat-only difference
  // present since the start would read as a protected-work change.
  const current = statusLines(root);
  const currentOther = statusWithoutOwned(current, owned);
  const startOther = statusWithoutOwned(start.status, owned);
  const head = git(root, ["rev-parse", "HEAD"]);
  return head === start.head && sameLines(currentOther, startOther);
}

function recordCommit(root: string, taskNumber: number, start: GitSnapshot, owned: string[], requested: boolean): RecordCommit {
  if (!requested) return { status: "skipped", reason: "Automatic record commit was not requested." };
  if (start.staged.length > 0) return { status: "skipped", reason: "Existing staged work is protected." };
  const logRelative = rel(root, paths.log(root));
  if (start.status.some((entry) => entry.slice(3).replace(/\\/g, "/") === logRelative)) {
    return { status: "skipped", reason: "The work log already had protected changes." };
  }
  try {
    git(root, ["add", "--", ...owned]);
    const staged = lines(git(root, ["diff", "--cached", "--name-only"]));
    if (!sameLines([...staged].sort(), [...owned].sort())) {
      return { status: "skipped", reason: "Exact staged-path isolation could not be proved." };
    }
    git(root, ["commit", "-m", `Task ${pad(taskNumber)}: record offline serial demonstration`]);
    return { status: "created", reason: "Only the three named task records were committed.", hash: git(root, ["rev-parse", "HEAD"]) };
  } catch {
    return { status: "skipped", reason: "Git could not create the exact record commit; the records were retained." };
  }
}

function writeClosedRecords(
  root: string,
  contract: AdapterTaskContract,
  demo: boolean,
  disposition: "DONE" | "STOPPED",
  reason: SerialStopReason | null,
  start: GitSnapshot,
  commitRequested: boolean,
  processEvidence?: Record<string, number>,
  processFailure?: ProcessFailureNote,
  orphanRisk = false,
  candidateFilesChanged?: readonly string[],
  candidateProtectedIntact?: boolean,
): { reportText: string; row: LogRow; verified: boolean } {
  let report: string;
  let row: LogRow;
  if (contract.version === "cairn-serial-task/v4") {
    const taskSpecRunRecord = composeBoundRunRecord(contract, disposition, reason, null, Object.freeze([]));
    if (!taskSpecRunRecord) throw new Error("INVALID_TASK_SPEC_RUN_RECORD");
    const input: ComposedRecordInput = {
      taskNumber: contract.taskNumber,
      route: contract.route,
      ...acceptedRequestForRecord(contract),
      disposition,
      stopReason: reason,
      claims: null,
      filesChanged: candidateFilesChanged ?? changedSetForRecord(root),
      protectedIntact: candidateProtectedIntact ?? verifyProtected(root, start, new Set(contract.ownedRecords)),
      commit: null,
      evidenceSummary: processEvidence ? boundedEvidenceSummary(processEvidence) : null,
      processFailure: processFailure ?? null,
      paidCallStarted: paidCallAlreadyStarted(demo, reason, processFailure),
      taskSpecRunRecord,
      recordRecovery: null,
    };
    report = composeWorkerReport(input);
    row = {
      task: pad(contract.taskNumber),
      date: new Date().toISOString().slice(0, 10),
      lane: "Standard",
      mode: "Applied",
      outcome: disposition,
      decision: disposition === "DONE" ? "completed" : "stopped",
      summary: composeWorkerRowSummary(input),
      moved: "NO",
    };
  } else {
    report = reportText(contract, demo, disposition, reason, commitRequested, processEvidence, processFailure, orphanRisk);
    row = rowFor(contract, demo, disposition, reason);
  }
  const candidateOwnedWrite = candidateFilesChanged !== undefined;
  if (candidateOwnedWrite) {
    candidateWriteOwnedTextNoFollow(paths.report(root, contract.taskNumber), report, null);
    candidateWriteOwnedTextNoFollow(paths.log(root), start.logText + expectedLogLine(row), start.logText);
  } else {
    writeFileSync(paths.report(root, contract.taskNumber), report, { encoding: "utf8", flag: "wx" });
    appendLogRow(root, row);
  }
  const actualLog = candidateOwnedWrite
    ? candidateOwnedTextNoFollow(paths.log(root)) ?? ""
    : readFileSync(paths.log(root), "utf8");
  const checks = {
    brief: (candidateOwnedWrite
      ? candidateOwnedTextNoFollow(paths.brief(root, contract.taskNumber))
      : readFileSync(paths.brief(root, contract.taskNumber), "utf8")) === briefText(contract, demo),
    report: (candidateOwnedWrite
      ? candidateOwnedTextNoFollow(paths.report(root, contract.taskNumber))
      : readFileSync(paths.report(root, contract.taskNumber), "utf8")) === report,
    log: actualLog === start.logText + expectedLogLine(row),
    row: candidateOwnedWrite
      || parseLog(root).filter((item) => item.task === pad(contract.taskNumber)).length === 1,
  };
  const verified = checks.brief && checks.report && checks.log && checks.row;
  return { reportText: report, row, verified };
}

function writeSafetyRecordsWhenUnclaimed(
  root: string,
  contract: AdapterTaskContract,
  demo: boolean,
  reason: SerialStopReason,
  start: GitSnapshot,
  commitRequested: boolean,
  processEvidence?: Record<string, number>,
  processFailure?: ProcessFailureNote,
  orphanRisk = false,
  candidateFilesChanged?: readonly string[],
  candidateProtectedIntact?: boolean,
): { reportText: string; row: LogRow; verified: boolean } | null {
  if (candidateFilesChanged !== undefined) {
    if (candidateOwnedTextNoFollow(paths.report(root, contract.taskNumber)) !== null) return null;
    if (candidateOwnedTextNoFollow(paths.log(root)) !== start.logText) return null;
  } else {
    if (existsSync(paths.report(root, contract.taskNumber))) return null;
    if (readFileSync(paths.log(root), "utf8") !== start.logText) return null;
  }
  return writeClosedRecords(
    root, contract, demo, "STOPPED", reason, start, commitRequested,
    processEvidence, processFailure, orphanRisk, candidateFilesChanged, candidateProtectedIntact,
  );
}

function replaceDoneRecordsWithStopped(
  root: string,
  contract: AdapterTaskContract,
  demo: boolean,
  start: GitSnapshot,
  commitRequested: boolean,
  done: { reportText: string; row: LogRow },
  reason: SerialStopReason = "RECORD_VERIFICATION_FAILED",
  processEvidence?: Record<string, number>,
  taskSpecEvidence?: Readonly<{
    claims: TaskSpecWorkerClaims | null;
    attestations: readonly AdapterCommandAttestationV1[];
  }>,
  candidateCustody?: SerialCandidateReportCustody,
  candidateFilesChanged?: readonly string[],
  candidateProtectedIntact?: boolean,
  terminalAction?: SerialCandidateTerminalActionCustody,
  recordDate?: string,
): { reportText: string; row: LogRow; verified: boolean } | null {
  const reportPath = paths.report(root, contract.taskNumber);
  const candidateOwnedWrite = candidateCustody !== undefined;
  const currentReport = candidateOwnedWrite
    ? candidateOwnedTextNoFollow(reportPath)
    : readFileSync(reportPath, "utf8");
  const currentLog = candidateOwnedWrite
    ? candidateOwnedTextNoFollow(paths.log(root))
    : readFileSync(paths.log(root), "utf8");
  if (currentReport !== done.reportText || currentLog !== start.logText + expectedLogLine(done.row)) {
    return null;
  }

  let stoppedReport: string;
  let stoppedRow: LogRow;
  if (contract.version === "cairn-serial-task/v4") {
    const taskSpecRunRecord = composeBoundRunRecord(
      contract,
      "STOPPED",
      reason,
      taskSpecEvidence?.claims ?? null,
      taskSpecEvidence?.attestations ?? Object.freeze([]),
    );
    if (!taskSpecRunRecord) return null;
    const input: ComposedRecordInput = {
      taskNumber: contract.taskNumber,
      route: contract.route,
      ...acceptedRequestForRecord(contract),
      disposition: "STOPPED",
      stopReason: reason,
      claims: null,
      filesChanged: candidateFilesChanged ?? changedSetForRecord(root),
      protectedIntact: candidateProtectedIntact ?? verifyProtected(root, start, new Set(contract.ownedRecords)),
      commit: null,
      evidenceSummary: processEvidence ? boundedEvidenceSummary(processEvidence) : null,
      processFailure: null,
      paidCallStarted: true,
      taskSpecRunRecord,
      recordRecovery: null,
    };
    stoppedReport = reportWithCandidateCustody(
      composeWorkerReport(input),
      "STOPPED",
      candidateCustody,
      terminalAction,
    );
    stoppedRow = {
      task: pad(contract.taskNumber),
      date: recordDate ?? new Date().toISOString().slice(0, 10),
      lane: "Standard",
      mode: "Applied",
      outcome: "STOPPED",
      decision: "stopped",
      summary: composeWorkerRowSummary(input),
      moved: taskSpecRunRecord.workerClaims?.milestone ?? "NO",
    };
  } else {
    stoppedReport = reportText(contract, demo, "STOPPED", reason, commitRequested, processEvidence);
    stoppedRow = rowFor(contract, demo, "STOPPED", reason);
  }
  if (candidateOwnedWrite) {
    candidateWriteOwnedTextNoFollow(reportPath, stoppedReport, done.reportText);
    candidateWriteOwnedTextNoFollow(
      paths.log(root),
      start.logText + expectedLogLine(stoppedRow),
      start.logText + expectedLogLine(done.row),
    );
  } else {
    writeFileSync(reportPath, stoppedReport, "utf8");
    writeFileSync(paths.log(root), start.logText + expectedLogLine(stoppedRow), "utf8");
  }

  const verified = (candidateOwnedWrite
    ? candidateOwnedTextNoFollow(reportPath) === stoppedReport
      && candidateOwnedTextNoFollow(paths.log(root)) === start.logText + expectedLogLine(stoppedRow)
    : readFileSync(reportPath, "utf8") === stoppedReport
      && readFileSync(paths.log(root), "utf8") === start.logText + expectedLogLine(stoppedRow))
    && (candidateOwnedWrite
      || parseLog(root).filter((item) => item.task === pad(contract.taskNumber) && item.outcome === "STOPPED").length === 1);
  return { reportText: stoppedReport, row: stoppedRow, verified };
}

/**
 * Task 058, corrected by Task 059: the throw-site log restore — the catch-path
 * residual Task 052 left open. A `RECORD_VERIFICATION_FAILED` throw out of
 * `runSerialTask` returns no result, so the run is must-inspect; the one thing
 * that must not survive it is a row in Cairn's own append-only work log that
 * does not describe a run that finished — a worker-forged row, or a DONE row
 * whose honest STOPPED rewrite failed.
 *
 * Why the task-start snapshot is the right state to write back is NOT that no
 * row written during the run passed its byte-back check: at the two
 * `replaceDoneRecordsWithStopped` sites below a DONE row demonstrably did pass
 * it. Verified-as-written is not verified-as-true. Those rows say DONE, and the
 * run they describe threw instead of completing, so the DONE row — and the stone
 * it would earn — must not stand. The last log state that is both Cairn's own
 * and still true of this run is therefore the task-start snapshot, written back
 * with the same mechanics the 052 owned-records gate uses.
 *
 * Only Cairn's OWN record is restored: the worker's product-file changes, its
 * report, and its brief stay retained in the workspace for inspection. Restoring
 * a log an owner edited mid-run discards that edit; LOG.md is committed, so it
 * is recoverable from Git (see the Task 059 report).
 *
 * Like every other record write in this file, the restore is read back. It
 * returns whether the restore took, so the caller can say so in the thrown
 * message; a false return NEVER suppresses the throw.
 */
function restoreLogBeforeThrow(root: string, start: GitSnapshot): boolean {
  try {
    const logPath = paths.log(root);
    if (existsSync(logPath) && readFileSync(logPath, "utf8") === start.logText) return true;
    writeFileSync(logPath, start.logText, "utf8");
    return readFileSync(logPath, "utf8") === start.logText;
  } catch {
    // The log could not be restored. The throw still forces inspection, and the
    // caller appends the unrestored-log clause so the owner is told why.
    return false;
  }
}

/** Q6-only recovery never follows a replaced LOG leaf or linked parent. */
function restoreCandidateLogBeforeThrow(root: string, start: GitSnapshot): boolean {
  try {
    let cursor = root;
    for (const part of ["docs", "ai-work"]) {
      cursor = join(cursor, part);
      const parent = lstatSync(cursor, { bigint: true });
      if (!parent.isDirectory() || parent.isSymbolicLink()) return false;
    }
    const logPath = paths.log(root);
    if (candidateOwnedTextNoFollow(logPath) === start.logText) return true;
    candidateWriteOwnedTextNoFollow(logPath, start.logText, undefined);
    return candidateOwnedTextNoFollow(logPath) === start.logText;
  } catch {
    return false;
  }
}

/**
 * Task 059: one `RECORD_VERIFICATION_FAILED` message, plus a plain clause when
 * the throw-site log restore did not take. Silence would let an unrestorable log
 * read exactly like a restored one.
 */
function recordVerificationFailed(detail: string, restored: boolean): Error {
  const unrestored = " The work log could not be restored and may carry rows Cairn did not write.";
  return new Error(`RECORD_VERIFICATION_FAILED: ${detail}${restored ? "" : unrestored}`);
}

interface CandidateCustodyObservation {
  custody: SerialCandidateReportCustody;
  workspaceExact: boolean;
  ignoredExact: boolean;
}

function composeCandidateCustodyObservation(
  candidate: SerialCandidateV1,
  availability: "available" | "spent" | "unavailable" | null,
  workspaceExact: boolean,
  ignoredExact: boolean,
): CandidateCustodyObservation {
  const repairEligibility = availability === "spent"
    ? "spent" as const
    : !workspaceExact
      ? "unavailable — candidate workspace no longer matches captured bundle" as const
      : availability === "unavailable" || !ignoredExact
        ? "unavailable — ignored write set could not be proven empty" as const
        : "available" as const;
  const custody = {
    runId: candidate.runId,
    round: candidate.round,
    taskSpecSha256: candidate.taskSpecSha256,
    evidencePlanSha256: candidate.evidencePlanSha256,
    candidateSha256: candidate.candidateSha256,
    bundleSha256: candidate.bundleSha256,
    evidenceStateSha256: candidate.evidenceStateSha256,
    repairEligibility,
  };
  return Object.freeze({ custody: Object.freeze(custody), workspaceExact, ignoredExact });
}

function observeCandidateCustody(root: string, candidate: SerialCandidateV1): CandidateCustodyObservation {
  const availability = serialCandidateRepairAvailability(candidate);
  let workspaceExact = false;
  let ignoredExact = false;
  try {
    workspaceExact = serialCandidateWorkspaceStillExact(root, candidate);
    ignoredExact = captureSerialCandidateIgnoredBoundary(root) !== null;
  } catch { /* the fixed redacted unavailable wording below remains truthful */ }
  return composeCandidateCustodyObservation(candidate, availability, workspaceExact, ignoredExact);
}

function candidateCustody(root: string, candidate: SerialCandidateV1): SerialCandidateReportCustody {
  return observeCandidateCustody(root, candidate).custody;
}

function releaseOpenCandidate(runId: string, context: OpenSerialCandidateContext): void {
  if (context.released) return;
  context.released = true;
  if (openSerialCandidates.get(runId) === context) openSerialCandidates.delete(runId);
  context.lock.release();
  activeRoots.delete(context.projectRoot);
}

function openContextForCandidate(value: unknown): Readonly<{
  candidate: SerialCandidateV1;
  context: OpenSerialCandidateContext;
}> | null {
  if (!isCurrentSerialCandidate(value)) return null;
  const candidate = value;
  const context = openSerialCandidates.get(candidate.runId);
  if (!context || context.released || serialCandidateTaskSpecAuthority(candidate) !== context.authority
    || serialCandidateLineageIdentity(candidate) !== context.lineageIdentity
    || candidate.taskNumber !== context.contract.taskNumber || candidate.requestSha256 !== context.contract.requestSha256
    || candidate.taskSpecSha256 !== context.contract.taskSpecSha256
    || candidate.evidencePlanSha256 !== context.contract.evidencePlanSha256
    || candidate.bundle.baseHead !== context.start.head || candidate.projectRootSha256 !== candidate.bundle.projectRootSha256
    || serialCandidateSha256(candidate) !== candidate.candidateSha256
    || serialCandidateBundleSha256(candidate.bundle) !== candidate.bundleSha256) return null;
  return Object.freeze({ candidate, context });
}

/** Branded, read-only verifier projection for Main's policy-context mint. It
 * never upgrades worker claims: only exact plan/attestation pairs become
 * CriterionResult rows. */
export function composeSerialCandidatePolicyEvidence(value: unknown): SerialCandidatePolicyEvidenceV1 | null {
  const open = openContextForCandidate(value);
  if (!open || open.context.interruptedRepairStopOnly) return null;
  const { candidate, context } = open;
  const byCriterion = new Map(context.attestations.map((row) => [row.criterionId, row]));
  const criterionResults: CriterionResultV1[] = [];
  const checkEvidence: CriticCheckEvidenceV1[] = [];
  const artifactIds = new Set<string>();
  for (const criterion of context.authority.taskSpec.quality.acceptanceChecks) {
    if (criterion.judge !== "cairn") continue;
    const procedure = context.authority.evidencePlan.procedures.find((row) => row.criterionId === criterion.id);
    if (!procedure) return null;
    let status: CriterionResultV1["status"] = "cant-tell";
    let source: CriterionResultV1["source"] = "cairn-verifier";
    let evidenceRefs: readonly string[] = Object.freeze([]);
    if (procedure.kind === "adapter-command-attestation" && procedure.command) {
      const attestation = byCriterion.get(criterion.id);
      if (attestation && attestation.taskSpecSha256 === candidate.taskSpecSha256
        && attestation.evidencePlanSha256 === candidate.evidencePlanSha256
        && attestation.commandSha256 === procedure.command.sha256) {
        status = procedure.command.expectedExitCodes.includes(attestation.exitCode) ? "met" : "not-met";
        source = "adapter-execution";
        evidenceRefs = Object.freeze([...procedure.artifactIds]);
      }
    }
    for (const id of evidenceRefs) artifactIds.add(id);
    criterionResults.push(Object.freeze({
      criterionId: criterion.id,
      candidateSha256: candidate.candidateSha256,
      status,
      source,
      evidenceRefs,
      evidencePlanSha256: candidate.evidencePlanSha256,
      resolutionSha256: null,
    }));
    checkEvidence.push(Object.freeze({
      id: `evidence-${criterion.id}`,
      criterionId: criterion.id,
      status,
      source: source === "adapter-execution" ? "adapter-execution" : "cairn-verifier",
      evidenceRefs,
    }));
  }
  const withoutSha = Object.freeze({
    version: SERIAL_CANDIDATE_POLICY_EVIDENCE_VERSION,
    projectHash: candidate.projectRootSha256,
    runId: candidate.runId,
    round: candidate.round,
    taskSpecSha256: candidate.taskSpecSha256,
    evidencePlanSha256: candidate.evidencePlanSha256,
    candidateSha256: candidate.candidateSha256,
    bundleSha256: candidate.bundleSha256,
    criterionResults: Object.freeze(criterionResults),
    checkEvidence: Object.freeze(checkEvidence),
    artifactIds: Object.freeze([...artifactIds]),
  }) as Omit<SerialCandidatePolicyEvidenceV1, "policyEvidenceSha256">;
  const projection = Object.freeze({
    ...withoutSha,
    policyEvidenceSha256: pendingSha256(JSON.stringify(withoutSha)),
  }) as SerialCandidatePolicyEvidenceV1;
  serialCandidatePolicyEvidenceBrand.add(projection);
  return projection;
}

function pendingCandidateProjection(candidate: SerialCandidateV1): Readonly<Record<string, unknown>> {
  return Object.freeze({
    version: candidate.version,
    runId: candidate.runId,
    generation: candidate.generation,
    taskNumber: candidate.taskNumber,
    requestSha256: candidate.requestSha256,
    projectRootSha256: candidate.projectRootSha256,
    taskSpecSha256: candidate.taskSpecSha256,
    evidencePlanSha256: candidate.evidencePlanSha256,
    round: candidate.round,
    bundleSha256: candidate.bundleSha256,
    claims: candidate.claims,
    claimsSha256: candidate.claimsSha256,
    candidateSha256: candidate.candidateSha256,
    evidenceStateSha256: candidate.evidenceStateSha256,
    criticMode: candidate.criticMode,
    repairEligibility: candidate.repairEligibility,
    repairUnavailableReason: candidate.repairUnavailableReason,
    phase: candidate.phase,
    pendingOwnerReason: candidate.pendingOwnerReason,
    callsUsed: candidate.callsUsed,
  });
}

function pendingContractProjection(contract: QualityBoundAdapterTaskContractV4): Readonly<Record<string, unknown>> {
  return Object.freeze({
    version: contract.version,
    taskNumber: contract.taskNumber,
    requestSha256: contract.requestSha256,
    supportedOutcome: contract.supportedOutcome,
    lane: contract.lane,
    route: contract.route,
    ownedRecords: contract.ownedRecords,
    protectedGit: contract.protectedGit,
    taskSpecSha256: contract.taskSpecSha256,
    evidencePlanSha256: contract.evidencePlanSha256,
    checks: contract.checks,
    envelopeChecks: contract.envelopeChecks,
    stopConditions: contract.stopConditions,
  });
}

function pendingStartProjection(start: GitSnapshot): Readonly<Record<string, unknown>> {
  return Object.freeze({
    head: start.head,
    status: start.status,
    staged: start.staged,
    logText: start.logText,
    protectedPaths: Object.freeze([...start.protectedPaths.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([projectRelativePath, state]) => Object.freeze({
        projectRelativePath,
        worktree: state.worktree,
        index: state.index,
      }))),
    candidateProtection: start.candidateProtection === true,
  });
}

function canonicalClaimsText(claims: TaskSpecWorkerClaims): string {
  return ["```cairn-claims", JSON.stringify(claims), "```"].join("\n");
}

function pendingRepairLineageProjection(
  repair: SerialCandidatePendingRepairLineageV1,
): Readonly<Record<string, unknown>> | null {
  const common = {
    preRepairCandidate: pendingCandidateProjection(repair.preRepairCandidate),
    postRepairCandidate: pendingCandidateProjection(repair.postRepairCandidate),
    preRepairTransitionHistory: repair.preRepairTransitionHistory,
    repairInstruction: repair.repairInstruction,
    blockers: repair.blockers,
    roundOneBundle: repair.roundOneBundle,
    roundOneCaptureContext: repair.roundOneCaptureContext,
    claimsText: canonicalClaimsText(repair.postRepairCandidate.claims),
  };
  if (repair.preRepairQ9Custody.qualityLoopAuthorityRequired) {
    return Object.freeze({ ...common, preRepairQ9Custody: repair.preRepairQ9Custody });
  }
  if (repair.preRepairQ9Custody.assessmentRestartCustody !== null
    || repair.preRepairQ9Custody.repairAuthority !== null
    || repair.preRepairQ9Custody.repairAuthoritySha256 !== null
    || repair.preRepairQ9Custody.policyDecision !== null
    || repair.preRepairQ9Custody.completionAuthority !== null
    || repair.preRepairQ9Custody.attempts.length !== 0) return null;
  return Object.freeze(common);
}

function pendingCandidateInner(
  candidate: SerialCandidateV1,
  context: OpenSerialCandidateContext,
  requireExactWorkspace: boolean,
): Readonly<Record<string, unknown>> | null {
  if (!serialCandidateGitEnvironmentSafe()
    || !candidateGitMetadataSafe(context.projectRoot, context.contract.ownedRecords)
    || (requireExactWorkspace && (!candidateWorkspaceStillExact(candidate, context)
      || !candidateTaskPathSetStillExact(candidate, context)))) return null;
  const projectRootReal = canonicalExistingDirectory(context.projectRoot);
  const transitionHistory = serialCandidatePendingTransitionHistory(candidate);
  const repairLineage = candidate.round === 1
    ? serialCandidatePendingRepairLineage(candidate)
    : null;
  if (!projectRootReal || candidateProjectRootIdentitySha256(projectRootReal) !== candidate.projectRootSha256
    || transitionHistory === null
    || (candidate.round === 0) !== (repairLineage === null)) return null;
  const taskPaths = repairLineage?.roundOneCaptureContext.taskPaths ?? context.taskPaths;
  const q9Custody = serialCandidateQ9PendingCustody(candidate);
  const revisionCustody = serialCandidateEvidencePlanRevisionCustody(candidate);
  if ((candidate.lineage.evidencePlan.revision === 1) !== (revisionCustody !== null)) return null;
  if (q9Custody === null) return null;
  const repairLineageProjection = repairLineage ? pendingRepairLineageProjection(repairLineage) : null;
  if (repairLineage !== null && repairLineageProjection === null) return null;
  const common = {
    version: SERIAL_PENDING_CANDIDATE_INNER_VERSION,
    projectRootReal,
    projectRootSha256: candidate.projectRootSha256,
    start: pendingStartProjection(context.start),
    startHeadRef: context.startHeadRef,
    contract: pendingContractProjection(context.contract),
    route: context.route,
    activities: context.activities,
    taskPaths,
    protectedPaths: context.protectedPaths,
    ownedPaths: context.ownedPaths,
    ownedRecordIndexAuthority: context.ownedRecordIndexAuthority,
    attestations: context.attestations,
    attestationsCompleteForDone: context.attestationsCompleteForDone,
    evidence: context.evidence,
    taskSpec: candidate.lineage.taskSpec,
    evidencePlan: candidate.lineage.evidencePlan,
    round0Bundle: candidate.lineage.round0Bundle,
    candidate: pendingCandidateProjection(candidate),
    claimsText: canonicalClaimsText(context.claims),
    transitionHistory,
    repairLineage: repairLineageProjection,
    sealableCandidateSha256: context.sealableCandidateSha256,
    sealableClaimsSha256: context.sealableClaimsSha256,
    sealableBundleSha256: context.sealableBundleSha256,
  };
  if (q9Custody.qualityLoopAuthorityRequired) {
    return Object.freeze({
      ...common,
      initialEvidencePlan: candidate.lineage.initialEvidencePlan,
      evidencePlanRevisionCustody: revisionCustody,
      q9Custody,
    });
  }
  if (revisionCustody !== null || q9Custody.assessmentRestartCustody !== null
    || q9Custody.repairAuthority !== null || q9Custody.repairAuthoritySha256 !== null
    || q9Custody.policyDecision !== null || q9Custody.completionAuthority !== null
    || q9Custody.attempts.length !== 0) return null;
  return Object.freeze(common);
}

function pendingCapsuleFromInner(inner: unknown, requirePendingState: boolean): SerialPendingCandidateCapsuleV1 | null {
  const canonicalBytes = pendingCanonicalBytes(inner);
  if (!canonicalBytes) return null;
  const capsule = Object.freeze({
    version: SERIAL_PENDING_CANDIDATE_CAPSULE_VERSION,
    canonicalBytes,
    capsuleSha256: pendingSha256(canonicalBytes),
  }) as SerialPendingCandidateCapsuleV1;
  return (requirePendingState ? parsePendingCapsule(capsule) : parseAnyPendingCapsule(capsule)) ? capsule : null;
}

/**
 * Export only the current, still-held round-zero candidate and its complete
 * restart context. This does not release authority; parking is a separate
 * exact-digest acknowledgement after the caller durably persists the bytes.
 */
export function exportSerialCandidatePendingState(
  value: unknown,
): SerialPendingCandidateCapsuleV1 | null {
  const open = openContextForCandidate(value);
  if (!open) return null;
  const { candidate, context } = open;
  try {
    const inner = pendingCandidateInner(candidate, context, true);
    const capsule = inner ? pendingCapsuleFromInner(inner, true) : null;
    if (!capsule) return null;
    exportedPendingCandidateCapsules.set(candidate, Object.freeze({
      canonicalBytes: capsule.canonicalBytes,
      capsuleSha256: capsule.capsuleSha256,
    }));
    return capsule;
  } catch {
    return null;
  }
}

const PENDING_TERMINAL_PLAN_VERSION = "cairn-serial-candidate-terminal-plan/v1" as const;

type PendingTerminalPlanV1 = Readonly<{
  version: typeof PENDING_TERMINAL_PLAN_VERSION;
  actionId: string;
  kind: "finalize" | "stop";
  disposition: "DONE" | "STOPPED";
  reason: SerialStopReason | null;
  candidateSha256: string;
  baseCapsuleSha256: string;
  recordDate: string;
  reportSha256: string;
  logSha256: string;
  rowSha256: string;
  briefSha256: string;
  commitExpected: boolean;
  expectedCommitPaths: readonly string[];
  commitMessage: string | null;
  sealAuthorization: SerialCandidateSealAuthorizationV1 | null;
  resultProjection: PendingTerminalResultProjectionV1;
}>;

type PendingTerminalResultProjectionV1 = Readonly<{
  reportText: string;
  row: LogRow;
  composed: ComposedRecordInput;
  activities: readonly SerialActivity[];
  commit: Readonly<{ status: "created" | "skipped"; reason: string }>;
}>;

export type SerialCandidateTerminalPreparationInputV1 =
  | Readonly<{
      actionId: string;
      kind: "finalize";
      sealAuthorization: SerialCandidateSealAuthorizationV1;
    }>
  | Readonly<{ actionId: string; kind: "stop"; reason?: SerialStopReason }>;

function terminalPreparationInput(value: unknown): Readonly<{
  actionId: string;
  kind: "finalize" | "stop";
  reason: SerialStopReason | null;
  sealAuthorization: SerialCandidateSealAuthorizationV1 | null;
}> | null {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value) || nodeTypes.isProxy(value)) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string")) return null;
    for (const key of keys as string[]) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || !("value" in descriptor) || !descriptor.enumerable) return null;
    }
    const actionId = descriptors.actionId?.value;
    const kind = descriptors.kind?.value;
    if (typeof actionId !== "string" || !ACTION_UUID_V4_RE.test(actionId)
      || (kind !== "finalize" && kind !== "stop")) return null;
    if (kind === "finalize") {
      if ([...(keys as string[])].sort().join("\0") !== "actionId\0kind\0sealAuthorization") return null;
      const sealAuthorization = descriptors.sealAuthorization?.value;
      return isSerialCandidateSealAuthorization(sealAuthorization)
        ? Object.freeze({ actionId, kind, reason: null, sealAuthorization })
        : null;
    }
    const sorted = [...(keys as string[])].sort().join("\0");
    if (sorted !== "actionId\0kind" && sorted !== "actionId\0kind\0reason") return null;
    const reason = descriptors.reason?.value ?? "MODEL_RESULT_NOT_VERIFIED";
    return validCandidateStopReason(reason)
      ? Object.freeze({ actionId, kind, reason, sealAuthorization: null })
      : null;
  } catch {
    return null;
  }
}

function terminalActionCustody(plan: Pick<PendingTerminalPlanV1, "actionId" | "kind" | "baseCapsuleSha256">): SerialCandidateTerminalActionCustody {
  return Object.freeze({
    actionId: plan.actionId,
    kind: plan.kind,
    baseCapsuleSha256: plan.baseCapsuleSha256,
  });
}

function terminalRecordPreview(
  candidate: SerialCandidateV1,
  context: OpenSerialCandidateContext,
  input: NonNullable<ReturnType<typeof terminalPreparationInput>>,
  baseCapsuleSha256: string,
  recordDate: string,
): Readonly<{
  reportText: string;
  row: LogRow;
  composed: ComposedRecordInput;
  commitExpected: boolean;
  expectedCommitPaths: readonly string[];
}> | null {
  const action = Object.freeze({ actionId: input.actionId, kind: input.kind, baseCapsuleSha256 });
  if (input.kind === "finalize") {
    const candidateFilesChanged = candidateScanChangedPaths(context.projectRoot, context.contract.ownedRecords);
    const completionAuthority = serialCompletionRecordAuthority(candidate);
    if (!input.sealAuthorization || !isSerialCandidateSealAuthorization(input.sealAuthorization, candidate)
      || candidate.candidateSha256 !== context.sealableCandidateSha256
      || candidate.claimsSha256 !== context.sealableClaimsSha256
      || candidate.bundleSha256 !== context.sealableBundleSha256
      || (context.start.status.length === 0 && context.startHeadRef === null)
      || !context.attestationsCompleteForDone
      || composeBoundRunRecord(
        context.contract, "DONE", null, context.claims, context.attestations, completionAuthority,
      ) === null
      || !candidateWorkspaceStillExact(candidate, context)
      || !candidateTerminalPathsUnaliased(candidate, context)
      || candidateFilesChanged === null) return null;
    const reportFilesChanged = candidateReportChangedPaths(candidateFilesChanged);
    const custody = candidateCustody(context.projectRoot, candidate);
    const commitExpected = context.start.status.length === 0;
    const commit: RecordCommit = commitExpected
      ? { status: "created", reason: "One exact-path commit contains the candidate product changes and terminal records." }
      : { status: "skipped", reason: "Protected starting work prevented an isolated candidate task commit." };
    const values = composeCairnWorkerRecordValues(
      context.projectRoot,
      context.contract,
      "DONE",
      null,
      null,
      true,
      commit,
      context.evidence,
      undefined,
      Object.freeze({ claims: context.claims, attestations: context.attestations, completionAuthority }),
      custody,
      reportFilesChanged,
      action,
      recordDate,
    );
    return Object.freeze({
      ...values,
      commitExpected,
      expectedCommitPaths: Object.freeze([...new Set([...context.taskPaths, ...context.contract.ownedRecords])].sort()),
    });
  }

  const reason = input.reason;
  if (!reason || !validCandidateStopReason(reason)
    || !candidateTerminalPathsUnaliased(candidate, context, true, true)
    || !candidateMissingRegularProductOwnedStateSafe(candidate, context)) return null;
  const observation = observeCandidateStop(candidate, context);
  const recovery = candidateRecordRecovery(candidate, context);
  const protectedPathsExact = protectedStartingPathsOrNull(context.projectRoot, context.start);
  if (!observation || recovery === null || protectedPathsExact === null) return null;
  const headBeforeWrite = candidateGit(context.projectRoot, ["rev-parse", "HEAD"]);
  const refBeforeWrite = currentSymbolicHead(context.projectRoot);
  const protectedStarting = protectedPathsExact && headBeforeWrite === context.start.head
    && refBeforeWrite === context.startHeadRef;
  const usesOriginalEvidenceGeneration = candidate.round === 0 && candidate.callsUsed.repair === 0
    && candidate.candidateSha256 === context.sealableCandidateSha256
    && candidate.claimsSha256 === context.sealableClaimsSha256
    && candidate.bundleSha256 === context.sealableBundleSha256
    && context.attestations.every((row) => row.evidencePlanSha256 === candidate.evidencePlanSha256);
  const values = composeCairnWorkerRecordValues(
    context.projectRoot,
    context.contract,
    "STOPPED",
    reason,
    null,
    protectedStarting,
    null,
    usesOriginalEvidenceGeneration ? context.evidence : null,
    recovery,
    Object.freeze({
      claims: usesOriginalEvidenceGeneration ? context.claims : candidate.claims,
      attestations: usesOriginalEvidenceGeneration ? context.attestations : Object.freeze([]),
    }),
    observation.custody.custody,
    observation.reportFilesChanged,
    action,
    recordDate,
  );
  return Object.freeze({
    ...values,
    commitExpected: false,
    expectedCommitPaths: Object.freeze([]),
  });
}

function projectedTerminalActivities(
  activities: readonly SerialActivity[],
  kind: "finalize" | "stop",
  reason: SerialStopReason | null,
  commitExpected: boolean,
): readonly SerialActivity[] | null {
  const projected = candidateActivityView(activities);
  if (kind === "stop") {
    if (!reason) return null;
    projected.push({ stage: "Check", state: "working", detail: "Rechecking pending candidate record custody before STOP." });
    projected.push({
      stage: "Check",
      state: "stopped",
      detail: `Stopped safely: ${stopReasonInPlainWords(reason)} (${reason}).`,
    });
    projected.push({ stage: "Result", state: "stopped", detail: `STOPPED â€” ${stopReasonInPlainWords(reason)}` });
    projected[projected.length - 1] = {
      stage: "Result",
      state: "stopped",
      detail: `STOPPED — ${stopReasonInPlainWords(reason)}`,
    };
    return Object.freeze(projected);
  }
  projected.push({
    stage: "Check",
    state: "done",
    detail: commitExpected
      ? "The sealed candidate, custody record, protected work, and exact-path commit were verified."
      : "The sealed candidate and protected work were verified; the dirty start keeps changes uncommitted.",
  });
  projected.push({ stage: "Result", state: "done", detail: "DONE â€” the pre-seal candidate was finalized once." });
  projected[projected.length - 1] = {
    stage: "Result",
    state: "done",
    detail: "DONE — the pre-seal candidate was finalized once.",
  };
  return Object.freeze(projected);
}

function buildTerminalPreparation(
  candidate: SerialCandidateV1,
  context: OpenSerialCandidateContext,
  input: NonNullable<ReturnType<typeof terminalPreparationInput>>,
  baseCapsule: SerialPendingCandidateCapsuleV1,
  baseInner: Record<string, unknown>,
  recordDate: string,
): SerialCandidateTerminalPreparationV1 | null {
  const preview = terminalRecordPreview(candidate, context, input, baseCapsule.capsuleSha256, recordDate);
  if (!preview) return null;
  const projectedActivities = projectedTerminalActivities(
    context.activities,
    input.kind,
    input.reason,
    preview.commitExpected,
  );
  if (!projectedActivities) return null;
  const sealAuthorization = input.kind === "finalize" ? input.sealAuthorization : null;
  const plan: PendingTerminalPlanV1 = Object.freeze({
    version: PENDING_TERMINAL_PLAN_VERSION,
    actionId: input.actionId,
    kind: input.kind,
    disposition: input.kind === "finalize" ? "DONE" : "STOPPED",
    reason: input.reason,
    candidateSha256: candidate.candidateSha256,
    baseCapsuleSha256: baseCapsule.capsuleSha256,
    recordDate,
    reportSha256: pendingSha256(preview.reportText),
    logSha256: pendingSha256(context.start.logText + expectedLogLine(preview.row)),
    rowSha256: pendingSha256(JSON.stringify(preview.row)),
    briefSha256: pendingSha256(context.contractMarkdown),
    commitExpected: preview.commitExpected,
    expectedCommitPaths: preview.expectedCommitPaths,
    commitMessage: preview.commitExpected
      ? candidateTerminalCommitMessage(context.contract.taskNumber, input.actionId)
      : null,
    sealAuthorization,
    resultProjection: Object.freeze({
      reportText: preview.reportText,
      row: preview.row,
      composed: preview.composed,
      activities: projectedActivities,
      commit: Object.freeze({
        status: preview.commitExpected ? "created" as const : "skipped" as const,
        reason: input.kind === "stop"
          ? "The latest candidate was retained untouched for inspection."
          : preview.commitExpected
            ? "One exact-path commit contains the candidate product changes and terminal records."
            : "Protected starting work prevented an isolated candidate task commit.",
      }),
    }),
  });
  const capsule = pendingCapsuleFromInner(Object.freeze({
    version: SERIAL_PREPARED_CANDIDATE_TERMINAL_INNER_VERSION,
    pending: baseInner,
    terminalPlan: plan,
  }), false);
  if (!capsule) return null;
  const action = Object.freeze({
    actionId: input.actionId,
    kind: input.kind,
    candidateSha256: candidate.candidateSha256,
    capsuleSha256: capsule.capsuleSha256,
  }) as SerialCandidateTerminalActionV1;
  const preparation = Object.freeze({
    version: SERIAL_CANDIDATE_TERMINAL_PREPARATION_VERSION,
    action,
    capsule,
  }) as SerialCandidateTerminalPreparationV1;
  terminalPreparationBrand.add(preparation);
  terminalPreparationBindings.set(preparation, Object.freeze({
    candidate,
    plan,
    baseCapsule,
    sealAuthorization,
  }));
  terminalPreparationByCandidate.set(candidate, preparation);
  return preparation;
}

/** Compose exact terminal bytes and intent before any terminal workspace write. */
export function prepareSerialCandidateTerminal(
  value: unknown,
  rawInput: SerialCandidateTerminalPreparationInputV1,
): SerialCandidateTerminalPreparationV1 | null {
  const open = openContextForCandidate(value);
  const input = terminalPreparationInput(rawInput);
  if (!open || !input || (open.context.interruptedRepairStopOnly && input.kind !== "stop")) return null;
  const { candidate, context } = open;
  const existing = terminalPreparationByCandidate.get(candidate);
  if (existing) {
    const binding = terminalPreparationBindings.get(existing);
    return binding && binding.plan.actionId === input.actionId && binding.plan.kind === input.kind
      && binding.plan.reason === input.reason
      && (input.kind !== "finalize" || binding.sealAuthorization === input.sealAuthorization)
      ? existing
      : null;
  }
  try {
    if (!serialCandidateGitEnvironmentSafe()
      || !candidateGitMetadataSafe(context.projectRoot, context.contract.ownedRecords)) return null;
    let baseCapsule = exportSerialCandidatePendingState(candidate);
    let parsed = baseCapsule ? parsePendingCapsule(baseCapsule) : null;
    if ((!baseCapsule || !parsed) && input.kind === "stop") {
      const inner = pendingCandidateInner(candidate, context, false);
      baseCapsule = inner ? pendingCapsuleFromInner(inner, true) : null;
      parsed = baseCapsule ? parsePendingCapsule(baseCapsule) : null;
    }
    if (!baseCapsule || !parsed) return null;
    return buildTerminalPreparation(
      candidate,
      context,
      input,
      baseCapsule,
      parsed.inner,
      new Date().toISOString().slice(0, 10),
    );
  } catch {
    return null;
  }
}

/** Release the live PID lock only after the caller acknowledges exact bytes. */
export function parkSerialCandidateForRestart(
  value: unknown,
  persistedCapsuleSha256: unknown,
): boolean {
  const open = openContextForCandidate(value);
  if (!open || typeof persistedCapsuleSha256 !== "string") return false;
  const { candidate, context } = open;
  const exported = exportedPendingCandidateCapsules.get(candidate);
  const preparation = terminalPreparationByCandidate.get(candidate);
  const preparationBinding = preparation ? terminalPreparationBindings.get(preparation) : undefined;
  const preparedExact = preparation !== undefined
    && preparationBinding?.candidate === candidate
    && preparation.action.capsuleSha256 === persistedCapsuleSha256
    && preparation.capsule.capsuleSha256 === persistedCapsuleSha256
    && pendingSha256(preparation.capsule.canonicalBytes) === persistedCapsuleSha256
    && terminalPlanStillExact(candidate, context, preparationBinding);
  const pendingExact = exported !== undefined && exported.capsuleSha256 === persistedCapsuleSha256
    && pendingSha256(exported.canonicalBytes) === persistedCapsuleSha256;
  if (!preparedExact && !pendingExact) return false;
  try {
    if (!serialCandidateGitEnvironmentSafe()
      || !candidateGitMetadataSafe(context.projectRoot, context.contract.ownedRecords)
      || (pendingExact && (!candidateWorkspaceStillExact(candidate, context)
        || !candidateTaskPathSetStillExact(candidate, context)))
      || !parkCurrentSerialCandidate(candidate)) return false;
    exportedPendingCandidateCapsules.delete(candidate);
    terminalPreparationByCandidate.delete(candidate);
    releaseOpenCandidate(candidate.runId, context);
    return true;
  } catch {
    return false;
  }
}

type PendingOwnerSpan = Readonly<{
  kind: "conversation" | "direct";
  inputId: string;
  start: number;
  end: number;
  text: string;
}>;

function pendingOwnerSpans(taskSpec: unknown): readonly PendingOwnerSpan[] | null {
  try {
    if (!exactPendingKeys(taskSpec, ["version", "intent", "quality", "callBudget"])) return null;
    const intent = taskSpec.intent;
    if (!exactPendingKeys(intent, ["version", "outcome", "requirements", "context"])
      || !Array.isArray(intent.requirements)) return null;
    const rows = [intent.outcome, ...intent.requirements];
    const output: PendingOwnerSpan[] = [];
    for (const row of rows) {
      if (!exactPendingKeys(row, ["source", "text", "owner"])) return null;
      if (row.source === "cairn-chosen") {
        if (row.owner !== null) return null;
        continue;
      }
      if (row.source !== "owner-stated" && row.source !== "owner-unsure"
        || !exactPendingKeys(row.owner, ["kind", "inputId", "start", "end", "text"])) return null;
      const owner = row.owner;
      if ((owner.kind !== "conversation" && owner.kind !== "direct")
        || typeof owner.inputId !== "string" || typeof owner.text !== "string"
        || !Number.isSafeInteger(owner.start) || !Number.isSafeInteger(owner.end)
        || Object.is(owner.start, -0) || Object.is(owner.end, -0)
        || (owner.start as number) < 0 || (owner.end as number) <= (owner.start as number)
        || (owner.end as number) - (owner.start as number) !== owner.text.length) return null;
      output.push(Object.freeze({
        kind: owner.kind,
        inputId: owner.inputId,
        start: owner.start as number,
        end: owner.end as number,
        text: owner.text,
      }));
    }
    return Object.freeze(output);
  } catch {
    return null;
  }
}

function pendingSourceFiller(texts: readonly string[]): string | null {
  const joined = texts.join("");
  for (let code = 0x21; code <= 0xd7ff; code += 1) {
    const value = String.fromCharCode(code);
    if (!/[\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(value) && !joined.includes(value)) return value;
  }
  return null;
}

function pendingAuthenticatedSources(taskSpec: unknown): readonly TaskIntentSourceInput[] | null {
  const spans = pendingOwnerSpans(taskSpec);
  if (!spans) return null;
  type Group = {
    key: string;
    kind: "conversation" | "direct";
    inputId: string;
    spans: PendingOwnerSpan[];
    text: string;
    before: Set<string>;
  };
  const groups = new Map<string, Group>();
  for (const span of spans) {
    const key = `${span.kind}\0${span.inputId}`;
    const group = groups.get(key) ?? {
      key,
      kind: span.kind,
      inputId: span.inputId,
      spans: [],
      text: "",
      before: new Set<string>(),
    };
    group.spans.push(span);
    groups.set(key, group);
  }
  let totalCharacters = 0;
  for (const group of groups.values()) {
    if (group.kind === "direct") {
      const first = group.spans[0];
      if (!first || group.spans.some((span) => span.start !== 0 || span.end !== span.text.length || span.text !== first.text)) return null;
      group.text = first.text;
    } else {
      const length = Math.max(0, ...group.spans.map((span) => span.end));
      if (length > 200_000) return null;
      const filler = pendingSourceFiller(group.spans.map((span) => span.text));
      if (!filler) return null;
      const characters = Array.from({ length }, () => filler);
      const assigned = Array.from({ length }, () => false);
      for (const span of group.spans) {
        for (let offset = 0; offset < span.text.length; offset += 1) {
          const index = span.start + offset;
          const character = span.text[offset]!;
          if (assigned[index] && characters[index] !== character) return null;
          characters[index] = character;
          assigned[index] = true;
        }
      }
      group.text = characters.join("");
      if (group.spans.some((span) => group.text.indexOf(span.text) !== span.start)) return null;
    }
    totalCharacters += group.text.length;
    if (totalCharacters > 200_000) return null;
  }
  for (const owner of groups.values()) {
    for (const span of owner.spans) {
      for (const other of groups.values()) {
        if (other !== owner && other.text.includes(span.text)) owner.before.add(other.key);
      }
    }
  }
  const ordered: Group[] = [];
  const remaining = new Map(groups);
  while (remaining.size > 0) {
    const next = [...remaining.values()]
      .filter((group) => [...group.before].every((key) => !remaining.has(key)))
      .sort((left, right) => left.key.localeCompare(right.key))[0];
    if (!next) return null;
    ordered.push(next);
    remaining.delete(next.key);
  }
  return Object.freeze(ordered.map((group) => Object.freeze({
    kind: group.kind,
    inputId: group.inputId,
    text: group.text,
  })));
}

function pendingContractSections(taskSpec: unknown): readonly ContractSectionAuthorityV1[] | null {
  try {
    const sections = new Map<string, string>();
    const stack: unknown[] = [taskSpec];
    let nodes = 0;
    while (stack.length > 0) {
      const value = stack.pop();
      nodes += 1;
      if (nodes > 100_000) return null;
      if (!value || typeof value !== "object") continue;
      if (Array.isArray(value)) {
        for (const entry of value) stack.push(entry);
        continue;
      }
      const record = value as Record<string, unknown>;
      if (record.kind === "contract") {
        if (typeof record.section !== "string" || typeof record.sha256 !== "string" || !SHA256_RE.test(record.sha256)) return null;
        const prior = sections.get(record.section);
        if (prior !== undefined && prior !== record.sha256) return null;
        sections.set(record.section, record.sha256);
      }
      for (const entry of Object.values(record)) stack.push(entry);
    }
    return Object.freeze([...sections.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([section, sha256]) => Object.freeze({ section, sha256 })));
  } catch {
    return null;
  }
}

function pendingStringArray(value: unknown, cap: number, stringCap: number): readonly string[] | null {
  if (!Array.isArray(value) || value.length > cap
    || value.some((entry) => typeof entry !== "string" || entry.length > stringCap)) return null;
  return Object.freeze([...value]) as readonly string[];
}

function parsePendingStart(value: unknown): GitSnapshot | null {
  try {
    if (!exactPendingKeys(value, ["head", "status", "staged", "logText", "protectedPaths", "candidateProtection"])
      || typeof value.head !== "string" || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(value.head)
      || typeof value.logText !== "string" || value.candidateProtection !== true) return null;
    const status = pendingStringArray(value.status, 8192, 2048);
    const staged = pendingStringArray(value.staged, 8192, 512);
    if (!status || !staged || !Array.isArray(value.protectedPaths) || value.protectedPaths.length > 4096) return null;
    const protectedPaths = new Map<string, { worktree: string; index: string }>();
    let previous: string | null = null;
    for (const entry of value.protectedPaths) {
      if (!exactPendingKeys(entry, ["projectRelativePath", "worktree", "index"])
        || typeof entry.projectRelativePath !== "string" || entry.projectRelativePath.length > 512
        || typeof entry.worktree !== "string" || entry.worktree.length > 2048
        || typeof entry.index !== "string" || entry.index.length > 2048
        || (previous !== null && previous.localeCompare(entry.projectRelativePath) >= 0)) return null;
      previous = entry.projectRelativePath;
      protectedPaths.set(entry.projectRelativePath, Object.freeze({ worktree: entry.worktree, index: entry.index }));
    }
    return {
      head: value.head,
      status: [...status],
      staged: [...staged],
      logText: value.logText,
      protectedPaths,
      candidateProtection: true,
    };
  } catch {
    return null;
  }
}

function parsePendingDescriptor(value: unknown): TaskAdapter["descriptor"] | null {
  if (!exactPendingKeys(value, ["id", "label", "provider", "model", "connected", "capabilities", "priority"])
    || typeof value.id !== "string" || !value.id.trim() || value.id.length > 128
    || typeof value.label !== "string" || !value.label.trim() || value.label.length > 256
    || typeof value.provider !== "string" || value.provider.length > 256
    || typeof value.model !== "string" || value.model.length > 256
    || typeof value.connected !== "boolean"
    || typeof value.priority !== "number" || !Number.isFinite(value.priority) || Object.is(value.priority, -0)) return null;
  const capabilities = pendingStringArray(value.capabilities, 32, 128);
  if (!capabilities || new Set(capabilities).size !== capabilities.length) return null;
  return Object.freeze({
    id: value.id,
    label: value.label,
    provider: value.provider,
    model: value.model,
    connected: value.connected,
    capabilities,
    priority: value.priority,
  });
}

function parsePendingRoute(value: unknown): Extract<RouteResult, { status: "ready" }> | null {
  try {
    if (!exactPendingKeys(value, ["status", "recommended", "candidates", "reason"])
      || value.status !== "ready" || typeof value.reason !== "string" || value.reason.length > 2048
      || !Array.isArray(value.candidates) || value.candidates.length !== 1) return null;
    const recommended = parsePendingDescriptor(value.recommended);
    const candidate = parsePendingDescriptor(value.candidates[0]);
    if (!recommended || !candidate || !recommended.connected
      || !recommended.capabilities.includes("serial-task")
      || !recommended.capabilities.includes("serial-task-candidate")
      || JSON.stringify(recommended) !== JSON.stringify(candidate)) return null;
    return Object.freeze({
      status: "ready",
      recommended,
      candidates: [candidate],
      reason: value.reason,
    }) as Extract<RouteResult, { status: "ready" }>;
  } catch {
    return null;
  }
}

function parsePendingActivities(value: unknown): SerialActivity[] | null {
  if (!Array.isArray(value) || value.length > 64) return null;
  const activities: SerialActivity[] = [];
  for (const entry of value) {
    if (!exactPendingKeys(entry, ["stage", "state", "detail"])
      || (entry.stage !== "Route" && entry.stage !== "Run" && entry.stage !== "Check" && entry.stage !== "Result")
      || (entry.state !== "working" && entry.state !== "done" && entry.state !== "stopped")
      || typeof entry.detail !== "string" || entry.detail.length > 4096) return null;
    activities.push(Object.freeze({ stage: entry.stage, state: entry.state, detail: entry.detail }));
  }
  return activities;
}

function exactPendingJson(left: unknown, right: unknown): boolean {
  const leftBytes = pendingCanonicalBytes(left);
  const rightBytes = pendingCanonicalBytes(right);
  return leftBytes !== null && leftBytes === rightBytes;
}

function parsePendingCandidatePaths(
  value: unknown,
  cap: number,
  allowReservedRecords: boolean,
): readonly string[] | null {
  const pathsValue = pendingStringArray(value, cap, 512);
  if (!pathsValue) return null;
  const seen = new Set<string>();
  let previous: string | null = null;
  for (const path of pathsValue) {
    const parts = path.split("/");
    const key = process.platform === "win32" ? path.toLowerCase() : path;
    if (!path || path.includes("\\") || isAbsolute(path) || parts.some((part) => !part || part === "." || part === "..")
      || parts.includes(".git") || (!allowReservedRecords && serialCandidateReservedRecordClass(path) !== null)
      || seen.has(key) || (previous !== null && previous.localeCompare(path) >= 0)) return null;
    seen.add(key);
    previous = path;
  }
  return pathsValue;
}

const PENDING_CANDIDATE_KEYS = [
  "version", "runId", "generation", "taskNumber", "requestSha256", "projectRootSha256",
  "taskSpecSha256", "evidencePlanSha256", "round", "bundleSha256", "claims", "claimsSha256",
  "candidateSha256", "evidenceStateSha256", "criticMode", "repairEligibility", "repairUnavailableReason",
  "phase", "pendingOwnerReason", "callsUsed",
] as const;

function parsePendingCandidateRecord(value: unknown): Record<string, unknown> | null {
  if (!exactPendingKeys(value, PENDING_CANDIDATE_KEYS)
    || value.version !== SERIAL_CANDIDATE_VERSION
    || typeof value.runId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(value.runId)
    || !Number.isSafeInteger(value.generation) || Object.is(value.generation, -0) || (value.generation as number) < 0
    || !Number.isSafeInteger(value.taskNumber) || Object.is(value.taskNumber, -0) || (value.taskNumber as number) < 1
    || typeof value.requestSha256 !== "string" || !SHA256_RE.test(value.requestSha256)
    || typeof value.projectRootSha256 !== "string" || !SHA256_RE.test(value.projectRootSha256)
    || typeof value.taskSpecSha256 !== "string" || !SHA256_RE.test(value.taskSpecSha256)
    || typeof value.evidencePlanSha256 !== "string" || !SHA256_RE.test(value.evidencePlanSha256)
    || (value.round !== 0 && value.round !== 1)
    || typeof value.bundleSha256 !== "string" || !SHA256_RE.test(value.bundleSha256)
    || typeof value.claimsSha256 !== "string" || !SHA256_RE.test(value.claimsSha256)
    || typeof value.candidateSha256 !== "string" || !SHA256_RE.test(value.candidateSha256)
    || typeof value.evidenceStateSha256 !== "string" || !SHA256_RE.test(value.evidenceStateSha256)
    || (value.criticMode !== "required" && value.criticMode !== "optional" && value.criticMode !== "off")
    || (value.repairUnavailableReason !== null && value.repairUnavailableReason !== "IGNORED_WRITE_SET_UNAVAILABLE"
      && value.repairUnavailableReason !== "REPAIR_SPENT")
    || (value.phase !== "awaiting-critic" && value.phase !== "awaiting-critic-result"
      && value.phase !== "awaiting-owner-resolution" && value.phase !== "awaiting-repair"
      && value.phase !== "awaiting-repair-result" && value.phase !== "ready-to-seal"
      && value.phase !== "done" && value.phase !== "stopped")
    || (value.pendingOwnerReason !== null && value.pendingOwnerReason !== "critic-allegation"
      && value.pendingOwnerReason !== "cairn-failure-confirmation")
    || !exactPendingKeys(value.callsUsed, ["builder", "repair", "critic", "externalEvidence"])
    || value.callsUsed.builder !== 1 || (value.callsUsed.repair !== 0 && value.callsUsed.repair !== 1)
    || !Number.isSafeInteger(value.callsUsed.critic) || (value.callsUsed.critic as number) < 0 || (value.callsUsed.critic as number) > 3
    || value.callsUsed.externalEvidence !== 0) return null;
  return value;
}

function composePendingContract(
  root: string,
  persisted: unknown,
  taskNumber: number,
  authority: SerialCandidateTaskSpecAuthorityV1,
  start: GitSnapshot,
  route: Extract<RouteResult, { status: "ready" }>,
): QualityBoundAdapterTaskContractV4 | null {
  try {
    if (!exactPendingKeys(persisted, [
      "version", "taskNumber", "requestSha256", "supportedOutcome", "lane", "route", "ownedRecords",
      "protectedGit", "taskSpecSha256", "evidencePlanSha256", "checks", "envelopeChecks", "stopConditions",
    ])) return null;
    const ownedRecords = Object.freeze([
      rel(root, paths.brief(root, taskNumber)),
      rel(root, paths.report(root, taskNumber)),
      rel(root, paths.log(root)),
    ]);
    const review = taskSpecReviewView(authority.taskSpec);
    const requestSha256 = taskRequestSha256(authority.taskSpec.intent);
    if (!review || !requestSha256) return null;
    const contract = Object.freeze({
      version: "cairn-serial-task/v4",
      taskNumber,
      intent: authority.taskSpec.intent,
      requestSha256,
      supportedOutcome: CANDIDATE_SUPPORTED_OUTCOME,
      lane: "Standard",
      route: Object.freeze({
        adapterId: route.recommended.id,
        adapterLabel: route.recommended.label,
        provider: route.recommended.provider,
        model: route.recommended.model,
        reason: route.reason,
      }),
      ownedRecords,
      protectedGit: Object.freeze({
        head: start.head,
        dirty: start.status.length > 0,
        staged: start.staged.length > 0,
      }),
      taskSpec: authority.taskSpec,
      taskSpecSha256: authority.taskSpecSha256,
      taskSpecReview: review,
      evidencePlan: authority.evidencePlan,
      evidencePlanSha256: authority.evidencePlanSha256,
      checks: Object.freeze([]) as readonly [],
      envelopeChecks: Object.freeze([
        `Confirm exactly one ${route.recommended.label} Builder returns one completed Task-Spec-bound result.`,
        "Confirm protected starting work, Cairn-owned records, and the exact Git-visible task path set remain isolated.",
        "Capture and hash one pre-seal candidate without writing a report, log row, DONE disposition, or commit.",
      ]),
      stopConditions: Object.freeze([
        "The Builder fails, returns an invalid result, omits strict Task-Spec claims, or claims STOPPED.",
        "Protected work, HEAD, or a Cairn-owned record changes unexpectedly.",
        "The exact candidate path set cannot be classified and captured losslessly.",
      ]),
    }) as QualityBoundAdapterTaskContractV4;
    return exactPendingJson(pendingContractProjection(contract), persisted) ? contract : null;
  } catch {
    return null;
  }
}

function pendingTransitionDecisions(value: unknown): readonly SerialCandidateTransitionDecisionV1[] | null {
  if (!Array.isArray(value) || value.length > 16) return null;
  const decisions: SerialCandidateTransitionDecisionV1[] = [];
  for (const decision of value) {
    if (decision !== "optional-critic-declined" && decision !== "critic-clear" && decision !== "critic-allegation"
      && decision !== "required-check-failure-confirmed" && decision !== "owner-confirmed"
      && decision !== "owner-dismissed") return null;
    decisions.push(decision);
  }
  return Object.freeze(decisions);
}

const Q9_PENDING_REPAIR_LINEAGE_KEYS = [
  "preRepairCandidate", "postRepairCandidate", "preRepairTransitionHistory", "preRepairQ9Custody", "repairInstruction",
  "blockers", "roundOneBundle", "roundOneCaptureContext", "claimsText",
] as const;
const LEGACY_PENDING_REPAIR_LINEAGE_KEYS = [
  "preRepairCandidate", "postRepairCandidate", "preRepairTransitionHistory", "repairInstruction",
  "blockers", "roundOneBundle", "roundOneCaptureContext", "claimsText",
] as const;

function parsePendingRepairLineage(value: unknown): Readonly<{
  value: Record<string, unknown>;
  preRepairCandidate: Record<string, unknown>;
  postRepairCandidate: Record<string, unknown>;
  preRepairTransitionHistory: readonly SerialCandidateTransitionDecisionV1[];
  kind: "legacy" | "q9";
}> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const kind = exactPendingKeys(record, Q9_PENDING_REPAIR_LINEAGE_KEYS)
    ? exactPendingQ9Custody(record.preRepairQ9Custody) ? "q9" : null
    : exactPendingKeys(record, LEGACY_PENDING_REPAIR_LINEAGE_KEYS) ? "legacy" : null;
  if (kind === null) return null;
  const preRepairCandidate = parsePendingCandidateRecord(record.preRepairCandidate);
  const postRepairCandidate = parsePendingCandidateRecord(record.postRepairCandidate);
  const preRepairTransitionHistory = pendingTransitionDecisions(record.preRepairTransitionHistory);
  if (!preRepairCandidate || !postRepairCandidate || !preRepairTransitionHistory
    || preRepairCandidate.round !== 0
    || (preRepairCandidate.phase !== "awaiting-repair" && preRepairCandidate.phase !== "awaiting-repair-result")
    || ((preRepairCandidate.callsUsed as Record<string, unknown>).repair !== 0
      && (preRepairCandidate.callsUsed as Record<string, unknown>).repair !== 1)
    || postRepairCandidate.round !== 1
    || (postRepairCandidate.callsUsed as Record<string, unknown>).repair !== 1
    || preRepairCandidate.runId !== postRepairCandidate.runId
    || preRepairCandidate.taskNumber !== postRepairCandidate.taskNumber
    || preRepairCandidate.requestSha256 !== postRepairCandidate.requestSha256
    || preRepairCandidate.projectRootSha256 !== postRepairCandidate.projectRootSha256
    || preRepairCandidate.taskSpecSha256 !== postRepairCandidate.taskSpecSha256
    || preRepairCandidate.evidencePlanSha256 !== postRepairCandidate.evidencePlanSha256
    || typeof record.claimsText !== "string" || record.claimsText.length > 262_144) return null;
  return Object.freeze({
    value: record,
    preRepairCandidate,
    postRepairCandidate,
    preRepairTransitionHistory,
    kind,
  });
}

function pendingBundleTaskPaths(value: unknown): readonly string[] | null {
  if (!exactPendingKeys(value, [
    "version", "round", "baseHead", "projectRootSha256", "taskSpecSha256", "evidencePlanSha256",
    "entries", "rawByteLength", "manifestSha256", "bundleSha256",
  ]) || !Array.isArray(value.entries)) return null;
  return parsePendingCandidatePaths(value.entries.map((entry) =>
    exactPendingKeys(entry, [
      "projectRelativePath", "state", "origin", "executable", "byteLength", "contentSha256",
      "contentBase64", "gitBlobOid", "gitMode", "baseBlobOid", "baseMode", "indexState",
      "indexBlobOid", "indexMode", "indexRelation",
    ]) ? entry.projectRelativePath : null), 100, false);
}

function pendingInitialEvidenceCandidate(value: unknown): Readonly<Record<string, unknown>> | null {
  if (!exactPendingKeys(value, [
    "version", "taskSpecSha256", "revision", "previousPlanSha256", "revisionReasonEvidenceRefs", "procedures",
  ]) || !Array.isArray(value.procedures)) return null;
  const procedures: Record<string, unknown>[] = [];
  for (const entry of value.procedures) {
    if (!exactPendingKeys(entry, ["criterionId", "kind", "command", "artifactIds"])) return null;
    let command: unknown = null;
    if (entry.command !== null) {
      if (!exactPendingKeys(entry.command, [
        "executablePath", "executableSha256", "arguments", "fixtureBindings", "cwdRelative", "expectedExitCodes",
        "timeoutMs", "resultParserMode", "assertion", "text", "sha256",
      ])) return null;
      command = {
        executablePath: entry.command.executablePath,
        executableSha256: entry.command.executableSha256,
        arguments: entry.command.arguments,
        fixtureBindings: entry.command.fixtureBindings,
        cwdRelative: entry.command.cwdRelative,
        expectedExitCodes: entry.command.expectedExitCodes,
        timeoutMs: entry.command.timeoutMs,
        resultParserMode: entry.command.resultParserMode,
        assertion: entry.command.assertion,
      };
    }
    procedures.push({
      criterionId: entry.criterionId,
      kind: entry.kind,
      command,
      artifactIds: entry.artifactIds,
    });
  }
  return Object.freeze({ version: EVIDENCE_PLAN_CANDIDATE_VERSION, procedures: Object.freeze(procedures) });
}

type PendingEvidenceRestoration = Readonly<{
  initialPlan: EvidencePlanV1;
  currentPlan: EvidencePlanV1;
  initialAuthority: SerialCandidateTaskSpecAuthorityV1;
  currentAuthority: SerialCandidateTaskSpecAuthorityV1;
  authorizedRevision: AuthorizedEvidencePlanRevisionV1 | null;
}>;

/** Rebuild revision zero and the one authorized mechanical revision from the
 * authenticated pending bytes. This never treats a persisted branded plan as
 * authority: it replays preview + authorization and obtains fresh brands from
 * quality.ts before candidate adoption. */
function restorePendingEvidencePlans(
  taskSpec: TaskSpecV1,
  initialRaw: unknown,
  currentRaw: unknown,
  revisionCustodyRaw: unknown,
  runId: string,
): PendingEvidenceRestoration | null {
  try {
    const initialCandidate = pendingInitialEvidenceCandidate(initialRaw);
    const initialPlan = initialCandidate ? bindInitialEvidencePlan(taskSpec, initialCandidate) : null;
    if (!initialPlan || !exactPendingJson(initialPlan, initialRaw) || initialPlan.revision !== 0) return null;
    const initialAuthority = composeSerialCandidateTaskSpecAuthority(taskSpec, initialPlan);
    if (!initialAuthority) return null;
    if (exactPendingJson(initialRaw, currentRaw)) {
      return revisionCustodyRaw === null
        ? Object.freeze({
            initialPlan,
            currentPlan: initialPlan,
            initialAuthority,
            currentAuthority: initialAuthority,
            authorizedRevision: null,
          })
        : null;
    }
    if (!exactPendingKeys(currentRaw, [
      "version", "taskSpecSha256", "revision", "previousPlanSha256", "revisionReasonEvidenceRefs", "procedures",
    ]) || currentRaw.version !== EVIDENCE_PLAN_VERSION || currentRaw.revision !== 1
      || currentRaw.previousPlanSha256 !== evidencePlanSha256(initialPlan)
      || !Array.isArray(currentRaw.procedures)
      || !exactPendingKeys(revisionCustodyRaw, [
        "initialEvidencePlan", "initialEvidencePlanSha256", "currentEvidencePlan",
        "currentEvidencePlanSha256", "authorization", "custodySha256",
      ])
      || !exactPendingJson(revisionCustodyRaw.initialEvidencePlan, initialRaw)
      || !exactPendingJson(revisionCustodyRaw.currentEvidencePlan, currentRaw)
      || revisionCustodyRaw.initialEvidencePlanSha256 !== evidencePlanSha256(initialPlan)
      || typeof revisionCustodyRaw.custodySha256 !== "string" || !SHA256_RE.test(revisionCustodyRaw.custodySha256)) return null;
    const authorization = revisionCustodyRaw.authorization;
    if (!authorization || typeof authorization !== "object" || Array.isArray(authorization)
      || (authorization as Record<string, unknown>).runId !== runId
      || typeof (authorization as Record<string, unknown>).criterionId !== "string"
      || typeof (authorization as Record<string, unknown>).changeKind !== "string") return null;
    const criterionId = (authorization as Record<string, unknown>).criterionId as string;
    const changed = currentRaw.procedures.find((entry) => exactPendingKeys(entry, [
      "criterionId", "kind", "command", "artifactIds",
    ]) && entry.criterionId === criterionId);
    if (!changed || !changed.command || !exactPendingKeys(changed.command, [
      "executablePath", "executableSha256", "arguments", "fixtureBindings", "cwdRelative", "expectedExitCodes",
      "timeoutMs", "resultParserMode", "assertion", "text", "sha256",
    ]) || !Array.isArray(currentRaw.revisionReasonEvidenceRefs)) return null;
    const { text: _text, sha256: _sha256, ...replacementCommand } = changed.command;
    void _text;
    void _sha256;
    const preview = previewEvidencePlanRevision(taskSpec, initialPlan, {
      criterionId,
      changeKind: (authorization as Record<string, unknown>).changeKind,
      replacementCommand,
    }, currentRaw.revisionReasonEvidenceRefs);
    if (!preview || !exactPendingJson(preview.plan, currentRaw)) return null;
    const authorityContext = Object.freeze({
      ...(authorization as Record<string, unknown>),
      version: EVIDENCE_PLAN_REVISION_AUTHORITY_CONTEXT_VERSION,
    });
    const authorizedRevision = authorizeEvidencePlanRevision(
      taskSpec,
      initialPlan,
      preview,
      authorization,
      authorityContext,
    );
    if (!authorizedRevision || !exactPendingJson(authorizedRevision.plan, currentRaw)
      || !exactPendingJson(authorizedRevision.authorization, authorization)) return null;
    const currentAuthority = composeSerialCandidateTaskSpecAuthority(taskSpec, authorizedRevision.plan);
    const currentSha = evidencePlanSha256(authorizedRevision.plan);
    if (!currentAuthority || !currentSha || revisionCustodyRaw.currentEvidencePlanSha256 !== currentSha) return null;
    return Object.freeze({
      initialPlan,
      currentPlan: authorizedRevision.plan,
      initialAuthority,
      currentAuthority,
      authorizedRevision,
    });
  } catch {
    return null;
  }
}

function projectAlreadyLive(projectRootReal: string, runId: string): boolean {
  if (openSerialCandidates.has(runId)) return true;
  for (const active of activeRoots) {
    if (canonicalExistingDirectory(active) === projectRootReal) return true;
  }
  for (const context of openSerialCandidates.values()) {
    if (canonicalExistingDirectory(context.projectRoot) === projectRootReal) return true;
  }
  return false;
}

/**
 * Reacquire the process lock and rebuild every ephemeral brand from the
 * authenticated capsule plus the still-exact workspace. No adapter is
 * invoked, and no terminal record is written on this path.
 */
export function resumeSerialCandidateFromPending(
  root: string,
  capsule: unknown,
  options: { events?: SerialRunEvents } = {},
): SerialPendingCandidateResumeResultV1 {
  return resumeSerialCandidateFromPendingInternal(root, capsule, options, false, false, false);
}

/** Main-only authenticated recovery. The opaque journal authority is minted
 * only after Main verifies its HMAC revision/high-water/inventory chain and
 * binds this exact capsule/project/run/candidate/revision tuple. */
export function resumeSerialCandidateFromAuthenticatedPending(
  root: string,
  capsule: unknown,
  revision: number,
  journalAuthority: SerialAuthenticatedPendingJournalAuthority,
  options: { events?: SerialRunEvents } = {},
): SerialPendingCandidateResumeResultV1 {
  const parsed = parsePendingCapsule(capsule);
  const record = parsed ? parsePendingCandidateRecord(parsed.inner.candidate) : null;
  if (!parsed || !record || !consumeSerialAuthenticatedPendingJournalAuthority(journalAuthority, {
    capsuleSha256: parsed.capsuleSha256,
    projectRootSha256: record.projectRootSha256 as string,
    runId: record.runId as string,
    candidateSha256: record.candidateSha256 as string,
    revision,
    prepared: false,
  })) return stalePendingCandidate("INVALID_CAPSULE");
  return resumeSerialCandidateFromPendingInternal(root, capsule, options, false, true, true);
}

/** Narrow crash recovery for the exact hard cut after the one permitted
 * repair process changed task bytes but before round-one capture/adoption.
 * The authenticated reserved candidate is restored with stop-only authority:
 * no repair result, policy evidence, critic call, or DONE path can consume it. */
export function resumeSerialCandidateInterruptedRepairForStop(
  root: string,
  capsule: unknown,
  options: { events?: SerialRunEvents } = {},
): SerialPendingCandidateResumeResultV1 {
  const parsed = parsePendingCapsule(capsule);
  const record = parsed ? parsePendingCandidateRecord(parsed.inner.candidate) : null;
  if (!record || record.round !== 0 || record.phase !== "awaiting-repair-result"
    || (record.callsUsed as Record<string, unknown>).repair !== 1) {
    return stalePendingCandidate("INVALID_CAPSULE");
  }
  const resumed = resumeSerialCandidateFromPendingInternal(root, capsule, options, true, true, false);
  if (resumed.status !== "resumed") return resumed;
  const context = openSerialCandidates.get(resumed.candidate.runId);
  if (!context || context.released) {
    releaseReconciledCandidate(resumed.candidate);
    return stalePendingCandidate("LIVE_LOCK_UNAVAILABLE");
  }
  return resumed;
}

/** Same authenticated stop-only recovery for a repair process whose durable
 * terminal operation is failed/unavailable/cancelled after writing task bytes.
 * Operation status is Main journal custody; Core's authority condition is the
 * exact already-spent awaiting-repair-result capsule plus retained workspace. */
export function resumeSerialCandidateRepairFailureForStop(
  root: string,
  capsule: unknown,
  options: { events?: SerialRunEvents } = {},
): SerialPendingCandidateResumeResultV1 {
  return resumeSerialCandidateInterruptedRepairForStop(root, capsule, options);
}

function resumeSerialCandidateFromPendingInternal(
  root: string,
  capsule: unknown,
  options: { events?: SerialRunEvents },
  allowPreparedStopWorkspaceDrift: boolean,
  allowQ9AuthorityRestoration: boolean,
  preserveAuthenticatedLegacy: boolean,
): SerialPendingCandidateResumeResultV1 {
  const invalid = (_stage: string): SerialPendingCandidateResumeResultV1 =>
    stalePendingCandidate("INVALID_CAPSULE");
  const parsed = parsePendingCapsule(capsule);
  if (!parsed) return invalid("wrapper");
  const inner = parsed.inner;
  const pendingKind = pendingCandidateInnerKind(inner);
  if (pendingKind === null) return invalid("pending-kind");
  if (inner.version !== SERIAL_PENDING_CANDIDATE_INNER_VERSION) return invalid("version");
  const candidateRecord = parsePendingCandidateRecord(inner.candidate);
  if (!candidateRecord) return invalid("candidate-record");
  if (pendingKind === "q9" && !allowQ9AuthorityRestoration && q9PendingInnerCarriesAuthority(inner)) {
    return invalid("unauthenticated-q9-authority");
  }
  if (!exactPendingKeys(inner.round0Bundle, [
    "version", "round", "baseHead", "projectRootSha256", "taskSpecSha256", "evidencePlanSha256",
    "entries", "rawByteLength", "manifestSha256", "bundleSha256",
  ]) || inner.round0Bundle.version !== SERIAL_CANDIDATE_BUNDLE_VERSION
    || inner.round0Bundle.round !== 0) return invalid("round-zero-bundle-shape");
  const roundOne = candidateRecord.round === 1;
  const repairLineage = roundOne ? parsePendingRepairLineage(inner.repairLineage) : null;
  if ((roundOne && ((candidateRecord.callsUsed as Record<string, unknown>).repair !== 1 || !repairLineage))
    || (!roundOne && (((candidateRecord.callsUsed as Record<string, unknown>).repair !== 0
      && (candidateRecord.callsUsed as Record<string, unknown>).repair !== 1)
      || inner.repairLineage !== null))) return invalid("repair-lineage-shape");
  if (roundOne && repairLineage?.kind !== pendingKind) return invalid("repair-lineage-kind");
  if (pendingKind === "q9" && !exactPendingQ9Custody(inner.q9Custody)) return invalid("q9-custody");
  if (!exactPendingKeys(inner.evidencePlan, [
    "version", "taskSpecSha256", "revision", "previousPlanSha256", "revisionReasonEvidenceRefs", "procedures",
  ]) || inner.evidencePlan.version !== EVIDENCE_PLAN_VERSION) return invalid("evidence-plan-shape");
  if (inner.evidencePlan.revision !== 0 && inner.evidencePlan.revision !== 1) {
    return stalePendingCandidate("UNSUPPORTED_EVIDENCE_REVISION");
  }
  if (pendingKind === "legacy" && inner.evidencePlan.revision !== 0) return invalid("legacy-evidence-revision");
  if (typeof inner.projectRootReal !== "string" || typeof inner.projectRootSha256 !== "string"
    || !SHA256_RE.test(inner.projectRootSha256)) return invalid("root-shape");
  const projectRoot = resolve(root);
  const projectRootReal = canonicalExistingDirectory(projectRoot);
  if (!projectRootReal || projectRootReal !== inner.projectRootReal
    || candidateProjectRootIdentitySha256(projectRootReal) !== inner.projectRootSha256
    || candidateRecord.projectRootSha256 !== inner.projectRootSha256) {
    return stalePendingCandidate("PROJECT_MISMATCH");
  }
  const runId = candidateRecord.runId as string;
  if (projectAlreadyLive(projectRootReal, runId)) return stalePendingCandidate("LIVE_LOCK_UNAVAILABLE");
  if (!serialCandidateGitEnvironmentSafe()) return invalid("git-environment");

  activeRoots.add(projectRoot);
  let lock: RunLock;
  try {
    lock = acquireCandidateRunLock(projectRoot);
  } catch {
    activeRoots.delete(projectRoot);
    return stalePendingCandidate("LIVE_LOCK_UNAVAILABLE");
  }
  let resumed = false;
  try {
    try {
      assertGoverned(projectRoot, candidateGit);
    } catch {
      return stalePendingCandidate("WORKSPACE_CHANGED");
    }
    const sources = pendingAuthenticatedSources(inner.taskSpec);
    const contractSections = pendingContractSections(inner.taskSpec);
    if (!sources || !contractSections) return invalid("sources");
    const taskSpec = validateTaskSpec(inner.taskSpec, sources, contractSections);
    if (!taskSpec || !exactPendingJson(taskSpec, inner.taskSpec)) return invalid("task-spec");
    const evidence = restorePendingEvidencePlans(
      taskSpec,
      pendingKind === "q9" ? inner.initialEvidencePlan : inner.evidencePlan,
      inner.evidencePlan,
      pendingKind === "q9" ? inner.evidencePlanRevisionCustody : null,
      candidateRecord.runId as string,
    );
    if (!evidence) return invalid("evidence-plan-authority");
    const authority = evidence.currentAuthority;
    const initialAuthority = evidence.initialAuthority;
    const specSha256 = taskSpecSha256(taskSpec);
    const planSha256 = evidencePlanSha256(evidence.currentPlan);
    if (!authority || !specSha256 || !planSha256
      || candidateRecord.taskSpecSha256 !== specSha256
      || candidateRecord.evidencePlanSha256 !== planSha256) return invalid("authority");

    const start = parsePendingStart(inner.start);
    const route = parsePendingRoute(inner.route);
    const activities = parsePendingActivities(inner.activities);
    const taskPaths = parsePendingCandidatePaths(inner.taskPaths, 100, false);
    const protectedPaths = parsePendingCandidatePaths(inner.protectedPaths, 4096, true);
    const ownedPaths = parsePendingCandidatePaths(inner.ownedPaths, 16, true);
    if (!start || !route || !activities || !taskPaths || !protectedPaths || !ownedPaths
      || (inner.startHeadRef !== null && (typeof inner.startHeadRef !== "string"
        || !/^refs\/heads\/[A-Za-z0-9][A-Za-z0-9._\/-]*$/u.test(inner.startHeadRef)))) {
      return invalid("context-shapes");
    }
    const taskNumber = candidateRecord.taskNumber as number;
    const expectedOwnedPaths = [
      rel(projectRoot, paths.brief(projectRoot, taskNumber)),
      rel(projectRoot, paths.report(projectRoot, taskNumber)),
      rel(projectRoot, paths.log(projectRoot)),
    ].sort();
    if (!sameLines(ownedPaths, expectedOwnedPaths)) return invalid("owned-paths");
    const contract = composePendingContract(projectRoot, inner.contract, taskNumber, authority, start, route);
    if (!contract || contract.requestSha256 !== candidateRecord.requestSha256
      || contract.taskSpecSha256 !== candidateRecord.taskSpecSha256
      || contract.evidencePlanSha256 !== candidateRecord.evidencePlanSha256) {
      return invalid("contract");
    }
    const contractMarkdown = briefText(evidence.authorizedRevision === null ? contract : Object.freeze({
      ...contract,
      evidencePlan: evidence.initialPlan,
      evidencePlanSha256: initialAuthority.evidencePlanSha256,
    }), false);
    if (!validEvidence(inner.evidence) || typeof inner.attestationsCompleteForDone !== "boolean"
      || !Array.isArray(inner.attestations) || inner.attestations.length > 64
      || typeof inner.claimsText !== "string" || inner.claimsText.length > 262_144) {
      return invalid("evidence-context");
    }
    const processEvidence = Object.freeze(Object.fromEntries(Object.entries(inner.evidence as Record<string, number>)));
    const attestations = Object.freeze([...(inner.attestations as AdapterCommandAttestationV1[])]);
    const retainedQ9HarnessAttestations = !inner.attestationsCompleteForDone && attestations.length > 0
      && q9SerialHarnessGuardPresent() && q9HarnessRouteExact(route)
      && revisionBaseAttestationsValid(specSha256, evidence.initialPlan, attestations);
    const retainedAuthorizedRevisionBaseAttestations = evidence.authorizedRevision !== null
      && !inner.attestationsCompleteForDone && attestations.length > 0
      && revisionBaseAttestationsExact(specSha256, evidence.initialPlan, attestations);
    const retainedQ9FailureAttestations = pendingKind === "q9" && !inner.attestationsCompleteForDone
      && retainedQ9FailureAttestationsValid(specSha256, evidence.currentPlan, attestations);
    const retainedGuardedCairnBlockerAttestations = !inner.attestationsCompleteForDone
      && q9CairnBlockerRouteExact(route)
      && retainedQ9FailureAttestationsValid(specSha256, evidence.currentPlan, attestations);
    if (!inner.attestationsCompleteForDone && attestations.length !== 0
      && !retainedQ9HarnessAttestations && !retainedAuthorizedRevisionBaseAttestations
      && !retainedQ9FailureAttestations
      && !retainedGuardedCairnBlockerAttestations) {
      return invalid("attestation-completeness");
    }
    const decisions = pendingTransitionDecisions(inner.transitionHistory);
    if (!decisions) return invalid("transitions-shape");

    const roundZeroTaskPaths = roundOne ? pendingBundleTaskPaths(inner.round0Bundle) : taskPaths;
    if (!roundZeroTaskPaths) return invalid("round-zero-task-paths");
    const captureContext = Object.freeze({
      round: 0,
      baseHead: start.head,
      taskPaths: roundZeroTaskPaths,
      protectedPaths,
      ownedPaths,
    });
    const capture = roundOne ? null : captureSerialCandidateBundle(projectRoot, initialAuthority, captureContext);
    const capturedExact = capture?.eligible === true && exactPendingJson(capture.bundle, inner.round0Bundle);
    const bundle = capturedExact && capture?.eligible === true
      ? capture.bundle
      : roundOne || allowPreparedStopWorkspaceDrift
        ? restoreSerialCandidateBundleForPending(projectRoot, initialAuthority, inner.round0Bundle, captureContext)
        : null;
    if (!bundle || !exactPendingJson(bundle, inner.round0Bundle)) {
      return stalePendingCandidate("WORKSPACE_CHANGED");
    }
    const initialEligibilityRecord = repairLineage
      ? repairLineage.preRepairCandidate.repairEligibility
      : candidateRecord.repairEligibility;
    let repairEligibility: SerialCandidateV1["repairEligibility"] = null;
    if (initialEligibilityRecord !== null) {
      const ignoredBoundary = captureSerialCandidateIgnoredBoundary(projectRoot);
      const restoredEligibility = ignoredBoundary
        ? composeSerialCandidateRepairEligibility(projectRoot, ignoredBoundary, bundle)
        : roundOne || allowPreparedStopWorkspaceDrift
          ? restoreSerialCandidateRepairEligibilityForPending(bundle, initialEligibilityRecord)
          : null;
      if (!restoredEligibility || !exactPendingJson(restoredEligibility, initialEligibilityRecord)) {
        return stalePendingCandidate("WORKSPACE_CHANGED");
      }
      repairEligibility = restoredEligibility;
    }
    let initial = composeSerialCandidate(initialAuthority, {
      version: SERIAL_CANDIDATE_VERSION,
      runId,
      taskNumber,
      requestSha256: candidateRecord.requestSha256,
      claimsText: repairLineage
        ? canonicalClaimsText(repairLineage.preRepairCandidate.claims as TaskSpecWorkerClaims)
        : inner.claimsText,
      bundle,
      repairEligibility,
    });
    if (!initial) return invalid("initial-candidate");
    if (evidence.authorizedRevision !== null) {
      const revisedInitial = adoptSerialCandidateEvidencePlanRevision(initial, evidence.authorizedRevision);
      if (!revisedInitial) return invalid("evidence-plan-adoption");
      initial = revisedInitial;
      const restoredRevisionCustody = serialCandidateEvidencePlanRevisionCustody(initial);
      if (!restoredRevisionCustody
        || !exactPendingJson(restoredRevisionCustody, pendingKind === "q9"
          ? inner.evidencePlanRevisionCustody : null)) {
        return invalid("evidence-plan-revision-custody");
      }
    }
    const postRepairSealable = repairLineage?.postRepairCandidate ?? null;
    const initialSealable = inner.sealableCandidateSha256 === initial.candidateSha256
      && inner.sealableClaimsSha256 === initial.claimsSha256
      && inner.sealableBundleSha256 === initial.bundleSha256;
    const repairedSealable = postRepairSealable !== null
      && inner.sealableCandidateSha256 === postRepairSealable.candidateSha256
      && inner.sealableClaimsSha256 === postRepairSealable.claimsSha256
      && inner.sealableBundleSha256 === postRepairSealable.bundleSha256;
    if (!initialSealable && !repairedSealable) return invalid("sealable-hashes");
    const replayDecision = (
      source: SerialCandidateV1,
      decision: SerialCandidateTransitionDecisionV1,
    ): SerialCandidateV1 | null => {
      const transition = composeSerialCandidateTransition(source, {
        version: "cairn-serial-candidate-transition/v1",
        runId: source.runId,
        generation: source.generation,
        taskNumber: source.taskNumber,
        projectRootSha256: source.projectRootSha256,
        round: source.round,
        taskSpecSha256: source.taskSpecSha256,
        evidencePlanSha256: source.evidencePlanSha256,
        candidateSha256: source.candidateSha256,
        bundleSha256: source.bundleSha256,
        evidenceStateSha256: source.evidenceStateSha256,
        decision,
      });
      return transition ? advanceSerialCandidate(source, transition) : null;
    };
    let candidate = initial;
    const preRepairDecisions = repairLineage?.preRepairTransitionHistory ?? decisions;
    if (repairLineage && (preRepairDecisions.length > decisions.length
      || preRepairDecisions.some((decision, index) => decisions[index] !== decision))) {
      return invalid("repair-transition-boundary");
    }
    for (const decision of preRepairDecisions) {
      const next = replayDecision(candidate, decision);
      if (!next) return invalid("transition-replay");
      candidate = next;
    }
    if (repairLineage) {
      if (repairLineage.kind === "q9"
        && !exactPendingJson(pendingCandidateProjection(candidate), repairLineage.preRepairCandidate)) {
        const restoredPreRepairQ9 = restoreSerialCandidateQ9ForPending(
          candidate,
          repairLineage.preRepairCandidate,
          repairLineage.value.preRepairQ9Custody,
          composeSerialPendingRestoreAuthority(
            parsed.capsuleSha256,
            repairLineage.preRepairCandidate.projectRootSha256 as string,
            repairLineage.preRepairCandidate.runId as string,
            repairLineage.preRepairCandidate.candidateSha256 as string,
          ),
          parsed.capsuleSha256,
        );
        if (!restoredPreRepairQ9) return invalid("pre-repair-q9-custody");
        candidate = restoredPreRepairQ9;
      }
      if (!exactPendingJson(pendingCandidateProjection(candidate), repairLineage.preRepairCandidate)) {
        return invalid("pre-repair-candidate");
      }
      const repaired = restoreSerialCandidateAfterRepairForPending(projectRoot, candidate, {
        repairInstruction: repairLineage.value.repairInstruction,
        blockers: repairLineage.value.blockers,
        roundOneBundle: repairLineage.value.roundOneBundle,
        roundOneCaptureContext: repairLineage.value.roundOneCaptureContext,
        claimsText: repairLineage.value.claimsText,
      });
      if (!repaired
        || !exactPendingJson(pendingCandidateProjection(repaired), repairLineage.postRepairCandidate)) {
        return invalid("post-repair-candidate");
      }
      candidate = repaired;
      for (const decision of decisions.slice(preRepairDecisions.length)) {
        const next = replayDecision(candidate, decision);
        if (!next) return invalid("post-repair-transition-replay");
        candidate = next;
      }
    }
    if (pendingKind === "q9") {
      const restoredQ9 = restoreSerialCandidateQ9ForPending(
        candidate,
        candidateRecord,
        inner.q9Custody,
        composeSerialPendingRestoreAuthority(
          parsed.capsuleSha256,
          candidateRecord.projectRootSha256 as string,
          candidateRecord.runId as string,
          candidateRecord.candidateSha256 as string,
        ),
        parsed.capsuleSha256,
      );
      if (!restoredQ9) return invalid("q9-custody-replay");
      candidate = restoredQ9;
    }
    if (!exactPendingJson(pendingCandidateProjection(candidate), candidateRecord)) {
      return invalid("candidate-projection");
    }
    if (repairLineage) {
      const restoredRepairLineage = serialCandidatePendingRepairLineage(candidate);
      if (!restoredRepairLineage
        || !exactPendingJson(pendingRepairLineageProjection(restoredRepairLineage), repairLineage.value)
        || !sameLines(taskPaths, restoredRepairLineage.roundOneCaptureContext.taskPaths)
        || !sameLines(protectedPaths, restoredRepairLineage.roundOneCaptureContext.protectedPaths)
        || !sameLines(ownedPaths, restoredRepairLineage.roundOneCaptureContext.ownedPaths)
        || start.head !== restoredRepairLineage.roundOneCaptureContext.baseHead) {
        return invalid("repair-lineage-exact");
      }
    }
    if (!(pendingKind === "legacy" && preserveAuthenticatedLegacy)) {
      const publicRestoreAuthority = composeSerialPendingRestoreAuthority(
        parsed.capsuleSha256,
        candidate.projectRootSha256,
        candidate.runId,
        candidate.candidateSha256,
      );
      if (activateSerialCandidateAfterPendingRestore(
        candidate,
        publicRestoreAuthority,
        parsed.capsuleSha256,
      ) !== candidate) return invalid("restore-authority-gate");
    }
    const lineageIdentity = serialCandidateLineageIdentity(candidate);
    const liveAuthority = serialCandidateTaskSpecAuthority(candidate);
    const capturedOwnedRecordIndexAuthority = captureCandidateOwnedRecordIndexAuthority(
      projectRoot,
      taskNumber,
      contract.ownedRecords,
    );
    const ownedRecordIndexAuthority = capturedOwnedRecordIndexAuthority
      && exactPendingJson(capturedOwnedRecordIndexAuthority, inner.ownedRecordIndexAuthority)
      ? capturedOwnedRecordIndexAuthority
      : allowPreparedStopWorkspaceDrift
        ? preparedOwnedAuthority(inner.ownedRecordIndexAuthority)
        : null;
    if (!lineageIdentity || !liveAuthority || !ownedRecordIndexAuthority
      || !exactPendingJson(ownedRecordIndexAuthority, inner.ownedRecordIndexAuthority)) {
      return stalePendingCandidate("WORKSPACE_CHANGED");
    }
    if (!roundOne && inner.attestationsCompleteForDone
      && (composeBoundRunRecord(contract, "STOPPED", "MODEL_RESULT_NOT_VERIFIED", candidate.claims, attestations) === null
        || hasUnexpectedPlannedExit(contract, attestations))) {
      return invalid("attestations");
    }
    const context: OpenSerialCandidateContext = {
      projectRoot,
      start,
      startHeadRef: inner.startHeadRef as string | null,
      contract,
      contractMarkdown,
      route,
      activities,
      events: options.events,
      lock,
      released: false,
      taskPaths,
      protectedPaths,
      ownedPaths,
      ownedRecordIndexAuthority,
      claims: candidate.claims,
      attestations,
      attestationsCompleteForDone: inner.attestationsCompleteForDone,
      evidence: processEvidence,
      authority: liveAuthority,
      lineageIdentity,
      sealableCandidateSha256: inner.sealableCandidateSha256 as string,
      sealableClaimsSha256: inner.sealableClaimsSha256 as string,
      sealableBundleSha256: inner.sealableBundleSha256 as string,
      interruptedRepairStopOnly: allowPreparedStopWorkspaceDrift,
    };
    if (!serialCandidateGitEnvironmentSafe()
      || !candidateGitMetadataSafe(projectRoot, contract.ownedRecords)
      || (!allowPreparedStopWorkspaceDrift && (!candidateWorkspaceStillExact(candidate, context)
        || !candidateTaskPathSetStillExact(candidate, context)))
      || openSerialCandidates.has(runId)) return stalePendingCandidate("WORKSPACE_CHANGED");
    openSerialCandidates.set(runId, context);
    resumed = true;
    return Object.freeze({ status: "resumed", candidate });
  } catch {
    return invalid("exception");
  } finally {
    if (!resumed) {
      lock.release();
      activeRoots.delete(projectRoot);
    }
  }
}

function candidateOwnedRecordTopologySafe(
  root: string,
  contract: Pick<QualityBoundAdapterTaskContractV4, "taskNumber" | "ownedRecords">,
  allowExistingReport: boolean,
  allowMissingLog = false,
  allowMissingBrief = false,
): boolean {
  try {
    const reportRelative = rel(root, paths.report(root, contract.taskNumber));
    const briefRelative = rel(root, paths.brief(root, contract.taskNumber));
    const required = new Set([
      rel(root, paths.brief(root, contract.taskNumber)),
      rel(root, paths.log(root)),
    ]);
    const logRelative = rel(root, paths.log(root));
    const inodes = new Set<string>();
    for (const path of contract.ownedRecords) {
      let cursor = root;
      const parts = path.split("/");
      for (const part of parts.slice(0, -1)) {
        cursor = join(cursor, part);
        const parent = lstatSync(cursor, { bigint: true });
        if (!parent.isDirectory() || parent.isSymbolicLink()) return false;
      }
      const absolute = resolve(root, ...parts);
      let leaf: ReturnType<typeof lstatSync>;
      try {
        leaf = lstatSync(absolute, { bigint: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT"
          && (path === reportRelative && !required.has(path)
            || allowMissingLog && path === logRelative
            || allowMissingBrief && path === briefRelative)) continue;
        return false;
      }
      if (path === reportRelative && !allowExistingReport) return false;
      if (!leaf.isFile() || leaf.isSymbolicLink() || leaf.nlink !== 1n || leaf.ino === 0n) return false;
      const identity = `${leaf.dev.toString()}:${leaf.ino.toString()}`;
      if (inodes.has(identity)) return false;
      inodes.add(identity);
    }
    return true;
  } catch {
    return false;
  }
}

function candidateBaseOwnedTopologySafe(root: string): boolean {
  try {
    let cursor = root;
    for (const part of ["docs", "ai-work", "tasks"]) {
      cursor = join(cursor, part);
      const parent = lstatSync(cursor, { bigint: true });
      if (!parent.isDirectory() || parent.isSymbolicLink()) return false;
    }
    const log = lstatSync(paths.log(root), { bigint: true });
    return log.isFile() && !log.isSymbolicLink() && log.nlink === 1n && log.ino !== 0n;
  } catch {
    return false;
  }
}

function candidateTrackedParentsSafe(root: string): boolean {
  try {
    const tracked = candidateGitZ(root, ["ls-files", "-z"]);
    for (const path of tracked) {
      let cursor = root;
      for (const part of path.split("/").slice(0, -1)) {
        cursor = join(cursor, part);
        let parent: ReturnType<typeof lstatSync>;
        try {
          parent = lstatSync(cursor, { bigint: true });
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") break;
          return false;
        }
        if (!parent.isDirectory() || parent.isSymbolicLink()) return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

function candidateOwnedTextObservationNoFollow(
  path: string,
  expectedExecutable?: boolean,
): CandidateOwnedTextObservation {
  let descriptor: number | null = null;
  try {
    let named: ReturnType<typeof lstatSync>;
    try {
      named = lstatSync(path, { bigint: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return Object.freeze({ state: "missing" });
      }
      throw error;
    }
    if (!named.isFile() || named.isSymbolicLink() || named.nlink !== 1n || named.ino === 0n) {
      throw new Error("UNSAFE_CANDIDATE_OWNED_RECORD_TOPOLOGY");
    }
    descriptor = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const opened = fstatSync(descriptor, { bigint: true });
    const rebound = lstatSync(path, { bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n || opened.dev !== named.dev || opened.ino !== named.ino
      || rebound.dev !== opened.dev || rebound.ino !== opened.ino || rebound.nlink !== 1n) {
      throw new Error("UNSAFE_CANDIDATE_OWNED_RECORD_TOPOLOGY");
    }
    if (expectedExecutable !== undefined
      && ((Number(opened.mode) & 0o111) !== 0) !== expectedExecutable) {
      throw new Error("CANDIDATE_OWNED_RECORD_MODE_CHANGED");
    }
    const size = Number(opened.size);
    if (!Number.isSafeInteger(size) || size < 0) throw new Error("UNSAFE_CANDIDATE_OWNED_RECORD_SIZE");
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(descriptor, bytes, offset, bytes.length - offset, offset);
      if (count === 0) throw new Error("CANDIDATE_OWNED_RECORD_SHORT_READ");
      offset += count;
    }
    const after = fstatSync(descriptor, { bigint: true });
    const namedAfter = lstatSync(path, { bigint: true });
    if (after.dev !== opened.dev || after.ino !== opened.ino || after.nlink !== 1n
      || after.size !== opened.size || after.mtimeNs !== opened.mtimeNs || after.ctimeNs !== opened.ctimeNs
      || namedAfter.dev !== after.dev || namedAfter.ino !== after.ino || namedAfter.nlink !== 1n
      || namedAfter.size !== after.size || namedAfter.mtimeNs !== after.mtimeNs
      || namedAfter.ctimeNs !== after.ctimeNs) {
      throw new Error("CANDIDATE_OWNED_RECORD_CHANGED");
    }
    return Object.freeze({
      state: "regular",
      text: bytes.toString("utf8"),
      dev: opened.dev,
      ino: opened.ino,
      size: opened.size,
      mtimeNs: opened.mtimeNs,
      ctimeNs: opened.ctimeNs,
      mode: opened.mode,
    });
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
}

function candidateOwnedTextNoFollow(path: string, expectedExecutable?: boolean): string | null {
  const observed = candidateOwnedTextObservationNoFollow(path, expectedExecutable);
  return observed.state === "missing" ? null : observed.text;
}

/** Candidate record writes never follow a leaf link. `expectedCurrent === null`
 * is an exclusive create; a string is an exact byte compare-before-replace; an
 * observation additionally binds existence, inode, metadata, and bytes; and
 * `undefined` is retained only for the legacy pre-candidate recovery branch. */
function candidateWriteOwnedTextNoFollow(
  path: string,
  text: string,
  expectedCurrent: string | null | undefined | CandidateOwnedTextObservation,
  createMode?: "100644" | "100755",
): void {
  let descriptor: number | null = null;
  let created = false;
  const exactObserved = typeof expectedCurrent === "object" && expectedCurrent !== null
    ? expectedCurrent
    : null;
  try {
    let named: ReturnType<typeof lstatSync> | null = null;
    try {
      named = lstatSync(path, { bigint: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (named) {
      if (expectedCurrent === null || exactObserved?.state === "missing"
        || !named.isFile() || named.isSymbolicLink()
        || named.nlink !== 1n || named.ino === 0n) {
        throw new Error("UNSAFE_CANDIDATE_OWNED_RECORD_TOPOLOGY");
      }
      if (exactObserved?.state === "regular"
        && (named.dev !== exactObserved.dev || named.ino !== exactObserved.ino
          || named.size !== exactObserved.size || named.mtimeNs !== exactObserved.mtimeNs
          || named.ctimeNs !== exactObserved.ctimeNs || named.mode !== exactObserved.mode)) {
        throw new Error("CANDIDATE_OWNED_RECORD_CHANGED");
      }
      descriptor = openSync(path, constants.O_RDWR | (constants.O_NOFOLLOW ?? 0));
    } else {
      if (typeof expectedCurrent === "string" || exactObserved?.state === "regular") {
        throw new Error("CANDIDATE_OWNED_RECORD_CHANGED");
      }
      descriptor = openSync(
        path,
        constants.O_RDWR | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0),
        0o666,
      );
      created = true;
    }
    const opened = fstatSync(descriptor, { bigint: true });
    const rebound = lstatSync(path, { bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n || opened.ino === 0n
      || rebound.dev !== opened.dev || rebound.ino !== opened.ino || rebound.nlink !== 1n
      || (named && (opened.dev !== named.dev || opened.ino !== named.ino))) {
      throw new Error("UNSAFE_CANDIDATE_OWNED_RECORD_TOPOLOGY");
    }
    if (exactObserved?.state === "regular"
      && (opened.dev !== exactObserved.dev || opened.ino !== exactObserved.ino
        || opened.size !== exactObserved.size || opened.mtimeNs !== exactObserved.mtimeNs
        || opened.ctimeNs !== exactObserved.ctimeNs || opened.mode !== exactObserved.mode)) {
      throw new Error("CANDIDATE_OWNED_RECORD_CHANGED");
    }
    if (created && createMode !== undefined) {
      fchmodSync(descriptor, createMode === "100755" ? 0o755 : 0o644);
    }
    const expectedText = exactObserved?.state === "regular"
      ? exactObserved.text
      : typeof expectedCurrent === "string" ? expectedCurrent : null;
    if (!created && expectedText !== null) {
      const size = Number(opened.size);
      if (!Number.isSafeInteger(size) || size < 0) throw new Error("UNSAFE_CANDIDATE_OWNED_RECORD_SIZE");
      const bytes = Buffer.alloc(size);
      let offset = 0;
      while (offset < bytes.length) {
        const count = readSync(descriptor, bytes, offset, bytes.length - offset, offset);
        if (count === 0) throw new Error("CANDIDATE_OWNED_RECORD_SHORT_READ");
        offset += count;
      }
      if (bytes.toString("utf8") !== expectedText) throw new Error("CANDIDATE_OWNED_RECORD_CHANGED");
    }
    const beforeWrite = lstatSync(path, { bigint: true });
    if (beforeWrite.dev !== opened.dev || beforeWrite.ino !== opened.ino || beforeWrite.nlink !== 1n) {
      throw new Error("UNSAFE_CANDIDATE_OWNED_RECORD_TOPOLOGY");
    }
    ftruncateSync(descriptor, 0);
    const target = Buffer.from(text, "utf8");
    let writeOffset = 0;
    while (writeOffset < target.length) {
      writeOffset += writeSync(
        descriptor,
        target,
        writeOffset,
        target.length - writeOffset,
        writeOffset,
      );
    }
    // Terminal reconciliation treats exact report/LOG bytes as durable
    // effects. Flush each bound leaf before the next transaction step; a crash
    // between the two files remains an explicit manual-recovery state.
    fsyncSync(descriptor);
    const after = fstatSync(descriptor, { bigint: true });
    const namedAfter = lstatSync(path, { bigint: true });
    if (after.dev !== opened.dev || after.ino !== opened.ino || after.nlink !== 1n
      || namedAfter.dev !== after.dev || namedAfter.ino !== after.ino || namedAfter.nlink !== 1n
      || candidateOwnedTextNoFollow(path) !== text) {
      throw new Error("CANDIDATE_OWNED_RECORD_WRITE_CHANGED");
    }
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
}

function pendingSerialCandidateBoundaryIntact(
  root: string,
  start: GitSnapshot,
  startHeadRef: string | null,
  contract: QualityBoundAdapterTaskContractV4,
  contractMarkdown: string,
  ownedRecordIndexAuthority: CandidateOwnedRecordIndexAuthority,
): boolean {
  try {
    return candidateOwnedRecordTopologySafe(root, contract, false)
      && candidateGitMetadataSafe(root, contract.ownedRecords)
      && candidateOwnedRecordIndexStillExact(root, ownedRecordIndexAuthority)
      && candidateOwnedRecordWorktreeModesStillExact(root, ownedRecordIndexAuthority)
      && candidateProtectedBoundaryIntact(root, start, startHeadRef)
      && candidateOwnedTextNoFollow(paths.brief(root, contract.taskNumber)) === contractMarkdown
      && candidateOwnedTextNoFollow(paths.log(root)) === start.logText
      && candidateOwnedTextNoFollow(paths.report(root, contract.taskNumber)) === null;
  } catch {
    return false;
  }
}

function candidateProtectedBoundaryIntact(
  root: string,
  start: GitSnapshot,
  startHeadRef: string | null,
): boolean {
  try {
    return serialCandidateGitEnvironmentSafe()
      && protectedStartingPathsOrNull(root, start) === true
      && candidateGit(root, ["rev-parse", "HEAD"]) === start.head
      && currentSymbolicHead(root) === startHeadRef;
  } catch {
    return false;
  }
}

function currentCandidateTaskPaths(
  candidate: SerialCandidateV1,
  context: OpenSerialCandidateContext,
): readonly string[] | null {
  if (candidate.round === 0) return context.taskPaths;
  // A terminal token temporarily reserves the lineage, so the public
  // current-candidate predicate (and therefore the pending-lineage projection)
  // is intentionally false during the record write. The branded round-one
  // bundle itself still carries the exact captured path set needed for the
  // pre/post STOP observation.
  return candidate.callsUsed.repair === 1
    ? Object.freeze(candidate.bundle.entries.map((entry) => entry.projectRelativePath))
    : null;
}

function candidateProductBundleStillExact(candidate: SerialCandidateV1, context: OpenSerialCandidateContext): boolean {
  try {
    if (!serialCandidateWorkspaceStillExact(context.projectRoot, candidate)) return false;
    const taskPaths = currentCandidateTaskPaths(candidate, context);
    return taskPaths !== null;
  } catch {
    return false;
  }
}

function candidateWorkspaceStillExact(candidate: SerialCandidateV1, context: OpenSerialCandidateContext): boolean {
  try {
    return pendingSerialCandidateBoundaryIntact(
      context.projectRoot,
      context.start,
      context.startHeadRef,
      context.contract,
      context.contractMarkdown,
      context.ownedRecordIndexAuthority,
    )
      && candidateProductBundleStillExact(candidate, context);
  } catch {
    return false;
  }
}

function candidateTaskPathSetStillExact(
  candidate: SerialCandidateV1,
  context: OpenSerialCandidateContext,
): boolean {
  const expectedTaskPaths = currentCandidateTaskPaths(candidate, context);
  if (!expectedTaskPaths) return false;
  const changed = candidateScanChangedPaths(context.projectRoot, context.contract.ownedRecords);
  if (changed === null) return false;
  const key = (path: string): string => process.platform === "win32" ? path.toLowerCase() : path;
  const owned = new Set(context.ownedPaths.map(key));
  const protectedPaths = new Set(context.protectedPaths.map(key));
  const currentTaskPaths = changed.filter((path) => {
    const value = key(path);
    return !owned.has(value) && !protectedPaths.has(value);
  });
  return sameLines(currentTaskPaths, expectedTaskPaths);
}

/** A STOP intentionally leaves candidate product bytes in place, so its record
 * append must first prove no product inode aliases a Cairn-owned record. A
 * failed proof leaves the candidate and lock current; writing an "honest" row
 * through a hardlink would itself mutate the retained product. */
function candidateTerminalPathsUnaliased(
  candidate: SerialCandidateV1,
  context: OpenSerialCandidateContext,
  allowMissingLog = false,
  allowMissingProduct = false,
): boolean {
  try {
    if (!candidateOwnedRecordTopologySafe(context.projectRoot, context.contract, true, allowMissingLog)) return false;
    const ownedKeys = new Set(context.ownedPaths.map((path) => process.platform === "win32" ? path.toLowerCase() : path));
    const optionalMissing = new Set([rel(
      context.projectRoot,
      paths.report(context.projectRoot, context.contract.taskNumber),
    )]);
    if (allowMissingLog) optionalMissing.add(rel(context.projectRoot, paths.log(context.projectRoot)));
    const inodes = new Set<string>();
    const inspect = (path: string, mayBeMissing: boolean): boolean => {
      let info: ReturnType<typeof lstatSync>;
      try {
        info = lstatSync(resolve(context.projectRoot, ...path.split("/")), { bigint: true });
      } catch (error) {
        return mayBeMissing && (error as NodeJS.ErrnoException).code === "ENOENT";
      }
      if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1n || info.ino === 0n) return false;
      const identity = `${info.dev.toString()}:${info.ino.toString()}`;
      if (inodes.has(identity)) return false;
      inodes.add(identity);
      return true;
    };
    for (const entry of candidate.bundle.entries) {
      if (candidateBundlePathWithRealParents(context.projectRoot, entry.projectRelativePath) === null) return false;
      const key = process.platform === "win32"
        ? entry.projectRelativePath.toLowerCase()
        : entry.projectRelativePath;
      if (ownedKeys.has(key)) return false;
      if (!inspect(entry.projectRelativePath, entry.state === "deleted" || allowMissingProduct)) return false;
      if (candidateBundlePathWithRealParents(context.projectRoot, entry.projectRelativePath) === null) return false;
    }
    for (const path of context.ownedPaths) {
      if (!inspect(path, optionalMissing.has(path))) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** A captured regular product may be intentionally absent when the owner asks
 * Cairn to STOP, but that liveness exception must not turn a product move onto
 * an owned record into overwrite authority. Before any recovery or terminal
 * write, the pending brief/report/LOG state stays exact (apart from one safely
 * missing LOG under already-verified real parents) and the owned stage-0 index
 * remains the frozen starting index. */
function candidateMissingRegularProductOwnedStateSafe(
  candidate: SerialCandidateV1,
  context: OpenSerialCandidateContext,
): boolean {
  try {
    let missingRegular = false;
    for (const entry of candidate.bundle.entries) {
      if (entry.state !== "regular-file") continue;
      const absolute = candidateBundlePathWithRealParents(context.projectRoot, entry.projectRelativePath);
      if (absolute === null) return false;
      try {
        lstatSync(absolute, { bigint: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") return false;
        missingRegular = true;
      }
    }
    if (!missingRegular) return true;
    if (!candidateOwnedRecordIndexStillExact(context.projectRoot, context.ownedRecordIndexAuthority)
      || !candidateOwnedRecordTopologySafe(context.projectRoot, context.contract, false, true)) return false;
    const brief = candidateOwnedTextNoFollow(paths.brief(context.projectRoot, context.contract.taskNumber));
    const report = candidateOwnedTextNoFollow(paths.report(context.projectRoot, context.contract.taskNumber));
    const log = candidateOwnedTextNoFollow(paths.log(context.projectRoot));
    return brief === context.contractMarkdown && report === null
      && (log === context.start.logText || log === null);
  } catch {
    return false;
  }
}

function candidateOwnedRecordBlobs(
  context: OpenSerialCandidateContext,
  records: Readonly<{ reportText: string; row: LogRow }>,
): readonly CandidateOwnedRecordBlob[] {
  const terminalMode = (projectRelativePath: string): "100644" | "100755" => {
    const value = context.ownedRecordIndexAuthority.find((item) => item.projectRelativePath === projectRelativePath);
    if (!value) throw new Error("MISSING_CANDIDATE_OWNED_RECORD_MODE");
    return value.terminalMode;
  };
  const briefRelative = rel(context.projectRoot, paths.brief(context.projectRoot, context.contract.taskNumber));
  const reportRelative = rel(context.projectRoot, paths.report(context.projectRoot, context.contract.taskNumber));
  const logRelative = rel(context.projectRoot, paths.log(context.projectRoot));
  return Object.freeze([
    Object.freeze({
      projectRelativePath: briefRelative,
      text: context.contractMarkdown,
      gitMode: terminalMode(briefRelative),
    }),
    Object.freeze({
      projectRelativePath: reportRelative,
      text: records.reportText,
      gitMode: terminalMode(reportRelative),
    }),
    Object.freeze({
      projectRelativePath: logRelative,
      text: context.start.logText + expectedLogLine(records.row),
      gitMode: terminalMode(logRelative),
    }),
  ]);
}

/** Post-record terminal boundary. Unlike the pending boundary, the report and
 * appended row are expected; every other starting path, HEAD/ref, candidate
 * byte/mode/deletion, and exact owned record byte remains frozen. */
function candidateTerminalBoundaryIntact(
  candidate: SerialCandidateV1,
  context: OpenSerialCandidateContext,
  records: Readonly<{ reportText: string; row: LogRow }>,
): boolean {
  try {
    const ownedRecords = candidateOwnedRecordBlobs(context, records);
    const checks = Object.freeze({
      metadata: candidateGitMetadataSafe(context.projectRoot, context.contract.ownedRecords),
      ownedIndex: candidateOwnedRecordIndexStillExact(context.projectRoot, context.ownedRecordIndexAuthority),
      head: candidateGit(context.projectRoot, ["rev-parse", "HEAD"]) === context.start.head,
      headRef: currentSymbolicHead(context.projectRoot) === context.startHeadRef,
      protected: protectedStartingPathsOrNull(context.projectRoot, context.start) === true,
      taskPaths: candidateTaskPathSetStillExact(candidate, context),
      bundleBytes: candidateBundleWorktreeBytesStillExact(context.projectRoot, candidate.bundle),
      bundleIndex: candidateBundleIndexStateStillExact(context.projectRoot, candidate.bundle),
      ownedRecords: candidateOwnedRecordsStillExact(context.projectRoot, ownedRecords),
      unaliased: candidateTerminalPathsUnaliased(candidate, context),
    });
    return Object.values(checks).every(Boolean);
  } catch {
    return false;
  }
}

interface CandidateStopObservation {
  nonOwnedChangedPaths: readonly string[];
  reportFilesChanged: readonly string[];
  custody: CandidateCustodyObservation;
}

/** STOP has already-authorized owned report/LOG bytes after its first write, so
 * its workspace class is derived from the exact non-owned task set plus every
 * captured product worktree/index state. The pending-candidate recapture is
 * intentionally not used here: it would misclassify Cairn's own record write
 * as candidate product drift. */
function observeCandidateStopCustody(
  candidate: SerialCandidateV1,
  context: OpenSerialCandidateContext,
): CandidateCustodyObservation {
  const availability = serialCandidateRepairAvailability(candidate);
  let workspaceExact = false;
  let ignoredExact = false;
  try {
    workspaceExact = candidateTaskPathSetStillExact(candidate, context)
      && candidateBundleWorktreeBytesStillExact(context.projectRoot, candidate.bundle)
      && candidateBundleIndexStateStillExact(context.projectRoot, candidate.bundle);
    ignoredExact = captureSerialCandidateIgnoredBoundary(context.projectRoot) !== null;
  } catch { /* fixed redacted custody below remains fail-closed */ }
  return composeCandidateCustodyObservation(candidate, availability, workspaceExact, ignoredExact);
}

function observeCandidateStop(
  candidate: SerialCandidateV1,
  context: OpenSerialCandidateContext,
): CandidateStopObservation | null {
  const changed = candidateScanChangedPaths(context.projectRoot, context.contract.ownedRecords);
  if (changed === null) return null;
  const key = (path: string): string => process.platform === "win32" ? path.toLowerCase() : path;
  const owned = new Set(context.ownedPaths.map(key));
  return Object.freeze({
    nonOwnedChangedPaths: Object.freeze(changed.filter((path) => !owned.has(key(path)))),
    reportFilesChanged: candidateReportChangedPaths(changed),
    custody: observeCandidateStopCustody(candidate, context),
  });
}

function sameCandidateStopObservation(
  left: CandidateStopObservation,
  right: CandidateStopObservation,
): boolean {
  return sameLines(left.nonOwnedChangedPaths, right.nonOwnedChangedPaths)
    && left.custody.workspaceExact === right.custody.workspaceExact
    && left.custody.ignoredExact === right.custody.ignoredExact
    && left.custody.custody.repairEligibility === right.custody.custody.repairEligibility;
}

function candidateStopBoundaryIntact(
  candidate: SerialCandidateV1,
  context: OpenSerialCandidateContext,
  records: Readonly<{ reportText: string; row: LogRow }>,
  headBeforeWrite: string,
  refBeforeWrite: string | null,
  protectedPathsExactBeforeWrite: boolean,
  observationBeforeWrite: CandidateStopObservation,
): boolean {
  try {
    const protectedPathsExactAfterWrite = protectedStartingPathsOrNull(context.projectRoot, context.start);
    const observationAfterWrite = observeCandidateStop(candidate, context);
    const checks = Object.freeze({
      protectedReadable: protectedPathsExactAfterWrite !== null,
      protectedStable: protectedPathsExactAfterWrite === protectedPathsExactBeforeWrite,
      observationReadable: observationAfterWrite !== null,
      observationStable: observationAfterWrite !== null
        && sameCandidateStopObservation(observationAfterWrite, observationBeforeWrite),
      metadata: candidateGitMetadataSafe(context.projectRoot, context.contract.ownedRecords),
      ownedIndex: candidateOwnedRecordIndexStillExact(context.projectRoot, context.ownedRecordIndexAuthority),
      head: candidateGit(context.projectRoot, ["rev-parse", "HEAD"]) === headBeforeWrite,
      headRef: currentSymbolicHead(context.projectRoot) === refBeforeWrite,
      ownedRecords: candidateOwnedRecordsStillExact(context.projectRoot, candidateOwnedRecordBlobs(context, records)),
      unaliased: candidateTerminalPathsUnaliased(candidate, context, false, true),
    });
    return Object.values(checks).every(Boolean);
  } catch {
    return false;
  }
}

function candidateRecordRecovery(
  candidate: SerialCandidateV1,
  context: OpenSerialCandidateContext,
): RecordRecovery | null | undefined {
  try {
    // This is deliberately repeated after the earlier STOP preflight. A
    // missing captured product must not be moved onto report/LOG during the
    // intervening workspace observation and become overwrite authority.
    if (!candidateMissingRegularProductOwnedStateSafe(candidate, context)
      || !candidateOwnedRecordTopologySafe(context.projectRoot, context.contract, true, true)) return null;
    const logPath = paths.log(context.projectRoot);
    const reportPath = paths.report(context.projectRoot, context.contract.taskNumber);
    const reportObserved = candidateOwnedTextObservationNoFollow(reportPath);
    const logObserved = candidateOwnedTextObservationNoFollow(logPath);
    if (!candidateMissingRegularProductOwnedStateSafe(candidate, context)
      || !candidateOwnedRecordTopologySafe(context.projectRoot, context.contract, true, true)) return null;
    const reportText = reportObserved.state === "missing" ? null : reportObserved.text;
    const logText = logObserved.state === "missing" ? null : logObserved.text;
    if (reportText === null && logText === context.start.logText) return undefined;

    const logRelative = rel(context.projectRoot, logPath);
    const authority = context.ownedRecordIndexAuthority.find((value) => value.projectRelativePath === logRelative);
    if (!authority) return null;
    const disclosures: string[] = [];
    if (logText !== context.start.logText) {
      disclosures.push(
        "The append-only work log changed while this candidate was pending; Cairn restored the task-start snapshot before recording this stop. " +
        "Candidate product files remain untouched for inspection.",
      );
    }
    const overwriteReport = reportText !== null;
    if (overwriteReport) disclosures.push("The pending task report path was already present; Cairn replaced it with this honest stop record.");
    return {
      disclosure: disclosures.length > 0 ? disclosures.join(" ") : null,
      overwriteReport,
      candidateObserved: Object.freeze({
        report: reportObserved,
        log: logObserved,
        logCreateMode: authority.terminalMode,
      }),
    };
  } catch {
    return null;
  }
}

function validCandidateStopReason(value: unknown): value is SerialStopReason {
  return value === "ADAPTER_FAILED" || value === "INVALID_ADAPTER_RESULT" || value === "PROTECTED_WORK_CHANGED"
    || value === "RECORD_VERIFICATION_FAILED" || value === "WORKER_CLAIMS_MISSING"
    || value === "REAL_MODEL_CALL_NOT_AUTHORIZED" || value === "MODEL_REPORTED_STOPPED"
    || value === "MODEL_RESULT_NOT_VERIFIED" || value === "Q9_CRITIC_CALLS_EXHAUSTED"
    || value === "Q9_REQUIRED_CHECK_STILL_FAILED" || value === "Q9_NATIVE_BOUNDARY_STOPPED"
    || value === "Q9_REQUIRED_EVIDENCE_INCOMPLETE" || value === "Q9_WORKFLOW_VERIFICATION_FAILED"
    || value === "ADAPTER_TIMED_OUT" || value === "CANCELLED_BY_OWNER";
}

export function previewSerialRoute(intent: TaskIntent, adapters: readonly TaskAdapter[], adapterId?: string): RouteResult {
  if (taskRequestSha256(intent) === null) throw new Error("INVALID_TASK_INTENT");
  return routeTask({ outcome: intent.outcome.text, capability: "serial-task" }, adapters, adapterId);
}

export function previewSerialCandidateRoute(
  intent: TaskIntent,
  authority: SerialCandidateTaskSpecAuthorityV1,
  adapters: readonly TaskAdapter[],
  writerIsolation: SerialCandidateWriterIsolationV1,
  adapterId?: string,
): RouteResult {
  if (!serialCandidateAuthorityFor(intent, authority)) throw new Error("INVALID_SERIAL_CANDIDATE_AUTHORITY");
  if (authority.evidencePlan.revision !== 0) {
    throw new Error("UNSUPPORTED_SERIAL_CANDIDATE_EVIDENCE_REVISION");
  }
  if (!candidateWriterIsolationBinding(writerIsolation)) {
    throw new Error("INVALID_SERIAL_CANDIDATE_WRITER_ISOLATION");
  }
  return routeTask(
    { outcome: intent.outcome.text, capability: "serial-task" },
    candidateCapableAdapters(adapters, writerIsolation),
    adapterId,
  );
}

/** Core source-test state preview; non-sandbox receipts never enter Q7. */
export function previewSerialCandidateRouteForStateTest(
  intent: TaskIntent,
  authority: SerialCandidateTaskSpecAuthorityV1,
  adapters: readonly TaskAdapter[],
  writerIsolation: SerialCandidateWriterIsolationV1,
  adapterId?: string,
): RouteResult {
  if (!serialCandidateAuthorityFor(intent, authority)) throw new Error("INVALID_SERIAL_CANDIDATE_AUTHORITY");
  if (authority.evidencePlan.revision !== 0) {
    throw new Error("UNSUPPORTED_SERIAL_CANDIDATE_EVIDENCE_REVISION");
  }
  if (!candidateStateTestWriterIsolationBinding(writerIsolation)) {
    throw new Error("INVALID_SERIAL_CANDIDATE_STATE_TEST_WRITER_ISOLATION");
  }
  return routeTask(
    { outcome: intent.outcome.text, capability: "serial-task" },
    candidateCapableAdapters(adapters, writerIsolation, undefined, true),
    adapterId,
  );
}

export function previewTaskSpecSerialRoute(
  intent: TaskIntent,
  authority: SerialTaskSpecAuthorityV1,
  adapters: readonly TaskAdapter[],
  adapterId?: string,
): RouteResult {
  if (!serialTaskSpecAuthorityFor(intent, authority)) throw new Error("INVALID_TASK_SPEC_AUTHORITY");
  return routeTask({
    outcome: intent.outcome.text,
    capability: "serial-task",
    requiredCommandEventRepresentation: CANONICAL_EVIDENCE_COMMAND_EVENT_REPRESENTATION,
  }, adapters, adapterId);
}

export async function runSerialTaskToCandidate(
  root: string,
  intent: TaskIntent,
  options: SerialCandidateRunOptions,
): Promise<SerialCandidateRunResult> {
  return runSerialTaskToCandidateInternal(root, intent, options, false);
}

/** Core state runner. The package root exposes it only alongside the Q9
 * environment-gated fake isolation mint; normal writer receipts are rejected. */
export async function runSerialTaskToCandidateForStateTest(
  root: string,
  intent: TaskIntent,
  options: SerialCandidateRunOptions,
): Promise<SerialCandidateRunResult> {
  return runSerialTaskToCandidateInternal(root, intent, options, true);
}

async function runSerialTaskToCandidateInternal(
  root: string,
  intent: TaskIntent,
  options: SerialCandidateRunOptions,
  stateTest: boolean,
): Promise<SerialCandidateRunResult> {
  const requestSha256 = taskRequestSha256(intent);
  if (requestSha256 === null) throw new Error("INVALID_TASK_INTENT");
  const authority = serialCandidateAuthorityFor(intent, options.authority);
  if (!authority) throw new Error("INVALID_SERIAL_CANDIDATE_AUTHORITY");
  if (authority.evidencePlan.revision !== 0) {
    throw new Error("UNSUPPORTED_SERIAL_CANDIDATE_EVIDENCE_REVISION");
  }
  const projectRoot = resolve(root);
  const writerIsolation = stateTest
    ? candidateStateTestWriterIsolationBinding(options.writerIsolation, projectRoot)
    : candidateWriterIsolationBinding(options.writerIsolation, projectRoot);
  if (!writerIsolation || !options.adapters.includes(writerIsolation.adapter)) {
    throw new Error("INVALID_SERIAL_CANDIDATE_WRITER_ISOLATION");
  }
  if (activeRoots.has(projectRoot)) throw new Error("SERIAL_RUN_ACTIVE: One task is already running for this project.");
  if (!serialCandidateGitEnvironmentSafe()) throw new Error("UNSAFE_SERIAL_CANDIDATE_GIT_ENVIRONMENT");
  const candidateEnvironmentStart = candidateGitEnvironmentSnapshot();
  assertGoverned(projectRoot, candidateGit);
  const activities: SerialActivity[] = [];
  const eligibleAdapters = candidateCapableAdapters(options.adapters, options.writerIsolation, projectRoot, stateTest);
  const route = routeTask(
    { outcome: intent.outcome.text, capability: "serial-task" },
    eligibleAdapters,
    options.adapterId,
  );
  emit(activities, options.events, {
    stage: "Route",
    state: route.status === "ready" ? "done" : "stopped",
    detail: route.reason,
  });
  if (!serialCandidateGitEnvironmentSafe()) {
    restoreCandidateGitEnvironment(candidateEnvironmentStart);
    throw new Error("UNSAFE_SERIAL_CANDIDATE_GIT_ENVIRONMENT");
  }
  if (route.status === "connection-required") {
    restoreCandidateGitEnvironment(candidateEnvironmentStart);
    return { status: "connection-required", route, activities: candidateActivityView(activities) };
  }

  activeRoots.add(projectRoot);
  let lock: RunLock;
  try {
    lock = acquireCandidateRunLock(projectRoot);
  } catch (error) {
    activeRoots.delete(projectRoot);
    restoreCandidateGitEnvironment(candidateEnvironmentStart);
    throw error;
  }
  let keepOpen = false;
  let unconfirmedKill = false;
  try {
    if (!serialCandidateGitEnvironmentSafe()) throw new Error("UNSAFE_SERIAL_CANDIDATE_GIT_ENVIRONMENT");
    const chosen = eligibleAdapters.find((adapter) => adapter.descriptor.id === route.recommended.id);
    if (!chosen) throw new Error("ROUTE_ADAPTER_MISSING");
    if (!candidateBaseOwnedTopologySafe(projectRoot)) {
      throw new Error("UNSAFE_SERIAL_CANDIDATE_OWNED_RECORD_TOPOLOGY");
    }
    if (!candidateGitMetadataSafe(projectRoot, Object.freeze([]))) {
      throw new Error("UNSAFE_SERIAL_CANDIDATE_GIT_METADATA");
    }
    if (!candidateTrackedParentsSafe(projectRoot)) {
      throw new Error("UNSAFE_CANDIDATE_PROTECTED_PARENT");
    }
    const taskNumber = nextTaskNumber(projectRoot);
    const owned = [
      rel(projectRoot, paths.brief(projectRoot, taskNumber)),
      rel(projectRoot, paths.report(projectRoot, taskNumber)),
      rel(projectRoot, paths.log(projectRoot)),
    ];
    if (!candidateOwnedRecordTopologySafe(
      projectRoot,
      { taskNumber, ownedRecords: owned },
      false,
      false,
      true,
    )) {
      throw new Error("UNSAFE_SERIAL_CANDIDATE_OWNED_RECORD_TOPOLOGY");
    }
    const start = candidateSnapshot(projectRoot, owned);
    const startHeadRef = currentSymbolicHead(projectRoot);
    const ownedRecordIndexAuthority = captureCandidateOwnedRecordIndexAuthority(projectRoot, taskNumber, owned);
    if (!ownedRecordIndexAuthority) {
      throw new Error("UNSAFE_SERIAL_CANDIDATE_OWNED_RECORD_INDEX");
    }
    // This opaque, bounded pre-call fact never retains ignored names or bytes.
    // A null boundary still permits a candidate, but permanently disables its
    // repair path because ignored writes cannot be proven absent.
    const ignoredBoundary = captureSerialCandidateIgnoredBoundary(projectRoot);
    mkdirSync(paths.tasks(projectRoot), { recursive: true });
    if (!candidateGitMetadataSafe(projectRoot, owned)) {
      throw new Error("UNSAFE_SERIAL_CANDIDATE_GIT_METADATA");
    }
    const contract: QualityBoundAdapterTaskContractV4 = {
      version: "cairn-serial-task/v4",
      taskNumber,
      intent,
      requestSha256,
      supportedOutcome: CANDIDATE_SUPPORTED_OUTCOME,
      lane: "Standard",
      route: {
        adapterId: route.recommended.id,
        adapterLabel: route.recommended.label,
        provider: route.recommended.provider,
        model: route.recommended.model,
        reason: route.reason,
      },
      ownedRecords: owned,
      protectedGit: {
        head: start.head,
        dirty: start.status.length > 0,
        staged: start.staged.length > 0,
      },
      taskSpec: authority.taskSpec,
      taskSpecSha256: authority.taskSpecSha256,
      taskSpecReview: authority.taskSpecReview,
      evidencePlan: authority.evidencePlan,
      evidencePlanSha256: authority.evidencePlanSha256,
      checks: [],
      envelopeChecks: [
        `Confirm exactly one ${route.recommended.label} Builder returns one completed Task-Spec-bound result.`,
        "Confirm protected starting work, Cairn-owned records, and the exact Git-visible task path set remain isolated.",
        "Capture and hash one pre-seal candidate without writing a report, log row, DONE disposition, or commit.",
      ],
      stopConditions: [
        "The Builder fails, returns an invalid result, omits strict Task-Spec claims, or claims STOPPED.",
        "Protected work, HEAD, or a Cairn-owned record changes unexpectedly.",
        "The exact candidate path set cannot be classified and captured losslessly.",
      ],
    };
    const contractMarkdown = briefText(contract, false);
    writeFileSync(paths.brief(projectRoot, taskNumber), contractMarkdown, { encoding: "utf8", flag: "wx" });

    emit(activities, options.events, {
      stage: "Run",
      state: "working",
      detail: `Running one confirmed ${contract.route.adapterLabel} Builder request into pre-seal custody.`,
    });
    let adapterValue: unknown;
    let observedQ9HarnessFailure: Q9E2eHarnessFailureResultV1 | null = null;
    let observedQ9CairnBlocker: Q9E2eCairnBlockerResultV1 | null = null;
    try {
      if (serialCandidateAuthorityFor(intent, authority) !== authority) throw new WorkerBoundaryError("INVALID_SERIAL_CANDIDATE_AUTHORITY");
      const liveIsolation = stateTest
        ? candidateStateTestWriterIsolationBinding(options.writerIsolation, projectRoot)
        : candidateWriterIsolationBinding(options.writerIsolation, projectRoot);
      if (!liveIsolation || liveIsolation.adapter !== chosen) {
        throw new WorkerBoundaryError("INVALID_SERIAL_CANDIDATE_WRITER_ISOLATION");
      }
      const frozenContract = freezeContract(contract);
      if (taskAdapterQ9E2eFakeCandidateBoundTo(
        chosen,
        liveIsolation.projectRootReal,
        liveIsolation.excludedUserDataRootReal,
      ) && !authorizeTaskAdapterQ9E2eCandidateRun(
        chosen,
        frozenContract,
        liveIsolation.projectRootReal,
        liveIsolation.excludedUserDataRootReal,
      )) throw new WorkerBoundaryError("Q9_E2E_FAKE_WRITER_NOT_AUTHORIZED");
      adapterValue = await chosen.run(frozenContract, options.signal);
      observedQ9HarnessFailure = taskAdapterQ9E2eHarnessFailureResult(chosen, adapterValue);
      observedQ9CairnBlocker = taskAdapterQ9E2eCairnBlockerResult(chosen, adapterValue);
    } catch (error) {
      if (!serialCandidateGitEnvironmentSafe()) {
        throw new Error("UNSAFE_SERIAL_CANDIDATE_GIT_ENVIRONMENT");
      }
      if (!candidateOwnedRecordTopologySafe(projectRoot, contract, true)
        || !candidateGitMetadataSafe(projectRoot, owned)) {
        throw new Error("UNSAFE_SERIAL_CANDIDATE_POST_BUILDER_BOUNDARY");
      }
      const reason: SerialStopReason = error instanceof WorkerBoundaryError
        ? "REAL_MODEL_CALL_NOT_AUTHORIZED"
        : error instanceof WorkerProcessError
          ? error.failure === "timeout"
            ? "ADAPTER_TIMED_OUT"
            : error.failure === "cancelled"
              ? "CANCELLED_BY_OWNER"
              : "ADAPTER_FAILED"
          : "ADAPTER_FAILED";
      const processFailure: ProcessFailureNote | undefined = error instanceof WorkerProcessError
        ? { code: error.code, debugPath: error.debugPath }
        : undefined;
      const orphanRisk = error instanceof WorkerProcessError
        && (error.failure === "timeout" || error.failure === "cancelled") && error.killConfirmed === false;
      if (orphanRisk) unconfirmedKill = true;
      emit(activities, options.events, { stage: "Run", state: "stopped", detail: `The Builder stopped safely (${reason}).` });
      const candidateFilesChanged = candidateScanChangedPaths(projectRoot, contract.ownedRecords);
      const protectedPathsExact = protectedStartingPathsOrNull(projectRoot, start);
      if (candidateFilesChanged === null || protectedPathsExact === null) {
        const restored = restoreCandidateLogBeforeThrow(projectRoot, start);
        throw recordVerificationFailed("Git could not be read to compose this Builder stop.", restored);
      }
      const facts = {
        filesChanged: candidateReportChangedPaths(candidateFilesChanged),
        protectedIntact: protectedPathsExact
          && candidateProtectedBoundaryIntact(projectRoot, start, startHeadRef),
      };
      const closed = writeSafetyRecordsWhenUnclaimed(
        projectRoot, contract, false, reason, start, false, undefined, processFailure, orphanRisk,
        facts.filesChanged, facts.protectedIntact,
      );
      if (!closed?.verified) {
        const restored = restoreCandidateLogBeforeThrow(projectRoot, start);
        throw recordVerificationFailed("Builder evidence was retained without overwrite.", restored);
      }
      emit(activities, options.events, { stage: "Result", state: "stopped", detail: `STOPPED — ${stopReasonInPlainWords(reason)}` });
      return {
        status: "stopped", reason, taskNumber, disposition: "STOPPED",
        briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
        reportText: closed.reportText, row: closed.row, route, activities: candidateActivityView(activities),
        commit: { status: "skipped", reason: "Stopped Builder evidence was retained for inspection." },
        composed: composedForClose(contract, "STOPPED", reason, {
          claims: null,
          filesChanged: facts.filesChanged,
          protectedIntact: facts.protectedIntact,
          commit: null,
          evidenceSummary: null,
          processFailure: processFailure ?? null,
          paidCallStarted: paidCallAlreadyStarted(false, reason, processFailure),
        }),
      };
    }

    if (!serialCandidateGitEnvironmentSafe()) {
      throw new Error("UNSAFE_SERIAL_CANDIDATE_GIT_ENVIRONMENT");
    }
    if (!candidateOwnedRecordTopologySafe(projectRoot, contract, true)
      || !candidateGitMetadataSafe(projectRoot, owned)) {
      throw new Error("UNSAFE_SERIAL_CANDIDATE_POST_BUILDER_BOUNDARY");
    }

    emit(activities, options.events, {
      stage: "Run",
      state: "done",
      detail: `One ${contract.route.adapterLabel} Builder process returned bounded evidence.`,
    });
    emit(activities, options.events, { stage: "Check", state: "working", detail: "Checking the pre-seal result and candidate custody." });
    const workerResult = parseWorkerResult(adapterValue, contract);
    const qualityResult = workerResult?.kind === "worker-result/v3" ? workerResult : null;
    if (workerResult) emit(activities, options.events, { stage: "Check", state: "working", detail: boundedEvidenceSummary(workerResult.evidence) });
    const protectedStarting = protectedStartingPathsOrNull(projectRoot, start);
    if (protectedStarting === null) {
      const restored = restoreCandidateLogBeforeThrow(projectRoot, start);
      throw recordVerificationFailed("Git could not verify protected starting work after the Builder returned.", restored);
    }
    const taskSpecClaims = qualityResult
      ? parseTaskSpecWorkerClaims(qualityResult.claimsText, taskSpecClaimExpectation(contract))
      : null;
    const strictAttestations = qualityResult ? deriveAdapterAttestations(contract, qualityResult) : null;
    const attestations = strictAttestations ?? Object.freeze([]);
    const unexpectedPlannedExit = strictAttestations ? hasUnexpectedPlannedExit(contract, strictAttestations) : false;
    const acceptedQ9HarnessFailure = observedQ9HarnessFailure !== null && strictAttestations !== null
      && q9HarnessRouteExact(route)
      && q9HarnessFailureProcedure(contract.evidencePlan, strictAttestations)?.attestation.commandSha256
        === observedQ9HarnessFailure.commandSha256
      && observedQ9HarnessFailure.exitCode === 124;
    const unexpectedQ9CairnAttestations = strictAttestations?.filter((attestation) => {
      const procedure = contract.evidencePlan.procedures.find((row) => row.criterionId === attestation.criterionId);
      return !procedure?.command || !procedure.command.expectedExitCodes.includes(attestation.exitCode);
    }) ?? Object.freeze([]);
    const acceptedQ9CairnBlocker = observedQ9CairnBlocker !== null && strictAttestations !== null
      && q9CairnBlockerRouteExact(route)
      && strictAttestations.length === contract.evidencePlan.procedures.filter((procedure) => procedure.command !== null).length
      && unexpectedQ9CairnAttestations.length === 1
      && unexpectedQ9CairnAttestations[0]?.commandSha256 === observedQ9CairnBlocker.commandSha256
      && unexpectedQ9CairnAttestations[0]?.exitCode === observedQ9CairnBlocker.exitCode;
    const stopReason: SerialStopReason | null = !qualityResult
      ? "INVALID_ADAPTER_RESULT"
      : qualityResult.status !== "completed"
        ? "ADAPTER_FAILED"
        : !protectedStarting
          ? "PROTECTED_WORK_CHANGED"
          : !taskSpecClaims
            ? "WORKER_CLAIMS_MISSING"
            : taskSpecClaims.disposition === "STOPPED"
              ? "MODEL_REPORTED_STOPPED"
              : unexpectedPlannedExit && !acceptedQ9HarnessFailure && !acceptedQ9CairnBlocker
                ? "MODEL_RESULT_NOT_VERIFIED"
                : null;

    const closeStopped = (
      reason: SerialStopReason,
      recovery?: RecordRecovery,
      protectedValid = candidateProtectedBoundaryIntact(projectRoot, start, startHeadRef),
      redactChangedPaths = false,
    ): Extract<SerialRunResult, { status: "stopped" }> => {
      const candidateFilesChanged = candidateScanChangedPaths(projectRoot, contract.ownedRecords);
      if (!candidateFilesChanged) throw new Error("UNSAFE_SERIAL_CANDIDATE_GIT_METADATA");
      const reportFilesChanged = redactChangedPaths
        ? Object.freeze([CANDIDATE_REDACTED_GIT_PATH])
        : candidateReportChangedPaths(candidateFilesChanged);
      const records = cairnWorkerRecords(
        projectRoot, contract, start, "STOPPED", reason, null, protectedValid, null,
        workerResult?.evidence ?? null, recovery,
        Object.freeze({ claims: taskSpecClaims, attestations }),
        undefined,
        reportFilesChanged,
        undefined,
        undefined,
        contractMarkdown,
      );
      if (!records.verified) {
        const restored = restoreCandidateLogBeforeThrow(projectRoot, start);
        throw recordVerificationFailed("Builder evidence was retained without a verified stop record.", restored);
      }
      emit(activities, options.events, { stage: "Check", state: "stopped", detail: `Stopped safely: ${stopReasonInPlainWords(reason)} (${reason}).` });
      emit(activities, options.events, { stage: "Result", state: "stopped", detail: `STOPPED — ${stopReasonInPlainWords(reason)}` });
      return {
        status: "stopped", reason, taskNumber, disposition: "STOPPED",
        briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
        reportText: records.reportText, row: records.row, route, activities: candidateActivityView(activities),
        commit: { status: "skipped", reason: "Stopped Builder evidence was retained for inspection." },
        composed: records.composed,
      };
    };

    const briefPath = paths.brief(projectRoot, taskNumber);
    const reportPath = paths.report(projectRoot, taskNumber);
    const logPath = paths.log(projectRoot);
    const closeBoundaryDrift = (): Extract<SerialRunResult, { status: "stopped" }> => {
      const briefIntactNow = candidateOwnedTextNoFollow(briefPath) === contractMarkdown;
      const logIntactNow = candidateOwnedTextNoFollow(logPath) === start.logText;
      const reportPresentNow = candidateOwnedTextNoFollow(reportPath) !== null;
      const ownedChanged = !briefIntactNow || !logIntactNow || reportPresentNow;
      const protectedNow = candidateProtectedBoundaryIntact(projectRoot, start, startHeadRef);
      return closeStopped(
        ownedChanged ? "RECORD_VERIFICATION_FAILED" : "MODEL_RESULT_NOT_VERIFIED",
        {
          disclosure: !logIntactNow
            ? "The Builder modified the append-only work log; Cairn restored the task-start snapshot before recording this stop."
            : reportPresentNow
              ? "The Builder pre-wrote the task report path; Cairn replaced it with this honest stop record."
              : null,
          overwriteReport: reportPresentNow,
        },
        protectedNow,
      );
    };
    const briefIntact = candidateOwnedTextNoFollow(briefPath) === contractMarkdown;
    const logIntact = candidateOwnedTextNoFollow(logPath) === start.logText;
    const reportPresent = candidateOwnedTextNoFollow(reportPath) !== null;
    if (!briefIntact || !logIntact || reportPresent) {
      const disclosures: string[] = [];
      if (!logIntact) {
        disclosures.push("The Builder modified the append-only work log; Cairn restored the task-start snapshot before recording this stop.");
      }
      if (reportPresent) disclosures.push("The Builder pre-wrote the task report path; Cairn replaced it with this honest stop record.");
      return closeStopped("RECORD_VERIFICATION_FAILED", {
        disclosure: disclosures.length > 0 ? disclosures.join(" ") : null,
        overwriteReport: reportPresent,
      });
    }
    if (stopReason) return closeStopped(stopReason);
    if (!taskSpecClaims || !qualityResult || candidateGit(projectRoot, ["rev-parse", "HEAD"]) !== start.head) {
      return closeStopped("MODEL_RESULT_NOT_VERIFIED");
    }

    const allChanged = changedCandidateTaskPaths(projectRoot, contract);
    if (!allChanged) return closeStopped("MODEL_RESULT_NOT_VERIFIED");
    const ownedKeys = new Set(owned.map((path) => process.platform === "win32" ? path.toLowerCase() : path));
    const protectedPaths = [...start.protectedPaths.keys()]
      .filter((path) => !ownedKeys.has(process.platform === "win32" ? path.toLowerCase() : path))
      .sort();
    const protectedKeys = new Set(protectedPaths.map((path) => process.platform === "win32" ? path.toLowerCase() : path));
    const taskPaths = allChanged
      .filter((path) => {
        const key = process.platform === "win32" ? path.toLowerCase() : path;
        return !ownedKeys.has(key) && !protectedKeys.has(key);
      })
      .sort();
    const ownedPaths = [...owned].sort();
    const capture = captureSerialCandidateBundle(projectRoot, authority, {
      round: 0,
      baseHead: start.head,
      taskPaths,
      protectedPaths,
      ownedPaths,
    });
    if (!capture.eligible) {
      return closeStopped(
        "MODEL_RESULT_NOT_VERIFIED",
        undefined,
        candidateProtectedBoundaryIntact(projectRoot, start, startHeadRef),
        capture.reason === "INDEX_STATE_UNSAFE" || capture.reason === "PATH_UNSAFE",
      );
    }
    if (!pendingSerialCandidateBoundaryIntact(
      projectRoot, start, startHeadRef, contract, contractMarkdown, ownedRecordIndexAuthority,
    )) {
      return closeBoundaryDrift();
    }
    const repairEligibility = ignoredBoundary
      ? composeSerialCandidateRepairEligibility(projectRoot, ignoredBoundary, capture.bundle)
      : null;
    const runId = randomUUID();
    if (openSerialCandidates.has(runId)) throw new Error("SERIAL_CANDIDATE_RUN_ID_COLLISION");
    const candidate = composeSerialCandidate(authority, {
      version: SERIAL_CANDIDATE_VERSION,
      runId,
      taskNumber,
      requestSha256,
      claimsText: qualityResult.claimsText,
      bundle: capture.bundle,
      repairEligibility,
    });
    if (!candidate) return closeStopped("MODEL_RESULT_NOT_VERIFIED");
    const lineageIdentity = serialCandidateLineageIdentity(candidate);
    if (!lineageIdentity) return closeStopped("MODEL_RESULT_NOT_VERIFIED");

    const exposureCapture = captureSerialCandidateBundle(projectRoot, authority, {
      round: 0,
      baseHead: start.head,
      taskPaths,
      protectedPaths,
      ownedPaths,
    });
    if (!exposureCapture.eligible || exposureCapture.bundle.bundleSha256 !== candidate.bundleSha256
      || !pendingSerialCandidateBoundaryIntact(
        projectRoot, start, startHeadRef, contract, contractMarkdown, ownedRecordIndexAuthority,
      )) {
      return closeBoundaryDrift();
    }

    const context: OpenSerialCandidateContext = {
      projectRoot,
      start,
      startHeadRef,
      contract,
      contractMarkdown,
      route,
      activities,
      events: options.events,
      lock,
      released: false,
      taskPaths: Object.freeze(taskPaths),
      protectedPaths: Object.freeze(protectedPaths),
      ownedPaths: Object.freeze(ownedPaths),
      ownedRecordIndexAuthority,
      claims: taskSpecClaims,
      attestations,
      attestationsCompleteForDone: strictAttestations !== null && !unexpectedPlannedExit,
      evidence: qualityResult.evidence,
      authority,
      lineageIdentity,
      sealableCandidateSha256: candidate.candidateSha256,
      sealableClaimsSha256: candidate.claimsSha256,
      sealableBundleSha256: candidate.bundleSha256,
      interruptedRepairStopOnly: false,
    };
    openSerialCandidates.set(runId, context);
    try {
      emit(activities, options.events, {
        stage: "Check",
        state: "done",
        detail: `The Builder result is frozen as candidate round ${candidate.round}; terminal authoring has not begun.`,
      });
    } catch (error) {
      // The candidate has not been returned yet. A throwing observer must not
      // strand an unreachable in-process context and cross-process run lock.
      openSerialCandidates.delete(runId);
      context.released = true;
      throw error;
    }
    keepOpen = true;
    return {
      status: "candidate",
      taskNumber,
      briefPath,
      route,
      activities: candidateActivityView(activities),
      candidate,
    };
  } finally {
    restoreCandidateGitEnvironment(candidateEnvironmentStart);
    if (!keepOpen) {
      if (!unconfirmedKill) lock.release();
      activeRoots.delete(projectRoot);
    }
  }
}

export async function runSerialTask(root: string, intent: TaskIntent, options: SerialRunOptions): Promise<SerialRunResult> {
  const requestSha256 = taskRequestSha256(intent);
  if (requestSha256 === null) throw new Error("INVALID_TASK_INTENT");
  const taskSpecAuthority = serialTaskSpecAuthorityFor(intent, options.taskSpecAuthority);
  if (options.taskSpecAuthority !== undefined && !taskSpecAuthority) throw new Error("INVALID_TASK_SPEC_AUTHORITY");
  const projectRoot = resolve(root);
  if (activeRoots.has(projectRoot)) throw new Error("SERIAL_RUN_ACTIVE: One task is already running for this project.");
  assertGoverned(projectRoot);
  const activities: SerialActivity[] = [];
  const route = routeTask(taskSpecAuthority ? {
    outcome: intent.outcome.text,
    capability: "serial-task",
    requiredCommandEventRepresentation: CANONICAL_EVIDENCE_COMMAND_EVENT_REPRESENTATION,
  } : { outcome: intent.outcome.text, capability: "serial-task" }, options.adapters, options.adapterId);
  emit(activities, options.events, {
    stage: "Route",
    state: route.status === "ready" ? "done" : "stopped",
    detail: route.status === "ready" ? route.reason : route.reason,
  });
  if (route.status === "connection-required") return { status: "connection-required", route, activities };
  activeRoots.add(projectRoot);
  let lock: RunLock;
  try {
    lock = acquireRunLock(projectRoot);
  } catch (error) {
    activeRoots.delete(projectRoot);
    throw error;
  }
  // Set true only when a timeout/cancel kill could not be confirmed: a live
  // orphan may still be writing this workspace, so the run lock is deliberately
  // NOT released (see the finally). Fail-closed: the lock holder is this app
  // process (alive), so the next run is refused SERIAL_RUN_ACTIVE rather than
  // self-healed. The residual risk is bounded — a stale-lock heal only applies
  // once this app restarts (its pid then reads as dead) — and documented.
  let unconfirmedKill = false;
  try {
    const chosen = options.adapters.find((item) => item.descriptor.id === route.recommended.id);
    if (!chosen) throw new Error("ROUTE_ADAPTER_MISSING");
    const demo = chosen.descriptor.capabilities.includes("offline-demo");
    const start = snapshot(projectRoot);
    const taskNumber = nextTaskNumber(projectRoot);
    mkdirSync(paths.tasks(projectRoot), { recursive: true });
    const owned = [
      rel(projectRoot, paths.brief(projectRoot, taskNumber)),
      rel(projectRoot, paths.report(projectRoot, taskNumber)),
      rel(projectRoot, paths.log(projectRoot)),
    ];
    const ownedSet = new Set(owned);
    const legacyContract = {
      version: "cairn-serial-task/v3",
      taskNumber,
      intent,
      requestSha256,
      supportedOutcome: demo ? OFFLINE_SUPPORTED_OUTCOME : WORKER_SUPPORTED_OUTCOME,
      lane: "Standard",
      route: {
        adapterId: route.recommended.id,
        adapterLabel: route.recommended.label,
        provider: route.recommended.provider,
        model: route.recommended.model,
        reason: route.reason,
      },
      ownedRecords: owned,
      protectedGit: {
        head: start.head,
        dirty: start.status.length > 0,
        staged: start.staged.length > 0,
      },
      checks: demo ? [
        "Validate the adapter result against the exact fixed schema.",
        "Confirm only the three owned records changed beyond the protected starting state.",
        "Confirm one terminal disposition and one append-only log row.",
      ] : [
        `Confirm exactly one ${route.recommended.label} worker returns one completed result with bounded numeric evidence.`,
        "Confirm the worker's final message carries one readable cairn-claims block and the append-only log gains one matching Cairn-authored row.",
        "Confirm protected starting work is byte-identical and Cairn creates one exact-path local commit for a clean-start DONE result.",
      ],
      stopConditions: demo ? [
        "The adapter fails or returns an invalid value.",
        "Protected Git work changes unexpectedly.",
        "Any task record cannot be verified exactly.",
      ] : [
        "A real worker process or model call would start without separate authorization.",
        "The process fails, returns invalid bounded evidence, returns no readable claims, or claims STOPPED.",
        "Protected Git work changes unexpectedly.",
        "Any task record cannot be verified exactly.",
      ],
      ...(options.taskPromises ? { promises: options.taskPromises } : {}),
    } satisfies AdapterTaskContract;
    const contract: AdapterTaskContract = taskSpecAuthority ? {
      ...legacyContract,
      version: "cairn-serial-task/v4",
      taskSpec: taskSpecAuthority.taskSpec,
      taskSpecSha256: taskSpecAuthority.taskSpecSha256,
      taskSpecReview: taskSpecAuthority.taskSpecReview,
      evidencePlan: taskSpecAuthority.evidencePlan,
      evidencePlanSha256: taskSpecAuthority.evidencePlanSha256,
      checks: [] as const,
      envelopeChecks: legacyContract.checks,
    } : legacyContract;
    const contractMarkdown = briefText(contract, demo);
    writeFileSync(paths.brief(projectRoot, taskNumber), contractMarkdown, { encoding: "utf8", flag: "wx" });

    emit(activities, options.events, {
      stage: "Run",
      state: "working",
      detail: demo
        ? "Running the deterministic offline demonstration."
        : `Running one confirmed ephemeral workspace-scoped ${contract.route.adapterLabel} request.`,
    });
    let adapterValue: unknown;
    try {
      if (taskSpecAuthority && serialTaskSpecAuthorityFor(intent, taskSpecAuthority) !== taskSpecAuthority) {
        throw new WorkerBoundaryError("INVALID_TASK_SPEC_AUTHORITY");
      }
      adapterValue = await chosen.run(freezeContract(contract), options.signal);
    } catch (error) {
      // The catch keys only on the UNIVERSAL error classes: a boundary stop is
      // REAL_MODEL_CALL_NOT_AUTHORIZED; a process error closes by its `failure`
      // kind (timeout → ADAPTER_TIMED_OUT, cancelled → CANCELLED_BY_OWNER,
      // process → ADAPTER_FAILED); anything else is ADAPTER_FAILED.
      const reason: SerialStopReason = error instanceof WorkerBoundaryError
        ? "REAL_MODEL_CALL_NOT_AUTHORIZED"
        : error instanceof WorkerProcessError
          ? error.failure === "timeout"
            ? "ADAPTER_TIMED_OUT"
            : error.failure === "cancelled"
              ? "CANCELLED_BY_OWNER"
              : "ADAPTER_FAILED"
          : "ADAPTER_FAILED";
      const processFailure: ProcessFailureNote | undefined = error instanceof WorkerProcessError
        ? { code: error.code, debugPath: error.debugPath }
        : undefined;
      // An unconfirmed kill (the child never closed after a timeout/cancel kill)
      // means a live orphan may still be writing. Keep the run lock (see finally)
      // and say so plainly in both the activity and the STOPPED report.
      const orphanRisk = error instanceof WorkerProcessError &&
        (error.failure === "timeout" || error.failure === "cancelled") &&
        error.killConfirmed === false;
      if (orphanRisk) unconfirmedKill = true;
      emit(activities, options.events, {
        stage: "Run",
        state: "stopped",
        detail: reason === "REAL_MODEL_CALL_NOT_AUTHORIZED"
          ? `Stopped before starting the real ${contract.route.adapterLabel} process.`
          : orphanRisk
            ? `The worker process could not be confirmed dead; the run lock was left in place. Close the orphaned process, then restart the app before the next task.`
            : processFailure
              ? `The adapter stopped safely (${processFailure.code}).${processFailure.debugPath ? ` Raw run evidence: ${processFailure.debugPath}` : ""}`
              : "The adapter stopped safely.",
      });
      // The card's two Git-derived facts for this close, taken BEFORE Cairn
      // writes its own stop records — the same moment cairnWorkerRecords takes
      // them — so the retained set is the worker's evidence and the brief, not
      // Cairn's own report and appended log row, and so Cairn's own log append
      // can never read back as a protected-work change.
      const facts = safetyCloseFacts(projectRoot, start, ownedSet, demo, reason);
      if (!facts) {
        // Git could not be read, so no honest stop record can be composed from
        // it. Close through the same door every other unverifiable close uses:
        // restore Cairn's OWN log — the worker may have forged a row before
        // forcing this close — and throw, so the run is must-inspect. Letting
        // the raw Git error escape here would skip that restore and leave a
        // forged row standing (Tasks 058/059).
        const restored = restoreLogBeforeThrow(projectRoot, start);
        throw recordVerificationFailed(
          "Git could not be read to compose this stop's record; model-authored evidence was retained without overwrite.",
          restored,
        );
      }
      const closed = writeSafetyRecordsWhenUnclaimed(projectRoot, contract, demo, reason, start, Boolean(options.commitRecords), undefined, processFailure, orphanRisk);
      if (!closed?.verified) {
        // The worker may have forged a log row before forcing this thrown close
        // (a tampered log is exactly why the safety close returns null here).
        const restored = restoreLogBeforeThrow(projectRoot, start);
        throw recordVerificationFailed("Model-authored evidence was retained without overwrite.", restored);
      }
      emit(activities, options.events, { stage: "Result", state: "stopped", detail: `STOPPED — ${stopReasonInPlainWords(reason)}` });
      return {
        status: "stopped", reason, taskNumber, disposition: "STOPPED",
        briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
        reportText: closed.reportText, row: closed.row, route, activities,
        commit: { status: "skipped", reason: "Stopped tasks are retained for inspection." },
        composed: composedForClose(contract, "STOPPED", reason, {
          claims: null,
          filesChanged: facts.filesChanged,
          protectedIntact: facts.protectedIntact,
          commit: null,
          evidenceSummary: null,
          processFailure: processFailure ?? null,
          // The same predicate the report above rendered its already-spent
          // sentence from, not a reason-keyed restatement of it.
          paidCallStarted: paidCallAlreadyStarted(demo, reason, processFailure),
        }),
      };
    }
    emit(activities, options.events, {
      stage: "Run",
      state: "done",
      detail: demo ? "The offline adapter returned one result." : `One ${contract.route.adapterLabel} process returned bounded terminal evidence.`,
    });
    emit(activities, options.events, { stage: "Check", state: "working", detail: "Checking the result, records, and protected Git state." });
    if (!demo) {
      // Task 244: the one repair this run may spend, and what it asked for.
      // These are facts about the RUN, so they live outside the loop below.
      let repairSpent = false;
      let acceptedRepair: SerialCandidateRepairRequestV1 | null = null;
      // Task 252 — what the critic said, kept so the seal can record it. Purely
      // a record: nothing below reads a judgment to decide anything.
      let acceptedCritique: SerialRunCritiqueRecordV1 | null = null;
      // Everything from here to the terminal close runs ONCE per worker
      // attempt. A confirmed allegation reenters it with a second dispatch,
      // so the repaired tree meets exactly the same parse, the same owned-
      // records gate, the same protected-work check and the same project
      // checks the first attempt met - by construction, not by a second
      // ladder that could drift from this one. Only the repair branch loops;
      // every other path returns.
      for (;;) {
        const workerResult = parseWorkerResult(adapterValue, contract);
        const qualityWorkerResult = contract.version === "cairn-serial-task/v4"
          && workerResult?.kind === "worker-result/v3" ? workerResult : null;
        const adapterAttestations = contract.version === "cairn-serial-task/v4" && qualityWorkerResult
          ? deriveAdapterAttestations(contract, qualityWorkerResult)
          : contract.version === "cairn-serial-task/v4" ? null : Object.freeze([]);
        const resultValid = workerResult !== null && adapterAttestations !== null;
        if (workerResult) {
          emit(activities, options.events, { stage: "Check", state: "working", detail: boundedEvidenceSummary(workerResult.evidence) });
        }
        const workerCompleted = workerResult?.status === "completed";
        const protectedStarting = protectedStartingPathsOrNull(projectRoot, start);
        if (protectedStarting === null) {
          // Git cannot answer, so nothing below may be decided: no honest record
          // can be composed, and a worker-forged log row may be standing right
          // now. Restore Cairn's OWN log and throw, so the run is must-inspect
          // (Tasks 058/059/067).
          const restored = restoreLogBeforeThrow(projectRoot, start);
          throw recordVerificationFailed(
            "Git could not be read to verify protected starting work; worker-authored evidence was retained without overwrite.",
            restored,
          );
        }
        const protectedValid = protectedStarting;
        // The worker authored no record; it speaks through one cairn-claims fence.
        const claims = contract.version === "cairn-serial-task/v3" && workerResult
          ? parseWorkerClaims(workerResult.claimsText)
          : null;
        const taskSpecClaims = contract.version === "cairn-serial-task/v4" && qualityWorkerResult
          ? parseTaskSpecWorkerClaims(qualityWorkerResult.claimsText, taskSpecClaimExpectation(contract))
          : null;
        const claimDisposition = taskSpecClaims?.disposition ?? claims?.disposition ?? null;
        const unexpectedPlannedExit = contract.version === "cairn-serial-task/v4" && adapterAttestations
          ? hasUnexpectedPlannedExit(contract, adapterAttestations)
          : false;
        const taskSpecEvidence = contract.version === "cairn-serial-task/v4" ? Object.freeze({
          claims: taskSpecClaims,
          attestations: adapterAttestations ?? Object.freeze([]),
        }) : undefined;
        const stopReason: SerialStopReason | null = !resultValid
          ? "INVALID_ADAPTER_RESULT"
          : !workerCompleted
            ? "ADAPTER_FAILED"
            : !protectedValid
              ? "PROTECTED_WORK_CHANGED"
              : !(taskSpecClaims ?? claims)
                ? "WORKER_CLAIMS_MISSING"
                : claimDisposition === "STOPPED"
                  ? "MODEL_REPORTED_STOPPED"
                  : unexpectedPlannedExit
                    ? "MODEL_RESULT_NOT_VERIFIED"
                  : null;

        // A STOPPED close: Cairn authors honest STOPPED records from whatever
        // claims (if any) survived, keeps the retained evidence, commits nothing.
        // Task 237 — declared here so the stop path below can carry the rows too.
        // A STOPPED result must be able to say which promise went unanswered.
        const checkResults: SerialProjectCheckResultV1[] = [];
        let ownerAnswers: Readonly<Record<string, SerialTaskPromiseOwnerAnswerV1>> = Object.freeze({});
        let promiseAnswers: readonly SerialTaskPromiseAnswerV1[] = Object.freeze([]);

        const closeStopped = (reason: SerialStopReason, recovery?: RecordRecovery): SerialRunResult => {
          emit(activities, options.events, { stage: "Check", state: "stopped", detail: `Stopped safely: ${stopReasonInPlainWords(reason)} (${reason}).` });
          const records = cairnWorkerRecords(
            projectRoot, contract, start, "STOPPED", reason, claims, protectedValid, null,
            workerResult?.evidence ?? null, recovery, taskSpecEvidence,
            // No candidate custody, files, terminal action, date or brief text on
            // this path; the trailing argument is Task 238's answered promises, so
            // a stop can name the promise that went unanswered.
            undefined, undefined, undefined, undefined, undefined, promiseAnswers, acceptedRepair, acceptedCritique,
          );
          if (!records.verified) {
            const restored = restoreLogBeforeThrow(projectRoot, start);
            throw recordVerificationFailed("Worker-authored evidence was retained without overwrite.", restored);
          }
          emit(activities, options.events, { stage: "Result", state: "stopped", detail: `STOPPED — ${stopReasonInPlainWords(reason)}` });
          return {
            status: "stopped", reason, taskNumber, disposition: "STOPPED",
            briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
            reportText: records.reportText, row: records.row, route, activities,
            commit: { status: "skipped", reason: "Stopped evidence was retained for inspection." },
            composed: records.composed,
          };
        };

        // A DONE write whose byte-back verification fails must never leave a
        // forged DONE report/log row standing. Rewrite the just-written DONE
        // records to honest STOPPED records in place — replaceDoneRecordsWithStopped
        // only proceeds when the on-disk records are byte-for-byte the DONE ones —
        // and close RECORD_VERIFICATION_FAILED. Only an unrewritable failure throws.
        const closeRecordRewrite = (done: { reportText: string; row: LogRow }): SerialRunResult => {
          const stopped = replaceDoneRecordsWithStopped(
            projectRoot, contract, demo, start, Boolean(options.commitRecords), done,
            "RECORD_VERIFICATION_FAILED", workerResult?.evidence ?? undefined, taskSpecEvidence,
          );
          if (!stopped?.verified) {
            // The DONE row could not be rewritten as an honest STOPPED row. That
            // row may well have passed its own byte-back check, but the run it
            // claims threw instead of completing, so it must not stand: restore
            // the log to what Cairn last wrote that is still true of this run.
            const restored = restoreLogBeforeThrow(projectRoot, start);
            throw recordVerificationFailed("Task records were retained for inspection.", restored);
          }
          emit(activities, options.events, { stage: "Check", state: "stopped", detail: `Stopped safely: ${stopReasonInPlainWords("RECORD_VERIFICATION_FAILED")} (RECORD_VERIFICATION_FAILED).` });
          emit(activities, options.events, { stage: "Result", state: "stopped", detail: `STOPPED — ${stopReasonInPlainWords("RECORD_VERIFICATION_FAILED")}` });
          return {
            status: "stopped", reason: "RECORD_VERIFICATION_FAILED", taskNumber, disposition: "STOPPED",
            briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
            reportText: stopped.reportText, row: stopped.row, route, activities,
            commit: { status: "skipped", reason: "Record verification failed." },
            composed: composedForClose(contract, "STOPPED", "RECORD_VERIFICATION_FAILED", {
              claims,
              filesChanged: changedSetForRecord(projectRoot),
              protectedIntact: protectedValid,
              commit: null,
              evidenceSummary: workerResult ? boundedEvidenceSummary(workerResult.evidence) : null,
              processFailure: null,
              paidCallStarted: true,
              taskSpecClaims,
              adapterAttestations: adapterAttestations ?? Object.freeze([]),
              repair: acceptedRepair,
            }),
          };
        };

        // Owned-records integrity gate (Task 052). The task brief, the append-only
        // work log, and the task report path are all Cairn-owned records that live
        // OUTSIDE the protected-path snapshot: the brief and report are written
        // untracked at task start, and the log is one Cairn appends to itself. A
        // worker can therefore edit any of them and still pass every protected-work
        // and exact-path check. Before ANY record-writing close — the claims-lane
        // stop closes below OR the DONE authoring further down — verify all three
        // are exactly as Cairn left them at task start. On any violation, recover
        // Cairn's OWN records (restore the log, overwrite the report) and close
        // honestly as STOPPED, so no forged DONE, log row, or stone can stand.
        const briefPath = paths.brief(projectRoot, taskNumber);
        const reportPath = paths.report(projectRoot, taskNumber);
        const logPath = paths.log(projectRoot);
        const ownedRecordsGuard = (): SerialRunResult | null => {
          const briefIntact = existsSync(briefPath) && readFileSync(briefPath, "utf8") === contractMarkdown;
          const logIntact = existsSync(logPath) && readFileSync(logPath, "utf8") === start.logText;
          const reportPresent = existsSync(reportPath);
          if (briefIntact && logIntact && !reportPresent) return null;

          const disclosures: string[] = [];
          if (!logIntact) {
            // The log is Cairn's OWN append-only record. Restoring it from the
            // task-start snapshot is NOT destroying worker evidence — the worker's
            // product-file changes stay retained in the workspace for inspection;
            // leaving a worker-forged row standing WOULD be dishonest. The restore
            // must happen BEFORE the stop close writes its records so the close's
            // byte-back append starts from the pristine log.
            writeFileSync(logPath, start.logText, "utf8");
            disclosures.push(
              "The worker modified the append-only work log; Cairn restored it from the task-start snapshot and recorded this stop. " +
                "The worker's modification was discarded from the log; its product-file changes remain retained in the workspace for inspection.",
            );
          }
          if (reportPresent) {
            disclosures.push("The worker pre-wrote the task report path; Cairn replaced it with this honest record.");
          }
          // A tampered or missing brief is retained as evidence (never restored);
          // like the 051 brief check it only triggers this honest stop.
          return closeStopped("RECORD_VERIFICATION_FAILED", {
            disclosure: disclosures.length > 0 ? disclosures.join(" ") : null,
            overwriteReport: reportPresent,
          });
        };
        const guarded = ownedRecordsGuard();
        if (guarded) return guarded;

        if (stopReason) return closeStopped(stopReason);

        // Task 235 — the one pre-terminal pause. Everything decisive has already
        // passed: the worker result parsed, its claims read, protected work
        // verified byte-identical, and the owned records proved exactly as Cairn
        // left them. Nothing terminal exists yet — no report, no log row, no
        // commit, no result — so the caller can put a genuinely unsealed
        // candidate in front of the owner here and nowhere else.
        //
        // The run stays OPEN across this await: same lock, same start snapshot,
        // same chosen adapter, same abort signal. That is what makes the pause a
        // checkpoint rather than a handoff — no second writer can take the run,
        // and the close below is the same close a checkpoint-free run reaches.
        //
        // Fail closed on the answer: only an exact "continue" seals. Anything
        // else — a stop, or a caller that returned something unexpected — takes
        // the honest STOPPED door, which commits nothing and retains the edits.
        // Task 237 — Cairn runs its OWN checks here, before anyone is asked
        // anything. Still inside the open run: same lock, same snapshot, same
        // abort signal. Whatever commands the worker says it ran stay claims; only
        // what happens on these lines is Cairn's own finding.
        const promises = contract.version === "cairn-serial-task/v3" ? contract.promises : undefined;
        const workerChecks = claims ? claims.checks : [];
        if (promises) {
          const menu = projectCheckMenu(projectRoot);
          const selected = [...new Set(promises.rows.flatMap((row) =>
            row.verification.kind === "cairn-check" ? [row.verification.checkId] : []))];
          for (const checkId of selected) {
            const check = menu.find((entry) => entry.id === checkId);
            // A check the project can no longer answer leaves its row without a
            // result, which cannot seal. Cairn does not substitute another.
            if (!check) continue;
            emit(activities, options.events, {
              stage: "Check", state: "working", detail: `Cairn is running ${check.label} (${check.command}).`,
            });
            const result = await runProjectCheck(projectRoot, check, {
              signal: options.signal,
              onElapsed: (elapsedMs) => emit(activities, options.events, {
                stage: "Check", state: "working",
                detail: `${check.label} — still running, ${Math.round(elapsedMs / 1000)}s so far.`,
              }),
            });
            checkResults.push(result);
            emit(activities, options.events, {
              stage: "Check", state: "working",
              detail: result.status === "passed"
                ? `${check.label} passed (${Math.round(result.durationMs / 1000)}s).`
                : result.status === "failed"
                  ? `${check.label} failed (${check.command}).`
                  : `${check.label} did not finish in time; Cairn stopped it.`,
            });
          }
        }

        if (options.onUnsealedCandidate) {
          emit(activities, options.events, {
            stage: "Check",
            state: "working",
            detail: "The worker changed files. Waiting for your decision before Cairn finishes the task.",
          });
          // Shown with every owner row still `pending`: the card is where the
          // owner answers them, so it cannot arrive pre-answered. After a repair
          // this is composed again from the reran checks and the new claims, so
          // a judgment the owner made about the earlier code is never carried
          // over onto code that has since changed.
          const shown = promises
            ? composeSerialTaskPromiseAnswers(promises, { checkResults, workerChecks, ownerAnswers: {} })
            : Object.freeze([]);
          // A run with no frozen rows has no promise for an allegation to name,
          // so it never offers the repair — the same reason it gets no critic.
          const repairAvailable = !repairSpent && promises !== undefined;
          const choice = await options.onUnsealedCandidate(Object.freeze({
            version: SERIAL_UNSEALED_CANDIDATE_VERSION,
            taskNumber,
            ...acceptedRequestForRecord(contract),
            route: Object.freeze({
              adapterId: contract.route.adapterId,
              adapterLabel: contract.route.adapterLabel,
              provider: contract.route.provider,
              model: contract.route.model,
            }),
            // Git's own bounded answer, the same one the terminal record will
            // carry, so the candidate and the result never disagree about what
            // changed.
            changedPaths: changedSetForRecord(projectRoot),
            claims,
            evidenceSummary: workerResult ? boundedEvidenceSummary(workerResult.evidence) : null,
            answers: shown,
            repairAvailable,
            repair: acceptedRepair,
          }), options.signal);

          // Task 244 — the one repair. It is dispatched from HERE, inside the
          // still-open run: same lock, same starting snapshot, same chosen
          // adapter, same abort signal. `runSerialTask` is not reentered, so
          // there is no second writer and no nested run to reconcile.
          const said = unsealedCandidateCritique((choice as { critique?: unknown } | null)?.critique);
          // Captured before the branch below, so a run that goes on to repair
          // still seals with what the critic said. A second review replaces the
          // first on purpose: the first judged a tree that no longer exists.
          if (said) acceptedCritique = said;

          const repair = unsealedCandidateRepair(choice, repairAvailable, shown);
          if (repair) {
            repairSpent = true;
            acceptedRepair = repair;
            emit(activities, options.events, {
              stage: "Run",
              state: "working",
              detail: `Asking ${contract.route.adapterLabel} for one correction to ${repair.checkId}. This is the only repair for this task.`,
            });
            // The SAME contract object in every field that could widen the
            // task — accepted request, its digest, the frozen rows — plus the
            // one confirmed correction. The brief on disk is not rewritten:
            // the Task Card the owner approved is a record, not a draft.
            try {
              adapterValue = await chosen.run(
                freezeContract({ ...contract, repair } as AdapterTaskContract),
                options.signal,
              );
            } catch (error) {
              // A repair that never returned leaves the first attempt's edits
              // exactly where they are, and closes through the door this run
              // already owns. No retry, and never a DONE.
              const reason: SerialStopReason = error instanceof WorkerBoundaryError
                ? "REAL_MODEL_CALL_NOT_AUTHORIZED"
                : error instanceof WorkerProcessError
                  ? error.failure === "timeout"
                    ? "ADAPTER_TIMED_OUT"
                    : error.failure === "cancelled"
                      ? "CANCELLED_BY_OWNER"
                      : "ADAPTER_FAILED"
                  : "ADAPTER_FAILED";
              return closeStopped(reason, {
                disclosure: `The one approved repair of ${repair.checkId} did not return a result. `
                  + "The worker's earlier changes were retained in the workspace for inspection.",
                overwriteReport: false,
              });
            }
            continue;
          }

          const continuation = unsealedCandidateContinuation(choice);
          if (!continuation) return closeStopped("OWNER_STOPPED_AT_CANDIDATE");
          ownerAnswers = continuation.ownerAnswers;
        }

        // The DONE gate. A row is answered by Cairn's passing check or by the
        // owner's own word, and by nothing else — a worker that swore every
        // promise was kept cannot move this.
        if (promises) {
          promiseAnswers = composeSerialTaskPromiseAnswers(promises, {
            checkResults, workerChecks, ownerAnswers,
          });
          if (!serialTaskPromisesSatisfied(promiseAnswers)) return closeStopped("TASK_PROMISE_NOT_MET");
        }

        // DONE path — the claims say DONE, the process completed, and protected
        // work is byte-identical. Cairn writes the records and owns the commit.
        // A worker that committed on its own (head moved) is not verifiable. The
        // owned-records gate above already proved the brief, log, and report path
        // are byte-exactly as Cairn left them, so no forged DONE record can stand.
        if (git(projectRoot, ["rev-parse", "HEAD"]) !== start.head) return closeStopped("MODEL_RESULT_NOT_VERIFIED");

        if (start.status.length > 0) {
          // A protected dirty start forbids an isolated commit: the records are
          // written but the product changes stay uncommitted for the owner.
          const commit: RecordCommit = { status: "skipped", reason: "Protected starting work prevented an isolated task commit." };
          const records = cairnWorkerRecords(
            projectRoot, contract, start, "DONE", null, claims, protectedValid, commit,
            workerResult?.evidence ?? null, undefined, taskSpecEvidence,
            undefined, undefined, undefined, undefined, undefined, promiseAnswers, acceptedRepair, acceptedCritique,
          );
          if (!records.verified) return closeRecordRewrite(records);
          emit(activities, options.events, { stage: "Check", state: "done", detail: "The worker result and protected work were verified; the dirty start keeps the product changes uncommitted." });
          emit(activities, options.events, { stage: "Result", state: "done", detail: `DONE — one real ${contract.route.adapterLabel} task completed and was verified.` });
          return {
            status: "done", taskNumber, disposition: "DONE",
            briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
            reportText: records.reportText, row: records.row, route, activities, commit,
            composed: records.composed,
          };
        }

        // Clean start: the product change set must be Cairn-committable exactly.
        const productPaths = changedTaskPaths(projectRoot, contract);
        if (!productPaths) return closeStopped("MODEL_RESULT_NOT_VERIFIED");
        const records = cairnWorkerRecords(
          projectRoot, contract, start, "DONE", null, claims, protectedValid,
          { status: "created", reason: "One exact-path commit contains the product changes and these records." },
          workerResult?.evidence ?? null,
          undefined,
          taskSpecEvidence,
          undefined, undefined, undefined, undefined, undefined, promiseAnswers, acceptedRepair, acceptedCritique,
        );
        if (!records.verified) return closeRecordRewrite(records);
        const expectedCommitSet = [...new Set([...productPaths, ...contract.ownedRecords])];
        // Task 080: `commitExactPaths` reads Git in three places that its own
        // try/catch does not cover — the HEAD read inside that catch, and the
        // ancestry and single-commit checks after the commit — and all three run
        // once the DONE report and log row are written and byte-back verified. A
        // worker that corrupts the repository makes one of them throw (a planted
        // `post-commit` hook is enough; nothing under `.git` is visible to any
        // check Cairn runs), and the raw error would escape `runSerialTask` with
        // that verified DONE row standing for a run that did not finish. Same
        // shape as `safetyCloseFacts`, same door out.
        let commit: RecordCommit | null;
        try {
          commit = commitExactPaths(projectRoot, start, expectedCommitSet, taskNumber);
        } catch {
          const restored = restoreLogBeforeThrow(projectRoot, start);
          throw recordVerificationFailed(
            "Git could not be read to complete the task commit; task records were retained for inspection.",
            restored,
          );
        }
        if (!commit) {
          // Any staging/commit failure: undo staging, rewrite the DONE records as
          // STOPPED (this self-check is the one surviving use), and close
          // MODEL_RESULT_NOT_VERIFIED with the evidence retained.
          unstageExactPaths(projectRoot, expectedCommitSet);
          const stopped = replaceDoneRecordsWithStopped(
            projectRoot, contract, demo, start, Boolean(options.commitRecords), records,
            "MODEL_RESULT_NOT_VERIFIED", workerResult?.evidence ?? undefined, taskSpecEvidence,
          );
          if (!stopped?.verified) {
            // The verified DONE row above described a run that then failed to
            // commit; a DONE row for a thrown run must not stand.
            const restored = restoreLogBeforeThrow(projectRoot, start);
            throw recordVerificationFailed("Task records were retained for inspection.", restored);
          }
          emit(activities, options.events, { stage: "Check", state: "stopped", detail: `Stopped safely: ${stopReasonInPlainWords("MODEL_RESULT_NOT_VERIFIED")} (MODEL_RESULT_NOT_VERIFIED).` });
          emit(activities, options.events, { stage: "Result", state: "stopped", detail: `STOPPED — ${stopReasonInPlainWords("MODEL_RESULT_NOT_VERIFIED")}` });
          return {
            status: "stopped", reason: "MODEL_RESULT_NOT_VERIFIED", taskNumber, disposition: "STOPPED",
            briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
            reportText: stopped.reportText, row: stopped.row, route, activities,
            commit: { status: "skipped", reason: "Record verification failed." },
            composed: composedForClose(contract, "STOPPED", "MODEL_RESULT_NOT_VERIFIED", {
              claims,
              filesChanged: changedSetForRecord(projectRoot),
              protectedIntact: protectedValid,
              commit: null,
              evidenceSummary: workerResult ? boundedEvidenceSummary(workerResult.evidence) : null,
              processFailure: null,
              paidCallStarted: true,
              taskSpecClaims,
              adapterAttestations: adapterAttestations ?? Object.freeze([]),
              repair: acceptedRepair,
            }),
          };
        }
        emit(activities, options.events, { stage: "Check", state: "done", detail: "The worker result, task records, protected work, and Cairn-owned Git result were verified." });
        emit(activities, options.events, { stage: "Result", state: "done", detail: `DONE — one real ${contract.route.adapterLabel} task completed and was verified.` });
        return {
          status: "done", taskNumber, disposition: "DONE",
          briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
          reportText: records.reportText, row: records.row, route, activities, commit,
          composed: records.composed,
        };
      }
    }
    const resultValid = chosen.descriptor.capabilities.includes("offline-demo") && validateWorkerResult(adapterValue, contract);
    const protectedValid = verifyProtected(projectRoot, start, ownedSet);
    const stopReason: SerialStopReason | null = !resultValid
      ? "INVALID_ADAPTER_RESULT"
      : !protectedValid
        ? "PROTECTED_WORK_CHANGED"
        : null;
    if (stopReason) {
      emit(activities, options.events, { stage: "Check", state: "stopped", detail: `Stopped safely: ${stopReasonInPlainWords(stopReason)} (${stopReason}).` });
      const closed = writeClosedRecords(projectRoot, contract, demo, "STOPPED", stopReason, start, Boolean(options.commitRecords));
      emit(activities, options.events, { stage: "Result", state: "stopped", detail: `STOPPED — ${stopReasonInPlainWords(stopReason)}` });
      return {
        status: "stopped", reason: stopReason, taskNumber, disposition: "STOPPED",
        briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
        reportText: closed.reportText, row: closed.row, route, activities,
        commit: { status: "skipped", reason: "Stopped tasks are retained for inspection." },
        composed: composedForClose(contract, "STOPPED", stopReason, {
          claims: null,
          filesChanged: changedSetForRecord(projectRoot),
          protectedIntact: protectedValid,
          commit: null,
          evidenceSummary: null,
          processFailure: null,
          paidCallStarted: false,
        }),
      };
    }
    const closed = writeClosedRecords(projectRoot, contract, demo, "DONE", null, start, Boolean(options.commitRecords));
    // The re-verification now runs unconditionally instead of only when the
    // records verified: its REAL result is the protected-work finding that both
    // this DONE close and the honest STOPPED rewrite below carry in `composed`,
    // and a fixed `true` would be a claim Cairn never checked. The call is
    // read-only Git and the branch it guards is unchanged.
    const protectedIntactAtClose = verifyProtected(projectRoot, start, ownedSet);
    if (!closed.verified || !protectedIntactAtClose) {
      // Replace the success records only when they are byte-for-byte the records
      // written above. This keeps the log and report honest without overwriting a
      // concurrent or owner-authored change.
      const stopped = replaceDoneRecordsWithStopped(
        projectRoot,
        contract,
        demo,
        start,
        Boolean(options.commitRecords),
        closed,
      );
      if (!stopped?.verified) {
        // Reachable with a verified DONE row on disk (the protected-work
        // disjunct above); the run still did not finish honestly, so the row goes.
        const restored = restoreLogBeforeThrow(projectRoot, start);
        throw recordVerificationFailed("Task records were retained for inspection.", restored);
      }
      emit(activities, options.events, { stage: "Check", state: "stopped", detail: `Stopped safely: ${stopReasonInPlainWords("RECORD_VERIFICATION_FAILED")} (RECORD_VERIFICATION_FAILED).` });
      emit(activities, options.events, { stage: "Result", state: "stopped", detail: `STOPPED — ${stopReasonInPlainWords("RECORD_VERIFICATION_FAILED")}` });
      return {
        status: "stopped", reason: "RECORD_VERIFICATION_FAILED", taskNumber, disposition: "STOPPED",
        briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
        reportText: stopped.reportText, row: stopped.row, route, activities,
        commit: { status: "skipped", reason: "Record verification failed." },
        composed: composedForClose(contract, "STOPPED", "RECORD_VERIFICATION_FAILED", {
          claims: null,
          filesChanged: changedSetForRecord(projectRoot),
          protectedIntact: protectedIntactAtClose,
          commit: null,
          evidenceSummary: null,
          processFailure: null,
          paidCallStarted: false,
        }),
      };
    }
    emit(activities, options.events, { stage: "Check", state: "done", detail: "The result and three owned records were verified." });
    // Scanned before the record commit, exactly as the worker lane's own record
    // composer scans before its commit: the card names what this task changed,
    // not the empty set an already-committed workspace reports afterwards.
    const changedBeforeCommit = changedSetForRecord(projectRoot);
    const commit = recordCommit(projectRoot, taskNumber, start, owned, Boolean(options.commitRecords));
    emit(activities, options.events, { stage: "Result", state: "done", detail: "Verified offline result. The requested product change was not attempted." });
    return {
      status: "done", taskNumber, disposition: "DONE",
      briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
      reportText: closed.reportText, row: closed.row, route, activities, commit,
      composed: composedForClose(contract, "DONE", null, {
        claims: null,
        filesChanged: changedBeforeCommit,
        protectedIntact: protectedIntactAtClose,
        commit,
        evidenceSummary: null,
        processFailure: null,
        paidCallStarted: false,
      }),
    };
  } finally {
    // The in-process guard always clears. The cross-process file lock is
    // released only when no unconfirmed-kill stop occurred: if a live orphan may
    // still be writing this workspace, the lock stays so the next task is
    // refused (this app's pid still holds it) instead of starting against a
    // workspace a rogue process is mutating. Restarting the app lets the normal
    // stale-lock heal apply once this pid reads as dead.
    if (!unconfirmedKill) lock.release();
    activeRoots.delete(projectRoot);
  }
}

function candidateCaptureFailure(
  reason: Extract<SerialCandidateBundleCaptureV1, { eligible: false }>["reason"],
): Extract<SerialCandidateBundleCaptureV1, { eligible: false }> {
  return Object.freeze({ eligible: false, reason });
}

/** Serial-owned repair authorization. The internal candidate mint rechecks
 * bundle/ignored custody; this wrapper additionally binds protected starting
 * bytes, HEAD/ref, and Cairn-owned brief/log/report state to the held run. */
export function authorizeSerialCandidateRepair(
  value: unknown,
  raw: unknown,
): SerialRepairInstructionV1 | null {
  const open = openContextForCandidate(value);
  if (!open || open.context.interruptedRepairStopOnly) return null;
  const { candidate, context } = open;
  if (!serialCandidateGitEnvironmentSafe()
    || !candidateGitMetadataSafe(context.projectRoot, context.contract.ownedRecords)) return null;
  if (!candidateWorkspaceStillExact(candidate, context)) return null;
  const instruction = composeSerialRepairInstruction(context.projectRoot, candidate, raw);
  return instruction && candidateWorkspaceStillExact(candidate, context) ? instruction : null;
}

/**
 * Package-facing round-one capture boundary. The caller supplies only the
 * current candidate and its exact branded repair instruction. Project root,
 * protected paths, Cairn-owned paths, and the current task delta all come from
 * the still-held serial context, never from caller-provided path authority.
 */
export function captureSerialCandidateAfterRepair(
  value: unknown,
  repairInstruction: unknown,
): SerialCandidateBundleCaptureV1 {
  const open = openContextForCandidate(value);
  if (!open || open.context.interruptedRepairStopOnly) return candidateCaptureFailure("INVALID_CAPTURE_CONTEXT");
  const { candidate, context } = open;
  try {
    if (!serialCandidateGitEnvironmentSafe()
      || !candidateGitMetadataSafe(context.projectRoot, context.contract.ownedRecords)
      || !candidateOwnedRecordTopologySafe(context.projectRoot, context.contract, false)
      || (candidate.phase !== "awaiting-repair" && candidate.phase !== "awaiting-repair-result")
      || candidate.round !== 0 || (candidate.callsUsed.repair !== 0 && candidate.callsUsed.repair !== 1)
      || candidateGit(context.projectRoot, ["rev-parse", "HEAD"]) !== context.start.head
      || currentSymbolicHead(context.projectRoot) !== context.startHeadRef
      || protectedStartingPathsOrNull(context.projectRoot, context.start) !== true
      || candidateOwnedTextNoFollow(paths.brief(context.projectRoot, context.contract.taskNumber)) !== context.contractMarkdown
      || candidateOwnedTextNoFollow(paths.log(context.projectRoot)) !== context.start.logText
      || candidateOwnedTextNoFollow(paths.report(context.projectRoot, context.contract.taskNumber)) !== null) {
      return candidateCaptureFailure("INVALID_CAPTURE_CONTEXT");
    }
    const allChanged = changedCandidateTaskPaths(context.projectRoot, context.contract);
    if (!allChanged) return candidateCaptureFailure("PATH_SET_CHANGED");
    const ownedKeys = new Set(context.ownedPaths.map((path) => process.platform === "win32" ? path.toLowerCase() : path));
    const protectedKeys = new Set(context.protectedPaths.map((path) => process.platform === "win32" ? path.toLowerCase() : path));
    const taskPaths = allChanged.filter((path) => {
      const key = process.platform === "win32" ? path.toLowerCase() : path;
      return !ownedKeys.has(key) && !protectedKeys.has(key);
    }).sort();
    const captured = captureSerialCandidateBundleAfterRepair(
      context.projectRoot,
      candidate,
      repairInstruction,
      {
        baseHead: context.start.head,
        taskPaths,
        protectedPaths: context.protectedPaths,
        ownedPaths: context.ownedPaths,
      },
    );
    if (!captured.eligible) return captured;
    return pendingSerialCandidateBoundaryIntact(
      context.projectRoot,
      context.start,
      context.startHeadRef,
      context.contract,
      context.contractMarkdown,
      context.ownedRecordIndexAuthority,
    ) ? captured : candidateCaptureFailure("ARTIFACT_CHANGED");
  } catch {
    return candidateCaptureFailure("GIT_UNAVAILABLE");
  }
}

/**
 * Adopt the bounded repair process result and refresh the held serial context.
 * Every original cN/pN claim is parsed again, planned command attestations are
 * re-derived from process events, and round-one paths/evidence replace (rather
 * than append to) the seal context.
 */
export function adoptSerialCandidateRepairResult(
  value: unknown,
  repairInstruction: unknown,
  roundOneBundle: unknown,
  rawWorkerResult: unknown,
): SerialCandidateV1 | null {
  const open = openContextForCandidate(value);
  if (!open || typeof repairInstruction !== "object" || repairInstruction === null
    || typeof roundOneBundle !== "object" || roundOneBundle === null
    || open.context.interruptedRepairStopOnly) return null;
  const { candidate, context } = open;
  if (candidate.round !== 0 || (candidate.phase !== "awaiting-repair" && candidate.phase !== "awaiting-repair-result")
    || !serialCandidateGitEnvironmentSafe() || !candidateGitMetadataSafe(context.projectRoot, context.contract.ownedRecords)
    || !pendingSerialCandidateBoundaryIntact(
      context.projectRoot, context.start, context.startHeadRef, context.contract,
      context.contractMarkdown, context.ownedRecordIndexAuthority,
    )) return null;
  const parsed = parseWorkerResult(rawWorkerResult, context.contract);
  const result = parsed?.kind === "worker-result/v3" ? parsed : null;
  if (!result || result.status !== "completed" || typeof result.claimsText !== "string") return null;
  const claims = parseTaskSpecWorkerClaims(result.claimsText, taskSpecClaimExpectation(context.contract));
  const attestations = deriveAdapterAttestations(context.contract, result);
  if (!claims || claims.disposition !== "DONE" || !attestations) return null;
  const allOriginalCriteriaMet = !hasUnexpectedPlannedExit(context.contract, attestations);
  const replacement = replaceSerialCandidateAfterRepair(
    candidate,
    repairInstruction,
    roundOneBundle,
    result.claimsText,
  );
  if (!replacement || !isCurrentSerialCandidate(replacement)) return null;
  const currentAuthority = serialCandidateTaskSpecAuthority(replacement);
  if (!currentAuthority) return null;
  const taskPaths = Object.freeze(replacement.bundle.entries.map((entry) => entry.projectRelativePath).sort());
  context.taskPaths = taskPaths;
  context.claims = claims;
  context.attestations = attestations;
  context.attestationsCompleteForDone = allOriginalCriteriaMet;
  context.evidence = result.evidence;
  context.authority = currentAuthority;
  context.sealableCandidateSha256 = replacement.candidateSha256;
  context.sealableClaimsSha256 = replacement.claimsSha256;
  context.sealableBundleSha256 = replacement.bundleSha256;
  return replacement;
}

/** Serial-context counterpart of the candidate EvidencePlan adoption. It
 * retains both plan versions in candidate custody and moves all subsequent
 * policy/request composition onto revision one without rewriting TaskSpec or
 * the already-created task brief. */
export function adoptSerialCandidateEvidencePlanRevisionForRun(
  value: unknown,
  authorizedRevision: unknown,
): SerialCandidateV1 | null {
  const open = openContextForCandidate(value);
  if (!open || open.context.interruptedRepairStopOnly) return null;
  const { candidate, context } = open;
  const revised = adoptSerialCandidateEvidencePlanRevision(candidate, authorizedRevision);
  if (!revised) return null;
  const authority = serialCandidateTaskSpecAuthority(revised);
  if (!authority) return null;
  context.authority = authority;
  context.contract = Object.freeze({
    ...context.contract,
    evidencePlan: authority.evidencePlan,
    evidencePlanSha256: authority.evidencePlanSha256,
  });
  // Keep revision-zero process facts as explicit incomplete custody. The
  // guarded rerun below consumes only the failed cN and rebinds unchanged
  // successful facts after the exact one-procedure rerun succeeds.
  context.attestationsCompleteForDone = false;
  context.sealableCandidateSha256 = revised.candidateSha256;
  context.sealableClaimsSha256 = revised.claimsSha256;
  context.sealableBundleSha256 = revised.bundleSha256;
  return revised;
}

/** Run and adopt the one corrected Q9 harness procedure after revision one.
 * The injected runner has no writer/provider capability. Unchanged successful
 * command facts are carried forward only after their exact revision-zero
 * command identities are rechecked; the failed cN receives the sole new run
 * receipt. Returning the same candidate is intentional: the durable capsule,
 * rather than product/candidate bytes, gains the refreshed evidence custody. */
export async function rerunSerialCandidateQ9RevisedEvidence(
  value: unknown,
  adapter: unknown,
  writerIsolation: unknown,
  signal?: AbortSignal,
): Promise<SerialCandidateV1 | null> {
  const open = openContextForCandidate(value);
  if (!open || open.context.interruptedRepairStopOnly || !q9SerialHarnessGuardPresent()
    || open.context.attestationsCompleteForDone || open.candidate.round !== 0
    || open.candidate.lineage.evidencePlan.revision !== 1) return null;
  const { candidate, context } = open;
  const revision = serialCandidateEvidencePlanRevisionCustody(candidate);
  const authorization = revision?.authorization;
  if (!revision || !authorization || authorization.runId !== candidate.runId
    || authorization.taskSpecSha256 !== candidate.taskSpecSha256
    || authorization.mainHarnessFailureCode !== "TIMED_OUT_BEFORE_ASSERTION"
    || authorization.changeKind !== "timeout-increase"
    || authorization.mainEvidenceRefs.length !== 1
    || !/^q9-harness-[a-f0-9]{24}$/u.test(authorization.mainEvidenceRefs[0] ?? "")
    || !revisionBaseAttestationsValid(
      candidate.taskSpecSha256,
      candidate.lineage.initialEvidencePlan,
      context.attestations,
    )) return null;
  const initialFailure = q9HarnessFailureProcedure(candidate.lineage.initialEvidencePlan, context.attestations);
  if (!initialFailure?.procedure.command || initialFailure.procedure.criterionId !== authorization.criterionId) return null;
  const isolation = candidateStateTestWriterIsolationBinding(
    writerIsolation as SerialCandidateWriterIsolationV1,
    context.projectRoot,
  );
  if (!isolation || isolation.adapter !== adapter || context.route.recommended.id !== (adapter as TaskAdapter).descriptor.id
    || !taskAdapterQ9E2eFakeCandidateBoundTo(adapter, isolation.projectRootReal, isolation.excludedUserDataRootReal)) return null;
  const receipt = await runTaskAdapterQ9E2eRevisedEvidence(
    adapter,
    Object.freeze(context.contract),
    authorization.criterionId,
    signal,
  );
  if (!receipt || !isTaskAdapterQ9E2eRevisedEvidence(receipt)) return null;
  const commands = candidate.lineage.evidencePlan.procedures
    .filter((row) => row.kind === "adapter-command-attestation" && row.command !== null);
  const priorByCriterion = new Map(context.attestations.map((row) => [row.criterionId, row]));
  const attestations: AdapterCommandAttestationV1[] = [];
  for (let sequence = 0; sequence < commands.length; sequence += 1) {
    const procedure = commands[sequence];
    const command = procedure.command;
    const prior = priorByCriterion.get(procedure.criterionId);
    if (!command || !prior) return null;
    const exitCode = procedure.criterionId === authorization.criterionId
      ? receipt.commandSha256 === command.sha256 && receipt.criterionId === procedure.criterionId
        ? receipt.exitCode
        : null
      : prior.commandSha256 === command.sha256 && command.expectedExitCodes.includes(prior.exitCode)
        ? prior.exitCode
        : null;
    if (exitCode === null) return null;
    attestations.push(Object.freeze({
      version: ADAPTER_COMMAND_ATTESTATION_VERSION,
      taskSpecSha256: candidate.taskSpecSha256,
      evidencePlanSha256: candidate.evidencePlanSha256,
      criterionId: procedure.criterionId,
      sequence,
      commandSha256: command.sha256,
      exitCode,
    }));
  }
  const frozen = Object.freeze(attestations);
  if (hasUnexpectedPlannedExit(context.contract, frozen)) return null;
  context.attestations = frozen;
  context.attestationsCompleteForDone = true;
  return candidate;
}

type TerminalExecutionContext = Readonly<{
  plan: PendingTerminalPlanV1;
  action: SerialCandidateTerminalActionCustody;
}>;

function stopSerialCandidateRaw(
  value: unknown,
  reason: SerialStopReason = "MODEL_RESULT_NOT_VERIFIED",
  terminalExecution?: TerminalExecutionContext,
): SerialCandidateTerminalResult | null {
  if (!validCandidateStopReason(reason)) return null;
  const open = openContextForCandidate(value);
  if (!open) return null;
  const { candidate, context } = open;
  if (!serialCandidateGitEnvironmentSafe()
    || !candidateGitMetadataSafe(context.projectRoot, context.contract.ownedRecords)) return null;
  if (!candidateTerminalPathsUnaliased(candidate, context, true, true)) return null;
  if (!candidateMissingRegularProductOwnedStateSafe(candidate, context)) return null;
  // STOP permits pre-existing product drift. Its path set, exact-workspace
  // class, ignored-tree class, and rendered custody are nevertheless frozen
  // across the one record transaction so a concurrent mutation can never be
  // described by stale terminal facts.
  const stopObservation = observeCandidateStop(candidate, context);
  if (!stopObservation) return null;
  const reportFilesChanged = stopObservation.reportFilesChanged;
  const custody = stopObservation.custody.custody;
  emit(context.activities, context.events, {
    stage: "Check",
    state: "working",
    detail: "Rechecking pending candidate record custody before STOP.",
  });
  const recovery = candidateRecordRecovery(candidate, context);
  if (recovery === null) return null;
  const token = beginSerialCandidateTerminal(candidate, "STOPPED");
  if (!token) return null;
  try {
    const protectedPathsExact = protectedStartingPathsOrNull(context.projectRoot, context.start);
    if (protectedPathsExact === null) {
      const restored = restoreCandidateLogBeforeThrow(context.projectRoot, context.start);
      throw recordVerificationFailed("Git could not verify protected work while stopping the pending candidate.", restored);
    }
    const headBeforeWrite = candidateGit(context.projectRoot, ["rev-parse", "HEAD"]);
    const refBeforeWrite = currentSymbolicHead(context.projectRoot);
    const protectedStarting = protectedPathsExact
      && headBeforeWrite === context.start.head
      && refBeforeWrite === context.startHeadRef;
    const usesOriginalEvidenceGeneration = candidate.round === 0 && candidate.callsUsed.repair === 0
      && candidate.candidateSha256 === context.sealableCandidateSha256
      && candidate.claimsSha256 === context.sealableClaimsSha256
      && candidate.bundleSha256 === context.sealableBundleSha256
      && context.attestations.every((row) => row.evidencePlanSha256 === candidate.evidencePlanSha256);
    const stopTaskSpecEvidence = Object.freeze({
      claims: usesOriginalEvidenceGeneration ? context.claims : candidate.claims,
      attestations: usesOriginalEvidenceGeneration ? context.attestations : Object.freeze([]),
    });
    const records = cairnWorkerRecords(
      context.projectRoot,
      context.contract,
      context.start,
      "STOPPED",
      reason,
      null,
      protectedStarting,
      null,
      usesOriginalEvidenceGeneration ? context.evidence : null,
      recovery,
      stopTaskSpecEvidence,
      custody,
      reportFilesChanged,
      terminalExecution?.action,
      terminalExecution?.plan.recordDate,
      context.contractMarkdown,
    );
    if (!records.verified) {
      const restored = restoreCandidateLogBeforeThrow(context.projectRoot, context.start);
      throw recordVerificationFailed("The pending candidate stop record could not be verified.", restored);
    }
    let terminalRecords: Readonly<{ reportText: string; row: LogRow }> = records;
    let terminalComposed = records.composed;
    if (!candidateStopBoundaryIntact(
      candidate,
      context,
      records,
      headBeforeWrite,
      refBeforeWrite,
      protectedPathsExact,
      stopObservation,
    )) {
      const rewriteObservation = observeCandidateStop(candidate, context);
      const rewriteProtected = protectedStartingPathsOrNull(context.projectRoot, context.start);
      if (rewriteObservation === null || rewriteProtected === null) {
        const restored = restoreCandidateLogBeforeThrow(context.projectRoot, context.start);
        throw recordVerificationFailed("Candidate metadata changed while writing the stop record.", restored);
      }
      const rewriteHead = candidateGit(context.projectRoot, ["rev-parse", "HEAD"]);
      const rewriteRef = currentSymbolicHead(context.projectRoot);
      const rewriteReportFiles = rewriteObservation.reportFilesChanged;
      const conservative = replaceDoneRecordsWithStopped(
        context.projectRoot,
        context.contract,
        false,
        context.start,
        false,
        records,
        reason,
        usesOriginalEvidenceGeneration ? context.evidence : undefined,
        stopTaskSpecEvidence,
        rewriteObservation.custody.custody,
        rewriteReportFiles,
        false,
        terminalExecution?.action,
        terminalExecution?.plan.recordDate,
      );
      if (!conservative?.verified || !candidateStopBoundaryIntact(
        candidate,
        context,
        conservative,
        rewriteHead,
        rewriteRef,
        rewriteProtected,
        rewriteObservation,
      )) {
        const restored = restoreCandidateLogBeforeThrow(context.projectRoot, context.start);
        throw recordVerificationFailed("Candidate metadata changed while writing the stop record.", restored);
      }
      terminalRecords = conservative;
      terminalComposed = Object.freeze({
        ...records.composed,
        filesChanged: rewriteReportFiles,
        protectedIntact: false,
      });
    }
    const terminalCandidate = completeSerialCandidateTerminal(token, "STOPPED");
    if (!terminalCandidate) throw new Error("SERIAL_CANDIDATE_TERMINAL_COMPLETION_FAILED");
    emitCandidateTerminal(context.activities, context.events, {
      stage: "Check",
      state: "stopped",
      detail: `Stopped safely: ${stopReasonInPlainWords(reason)} (${reason}).`,
    });
    emitCandidateTerminal(context.activities, context.events, { stage: "Result", state: "stopped", detail: `STOPPED — ${stopReasonInPlainWords(reason)}` });
    releaseOpenCandidate(candidate.runId, context);
    return {
      status: "stopped",
      reason,
      taskNumber: context.contract.taskNumber,
      disposition: "STOPPED",
      briefPath: paths.brief(context.projectRoot, context.contract.taskNumber),
      reportPath: paths.report(context.projectRoot, context.contract.taskNumber),
      reportText: terminalRecords.reportText,
      row: terminalRecords.row,
      route: context.route,
      activities: candidateActivityView(context.activities),
      commit: { status: "skipped", reason: "The latest candidate was retained untouched for inspection." },
      composed: terminalComposed,
      candidate: terminalCandidate,
    };
  } catch (error) {
    completeSerialCandidateTerminal(token, "STOPPED");
    releaseOpenCandidate(candidate.runId, context);
    throw error;
  }
}

function finalizeSerialCandidateRaw(
  value: unknown,
  sealAuthorization: SerialCandidateSealAuthorizationV1,
  terminalExecution?: TerminalExecutionContext,
): SerialCandidateTerminalResult | null {
  const open = openContextForCandidate(value);
  if (!open) return null;
  const { candidate, context } = open;
  if (!serialCandidateGitEnvironmentSafe()
    || !candidateGitMetadataSafe(context.projectRoot, context.contract.ownedRecords)) return null;
  const candidateFilesChanged = candidateScanChangedPaths(context.projectRoot, context.contract.ownedRecords);
  const completionAuthority = serialCompletionRecordAuthority(candidate);
  if (!isSerialCandidateSealAuthorization(sealAuthorization, candidate)
    || candidate.candidateSha256 !== context.sealableCandidateSha256
    || candidate.claimsSha256 !== context.sealableClaimsSha256
    || candidate.bundleSha256 !== context.sealableBundleSha256
    || (context.start.status.length === 0 && context.startHeadRef === null)
    || !context.attestationsCompleteForDone
    || composeBoundRunRecord(
      context.contract, "DONE", null, context.claims, context.attestations, completionAuthority,
    ) === null
    || !candidateWorkspaceStillExact(candidate, context)
    || !candidateTerminalPathsUnaliased(candidate, context)
    || candidateFilesChanged === null) return null;
  const reportFilesChanged = candidateReportChangedPaths(candidateFilesChanged);
  const custody = candidateCustody(context.projectRoot, candidate);
  const token = beginSerialCandidateTerminal(candidate, "DONE", sealAuthorization);
  if (!token) return null;
  let irreversibleDoneCommit = false;
  const taskSpecEvidence = Object.freeze({ claims: context.claims, attestations: context.attestations, completionAuthority });
  const stoppedAfterDoneWrite = (
    records: { reportText: string; row: LogRow },
    reason: SerialStopReason,
  ): SerialCandidateTerminalResult => {
    const stoppedObservation = observeCandidateStop(candidate, context);
    const rewriteHeadBefore = candidateGit(context.projectRoot, ["rev-parse", "HEAD"]);
    const rewriteRefBefore = currentSymbolicHead(context.projectRoot);
    const rewriteProtectedBefore = protectedStartingPathsOrNull(context.projectRoot, context.start);
    if (stoppedObservation === null || rewriteProtectedBefore === null) {
      throw new Error("UNSAFE_SERIAL_CANDIDATE_STOP_REWRITE_BOUNDARY");
    }
    const stoppedReportFilesChanged = stoppedObservation.reportFilesChanged;
    const stoppedCustody = stoppedObservation.custody.custody;
    // A DONE-to-STOPPED downgrade reports the conservative fact. It never
    // claims protected custody survived the failed terminal transaction.
    const protectedIntact = false;
    const stopped = replaceDoneRecordsWithStopped(
      context.projectRoot,
      context.contract,
      false,
      context.start,
      false,
      records,
      reason,
      context.evidence,
      taskSpecEvidence,
      stoppedCustody,
      stoppedReportFilesChanged,
      protectedIntact,
      terminalExecution?.action,
      terminalExecution?.plan.recordDate,
    );
    if (!stopped?.verified) {
      const restored = restoreCandidateLogBeforeThrow(context.projectRoot, context.start);
      throw recordVerificationFailed("Candidate task records were retained for inspection.", restored);
    }
    if (!candidateStopBoundaryIntact(
      candidate,
      context,
      stopped,
      rewriteHeadBefore,
      rewriteRefBefore,
      rewriteProtectedBefore,
      stoppedObservation,
    )) {
      throw new Error("UNSAFE_SERIAL_CANDIDATE_STOP_REWRITE_BOUNDARY");
    }
    const terminalCandidate = completeSerialCandidateTerminal(token, "STOPPED");
    if (!terminalCandidate) throw new Error("SERIAL_CANDIDATE_TERMINAL_COMPLETION_FAILED");
    emitCandidateTerminal(context.activities, context.events, {
      stage: "Check",
      state: "stopped",
      detail: `Stopped safely: ${stopReasonInPlainWords(reason)} (${reason}).`,
    });
    emitCandidateTerminal(context.activities, context.events, { stage: "Result", state: "stopped", detail: `STOPPED — ${stopReasonInPlainWords(reason)}` });
    releaseOpenCandidate(candidate.runId, context);
    return {
      status: "stopped",
      reason,
      taskNumber: context.contract.taskNumber,
      disposition: "STOPPED",
      briefPath: paths.brief(context.projectRoot, context.contract.taskNumber),
      reportPath: paths.report(context.projectRoot, context.contract.taskNumber),
      reportText: stopped.reportText,
      row: stopped.row,
      route: context.route,
      activities: candidateActivityView(context.activities),
      commit: { status: "skipped", reason: "Candidate terminal verification failed." },
      composed: composedForClose(context.contract, "STOPPED", reason, {
        claims: null,
        filesChanged: stoppedReportFilesChanged,
        protectedIntact,
        commit: null,
        evidenceSummary: boundedEvidenceSummary(context.evidence),
        processFailure: null,
        paidCallStarted: true,
        taskSpecClaims: context.claims,
        adapterAttestations: context.attestations,
      }),
      candidate: terminalCandidate,
    };
  };

  try {
    if (context.start.status.length > 0) {
      const commit: RecordCommit = {
        status: "skipped",
        reason: "Protected starting work prevented an isolated candidate task commit.",
      };
      const records = cairnWorkerRecords(
        context.projectRoot,
        context.contract,
        context.start,
        "DONE",
        null,
        null,
        true,
        commit,
        context.evidence,
        undefined,
        taskSpecEvidence,
        custody,
        reportFilesChanged,
        terminalExecution?.action,
        terminalExecution?.plan.recordDate,
        context.contractMarkdown,
      );
      if (!records.verified) return stoppedAfterDoneWrite(records, "RECORD_VERIFICATION_FAILED");
      if (!candidateTerminalBoundaryIntact(candidate, context, records)) {
        return stoppedAfterDoneWrite(records, "MODEL_RESULT_NOT_VERIFIED");
      }
      const terminalCandidate = completeSerialCandidateTerminal(token, "DONE");
      if (!terminalCandidate) throw new Error("SERIAL_CANDIDATE_TERMINAL_COMPLETION_FAILED");
      emitCandidateTerminal(context.activities, context.events, {
        stage: "Check",
        state: "done",
        detail: "The sealed candidate and protected work were verified; the dirty start keeps changes uncommitted.",
      });
      emitCandidateTerminal(context.activities, context.events, { stage: "Result", state: "done", detail: "DONE — the pre-seal candidate was finalized once." });
      releaseOpenCandidate(candidate.runId, context);
      return {
        status: "done",
        taskNumber: context.contract.taskNumber,
        disposition: "DONE",
        briefPath: paths.brief(context.projectRoot, context.contract.taskNumber),
        reportPath: paths.report(context.projectRoot, context.contract.taskNumber),
        reportText: records.reportText,
        row: records.row,
        route: context.route,
        activities: candidateActivityView(context.activities),
        commit,
        composed: records.composed,
        candidate: terminalCandidate,
      };
    }

    const records = cairnWorkerRecords(
      context.projectRoot,
      context.contract,
      context.start,
      "DONE",
      null,
      null,
      true,
      { status: "created", reason: "One exact-path commit contains the candidate product changes and terminal records." },
      context.evidence,
      undefined,
      taskSpecEvidence,
      custody,
      reportFilesChanged,
      terminalExecution?.action,
      terminalExecution?.plan.recordDate,
      context.contractMarkdown,
    );
    if (!records.verified) return stoppedAfterDoneWrite(records, "RECORD_VERIFICATION_FAILED");
    if (!candidateTerminalBoundaryIntact(candidate, context, records)) {
      return stoppedAfterDoneWrite(records, "MODEL_RESULT_NOT_VERIFIED");
    }
    const expectedCommitSet = [...new Set([...context.taskPaths, ...context.contract.ownedRecords])];
    const ownedRecords = candidateOwnedRecordBlobs(context, records);
    let commit: RecordCommit | null;
    try {
      commit = commitCandidateExactPaths(
        context.projectRoot,
        context.start,
        expectedCommitSet,
        context.contract.taskNumber,
        candidate.bundle,
        context.startHeadRef!,
        ownedRecords,
        terminalExecution?.plan.actionId,
      );
    } catch {
      commit = null;
    }
    if (!commit) {
      return stoppedAfterDoneWrite(records, "MODEL_RESULT_NOT_VERIFIED");
    }
    irreversibleDoneCommit = true;
    const terminalCandidate = completeSerialCandidateTerminal(token, "DONE");
    if (!terminalCandidate) throw new Error("SERIAL_CANDIDATE_TERMINAL_COMPLETION_FAILED");
    emitCandidateTerminal(context.activities, context.events, {
      stage: "Check",
      state: "done",
      detail: "The sealed candidate, custody record, protected work, and exact-path commit were verified.",
    });
    emitCandidateTerminal(context.activities, context.events, { stage: "Result", state: "done", detail: "DONE — the pre-seal candidate was finalized once." });
    releaseOpenCandidate(candidate.runId, context);
    return {
      status: "done",
      taskNumber: context.contract.taskNumber,
      disposition: "DONE",
      briefPath: paths.brief(context.projectRoot, context.contract.taskNumber),
      reportPath: paths.report(context.projectRoot, context.contract.taskNumber),
      reportText: records.reportText,
      row: records.row,
      route: context.route,
      activities: candidateActivityView(context.activities),
      commit,
      composed: records.composed,
      candidate: terminalCandidate,
    };
  } catch (error) {
    if (!irreversibleDoneCommit) completeSerialCandidateTerminal(token, "STOPPED");
    releaseOpenCandidate(candidate.runId, context);
    throw error;
  }
}

function terminalPlanStillExact(
  candidate: SerialCandidateV1,
  context: OpenSerialCandidateContext,
  binding: NonNullable<ReturnType<typeof terminalPreparationBindings.get>>,
): boolean {
  try {
    const input: NonNullable<ReturnType<typeof terminalPreparationInput>> = binding.plan.kind === "finalize"
      ? Object.freeze({
          actionId: binding.plan.actionId,
          kind: "finalize",
          reason: null,
          sealAuthorization: binding.sealAuthorization,
        }) as NonNullable<ReturnType<typeof terminalPreparationInput>>
      : Object.freeze({
          actionId: binding.plan.actionId,
          kind: "stop",
          reason: binding.plan.reason,
          sealAuthorization: null,
        });
    const preview = terminalRecordPreview(
      candidate,
      context,
      input,
      binding.plan.baseCapsuleSha256,
      binding.plan.recordDate,
    );
    const projectedActivities = preview ? projectedTerminalActivities(
      context.activities,
      binding.plan.kind,
      binding.plan.reason,
      preview.commitExpected,
    ) : null;
    return preview !== null
      && projectedActivities !== null
      && pendingSha256(preview.reportText) === binding.plan.reportSha256
      && pendingSha256(context.start.logText + expectedLogLine(preview.row)) === binding.plan.logSha256
      && pendingSha256(JSON.stringify(preview.row)) === binding.plan.rowSha256
      && pendingSha256(context.contractMarkdown) === binding.plan.briefSha256
      && preview.commitExpected === binding.plan.commitExpected
      && sameLines(preview.expectedCommitPaths, binding.plan.expectedCommitPaths)
      && exactPendingJson(preview.reportText, binding.plan.resultProjection.reportText)
      && exactPendingJson(preview.row, binding.plan.resultProjection.row)
      && exactPendingJson(preview.composed, binding.plan.resultProjection.composed)
      && exactPendingJson(projectedActivities, binding.plan.resultProjection.activities);
  } catch {
    return false;
  }
}

function terminalResultMatchesPreparedPlan(
  plan: PendingTerminalPlanV1,
  result: SerialCandidateTerminalResult,
  logText: string,
): boolean {
  try {
    const expectedCommitStatus = plan.commitExpected ? "created" : "skipped";
    const resultStatusExact = plan.disposition === "DONE"
      ? result.status === "done" && result.candidate.phase === "done"
      : result.status === "stopped" && result.candidate.phase === "stopped";
    const commitExact = result.commit.status === expectedCommitStatus
      && (expectedCommitStatus === "created"
        ? typeof result.commit.hash === "string" && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(result.commit.hash)
        : result.commit.hash === undefined);
    return resultStatusExact
      && result.disposition === plan.disposition
      && pendingSha256(result.reportText) === plan.reportSha256
      && pendingSha256(logText) === plan.logSha256
      && pendingSha256(JSON.stringify(result.row)) === plan.rowSha256
      && commitExact;
  } catch {
    return false;
  }
}

function composeTerminalReceipt(
  action: SerialCandidateTerminalActionV1,
  plan: PendingTerminalPlanV1,
  result: SerialCandidateTerminalResult,
  logText: string,
): SerialCandidateTerminalReceiptV1 | null {
  try {
    if (!ACTION_UUID_V4_RE.test(action.actionId)
      || action.actionId !== plan.actionId || action.kind !== plan.kind
      || action.candidateSha256 !== plan.candidateSha256
      || !SHA256_RE.test(action.capsuleSha256)
      || !terminalResultMatchesPreparedPlan(plan, result, logText)) return null;
    const withoutSha = Object.freeze({
      version: SERIAL_CANDIDATE_TERMINAL_RECEIPT_VERSION,
      actionId: action.actionId,
      kind: action.kind,
      disposition: plan.disposition,
      taskNumber: result.taskNumber,
      candidateSha256: action.candidateSha256,
      preparedCapsuleSha256: action.capsuleSha256,
      reportSha256: plan.reportSha256,
      logSha256: plan.logSha256,
      commitStatus: result.commit.status,
      commitHash: result.commit.hash ?? null,
    });
    const bytes = pendingCanonicalBytes(withoutSha);
    if (!bytes) return null;
    return Object.freeze({
      ...withoutSha,
      terminalReceiptSha256: pendingSha256(bytes),
    }) as SerialCandidateTerminalReceiptV1;
  } catch {
    return null;
  }
}

/** Execute only one exact terminal plan whose prepared capsule is durably acknowledged. */
export function executeSerialCandidateTerminal(
  value: unknown,
  preparation: unknown,
  persistedCapsuleSha256: unknown,
): SerialCandidateTerminalExecutionV1 | null {
  if (typeof preparation !== "object" || preparation === null
    || !terminalPreparationBrand.has(preparation)
    || typeof persistedCapsuleSha256 !== "string") return null;
  const binding = terminalPreparationBindings.get(preparation);
  const prepared = preparation as SerialCandidateTerminalPreparationV1;
  if (!binding || binding.candidate !== value
    || terminalPreparationByCandidate.get(binding.candidate) !== preparation
    || prepared.action.capsuleSha256 !== persistedCapsuleSha256
    || prepared.capsule.capsuleSha256 !== persistedCapsuleSha256
    || pendingSha256(prepared.capsule.canonicalBytes) !== persistedCapsuleSha256) return null;
  const open = openContextForCandidate(value);
  if (!open || open.candidate !== binding.candidate
    || !terminalPlanStillExact(open.candidate, open.context, binding)) return null;
  const startingLogText = open.context.start.logText;
  const execution = Object.freeze({ plan: binding.plan, action: terminalActionCustody(binding.plan) });
  const rawResult = binding.plan.kind === "finalize"
    ? binding.sealAuthorization
      ? finalizeSerialCandidateRaw(open.candidate, binding.sealAuthorization, execution)
      : null
    : binding.plan.reason
      ? stopSerialCandidateRaw(open.candidate, binding.plan.reason, execution)
      : null;
  if (!rawResult) {
    // A raw null is a refusal, not a failed write: both raw terminals return
    // null only above their `beginSerialCandidateTerminal` call, so no report,
    // LOG row, commit, or lock release exists yet. Release this action's
    // reservation so an owner who corrects the drift the raw path refused —
    // a product moved onto an owned record, unsafe Git metadata — can still be
    // given a new terminal action. Leaving it registered would let one benign
    // refusal wedge the candidate for the rest of the process, because a fresh
    // `actionId` is rejected while a preparation exists. Authoring twice stays
    // impossible without this reservation, but not through the phase check:
    // `mintCandidate` returns a NEW frozen object, so this one keeps its
    // pre-terminal phase forever. The real barriers are the currency test in
    // `isCurrentSerialCandidate` (`candidate.ts`), which fails once
    // `lineage.current` moves on or `terminalReserved`/`parked` is set, and
    // `context.released` in `openContextForCandidate`.
    // The `!receipt` path below must NOT do this — it runs after real records
    // exist on disk.
    terminalPreparationByCandidate.delete(binding.candidate);
    terminalPreparationBindings.delete(preparation);
    return null;
  }
  const result = brandSerialCandidateTerminalResult(rawResult);
  // Terminal effects have already happened at this point. A result that
  // cannot be represented by the closed digest schema is therefore treated
  // like a missing receipt: fail closed and let authenticated restart
  // reconciliation recover the exact on-disk terminal result.
  if (!result) return null;
  // Raw completion has already byte-verified this exact append before it
  // releases the live lock. Compose from the retained starting bytes and the
  // truthful returned row so a post-release observer cannot make Core lose the
  // receipt for an already-completed terminal effect.
  const receipt = composeTerminalReceipt(
    prepared.action,
    binding.plan,
    result,
    startingLogText + expectedLogLine(result.row),
  );
  // A raw DONE path may conservatively rewrite itself to STOPPED after a late
  // mutation. Those honest terminal effects stay on disk, but they are not the
  // persisted action the caller acknowledged. Never mint closable authority
  // for a different disposition or different report/LOG bytes; restart
  // reconciliation will classify the mismatch as manual recovery.
  if (!receipt) return null;
  terminalPreparationByCandidate.delete(binding.candidate);
  terminalPreparationBindings.delete(preparation);
  return Object.freeze({ result, receipt });
}

function parsePendingTerminalResultProjection(value: unknown): PendingTerminalResultProjectionV1 | null {
  if (!exactPendingKeys(value, ["reportText", "row", "composed", "activities", "commit"])
    || typeof value.reportText !== "string" || Buffer.byteLength(value.reportText, "utf8") > 1024 * 1024
    || !exactPendingKeys(value.row, ["task", "date", "lane", "mode", "outcome", "decision", "summary", "moved"])) return null;
  const rowRecord = value.row;
  if (Object.values(rowRecord).some((entry) => typeof entry !== "string" || entry.length > 4096)) return null;
  const activities = parsePendingActivities(value.activities);
  if (!activities || !exactPendingKeys(value.commit, ["status", "reason"])
    || (value.commit.status !== "created" && value.commit.status !== "skipped")
    || typeof value.commit.reason !== "string" || value.commit.reason.length > 4096
    || !value.composed || typeof value.composed !== "object" || Array.isArray(value.composed)
    || pendingCanonicalBytes(value.composed) === null) return null;
  const composed = value.composed as unknown as ComposedRecordInput;
  if (!Number.isSafeInteger(composed.taskNumber)
    || (composed.disposition !== "DONE" && composed.disposition !== "STOPPED")
    || (composed.stopReason !== null && typeof composed.stopReason !== "string")) return null;
  return Object.freeze({
    reportText: value.reportText,
    row: Object.freeze({
      task: rowRecord.task as string,
      date: rowRecord.date as string,
      lane: rowRecord.lane as string,
      mode: rowRecord.mode as string,
      outcome: rowRecord.outcome as string,
      decision: rowRecord.decision as string,
      summary: rowRecord.summary as string,
      moved: rowRecord.moved as string,
    }),
    composed,
    activities: Object.freeze(activities),
    commit: Object.freeze({ status: value.commit.status, reason: value.commit.reason }),
  });
}

function parsePendingTerminalPlan(value: unknown): PendingTerminalPlanV1 | null {
  if (!exactPendingKeys(value, [
    "version", "actionId", "kind", "disposition", "reason", "candidateSha256", "baseCapsuleSha256",
    "recordDate", "reportSha256", "logSha256", "rowSha256", "briefSha256", "commitExpected",
    "expectedCommitPaths", "commitMessage", "sealAuthorization", "resultProjection",
  ]) || value.version !== PENDING_TERMINAL_PLAN_VERSION
    || typeof value.actionId !== "string" || !ACTION_UUID_V4_RE.test(value.actionId)
    || (value.kind !== "finalize" && value.kind !== "stop")
    || (value.disposition !== "DONE" && value.disposition !== "STOPPED")
    || typeof value.candidateSha256 !== "string" || !SHA256_RE.test(value.candidateSha256)
    || typeof value.baseCapsuleSha256 !== "string" || !SHA256_RE.test(value.baseCapsuleSha256)
    || typeof value.recordDate !== "string" || !validTerminalRecordDate(value.recordDate)
    || typeof value.reportSha256 !== "string" || !SHA256_RE.test(value.reportSha256)
    || typeof value.logSha256 !== "string" || !SHA256_RE.test(value.logSha256)
    || typeof value.rowSha256 !== "string" || !SHA256_RE.test(value.rowSha256)
    || typeof value.briefSha256 !== "string" || !SHA256_RE.test(value.briefSha256)
    || typeof value.commitExpected !== "boolean") return null;
  const pathsValue = parsePendingCandidatePaths(value.expectedCommitPaths, 128, true);
  const resultProjection = parsePendingTerminalResultProjection(value.resultProjection);
  if (!pathsValue || !resultProjection
    || pendingSha256(resultProjection.reportText) !== value.reportSha256
    || pendingSha256(JSON.stringify(resultProjection.row)) !== value.rowSha256
    || resultProjection.composed.disposition !== value.disposition
    || resultProjection.commit.status !== (value.commitExpected ? "created" : "skipped")) return null;
  if (value.kind === "finalize") {
    if (value.disposition !== "DONE" || value.reason !== null || value.sealAuthorization === null
      || (value.commitExpected ? typeof value.commitMessage !== "string" : value.commitMessage !== null)) return null;
  } else if (value.disposition !== "STOPPED" || !validCandidateStopReason(value.reason)
    || value.sealAuthorization !== null || value.commitExpected || value.commitMessage !== null
    || pathsValue.length !== 0) return null;
  return Object.freeze({
    ...value,
    expectedCommitPaths: pathsValue,
    resultProjection,
  }) as PendingTerminalPlanV1;
}

function validTerminalRecordDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

type ParsedTerminalPreparation = Readonly<{
  parsed: NonNullable<ReturnType<typeof parseAnyPendingCapsule>>;
  pendingInner: Record<string, unknown>;
  baseCapsule: SerialPendingCandidateCapsuleV1;
  plan: PendingTerminalPlanV1;
  action: SerialCandidateTerminalActionV1;
}>;

function parseTerminalPreparation(
  capsuleValue: unknown,
  actionValue: unknown,
): ParsedTerminalPreparation | null {
  try {
    const parsed = parseAnyPendingCapsule(capsuleValue);
    const detachedAction = detachPendingJson(actionValue);
    const pending = parsed?.inner.pending;
    if (!parsed || !exactPendingKeys(parsed.inner, ["version", "pending", "terminalPlan"])
      || parsed.inner.version !== SERIAL_PREPARED_CANDIDATE_TERMINAL_INNER_VERSION
      || !pending || typeof pending !== "object" || Array.isArray(pending)
      || pendingCandidateInnerKind(pending) === null
      || (pending as Record<string, unknown>).version !== SERIAL_PENDING_CANDIDATE_INNER_VERSION
      || !exactPendingKeys(detachedAction, ["actionId", "kind", "candidateSha256", "capsuleSha256"])) return null;
    const pendingRecord = pending as Record<string, unknown>;
    const plan = parsePendingTerminalPlan(parsed.inner.terminalPlan);
    if (!plan || typeof detachedAction.actionId !== "string" || detachedAction.actionId !== plan.actionId
      || detachedAction.kind !== plan.kind
      || detachedAction.candidateSha256 !== plan.candidateSha256
      || detachedAction.capsuleSha256 !== parsed.capsuleSha256) return null;
    const baseCapsule = pendingCapsuleFromInner(pendingRecord, true);
    if (!baseCapsule || baseCapsule.capsuleSha256 !== plan.baseCapsuleSha256) return null;
    const pendingCandidate = parsePendingCandidateRecord(pendingRecord.candidate);
    if (!pendingCandidate || pendingCandidate.candidateSha256 !== plan.candidateSha256) return null;
    const pendingStart = parsePendingStart(pendingRecord.start);
    const taskPaths = parsePendingCandidatePaths(pendingRecord.taskPaths, 100, false);
    const ownedPaths = parsePendingCandidatePaths(pendingRecord.ownedPaths, 16, true);
    const taskNumber = pendingCandidate.taskNumber;
    const pendingRoot = pendingRecord.projectRootReal;
    if (!pendingStart || !taskPaths || !ownedPaths || !Number.isSafeInteger(taskNumber)
      || typeof pendingRoot !== "string") return null;
    const expectedOwnedPaths = [
      rel(pendingRoot, paths.brief(pendingRoot, taskNumber as number)),
      rel(pendingRoot, paths.report(pendingRoot, taskNumber as number)),
      rel(pendingRoot, paths.log(pendingRoot)),
    ].sort();
    const commitExpected = plan.kind === "finalize" && pendingStart.status.length === 0;
    const expectedCommitPaths = commitExpected
      ? [...new Set([...taskPaths, ...ownedPaths])].sort()
      : [];
    if (!sameLines(ownedPaths, expectedOwnedPaths)
      || plan.commitExpected !== commitExpected
      || !sameLines(plan.expectedCommitPaths, expectedCommitPaths)
      || plan.commitMessage !== (commitExpected
        ? candidateTerminalCommitMessage(taskNumber as number, plan.actionId)
        : null)) return null;
    const action = Object.freeze({
      actionId: detachedAction.actionId,
      kind: detachedAction.kind,
      candidateSha256: detachedAction.candidateSha256,
      capsuleSha256: detachedAction.capsuleSha256,
    }) as SerialCandidateTerminalActionV1;
    return Object.freeze({ parsed, pendingInner: pendingRecord, baseCapsule, plan, action });
  } catch {
    return null;
  }
}

function releaseReconciledCandidate(candidate: SerialCandidateV1): void {
  const open = openContextForCandidate(candidate);
  if (!open) return;
  try {
    parkCurrentSerialCandidate(candidate);
  } finally {
    releaseOpenCandidate(candidate.runId, open.context);
  }
}

function terminalReconcileStale(
  reason: Extract<SerialCandidateTerminalReconcileResultV1, { status: "stale" }> ["reason"],
): SerialCandidateTerminalReconcileResultV1 {
  return Object.freeze({ status: "stale", reason });
}

function preparedOwnedAuthority(value: unknown): CandidateOwnedRecordIndexAuthority | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  const output: CandidateOwnedRecordIndexAuthority[number][] = [];
  for (const entry of value) {
    if (!exactPendingKeys(entry, ["projectRelativePath", "startingEntry", "terminalMode"])
      || typeof entry.projectRelativePath !== "string"
      || (entry.terminalMode !== "100644" && entry.terminalMode !== "100755")) return null;
    let startingEntry: CandidateGitBlobEntry;
    if (entry.startingEntry === null) startingEntry = null;
    else {
      if (!exactPendingKeys(entry.startingEntry, ["oid", "mode"])
        || typeof entry.startingEntry.oid !== "string"
        || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(entry.startingEntry.oid)
        || (entry.startingEntry.mode !== "100644" && entry.startingEntry.mode !== "100755")) return null;
      startingEntry = Object.freeze({ mode: entry.startingEntry.mode, oid: entry.startingEntry.oid });
    }
    output.push(Object.freeze({
      projectRelativePath: entry.projectRelativePath,
      startingEntry,
      terminalMode: entry.terminalMode,
    }));
  }
  return Object.freeze(output);
}

type AuthenticatedPreparedPendingSemantics = Readonly<{
  candidate: SerialCandidateV1;
  bundle: SerialCandidateBundleV1;
  start: GitSnapshot;
  ownedRecordIndexAuthority: CandidateOwnedRecordIndexAuthority;
}>;

/** Rebuild every candidate brand from the prepared capsule without trusting
 * its terminal plan as a substitute for the original Task Spec/candidate
 * semantics. This intentionally does not require pre-terminal workspace bytes:
 * the caller may be classifying an already-completed records/commit effect. */
function authenticatePreparedPendingSemantics(
  projectRoot: string,
  pending: Record<string, unknown>,
  plan: PendingTerminalPlanV1,
  authenticatedQ9: boolean,
): AuthenticatedPreparedPendingSemantics | null {
  try {
    const invalid = (stage: string): null => {
      void stage;
      return null;
    };
    const candidateRecord = parsePendingCandidateRecord(pending.candidate);
    if (!candidateRecord) return invalid("candidate");
    const pendingKind = pendingCandidateInnerKind(pending);
    if (pendingKind === null) return invalid("pending-kind");
    if (pendingKind === "q9" && !authenticatedQ9) return invalid("unauthenticated-q9");
    const roundOne = candidateRecord.round === 1;
    const repairLineage = roundOne ? parsePendingRepairLineage(pending.repairLineage) : null;
    if ((roundOne && ((candidateRecord.callsUsed as Record<string, unknown>).repair !== 1
      || !repairLineage))
      || (!roundOne && (((candidateRecord.callsUsed as Record<string, unknown>).repair !== 0
        && (candidateRecord.callsUsed as Record<string, unknown>).repair !== 1)
        || pending.repairLineage !== null))) return invalid("candidate-repair-lineage");
    if (roundOne && repairLineage?.kind !== pendingKind) return invalid("repair-lineage-kind");
    if (pendingKind === "q9" && !exactPendingQ9Custody(pending.q9Custody)) return invalid("q9-custody");
    const sources = pendingAuthenticatedSources(pending.taskSpec);
    const sections = pendingContractSections(pending.taskSpec);
    if (!sources || !sections) return invalid("sources");
    const taskSpec = validateTaskSpec(pending.taskSpec, sources, sections);
    if (!taskSpec || !exactPendingJson(taskSpec, pending.taskSpec)) return invalid("task-spec");
    const evidence = restorePendingEvidencePlans(
      taskSpec,
      pendingKind === "q9" ? pending.initialEvidencePlan : pending.evidencePlan,
      pending.evidencePlan,
      pendingKind === "q9" ? pending.evidencePlanRevisionCustody : null,
      candidateRecord.runId as string,
    );
    if (!evidence) return invalid("evidence-plan");
    const authority = evidence.currentAuthority;
    const initialAuthority = evidence.initialAuthority;
    if (!authority || candidateRecord.taskSpecSha256 !== authority.taskSpecSha256
      || candidateRecord.evidencePlanSha256 !== authority.evidencePlanSha256) return invalid("authority");

    const start = parsePendingStart(pending.start);
    const route = parsePendingRoute(pending.route);
    const activities = parsePendingActivities(pending.activities);
    const taskPaths = parsePendingCandidatePaths(pending.taskPaths, 100, false);
    const protectedPaths = parsePendingCandidatePaths(pending.protectedPaths, 4096, true);
    const ownedPaths = parsePendingCandidatePaths(pending.ownedPaths, 16, true);
    const taskNumber = candidateRecord.taskNumber;
    if (!start || !route || !activities || !taskPaths || !protectedPaths || !ownedPaths
      || !Number.isSafeInteger(taskNumber)
      || (pending.startHeadRef !== null && (typeof pending.startHeadRef !== "string"
        || !/^refs\/heads\/[A-Za-z0-9][A-Za-z0-9._\/-]*$/u.test(pending.startHeadRef)))) return invalid("context");
    const expectedOwnedPaths = [
      rel(projectRoot, paths.brief(projectRoot, taskNumber as number)),
      rel(projectRoot, paths.report(projectRoot, taskNumber as number)),
      rel(projectRoot, paths.log(projectRoot)),
    ].sort();
    if (!sameLines(ownedPaths, expectedOwnedPaths)) return invalid("owned-paths");
    const contract = composePendingContract(projectRoot, pending.contract, taskNumber as number, authority, start, route);
    const contractMarkdown = contract ? briefText(evidence.authorizedRevision === null ? contract : Object.freeze({
      ...contract,
      evidencePlan: evidence.initialPlan,
      evidencePlanSha256: initialAuthority.evidencePlanSha256,
    }), false) : null;
    if (!contract || !contractMarkdown || pendingSha256(contractMarkdown) !== plan.briefSha256
      || contract.requestSha256 !== candidateRecord.requestSha256) return invalid("contract");
    if (!validEvidence(pending.evidence) || typeof pending.attestationsCompleteForDone !== "boolean"
      || !Array.isArray(pending.attestations) || pending.attestations.length > 64
      || typeof pending.claimsText !== "string" || pending.claimsText.length > 262_144) return invalid("evidence");
    const attestations = Object.freeze([...(pending.attestations as AdapterCommandAttestationV1[])]);
    const retainedQ9HarnessAttestations = !pending.attestationsCompleteForDone && attestations.length > 0
      && q9SerialHarnessGuardPresent() && q9HarnessRouteExact(route)
      && revisionBaseAttestationsValid(authority.taskSpecSha256, evidence.initialPlan, attestations);
    const retainedAuthorizedRevisionBaseAttestations = evidence.authorizedRevision !== null
      && !pending.attestationsCompleteForDone && attestations.length > 0
      && revisionBaseAttestationsExact(authority.taskSpecSha256, evidence.initialPlan, attestations);
    const retainedQ9FailureAttestations = pendingKind === "q9" && !pending.attestationsCompleteForDone
      && retainedQ9FailureAttestationsValid(authority.taskSpecSha256, evidence.currentPlan, attestations);
    const retainedGuardedCairnBlockerAttestations = !pending.attestationsCompleteForDone
      && q9CairnBlockerRouteExact(route)
      && retainedQ9FailureAttestationsValid(authority.taskSpecSha256, evidence.currentPlan, attestations);
    if (!pending.attestationsCompleteForDone && attestations.length !== 0
      && !retainedQ9HarnessAttestations && !retainedAuthorizedRevisionBaseAttestations
      && !retainedQ9FailureAttestations
      && !retainedGuardedCairnBlockerAttestations) {
      return invalid("attestations-shape");
    }

    const roundZeroTaskPaths = roundOne ? pendingBundleTaskPaths(pending.round0Bundle) : taskPaths;
    if (!roundZeroTaskPaths) return invalid("round-zero-task-paths");
    const captureContext = Object.freeze({
      round: 0,
      baseHead: start.head,
      taskPaths: roundZeroTaskPaths,
      protectedPaths,
      ownedPaths,
    });
    const bundle = restoreSerialCandidateBundleForPending(
      projectRoot,
      initialAuthority,
      pending.round0Bundle,
      captureContext,
    );
    if (!bundle || !exactPendingJson(bundle, pending.round0Bundle)) return invalid("bundle");
    const initialEligibilityRecord = repairLineage
      ? repairLineage.preRepairCandidate.repairEligibility
      : candidateRecord.repairEligibility;
    const repairEligibility = initialEligibilityRecord === null
      ? null
      : restoreSerialCandidateRepairEligibilityForPending(bundle, initialEligibilityRecord);
    if (initialEligibilityRecord !== null && !repairEligibility) return invalid("repair-eligibility");
    let initial = composeSerialCandidate(initialAuthority, {
      version: SERIAL_CANDIDATE_VERSION,
      runId: candidateRecord.runId,
      taskNumber,
      requestSha256: candidateRecord.requestSha256,
      claimsText: repairLineage
        ? canonicalClaimsText(repairLineage.preRepairCandidate.claims as TaskSpecWorkerClaims)
        : pending.claimsText,
      bundle,
      repairEligibility,
    });
    if (!initial) return invalid("initial");
    if (evidence.authorizedRevision !== null) {
      const revisedInitial = adoptSerialCandidateEvidencePlanRevision(initial, evidence.authorizedRevision);
      if (!revisedInitial) return invalid("evidence-plan-adoption");
      initial = revisedInitial;
      const restoredRevisionCustody = serialCandidateEvidencePlanRevisionCustody(initial);
      if (!restoredRevisionCustody
        || !exactPendingJson(restoredRevisionCustody, pending.evidencePlanRevisionCustody)) {
        return invalid("evidence-plan-revision-custody");
      }
    }
    const postRepairSealable = repairLineage?.postRepairCandidate ?? null;
    const initialSealable = pending.sealableCandidateSha256 === initial.candidateSha256
      && pending.sealableClaimsSha256 === initial.claimsSha256
      && pending.sealableBundleSha256 === initial.bundleSha256;
    const repairedSealable = postRepairSealable !== null
      && pending.sealableCandidateSha256 === postRepairSealable.candidateSha256
      && pending.sealableClaimsSha256 === postRepairSealable.claimsSha256
      && pending.sealableBundleSha256 === postRepairSealable.bundleSha256;
    if (!initialSealable && !repairedSealable) return invalid("initial");
    const decisions = pendingTransitionDecisions(pending.transitionHistory);
    if (!decisions) return invalid("decisions");
    const replayDecision = (
      source: SerialCandidateV1,
      decision: SerialCandidateTransitionDecisionV1,
    ): SerialCandidateV1 | null => {
      const transition = composeSerialCandidateTransition(source, {
        version: SERIAL_CANDIDATE_TRANSITION_VERSION,
        runId: source.runId,
        generation: source.generation,
        taskNumber: source.taskNumber,
        projectRootSha256: source.projectRootSha256,
        round: source.round,
        taskSpecSha256: source.taskSpecSha256,
        evidencePlanSha256: source.evidencePlanSha256,
        candidateSha256: source.candidateSha256,
        bundleSha256: source.bundleSha256,
        evidenceStateSha256: source.evidenceStateSha256,
        decision,
      });
      return transition ? advanceSerialCandidate(source, transition) : null;
    };
    let candidate = initial;
    const preRepairDecisions = repairLineage?.preRepairTransitionHistory ?? decisions;
    if (repairLineage && (preRepairDecisions.length > decisions.length
      || preRepairDecisions.some((decision, index) => decisions[index] !== decision))) {
      return invalid("repair-transition-boundary");
    }
    for (const decision of preRepairDecisions) {
      const next = replayDecision(candidate, decision);
      if (!next) return invalid("transition");
      candidate = next;
    }
    if (repairLineage) {
      if (repairLineage.kind === "q9"
        && !exactPendingJson(pendingCandidateProjection(candidate), repairLineage.preRepairCandidate)) {
        const restoredPreRepairQ9 = restoreSerialCandidateQ9ForPending(
          candidate,
          repairLineage.preRepairCandidate,
          repairLineage.value.preRepairQ9Custody,
          composeSerialPendingRestoreAuthority(
            plan.baseCapsuleSha256,
            repairLineage.preRepairCandidate.projectRootSha256 as string,
            repairLineage.preRepairCandidate.runId as string,
            repairLineage.preRepairCandidate.candidateSha256 as string,
          ),
          plan.baseCapsuleSha256,
        );
        if (!restoredPreRepairQ9) return invalid("pre-repair-q9-custody");
        candidate = restoredPreRepairQ9;
      }
      if (!exactPendingJson(pendingCandidateProjection(candidate), repairLineage.preRepairCandidate)) {
        return invalid("pre-repair-candidate");
      }
      const repaired = restoreSerialCandidateAfterRepairForPending(projectRoot, candidate, {
        repairInstruction: repairLineage.value.repairInstruction,
        blockers: repairLineage.value.blockers,
        roundOneBundle: repairLineage.value.roundOneBundle,
        roundOneCaptureContext: repairLineage.value.roundOneCaptureContext,
        claimsText: repairLineage.value.claimsText,
      });
      if (!repaired
        || !exactPendingJson(pendingCandidateProjection(repaired), repairLineage.postRepairCandidate)) {
        return invalid("post-repair-candidate");
      }
      candidate = repaired;
      for (const decision of decisions.slice(preRepairDecisions.length)) {
        const next = replayDecision(candidate, decision);
        if (!next) return invalid("post-repair-transition");
        candidate = next;
      }
      const restoredRepairLineage = serialCandidatePendingRepairLineage(candidate);
      if (!restoredRepairLineage
        || !exactPendingJson(pendingRepairLineageProjection(restoredRepairLineage), repairLineage.value)
        || !sameLines(taskPaths, restoredRepairLineage.roundOneCaptureContext.taskPaths)
        || !sameLines(protectedPaths, restoredRepairLineage.roundOneCaptureContext.protectedPaths)
        || !sameLines(ownedPaths, restoredRepairLineage.roundOneCaptureContext.ownedPaths)
        || start.head !== restoredRepairLineage.roundOneCaptureContext.baseHead) {
        return invalid("repair-lineage-exact");
      }
    }
    if (pendingKind === "q9") {
      const restoredQ9 = restoreSerialCandidateQ9ForPending(
        candidate,
        candidateRecord,
        pending.q9Custody,
        composeSerialPendingRestoreAuthority(
          plan.baseCapsuleSha256,
          candidateRecord.projectRootSha256 as string,
          candidateRecord.runId as string,
          candidateRecord.candidateSha256 as string,
        ),
        plan.baseCapsuleSha256,
      );
      if (!restoredQ9) return invalid("q9-custody-replay");
      candidate = restoredQ9;
    }
    if (!exactPendingJson(pendingCandidateProjection(candidate), candidateRecord)
      || candidate.candidateSha256 !== plan.candidateSha256) return invalid("projection");
    if (pendingKind === "q9" && activateSerialCandidateAfterPendingRestore(
      candidate,
      composeSerialPendingRestoreAuthority(
        plan.baseCapsuleSha256,
        candidate.projectRootSha256,
        candidate.runId,
        candidate.candidateSha256,
      ),
      plan.baseCapsuleSha256,
    ) !== candidate) return invalid("restore-authority-gate");
    const projectedActivities = projectedTerminalActivities(
      activities,
      plan.kind,
      plan.reason,
      plan.commitExpected,
    );
    if (!projectedActivities
      || plan.resultProjection.composed.taskNumber !== taskNumber
      || plan.resultProjection.composed.disposition !== plan.disposition
      || plan.resultProjection.composed.stopReason !== plan.reason
      || pendingSha256(plan.resultProjection.reportText) !== plan.reportSha256
      || pendingSha256(JSON.stringify(plan.resultProjection.row)) !== plan.rowSha256
      || !exactPendingJson(projectedActivities, plan.resultProjection.activities)) return invalid("result-projection");
    if (plan.kind === "finalize") {
      const completionAuthority = serialCompletionRecordAuthority(candidate);
      if (!pending.attestationsCompleteForDone
        || composeBoundRunRecord(
          contract, "DONE", null, candidate.claims, attestations, completionAuthority,
        ) === null
        || !restorePreparedSealAuthorization(
          candidate,
          plan.sealAuthorization,
          plan.baseCapsuleSha256,
        )) return invalid("seal");
    }
    const ownedRecordIndexAuthority = preparedOwnedAuthority(pending.ownedRecordIndexAuthority);
    if (!ownedRecordIndexAuthority
      || !exactPendingJson(ownedRecordIndexAuthority, pending.ownedRecordIndexAuthority)) return invalid("owned-authority");
    return Object.freeze({ candidate, bundle: candidate.bundle, start, ownedRecordIndexAuthority });
  } catch {
    return null;
  }
}

function preparedTerminalWorkspaceExact(
  root: string,
  pending: Record<string, unknown>,
  plan: PendingTerminalPlanV1,
  reportText: string,
  logText: string,
  committedHead: string | null,
  authenticatedBundle: SerialCandidateBundleV1,
): boolean {
  try {
    const invalid = (stage: string): false => {
      void stage;
      return false;
    };
    const start = parsePendingStart(pending.start);
    const taskPaths = parsePendingCandidatePaths(pending.taskPaths, 100, false);
    const protectedPaths = parsePendingCandidatePaths(pending.protectedPaths, 4096, true);
    const ownedPaths = parsePendingCandidatePaths(pending.ownedPaths, 16, true);
    const authority = preparedOwnedAuthority(pending.ownedRecordIndexAuthority);
    if (!start || !taskPaths || !protectedPaths || !ownedPaths || !authority
      || !exactPendingKeys(pending.round0Bundle, [
        "version", "round", "baseHead", "projectRootSha256", "taskSpecSha256", "evidencePlanSha256",
        "entries", "rawByteLength", "manifestSha256", "bundleSha256",
      ])) return invalid("shape");
    const bundle = authenticatedBundle;
    const taskNumber = (pending.candidate as Record<string, unknown>).taskNumber;
    if (!Number.isSafeInteger(taskNumber)) return invalid("task-number");
    const briefPath = paths.brief(root, taskNumber as number);
    const reportPath = paths.report(root, taskNumber as number);
    const logPath = paths.log(root);
    const briefTextValue = candidateOwnedTextNoFollow(briefPath);
    if (briefTextValue === null || pendingSha256(briefTextValue) !== plan.briefSha256
      || pendingSha256(reportText) !== plan.reportSha256 || pendingSha256(logText) !== plan.logSha256
      || !candidateGitMetadataSafe(root, ownedPaths)) return invalid("owned-bytes-or-metadata");
    const changed = candidateScanChangedPaths(root, ownedPaths);
    if (changed === null) return invalid("changed-paths");
    if (committedHead === null) {
      const key = (path: string): string => process.platform === "win32" ? path.toLowerCase() : path;
      const owned = new Set(ownedPaths.map(key));
      const protectedSet = new Set(protectedPaths.map(key));
      const currentTaskPaths = changed.filter((path) => !owned.has(key(path)) && !protectedSet.has(key(path)));
      const checks = Object.freeze({
        taskPaths: sameLines(currentTaskPaths, taskPaths),
        head: candidateGit(root, ["rev-parse", "HEAD"]) === start.head,
        headRef: currentSymbolicHead(root) === pending.startHeadRef,
        protected: protectedStartingPathsOrNull(root, start) === true,
        bundleWorktree: candidateBundleWorktreeBytesStillExact(root, bundle),
        bundleIndex: candidateBundleIndexStateStillExact(root, bundle),
        ownedIndex: candidateOwnedRecordIndexStillExact(root, authority),
      });
      return Object.values(checks).every(Boolean) || invalid("records-only-checks");
    }
    if (changed.length !== 0 || !plan.commitExpected
      || currentSymbolicHead(root) !== pending.startHeadRef
      || !candidateBundleWorktreeBytesStillExact(root, bundle)
      || !candidateBundleMatchesHead(root, committedHead, bundle)
      || !candidateBundleMatchesIndex(root, bundle)) return false;
    const ownedTexts = new Map<string, string>([
      [rel(root, briefPath), briefTextValue],
      [rel(root, reportPath), reportText],
      [rel(root, logPath), logText],
    ]);
    const expectedBlobs = new Map<string, CandidateExpectedBlob>();
    for (const row of authority) {
      const text = ownedTexts.get(row.projectRelativePath);
      if (text === undefined) return false;
      const oid = candidateGit(root, [
        ...CANDIDATE_NEUTRAL_RESERVED_FILTERS,
        "hash-object",
        `--path=${row.projectRelativePath}`,
        "--stdin",
      ], { input: Buffer.from(text, "utf8") });
      expectedBlobs.set(row.projectRelativePath, Object.freeze({ mode: row.terminalMode, oid }));
    }
    return candidateExpectedBlobsMatchTree(root, committedHead, expectedBlobs)
      && candidateExpectedBlobsMatchIndex(root, expectedBlobs);
  } catch {
    return false;
  }
}

function recoveredTerminalReceipt(
  action: SerialCandidateTerminalActionV1,
  plan: PendingTerminalPlanV1,
  taskNumber: number,
  commitStatus: "created" | "skipped",
  commitHash: string | null,
): SerialCandidateTerminalReceiptV1 | null {
  const withoutSha = Object.freeze({
    version: SERIAL_CANDIDATE_TERMINAL_RECEIPT_VERSION,
    actionId: action.actionId,
    kind: action.kind,
    disposition: plan.disposition,
    taskNumber,
    candidateSha256: action.candidateSha256,
    preparedCapsuleSha256: action.capsuleSha256,
    reportSha256: plan.reportSha256,
    logSha256: plan.logSha256,
    commitStatus,
    commitHash,
  });
  const bytes = pendingCanonicalBytes(withoutSha);
  return bytes ? Object.freeze({
    ...withoutSha,
    terminalReceiptSha256: pendingSha256(bytes),
  }) as SerialCandidateTerminalReceiptV1 : null;
}

function recoveredTerminalResult(
  root: string,
  pending: Record<string, unknown>,
  plan: PendingTerminalPlanV1,
  authenticated: AuthenticatedPreparedPendingSemantics,
  commitStatus: "created" | "skipped",
  commitHash: string | null,
): SerialCandidateTerminalResult | null {
  const route = parsePendingRoute(pending.route);
  const candidateRecord = parsePendingCandidateRecord(pending.candidate);
  if (!route || !candidateRecord || !Number.isSafeInteger(candidateRecord.taskNumber)
    || plan.resultProjection.commit.status !== commitStatus
    || (commitStatus === "created" && (commitHash === null || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(commitHash)))
    || (commitStatus === "skipped" && commitHash !== null)) return null;
  let token;
  if (plan.kind === "finalize") {
    const seal = restorePreparedSealAuthorization(
      authenticated.candidate,
      plan.sealAuthorization,
      plan.baseCapsuleSha256,
    );
    if (!seal) return null;
    token = beginSerialCandidateTerminal(authenticated.candidate, "DONE", seal);
  } else {
    token = beginSerialCandidateTerminal(authenticated.candidate, "STOPPED");
  }
  if (!token) return null;
  const terminalCandidate = completeSerialCandidateTerminal(token, plan.disposition);
  if (!terminalCandidate) return null;
  const taskNumber = candidateRecord.taskNumber as number;
  const commit: RecordCommit = Object.freeze({
    status: commitStatus,
    reason: plan.resultProjection.commit.reason,
    ...(commitHash === null ? {} : { hash: commitHash }),
  });
  const common = {
    taskNumber,
    disposition: plan.disposition,
    briefPath: paths.brief(root, taskNumber),
    reportPath: paths.report(root, taskNumber),
    reportText: plan.resultProjection.reportText,
    row: plan.resultProjection.row,
    route,
    activities: candidateActivityView(plan.resultProjection.activities),
    commit,
    composed: plan.resultProjection.composed,
    candidate: terminalCandidate,
  };
  const result: SerialCandidateTerminalResult = plan.kind === "finalize"
    ? Object.freeze({ status: "done" as const, ...common, disposition: "DONE" as const })
    : Object.freeze({
        status: "stopped" as const,
        reason: plan.reason!,
        ...common,
        disposition: "STOPPED" as const,
      });
  return brandSerialCandidateTerminalResult(result);
}

/** Read-only terminal restart classifier. It never finishes a partial write. */
export function reconcileSerialCandidateTerminalFromPending(
  root: string,
  capsule: unknown,
  action: unknown,
  options: { events?: SerialRunEvents } = {},
): SerialCandidateTerminalReconcileResultV1 {
  return reconcileSerialCandidateTerminalFromPendingInternal(root, capsule, action, options, false);
}

export function reconcileSerialCandidateTerminalFromAuthenticatedPending(
  root: string,
  capsule: unknown,
  action: unknown,
  revision: number,
  journalAuthority: SerialAuthenticatedPendingJournalAuthority,
  options: { events?: SerialRunEvents } = {},
): SerialCandidateTerminalReconcileResultV1 {
  const prepared = parseTerminalPreparation(capsule, action);
  const record = prepared ? parsePendingCandidateRecord(prepared.pendingInner.candidate) : null;
  if (!prepared || !record || !consumeSerialAuthenticatedPendingJournalAuthority(journalAuthority, {
    capsuleSha256: prepared.parsed.capsuleSha256,
    projectRootSha256: record.projectRootSha256 as string,
    runId: record.runId as string,
    candidateSha256: record.candidateSha256 as string,
    revision,
    prepared: true,
  })) return terminalReconcileStale("INVALID_PREPARATION");
  return reconcileSerialCandidateTerminalFromPendingInternal(root, capsule, action, options, true);
}

function reconcileSerialCandidateTerminalFromPendingInternal(
  root: string,
  capsule: unknown,
  action: unknown,
  options: { events?: SerialRunEvents },
  authenticatedQ9: boolean,
): SerialCandidateTerminalReconcileResultV1 {
  const prepared = parseTerminalPreparation(capsule, action);
  if (!prepared) return terminalReconcileStale("INVALID_PREPARATION");
  const projectRoot = resolve(root);
  const projectRootReal = canonicalExistingDirectory(projectRoot);
  if (!projectRootReal || prepared.pendingInner.projectRootReal !== projectRootReal
    || candidateProjectRootIdentitySha256(projectRootReal) !== prepared.pendingInner.projectRootSha256) {
    return terminalReconcileStale("PROJECT_MISMATCH");
  }
  const preparedCandidateRecord = parsePendingCandidateRecord(prepared.pendingInner.candidate);
  if (!preparedCandidateRecord) {
    return terminalReconcileStale("MANUAL_RECOVERY_REQUIRED");
  }
  const pendingKind = pendingCandidateInnerKind(prepared.pendingInner);
  if (pendingKind === "q9" && !authenticatedQ9) {
    return terminalReconcileStale("MANUAL_RECOVERY_REQUIRED");
  }
  let exactTerminalRecordsPresent = false;
  try {
    const taskNumber = preparedCandidateRecord.taskNumber as number;
    const report = candidateOwnedTextNoFollow(paths.report(projectRoot, taskNumber));
    const log = candidateOwnedTextNoFollow(paths.log(projectRoot));
    exactTerminalRecordsPresent = report !== null && log !== null
      && pendingSha256(report) === prepared.plan.reportSha256
      && pendingSha256(log) === prepared.plan.logSha256;
  } catch { /* the locked classifier below will conservatively require manual recovery */ }
  const resumed: SerialPendingCandidateResumeResultV1 = exactTerminalRecordsPresent
    ? Object.freeze({ status: "stale", reason: "WORKSPACE_CHANGED" })
    : resumeSerialCandidateFromPendingInternal(
        projectRoot,
        prepared.baseCapsule,
        options,
        prepared.plan.kind === "stop",
        authenticatedQ9,
        authenticatedQ9,
      );
  if (resumed.status === "resumed") {
    try {
      const sealAuthorization = prepared.plan.kind === "finalize"
        ? restorePreparedSealAuthorization(
            resumed.candidate,
            prepared.plan.sealAuthorization,
            prepared.plan.baseCapsuleSha256,
          )
        : null;
      const input: NonNullable<ReturnType<typeof terminalPreparationInput>> = prepared.plan.kind === "finalize"
        ? Object.freeze({
            actionId: prepared.plan.actionId,
            kind: "finalize",
            reason: null,
            sealAuthorization,
          }) as NonNullable<ReturnType<typeof terminalPreparationInput>>
        : Object.freeze({
            actionId: prepared.plan.actionId,
            kind: "stop",
            reason: prepared.plan.reason,
            sealAuthorization: null,
          });
      const open = openContextForCandidate(resumed.candidate);
      const rehydrated = open && (prepared.plan.kind !== "finalize" || sealAuthorization)
        ? buildTerminalPreparation(
            resumed.candidate,
            open.context,
            input,
            prepared.baseCapsule,
            prepared.pendingInner,
            prepared.plan.recordDate,
          )
        : null;
      if (rehydrated && rehydrated.capsule.canonicalBytes === prepared.parsed.canonicalBytes
        && rehydrated.capsule.capsuleSha256 === prepared.parsed.capsuleSha256) {
        return Object.freeze({ status: "resumed", candidate: resumed.candidate, preparation: rehydrated });
      }
    } catch {
      // Every failed rehydration path below releases the freshly acquired
      // candidate context and its PID lock before returning a manual gate.
    }
    try {
      releaseReconciledCandidate(resumed.candidate);
    } catch { /* releaseOpenCandidate is idempotent; the manual gate remains */ }
    return terminalReconcileStale("MANUAL_RECOVERY_REQUIRED");
  }
  if (resumed.reason === "PROJECT_MISMATCH") return terminalReconcileStale("PROJECT_MISMATCH");
  if (resumed.reason === "LIVE_LOCK_UNAVAILABLE") return terminalReconcileStale("LIVE_LOCK_UNAVAILABLE");
  if (resumed.reason === "UNSUPPORTED_ROUND_ONE") return terminalReconcileStale("UNSUPPORTED_ROUND_ONE");
  if (resumed.reason === "UNSUPPORTED_EVIDENCE_REVISION") return terminalReconcileStale("UNSUPPORTED_EVIDENCE_REVISION");

  if (projectAlreadyLive(projectRootReal, preparedCandidateRecord.runId as string)) {
    return terminalReconcileStale("LIVE_LOCK_UNAVAILABLE");
  }
  activeRoots.add(projectRoot);
  let lock: RunLock;
  try {
    lock = acquireCandidateRunLock(projectRoot);
  } catch {
    activeRoots.delete(projectRoot);
    return terminalReconcileStale("LIVE_LOCK_UNAVAILABLE");
  }
  try {
    const authenticated = authenticatePreparedPendingSemantics(
      projectRoot,
      prepared.pendingInner,
      prepared.plan,
      authenticatedQ9,
    );
    if (!authenticated) return terminalReconcileStale("MANUAL_RECOVERY_REQUIRED");
    const candidateRecord = preparedCandidateRecord;
    const start = authenticated.start;
    const taskNumber = candidateRecord?.taskNumber;
    if (!candidateRecord || !start || !Number.isSafeInteger(taskNumber)) {
      return terminalReconcileStale("MANUAL_RECOVERY_REQUIRED");
    }
    const report = candidateOwnedTextNoFollow(paths.report(projectRoot, taskNumber as number));
    const log = candidateOwnedTextNoFollow(paths.log(projectRoot));
    if (report === null || log === null
      || pendingSha256(report) !== prepared.plan.reportSha256
      || pendingSha256(log) !== prepared.plan.logSha256) {
      return terminalReconcileStale("MANUAL_RECOVERY_REQUIRED");
    }
    const head = candidateGit(projectRoot, ["rev-parse", "HEAD"]);
    if (!prepared.plan.commitExpected) {
      if (!preparedTerminalWorkspaceExact(
        projectRoot,
        prepared.pendingInner,
        prepared.plan,
        report,
        log,
        null,
        authenticated.bundle,
      )) {
        return terminalReconcileStale("MANUAL_RECOVERY_REQUIRED");
      }
      const receipt = recoveredTerminalReceipt(
        prepared.action,
        prepared.plan,
        taskNumber as number,
        "skipped",
        null,
      );
      const result = receipt ? recoveredTerminalResult(
        projectRoot, prepared.pendingInner, prepared.plan, authenticated, "skipped", null,
      ) : null;
      return receipt && result
        ? Object.freeze({ status: "terminal", receipt, result })
        : terminalReconcileStale("MANUAL_RECOVERY_REQUIRED");
    }
    const indexLockRaw = candidateGit(projectRoot, ["rev-parse", "--git-path", "index.lock"]);
    const indexLockPath = isAbsolute(indexLockRaw) ? resolve(indexLockRaw) : resolve(projectRoot, indexLockRaw);
    if (existsSync(indexLockPath) || head === start.head
      || candidateGit(projectRoot, ["log", "-1", "--format=%B", head]) !== prepared.plan.commitMessage) {
      return terminalReconcileStale("MANUAL_RECOVERY_REQUIRED");
    }
    const parents = candidateGit(projectRoot, ["rev-list", "--parents", "-n", "1", head]).split(" ");
    const changed = candidateGitZ(projectRoot, [
      "diff-tree", "--no-commit-id", "--name-only", "--no-renames", "-r", "-z", start.head, head, "--",
    ]).sort();
    if (parents.length !== 2 || parents[0] !== head || parents[1] !== start.head
      || !sameLines(changed, prepared.plan.expectedCommitPaths)
      || !preparedTerminalWorkspaceExact(
        projectRoot,
        prepared.pendingInner,
        prepared.plan,
        report,
        log,
        head,
        authenticated.bundle,
      )) {
      return terminalReconcileStale("MANUAL_RECOVERY_REQUIRED");
    }
    const receipt = recoveredTerminalReceipt(
      prepared.action,
      prepared.plan,
      taskNumber as number,
      "created",
      head,
    );
    const result = receipt ? recoveredTerminalResult(
      projectRoot, prepared.pendingInner, prepared.plan, authenticated, "created", head,
    ) : null;
    return receipt && result
      ? Object.freeze({ status: "terminal", receipt, result })
      : terminalReconcileStale("MANUAL_RECOVERY_REQUIRED");
  } catch {
    return terminalReconcileStale("MANUAL_RECOVERY_REQUIRED");
  } finally {
    lock.release();
    activeRoots.delete(projectRoot);
  }
}
