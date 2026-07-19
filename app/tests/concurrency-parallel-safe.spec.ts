import { _electron as electron, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

type SeedState = {
  taskNumbers: number[];
  refusedTask?: number;
  partialPath?: string;
  reportPath?: string;
  builderOutput?: string;
};

function coreModule(): string {
  return pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
}

function scaffold(project: string, name: string): void {
  execFileSync(process.execPath, [
    "--input-type=module",
    "-e",
    `import { scaffoldProject } from ${JSON.stringify(coreModule())}; scaffoldProject(process.argv[1], { name: process.argv[2], what: "synthetic parallel-safe desktop rehearsal", who: "test", milestone: "show refusal without delaying safe work", timebox: "default" });`,
    project,
    name,
  ]);
  execFileSync("git", ["init", "-b", "main"], { cwd: project });
  execFileSync("git", ["config", "user.name", "Cairn Task 016 Desktop"], { cwd: project });
  execFileSync("git", ["config", "user.email", "cairn-task-016-desktop@example.invalid"], { cwd: project });
  execFileSync("git", ["add", "--", "AGENTS.md", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md", "docs/ai-work/PILOT.md"], { cwd: project });
  execFileSync("git", ["commit", "-m", "Synthetic Task 016 desktop project"], { cwd: project });
}

function seed(project: string, body: string): SeedState {
  const output = execFileSync(process.execPath, [
    "--input-type=module",
    "-e",
    `const core = await import(process.argv[1]);
     const { dirname, join } = await import("node:path");
     const { mkdirSync, readFileSync, writeFileSync } = await import("node:fs");
     const project = process.argv[2];
     function taskMetadata(path, options = {}) {
       return core.validateTaskMetadata({
         schemaVersion: 1,
         lane: "Standard",
         mode: "Draft",
         allowedPaths: [path],
         dependencies: [],
         checks: ['node -e "process.exit(0)"'],
         externalActions: [],
         ...options,
       });
     }
     function define(spec) {
       const task = core.reserveTaskWorktree(project);
       const briefPath = core.paths.brief(task.worktree, task.taskNumber);
       mkdirSync(dirname(briefPath), { recursive: true });
       writeFileSync(briefPath, "# Task " + String(task.taskNumber).padStart(3, "0") + " — desktop rehearsal\\n\\nLane: " + spec.lane + "\\n\\nMode: " + spec.mode + "\\n\\n" + core.metadataBlock(spec) + "\\n");
       return core.registerTaskMetadata(project, task.taskNumber, spec);
     }
     ${body}`,
    coreModule(),
    project,
  ], {
    encoding: "utf8",
    env: { ...process.env, CAIRN_PARALLEL_DRAFT: "1" },
  });
  const line = output.split(/\r?\n/).find((item) => item.startsWith("SEED_STATE="));
  if (!line) throw new Error(`Task 016 desktop seed returned no state: ${output}`);
  return JSON.parse(line.slice("SEED_STATE=".length)) as SeedState;
}

function seedSafeRefusedSafe(project: string): SeedState {
  return seed(project, `
    const first = define(taskMetadata("first-safe.txt"));
    const refused = define(taskMetadata("unsafe.txt", { lane: "High-Stakes" }));
    const second = define(taskMetadata("second-safe.txt"));
    const state = core.readCoordinatorState(project);
    if (first.phase !== "defined" || refused.phase !== "refused" || refused.blocker !== "PARALLEL_EXCLUSIVE_REFUSED" || second.phase !== "defined") {
      throw new Error("The safe/refused/safe state was not admitted correctly.");
    }
    if (state.tasks.filter((task) => task.admitted && task.phase !== "integrated").length !== 2) {
      throw new Error("The refused task consumed a safe-task slot.");
    }
    console.log("SEED_STATE=" + JSON.stringify({ taskNumbers: [first.taskNumber, second.taskNumber], refusedTask: refused.taskNumber }));
  `);
}

function seedInitialApprovalTamper(project: string): SeedState {
  return seed(project, `
    const task = define(taskMetadata("initial-output.txt"));
    core.approveBrief(project, task.taskNumber);
    const approvalPath = core.paths.approval(task.worktree, task.taskNumber);
    writeFileSync(approvalPath, readFileSync(approvalPath, "utf8") + "\\n");
    console.log("SEED_STATE=" + JSON.stringify({
      taskNumbers: [task.taskNumber],
      reportPath: core.paths.report(task.worktree, task.taskNumber),
      builderOutput: join(task.worktree, "initial-output.txt"),
    }));
  `);
}

function seedRetryApprovalTamper(project: string): SeedState {
  return seed(project, `
    const task = define(taskMetadata("retry-output.txt"));
    core.approveBrief(project, task.taskNumber);
    const partialPath = join(task.worktree, "retry-output.txt");
    const failing = { async run(spec) {
      writeFileSync(partialPath, "partial desktop bytes retained\\n");
      throw new Error("synthetic Task 016 builder failure");
    } };
    try { await core.buildTask(project, task.taskNumber, failing); }
    catch (error) { if (!/BUILDER_ENGINE_FAILED/.test(String(error))) throw error; }
    const approvalPath = core.paths.approval(task.worktree, task.taskNumber);
    writeFileSync(approvalPath, readFileSync(approvalPath, "utf8") + "\\n");
    console.log("SEED_STATE=" + JSON.stringify({
      taskNumbers: [task.taskNumber],
      partialPath,
      reportPath: core.paths.report(task.worktree, task.taskNumber),
      builderOutput: partialPath,
    }));
  `);
}

async function launch(project: string, appData: string) {
  return electron.launch({
    args: ["."],
    env: {
      ...process.env,
      APPDATA: appData,
      CAIRN_MOCK: "1",
      CAIRN_OPEN: project,
      CAIRN_PARALLEL_DRAFT: "1",
    },
  });
}

test("refused work stays visible evidence without displacing two navigable safe tasks", async () => {
  test.setTimeout(240_000);
  const retainedRoot = mkdtempSync(join(tmpdir(), "cairn-task-016-desktop-refusal-"));
  const project = join(retainedRoot, "project");
  const appData = join(retainedRoot, "appdata");
  mkdirSync(project);
  mkdirSync(appData);
  scaffold(project, "Task 016 refusal view");
  const seeded = seedSafeRefusedSafe(project);
  expect(seeded.taskNumbers).toEqual([1, 3]);
  expect(seeded.refusedTask).toBe(2);

  let app = await launch(project, appData);
  let win = await app.firstWindow();
  await expect(win.getByText(/Refused — not queued:/)).toBeVisible({ timeout: 30_000 });
  await expect(win.getByText("PARALLEL_EXCLUSIVE_REFUSED").first()).toBeVisible();
  await expect(win.getByRole("button", { name: "Continue Task 001" })).toBeVisible();
  await expect(win.getByRole("button", { name: "Continue Task 003" })).toBeVisible();

  await win.getByRole("button", { name: "Continue Task 001" }).click();
  await expect(win.getByRole("button", { name: "Approve this exact brief" })).toBeVisible();
  await win.getByRole("button", { name: "← Project home" }).click();
  await win.getByRole("button", { name: "Continue Task 003" }).click();
  await expect(win.getByRole("button", { name: "Approve this exact brief" })).toBeVisible();
  await win.getByRole("button", { name: "← Project home" }).click();

  await win.getByRole("button", { name: "View refusal for Task 002" }).click();
  await expect(win.getByText("refused — not queued", { exact: true })).toBeVisible();
  await expect(win.getByText(/does not consume one of the two safe-task slots/)).toBeVisible();
  await expect(win.getByRole("button", { name: "Approve this exact brief" })).toHaveCount(0);
  await expect(win.getByRole("button", { name: "Build it" })).toHaveCount(0);
  const deck = win.getByRole("region", { name: "Parallel Draft tasks" });
  await expect(deck.getByRole("button", { name: /Task 001/ })).toBeVisible();
  await expect(deck.getByRole("button", { name: /Task 002.*refused — not queued/ })).toBeVisible();
  await expect(deck.getByRole("button", { name: /Task 003/ })).toBeVisible();
  await win.getByRole("button", { name: "← Project home" }).click();
  await expect(win.getByText(/Refused — not queued:/)).toBeVisible();
  await app.close();

  app = await launch(project, appData);
  win = await app.firstWindow();
  await expect(win.getByText(/Refused — not queued:/)).toBeVisible({ timeout: 30_000 });
  await expect(win.getByRole("button", { name: "View refusal for Task 002" })).toBeVisible();
  await expect(win.getByRole("button", { name: "Continue Task 001" })).toBeVisible();
  await expect(win.getByRole("button", { name: "Continue Task 003" })).toBeVisible();
  await app.close();
  console.log(`CAIRN_DESKTOP_PARALLEL_SAFE_RETAINED_ROOT=${retainedRoot}`);
});

test("tampered initial and retry approvals never let the desktop mock builder write", async () => {
  test.setTimeout(240_000);
  const retainedRoot = mkdtempSync(join(tmpdir(), "cairn-task-016-desktop-tamper-"));

  const initialProject = join(retainedRoot, "initial-project");
  const initialAppData = join(retainedRoot, "initial-appdata");
  mkdirSync(initialProject);
  mkdirSync(initialAppData);
  scaffold(initialProject, "Task 016 initial approval tamper");
  const initial = seedInitialApprovalTamper(initialProject);
  let app = await launch(initialProject, initialAppData);
  let win = await app.firstWindow();
  await win.getByRole("button", { name: "Continue Task 001" }).click();
  await win.getByRole("button", { name: "Build it" }).click();
  await expect(win.getByText(/APPROVAL_CHANGED/)).toBeVisible({ timeout: 30_000 });
  expect(existsSync(initial.builderOutput!)).toBe(false);
  expect(existsSync(initial.reportPath!)).toBe(false);
  await app.close();

  const retryProject = join(retainedRoot, "retry-project");
  const retryAppData = join(retainedRoot, "retry-appdata");
  mkdirSync(retryProject);
  mkdirSync(retryAppData);
  scaffold(retryProject, "Task 016 retry approval tamper");
  const retry = seedRetryApprovalTamper(retryProject);
  expect(readFileSync(retry.partialPath!, "utf8")).toBe("partial desktop bytes retained\n");
  app = await launch(retryProject, retryAppData);
  win = await app.firstWindow();
  await win.getByRole("button", { name: "Open build recovery for Task 001" }).click();
  await win.getByRole("button", { name: "Retry build for Task 001" }).click();
  await expect(win.getByText(/APPROVAL_CHANGED/)).toBeVisible({ timeout: 30_000 });
  expect(readFileSync(retry.partialPath!, "utf8")).toBe("partial desktop bytes retained\n");
  expect(existsSync(retry.reportPath!)).toBe(false);
  await app.close();
  console.log(`CAIRN_DESKTOP_TAMPER_RETAINED_ROOT=${retainedRoot}`);
});
