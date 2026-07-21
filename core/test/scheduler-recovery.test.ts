import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as core from "../src/index.js";
import type { Engine, RunEvents, RunSpec } from "../src/agents.js";

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "src");

test("Task 028 exposes read-only status and explicit recovery", () => {
  const api = core as Record<string, unknown>;
  assert.equal(typeof api.readSchedulerState, "function");
  assert.equal(typeof api.recoverScheduledBatch, "function");
  assert.equal(typeof api.hasActiveScheduledBatch, "function");
  assert.equal(existsSync(join(sourceRoot, "scheduler-git.ts")), true);
});

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function fixture(label: string): string {
  const root = mkdtempSync(join(tmpdir(), `cairn-task-028-${label}-`));
  const created = core.scaffoldProject(root, {
    name: "Task 028 recovery fixture", what: "preserve interrupted scheduled work", who: "test",
    milestone: "an interruption becomes visible", timebox: "default",
  });
  git(root, ["init", "-b", "main"]);
  git(root, ["config", "user.name", "Cairn Test"]);
  git(root, ["config", "user.email", "cairn@example.invalid"]);
  git(root, ["add", "--", ...created.map((path) => relative(root, path).replace(/\\/g, "/"))]);
  git(root, ["commit", "-m", "synthetic start"]);
  return root;
}

class RecoveryEngine implements Engine {
  calls = 0;
  async run(spec: RunSpec, _events: RunEvents): Promise<{ text: string }> {
    this.calls += 1;
    const taskNumber = spec.taskNumber!;
    const id = String(taskNumber).padStart(3, "0");
    const result = "result.txt";
    const testPath = "result.test.mjs";
    if (spec.schedulerProfile === "scheduler-planning") {
      return { text: JSON.stringify({
        schemaVersion: 1, taskNumber, outcome: "Create a result", independentlyUseful: "visible on its own", lane: "Standard",
        implementationPaths: [result], testPaths: [testPath], checks: [{ executable: "node", args: ["--test", testPath] }],
        dependencies: [], externalActions: [], certainty: "certain", uncertaintyReason: "",
        briefMarkdown: `# Task ${id} — recovery brief\n\nLane: **Standard**\n\nVisible outcome: create result.txt.\n\nImplementation paths: result.txt\nTest paths: result.test.mjs\nChecks: node --test result.test.mjs\n\nDONE when checked.\nSTOPPED on interruption.\n`,
      }) };
    }
    writeFileSync(resolve(spec.root, result), "recovery result\n");
    writeFileSync(resolve(spec.root, testPath),
      `import assert from "node:assert/strict";\nimport { readFileSync } from "node:fs";\nimport test from "node:test";\ntest("result", () => assert.equal(readFileSync(new URL("./${basename(result)}", import.meta.url), "utf8").replace(/\\r\\n/g, "\\n"), "recovery result\\n"));\n`);
    const report = resolve(spec.root, `docs/ai-work/tasks/${id}-report.md`);
    mkdirSync(dirname(report), { recursive: true });
    writeFileSync(report, `# Task ${id} — recovery report\n\nMilestone movement: YES\n\nDisposition: DONE\n`);
    return { text: "Disposition: DONE" };
  }
}

async function withScheduler<T>(body: () => Promise<T>): Promise<T> {
  const previous = process.env.CAIRN_TWO_TASK_SCHEDULER_FINAL;
  process.env.CAIRN_TWO_TASK_SCHEDULER_FINAL = "1";
  try { return await body(); }
  finally {
    if (previous === undefined) delete process.env.CAIRN_TWO_TASK_SCHEDULER_FINAL;
    else process.env.CAIRN_TWO_TASK_SCHEDULER_FINAL = previous;
  }
}

test("an interruption after main movement is truthful and never retries an engine", async () => {
  await withScheduler(async () => {
    const root = fixture("after-main");
    const engine = new RecoveryEngine();
    let injected = false;
    const result = await core.startScheduledBatch(root, ["Create the recovery result"], () => engine, {
      onTransition: (name) => {
        if (!injected && name.startsWith("main-fast-forward-observed:")) {
          injected = true;
          throw new Error("synthetic interruption after main movement");
        }
      },
    });
    assert.equal(injected, true);
    assert.equal(result.tasks[0].phase, "Needs attention");
    assert.equal(engine.calls, 2, "one Planning and one Building session only");
    assert.equal(core.parseLog(root).filter((row) => row.task === "001").length, 1);
    const recovered = core.recoverScheduledBatch(root)!;
    assert.equal(recovered.tasks[0].phase, "Needs attention");
    assert.equal(engine.calls, 2, "recovery never starts another model session");
    assert.equal(core.parseLog(root).filter((row) => row.task === "001").length, 1);
  });
});

test("recovery removes only a proved stale scheduler lock and retains interrupted resources", async () => {
  await withScheduler(async () => {
    const root = fixture("stale-lock");
    const engine = new RecoveryEngine();
    let injected = false;
    const result = await core.startScheduledBatch(root, ["Create the recovery result"], () => engine, {
      onTransition: (name) => {
        if (!injected && name.startsWith("integration-worktree-created:")) {
          injected = true;
          throw new Error("synthetic interruption before apply");
        }
      },
    });
    assert.equal(result.tasks[0].phase, "Needs attention");
    const state = core.readSchedulerState(root)!;
    const statePaths = core.schedulerStatePaths(root);
    writeFileSync(statePaths.lock, `${JSON.stringify({ runId: state.runId, token: "stale-test-token", pid: 999999, createdAt: new Date().toISOString() })}\n`, { flag: "wx" });
    const recovered = core.recoverScheduledBatch(root)!;
    assert.equal(existsSync(statePaths.lock), false);
    assert.equal(recovered.tasks[0].phase, "Needs attention");
    assert.ok(recovered.tasks[0].worktree, "the interrupted task worktree remains as evidence");
    assert.ok(recovered.tasks[0].attention);
  });
});

test("unknown scheduler state fields fail closed", async () => {
  await withScheduler(async () => {
    const root = fixture("state-strict");
    const engine = new RecoveryEngine();
    await core.startScheduledBatch(root, ["Create the recovery result"], () => engine);
    const statePath = core.schedulerStatePaths(root).state;
    const value = JSON.parse(readFileSync(statePath, "utf8")) as Record<string, unknown>;
    value.unapproved = true;
    writeFileSync(statePath, `${JSON.stringify(value, null, 2)}\n`);
    assert.throws(() => core.readSchedulerState(root), /SCHEDULER_STATE_INVALID/);
  });
});

test("unknown nested plan fields and a foreign live lock fail closed", async () => {
  await withScheduler(async () => {
    const root = fixture("nested-state-strict");
    const engine = new RecoveryEngine();
    await core.startScheduledBatch(root, ["Create the recovery result"], () => engine);
    const statePath = core.schedulerStatePaths(root).state;
    const value = JSON.parse(readFileSync(statePath, "utf8")) as core.SchedulerState & { tasks: Array<core.ScheduledTaskState & { plan: (core.ScheduledPlan & { extra?: boolean }) | null }> };
    value.tasks[0].plan!.extra = true;
    value.stateDigest = createHash("sha256").update(JSON.stringify({ ...value, stateDigest: "" })).digest("hex");
    writeFileSync(statePath, `${JSON.stringify(value, null, 2)}\n`);
    assert.throws(() => core.readSchedulerState(root), /SCHEDULER_STATE_INVALID|PLAN_INVALID/);

    const foreignRoot = fixture("foreign-lock");
    await core.startScheduledBatch(foreignRoot, ["Create the recovery result"], () => new RecoveryEngine());
    const foreignState = core.readSchedulerState(foreignRoot)!;
    writeFileSync(core.schedulerStatePaths(foreignRoot).lock, `${JSON.stringify({ runId: foreignState.runId, token: "foreign", pid: process.pid })}\n`, { flag: "wx" });
    assert.throws(() => core.recoverScheduledBatch(foreignRoot), /RECOVERY_UNPROVED/);
  });
});

test("the declared interruption matrix never retries a provider or duplicates a log row", async () => {
  await withScheduler(async () => {
    const boundaries = [
      "batch-reserved",
      "worktree-root-created",
      "planning-start:1",
      "plan-recorded:1",
      "task-worktree-intent:1",
      "task-worktree-created:1",
      "brief-write-intent:1",
      "brief-committed:1",
      "building-start:1",
      "building-result:1",
      "local-checks-intent:1",
      "task-commit:1",
      "integration-worktree-intent:1",
      "integration-worktree-created:1",
      "integration-commit-intent:1",
      "integration-commit-applied:1",
      "integration-checks-intent:1",
      "integration-candidate-frozen:1",
      "main-fast-forward-intent:",
      "main-fast-forward-observed:1",
      "integration-worktree-cleanup-intent:1",
      "task-branch-cleaned:1",
    ];
    for (const boundary of boundaries) {
      const root = fixture(`matrix-${boundary.replace(/[^a-z]+/gi, "-").slice(0, 36)}`);
      const engine = new RecoveryEngine();
      let injected = false;
      try {
        await core.startScheduledBatch(root, ["Create the recovery result"], () => engine, {
          onTransition: (name) => {
            if (!injected && (name === boundary || (boundary.endsWith(":") && name.startsWith(boundary)))) {
              injected = true;
              throw new Error(`synthetic interruption at ${boundary}`);
            }
          },
        });
      } catch (error) {
        assert.match(String(error), /synthetic interruption/);
      }
      assert.equal(injected, true, boundary);
      const state = core.readSchedulerState(root)!;
      assert.ok(state.tasks[0].phase !== "Done", `${boundary} must not leave a false Done state`);
      assert.ok(engine.calls <= 2, `${boundary} used at most one Planning and one Building call`);
      assert.ok(state.sessionCount <= 2, `${boundary} recorded no automatic retry`);
      assert.ok(state.maximumActiveEngines <= 1, `${boundary} kept one-task engine bounds`);
      assert.ok(core.parseLog(root).filter((row) => row.task === "001").length <= 1, `${boundary} did not duplicate the task log row`);
    }
  });
});
