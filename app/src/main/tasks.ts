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
  type CodexExecDisclosure,
  type TaskAdapter,
} from "@cairn/core";
import type { Result, TaskActivityEvent } from "../shared/ipc.js";
import { logError, plainMessage } from "./log.js";

const running = new Set<string>();

/** True while a serial task is running for `dir`. Lets other main-side
 * gates (the conductor's send gate) share this one running-set instead of
 * tracking their own. */
export function isTaskRunning(dir: string): boolean {
  return running.has(dir);
}

function sameDisclosure(actual: CodexExecDisclosure | undefined, expected: CodexExecDisclosure): boolean {
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
      return {
        ok: true,
        value: {
          route: value,
          disclosure: value.status === "ready" && value.recommended.id === "codex-exec"
            ? codexExecDisclosure(dir, outcome)
            : undefined,
        },
      };
    } catch (error) {
      logError("task:route", error);
      return { ok: false, message: plainMessage(error) };
    }
  });

  ipcMain.handle("task:run", async (_event, dir: string, outcome: string, sessionId: number, adapterId?: string, realCallConfirmed?: boolean, disclosure?: CodexExecDisclosure) => {
    if (running.has(dir)) return { ok: false, message: "SERIAL_RUN_ACTIVE: One task is already running for this project." } satisfies Result<never>;
    if (!mock && (realCallConfirmed !== true || !sameDisclosure(disclosure, codexExecDisclosure(dir, outcome)))) {
      return { ok: false, message: "REAL_MODEL_CALL_NOT_AUTHORIZED: Confirm the displayed provider, model, project, data scope, and quota before starting." } satisfies Result<never>;
    }
    running.add(dir);
    try {
      const detected = await detectedAdapters(mock, dir, realCallConfirmed === true ? outcome : undefined);
      const value = await runSerialTask(dir, outcome, {
        adapters: detected.adapters,
        adapterId,
        events: {
          onActivity: (activity) => {
            const payload: TaskActivityEvent = { dir, sessionId, activity };
            win()?.webContents.send("task:activity", payload);
          },
        },
      });
      const safeValue = value.status === "connection-required" && detected.status
        ? { ...value, route: { ...value.route, reason: codexExecConnectionReason(detected.status) } }
        : value;
      return { ok: true, value: safeValue };
    } catch (error) {
      logError("task:run", error);
      return { ok: false, message: plainMessage(error) };
    } finally {
      running.delete(dir);
    }
  });
}
