import { _electron as electron, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { detachStoredConnection, restoreStoredConnection } from "./fixtures/conductor-connection";

// Task 098: the Kimi subscription seat renders as a curated brain with
// consent wording that tells the plan truth. This spec NEVER clicks Connect:
// the seat's base URL is the real https://api.kimi.com/coding/v1, so a
// connect would be a real call against the owner's membership. Rendering is
// what is under test — the consent card is derived in main with no network —
// and the fixture connect flow in conductor.spec.ts already proves the
// connect path itself end to end.
//
// The scaffold/baseEnv helpers mirror conductor.spec.ts's local ones: a
// governed project boots straight into chat with the connect card on screen.

function scaffold(project: string, name = "Kimi seat"): void {
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

test.beforeAll(() => {
  detachStoredConnection();
});

test.afterAll(() => {
  restoreStoredConnection();
});

test("the Kimi subscription seat shows plan-truth consent wording and the console guide", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-connect-kimi-"));
  scaffold(project);
  const app = await electron.launch({ args: ["."], env: baseEnv(project) });
  const win = await app.firstWindow();

  const card = win.locator(".card", { hasText: "connect cairn's brain" });
  await expect(card).toBeVisible({ timeout: 30_000 });

  // The picker lists the subscription seat alongside the OpenRouter brains.
  await win.getByRole("button", { name: "Choose a different brain" }).click();
  const picker = win.locator(".card", { hasText: "choose a different brain" });
  await expect(picker).toBeVisible();
  await expect(picker).toContainText("Kimi — your subscription");
  await picker.getByRole("button", { name: /Kimi — your subscription/ }).click();

  // The seat fixes the base URL and model itself — no free-text fields — and
  // every word the owner reads is the subscription truth, derived in main.
  await expect(card.locator('input[type="text"]')).toHaveCount(0);
  await expect(card).toContainText("Paste your Kimi Code key");
  await expect(card).toContainText("Connecting with Kimi — your subscription");
  await expect(card).toContainText("Kimi membership's included coding quota");
  await expect(card).toContainText("uses my Kimi membership's quota, which Cairn cannot see");
  await expect(card).not.toContainText("Pay-as-you-go");
  await expect(card).not.toContainText("costs money on my account");

  // The key guide points at the real console, in plain words.
  await win.getByRole("button", { name: "Where do I get a key?" }).click();
  const guide = win.locator(".card", { hasText: "where do I get a key?" });
  await expect(guide).toBeVisible();
  await expect(guide).toContainText("Open the Kimi Code Console and sign in with your Kimi account.");
  await expect(guide).toContainText("shown only once");
  await expect(guide.getByRole("button", { name: "Open the Kimi Code Console" })).toBeVisible();
  await guide.getByRole("button", { name: "Back" }).click();

  // Connect stays blocked until consent is checked — unchanged gate, no call.
  await expect(win.getByRole("button", { name: "Connect" })).toBeDisabled();

  await app.close();
});
