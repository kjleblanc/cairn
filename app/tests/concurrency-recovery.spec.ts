import { _electron as electron, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

type SeedState = {
  taskNumber: number;
  branch: string;
  worktree: string;
  partialPath: string;
  approvalSha256?: string;
};

function coreModule(): string {
  return pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
}

function scaffold(project: string, label: string): void {
  execFileSync(process.execPath, [
    "--input-type=module",
    "-e",
    `const core = await import(process.argv[1]); core.scaffoldProject(process.argv[2], { name: process.argv[3], what: "synthetic recovery rehearsal", who: "test", milestone: "recover the same task after restart", timebox: "default" });`,
    coreModule(),
    project,
    label,
  ]);
  execFileSync("git", ["init", "-b", "main"], { cwd: project });
  execFileSync("git", ["config", "user.name", "Cairn Task 015 Desktop Recovery"], { cwd: project });
  execFileSync("git", ["config", "user.email", "cairn-task-015-desktop@example.invalid"], { cwd: project });
  execFileSync("git", ["add", "--", "AGENTS.md", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md", "docs/ai-work/PILOT.md"], { cwd: project });
  execFileSync("git", ["commit", "-m", "Synthetic Task 015 desktop recovery project"], { cwd: project });
}

function seed(project: string, body: string): SeedState {
  const output = execFileSync(process.execPath, [
    "--input-type=module",
    "-e",
    `const core = await import(process.argv[1]);
     const { dirname, join } = await import("node:path");
     const { mkdirSync, writeFileSync } = await import("node:fs");
     const project = process.argv[2];
     ${body}`,
    coreModule(),
    project,
  ], {
    encoding: "utf8",
    env: { ...process.env, CAIRN_PARALLEL_DRAFT: "1" },
  });
  const line = output.split(/\r?\n/).find((item) => item.startsWith("SEED_STATE="));
  if (!line) throw new Error(`Recovery seed returned no state: ${output}`);
  return JSON.parse(line.slice("SEED_STATE=".length)) as SeedState;
}

function seedDefinerFailure(project: string): SeedState {
  return seed(project, `
    const raw = "raw desktop definer error must not enter coordinator state";
    const engine = { async run(spec) {
      const briefPath = core.paths.brief(spec.root, spec.taskNumber);
      mkdirSync(dirname(briefPath), { recursive: true });
      writeFileSync(briefPath, "partial desktop definition retained for the owner\\n");
      throw new Error(raw);
    } };
    try { await core.defineTask(project, "recover a definition after restart", engine); }
    catch (error) { if (!/DEFINER_ENGINE_FAILED/.test(String(error))) throw error; }
    const state = core.readCoordinatorState(project);
    const task = state.tasks[0];
    if (task.phase !== "blocked" || task.blocker !== "DEFINER_ENGINE_FAILED" || JSON.stringify(state).includes(raw)) {
      throw new Error("The definer recovery state was not safely retained.");
    }
    console.log("SEED_STATE=" + JSON.stringify({
      taskNumber: task.taskNumber,
      branch: task.branch,
      worktree: task.worktree,
      partialPath: core.paths.brief(task.worktree, task.taskNumber),
    }));
  `);
}

function seedBuilderFailure(project: string): SeedState {
  return seed(project, `
    const definer = { async run(spec) {
      const briefPath = core.paths.brief(spec.root, spec.taskNumber);
      const metadata = core.metadataBlock({
        schemaVersion: 1,
        lane: "Standard",
        mode: "Draft",
        allowedPaths: ["result-001.txt"],
        dependencies: [],
        checks: ['node -e "process.exit(0)"'],
        externalActions: [],
      });
      mkdirSync(dirname(briefPath), { recursive: true });
      writeFileSync(briefPath, "# Task 001 — recoverable desktop build\\n\\nLane: Standard\\n\\nMode: Draft\\n\\n" + metadata + "\\n");
      return { text: "definition complete" };
    } };
    const defined = await core.defineTask(project, "recover a build after restart", definer);
    core.approveBrief(project, defined.taskNumber);
    const raw = "raw desktop builder error must not enter coordinator state";
    const failing = { async run(spec) {
      const partialPath = join(spec.root, "result-001.txt");
      writeFileSync(partialPath, "partial desktop build retained for retry\\n");
      throw new Error(raw);
    } };
    try { await core.buildTask(project, defined.taskNumber, failing); }
    catch (error) { if (!/BUILDER_ENGINE_FAILED/.test(String(error))) throw error; }
    const state = core.readCoordinatorState(project);
    const task = state.tasks[0];
    if (task.phase !== "blocked" || task.blocker !== "BUILDER_ENGINE_FAILED" || JSON.stringify(state).includes(raw)) {
      throw new Error("The builder recovery state was not safely retained.");
    }
    console.log("SEED_STATE=" + JSON.stringify({
      taskNumber: task.taskNumber,
      branch: task.branch,
      worktree: task.worktree,
      partialPath: join(task.worktree, "result-001.txt"),
      approvalSha256: task.approvalSha256,
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

test("definer and builder failures remain understandable and retryable after desktop restart", async () => {
  test.setTimeout(300_000);
  const retainedRoot = mkdtempSync(join(tmpdir(), "cairn-task-015-desktop-recovery-"));

  const definerProject = join(retainedRoot, "definer-project");
  const definerAppData = join(retainedRoot, "definer-appdata");
  mkdirSync(definerProject);
  mkdirSync(definerAppData);
  scaffold(definerProject, "Task 015 definer recovery");
  const definer = seedDefinerFailure(definerProject);

  let app = await launch(definerProject, definerAppData);
  let win = await app.firstWindow();
  await expect(win.getByText("Definition stopped safely.")).toBeVisible({ timeout: 30_000 });
  await expect(win.getByRole("button", { name: "Open definition recovery for Task 001" })).toBeVisible();
  await app.close();

  app = await launch(definerProject, definerAppData);
  win = await app.firstWindow();
  await win.getByRole("button", { name: "Open definition recovery for Task 001" }).click();
  await expect(win.getByText("partial desktop definition retained for the owner")).toBeVisible();
  await win.getByRole("button", { name: "Retry definition for Task 001" }).click();
  await expect(win.getByText(/the AI asks .* question 1 of 3/)).toBeVisible({ timeout: 30_000 });
  await win.getByRole("button", { name: /Skip .* let the AI use its judgment/ }).click();
  await expect(win.getByText("task 001 — the brief")).toBeVisible({ timeout: 30_000 });
  await expect(win.getByRole("button", { name: "Approve this exact brief" })).toBeVisible();
  await app.close();

  const builderProject = join(retainedRoot, "builder-project");
  const builderAppData = join(retainedRoot, "builder-appdata");
  mkdirSync(builderProject);
  mkdirSync(builderAppData);
  scaffold(builderProject, "Task 015 builder recovery");
  const builder = seedBuilderFailure(builderProject);
  expect(readFileSync(builder.partialPath, "utf8")).toBe("partial desktop build retained for retry\n");

  app = await launch(builderProject, builderAppData);
  win = await app.firstWindow();
  await expect(win.getByText("Build stopped safely.")).toBeVisible({ timeout: 30_000 });
  await expect(win.getByRole("button", { name: "Open build recovery for Task 001" })).toBeVisible();
  await app.close();

  app = await launch(builderProject, builderAppData);
  win = await app.firstWindow();
  expect(existsSync(builder.partialPath)).toBe(true);
  await win.getByRole("button", { name: "Open build recovery for Task 001" }).click();
  await expect(win.getByText("build stopped safely")).toBeVisible();
  await win.getByRole("button", { name: "Retry build for Task 001" }).click();
  await expect(win.getByText("task 001 — the report")).toBeVisible({ timeout: 30_000 });
  await expect(win.getByText("Result: result-001.txt written.")).toBeVisible();
  await app.close();

  expect(definer.taskNumber).toBe(1);
  expect(builder.taskNumber).toBe(1);
  console.log(`CAIRN_DESKTOP_RECOVERY_RETAINED_ROOT=${retainedRoot}`);
});
