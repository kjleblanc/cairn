import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  approveBrief,
  beginCoordinatedBuild,
  buildTask,
  coordinatorPaths,
  coordinatorSummary,
  defineTask,
  finishCoordinatedBuild,
  hasCoordinator,
  integrateNext,
  metadataBlock,
  parseLog,
  paths,
  queueTaskDecision,
  readCoordinatorState,
  recordApproval,
  recordCoordinatorApproval,
  registerTaskMetadata,
  reserveTask,
  reserveTaskWorktree,
  scaffoldProject,
  sha256File,
  validateTaskMetadata,
  type CoordinatorDecision,
  type CoordinatorTask,
  type Engine,
  type RunResult,
  type RunSpec,
  type TaskMetadata,
} from "../src/index.js";

process.env.CAIRN_PARALLEL_DRAFT = "1";

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function freshRepo(label: string): string {
  const root = mkdtempSync(join(tmpdir(), `cairn-task-016-${label}-`));
  scaffoldProject(root, {
    name: `Task 016 ${label}`,
    what: "synthetic parallel-safe regression rehearsal",
    who: "test",
    milestone: "replace unsafe parallel waiting with refusal",
    timebox: "default",
  });
  git(root, ["init", "-b", "main"]);
  git(root, ["config", "user.name", "Cairn Task 016 Regression"]);
  git(root, ["config", "user.email", "cairn-task-016@example.invalid"]);
  git(root, ["add", "--", "AGENTS.md", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md", "docs/ai-work/PILOT.md"]);
  git(root, ["commit", "-m", "Synthetic Task 016 project"]);
  console.log(`CAIRN_TASK_016_RETAINED_ROOT=${root}`);
  return root;
}

function metadata(path: string, options: Partial<TaskMetadata> = {}): TaskMetadata {
  return validateTaskMetadata({
    schemaVersion: 1,
    lane: "Standard",
    mode: "Draft",
    allowedPaths: [path],
    dependencies: [],
    checks: ['node -e "process.exit(0)"'],
    externalActions: [],
    ...options,
  });
}

function define(root: string, spec: TaskMetadata): CoordinatorTask {
  const task = reserveTaskWorktree(root);
  const briefPath = paths.brief(task.worktree, task.taskNumber);
  mkdirSync(dirname(briefPath), { recursive: true });
  writeFileSync(
    briefPath,
    `# Task ${String(task.taskNumber).padStart(3, "0")} — Task 016 rehearsal\n\n` +
      `Lane: ${spec.lane}\n\nMode: ${spec.mode}\n\n${metadataBlock(spec)}\n`,
  );
  return registerTaskMetadata(root, task.taskNumber, spec);
}

function approve(root: string, task: CoordinatorTask): CoordinatorTask {
  const briefPath = paths.brief(task.worktree, task.taskNumber);
  const approval = recordApproval(task.taskNumber, briefPath);
  const approvalPath = paths.approval(task.worktree, task.taskNumber);
  writeFileSync(approvalPath, JSON.stringify(approval, null, 2) + "\n");
  return recordCoordinatorApproval(root, task.taskNumber, sha256File(approvalPath));
}

function defineAndApprove(root: string, spec: TaskMetadata): CoordinatorTask {
  return approve(root, define(root, spec));
}

function buildCandidate(root: string, taskNumber: number, path: string, content: string): CoordinatorTask {
  const task = beginCoordinatedBuild(root, taskNumber);
  const target = join(task.worktree, ...path.split("/"));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  writeFileSync(paths.report(task.worktree, taskNumber), "# Task 016 report\n\nDisposition: DONE\n");
  return finishCoordinatedBuild(root, taskNumber, "DONE");
}

function decision(taskNumber: number): CoordinatorDecision {
  const task = String(taskNumber).padStart(3, "0");
  return {
    decision: "accept",
    summary: `Task ${task} synthetic acceptance`,
    moved: "YES",
    decidedAt: "2026-07-19T00:00:00.000Z",
    row: {
      task,
      date: "2026-07-19",
      lane: "Standard",
      mode: "Draft",
      outcome: "DONE",
      decision: "accept",
      summary: `Task ${task} synthetic acceptance`,
      moved: "YES",
    },
  };
}

function capture(action: () => unknown): string {
  try {
    action();
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

async function captureAsync(action: () => Promise<unknown>): Promise<string> {
  try {
    await action();
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

class CallbackEngine implements Engine {
  constructor(private readonly callback: (spec: RunSpec) => RunResult | Promise<RunResult>) {}
  run(spec: RunSpec): Promise<RunResult> {
    return Promise.resolve(this.callback(spec));
  }
}

test("High-Stakes, Tiny, Final, dependent, and external-action work is refused before approval", () => {
  const cases: Array<{ label: string; setup: (root: string) => TaskMetadata; blocker: string }> = [
    { label: "high-stakes", setup: () => metadata("high.txt", { lane: "High-Stakes" }), blocker: "PARALLEL_EXCLUSIVE_REFUSED" },
    { label: "tiny", setup: () => metadata("tiny.txt", { lane: "Tiny" }), blocker: "PARALLEL_EXCLUSIVE_REFUSED" },
    { label: "final", setup: () => metadata("final.txt", { mode: "Final" }), blocker: "PARALLEL_EXCLUSIVE_REFUSED" },
    {
      label: "dependent",
      setup: (root) => {
        define(root, metadata("dependency-source.txt"));
        return metadata("dependent.txt", { dependencies: [1] });
      },
      blocker: "PARALLEL_EXCLUSIVE_REFUSED",
    },
    {
      label: "external-action",
      setup: () => metadata("external.txt", { externalActions: ["send a message"] }),
      blocker: "PARALLEL_EXTERNAL_ACTION_REFUSED",
    },
  ];
  const observed = cases.map(({ label, setup, blocker }) => {
    const root = freshRepo(`refuse-${label}`);
    const task = define(root, setup(root));
    const approvalError = capture(() => approveBrief(root, task.taskNumber));
    const current = readCoordinatorState(root).tasks.find((item) => item.taskNumber === task.taskNumber)!;
    return {
      label,
      phase: current.phase,
      blocker: current.blocker,
      approvalRefused: new RegExp(blocker).test(approvalError),
      approvalAbsent: !existsSync(paths.approval(current.worktree, current.taskNumber)),
      waitingReason: coordinatorSummary(root).tasks.find((item) => item.taskNumber === task.taskNumber)?.waitingReason,
    };
  });
  assert.deepEqual(observed, cases.map(({ label, blocker }) => ({
    label,
    phase: "refused",
    blocker,
    approvalRefused: true,
    approvalAbsent: true,
    waitingReason: "",
  })));
});

test("exact and ancestor-or-descendant path conflicts refuse the later task", () => {
  const cases = [
    { label: "exact", first: "shared/item.txt", second: "shared/item.txt" },
    { label: "ancestor", first: "area", second: "area/item.txt" },
    { label: "descendant", first: "area/item.txt", second: "area" },
  ];
  const observed = cases.map(({ label, first, second }) => {
    const root = freshRepo(`overlap-${label}`);
    const admitted = define(root, metadata(first));
    const refused = define(root, metadata(second));
    const approvalError = capture(() => approveBrief(root, refused.taskNumber));
    const state = readCoordinatorState(root);
    return {
      label,
      admittedPhase: state.tasks.find((item) => item.taskNumber === admitted.taskNumber)?.phase,
      refusedPhase: state.tasks.find((item) => item.taskNumber === refused.taskNumber)?.phase,
      refusedBlocker: state.tasks.find((item) => item.taskNumber === refused.taskNumber)?.blocker,
      approvalRefused: /PARALLEL_SCOPE_OVERLAP/.test(approvalError),
      approvalAbsent: !existsSync(paths.approval(refused.worktree, refused.taskNumber)),
    };
  });
  assert.deepEqual(observed, cases.map(({ label }) => ({
    label,
    admittedPhase: "defined",
    refusedPhase: "refused",
    refusedBlocker: "PARALLEL_SCOPE_OVERLAP",
    approvalRefused: true,
    approvalAbsent: true,
  })));
});

test("a malformed provisional definition is refused and cannot obstruct an admitted peer", async () => {
  const root = freshRepo("malformed-does-not-block");
  const eligible = defineAndApprove(root, metadata("eligible.txt"));
  const malformed = new CallbackEngine((spec) => {
    const briefPath = paths.brief(spec.root, spec.taskNumber!);
    mkdirSync(dirname(briefPath), { recursive: true });
    writeFileSync(briefPath, "# malformed brief\n\n```cairn-task-metadata\n{not json}\n```\n");
    return { text: "malformed definition written" };
  });
  const definitionError = await captureAsync(() => defineTask(root, "malformed parallel task", malformed));
  const buildError = capture(() => beginCoordinatedBuild(root, eligible.taskNumber));
  const state = readCoordinatorState(root);
  assert.deepEqual(
    {
      definitionRefused: /PARALLEL_CLASSIFICATION_REFUSED/.test(definitionError),
      provisionalPhase: state.tasks[1]?.phase,
      provisionalBlocker: state.tasks[1]?.blocker,
      eligibleBuildError: buildError,
      eligiblePhase: state.tasks[0]?.phase,
    },
    {
      definitionRefused: true,
      provisionalPhase: "refused",
      provisionalBlocker: "PARALLEL_CLASSIFICATION_REFUSED",
      eligibleBuildError: "",
      eligiblePhase: "building",
    },
  );
});

test("two admitted tasks consume both slots and a third reservation gets no identity", () => {
  const root = freshRepo("two-slot-limit");
  define(root, metadata("first.txt"));
  define(root, metadata("second.txt"));
  const before = readCoordinatorState(root);
  const error = capture(() => reserveTask(root));
  const after = readCoordinatorState(root);
  assert.match(error, /CONCURRENCY_LIMIT/);
  assert.equal(after.tasks.length, 2);
  assert.equal(after.nextTaskNumber, before.nextTaskNumber);
  assert.equal(git(root, ["branch", "--list", "cairn/task-003"]), "");
});

test("approval-byte tampering blocks an initial builder before engine entry", async () => {
  const root = freshRepo("initial-approval-tamper");
  const task = define(root, metadata("result.txt"));
  approveBrief(root, task.taskNumber);
  const approvalPath = paths.approval(task.worktree, task.taskNumber);
  writeFileSync(approvalPath, readFileSync(approvalPath, "utf8") + "\n");
  let calls = 0;
  const engine = new CallbackEngine((spec) => {
    calls++;
    writeFileSync(join(spec.root, "result.txt"), "builder received control\n");
    writeFileSync(paths.report(spec.root, spec.taskNumber!), "Disposition: DONE\n");
    return { text: "builder ran" };
  });
  const error = await captureAsync(() => buildTask(root, task.taskNumber, engine));
  const current = readCoordinatorState(root).tasks[0];
  assert.deepEqual(
    { blocked: /APPROVAL_CHANGED/.test(error), calls, marker: existsSync(join(task.worktree, "result.txt")), phase: current.phase },
    { blocked: true, calls: 0, marker: false, phase: "approved" },
  );
});

test("approval-byte tampering blocks a builder retry and preserves its blocker and partial work", async () => {
  const root = freshRepo("retry-approval-tamper");
  const task = define(root, metadata("result.txt"));
  approveBrief(root, task.taskNumber);
  const failing = new CallbackEngine((spec) => {
    writeFileSync(join(spec.root, "result.txt"), "partial builder bytes\n");
    throw new Error("synthetic first builder failure");
  });
  assert.match(await captureAsync(() => buildTask(root, task.taskNumber, failing)), /BUILDER_ENGINE_FAILED/);
  const approvalPath = paths.approval(task.worktree, task.taskNumber);
  writeFileSync(approvalPath, readFileSync(approvalPath, "utf8") + "\n");
  let retryCalls = 0;
  const retry = new CallbackEngine(() => {
    retryCalls++;
    return { text: "retry received control" };
  });
  const error = await captureAsync(() => buildTask(root, task.taskNumber, retry));
  const current = readCoordinatorState(root).tasks[0];
  assert.deepEqual(
    {
      blocked: /APPROVAL_CHANGED/.test(error),
      retryCalls,
      phase: current.phase,
      blocker: current.blocker,
      partial: readFileSync(join(task.worktree, "result.txt"), "utf8"),
    },
    {
      blocked: true,
      retryCalls: 0,
      phase: "blocked",
      blocker: "BUILDER_ENGINE_FAILED",
      partial: "partial builder bytes\n",
    },
  );
});

test("two eligible disjoint tasks can build concurrently", () => {
  const root = freshRepo("eligible-concurrent-control");
  const first = defineAndApprove(root, metadata("first.txt"));
  const second = defineAndApprove(root, metadata("second.txt"));
  assert.equal(beginCoordinatedBuild(root, first.taskNumber).phase, "building");
  assert.equal(beginCoordinatedBuild(root, second.taskNumber).phase, "building");
  assert.equal(coordinatorSummary(root).tasks.filter((task) => task.phase === "building").length, 2);
});

test("eligible decisions still integrate one at a time from their frozen commits", () => {
  const root = freshRepo("serial-integration-control");
  const first = defineAndApprove(root, metadata("first.txt"));
  const second = defineAndApprove(root, metadata("second.txt"));
  buildCandidate(root, first.taskNumber, "first.txt", "first candidate\n");
  buildCandidate(root, second.taskNumber, "second.txt", "second candidate\n");
  queueTaskDecision(root, first.taskNumber, decision(first.taskNumber));
  queueTaskDecision(root, second.taskNumber, decision(second.taskNumber));
  const firstIntegrated = integrateNext(root);
  const middle = readCoordinatorState(root);
  assert.equal(firstIntegrated?.taskNumber, first.taskNumber);
  assert.equal(middle.tasks.find((item) => item.taskNumber === first.taskNumber)?.phase, "integrated");
  assert.equal(middle.tasks.find((item) => item.taskNumber === second.taskNumber)?.phase, "queued");
  assert.deepEqual(middle.integrationQueue, [second.taskNumber]);
  const secondIntegrated = integrateNext(root);
  assert.equal(secondIntegrated?.taskNumber, second.taskNumber);
  assert.equal(parseLog(root).length, 2);
});

test("without the flag, task definition stays on the serial path and creates no coordinator", () => {
  const root = freshRepo("default-serial-control");
  const moduleUrl = new URL("../src/index.js", import.meta.url).href;
  const script = `
    import { mkdirSync, writeFileSync } from "node:fs";
    import { dirname } from "node:path";
    import { defineTask, hasCoordinator, paths } from ${JSON.stringify(moduleUrl)};
    const root = process.argv[1];
    const engine = { async run(spec) {
      const brief = paths.brief(spec.root, spec.taskNumber);
      mkdirSync(dirname(brief), { recursive: true });
      writeFileSync(brief, "# serial brief\\n");
      return { text: "serial definition" };
    }};
    const result = await defineTask(root, "serial control", engine);
    console.log(JSON.stringify({ taskNumber: result.taskNumber, coordinated: hasCoordinator(root) }));
  `;
  const env = { ...process.env };
  delete env.CAIRN_PARALLEL_DRAFT;
  const output = execFileSync(process.execPath, ["--input-type=module", "-e", script, root], {
    encoding: "utf8",
    env,
  }).trim();
  assert.deepEqual(JSON.parse(output), { taskNumber: 1, coordinated: false });
  assert.equal(hasCoordinator(root), false);
  assert.equal(existsSync(coordinatorPaths(root).state), false);
  assert.equal(git(root, ["branch", "--list", "cairn/task-*"]), "");
});
