import { execFileSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { basename, join, resolve } from "node:path";

export interface RunLock {
  release(): void;
}

interface LockHolder {
  pid: number;
  hostname: string;
  startedAt: string;
}

function lockFilePath(root: string): string {
  const common = execFileSync("git", ["rev-parse", "--git-common-dir"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  }).trim();
  return join(resolve(root, common), "cairn-run.lock");
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function tryCreate(path: string): boolean {
  const holder: LockHolder = { pid: process.pid, hostname: hostname(), startedAt: new Date().toISOString() };
  try {
    writeFileSync(path, JSON.stringify(holder), { encoding: "utf8", flag: "wx" });
    return true;
  } catch {
    return false;
  }
}

function readHolder(path: string): LockHolder | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (parsed && typeof parsed === "object" &&
        typeof (parsed as LockHolder).pid === "number" &&
        typeof (parsed as LockHolder).hostname === "string" &&
        typeof (parsed as LockHolder).startedAt === "string") {
      return parsed as LockHolder;
    }
  } catch {
    // Falls through to null below.
  }
  return null;
}

/**
 * One task at a time, across processes. The lock lives in the git common
 * directory: outside every worktree (so it can never trip exact-path or
 * phantom-dirty checks) and shared by all worktrees of the repository (the
 * deliberately conservative reading of one-task-at-a-time). `.git/cairn`
 * stays untouched — it is the reserved legacy-state signal.
 */
export function acquireRunLock(root: string): RunLock {
  const path = lockFilePath(root);
  if (!tryCreate(path)) {
    const holder = readHolder(path);
    if (!holder) {
      throw new Error(`SERIAL_RUN_ACTIVE: A run lock exists but could not be read. If no task is running, delete ${basename(path)} inside the project's .git folder and try again.`);
    }
    if (holder.hostname !== hostname()) {
      throw new Error(`SERIAL_RUN_ACTIVE: One task is already running for this project on ${holder.hostname} (since ${holder.startedAt}).`);
    }
    if (pidAlive(holder.pid)) {
      throw new Error(`SERIAL_RUN_ACTIVE: One task is already running for this project (pid ${holder.pid} since ${holder.startedAt}).`);
    }
    // The recorded process is dead on this machine: the lock looks stale.
    // Before deleting it, re-read and re-verify it names the exact same
    // holder we just checked (same pid, startedAt, hostname) and that the
    // pid is still dead. Another process could have healed this same stale
    // lock and written a fresh, live one at this path in the time between
    // our first read above and now; without this second look we would
    // delete that fresh lock out from under it and let two runs proceed
    // concurrently. This narrows the race to the microseconds between the
    // re-read below and the unlink that follows it — Node's stdlib has no
    // atomic compare-and-delete, so that residual window can't be closed
    // from here. A double-acquire that manages to land inside it is still
    // contained downstream by the envelope's protected-work and exact-path
    // staging checks, which fail a colliding run closed rather than let it
    // corrupt state.
    const recheck = readHolder(path);
    const stillStale = recheck !== null &&
      recheck.pid === holder.pid &&
      recheck.hostname === holder.hostname &&
      recheck.startedAt === holder.startedAt &&
      !pidAlive(recheck.pid);
    if (!stillStale) {
      throw new Error("SERIAL_RUN_ACTIVE: One task is already running for this project.");
    }
    try {
      unlinkSync(path);
    } catch {
      // Lost a race with another healer; fall through to one more attempt.
    }
    if (!tryCreate(path)) {
      throw new Error("SERIAL_RUN_ACTIVE: One task is already running for this project.");
    }
  }
  let released = false;
  return {
    release() {
      if (released) return;
      released = true;
      try {
        unlinkSync(path);
      } catch {
        // A missing file is already the released state.
      }
    },
  };
}
