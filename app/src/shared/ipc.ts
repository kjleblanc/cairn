import type { CodexExecDisclosure, ProjectStatus, RouteResult, SerialActivity, SerialRunResult } from "@cairn/core";

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };
export type Preflight = { mock: boolean; mode: "offline-demo" | "connection-required" };
export type RecentProject = { dir: string; ok: boolean; name: string; milestone: string; stones: number; lastOpened: string };
export type ProjectList = { recent: RecentProject[]; autoOpen: string | null };
export type InitInput = { dir: string; name: string; what: string; who: string; milestone: string };
export type UpdateInfo = { current: string; latest: string | null; newer: boolean };
export type TaskActivityEvent = { dir: string; sessionId: number; activity: SerialActivity };
export type TaskRoutePreview = { route: RouteResult; disclosure?: CodexExecDisclosure };
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
  taskRoute(dir: string, outcome: string, adapterId?: string): Promise<Result<TaskRoutePreview>>;
  taskRun(dir: string, outcome: string, sessionId: number, adapterId?: string, realCallConfirmed?: boolean, disclosure?: CodexExecDisclosure): Promise<Result<SerialRunResult>>;
  updateCheck(): Promise<UpdateInfo>;
  openExternal(url: string): Promise<void>;
  onTaskActivity(cb: (event: TaskActivityEvent) => void): () => void;
  conductorStatus(): Promise<ConductorStatus>;
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
}

export interface ConductorTurn {
  role: "owner" | "cairn";
  text: string;
  ts: string;
  tokens?: number;
  costUsd?: number;
}
