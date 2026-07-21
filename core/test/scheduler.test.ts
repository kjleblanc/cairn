import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as core from "../src/index.js";
import type { Engine, RunEvents, RunSpec } from "../src/agents.js";

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "src");

test("Task 028 exposes one default-off two-task scheduler surface", () => {
  const api = core as Record<string, unknown>;
  assert.equal(typeof api.startScheduledBatch, "function");
  assert.equal(typeof api.schedulerSummary, "function");
  assert.equal(typeof api.schedulerFinalEnabled, "function");
  assert.equal(api.TWO_TASK_SCHEDULER_FINAL_ENV, "CAIRN_TWO_TASK_SCHEDULER_FINAL");
});

test("the new scheduler is separate from the historical coordinators", () => {
  const schedulerPath = join(sourceRoot, "scheduler.ts");
  assert.equal(existsSync(schedulerPath), true, "Task 028 must have its own scheduler module");
  const source = readFileSync(schedulerPath, "utf8");
  assert.match(source, /Planning/);
  assert.match(source, /Building/);
  assert.match(source, /Waiting/);
  assert.match(source, /Checking/);
  assert.match(source, /Done/);
  assert.match(source, /Needs attention/);
  assert.doesNotMatch(source, /bounded-provider|bounded-broker|bounded-messages|concurrent-run/);
});

test("scheduled planning and building have explicit restricted engine profiles", () => {
  const source = readFileSync(join(sourceRoot, "agents.ts"), "utf8");
  assert.match(source, /scheduler-planning/);
  assert.match(source, /scheduler-building/);
});

test("shell-free checks return the nested Node test process's real status", () => {
  const root = fixture("check-status");
  writeFileSync(join(root, "pass.test.mjs"), `import test from "node:test"; test("pass", () => {});\n`);
  assert.doesNotThrow(() => core.runShellFreeChecks(root, [{ executable: "node", args: ["--test", "pass.test.mjs"] }]));
  writeFileSync(join(root, "fail.test.mjs"), `import assert from "node:assert/strict"; import test from "node:test"; test("fail", () => assert.fail("expected failure"));\n`);
  assert.throws(() => core.runShellFreeChecks(root, [{ executable: "node", args: ["--test", "fail.test.mjs"] }]), /CHECK_FAILED/);
});

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function fixture(label: string): string {
  const root = mkdtempSync(join(tmpdir(), `cairn-task-028-${label}-`));
  const created = core.scaffoldProject(root, {
    name: "Task 028 scheduler fixture", what: "prove two safe tasks can be scheduled", who: "test",
    milestone: "two checked results reach main", timebox: "default",
  });
  git(root, ["init", "-b", "main"]);
  git(root, ["config", "user.name", "Cairn Test"]);
  git(root, ["config", "user.email", "cairn@example.invalid"]);
  git(root, ["add", "--", ...created.map((path) => relative(root, path).replace(/\\/g, "/"))]);
  git(root, ["commit", "-m", "synthetic start"]);
  return root;
}

interface FakePlanOptions {
  overlapFirst?: boolean;
  uncertainTask?: number;
  buildDelayMs?: number;
  planPaths?: (taskNumber: number, calls: number) => { implementation: string; test: string };
}

class ScheduledFakeEngine implements Engine {
  readonly planningCalls = new Map<number, number>();
  builderCalls = 0;
  readonly builderCallsByTask = new Map<number, number>();
  activeBuilders = 0;
  maximumBuilders = 0;
  private readonly planned = new Map<number, core.ScheduledPlan>();

  constructor(private readonly options: FakePlanOptions = {}) {}

  private plan(taskNumber: number): core.ScheduledPlan {
    const calls = (this.planningCalls.get(taskNumber) ?? 0) + 1;
    this.planningCalls.set(taskNumber, calls);
    const stem = this.options.overlapFirst && taskNumber === 2 && calls === 1 ? "alpha" : taskNumber === 1 ? "alpha" : "beta";
    const declared = this.options.planPaths?.(taskNumber, calls);
    const result = declared?.implementation ?? `${stem}.txt`;
    const testPath = declared?.test ?? `${stem}-${String(taskNumber).padStart(3, "0")}.test.mjs`;
    const uncertain = this.options.uncertainTask === taskNumber;
    const plan: core.ScheduledPlan = {
      schemaVersion: 1,
      taskNumber,
      outcome: `Create ${stem}`,
      independentlyUseful: `${stem} is useful on its own`,
      lane: "Standard",
      implementationPaths: [result],
      testPaths: [testPath],
      checks: [{ executable: "node", args: ["--test", testPath] }],
      dependencies: [],
      externalActions: [],
      certainty: uncertain ? "uncertain" : "certain",
      uncertaintyReason: uncertain ? "The exact safe file is not yet clear." : "",
      briefMarkdown: `# Task ${String(taskNumber).padStart(3, "0")} — scheduled fixture\n\nLane: **Standard**\n\nVisible outcome: create ${result}.\n\nImplementation paths: ${result}\nTest paths: ${testPath}\nChecks: node --test ${testPath}\n\nDONE when the exact check passes.\nSTOPPED if the bounded edit cannot finish.\n`,
    };
    this.planned.set(taskNumber, plan);
    return plan;
  }

  async run(spec: RunSpec, _events: RunEvents): Promise<{ text: string }> {
    const taskNumber = spec.taskNumber!;
    if (spec.schedulerProfile === "scheduler-planning") return { text: JSON.stringify(this.plan(taskNumber)) };
    assert.equal(spec.schedulerProfile, "scheduler-building");
    this.builderCalls += 1;
    this.builderCallsByTask.set(taskNumber, (this.builderCallsByTask.get(taskNumber) ?? 0) + 1);
    this.activeBuilders += 1;
    this.maximumBuilders = Math.max(this.maximumBuilders, this.activeBuilders);
    try {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, this.options.buildDelayMs ?? 40));
      const plan = this.planForBuild(taskNumber);
      const implementation = resolve(spec.root, plan.implementationPaths[0]);
      const testPath = resolve(spec.root, plan.testPaths[0]);
      mkdirSync(dirname(implementation), { recursive: true });
      writeFileSync(implementation, `scheduled result ${taskNumber}\n`);
      writeFileSync(testPath,
        `import assert from "node:assert/strict";\nimport { readFileSync } from "node:fs";\nimport test from "node:test";\ntest("exact scheduled result", () => assert.equal(readFileSync(new URL("./${basename(plan.implementationPaths[0])}", import.meta.url), "utf8").replace(/\\r\\n/g, "\\n"), ${JSON.stringify(`scheduled result ${taskNumber}\n`)}));\n`);
      const report = resolve(spec.root, `docs/ai-work/tasks/${String(taskNumber).padStart(3, "0")}-report.md`);
      mkdirSync(dirname(report), { recursive: true });
      writeFileSync(report, `# Task ${String(taskNumber).padStart(3, "0")} — report\n\nResult: exact fixture written.\n\nMilestone movement: YES\n\nDisposition: DONE\n`);
      return { text: "Disposition: DONE" };
    } finally {
      this.activeBuilders -= 1;
    }
  }

  private planForBuild(taskNumber: number): core.ScheduledPlan {
    const plan = this.planned.get(taskNumber);
    if (!plan) throw new Error(`No planned scope for Task ${taskNumber}`);
    return plan;
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

test("two disjoint Standard tasks build together and integrate one at a time", async () => {
  await withScheduler(async () => {
    const root = fixture("disjoint");
    const engine = new ScheduledFakeEngine({ buildDelayMs: 80 });
    const visible: core.SchedulerSummary[] = [];
    const result = await core.startScheduledBatch(root, ["Create alpha", "Create beta"], () => engine, {
      onState: (state) => visible.push(structuredClone(state)),
    });
    assert.deepEqual(result.tasks.map((task) => task.phase), ["Done", "Done"]);
    assert.equal(engine.builderCalls, 2);
    assert.equal(engine.maximumBuilders, 2);
    assert.equal(result.maximumActiveEngines, 2);
    assert.equal(result.sessionCount, 4);
    assert.ok(visible.some((state) => state.tasks.filter((task) => task.phase === "Building").length === 2));
    assert.ok(visible.every((state) => state.tasks.filter((task) => task.phase === "Checking").length <= 1));
    assert.equal(readFileSync(join(root, "alpha.txt"), "utf8").replace(/\r\n/g, "\n"), "scheduled result 1\n");
    assert.equal(readFileSync(join(root, "beta.txt"), "utf8").replace(/\r\n/g, "\n"), "scheduled result 2\n");
    const log = core.parseLog(root).slice(-2);
    assert.deepEqual(log.map((row) => [row.task, row.mode, row.outcome, row.decision]), [
      ["001", "Applied", "DONE", "completed"], ["002", "Applied", "DONE", "completed"],
    ]);
    assert.equal(git(root, ["status", "--porcelain=v1", "--untracked-files=all"]), "");
    assert.equal(git(root, ["worktree", "list", "--porcelain"]).match(/^worktree /gm)?.length, 1);
    assert.equal(git(root, ["branch", "--list", "cairn/task-*"]), "");
  });
});

test("an overlapping later task visibly waits, replans once, then builds on latest main", async () => {
  await withScheduler(async () => {
    const root = fixture("overlap");
    const engine = new ScheduledFakeEngine({ overlapFirst: true });
    const visible: core.SchedulerSummary[] = [];
    let secondBuilderCallsAtOverlap = -1;
    const result = await core.startScheduledBatch(root, ["Create alpha", "Create a possibly shared result"], () => engine, {
      onState: (state) => {
        visible.push(structuredClone(state));
        if (state.tasks[1].phase === "Waiting" && /overlap/i.test(state.tasks[1].waitingReason)) {
          secondBuilderCallsAtOverlap = engine.builderCallsByTask.get(2) ?? 0;
        }
      },
    });
    assert.ok(visible.some((state) => state.tasks[1].phase === "Waiting" && /overlap/i.test(state.tasks[1].waitingReason)));
    assert.equal(engine.planningCalls.get(2), 2);
    assert.equal(secondBuilderCallsAtOverlap, 0);
    assert.deepEqual(result.tasks.map((task) => task.phase), ["Done", "Done"]);
    assert.equal(result.sessionCount, 5);
  });
});

test("file/directory ancestor and case-only peer aliases visibly wait before any later builder", async () => {
  await withScheduler(async () => {
    for (const item of [
      { label: "ancestor", first: "nested", second: "nested/child.txt" },
      { label: "peer-case", first: "Result.txt", second: "result.txt" },
    ]) {
      const root = fixture(item.label);
      const engine = new ScheduledFakeEngine({
        planPaths: (taskNumber) => ({ implementation: taskNumber === 1 ? item.first : item.second, test: `scope-${taskNumber}.test.mjs` }),
      });
      let laterCallsAtWait = -1;
      const result = await core.startScheduledBatch(root, ["Create the earlier scoped result", "Create the later scoped result"], () => engine, {
        onState: (state) => {
          if (state.tasks[1].phase === "Waiting" && /overlap/i.test(state.tasks[1].waitingReason)) {
            laterCallsAtWait = engine.builderCallsByTask.get(2) ?? 0;
          }
        },
      });
      assert.equal(laterCallsAtWait, 0, `${item.label} overlap must wait before builder control`);
      assert.ok((engine.planningCalls.get(2) ?? 0) <= 2, "the later task replans at most once");
    }
  });
});

test("an uncertain task waits and receives no builder session", async () => {
  await withScheduler(async () => {
    const root = fixture("uncertain");
    const engine = new ScheduledFakeEngine({ uncertainTask: 1 });
    const result = await core.startScheduledBatch(root, ["Change something whose path is unclear"], () => engine);
    assert.equal(result.tasks[0].phase, "Waiting");
    assert.match(result.tasks[0].waitingReason, /exact safe file/i);
    assert.equal(engine.builderCalls, 0);
    assert.equal(result.sessionCount, 1);
    assert.equal(existsSync(join(root, "alpha.txt")), false);
  });
});

test("admission refuses a third task and protected dirty main before a builder effect", async () => {
  await withScheduler(async () => {
    const root = fixture("admission");
    const engine = new ScheduledFakeEngine();
    await assert.rejects(() => core.startScheduledBatch(root, ["first task", "second task", "third task"], () => engine), /OUTCOMES_INVALID/);
    writeFileSync(join(root, "protected-untracked.txt"), "keep me\n");
    await assert.rejects(() => core.startScheduledBatch(root, ["one safe task"], () => engine), /PROTECTED_WORK_PRESENT/);
    assert.equal(engine.builderCalls, 0);
  });
});

test("the Final switch is default-off and never admits the valuable Cairn repository", async () => {
  const root = fixture("default-off");
  const engine = new ScheduledFakeEngine();
  const previous = process.env.CAIRN_TWO_TASK_SCHEDULER_FINAL;
  try {
    delete process.env.CAIRN_TWO_TASK_SCHEDULER_FINAL;
    await assert.rejects(() => core.startScheduledBatch(root, ["Create one safe synthetic result"], () => engine), /SCHEDULER_DISABLED/);
    process.env.CAIRN_TWO_TASK_SCHEDULER_FINAL = "1";
    await assert.rejects(() => core.startScheduledBatch(process.cwd(), ["Must never run here"], () => engine), /SCHEDULER_SYNTHETIC_ONLY/);
    assert.equal(engine.builderCalls, 0);
  } finally {
    if (previous === undefined) delete process.env.CAIRN_TWO_TASK_SCHEDULER_FINAL;
    else process.env.CAIRN_TWO_TASK_SCHEDULER_FINAL = previous;
  }
});

test("strict plan validation rejects unknown keys, duplicates, aliases, and unsafe checks", () => {
  const root = fixture("plan-validation");
  const engine = new ScheduledFakeEngine();
  const valid = (engine as unknown as { plan: (taskNumber: number) => core.ScheduledPlan }).plan(1);
  assert.throws(() => core.validateScheduledPlan({ ...valid, extra: true }, root, 1), /PLAN_INVALID/);
  assert.throws(() => core.parseScheduledPlan(JSON.stringify(valid).replace('"outcome":', '"outcome":"shadow","outcome":'), root, 1), /Duplicate JSON key/);
  assert.throws(() => core.validateScheduledPlan({ ...valid, implementationPaths: ["Alpha.txt", "alpha.txt"] }, root, 1), /case alias/);
  assert.throws(() => core.validateScheduledPlan({ ...valid, implementationPaths: ["folder", "folder/file.txt"] }, root, 1), /overlap/);
  assert.throws(() => core.validateScheduledPlan({ ...valid, implementationPaths: ["../escape.txt"] }, root, 1), /Non-canonical/);
  assert.throws(() => core.validateScheduledPlan({ ...valid, implementationPaths: ["docs/ai-work/LOG.md"] }, root, 1), /Protected/);
  assert.throws(() => core.runShellFreeChecks(root, [{ executable: "node", args: ["-e", "process.exit(0)"] }]), /CHECK_EXECUTION_UNSAFE/);
});

class DeclarationEngine implements Engine {
  builderCalls = 0;
  constructor(private readonly mutate: (plan: core.ScheduledPlan) => unknown) {}
  async run(spec: RunSpec): Promise<{ text: string }> {
    if (spec.schedulerProfile === "scheduler-building") {
      this.builderCalls += 1;
      throw new Error("builder must not run for an unsafe declaration");
    }
    const taskNumber = spec.taskNumber!;
    const plan: core.ScheduledPlan = {
      schemaVersion: 1, taskNumber, outcome: "Create declaration evidence", independentlyUseful: "useful alone", lane: "Standard",
      implementationPaths: ["declared.txt"], testPaths: ["declared.test.mjs"],
      checks: [{ executable: "node", args: ["--test", "declared.test.mjs"] }], dependencies: [], externalActions: [],
      certainty: "certain", uncertaintyReason: "", briefMarkdown: `# Task ${String(taskNumber).padStart(3, "0")} declaration\n\nLane: **Standard**\n\nThis is complete bounded evidence.\n`,
    };
    return { text: JSON.stringify(this.mutate(plan)) };
  }
}

test("malformed, non-Standard, dependent, external-action, and unsafe-check plans wait with zero builder effect", async () => {
  await withScheduler(async () => {
    const cases: Array<[string, (plan: core.ScheduledPlan) => unknown]> = [
      ["malformed", (plan) => ({ ...plan, unknown: true })],
      ["tiny", (plan) => ({ ...plan, lane: "Tiny" })],
      ["dependent", (plan) => ({ ...plan, dependencies: [99] })],
      ["external", (plan) => ({ ...plan, externalActions: ["send a message"] })],
      ["unsafe-check", (plan) => ({ ...plan, checks: [{ executable: "node", args: ["-e", "process.exit(0)"] }] })],
    ];
    for (const [label, mutate] of cases) {
      const root = fixture(`wait-${label}`);
      const engine = new DeclarationEngine(mutate);
      const result = await core.startScheduledBatch(root, [`Create ${label} declaration evidence`], () => engine);
      assert.equal(result.tasks[0].phase, "Waiting", label);
      assert.equal(engine.builderCalls, 0, label);
      assert.equal(result.sessionCount, 1, label);
    }
  });
});

type FailureMode = "outside" | "delete" | "check";

class FailureEngine implements Engine {
  builderCalls = 0;
  constructor(private readonly mode: FailureMode, private readonly implementation = "allowed.txt") {}
  async run(spec: RunSpec): Promise<{ text: string }> {
    const taskNumber = spec.taskNumber!;
    const id = String(taskNumber).padStart(3, "0");
    const testPath = "allowed.test.mjs";
    if (spec.schedulerProfile === "scheduler-planning") {
      return { text: JSON.stringify({
        schemaVersion: 1, taskNumber, outcome: "Exercise one retained failure", independentlyUseful: "failure containment is useful", lane: "Standard",
        implementationPaths: [this.implementation], testPaths: [testPath], checks: [{ executable: "node", args: ["--test", testPath] }],
        dependencies: [], externalActions: [], certainty: "certain", uncertaintyReason: "",
        briefMarkdown: `# Task ${id} failure containment\n\nLane: **Standard**\n\nExact paths and checks are frozen for this synthetic control.\n`,
      }) };
    }
    this.builderCalls += 1;
    if (this.mode === "delete") unlinkSync(resolve(spec.root, this.implementation));
    else writeFileSync(resolve(spec.root, this.implementation), "allowed result\n");
    writeFileSync(resolve(spec.root, testPath), this.mode === "check"
      ? `import test from "node:test"; import assert from "node:assert/strict"; test("fails", () => assert.fail("synthetic check failure"));\n`
      : `import test from "node:test"; test("passes", () => {});\n`);
    if (this.mode === "outside") writeFileSync(resolve(spec.root, "outside.txt"), "must not integrate\n");
    const report = resolve(spec.root, `docs/ai-work/tasks/${id}-report.md`);
    mkdirSync(dirname(report), { recursive: true });
    writeFileSync(report, `# Task ${id} report\n\nMilestone movement: YES\n\nDisposition: DONE\n`);
    return { text: "Disposition: DONE" };
  }
}

test("outside writes, deletions, and failed checks retain Needs attention evidence without moving main", async () => {
  await withScheduler(async () => {
    for (const mode of ["outside", "delete", "check"] as const) {
      const root = fixture(`failure-${mode}`);
      if (mode === "delete") {
        writeFileSync(join(root, "tracked.txt"), "protected tracked file\n");
        git(root, ["add", "--", "tracked.txt"]);
        git(root, ["commit", "-m", "Add deletion target"]);
      }
      const before = git(root, ["rev-parse", "HEAD"]);
      const engine = new FailureEngine(mode, mode === "delete" ? "tracked.txt" : "allowed.txt");
      const result = await core.startScheduledBatch(root, [`Exercise the ${mode} failure control`], () => engine);
      assert.equal(result.tasks[0].phase, "Needs attention", mode);
      assert.equal(git(root, ["rev-parse", "HEAD"]), before, mode);
      assert.equal(core.parseLog(root).some((row) => row.task === "001"), false, mode);
      assert.ok(result.tasks[0].worktree, `${mode} evidence worktree retained`);
    }
  });
});

test("tamper, ref movement, duplicate log, and cleanup interference never produce a false Done", async () => {
  await withScheduler(async () => {
    const cases = ["brief-tamper", "task-commit", "main-move", "duplicate-log", "cleanup-interference"] as const;
    for (const mode of cases) {
      const root = fixture(`transition-${mode}`);
      const before = git(root, ["rev-parse", "HEAD"]);
      const engine = new ScheduledFakeEngine();
      let injected = false;
      const result = await core.startScheduledBatch(root, [`Exercise the ${mode} transition control`], () => engine, {
        onTransition: (name, state) => {
          if (injected) return;
          const task = state.tasks[0];
          if (mode === "brief-tamper" && name === "building:1") {
            writeFileSync(core.paths.brief(task.worktree, 1), "tampered after the frozen plan\n");
            injected = true;
          } else if (mode === "task-commit" && name === "task-commit:1") {
            writeFileSync(join(task.worktree, "alpha.txt"), "changed after the frozen commit\n");
            injected = true;
          } else if (mode === "main-move" && name === "task-commit:1") {
            writeFileSync(join(root, "external-main.txt"), "simulated foreign main movement\n");
            git(root, ["add", "--", "external-main.txt"]);
            git(root, ["commit", "-m", "Simulate unexpected main movement"]);
            injected = true;
          } else if (mode === "duplicate-log" && name === "integration-checks-passed:1") {
            core.appendLogRow(task.integrationWorktree, {
              task: "001", date: "2026-07-20", lane: "Standard", mode: "Applied", outcome: "DONE",
              decision: "completed", summary: "synthetic duplicate", moved: "YES",
            });
            injected = true;
          } else if (mode === "cleanup-interference" && name.startsWith("main-fast-forward-observed:1")) {
            writeFileSync(join(task.worktree, "foreign-untracked.txt"), "retain me\n");
            injected = true;
          }
        },
      });
      assert.equal(injected, true, mode);
      assert.equal(result.tasks[0].phase, "Needs attention", mode);
      if (mode === "brief-tamper") assert.equal(engine.builderCalls, 0, "tampered brief blocks builder control");
      if (mode === "cleanup-interference") {
        assert.notEqual(git(root, ["rev-parse", "HEAD"]), before, "main movement was durably observed before cleanup failed");
        assert.equal(core.parseLog(root).filter((row) => row.task === "001").length, 1);
      } else if (mode === "main-move") {
        assert.notEqual(git(root, ["rev-parse", "HEAD"]), before, "the test's foreign main commit is retained");
        assert.equal(core.parseLog(root).filter((row) => row.task === "001").length, 0);
      } else {
        assert.equal(git(root, ["rev-parse", "HEAD"]), before, mode);
      }
    }
  });
});
