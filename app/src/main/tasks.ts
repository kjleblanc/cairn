import { ipcMain, type BrowserWindow } from "electron";
import {
  approveBrief, buildTask, closeTask, createDisposableSchedulerProof, defineTask, integrateNext, parallelDraftEnabled, passiveSchedulerDraftEnabled, pickEngine, recoverPassiveScheduledBatch, recoverScheduledBatch, refineBrief, resolveEffort, resolveModel, reviewTask, runDirectionCheck, schedulerSummary, startPassiveScheduledBatch, startScheduledBatch,
  type CloseInput, type Engine, type OwnerQuestion, type RunEvents, type SchedulerSummary,
} from "@cairn/core";
import type { EngineEvent, Result } from "../shared/ipc.js";
import { logError, plainMessage } from "./log.js";

/**
 * In mock (demo) mode only: an UNTOUCHED question card skips itself after this
 * long, so an unattended demo run always finishes on its own. The card cancels
 * this the moment the owner touches it — a typing owner is never cut off.
 * Real runs have no self-skip — the question waits for the owner, and the Skip
 * button (or closing the window) is always there to release it.
 */
const MOCK_ASK_AUTOSKIP_MS = 10_000;

/**
 * In mock (demo) mode only: the main process's last-resort backstop, generous
 * on purpose — it exists so a demo run still finishes even if the question
 * card never renders at all. The card's own self-skip above is what ends the
 * normal unattended case long before this fires.
 */
const MOCK_ASK_PATIENCE_MS = 180_000;

/** One agent at a time — the loop is sequential by design. */
const running = new Set<string>();

async function exclusive<T>(context: string, key: string, parallel: boolean, fn: () => Promise<T>): Promise<Result<T>> {
  if ((!parallel && running.size > 0) || running.has(key)) {
    return { ok: false, message: "One step at a time — an agent is already running." };
  }
  running.add(key);
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    logError(context, err);
    return { ok: false, message: plainMessage(err) };
  } finally {
    running.delete(key);
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

function forward(win: () => BrowserWindow | null, role: string, sessionId: number, taskNumber?: number): RunEvents {
  const send = (ev: EngineEvent) => win()?.webContents.send("engine:event", ev);
  return {
    onText: (t) => { if (t.trim()) send({ role, kind: "text", text: t, sessionId, taskNumber }); },
    onTool: (name, detail) => send({ role, kind: "tool", text: `${name}: ${detail}`, sessionId, taskNumber }),
    onDenied: (name, why) => send({ role, kind: "denied", text: `${name} — ${why}`, sessionId, taskNumber }),
  };
}

export function registerTaskIpc(win: () => BrowserWindow | null): void {
  const mock = process.env.CAIRN_MOCK === "1";
  const parallel = parallelDraftEnabled();
  // The engine is rebuilt when the owner picks a model or effort in Settings; every
  // handler reads this binding at call time, so the next run uses the chosen values.
  let chosenModel = "";
  let chosenEffort = "";
  let engine: Engine = pickEngine(mock);
  const rebuild = () => { engine = pickEngine(mock, chosenModel, chosenEffort); };

  // ---- The ask-the-owner bridge: a definer question crosses to the renderer as
  // an "engine:ask" event; the renderer's answer (or skip) comes back through
  // "task:answer" and releases the waiting run. If the window dies — or, in mock
  // mode, nobody answers in time — the question resolves as a skip, never a hang.
  const pendingAnswers = new Map<number, (answer: string | null) => void>();
  let nextQuestionId = 0;

  const askOwnerViaWindow = (sessionId: number) => (q: OwnerQuestion): Promise<string | null> =>
    new Promise((resolve) => {
      const w = win();
      if (!w || w.webContents.isDestroyed()) { resolve(null); return; }
      const id = ++nextQuestionId;
      const finish = (answer: string | null) => { if (pendingAnswers.delete(id)) resolve(answer); };
      pendingAnswers.set(id, finish);
      w.webContents.send("engine:ask", {
        id, question: q.question, asked: q.asked, limit: q.limit, sessionId,
        ...(mock ? { autoSkipMs: MOCK_ASK_AUTOSKIP_MS } : {}),
      });
      w.webContents.once("destroyed", () => finish(null));
      if (mock) setTimeout(() => finish(null), MOCK_ASK_PATIENCE_MS);
    });

  ipcMain.handle("task:answer", (_e, id: number, answer: string | null) => {
    const finish = pendingAnswers.get(id);
    finish?.(typeof answer === "string" && answer.trim() ? answer.trim() : null);
    return null;
  });

  ipcMain.handle("task:define", (_e, dir: string, outcome: string, sessionId: number) =>
    exclusive("task:define", `define:${dir}`, parallel, async () => {
      const r = await defineTask(dir, outcome, engine, { ...forward(win, "definer", sessionId), onAsk: askOwnerViaWindow(sessionId) });
      return { taskNumber: r.taskNumber, briefText: r.briefText, costUsd: r.costUsd, coordinatorTask: r.coordinatorTask };
    }));

  // A pre-approval round on the brief: answer the owner's question or revise the
  // file. Core refuses this the moment an approval is on file, so the hash gate
  // keeps its exact meaning. No ask channel here — one question box at a time.
  ipcMain.handle("task:refine", (_e, dir: string, taskNumber: number, message: string, sessionId: number) =>
    exclusive("task:refine", `task:${dir}:${taskNumber}`, parallel, async () => {
      const r = await refineBrief(dir, taskNumber, message, engine, forward(win, "definer", sessionId, taskNumber));
      return { briefText: r.briefText, briefChanged: r.briefChanged, reply: r.reply, costUsd: r.costUsd };
    }));

  ipcMain.handle("task:approve", (_e, dir: string, taskNumber: number) =>
    sync("task:approve", () => ({ briefSha256: approveBrief(dir, taskNumber).briefSha256 })));

  ipcMain.handle("task:build", (_e, dir: string, taskNumber: number, sessionId: number) =>
    exclusive("task:build", `task:${dir}:${taskNumber}`, parallel, async () => {
      const r = await buildTask(dir, taskNumber, engine, forward(win, "builder", sessionId, taskNumber));
      return { reportText: r.reportText, disposition: r.disposition, costUsd: r.costUsd };
    }));

  ipcMain.handle("task:review", (_e, dir: string, taskNumber: number, sessionId: number) =>
    exclusive("task:review", `task:${dir}:${taskNumber}`, parallel, async () => {
      const r = await reviewTask(dir, taskNumber, engine, forward(win, "reviewer", sessionId, taskNumber));
      return { text: r.text, finalVerdict: r.finalVerdict, costUsd: r.costUsd };
    }));

  ipcMain.handle("task:close", (_e, dir: string, taskNumber: number, input: CloseInput, _sessionId: number) =>
    exclusive("task:close", `integration:${dir}`, parallel, async () => {
      const row = closeTask(dir, taskNumber, input);
      if (parallel) integrateNext(dir);
      return row;
    }));

  ipcMain.handle("task:direction", (_e, dir: string, reason: string) =>
    exclusive("task:direction", `direction:${dir}`, parallel, () => runDirectionCheck(dir, reason, engine, forward(win, "direction", 0))));

  // Task 029's Draft creates its disposable proof project inside the same owner
  // action. The selected project is only the place from which the owner opens
  // this screen; neither planner nor builder receives that valuable path.
  ipcMain.handle("scheduler:start", (_e, dir: string, outcomes: string[], sessionId: number) =>
    exclusive("scheduler:start", `scheduler:${dir}`, false, async () => {
      if (passiveSchedulerDraftEnabled() && !mock) throw new Error("The passive Experimental Draft runs only with Cairn's offline mock engine.");
      const proof = passiveSchedulerDraftEnabled() ? createDisposableSchedulerProof() : null;
      const sendState = (summary: SchedulerSummary) =>
        win()?.webContents.send("scheduler:state", { dir, proofDir: proof?.root ?? dir, sessionId, summary });
      const engineFactory = () => pickEngine(mock, chosenModel, chosenEffort);
      const events = {
        onState: sendState,
        engineEvents: (taskNumber: number, stage: "planning" | "building") => forward(win, stage === "planning" ? "planner" : "builder", sessionId, taskNumber),
      };
      const summary = proof
        ? await startPassiveScheduledBatch(proof, outcomes, engineFactory, events)
        : await startScheduledBatch(dir, outcomes, engineFactory, events);
      return { proofDir: proof?.root ?? dir, summary };
    }));

  ipcMain.handle("scheduler:status", (_e, dir: string) => sync("scheduler:status", () => schedulerSummary(dir)));
  ipcMain.handle("scheduler:recover", (_e, dir: string) => sync("scheduler:recover", () =>
    passiveSchedulerDraftEnabled() ? recoverPassiveScheduledBatch(dir) : recoverScheduledBatch(dir)));

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
