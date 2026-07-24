import { ipcMain, type BrowserWindow } from "electron";
import {
  authorizeCodexExec,
  codexExecDisclosure,
  codexExecConnectionReason,
  createCodexExecAdapter,
  createOfflineDemoAdapter,
  detectCodexExecStatus,
  previewSerialRoute,
  projectStatus,
  runSerialTask,
  type CodexExecStatus,
  type TaskAdapter,
  type WorkerDisclosure,
} from "@cairn/core";
import type { Result, RunSessionSnapshot, TaskActivityEvent } from "../shared/ipc.js";
import { logError, plainMessage } from "./log.js";

const running = new Set<string>();
const controllers = new Map<string, AbortController>();
const settlements = new Map<string, Promise<unknown>>();
const sessions = new Map<string, RunSessionSnapshot>();

/** True while a serial task is running for `dir`. Lets other main-side
 * gates (the conductor's send gate) share this one running-set instead of
 * tracking their own. */
export function isTaskRunning(dir: string): boolean {
  return running.has(dir);
}

/** Quit protection: name live runs, cancel them, and await their fail-closed close. */
export function activeTaskRuns(): { dirs: string[]; cancelAll(): void; settled(): Promise<void> } {
  return {
    dirs: [...running],
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

async function detectedAdapters(mock: boolean, dir: string, authorizedOutcome?: string): Promise<{ adapters: TaskAdapter[]; status?: CodexExecStatus }> {
  if (mock) return { adapters: adapters(true) };
  const status = await detectCodexExecStatus(dir);
  return {
    adapters: [createCodexExecAdapter(dir, status, authorizedOutcome ? authorizeCodexExec(dir, authorizedOutcome) : undefined)],
    status,
  };
}

export function registerTaskIpc(win: () => BrowserWindow | null): void {
  const mock = process.env.CAIRN_MOCK === "1";

  ipcMain.handle("task:route", async (_event, dir: string, outcome: string, adapterId?: string) => {
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
          disclosure: routed?.disclosure?.(outcome),
        },
      };
    } catch (error) {
      logError("task:route", error);
      return { ok: false, message: plainMessage(error) };
    }
  });

  ipcMain.handle("task:run", async (_event, dir: string, outcome: string, adapterId?: string, realCallConfirmed?: boolean, disclosure?: WorkerDisclosure) => {
    if (running.has(dir)) return { ok: false, message: "SERIAL_RUN_ACTIVE: One task is already running for this project." } satisfies Result<never>;
    if (!mock && (realCallConfirmed !== true || !sameDisclosure(disclosure, codexExecDisclosure(dir, outcome)))) {
      return { ok: false, message: "REAL_MODEL_CALL_NOT_AUTHORIZED: Confirm the displayed provider, model, project, data scope, and quota before starting." } satisfies Result<never>;
    }
    const controller = new AbortController();
    running.add(dir);
    controllers.set(dir, controller);
    sessions.set(dir, { dir, outcome, worker: realCallConfirmed === true, startedAt: new Date().toISOString(), activities: [], phase: "running", result: null, error: null });
    const run = (async () => {
      try {
        const detected = await detectedAdapters(mock, dir, realCallConfirmed === true ? outcome : undefined);
        const value = await runSerialTask(dir, outcome, {
          adapters: detected.adapters,
          adapterId,
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
        running.delete(dir);
        controllers.delete(dir);
        settlements.delete(dir);
      }
    })();
    settlements.set(dir, run);
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
