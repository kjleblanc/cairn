import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  scanTakenNumbers,
  lowestFree,
  detectLane,
  claimTask,
  renumberTask,
  verifyByteExact,
  padNumber,
} from "../src/flows/claim.js";

const TASKS = path.join("docs", "ai-work", "tasks");

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" });
}

/** A fixture Cairn project: git repo, tasks dir, honest byte handling. */
function fixtureProject(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cairn-claim-"));
  git(root, ["init", "-b", "main"]);
  git(root, ["config", "user.name", "Fixture"]);
  git(root, ["config", "user.email", "fixture@example.test"]);
  git(root, ["config", "core.autocrlf", "false"]);
  fs.mkdirSync(path.join(root, TASKS), { recursive: true });
  return root;
}

function writeTaskFile(root: string, name: string, text: string): void {
  fs.writeFileSync(path.join(root, TASKS, name), text, "utf8");
}

function commitAll(root: string, message: string): void {
  git(root, ["add", "-A"]);
  git(root, ["commit", "-m", message]);
}

test("lowestFree picks the first gap, and pads numbers the house way", () => {
  assert.equal(lowestFree([1, 2, 3, 5, 6]), 4);
  assert.equal(lowestFree([]), 1);
  assert.equal(lowestFree([2, 3]), 1);
  assert.equal(padNumber(7), "007");
  assert.equal(padNumber(162), "162");
});

test("detectLane reads the worktree location honestly", () => {
  assert.deepEqual(detectLane(path.join("projects", "cairn")), { letter: "A", label: "A (main checkout)" });
  const laneB = detectLane(path.join("projects", "cairn", ".lanes", "b"));
  assert.equal(laneB.letter, "B");
  assert.match(laneB.label, /\.lanes\/b/);
});

test("the scan sees a sibling lane's UNCOMMITTED brief — the demonstrated double-claim failure", () => {
  const root = fixtureProject();
  writeTaskFile(root, "001-brief.md", "# Task 001 brief\n");
  commitAll(root, "task 001");
  // Lane B has claimed 002 in its worktree but has not committed anywhere visible.
  const laneTasks = path.join(root, ".lanes", "b", TASKS);
  fs.mkdirSync(laneTasks, { recursive: true });
  fs.writeFileSync(path.join(laneTasks, "002-brief.md"), "# Task 002 brief\n", "utf8");

  const { taken } = scanTakenNumbers(root);
  assert.ok(taken.has(2), "an uncommitted brief in .lanes/b must block the number");
  assert.match(taken.get(2)!.join(", "), /\.lanes\/b/);
  assert.equal(lowestFree(taken.keys()), 3);
});

test("the scan sees numbers claimed only on another branch", () => {
  const root = fixtureProject();
  writeTaskFile(root, "001-brief.md", "# Task 001 brief\n");
  commitAll(root, "task 001");
  git(root, ["checkout", "-b", "lane/x"]);
  writeTaskFile(root, "005-brief.md", "# Task 005 brief\n");
  commitAll(root, "task 005 on lane x");
  git(root, ["checkout", "main"]);

  const { taken } = scanTakenNumbers(root);
  assert.ok(taken.has(5));
  assert.match(taken.get(5)!.join(", "), /branch lane\/x/);
  assert.equal(lowestFree(taken.keys()), 2);
});

test("claim writes the skeleton and commits it alone; a second claim takes the next number", () => {
  const root = fixtureProject();
  writeTaskFile(root, "001-brief.md", "# Task 001 brief\n");
  commitAll(root, "task 001");

  const first = claimTask(root, "a visible outcome");
  assert.equal(first.nnn, "002");
  const briefPath = path.join(root, TASKS, "002-brief.md");
  assert.ok(fs.existsSync(briefPath));
  const brief = fs.readFileSync(briefPath, "utf8");
  assert.match(brief, /# Task 002 brief — a visible outcome/);
  assert.match(brief, /\*\*Lane:\*\* A \(main checkout\)/);

  const committedFiles = git(root, ["show", "--name-only", "--format=", "HEAD"]).trim();
  assert.equal(committedFiles, "docs/ai-work/tasks/002-brief.md", "the claim commit is exactly one file");
  assert.match(git(root, ["log", "-1", "--format=%s"]), /claims task number 002/);
  assert.equal(git(root, ["status", "--porcelain"]).trim(), "", "tree clean after the claim");

  const second = claimTask(root, "another outcome");
  assert.equal(second.nnn, "003");
});

test("claim refuses when unrelated staged work would prevent isolation", () => {
  const root = fixtureProject();
  writeTaskFile(root, "001-brief.md", "# Task 001 brief\n");
  commitAll(root, "task 001");
  fs.writeFileSync(path.join(root, "unrelated.txt"), "in flight\n", "utf8");
  git(root, ["add", "unrelated.txt"]);

  assert.throws(() => claimTask(root, "should not happen"), /staged work/);
  assert.ok(!fs.existsSync(path.join(root, TASKS, "002-brief.md")), "no brief written on refusal");
});

test("renumber moves the files, fixes titles, and touches only its own LOG row", () => {
  const root = fixtureProject();
  writeTaskFile(root, "002-brief.md", "# Task 002 brief — the cast, for real\n\n**Lane:** A\n");
  writeTaskFile(root, "002-report.md", "# Task 002 report\n\nDid the thing.\n");
  fs.writeFileSync(
    path.join(root, "docs", "ai-work", "LOG.md"),
    "| Task | Date |\n|---|---|\n| 002 | 2026-07-31 |\n| 003 | 2026-07-31 |\n",
    "utf8",
  );
  commitAll(root, "tasks 002 and 003 records");

  const result = renumberTask(root, 2, 7);
  assert.deepEqual(
    result.movedFiles.sort(),
    ["docs/ai-work/tasks/007-brief.md", "docs/ai-work/tasks/007-report.md"],
  );
  assert.match(fs.readFileSync(path.join(root, TASKS, "007-brief.md"), "utf8"), /# Task 007 brief/);
  assert.match(fs.readFileSync(path.join(root, TASKS, "007-report.md"), "utf8"), /# Task 007 report/);
  const log = fs.readFileSync(path.join(root, "docs", "ai-work", "LOG.md"), "utf8");
  assert.match(log, /\| 007 \| 2026-07-31 \|/);
  assert.match(log, /\| 003 \| 2026-07-31 \|/, "the other lane's row is history — untouched");
  assert.ok(!fs.existsSync(path.join(root, TASKS, "002-brief.md")));
});

test("renumber refuses a taken target number", () => {
  const root = fixtureProject();
  writeTaskFile(root, "002-brief.md", "# Task 002 brief\n");
  writeTaskFile(root, "003-brief.md", "# Task 003 brief\n");
  commitAll(root, "tasks 002 and 003");
  assert.throws(() => renumberTask(root, 2, 3), /already taken/);
});

test("verifyByteExact proves a restored brief matches its commit, byte for byte", () => {
  const root = fixtureProject();
  writeTaskFile(root, "004-brief.md", "# Task 004 brief — theirs\n");
  commitAll(root, "their brief");
  const commit = git(root, ["rev-parse", "HEAD"]).trim();

  assert.equal(verifyByteExact(root, commit, path.join(TASKS, "004-brief.md")), true);
  writeTaskFile(root, "004-brief.md", "# Task 004 brief — clobbered\n");
  assert.equal(verifyByteExact(root, commit, path.join(TASKS, "004-brief.md")), false);
});
