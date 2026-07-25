import type { ProjectStatus, RouteResult, SerialActivity, SerialRunResult, WorkerDisclosure } from "@cairn/core";

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };
export type Preflight = { mock: boolean; mode: "offline-demo" | "connection-required" };
export type RecentProject = { dir: string; ok: boolean; name: string; milestone: string; stones: number; lastOpened: string };
export type ProjectList = { recent: RecentProject[]; autoOpen: string | null };
export type InitInput = { dir: string; name: string; what: string; who: string; milestone: string };
export type UpdateInfo = { current: string; latest: string | null; newer: boolean };
export type TaskActivityEvent = { dir: string; activity: SerialActivity };
export type TaskRoutePreview = { route: RouteResult; disclosure?: WorkerDisclosure };
/**
 * One dispatch request, whole. It travels as a single object because every
 * part of it is load-bearing at the gate: the outcome and the owner's own
 * `details` are BOTH re-derived into the expected disclosure card, so a
 * positional signature that quietly drops one would dispatch something the
 * owner never read. `conversationId` names the conversation the request came
 * from (null when it was typed on the task screen instead).
 */
export type TaskRunRequest = {
  dir: string;
  outcome: string;
  details: string;
  adapterId?: string;
  realCallConfirmed?: boolean;
  disclosure?: WorkerDisclosure;
  conversationId?: string | null;
};
export type RunSessionSnapshot = {
  dir: string;
  outcome: string;
  conversationId: string | null;
  // true when this run is a real confirmed worker call, not the offline demo; Task 10 re-keys lane wording off adapter capabilities
  worker: boolean;
  startedAt: string;
  activities: SerialActivity[];
  phase: "running" | "closed";
  result: SerialRunResult | null;
  error: string | null;
};
export type ConductorConversationSummary = { id: string; startedTs: string; preview: string };

export interface ConductorStatus {
  connected: boolean;
  baseUrl: string;
  model: string;
  provider: string;
  encryptionAvailable: boolean;
}

export interface ConductorConsentCard {
  provider: string;
  baseUrl: string;
  model: string;
  data: string;
  cost: string;
}

export interface ConductorConnectRequest {
  card: ConductorConsentCard;
  apiKey: string;
  consentConfirmed: boolean;
}

export interface ConductorSendRequest {
  dir: string;
  conversationId: string | null;
  text: string;
}

export interface ConductorDelta {
  dir: string;
  conversationId: string;
  kind: "delta" | "done" | "error";
  text?: string;
  turn?: ConductorTurn;
  taskBlock?: TaskBlock | null;
  message?: string;
}

export interface CairnApi {
  preflight(): Promise<Preflight>;
  projectList(): Promise<ProjectList>;
  projectPickFolder(): Promise<string | null>;
  projectOpen(dir: string): Promise<Result<ProjectStatus>>;
  projectInit(input: InitInput): Promise<Result<ProjectStatus>>;
  projectStatus(dir: string): Promise<Result<ProjectStatus>>;
  projectForget(dir: string): Promise<Result<null>>;
  taskRoute(dir: string, outcome: string, details: string, adapterId?: string): Promise<Result<TaskRoutePreview>>;
  taskRun(request: TaskRunRequest): Promise<Result<SerialRunResult>>;
  taskCancel(dir: string): Promise<Result<null>>;
  taskCurrent(dir: string): Promise<RunSessionSnapshot | null>;
  taskAcknowledge(dir: string): Promise<Result<null>>;
  updateCheck(): Promise<UpdateInfo>;
  openExternal(url: string): Promise<void>;
  onTaskActivity(cb: (event: TaskActivityEvent) => void): () => void;
  conductorStatus(): Promise<ConductorStatus>;
  conductorConsentCard(baseUrl: string, model: string): Promise<Result<ConductorConsentCard>>;
  conductorConnect(request: ConductorConnectRequest): Promise<Result<null>>;
  conductorDisconnect(): Promise<Result<null>>;
  conductorSetModel(model: string): Promise<Result<null>>;
  conductorSend(request: ConductorSendRequest): Promise<Result<{ conversationId: string }>>;
  conductorStop(dir: string): Promise<Result<null>>;
  conductorConversations(dir: string): Promise<ConductorConversationSummary[]>;
  conductorTurns(dir: string, id: string): Promise<ConductorTurn[]>;
  onConductorDelta(cb: (event: ConductorDelta) => void): () => void;
}

export interface TaskBlockConcern {
  kind: "question" | "risk";
  text: string;
}

export interface TaskBlock {
  outcome: string;
  concerns: TaskBlockConcern[];
  notes: string;
  details: string;
}

export interface ConductorTurn {
  role: "owner" | "cairn";
  text: string;
  ts: string;
  tokens?: number;
  costUsd?: number;
}
