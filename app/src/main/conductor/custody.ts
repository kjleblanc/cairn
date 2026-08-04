import { closeSync, constants, existsSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

const LEDGER_BYTE_CAP = 32 * 1024 * 1024;

function inside(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..\\`) && !rel.startsWith("../") && !isAbsolute(rel));
}

/** Resolve one main-owned marker container without ever following a
 * project-controlled profile alias. The app profile and selected project may
 * not overlap in either direction. */
export function externalMarkerContainer(
  markerRoot: string | null,
  projectRoot: string,
  name: string,
  create: boolean,
): string | null {
  if (markerRoot === null) return null;
  const profilePath = resolve(markerRoot);
  const projectPath = resolve(projectRoot);
  const profileStat = lstatSync(profilePath);
  if (!profileStat.isDirectory() || profileStat.isSymbolicLink()) {
    throw new Error("EXTERNAL_MARKER_CUSTODY_UNSAFE");
  }
  const profile = realpathSync.native(profilePath);
  const project = realpathSync.native(projectPath);
  if (!lstatSync(project).isDirectory()) throw new Error("EXTERNAL_MARKER_CUSTODY_UNSAFE");
  if (inside(profile, project) || inside(project, profile)) throw new Error("EXTERNAL_MARKER_CUSTODY_UNSAFE");

  const candidate = join(profile, name);
  if (create && !existsSync(candidate)) mkdirSync(candidate);
  if (!existsSync(candidate)) return null;
  const stat = lstatSync(candidate);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("EXTERNAL_MARKER_CUSTODY_UNSAFE");
  const container = realpathSync.native(candidate);
  if (!inside(profile, container)) throw new Error("EXTERNAL_MARKER_CUSTODY_UNSAFE");
  return container;
}

export function readDigestSequence(file: string | null): readonly string[] {
  return readVerifiedLines(file, /^[0-9a-f]{64}$/);
}

function sameIdentity(left: { dev: bigint; ino: bigint }, right: { dev: bigint; ino: bigint }): boolean {
  return left.dev === right.dev && left.ino !== 0n && right.ino !== 0n && left.ino === right.ino;
}

function openLedger(file: string, create: boolean): number | null {
  const existed = existsSync(file);
  if (!existed && !create) return null;
  let descriptor: number | null = null;
  try {
    if (existed) {
      const before = lstatSync(file, { bigint: true });
      if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n
        || !inside(realpathSync.native(dirname(file)), realpathSync.native(file))) throw new Error("unsafe");
    }
    const flags = create
      ? constants.O_RDWR | constants.O_APPEND | constants.O_CREAT | (!existed ? constants.O_EXCL : 0) | (constants.O_NOFOLLOW ?? 0)
      : constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0);
    descriptor = openSync(file, flags, 0o600);
    const opened = fstatSync(descriptor, { bigint: true });
    const current = lstatSync(file, { bigint: true });
    if (!opened.isFile() || !current.isFile() || current.isSymbolicLink()
      || opened.nlink !== 1n || current.nlink !== 1n || !sameIdentity(opened, current)
      || opened.size > BigInt(LEDGER_BYTE_CAP)
      || !inside(realpathSync.native(dirname(file)), realpathSync.native(file))) throw new Error("unsafe");
    return descriptor;
  } catch {
    if (descriptor !== null) {
      try { closeSync(descriptor); } catch { /* refusal is already final */ }
    }
    throw new Error("EXTERNAL_MARKER_FILE_UNSAFE");
  }
}

function descriptorText(descriptor: number): string {
  const before = fstatSync(descriptor, { bigint: true });
  const size = Number(before.size);
  const bytes = Buffer.allocUnsafe(size);
  let offset = 0;
  while (offset < size) {
    const count = readSync(descriptor, bytes, offset, size - offset, offset);
    if (count <= 0) throw new Error("EXTERNAL_MARKER_FILE_UNSAFE");
    offset += count;
  }
  const after = fstatSync(descriptor, { bigint: true });
  if (!sameIdentity(before, after) || before.size !== after.size || after.nlink !== 1n) {
    throw new Error("EXTERNAL_MARKER_FILE_UNSAFE");
  }
  return bytes.toString("utf8");
}

export function readVerifiedLines(file: string | null, pattern: RegExp): readonly string[] {
  if (file === null) return Object.freeze([]);
  let descriptor: number | null = null;
  try {
    descriptor = openLedger(file, false);
    if (descriptor === null) return Object.freeze([]);
    return Object.freeze(descriptorText(descriptor).split(/\r?\n/).filter((line) => pattern.test(line)));
  } catch {
    return Object.freeze([]);
  } finally {
    if (descriptor !== null) {
      try { closeSync(descriptor); } catch { /* read already failed closed */ }
    }
  }
}

/** Strict custody read for ledgers where silently filtering one malformed or
 * partial line could reuse authority. Unlike digest-set reads, every complete
 * line and the final newline are part of the proof. */
export function readStrictVerifiedLines(file: string | null, pattern: RegExp): readonly string[] {
  if (file === null) return Object.freeze([]);
  let descriptor: number | null = null;
  try {
    descriptor = openLedger(file, false);
    if (descriptor === null) return Object.freeze([]);
    const value = descriptorText(descriptor);
    if (value === "") return Object.freeze([]);
    if (!value.endsWith("\n")) throw new Error("EXTERNAL_MARKER_LEDGER_INVALID");
    const lines = value.slice(0, -1).split(/\r?\n/);
    if (lines.some((line) => !pattern.test(line))) throw new Error("EXTERNAL_MARKER_LEDGER_INVALID");
    return Object.freeze(lines);
  } finally {
    if (descriptor !== null) {
      try { closeSync(descriptor); } catch { /* strict read already fails closed */ }
    }
  }
}

/** Separate a crash-partial ledger tail and prove the new line is readable. */
export function appendVerifiedLine(file: string, line: string, pattern: RegExp): void {
  if (!pattern.test(line) || /[\r\n]/.test(line)) throw new Error("EXTERNAL_MARKER_LINE_INVALID");
  const descriptor = openLedger(file, true);
  if (descriptor === null) throw new Error("EXTERNAL_MARKER_FILE_UNSAFE");
  try {
    const before = fstatSync(descriptor, { bigint: true });
    let separator = "";
    if (before.size > 0n) {
      const tail = Buffer.allocUnsafe(1);
      if (readSync(descriptor, tail, 0, 1, Number(before.size - 1n)) !== 1 || tail[0] !== 0x0a) separator = "\n";
    }
    const bytes = Buffer.from(`${separator}${line}\n`, "utf8");
    if (before.size + BigInt(bytes.length) > BigInt(LEDGER_BYTE_CAP)) throw new Error("EXTERNAL_MARKER_FILE_FULL");
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
    const after = fstatSync(descriptor, { bigint: true });
    if (!sameIdentity(before, after) || after.nlink !== 1n || after.size !== before.size + BigInt(bytes.length)) {
      throw new Error("EXTERNAL_MARKER_FILE_UNSAFE");
    }
  } finally {
    closeSync(descriptor);
  }
  if (readVerifiedLines(file, pattern).at(-1) !== line) throw new Error("EXTERNAL_MARKER_VERIFY_FAILED");
}

export function appendVerifiedDigest(file: string, digest: string): void {
  appendVerifiedLine(file, digest, /^[0-9a-f]{64}$/);
}
