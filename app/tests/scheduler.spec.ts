import { _electron as electron, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

function coreModule(): string {
  return pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

async function syntheticProject(): Promise<{ retainedRoot: string; project: string; appData: string }> {
  const retainedRoot = mkdtempSync(join(tmpdir(), "cairn-task-028-desktop-"));
  const project = join(retainedRoot, "project");
  const appData = join(retainedRoot, "appdata");
  mkdirSync(project);
  mkdirSync(appData);
  const core = await import(coreModule());
  core.scaffoldProject(project, { name: "Task 028 Desktop", what: "synthetic scheduler", who: "test", milestone: "see two checked results", timebox: "default" });
  git(project, ["init", "-b", "main"]);
  git(project, ["config", "user.name", "Cairn Task 028 Desktop"]);
  git(project, ["config", "user.email", "cairn-task-028-desktop@example.invalid"]);
  git(project, ["add", "--", "AGENTS.md", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md", "docs/ai-work/PILOT.md"]);
  git(project, ["commit", "-m", "Synthetic Task 028 Desktop project"]);
  return { retainedRoot, project, appData };
}

test("Desktop shows the six-state scheduler and completes two disjoint mock tasks", async () => {
  test.setTimeout(180_000);
  const { retainedRoot, project, appData } = await syntheticProject();
  const app = await electron.launch({
    args: ["."],
    env: { ...process.env, APPDATA: appData, CAIRN_MOCK: "1", CAIRN_OPEN: project, CAIRN_TWO_TASK_SCHEDULER_FINAL: "1" },
  });
  try {
    const win = await app.firstWindow();
    await win.getByRole("button", { name: "Schedule one or two tasks" }).click();
    const deck = win.getByRole("region", { name: "Two-task scheduler" });
    for (const phase of ["Planning", "Building", "Waiting", "Checking", "Done", "Needs attention"]) {
      await expect(deck.getByText(phase, { exact: true }).first()).toBeVisible();
    }
    await win.getByLabel("First outcome").fill("Create the first visible disposable result");
    await win.getByLabel("Second outcome (optional)").fill("Create the second visible disposable result");
    await win.getByRole("button", { name: "Start this batch" }).dispatchEvent("click");
    await expect(win.getByTestId("scheduler-phase-001")).toHaveText("Done", { timeout: 90_000 });
    await expect(win.getByTestId("scheduler-phase-002")).toHaveText("Done", { timeout: 90_000 });
    await expect(win.getByTestId("scheduler-history-001")).toContainText("Planning → Waiting → Building → Checking → Done");
    await expect(win.getByTestId("scheduler-history-002")).toContainText("Planning → Waiting → Building → Checking → Done");
    await expect(deck).toContainText("most active engines: 2");
  } finally {
    await app.close();
  }

  expect(readFileSync(join(project, "demo-001.txt"), "utf8").replace(/\r\n/g, "\n")).toBe("hello from scheduled Task 001\n");
  expect(readFileSync(join(project, "demo-002.txt"), "utf8").replace(/\r\n/g, "\n")).toBe("hello from scheduled Task 002\n");
  const log = readFileSync(join(project, "docs", "ai-work", "LOG.md"), "utf8");
  expect(log.match(/\| 001 .* Standard \| Applied \| DONE \| completed \|/g)).toHaveLength(1);
  expect(log.match(/\| 002 .* Standard \| Applied \| DONE \| completed \|/g)).toHaveLength(1);
  expect(git(project, ["worktree", "list", "--porcelain"]).match(/^worktree /gm)).toHaveLength(1);
  expect(git(project, ["branch", "--list", "cairn/task-*"])).toBe("");
  console.log(`CAIRN_TASK_028_DESKTOP_RETAINED_ROOT=${retainedRoot}`);
});

test("Desktop turns protected admission failure into a visible Needs attention state", async () => {
  test.setTimeout(90_000);
  const { retainedRoot, project, appData } = await syntheticProject();
  execFileSync(process.execPath, ["-e", "require('node:fs').writeFileSync(process.argv[1], 'protected starting work\\n')", join(project, "untracked.txt")]);
  const app = await electron.launch({
    args: ["."],
    env: { ...process.env, APPDATA: appData, CAIRN_MOCK: "1", CAIRN_OPEN: project, CAIRN_TWO_TASK_SCHEDULER_FINAL: "1" },
  });
  try {
    const win = await app.firstWindow();
    await win.getByRole("button", { name: "Schedule one or two tasks" }).click();
    await win.getByLabel("First outcome").fill("Attempt a task without touching protected work");
    await win.getByRole("button", { name: "Start this batch" }).click();
    await expect(win.getByTestId("scheduler-needs-attention")).toContainText("Needs attention");
    await expect(win.getByTestId("scheduler-needs-attention")).toContainText(/clean|untracked|modified/i);
  } finally {
    await app.close();
  }
  expect(readFileSync(join(project, "untracked.txt"), "utf8")).toBe("protected starting work\n");
  console.log(`CAIRN_TASK_028_DESKTOP_ATTENTION_RETAINED_ROOT=${retainedRoot}`);
});

test("Desktop visibly waits for overlap and uncertainty before any unsafe builder effect", async () => {
  test.setTimeout(180_000);
  const overlap = await syntheticProject();
  let app = await electron.launch({
    args: ["."],
    env: { ...process.env, APPDATA: overlap.appData, CAIRN_MOCK: "1", CAIRN_OPEN: overlap.project, CAIRN_TWO_TASK_SCHEDULER_FINAL: "1" },
  });
  let win = await app.firstWindow();
  await win.getByRole("button", { name: "Schedule one or two tasks" }).click();
  await win.getByLabel("First outcome").fill("[mock overlap] Create the earlier shared result");
  await win.getByLabel("Second outcome (optional)").fill("[mock overlap] Reconsider the later shared result");
  await win.getByRole("button", { name: "Start this batch" }).click();
  await expect(win.getByTestId("scheduler-task-002")).toContainText(/overlap/i, { timeout: 45_000 });
  await expect(win.getByTestId("scheduler-phase-002")).toHaveText("Done", { timeout: 90_000 });
  await app.close();

  const uncertain = await syntheticProject();
  app = await electron.launch({
    args: ["."],
    env: { ...process.env, APPDATA: uncertain.appData, CAIRN_MOCK: "1", CAIRN_OPEN: uncertain.project, CAIRN_TWO_TASK_SCHEDULER_FINAL: "1" },
  });
  win = await app.firstWindow();
  await win.getByRole("button", { name: "Schedule one or two tasks" }).click();
  await win.getByLabel("First outcome").fill("[mock uncertain] Change a result whose exact path is unclear");
  await win.getByRole("button", { name: "Start this batch" }).click();
  await expect(win.getByTestId("scheduler-phase-001")).toHaveText("Waiting", { timeout: 30_000 });
  await expect(win.getByTestId("scheduler-task-001")).toContainText("could not identify one certain safe path");
  await expect(win.getByRole("region", { name: "Two-task scheduler" })).toContainText("Sessions: 1");
  await app.close();
  console.log(`CAIRN_TASK_028_DESKTOP_OVERLAP_RETAINED_ROOT=${overlap.retainedRoot}`);
  console.log(`CAIRN_TASK_028_DESKTOP_UNCERTAIN_RETAINED_ROOT=${uncertain.retainedRoot}`);
});
