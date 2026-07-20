import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import {
  createFakeBoundedProvider,
  createOfficialBoundedProvider,
  proofProviderRequest,
  validateBoundedProviderRequest,
  type BoundedProvider,
  type ProofTaskNumber,
  type Task024LiveAuthorization,
  PROOF_TOTAL_COST_CAP_USD,
  validateTask024LiveAuthorization,
} from "./bounded-provider.js";
import { appendLogRow, pad, sha256File, type LogRow } from "./files.js";

export const CONCURRENT_SCHEMA = 1 as const;
export const CONCURRENT_REHEARSAL_ENV = "CAIRN_BOUNDED_CONCURRENCY_REHEARSAL";
export const CONCURRENT_DISABLE_ENV = "CAIRN_DISABLE_BOUNDED_CONCURRENCY";
export const CONCURRENT_STATE_FILE = "concurrent-final-v1.json";

export interface ConcurrentCheck {
  command: "node";
  args: string[];
}

export interface ConcurrentRecordPaths {
  brief: string;
  approval: string;
  report: string;
  evidence: string;
}

export interface ConcurrentProviderAllocation {
  provider: "anthropic";
  model: "claude-haiku-4-5";
  inputSha256: string;
  maxCalls: 1;
  maxCostUsd: 0.25;
}

export interface ConcurrentTaskManifest {
  schemaVersion: 1;
  taskNumber: ProofTaskNumber;
  briefPath: string;
  briefSha256: string;
  lane: "Standard";
  recordMode: "Applied";
  outcome: string;
  independentlyUseful: true;
  usefulness: string;
  implementationPaths: string[];
  testPaths: string[];
  writablePaths: string[];
  checks: ConcurrentCheck[];
  dependencies: [];
  externalActions: [];
  provider: ConcurrentProviderAllocation;
  records: ConcurrentRecordPaths;
}

export interface ConcurrentManifest {
  schemaVersion: 1;
  runId: string;
  mode: "offline-proof" | "live-proof";
  totalCostCapUsd: 0.5;
  tasks: ConcurrentTaskManifest[];
}

export type ConcurrentTaskPhase = "admitted" | "calling" | "built" | "stopped" | "integrating" | "integrated";

export interface ConcurrentTaskState {
  taskNumber: ProofTaskNumber;
  branch: string;
  worktree: string;
  baseCommit: string;
  phase: ConcurrentTaskPhase;
  callConsumed: boolean;
  blocker?: string;
  taskCommit?: string;
  integrationCommit?: string;
  checksPassed: boolean;
  testHashes: Record<string, string>;
}

export interface ConcurrentRunState {
  schemaVersion: 1;
  revision: number;
  runId: string;
  ownerToken: string;
  projectRoot: string;
  gitDir: string;
  manifestSha256: string;
  manifest: ConcurrentManifest;
  startMain: string;
  expectedMain: string;
  worktreeRoot: string;
  tasks: ConcurrentTaskState[];
  phase: "admitted" | "building" | "integrating" | "recovering" | "complete";
  integrationOrder: ProofTaskNumber[];
  cleanedUp: boolean;
  liveAuthorization?: Task024LiveAuthorization;
  createdAt: string;
  updatedAt: string;
}

export interface ConcurrentRunResult {
  runId: string;
  projectRoot: string;
  startMain: string;
  finalMain: string;
  tasks: Array<{
    taskNumber: ProofTaskNumber;
    disposition: "DONE" | "STOPPED";
    blocker?: string;
    callConsumed: boolean;
    checksPassed: boolean;
    integrationCommit?: string;
  }>;
  integrationOrder: ProofTaskNumber[];
  providerCalls: number;
  providerCostUsd: number;
  cleanedUp: boolean;
}

export class ConcurrentRunError extends Error {
  constructor(readonly code: string, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ConcurrentRunError";
  }
}

const MANIFEST_KEYS = ["mode", "runId", "schemaVersion", "tasks", "totalCostCapUsd"].sort();
const TASK_KEYS = [
  "briefPath", "briefSha256", "checks", "dependencies", "externalActions", "implementationPaths",
  "independentlyUseful", "lane", "outcome", "provider", "recordMode", "records", "schemaVersion",
  "taskNumber", "testPaths", "usefulness", "writablePaths",
].sort();
const PROVIDER_KEYS = ["inputSha256", "maxCalls", "maxCostUsd", "model", "provider"].sort();
const RECORD_KEYS = ["approval", "brief", "evidence", "report"].sort();
const CHECK_KEYS = ["args", "command"].sort();

function now(): string { return new Date().toISOString(); }

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function hashText(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function under(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function exactKeys(value: object, expected: string[], code: string): void {
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(expected)) {
    throw new ConcurrentRunError(code, "Required fields are missing or unknown fields are present.");
  }
}

function assertPlainData(value: unknown, seen = new Set<object>()): void {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return;
  if (typeof value !== "object" || seen.has(value)) throw new ConcurrentRunError("MALFORMED_MANIFEST", "Manifest data must be an acyclic plain JSON value.");
  const object = value as object;
  const prototype = Object.getPrototypeOf(object);
  if (prototype !== Object.prototype && prototype !== Array.prototype) {
    throw new ConcurrentRunError("MALFORMED_MANIFEST", "Proxies, class instances, and non-plain objects are refused.");
  }
  seen.add(object);
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(object))) {
    if (Array.isArray(object) && key === "length") continue;
    if (!("value" in descriptor) || !descriptor.enumerable) {
      throw new ConcurrentRunError("MALFORMED_MANIFEST", "Accessors and hidden fields are refused.");
    }
    assertPlainData(descriptor.value, seen);
  }
  seen.delete(object);
}

function exactPath(input: unknown): string {
  if (typeof input !== "string") throw new ConcurrentRunError("MALFORMED_SCOPE", "Every path must be a string.");
  const value = input.replace(/\\/g, "/");
  if (!value || value !== input || isAbsolute(value) || /^[A-Za-z]:/.test(value) || value.startsWith("//") ||
      value === "." || value === ".." || value.startsWith("../") || value.includes("/../") || value.includes("/./") ||
      value.endsWith("/") || value.includes("//") || value.includes(":") || /[*?\[\]{}$`%]/.test(value)) {
    throw new ConcurrentRunError("MALFORMED_SCOPE", `Non-canonical path refused: ${String(input)}`);
  }
  const normalized = relative(".", value).replace(/\\/g, "/");
  if (normalized !== value) throw new ConcurrentRunError("MALFORMED_SCOPE", `Non-normalized path refused: ${value}`);
  return value;
}

function uniquePaths(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0) throw new ConcurrentRunError("INCOMPLETE_CLASSIFICATION", `${field} must be a non-empty array.`);
  const paths = value.map(exactPath);
  if (new Set(paths.map((path) => path.toLocaleLowerCase("en-US"))).size !== paths.length) {
    throw new ConcurrentRunError("SCOPE_OVERLAP", `${field} contains a duplicate or case-only alias.`);
  }
  return paths;
}

function conflicts(a: string, b: string): boolean {
  const left = a.toLocaleLowerCase("en-US");
  const right = b.toLocaleLowerCase("en-US");
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function assertUnprotected(path: string): void {
  const lower = path.toLocaleLowerCase("en-US");
  const forbidden = [".git", "docs/ai-work/log.md", "docs/ai-work/activation", "docs/ai-work/coordinator"];
  if (forbidden.some((item) => lower === item || lower.startsWith(`${item}/`))) {
    throw new ConcurrentRunError("PROTECTED_SCOPE", `Coordinator-owned path refused: ${path}`);
  }
}

function assertNoLinkEscape(root: string, path: string): void {
  const rootReal = realpathSync(root);
  const parts = path.split("/");
  let cursor = root;
  for (const part of parts) {
    cursor = join(cursor, part);
    if (!existsSync(cursor)) continue;
    const stat = lstatSync(cursor);
    if (stat.isSymbolicLink()) throw new ConcurrentRunError("LINK_SCOPE", `Linked path refused: ${path}`);
    if (!under(rootReal, realpathSync(cursor))) throw new ConcurrentRunError("LINK_SCOPE", `Escaping path refused: ${path}`);
  }
  const mode = git(root, ["ls-files", "-s", "--", path]).split(/\s+/)[0];
  if (mode === "160000") throw new ConcurrentRunError("SUBMODULE_SCOPE", `Submodule path refused: ${path}`);
}

function assertString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new ConcurrentRunError("INCOMPLETE_CLASSIFICATION", `${name} is required.`);
  return value;
}

function validateTask(root: string | undefined, raw: unknown): ConcurrentTaskManifest {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ConcurrentRunError("MALFORMED_MANIFEST", "Each task must be an object.");
  exactKeys(raw, TASK_KEYS, "MALFORMED_MANIFEST");
  const value = raw as Record<string, unknown>;
  if (value.schemaVersion !== 1 || (value.taskNumber !== 1 && value.taskNumber !== 2) || value.lane !== "Standard" ||
      value.recordMode !== "Applied" || value.independentlyUseful !== true || !Array.isArray(value.dependencies) ||
      value.dependencies.length !== 0 || !Array.isArray(value.externalActions) || value.externalActions.length !== 0) {
    throw new ConcurrentRunError("INCOMPLETE_CLASSIFICATION", "Only complete, independent Standard/Applied tasks without dependencies or external actions are admitted.");
  }
  const taskNumber = value.taskNumber as ProofTaskNumber;
  const briefPath = exactPath(value.briefPath);
  const implementationPaths = uniquePaths(value.implementationPaths, "implementationPaths");
  const testPaths = uniquePaths(value.testPaths, "testPaths");
  const writablePaths = uniquePaths(value.writablePaths, "writablePaths");
  const all = [...implementationPaths, ...testPaths];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    if (conflicts(all[i], all[j])) throw new ConcurrentRunError("SCOPE_OVERLAP", `${all[i]} conflicts with ${all[j]}.`);
  }
  for (const path of all) assertUnprotected(path);
  if (writablePaths.some((path) => !implementationPaths.includes(path))) {
    throw new ConcurrentRunError("MALFORMED_SCOPE", "Writable paths must be an exact subset of implementation paths.");
  }
  if (!Array.isArray(value.checks) || value.checks.length === 0) throw new ConcurrentRunError("INCOMPLETE_CLASSIFICATION", "At least one argv check is required.");
  const checks = value.checks.map((rawCheck): ConcurrentCheck => {
    if (!rawCheck || typeof rawCheck !== "object" || Array.isArray(rawCheck)) throw new ConcurrentRunError("MALFORMED_CHECK", "A check must be an object.");
    exactKeys(rawCheck, CHECK_KEYS, "MALFORMED_CHECK");
    const check = rawCheck as Record<string, unknown>;
    if (check.command !== "node" || !Array.isArray(check.args) || check.args.length === 0 ||
        !check.args.every((arg) => typeof arg === "string" && arg.length > 0 && !/[&|;<>`\r\n]/.test(arg))) {
      throw new ConcurrentRunError("MALFORMED_CHECK", "Checks must use exact node argv without a shell.");
    }
    return { command: "node", args: [...check.args] as string[] };
  });
  if (!value.records || typeof value.records !== "object" || Array.isArray(value.records)) throw new ConcurrentRunError("MALFORMED_RECORDS", "Task record paths are required.");
  exactKeys(value.records, RECORD_KEYS, "MALFORMED_RECORDS");
  const recordRaw = value.records as Record<string, unknown>;
  const n = pad(taskNumber);
  const records: ConcurrentRecordPaths = {
    brief: exactPath(recordRaw.brief), approval: exactPath(recordRaw.approval),
    report: exactPath(recordRaw.report), evidence: exactPath(recordRaw.evidence),
  };
  const expectedRecords: ConcurrentRecordPaths = {
    brief: `docs/ai-work/tasks/${n}-brief.md`, approval: `docs/ai-work/tasks/${n}-approval.json`,
    report: `docs/ai-work/tasks/${n}-report.md`, evidence: `docs/ai-work/tasks/${n}-evidence.json`,
  };
  if (JSON.stringify(records) !== JSON.stringify(expectedRecords) || briefPath !== records.brief) {
    throw new ConcurrentRunError("MALFORMED_RECORDS", "Task records must use the coordinator-assigned exact paths.");
  }
  if (!value.provider || typeof value.provider !== "object" || Array.isArray(value.provider)) throw new ConcurrentRunError("PROVIDER_REQUEST_INVALID", "Provider allocation is required.");
  exactKeys(value.provider, PROVIDER_KEYS, "PROVIDER_REQUEST_INVALID");
  const expectedRequest = proofProviderRequest(taskNumber);
  const provider = value.provider as ConcurrentProviderAllocation;
  validateBoundedProviderRequest({ ...expectedRequest, ...provider });
  if (provider.inputSha256 !== expectedRequest.inputSha256) throw new ConcurrentRunError("PROVIDER_INPUT_CHANGED", "The fixed proof digest changed.");
  const task: ConcurrentTaskManifest = {
    schemaVersion: 1, taskNumber, briefPath, briefSha256: assertString(value.briefSha256, "briefSha256"),
    lane: "Standard", recordMode: "Applied", outcome: assertString(value.outcome, "outcome"), independentlyUseful: true,
    usefulness: assertString(value.usefulness, "usefulness"), implementationPaths, testPaths, writablePaths, checks,
    dependencies: [], externalActions: [], provider: { ...provider }, records,
  };
  if (!/^[0-9a-f]{64}$/.test(task.briefSha256)) throw new ConcurrentRunError("FROZEN_GATE_FAILED", "Brief SHA-256 is malformed.");
  if (root) {
    for (const path of [...all, ...Object.values(records)]) assertNoLinkEscape(root, path);
    const absoluteBrief = join(root, briefPath);
    if (!existsSync(absoluteBrief) || sha256File(absoluteBrief) !== task.briefSha256) {
      throw new ConcurrentRunError("FROZEN_GATE_FAILED", `Task ${n} brief is missing or changed.`);
    }
    const approvalPath = join(root, records.approval);
    if (!existsSync(approvalPath)) throw new ConcurrentRunError("FROZEN_GATE_FAILED", `Task ${n} approval is missing.`);
    let approval: unknown;
    try { approval = JSON.parse(readFileSync(approvalPath, "utf8")); } catch { throw new ConcurrentRunError("FROZEN_GATE_FAILED", `Task ${n} approval is malformed.`); }
    const a = approval as Record<string, unknown>;
    if (a.taskNumber !== taskNumber || a.briefPath !== briefPath || a.briefSha256 !== task.briefSha256) {
      throw new ConcurrentRunError("FROZEN_GATE_FAILED", `Task ${n} approval does not bind the frozen brief.`);
    }
    for (const testPath of testPaths) {
      if (!existsSync(join(root, testPath)) || !git(root, ["ls-files", "--error-unmatch", "--", testPath])) {
        throw new ConcurrentRunError("FROZEN_GATE_FAILED", `Declared test is missing or untracked: ${testPath}`);
      }
    }
  }
  return task;
}

export function validateConcurrentManifest(raw: unknown, root?: string): ConcurrentManifest {
  assertPlainData(raw);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ConcurrentRunError("MALFORMED_MANIFEST", "Run manifest must be an object.");
  exactKeys(raw, MANIFEST_KEYS, "MALFORMED_MANIFEST");
  const value = raw as Record<string, unknown>;
  if (value.schemaVersion !== 1 || (value.mode !== "offline-proof" && value.mode !== "live-proof") ||
      value.totalCostCapUsd !== PROOF_TOTAL_COST_CAP_USD || !/^[a-z0-9][a-z0-9-]{5,47}$/.test(String(value.runId))) {
    throw new ConcurrentRunError("MALFORMED_MANIFEST", "Schema, run id, mode, or fixed total cost cap is invalid.");
  }
  if (!Array.isArray(value.tasks) || value.tasks.length < 1 || value.tasks.length > 2) {
    throw new ConcurrentRunError("CONCURRENCY_LIMIT", "A closed batch contains exactly one or two tasks.");
  }
  const tasks = value.tasks.map((task) => validateTask(root, task));
  if (new Set(tasks.map((task) => task.taskNumber)).size !== tasks.length) throw new ConcurrentRunError("DUPLICATE_TASK", "Task numbers must be unique.");
  const owned = tasks.flatMap((task) => [...task.implementationPaths, ...task.testPaths].map((path) => ({ task: task.taskNumber, path })));
  for (let i = 0; i < owned.length; i++) for (let j = i + 1; j < owned.length; j++) {
    if (owned[i].task !== owned[j].task && conflicts(owned[i].path, owned[j].path)) {
      throw new ConcurrentRunError("SCOPE_OVERLAP", `${owned[i].path} conflicts with ${owned[j].path}.`);
    }
  }
  const recordPaths = tasks.flatMap((task) => Object.values(task.records));
  if (new Set(recordPaths.map((path) => path.toLocaleLowerCase("en-US"))).size !== recordPaths.length) {
    throw new ConcurrentRunError("SCOPE_OVERLAP", "Task record paths overlap.");
  }
  return {
    schemaVersion: 1,
    runId: String(value.runId),
    mode: value.mode as ConcurrentManifest["mode"],
    totalCostCapUsd: 0.5,
    tasks,
  };
}

/**
 * JSON.parse silently accepts duplicate object keys. This small lexical pass
 * rejects them before parsing, while still leaving JSON grammar validation to
 * the platform parser.
 */
function assertNoDuplicateJsonKeys(text: string): void {
  const stack: Array<{ kind: "object" | "array"; keys?: Set<string>; expectingKey?: boolean }> = [];
  let i = 0;
  let expectingValue = true;
  const skipSpace = () => { while (/\s/.test(text[i] ?? "")) i += 1; };
  const readString = (): string => {
    const start = i;
    i += 1;
    for (;;) {
      if (i >= text.length) throw new ConcurrentRunError("MALFORMED_MANIFEST", "Unterminated JSON string.");
      if (text[i] === "\\") { i += 2; continue; }
      if (text[i] === '"') { i += 1; break; }
      i += 1;
    }
    try { return JSON.parse(text.slice(start, i)) as string; } catch { throw new ConcurrentRunError("MALFORMED_MANIFEST", "Invalid JSON string."); }
  };
  while (i < text.length) {
    skipSpace();
    const frame = stack[stack.length - 1];
    const ch = text[i];
    if (!ch) break;
    if (ch === "{") { stack.push({ kind: "object", keys: new Set(), expectingKey: true }); i += 1; expectingValue = true; continue; }
    if (ch === "[") { stack.push({ kind: "array" }); i += 1; expectingValue = true; continue; }
    if (ch === "}" || ch === "]") { stack.pop(); i += 1; expectingValue = false; continue; }
    if (ch === ",") {
      i += 1;
      const top = stack[stack.length - 1];
      if (top?.kind === "object") top.expectingKey = true;
      expectingValue = true;
      continue;
    }
    if (ch === ":") { i += 1; expectingValue = true; continue; }
    if (ch === '"') {
      const value = readString();
      skipSpace();
      const top = stack[stack.length - 1];
      if (top?.kind === "object" && top.expectingKey && text[i] === ":") {
        if (top.keys!.has(value)) throw new ConcurrentRunError("DUPLICATE_JSON_KEY", `Duplicate JSON key refused: ${value}`);
        top.keys!.add(value);
        top.expectingKey = false;
      }
      expectingValue = false;
      continue;
    }
    // Numbers, booleans, and null contain no keys. Skip to structural syntax.
    if (expectingValue) {
      while (i < text.length && !/[\s,}\]]/.test(text[i])) i += 1;
      expectingValue = false;
      continue;
    }
    i += 1;
  }
}

export function parseConcurrentManifest(text: string, root?: string): ConcurrentManifest {
  assertNoDuplicateJsonKeys(text);
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new ConcurrentRunError("MALFORMED_MANIFEST", "Manifest is not strict JSON."); }
  return validateConcurrentManifest(value, root);
}

export function loadConcurrentManifest(root: string, repositoryRelativePath: string): ConcurrentManifest {
  const path = exactPath(repositoryRelativePath);
  const absolute = resolve(root, path);
  if (!under(root, absolute) || !existsSync(absolute)) throw new ConcurrentRunError("MANIFEST_MISSING", "The exact repository-relative manifest does not exist.");
  assertNoLinkEscape(root, path);
  return parseConcurrentManifest(readFileSync(absolute, "utf8"), root);
}

function assertRepository(
  root: string,
  mode: ConcurrentManifest["mode"],
  liveAuthorization?: unknown,
  requireFreshLiveApproval = true,
): { projectRoot: string; gitDir: string; main: string } {
  const projectRoot = resolve(git(root, ["rev-parse", "--show-toplevel"]));
  if (projectRoot !== resolve(root)) throw new ConcurrentRunError("PROJECT_ROOT_MISMATCH", "Open the exact Git project root.");
  if (process.platform !== "win32") throw new ConcurrentRunError("UNSUPPORTED_PLATFORM", "The Final supports Windows only.");
  if (process.env[CONCURRENT_DISABLE_ENV] === "1") throw new ConcurrentRunError("FINAL_DISABLED", "The emergency disable is set.");
  if (!under(tmpdir(), projectRoot)) throw new ConcurrentRunError("FINAL_DISABLED", "No activation record exists; only a new disposable temporary repository is allowed.");
  if (mode === "offline-proof" && process.env[CONCURRENT_REHEARSAL_ENV] !== "1") {
    throw new ConcurrentRunError("FINAL_DISABLED", `${CONCURRENT_REHEARSAL_ENV}=1 is required for the offline proof.`);
  }
  if (mode === "live-proof") {
    try { validateTask024LiveAuthorization(liveAuthorization, requireFreshLiveApproval); }
    catch { throw new ConcurrentRunError("LIVE_APPROVAL_REQUIRED", "Live mode requires the four exact, fresh Task 024 approvals at the execution boundary."); }
  }
  if (git(root, ["branch", "--show-current"]) !== "main") throw new ConcurrentRunError("MAIN_REQUIRED", "The disposable repository must be on main.");
  if (git(root, ["status", "--porcelain=v1", "--untracked-files=all"])) throw new ConcurrentRunError("DIRTY_MAIN", "main has protected uncommitted work.");
  const gitDir = resolve(root, git(root, ["rev-parse", "--git-common-dir"]));
  for (const marker of ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply"]) {
    if (existsSync(join(gitDir, marker))) throw new ConcurrentRunError("GIT_OPERATION_ACTIVE", `Unfinished ${marker} operation.`);
  }
  return { projectRoot, gitDir, main: git(root, ["rev-parse", "refs/heads/main"]) };
}

function statePaths(root: string): { dir: string; state: string; backup: string; lock: string } {
  const gitDir = resolve(root, git(root, ["rev-parse", "--git-common-dir"]));
  const dir = join(gitDir, "cairn");
  return { dir, state: join(dir, CONCURRENT_STATE_FILE), backup: join(dir, `${CONCURRENT_STATE_FILE}.backup`), lock: join(dir, `${CONCURRENT_STATE_FILE}.lock`) };
}

function writeState(root: string, state: ConcurrentRunState): void {
  const p = statePaths(root);
  mkdirSync(p.dir, { recursive: true });
  state.revision += 1;
  state.updatedAt = now();
  const next = `${p.state}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(next, JSON.stringify(state, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
  if (existsSync(p.state)) {
    writeFileSync(p.backup, readFileSync(p.state));
  }
  renameSync(next, p.state);
}

export function readConcurrentRunState(root: string): ConcurrentRunState | null {
  const p = statePaths(root);
  if (!existsSync(p.state)) return null;
  let value: unknown;
  try { value = JSON.parse(readFileSync(p.state, "utf8")); } catch { throw new ConcurrentRunError("CORRUPT_STATE", "Concurrent state is not valid JSON."); }
  if (!value || typeof value !== "object" || (value as Record<string, unknown>).schemaVersion !== 1) {
    throw new ConcurrentRunError("UNSUPPORTED_STATE", "Concurrent state schema is unsupported.");
  }
  return value as ConcurrentRunState;
}

function acquireLock(root: string): () => void {
  const p = statePaths(root);
  mkdirSync(p.dir, { recursive: true });
  let fd: number;
  try { fd = openSync(p.lock, "wx"); } catch { throw new ConcurrentRunError("RUN_BUSY", "The bounded-run lock is already held."); }
  writeFileSync(fd, JSON.stringify({ pid: process.pid, createdAt: now() }) + "\n");
  return () => {
    closeSync(fd);
    if (existsSync(p.lock)) unlinkSync(p.lock);
  };
}

function assertFrozen(root: string, state: ConcurrentRunState): void {
  const repo = assertRepository(root, state.manifest.mode, state.liveAuthorization);
  if (repo.projectRoot !== state.projectRoot || repo.gitDir !== state.gitDir || repo.main !== state.expectedMain ||
      state.manifestSha256 !== hashText(JSON.stringify(state.manifest))) {
    throw new ConcurrentRunError("FROZEN_GATE_FAILED", "Repository, main, or frozen manifest changed.");
  }
  validateConcurrentManifest(state.manifest, root);
  for (const task of state.tasks) {
    const manifestTask = state.manifest.tasks.find((item) => item.taskNumber === task.taskNumber);
    if (!manifestTask || !under(state.worktreeRoot, task.worktree) || task.branch !== `cairn/task-${pad(task.taskNumber)}` ||
        git(root, ["rev-parse", task.branch]) !== git(task.worktree, ["rev-parse", "HEAD"])) {
      throw new ConcurrentRunError("FROZEN_GATE_FAILED", `Task ${pad(task.taskNumber)} ownership changed.`);
    }
    const status = git(task.worktree, ["status", "--porcelain=v1", "--untracked-files=all"]);
    if (["admitted", "calling"].includes(task.phase) && status) {
      throw new ConcurrentRunError("FROZEN_GATE_FAILED", `Task ${pad(task.taskNumber)} changed before builder control.`);
    }
    for (const [testPath, frozenHash] of Object.entries(task.testHashes)) {
      if (!existsSync(join(task.worktree, testPath)) || sha256File(join(task.worktree, testPath)) !== frozenHash) {
        throw new ConcurrentRunError("FROZEN_GATE_FAILED", `Task ${pad(task.taskNumber)} declared test changed: ${testPath}`);
      }
    }
  }
}

export function admitConcurrentRun(
  root: string,
  rawManifest: unknown,
  options: { liveAuthorization?: unknown } = {},
): ConcurrentRunState {
  const manifest = validateConcurrentManifest(rawManifest, root);
  const liveAuthorization = manifest.mode === "live-proof"
    ? validateTask024LiveAuthorization(options.liveAuthorization)
    : undefined;
  const repo = assertRepository(root, manifest.mode, liveAuthorization);
  if (readConcurrentRunState(root)) throw new ConcurrentRunError("RUN_ACTIVE", "Recover or finish the existing run before new admission.");
  const branchList = git(root, ["branch", "--list", "cairn/task-*"]);
  if (branchList) throw new ConcurrentRunError("TASK_BRANCH_EXISTS", "A task branch already exists.");
  const worktreeRoot = join(tmpdir(), `cairn-final-${manifest.runId}-${randomUUID()}`);
  if (existsSync(worktreeRoot)) throw new ConcurrentRunError("WORKTREE_ROOT_EXISTS", "The generated worktree root already exists.");
  const release = acquireLock(root);
  try {
    const recheck = assertRepository(root, manifest.mode, liveAuthorization);
    if (recheck.main !== repo.main || readConcurrentRunState(root)) throw new ConcurrentRunError("ADMISSION_RACE", "Repository state changed during admission.");
    mkdirSync(worktreeRoot);
    const state: ConcurrentRunState = {
      schemaVersion: 1, revision: 0, runId: manifest.runId, ownerToken: randomUUID(), projectRoot: repo.projectRoot,
      gitDir: repo.gitDir, manifestSha256: hashText(JSON.stringify(manifest)), manifest, startMain: repo.main,
      expectedMain: repo.main, worktreeRoot, tasks: [], phase: "admitted", integrationOrder: [], cleanedUp: false,
      createdAt: now(), updatedAt: now(),
      ...(liveAuthorization ? { liveAuthorization } : {}),
    };
    for (const task of manifest.tasks) {
      const branch = `cairn/task-${pad(task.taskNumber)}`;
      const worktree = join(worktreeRoot, `task-${pad(task.taskNumber)}`);
      git(root, ["worktree", "add", "-b", branch, worktree, repo.main]);
      state.tasks.push({
        taskNumber: task.taskNumber, branch, worktree, baseCommit: repo.main, phase: "admitted", callConsumed: false,
        checksPassed: false,
        // A fresh worktree can apply Git's platform line-ending policy. Freeze
        // the actual isolated builder bytes, not the main-worktree rendering.
        testHashes: Object.fromEntries(task.testPaths.map((path) => [path, sha256File(join(worktree, path))])),
      });
    }
    writeState(root, state);
    return structuredClone(state);
  } catch (error) {
    for (const task of manifest.tasks) {
      const worktree = join(worktreeRoot, `task-${pad(task.taskNumber)}`);
      try { if (existsSync(worktree)) git(root, ["worktree", "remove", "--force", worktree]); } catch { /* recovery will identify remnants */ }
      try { if (git(root, ["branch", "--list", `cairn/task-${pad(task.taskNumber)}`])) git(root, ["branch", "-D", `cairn/task-${pad(task.taskNumber)}`]); } catch { /* recovery will identify remnants */ }
    }
    if (existsSync(worktreeRoot)) rmSync(worktreeRoot, { recursive: true, force: true });
    throw error;
  } finally {
    release();
  }
}

function changedPaths(worktree: string, base: string): string[] {
  const committed = git(worktree, ["diff", "--name-only", `${base}..HEAD`]).split(/\r?\n/).filter(Boolean);
  const raw = execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], {
    cwd: worktree, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  const working = raw.split("\0").filter(Boolean).map((line) => line.slice(3));
  return [...new Set([...committed, ...working].map((path) => path.replace(/\\/g, "/")))].sort();
}

function reportText(task: ConcurrentTaskManifest, disposition: "DONE" | "STOPPED", blocker?: string): string {
  return `# Task ${pad(task.taskNumber)} report\n\nResult: ${disposition === "DONE" ? "The disposable task completed and its declared checks passed." : `The disposable task stopped safely (${blocker ?? "BUILD_STOPPED"}).`}\n\nMilestone movement: ${disposition === "DONE" ? "YES" : "NO"}\n\nDisposition: ${disposition}${blocker ? ` — ${blocker}` : ""}\n`;
}

function writeTaskResult(root: string, state: ConcurrentRunState, taskState: ConcurrentTaskState, replacement?: string, blocker?: string): void {
  const task = state.manifest.tasks.find((item) => item.taskNumber === taskState.taskNumber)!;
  const disposition = replacement === undefined ? "STOPPED" : "DONE";
  if (replacement !== undefined) {
    if (task.writablePaths.length !== 1) throw new ConcurrentRunError("MALFORMED_SCOPE", "The fixed proof writes exactly one implementation path.");
    writeFileSync(join(taskState.worktree, task.writablePaths[0]), replacement + "\n", "utf8");
  }
  mkdirSync(dirname(join(taskState.worktree, task.records.report)), { recursive: true });
  writeFileSync(join(taskState.worktree, task.records.report), reportText(task, disposition, blocker), "utf8");
  writeFileSync(join(taskState.worktree, task.records.evidence), JSON.stringify({
    schemaVersion: 1,
    kind: "cairn-bounded-task-evidence",
    runId: state.runId,
    taskNumber: task.taskNumber,
    disposition,
    blocker: blocker ?? null,
    callConsumed: true,
    model: task.provider.model,
    replacementSha256: replacement === undefined ? null : hashText(replacement),
    changedPaths: replacement === undefined ? [] : [...task.writablePaths],
    checksPassed: false,
  }, null, 2) + "\n", "utf8");
  const permitted = new Set([...(replacement === undefined ? [] : task.writablePaths), task.records.report, task.records.evidence]);
  const changed = changedPaths(taskState.worktree, taskState.baseCommit);
  const outside = changed.filter((path) => !permitted.has(path));
  if (outside.length) throw new ConcurrentRunError("SCOPE_GATE_FAILED", `Task ${pad(task.taskNumber)} changed undeclared paths: ${outside.join(", ")}`);
  git(taskState.worktree, ["add", "--", ...changed]);
  git(taskState.worktree, ["commit", "-m", `Task ${pad(task.taskNumber)}: ${disposition.toLowerCase()} bounded proof task`]);
  taskState.taskCommit = git(taskState.worktree, ["rev-parse", "HEAD"]);
  taskState.phase = disposition === "DONE" ? "built" : "stopped";
  taskState.blocker = blocker;
}

function runChecks(candidate: string, checks: ConcurrentCheck[]): void {
  for (const check of checks) execFileSync(check.command, check.args, { cwd: candidate, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function logRow(task: ConcurrentTaskManifest, disposition: "DONE" | "STOPPED", blocker?: string): LogRow {
  return {
    task: pad(task.taskNumber), date: new Date().toISOString().slice(0, 10), lane: "Standard", mode: "Applied",
    outcome: disposition, decision: disposition === "DONE" ? "completed" : "stopped",
    summary: disposition === "DONE" ? task.outcome : `${task.outcome} — ${blocker ?? "BUILD_STOPPED"}`,
    moved: disposition === "DONE" ? "YES" : "NO",
  };
}

function integrateTask(root: string, state: ConcurrentRunState, taskState: ConcurrentTaskState): void {
  assertFrozen(root, state);
  const task = state.manifest.tasks.find((item) => item.taskNumber === taskState.taskNumber)!;
  taskState.phase = "integrating";
  writeState(root, state);
  const candidate = join(state.worktreeRoot, `integration-${pad(task.taskNumber)}`);
  git(root, ["worktree", "add", "--detach", candidate, state.expectedMain]);
  try {
    if (!taskState.taskCommit) throw new ConcurrentRunError("EVIDENCE_MISMATCH", "The frozen task commit is missing.");
    git(candidate, ["cherry-pick", taskState.taskCommit]);
    if (!taskState.blocker) {
      runChecks(candidate, task.checks);
      taskState.checksPassed = true;
    }
    const evidencePath = join(candidate, task.records.evidence);
    const evidence = JSON.parse(readFileSync(evidencePath, "utf8")) as Record<string, unknown>;
    evidence.checksPassed = taskState.checksPassed;
    evidence.integrationBase = state.expectedMain;
    writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n", "utf8");
    appendLogRow(candidate, logRow(task, taskState.blocker ? "STOPPED" : "DONE", taskState.blocker));
    git(candidate, ["add", "--", task.records.evidence, "docs/ai-work/LOG.md"]);
    git(candidate, ["commit", "-m", `Task ${pad(task.taskNumber)}: record bounded proof outcome`]);
    const integrationCommit = git(candidate, ["rev-parse", "HEAD"]);
    if (git(root, ["rev-parse", "refs/heads/main"]) !== state.expectedMain ||
        git(root, ["status", "--porcelain=v1", "--untracked-files=all"])) {
      throw new ConcurrentRunError("SERIALIZATION_FAILED", "main changed before its exact fast-forward.");
    }
    git(root, ["merge", "--ff-only", integrationCommit]);
    state.expectedMain = integrationCommit;
    taskState.integrationCommit = integrationCommit;
    taskState.phase = "integrated";
    state.integrationOrder.push(task.taskNumber);
    writeState(root, state);
  } finally {
    try { git(root, ["worktree", "remove", "--force", candidate]); } catch { /* recoverConcurrentRun owns this exact path */ }
  }
}

function cleanupOwned(root: string, state: ConcurrentRunState): void {
  if (!under(tmpdir(), state.projectRoot) || !under(tmpdir(), state.worktreeRoot) || resolve(root) !== state.projectRoot) {
    throw new ConcurrentRunError("RECOVERY_OWNERSHIP_UNPROVEN", "Cleanup ownership cannot be proved.");
  }
  for (const task of state.tasks) {
    if (!under(state.worktreeRoot, task.worktree) || task.branch !== `cairn/task-${pad(task.taskNumber)}`) {
      throw new ConcurrentRunError("RECOVERY_OWNERSHIP_UNPROVEN", "A generated task path or branch no longer matches its frozen owner.");
    }
    if (existsSync(task.worktree)) git(root, ["worktree", "remove", "--force", task.worktree]);
    if (git(root, ["branch", "--list", task.branch])) git(root, ["branch", "-D", task.branch]);
  }
  for (const task of state.tasks) {
    const candidate = join(state.worktreeRoot, `integration-${pad(task.taskNumber)}`);
    if (existsSync(candidate)) git(root, ["worktree", "remove", "--force", candidate]);
  }
  if (existsSync(state.worktreeRoot)) rmSync(state.worktreeRoot, { recursive: true, force: true });
  const p = statePaths(root);
  for (const file of [p.state, p.backup]) if (existsSync(file)) unlinkSync(file);
}

async function runConcurrentWithProvider(
  root: string,
  rawManifest: unknown,
  options: { provider: BoundedProvider; faultAt?: string; liveAuthorization?: unknown },
): Promise<ConcurrentRunResult> {
  const manifest = validateConcurrentManifest(rawManifest, root);
  let state = readConcurrentRunState(root);
  if (!state) state = admitConcurrentRun(root, manifest, { liveAuthorization: options.liveAuthorization });
  if (state.runId !== manifest.runId || state.manifestSha256 !== hashText(JSON.stringify(manifest))) {
    throw new ConcurrentRunError("FROZEN_GATE_FAILED", "The requested manifest is not the admitted closed batch.");
  }
  const provider = options.provider;
  const release = acquireLock(root);
  try {
    assertFrozen(root, state);
    state.phase = "building";
    writeState(root, state);
    if (options.faultAt === "after-building-state") throw new ConcurrentRunError("INJECTED_FAULT", options.faultAt);
    await Promise.all(state.tasks.map(async (taskState) => {
      const task = state!.manifest.tasks.find((item) => item.taskNumber === taskState.taskNumber)!;
      if (taskState.callConsumed) throw new ConcurrentRunError("PROVIDER_CALL_LIMIT", `Task ${pad(task.taskNumber)} call is already consumed.`);
      assertFrozen(root, state!);
      taskState.callConsumed = true;
      taskState.phase = "calling";
      writeState(root, state!);
      try {
        const result = await provider.call(proofProviderRequest(task.taskNumber));
        assertFrozen(root, state!);
        writeTaskResult(root, state!, taskState, result.replacement);
      } catch (error) {
        const blocker = error instanceof Error ? error.message.split(":")[0] : "PROVIDER_CALL_FAILED";
        writeTaskResult(root, state!, taskState, undefined, blocker);
      }
      writeState(root, state!);
    }));
    if (options.faultAt === "after-builds") throw new ConcurrentRunError("INJECTED_FAULT", options.faultAt);
    state.phase = "integrating";
    writeState(root, state);
    for (const task of [...state.tasks].sort((a, b) => a.taskNumber - b.taskNumber)) integrateTask(root, state, task);
    state.phase = "complete";
    state.cleanedUp = true;
    writeState(root, state);
    const snapshot = provider.snapshot();
    const result: ConcurrentRunResult = {
      runId: state.runId, projectRoot: state.projectRoot, startMain: state.startMain, finalMain: state.expectedMain,
      tasks: state.tasks.map((task) => ({
        taskNumber: task.taskNumber, disposition: task.blocker ? "STOPPED" : "DONE", blocker: task.blocker,
        callConsumed: task.callConsumed, checksPassed: task.checksPassed, integrationCommit: task.integrationCommit,
      })),
      integrationOrder: [...state.integrationOrder], providerCalls: snapshot.totalCalls,
      providerCostUsd: snapshot.totalCostUsd, cleanedUp: true,
    };
    cleanupOwned(root, state);
    return result;
  } finally {
    const p = statePaths(root);
    if (existsSync(p.lock)) release();
    if (existsSync(p.dir) && readdirSync(p.dir).length === 0) rmSync(p.dir, { recursive: true });
  }
}

export async function runConcurrentFake(
  root: string,
  rawManifest: unknown,
  options: { provider?: BoundedProvider; faultAt?: string } = {},
): Promise<ConcurrentRunResult> {
  const manifest = validateConcurrentManifest(rawManifest, root);
  if (manifest.mode !== "offline-proof") throw new ConcurrentRunError("LIVE_APPROVAL_REQUIRED", "The fake entry point accepts offline-proof manifests only.");
  return runConcurrentWithProvider(root, manifest, { provider: options.provider ?? createFakeBoundedProvider({ delayMs: 25 }), faultAt: options.faultAt });
}

export async function runConcurrentOfficialProof(
  root: string,
  rawManifest: unknown,
  authorization: unknown,
  brokerRoot: string,
): Promise<ConcurrentRunResult> {
  const manifest = validateConcurrentManifest(rawManifest, root);
  if (manifest.mode !== "live-proof" || manifest.tasks.length !== 2) {
    throw new ConcurrentRunError("LIVE_PROOF_INVALID", "The live proof is the fixed two-task closed batch only.");
  }
  const liveAuthorization = validateTask024LiveAuthorization(authorization);
  const provider = createOfficialBoundedProvider(liveAuthorization, brokerRoot);
  return runConcurrentWithProvider(root, manifest, { provider, liveAuthorization });
}

function recordRecoveredStops(root: string, state: ConcurrentRunState): void {
  if (git(root, ["status", "--porcelain=v1", "--untracked-files=all"])) {
    throw new ConcurrentRunError("RECOVERY_OWNERSHIP_UNPROVEN", "main is not clean enough to preserve recovery evidence.");
  }
  for (const taskState of [...state.tasks].sort((a, b) => a.taskNumber - b.taskNumber)) {
    if (taskState.phase === "integrated") continue;
    const task = state.manifest.tasks.find((item) => item.taskNumber === taskState.taskNumber)!;
    mkdirSync(dirname(join(root, task.records.report)), { recursive: true });
    writeFileSync(join(root, task.records.report), reportText(task, "STOPPED", "RECOVERED_AFTER_INTERRUPTION"), "utf8");
    appendLogRow(root, logRow(task, "STOPPED", "RECOVERED_AFTER_INTERRUPTION"));
    git(root, ["add", "--", task.records.report, "docs/ai-work/LOG.md"]);
    git(root, ["commit", "-m", `Task ${pad(task.taskNumber)}: preserve stopped recovery evidence`]);
    state.expectedMain = git(root, ["rev-parse", "HEAD"]);
    taskState.phase = "integrated";
    taskState.blocker = "RECOVERED_AFTER_INTERRUPTION";
    taskState.integrationCommit = state.expectedMain;
    state.integrationOrder.push(task.taskNumber);
  }
}

export function recoverConcurrentRun(root: string, runId: string): ConcurrentRunResult {
  const state = readConcurrentRunState(root);
  if (!state || state.runId !== runId) throw new ConcurrentRunError("RUN_NOT_FOUND", "No exact owned run has that id.");
  assertRepository(root, state.manifest.mode, state.liveAuthorization, false);
  const release = acquireLock(root);
  try {
    state.phase = "recovering";
    writeState(root, state);
    recordRecoveredStops(root, state);
    const result: ConcurrentRunResult = {
      runId: state.runId, projectRoot: state.projectRoot, startMain: state.startMain, finalMain: state.expectedMain,
      tasks: state.tasks.map((task) => ({ taskNumber: task.taskNumber, disposition: task.blocker ? "STOPPED" : "DONE",
        blocker: task.blocker, callConsumed: task.callConsumed, checksPassed: task.checksPassed, integrationCommit: task.integrationCommit })),
      integrationOrder: [...state.integrationOrder], providerCalls: state.tasks.filter((task) => task.callConsumed).length,
      providerCostUsd: 0, cleanedUp: true,
    };
    cleanupOwned(root, state);
    return result;
  } finally {
    const p = statePaths(root);
    if (existsSync(p.lock)) release();
    if (existsSync(p.dir) && readdirSync(p.dir).length === 0) rmSync(p.dir, { recursive: true });
  }
}

export function inspectConcurrentCleanup(root: string): {
  cleanMain: boolean;
  worktreeCount: number;
  taskBranches: string[];
  statePresent: boolean;
  lockPresent: boolean;
} {
  const p = statePaths(root);
  const worktreeCount = git(root, ["worktree", "list", "--porcelain"]).split(/\r?\n/).filter((line) => line.startsWith("worktree ")).length;
  const taskBranches = git(root, ["branch", "--list", "cairn/task-*"]).split(/\r?\n/).map((line) => line.trim().replace(/^\*\s*/, "")).filter(Boolean);
  return {
    cleanMain: git(root, ["branch", "--show-current"]) === "main" && !git(root, ["status", "--porcelain=v1", "--untracked-files=all"]),
    worktreeCount,
    taskBranches,
    statePresent: existsSync(p.state) || existsSync(p.backup),
    lockPresent: existsSync(p.lock),
  };
}

export function concurrentRunStatus(root: string): ConcurrentRunState | null {
  try { return readConcurrentRunState(root); } catch { return null; }
}

export function assertNoConcurrentRun(root: string): void {
  let state: ConcurrentRunState | null;
  try {
    state = readConcurrentRunState(root);
  } catch (error) {
    if (error instanceof ConcurrentRunError) throw error;
    return; // A non-Git Cairn project has no Git-owned bounded state.
  }
  if (state) throw new ConcurrentRunError("BOUNDED_RUN_ACTIVE", `Run ${state.runId} owns task mutation; use the exact concurrent recovery command.`);
}
