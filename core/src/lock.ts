import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { hostname } from "node:os";
import { basename, join, resolve } from "node:path";
import {
  serialCandidateGitEnvironmentNameDenied,
  serialCandidateGitEnvironmentSafe,
} from "./candidate.js";

export interface RunLock {
  release(): void;
}

interface LockHolder {
  pid: number;
  hostname: string;
  startedAt: string;
  /** Q7 creation nonce. Null is accepted only for a pre-Q7 stale lock. */
  nonce: string | null;
}

interface FileIdentity {
  dev: bigint;
  ino: bigint;
}

interface LockObservation {
  holder: LockHolder;
  identity: FileIdentity;
  bytes: Buffer;
}

interface OwnedLock extends LockObservation {
  descriptor: number;
}

const LOCK_BYTE_CAP = 1024;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const SAFE_HOST = /^[^\u0000-\u001f\u007f-\u009f\u2028\u2029]{1,255}$/u;

/** Task 247. Cairn scrubs `GIT_CONFIG_GLOBAL` to the null device on every Git
 * call so that a hostile global config cannot grant or redirect authority.
 * `safe.directory` exceptions live in exactly that file, so when Git refuses a
 * folder on ownership grounds its own printed remedy - add a `safe.directory`
 * entry - is guaranteed to do nothing here. Repeating that advice sent the
 * owner to a dead end they had already tried. The refusal is correct and
 * unchanged; only what Cairn says about it is. */
export interface GitOwnershipRefusalV1 {
  /** The folder Git refused, exactly as Git spelled it. */
  repository: string;
  /** Present only when Git compared real accounts; absent when it did not. */
  owningAccount: string | null;
  currentAccount: string | null;
}

const DUBIOUS_OWNERSHIP = /detected dubious ownership in repository at '([^']*)'/u;
const OWNING_ACCOUNT = /is owned by:[^\S\n]*\n([^\n]*)/u;
const CURRENT_ACCOUNT = /but the current user is:[^\S\n]*\n([^\n]*)/u;

/** Git names the accounts on the line after each marker, as `NAME (SID)` on
 * Windows and `uid N` elsewhere. The trailing parenthesis is dropped: the SID
 * is noise to the person reading this, and the name is what they must type. */
function accountAfter(text: string, marker: RegExp): string | null {
  const found = marker.exec(text);
  if (!found) return null;
  const named = found[1].replace(/\s*\([^)]*\)\s*$/u, "").trim();
  return named.length > 0 && named.length <= 256 ? named : null;
}

export function gitOwnershipRefusal(text: string): GitOwnershipRefusalV1 | null {
  if (typeof text !== "string") return null;
  const found = DUBIOUS_OWNERSHIP.exec(text);
  if (!found) return null;
  return {
    repository: found[1],
    owningAccount: accountAfter(text, OWNING_ACCOUNT),
    currentAccount: accountAfter(text, CURRENT_ACCOUNT),
  };
}

export function gitOwnershipRefusalMessage(
  refusal: GitOwnershipRefusalV1,
  platform: NodeJS.Platform = process.platform,
): string {
  // Git prints Windows accounts with a forward slash; NTAccount needs a
  // backslash, so a remedy pasted as printed would fail.
  const asAccount = refusal.currentAccount === null
    ? "$env:USERDOMAIN\\$env:USERNAME"
    : refusal.currentAccount.replace(/\//gu, "\\");
  const remedy = platform === "win32"
    ? [
      "In PowerShell, with this project closed:",
      `  $folder = "${refusal.repository}"`,
      "  $acl = Get-Acl $folder",
      `  $acl.SetOwner([System.Security.Principal.NTAccount]"${asAccount}")`,
      "  Set-Acl -Path $folder -AclObject $acl",
    ].join("\n")
    : [
      "In a terminal, with this project closed:",
      `  chown "$(id -un)" '${refusal.repository}'`,
    ].join("\n");
  const accounts = refusal.owningAccount !== null && refusal.currentAccount !== null
    ? [`  the folder belongs to   ${refusal.owningAccount}`,
      `  you are signed in as    ${refusal.currentAccount}`].join("\n")
    : null;
  return [
    "Cairn cannot use Git here, because this project's folder belongs to a"
    + " different account than the one you are signed in as. Cairn has changed"
    + " nothing and run nothing.",
    `The folder: ${refusal.repository}`,
    ...(accounts === null ? [] : [accounts]),
    "Git suggests adding a safe.directory exception to your global Git"
    + " configuration. That will not help here, and if you have already tried it"
    + " this is why nothing changed: Cairn does not read your global Git"
    + " configuration. That is deliberate - it is what stops a stray setting on"
    + " this machine from redirecting Cairn's Git - so an exception written"
    + " there is never seen.",
    "What works is making the folder yours again.",
    remedy,
    "Then open this project again.",
  ].join("\n\n");
}

function lockFilePath(root: string): string {
  if (!serialCandidateGitEnvironmentSafe()) throw new Error("UNSAFE_SERIAL_RUN_GIT_ENVIRONMENT");
  const environment: NodeJS.ProcessEnv = { ...process.env };
  for (const name of Object.keys(environment)) {
    if (serialCandidateGitEnvironmentNameDenied(name)) delete environment[name];
  }
  environment.GIT_TERMINAL_PROMPT = "0";
  environment.GIT_OPTIONAL_LOCKS = "0";
  environment.GIT_NO_REPLACE_OBJECTS = "1";
  const nullConfig = process.platform === "win32" ? "NUL" : "/dev/null";
  environment.GIT_CONFIG_NOSYSTEM = "1";
  environment.GIT_CONFIG_SYSTEM = nullConfig;
  environment.GIT_CONFIG_GLOBAL = nullConfig;
  for (const name of [
    "GIT_TRACE", "GIT_TRACE_PACK_ACCESS", "GIT_TRACE_PACKFILE", "GIT_TRACE_PACKET",
    "GIT_TRACE_PERFORMANCE", "GIT_TRACE_SETUP", "GIT_TRACE_SHALLOW", "GIT_TRACE_CURL",
    "GIT_TRACE_FSMONITOR", "GIT_TRACE2", "GIT_TRACE2_EVENT", "GIT_TRACE2_PERF",
  ]) environment[name] = "0";
  let common: string;
  try {
    common = execFileSync("git", [
      "-c", "core.fsmonitor=false",
      "-c", "trace2.normalTarget=0",
      "-c", "trace2.eventTarget=0",
      "-c", "trace2.perfTarget=0",
      "rev-parse", "--git-common-dir",
    ], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: environment,
    }).trim();
  } catch (error) {
    // Task 247. This is the first Git call in any run, so an ownership refusal
    // lands here and nowhere later. Every other Git failure keeps its own text.
    const refusal = gitOwnershipRefusal((error as Error)?.message ?? "");
    if (!refusal) throw error;
    throw new Error(gitOwnershipRefusalMessage(refusal));
  }
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

function sameIdentity(left: FileIdentity, right: FileIdentity): boolean {
  return left.dev === right.dev && left.ino !== 0n && right.ino !== 0n && left.ino === right.ino;
}

function exactHolder(value: unknown): LockHolder | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const legacy = keys.length === 3 && keys.join("\0") === "hostname\0pid\0startedAt";
  const current = keys.length === 4 && keys.join("\0") === "hostname\0nonce\0pid\0startedAt";
  if (!legacy && !current) return null;
  if (!Number.isSafeInteger(record.pid) || Object.is(record.pid, -0) || Number(record.pid) < 1
    || typeof record.hostname !== "string" || !SAFE_HOST.test(record.hostname)
    || typeof record.startedAt !== "string" || record.startedAt.length > 64
    || !Number.isFinite(Date.parse(record.startedAt))
    || new Date(record.startedAt).toISOString() !== record.startedAt) return null;
  const nonce = legacy ? null : record.nonce;
  if (nonce !== null && (typeof nonce !== "string" || !UUID_V4.test(nonce))) return null;
  return {
    pid: record.pid as number,
    hostname: record.hostname,
    startedAt: record.startedAt,
    nonce: nonce as string | null,
  };
}

function readDescriptor(descriptor: number, size: number): Buffer | null {
  if (!Number.isSafeInteger(size) || size < 2 || size > LOCK_BYTE_CAP) return null;
  const bytes = Buffer.allocUnsafe(size);
  let offset = 0;
  while (offset < size) {
    const count = readSync(descriptor, bytes, offset, size - offset, offset);
    if (count <= 0) return null;
    offset += count;
  }
  return bytes;
}

function observeLock(path: string): LockObservation | null {
  let descriptor: number | null = null;
  try {
    const before = lstatSync(path, { bigint: true });
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n || before.ino === 0n
      || before.size > BigInt(LOCK_BYTE_CAP)) return null;
    descriptor = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n || !sameIdentity(before, opened)) return null;
    const bytes = readDescriptor(descriptor, Number(opened.size));
    if (bytes === null) return null;
    const after = fstatSync(descriptor, { bigint: true });
    const named = lstatSync(path, { bigint: true });
    if (!after.isFile() || after.nlink !== 1n || !sameIdentity(opened, after)
      || after.size !== opened.size || after.mtimeNs !== opened.mtimeNs || after.ctimeNs !== opened.ctimeNs
      || !named.isFile() || named.isSymbolicLink() || named.nlink !== 1n || !sameIdentity(after, named)
      || named.size !== after.size || named.mtimeNs !== after.mtimeNs || named.ctimeNs !== after.ctimeNs) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(bytes.toString("utf8"));
    } catch {
      return null;
    }
    const holder = exactHolder(parsed);
    if (holder === null) return null;
    return { holder, identity: { dev: after.dev, ino: after.ino }, bytes };
  } catch {
    return null;
  } finally {
    if (descriptor !== null) {
      try { closeSync(descriptor); } catch { /* the observation already fails closed */ }
    }
  }
}

function tryCreate(path: string): OwnedLock | null {
  const holder: LockHolder = {
    pid: process.pid,
    hostname: hostname(),
    startedAt: new Date().toISOString(),
    nonce: randomUUID(),
  };
  const bytes = Buffer.from(JSON.stringify(holder), "utf8");
  let descriptor: number | null = null;
  try {
    descriptor = openSync(
      path,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0),
      0o600,
    );
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
    const opened = fstatSync(descriptor, { bigint: true });
    const named = lstatSync(path, { bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n || opened.ino === 0n || opened.size !== BigInt(bytes.length)
      || !named.isFile() || named.isSymbolicLink() || named.nlink !== 1n || !sameIdentity(opened, named)
      || named.size !== opened.size) throw new Error("unsafe lock creation");
    const owned: OwnedLock = {
      holder,
      identity: { dev: opened.dev, ino: opened.ino },
      bytes,
      descriptor,
    };
    descriptor = null;
    return owned;
  } catch {
    if (descriptor !== null) {
      try { closeSync(descriptor); } catch { /* refusal is already final */ }
    }
    return null;
  }
}

function sameHolder(left: LockHolder, right: LockHolder): boolean {
  return left.pid === right.pid && left.hostname === right.hostname
    && left.startedAt === right.startedAt && left.nonce === right.nonce;
}

function stillOwns(path: string, owned: OwnedLock): boolean {
  try {
    const opened = fstatSync(owned.descriptor, { bigint: true });
    const named = lstatSync(path, { bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n || !sameIdentity(opened, owned.identity)
      || !named.isFile() || named.isSymbolicLink() || named.nlink !== 1n
      || !sameIdentity(named, owned.identity)) return false;
    const observed = observeLock(path);
    return observed !== null && sameIdentity(observed.identity, owned.identity)
      && sameHolder(observed.holder, owned.holder) && observed.bytes.equals(owned.bytes);
  } catch {
    return false;
  }
}

/**
 * One task at a time, across processes. The lock lives in the git common
 * directory: outside every worktree (so it can never trip exact-path or
 * phantom-dirty checks) and shared by all worktrees of the repository (the
 * deliberately conservative reading of one-task-at-a-time). `.git/cairn`
 * stays untouched; it is the reserved legacy-state signal.
 */
export function acquireRunLock(root: string): RunLock {
  const path = lockFilePath(root);
  let owned = tryCreate(path);
  if (owned === null) {
    const observed = observeLock(path);
    if (!observed) {
      throw new Error(`SERIAL_RUN_ACTIVE: A run lock exists but could not be read. If no task is running, delete ${basename(path)} inside the project's .git folder and try again.`);
    }
    const holder = observed.holder;
    if (holder.hostname !== hostname()) {
      throw new Error(`SERIAL_RUN_ACTIVE: One task is already running for this project on ${holder.hostname} (since ${holder.startedAt}).`);
    }
    if (pidAlive(holder.pid)) {
      throw new Error(`SERIAL_RUN_ACTIVE: One task is already running for this project (pid ${holder.pid} since ${holder.startedAt}).`);
    }
    // The PID lock is process-lifetime authority only. Heal one exact dead
    // holder, but never guess through a malformed/link/changed replacement.
    const recheck = observeLock(path);
    const stillStale = recheck !== null && sameIdentity(recheck.identity, observed.identity)
      && sameHolder(recheck.holder, holder) && recheck.bytes.equals(observed.bytes)
      && !pidAlive(recheck.holder.pid);
    if (!stillStale) {
      throw new Error("SERIAL_RUN_ACTIVE: One task is already running for this project.");
    }
    try {
      unlinkSync(path);
    } catch {
      // Lost a race with another healer; the exact-create below decides.
    }
    owned = tryCreate(path);
    if (owned === null) {
      throw new Error("SERIAL_RUN_ACTIVE: One task is already running for this project.");
    }
  }

  let released = false;
  return {
    release() {
      if (released) return;
      released = true;
      try {
        // An old owner must never delete a replacement lock. Exact live
        // descriptor, inode, nonce and bytes all have to remain bound.
        if (stillOwns(path, owned)) unlinkSync(path);
      } catch {
        // A missing or replaced file is already outside this owner's authority.
      } finally {
        try { closeSync(owned.descriptor); } catch { /* release stays idempotent */ }
      }
    },
  };
}
