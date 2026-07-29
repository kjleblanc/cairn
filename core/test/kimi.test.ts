import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import {
  detectKimiExecStatus,
  kimiExecConnectionReason,
  kimiExecStatusText,
  createSystemKimiAcpProbe,
  createSystemKimiProviderProbe,
  type KimiAcpProbe,
  type KimiProviderProbe,
  type KimiStatusProbe,
  type KimiStatusProbeResult,
} from "../src/kimi.js";

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
