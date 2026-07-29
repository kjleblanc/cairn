import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import {
  authorizeKimiExec,
  createKimiExecAdapter,
  createSystemKimiAcpProbe,
  createSystemKimiExecProcess,
  createSystemKimiProviderProbe,
  detectKimiExecStatus,
  isKimiExecCancelledError,
  isKimiExecTimeoutError,
  KIMI_EXEC_ABSOLUTE_MS,
  KIMI_EXEC_ADAPTER_ID,
  KIMI_EXEC_DATA_SCOPE,
  KIMI_EXEC_INACTIVITY_MS,
  KIMI_EXEC_MODEL,
  KIMI_EXEC_PROMPT_MAX_CHARS,
  KIMI_EXEC_PROVIDER,
  KIMI_EXEC_QUOTA_GENERIC,
  KIMI_EXEC_QUOTA_OAUTH,
  KimiExecModelCallBoundaryError,
  KimiExecProcessError,
  kimiExecConnectionReason,
  kimiExecDisclosure,
  kimiExecStatusText,
  type KimiAcpProbe,
  type KimiExecProcess,
  type KimiExecProcessResult,
  type KimiExecRequest,
  type KimiProviderProbe,
  type KimiStatusProbe,
  type KimiStatusProbeResult,
} from "../src/kimi.js";
import { createCodexExecAdapter, REAL_MODEL_CALL_NOT_AUTHORIZED } from "../src/codex.js";
import { routeTask, type AdapterTaskContract } from "../src/routing.js";

const SECRET_SENTINEL = "sk-secret-kimi-account-detail";

class FakeStatusProbe implements KimiStatusProbe {
  readonly calls: { args: readonly string[]; cwd: string }[] = [];
  readonly rawOutputThatMustStayPrivate = SECRET_SENTINEL;

  constructor(private readonly results: KimiStatusProbeResult[]) {}

  async run(args: readonly string[], cwd: string): Promise<KimiStatusProbeResult> {
    this.calls.push({ args: [...args], cwd });
    return this.results.shift() ?? "failed";
  }
}

class FakeAcpProbe implements KimiAcpProbe {
  readonly calls: string[] = [];
  constructor(private readonly result: "authenticated" | "auth-required" | "failed" | "not-found") {}
  async authenticate(cwd: string) {
    this.calls.push(cwd);
    return this.result;
  }
}

class FakeProviderProbe implements KimiProviderProbe {
  readonly calls: string[] = [];
  constructor(private readonly result: "oauth" | "other" | "unknown" | "not-found") {}
  async billingSource(cwd: string) {
    this.calls.push(cwd);
    return this.result;
  }
}

// A real directory: the system probes spawn with the workspace as cwd, and
// Windows refuses to spawn into a non-existent directory (ENOENT).
const ROOT = mkdtempSync(join(tmpdir(), "cairn-kimi-ws-"));

test("Kimi detection keeps only installed, connected, and billing", async () => {
  const missing = new FakeStatusProbe(["not-found"]);
  const acp = new FakeAcpProbe("authenticated");
  const provider = new FakeProviderProbe("oauth");
  assert.deepEqual(await detectKimiExecStatus(ROOT, { status: missing, acp, provider }), {
    installed: false, connected: false, billing: "unknown",
  });
  assert.deepEqual(missing.calls.map((call) => call.args), [["--version"]]);
  // No install, no further probes: auth and billing are never asked.
  assert.equal(acp.calls.length, 0);
  assert.equal(provider.calls.length, 0);

  const signedOut = new FakeStatusProbe(["success"]);
  const acpOut = new FakeAcpProbe("auth-required");
  const providerSkipped = new FakeProviderProbe("oauth");
  assert.deepEqual(await detectKimiExecStatus(ROOT, { status: signedOut, acp: acpOut, provider: providerSkipped }), {
    installed: true, connected: false, billing: "unknown",
  });
  // Billing is meaningless without a connection and is not probed.
  assert.equal(providerSkipped.calls.length, 0);

  const ok = new FakeStatusProbe(["success"]);
  const status = await detectKimiExecStatus(ROOT, { status: ok, acp: new FakeAcpProbe("authenticated"), provider: new FakeProviderProbe("oauth") });
  assert.deepEqual(status, { installed: true, connected: true, billing: "oauth" });
  assert.deepEqual(Object.keys(status).sort(), ["billing", "connected", "installed"]);
  assert.doesNotMatch(JSON.stringify(status), new RegExp(SECRET_SENTINEL));
});

test("Kimi detection treats an auth probe failure as not connected, and non-oauth billing honestly", async () => {
  const failed = await detectKimiExecStatus(ROOT, {
    status: new FakeStatusProbe(["success"]),
    acp: new FakeAcpProbe("failed"),
    provider: new FakeProviderProbe("oauth"),
  });
  assert.deepEqual(failed, { installed: true, connected: false, billing: "unknown" });

  const apiKey = await detectKimiExecStatus(ROOT, {
    status: new FakeStatusProbe(["success"]),
    acp: new FakeAcpProbe("authenticated"),
    provider: new FakeProviderProbe("other"),
  });
  assert.deepEqual(apiKey, { installed: true, connected: true, billing: "other" });
});

test("Kimi status prose mirrors the two-boolean shape", () => {
  assert.equal(kimiExecStatusText({ installed: false, connected: false, billing: "unknown" }), "Kimi Code CLI is not installed.");
  assert.equal(kimiExecStatusText({ installed: true, connected: false, billing: "unknown" }), "Kimi Code CLI is installed but not signed in.");
  assert.equal(kimiExecStatusText({ installed: true, connected: true, billing: "oauth" }), "Kimi Code CLI is installed and signed in.");
  assert.equal(kimiExecConnectionReason({ installed: false, connected: false, billing: "unknown" }), "Kimi Code CLI is not installed, so no Kimi model route is available.");
  assert.equal(kimiExecConnectionReason({ installed: true, connected: false, billing: "unknown" }), "Kimi Code CLI is installed but not signed in, so no Kimi model route is available.");
  assert.equal(kimiExecConnectionReason({ installed: true, connected: true, billing: "oauth" }), "Kimi Code CLI is installed, signed in, and supports this serial task.");
});

/** One fake `kimi` on PATH: --version, `provider list`, and a minimal ACP
 * peer that records every JSON-RPC line it receives to CAIRN_FAKE_KIMI_ACP_LOG. */
function fakeKimiOnPath(options: { signedIn: boolean; providerLine?: string }): { bin: string; acpLog: string; restore: () => void } {
  const bin = mkdtempSync(join(tmpdir(), "cairn-fake-kimi-unit-"));
  const acpLog = join(bin, "acp-received.jsonl");
  const dispatcher = join(bin, "fake-kimi.cjs");
  const source = `
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args.includes("--version")) process.exit(0);
if (args[0] === "provider" && args[1] === "list") {
  process.stdout.write(${JSON.stringify(options.providerLine ?? "managed:kimi-code  type=kimi  models=4  source=oauth")} + "\\n");
  process.exit(0);
}
if (args[0] === "acp") {
  const received = [];
  let buf = "";
  process.stdin.on("data", (chunk) => {
    buf += chunk;
    let i;
    while ((i = buf.indexOf("\\n")) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      if (!line.trim()) continue;
      received.push(line);
      fs.writeFileSync(process.env.CAIRN_FAKE_KIMI_ACP_LOG, received.join("\\n"));
      const m = JSON.parse(line);
      if (m.method === "initialize") {
        process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: 1, agentCapabilities: {}, authMethods: [], agentInfo: { name: "fake-kimi", version: "0.0.0" } } }) + "\\n");
      } else if (m.method === "authenticate") {
        if (${JSON.stringify(options.signedIn)}) process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: m.id, result: {} }) + "\\n");
        else process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: m.id, error: { code: -32000, message: "Authentication required" } }) + "\\n");
      }
    }
  });
  process.stdin.resume();
  return;
}
process.exit(2);
`;
  writeFileSync(dispatcher, source);
  if (process.platform === "win32") {
    writeFileSync(join(bin, "kimi.cmd"), `@"${process.execPath}" "${dispatcher}" %*\r\n`);
  } else {
    const executable = join(bin, "kimi");
    writeFileSync(executable, `#!${process.execPath}\n${source}`);
    chmodSync(executable, 0o755);
  }
  const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";
  const previousPath = process.env[pathKey];
  const previousLog = process.env.CAIRN_FAKE_KIMI_ACP_LOG;
  process.env[pathKey] = `${bin}${delimiter}${previousPath ?? ""}`;
  process.env.CAIRN_FAKE_KIMI_ACP_LOG = acpLog;
  return {
    bin,
    acpLog,
    restore: () => {
      if (previousPath === undefined) delete process.env[pathKey];
      else process.env[pathKey] = previousPath;
      if (previousLog === undefined) delete process.env.CAIRN_FAKE_KIMI_ACP_LOG;
      else process.env.CAIRN_FAKE_KIMI_ACP_LOG = previousLog;
    },
  };
}

function withEnv(entries: Record<string, string | undefined>, fn: () => Promise<void>): Promise<void> {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(entries)) {
    previous[key] = process.env[key];
    const value = entries[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return fn().finally(() => {
    for (const key of Object.keys(entries)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });
}

test("the system ACP probe speaks the observed handshake, pinned at the wire", async () => {
  const fake = fakeKimiOnPath({ signedIn: true });
  try {
    const probe = createSystemKimiAcpProbe();
    assert.equal(await probe.authenticate(ROOT), "authenticated");
    const received = readFileSync(fake.acpLog, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    assert.equal(received.length, 2);
    assert.equal(received[0].method, "initialize");
    assert.equal(received[0].params.protocolVersion, 1);
    assert.equal(received[1].method, "authenticate");
    // The spike's recorded docs correction: camelCase methodId. A snake_case
    // regression must turn this test red.
    assert.deepEqual(received[1].params, { methodId: "login" });
    // The probe returns only the outcome — no reply text, no account detail.
    assert.doesNotMatch(readFileSync(fake.acpLog, "utf8"), new RegExp(SECRET_SENTINEL));
  } finally {
    fake.restore();
  }
});

test("the system ACP probe maps -32000 to signed-out", async () => {
  const fake = fakeKimiOnPath({ signedIn: false });
  try {
    assert.equal(await createSystemKimiAcpProbe().authenticate(ROOT), "auth-required");
  } finally {
    fake.restore();
  }
});

test("the system provider probe reads the billing source and nothing else", async () => {
  const oauth = fakeKimiOnPath({ signedIn: true });
  try {
    assert.equal(await createSystemKimiProviderProbe().billingSource(ROOT), "oauth");
  } finally {
    oauth.restore();
  }
  const apiKey = fakeKimiOnPath({ signedIn: true, providerLine: "custom:metered  type=openai  models=12  source=api-key" });
  try {
    assert.equal(await createSystemKimiProviderProbe().billingSource(ROOT), "other");
  } finally {
    apiKey.restore();
  }
  const garbage = fakeKimiOnPath({ signedIn: true, providerLine: "totally unexpected output" });
  try {
    assert.equal(await createSystemKimiProviderProbe().billingSource(ROOT), "unknown");
  } finally {
    garbage.restore();
  }
});

test("system readiness ignores a workspace-local Kimi command", async () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-kimi-shadow-"));
  const command = join(root, process.platform === "win32" ? "kimi.cmd" : "kimi");
  writeFileSync(command, process.platform === "win32" ? "@exit /b 0\r\n" : "#!/bin/sh\nexit 0\n");
  if (process.platform !== "win32") chmodSync(command, 0o755);
  const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";
  const homeKey = process.platform === "win32" ? "USERPROFILE" : "HOME";
  // An empty home keeps the ~/.kimi-code/bin fallback from finding any real
  // install on the development machine — this test measures PATH behavior only.
  const emptyHome = mkdtempSync(join(tmpdir(), "cairn-kimi-empty-home-"));
  await withEnv({ [pathKey]: root, [homeKey]: emptyHome }, async () => {
    assert.deepEqual(await detectKimiExecStatus(root), { installed: false, connected: false, billing: "unknown" });
  });
});

test("resolution falls back to ~/.kimi-code/bin when PATH misses", async () => {
  const home = mkdtempSync(join(tmpdir(), "cairn-kimi-home-"));
  const binDir = join(home, ".kimi-code", "bin");
  mkdirSync(binDir, { recursive: true });
  const command = join(binDir, process.platform === "win32" ? "kimi.cmd" : "kimi");
  writeFileSync(command, process.platform === "win32" ? "@exit /b 0\r\n" : "#!/bin/sh\nexit 0\n");
  if (process.platform !== "win32") chmodSync(command, 0o755);
  const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";
  const homeKey = process.platform === "win32" ? "USERPROFILE" : "HOME";
  // PATH deliberately excludes the fake bin; only the home fallback can find it.
  const fake = fakeKimiOnPath({ signedIn: true });
  try {
    await withEnv({ [homeKey]: home }, async () => {
      const status = new FakeStatusProbe(["success"]);
      // Resolution is exercised through the system probes: the fallback home
      // carries the version-answering command, the PATH fake answers acp and
      // provider. Installed must come from the fallback, not PATH.
      const pathEntries = (process.env[pathKey] ?? "").split(delimiter).filter((entry) => entry !== fake.bin);
      await withEnv({ [pathKey]: pathEntries.join(delimiter) }, async () => {
        const detected = await detectKimiExecStatus(ROOT, { acp: new FakeAcpProbe("authenticated"), provider: new FakeProviderProbe("oauth") });
        assert.deepEqual(detected, { installed: true, connected: true, billing: "oauth" });
      });
      void status;
    });
  } finally {
    fake.restore();
  }
});

test("the test-lane guard refuses the real binary without the fake switch", async () => {
  const fake = fakeKimiOnPath({ signedIn: true });
  try {
    await withEnv({ CAIRN_TEST_LANE: "1", CAIRN_FAKE_KIMI: undefined }, async () => {
      // A real (or any) kimi on PATH must be invisible to a suite that did
      // not explicitly opt into the fake lane.
      assert.deepEqual(await detectKimiExecStatus(ROOT), { installed: false, connected: false, billing: "unknown" });
    });
    await withEnv({ CAIRN_TEST_LANE: "1", CAIRN_FAKE_KIMI: "1" }, async () => {
      const detected = await detectKimiExecStatus(ROOT);
      assert.deepEqual(detected, { installed: true, connected: true, billing: "oauth" });
    });
  } finally {
    fake.restore();
  }
});

// ---------------------------------------------------------------------------
// Plan Task 2 — the exec process: argv prompt, stream-json parse, watchdogs.
// Every fixture below is built ONLY from the lines the Task 106 spike
// observed: whole-message assistant lines, OpenAI-style tool_calls, role:tool
// results, and a trailing role:meta session.resume_hint. No usage/token
// records were observed, so the result shape carries none.
// ---------------------------------------------------------------------------

const PONG_TRANSCRIPT = [
  JSON.stringify({ role: "assistant", content: "PONG" }),
  JSON.stringify({ role: "meta", type: "session.resume_hint", session_id: "spike-observed-shape" }),
].join("\n") + "\n";

const ECHO_TOOL_TRANSCRIPT = [
  JSON.stringify({
    role: "assistant",
    tool_calls: [{ type: "function", id: "call_1", function: { name: "Bash", arguments: "{\"command\":\"echo hello\"}" } }],
  }),
  JSON.stringify({ role: "tool", tool_call_id: "call_1", content: "hello\n" }),
  JSON.stringify({ role: "assistant", content: "The echo printed hello." }),
  JSON.stringify({ role: "meta", type: "session.resume_hint", session_id: "spike-observed-shape" }),
].join("\n") + "\n";

interface FakeKimiExec {
  bin: string;
  home: string;
  localAppData: string;
  argvLog: string;
}

/** A hermetic fake `kimi` for exec tests: records the argv it received to
 * CAIRN_FAKE_KIMI_ARGV_LOG, emits the given stdout body and stderr text, and
 * exits with the given code. `body: null` wedges the child (silent forever or
 * chattering forever) for watchdog tests. */
function fakeKimiExecInstall(
  body: string | null,
  options: { stderr?: string; exitCode?: number; chatter?: boolean } = {},
): FakeKimiExec {
  const bin = mkdtempSync(join(tmpdir(), "cairn-kimi-exec-bin-"));
  const home = mkdtempSync(join(tmpdir(), "cairn-kimi-exec-home-"));
  const localAppData = mkdtempSync(join(tmpdir(), "cairn-kimi-exec-lad-"));
  const argvLog = join(bin, "argv.json");
  const dispatcher = join(bin, "dispatcher.cjs");
  const lines = [
    `require("node:fs").writeFileSync(process.env.CAIRN_FAKE_KIMI_ARGV_LOG, JSON.stringify(process.argv.slice(2)));`,
  ];
  if (body === null) {
    // A wedged CLI: never exits on its own. "chatter" keeps stdout active so
    // only the absolute cap can fire; otherwise it goes silent so only the
    // inactivity timer can.
    if (options.chatter) {
      lines.push(
        `setInterval(() => {`,
        `  process.stdout.write(JSON.stringify({ role: "assistant", content: "still going" }) + "\\n");`,
        `}, 50);`,
      );
    } else {
      lines.push(`setInterval(() => {}, 1000);`);
    }
  } else {
    if (options.stderr) lines.push(`process.stderr.write(${JSON.stringify(options.stderr)});`);
    lines.push(
      `process.stdout.write(${JSON.stringify(body)});`,
      `process.exit(${options.exitCode ?? 0});`,
    );
  }
  writeFileSync(dispatcher, lines.join("\n") + "\n", "utf8");
  const command = join(bin, process.platform === "win32" ? "kimi.cmd" : "kimi");
  writeFileSync(command, process.platform === "win32"
    ? `@echo off\r\n"${process.execPath}" "${dispatcher}" %*\r\n`
    : `#!${process.execPath}\nrequire(${JSON.stringify(dispatcher)});\n`, "utf8");
  if (process.platform !== "win32") chmodSync(command, 0o755);
  return { bin, home, localAppData, argvLog };
}

/** PATH carries only the fake bin; the home is empty so the ~/.kimi-code/bin
 * fallback can never escape to the real signed-in CLI on this machine;
 * LOCALAPPDATA is a temp dir so debug copies stay hermetic. */
function withFakeKimiExec<T>(fake: FakeKimiExec, run: () => Promise<T>): Promise<T> {
  const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";
  const homeKeys = process.platform === "win32" ? ["USERPROFILE", "HOME"] : ["HOME"];
  const previousPath = process.env[pathKey];
  const previousHomes = homeKeys.map((key) => process.env[key]);
  const previousLocalAppData = process.env.LOCALAPPDATA;
  const previousArgvLog = process.env.CAIRN_FAKE_KIMI_ARGV_LOG;
  process.env[pathKey] = process.platform === "win32"
    // System32 only, so a bare `cmd.exe` shim launch resolves even when the
    // parent shell never set ComSpec — without inheriting a user PATH that
    // could carry the real signed-in CLI as a fallback.
    ? [fake.bin, join(process.env.SystemRoot ?? "C:\\Windows", "System32")].join(delimiter)
    : fake.bin;
  for (const key of homeKeys) process.env[key] = fake.home;
  process.env.LOCALAPPDATA = fake.localAppData;
  process.env.CAIRN_FAKE_KIMI_ARGV_LOG = fake.argvLog;
  return run().finally(() => {
    if (previousPath === undefined) delete process.env[pathKey];
    else process.env[pathKey] = previousPath;
    homeKeys.forEach((key, index) => {
      if (previousHomes[index] === undefined) delete process.env[key];
      else process.env[key] = previousHomes[index];
    });
    if (previousLocalAppData === undefined) delete process.env.LOCALAPPDATA;
    else process.env.LOCALAPPDATA = previousLocalAppData;
    if (previousArgvLog === undefined) delete process.env.CAIRN_FAKE_KIMI_ARGV_LOG;
    else process.env.CAIRN_FAKE_KIMI_ARGV_LOG = previousArgvLog;
  });
}

function execWorkspace(): string {
  // A real directory: Windows refuses to spawn into a nonexistent cwd.
  return mkdtempSync(join(tmpdir(), "cairn-kimi-exec-ws-"));
}

const EXEC_ARGS = ["--output-format", "stream-json", "-m", "kimi-code/kimi-for-coding"] as const;

test("watchdog and prompt-guard constants match the plan", () => {
  assert.equal(KIMI_EXEC_INACTIVITY_MS, 600_000);
  assert.equal(KIMI_EXEC_ABSOLUTE_MS, 3_600_000);
  assert.equal(KIMI_EXEC_PROMPT_MAX_CHARS, 24_000);
});

test("a clean finish parses the PONG transcript into observed fields only", async () => {
  const fake = fakeKimiExecInstall(PONG_TRANSCRIPT);
  await withFakeKimiExec(fake, async () => {
    const result = await createSystemKimiExecProcess().run({
      command: process.platform === "win32" ? "kimi.exe" : "kimi",
      args: EXEC_ARGS,
      cwd: execWorkspace(),
      prompt: "Reply with exactly PONG.",
    });
    assert.deepEqual(result, {
      exitCode: 0,
      terminalEvent: "process-exit",
      agentMessageCount: 1,
      toolCallCount: 0,
      failedToolItemCount: 0,
      finalMessage: "PONG",
    });
    // No token fields were observed in the stream, so none exist — not even
    // zeroed (absence is honest).
    assert.deepEqual(Object.keys(result).sort(), [
      "agentMessageCount", "exitCode", "failedToolItemCount", "finalMessage", "terminalEvent", "toolCallCount",
    ]);
  });
});

test("the spike's echo-tool sequence counts calls, not results, and keeps the last message", async () => {
  const fake = fakeKimiExecInstall(ECHO_TOOL_TRANSCRIPT);
  await withFakeKimiExec(fake, async () => {
    const result = await createSystemKimiExecProcess().run({
      command: process.platform === "win32" ? "kimi.exe" : "kimi",
      args: EXEC_ARGS,
      cwd: execWorkspace(),
      prompt: "Run echo hello and tell me what it printed.",
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.terminalEvent, "process-exit");
    // Two assistant lines: the tool_calls line counts its calls, the content
    // line counts one message and becomes the final message.
    assert.equal(result.agentMessageCount, 1);
    assert.equal(result.toolCallCount, 1);
    assert.equal(result.failedToolItemCount, 0);
    assert.equal(result.finalMessage, "The echo printed hello.");
  });
});

test("a failed tool counts only on an explicit failure shape, never on error-looking text", async () => {
  // Print-mode failure marking was NOT observed in the spike, so the count is
  // deliberately conservative: only a tool result whose content parses as a
  // JSON object carrying status:"failed" or isError:true counts. Plain text
  // that merely looks like an error must not.
  const explicit = [
    JSON.stringify({ role: "assistant", tool_calls: [{ type: "function", id: "c1", function: { name: "Bash", arguments: "{}" } }] }),
    JSON.stringify({ role: "tool", tool_call_id: "c1", content: "{\"status\":\"failed\",\"error\":\"command not found\"}" }),
    JSON.stringify({ role: "assistant", content: "The command was not found." }),
  ].join("\n") + "\n";
  const fakeExplicit = fakeKimiExecInstall(explicit);
  await withFakeKimiExec(fakeExplicit, async () => {
    const result = await createSystemKimiExecProcess().run({
      command: process.platform === "win32" ? "kimi.exe" : "kimi",
      args: EXEC_ARGS, cwd: execWorkspace(), prompt: "bounded fake request",
    });
    assert.equal(result.failedToolItemCount, 1);
    assert.equal(result.toolCallCount, 1);
  });

  const errorLooking = [
    JSON.stringify({ role: "assistant", tool_calls: [{ type: "function", id: "c1", function: { name: "Bash", arguments: "{}" } }] }),
    JSON.stringify({ role: "tool", tool_call_id: "c1", content: "Error: command failed with exit code 1" }),
    JSON.stringify({ role: "assistant", content: "The output mentioned an error." }),
  ].join("\n") + "\n";
  const fakeText = fakeKimiExecInstall(errorLooking);
  await withFakeKimiExec(fakeText, async () => {
    const result = await createSystemKimiExecProcess().run({
      command: process.platform === "win32" ? "kimi.exe" : "kimi",
      args: EXEC_ARGS, cwd: execWorkspace(), prompt: "bounded fake request",
    });
    assert.equal(result.failedToolItemCount, 0, "error-looking plain text is not an observed failure shape");
  });
});

test("a malformed line marks the terminal event an error and freezes later evidence", async () => {
  const body = [
    JSON.stringify({ role: "assistant", content: "before the breakage" }),
    "this is not json",
    JSON.stringify({ role: "assistant", content: "after the breakage" }),
  ].join("\n") + "\n";
  const fake = fakeKimiExecInstall(body);
  await withFakeKimiExec(fake, async () => {
    const result = await createSystemKimiExecProcess().run({
      command: process.platform === "win32" ? "kimi.exe" : "kimi",
      args: EXEC_ARGS, cwd: execWorkspace(), prompt: "bounded fake request",
    });
    assert.equal(result.terminalEvent, "error");
    assert.equal(result.finalMessage, "before the breakage");
    assert.equal(result.agentMessageCount, 1, "evidence after the malformed line is frozen");
  });
});

test("an oversized line is dropped and nulls the final message; a later valid one recovers it", async () => {
  const giant = JSON.stringify({ role: "assistant", content: "x".repeat(2 * 1024 * 1024) }) + "\n";
  const first = JSON.stringify({ role: "assistant", content: "first small valid message" }) + "\n";
  const fakeDropped = fakeKimiExecInstall(first + giant);
  await withFakeKimiExec(fakeDropped, async () => {
    const result = await createSystemKimiExecProcess().run({
      command: process.platform === "win32" ? "kimi.exe" : "kimi",
      args: EXEC_ARGS, cwd: execWorkspace(), prompt: "bounded fake request",
    });
    assert.equal(result.exitCode, 0, "an oversized line must not kill the run");
    assert.equal(result.terminalEvent, "process-exit");
    assert.equal(result.finalMessage, null, "the dropped line may have been the true final message");
  });

  const recovered = JSON.stringify({ role: "assistant", content: "recovered final" }) + "\n";
  const fakeRecovered = fakeKimiExecInstall(giant + recovered);
  await withFakeKimiExec(fakeRecovered, async () => {
    const result = await createSystemKimiExecProcess().run({
      command: process.platform === "win32" ? "kimi.exe" : "kimi",
      args: EXEC_ARGS, cwd: execWorkspace(), prompt: "bounded fake request",
    });
    assert.equal(result.finalMessage, "recovered final", "a message genuinely later than the dropped line still wins");
  });
});

test("a non-zero exit code is preserved, and a missing final message stays null", async () => {
  const failing = fakeKimiExecInstall(PONG_TRANSCRIPT, { exitCode: 3 });
  await withFakeKimiExec(failing, async () => {
    const result = await createSystemKimiExecProcess().run({
      command: process.platform === "win32" ? "kimi.exe" : "kimi",
      args: EXEC_ARGS, cwd: execWorkspace(), prompt: "bounded fake request",
    });
    assert.equal(result.exitCode, 3);
    assert.equal(result.finalMessage, "PONG");
  });

  const noMessage = fakeKimiExecInstall(
    JSON.stringify({ role: "meta", type: "session.resume_hint", session_id: "x" }) + "\n",
  );
  await withFakeKimiExec(noMessage, async () => {
    const result = await createSystemKimiExecProcess().run({
      command: process.platform === "win32" ? "kimi.exe" : "kimi",
      args: EXEC_ARGS, cwd: execWorkspace(), prompt: "bounded fake request",
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.terminalEvent, "process-exit");
    assert.equal(result.finalMessage, null);
    assert.equal(result.agentMessageCount, 0);
  });
});

test("the fake child receives -p with the prompt appended after the args (wire pin)", async () => {
  const fake = fakeKimiExecInstall(PONG_TRANSCRIPT);
  await withFakeKimiExec(fake, async () => {
    const result = await createSystemKimiExecProcess().run({
      command: process.platform === "win32" ? "kimi.exe" : "kimi",
      args: EXEC_ARGS,
      cwd: execWorkspace(),
      prompt: "Reply with exactly PONG.",
    });
    assert.equal(result.exitCode, 0);
    // The argv the child actually received, never a helper's return value:
    // the composed prompt rides ONE argv element, and the wire carries the
    // observed print-mode flags and pinned model.
    assert.deepEqual(JSON.parse(readFileSync(fake.argvLog, "utf8")), [
      "--output-format", "stream-json", "-m", "kimi-code/kimi-for-coding",
      "-p", "Reply with exactly PONG.",
    ]);
  });
});

test("a prompt past 24,000 chars is refused before spawn", async () => {
  const fake = fakeKimiExecInstall(PONG_TRANSCRIPT);
  await withFakeKimiExec(fake, async () => {
    await assert.rejects(
      () => createSystemKimiExecProcess().run({
        command: process.platform === "win32" ? "kimi.exe" : "kimi",
        args: EXEC_ARGS,
        cwd: execWorkspace(),
        prompt: "x".repeat(24_001),
      }),
      (error: unknown) => error instanceof KimiExecProcessError &&
        error.code === "KIMI_PROMPT_TOO_LONG" &&
        error.failure === "process" &&
        error.killConfirmed === true,
    );
    assert.equal(existsSync(fake.argvLog), false, "the fake child never ran");
  });
});

test("an unresolvable kimi command rejects with a precise spawn code", async () => {
  const emptyBin = mkdtempSync(join(tmpdir(), "cairn-kimi-spawnfail-bin-"));
  const fake: FakeKimiExec = {
    bin: emptyBin,
    home: mkdtempSync(join(tmpdir(), "cairn-kimi-spawnfail-home-")),
    localAppData: mkdtempSync(join(tmpdir(), "cairn-kimi-spawnfail-lad-")),
    argvLog: join(emptyBin, "argv.json"),
  };
  await withFakeKimiExec(fake, async () => {
    await assert.rejects(
      () => createSystemKimiExecProcess().run({
        command: process.platform === "win32" ? "kimi.exe" : "kimi",
        args: EXEC_ARGS, cwd: execWorkspace(), prompt: "bounded fake request",
      }),
      (error: unknown) => error instanceof KimiExecProcessError &&
        error.code === "KIMI_EXEC_SPAWN_FAILED" && error.debugPath === null,
    );
  });
});

test("a silent kimi child is killed by the inactivity timer with a precise rejection", async () => {
  const fake = fakeKimiExecInstall(null);
  await withFakeKimiExec(fake, async () => {
    const started = Date.now();
    await assert.rejects(
      () => createSystemKimiExecProcess({ inactivityMs: 400, absoluteMs: 60_000 }).run({
        command: process.platform === "win32" ? "kimi.exe" : "kimi",
        args: EXEC_ARGS, cwd: execWorkspace(), prompt: "bounded fake request",
      }),
      (error: unknown) => isKimiExecTimeoutError(error) &&
        error.code === "KIMI_EXEC_TIMED_OUT" && error.timeoutKind === "inactivity",
    );
    assert.ok(Date.now() - started < 30_000, "the run must settle promptly after the kill, not hang");
  });
});

test("a chattering kimi child is killed by the absolute cap", async () => {
  const fake = fakeKimiExecInstall(null, { chatter: true });
  await withFakeKimiExec(fake, async () => {
    await assert.rejects(
      () => createSystemKimiExecProcess({ inactivityMs: 60_000, absoluteMs: 500 }).run({
        command: process.platform === "win32" ? "kimi.exe" : "kimi",
        args: EXEC_ARGS, cwd: execWorkspace(), prompt: "bounded fake request",
      }),
      (error: unknown) => isKimiExecTimeoutError(error) && error.timeoutKind === "absolute",
    );
  });
});

test("a pre-aborted signal cancels before spawn, kill confirmed by construction", async () => {
  const fake = fakeKimiExecInstall(PONG_TRANSCRIPT);
  await withFakeKimiExec(fake, async () => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      () => createSystemKimiExecProcess().run({
        command: process.platform === "win32" ? "kimi.exe" : "kimi",
        args: EXEC_ARGS, cwd: execWorkspace(), prompt: "bounded fake request",
      }, controller.signal),
      (error: unknown) => isKimiExecCancelledError(error) &&
        error.code === "KIMI_EXEC_CANCELLED" && error.killConfirmed === true,
    );
    assert.equal(existsSync(fake.argvLog), false, "the fake child never ran");
  });
});

test("aborting mid-run kills the kimi child and rejects as cancelled", async () => {
  const fake = fakeKimiExecInstall(null);
  await withFakeKimiExec(fake, async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 200);
    await assert.rejects(
      () => createSystemKimiExecProcess({ inactivityMs: 60_000, absoluteMs: 60_000 }).run({
        command: process.platform === "win32" ? "kimi.exe" : "kimi",
        args: EXEC_ARGS, cwd: execWorkspace(), prompt: "bounded fake request",
      }, controller.signal),
      (error: unknown) => isKimiExecCancelledError(error) && error.code === "KIMI_EXEC_CANCELLED",
    );
  });
});

test("raw stdout and stderr stream to redacted kimi-* debug copies outside the project", async () => {
  const token = "sk-kimi-debug-must-be-redacted";
  const fake = fakeKimiExecInstall(PONG_TRANSCRIPT, { stderr: `provider stderr with ${token} inside\n` });
  await withFakeKimiExec(fake, async () => {
    const result = await createSystemKimiExecProcess().run({
      command: process.platform === "win32" ? "kimi.exe" : "kimi",
      args: EXEC_ARGS, cwd: execWorkspace(), prompt: "bounded fake request",
    });
    assert.equal(result.terminalEvent, "process-exit");
    const debugDir = join(fake.localAppData, "Cairn", "debug");
    const files = readdirSync(debugDir);
    assert.ok(files.some((name) => /^kimi-.*\.jsonl$/.test(name)), `expected a kimi-*.jsonl copy, saw ${files}`);
    assert.ok(files.some((name) => /^kimi-.*\.stderr\.log$/.test(name)), `expected a kimi-*.stderr.log copy, saw ${files}`);
    const contents = files.map((name) => readFileSync(join(debugDir, name), "utf8")).join("\n---\n");
    // The meta line is ignored for results but retained in the debug copy.
    assert.match(contents, /session\.resume_hint/);
    assert.match(contents, /provider stderr with sk-\[redacted\] inside/);
    assert.doesNotMatch(contents, new RegExp(token));
  });
});

// ---------------------------------------------------------------------------
// Plan Task 3 — disclosure, authorization, the adapter factory. These tests
// never spawn: the process seam is an injected kind:"fake" runner, and the
// pins are on the request handed to it and the bytes the owner confirms.
// ---------------------------------------------------------------------------

function kimiContract(details = ""): AdapterTaskContract {
  return {
    version: "cairn-serial-task/v2",
    taskNumber: 33,
    requestedOutcome: "Add one visible result",
    details,
    requestedOutcomeSha256: "f".repeat(64),
    supportedOutcome: "Prepare one fake Kimi exec request.",
    lane: "Standard",
    route: {
      adapterId: KIMI_EXEC_ADAPTER_ID,
      adapterLabel: "Kimi Code CLI",
      provider: KIMI_EXEC_PROVIDER,
      model: KIMI_EXEC_MODEL,
      reason: "Kimi Code CLI is installed and signed in.",
    },
    ownedRecords: ["docs/ai-work/tasks/033-brief.md", "docs/ai-work/tasks/033-report.md", "docs/ai-work/LOG.md"],
    protectedGit: { head: "a".repeat(40), dirty: false, staged: false },
    checks: ["Stop before a real model call."],
    stopConditions: ["A real process would start."],
  };
}

function fakeKimiProcess(result: KimiExecProcessResult, requests?: KimiExecRequest[]): KimiExecProcess {
  return {
    kind: "fake",
    async run(request) {
      requests?.push(request);
      return result;
    },
  };
}

const KIMI_CONNECTED_OAUTH = { installed: true, connected: true, billing: "oauth" as const };

test("the Kimi adapter descriptor names provider, model, and priority 90", () => {
  const workspace = join(tmpdir(), "cairn-kimi-descriptor-ws");
  const adapter = createKimiExecAdapter(workspace, KIMI_CONNECTED_OAUTH);
  assert.deepEqual(adapter.descriptor, {
    id: "kimi-exec",
    label: "Kimi Code CLI",
    provider: "Moonshot AI",
    model: "kimi-code/kimi-for-coding",
    connected: true,
    capabilities: ["serial-task"],
    priority: 90,
  });
  const disconnected = createKimiExecAdapter(workspace, { installed: true, connected: false, billing: "unknown" });
  assert.equal(disconnected.descriptor.connected, false);
});

test("the disclosure byte-pins both billing wordings and binds outcome plus details", () => {
  const workspace = join(tmpdir(), "cairn-kimi-disclosure-ws");
  const oauth = kimiExecDisclosure(workspace, "oauth", "Add one visible result", "Word counts: 74");
  assert.deepEqual(oauth, {
    provider: KIMI_EXEC_PROVIDER,
    model: KIMI_EXEC_MODEL,
    project: workspace,
    task: "Add one visible result\n\nDetails (verbatim):\nWord counts: 74",
    data: KIMI_EXEC_DATA_SCOPE,
    quota: KIMI_EXEC_QUOTA_OAUTH,
  });
  // The membership wording is the spike's source=oauth truth.
  assert.match(oauth.quota, /membership this CLI is signed into/);
  assert.match(oauth.quota, /Exactly one ephemeral Kimi Code CLI process/);
  assert.match(oauth.quota, /no retry, resume/);
  assert.match(oauth.quota, /cannot see the remaining quota/);

  // Anything not observed as source=oauth gets the honest generic floor.
  for (const billing of ["other", "unknown"] as const) {
    const generic = kimiExecDisclosure(workspace, billing, "Add one visible result");
    assert.equal(generic.quota, KIMI_EXEC_QUOTA_GENERIC);
    assert.equal(generic.task, "Add one visible result", "no details, no details block");
    assert.match(generic.quota, /the account this CLI is signed into/);
    assert.match(generic.quota, /cannot tell which billing applies/);
    assert.doesNotMatch(generic.quota, /membership/);
  }

  // The data scope names the second at-rest copy the spike observed.
  assert.match(KIMI_EXEC_DATA_SCOPE, /~\/\.kimi-code\/sessions\//);
  assert.match(KIMI_EXEC_DATA_SCOPE, /static deny rules/);
  // The adapter's own seam re-derives the same card from its status.
  const adapter = createKimiExecAdapter(workspace, KIMI_CONNECTED_OAUTH);
  assert.deepEqual(adapter.disclosure?.("Add one visible result", "Word counts: 74"), oauth);
});

test("the adapter stops before a real call without an authorization, with the shared boundary code", async () => {
  const workspace = join(tmpdir(), "cairn-kimi-boundary-ws");
  let calls = 0;
  const fake: KimiExecProcess = {
    kind: "fake",
    async run() {
      calls += 1;
      throw new Error("must not run");
    },
  };
  const adapter = createKimiExecAdapter(workspace, KIMI_CONNECTED_OAUTH, undefined, fake);
  await assert.rejects(
    () => adapter.run(kimiContract()),
    (error: unknown) => error instanceof KimiExecModelCallBoundaryError &&
      error.code === REAL_MODEL_CALL_NOT_AUTHORIZED,
  );
  assert.equal(calls, 0, "no process was started");
});

test("authorization refuses mismatched outcome, details, or billing", async () => {
  const workspace = join(tmpdir(), "cairn-kimi-mismatch-ws");
  let calls = 0;
  const fake: KimiExecProcess = {
    kind: "fake",
    async run() {
      calls += 1;
      throw new Error("must not run");
    },
  };

  // A different outcome.
  const wrongOutcome = createKimiExecAdapter(
    workspace, KIMI_CONNECTED_OAUTH,
    authorizeKimiExec(workspace, "oauth", "A different task"), fake,
  );
  await assert.rejects(() => wrongOutcome.run(kimiContract()), /REAL_MODEL_CALL_NOT_AUTHORIZED/);

  // An outcome-only confirmation cannot dispatch a details-bearing contract.
  const outcomeOnly = createKimiExecAdapter(
    workspace, KIMI_CONNECTED_OAUTH,
    authorizeKimiExec(workspace, "oauth", "Add one visible result"), fake,
  );
  await assert.rejects(() => outcomeOnly.run(kimiContract("Word counts: 74")), /REAL_MODEL_CALL_NOT_AUTHORIZED/);

  // A card confirmed under one billing wording cannot run under another:
  // what ran is what the owner read.
  const wrongBilling = createKimiExecAdapter(
    workspace, { installed: true, connected: true, billing: "other" },
    authorizeKimiExec(workspace, "oauth", "Add one visible result"), fake,
  );
  await assert.rejects(() => wrongBilling.run(kimiContract()), /REAL_MODEL_CALL_NOT_AUTHORIZED/);

  assert.equal(calls, 0, "no process was started for any mismatch");
});

test("one authorized fake verifies the request at the seam and translates the result", async () => {
  const workspace = join(tmpdir(), "cairn-kimi-authorized-ws");
  const requests: KimiExecRequest[] = [];
  const fake = fakeKimiProcess({
    exitCode: 0,
    terminalEvent: "process-exit",
    agentMessageCount: 2,
    toolCallCount: 3,
    failedToolItemCount: 1,
    finalMessage: "Done.\n\n```cairn-claims\n{ \"disposition\": \"DONE\" }\n```",
  }, requests);
  const adapter = createKimiExecAdapter(
    workspace, KIMI_CONNECTED_OAUTH,
    authorizeKimiExec(workspace, "oauth", "Add one visible result", "Word counts: 74"),
    fake,
  );
  const result = await adapter.run(kimiContract("Word counts: 74"));

  assert.equal(requests.length, 1);
  assert.equal(requests[0].command, process.platform === "win32" ? "kimi.exe" : "kimi");
  assert.equal(requests[0].cwd, workspace);
  // The prompt is NOT in args: it rides separately and is appended at spawn.
  assert.deepEqual(requests[0].args, ["--output-format", "stream-json", "-m", "kimi-code/kimi-for-coding"]);
  assert.doesNotMatch(requests[0].args.join(" "), /Add one visible result|retry|resume|fallback|scheduler/);
  const prompt = requests[0].prompt;
  assert.match(prompt, /You are running as Kimi Code CLI in print mode\./);
  assert.match(prompt, /Requested visible outcome: Add one visible result/);
  assert.match(prompt, /Details from the owner \(use verbatim, do not restate\):/);
  assert.match(prompt, /Word counts: 74/);
  // The spec's sharpened lines: the CLI has subagents and background tasks,
  // and one serial call means one.
  assert.match(prompt, /[Dd]o not (start|use|spawn)[^\n]*subagents?[^\n]*background tasks?|subagents? or background tasks?/);
  assert.match(prompt, /Work serially\. Do not delegate/);
  // The codex apply_patch line is gone; the claims fence and the record
  // rules are unchanged.
  assert.doesNotMatch(prompt, /apply_patch/);
  assert.match(prompt, /exactly one fenced block labeled cairn-claims/);
  assert.match(prompt, /Do not write any file under docs\/ai-work/);
  assert.match(prompt, /Do not run git add, git commit, or otherwise modify \.git/);
  assert.match(prompt, /owner already confirmed Cairn's displayed provider, model, project, data scope, and one-call quota/i);

  assert.deepEqual(result, {
    kind: "worker-result/v1",
    taskNumber: 33,
    requestedOutcomeSha256: "f".repeat(64),
    status: "completed",
    claimsText: "Done.\n\n```cairn-claims\n{ \"disposition\": \"DONE\" }\n```",
    evidence: {
      exitCode: 0,
      agentMessageCount: 2,
      toolCallCount: 3,
      failedToolItemCount: 1,
    },
  });
});

test("run() translates non-zero exit, missing final message, and terminal error as failed", async () => {
  const workspace = join(tmpdir(), "cairn-kimi-failed-ws");
  const authorization = authorizeKimiExec(workspace, "oauth", "Add one visible result");
  const base = {
    agentMessageCount: 1,
    toolCallCount: 0,
    failedToolItemCount: 0,
  };
  const cases: { name: string; result: KimiExecProcessResult }[] = [
    { name: "non-zero exit", result: { ...base, exitCode: 1, terminalEvent: "process-exit", finalMessage: "some message" } },
    { name: "missing final message", result: { ...base, exitCode: 0, terminalEvent: "process-exit", finalMessage: null } },
    // A malformed line was seen: the stream was not fully understood, so an
    // exit-0 run with a retained message is still not a completion.
    { name: "terminal error", result: { ...base, exitCode: 0, terminalEvent: "error", finalMessage: "some message" } },
  ];
  for (const { name, result: processResult } of cases) {
    const adapter = createKimiExecAdapter(workspace, KIMI_CONNECTED_OAUTH, authorization, fakeKimiProcess(processResult));
    const translated = await adapter.run(kimiContract());
    assert.equal(translated.status, "failed", name);
  }
});

test("routeTask sorts codex (100) before kimi (90) and honors an override to kimi", () => {
  const workspace = join(tmpdir(), "cairn-kimi-routing-ws");
  const codex = createCodexExecAdapter(workspace, { installed: true, connected: true });
  const kimi = createKimiExecAdapter(workspace, KIMI_CONNECTED_OAUTH);
  const request = { outcome: "Add one visible result", capability: "serial-task" as const };

  const sorted = routeTask(request, [kimi, codex]);
  assert.equal(sorted.status, "ready");
  if (sorted.status !== "ready") return;
  assert.equal(sorted.recommended.id, "codex-exec", "priority is fallback ordering: codex first");
  assert.deepEqual(sorted.candidates.map((candidate) => candidate.id), ["codex-exec", "kimi-exec"]);

  // Decision 6: with two candidates the owner always chooses; the choice
  // rides the existing override mechanism.
  const overridden = routeTask(request, [kimi, codex], "kimi-exec");
  assert.equal(overridden.status, "ready");
  if (overridden.status !== "ready") return;
  assert.equal(overridden.recommended.id, "kimi-exec");

  // Single-candidate behavior is unchanged: kimi alone routes to kimi.
  const alone = routeTask(request, [kimi]);
  assert.equal(alone.status, "ready");
  if (alone.status !== "ready") return;
  assert.equal(alone.recommended.id, "kimi-exec");
});
