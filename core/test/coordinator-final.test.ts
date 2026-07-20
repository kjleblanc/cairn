import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  approveBrief,
  createTaskWorktree,
  metadataBlock,
  paths,
  readCoordinatorState,
  refineBrief,
  registerTaskMetadata,
  reserveTask,
  scaffoldProject,
  validateTaskMetadata,
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
  const root = mkdtempSync(join(tmpdir(), `cairn-task-024-red-${label}-`));
  scaffoldProject(root, {
    name: `Task 024 red ${label}`,
    what: "independent Task 016 regression reproduction",
    who: "test",
    milestone: "fail closed before unsafe coordinator effects",
    timebox: "default",
  });
  git(root, ["init", "-b", "main"]);
  git(root, ["config", "user.name", "Cairn Task 024 Red"]);
  git(root, ["config", "user.email", "cairn-task-024-red@example.invalid"]);
  git(root, ["add", "--", "AGENTS.md", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md", "docs/ai-work/PILOT.md"]);
  git(root, ["commit", "-m", "Synthetic Task 024 red project"]);
  console.log(`CAIRN_TASK_024_RED_ROOT=${root}`);
  return root;
}

function metadata(path: string): TaskMetadata {
  return validateTaskMetadata({
    schemaVersion: 1,
    lane: "Standard",
    mode: "Draft",
    allowedPaths: [path],
    dependencies: [],
    checks: ['node -e "process.exit(0)"'],
    externalActions: [],
  });
}

function writeBrief(worktree: string, taskNumber: number, spec: TaskMetadata): void {
  const brief = paths.brief(worktree, taskNumber);
  mkdirSync(dirname(brief), { recursive: true });
  writeFileSync(
    brief,
    `# Task ${String(taskNumber).padStart(3, "0")} — independent red control\n\n${metadataBlock(spec)}\n`,
  );
}

function cleanupOwned(root: string): void {
  let state: ReturnType<typeof readCoordinatorState> | undefined;
  try { state = readCoordinatorState(root); } catch { state = undefined; }
  for (const task of [...(state?.tasks ?? [])].reverse()) {
    if (existsSync(task.worktree)) {
      try { git(root, ["worktree", "remove", "--force", task.worktree]); } catch { /* test evidence remains */ }
    }
    try { git(root, ["branch", "-D", task.branch]); } catch { /* absent is fine */ }
  }
  try { git(root, ["worktree", "prune"]); } catch { /* inspection will expose leftovers */ }
  const stateDir = join(root, ".git", "cairn");
  if (existsSync(stateDir)) rmSync(stateDir, { recursive: true, force: true });
}

function capture(action: () => unknown): string {
  try {
    action();
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

class MalformingEngine implements Engine {
  async run(spec: RunSpec): Promise<RunResult> {
    const brief = paths.brief(spec.root, spec.taskNumber!);
    writeFileSync(brief, "# malformed refinement\n\n```cairn-task-metadata\n{not json}\n```\n");
    return { text: "malformed refinement written" };
  }
}

test("the Task 016 pre-reservation sequence cannot admit a third task", () => {
  const root = freshRepo("capacity");
  try {
    const reserved = [reserveTask(root), reserveTask(root), reserveTask(root)];
    for (const [index, provisional] of reserved.entries()) {
      const task = createTaskWorktree(root, provisional.taskNumber);
      const spec = metadata(`feature-${index + 1}.txt`);
      writeBrief(task.worktree, task.taskNumber, spec);
      registerTaskMetadata(root, task.taskNumber, spec);
    }
    const state = readCoordinatorState(root);
    assert.equal(state.tasks.filter((task) => task.admitted).length, 2);
    assert.equal(state.tasks[2]?.phase, "refused");
    assert.equal(state.tasks[2]?.blocker, "CONCURRENCY_LIMIT");
  } finally {
    cleanupOwned(root);
  }
});
test("malformed refinement becomes terminal before an approval artifact can be written", async () => {
  const root = freshRepo("malformed-refinement");
  try {
    const provisional = reserveTask(root);
    const task = createTaskWorktree(root, provisional.taskNumber);
    const spec = metadata("feature.txt");
    writeBrief(task.worktree, task.taskNumber, spec);
    registerTaskMetadata(root, task.taskNumber, spec);

    await assert.rejects(
      () => refineBrief(root, task.taskNumber, "make it malformed", new MalformingEngine()),
      /PARALLEL_CLASSIFICATION_REFUSED|MALFORMED_METADATA/,
    );
    const approvalError = capture(() => approveBrief(root, task.taskNumber));
    const current = readCoordinatorState(root).tasks[0];
    assert.equal(current.phase, "refused");
    assert.equal(current.admitted, false);
    assert.match(approvalError, /PARALLEL_CLASSIFICATION_REFUSED/);
    assert.equal(existsSync(paths.approval(task.worktree, task.taskNumber)), false);
    assert.match(readFileSync(paths.brief(task.worktree, task.taskNumber), "utf8"), /malformed refinement/);
  } finally {
    cleanupOwned(root);
  }
});
