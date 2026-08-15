import { contextBridge, ipcRenderer } from "electron";
import type { CairnApi, ConductorDelta, ConductorOAuthEvent, TaskActivityEvent } from "./shared/ipc.js";

const api: CairnApi = {
  preflight: () => ipcRenderer.invoke("preflight:check"),
  projectList: () => ipcRenderer.invoke("project:list"),
  projectCheckup: (dir) => ipcRenderer.invoke("project:checkup", dir),
  projectPickFolder: () => ipcRenderer.invoke("project:pickFolder"),
  projectOpen: (dir) => ipcRenderer.invoke("project:open", dir),
  projectInit: (input) => ipcRenderer.invoke("project:init", input),
  projectConvertInspect: (dir) => ipcRenderer.invoke("project:convertInspect", dir),
  projectConvert: (input) => ipcRenderer.invoke("project:convert", input),
  projectStatus: (dir) => ipcRenderer.invoke("project:status", dir),
  projectForget: (dir) => ipcRenderer.invoke("project:forget", dir),
  townLoad: (dir) => ipcRenderer.invoke("town:load", dir),
  townSave: (dir, state) => ipcRenderer.invoke("town:save", dir, state),
  taskRoute: (request) => ipcRenderer.invoke("task:route", request),
  taskPreviewDiscard: (dir, previewId) => ipcRenderer.invoke("task:preview-discard", dir, previewId),
  taskRun: (request) => ipcRenderer.invoke("task:run", request),
  taskReviewAction: (request) => ipcRenderer.invoke("task:review-action", request),
  criticCallDecide: (request) => ipcRenderer.invoke("critic:call-decide", request),
  repairCallDecide: (request) => ipcRenderer.invoke("repair:call-decide", request),
  harnessRevisionDecide: (request) => ipcRenderer.invoke("harness:revision-decide", request),
  unsealedCandidateDecide: (request) => ipcRenderer.invoke("task:candidate-decide", request),
  candidateCritiqueDecide: (request) => ipcRenderer.invoke("task:candidate-critique", request),
  criticCalibrationOpen: (request) => ipcRenderer.invoke("critic:calibration-open", request),
  criticCalibrationCurrent: (dir) => ipcRenderer.invoke("critic:calibration-current", dir),
  criticCalibrationCancel: (dir) => ipcRenderer.invoke("critic:calibration-cancel", dir),
  onCriticCalibrationChanged: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("critic:calibration-changed", listener);
    return () => ipcRenderer.removeListener("critic:calibration-changed", listener);
  },
  taskCancel: (dir) => ipcRenderer.invoke("task:cancel", dir),
  taskCurrent: (dir) => ipcRenderer.invoke("task:current", dir),
  taskAcknowledge: (dir) => ipcRenderer.invoke("task:acknowledge", dir),
  evidenceAlbum: (dir, selectedRunId, cursor) => ipcRenderer.invoke("evidence:album", dir, selectedRunId ?? null, cursor ?? null),
  evidenceImage: (dir, imageId) => ipcRenderer.invoke("evidence:image", dir, imageId),
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
  conductorRenewConsent: (request) => ipcRenderer.invoke("conductor:renewConsent", request),
  conductorOAuthBegin: (request) => ipcRenderer.invoke("conductor:oauthBegin", request),
  conductorOAuthCancel: () => ipcRenderer.invoke("conductor:oauthCancel"),
  onConductorOAuth: (callback) => {
    const listener = (_event: unknown, payload: ConductorOAuthEvent) => callback(payload);
    ipcRenderer.on("conductor:oauth", listener);
    return () => ipcRenderer.removeListener("conductor:oauth", listener);
  },
  conductorDisconnect: (request) => ipcRenderer.invoke("conductor:disconnect", request),
  conductorSetModel: (model) => ipcRenderer.invoke("conductor:setModel", model),
  conductorSend: (request) => ipcRenderer.invoke("conductor:send", request),
  conductorStop: (dir) => ipcRenderer.invoke("conductor:stop", dir),
  conductorCurrent: (dir) => ipcRenderer.invoke("conductor:current", dir),
  conductorConversations: (dir) => ipcRenderer.invoke("conductor:conversations", dir),
  conductorTurns: (dir, id) => ipcRenderer.invoke("conductor:turns", dir, id),
  conductorProposal: (dir, id) => ipcRenderer.invoke("conductor:proposal", dir, id),
  conductorAction: (dir, id) => ipcRenderer.invoke("conductor:action", dir, id),
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
