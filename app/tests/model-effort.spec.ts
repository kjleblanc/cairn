import { _electron as electron, expect, test } from "@playwright/test";
import type { ElectronApplication, Page } from "playwright-core";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const CLAUDE_IDS = [
  "claude-fable-5",
  "claude-opus-4-8",
  "claude-opus-4-7",
  "claude-opus-4-6",
  "claude-sonnet-5",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
] as const;

const OPENAI_PREVIEW_IDS = [
  "gpt-5.6-sol",
  "gpt-5.6-terra",
  "gpt-5.6-luna",
  "gpt-5.5",
  "gpt-5.3-codex-spark",
] as const;

function scaffold(project: string, name: string): void {
  const core = pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
  execFileSync(process.execPath, [
    "--input-type=module",
    "-e",
    `import { initProject } from ${JSON.stringify(core)}; initProject(process.argv[1], { name: process.argv[2], what: "w", who: "me", milestone: "see it", timebox: "default" });`,
    project,
    name,
  ]);
}

function isInside(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`));
}

async function launchIsolated(root: string, profile: string, project: string,
  extraEnv: Record<string, string> = {}): Promise<{ app: ElectronApplication; win: Page }> {
  const app = await electron.launch({
    args: [".", `--user-data-dir=${profile}`],
    env: { ...process.env, CAIRN_MOCK: "1", CAIRN_OPEN: project, ...extraEnv },
  });
  try {
    const paths = await app.evaluate(({ app: electronApp }) => ({
      userData: electronApp.getPath("userData"),
      sessionData: electronApp.getPath("sessionData"),
    }));
    expect(isInside(root, paths.userData)).toBe(true);
    expect(isInside(root, paths.sessionData)).toBe(true);

    const win = await app.firstWindow();
    await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible({ timeout: 30000 });
    return { app, win };
  } catch (error) {
    await app.close().catch(() => undefined);
    throw error;
  }
}

async function seedClaude(win: Page, model: string, effort: string): Promise<void> {
  await win.evaluate(({ model, effort }) => {
    localStorage.setItem("cairn-model", model);
    localStorage.setItem("cairn-effort", effort);
    sessionStorage.clear();
  }, { model, effort });
  await win.reload();
  await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible({ timeout: 30000 });
}

async function storageSnapshot(win: Page): Promise<string> {
  return win.evaluate(() => JSON.stringify(
    Object.keys(localStorage).sort().map((key) => [key, localStorage.getItem(key)]),
  ));
}

async function runUntilMockEcho(win: Page, outcome: string, expected: string): Promise<void> {
  await win.getByRole("button", { name: "Start a task" }).click();
  await win.getByPlaceholder("The home page shows my list of books").fill(outcome);
  await win.getByRole("button", { name: "Write the brief" }).click();
  await expect(win.locator(".feed div", { hasText: expected }).first()).toBeVisible({ timeout: 15000 });

  // Let the offline definer finish cleanly before closing this disposable app.
  await expect(win.getByRole("button", { name: "Skip — let the AI use its judgment" })).toBeVisible({ timeout: 15000 });
  await win.getByRole("button", { name: "Skip — let the AI use its judgment" }).click();
  await expect(win.getByRole("button", { name: "Approve this exact brief" })).toBeVisible({ timeout: 15000 });
}

test("provider-aware chooser fixes Fable filtering and keeps OpenAI mock-session-only", async () => {
  test.setTimeout(240000);

  const root = mkdtempSync(join(tmpdir(), "cairn-model-effort-"));
  let activeApp: ElectronApplication | null = null;
  try {
    const profile = join(root, "profile");
    const cancelProject = join(root, "cancel-project");
    const anthropicProject = join(root, "anthropic-project");
    const openaiProject = join(root, "openai-project");
    for (const dir of [profile, cancelProject, anthropicProject, openaiProject]) mkdirSync(dir);
    scaffold(cancelProject, "Cancel model changes");
    scaffold(anthropicProject, "Anthropic model changes");
    scaffold(openaiProject, "OpenAI preview changes");

    // Blank saved keys still report the environment-resolved active values,
    // rather than claiming the built-in defaults while the engine differs.
    let launched = await launchIsolated(root, profile, cancelProject, {
      CAIRN_MODEL: "claude-haiku-4-5",
      CAIRN_EFFORT: "max",
    });
    activeApp = launched.app;
    let win = launched.win;
    await win.evaluate(() => {
      localStorage.removeItem("cairn-model");
      localStorage.removeItem("cairn-effort");
      sessionStorage.clear();
    });
    await win.reload();
    await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible({ timeout: 30000 });
    const defaultCard = win.locator(".card", { hasText: "model & effort" });
    await expect(defaultCard.locator(".model-summary-name")).toContainText("Claude Haiku 4.5");
    await expect(defaultCard.getByText("claude-haiku-4-5", { exact: true })).toBeVisible();
    await expect(defaultCard.getByText("Thinking effort: Maximum", { exact: true })).toBeVisible();

    // Fable remains selected without becoming the search term: blank search
    // exposes every accepted Claude model, while a typed search narrows the list.
    await seedClaude(win, "claude-fable-5", "medium");
    const cancelSnapshot = await storageSnapshot(win);
    const chooserCard = win.locator(".card", { hasText: "model & effort" });
    await chooserCard.getByRole("button", { name: "Change" }).click();

    const claudeGroup = chooserCard.getByRole("radiogroup", { name: /Anthropic.*models/ });
    await expect(claudeGroup.getByRole("radio")).toHaveCount(7);
    for (const id of CLAUDE_IDS) await expect(claudeGroup.getByText(id, { exact: true })).toBeVisible();
    await expect(claudeGroup.getByRole("radio", { name: /Claude Fable 5/ })).toHaveAttribute("aria-checked", "true");

    await chooserCard.getByPlaceholder("Search models…").fill("sonnet");
    await expect(claudeGroup.getByRole("radio")).toHaveCount(2);
    await claudeGroup.getByRole("radio", { name: /Claude Sonnet 4.6/ }).click();
    await chooserCard.getByPlaceholder("Search models…").fill("");
    await expect(claudeGroup.getByRole("radio")).toHaveCount(7);
    await chooserCard.getByRole("button", { name: "Maximum" }).click();

    // A fixture GPT id cannot be smuggled through Anthropic's custom-id path,
    // even in mock mode; the same guard therefore protects a non-mock run.
    await chooserCard.getByText("Advanced: specific model ID", { exact: true }).click();
    await chooserCard.getByLabel("Specific model ID").fill("gpt-5.5");
    await chooserCard.getByRole("button", { name: "Use this setup" }).click();
    await expect(chooserCard.getByRole("alert")).toContainText("cannot be saved as an Anthropic model");
    expect(await storageSnapshot(win)).toBe(cancelSnapshot);
    await chooserCard.getByRole("button", { name: "Cancel" }).click();

    await expect(chooserCard.getByText("Claude Fable 5", { exact: true })).toBeVisible();
    await expect(chooserCard.getByText("Thinking effort: Medium", { exact: true })).toBeVisible();
    expect(await storageSnapshot(win)).toBe(cancelSnapshot);
    await runUntilMockEcho(win, "Cancel keeps the active setup", "Using model: claude-fable-5 · effort: medium (mock)");
    await activeApp.close();
    activeApp = null;

    // Applying Anthropic still uses the original durable keys and reaches the
    // existing provider-neutral mock engine through the original IPC bridge.
    launched = await launchIsolated(root, profile, anthropicProject);
    activeApp = launched.app;
    win = launched.win;
    await seedClaude(win, "claude-fable-5", "medium");
    const anthropicCard = win.locator(".card", { hasText: "model & effort" });
    await anthropicCard.getByRole("button", { name: "Change" }).click();
    await anthropicCard.getByRole("radio", { name: /Claude Sonnet 5/ }).click();
    await anthropicCard.getByRole("button", { name: "High", exact: true }).click();
    await anthropicCard.getByRole("button", { name: "Use this setup" }).click();
    await expect(anthropicCard.getByRole("button", { name: "Change" })).toBeVisible();
    expect(await win.evaluate(() => ({
      model: localStorage.getItem("cairn-model"),
      effort: localStorage.getItem("cairn-effort"),
    }))).toEqual({ model: "claude-sonnet-5", effort: "high" });
    await expect(anthropicCard.getByText("Claude Sonnet 5", { exact: true })).toBeVisible();
    await runUntilMockEcho(win, "Anthropic setup reaches the mock engine", "Using model: claude-sonnet-5 · effort: high (mock)");
    await activeApp.close();
    activeApp = null;

    // OpenAI rows are fixture data only. Capability changes reset an unsupported
    // effort before apply; applying touches sessionStorage but not one durable byte.
    launched = await launchIsolated(root, profile, openaiProject);
    activeApp = launched.app;
    win = launched.win;
    await seedClaude(win, "claude-sonnet-5", "high");
    const durableBeforePreview = await storageSnapshot(win);
    const previewCard = win.locator(".card", { hasText: "model & effort" });
    await previewCard.getByRole("button", { name: "Change" }).click();
    await previewCard.getByRole("button", { name: /OpenAI/ }).click();
    await expect(previewCard.getByText("Mock preview · not connected", { exact: true })).toBeVisible();
    await expect(previewCard.getByText(/No OpenAI provider, login, or model call is connected/)).toBeVisible();

    const openaiGroup = previewCard.getByRole("radiogroup", { name: /OpenAI.*models/ });
    await expect(openaiGroup.getByRole("radio")).toHaveCount(5);
    for (const id of OPENAI_PREVIEW_IDS) await expect(openaiGroup.getByText(id, { exact: true })).toBeVisible();
    await openaiGroup.getByRole("radio", { name: /GPT-5.6-Sol/ }).click();
    await previewCard.getByRole("button", { name: "Ultra", exact: true }).click();
    await openaiGroup.getByRole("radio", { name: /GPT-5.6-Luna/ }).click();
    await expect(previewCard.getByRole("status")).toContainText("staged choice is now Automatic");
    await expect(previewCard.getByRole("button", { name: /Automatic — the model decides/ })).toHaveAttribute("aria-pressed", "true");

    await openaiGroup.getByRole("radio", { name: /^GPT-5.5/ }).click();
    await previewCard.getByRole("button", { name: "Extra high", exact: true }).click();
    await previewCard.getByRole("button", { name: "Use this setup" }).click();
    await expect(previewCard.getByRole("button", { name: "Change" })).toBeVisible();
    await expect(previewCard.locator(".model-provider-name")).toContainText("OpenAI (Codex / ChatGPT account)");
    await expect(previewCard.getByText("GPT-5.5", { exact: true })).toBeVisible();
    expect(await storageSnapshot(win)).toBe(durableBeforePreview);
    expect(await win.evaluate(() => ({
      provider: sessionStorage.getItem("cairn-preview-provider"),
      model: sessionStorage.getItem("cairn-preview-model"),
      effort: sessionStorage.getItem("cairn-preview-effort"),
    }))).toEqual({ provider: "openai", model: "gpt-5.5", effort: "xhigh" });

    // A renderer reload preserves sessionStorage. Boot and summary must restore
    // the same preview, so the next mock echo cannot silently fall back to Claude.
    await win.reload();
    await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible({ timeout: 30000 });
    const reloadedPreviewCard = win.locator(".card", { hasText: "model & effort" });
    await expect(reloadedPreviewCard.locator(".model-provider-name")).toContainText("OpenAI (Codex / ChatGPT account)");
    await expect(reloadedPreviewCard.getByText("GPT-5.5", { exact: true })).toBeVisible();
    await expect(reloadedPreviewCard.getByText("Thinking effort: Extra high", { exact: true })).toBeVisible();
    await runUntilMockEcho(win, "OpenAI stays an offline preview", "Using model: gpt-5.5 · effort: xhigh (mock)");
    await activeApp.close();
    activeApp = null;

    // A full Electron restart creates a new window session, so the preview is
    // absent. The built file:// harness does not reliably flush localStorage;
    // reseeding the already-proven durable values exercises the return path.
    launched = await launchIsolated(root, profile, openaiProject);
    activeApp = launched.app;
    win = launched.win;
    expect(await win.evaluate(() => [
      sessionStorage.getItem("cairn-preview-provider"),
      sessionStorage.getItem("cairn-preview-model"),
      sessionStorage.getItem("cairn-preview-effort"),
    ])).toEqual([null, null, null]);
    expect(await win.evaluate(() => localStorage.getItem("cairn-model") ?? "")).not.toContain("gpt-");
    await seedClaude(win, "claude-sonnet-5", "high");
    const restartCard = win.locator(".card", { hasText: "model & effort" });
    await expect(restartCard.getByText("Anthropic (Claude Code)", { exact: true })).toBeVisible();
    await expect(restartCard.getByText("Claude Sonnet 5", { exact: true })).toBeVisible();
    await expect(restartCard.getByText("Thinking effort: High", { exact: true })).toBeVisible();
  } finally {
    if (activeApp) await activeApp.close().catch(() => undefined);
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    expect(existsSync(root)).toBe(false);
  }
});
