import { spawn, type ChildProcess } from "node:child_process";
import { accessSync, appendFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, isAbsolute, relative, resolve } from "node:path";
import { canonicalPath } from "./files.js";
import { WorkerProcessError } from "./routing.js";

export type KimiBilling = "oauth" | "other" | "unknown";

export interface KimiExecStatus {
  installed: boolean;
  connected: boolean;
  billing: KimiBilling;
}

export type KimiStatusProbeResult = "success" | "not-found" | "failed";

/** A deliberately output-free readiness probe for the official Kimi Code CLI. */
export interface KimiStatusProbe {
  run(args: readonly string[], cwd: string): Promise<KimiStatusProbeResult>;
}

export type KimiAcpAuthResult = "authenticated" | "auth-required" | "failed" | "not-found";

/**
 * The auth half of detection: the ACP `initialize` + `authenticate`
 * handshake the Task 106 spike observed. Only the outcome may leave this
 * probe — never reply text, account detail, or tokens.
 */
export interface KimiAcpProbe {
  authenticate(cwd: string): Promise<KimiAcpAuthResult>;
}

export type KimiBillingSource = "oauth" | "other" | "unknown" | "not-found";

/**
 * The billing probe: `kimi provider list` prints one structured,
 * secret-free line per provider (observed: `managed:kimi-code type=kimi
 * models=4 source=oauth`). Only the source token leaves this probe.
 */
export interface KimiProviderProbe {
  billingSource(cwd: string): Promise<KimiBillingSource>;
}

export interface KimiDetectionProbes {
  status?: KimiStatusProbe;
  acp?: KimiAcpProbe;
  provider?: KimiProviderProbe;
}

function insideWorkspace(workspaceRoot: string, candidate: string): boolean {
  const path = relative(canonicalPath(workspaceRoot), canonicalPath(candidate));
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

/**
 * The fail-closed test lane. A signed-in real CLI exists on the development
 * machine, and the home-bin fallback below could silently escape to it: a
 * suite that sets the positive test marker must also opt into the fake lane
 * explicitly, or every Kimi command resolves as not-found. A unit test
 * asserts this refusal, so deleting the guard turns the suite red.
 */
function testLaneRefusesRealBinary(): boolean {
  return process.env.CAIRN_TEST_LANE === "1" && process.env.CAIRN_FAKE_KIMI !== "1";
}

/** Resolves only the Kimi Code CLI from absolute PATH entries outside the workspace. */
function resolvePathKimiCommand(workspaceRoot: string): string | null {
  const pathEntry = Object.entries(process.env).find(([key]) => key.toLowerCase() === "path")?.[1] ?? "";
  const extensions = process.platform === "win32" ? [".exe", ".cmd", ".bat"] : [""];
  for (const rawEntry of pathEntry.split(delimiter)) {
    const directory = rawEntry.trim().replace(/^"(.*)"$/, "$1");
    if (!directory || !isAbsolute(directory)) continue;
    for (const extension of extensions) {
      const candidate = resolve(directory, `kimi${extension}`);
      if (insideWorkspace(workspaceRoot, candidate) || !existsSync(candidate)) continue;
      try {
        if (!statSync(candidate).isFile()) continue;
        if (process.platform !== "win32") accessSync(candidate, 0o111 /* X_OK */);
        // cmd.exe expands these characters even inside some quoted command forms.
        if (/\.(?:cmd|bat)$/i.test(candidate) && /[%!^&|<>()]/.test(candidate)) continue;
        return candidate;
      } catch {
        // Ignore inaccessible PATH entries and continue to the next candidate.
      }
    }
  }
  return null;
}

/**
 * The install script lands `kimi` under `~/.kimi-code/bin` and edits PATH,
 * but PATH edits do not reach already-running processes (observed in the
 * Task 106 spike). The fallback probes the install location itself.
 */
function resolveHomeKimiCommand(workspaceRoot: string): string | null {
  const home = process.env.USERPROFILE ?? process.env.HOME;
  if (!home || !isAbsolute(home)) return null;
  const binDir = resolve(home, ".kimi-code", "bin");
  const extensions = process.platform === "win32" ? [".exe", ".cmd", ".bat"] : [""];
  for (const extension of extensions) {
    const candidate = resolve(binDir, `kimi${extension}`);
    if (insideWorkspace(workspaceRoot, candidate) || !existsSync(candidate)) continue;
    try {
      if (!statSync(candidate).isFile()) continue;
      if (process.platform !== "win32") accessSync(candidate, 0o111);
      if (/\.(?:cmd|bat)$/i.test(candidate) && /[%!^&|<>()]/.test(candidate)) continue;
      return candidate;
    } catch {
      // Ignore unreadable entries.
    }
  }
  return null;
}

function resolveKimiCommand(workspaceRoot: string): string | null {
  if (testLaneRefusesRealBinary()) return null;
  return resolvePathKimiCommand(workspaceRoot) ?? resolveHomeKimiCommand(workspaceRoot);
}

function shimPrefix(command: string): { command: string; args: string[] } {
  return { command: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", command] };
}

export function createSystemKimiStatusProbe(): KimiStatusProbe {
  return {
    run(args, cwd) {
      const kimiCommand = resolveKimiCommand(cwd);
      if (!kimiCommand) return Promise.resolve("not-found");
      return new Promise((resolveProbe) => {
        let settled = false;
        const finish = (result: KimiStatusProbeResult): void => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolveProbe(result);
        };
        const shim = process.platform === "win32" && /\.(?:cmd|bat)$/i.test(kimiCommand);
        const launch = shim ? shimPrefix(kimiCommand) : { command: kimiCommand, args: [] as string[] };
        const child = spawn(launch.command, [...launch.args, ...args], {
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

export function createSystemKimiAcpProbe(): KimiAcpProbe {
  return {
    authenticate(cwd) {
      const kimiCommand = resolveKimiCommand(cwd);
      if (!kimiCommand) return Promise.resolve("not-found");
      return new Promise((resolveProbe) => {
        let settled = false;
        const finish = (result: KimiAcpAuthResult): void => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          try { child.kill(); } catch { /* already gone */ }
          resolveProbe(result);
        };
        const shim = process.platform === "win32" && /\.(?:cmd|bat)$/i.test(kimiCommand);
        const launch = shim ? shimPrefix(kimiCommand) : { command: kimiCommand, args: [] as string[] };
        const child = spawn(launch.command, [...launch.args, "acp"], {
          cwd,
          stdio: ["pipe", "pipe", "ignore"],
          windowsHide: true,
        });
        const timer = setTimeout(() => finish("failed"), 5_000);
        child.once("error", (error: NodeJS.ErrnoException) => {
          finish(error.code === "ENOENT" ? "not-found" : "failed");
        });
        child.once("close", () => finish("failed"));
        let buffer = "";
        let sentAuth = false;
        child.stdout.on("data", (chunk: Buffer) => {
          buffer += chunk.toString("utf8");
          if (buffer.length > 65_536) {
            // A peer that floods is not the CLI's handshake; stop reading it.
            finish("failed");
            return;
          }
          let newline: number;
          while ((newline = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, newline);
            buffer = buffer.slice(newline + 1);
            if (!line.trim()) continue;
            let message: { id?: unknown; result?: unknown; error?: { code?: unknown } };
            try {
              message = JSON.parse(line);
            } catch {
              continue;
            }
            if (message.id !== 1 && message.id !== 2) continue;
            if (message.id === 1 && message.result !== undefined && !sentAuth) {
              sentAuth = true;
              // The spike's recorded correction: camelCase methodId — the
              // docs' snake_case spelling returns -32602.
              send({ jsonrpc: "2.0", id: 2, method: "authenticate", params: { methodId: "login" } });
            } else if (message.id === 2) {
              if (message.result !== undefined) finish("authenticated");
              else if (message.error?.code === -32000) finish("auth-required");
              else finish("failed");
            }
          }
        });
        const send = (payload: unknown): void => {
          try {
            child.stdin.write(JSON.stringify(payload) + "\n");
          } catch {
            finish("failed");
          }
        };
        send({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false } } },
        });
      });
    },
  };
}

export function createSystemKimiProviderProbe(): KimiProviderProbe {
  return {
    billingSource(cwd) {
      const kimiCommand = resolveKimiCommand(cwd);
      if (!kimiCommand) return Promise.resolve("not-found");
      return new Promise((resolveProbe) => {
        let settled = false;
        const finish = (result: KimiBillingSource): void => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolveProbe(result);
        };
        const shim = process.platform === "win32" && /\.(?:cmd|bat)$/i.test(kimiCommand);
        const launch = shim ? shimPrefix(kimiCommand) : { command: kimiCommand, args: [] as string[] };
        const child = spawn(launch.command, [...launch.args, "provider", "list"], {
          cwd,
          stdio: ["ignore", "pipe", "ignore"],
          windowsHide: true,
        });
        const timer = setTimeout(() => {
          child.kill();
          finish("unknown");
        }, 5_000);
        child.once("error", (error: NodeJS.ErrnoException) => {
          finish(error.code === "ENOENT" ? "not-found" : "unknown");
        });
        let stdout = "";
        child.stdout.on("data", (chunk: Buffer) => {
          stdout += chunk.toString("utf8");
          if (stdout.length > 65_536) stdout = stdout.slice(0, 65_536);
        });
        child.once("close", (code) => {
          if (code !== 0) {
            finish("unknown");
            return;
          }
          // Only the source token leaves this probe. `source=oauth` is the
          // membership sign-in (spike-observed); any other source value is
          // honestly "other"; an unparseable line is "unknown".
          const match = /\bsource=([A-Za-z0-9_-]+)/.exec(stdout);
          if (!match) finish("unknown");
          else if (match[1] === "oauth") finish("oauth");
          else finish("other");
        });
      });
    },
  };
}

export async function detectKimiExecStatus(
  workspaceRoot: string,
  probes?: KimiDetectionProbes,
): Promise<KimiExecStatus> {
  const cwd = resolve(workspaceRoot);
  const status = probes?.status ?? createSystemKimiStatusProbe();
  const installed = await status.run(["--version"], cwd);
  if (installed !== "success") return Object.freeze({ installed: false, connected: false, billing: "unknown" as const });
  const acp = probes?.acp ?? createSystemKimiAcpProbe();
  const auth = await acp.authenticate(cwd);
  if (auth !== "authenticated") return Object.freeze({ installed: true, connected: false, billing: "unknown" as const });
  const provider = probes?.provider ?? createSystemKimiProviderProbe();
  const source = await provider.billingSource(cwd);
  const billing: KimiBilling = source === "oauth" ? "oauth" : source === "other" ? "other" : "unknown";
  return Object.freeze({ installed: true, connected: true, billing });
}

export function kimiExecStatusText(status: KimiExecStatus): string {
  if (!status.installed) return "Kimi Code CLI is not installed.";
  if (!status.connected) return "Kimi Code CLI is installed but not signed in.";
  return "Kimi Code CLI is installed and signed in.";
}

export function kimiExecConnectionReason(status: KimiExecStatus): string {
  if (!status.installed) return "Kimi Code CLI is not installed, so no Kimi model route is available.";
  if (!status.connected) return "Kimi Code CLI is installed but not signed in, so no Kimi model route is available.";
  return "Kimi Code CLI is installed, signed in, and supports this serial task.";
}

// ---------------------------------------------------------------------------
// The exec process (Level 3a plan Task 2). Built only from the Task 106
// spike's observed facts: `-p` takes the prompt as one argv value (stdin is
// not a prompt channel), stream-json emits whole-message assistant lines,
// OpenAI-style tool_calls, role:tool results, and a trailing role:meta line;
// no usage/token records exist; the terminal state is process exit.
// ---------------------------------------------------------------------------

export interface KimiExecRequest {
  command: "kimi" | "kimi.exe";
  args: readonly string[];
  cwd: string;
  /** The composed task prompt. Separate from args and appended at spawn as
   * one `-p` argv element, behind the length guard below. */
  prompt: string;
}

/** The observed terminal state is process exit — there is no terminal event
 * in the stream. `"error"` means a malformed line was seen. */
export type KimiExecTerminalEvent = "process-exit" | "error";

export interface KimiExecProcessResult {
  exitCode: number;
  terminalEvent: KimiExecTerminalEvent;
  agentMessageCount: number;
  toolCallCount: number;
  failedToolItemCount: number;
  finalMessage: string | null;
}

export interface KimiExecProcess {
  kind: "system" | "fake";
  run(request: KimiExecRequest, signal?: AbortSignal): Promise<KimiExecProcessResult>;
}

export const KIMI_EXEC_INACTIVITY_MS = 600_000;
export const KIMI_EXEC_ABSOLUTE_MS = 3_600_000;
/** Comfortably under the ~32 KB Windows command-line limit; measured on the
 * composed prompt at run time, before spawn. */
export const KIMI_EXEC_PROMPT_MAX_CHARS = 24_000;

export type KimiExecProcessFailureCode = "KIMI_EXEC_SPAWN_FAILED" | "KIMI_PROMPT_TOO_LONG";

/** The kimi specialization of `WorkerProcessError` (failure "process"). A
 * prompt-guard refusal is killed-by-construction: nothing ever spawned. */
export class KimiExecProcessError extends WorkerProcessError {
  constructor(code: KimiExecProcessFailureCode, debugPath: string | null) {
    super("process", code, debugPath);
    this.name = "KimiExecProcessError";
  }
}

export function isKimiExecProcessError(value: unknown): value is KimiExecProcessError {
  return value instanceof KimiExecProcessError;
}

export type KimiExecTimeoutKind = "inactivity" | "absolute";

/** Print mode can linger by design (background tasks keep it alive since
 * 0.24.2), so the absolute cap is load-bearing. The kimi specialization of
 * `WorkerProcessError` (failure "timeout"). */
export class KimiExecTimeoutError extends WorkerProcessError {
  constructor(
    readonly timeoutKind: KimiExecTimeoutKind,
    debugPath: string | null,
    killConfirmed: boolean,
  ) {
    super("timeout", "KIMI_EXEC_TIMED_OUT", debugPath, killConfirmed);
    this.name = "KimiExecTimeoutError";
  }
}

export function isKimiExecTimeoutError(value: unknown): value is KimiExecTimeoutError {
  return value instanceof KimiExecTimeoutError;
}

/** The owner pressed stop. The kimi specialization of `WorkerProcessError`
 * (failure "cancelled"). */
export class KimiExecCancelledError extends WorkerProcessError {
  constructor(debugPath: string | null, killConfirmed: boolean) {
    super("cancelled", "KIMI_EXEC_CANCELLED", debugPath, killConfirmed);
    this.name = "KimiExecCancelledError";
  }
}

export function isKimiExecCancelledError(value: unknown): value is KimiExecCancelledError {
  return value instanceof KimiExecCancelledError;
}

export interface KimiExecProcessOptions {
  inactivityMs?: number;
  absoluteMs?: number;
}

/** On Windows the child may be a cmd.exe shim chain; killing only the shim
 * orphans the real kimi process, so the whole tree goes. */
function killKimiProcessTree(child: ChildProcess): void {
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
    // negative PID SIGKILLs the whole group. If the group send fails, fall
    // back to a direct SIGKILL of the child.
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
function kimiDebugDirectory(): string | null {
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

interface KimiStreamEvidence {
  terminalEvent?: KimiExecTerminalEvent;
  agentMessageCount?: number;
  toolCallCount?: number;
  failedToolItemCount?: number;
  finalMessage?: string | null;
}

/**
 * The conservative failed-tool rule, documented per the plan: print-mode
 * failure marking was NOT observed in the spike, so a tool result counts as
 * failed only when its content is an explicit failure shape — a JSON object
 * carrying `status:"failed"` or `isError:true`. Plain text that merely looks
 * like an error ("Error: ...", a non-zero exit report) never counts: guessing
 * from text would turn ordinary tool output into failures.
 */
function conservativeToolFailure(content: unknown): boolean {
  let value: unknown = content;
  if (typeof content === "string") {
    try {
      value = JSON.parse(content);
    } catch {
      return false;
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return record.status === "failed" || record.isError === true;
}

/** One observed stream-json line → bounded evidence, or null when the line is
 * informational only (role:"meta" and unrecognized shapes). */
function streamJsonEvidence(line: string): KimiStreamEvidence | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return { terminalEvent: "error" };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return { terminalEvent: "error" };
  const record = value as Record<string, unknown>;
  if (record.role === "assistant") {
    const evidence: KimiStreamEvidence = {};
    if (typeof record.content === "string") {
      // A complete assistant message (whole-message buffering): it counts one
      // and becomes the final message — last wins, since the claims carrier
      // is the last assistant message.
      evidence.agentMessageCount = 1;
      evidence.finalMessage = record.content.length <= 262_144 ? record.content : null;
    }
    if (Array.isArray(record.tool_calls)) {
      evidence.toolCallCount = record.tool_calls.length;
    }
    return evidence;
  }
  if (record.role === "tool") {
    // The matching call was already counted on the assistant line; a result
    // adds nothing numeric except the conservative failure count above.
    return { failedToolItemCount: conservativeToolFailure(record.content) ? 1 : 0 };
  }
  // role:"meta" and anything unrecognized: ignored for results. The raw line
  // is already retained in the debug copy.
  return null;
}

/** Starts one process and retains only terminal state plus numeric evidence. */
export function createSystemKimiExecProcess(options?: KimiExecProcessOptions): KimiExecProcess {
  return {
    kind: "system",
    run(request, signal) {
      return new Promise((resolveRun, rejectRun) => {
        if (signal?.aborted) {
          // Pre-spawn cancel: nothing ever started, so the kill is confirmed
          // by construction — there is no child to orphan.
          rejectRun(new KimiExecCancelledError(null, true));
          return;
        }
        if (request.prompt.length > KIMI_EXEC_PROMPT_MAX_CHARS) {
          // The prompt rides one argv element against the ~32 KB Windows
          // command-line limit; refuse before spawn, killed-by-construction.
          rejectRun(new KimiExecProcessError("KIMI_PROMPT_TOO_LONG", null));
          return;
        }
        const kimiCommand = resolveKimiCommand(request.cwd);
        if (!kimiCommand) {
          rejectRun(new KimiExecProcessError("KIMI_EXEC_SPAWN_FAILED", null));
          return;
        }
        const shim = process.platform === "win32" && /\.(?:cmd|bat)$/i.test(kimiCommand);
        const launch = shim ? shimPrefix(kimiCommand) : { command: kimiCommand, args: [] as string[] };
        const child = spawn(launch.command, [...launch.args, ...request.args, "-p", request.prompt], {
          cwd: request.cwd,
          // The prompt is argv-only (spike: stdin is not a prompt channel), so
          // stdin stays closed — there is no stdin-write failure class here.
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
          // POSIX only: lead a new process group so killKimiProcessTree can
          // SIGKILL the whole group. On win32 taskkill /T already reaches the
          // shim's children.
          ...(process.platform === "win32" ? {} : { detached: true }),
        });
        const debugDirectory = kimiDebugDirectory();
        const debugStamp = `kimi-${new Date().toISOString().replace(/[:.]/g, "-")}-${child.pid ?? "0"}`;
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
        const inactivityMs = options?.inactivityMs ?? KIMI_EXEC_INACTIVITY_MS;
        const absoluteMs = options?.absoluteMs ?? KIMI_EXEC_ABSOLUTE_MS;
        let timedOut: KimiExecTimeoutKind | null = null;
        let cancelled = false;
        let forceSettle: NodeJS.Timeout | undefined;
        // If even the tree kill cannot make the child close, settle anyway.
        const armForceSettle = (reject: () => void): NodeJS.Timeout => setTimeout(() => {
          if (settled) return;
          clearWatchdog();
          settled = true;
          // A surviving grandchild holding these pipes open must never keep
          // the event loop (and this run) alive after the watchdog or an
          // abort fired.
          child.stdout.destroy();
          child.stderr.destroy();
          reject();
        }, 5_000);
        const fireTimeout = (kind: KimiExecTimeoutKind): void => {
          if (settled || timedOut || cancelled) return;
          timedOut = kind;
          killKimiProcessTree(child);
          // Force-settle: the kill fired but the child never closed, so a live
          // orphan may still be writing — the kill is NOT confirmed.
          forceSettle = armForceSettle(() => rejectRun(new KimiExecTimeoutError(kind, debugPath, false)));
        };
        const onAbort = (): void => {
          if (settled || cancelled || timedOut) return;
          cancelled = true;
          killKimiProcessTree(child);
          // Force-settle: the kill fired but the child never closed, so a live
          // orphan may still be writing — the kill is NOT confirmed.
          forceSettle = armForceSettle(() => rejectRun(new KimiExecCancelledError(debugPath, false)));
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
        let result: KimiExecProcessResult = {
          exitCode: -1,
          terminalEvent: "process-exit",
          agentMessageCount: 0,
          toolCallCount: 0,
          failedToolItemCount: 0,
          finalMessage: null,
        };
        // A dropped line is an overwrite-to-null event: the dropped line may
        // have been the true final assistant message; a partial view must not
        // let an earlier message masquerade as final. A later fully-visible
        // message may still legitimately overwrite this.
        const clearFinalMessageForDroppedLine = (): void => {
          if (result.terminalEvent === "error") return;
          result = { ...result, finalMessage: null };
        };
        const applyEvidence = (evidence: KimiStreamEvidence | null): void => {
          if (!evidence) return;
          if (result.terminalEvent === "error") return;
          const {
            agentMessageCount = 0,
            toolCallCount = 0,
            failedToolItemCount = 0,
            finalMessage,
            ...terminal
          } = evidence;
          result = {
            ...result,
            ...terminal,
            agentMessageCount: result.agentMessageCount + agentMessageCount,
            toolCallCount: result.toolCallCount + toolCallCount,
            failedToolItemCount: result.failedToolItemCount + failedToolItemCount,
            finalMessage: finalMessage !== undefined ? finalMessage : result.finalMessage,
          };
        };
        const fail = (code: KimiExecProcessFailureCode): void => {
          if (settled || timedOut || cancelled) return;
          clearWatchdog();
          settled = true;
          rejectRun(new KimiExecProcessError(code, debugPath));
        };
        child.once("error", () => fail("KIMI_EXEC_SPAWN_FAILED"));
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
              clearFinalMessageForDroppedLine();
              continue;
            }
            if (!line.trim()) continue;
            applyEvidence(streamJsonEvidence(line));
          }
          if (stdout.length > 1_048_576) {
            // An oversized line already streamed to the debug file in full;
            // drop it from the parse buffer instead of killing the run.
            skippingOversizedLine = true;
            stdout = "";
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
            rejectRun(new KimiExecCancelledError(debugPath, true));
            return;
          }
          if (timedOut) {
            if (settled) return;
            settled = true;
            // The child closed after the kill: the kill is confirmed.
            rejectRun(new KimiExecTimeoutError(timedOut, debugPath, true));
            return;
          }
          if (settled) return;
          if (stdout.trim() && !skippingOversizedLine) {
            applyEvidence(streamJsonEvidence(stdout));
          } else if (skippingOversizedLine) {
            // The close-time flush is skipping a flagged partial line rather
            // than parsing it; the dropped line may have been the true final
            // assistant message.
            clearFinalMessageForDroppedLine();
          }
          settled = true;
          resolveRun({ ...result, exitCode: typeof code === "number" ? code : -1 });
        });
      });
    },
  };
}
