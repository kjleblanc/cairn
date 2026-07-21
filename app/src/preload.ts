import { contextBridge, ipcRenderer } from "electron";
import type { CairnApi, EngineEvent, OwnerQuestionEvent, SchedulerStateEvent } from "./shared/ipc.js";

const api: CairnApi = {
  preflight: () => ipcRenderer.invoke("preflight:check"),
  projectList: () => ipcRenderer.invoke("project:list"),
  projectPickFolder: () => ipcRenderer.invoke("project:pickFolder"),
  projectOpen: (dir) => ipcRenderer.invoke("project:open", dir),
  projectInit: (input) => ipcRenderer.invoke("project:init", input),
  projectStatus: (dir) => ipcRenderer.invoke("project:status", dir),
  projectForget: (dir) => ipcRenderer.invoke("project:forget", dir),
  taskDefine: (dir, outcome, sessionId) => ipcRenderer.invoke("task:define", dir, outcome, sessionId),
  taskAnswer: (id, answer) => ipcRenderer.invoke("task:answer", id, answer),
  taskRefine: (dir, taskNumber, message, sessionId) => ipcRenderer.invoke("task:refine", dir, taskNumber, message, sessionId),
  taskApprove: (dir, taskNumber) => ipcRenderer.invoke("task:approve", dir, taskNumber),
  taskBuild: (dir, taskNumber, sessionId) => ipcRenderer.invoke("task:build", dir, taskNumber, sessionId),
  taskReview: (dir, taskNumber, sessionId) => ipcRenderer.invoke("task:review", dir, taskNumber, sessionId),
  taskClose: (dir, taskNumber, input, sessionId) => ipcRenderer.invoke("task:close", dir, taskNumber, input, sessionId),
  taskDirection: (dir, reason) => ipcRenderer.invoke("task:direction", dir, reason),
  schedulerStart: (dir, outcomes, sessionId) => ipcRenderer.invoke("scheduler:start", dir, outcomes, sessionId),
  schedulerStatus: (dir) => ipcRenderer.invoke("scheduler:status", dir),
  schedulerRecover: (dir) => ipcRenderer.invoke("scheduler:recover", dir),
  // The saved effort rides along with the model call, so the app's existing
  // boot-time taskSetModel(...) applies both saved choices with no extra boot
  // code. Guarded: if storage is unreachable, behaviour degrades to model-only,
  // exactly as before the effort setting existed.
  taskSetModel: (model) => {
    let savedEffort = "";
    try { savedEffort = window.localStorage.getItem("cairn-effort") ?? ""; } catch { /* model-only */ }
    return ipcRenderer.invoke("task:setModel", model, savedEffort);
  },
  taskSetEffort: (effort) => ipcRenderer.invoke("task:setEffort", effort),
  updateCheck: () => ipcRenderer.invoke("app:updateCheck"),
  openExternal: (url) => ipcRenderer.invoke("app:openExternal", url),
  onEngineEvent: (cb) => {
    const listener = (_e: unknown, ev: EngineEvent) => cb(ev);
    ipcRenderer.on("engine:event", listener as never);
    return () => ipcRenderer.removeListener("engine:event", listener as never);
  },
  onSchedulerState: (cb) => {
    const listener = (_e: unknown, ev: SchedulerStateEvent) => cb(ev);
    ipcRenderer.on("scheduler:state", listener as never);
    return () => ipcRenderer.removeListener("scheduler:state", listener as never);
  },
  onOwnerQuestion: (cb) => {
    const listener = (_e: unknown, q: OwnerQuestionEvent) => cb(q);
    ipcRenderer.on("engine:ask", listener as never);
    return () => ipcRenderer.removeListener("engine:ask", listener as never);
  },
};

contextBridge.exposeInMainWorld("cairn", api);
