import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  readdirSync,
  realpathSync,
  type BigIntStats,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { types as nodeTypes } from "node:util";
import {
  BUILDER_INTERCOM_LIMITS,
  BUILDER_SELECTOR_PROVENANCE_VERSION,
  BUILDER_TURN_CONTEXT_VERSION,
  builderSelectedTrackedTextPathAllowed,
  builderTurnContextSha256,
  composeBuilderTurnContext,
  type BuilderTurnContextV1,
} from "@cairn/core";
import {
  builderReviewProjectStillExact,
  captureBuilderReviewProject,
  type BuilderReviewProjectBinding,
} from "./conductor/builderreviewauth.js";

export const BUILDER_TRACKED_TEXT_SELECTION_VERSION = "cairn-builder-tracked-text-selection/v1" as const;

export type BuilderTrackedTextSelectionV1 = Readonly<{
  version: typeof BUILDER_TRACKED_TEXT_SELECTION_VERSION;
  context: BuilderTurnContextV1;
}>;

type InspectedRecord = Readonly<Record<string, unknown>>;
type FileIdentity = Readonly<{
  dev: bigint;
  ino: bigint;
  mode: bigint;
  nlink: bigint;
  size: bigint;
  mtimeNs: bigint;
  ctimeNs: bigint;
}>;
type SelectedFileState = Readonly<{
  projectRelativePath: string;
  content: string;
  sha256: string;
  identity: FileIdentity;
}>;
type GitExecutableIdentity = Readonly<{
  path: string;
  dev: bigint;
  ino: bigint;
  mode: bigint;
  nlink: bigint;
  size: bigint;
  mtimeNs: bigint;
  ctimeNs: bigint;
  sha256: string;
  version: string;
}>;
type ControlFileSnapshot = Readonly<{
  sha256: string;
  bytes: Buffer;
  identity: FileIdentity;
}>;
type GitState = Readonly<{
  executable: GitExecutableIdentity;
  gitDirectory: string;
  gitDirectoryDev: bigint;
  gitDirectoryIno: bigint;
  headRef: string;
  baseHead: string;
  objectFormat: "sha1" | "sha256";
  indexSha256: string;
  configSha256: string;
  headFileSha256: string;
  excludeSha256: string | null;
  controlIdentitySha256: string;
  stagedInventorySha256: string;
  statusSha256: string;
  selectedIndexRowsSha256: string;
  selectedAttributeRowsSha256: string;
}>;
type SelectionSnapshot = Readonly<{
  project: BuilderReviewProjectBinding;
  paths: readonly string[];
  files: readonly SelectedFileState[];
  git: GitState;
  stateSha256: string;
  context: BuilderTurnContextV1;
}>;

const selections = new WeakMap<object, SelectionSnapshot>();
const FORBIDDEN_TEXT = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/u;
const GIT_OID = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const GIT_REF = /^refs\/(?:heads|tags)\/[A-Za-z0-9][A-Za-z0-9._\/-]{0,1023}$/u;
const GIT_VERSION = /^git version [0-9]+\.[0-9]+\.[0-9]+(?:\.[A-Za-z0-9.-]+)?$/u;
const MAX_GIT_OUTPUT_BYTES = 8 * 1024 * 1024;
const MAX_GIT_CONTROL_BYTES = 16 * 1024 * 1024;
const MAX_EXECUTABLE_BYTES = 128 * 1024 * 1024;
const GIT_ARGS = Object.freeze([
  "--no-pager",
  "--no-optional-locks",
  "-c", "core.fsmonitor=false",
  "-c", "core.untrackedCache=false",
  "-c", "core.useReplaceRefs=false",
  "-c", "core.excludesFile=/dev/null",
  "-c", "core.attributesFile=/dev/null",
] as const);

function isProxy(value: object): boolean {
  try { return nodeTypes.isProxy(value); } catch { return true; }
}

function inspectRecord(value: unknown, keys: readonly string[]): InspectedRecord | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const own = Reflect.ownKeys(value);
    if (own.length !== keys.length || own.some((key) => typeof key !== "string" || !keys.includes(key))) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (!descriptor || !descriptor.enumerable || descriptor.get || descriptor.set || !("value" in descriptor)) return null;
      output[key] = descriptor.value;
    }
    return output;
  } catch {
    return null;
  }
}

function inspectArray(value: unknown, cap: number): readonly unknown[] | null {
  try {
    if (!Array.isArray(value) || isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (!lengthDescriptor || !("value" in lengthDescriptor) || !Number.isSafeInteger(lengthDescriptor.value)
      || lengthDescriptor.value < 0 || lengthDescriptor.value > cap) return null;
    const length = lengthDescriptor.value as number;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== length + 1 || keys.at(-1) !== "length") return null;
    const output: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      if (keys[index] !== String(index)) return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable || descriptor.get || descriptor.set) return null;
      output.push(descriptor.value);
    }
    return output;
  } catch {
    return null;
  }
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(parts: readonly string[]): string {
  return `${parts.length};${parts.map((part) => `${part.length}:${part}`).join("")}`;
}

function normalizedPath(value: string): string {
  return process.platform === "win32" ? value.replace(/\\/g, "/") : value;
}

function samePath(left: string, right: string): boolean {
  return normalizedPath(left) === normalizedPath(right);
}

function inside(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..\\`) && !rel.startsWith("../") && !isAbsolute(rel));
}

function sameIdentity(left: { dev: bigint; ino: bigint }, right: { dev: bigint; ino: bigint }): boolean {
  return left.dev === right.dev && left.ino !== 0n && right.ino !== 0n && left.ino === right.ino;
}

function exactFileIdentity(value: BigIntStats): FileIdentity | null {
  return value.isFile() && value.dev > 0n && value.ino > 0n && value.nlink === 1n && value.size >= 0n
    ? Object.freeze({
        dev: value.dev,
        ino: value.ino,
        mode: value.mode,
        nlink: value.nlink,
        size: value.size,
        mtimeNs: value.mtimeNs,
        ctimeNs: value.ctimeNs,
      })
    : null;
}

function sameFileIdentity(left: FileIdentity, right: FileIdentity): boolean {
  return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode
    && left.nlink === right.nlink && left.size === right.size
    && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
}

function wellFormedUtf16(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}

function containsCredentialMaterial(text: string): boolean {
  if (/-----BEGIN (?:(?:(?:RSA|EC|OPENSSH|DSA|ENCRYPTED) )?PRIVATE KEY|PGP PRIVATE KEY BLOCK)-----/iu.test(text)) return true;
  if (/^PuTTY-User-Key-File-\d+:/imu.test(text)) return true;
  if (/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/u.test(text)) return true;
  if (/\bsk-[A-Za-z0-9_-]{16,}\b/u.test(text)) return true;
  if (/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/u.test(text)) return true;
  if (/\bgh[opusr]_[A-Za-z0-9]{20,}\b/u.test(text)) return true;
  if (/\bglpat-[A-Za-z0-9_-]{20,}\b/u.test(text)) return true;
  if (/\bAIza[A-Za-z0-9_-]{35}\b/u.test(text)) return true;
  if (/\bGOCSPX-[A-Za-z0-9_-]{20,}\b/u.test(text)) return true;
  if (/\bnpm_[A-Za-z0-9]{20,}\b/u.test(text)) return true;
  if (/\bpypi-[A-Za-z0-9_-]{30,}\b/u.test(text)) return true;
  if (/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/u.test(text)) return true;
  if (/\bBearer\s+[A-Za-z0-9._~-]{20,}\b/iu.test(text)) return true;
  if (/\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^@\s/]+@/iu.test(text)) return true;
  const field = "(?:api[_-]?key|access[_-]?(?:key|token)|refresh[_-]?token|auth[_-]?token|client[_-]?(?:secret|key[_-]?data)|private[_-]?key|aws[_-]?secret[_-]?access[_-]?key|database[_-]?url|connection[_-]?string|password|passphrase|secret|token)";
  if (new RegExp(`["']?${field}["']?\\s*[:=]\\s*["'][^"'\\r\\n]{12,}["']`, "iu").test(text)) return true;
  return new RegExp(`^\\s*${field}\\s*[:=]\\s*(?!["'{[(])(?!\\$\\{)(?!process\\.env\\b)(?![A-Za-z_$][\\w$]*\\.)([^\\s#,}\\]]{12,})\\s*(?:#.*)?$`, "imu").test(text);
}

function gitEnvironment(): NodeJS.ProcessEnv {
  const environment = Object.fromEntries(Object.entries(process.env)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  for (const name of Object.keys(environment)) {
    const upper = name.toUpperCase();
    if (upper.startsWith("GIT_") || upper.startsWith("DYLD_") || upper.startsWith("LD_")
      || upper === "SSH_ASKPASS" || upper === "GCM_INTERACTIVE"
      || upper === "BASH_ENV" || upper === "ENV") delete environment[name];
  }
  const nullConfig = process.platform === "win32" ? "NUL" : "/dev/null";
  environment.GIT_CONFIG_NOSYSTEM = "1";
  environment.GIT_CONFIG_SYSTEM = nullConfig;
  environment.GIT_CONFIG_GLOBAL = nullConfig;
  environment.GIT_TERMINAL_PROMPT = "0";
  environment.GIT_OPTIONAL_LOCKS = "0";
  environment.GIT_NO_REPLACE_OBJECTS = "1";
  environment.GCM_INTERACTIVE = "Never";
  environment.LC_ALL = "C";
  return environment;
}

function runProcess(executable: string, args: readonly string[], cwd: string, input?: Buffer): Readonly<{
  status: number;
  stdout: Buffer;
  stderr: Buffer;
}> | null {
  const result = spawnSync(executable, [...args], {
    cwd,
    input,
    encoding: "buffer",
    stdio: ["pipe", "pipe", "pipe"],
    env: gitEnvironment(),
    timeout: 10_000,
    maxBuffer: MAX_GIT_OUTPUT_BYTES,
    windowsHide: true,
  });
  if (result.error || result.signal !== null || typeof result.status !== "number"
    || !Buffer.isBuffer(result.stdout) || !Buffer.isBuffer(result.stderr)) return null;
  return Object.freeze({ status: result.status, stdout: result.stdout, stderr: result.stderr });
}

function decodeUtf8(buffer: Buffer): string | null {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buffer); } catch { return null; }
}

function oneLine(buffer: Buffer): string | null {
  const text = decodeUtf8(buffer);
  if (text === null || !text.endsWith("\n")) return null;
  const line = text.slice(0, -1).replace(/\r$/u, "");
  return line.includes("\n") || line.includes("\r") ? null : line;
}

function git(executable: string, root: string, args: readonly string[], accepted: readonly number[] = [0], input?: Buffer) {
  const result = runProcess(executable, [...GIT_ARGS, ...args], root, input);
  return result !== null && accepted.includes(result.status) && result.stderr.length === 0 ? result : null;
}

function executableIdentity(pathValue: string): GitExecutableIdentity | null {
  let descriptor: number | null = null;
  try {
    const path = realpathSync.native(pathValue);
    const named = exactFileIdentity(lstatSync(path, { bigint: true }));
    if (named === null || named.size <= 0n || named.size > BigInt(MAX_EXECUTABLE_BYTES)) return null;
    descriptor = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const opened = exactFileIdentity(fstatSync(descriptor, { bigint: true }));
    if (opened === null || !sameFileIdentity(named, opened)) return null;
    const bytes = Buffer.alloc(Number(opened.size));
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(descriptor, bytes, offset, bytes.length - offset, null);
      if (count === 0) break;
      offset += count;
    }
    const afterRead = exactFileIdentity(fstatSync(descriptor, { bigint: true }));
    const reboundAfterRead = exactFileIdentity(lstatSync(path, { bigint: true }));
    if (offset !== bytes.length || afterRead === null || reboundAfterRead === null
      || !sameFileIdentity(opened, afterRead) || !sameFileIdentity(opened, reboundAfterRead)) return null;
    const versionResult = runProcess(path, ["--version"], dirname(path));
    const version = versionResult?.status === 0 && versionResult.stderr.length === 0 ? oneLine(versionResult.stdout) : null;
    const afterRun = exactFileIdentity(fstatSync(descriptor, { bigint: true }));
    const reboundAfterRun = exactFileIdentity(lstatSync(path, { bigint: true }));
    if (version === null || !GIT_VERSION.test(version) || afterRun === null || reboundAfterRun === null
      || !sameFileIdentity(opened, afterRun) || !sameFileIdentity(opened, reboundAfterRun)) return null;
    return Object.freeze({
      path,
      dev: afterRun.dev,
      ino: afterRun.ino,
      mode: afterRun.mode,
      nlink: afterRun.nlink,
      size: afterRun.size,
      mtimeNs: afterRun.mtimeNs,
      ctimeNs: afterRun.ctimeNs,
      sha256: sha256(bytes),
      version,
    });
  } catch {
    return null;
  } finally {
    if (descriptor !== null) try { closeSync(descriptor); } catch { /* executable inspection already failed closed */ }
  }
}

function sameExecutable(left: GitExecutableIdentity, right: GitExecutableIdentity): boolean {
  return samePath(left.path, right.path) && left.dev === right.dev && left.ino === right.ino
    && left.mode === right.mode && left.nlink === right.nlink
    && left.size === right.size && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs
    && left.sha256 === right.sha256 && left.version === right.version;
}

function locateGitExecutable(): GitExecutableIdentity | null {
  const locator = process.platform === "win32"
    ? runProcess("where.exe", ["git.exe"], process.cwd())
    : runProcess("which", ["git"], process.cwd());
  const output = locator?.status === 0 && locator.stderr.length === 0 ? decodeUtf8(locator.stdout) : null;
  if (output === null) return null;
  for (const row of output.split(/\r?\n/u).filter(Boolean)) {
    if (!isAbsolute(row)) continue;
    const identity = executableIdentity(row);
    if (identity !== null) return identity;
  }
  return null;
}

function readBoundedControlFile(path: string): ControlFileSnapshot | null {
  let descriptor: number | null = null;
  try {
    const named = lstatSync(path, { bigint: true });
    if (!named.isFile() || named.isSymbolicLink() || named.nlink !== 1n || named.size < 0n
      || named.size > BigInt(MAX_GIT_CONTROL_BYTES)) return null;
    descriptor = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const opened = exactFileIdentity(fstatSync(descriptor, { bigint: true }));
    const namedIdentity = exactFileIdentity(named);
    if (opened === null || namedIdentity === null || !sameFileIdentity(namedIdentity, opened)) return null;
    const bytes = Buffer.alloc(Number(opened.size));
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(descriptor, bytes, offset, bytes.length - offset, null);
      if (count === 0) break;
      offset += count;
    }
    const after = exactFileIdentity(fstatSync(descriptor, { bigint: true }));
    const rebound = exactFileIdentity(lstatSync(path, { bigint: true }));
    if (offset !== bytes.length || after === null || rebound === null
      || !sameFileIdentity(opened, after) || !sameFileIdentity(opened, rebound)) return null;
    return Object.freeze({ sha256: sha256(bytes), bytes, identity: opened });
  } catch {
    return null;
  } finally {
    if (descriptor !== null) try { closeSync(descriptor); } catch { /* read already failed closed or detached */ }
  }
}

function gitDirectory(root: string, executable: string): Readonly<{ path: string; dev: bigint; ino: bigint }> | null {
  try {
    const lexical = join(root, ".git");
    const before = lstatSync(lexical, { bigint: true });
    if (!before.isDirectory() || before.isSymbolicLink() || before.dev <= 0n || before.ino <= 0n) return null;
    const path = realpathSync.native(lexical);
    if (!samePath(path, lexical)) return null;
    const top = git(executable, root, ["rev-parse", "--show-toplevel"]);
    const directory = git(executable, root, ["rev-parse", "--absolute-git-dir"]);
    const common = git(executable, root, ["rev-parse", "--git-common-dir"]);
    const worktree = git(executable, root, ["rev-parse", "--is-inside-work-tree"]);
    const bare = git(executable, root, ["rev-parse", "--is-bare-repository"]);
    const topPath = top ? oneLine(top.stdout) : null;
    const directoryPath = directory ? oneLine(directory.stdout) : null;
    const commonPath = common ? oneLine(common.stdout) : null;
    if (topPath === null || directoryPath === null || commonPath === null
      || worktree === null || oneLine(worktree.stdout) !== "true"
      || bare === null || oneLine(bare.stdout) !== "false") return null;
    const topReal = realpathSync.native(topPath);
    const directoryReal = realpathSync.native(directoryPath);
    const commonReal = realpathSync.native(isAbsolute(commonPath) ? commonPath : resolve(root, commonPath));
    const after = lstatSync(path, { bigint: true });
    return samePath(topReal, root) && samePath(directoryReal, path) && samePath(commonReal, path)
      && sameIdentity(before, after)
      ? Object.freeze({ path, dev: after.dev, ino: after.ino })
      : null;
  } catch {
    return null;
  }
}

function parseIndexRows(value: Buffer): readonly Readonly<{ path: string; mode: string; oid: string; stage: string }>[] | null {
  const text = decodeUtf8(value);
  if (text === null || (text.length > 0 && !text.endsWith("\0"))) return null;
  const rows = text.length === 0 ? [] : text.slice(0, -1).split("\0");
  const parsed = [];
  for (const row of rows) {
    const tab = row.indexOf("\t");
    if (tab < 0) return null;
    const [mode, oid, stage, extra] = row.slice(0, tab).split(" ");
    const path = row.slice(tab + 1);
    if (extra !== undefined || !/^[0-7]{6}$/u.test(mode ?? "") || !GIT_OID.test(oid ?? "")
      || !/^[0-3]$/u.test(stage ?? "") || !path) return null;
    parsed.push(Object.freeze({ path, mode: mode!, oid: oid!, stage: stage! }));
  }
  return Object.freeze(parsed);
}

function inspectAttributes(executable: string, root: string, paths: readonly string[]): string | null {
  const args = ["check-attr", "-z", "filter", "diff", "working-tree-encoding", "--", ...paths];
  const result = git(executable, root, args);
  const text = result ? decodeUtf8(result.stdout) : null;
  if (text === null || !text.endsWith("\0")) return null;
  const fields = text.slice(0, -1).split("\0");
  if (fields.length !== paths.length * 9) return null;
  for (let pathIndex = 0; pathIndex < paths.length; pathIndex += 1) {
    for (let attrIndex = 0; attrIndex < 3; attrIndex += 1) {
      const offset = pathIndex * 9 + attrIndex * 3;
      if (fields[offset] !== paths[pathIndex]
        || fields[offset + 1] !== ["filter", "diff", "working-tree-encoding"][attrIndex]
        || (fields[offset + 2] !== "unspecified" && fields[offset + 2] !== "unset")) return null;
    }
  }
  return sha256(result!.stdout);
}

function captureGitState(
  root: string,
  project: BuilderReviewProjectBinding,
  paths: readonly string[],
  expectedExecutable: GitExecutableIdentity | null,
): GitState | null {
  try {
    if (!builderReviewProjectStillExact(root, project)) return null;
    const executable = expectedExecutable === null ? locateGitExecutable() : executableIdentity(expectedExecutable.path);
    if (executable === null || (expectedExecutable !== null && !sameExecutable(executable, expectedExecutable))) return null;
    const lexicalGitDirectory = join(project.snapshot.canonicalRoot, ".git");
    const lexicalGitStat = lstatSync(lexicalGitDirectory, { bigint: true });
    const lexicalGitReal = realpathSync.native(lexicalGitDirectory);
    if (!lexicalGitStat.isDirectory() || lexicalGitStat.isSymbolicLink()
      || lexicalGitStat.dev !== project.snapshot.deviceId || lexicalGitStat.ino <= 0n
      || !samePath(lexicalGitDirectory, lexicalGitReal)
      || existsSync(join(lexicalGitDirectory, "commondir"))
      || existsSync(join(lexicalGitDirectory, "config.worktree"))
      || existsSync(join(lexicalGitDirectory, "objects", "info", "alternates"))) return null;
    const configBefore = readBoundedControlFile(join(lexicalGitDirectory, "config"));
    if (configBefore === null) return null;
    const configText = decodeUtf8(configBefore.bytes);
    if (configText === null || /^\s*\[\s*include(?:if)?\b/imu.test(configText)
      || /^\s*(?:include\.path|extensions\.worktreeconfig|core\.(?:worktree|attributesfile|excludesfile|hookspath|fsmonitor|untrackedcache)|worktree|worktreeconfig|attributesfile|excludesfile|hookspath|fsmonitor|untrackedcache)\s*=/imu.test(configText)) return null;
    const gitDir = gitDirectory(project.snapshot.canonicalRoot, executable.path);
    if (gitDir === null || gitDir.dev !== project.snapshot.deviceId
      || gitDir.dev !== lexicalGitStat.dev || gitDir.ino !== lexicalGitStat.ino
      || !builderReviewProjectStillExact(root, project)) return null;
    const index = readBoundedControlFile(join(gitDir.path, "index"));
    const headFile = readBoundedControlFile(join(gitDir.path, "HEAD"));
    if (index === null || headFile === null) return null;

    const objectFormatResult = git(executable.path, root, ["rev-parse", "--show-object-format"]);
    const baseHeadResult = git(executable.path, root, ["rev-parse", "--verify", "HEAD^{commit}"]);
    const headRefResult = git(executable.path, root, ["symbolic-ref", "--quiet", "HEAD"]);
    const staged = git(executable.path, root, ["ls-files", "--stage", "-z"]);
    const status = git(executable.path, root, ["status", "--porcelain=v2", "-z", "--untracked-files=all", "--ignored=no"]);
    if (!objectFormatResult || !baseHeadResult || !headRefResult || !staged || !status) return null;
    const objectFormat = oneLine(objectFormatResult.stdout);
    const baseHead = oneLine(baseHeadResult.stdout);
    const headRef = oneLine(headRefResult.stdout);
    if ((objectFormat !== "sha1" && objectFormat !== "sha256") || baseHead === null || !GIT_OID.test(baseHead)
      || baseHead.length !== (objectFormat === "sha1" ? 40 : 64) || headRef === null || !GIT_REF.test(headRef)) return null;
    const entries = parseIndexRows(staged.stdout);
    if (entries === null) return null;
    const byFoldedPath = new Map<string, typeof entries>();
    for (const entry of entries) {
      const folded = entry.path.toUpperCase();
      const previous = byFoldedPath.get(folded) ?? [];
      byFoldedPath.set(folded, Object.freeze([...previous, entry]));
    }
    const selectedRows = [];
    for (const path of paths) {
      const matches = byFoldedPath.get(path.toUpperCase()) ?? [];
      if (matches.length !== 1 || matches[0]!.path !== path || matches[0]!.stage !== "0"
        || (matches[0]!.mode !== "100644" && matches[0]!.mode !== "100755")) return null;
      selectedRows.push(`${matches[0]!.mode} ${matches[0]!.oid} ${matches[0]!.stage}\t${matches[0]!.path}`);
    }
    const ignored = git(executable.path, root, ["check-ignore", "--no-index", "-z", "--stdin"], [0, 1], Buffer.from(`${paths.join("\0")}\0`, "utf8"));
    if (ignored === null || ignored.status !== 1 || ignored.stdout.length !== 0) return null;
    const attributesSha256 = inspectAttributes(executable.path, root, paths);
    if (attributesSha256 === null) return null;
    const excludePath = join(gitDir.path, "info", "exclude");
    const exclude = existsSync(excludePath) ? readBoundedControlFile(excludePath) : null;
    if (existsSync(excludePath) && exclude === null) return null;
    const configAfter = readBoundedControlFile(join(gitDir.path, "config"));
    if (configAfter === null || controlFileCanonical(configAfter) !== controlFileCanonical(configBefore)
      || existsSync(join(gitDir.path, "config.worktree"))
      || existsSync(join(gitDir.path, "objects", "info", "alternates"))) return null;
    if (!builderReviewProjectStillExact(root, project)) return null;
    return Object.freeze({
      executable,
      gitDirectory: gitDir.path,
      gitDirectoryDev: gitDir.dev,
      gitDirectoryIno: gitDir.ino,
      headRef,
      baseHead,
      objectFormat,
      indexSha256: index.sha256,
      configSha256: configAfter.sha256,
      headFileSha256: headFile.sha256,
      excludeSha256: exclude?.sha256 ?? null,
      controlIdentitySha256: sha256(canonical([
        controlFileCanonical(configAfter), controlFileCanonical(index), controlFileCanonical(headFile),
        exclude === null ? "absent" : controlFileCanonical(exclude),
      ])),
      stagedInventorySha256: sha256(staged.stdout),
      statusSha256: sha256(status.stdout),
      selectedIndexRowsSha256: sha256(selectedRows.join("\0")),
      selectedAttributeRowsSha256: attributesSha256,
    });
  } catch {
    return null;
  }
}

function physicalFile(root: string, projectPath: string, project: BuilderReviewProjectBinding): string | null {
  try {
    if (!builderSelectedTrackedTextPathAllowed(projectPath) || !builderReviewProjectStillExact(root, project)) return null;
    let cursor = project.snapshot.canonicalRoot;
    const parts = projectPath.split("/");
    for (const [index, segment] of parts.entries()) {
      const names = readdirSync(cursor);
      const aliases = names.filter((name) => name.toUpperCase() === segment.toUpperCase());
      if (aliases.length !== 1 || aliases[0] !== segment) return null;
      cursor = join(cursor, segment);
      const stat = lstatSync(cursor, { bigint: true });
      if (stat.isSymbolicLink() || stat.dev !== project.snapshot.deviceId) return null;
      if (index < parts.length - 1 && !stat.isDirectory()) return null;
    }
    const final = lstatSync(cursor, { bigint: true });
    const real = realpathSync.native(cursor);
    const relativeReal = normalizedPath(relative(project.snapshot.canonicalRoot, real));
    return final.isFile() && !final.isSymbolicLink() && final.nlink === 1n && inside(project.snapshot.canonicalRoot, real)
      && relativeReal === projectPath ? real : null;
  } catch {
    return null;
  }
}

function readSelectedFile(root: string, path: string, project: BuilderReviewProjectBinding): SelectedFileState | null {
  const absolute = physicalFile(root, path, project);
  if (absolute === null) return null;
  let descriptor: number | null = null;
  try {
    descriptor = openSync(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const opened = exactFileIdentity(fstatSync(descriptor, { bigint: true }));
    const named = exactFileIdentity(lstatSync(absolute, { bigint: true }));
    const maxBytes = BigInt(BUILDER_INTERCOM_LIMITS.textCharactersPerRow * 4);
    if (opened === null || named === null || !sameFileIdentity(opened, named) || opened.size > maxBytes) return null;
    const bytes = Buffer.alloc(Number(opened.size));
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(descriptor, bytes, offset, bytes.length - offset, null);
      if (count === 0) break;
      offset += count;
    }
    const after = exactFileIdentity(fstatSync(descriptor, { bigint: true }));
    const reboundPath = physicalFile(root, path, project);
    const rebound = reboundPath === null ? null
      : exactFileIdentity(lstatSync(reboundPath, { bigint: true }));
    if (offset !== bytes.length || after === null || rebound === null
      || !sameFileIdentity(opened, after) || !sameFileIdentity(opened, rebound)) return null;
    const content = decodeUtf8(bytes);
    if (content === null || content.length > BUILDER_INTERCOM_LIMITS.textCharactersPerRow
      || !wellFormedUtf16(content) || FORBIDDEN_TEXT.test(content) || containsCredentialMaterial(content)) return null;
    return Object.freeze({ projectRelativePath: path, content, sha256: sha256(bytes), identity: opened });
  } catch {
    return null;
  } finally {
    if (descriptor !== null) try { closeSync(descriptor); } catch { /* selection already failed closed or detached */ }
  }
}

function sameGitState(left: GitState, right: GitState): boolean {
  return sameExecutable(left.executable, right.executable)
    && samePath(left.gitDirectory, right.gitDirectory)
    && left.gitDirectoryDev === right.gitDirectoryDev && left.gitDirectoryIno === right.gitDirectoryIno
    && left.headRef === right.headRef && left.baseHead === right.baseHead && left.objectFormat === right.objectFormat
    && left.indexSha256 === right.indexSha256 && left.configSha256 === right.configSha256
    && left.headFileSha256 === right.headFileSha256 && left.excludeSha256 === right.excludeSha256
    && left.controlIdentitySha256 === right.controlIdentitySha256
    && left.stagedInventorySha256 === right.stagedInventorySha256
    && left.statusSha256 === right.statusSha256 && left.selectedIndexRowsSha256 === right.selectedIndexRowsSha256
    && left.selectedAttributeRowsSha256 === right.selectedAttributeRowsSha256;
}

function gitStateCanonical(state: GitState): string {
  return canonical([
    state.executable.path, state.executable.dev.toString(), state.executable.ino.toString(),
    state.executable.mode.toString(), state.executable.nlink.toString(), state.executable.size.toString(),
    state.executable.mtimeNs.toString(), state.executable.ctimeNs.toString(), state.executable.sha256, state.executable.version,
    state.gitDirectory, state.gitDirectoryDev.toString(), state.gitDirectoryIno.toString(), state.headRef,
    state.baseHead, state.objectFormat, state.indexSha256, state.configSha256, state.headFileSha256,
    state.excludeSha256 ?? "absent", state.controlIdentitySha256,
    state.stagedInventorySha256, state.statusSha256, state.selectedIndexRowsSha256, state.selectedAttributeRowsSha256,
  ]);
}

function fileStateCanonical(state: SelectedFileState): string {
  return canonical([
    state.projectRelativePath, state.sha256, state.identity.dev.toString(), state.identity.ino.toString(),
    state.identity.mode.toString(), state.identity.nlink.toString(), state.identity.size.toString(),
    state.identity.mtimeNs.toString(), state.identity.ctimeNs.toString(),
  ]);
}

function controlFileCanonical(state: ControlFileSnapshot): string {
  return canonical([
    state.sha256, state.identity.dev.toString(), state.identity.ino.toString(), state.identity.mode.toString(),
    state.identity.nlink.toString(), state.identity.size.toString(), state.identity.mtimeNs.toString(),
    state.identity.ctimeNs.toString(),
  ]);
}

function inspectCurrentSelection(
  root: string,
  project: BuilderReviewProjectBinding,
  paths: readonly string[],
  expectedExecutable: GitExecutableIdentity | null,
): Readonly<{ files: readonly SelectedFileState[]; git: GitState; stateSha256: string }> | null {
  for (const path of paths) if (physicalFile(root, path, project) === null) return null;
  const beforeGit = captureGitState(root, project, paths, expectedExecutable);
  if (beforeGit === null) return null;
  const files: SelectedFileState[] = [];
  let totalCharacters = 0;
  for (const path of paths) {
    const file = readSelectedFile(root, path, project);
    if (file === null) return null;
    totalCharacters += file.content.length;
    if (totalCharacters > BUILDER_INTERCOM_LIMITS.totalTextCharacters) return null;
    files.push(file);
  }
  const afterGit = captureGitState(root, project, paths, beforeGit.executable);
  if (afterGit === null || !sameGitState(beforeGit, afterGit) || !builderReviewProjectStillExact(root, project)) return null;
  const stateSha256 = sha256(canonical([
    BUILDER_TRACKED_TEXT_SELECTION_VERSION,
    project.projectHash,
    project.snapshot.canonicalRootDigest,
    project.snapshot.filesystemIdentityDigest,
    gitStateCanonical(afterGit),
    canonical(files.map(fileStateCanonical)),
  ]));
  return Object.freeze({ files: Object.freeze(files), git: afterGit, stateSha256 });
}

function selectedPaths(value: unknown): readonly string[] | null {
  const values = inspectArray(value, BUILDER_INTERCOM_LIMITS.selectedTrackedText);
  if (values === null || values.length === 0) return null;
  const output: string[] = [];
  const seen = new Set<string>();
  let previous: string | null = null;
  for (const value of values) {
    if (!builderSelectedTrackedTextPathAllowed(value)) return null;
    const folded = value.toUpperCase();
    if (seen.has(folded) || (previous !== null && folded <= previous)) return null;
    seen.add(folded);
    previous = folded;
    output.push(value);
  }
  return Object.freeze(output);
}

export function captureBuilderTrackedTextSelection(root: string, raw: unknown): BuilderTrackedTextSelectionV1 | null {
  try {
    if (typeof root !== "string" || root.length === 0 || root.includes("\0")) return null;
    const input = inspectRecord(raw, [
      "taskNumber", "runId", "turnId", "connectionConsentVersion", "taskSpec", "evidencePlan",
      "selectedProjectRelativePaths",
    ]);
    if (input === null) return null;
    const paths = selectedPaths(input.selectedProjectRelativePaths);
    if (paths === null) return null;
    const project = captureBuilderReviewProject(root);
    if (project === null) return null;
    const inspected = inspectCurrentSelection(project.snapshot.canonicalRoot, project, paths, null);
    if (inspected === null) return null;
    const context = composeBuilderTurnContext({
      version: BUILDER_TURN_CONTEXT_VERSION,
      taskNumber: input.taskNumber,
      runId: input.runId,
      turnId: input.turnId,
      projectHash: project.projectHash,
      connectionConsentVersion: input.connectionConsentVersion,
      taskSpec: input.taskSpec,
      evidencePlan: input.evidencePlan,
      baseHead: inspected.git.baseHead,
      gitStateSha256: inspected.stateSha256,
      selectedTrackedText: inspected.files.map((file, index) => ({
        id: `tracked-text-${index + 1}`,
        projectRelativePath: file.projectRelativePath,
        sha256: file.sha256,
        content: file.content,
        truncated: false,
        provenance: {
          selectorVersion: BUILDER_SELECTOR_PROVENANCE_VERSION,
          projectHash: project.projectHash,
          connectionConsentVersion: input.connectionConsentVersion,
          gitTracked: true,
          ordinaryText: true,
          regularFile: true,
          symbolicLink: false,
          reparsePoint: false,
          hardLinkCount: 1,
          submodule: false,
          gitIgnored: false,
          dependency: false,
          packageOrDependencyControl: false,
          installScript: false,
          generated: false,
          deploymentOrProductionControl: false,
          credentialLikePath: false,
          credentialLikeContent: false,
          insideProject: true,
          reservedArea: false,
          consented: true,
        },
      })),
    });
    if (context === null || builderTurnContextSha256(context) === null) return null;
    const rechecked = inspectCurrentSelection(project.snapshot.canonicalRoot, project, paths, inspected.git.executable);
    if (rechecked === null || rechecked.stateSha256 !== inspected.stateSha256
      || rechecked.files.some((file, index) => file.sha256 !== inspected.files[index]?.sha256
        || file.content !== inspected.files[index]?.content)) return null;
    const selection = Object.freeze({ version: BUILDER_TRACKED_TEXT_SELECTION_VERSION, context });
    selections.set(selection, Object.freeze({ project, paths, files: inspected.files, git: inspected.git, stateSha256: inspected.stateSha256, context }));
    return selection;
  } catch {
    return null;
  }
}

export function builderTrackedTextSelectionMatchesContext(selectionValue: unknown, contextValue: unknown): boolean {
  return selectionValue !== null && typeof selectionValue === "object"
    && contextValue !== null && typeof contextValue === "object"
    && selections.get(selectionValue)?.context === contextValue;
}

export function builderTrackedTextSelectionStillExact(root: string, selectionValue: unknown): boolean {
  try {
    if (selectionValue === null || typeof selectionValue !== "object") return false;
    const snapshot = selections.get(selectionValue);
    if (!snapshot || snapshot.context !== (selectionValue as BuilderTrackedTextSelectionV1).context
      || !builderReviewProjectStillExact(root, snapshot.project)) return false;
    const current = inspectCurrentSelection(snapshot.project.snapshot.canonicalRoot, snapshot.project, snapshot.paths, snapshot.git.executable);
    return current !== null && current.stateSha256 === snapshot.stateSha256
      && current.files.length === snapshot.files.length
      && current.files.every((file, index) => file.sha256 === snapshot.files[index]?.sha256
        && file.content === snapshot.files[index]?.content
        && sameFileIdentity(file.identity, snapshot.files[index]!.identity));
  } catch {
    return false;
  }
}
