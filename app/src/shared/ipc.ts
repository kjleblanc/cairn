import type { CloseInput, Disposition, LogRow, ProjectStatus } from "@cairn/core";

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

export type Preflight = { claudeReady: boolean; reason: "no-sdk" | "no-login" | null };
export type RecentProject = { dir: string; ok: boolean; name: string; milestone: string; stones: number; lastOpened: string };
export type ProjectList = { recent: RecentProject[]; autoOpen: string | null };
export type InitInput = { dir: string; name: string; what: string; who: string; milestone: string; timebox: string };
export type EngineEvent = { role: string; kind: "text" | "tool" | "denied"; text: string };
export type DefinePayload = { taskNumber: number; briefText: string; costUsd?: number };
export type BuildPayload = { reportText: string; disposition: Disposition; costUsd?: number };
export type ReviewPayload = { text: string; finalVerdict: string; costUsd?: number };
/**
 * One question from the AI to the owner while a brief is being written (definer
 * runs only). In mock (demo) mode, autoSkipMs says how long an untouched card
 * waits before skipping itself, so an unattended demo always finishes; touching
 * the card cancels that. Real runs carry no autoSkipMs — they wait for the owner.
 */
export type OwnerQuestionEvent = { id: number; question: string; asked: number; limit: number; autoSkipMs?: number };
export type RefinePayload = { briefText: string; briefChanged: boolean; reply: string; costUsd?: number };
export type UpdateInfo = { current: string; latest: string | null; newer: boolean };

export interface CairnApi {
  preflight(): Promise<Preflight>;
  projectList(): Promise<ProjectList>;
  projectPickFolder(): Promise<string | null>;
  projectOpen(dir: string): Promise<Result<ProjectStatus>>;
  projectInit(input: InitInput): Promise<Result<ProjectStatus>>;
  projectStatus(dir: string): Promise<Result<ProjectStatus>>;
  /** Drop one entry from the app's own remembered list. Never deletes, moves, or changes the project folder itself. */
  projectForget(dir: string): Promise<Result<null>>;
  taskDefine(dir: string, outcome: string): Promise<Result<DefinePayload>>;
  /** Deliver the owner's answer to a pending question — or null for "skip, use your judgment". */
  taskAnswer(id: number, answer: string | null): Promise<null>;
  /** Ask about, or request a change to, the not-yet-approved brief. Refused once approved. */
  taskRefine(dir: string, taskNumber: number, message: string): Promise<Result<RefinePayload>>;
  taskApprove(dir: string, taskNumber: number): Promise<Result<{ briefSha256: string }>>;
  taskBuild(dir: string, taskNumber: number): Promise<Result<BuildPayload>>;
  taskReview(dir: string, taskNumber: number): Promise<Result<ReviewPayload>>;
  taskClose(dir: string, taskNumber: number, input: CloseInput): Promise<Result<LogRow>>;
  taskDirection(dir: string, reason: string): Promise<Result<{ text: string }>>;
  /** Choose the model for the next run; returns the resolved active model id. Blank = today's default. */
  taskSetModel(model: string): Promise<string>;
  /** Choose the effort for the next run; returns the active level, or "default" when none is chosen. */
  taskSetEffort(effort: string): Promise<string>;
  updateCheck(): Promise<UpdateInfo>;
  openExternal(url: string): Promise<void>;
  onEngineEvent(cb: (ev: EngineEvent) => void): () => void;
  /** Fires when the AI asks the owner a question during a define run. */
  onOwnerQuestion(cb: (q: OwnerQuestionEvent) => void): () => void;
}
