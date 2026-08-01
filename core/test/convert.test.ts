import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { convertProject, inspectConversion } from "../src/convert.js";
import { isCairnProject, scaffoldProject } from "../src/files.js";
import { projectStatus } from "../src/steps.js";

const FACTS = { name: "Recipe Box", what: "A recipe saver", who: "me", milestone: "list three recipes" };

function freshFolder(): string {
  const root = mkdtempSync(join(tmpdir(), "cairn-convert-"));
  writeFileSync(join(root, "app.py"), "print('hello')\n");
  mkdirSync(join(root, "notes"));
  writeFileSync(join(root, "notes", "ideas.txt"), "keep me\n");
  return root;
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  }).trim();
}

function hasIdentity(): boolean {
  const root = mkdtempSync(join(tmpdir(), "cairn-id-"));
  try {
    git(root, ["init", "-q"]);
    return git(root, ["config", "user.name"]).length > 0;
  } catch {
    return false;
  }
}

test("inspection reports an ordinary folder honestly", () => {
  const root = freshFolder();
  const i = inspectConversion(root);
  assert.equal(i.exists, true);
  assert.equal(i.alreadyCairn, false);
  assert.equal(i.agentsConflict, false);
  assert.equal(i.kept.length, 0);
  assert.equal(i.git.isRepo, false);
  assert.equal(i.suggestedName.length > 0, true);
});

test("inspection flags other AI rule files and a foreign AGENTS.md as a conflict", () => {
  const root = freshFolder();
  writeFileSync(join(root, "CLAUDE.md"), "# Claude rules\n");
  writeFileSync(join(root, "AGENTS.md"), "# somebody else's rules\n");
  const i = inspectConversion(root);
  assert.equal(i.agentsConflict, true);
  assert.deepEqual(i.otherRules, ["CLAUDE.md"]);
});

test("conversion refuses a foreign AGENTS.md without writing anything", () => {
  const root = freshFolder();
  writeFileSync(join(root, "AGENTS.md"), "# somebody else's rules\n");
  assert.throws(() => convertProject(root, FACTS), /own AGENTS\.md/);
  assert.equal(readFileSync(join(root, "AGENTS.md"), "utf8"), "# somebody else's rules\n");
  assert.equal(existsSync(join(root, "docs")), false);
});

test("conversion refuses an existing Cairn project", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-convert-cairn-"));
  scaffoldProject(root, FACTS);
  assert.throws(() => convertProject(root, FACTS), /already a Cairn project/);
});

test("conversion requires all four facts", () => {
  const root = freshFolder();
  assert.throws(() => convertProject(root, { ...FACTS, milestone: " " }), /all four/);
  assert.equal(existsSync(join(root, "AGENTS.md")), false);
});

test("happy path: existing work preserved, governed, committed exact-path", (t) => {
  if (!hasIdentity()) {
    t.skip("no git identity in this environment");
    return;
  }
  const root = freshFolder();
  git(root, ["init", "-q"]);
  // Pre-existing uncommitted work that must survive untouched and unstaged.
  writeFileSync(join(root, "draft.txt"), "do not stage me\n");

  const outcome = convertProject(root, FACTS);

  assert.equal(outcome.committed, true);
  assert.deepEqual(outcome.kept, []);
  assert.ok(outcome.created.includes("AGENTS.md"));
  assert.ok(outcome.created.some((rel) => rel.endsWith("CONVERSION.md")));
  assert.equal(isCairnProject(root), true);
  assert.equal(projectStatus(root).facts.name, "Recipe Box");
  // Existing bytes intact.
  assert.equal(readFileSync(join(root, "app.py"), "utf8"), "print('hello')\n");
  assert.equal(readFileSync(join(root, "notes", "ideas.txt"), "utf8"), "keep me\n");
  // The commit contains ONLY the created files: the pre-existing work is
  // still untracked, not swept in.
  const committedPaths = git(root, ["show", "--name-only", "--format=", "HEAD"]).split("\n").filter(Boolean).sort();
  assert.deepEqual(committedPaths, [...outcome.created].map((rel) => rel.split("\\").join("/")).sort());
  const status = git(root, ["status", "--porcelain"]);
  assert.ok(status.split("\n").some((line) => line.startsWith("??") && line.includes("draft.txt")));
  assert.ok(status.split("\n").some((line) => line.startsWith("??") && line.includes("app.py")));
});

test("kept records are reported and never overwritten", (t) => {
  if (!hasIdentity()) {
    t.skip("no git identity in this environment");
    return;
  }
  const root = freshFolder();
  mkdirSync(join(root, "docs", "ai-work"), { recursive: true });
  writeFileSync(join(root, "docs", "ai-work", "LOG.md"), "| Task | my own log\n");
  const i = inspectConversion(root);
  assert.deepEqual(i.kept, [join("docs", "ai-work", "LOG.md")]);

  const outcome = convertProject(root, FACTS);
  assert.deepEqual(outcome.kept, [join("docs", "ai-work", "LOG.md")]);
  assert.equal(readFileSync(join(root, "docs", "ai-work", "LOG.md"), "utf8"), "| Task | my own log\n");
  assert.ok(!outcome.created.some((rel) => rel.endsWith("LOG.md")));
  // PROJECT.md was still created; the kept file did not block the rest.
  assert.ok(existsSync(join(root, "docs", "ai-work", "PROJECT.md")));
});

test("a non-git folder gets a repository and (with identity) a commit", (t) => {
  if (!hasIdentity()) {
    t.skip("no git identity in this environment");
    return;
  }
  const root = freshFolder();
  const outcome = convertProject(root, FACTS);
  assert.equal(outcome.committed, true);
  assert.ok(outcome.notes.some((n) => n.includes("started one")));
  assert.doesNotThrow(() => git(root, ["rev-parse", "--git-dir"]));
});

test("legacy .git/cairn state is disclosed, never touched", (t) => {
  if (!hasIdentity()) {
    t.skip("no git identity in this environment");
    return;
  }
  const root = freshFolder();
  git(root, ["init", "-q"]);
  mkdirSync(join(root, ".git", "cairn"));
  writeFileSync(join(root, ".git", "cairn", "opaque.bin"), "do not parse or change\n");
  const i = inspectConversion(root);
  assert.equal(i.legacyState, true);
  const outcome = convertProject(root, FACTS);
  assert.ok(outcome.notes.some((n) => n.includes("Legacy Cairn runtime state")));
  assert.equal(readFileSync(join(root, ".git", "cairn", "opaque.bin"), "utf8"), "do not parse or change\n");
  // The conversion report carries the warning too.
  assert.ok(readFileSync(join(root, "docs", "ai-work", "CONVERSION.md"), "utf8").includes("Legacy Cairn runtime state"));
});
