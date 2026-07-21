import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendLogRow, fillFacts, isCairnProject, nextTaskNumber, parseFacts, parseLog, paths, scaffoldProject,
} from "../src/files.js";

function freshProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "cairn-proj-"));
  scaffoldProject(dir, {
    name: "Cash $ App",
    what: "money tracker",
    who: "me",
    milestone: "see $100 total",
  });
  return dir;
}

test("scaffold creates a recognizable Cairn project with filled facts", () => {
  const dir = freshProject();
  assert.equal(isCairnProject(dir), true);
  const facts = parseFacts(dir);
  assert.equal(facts.name, "Cash $ App"); // $ must survive the fill
  assert.equal(facts.milestone, "see $100 total");
  assert.equal(facts.status, "ACTIVE");
  assert.match(facts.contractVersion, /^\d/);
  assert.equal(existsSync(join(dir, "docs", "ai-work", "PILOT.md")), false);
  assert.doesNotMatch(readFileSync(paths.project(dir), "utf8"), /Direction|timebox/i);
});

test("isCairnProject rejects an AGENTS.md that only mentions Cairn", () => {
  const dir = mkdtempSync(join(tmpdir(), "cairn-fake-"));
  writeFileSync(
    join(dir, "AGENTS.md"),
    "# Team notes\n\nWe follow Cairn-style ideas when we build things.\n",
  );
  assert.equal(isCairnProject(dir), false);
});

test("isCairnProject accepts a real contract even when the version wraps a line", () => {
  const dir = mkdtempSync(join(tmpdir(), "cairn-real-"));
  // Mirrors the real AGENTS.md, where "Cairn" ends one line and "Contract v1.2"
  // begins the next — so a naive `Cairn Contract v` substring check would wrongly
  // reject a genuine contract. The structural markers must still recognise it.
  const contract = [
    "# Project Contract",
    "",
    "> This is the rulebook for AI work in this project — Cairn",
    "> Contract v1.2, from the Cairn framework.",
    "",
    "```",
    "STATUS: ACTIVE",
    "PROJECT NAME: Demo",
    "WHAT WE ARE BUILDING: a thing",
    "WHO WILL USE IT: people",
    "CURRENT MILESTONE: ship it",
    "```",
    "",
  ].join("\n");
  writeFileSync(join(dir, "AGENTS.md"), contract);
  assert.equal(isCairnProject(dir), true);
});

test("log round-trip: append then parse, pipes sanitized", () => {
  const dir = freshProject();
  appendLogRow(dir, {
    task: "001", date: "2026-07-17", lane: "Standard", mode: "Draft",
    outcome: "DONE", decision: "accept", summary: "shows a | pipe", moved: "YES",
  });
  const rows = parseLog(dir);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].task, "001");
  assert.equal(rows[0].outcome, "DONE");
  assert.ok(!rows[0].summary.includes("|"));
});

test("next task number counts existing briefs and reports", () => {
  const dir = freshProject();
  assert.equal(nextTaskNumber(dir), 1);
  mkdirSync(paths.tasks(dir), { recursive: true });
  writeFileSync(paths.brief(dir, 1), "b");
  writeFileSync(paths.report(dir, 1), "r");
  writeFileSync(paths.brief(dir, 2), "b");
  assert.equal(nextTaskNumber(dir), 3);
});

test("fillFacts only touches the facts block labels", () => {
  const template = "STATUS: ACTIVE\nPROJECT NAME:\nWHAT WE ARE BUILDING:\nWHO WILL USE IT:\nCURRENT MILESTONE:\nBody mentions PROJECT NAME: not a label? no — line-anchored.";
  const out = fillFacts(template, { name: "N", what: "W", who: "U", milestone: "M" });
  assert.match(out, /^PROJECT NAME: N$/m);
  assert.match(out, /^CURRENT MILESTONE: M$/m);
});

test("scaffold refuses to overwrite an existing contract", () => {
  const dir = freshProject();
  assert.throws(() =>
    scaffoldProject(dir, { name: "x", what: "x", who: "x", milestone: "x" }),
  );
  assert.equal(parseFacts(dir).name, "Cash $ App");
});

test("mock end-to-end artifacts parse back cleanly", () => {
  const dir = freshProject();
  writeFileSync(paths.brief(dir, 1), "# brief\nMode: Draft\n");
  writeFileSync(paths.report(dir, 1), "# report\nDisposition: DONE\n");
  assert.match(readFileSync(paths.report(dir, 1), "utf8"), /Disposition: DONE/);
  assert.equal(nextTaskNumber(dir), 2);
});
