import { createHash, randomUUID } from "node:crypto";
import {
  closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync,
  renameSync, unlinkSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import type { Engine, RunEvents } from "./agents.js";
import { hasCoordinator } from "./coordinator.js";
import { appendLogRow, isCairnProject, nextTaskNumber, pad, parseFacts, parseLog, paths, type LogRow } from "./files.js";
import { scheduledBuilderPrompt, scheduledPlannerPrompt } from "./prompts.js";
import {
  assertCleanMain, assertNoReparsePath, changedPaths, commitExact, pathInside, runShellFreeChecks,
  schedulerGit, schedulerGitDir, validateShellFreeCheck, type ShellFreeCheck,
} from "./scheduler-git.js";

export const TWO_TASK_SCHEDULER_FINAL_ENV = "CAIRN_TWO_TASK_SCHEDULER_FINAL";
export const SCHEDULER_SCHEMA = 1 as const;
const STATE_FILE = "scheduler-final-v1.json";
const PLAN_READY_WAIT = "Plan ready; waiting for the batch admission check.";
const BUILD_READY_WAIT = "Build complete; waiting for the one-at-a-time Checking gate.";

export type SchedulerPhase = "Planning" | "Building" | "Waiting" | "Checking" | "Done" | "Needs attention";
export type SchedulerStage = "planning" | "building";

export interface ScheduledPlan {
  schemaVersion: 1;
  taskNumber: number;
  outcome: string;
  independentlyUseful: string;
  lane: string;
  implementationPaths: string[];
  testPaths: string[];
  checks: ShellFreeCheck[];
  dependencies: number[];
  externalActions: string[];
  certainty: "certain" | "uncertain";
  uncertaintyReason: string;
  briefMarkdown: string;
}

export interface ScheduledTaskState {
  taskNumber: number;
  outcome: string;
  phase: SchedulerPhase;
  waitingReason: string;
  attention: string;
  ownerToken: string;
  baseCommit: string;
  branch: string;
  worktree: string;
  plan: ScheduledPlan | null;
  planSha256: string;
  briefSha256: string;
  taskCommit: string;
  integrationCommit: string;
  integrationWorktree: string;
  replans: number;
  sessions: number;
  updatedAt: string;
}

export interface SchedulerState {
  schemaVersion: 1;
  revision: number;
  runId: string;
  projectRoot: string;
  gitDir: string;
  worktreeRoot: string;
  startingMain: string;
  currentMain: string;
  pending: string;
  integrationActive: number | null;
  activeEngines: number;
  maximumActiveEngines: number;
  sessionCount: number;
  tasks: ScheduledTaskState[];
  createdAt: string;
  updatedAt: string;
  stateDigest: string;
}

export interface SchedulerSummary {
  enabled: true;
  runId: string;
  currentMain: string;
  activeEngines: number;
  maximumActiveEngines: number;
  sessionCount: number;
  integrationActive: number | null;
  tasks: Array<Pick<ScheduledTaskState,
    "taskNumber" | "outcome" | "phase" | "waitingReason" | "attention" | "branch" | "worktree" | "sessions"> & {
      implementationPaths: string[];
      testPaths: string[];
    }>;
}

export interface SchedulerRunEvents {
  onState?: (summary: SchedulerSummary) => void;
  engineEvents?: (taskNumber: number, stage: SchedulerStage) => RunEvents;
  /** Offline fault injection only. Throwing here simulates an interrupted transition. */
  onTransition?: (name: string, state: SchedulerState) => void;
}

export type SchedulerEngineFactory = (taskNumber: number, stage: SchedulerStage) => Engine;

export class SchedulerError extends Error {
  constructor(public readonly code: string, message: string) {
    super(`${code}: ${message}`);
  }
}

const now = () => new Date().toISOString();
const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

export function schedulerFinalEnabled(): boolean {
  return process.env[TWO_TASK_SCHEDULER_FINAL_ENV] === "1";
}

export function schedulerStatePaths(root: string): { dir: string; state: string; backup: string; lock: string } {
  const dir = join(schedulerGitDir(root), "cairn");
  return {
    dir,
    state: join(dir, STATE_FILE),
    backup: join(dir, `${STATE_FILE}.backup`),
    lock: join(dir, `${STATE_FILE}.lock`),
  };
}

function digestState(state: SchedulerState): string {
  return sha256(JSON.stringify({ ...state, stateDigest: "" }));
}

function atomicWrite(target: string, bytes: string): void {
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  const fd = openSync(temporary, "wx");
  try {
    writeFileSync(fd, bytes, { encoding: "utf8" });
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(temporary, target);
}

function saveState(root: string, state: SchedulerState): void {
  const statePaths = schedulerStatePaths(root);
  mkdirSync(statePaths.dir, { recursive: true });
  state.revision += 1;
  state.updatedAt = now();
  for (const task of state.tasks) task.updatedAt ||= state.updatedAt;
  state.stateDigest = digestState(state);
  if (existsSync(statePaths.state)) atomicWrite(statePaths.backup, readFileSync(statePaths.state, "utf8"));
  atomicWrite(statePaths.state, `${JSON.stringify(state, null, 2)}\n`);
}

function exactObject(value: unknown, keys: string[], code: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new SchedulerError(code, "Expected one plain object.");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.values(descriptors).some((descriptor) => !("value" in descriptor) || !descriptor.enumerable) ||
      JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) {
    throw new SchedulerError(code, "Required fields are missing or unknown/hidden fields are present.");
  }
  return value as Record<string, unknown>;
}

function validateState(value: unknown): SchedulerState {
  const state = exactObject(value, [
    "schemaVersion", "revision", "runId", "projectRoot", "gitDir", "worktreeRoot", "startingMain", "currentMain",
    "pending", "integrationActive", "activeEngines", "maximumActiveEngines", "sessionCount", "tasks", "createdAt",
    "updatedAt", "stateDigest",
  ], "SCHEDULER_STATE_INVALID") as unknown as SchedulerState;
  if (state.schemaVersion !== SCHEDULER_SCHEMA || !Number.isSafeInteger(state.revision) || state.revision < 1 ||
      !Array.isArray(state.tasks) || state.tasks.length < 1 || state.tasks.length > 2 ||
      typeof state.runId !== "string" || typeof state.projectRoot !== "string" || typeof state.gitDir !== "string" ||
      typeof state.worktreeRoot !== "string" || typeof state.stateDigest !== "string" ||
      !Number.isSafeInteger(state.activeEngines) || state.activeEngines < 0 || !Number.isSafeInteger(state.maximumActiveEngines) ||
      state.maximumActiveEngines < state.activeEngines || !Number.isSafeInteger(state.sessionCount) || state.sessionCount < 0 ||
      !(state.integrationActive === null || Number.isSafeInteger(state.integrationActive))) {
    throw new SchedulerError("SCHEDULER_STATE_INVALID", "The scheduler state has invalid core values.");
  }
  const taskNumbers = new Set<number>();
  for (const task of state.tasks) {
    exactObject(task, ["taskNumber", "outcome", "phase", "waitingReason", "attention", "ownerToken", "baseCommit", "branch",
      "worktree", "plan", "planSha256", "briefSha256", "taskCommit", "integrationCommit", "integrationWorktree", "replans",
      "sessions", "updatedAt"], "SCHEDULER_STATE_INVALID");
    if (!["Planning", "Building", "Waiting", "Checking", "Done", "Needs attention"].includes(task.phase) ||
        !Number.isSafeInteger(task.taskNumber) || task.taskNumber < 1 || taskNumbers.has(task.taskNumber) ||
        typeof task.outcome !== "string" || typeof task.waitingReason !== "string" || typeof task.attention !== "string" ||
        typeof task.ownerToken !== "string" || !task.ownerToken || typeof task.branch !== "string" || typeof task.worktree !== "string" ||
        typeof task.baseCommit !== "string" || typeof task.taskCommit !== "string" || typeof task.integrationCommit !== "string" ||
        typeof task.integrationWorktree !== "string" || !Number.isSafeInteger(task.replans) || task.replans < 0 ||
        !Number.isSafeInteger(task.sessions) || task.sessions < 0) {
      throw new SchedulerError("SCHEDULER_STATE_INVALID", "The scheduler state contains an unknown visible phase.");
    }
    taskNumbers.add(task.taskNumber);
    if (task.plan !== null) validateScheduledPlan(task.plan, state.projectRoot, task.taskNumber);
    if (task.worktree && !pathInside(state.worktreeRoot, task.worktree)) throw new SchedulerError("SCHEDULER_STATE_INVALID", "A task worktree escaped its owned scheduler root.");
    if (task.integrationWorktree && !pathInside(state.worktreeRoot, task.integrationWorktree)) throw new SchedulerError("SCHEDULER_STATE_INVALID", "An integration worktree escaped its owned scheduler root.");
  }
  if (digestState(state) !== state.stateDigest) throw new SchedulerError("SCHEDULER_STATE_INVALID", "The scheduler state digest does not match its bytes.");
  return state;
}

export function readSchedulerState(root: string): SchedulerState | null {
  const statePath = schedulerStatePaths(root).state;
  if (!existsSync(statePath)) return null;
  let value: unknown;
  try { value = JSON.parse(readFileSync(statePath, "utf8")); }
  catch { throw new SchedulerError("SCHEDULER_STATE_INVALID", "The scheduler state is not valid JSON."); }
  const state = validateState(value);
  if (resolve(root) !== state.projectRoot || schedulerGitDir(root) !== state.gitDir) {
    throw new SchedulerError("SCHEDULER_STATE_INVALID", "The scheduler state belongs to another repository.");
  }
  return state;
}

function summaryOf(state: SchedulerState): SchedulerSummary {
  return {
    enabled: true,
    runId: state.runId,
    currentMain: state.currentMain,
    activeEngines: state.activeEngines,
    maximumActiveEngines: state.maximumActiveEngines,
    sessionCount: state.sessionCount,
    integrationActive: state.integrationActive,
    tasks: state.tasks.map((task) => ({
      taskNumber: task.taskNumber,
      outcome: task.outcome,
      phase: task.phase,
      waitingReason: task.waitingReason,
      attention: task.attention,
      branch: task.branch,
      worktree: task.worktree,
      sessions: task.sessions,
      implementationPaths: task.plan?.implementationPaths ?? [],
      testPaths: task.plan?.testPaths ?? [],
    })),
  };
}

export function schedulerSummary(root: string): SchedulerSummary | null {
  if (!existsSync(join(resolve(root), ".git"))) return null;
  const state = readSchedulerState(root);
  return state ? summaryOf(state) : null;
}

export function hasActiveScheduledBatch(root: string): boolean {
  if (!existsSync(join(resolve(root), ".git"))) return false;
  const state = readSchedulerState(root);
  return Boolean(state && state.tasks.some((task) => task.phase !== "Done"));
}

function assertNoDuplicateJsonKeys(text: string): void {
  const stack: Array<{ kind: "object" | "array"; keys?: Set<string>; expectingKey?: boolean }> = [];
  let index = 0;
  const skipSpace = () => { while (/\s/.test(text[index] ?? "")) index += 1; };
  const readString = (): string => {
    const start = index++;
    for (;;) {
      if (index >= text.length) throw new SchedulerError("PLAN_INVALID", "The plan contains an unterminated JSON string.");
      if (text[index] === "\\") { index += 2; continue; }
      if (text[index] === '"') { index += 1; break; }
      index += 1;
    }
    try { return JSON.parse(text.slice(start, index)) as string; }
    catch { throw new SchedulerError("PLAN_INVALID", "The plan contains an invalid JSON string."); }
  };
  while (index < text.length) {
    skipSpace();
    const character = text[index];
    if (!character) break;
    if (character === "{") { stack.push({ kind: "object", keys: new Set(), expectingKey: true }); index += 1; continue; }
    if (character === "[") { stack.push({ kind: "array" }); index += 1; continue; }
    if (character === "}" || character === "]") { stack.pop(); index += 1; continue; }
    if (character === ",") { index += 1; const top = stack.at(-1); if (top?.kind === "object") top.expectingKey = true; continue; }
    if (character === ":") { index += 1; continue; }
    if (character === '"') {
      const value = readString();
      skipSpace();
      const top = stack.at(-1);
      if (top?.kind === "object" && top.expectingKey && text[index] === ":") {
        if (top.keys!.has(value)) throw new SchedulerError("PLAN_INVALID", `Duplicate JSON key refused: ${value}`);
        top.keys!.add(value);
        top.expectingKey = false;
      }
      continue;
    }
    while (index < text.length && !/[\s,}\]]/.test(text[index])) index += 1;
  }
}

function exactPath(root: string, input: unknown): string {
  if (typeof input !== "string") throw new SchedulerError("PLAN_INVALID", "Every declared path must be text.");
  const value = input;
  if (!value || value !== value.replace(/\\/g, "/") || isAbsolute(value) || /^[A-Za-z]:/.test(value) || value.startsWith("//") ||
      value === "." || value === ".." || value.startsWith("../") || value.includes("/../") || value.includes("/./") ||
      value.endsWith("/") || value.includes("//") || value.includes(":") || /[*?\[\]{}$`%]/.test(value)) {
    throw new SchedulerError("PLAN_INVALID", `Non-canonical path refused: ${String(input)}`);
  }
  const normalized = relative(".", value).replace(/\\/g, "/");
  if (normalized !== value || value === "docs/ai-work/LOG.md" || value.startsWith(".git/") || /^docs\/ai-work\/tasks\/\d{3}-/.test(value)) {
    throw new SchedulerError("PLAN_INVALID", `Protected or non-normalized path refused: ${value}`);
  }
  const absolute = resolve(root, value);
  if (!pathInside(root, absolute)) throw new SchedulerError("PLAN_INVALID", `Path escaped the repository: ${value}`);
  if (existsSync(absolute) && !lstatSync(absolute).isFile()) {
    throw new SchedulerError("PLAN_INVALID", `Writable paths must name files, not directories: ${value}`);
  }
  assertNoReparsePath(root, value);
  return value;
}

function pathList(root: string, value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0) throw new SchedulerError("PLAN_INVALID", `${field} must contain exact file paths.`);
  const result = value.map((path) => exactPath(root, path));
  if (new Set(result.map((path) => path.toLocaleLowerCase("en-US"))).size !== result.length) {
    throw new SchedulerError("PLAN_INVALID", `${field} contains a duplicate or case alias.`);
  }
  for (let left = 0; left < result.length; left += 1) {
    for (let right = left + 1; right < result.length; right += 1) {
      if (pathsOverlap([result[left]], [result[right]])) {
        throw new SchedulerError("PLAN_INVALID", `${field} contains a file/directory ancestor overlap.`);
      }
    }
  }
  return result;
}

function pathsOverlap(first: string[], second: string[]): boolean {
  for (const leftRaw of first) {
    const left = leftRaw.toLocaleLowerCase("en-US");
    for (const rightRaw of second) {
      const right = rightRaw.toLocaleLowerCase("en-US");
      if (left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`)) return true;
    }
  }
  return false;
}

export function validateScheduledPlan(value: unknown, root: string, taskNumber: number): ScheduledPlan {
  const object = exactObject(value, ["schemaVersion", "taskNumber", "outcome", "independentlyUseful", "lane", "implementationPaths",
    "testPaths", "checks", "dependencies", "externalActions", "certainty", "uncertaintyReason", "briefMarkdown"], "PLAN_INVALID");
  if (object.schemaVersion !== 1 || object.taskNumber !== taskNumber || typeof object.outcome !== "string" || !object.outcome.trim() ||
      typeof object.independentlyUseful !== "string" || !object.independentlyUseful.trim() || typeof object.lane !== "string" ||
      !Array.isArray(object.dependencies) || object.dependencies.some((item) => !Number.isSafeInteger(item)) ||
      !Array.isArray(object.externalActions) || object.externalActions.some((item) => typeof item !== "string") ||
      !["certain", "uncertain"].includes(String(object.certainty)) || typeof object.uncertaintyReason !== "string" ||
      typeof object.briefMarkdown !== "string" || object.briefMarkdown.length < 40 || object.briefMarkdown.length > 40_000) {
    throw new SchedulerError("PLAN_INVALID", "The plan has missing or invalid values.");
  }
  if (!Array.isArray(object.checks) || object.checks.length === 0) throw new SchedulerError("PLAN_INVALID", "At least one exact check is required.");
  const checks = object.checks.map((raw) => {
    const check = exactObject(raw, ["executable", "args"], "PLAN_INVALID");
    if (typeof check.executable !== "string" || !Array.isArray(check.args) || check.args.some((arg) => typeof arg !== "string")) {
      throw new SchedulerError("PLAN_INVALID", "Every check needs one executable and a literal argument array.");
    }
    return validateShellFreeCheck({ executable: check.executable, args: check.args as string[] });
  });
  const implementationPaths = pathList(root, object.implementationPaths, "implementationPaths");
  const testPaths = pathList(root, object.testPaths, "testPaths");
  if (pathsOverlap(implementationPaths, testPaths)) throw new SchedulerError("PLAN_INVALID", "Implementation and test paths overlap.");
  return {
    schemaVersion: 1,
    taskNumber,
    outcome: object.outcome.trim(),
    independentlyUseful: object.independentlyUseful.trim(),
    lane: object.lane.trim(),
    implementationPaths,
    testPaths,
    checks,
    dependencies: [...object.dependencies] as number[],
    externalActions: [...object.externalActions] as string[],
    certainty: object.certainty as "certain" | "uncertain",
    uncertaintyReason: object.uncertaintyReason.trim(),
    briefMarkdown: object.briefMarkdown.endsWith("\n") ? object.briefMarkdown : `${object.briefMarkdown}\n`,
  };
}

export function parseScheduledPlan(text: string, root: string, taskNumber: number): ScheduledPlan {
  const trimmed = text.trim();
  assertNoDuplicateJsonKeys(trimmed);
  let value: unknown;
  try { value = JSON.parse(trimmed); }
  catch { throw new SchedulerError("PLAN_INVALID", "Planning did not return one strict JSON object."); }
  return validateScheduledPlan(value, root, taskNumber);
}

function acquireLock(root: string, runId: string): string {
  const statePaths = schedulerStatePaths(root);
  mkdirSync(statePaths.dir, { recursive: true });
  const token = randomUUID();
  const fd = openSync(statePaths.lock, "wx");
  try {
    writeFileSync(fd, `${JSON.stringify({ runId, token, pid: process.pid, createdAt: now() })}\n`, { encoding: "utf8" });
    fsyncSync(fd);
  } finally { closeSync(fd); }
  return token;
}

function releaseLock(root: string, token: string): void {
  const lock = schedulerStatePaths(root).lock;
  if (!existsSync(lock)) return;
  let saved: { token?: string } = {};
  try { saved = JSON.parse(readFileSync(lock, "utf8")) as { token?: string }; } catch { return; }
  if (saved.token === token) unlinkSync(lock);
}

function processExists(pid: number): boolean {
  try { process.kill(pid, 0); return true; }
  catch { return false; }
}

function assertSupportedRoot(root: string): string {
  if (!schedulerFinalEnabled()) throw new SchedulerError("SCHEDULER_DISABLED", `${TWO_TASK_SCHEDULER_FINAL_ENV}=1 is required.`);
  const projectRoot = resolve(root);
  if (!pathInside(tmpdir(), projectRoot) || projectRoot === resolve(tmpdir())) {
    throw new SchedulerError("SCHEDULER_SYNTHETIC_ONLY", "The unactivated Final accepts only a new disposable project beneath the temporary directory.");
  }
  if (!isCairnProject(projectRoot)) throw new SchedulerError("CAIRN_PROJECT_REQUIRED", "The selected folder has no Cairn project contract.");
  const facts = parseFacts(projectRoot);
  if (facts.status !== "ACTIVE" || !/^2(?:\.|$)/.test(facts.contractVersion)) {
    throw new SchedulerError("CONTRACT_V2_REQUIRED", "An active Cairn Contract v2.x project is required.");
  }
  if (process.env.CAIRN_PARALLEL_DRAFT === "1" || hasCoordinator(projectRoot)) {
    throw new SchedulerError("OTHER_COORDINATOR_ACTIVE", "The historical Parallel Draft must remain off.");
  }
  const gitDir = schedulerGitDir(projectRoot);
  if (existsSync(join(gitDir, "cairn", "concurrent-final-v3.json"))) {
    throw new SchedulerError("OTHER_COORDINATOR_ACTIVE", "A bounded Final run already owns this repository.");
  }
  return projectRoot;
}

function taskScope(task: ScheduledTaskState): string[] {
  if (!task.plan) return [];
  return [...task.plan.implementationPaths, ...task.plan.testPaths,
    `docs/ai-work/tasks/${pad(task.taskNumber)}-brief.md`, `docs/ai-work/tasks/${pad(task.taskNumber)}-report.md`];
}

function isBuildReady(task: ScheduledTaskState): boolean {
  return Boolean(task.taskCommit && task.phase === "Waiting" && task.waitingReason === BUILD_READY_WAIT);
}

function assertOwnedTask(state: SchedulerState, task: ScheduledTaskState, requireFrozenCommit = false): void {
  const id = pad(task.taskNumber);
  if (!task.ownerToken || task.branch !== `cairn/task-${id}-${state.runId.slice(0, 8)}` ||
      !task.worktree || !pathInside(state.worktreeRoot, task.worktree) || schedulerGitDir(task.worktree) !== state.gitDir) {
    throw new SchedulerError("TASK_OWNERSHIP_CHANGED", "The task branch or worktree is no longer proved scheduler-owned.");
  }
  if (schedulerGit(task.worktree, ["branch", "--show-current"]) !== task.branch) {
    throw new SchedulerError("TASK_OWNERSHIP_CHANGED", "The task worktree is on an unexpected branch.");
  }
  const head = schedulerGit(task.worktree, ["rev-parse", "HEAD"]);
  if (schedulerGit(task.worktree, ["rev-parse", `refs/heads/${task.branch}`]) !== head) {
    throw new SchedulerError("TASK_COMMIT_CHANGED", "The task branch and worktree no longer name the same commit.");
  }
  schedulerGit(task.worktree, ["merge-base", "--is-ancestor", task.baseCommit, head]);
  if (requireFrozenCommit && (head !== task.taskCommit || schedulerGit(task.worktree, ["status", "--porcelain=v1", "--untracked-files=all"]))) {
    throw new SchedulerError("TASK_COMMIT_CHANGED", "The frozen task commit or worktree changed before integration.");
  }
}

function fixedAttention(error: unknown, fallback: string): string {
  if (error instanceof SchedulerError) return error.code;
  const value = error as { code?: unknown };
  return typeof value?.code === "string" && /^[A-Z0-9_]+$/.test(value.code) ? value.code : fallback;
}

export async function startScheduledBatch(
  root: string,
  outcomes: string[],
  engineFactory: SchedulerEngineFactory,
  events: SchedulerRunEvents = {},
): Promise<SchedulerSummary> {
  const projectRoot = assertSupportedRoot(root);
  if (!Array.isArray(outcomes) || outcomes.length < 1 || outcomes.length > 2 || outcomes.some((outcome) => typeof outcome !== "string" || outcome.trim().length < 5)) {
    throw new SchedulerError("OUTCOMES_INVALID", "Choose one or two clear outcomes.");
  }
  const existing = readSchedulerState(projectRoot);
  if (existing && existing.tasks.some((task) => task.phase !== "Done")) {
    throw new SchedulerError("SCHEDULER_ACTIVE", "This project already has an unfinished scheduler batch.");
  }
  const startingMain = assertCleanMain(projectRoot);
  const runId = randomUUID();
  const lockToken = acquireLock(projectRoot, runId);
  const firstTask = nextTaskNumber(projectRoot);
  const worktreeRoot = join(tmpdir(), `cairn-scheduler-${runId}`);
  const state: SchedulerState = {
    schemaVersion: 1, revision: 0, runId, projectRoot, gitDir: schedulerGitDir(projectRoot), worktreeRoot,
    startingMain, currentMain: startingMain, pending: "batch-reservation", integrationActive: null,
    activeEngines: 0, maximumActiveEngines: 0, sessionCount: 0,
    tasks: outcomes.map((outcome, index): ScheduledTaskState => ({
      taskNumber: firstTask + index, outcome: outcome.trim(), phase: "Planning", waitingReason: "", attention: "",
      ownerToken: randomUUID(), baseCommit: startingMain, branch: "", worktree: "", plan: null, planSha256: "",
      briefSha256: "", taskCommit: "", integrationCommit: "", integrationWorktree: "", replans: 0, sessions: 0, updatedAt: now(),
    })),
    createdAt: now(), updatedAt: now(), stateDigest: "",
  };

  const publish = (transition: string): void => {
    state.pending = transition;
    saveState(projectRoot, state);
    events.onState?.(summaryOf(state));
    events.onTransition?.(transition, structuredClone(state));
  };

  const runEngine = async (task: ScheduledTaskState, stage: SchedulerStage, spec: Parameters<Engine["run"]>[0]) => {
    state.activeEngines += 1;
    state.maximumActiveEngines = Math.max(state.maximumActiveEngines, state.activeEngines);
    state.sessionCount += 1;
    task.sessions += 1;
    publish(`${stage}-start:${task.taskNumber}`);
    try {
      return await engineFactory(task.taskNumber, stage).run(spec, events.engineEvents?.(task.taskNumber, stage) ?? {});
    } finally {
      state.activeEngines -= 1;
      publish(`${stage}-result:${task.taskNumber}`);
    }
  };

  const savePlanEvidence = (task: ScheduledTaskState, plan: ScheduledPlan, replan: boolean): void => {
    const id = pad(task.taskNumber);
    const previousPlanSha = task.planSha256;
    if (!task.worktree) {
      task.branch = `cairn/task-${id}-${runId.slice(0, 8)}`;
      task.worktree = join(worktreeRoot, `task-${id}`);
      publish(`task-worktree-intent:${task.taskNumber}`);
      schedulerGit(projectRoot, ["worktree", "add", "-b", task.branch, task.worktree, task.baseCommit]);
      publish(`task-worktree-created:${task.taskNumber}`);
    } else if (replan && task.baseCommit !== state.currentMain) {
      publish(`replan-rebase-intent:${task.taskNumber}`);
      schedulerGit(task.worktree, ["rebase", state.currentMain]);
      task.baseCommit = state.currentMain;
      publish(`replan-rebase-observed:${task.taskNumber}`);
    }
    const briefPath = paths.brief(task.worktree, task.taskNumber);
    publish(`brief-write-intent:${task.taskNumber}`);
    mkdirSync(dirname(briefPath), { recursive: true });
    writeFileSync(briefPath, plan.briefMarkdown, { encoding: "utf8", flag: replan ? "w" : "wx" });
    publish(`brief-written:${task.taskNumber}`);
    task.plan = plan;
    task.planSha256 = sha256(JSON.stringify(plan));
    task.briefSha256 = sha256(plan.briefMarkdown);
    publish(`brief-commit-intent:${task.taskNumber}`);
    const briefRelative = `docs/ai-work/tasks/${id}-brief.md`;
    const briefChanged = Boolean(
      schedulerGit(task.worktree, ["diff", "--name-only", "--", briefRelative]) ||
      schedulerGit(task.worktree, ["ls-files", "--others", "--exclude-standard", "--", briefRelative]),
    );
    if (briefChanged) {
      commitExact(task.worktree, [briefRelative], `Task ${id}: freeze scheduled plan${replan ? " revision" : ""}`);
    } else if (!replan || previousPlanSha !== task.planSha256) {
      throw new SchedulerError("PLAN_BRIEF_MISMATCH", "A changed re-plan did not produce changed brief evidence.");
    }
    publish(`brief-committed:${task.taskNumber}`);
  };

  const planTask = async (task: ScheduledTaskState, replan = false): Promise<void> => {
    task.phase = "Planning";
    task.waitingReason = "";
    task.attention = "";
    if (replan) task.replans += 1;
    publish(`planning:${task.taskNumber}`);
    try {
      const prompt = scheduledPlannerPrompt(projectRoot, task.taskNumber, task.outcome);
      const result = await runEngine(task, "planning", {
        role: "definer", root: projectRoot, taskNumber: task.taskNumber, system: prompt.system, user: prompt.user,
        schedulerProfile: "scheduler-planning",
      });
      const plan = parseScheduledPlan(result.text, projectRoot, task.taskNumber);
      savePlanEvidence(task, plan, replan);
      if (plan.certainty !== "certain") {
        task.phase = "Waiting";
        task.waitingReason = plan.uncertaintyReason || "Planning needs a clearer exact path declaration.";
      } else if (plan.lane !== "Standard") {
        task.phase = "Waiting";
        task.waitingReason = `${plan.lane || "Unknown"} work must use Cairn's ordinary lane.`;
      } else if (plan.dependencies.length > 0) {
        task.phase = "Waiting";
        task.waitingReason = "Dependent work is not eligible for the two-task scheduler.";
      } else if (plan.externalActions.length > 0) {
        task.phase = "Waiting";
        task.waitingReason = "External-action work needs its own explicit approval path.";
      } else {
        task.phase = "Waiting";
        task.waitingReason = PLAN_READY_WAIT;
      }
    } catch (error) {
      task.phase = "Waiting";
      task.waitingReason = `Planning needs attention before product work can start (${fixedAttention(error, "PLAN_INVALID")}).`;
    }
    publish(`plan-recorded:${task.taskNumber}`);
  };

  const plansOverlap = (left: ScheduledTaskState, right: ScheduledTaskState): boolean => {
    if (!left.plan || !right.plan) return true;
    return pathsOverlap([...left.plan.implementationPaths, ...left.plan.testPaths], [...right.plan.implementationPaths, ...right.plan.testPaths]);
  };

  const buildTask = async (task: ScheduledTaskState): Promise<void> => {
    if (!task.plan || !task.worktree) return;
    task.phase = "Building";
    task.waitingReason = "";
    publish(`building:${task.taskNumber}`);
    try {
      assertOwnedTask(state, task);
      if (sha256(JSON.stringify(task.plan)) !== task.planSha256 || sha256(readFileSync(paths.brief(task.worktree, task.taskNumber), "utf8")) !== task.briefSha256) {
        throw new SchedulerError("PLAN_CHANGED", "The frozen plan or brief changed before builder control.");
      }
      if (schedulerGit(projectRoot, ["rev-parse", "refs/heads/main"]) !== state.currentMain) {
        throw new SchedulerError("MAIN_CHANGED", "main moved outside the scheduler.");
      }
      const prompt = scheduledBuilderPrompt(task.worktree, task.taskNumber);
      await runEngine(task, "building", {
        role: "builder", root: task.worktree, taskNumber: task.taskNumber, system: prompt.system, user: prompt.user,
        schedulerProfile: "scheduler-building", allowedPaths: taskScope(task).filter((path) => !path.endsWith("-brief.md")),
      });
      const changed = changedPaths(task.worktree, task.baseCommit);
      if (changed.destructive.length > 0) throw new SchedulerError("BUILDER_SCOPE_FAILED", `Deletion, rename, or copy refused: ${changed.destructive.join(", ")}`);
      const allowed = new Set(taskScope(task));
      const outside = changed.paths.filter((path) => !allowed.has(path));
      if (outside.length > 0) throw new SchedulerError("BUILDER_SCOPE_FAILED", `Undeclared paths changed: ${outside.join(", ")}`);
      const brief = readFileSync(paths.brief(task.worktree, task.taskNumber), "utf8");
      if (sha256(brief) !== task.briefSha256) throw new SchedulerError("PLAN_CHANGED", "The builder changed the frozen brief.");
      const report = paths.report(task.worktree, task.taskNumber);
      if (!existsSync(report) || !/Disposition:\s*DONE/i.test(readFileSync(report, "utf8"))) {
        throw new SchedulerError("BUILD_STOPPED", "The builder did not produce a DONE report.");
      }
      publish(`local-checks-intent:${task.taskNumber}`);
      runShellFreeChecks(task.worktree, task.plan.checks);
      publish(`local-checks-passed:${task.taskNumber}`);
      publish(`task-commit-intent:${task.taskNumber}`);
      task.taskCommit = commitExact(task.worktree, changed.paths, `Task ${pad(task.taskNumber)}: scheduled Standard result`);
      task.phase = "Waiting";
      task.waitingReason = BUILD_READY_WAIT;
      publish(`task-commit:${task.taskNumber}`);
    } catch (error) {
      task.phase = "Needs attention";
      task.attention = fixedAttention(error, "BUILD_FAILED");
      task.waitingReason = "";
      publish(`build-needs-attention:${task.taskNumber}`);
    }
  };

  const integrateTask = (task: ScheduledTaskState): void => {
    if (!task.plan || !task.taskCommit) return;
    task.phase = "Checking";
    task.waitingReason = "";
    state.integrationActive = task.taskNumber;
    const integration = join(worktreeRoot, `integration-${pad(task.taskNumber)}`);
    task.integrationWorktree = integration;
    publish(`integration-worktree-intent:${task.taskNumber}`);
    try {
      assertOwnedTask(state, task, true);
      if (sha256(JSON.stringify(task.plan)) !== task.planSha256 || sha256(readFileSync(paths.brief(task.worktree, task.taskNumber), "utf8")) !== task.briefSha256) {
        throw new SchedulerError("PLAN_CHANGED", "The frozen task plan or brief changed before Checking.");
      }
      const frozen = changedPaths(task.worktree, task.baseCommit);
      const frozenAllowed = new Set(taskScope(task));
      if (frozen.destructive.length || frozen.paths.some((path) => !frozenAllowed.has(path))) {
        throw new SchedulerError("TASK_COMMIT_CHANGED", "The frozen task commit contains undeclared or destructive changes.");
      }
      if (schedulerGit(projectRoot, ["rev-parse", "refs/heads/main"]) !== state.currentMain) {
        throw new SchedulerError("MAIN_CHANGED", "main moved before Checking.");
      }
      assertCleanMain(projectRoot);
      schedulerGit(projectRoot, ["worktree", "add", "--detach", integration, state.currentMain]);
      publish(`integration-worktree-created:${task.taskNumber}`);
      const commits = schedulerGit(task.worktree, ["rev-list", "--reverse", `${task.baseCommit}..${task.taskCommit}`]).split(/\r?\n/).filter(Boolean);
      if (commits.length === 0) throw new SchedulerError("TASK_COMMIT_MISSING", "The frozen task commit has no changes to apply.");
      publish(`integration-commit-intent:${task.taskNumber}`);
      schedulerGit(integration, ["cherry-pick", ...commits]);
      publish(`integration-commit-applied:${task.taskNumber}`);
      const inspected = changedPaths(integration, state.currentMain);
      const allowed = new Set(taskScope(task));
      const outside = inspected.paths.filter((path) => !allowed.has(path));
      if (inspected.destructive.length || outside.length) throw new SchedulerError("INTEGRATION_SCOPE_FAILED", "The latest-main candidate changed undeclared paths.");
      publish(`integration-checks-intent:${task.taskNumber}`);
      runShellFreeChecks(integration, task.plan.checks);
      publish(`integration-checks-passed:${task.taskNumber}`);
      if (parseLog(integration).some((row) => row.task === pad(task.taskNumber))) {
        throw new SchedulerError("DUPLICATE_LOG_ROW", "The latest main already contains a row for this scheduled task.");
      }
      const row: LogRow = {
        task: pad(task.taskNumber), date: new Date().toISOString().slice(0, 10), lane: "Standard", mode: "Applied",
        outcome: "DONE", decision: "completed", summary: task.outcome, moved: "YES",
      };
      publish(`log-write-intent:${task.taskNumber}`);
      appendLogRow(integration, row);
      publish(`log-written:${task.taskNumber}`);
      publish(`log-commit-intent:${task.taskNumber}`);
      commitExact(integration, ["docs/ai-work/LOG.md"], `Task ${pad(task.taskNumber)}: record scheduled result`);
      task.integrationCommit = schedulerGit(integration, ["rev-parse", "HEAD"]);
      publish(`integration-candidate-frozen:${task.taskNumber}`);
      publish(`main-fast-forward-intent:${task.taskNumber}:${state.currentMain}:${task.integrationCommit}`);
      if (state.integrationActive !== task.taskNumber || schedulerGit(integration, ["rev-parse", "HEAD"]) !== task.integrationCommit ||
          schedulerGit(integration, ["status", "--porcelain=v1", "--untracked-files=all"]) ||
          schedulerGit(task.worktree, ["rev-parse", "HEAD"]) !== task.taskCommit ||
          schedulerGit(projectRoot, ["rev-parse", "refs/heads/main"]) !== state.currentMain) {
        throw new SchedulerError("MAIN_CHANGED", "The checked candidate, frozen task, lease, or main changed before fast-forward.");
      }
      schedulerGit(projectRoot, ["merge", "--ff-only", task.integrationCommit]);
      state.currentMain = task.integrationCommit;
      publish(`main-fast-forward-observed:${task.taskNumber}`);
      publish(`integration-worktree-cleanup-intent:${task.taskNumber}`);
      schedulerGit(projectRoot, ["worktree", "remove", integration]);
      task.integrationWorktree = "";
      publish(`integration-worktree-cleaned:${task.taskNumber}`);
      publish(`task-worktree-cleanup-intent:${task.taskNumber}`);
      schedulerGit(projectRoot, ["worktree", "remove", task.worktree]);
      task.worktree = "";
      publish(`task-worktree-cleaned:${task.taskNumber}`);
      // Cherry-pick creates equivalent commits with new ids. Move only the exact
      // coordinator-owned branch from its frozen task commit to the integrated
      // commit, using compare-and-swap, so normal merged-branch deletion applies.
      publish(`task-branch-cleanup-intent:${task.taskNumber}`);
      schedulerGit(projectRoot, ["update-ref", `refs/heads/${task.branch}`, task.integrationCommit, task.taskCommit]);
      schedulerGit(projectRoot, ["branch", "-d", task.branch]);
      task.branch = "";
      publish(`task-branch-cleaned:${task.taskNumber}`);
      task.phase = "Done";
      task.attention = "";
      publish(`cleanup-complete:${task.taskNumber}`);
    } catch (error) {
      task.phase = "Needs attention";
      task.attention = fixedAttention(error, "INTEGRATION_FAILED");
      task.waitingReason = "";
      publish(`checking-needs-attention:${task.taskNumber}`);
    } finally {
      state.integrationActive = null;
    }
  };

  publish("batch-reserved");
  try {
    publish("worktree-root-intent");
    mkdirSync(worktreeRoot, { recursive: false });
    publish("worktree-root-created");
    await Promise.all(state.tasks.map((task) => planTask(task)));

    const eligible: ScheduledTaskState[] = [];
    for (const task of state.tasks) {
      if (!task.plan || task.phase !== "Waiting" || task.waitingReason !== PLAN_READY_WAIT ||
          task.plan.certainty !== "certain" || task.plan.lane !== "Standard" ||
          task.plan.dependencies.length || task.plan.externalActions.length) continue;
      const earlier = state.tasks.filter((other) => other.taskNumber < task.taskNumber && other.plan);
      if (earlier.some((other) => plansOverlap(other, task))) {
        task.phase = "Waiting";
        task.waitingReason = "Declared paths overlap an earlier task; it will be reconsidered after that task reaches Done.";
        publish(`scope-wait:${task.taskNumber}`);
      } else {
        eligible.push(task);
      }
    }

    await Promise.all(eligible.map((task) => buildTask(task)));
    for (const task of eligible.filter(isBuildReady)
      .sort((a, b) => a.taskNumber - b.taskNumber)) integrateTask(task);

    for (const task of state.tasks.filter((candidate) => candidate.phase === "Waiting" && /overlap/i.test(candidate.waitingReason))) {
      const conflicts = state.tasks.filter((other) => other.taskNumber < task.taskNumber && other.phase !== "Done" && plansOverlap(other, task));
      if (conflicts.length > 0) continue;
      await planTask(task, true);
      const stillConflicts = state.tasks.some((other) => other.taskNumber < task.taskNumber && other.phase !== "Done" && plansOverlap(other, task));
      if (task.phase === "Waiting" && task.waitingReason === PLAN_READY_WAIT && task.plan?.certainty === "certain" &&
          task.plan.lane === "Standard" && !task.plan.dependencies.length &&
          !task.plan.externalActions.length && !stillConflicts) {
        await buildTask(task);
        if (isBuildReady(task)) integrateTask(task);
      }
    }
    state.pending = "";
    saveState(projectRoot, state);
    events.onState?.(summaryOf(state));
    return summaryOf(state);
  } finally {
    releaseLock(projectRoot, lockToken);
  }
}

export function recoverScheduledBatch(root: string): SchedulerSummary | null {
  const projectRoot = resolve(root);
  const state = readSchedulerState(projectRoot);
  if (!state) return null;
  const lockPath = schedulerStatePaths(projectRoot).lock;
  if (existsSync(lockPath)) {
    let lock: { runId?: string; token?: string; pid?: number } = {};
    try { lock = JSON.parse(readFileSync(lockPath, "utf8")) as typeof lock; }
    catch { throw new SchedulerError("RECOVERY_UNPROVED", "The scheduler lock is malformed."); }
    if (lock.runId !== state.runId || typeof lock.pid !== "number" || processExists(lock.pid)) {
      throw new SchedulerError("RECOVERY_UNPROVED", "The scheduler lock is still active or belongs to another run.");
    }
    unlinkSync(lockPath);
  }
  const actualMain = schedulerGit(projectRoot, ["rev-parse", "refs/heads/main"]);
  state.currentMain = actualMain;
  state.activeEngines = 0;
  state.integrationActive = null;
  for (const task of state.tasks) {
    if (task.phase === "Done" || task.phase === "Needs attention" || task.phase === "Waiting") continue;
    task.phase = "Needs attention";
    task.attention = task.integrationCommit && task.integrationCommit === actualMain
      ? "INTERRUPTED_AFTER_MAIN_ADVANCE"
      : "INTERRUPTED_OPERATION";
    task.waitingReason = "";
    task.updatedAt = now();
  }
  state.pending = "recovered-needs-attention";
  saveState(projectRoot, state);
  return summaryOf(state);
}
