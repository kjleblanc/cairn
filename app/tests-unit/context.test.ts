import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assembleBriefing, DEFAULT_CAPS } from "../src/main/conductor/context.js";

function fixtureProject(): string {
  const root = mkdtempSync(join(tmpdir(), "cairn-briefing-"));
  mkdirSync(join(root, "docs", "ai-work", "tasks"), { recursive: true });
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "node_modules"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), [
    "# Project Contract", "", "Cairn Contract v0.0.5", "STATUS: ACTIVE",
    "PROJECT NAME: Briefing fixture", "WHAT WE ARE BUILDING: a fixture",
    "WHO WILL USE IT: tests", "CURRENT MILESTONE: see a briefing", "",
  ].join("\n"));
  writeFileSync(join(root, "docs", "ai-work", "PROJECT.md"), "# Briefing fixture\n\nGoal: prove briefings.\n");
  writeFileSync(join(root, "docs", "ai-work", "LOG.md"),
    "| Task | Date | Lane | Draft/Final | Outcome | Decision | One-line summary | Milestone moved? |\n" +
    "|---|---|---|---|---|---|---|---|\n" +
    "| 001 | 2026-07-23 | Standard | Applied | DONE | completed | First fixture row | NO |\n");
  writeFileSync(join(root, "docs", "ai-work", "tasks", "001-brief.md"), "# Task 001 — fixture brief\n");
  writeFileSync(join(root, "docs", "ai-work", "tasks", "001-report.md"), "# Task 001 report\n\nDisposition: **DONE**\n");
  writeFileSync(join(root, "src", "index.ts"), "export {}\n");
  writeFileSync(join(root, "src", "app.ts"), "export {}\n");
  writeFileSync(join(root, "node_modules", "junk.js"), "x\n");
  const git = (args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
  git(["init", "-q"]);
  git(["config", "user.name", "T"]);
  git(["config", "user.email", "t@example.invalid"]);
  git(["add", "-A"]);
  git(["commit", "-q", "-m", "fixture commit"]);
  return root;
}

test("briefing carries facts, project, log, records, git, and tree", () => {
  const briefing = assembleBriefing(fixtureProject());
  assert.match(briefing, /Briefing fixture/);
  assert.match(briefing, /CURRENT MILESTONE: see a briefing|see a briefing/);
  assert.match(briefing, /First fixture row/);
  assert.match(briefing, /Task 001 — fixture brief/);
  assert.match(briefing, /fixture commit/);
  assert.match(briefing, /src\/index\.ts/);
  assert.doesNotMatch(briefing, /node_modules/);
  assert.match(briefing, /assembled by Cairn's code/);
});

test("tree entries and record sizes respect caps", () => {
  const root = fixtureProject();
  for (let index = 0; index < 30; index += 1) writeFileSync(join(root, "src", `extra-${index}.ts`), "export {}\n");
  const briefing = assembleBriefing(root, { ...DEFAULT_CAPS, maxTreeEntries: 5, maxRecordChars: 10 });
  assert.match(briefing, /\(truncated\)/);
  const treeSection = briefing.slice(briefing.indexOf("## Files"));
  assert.ok(treeSection.split("\n").filter((line) => line.startsWith("- ")).length <= 5);
});

test("a briefing is deterministic for an unchanged project", () => {
  const root = fixtureProject();
  assert.equal(assembleBriefing(root), assembleBriefing(root));
});
