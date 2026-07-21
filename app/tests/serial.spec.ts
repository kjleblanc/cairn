import { _electron as electron, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

function scaffold(proj: string): void {
  const core = pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
  execFileSync(process.execPath, [
    "--input-type=module",
    "-e",
    `import { initProject } from ${JSON.stringify(core)}; initProject(process.argv[1], { name: "Offline path", what: "w", who: "me", milestone: "see it", timebox: "default" });`,
    proj,
  ]);
}

test("a beginner completes the offline serial path through a verified honest result", async () => {
  const proj = mkdtempSync(join(tmpdir(), "cairn-serial-ui-"));
  scaffold(proj);
  const app = await electron.launch({ args: ["."], env: { ...process.env, CAIRN_MOCK: "1", CAIRN_OPEN: proj } });
  const win = await app.firstWindow();

  await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible({ timeout: 30_000 });
  await win.getByRole("button", { name: "Start a task" }).click();
  await win.getByPlaceholder("Describe one visible outcome").fill("Create a welcome page");
  await win.getByRole("button", { name: "Find a route" }).click();

  const route = win.getByRole("region", { name: "Recommended route" });
  await expect(route).toContainText("Cairn offline demonstration");
  await expect(route.locator(".route-facts p", { hasText: "Provider" })).toContainText("none");
  await expect(route.locator(".route-facts p", { hasText: "Model" })).toContainText("none");
  await win.getByRole("button", { name: "Run offline demonstration" }).click();

  await expect(win.getByRole("heading", { name: "Verified offline result" })).toBeVisible();
  await expect(win.getByText("Routing demonstration: verified")).toBeVisible();
  await expect(win.getByText("Requested product change: not attempted")).toBeVisible();
  await expect(win.getByText("Milestone movement: NO")).toBeVisible();
  const feed = win.getByRole("log", { name: "Task activity" });
  await expect(feed).toContainText("Route");
  await expect(feed).toContainText("Run");
  await expect(feed).toContainText("Check");
  await expect(feed).toContainText("Result");

  await win.getByRole("button", { name: "Return to project" }).click();
  await expect(win.getByText(/idle .* 0 stones .* gate quiet/)).toBeVisible();

  expect(readdirSync(join(proj, "docs", "ai-work", "tasks")).sort()).toEqual(["001-brief.md", "001-report.md"]);
  const report = readFileSync(join(proj, "docs", "ai-work", "tasks", "001-report.md"), "utf8");
  expect(report).toContain("Requested product change: **not attempted**");
  expect(report).toContain("Milestone movement: **NO**");
  const changed = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: proj, encoding: "utf8" })
    .trim().split(/\r?\n/).filter(Boolean).sort();
  expect(changed).toEqual([
    "M docs/ai-work/LOG.md",
    "?? docs/ai-work/tasks/001-brief.md",
    "?? docs/ai-work/tasks/001-report.md",
  ].sort());
  await app.close();
});
