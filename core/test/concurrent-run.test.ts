import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { createFakeBoundedProvider } from "../src/bounded-provider.js";
import {
  admitConcurrentFromManifestPath,
  canonicalConcurrentManifest,
  CONCURRENT_STATE_FILE,
  concurrentRunView,
  inspectConcurrentCleanup,
  parseConcurrentManifest,
  readConcurrentRunState,
  recoverConcurrentRun,
  runConcurrentFromManifestPath,
  validateConcurrentManifest,
  type ConcurrentManifest,
} from "../src/concurrent-run.js";
import { concurrentStateDigest } from "../src/concurrent-state.js";

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function sha(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function fixture(label: string): { root: string; manifest: ConcurrentManifest; manifestPath: string } {
  const root = mkdtempSync(join(tmpdir(), `cairn-task-024-${label}-`));
  for (const dir of ["content", "test", "docs/ai-work/tasks"]) mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "# Disposable Cairn proof\n");
  writeFileSync(join(root, "docs/ai-work/PROJECT.md"), "# Disposable reading list\n");
  writeFileSync(join(root, "docs/ai-work/LOG.md"), "| Task | Date | Lane | Draft/Final | Outcome | Decision | One-line summary | Milestone moved? |\n|---|---|---|---|---|---|---|---|---|\n");
  writeFileSync(join(root, "content/welcome.txt"), "PLACEHOLDER_WELCOME\n");
  writeFileSync(join(root, "content/add-book.txt"), "PLACEHOLDER_ADD_BOOK\n");
  writeFileSync(join(root, "test/welcome.test.mjs"), `import test from "node:test"; import assert from "node:assert/strict"; import { readFileSync } from "node:fs";\ntest("welcome copy",()=>{const v=readFileSync("content/welcome.txt","utf8").trim(); assert.notEqual(v,"PLACEHOLDER_WELCOME"); assert.match(v,/\\bwelcome\\b/i);});\n`);
  writeFileSync(join(root, "test/add-book.test.mjs"), `import test from "node:test"; import assert from "node:assert/strict"; import { readFileSync } from "node:fs";\ntest("add book copy",()=>{const v=readFileSync("content/add-book.txt","utf8").trim(); assert.notEqual(v,"PLACEHOLDER_ADD_BOOK"); assert.match(v,/\\badd\\b/i); assert.match(v,/\\bbook\\b/i);});\n`);
  const briefs = {
    1: "# Task 001 brief\n\nLane: Standard\n\nReplace only the disposable welcome sentence.\n",
    2: "# Task 002 brief\n\nLane: Standard\n\nReplace only the disposable add-book sentence.\n",
  } as const;
  for (const taskNumber of [1, 2] as const) {
    const n = String(taskNumber).padStart(3, "0");
    const briefPath = `docs/ai-work/tasks/${n}-brief.md`;
    writeFileSync(join(root, briefPath), briefs[taskNumber]);
    writeFileSync(join(root, `docs/ai-work/tasks/${n}-approval.json`), JSON.stringify({
      schemaVersion: 1, taskNumber, briefPath, briefSha256: sha(briefs[taskNumber]), approvedAt: "offline-rehearsal",
    }, null, 2) + "\n");
  }
  git(root, ["init", "-b", "main"]);
  git(root, ["config", "user.name", "Cairn Disposable Test"]);
  git(root, ["config", "user.email", "cairn-test@example.invalid"]);
  git(root, ["add", "--", "AGENTS.md", "content/welcome.txt", "content/add-book.txt", "test/welcome.test.mjs", "test/add-book.test.mjs", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md", "docs/ai-work/tasks/001-brief.md", "docs/ai-work/tasks/001-approval.json", "docs/ai-work/tasks/002-brief.md", "docs/ai-work/tasks/002-approval.json"]);
  git(root, ["commit", "-m", "Disposable proof fixture"]);
  const common = (taskNumber: 1 | 2) => {
    const n = String(taskNumber).padStart(3, "0");
    return {
      schemaVersion: 1 as const,
      taskNumber,
      briefPath: `docs/ai-work/tasks/${n}-brief.md`,
      briefSha256: sha(briefs[taskNumber]),
      lane: "Standard" as const,
      recordMode: "Applied" as const,
      independentlyUseful: true as const,
      dependencies: [] as [],
      externalActions: [] as [],
      records: {
        brief: `docs/ai-work/tasks/${n}-brief.md`, approval: `docs/ai-work/tasks/${n}-approval.json`,
        report: `docs/ai-work/tasks/${n}-report.md`, evidence: `docs/ai-work/tasks/${n}-evidence.json`,
      },
    };
  };
  const manifest: ConcurrentManifest = {
    schemaVersion: 1,
    runId: `proof-${label.replace(/[^a-z0-9-]/g, "-")}`,
    mode: "offline-proof",
    totalCostCapUsd: 0.5,
    tasks: [
      {
        ...common(1), outcome: "Replace the welcome placeholder", usefulness: "Welcome copy is useful without add-book copy.",
        implementationPaths: ["content/welcome.txt"], testPaths: ["test/welcome.test.mjs"], writablePaths: ["content/welcome.txt"],
        checks: [{ command: "node", args: ["--test", "test/welcome.test.mjs"] }],
        provider: { provider: "anthropic", model: "claude-haiku-4-5", inputSha256: "3f50f7d24b6e52247aa05eae652d6a0bed39ce8bd7ce6da42642b74ee117bfe8", maxCalls: 1, maxCostUsd: 0.25 },
      },
      {
        ...common(2), outcome: "Replace the add-book placeholder", usefulness: "Add-book copy is useful without welcome copy.",
        implementationPaths: ["content/add-book.txt"], testPaths: ["test/add-book.test.mjs"], writablePaths: ["content/add-book.txt"],
        checks: [{ command: "node", args: ["--test", "test/add-book.test.mjs"] }, { command: "node", args: ["--test", "test/welcome.test.mjs", "test/add-book.test.mjs"] }],
        provider: { provider: "anthropic", model: "claude-haiku-4-5", inputSha256: "2196cff705d1b7e4dff0507afc0ba808871e377aadf14da1e9a7631f2fb6bdd8", maxCalls: 1, maxCostUsd: 0.25 },
      },
    ],
  };
  writeFileSync(join(root, "run-manifest.json"), canonicalConcurrentManifest(manifest));
  git(root, ["add", "--", "run-manifest.json"]);
  git(root, ["commit", "-m", "Pin closed-batch manifest"]);
  return { root, manifest, manifestPath: "run-manifest.json" };
}

test("the Final exposes closed-batch admission and an offline fake run", async () => {
  const moduleName = "../src/concurrent-run.js";
  const candidate = await import(moduleName) as Record<string, unknown>;
  assert.equal(typeof candidate.validateConcurrentManifest, "function");
  assert.equal(typeof candidate.admitConcurrentFromManifestPath, "function");
  assert.equal(typeof candidate.runConcurrentFromManifestPath, "function");
});

test("whole-batch validation refuses overlap and a third task before admission", () => {
  const { root, manifest } = fixture("validation");
  assert.equal(validateConcurrentManifest(manifest, root).tasks.length, 2);
  const overlap = structuredClone(manifest);
  overlap.tasks[1].implementationPaths = ["content"];
  overlap.tasks[1].writablePaths = ["content"];
  assert.throws(() => validateConcurrentManifest(overlap, root), /SCOPE_OVERLAP/);
  const third = structuredClone(manifest);
  third.tasks.push(structuredClone(third.tasks[0]));
  assert.throws(() => validateConcurrentManifest(third, root), /CONCURRENCY_LIMIT/);
  assert.equal(git(root, ["branch", "--list", "cairn/task-*"]), "");
  assert.equal(git(root, ["worktree", "list", "--porcelain"]).split(/\r?\n/).filter((line) => line.startsWith("worktree ")).length, 1);
  console.log(`CAIRN_TASK_024_CLI_ROOT=${root}`);
});

test("manifest bytes reject duplicate keys and every noncanonical representation", () => {
  const { root, manifest } = fixture("manifest-canonical");
  const canonical = canonicalConcurrentManifest(manifest);
  assert.equal(parseConcurrentManifest(canonical, root).tasks.length, 2);
  assert.throws(() => parseConcurrentManifest(canonical.replace('"schemaVersion": 1', '"schemaVersion": 1,\n  "schemaVersion": 1'), root), /DUPLICATE_JSON_KEY/);
  assert.throws(() => parseConcurrentManifest(canonical.replace("{\n", "{ "), root), /MALFORMED_MANIFEST/);
});

test("offline builders overlap and both integrate one at a time against latest main", async () => {
  const { root, manifestPath } = fixture("done-done");
  process.env.CAIRN_BOUNDED_CONCURRENCY_REHEARSAL = "1";
  let maximum = 0;
  const provider = createFakeBoundedProvider({ delayMs: 30, onActiveChange: (active) => { maximum = Math.max(maximum, active); } });
  const result = await runConcurrentFromManifestPath(root, manifestPath, { fakeProvider: provider });
  assert.equal(maximum, 2);
  assert.deepEqual(result.tasks.map((task) => task.disposition), ["DONE", "DONE"]);
  assert.deepEqual(result.integrationOrder, [1, 2]);
  assert.notEqual(result.tasks[0].integrationCommit, result.tasks[1].integrationCommit);
  assert.match(readFileSync(join(root, "content/welcome.txt"), "utf8"), /welcome/i);
  assert.match(readFileSync(join(root, "content/add-book.txt"), "utf8"), /add.*book/i);
  const log = readFileSync(join(root, "docs/ai-work/LOG.md"), "utf8");
  assert.match(log, /\| 001 \|.*\| DONE \| completed \|/);
  assert.match(log, /\| 002 \|.*\| DONE \| completed \|/);
  assert.deepEqual(inspectConcurrentCleanup(root), { cleanMain: true, worktreeCount: 1, taskBranches: [], statePresent: false, lockPresent: false });
});

test("a fake parent credential canary never enters disposable files, evidence, or Git objects", async () => {
  const { root, manifestPath } = fixture("credential-canary");
  const canary = "TASK027_OFFLINE_CREDENTIAL_CANARY_9E71B2";
  const previous = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = canary;
  process.env.CAIRN_BOUNDED_CONCURRENCY_REHEARSAL = "1";
  try {
    const result = await runConcurrentFromManifestPath(root, manifestPath, { fakeProvider: createFakeBoundedProvider({ delayMs: 5 }) });
    assert.equal(JSON.stringify(result).includes(canary), false);
    const commits = git(root, ["rev-list", "--all"]).split(/\r?\n/).filter(Boolean);
    const scan = spawnSync("git", ["grep", "-F", canary, ...commits], { cwd: root, encoding: "utf8" });
    assert.equal(scan.status, 1, scan.stdout || scan.stderr);
    assert.deepEqual(inspectConcurrentCleanup(root), { cleanMain: true, worktreeCount: 1, taskBranches: [], statePresent: false, lockPresent: false });
  } finally {
    if (previous === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = previous;
  }
});

for (const [label, stop1, stop2] of [
  ["done-stopped", false, true], ["stopped-done", true, false], ["stopped-stopped", true, true],
] as const) {
  test(`offline evidence is truthful for ${label}`, async () => {
    const { root, manifestPath } = fixture(label);
    process.env.CAIRN_BOUNDED_CONCURRENCY_REHEARSAL = "1";
    const provider = createFakeBoundedProvider({ results: {
      ...(stop1 ? { 1: "not-json" } : {}), ...(stop2 ? { 2: "not-json" } : {}),
    } });
    const result = await runConcurrentFromManifestPath(root, manifestPath, { fakeProvider: provider });
    assert.deepEqual(result.tasks.map((task) => task.disposition), [stop1 ? "STOPPED" : "DONE", stop2 ? "STOPPED" : "DONE"]);
    const welcome = readFileSync(join(root, "content/welcome.txt"), "utf8");
    const addBook = readFileSync(join(root, "content/add-book.txt"), "utf8");
    assert.equal(welcome === "PLACEHOLDER_WELCOME\n", stop1);
    assert.equal(addBook === "PLACEHOLDER_ADD_BOOK\n", stop2);
    const log = readFileSync(join(root, "docs/ai-work/LOG.md"), "utf8");
    assert.equal((log.match(/\| STOPPED \| stopped \|/g) ?? []).length, Number(stop1) + Number(stop2));
    assert.deepEqual(inspectConcurrentCleanup(root), { cleanMain: true, worktreeCount: 1, taskBranches: [], statePresent: false, lockPresent: false });
  });
}

test("admission creates exactly two temporary worktrees and a closed durable state", () => {
  const { root, manifestPath } = fixture("admit-only");
  process.env.CAIRN_BOUNDED_CONCURRENCY_REHEARSAL = "1";
  const state = admitConcurrentFromManifestPath(root, manifestPath);
  assert.equal(state.tasks.length, 2);
  assert.ok(state.tasks.every((task) => task.worktree.startsWith(tmpdir())));
  assert.equal(git(root, ["branch", "--list", "cairn/task-*"]).split(/\r?\n/).filter(Boolean).length, 2);
  const recovered = recoverConcurrentRun(root, state.runId);
  assert.deepEqual(recovered.tasks.map((task) => task.disposition), ["STOPPED", "STOPPED"]);
  assert.deepEqual(inspectConcurrentCleanup(root), { cleanMain: true, worktreeCount: 1, taskBranches: [], statePresent: false, lockPresent: false });
});

test("the exact emergency switch blocks before admission while the legacy misspelling has no authority", () => {
  const blocked = fixture("disable-exact");
  process.env.CAIRN_BOUNDED_CONCURRENCY_REHEARSAL = "1";
  process.env.CAIRN_BOUNDED_CONCURRENCY_DISABLE = "1";
  try {
    assert.throws(() => admitConcurrentFromManifestPath(blocked.root, blocked.manifestPath), /FINAL_DISABLED/);
    assert.equal(git(blocked.root, ["branch", "--list", "cairn/task-*"]), "");
  } finally { delete process.env.CAIRN_BOUNDED_CONCURRENCY_DISABLE; }

  const legacy = fixture("disable-legacy");
  process.env.CAIRN_DISABLE_BOUNDED_CONCURRENCY = "1";
  try {
    const state = admitConcurrentFromManifestPath(legacy.root, legacy.manifestPath);
    assert.equal(state.tasks.length, 2);
    recoverConcurrentRun(legacy.root, state.runId);
  } finally { delete process.env.CAIRN_DISABLE_BOUNDED_CONCURRENCY; }
});

test("approval extra fields fail before state, branch, or worktree effects", () => {
  const { root, manifestPath } = fixture("approval-extra");
  const path = join(root, "docs/ai-work/tasks/001-approval.json");
  const approval = JSON.parse(readFileSync(path, "utf8"));
  writeFileSync(path, JSON.stringify({ ...approval, extra: true }, null, 2) + "\n");
  process.env.CAIRN_BOUNDED_CONCURRENCY_REHEARSAL = "1";
  assert.throws(() => admitConcurrentFromManifestPath(root, manifestPath), /FROZEN_GATE_FAILED/);
  assert.equal(git(root, ["branch", "--list", "cairn/task-*"]), "");
  assert.equal(existsSync(join(root, ".git", "cairn")), false);
});

test("approval duplicate keys fail before state, branch, or worktree effects", () => {
  const { root, manifestPath } = fixture("approval-duplicate");
  const path = join(root, "docs/ai-work/tasks/001-approval.json");
  const raw = readFileSync(path, "utf8").replace('"schemaVersion": 1', '"schemaVersion": 1,\n  "schemaVersion": 1');
  writeFileSync(path, raw);
  process.env.CAIRN_BOUNDED_CONCURRENCY_REHEARSAL = "1";
  assert.throws(() => admitConcurrentFromManifestPath(root, manifestPath), /FROZEN_GATE_FAILED/);
  assert.equal(git(root, ["branch", "--list", "cairn/task-*"]), "");
  assert.equal(existsSync(join(root, ".git", "cairn")), false);
});

test("schema-3 state rejects duplicate keys, unknown nested fields, and nonmonotonic journal entries", () => {
  const { root, manifestPath } = fixture("state-strict");
  process.env.CAIRN_BOUNDED_CONCURRENCY_REHEARSAL = "1";
  const state = admitConcurrentFromManifestPath(root, manifestPath);
  const statePath = join(resolve(root, git(root, ["rev-parse", "--git-common-dir"])), "cairn", CONCURRENT_STATE_FILE);
  const original = readFileSync(statePath, "utf8");
  writeFileSync(statePath, original.replace('"schemaVersion": 3', '"schemaVersion": 3,\n  "schemaVersion": 3'));
  assert.throws(() => readConcurrentRunState(root), /CORRUPT_STATE/);
  const unknown = JSON.parse(original) as Record<string, unknown>;
  (unknown.tasks as Array<Record<string, unknown>>)[0].extra = true;
  unknown.stateDigest = concurrentStateDigest(unknown);
  writeFileSync(statePath, JSON.stringify(unknown, null, 2) + "\n");
  assert.throws(() => readConcurrentRunState(root), /CORRUPT_STATE/);
  const nonmonotonic = JSON.parse(original) as Record<string, unknown>;
  const journal = nonmonotonic.journal as { completed: Array<Record<string, unknown>> };
  journal.completed[1].sequence = journal.completed[0].sequence;
  nonmonotonic.stateDigest = concurrentStateDigest(nonmonotonic);
  writeFileSync(statePath, JSON.stringify(nonmonotonic, null, 2) + "\n");
  assert.throws(() => readConcurrentRunState(root), /CORRUPT_STATE/);
  const invalidPhase = JSON.parse(original) as Record<string, unknown>;
  (invalidPhase.tasks as Array<Record<string, unknown>>)[0].phase = "anything";
  invalidPhase.stateDigest = concurrentStateDigest(invalidPhase);
  writeFileSync(statePath, JSON.stringify(invalidPhase, null, 2) + "\n");
  assert.throws(() => readConcurrentRunState(root), /CORRUPT_STATE/);
  const invalidManifest = JSON.parse(original) as Record<string, unknown>;
  (((invalidManifest.manifest as Record<string, unknown>).tasks as Array<Record<string, unknown>>)[0].provider as Record<string, unknown>).model = "other-model";
  invalidManifest.stateDigest = concurrentStateDigest(invalidManifest);
  writeFileSync(statePath, JSON.stringify(invalidManifest, null, 2) + "\n");
  assert.throws(() => readConcurrentRunState(root), /CORRUPT_STATE/);
  const invalidOrder = JSON.parse(original) as Record<string, unknown>;
  const ordered = (invalidOrder.journal as { completed: Array<Record<string, unknown>> }).completed;
  ordered[1].name = "run-cleanup";
  ordered[1].taskNumber = null;
  invalidOrder.stateDigest = concurrentStateDigest(invalidOrder);
  writeFileSync(statePath, JSON.stringify(invalidOrder, null, 2) + "\n");
  assert.throws(() => readConcurrentRunState(root), /CORRUPT_STATE/);
  writeFileSync(statePath, original);
  recoverConcurrentRun(root, state.runId);
});

test("recovery rejects duplicate lock keys before trusting stale ownership", () => {
  const { root, manifestPath } = fixture("lock-duplicate");
  process.env.CAIRN_BOUNDED_CONCURRENCY_REHEARSAL = "1";
  const state = admitConcurrentFromManifestPath(root, manifestPath);
  const cairnDir = join(resolve(root, git(root, ["rev-parse", "--git-common-dir"])), "cairn");
  writeFileSync(join(cairnDir, `${CONCURRENT_STATE_FILE}.lock`), `{"pid":999999,"pid":${process.pid},"processStartIdentity":"x","runId":"${state.runId}","ownerToken":"${state.ownerToken}","createdAt":"now"}\n`);
  assert.throws(() => recoverConcurrentRun(root, state.runId), /EXTERNAL_INTERFERENCE/);
  writeFileSync(join(cairnDir, `${CONCURRENT_STATE_FILE}.lock`), JSON.stringify({ pid: 999999, processStartIdentity: "x",
    runId: state.runId, ownerToken: state.ownerToken, createdAt: "now" }) + "\n");
  recoverConcurrentRun(root, state.runId);
});

test("renderer-facing bounded status contains no repository, worktree, token, manifest, or authorization data", () => {
  const { root, manifestPath } = fixture("sanitized-view");
  process.env.CAIRN_BOUNDED_CONCURRENCY_REHEARSAL = "1";
  const state = admitConcurrentFromManifestPath(root, manifestPath);
  const view = concurrentRunView(root);
  const raw = JSON.stringify(view);
  assert.ok(view);
  for (const forbidden of [root, state.worktreeRoot, state.gitDir, state.ownerToken, "manifestSha256", "liveAuthorization"]) {
    assert.equal(raw.includes(forbidden), false);
  }
  recoverConcurrentRun(root, state.runId);
});

for (const crashAt of ["after:task-worktree:1", "after:call-consume:1", "after:main-fast-forward:1"] as const) {
  test(`a separate process crash at ${crashAt} recovers without duplicate evidence or an extra call`, () => {
    const { root, manifestPath } = fixture(`process-${crashAt.replace(/:/g, "-")}`);
    const moduleUrl = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "index.js")).href;
    const script = `import { runConcurrentFromManifestPath } from ${JSON.stringify(moduleUrl)}; await runConcurrentFromManifestPath(${JSON.stringify(root)}, ${JSON.stringify(manifestPath)});`;
    const child = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
      encoding: "utf8",
      timeout: 120_000,
      env: { ...process.env, CAIRN_BOUNDED_CONCURRENCY_REHEARSAL: "1", CAIRN_BOUNDED_CONCURRENCY_TEST_CRASH_AT: crashAt },
    });
    assert.equal(child.status, 86, child.stderr || child.stdout);
    const recovered = recoverConcurrentRun(root, `proof-process-${crashAt.replace(/[^a-z0-9-]/g, "-")}`);
    assert.equal(recovered.providerCalls <= 2, true);
    if (crashAt === "after:call-consume:1") assert.equal(recovered.tasks[0].blocker, "CALL_OUTCOME_UNKNOWN");
    const log = readFileSync(join(root, "docs/ai-work/LOG.md"), "utf8");
    for (const task of ["001", "002"]) assert.equal((log.match(new RegExp(`\\| ${task} \\|`, "g")) ?? []).length, 1);
    assert.deepEqual(inspectConcurrentCleanup(root), { cleanMain: true, worktreeCount: 1, taskBranches: [], statePresent: false, lockPresent: false });
  });
}

for (const faultAt of ["after-building-state", "after-builds"] as const) {
  test(`recovery closes the owned run after ${faultAt} without another call`, async () => {
    const { root, manifest, manifestPath } = fixture(`fault-${faultAt}`);
    process.env.CAIRN_BOUNDED_CONCURRENCY_REHEARSAL = "1";
    const provider = createFakeBoundedProvider({ delayMs: 5 });
    await assert.rejects(() => runConcurrentFromManifestPath(root, manifestPath, { fakeProvider: provider, faultAt }), /INJECTED_FAULT/);
    const callsBefore = provider.snapshot().totalCalls;
    const recovered = recoverConcurrentRun(root, manifest.runId);
    assert.equal(provider.snapshot().totalCalls, callsBefore);
    assert.deepEqual(recovered.tasks.map((task) => task.disposition), ["STOPPED", "STOPPED"]);
    assert.deepEqual(inspectConcurrentCleanup(root), { cleanMain: true, worktreeCount: 1, taskBranches: [], statePresent: false, lockPresent: false });
  });
}
