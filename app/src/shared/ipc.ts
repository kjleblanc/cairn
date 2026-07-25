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
  /**
   * "envelope" is not part of the reply stream at all: it carries a result
   * card the envelope authored after a run settled, so a screen showing that
   * conversation can post it without a reload. It never touches the streaming
   * reply, and it never adopts a conversation id.
   */
  kind: "delta" | "done" | "error" | "envelope";
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

/**
 * The envelope's own account of one terminal run, built deterministically from
 * the structured record input Cairn composed its report from — never from the
 * conversation model, and never scraped from rendered Markdown.
 *
 * Every field here is either Cairn's own verification (Git-derived
 * `filesChanged`, the real `protectedIntact` finding, the real commit result)
 * or a fixed code. The one exception is `claims`, which is the WORKER's own
 * account and must be rendered as a claim wherever it appears — never as
 * verified fact.
 *
 * `disposition` carries a third state the runtime knows and the record files
 * do not: ERROR, for a run that threw instead of closing. That arm has no task
 * number, no route, and no verified facts to report — only `errorCode`.
 */
export interface ResultCard {
  kind: "result";
  disposition: "DONE" | "STOPPED" | "ERROR";
  taskNumber: number | null;
  stopReason: string | null;
  errorCode: string | null;
  filesChanged: string[];
  protectedIntact: boolean | null;
  commit: string | null;
  evidenceSummary: string | null;
  /**
   * Task 052's owned-record recovery disclosure: Cairn had to restore its own
   * append-only log, or overwrite a report path the worker pre-wrote. It says
   * a worker tampered with Cairn's own records, so it must reach the owner —
   * the record renders it under "Verified by Cairn" and so does the card.
   */
  recordRecovery: string | null;
  /** The worker process's own failure code and the retained local debug path
   * (null when the debug directory could not be created). */
  processFailure: { code: string; debugPath: string | null } | null;
  claims: { summary: string; milestone: string } | null;
  route: { adapterLabel: string; provider: string; model: string } | null;
}

/** The two turns owner and Cairn take in the conversation itself. */
export interface ConductorChatTurn {
  role: "owner" | "cairn";
  text: string;
  ts: string;
  tokens?: number;
  costUsd?: number;
}

/** A turn the ENVELOPE wrote. It has no text: everything it says is rendered
 * from the card's structured fields, so no wording can drift and no model can
 * author one. */
export interface ConductorEnvelopeTurn {
  role: "envelope";
  card: ResultCard;
  ts: string;
}

export type ConductorTurn = ConductorChatTurn | ConductorEnvelopeTurn;
