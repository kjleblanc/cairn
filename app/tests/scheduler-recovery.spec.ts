import { _electron as electron, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

function coreModule(): string {
  return pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

test("Desktop restart reconciliation preserves an interrupted batch and retries no model session", async () => {
  test.setTimeout(120_000);
  const retainedRoot = mkdtempSync(join(tmpdir(), "cairn-task-028-desktop-recovery-"));
  const project = join(retainedRoot, "project");
  const appData = join(retainedRoot, "appdata");
  mkdirSync(project);
  mkdirSync(appData);
  const core = await import(coreModule());
  core.scaffoldProject(project, { name: "Task 028 recovery", what: "synthetic", who: "test", milestone: "show truthful recovery", timebox: "default" });
  git(project, ["init", "-b", "main"]);
  git(project, ["config", "user.name", "Cairn Task 028 Recovery"]);
  git(project, ["config", "user.email", "cairn-task-028-recovery@example.invalid"]);
  git(project, ["add", "--", "AGENTS.md", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md", "docs/ai-work/PILOT.md"]);
  git(project, ["commit", "-m", "Synthetic Task 028 recovery project"]);

  const seed = `
    const core = await import(process.argv[1]);
    const project = process.argv[2];
    process.env.CAIRN_TWO_TASK_SCHEDULER_FINAL = "1";
    const unused = { async run() { throw new Error("engine must not start"); } };
    try {
      await core.startScheduledBatch(project, ["Create one recoverable synthetic result"], () => unused, {
        onTransition(name) { if (name === "batch-reserved") throw new Error("offline crash boundary"); }
      });
    } catch (error) {
      if (!String(error).includes("offline crash boundary")) throw error;
    }
  `;
  execFileSync(process.execPath, ["--input-type=module", "-e", seed, coreModule(), project], {
    env: { ...process.env, CAIRN_TWO_TASK_SCHEDULER_FINAL: "1" },
  });

  const app = await electron.launch({
    args: ["."],
    env: { ...process.env, APPDATA: appData, CAIRN_MOCK: "1", CAIRN_OPEN: project, CAIRN_TWO_TASK_SCHEDULER_FINAL: "1" },
  });
  try {
    const win = await app.firstWindow();
    await win.getByRole("button", { name: "Open scheduler" }).click();
    await expect(win.getByTestId("scheduler-phase-001")).toHaveText("Planning");
    await win.getByRole("button", { name: "Reconcile after restart" }).click();
    await expect(win.getByTestId("scheduler-phase-001")).toHaveText("Needs attention");
    await expect(win.getByTestId("scheduler-task-001")).toContainText("INTERRUPTED_OPERATION");
    await expect(win.getByRole("region", { name: "Two-task scheduler" })).toContainText("Sessions: 0");
  } finally {
    await app.close();
  }
  console.log(`CAIRN_TASK_028_DESKTOP_RECOVERY_RETAINED_ROOT=${retainedRoot}`);
});
