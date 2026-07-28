import { _electron as electron, expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { conductorFile, detachStoredConnection, restoreStoredConnection } from "./fixtures/conductor-connection";
import { fakeCodexEnvironment } from "./fixtures/fake-codex-env";

// Task 026: the fake body proves the whole conductor loop offline — connect,
// converse, the proposed-task card, offline dispatch, disk persistence, and
// honest failure copy — against a scripted fixture instead of a real model.

function scaffold(project: string, name = "Conductor"): void {
  const core = pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
  execFileSync(process.execPath, [
    "--input-type=module", "-e",
    `import { initProject } from ${JSON.stringify(core)}; initProject(process.argv[1], { name: process.argv[2], what: "w", who: "me", milestone: "see it" });`,
    project,
    name,
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

// `exact` for the same reason as "Stop" above: role-name matching is substring
// by default, and a proposed-task card on screen puts a "Send to dispatch"
// button in the same window as the composer's "Send".
async function sendChat(win: Page, text: string): Promise<void> {
  await win.getByPlaceholder("Talk with Cairn").fill(text);
  await win.getByRole("button", { name: "Send", exact: true }).click();
}

test.describe.configure({ mode: "serial" });

let fixtureUrl = "";
let fixtureClose: () => Promise<void> = async () => {};
let setFixtureCommentaryDelay: (delayMs: number) => void = () => {};
/** The raw body of the last commentary request the fixture answered — what the
 * provider would actually have been sent (repo task 080). */
let lastCommentaryBody: () => string | null = () => null;

test.beforeAll(async () => {
  const fixturePath = pathToFileURL(join(__dirname, "fixtures", "fake-conductor.mjs")).href;
  const fixture = (await import(fixturePath)) as {
    start: () => Promise<{
      url: string;
      close: () => Promise<void>;
      lastCommentaryBody: () => string | null;
      setCommentaryDelay: (delayMs: number) => void;
    }>;
  };
  const server = await fixture.start();
  fixtureUrl = server.url;
  fixtureClose = server.close;
  lastCommentaryBody = server.lastCommentaryBody;
  setFixtureCommentaryDelay = server.setCommentaryDelay;

  detachStoredConnection();
});

test.afterAll(async () => {
  await fixtureClose();
  restoreStoredConnection();
});

// Every test starts from a clean, disconnected slate regardless of what a
// previous test in this file left behind — each scenario connects for
// itself, so order between them never matters.
test.beforeEach(() => {
  setFixtureCommentaryDelay(400);
  rmSync(conductorFile(), { force: true });
});

test("a live reply belongs to its project and reattaches after navigation", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-reattach-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");

  await sendChat(win, "slowstream");
  await expect(win.getByText(/One moment/)).toBeVisible({ timeout: 10_000 });
  const before = await win.evaluate((dir) => window.cairn.conductorCurrent(dir), project);
  expect(before?.kind).toBe("reply");
  expect(before?.conversationId).toBeTruthy();
  expect(before?.text).toContain("One moment");

  await win.getByRole("button", { name: "← Project home" }).click();
  await expect(win.getByRole("heading", { name: "Conductor" })).toBeVisible();
  const away = await win.evaluate((dir) => window.cairn.conductorCurrent(dir), project);
  expect(away?.conversationId).toBe(before?.conversationId);

  await win.getByRole("button", { name: "Talk with Cairn" }).click();
  await expect(win.getByRole("button", { name: "Stop", exact: true })).toBeVisible();
  await expect(win.getByText(/One moment/)).toBeVisible();
  await expect(win.getByText(/done thinking\./)).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => win.evaluate((dir) => window.cairn.conductorCurrent(dir), project)).toBeNull();

  await app.close();
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

// Task 8 (Phase 3), mock lane. The envelope — not the conversation model —
// posts the result of every terminal run into the conversation that dispatched
// it, and that card is a turn on disk, so a reload reads it back.
test("the envelope posts a DONE result card into the conversation, and the card survives a reload", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-card-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");

  await sendChat(win, "Change the page title");
  await waitStreamDone(win);
  const taskCard = win.locator(".task-card");
  await expect(taskCard).toBeVisible();
  await taskCard.locator(".task-chip-risk").getByRole("button", { name: "Set aside" }).click();
  await waitStreamDone(win);
  await taskCard.getByRole("button", { name: "Send to dispatch" }).click();
  const panel = win.locator(".dispatch-panel");
  await expect(panel).toBeVisible({ timeout: 15_000 });
  await panel.getByRole("button", { name: "Run offline demonstration" }).click();

  const card = win.locator(".result-card");
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card).toContainText("checked by Cairn, not written by the AI chat");
  await expect(card.locator(".result-card-disposition")).toHaveText("DONE");
  await expect(card).toContainText("Task 001");
  // What changed is Git's answer, and it is labeled as Git's answer.
  await expect(card).toContainText("Files changed (checked with Git, not taken on faith)");
  await expect(card).toContainText("docs/ai-work/LOG.md");
  // The worker's own words only ever appear under a heading that calls them claims.
  await expect(card).toContainText("What the worker says it did — Cairn hasn't checked this");
  await expect(card).toContainText("docs/ai-work/tasks/001-report.md");

  // A reload throws away every scrap of renderer state. What comes back was
  // read from the conversation on disk.
  await win.reload();
  await expect(win.getByRole("button", { name: "← Project home" })).toBeVisible({ timeout: 30_000 });
  const reloaded = win.locator(".result-card");
  await expect(reloaded).toBeVisible({ timeout: 15_000 });
  await expect(reloaded.locator(".result-card-disposition")).toHaveText("DONE");
  await expect(reloaded).toContainText("docs/ai-work/tasks/001-report.md");

  // And it is the envelope's own role in the conversation record — not a
  // Cairn reply the model could have written.
  const turns = await win.evaluate(async (dir) => {
    const list = await window.cairn.conductorConversations(dir);
    return window.cairn.conductorTurns(dir, list[list.length - 1].id);
  }, project);
  expect(turns.filter((turn) => turn.role === "envelope").length).toBe(1);
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
  await expect(taskCard).toContainText("Your details (sent word-for-word)");
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
async function dispatchOneRealCall(win: Page, beforeStart?: () => void): Promise<void> {
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
  await panel.getByLabel("I approve this one real Codex Exec call.").check();
  beforeStart?.();
  await panel.getByRole("button", { name: "Start one real Codex Exec call" }).click();
}

// Task 065: stages the readiness-changed race — routed while Codex was ready,
// gone by the time the owner confirms. The shim is overwritten IN PLACE rather
// than deleted, deliberately: it stays first on PATH and simply stops
// answering `--version`, so `detectCodexExecStatus` reports it gone. Deleting
// it would let PATH resolution fall through to a real Codex install on the
// machine running this test — the one paid call this whole lane exists to
// prevent.
function breakFakeCodex(marker: string): void {
  const bin = dirname(marker);
  if (process.platform === "win32") {
    writeFileSync(join(bin, "codex.cmd"), "@exit /b 1\r\n");
  } else {
    const executable = join(bin, "codex");
    writeFileSync(executable, "#!/bin/sh\nexit 1\n");
    chmodSync(executable, 0o755);
  }
}

test("a dispatched run lives in the conversation: the strip names its stage, the composer closes, and Stop lands the terminal state", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-strip-"));
  const otherProject = mkdtempSync(join(tmpdir(), "cairn-conductor-other-"));
  const otherName = `Other ${basename(otherProject)}`;
  scaffold(project);
  scaffold(otherProject, otherName);
  const fakeCodex = fakeCodexEnvironment(project, true, "town");
  const app = await electron.launch({ args: ["."], env: codexEnv(project, fakeCodex) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");
  await win.evaluate(async ({ active, other }) => {
    await window.cairn.projectOpen(other);
    await window.cairn.projectOpen(active);
  }, { active: project, other: otherProject });
  const town = win.getByRole("region", { name: "Conductor town square" });
  await expect(town.getByRole("button", { name: "Cairn, ready" })).toBeVisible();
  await expect(town.locator(".town-node-worker")).toHaveCount(0);
  await expect(town.locator(".town-thread-target")).toHaveCount(0);
  await town.getByRole("button", { name: "Cairn, ready" }).click();
  await expect(win.getByPlaceholder("Talk with Cairn")).toBeFocused();
  await dispatchOneRealCall(win);

  // The run is visible where it was started: one of the four real stages, the
  // elapsed clock, and the two controls.
  const strip = win.locator(".run-strip");
  await expect(strip).toBeVisible({ timeout: 30_000 });
  await expect(strip.locator(".run-strip-stage")).toHaveText(/^(Route|Run|Check|Result)$/, { timeout: 30_000 });
  await expect(strip.locator(".run-strip-elapsed")).toHaveText(/^\d+:\d\d$/);
  await expect(strip.getByRole("button", { name: "Open the run screen" })).toBeVisible();

  // The town is a projection of this exact live worker session. Native buttons
  // give Enter and Space the same selection behavior as a pointer, and empty
  // ground clears only the town detail.
  const worker = town.locator(".town-node-worker");
  await expect(worker).toHaveCount(1);
  await expect(worker).toHaveAccessibleName(/Codex Exec worker, working on Change the page title/);

  await win.locator(".rail-project-select", { hasText: otherName }).click();
  const otherTown = win.getByRole("region", { name: `${otherName} town square` });
  await expect(otherTown).toBeVisible();
  await expect(otherTown.locator(".town-node-worker")).toHaveCount(0);
  const runningProject = win.locator(".rail-project-select", { has: win.locator(".rail-activity-working") });
  await expect(runningProject).toHaveCount(1);
  await expect(runningProject).toContainText("Conductor");
  await expect(runningProject).toContainText("worker task running");
  const awaySession = await win.evaluate((dir) => window.cairn.taskCurrent(dir), project);
  expect(awaySession?.phase).toBe("running");
  await runningProject.click();
  await expect(worker).toHaveCount(1);

  const groundBox = await town.locator(".town-square-ground").boundingBox();
  const workerBox = await worker.boundingBox();
  expect(groundBox).not.toBeNull();
  expect(workerBox).not.toBeNull();
  await win.mouse.move(workerBox!.x + workerBox!.width / 2, workerBox!.y + workerBox!.height / 2);
  await win.mouse.down();
  await win.mouse.move(groundBox!.x + groundBox!.width * 0.23, groundBox!.y + groundBox!.height * 0.68, { steps: 6 });
  await win.mouse.up();
  await expect(town.getByRole("button", { name: "Reset layout" })).toBeEnabled();

  const saved = await win.evaluate((dir) => window.cairn.townLoad(dir), project);
  expect(saved.ok).toBe(true);
  if (!saved.ok) throw new Error(saved.message);
  const savedPoint = saved.value.positions["worker:codex-exec"];
  expect(savedPoint).toBeDefined();
  expect(savedPoint!.x).toBeGreaterThanOrEqual(0);
  expect(savedPoint!.x).toBeLessThanOrEqual(1);
  expect(savedPoint!.y).toBeGreaterThanOrEqual(0);
  expect(savedPoint!.y).toBeLessThanOrEqual(1);

  await win.reload();
  await expect(worker).toHaveCount(1);
  const townBox = await town.boundingBox();
  const townHeaderBox = await town.locator(".town-square-header").boundingBox();
  expect(townBox).not.toBeNull();
  expect(townHeaderBox).not.toBeNull();
  expect(townHeaderBox!.x).toBeGreaterThanOrEqual(townBox!.x);
  expect(townHeaderBox!.x + townHeaderBox!.width).toBeLessThanOrEqual(townBox!.x + townBox!.width + 1);
  await expect.poll(async () => {
    const ground = await town.locator(".town-square-ground").boundingBox();
    const villager = await worker.boundingBox();
    if (!ground || !villager) return false;
    const centerX = villager.x + villager.width / 2;
    const centerY = villager.y + villager.height / 2;
    return Math.abs(centerX - (ground.x + ground.width * savedPoint!.x)) < 5
      && Math.abs(centerY - (ground.y + ground.height * savedPoint!.y)) < 5;
  }).toBe(true);

  await win.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => worker.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
  await town.getByRole("button", { name: "Reset layout" }).click();
  await expect.poll(async () => {
    const state = await win.evaluate((dir) => window.cairn.townLoad(dir), project);
    return state.ok ? Object.keys(state.value.positions).length : -1;
  }).toBe(0);

  await worker.focus();
  await win.keyboard.press("Enter");
  const workerDetail = town.getByRole("complementary", { name: "Codex Exec worker details" });
  await expect(workerDetail).toContainText("Change the page title");
  await expect(workerDetail).toContainText("codex-exec");

  const thread = town.locator(".town-thread-target");
  await expect(thread).toHaveCount(1);
  await thread.focus();
  await win.keyboard.press("Space");
  await expect(town.getByRole("complementary", { name: "Task thread details" })).toContainText("Change the page title");
  await town.locator(".town-square-ground").click({ position: { x: 6, y: 6 } });
  await expect(town.locator(".town-detail")).toHaveCount(0);

  // Task 065: mark the live region's DOM node. A live region announces a
  // content change reliably; a region that appears already holding its message
  // does not. The mark is an attribute React never writes, so if the terminal
  // state replaced the node instead of changing its text, it would be gone.
  await win.evaluate(() => {
    const state = document.querySelector(".run-strip-state");
    if (state instanceof HTMLElement) state.dataset.liveRegionProbe = "same-node";
  });
  await expect(strip.locator(".run-strip-state")).toHaveAttribute("role", "status");

  // The composer says what is true instead of accepting a send the serial
  // gate would refuse.
  await expect(win.getByPlaceholder("Talk with Cairn")).toBeDisabled();
  await expect(win.getByText("A task is running. You can type again when it finishes.")).toBeVisible();

  // Only a started process incurs cost, so stop it once the real exec has
  // actually begun — same reason routing.spec waits on this marker.
  await expect.poll(() => existsSync(fakeCodex.marker), { timeout: 20_000 }).toBe(true);
  await strip.getByRole("button", { name: "Stop this task" }).click();

  // The interim result relay (until Task 8): the conversation is not left
  // silent — the strip carries the terminal state and the way to the records.
  await expect(strip).toContainText("STOPPED — CANCELLED_BY_OWNER", { timeout: 30_000 });
  // The terminal line arrived as a change INSIDE the live region marked above,
  // not as a new region carrying a message no one hears.
  await expect(strip.locator(".run-strip-state")).toHaveAttribute("data-live-region-probe", "same-node");
  await expect(strip.locator(".run-strip-terminal")).toContainText("CANCELLED_BY_OWNER");
  await expect(strip.getByRole("button", { name: "Stop this task" })).toHaveCount(0);
  await expect(win.getByPlaceholder("Talk with Cairn")).toBeEnabled();
  await expect(win.getByText("A task is running. You can type again when it finishes.")).toHaveCount(0);
  await expect(town.locator(".town-node-worker")).toHaveCount(0, { timeout: 15_000 });
  await expect(town.locator(".town-thread-target")).toHaveCount(0);

  const report = readFileSync(join(project, "docs", "ai-work", "tasks", "001-report.md"), "utf8");
  expect(report).toContain("CANCELLED_BY_OWNER");
  expect(existsSync(join(project, "visible.txt"))).toBe(false);

  // The link is real: it opens the run screen on this same session.
  await strip.getByRole("button", { name: "Open the run screen" }).click();
  await expect(win.getByRole("heading", { name: "Adapter stopped safely" })).toBeVisible({ timeout: 15_000 });
  await app.close();
});

// Task 8 (Phase 3), fake-codex lane. A stopped run is the case a dishonest
// card would be worst: the worker started, the owner stopped it, and nothing
// it intended was verified. The card must say exactly that.
test("a stopped run posts an honest STOPPED card that names the stop code and claims no product change", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-card-stopped-"));
  scaffold(project);
  const fakeCodex = fakeCodexEnvironment(project, true, "slow");
  const app = await electron.launch({ args: ["."], env: codexEnv(project, fakeCodex) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");
  await dispatchOneRealCall(win);

  const strip = win.locator(".run-strip");
  await expect(strip).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => existsSync(fakeCodex.marker), { timeout: 20_000 }).toBe(true);
  await strip.getByRole("button", { name: "Stop this task" }).click();

  const card = win.locator(".result-card");
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card.locator(".result-card-disposition")).toHaveText("STOPPED");
  await expect(card).toContainText("CANCELLED_BY_OWNER");
  await expect(card).toContainText("Task 001");
  await expect(card).toContainText("Saved snapshot (commit): none — when a task stops, Cairn keeps the evidence for you but never saves it into your project's history");
  await expect(card).toContainText("What the worker says it did — Cairn hasn't checked this");
  await expect(card).toContainText("docs/ai-work/tasks/001-report.md");
  // The card carries no DONE anywhere, and the product change really did not land.
  await expect(card).not.toContainText("DONE");
  expect(existsSync(join(project, "visible.txt"))).toBe(false);

  // The card arrives from the SETTLED run promise, so by the time it is on
  // screen the send gate is already open — Task 9's commentary depends on that
  // ordering being real.
  await expect(win.getByPlaceholder("Talk with Cairn")).toBeEnabled();
  await app.close();
});

// Task 069 (review fix). Both card tests above run against a close where
// `composed.claims` is null — the offline demo parses none, and a cancelled run
// never gets a claims fence — so they only ever exercised the no-claims
// fallback. This is the case the whole labeling guarantee exists for: real
// worker claims on screen, and they must sit INSIDE the claims container,
// under the heading that calls them claims.
test("a worker's claims render only inside the card's claims block, never as a verified fact", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-card-claims-"));
  scaffold(project);
  const fakeCodex = fakeCodexEnvironment(project, true, "success");
  const app = await electron.launch({ args: ["."], env: codexEnv(project, fakeCodex) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");
  await dispatchOneRealCall(win);

  const card = win.locator(".result-card");
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card.locator(".result-card-disposition")).toHaveText("DONE");

  // The worker's own sentence and its milestone claim are on screen, and both
  // are inside the labeled claims container — not in the verified fact list.
  const claims = card.locator(".result-card-claims");
  await expect(claims).toContainText("What the worker says it did — Cairn hasn't checked this");
  await expect(claims).toContainText("Added the visible result.");
  await expect(claims).toContainText("The worker says the milestone moved: YES");
  await expect(card.locator(".result-card-facts")).not.toContainText("Added the visible result.");

  // And the verified side is Git's, in the same card: the file the worker
  // actually created, listed under the from-Git label.
  await expect(card.locator(".result-card-facts")).toContainText("Files changed (checked with Git, not taken on faith)");
  await expect(card.locator(".result-card-files")).toContainText("visible.txt");
  expect(readFileSync(join(project, "visible.txt"), "utf8")).toBe("model-authored result\n");
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
  await expect(win.getByText("A task is running. You can type again when it finishes.")).toBeVisible();

  // The reattached strip carries the finish too, without the renderer that
  // dispatched it ever seeing the run's own answer.
  await expect(strip).toContainText("DONE —", { timeout: 30_000 });
  await expect(win.getByPlaceholder("Talk with Cairn")).toBeEnabled();
  expect(readFileSync(join(project, "visible.txt"), "utf8")).toBe("model-authored result\n");
  await app.close();
});

// Task 065 (review fix): the model goes away between the route and the
// confirmed start. Two different closes come out of that race, and neither may
// claim records that were never written — the run ends before a task number,
// a brief, or a log row exists (core/src/serial.ts:841).
test("a run that closes connection-required says so without inventing records", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-strip-gone-"));
  scaffold(project);
  const fakeCodex = fakeCodexEnvironment(project, true, "slow");
  const app = await electron.launch({ args: ["."], env: codexEnv(project, fakeCodex) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");
  await dispatchOneRealCall(win, () => breakFakeCodex(fakeCodex.marker));

  // The dispatched path names its adapter, and core throws
  // ROUTE_OVERRIDE_UNAVAILABLE when a named adapter is no longer connected —
  // so main refuses before any run session survives, and there is nothing for
  // a strip to reattach to. The refusal lands on the panel that asked for it.
  await expect(win.locator(".dispatch-panel .dispatch-error")).toBeVisible({ timeout: 30_000 });
  await expect(win.locator(".run-strip")).toHaveCount(0);

  // The other close: no named adapter, so core returns connection-required
  // instead of throwing, and the session stays closed-but-present for chat to
  // reattach to. THIS is the one the strip has to render honestly.
  const closed = await win.evaluate((dir) => window.cairn.taskRun({
    dir, outcome: "Add one visible result", details: "", realCallConfirmed: false, conversationId: null,
  }), project);
  expect(closed.ok).toBe(true);
  if (closed.ok) expect(closed.value.status).toBe("connection-required");

  const strip = win.locator(".run-strip");
  await expect(strip).toBeVisible({ timeout: 30_000 });
  await expect(strip).toContainText("No task was started, nothing was saved, and no AI was called.", { timeout: 30_000 });
  await expect(strip).not.toContainText("docs/ai-work");

  // And the claim is true on disk: no process, no records, no row.
  expect(existsSync(fakeCodex.marker)).toBe(false);
  expect(existsSync(join(project, "docs", "ai-work", "tasks", "001-brief.md"))).toBe(false);
  expect(existsSync(join(project, "docs", "ai-work", "tasks", "001-report.md"))).toBe(false);
  expect(readFileSync(join(project, "docs", "ai-work", "LOG.md"), "utf8")).not.toMatch(/\|\s*001\s*\|/);

  // Nothing is running, so the composer never closed.
  await expect(win.getByPlaceholder("Talk with Cairn")).toBeEnabled();
  await expect(win.getByRole("button", { name: "Stop this task" })).toHaveCount(0);
  await app.close();
});

// Task 9 (Phase 3), mock lane. The card is not the last word: once it is
// posted, the conductor adds one short comment on it in its own voice. The
// comment is a paid call the ENVELOPE started, so it is arranged to be purely
// additive — the card is already written and already on screen before it
// begins, and nothing it says can change what the card says.
test("the conductor comments on the card the envelope just posted, and the comment is an ordinary cairn turn", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-comment-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");

  await sendChat(win, "Change the page title");
  await waitStreamDone(win);
  const taskCard = win.locator(".task-card");
  await expect(taskCard).toBeVisible();
  await taskCard.locator(".task-chip-risk").getByRole("button", { name: "Set aside" }).click();
  await waitStreamDone(win);
  await taskCard.getByRole("button", { name: "Send to dispatch" }).click();
  const panel = win.locator(".dispatch-panel");
  await expect(panel).toBeVisible({ timeout: 15_000 });
  await panel.getByRole("button", { name: "Run offline demonstration" }).click();

  const card = win.locator(".result-card");
  await expect(card).toBeVisible({ timeout: 30_000 });

  // The comment FOLLOWS the card, and the sibling combinator is the whole
  // assertion: the two replies that came before the dispatch — the proposal
  // and the set-aside acknowledgement — can never satisfy it.
  const comment = win.locator(".chat-messages .result-card ~ .bubble-cairn");
  await expect(comment).toHaveCount(1, { timeout: 30_000 });
  await expect(comment).toContainText("The card says this task finished DONE");
  // The card is untouched by it, and nothing was surfaced as a failure.
  await expect(card.locator(".result-card-disposition")).toHaveText("DONE");
  await expect(win.locator(".bubble-system")).toHaveCount(0);

  // On disk it is an ordinary cairn turn, written after the envelope's, and it
  // carries the usage the provider reported — a paid turn accounted for like
  // every other paid turn.
  const turns = await win.evaluate(async (dir) => {
    const list = await window.cairn.conductorConversations(dir);
    return window.cairn.conductorTurns(dir, list[list.length - 1].id);
  }, project);
  expect(turns.at(-2)?.role).toBe("envelope");
  const last = turns.at(-1);
  expect(last?.role).toBe("cairn");
  if (last?.role === "cairn") {
    expect(last.text).toContain("The card says this task finished DONE");
    expect(last.tokens).toBe(29);
    expect(last.costUsd).toBe(0.00002);
  }

  // Repo task 080. Everything above proves a comment was ASKED FOR and came
  // back. None of it proves the model was shown the card: the fixture answers
  // on the envelope's instruction, which is a Cairn constant, so a `service.ts`
  // that dropped every envelope turn from the prompt would satisfy every
  // assertion so far. So read the body the provider really received.
  const body = lastCommentaryBody();
  expect(body).not.toBeNull();
  const sent = (JSON.parse(body ?? "{}") as { messages?: Array<{ content?: string }> }).messages ?? [];
  const prompt = sent.map((message) => message.content ?? "").join("\n");
  // The label that says who verified it, and a fact only the card carries.
  expect(prompt).toContain("Envelope result card (verified by Cairn's runtime, not by the conversation model)");
  expect(prompt).toContain('"disposition":"DONE"');
  expect(prompt).toContain('"taskNumber":1');
  await app.close();
});

// Task 071 (review fix on 070), mock lane. Task 9 opened a window that never
// existed before: while the envelope's comment streams, main holds the
// project's one stream lock, but the renderer never started a stream, so the
// composer stays open and invites a message main will refuse. Two things must
// hold in that window — the transcript must never keep a message the main
// process refused, and the owner must never be told to stop something with no
// Stop control on screen.
test("a message sent while the comment streams is refused, leaves no phantom turn, and is not lost", async () => {
  setFixtureCommentaryDelay(3_000);
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-comment-busy-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");

  await sendChat(win, "Change the page title");
  await waitStreamDone(win);
  const taskCard = win.locator(".task-card");
  await expect(taskCard).toBeVisible();
  await taskCard.locator(".task-chip-risk").getByRole("button", { name: "Set aside" }).click();
  await waitStreamDone(win);
  await taskCard.getByRole("button", { name: "Send to dispatch" }).click();
  const panel = win.locator(".dispatch-panel");
  await expect(panel).toBeVisible({ timeout: 15_000 });
  await panel.getByRole("button", { name: "Run offline demonstration" }).click();

  // The card and the commentary call leave main in the same synchronous block,
  // so the lock is already held by the time this card is painted.
  const card = win.locator(".result-card");
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(win.getByPlaceholder("Talk with Cairn")).toBeEnabled();

  await sendChat(win, "Is that everything?");
  const refusal = win.locator(".bubble-system");
  await expect(refusal).toBeVisible({ timeout: 10_000 });

  // The message never reached the conversation — main refused before persisting
  // anything — so it must not sit in the transcript looking sent. A reload would
  // have made it vanish, which is the same thing as it never having been true.
  await expect(win.locator(".bubble-owner", { hasText: "Is that everything?" })).toHaveCount(0);

  // And the refusal says what is actually happening, without pointing at a Stop
  // control that only ever appears for a reply the owner started.
  await expect(refusal).toContainText("short comment");
  await expect(refusal).not.toContainText("stop it first");
  await expect(win.getByRole("button", { name: "Stop", exact: true })).toHaveCount(0);

  // Nothing was lost either: the comment lands, and the message goes through.
  await expect(win.locator(".chat-messages .result-card ~ .bubble-cairn")).toHaveCount(1, { timeout: 30_000 });
  await refusal.getByRole("button", { name: "Try again" }).click();
  await waitStreamDone(win);
  await expect(win.locator(".bubble-owner", { hasText: "Is that everything?" })).toHaveCount(1);
  await expect(win.locator(".bubble-system")).toHaveCount(0);

  // On disk, exactly once — the refused send left no trace there either.
  const turns = await win.evaluate(async (dir) => {
    const list = await window.cairn.conductorConversations(dir);
    return window.cairn.conductorTurns(dir, list[list.length - 1].id);
  }, project);
  expect(turns.filter((turn) => turn.role === "owner" && turn.text === "Is that everything?").length).toBe(1);
  await app.close();
});

// Task 9 (Phase 3). The case the connection guard exists for: the owner
// disconnects while the task is still running. The run settles anyway and the
// card lands on disk regardless — but there is no provider to call, and an
// envelope-initiated PAID call must never be attempted without one. The card
// stands alone, and the missing comment is not an error the owner has to read.
//
// The brief names the mock lane. The offline demo finishes in well under a
// second, which would make "disconnect while the run finishes" a race against
// the click; the fake-codex slow lane makes the same choreography
// deterministic — the marker proves the exec really started, and the finish is
// eight seconds further on.
test("a card that lands while the owner is disconnected stands alone: no comment, and no error", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-comment-offline-"));
  scaffold(project);
  const fakeCodex = fakeCodexEnvironment(project, true, "slow");
  const app = await electron.launch({ args: ["."], env: codexEnv(project, fakeCodex) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");
  await dispatchOneRealCall(win);

  const strip = win.locator(".run-strip");
  await expect(strip).toBeVisible({ timeout: 30_000 });
  const conversationId = (await win.evaluate((dir) => window.cairn.conductorConversations(dir), project))[0].id;
  await expect.poll(() => existsSync(fakeCodex.marker), { timeout: 20_000 }).toBe(true);

  // Disconnect with the run still going. The pane swaps to the connect card —
  // expected — and the run itself belongs to main, so it carries on.
  await win.locator(".body-pill-wrap button").first().click();
  await win.getByRole("button", { name: "Disconnect" }).click();
  await expect(win.getByText("connect cairn's brain")).toBeVisible();

  // The run settles and the envelope writes its card, disconnected or not.
  await expect.poll(
    async () => (await win.evaluate(
      (args) => window.cairn.conductorTurns(args.dir, args.id),
      { dir: project, id: conversationId },
    )).at(-1)?.role,
    { timeout: 60_000 },
  ).toBe("envelope");

  // Reconnect and reopen the conversation: the card is there, and nothing
  // followed it.
  await connectToFixture(win, fixtureUrl, "fixture-model");
  const card = win.locator(".result-card");
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card.locator(".result-card-disposition")).toHaveText("DONE");
  await expect(win.locator(".chat-messages .result-card ~ .bubble-cairn")).toHaveCount(0);
  await expect(win.locator(".bubble-system")).toHaveCount(0);

  // And it stays alone. One full round trip through the same fixture — the
  // owner asks, Cairn answers — proves the provider was reachable the whole
  // time, and gives a comment that should never have started every chance to
  // land. Waiting on a real exchange is what makes this a proof rather than a
  // snapshot taken a moment too early.
  await sendChat(win, "Hello, quick check-in.");
  await waitStreamDone(win);
  // Exactly one Cairn turn now follows the card: the answer to the question
  // just asked. Nothing was refused as "already answering", and nothing was
  // surfaced as an error.
  await expect(win.locator(".chat-messages .result-card ~ .bubble-cairn")).toHaveCount(1);
  await expect(win.locator(".bubble-system")).toHaveCount(0);

  // The turn that follows the card is the owner's own question, and the only
  // Cairn turn after it is the answer to that question.
  const turns = await win.evaluate(
    (args) => window.cairn.conductorTurns(args.dir, args.id),
    { dir: project, id: conversationId },
  );
  const cardIndex = turns.findIndex((turn) => turn.role === "envelope");
  expect(cardIndex).toBeGreaterThan(-1);
  expect(turns.slice(cardIndex + 1).map((turn) => turn.role)).toEqual(["owner", "cairn"]);
  await app.close();
});

// Task 11 (Phase 3): the push chip and the contract's pause.
//
// The fixture is the one the plan's review corrected. A CAIRN_MOCK DONE run
// commits NOTHING — `task:run` never passes `commitRecords` on that lane — so
// a project whose upstream already holds the scaffold is ahead 0 after a DONE
// run and the chip correctly never appears. Setup therefore pushes the
// scaffold to a bare `file://` upstream and then makes exactly ONE extra local
// commit that is never pushed. Ahead is then exactly 1, whichever lane runs,
// and the chip's count must read in the singular.
function pushFixture(project: string): { url: string; branch: string; subject: string; upstream: string } {
  const upstream = mkdtempSync(join(tmpdir(), "cairn-push-upstream-"));
  execFileSync("git", ["init", "-q", "--bare", "."], { cwd: upstream });
  const url = pathToFileURL(upstream).href;
  const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: project, encoding: "utf8" }).trim();
  execFileSync("git", ["remote", "add", "origin", url], { cwd: project });
  execFileSync("git", ["push", "-q", "-u", "origin", "HEAD"], { cwd: project });
  const subject = "Add the owner's own local note";
  writeFileSync(join(project, "notes.txt"), "a local note\n");
  execFileSync("git", ["add", "notes.txt"], { cwd: project });
  execFileSync("git", ["commit", "-q", "-m", subject], { cwd: project });
  return { url, branch, subject, upstream };
}

/** What git itself says is waiting, read straight from the project. The tests
 * below never trust the screen for this: the whole point of the two-step is
 * that nothing leaves the machine until the second press. */
function aheadCount(project: string): string {
  return execFileSync("git", ["rev-list", "--count", "@{u}..HEAD"], { cwd: project, encoding: "utf8" }).trim();
}

/** Puts a commit on the upstream that the project does not have, through a
 * separate clone, so the one push Cairn runs is refused. The project's own
 * remote-tracking ref is never fetched, so its chip goes on counting the one
 * local commit honestly. */
function advanceUpstream(upstream: string): void {
  const other = mkdtempSync(join(tmpdir(), "cairn-push-other-"));
  execFileSync("git", ["clone", "-q", upstream, "."], { cwd: other });
  execFileSync("git", ["config", "user.name", "Cairn Test"], { cwd: other });
  execFileSync("git", ["config", "user.email", "cairn-test@example.invalid"], { cwd: other });
  execFileSync("git", ["commit", "-q", "--allow-empty", "-m", "Someone else's commit"], { cwd: other });
  execFileSync("git", ["push", "-q"], { cwd: other });
}

test("a DONE card offers the push chip, and the chip's press opens the contract's pause instead of pushing", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-push-"));
  scaffold(project);
  const fixture = pushFixture(project);
  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");

  await sendChat(win, "Change the page title");
  await waitStreamDone(win);
  const taskCard = win.locator(".task-card");
  await expect(taskCard).toBeVisible();
  await taskCard.locator(".task-chip-risk").getByRole("button", { name: "Set aside" }).click();
  await waitStreamDone(win);
  await taskCard.getByRole("button", { name: "Send to dispatch" }).click();
  const panel = win.locator(".dispatch-panel");
  await expect(panel).toBeVisible({ timeout: 15_000 });
  await panel.getByRole("button", { name: "Run offline demonstration" }).click();

  const card = win.locator(".result-card");
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card.locator(".result-card-disposition")).toHaveText("DONE");

  // The nudge, with the real count — and it counts in the singular, because
  // exactly one commit is waiting.
  const chip = win.locator(".push-chip");
  await expect(chip).toBeVisible({ timeout: 15_000 });
  const chipButton = chip.getByRole("button", { name: "This project is 1 commit ahead of origin. Push?", exact: true });
  await expect(chipButton).toBeVisible();
  await expect(chip).not.toContainText("1 commits");

  // Mark the live region's DOM node now, while the flow is still only a chip.
  // The mark is an attribute React never writes, so if the outcome later
  // arrived in a region that had just been mounted — the case a screen reader
  // announces least reliably — it would be gone. Same idiom, and the same
  // reason, as the run strip's probe (repo task 065).
  await win.evaluate(() => {
    const region = document.querySelector(".push-outcome");
    if (region instanceof HTMLElement) region.dataset.liveRegionProbe = "same-node";
  });
  await expect(win.locator(".push-outcome")).toHaveAttribute("role", "status");

  // Pressing the chip does NOT push. It opens the pause the contract requires
  // immediately before a write to an external service: the exact target, the
  // exact effect, and the recovery plan.
  await chipButton.click();
  const pause = win.locator(".push-confirm");
  await expect(pause).toBeVisible({ timeout: 15_000 });
  // The press moved focus INTO the pause. Without this, the button that was
  // focused has just left the DOM and a keyboard owner would have to tab from
  // the top of the document to reach Push or Not now.
  await expect(pause).toBeFocused();
  await expect(pause).toContainText(`origin — ${fixture.url}`);
  await expect(pause).toContainText(fixture.branch);
  await expect(pause).toContainText(fixture.subject);
  // The count leads the effect, so an empty-message commit missing from the
  // subject list can never make the disclosure understate what publishes.
  await expect(pause).toContainText("this push publishes 1 commit");
  await expect(pause).toContainText("Pushing publishes these saved snapshots. If your project is public, anyone can see them.");
  await expect(pause).toContainText("You can undo a pushed snapshot with a new one, but the publishing itself can't be taken back.");
  // Nothing has left the machine on the first press.
  expect(aheadCount(project)).toBe("1");

  // Declining leaves everything untouched, and the nudge is still true.
  await pause.getByRole("button", { name: "Not now" }).click();
  await expect(pause).toHaveCount(0);
  await expect(chipButton).toBeVisible();
  expect(aheadCount(project)).toBe("1");

  // The press on the confirmation is the owner's approval of that exact
  // action, and it is the only press that writes.
  await chipButton.click();
  await expect(pause).toBeVisible({ timeout: 15_000 });
  await pause.getByRole("button", { name: "Push", exact: true }).click();

  const outcome = win.locator(".push-outcome");
  await expect(outcome).toContainText(`Pushed ${fixture.branch} to`, { timeout: 30_000 });
  // The panel closes behind the settled outcome.
  //
  // The in-progress line was moved into this same region (repo task 076) so
  // the whole sequence is announced, and NO assertion here carries that: a
  // file:// push settles in milliseconds, so waiting for the transient text
  // would be a race, and the line below is taken after settle, when the panel
  // is gone by construction and would have passed before the move as well.
  // What proves the move is the code — `pushAnnouncement` is the region's only
  // producer, and the panel's JSX no longer contains the string at all (repo
  // task 077's review correction).
  await expect(win.locator(".push-confirm")).toHaveCount(0);
  // And it arrived as a change inside the region marked above, not as a new
  // region carrying a message no one hears.
  await expect(outcome).toHaveAttribute("data-live-region-probe", "same-node");
  // The honest outcome is honest: the commit really is on the upstream now.
  expect(aheadCount(project)).toBe("0");
  expect(execFileSync("git", ["log", "-1", "--format=%s", fixture.branch], { cwd: fixture.upstream, encoding: "utf8" }).trim())
    .toBe(fixture.subject);
  await app.close();
});

// Pinning the refspec put a caller-supplied string into git's argv where a
// remote NAME goes — and git accepts a URL there, so main would bound nothing
// if it took that string on trust. It does not. This test goes around the
// screen entirely and calls the handler directly, which is the only way to
// reach the case: the panel's own preview can never name anything else.
test("main refuses a push aimed at anything this project has not configured, and any refspec it did not shape", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-push-bound-"));
  scaffold(project);
  const fixture = pushFixture(project);
  // A perfectly good push target that this project has never heard of.
  const elsewhere = mkdtempSync(join(tmpdir(), "cairn-push-elsewhere-"));
  execFileSync("git", ["init", "-q", "--bare", "."], { cwd: elsewhere });

  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();
  await expect(win.getByRole("button", { name: "← Project home" })).toBeVisible({ timeout: 30_000 });

  // The real preview, with only its remote swapped — a URL in the one field
  // git would happily treat as a destination.
  const byUrl = await win.evaluate(async (args) => {
    const preview = await window.cairn.pushPreview(args.dir);
    return preview === null ? null : window.cairn.pushExecute(args.dir, { ...preview, remote: args.url });
  }, { dir: project, url: pathToFileURL(elsewhere).href });
  expect(byUrl?.ok).toBe(false);
  if (byUrl && !byUrl.ok) {
    // `refused` — Cairn declined before git ran, so these are Cairn's own
    // words with no git output behind them. `other` would have rendered the
    // "ends with git's own words" label over a sentence git never produced.
    expect(byUrl.kind).toBe("refused");
    // The refusal names no target: the string that failed the check came from
    // outside the main process and is never echoed back onto a screen.
    expect(byUrl.message).not.toContain(elsewhere);
    expect(byUrl.message).toContain("Cairn did not run this push.");
  }
  // Nothing reached it, and the project is untouched.
  expect(execFileSync("git", ["for-each-ref"], { cwd: elsewhere, encoding: "utf8" }).trim()).toBe("");
  expect(aheadCount(project)).toBe("1");

  // The same refusal for a plain name this project does not have.
  const byName = await win.evaluate(async (dir) => {
    const preview = await window.cairn.pushPreview(dir);
    return preview === null ? null : window.cairn.pushExecute(dir, { ...preview, remote: "not-a-remote" });
  }, project);
  expect(byName?.ok).toBe(false);
  expect(aheadCount(project)).toBe("1");

  // And what the push SENDS is bounded through the same handler, not only
  // where it goes: `+` in front of the object name is what makes a push a
  // forced update, and an empty source makes the refspec a branch deletion.
  // Neither reaches git.
  const forced = await win.evaluate(async (dir) => {
    const preview = await window.cairn.pushPreview(dir);
    return preview === null ? null : window.cairn.pushExecute(dir, { ...preview, head: `+${preview.head}` });
  }, project);
  expect(forced?.ok).toBe(false);
  if (forced && !forced.ok) expect(forced.kind).toBe("refused");

  const deletion = await win.evaluate(async (dir) => {
    const preview = await window.cairn.pushPreview(dir);
    return preview === null ? null : window.cairn.pushExecute(dir, { ...preview, head: "" });
  }, project);
  expect(deletion?.ok).toBe(false);
  if (deletion && !deletion.ok) expect(deletion.kind).toBe("refused");
  expect(aheadCount(project)).toBe("1");

  // And the bound refuses nothing legitimate: the project's own remote, from
  // its own preview, still goes through the same handler and publishes.
  const real = await win.evaluate(async (dir) => {
    const preview = await window.cairn.pushPreview(dir);
    return preview === null ? null : window.cairn.pushExecute(dir, preview);
  }, project);
  expect(real?.ok).toBe(true);
  expect(aheadCount(project)).toBe("0");
  expect(execFileSync("git", ["log", "-1", "--format=%s", fixture.branch], { cwd: fixture.upstream, encoding: "utf8" }).trim())
    .toBe(fixture.subject);
  await app.close();
});

// The other half of "the honest outcome": a push that is refused. The outcome
// has to say what really happened, in plain words, and the refusal has to
// leave the project exactly as it was — Cairn runs the one push it was given
// approval for and never a second, and never a forced one.
test("a refused push reports the real reason and leaves the project exactly as it was", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-push-refused-"));
  scaffold(project);
  const fixture = pushFixture(project);
  advanceUpstream(fixture.upstream);
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: project, encoding: "utf8" }).trim();
  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");

  await sendChat(win, "Change the page title");
  await waitStreamDone(win);
  const taskCard = win.locator(".task-card");
  await expect(taskCard).toBeVisible();
  await taskCard.locator(".task-chip-risk").getByRole("button", { name: "Set aside" }).click();
  await waitStreamDone(win);
  await taskCard.getByRole("button", { name: "Send to dispatch" }).click();
  const panel = win.locator(".dispatch-panel");
  await expect(panel).toBeVisible({ timeout: 15_000 });
  await panel.getByRole("button", { name: "Run offline demonstration" }).click();

  const card = win.locator(".result-card");
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card.locator(".result-card-disposition")).toHaveText("DONE");

  await win.locator(".push-chip").getByRole("button", { name: "This project is 1 commit ahead of origin. Push?", exact: true }).click();
  const pause = win.locator(".push-confirm");
  await expect(pause).toBeVisible({ timeout: 15_000 });
  await pause.getByRole("button", { name: "Push", exact: true }).click();

  const outcome = win.locator(".push-outcome");
  await expect(outcome).toContainText(
    "The remote has commits this project does not have yet. Nothing was published. Fetch and merge or rebase locally before the next push.",
    { timeout: 30_000 });
  // The sentence does not send the owner to a control that is not there: the
  // settled outcome carries no button, because Cairn never retries a push.
  await expect(outcome).not.toContainText("try the push again");
  await expect(outcome.getByRole("button")).toHaveCount(0);
  // Nothing was claimed that did not happen, and nothing was rewritten to make
  // it happen: same commit, same one-ahead count, and the upstream still
  // carries the other clone's work.
  await expect(outcome).not.toContainText("Pushed");
  expect(execFileSync("git", ["rev-parse", "HEAD"], { cwd: project, encoding: "utf8" }).trim()).toBe(head);
  expect(aheadCount(project)).toBe("1");
  expect(execFileSync("git", ["log", "-1", "--format=%s", fixture.branch], { cwd: fixture.upstream, encoding: "utf8" }).trim())
    .toBe("Someone else's commit");
  await app.close();
});

// The case a one-press chip would get wrong in the worst way: a run the owner
// stopped. Nothing it intended was verified, so its card must never offer to
// publish — even though the git fact behind the chip is true the whole time.
test("a stopped run never evaluates the push chip, with a real local commit waiting the whole time", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-push-stopped-"));
  scaffold(project);
  pushFixture(project);
  const fakeCodex = fakeCodexEnvironment(project, true, "slow");
  const app = await electron.launch({ args: ["."], env: codexEnv(project, fakeCodex) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");
  await dispatchOneRealCall(win);

  const strip = win.locator(".run-strip");
  await expect(strip).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => existsSync(fakeCodex.marker), { timeout: 20_000 }).toBe(true);
  await strip.getByRole("button", { name: "Stop this task" }).click();

  const card = win.locator(".result-card");
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card.locator(".result-card-disposition")).toHaveText("STOPPED");

  // The chip's own precondition is satisfied — the preview really would offer
  // one commit — so an absent chip is a decision about the disposition, not an
  // accident of an empty repository.
  const preview = await win.evaluate((dir) => window.cairn.pushPreview(dir), project);
  expect(preview?.ahead).toBe(1);
  expect(aheadCount(project)).toBe("1");

  // The conductor's comment on the card lands strictly after the card, so
  // waiting for it puts this assertion well past any moment a chip could have
  // appeared — it is absent because it was never evaluated, not because the
  // screen was read too early.
  await expect(win.locator(".chat-messages .result-card ~ .bubble-cairn")).toHaveCount(1, { timeout: 30_000 });
  await expect(win.locator(".push-chip")).toHaveCount(0);
  await expect(win.locator(".push-confirm")).toHaveCount(0);
  await expect(win.getByText("Push?", { exact: false })).toHaveCount(0);
  expect(aheadCount(project)).toBe("1");
  await app.close();
});
