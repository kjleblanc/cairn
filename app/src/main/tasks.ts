import { ipcMain, type BrowserWindow } from "electron";
import { randomUUID } from "node:crypto";
import {
  createDirectTaskIntent,
  previewSerialRoute,
  projectStatus,
  runSerialTask,
  taskRequestView,
  type AdapterDescriptor,
  type SerialRunResult,
  type TaskIntent,
  type WorkerDisclosure,
} from "@cairn/core";
import { connectionRequiredReason, detectedAdapters } from "./adapters.js";
import { emitBridgeSync } from "./bridge/hub.js";
import type {
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
} from "../shared/ipc.js";
import { composeErrorCard, composeResultCard, postResultCard } from "./conductor/relay.js";
import {
  commentary,
  consumeCurrentTaskProposal,
  currentTaskProposal,
  onTaskProposalChanged,
} from "./conductor/service.js";
import { isConversationId } from "./conductor/conversation-id.js";
import { canonicalProjectKey } from "./conductor/turnauth.js";
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
import { clearRunning, isQuitDraining, isTaskRunning, markRunning, runningDirs, runRefusal } from "./rungate.js";
import { runtimeWorkerIdentity } from "./workeridentity.js";

const controllers = new Map<string, AbortController>();
const settlements = new Map<string, Promise<unknown>>();
const sessions = new Map<string, RunSessionSnapshot>();
const routeGenerations = new Map<string, number>();
const previews = new Map<string, PendingPreview>();
const starting = new Set<string>();

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DIRECT_TASK_TOO_LONG = "TASK_REQUEST_TOO_LONG: Keep a direct task request to 2,000 characters or fewer.";
const DIRECT_TASK_INVALID = "Describe one visible outcome using at least five non-whitespace characters.";
const PREVIEW_STALE = "TASK_PREVIEW_STALE: That dispatch review is no longer current. Review the task again.";
const PROPOSAL_STALE = "TASK_PROPOSAL_STALE: That proposed task is no longer current.";
const PROPOSAL_RISKS = "TASK_PROPOSAL_HAS_RISKS: Resolve or set aside every current risk before reviewing dispatch.";
const ROUTE_CHANGED = "TASK_ROUTE_CHANGED: The selected worker changed while you were deciding. Nothing was started.";
const REAL_CALL_NOT_AUTHORIZED = "REAL_MODEL_CALL_NOT_AUTHORIZED: Confirm the displayed provider, model, project, data scope, and quota before starting.";

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
}>;

/** Read-only runtime projection for workspace and IPC assembly. IPC callers
 * receive a structured clone; main-process callers must treat it as immutable. */
export function currentTaskSession(dir: string): RunSessionSnapshot | null {
  return sessions.get(dir) ?? null;
}

/** Quit protection: name live runs, cancel them, and await their fail-closed close. */
export function activeTaskRuns(): { dirs: string[]; cancelAll(): void; settled(): Promise<void> } {
  return {
    dirs: runningDirs(),
    cancelAll() {
      for (const controller of controllers.values()) controller.abort();
    },
    async settled() {
      await Promise.allSettled([...settlements.values()]);
    },
  };
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
  const request = exactRecord(value, ["dir", "previewId"], ["realCallConfirmed", "disclosure"]);
  if (!request || typeof request.dir !== "string" || request.dir.length === 0 || request.dir.length > 32_767 ||
      typeof request.previewId !== "string" || !UUID_V4.test(request.previewId)) return null;
  if (request.realCallConfirmed !== undefined && typeof request.realCallConfirmed !== "boolean") return null;
  const disclosure = checkedDisclosure(request.disclosure);
  if (disclosure === null) return null;
  return {
    dir: request.dir,
    previewId: request.previewId,
    ...(request.realCallConfirmed === true ? { realCallConfirmed: true } : {}),
    ...(disclosure === undefined ? {} : { disclosure }),
  };
}

function nextGeneration(key: string): number {
  const generation = (routeGenerations.get(key) ?? 0) + 1;
  routeGenerations.set(key, generation);
  previews.delete(key);
  return generation;
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

function evidenceTitle(outcome: string): string {
  return outcome.replace(/\s+/g, " ").trim().slice(0, 500);
}

export function registerTaskIpc(win: () => BrowserWindow | null): void {
  const mock = process.env.CAIRN_MOCK === "1";

  unsubscribeProposalChanges?.();
  unsubscribeProposalChanges = onTaskProposalChanged(invalidateProjectPreview);

  ipcMain.handle("task:route", async (_event, unsafeRequest: unknown) => {
    const request = checkedRouteRequest(unsafeRequest);
    if (request === null) return { ok: false, message: "TASK_ROUTE_INVALID: Cairn refused a malformed route request." } satisfies Result<never>;
    const { dir, source, adapterId } = request;
    try {
      const status = projectStatus(dir);
      if (status.legacyState) throw new Error("LEGACY_STATE_PRESENT: Legacy Cairn runtime state was preserved unchanged. Migrate it safely before starting another task.");
      const key = canonicalProjectKey(dir);
      const refusal = runRefusal(isTaskRunning(dir) || starting.has(key), isQuitDraining());
      if (refusal) return { ok: false, message: refusal } satisfies Result<never>;
      const generation = nextGeneration(key);

      let intent: TaskIntent | null = null;
      if (source.kind === "manual") {
        if (source.rawOutcome.length > 2_000) return { ok: false, message: DIRECT_TASK_TOO_LONG } satisfies Result<never>;
        intent = createDirectTaskIntent(source.rawOutcome, randomUUID());
        if (intent === null) return { ok: false, message: DIRECT_TASK_INVALID } satisfies Result<never>;
      } else {
        const current = currentTaskProposal(dir, source.conversationId, source.proposalId);
        if (current === null) return { ok: false, message: PROPOSAL_STALE } satisfies Result<never>;
        if (current.unresolvedRisks !== 0) return { ok: false, message: PROPOSAL_RISKS } satisfies Result<never>;
        intent = current.intent;
      }

      const detected = await detectedAdapters(mock, dir);
      if (routeGenerations.get(key) !== generation) return { ok: false, message: PREVIEW_STALE } satisfies Result<never>;
      if (source.kind === "proposal") {
        const current = currentTaskProposal(dir, source.conversationId, source.proposalId);
        if (current === null || current.unresolvedRisks !== 0 || current.intent !== intent) {
          nextGeneration(key);
          return { ok: false, message: PROPOSAL_STALE } satisfies Result<never>;
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
      });
      if (routeGenerations.get(key) !== generation) return { ok: false, message: PREVIEW_STALE } satisfies Result<never>;
      previews.set(key, pending);
      return {
        ok: true,
        value: {
          previewId,
          request: projection,
          context: [...intent.context],
          route: value,
          ...(disclosure === undefined ? {} : { disclosure }),
        },
      };
    } catch (error) {
      logError("task:route", error);
      return { ok: false, message: plainMessage(error) };
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
    const refusal = runRefusal(isTaskRunning(dir) || starting.has(key), isQuitDraining());
    if (refusal) return { ok: false, message: refusal } satisfies Result<never>;

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
    if (pending.source.kind === "proposal") {
      let current: ReturnType<typeof currentTaskProposal>;
      try {
        current = currentTaskProposal(dir, pending.source.conversationId, pending.source.proposalId);
      } catch (error) {
        logError("task:run proposal recheck", error);
        return refuseBeforeAcceptance(PROPOSAL_STALE);
      }
      if (current === null || current.unresolvedRisks !== 0 || current.intent !== pending.intent) {
        return refuseBeforeAcceptance(PROPOSAL_STALE);
      }
    }
    let detected: Awaited<ReturnType<typeof detectedAdapters>>;
    try {
      detected = await detectedAdapters(mock, dir, realCallConfirmed === true ? pending.intent : undefined);
    } catch (error) {
      logError("task:run", error);
      return refuseBeforeAcceptance(plainMessage(error));
    }

    if (previews.get(key) !== pending || routeGenerations.get(key) !== pending.generation) {
      return { ok: false, message: PREVIEW_STALE } satisfies Result<never>;
    }
    if (isQuitDraining()) {
      return refuseBeforeAcceptance(runRefusal(false, true) ?? "QUIT_IN_PROGRESS");
    }
    if (pending.source.kind === "proposal") {
      let current: ReturnType<typeof currentTaskProposal>;
      try {
        current = currentTaskProposal(dir, pending.source.conversationId, pending.source.proposalId);
      } catch (error) {
        logError("task:run proposal recheck", error);
        return refuseBeforeAcceptance(PROPOSAL_STALE);
      }
      if (current === null || current.unresolvedRisks !== 0 || current.intent !== pending.intent) {
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
      if (consumed === null || consumed.intent !== pending.intent) {
        return refuseBeforeAcceptance(PROPOSAL_STALE);
      }
    } else {
      previews.delete(key);
    }

    const outcome = pending.request.outcome.text;
    const conversationId = pending.source.kind === "proposal" ? pending.source.conversationId : null;
    const routedAdapterId = pending.adapter.id;
    const routedWorker = pending.worker;
    let controller: AbortController;
    let evidenceRunId: string | null;
    let evidenceWindow: StageCaptureWindow | null;
    try {
      controller = new AbortController();
      markRunning(dir);
      controllers.set(dir, controller);
      evidenceRunId = routedWorker ? randomUUID() : null;
      evidenceWindow = evidenceRunId === null ? null : win();
      sessions.set(dir, {
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
      });
    } catch (error) {
      starting.delete(key);
      clearRunning(dir);
      controllers.delete(dir);
      logError("task:run accepted setup", error);
      const message = plainMessage(error);
      try {
        sessions.set(dir, {
          dir, outcome, acceptedPreviewId: previewId, request: pending.request, adapterId: routedAdapterId, conversationId,
          worker: routedWorker, startedAt: new Date().toISOString(), activities: [],
          phase: "closed", result: null, error: message, evidenceRunId: null,
        });
      } catch {
        // Memory exhaustion can also prevent the retained error projection.
      }
      return { ok: false, message } satisfies Result<never>;
    }
    // Evidence exists only for a real routed worker. Bind both pictures to the
    // BrowserWindow that showed the accepted project; a replacement window or
    // a switched project fails the capture helper's identity check.
    let evidenceCaptureCount = 0;
    let cardEvidenceRunId: string | null = null;

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
      const session = sessions.get(dir);
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
          events: {
            onActivity: (activity) => {
              sessions.get(dir)?.activities.push(activity);
              const payload: TaskActivityEvent = { dir, activity };
              win()?.webContents.send("task:activity", payload);
            },
          },
        });
        const safeValue = value.status === "connection-required" && detected.status
          ? { ...value, route: { ...value.route, reason: connectionRequiredReason(detected.status) } }
          : value;
        const session = sessions.get(dir);
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
        const session = sessions.get(dir);
        if (session) { session.phase = "closed"; session.error = plainMessage(error); }
        await finishEvidence("error", "ERROR", null);
        return { ok: false, message: plainMessage(error) };
      } finally {
        starting.delete(key);
        clearRunning(dir);
        controllers.delete(dir);
        settlements.delete(dir);
      }
    })();
    settlements.set(dir, run);
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
      const post = (build: () => ResultCard): void => {
        let posted: ResultCard | null = null;
        try {
          const card = build();
          const turn = postResultCard(dir, conversationId, card);
          const delta: ConductorDelta = { dir, conversationId, kind: "envelope", turn };
          win()?.webContents.send("conductor:delta", delta);
          emitBridgeSync(); // a watching phone refreshes on the card too
          posted = card;
        } catch (error) {
          // The card is an addition to a run that already closed and already
          // wrote its own records. A failure to write it is logged and never
          // allowed to change what the run reported.
          logError("task:run result card", error);
        }
        // Task 9: the card is written and announced; now — and only now — the
        // conductor may add one short comment on it. The order is the point.
        // This is an envelope-initiated PAID call, so it comes strictly after
        // the card, never before and never in its way: `commentary` returns
        // immediately, and it skips silently when there is no connection, when
        // a reply is already streaming for this project, or when a new run has
        // started meanwhile. A card that failed to post is not commented on at
        // all — there would be nothing above for the comment to be about.
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
      void run.then(
        (outcome) => post(() => (outcome.ok
          ? composeResultCard(outcome.value, cardEvidenceRunId)
          : composeErrorCard(outcome.message, cardEvidenceRunId))),
        // Unreachable by construction — the closure above catches everything
        // and returns a refusal. It is still handled, so that no terminal state
        // can go unspoken and no rejection can escape unhandled.
        (error: unknown) => post(() => composeErrorCard(plainMessage(error), cardEvidenceRunId)),
      );
    }
    return run;
    } catch (error) {
      // This is the final fail-closed net around every service/adapter getter
      // and consume operation after acquiring the gate. Once the run promise
      // owns cleanup, its own catch/finally remains authoritative.
      if (!acceptedRunOwnsGate) {
        invalidateMatchedPreview?.();
        clearRunning(dir);
        controllers.delete(dir);
        settlements.delete(dir);
        const session = sessions.get(dir);
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
    const controller = controllers.get(dir);
    if (!controller) return { ok: false, message: "No task is running for this project." };
    controller.abort();
    return { ok: true, value: null };
  });

  ipcMain.handle("task:current", (_event, dir: string): RunSessionSnapshot | null => sessions.get(dir) ?? null);

  ipcMain.handle("task:acknowledge", (_event, dir: string): Result<null> => {
    const session = sessions.get(dir);
    // A closed session becomes visible just before terminal capture. Keep its
    // run identity until that bounded settlement finishes; an eager click on
    // "Return" cannot erase the proof between capture's two identity checks.
    if (session && session.phase === "closed" && !isTaskRunning(dir)) sessions.delete(dir);
    return { ok: true, value: null };
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
