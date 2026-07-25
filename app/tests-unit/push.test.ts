import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pushExecute, pushPreview } from "../src/main/push.js";

function git(root: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  }).trimEnd();
}

function freshDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

function configure(root: string): void {
  git(root, ["config", "user.name", "Cairn Test"]);
  git(root, ["config", "user.email", "cairn-test@example.invalid"]);
}

/**
 * A plain non-bare origin refuses a push to its checked-out branch
 * ("refusing to update checked out branch") — that would make the happy
 * path unreachable and would misclassify (neither auth nor remote-ahead).
 * So the fixture is a BARE origin plus two working clones, A and B, exactly
 * as corrected in the plan's adversarial review.
 */
function makeOriginAndClones(): { bare: string; a: string; b: string } {
  const workspace = freshDir("cairn-push-test-");
  git(workspace, ["init", "-q", "--bare", "-b", "main", "origin.git"]);
  const bare = join(workspace, "origin.git");
  git(workspace, ["clone", "-q", bare, "a"]);
  const a = join(workspace, "a");
  configure(a);
  git(a, ["commit", "-q", "--allow-empty", "-m", "initial commit"]);
  git(a, ["push", "-q", "-u", "origin", "HEAD"]);
  git(workspace, ["clone", "-q", bare, "b"]);
  const b = join(workspace, "b");
  configure(b);
  return { bare, a, b };
}

test("pushPreview reports ahead count, subjects, remote, url, and branch", () => {
  const { bare, b } = makeOriginAndClones();
  git(b, ["commit", "-q", "--allow-empty", "-m", "feature: add widget"]);

  const preview = pushPreview(b);

  assert.notEqual(preview, null);
  assert.equal(preview?.remote, "origin");
  assert.equal(preview?.branch, "main");
  assert.equal(preview?.ahead, 1);
  assert.deepEqual(preview?.subjects, ["feature: add widget"]);
  assert.equal(preview?.url, bare);
});

test("pushPreview returns null when the branch has no upstream configured", () => {
  const dir = freshDir("cairn-push-noremote-");
  git(dir, ["init", "-q", "-b", "main"]);
  configure(dir);
  git(dir, ["commit", "-q", "--allow-empty", "-m", "solo commit"]);

  assert.equal(pushPreview(dir), null);
});

test("pushExecute pushes successfully and the ahead count drops to zero", () => {
  const { b } = makeOriginAndClones();
  git(b, ["commit", "-q", "--allow-empty", "-m", "feature: add widget"]);
  const before = pushPreview(b);
  assert.equal(before?.ahead, 1);

  const result = pushExecute(b);

  assert.equal(result.ok, true);
  assert.equal(typeof (result as { summary: string }).summary, "string");
  assert.notEqual((result as { summary: string }).summary.length, 0);
  const after = pushPreview(b);
  assert.equal(after?.ahead, 0);
});

test("pushExecute classifies remote-ahead when the origin has commits this clone lacks", () => {
  const { a, b } = makeOriginAndClones();
  git(a, ["commit", "-q", "--allow-empty", "-m", "A's commit"]);
  git(a, ["push", "-q"]);
  git(b, ["commit", "-q", "--allow-empty", "-m", "B's commit"]);

  const result = pushExecute(b);

  assert.equal(result.ok, false);
  assert.equal((result as { kind: string }).kind, "remote-ahead");
  assert.notEqual((result as { message: string }).message.length, 0);
});

test("pushExecute reports no-remote for a repo with no configured remote", () => {
  const dir = freshDir("cairn-push-noremote2-");
  git(dir, ["init", "-q", "-b", "main"]);
  configure(dir);
  git(dir, ["commit", "-q", "--allow-empty", "-m", "solo commit"]);

  assert.equal(pushPreview(dir), null);
  const result = pushExecute(dir);

  assert.equal(result.ok, false);
  assert.equal((result as { kind: string }).kind, "no-remote");
});

test("pushExecute classifies auth failures via the injected exec seam and never retries", () => {
  let calls = 0;
  const exec = (_args: string[]) => {
    calls += 1;
    return { status: 128, stdout: "", stderr: "fatal: Authentication failed for 'https://example.invalid/repo.git'" };
  };

  const result = pushExecute("C:/does/not/matter", exec);

  assert.equal(result.ok, false);
  assert.equal((result as { kind: string }).kind, "auth");
  assert.match((result as { message: string }).message, /sign in/i);
  assert.equal(calls, 1);
});
