import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { assertNoDuplicateJsonKeys } from "./bounded-provider.js";

export const CONCURRENT_TRANSITIONS = [
  "admission", "worktree-root", "task-worktree", "approval-freeze",
  "call-consume", "broker-result", "result-apply", "task-commit",
  "integration-lease", "integration-candidate", "candidate-checks",
  "evidence-finalize", "main-fast-forward", "task-cleanup",
  "integration-cleanup", "process-cleanup", "run-cleanup",
] as const;

export type ConcurrentTransitionName = typeof CONCURRENT_TRANSITIONS[number];

export interface ConcurrentPendingTransition {
  schemaVersion: 2;
  sequence: number;
  stateRevision: number;
  ownerToken: string;
  name: ConcurrentTransitionName;
  taskNumber: 1 | 2 | null;
  target: string;
  before: string;
  intendedAfter: string;
  startedAt: string;
}

export interface ConcurrentCompletedTransition {
  sequence: number;
  name: ConcurrentTransitionName;
  taskNumber: 1 | 2 | null;
  after: string;
  outcome: "applied" | "stopped";
}

export interface ConcurrentJournal {
  schemaVersion: 2;
  sequence: number;
  pending: ConcurrentPendingTransition | null;
  completed: ConcurrentCompletedTransition[];
}

export function newConcurrentJournal(): ConcurrentJournal {
  return { schemaVersion: 2, sequence: 0, pending: null, completed: [] };
}

function plain(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function validTaskNumber(value: unknown): value is 1 | 2 | null { return value === null || value === 1 || value === 2; }

function validTransitionName(value: unknown): value is ConcurrentTransitionName {
  return typeof value === "string" && CONCURRENT_TRANSITIONS.includes(value as ConcurrentTransitionName);
}

function validText(value: unknown): value is string { return typeof value === "string" && value.length > 0; }

function validHash(value: unknown, length: 40 | 64): value is string {
  return typeof value === "string" && new RegExp(`^[0-9a-f]{${length}}$`).test(value);
}

function validStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(validText) && new Set(value).size === value.length;
}

function validTextArray(value: unknown): value is string[] { return Array.isArray(value) && value.every(validText); }

function under(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function validRepoPath(value: unknown): value is string {
  if (!validText(value) || value.includes("\\") || isAbsolute(value) || value.startsWith("../") || value.includes("/../") ||
      value === ".git" || value.startsWith(".git/") || /[*?\[\]{}$`]/.test(value)) return false;
  return relative(".", value).replace(/\\/g, "/") === value && value !== ".";
}

const RUN_TRANSITIONS = new Set<ConcurrentTransitionName>(["admission", "worktree-root", "process-cleanup", "run-cleanup"]);
const TASK_TRANSITIONS: readonly ConcurrentTransitionName[] = ["task-worktree", "approval-freeze", "call-consume",
  "broker-result", "result-apply", "task-commit", "integration-lease", "integration-candidate", "candidate-checks",
  "evidence-finalize", "main-fast-forward", "task-cleanup", "integration-cleanup"];

function validateTransitionOrder(journal: ConcurrentJournal): void {
  const all = [...journal.completed, ...(journal.pending ? [journal.pending] : [])];
  const seen = new Set<string>();
  const taskIndex = new Map<1 | 2, number>([[1, -1], [2, -1]]);
  let admission = false;
  let worktreeRoot = false;
  let processCleanup = false;
  let runCleanup = false;
  for (const item of all) {
    const key = `${item.name}:${item.taskNumber ?? "run"}`;
    if (seen.has(key)) throw new Error("CORRUPT_STATE");
    seen.add(key);
    if (RUN_TRANSITIONS.has(item.name)) {
      if (item.taskNumber !== null) throw new Error("CORRUPT_STATE");
      if (item.name === "admission") {
        if (admission || all[0] !== item) throw new Error("CORRUPT_STATE");
        admission = true;
      } else if (item.name === "worktree-root") {
        if (!admission || worktreeRoot || processCleanup || runCleanup) throw new Error("CORRUPT_STATE");
        worktreeRoot = true;
      } else if (item.name === "process-cleanup") {
        if (!worktreeRoot || processCleanup || runCleanup) throw new Error("CORRUPT_STATE");
        processCleanup = true;
      } else {
        if (!processCleanup || runCleanup || all[all.length - 1] !== item) throw new Error("CORRUPT_STATE");
        runCleanup = true;
      }
      continue;
    }
    if (item.taskNumber !== 1 && item.taskNumber !== 2 || !worktreeRoot || runCleanup ||
        (processCleanup && item.name !== "task-cleanup" && item.name !== "integration-cleanup")) {
      throw new Error("CORRUPT_STATE");
    }
    const next = TASK_TRANSITIONS.indexOf(item.name);
    if (next < 0 || next <= (taskIndex.get(item.taskNumber) ?? -1)) throw new Error("CORRUPT_STATE");
    taskIndex.set(item.taskNumber, next);
  }
}

function validateJournal(value: unknown): asserts value is ConcurrentJournal {
  if (!plain(value) || !exactKeys(value, ["schemaVersion", "sequence", "pending", "completed"]) ||
      value.schemaVersion !== 2 || !Number.isSafeInteger(value.sequence) || (value.sequence as number) < 0 ||
      !Array.isArray(value.completed)) throw new Error("CORRUPT_STATE");
  let prior = 0;
  for (const raw of value.completed) {
    if (!plain(raw) || !exactKeys(raw, ["after", "name", "outcome", "sequence", "taskNumber"]) ||
        !Number.isSafeInteger(raw.sequence) || (raw.sequence as number) !== prior + 1 ||
        !validTransitionName(raw.name) || !validTaskNumber(raw.taskNumber) || !validText(raw.after) ||
        (raw.outcome !== "applied" && raw.outcome !== "stopped")) throw new Error("CORRUPT_STATE");
    prior = raw.sequence as number;
  }
  if (value.pending !== null) {
    const pending = value.pending;
    if (!plain(pending) || !exactKeys(pending, ["before", "intendedAfter", "name", "ownerToken", "schemaVersion",
      "sequence", "startedAt", "stateRevision", "target", "taskNumber"]) || pending.schemaVersion !== 2 ||
        !Number.isSafeInteger(pending.sequence) || pending.sequence !== prior + 1 || pending.sequence !== value.sequence ||
        !Number.isSafeInteger(pending.stateRevision) || !validText(pending.ownerToken) || !validTransitionName(pending.name) ||
        !validTaskNumber(pending.taskNumber) || !validText(pending.target) || !validText(pending.before) ||
        !validText(pending.intendedAfter) || !validText(pending.startedAt)) throw new Error("CORRUPT_STATE");
  } else if (prior !== value.sequence && !(prior === 0 && value.sequence === 0)) {
    throw new Error("CORRUPT_STATE");
  }
  validateTransitionOrder(value as unknown as ConcurrentJournal);
}

const STATE_KEYS = ["brokerRoot", "childProcesses", "cleanedUp", "createdAt", "expectedMain", "gitDir", "integrationOrder",
  "journal", "manifest", "manifestPath", "manifestSha256", "ownerToken", "phase", "projectRoot", "revision", "runId",
  "schemaVersion", "startMain", "stateDigest", "tasks", "updatedAt", "worktreeRoot"] as const;
const TASK_KEYS = ["approvalFrozen", "approvalSha256", "baseCommit", "blocker", "branch", "branchCreated", "callConsumed",
  "checksPassed", "integrationCommit", "phase", "sealedResultSha256", "taskCommit", "taskNumber", "testHashes", "worktree",
  "worktreeCreated"] as const;
const PROCESS_KEYS = ["cwd", "executable", "kind", "pid", "startIdentity", "taskNumber"] as const;
const MANIFEST_KEYS = ["mode", "runId", "schemaVersion", "tasks", "totalCostCapUsd"] as const;
const MANIFEST_TASK_KEYS = ["briefPath", "briefSha256", "checks", "dependencies", "externalActions", "implementationPaths",
  "independentlyUseful", "lane", "outcome", "provider", "recordMode", "records", "schemaVersion", "taskNumber",
  "testPaths", "usefulness", "writablePaths"] as const;
const RECORD_KEYS = ["approval", "brief", "evidence", "report"] as const;
const PROVIDER_KEYS = ["inputSha256", "maxCalls", "maxCostUsd", "model", "provider"] as const;
const CHECK_KEYS = ["args", "command"] as const;

function validateManifest(value: unknown): asserts value is Record<string, unknown> {
  if (!plain(value) || !exactKeys(value, MANIFEST_KEYS) || value.schemaVersion !== 1 ||
      (value.mode !== "offline-proof" && value.mode !== "live-proof") || value.totalCostCapUsd !== 0.5 ||
      typeof value.runId !== "string" || !/^[a-z0-9][a-z0-9-]{5,47}$/.test(value.runId) ||
      !Array.isArray(value.tasks) || value.tasks.length < 1 || value.tasks.length > 2) throw new Error("CORRUPT_STATE");
  const taskNumbers: number[] = [];
  for (const raw of value.tasks) {
    if (!plain(raw) || !exactKeys(raw, MANIFEST_TASK_KEYS) || raw.schemaVersion !== 1 ||
        (raw.taskNumber !== 1 && raw.taskNumber !== 2) || raw.lane !== "Standard" || raw.recordMode !== "Applied" ||
        raw.independentlyUseful !== true || !validRepoPath(raw.briefPath) || !validHash(raw.briefSha256, 64) ||
        !validText(raw.outcome) || !validText(raw.usefulness) || !validStringArray(raw.implementationPaths) ||
        !validStringArray(raw.testPaths) || !validStringArray(raw.writablePaths) ||
        !Array.isArray(raw.dependencies) || raw.dependencies.length !== 0 || !Array.isArray(raw.externalActions) ||
        raw.externalActions.length !== 0 || !Array.isArray(raw.checks) || raw.checks.length < 1 ||
        !plain(raw.records) || !exactKeys(raw.records, RECORD_KEYS) || !Object.values(raw.records).every(validRepoPath) ||
        !plain(raw.provider) || !exactKeys(raw.provider, PROVIDER_KEYS) || raw.provider.provider !== "anthropic" ||
        raw.provider.model !== "claude-haiku-4-5" || raw.provider.maxCalls !== 1 || raw.provider.maxCostUsd !== 0.25 ||
        !validHash(raw.provider.inputSha256, 64)) throw new Error("CORRUPT_STATE");
    const taskNumber = raw.taskNumber as 1 | 2;
    const n = String(taskNumber).padStart(3, "0");
    const implementationPaths = raw.implementationPaths as string[];
    const testPaths = raw.testPaths as string[];
    const writablePaths = raw.writablePaths as string[];
    const records = raw.records as Record<string, unknown>;
    const expectedInput = taskNumber === 1
      ? "3f50f7d24b6e52247aa05eae652d6a0bed39ce8bd7ce6da42642b74ee117bfe8"
      : "2196cff705d1b7e4dff0507afc0ba808871e377aadf14da1e9a7631f2fb6bdd8";
    if (![...implementationPaths, ...testPaths, ...writablePaths].every(validRepoPath) || writablePaths.length !== 1 ||
        !writablePaths.every((path) => implementationPaths.includes(path)) ||
        records.brief !== `docs/ai-work/tasks/${n}-brief.md` || records.approval !== `docs/ai-work/tasks/${n}-approval.json` ||
        records.report !== `docs/ai-work/tasks/${n}-report.md` || records.evidence !== `docs/ai-work/tasks/${n}-evidence.json` ||
        raw.briefPath !== records.brief || raw.provider.inputSha256 !== expectedInput) throw new Error("CORRUPT_STATE");
    for (const check of raw.checks) {
      if (!plain(check) || !exactKeys(check, CHECK_KEYS) || check.command !== "node" || !validTextArray(check.args) ||
          check.args.length < 1) throw new Error("CORRUPT_STATE");
    }
    taskNumbers.push(raw.taskNumber);
  }
  if (new Set(taskNumbers).size !== taskNumbers.length) throw new Error("CORRUPT_STATE");
}

export function concurrentStateDigest(value: unknown): string {
  if (!plain(value)) throw new Error("CORRUPT_STATE");
  const clone = structuredClone(value) as Record<string, unknown>;
  delete clone.stateDigest;
  return createHash("sha256").update(JSON.stringify(clone), "utf8").digest("hex");
}

export function parseConcurrentState(text: string): Record<string, unknown> {
  try { assertNoDuplicateJsonKeys(text, "CORRUPT_STATE"); } catch { throw new Error("CORRUPT_STATE"); }
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("CORRUPT_STATE"); }
  if (!plain(value) || value.schemaVersion !== 3) throw new Error("UNSUPPORTED_STATE");
  const expected = [...STATE_KEYS, ...(Object.hasOwn(value, "liveAuthorizationPath") ? ["liveAuthorizationPath"] : []),
    ...(Object.hasOwn(value, "liveAuthorizationSha256") ? ["liveAuthorizationSha256"] : [])];
  if (!exactKeys(value, expected) || !Number.isSafeInteger(value.revision) || (value.revision as number) < 1 ||
      !validText(value.runId) || !validText(value.ownerToken) || !validText(value.projectRoot) || !validText(value.gitDir) ||
      !validText(value.manifestSha256) || !validText(value.manifestPath) || !validText(value.startMain) ||
      !validText(value.expectedMain) || !validText(value.worktreeRoot) || !validText(value.brokerRoot) ||
      !validText(value.createdAt) || !validText(value.updatedAt) || !Array.isArray(value.tasks) ||
      !Array.isArray(value.integrationOrder) || !Array.isArray(value.childProcesses) || typeof value.cleanedUp !== "boolean" ||
      !validHash(value.stateDigest, 64) || !validHash(value.manifestSha256, 64) || !validHash(value.startMain, 40) ||
      !validHash(value.expectedMain, 40) || !["admitted", "building", "integrating", "recovering", "complete"].includes(String(value.phase)) ||
      !Number.isFinite(Date.parse(value.createdAt as string)) || !Number.isFinite(Date.parse(value.updatedAt as string))) {
    throw new Error("CORRUPT_STATE");
  }
  if (concurrentStateDigest(value) !== value.stateDigest) throw new Error("CORRUPT_STATE");
  validateManifest(value.manifest);
  if ((value.manifest as Record<string, unknown>).runId !== value.runId ||
      (Object.hasOwn(value, "liveAuthorizationPath") !== Object.hasOwn(value, "liveAuthorizationSha256")) ||
      ((value.manifest as Record<string, unknown>).mode === "live-proof" &&
        (!validText(value.liveAuthorizationPath) || !validHash(value.liveAuthorizationSha256, 64))) ||
      ((value.manifest as Record<string, unknown>).mode === "offline-proof" &&
        (Object.hasOwn(value, "liveAuthorizationPath") || Object.hasOwn(value, "liveAuthorizationSha256")))) {
    throw new Error("CORRUPT_STATE");
  }
  const manifest = value.manifest as Record<string, unknown>;
  const projectRoot = value.projectRoot as string;
  const worktreeRoot = value.worktreeRoot as string;
  const brokerRoot = value.brokerRoot as string;
  if (resolve(projectRoot) !== projectRoot || resolve(value.gitDir as string) !== join(projectRoot, ".git") ||
      !under(tmpdir(), projectRoot) || !under(tmpdir(), worktreeRoot) || projectRoot === worktreeRoot ||
      !worktreeRoot.startsWith(join(tmpdir(), `cairn-final-${manifest.runId as string}-`)) ||
      resolve(brokerRoot) !== join(worktreeRoot, "brokers") || !validRepoPath(value.manifestPath) &&
        value.manifestPath !== "<programmatic-offline-test>") throw new Error("CORRUPT_STATE");
  validateJournal(value.journal);
  const journal = value.journal as unknown as ConcurrentJournal;
  if (journal.pending && (journal.pending.ownerToken !== value.ownerToken || journal.pending.stateRevision > (value.revision as number))) {
    throw new Error("CORRUPT_STATE");
  }
  const manifestTasks = (value.manifest as { tasks: Array<Record<string, unknown>> }).tasks;
  if (value.tasks.length !== manifestTasks.length) throw new Error("CORRUPT_STATE");
  const stateTaskNumbers: number[] = [];
  for (const rawTask of value.tasks) {
    if (!plain(rawTask)) throw new Error("CORRUPT_STATE");
    const keys = TASK_KEYS.filter((key) => Object.hasOwn(rawTask, key));
    const required = TASK_KEYS.filter((key) => !["blocker", "integrationCommit", "sealedResultSha256", "taskCommit"].includes(key));
    if (!required.every((key) => keys.includes(key)) || !exactKeys(rawTask, keys) ||
        (rawTask.taskNumber !== 1 && rawTask.taskNumber !== 2) || typeof rawTask.approvalFrozen !== "boolean" ||
        typeof rawTask.callConsumed !== "boolean" || typeof rawTask.checksPassed !== "boolean" ||
        typeof rawTask.branchCreated !== "boolean" || typeof rawTask.worktreeCreated !== "boolean" ||
        !plain(rawTask.testHashes) ||
        (rawTask.approvalFrozen ? !validHash(rawTask.approvalSha256, 64) : rawTask.approvalSha256 !== "unfrozen") ||
        !validHash(rawTask.baseCommit, 40) ||
        !validText(rawTask.branch) || !validText(rawTask.worktree) ||
        !["admitted", "calling", "built", "stopped", "integrating", "integrated"].includes(String(rawTask.phase)) ||
        (Object.hasOwn(rawTask, "blocker") && !validText(rawTask.blocker)) ||
        (Object.hasOwn(rawTask, "taskCommit") && !validHash(rawTask.taskCommit, 40)) ||
        (Object.hasOwn(rawTask, "integrationCommit") && !validHash(rawTask.integrationCommit, 40)) ||
        (Object.hasOwn(rawTask, "sealedResultSha256") && !validHash(rawTask.sealedResultSha256, 64))) {
      throw new Error("CORRUPT_STATE");
    }
    const manifestTask = manifestTasks.find((task) => task.taskNumber === rawTask.taskNumber);
    const frozenTestKeys = Object.keys(rawTask.testHashes);
    if (!manifestTask || rawTask.branch !== `cairn/task-${String(rawTask.taskNumber).padStart(3, "0")}` ||
        resolve(rawTask.worktree as string) !== join(worktreeRoot, `task-${String(rawTask.taskNumber).padStart(3, "0")}`) ||
        (frozenTestKeys.length !== 0 && !exactKeys(rawTask.testHashes, manifestTask.testPaths as string[])) ||
        (rawTask.worktreeCreated && !exactKeys(rawTask.testHashes, manifestTask.testPaths as string[])) ||
        !Object.values(rawTask.testHashes).every((hash) => validHash(hash, 64))) throw new Error("CORRUPT_STATE");
    stateTaskNumbers.push(rawTask.taskNumber as number);
  }
  if (new Set(stateTaskNumbers).size !== stateTaskNumbers.length) throw new Error("CORRUPT_STATE");
  if (!value.integrationOrder.every((task) => task === 1 || task === 2) ||
      new Set(value.integrationOrder).size !== value.integrationOrder.length ||
      !value.integrationOrder.every((task) => stateTaskNumbers.includes(task as number)) ||
      value.integrationOrder.some((task, index, items) => index > 0 && (items[index - 1] as number) >= (task as number))) {
    throw new Error("CORRUPT_STATE");
  }
  for (const rawProcess of value.childProcesses) {
    if (!plain(rawProcess) || !exactKeys(rawProcess, PROCESS_KEYS) ||
        (rawProcess.taskNumber !== 1 && rawProcess.taskNumber !== 2) ||
        (rawProcess.kind !== "broker" && rawProcess.kind !== "worker") || !Number.isSafeInteger(rawProcess.pid) ||
        (rawProcess.pid as number) <= 0 || !validText(rawProcess.startIdentity) || !validText(rawProcess.executable) ||
        !validText(rawProcess.cwd)) throw new Error("CORRUPT_STATE");
  }
  return value;
}

export function beginConcurrentTransition(
  journal: ConcurrentJournal,
  name: ConcurrentTransitionName,
  taskNumber: 1 | 2 | null,
  target: string,
  before: string,
  intendedAfter: string,
  stateRevision = 0,
  ownerToken = "legacy-owner",
): ConcurrentPendingTransition {
  if (journal.pending) throw new Error("TRANSITION_ACTIVE");
  const pending: ConcurrentPendingTransition = {
    schemaVersion: 2, sequence: journal.sequence + 1, stateRevision, ownerToken,
    name, taskNumber, target, before, intendedAfter, startedAt: new Date().toISOString(),
  };
  journal.sequence = pending.sequence;
  journal.pending = pending;
  return pending;
}

export function completeConcurrentTransition(journal: ConcurrentJournal, observedAfter: string): void {
  const pending = journal.pending;
  if (!pending) throw new Error("NO_TRANSITION_ACTIVE");
  if (pending.intendedAfter !== observedAfter) throw new Error("TRANSITION_RESULT_MISMATCH");
  journal.completed.push({ sequence: pending.sequence, name: pending.name, taskNumber: pending.taskNumber,
    after: observedAfter, outcome: "applied" });
  journal.pending = null;
}

export function stopConcurrentTransition(journal: ConcurrentJournal, observedAfter: string): void {
  const pending = journal.pending;
  if (!pending) throw new Error("NO_TRANSITION_ACTIVE");
  if (observedAfter !== pending.before && observedAfter !== pending.intendedAfter) throw new Error("TRANSITION_RESULT_MISMATCH");
  journal.completed.push({ sequence: pending.sequence, name: pending.name, taskNumber: pending.taskNumber,
    after: observedAfter, outcome: "stopped" });
  journal.pending = null;
}
