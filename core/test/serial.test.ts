import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { aliasedSpelling } from "./alias-spelling.js";
import { appendLogRow } from "../src/files.js";
import {
  authorizeCodexExec,
  CODEX_EXEC_MODEL,
  CodexExecCancelledError,
  CodexExecProcessError,
  CodexExecTimeoutError,
  createCodexExecAdapter,
  type CodexExecProcess,
} from "../src/codex.js";
import { createOfflineDemoAdapter, type TaskAdapter } from "../src/routing.js";
import { runSerialTask } from "../src/serial.js";
import { projectStatus } from "../src/steps.js";

const LOG_HEADER =
  "| Task | Date | Lane | Draft/Final | Outcome | Decision | One-line summary | Milestone moved? |\n" +
  "|---|---|---|---|---|---|---|---|\n";

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trimEnd();
}

function lockPath(root: string): string {
  const common = git(root, ["rev-parse", "--git-common-dir"]);
  return join(resolve(root, common), "cairn-run.lock");
}

function project(): string {
  const root = mkdtempSync(join(tmpdir(), "cairn-serial-test-"));
  mkdirSync(join(root, "docs", "ai-work", "tasks"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), [
    "# Project Contract",
    "",
    "Cairn Contract v0.0.1",
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
    kind: "worker-result/v1" as const,
    taskNumber: contract.taskNumber,
    requestedOutcomeSha256: contract.requestedOutcomeSha256,
    status: "completed" as const,
    claimsText: null,
    evidence: {},
  };
}

// Task 048 (the inversion): the worker authors no record; it speaks its account
// through exactly one cairn-claims fence in its final message. Cairn parses that
// fence and authors the report and log row itself.
function claimsFence(claims: Record<string, unknown>): string {
  return ["Done.", "", "```cairn-claims", JSON.stringify(claims), "```"].join("\n");
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

test("a process failure names its code and debug path in the stop record", async () => {
  // Task 004 stopped with a bare ADAPTER_FAILED and no retained cause; the
  // stop record must now carry the precise process code and the local debug
  // evidence path.
  const root = project();
  const failing: CodexExecProcess = {
    kind: "fake",
    async run() {
      throw new CodexExecProcessError("CODEX_EXEC_STDIN_FAILED", "C:\\Users\\owner\\AppData\\Local\\Cairn\\debug\\codex-run.jsonl");
    },
  };
  const result = await runSerialTask(root, "Improve Cairn safely", {
    adapters: [createCodexExecAdapter(root, { installed: true, connected: true }, authorizeCodexExec(root, "Improve Cairn safely"), failing)],
  });
  assert.equal(result.status, "stopped");
  if (result.status !== "stopped") return;
  assert.equal(result.reason, "ADAPTER_FAILED");
  const report = readFileSync(result.reportPath, "utf8");
  assert.match(report, /CODEX_EXEC_STDIN_FAILED/);
  assert.match(report, /codex-run\.jsonl/);
  assert.ok(
    result.activities.some((activity) => activity.detail.includes("CODEX_EXEC_STDIN_FAILED")),
    "the stop activity names the precise process failure code",
  );
});

test("a timed-out worker closes as ADAPTER_TIMED_OUT with the paid-call truth", async () => {
  const root = project();
  const wedged: CodexExecProcess = {
    kind: "fake",
    async run() {
      // A confirmed kill (the child closed): the run lock releases as today.
      throw new CodexExecTimeoutError("inactivity", "C:\\Users\\owner\\AppData\\Local\\Cairn\\debug\\codex-wedged.jsonl", true);
    },
  };
  const result = await runSerialTask(root, "Improve Cairn safely", {
    adapters: [createCodexExecAdapter(root, { installed: true, connected: true }, authorizeCodexExec(root, "Improve Cairn safely"), wedged)],
  });
  assert.equal(result.status, "stopped");
  if (result.status !== "stopped") return;
  assert.equal(result.reason, "ADAPTER_TIMED_OUT");
  const report = readFileSync(result.reportPath, "utf8");
  assert.match(report, /CODEX_EXEC_TIMED_OUT/);
  assert.match(report, /codex-wedged\.jsonl/);
  assert.match(report, /already spent/);
});

test("an owner abort closes as CANCELLED_BY_OWNER with evidence retained", async () => {
  const root = project();
  const controller = new AbortController();
  const cancellable: CodexExecProcess = {
    kind: "fake",
    async run(_request, signal) {
      writeFileSync(join(root, "partial.txt"), "the worker had already begun\n");
      controller.abort();
      assert.equal(signal?.aborted, true, "the abort signal must reach the process seam");
      // A started, then confirmed-killed process: a non-null debug path marks
      // that the process actually ran, so the "already spent" sentence stays.
      throw new CodexExecCancelledError("C:\\Users\\owner\\AppData\\Local\\Cairn\\debug\\codex-cancel.jsonl", true);
    },
  };
  const result = await runSerialTask(root, "Improve Cairn safely", {
    adapters: [createCodexExecAdapter(root, { installed: true, connected: true }, authorizeCodexExec(root, "Improve Cairn safely"), cancellable)],
    signal: controller.signal,
  });
  assert.equal(result.status, "stopped");
  if (result.status !== "stopped") return;
  assert.equal(result.reason, "CANCELLED_BY_OWNER");
  assert.equal(existsSync(join(root, "partial.txt")), true, "workspace evidence is retained, never cleaned");
  assert.match(readFileSync(result.reportPath, "utf8"), /already spent/);
});

test("a pre-spawn owner cancel spent nothing, so the report omits the already-spent sentence (FIX 5a)", async () => {
  const root = project();
  const controller = new AbortController();
  const preSpawnCancel: CodexExecProcess = {
    kind: "fake",
    async run() {
      // Nothing started: no workspace file, and a null debug path — the same
      // shape createSystemCodexExecProcess produces when the signal is already
      // aborted before spawn. The kill is confirmed (there is no child).
      throw new CodexExecCancelledError(null, true);
    },
  };
  const result = await runSerialTask(root, "Improve Cairn safely", {
    adapters: [createCodexExecAdapter(root, { installed: true, connected: true }, authorizeCodexExec(root, "Improve Cairn safely"), preSpawnCancel)],
    signal: controller.signal,
  });
  assert.equal(result.status, "stopped");
  if (result.status !== "stopped") return;
  assert.equal(result.reason, "CANCELLED_BY_OWNER");
  const report = readFileSync(result.reportPath, "utf8");
  assert.doesNotMatch(report, /already spent/, "a pre-spawn cancel never started a paid process");
  // A confirmed kill releases the lock as normal: a second run must proceed.
  assert.equal(existsSync(lockPath(root)), false, "a confirmed-kill stop releases the run lock");
});

test("an unconfirmed-kill timeout keeps the run lock so the next task is refused (FIX 2)", async () => {
  const root = project();
  const unconfirmed: CodexExecProcess = {
    kind: "fake",
    async run() {
      // The watchdog fired and the kill was issued, but the child never closed:
      // killConfirmed=false. A live orphan may still be writing the workspace.
      throw new CodexExecTimeoutError("inactivity", "C:\\Users\\owner\\AppData\\Local\\Cairn\\debug\\codex-orphan.jsonl", false);
    },
  };
  const result = await runSerialTask(root, "Improve Cairn safely", {
    adapters: [createCodexExecAdapter(root, { installed: true, connected: true }, authorizeCodexExec(root, "Improve Cairn safely"), unconfirmed)],
  });
  assert.equal(result.status, "stopped");
  if (result.status !== "stopped") return;
  assert.equal(result.reason, "ADAPTER_TIMED_OUT");
  // The run lock is deliberately left in place.
  assert.equal(existsSync(lockPath(root)), true, "an unconfirmed kill keeps the run lock");
  const report = readFileSync(result.reportPath, "utf8");
  assert.match(report, /could not be confirmed dead/);
  assert.match(report, /run lock was deliberately left in place/);
  assert.match(
    result.activities.map((activity) => activity.detail).join("\n"),
    /could not be confirmed dead; the run lock was left in place/,
  );
  // A second run is refused: this app process still holds the live lock.
  await assert.rejects(
    () => runSerialTask(root, "A follow-up outcome", { adapters: [createOfflineDemoAdapter()] }),
    /SERIAL_RUN_ACTIVE/,
  );
});

test("a confirmed-kill timeout releases the run lock as before (FIX 2)", async () => {
  const root = project();
  const confirmed: CodexExecProcess = {
    kind: "fake",
    async run() {
      // The child closed after the kill: killConfirmed=true, nothing orphaned.
      throw new CodexExecTimeoutError("inactivity", "C:\\Users\\owner\\AppData\\Local\\Cairn\\debug\\codex-clean.jsonl", true);
    },
  };
  const result = await runSerialTask(root, "Improve Cairn safely", {
    adapters: [createCodexExecAdapter(root, { installed: true, connected: true }, authorizeCodexExec(root, "Improve Cairn safely"), confirmed)],
  });
  assert.equal(result.status, "stopped");
  assert.equal(existsSync(lockPath(root)), false, "a confirmed kill releases the run lock");
  assert.doesNotMatch(readFileSync(result.reportPath, "utf8"), /could not be confirmed dead/);
  // With the lock released, a fresh run proceeds normally.
  const next = await runSerialTask(root, "A follow-up outcome", { adapters: [createOfflineDemoAdapter()] });
  assert.equal(next.status, "done");
});

test("one authorized fake Codex process completes one verified serial task", async () => {
  const root = project();
  const beforeHead = git(root, ["rev-parse", "HEAD"]);
  let calls = 0;
  const fake: CodexExecProcess = {
    kind: "fake",
    async run() {
      calls += 1;
      // The pre-surgery world stopped this run MODEL_RECORDS_MISSING: a worker
      // that wrote no report/log row failed paperwork verification. Now the
      // worker only does product work and speaks through the claims fence.
      writeFileSync(join(root, "visible.txt"), "model-authored result\n");
      assert.equal(git(root, ["rev-parse", "HEAD"]), beforeHead);
      assert.equal(git(root, ["diff", "--cached", "--name-only"]), "");
      return {
        exitCode: 0, terminalEvent: "turn.completed",
        inputTokens: 200, cachedInputTokens: 50, outputTokens: 80, reasoningOutputTokens: 20,
        agentMessageCount: 1, commandExecutionCount: 2, fileChangeCount: 1, failedToolItemCount: 0,
        finalMessage: [
          "Done.",
          "",
          "```cairn-claims",
          JSON.stringify({
            disposition: "DONE", summary: "Added the visible result.",
            changes: ["visible.txt — created with the requested text"],
            checks: [{ name: "read the file back", result: "matches" }],
            howToTry: "Open visible.txt.", limitations: "None.", milestone: "YES",
          }),
          "```",
        ].join("\n"),
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
  assert.equal(result.row.moved, "YES");
  assert.equal(readFileSync(join(root, "visible.txt"), "utf8"), "model-authored result\n");
  assert.equal(git(root, ["status", "--porcelain=v1", "--untracked-files=all"]), "");
  assert.deepEqual(git(root, ["show", "--format=", "--name-only", "HEAD"]).split(/\r?\n/).filter(Boolean).sort(), [
    "docs/ai-work/LOG.md",
    "docs/ai-work/tasks/001-brief.md",
    "docs/ai-work/tasks/001-report.md",
    "visible.txt",
  ]);
  assert.match(result.reportText, /Disposition: \*\*DONE\*\*/);
  // Cairn authored the report: it separates what Cairn itself verified from
  // what the worker only claims.
  assert.match(result.reportText, /## Verified by Cairn/);
  assert.match(result.reportText, /claims, not verified by Cairn/);
  assert.match(result.activities.at(-1)?.detail ?? "", /real Codex Exec task completed/i);
});

test("a confirmed exact-path commit stays DONE despite a phantom stat-dirty file", async () => {
  // Task 006 (the milestone) committed correctly but was torn to STOPPED:
  // a post-commit `git status --porcelain` saw core/test/files.test.ts as
  // stat-dirty (CRLF working copy, LF index, identical content under
  // autocrlf) — clean to a content diff, dirty to a stat check — and the run
  // rewrote its own committed DONE records to STOPPED (MODEL_RESULT_NOT_VERIFIED).
  const root = project();
  git(root, ["config", "core.autocrlf", "true"]);
  writeFileSync(join(root, "phantom.txt"), "line one\nline two\n");
  git(root, ["add", "phantom.txt"]);
  git(root, ["commit", "-q", "-m", "add phantom"]);
  const beforeHead = git(root, ["rev-parse", "HEAD"]);
  const fake: CodexExecProcess = {
    kind: "fake",
    async run() {
      writeFileSync(join(root, "visible.txt"), "model-authored result\n");
      // Content-identical CRLF rewrite of an unrelated tracked file: invisible
      // to a content diff, but stat-dirty to `git status --porcelain`.
      writeFileSync(join(root, "phantom.txt"), "line one\r\nline two\r\n");
      return {
        exitCode: 0, terminalEvent: "turn.completed",
        inputTokens: 200, cachedInputTokens: 50, outputTokens: 80, reasoningOutputTokens: 20,
        agentMessageCount: 1, commandExecutionCount: 2, fileChangeCount: 1, failedToolItemCount: 0,
        finalMessage: claimsFence({
          disposition: "DONE", summary: "Added the visible result.",
          changes: ["visible.txt — created"], checks: [{ name: "read back", result: "matches" }],
          howToTry: "Open visible.txt.", limitations: "None.", milestone: "YES",
        }),
      };
    },
  };
  const result = await runSerialTask(root, "Add one visible result", {
    adapters: [createCodexExecAdapter(
      root, { installed: true, connected: true },
      authorizeCodexExec(root, "Add one visible result"), fake,
    )],
  });
  assert.equal(result.status, "done");
  if (result.status !== "done") return;
  assert.equal(result.disposition, "DONE");
  assert.equal(result.commit.status, "created");
  assert.notEqual(result.commit.hash, beforeHead);
  // The commit captured exactly the task work; the phantom file was not committed.
  assert.deepEqual(git(root, ["show", "--format=", "--name-only", "HEAD"]).split(/\r?\n/).filter(Boolean).sort(), [
    "docs/ai-work/LOG.md",
    "docs/ai-work/tasks/001-brief.md",
    "docs/ai-work/tasks/001-report.md",
    "visible.txt",
  ]);
  assert.match(result.reportText, /Disposition: \*\*DONE\*\*/);
});

test("a phantom stat-dirty start still creates the exact-path task commit", async () => {
  // Task 010 finished DONE but skipped its commit: the start snapshot counted
  // a stat-only CRLF rewrite (identical content under autocrlf) as protected
  // dirty work, and the uncommitted result then poisoned the rerun (Task 011,
  // PROTECTED_WORK_CHANGED). A start dirty only by phantom, content-clean
  // differences must commit like a clean start.
  const root = project();
  git(root, ["config", "core.autocrlf", "true"]);
  writeFileSync(join(root, "phantom.txt"), "line one\nline two\n");
  git(root, ["add", "phantom.txt"]);
  git(root, ["commit", "-q", "-m", "add phantom"]);
  // Content-identical CRLF rewrite BEFORE the task starts: stat-dirty to
  // `git status --porcelain`, clean to a content diff.
  writeFileSync(join(root, "phantom.txt"), "line one\r\nline two\r\n");
  assert.notEqual(
    git(root, ["status", "--porcelain=v1", "--untracked-files=all"]),
    "",
    "the start must look stat-dirty to a plain status check",
  );
  const beforeHead = git(root, ["rev-parse", "HEAD"]);
  const fake: CodexExecProcess = {
    kind: "fake",
    async run() {
      writeFileSync(join(root, "visible.txt"), "model-authored result\n");
      return {
        exitCode: 0, terminalEvent: "turn.completed",
        inputTokens: 200, cachedInputTokens: 50, outputTokens: 80, reasoningOutputTokens: 20,
        agentMessageCount: 1, commandExecutionCount: 2, fileChangeCount: 1, failedToolItemCount: 0,
        finalMessage: claimsFence({
          disposition: "DONE", summary: "Added the visible result.",
          changes: ["visible.txt — created"], checks: [{ name: "read back", result: "matches" }],
          howToTry: "Open visible.txt.", limitations: "None.", milestone: "YES",
        }),
      };
    },
  };
  const result = await runSerialTask(root, "Add one visible result", {
    adapters: [createCodexExecAdapter(
      root, { installed: true, connected: true },
      authorizeCodexExec(root, "Add one visible result"), fake,
    )],
  });
  assert.equal(result.status, "done");
  if (result.status !== "done") return;
  assert.equal(result.disposition, "DONE");
  assert.equal(result.commit.status, "created");
  assert.notEqual(result.commit.hash, beforeHead);
  // The commit captured exactly the task work; the phantom file stayed out.
  assert.deepEqual(git(root, ["show", "--format=", "--name-only", "HEAD"]).split(/\r?\n/).filter(Boolean).sort(), [
    "docs/ai-work/LOG.md",
    "docs/ai-work/tasks/001-brief.md",
    "docs/ai-work/tasks/001-report.md",
    "visible.txt",
  ]);
  // Git may keep showing the phantom stat entry until the file is touched;
  // what matters is that nothing else is left behind and the content view is
  // clean, so the next run starts clean instead of poisoned (Task 011).
  const leftover = git(root, ["status", "--porcelain=v1", "--untracked-files=all"])
    .split(/\r?\n/).filter(Boolean).filter((entry) => entry !== " M phantom.txt");
  assert.deepEqual(leftover, []);
  assert.equal(git(root, ["diff", "--name-only"]), "");
});

test("an already-satisfied fake Codex task closes honestly without a product edit", async () => {
  const root = project();
  const beforeHead = git(root, ["rev-parse", "HEAD"]);
  const fake: CodexExecProcess = {
    kind: "fake",
    async run() {
      // No product change: the worker verifies the already-satisfied behavior
      // and says so honestly through its claims, milestone NO.
      return {
        exitCode: 0, terminalEvent: "turn.completed",
        inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, reasoningOutputTokens: 0,
        agentMessageCount: 1, commandExecutionCount: 1, fileChangeCount: 0, failedToolItemCount: 0,
        finalMessage: claimsFence({
          disposition: "DONE", summary: "Verified the already-satisfied behavior without inventing a change.",
          changes: [], checks: [{ name: "ran the focused check", result: "already passing" }],
          howToTry: "Re-run the existing behavior.", limitations: "None.", milestone: "NO",
        }),
      };
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

test("a completed process with no claims fence stops WORKER_CLAIMS_MISSING", async () => {
  const root = project();
  const beforeHead = git(root, ["rev-parse", "HEAD"]);
  let calls = 0;
  const fake: CodexExecProcess = {
    kind: "fake",
    async run() {
      calls += 1;
      // The process completes but its final message carries no cairn-claims
      // fence, so Cairn has no readable worker account and stops honestly.
      return { exitCode: 0, terminalEvent: "turn.completed", inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, reasoningOutputTokens: 0, agentMessageCount: 1, commandExecutionCount: 0, fileChangeCount: 0, failedToolItemCount: 0, finalMessage: null };
    },
  };
  const outcome = "Verify one existing behavior";
  const result = await runSerialTask(root, outcome, {
    adapters: [createCodexExecAdapter(root, { installed: true, connected: true }, authorizeCodexExec(root, outcome), fake)],
  });

  assert.equal(calls, 1);
  assert.equal(result.status, "stopped");
  if (result.status !== "stopped") return;
  assert.equal(result.reason, "WORKER_CLAIMS_MISSING");
  assert.equal(git(root, ["rev-parse", "HEAD"]), beforeHead);
  assert.equal(git(root, ["diff", "--cached", "--name-only"]), "");
  const report = readFileSync(result.reportPath, "utf8");
  assert.match(report, /WORKER_CLAIMS_MISSING/);
  assert.match(report, /The worker returned no readable claims block\./);
  assert.match(report, /Bounded worker evidence: agentMessageCount=1; cachedInputTokens=0; commandExecutionCount=0; exitCode=0; failedToolItemCount=0; fileChangeCount=0; inputTokens=1; outputTokens=1; reasoningOutputTokens=0\./);
  assert.match(report, /no other item text, reasoning, commands, paths, stdout, stderr, thread IDs, account details, authentication data, or credentials/);
  assert.match(result.activities.map((activity) => activity.detail).join("\n"), /Bounded worker evidence: agentMessageCount=1; cachedInputTokens=0; commandExecutionCount=0; exitCode=0;/);
  assert.match(result.activities.at(-1)?.detail ?? "", /STOPPED — WORKER_CLAIMS_MISSING/);
});

function fixtureAdapter(id: string, evidence: Record<string, number>): TaskAdapter {
  return {
    descriptor: { id, label: id, provider: "Fixture Provider", model: "fixture-1", connected: true, capabilities: ["serial-task"], priority: 50 },
    async run(contract) {
      return {
        kind: "worker-result/v1",
        taskNumber: contract.taskNumber,
        requestedOutcomeSha256: contract.requestedOutcomeSha256,
        status: "completed",
        claimsText: null,
        evidence,
      } as never;
    },
  };
}

test("a NaN evidence value fails the universal worker-result schema", async () => {
  const root = project();
  const result = await runSerialTask(root, "Verify one bounded result", {
    adapters: [fixtureAdapter("nan-worker", { bounded: Number.NaN })],
  });
  assert.equal(result.status, "stopped");
  if (result.status !== "stopped") return;
  assert.equal(result.reason, "INVALID_ADAPTER_RESULT");
  assert.doesNotMatch(result.reportText, /Bounded worker evidence/);
});

test("an oversized 25-entry evidence map fails the universal worker-result schema", async () => {
  const root = project();
  const evidence: Record<string, number> = {};
  for (let index = 0; index < 25; index += 1) evidence[`k${index}`] = index;
  const result = await runSerialTask(root, "Verify one bounded result", {
    adapters: [fixtureAdapter("big-worker", evidence)],
  });
  assert.equal(result.status, "stopped");
  if (result.status !== "stopped") return;
  assert.equal(result.reason, "INVALID_ADAPTER_RESULT");
  assert.doesNotMatch(result.reportText, /Bounded worker evidence/);
});

test("a negative evidence value is honest and does not fail the schema (exitCode -1)", async () => {
  const root = project();
  const result = await runSerialTask(root, "Verify one bounded result", {
    adapters: [fixtureAdapter("neg-worker", { exitCode: -1, fileChangeCount: 0 })],
  });
  // Negatives are allowed; with no claims fence the run stops WORKER_CLAIMS_MISSING,
  // NOT INVALID_ADAPTER_RESULT — the evidence itself is valid.
  assert.equal(result.status, "stopped");
  if (result.status !== "stopped") return;
  assert.equal(result.reason, "WORKER_CLAIMS_MISSING");
  assert.match(result.reportText, /Bounded worker evidence: exitCode=-1; fileChangeCount=0\./);
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
      return {
        exitCode: 0, terminalEvent: "turn.completed",
        inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, reasoningOutputTokens: 0,
        agentMessageCount: 1, commandExecutionCount: 2, fileChangeCount: 1, failedToolItemCount: 0,
        finalMessage: claimsFence({
          disposition: "DONE", summary: "Added a visible result.",
          changes: ["visible.txt — created"], checks: [{ name: "read back", result: "matches" }],
          howToTry: "Open visible.txt.", limitations: "None.", milestone: "YES",
        }),
      };
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
      // An unrelated, non-owned task-record path in the change set must block
      // Cairn's exact-path commit even when the claims are a valid DONE.
      writeFileSync(join(root, "docs", "ai-work", "tasks", "999-report.md"), "unrelated task record\n");
      return {
        exitCode: 0, terminalEvent: "turn.completed",
        inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, reasoningOutputTokens: 0,
        agentMessageCount: 1, commandExecutionCount: 2, fileChangeCount: 2, failedToolItemCount: 0,
        finalMessage: claimsFence({
          disposition: "DONE", summary: "Added a visible result.",
          changes: ["visible.txt — created"], checks: [{ name: "read back", result: "matches" }],
          howToTry: "Open visible.txt.", limitations: "None.", milestone: "YES",
        }),
      };
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

test("claims saying STOPPED close as MODEL_REPORTED_STOPPED with evidence retained", async () => {
  const root = project();
  const beforeHead = git(root, ["rev-parse", "HEAD"]);
  const fake: CodexExecProcess = {
    kind: "fake",
    async run() {
      // The worker did partial work and then honestly reported it could not
      // finish. Cairn keeps that evidence and never commits it.
      writeFileSync(join(root, "partial.txt"), "half a change\n");
      return {
        exitCode: 0, terminalEvent: "turn.completed",
        inputTokens: 10, cachedInputTokens: 2, outputTokens: 4, reasoningOutputTokens: 1,
        agentMessageCount: 1, commandExecutionCount: 1, fileChangeCount: 1, failedToolItemCount: 0,
        finalMessage: claimsFence({
          disposition: "STOPPED", summary: "Could not finish safely.",
          changes: ["partial.txt — started but incomplete"], checks: [{ name: "attempted the change", result: "left partial" }],
          howToTry: "Inspect partial.txt.", limitations: "The change is incomplete.", milestone: "NO",
        }),
      };
    },
  };
  const result = await runSerialTask(root, "Add one visible result", {
    adapters: [createCodexExecAdapter(root, { installed: true, connected: true }, authorizeCodexExec(root, "Add one visible result"), fake)],
  });

  assert.equal(result.status, "stopped");
  if (result.status !== "stopped") return;
  assert.equal(result.reason, "MODEL_REPORTED_STOPPED");
  assert.equal(result.commit.status, "skipped");
  assert.equal(git(root, ["rev-parse", "HEAD"]), beforeHead);
  assert.equal(git(root, ["diff", "--cached", "--name-only"]), "");
  assert.equal(existsSync(join(root, "partial.txt")), true, "the worker's partial evidence is retained, never cleaned");
  const report = readFileSync(result.reportPath, "utf8");
  assert.match(report, /MODEL_REPORTED_STOPPED/);
  // The worker's own stopped summary is displayed as a quarantined claim,
  // never as one of Cairn's own structural lines.
  assert.match(report, /> Could not finish safely\./);
  assert.match(report, /partial\.txt/);
  assert.match(report, /Disposition: \*\*STOPPED\*\*/);
});

test("perfect DONE claims cannot outrank a protected-work change", async () => {
  const root = project();
  writeFileSync(join(root, "protected.txt"), "owner original\n");
  git(root, ["add", "--", "protected.txt"]);
  git(root, ["commit", "-q", "-m", "protected fixture"]);
  // The owner has an uncommitted edit at the start — protected work.
  writeFileSync(join(root, "protected.txt"), "owner uncommitted edit\n");
  const beforeHead = git(root, ["rev-parse", "HEAD"]);
  const fake: CodexExecProcess = {
    kind: "fake",
    async run() {
      // The worker overwrites the owner's protected edit AND returns a flawless
      // DONE claims fence. Protection must win over the claims regardless.
      writeFileSync(join(root, "protected.txt"), "worker overwrote the owner's edit\n");
      return {
        exitCode: 0, terminalEvent: "turn.completed",
        inputTokens: 200, cachedInputTokens: 50, outputTokens: 80, reasoningOutputTokens: 20,
        agentMessageCount: 1, commandExecutionCount: 1, fileChangeCount: 1, failedToolItemCount: 0,
        finalMessage: claimsFence({
          disposition: "DONE", summary: "Everything looks perfect.",
          changes: ["did the thing"], checks: [{ name: "tests", result: "all pass" }],
          howToTry: "Run it.", limitations: "None.", milestone: "YES",
        }),
      };
    },
  };
  const result = await runSerialTask(root, "Add one visible result", {
    adapters: [createCodexExecAdapter(root, { installed: true, connected: true }, authorizeCodexExec(root, "Add one visible result"), fake)],
  });

  assert.equal(result.status, "stopped");
  if (result.status !== "stopped") return;
  assert.equal(result.reason, "PROTECTED_WORK_CHANGED");
  assert.equal(git(root, ["rev-parse", "HEAD"]), beforeHead);
  assert.equal(
    readFileSync(join(root, "protected.txt"), "utf8"),
    "worker overwrote the owner's edit\n",
    "the worker's change is retained as evidence, never reverted or cleaned by Cairn",
  );
  assert.match(readFileSync(result.reportPath, "utf8"), /PROTECTED_WORK_CHANGED/);
});

test("the real offline demonstration adapter never claims it attempted the product change", async () => {
  // Guards the honest-labeling promise at its source. The adapter now returns
  // the universal worker-result with no claims text of its own — it can make no
  // claim of work at all — and the demo lane's own report still says the product
  // change was not attempted. A drift to a claim of completed work must fail here.
  const adapter = createOfflineDemoAdapter();
  const result = await adapter.run({
    taskNumber: 7,
    requestedOutcomeSha256: "a".repeat(64),
  } as unknown as Parameters<TaskAdapter["run"]>[0]);
  assert.equal(result.kind, "worker-result/v1");
  assert.equal(result.claimsText, null);

  const root = project();
  const run = await runSerialTask(root, "Create a welcome page", { adapters: [createOfflineDemoAdapter()] });
  assert.equal(run.status, "done");
  if (run.status !== "done") return;
  assert.match(run.reportText, /Requested product change: \*\*not attempted\*\*/);
  assert.doesNotMatch(run.reportText, /\bimplemented\b|completed the requested product change|attempted the requested/i);
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

// Task 054: the adapter-entry wait must fail fast when the watched run settles
// before its adapter is ever entered. The old bare spin-wait had no escape: on
// CI a pre-adapter throw abandoned it mid-spin, and the immortal immediate
// chain held the test process open until GitHub's six-hour job kill.
async function untilAdapterEntry(run: Promise<unknown>, entered: () => boolean): Promise<void> {
  let settled = false;
  let failure: unknown;
  void run.then(
    () => { settled = true; },
    (error) => {
      settled = true;
      failure = error ?? new Error("the run rejected before its adapter was entered");
    },
  );
  while (!entered()) {
    if (settled) throw failure ?? new Error("the run settled before its adapter was entered");
    await new Promise((resolve) => setImmediate(resolve));
  }
}

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
  await untilAdapterEntry(first, () => release !== undefined);
  await assert.rejects(
    () => runSerialTask(root, "Second outcome", { adapters: [createOfflineDemoAdapter()] }),
    /SERIAL_RUN_ACTIVE/,
  );
  assert.ok(release, "the adapter-entry wait resolved, so release is set");
  release();
  assert.equal((await first).status, "done");
  assert.deepEqual(requireTaskNames(root), ["001-brief.md", "001-report.md"]);
});

test("the adapter-entry wait fails fast when the run never reaches its adapter (FIX / Task 054)", { timeout: 10_000 }, async () => {
  const ungoverned = mkdtempSync(join(tmpdir(), "cairn-serial-ungoverned-"));
  const first = runSerialTask(ungoverned, "Never dispatched", {
    adapters: [createOfflineDemoAdapter()],
  });
  await assert.rejects(untilAdapterEntry(first, () => false), /No Cairn contract here/);
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
        if (shape === "accessor") Object.defineProperty(base, "status", {
          enumerable: true,
          configurable: true,
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

test("PHASE 4 READINESS: a synthetic third adapter reaches verified DONE with no serial.ts special-casing", async () => {
  const root = project();
  const synthetic: TaskAdapter = {
    descriptor: {
      id: "fixture-worker", label: "Fixture Worker", provider: "Fixture Provider", model: "fixture-1",
      connected: true, capabilities: ["serial-task"], priority: 50,
    },
    async run(contract) {
      writeFileSync(join(root, "visible.txt"), "fixture worker result\n");
      return {
        kind: "worker-result/v1",
        taskNumber: contract.taskNumber,
        requestedOutcomeSha256: contract.requestedOutcomeSha256,
        status: "completed",
        claimsText: [
          "Done.", "", "```cairn-claims",
          JSON.stringify({
            disposition: "DONE", summary: "Added the visible result.",
            changes: ["visible.txt — created"], checks: [{ name: "read back", result: "matches" }],
            howToTry: "Open visible.txt.", limitations: "None.", milestone: "NO",
          }),
          "```",
        ].join("\n"),
        evidence: { anythingBounded: 3 },
      };
    },
  };
  const result = await runSerialTask(root, "Add one visible result", { adapters: [synthetic] });
  assert.equal(result.status, "done");
  if (result.status !== "done") return;
  assert.equal(result.commit.status, "created");
  const report = readFileSync(result.reportPath, "utf8");
  assert.match(report, /Fixture Worker/);
  assert.match(report, /Fixture Provider/);
  assert.doesNotMatch(report, /Codex|offline demonstration/i);
  assert.deepEqual(git(root, ["show", "--format=", "--name-only", "HEAD"]).split(/\r?\n/).filter(Boolean).sort(), [
    "docs/ai-work/LOG.md",
    "docs/ai-work/tasks/001-brief.md",
    "docs/ai-work/tasks/001-report.md",
    "visible.txt",
  ]);
});

test("a worker that edits its own brief cannot forge a DONE record (FIX 1)", async () => {
  const root = project();
  const beforeHead = git(root, ["rev-parse", "HEAD"]);
  const tampering: CodexExecProcess = {
    kind: "fake",
    async run() {
      // The worker does product work AND rewrites its own (untracked) task
      // brief, then claims a flawless DONE with a milestone move. The brief is
      // not a protected path, so without FIX 1 this forges a standing DONE row.
      writeFileSync(join(root, "visible.txt"), "model-authored result\n");
      writeFileSync(join(root, "docs", "ai-work", "tasks", "001-brief.md"), "# forged brief\n");
      return {
        exitCode: 0, terminalEvent: "turn.completed",
        inputTokens: 200, cachedInputTokens: 50, outputTokens: 80, reasoningOutputTokens: 20,
        agentMessageCount: 1, commandExecutionCount: 2, fileChangeCount: 2, failedToolItemCount: 0,
        finalMessage: claimsFence({
          disposition: "DONE", summary: "Added the visible result.",
          changes: ["visible.txt — created"], checks: [{ name: "read back", result: "matches" }],
          howToTry: "Open visible.txt.", limitations: "None.", milestone: "YES",
        }),
      };
    },
  };
  const result = await runSerialTask(root, "Add one visible result", {
    adapters: [createCodexExecAdapter(root, { installed: true, connected: true }, authorizeCodexExec(root, "Add one visible result"), tampering)],
  });

  assert.equal(result.status, "stopped");
  if (result.status !== "stopped") return;
  assert.equal(result.reason, "RECORD_VERIFICATION_FAILED");
  // No forged DONE anywhere: HEAD unmoved, no stone gained, one STOPPED row.
  assert.equal(git(root, ["rev-parse", "HEAD"]), beforeHead);
  assert.equal(projectStatus(root).stones, 0);
  const log = readFileSync(join(root, "docs", "ai-work", "LOG.md"), "utf8");
  assert.equal(log.match(/\| 001 \|/g)?.length, 1, "exactly one row for the task");
  assert.match(log, /\| 001 \|.*\| STOPPED \|/);
  assert.doesNotMatch(log, /\| 001 \|.*\| DONE \|/);
  const report = readFileSync(result.reportPath, "utf8");
  assert.match(report, /Disposition: \*\*STOPPED\*\*/);
  assert.doesNotMatch(report, /Disposition: \*\*DONE\*\*/);
  // The tampered brief is retained as evidence, never reverted by Cairn.
  assert.equal(readFileSync(join(root, "docs", "ai-work", "tasks", "001-brief.md"), "utf8"), "# forged brief\n");
});

test("a worker that deletes its own brief closes honestly with no unhandled ENOENT (FIX 1)", async () => {
  const root = project();
  const beforeHead = git(root, ["rev-parse", "HEAD"]);
  const deleting: CodexExecProcess = {
    kind: "fake",
    async run() {
      writeFileSync(join(root, "visible.txt"), "model-authored result\n");
      rmSync(join(root, "docs", "ai-work", "tasks", "001-brief.md"));
      return {
        exitCode: 0, terminalEvent: "turn.completed",
        inputTokens: 200, cachedInputTokens: 50, outputTokens: 80, reasoningOutputTokens: 20,
        agentMessageCount: 1, commandExecutionCount: 2, fileChangeCount: 2, failedToolItemCount: 0,
        finalMessage: claimsFence({
          disposition: "DONE", summary: "Added the visible result.",
          changes: ["visible.txt — created"], checks: [{ name: "read back", result: "matches" }],
          howToTry: "Open visible.txt.", limitations: "None.", milestone: "YES",
        }),
      };
    },
  };
  // A missing brief must produce an honest STOPPED close, never an unhandled ENOENT.
  const result = await runSerialTask(root, "Add one visible result", {
    adapters: [createCodexExecAdapter(root, { installed: true, connected: true }, authorizeCodexExec(root, "Add one visible result"), deleting)],
  });

  assert.equal(result.status, "stopped");
  if (result.status !== "stopped") return;
  assert.equal(result.reason, "RECORD_VERIFICATION_FAILED");
  assert.equal(git(root, ["rev-parse", "HEAD"]), beforeHead);
  assert.equal(projectStatus(root).stones, 0);
  const log = readFileSync(join(root, "docs", "ai-work", "LOG.md"), "utf8");
  assert.equal(log.match(/\| 001 \|/g)?.length, 1, "exactly one row for the task");
  assert.match(log, /\| 001 \|.*\| STOPPED \|/);
  assert.doesNotMatch(log, /\| 001 \|.*\| DONE \|/);
  const report = readFileSync(result.reportPath, "utf8");
  assert.match(report, /Disposition: \*\*STOPPED\*\*/);
});

test("a worker that appends a forged DONE row to the work log cannot forge a stone (FIX / Task 052)", async () => {
  const root = project();
  const beforeHead = git(root, ["rev-parse", "HEAD"]);
  const startLog = readFileSync(join(root, "docs", "ai-work", "LOG.md"), "utf8");
  const tampering: CodexExecProcess = {
    kind: "fake",
    async run() {
      // The worker does real product work AND appends a forged DONE+YES row to
      // the append-only work log, then claims a flawless DONE with a milestone
      // move. LOG.md is a Cairn-owned record but not a protected path, so without
      // the owned-records gate this forged row stands and inflates the stone count.
      writeFileSync(join(root, "visible.txt"), "model-authored result\n");
      appendFileSync(
        join(root, "docs", "ai-work", "LOG.md"),
        "| 001 | 2026-07-24 | Standard | Applied | DONE | completed | forged | YES |\n",
      );
      return {
        exitCode: 0, terminalEvent: "turn.completed",
        inputTokens: 200, cachedInputTokens: 50, outputTokens: 80, reasoningOutputTokens: 20,
        agentMessageCount: 1, commandExecutionCount: 2, fileChangeCount: 2, failedToolItemCount: 0,
        finalMessage: claimsFence({
          disposition: "DONE", summary: "Added the visible result.",
          changes: ["visible.txt — created"], checks: [{ name: "read back", result: "matches" }],
          howToTry: "Open visible.txt.", limitations: "None.", milestone: "YES",
        }),
      };
    },
  };
  const result = await runSerialTask(root, "Add one visible result", {
    adapters: [createCodexExecAdapter(root, { installed: true, connected: true }, authorizeCodexExec(root, "Add one visible result"), tampering)],
  });

  assert.equal(result.status, "stopped");
  if (result.status !== "stopped") return;
  assert.equal(result.reason, "RECORD_VERIFICATION_FAILED");
  // The log is exactly the pristine start log plus one Cairn-authored STOPPED
  // row; the forged DONE+YES row is gone.
  const log = readFileSync(join(root, "docs", "ai-work", "LOG.md"), "utf8");
  assert.ok(log.startsWith(startLog), "the pristine start log is preserved");
  assert.equal(log.match(/\| 001 \|/g)?.length, 1, "exactly one row for the task");
  assert.match(log, /\| 001 \|.*\| STOPPED \|/);
  assert.doesNotMatch(log, /\| 001 \|.*\| DONE \|/);
  assert.doesNotMatch(log, /forged/, "the worker's forged row was discarded");
  // No stone was gained and HEAD did not move.
  assert.equal(projectStatus(root).stones, 0);
  assert.equal(git(root, ["rev-parse", "HEAD"]), beforeHead);
  // The report is Cairn's honest STOPPED record carrying the restoration disclosure.
  const report = readFileSync(result.reportPath, "utf8");
  assert.match(report, /Disposition: \*\*STOPPED\*\*/);
  assert.doesNotMatch(report, /Disposition: \*\*DONE\*\*/);
  assert.match(report, /Cairn restored it from the task-start snapshot/);
  assert.match(report, /product-file changes remain retained/);
  // The worker's product file is retained as evidence, never cleaned.
  assert.equal(existsSync(join(root, "visible.txt")), true);
});

test("a worker that truncates the work log is restored and stopped honestly (FIX / Task 052)", async () => {
  const root = project();
  // Seed a committed historical row so the start log has content beyond the
  // header; truncating back to the header is then a real modification to detect.
  appendLogRow(root, {
    task: "000", date: "2026-07-20", lane: "Standard", mode: "Applied",
    outcome: "STOPPED", decision: "stopped", summary: "an earlier stop", moved: "NO",
  });
  git(root, ["add", "docs/ai-work/LOG.md"]);
  git(root, ["commit", "-q", "-m", "seed log"]);
  const beforeHead = git(root, ["rev-parse", "HEAD"]);
  const startLog = readFileSync(join(root, "docs", "ai-work", "LOG.md"), "utf8");
  const truncating: CodexExecProcess = {
    kind: "fake",
    async run() {
      writeFileSync(join(root, "visible.txt"), "model-authored result\n");
      // Truncate the append-only log down to just its header, discarding history.
      writeFileSync(join(root, "docs", "ai-work", "LOG.md"), LOG_HEADER);
      return {
        exitCode: 0, terminalEvent: "turn.completed",
        inputTokens: 200, cachedInputTokens: 50, outputTokens: 80, reasoningOutputTokens: 20,
        agentMessageCount: 1, commandExecutionCount: 2, fileChangeCount: 2, failedToolItemCount: 0,
        finalMessage: claimsFence({
          disposition: "DONE", summary: "Added the visible result.",
          changes: ["visible.txt — created"], checks: [{ name: "read back", result: "matches" }],
          howToTry: "Open visible.txt.", limitations: "None.", milestone: "YES",
        }),
      };
    },
  };
  const result = await runSerialTask(root, "Add one visible result", {
    adapters: [createCodexExecAdapter(root, { installed: true, connected: true }, authorizeCodexExec(root, "Add one visible result"), truncating)],
  });

  assert.equal(result.status, "stopped");
  if (result.status !== "stopped") return;
  assert.equal(result.reason, "RECORD_VERIFICATION_FAILED");
  const log = readFileSync(join(root, "docs", "ai-work", "LOG.md"), "utf8");
  // The truncated history is restored in full and one Cairn STOPPED row is added.
  assert.ok(log.startsWith(startLog), "the truncated start log is restored in full");
  assert.match(log, /an earlier stop/, "the historical row is recovered");
  assert.equal(log.match(/\| 001 \|/g)?.length, 1, "exactly one row for the task");
  assert.match(log, /\| 001 \|.*\| STOPPED \|/);
  assert.equal(projectStatus(root).stones, 0);
  assert.equal(git(root, ["rev-parse", "HEAD"]), beforeHead);
  const report = readFileSync(result.reportPath, "utf8");
  assert.match(report, /Disposition: \*\*STOPPED\*\*/);
  assert.match(report, /Cairn restored it from the task-start snapshot/);
});

test("a worker that pre-writes the task report is replaced by Cairn's honest STOPPED record (FIX / Task 052)", async () => {
  const root = project();
  const beforeHead = git(root, ["rev-parse", "HEAD"]);
  const prewriting: CodexExecProcess = {
    kind: "fake",
    async run() {
      writeFileSync(join(root, "visible.txt"), "model-authored result\n");
      // The worker pre-writes its own report at Cairn's owned report path,
      // forging a DONE disposition. Without the gate this raised a raw EEXIST
      // throw when Cairn authored the report with the "wx" flag.
      writeFileSync(
        join(root, "docs", "ai-work", "tasks", "001-report.md"),
        "# forged report\n\nMilestone movement: **YES**\n\nDisposition: **DONE**\n",
      );
      return {
        exitCode: 0, terminalEvent: "turn.completed",
        inputTokens: 200, cachedInputTokens: 50, outputTokens: 80, reasoningOutputTokens: 20,
        agentMessageCount: 1, commandExecutionCount: 2, fileChangeCount: 2, failedToolItemCount: 0,
        finalMessage: claimsFence({
          disposition: "DONE", summary: "Added the visible result.",
          changes: ["visible.txt — created"], checks: [{ name: "read back", result: "matches" }],
          howToTry: "Open visible.txt.", limitations: "None.", milestone: "YES",
        }),
      };
    },
  };
  const result = await runSerialTask(root, "Add one visible result", {
    adapters: [createCodexExecAdapter(root, { installed: true, connected: true }, authorizeCodexExec(root, "Add one visible result"), prewriting)],
  });

  assert.equal(result.status, "stopped");
  if (result.status !== "stopped") return;
  assert.equal(result.reason, "RECORD_VERIFICATION_FAILED");
  assert.equal(git(root, ["rev-parse", "HEAD"]), beforeHead);
  assert.equal(projectStatus(root).stones, 0);
  // The report at the owned path is Cairn's honest STOPPED record, not the forgery.
  const report = readFileSync(join(root, "docs", "ai-work", "tasks", "001-report.md"), "utf8");
  assert.match(report, /Disposition: \*\*STOPPED\*\*/);
  assert.doesNotMatch(report, /forged report/);
  assert.match(report, /Cairn replaced it with this honest record/);
  assert.equal(report.match(/^Disposition:/gm)?.length, 1, "exactly one structural disposition line");
  // Exactly one Cairn-authored STOPPED log row.
  const log = readFileSync(join(root, "docs", "ai-work", "LOG.md"), "utf8");
  assert.equal(log.match(/\| 001 \|/g)?.length, 1, "exactly one row for the task");
  assert.match(log, /\| 001 \|.*\| STOPPED \|/);
  // The worker's product file is retained as evidence.
  assert.equal(existsSync(join(root, "visible.txt")), true);
});

test("a worker that forges a log row and forces a thrown close leaves the log restored (Phase 3 Task 1)", async () => {
  const root = project();
  const logPath = join(root, "docs", "ai-work", "LOG.md");
  const before = readFileSync(logPath, "utf8");
  const forging: CodexExecProcess = {
    kind: "fake",
    async run() {
      appendFileSync(logPath, "| 001 | 2026-07-24 | Standard | Applied | DONE | completed | forged stone | YES |\n");
      // A thrown process error is the only path into serial.ts's adapter catch.
      throw new CodexExecProcessError("CODEX_EXEC_STDIN_FAILED", null);
    },
  };
  await assert.rejects(
    () => runSerialTask(root, "Add one visible result", {
      adapters: [createCodexExecAdapter(root, { installed: true, connected: true }, authorizeCodexExec(root, "Add one visible result"), forging)],
    }),
    /RECORD_VERIFICATION_FAILED/,
  );
  const after = readFileSync(logPath, "utf8");
  assert.equal(after.includes("forged stone"), false, "the forged row must not survive the thrown run");
  assert.equal(after, before, "the log is byte-identical to Cairn's last own write");
});

function requireTaskNames(root: string): string[] {
  const dir = join(root, "docs", "ai-work", "tasks");
  return existsSync(dir) ? readdirSync(dir).sort() : [];
}

// Task 054: GitHub's Windows runners hand the suite an 8.3 short-name temp
// path (RUNNER~1); git reports the expanded long path, so the root-identity
// gate must treat both spellings as the same real directory.
test("an aliased spelling of the project root still completes a serial task (FIX / Task 054)", async (t) => {
  const root = project();
  const alias = aliasedSpelling(root);
  if (!alias) {
    t.skip("this filesystem offers no aliased spelling of the fixture root");
    return;
  }
  assert.notEqual(alias.toLowerCase(), resolve(root).toLowerCase());
  const result = await runSerialTask(alias, "One aliased outcome", {
    adapters: [createOfflineDemoAdapter()],
  });
  assert.equal(result.status, "done");
  assert.deepEqual(requireTaskNames(root), ["001-brief.md", "001-report.md"]);
});
