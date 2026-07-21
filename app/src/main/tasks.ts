import { ipcMain, type BrowserWindow } from "electron";
import {
  createOfflineDemoAdapter,
  previewSerialRoute,
  projectStatus,
  runSerialTask,
  type TaskAdapter,
} from "@cairn/core";
import type { Result, TaskActivityEvent } from "../shared/ipc.js";
import { logError, plainMessage } from "./log.js";

const running = new Set<string>();

function adapters(mock: boolean): TaskAdapter[] {
  return mock ? [createOfflineDemoAdapter()] : [];
}

function sync<T>(context: string, operation: () => T): Result<T> {
  try { return { ok: true, value: operation() }; }
  catch (error) {
    logError(context, error);
    return { ok: false, message: plainMessage(error) };
  }
}

export function registerTaskIpc(win: () => BrowserWindow | null): void {
  const mock = process.env.CAIRN_MOCK === "1";

  ipcMain.handle("task:route", (_event, dir: string, outcome: string, adapterId?: string) =>
    sync("task:route", () => {
      const status = projectStatus(dir);
      if (status.legacyState) throw new Error("LEGACY_STATE_PRESENT: Legacy Cairn runtime state was preserved unchanged. Migrate it safely before starting another task.");
      return previewSerialRoute(outcome, adapters(mock), adapterId);
    }));

  ipcMain.handle("task:run", async (_event, dir: string, outcome: string, sessionId: number, adapterId?: string) => {
    if (running.has(dir)) return { ok: false, message: "SERIAL_RUN_ACTIVE: One task is already running for this project." } satisfies Result<never>;
    running.add(dir);
    try {
      const value = await runSerialTask(dir, outcome, {
        adapters: adapters(mock),
        adapterId,
        events: {
          onActivity: (activity) => {
            const payload: TaskActivityEvent = { dir, sessionId, activity };
            win()?.webContents.send("task:activity", payload);
          },
        },
      });
      return { ok: true, value };
    } catch (error) {
      logError("task:run", error);
      return { ok: false, message: plainMessage(error) };
    } finally {
      running.delete(dir);
    }
  });
}
