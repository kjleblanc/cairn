import { contextBridge, ipcRenderer } from "electron";
import type { CairnApi, EngineEvent } from "./shared/ipc.js";

const api: CairnApi = {
  preflight: () => ipcRenderer.invoke("preflight:check"),
  projectList: () => ipcRenderer.invoke("project:list"),
  projectPickFolder: () => ipcRenderer.invoke("project:pickFolder"),
  projectOpen: (dir) => ipcRenderer.invoke("project:open", dir),
  projectInit: (input) => ipcRenderer.invoke("project:init", input),
  projectStatus: (dir) => ipcRenderer.invoke("project:status", dir),
  taskDefine: (dir, outcome) => ipcRenderer.invoke("task:define", dir, outcome),
  taskApprove: (dir, taskNumber) => ipcRenderer.invoke("task:approve", dir, taskNumber),
  taskBuild: (dir, taskNumber) => ipcRenderer.invoke("task:build", dir, taskNumber),
  taskReview: (dir, taskNumber) => ipcRenderer.invoke("task:review", dir, taskNumber),
  taskClose: (dir, taskNumber, input) => ipcRenderer.invoke("task:close", dir, taskNumber, input),
  taskDirection: (dir, reason) => ipcRenderer.invoke("task:direction", dir, reason),
  updateCheck: () => ipcRenderer.invoke("app:updateCheck"),
  openExternal: (url) => ipcRenderer.invoke("app:openExternal", url),
  onEngineEvent: (cb) => {
    const listener = (_e: unknown, ev: EngineEvent) => cb(ev);
    ipcRenderer.on("engine:event", listener as never);
    return () => ipcRenderer.removeListener("engine:event", listener as never);
  },
};

contextBridge.exposeInMainWorld("cairn", api);
