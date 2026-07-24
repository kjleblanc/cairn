import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendTurn, ensureCairnExcluded, listConversations, newConversationId, readTurns } from "../src/main/conductor/store.js";

const turn = (role: "owner" | "cairn", text: string) => ({ role, text, ts: "2026-07-23T12:00:00.000Z" });

function gitInit(root: string): void {
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
}

test("turns round-trip and ids increment", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-store-"));
  const first = newConversationId(root);
  assert.equal(first, "001");
  appendTurn(root, first, turn("owner", "hello"));
  appendTurn(root, first, turn("cairn", "hello back"));
  assert.deepEqual(readTurns(root, first).map((item) => item.text), ["hello", "hello back"]);
  assert.equal(newConversationId(root), "002");
  const list = listConversations(root);
  assert.equal(list.length, 1);
  assert.equal(list[0].preview, "hello");
});

test("a corrupt line is skipped, not fatal", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-store-"));
  const id = newConversationId(root);
  appendTurn(root, id, turn("owner", "good"));
  writeFileSync(join(root, ".cairn", "conversations", `${id}.jsonl`), `${JSON.stringify(turn("owner", "good"))}\n{broken\n`, "utf8");
  assert.deepEqual(readTurns(root, id).map((item) => item.text), ["good"]);
});

test(".git/info/exclude gains /.cairn/ exactly once", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-store-"));
  gitInit(root);
  assert.equal(ensureCairnExcluded(root), true);
  assert.equal(ensureCairnExcluded(root), false);
  const lines = readFileSync(join(root, ".git", "info", "exclude"), "utf8").split(/\r?\n/);
  assert.equal(lines.filter((line) => line === "/.cairn/").length, 1);
});

test(".git/info/exclude and its info/ directory are created when missing", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-store-"));
  gitInit(root);
  // `git init` seeds `.git/info/exclude` with a commented template on most
  // installs, so the "missing" case is removing that template entirely —
  // the code must recreate both the info/ directory and the file itself.
  rmSync(join(root, ".git", "info"), { recursive: true, force: true });
  assert.ok(!existsSync(join(root, ".git", "info", "exclude")));
  assert.equal(ensureCairnExcluded(root), true);
  assert.ok(existsSync(join(root, ".git", "info", "exclude")));
  const lines = readFileSync(join(root, ".git", "info", "exclude"), "utf8").split(/\r?\n/);
  assert.ok(lines.includes("/.cairn/"));
});

test("a project with no git repository is left untouched", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-store-"));
  assert.equal(ensureCairnExcluded(root), false);
  assert.ok(!existsSync(join(root, ".gitignore")), "a .gitignore must never be created as a fallback");
  assert.ok(!existsSync(join(root, ".git")));
  assert.deepEqual(readdirSync(root), []);
});

test("REGRESSION: the project's .gitignore and worktree stay untouched by a send's exclusion write", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-store-"));
  gitInit(root);
  writeFileSync(join(root, ".gitignore"), "node_modules\n", "utf8");
  writeFileSync(join(root, "tracked.txt"), "hello\n", "utf8");
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["commit", "-q", "-m", "initial"], { cwd: root });

  assert.equal(ensureCairnExcluded(root), true);

  // The tracked .gitignore is byte-identical to what the owner committed —
  // the exclusion never touches a file git tracks.
  assert.equal(readFileSync(join(root, ".gitignore"), "utf8"), "node_modules\n");
  const status = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: root, encoding: "utf8" });
  assert.equal(status, "", "the worktree must report completely clean after the exclusion write");
});
