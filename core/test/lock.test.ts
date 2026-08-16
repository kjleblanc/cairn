import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import {
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { acquireRunLock, gitOwnershipRefusal, gitOwnershipRefusalMessage } from "../src/lock.js";
import { createDirectTaskIntent } from "../src/intent.js";
import { createOfflineDemoAdapter } from "../src/routing.js";
import { runSerialTask } from "../src/serial.js";

const LOG_HEADER =
  "| Task | Date | Lane | Draft/Final | Outcome | Decision | One-line summary | Milestone moved? |\n" +
  "|---|---|---|---|---|---|---|---|\n";

function request() {
  const intent = createDirectTaskIntent("A bounded outcome", "00000000-0000-4000-8000-000000000066");
  assert.ok(intent);
  return intent;
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trimEnd();
}

function project(): string {
  const root = mkdtempSync(join(tmpdir(), "cairn-lock-test-"));
  mkdirSync(join(root, "docs", "ai-work", "tasks"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), [
    "# Project Contract", "", "Cairn Contract v0.0.1", "STATUS: ACTIVE",
    "PROJECT NAME: Lock fixture", "WHAT WE ARE BUILDING: a fixture",
    "WHO WILL USE IT: tests", "CURRENT MILESTONE: see a verified result", "",
  ].join("\n"));
  writeFileSync(join(root, "docs", "ai-work", "PROJECT.md"), "# Lock fixture\n");
  writeFileSync(join(root, "docs", "ai-work", "LOG.md"), LOG_HEADER);
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Cairn Test"]);
  git(root, ["config", "user.email", "cairn-test@example.invalid"]);
  git(root, ["add", "AGENTS.md", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md"]);
  git(root, ["commit", "-q", "-m", "fixture"]);
  return root;
}

function lockPath(root: string): string {
  const common = git(root, ["rev-parse", "--git-common-dir"]);
  return join(resolve(root, common), "cairn-run.lock");
}

test("the lock file lives in the git common dir and never dirties the worktree", () => {
  const root = project();
  const lock = acquireRunLock(root);
  assert.equal(existsSync(lockPath(root)), true);
  const held = JSON.parse(readFileSync(lockPath(root), "utf8"));
  assert.equal(held.pid, process.pid);
  assert.equal(held.hostname, hostname());
  assert.match(held.nonce, /^[a-f0-9-]{36}$/u);
  assert.equal(git(root, ["status", "--porcelain=v1", "--untracked-files=all"]), "");
  lock.release();
  assert.equal(existsSync(lockPath(root)), false);
});

test("a lock held by another live process refuses a second run", async () => {
  const root = project();
  const lockModule = pathToFileURL(resolve("dist", "src", "lock.js")).href;
  // A real second process acquires the lock and holds it until killed.
  const holder = spawn(process.execPath, [
    "--input-type=module",
    "-e",
    `import { acquireRunLock } from ${JSON.stringify(lockModule)};
     acquireRunLock(process.argv[1]);
     process.stdout.write("held\\n");
     setInterval(() => {}, 1000);`,
    root,
  ], { stdio: ["ignore", "pipe", "pipe"] });
  await new Promise<void>((resolveHeld, rejectHeld) => {
    holder.stdout.on("data", (chunk: Buffer) => { if (chunk.toString().includes("held")) resolveHeld(); });
    holder.once("exit", () => rejectHeld(new Error("holder exited before acquiring")));
  });
  try {
    await assert.rejects(
      () => runSerialTask(root, request(), { adapters: [createOfflineDemoAdapter()] }),
      /SERIAL_RUN_ACTIVE/,
    );
  } finally {
    holder.kill();
  }
});

test("a stale lock from a dead process self-heals", async () => {
  const root = project();
  writeFileSync(lockPath(root), JSON.stringify({ pid: 999_999_999, hostname: hostname(), startedAt: "2026-01-01T00:00:00.000Z" }), "utf8");
  const result = await runSerialTask(root, request(), { adapters: [createOfflineDemoAdapter()] });
  assert.equal(result.status, "done");
  assert.equal(existsSync(lockPath(root)), false);
});

test("an unreadable lock refuses and names the file instead of guessing", () => {
  const root = project();
  writeFileSync(lockPath(root), "not json at all", "utf8");
  assert.throws(() => acquireRunLock(root), (error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    return message.startsWith("SERIAL_RUN_ACTIVE:") && message.includes("cairn-run.lock");
  });
});

test("an old owner never deletes a lock-path replacement", () => {
  const root = project();
  const path = lockPath(root);
  const displaced = `${path}.displaced`;
  const lock = acquireRunLock(root);
  renameSync(path, displaced);
  const replacement = JSON.stringify({
    pid: process.pid,
    hostname: hostname(),
    startedAt: "2026-08-08T00:00:00.000Z",
    nonce: "10000000-0000-4000-8000-000000000001",
  });
  writeFileSync(path, replacement, "utf8");
  lock.release();
  assert.equal(readFileSync(path, "utf8"), replacement);
  rmSync(path, { force: true });
  rmSync(displaced, { force: true });
});

test("hardlinked and symlinked lock files fail closed", (t) => {
  const holder = JSON.stringify({
    pid: 999_999_999,
    hostname: hostname(),
    startedAt: "2026-08-08T00:00:00.000Z",
    nonce: "10000000-0000-4000-8000-000000000002",
  });
  const hardRoot = project();
  const hardSource = join(hardRoot, "lock-source.json");
  writeFileSync(hardSource, holder, "utf8");
  linkSync(hardSource, lockPath(hardRoot));
  assert.throws(() => acquireRunLock(hardRoot), /SERIAL_RUN_ACTIVE/);
  assert.equal(existsSync(lockPath(hardRoot)), true);

  const linkRoot = project();
  const linkSource = join(linkRoot, "lock-source.json");
  writeFileSync(linkSource, holder, "utf8");
  try {
    symlinkSync(linkSource, lockPath(linkRoot), "file");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EPERM") {
      t.diagnostic("file symlink creation is unavailable on this Windows host");
      return;
    }
    throw error;
  }
  assert.throws(() => acquireRunLock(linkRoot), /SERIAL_RUN_ACTIVE/);
  assert.equal(existsSync(lockPath(linkRoot)), true);
});

test("repo-shaping and trace Git environments are rejected before lock discovery", () => {
  const root = project();
  const expectedLockPath = lockPath(root);
  const outside = mkdtempSync(join(tmpdir(), "cairn-lock-env-"));
  const traceCanary = join(outside, "trace-canary.json");
  const cases: ReadonlyArray<readonly [string, string]> = [
    ["GIT_DIR", outside],
    ["GIT_COMMON_DIR", outside],
    ["GIT_INDEX_FILE", join(outside, "outside.index")],
    ["GIT_NO_REPLACE_OBJECTS", "0"],
    ["GIT_TRACE2_EVENT", traceCanary],
  ];
  for (const [name, value] of cases) {
    const prior = process.env[name];
    process.env[name] = value;
    try {
      assert.throws(() => acquireRunLock(root), /UNSAFE_SERIAL_RUN_GIT_ENVIRONMENT/);
      assert.equal(existsSync(expectedLockPath), false);
      assert.equal(existsSync(traceCanary), false);
    } finally {
      if (prior === undefined) delete process.env[name];
      else process.env[name] = prior;
    }
  }
});

/* Task 247. Cairn scrubs GIT_CONFIG_GLOBAL to the null device on every Git
 * call, deliberately, so that a hostile global config cannot grant or redirect
 * authority. safe.directory exceptions live in exactly that file. The result
 * was a refusal that printed Git's standard advice - add a safe.directory
 * entry - which Cairn's own hardening guarantees can never be read. The owner
 * had already added the correct entry and it did nothing. The check is right;
 * the sentence was not. */

function withEnv<T>(names: Record<string, string>, body: () => T): T {
  const prior = new Map(Object.keys(names).map((name) => [name, process.env[name]]));
  Object.assign(process.env, names);
  try {
    return body();
  } finally {
    for (const [name, value] of prior) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

/* The hardening this task must NOT weaken. candidate.ts permits exactly one
 * safe.directory triplet to exist in Cairn's own process and still strips it
 * from every child, "so even `*` cannot grant or redirect authority". The
 * tempting fix for Task 247 was to forward it. This pins that it is not
 * forwarded: an exception naming this exact folder is granted to the parent,
 * and Cairn refuses anyway. */
test("a permitted safe.directory triplet still never reaches Cairn's Git", () => {
  const root = project();
  withEnv({
    GIT_TEST_ASSUME_DIFFERENT_OWNER: "1",
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "safe.directory",
    GIT_CONFIG_VALUE_0: root,
  }, () => {
    assert.throws(() => acquireRunLock(root), /folder belongs to a different account/u,
      "an exception granted to the parent process reached the child: the scrub has been weakened");
  });
});

/** Captured verbatim from the failure the owner hit on 2026-08-15, by running
 * Cairn's exact argv in the repository Git refused. The short form above it -
 * no account lines at all - is what Git prints when it did not compare real
 * accounts; both shapes reach this code. */
const REAL_OWNERSHIP_STDERR = [
  "Command failed: git -c core.fsmonitor=false -c trace2.normalTarget=0 -c trace2.eventTarget=0"
  + " -c trace2.perfTarget=0 rev-parse --git-common-dir",
  "fatal: detected dubious ownership in repository at 'C:/Users/KenJL/Desktop/WebApp Projects/AI Coding Workflow Framework'",
  "'C:/Users/KenJL/Desktop/WebApp Projects/AI Coding Workflow Framework' is owned by:",
  "\tObelisk/CodexSandboxOffline (S-1-5-21-647535529-674145741-2220282659-1004)",
  "but the current user is:",
  "\tOBELISK/KenJL (S-1-5-21-647535529-674145741-2220282659-1002)",
  "To add an exception for this directory, call:",
  "",
  "\tgit config --global --add safe.directory 'C:/Users/KenJL/Desktop/WebApp Projects/AI Coding Workflow Framework'",
  "",
].join("\n");

test("the two accounts Git named are read back out of the refusal", () => {
  const refusal = gitOwnershipRefusal(REAL_OWNERSHIP_STDERR);
  assert.ok(refusal, "the real refusal was not recognised at all");
  assert.equal(refusal.repository, "C:/Users/KenJL/Desktop/WebApp Projects/AI Coding Workflow Framework");
  assert.equal(refusal.owningAccount, "Obelisk/CodexSandboxOffline");
  assert.equal(refusal.currentAccount, "OBELISK/KenJL");
});

test("the message names both accounts so the owner can see which is which", () => {
  const refusal = gitOwnershipRefusal(REAL_OWNERSHIP_STDERR);
  assert.ok(refusal);
  const message = gitOwnershipRefusalMessage(refusal, "win32");
  assert.match(message, /Obelisk\/CodexSandboxOffline/u, "the owning account is not named");
  assert.match(message, /OBELISK\/KenJL/u, "the owner's own account is not named");
  // The remedy has to be runnable as written, and NTAccount wants a backslash
  // where Git printed a forward slash.
  assert.match(message, /NTAccount\]"OBELISK\\KenJL"/u, "the remedy does not carry a usable account name");
  assert.doesNotMatch(message, /git config --global --add safe\.directory/u);
});

test("an ordinary Git failure is not mistaken for an ownership refusal", () => {
  for (const text of [
    "",
    "fatal: not a git repository (or any of the parent directories): .git",
    "fatal: unable to read config file '.git/config': Permission denied",
    "error: pathspec 'nope' did not match any file(s) known to git",
    "the file is owned by someone else",
    "detected dubious ownership",
  ]) assert.equal(gitOwnershipRefusal(text), null, `wrongly matched: ${JSON.stringify(text)}`);
});

test("an ownership refusal is explained in Cairn's own words, not Git's inert advice", () => {
  const root = project();
  withEnv({ GIT_TEST_ASSUME_DIFFERENT_OWNER: "1" }, () => {
    assert.throws(() => acquireRunLock(root), (error: unknown) => {
      const message = (error as Error).message;
      // Git's own remedy must not survive: following it changes nothing,
      // because Cairn never reads the file it would be written to.
      assert.doesNotMatch(message, /git config --global --add safe\.directory/u,
        `Cairn repeated Git's inert advice. Got:\n${message}`);
      assert.match(message, /does not read your global Git configuration/u,
        `Cairn did not say why a safe.directory entry cannot help. Got:\n${message}`);
      assert.match(message, /folder/u, `Cairn did not name what is wrong. Got:\n${message}`);
      return true;
    });
  });
});
