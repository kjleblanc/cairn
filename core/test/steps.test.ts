import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MockEngine } from "../src/agents.js";
import { paths, parseLog, scaffoldProject } from "../src/files.js";
import {
  approveBrief, buildTask, closeTask, defineTask, initProject, loadApproval,
  projectStatus, reviewTask, runDirectionCheck,
} from "../src/steps.js";

const engine = new MockEngine();

function freshProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "cairn-steps-"));
  scaffoldProject(dir, { name: "Steps", what: "w", who: "me", milestone: "see it", timebox: "default" });
  return dir;
}

test("full loop: define, approve, build, review, close — files carry the state", async () => {
  const dir = freshProject();
  const def = await defineTask(dir, "A demo file appears", engine);
  assert.equal(def.taskNumber, 1);
  assert.ok(def.briefText.includes("brief"));

  const approval = approveBrief(dir, 1);
  assert.ok(existsSync(paths.approval(dir, 1)));
  assert.equal(loadApproval(dir, 1)?.briefSha256, approval.briefSha256);

  const build = await buildTask(dir, 1, engine);
  assert.equal(build.disposition, "DONE");
  assert.ok(build.reportText.includes("demo.txt"));

  const review = await reviewTask(dir, 1, engine);
  assert.match(review.finalVerdict, /PASS/);

  const row = closeTask(dir, 1, { decision: "accept", summary: "saw the file", moved: "YES" });
  assert.equal(row.task, "001");
  assert.equal(parseLog(dir).length, 1);
});

test("build refuses without a persisted approval, and after tampering", async () => {
  const dir = freshProject();
  await defineTask(dir, "A demo file appears", engine);
  await assert.rejects(() => buildTask(dir, 1, engine), /No approval on file/);
  approveBrief(dir, 1);
  writeFileSync(paths.brief(dir, 1), "silently widened scope");
  await assert.rejects(() => buildTask(dir, 1, engine), /GATE: the brief changed/);
});

test("defineTask refuses while the Direction Gate is tripped", async () => {
  const dir = freshProject();
  const row = "| 001 | 2026-07-17 | Standard | Draft | STOPPED | revise | s | NO |\n" +
              "| 002 | 2026-07-17 | Standard | Draft | STOPPED | revise | s | NO |\n";
  writeFileSync(paths.log(dir), readFileSync(paths.log(dir), "utf8") + row);
  await assert.rejects(() => defineTask(dir, "another patch", engine), /DIRECTION GATE/);
  const check = await runDirectionCheck(dir, "two STOPPED in a row", engine);
  assert.ok(check.text.length > 0);
});

test("projectStatus reports stones, gate, and an unfinished task", async () => {
  const dir = freshProject();
  const s0 = projectStatus(dir);
  assert.equal(s0.stones, 0);
  assert.equal(s0.unfinished, null);

  await defineTask(dir, "A demo file appears", engine);
  const s1 = projectStatus(dir);
  assert.equal(s1.unfinished?.taskNumber, 1);
  assert.equal(s1.unfinished?.hasBrief, true);
  assert.equal(s1.unfinished?.hasApproval, false);
  assert.ok(s1.unfinished?.briefText.includes("brief"));

  approveBrief(dir, 1);
  await buildTask(dir, 1, engine);
  closeTask(dir, 1, { decision: "accept", summary: "s", moved: "YES" });
  const s2 = projectStatus(dir);
  assert.equal(s2.stones, 1);
  assert.equal(s2.unfinished, null);
});

test("steps refuse a folder that is not a Cairn project", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cairn-not-"));
  await assert.rejects(() => defineTask(dir, "x", engine), /No Cairn contract/);
  assert.throws(() => projectStatus(dir), /No Cairn contract/);
});

test("initProject scaffolds and commits when git identity exists", () => {
  const dir = mkdtempSync(join(tmpdir(), "cairn-init-"));
  const res = initProject(dir, { name: "Init", what: "w", who: "me", milestone: "m", timebox: "default" });
  assert.ok(res.created.length >= 4);
  if (res.gitReady) {
    const log = execFileSync("git", ["log", "--oneline"], { cwd: dir, encoding: "utf8" });
    assert.match(log, /Cairn setup/);
  }
});
