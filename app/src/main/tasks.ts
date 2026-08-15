import { ipcMain, type BrowserWindow } from "electron";
import { createHash, randomUUID } from "node:crypto";
import {
  SERIAL_CANDIDATE_REPAIR_VERSION,
  type SerialUnsealedCandidateV1,
  createDirectTaskIntent,
  previewSerialRoute,
  projectStatus,
  runSerialTask,
  composeSerialTaskPromises,
  projectCheckMenu,
  type SerialTaskPromiseVerificationV1,
  type SerialTaskPromisesV1,
  taskRequestView,
  type AdapterDescriptor,
  type SerialRunResult,
  type TaskIntent,
  type TaskSpecV1,
  type WorkerDisclosure,
} from "@cairn/core";
import { connectionRequiredReason, detectedAdapters } from "./adapters.js";
import { emitBridgeSync } from "./bridge/hub.js";
import type {
  CandidateCritiqueProjectionV1,
  ConductorDelta,
  EvidenceAlbum,
  EvidenceImageData,
  Result,
  ResultCard,
  RunSessionSnapshot,
  TaskActivityEvent,
  TaskRouteRequest,
  TaskRouteSource,
  TaskRunRequest,
  TaskReviewProjectionV1,
  CriticCallDecisionV1,
  RepairCallDecisionV1,
  Q9HarnessRevisionDecisionV1,
  UnsealedCandidateDecisionV1,
} from "../shared/ipc.js";
import {
  closeUnsealedCandidateIfCurrent,
  decideUnsealedCandidate,
  openUnsealedCandidateCheckpoint,
} from "./unsealedcandidate.js";
import { parseTaskReviewActionRequest } from "../shared/task-review.js";
import type { TaskSpecProposalPreviewV1 } from "../shared/quality-preview.js";
import { composeErrorCard, composeResultCard, postResultCard, postResultCardOnce } from "./conductor/relay.js";
import { newConversationId } from "./conductor/store.js";
import {
  candidateCritiqueRoute,
  commentary,
  consumeCurrentTaskProposal,
  currentTaskProposal,
  onCurrentProjectChanged,
  onTaskProposalChanged,
  prepareCommentary,
} from "./conductor/service.js";
import { isConversationId } from "./conductor/conversation-id.js";
import { canonicalProjectKey } from "./conductor/turnauth.js";
import {
  attachCandidateCritiquePrice,
  closeCandidateCritique,
  currentCandidateCritique,
  decideCandidateCritique,
  openCandidateCritique,
} from "./critique.js";
import {
  clearProviderCriticCallApprovalByKey,
  decideCriticCall,
  type CriticCallDecisionRefusal,
} from "./criticapproval.js";
import { parseCriticCallDecisionRequest } from "../shared/critic-call-parse.js";
import {
  parseCriticCalibrationOpenRequest,
  type CriticCalibrationOrchestrator,
} from "./criticcalibration.js";
import {
  discardUnfinalizedEvidenceRun,
  finalizeEvidenceRun,
  readEvidenceAlbum,
  readEvidenceImage,
  recordEvidenceCapture,
  type EvidenceBoundary,
} from "./evidence.js";
import { captureBeforeWorkerStage, captureTerminalStage, type StageCaptureWindow } from "./evidencecapture.js";
import { logError, plainMessage } from "./log.js";
import {
  clearRunning,
  isQuitDraining,
  isTaskRunning,
  markRunning,
  pendingTaskStartRefusal,
  runningDirs,
  runRefusal,
} from "./rungate.js";
import { runtimeWorkerIdentity } from "./workeridentity.js";
import { composeDirectTaskSpecProposal } from "./conductor/qualityproposal.js";
import { criticActivationStatus } from "./criticactivation.js";
import {
  applyTaskReviewAction,
  composePendingTaskReviewAuthority,
  invalidateTaskReviewAuthority,
  taskReviewProjection,
  type MainTaskReviewAuthorityV1,
} from "./ownercheck.js";
import {
  Q9_PENDING_CANDIDATE_TERMINAL,
  activeQ9QualityLoops,
  applyQ9QualityLoopToSession,
  cancelQ9QualityLoop,
  currentQ9QualityLoop,
  decideQ9Critic,
  decideQ9HarnessRevision,
  decideQ9Repair,
  decideQ9TaskReview,
  restoreQ9QualityLoops,
  startQ9QualityLoop,
  suspendQ9QualityLoopForRestart,
  type Q9QualityLoopDependenciesV1,
  type Q9QualityLoopSessionV1,
} from "./qualityloop.js";
import type {
  Q9FakeCriticTransportV1,
  Q9FakeTaskHarnessV1,
} from "./q9fake.js";
import {
  currentPendingSerialCandidate,
  pendingSerialCandidateTerminalCardDeliveries,
  recordPendingSerialCandidateTerminalCardDelivery,
} from "./pendingcandidate.js";

const controllers = new Map<string, AbortController>();
const settlements = new Map<string, Promise<unknown>>();
const sessions = new Map<string, RunSessionSnapshot>();
const routeGenerations = new Map<string, number>();
const previews = new Map<string, PendingPreview>();
const reviewAuthorities = new Map<string, MainTaskReviewAuthorityV1>();
const starting = new Set<string>();

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DIRECT_TASK_TOO_LONG = "TASK_REQUEST_TOO_LONG: Keep a direct task request to 2,000 characters or fewer.";
const DIRECT_TASK_INVALID = "Describe one visible outcome using at least five non-whitespace characters.";
const DIRECT_TASK_QUALITY_INVALID = "TASK_QUALITY_UNCLEAR: Name one finite result Cairn can honestly inspect; references and taste-only standards need a conversation first.";
const PREVIEW_STALE = "TASK_PREVIEW_STALE: That dispatch review is no longer current. Review the task again.";
const PROPOSAL_STALE = "TASK_PROPOSAL_STALE: That proposed task is no longer current.";
const PROPOSAL_RISKS = "TASK_PROPOSAL_HAS_RISKS: Resolve or set aside every current risk before reviewing dispatch.";
const ROUTE_CHANGED = "TASK_ROUTE_CHANGED: The selected worker changed while you were deciding. Nothing was started.";
const CRITIC_CALIBRATION_ACTIVE = "CRITIC_CALIBRATION_ACTIVE: Finish or cancel the synthetic calibration call before reviewing or starting a task.";
const CRITIC_CALIBRATION_TASK_ACTIVE = "CRITIC_CALIBRATION_TASK_ACTIVE: Wait for the current task to finish, or cancel it, before using calibration.";
/** One sentence per closed refusal. Three of the four leave the approval
 * standing, so none of them may tell the owner the call is gone. */
const CRITIC_CALL_REFUSAL_MESSAGES: Readonly<Record<CriticCallDecisionRefusal, string>> = Object.freeze({
  CRITIC_CALL_DECISION_MALFORMED: "CRITIC_CALL_INVALID: Cairn refused a malformed critic-call decision. The call is still waiting.",
  CRITIC_CALL_DECISION_UNKNOWN_APPROVAL: "CRITIC_CALL_STALE: That critic call is no longer waiting for a decision.",
  CRITIC_CALL_DECISION_ECHO_MISMATCH: "CRITIC_CALL_MISMATCH: Cairn could not confirm you were looking at this exact call, so nothing was decided. The call is still waiting.",
  CRITIC_CALL_DECISION_ACTION_NOT_OFFERED: "CRITIC_CALL_NOT_OFFERED: That choice is not one this call offers. The call is still waiting.",
});

const REAL_CALL_NOT_AUTHORIZED = "REAL_MODEL_CALL_NOT_AUTHORIZED: Confirm the displayed provider, model, project, data scope, and quota before starting.";

/** Q3 cannot name an exact calibrated critic route yet. This deliberate null
 * identity keeps every new Task Spec producer out of normal task routing; Q10
 * must replace it with a complete registry-bound identity, never a flag. */
const QUALITY_PREVIEW_ACTIVATION_IDENTITY: unknown = null;
const QUALITY_PREVIEW_ACTIVE = criticActivationStatus(QUALITY_PREVIEW_ACTIVATION_IDENTITY).kind === "active";

type PendingPreview = Readonly<{
  previewId: string;
  generation: number;
  intent: TaskIntent;
  request: NonNullable<ReturnType<typeof taskRequestView>>;
  context: readonly string[];
  route: ReturnType<typeof previewSerialRoute>;
  adapter: AdapterDescriptor | null;
  worker: boolean;
  disclosure?: WorkerDisclosure;
  source: TaskRouteSource;
  taskSpec?: TaskSpecV1;
  taskSpecPreview?: TaskSpecProposalPreviewV1;
  taskReviewAuthority?: MainTaskReviewAuthorityV1;
  taskReview?: TaskReviewProjectionV1;
  q9Harness?: Q9FakeTaskHarnessV1;
}>;

export type Q9TaskRuntimeV1 = Readonly<{
  harness: Q9FakeTaskHarnessV1;
  criticTransport: Q9FakeCriticTransportV1;
  onCutPoint?: Q9QualityLoopDependenciesV1["onCutPoint"];
}>;

function canonicalJson(value: unknown): string {
  if (value === undefined || value === null) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
}

function q9AdapterIdentitySha256(harness: Q9FakeTaskHarnessV1): string {
  return createHash("sha256").update(canonicalJson(harness.adapter.descriptor)).digest("hex");
}

function q9RuntimeForProject(runtime: Q9TaskRuntimeV1 | null, dir: string): Q9TaskRuntimeV1 | null {
  if (runtime === null) return null;
  try {
    return canonicalProjectKey(runtime.harness.projectRoot) === canonicalProjectKey(dir) ? runtime : null;
  } catch {
    return null;
  }
}

/** Deliver every authenticated closed Q9 outbox. A restart may call this
 * again: the conversation store adopts or returns the one exact turn and the
 * pending journal records delivery only after that authenticated read. */
export function deliverPendingTaskResultCards(win: () => BrowserWindow | null): Readonly<{
  delivered: number;
  pending: number;
}> {
  let delivered = 0;
  for (const entry of pendingSerialCandidateTerminalCardDeliveries()) {
    try {
      const card = JSON.parse(entry.card.canonicalCard) as ResultCard;
      const posted = postResultCardOnce(
        entry.projectRoot,
        entry.card.conversationId,
        card,
        entry.card.turnTimestamp,
      );
      if (posted.status === "appended") {
        const delta: ConductorDelta = {
          dir: entry.projectRoot,
          conversationId: entry.card.conversationId,
          kind: "envelope",
          turn: posted.turn,
        };
        win()?.webContents.send("conductor:delta", delta);
        emitBridgeSync();
      }
      const preparedCommentary = prepareCommentary(
        entry.projectRoot,
        entry.card.conversationId,
        card,
        (commentDelta) => {
          win()?.webContents.send("conductor:delta", commentDelta);
          emitBridgeSync();
        },
      );
      // Boot may adopt the exact card before its project has been selected and
      // revalidated. Keep the authenticated outbox pending in that one case;
      // project selection wakes this delivery loop again. Every other
      // disposition is a one-shot claim: record it before starting a model
      // call, so a crash can never duplicate a paid commentary attempt.
      if (preparedCommentary.status === "defer-project-unselected") continue;
      if (!recordPendingSerialCandidateTerminalCardDelivery(
        entry.card.deliveryIdSha256,
        posted.deliveredSha256,
      )) continue;
      delivered += 1;
      if (preparedCommentary.status === "ready") preparedCommentary.start();
    } catch (error) {
      logError("task:q9 result-card delivery", error);
    }
  }
  return Object.freeze({ delivered, pending: pendingSerialCandidateTerminalCardDeliveries().length });
}

function q9LoopDependencies(
  runtime: Q9TaskRuntimeV1,
  win: () => BrowserWindow | null,
): Q9QualityLoopDependenciesV1 {
  return Object.freeze({
    repairWriter: runtime.harness.repairWriter,
    criticTransport: runtime.criticTransport,
    harnessRevision: Object.freeze({
      kind: "synthetic-q9-harness-revision" as const,
      adapter: runtime.harness.adapter,
      writerIsolation: runtime.harness.writerIsolation,
    }),
    ...(runtime.onCutPoint === undefined ? {} : { onCutPoint: runtime.onCutPoint }),
    terminal: Q9_PENDING_CANDIDATE_TERMINAL,
    onChanged(projectRoot) {
      const session = sessions.get(canonicalProjectKey(projectRoot));
      const snapshot = currentQ9QualityLoop(projectRoot);
      if (session && snapshot?.status === "recovery-required" && snapshot.refusal) {
        session.error = `${snapshot.refusal}: Cairn kept this guarded Q9 run closed for recovery.`;
      }
    },
    onTerminal(projectRoot, result) {
      const key = canonicalProjectKey(projectRoot);
      const session = sessions.get(key);
      if (session) {
        session.phase = "closed";
        session.result = result;
        session.error = null;
        delete session.taskReview;
        delete session.criticCall;
        delete session.repairCall;
        delete session.harnessRevision;
      }
      clearRunning(key);
      controllers.delete(key);
      deliverPendingTaskResultCards(win);
    },
  });
}

function restoredQ9Session(
  runtime: Q9TaskRuntimeV1,
  session: Q9QualityLoopSessionV1,
): RunSessionSnapshot | null {
  const active = currentPendingSerialCandidate(runtime.harness.projectRoot);
  const request = taskRequestView(runtime.harness.intent);
  if (!active || request === null || session.acceptedRequest === null
    || canonicalJson(session.acceptedRequest) !== canonicalJson(request)
    || session.adapterIdentitySha256 !== q9AdapterIdentitySha256(runtime.harness)) return null;
  return {
    dir: active.projectRoot,
    outcome: request.outcome.text,
    request,
    adapterId: runtime.harness.adapter.descriptor.id,
    conversationId: session.conversationId,
    worker: false,
    startedAt: session.startedAt,
    activities: [],
    phase: "running",
    result: null,
    error: null,
    evidenceRunId: session.evidenceRunId,
  };
}

/** Rebuild only the output/session surface for an already authenticated Q9
 * candidate. Core + PendingRun restore the authority first; this function can
 * neither mint a candidate nor select a different scenario. */
export function restoreQ9TaskRuns(
  runtime: Q9TaskRuntimeV1 | null,
  win: () => BrowserWindow | null,
): Readonly<{ restored: number; refused: number }> {
  if (runtime === null) return Object.freeze({ restored: 0, refused: 0 });
  const restored = restoreQ9QualityLoops({
    dependenciesFor(projectRoot, session) {
      const exactRuntime = q9RuntimeForProject(runtime, projectRoot);
      if (exactRuntime === null) return null;
      const projection = restoredQ9Session(exactRuntime, session);
      if (projection === null) return null;
      const key = canonicalProjectKey(projectRoot);
      sessions.set(key, projection);
      markRunning(key);
      return q9LoopDependencies(exactRuntime, win);
    },
  });
  if (currentQ9QualityLoop(runtime.harness.projectRoot) === null) {
    const key = canonicalProjectKey(runtime.harness.projectRoot);
    const session = sessions.get(key);
    if (session?.phase === "running") sessions.delete(key);
    clearRunning(key);
  }
  return restored;
}

/** Read-only runtime projection for workspace and IPC assembly. IPC callers
 * receive a structured clone; main-process callers must treat it as immutable. */
export function currentTaskSession(dir: string): RunSessionSnapshot | null {
  try {
    const session = sessions.get(canonicalProjectKey(dir));
    return session ? applyQ9QualityLoopToSession(session, currentQ9QualityLoop(dir)) : null;
  } catch { return null; }
}

/** Quit protection: name live runs, cancel them, and await their fail-closed close. */
export function activeTaskRuns(): {
  dirs: string[];
  parkableDirs: string[];
  allParkable: boolean;
  suspendAllForRestart(): boolean;
  cancelAll(): void;
  settled(): Promise<void>;
} {
  const q9 = activeQ9QualityLoops();
  const q9Keys = new Set(q9.dirs.map((dir) => canonicalProjectKey(dir)));
  const nonQ9Running = runningDirs().filter((dir) => !q9Keys.has(canonicalProjectKey(dir)));
  const nonQ9Starting = [...starting].filter((key) => !q9Keys.has(key));
  const allParkable = q9.allParkable && nonQ9Running.length === 0 && nonQ9Starting.length === 0;
  return {
    dirs: [...new Set([...runningDirs(), ...q9.dirs])],
    parkableDirs: [...q9.parkableDirs],
    allParkable,
    suspendAllForRestart() {
      if (!allParkable) return false;
      return q9.dirs.every((dir) => suspendQ9QualityLoopForRestart(dir));
    },
    cancelAll() {
      for (const controller of controllers.values()) controller.abort();
      q9.cancelAll();
    },
    async settled() {
      await Promise.allSettled([...settlements.values(), q9.settled()]);
    },
  };
}

function anyTaskRunningOrStarting(): boolean {
  return runningDirs().length > 0 || starting.size > 0;
}

function taskRunningOrStartingOutside(currentStartingKey: string): boolean {
  return runningDirs().length > 0 || [...starting].some((key) => key !== currentStartingKey);
}

/** A calibration disclosure may be mirrored onto an older retained session,
 * but it remains calibration-owned. Clear only that synthetic projection so a
 * future provider card cannot be erased by a late terminal callback. */
function clearSyntheticCalibrationDisclosure(key: string): void {
  const session = sessions.get(key);
  if (session?.criticCall?.callKind === "synthetic-calibration") delete session.criticCall;
}

function sameDisclosure(actual: WorkerDisclosure | undefined, expected: WorkerDisclosure): boolean {
  return Boolean(actual) && actual?.provider === expected.provider && actual.model === expected.model &&
    actual.project === expected.project && actual.task === expected.task && actual.data === expected.data &&
    actual.quota === expected.quota;
}

function disclosuresMatch(left: WorkerDisclosure | undefined, right: WorkerDisclosure | undefined): boolean {
  return left === undefined ? right === undefined : sameDisclosure(right, left);
}

function sameAdapter(left: AdapterDescriptor | null, right: AdapterDescriptor): boolean {
  return left !== null && left.id === right.id && left.label === right.label && left.provider === right.provider &&
    left.model === right.model && left.connected === right.connected && left.priority === right.priority &&
    left.capabilities.length === right.capabilities.length &&
    left.capabilities.every((capability, index) => capability === right.capabilities[index]);
}

function exactRecord(value: unknown, required: readonly string[], optional: readonly string[] = []): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const keys = Object.keys(value);
  if (required.some((key) => !keys.includes(key)) || keys.some((key) => !required.includes(key) && !optional.includes(key))) return null;
  return value as Record<string, unknown>;
}

function checkedRouteRequest(value: unknown): TaskRouteRequest | null {
  const request = exactRecord(value, ["dir", "source"], ["adapterId"]);
  if (!request || typeof request.dir !== "string" || request.dir.length === 0 || request.dir.length > 32_767) return null;
  if (request.adapterId !== undefined &&
      (typeof request.adapterId !== "string" || request.adapterId.length === 0 || request.adapterId.length > 200)) return null;
  const source = exactRecord(request.source, ["kind"], ["proposalId", "conversationId", "rawOutcome"]);
  if (!source) return null;
  let checkedSource: TaskRouteSource;
  if (source.kind === "manual") {
    const exact = exactRecord(request.source, ["kind", "rawOutcome"]);
    if (!exact || typeof exact.rawOutcome !== "string") return null;
    checkedSource = { kind: "manual", rawOutcome: exact.rawOutcome };
  } else if (source.kind === "proposal") {
    const exact = exactRecord(request.source, ["kind", "proposalId", "conversationId"]);
    if (!exact || typeof exact.proposalId !== "string" || !UUID_V4.test(exact.proposalId) || !isConversationId(exact.conversationId)) return null;
    checkedSource = { kind: "proposal", proposalId: exact.proposalId, conversationId: exact.conversationId };
  } else {
    return null;
  }
  return {
    dir: request.dir,
    source: checkedSource,
    ...(typeof request.adapterId === "string" ? { adapterId: request.adapterId } : {}),
  };
}

function checkedDisclosure(value: unknown): WorkerDisclosure | undefined | null {
  if (value === undefined) return undefined;
  const record = exactRecord(value, ["provider", "model", "project", "task", "data", "quota"]);
  if (!record || Object.values(record).some((item) => typeof item !== "string")) return null;
  return record as unknown as WorkerDisclosure;
}

function checkedRunRequest(value: unknown): TaskRunRequest | null {
  const request = exactRecord(value, ["dir", "previewId"], ["realCallConfirmed", "disclosure", "checkSelections"]);
  if (!request || typeof request.dir !== "string" || request.dir.length === 0 || request.dir.length > 32_767 ||
      typeof request.previewId !== "string" || !UUID_V4.test(request.previewId)) return null;
  if (request.realCallConfirmed !== undefined && typeof request.realCallConfirmed !== "boolean") return null;
  const disclosure = checkedDisclosure(request.disclosure);
  if (disclosure === null) return null;
  const checkSelections = checkedCheckSelections(request.checkSelections);
  if (checkSelections === null) return null;
  return {
    dir: request.dir,
    previewId: request.previewId,
    ...(request.realCallConfirmed === true ? { realCallConfirmed: true } : {}),
    ...(disclosure === undefined ? {} : { disclosure }),
    ...(checkSelections === undefined ? {} : { checkSelections }),
  };
}

/**
 * Task 238: one entry per displayed row, naming either a menu check id or
 * `owner`. Refused outright if it is not exactly that, because a selection
 * Cairn cannot read exactly must not silently become a different check.
 */
function checkedCheckSelections(
  value: unknown,
): Readonly<Record<string, string>> | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 32) return null;
  const known = new Set<string>(["owner", "typecheck", "build", "unit-tests"]);
  const selections: Record<string, string> = {};
  for (const [id, choice] of entries) {
    if (!/^c[1-9][0-9]{0,2}$/u.test(id)) return null;
    if (typeof choice !== "string" || !known.has(choice)) return null;
    selections[id] = choice;
  }
  return Object.freeze(selections);
}

function nextGeneration(key: string): number {
  const generation = (routeGenerations.get(key) ?? 0) + 1;
  routeGenerations.set(key, generation);
  previews.delete(key);
  const review = reviewAuthorities.get(key);
  if (review !== undefined) invalidateTaskReviewAuthority(review);
  reviewAuthorities.delete(key);
  // A provider critic approval belongs to the task generation that opened it.
  // Synthetic calibration has a separate lifecycle and must survive unrelated
  // preview replacement or cancellation.
  clearProviderCriticCallApprovalByKey(key);
  return generation;
}

function pendingReviewIsCurrent(key: string, pending: PendingPreview): boolean {
  if (pending.taskSpec === undefined) {
    return pending.taskSpecPreview === undefined && pending.taskReviewAuthority === undefined
      && pending.taskReview === undefined && !reviewAuthorities.has(key);
  }
  return pending.taskSpecPreview !== undefined && pending.taskReviewAuthority !== undefined && pending.taskReview !== undefined
    && reviewAuthorities.get(key) === pending.taskReviewAuthority
    && taskReviewProjection(pending.taskReviewAuthority) === pending.taskReview;
}

function invalidateProjectPreview(dir: string | null): void {
  if (dir === null) {
    for (const key of routeGenerations.keys()) nextGeneration(key);
    previews.clear();
    return;
  }
  try {
    nextGeneration(canonicalProjectKey(dir));
  } catch {
    // A removed project cannot retain a usable preview. The listener is rare
    // and main-only, so fail closed across all pending route attempts.
    for (const key of routeGenerations.keys()) nextGeneration(key);
    previews.clear();
  }
}

let unsubscribeProposalChanges: (() => void) | null = null;
let unsubscribeCurrentProjectChanges: (() => void) | null = null;

function evidenceTitle(outcome: string): string {
  return outcome.replace(/\s+/g, " ").trim().slice(0, 500);
}

/**
 * The critic offer that rides beside one pause.
 *
 * Deliberately a named function rather than an inline literal at the call
 * site: the pause hook is read as source text by its containment guard, which
 * slices the hook at the first `});` it finds, and a multi-line object literal
 * inside the hook would cut that slice short. Keeping the shape out here keeps
 * the hook the short, auditable block the guard is meant to read.
 */
/**
 * Ask the provider what it charges, without making the pause wait.
 *
 * Fired and not awaited on purpose. A run is holding its lock at the pause; a
 * price is a nicety beside that, so it arrives on the renderer's next poll or
 * it does not arrive at all, and either way the card stays pressable.
 */
function priceCritiqueInBackground(dir: string, checkpointId: string, signal?: AbortSignal): void {
  const deps = signal ? { fetchImpl: fetch, signal } : { fetchImpl: fetch };
  void attachCandidateCritiquePrice(dir, checkpointId, deps).then(() => {
    // The module holds its own copy; the renderer reads the session. Publish
    // the priced offer onto the polled snapshot, and only while the SAME
    // checkpoint is still the one on screen, so a price cannot land on a
    // newer pause.
    const priced = currentCandidateCritique(dir);
    if (priced === null || priced.checkpointId !== checkpointId) return;
    const session = sessions.get(canonicalProjectKey(dir));
    if (session?.unsealedCandidateCritique?.checkpointId === checkpointId) {
      session.unsealedCandidateCritique = priced;
    }
  }).catch(() => {});
}

function openCritiqueForCandidate(
  dir: string,
  checkpointId: string,
  candidate: SerialUnsealedCandidateV1,
): CandidateCritiqueProjectionV1 | null {
  return openCandidateCritique({
    dir,
    checkpointId,
    answers: candidate.answers,
    facts: {
      acceptedOutcome: candidate.acceptedRequest.outcome.text,
      changedPaths: candidate.changedPaths,
      workerEvidenceSummary: candidate.evidenceSummary,
    },
    connection: candidateCritiqueRoute(dir)?.connection ?? null,
  });
}

/**
 * Task 244. The `not_met` sentences a critic really sent Cairn for the pause
 * this press names, and nothing else.
 *
 * A finding the critic marked `met` or `unclear` alleges no failure, so it can
 * start no repair. An unreadable press yields an empty list, which is the
 * fail-closed answer: no allegation on record, no repair possible.
 */
function allegationsFor(
  unsafeRequest: unknown,
): readonly Readonly<{ checkId: string; observation: string }>[] {
  const dir = (unsafeRequest as { dir?: unknown } | null)?.dir;
  const checkpointId = (unsafeRequest as { checkpointId?: unknown } | null)?.checkpointId;
  if (typeof dir !== "string" || typeof checkpointId !== "string") return Object.freeze([]);
  const critique = currentCandidateCritique(dir);
  if (critique === null || critique.checkpointId !== checkpointId
    || critique.state !== "answered") return Object.freeze([]);
  return Object.freeze(critique.findings.flatMap((finding) => finding.judgment === "not_met"
    ? [Object.freeze({ checkId: finding.checkId, observation: finding.observation })]
    : []));
}

export function registerTaskIpc(
  win: () => BrowserWindow | null,
  criticCalibration: CriticCalibrationOrchestrator | null = null,
  q9Runtime: Q9TaskRuntimeV1 | null = null,
): void {
  const mock = process.env.CAIRN_MOCK === "1";

  unsubscribeProposalChanges?.();
  unsubscribeProposalChanges = onTaskProposalChanged(invalidateProjectPreview);
  unsubscribeCurrentProjectChanges?.();
  unsubscribeCurrentProjectChanges = onCurrentProjectChanged(() => {
    deliverPendingTaskResultCards(win);
  });

  ipcMain.handle("task:route", async (_event, unsafeRequest: unknown) => {
    const request = checkedRouteRequest(unsafeRequest);
    if (request === null) return { ok: false, message: "TASK_ROUTE_INVALID: Cairn refused a malformed route request." } satisfies Result<never>;
    const { dir, source, adapterId } = request;
    try {
      const status = projectStatus(dir);
      if (status.legacyState) throw new Error("LEGACY_STATE_PRESENT: Legacy Cairn runtime state was preserved unchanged. Migrate it safely before starting another task.");
      const key = canonicalProjectKey(dir);
      const refusal = runRefusal(anyTaskRunningOrStarting(), isQuitDraining());
      if (refusal) return { ok: false, message: refusal } satisfies Result<never>;
      if (criticCalibration?.hasActive()) {
        return { ok: false, message: CRITIC_CALIBRATION_ACTIVE } satisfies Result<never>;
      }
      const pendingRefusal = pendingTaskStartRefusal(dir);
      if (pendingRefusal) return { ok: false, message: pendingRefusal } satisfies Result<never>;
      const generation = nextGeneration(key);

      let intent: TaskIntent | null = null;
      let taskSpec: TaskSpecV1 | undefined;
      let taskSpecPreview: TaskSpecProposalPreviewV1 | undefined;
      const guardedQ9 = q9RuntimeForProject(q9Runtime, dir);
      if (guardedQ9 !== null && source.kind === "proposal") {
        return { ok: false, message: "Q9_TEST_MANUAL_ONLY: The guarded offline lifecycle starts only from the local task screen." } satisfies Result<never>;
      }
      if (source.kind === "manual") {
        if (guardedQ9 !== null) {
          intent = guardedQ9.harness.intent;
        } else {
          if (source.rawOutcome.length > 2_000) return { ok: false, message: DIRECT_TASK_TOO_LONG } satisfies Result<never>;
          intent = createDirectTaskIntent(source.rawOutcome, randomUUID());
        }
        if (intent === null) return { ok: false, message: DIRECT_TASK_INVALID } satisfies Result<never>;
        if (QUALITY_PREVIEW_ACTIVE) {
          const proposal = composeDirectTaskSpecProposal(intent);
          if (proposal === null) return { ok: false, message: DIRECT_TASK_QUALITY_INVALID } satisfies Result<never>;
          taskSpec = proposal.taskSpec;
          taskSpecPreview = proposal.preview;
        }
      } else {
        const current = currentTaskProposal(dir, source.conversationId, source.proposalId);
        if (current === null) return { ok: false, message: PROPOSAL_STALE } satisfies Result<never>;
        if (current.unresolvedRisks !== 0) return { ok: false, message: PROPOSAL_RISKS } satisfies Result<never>;
        intent = current.intent;
        taskSpec = current.taskSpec;
        taskSpecPreview = current.taskSpecPreview;
      }

      const detected: Awaited<ReturnType<typeof detectedAdapters>> = guardedQ9 === null
        ? await detectedAdapters(mock, dir)
        : { adapters: [guardedQ9.harness.adapter] };
      const postDetectionRunRefusal = runRefusal(anyTaskRunningOrStarting(), isQuitDraining());
      if (postDetectionRunRefusal) {
        if (routeGenerations.get(key) === generation) nextGeneration(key);
        return { ok: false, message: postDetectionRunRefusal } satisfies Result<never>;
      }
      if (criticCalibration?.hasActive()) {
        if (routeGenerations.get(key) === generation) nextGeneration(key);
        return { ok: false, message: CRITIC_CALIBRATION_ACTIVE } satisfies Result<never>;
      }
      const postDetectionPendingRefusal = pendingTaskStartRefusal(dir);
      if (postDetectionPendingRefusal) {
        if (routeGenerations.get(key) === generation) nextGeneration(key);
        return { ok: false, message: postDetectionPendingRefusal } satisfies Result<never>;
      }
      if (routeGenerations.get(key) !== generation) return { ok: false, message: PREVIEW_STALE } satisfies Result<never>;
      if (source.kind === "proposal") {
        const current = currentTaskProposal(dir, source.conversationId, source.proposalId);
        if (current === null || current.unresolvedRisks !== 0 || current.intent !== intent
            || current.taskSpec !== taskSpec || current.taskSpecPreview !== taskSpecPreview) {
          nextGeneration(key);
          return { ok: false, message: PROPOSAL_STALE } satisfies Result<never>;
        }
      }

      let taskReviewAuthority: MainTaskReviewAuthorityV1 | undefined;
      let taskReview: TaskReviewProjectionV1 | undefined;
      if (taskSpec !== undefined) {
        taskReviewAuthority = composePendingTaskReviewAuthority(dir, taskSpec) ?? undefined;
        taskReview = taskReviewAuthority === undefined ? undefined : taskReviewProjection(taskReviewAuthority) ?? undefined;
        if (taskReviewAuthority === undefined || taskReview === undefined) {
          throw new Error("TASK_REVIEW_UNAVAILABLE: Cairn could not bind the accepted Task Spec review.");
        }
      }

      const route = previewSerialRoute(intent, detected.adapters, adapterId);
      const value = route.status === "connection-required" && detected.status
        ? { ...route, reason: connectionRequiredReason(detected.status) }
        : route;
      const routed = value.status === "ready"
        ? detected.adapters.find((adapter) => adapter.descriptor.id === value.recommended.id)
        : undefined;
      const projection = taskRequestView(intent);
      if (projection === null) throw new Error("TASK_INTENT_INVALID: Cairn could not project the authenticated task request.");
      const identity = runtimeWorkerIdentity(routed);
      const disclosure = routed?.disclosure?.(intent);
      const previewId = randomUUID();
      const pending: PendingPreview = Object.freeze({
        previewId,
        generation,
        intent,
        request: projection,
        context: Object.freeze([...intent.context]),
        route: value,
        adapter: value.status === "ready" ? Object.freeze({ ...value.recommended, capabilities: Object.freeze([...value.recommended.capabilities]) }) : null,
        worker: identity.worker,
        ...(disclosure === undefined ? {} : { disclosure: Object.freeze({ ...disclosure }) }),
        source: Object.freeze({ ...source }),
        ...(taskSpec === undefined ? {} : { taskSpec }),
        ...(taskSpecPreview === undefined ? {} : { taskSpecPreview }),
        ...(taskReviewAuthority === undefined ? {} : { taskReviewAuthority }),
        ...(taskReview === undefined ? {} : { taskReview }),
        ...(guardedQ9 === null ? {} : { q9Harness: guardedQ9.harness }),
      });
      if (routeGenerations.get(key) !== generation) return { ok: false, message: PREVIEW_STALE } satisfies Result<never>;
      previews.set(key, pending);
      if (taskReviewAuthority !== undefined) reviewAuthorities.set(key, taskReviewAuthority);
      return {
        ok: true,
        value: {
          previewId,
          request: projection,
          context: [...intent.context],
          route: value,
          // Task 238: the checks THIS project can actually answer. A project
          // declaring none gets an empty menu, and every row falls to the
          // owner's own eyes rather than to an invented check.
          checkMenu: projectCheckMenu(dir).map((check) => ({
            id: check.id, label: check.label, command: check.command,
          })),
          ...(disclosure === undefined ? {} : { disclosure }),
          ...(taskSpecPreview === undefined ? {} : { taskSpecPreview }),
          ...(taskReview === undefined ? {} : { taskReview }),
        },
      };
    } catch (error) {
      logError("task:route", error);
      return { ok: false, message: plainMessage(error) };
    }
  });

  ipcMain.handle("task:review-action", (_event, unsafeRequest: unknown): Result<TaskReviewProjectionV1> => {
    const request = parseTaskReviewActionRequest(unsafeRequest);
    if (request === null) {
      return { ok: false, message: "TASK_REVIEW_ACTION_INVALID: Cairn refused a malformed owner-check choice." };
    }
    try {
      projectStatus(request.dir);
      const q9 = decideQ9TaskReview(request);
      if (q9.handled) return q9.ok
        ? { ok: true, value: q9.value }
        : { ok: false, message: `${q9.code}: Cairn refused that guarded Q9 owner-check choice.` };
      const key = canonicalProjectKey(request.dir);
      const authority = reviewAuthorities.get(key);
      if (authority === undefined) {
        return { ok: false, message: "TASK_REVIEW_STALE: That owner check is no longer current." };
      }
      const projection = applyTaskReviewAction(authority, request);
      if (projection === null) {
        if (taskReviewProjection(authority) === null) {
          invalidateTaskReviewAuthority(authority);
          reviewAuthorities.delete(key);
        }
        return { ok: false, message: "TASK_REVIEW_STALE: That owner check is no longer current." };
      }
      const pending = previews.get(key);
      if (pending?.taskReviewAuthority === authority) {
        previews.set(key, Object.freeze({ ...pending, taskReview: projection }));
      }
      const session = sessions.get(key);
      if (session?.taskReview !== undefined) session.taskReview = projection;
      return { ok: true, value: projection };
    } catch (error) {
      logError("task:review-action", error);
      return { ok: false, message: "TASK_REVIEW_STALE: That owner check is no longer current." };
    }
  });

  /**
   * Decide the one pending Independent-critic call.
   *
   * The reply is output only: it says what was decided and nothing a renderer
   * could use as authority for a call. The grant an approval produces stays in
   * main; only the guarded calibration branch below can hand it to the injected
   * fake sender.
   */
  ipcMain.handle("critic:call-decide", async (_event, unsafeRequest: unknown): Promise<Result<CriticCallDecisionV1>> => {
    const request = parseCriticCallDecisionRequest(unsafeRequest);
    if (request === null) {
      return { ok: false, message: "CRITIC_CALL_INVALID: Cairn refused a malformed critic-call decision." };
    }
    try {
      // The same project check every other task authority performs before it
      // touches anything.
      projectStatus(request.dir);
      const key = canonicalProjectKey(request.dir);
      const q9 = decideQ9Critic(request);
      if (q9.handled) return q9.ok
        ? { ok: true, value: q9.value }
        : { ok: false, message: `${q9.code}: Cairn refused that guarded Q9 critic decision.` };
      // A project Cairn has gated for pending-run recovery may not have a
      // paid call approved against it, exactly as task start and push may not
      // proceed. Without this the critic surface would be the one authority
      // that ignores Task 215's gate.
      const gated = pendingTaskStartRefusal(request.dir);
      if (gated !== null) return { ok: false, message: gated };
      if (criticCalibration?.hasPending(key)) {
        if (anyTaskRunningOrStarting()) {
          return { ok: false, message: CRITIC_CALIBRATION_TASK_ACTIVE };
        }
        const calibrated = await criticCalibration.decide(request).finally(() => {
          if (!criticCalibration.hasActive(key)) clearSyntheticCalibrationDisclosure(key);
        });
        if (!calibrated.ok) {
          if (calibrated.consumed === true) win()?.webContents.send("critic:calibration-changed");
          const refusal = calibrated.code as CriticCallDecisionRefusal;
          const knownRefusal = Object.prototype.hasOwnProperty.call(CRITIC_CALL_REFUSAL_MESSAGES, refusal);
          return {
            ok: false,
            message: knownRefusal
              ? CRITIC_CALL_REFUSAL_MESSAGES[refusal]
              : `${calibrated.code}: Cairn could not complete that synthetic calibration decision.`,
          };
        }
        win()?.webContents.send("critic:calibration-changed");
        return { ok: true, value: calibrated.value.decision };
      }
      const outcome = decideCriticCall(request);
      if (!outcome.ok) return { ok: false, message: CRITIC_CALL_REFUSAL_MESSAGES[outcome.code] };
      // Only a decision that succeeded spends the approval, so only then does
      // the snapshot stop advertising a card.
      const session = sessions.get(key);
      if (session?.criticCall !== undefined) delete session.criticCall;
      return { ok: true, value: outcome.decision };
    } catch (error) {
      logError("critic:call-decide", error);
      return { ok: false, message: "CRITIC_CALL_STALE: That critic call is no longer waiting for a decision." };
    }
  });

  ipcMain.handle("repair:call-decide", (_event, unsafeRequest: unknown): Result<RepairCallDecisionV1> => {
    try {
      const q9 = decideQ9Repair(unsafeRequest);
      if (!q9.handled) {
        return { ok: false, message: "Q9_REPAIR_NOT_WAITING: No guarded Builder repair is waiting for this project." };
      }
      return q9.ok
        ? { ok: true, value: q9.value }
        : { ok: false, message: `${q9.code}: Cairn refused that guarded Q9 repair decision.` };
    } catch (error) {
      logError("repair:call-decide", error);
      return { ok: false, message: "Q9_REPAIR_NOT_WAITING: That guarded Builder repair is no longer waiting." };
    }
  });

  ipcMain.handle("harness:revision-decide", (_event, unsafeRequest: unknown): Result<Q9HarnessRevisionDecisionV1> => {
    try {
      const q9 = decideQ9HarnessRevision(unsafeRequest);
      if (!q9.handled) {
        return { ok: false, message: "Q9_HARNESS_NOT_WAITING: No guarded harness correction is waiting for this project." };
      }
      return q9.ok
        ? { ok: true, value: q9.value }
        : { ok: false, message: `${q9.code}: Cairn refused that guarded harness decision.` };
    } catch (error) {
      logError("harness:revision-decide", error);
      return { ok: false, message: "Q9_HARNESS_NOT_WAITING: That guarded harness correction is no longer waiting." };
    }
  });

  // The owner's answer to one unsealed candidate. Continuing authorizes nothing
  // new: the run is already open, already approved, and already past its worker
  // call, so this only releases it into the close it was headed for. Stopping
  // takes Core's honest STOPPED door. Either way Main decides nothing about the
  // result itself.
  //
  // Task 244 adds a third answer, and one guard for it. The renderer holds the
  // confirm/dismiss state, which makes it exactly the surface that could invent
  // a correction — so Main hands Core only the `not_met` sentences a critic
  // really sent, for this exact pause, and a repair naming anything else is
  // refused here before it can become a dispatch.
  ipcMain.handle("task:candidate-decide", (_event, unsafeRequest: unknown): Result<UnsealedCandidateDecisionV1> => {
    try {
      const outcome = decideUnsealedCandidate(unsafeRequest, allegationsFor(unsafeRequest));
      return outcome.ok
        ? { ok: true, value: outcome.decision }
        : { ok: false, message: `${outcome.code}: Cairn is not waiting on that unsealed candidate.` };
    } catch (error) {
      logError("task:candidate-decide", error);
      return {
        ok: false,
        message: "UNSEALED_CANDIDATE_UNKNOWN_CHECKPOINT: That unsealed candidate is no longer waiting.",
      };
    }
  });

  // The owner's answer to the critic offer beside that pause. This is NOT a
  // way to finish, stop, or change the run: it either spends one disclosed
  // request or declines it, and either way the owner's two real choices are
  // still waiting on the card above.
  //
  // Everything is caught. This runs while a Core runner is blocked on the
  // pause with no catch of its own, so an exception escaping here would strand
  // that run holding its lock.
  ipcMain.handle("task:candidate-critique", async (_event, unsafeRequest: unknown): Promise<Result<CandidateCritiqueProjectionV1>> => {
    try {
      const dir = (unsafeRequest as { dir?: unknown } | null)?.dir;
      const route = typeof dir === "string" ? candidateCritiqueRoute(dir) : null;
      const outcome = await decideCandidateCritique(unsafeRequest, {
        fetchImpl: fetch,
        // Read at the moment of the call, never held. Throwing here is caught
        // by the critique module and reported as unavailable.
        credential: () => {
          if (route === null) throw new Error("CONDUCTOR_CREDENTIAL_UNAVAILABLE");
          return route.credential();
        },
      });
      if (!outcome.ok) {
        return { ok: false, message: `${outcome.code}: Cairn is not offering that inspection.` };
      }
      // Publish onto the session the renderer already polls once a second.
      if (typeof dir === "string") {
        const session = sessions.get(canonicalProjectKey(dir));
        if (session) session.unsealedCandidateCritique = outcome.projection;
      }
      return { ok: true, value: outcome.projection };
    } catch (error) {
      logError("task:candidate-critique", error);
      return {
        ok: false,
        message: "CANDIDATE_CRITIQUE_UNKNOWN_CHECKPOINT: That inspection is no longer being offered.",
      };
    }
  });

  ipcMain.handle("critic:calibration-open", (_event, unsafeRequest: unknown) => {
    const request = parseCriticCalibrationOpenRequest(unsafeRequest);
    if (request === null) {
      return { ok: false, message: "CRITIC_CALIBRATION_INPUT_INVALID: Cairn refused a malformed synthetic fixture choice." } satisfies Result<never>;
    }
    if (criticCalibration === null) {
      return { ok: false, message: "CRITIC_CALIBRATION_UNAVAILABLE: No guarded injected fake is installed." } satisfies Result<never>;
    }
    try {
      projectStatus(request.dir);
      const key = canonicalProjectKey(request.dir);
      if (anyTaskRunningOrStarting()) {
        return { ok: false, message: CRITIC_CALIBRATION_TASK_ACTIVE } satisfies Result<never>;
      }
      const gated = pendingTaskStartRefusal(request.dir);
      if (gated !== null) return { ok: false, message: gated } satisfies Result<never>;
      const opened = criticCalibration.open(request);
      if (!opened.ok) return { ok: false, message: `${opened.code}: Cairn did not open a synthetic calibration call.` } satisfies Result<never>;
      const session = sessions.get(key);
      if (session !== undefined) session.criticCall = opened.value.disclosure;
      win()?.webContents.send("critic:calibration-changed");
      return { ok: true, value: opened.value };
    } catch (error) {
      logError("critic:calibration-open", error);
      return { ok: false, message: "CRITIC_CALIBRATION_INPUT_INVALID: Cairn could not bind that fixture to this project." } satisfies Result<never>;
    }
  });

  ipcMain.handle("critic:calibration-current", (_event, dir: unknown) => {
    if (typeof dir !== "string" || dir.length === 0 || dir.length > 32_767 || criticCalibration === null) return null;
    try {
      projectStatus(dir);
      return criticCalibration.current(dir);
    } catch { return null; }
  });

  ipcMain.handle("critic:calibration-cancel", (_event, dir: unknown): Result<"cancelled" | "cancelling"> => {
    if (typeof dir !== "string" || dir.length === 0 || dir.length > 32_767 || criticCalibration === null) {
      return { ok: false, message: "CRITIC_CALIBRATION_CALL_NOT_PENDING: No synthetic calibration call is waiting." };
    }
    try {
      projectStatus(dir);
      const key = canonicalProjectKey(dir);
      const cancelled = criticCalibration.cancel(dir);
      if (!cancelled.ok) {
        if (!criticCalibration.hasActive(key)) {
          clearSyntheticCalibrationDisclosure(key);
          win()?.webContents.send("critic:calibration-changed");
        }
        return { ok: false, message: `${cancelled.code}: Cairn could not cancel that synthetic calibration call.` };
      }
      clearSyntheticCalibrationDisclosure(key);
      win()?.webContents.send("critic:calibration-changed");
      return { ok: true, value: cancelled.value.status };
    } catch (error) {
      logError("critic:calibration-cancel", error);
      return { ok: false, message: "CRITIC_CALIBRATION_CALL_NOT_PENDING: No synthetic calibration call is waiting." };
    }
  });

  ipcMain.handle("task:preview-discard", (_event, dir: unknown, previewId?: unknown): Result<null> => {
    if (typeof dir !== "string" || dir.length === 0 || dir.length > 32_767 ||
        (previewId !== undefined && (typeof previewId !== "string" || !UUID_V4.test(previewId)))) {
      return { ok: false, message: "TASK_PREVIEW_DISCARD_INVALID: Cairn refused a malformed preview cancellation." };
    }
    try {
      const key = canonicalProjectKey(dir);
      const current = previews.get(key);
      // An exact id cannot retire a newer review. Omitting the id is the
      // bounded cancellation for a route lookup that has not returned yet.
      if (previewId === undefined || current?.previewId === previewId) nextGeneration(key);
      return { ok: true, value: null };
    } catch (error) {
      logError("task:preview-discard", error);
      return { ok: false, message: plainMessage(error) };
    }
  });

  ipcMain.handle("task:run", async (_event, unsafeRequest: unknown) => {
    const request = checkedRunRequest(unsafeRequest);
    if (request === null) return { ok: false, message: "TASK_RUN_INVALID: Cairn refused a malformed run request." } satisfies Result<never>;
    const { dir, previewId, realCallConfirmed, disclosure } = request;
    let key: string;
    try {
      projectStatus(dir);
      key = canonicalProjectKey(dir);
    } catch (error) {
      logError("task:run", error);
      return { ok: false, message: plainMessage(error) } satisfies Result<never>;
    }
    const refusal = runRefusal(anyTaskRunningOrStarting(), isQuitDraining());
    if (refusal) return { ok: false, message: refusal } satisfies Result<never>;
    if (criticCalibration?.hasActive()) {
      return { ok: false, message: CRITIC_CALIBRATION_ACTIVE } satisfies Result<never>;
    }
    const pendingRefusal = pendingTaskStartRefusal(dir);
    if (pendingRefusal) return { ok: false, message: pendingRefusal } satisfies Result<never>;

    // Acquire this canonical-project gate before adapter detection's first
    // await. Exactly one invocation can reach the consume boundary.
    starting.add(key);
    let acceptedRunOwnsGate = false;
    let invalidateMatchedPreview: (() => void) | null = null;
    try {
    const pending = previews.get(key);
    if (!pending || pending.previewId !== previewId || routeGenerations.get(key) !== pending.generation) {
      return { ok: false, message: PREVIEW_STALE } satisfies Result<never>;
    }
    if (!pendingReviewIsCurrent(key, pending)) {
      return { ok: false, message: PREVIEW_STALE } satisfies Result<never>;
    }
    // Once this invocation has proved it owns the reviewed preview, every
    // pre-acceptance uncertainty retires that authority. If another route or
    // an explicit cancellation already replaced it while an await was in
    // flight, do not let this stale invocation retire the newer preview.
    invalidateMatchedPreview = () => {
      if (previews.get(key) === pending && routeGenerations.get(key) === pending.generation) nextGeneration(key);
    };
    const refuseBeforeAcceptance = (message: string): Result<never> => {
      invalidateMatchedPreview?.();
      return { ok: false, message };
    };
    if (pending.route.status !== "ready" || pending.adapter === null) {
      return refuseBeforeAcceptance("TASK_ROUTE_UNAVAILABLE: That route is no longer ready. Review the task again.");
    }
    // Task 238: turn the owner's card selections into Core's promise rows. The
    // rows are derived from the SAME accepted intent Core will use, in the same
    // order, so `c1` here and `c1` there are the same promise. A selection that
    // does not cover every row is refused rather than silently completed, since
    // a missing row would be a promise nobody agreed to answer.
    let taskPromises: SerialTaskPromisesV1 | undefined;
    if (request.checkSelections !== undefined) {
      const rowCount = 1 + pending.request.requirements.length;
      const verifications: SerialTaskPromiseVerificationV1[] = [];
      for (let index = 0; index < rowCount; index += 1) {
        const choice = request.checkSelections[`c${index + 1}`];
        if (choice === undefined) {
          return refuseBeforeAcceptance(
            "TASK_CHECKS_INCOMPLETE: Every promise on the Task Card needs a way to be checked. Review the task again.",
          );
        }
        verifications.push(choice === "owner"
          ? { kind: "owner-observation" }
          : { kind: "cairn-check", checkId: choice });
      }
      const composed = composeSerialTaskPromises(pending.intent, verifications);
      if (composed === null) {
        return refuseBeforeAcceptance(
          "TASK_CHECKS_INVALID: Cairn could not match those checks to this request. Review the task again.",
        );
      }
      taskPromises = composed;
    }
    if (pending.source.kind === "proposal") {
      let current: ReturnType<typeof currentTaskProposal>;
      try {
        current = currentTaskProposal(dir, pending.source.conversationId, pending.source.proposalId);
      } catch (error) {
        logError("task:run proposal recheck", error);
        return refuseBeforeAcceptance(PROPOSAL_STALE);
      }
      if (current === null || current.unresolvedRisks !== 0 || current.intent !== pending.intent
          || current.taskSpec !== pending.taskSpec || current.taskSpecPreview !== pending.taskSpecPreview) {
        return refuseBeforeAcceptance(PROPOSAL_STALE);
      }
    }
    let detected: Awaited<ReturnType<typeof detectedAdapters>>;
    try {
      detected = pending.q9Harness
        ? { adapters: [pending.q9Harness.adapter] }
        : await detectedAdapters(mock, dir, realCallConfirmed === true ? pending.intent : undefined);
    } catch (error) {
      logError("task:run", error);
      return refuseBeforeAcceptance(plainMessage(error));
    }

    if (criticCalibration?.hasActive()) return refuseBeforeAcceptance(CRITIC_CALIBRATION_ACTIVE);
    if (previews.get(key) !== pending || routeGenerations.get(key) !== pending.generation || !pendingReviewIsCurrent(key, pending)) {
      return { ok: false, message: PREVIEW_STALE } satisfies Result<never>;
    }
    const postDetectionRunRefusal = runRefusal(taskRunningOrStartingOutside(key), isQuitDraining());
    if (postDetectionRunRefusal) return refuseBeforeAcceptance(postDetectionRunRefusal);
    const postDetectionPendingRefusal = pendingTaskStartRefusal(dir);
    if (postDetectionPendingRefusal) return refuseBeforeAcceptance(postDetectionPendingRefusal);
    if (pending.source.kind === "proposal") {
      let current: ReturnType<typeof currentTaskProposal>;
      try {
        current = currentTaskProposal(dir, pending.source.conversationId, pending.source.proposalId);
      } catch (error) {
        logError("task:run proposal recheck", error);
        return refuseBeforeAcceptance(PROPOSAL_STALE);
      }
      if (current === null || current.unresolvedRisks !== 0 || current.intent !== pending.intent
          || current.taskSpec !== pending.taskSpec || current.taskSpecPreview !== pending.taskSpecPreview) {
        return refuseBeforeAcceptance(PROPOSAL_STALE);
      }
    }

    const routed = detected.adapters.find((adapter) => adapter.descriptor.id === pending.adapter?.id);
    if (!routed || !routed.descriptor.connected || !routed.descriptor.capabilities.includes("serial-task")) {
      return refuseBeforeAcceptance("TASK_ROUTE_UNAVAILABLE: The reviewed worker is no longer available. Nothing was started.");
    }
    const identity = runtimeWorkerIdentity(routed);
    if (!sameAdapter(pending.adapter, routed.descriptor) || identity.adapterId !== pending.adapter.id || identity.worker !== pending.worker) {
      return refuseBeforeAcceptance(ROUTE_CHANGED);
    }
    let expected: WorkerDisclosure | undefined;
    try {
      expected = routed.disclosure?.(pending.intent);
    } catch (error) {
      logError("task:run disclosure recheck", error);
      return refuseBeforeAcceptance(ROUTE_CHANGED);
    }
    if (!disclosuresMatch(pending.disclosure, expected)) {
      return refuseBeforeAcceptance(ROUTE_CHANGED);
    }
    if ((expected !== undefined && (realCallConfirmed !== true || !sameDisclosure(disclosure, expected))) ||
        (expected === undefined && (realCallConfirmed === true || disclosure !== undefined))) {
      // This is the sole pre-acceptance survivor: the reviewed route is still
      // exact, and the owner may return with the matching authorization.
      return { ok: false, message: REAL_CALL_NOT_AUTHORIZED } satisfies Result<never>;
    }

    if (pending.source.kind === "proposal") {
      let consumed: ReturnType<typeof consumeCurrentTaskProposal>;
      try {
        consumed = consumeCurrentTaskProposal(dir, pending.source.conversationId, pending.source.proposalId);
      } catch (error) {
        logError("task:run proposal consume", error);
        return refuseBeforeAcceptance(PROPOSAL_STALE);
      }
      if (consumed === null || consumed.intent !== pending.intent
          || consumed.taskSpec !== pending.taskSpec || consumed.taskSpecPreview !== pending.taskSpecPreview) {
        return refuseBeforeAcceptance(PROPOSAL_STALE);
      }
    } else {
      previews.delete(key);
    }

    const acceptedTaskReview = pending.taskReview;
    if (pending.taskReviewAuthority !== undefined) {
      invalidateTaskReviewAuthority(pending.taskReviewAuthority);
      if (reviewAuthorities.get(key) === pending.taskReviewAuthority) reviewAuthorities.delete(key);
    }
    const outcome = pending.request.outcome.text;
    const conversationId = pending.source.kind === "proposal"
      ? pending.source.conversationId
      : pending.q9Harness ? newConversationId(dir) : null;
    // Capture the output-only view at the acceptance point. Acknowledgement may
    // remove the session before an asynchronous close, so ERROR cards never
    // query renderer/session/conversation state for provenance later.
    const acceptedRequest = pending.request;
    const routedAdapterId = pending.adapter.id;
    const routedWorker = pending.worker;
    let cardEvidenceRunId: string | null = null;
    // Hoisted across both accepted setup and Core/run errors: every accepted
    // chat run attempts one authenticated envelope card even when setup throws
    // before the settled promise can be installed. A custody/write failure is
    // logged below and cannot rewrite the run's own terminal result.
    const post = (build: () => ResultCard): void => {
      if (conversationId === null) return;
      let posted: ResultCard | null = null;
      try {
        const card = build();
        const turn = postResultCard(dir, conversationId, card);
        const delta: ConductorDelta = { dir, conversationId, kind: "envelope", turn };
        win()?.webContents.send("conductor:delta", delta);
        emitBridgeSync(); // a watching phone refreshes on the card too
        posted = card;
      } catch (error) {
        // The card is an addition to a run that already closed. A failure to
        // write it is logged and never allowed to change the run's own result.
        logError("task:run result card", error);
      }
      // The card is written and announced; now — and only now — the conductor
      // may add its one short comment. It sees the authenticated card through
      // cardBriefing(), not a separately reconstructed request.
      if (posted === null) return;
      try {
        commentary(dir, conversationId, posted, (delta) => {
          win()?.webContents.send("conductor:delta", delta);
          emitBridgeSync(); // the commentary stream is visible on the phone
        });
      } catch (error) {
        logError("task:run commentary", error);
      }
    };
    let controller: AbortController;
    let evidenceRunId: string | null;
    let evidenceWindow: StageCaptureWindow | null;
    try {
      controller = new AbortController();
      markRunning(key);
      controllers.set(key, controller);
      evidenceRunId = routedWorker ? randomUUID() : null;
      evidenceWindow = evidenceRunId === null ? null : win();
      sessions.set(key, {
        dir,
        outcome,
        acceptedPreviewId: previewId,
        request: pending.request,
        adapterId: routedAdapterId,
        conversationId,
        worker: routedWorker,
        startedAt: new Date().toISOString(),
        activities: [],
        phase: "running",
        result: null,
        error: null,
        evidenceRunId,
        ...(acceptedTaskReview === undefined ? {} : { taskReview: acceptedTaskReview }),
      });
    } catch (error) {
      starting.delete(key);
      clearRunning(key);
      controllers.delete(key);
      logError("task:run accepted setup", error);
      const message = plainMessage(error);
      try {
        sessions.set(key, {
          dir, outcome, acceptedPreviewId: previewId, request: pending.request, adapterId: routedAdapterId, conversationId,
          worker: routedWorker, startedAt: new Date().toISOString(), activities: [],
          phase: "closed", result: null, error: message, evidenceRunId: null,
          ...(acceptedTaskReview === undefined ? {} : { taskReview: acceptedTaskReview }),
        });
      } catch {
        // Memory exhaustion can also prevent the retained error projection.
      }
      post(() => composeErrorCard(message, acceptedRequest, null, acceptedTaskReview));
      return { ok: false, message } satisfies Result<never>;
    }

    if (pending.q9Harness) {
      const q9Harness = pending.q9Harness;
      const runtime = q9RuntimeForProject(q9Runtime, dir);
      if (runtime === null || runtime.harness !== q9Harness) {
        return refuseBeforeAcceptance("Q9_TEST_RUNTIME_CHANGED: The guarded offline fixture changed before start.");
      }
      const session = sessions.get(key);
      if (!session) return refuseBeforeAcceptance("Q9_TEST_SESSION_REFUSED: Cairn could not retain the guarded run session.");
      const q9Session: Q9QualityLoopSessionV1 = Object.freeze({
        conversationId,
        startedAt: session.startedAt,
        adapterIdentitySha256: q9AdapterIdentitySha256(q9Harness),
        evidenceRunId: null,
        acceptedRequest,
      });
      const controller = controllers.get(key);
      if (!controller) return refuseBeforeAcceptance("Q9_TEST_SESSION_REFUSED: Cairn could not retain the guarded run controller.");
      let ownsDurableQ9Terminal = false;
      const run = (async (): Promise<Result<SerialRunResult>> => {
        try {
          const initial = await q9Harness.runInitial(controller.signal);
          if (initial.status !== "candidate") {
            if (initial.status !== "connection-required") {
              session.phase = "closed";
              session.result = initial;
              return { ok: true, value: initial };
            }
            throw new Error("Q9_INITIAL_CANDIDATE_REFUSED");
          }
          const settlement = startQ9QualityLoop({
            projectRoot: dir,
            candidate: initial,
            evidence: null,
            session: q9Session,
            dependencies: q9LoopDependencies(runtime, win),
          });
          // Once the pending candidate exists, its authenticated terminal
          // outbox is the sole card writer.  Before that boundary, preserve
          // the envelope's ordinary accepted-run error/STOP card behavior.
          ownsDurableQ9Terminal = currentQ9QualityLoop(dir) !== null
            || currentPendingSerialCandidate(dir) !== null;
          const settled = await settlement;
          session.phase = "closed";
          session.result = settled;
          return { ok: true, value: settled };
        } catch (error) {
          const message = plainMessage(error);
          session.error = message;
          // Before persistence, no candidate exists to terminalize. Once the
          // Q9 loop exists it owns the durable STOP/recovery path itself.
          if (currentQ9QualityLoop(dir) === null) session.phase = "closed";
          return { ok: false, message };
        } finally {
          starting.delete(key);
          if (currentQ9QualityLoop(dir) === null) {
            clearRunning(key);
            controllers.delete(key);
          }
          settlements.delete(key);
        }
      })();
      settlements.set(key, run);
      acceptedRunOwnsGate = true;
      if (conversationId !== null) {
        void run.then(
          (outcome) => {
            if (ownsDurableQ9Terminal) return;
            post(() => outcome.ok
              ? composeResultCard(outcome.value, null, acceptedTaskReview)
              : composeErrorCard(outcome.message, acceptedRequest, null, acceptedTaskReview));
          },
          (error: unknown) => {
            if (!ownsDurableQ9Terminal) {
              post(() => composeErrorCard(plainMessage(error), acceptedRequest, null, acceptedTaskReview));
            }
          },
        );
      }
      return run;
    }
    // Evidence exists only for a real routed worker. Bind both pictures to the
    // BrowserWindow that showed the accepted project; a replacement window or
    // a switched project fails the capture helper's identity check.
    let evidenceCaptureCount = 0;

    const captureEvidence = async (boundary: EvidenceBoundary, terminal: boolean): Promise<void> => {
      if (evidenceRunId === null || evidenceWindow === null) return;
      try {
        const captured = terminal
          ? await captureTerminalStage(evidenceWindow, dir, evidenceRunId)
          : await captureBeforeWorkerStage(evidenceWindow, dir, evidenceRunId);
        if (captured === null) return;
        recordEvidenceCapture({ root: dir, runId: evidenceRunId, boundary, ...captured });
        evidenceCaptureCount += 1;
      } catch (error) {
        // Evidence is an honest optional account of the run. A GPU/profile
        // failure must never rewrite the worker outcome it was documenting.
        logError(`task:run evidence ${boundary}`, error);
      }
    };

    const finishEvidence = async (
      boundary: Exclude<EvidenceBoundary, "worker-not-started">,
      disposition: "DONE" | "STOPPED" | "ERROR",
      taskNumber: number | null,
    ): Promise<void> => {
      if (evidenceRunId === null) return;
      await captureEvidence(boundary, true);
      if (evidenceCaptureCount > 0) {
        try {
          finalizeEvidenceRun(dir, evidenceRunId, {
            taskNumber,
            title: evidenceTitle(outcome),
            disposition,
          });
          cardEvidenceRunId = evidenceRunId;
        } catch (error) {
          logError("task:run evidence finalize", error);
        }
      }
      const session = sessions.get(key);
      if (session) session.evidenceRunId = cardEvidenceRunId;
    };

    const run: Promise<Result<SerialRunResult>> = (async () => {
      try {
        // This await is the true pre-work barrier: runSerialTask — and therefore
        // every adapter — is not invoked until the bounded attempt is over.
        await captureEvidence("worker-not-started", false);
        const value = await runSerialTask(dir, pending.intent, {
          adapters: detected.adapters,
          adapterId: routedAdapterId,
          signal: controller.signal,
          // Task 238: the rows the owner accepted on the Task Card, with who
          // answers each. Absent when the owner selected nothing, which leaves
          // this run byte-for-byte the run it was before.
          ...(taskPromises ? { taskPromises } : {}),
          events: {
            onActivity: (activity) => {
              sessions.get(key)?.activities.push(activity);
              const payload: TaskActivityEvent = { dir, activity };
              win()?.webContents.send("task:activity", payload);
            },
          },
          // Task 235: the pre-terminal pause. Core has finished the worker and
          // its own checks and holds the run open — lock, snapshot, adapter and
          // all — while the owner reads what happened.
          //
          // Main adds no authority here. It publishes a display projection on
          // the session the renderer already polls, waits, and hands back one
          // word. Core emitted its "waiting" activity immediately before this
          // call, so the renderer's existing activity refresh (and its
          // once-a-second poll while the run is live) surface the candidate
          // without a new push channel.
          onUnsealedCandidate: async (candidate, signal) => {
            // Nobody to ask, or a candidate Cairn cannot vouch for: stop
            // honestly rather than seal something the owner never saw.
            const contents = win()?.webContents ?? null;
            if (contents === null || contents.isDestroyed()) return "stop";
            const opened = openUnsealedCandidateCheckpoint({ dir, candidate });
            if (opened === null) return "stop";
            const held = sessions.get(key);
            if (held) held.unsealedCandidate = opened.projection;
            // The critic offer rides BESIDE the pause, joined to it by the
            // same checkpoint id. It is a separate field on purpose: the
            // projection above is pinned by three identity comparisons, and
            // replacing it would stop an abort or a closed window from
            // settling the pause. Nothing here is read by any gate.
            const critique = openCritiqueForCandidate(dir, opened.projection.checkpointId, candidate);
            if (held && critique) held.unsealedCandidateCritique = critique;
            if (critique) priceCritiqueInBackground(dir, opened.projection.checkpointId, signal);
            // Cairn is still alive in both of these cases, so both close the
            // pause the honest way — an authored STOPPED, never a DONE.
            const close = (): void => { closeUnsealedCandidateIfCurrent(dir, opened.projection); };
            if (signal?.aborted) close();
            else signal?.addEventListener("abort", close, { once: true });
            contents.once("destroyed", close);
            try {
              // Main answers in Core's own words. `continue` carries the
              // owner's row judgments; `repair` carries the one confirmed
              // correction, which Core re-checks against its own frozen rows
              // before it dispatches anything; anything else is the honest stop.
              const settlement = await opened.settled;
              if (settlement.choice === "continue") {
                return { choice: "continue" as const, ownerAnswers: settlement.ownerAnswers };
              }
              if (settlement.choice === "repair") {
                return {
                  choice: "repair" as const,
                  repair: {
                    version: SERIAL_CANDIDATE_REPAIR_VERSION,
                    checkId: settlement.repair.checkId as `c${number}`,
                    correction: settlement.repair.correction,
                  },
                };
              }
              return "stop";
            } finally {
              signal?.removeEventListener("abort", close);
              if (!contents.isDestroyed()) contents.off("destroyed", close);
              const current = sessions.get(key);
              if (current?.unsealedCandidate === opened.projection) delete current.unsealedCandidate;
              closeCandidateCritique(dir, opened.projection.checkpointId);
              if (current) delete current.unsealedCandidateCritique;
            }
          },
        });
        const safeValue = value.status === "connection-required" && detected.status
          ? { ...value, route: { ...value.route, reason: connectionRequiredReason(detected.status) } }
          : value;
        const session = sessions.get(key);
        if (session) { session.phase = "closed"; session.result = safeValue; }
        if (safeValue.status === "connection-required") {
          // A readiness close did no work, so remove only this valid,
          // unfinalized pre-work attempt rather than retaining an orphan or
          // masquerading it as run evidence.
          if (session) session.evidenceRunId = null;
          if (evidenceRunId !== null) {
            try {
              discardUnfinalizedEvidenceRun(dir, evidenceRunId);
            } catch (error) {
              logError("task:run evidence discard", error);
            }
          }
          return { ok: true, value: safeValue };
        }
        const disposition = safeValue.composed.disposition;
        await finishEvidence(
          disposition === "DONE" ? "done" : "stopped",
          disposition,
          safeValue.composed.taskNumber,
        );
        return { ok: true, value: safeValue };
      } catch (error) {
        // Acceptance already consumed the preview/proposal. A Core-entry throw
        // keeps this session's request view for the later ERROR surface, but it
        // never resurrects either one-time authority.
        logError("task:run", error);
        const session = sessions.get(key);
        if (session) { session.phase = "closed"; session.error = plainMessage(error); }
        await finishEvidence("error", "ERROR", null);
        return { ok: false, message: plainMessage(error) };
      } finally {
        starting.delete(key);
        clearRunning(key);
        controllers.delete(key);
        settlements.delete(key);
      }
    })();
    settlements.set(key, run);
    acceptedRunOwnsGate = true;
    // The envelope speaks the result, for EVERY terminal state — a verified
    // DONE, an honest STOPPED, a connection-required close, and a run that
    // threw. The card is composed from the run's own structured record input,
    // written into the conversation that dispatched it, and announced to a
    // screen already showing that conversation.
    //
    // It chains on the SETTLED promise, not inside the closure: `run.then`
    // runs after the closure's `finally`, so the running set is already clear
    // and the send gate is already open by the time the card lands. A card
    // posted from inside would arrive while the conversation still reads as
    // blocked.
    //
    // Only a run that carried a conversation id has a conversation to post to;
    // one typed on the task screen posts nothing. Nothing here depends on the
    // run session surviving — `task:acknowledge` may have deleted it already.
    if (conversationId !== null) {
      void run.then(
        (outcome) => post(() => (outcome.ok
          ? composeResultCard(outcome.value, cardEvidenceRunId, acceptedTaskReview)
          : composeErrorCard(outcome.message, acceptedRequest, cardEvidenceRunId, acceptedTaskReview))),
        // Unreachable by construction — the closure above catches everything
        // and returns a refusal. It is still handled, so that no terminal state
        // can go unspoken and no rejection can escape unhandled.
        (error: unknown) => post(() => composeErrorCard(plainMessage(error), acceptedRequest, cardEvidenceRunId, acceptedTaskReview)),
      );
    }
    return run;
    } catch (error) {
      // This is the final fail-closed net around every service/adapter getter
      // and consume operation after acquiring the gate. Once the run promise
      // owns cleanup, its own catch/finally remains authoritative.
      if (!acceptedRunOwnsGate) {
        invalidateMatchedPreview?.();
        clearRunning(key);
        controllers.delete(key);
        settlements.delete(key);
        const session = sessions.get(key);
        if (session?.phase === "running") {
          session.phase = "closed";
          session.error = plainMessage(error);
        }
      }
      logError("task:run pre-accept", error);
      return { ok: false, message: plainMessage(error) } satisfies Result<never>;
    } finally {
      if (!acceptedRunOwnsGate) starting.delete(key);
    }
  });

  ipcMain.handle("task:cancel", (_event, dir: string): Result<null> => {
    try {
      const q9 = currentQ9QualityLoop(dir);
      if (q9 !== null) {
        if (cancelQ9QualityLoop(dir)) return { ok: true, value: null };
        return {
          ok: false,
          message: q9.status === "recovery-required"
            ? `${q9.refusal ?? "Q9_RECOVERY_REQUIRED"}: Cairn could not safely terminalize this guarded run, so it did not report cancellation as complete.`
            : "Q9_CANCEL_REFUSED: Cairn could not safely cancel this guarded run. Reopen the run screen for its current status.",
        };
      }
      const controller = controllers.get(canonicalProjectKey(dir));
      if (!controller) return { ok: false, message: "No task is running for this project." };
      controller.abort();
      return { ok: true, value: null };
    } catch {
      return { ok: false, message: "No task is running for this project." };
    }
  });

  ipcMain.handle("task:current", (_event, dir: string): RunSessionSnapshot | null => currentTaskSession(dir));

  ipcMain.handle("task:acknowledge", (_event, dir: string): Result<null> => {
    try {
      const key = canonicalProjectKey(dir);
      const session = sessions.get(key);
      // A closed session becomes visible just before terminal capture. Keep its
      // run identity until that bounded settlement finishes; an eager click on
      // "Return" cannot erase the proof between capture's two identity checks.
      if (session && session.phase === "closed" && !isTaskRunning(key)
        && currentQ9QualityLoop(dir) === null) sessions.delete(key);
      return { ok: true, value: null };
    } catch {
      return { ok: false, message: "That project session is no longer available." };
    }
  });

  ipcMain.handle("evidence:album", (
    _event,
    dir: string,
    selectedRunId: string | null = null,
    cursor: string | null = null,
  ): Result<EvidenceAlbum> => {
    try {
      projectStatus(dir);
      return { ok: true, value: readEvidenceAlbum(dir, selectedRunId, cursor) };
    } catch (error) {
      logError("evidence:album", error);
      return { ok: false, message: "Cairn couldn't open the local picture album." };
    }
  });

  ipcMain.handle("evidence:image", (_event, dir: string, imageId: string): Result<EvidenceImageData> => {
    try {
      projectStatus(dir);
      const value = readEvidenceImage(dir, imageId);
      return value === null
        ? { ok: false, message: "That local picture is missing or no longer matches Cairn's record." }
        : { ok: true, value };
    } catch (error) {
      logError("evidence:image", error);
      return { ok: false, message: "That local picture is unavailable." };
    }
  });
}
