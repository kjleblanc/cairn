import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { acquireRunLock } from "../src/lock.js";
import { createOfflineDemoAdapter } from "../src/routing.js";
import { runSerialTask } from "../src/serial.js";

const LOG_HEADER =
  "| Task | Date | Lane | Draft/Final | Outcome | Decision | One-line summary | Milestone moved? |\n" +
  "|---|---|---|---|---|---|---|---|\n";

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
      () => runSerialTask(root, "A bounded outcome", { adapters: [createOfflineDemoAdapter()] }),
      /SERIAL_RUN_ACTIVE/,
    );
  } finally {
    holder.kill();
  }
});

test("a stale lock from a dead process self-heals", async () => {
  const root = project();
  writeFileSync(lockPath(root), JSON.stringify({ pid: 999_999_999, hostname: hostname(), startedAt: "2026-01-01T00:00:00.000Z" }), "utf8");
  const result = await runSerialTask(root, "A bounded outcome", { adapters: [createOfflineDemoAdapter()] });
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
