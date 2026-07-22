import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { isCodexExecModelCallBoundaryError } from "./codex.js";
import { appendLogRow, isCairnProject, nextTaskNumber, pad, parseFacts, parseLog, paths, type LogRow } from "./files.js";
import {
  routeTask,
  type AdapterTaskContract,
  type CodexExecResult,
  type OfflineDemoResult,
  type RouteResult,
  type TaskAdapter,
} from "./routing.js";

const OFFLINE_SUPPORTED_OUTCOME = "Demonstrate serial routing and verify honest task records without implementing the requested product change.";
const CODEX_SUPPORTED_OUTCOME = "Run one explicitly confirmed, ephemeral, workspace-scoped Codex Exec task and verify its task records and Git result.";
const RESULT_STATEMENT = "The offline route completed without attempting the requested product change.";
const activeRoots = new Set<string>();

export type SerialStage = "Route" | "Run" | "Check" | "Result";
export interface SerialActivity { stage: SerialStage; state: "working" | "done" | "stopped"; detail: string }
export interface SerialRunEvents { onActivity?: (activity: SerialActivity) => void }
export interface SerialRunOptions {
  adapters: readonly TaskAdapter[];
  adapterId?: string;
  commitRecords?: boolean;
  events?: SerialRunEvents;
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
  | "MODEL_RECORDS_MISSING"
  | "REAL_MODEL_CALL_NOT_AUTHORIZED"
  | "MODEL_REPORTED_STOPPED"
  | "MODEL_RESULT_NOT_VERIFIED";

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

function snapshot(root: string): GitSnapshot {
  const top = resolve(git(root, ["rev-parse", "--show-toplevel"]));
  if (top.toLowerCase() !== resolve(root).toLowerCase()) throw new Error("PROJECT_ROOT_MISMATCH");
  const status = lines(git(root, ["status", "--porcelain=v1", "--untracked-files=all"]));
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

function briefText(contract: AdapterTaskContract): string {
  const status = contract.protectedGit.dirty ? "existing changes protected" : "clean";
  const codex = contract.route.adapterId === "codex-exec";
  const title = codex ? "one confirmed real Codex Exec task" : "offline serial demonstration";
  const lane = codex
    ? "one explicitly confirmed OpenAI Codex Exec call; the model may make in-scope local workspace changes"
    : "local, deterministic, record-only demonstration";
  const done = codex
    ? "DONE means the one Codex Exec process completed, the requested outcome and checks are reported, the append-only log row matches, protected starting work remains intact, and Cairn verified Git isolation and created the exact-path commit when the task started clean."
    : "DONE means the offline route and its three records are verified. It does not mean the requested product change was implemented.";
  const stopped = codex
    ? "STOPPED means the call was not authorized, the model reported a stop, process evidence failed, protected work changed, or the result records could not be verified."
    : "STOPPED means the serial demonstration or its protection checks did not complete.";
  return `# Task ${pad(contract.taskNumber)} — ${title}

Requested outcome: ${escapeLine(contract.requestedOutcome)}

Supported outcome: ${contract.supportedOutcome}

Lane: **Standard** — ${lane}.

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

function boundedEventSummary(result: CodexExecResult): string {
  return `Bounded Codex events: ${result.agentMessageCount} agent messages; ${result.commandExecutionCount} command executions; ${result.fileChangeCount} file changes; ${result.failedToolItemCount} failed command/file-change items.`;
}

function reportText(
  contract: AdapterTaskContract,
  disposition: "DONE" | "STOPPED",
  reason: SerialStopReason | null,
  commitRequested: boolean,
  processEvidence?: CodexExecResult,
): string {
  const taskNumber = contract.taskNumber;
  const codex = contract.route.adapterId === "codex-exec";
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
    ? `\n## Bounded process evidence\n\n${boundedEventSummary(processEvidence)} Cairn did not retain item text, reasoning, commands, paths, stdout, stderr, thread IDs, account details, authentication data, or credentials.\n`
    : "";
  return `# Task ${pad(taskNumber)} — ${title}

## Result

Routing demonstration: **stopped**

Requested product change: **${codex ? "not verified" : "not attempted"}**
${boundedEvidence}

The ${subject} stopped with the fixed error code \`${reason}\`. Cairn did not retry and did not include raw adapter output or error text. ${codex ? "The workspace may contain retained model-authored evidence and must be inspected before another task." : ""}

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

function rowFor(contract: AdapterTaskContract, disposition: "DONE" | "STOPPED", reason: SerialStopReason | null): LogRow {
  const codexBoundary = contract.route.adapterId === "codex-exec" && reason === "REAL_MODEL_CALL_NOT_AUTHORIZED";
  const codex = contract.route.adapterId === "codex-exec";
  return {
    task: pad(contract.taskNumber),
    date: new Date().toISOString().slice(0, 10),
    lane: "Standard",
    mode: "Applied",
    outcome: disposition,
    decision: disposition === "DONE" ? "completed" : "stopped",
    summary: codexBoundary
      ? "Codex Exec was installed and connected; Cairn stopped before the real process or model call."
      : codex
        ? `Codex Exec stopped safely (${reason}); requested change was not verified.`
      : disposition === "DONE"
        ? "Offline routing demonstration verified; requested product change not attempted."
        : `Offline routing demonstration stopped safely (${reason}); requested product change not attempted.`,
    moved: "NO",
  };
}

function validateAdapterResult(value: unknown, contract: AdapterTaskContract): value is OfflineDemoResult {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    const keys = Reflect.ownKeys(value);
    const expected = ["kind", "requestedOutcomeSha256", "statement", "taskNumber"].sort();
    if (keys.some((key) => typeof key !== "string") || !sameLines((keys as string[]).sort(), expected)) return false;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of expected) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || !("value" in descriptor) || !descriptor.enumerable) return false;
    }
    return descriptors.kind.value === "offline-demo-result" &&
      descriptors.taskNumber.value === contract.taskNumber &&
      descriptors.requestedOutcomeSha256.value === contract.requestedOutcomeSha256 &&
      descriptors.statement.value === RESULT_STATEMENT;
  } catch {
    return false;
  }
}

function validateCodexResult(value: unknown, contract: AdapterTaskContract): value is CodexExecResult {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    const keys = Reflect.ownKeys(value);
    const expected = [
      "agentMessageCount", "cachedInputTokens", "commandExecutionCount", "exitCode",
      "failedToolItemCount", "fileChangeCount", "inputTokens", "kind", "outputTokens",
      "processCount", "reasoningOutputTokens", "requestedOutcomeSha256", "statement",
      "taskNumber", "terminalEvent",
    ].sort();
    if (keys.some((key) => typeof key !== "string") || !sameLines((keys as string[]).sort(), expected)) return false;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of expected) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || !("value" in descriptor) || !descriptor.enumerable) return false;
    }
    const terminalEvents = new Set(["turn.completed", "turn.failed", "error", "missing"]);
    const counts = ["inputTokens", "cachedInputTokens", "outputTokens", "reasoningOutputTokens"];
    const eventCounts = ["agentMessageCount", "commandExecutionCount", "fileChangeCount", "failedToolItemCount"];
    return descriptors.kind.value === "codex-exec-result" &&
      descriptors.taskNumber.value === contract.taskNumber &&
      descriptors.requestedOutcomeSha256.value === contract.requestedOutcomeSha256 &&
      descriptors.processCount.value === 1 &&
      Number.isInteger(descriptors.exitCode.value) &&
      terminalEvents.has(descriptors.terminalEvent.value) &&
      counts.every((key) => Number.isFinite(descriptors[key].value) && descriptors[key].value >= 0) &&
      eventCounts.every((key) => Number.isInteger(descriptors[key].value) && descriptors[key].value >= 0) &&
      descriptors.statement.value === "One Codex Exec process returned bounded completion evidence.";
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

interface ModelRecords {
  disposition: "DONE" | "STOPPED";
  reportText: string;
  row: LogRow;
}

function readModelRecords(root: string, contract: AdapterTaskContract, start: GitSnapshot): ModelRecords | null {
  const briefPath = paths.brief(root, contract.taskNumber);
  const reportPath = paths.report(root, contract.taskNumber);
  if (!existsSync(reportPath) || readFileSync(briefPath, "utf8") !== briefText(contract)) return null;
  const report = readFileSync(reportPath, "utf8");
  if (!new RegExp(`^# Task ${pad(contract.taskNumber)}\\b`, "m").test(report)) return null;
  const dispositions = [...report.matchAll(/^Disposition:\s*(?:\*\*)?(DONE|STOPPED)\b/gm)];
  if (dispositions.length !== 1) return null;
  const milestones = [...report.matchAll(/^Milestone movement:\s*(?:\*\*)?(YES|NO|UNCLEAR)\b/gm)];
  if (milestones.length !== 1) return null;
  const disposition = dispositions[0][1] as "DONE" | "STOPPED";
  const actualLog = readFileSync(paths.log(root), "utf8");
  if (!actualLog.startsWith(start.logText)) return null;
  const taskRows = parseLog(root).filter((item) => item.task === pad(contract.taskNumber));
  if (taskRows.length !== 1 || taskRows[0].outcome !== disposition) return null;
  const row = taskRows[0];
  if (row.lane !== "Standard" || row.mode !== "Applied" ||
      row.decision !== (disposition === "DONE" ? "completed" : "stopped") ||
      row.moved !== milestones[0][1]) return null;
  if (actualLog !== start.logText + expectedLogLine(row)) return null;
  return { disposition, reportText: report, row };
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
  if (!contract.ownedRecords.every((path) => values.has(path))) return null;
  return [...values].sort();
}

function unstageExactPaths(root: string, pathsToUnstage: readonly string[]): void {
  try {
    git(root, ["restore", "--staged", "--", ...pathsToUnstage]);
  } catch {
    // Retain the staged evidence if Git cannot safely restore the index.
  }
}

function verifyModelGitResult(
  root: string,
  start: GitSnapshot,
  contract: AdapterTaskContract,
  disposition: "DONE" | "STOPPED",
): RecordCommit | null {
  if (!verifyProtectedStartingPaths(root, start)) return null;
  const head = git(root, ["rev-parse", "HEAD"]);
  if (head !== start.head) return null;
  if (disposition === "STOPPED") {
    return { status: "skipped", reason: "The model reported STOPPED; retained workspace evidence was not committed by Cairn." };
  }
  if (start.status.length > 0) {
    return { status: "skipped", reason: "Protected starting work prevented an isolated task commit." };
  }
  const taskPaths = changedTaskPaths(root, contract);
  if (!taskPaths || taskPaths.length === 0) return null;
  try {
    git(root, ["add", "--", ...taskPaths]);
    const staged = gitZ(root, ["diff", "--cached", "--name-only", "-z", "--"]).sort();
    if (!sameLines(staged, taskPaths) ||
        gitZ(root, ["diff", "--name-only", "-z", "--"]).length > 0 ||
        gitZ(root, ["ls-files", "--others", "--exclude-standard", "-z", "--"]).length > 0) {
      unstageExactPaths(root, taskPaths);
      return null;
    }
    git(root, ["commit", "-m", `Task ${pad(contract.taskNumber)}: complete verified Codex Exec task`]);
  } catch {
    if (git(root, ["rev-parse", "HEAD"]) === start.head) unstageExactPaths(root, taskPaths);
    return null;
  }
  const committedHead = git(root, ["rev-parse", "HEAD"]);
  if (!isAncestor(root, start.head, committedHead)) return null;
  if (Number(git(root, ["rev-list", "--count", `${start.head}..${committedHead}`])) !== 1) return null;
  if (lines(git(root, ["status", "--porcelain=v1", "--untracked-files=all"])).length > 0) return null;
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
  const current = lines(git(root, ["status", "--porcelain=v1", "--untracked-files=all"]));
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
  disposition: "DONE" | "STOPPED",
  reason: SerialStopReason | null,
  start: GitSnapshot,
  commitRequested: boolean,
  processEvidence?: CodexExecResult,
): { reportText: string; row: LogRow; verified: boolean } {
  const report = reportText(contract, disposition, reason, commitRequested, processEvidence);
  writeFileSync(paths.report(root, contract.taskNumber), report, { encoding: "utf8", flag: "wx" });
  const row = rowFor(contract, disposition, reason);
  appendLogRow(root, row);
  const actualLog = readFileSync(paths.log(root), "utf8");
  const checks = {
    brief: readFileSync(paths.brief(root, contract.taskNumber), "utf8") === briefText(contract),
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
  reason: SerialStopReason,
  start: GitSnapshot,
  commitRequested: boolean,
  processEvidence?: CodexExecResult,
): { reportText: string; row: LogRow; verified: boolean } | null {
  if (existsSync(paths.report(root, contract.taskNumber))) return null;
  if (readFileSync(paths.log(root), "utf8") !== start.logText) return null;
  return writeClosedRecords(root, contract, "STOPPED", reason, start, commitRequested, processEvidence);
}

function replaceDoneRecordsWithStopped(
  root: string,
  contract: AdapterTaskContract,
  start: GitSnapshot,
  commitRequested: boolean,
  done: { reportText: string; row: LogRow },
  reason: SerialStopReason = "RECORD_VERIFICATION_FAILED",
  processEvidence?: CodexExecResult,
): { reportText: string; row: LogRow; verified: boolean } | null {
  const reportPath = paths.report(root, contract.taskNumber);
  const currentReport = readFileSync(reportPath, "utf8");
  const currentLog = readFileSync(paths.log(root), "utf8");
  if (currentReport !== done.reportText || currentLog !== start.logText + expectedLogLine(done.row)) {
    return null;
  }

  const stoppedReport = reportText(contract, "STOPPED", reason, commitRequested, processEvidence);
  const stoppedRow = rowFor(contract, "STOPPED", reason);
  writeFileSync(reportPath, stoppedReport, "utf8");
  writeFileSync(paths.log(root), start.logText + expectedLogLine(stoppedRow), "utf8");

  const verified = readFileSync(reportPath, "utf8") === stoppedReport &&
    readFileSync(paths.log(root), "utf8") === start.logText + expectedLogLine(stoppedRow) &&
    parseLog(root).filter((item) => item.task === pad(contract.taskNumber) && item.outcome === "STOPPED").length === 1;
  return { reportText: stoppedReport, row: stoppedRow, verified };
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
  try {
    const chosen = options.adapters.find((item) => item.descriptor.id === route.recommended.id);
    if (!chosen) throw new Error("ROUTE_ADAPTER_MISSING");
    const codex = chosen.kind === "codex-exec";
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
      version: "cairn-serial-task/v1",
      taskNumber,
      requestedOutcome: outcome.trim(),
      requestedOutcomeSha256: sha256(outcome.trim()),
      supportedOutcome: codex ? CODEX_SUPPORTED_OUTCOME : OFFLINE_SUPPORTED_OUTCOME,
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
      checks: codex ? [
        "Confirm exactly one Codex Exec process returns a completed JSONL terminal event.",
        "Confirm the model-authored report has one terminal disposition and the append-only log has one matching row.",
        "Confirm protected starting work is byte-identical and Cairn creates one exact-path local commit for a clean-start DONE result.",
      ] : [
        "Validate the adapter result against the exact fixed schema.",
        "Confirm only the three owned records changed beyond the protected starting state.",
        "Confirm one terminal disposition and one append-only log row.",
      ],
      stopConditions: codex ? [
        "A real Codex Exec process or model call would start without separate authorization.",
        "The process fails, returns invalid bounded evidence, or the model reports STOPPED.",
        "Protected Git work changes unexpectedly.",
        "Any task record cannot be verified exactly.",
      ] : [
        "The adapter fails or returns an invalid value.",
        "Protected Git work changes unexpectedly.",
        "Any task record cannot be verified exactly.",
      ],
    };
    const contractMarkdown = briefText(contract);
    writeFileSync(paths.brief(projectRoot, taskNumber), contractMarkdown, { encoding: "utf8", flag: "wx" });

    emit(activities, options.events, {
      stage: "Run",
      state: "working",
      detail: codex
        ? "Running one confirmed ephemeral workspace-scoped Codex Exec request."
        : "Running the deterministic offline demonstration.",
    });
    let adapterValue: unknown;
    try {
      adapterValue = await chosen.run(freezeContract(contract));
    } catch (error) {
      const reason: SerialStopReason = isCodexExecModelCallBoundaryError(error)
        ? "REAL_MODEL_CALL_NOT_AUTHORIZED"
        : "ADAPTER_FAILED";
      emit(activities, options.events, {
        stage: "Run",
        state: "stopped",
        detail: reason === "REAL_MODEL_CALL_NOT_AUTHORIZED"
          ? "Stopped before starting the real Codex Exec process."
          : "The adapter stopped safely.",
      });
      const closed = writeSafetyRecordsWhenUnclaimed(projectRoot, contract, reason, start, Boolean(options.commitRecords));
      if (!closed?.verified) {
        throw new Error("RECORD_VERIFICATION_FAILED: Model-authored evidence was retained without overwrite.");
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
      detail: codex ? "One Codex Exec process returned bounded terminal evidence." : "The offline adapter returned one result.",
    });
    emit(activities, options.events, { stage: "Check", state: "working", detail: "Checking the result, records, and protected Git state." });
    if (codex) {
      const codexResult = validateCodexResult(adapterValue, contract) ? adapterValue : null;
      const resultValid = codexResult !== null;
      if (codexResult) {
        emit(activities, options.events, { stage: "Check", state: "working", detail: boundedEventSummary(codexResult) });
      }
      const processCompleted = codexResult?.exitCode === 0 && codexResult.terminalEvent === "turn.completed";
      const modelRecords = readModelRecords(projectRoot, contract, start);
      const protectedValid = verifyProtectedStartingPaths(projectRoot, start);
      const modelCommit = resultValid && processCompleted && modelRecords && protectedValid
        ? verifyModelGitResult(projectRoot, start, contract, modelRecords.disposition)
        : null;
      const stopReason: SerialStopReason | null = !resultValid
        ? "INVALID_ADAPTER_RESULT"
        : !processCompleted
          ? "ADAPTER_FAILED"
          : !protectedValid
            ? "PROTECTED_WORK_CHANGED"
            : !modelRecords
              ? "MODEL_RECORDS_MISSING"
              : !modelCommit
                ? "MODEL_RESULT_NOT_VERIFIED"
                : modelRecords.disposition === "STOPPED"
                  ? "MODEL_REPORTED_STOPPED"
                  : null;
      if (stopReason) {
        emit(activities, options.events, { stage: "Check", state: "stopped", detail: `Stopped safely: ${stopReason}.` });
        const safety = modelRecords?.disposition === "STOPPED"
          ? modelRecords
          : modelRecords?.disposition === "DONE"
            ? replaceDoneRecordsWithStopped(
              projectRoot,
              contract,
              start,
              Boolean(options.commitRecords),
              modelRecords,
              stopReason,
              codexResult ?? undefined,
            )
            : writeSafetyRecordsWhenUnclaimed(
              projectRoot,
              contract,
              stopReason,
              start,
              Boolean(options.commitRecords),
              codexResult ?? undefined,
            );
        if (!safety) throw new Error("RECORD_VERIFICATION_FAILED: Model-authored evidence was retained without overwrite.");
        emit(activities, options.events, { stage: "Result", state: "stopped", detail: `STOPPED — ${stopReason}` });
        return {
          status: "stopped", reason: stopReason, taskNumber, disposition: "STOPPED",
          briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
          reportText: safety.reportText, row: safety.row, route, activities,
          commit: modelCommit ?? { status: "skipped", reason: "Stopped evidence was retained for inspection." },
        };
      }
      if (!modelRecords || !modelCommit) throw new Error("MODEL_RESULT_NOT_VERIFIED");
      emit(activities, options.events, { stage: "Check", state: "done", detail: "The model result, task records, protected work, and Cairn-owned Git result were verified." });
      emit(activities, options.events, { stage: "Result", state: "done", detail: "DONE — one real Codex Exec task completed and was verified." });
      return {
        status: "done", taskNumber, disposition: "DONE",
        briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
        reportText: modelRecords.reportText, row: modelRecords.row, route, activities, commit: modelCommit,
      };
    }
    const resultValid = chosen.kind === "offline-demo" && validateAdapterResult(adapterValue, contract);
    const protectedValid = verifyProtected(projectRoot, start, ownedSet);
    const stopReason: SerialStopReason | null = !resultValid
      ? "INVALID_ADAPTER_RESULT"
      : !protectedValid
        ? "PROTECTED_WORK_CHANGED"
        : null;
    if (stopReason) {
      emit(activities, options.events, { stage: "Check", state: "stopped", detail: `Stopped safely: ${stopReason}.` });
      const closed = writeClosedRecords(projectRoot, contract, "STOPPED", stopReason, start, Boolean(options.commitRecords));
      emit(activities, options.events, { stage: "Result", state: "stopped", detail: `STOPPED — ${stopReason}` });
      return {
        status: "stopped", reason: stopReason, taskNumber, disposition: "STOPPED",
        briefPath: paths.brief(projectRoot, taskNumber), reportPath: paths.report(projectRoot, taskNumber),
        reportText: closed.reportText, row: closed.row, route, activities,
        commit: { status: "skipped", reason: "Stopped tasks are retained for inspection." },
      };
    }
    const closed = writeClosedRecords(projectRoot, contract, "DONE", null, start, Boolean(options.commitRecords));
    if (!closed.verified || !verifyProtected(projectRoot, start, ownedSet)) {
      // Replace the success records only when they are byte-for-byte the records
      // written above. This keeps the log and report honest without overwriting a
      // concurrent or owner-authored change.
      const stopped = replaceDoneRecordsWithStopped(
        projectRoot,
        contract,
        start,
        Boolean(options.commitRecords),
        closed,
      );
      if (!stopped?.verified) throw new Error("RECORD_VERIFICATION_FAILED: Task records were retained for inspection.");
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
    activeRoots.delete(projectRoot);
  }
}
