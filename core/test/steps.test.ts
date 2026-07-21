import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendLogRow, paths, scaffoldProject } from "../src/files.js";
import { initProject, localDirectionCheck, projectStatus } from "../src/steps.js";

function freshProject(): string {
  const root = mkdtempSync(join(tmpdir(), "cairn-steps-"));
  scaffoldProject(root, { name: "Steps", what: "w", who: "me", milestone: "see it", timebox: "default" });
  return root;
}

test("project status counts a stone only for DONE with milestone movement YES", () => {
  const root = freshProject();
  appendLogRow(root, {
    task: "001", date: "2026-07-21", lane: "Standard", mode: "Applied",
    outcome: "DONE", decision: "completed", summary: "offline demo", moved: "NO",
  });
  appendLogRow(root, {
    task: "002", date: "2026-07-21", lane: "Standard", mode: "Applied",
    outcome: "DONE", decision: "completed", summary: "visible progress", moved: "YES",
  });
  const status = projectStatus(root);
  assert.equal(status.stones, 1);
  assert.equal(status.log.length, 2);
});

test("project status reports one retained unfinished record without interpreting legacy gates", () => {
  const root = freshProject();
  writeFileSync(paths.brief(root, 1), "# Task 001\n");
  writeFileSync(paths.report(root, 1), "# Report\n\nDisposition: **STOPPED**\n");
  const status = projectStatus(root);
  assert.equal(status.unfinished?.taskNumber, 1);
  assert.equal(status.unfinished?.hasBrief, true);
  assert.equal(status.unfinished?.hasReport, true);
  assert.equal(status.unfinished?.disposition, "STOPPED");
});

test("legacy .git/cairn presence is reported read-only", () => {
  const root = freshProject();
  execFileSync("git", ["init", "-q"], { cwd: root });
  mkdirSync(join(root, ".git", "cairn"));
  writeFileSync(join(root, ".git", "cairn", "opaque"), "preserve\n");
  assert.equal(projectStatus(root).legacyState, true);
  assert.equal(readFileSync(join(root, ".git", "cairn", "opaque"), "utf8"), "preserve\n");
});

test("the Direction Gate explanation is local, deterministic, and provider-free", () => {
  const root = freshProject();
  appendLogRow(root, {
    task: "001", date: "2026-07-21", lane: "Standard", mode: "Applied",
    outcome: "STOPPED", decision: "stopped", summary: "first blocker", moved: "NO",
  });
  appendLogRow(root, {
    task: "002", date: "2026-07-21", lane: "Standard", mode: "Applied",
    outcome: "STOPPED", decision: "stopped", summary: "same blocker", moved: "NO",
  });
  const result = localDirectionCheck(root, projectStatus(root).gate.reason);
  assert.match(result.text, /Reduce the milestone/);
  assert.match(result.text, /Change architecture/);
  assert.match(result.text, /experienced help/);
  assert.match(result.text, /Defer or abandon/);
  assert.match(result.text, /No model was called/);
});

test("a non-Cairn folder is refused", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-not-"));
  assert.throws(() => projectStatus(root), /No Cairn contract/);
});

test("initProject scaffolds and commits when Git identity is available", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-init-"));
  const result = initProject(root, { name: "Init", what: "w", who: "me", milestone: "m", timebox: "default" });
  assert.ok(result.created.length >= 4);
  if (result.gitReady) {
    assert.match(execFileSync("git", ["log", "--oneline"], { cwd: root, encoding: "utf8" }), /Cairn setup/);
  }
});
