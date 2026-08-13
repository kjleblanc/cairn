import { createHash } from "node:crypto";
import { types } from "node:util";

export const GIT_DURABILITY_MATRIX_VERSION = "cairn-git-durability-matrix/v1" as const;
export const GIT_DURABILITY_PLAN_VERSION = "cairn-git-durability-plan/v1" as const;
export const GIT_DURABILITY_POLICY_REVISION = "task228-qualification-policy/v1" as const;
export const GIT_DURABILITY_OPERATION_ID = "22800000-0000-4000-8000-000000000001" as const;
export const GIT_DURABILITY_CANDIDATE_REF =
  `refs/cairn/candidates/${GIT_DURABILITY_OPERATION_ID}` as const;

const PATH_NAME = "candidate.txt";
const MODE = "100644";
const ZERO_OID = "0".repeat(40);
const SEED_TEXT = "Cairn Task 228 seed\n";
const CANDIDATE_TEXT = "Cairn Task 228 synthetic candidate\n";
const IDENT_NAME = "Cairn Qualification";
const IDENT_EMAIL = "cairn-qualification@example.invalid";
const SEED_SECONDS = "1786651200";
const CANDIDATE_SECONDS = "1786651201";
const TIMEZONE = "+0000";
const SEED_MESSAGE = "Cairn Task 228 seed\n";
const CANDIDATE_MESSAGE = "Cairn Task 228 synthetic candidate\n";
const DIRECTORY_FLUSH_PROTOCOL = "qualified-directory-flush/v1";
const POWER_CUT_CONTROLLER_REVISION = "task228-power-controller/v1";
const SHA256 = /^[0-9a-f]{64}$/;
const GIT_VERSION = /^git version 2\.52\.0\.windows\.1$/;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const PRINTABLE_ASCII = /^[\x20-\x7e]+$/;
const WINDOWS_ABSOLUTE = /^[A-Z]:\\/;
const WINDOWS_DEVICE_SEGMENT = /^(?:CON|PRN|AUX|NUL|CLOCK\$|CONIN\$|CONOUT\$|COM[1-9]|LPT[1-9])(?:\.|$)/i;
const COMMAND_TIMEOUT_MS = 10_000;
const COMMAND_EXECUTION_POLICY = "direct-exec-file-no-shell-replaced-env" as const;
const COMMAND_CHILD_POLICY = "single-foreground-child-no-detach-piped-stdio" as const;
const MATRIX_KEYS = [
  "version",
  "gitExecutablePath",
  "gitExecutableSha256",
  "gitVersion",
  "nodeExecutablePath",
  "nodeExecutableSha256",
  "nodeVersion",
  "windowsRoot",
  "osBuild",
  "hypervisor",
  "snapshotId",
  "virtualDiskId",
  "fixtureRoot",
  "filesystem",
  "refBackend",
  "objectFormat",
  "coreFsync",
  "coreFsyncMethod",
  "coreCreateObject",
  "directoryFlushProtocol",
  "powerCutControllerRevision",
  "dedicatedVirtualDisk",
  "hostFolderSharing",
] as const;

export interface GitDurabilityQualificationMatrixV1 {
  version: typeof GIT_DURABILITY_MATRIX_VERSION;
  gitExecutablePath: string;
  gitExecutableSha256: string;
  gitVersion: string;
  nodeExecutablePath: string;
  nodeExecutableSha256: string;
  nodeVersion: string;
  windowsRoot: string;
  osBuild: string;
  hypervisor: string;
  snapshotId: string;
  virtualDiskId: string;
  fixtureRoot: string;
  filesystem: "NTFS";
  refBackend: "files";
  objectFormat: "sha1";
  coreFsync: "all";
  coreFsyncMethod: "fsync";
  coreCreateObject: "link";
  directoryFlushProtocol: string;
  powerCutControllerRevision: string;
  dedicatedVirtualDisk: true;
  hostFolderSharing: false;
}

export interface PlannedGitObjectV1 {
  kind: "blob" | "tree" | "commit";
  role: "seed" | "candidate";
  oid: string;
  contentSha256: string;
  contentByteLength: number;
  baseline: "pre-existing-no-op" | "absent-may-create";
}

export interface PlannedWritePatternV1 {
  kind: "git-loose-object-temp";
  parent: string;
  basenamePattern: "tmp_obj_[A-Za-z0-9]{6}";
  maxMatches: 1;
}

export interface PlannedGitCommandV1 {
  stage:
    | "cross-check-candidate-blob-oid"
    | "cross-check-candidate-tree-oid"
    | "cross-check-candidate-commit-oid"
    | "write-candidate-blob"
    | "verify-candidate-blob"
    | "read-base-tree-private-index"
    | "update-private-index"
    | "write-candidate-tree"
    | "verify-candidate-tree"
    | "write-candidate-commit"
    | "verify-candidate-commit"
    | "create-private-ref-cas"
    | "verify-private-ref";
  executable: string;
  cwd: string;
  executionPolicy: typeof COMMAND_EXECUTION_POLICY;
  childPolicy: typeof COMMAND_CHILD_POLICY;
  timeoutMs: typeof COMMAND_TIMEOUT_MS;
  argv: readonly string[];
  environment: readonly Readonly<{ name: string; value: string }>[];
  stdinHex: string | null;
  expectedExitCode: 0;
  expectedStdoutHex: string;
  expectedStderrHex: string;
  admittedWrites: readonly string[];
  admittedWritePatterns: readonly Readonly<PlannedWritePatternV1>[];
}

export interface GitDurabilityQualificationPlanV1 {
  version: typeof GIT_DURABILITY_PLAN_VERSION;
  policyRevision: typeof GIT_DURABILITY_POLICY_REVISION;
  operationId: typeof GIT_DURABILITY_OPERATION_ID;
  candidateRef: typeof GIT_DURABILITY_CANDIDATE_REF;
  matrix: Readonly<GitDurabilityQualificationMatrixV1>;
  repositoryRoot: string;
  gitDirectory: string;
  custodyRoot: string;
  privateIndexPath: string;
  journalRoot: string;
  synthetic: Readonly<{
    path: typeof PATH_NAME;
    mode: typeof MODE;
    seedText: typeof SEED_TEXT;
    candidateText: typeof CANDIDATE_TEXT;
    authorName: typeof IDENT_NAME;
    authorEmail: typeof IDENT_EMAIL;
    seedSeconds: typeof SEED_SECONDS;
    candidateSeconds: typeof CANDIDATE_SECONDS;
    timezone: typeof TIMEZONE;
    seedMessage: typeof SEED_MESSAGE;
    candidateMessage: typeof CANDIDATE_MESSAGE;
  }>;
  objects: readonly PlannedGitObjectV1[];
  commands: readonly PlannedGitCommandV1[];
  canonical: string;
  planSha256: string;
}

interface ObjectSet {
  seedBlob: PlannedGitObjectV1;
  seedTree: PlannedGitObjectV1;
  seedCommit: PlannedGitObjectV1;
  candidateBlob: PlannedGitObjectV1;
  candidateTree: PlannedGitObjectV1;
  candidateCommit: PlannedGitObjectV1;
  seedCommitBytes: Buffer;
  candidateBlobBytes: Buffer;
  candidateTreeBytes: Buffer;
  candidateCommitBytes: Buffer;
}

function wellFormedUtf16(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function exactRecord(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || types.isProxy(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== "string")) return null;
    if (ownKeys.some((key) => !keys.includes(key as string))) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (!descriptor || !("value" in descriptor) || descriptor.get || descriptor.set
        || !descriptor.enumerable) return null;
    }
    return Object.fromEntries(keys.map((key) => [key, descriptors[key]!.value]));
  } catch {
    return null;
  }
}

function exactString(value: unknown, max: number): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= max
    && wellFormedUtf16(value) && PRINTABLE_ASCII.test(value)
    ? value
    : null;
}

function exactWindowsPath(value: unknown, max = 1024): string | null {
  const parsed = exactString(value, max);
  if (!parsed || !WINDOWS_ABSOLUTE.test(parsed) || parsed.includes("/") || parsed.includes("\0")
    || /[<>"|?*]/.test(parsed) || parsed.slice(2).includes(":")) return null;
  const segments = parsed.slice(3).split("\\");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === ".."
    || segment.endsWith(".") || segment.endsWith(" ") || WINDOWS_DEVICE_SEGMENT.test(segment))) return null;
  return parsed;
}

function parseMatrix(value: unknown): GitDurabilityQualificationMatrixV1 | null {
  const record = exactRecord(value, MATRIX_KEYS);
  if (!record || record.version !== GIT_DURABILITY_MATRIX_VERSION
    || record.filesystem !== "NTFS" || record.refBackend !== "files"
    || record.objectFormat !== "sha1" || record.coreFsync !== "all"
    || record.coreFsyncMethod !== "fsync" || record.coreCreateObject !== "link"
    || record.dedicatedVirtualDisk !== true
    || record.hostFolderSharing !== false) return null;

  const gitExecutablePath = exactWindowsPath(record.gitExecutablePath);
  const nodeExecutablePath = exactWindowsPath(record.nodeExecutablePath);
  const windowsRoot = exactWindowsPath(record.windowsRoot, 256);
  const fixtureRoot = exactWindowsPath(record.fixtureRoot);
  const gitExecutableSha256 = exactString(record.gitExecutableSha256, 64);
  const nodeExecutableSha256 = exactString(record.nodeExecutableSha256, 64);
  const gitVersion = exactString(record.gitVersion, 64);
  const nodeVersion = exactString(record.nodeVersion, 32);
  const osBuild = exactString(record.osBuild, 128);
  const hypervisor = exactString(record.hypervisor, 128);
  const snapshotId = exactString(record.snapshotId, 256);
  const virtualDiskId = exactString(record.virtualDiskId, 256);
  const directoryFlushProtocol = exactString(record.directoryFlushProtocol, 256);
  const powerCutControllerRevision = exactString(record.powerCutControllerRevision, 128);
  if (!gitExecutablePath || !gitExecutablePath.toUpperCase().endsWith("\\GIT.EXE")
    || !nodeExecutablePath || !nodeExecutablePath.toUpperCase().endsWith("\\NODE.EXE")
    || !windowsRoot || !fixtureRoot || !gitExecutableSha256 || !SHA256.test(gitExecutableSha256)
    || !nodeExecutableSha256 || !SHA256.test(nodeExecutableSha256)
    || !gitVersion || !GIT_VERSION.test(gitVersion) || nodeVersion !== "v24.12.0"
    || !osBuild || !hypervisor || !snapshotId || !virtualDiskId
    || directoryFlushProtocol !== DIRECTORY_FLUSH_PROTOCOL
    || powerCutControllerRevision !== POWER_CUT_CONTROLLER_REVISION) return null;

  const expectedLeaf = `cairn-task228-${GIT_DURABILITY_OPERATION_ID}`;
  if (fixtureRoot !== `${fixtureRoot.slice(0, 2)}\\${expectedLeaf}`) return null;
  const windowsDrive = windowsRoot.slice(0, 2).toUpperCase();
  if (fixtureRoot.slice(0, 2).toUpperCase() === windowsDrive
    || gitExecutablePath.slice(0, 2).toUpperCase() !== windowsDrive
    || nodeExecutablePath.slice(0, 2).toUpperCase() !== windowsDrive) return null;
  if (!UUID_V4.test(GIT_DURABILITY_OPERATION_ID)) return null;

  return Object.freeze({
    version: GIT_DURABILITY_MATRIX_VERSION,
    gitExecutablePath,
    gitExecutableSha256,
    gitVersion,
    nodeExecutablePath,
    nodeExecutableSha256,
    nodeVersion,
    windowsRoot,
    osBuild,
    hypervisor,
    snapshotId,
    virtualDiskId,
    fixtureRoot,
    filesystem: "NTFS",
    refBackend: "files",
    objectFormat: "sha1",
    coreFsync: "all",
    coreFsyncMethod: "fsync",
    coreCreateObject: "link",
    directoryFlushProtocol,
    powerCutControllerRevision,
    dedicatedVirtualDisk: true,
    hostFolderSharing: false,
  });
}

function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function gitObject(kind: "blob" | "tree" | "commit", content: Buffer): Readonly<{
  oid: string;
  contentSha256: string;
  contentByteLength: number;
}> {
  const header = Buffer.from(`${kind} ${content.byteLength}\0`, "utf8");
  return Object.freeze({
    oid: createHash("sha1").update(header).update(content).digest("hex"),
    contentSha256: sha256(content),
    contentByteLength: content.byteLength,
  });
}

function treeBytes(blobOid: string): Buffer {
  return Buffer.concat([
    Buffer.from(`${MODE} ${PATH_NAME}\0`, "utf8"),
    Buffer.from(blobOid, "hex"),
  ]);
}

function commitBytes(treeOid: string, parentOid: string | null, seconds: string, message: string): Buffer {
  const parent = parentOid === null ? "" : `parent ${parentOid}\n`;
  return Buffer.from(
    `tree ${treeOid}\n${parent}author ${IDENT_NAME} <${IDENT_EMAIL}> ${seconds} ${TIMEZONE}\n`
      + `committer ${IDENT_NAME} <${IDENT_EMAIL}> ${seconds} ${TIMEZONE}\n\n${message}`,
    "utf8",
  );
}

function plannedObject(
  kind: PlannedGitObjectV1["kind"],
  role: PlannedGitObjectV1["role"],
  content: Buffer,
  baseline: PlannedGitObjectV1["baseline"],
): PlannedGitObjectV1 {
  const identity = gitObject(kind, content);
  return Object.freeze({ kind, role, ...identity, baseline });
}

function objectSet(): ObjectSet {
  const seedBlobBytes = Buffer.from(SEED_TEXT, "utf8");
  const seedBlob = plannedObject("blob", "seed", seedBlobBytes, "pre-existing-no-op");
  const seedTreeBytes = treeBytes(seedBlob.oid);
  const seedTree = plannedObject("tree", "seed", seedTreeBytes, "pre-existing-no-op");
  const seedCommitBytes = commitBytes(seedTree.oid, null, SEED_SECONDS, SEED_MESSAGE);
  const seedCommit = plannedObject("commit", "seed", seedCommitBytes, "pre-existing-no-op");

  const candidateBlobBytes = Buffer.from(CANDIDATE_TEXT, "utf8");
  const candidateBlob = plannedObject("blob", "candidate", candidateBlobBytes, "absent-may-create");
  const candidateTreeBytes = treeBytes(candidateBlob.oid);
  const candidateTree = plannedObject("tree", "candidate", candidateTreeBytes, "absent-may-create");
  const candidateCommitBytes = commitBytes(
    candidateTree.oid,
    seedCommit.oid,
    CANDIDATE_SECONDS,
    CANDIDATE_MESSAGE,
  );
  const candidateCommit = plannedObject("commit", "candidate", candidateCommitBytes, "absent-may-create");
  return {
    seedBlob,
    seedTree,
    seedCommit,
    candidateBlob,
    candidateTree,
    candidateCommit,
    seedCommitBytes,
    candidateBlobBytes,
    candidateTreeBytes,
    candidateCommitBytes,
  };
}

function environment(matrix: GitDurabilityQualificationMatrixV1, privateIndexPath: string): readonly Readonly<{
  name: string;
  value: string;
}>[] {
  const values = [
    ["COMSPEC", `${matrix.windowsRoot}\\System32\\cmd.exe`],
    ["GCM_INTERACTIVE", "Never"],
    ["GIT_CONFIG_GLOBAL", "NUL"],
    ["GIT_CONFIG_NOSYSTEM", "1"],
    ["GIT_CONFIG_SYSTEM", "NUL"],
    ["GIT_INDEX_FILE", privateIndexPath],
    ["GIT_OPTIONAL_LOCKS", "0"],
    ["GIT_TERMINAL_PROMPT", "0"],
    ["HOME", `${matrix.fixtureRoot}\\custody\\home`],
    ["LC_ALL", "C"],
    ["PATH", `${matrix.windowsRoot}\\System32`],
    ["SYSTEMROOT", matrix.windowsRoot],
    ["WINDIR", matrix.windowsRoot],
  ] as const;
  return Object.freeze(values.map(([name, value]) => Object.freeze({ name, value })));
}

function baseArgs(matrix: GitDurabilityQualificationMatrixV1, gitDirectory: string, repositoryRoot: string): string[] {
  return [
    "--no-pager",
    "-c", "core.fsync=all",
    "-c", "core.fsyncMethod=fsync",
    "-c", "core.createObject=link",
    "-c", "core.filesRefLockTimeout=0",
    "-c", "core.packedRefsTimeout=0",
    "-c", "core.logAllRefUpdates=false",
    "-c", "core.useReplaceRefs=false",
    "-c", "core.fsmonitor=false",
    "-c", "core.multiPackIndex=false",
    "-c", "gc.auto=0",
    "-c", "maintenance.auto=false",
    "-c", "credential.interactive=false",
    "-c", "i18n.commitEncoding=UTF-8",
    "-c", `core.hooksPath=${matrix.fixtureRoot}\\custody\\empty-hooks`,
    `--git-dir=${gitDirectory}`,
    `--work-tree=${repositoryRoot}`,
  ];
}

function command(
  stage: PlannedGitCommandV1["stage"],
  executable: string,
  cwd: string,
  argv: string[],
  environmentValue: PlannedGitCommandV1["environment"],
  stdinHex: string | null,
  expectedStdoutHex: string,
  admittedWrites: string[],
  admittedWritePatterns: PlannedWritePatternV1[] = [],
): PlannedGitCommandV1 {
  return Object.freeze({
    stage,
    executable,
    cwd,
    executionPolicy: COMMAND_EXECUTION_POLICY,
    childPolicy: COMMAND_CHILD_POLICY,
    timeoutMs: COMMAND_TIMEOUT_MS,
    argv: Object.freeze(argv),
    environment: environmentValue,
    stdinHex,
    expectedExitCode: 0,
    expectedStdoutHex,
    expectedStderrHex: "",
    admittedWrites: Object.freeze(admittedWrites),
    admittedWritePatterns: Object.freeze(admittedWritePatterns.map((value) => Object.freeze(value))),
  });
}

function commands(
  matrix: GitDurabilityQualificationMatrixV1,
  objects: ObjectSet,
  repositoryRoot: string,
  gitDirectory: string,
  privateIndexPath: string,
): readonly PlannedGitCommandV1[] {
  const env = environment(matrix, privateIndexPath);
  const base = baseArgs(matrix, gitDirectory, repositoryRoot);
  const objectPath = (oid: string): string => `${gitDirectory}\\objects\\${oid.slice(0, 2)}\\${oid.slice(2)}`;
  const objectTempPattern = (oid: string): PlannedWritePatternV1 => ({
    kind: "git-loose-object-temp",
    parent: `${gitDirectory}\\objects\\${oid.slice(0, 2)}`,
    basenamePattern: "tmp_obj_[A-Za-z0-9]{6}",
    maxMatches: 1,
  });
  const refPath = `${gitDirectory}\\${GIT_DURABILITY_CANDIDATE_REF.replaceAll("/", "\\")}`;
  const oidStdout = (oid: string): string => Buffer.from(`${oid}\n`, "utf8").toString("hex");
  return Object.freeze([
    command(
      "cross-check-candidate-blob-oid",
      matrix.gitExecutablePath,
      repositoryRoot,
      [...base, "hash-object", "-t", "blob", "--stdin", "--no-filters"],
      env,
      objects.candidateBlobBytes.toString("hex"),
      oidStdout(objects.candidateBlob.oid),
      [],
    ),
    command(
      "cross-check-candidate-tree-oid",
      matrix.gitExecutablePath,
      repositoryRoot,
      [...base, "hash-object", "-t", "tree", "--stdin", "--no-filters"],
      env,
      objects.candidateTreeBytes.toString("hex"),
      oidStdout(objects.candidateTree.oid),
      [],
    ),
    command(
      "cross-check-candidate-commit-oid",
      matrix.gitExecutablePath,
      repositoryRoot,
      [...base, "hash-object", "-t", "commit", "--stdin", "--no-filters"],
      env,
      objects.candidateCommitBytes.toString("hex"),
      oidStdout(objects.candidateCommit.oid),
      [],
    ),
    command(
      "write-candidate-blob",
      matrix.gitExecutablePath,
      repositoryRoot,
      [...base, "hash-object", "-w", "-t", "blob", "--stdin", "--no-filters"],
      env,
      objects.candidateBlobBytes.toString("hex"),
      oidStdout(objects.candidateBlob.oid),
      [objectPath(objects.candidateBlob.oid)],
      [objectTempPattern(objects.candidateBlob.oid)],
    ),
    command(
      "verify-candidate-blob",
      matrix.gitExecutablePath,
      repositoryRoot,
      [...base, "cat-file", "blob", objects.candidateBlob.oid],
      env,
      null,
      objects.candidateBlobBytes.toString("hex"),
      [],
    ),
    command(
      "read-base-tree-private-index",
      matrix.gitExecutablePath,
      repositoryRoot,
      [...base, "read-tree", "-i", objects.seedTree.oid],
      env,
      null,
      "",
      [privateIndexPath, `${privateIndexPath}.lock`],
    ),
    command(
      "update-private-index",
      matrix.gitExecutablePath,
      repositoryRoot,
      [...base, "update-index", "--cacheinfo", `${MODE},${objects.candidateBlob.oid},${PATH_NAME}`],
      env,
      null,
      "",
      [privateIndexPath, `${privateIndexPath}.lock`],
    ),
    command(
      "write-candidate-tree",
      matrix.gitExecutablePath,
      repositoryRoot,
      [...base, "write-tree"],
      env,
      null,
      oidStdout(objects.candidateTree.oid),
      [objectPath(objects.candidateTree.oid), privateIndexPath, `${privateIndexPath}.lock`],
      [objectTempPattern(objects.candidateTree.oid)],
    ),
    command(
      "verify-candidate-tree",
      matrix.gitExecutablePath,
      repositoryRoot,
      [...base, "cat-file", "tree", objects.candidateTree.oid],
      env,
      null,
      objects.candidateTreeBytes.toString("hex"),
      [],
    ),
    command(
      "write-candidate-commit",
      matrix.gitExecutablePath,
      repositoryRoot,
      [...base, "commit-tree", objects.candidateTree.oid, "-p", objects.seedCommit.oid],
      Object.freeze([
        ...env,
        Object.freeze({ name: "GIT_AUTHOR_DATE", value: `${CANDIDATE_SECONDS} ${TIMEZONE}` }),
        Object.freeze({ name: "GIT_AUTHOR_EMAIL", value: IDENT_EMAIL }),
        Object.freeze({ name: "GIT_AUTHOR_NAME", value: IDENT_NAME }),
        Object.freeze({ name: "GIT_COMMITTER_DATE", value: `${CANDIDATE_SECONDS} ${TIMEZONE}` }),
        Object.freeze({ name: "GIT_COMMITTER_EMAIL", value: IDENT_EMAIL }),
        Object.freeze({ name: "GIT_COMMITTER_NAME", value: IDENT_NAME }),
      ]),
      Buffer.from(CANDIDATE_MESSAGE, "utf8").toString("hex"),
      oidStdout(objects.candidateCommit.oid),
      [objectPath(objects.candidateCommit.oid)],
      [objectTempPattern(objects.candidateCommit.oid)],
    ),
    command(
      "verify-candidate-commit",
      matrix.gitExecutablePath,
      repositoryRoot,
      [...base, "cat-file", "commit", objects.candidateCommit.oid],
      env,
      null,
      objects.candidateCommitBytes.toString("hex"),
      [],
    ),
    command(
      "create-private-ref-cas",
      matrix.gitExecutablePath,
      repositoryRoot,
      [...base, "update-ref", "--no-deref", GIT_DURABILITY_CANDIDATE_REF, objects.candidateCommit.oid, ZERO_OID],
      env,
      null,
      "",
      [refPath, `${refPath}.lock`],
    ),
    command(
      "verify-private-ref",
      matrix.gitExecutablePath,
      repositoryRoot,
      [...base, "show-ref", "--verify", "--hash", GIT_DURABILITY_CANDIDATE_REF],
      env,
      null,
      oidStdout(objects.candidateCommit.oid),
      [],
    ),
  ]);
}

function frame(value: string): string {
  return `${value.length}:${value}`;
}

function canonicalMatrix(matrix: GitDurabilityQualificationMatrixV1): string {
  return MATRIX_KEYS.map((key) => frame(String(matrix[key]))).join("");
}

function canonicalObject(value: PlannedGitObjectV1): string {
  return [
    ["kind", value.kind],
    ["role", value.role],
    ["oid", value.oid],
    ["contentSha256", value.contentSha256],
    ["contentByteLength", String(value.contentByteLength)],
    ["baseline", value.baseline],
  ].map(([name, field]) => frame(name!) + frame(field!)).join("");
}

function canonicalCommand(value: PlannedGitCommandV1): string {
  const field = (name: string, entry: string): string => frame(name) + frame(entry);
  const list = (name: string, entries: readonly string[]): string =>
    field(`${name}.count`, String(entries.length))
      + entries.map((entry, index) => field(`${name}.${index}`, entry)).join("");
  const optional = (name: string, entry: string | null): string => entry === null
    ? field(`${name}.type`, "null")
    : field(`${name}.type`, "value") + field(`${name}.value`, entry);
  return field("stage", value.stage)
    + field("executable", value.executable)
    + field("cwd", value.cwd)
    + field("executionPolicy", value.executionPolicy)
    + field("childPolicy", value.childPolicy)
    + field("timeoutMs", String(value.timeoutMs))
    + list("argv", value.argv)
    + field("environment.count", String(value.environment.length))
    + value.environment.map((row, index) =>
      field(`environment.${index}.name`, row.name) + field(`environment.${index}.value`, row.value)).join("")
    + optional("stdinHex", value.stdinHex)
    + field("expectedExitCode", String(value.expectedExitCode))
    + field("expectedStdoutHex", value.expectedStdoutHex)
    + field("expectedStderrHex", value.expectedStderrHex)
    + list("admittedWrites", value.admittedWrites)
    + field("admittedWritePatterns.count", String(value.admittedWritePatterns.length))
    + value.admittedWritePatterns.map((row, index) =>
      field(`admittedWritePatterns.${index}.kind`, row.kind)
      + field(`admittedWritePatterns.${index}.parent`, row.parent)
      + field(`admittedWritePatterns.${index}.basenamePattern`, row.basenamePattern)
      + field(`admittedWritePatterns.${index}.maxMatches`, String(row.maxMatches))).join("");
}

export function canonicalGitDurabilityQualificationPlan(
  value: Omit<GitDurabilityQualificationPlanV1, "canonical" | "planSha256">,
): string {
  const field = (name: string, entry: string): string => frame(name) + frame(entry);
  return field("version", value.version)
    + field("policyRevision", value.policyRevision)
    + field("operationId", value.operationId)
    + field("candidateRef", value.candidateRef)
    + field("matrix", canonicalMatrix(value.matrix))
    + field("repositoryRoot", value.repositoryRoot)
    + field("gitDirectory", value.gitDirectory)
    + field("custodyRoot", value.custodyRoot)
    + field("privateIndexPath", value.privateIndexPath)
    + field("journalRoot", value.journalRoot)
    + field("synthetic.path", value.synthetic.path)
    + field("synthetic.mode", value.synthetic.mode)
    + field("synthetic.seedText", value.synthetic.seedText)
    + field("synthetic.candidateText", value.synthetic.candidateText)
    + field("synthetic.authorName", value.synthetic.authorName)
    + field("synthetic.authorEmail", value.synthetic.authorEmail)
    + field("synthetic.seedSeconds", value.synthetic.seedSeconds)
    + field("synthetic.candidateSeconds", value.synthetic.candidateSeconds)
    + field("synthetic.timezone", value.synthetic.timezone)
    + field("synthetic.seedMessage", value.synthetic.seedMessage)
    + field("synthetic.candidateMessage", value.synthetic.candidateMessage)
    + field("objects.count", String(value.objects.length))
    + value.objects.map((entry, index) => field(`objects.${index}`, canonicalObject(entry))).join("")
    + field("commands.count", String(value.commands.length))
    + value.commands.map((entry, index) => field(`commands.${index}`, canonicalCommand(entry))).join("");
}

export function composeGitDurabilityQualificationPlan(
  matrixValue: unknown,
): GitDurabilityQualificationPlanV1 | null {
  const matrix = parseMatrix(matrixValue);
  if (!matrix) return null;
  const repositoryRoot = `${matrix.fixtureRoot}\\repo`;
  const gitDirectory = `${repositoryRoot}\\.git`;
  const custodyRoot = `${matrix.fixtureRoot}\\custody`;
  const privateIndexPath = `${custodyRoot}\\private-index`;
  const journalRoot = `${custodyRoot}\\journal`;
  const objectValues = objectSet();
  const objects = Object.freeze([
    objectValues.seedBlob,
    objectValues.seedTree,
    objectValues.seedCommit,
    objectValues.candidateBlob,
    objectValues.candidateTree,
    objectValues.candidateCommit,
  ]);
  const commandValues = commands(matrix, objectValues, repositoryRoot, gitDirectory, privateIndexPath);
  const synthetic = Object.freeze({
    path: PATH_NAME,
    mode: MODE,
    seedText: SEED_TEXT,
    candidateText: CANDIDATE_TEXT,
    authorName: IDENT_NAME,
    authorEmail: IDENT_EMAIL,
    seedSeconds: SEED_SECONDS,
    candidateSeconds: CANDIDATE_SECONDS,
    timezone: TIMEZONE,
    seedMessage: SEED_MESSAGE,
    candidateMessage: CANDIDATE_MESSAGE,
  });
  const body = Object.freeze({
    version: GIT_DURABILITY_PLAN_VERSION,
    policyRevision: GIT_DURABILITY_POLICY_REVISION,
    operationId: GIT_DURABILITY_OPERATION_ID,
    candidateRef: GIT_DURABILITY_CANDIDATE_REF,
    matrix,
    repositoryRoot,
    gitDirectory,
    custodyRoot,
    privateIndexPath,
    journalRoot,
    synthetic,
    objects,
    commands: commandValues,
  });
  const canonical = canonicalGitDurabilityQualificationPlan(body);
  return Object.freeze({ ...body, canonical, planSha256: sha256(canonical) });
}
