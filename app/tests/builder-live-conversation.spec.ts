import { _electron as electron, expect, test, type ElectronApplication, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const MARKER = "task233-openrouter-kimi-k2-novita-v1";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "moonshotai/kimi-k2";
const PROVIDER_SLUG = "novita";
const SELECTED_PATH = "examples/synthetic/greeting.ts";
const BEFORE = "export const greeting = '<script>syntheticBefore()</script>';\n";
const TITLE = "Builder proposal \u2014 not applied";
const SPEND_MARKER = "task233-live-spent.json";
const SHA256 = /^[a-f0-9]{64}$/u;

type OwnedDirectory = Readonly<{ path: string; real: string; dev: bigint; ino: bigint }>;
type Receipt = Readonly<{
  version: "cairn-task233-openrouter-kimi-k2-novita/v1";
  contextSha256: string;
  requestBodySha256: string;
  responseBodySha256: string;
  modelCatalogSha256: string;
  zdrCatalogSha256: string;
  endpoint: typeof ENDPOINT;
  model: typeof MODEL;
  providerSlug: typeof PROVIDER_SLUG;
  providerName: "Novita" | "NovitaAI";
  status: 200;
  attempts: 1;
  preflightRequests: 2;
  modelRequests: 1;
  toolDefinitions: 0;
  ambientMessages: 0;
  maxTokens: 1024;
  promptTokenUpperBound: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  providerCostUsd: number;
  localWorstCaseCostUsd: string;
  localCostCeilingUsd: "0.05";
}>;

function gitEnvironment(): NodeJS.ProcessEnv {
  const environment = Object.fromEntries(Object.entries(process.env)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  for (const key of Object.keys(environment)) if (key.toUpperCase().startsWith("GIT_")) delete environment[key];
  environment.GIT_CONFIG_NOSYSTEM = "1";
  environment.GIT_CONFIG_SYSTEM = "NUL";
  environment.GIT_CONFIG_GLOBAL = "NUL";
  environment.GIT_TERMINAL_PROMPT = "0";
  environment.GIT_OPTIONAL_LOCKS = "0";
  return environment;
}

function git(project: string, args: readonly string[]): string {
  return execFileSync("git", ["-c", "core.excludesFile=/dev/null", ...args], {
    cwd: project,
    env: gitEnvironment(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trimEnd();
}

function scaffold(project: string): void {
  const core = pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "files.js")).href;
  execFileSync(process.execPath, [
    "--input-type=module", "-e",
    `import { scaffoldProject } from ${JSON.stringify(core)}; scaffoldProject(process.argv[1], { name: "Task 233 approved live Builder review", what: "show one inert live proposal for fixed synthetic text", who: "Cairn maintainers", milestone: "one approved bounded provider call" });`,
    project,
  ]);
  mkdirSync(join(project, "examples", "synthetic"), { recursive: true });
  writeFileSync(join(project, SELECTED_PATH), BEFORE, "utf8");
  git(project, ["init", "--initial-branch=main", "--object-format=sha1", "--ref-format=files"]);
  git(project, ["add", "--", "AGENTS.md", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md", SELECTED_PATH]);
  git(project, [
    "-c", "user.name=Cairn Task 233",
    "-c", "user.email=task233@example.invalid",
    "commit", "-m", "Seed Task 233 synthetic tracked text",
  ]);
  const excludePath = join(project, ".git", "info", "exclude");
  const exclude = readFileSync(excludePath, "utf8");
  if (!exclude.split(/\r?\n/u).includes("/.cairn/")) {
    writeFileSync(excludePath, `${exclude.length === 0 || exclude.endsWith("\n") ? exclude : `${exclude}\n`}/.cairn/\n`, "utf8");
  }
  if (git(project, ["status", "--porcelain=v2", "--untracked-files=all"]) !== "") {
    throw new Error("TASK233_SYNTHETIC_REPOSITORY_NOT_CLEAN");
  }
}

function ownedTemp(kind: "project" | "profile"): OwnedDirectory {
  const path = mkdtempSync(join(tmpdir(), `cairn-task233-${kind}-`));
  const real = realpathSync.native(path);
  const stat = lstatSync(real, { bigint: true });
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.dev <= 0n || stat.ino <= 0n
    || dirname(real) !== realpathSync.native(tmpdir())
    || !new RegExp(`^cairn-task233-${kind}-[A-Za-z0-9]{6}$`, "u").test(basename(real))) {
    throw new Error("TASK233_OWNED_TEMP_UNSAFE");
  }
  return Object.freeze({ path, real, dev: stat.dev, ino: stat.ino });
}

function ownedStillExact(owned: OwnedDirectory, kind: "project" | "profile"): boolean {
  try {
    const currentReal = realpathSync.native(owned.path);
    const current = lstatSync(currentReal, { bigint: true });
    return currentReal === owned.real && dirname(currentReal) === realpathSync.native(tmpdir())
      && new RegExp(`^cairn-task233-${kind}-[A-Za-z0-9]{6}$`, "u").test(basename(currentReal))
      && current.isDirectory() && !current.isSymbolicLink()
      && current.dev === owned.dev && current.ino === owned.ino;
  } catch {
    return false;
  }
}

function removeOwnedTemp(owned: OwnedDirectory, kind: "project" | "profile"): void {
  if (!ownedStillExact(owned, kind)) {
    throw new Error(`TASK233_OWNED_TEMP_CHANGED: retained ${kind}`);
  }
  rmSync(owned.real, { recursive: true, force: false });
}

function launchEnvironment(project: string, profile: string, phase: "call" | "restore"): Record<string, string> {
  const environment = Object.fromEntries(Object.entries(process.env)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  for (const key of Object.keys(environment)) {
    const upper = key.toUpperCase();
    if (upper.startsWith("CAIRN_") || upper === "NODE_OPTIONS" || upper === "ELECTRON_RUN_AS_NODE"
      || upper === "NODE_EXTRA_CA_CERTS" || upper === "SSLKEYLOGFILE"
      || upper === "HTTP_PROXY" || upper === "HTTPS_PROXY" || upper === "ALL_PROXY"
      || upper === "NO_PROXY" || upper === "NODE_USE_ENV_PROXY") delete environment[key];
  }
  return {
    ...environment,
    CAIRN_E2E: "1",
    CAIRN_MOCK: "0",
    CAIRN_TEST_BUILDER_LIVE: MARKER,
    CAIRN_TEST_BUILDER_LIVE_PHASE: phase,
    CAIRN_TEST_USER_DATA: profile,
    CAIRN_OPEN: project,
  };
}

function launch(project: string, profile: string, phase: "call" | "restore"): Promise<ElectronApplication> {
  return electron.launch({ args: ["."], env: launchEnvironment(project, profile, phase) });
}

async function closeAndConfirm(application: ElectronApplication): Promise<void> {
  const child = application.process();
  await application.close();
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolveExit, rejectExit) => {
    const timer = setTimeout(() => {
      cleanup();
      rejectExit(new Error("TASK233_ELECTRON_DID_NOT_EXIT"));
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

async function safeTurnEvidence(page: Page, project: string, conversationId: string) {
  return page.evaluate(async ({ root, id, expectedBefore, expectedPath }) => {
    const turns = await window.cairn.conductorTurns(root, id);
    const turn = turns.length === 1 ? turns[0] : null;
    const review = turn?.role === "builder-review" ? turn.review : null;
    const complete = review?.kind === "replacement-proposal"
      && typeof review.summary === "string" && review.summary.length > 0
      && review.replacements.length === 1
      && review.replacements[0]?.projectRelativePath === expectedPath
      && review.replacements[0]?.beforeText === expectedBefore
      && typeof review.replacements[0]?.afterText === "string"
      && review.replacements[0].afterText.length > 0;
    const bytes = new TextEncoder().encode(turn === null ? "null" : JSON.stringify(turn));
    const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
      .map((value) => value.toString(16).padStart(2, "0")).join("");
    return {
      count: turns.length,
      role: turn?.role ?? null,
      displayTurnId: turn?.role === "builder-review" ? turn.displayTurnId : null,
      keys: turn === null ? [] : Object.keys(turn).sort(),
      complete,
      digest,
    };
  }, { root: project, id: conversationId, expectedBefore: BEFORE, expectedPath: SELECTED_PATH });
}

async function assertInertCard(page: Page): Promise<void> {
  const card = page.locator(".builder-proposal-review");
  await expect(card).toHaveCount(1);
  await expect(card.getByRole("heading", { name: TITLE, exact: true })).toBeVisible();
  await expect(card).toContainText("Proposal only \u2014 Cairn has not applied, executed, published, or verified this suggestion.");
  await expect(card).toContainText("Nothing changed. No command ran.");
  await expect(card).toContainText(SELECTED_PATH);
  await expect(card).toContainText(BEFORE.trim());
  const forbidden = await card.evaluate((node) => {
    const banned = new Set([
      "A", "BUTTON", "FORM", "INPUT", "TEXTAREA", "SELECT", "OPTION", "LABEL", "DETAILS", "SUMMARY",
      "IFRAME", "OBJECT", "EMBED", "AUDIO", "VIDEO", "CANVAS", "IMG", "SVG", "STYLE", "SCRIPT",
    ]);
    return [...node.querySelectorAll("*")].some((element) => banned.has(element.tagName)
      || [...element.attributes].some((attribute) => /^on/iu.test(attribute.name)
        || ["href", "src", "style", "tabindex", "contenteditable", "role", "for", "action", "formaction", "target"]
          .includes(attribute.name)));
  });
  expect(forbidden).toBe(false);
  await expect(card.locator("button, a, input, textarea, select, [tabindex], [role], [href], [src], [style]")).toHaveCount(0);
}

function assertReceipt(receipt: Receipt): void {
  expect(receipt.version).toBe("cairn-task233-openrouter-kimi-k2-novita/v1");
  for (const digest of [
    receipt.contextSha256,
    receipt.requestBodySha256,
    receipt.responseBodySha256,
    receipt.modelCatalogSha256,
    receipt.zdrCatalogSha256,
  ]) expect(digest).toMatch(SHA256);
  expect(receipt.endpoint).toBe(ENDPOINT);
  expect(receipt.model).toBe(MODEL);
  expect(receipt.providerSlug).toBe(PROVIDER_SLUG);
  expect(["Novita", "NovitaAI"]).toContain(receipt.providerName);
  expect(receipt.status).toBe(200);
  expect(receipt.attempts).toBe(1);
  expect(receipt.preflightRequests).toBe(2);
  expect(receipt.modelRequests).toBe(1);
  expect(receipt.toolDefinitions).toBe(0);
  expect(receipt.ambientMessages).toBe(0);
  expect(receipt.maxTokens).toBe(1_024);
  expect(receipt.promptTokens).toBeGreaterThan(0);
  expect(receipt.completionTokens).toBeGreaterThan(0);
  expect(receipt.totalTokens).toBe(receipt.promptTokens + receipt.completionTokens);
  expect(receipt.providerCostUsd).toBeGreaterThanOrEqual(0);
  expect(receipt.providerCostUsd).toBeLessThanOrEqual(0.05);
  expect(Number(receipt.localWorstCaseCostUsd)).toBeLessThan(0.05);
  expect(receipt.localCostCeilingUsd).toBe("0.05");
}

test("one owner-entered OpenRouter credential yields one pinned inert live proposal and one cold restore", async () => {
  let projectOwned: OwnedDirectory | null = null;
  let profileOwned: OwnedDirectory | null = null;
  let callApp: ElectronApplication | null = null;
  let restoreApp: ElectronApplication | null = null;
  try {
    projectOwned = ownedTemp("project");
    profileOwned = ownedTemp("profile");
    const project = projectOwned.path;
    const profile = profileOwned.path;
    scaffold(project);
    const baseHead = git(project, ["rev-parse", "HEAD"]);
    const baseStatus = git(project, ["status", "--porcelain=v2", "--untracked-files=all"]);
    const baseSelected = readFileSync(join(project, SELECTED_PATH), "utf8");
    expect(baseStatus).toBe("");
    expect(baseSelected).toBe(BEFORE);

    callApp = await launch(project, profile, "call");
    const page = await callApp.firstWindow();
    await expect(page.getByRole("button", { name: "\u2190 Project home" })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-conversation-restore="settled"]')).toHaveCount(1);
    await expect(page.locator(".builder-proposal-review")).toHaveCount(0);
    const initialWindows = callApp.windows().length;
    let newWindows = 0;
    let popups = 0;
    callApp.on("window", () => { newWindows += 1; });
    page.on("popup", () => { popups += 1; });
    const rendererHttpRequests: string[] = [];
    page.on("request", (request) => {
      if (/^https?:/iu.test(request.url())) rendererHttpRequests.push(request.url());
    });

    console.log("TASK233_WAITING_FOR_OWNER_PASTED_KEY_CONNECTION");
    await expect.poll(async () => page.evaluate(async () => {
      const status = await window.cairn.conductorStatus();
      return {
        connected: status.connected,
        consentRequired: status.consentRequired,
        projectAuthorizationRequired: status.projectAuthorizationRequired ?? false,
        baseUrl: status.baseUrl,
        model: status.model,
        provider: status.provider,
      };
    }), {
      timeout: 10 * 60_000,
      intervals: [1_000],
      message: "Waiting for the owner to finish Cairn's exact pasted-key OpenRouter/Kimi K2 connection",
    }).toEqual({
      connected: true,
      consentRequired: false,
      projectAuthorizationRequired: false,
      baseUrl: "https://openrouter.ai/api/v1",
      model: MODEL,
      provider: "openrouter.ai",
    });
    expect(ownedStillExact(projectOwned, "project")).toBe(true);
    expect(ownedStillExact(profileOwned, "profile")).toBe(true);
    expect(await callApp.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(initialWindows);

    const result = await callApp.evaluate(async () => {
      const hook = (globalThis as typeof globalThis & {
        __CAIRN_TASK233_RUN_APPROVED_LIVE_BUILDER__?: () => Promise<
          | Readonly<{ ok: true; conversationId: string; displayTurnId: string; receipt: Receipt }>
          | Readonly<{ ok: false; failure: Readonly<{ code: string; stage: string; preflightRequests: number; modelRequests: number }> }>
        >;
      }).__CAIRN_TASK233_RUN_APPROVED_LIVE_BUILDER__;
      if (!hook) throw new Error("TASK233_LIVE_FIXTURE_HOOK_MISSING");
      return hook();
    });
    if (!result.ok) {
      throw new Error(`TASK233_LIVE_STOP:${result.failure.code}:${result.failure.stage}:${result.failure.preflightRequests}:${result.failure.modelRequests}`);
    }
    assertReceipt(result.receipt);
    expect(result.conversationId).toMatch(/^\d{3}$/u);
    expect(result.displayTurnId).toMatch(/^[0-9a-f-]{36}$/u);
    await assertInertCard(page);
    const live = await safeTurnEvidence(page, project, result.conversationId);
    expect(live).toEqual({
      count: 1,
      role: "builder-review",
      displayTurnId: result.displayTurnId,
      keys: ["displayTurnId", "review", "role", "ts", "version"],
      complete: true,
      digest: live.digest,
    });
    expect(live.digest).toMatch(SHA256);
    expect(await page.evaluate(async ({ root, id }) => ({
      session: await window.cairn.taskCurrent(root),
      stream: await window.cairn.conductorCurrent(root),
      proposal: await window.cairn.conductorProposal(root, id),
      action: await window.cairn.conductorAction(root, id),
    }), { root: project, id: result.conversationId })).toEqual({
      session: null, stream: null, proposal: null, action: null,
    });
    expect(page.url()).not.toMatch(/^https?:/iu);
    expect(callApp.windows()).toHaveLength(initialWindows);
    expect(newWindows).toBe(0);
    expect(popups).toBe(0);
    expect(rendererHttpRequests).toEqual([]);
    expect(await page.evaluate(() => performance.getEntriesByType("resource")
      .map((entry) => entry.name).filter((name) => /^https?:/iu.test(name)))).toEqual([]);
    expect(readFileSync(join(project, SELECTED_PATH), "utf8")).toBe(baseSelected);
    expect(git(project, ["rev-parse", "HEAD"])).toBe(baseHead);
    expect(git(project, ["status", "--porcelain=v2", "--untracked-files=all"])).toBe(baseStatus);

    await closeAndConfirm(callApp);
    callApp = null;
    const conversationPath = join(project, ".cairn", "conversations", `${result.conversationId}.jsonl`);
    const transcript = readFileSync(conversationPath, "utf8");
    expect(transcript.endsWith("\n")).toBe(true);
    expect(transcript.slice(0, -1).split("\n")).toHaveLength(1);
    expect((JSON.parse(transcript) as { role?: unknown }).role).toBe("builder-review");
    expect(transcript).not.toMatch(/selectedTrackedText|protocolBrand|selectorVersion|evidencePlan|taskSpec|Authorization|Bearer /u);
    const transcriptSha256 = createHash("sha256").update(transcript).digest("hex");

    const spendText = readFileSync(join(profile, SPEND_MARKER), "utf8");
    const spend = JSON.parse(spendText) as Record<string, unknown>;
    expect(Object.keys(spend)).toEqual([
      "version", "contextSha256", "requestBodySha256", "model", "providerSlug", "endpoint", "maxTokens", "costCeilingUsd",
    ]);
    expect(spend).toEqual({
      version: "cairn-task233-live-spend/v1",
      contextSha256: result.receipt.contextSha256,
      requestBodySha256: result.receipt.requestBodySha256,
      model: MODEL,
      providerSlug: PROVIDER_SLUG,
      endpoint: ENDPOINT,
      maxTokens: 1_024,
      costCeilingUsd: "0.05",
    });
    expect(spendText).not.toMatch(/syntheticBefore|examples\/synthetic|Authorization|Bearer |sk-or/iu);
    const builderMarkers = treeFiles(join(profile, "builder-review-markers"));
    expect(builderMarkers).toHaveLength(1);
    const builderMarker = readFileSync(builderMarkers[0] as string, "utf8");
    expect(builderMarker).toMatch(/^[a-f0-9]{64}\n$/u);
    const builderMarkerSha256 = createHash("sha256").update(builderMarker).digest("hex");
    const logPath = join(profile, "logs", "cairn.log");
    if (existsSync(logPath)) {
      const logs = readFileSync(logPath, "utf8");
      expect(logs).not.toMatch(/syntheticBefore|examples\/synthetic|Authorization|Bearer /iu);
    }

    restoreApp = await launch(project, profile, "restore");
    const restoredPage = await restoreApp.firstWindow();
    await expect(restoredPage.getByRole("button", { name: "\u2190 Project home" })).toBeVisible({ timeout: 30_000 });
    await expect(restoredPage.locator('[data-conversation-restore="settled"]')).toHaveCount(1);
    await assertInertCard(restoredPage);
    const cold = await safeTurnEvidence(restoredPage, project, result.conversationId);
    expect(cold).toEqual(live);
    expect(await restoreApp.evaluate(() => Object.hasOwn(
      globalThis,
      "__CAIRN_TASK233_RUN_APPROVED_LIVE_BUILDER__",
    ))).toBe(false);
    expect(readFileSync(conversationPath, "utf8")).toBe(transcript);
    expect(createHash("sha256").update(readFileSync(conversationPath)).digest("hex")).toBe(transcriptSha256);
    expect(createHash("sha256").update(readFileSync(builderMarkers[0] as string)).digest("hex"))
      .toBe(builderMarkerSha256);
    expect(readFileSync(join(profile, SPEND_MARKER), "utf8")).toBe(spendText);
    expect(readFileSync(join(project, SELECTED_PATH), "utf8")).toBe(baseSelected);
    expect(git(project, ["rev-parse", "HEAD"])).toBe(baseHead);
    expect(git(project, ["status", "--porcelain=v2", "--untracked-files=all"])).toBe(baseStatus);
    expect(await restoredPage.evaluate(() => performance.getEntriesByType("resource")
      .map((entry) => entry.name).filter((name) => /^https?:/iu.test(name)))).toEqual([]);

    console.log("TASK233_SAFE_RECEIPT " + JSON.stringify(result.receipt));
  } finally {
    let cleanupError: unknown = null;
    for (const application of [restoreApp, callApp]) {
      if (application === null) continue;
      try { await closeAndConfirm(application); } catch (error) { cleanupError ??= error; }
    }
    if (cleanupError === null) {
      if (profileOwned !== null) {
        try { removeOwnedTemp(profileOwned, "profile"); } catch (error) { cleanupError ??= error; }
      }
      if (projectOwned !== null) {
        try { removeOwnedTemp(projectOwned, "project"); } catch (error) { cleanupError ??= error; }
      }
    }
    if (cleanupError !== null) throw cleanupError;
  }
});
