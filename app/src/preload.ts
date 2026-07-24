import { contextBridge, ipcRenderer } from "electron";
import type { CairnApi, ConductorDelta, TaskActivityEvent } from "./shared/ipc.js";

const api: CairnApi = {
  preflight: () => ipcRenderer.invoke("preflight:check"),
  projectList: () => ipcRenderer.invoke("project:list"),
  projectPickFolder: () => ipcRenderer.invoke("project:pickFolder"),
  projectOpen: (dir) => ipcRenderer.invoke("project:open", dir),
  projectInit: (input) => ipcRenderer.invoke("project:init", input),
  projectStatus: (dir) => ipcRenderer.invoke("project:status", dir),
  projectForget: (dir) => ipcRenderer.invoke("project:forget", dir),
  taskRoute: (dir, outcome, adapterId) => ipcRenderer.invoke("task:route", dir, outcome, adapterId),
  taskRun: (dir, outcome, sessionId, adapterId, realCallConfirmed, disclosure) => ipcRenderer.invoke("task:run", dir, outcome, sessionId, adapterId, realCallConfirmed, disclosure),
  updateCheck: () => ipcRenderer.invoke("app:updateCheck"),
  openExternal: (url) => ipcRenderer.invoke("app:openExternal", url),
  onTaskActivity: (callback) => {
    const listener = (_event: unknown, payload: TaskActivityEvent) => callback(payload);
    ipcRenderer.on("task:activity", listener);
    return () => ipcRenderer.removeListener("task:activity", listener);
  },
  conductorStatus: () => ipcRenderer.invoke("conductor:status"),
  conductorConnect: (request) => ipcRenderer.invoke("conductor:connect", request),
  conductorDisconnect: () => ipcRenderer.invoke("conductor:disconnect"),
  conductorSetModel: (model) => ipcRenderer.invoke("conductor:setModel", model),
  conductorSend: (request) => ipcRenderer.invoke("conductor:send", request),
  conductorStop: (dir) => ipcRenderer.invoke("conductor:stop", dir),
  conductorConversations: (dir) => ipcRenderer.invoke("conductor:conversations", dir),
  conductorTurns: (dir, id) => ipcRenderer.invoke("conductor:turns", dir, id),
  onConductorDelta: (callback) => {
    const listener = (_event: unknown, payload: ConductorDelta) => callback(payload);
    ipcRenderer.on("conductor:delta", listener);
    return () => ipcRenderer.removeListener("conductor:delta", listener);
  },
};

contextBridge.exposeInMainWorld("cairn", api);
