import { execFileSync, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  appendFileSync,
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { checkBashCommand, type ApprovalRecord } from "./gates.js";
import { nextTaskNumber, pad, paths, sha256File, type LogRow } from "./files.js";

export const PARALLEL_DRAFT_ENV = "CAIRN_PARALLEL_DRAFT";
export const COORDINATOR_SCHEMA = 2 as const;
export const COORDINATOR_LABEL = "Parallel Draft — not active by default";

const LOCK_STALE_MS = 30_000;
const LOCK_WAIT_MS = 5_000;

export type CoordinatorLane = "Tiny" | "Standard" | "High-Stakes" | "Unknown";
export type CoordinatorMode = "Draft" | "Final" | "Unknown";
export type CoordinatorPhase =
  | "reserved"
  | "defining"
  | "defined"
  | "approved"
  | "waiting"
  | "building"
  | "report"
  | "queued"
  | "integrating"
  | "integrated"
  | "refused"
  | "blocked";

export interface TaskMetadata {
  schemaVersion: 1;
  lane: CoordinatorLane;
  mode: CoordinatorMode;
  allowedPaths: string[];
  dependencies: number[];
  checks: string[];
  externalActions: string[];
}

export interface CoordinatorDecision {
  decision: "accept" | "revise" | "rollback" | "defer" | "escalate";
  summary: string;
  moved: "YES" | "NO" | "UNCLEAR";
  row: LogRow;
  decidedAt: string;
}

export interface CoordinatorTask {
  taskNumber: number;
  projectRoot: string;
  baseCommit: string;
  branch: string;
  worktree: string;
  lane: CoordinatorLane;
  mode: CoordinatorMode;
  phase: CoordinatorPhase;
  allowedPaths: string[];
  dependencies: number[];
  checks: string[];
  externalActions: string[];
  admitted: boolean;
  briefSha256?: string;
  approvalSha256?: string;
  disposition?: "DONE" | "STOPPED" | "UNKNOWN";
  decision?: CoordinatorDecision;
  decisionCommit?: string;
  changedPaths: string[];
  blocker?: string;
  integrationCommit?: string;
  integrationWorktree?: string;
  reservedAt: string;
  updatedAt: string;
}

export interface CoordinatorState {
  schemaVersion: 2;
  revision: number;
  projectRoot: string;
  gitDir: string;
  baseBranch: "main";
  integratedMain: string;
  nextTaskNumber: number;
  worktreeRoot: string;
  tasks: CoordinatorTask[];
  integrationQueue: number[];
  integrationLease: { taskNumber: number; token: string; acquiredAt: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CoordinatorTaskView extends CoordinatorTask {
  waitingReason: string;
}

export interface CoordinatorSummary {
  enabled: true;
  label: string;
  projectRoot: string;
  integratedMain: string;
  tasks: CoordinatorTaskView[];
  integrationQueue: number[];
  integrationActive: number | null;
}

export class CoordinatorError extends Error {
  constructor(readonly code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "CoordinatorError";
  }
}

export function parallelDraftEnabled(): boolean {
  return process.env[PARALLEL_DRAFT_ENV] === "1";
}

function now(): string {
  return new Date().toISOString();
}

function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function inside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function projectGitDir(root: string): string {
  const raw = git(root, ["rev-parse", "--git-common-dir"]);
  return resolve(root, raw);
}

function coordinatorDir(root: string): string {
  return join(projectGitDir(root), "cairn");
}

export function coordinatorPaths(root: string): { dir: string; state: string; backup: string; lock: string } {
  const dir = coordinatorDir(root);
  return {
    dir,
    state: join(dir, "coordinator-v2.json"),
    backup: join(dir, "coordinator-v2.backup.json"),
    lock: join(dir, "coordinator-v2.lock"),
  };
}

function legacyCoordinatorState(root: string): string {
  return join(coordinatorDir(root), "coordinator-v1.json");
}

function assertDraftRoot(root: string): string {
  if (!parallelDraftEnabled()) {
    throw new CoordinatorError("DRAFT_DISABLED", `${PARALLEL_DRAFT_ENV}=1 is required.`);
  }
  const projectRoot = resolve(git(root, ["rev-parse", "--show-toplevel"]));
  if (projectRoot !== resolve(root)) {
    throw new CoordinatorError("PROJECT_ROOT_MISMATCH", "The coordinator must be opened from the Git project root.");
  }
  return projectRoot;
}

function assertCleanMain(root: string): void {
  const branch = git(root, ["branch", "--show-current"]);
  if (branch !== "main") throw new CoordinatorError("MAIN_REQUIRED", "The main worktree must be on branch main.");
  const status = git(root, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (status) throw new CoordinatorError("DIRTY_MAIN", "The main worktree has protected uncommitted work.");
  for (const marker of ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply"]) {
    if (existsSync(join(projectGitDir(root), marker))) {
      throw new CoordinatorError("GIT_OPERATION_ACTIVE", `Git still has an unfinished ${marker} operation.`);
    }
  }
}

function assertGitIdentity(root: string): void {
  if (!git(root, ["config", "user.name"]) || !git(root, ["config", "user.email"])) {
    throw new CoordinatorError("GIT_IDENTITY_MISSING", "A test-only local Git name and email are required.");
  }
}

function taskIsValid(value: unknown): value is CoordinatorTask {
  if (!value || typeof value !== "object") return false;
  const t = value as Record<string, unknown>;
  const lanes = ["Tiny", "Standard", "High-Stakes", "Unknown"];
  const modes = ["Draft", "Final", "Unknown"];
  const phases: CoordinatorPhase[] = [
    "reserved", "defining", "defined", "approved", "waiting", "building",
    "report", "queued", "integrating", "integrated", "refused", "blocked",
  ];
  return Number.isInteger(t.taskNumber) && typeof t.projectRoot === "string" &&
    typeof t.baseCommit === "string" && typeof t.branch === "string" &&
    typeof t.worktree === "string" && lanes.includes(String(t.lane)) &&
    modes.includes(String(t.mode)) && phases.includes(t.phase as CoordinatorPhase) &&
    Array.isArray(t.allowedPaths) && t.allowedPaths.every((item) => typeof item === "string") &&
    Array.isArray(t.dependencies) && t.dependencies.every((item) => Number.isInteger(item)) &&
    Array.isArray(t.checks) && t.checks.every((item) => typeof item === "string") &&
    Array.isArray(t.externalActions) && t.externalActions.every((item) => typeof item === "string") &&
    typeof t.admitted === "boolean" &&
    Array.isArray(t.changedPaths) && t.changedPaths.every((item) => typeof item === "string") &&
    (t.decision === undefined || (typeof t.decision === "object" && t.decision !== null)) &&
    (t.decisionCommit === undefined || (typeof t.decisionCommit === "string" && /^[0-9a-f]{40}$/.test(t.decisionCommit))) &&
    typeof t.reservedAt === "string" &&
    typeof t.updatedAt === "string";
}

function stateIsValid(value: unknown): value is CoordinatorState {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return s.schemaVersion === COORDINATOR_SCHEMA && Number.isInteger(s.revision) &&
    typeof s.projectRoot === "string" && typeof s.gitDir === "string" &&
    s.baseBranch === "main" && typeof s.integratedMain === "string" &&
    Number.isInteger(s.nextTaskNumber) && typeof s.worktreeRoot === "string" &&
    Array.isArray(s.tasks) && s.tasks.every(taskIsValid) &&
    Array.isArray(s.integrationQueue) && s.integrationQueue.every((item) => Number.isInteger(item)) &&
    (s.integrationLease === null || (
      typeof s.integrationLease === "object" && s.integrationLease !== null &&
      Number.isInteger((s.integrationLease as Record<string, unknown>).taskNumber) &&
      typeof (s.integrationLease as Record<string, unknown>).token === "string" &&
      typeof (s.integrationLease as Record<string, unknown>).acquiredAt === "string"
    )) &&
    typeof s.createdAt === "string" && typeof s.updatedAt === "string";
}

function readStateFile(path: string): CoordinatorState {
  if (!existsSync(path)) throw new CoordinatorError("STATE_MISSING", "Coordinator state does not exist.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new CoordinatorError("CORRUPT_STATE", "Coordinator state is not valid JSON.");
  }
  if (!stateIsValid(parsed)) {
    throw new CoordinatorError("UNSUPPORTED_STATE", "Coordinator state is incomplete or uses an unsupported schema.");
  }
  return parsed;
}

function acquireLock(lockPath: string): void {
  const started = Date.now();
  for (;;) {
    try {
      const fd = openSync(lockPath, "wx");
      writeFileSync(fd, JSON.stringify({ schemaVersion: 1, pid: process.pid, acquiredAt: now() }) + "\n");
      closeSync(fd);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw err;
      let lock: { acquiredAt?: string };
      try {
        lock = JSON.parse(readFileSync(lockPath, "utf8")) as { acquiredAt?: string };
      } catch {
        // Exclusive creation becomes visible just before the owner bytes are
        // flushed. A very new unreadable lock is therefore an acquisition race,
        // not corrupt evidence; give its owner one short grace window to finish.
        const age = Date.now() - statSync(lockPath).mtimeMs;
        if (age < 1_000 && Date.now() - started < LOCK_WAIT_MS) { sleep(20); continue; }
        throw new CoordinatorError("CORRUPT_LOCK", "The coordinator lock cannot be read safely.");
      }
      const acquired = Date.parse(lock.acquiredAt ?? "");
      if (!Number.isFinite(acquired)) throw new CoordinatorError("CORRUPT_LOCK", "The coordinator lock has no valid timestamp.");
      if (Date.now() - acquired >= LOCK_STALE_MS) {
        throw new CoordinatorError("STALE_LOCK", "A stale coordinator lock was preserved for inspection.");
      }
      if (Date.now() - started >= LOCK_WAIT_MS) {
        throw new CoordinatorError("LOCK_BUSY", "Another coordinator process still owns the lock.");
      }
      sleep(20);
    }
  }
}

function writeStateFile(pathsForState: ReturnType<typeof coordinatorPaths>, state: CoordinatorState): void {
  const temp = join(pathsForState.dir, `coordinator-v2.${process.pid}.${randomUUID()}.tmp`);
  writeFileSync(temp, JSON.stringify(state, null, 2) + "\n", { flag: "wx" });
  if (existsSync(pathsForState.state)) copyFileSync(pathsForState.state, pathsForState.backup);
  renameSync(temp, pathsForState.state);
}

function updateState(root: string, mutate: (state: CoordinatorState) => void): CoordinatorState {
  const p = coordinatorPaths(root);
  acquireLock(p.lock);
  try {
    const state = readStateFile(p.state);
    mutate(state);
    state.revision++;
    state.updatedAt = now();
    writeStateFile(p, state);
    return state;
  } finally {
    if (existsSync(p.lock)) unlinkSync(p.lock);
  }
}

export function hasCoordinator(root: string): boolean {
  try {
    return existsSync(coordinatorPaths(root).state) || existsSync(legacyCoordinatorState(root));
  } catch {
    return false;
  }
}

export function readCoordinatorState(root: string): CoordinatorState {
  const current = coordinatorPaths(root).state;
  if (!existsSync(current) && existsSync(legacyCoordinatorState(root))) {
    throw new CoordinatorError("UNSUPPORTED_STATE", "Coordinator schema version 1 is retained but cannot be migrated automatically.");
  }
  const state = readStateFile(current);
  if (resolve(state.projectRoot) !== resolve(root) || resolve(state.gitDir) !== projectGitDir(root)) {
    throw new CoordinatorError("STATE_PROJECT_MISMATCH", "Coordinator state belongs to a different Git project.");
  }
  if (!inside(tmpdir(), state.projectRoot) || !inside(tmpdir(), state.worktreeRoot)) {
    throw new CoordinatorError("UNSAFE_STATE_PATH", "Coordinator state points outside the retained temporary area.");
  }
  const numbers = state.tasks.map((task) => task.taskNumber);
  if (new Set(numbers).size !== numbers.length || state.nextTaskNumber <= Math.max(0, ...numbers) ||
      state.integrationQueue.some((taskNumber) => !numbers.includes(taskNumber)) ||
      (state.integrationLease && !numbers.includes(state.integrationLease.taskNumber))) {
    throw new CoordinatorError("CORRUPT_STATE", "Task numbers, queue entries, or the next reservation are inconsistent.");
  }
  for (const task of state.tasks) {
    if (resolve(task.projectRoot) !== resolve(root) || !inside(state.worktreeRoot, task.worktree) ||
        task.branch !== `cairn/task-${pad(task.taskNumber)}`) {
      throw new CoordinatorError("UNSAFE_STATE_PATH", `Task ${pad(task.taskNumber)} has an invalid project, branch, or worktree path.`);
    }
    task.allowedPaths.forEach(validateExactPath);
  }
  return state;
}

export function initializeCoordinator(root: string): CoordinatorState {
  const projectRoot = assertDraftRoot(root);
  assertCleanMain(projectRoot);
  if (!inside(tmpdir(), projectRoot)) {
    throw new CoordinatorError(
      "REAL_PROJECT_REFUSED",
      "This Draft runs only in a newly created throwaway repository under the system temporary folder.",
    );
  }
  assertGitIdentity(projectRoot);
  // Rebase/checkouts must not rewrite the byte-locked brief or approval. This
  // local setting exists only in the throwaway rehearsal repository.
  git(projectRoot, ["config", "core.autocrlf", "false"]);
  const p = coordinatorPaths(projectRoot);
  mkdirSync(p.dir, { recursive: true });
  if (!existsSync(p.state) && existsSync(legacyCoordinatorState(projectRoot))) {
    throw new CoordinatorError("UNSUPPORTED_STATE", "Coordinator schema version 1 is retained but cannot be migrated automatically.");
  }
  acquireLock(p.lock);
  try {
    if (existsSync(p.state)) return readStateFile(p.state);
    const stamp = now();
    const integratedMain = git(projectRoot, ["rev-parse", "refs/heads/main"]);
    const worktreeRoot = resolve(dirname(projectRoot), `${basename(projectRoot)}-cairn-worktrees`);
    if (!inside(tmpdir(), worktreeRoot)) {
      throw new CoordinatorError("UNSAFE_WORKTREE_ROOT", "The planned worktree folder is outside the system temporary folder.");
    }
    const state: CoordinatorState = {
      schemaVersion: COORDINATOR_SCHEMA,
      revision: 1,
      projectRoot,
      gitDir: projectGitDir(projectRoot),
      baseBranch: "main",
      integratedMain,
      nextTaskNumber: nextTaskNumber(projectRoot),
      worktreeRoot,
      tasks: [],
      integrationQueue: [],
      integrationLease: null,
      createdAt: stamp,
      updatedAt: stamp,
    };
    writeStateFile(p, state);
    return state;
  } finally {
    if (existsSync(p.lock)) unlinkSync(p.lock);
  }
}

function findTask(state: CoordinatorState, taskNumber: number): CoordinatorTask {
  const task = state.tasks.find((item) => item.taskNumber === taskNumber);
  if (!task) throw new CoordinatorError("TASK_NOT_FOUND", `Task ${pad(taskNumber)} is not in coordinator state.`);
  return task;
}

function activeTasks(state: CoordinatorState): CoordinatorTask[] {
  return state.tasks.filter((task) => !["integrated", "refused"].includes(task.phase));
}

function admittedTasks(state: CoordinatorState): CoordinatorTask[] {
  return state.tasks.filter((task) => task.admitted && !["integrated", "refused"].includes(task.phase));
}

export function reserveTask(root: string, claimDefinition = false): CoordinatorTask {
  const state = hasCoordinator(root) ? readCoordinatorState(root) : initializeCoordinator(root);
  const retainedDefinition = claimDefinition
    ? activeTasks(state).filter((task) => task.phase === "blocked" && task.blocker === "DEFINER_ENGINE_FAILED")
    : [];
  if (retainedDefinition.length > 1) {
    throw new CoordinatorError("CORRUPT_STATE", "More than one failed definition is awaiting the serialized retry slot.");
  }
  if (retainedDefinition.length === 1) {
    const taskNumber = retainedDefinition[0].taskNumber;
    return findTask(updateState(root, (draft) => {
      const current = findTask(draft, taskNumber);
      if (current.phase !== "blocked" || current.blocker !== "DEFINER_ENGINE_FAILED") {
        throw new CoordinatorError("RETRY_CHANGED", "The retained definition changed before retry could begin.");
      }
      if (activeTasks(draft).some((task) => task.taskNumber !== taskNumber && task.phase === "defining")) {
        throw new CoordinatorError("DEFINE_BUSY", "Task definitions are serialized until lane and mode are frozen.");
      }
      current.phase = "defining";
      current.blocker = undefined;
      current.updatedAt = now();
    }), taskNumber);
  }
  if (admittedTasks(state).length >= 2) {
    throw new CoordinatorError("CONCURRENCY_LIMIT", "At most two non-integrated Draft tasks may exist at once.");
  }
  const updated = updateState(root, (draft) => {
    if (activeTasks(draft).some((task) => task.phase === "blocked")) {
      throw new CoordinatorError("UNRESOLVED_BLOCKER", "A preserved blocked task must be decided before another reservation.");
    }
    if (claimDefinition && activeTasks(draft).some((task) => task.phase === "defining")) {
      throw new CoordinatorError("DEFINE_BUSY", "Task definitions are serialized until lane and mode are frozen.");
    }
    if (admittedTasks(draft).length >= 2) {
      throw new CoordinatorError("CONCURRENCY_LIMIT", "At most two non-integrated Draft tasks may exist at once.");
    }
    if (admittedTasks(draft).some((task) => task.phase === "integrating")) {
      throw new CoordinatorError("ACTIVE_WORK", "A new task cannot be reserved while integration is advancing main.");
    }
    const taskNumber = draft.nextTaskNumber++;
    const stamp = now();
    draft.tasks.push({
      taskNumber,
      projectRoot: draft.projectRoot,
      baseCommit: draft.integratedMain,
      branch: `cairn/task-${pad(taskNumber)}`,
      worktree: resolve(draft.worktreeRoot, `task-${pad(taskNumber)}`),
      lane: "Unknown",
      mode: "Unknown",
      phase: claimDefinition ? "defining" : "reserved",
      allowedPaths: [],
      dependencies: [],
      checks: [],
      externalActions: [],
      admitted: false,
      changedPaths: [],
      reservedAt: stamp,
      updatedAt: stamp,
    });
  });
  return updated.tasks[updated.tasks.length - 1];
}

export function createTaskWorktree(root: string, taskNumber: number): CoordinatorTask {
  let state = readCoordinatorState(root);
  let task = findTask(state, taskNumber);
  if (!["reserved", "defining"].includes(task.phase)) {
    throw new CoordinatorError("TASK_PHASE", "Only a reserved or claimed task can create its worktree.");
  }
  if (!inside(tmpdir(), task.worktree) || !inside(state.worktreeRoot, task.worktree)) {
    throw new CoordinatorError("UNSAFE_WORKTREE_PATH", "The planned task worktree escaped its retained temporary area.");
  }
  if (existsSync(task.worktree)) {
    const retainedRoot = resolve(git(task.worktree, ["rev-parse", "--show-toplevel"]));
    const retainedBranch = git(task.worktree, ["branch", "--show-current"]);
    if (task.phase === "defining" && retainedRoot === resolve(task.worktree) && retainedBranch === task.branch) {
      return task;
    }
    throw new CoordinatorError("WORKTREE_ALREADY_EXISTS", "The retained worktree does not match the task awaiting retry.");
  }
  if (task.phase === "reserved") {
    state = updateState(root, (draft) => {
      const current = findTask(draft, taskNumber);
      if (current.phase !== "reserved") throw new CoordinatorError("TASK_PHASE", "Only a reserved task can create its worktree.");
      if (draft.tasks.some((peer) => peer.taskNumber !== taskNumber && peer.phase === "defining")) {
        throw new CoordinatorError("DEFINE_BUSY", "Task definitions are serialized until both lanes and modes are frozen.");
      }
      current.phase = "defining";
      current.updatedAt = now();
    });
    task = findTask(state, taskNumber);
  }
  mkdirSync(dirname(task.worktree), { recursive: true });
  try {
    git(root, ["worktree", "add", "-b", task.branch, task.worktree, task.baseCommit]);
  } catch (err) {
    updateState(root, (draft) => {
      const current = findTask(draft, taskNumber);
      current.phase = "blocked";
      current.blocker = "WORKTREE_CREATION_FAILED";
      current.updatedAt = now();
    });
    throw new CoordinatorError("WORKTREE_CREATION_FAILED", err instanceof Error ? err.message : String(err));
  }
  return findTask(readCoordinatorState(root), taskNumber);
}

export function reserveTaskWorktree(root: string): CoordinatorTask {
  const task = reserveTask(root, true);
  return createTaskWorktree(root, task.taskNumber);
}

function validateExactPath(path: string): string {
  const clean = path.replace(/\\/g, "/").trim();
  if (!clean || isAbsolute(clean) || clean.startsWith("../") || clean.includes("/../") ||
      clean === ".git" || clean.startsWith(".git/") || /[*?\[\]{}$`]/.test(clean)) {
    throw new CoordinatorError("MALFORMED_SCOPE", `"${path}" is not an exact safe repository-relative path.`);
  }
  const normalized = relative(".", clean).replace(/\\/g, "/");
  if (normalized !== clean || normalized === ".") {
    throw new CoordinatorError("MALFORMED_SCOPE", `"${path}" is not in normalized repository-relative form.`);
  }
  return clean;
}

function uniqueStrings(values: unknown, field: string): string[] {
  if (!Array.isArray(values) || !values.every((item) => typeof item === "string")) {
    throw new CoordinatorError("MALFORMED_METADATA", `${field} must be an array of strings.`);
  }
  const clean = values.map((item) => item.trim());
  if (clean.some((item) => !item) || new Set(clean).size !== clean.length) {
    throw new CoordinatorError("MALFORMED_METADATA", `${field} must contain unique non-empty values.`);
  }
  return clean;
}

export function validateTaskMetadata(value: unknown): TaskMetadata {
  if (!value || typeof value !== "object") throw new CoordinatorError("MALFORMED_METADATA", "Task metadata must be a JSON object.");
  const m = value as Record<string, unknown>;
  const keys = Object.keys(m).sort();
  const expected = ["allowedPaths", "checks", "dependencies", "externalActions", "lane", "mode", "schemaVersion"].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    throw new CoordinatorError("MALFORMED_METADATA", "Task metadata has missing or unknown fields.");
  }
  if (m.schemaVersion !== 1) throw new CoordinatorError("MALFORMED_METADATA", "Task metadata schemaVersion must be 1.");
  if (!["Tiny", "Standard", "High-Stakes"].includes(String(m.lane))) {
    throw new CoordinatorError("MALFORMED_METADATA", "Task lane is unknown.");
  }
  if (!["Draft", "Final"].includes(String(m.mode))) {
    throw new CoordinatorError("MALFORMED_METADATA", "Task mode is unknown.");
  }
  const allowedPaths = uniqueStrings(m.allowedPaths, "allowedPaths").map(validateExactPath);
  const checks = uniqueStrings(m.checks, "checks");
  const externalActions = uniqueStrings(m.externalActions, "externalActions");
  if (!Array.isArray(m.dependencies) || !m.dependencies.every((item) => Number.isInteger(item) && Number(item) > 0)) {
    throw new CoordinatorError("MALFORMED_METADATA", "dependencies must be positive task numbers.");
  }
  const dependencies = [...new Set(m.dependencies as number[])];
  return {
    schemaVersion: 1,
    lane: m.lane as CoordinatorLane,
    mode: m.mode as CoordinatorMode,
    allowedPaths,
    dependencies,
    checks,
    externalActions,
  };
}

export function parseTaskMetadata(briefText: string): TaskMetadata {
  const matches = [...briefText.matchAll(/```cairn-task-metadata\s*\r?\n([\s\S]*?)\r?\n```/g)];
  if (matches.length !== 1) {
    throw new CoordinatorError("MALFORMED_METADATA", "The brief must contain exactly one cairn-task-metadata JSON block.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(matches[0][1]);
  } catch {
    throw new CoordinatorError("MALFORMED_METADATA", "The cairn-task-metadata block is not strict JSON.");
  }
  return validateTaskMetadata(parsed);
}

function pathsConflict(left: string, right: string): boolean {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

export function refuseTaskClassification(root: string, taskNumber: number): CoordinatorTask {
  return findTask(updateState(root, (draft) => {
    const current = findTask(draft, taskNumber);
    if (!["reserved", "defining"].includes(current.phase) || current.admitted) {
      throw new CoordinatorError("TASK_PHASE", "Only a provisional definition can be refused for invalid classification.");
    }
    current.phase = "refused";
    current.blocker = "PARALLEL_CLASSIFICATION_REFUSED";
    current.updatedAt = now();
  }), taskNumber);
}

/**
 * A refinement can invalidate metadata that was valid when the task was first
 * admitted.  Refusal is terminal and happens before an approval can be written.
 */
export function refuseTaskAfterInvalidRefinement(root: string, taskNumber: number): CoordinatorTask {
  return findTask(updateState(root, (draft) => {
    const current = findTask(draft, taskNumber);
    if (current.phase !== "defined" || !current.admitted || current.approvalSha256) {
      throw new CoordinatorError("TASK_PHASE", "Only an admitted, unapproved definition can be refused after refinement.");
    }
    current.admitted = false;
    current.phase = "refused";
    current.blocker = "PARALLEL_CLASSIFICATION_REFUSED";
    current.updatedAt = now();
  }), taskNumber);
}

export function registerTaskMetadata(root: string, taskNumber: number, metadata: TaskMetadata): CoordinatorTask {
  const valid = validateTaskMetadata(metadata);
  const state = readCoordinatorState(root);
  const existingNumbers = new Set(state.tasks.map((task) => task.taskNumber));
  const task = findTask(state, taskNumber);
  const briefPath = paths.brief(task.worktree, taskNumber);
  if (!existsSync(briefPath)) throw new CoordinatorError("BRIEF_MISSING", "The task worktree contains no brief.");
  return findTask(updateState(root, (draft) => {
    const current = findTask(draft, taskNumber);
    if (!["defining", "defined"].includes(current.phase)) {
      throw new CoordinatorError("TASK_PHASE", "Only an unapproved task can freeze or refresh metadata.");
    }
    current.lane = valid.lane;
    current.mode = valid.mode;
    current.allowedPaths = valid.allowedPaths;
    current.dependencies = valid.dependencies;
    current.checks = valid.checks;
    current.externalActions = valid.externalActions;
    current.briefSha256 = sha256File(briefPath);
    const malformedDependency = valid.dependencies.some((dependency) => dependency >= taskNumber || !existingNumbers.has(dependency));
    const peers = admittedTasks(draft).filter((peer) => peer.taskNumber !== taskNumber);
    let refusal: string | undefined;
    if (malformedDependency) {
      refusal = "PARALLEL_CLASSIFICATION_REFUSED";
    } else if (valid.externalActions.length > 0) {
      refusal = "PARALLEL_EXTERNAL_ACTION_REFUSED";
    } else if (valid.lane !== "Standard" || valid.mode !== "Draft" || valid.dependencies.length > 0) {
      refusal = "PARALLEL_EXCLUSIVE_REFUSED";
    } else if (peers.length >= 2) {
      // The limit is enforced in the same locked state transition that admits
      // the task. Reservations are intentionally unlimited; admissions are not.
      refusal = "CONCURRENCY_LIMIT";
    } else if (valid.allowedPaths.some((path) => peers.some((peer) => peer.allowedPaths.some((owned) => pathsConflict(path, owned))))) {
      refusal = "PARALLEL_SCOPE_OVERLAP";
    }
    current.admitted = !refusal;
    current.phase = refusal ? "refused" : "defined";
    current.blocker = refusal;
    current.updatedAt = now();
  }), taskNumber);
}

export function taskArtifactPaths(taskNumber: number): string[] {
  const n = pad(taskNumber);
  return [
    `docs/ai-work/tasks/${n}-brief.md`,
    `docs/ai-work/tasks/${n}-approval.json`,
    `docs/ai-work/tasks/${n}-report.md`,
    `docs/ai-work/tasks/${n}-decision.json`,
  ];
}

export function effectiveAllowedPaths(task: CoordinatorTask): string[] {
  return [...new Set([...task.allowedPaths, ...taskArtifactPaths(task.taskNumber)])];
}

export function builderWritablePaths(task: CoordinatorTask): string[] {
  return [...new Set([...task.allowedPaths, `docs/ai-work/tasks/${pad(task.taskNumber)}-report.md`])];
}

function waitingReason(state: CoordinatorState, task: CoordinatorTask): string {
  if (["integrated", "refused", "queued", "integrating"].includes(task.phase) || !task.admitted) return "";
  if (state.integrationLease || state.integrationQueue.length > 0) {
    return "INTEGRATION_PENDING — shared decisions are serialized before another build starts.";
  }
  return "";
}

export function coordinatorSummary(root: string): CoordinatorSummary {
  const state = readCoordinatorState(root);
  return {
    enabled: true,
    label: COORDINATOR_LABEL,
    projectRoot: state.projectRoot,
    integratedMain: state.integratedMain,
    tasks: state.tasks.map((task) => ({ ...task, waitingReason: waitingReason(state, task) })),
    integrationQueue: [...state.integrationQueue],
    integrationActive: state.integrationLease?.taskNumber ?? null,
  };
}

function commitNamed(worktree: string, pathsToCommit: string[], message: string): string {
  if (pathsToCommit.length === 0) throw new CoordinatorError("EMPTY_COMMIT", "There are no named task paths to commit.");
  git(worktree, ["add", "--", ...pathsToCommit]);
  git(worktree, ["commit", "-m", message]);
  return git(worktree, ["rev-parse", "HEAD"]);
}

function assertFrozenArtifacts(task: CoordinatorTask, expectedApprovalSha256 = task.approvalSha256): void {
  const briefPath = paths.brief(task.worktree, task.taskNumber);
  if (!task.briefSha256 || !existsSync(briefPath) || sha256File(briefPath) !== task.briefSha256) {
    throw new CoordinatorError("BRIEF_CHANGED", "The frozen brief is missing or its bytes changed.");
  }
  const approvalPath = paths.approval(task.worktree, task.taskNumber);
  if (!expectedApprovalSha256 || !existsSync(approvalPath) || sha256File(approvalPath) !== expectedApprovalSha256) {
    throw new CoordinatorError("APPROVAL_CHANGED", "The frozen approval is missing or its bytes changed.");
  }
  let approval: ApprovalRecord;
  try {
    approval = JSON.parse(readFileSync(approvalPath, "utf8")) as ApprovalRecord;
  } catch {
    throw new CoordinatorError("APPROVAL_CHANGED", "The frozen approval is not valid JSON.");
  }
  if (approval.taskNumber !== task.taskNumber || resolve(approval.briefPath) !== resolve(briefPath) ||
      approval.briefSha256 !== task.briefSha256) {
    throw new CoordinatorError("APPROVAL_CHANGED", "The approval no longer names the frozen task and brief.");
  }
}

export function assertCoordinatorApprovable(root: string, taskNumber: number): CoordinatorTask {
  const task = findTask(readCoordinatorState(root), taskNumber);
  if (task.phase === "refused") {
    throw new CoordinatorError(task.blocker ?? "PARALLEL_CLASSIFICATION_REFUSED", "Refused parallel work cannot be approved.");
  }
  if (!task.admitted || task.phase !== "defined") {
    throw new CoordinatorError("TASK_PHASE", "Only an admitted, fully classified parallel task can be approved.");
  }
  return task;
}

export function recordCoordinatorApproval(root: string, taskNumber: number, approvalSha256: string): CoordinatorTask {
  const task = assertCoordinatorApprovable(root, taskNumber);
  const briefPath = paths.brief(task.worktree, taskNumber);
  assertFrozenArtifacts(task, approvalSha256);
  const approvalRel = `docs/ai-work/tasks/${pad(taskNumber)}-approval.json`;
  commitNamed(task.worktree, [`docs/ai-work/tasks/${pad(taskNumber)}-brief.md`, approvalRel], `Task ${pad(taskNumber)}: pin approved parallel Draft`);
  return findTask(updateState(root, (draft) => {
    const current = findTask(draft, taskNumber);
    if (!current.admitted || current.phase !== "defined") {
      throw new CoordinatorError("TASK_PHASE", "The admitted task changed before approval was frozen.");
    }
    assertFrozenArtifacts(current, approvalSha256);
    current.approvalSha256 = approvalSha256;
    current.phase = waitingReason(draft, current) ? "waiting" : "approved";
    current.updatedAt = now();
  }), taskNumber);
}

function rebaseOnto(root: string, task: CoordinatorTask, mainCommit: string): void {
  if (task.baseCommit === mainCommit) return;
  const before = git(task.worktree, ["rev-parse", "HEAD"]);
  try {
    git(task.worktree, ["rebase", mainCommit]);
  } catch (err) {
    try { git(task.worktree, ["rebase", "--abort"]); } catch { /* evidence remains if Git cannot restore safely */ }
    const after = git(task.worktree, ["rev-parse", "HEAD"]);
    if (after !== before) throw new CoordinatorError("REBASE_RESTORE_FAILED", "The task branch could not be returned after a conflict.");
    throw new CoordinatorError("INTEGRATION_CONFLICT", err instanceof Error ? err.message : String(err));
  }
  updateState(root, (draft) => {
    const current = findTask(draft, task.taskNumber);
    current.baseCommit = mainCommit;
    current.updatedAt = now();
  });
}

export function beginCoordinatedBuild(root: string, taskNumber: number): CoordinatorTask {
  let state = readCoordinatorState(root);
  let task = findTask(state, taskNumber);
  if (task.phase === "refused" || !task.admitted) {
    throw new CoordinatorError(task.blocker ?? "PARALLEL_CLASSIFICATION_REFUSED", "Refused parallel work cannot be built.");
  }
  const retryingEngineFailure = task.phase === "blocked" && task.blocker === "BUILDER_ENGINE_FAILED";
  if (!task.approvalSha256 || (!retryingEngineFailure && !["approved", "waiting"].includes(task.phase))) {
    throw new CoordinatorError("TASK_PHASE", "The task is not approved and ready to build.");
  }
  // Reject obvious tampering before a rebase can touch retained task history,
  // then repeat the same check under the final state lock below.
  assertFrozenArtifacts(task);
  if (retryingEngineFailure) {
    inspectTaskScope(root, taskNumber);
  }
  const reason = waitingReason(state, task);
  if (reason) {
    if (!retryingEngineFailure) {
      updateState(root, (draft) => { findTask(draft, taskNumber).phase = "waiting"; });
    }
    throw new CoordinatorError("TASK_WAITING", reason);
  }
  const currentMain = git(root, ["rev-parse", "refs/heads/main"]);
  if (currentMain !== state.integratedMain) {
    throw new CoordinatorError("MAIN_CHANGED", "main moved outside the serialized coordinator.");
  }
  rebaseOnto(root, task, currentMain);
  state = readCoordinatorState(root);
  task = findTask(state, taskNumber);
  return findTask(updateState(root, (draft) => {
    const current = findTask(draft, taskNumber);
    if (!current.admitted || current.approvalSha256 !== task.approvalSha256) {
      throw new CoordinatorError("APPROVAL_CHANGED", "Coordinator ownership or approval changed before the build.");
    }
    if (retryingEngineFailure) {
      if (current.phase !== "blocked" || current.blocker !== "BUILDER_ENGINE_FAILED") {
        throw new CoordinatorError("RETRY_CHANGED", "The retained build changed before retry could begin.");
      }
      inspectScopeInWorktree(current, current.worktree, current.baseCommit);
    } else if (!["approved", "waiting"].includes(current.phase)) {
      throw new CoordinatorError("TASK_PHASE", "The approved task changed before the build could begin.");
    }
    const again = waitingReason(draft, current);
    if (again) throw new CoordinatorError("TASK_WAITING", again);
    if (git(root, ["rev-parse", "refs/heads/main"]) !== draft.integratedMain) {
      throw new CoordinatorError("MAIN_CHANGED", "main moved before the final build transition.");
    }
    assertFrozenArtifacts(current);
    current.phase = "building";
    current.blocker = undefined;
    current.updatedAt = now();
  }), taskNumber);
}

function workingTreePaths(worktree: string): { paths: string[]; destructive: string[] } {
  const chunks = execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], {
    cwd: worktree,
    encoding: "utf8",
  }).split("\0").filter(Boolean);
  const changed: string[] = [];
  const destructive: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const item = chunks[i];
    const code = item.slice(0, 2);
    const path = item.slice(3).replace(/\\/g, "/");
    changed.push(path);
    if (/[DRC]/.test(code)) destructive.push(path);
    if (/[RC]/.test(code) && chunks[i + 1]) i++;
  }
  return { paths: [...new Set(changed)], destructive };
}

function inspectScopeInWorktree(task: CoordinatorTask, worktree: string, baseCommit: string): string[] {
  const committed = git(worktree, ["diff", "--name-only", `${baseCommit}..HEAD`])
    .split(/\r?\n/).filter(Boolean).map((path) => path.replace(/\\/g, "/"));
  const working = workingTreePaths(worktree);
  if (working.destructive.length) {
    throw new CoordinatorError("SCOPE_GATE_FAILED", `Deletion, rename, or copy is not permitted: ${working.destructive.join(", ")}`);
  }
  const changed = [...new Set([...committed, ...working.paths])].sort();
  const allowed = new Set(effectiveAllowedPaths(task));
  const outside = changed.filter((path) => !allowed.has(path));
  if (outside.length) {
    throw new CoordinatorError("SCOPE_GATE_FAILED", `Undeclared changed path(s): ${outside.join(", ")}`);
  }
  return changed;
}

export function inspectTaskScope(root: string, taskNumber: number, baseCommit?: string): string[] {
  const state = readCoordinatorState(root);
  const task = findTask(state, taskNumber);
  return inspectScopeInWorktree(task, task.worktree, baseCommit ?? task.baseCommit);
}

export function blockEngineFailure(
  root: string,
  taskNumber: number,
  expectedPhase: "defining" | "building",
  blocker: "DEFINER_ENGINE_FAILED" | "BUILDER_ENGINE_FAILED",
): CoordinatorTask {
  return findTask(updateState(root, (draft) => {
    const task = findTask(draft, taskNumber);
    if (task.phase !== expectedPhase) {
      throw new CoordinatorError("TASK_PHASE", `Task ${pad(taskNumber)} left ${expectedPhase} before its engine failure was recorded.`);
    }
    task.phase = "blocked";
    task.blocker = blocker;
    task.updatedAt = now();
  }), taskNumber);
}

export function finishCoordinatedBuild(
  root: string,
  taskNumber: number,
  disposition: "DONE" | "STOPPED" | "UNKNOWN",
): CoordinatorTask {
  const state = readCoordinatorState(root);
  const frozen = findTask(state, taskNumber);
  const brief = paths.brief(frozen.worktree, taskNumber);
  const approval = paths.approval(frozen.worktree, taskNumber);
  if (!frozen.briefSha256 || sha256File(brief) !== frozen.briefSha256 ||
      !frozen.approvalSha256 || sha256File(approval) !== frozen.approvalSha256) {
    throw new CoordinatorError("APPROVAL_CHANGED", "The frozen brief or approval changed during the build.");
  }
  if (existsSync(decisionPath(frozen))) {
    throw new CoordinatorError("DECISION_PREEMPTED", "A builder created owner decision state and the build was blocked.");
  }
  const changed = inspectTaskScope(root, taskNumber);
  return findTask(updateState(root, (draft) => {
    const task = findTask(draft, taskNumber);
    if (task.phase !== "building") throw new CoordinatorError("TASK_PHASE", "Only a building task can finish its build.");
    task.changedPaths = changed;
    task.disposition = disposition;
    task.phase = "report";
    task.updatedAt = now();
  }), taskNumber);
}

function decisionPath(task: CoordinatorTask): string {
  return join(task.worktree, "docs", "ai-work", "tasks", `${pad(task.taskNumber)}-decision.json`);
}

export function queueTaskDecision(root: string, taskNumber: number, decision: CoordinatorDecision): CoordinatorTask {
  const state = readCoordinatorState(root);
  const task = findTask(state, taskNumber);
  if (task.phase !== "report") throw new CoordinatorError("TASK_PHASE", "A task decision requires a completed report.");
  const changed = inspectTaskScope(root, taskNumber);
  const file = decisionPath(task);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(decision, null, 2) + "\n", { flag: "wx" });
  const withDecision = inspectTaskScope(root, taskNumber);
  const decisionCommit = commitNamed(task.worktree, withDecision, `Task ${pad(taskNumber)}: parallel Draft candidate`);
  return findTask(updateState(root, (draft) => {
    const current = findTask(draft, taskNumber);
    current.changedPaths = [...new Set([...changed, `docs/ai-work/tasks/${pad(taskNumber)}-decision.json`])].sort();
    current.decision = decision;
    current.decisionCommit = decisionCommit;
    current.phase = "queued";
    current.updatedAt = now();
    if (!draft.integrationQueue.includes(taskNumber)) draft.integrationQueue.push(taskNumber);
  }), taskNumber);
}

function safeCheck(command: string): void {
  const gate = checkBashCommand(command);
  if (!gate.allowed) throw new CoordinatorError("UNSAFE_CHECK", gate.why);
  const clean = command.trim();
  const allowed = [
    /^node(?:\.exe)?\s+-e\s+["']process\.exit\(\d+\);?["']$/i,
    /^node(?:\.exe)?\s+--test(?:\s+[A-Za-z0-9_./\\:-]+)*$/i,
    /^npm(?:\.cmd)?\s+test(?:\s+--(?:\s+[A-Za-z0-9_./\\:=@-]+)*)?$/i,
    /^npm(?:\.cmd)?\s+run\s+[A-Za-z0-9_:-]+(?:\s+--(?:\s+[A-Za-z0-9_./\\:=@-]+)*)?$/i,
    /^git\s+diff\s+--check$/i,
  ].some((pattern) => pattern.test(clean));
  if (!allowed) {
    throw new CoordinatorError("UNSAFE_CHECK", `The declared check is outside the Draft allow-list: ${command}`);
  }
}

function checkEnvironment(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !/(?:TOKEN|KEY|SECRET|PASSWORD|CREDENTIAL|AUTH)/i.test(name)),
  );
}

function runChecks(task: CoordinatorTask): void {
  for (const command of task.checks) {
    safeCheck(command);
    const result = spawnSync(command, {
      cwd: task.worktree,
      shell: true,
      encoding: "utf8",
      env: { ...checkEnvironment(), CAIRN_PARALLEL_DRAFT: "1" },
    });
    if (result.status !== 0) {
      throw new CoordinatorError(
        "CHECK_FAILED",
        `${command} exited ${String(result.status)}. ${(result.stderr || result.stdout || "").trim()}`,
      );
    }
  }
}

function failIntegration(root: string, taskNumber: number, blocker: string, integrationWorktree?: string): void {
  updateState(root, (draft) => {
    const task = findTask(draft, taskNumber);
    task.phase = "blocked";
    task.blocker = blocker;
    if (integrationWorktree) task.integrationWorktree = integrationWorktree;
    task.updatedAt = now();
    draft.integrationQueue = draft.integrationQueue.filter((n) => n !== taskNumber);
    draft.integrationLease = null;
  });
}

function appendDecisionLog(worktree: string, decision: CoordinatorDecision): void {
  const clean = (s: string) => s.replace(/\|/g, "/").replace(/\r?\n/g, " ").trim();
  const row = decision.row;
  appendFileSync(
    paths.log(worktree),
    `| ${clean(row.task)} | ${clean(row.date)} | ${clean(row.lane)} | ${clean(row.mode)} | ${clean(row.outcome)} | ${clean(row.decision)} | ${clean(row.summary)} | ${clean(row.moved)} |\n`,
  );
}

function decisionPositionChanged(root: string, task: CoordinatorTask): boolean {
  if (!task.decisionCommit) return true;
  try {
    return git(root, ["rev-parse", task.branch]) !== task.decisionCommit ||
      git(task.worktree, ["rev-parse", "HEAD"]) !== task.decisionCommit;
  } catch {
    return true;
  }
}

export function integrateNext(root: string): CoordinatorTask | null {
  assertDraftRoot(root);
  assertCleanMain(root);
  let state = readCoordinatorState(root);
  if (state.integrationLease) throw new CoordinatorError("INTEGRATION_BUSY", "Another integration lease is active.");
  const taskNumber = state.integrationQueue[0];
  if (!taskNumber) return null;
  const queuedTask = findTask(state, taskNumber);
  if (!queuedTask.decisionCommit) {
    failIntegration(root, taskNumber, "DECISION_COMMIT_MISSING");
    throw new CoordinatorError("DECISION_COMMIT_MISSING", "The queued decision has no frozen task commit.");
  }
  if (decisionPositionChanged(root, queuedTask)) {
    failIntegration(root, taskNumber, "DECISION_BRANCH_MOVED");
    throw new CoordinatorError("DECISION_BRANCH_MOVED", "The task branch or worktree moved after the owner's decision.");
  }
  const decisionCommit = queuedTask.decisionCommit;
  const token = randomUUID();
  state = updateState(root, (draft) => {
    if (draft.integrationLease) throw new CoordinatorError("INTEGRATION_BUSY", "Another integration lease is active.");
    if (draft.integrationQueue[0] !== taskNumber) throw new CoordinatorError("QUEUE_CHANGED", "The integration queue changed.");
    const task = findTask(draft, taskNumber);
    task.phase = "integrating";
    task.updatedAt = now();
    draft.integrationLease = { taskNumber, token, acquiredAt: now() };
  });
  const expectedCoordinatorRevision = state.revision;
  const task = findTask(state, taskNumber);
  const expectedMain = state.integratedMain;
  let retainedIntegrationWorktree: string | undefined;
  try {
    if (git(root, ["rev-parse", "refs/heads/main"]) !== expectedMain) {
      throw new CoordinatorError("MAIN_CHANGED", "main moved after the task was queued.");
    }
    if (git(task.worktree, ["status", "--porcelain=v1", "--untracked-files=all"])) {
      throw new CoordinatorError("TASK_WORKTREE_DIRTY", "The queued task worktree is not clean.");
    }
    const integrationBase = task.decision?.decision === "accept" ? decisionCommit : expectedMain;
    retainedIntegrationWorktree = resolve(state.worktreeRoot, `integration-${pad(taskNumber)}-${Date.now()}`);
    if (!inside(tmpdir(), retainedIntegrationWorktree) || !inside(state.worktreeRoot, retainedIntegrationWorktree)) {
      throw new CoordinatorError("UNSAFE_INTEGRATION_PATH", "The integration rehearsal path escaped the temporary worktree area.");
    }
    mkdirSync(dirname(retainedIntegrationWorktree), { recursive: true });
    git(root, ["worktree", "add", "--detach", retainedIntegrationWorktree, integrationBase]);
    if (!task.decision) throw new CoordinatorError("DECISION_MISSING", "The queued task has no frozen decision.");
    if (task.decision.decision === "accept") {
      if (task.baseCommit !== expectedMain) {
        try {
          git(retainedIntegrationWorktree, ["rebase", expectedMain]);
        } catch (error) {
          try { git(retainedIntegrationWorktree, ["rebase", "--abort"]); } catch { /* retained evidence remains */ }
          throw new CoordinatorError("INTEGRATION_CONFLICT", error instanceof Error ? error.message : String(error));
        }
      }
      inspectScopeInWorktree(task, retainedIntegrationWorktree, expectedMain);
      runChecks({ ...task, worktree: retainedIntegrationWorktree });
    }
    appendDecisionLog(retainedIntegrationWorktree, task.decision);
    commitNamed(
      retainedIntegrationWorktree,
      ["docs/ai-work/LOG.md"],
      `Task ${pad(taskNumber)}: serialize parallel Draft decision`,
    );
    const integrationCommit = git(retainedIntegrationWorktree, ["rev-parse", "HEAD"]);

    const beforeAdvance = readCoordinatorState(root);
    if (beforeAdvance.integrationLease?.token !== token || beforeAdvance.integrationQueue[0] !== taskNumber) {
      throw new CoordinatorError("COORDINATOR_CHANGED", "Coordinator ownership changed during integration.");
    }
    if (beforeAdvance.revision !== expectedCoordinatorRevision) {
      throw new CoordinatorError("COORDINATOR_CHANGED", "Coordinator state changed during integration.");
    }
    if (git(root, ["rev-parse", "refs/heads/main"]) !== expectedMain) {
      throw new CoordinatorError("MAIN_CHANGED", "main or coordinator state changed before the final advance.");
    }
    if (decisionPositionChanged(root, task)) {
      throw new CoordinatorError("DECISION_BRANCH_MOVED", "The task branch or worktree moved after the owner's decision.");
    }
    assertCleanMain(root);
    git(root, ["merge", "--ff-only", integrationCommit]);
    const final = updateState(root, (draft) => {
      if (draft.integrationLease?.token !== token || draft.integrationQueue[0] !== taskNumber) {
        throw new CoordinatorError("COORDINATOR_CHANGED", "Coordinator ownership changed after the main advance.");
      }
      const current = findTask(draft, taskNumber);
      current.phase = "integrated";
      current.integrationCommit = integrationCommit;
      current.integrationWorktree = retainedIntegrationWorktree;
      current.blocker = undefined;
      current.updatedAt = now();
      draft.integratedMain = integrationCommit;
      draft.integrationQueue.shift();
      draft.integrationLease = null;
    });
    return findTask(final, taskNumber);
  } catch (err) {
    const code = err instanceof CoordinatorError ? err.code : "INTEGRATION_FAILED";
    try { failIntegration(root, taskNumber, code, retainedIntegrationWorktree); } catch { /* preserve the primary failure */ }
    throw err;
  }
}

export function metadataBlock(metadata: TaskMetadata): string {
  return `\`\`\`cairn-task-metadata\n${JSON.stringify(validateTaskMetadata(metadata), null, 2)}\n\`\`\``;
}

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
