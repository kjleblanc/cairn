import { _electron as electron, expect } from "@playwright/test";
import { test } from "./fixtures/isolated-profile";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

function scaffold(project: string): void {
  const core = pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
  execFileSync(process.execPath, [
    "--input-type=module", "-e",
    `import { initProject } from ${JSON.stringify(core)}; initProject(process.argv[1], { name: "Smoke", what: "w", who: "me", milestone: "see it" });`,
    project,
  ]);
}

test("Desktop opens a project on the single serial task path", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-smoke-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: { ...process.env, CAIRN_MOCK: "1", CAIRN_OPEN: project } });
  const window = await app.firstWindow();
  // A governed project boots straight into chat; the dashboard is one click away.
  const projectHome = window.getByRole("button", { name: "← Project home" });
  await expect(projectHome).toBeVisible({ timeout: 30_000 });
  await projectHome.click();
  await expect(window.getByRole("heading", { name: "Smoke" })).toBeVisible();
  await expect(window.getByText("ProjectTaskRouteRunCheckResult")).toBeVisible();
  await window.getByRole("button", { name: "Start a task" }).click();
  await expect(window.getByText("one serial task")).toBeVisible();
  await expect(window.getByRole("button", { name: "Find a route" })).toBeVisible();
  await app.close();
});

test("An explicit folder without a contract lands on a working screen, not a dead end", async () => {
  // Task 159, the boot path behind the owner's stuck-error report: CAIRN_OPEN
  // naming a folder with no rulebook used to hang on "Getting ready…" under
  // the error card. It now lands on a working screen with the card
  // dismissible on top. This file's throwaway profile already remembers the
  // first test's Smoke project, so that working screen is the picker.
  const folder = mkdtempSync(join(tmpdir(), "cairn-smoke-open-"));
  const app = await electron.launch({ args: ["."], env: { ...process.env, CAIRN_MOCK: "1", CAIRN_OPEN: folder } });
  const window = await app.firstWindow();
  const errorOverlay = window.locator(".app-error-overlay");
  await expect(errorOverlay).toContainText("That folder has no Cairn contract.", { timeout: 30_000 });
  await expect(window.getByText("Getting ready…")).toHaveCount(0);
  await expect(window.getByRole("heading", { name: "Your projects" })).toBeVisible();
  await errorOverlay.getByRole("button", { name: "Got it" }).click();
  await expect(errorOverlay).toHaveCount(0);
  await expect(window.getByRole("button", { name: "Start a new project" })).toBeVisible();
  await app.close();
});
