import { _electron as electron, expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

function coreModule(): string {
  return pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
}

test("Desktop restart reconciliation preserves a hard-exited passive batch and retries no model session", async () => {
  test.setTimeout(120_000);
  const retainedRoot = mkdtempSync(join(tmpdir(), "cairn-task-029-desktop-recovery-"));
  const appData = join(retainedRoot, "appdata");
  mkdirSync(appData);
  const core = await import(coreModule());
  const proof = core.createDisposableSchedulerProof();

  const seed = `
    const core = await import(process.argv[1]);
    process.env.CAIRN_PASSIVE_SCHEDULER_DRAFT = "1";
    process.env.CAIRN_MOCK = "1";
    await core.startPassiveScheduledBatch(
      { root: process.argv[2], token: process.argv[3] },
      ["Create one recoverable passive note"],
      () => new core.MockEngine(),
      { onTransition(name) { if (name === "building-start:1") process.exit(73); } },
    );
  `;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", seed, coreModule(), proof.root, proof.token], {
    encoding: "utf8",
    env: { ...process.env, CAIRN_PASSIVE_SCHEDULER_DRAFT: "1", CAIRN_MOCK: "1" },
    timeout: 60_000,
  });
  expect(child.status, child.stderr).toBe(73);
  expect(core.readPassiveSchedulerState(proof.root).sessionCount).toBe(2);

  const app = await electron.launch({
    args: ["."],
    env: { ...process.env, APPDATA: appData, CAIRN_MOCK: "1", CAIRN_OPEN: proof.root, CAIRN_PASSIVE_SCHEDULER_DRAFT: "1" },
  });
  try {
    const win = await app.firstWindow();
    await win.getByRole("button", { name: "Open scheduler" }).click();
    await expect(win.getByTestId("scheduler-phase-001")).toHaveText("Building");
    await win.getByRole("button", { name: "Reconcile after restart" }).click();
    await expect(win.getByTestId("scheduler-phase-001")).toHaveText("Needs attention");
    await expect(win.getByTestId("scheduler-task-001")).toContainText("INTERRUPTED_OPERATION");
    await expect(win.getByRole("region", { name: "Two-task scheduler" })).toContainText("Sessions: 2");
    await expect(win.getByTestId("scheduler-proof-root")).toContainText(proof.root);
  } finally {
    await app.close();
  }

  expect(core.readPassiveSchedulerState(proof.root).sessionCount).toBe(2);
  expect(existsSync(core.passiveSchedulerStatePaths(proof.root).lock)).toBe(false);
  expect(core.parseLog(proof.root).filter((row: { task: string }) => row.task === "001")).toHaveLength(0);
  console.log(`CAIRN_TASK_029_DESKTOP_RECOVERY_RETAINED_ROOT=${retainedRoot}`);
  console.log(`CAIRN_TASK_029_DESKTOP_RECOVERY_PROOF=${proof.root}`);
});
