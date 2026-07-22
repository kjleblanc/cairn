import { spawn } from "node:child_process";
import { accessSync, constants, existsSync, statSync } from "node:fs";
import { delimiter, isAbsolute, relative, resolve } from "node:path";
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

function insideWorkspace(workspaceRoot: string, candidate: string): boolean {
  const path = relative(resolve(workspaceRoot), resolve(candidate));
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

/** Resolves only the Codex CLI from absolute PATH entries outside the workspace. */
function resolveCodexCommand(workspaceRoot: string): string | null {
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
          rejectRun(new Error("CODEX_EXEC_PROCESS_FAILED"));
          return;
        }
        // Match the readiness probe on Windows so both the official standalone
        // executable and an official npm-style codex.cmd shim can be launched.
        const shim = process.platform === "win32" && /\.(?:cmd|bat)$/i.test(codexCommand);
        const command = shim ? (process.env.ComSpec || "cmd.exe") : codexCommand;
        const args = shim ? shimArgs(codexCommand, request.args, request.cwd) : [...request.args];
        const child = spawn(command, args, {
          cwd: request.cwd,
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
        });
        let settled = false;
        let stdout = "";
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
        const fail = (): void => {
          if (settled) return;
          settled = true;
          rejectRun(new Error("CODEX_EXEC_PROCESS_FAILED"));
        };
        child.once("error", fail);
        child.stdout.on("data", (chunk: Buffer) => {
          stdout += chunk.toString("utf8");
          if (stdout.length > 1_048_576) {
            child.kill();
            fail();
            return;
          }
          const parts = stdout.split(/\r?\n/);
          stdout = parts.pop() ?? "";
          for (const line of parts) {
            if (!line.trim()) continue;
            applyEvidence(terminalEvidence(line));
          }
        });
        // Read and discard stderr so the child cannot block, while keeping provider,
        // account, and credential-adjacent diagnostics out of Cairn results and logs.
        child.stderr.resume();
        child.once("close", (code) => {
          if (settled) return;
          if (stdout.trim()) {
            applyEvidence(terminalEvidence(stdout));
          }
          settled = true;
          resolveRun({ ...result, exitCode: typeof code === "number" ? code : -1 });
        });
        child.stdin.on("error", fail);
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
  return [
    "Complete exactly one Cairn task in this workspace.",
    "Read and follow AGENTS.md and the existing task brief before editing.",
    `Task number: ${String(contract.taskNumber).padStart(3, "0")}`,
    `Requested visible outcome: ${contract.requestedOutcome}`,
    `Requested outcome SHA-256: ${contract.requestedOutcomeSha256}`,
    "Cairn already created this task's brief. Do not create another brief or start another task.",
    "The owner already confirmed Cairn's displayed provider, model, project, data scope, and one-call quota for this exact request. Do not ask for that confirmation again. This grants no authority beyond this one call and in-scope local reversible work.",
    "Implement the requested outcome, run proportionate checks, write the matching report, and append exactly one matching log row.",
    "If the requested outcome is already satisfied, do not invent a product change. Verify the existing behavior, still write the report and log row, use milestone movement NO, and choose the honest terminal disposition.",
    "Do not run git add, git commit, or otherwise modify .git. Leave every task change unstaged; after verification, Cairn owns the exact-path local commit.",
    "Do not install or update dependencies, use external services, publish, deploy, or cross another concrete risk boundary.",
    "Work serially. Do not delegate, schedule, retry, resume, continue into another session, or start another task.",
    "Protect all existing Git work and stop at every concrete risk boundary.",
  ].join("\n");
}

export function prepareCodexExecRequest(workspaceRoot: string, contract: AdapterTaskContract): CodexExecRequest {
  const cwd = resolve(workspaceRoot);
  const args = Object.freeze([
    "--ask-for-approval",
    "on-request",
    "exec",
    "--ephemeral",
    "--model",
    CODEX_EXEC_MODEL,
    "--cd",
    cwd,
    "--sandbox",
    "workspace-write",
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
