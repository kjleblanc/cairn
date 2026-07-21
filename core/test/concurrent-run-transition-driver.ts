import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { canonicalConcurrentManifest, inspectConcurrentCleanup, recoverConcurrentRun, type ConcurrentManifest } from "../src/concurrent-run.js";

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function sha(value: string): string { return createHash("sha256").update(value, "utf8").digest("hex"); }

export function createTransitionDriverFixture(label: string): { root: string; manifestPath: string; runId: string } {
  const root = mkdtempSync(join(tmpdir(), `cairn-task-027-transition-${label}-`));
  for (const dir of ["content", "test", "docs/ai-work/tasks"]) mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "# Disposable Cairn transition proof\n");
  writeFileSync(join(root, "docs/ai-work/PROJECT.md"), "# Disposable reading list\n");
  writeFileSync(join(root, "docs/ai-work/LOG.md"), "| Task | Date | Lane | Draft/Final | Outcome | Decision | One-line summary | Milestone moved? |\n|---|---|---|---|---|---|---|---|---|\n");
  writeFileSync(join(root, "content/welcome.txt"), "PLACEHOLDER_WELCOME\n");
  writeFileSync(join(root, "content/add-book.txt"), "PLACEHOLDER_ADD_BOOK\n");
  writeFileSync(join(root, "test/welcome.test.mjs"), `import test from "node:test"; import assert from "node:assert/strict"; import { readFileSync } from "node:fs";\ntest("welcome",()=>{const v=readFileSync("content/welcome.txt","utf8").trim();assert.notEqual(v,"PLACEHOLDER_WELCOME");assert.match(v,/\\bwelcome\\b/i);});\n`);
  writeFileSync(join(root, "test/add-book.test.mjs"), `import test from "node:test"; import assert from "node:assert/strict"; import { readFileSync } from "node:fs";\ntest("add book",()=>{const v=readFileSync("content/add-book.txt","utf8").trim();assert.notEqual(v,"PLACEHOLDER_ADD_BOOK");assert.match(v,/\\badd\\b/i);assert.match(v,/\\bbook\\b/i);});\n`);
  const briefs = { 1: "# Task 001 brief\n\nLane: Standard\n\nReplace only welcome.\n", 2: "# Task 002 brief\n\nLane: Standard\n\nReplace only add-book.\n" } as const;
  for (const taskNumber of [1, 2] as const) {
    const n = String(taskNumber).padStart(3, "0");
    const briefPath = `docs/ai-work/tasks/${n}-brief.md`;
    writeFileSync(join(root, briefPath), briefs[taskNumber]);
    writeFileSync(join(root, `docs/ai-work/tasks/${n}-approval.json`), JSON.stringify({ schemaVersion: 1, taskNumber,
      briefPath, briefSha256: sha(briefs[taskNumber]), approvedAt: "offline-rehearsal" }, null, 2) + "\n");
  }
  git(root, ["init", "-b", "main"]);
  git(root, ["config", "user.name", "Cairn Transition Driver"]);
  git(root, ["config", "user.email", "cairn-transition@example.invalid"]);
  git(root, ["config", "core.autocrlf", "false"]);
  git(root, ["add", "--", "AGENTS.md", "content/welcome.txt", "content/add-book.txt", "test/welcome.test.mjs",
    "test/add-book.test.mjs", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md", "docs/ai-work/tasks/001-brief.md",
    "docs/ai-work/tasks/001-approval.json", "docs/ai-work/tasks/002-brief.md", "docs/ai-work/tasks/002-approval.json"]);
  git(root, ["commit", "-m", "Disposable transition fixture"]);
  const common = (taskNumber: 1 | 2) => {
    const n = String(taskNumber).padStart(3, "0");
    return { schemaVersion: 1 as const, taskNumber, briefPath: `docs/ai-work/tasks/${n}-brief.md`,
      briefSha256: sha(briefs[taskNumber]), lane: "Standard" as const, recordMode: "Applied" as const,
      independentlyUseful: true as const, dependencies: [] as [], externalActions: [] as [],
      records: { brief: `docs/ai-work/tasks/${n}-brief.md`, approval: `docs/ai-work/tasks/${n}-approval.json`,
        report: `docs/ai-work/tasks/${n}-report.md`, evidence: `docs/ai-work/tasks/${n}-evidence.json` } };
  };
  const runId = `driver-${label}`.slice(0, 47).replace(/-+$/g, "x");
  const manifest: ConcurrentManifest = {
    schemaVersion: 1, runId, mode: "offline-proof", totalCostCapUsd: 0.5,
    tasks: [
      { ...common(1), outcome: "Replace welcome", usefulness: "Welcome is independently useful.",
        implementationPaths: ["content/welcome.txt"], testPaths: ["test/welcome.test.mjs"], writablePaths: ["content/welcome.txt"],
        checks: [{ command: "node", args: ["--test", "test/welcome.test.mjs"] }],
        provider: { provider: "anthropic", model: "claude-haiku-4-5", inputSha256: "3f50f7d24b6e52247aa05eae652d6a0bed39ce8bd7ce6da42642b74ee117bfe8", maxCalls: 1, maxCostUsd: 0.25 } },
      { ...common(2), outcome: "Replace add-book", usefulness: "Add-book is independently useful.",
        implementationPaths: ["content/add-book.txt"], testPaths: ["test/add-book.test.mjs"], writablePaths: ["content/add-book.txt"],
        checks: [{ command: "node", args: ["--test", "test/add-book.test.mjs"] }],
        provider: { provider: "anthropic", model: "claude-haiku-4-5", inputSha256: "2196cff705d1b7e4dff0507afc0ba808871e377aadf14da1e9a7631f2fb6bdd8", maxCalls: 1, maxCostUsd: 0.25 } },
    ],
  };
  writeFileSync(join(root, "run-manifest.json"), canonicalConcurrentManifest(manifest));
  git(root, ["add", "--", "run-manifest.json"]);
  git(root, ["commit", "-m", "Pin transition manifest"]);
  return { root, manifestPath: "run-manifest.json", runId };
}

export function removeTransitionDriverFixture(root: string): void {
  const absolute = resolve(root);
  const rel = relative(resolve(tmpdir()), absolute);
  if (!rel || rel.startsWith("..") || isAbsolute(rel) || !absolute.includes("cairn-task-027-transition-")) {
    throw new Error("DRIVER_CLEANUP_SCOPE_REFUSED");
  }
  rmSync(absolute, { recursive: true, force: true });
}

const RUN_TRANSITIONS = ["admission", "worktree-root", "process-cleanup", "run-cleanup"] as const;
const TASK_TRANSITIONS = ["task-worktree", "approval-freeze", "call-consume", "broker-result", "result-apply",
  "task-commit", "integration-lease", "integration-candidate", "candidate-checks", "evidence-finalize",
  "main-fast-forward", "task-cleanup", "integration-cleanup"] as const;

export const TRANSITION_DRIVER_CASES = [
  ...RUN_TRANSITIONS.flatMap((name) => (["before", "after"] as const).map((side) => ({ name, task: "run" as const, side }))),
  ...([1, 2] as const).flatMap((task) => TASK_TRANSITIONS.flatMap((name) =>
    (["before", "after"] as const).map((side) => ({ name, task, side })))),
];

export function runTransitionDriver(
  cases = TRANSITION_DRIVER_CASES,
): { cases: number; recovered: number; requestRetries: number; duplicateRows: number } {
  if (cases === TRANSITION_DRIVER_CASES) assert.equal(cases.length, 60);
  const moduleUrl = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "index.js")).href;
  let recovered = 0;
  try {
    for (let index = 0; index < cases.length; index += 1) {
      const item = cases[index];
      const label = `${String(index + 1).padStart(2, "0")}-${item.side}-${item.name}-${item.task}`;
      const { root, manifestPath, runId } = createTransitionDriverFixture(label);
      try {
        const script = `import { runConcurrentFromManifestPath } from ${JSON.stringify(moduleUrl)}; await runConcurrentFromManifestPath(${JSON.stringify(root)}, ${JSON.stringify(manifestPath)});`;
        const child = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
          encoding: "utf8", timeout: 180_000, windowsHide: true,
          env: { ...process.env, CAIRN_BOUNDED_CONCURRENCY_REHEARSAL: "1",
            CAIRN_BOUNDED_CONCURRENCY_TEST_CRASH_AT: `${item.side}:${item.name}:${item.task}` },
        });
        assert.equal(child.status, 86, `case ${label}: ${child.stderr || child.stdout}`);
        process.env.CAIRN_BOUNDED_CONCURRENCY_REHEARSAL = "1";
        delete process.env.CAIRN_BOUNDED_CONCURRENCY_TEST_CRASH_AT;
        const result = recoverConcurrentRun(root, runId);
        recovered += 1;
        assert.equal(result.providerCalls <= 2, true, label);
        assert.deepEqual(inspectConcurrentCleanup(root), { cleanMain: true, worktreeCount: 1, taskBranches: [], statePresent: false, lockPresent: false }, label);
        const log = readFileSync(join(root, "docs/ai-work/LOG.md"), "utf8");
        for (const task of ["001", "002"]) assert.equal((log.match(new RegExp(`\\| ${task} \\|`, "g")) ?? []).length, 1, label);
        assert.equal(new Set(result.integrationOrder).size, result.integrationOrder.length, label);
        assert.deepEqual([...result.integrationOrder].sort(), result.integrationOrder, label);
      } finally {
        removeTransitionDriverFixture(root);
      }
      process.stdout.write(`TRANSITION_CASE ${index + 1}/${cases.length} ${label} PASS\n`);
    }
  } finally {
    delete process.env.CAIRN_BOUNDED_CONCURRENCY_REHEARSAL;
    delete process.env.CAIRN_BOUNDED_CONCURRENCY_TEST_CRASH_AT;
  }
  return { cases: cases.length, recovered, requestRetries: 0, duplicateRows: 0 };
}

const isMain = !!process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) process.stdout.write(`TRANSITION_DRIVER_RESULT ${JSON.stringify(runTransitionDriver())}\n`);
