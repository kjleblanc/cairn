import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import * as planModule from "./git-candidate-durability-plan.js";
import {
  GIT_DURABILITY_CANDIDATE_REF,
  GIT_DURABILITY_MATRIX_VERSION,
  GIT_DURABILITY_OPERATION_ID,
  canonicalGitDurabilityQualificationPlan,
  composeGitDurabilityQualificationPlan,
} from "./git-candidate-durability-plan.js";

function matrix(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: GIT_DURABILITY_MATRIX_VERSION,
    gitExecutablePath: "C:\\Program Files\\Git\\mingw64\\bin\\git.exe",
    gitExecutableSha256: "f".repeat(64),
    gitVersion: "git version 2.52.0.windows.1",
    nodeExecutablePath: "C:\\Program Files\\nodejs\\node.exe",
    nodeExecutableSha256: "e".repeat(64),
    nodeVersion: "v24.12.0",
    windowsRoot: "C:\\Windows",
    osBuild: "Windows 11 24H2 build 26100.1",
    hypervisor: "Approved Hypervisor 1.0",
    snapshotId: "task228-clean-snapshot",
    virtualDiskId: "task228-ntfs-disk",
    fixtureRoot: `R:\\cairn-task228-${GIT_DURABILITY_OPERATION_ID}`,
    filesystem: "NTFS",
    refBackend: "files",
    objectFormat: "sha1",
    coreFsync: "all",
    coreFsyncMethod: "fsync",
    coreCreateObject: "link",
    directoryFlushProtocol: "qualified-directory-flush/v1",
    powerCutControllerRevision: "task228-power-controller/v1",
    dedicatedVirtualDisk: true,
    hostFolderSharing: false,
    ...overrides,
  };
}

function requirePlan(overrides: Record<string, unknown> = {}) {
  const result = composeGitDurabilityQualificationPlan(matrix(overrides));
  assert.notEqual(result, null);
  return result!;
}

test("pure planner freezes the exact synthetic object closure and canonical plan", () => {
  const plan = requirePlan();
  assert.equal(plan.operationId, GIT_DURABILITY_OPERATION_ID);
  assert.equal(plan.candidateRef, GIT_DURABILITY_CANDIDATE_REF);
  assert.equal(plan.synthetic.path, "candidate.txt");
  assert.equal(plan.synthetic.mode, "100644");
  assert.equal(plan.synthetic.seedText, "Cairn Task 228 seed\n");
  assert.equal(plan.synthetic.candidateText, "Cairn Task 228 synthetic candidate\n");
  assert.deepEqual(
    plan.objects.map(({ role, kind, oid, contentByteLength }) => ({ role, kind, oid, contentByteLength })),
    [
      { role: "seed", kind: "blob", oid: "0a8816c0e57382fa9ef12ec278512cec6f10fdcb", contentByteLength: 20 },
      { role: "seed", kind: "tree", oid: "5a7e53491189ee2511a9f6ddef0cc51593e248a1", contentByteLength: 41 },
      { role: "seed", kind: "commit", oid: "154a8efafcc44f9392bf7e50645f08a6b6c232e7", contentByteLength: 234 },
      { role: "candidate", kind: "blob", oid: "8392f03136ae3b89b724e01587591300711a471e", contentByteLength: 35 },
      { role: "candidate", kind: "tree", oid: "bbea0136c984f0346c38c194fa79135ab69570ad", contentByteLength: 41 },
      { role: "candidate", kind: "commit", oid: "a558d18e8d7135895ba5eb7d6d21f7ad28b0faa9", contentByteLength: 297 },
    ],
  );
  assert.deepEqual(plan.objects.map((value) => value.baseline), [
    "pre-existing-no-op",
    "pre-existing-no-op",
    "pre-existing-no-op",
    "absent-may-create",
    "absent-may-create",
    "absent-may-create",
  ]);
  assert.equal(plan.planSha256, "7104ce405d718dd2ced0d7bafe2a79f2837aec591de1e491c28f6f68015d08e6");
  assert.match(plan.canonical, /^7:version28:cairn-git-durability-plan\/v1/);
  assert(Object.isFrozen(plan));
  assert(Object.isFrozen(plan.matrix));
  assert(Object.isFrozen(plan.objects));
  assert(Object.isFrozen(plan.commands));
  for (const command of plan.commands) {
    assert(Object.isFrozen(command));
    assert(Object.isFrozen(command.argv));
    assert(Object.isFrozen(command.environment));
    assert(Object.isFrozen(command.admittedWrites));
    assert(Object.isFrozen(command.admittedWritePatterns));
  }
});

test("command plan is a closed inert argv vocabulary with no path-selected Git behavior", () => {
  const plan = requirePlan();
  assert.deepEqual(plan.commands.map((value) => value.stage), [
    "cross-check-candidate-blob-oid",
    "cross-check-candidate-tree-oid",
    "cross-check-candidate-commit-oid",
    "write-candidate-blob",
    "verify-candidate-blob",
    "read-base-tree-private-index",
    "update-private-index",
    "write-candidate-tree",
    "verify-candidate-tree",
    "write-candidate-commit",
    "verify-candidate-commit",
    "create-private-ref-cas",
    "verify-private-ref",
  ]);
  const allArgs = plan.commands.flatMap((value) => value.argv);
  assert(!allArgs.some((value) => value === "--path" || value.startsWith("--path=")));
  assert(!allArgs.includes("HEAD"));
  assert(!allArgs.some((value) => value.startsWith("refs/heads/") || value.startsWith("refs/remotes/")));
  assert(!allArgs.some((value) => /[;&|`\r\n]/.test(value)));
  assert.equal(allArgs.filter((value) => value === GIT_DURABILITY_CANDIDATE_REF).length, 2);
  assert(allArgs.includes("core.fsync=all"));
  assert(allArgs.includes("core.fsyncMethod=fsync"));
  assert(allArgs.includes("core.createObject=link"));
  assert(allArgs.includes("core.filesRefLockTimeout=0"));
  assert(allArgs.includes("core.logAllRefUpdates=false"));
  assert(allArgs.includes("core.useReplaceRefs=false"));
  assert(allArgs.includes("maintenance.auto=false"));
  assert(allArgs.includes("i18n.commitEncoding=UTF-8"));
  assert(allArgs.includes("0000000000000000000000000000000000000000"));
  assert.equal(allArgs.filter((value) => value === "--no-pager").length, plan.commands.length);
  assert.equal(allArgs.filter((value) => value === "--no-filters").length, 4);
  const readTree = plan.commands.find((value) => value.stage === "read-base-tree-private-index")!;
  assert.deepEqual(readTree.argv.slice(-3), ["read-tree", "-i", "5a7e53491189ee2511a9f6ddef0cc51593e248a1"]);
  const updateIndex = plan.commands.find((value) => value.stage === "update-private-index")!;
  assert(!updateIndex.argv.includes("--add"));
  for (const value of plan.commands) {
    assert.equal(value.executable, plan.matrix.gitExecutablePath);
    assert.equal(value.cwd, plan.repositoryRoot);
    assert.equal(value.executionPolicy, "direct-exec-file-no-shell-replaced-env");
    assert.equal(value.childPolicy, "single-foreground-child-no-detach-piped-stdio");
    assert.equal(value.timeoutMs, 10_000);
    assert.equal(value.expectedExitCode, 0);
    assert.equal(value.expectedStderrHex, "");
    assert.match(value.expectedStdoutHex, /^(?:[0-9a-f]{2})*$/);
    assert(value.environment.some((row) => row.name === "GIT_CONFIG_NOSYSTEM" && row.value === "1"));
    assert(value.environment.some((row) => row.name === "GIT_TERMINAL_PROMPT" && row.value === "0"));
    assert(value.environment.some((row) => row.name === "GIT_INDEX_FILE" && row.value === plan.privateIndexPath));
    assert(!value.environment.some((row) => row.name === "GIT_PAGER" || row.name === "PAGER"));
    assert(!value.environment.some((row) => /TOKEN|KEY|SECRET|PASSWORD|CREDENTIAL/i.test(row.name)));
  }
  const hashCommands = plan.commands.filter((value) => value.argv.includes("hash-object"));
  assert.equal(hashCommands.length, 4);
  assert(hashCommands.every((value) => value.argv.includes("--no-filters")));
  assert(hashCommands.slice(0, 3).every((value) => !value.argv.includes("-w")
    && value.admittedWrites.length === 0 && value.admittedWritePatterns.length === 0));
  assert.deepEqual(
    Buffer.from(hashCommands[0]!.expectedStdoutHex, "hex").toString("utf8"),
    "8392f03136ae3b89b724e01587591300711a471e\n",
  );
  for (const stage of ["read-base-tree-private-index", "update-private-index", "create-private-ref-cas"] as const) {
    assert.equal(plan.commands.find((value) => value.stage === stage)!.expectedStdoutHex, "");
  }
  for (const stage of ["write-candidate-blob", "write-candidate-tree", "write-candidate-commit"] as const) {
    const value = plan.commands.find((entry) => entry.stage === stage)!;
    const oid = stage === "write-candidate-blob"
      ? "8392f03136ae3b89b724e01587591300711a471e"
      : stage === "write-candidate-tree"
        ? "bbea0136c984f0346c38c194fa79135ab69570ad"
        : "a558d18e8d7135895ba5eb7d6d21f7ad28b0faa9";
    assert.deepEqual(value.admittedWritePatterns, [{
      kind: "git-loose-object-temp",
      parent: `${plan.gitDirectory}\\objects\\${oid.slice(0, 2)}`,
      basenamePattern: "tmp_obj_[A-Za-z0-9]{6}",
      maxMatches: 1,
    }]);
  }
  const writeTree = plan.commands.find((value) => value.stage === "write-candidate-tree")!;
  assert(writeTree.admittedWrites.includes(plan.privateIndexPath));
  assert(writeTree.admittedWrites.includes(`${plan.privateIndexPath}.lock`));
  const updateRef = plan.commands.at(-1)!;
  const createRef = plan.commands.find((value) => value.stage === "create-private-ref-cas")!;
  assert.deepEqual(createRef.argv.slice(-5), [
    "update-ref",
    "--no-deref",
    GIT_DURABILITY_CANDIDATE_REF,
    "a558d18e8d7135895ba5eb7d6d21f7ad28b0faa9",
    "0000000000000000000000000000000000000000",
  ]);
  assert.equal(updateRef.stage, "verify-private-ref");
  assert.equal(
    Buffer.from(updateRef.expectedStdoutHex, "hex").toString("utf8"),
    "a558d18e8d7135895ba5eb7d6d21f7ad28b0faa9\n",
  );
});

test("caller data cannot widen the fixed synthetic proposal or effect vocabulary", () => {
  assert.equal(composeGitDurabilityQualificationPlan(matrix({
    syntheticText: "caller text",
    operationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  })), null);
});

test("strict parser refuses extra, missing, symbolic, accessor, proxy and malformed inputs without getters", () => {
  assert.equal(composeGitDurabilityQualificationPlan(matrix({ extra: true })), null);
  const missing = matrix();
  delete missing.snapshotId;
  assert.equal(composeGitDurabilityQualificationPlan(missing), null);

  const symbolic = matrix();
  Object.defineProperty(symbolic, Symbol("extra"), { value: true, enumerable: true });
  assert.equal(composeGitDurabilityQualificationPlan(symbolic), null);

  let getterCalls = 0;
  const accessor = matrix();
  Object.defineProperty(accessor, "snapshotId", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "task228-clean-snapshot";
    },
  });
  assert.equal(composeGitDurabilityQualificationPlan(accessor), null);
  assert.equal(getterCalls, 0);

  let trapCalls = 0;
  const proxy = new Proxy(matrix(), {
    ownKeys() {
      trapCalls += 1;
      return [];
    },
  });
  assert.equal(composeGitDurabilityQualificationPlan(proxy), null);
  assert.equal(trapCalls, 0);

  assert.equal(composeGitDurabilityQualificationPlan(matrix({ osBuild: `bad\ud800` })), null);
  assert.equal(composeGitDurabilityQualificationPlan(Object.create({})), null);
});

test("matrix refuses unsupported Git, filesystem, backend, path and sharing facts", () => {
  const invalid: Record<string, unknown>[] = [
    { gitExecutableSha256: "F".repeat(64) },
    { gitVersion: "git version 2.51.0.windows.1" },
    { gitExecutablePath: "git.exe" },
    { gitExecutablePath: `R:\\cairn-task228-${GIT_DURABILITY_OPERATION_ID}\\git.exe` },
    { nodeExecutablePath: "C:\\node.com" },
    { nodeVersion: "v22.14.0" },
    { fixtureRoot: `C:\\cairn-task228-${GIT_DURABILITY_OPERATION_ID}` },
    { fixtureRoot: `R:\\other-${GIT_DURABILITY_OPERATION_ID}` },
    { fixtureRoot: `R:\\nested\\cairn-task228-${GIT_DURABILITY_OPERATION_ID}` },
    { fixtureRoot: `R:\\x\\..\\cairn-task228-${GIT_DURABILITY_OPERATION_ID}` },
    { gitExecutablePath: "C:\\CON\\git.exe" },
    { gitExecutablePath: "C:\\CONIN$\\git.exe" },
    { nodeExecutablePath: "C:\\CONOUT$\\node.exe" },
    { filesystem: "ReFS" },
    { refBackend: "reftable" },
    { objectFormat: "sha256" },
    { coreFsync: "committed" },
    { coreFsyncMethod: "batch" },
    { coreCreateObject: "rename" },
    { dedicatedVirtualDisk: false },
    { hostFolderSharing: true },
    { snapshotId: "x".repeat(257) },
  ];
  for (const override of invalid) {
    assert.equal(composeGitDurabilityQualificationPlan(matrix(override)), null, JSON.stringify(override));
  }
});

test("canonical plan binds every accepted matrix identity", () => {
  const base = requirePlan();
  const changedSnapshot = requirePlan({ snapshotId: "task228-clean-snapshot-2" });
  const changedDisk = requirePlan({ virtualDiskId: "task228-ntfs-disk-2" });
  const changedBuild = requirePlan({ osBuild: "Windows 11 24H2 build 26100.2" });
  assert.notEqual(changedSnapshot.planSha256, base.planSha256);
  assert.notEqual(changedDisk.planSha256, base.planSha256);
  assert.notEqual(changedBuild.planSha256, base.planSha256);
  assert.notEqual(changedSnapshot.canonical, base.canonical);
  assert.notEqual(changedDisk.canonical, base.canonical);
  assert.notEqual(changedBuild.canonical, base.canonical);
});

test("canonical command custody separates sections, counts and nullable bytes", () => {
  const plan = requirePlan();
  const { canonical: _canonical, planSha256: _sha, ...body } = plan;
  const first = plan.commands[0]!;
  const commandA = Object.freeze({
    ...first,
    argv: Object.freeze(["a"]),
    environment: Object.freeze([Object.freeze({ name: "b", value: "c" })]),
    stdinHex: null,
  });
  const commandB = Object.freeze({
    ...first,
    argv: Object.freeze(["a", "b", "c"]),
    environment: Object.freeze([]),
    stdinHex: null,
  });
  assert.notEqual(
    canonicalGitDurabilityQualificationPlan({ ...body, commands: Object.freeze([commandA]) }),
    canonicalGitDurabilityQualificationPlan({ ...body, commands: Object.freeze([commandB]) }),
  );
  assert.notEqual(
    canonicalGitDurabilityQualificationPlan({ ...body, commands: Object.freeze([commandA]) }),
    canonicalGitDurabilityQualificationPlan({
      ...body,
      commands: Object.freeze([Object.freeze({ ...commandA, stdinHex: "3c6e756c6c3e" })]),
    }),
  );
});

function walk(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

test("qualification planner remains outside every product and package entry graph", () => {
  const appRoot = process.cwd();
  const sourcePath = join(appRoot, "tests-qualification", "git-candidate-durability-plan.ts");
  const source = readFileSync(sourcePath, "utf8");
  assert.deepEqual(
    [...source.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1]).sort(),
    ["node:crypto", "node:util"],
  );
  assert(!/node:(?:fs|child_process|net|http|https|tls|dgram|worker_threads)/.test(source));
  assert(!/\b(?:exec|spawn|fork|writeFile|openSync|rename|unlink|rmSync|fetch)\w*\s*\(/.test(source));

  const runtimeNames = Object.keys(planModule).sort();
  assert.deepEqual(runtimeNames, [
    "GIT_DURABILITY_CANDIDATE_REF",
    "GIT_DURABILITY_MATRIX_VERSION",
    "GIT_DURABILITY_OPERATION_ID",
    "GIT_DURABILITY_PLAN_VERSION",
    "GIT_DURABILITY_POLICY_REVISION",
    "canonicalGitDurabilityQualificationPlan",
    "composeGitDurabilityQualificationPlan",
  ]);

  const productPaths = [
    ...walk(join(appRoot, "src")),
    ...walk(join(appRoot, "internal")),
    ...walk(join(appRoot, "scripts")),
    ...walk(resolve(appRoot, "..", "core", "src")),
    join(appRoot, "package.json"),
    resolve(appRoot, "..", "core", "package.json"),
    join(appRoot, "tsconfig.json"),
    join(appRoot, "vite.main.config.ts"),
    join(appRoot, "vite.preload.config.ts"),
    join(appRoot, "vite.renderer.config.ts"),
    join(appRoot, "forge.config.ts"),
  ];
  for (const path of productPaths) {
    if (!/\.(?:ts|tsx|js|mjs|json)$/.test(path)) continue;
    const content = readFileSync(path, "utf8");
    assert(!content.includes("git-candidate-durability-plan"), relative(appRoot, path));
    assert(!content.includes("cairn-git-durability-plan"), relative(appRoot, path));
  }
});
