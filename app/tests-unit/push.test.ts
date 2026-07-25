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

test("pushPreview's subject list can be shorter than its ahead count", () => {
  // A commit with an empty message contributes nothing to `log --format=%s`,
  // and the empty line is filtered out — so `subjects` really can understate
  // what a push would publish. The confirmation panel therefore shows `ahead`
  // itself, not just the list (repo task 075's review finding).
  const { b } = makeOriginAndClones();
  git(b, ["commit", "-q", "--allow-empty", "--allow-empty-message", "-m", ""]);
  git(b, ["commit", "-q", "--allow-empty", "-m", "feature: add widget"]);

  const preview = pushPreview(b);

  assert.equal(preview?.ahead, 2);
  assert.deepEqual(preview?.subjects, ["feature: add widget"]);
});

test("pushExecute pushes successfully and the ahead count drops to zero", () => {
  const { b } = makeOriginAndClones();
  git(b, ["commit", "-q", "--allow-empty", "-m", "feature: add widget"]);
  const before = pushPreview(b);
  assert.equal(before?.ahead, 1);

  const result = pushExecute(b, before!.remote, before!.branch);

  assert.equal(result.ok, true);
  assert.equal(typeof (result as { summary: string }).summary, "string");
  assert.notEqual((result as { summary: string }).summary.length, 0);
  const after = pushPreview(b);
  assert.equal(after?.ahead, 0);
});

test("pushExecute runs exactly the pinned refspec it was given, once", () => {
  const calls: string[][] = [];
  const exec = (args: string[]) => {
    calls.push(args);
    return { status: 0, stdout: "", stderr: "To file:///origin\n   1111111..2222222  HEAD -> main\n" };
  };

  const result = pushExecute("C:/does/not/matter", "origin", "main", exec);

  assert.equal(result.ok, true);
  // The whole point of repo task 075's fix: what runs is the remote and branch
  // the owner approved, spelled out, so no machine's `push.default` can widen
  // or redirect it. And still exactly one invocation — never a retry.
  assert.deepEqual(calls, [["push", "origin", "HEAD:main"]]);
});

test("a push.default=matching repo publishes only the branch that was named", () => {
  const { bare, b } = makeOriginAndClones();
  // A second branch that exists on the origin AND is ahead locally. Under a
  // bare `git push` with push.default=matching, git publishes this one too —
  // commits the confirmation panel never listed.
  git(b, ["checkout", "-q", "-b", "side"]);
  git(b, ["commit", "-q", "--allow-empty", "-m", "side base"]);
  git(b, ["push", "-q", "-u", "origin", "side"]);
  git(b, ["commit", "-q", "--allow-empty", "-m", "side ahead — must not publish"]);
  git(b, ["checkout", "-q", "main"]);
  git(b, ["commit", "-q", "--allow-empty", "-m", "main ahead"]);
  git(b, ["config", "push.default", "matching"]);
  const sideOnOriginBefore = git(bare, ["rev-parse", "side"]);

  const preview = pushPreview(b);
  const result = pushExecute(b, preview!.remote, preview!.branch);

  assert.equal(result.ok, true);
  assert.equal(git(bare, ["log", "-1", "--format=%s", "main"]), "main ahead");
  assert.equal(git(bare, ["rev-parse", "side"]), sideOnOriginBefore);
});

test("a repo with no such remote reports git's own words rather than a named kind", () => {
  const dir = freshDir("cairn-push-noremote2-");
  git(dir, ["init", "-q", "-b", "main"]);
  configure(dir);
  git(dir, ["commit", "-q", "--allow-empty", "-m", "solo commit"]);

  assert.equal(pushPreview(dir), null);
  const result = pushExecute(dir, "origin", "main");

  // Naming a remote that does not exist is a different real git failure from
  // "no push destination configured", and it lands in `other`, which reports
  // what git actually said instead of asserting more than git did.
  assert.equal(result.ok, false);
  assert.equal((result as { kind: string }).kind, "other");
  assert.match((result as { message: string }).message, /does not appear to be a git repository/);
});

test("pushExecute still classifies git's no-push-destination wording as no-remote", () => {
  // Pinning the refspec means real git no longer emits this message — it only
  // says it for a bare `git push`. The classifier is kept (the `kind` union is
  // fixed by the plan) and stays proven here, so it cannot rot unnoticed.
  const exec = (_args: string[]) => ({ status: 128, stdout: "", stderr: "fatal: No configured push destination." });

  const result = pushExecute("C:/does/not/matter", "origin", "main", exec);

  assert.equal(result.ok, false);
  assert.equal((result as { kind: string }).kind, "no-remote");
});

test("pushExecute classifies remote-ahead when the origin has commits this clone lacks", () => {
  const { a, b } = makeOriginAndClones();
  git(a, ["commit", "-q", "--allow-empty", "-m", "A's commit"]);
  git(a, ["push", "-q"]);
  git(b, ["commit", "-q", "--allow-empty", "-m", "B's commit"]);
  const preview = pushPreview(b);

  const result = pushExecute(b, preview!.remote, preview!.branch);

  assert.equal(result.ok, false);
  assert.equal((result as { kind: string }).kind, "remote-ahead");
  assert.notEqual((result as { message: string }).message.length, 0);
});

test("pushExecute classifies auth failures via the injected exec seam and never retries", () => {
  let calls = 0;
  const exec = (_args: string[]) => {
    calls += 1;
    return { status: 128, stdout: "", stderr: "fatal: Authentication failed for 'https://example.invalid/repo.git'" };
  };

  const result = pushExecute("C:/does/not/matter", "origin", "main", exec);

  assert.equal(result.ok, false);
  assert.equal((result as { kind: string }).kind, "auth");
  assert.match((result as { message: string }).message, /sign in/i);
  assert.equal(calls, 1);
});

test("neither failure message points at a control the settled outcome does not have", () => {
  const kinds = [
    { stderr: "fatal: Authentication failed for 'https://example.invalid/repo.git'", kind: "auth" },
    { stderr: "! [rejected] main -> main (fetch first)", kind: "remote-ahead" },
  ];
  for (const { stderr, kind } of kinds) {
    const result = pushExecute("C:/does/not/matter", "origin", "main", () => ({ status: 1, stdout: "", stderr }));
    assert.equal((result as { kind: string }).kind, kind);
    assert.doesNotMatch((result as { message: string }).message, /try the push again/);
    assert.match((result as { message: string }).message, /Nothing was published\./);
  }
});
