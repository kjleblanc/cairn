import { _electron as electron, expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

function scaffold(proj: string): void {
  const core = pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
  execFileSync(process.execPath, [
    "--input-type=module",
    "-e",
    `import { scaffoldProject } from ${JSON.stringify(core)}; scaffoldProject(process.argv[1], { name: "Parallel rehearsal", what: "synthetic", who: "test", milestone: "see two isolated tasks", timebox: "default" });`,
    proj,
  ]);
  execFileSync("git", ["init", "-b", "main"], { cwd: proj });
  execFileSync("git", ["config", "user.name", "Cairn Desktop Rehearsal"], { cwd: proj });
  execFileSync("git", ["config", "user.email", "cairn-desktop@example.invalid"], { cwd: proj });
  execFileSync("git", ["add", "--", "AGENTS.md", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md", "docs/ai-work/PILOT.md"], { cwd: proj });
  execFileSync("git", ["commit", "-m", "Synthetic desktop project"], { cwd: proj });
}

async function defineTask(win: Page, outcome: string): Promise<void> {
  await win.getByPlaceholder("The home page shows my list of books").fill(outcome);
  await win.getByRole("button", { name: "Write the brief" }).click();
  await expect(win.getByText(/the AI asks .* question 1 of 3/)).toBeVisible({ timeout: 15_000 });
  await win.getByRole("button", { name: /Skip .* let the AI use its judgment/ }).click();
  await expect(win.getByRole("button", { name: "Approve this exact brief" })).toBeVisible({ timeout: 15_000 });
}

test("the opt-in desktop keeps two isolated tasks independently navigable and integrates one at a time", async () => {
  test.setTimeout(180_000);
  const retainedRoot = mkdtempSync(join(tmpdir(), "cairn-desktop-concurrency-"));
  const proj = join(retainedRoot, "project");
  const appData = join(retainedRoot, "appdata");
  mkdirSync(proj);
  mkdirSync(appData);
  scaffold(proj);

  const app = await electron.launch({
    args: ["."],
    env: {
      ...process.env,
      APPDATA: appData,
      CAIRN_MOCK: "1",
      CAIRN_OPEN: proj,
      CAIRN_PARALLEL_DRAFT: "1",
    },
  });
  const win = await app.firstWindow();

  await expect(win.getByText("Parallel Draft — not active by default").first()).toBeVisible({ timeout: 30_000 });
  await win.getByRole("button", { name: "Start a task" }).click();
  await defineTask(win, "Alpha output appears");
  await expect(win.getByText("task 001 — the brief")).toBeVisible();
  await win.getByRole("button", { name: "← Project home" }).click();

  await win.getByRole("button", { name: "Start a task" }).click();
  await defineTask(win, "Beta output appears");
  await expect(win.getByText("task 002 — the brief")).toBeVisible();

  const deck = win.getByRole("region", { name: "Parallel Draft tasks" });
  await expect(deck.getByText("Task 001")).toBeVisible();
  await expect(deck.getByText("Task 002")).toBeVisible();
  await expect(deck.getByText("cairn/task-001")).toBeVisible();
  await expect(deck.getByText("cairn/task-002")).toBeVisible();
  await expect(deck.locator(".task-deck-path")).toHaveCount(2);

  await deck.getByRole("button", { name: /Task 001/ }).click();
  await win.getByRole("button", { name: "Approve this exact brief" }).click();
  await expect(win.getByText("task 001 — the report")).toBeVisible({ timeout: 30_000 });
  await expect(deck.getByText("Task 002")).toBeVisible();
  await deck.getByRole("button", { name: /Task 002/ }).click();
  await expect(win.getByText("task 002 — the brief")).toBeVisible();
  await deck.getByRole("button", { name: /Task 001/ }).click();

  await win.getByRole("button", { name: "Skip to the decision" }).click();
  await win.getByRole("button", { name: "Accept — it does what I wanted" }).click();
  await win.getByPlaceholder("What did you personally see?").fill("Task 001 stayed isolated");
  await win.getByRole("button", { name: "Yes", exact: true }).click();
  await win.getByRole("button", { name: "Close the task — a stone on your cairn" }).click();
  await expect(deck.getByText("Task 002")).toBeVisible();

  await expect(win.getByRole("button", { name: "Continue Task 002" })).toBeVisible({ timeout: 30_000 });
  await expect(win.getByText("Serialized integration completed.")).toBeVisible();
  await expect(deck.getByText("Task 001", { exact: true })).toHaveCount(0);
  await win.getByRole("button", { name: "Continue Task 002" }).click();
  await expect(win.getByText("task 002 — the brief")).toBeVisible();

  const log = readFileSync(join(proj, "docs", "ai-work", "LOG.md"), "utf8");
  expect((log.match(/\| 001 \|/g) ?? []).length).toBe(1);
  expect(log).not.toContain("| 002 |");
  expect(existsSync(join(proj, "demo-001.txt"))).toBe(true);
  expect(existsSync(join(proj, "demo-002.txt"))).toBe(false);

  console.log(`CAIRN_DESKTOP_REHEARSAL_ROOT=${retainedRoot}`);
  await app.close();
});
