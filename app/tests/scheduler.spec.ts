import { _electron as electron, expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

function coreModule(): string {
  return pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

async function sourceProject(label: string): Promise<{ retainedRoot: string; project: string; appData: string; head: string }> {
  const retainedRoot = mkdtempSync(join(tmpdir(), `cairn-task-029-desktop-${label}-`));
  const project = join(retainedRoot, "source-project");
  const appData = join(retainedRoot, "appdata");
  mkdirSync(project);
  mkdirSync(appData);
  const core = await import(coreModule());
  core.scaffoldProject(project, { name: "Task 029 Desktop source", what: "open the passive Draft", who: "test", milestone: "see contained text results", timebox: "default" });
  git(project, ["init", "-b", "main"]);
  git(project, ["config", "user.name", "Cairn Task 029 Desktop"]);
  git(project, ["config", "user.email", "cairn-task-029-desktop@example.invalid"]);
  git(project, ["add", "--", "AGENTS.md", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md", "docs/ai-work/PILOT.md"]);
  git(project, ["commit", "-m", "Synthetic Task 029 Desktop source"]);
  return { retainedRoot, project, appData, head: git(project, ["rev-parse", "HEAD"]) };
}

function passiveEnv(appData: string, project: string): Record<string, string> {
  return { ...process.env, APPDATA: appData, CAIRN_MOCK: "1", CAIRN_OPEN: project, CAIRN_PASSIVE_SCHEDULER_DRAFT: "1" } as Record<string, string>;
}

async function displayedProof(win: Page): Promise<string> {
  const text = await win.getByTestId("scheduler-proof-root").textContent();
  return (text ?? "").replace(/^.*Retained disposable proof:\s*/, "").trim();
}

test("Desktop creates its own proof and integrates a ready passive task before its delayed peer", async () => {
  test.setTimeout(180_000);
  const { retainedRoot, project, appData, head } = await sourceProject("ready-first");
  const protectedPath = join(project, "owner-untracked.txt");
  writeFileSync(protectedPath, "owner work stays here\n");
  const app = await electron.launch({ args: ["."], env: passiveEnv(appData, project) });
  let proof = "";
  try {
    const win = await app.firstWindow();
    await win.getByRole("button", { name: "Schedule one or two tasks" }).click();
    const deck = win.getByRole("region", { name: "Two-task scheduler" });
    await expect(deck).toContainText("passive UTF-8 artifacts");
    for (const phase of ["Planning", "Building", "Waiting", "Checking", "Done", "Needs attention"]) {
      await expect(deck.getByText(phase, { exact: true }).first()).toBeVisible();
    }
    await win.getByLabel("First outcome").fill("[mock delay] Create the first passive note");
    await win.getByLabel("Second outcome (optional)").fill("Create the second passive note");
    await win.getByRole("button", { name: "Start this batch" }).click();
    await expect(win.getByTestId("scheduler-phase-002")).toHaveText("Done", { timeout: 60_000 });
    await expect(win.getByTestId("scheduler-phase-001")).toHaveText("Building");
    await expect(win.getByTestId("scheduler-phase-001")).toHaveText("Done", { timeout: 60_000 });
    await expect(win.getByTestId("scheduler-history-001")).toContainText("Planning → Waiting → Building → Checking → Done");
    await expect(win.getByTestId("scheduler-history-002")).toContainText("Planning → Waiting → Building → Checking → Done");
    await expect(deck).toContainText("most active engines: 2");
    proof = await displayedProof(win);
  } finally {
    await app.close();
  }

  expect(proof).not.toBe(project);
  expect(existsSync(join(proof, ".git", "cairn", "passive-proof-v1.json"))).toBe(true);
  expect(readFileSync(join(proof, "artifacts", "task-001", "result.md"), "utf8").replace(/\r\n/g, "\n")).toContain("[mock delay] Create the first passive note");
  expect(readFileSync(join(proof, "artifacts", "task-002", "result.md"), "utf8").replace(/\r\n/g, "\n")).toContain("Create the second passive note");
  const log = readFileSync(join(proof, "docs", "ai-work", "LOG.md"), "utf8");
  expect(log.match(/\| 001 .* Standard \| Applied \| DONE \| completed \|/g)).toHaveLength(1);
  expect(log.match(/\| 002 .* Standard \| Applied \| DONE \| completed \|/g)).toHaveLength(1);
  expect(git(proof, ["worktree", "list", "--porcelain"]).match(/^worktree /gm)).toHaveLength(1);
  expect(git(proof, ["branch", "--list", "cairn/passive-*"])).toBe("");
  expect(git(project, ["rev-parse", "HEAD"])).toBe(head);
  expect(readFileSync(protectedPath, "utf8")).toBe("owner work stays here\n");
  expect(existsSync(join(project, ".git", "cairn"))).toBe(false);
  console.log(`CAIRN_TASK_029_DESKTOP_RETAINED_ROOT=${retainedRoot}`);
  console.log(`CAIRN_TASK_029_PROOF_RETAINED_ROOT=${proof}`);
});

test("Desktop shows unsupported code as Waiting with no Building session", async () => {
  test.setTimeout(90_000);
  const fixture = await sourceProject("unsupported");
  const app = await electron.launch({ args: ["."], env: passiveEnv(fixture.appData, fixture.project) });
  try {
    const win = await app.firstWindow();
    await win.getByRole("button", { name: "Schedule one or two tasks" }).click();
    await win.getByLabel("First outcome").fill("Create a source code script");
    await win.getByRole("button", { name: "Start this batch" }).click();
    await expect(win.getByTestId("scheduler-phase-001")).toHaveText("Waiting", { timeout: 30_000 });
    await expect(win.getByTestId("scheduler-task-001")).toContainText("outside the passive Experimental Draft");
    await expect(win.getByRole("region", { name: "Two-task scheduler" })).toContainText("Sessions: 1");
  } finally {
    await app.close();
  }
  console.log(`CAIRN_TASK_029_UNSUPPORTED_RETAINED_ROOT=${fixture.retainedRoot}`);
});

test("Desktop shows a failed passive Planning engine as Needs attention", async () => {
  test.setTimeout(90_000);
  const fixture = await sourceProject("planning-failure");
  const app = await electron.launch({ args: ["."], env: passiveEnv(fixture.appData, fixture.project) });
  try {
    const win = await app.firstWindow();
    await win.getByRole("button", { name: "Schedule one or two tasks" }).click();
    await win.getByLabel("First outcome").fill("[mock planning failure] Create a passive note");
    await win.getByRole("button", { name: "Start this batch" }).click();
    await expect(win.getByTestId("scheduler-phase-001")).toHaveText("Needs attention", { timeout: 30_000 });
    await expect(win.getByTestId("scheduler-task-001")).toContainText("PLANNING_ENGINE_FAILED");
  } finally {
    await app.close();
  }
  console.log(`CAIRN_TASK_029_PLANNING_FAILURE_RETAINED_ROOT=${fixture.retainedRoot}`);
});
