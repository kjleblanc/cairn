import type { CloseInput, Disposition, LogRow, ProjectStatus } from "@cairn/core";

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

export type Preflight = { claudeReady: boolean; reason: "no-sdk" | "no-login" | null };
export type RecentProject = { dir: string; ok: boolean; name: string; milestone: string; stones: number };
export type ProjectList = { recent: RecentProject[]; autoOpen: string | null };
export type InitInput = { dir: string; name: string; what: string; who: string; milestone: string; timebox: string };
export type EngineEvent = { role: string; kind: "text" | "tool" | "denied"; text: string };
export type DefinePayload = { taskNumber: number; briefText: string; costUsd?: number };
export type BuildPayload = { reportText: string; disposition: Disposition; costUsd?: number };
export type ReviewPayload = { text: string; finalVerdict: string; costUsd?: number };
export type UpdateInfo = { current: string; latest: string | null; newer: boolean };

export interface CairnApi {
  preflight(): Promise<Preflight>;
  projectList(): Promise<ProjectList>;
  projectPickFolder(): Promise<string | null>;
  projectOpen(dir: string): Promise<Result<ProjectStatus>>;
  projectInit(input: InitInput): Promise<Result<ProjectStatus>>;
  projectStatus(dir: string): Promise<Result<ProjectStatus>>;
  taskDefine(dir: string, outcome: string): Promise<Result<DefinePayload>>;
  taskApprove(dir: string, taskNumber: number): Promise<Result<{ briefSha256: string }>>;
  taskBuild(dir: string, taskNumber: number): Promise<Result<BuildPayload>>;
  taskReview(dir: string, taskNumber: number): Promise<Result<ReviewPayload>>;
  taskClose(dir: string, taskNumber: number, input: CloseInput): Promise<Result<LogRow>>;
  taskDirection(dir: string, reason: string): Promise<Result<{ text: string }>>;
  /** Choose the model for the next run; returns the resolved active model id. Blank = today's default. */
  taskSetModel(model: string): Promise<string>;
  updateCheck(): Promise<UpdateInfo>;
  openExternal(url: string): Promise<void>;
  onEngineEvent(cb: (ev: EngineEvent) => void): () => void;
}
