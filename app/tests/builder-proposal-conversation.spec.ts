import { _electron as electron, expect, test, type ElectronApplication, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const TITLE = "Builder proposal \u2014 not applied";
const BEFORE = "export const greeting = '<script>syntheticBefore()</script>';\n";
const AFTER = "export const greeting = '<img src=x onerror=syntheticAfter()>';\n";
const SUMMARY = "Builder **suggests** one fixed synthetic replacement; [nothing opens](https://invalid.example).";
const OUTPUT_DIR = resolve(__dirname, "..", "test-results", "task231-builder-conversation");
const NORMAL_SCREENSHOT = join(OUTPUT_DIR, "task231-builder-conversation-normal.png");
const COMPACT_SCREENSHOT = join(OUTPUT_DIR, "task231-builder-conversation-compact.png");

function scaffold(project: string): void {
  const core = pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "files.js")).href;
  execFileSync(process.execPath, [
    "--input-type=module", "-e",
    `import { scaffoldProject } from ${JSON.stringify(core)}; scaffoldProject(process.argv[1], { name: "Task 231 synthetic Builder review", what: "show one fixed inert proposal", who: "Cairn maintainers", milestone: "one local display turn" });`,
    project,
  ]);
}

function launch(project: string, profile: string): Promise<ElectronApplication> {
  const env = Object.fromEntries(Object.entries(process.env)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  for (const key of ["CAIRN_TEST_Q9", "CAIRN_Q9_SCENARIO", "CAIRN_Q9_CUT", "CAIRN_TEST_CRITIC_CALIBRATION"]) delete env[key];
  return electron.launch({
    args: ["."],
    env: {
      ...env,
      CAIRN_E2E: "1",
      CAIRN_MOCK: "1",
      CAIRN_TEST_BUILDER_REVIEW: "1",
      CAIRN_TEST_USER_DATA: profile,
      CAIRN_OPEN: project,
    },
  });
}

type OwnedDirectory = Readonly<{ path: string; real: string; dev: bigint; ino: bigint }>;

function ownedTemp(prefix: string): OwnedDirectory {
  const path = mkdtempSync(join(tmpdir(), prefix));
  const real = realpathSync.native(path);
  const stat = lstatSync(real, { bigint: true });
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.dev <= 0n || stat.ino <= 0n) {
    throw new Error("TASK231_OWNED_TEMP_UNSAFE");
  }
  return Object.freeze({ path, real, dev: stat.dev, ino: stat.ino });
}

function removeOwnedTemp(owned: OwnedDirectory): void {
  const currentReal = realpathSync.native(owned.path);
  const current = lstatSync(currentReal, { bigint: true });
  const tempRoot = realpathSync.native(tmpdir());
  const expectedPrefix = join(tempRoot, "cairn-task231-");
  if (currentReal !== owned.real || !current.isDirectory() || current.isSymbolicLink()
    || current.dev !== owned.dev || current.ino !== owned.ino || !currentReal.startsWith(expectedPrefix)) {
    throw new Error(`TASK231_OWNED_TEMP_CHANGED: retained ${owned.path}`);
  }
  rmSync(owned.real, { recursive: true, force: false });
}

async function closeAndConfirm(application: ElectronApplication): Promise<void> {
  const child = application.process();
  await application.close();
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolveExit, rejectExit) => {
    const timer = setTimeout(() => {
      cleanup();
      rejectExit(new Error("TASK231_ELECTRON_DID_NOT_EXIT"));
    }, 10_000);
    const cleanup = () => {
      clearTimeout(timer);
      child.off("exit", onExit);
      child.off("error", onError);
    };
    const onExit = () => { cleanup(); resolveExit(); };
    const onError = (error: Error) => { cleanup(); rejectExit(error); };
    child.once("exit", onExit);
    child.once("error", onError);
    if (child.exitCode !== null || child.signalCode !== null) onExit();
  });
}

function treeFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const output: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push(...treeFiles(path));
    else if (entry.isFile()) output.push(path);
  }
  return output;
}

async function visibleUiState(page: Page) {
  return page.evaluate(() => {
    const active = document.activeElement;
    return {
      active: active ? `${active.tagName}:${active.id}:${active.className}` : "none",
      buttons: document.querySelectorAll("button").length,
      links: document.querySelectorAll("a").length,
      forms: document.querySelectorAll("form").length,
      inputs: document.querySelectorAll("input").length,
      textareas: document.querySelectorAll("textarea").length,
      taskCards: document.querySelectorAll(".task-card").length,
      dispatchPanels: document.querySelectorAll(".dispatch-panel").length,
      resultCards: document.querySelectorAll(".result-card").length,
      runStrips: document.querySelectorAll(".run-strip").length,
      followups: document.querySelectorAll(".followups").length,
      composers: document.querySelectorAll(".chat-composer").length,
      localStorage: Object.entries(localStorage).sort(([left], [right]) => left.localeCompare(right)),
      sessionStorage: Object.entries(sessionStorage).sort(([left], [right]) => left.localeCompare(right)),
      cookie: document.cookie,
      windowName: window.name,
    };
  });
}

async function assertInertCard(page: Page): Promise<void> {
  const card = page.locator(".builder-proposal-review");
  await expect(card).toHaveCount(1);
  await expect(card.getByRole("heading", { name: TITLE, exact: true })).toBeVisible();
  await expect(card).toContainText("Proposal only \u2014 Cairn has not applied, executed, published, or verified this suggestion.");
  await expect(card).toContainText("Nothing changed. No command ran.");
  await expect(card).toContainText("whether the selected text is still current");
  await expect(card).toContainText("whether the proposal is correct");
  await expect(card).toContainText("whether it can be applied safely");
  await expect(card).toContainText(SUMMARY);
  await expect(card).toContainText("examples/synthetic/greeting.ts");
  await expect(card).toContainText(BEFORE.trim());
  await expect(card).toContainText(AFTER.trim());

  const forbidden = await card.evaluate((node) => {
    const bannedTags = new Set([
      "A", "BUTTON", "FORM", "INPUT", "TEXTAREA", "SELECT", "OPTION", "LABEL", "DETAILS", "SUMMARY",
      "IFRAME", "OBJECT", "EMBED", "AUDIO", "VIDEO", "CANVAS", "IMG", "SVG", "STYLE", "SCRIPT",
    ]);
    return [...node.querySelectorAll("*")].flatMap((element) => {
      const badAttributes = [...element.attributes]
        .map((attribute) => attribute.name)
        .filter((name) => /^on/iu.test(name)
          || ["href", "src", "style", "tabindex", "contenteditable", "role", "for", "action", "formaction", "target"].includes(name));
      return bannedTags.has(element.tagName) || badAttributes.length > 0
        ? [`${element.tagName}:${badAttributes.join(",")}`]
        : [];
    });
  });
  expect(forbidden).toEqual([]);
  await expect(card.locator("button, a, input, textarea, select, [tabindex], [role], [href], [src], [style]")).toHaveCount(0);
}

async function fitWholeCardForEvidence(
  application: ElectronApplication,
  page: Page,
  width: number,
  height: number,
): Promise<void> {
  await application.evaluate(({ BrowserWindow }, size) => {
    BrowserWindow.getAllWindows()[0]?.setSize(size.width, size.height);
  }, { width, height });
  await expect.poll(() => page.evaluate(() => window.innerWidth)).toBeLessThanOrEqual(width);
  await expect.poll(() => page.evaluate(() => window.innerHeight)).toBeGreaterThan(height - 100);
  await expect.poll(() => page.locator(".builder-proposal-review").evaluate((node) => {
    const messages = node.closest(".chat-local-results");
    if (messages) messages.scrollTop = 0;
    const box = node.getBoundingClientRect();
    return box.top >= 0 && box.bottom <= window.innerHeight && box.width <= window.innerWidth;
  })).toBe(true);
}

test("an authenticated synthetic Builder review arrives once and survives a cold desktop reload", async () => {
  let projectOwned: OwnedDirectory | null = null;
  let profileOwned: OwnedDirectory | null = null;
  let project = "";
  let profile = "";
  let app: ElectronApplication | null = null;
  try {
    projectOwned = ownedTemp("cairn-task231-project-");
    project = projectOwned.path;
    profileOwned = ownedTemp("cairn-task231-profile-");
    profile = profileOwned.path;
    scaffold(project);
    mkdirSync(OUTPUT_DIR, { recursive: true });

    app = await launch(project, profile);
    let page = await app.firstWindow();
    await expect(page.getByRole("button", { name: "\u2190 Project home" })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-conversation-restore="settled"]')).toHaveCount(1);
    await expect(page.locator(".builder-proposal-review")).toHaveCount(0);
    const beforeUi = await visibleUiState(page);
    const beforeUrl = page.url();
    const beforeWindows = app.windows().length;
    let newWindows = 0;
    let popups = 0;
    app.on("window", () => { newWindows += 1; });
    page.on("popup", () => { popups += 1; });
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));

    const appended = await app.evaluate(() => {
      const hook = (globalThis as typeof globalThis & {
        __CAIRN_TASK231_APPEND_BUILDER_REVIEW__?: () => { conversationId: string; displayTurnId: string };
      }).__CAIRN_TASK231_APPEND_BUILDER_REVIEW__;
      if (!hook) throw new Error("TASK231_FIXTURE_HOOK_MISSING");
      return hook();
    });
    expect(appended.conversationId).toMatch(/^\d{3}$/u);
    expect(appended.displayTurnId).toMatch(/^[0-9a-f-]{36}$/u);

    await assertInertCard(page);
    await expect(app.evaluate(() => {
      const hook = (globalThis as typeof globalThis & {
        __CAIRN_TASK231_APPEND_BUILDER_REVIEW__?: () => unknown;
      }).__CAIRN_TASK231_APPEND_BUILDER_REVIEW__;
      if (!hook) throw new Error("TASK231_FIXTURE_HOOK_MISSING");
      return hook();
    })).rejects.toThrow(/TASK231_FIXTURE_ALREADY_USED/u);
    const card = page.locator(".builder-proposal-review");
    await card.locator(".builder-proposal-summary p").last().click();
    await card.locator(".builder-proposal-file h3 code").dblclick();
    await card.locator(".builder-proposal-comparison section").last().dispatchEvent("keydown", { key: "Enter", code: "Enter" });
    await assertInertCard(page);
    expect(await visibleUiState(page)).toEqual(beforeUi);
    expect(page.url()).toBe(beforeUrl);
    expect(app.windows()).toHaveLength(beforeWindows);
    expect(newWindows).toBe(0);
    expect(popups).toBe(0);
    expect(requests.filter((url) => /^https?:/iu.test(url))).toEqual([]);
    const externalResources = await page.evaluate(() => performance.getEntriesByType("resource")
      .map((entry) => entry.name).filter((name) => /^https?:/iu.test(name)));
    expect(externalResources).toEqual([]);

    const runtime = await page.evaluate(async ({ projectRoot, conversationId }) => ({
      session: await window.cairn.taskCurrent(projectRoot),
      stream: await window.cairn.conductorCurrent(projectRoot),
      proposal: await window.cairn.conductorProposal(projectRoot, conversationId),
      action: await window.cairn.conductorAction(projectRoot, conversationId),
      turns: await window.cairn.conductorTurns(projectRoot, conversationId),
    }), { projectRoot: project, conversationId: appended.conversationId });
    expect(runtime.session).toBeNull();
    expect(runtime.stream).toBeNull();
    expect(runtime.proposal).toBeNull();
    expect(runtime.action).toBeNull();
    expect(runtime.turns).toHaveLength(1);
    expect(runtime.turns[0]?.role === "builder-review" ? runtime.turns[0].displayTurnId : null)
      .toBe(appended.displayTurnId);
    expect(Object.keys(runtime.turns[0])).toEqual(["role", "version", "displayTurnId", "review", "ts"]);
    expect(JSON.stringify(runtime.turns)).not.toMatch(/selectedTrackedText|protocolBrand|selectorVersion|evidencePlan|taskSpec/u);

    await fitWholeCardForEvidence(app, page, 1320, 1_800);
    await page.screenshot({ path: NORMAL_SCREENSHOT });
    await closeAndConfirm(app);
    app = null;

    const conversationPath = join(project, ".cairn", "conversations", `${appended.conversationId}.jsonl`);
    const transcriptText = readFileSync(conversationPath, "utf8");
    expect(transcriptText.endsWith("\n")).toBe(true);
    const physicalLines = transcriptText.slice(0, -1).split("\n");
    expect(physicalLines).toHaveLength(1);
    expect(JSON.parse(physicalLines[0]).role).toBe("builder-review");

    const builderMarkerFiles = treeFiles(join(profile, "builder-review-markers"));
    expect(builderMarkerFiles).toHaveLength(1);
    const markerText = readFileSync(builderMarkerFiles[0], "utf8");
    expect(markerText).toMatch(/^[0-9a-f]{64}\n$/u);
    expect(markerText).not.toContain("syntheticBefore");
    expect(markerText).not.toContain("syntheticAfter");
    expect(markerText).not.toContain("examples/synthetic/greeting.ts");

    app = await launch(project, profile);
    page = await app.firstWindow();
    await expect(page.getByRole("button", { name: "\u2190 Project home" })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-conversation-restore="settled"]')).toHaveCount(1);
    await assertInertCard(page);
    await expect(page.locator(".builder-proposal-review")).toHaveCount(1);
    await fitWholeCardForEvidence(app, page, 760, 2_200);
    const columns = await page.locator(".builder-proposal-comparison").evaluate((node) =>
      getComputedStyle(node).gridTemplateColumns.split(" ").filter(Boolean).length);
    expect(columns).toBe(1);
    const cardBox = await page.locator(".builder-proposal-review").boundingBox();
    expect(cardBox).not.toBeNull();
    expect(cardBox?.width ?? 10_000).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
    await page.locator(".builder-proposal-review").screenshot({ path: COMPACT_SCREENSHOT });

    const coldTurns = await page.evaluate(async ({ projectRoot, conversationId }) =>
      window.cairn.conductorTurns(projectRoot, conversationId),
    { projectRoot: project, conversationId: appended.conversationId });
    expect(coldTurns).toEqual(runtime.turns);
    expect(coldTurns[0]?.role === "builder-review" ? coldTurns[0].displayTurnId : null)
      .toBe(appended.displayTurnId);
    expect(await page.evaluate(() => performance.getEntriesByType("resource")
      .map((entry) => entry.name).filter((name) => /^https?:/iu.test(name)))).toEqual([]);
    expect(app.windows()).toHaveLength(1);
    expect(readFileSync(conversationPath, "utf8")).toBe(transcriptText);
    expect(statSync(NORMAL_SCREENSHOT).size).toBeGreaterThan(10_000);
    expect(statSync(COMPACT_SCREENSHOT).size).toBeGreaterThan(10_000);

    const logFile = join(profile, "logs", "cairn.log");
    if (existsSync(logFile)) {
      const logs = readFileSync(logFile, "utf8");
      expect(logs).not.toMatch(/syntheticBefore|syntheticAfter|examples\/synthetic\/greeting\.ts/iu);
    }
  } finally {
    let cleanupError: unknown = null;
    if (app !== null) {
      try {
        await closeAndConfirm(app);
        app = null;
      } catch (error) {
        cleanupError = error;
      }
    }
    if (cleanupError === null) {
      for (const owned of [projectOwned, profileOwned]) {
        if (owned === null) continue;
        try { removeOwnedTemp(owned); } catch (error) { cleanupError ??= error; }
      }
    }
    if (cleanupError !== null) throw cleanupError;
  }
});
