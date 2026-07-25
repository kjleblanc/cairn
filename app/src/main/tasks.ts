import { ipcMain, type BrowserWindow } from "electron";
import {
  authorizeCodexExec,
  codexExecConnectionReason,
  createCodexExecAdapter,
  createOfflineDemoAdapter,
  detectCodexExecStatus,
  previewSerialRoute,
  projectStatus,
  runSerialTask,
  type CodexExecStatus,
  type SerialRunResult,
  type TaskAdapter,
  type WorkerDisclosure,
} from "@cairn/core";
import type { ConductorDelta, Result, ResultCard, RunSessionSnapshot, TaskActivityEvent, TaskRunRequest } from "../shared/ipc.js";
import { composeErrorCard, composeResultCard, postResultCard } from "./conductor/relay.js";
import { logError, plainMessage } from "./log.js";
import { clearRunning, isQuitDraining, isTaskRunning, markRunning, runningDirs, runRefusal } from "./rungate.js";

const controllers = new Map<string, AbortController>();
const settlements = new Map<string, Promise<unknown>>();
const sessions = new Map<string, RunSessionSnapshot>();

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

function adapters(mock: boolean): TaskAdapter[] {
  return mock ? [createOfflineDemoAdapter()] : [];
}

/**
 * `authorized` names the WHOLE request the owner confirmed — outcome and
 * details together. The codex authorization gate re-derives its expected card
 * from both, so passing only the outcome here would refuse every
 * details-bearing dispatch.
 */
async function detectedAdapters(
  mock: boolean,
  dir: string,
  authorized?: { outcome: string; details: string },
): Promise<{ adapters: TaskAdapter[]; status?: CodexExecStatus }> {
  if (mock) return { adapters: adapters(true) };
  const status = await detectCodexExecStatus(dir);
  return {
    adapters: [createCodexExecAdapter(dir, status, authorized ? authorizeCodexExec(dir, authorized.outcome, authorized.details) : undefined)],
    status,
  };
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
        ? { ...route, reason: codexExecConnectionReason(detected.status) }
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
    sessions.set(dir, { dir, outcome, conversationId: request.conversationId ?? null, worker: realCallConfirmed === true, startedAt: new Date().toISOString(), activities: [], phase: "running", result: null, error: null });
    const cleanup = (): void => { clearRunning(dir); controllers.delete(dir); sessions.delete(dir); };
    // The run-time disclosure gate follows the ROUTED adapter's own seam, not a
    // codex-pinned check: resolve the route exactly as task:route does and take
    // the expected disclosure from that adapter. A real worker adapter (codex)
    // exposes disclosure() and must be confirmed with a byte-matching disclosure;
    // a demo (no-disclosure) adapter returns undefined and needs no confirmation.
    let detected: Awaited<ReturnType<typeof detectedAdapters>>;
    let expected: WorkerDisclosure | undefined;
    try {
      detected = await detectedAdapters(mock, dir, realCallConfirmed === true ? { outcome, details } : undefined);
      const preview = previewSerialRoute(outcome, detected.adapters, adapterId);
      const routed = preview.status === "ready"
        ? detected.adapters.find((adapter) => adapter.descriptor.id === preview.recommended.id)
        : undefined;
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
    const run: Promise<Result<SerialRunResult>> = (async () => {
      try {
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
          ? { ...value, route: { ...value.route, reason: codexExecConnectionReason(detected.status) } }
          : value;
        const session = sessions.get(dir);
        if (session) { session.phase = "closed"; session.result = safeValue; }
        return { ok: true, value: safeValue };
      } catch (error) {
        logError("task:run", error);
        const session = sessions.get(dir);
        if (session) { session.phase = "closed"; session.error = plainMessage(error); }
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
        try {
          const turn = postResultCard(dir, conversationId, build());
          const delta: ConductorDelta = { dir, conversationId, kind: "envelope", turn };
          win()?.webContents.send("conductor:delta", delta);
        } catch (error) {
          // The card is an addition to a run that already closed and already
          // wrote its own records. A failure to write it is logged and never
          // allowed to change what the run reported.
          logError("task:run result card", error);
        }
      };
      void run.then(
        (outcome) => post(() => (outcome.ok ? composeResultCard(outcome.value) : composeErrorCard(outcome.message))),
        // Unreachable by construction — the closure above catches everything
        // and returns a refusal. It is still handled, so that no terminal state
        // can go unspoken and no rejection can escape unhandled.
        (error: unknown) => post(() => composeErrorCard(plainMessage(error))),
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
    if (session && session.phase === "closed") sessions.delete(dir);
    return { ok: true, value: null };
  });
}
