import { _electron as electron, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

function scaffold(project: string): void {
  const core = pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
  execFileSync(process.execPath, [
    "--input-type=module", "-e",
    `import { initProject } from ${JSON.stringify(core)}; initProject(process.argv[1], { name: "Smoke", what: "w", who: "me", milestone: "see it", timebox: "default" });`,
    project,
  ]);
}

test("Desktop opens a project on the single serial task path", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-smoke-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: { ...process.env, CAIRN_MOCK: "1", CAIRN_OPEN: project } });
  const window = await app.firstWindow();
  await expect(window.getByRole("heading", { name: "Smoke" })).toBeVisible({ timeout: 30_000 });
  await expect(window.getByText("ProjectTaskRouteRunCheckResult")).toBeVisible();
  await window.getByRole("button", { name: "Start a task" }).click();
  await expect(window.getByText("one serial task")).toBeVisible();
  await expect(window.getByRole("button", { name: "Find a route" })).toBeVisible();
  await app.close();
});
