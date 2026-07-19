import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  beginCoordinatedBuild,
  coordinatorPaths,
  coordinatorSummary,
  createTaskWorktree,
  finishCoordinatedBuild,
  initializeCoordinator,
  inspectTaskScope,
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
  type TaskMetadata,
} from "../src/index.js";

process.env.CAIRN_PARALLEL_DRAFT = "1";

function runGit(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function freshRepo(label: string): string {
  const root = mkdtempSync(join(tmpdir(), `cairn-coordinator-${label}-`));
  scaffoldProject(root, { name: label, what: "synthetic", who: "test", milestone: "prove isolation", timebox: "default" });
  runGit(root, ["init", "-b", "main"]);
  runGit(root, ["config", "user.name", "Cairn Synthetic Test"]);
  runGit(root, ["config", "user.email", "cairn-synthetic@example.invalid"]);
  runGit(root, ["add", "--", "AGENTS.md", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md", "docs/ai-work/PILOT.md"]);
  runGit(root, ["commit", "-m", "Synthetic Cairn project"]);
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
  const brief = paths.brief(task.worktree, task.taskNumber);
  mkdirSync(dirname(brief), { recursive: true });
  writeFileSync(
    brief,
    `# Task ${String(task.taskNumber).padStart(3, "0")} — brief\n\nLane: ${spec.lane}\n\nMode: ${spec.mode}\n\n${metadataBlock(spec)}\n`,
  );
  return registerTaskMetadata(root, task.taskNumber, spec);
}

function defineAndApprove(root: string, spec: TaskMetadata): CoordinatorTask {
  const task = defineOnly(root, spec);
  const brief = paths.brief(task.worktree, task.taskNumber);
  const approval = recordApproval(task.taskNumber, brief);
  const approvalPath = paths.approval(task.worktree, task.taskNumber);
  writeFileSync(approvalPath, JSON.stringify(approval, null, 2) + "\n");
  return recordCoordinatorApproval(root, task.taskNumber, sha256File(approvalPath));
}

function buildCandidate(root: string, taskNumber: number, file: string, content: string): CoordinatorTask {
  const task = beginCoordinatedBuild(root, taskNumber);
  const target = join(task.worktree, ...file.split("/"));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  writeFileSync(paths.report(task.worktree, taskNumber), `# report\n\nDisposition: DONE\n`);
  return finishCoordinatedBuild(root, taskNumber, "DONE");
}

function decision(taskNumber: number, summary = "synthetic result"): CoordinatorDecision {
  const task = String(taskNumber).padStart(3, "0");
  return {
    decision: "accept",
    summary,
    moved: "YES",
    decidedAt: new Date().toISOString(),
    row: {
      task,
      date: "2026-07-18",
      lane: "Standard",
      mode: "Draft",
      outcome: "DONE",
      decision: "accept",
      summary,
      moved: "YES",
    },
  };
}

function waitFor(child: ReturnType<typeof spawn>): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr?.on("data", (chunk) => { stderr += String(chunk); });
    child.once("error", reject);
    child.once("close", (code) => resolve({ stdout, stderr, code }));
  });
}

test("metadata is strict, exact, and machine-readable", () => {
  assert.deepEqual(metadata("src/alpha.txt").allowedPaths, ["src/alpha.txt"]);
  assert.throws(() => validateTaskMetadata({ ...metadata("ok.txt"), allowedPaths: ["../escape.txt"] }), /MALFORMED_SCOPE/);
  assert.throws(() => validateTaskMetadata({ ...metadata("ok.txt"), surprise: true }), /MALFORMED_METADATA/);
  assert.throws(() => validateTaskMetadata({ ...metadata("ok.txt"), allowedPaths: ["*.txt"] }), /MALFORMED_SCOPE/);
});

test("two operating-system processes reserve distinct consecutive numbers atomically", async () => {
  const root = freshRepo("atomic");
  initializeCoordinator(root);
  const moduleUrl = new URL("../src/coordinator.js", import.meta.url).href;
  const script = `import { reserveTask } from ${JSON.stringify(moduleUrl)}; console.log(reserveTask(process.argv[1]).taskNumber);`;
  const options = { env: { ...process.env, CAIRN_PARALLEL_DRAFT: "1" }, stdio: ["ignore", "pipe", "pipe"] as ["ignore", "pipe", "pipe"] };
  const [a, b] = await Promise.all([
    waitFor(spawn(process.execPath, ["--input-type=module", "-e", script, root], options)),
    waitFor(spawn(process.execPath, ["--input-type=module", "-e", script, root], options)),
  ]);
  assert.equal(a.code, 0, a.stderr);
  assert.equal(b.code, 0, b.stderr);
  const numbers = [Number(a.stdout.trim()), Number(b.stdout.trim())].sort((x, y) => x - y);
  assert.deepEqual(numbers, [1, 2]);
  assert.equal(readCoordinatorState(root).nextTaskNumber, 3);
  assert.equal(existsSync(coordinatorPaths(root).backup), true, "the previous valid state is retained as a backup");
  console.log(`CAIRN_ATOMIC_REHEARSAL_ROOT=${root}`);
});

test("a reserved number advances permanently when worktree creation collides", () => {
  const root = freshRepo("reservation-failure");
  initializeCoordinator(root);
  const task = reserveTask(root);
  runGit(root, ["branch", task.branch]);
  assert.throws(() => createTaskWorktree(root, task.taskNumber), /WORKTREE_CREATION_FAILED/);
  const state = readCoordinatorState(root);
  assert.equal(state.nextTaskNumber, 2);
  assert.equal(state.tasks[0].taskNumber, 1);
  assert.equal(state.tasks[0].phase, "blocked");
  assert.equal(runGit(root, ["branch", "--list", task.branch]).includes(task.branch), true, "collision evidence remains");
  console.log(`CAIRN_RESERVATION_FAILURE_ROOT=${root}`);
});

test("two disjoint task worktrees build concurrently and remain isolated", async () => {
  const root = freshRepo("overlap-barrier");
  const first = defineAndApprove(root, metadata("alpha.txt"));
  const second = defineAndApprove(root, metadata("beta.txt"));
  const a = beginCoordinatedBuild(root, first.taskNumber);
  const b = beginCoordinatedBuild(root, second.taskNumber);
  assert.equal(coordinatorSummary(root).tasks.filter((task) => task.phase === "building").length, 2);
  assert.notEqual(a.branch, b.branch);
  assert.notEqual(a.worktree, b.worktree);
  const barrier = mkdtempSync(join(tmpdir(), "cairn-overlap-barrier-"));
  const script = [
    "const fs=require('node:fs'),p=require('node:path');",
    "const [barrier,own,peer,worktree,out]=process.argv.slice(1);",
    "fs.writeFileSync(p.join(barrier,own),'ready');",
    "const end=Date.now()+5000; while(!fs.existsSync(p.join(barrier,peer))&&Date.now()<end) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10);",
    "if(!fs.existsSync(p.join(barrier,peer))) process.exit(9);",
    "fs.writeFileSync(p.join(worktree,out),'built while peer was active\\n');",
  ].join("");
  const pa = spawn(process.execPath, ["-e", script, barrier, "a.ready", "b.ready", a.worktree, "alpha.txt"], { stdio: ["ignore", "pipe", "pipe"] });
  const pb = spawn(process.execPath, ["-e", script, barrier, "b.ready", "a.ready", b.worktree, "beta.txt"], { stdio: ["ignore", "pipe", "pipe"] });
  const [ra, rb] = await Promise.all([waitFor(pa), waitFor(pb)]);
  assert.equal(ra.code, 0, ra.stderr);
  assert.equal(rb.code, 0, rb.stderr);
  writeFileSync(paths.report(a.worktree, a.taskNumber), "Disposition: DONE\n");
  writeFileSync(paths.report(b.worktree, b.taskNumber), "Disposition: DONE\n");
  finishCoordinatedBuild(root, a.taskNumber, "DONE");
  finishCoordinatedBuild(root, b.taskNumber, "DONE");
  assert.ok(inspectTaskScope(root, a.taskNumber).includes("alpha.txt"));
  assert.ok(inspectTaskScope(root, b.taskNumber).includes("beta.txt"));
  assert.equal(existsSync(join(a.worktree, "beta.txt")), false);
  assert.equal(existsSync(join(b.worktree, "alpha.txt")), false);
  assert.equal(coordinatorSummary(root).tasks.filter((task) => task.phase === "report").length, 2);
  console.log(`CAIRN_CONCURRENT_REHEARSAL_ROOT=${root}`);
});

test("provisional work does not wait-block safe work, while overlap, dependencies, exclusive work, and a third admitted task are refused", () => {
  const classificationRoot = freshRepo("classification-does-not-wait");
  const classified = defineAndApprove(classificationRoot, metadata("ready.txt"));
  reserveTaskWorktree(classificationRoot);
  assert.equal(beginCoordinatedBuild(classificationRoot, classified.taskNumber).phase, "building");

  const overlapRoot = freshRepo("refuse-overlap");
  const a = defineAndApprove(overlapRoot, metadata("shared.txt"));
  const b = defineOnly(overlapRoot, metadata("shared.txt"));
  assert.equal(b.phase, "refused");
  assert.equal(b.blocker, "PARALLEL_SCOPE_OVERLAP");
  assert.equal(beginCoordinatedBuild(overlapRoot, a.taskNumber).phase, "building");

  const dependencyRoot = freshRepo("refuse-dependency");
  defineOnly(dependencyRoot, metadata("first.txt"));
  const dependent = defineOnly(dependencyRoot, metadata("second.txt", { dependencies: [1] }));
  assert.equal(dependent.phase, "refused");
  assert.equal(dependent.blocker, "PARALLEL_EXCLUSIVE_REFUSED");

  const exclusiveRoot = freshRepo("refuse-exclusive");
  defineOnly(exclusiveRoot, metadata("ordinary.txt"));
  const high = defineOnly(exclusiveRoot, metadata("careful.txt", { lane: "High-Stakes" }));
  assert.equal(high.phase, "refused");
  assert.equal(high.blocker, "PARALLEL_EXCLUSIVE_REFUSED");

  const liveRoot = freshRepo("refuse-live");
  defineOnly(liveRoot, metadata("ordinary.txt"));
  const live = defineOnly(liveRoot, metadata("live.txt", { externalActions: ["send a message"] }));
  assert.equal(live.phase, "refused");
  assert.equal(live.blocker, "PARALLEL_EXTERNAL_ACTION_REFUSED");

  const finalRoot = freshRepo("refuse-final");
  defineOnly(finalRoot, metadata("ordinary.txt"));
  const finalTask = defineOnly(finalRoot, metadata("final.txt", { mode: "Final" }));
  assert.equal(finalTask.phase, "refused");
  assert.equal(finalTask.blocker, "PARALLEL_EXCLUSIVE_REFUSED");

  const limitRoot = freshRepo("two-admitted-limit");
  defineOnly(limitRoot, metadata("first.txt"));
  defineOnly(limitRoot, metadata("second.txt"));
  assert.throws(() => reserveTask(limitRoot), /CONCURRENCY_LIMIT/);
});

test("an undeclared path blocks the build even when the builder claims success", () => {
  const root = freshRepo("scope-gate");
  const task = defineAndApprove(root, metadata("allowed.txt"));
  const building = beginCoordinatedBuild(root, task.taskNumber);
  writeFileSync(join(building.worktree, "outside.txt"), "undeclared\n");
  writeFileSync(paths.report(building.worktree, task.taskNumber), "Disposition: DONE\n");
  assert.throws(() => finishCoordinatedBuild(root, task.taskNumber, "DONE"), /SCOPE_GATE_FAILED.*outside\.txt/);
  assert.equal(existsSync(join(root, "outside.txt")), false);
  assert.equal(parseLog(root).length, 0);
  console.log(`CAIRN_SCOPE_GATE_REHEARSAL_ROOT=${root}`);
});

test("post-build inspection catches shell-level tampering with the frozen approval", () => {
  const root = freshRepo("approval-tamper");
  const task = defineAndApprove(root, metadata("allowed.txt"));
  const building = beginCoordinatedBuild(root, task.taskNumber);
  writeFileSync(paths.approval(building.worktree, task.taskNumber), "tampered\n");
  writeFileSync(join(building.worktree, "allowed.txt"), "looks successful\n");
  writeFileSync(paths.report(building.worktree, task.taskNumber), "Disposition: DONE\n");
  assert.throws(() => finishCoordinatedBuild(root, task.taskNumber, "DONE"), /APPROVAL_CHANGED/);
  assert.equal(parseLog(root).length, 0);
  assert.equal(existsSync(join(root, "allowed.txt")), false);
  console.log(`CAIRN_APPROVAL_TAMPER_REHEARSAL_ROOT=${root}`);
});

test("independent decisions integrate one at a time against latest main and append the log only then", () => {
  const root = freshRepo("serialized");
  const first = defineAndApprove(root, metadata("alpha.txt"));
  const second = defineAndApprove(root, metadata("beta.txt"));
  buildCandidate(root, first.taskNumber, "alpha.txt", "alpha\n");
  queueTaskDecision(root, first.taskNumber, decision(first.taskNumber, "alpha integrated"));
  assert.equal(parseLog(root).length, 0, "queueing must not touch the shared log");
  assert.notEqual(readCoordinatorState(root).tasks.find((task) => task.taskNumber === 2)?.phase, "integrated");
  const integratedFirst = integrateNext(root)!;
  assert.equal(integratedFirst.phase, "integrated");
  assert.equal(parseLog(root).length, 1);
  const baseAfterFirst = runGit(root, ["rev-parse", "HEAD"]);

  buildCandidate(root, second.taskNumber, "beta.txt", "beta\n");
  const rebased = readCoordinatorState(root).tasks.find((task) => task.taskNumber === second.taskNumber)!;
  assert.equal(rebased.baseCommit, baseAfterFirst, "the second admitted task updated against latest main before building");
  queueTaskDecision(root, second.taskNumber, decision(second.taskNumber, "beta integrated"));
  assert.equal(parseLog(root).length, 1, "the second row is still queued, not written early");
  integrateNext(root);
  assert.equal(parseLog(root).length, 2);
  assert.equal(readFileSync(join(root, "alpha.txt"), "utf8").replace(/\r\n/g, "\n"), "alpha\n");
  assert.equal(readFileSync(join(root, "beta.txt"), "utf8").replace(/\r\n/g, "\n"), "beta\n");
  const final = readCoordinatorState(root);
  assert.equal(final.tasks.filter((task) => task.phase === "integrated").length, 2);
  assert.equal(final.tasks.every((task) => Boolean(task.integrationWorktree) && existsSync(task.integrationWorktree!)), true);
  console.log(`CAIRN_SERIALIZED_REHEARSAL_ROOT=${root}`);
  for (const task of final.tasks) console.log(`CAIRN_RETAINED_PATH=${task.worktree}\nCAIRN_RETAINED_PATH=${task.integrationWorktree}`);
});

test("a failed approved check leaves synthetic main and its log unchanged", () => {
  const root = freshRepo("failed-check");
  const task = defineAndApprove(root, metadata("fail.txt", { checks: ['node -e "process.exit(7)"'] }));
  buildCandidate(root, task.taskNumber, "fail.txt", "candidate\n");
  queueTaskDecision(root, task.taskNumber, decision(task.taskNumber));
  const mainBefore = runGit(root, ["rev-parse", "HEAD"]);
  const logBefore = readFileSync(paths.log(root));
  assert.throws(() => integrateNext(root), /CHECK_FAILED/);
  assert.equal(runGit(root, ["rev-parse", "HEAD"]), mainBefore);
  assert.deepEqual(readFileSync(paths.log(root)), logBefore);
  assert.equal(readCoordinatorState(root).tasks[0].phase, "blocked");
  console.log(`CAIRN_FAILED_CHECK_REHEARSAL_ROOT=${root}`);
});

test("a real Git directory/file conflict is refused at admission before it can reach main", () => {
  const root = freshRepo("conflict");
  const fileTask = defineAndApprove(root, metadata("area"));
  const directoryTask = defineOnly(root, metadata("area/item.txt"));
  assert.equal(directoryTask.phase, "refused");
  assert.equal(directoryTask.blocker, "PARALLEL_SCOPE_OVERLAP");
  buildCandidate(root, fileTask.taskNumber, "area", "a file blocks the directory\n");
  queueTaskDecision(root, fileTask.taskNumber, decision(fileTask.taskNumber));
  integrateNext(root);
  assert.equal(readFileSync(join(root, "area"), "utf8").replace(/\r\n/g, "\n"), "a file blocks the directory\n");
  assert.equal(readCoordinatorState(root).tasks.find((task) => task.taskNumber === directoryTask.taskNumber)?.phase, "refused");
  assert.equal(parseLog(root).length, 1);
  console.log(`CAIRN_CONFLICT_REHEARSAL_ROOT=${root}`);
});

test("corrupt state and a stale lock both fail closed and preserve evidence", () => {
  const legacyRoot = freshRepo("legacy-state");
  const legacyPaths = coordinatorPaths(legacyRoot);
  const legacyState = join(legacyPaths.dir, "coordinator-v1.json");
  mkdirSync(legacyPaths.dir, { recursive: true });
  writeFileSync(legacyState, JSON.stringify({ schemaVersion: 1, retained: true }) + "\n");
  assert.throws(() => readCoordinatorState(legacyRoot), /UNSUPPORTED_STATE/);
  assert.equal(existsSync(legacyPaths.state), false, "legacy state is never migrated automatically");
  assert.equal(readFileSync(legacyState, "utf8"), JSON.stringify({ schemaVersion: 1, retained: true }) + "\n");

  const corruptRoot = freshRepo("corrupt-state");
  initializeCoordinator(corruptRoot);
  const corrupt = coordinatorPaths(corruptRoot);
  writeFileSync(corrupt.state, "{not-json\n");
  assert.throws(() => readCoordinatorState(corruptRoot), /CORRUPT_STATE/);
  assert.equal(readFileSync(corrupt.state, "utf8"), "{not-json\n");

  const staleRoot = freshRepo("stale-lock");
  initializeCoordinator(staleRoot);
  const stale = coordinatorPaths(staleRoot);
  writeFileSync(stale.lock, JSON.stringify({ schemaVersion: 1, pid: 999999, acquiredAt: "2000-01-01T00:00:00.000Z" }) + "\n");
  assert.throws(() => reserveTask(staleRoot), /STALE_LOCK/);
  assert.equal(existsSync(stale.lock), true, "the stale lock is retained, never deleted automatically");
  console.log(`CAIRN_CORRUPT_STATE_REHEARSAL_ROOT=${corruptRoot}`);
  console.log(`CAIRN_STALE_LOCK_REHEARSAL_ROOT=${staleRoot}`);
});

test("the Draft refuses this valuable repository class and never creates real coordinator state", () => {
  const valuable = basename(process.cwd()) === "core" ? dirname(process.cwd()) : process.cwd();
  if (!valuable.startsWith(tmpdir())) {
    assert.throws(() => initializeCoordinator(valuable), /REAL_PROJECT_REFUSED|DIRTY_MAIN/);
    assert.equal(existsSync(join(valuable, ".git", "cairn")), false);
  }
});
