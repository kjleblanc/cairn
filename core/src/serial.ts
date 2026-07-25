import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { parseWorkerClaims, type WorkerClaims } from "./claims.js";
import { composeWorkerReport, composeWorkerRowSummary, type ComposedRecordInput } from "./records.js";
import { appendLogRow, canonicalPath, isCairnProject, nextTaskNumber, pad, parseFacts, parseLog, paths, type LogRow } from "./files.js";
import { acquireRunLock, type RunLock } from "./lock.js";
import {
  routeTask,
  WorkerBoundaryError,
  WorkerProcessError,
  type AdapterTaskContract,
  type RouteResult,
  type TaskAdapter,
  type WorkerRunResult,
} from "./routing.js";

const OFFLINE_SUPPORTED_OUTCOME = "Demonstrate serial routing and verify honest task records without implementing the requested product change.";
const WORKER_SUPPORTED_OUTCOME = "Run one explicitly confirmed worker task through the connected adapter and verify its result and Git state.";
const activeRoots = new Set<string>();

export type SerialStage = "Route" | "Run" | "Check" | "Result";
export interface SerialActivity { stage: SerialStage; state: "working" | "done" | "stopped"; detail: string }
export interface SerialRunEvents { onActivity?: (activity: SerialActivity) => void }
export interface SerialRunOptions {
  adapters: readonly TaskAdapter[];
  adapterId?: string;
  /**
   * The owner's own supplied data — numbers, names, exact wording — carried to
   * the worker verbatim and bound into the contract digest. Defaults to "".
   */
  details?: string;
  commitRecords?: boolean;
  events?: SerialRunEvents;
  signal?: AbortSignal;
}
export interface RecordCommit {
  status: "created" | "skipped";
  reason: string;
  hash?: string;
}
interface ClosedSerialResult {
  taskNumber: number;
  disposition: "DONE" | "STOPPED";
  briefPath: string;
  reportPath: string;
  reportText: string;
  row: LogRow;
  route: Extract<RouteResult, { status: "ready" }>;
  activities: SerialActivity[];
  commit: RecordCommit;
}
export type SerialRunResult =
  | { status: "connection-required"; route: Extract<RouteResult, { status: "connection-required" }>; activities: SerialActivity[] }
  | ({ status: "done" } & ClosedSerialResult & { disposition: "DONE" })
  | ({ status: "stopped"; reason: SerialStopReason } & ClosedSerialResult & { disposition: "STOPPED" });

export type SerialStopReason =
  | "ADAPTER_FAILED"
  | "INVALID_ADAPTER_RESULT"
  | "PROTECTED_WORK_CHANGED"
  | "RECORD_VERIFICATION_FAILED"
  | "WORKER_CLAIMS_MISSING"
  | "REAL_MODEL_CALL_NOT_AUTHORIZED"
  | "MODEL_REPORTED_STOPPED"
  | "MODEL_RESULT_NOT_VERIFIED"
  | "ADAPTER_TIMED_OUT"
  | "CANCELLED_BY_OWNER";

interface GitSnapshot {
  head: string;
  status: string[];
  staged: string[];
  logText: string;
  protectedPaths: ReadonlyMap<string, { worktree: string; index: string }>;
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  }).trimEnd();
}

function gitZ(root: string, args: string[]): string[] {
  const output = execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  return output.split("\0").filter(Boolean);
}

function lines(text: string): string[] {
  return text ? text.split(/\r?\n/).filter(Boolean) : [];
}

function statusPath(entry: string): string {
  const raw = entry.length > 3 ? entry.slice(3) : entry;
  const rename = raw.lastIndexOf(" -> ");
  return (rename >= 0 ? raw.slice(rename + 4) : raw).replace(/\\/g, "/");
}

function worktreeHash(root: string, path: string): string {
  const absolute = resolve(root, path);
  if (!existsSync(absolute)) return "missing";
  return createHash("sha256").update(readFileSync(absolute)).digest("hex");
}

function protectedPathSnapshot(root: string, status: readonly string[]): ReadonlyMap<string, { worktree: string; index: string }> {
  const values = new Map<string, { worktree: string; index: string }>();
  const pathsToProtect = new Set(status.map(statusPath));
  for (const path of lines(git(root, ["ls-files", "--", "docs/ai-work/tasks"]))) pathsToProtect.add(path.replace(/\\/g, "/"));
  for (const path of pathsToProtect) {
    values.set(path, {
      worktree: worktreeHash(root, path),
      index: git(root, ["ls-files", "--stage", "--", path]),
    });
  }
  return values;
}

/**
 * `git status --porcelain` counts a file as modified on stat or line-ending
 * differences alone — identical content, e.g. a CRLF working copy over an LF
 * index under autocrlf — and `git update-index --refresh` does not clear that
 * state. Counting such phantom dirt as a dirty start made a DONE task skip its
 * own commit and poisoned the rerun (Tasks 010/011). A worktree-only
 * modification entry is kept only when a content diff confirms it; every other
 * entry (staged, untracked, renamed, deleted) already reflects real work.
 */
function statusLines(root: string): string[] {
  const raw = lines(git(root, ["status", "--porcelain=v1", "--untracked-files=all"]));
  if (!raw.some((entry) => entry.startsWith(" M"))) return raw;
  const contentDirty = new Set(gitZ(root, ["diff", "--name-only", "-z", "--"]).map((path) => path.replace(/\\/g, "/")));
  return raw.filter((entry) => !entry.startsWith(" M") || contentDirty.has(statusPath(entry)));
}

function snapshot(root: string): GitSnapshot {
  const topRaw = git(root, ["rev-parse", "--show-toplevel"]);
  const top = canonicalPath(topRaw);
  const rootCanonical = canonicalPath(root);
  if (top.toLowerCase() !== rootCanonical.toLowerCase()) {
    // Name every spelling: when canonicalization falls back (a transient
    // realpath failure), the canonical spelling equals the resolved one and
    // this message is the evidence that says so.
    throw new Error(
      `PROJECT_ROOT_MISMATCH: git's toplevel "${topRaw}" (canonical "${top}") does not match the project root "${root}" (canonical "${rootCanonical}").`,
    );
  }
  const status = statusLines(root);
  return {
    head: git(root, ["rev-parse", "HEAD"]),
    status,
    staged: lines(git(root, ["diff", "--cached", "--name-only"])),
    logText: readFileSync(paths.log(root), "utf8"),
    protectedPaths: protectedPathSnapshot(root, status),
  };
}

function rel(root: string, path: string): string {
  const value = relative(root, path).replace(/\\/g, "/");
  if (!value || value.startsWith("../") || isAbsolute(value)) throw new Error("OWNED_PATH_OUTSIDE_PROJECT");
  return value;
}

function statusWithoutOwned(status: readonly string[], owned: ReadonlySet<string>): string[] {
  return status.filter((entry) => !owned.has(statusPath(entry)));
}

function sameLines(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function assertGoverned(root: string): void {
  if (!isCairnProject(root)) {
    throw new Error("No Cairn contract here. Start a new project in an empty folder, or use Project Conversion for existing work.");
  }
  const facts = parseFacts(root);
  if (facts.status && facts.status !== "ACTIVE") throw new Error(`CONTRACT_NOT_ACTIVE: The contract status is ${facts.status}.`);
  const gitDirRaw = git(root, ["rev-parse", "--git-dir"]);
  const gitDir = resolve(root, gitDirRaw);
  if (existsSync(join(gitDir, "cairn"))) {
    throw new Error("LEGACY_STATE_PRESENT: This project has legacy Cairn runtime state. It was preserved unchanged; migration needs a separate reviewed task.");
  }
}

function emit(activities: SerialActivity[], events: SerialRunEvents | undefined, activity: SerialActivity): void {
  activities.push(activity);
  events?.onActivity?.(activity);
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function escapeLine(text: string): string {
  return text.replace(/\r?\n/g, " ").trim();
}

/**
 * Owner-supplied text lands in the brief quarantined as a blockquote — the same
 * containment Cairn uses for worker text (Task 047). The words stay verbatim;
 * a heading or table row inside them can never become structure of Cairn's own
 * record.
 */
function blockquote(text: string): string {
  return text.split(/\r?\n/).map((line) => (line.trim() ? `> ${line}` : ">")).join("\n");
}

function briefText(contract: AdapterTaskContract, demo: boolean): string {
  const status = contract.protectedGit.dirty ? "existing changes protected" : "clean";
  const label = contract.route.adapterLabel;
  const provider = contract.route.provider;
  const title = demo ? "offline serial demonstration" : `one confirmed real ${label} task`;
  const lane = demo
    ? "local, deterministic, record-only demonstration"
    : `one explicitly confirmed ${provider} ${label} call; the model may make in-scope local workspace changes`;
  const done = demo
    ? "DONE means the offline route and its three records are verified. It does not mean the requested product change was implemented."
    : `DONE means the one ${label} process completed, the requested outcome and checks are reported, the append-only log row matches, protected starting work remains intact, and Cairn verified Git isolation and created the exact-path commit when the task started clean.`;
  const stopped = demo
    ? "STOPPED means the serial demonstration or its protection checks did not complete."
    : "STOPPED means the call was not authorized, the model reported a stop, process evidence failed, protected work changed, or the result records could not be verified.";
  // The owner's own data — numbers, names, exact wording — shown in the brief
  // exactly as given, so what the worker was handed is readable afterwards.
  const details = contract.details.trim()
    ? `\n## Details (verbatim)\n\n${blockquote(contract.details)}\n`
    : "";
  return `# Task ${pad(contract.taskNumber)} — ${title}

Requested outcome: ${escapeLine(contract.requestedOutcome)}

Supported outcome: ${contract.supportedOutcome}

Lane: **Standard** — ${lane}.
${details}
## Route

- Adapter: ${contract.route.adapterLabel}
- Provider: ${contract.route.provider}
- Model: ${contract.route.model}
- Reason: ${contract.route.reason}

## Owned records

${contract.ownedRecords.map((path) => `- \`${path}\``).join("\n")}

## Protected starting Git state

- HEAD: \`${contract.protectedGit.head}\`
- Working tree: ${status}
- Existing staged work: ${contract.protectedGit.staged ? "yes — no record commit is allowed" : "no"}

## Checks

${contract.checks.map((check) => `- ${check}`).join("\n")}

## Stop conditions

${contract.stopConditions.map((condition) => `- ${condition}`).join("\n")}

${done}

${stopped}
`;
}

/**
 * The one bounded-evidence line for any adapter: its numeric evidence map,
 * sorted by key, rendered `key=value` and joined by "; ". Adapter-agnostic —
 * codex's nine fields, a third adapter's own keys, all render the same way.
 */
function boundedEvidenceSummary(evidence: Record<string, number>): string {
  const entries = Object.keys(evidence).sort().map((key) => `${key}=${evidence[key]}`);
  return `Bounded worker evidence: ${entries.join("; ")}.`;
}

interface ProcessFailureNote {
  code: string;
  debugPath: string | null;
}

/**
 * Task 052: the owned-records gate's recovery instruction for the honest stop
 * close. `disclosure` is the Cairn-authored line naming which recoveries were
 * applied (rendered under "Verified by Cairn"); `overwriteReport` lets the stop
 * close replace a worker-pre-written report path with the honest record (plain
 * write instead of "wx") — the one disclosed case where Cairn overwrites.
 */
interface RecordRecovery {
  disclosure: string | null;
  overwriteReport: boolean;
}

function reportText(
  contract: AdapterTaskContract,
  demo: boolean,
  disposition: "DONE" | "STOPPED",
  reason: SerialStopReason | null,
  commitRequested: boolean,
  processEvidence?: Record<string, number>,
  processFailure?: ProcessFailureNote,
  orphanRisk = false,
): string {
  const taskNumber = contract.taskNumber;
  const codex = !demo;
  if (disposition === "DONE") {
    return `# Task ${pad(taskNumber)} — offline serial demonstration report

## Result

Routing demonstration: **verified**

Requested product change: **not attempted**

The deterministic offline adapter completed the serial route. It received no project root, files, tools, process, network client, credential, or delegation surface.

## Verification

- The adapter result matched the exact fixed schema.
- Only this brief, this report, and one append-only log row were written.
- Protected starting Git work remained unchanged.
- Automatic record commit: ${commitRequested ? "requested; the returned run result records whether exact-name isolation allowed it" : "not requested; the three record changes remain visible for inspection"}.

## Limitation

This was an offline lifecycle demonstration, not AI work and not implementation of the requested outcome.

Milestone movement: **NO**

Disposition: **DONE**
`;
  }
  if (codex && reason === "REAL_MODEL_CALL_NOT_AUTHORIZED") {
    return `# Task ${pad(taskNumber)} — Codex Exec real-call boundary report

## Result

Codex Exec readiness: **installed and connected**

Requested product change: **not attempted**

Cairn prepared one ephemeral, workspace-scoped Codex Exec request and stopped with the fixed code \`REAL_MODEL_CALL_NOT_AUTHORIZED\` before starting the execution process. No task data was sent to OpenAI, no model was called, and no credential value or authentication method was read, retained, or displayed.

## Verification

- Installation and connection were represented only as booleans.
- The real \`codex exec\` process was not started.
- Cairn did not retry, resume, continue, schedule, delegate, or choose another provider.
- Existing work was not cleaned, reset, stashed, moved, or overwritten by Cairn.

## Limitation

This task proved readiness detection and the call boundary only. It did not implement the requested outcome or authorize paid or data-bearing model work.

Milestone movement: **NO**

Disposition: **STOPPED**
`;
  }
  const title = codex ? "Codex Exec adapter report" : "offline serial demonstration report";
  const subject = codex ? "Codex Exec route" : "serial demonstration";
  const boundedEvidence = codex && processEvidence
    ? `\n## Bounded process evidence\n\n${boundedEvidenceSummary(processEvidence)} Cairn retained only the worker's final message (for claims verification) and these bounded counts; no other item text, reasoning, commands, paths, stdout, stderr, thread IDs, account details, authentication data, or credentials.\n`
    : "";
  // A timeout always spent a started process; a cancel spent one only when it
  // actually started — a pre-spawn cancel carries a null debugPath and spent
  // nothing, so it earns no "already spent" sentence.
  const paidStarted = codex && (reason === "ADAPTER_TIMED_OUT" ||
    (reason === "CANCELLED_BY_OWNER" && processFailure?.debugPath != null));
  const orphanSentence = orphanRisk
    ? " The worker process could not be confirmed dead; the run lock was deliberately left in place — close the orphaned process (check your system's process list), then the next task will report the lock holder until this app restarts."
    : "";
  return `# Task ${pad(taskNumber)} — ${title}

## Result

Routing demonstration: **stopped**

Requested product change: **${codex ? "not verified" : "not attempted"}**
${boundedEvidence}

The ${subject} stopped with the fixed error code \`${reason}\`. Cairn did not retry and did not include raw adapter output or error text. ${codex ? "The workspace may contain retained model-authored evidence and must be inspected before another task." : ""}${paidStarted ? " The worker process had already started before Cairn stopped it; any cost for that call is already spent." : ""}${orphanSentence}
${processFailure ? `\nProcess failure: \`${processFailure.code}\`. Raw run evidence stays on the owner's own disk at: ${processFailure.debugPath ?? "unavailable (the local debug directory could not be created)"}. It is never committed to the repository.\n` : ""}

## Verification

- Existing work was not cleaned, reset, stashed, moved, or overwritten by Cairn.
- Unexpected changes, if any, were retained as evidence.
- No unverified product implementation or model work was claimed as complete.

Milestone movement: **NO**

Disposition: **STOPPED**
`;
}

function cleanCell(value: string): string {
  return value.replace(/\|/g, "/").replace(/\r?\n/g, " ").trim();
}

function expectedLogLine(row: LogRow): string {
  return `| ${cleanCell(row.task)} | ${cleanCell(row.date)} | ${cleanCell(row.lane)} | ${cleanCell(row.mode)} | ${cleanCell(row.outcome)} | ${cleanCell(row.decision)} | ${cleanCell(row.summary)} | ${cleanCell(row.moved)} |\n`;
}

function rowFor(contract: AdapterTaskContract, demo: boolean, disposition: "DONE" | "STOPPED", reason: SerialStopReason | null): LogRow {
  const label = contract.route.adapterLabel;
  const workerBoundary = !demo && reason === "REAL_MODEL_CALL_NOT_AUTHORIZED";
  return {
    task: pad(contract.taskNumber),
    date: new Date().toISOString().slice(0, 10),
    lane: "Standard",
    mode: "Applied",
    outcome: disposition,
    decision: disposition === "DONE" ? "completed" : "stopped",
    summary: workerBoundary
      ? `${label} was installed and connected; Cairn stopped before the real process or model call.`
      : !demo
        ? `${label} stopped safely (${reason}); requested change was not verified.`
      : disposition === "DONE"
        ? "Offline routing demonstration verified; requested product change not attempted."
        : `Offline routing demonstration stopped safely (${reason}); requested product change not attempted.`,
    moved: "NO",
  };
}

/**
 * The evidence map is a plain object of at most 24 bounded numeric entries:
 * string keys ≤ 40 chars, values finite numbers with |v| ≤ 1e12. Negatives
 * are allowed — `exitCode: -1` is the honest translation of a child that
 * closed without a numeric exit code; count-vs-sign semantics belong to the
 * adapter that produced the key, and the envelope never trusts evidence as
 * ground truth anyway. A NaN value or a 25-entry map fails closed.
 */
function validEvidence(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const keys = Reflect.ownKeys(value);
  if (keys.length > 24) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of keys) {
    if (typeof key !== "string" || key.length > 40) return false;
    const descriptor = descriptors[key];
    if (!descriptor || descriptor.get || descriptor.set || !("value" in descriptor) || !descriptor.enumerable) return false;
    const entry = descriptor.value;
    if (typeof entry !== "number" || !Number.isFinite(entry) || Math.abs(entry) > 1_000_000_000_000) return false;
  }
  return true;
}

/**
 * The ONE result validator every adapter passes through — codex, offline demo,
 * a future third adapter alike. Exactly six own string keys, an ordinary
 * object prototype, all data descriptors (no getter/setter can run), the
 * literal kind and matching task identity, a completed/failed status, a
 * null-or-capped claims string, and a bounded numeric evidence map. All the
 * hostile-object paranoia the two old validators carried, in one place.
 */
function validateWorkerResult(value: unknown, contract: AdapterTaskContract): value is WorkerRunResult {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    const keys = Reflect.ownKeys(value);
    const expected = ["claimsText", "evidence", "kind", "requestedOutcomeSha256", "status", "taskNumber"];
    if (keys.some((key) => typeof key !== "string") || !sameLines((keys as string[]).sort(), expected)) return false;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of expected) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || !("value" in descriptor) || !descriptor.enumerable) return false;
    }
    const claimsText = descriptors.claimsText.value;
    return descriptors.kind.value === "worker-result/v1" &&
      descriptors.taskNumber.value === contract.taskNumber &&
      descriptors.requestedOutcomeSha256.value === contract.requestedOutcomeSha256 &&
      (descriptors.status.value === "completed" || descriptors.status.value === "failed") &&
      (claimsText === null || (typeof claimsText === "string" && claimsText.length <= 262_144)) &&
      validEvidence(descriptors.evidence.value);
  } catch {
    return false;
  }
}

function verifyProtectedStartingPaths(root: string, start: GitSnapshot): boolean {
  const currentStaged = lines(git(root, ["diff", "--cached", "--name-only"]));
  if (!sameLines(currentStaged, start.staged)) return false;
  for (const [path, expected] of start.protectedPaths) {
    if (worktreeHash(root, path) !== expected.worktree) return false;
    if (git(root, ["ls-files", "--stage", "--", path]) !== expected.index) return false;
  }
  return true;
}

/**
 * The bounded set of changed and untracked paths, forward-slashed and sorted.
 * This is the ground truth for what the worker (and Cairn's own record writes)
 * touched — always from Git, never from the worker's claims.
 */
function scanChangedPaths(root: string): string[] {
  return [...new Set([
    ...gitZ(root, ["diff", "--name-only", "-z", "--"]),
    ...gitZ(root, ["ls-files", "--others", "--exclude-standard", "-z", "--"]),
  ].map((path) => path.replace(/\\/g, "/")))].sort();
}

/**
 * Cairn authors the worker's task records from the parsed claims and its own
 * Git verification (Task 048, the inversion). The worker writes no record; this
 * writes the report (flag "wx" — never overwriting) and appends exactly one
 * log row, then verifies its own writes byte-back exactly as writeClosedRecords
 * does. `filesChanged` is the bounded Git-derived change set (never the claims);
 * on a stop it lists the RETAINED evidence.
 */
function cairnWorkerRecords(
  root: string,
  contract: AdapterTaskContract,
  start: GitSnapshot,
  disposition: "DONE" | "STOPPED",
  stopReason: SerialStopReason | null,
  claims: WorkerClaims | null,
  protectedValid: boolean,
  commit: { status: "created" | "skipped"; reason: string } | null,
  evidence: Record<string, number> | null,
  recovery?: RecordRecovery,
): { reportText: string; row: LogRow; verified: boolean } {
  const input: ComposedRecordInput = {
    taskNumber: contract.taskNumber,
    route: contract.route,
    disposition,
    stopReason,
    claims,
    filesChanged: scanChangedPaths(root).slice(0, 100),
    protectedIntact: protectedValid,
    commit,
    evidenceSummary: evidence ? boundedEvidenceSummary(evidence) : null,
    processFailure: null,
    paidCallStarted: true,
    recordRecovery: recovery?.disclosure ?? null,
  };
  const report = composeWorkerReport(input);
  // The report path is Cairn-owned and normally authored with "wx" so Cairn
  // never overwrites an existing file. Only in the one disclosed case where the
  // owned-records gate found the worker had pre-written this exact path does it
  // overwrite (plain "w") with this honest STOPPED report; the worker's product
  // files stay retained in the workspace for inspection.
  writeFileSync(paths.report(root, contract.taskNumber), report, {
    encoding: "utf8",
    flag: recovery?.overwriteReport ? "w" : "wx",
  });
  const row: LogRow = {
    task: pad(contract.taskNumber),
    date: new Date().toISOString().slice(0, 10),
    lane: "Standard",
    mode: "Applied",
    outcome: disposition,
    decision: disposition === "DONE" ? "completed" : "stopped",
    summary: composeWorkerRowSummary(input),
    moved: claims?.milestone ?? "NO",
  };
  appendLogRow(root, row);
  const briefPath = paths.brief(root, contract.taskNumber);
  const reportPath = paths.report(root, contract.taskNumber);
  const logPath = paths.log(root);
  const actualLog = existsSync(logPath) ? readFileSync(logPath, "utf8") : "";
  // Every read is existsSync-guarded so a worker that deleted a record can only
  // make the corresponding check false — never throw a raw ENOENT after the
  // log row was already appended (that was how a failed byte-back left a
  // standing forged record behind). The brief is Cairn's start-of-task text; on
  // a DONE it is committed, so its byte-match is verified here. On a STOPPED the
  // brief is retained evidence, not committed — its integrity is not part of
  // what makes the honest STOPPED records themselves verified, and the DONE path
  // already checks the brief before any DONE record is authored (see below).
  const checks = {
    brief: disposition === "STOPPED" ||
      (existsSync(briefPath) && readFileSync(briefPath, "utf8") === briefText(contract, false)),
    report: existsSync(reportPath) && readFileSync(reportPath, "utf8") === report,
    log: actualLog === start.logText + expectedLogLine(row),
    row: parseLog(root).filter((item) => item.task === pad(contract.taskNumber)).length === 1,
  };
  const verified = checks.brief && checks.report && checks.log && checks.row;
  return { reportText: report, row, verified };
}

function isAncestor(root: string, ancestor: string, descendant: string): boolean {
  try {
    git(root, ["merge-base", "--is-ancestor", ancestor, descendant]);
    return true;
  } catch {
    return false;
  }
}

function changedTaskPaths(root: string, contract: AdapterTaskContract): string[] | null {
  const values = new Set([
    ...gitZ(root, ["diff", "--name-only", "-z", "--"]),
    ...gitZ(root, ["ls-files", "--others", "--exclude-standard", "-z", "--"]),
  ].map((path) => path.replace(/\\/g, "/")));
  const owned = new Set(contract.ownedRecords);
  for (const path of values) {
    const absolute = resolve(root, path);
    const relativePath = relative(root, absolute).replace(/\\/g, "/");
    if (!path || isAbsolute(path) || relativePath.startsWith("../") || isAbsolute(relativePath)) return null;
    if (path.split("/").includes(".git")) return null;
    if (path.startsWith("docs/ai-work/tasks/") && !owned.has(path)) return null;
  }
  // Cairn now authors the owned records AFTER this scan (Task 048), so they are
  // no longer required to pre-exist in the change set. Every other safety line
  // stays: no path escapes the project, touches .git, or writes a task record
  // Cairn does not own.
  return [...values].sort();
}

function unstageExactPaths(root: string, pathsToUnstage: readonly string[]): void {
  try {
    git(root, ["restore", "--staged", "--", ...pathsToUnstage]);
  } catch {
    // Retain the staged evidence if Git cannot safely restore the index.
  }
}

/**
 * Stages exactly the expected set (product paths ∪ owned records) and creates
 * one isolated exact-path task commit. The full changed set must already equal
 * the expected set; the staged list must match it with nothing else changed or
 * untracked; ancestry and a single-commit count confirm one isolated commit.
 * Any failure returns null with the index restored, and the caller closes
 * MODEL_RESULT_NOT_VERIFIED.
 */
function commitExactPaths(root: string, start: GitSnapshot, expected: readonly string[], taskNumber: number): RecordCommit | null {
  if (expected.length === 0) return null;
  const expectedSorted = [...expected].sort();
  try {
    // Recompute the full changed set now that the records are written; it must
    // be exactly the product paths plus the owned records, nothing else.
    if (!sameLines(scanChangedPaths(root), expectedSorted)) return null;
    git(root, ["add", "--", ...expectedSorted]);
    const staged = gitZ(root, ["diff", "--cached", "--name-only", "-z", "--"]).map((path) => path.replace(/\\/g, "/")).sort();
    if (!sameLines(staged, expectedSorted) ||
        gitZ(root, ["diff", "--name-only", "-z", "--"]).length > 0 ||
        gitZ(root, ["ls-files", "--others", "--exclude-standard", "-z", "--"]).length > 0) {
      unstageExactPaths(root, expectedSorted);
      return null;
    }
    git(root, ["commit", "-m", `Task ${pad(taskNumber)}: complete verified worker task`]);
  } catch {
    if (git(root, ["rev-parse", "HEAD"]) === start.head) unstageExactPaths(root, expectedSorted);
    return null;
  }
  const committedHead = git(root, ["rev-parse", "HEAD"]);
  if (!isAncestor(root, start.head, committedHead)) return null;
  if (Number(git(root, ["rev-list", "--count", `${start.head}..${committedHead}`])) !== 1) return null;
  // The commit's correctness is fully established before and by the commit:
  // the pre-commit checks proved exactly the expected set was staged with
  // nothing else changed or untracked, and the ancestry and single-commit count
  // confirm one isolated commit. A post-commit whole-tree cleanliness check is
  // not re-run here: it can report a file as dirty on a stat difference alone
  // (identical content, e.g. a CRLF working copy over an LF index) and would
  // tear a correct DONE commit into STOPPED (Task 006).
  return { status: "created", reason: "Cairn created one isolated exact-path local task commit.", hash: committedHead };
}

function freezeContract(contract: AdapterTaskContract): AdapterTaskContract {
  Object.freeze(contract.route);
  Object.freeze(contract.protectedGit);
  Object.freeze(contract.ownedRecords);
  Object.freeze(contract.checks);
  Object.freeze(contract.stopConditions);
  return Object.freeze(contract);
}

function verifyProtected(root: string, start: GitSnapshot, owned: ReadonlySet<string>): boolean {
  // The same phantom filter as the start snapshot, or a stat-only difference
  // present since the start would read as a protected-work change.
  const current = statusLines(root);
  const currentOther = statusWithoutOwned(current, owned);
  const startOther = statusWithoutOwned(start.status, owned);
  const head = git(root, ["rev-parse", "HEAD"]);
  return head === start.head && sameLines(currentOther, startOther);
}

function recordCommit(root: string, taskNumber: number, start: GitSnapshot, owned: string[], requested: boolean): RecordCommit {
  if (!requested) return { status: "skipped", reason: "Automatic record commit was not requested." };
  if (start.staged.length > 0) return { status: "skipped", reason: "Existing staged work is protected." };
  const logRelative = rel(root, paths.log(root));
  if (start.status.some((entry) => entry.slice(3).replace(/\\/g, "/") === logRelative)) {
    return { status: "skipped", reason: "The work log already had protected changes." };
  }
  try {
    git(root, ["add", "--", ...owned]);
    const staged = lines(git(root, ["diff", "--cached", "--name-only"]));
    if (!sameLines([...staged].sort(), [...owned].sort())) {
      return { status: "skipped", reason: "Exact staged-path isolation could not be proved." };
    }
    git(root, ["commit", "-m", `Task ${pad(taskNumber)}: record offline serial demonstration`]);
    return { status: "created", reason: "Only the three named task records were committed.", hash: git(root, ["rev-parse", "HEAD"]) };
  } catch {
    return { status: "skipped", reason: "Git could not create the exact record commit; the records were retained." };
  }
}

function writeClosedRecords(
  root: string,
  contract: AdapterTaskContract,
  demo: boolean,
  disposition: "DONE" | "STOPPED",
  reason: SerialStopReason | null,
  start: GitSnapshot,
  commitRequested: boolean,
  processEvidence?: Record<string, number>,
  processFailure?: ProcessFailureNote,
  orphanRisk = false,
): { reportText: string; row: LogRow; verified: boolean } {
  const report = reportText(contract, demo, disposition, reason, commitRequested, processEvidence, processFailure, orphanRisk);
  writeFileSync(paths.report(root, contract.taskNumber), report, { encoding: "utf8", flag: "wx" });
  const row = rowFor(contract, demo, disposition, reason);
  appendLogRow(root, row);
  const actualLog = readFileSync(paths.log(root), "utf8");
  const checks = {
    brief: readFileSync(paths.brief(root, contract.taskNumber), "utf8") === briefText(contract, demo),
    report: readFileSync(paths.report(root, contract.taskNumber), "utf8") === report,
    log: actualLog === start.logText + expectedLogLine(row),
    row: parseLog(root).filter((item) => item.task === pad(contract.taskNumber)).length === 1,
  };
  const verified = checks.brief && checks.report && checks.log && checks.row;
  return { reportText: report, row, verified };
}

function writeSafetyRecordsWhenUnclaimed(
  root: string,
  contract: AdapterTaskContract,
  demo: boolean,
  reason: SerialStopReason,
  start: GitSnapshot,
  commitRequested: boolean,
  processEvidence?: Record<string, number>,
  processFailure?: ProcessFailureNote,
  orphanRisk = false,
): { reportText: string; row: LogRow; verified: boolean } | null {
  if (existsSync(paths.report(root, contract.taskNumber))) return null;
  if (readFileSync(paths.log(root), "utf8") !== start.logText) return null;
  return writeClosedRecords(root, contract, demo, "STOPPED", reason, start, commitRequested, processEvidence, processFailure, orphanRisk);
}

function replaceDoneRecordsWithStopped(
  root: string,
  contract: AdapterTaskContract,
  demo: boolean,
  start: GitSnapshot,
  commitRequested: boolean,
  done: { reportText: string; row: LogRow },
  reason: SerialStopReason = "RECORD_VERIFICATION_FAILED",
  processEvidence?: Record<string, number>,
): { reportText: string; row: LogRow; verified: boolean } | null {
  const reportPath = paths.report(root, contract.taskNumber);
  const currentReport = readFileSync(reportPath, "utf8");
  const currentLog = readFileSync(paths.log(root), "utf8");
  if (currentReport !== done.reportText || currentLog !== start.logText + expectedLogLine(done.row)) {
    return null;
  }

  const stoppedReport = reportText(contract, demo, "STOPPED", reason, commitRequested, processEvidence);
  const stoppedRow = rowFor(contract, demo, "STOPPED", reason);
  writeFileSync(reportPath, stoppedReport, "utf8");
  writeFileSync(paths.log(root), start.logText + expectedLogLine(stoppedRow), "utf8");

  const verified = readFileSync(reportPath, "utf8") === stoppedReport &&
    readFileSync(paths.log(root), "utf8") === start.logText + expectedLogLine(stoppedRow) &&
    parseLog(root).filter((item) => item.task === pad(contract.taskNumber) && item.outcome === "STOPPED").length === 1;
  return { reportText: stoppedReport, row: stoppedRow, verified };
}

/**
 * Task 058, corrected by Task 059: the throw-site log restore — the catch-path
 * residual Task 052 left open. A `RECORD_VERIFICATION_FAILED` throw out of
 * `runSerialTask` returns no result, so the run is must-inspect; the one thing
 * that must not survive it is a row in Cairn's own append-only work log that
 * does not describe a run that finished — a worker-forged row, or a DONE row
 * whose honest STOPPED rewrite failed.
 *
 * Why the task-start snapshot is the right state to write back is NOT that no
 * row written during the run passed its byte-back check: at the two
 * `replaceDoneRecordsWithStopped` sites below a DONE row demonstrably did pass
 * it. Verified-as-written is not verified-as-true. Those rows say DONE, and the
 * run they describe threw instead of completing, so the DONE row — and the stone
 * it would earn — must not stand. The last log state that is both Cairn's own
 * and still true of this run is therefore the task-start snapshot, written back
 * with the same mechanics the 052 owned-records gate uses.
 *
 * Only Cairn's OWN record is restored: the worker's product-file changes, its
 * report, and its brief stay retained in the workspace for inspection. Restoring
 * a log an owner edited mid-run discards that edit; LOG.md is committed, so it
 * is recoverable from Git (see the Task 059 report).
 *
 * Like every other record write in this file, the restore is read back. It
 * returns whether the restore took, so the caller can say so in the thrown
 * message; a false return NEVER suppresses the throw.
 */
function restoreLogBeforeThrow(root: string, start: GitSnapshot): boolean {
  try {
    const logPath = paths.log(root);
    if (existsSync(logPath) && readFileSync(logPath, "utf8") === start.logText) return true;
    writeFileSync(logPath, start.logText, "utf8");
    return readFileSync(logPath, "utf8") === start.logText;
  } catch {
    // The log could not be restored. The throw still forces inspection, and the
    // caller appends the unrestored-log clause so the owner is told why.
    return false;
  }
}

/**
 * Task 059: one `RECORD_VERIFICATION_FAILED` message, plus a plain clause when
 * the throw-site log restore did not take. Silence would let an unrestorable log
 * read exactly like a restored one.
 */
function recordVerificationFailed(detail: string, restored: boolean): Error {
  const unrestored = " The work log could not be restored and may carry rows Cairn did not write.";
  return new Error(`RECORD_VERIFICATION_FAILED: ${detail}${restored ? "" : unrestored}`);
}

export function previewSerialRoute(outcome: string, adapters: readonly TaskAdapter[], adapterId?: string): RouteResult {
  return routeTask({ outcome, capability: "serial-task" }, adapters, adapterId);
}

export async function runSerialTask(root: string, outcome: string, options: SerialRunOptions): Promise<SerialRunResult> {
  const projectRoot = resolve(root);
  if (activeRoots.has(projectRoot)) throw new Error("SERIAL_RUN_ACTIVE: One task is already running for this project.");
  assertGoverned(projectRoot);
  const activities: SerialActivity[] = [];
  const route = previewSerialRoute(outcome, options.adapters, options.adapterId);
  emit(activities, options.events, {
    stage: "Route",
    state: route.status === "ready" ? "done" : "stopped",
    detail: route.status === "ready" ? route.reason : route.reason,
  });
  if (route.status === "connection-required") return { status: "connection-required", route, activities };
  activeRoots.add(projectRoot);
  let lock: RunLock;
  try {
    lock = acquireRunLock(projectRoot);
  } catch (error) {
    activeRoots.delete(projectRoot);
    throw error;
  }
  // Set true only when a timeout/cancel kill could not be confirmed: a live
  // orphan may still be writing this workspace, so the run lock is deliberately
  // NOT released (see the finally). Fail-closed: the lock holder is this app
  // process (alive), so the next run is refused SERIAL_RUN_ACTIVE rather than
  // self-healed. The residual risk is bounded — a stale-lock heal only applies
  // once this app restarts (its pid then reads as dead) — and documented.
  let unconfirmedKill = false;
  try {
    const chosen = options.adapters.find((item) => item.descriptor.id === route.recommended.id);
    if (!chosen) throw new Error("ROUTE_ADAPTER_MISSING");
    const demo = chosen.descriptor.capabilities.includes("offline-demo");
    const details = (options.details ?? "").trim();
    const start = snapshot(projectRoot);
    const taskNumber = nextTaskNumber(projectRoot);
    mkdirSync(paths.tasks(projectRoot), { recursive: true });
    const owned = [
      rel(projectRoot, paths.brief(projectRoot, taskNumber)),
      rel(projectRoot, paths.report(projectRoot, taskNumber)),
      rel(projectRoot, paths.log(projectRoot)),
    ];
    const ownedSet = new Set(owned);
    const contract: AdapterTaskContract = {
      version: "cairn-serial-task/v2",
      taskNumber,
      requestedOutcome: outcome.trim(),
      details,
      // The digest binds the outcome AND the owner's details together, always
      // as the two-part JSON array (an empty details string included). A result
      // echoing the outcome-only digest cannot pass for a detailed request, and
      // an authorization bound to one pair cannot dispatch the other.
      requestedOutcomeSha256: sha256(JSON.stringify([outcome.trim(), details])),
      supportedOutcome: demo ? OFFLINE_SUPPORTED_OUTCOME : WORKER_SUPPORTED_OUTCOME,
      lane: "Standard",
      route: {
        adapterId: route.recommended.id,
        adapterLabel: route.recommended.label,
        provider: route.recommended.provider,
        model: route.recommended.model,
        reason: route.reason,
      },
      ownedRecords: owned,
      protectedGit: {
        head: start.head,
        dirty: start.status.length > 0,
        staged: start.staged.length > 0,
      },
      checks: demo ? [
        "Validate the adapter result against the exact fixed schema.",
        "Confirm only the three owned records changed beyond the protected starting state.",
        "Confirm one terminal disposition and one append-only log row.",
      ] : [
        `Confirm exactly one ${route.recommended.label} worker returns one completed result with bounded numeric evidence.`,
        "Confirm the worker's final message carries one readable cairn-claims block and the append-only log gains one matching Cairn-authored row.",
        "Confirm protected starting work is byte-identical and Cairn creates one exact-path local commit for a clean-start DONE result.",
      ],
      stopConditions: demo ? [
        "The adapter fails or returns an invalid value.",
        "Protected Git work changes unexpectedly.",
        "Any task record cannot be verified exactly.",
      ] : [
        "A real worker process or model call would start without separate authorization.",
        "The process fails, returns invalid bounded evidence, returns no readable claims, or claims STOPPED.",
        "Protected Git work changes unexpectedly.",
        "Any task record cannot be verified exactly.",
      ],
    };
    const contractMarkdown = briefText(contract, demo);
    writeFileSync(paths.brief(projectRoot, taskNumber), contractMarkdown, { encoding: "utf8", flag: "wx" });

    emit(activities, options.events, {
      stage: "Run",
      state: "working",
      detail: demo
        ? "Running the deterministic offline demonstration."
        : `Running one confirmed ephemeral workspace-scoped ${contract.route.adapterLabel} request.`,
    });
    let adapterValue: unknown;
    try {
      adapterValue = await chosen.run(freezeContract(contract), options.signal);
    } catch (error) {
      // The catch keys only on the UNIVERSAL error classes: a boundary stop is
      // REAL_MODEL_CALL_NOT_AUTHORIZED; a process error closes by its `failure`
      // kind (timeout → ADAPTER_TIMED_OUT, cancelled → CANCELLED_BY_OWNER,
      // process → ADAPTER_FAILED); anything else is ADAPTER_FAILED.
      const reason: SerialStopReason = error instanceof WorkerBoundaryError
        ? "REAL_MODEL_CALL_NOT_AUTHORIZED"
        : error instanceof WorkerProcessError
          ? error.failure === "timeout"
            ? "ADAPTER_TIMED_OUT"
            : error.failure === "cancelled"
              ? "CANCELLED_BY_OWNER"
              : "ADAPTER_FAILED"
          : "ADAPTER_FAILED";
      const processFailure: ProcessFailureNote | undefined = error instanceof WorkerProcessError
        ? { code: error.code, debugPath: error.debugPath }
        : undefined;
      // An unconfirmed kill (the child never closed after a timeout/cancel kill)
      // means a live orphan may still be writing. Keep the run lock (see finally)
      // and say so plainly in both the activity and the STOPPED report.
      const orphanRisk = error instanceof WorkerProcessError &&
        (error.failure === "timeout" || error.failure === "cancelled") &&
        error.killConfirmed === false;
      if (orphanRisk) unconfirmedKill = true;
      emit(activities, options.events, {
        stage: "Run",
        state: "stopped",
        detail: reason === "REAL_MODEL_CALL_NOT_AUTHORIZED"
          ? `Stopped before starting the real ${contract.route.adapterLabel} process.`
          : orphanRisk
            ? `The worker process could not be confirmed dead; the run lock was left in place. Close the orphaned process, then restart the app before the next task.`
            : processFailure
              ? `The adapter stopped safely (${processFailure.code}).${processFailure.debugPath ? ` Raw run evidence: ${processFailure.debugPath}` : ""}`
              : "The adapter stopped safely.",
      });
      const closed = writeSafetyRecordsWhenUnclaimed(projectRoot, contract, demo, reason, start, Boolean(options.commitRecords), undefined, processFailure, orphanRisk);
      if (!closed?.verified) {
        // The worker may have forged a log row before forcing this thrown close
        // (a tampered log is exactly why the safety close returns null here).
        const restored = restoreLogBeforeThrow(projectRoot, start);
        throw recordVerificationFailed("Model-authored evidence was retained without overwrite.", restored);
      }
      emit(activities, options.events, { stage: "Result", state: "stopped", detail: `STOPPED — ${reason}` });
      return {
        status: "stopped", reason, taskNumber, disposition: "STOPPED",
        briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
        reportText: closed.reportText, row: closed.row, route, activities,
        commit: { status: "skipped", reason: "Stopped tasks are retained for inspection." },
      };
    }
    emit(activities, options.events, {
      stage: "Run",
      state: "done",
      detail: demo ? "The offline adapter returned one result." : `One ${contract.route.adapterLabel} process returned bounded terminal evidence.`,
    });
    emit(activities, options.events, { stage: "Check", state: "working", detail: "Checking the result, records, and protected Git state." });
    if (!demo) {
      const workerResult = validateWorkerResult(adapterValue, contract) ? adapterValue : null;
      const resultValid = workerResult !== null;
      if (workerResult) {
        emit(activities, options.events, { stage: "Check", state: "working", detail: boundedEvidenceSummary(workerResult.evidence) });
      }
      const workerCompleted = workerResult?.status === "completed";
      const protectedValid = verifyProtectedStartingPaths(projectRoot, start);
      // The worker authored no record; it speaks through one cairn-claims fence.
      const claims = workerResult ? parseWorkerClaims(workerResult.claimsText) : null;
      const stopReason: SerialStopReason | null = !resultValid
        ? "INVALID_ADAPTER_RESULT"
        : !workerCompleted
          ? "ADAPTER_FAILED"
          : !protectedValid
            ? "PROTECTED_WORK_CHANGED"
            : !claims
              ? "WORKER_CLAIMS_MISSING"
              : claims.disposition === "STOPPED"
                ? "MODEL_REPORTED_STOPPED"
                : null;

      // A STOPPED close: Cairn authors honest STOPPED records from whatever
      // claims (if any) survived, keeps the retained evidence, commits nothing.
      const closeStopped = (reason: SerialStopReason, recovery?: RecordRecovery): SerialRunResult => {
        emit(activities, options.events, { stage: "Check", state: "stopped", detail: `Stopped safely: ${reason}.` });
        const records = cairnWorkerRecords(projectRoot, contract, start, "STOPPED", reason, claims, protectedValid, null, workerResult?.evidence ?? null, recovery);
        if (!records.verified) {
          const restored = restoreLogBeforeThrow(projectRoot, start);
          throw recordVerificationFailed("Worker-authored evidence was retained without overwrite.", restored);
        }
        emit(activities, options.events, { stage: "Result", state: "stopped", detail: `STOPPED — ${reason}` });
        return {
          status: "stopped", reason, taskNumber, disposition: "STOPPED",
          briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
          reportText: records.reportText, row: records.row, route, activities,
          commit: { status: "skipped", reason: "Stopped evidence was retained for inspection." },
        };
      };

      // A DONE write whose byte-back verification fails must never leave a
      // forged DONE report/log row standing. Rewrite the just-written DONE
      // records to honest STOPPED records in place — replaceDoneRecordsWithStopped
      // only proceeds when the on-disk records are byte-for-byte the DONE ones —
      // and close RECORD_VERIFICATION_FAILED. Only an unrewritable failure throws.
      const closeRecordRewrite = (done: { reportText: string; row: LogRow }): SerialRunResult => {
        const stopped = replaceDoneRecordsWithStopped(
          projectRoot, contract, demo, start, Boolean(options.commitRecords), done,
          "RECORD_VERIFICATION_FAILED", workerResult?.evidence ?? undefined,
        );
        if (!stopped?.verified) {
          // The DONE row could not be rewritten as an honest STOPPED row. That
          // row may well have passed its own byte-back check, but the run it
          // claims threw instead of completing, so it must not stand: restore
          // the log to what Cairn last wrote that is still true of this run.
          const restored = restoreLogBeforeThrow(projectRoot, start);
          throw recordVerificationFailed("Task records were retained for inspection.", restored);
        }
        emit(activities, options.events, { stage: "Check", state: "stopped", detail: "Stopped safely: RECORD_VERIFICATION_FAILED." });
        emit(activities, options.events, { stage: "Result", state: "stopped", detail: "STOPPED — RECORD_VERIFICATION_FAILED" });
        return {
          status: "stopped", reason: "RECORD_VERIFICATION_FAILED", taskNumber, disposition: "STOPPED",
          briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
          reportText: stopped.reportText, row: stopped.row, route, activities,
          commit: { status: "skipped", reason: "Record verification failed." },
        };
      };

      // Owned-records integrity gate (Task 052). The task brief, the append-only
      // work log, and the task report path are all Cairn-owned records that live
      // OUTSIDE the protected-path snapshot: the brief and report are written
      // untracked at task start, and the log is one Cairn appends to itself. A
      // worker can therefore edit any of them and still pass every protected-work
      // and exact-path check. Before ANY record-writing close — the claims-lane
      // stop closes below OR the DONE authoring further down — verify all three
      // are exactly as Cairn left them at task start. On any violation, recover
      // Cairn's OWN records (restore the log, overwrite the report) and close
      // honestly as STOPPED, so no forged DONE, log row, or stone can stand.
      const briefPath = paths.brief(projectRoot, taskNumber);
      const reportPath = paths.report(projectRoot, taskNumber);
      const logPath = paths.log(projectRoot);
      const ownedRecordsGuard = (): SerialRunResult | null => {
        const briefIntact = existsSync(briefPath) && readFileSync(briefPath, "utf8") === contractMarkdown;
        const logIntact = existsSync(logPath) && readFileSync(logPath, "utf8") === start.logText;
        const reportPresent = existsSync(reportPath);
        if (briefIntact && logIntact && !reportPresent) return null;

        const disclosures: string[] = [];
        if (!logIntact) {
          // The log is Cairn's OWN append-only record. Restoring it from the
          // task-start snapshot is NOT destroying worker evidence — the worker's
          // product-file changes stay retained in the workspace for inspection;
          // leaving a worker-forged row standing WOULD be dishonest. The restore
          // must happen BEFORE the stop close writes its records so the close's
          // byte-back append starts from the pristine log.
          writeFileSync(logPath, start.logText, "utf8");
          disclosures.push(
            "The worker modified the append-only work log; Cairn restored it from the task-start snapshot and recorded this stop. " +
              "The worker's modification was discarded from the log; its product-file changes remain retained in the workspace for inspection.",
          );
        }
        if (reportPresent) {
          disclosures.push("The worker pre-wrote the task report path; Cairn replaced it with this honest record.");
        }
        // A tampered or missing brief is retained as evidence (never restored);
        // like the 051 brief check it only triggers this honest stop.
        return closeStopped("RECORD_VERIFICATION_FAILED", {
          disclosure: disclosures.length > 0 ? disclosures.join(" ") : null,
          overwriteReport: reportPresent,
        });
      };
      const guarded = ownedRecordsGuard();
      if (guarded) return guarded;

      if (stopReason) return closeStopped(stopReason);

      // DONE path — the claims say DONE, the process completed, and protected
      // work is byte-identical. Cairn writes the records and owns the commit.
      // A worker that committed on its own (head moved) is not verifiable. The
      // owned-records gate above already proved the brief, log, and report path
      // are byte-exactly as Cairn left them, so no forged DONE record can stand.
      if (git(projectRoot, ["rev-parse", "HEAD"]) !== start.head) return closeStopped("MODEL_RESULT_NOT_VERIFIED");

      if (start.status.length > 0) {
        // A protected dirty start forbids an isolated commit: the records are
        // written but the product changes stay uncommitted for the owner.
        const commit: RecordCommit = { status: "skipped", reason: "Protected starting work prevented an isolated task commit." };
        const records = cairnWorkerRecords(projectRoot, contract, start, "DONE", null, claims, protectedValid, commit, workerResult?.evidence ?? null);
        if (!records.verified) return closeRecordRewrite(records);
        emit(activities, options.events, { stage: "Check", state: "done", detail: "The worker result and protected work were verified; the dirty start keeps the product changes uncommitted." });
        emit(activities, options.events, { stage: "Result", state: "done", detail: `DONE — one real ${contract.route.adapterLabel} task completed and was verified.` });
        return {
          status: "done", taskNumber, disposition: "DONE",
          briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
          reportText: records.reportText, row: records.row, route, activities, commit,
        };
      }

      // Clean start: the product change set must be Cairn-committable exactly.
      const productPaths = changedTaskPaths(projectRoot, contract);
      if (!productPaths) return closeStopped("MODEL_RESULT_NOT_VERIFIED");
      const records = cairnWorkerRecords(
        projectRoot, contract, start, "DONE", null, claims, protectedValid,
        { status: "created", reason: "One exact-path commit contains the product changes and these records." },
        workerResult?.evidence ?? null,
      );
      if (!records.verified) return closeRecordRewrite(records);
      const expectedCommitSet = [...new Set([...productPaths, ...contract.ownedRecords])];
      const commit = commitExactPaths(projectRoot, start, expectedCommitSet, taskNumber);
      if (!commit) {
        // Any staging/commit failure: undo staging, rewrite the DONE records as
        // STOPPED (this self-check is the one surviving use), and close
        // MODEL_RESULT_NOT_VERIFIED with the evidence retained.
        unstageExactPaths(projectRoot, expectedCommitSet);
        const stopped = replaceDoneRecordsWithStopped(
          projectRoot, contract, demo, start, Boolean(options.commitRecords), records, "MODEL_RESULT_NOT_VERIFIED", workerResult?.evidence ?? undefined,
        );
        if (!stopped?.verified) {
          // The verified DONE row above described a run that then failed to
          // commit; a DONE row for a thrown run must not stand.
          const restored = restoreLogBeforeThrow(projectRoot, start);
          throw recordVerificationFailed("Task records were retained for inspection.", restored);
        }
        emit(activities, options.events, { stage: "Check", state: "stopped", detail: "Stopped safely: MODEL_RESULT_NOT_VERIFIED." });
        emit(activities, options.events, { stage: "Result", state: "stopped", detail: "STOPPED — MODEL_RESULT_NOT_VERIFIED" });
        return {
          status: "stopped", reason: "MODEL_RESULT_NOT_VERIFIED", taskNumber, disposition: "STOPPED",
          briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
          reportText: stopped.reportText, row: stopped.row, route, activities,
          commit: { status: "skipped", reason: "Record verification failed." },
        };
      }
      emit(activities, options.events, { stage: "Check", state: "done", detail: "The worker result, task records, protected work, and Cairn-owned Git result were verified." });
      emit(activities, options.events, { stage: "Result", state: "done", detail: `DONE — one real ${contract.route.adapterLabel} task completed and was verified.` });
      return {
        status: "done", taskNumber, disposition: "DONE",
        briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
        reportText: records.reportText, row: records.row, route, activities, commit,
      };
    }
    const resultValid = chosen.descriptor.capabilities.includes("offline-demo") && validateWorkerResult(adapterValue, contract);
    const protectedValid = verifyProtected(projectRoot, start, ownedSet);
    const stopReason: SerialStopReason | null = !resultValid
      ? "INVALID_ADAPTER_RESULT"
      : !protectedValid
        ? "PROTECTED_WORK_CHANGED"
        : null;
    if (stopReason) {
      emit(activities, options.events, { stage: "Check", state: "stopped", detail: `Stopped safely: ${stopReason}.` });
      const closed = writeClosedRecords(projectRoot, contract, demo, "STOPPED", stopReason, start, Boolean(options.commitRecords));
      emit(activities, options.events, { stage: "Result", state: "stopped", detail: `STOPPED — ${stopReason}` });
      return {
        status: "stopped", reason: stopReason, taskNumber, disposition: "STOPPED",
        briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
        reportText: closed.reportText, row: closed.row, route, activities,
        commit: { status: "skipped", reason: "Stopped tasks are retained for inspection." },
      };
    }
    const closed = writeClosedRecords(projectRoot, contract, demo, "DONE", null, start, Boolean(options.commitRecords));
    if (!closed.verified || !verifyProtected(projectRoot, start, ownedSet)) {
      // Replace the success records only when they are byte-for-byte the records
      // written above. This keeps the log and report honest without overwriting a
      // concurrent or owner-authored change.
      const stopped = replaceDoneRecordsWithStopped(
        projectRoot,
        contract,
        demo,
        start,
        Boolean(options.commitRecords),
        closed,
      );
      if (!stopped?.verified) {
        // Reachable with a verified DONE row on disk (the protected-work
        // disjunct above); the run still did not finish honestly, so the row goes.
        const restored = restoreLogBeforeThrow(projectRoot, start);
        throw recordVerificationFailed("Task records were retained for inspection.", restored);
      }
      emit(activities, options.events, { stage: "Check", state: "stopped", detail: "Stopped safely: RECORD_VERIFICATION_FAILED." });
      emit(activities, options.events, { stage: "Result", state: "stopped", detail: "STOPPED — RECORD_VERIFICATION_FAILED" });
      return {
        status: "stopped", reason: "RECORD_VERIFICATION_FAILED", taskNumber, disposition: "STOPPED",
        briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
        reportText: stopped.reportText, row: stopped.row, route, activities,
        commit: { status: "skipped", reason: "Record verification failed." },
      };
    }
    emit(activities, options.events, { stage: "Check", state: "done", detail: "The result and three owned records were verified." });
    const commit = recordCommit(projectRoot, taskNumber, start, owned, Boolean(options.commitRecords));
    emit(activities, options.events, { stage: "Result", state: "done", detail: "Verified offline result. The requested product change was not attempted." });
    return {
      status: "done", taskNumber, disposition: "DONE",
      briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
      reportText: closed.reportText, row: closed.row, route, activities, commit,
    };
  } finally {
    // The in-process guard always clears. The cross-process file lock is
    // released only when no unconfirmed-kill stop occurred: if a live orphan may
    // still be writing this workspace, the lock stays so the next task is
    // refused (this app's pid still holds it) instead of starting against a
    // workspace a rogue process is mutating. Restarting the app lets the normal
    // stale-lock heal apply once this pid reads as dead.
    if (!unconfirmedKill) lock.release();
    activeRoots.delete(projectRoot);
  }
}
