import { spawn } from "node:child_process";
import { accessSync, appendFileSync, constants, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, isAbsolute, relative, resolve } from "node:path";
import type {
  AdapterTaskContract,
  CodexExecResult,
  TaskAdapter,
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
}

export interface CodexExecProcess {
  kind: "system" | "fake";
  run(request: CodexExecRequest): Promise<CodexExecProcessResult>;
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

export class CodexExecModelCallBoundaryError extends Error {
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
 * failures now carry a precise code and the local debug evidence path.
 */
export class CodexExecProcessError extends Error {
  constructor(
    readonly code: CodexExecProcessFailureCode,
    readonly debugPath: string | null,
  ) {
    super(`${code}: the Codex Exec process did not return a result.`);
    this.name = "CodexExecProcessError";
  }
}

export function isCodexExecProcessError(value: unknown): value is CodexExecProcessError {
  return value instanceof CodexExecProcessError;
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
  const path = relative(resolve(workspaceRoot), resolve(candidate));
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
    return {
      agentMessageCount: item.type === "agent_message" ? 1 : 0,
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
export function createSystemCodexExecProcess(): CodexExecProcess {
  return {
    kind: "system",
    run(request) {
      return new Promise((resolveRun, rejectRun) => {
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
        };
        const applyEvidence = (evidence: Partial<CodexExecProcessResult> | null): void => {
          if (!evidence) return;
          if (result.terminalEvent === "error" || result.terminalEvent === "turn.failed") return;
          const {
            agentMessageCount = 0,
            commandExecutionCount = 0,
            fileChangeCount = 0,
            failedToolItemCount = 0,
            ...terminal
          } = evidence;
          result = {
            ...result,
            ...terminal,
            agentMessageCount: result.agentMessageCount + agentMessageCount,
            commandExecutionCount: result.commandExecutionCount + commandExecutionCount,
            fileChangeCount: result.fileChangeCount + fileChangeCount,
            failedToolItemCount: result.failedToolItemCount + failedToolItemCount,
          };
        };
        const fail = (code: CodexExecProcessFailureCode): void => {
          if (settled) return;
          settled = true;
          rejectRun(new CodexExecProcessError(code, debugPath));
        };
        child.once("error", () => fail("CODEX_EXEC_SPAWN_FAILED"));
        child.stdout.on("data", (chunk: Buffer) => {
          const text = chunk.toString("utf8");
          debugWrite(debugPath, text);
          stdout += text;
          const parts = stdout.split(/\r?\n/);
          stdout = parts.pop() ?? "";
          for (const line of parts) {
            if (skippingOversizedLine) {
              // The head of this line was dropped below; skip its tail too.
              skippingOversizedLine = false;
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
          }
        });
        // Stream stderr to the owner's local debug copy while keeping provider,
        // account, and credential-adjacent diagnostics out of Cairn results and logs.
        child.stderr.on("data", (chunk: Buffer) => {
          debugWrite(debugStderrPath, chunk.toString("utf8"));
        });
        child.once("close", (code) => {
          if (settled) return;
          if (stdout.trim() && !skippingOversizedLine) {
            applyEvidence(terminalEvidence(stdout));
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
    // Task 003: a perfect product change still failed verification when the
    // record shape stayed implicit, so the prompt states the exact format
    // Cairn's verifier requires.
    `Write docs/ai-work/tasks/${padded}-report.md. It must begin with "# Task ${padded}", contain exactly one line starting "Milestone movement: " with value YES, NO, or UNCLEAR, and exactly one line starting "Disposition: " with value DONE or "STOPPED — [reason]".`,
    `Append exactly one row to docs/ai-work/LOG.md shaped exactly like: | ${padded} | <date> | Standard | Applied | DONE | completed | <one-line summary> | <YES/NO/UNCLEAR> | — use outcome DONE with decision completed, or outcome STOPPED with decision stopped, and the last column must equal the report's milestone movement value.`,
    "If the requested outcome is already satisfied, do not invent a product change. Verify the existing behavior, still write the report and log row, use milestone movement NO, and choose the honest terminal disposition.",
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
    kind: "codex-exec",
    descriptor: {
      id: CODEX_EXEC_ADAPTER_ID,
      label: "Codex Exec",
      provider: CODEX_EXEC_PROVIDER,
      model: CODEX_EXEC_MODEL,
      connected,
      capabilities: ["serial-task"],
      priority: 100,
    },
    async run(contract): Promise<CodexExecResult> {
      const request = prepareCodexExecRequest(cwd, contract);
      if (!authorizationMatches(cwd, contract, authorization)) {
        throw new CodexExecModelCallBoundaryError();
      }
      const result = await processRunner.run(request);
      return {
        kind: "codex-exec-result",
        taskNumber: contract.taskNumber,
        requestedOutcomeSha256: contract.requestedOutcomeSha256,
        processCount: 1,
        exitCode: result.exitCode,
        terminalEvent: result.terminalEvent,
        inputTokens: result.inputTokens,
        cachedInputTokens: result.cachedInputTokens,
        outputTokens: result.outputTokens,
        reasoningOutputTokens: result.reasoningOutputTokens,
        agentMessageCount: result.agentMessageCount,
        commandExecutionCount: result.commandExecutionCount,
        fileChangeCount: result.fileChangeCount,
        failedToolItemCount: result.failedToolItemCount,
        statement: "One Codex Exec process returned bounded completion evidence.",
      };
    },
  };
}
