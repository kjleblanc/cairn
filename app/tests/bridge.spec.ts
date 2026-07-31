import { _electron as electron, expect, type Page } from "@playwright/test";
import { test } from "./fixtures/isolated-profile";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Task 143: the phone flow, end to end, against the REAL built app and its
 * REAL LAN listener. The "phone" is a second BrowserWindow pointed at the
 * address the desktop shows — a genuine Chromium page load of the bridge's
 * self-contained page, so the pairing form, the SSE live updates, and the
 * revoked-device landing all run the exact code the owner's phone will.
 */

function scaffold(project: string, name: string): void {
  const core = pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
  execFileSync(process.execPath, [
    "--input-type=module", "-e",
    `import { initProject } from ${JSON.stringify(core)}; initProject(process.argv[1], { name: process.argv[2], what: "w", who: "me", milestone: "see it" });`,
    project,
    name,
  ]);
}

function baseEnv(project: string): { [key: string]: string } {
  const env: { [key: string]: string } = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
  env.CAIRN_MOCK = "1";
  env.CAIRN_OPEN = project;
  return env;
}

// The same custom-seat connect path conductor.spec.ts drives (Task 137's
// quiet card): Choose a different brain → Custom… → URL, model, key,
// checkbox, Connect.
async function connectToFixture(win: Page, fixtureUrl: string, model: string): Promise<void> {
  const card = win.locator(".card", { hasText: "connect cairn's brain" });
  await expect(card).toBeVisible({ timeout: 30_000 });
  await win.getByRole("button", { name: "Choose a different brain" }).click();
  await win.getByRole("button", { name: "Custom…" }).click();
  await card.locator('input[type="text"]').first().fill(fixtureUrl);
  await win.getByPlaceholder("e.g. moonshotai/kimi-k3").fill(model);
  await win.getByPlaceholder("Stored encrypted; shown never again").fill("sk-test-key");
  await card.locator('input[type="checkbox"]').check();
  await win.getByRole("button", { name: "Connect" }).click();
  await expect(card).not.toBeVisible({ timeout: 10_000 });
}

test.describe.configure({ mode: "serial" });

let fixtureUrl = "";
let fixtureClose: () => Promise<void> = async () => {};

test.beforeAll(async () => {
  const fixturePath = pathToFileURL(join(__dirname, "fixtures", "fake-conductor.mjs")).href;
  const fixture = (await import(fixturePath)) as {
    start: () => Promise<{ url: string; close: () => Promise<void> }>;
  };
  const server = await fixture.start();
  fixtureUrl = server.url;
  fixtureClose = server.close;
});

test.afterAll(async () => {
  await fixtureClose();
});

test("pair and read: the phone watches the conversation live, and unpairing cuts it off", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-bridge-e2e-"));
  scaffold(project, "Bridge");
  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();
  await connectToFixture(win, fixtureUrl, "fixture-model");

  // The desktop's pairing surface: Project home → Settings → pair a phone.
  await win.getByRole("button", { name: "← Project home" }).click();
  await expect(win.getByRole("heading", { name: "Bridge" })).toBeVisible();
  await win.locator("button.pill", { hasText: "Settings" }).click();
  await win.getByRole("button", { name: "Show a pairing code" }).click();

  // What the owner reads off the screen: the code and the address.
  const codeText = await win.locator("p.mono", { hasText: /^\d{6}$/ }).textContent();
  const address = (await win.locator("span.mono", { hasText: "http://" }).first().textContent()) ?? "";
  expect(codeText).toMatch(/^\d{6}$/);
  expect(address).toMatch(/^http:\/\/\d+\.\d+\.\d+\.\d+:\d+$/);
  // The disclosure sentence is on the pairing screen, verbatim.
  await expect(win.getByText("Traffic stays inside your home Wi-Fi and is not encrypted in v1; don't pair on a network you don't control.")).toBeVisible();

  // The phone: a second window pointed at the shown address.
  await app.evaluate(({ BrowserWindow }, url) => {
    const phone = new BrowserWindow({ width: 390, height: 700 });
    void phone.loadURL(url);
  }, address);
  const phone = await app.waitForEvent("window");
  const codeInput = phone.getByPlaceholder("000000");
  await expect(codeInput).toBeVisible({ timeout: 15_000 });

  // A wrong code gets the one refusal, and the form stays put.
  const wrong = codeText === "999999" ? "999998" : "999999";
  await codeInput.fill(wrong);
  await phone.getByRole("button", { name: "Pair" }).click();
  await expect(phone.getByText("That code didn't work. Ask the computer for a new one.")).toBeVisible();

  // The right code pairs: the phone lands on the live conversation view.
  await codeInput.fill(codeText ?? "");
  await phone.getByPlaceholder("A name for this phone (optional)").fill("E2E phone");
  await phone.getByRole("button", { name: "Pair" }).click();
  await expect(phone.getByText("No conversation yet. Start one on the computer and it will appear here.")).toBeVisible({ timeout: 10_000 });
  await expect(phone.locator("header .where")).toHaveText("Bridge");
  await expect(phone.getByText("Read-only for now — sending from the phone comes in a later Cairn update.")).toBeVisible();

  // The desktop's device list shows the new phone on its own (the settings
  // surface polls while a code is live).
  await expect(win.getByText("E2E phone")).toBeVisible({ timeout: 10_000 });

  // A message sent on the DESKTOP appears on the phone without any reload.
  // (Closing the overlay lands on the project home; chat is one click in.)
  await win.keyboard.press("Escape");
  await win.getByRole("button", { name: "Talk with Cairn" }).click();
  await win.getByPlaceholder("Talk with Cairn").fill("hello from the desktop");
  await win.getByRole("button", { name: "Send", exact: true }).click();
  await expect(phone.getByText("hello from the desktop")).toBeVisible({ timeout: 15_000 });
  await expect(phone.getByText("Sure, got it.")).toBeVisible({ timeout: 15_000 });

  // Unpairing on the desktop cuts the phone off: its stream ends and the
  // page lands back on pairing with the honest note.
  await win.getByRole("button", { name: "← Project home" }).click();
  await win.locator("button.pill", { hasText: "Settings" }).click();
  await win.getByRole("button", { name: "Unpair" }).click();
  await expect(phone.getByText("This device was unpaired from the computer. Pair again to keep watching.")).toBeVisible({ timeout: 15_000 });

  // The one refusal answer, pinned at the API level too.
  const refused = await fetch(`${address}/api/state`, { headers: { cookie: "cairn_device=forged" } });
  expect(refused.status).toBe(401);
  expect(await refused.text()).toBe("This device isn't paired with this computer.");

  await app.close();
});
