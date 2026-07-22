import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  authorizeCodexExec,
  CODEX_EXEC_DATA_SCOPE,
  CODEX_EXEC_MODEL,
  CODEX_EXEC_QUOTA,
  CodexExecModelCallBoundaryError,
  createCodexExecAdapter,
  detectCodexExecStatus,
  type CodexExecProcess,
  type CodexExecRequest,
  type CodexStatusProbe,
  type CodexStatusProbeResult,
} from "../src/codex.js";
import type { AdapterTaskContract } from "../src/routing.js";

const SECRET_SENTINEL = "sk-secret-auth-method-account-detail";

class FakeProbe implements CodexStatusProbe {
  readonly calls: { args: readonly string[]; cwd: string }[] = [];
  readonly rawOutputThatMustStayPrivate = SECRET_SENTINEL;

  constructor(private readonly results: CodexStatusProbeResult[]) {}

  async run(args: readonly string[], cwd: string): Promise<CodexStatusProbeResult> {
    this.calls.push({ args: [...args], cwd });
    return this.results.shift() ?? "failed";
  }
}

test("system readiness ignores a workspace-local Codex command", async () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-codex-shadow-"));
  const command = join(root, process.platform === "win32" ? "codex.cmd" : "codex");
  writeFileSync(command, process.platform === "win32" ? "@exit /b 0\r\n" : "#!/bin/sh\nexit 0\n");
  if (process.platform !== "win32") chmodSync(command, 0o755);
  const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";
  const previous = process.env[pathKey];
  process.env[pathKey] = root;
  try {
    assert.deepEqual(await detectCodexExecStatus(root), { installed: false, connected: false });
  } finally {
    if (previous === undefined) delete process.env[pathKey];
    else process.env[pathKey] = previous;
  }
});

function contract(): AdapterTaskContract {
  return {
    version: "cairn-serial-task/v1",
    taskNumber: 33,
    requestedOutcome: "Add one visible result",
    requestedOutcomeSha256: "f".repeat(64),
    supportedOutcome: "Prepare one fake Codex Exec request.",
    lane: "Standard",
    route: {
      adapterId: "codex-exec",
      adapterLabel: "Codex Exec",
      provider: "OpenAI",
      model: CODEX_EXEC_MODEL,
      reason: "Codex Exec is installed and connected.",
    },
    ownedRecords: ["docs/ai-work/tasks/033-brief.md", "docs/ai-work/tasks/033-report.md", "docs/ai-work/LOG.md"],
    protectedGit: { head: "a".repeat(40), dirty: false, staged: false },
    checks: ["Stop before a real model call."],
    stopConditions: ["A real process would start."],
  };
}

test("Codex readiness keeps only installed and connected booleans", async () => {
  const root = resolve("codex-status-fixture");
  const missing = new FakeProbe(["not-found"]);
  assert.deepEqual(await detectCodexExecStatus(root, missing), { installed: false, connected: false });
  assert.deepEqual(missing.calls.map((call) => call.args), [["--version"]]);

  const disconnected = new FakeProbe(["success", "failed"]);
  assert.deepEqual(await detectCodexExecStatus(root, disconnected), { installed: true, connected: false });
  assert.deepEqual(disconnected.calls.map((call) => call.args), [["--version"], ["login", "status"]]);

  const connected = new FakeProbe(["success", "success"]);
  const status = await detectCodexExecStatus(root, connected);
  assert.deepEqual(status, { installed: true, connected: true });
  assert.deepEqual(Object.keys(status).sort(), ["connected", "installed"]);
  assert.doesNotMatch(JSON.stringify(status), new RegExp(SECRET_SENTINEL));
});

test("the production adapter stops before starting a real Codex Exec process", async () => {
  const adapter = createCodexExecAdapter(resolve("codex-production-fixture"), { installed: true, connected: true });
  assert.equal(adapter.kind, "codex-exec");
  assert.deepEqual(adapter.descriptor, {
    id: "codex-exec",
    label: "Codex Exec",
    provider: "OpenAI",
    model: CODEX_EXEC_MODEL,
    connected: true,
    capabilities: ["serial-task"],
    priority: 100,
  });
  await assert.rejects(
    () => adapter.run(contract()),
    (error) => error instanceof CodexExecModelCallBoundaryError && error.code === "REAL_MODEL_CALL_NOT_AUTHORIZED",
  );
});

test("a mismatched confirmation cannot cross the process seam", async () => {
  const workspace = resolve("codex-mismatched-confirmation");
  let calls = 0;
  const fake: CodexExecProcess = {
    kind: "fake",
    async run() {
      calls += 1;
      throw new Error("must not run");
    },
  };
  const mismatched = authorizeCodexExec(workspace, "A different task");
  const adapter = createCodexExecAdapter(
    workspace,
    { installed: true, connected: true },
    mismatched,
    fake,
  );
  await assert.rejects(() => adapter.run(contract()), /REAL_MODEL_CALL_NOT_AUTHORIZED/);
  assert.equal(calls, 0);
});

test("one authorized fake verifies the real-call request without a model", async () => {
  const workspace = resolve("codex-fake-workspace");
  const requests: CodexExecRequest[] = [];
  const fake: CodexExecProcess = {
    kind: "fake",
    async run(request) {
      requests.push(request);
      return {
        exitCode: 0,
        terminalEvent: "turn.completed",
        inputTokens: 100,
        cachedInputTokens: 20,
        outputTokens: 30,
        reasoningOutputTokens: 10,
      };
    },
  };
  const authorization = authorizeCodexExec(workspace, "Add one visible result");
  assert.deepEqual(authorization, {
    approved: true,
    provider: "OpenAI",
    model: CODEX_EXEC_MODEL,
    project: workspace,
    task: "Add one visible result",
    data: CODEX_EXEC_DATA_SCOPE,
    quota: CODEX_EXEC_QUOTA,
  });
  const adapter = createCodexExecAdapter(workspace, { installed: true, connected: true }, authorization, fake);
  const result = await adapter.run(contract());

  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].args, [
    "--ask-for-approval",
    "on-request",
    "exec",
    "--ephemeral",
    "--model",
    CODEX_EXEC_MODEL,
    "--cd",
    workspace,
    "--sandbox",
    "workspace-write",
    "--disable",
    "multi_agent",
    "--ignore-user-config",
    "--json",
    "-",
  ]);
  assert.equal(requests[0].command, process.platform === "win32" ? "codex.exe" : "codex");
  assert.equal(requests[0].cwd, workspace);
  assert.match(requests[0].stdin, /Requested visible outcome: Add one visible result/);
  assert.match(requests[0].stdin, /Do not run git add, git commit, or otherwise modify \.git/);
  assert.match(requests[0].stdin, /Cairn owns the exact-path local commit/);
  assert.doesNotMatch(requests[0].args.join(" "), /Add one visible result|retry|resume|fallback|scheduler/);
  assert.deepEqual(result, {
    kind: "codex-exec-result",
    taskNumber: 33,
    requestedOutcomeSha256: "f".repeat(64),
    processCount: 1,
    exitCode: 0,
    terminalEvent: "turn.completed",
    inputTokens: 100,
    cachedInputTokens: 20,
    outputTokens: 30,
    reasoningOutputTokens: 10,
    statement: "One Codex Exec process returned bounded completion evidence.",
  });
});
