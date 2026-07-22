import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendLogRow } from "../src/files.js";
import {
  authorizeCodexExec,
  CODEX_EXEC_MODEL,
  createCodexExecAdapter,
  type CodexExecProcess,
} from "../src/codex.js";
import { createOfflineDemoAdapter, type TaskAdapter } from "../src/routing.js";
import { runSerialTask } from "../src/serial.js";

const LOG_HEADER =
  "| Task | Date | Lane | Draft/Final | Outcome | Decision | One-line summary | Milestone moved? |\n" +
  "|---|---|---|---|---|---|---|---|\n";

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trimEnd();
}

function project(): string {
  const root = mkdtempSync(join(tmpdir(), "cairn-serial-test-"));
  mkdirSync(join(root, "docs", "ai-work", "tasks"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), [
    "# Project Contract",
    "",
    "Cairn Contract v3.0",
    "STATUS: ACTIVE",
    "PROJECT NAME: Serial fixture",
    "WHAT WE ARE BUILDING: a fixture",
    "WHO WILL USE IT: tests",
    "CURRENT MILESTONE: see a verified result",
    "",
  ].join("\n"));
  writeFileSync(join(root, "docs", "ai-work", "PROJECT.md"), "# Serial fixture\n");
  writeFileSync(join(root, "docs", "ai-work", "LOG.md"), LOG_HEADER);
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Cairn Test"]);
  git(root, ["config", "user.email", "cairn-test@example.invalid"]);
  git(root, ["add", "AGENTS.md", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md"]);
  git(root, ["commit", "-q", "-m", "fixture"]);
  return root;
}

function validResult(contract: Parameters<TaskAdapter["run"]>[0]) {
  return {
    kind: "offline-demo-result" as const,
    taskNumber: contract.taskNumber,
    requestedOutcomeSha256: contract.requestedOutcomeSha256,
    statement: "The offline route completed without attempting the requested product change." as const,
  };
}

test("normal mode stops at connection-required without writing records", async () => {
  const root = project();
  const before = git(root, ["status", "--porcelain=v1", "--untracked-files=all"]);
  const log = readFileSync(join(root, "docs", "ai-work", "LOG.md"), "utf8");
  const result = await runSerialTask(root, "Create a welcome page", { adapters: [] });
  assert.equal(result.status, "connection-required");
  assert.equal(git(root, ["status", "--porcelain=v1", "--untracked-files=all"]), before);
  assert.equal(readFileSync(join(root, "docs", "ai-work", "LOG.md"), "utf8"), log);
  assert.deepEqual(requireTaskNames(root), []);
});

test("a connected Codex Exec route records STOPPED before any real model call", async () => {
  const root = project();
  const result = await runSerialTask(root, "Improve Cairn safely", {
    adapters: [createCodexExecAdapter(root, { installed: true, connected: true })],
  });
  assert.equal(result.status, "stopped");
  if (result.status !== "stopped") return;
  assert.equal(result.reason, "REAL_MODEL_CALL_NOT_AUTHORIZED");
  assert.deepEqual(requireTaskNames(root), ["001-brief.md", "001-report.md"]);
  const brief = readFileSync(result.briefPath, "utf8");
  const report = readFileSync(result.reportPath, "utf8");
  const log = readFileSync(join(root, "docs", "ai-work", "LOG.md"), "utf8");
  assert.match(brief, /one confirmed real Codex Exec task/);
  assert.match(brief, /Provider: OpenAI/);
  assert.match(brief, new RegExp(`Model: ${CODEX_EXEC_MODEL}`));
  assert.match(report, /REAL_MODEL_CALL_NOT_AUTHORIZED/);
  assert.match(report, /real `codex exec` process was not started/i);
  assert.match(report, /no model was called/i);
  assert.doesNotMatch(report, /auth method|account detail|token/i);
  assert.match(log, /Codex Exec was installed and connected; Cairn stopped before the real process or model call/);
  assert.equal(result.activities.filter((activity) => activity.stage === "Run" && activity.state === "working").length, 1);
  assert.equal(result.activities.some((activity) => activity.stage === "Check"), false);
});

test("one authorized fake Codex process completes one verified serial task", async () => {
  const root = project();
  const beforeHead = git(root, ["rev-parse", "HEAD"]);
  let calls = 0;
  const fake: CodexExecProcess = {
    kind: "fake",
    async run() {
      calls += 1;
      writeFileSync(join(root, "visible.txt"), "model-authored result\n");
      writeFileSync(join(root, "docs", "ai-work", "tasks", "001-report.md"), [
        "# Task 001 report",
        "",
        "## Result",
        "",
        "Added the requested visible result and verified it.",
        "",
        "Milestone movement: **YES**",
        "",
        "Disposition: **DONE**",
        "",
      ].join("\n"));
      appendLogRow(root, {
        task: "001", date: "2026-07-21", lane: "Standard", mode: "Applied",
        outcome: "DONE", decision: "completed", summary: "Added and verified the visible result.", moved: "YES",
      });
      assert.equal(git(root, ["rev-parse", "HEAD"]), beforeHead);
      assert.equal(git(root, ["diff", "--cached", "--name-only"]), "");
      return {
        exitCode: 0,
        terminalEvent: "turn.completed",
        inputTokens: 200,
        cachedInputTokens: 50,
        outputTokens: 80,
        reasoningOutputTokens: 20,
      };
    },
  };
  const result = await runSerialTask(root, "Add one visible result", {
    adapters: [createCodexExecAdapter(
      root,
      { installed: true, connected: true },
      authorizeCodexExec(root, "Add one visible result"),
      fake,
    )],
  });

  assert.equal(calls, 1);
  assert.equal(result.status, "done");
  if (result.status !== "done") return;
  assert.equal(result.disposition, "DONE");
  assert.equal(result.route.recommended.model, CODEX_EXEC_MODEL);
  assert.equal(result.commit.status, "created");
  assert.notEqual(result.commit.hash, beforeHead);
  assert.equal(readFileSync(join(root, "visible.txt"), "utf8"), "model-authored result\n");
  assert.equal(git(root, ["status", "--porcelain=v1", "--untracked-files=all"]), "");
  assert.deepEqual(git(root, ["show", "--format=", "--name-only", "HEAD"]).split(/\r?\n/).filter(Boolean).sort(), [
    "docs/ai-work/LOG.md",
    "docs/ai-work/tasks/001-brief.md",
    "docs/ai-work/tasks/001-report.md",
    "visible.txt",
  ]);
  assert.match(result.reportText, /Disposition: \*\*DONE\*\*/);
  assert.match(result.activities.at(-1)?.detail ?? "", /real Codex Exec task completed/i);
});

test("an already-satisfied fake Codex task closes honestly without a product edit", async () => {
  const root = project();
  const beforeHead = git(root, ["rev-parse", "HEAD"]);
  const fake: CodexExecProcess = {
    kind: "fake",
    async run() {
      writeFileSync(join(root, "docs", "ai-work", "tasks", "001-report.md"), [
        "# Task 001 report", "", "The requested behavior was already present and its focused checks passed.", "",
        "Milestone movement: **NO**", "", "Disposition: **DONE**", "",
      ].join("\n"));
      appendLogRow(root, {
        task: "001", date: "2026-07-22", lane: "Standard", mode: "Applied",
        outcome: "DONE", decision: "completed", summary: "Verified the already-satisfied behavior without inventing a change.", moved: "NO",
      });
      return { exitCode: 0, terminalEvent: "turn.completed", inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, reasoningOutputTokens: 0 };
    },
  };
  const outcome = "Keep the existing verified behavior";
  const result = await runSerialTask(root, outcome, {
    adapters: [createCodexExecAdapter(root, { installed: true, connected: true }, authorizeCodexExec(root, outcome), fake)],
  });

  assert.equal(result.status, "done");
  if (result.status !== "done") return;
  assert.equal(result.row.moved, "NO");
  assert.equal(result.commit.status, "created");
  assert.notEqual(git(root, ["rev-parse", "HEAD"]), beforeHead);
  assert.deepEqual(git(root, ["show", "--format=", "--name-only", "HEAD"]).split(/\r?\n/).filter(Boolean).sort(), [
    "docs/ai-work/LOG.md",
    "docs/ai-work/tasks/001-brief.md",
    "docs/ai-work/tasks/001-report.md",
  ]);
  assert.equal(git(root, ["status", "--porcelain=v1", "--untracked-files=all"]), "");
});

test("a completed Codex process with no model records stops with a precise reason", async () => {
  const root = project();
  const beforeHead = git(root, ["rev-parse", "HEAD"]);
  let calls = 0;
  const fake: CodexExecProcess = {
    kind: "fake",
    async run() {
      calls += 1;
      return { exitCode: 0, terminalEvent: "turn.completed", inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, reasoningOutputTokens: 0 };
    },
  };
  const outcome = "Verify one existing behavior";
  const result = await runSerialTask(root, outcome, {
    adapters: [createCodexExecAdapter(root, { installed: true, connected: true }, authorizeCodexExec(root, outcome), fake)],
  });

  assert.equal(calls, 1);
  assert.equal(result.status, "stopped");
  if (result.status !== "stopped") return;
  assert.equal(result.reason, "MODEL_RECORDS_MISSING");
  assert.equal(git(root, ["rev-parse", "HEAD"]), beforeHead);
  assert.equal(git(root, ["diff", "--cached", "--name-only"]), "");
  assert.match(readFileSync(result.reportPath, "utf8"), /MODEL_RECORDS_MISSING/);
  assert.match(result.activities.at(-1)?.detail ?? "", /STOPPED — MODEL_RECORDS_MISSING/);
});

test("a dirty-start Codex result preserves owner work and remains uncommitted", async () => {
  const root = project();
  writeFileSync(join(root, "protected.txt"), "tracked\n");
  git(root, ["add", "--", "protected.txt"]);
  git(root, ["commit", "-q", "-m", "protected fixture"]);
  writeFileSync(join(root, "protected.txt"), "owner edit\n");
  const beforeHead = git(root, ["rev-parse", "HEAD"]);
  const beforeProtected = readFileSync(join(root, "protected.txt"), "utf8");
  const fake: CodexExecProcess = {
    kind: "fake",
    async run() {
      writeFileSync(join(root, "visible.txt"), "model-authored result\n");
      writeFileSync(join(root, "docs", "ai-work", "tasks", "001-report.md"), [
        "# Task 001 report", "", "Milestone movement: **YES**", "", "Disposition: **DONE**", "",
      ].join("\n"));
      appendLogRow(root, {
        task: "001", date: "2026-07-22", lane: "Standard", mode: "Applied",
        outcome: "DONE", decision: "completed", summary: "Added a visible result.", moved: "YES",
      });
      return { exitCode: 0, terminalEvent: "turn.completed", inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, reasoningOutputTokens: 0 };
    },
  };
  const result = await runSerialTask(root, "Add one visible result", {
    adapters: [createCodexExecAdapter(root, { installed: true, connected: true }, authorizeCodexExec(root, "Add one visible result"), fake)],
  });

  assert.equal(result.status, "done");
  if (result.status !== "done") return;
  assert.equal(result.commit.status, "skipped");
  assert.match(result.commit.reason, /protected starting work/i);
  assert.equal(git(root, ["rev-parse", "HEAD"]), beforeHead);
  assert.equal(readFileSync(join(root, "protected.txt"), "utf8"), beforeProtected);
  assert.equal(git(root, ["diff", "--cached", "--name-only"]), "");
  assert.equal(existsSync(join(root, "visible.txt")), true);
});

test("an unrelated task-record path prevents Cairn from committing model work", async () => {
  const root = project();
  const beforeHead = git(root, ["rev-parse", "HEAD"]);
  const fake: CodexExecProcess = {
    kind: "fake",
    async run() {
      writeFileSync(join(root, "visible.txt"), "model-authored result\n");
      writeFileSync(join(root, "docs", "ai-work", "tasks", "001-report.md"), [
        "# Task 001 report", "", "Milestone movement: **YES**", "", "Disposition: **DONE**", "",
      ].join("\n"));
      writeFileSync(join(root, "docs", "ai-work", "tasks", "999-report.md"), "unrelated task record\n");
      appendLogRow(root, {
        task: "001", date: "2026-07-22", lane: "Standard", mode: "Applied",
        outcome: "DONE", decision: "completed", summary: "Added a visible result.", moved: "YES",
      });
      return { exitCode: 0, terminalEvent: "turn.completed", inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, reasoningOutputTokens: 0 };
    },
  };
  const result = await runSerialTask(root, "Add one visible result", {
    adapters: [createCodexExecAdapter(root, { installed: true, connected: true }, authorizeCodexExec(root, "Add one visible result"), fake)],
  });

  assert.equal(result.status, "stopped");
  if (result.status !== "stopped") return;
  assert.equal(result.reason, "MODEL_RESULT_NOT_VERIFIED");
  assert.equal(git(root, ["rev-parse", "HEAD"]), beforeHead);
  assert.equal(git(root, ["diff", "--cached", "--name-only"]), "");
  assert.equal(existsSync(join(root, "docs", "ai-work", "tasks", "999-report.md")), true);
  assert.match(readFileSync(result.reportPath, "utf8"), /MODEL_RESULT_NOT_VERIFIED/);
});

test("the offline demonstration writes only one brief, report, and log row", async () => {
  const root = project();
  const result = await runSerialTask(root, "Create a welcome page", {
    adapters: [createOfflineDemoAdapter()],
  });
  assert.equal(result.status, "done");
  if (result.status !== "done") return;
  assert.equal(result.disposition, "DONE");
  assert.deepEqual(requireTaskNames(root), ["001-brief.md", "001-report.md"]);
  const brief = readFileSync(join(root, "docs", "ai-work", "tasks", "001-brief.md"), "utf8");
  const report = readFileSync(join(root, "docs", "ai-work", "tasks", "001-report.md"), "utf8");
  const log = readFileSync(join(root, "docs", "ai-work", "LOG.md"), "utf8");
  assert.match(brief, /Requested outcome: Create a welcome page/);
  assert.match(brief, /Provider: none/);
  assert.match(brief, /Model: none/);
  assert.doesNotMatch(brief, /approval|review agent|decision gate|continuation/i);
  assert.match(report, /Routing demonstration: \*\*verified\*\*/);
  assert.match(report, /Requested product change: \*\*not attempted\*\*/);
  assert.match(report, /Milestone movement: \*\*NO\*\*/);
  assert.equal(report.match(/^Disposition:/gm)?.length, 1);
  assert.match(log, /\| 001 \| .* \| Standard \| Applied \| DONE \| completed \| Offline routing demonstration verified; requested product change not attempted\. \| NO \|/);
  assert.equal(existsSync(join(root, "docs", "ai-work", "tasks", "001-approval.json")), false);
  assert.equal(existsSync(join(root, "docs", "ai-work", "tasks", "001-decision.json")), false);
  assert.equal(result.commit.status, "skipped");
  assert.deepEqual(
    git(root, ["status", "--porcelain=v1", "--untracked-files=all"]).split(/\r?\n/).filter(Boolean).sort(),
    [" M docs/ai-work/LOG.md", "?? docs/ai-work/tasks/001-brief.md", "?? docs/ai-work/tasks/001-report.md"].sort(),
  );
});

test("a second overlapping run is refused before it creates another task", async () => {
  const root = project();
  let release: (() => void) | undefined;
  const delayed: TaskAdapter = {
    ...createOfflineDemoAdapter(),
    async run(contract) {
      await new Promise<void>((resolve) => { release = resolve; });
      return validResult(contract);
    },
  };
  const first = runSerialTask(root, "First outcome", { adapters: [delayed] });
  while (!release) await new Promise((resolve) => setImmediate(resolve));
  await assert.rejects(
    () => runSerialTask(root, "Second outcome", { adapters: [createOfflineDemoAdapter()] }),
    /SERIAL_RUN_ACTIVE/,
  );
  release();
  assert.equal((await first).status, "done");
  assert.deepEqual(requireTaskNames(root), ["001-brief.md", "001-report.md"]);
});

test("historical STOPPED rows and unmatched records never block the next serial task", async () => {
  const root = project();
  appendLogRow(root, {
    task: "001", date: "2026-07-21", lane: "Standard", mode: "Applied",
    outcome: "STOPPED", decision: "stopped", summary: "first old blocker", moved: "NO",
  });
  appendLogRow(root, {
    task: "002", date: "2026-07-21", lane: "Standard", mode: "Applied",
    outcome: "STOPPED", decision: "stopped", summary: "second old blocker", moved: "NO",
  });
  writeFileSync(join(root, "docs", "ai-work", "tasks", "003-brief.md"), "# retained brief\n");
  writeFileSync(join(root, "docs", "ai-work", "tasks", "003-report.md"), "# retained report\n\nDisposition: **DONE**\n");

  const result = await runSerialTask(root, "Continue with one visible outcome", {
    adapters: [createOfflineDemoAdapter()],
  });

  assert.equal(result.status, "done");
  if (result.status === "done") assert.equal(result.taskNumber, 4);
  assert.deepEqual(requireTaskNames(root), [
    "003-brief.md", "003-report.md", "004-brief.md", "004-report.md",
  ]);
});

test("adapter failure closes once as STOPPED without retry or raw error text", async () => {
  const root = project();
  let calls = 0;
  const failed: TaskAdapter = {
    ...createOfflineDemoAdapter(),
    async run() {
      calls += 1;
      throw new Error("secret-looking provider detail");
    },
  };
  const result = await runSerialTask(root, "A bounded outcome", { adapters: [failed] });
  assert.equal(result.status, "stopped");
  assert.equal(calls, 1);
  const report = readFileSync(join(root, "docs", "ai-work", "tasks", "001-report.md"), "utf8");
  assert.match(report, /ADAPTER_FAILED/);
  assert.doesNotMatch(report, /secret-looking/);
  assert.equal(report.match(/^Disposition:/gm)?.length, 1);
  assert.equal(readFileSync(join(root, "docs", "ai-work", "LOG.md"), "utf8").match(/\| 001 \|/g)?.length, 1);
});

test("unexpected project mutation forces STOPPED and is retained as evidence", async () => {
  const root = project();
  const mutating: TaskAdapter = {
    ...createOfflineDemoAdapter(),
    async run(contract) {
      writeFileSync(join(root, "outside.txt"), "unexpected\n");
      return validResult(contract);
    },
  };
  const result = await runSerialTask(root, "A bounded outcome", { adapters: [mutating] });
  assert.equal(result.status, "stopped");
  if (result.status !== "stopped") return;
  assert.equal(result.reason, "PROTECTED_WORK_CHANGED");
  assert.equal(existsSync(join(root, "outside.txt")), true);
  assert.match(readFileSync(result.reportPath, "utf8"), /PROTECTED_WORK_CHANGED/);
});

test("pre-existing dirty and staged work stays byte-identical and prevents a record commit", async () => {
  const root = project();
  writeFileSync(join(root, "protected.txt"), "original\n");
  git(root, ["add", "protected.txt"]);
  git(root, ["commit", "-q", "-m", "protected"]);
  writeFileSync(join(root, "protected.txt"), "owner edit\n");
  writeFileSync(join(root, "staged.txt"), "owner staged\n");
  git(root, ["add", "staged.txt"]);
  const beforeProtected = readFileSync(join(root, "protected.txt"), "utf8");
  const beforeStaged = readFileSync(join(root, "staged.txt"), "utf8");
  const result = await runSerialTask(root, "A bounded outcome", {
    adapters: [createOfflineDemoAdapter()],
    commitRecords: true,
  });
  assert.equal(result.status, "done");
  if (result.status !== "done") return;
  assert.equal(result.commit.status, "skipped");
  assert.match(result.commit.reason, /staged/i);
  assert.equal(readFileSync(join(root, "protected.txt"), "utf8"), beforeProtected);
  assert.equal(readFileSync(join(root, "staged.txt"), "utf8"), beforeStaged);
  assert.deepEqual(git(root, ["diff", "--cached", "--name-only"]).split(/\r?\n/), ["staged.txt"]);
});

test("legacy .git/cairn state blocks without being read or changed", async () => {
  const root = project();
  const legacy = join(root, ".git", "cairn");
  mkdirSync(legacy);
  writeFileSync(join(legacy, "opaque.bin"), "do not parse or change\n");
  const before = readFileSync(join(legacy, "opaque.bin"), "utf8");
  await assert.rejects(
    () => runSerialTask(root, "A bounded outcome", { adapters: [createOfflineDemoAdapter()] }),
    /LEGACY_STATE_PRESENT/,
  );
  assert.equal(readFileSync(join(legacy, "opaque.bin"), "utf8"), before);
  assert.deepEqual(requireTaskNames(root), []);
});

test("runtime adapter results reject hidden fields", async () => {
  const root = project();
  const hidden: TaskAdapter = {
    ...createOfflineDemoAdapter(),
    async run(contract) {
      return { ...validResult(contract), hiddenPath: root } as never;
    },
  };
  const result = await runSerialTask(root, "A bounded outcome", { adapters: [hidden] });
  assert.equal(result.status, "stopped");
  if (result.status === "stopped") assert.equal(result.reason, "INVALID_ADAPTER_RESULT");
});

test("symbol, accessor, and Proxy adapter results fail closed without invoking accessors", async () => {
  for (const shape of ["symbol", "accessor", "proxy"] as const) {
    const root = project();
    let accessorCalls = 0;
    const adapter: TaskAdapter = {
      ...createOfflineDemoAdapter(),
      async run(contract) {
        const base = validResult(contract) as Record<PropertyKey, unknown>;
        if (shape === "symbol") base[Symbol("hidden")] = root;
        if (shape === "accessor") Object.defineProperty(base, "statement", {
          enumerable: true,
          get() { accessorCalls += 1; throw new Error("must not run"); },
        });
        if (shape === "proxy") return new Proxy(base, { ownKeys() { throw new Error("must stay redacted"); } }) as never;
        return base as never;
      },
    };
    const result = await runSerialTask(root, "A bounded outcome", { adapters: [adapter] });
    assert.equal(result.status, "stopped");
    if (result.status === "stopped") assert.equal(result.reason, "INVALID_ADAPTER_RESULT");
    assert.equal(accessorCalls, 0);
  }
});

test("the adapter contract is deeply frozen and contains no authority-bearing field", async () => {
  const root = project();
  let seen: unknown;
  const inspecting: TaskAdapter = {
    ...createOfflineDemoAdapter(),
    async run(contract) { seen = contract; return validResult(contract); },
  };
  assert.equal((await runSerialTask(root, "A bounded outcome", { adapters: [inspecting] })).status, "done");
  const text = JSON.stringify(seen);
  for (const forbidden of ["projectRoot", "shell", "process", "network", "credential", "tool", "delegate"]) {
    assert.doesNotMatch(text, new RegExp(forbidden, "i"));
  }
  const contract = seen as { route: object; protectedGit: object; ownedRecords: object; checks: object; stopConditions: object };
  assert.equal(Object.isFrozen(contract), true);
  assert.equal(Object.isFrozen(contract.route), true);
  assert.equal(Object.isFrozen(contract.protectedGit), true);
  assert.equal(Object.isFrozen(contract.ownedRecords), true);
  assert.equal(Object.isFrozen(contract.checks), true);
  assert.equal(Object.isFrozen(contract.stopConditions), true);
});

test("an exact record-only commit is available when the starting index is safe", async () => {
  const root = project();
  const before = git(root, ["rev-parse", "HEAD"]);
  const result = await runSerialTask(root, "A bounded outcome", {
    adapters: [createOfflineDemoAdapter()],
    commitRecords: true,
  });
  assert.equal(result.status, "done");
  if (result.status !== "done") return;
  assert.equal(result.commit.status, "created");
  assert.notEqual(result.commit.hash, before);
  assert.deepEqual(git(root, ["show", "--format=", "--name-only", "HEAD"]).split(/\r?\n/).filter(Boolean).sort(), [
    "docs/ai-work/LOG.md",
    "docs/ai-work/tasks/001-brief.md",
    "docs/ai-work/tasks/001-report.md",
  ]);
  assert.equal(git(root, ["status", "--porcelain=v1", "--untracked-files=all"]), "");
});

function requireTaskNames(root: string): string[] {
  const dir = join(root, "docs", "ai-work", "tasks");
  return existsSync(dir) ? readdirSync(dir).sort() : [];
}
