import { _electron as electron, expect, type Page } from "@playwright/test";
import { test } from "./fixtures/isolated-profile";
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
  await win.getByPlaceholder("e.g. moonshotai/kimi-k3").fill(model);
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
  await win.getByRole("button", { name: "Send", exact: true }).click({ noWaitAfter: true });
}

test.describe.configure({ mode: "serial" });

let fixtureUrl = "";
let fixtureClose: () => Promise<void> = async () => {};
let setFixtureCommentaryDelay: (delayMs: number) => void = () => {};
/** Task 137's deterministic commentary window: while held, the fixture's
 * commentary stream pauses before its usage frame until released. */
let holdFixtureCommentary: () => void = () => {};
let releaseFixtureCommentary: () => void = () => {};
/** Task 166's deterministic third-proposal window: the fixture pauses after
 * its content and before done until the remounted Chat has visibly attached. */
let holdFixtureThirdProposal: () => void = () => {};
let releaseFixtureThirdProposal: () => void = () => {};
/** The raw body of the last commentary request the fixture answered — what the
 * provider would actually have been sent (repo task 080). */
let lastCommentaryBody: () => string | null = () => null;
/** The raw body of the last ordinary reply the fixture answered — what the
 * provider would actually have been sent (repo task 127). */
let lastReplyBody: () => string | null = () => null;
/** Task 131's fake OpenRouter: the auth URL and exchange endpoint the PKCE
 * dance touches, plus its own verdict on whether the verifier it received
 * hashes to the challenge it handed out. */
let openRouterUrl = "";
let openRouterClose: () => Promise<void> = async () => {};
let lastOAuthExchangeBody: () => string | null = () => null;
let oauthExchangeVerdict: () => boolean | null = () => null;

test.beforeAll(async () => {
  const fixturePath = pathToFileURL(join(__dirname, "fixtures", "fake-conductor.mjs")).href;
  const fixture = (await import(fixturePath)) as {
    start: () => Promise<{
      url: string;
      close: () => Promise<void>;
      lastCommentaryBody: () => string | null;
      lastReplyBody: () => string | null;
      setCommentaryDelay: (delayMs: number) => void;
      holdCommentary: () => void;
      releaseCommentary: () => void;
      holdThirdProposal: () => void;
      releaseThirdProposal: () => void;
    }>;
  };
  const server = await fixture.start();
  fixtureUrl = server.url;
  fixtureClose = server.close;
  lastCommentaryBody = server.lastCommentaryBody;
  lastReplyBody = server.lastReplyBody;
  setFixtureCommentaryDelay = server.setCommentaryDelay;
  holdFixtureCommentary = server.holdCommentary;
  releaseFixtureCommentary = server.releaseCommentary;
  holdFixtureThirdProposal = server.holdThirdProposal;
  releaseFixtureThirdProposal = server.releaseThirdProposal;

  const openRouterPath = pathToFileURL(join(__dirname, "fixtures", "fake-openrouter.mjs")).href;
  const openRouter = (await import(openRouterPath)) as {
    start: () => Promise<{
      url: string;
      close: () => Promise<void>;
      lastExchangeBody: () => string | null;
      exchangeVerdict: () => boolean | null;
    }>;
  };
  const orServer = await openRouter.start();
  openRouterUrl = orServer.url;
  openRouterClose = orServer.close;
  lastOAuthExchangeBody = orServer.lastExchangeBody;
  oauthExchangeVerdict = orServer.exchangeVerdict;

  detachStoredConnection();
});

test.afterAll(async () => {
  await fixtureClose();
  await openRouterClose();
  restoreStoredConnection();
});

// Every test starts from a clean, disconnected slate regardless of what a
// previous test in this file left behind — each scenario connects for
// itself, so order between them never matters.
test.beforeEach(() => {
  releaseFixtureCommentary(); // a crashed test must never leave the gate held for the next one
  releaseFixtureThirdProposal();
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

// Task 166 review edge: main persists the stopped-early turn before emitting
// its error. Reattachment must use that exact turn, not fabricate another
// timestamped copy beside the saved one.
test("stopping a reply after reattachment shows the persisted partial turn once", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-reattach-stop-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");

  // Capture main's terminal event independently of Chat. Before Task 166 the
  // error carried no turn, so this exact comparison fails regardless of
  // whether Chat's asynchronous history restore wins or loses the UI race.
  await win.evaluate(() => {
    const state = globalThis as typeof globalThis & { task166StoppedTurn?: unknown };
    state.task166StoppedTurn = undefined;
    window.cairn.onConductorDelta((event) => {
      if (event.kind === "error" && event.message === "Stopped.") {
        state.task166StoppedTurn = event.turn;
      }
    });
  });

  await sendChat(win, "slowstream");
  await expect(win.getByText(/One moment/)).toBeVisible({ timeout: 10_000 });
  await win.getByRole("button", { name: /Project home/ }).click();
  await win.getByRole("button", { name: "Talk with Cairn" }).click();
  await win.getByRole("button", { name: "Stop", exact: true }).click();
  await waitStreamDone(win);

  const stopEvidence = await win.evaluate(async (dir) => {
    const state = globalThis as typeof globalThis & { task166StoppedTurn?: unknown };
    const list = await window.cairn.conductorConversations(dir);
    const id = list.at(-1)?.id;
    const turns = id ? await window.cairn.conductorTurns(dir, id) : [];
    return { emitted: state.task166StoppedTurn, persisted: turns.at(-1) ?? null };
  }, project);
  expect(stopEvidence.emitted).toMatchObject({
    role: "cairn",
    text: expect.stringContaining("(stopped early)"),
    ts: expect.any(String),
  });
  expect(stopEvidence.emitted).toEqual(stopEvidence.persisted);

  const stopped = win.locator(".chat-messages .bubble-cairn", { hasText: "(stopped early)" });
  await expect(stopped).toHaveCount(1);
  await win.reload();
  await expect(stopped).toHaveCount(1);
  await app.close();
});

test("the connect card blocks until consent, then disconnecting wipes the connection for the next launch", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-connect-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();

  const card = win.locator(".card", { hasText: "connect cairn's brain" });
  await expect(card).toBeVisible({ timeout: 30_000 });

  // A previous test's successful connect left a remembered seat in this
  // spec-file's shared profile (task 127's memory doing its job). This test's
  // opening walk needs a first-timer's card, so it forgets the seat — the
  // renderer mirror of ConnectCard's SEAT_STORAGE_KEY — and reloads to
  // remount the card, which reads the memory only at mount.
  await win.evaluate(() => localStorage.removeItem("cairn-last-seat"));
  await win.reload();
  await expect(card).toBeVisible({ timeout: 30_000 });

  // The card opens with the two-door question: Kimi K3 (recommended) and the
  // Kimi membership seat — no free-text fields, nothing to configure, and
  // both billing lines named before any click.
  await expect(card.locator('input[type="text"]')).toHaveCount(0);
  await expect(card).toContainText("How do you want to power Cairn?");
  await expect(card).toContainText("Kimi K3");
  await expect(card).toContainText("Recommended");
  await expect(card).toContainText("Kimi — your subscription");
  await expect(card).toContainText("Bills per use — sign in or paste a key");
  await expect(card).toContainText("Uses your membership's coding quota — key from the Kimi Code Console");

  // Choosing the K3 door lands on the quiet sign-in screen (task 137):
  // consent, one checkbox, one button — the key path tucked behind a toggle,
  // the password field nowhere until asked for.
  await card.getByRole("button", { name: /Kimi K3/ }).click();
  const firstSignIn = card.getByRole("button", { name: "Sign in with OpenRouter" });
  await expect(firstSignIn).toBeVisible();
  await expect(firstSignIn).toBeDisabled();
  await expect(card.locator('input[type="password"]')).toHaveCount(0);
  await expect(card).not.toContainText("Paste your OpenRouter key");

  // The toggle opens the key path as three short inline steps — the guide
  // lives here now, not on its own screen.
  await card.getByRole("button", { name: "Use a key instead" }).click();
  await expect(card.getByRole("button", { name: "Open openrouter.ai/keys" })).toBeVisible();
  await expect(card).toContainText("a few dollars of credit");
  await expect(card).toContainText("Create a key and copy it.");
  await expect(card).toContainText("Paste it here:");
  await expect(card.locator('input[type="password"]')).toHaveCount(1);

  // The picker shows the two primary doors, keeps the other three models
  // hidden behind a toggle, and leaves "Custom…" and the not-listed path
  // visible without expanding.
  await win.getByRole("button", { name: "Choose a different brain" }).click();
  const picker = win.locator(".card", { hasText: "choose a different brain" });
  await expect(picker).toBeVisible();
  await expect(picker).toContainText("Kimi K3");
  await expect(picker).toContainText("Kimi — your subscription");
  await expect(picker).not.toContainText("Kimi K2");
  await expect(picker).not.toContainText("DeepSeek V3.1");
  await expect(picker).not.toContainText("GPT-5 Mini");
  await expect(picker.getByRole("button", { name: "Custom…" })).toBeVisible();

  await picker.getByRole("button", { name: /More choices/ }).click();
  await expect(picker).toContainText("Kimi K2");
  await expect(picker).toContainText("DeepSeek V3.1");
  await expect(picker).toContainText("GPT-5 Mini");
  await expect(picker).toContainText("Bills per use — sign in or paste a key");

  // The not-listed path names both doors — Custom… right now, a Cairn task
  // once connected — and shows the exact sentence to send, with a copy button.
  await picker.getByRole("button", { name: /The model I want isn't listed/ }).click();
  const add = win.locator(".card", { hasText: "the model I want isn't listed" });
  await expect(add).toBeVisible();
  await expect(add).toContainText("Add a model to my picker: provider/model-id");
  await add.getByRole("button", { name: "Copy the sentence" }).click();
  await expect(add.getByRole("button", { name: "Copied ✓" })).toBeVisible();
  await add.getByRole("button", { name: "Back" }).click();
  await picker.getByRole("button", { name: "Back" }).click();

  // Picker Back returns to the start screen; choosing K3 again lands back on
  // the sign-in screen with the key path closed. The separate "Where do I
  // get a key?" screen is gone (task 137).
  await expect(card).toContainText("How do you want to power Cairn?");
  await card.getByRole("button", { name: /Kimi K3/ }).click();
  await expect(card.getByRole("button", { name: "Where do I get a key?" })).toHaveCount(0);
  await expect(card.locator('input[type="password"]')).toHaveCount(0);

  // "Custom…" reveals the advanced fields — the only way to reach the
  // fixture's local URL, since it isn't one of the curated brains.
  await win.getByRole("button", { name: "Choose a different brain" }).click();
  await win.getByRole("button", { name: "Custom…" }).click();
  await card.locator('input[type="text"]').first().fill(fixtureUrl);
  await win.getByPlaceholder("e.g. moonshotai/kimi-k3").fill("fixture-model");
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

  // The card remembers the last seat — never the key: it re-opens straight on
  // the paste screen with the custom fields pre-filled, the memory line
  // showing, and the key field empty.
  const reCard = win.locator(".card", { hasText: "connect cairn's brain" });
  await expect(reCard).toBeVisible();
  await expect(reCard.locator('input[type="text"]').first()).toHaveValue(fixtureUrl);
  await expect(win.getByPlaceholder("e.g. moonshotai/kimi-k3")).toHaveValue("fixture-model");
  await expect(reCard).toContainText("Cairn remembers your last choice — never your key.");
  await expect(win.getByPlaceholder("Stored encrypted; shown never again")).toHaveValue("");
  await app.close();

  // The memory survives a relaunch of the same profile too.
  const relaunched = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win2 = await relaunched.firstWindow();
  const reCard2 = win2.locator(".card", { hasText: "connect cairn's brain" });
  await expect(reCard2).toBeVisible({ timeout: 30_000 });
  await expect(win2.getByPlaceholder("e.g. moonshotai/kimi-k3")).toHaveValue("fixture-model");
  await expect(reCard2).toContainText("Cairn remembers your last choice — never your key.");
  await relaunched.close();
});

// Task 131: "Sign in with OpenRouter" — the one-click door. The dance runs
// in main against the fake-OpenRouter fixture (env seams point the auth page
// and the exchange at it and skip the real browser); the test plays the
// browser by hand: read the auth URL off the waiting card's fallback link,
// fetch it (the fixture approves instantly and 302s back to the app's real
// loopback listener), then follow the redirect. The fixture itself verifies
// the PKCE binding — a green test here proves verifier↔challenge, not just
// happy HTTP shapes. No test in this file ever touches the real OpenRouter,
// and the OAuth-connected app is never asked to send a chat (that call would
// go to the real openrouter.ai).
function oauthEnv(project: string): { [key: string]: string } {
  const env = baseEnv(project);
  env.CAIRN_OPENROUTER_AUTH_BASE = openRouterUrl;
  env.CAIRN_OAUTH_NO_BROWSER = "1";
  return env;
}

test("sign in with OpenRouter lands connected, no key anywhere", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-oauth-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: oauthEnv(project) });
  const win = await app.firstWindow();

  const card = win.locator(".card", { hasText: "connect cairn's brain" });
  await expect(card).toBeVisible({ timeout: 30_000 });
  // A previous test's seat memory would skip the start question — forget it
  // for a first-timer's walk, as the connect test does.
  await win.evaluate(() => localStorage.removeItem("cairn-last-seat"));
  await win.reload();
  await expect(card).toBeVisible({ timeout: 30_000 });

  // The K3 door's quiet screen carries the one-click button, gated by the
  // same consent checkbox as the paste path (task 137: sign-in first, the
  // key path behind a toggle).
  await card.getByRole("button", { name: /Kimi K3/ }).click();
  const signIn = card.getByRole("button", { name: "Sign in with OpenRouter" });
  await expect(signIn).toBeVisible();
  await expect(signIn).toBeDisabled();
  await card.locator('input[type="checkbox"]').check();
  await expect(signIn).toBeEnabled();
  await signIn.click();

  // The waiting card names the flow and carries the fallback link — the
  // exact URL main would have opened in the browser.
  await expect(card).toContainText("Finish in your browser.");
  const link = card.getByRole("link", { name: "Open the sign-in page yourself" });
  await expect(link).toBeVisible();
  const authUrl = await link.getAttribute("href");
  expect(authUrl).toBeTruthy();
  const parsed = new URL(authUrl as string);
  expect(parsed.origin).toBe(openRouterUrl);
  expect(parsed.pathname).toBe("/auth");
  expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
  expect(parsed.searchParams.get("code_challenge")).toBeTruthy();
  const callback = new URL(parsed.searchParams.get("callback_url") as string);
  expect(callback.hostname).toBe("127.0.0.1");
  expect(callback.pathname).toBe("/callback");

  // Play the browser: approve at the fixture, follow the redirect into the
  // app's loopback listener, and the dance completes by itself.
  const authResponse = await fetch(authUrl as string, { redirect: "manual" });
  expect(authResponse.status).toBe(302);
  const location = authResponse.headers.get("location");
  expect(location).toBeTruthy();
  const callbackResponse = await fetch(location as string);
  expect(callbackResponse.status).toBe(200);
  await expect(callbackResponse.text()).resolves.toContain("return to Cairn");

  // The card closes into the connected state — the same landing as a pasted
  // key, with the curated seat and provider named.
  await expect(card).not.toBeVisible({ timeout: 10_000 });
  const status = await win.evaluate(() => window.cairn.conductorStatus());
  expect(status.connected).toBe(true);
  expect(status.baseUrl).toBe("https://openrouter.ai/api/v1");
  expect(status.model).toBe("moonshotai/kimi-k3");
  expect(status.provider).toBe("openrouter.ai");

  // The fixture's own verdict: the verifier in the exchange hashes to the
  // challenge the auth URL carried — the PKCE binding held end-to-end.
  expect(oauthExchangeVerdict()).toBe(true);
  const exchange = JSON.parse(lastOAuthExchangeBody() as string) as Record<string, string>;
  expect(exchange.code).toBe("fixture-auth-code");
  expect(exchange.code_challenge_method).toBe("S256");

  await app.close();
});

test("cancelling the sign-in returns to the paste screen, still disconnected, and the listener is gone", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-oauth-cancel-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: oauthEnv(project) });
  const win = await app.firstWindow();

  const card = win.locator(".card", { hasText: "connect cairn's brain" });
  await expect(card).toBeVisible({ timeout: 30_000 });
  await win.evaluate(() => localStorage.removeItem("cairn-last-seat"));
  await win.reload();
  await expect(card).toBeVisible({ timeout: 30_000 });

  await card.getByRole("button", { name: /Kimi K3/ }).click();
  await card.locator('input[type="checkbox"]').check();
  await card.getByRole("button", { name: "Sign in with OpenRouter" }).click();
  await expect(card).toContainText("Finish in your browser.");
  const authUrl = (await card.getByRole("link", { name: "Open the sign-in page yourself" }).getAttribute("href")) as string;

  await card.getByRole("button", { name: "Cancel" }).click();
  // Back on the quiet screen: the sign-in button, the key path still closed.
  await expect(card.getByRole("button", { name: "Sign in with OpenRouter" })).toBeVisible();
  await expect(card.locator('input[type="password"]')).toHaveCount(0);
  const status = await win.evaluate(() => window.cairn.conductorStatus());
  expect(status.connected).toBe(false);

  // A browser that finishes late finds the loopback door closed entirely —
  // cancel tears the listener down, so the connection itself is refused and
  // no exchange can ever reach OpenRouter.
  const authResponse = await fetch(authUrl, { redirect: "manual" });
  const location = authResponse.headers.get("location") as string;
  await expect(fetch(location)).rejects.toThrow(/fetch failed/);

  await app.close();
});

test("the OAuth channel enforces the same consent gate, and OpenRouter seats only", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-oauth-gate-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: oauthEnv(project) });
  const win = await app.firstWindow();
  await expect(win.locator(".card", { hasText: "connect cairn's brain" })).toBeVisible({ timeout: 30_000 });

  // Three refusals, proven through the real IPC surface: a doctored card, an
  // unchecked box, and a perfectly valid card for the WRONG seat. None may
  // open a listener or store anything.
  const gates = await win.evaluate(async () => {
    const real = await window.cairn.conductorConsentCard("https://openrouter.ai/api/v1", "moonshotai/kimi-k3");
    if (!real.ok) throw new Error("consent card failed");
    const tampered = await window.cairn.conductorOAuthBegin({ card: { ...real.value, cost: "Free, I promise." }, consentConfirmed: true });
    const unchecked = await window.cairn.conductorOAuthBegin({ card: real.value, consentConfirmed: false });
    const kimiCard = await window.cairn.conductorConsentCard("https://api.kimi.com/coding/v1", "kimi-for-coding");
    if (!kimiCard.ok) throw new Error("kimi card failed");
    const kimi = await window.cairn.conductorOAuthBegin({ card: kimiCard.value, consentConfirmed: true });
    return { tampered, unchecked, kimi };
  });
  expect(gates.tampered).toEqual({ ok: false, message: "CONDUCTOR_CONNECT_NOT_AUTHORIZED" });
  expect(gates.unchecked).toEqual({ ok: false, message: "CONDUCTOR_CONNECT_NOT_AUTHORIZED" });
  expect(gates.kimi).toEqual({ ok: false, message: "CONDUCTOR_OAUTH_NOT_AUTHORIZED" });
  const status = await win.evaluate(() => window.cairn.conductorStatus());
  expect(status.connected).toBe(false);

  await app.close();
});

// Task 127: a custom (non-curated) seat earns one code-assembled note in the
// conductor's prompt, offering the add-a-model task. The fixture seat is
// custom by construction (a local URL), and the note can only be proven on
// the wire — what the provider was actually sent, not what main claims.
test("a custom seat is named in the prompt with one offer to add it to the picker", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-seatnote-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");

  await sendChat(win, "hello");
  await waitStreamDone(win);

  const sent = lastReplyBody();
  expect(sent).toBeTruthy();
  expect(sent).toContain("Connection facts (assembled by Cairn's code, not by a model)");
  expect(sent).toContain("fixture-model");
  expect(sent).toContain(new URL(fixtureUrl).host);
  expect(sent).toContain("add it to the picker as a Cairn task");
  expect(sent).toContain("do not offer again");

  await app.close();
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
  await taskCard.locator(".task-chip-risk").getByRole("button", { name: "Set aside" }).click({ noWaitAfter: true });
  await waitStreamDone(win);
  // This opens an in-app panel; it never navigates the Electron page. Skip
  // Playwright's navigation waiter and prove the intended result explicitly
  // with the panel assertion below.
  await taskCard.getByRole("button", { name: "Send to dispatch" }).click({ noWaitAfter: true });
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
  await expect(card).toContainText("Worker's account — Cairn checked the files above, but not these descriptions");
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

  // The locked state is transient — it ends the moment the answer's stream
  // finishes. Two sequential expects can straddle that end under load (the
  // first-run flake seen in tasks 131/137), so the pin is ONE locator, one
  // atomic observation per poll: a risk chip that both says the lock and
  // has its button disabled.
  await expect(
    riskChip
      .filter({ hasText: "Wait for Cairn to finish answering." })
      .locator('button:has-text("Set aside")[disabled]'),
  ).toBeVisible();

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
async function dispatchOneRealCall(win: Page, beforeStart?: () => void | Promise<void>): Promise<void> {
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
  await beforeStart?.();
  await panel.getByRole("button", { name: "Start one real Codex Exec call" }).click({ noWaitAfter: true });
}

type TownMotionProbe = {
  motion: string;
  outcome: string;
  truth: string;
  cue: string | null;
  receiver: string | null;
  rippleColor: string | null;
  packetText: string | null;
  rippleReceiverDistance: number | null;
  cairnStroke: string | null;
  workerStroke: string | null;
  packet: boolean;
  ripple: boolean;
  terminalRipple: boolean;
  doneFace: boolean;
  cairnFace: string | null;
  threadFocused: boolean;
  status: string;
};

async function installTownMotionProbe(win: Page): Promise<void> {
  await win.evaluate(() => {
    const probeWindow = window as unknown as {
      __cairnTownMotion?: { log: string[]; observer: MutationObserver; startedAt: number };
    };
    probeWindow.__cairnTownMotion?.observer.disconnect();
    const log: string[] = [];
    const record = () => {
      const town = document.querySelector<HTMLElement>(".town-square");
      if (!town) return;
      const transfer = town.querySelector<HTMLElement>(".town-transfer-layer");
      const ripple = transfer?.querySelector<HTMLElement>(".town-transfer-ripple, .town-terminal-ripple") ?? null;
      const packet = transfer?.querySelector<HTMLElement>(".town-transfer-packet") ?? null;
      const receiverName = transfer?.dataset.receiver ?? null;
      const receiver = receiverName === "cairn"
        ? town.querySelector<HTMLElement>(".town-node-cairn")
        : Array.from(town.querySelectorAll<HTMLElement>(".town-node-worker"))
          .find((node) => node.dataset.faceId === receiverName) ?? null;
      const rippleRect = ripple?.getBoundingClientRect();
      const receiverRect = receiver?.getBoundingClientRect();
      const cairnPath = town.querySelector<SVGPathElement>(".town-face-cairn .town-face-svg path");
      const workerPath = town.querySelector<SVGPathElement>(".town-node-worker .town-face-svg path");
      const entry = JSON.stringify({
        motion: town.dataset.townMotion ?? "none",
        outcome: town.dataset.townOutcome ?? "none",
        truth: town.dataset.townTruth ?? "quiet",
        cue: transfer?.dataset.cueKey ?? null,
        receiver: receiverName,
        rippleColor: ripple ? getComputedStyle(ripple).borderTopColor : null,
        packetText: packet?.textContent?.trim().toUpperCase() ?? null,
        rippleReceiverDistance: rippleRect && receiverRect
          ? Math.hypot(
            rippleRect.x + rippleRect.width / 2 - (receiverRect.x + receiverRect.width / 2),
            rippleRect.y + rippleRect.height / 2 - (receiverRect.y + receiverRect.height / 2),
          )
          : null,
        cairnStroke: cairnPath ? getComputedStyle(cairnPath).stroke : null,
        workerStroke: workerPath ? getComputedStyle(workerPath).stroke : null,
        packet: Boolean(packet),
        ripple: Boolean(transfer?.querySelector(".town-transfer-ripple")),
        terminalRipple: Boolean(transfer?.querySelector(".town-terminal-ripple")),
        doneFace: town.querySelector(".town-node-done") !== null,
        cairnFace: town.querySelector<HTMLElement>(".town-node-cairn")?.dataset.faceState ?? null,
        threadFocused: document.activeElement?.classList.contains("town-thread-target") ?? false,
        status: town.querySelector<HTMLElement>(".town-square-header [role=status]")?.innerText ?? "",
      });
      if (log.at(-1) !== entry) log.push(entry);
    };
    const town = document.querySelector(".town-square");
    if (!town) throw new Error("Town square is not mounted");
    const observer = new MutationObserver(record);
    observer.observe(town, { attributes: true, childList: true, subtree: true });
    probeWindow.__cairnTownMotion = { log, observer, startedAt: performance.now() };
    record();
  });
}

async function townMotionProbe(win: Page): Promise<TownMotionProbe[]> {
  const entries = await win.evaluate(() => {
    const probeWindow = window as unknown as { __cairnTownMotion?: { log: string[] } };
    return probeWindow.__cairnTownMotion?.log ?? [];
  });
  return entries.map((entry) => JSON.parse(entry) as TownMotionProbe);
}

type TownCueObservation = { key: string; kind: string };

/** One entry per reducer cue key. A flight and its landing deliberately share
 * a key; a repeated poll must never create a second key for the same event. */
function uniqueTownCues(entries: TownMotionProbe[]): TownCueObservation[] {
  const seen = new Set<string>();
  const cues: TownCueObservation[] = [];
  for (const entry of entries) {
    if (!entry.cue || seen.has(entry.cue)) continue;
    seen.add(entry.cue);
    cues.push({ key: entry.cue, kind: entry.motion.split("-", 1)[0] ?? entry.motion });
  }
  return cues;
}

function motionsForCue(entries: TownMotionProbe[], key: string): string[] {
  return entries
    .filter((entry) => entry.cue === key)
    .map((entry) => entry.motion)
    .filter((motion, index, motions) => index === 0 || motion !== motions[index - 1]);
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
  await expect(town.locator(".town-face-cairn")).toHaveCount(1);
  await expect(town.locator(".town-node-worker")).toHaveCount(0);
  await expect(town.locator(".town-thread-target")).toHaveCount(0);
  await town.getByRole("button", { name: "Cairn, ready" }).click({ noWaitAfter: true });
  await expect(win.getByPlaceholder("Talk with Cairn")).toBeFocused();
  await dispatchOneRealCall(win, async () => {
    await expect(town.locator(".town-node-worker")).toHaveCount(0);
    await expect(town.locator(".town-transfer-layer")).toHaveCount(0);
    await installTownMotionProbe(win);
  });

  // The probe was armed before the click that main accepts. Read its history
  // for the sub-second flight instead of attaching a second live waiter after
  // the dispatch, which can observe landing even though flight rendered.
  await expect.poll(async () => (await townMotionProbe(win)).some((entry) =>
    entry.motion === "dispatch-flight" && entry.receiver === "codex"
      && entry.packetText === "TASK" && entry.packet && !entry.ripple
      && entry.cairnStroke === "rgb(127, 216, 200)"
      && entry.workerStroke === "rgb(242, 163, 92)"), { timeout: 10_000 }).toBe(true);
  await expect.poll(async () => (await townMotionProbe(win)).some((entry) =>
    entry.motion === "dispatch-landing" && entry.receiver === "codex"
      && entry.rippleColor === "rgb(242, 163, 92)"
      && entry.rippleReceiverDistance !== null && entry.rippleReceiverDistance < 70
      && entry.workerStroke === "rgb(242, 163, 92)"
      && !entry.packet && entry.ripple), { timeout: 10_000 }).toBe(true);

  // Let this cue settle, then cross a full two-second workspace poll. The same
  // runtime snapshot may not replay either phase under the original key.
  await expect(town).toHaveAttribute("data-town-motion", "none", { timeout: 10_000 });
  const dispatchEntries = await townMotionProbe(win);
  const dispatchCues = uniqueTownCues(dispatchEntries).filter((cue) => cue.kind === "dispatch");
  expect(dispatchCues).toHaveLength(1);
  expect(motionsForCue(dispatchEntries, dispatchCues[0]!.key)).toEqual([
    "dispatch-flight",
    "dispatch-landing",
  ]);
  const settledDispatchLogLength = dispatchEntries.length;
  await win.waitForTimeout(2_200);
  const afterSettledPoll = await townMotionProbe(win);
  expect(afterSettledPoll.slice(settledDispatchLogLength)
    .some((entry) => entry.cue === dispatchCues[0]!.key)).toBe(false);

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
  await expect(worker).toHaveAttribute("data-face-id", "codex");
  await expect(worker.locator(".town-face-worker")).toHaveCount(1);
  await expect(worker.locator(".town-worker-pad")).toHaveCount(1);

  // At the minimum supported Town size, the FULL Cairn and worker buttons —
  // not just their face strokes — remain beside the same conversation. The
  // dialog, nodes, and owner controls all stay inside the viewport.
  await win.setViewportSize({ width: 760, height: 620 });
  await expect(win.getByRole("button", { name: /Conductor.*worker task running/ })).toBeVisible();
  const narrowLayout = await win.evaluate(() => {
    const dialog = document.querySelector<HTMLElement>(".chat-column-villager")?.getBoundingClientRect();
    const town = document.querySelector<HTMLElement>(".town-square")?.getBoundingClientRect();
    const cairnNode = document.querySelector<HTMLElement>(".town-node-cairn")?.getBoundingClientRect();
    const workerNode = document.querySelector<HTMLElement>(".town-node-worker")?.getBoundingClientRect();
    if (!dialog || !town || !cairnNode || !workerNode) throw new Error("Expected the minimum-size Town cast and conversation");
    const overlaps = (left: DOMRect, right: DOMRect) => left.left < right.right && left.right > right.left
      && left.top < right.bottom && left.bottom > right.top;
    const contains = (outer: DOMRect, inner: DOMRect) => inner.left >= outer.left - 1
      && inner.right <= outer.right + 1 && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1;
    const controlsFit = Array.from(document.querySelectorAll<HTMLElement>(
      ".chat-topbar button, .run-strip-controls button",
    )).every((control) => {
      const rect = control.getBoundingClientRect();
      return contains(dialog, rect);
    });
    return {
      cairnClear: !overlaps(dialog, cairnNode),
      workerClear: !overlaps(dialog, workerNode),
      cairnFits: contains(town, cairnNode),
      workerFits: contains(town, workerNode),
      dialogFits: contains(town, dialog),
      controlsFit,
      pageFits: document.documentElement.scrollWidth <= window.innerWidth
        && document.documentElement.scrollHeight <= window.innerHeight,
    };
  });
  expect(narrowLayout).toEqual({
    cairnClear: true,
    workerClear: true,
    cairnFits: true,
    workerFits: true,
    dialogFits: true,
    controlsFit: true,
    pageFits: true,
  });
  await win.setViewportSize({ width: 1320, height: 820 });

  await win.locator(".rail-project-select", { hasText: otherName }).click({ noWaitAfter: true });
  const otherTown = win.getByRole("region", { name: `${otherName} town square` });
  await expect(otherTown).toBeVisible();
  await expect(win.locator(".town-square")).toHaveCount(1);
  await expect(otherTown.locator(".town-node-worker")).toHaveCount(0);
  const runningProject = win.locator(".rail-project-select", { has: win.locator(".rail-activity-working") });
  await expect(runningProject).toHaveCount(1);
  await expect(runningProject).toContainText("Conductor");
  await expect(runningProject).toContainText("worker task running");
  const awaySession = await win.evaluate((dir) => window.cairn.taskCurrent(dir), project);
  expect(awaySession?.phase).toBe("running");
  await runningProject.click({ noWaitAfter: true });
  await expect(win.locator(".town-square")).toHaveCount(1);
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
  await expect(town).toHaveAttribute("data-town-motion", "none");
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

  // A point saved by an older build on the far shore remains intact on disk,
  // but presentation clamping keeps the full worker button clear of Chat on
  // both sides of the former 1260/1261 breakpoint cliff.
  const legacyPosition = await win.evaluate(async ({ dir }) => window.cairn.townSave(dir, {
    version: 1,
    positions: { "worker:codex-exec": { x: 0.88, y: 0.5 } },
    dividerWidth: 620,
  }), { dir: project });
  expect(legacyPosition.ok).toBe(true);
  await win.setViewportSize({ width: 1261, height: 820 });
  await win.reload();
  await expect(worker).toHaveCount(1);
  const breakpointLayout = await win.evaluate(() => {
    const dialog = document.querySelector<HTMLElement>(".chat-column-villager")?.getBoundingClientRect();
    const town = document.querySelector<HTMLElement>(".town-square")?.getBoundingClientRect();
    const worker = document.querySelector<HTMLElement>(".town-node-worker")?.getBoundingClientRect();
    if (!dialog || !town || !worker) throw new Error("Expected Town, worker, and Chat at 1261px");
    const overlaps = (left: DOMRect, right: DOMRect) => left.left < right.right && left.right > right.left
      && left.top < right.bottom && left.bottom > right.top;
    return {
      workerClear: !overlaps(dialog, worker),
      workerFits: worker.left >= town.left - 1 && worker.right <= town.right + 1,
      pageFits: document.documentElement.scrollWidth <= window.innerWidth,
    };
  });
  expect(breakpointLayout).toEqual({ workerClear: true, workerFits: true, pageFits: true });
  const retainedLegacyPosition = await win.evaluate((dir) => window.cairn.townLoad(dir), project);
  expect(retainedLegacyPosition.ok && retainedLegacyPosition.value.positions["worker:codex-exec"]?.x).toBe(0.88);
  await win.setViewportSize({ width: 1320, height: 820 });

  await win.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => worker.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
  await expect.poll(() => worker.locator(".town-face-holo").evaluate((element) => getComputedStyle(element).animationDuration)).toBe("0s");
  await expect.poll(() => worker.locator(".town-worker-pad span").first().evaluate((element) => getComputedStyle(element).animationDuration)).toBe("0s");
  await town.getByRole("button", { name: "Reset layout" }).click({ noWaitAfter: true });
  await expect.poll(async () => {
    const state = await win.evaluate((dir) => window.cairn.townLoad(dir), project);
    return state.ok ? Object.keys(state.value.positions).length : -1;
  }).toBe(0);

  await worker.focus();
  await win.keyboard.press("Tab");
  await win.keyboard.press("Shift+Tab");
  await expect(worker).toBeFocused();
  const workerFocusRing = await worker.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: style.outlineWidth, offset: style.outlineOffset };
  });
  expect(workerFocusRing.style).toBe("solid");
  expect(Number.parseFloat(workerFocusRing.width)).toBeGreaterThanOrEqual(3);
  expect(Number.parseFloat(workerFocusRing.offset)).toBeGreaterThanOrEqual(3);
  const sessionBeforeSelection = await win.evaluate((dir) => window.cairn.taskCurrent(dir), project);
  await win.keyboard.press("Enter");
  const workerDetail = town.getByRole("complementary", { name: "Codex Exec worker details" });
  await expect(workerDetail).toContainText("Change the page title");
  await expect(workerDetail).toContainText("codex-exec");
  const detailGeometry = await win.evaluate(() => {
    const detail = document.querySelector<HTMLElement>(".town-detail")?.getBoundingClientRect();
    const action = document.querySelector<HTMLElement>(".town-detail-action")?.getBoundingClientRect();
    const dialog = document.querySelector<HTMLElement>(".chat-column-villager")?.getBoundingClientRect();
    if (!detail || !action || !dialog) throw new Error("Expected worker details and Chat");
    const overlaps = detail.left < dialog.right && detail.right > dialog.left
      && detail.top < dialog.bottom && detail.bottom > dialog.top;
    return {
      clearsChat: !overlaps,
      actionFits: action.left >= detail.left - 1 && action.right <= detail.right + 1
        && action.top >= detail.top - 1 && action.bottom <= detail.bottom + 1,
    };
  });
  expect(detailGeometry).toEqual({ clearsChat: true, actionFits: true });
  const sessionAfterSelection = await win.evaluate((dir) => window.cairn.taskCurrent(dir), project);
  expect(sessionAfterSelection?.startedAt).toBe(sessionBeforeSelection?.startedAt);

  const thread = town.locator(".town-thread-target");
  await expect(thread).toHaveCount(1);
  await thread.focus();
  await win.keyboard.press("Space");
  await expect(town.getByRole("complementary", { name: "Task thread details" })).toContainText("Change the page title");
  await town.locator(".town-square-ground").click({ position: { x: 6, y: 6 }, noWaitAfter: true });
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
  await strip.getByRole("button", { name: "Stop this task" }).click({ noWaitAfter: true });

  // The interim result relay (until Task 8): the conversation is not left
  // silent — the strip carries the terminal state and the way to the records.
  await expect(strip).toContainText("STOPPED — you stopped it yourself", { timeout: 30_000 });
  // The terminal line arrived as a change INSIDE the live region marked above,
  // not as a new region carrying a message no one hears.
  await expect(strip.locator(".run-strip-state")).toHaveAttribute("data-live-region-probe", "same-node");
  await expect(strip.locator(".run-strip-terminal")).toContainText("CANCELLED_BY_OWNER");
  await expect(strip.getByRole("button", { name: "Stop this task" })).toHaveCount(0);
  await expect(win.getByPlaceholder("Talk with Cairn")).toBeEnabled();
  await expect(win.getByText("A task is running. You can type again when it finishes.")).toHaveCount(0);
  await expect(town.locator(".town-node-worker")).toHaveCount(0, { timeout: 15_000 });
  await expect(town).toHaveAttribute("data-town-truth", "stopped");
  await expect(town).toHaveAttribute("data-town-outcome", "stopped");
  await expect(town.locator(".town-node-cairn.town-node-done")).toHaveCount(0);
  await expect(town.locator(".town-square-header [role=status]")).toContainText("STOPPED");
  await expect(town.locator(".town-transfer-layer")).toHaveCount(0);
  await expect(town.locator(".town-face-worker")).toHaveCount(0);
  await expect(town.locator(".town-worker-pad")).toHaveCount(0);
  await expect(town.locator(".town-thread-target")).toHaveCount(0);
  await expect.poll(() => win.evaluate(() => ({
    overflow: getComputedStyle(document.querySelector<HTMLElement>(".chat-messages")!).overflowX,
    pageFits: document.documentElement.scrollWidth <= window.innerWidth,
  }))).toEqual({ overflow: "hidden", pageFits: true });

  const report = readFileSync(join(project, "docs", "ai-work", "tasks", "001-report.md"), "utf8");
  expect(report).toContain("CANCELLED_BY_OWNER");
  expect(existsSync(join(project, "visible.txt"))).toBe(false);

  // The link is real: it opens the run screen on this same session.
  await strip.getByRole("button", { name: "Open the run screen" }).click({ noWaitAfter: true });
  await expect(win.getByRole("heading", { name: "Adapter stopped safely" })).toBeVisible({ timeout: 15_000 });
  await app.close();
});

test("a fresh confirmed dispatch reaches the same stable Town with reduced motion and no transient packet", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-town-reduced-"));
  scaffold(project);
  const fakeCodex = fakeCodexEnvironment(project, true, "slow");
  const app = await electron.launch({ args: ["."], env: codexEnv(project, fakeCodex) });
  const win = await app.firstWindow();
  await win.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => win.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  await connectToFixture(win, fixtureUrl, "fixture-model");

  const town = win.getByRole("region", { name: "Conductor town square" });
  await dispatchOneRealCall(win, () => installTownMotionProbe(win));
  await expect.poll(() => existsSync(fakeCodex.marker), { timeout: 20_000 }).toBe(true);
  await expect(town.locator(".town-node-worker")).toHaveCount(1);
  await expect(town).toHaveAttribute("data-town-truth", "working");
  await expect(town).toHaveAttribute("data-town-motion", "none");
  await expect(town.locator(".town-transfer-layer")).toHaveCount(0);
  await expect.poll(() => town.locator(".town-node-worker").evaluate((element) =>
    getComputedStyle(element).animationDuration)).toBe("0s");

  const reducedEntries = await townMotionProbe(win);
  expect(uniqueTownCues(reducedEntries)).toEqual([]);
  expect(reducedEntries.every((entry) => entry.motion === "none" && entry.cue === null
    && !entry.packet && !entry.ripple && !entry.terminalRipple)).toBe(true);

  // Stop the fake process so this isolated run closes before the app does. The
  // semantic STOPPED state still lands immediately, without adding motion.
  const strip = win.locator(".run-strip");
  await strip.getByRole("button", { name: "Stop this task" }).click();
  await expect(strip).toContainText("STOPPED — you stopped it yourself", { timeout: 30_000 });
  await expect(town).toHaveAttribute("data-town-truth", "stopped");
  await expect(town).toHaveAttribute("data-town-outcome", "stopped");
  await expect(town).toHaveAttribute("data-town-motion", "none");
  await expect(town.locator(".town-transfer-layer")).toHaveCount(0);
  await expect(town.locator(".town-node-done")).toHaveCount(0);
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
  await dispatchOneRealCall(win, () => installTownMotionProbe(win));

  const town = win.locator(".town-square");
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
  await expect(card).toContainText("Worker's account — Cairn checked the files above, but not these descriptions");
  await expect(card).toContainText("docs/ai-work/tasks/001-report.md");
  // The card carries no DONE anywhere, and the product change really did not land.
  await expect(card).not.toContainText("DONE");
  expect(existsSync(join(project, "visible.txt"))).toBe(false);

  const stoppedComment = win.locator(".chat-messages .result-card ~ .bubble-cairn:not(.bubble-commentary)");
  await expect(stoppedComment).toContainText("The card says this task STOPPED safely", { timeout: 30_000 });
  await expect(stoppedComment).not.toContainText("DONE");

  // STOPPED truth wins immediately even if a decorative dispatch landing is
  // still finishing. Its one terminal cue is coral, and no cast member ever
  // receives a `done` face from an unverified result.
  await expect(town).toHaveAttribute("data-town-truth", "stopped");
  await expect(town.locator(".town-square-header [role=status]")).toContainText("STOPPED");
  await expect.poll(async () => (await townMotionProbe(win)).some((entry) =>
    entry.truth === "stopped" && entry.status.includes("STOPPED")
      && entry.cairnFace === "thinking" && !entry.doneFace),
  { timeout: 15_000 }).toBe(true);
  await expect.poll(async () => (await townMotionProbe(win)).some((entry) =>
    entry.motion === "stopped-landing" && entry.outcome === "stopped"
      && entry.rippleColor === "rgb(255, 129, 120)"
      && entry.cairnStroke === "rgb(127, 216, 200)"
      && entry.terminalRipple && entry.cairnFace === "thinking" && !entry.doneFace),
  { timeout: 15_000 }).toBe(true);
  const stoppedEntries = await townMotionProbe(win);
  const stoppedCues = uniqueTownCues(stoppedEntries).filter((cue) => cue.kind === "stopped");
  expect(stoppedCues).toHaveLength(1);
  expect(motionsForCue(stoppedEntries, stoppedCues[0]!.key)).toEqual(["stopped-landing"]);
  expect(stoppedEntries.filter((entry) => entry.truth === "stopped")
    .every((entry) => entry.cairnFace === "thinking" && !entry.doneFace)).toBe(true);
  expect(stoppedEntries.some((entry) => entry.motion === "done-landing"
    || entry.outcome === "done" || /DONE/.test(entry.status))).toBe(false);
  await expect(town.locator(".town-node-cairn")).toHaveAttribute("data-face-state", "thinking");
  await expect(town.locator(".town-node-done")).toHaveCount(0);
  await expect.poll(() => town.locator(".town-face-cairn .town-face-svg path").first()
    .evaluate((element) => getComputedStyle(element).stroke)).toBe("rgb(127, 216, 200)");

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
  const fakeCodex = fakeCodexEnvironment(project, true, "town-return");
  const app = await electron.launch({ args: ["."], env: codexEnv(project, fakeCodex) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");
  await dispatchOneRealCall(win, () => installTownMotionProbe(win));

  const town = win.locator(".town-square");
  const focusedThread = town.locator(".town-thread-target");
  await expect(focusedThread).toHaveCount(1, { timeout: 15_000 });
  await focusedThread.focus();
  await win.keyboard.press("Tab");
  await win.keyboard.press("Shift+Tab");
  await expect(focusedThread).toBeFocused();
  const threadFocusRing = await focusedThread.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: style.outlineWidth, offset: style.outlineOffset };
  });
  expect(threadFocusRing.style).toBe("solid");
  expect(Number.parseFloat(threadFocusRing.width)).toBeGreaterThanOrEqual(3);
  expect(Number.parseFloat(threadFocusRing.offset)).toBeGreaterThanOrEqual(3);
  writeFileSync(fakeCodex.release, "finish\n");

  const card = win.locator(".result-card");
  await expect(town).toHaveAttribute("data-town-motion", "return-flight", { timeout: 15_000 });
  // The flight lasts less than a second. Read the transition observer instead
  // of racing a second live poll against its tail: the same DOM mutation that
  // paints `return-flight` records which Town control owned focus in that
  // frame.
  await expect.poll(async () => (await townMotionProbe(win)).some((entry) =>
    entry.motion === "return-flight" && entry.threadFocused), { timeout: 15_000 }).toBe(true);
  await expect.poll(async () => (await townMotionProbe(win)).some((entry) =>
    entry.motion === "return-flight" && entry.receiver === "cairn"
      && entry.packetText === "RESULT" && entry.packet && !entry.ripple
      && entry.cairnStroke === "rgb(127, 216, 200)"), { timeout: 15_000 }).toBe(true);
  await expect.poll(async () => (await townMotionProbe(win)).some((entry) =>
    entry.motion === "return-landing" && entry.receiver === "cairn"
      && entry.rippleColor === "rgb(127, 216, 200)"
      && entry.rippleReceiverDistance !== null && entry.rippleReceiverDistance < 70
      && !entry.packet && entry.ripple), { timeout: 15_000 }).toBe(true);
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card.locator(".result-card-disposition")).toHaveText("DONE");
  await expect.poll(async () => (await townMotionProbe(win)).some((entry) =>
    entry.motion === "done-landing" && entry.outcome === "done"
      && entry.rippleColor === "rgb(169, 211, 155)"
      && entry.cairnStroke === "rgb(127, 216, 200)"
      && entry.terminalRipple && (entry.cairnFace === "done" || entry.cairnFace === "thinking")),
  { timeout: 15_000 }).toBe(true);

  // The return never regresses to worker-running truth or borrows the success
  // face. Depending on which real refresh wins that brief interval, Cairn can
  // honestly be checking, already DONE, or speaking its live commentary; the
  // unit reducer pins terminal truth as soon as that terminal snapshot exists.
  const returnEntries = (await townMotionProbe(win)).filter((entry) =>
    /^return-(flight|landing)$/.test(entry.motion));
  expect(returnEntries.some((entry) => entry.outcome === "none" && !entry.doneFace)).toBe(true);
  expect(returnEntries.every((entry) => entry.truth !== "working" && !entry.doneFace)).toBe(true);
  for (const entry of returnEntries) {
    if (entry.truth === "done") expect(entry.status).toMatch(/^DONE/);
    if (entry.truth === "thinking") expect(entry.status).toBe("Cairn is replying.");
    if (entry.truth === "checking") expect(entry.status).toMatch(/Cairn|Result/);
  }
  await expect(town).toHaveAttribute("data-town-truth", "done");
  await expect(town).toHaveAttribute("data-town-outcome", "done");
  await expect(town.locator(".town-node-cairn.town-node-done")).toHaveCount(1);
  await expect(town.locator(".town-square-header [role=status]")).toContainText("DONE");
  await expect.poll(() => town.locator(".town-face-cairn .town-face-svg path").first()
    .evaluate((element) => getComputedStyle(element).stroke)).toBe("rgb(127, 216, 200)");
  expect((await townMotionProbe(win)).some((entry) => entry.outcome === "stopped" || /STOPPED/.test(entry.status))).toBe(false);

  // Let the terminal ripple settle. Multiple task/conductor refreshes and at
  // least one 2-second poll have now observed this snapshot, but each runtime
  // transition still owns exactly one key in dispatch/return/terminal order.
  await expect(town).toHaveAttribute("data-town-motion", "none", { timeout: 15_000 });
  await expect(town.locator(".town-node-cairn")).toBeFocused();
  const doneEntries = await townMotionProbe(win);
  const cueSequence = uniqueTownCues(doneEntries);
  const dispatchCues = cueSequence.filter((cue) => cue.kind === "dispatch");
  const returnCues = cueSequence.filter((cue) => cue.kind === "return");
  const doneCues = cueSequence.filter((cue) => cue.kind === "done");
  expect(dispatchCues.length).toBeLessThanOrEqual(1);
  expect(returnCues).toHaveLength(1);
  expect(doneCues).toHaveLength(1);
  if (dispatchCues[0]) expect(cueSequence.indexOf(dispatchCues[0])).toBeLessThan(cueSequence.indexOf(returnCues[0]!));
  expect(cueSequence.indexOf(returnCues[0]!)).toBeLessThan(cueSequence.indexOf(doneCues[0]!));
  expect(motionsForCue(doneEntries, returnCues[0]!.key)).toEqual(["return-flight", "return-landing"]);
  expect(motionsForCue(doneEntries, doneCues[0]!.key)).toEqual(["done-landing"]);

  // Task 165's owner-facing sections keep the worker's account visibly below
  // Cairn's facts; the worker's own sentence and milestone answer stay inside
  // that labeled container, never in the verified fact list.
  const claims = card.locator(".result-card-claims");
  await expect(claims).toContainText("Worker's account — Cairn checked the files above, but not these descriptions");
  await expect(claims).toContainText("Added the visible result.");
  await expect(claims).toContainText("Milestone moved (worker's answer): YES");
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
  // Task 166 keeps an unspent proposal in trusted main-process state for Chat
  // reattachment. The proposal that started this run was consumed when main
  // accepted it, so reattachment must not put a spent card beside the run.
  await expect(win.locator(".task-card")).toHaveCount(0);
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
  // Task 166: a start refused because the routed worker disappeared never
  // spent its proposal. Main retains the trusted block, and a Chat remount
  // restores the retry card instead of losing it with the failed panel.
  const retainedProposal = await win.evaluate(async (dir) => {
    const id = (await window.cairn.conductorConversations(dir)).at(-1)?.id;
    return id ? window.cairn.conductorProposal(dir, id) : null;
  }, project);
  expect(retainedProposal).toMatchObject({
    outcome: "Change the page title",
    details: "Keep the counts 74, 477, 256 exactly.",
  });
  await win.getByRole("button", { name: /Project home/ }).click();
  await win.getByRole("button", { name: "Talk with Cairn" }).click();
  await expect(win.locator(".task-card")).toBeVisible();

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
  const comment = win.locator(".chat-messages .result-card ~ .bubble-cairn:not(.bubble-commentary)");
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

// Task 071 (review fix on 070) opened this window; Task 155 changed what
// happens in it. While the envelope's comment streams, main holds the
// project's one stream lock and the composer stays open — but a send made in
// that window no longer bounces off the lock (Task 071's refusal bubble). It
// waits VISIBLY: a dimmed bubble carries the exact words with a take-back,
// the composer clears for the next thought, and the queue flushes in order
// the moment the comment settles. No refusal, no phantom turn, no lost words.
test("a message sent while the comment streams waits visibly and sends itself when the lock frees", async () => {
  // Task 137's flake fix: the old 3s-per-chunk delay made the refusal window
  // LONG but still bounded — under load the comment could finish before the
  // message went out, and the refusal never happened. Holding the fixture's
  // stream at its gate makes the window unbounded and deterministic; the
  // release below lets the comment land for the second half.
  holdFixtureCommentary();
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

  // Task 153: the comment is VISIBLE while it streams — a labeled bubble with
  // no Stop — which is what makes the enabled composer honest. Before this,
  // it accumulated invisibly and every send bounced for no visible reason.
  await expect(win.getByText(/A short comment on the result card above/)).toBeVisible();

  // A send while the comment streams does not bounce — it waits. Two sends
  // queue in order, each a dimmed bubble carrying its exact words; the
  // composer clears for the next thought; nothing is refused, and no Stop
  // control is pointed at (the comment is not the owner's to stop).
  await sendChat(win, "Is that everything?");
  const waiting = win.locator(".bubble-pending");
  await expect(waiting).toHaveCount(1);
  await expect(waiting.first()).toContainText("Is that everything?");
  await expect(waiting.first()).toContainText("Will send when Cairn finishes.");
  await expect(win.getByPlaceholder("Talk with Cairn")).toHaveValue("");
  await sendChat(win, "And keep it short.");
  await expect(waiting).toHaveCount(2);
  await expect(win.locator(".bubble-system")).toHaveCount(0);
  await expect(win.getByRole("button", { name: "Stop", exact: true })).toHaveCount(0);

  // Queued words are not sent words: no settled owner bubble claims them. A
  // take-back returns the exact words to the composer, and the queue
  // shortens by exactly that message — nothing was clobbered or lost.
  await expect(win.locator(".bubble-owner:not(.bubble-pending)", { hasText: "Is that everything?" })).toHaveCount(0);
  await waiting.nth(1).getByRole("button", { name: "Take back" }).click();
  await expect(win.locator(".bubble-pending")).toHaveCount(1);
  await expect(win.getByPlaceholder("Talk with Cairn")).toHaveValue("And keep it short.");

  // Release the held comment: it settles, and the queue flushes ITSELF — no
  // Try again, no click. The streaming comment bubble (bubble-commentary)
  // unmounts as the settled turn lands; waiting for the caption to go is
  // what keeps the flush after the lock has really been released. The
  // waiting message then becomes a real owner turn with a real answer.
  releaseFixtureCommentary();
  await expect(win.getByText(/A short comment on the result card above/)).toHaveCount(0, { timeout: 30_000 });
  await expect(win.locator(".bubble-pending")).toHaveCount(0, { timeout: 30_000 });
  await expect(win.locator(".bubble-owner", { hasText: "Is that everything?" })).toHaveCount(1, { timeout: 30_000 });
  await waitStreamDone(win);
  // One "Sure, got it." answers the set-aside above; the second is the
  // flushed message's own reply — proof the queue really sent it.
  await expect(win.getByText("Sure, got it.")).toHaveCount(2);
  await expect(win.locator(".bubble-system")).toHaveCount(0);

  // On disk, exactly once — the queue sent it a single time, and the
  // taken-back message left no trace at all.
  const turns = await win.evaluate(async (dir) => {
    const list = await window.cairn.conductorConversations(dir);
    return window.cairn.conductorTurns(dir, list[list.length - 1].id);
  }, project);
  expect(turns.filter((turn) => turn.role === "owner" && turn.text === "Is that everything?").length).toBe(1);
  expect(turns.filter((turn) => turn.role === "owner" && turn.text === "And keep it short.").length).toBe(0);
  await app.close();
});

// Task 153: the owner's own report — "if Cairn wants to send to dispatch
// more than once during a chat, the button never appears." The wedge was the
// invisible commentary window (fixed above) plus the stale dispatched card
// lingering with its spent button; this pins the whole second cycle, mock
// lane both times.
test("later proposals after a dispatched run survive Chat reattachment", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-second-dispatch-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");

  // First proposal, resolved and dispatched to the offline demo.
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

  // The dispatched card leaves with its run: nothing stale offers to re-run
  // a task that already started.
  await expect(win.locator(".task-card")).toHaveCount(0);

  // The result card lands and the envelope's comment settles — after this
  // the stream lock is provably free for the next send.
  await expect(win.locator(".result-card")).toHaveCount(1, { timeout: 30_000 });
  await expect(win.locator(".chat-messages .result-card ~ .bubble-cairn:not(.bubble-commentary)")).toHaveCount(1, { timeout: 30_000 });

  // Task 166: collect main's parsed blocks, not the fixture model's own words.
  // This listener lives at the preload seam rather than inside Chat, so it
  // survives the navigation below and proves exactly what main emitted on its
  // done delta.
  await win.evaluate(() => {
    const state = globalThis as typeof globalThis & { task166Blocks?: unknown[] };
    state.task166Blocks = [];
    window.cairn.onConductorDelta((event) => {
      if (event.kind === "done" && event.taskBlock) state.task166Blocks?.push(event.taskBlock);
    });
  });

  // The second proposal in the SAME conversation gets its own card. Its two
  // concerns deliberately distinguish it from both neighboring proposals.
  await sendChat(win, "twoconcerns now");
  await waitStreamDone(win);
  const secondCard = win.locator(".task-card");
  await expect(secondCard).toBeVisible();
  await expect(secondCard.locator(".task-chip")).toHaveCount(2);
  await expect(secondCard.getByRole("button", { name: "Send to dispatch" })).toBeDisabled();

  // The reported conversation reached a third proposal after its first
  // dispatch. Leave Chat while that third reply is still live, then reattach:
  // this pins both the settled-card loss and the async done-during-restore race.
  holdFixtureThirdProposal();
  try {
    await sendChat(win, "detailtask third");
    await expect(win.getByRole("button", { name: "Stop", exact: true })).toBeVisible();
    await win.getByRole("button", { name: /Project home/ }).click();
    await win.getByRole("button", { name: "Talk with Cairn" }).click();
    await expect(win.getByRole("button", { name: "Stop", exact: true })).toBeVisible();
  } finally {
    releaseFixtureThirdProposal();
  }
  await waitStreamDone(win);
  // RED before Task 166: this remount discarded Chat's transient block even
  // though main emitted it. The restored card must be the third proposal, not
  // the first already dispatched or the superseded second one.
  const restoredCard = win.locator(".task-card");
  await expect(restoredCard).toBeVisible();
  await expect(restoredCard.locator(".task-chip")).toHaveCount(0);
  await expect(restoredCard).toContainText("74, 477, 256");
  await expect(restoredCard.getByRole("button", { name: "Send to dispatch" })).toBeEnabled();
  await expect.poll(() => win.evaluate(() => {
    const state = globalThis as typeof globalThis & { task166Blocks?: unknown[] };
    return state.task166Blocks?.length ?? 0;
  })).toBe(2);
  const mainBlocks = await win.evaluate(() => {
    const state = globalThis as typeof globalThis & { task166Blocks?: unknown[] };
    return state.task166Blocks ?? [];
  });
  expect(mainBlocks.at(-1)).toEqual({
    outcome: "Change the page title",
    concerns: [],
    notes: "",
    details: "74, 477, 256",
  });
  const mainProposal = await win.evaluate(async (dir) => {
    const id = (await window.cairn.conductorConversations(dir)).at(-1)?.id;
    return id ? window.cairn.conductorProposal(dir, id) : null;
  }, project);
  expect(mainProposal).toEqual(mainBlocks.at(-1));

  // Dispatch the restored third proposal. This remains the second run, so the
  // folding assertions below still prove the two-card history.
  const restoredSend = restoredCard.getByRole("button", { name: "Send to dispatch" });
  await restoredSend.click();
  await expect(win.locator(".dispatch-panel")).toBeVisible({ timeout: 15_000 });
  await win.locator(".dispatch-panel").getByRole("button", { name: "Run offline demonstration" }).click();
  await expect(win.locator(".task-card")).toHaveCount(0);
  await expect.poll(() => win.evaluate(async (dir) => {
    const id = (await window.cairn.conductorConversations(dir)).at(-1)?.id;
    return id ? window.cairn.conductorProposal(dir, id) : null;
  }, project)).toBeNull();

  // Task 155 (fold away the past): when the second run's card lands, the
  // first collapses into a one-line chip — only the current moment stays
  // expanded. The chip's arrival is also this test's second-run gate: it
  // exists only once two cards do.
  const folded = win.locator(".result-card-folded");
  await expect(folded).toHaveCount(1, { timeout: 30_000 });
  await expect(win.locator(".result-card")).toHaveCount(1);
  await expect(folded).toContainText("DONE");
  await expect(folded).toContainText("Task 001");
  await expect(folded).toHaveAttribute("aria-expanded", "false");
  // It toggles: the old card opens on tap, and folds away again.
  await folded.click();
  await expect(win.locator(".result-card")).toHaveCount(2);
  await expect(folded).toHaveAttribute("aria-expanded", "true");
  await folded.click();
  await expect(win.locator(".result-card")).toHaveCount(1);
  await app.close();
});

// Task 155 (queue instead of bounce), mock lane — the same queue in the
// window Task 071 never had: an ORDINARY reply streaming. The composer stays
// open (before this task it was disabled mid-reply), a send waits visibly,
// and it flushes itself when the first reply lands.
test("a message sent while a reply streams queues and flushes when the reply lands", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-reply-queue-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");

  await sendChat(win, "slowstream");
  await expect(win.getByText(/One moment/)).toBeVisible({ timeout: 10_000 });
  // Open mid-reply: the queue is what makes a send right now honest.
  await expect(win.getByPlaceholder("Talk with Cairn")).toBeEnabled();

  await sendChat(win, "And then summarize.");
  const waiting = win.locator(".bubble-pending");
  await expect(waiting).toHaveCount(1);
  await expect(waiting.first()).toContainText("And then summarize.");
  await expect(waiting.first()).toContainText("Will send when Cairn finishes.");

  // The first reply lands, the queue flushes itself, and the waiting message
  // becomes a real owner turn with its own answer — nothing refused.
  await expect(win.getByText(/done thinking\./)).toBeVisible({ timeout: 15_000 });
  await expect(win.locator(".bubble-pending")).toHaveCount(0, { timeout: 15_000 });
  await expect(win.locator(".bubble-owner", { hasText: "And then summarize." })).toHaveCount(1, { timeout: 15_000 });
  await waitStreamDone(win);
  await expect(win.getByText("Sure, got it.")).toBeVisible();
  await expect(win.locator(".bubble-system")).toHaveCount(0);
  await app.close();
});

// Task 155 (needs-you dot), mock lane. Tucked away while a proposed task
// waits unanswered, the chip itself says a decision is waiting: the dot is
// on it and its accessible name says so — the owner never has to open the
// dialog to find out.
test("the tucked chip carries a needs-you dot while a decision waits inside", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-needsyou-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");

  // Nothing waiting yet: no dot, and the plain accessible name.
  await win.getByRole("button", { name: "Tuck the conversation away" }).click();
  const chip = win.locator(".chat-villager-chip");
  await expect(chip).toBeVisible();
  await expect(win.locator(".chat-villager-chip-dot")).toHaveCount(0);
  await expect(chip).toHaveAttribute("aria-label", "Open the conversation with Cairn");
  // The chip bobs on a loop, so its box never sits still for Playwright's
  // stability check — force skips that wait for the click only.
  await chip.click({ force: true });
  await expect(win.getByRole("button", { name: "Tuck the conversation away" })).toBeVisible();

  // A proposed task with an unanswered risk chip is a waiting decision.
  await sendChat(win, "Change the page title");
  await waitStreamDone(win);
  await expect(win.locator(".task-card")).toBeVisible();

  await win.getByRole("button", { name: "Tuck the conversation away" }).click();
  await expect(chip).toBeVisible();
  await expect(win.locator(".chat-villager-chip-dot")).toBeVisible();
  await expect(chip).toHaveAttribute("aria-label", "Open the conversation with Cairn — a decision is waiting for you");

  // Dot or no, the chip still opens the conversation — and the waiting
  // decision is right there.
  await chip.click({ force: true });
  await expect(win.locator(".task-card")).toBeVisible();
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
  await expect(win.locator(".chat-messages .result-card ~ .bubble-cairn:not(.bubble-commentary)")).toHaveCount(1, { timeout: 30_000 });
  await expect(win.locator(".push-chip")).toHaveCount(0);
  await expect(win.locator(".push-confirm")).toHaveCount(0);
  await expect(win.getByText("Push?", { exact: false })).toHaveCount(0);
  expect(aheadCount(project)).toBe("1");
  await app.close();
});

// Task 157 (the owner's request): when a task completes, Cairn's comment is
// followed by up to three follow-up suggestions as tappable chips. A tap is
// not a dispatch — it sends the suggestion as the owner's own message, so the
// ordinary conversation (and every one of its gates) decides what happens
// next. Mock lane, offline demonstration.
test("the comment's follow-up suggestions render as chips, and a tap sends one as the owner's message", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-conductor-followups-"));
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

  // The card, then the settled comment, then — under it — the chips.
  await expect(win.locator(".result-card")).toBeVisible({ timeout: 30_000 });
  await expect(win.locator(".chat-messages .result-card ~ .bubble-cairn:not(.bubble-commentary)")).toHaveCount(1, { timeout: 30_000 });
  const chips = win.locator(".followup-chip");
  await expect(chips).toHaveCount(2, { timeout: 15_000 });
  await expect(chips.nth(0)).toHaveText("Show me how to try this myself");
  await expect(chips.nth(1)).toHaveText("Pick the next small improvement");
  // The comment's visible text carries no fence, and nothing dispatched:
  // there is exactly the one card this run already had.
  await expect(win.locator(".chat-messages")).not.toContainText("cairn-followups");
  await expect(win.locator(".result-card")).toHaveCount(1);

  // A tap sends the suggestion verbatim as the owner's own message. The
  // chips step aside the moment the conversation moves on — they only ever
  // hang on the latest word.
  await chips.nth(0).click();
  const sent = win.locator(".bubble-owner", { hasText: "Show me how to try this myself" });
  await expect(sent).toHaveCount(1);
  await expect(win.locator(".followup-chip")).toHaveCount(0);
  await waitStreamDone(win);

  // On disk: the commentary turn carries the suggestions (so a reload can
  // re-render them), and the tapped one is an ordinary owner turn, verbatim.
  const turns = await win.evaluate(async (dir) => {
    const list = await window.cairn.conductorConversations(dir);
    return window.cairn.conductorTurns(dir, list[list.length - 1].id);
  }, project);
  const comment = turns.find((turn) => turn.role === "cairn" && turn.text.includes("The card says this task finished DONE"));
  expect(comment?.role).toBe("cairn");
  if (comment?.role === "cairn") {
    expect(comment.followups).toEqual(["Show me how to try this myself", "Pick the next small improvement"]);
  }
  expect(turns.filter((turn) => turn.role === "owner" && turn.text === "Show me how to try this myself")).toHaveLength(1);
  await app.close();
});
