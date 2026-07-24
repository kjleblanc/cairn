import { _electron as electron, expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

// Task 026: the fake body proves the whole conductor loop offline — connect,
// converse, the proposed-task card, offline dispatch, disk persistence, and
// honest failure copy — against a scripted fixture instead of a real model.

function scaffold(project: string): void {
  const core = pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
  execFileSync(process.execPath, [
    "--input-type=module", "-e",
    `import { initProject } from ${JSON.stringify(core)}; initProject(process.argv[1], { name: "Conductor", what: "w", who: "me", milestone: "see it" });`,
    project,
  ]);
}

function baseEnv(project: string): { [key: string]: string } {
  const env: { [key: string]: string } = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
  env.CAIRN_MOCK = "1";
  env.CAIRN_OPEN = project;
  return env;
}

// The provider connection lives in the app's real per-user settings folder
// (Electron resolves it through the OS; it can't be redirected from here —
// same constraint projects.spec.ts documents for the projects registry), so
// every test snapshots it and the whole file restores it byte-for-byte.
function conductorFile(): string {
  if (process.platform === "win32") return join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "Cairn", "conductor.json");
  if (process.platform === "darwin") return join(homedir(), "Library", "Application Support", "Cairn", "conductor.json");
  return join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "Cairn", "conductor.json");
}

// A governed project boots straight into chat (0.1.0), so the connect card
// is already the first thing on screen — no navigation click needed first.
async function connectToFixture(win: Page, fixtureUrl: string, model: string, apiKey = "sk-test-key"): Promise<void> {
  const card = win.locator(".card", { hasText: "connect cairn's brain" });
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.locator('input[type="text"]').first().fill(fixtureUrl);
  await win.getByPlaceholder("e.g. moonshotai/kimi-k2").fill(model);
  await win.getByPlaceholder("Stored encrypted; shown never again").fill(apiKey);
  const connectButton = win.getByRole("button", { name: "Connect" });
  await expect(connectButton).toBeDisabled(); // blocks until the checkbox is checked, even with every field filled
  await card.locator('input[type="checkbox"]').check();
  await expect(connectButton).toBeEnabled();
  await connectButton.click();
  await expect(card).not.toBeVisible({ timeout: 10_000 });
}

async function waitStreamDone(win: Page): Promise<void> {
  await expect(win.getByRole("button", { name: "Stop" })).not.toBeVisible({ timeout: 15_000 });
}

async function sendChat(win: Page, text: string): Promise<void> {
  await win.getByPlaceholder("Talk with Cairn").fill(text);
  await win.getByRole("button", { name: "Send" }).click();
}

test.describe.configure({ mode: "serial" });

let fixtureUrl = "";
let fixtureClose: () => Promise<void> = async () => {};
let savedConductorFile: Buffer | null = null;

test.beforeAll(async () => {
  const fixturePath = pathToFileURL(join(__dirname, "fixtures", "fake-conductor.mjs")).href;
  const fixture = (await import(fixturePath)) as { start: () => Promise<{ url: string; close: () => Promise<void> }> };
  const server = await fixture.start();
  fixtureUrl = server.url;
  fixtureClose = server.close;

  const file = conductorFile();
  savedConductorFile = existsSync(file) ? readFileSync(file) : null;
});

test.afterAll(async () => {
  await fixtureClose();
  const file = conductorFile();
  if (savedConductorFile !== null) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, savedConductorFile);
  } else {
    rmSync(file, { force: true });
  }
});

// Every test starts from a clean, disconnected slate regardless of what a
// previous test in this file left behind — each scenario connects for
// itself, so order between them never matters.
test.beforeEach(() => {
  rmSync(conductorFile(), { force: true });
});

test("the connect card blocks until consent, then disconnecting wipes the connection for the next launch", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-connect-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();

  const card = win.locator(".card", { hasText: "connect cairn's brain" });
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.locator('input[type="text"]').first().fill(fixtureUrl);
  await win.getByPlaceholder("e.g. moonshotai/kimi-k2").fill("fixture-model");
  await win.getByPlaceholder("Stored encrypted; shown never again").fill("sk-test-key");
  await expect(win.getByText(/What may flow/)).toBeVisible();

  const connectButton = win.getByRole("button", { name: "Connect" });
  await expect(connectButton).toBeDisabled();
  await card.locator('input[type="checkbox"]').check();
  await expect(connectButton).toBeEnabled();
  await connectButton.click();
  await expect(card).not.toBeVisible({ timeout: 10_000 });

  const host = new URL(fixtureUrl).host;
  const pill = win.locator(".body-pill-wrap button").first();
  await expect(pill).toContainText(host);
  await expect(pill).toContainText("fixture-model");

  await pill.click();
  await win.getByRole("button", { name: "Disconnect" }).click();
  await expect(win.getByText("connect cairn's brain")).toBeVisible();
  await app.close();

  const relaunched = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win2 = await relaunched.firstWindow();
  await expect(win2.getByText("connect cairn's brain")).toBeVisible({ timeout: 30_000 });
  await relaunched.close();
});

test("the full loop: a proposed task with a risk chip dispatches through TaskRun and lands a LOG.md row", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-loop-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");

  await sendChat(win, "Change the page title");
  await waitStreamDone(win);

  const taskCard = win.locator(".task-card");
  await expect(taskCard).toBeVisible();
  await expect(taskCard).toContainText("Change the page title");
  const sendToDispatch = taskCard.getByRole("button", { name: "Send to dispatch" });
  await expect(sendToDispatch).toBeDisabled();

  const riskChip = taskCard.locator(".task-chip-risk");
  await expect(riskChip).toContainText("Renaming the title may break bookmarked links.");
  await riskChip.getByRole("button", { name: "Set aside" }).click();
  await expect(win.getByText("I understand the risk you raised — set it aside and keep the task as proposed.")).toBeVisible();
  await expect(sendToDispatch).toBeEnabled();
  await waitStreamDone(win);

  await sendToDispatch.click();
  await expect(win.getByRole("heading", { name: "What should change?" })).toBeVisible();
  await expect(win.getByPlaceholder("Describe one visible outcome")).toHaveValue("Change the page title");
  await win.getByRole("button", { name: "Find a route" }).click();
  const route = win.getByRole("region", { name: "Recommended route" });
  await expect(route).toContainText("Cairn offline demonstration");
  await win.getByRole("button", { name: "Run offline demonstration" }).click();
  await expect(win.getByRole("heading", { name: "Verified offline result" })).toBeVisible({ timeout: 30_000 });
  await expect(win.getByText("Milestone movement: NO")).toBeVisible();

  const report = readFileSync(join(project, "docs", "ai-work", "tasks", "001-report.md"), "utf8");
  expect(report).toContain("Milestone movement: **NO**");
  const log = readFileSync(join(project, "docs", "ai-work", "LOG.md"), "utf8");
  expect(log).toMatch(/\|\s*001\s*\|/);
  const changed = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: project, encoding: "utf8" })
    .trim().split(/\r?\n/).filter(Boolean).sort();
  expect(changed).toEqual([
    "?? .gitignore",
    "M docs/ai-work/LOG.md",
    "?? docs/ai-work/tasks/001-brief.md",
    "?? docs/ai-work/tasks/001-report.md",
  ].sort());

  await app.close();
});

test("a conversation persists across a relaunch, and .cairn stays out of git", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-persist-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");

  await sendChat(win, "Hello, quick check-in.");
  await waitStreamDone(win);
  await expect(win.getByText("Hello, quick check-in.")).toBeVisible();
  await expect(win.getByText("Sure, got it.")).toBeVisible();
  await app.close();

  const relaunched = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win2 = await relaunched.firstWindow();
  await expect(win2.getByText("Hello, quick check-in.")).toBeVisible({ timeout: 30_000 });
  await expect(win2.getByText("Sure, got it.")).toBeVisible();
  await expect(win2.getByText("connect cairn's brain")).not.toBeVisible();
  await relaunched.close();

  const gitignore = readFileSync(join(project, ".gitignore"), "utf8");
  expect(gitignore.split(/\r?\n/)).toContain("/.cairn/");
  const status = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: project, encoding: "utf8" });
  expect(status).not.toMatch(/\.cairn/);
});

test("a malformed task block renders as plain chat text, never a card", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-garble-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");

  await sendChat(win, "garble");
  await waitStreamDone(win);

  await expect(win.getByText("Here's the plan.")).toBeVisible();
  await expect(win.locator(".task-card")).toHaveCount(0);
  const body = await win.locator("body").innerText();
  expect(body).not.toContain("cairn-task");
  await app.close();
});

test("a 401 from the provider shows only the plain-words key message", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-failkey-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();
  const apiKey = "sk-test-should-never-render-88213";
  await connectToFixture(win, fixtureUrl, "fixture-model", apiKey);

  await sendChat(win, "This should fail-key please.");
  await expect(win.getByText("The provider did not accept the key. Reconnect with a fresh key.")).toBeVisible({ timeout: 15_000 });

  const body = await win.locator("body").innerText();
  expect(body).not.toContain("401");
  expect(body).not.toContain(apiKey);
  await app.close();
});

// Addition A (review finding): navigating away mid-stream must stop the
// server-side stream, or it keeps the per-dir lock and the next send fails.
test("navigating back mid-stream releases the lock so the next send succeeds immediately", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-unmount-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");

  await sendChat(win, "Please slowstream a reply.");
  await expect(win.getByText("One moment", { exact: false })).toBeVisible({ timeout: 10_000 });

  // Chat is the home view; the dashboard stays one click away behind this
  // same back control that used to lead there directly at boot.
  await win.getByRole("button", { name: "← Project home" }).click();
  await expect(win.getByRole("heading", { name: "Conductor" })).toBeVisible();

  await win.getByRole("button", { name: "Talk with Cairn" }).click();
  await expect(win.getByText("connect cairn's brain")).not.toBeVisible();

  await sendChat(win, "Are we good now?");
  await expect(win.getByText("Cairn is already answering", { exact: false })).toHaveCount(0);
  await waitStreamDone(win);
  await expect(win.getByText("Sure, got it.")).toBeVisible();
  await app.close();
});

// Addition B (review finding): while one chip streams its reply, the other
// chip's controls must stay disabled — coverage only, no code change.
test("while one chip's reply streams, the other chip's controls stay disabled", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-busychip-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");

  await sendChat(win, "Please plan the twoconcerns page title change.");
  await waitStreamDone(win);

  const taskCard = win.locator(".task-card");
  const questionChip = taskCard.locator(".task-chip-question");
  const riskChip = taskCard.locator(".task-chip-risk");
  await expect(questionChip).toBeVisible();
  await expect(riskChip).toBeVisible();
  await expect(taskCard.getByRole("button", { name: "Send to dispatch" })).toBeDisabled();

  await questionChip.getByPlaceholder("Your answer").fill("No, a plain redirect is enough.");
  await questionChip.getByRole("button", { name: "Answer" }).click();

  await expect(riskChip.getByRole("button", { name: "Set aside" })).toBeDisabled();
  await expect(riskChip.getByText("Wait for Cairn to finish answering.")).toBeVisible();

  await waitStreamDone(win);
  await expect(riskChip.getByRole("button", { name: "Set aside" })).toBeEnabled();
  await riskChip.getByRole("button", { name: "Set aside" }).click();
  await expect(taskCard.getByRole("button", { name: "Send to dispatch" })).toBeEnabled();
  await app.close();
});
