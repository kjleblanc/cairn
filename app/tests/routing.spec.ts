import { _electron as electron, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

function scaffold(proj: string): void {
  const core = pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
  execFileSync(process.execPath, [
    "--input-type=module",
    "-e",
    `import { initProject } from ${JSON.stringify(core)}; initProject(process.argv[1], { name: "Routing", what: "w", who: "me", milestone: "see it", timebox: "default" });`,
    proj,
  ]);
}

test("the active renderer and IPC expose the serial route instead of legacy workflow surfaces", () => {
  const app = readFileSync(join(__dirname, "..", "src", "renderer", "App.tsx"), "utf8");
  const ipc = readFileSync(join(__dirname, "..", "src", "shared", "ipc.ts"), "utf8");
  expect(app).toContain('name: "task"');
  expect(app).not.toMatch(/Wizard|Scheduler|parallelDraft|TaskDeck/);
  expect(ipc).toMatch(/taskRoute/);
  expect(ipc).toMatch(/taskRun/);
  expect(ipc).not.toMatch(/taskDefine|taskApprove|taskBuild|taskReview|taskClose|schedulerStart/);
});

test("normal mode shows connection-required and creates no task records", async () => {
  const proj = mkdtempSync(join(tmpdir(), "cairn-routing-"));
  scaffold(proj);
  const logPath = join(proj, "docs", "ai-work", "LOG.md");
  const before = readFileSync(logPath, "utf8");
  const app = await electron.launch({ args: ["."], env: { ...process.env, CAIRN_OPEN: proj, CAIRN_MOCK: "0" } });
  const win = await app.firstWindow();
  await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible({ timeout: 30_000 });
  await win.getByRole("button", { name: "Start a task" }).click();
  await win.getByPlaceholder("Describe one visible outcome").fill("Create a welcome page");
  await win.getByRole("button", { name: "Find a route" }).click();
  await expect(win.getByRole("heading", { name: "Connect a model to continue" })).toBeVisible();
  await expect(win.getByText(/No connected adapter can run this serial task/)).toBeVisible();
  expect(readFileSync(logPath, "utf8")).toBe(before);
  await app.close();
});
