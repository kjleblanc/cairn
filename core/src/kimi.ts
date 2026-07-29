import { spawn } from "node:child_process";
import { accessSync, existsSync, statSync } from "node:fs";
import { delimiter, isAbsolute, relative, resolve } from "node:path";
import { canonicalPath } from "./files.js";

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
