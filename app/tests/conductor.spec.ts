import { _electron as electron, expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { fakeCodexEnvironment } from "./fixtures/fake-codex-env";

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
  // The real-call lane commits its own records, which needs a git identity;
  // the mock lane commits nothing and is unaffected by this.
  execFileSync("git", ["config", "user.name", "Cairn Test"], { cwd: project });
  execFileSync("git", ["config", "user.email", "cairn-test@example.invalid"], { cwd: project });
}

function baseEnv(project: string): { [key: string]: string } {
  const env: { [key: string]: string } = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
  env.CAIRN_MOCK = "1";
  env.CAIRN_OPEN = project;
  return env;
}

// Task 6 (Phase 3): the two lanes meet here for the first time — the fixture
// brain answers chat while the fake-codex PATH shim answers the run. The mock
// adapter finishes instantly and discloses nothing, so a run that can be
// watched, stopped, or reloaded into exists ONLY here: CAIRN_MOCK=0 plus the
// shim, with the real disclosure confirmation in the way.
function codexEnv(project: string, fake: { env: NodeJS.ProcessEnv }): { [key: string]: string } {
  const env = baseEnv(project);
  for (const [k, v] of Object.entries(fake.env)) if (v !== undefined) env[k] = v;
  env.CAIRN_MOCK = "0";
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
// Task 030 made the default view one paste (key only, curated model
// preselected); the fixture's local URL isn't a curated brain, so every
// test reaches the free-text fields through "Choose a different brain" →
// "Custom…", same path an owner takes for a local Ollama URL.
async function connectToFixture(win: Page, fixtureUrl: string, model: string, apiKey = "sk-test-key"): Promise<void> {
  const card = win.locator(".card", { hasText: "connect cairn's brain" });
  await expect(card).toBeVisible({ timeout: 30_000 });
  await win.getByRole("button", { name: "Choose a different brain" }).click();
  await win.getByRole("button", { name: "Custom…" }).click();
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

// `exact` matters from Task 6 on: a running task puts a "Stop this task"
// button on screen, and role-name matching is substring by default, so a
// loose "Stop" would wait on the wrong control.
async function waitStreamDone(win: Page): Promise<void> {
  await expect(win.getByRole("button", { name: "Stop", exact: true })).not.toBeVisible({ timeout: 15_000 });
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

  // One-paste default: no base URL or model input, and the recommended
  // brain is already named on screen — nothing to choose before pasting a key.
  await expect(card.locator('input[type="text"]')).toHaveCount(0);
  await expect(card).toContainText("Kimi K2");

  // The picker lists all three curated brains plus "Custom…".
  await win.getByRole("button", { name: "Choose a different brain" }).click();
  const picker = win.locator(".card", { hasText: "choose a different brain" });
  await expect(picker).toBeVisible();
  await expect(picker).toContainText("Kimi K2");
  await expect(picker).toContainText("DeepSeek V3.1");
  await expect(picker).toContainText("GPT-5 Mini");
  await expect(picker.getByRole("button", { name: "Custom…" })).toBeVisible();
  await picker.getByRole("button", { name: "Back" }).click();

  // "Where do I get a key?" opens an in-card walkthrough, not a browser guess.
  await win.getByRole("button", { name: "Where do I get a key?" }).click();
  const guide = win.locator(".card", { hasText: "where do I get a key?" });
  await expect(guide).toBeVisible();
  await expect(guide).toContainText("Create a free account at openrouter.ai.");
  await expect(guide).toContainText("Add a few dollars of credit");
  await expect(guide.getByRole("button", { name: "Open openrouter.ai/keys" })).toBeVisible();
  await guide.getByRole("button", { name: "Back" }).click();

  // "Custom…" reveals the advanced fields — the only way to reach the
  // fixture's local URL, since it isn't one of the curated brains.
  await win.getByRole("button", { name: "Choose a different brain" }).click();
  await win.getByRole("button", { name: "Custom…" }).click();
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

// Task 5 (Phase 3) rewrote this test: dispatch is now inline. The card's
// "Send to dispatch" opens a confirmation panel inside the conversation —
// the app never navigates to the task screen and nothing is re-typed — and
// the run starts from there. The landing assertions (report, LOG row, git
// status) are the legacy test's, carried over unchanged.
test("the full loop: a proposed task with a risk chip dispatches inline and lands a LOG.md row", async () => {
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

  // The confirmation is inline: both parts of the request are on screen, the
  // conversation is still there, and the task screen never opened.
  const panel = win.locator(".dispatch-panel");
  await expect(panel).toBeVisible({ timeout: 15_000 });
  await expect(panel).toContainText("Change the page title");
  await expect(panel).toContainText("Keep the counts 74, 477, 256 exactly.");
  await expect(win.getByRole("heading", { name: "What should change?" })).toHaveCount(0);
  await expect(win.getByPlaceholder("Describe one visible outcome")).toHaveCount(0);
  await expect(win.getByPlaceholder("Talk with Cairn")).toBeVisible();
  // CAIRN_MOCK routes to the offline demo adapter, which declares no
  // disclosure seam — so this panel is outcome, details, and start only.
  await expect(panel.locator('input[type="checkbox"]')).toHaveCount(0);

  await panel.getByRole("button", { name: "Run offline demonstration" }).click();

  // The run is the main process's, keyed to this project and tagged with the
  // conversation it was dispatched from.
  await expect.poll(
    async () => (await win.evaluate((dir) => window.cairn.taskCurrent(dir), project))?.phase,
    { timeout: 30_000 },
  ).toBe("closed");
  const session = await win.evaluate((dir) => window.cairn.taskCurrent(dir), project);
  const conversations = await win.evaluate((dir) => window.cairn.conductorConversations(dir), project);
  expect(conversations.length).toBe(1);
  expect(session?.conversationId).toBe(conversations[0].id);
  await expect(win.getByRole("heading", { name: "What should change?" })).toHaveCount(0);

  // The owner's own data reached the task record verbatim, not just the card.
  const brief = readFileSync(join(project, "docs", "ai-work", "tasks", "001-brief.md"), "utf8");
  expect(brief).toContain("Details (verbatim)");
  expect(brief).toContain("Keep the counts 74, 477, 256 exactly.");
  const report = readFileSync(join(project, "docs", "ai-work", "tasks", "001-report.md"), "utf8");
  expect(report).toContain("Milestone movement: **NO**");
  const log = readFileSync(join(project, "docs", "ai-work", "LOG.md"), "utf8");
  expect(log).toMatch(/\|\s*001\s*\|/);
  const changed = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: project, encoding: "utf8" })
    .trim().split(/\r?\n/).filter(Boolean).sort();
  expect(changed).toEqual([
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

  // Regression (Task 028): the exclusion lives in the per-clone
  // .git/info/exclude, never in a file git tracks — chat must never dirty
  // the project's own worktree.
  expect(existsSync(join(project, ".gitignore"))).toBe(false);
  const exclude = readFileSync(join(project, ".git", "info", "exclude"), "utf8");
  expect(exclude.split(/\r?\n/)).toContain("/.cairn/");
  const status = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: project, encoding: "utf8" });
  expect(status).toBe("");
});

test("a task block with details shows a details section on the card", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-details-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");

  await sendChat(win, "Please detailtask this page title change.");
  await waitStreamDone(win);

  const taskCard = win.locator(".task-card");
  await expect(taskCard).toBeVisible();
  await expect(taskCard).toContainText("Change the page title");
  await expect(taskCard).toContainText("Details (sent verbatim)");
  await expect(taskCard).toContainText("74, 477, 256");
  await app.close();
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

// Task 6 (Phase 3). Walks the whole inline path in the real-call lane: chat
// proposes, the risk chip is set aside, the confirmation panel discloses the
// six facts, and the confirmed run starts. From there the run has to live in
// the conversation itself.
async function dispatchOneRealCall(win: Page): Promise<void> {
  await sendChat(win, "Change the page title");
  await waitStreamDone(win);
  const taskCard = win.locator(".task-card");
  await expect(taskCard).toBeVisible();
  await taskCard.locator(".task-chip-risk").getByRole("button", { name: "Set aside" }).click();
  await waitStreamDone(win);
  await taskCard.getByRole("button", { name: "Send to dispatch" }).click();

  const panel = win.locator(".dispatch-panel");
  await expect(panel).toBeVisible({ timeout: 20_000 });
  // The real lane discloses, so this dispatch cannot start unread — and the
  // card is derived by `taskRoute` from the same outcome and details the panel
  // shows, never retyped.
  await expect(panel).toContainText("Keep the counts 74, 477, 256 exactly.");
  await panel.getByLabel("I confirm this one real Codex Exec call.").check();
  await panel.getByRole("button", { name: "Start one real Codex Exec call" }).click();
}

test("a dispatched run lives in the conversation: the strip names its stage, the composer closes, and Stop lands the terminal state", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-strip-"));
  scaffold(project);
  const fakeCodex = fakeCodexEnvironment(project, true, "slow");
  const app = await electron.launch({ args: ["."], env: codexEnv(project, fakeCodex) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");
  await dispatchOneRealCall(win);

  // The run is visible where it was started: one of the four real stages, the
  // elapsed clock, and the two controls.
  const strip = win.locator(".run-strip");
  await expect(strip).toBeVisible({ timeout: 30_000 });
  await expect(strip.locator(".run-strip-stage")).toHaveText(/^(Route|Run|Check|Result)$/, { timeout: 30_000 });
  await expect(strip.locator(".run-strip-elapsed")).toHaveText(/^\d+:\d\d$/);
  await expect(strip.getByRole("button", { name: "Open the run screen" })).toBeVisible();

  // The composer says what is true instead of accepting a send the serial
  // gate would refuse.
  await expect(win.getByPlaceholder("Talk with Cairn")).toBeDisabled();
  await expect(win.getByText("A task is running. The composer reopens when it finishes.")).toBeVisible();

  // Only a started process incurs cost, so stop it once the real exec has
  // actually begun — same reason routing.spec waits on this marker.
  await expect.poll(() => existsSync(fakeCodex.marker), { timeout: 20_000 }).toBe(true);
  await strip.getByRole("button", { name: "Stop this task" }).click();

  // The interim result relay (until Task 8): the conversation is not left
  // silent — the strip carries the terminal state and the way to the records.
  await expect(strip).toContainText("STOPPED — CANCELLED_BY_OWNER", { timeout: 30_000 });
  await expect(strip.getByRole("button", { name: "Stop this task" })).toHaveCount(0);
  await expect(win.getByPlaceholder("Talk with Cairn")).toBeEnabled();
  await expect(win.getByText("A task is running. The composer reopens when it finishes.")).toHaveCount(0);

  const report = readFileSync(join(project, "docs", "ai-work", "tasks", "001-report.md"), "utf8");
  expect(report).toContain("CANCELLED_BY_OWNER");
  expect(existsSync(join(project, "visible.txt"))).toBe(false);

  // The link is real: it opens the run screen on this same session.
  await strip.getByRole("button", { name: "Open the run screen" }).click();
  await expect(win.getByRole("heading", { name: "Adapter stopped safely" })).toBeVisible({ timeout: 15_000 });
  await app.close();
});

test("a reload mid-run reattaches the conversation's strip and shows the finished state there", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-strip-reload-"));
  scaffold(project);
  const fakeCodex = fakeCodexEnvironment(project, true, "slow");
  const app = await electron.launch({ args: ["."], env: codexEnv(project, fakeCodex) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");
  await dispatchOneRealCall(win);

  const strip = win.locator(".run-strip");
  await expect(strip.getByRole("button", { name: "Stop this task" })).toBeVisible({ timeout: 30_000 });

  // The run belongs to the main process. A reload throws away every scrap of
  // renderer state that started it, so whatever comes back was reattached.
  await win.reload();
  await expect(win.getByRole("button", { name: "← Project home" })).toBeVisible({ timeout: 30_000 });
  // Deliberately tight, and measured from a mounted screen: the next activity
  // in this lane is roughly seven seconds away (the slow shim's finish), so a
  // strip that waited for one instead of reading the session on mount would
  // miss this window. Reattachment is a read, not a wait.
  await expect(strip.getByRole("button", { name: "Stop this task" })).toBeVisible({ timeout: 5_000 });
  await expect(strip.locator(".run-strip-stage")).toHaveText(/^(Route|Run|Check|Result)$/);
  await expect(win.getByPlaceholder("Talk with Cairn")).toBeDisabled();
  await expect(win.getByText("A task is running. The composer reopens when it finishes.")).toBeVisible();

  // The reattached strip carries the finish too, without the renderer that
  // dispatched it ever seeing the run's own answer.
  await expect(strip).toContainText("DONE —", { timeout: 30_000 });
  await expect(win.getByPlaceholder("Talk with Cairn")).toBeEnabled();
  expect(readFileSync(join(project, "visible.txt"), "utf8")).toBe("model-authored result\n");
  await app.close();
});
