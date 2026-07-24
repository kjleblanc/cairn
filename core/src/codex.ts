import { spawn, type ChildProcess } from "node:child_process";
import { accessSync, appendFileSync, constants, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, isAbsolute, relative, resolve } from "node:path";
import { canonicalPath } from "./files.js";
import {
  WorkerBoundaryError,
  WorkerProcessError,
  type AdapterTaskContract,
  type TaskAdapter,
  type WorkerDisclosure,
  type WorkerRunResult,
} from "./routing.js";

export interface CodexExecStatus {
  installed: boolean;
  connected: boolean;
}

export type CodexStatusProbeResult = "success" | "not-found" | "failed";

/** A deliberately output-free readiness probe for the official Codex CLI. */
export interface CodexStatusProbe {
  run(args: readonly string[], cwd: string): Promise<CodexStatusProbeResult>;
}

export interface CodexExecRequest {
  command: "codex" | "codex.exe";
  args: readonly string[];
  cwd: string;
  stdin: string;
}

export interface CodexExecProcessResult {
  exitCode: number;
  terminalEvent: "turn.completed" | "turn.failed" | "error" | "missing";
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  agentMessageCount: number;
  commandExecutionCount: number;
  fileChangeCount: number;
  failedToolItemCount: number;
  finalMessage: string | null;
}

export interface CodexExecProcess {
  kind: "system" | "fake";
  run(request: CodexExecRequest, signal?: AbortSignal): Promise<CodexExecProcessResult>;
}

export const CODEX_EXEC_PROVIDER = "OpenAI" as const;
export const CODEX_EXEC_MODEL = "gpt-5.6-sol" as const;
export const CODEX_EXEC_DATA_SCOPE = "The task instructions, AGENTS.md, the generated task brief, and any file inside the selected project that Codex chooses to read." as const;
export const CODEX_EXEC_QUOTA = "Exactly one ephemeral Codex Exec process for one task; no retry, resume, continuation, scheduling, delegation, or parallel run. Connected-account pricing, credits, and limits apply; Cairn does not inspect the authentication method and cannot promise a dollar cap." as const;

export interface CodexExecDisclosure {
  provider: typeof CODEX_EXEC_PROVIDER;
  model: typeof CODEX_EXEC_MODEL;
  project: string;
  task: string;
  data: typeof CODEX_EXEC_DATA_SCOPE;
  quota: typeof CODEX_EXEC_QUOTA;
}

export interface CodexExecAuthorization extends CodexExecDisclosure {
  approved: true;
}

export const CODEX_EXEC_ADAPTER_ID = "codex-exec";
export const REAL_MODEL_CALL_NOT_AUTHORIZED = "REAL_MODEL_CALL_NOT_AUTHORIZED";

export function codexExecDisclosure(workspaceRoot: string, requestedOutcome: string): CodexExecDisclosure {
  return Object.freeze({
    provider: CODEX_EXEC_PROVIDER,
    model: CODEX_EXEC_MODEL,
    project: resolve(workspaceRoot),
    task: requestedOutcome.trim(),
    data: CODEX_EXEC_DATA_SCOPE,
    quota: CODEX_EXEC_QUOTA,
  });
}

export function authorizeCodexExec(workspaceRoot: string, requestedOutcome: string): CodexExecAuthorization {
  return Object.freeze({ ...codexExecDisclosure(workspaceRoot, requestedOutcome), approved: true as const });
}

export class CodexExecModelCallBoundaryError extends WorkerBoundaryError {
  readonly code = REAL_MODEL_CALL_NOT_AUTHORIZED;

  constructor() {
    super(`${REAL_MODEL_CALL_NOT_AUTHORIZED}: Cairn stopped before starting Codex Exec.`);
    this.name = "CodexExecModelCallBoundaryError";
  }
}

export function isCodexExecModelCallBoundaryError(value: unknown): value is CodexExecModelCallBoundaryError {
  return value instanceof CodexExecModelCallBoundaryError;
}

export type CodexExecProcessFailureCode = "CODEX_EXEC_SPAWN_FAILED" | "CODEX_EXEC_STDIN_FAILED";

/**
 * Task 004 stopped with one opaque rejection and no retained cause. Process
 * failures now carry a precise code and the local debug evidence path. This is
 * the codex specialization of the universal `WorkerProcessError` (failure
 * "process"); its (code, debugPath) constructor is unchanged so existing
 * positional callers and tests keep working.
 */
export class CodexExecProcessError extends WorkerProcessError {
  constructor(code: CodexExecProcessFailureCode, debugPath: string | null) {
    super("process", code, debugPath);
    this.name = "CodexExecProcessError";
  }
}

export function isCodexExecProcessError(value: unknown): value is CodexExecProcessError {
  return value instanceof CodexExecProcessError;
}

export type CodexExecTimeoutKind = "inactivity" | "absolute";

/** A wedged CLI used to hold a task open forever (Phase 2). The watchdog
 * kills the whole process tree and rejects with the timer that fired. The
 * codex specialization of `WorkerProcessError` (failure "timeout"). */
export class CodexExecTimeoutError extends WorkerProcessError {
  constructor(
    readonly timeoutKind: CodexExecTimeoutKind,
    debugPath: string | null,
    killConfirmed: boolean,
  ) {
    super("timeout", "CODEX_EXEC_TIMED_OUT", debugPath, killConfirmed);
    this.name = "CodexExecTimeoutError";
  }
}

export function isCodexExecTimeoutError(value: unknown): value is CodexExecTimeoutError {
  return value instanceof CodexExecTimeoutError;
}

/** The owner pressed stop. The tree is killed the same way as a timeout. The
 * codex specialization of `WorkerProcessError` (failure "cancelled"). */
export class CodexExecCancelledError extends WorkerProcessError {
  constructor(debugPath: string | null, killConfirmed: boolean) {
    super("cancelled", "CODEX_EXEC_CANCELLED", debugPath, killConfirmed);
    this.name = "CodexExecCancelledError";
  }
}

export function isCodexExecCancelledError(value: unknown): value is CodexExecCancelledError {
  return value instanceof CodexExecCancelledError;
}

export const CODEX_EXEC_INACTIVITY_MS = 600_000;
export const CODEX_EXEC_ABSOLUTE_MS = 3_600_000;

export interface CodexExecProcessOptions {
  inactivityMs?: number;
  absoluteMs?: number;
}

/** On Windows the child is a cmd.exe shim chain; killing only the shim
 * orphans the real codex process, so the whole tree goes. */
function killCodexProcessTree(child: ChildProcess): void {
  if (child.pid === undefined) return;
  if (process.platform === "win32") {
    const systemRoot = process.env.SystemRoot ?? process.env.windir ?? "C:\\Windows";
    const taskkill = resolve(systemRoot, "System32", "taskkill.exe");
    try {
      const killer = spawn(existsSync(taskkill) ? taskkill : "taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
      killer.once("error", () => { try { child.kill(); } catch { /* already gone */ } });
      killer.unref();
    } catch {
      try { child.kill(); } catch { /* already gone */ }
    }
  } else {
    // The child leads its own process group (spawned detached on POSIX), so a
    // negative PID SIGKILLs the whole group — the codex process and every
    // descendant it started. If the group send fails (e.g. the leader already
    // exited), fall back to a direct SIGKILL of the child.
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      try {
        child.kill("SIGKILL");
      } catch {
        // Already gone.
      }
    }
  }
}

/** Local diagnostic copies live outside every project, so Git never sees them. */
function codexDebugDirectory(): string | null {
  const localAppData = process.env.LOCALAPPDATA;
  const base = localAppData && isAbsolute(localAppData)
    ? resolve(localAppData, "Cairn", "debug")
    : resolve(tmpdir(), "cairn-debug");
  try {
    mkdirSync(base, { recursive: true });
    return base;
  } catch {
    return null;
  }
}

/** Best-effort redaction of credential-shaped tokens before anything reaches disk. */
function redactTokens(text: string): string {
  return text
    .replace(/\bsk-[A-Za-z0-9_-]{6,}/g, "sk-[redacted]")
    .replace(/(\bBearer\s+)[A-Za-z0-9._-]+/gi, "$1[redacted]");
}

function insideWorkspace(workspaceRoot: string, candidate: string): boolean {
  // Compare real directories, not spellings: a workspace opened through an
  // 8.3 short name or symlink must still contain its own planted binaries
  // (Task 054, same class as the serial root-identity gate).
  const path = relative(canonicalPath(workspaceRoot), canonicalPath(candidate));
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

const WINDOWS_SANDBOX_SETUP_HELPER = "codex-windows-sandbox-setup.exe";

function hasWindowsSandboxHelper(directory: string): boolean {
  return existsSync(resolve(directory, WINDOWS_SANDBOX_SETUP_HELPER));
}

/**
 * Codex's self-updated Windows install keeps its elevated-sandbox helpers
 * beside the binary under %LOCALAPPDATA%\OpenAI\Codex\bin\<hash>\; the PATH
 * launcher stub ships without them, so its elevated-sandbox writes always
 * fail with "program not found" (Task 002).
 */
function windowsVersionedCodexCommand(workspaceRoot: string): string | null {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData || !isAbsolute(localAppData)) return null;
  const base = resolve(localAppData, "OpenAI", "Codex", "bin");
  let entries: string[];
  try {
    entries = readdirSync(base);
  } catch {
    return null;
  }
  let best: { command: string; modified: number } | null = null;
  for (const entry of entries) {
    const directory = resolve(base, entry);
    try {
      if (!statSync(directory).isDirectory() || !hasWindowsSandboxHelper(directory)) continue;
      for (const extension of [".exe", ".cmd", ".bat"]) {
        const candidate = resolve(directory, `codex${extension}`);
        if (insideWorkspace(workspaceRoot, candidate) || !existsSync(candidate)) continue;
        const stats = statSync(candidate);
        if (!stats.isFile()) continue;
        if (/\.(?:cmd|bat)$/i.test(candidate) && /[%!^&|<>()]/.test(candidate)) continue;
        if (!best || stats.mtimeMs > best.modified) best = { command: candidate, modified: stats.mtimeMs };
        break;
      }
    } catch {
      // Ignore unreadable entries and continue to the next candidate.
    }
  }
  return best ? best.command : null;
}

function resolveCodexCommand(workspaceRoot: string): string | null {
  const fromPath = resolvePathCodexCommand(workspaceRoot);
  if (!fromPath || process.platform !== "win32" || hasWindowsSandboxHelper(dirname(fromPath))) {
    return fromPath;
  }
  return windowsVersionedCodexCommand(workspaceRoot) ?? fromPath;
}

/** Resolves only the Codex CLI from absolute PATH entries outside the workspace. */
function resolvePathCodexCommand(workspaceRoot: string): string | null {
  const pathEntry = Object.entries(process.env).find(([key]) => key.toLowerCase() === "path")?.[1] ?? "";
  const extensions = process.platform === "win32" ? [".exe", ".cmd", ".bat"] : [""];
  for (const rawEntry of pathEntry.split(delimiter)) {
    const directory = rawEntry.trim().replace(/^"(.*)"$/, "$1");
    if (!directory || !isAbsolute(directory)) continue;
    for (const extension of extensions) {
      const candidate = resolve(directory, `codex${extension}`);
      if (insideWorkspace(workspaceRoot, candidate) || !existsSync(candidate)) continue;
      try {
        if (!statSync(candidate).isFile()) continue;
        if (process.platform !== "win32") accessSync(candidate, constants.X_OK);
        // cmd.exe expands these characters even inside some quoted command forms.
        // A standalone .exe is launched directly and does not need this restriction.
        if (/\.(?:cmd|bat)$/i.test(candidate) && /[%!^&|<>()]/.test(candidate)) continue;
        return candidate;
      } catch {
        // Ignore inaccessible PATH entries and continue to the next candidate.
      }
    }
  }
  return null;
}

function shimArgs(command: string, args: readonly string[], cwd: string): string[] {
  const safeArgs = [...args];
  const cd = safeArgs.findIndex((value, index) => value === "--cd" && safeArgs[index + 1] === cwd);
  if (cd >= 0) safeArgs.splice(cd, 2);
  return ["/d", "/s", "/c", command, ...safeArgs];
}

function codexExecEnvironment(commandDirectory: string): NodeJS.ProcessEnv {
  const environment = { ...process.env };
  const pathEntry = Object.entries(environment).find(([key]) => key.toLowerCase() === "path");
  const [pathKey, pathValue = ""] = pathEntry ?? ["PATH", ""];
  const retained = pathValue.split(delimiter).filter((rawEntry) => {
    const directory = rawEntry.trim().replace(/^"(.*)"$/, "$1");
    if (!directory || !isAbsolute(directory)) return true;
    const normalized = directory.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
    return !normalized.endsWith("/.codex/tmp/arg0") && !normalized.includes("/.codex/tmp/arg0/");
  }).join(delimiter);
  // The launched binary's own directory leads the child PATH so Codex's
  // bare-name sandbox helper spawns (codex-windows-sandbox-setup.exe) resolve.
  environment[pathKey] = retained ? `${commandDirectory}${delimiter}${retained}` : commandDirectory;
  return environment;
}

export function createSystemCodexStatusProbe(): CodexStatusProbe {
  return {
    run(args, cwd) {
      const codexCommand = resolveCodexCommand(cwd);
      if (!codexCommand) return Promise.resolve("not-found");
      return new Promise((resolveProbe) => {
        let settled = false;
        const finish = (result: CodexStatusProbeResult): void => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolveProbe(result);
        };
        const shim = process.platform === "win32" && /\.(?:cmd|bat)$/i.test(codexCommand);
        const command = shim ? (process.env.ComSpec || "cmd.exe") : codexCommand;
        const commandArgs = shim ? shimArgs(codexCommand, args, cwd) : [...args];
        const child = spawn(command, commandArgs, {
          cwd,
          stdio: "ignore",
          windowsHide: true,
        });
        const timer = setTimeout(() => {
          child.kill();
          finish("failed");
        }, 5_000);
        child.once("error", (error: NodeJS.ErrnoException) => {
          finish(error.code === "ENOENT" ? "not-found" : "failed");
        });
        child.once("close", (code) => finish(code === 0 ? "success" : "failed"));
      });
    },
  };
}

function nonNegativeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function terminalEvidence(line: string): Partial<CodexExecProcessResult> | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return { terminalEvent: "error" };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return { terminalEvent: "error" };
  const record = value as Record<string, unknown>;
  if (record.type === "turn.failed") return { terminalEvent: "turn.failed" };
  if (record.type === "error") return { terminalEvent: "error" };
  if (record.type === "item.completed") {
    if (!record.item || typeof record.item !== "object" || Array.isArray(record.item)) return null;
    const item = record.item as Record<string, unknown>;
    const command = item.type === "command_execution";
    const fileChange = item.type === "file_change";
    const failed = (command || fileChange) &&
      (item.status === "failed" || (typeof item.exit_code === "number" && item.exit_code !== 0));
    const agent = item.type === "agent_message";
    return {
      finalMessage: agent
        ? (typeof item.text === "string" && item.text.length <= 262_144 ? item.text : null)
        : undefined,
      agentMessageCount: agent ? 1 : 0,
      commandExecutionCount: command ? 1 : 0,
      fileChangeCount: fileChange ? 1 : 0,
      failedToolItemCount: failed ? 1 : 0,
    };
  }
  if (record.type !== "turn.completed") return null;
  const usage = record.usage && typeof record.usage === "object" && !Array.isArray(record.usage)
    ? record.usage as Record<string, unknown>
    : {};
  return {
    terminalEvent: "turn.completed",
    inputTokens: nonNegativeNumber(usage.input_tokens),
    cachedInputTokens: nonNegativeNumber(usage.cached_input_tokens),
    outputTokens: nonNegativeNumber(usage.output_tokens),
    reasoningOutputTokens: nonNegativeNumber(usage.reasoning_output_tokens),
  };
}

/** Starts one process and retains only terminal JSONL state plus numeric usage. */
export function createSystemCodexExecProcess(options?: CodexExecProcessOptions): CodexExecProcess {
  return {
    kind: "system",
    run(request, signal) {
      return new Promise((resolveRun, rejectRun) => {
        if (signal?.aborted) {
          // Pre-spawn cancel: nothing ever started, so the kill is confirmed
          // by construction — there is no child to orphan.
          rejectRun(new CodexExecCancelledError(null, true));
          return;
        }
        const codexCommand = resolveCodexCommand(request.cwd);
        if (!codexCommand) {
          rejectRun(new CodexExecProcessError("CODEX_EXEC_SPAWN_FAILED", null));
          return;
        }
        // Match the readiness probe on Windows so both the official standalone
        // executable and an official npm-style codex.cmd shim can be launched.
        const shim = process.platform === "win32" && /\.(?:cmd|bat)$/i.test(codexCommand);
        const command = shim ? (process.env.ComSpec || "cmd.exe") : codexCommand;
        const args = shim ? shimArgs(codexCommand, request.args, request.cwd) : [...request.args];
        const child = spawn(command, args, {
          cwd: request.cwd,
          env: codexExecEnvironment(dirname(codexCommand)),
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
          // POSIX only: lead a new process group so killCodexProcessTree can
          // SIGKILL the whole group (a bare SIGKILL to the child leaves its
          // grandchildren running). The win32 spawn options are unchanged —
          // there the taskkill /T tree kill already reaches the shim's children.
          ...(process.platform === "win32" ? {} : { detached: true }),
        });
        const debugDirectory = codexDebugDirectory();
        const debugStamp = `codex-${new Date().toISOString().replace(/[:.]/g, "-")}-${child.pid ?? "0"}`;
        const debugPath = debugDirectory ? resolve(debugDirectory, `${debugStamp}.jsonl`) : null;
        const debugStderrPath = debugDirectory ? resolve(debugDirectory, `${debugStamp}.stderr.log`) : null;
        const debugWrite = (file: string | null, text: string): void => {
          if (!file) return;
          try {
            appendFileSync(file, redactTokens(text), "utf8");
          } catch {
            // Local diagnostics must never break the run.
          }
        };
        let settled = false;
        const inactivityMs = options?.inactivityMs ?? CODEX_EXEC_INACTIVITY_MS;
        const absoluteMs = options?.absoluteMs ?? CODEX_EXEC_ABSOLUTE_MS;
        let timedOut: CodexExecTimeoutKind | null = null;
        let cancelled = false;
        let forceSettle: NodeJS.Timeout | undefined;
        // If even the tree kill cannot make the child close, settle anyway.
        // clearWatchdog() runs first so the sibling watchdog timer (and the
        // abort listener) can never dangle in this failed-kill fallback path
        // (Task 1 review finding, folded in here since both callers share it).
        const armForceSettle = (reject: () => void): NodeJS.Timeout => setTimeout(() => {
          if (settled) return;
          clearWatchdog();
          settled = true;
          // A surviving grandchild holding these pipes open must never keep
          // the event loop (and this run) alive after the watchdog or an
          // abort fired.
          child.stdout.destroy();
          child.stderr.destroy();
          try { child.stdin.destroy(); } catch { /* already closed */ }
          reject();
        }, 5_000);
        const fireTimeout = (kind: CodexExecTimeoutKind): void => {
          if (settled || timedOut || cancelled) return;
          timedOut = kind;
          killCodexProcessTree(child);
          // Force-settle: the kill fired but the child never closed, so a live
          // orphan may still be writing — the kill is NOT confirmed.
          forceSettle = armForceSettle(() => rejectRun(new CodexExecTimeoutError(kind, debugPath, false)));
        };
        // The owner pressed stop. Killed the same way as a timeout, with the
        // same EPIPE-race ordering: `cancelled` flips before the kill so a
        // pending stdin-write error can never overwrite this rejection.
        const onAbort = (): void => {
          if (settled || cancelled || timedOut) return;
          cancelled = true;
          killCodexProcessTree(child);
          // Force-settle: the kill fired but the child never closed, so a live
          // orphan may still be writing — the kill is NOT confirmed.
          forceSettle = armForceSettle(() => rejectRun(new CodexExecCancelledError(debugPath, false)));
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        const absoluteTimer = setTimeout(() => fireTimeout("absolute"), absoluteMs);
        let inactivityTimer = setTimeout(() => fireTimeout("inactivity"), inactivityMs);
        const sawActivity = (): void => {
          clearTimeout(inactivityTimer);
          if (!timedOut) inactivityTimer = setTimeout(() => fireTimeout("inactivity"), inactivityMs);
        };
        const clearWatchdog = (): void => {
          clearTimeout(absoluteTimer);
          clearTimeout(inactivityTimer);
          if (forceSettle) clearTimeout(forceSettle);
          signal?.removeEventListener("abort", onAbort);
        };
        let stdout = "";
        let skippingOversizedLine = false;
        let result: CodexExecProcessResult = {
          exitCode: -1,
          terminalEvent: "missing",
          inputTokens: 0,
          cachedInputTokens: 0,
          outputTokens: 0,
          reasoningOutputTokens: 0,
          agentMessageCount: 0,
          commandExecutionCount: 0,
          fileChangeCount: 0,
          failedToolItemCount: 0,
          finalMessage: null,
        };
        // A dropped line is an overwrite-to-null event, exactly like an
        // oversized agent_message: the dropped line may have been the true
        // final agent message; a partial view must not let an earlier
        // message masquerade as final. A later fully-visible message may
        // still legitimately overwrite this. Mirrors applyEvidence's own
        // terminal-state freeze below, since this assignment is direct and
        // does not go through applyEvidence.
        const clearFinalMessageForDroppedLine = (): void => {
          if (result.terminalEvent === "error" || result.terminalEvent === "turn.failed") return;
          result = { ...result, finalMessage: null };
        };
        const applyEvidence = (evidence: Partial<CodexExecProcessResult> | null): void => {
          if (!evidence) return;
          if (result.terminalEvent === "error" || result.terminalEvent === "turn.failed") return;
          const {
            agentMessageCount = 0,
            commandExecutionCount = 0,
            fileChangeCount = 0,
            failedToolItemCount = 0,
            finalMessage,
            ...terminal
          } = evidence;
          result = {
            ...result,
            ...terminal,
            agentMessageCount: result.agentMessageCount + agentMessageCount,
            commandExecutionCount: result.commandExecutionCount + commandExecutionCount,
            fileChangeCount: result.fileChangeCount + fileChangeCount,
            failedToolItemCount: result.failedToolItemCount + failedToolItemCount,
            finalMessage: finalMessage !== undefined ? finalMessage : result.finalMessage,
          };
        };
        const fail = (code: CodexExecProcessFailureCode): void => {
          // Killing the tree can EPIPE the pending stdin write; that race must
          // not overwrite the honest timeout or cancellation rejection with a
          // process-failure one.
          if (settled || timedOut || cancelled) return;
          clearWatchdog();
          settled = true;
          rejectRun(new CodexExecProcessError(code, debugPath));
        };
        child.once("error", () => fail("CODEX_EXEC_SPAWN_FAILED"));
        child.stdout.on("data", (chunk: Buffer) => {
          sawActivity();
          const text = chunk.toString("utf8");
          debugWrite(debugPath, text);
          stdout += text;
          const parts = stdout.split(/\r?\n/);
          stdout = parts.pop() ?? "";
          for (const line of parts) {
            if (skippingOversizedLine) {
              // The head of this line was dropped below; skip its tail too.
              skippingOversizedLine = false;
              // The dropped line may have been the true final agent message; a
              // partial view must not let an earlier message masquerade as
              // final. A later fully-visible message may still legitimately
              // overwrite this.
              clearFinalMessageForDroppedLine();
              continue;
            }
            if (!line.trim()) continue;
            applyEvidence(terminalEvidence(line));
          }
          if (stdout.length > 1_048_576) {
            // An oversized line already streamed to the debug file in full;
            // drop it from the parse buffer instead of killing the run
            // (the Task 004 lesson).
            skippingOversizedLine = true;
            stdout = "";
            // The dropped line may have been the true final agent message; a
            // partial view must not let an earlier message masquerade as
            // final. A later fully-visible message may still legitimately
            // overwrite this.
            clearFinalMessageForDroppedLine();
          }
        });
        // Stream stderr to the owner's local debug copy while keeping provider,
        // account, and credential-adjacent diagnostics out of Cairn results and logs.
        child.stderr.on("data", (chunk: Buffer) => {
          sawActivity();
          debugWrite(debugStderrPath, chunk.toString("utf8"));
        });
        child.once("close", (code) => {
          clearWatchdog();
          if (cancelled) {
            if (settled) return;
            settled = true;
            // The child closed after the kill: the kill is confirmed.
            rejectRun(new CodexExecCancelledError(debugPath, true));
            return;
          }
          if (timedOut) {
            if (settled) return;
            settled = true;
            // The child closed after the kill: the kill is confirmed.
            rejectRun(new CodexExecTimeoutError(timedOut, debugPath, true));
            return;
          }
          if (settled) return;
          if (stdout.trim() && !skippingOversizedLine) {
            applyEvidence(terminalEvidence(stdout));
          } else if (skippingOversizedLine) {
            // The close-time flush is skipping a flagged partial line rather
            // than parsing it. The dropped line may have been the true final
            // agent message; a partial view must not let an earlier message
            // masquerade as final. A later fully-visible message may still
            // legitimately overwrite this.
            clearFinalMessageForDroppedLine();
          }
          settled = true;
          resolveRun({ ...result, exitCode: typeof code === "number" ? code : -1 });
        });
        child.stdin.on("error", () => fail("CODEX_EXEC_STDIN_FAILED"));
        child.stdin.end(request.stdin, "utf8");
      });
    },
  };
}

export async function detectCodexExecStatus(
  workspaceRoot: string,
  probe: CodexStatusProbe = createSystemCodexStatusProbe(),
): Promise<CodexExecStatus> {
  const cwd = resolve(workspaceRoot);
  const installed = await probe.run(["--version"], cwd);
  if (installed !== "success") return Object.freeze({ installed: false, connected: false });
  const connected = await probe.run(["login", "status"], cwd);
  return Object.freeze({ installed: true, connected: connected === "success" });
}

export function codexExecStatusText(status: CodexExecStatus): string {
  if (!status.installed) return "Codex Exec is not installed.";
  if (!status.connected) return "Codex Exec is installed but not connected.";
  return "Codex Exec is installed and connected.";
}

export function codexExecConnectionReason(status: CodexExecStatus): string {
  if (!status.installed) return "Codex Exec is not installed, so no model route is available.";
  if (!status.connected) return "Codex Exec is installed but not connected, so no model route is available.";
  return "Codex Exec is installed, connected, and supports this serial task.";
}

function taskPrompt(contract: AdapterTaskContract): string {
  const padded = String(contract.taskNumber).padStart(3, "0");
  return [
    "Complete exactly one Cairn task in this workspace.",
    "Read and follow AGENTS.md and the existing task brief before editing.",
    `Task number: ${padded}`,
    `Requested visible outcome: ${contract.requestedOutcome}`,
    `Requested outcome SHA-256: ${contract.requestedOutcomeSha256}`,
    "Cairn already created this task's brief. Do not create another brief or start another task.",
    "The owner already confirmed Cairn's displayed provider, model, project, data scope, and one-call quota for this exact request. Do not ask for that confirmation again. This grants no authority beyond this one call and in-scope local reversible work.",
    "Use Codex's built-in apply_patch tool for file edits. Do not invoke an apply_patch command inherited from PATH.",
    "Implement the requested outcome and run proportionate checks.",
    // Task 048 (the inversion): the worker no longer authors any record. It
    // does product work and speaks through one claims fence; Cairn writes the
    // report and log row itself from those claims and its own Git verification.
    "Do not write any file under docs/ai-work. Cairn authors the task report and log row itself, from your claims block and its own Git verification.",
    "End your final message with exactly one fenced block labeled cairn-claims containing only JSON with exactly these keys, for example:",
    "```cairn-claims",
    "{ \"disposition\": \"DONE\", \"summary\": \"<one line>\", \"changes\": [\"<what changed and why>\"], \"checks\": [{ \"name\": \"<check you ran>\", \"result\": \"<its real result>\" }], \"howToTry\": \"<safe local steps>\", \"limitations\": \"<what still needs human judgment>\", \"milestone\": \"NO\" }",
    "```",
    "Use disposition DONE only when the outcome truly holds and your checks passed; otherwise STOPPED. milestone is YES, NO, or UNCLEAR.",
    "If the requested outcome is already satisfied, do not invent a product change. Verify the existing behavior and say so in your claims, with milestone NO and the honest disposition.",
    "Do not run git add, git commit, or otherwise modify .git. Leave every task change unstaged; after verification, Cairn owns the exact-path local commit.",
    "Do not install or update dependencies, use external services, publish, deploy, or cross another concrete risk boundary.",
    "Work serially. Do not delegate, schedule, retry, resume, continue into another session, or start another task.",
    "Protect all existing Git work and stop at every concrete risk boundary.",
  ].join("\n");
}

export function prepareCodexExecRequest(workspaceRoot: string, contract: AdapterTaskContract): CodexExecRequest {
  const cwd = resolve(workspaceRoot);
  // Task 002: non-interactive exec has no user to answer an approval request,
  // so the policy must be "never"; and without the elevated Windows sandbox,
  // workspace-write silently downgrades to read-only. The explicit config
  // value keeps that enablement while --ignore-user-config still isolates the
  // run from everything else in the owner's config.
  const windowsSandboxConfig = process.platform === "win32"
    ? ["-c", 'windows.sandbox="elevated"']
    : [];
  const args = Object.freeze([
    "--ask-for-approval",
    "never",
    "exec",
    "--ephemeral",
    "--model",
    CODEX_EXEC_MODEL,
    "--cd",
    cwd,
    "--sandbox",
    "workspace-write",
    ...windowsSandboxConfig,
    "--disable",
    "multi_agent",
    "--ignore-user-config",
    "--json",
    "-",
  ]);
  return Object.freeze({ command: process.platform === "win32" ? "codex.exe" : "codex", args, cwd, stdin: taskPrompt(contract) });
}

function authorizationMatches(workspaceRoot: string, contract: AdapterTaskContract, authorization: CodexExecAuthorization | undefined): boolean {
  if (!authorization || authorization.approved !== true) return false;
  const expected = codexExecDisclosure(workspaceRoot, contract.requestedOutcome);
  return authorization.provider === expected.provider &&
    authorization.model === expected.model &&
    authorization.project === expected.project &&
    authorization.task === expected.task &&
    authorization.data === expected.data &&
    authorization.quota === expected.quota;
}

export function createCodexExecAdapter(
  workspaceRoot: string,
  status: CodexExecStatus,
  authorization?: CodexExecAuthorization,
  processRunner: CodexExecProcess = createSystemCodexExecProcess(),
): TaskAdapter {
  const cwd = resolve(workspaceRoot);
  const connected = status.installed && status.connected;
  return {
    descriptor: {
      id: CODEX_EXEC_ADAPTER_ID,
      label: "Codex Exec",
      provider: CODEX_EXEC_PROVIDER,
      model: CODEX_EXEC_MODEL,
      connected,
      capabilities: ["serial-task"],
      priority: 100,
    },
    disclosure(outcome: string): WorkerDisclosure {
      return codexExecDisclosure(cwd, outcome);
    },
    async run(contract, signal): Promise<WorkerRunResult> {
      const request = prepareCodexExecRequest(cwd, contract);
      if (!authorizationMatches(cwd, contract, authorization)) {
        throw new CodexExecModelCallBoundaryError();
      }
      const result = await processRunner.run(request, signal);
      // Translate the bounded process evidence into the universal result: one
      // completed status (exit 0 and a completed terminal event), the worker's
      // final message for claims parsing, and the nine numeric evidence fields.
      const status: WorkerRunResult["status"] =
        result.exitCode === 0 && result.terminalEvent === "turn.completed" ? "completed" : "failed";
      return {
        kind: "worker-result/v1",
        taskNumber: contract.taskNumber,
        requestedOutcomeSha256: contract.requestedOutcomeSha256,
        status,
        claimsText: result.finalMessage,
        evidence: {
          exitCode: result.exitCode,
          inputTokens: result.inputTokens,
          cachedInputTokens: result.cachedInputTokens,
          outputTokens: result.outputTokens,
          reasoningOutputTokens: result.reasoningOutputTokens,
          agentMessageCount: result.agentMessageCount,
          commandExecutionCount: result.commandExecutionCount,
          fileChangeCount: result.fileChangeCount,
          failedToolItemCount: result.failedToolItemCount,
        },
      };
    },
  };
}
