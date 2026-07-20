import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createFakeBoundedProvider } from "../src/bounded-provider.js";
import {
  admitConcurrentRun,
  inspectConcurrentCleanup,
  recoverConcurrentRun,
  runConcurrentFake,
  validateConcurrentManifest,
  type ConcurrentManifest,
} from "../src/concurrent-run.js";

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function sha(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function fixture(label: string): { root: string; manifest: ConcurrentManifest } {
  const root = mkdtempSync(join(tmpdir(), `cairn-task-024-${label}-`));
  for (const dir of ["content", "test", "docs/ai-work/tasks"]) mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "# Disposable Cairn proof\n");
  writeFileSync(join(root, "docs/ai-work/PROJECT.md"), "# Disposable reading list\n");
  writeFileSync(join(root, "docs/ai-work/LOG.md"), "| Task | Date | Lane | Draft/Final | Outcome | Decision | One-line summary | Milestone moved? |\n|---|---|---|---|---|---|---|---|---|\n");
  writeFileSync(join(root, "content/welcome.txt"), "PLACEHOLDER_WELCOME\n");
  writeFileSync(join(root, "content/add-book.txt"), "PLACEHOLDER_ADD_BOOK\n");
  writeFileSync(join(root, "test/welcome.test.mjs"), `import test from "node:test"; import assert from "node:assert/strict"; import { readFileSync } from "node:fs";\ntest("welcome copy",()=>{const v=readFileSync("content/welcome.txt","utf8").trim(); assert.ok(v==="PLACEHOLDER_WELCOME" || /\\bwelcome\\b/i.test(v));});\n`);
  writeFileSync(join(root, "test/add-book.test.mjs"), `import test from "node:test"; import assert from "node:assert/strict"; import { readFileSync } from "node:fs";\ntest("add book copy",()=>{const v=readFileSync("content/add-book.txt","utf8").trim(); assert.ok(v==="PLACEHOLDER_ADD_BOOK" || (/\\badd\\b/i.test(v) && /\\bbook\\b/i.test(v)));});\n`);
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
        checks: [{ command: "node", args: ["--test", "test/welcome.test.mjs"] }, { command: "node", args: ["--test", "test/welcome.test.mjs", "test/add-book.test.mjs"] }],
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
  writeFileSync(join(root, "run-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  git(root, ["add", "--", "run-manifest.json"]);
  git(root, ["commit", "-m", "Pin closed-batch manifest"]);
  return { root, manifest };
}

test("the Final exposes closed-batch admission and an offline fake run", async () => {
  const moduleName = "../src/concurrent-run.js";
  const candidate = await import(moduleName) as Record<string, unknown>;
  assert.equal(typeof candidate.validateConcurrentManifest, "function");
  assert.equal(typeof candidate.admitConcurrentRun, "function");
  assert.equal(typeof candidate.runConcurrentFake, "function");
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

test("offline builders overlap and both integrate one at a time against latest main", async () => {
  const { root, manifest } = fixture("done-done");
  process.env.CAIRN_BOUNDED_CONCURRENCY_REHEARSAL = "1";
  let maximum = 0;
  const provider = createFakeBoundedProvider({ delayMs: 30, onActiveChange: (active) => { maximum = Math.max(maximum, active); } });
  const result = await runConcurrentFake(root, manifest, { provider });
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

for (const [label, stop1, stop2] of [
  ["done-stopped", false, true], ["stopped-done", true, false], ["stopped-stopped", true, true],
] as const) {
  test(`offline evidence is truthful for ${label}`, async () => {
    const { root, manifest } = fixture(label);
    process.env.CAIRN_BOUNDED_CONCURRENCY_REHEARSAL = "1";
    const provider = createFakeBoundedProvider({ results: {
      ...(stop1 ? { 1: "not-json" } : {}), ...(stop2 ? { 2: "not-json" } : {}),
    } });
    const result = await runConcurrentFake(root, manifest, { provider });
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
  const { root, manifest } = fixture("admit-only");
  process.env.CAIRN_BOUNDED_CONCURRENCY_REHEARSAL = "1";
  const state = admitConcurrentRun(root, manifest);
  assert.equal(state.tasks.length, 2);
  assert.ok(state.tasks.every((task) => task.worktree.startsWith(tmpdir())));
  assert.equal(git(root, ["branch", "--list", "cairn/task-*"]).split(/\r?\n/).filter(Boolean).length, 2);
  const recovered = recoverConcurrentRun(root, state.runId);
  assert.deepEqual(recovered.tasks.map((task) => task.disposition), ["STOPPED", "STOPPED"]);
  assert.deepEqual(inspectConcurrentCleanup(root), { cleanMain: true, worktreeCount: 1, taskBranches: [], statePresent: false, lockPresent: false });
});

for (const faultAt of ["after-building-state", "after-builds"] as const) {
  test(`recovery closes the owned run after ${faultAt} without another call`, async () => {
    const { root, manifest } = fixture(`fault-${faultAt}`);
    process.env.CAIRN_BOUNDED_CONCURRENCY_REHEARSAL = "1";
    const provider = createFakeBoundedProvider({ delayMs: 5 });
    await assert.rejects(() => runConcurrentFake(root, manifest, { provider, faultAt }), /INJECTED_FAULT/);
    const callsBefore = provider.snapshot().totalCalls;
    const recovered = recoverConcurrentRun(root, manifest.runId);
    assert.equal(provider.snapshot().totalCalls, callsBefore);
    assert.deepEqual(recovered.tasks.map((task) => task.disposition), ["STOPPED", "STOPPED"]);
    assert.deepEqual(inspectConcurrentCleanup(root), { cleanMain: true, worktreeCount: 1, taskBranches: [], statePresent: false, lockPresent: false });
  });
}
