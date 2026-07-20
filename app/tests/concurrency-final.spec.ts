import { _electron as electron, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function coreModule(): string {
  return pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
}

test("Desktop observes two bounded tasks read-only and points recovery to the CLI", async () => {
  test.setTimeout(180_000);
  const retainedRoot = mkdtempSync(join(tmpdir(), "cairn-task-024-desktop-final-"));
  const project = join(retainedRoot, "project");
  const appData = join(retainedRoot, "appdata");
  mkdirSync(project);
  mkdirSync(appData);
  const core = await import(coreModule());
  core.scaffoldProject(project, { name: "Bounded Final observation", what: "synthetic", who: "test", milestone: "observe two bounded tasks", timebox: "default" });
  for (const dir of ["content", "test"]) mkdirSync(join(project, dir), { recursive: true });
  writeFileSync(join(project, "content/welcome.txt"), "PLACEHOLDER_WELCOME\n");
  writeFileSync(join(project, "content/add-book.txt"), "PLACEHOLDER_ADD_BOOK\n");
  writeFileSync(join(project, "test/welcome.test.mjs"), "import test from 'node:test'; test('welcome',()=>{});\n");
  writeFileSync(join(project, "test/add-book.test.mjs"), "import test from 'node:test'; test('add book',()=>{});\n");
  const brief = (task: number) => `# Task ${String(task).padStart(3, "0")} brief\n\nLane: Standard\n`;
  for (const task of [1, 2]) {
    const n = String(task).padStart(3, "0");
    const briefPath = `docs/ai-work/tasks/${n}-brief.md`;
    const text = brief(task);
    const digest = createHash("sha256").update(text).digest("hex");
    writeFileSync(join(project, briefPath), text);
    writeFileSync(join(project, `docs/ai-work/tasks/${n}-approval.json`), JSON.stringify({ schemaVersion: 1, taskNumber: task, briefPath, briefSha256: digest, approvedAt: "offline-rehearsal" }, null, 2) + "\n");
  }
  git(project, ["init", "-b", "main"]);
  git(project, ["config", "user.name", "Cairn Task 024 Desktop"]);
  git(project, ["config", "user.email", "cairn-task-024-desktop@example.invalid"]);
  git(project, ["add", "--", "AGENTS.md", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md", "docs/ai-work/PILOT.md", "content/welcome.txt", "content/add-book.txt", "test/welcome.test.mjs", "test/add-book.test.mjs", "docs/ai-work/tasks/001-brief.md", "docs/ai-work/tasks/001-approval.json", "docs/ai-work/tasks/002-brief.md", "docs/ai-work/tasks/002-approval.json"]);
  git(project, ["commit", "-m", "Disposable Desktop Final fixture"]);
  const common = (task: 1 | 2) => {
    const n = String(task).padStart(3, "0");
    return {
      schemaVersion: 1 as const, taskNumber: task, briefPath: `docs/ai-work/tasks/${n}-brief.md`,
      briefSha256: createHash("sha256").update(brief(task)).digest("hex"), lane: "Standard" as const,
      recordMode: "Applied" as const, independentlyUseful: true as const, dependencies: [] as [], externalActions: [] as [],
      records: { brief: `docs/ai-work/tasks/${n}-brief.md`, approval: `docs/ai-work/tasks/${n}-approval.json`, report: `docs/ai-work/tasks/${n}-report.md`, evidence: `docs/ai-work/tasks/${n}-evidence.json` },
    };
  };
  const manifest = {
    schemaVersion: 1 as const, runId: "proof-desktop-final", mode: "offline-proof" as const, totalCostCapUsd: 0.5 as const,
    tasks: [
      { ...common(1), outcome: "Welcome copy", usefulness: "Useful alone", implementationPaths: ["content/welcome.txt"], testPaths: ["test/welcome.test.mjs"], writablePaths: ["content/welcome.txt"], checks: [{ command: "node" as const, args: ["--test", "test/welcome.test.mjs"] }], provider: { provider: "anthropic" as const, model: "claude-haiku-4-5" as const, inputSha256: "3f50f7d24b6e52247aa05eae652d6a0bed39ce8bd7ce6da42642b74ee117bfe8", maxCalls: 1 as const, maxCostUsd: 0.25 as const } },
      { ...common(2), outcome: "Add-book copy", usefulness: "Useful alone", implementationPaths: ["content/add-book.txt"], testPaths: ["test/add-book.test.mjs"], writablePaths: ["content/add-book.txt"], checks: [{ command: "node" as const, args: ["--test", "test/add-book.test.mjs"] }], provider: { provider: "anthropic" as const, model: "claude-haiku-4-5" as const, inputSha256: "2196cff705d1b7e4dff0507afc0ba808871e377aadf14da1e9a7631f2fb6bdd8", maxCalls: 1 as const, maxCostUsd: 0.25 as const } },
    ],
  };
  writeFileSync(join(project, "run-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  git(project, ["add", "--", "run-manifest.json"]);
  git(project, ["commit", "-m", "Pin closed-batch manifest"]);
  process.env.CAIRN_BOUNDED_CONCURRENCY_REHEARSAL = "1";
  const state = core.admitConcurrentFromManifestPath(project, "run-manifest.json");

  const app = await electron.launch({ args: ["."], env: { ...process.env, APPDATA: appData, CAIRN_MOCK: "1", CAIRN_OPEN: project } });
  const win = await app.firstWindow();
  const deck = win.getByRole("region", { name: "Bounded Final tasks" });
  await expect(deck).toBeVisible({ timeout: 30_000 });
  await expect(deck.getByTestId("bounded-task-001")).toContainText("call unused");
  await expect(deck.getByTestId("bounded-task-002")).toContainText("call unused");
  await expect(deck).toContainText("cairn concurrent recover --run proof-desktop-final");
  await expect(win.getByRole("button", { name: "Start a task" })).toHaveCount(0);
  await expect(win.getByRole("button", { name: /Approve|Build|Retry|Integrate/ })).toHaveCount(0);
  await app.close();

  const recovered = core.recoverConcurrentRun(project, state.runId);
  expect(recovered.tasks.map((task: { disposition: string }) => task.disposition)).toEqual(["STOPPED", "STOPPED"]);
  expect(core.inspectConcurrentCleanup(project)).toEqual({ cleanMain: true, worktreeCount: 1, taskBranches: [], statePresent: false, lockPresent: false });
  console.log(`CAIRN_TASK_024_DESKTOP_ROOT=${retainedRoot}`);
});
