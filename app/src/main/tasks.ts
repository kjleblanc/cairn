import { ipcMain, type BrowserWindow } from "electron";
import {
  approveBrief, buildTask, closeTask, defineTask, pickEngine, resolveEffort, resolveModel, reviewTask, runDirectionCheck,
  type CloseInput, type Engine, type RunEvents,
} from "@cairn/core";
import type { EngineEvent, Result } from "../shared/ipc.js";
import { logError, plainMessage } from "./log.js";

/** One agent at a time — the loop is sequential by design. */
let busy = false;

async function exclusive<T>(context: string, fn: () => Promise<T>): Promise<Result<T>> {
  if (busy) return { ok: false, message: "One step at a time — an agent is already running." };
  busy = true;
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    logError(context, err);
    return { ok: false, message: plainMessage(err) };
  } finally {
    busy = false;
  }
}

function sync<T>(context: string, fn: () => T): Result<T> {
  try {
    return { ok: true, value: fn() };
  } catch (err) {
    logError(context, err);
    return { ok: false, message: plainMessage(err) };
  }
}

function forward(win: () => BrowserWindow | null, role: string): RunEvents {
  const send = (ev: EngineEvent) => win()?.webContents.send("engine:event", ev);
  return {
    onText: (t) => { if (t.trim()) send({ role, kind: "text", text: t }); },
    onTool: (name, detail) => send({ role, kind: "tool", text: `${name}: ${detail}` }),
    onDenied: (name, why) => send({ role, kind: "denied", text: `${name} — ${why}` }),
  };
}

export function registerTaskIpc(win: () => BrowserWindow | null): void {
  const mock = process.env.CAIRN_MOCK === "1";
  // The engine is rebuilt when the owner picks a model or effort in Settings; every
  // handler reads this binding at call time, so the next run uses the chosen values.
  let chosenModel = "";
  let chosenEffort = "";
  let engine: Engine = pickEngine(mock);
  const rebuild = () => { engine = pickEngine(mock, chosenModel, chosenEffort); };

  ipcMain.handle("task:define", (_e, dir: string, outcome: string) =>
    exclusive("task:define", async () => {
      const r = await defineTask(dir, outcome, engine, forward(win, "definer"));
      return { taskNumber: r.taskNumber, briefText: r.briefText, costUsd: r.costUsd };
    }));

  ipcMain.handle("task:approve", (_e, dir: string, taskNumber: number) =>
    sync("task:approve", () => ({ briefSha256: approveBrief(dir, taskNumber).briefSha256 })));

  ipcMain.handle("task:build", (_e, dir: string, taskNumber: number) =>
    exclusive("task:build", async () => {
      const r = await buildTask(dir, taskNumber, engine, forward(win, "builder"));
      return { reportText: r.reportText, disposition: r.disposition, costUsd: r.costUsd };
    }));

  ipcMain.handle("task:review", (_e, dir: string, taskNumber: number) =>
    exclusive("task:review", async () => {
      const r = await reviewTask(dir, taskNumber, engine, forward(win, "reviewer"));
      return { text: r.text, finalVerdict: r.finalVerdict, costUsd: r.costUsd };
    }));

  ipcMain.handle("task:close", (_e, dir: string, taskNumber: number, input: CloseInput) =>
    sync("task:close", () => closeTask(dir, taskNumber, input)));

  ipcMain.handle("task:direction", (_e, dir: string, reason: string) =>
    exclusive("task:direction", () => runDirectionCheck(dir, reason, engine, forward(win, "direction"))));

  // Choose the model for the next run. A blank choice keeps today's default. The
  // renderer's saved effort rides along (see preload), so the app's one boot-time
  // call applies both choices.
  ipcMain.handle("task:setModel", (_e, model: string, effort?: string) => {
    chosenModel = model;
    if (typeof effort === "string") chosenEffort = effort;
    rebuild();
    return resolveModel(model);
  });

  // Choose the effort for the next run. Blank keeps today's behaviour: no effort sent.
  ipcMain.handle("task:setEffort", (_e, effort: string) => {
    chosenEffort = effort;
    rebuild();
    return resolveEffort(effort) ?? "default";
  });
}
