import { spawn } from "node:child_process";
import { resolve } from "node:path";
import type {
  AdapterTaskContract,
  CodexExecFakeProcessResult,
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
  command: "codex";
  args: readonly string[];
  cwd: string;
  stdin: string;
}

/** Only injected fakes can cross the execution seam in this task. */
export interface CodexExecFakeProcess {
  kind: "fake";
  run(request: CodexExecRequest): Promise<{ exitCode: number }>;
}

export const CODEX_EXEC_ADAPTER_ID = "codex-exec";
export const REAL_MODEL_CALL_NOT_AUTHORIZED = "REAL_MODEL_CALL_NOT_AUTHORIZED";

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

export function createSystemCodexStatusProbe(): CodexStatusProbe {
  return {
    run(args, cwd) {
      return new Promise((resolveProbe) => {
        let settled = false;
        const finish = (result: CodexStatusProbeResult): void => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolveProbe(result);
        };
        // npm-style global installs expose a .cmd shim on Windows. A fixed cmd.exe
        // wrapper lets that official shim run without interpolating workspace or
        // task data into a command string.
        const windows = process.platform === "win32";
        const command = windows ? (process.env.ComSpec || "cmd.exe") : "codex";
        const commandArgs = windows ? ["/d", "/s", "/c", "codex", ...args] : [...args];
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
    "Read and follow AGENTS.md and the task brief before editing.",
    `Task number: ${String(contract.taskNumber).padStart(3, "0")}`,
    `Requested visible outcome: ${contract.requestedOutcome}`,
    `Requested outcome SHA-256: ${contract.requestedOutcomeSha256}`,
    "Work serially. Do not delegate, schedule, retry, resume, or start another task.",
    "Protect all existing Git work and stop at every concrete risk boundary.",
  ].join("\n");
}

export function prepareCodexExecRequest(workspaceRoot: string, contract: AdapterTaskContract): CodexExecRequest {
  const cwd = resolve(workspaceRoot);
  const args = Object.freeze([
    "exec",
    "--ephemeral",
    "--cd",
    cwd,
    "--sandbox",
    "workspace-write",
    "--ask-for-approval",
    "on-request",
    "--disable",
    "multi_agent",
    "--json",
    "-",
  ]);
  return Object.freeze({ command: "codex", args, cwd, stdin: taskPrompt(contract) });
}

export function createCodexExecAdapter(
  workspaceRoot: string,
  status: CodexExecStatus,
  fakeProcess?: CodexExecFakeProcess,
): TaskAdapter {
  const cwd = resolve(workspaceRoot);
  const connected = status.installed && status.connected;
  return {
    kind: "codex-exec",
    descriptor: {
      id: CODEX_EXEC_ADAPTER_ID,
      label: "Codex Exec",
      provider: "OpenAI",
      model: "Codex configured model",
      connected,
      capabilities: ["serial-task"],
      priority: 100,
    },
    async run(contract): Promise<CodexExecFakeProcessResult> {
      const request = prepareCodexExecRequest(cwd, contract);
      if (!fakeProcess || fakeProcess.kind !== "fake") {
        throw new CodexExecModelCallBoundaryError();
      }
      const result = await fakeProcess.run(request);
      return {
        kind: "codex-exec-fake-process-result",
        taskNumber: contract.taskNumber,
        requestedOutcomeSha256: contract.requestedOutcomeSha256,
        processCount: 1,
        exitCode: result.exitCode,
        statement: "A fake process verified one Codex Exec request; no real process or model call ran.",
      };
    },
  };
}
