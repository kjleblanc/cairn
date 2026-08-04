import { ipcMain, type BrowserWindow } from "electron";
import { randomUUID } from "node:crypto";
import {
  previewSerialRoute,
  projectStatus,
  runSerialTask,
  type SerialRunResult,
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
  TaskRunRequest,
} from "../shared/ipc.js";
import { composeErrorCard, composeResultCard, postResultCard } from "./conductor/relay.js";
import { commentary, consumeProposal, restoreProposal } from "./conductor/service.js";
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

function evidenceTitle(outcome: string): string {
  return outcome.replace(/\s+/g, " ").trim().slice(0, 500);
}

export function registerTaskIpc(win: () => BrowserWindow | null): void {
  const mock = process.env.CAIRN_MOCK === "1";

  ipcMain.handle("task:route", async (_event, dir: string, outcome: string, details: string, adapterId?: string) => {
    try {
      const status = projectStatus(dir);
      if (status.legacyState) throw new Error("LEGACY_STATE_PRESENT: Legacy Cairn runtime state was preserved unchanged. Migrate it safely before starting another task.");
      const detected = await detectedAdapters(mock, dir);
      const route = previewSerialRoute(outcome, detected.adapters, adapterId);
      const value = route.status === "connection-required" && detected.status
        ? { ...route, reason: connectionRequiredReason(detected.status) }
        : route;
      // The disclosure comes from the ROUTED adapter's own seam, not a codex-only
      // ternary: any adapter that makes a real call declares its own six facts,
      // and an offline (no-disclosure) adapter simply returns undefined.
      const routed = value.status === "ready"
        ? detected.adapters.find((adapter) => adapter.descriptor.id === value.recommended.id)
        : undefined;
      return {
        ok: true,
        value: {
          route: value,
          // Both parts, always: the card the owner reads names the details it
          // will send, so a confirmation can never cover less than the request.
          disclosure: routed?.disclosure?.(outcome, details ?? ""),
        },
      };
    } catch (error) {
      logError("task:route", error);
      return { ok: false, message: plainMessage(error) };
    }
  });

  ipcMain.handle("task:run", async (_event, request: TaskRunRequest) => {
    const { dir, outcome, adapterId, realCallConfirmed, disclosure } = request;
    const details = request.details ?? "";
    const refusal = runRefusal(isTaskRunning(dir), isQuitDraining());
    if (refusal) return { ok: false, message: refusal } satisfies Result<never>;
    // Register the live session BEFORE the (single) detection so a reattach can
    // always find the run, then detect once and reuse those adapters for both
    // the disclosure gate and the run — a second detection would delay this
    // registration and let a fast reattach miss the running session.
    const controller = new AbortController();
    markRunning(dir);
    controllers.set(dir, controller);
    sessions.set(dir, {
      dir,
      outcome,
      // Request fields are not runtime identity. Detection below names the
      // adapter that actually won the route and whether it owns a real-call
      // disclosure seam before any Run activity can reach the renderer.
      adapterId: null,
      conversationId: request.conversationId ?? null,
      worker: false,
      startedAt: new Date().toISOString(),
      activities: [],
      phase: "running",
      result: null,
      error: null,
    });
    const cleanup = (): void => { clearRunning(dir); controllers.delete(dir); sessions.delete(dir); };
    // The run-time disclosure gate follows the ROUTED adapter's own seam, not a
    // codex-pinned check: resolve the route exactly as task:route does and take
    // the expected disclosure from that adapter. A real worker adapter (codex)
    // exposes disclosure() and must be confirmed with a byte-matching disclosure;
    // a demo (no-disclosure) adapter returns undefined and needs no confirmation.
    let detected: Awaited<ReturnType<typeof detectedAdapters>>;
    let expected: WorkerDisclosure | undefined;
    let routedAdapterId: string | null = null;
    let routedWorker = false;
    let routeReady = false;
    try {
      detected = await detectedAdapters(mock, dir, realCallConfirmed === true ? { outcome, details } : undefined);
      const preview = previewSerialRoute(outcome, detected.adapters, adapterId);
      routeReady = preview.status === "ready";
      const routed = preview.status === "ready"
        ? detected.adapters.find((adapter) => adapter.descriptor.id === preview.recommended.id)
        : undefined;
      const identity = runtimeWorkerIdentity(routed);
      routedAdapterId = identity.adapterId;
      routedWorker = identity.worker;
      expected = routed?.disclosure?.(outcome, details);
    } catch (error) {
      cleanup();
      logError("task:run", error);
      return { ok: false, message: plainMessage(error) } satisfies Result<never>;
    }
    if (expected && (realCallConfirmed !== true || !sameDisclosure(disclosure, expected))) {
      cleanup();
      return { ok: false, message: "REAL_MODEL_CALL_NOT_AUTHORIZED: Confirm the displayed provider, model, project, data scope, and quota before starting." } satisfies Result<never>;
    }
    // Evidence exists only for a real routed worker. Bind both pictures to the
    // BrowserWindow that showed the accepted project; a replacement window or
    // a switched project fails the capture helper's identity check.
    const evidenceRunId = routeReady && routedWorker ? randomUUID() : null;
    const evidenceWindow: StageCaptureWindow | null = evidenceRunId === null ? null : win();
    let evidenceCaptureCount = 0;
    let cardEvidenceRunId: string | null = null;
    const acceptedSession = sessions.get(dir);
    if (acceptedSession) {
      acceptedSession.adapterId = routedAdapterId;
      acceptedSession.worker = routedWorker;
      acceptedSession.evidenceRunId = evidenceRunId;
    }
    // Main has now accepted the run. Retire only a byte-matching proposal from
    // the same conversation before any task work begins, so a remounted Chat
    // cannot resurrect a spent dispatch card even if result-card posting later
    // fails. Refusals above deliberately leave it actionable.
    const consumedProposal = routeReady && request.conversationId
      ? consumeProposal(dir, request.conversationId, outcome, details)
      : null;
    const restoreConsumedProposal = (): void => {
      if (consumedProposal !== null && request.conversationId) {
        restoreProposal(dir, request.conversationId, consumedProposal);
      }
    };

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
        const value = await runSerialTask(dir, outcome, {
          adapters: detected.adapters,
          adapterId,
          details,
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
        // A route that closed before any task started is still the same
        // actionable proposal. This is defensive when the earlier preview was
        // ready but the run-time result says the connection changed.
        if (safeValue.status === "connection-required") restoreConsumedProposal();
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
        // The renderer keeps the proposal available when main returns a run
        // error, so trusted main state must make the same retry possible after
        // a remount.
        restoreConsumedProposal();
        logError("task:run", error);
        const session = sessions.get(dir);
        if (session) { session.phase = "closed"; session.error = plainMessage(error); }
        await finishEvidence("error", "ERROR", null);
        return { ok: false, message: plainMessage(error) };
      } finally {
        clearRunning(dir);
        controllers.delete(dir);
        settlements.delete(dir);
      }
    })();
    settlements.set(dir, run);
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
    const conversationId = request.conversationId ?? null;
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
