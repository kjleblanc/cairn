import { _electron as electron, expect, type ElectronApplication, type Page } from "@playwright/test";
import { test } from "./fixtures/isolated-profile";
import { detachStoredConnection, restoreStoredConnection } from "./fixtures/conductor-connection";
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

// Task 160: the Checkup flow end to end. The picker's Checkup pill gathers
// deterministic signals from a project on disk and shows a report card;
// suggestion chips open the project with a pre-filled, unsent draft in the
// composer. No model call, no writes to the checked project.

function run(cwd: string, args: string[]) {
  execFileSync("git", args, { cwd, stdio: "pipe" });
}

// Electron's per-user settings folder; under the suite's isolated profile this
// resolves to the throwaway copy, never the owner's real list.
function registryFile(): string {
  if (process.env.CAIRN_TEST_USER_DATA) return join(process.env.CAIRN_TEST_USER_DATA, "projects.json");
  if (process.platform === "win32") return join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "Cairn", "projects.json");
  if (process.platform === "darwin") return join(homedir(), "Library", "Application Support", "Cairn", "projects.json");
  return join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "Cairn", "projects.json");
}

function writeProject(dir: string, name: string, contractVersion: string) {
  mkdirSync(join(dir, "docs", "ai-work", "tasks"), { recursive: true });
  // isCairnProject (core) recognises a real contract by structure: the exact
  // heading, a "Contract v<number>" string, and the project-facts labels.
  writeFileSync(
    join(dir, "AGENTS.md"),
    `# Project Contract\n\n\`\`\`text\nSTATUS: ACTIVE\nPROJECT NAME: ${name}\nWHAT WE ARE BUILDING: an e2e fixture\nWHO WILL USE IT: the suite\nCURRENT MILESTONE: fixture milestone\n\`\`\`\n\nCairn Contract ${contractVersion}\n`,
  );
  writeFileSync(join(dir, "docs", "ai-work", "PROJECT.md"), `# ${name}\n\nContract ${contractVersion}\n`);
  writeFileSync(
    join(dir, "docs", "ai-work", "LOG.md"),
    "# Log\n\n| Task | Date | Lane | Draft/Final | Outcome | Decision | One-line summary | Milestone moved? |\n|---|---|---|---|---|---|---|---|\n",
  );
  run(dir, ["init", "-b", "main"]);
  run(dir, ["config", "user.email", "e2e@cairn.local"]);
  run(dir, ["config", "user.name", "Cairn E2E"]);
  run(dir, ["add", "-A"]);
  run(dir, ["commit", "-m", "scaffold"]);
}

function addCommits(dir: string, n: number) {
  for (let i = 0; i < n; i++) {
    // Append, never overwrite: every commit must carry a real change even
    // when this helper runs twice against the same repo.
    appendFileSync(join(dir, "work.txt"), `change ${i}\n`);
    run(dir, ["add", "-A"]);
    run(dir, ["commit", "-m", `commit ${i}`]);
  }
}

let tmpRoot: string;
let messyDir: string;
let fixtureUrl = "";
let fixtureClose: () => Promise<void> = async () => {};
let registrySnapshot: Buffer | null = null;

test.beforeAll(async () => {
  const fixturePath = pathToFileURL(join(__dirname, "fixtures", "fake-conductor.mjs")).href;
  const fixture = (await import(fixturePath)) as {
    start: () => Promise<{ url: string; close: () => Promise<void> }>;
  };
  const server = await fixture.start();
  fixtureUrl = server.url;
  fixtureClose = server.close;
  detachStoredConnection();

  tmpRoot = mkdtempSync(join(tmpdir(), "cairn-checkup-"));
  messyDir = join(tmpRoot, "Messy");
  const tidyDir = join(tmpRoot, "Tidy");
  mkdirSync(messyDir, { recursive: true });
  mkdirSync(tidyDir, { recursive: true });

  // A tidy project: everything paired, everything pushed, nothing drifting.
  writeProject(tidyDir, "Tidy", "v0.6.0");
  const tidyTasks = join(tidyDir, "docs", "ai-work", "tasks");
  writeFileSync(join(tidyTasks, "001-brief.md"), "# Brief 001\n");
  writeFileSync(join(tidyTasks, "001-report.md"), "# Report 001\nDisposition: DONE\n");
  execFileSync("git", ["add", "-A"], { cwd: tidyDir });
  execFileSync("git", ["commit", "-m", "task 001"], { cwd: tidyDir });
  const tidyOrigin = join(tmpRoot, "tidy-origin.git");
  run(tmpRoot, ["init", "--bare", tidyOrigin]);
  run(tidyDir, ["remote", "add", "origin", tidyOrigin]);
  run(tidyDir, ["push", "-u", "origin", "HEAD:refs/heads/main"]);

  // A messy project: unpushed commits, stale contract citation, record gaps,
  // an in-flight task, dirty and untracked files.
  writeProject(messyDir, "Messy", "v0.6.0");
  const messyTasks = join(messyDir, "docs", "ai-work", "tasks");
  writeFileSync(join(messyTasks, "001-brief.md"), "# Brief 001\n");
  writeFileSync(join(messyTasks, "001-report.md"), "# Report 001\nDisposition: DONE\n");
  writeFileSync(join(messyTasks, "002-brief.md"), "# Brief 002\n");
  writeFileSync(join(messyTasks, "002-report.md"), "# Report 002\nDisposition: STOPPED — broke\n");
  writeFileSync(join(messyTasks, "004-brief.md"), "# Brief 004\n");
  writeFileSync(join(messyTasks, "004-report.md"), "# Report 004\nDisposition: DONE\n");
  writeFileSync(join(messyTasks, "005-brief.md"), "# Brief 005 (stale)\n");
  writeFileSync(join(messyTasks, "006-report.md"), "# Report 006\nDisposition: DONE\n");
  writeFileSync(join(messyTasks, "007-brief.md"), "# Brief 007 (in flight)\n");
  execFileSync("git", ["add", "-A"], { cwd: messyDir });
  execFileSync("git", ["commit", "-m", "task records"], { cwd: messyDir });
  // PROJECT.md drifts: it cites an older contract version than AGENTS.md carries.
  writeFileSync(join(messyDir, "docs", "ai-work", "PROJECT.md"), "# Messy\n\nContract v0.5.0\n");
  addCommits(messyDir, 2);
  const messyOrigin = join(tmpRoot, "messy-origin.git");
  run(tmpRoot, ["init", "--bare", messyOrigin]);
  run(messyDir, ["remote", "add", "origin", messyOrigin]);
  run(messyDir, ["push", "-u", "origin", "HEAD:refs/heads/main"]);
  addCommits(messyDir, 22); // 20+ unpushed commits -> risk
  writeFileSync(join(messyDir, "debug.log"), "stray\n"); // untracked
  writeFileSync(join(messyDir, "docs", "ai-work", "LOG.md"),
    "# Log\n\n| Task | Date | Lane | Draft/Final | Outcome | Decision | One-line summary | Milestone moved? |\n|---|---|---|---|---|---|---|---|\n" +
    "| 001 | 2026-07-01 | Standard | Applied | DONE | completed | Fine | NO |\n" +
    "| 002 | 2026-07-02 | Standard | Applied | STOPPED | stopped | Broke | NO |\n" +
    "| 004 | 2026-07-04 | Standard | Applied | DONE | completed | Fine | NO |\n"); // modified after commit

  // Seed the remembered-projects list on the throwaway profile.
  const file = registryFile();
  registrySnapshot = existsSync(file) ? readFileSync(file) : null;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(
    file,
    JSON.stringify({
      recent: [
        { dir: messyDir, lastOpened: "2026-07-02T00:00:00.000Z" },
        { dir: tidyDir, lastOpened: "2026-07-01T00:00:00.000Z" },
      ],
    }),
  );
});

test.afterAll(async () => {
  await fixtureClose();
  restoreStoredConnection();
  const file = registryFile();
  if (registrySnapshot === null) rmSync(file, { force: true });
  else writeFileSync(file, registrySnapshot);
  rmSync(tmpRoot, { recursive: true, force: true });
});

test("checkup reports a messy project honestly and seeds suggestions without sending", async () => {
  const env: { [key: string]: string } = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
  env.CAIRN_MOCK = "1";
  env.CAIRN_OPEN = messyDir;

  const app: ElectronApplication = await electron.launch({
    args: [join(__dirname, "..")],
    env,
  });
  const win: Page = await app.firstWindow();

  try {
    // Mock mode boots disconnected; connect the fixture brain so the chat
    // composer renders when the suggestion chip reopens the project.
    const card = win.locator(".card", { hasText: "connect cairn's brain" });
    await expect(card).toBeVisible({ timeout: 30_000 });
    await win.getByRole("button", { name: "Choose a different brain" }).click();
    await win.getByRole("button", { name: "Custom…" }).click();
    await card.locator('input[type="text"]').first().fill(fixtureUrl);
    await win.getByPlaceholder("e.g. moonshotai/kimi-k3").fill("checkup-e2e-model");
    await win.getByPlaceholder("Stored encrypted; shown never again").fill("sk-test-key");
    await card.locator('input[type="checkbox"]').check();
    await win.getByRole("button", { name: "Connect" }).click();
    await expect(card).not.toBeVisible({ timeout: 10_000 });

    await win.getByRole("button", { name: "Open project" }).click();
    const overlay = win.getByRole("dialog", { name: "Your projects" });
    const messyCard = overlay.locator(".card", { hasText: "Messy" });
    await expect(messyCard.getByRole("button", { name: "Checkup" })).toBeVisible();
    await messyCard.getByRole("button", { name: "Checkup" }).click();

    const report = win.getByRole("dialog", { name: "Checkup report for Messy" });
    await expect(report.getByText("Needs a decision")).toBeVisible();
    // Risks
    await expect(report.getByText("22 commits not pushed", { exact: true })).toBeVisible();
    await expect(report.getByText("Doc drift", { exact: true })).toBeVisible();
    await expect(report.getByText(/PROJECT\.md cites contract v0\.5\.0; the contract is v0\.6\.0/)).toBeVisible();
    // Attention
    await expect(report.getByText("Task 005 has a brief but no report")).toBeVisible();
    await expect(report.getByText("Task 007 is in flight")).toBeVisible();
    await expect(report.getByText("Task 006 has a report but no brief")).toBeVisible();
    await expect(report.getByText(/Missing records for task 003/)).toBeVisible();
    await expect(report.getByText("1 untracked file (debug.log)")).toBeVisible();
    await expect(report.getByText(/Uncommitted changes in 1 file/)).toBeVisible();
    // A stopped run is filed honestly, not held against the project.
    await expect(report.getByText("1 stopped run filed honestly")).toBeVisible();
    // Task-record trail strip: 001, 002, 004, 005, 006, 007.
    await expect(report.getByRole("img", { name: /Task record trail: .* across 6 tasks/ })).toBeVisible();
    await expect(report.locator(".checkup-cell")).toHaveCount(6);

    // Suggestion chip: opens the project with a pre-filled, unsent draft.
    await report.getByRole("button", { name: "→ Make the push decision" }).click();
    const composer = win.getByPlaceholder("Talk with Cairn");
    await expect(composer).toBeVisible();
    await expect(composer).toHaveValue(/push decision/);
    await expect(win.locator(".bubble-owner").getByText(/push decision/)).toHaveCount(0);
  } finally {
    await app.close();
  }
});
