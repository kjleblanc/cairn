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
  integrateNext,
  metadataBlock,
  parseLog,
  paths,
  queueTaskDecision,
  readCoordinatorState,
  recordApproval,
  recordCoordinatorApproval,
  registerTaskMetadata,
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
  const root = mkdtempSync(join(tmpdir(), `cairn-task-015-${label}-`));
  scaffoldProject(root, {
    name: `Task 015 ${label}`,
    what: "synthetic regression rehearsal",
    who: "test",
    milestone: "repair the disabled parallel coordinator",
    timebox: "default",
  });
  git(root, ["init", "-b", "main"]);
  git(root, ["config", "user.name", "Cairn Task 015 Regression"]);
  git(root, ["config", "user.email", "cairn-task-015@example.invalid"]);
  git(root, ["add", "--", "AGENTS.md", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md", "docs/ai-work/PILOT.md"]);
  git(root, ["commit", "-m", "Synthetic Task 015 project"]);
  console.log(`CAIRN_TASK_015_RETAINED_ROOT=${root}`);
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

function defineOnly(root: string, spec: TaskMetadata): CoordinatorTask {
  const task = reserveTaskWorktree(root);
  const briefPath = paths.brief(task.worktree, task.taskNumber);
  mkdirSync(dirname(briefPath), { recursive: true });
  writeFileSync(
    briefPath,
    `# Task ${String(task.taskNumber).padStart(3, "0")} — regression brief\n\n` +
      `Lane: ${spec.lane}\n\nMode: ${spec.mode}\n\n${metadataBlock(spec)}\n`,
  );
  return registerTaskMetadata(root, task.taskNumber, spec);
}

function defineAndApprove(root: string, spec: TaskMetadata): CoordinatorTask {
  const task = defineOnly(root, spec);
  const briefPath = paths.brief(task.worktree, task.taskNumber);
  const approval = recordApproval(task.taskNumber, briefPath);
  const approvalPath = paths.approval(task.worktree, task.taskNumber);
  writeFileSync(approvalPath, JSON.stringify(approval, null, 2) + "\n");
  return recordCoordinatorApproval(root, task.taskNumber, sha256File(approvalPath));
}

function buildCandidate(root: string, taskNumber: number, path: string, content: string): CoordinatorTask {
  const task = beginCoordinatedBuild(root, taskNumber);
  const target = join(task.worktree, ...path.split("/"));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  writeFileSync(paths.report(task.worktree, taskNumber), "# regression report\n\nDisposition: DONE\n");
  return finishCoordinatedBuild(root, taskNumber, "DONE");
}

function acceptedDecision(taskNumber: number): CoordinatorDecision {
  const task = String(taskNumber).padStart(3, "0");
  return {
    decision: "accept",
    summary: "Task 015 synthetic acceptance",
    moved: "YES",
    decidedAt: "2026-07-19T00:00:00.000Z",
    row: {
      task,
      date: "2026-07-19",
      lane: "Standard",
      mode: "Draft",
      outcome: "DONE",
      decision: "accept",
      summary: "Task 015 synthetic acceptance",
      moved: "YES",
    },
  };
}

function decisionCommit(task: CoordinatorTask): string | undefined {
  return (task as CoordinatorTask & { decisionCommit?: string }).decisionCommit;
}

test("a post-decision allowed-path commit is refused without changing main, its log, or the moved task branch", () => {
  const root = freshRepo("decision-branch-moved");
  const task = defineAndApprove(root, metadata("candidate.txt"));
  buildCandidate(root, task.taskNumber, "candidate.txt", "owner-approved bytes\n");
  const queued = queueTaskDecision(root, task.taskNumber, acceptedDecision(task.taskNumber));
  const frozen = decisionCommit(queued);

  writeFileSync(join(task.worktree, "candidate.txt"), "post-decision bytes\n");
  git(task.worktree, ["add", "--", "candidate.txt"]);
  git(task.worktree, ["commit", "-m", "Post-decision allowed-path movement"]);
  const movedBranch = git(root, ["rev-parse", task.branch]);
  assert.notEqual(movedBranch, frozen, "the rehearsal must really move the task after the decision");

  const mainBefore = git(root, ["rev-parse", "refs/heads/main"]);
  const logBefore = readFileSync(paths.log(root));
  let integrationError = "";
  try {
    integrateNext(root);
  } catch (error) {
    integrationError = error instanceof Error ? error.message : String(error);
  }
  const mainAfter = git(root, ["rev-parse", "refs/heads/main"]);
  const logAfter = readFileSync(paths.log(root));
  const branchAfter = git(root, ["rev-parse", task.branch]);
  const worktreeAfter = git(task.worktree, ["rev-parse", "HEAD"]);
  const stopped = readCoordinatorState(root).tasks.find((item) => item.taskNumber === task.taskNumber)!;
  assert.deepEqual(
    {
      frozenCommitIsFull: /^[0-9a-f]{40}$/.test(frozen ?? ""),
      movementWasRefused: /DECISION_BRANCH_MOVED/.test(integrationError),
      mainUnchanged: mainAfter === mainBefore,
      logUnchanged: logAfter.equals(logBefore),
      evidenceBranchPreserved: branchAfter === movedBranch,
      taskWorktreePreserved: worktreeAfter === movedBranch,
      phase: stopped.phase,
      blocker: stopped.blocker,
    },
    {
      frozenCommitIsFull: true,
      movementWasRefused: true,
      mainUnchanged: true,
      logUnchanged: true,
      evidenceBranchPreserved: true,
      taskWorktreePreserved: true,
      phase: "blocked",
      blocker: "DECISION_BRANCH_MOVED",
    },
  );
});

test("a retained queued decision without a frozen commit fails closed", () => {
  const root = freshRepo("legacy-missing-decision-commit");
  const task = defineAndApprove(root, metadata("candidate.txt"));
  buildCandidate(root, task.taskNumber, "candidate.txt", "candidate\n");
  queueTaskDecision(root, task.taskNumber, acceptedDecision(task.taskNumber));
  const statePath = coordinatorPaths(root).state;
  const retained = JSON.parse(readFileSync(statePath, "utf8")) as { tasks: Array<Record<string, unknown>> };
  delete retained.tasks[0].decisionCommit;
  writeFileSync(statePath, JSON.stringify(retained, null, 2) + "\n");
  const mainBefore = git(root, ["rev-parse", "refs/heads/main"]);
  const logBefore = readFileSync(paths.log(root));
  assert.throws(() => integrateNext(root), /DECISION_COMMIT_MISSING/);
  assert.equal(git(root, ["rev-parse", "refs/heads/main"]), mainBefore);
  assert.deepEqual(readFileSync(paths.log(root)), logBefore);
});

test("a malformed retained decision commit is rejected as unsupported state", () => {
  const root = freshRepo("malformed-decision-commit");
  const task = defineAndApprove(root, metadata("candidate.txt"));
  buildCandidate(root, task.taskNumber, "candidate.txt", "candidate\n");
  queueTaskDecision(root, task.taskNumber, acceptedDecision(task.taskNumber));
  const statePath = coordinatorPaths(root).state;
  const retained = JSON.parse(readFileSync(statePath, "utf8")) as { tasks: Array<Record<string, unknown>> };
  retained.tasks[0].decisionCommit = "abc123";
  writeFileSync(statePath, JSON.stringify(retained, null, 2) + "\n");
  assert.throws(() => readCoordinatorState(root), /UNSUPPORTED_STATE/);
});

function assertOlderUnsafeTaskIsRefused(label: string, options: Partial<TaskMetadata>, blocker: string): void {
  const root = freshRepo(`older-${label}`);
  const first = defineOnly(root, metadata(`${label}.txt`, options));
  const second = defineAndApprove(root, metadata("later-standard.txt"));
  assert.equal(first.phase, "refused");
  assert.equal(first.blocker, blocker);
  assert.equal(beginCoordinatedBuild(root, second.taskNumber).phase, "building");
}

test("an earlier High-Stakes task is refused without delaying a later Standard Draft", () => {
  assertOlderUnsafeTaskIsRefused("high-stakes", { lane: "High-Stakes" }, "PARALLEL_EXCLUSIVE_REFUSED");
});

test("an earlier Final task is refused without delaying a later Standard Draft", () => {
  assertOlderUnsafeTaskIsRefused("final", { mode: "Final" }, "PARALLEL_EXCLUSIVE_REFUSED");
});

test("an earlier live-action task is refused without delaying a later Standard Draft", () => {
  assertOlderUnsafeTaskIsRefused(
    "live-action",
    { externalActions: ["synthetic live action — never executed"] },
    "PARALLEL_EXTERNAL_ACTION_REFUSED",
  );
});

test("two disjoint Standard Draft tasks remain parallel-eligible", () => {
  const root = freshRepo("disjoint-standard-drafts");
  const first = defineAndApprove(root, metadata("first.txt"));
  const second = defineAndApprove(root, metadata("second.txt"));
  assert.equal(beginCoordinatedBuild(root, first.taskNumber).phase, "building");
  assert.equal(beginCoordinatedBuild(root, second.taskNumber).phase, "building");
  assert.equal(coordinatorSummary(root).tasks.filter((task) => task.phase === "building").length, 2);
});

class CallbackEngine implements Engine {
  constructor(private readonly callback: (spec: RunSpec) => RunResult | Promise<RunResult>) {}
  run(spec: RunSpec): Promise<RunResult> {
    return Promise.resolve(this.callback(spec));
  }
}

function definitionEngine(observeExisting = false): Engine {
  return new CallbackEngine((spec) => {
    assert.equal(spec.role, "definer");
    assert.ok(spec.taskNumber);
    const briefPath = paths.brief(spec.root, spec.taskNumber!);
    if (observeExisting) assert.equal(existsSync(briefPath), true, "the partial brief must survive until retry");
    const specMetadata = metadata(`result-${String(spec.taskNumber).padStart(3, "0")}.txt`);
    mkdirSync(dirname(briefPath), { recursive: true });
    writeFileSync(
      briefPath,
      `# Task ${String(spec.taskNumber).padStart(3, "0")} — recovered definition\n\n` +
        `Lane: Standard\n\nMode: Draft\n\n${metadataBlock(specMetadata)}\n`,
    );
    return { text: "definition recovered" };
  });
}

async function captureAsync<T>(action: () => Promise<T>): Promise<{ value?: T; error: string }> {
  try {
    return { value: await action(), error: "" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

test("a successful custom definer creates its brief after establishing the parent directory", async () => {
  const root = freshRepo("custom-definer-setup-control");
  const defined = await defineTask(root, "prove the custom definer setup", definitionEngine());
  assert.equal(defined.taskNumber, 1);
  assert.equal(existsSync(defined.briefPath), true);
  assert.equal(readCoordinatorState(root).tasks[0].phase, "defined");
});

function successfulBuilder(observePartial = false): Engine {
  return new CallbackEngine((spec) => {
    assert.equal(spec.role, "builder");
    assert.ok(spec.taskNumber);
    const output = join(spec.root, `result-${String(spec.taskNumber).padStart(3, "0")}.txt`);
    if (observePartial) assert.equal(readFileSync(output, "utf8"), "partial builder bytes\n");
    writeFileSync(output, "recovered builder bytes\n");
    writeFileSync(paths.report(spec.root, spec.taskNumber!), "# recovered report\n\nDisposition: DONE\n");
    return { text: "builder recovered" };
  });
}

test("a thrown definer becomes retryable without reserving a new task or discarding its partial brief", async () => {
  const root = freshRepo("definer-engine-recovery");
  const rawFailure = "raw-definer-engine-text-must-not-enter-state";
  const failing = new CallbackEngine((spec) => {
    assert.equal(spec.role, "definer");
    assert.ok(spec.taskNumber);
    const briefPath = paths.brief(spec.root, spec.taskNumber!);
    mkdirSync(dirname(briefPath), { recursive: true });
    writeFileSync(briefPath, "partial brief retained for inspection\n");
    throw new Error(rawFailure);
  });

  const firstRun = await captureAsync(() => defineTask(root, "recover the same definition", failing));
  const firstFailure = readCoordinatorState(root);
  const identity = firstFailure.tasks[0];
  const head = git(identity.worktree, ["rev-parse", "HEAD"]);

  const repeatedRun = await captureAsync(() => defineTask(root, "retry and fail once more", failing));
  const repeated = readCoordinatorState(root);

  const recoveredRun = await captureAsync(() => defineTask(root, "retry the retained definition", definitionEngine(true)));
  const final = readCoordinatorState(root);
  assert.deepEqual(
    {
      firstErrorIsStable: /DEFINER_ENGINE_FAILED/.test(firstRun.error),
      firstTaskNumber: identity.taskNumber,
      firstPhase: identity.phase,
      firstBlocker: identity.blocker,
      rawErrorStored: JSON.stringify(firstFailure).includes(rawFailure),
      repeatedErrorIsStable: /DEFINER_ENGINE_FAILED/.test(repeatedRun.error),
      repeatedTaskCount: repeated.tasks.length,
      repeatedBlocker: repeated.tasks[0]?.blocker,
      recoveredError: recoveredRun.error,
      recoveredTaskNumber: recoveredRun.value?.taskNumber,
      finalTaskCount: final.tasks.length,
      nextTaskNumber: final.nextTaskNumber,
      sameBranch: final.tasks[0]?.branch === identity.branch,
      sameWorktree: final.tasks[0]?.worktree === identity.worktree,
      sameHead: git(identity.worktree, ["rev-parse", "HEAD"]) === head,
      finalPhase: final.tasks[0]?.phase,
      finalBlocker: final.tasks[0]?.blocker,
    },
    {
      firstErrorIsStable: true,
      firstTaskNumber: 1,
      firstPhase: "blocked",
      firstBlocker: "DEFINER_ENGINE_FAILED",
      rawErrorStored: false,
      repeatedErrorIsStable: true,
      repeatedTaskCount: 1,
      repeatedBlocker: "DEFINER_ENGINE_FAILED",
      recoveredError: "",
      recoveredTaskNumber: identity.taskNumber,
      finalTaskCount: 1,
      nextTaskNumber: 2,
      sameBranch: true,
      sameWorktree: true,
      sameHead: true,
      finalPhase: "defined",
      finalBlocker: undefined,
    },
  );
});

test("a thrown builder becomes retryable without changing task identity or discarding partial allowed work", async () => {
  const root = freshRepo("builder-engine-recovery");
  const defined = await defineTask(root, "prepare a recoverable build", definitionEngine());
  approveBrief(root, defined.taskNumber);
  const identity = readCoordinatorState(root).tasks[0];
  const head = git(identity.worktree, ["rev-parse", "HEAD"]);
  const rawFailure = "raw-builder-engine-text-must-not-enter-state";
  const failing = new CallbackEngine((spec) => {
    assert.equal(spec.role, "builder");
    assert.ok(spec.taskNumber);
    writeFileSync(join(spec.root, `result-${String(spec.taskNumber).padStart(3, "0")}.txt`), "partial builder bytes\n");
    throw new Error(rawFailure);
  });

  const firstRun = await captureAsync(() => buildTask(root, defined.taskNumber, failing));
  const firstFailure = readCoordinatorState(root);

  const repeatedRun = await captureAsync(() => buildTask(root, defined.taskNumber, failing));
  const repeated = readCoordinatorState(root);

  const recoveredRun = await captureAsync(() => buildTask(root, defined.taskNumber, successfulBuilder(true)));
  const final = readCoordinatorState(root);
  assert.deepEqual(
    {
      firstErrorIsStable: /BUILDER_ENGINE_FAILED/.test(firstRun.error),
      firstPhase: firstFailure.tasks[0]?.phase,
      firstBlocker: firstFailure.tasks[0]?.blocker,
      rawErrorStored: JSON.stringify(firstFailure).includes(rawFailure),
      repeatedErrorIsStable: /BUILDER_ENGINE_FAILED/.test(repeatedRun.error),
      repeatedTaskCount: repeated.tasks.length,
      repeatedBlocker: repeated.tasks[0]?.blocker,
      recoveredError: recoveredRun.error,
      recoveredDisposition: recoveredRun.value?.disposition,
      finalTaskCount: final.tasks.length,
      nextTaskNumber: final.nextTaskNumber,
      sameTaskNumber: final.tasks[0]?.taskNumber === identity.taskNumber,
      sameBranch: final.tasks[0]?.branch === identity.branch,
      sameWorktree: final.tasks[0]?.worktree === identity.worktree,
      sameApproval: final.tasks[0]?.approvalSha256 === identity.approvalSha256,
      sameHead: git(identity.worktree, ["rev-parse", "HEAD"]) === head,
      finalPhase: final.tasks[0]?.phase,
      finalBlocker: final.tasks[0]?.blocker,
    },
    {
      firstErrorIsStable: true,
      firstPhase: "blocked",
      firstBlocker: "BUILDER_ENGINE_FAILED",
      rawErrorStored: false,
      repeatedErrorIsStable: true,
      repeatedTaskCount: 1,
      repeatedBlocker: "BUILDER_ENGINE_FAILED",
      recoveredError: "",
      recoveredDisposition: "DONE",
      finalTaskCount: 1,
      nextTaskNumber: 2,
      sameTaskNumber: true,
      sameBranch: true,
      sameWorktree: true,
      sameApproval: true,
      sameHead: true,
      finalPhase: "report",
      finalBlocker: undefined,
    },
  );
});
