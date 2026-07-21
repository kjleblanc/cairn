import { contextBridge, ipcRenderer } from "electron";
import type { CairnApi, TaskActivityEvent } from "./shared/ipc.js";

const api: CairnApi = {
  preflight: () => ipcRenderer.invoke("preflight:check"),
  projectList: () => ipcRenderer.invoke("project:list"),
  projectPickFolder: () => ipcRenderer.invoke("project:pickFolder"),
  projectOpen: (dir) => ipcRenderer.invoke("project:open", dir),
  projectInit: (input) => ipcRenderer.invoke("project:init", input),
  projectStatus: (dir) => ipcRenderer.invoke("project:status", dir),
  projectForget: (dir) => ipcRenderer.invoke("project:forget", dir),
  taskRoute: (dir, outcome, adapterId) => ipcRenderer.invoke("task:route", dir, outcome, adapterId),
  taskRun: (dir, outcome, sessionId, adapterId) => ipcRenderer.invoke("task:run", dir, outcome, sessionId, adapterId),
  taskDirection: (dir, reason) => ipcRenderer.invoke("task:direction", dir, reason),
  updateCheck: () => ipcRenderer.invoke("app:updateCheck"),
  openExternal: (url) => ipcRenderer.invoke("app:openExternal", url),
  onTaskActivity: (callback) => {
    const listener = (_event: unknown, payload: TaskActivityEvent) => callback(payload);
    ipcRenderer.on("task:activity", listener);
    return () => ipcRenderer.removeListener("task:activity", listener);
  },
};

contextBridge.exposeInMainWorld("cairn", api);
