import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import {
  CodexExecModelCallBoundaryError,
  createCodexExecAdapter,
  detectCodexExecStatus,
  type CodexExecFakeProcess,
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
      model: "Codex configured model",
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
    model: "Codex configured model",
    connected: true,
    capabilities: ["serial-task"],
    priority: 100,
  });
  await assert.rejects(
    () => adapter.run(contract()),
    (error) => error instanceof CodexExecModelCallBoundaryError && error.code === "REAL_MODEL_CALL_NOT_AUTHORIZED",
  );
});

test("one injected fake verifies the ephemeral workspace-scoped process request", async () => {
  const workspace = resolve("codex-fake-workspace");
  const requests: CodexExecRequest[] = [];
  const fake: CodexExecFakeProcess = {
    kind: "fake",
    async run(request) {
      requests.push(request);
      return { exitCode: 0 };
    },
  };
  const adapter = createCodexExecAdapter(workspace, { installed: true, connected: true }, fake);
  const result = await adapter.run(contract());

  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].args, [
    "exec",
    "--ephemeral",
    "--cd",
    workspace,
    "--sandbox",
    "workspace-write",
    "--ask-for-approval",
    "on-request",
    "--disable",
    "multi_agent",
    "--json",
    "-",
  ]);
  assert.equal(requests[0].command, "codex");
  assert.equal(requests[0].cwd, workspace);
  assert.match(requests[0].stdin, /Requested visible outcome: Add one visible result/);
  assert.doesNotMatch(requests[0].args.join(" "), /Add one visible result|retry|resume|fallback|scheduler/);
  assert.deepEqual(result, {
    kind: "codex-exec-fake-process-result",
    taskNumber: 33,
    requestedOutcomeSha256: "f".repeat(64),
    processCount: 1,
    exitCode: 0,
    statement: "A fake process verified one Codex Exec request; no real process or model call ran.",
  });
});
