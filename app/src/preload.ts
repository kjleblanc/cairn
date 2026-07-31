import { contextBridge, ipcRenderer } from "electron";
import type { CairnApi, ConductorDelta, ConductorOAuthEvent, TaskActivityEvent } from "./shared/ipc.js";

const api: CairnApi = {
  preflight: () => ipcRenderer.invoke("preflight:check"),
  projectList: () => ipcRenderer.invoke("project:list"),
  projectPickFolder: () => ipcRenderer.invoke("project:pickFolder"),
  projectOpen: (dir) => ipcRenderer.invoke("project:open", dir),
  projectInit: (input) => ipcRenderer.invoke("project:init", input),
  projectStatus: (dir) => ipcRenderer.invoke("project:status", dir),
  projectForget: (dir) => ipcRenderer.invoke("project:forget", dir),
  townLoad: (dir) => ipcRenderer.invoke("town:load", dir),
  townSave: (dir, state) => ipcRenderer.invoke("town:save", dir, state),
  taskRoute: (dir, outcome, details, adapterId) => ipcRenderer.invoke("task:route", dir, outcome, details, adapterId),
  taskRun: (request) => ipcRenderer.invoke("task:run", request),
  taskCancel: (dir) => ipcRenderer.invoke("task:cancel", dir),
  taskCurrent: (dir) => ipcRenderer.invoke("task:current", dir),
  taskAcknowledge: (dir) => ipcRenderer.invoke("task:acknowledge", dir),
  updateCheck: () => ipcRenderer.invoke("app:updateCheck"),
  openExternal: (url) => ipcRenderer.invoke("app:openExternal", url),
  onTaskActivity: (callback) => {
    const listener = (_event: unknown, payload: TaskActivityEvent) => callback(payload);
    ipcRenderer.on("task:activity", listener);
    return () => ipcRenderer.removeListener("task:activity", listener);
  },
  conductorStatus: () => ipcRenderer.invoke("conductor:status"),
  conductorConsentCard: (baseUrl, model) => ipcRenderer.invoke("conductor:consentCard", baseUrl, model),
  conductorConnect: (request) => ipcRenderer.invoke("conductor:connect", request),
  conductorOAuthBegin: (request) => ipcRenderer.invoke("conductor:oauthBegin", request),
  conductorOAuthCancel: () => ipcRenderer.invoke("conductor:oauthCancel"),
  onConductorOAuth: (callback) => {
    const listener = (_event: unknown, payload: ConductorOAuthEvent) => callback(payload);
    ipcRenderer.on("conductor:oauth", listener);
    return () => ipcRenderer.removeListener("conductor:oauth", listener);
  },
  conductorDisconnect: () => ipcRenderer.invoke("conductor:disconnect"),
  conductorSetModel: (model) => ipcRenderer.invoke("conductor:setModel", model),
  conductorSend: (request) => ipcRenderer.invoke("conductor:send", request),
  conductorStop: (dir) => ipcRenderer.invoke("conductor:stop", dir),
  conductorCurrent: (dir) => ipcRenderer.invoke("conductor:current", dir),
  conductorConversations: (dir) => ipcRenderer.invoke("conductor:conversations", dir),
  conductorTurns: (dir, id) => ipcRenderer.invoke("conductor:turns", dir, id),
  onConductorDelta: (callback) => {
    const listener = (_event: unknown, payload: ConductorDelta) => callback(payload);
    ipcRenderer.on("conductor:delta", listener);
    return () => ipcRenderer.removeListener("conductor:delta", listener);
  },
  pushPreview: (dir) => ipcRenderer.invoke("push:preview", dir),
  pushExecute: (dir, preview) => ipcRenderer.invoke("push:execute", dir, preview),
  phoneBridgeState: () => ipcRenderer.invoke("bridge:state"),
  phoneBridgePairBegin: () => ipcRenderer.invoke("bridge:pairBegin"),
  phoneBridgeRevokeDevice: (id) => ipcRenderer.invoke("bridge:revokeDevice", id),
};

contextBridge.exposeInMainWorld("cairn", api);
