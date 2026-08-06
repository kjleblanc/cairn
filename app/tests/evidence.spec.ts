import { _electron as electron, expect, type ElectronApplication, type Page } from "@playwright/test";
import { test } from "./fixtures/isolated-profile";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fakeCodexEnvironment } from "./fixtures/fake-codex-env";

const OWNER_TURN = "Please make one visible local change and show me the result.";
const OUTCOME = "Create the visible result for the evidence test";
const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

type EvidenceRecord = {
  runId: string;
  completedAt: string | null;
  disposition: "DONE" | "STOPPED" | "ERROR" | null;
  captures: Array<{ id: string; boundary: string; file: string; sha256: string }>;
};

type TerminalPaintUi = {
  dispatchPanels: number;
  taskCards: number;
  composerDisabled: boolean;
  newConversationDisabled: boolean;
  settlingMessage: boolean;
};

function scaffold(project: string): void {
  const core = pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
  execFileSync(process.execPath, [
    "--input-type=module", "-e",
    `import { initProject } from ${JSON.stringify(core)}; initProject(process.argv[1], { name: "Evidence Fixture", what: "w", who: "me", milestone: "see it" });`,
    project,
  ]);
  execFileSync("git", ["config", "user.name", "Cairn Test"], { cwd: project });
  execFileSync("git", ["config", "user.email", "cairn-test@example.invalid"], { cwd: project });
  appendFileSync(join(project, ".git", "info", "exclude"), ".cairn/\napp/shots/\n", "utf8");

  const conversations = join(project, ".cairn", "conversations");
  mkdirSync(conversations, { recursive: true });
  const owner = JSON.stringify({
    role: "owner",
    text: OWNER_TURN,
    ts: "2026-08-03T12:00:00.000Z",
  });
  writeFileSync(join(conversations, "001.jsonl"), `${owner}\n`);

  const shots = join(project, "app", "shots");
  mkdirSync(shots, { recursive: true });
  writeFileSync(join(shots, "earlier-review.png"), ONE_PIXEL_PNG);
  writeFileSync(join(shots, "manifest.json"), JSON.stringify({
    entries: [{
      task: "Task 170",
      title: "Earlier visual review",
      caption: "A historical review picture, kept separate from checked run evidence.",
      shots: [{ file: "earlier-review.png", label: "Earlier review" }],
    }],
  }));
}

function evidenceProjectDirectory(project: string): string {
  const profile = process.env.CAIRN_TEST_USER_DATA;
  if (!profile) throw new Error("The isolated profile fixture is unavailable.");
  let key = realpathSync(resolve(project)).replace(/\\/g, "/");
  if (process.platform === "win32") key = key.toLowerCase();
  return join(profile, "evidence", createHash("sha256").update(key).digest("hex"));
}

function records(project: string): Array<{ path: string; value: EvidenceRecord }> {
  const directory = evidenceProjectDirectory(project);
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(directory, entry.name, "record.json"))
    .filter(existsSync)
    .map((path) => ({ path, value: JSON.parse(readFileSync(path, "utf8")) as EvidenceRecord }));
}

function currentRecord(project: string): { path: string; value: EvidenceRecord } | undefined {
  return records(project).find((record) => record.value.disposition === null || record.value.captures.some((capture) =>
    capture.boundary === "worker-not-started"));
}

function seedTrustedHistory(project: string, count: number): void {
  const projectEvidence = evidenceProjectDirectory(project);
  const projectHash = basename(projectEvidence);
  const digest = createHash("sha256").update(ONE_PIXEL_PNG).digest("hex");
  for (let index = 0; index < count; index += 1) {
    const suffix = String(index + 1).padStart(12, "0");
    const runId = `dddddddd-dddd-4ddd-8ddd-${suffix}`;
    const captureId = `eeeeeeee-eeee-4eee-8eee-${suffix}`;
    const completedAt = new Date(Date.UTC(2026, 7, 2, 0, 0, index)).toISOString();
    const runDirectory = join(projectEvidence, runId);
    mkdirSync(runDirectory, { recursive: true });
    writeFileSync(join(runDirectory, `${captureId}.png`), ONE_PIXEL_PNG);
    writeFileSync(join(runDirectory, "record.json"), `${JSON.stringify({
      version: 1,
      projectHash,
      runId,
      taskNumber: 1000 + index,
      title: `Trusted history ${index + 1}`,
      disposition: "DONE",
      completedAt,
      captures: [{
        id: captureId,
        boundary: "done",
        file: `${captureId}.png`,
        sha256: digest,
        bytes: ONE_PIXEL_PNG.length,
        width: 1,
        height: 1,
        createdAt: completedAt,
        label: "After \u2014 Cairn verified the run as DONE.",
      }],
    }, null, 2)}\n`);
    let timeline = join(projectEvidence, "_timeline");
    mkdirSync(timeline, { recursive: true });
    const timestamp = completedAt.slice(0, 23).replace(/\D/g, "");
    for (const digit of timestamp) {
      timeline = join(timeline, digit);
      mkdirSync(timeline, { recursive: true });
    }
    writeFileSync(join(timeline, `${runId}.mark`), Buffer.alloc(0));
  }
}

async function fakeProvider(): Promise<{ server: Server; baseUrl: string; bodies: string[] }> {
  const bodies: string[] = [];
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => {
      bodies.push(Buffer.concat(chunks).toString("utf8"));
      const content = bodies.length === 1
        ? `\`\`\`cairn-task\n${JSON.stringify({
          intent: {
            version: "cairn-task-intent/v1",
            outcome: {
              source: "owner-stated",
              text: OUTCOME,
              ownerQuote: "Propose the visible evidence fixture task.",
            },
            requirements: [],
            context: [],
          },
          risks: [],
        })}\n\`\`\`\n\nI can make that one visible result.`
        : "The checked result is ready.";
      response.writeHead(200, { "content-type": "text/event-stream", connection: "close" });
      response.end(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`);
    });
  });
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fixture provider did not bind a TCP port.");
  return { server, baseUrl: `http://127.0.0.1:${address.port}/v1/`, bodies };
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
}

async function connectAndRestore(win: Page, baseUrl: string): Promise<void> {
  const connected = await win.evaluate(async ({ baseUrl: url }) => {
    const card = await window.cairn.conductorConsentCard(url, "fixture-model");
    if (!card.ok) return card;
    return window.cairn.conductorConnect({
      card: card.value,
      apiKey: "sk-fixture-only",
      consentConfirmed: true,
      fileContentsConfirmed: true,
    });
  }, { baseUrl });
  expect(connected.ok).toBe(true);
  await win.reload();
  await expect(win.getByText(OWNER_TURN, { exact: true })).toBeVisible({ timeout: 20_000 });
}

async function beginRun(win: Page): Promise<void> {
  await win.getByPlaceholder("Talk with Cairn").fill("Propose the visible evidence fixture task.");
  await win.getByRole("button", { name: "Send", exact: true }).click({ noWaitAfter: true });
  const taskCard = win.locator(".task-card");
  await expect(taskCard).toContainText(OUTCOME, { timeout: 20_000 });
  await taskCard.getByRole("button", { name: "Review" }).click();
  const panel = win.locator(".dispatch-panel");
  await expect(panel).toBeVisible({ timeout: 20_000 });
  await panel.getByLabel("I approve this one real Codex Exec call.").check();
  await panel.getByRole("button", { name: "Start one real Codex Exec call" }).click({ noWaitAfter: true });
  await expect(panel).toContainText("Cairn is working on this");
}

async function setWindowSize(app: ElectronApplication, width: number, height: number): Promise<void> {
  await app.evaluate(({ BrowserWindow }, size) => {
    BrowserWindow.getAllWindows()[0]?.setSize(size.width, size.height);
  }, { width, height });
}

async function observeTerminalPaint(win: Page): Promise<void> {
  await win.evaluate(() => {
    const target = window as typeof window & { __cairnTerminalPaintUi?: TerminalPaintUi | null };
    target.__cairnTerminalPaintUi = null;
    window.addEventListener("cairn:task-session-refresh", () => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        target.__cairnTerminalPaintUi = {
          dispatchPanels: document.querySelectorAll(".dispatch-panel").length,
          taskCards: document.querySelectorAll(".task-card").length,
          composerDisabled: document.querySelector<HTMLTextAreaElement>(".chat-composer textarea")?.disabled === true,
          newConversationDisabled: document.querySelector<HTMLButtonElement>(
            '.chat-composer button[aria-label="New conversation"]',
          )?.disabled === true,
          settlingMessage: document.body.textContent?.includes("Cairn is finishing this result.") === true,
        };
      }));
    }, { once: true });
  });
}

async function terminalPaintUi(win: Page): Promise<TerminalPaintUi | null> {
  return win.evaluate(() =>
    (window as typeof window & { __cairnTerminalPaintUi?: TerminalPaintUi | null }).__cairnTerminalPaintUi ?? null);
}

test.describe.configure({ mode: "serial" });

test("automatic pair leads its card, opens on this run, survives reload, and never reaches provider context", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-evidence-e2e-pair-"));
  scaffold(project);
  seedTrustedHistory(project, 41);
  const provider = await fakeProvider();
  const fakeCodex = fakeCodexEnvironment(project, true, "town-return");
  let app: ElectronApplication | null = null;
  try {
    app = await electron.launch({
      args: ["."],
      env: { ...process.env, ...fakeCodex.env, CAIRN_OPEN: project, CAIRN_MOCK: "0" },
    });
    const win = await app.firstWindow();
    await win.emulateMedia({ reducedMotion: "reduce" });
    await connectAndRestore(win, provider.baseUrl);
    await beginRun(win);
    await observeTerminalPaint(win);

    await expect.poll(() => existsSync(fakeCodex.marker), { timeout: 20_000 }).toBe(true);
    await expect.poll(() => records(project).flatMap((record) => record.value.captures)
      .filter((capture) => capture.boundary === "worker-not-started").length).toBe(1);
    expect(currentRecord(project)?.value.completedAt).toBeNull();

    writeFileSync(fakeCodex.release, "finish\n");
    const card = win.locator(".result-card");
    await expect(card).toBeVisible({ timeout: 30_000 });
    await expect(card).toHaveAccessibleName("DONE result receipt for Task 001");
    await expect(card.locator(":scope > .card-title")).toHaveText("Cairn's receipt");
    await expect(card.locator(".result-card-provenance")).toHaveText("Checked by Cairn after the builder finished");
    const runDetails = card.locator(".result-card-run-details");
    const claims = card.locator(".result-card-claims");
    const request = card.locator(".result-card-request-context");
    await expect(runDetails).not.toHaveAttribute("open", "");
    await expect(claims).not.toHaveAttribute("open", "");
    await expect(request).not.toHaveAttribute("open", "");
    await expect(runDetails.locator(".result-card-run-facts")).toBeHidden();
    await expect(claims.locator(".result-card-claims-body")).toBeHidden();
    await expect(request.locator(".result-card-request-body")).toBeHidden();
    await expect.poll(() => currentRecord(project)?.value.completedAt, { timeout: 30_000 }).not.toBeNull();
    await expect.poll(() => currentRecord(project)?.value.captures.some((capture) =>
      capture.boundary === "done"), { timeout: 30_000 }).toBe(true);
    const terminalRecord = currentRecord(project);
    expect(terminalRecord?.value.disposition).toBe("DONE");
    expect(terminalRecord?.value.captures.map((capture) => capture.boundary)).toContain("done");
    await expect.poll(() => terminalPaintUi(win)).toEqual({
      dispatchPanels: 0,
      taskCards: 0,
      composerDisabled: true,
      newConversationDisabled: true,
      settlingMessage: true,
    });
    await expect(win.locator(".dispatch-panel")).toHaveCount(0);
    const evidence = card.locator(".result-evidence");
    await expect(evidence).toBeVisible({ timeout: 30_000 });
    await expect(evidence.locator(".result-evidence-figure")).toHaveCount(2);
    await expect(evidence.locator("figcaption").nth(0)).toContainText("worker had not started");
    await expect(evidence.locator("figcaption").nth(1)).toContainText("verified the run as DONE");
    await expect.poll(async () => evidence.locator("img").evaluateAll((images) =>
      images.every((image) => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);

    const saved = currentRecord(project);
    expect(saved?.value.disposition).toBe("DONE");
    expect(saved?.value.captures.map((capture) => capture.boundary)).toEqual(["worker-not-started", "done"]);
    expect(readdirSync(join(project, "app", "shots")).sort()).toEqual(["earlier-review.png", "manifest.json"]);

    const wideColumns = await evidence.locator(".result-evidence-grid").evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length);
    expect(wideColumns).toBe(2);
    await setWindowSize(app, 1304, 1000);
    await evidence.scrollIntoViewIfNeeded();
    await win.screenshot({ path: join(tmpdir(), "cairn-task-173-evidence-wide.png") });
    await card.locator(":scope > .card-title").evaluate((title) =>
      title.scrollIntoView({ block: "start", behavior: "auto" }));
    await win.screenshot({ path: join(tmpdir(), "cairn-task-188-receipt-collapsed.png") });

    await evidence.getByRole("button", { name: "Open the local album" }).click();
    const album = win.locator(".evidence-album");
    await expect(album).toBeVisible();
    await expect(win.locator(".overlay-card")).toBeFocused();
    await expect(win.locator(".shell-base")).toHaveAttribute("inert", "");
    await expect(win.locator(".shell-base")).toHaveAttribute("aria-hidden", "true");
    await expect(album.getByRole("heading", { name: "This run" })).toBeVisible();
    await expect(album.locator(".evidence-album-entry-selected")).toHaveAttribute("aria-current", "true");
    await expect.poll(async () => album.locator(".evidence-album-entry-selected img").evaluateAll((images) =>
      images.length > 0 && images.every((image) => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    const earlier = album.locator(".evidence-album-group").filter({ hasText: "Earlier checked pictures" });
    await expect(earlier.locator(".evidence-album-entry")).toHaveCount(40);
    const loadOlder = album.getByRole("button", { name: "Load older pictures" });
    await loadOlder.click();
    await expect(earlier.locator(".evidence-album-entry")).toHaveCount(41);
    await expect(album.getByText("Trusted history 1", { exact: true })).toBeVisible();
    await expect(album.getByRole("button", { name: "Load older pictures" })).toHaveCount(0);
    const allOlder = album.getByRole("button", { name: "All older pictures are open" });
    await expect(allOlder).toBeFocused();
    await expect(allOlder).toHaveAttribute("aria-disabled", "true");
    await expect(album.getByRole("status")).toContainText("All older pictures are open.");
    const trustedTitles = await earlier.locator("h4").allTextContents();
    expect(new Set(trustedTitles).size).toBe(41);
    await expect(album.getByRole("heading", { name: "Past review shots" })).toBeVisible();
    await expect(album.getByText("Earlier visual review", { exact: true })).toBeVisible();
    await album.locator(".evidence-album-entry-selected").scrollIntoViewIfNeeded();
    await win.screenshot({ path: join(tmpdir(), "cairn-task-173-evidence-album.png") });
    await win.keyboard.press("Escape");
    await expect(album).toHaveCount(0);
    await expect(evidence.getByRole("button", { name: "Open the local album" })).toBeFocused();

    await setWindowSize(app, 760, 620);
    await expect.poll(() => win.evaluate(() => window.innerWidth)).toBeLessThanOrEqual(760);
    const narrowColumns = await evidence.locator(".result-evidence-grid").evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length);
    expect(narrowColumns).toBe(1);
    const narrowOverflow = await evidence.evaluate((element) => element.scrollWidth - element.clientWidth);
    expect(narrowOverflow).toBeLessThanOrEqual(1);
    const receiptLayout = await card.evaluate((element) => {
      const receipt = element.getBoundingClientRect();
      const controls = [...element.querySelectorAll<HTMLElement>("button, summary")]
        .filter((control) => getComputedStyle(control).display !== "none")
        .map((control) => control.getBoundingClientRect());
      return {
        overflow: element.scrollWidth - element.clientWidth,
        controlsInside: controls.every((control) =>
          control.left >= receipt.left - 1 && control.right <= receipt.right + 1),
        animationName: getComputedStyle(element).animationName,
      };
    });
    expect(receiptLayout.overflow).toBeLessThanOrEqual(1);
    expect(receiptLayout.controlsInside).toBe(true);
    expect(receiptLayout.animationName).toBe("none");
    await setWindowSize(app, 760, 1000);
    await evidence.scrollIntoViewIfNeeded();
    await win.screenshot({ path: join(tmpdir(), "cairn-task-173-evidence-narrow.png") });
    await card.locator(":scope > .card-title").evaluate((title) =>
      title.scrollIntoView({ block: "start", behavior: "auto" }));
    await win.screenshot({ path: join(tmpdir(), "cairn-task-188-receipt-compact.png") });

    await claims.locator(":scope > summary").click();
    await request.locator(":scope > summary").click();
    await expect(claims.locator(".result-card-claims-body")).toBeVisible();
    await expect(request.locator(".result-card-request-body")).toBeVisible();
    const expandedOverflow = await card.evaluate((element) => element.scrollWidth - element.clientWidth);
    expect(expandedOverflow).toBeLessThanOrEqual(1);
    await claims.locator(":scope > summary").evaluate((summary) =>
      summary.scrollIntoView({ block: "start", behavior: "auto" }));
    await win.screenshot({ path: join(tmpdir(), "cairn-task-188-receipt-provenance.png") });
    await request.locator(":scope > summary").click();
    await claims.locator(":scope > summary").click();

    await evidence.getByRole("button", { name: "Open the local album" }).click();
    const narrowAlbum = win.locator(".evidence-album");
    await expect(narrowAlbum).toBeVisible();
    const narrowAlbumColumns = await narrowAlbum.locator(".evidence-album-entry-selected .evidence-album-images")
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length);
    expect(narrowAlbumColumns).toBe(1);
    const narrowAlbumOverflow = await win.locator(".overlay-card")
      .evaluate((element) => element.scrollWidth - element.clientWidth);
    expect(narrowAlbumOverflow).toBeLessThanOrEqual(1);
    await win.keyboard.press("Escape");

    await expect.poll(() => provider.bodies.length, { timeout: 20_000 }).toBeGreaterThan(0);
    const providerText = provider.bodies.join("\n");
    expect(providerText).not.toContain(saved?.value.runId);
    expect(providerText).not.toContain("data:image/png");
    expect(providerText).not.toContain("worker had not started");
    expect(providerText).not.toContain(evidenceProjectDirectory(project));

    await win.reload();
    await expect(win.locator(".result-card .result-evidence-figure")).toHaveCount(2, { timeout: 20_000 });
  } finally {
    if (app) await app.close();
    await closeServer(provider.server);
    rmSync(project, { recursive: true, force: true });
  }
});

test("a failed terminal capture shows one honest before image and replacement removes all evidence chrome", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-evidence-e2e-single-"));
  scaffold(project);
  const provider = await fakeProvider();
  const fakeCodex = fakeCodexEnvironment(project, true, "town-return");
  let app: ElectronApplication | null = null;
  try {
    app = await electron.launch({
      args: ["."],
      env: { ...process.env, ...fakeCodex.env, CAIRN_OPEN: project, CAIRN_MOCK: "0" },
    });
    const win = await app.firstWindow();
    await connectAndRestore(win, provider.baseUrl);
    await beginRun(win);
    await expect.poll(() => existsSync(fakeCodex.marker), { timeout: 20_000 }).toBe(true);

    await win.locator(".workspace-stage").evaluate((stage) => {
      stage.setAttribute("data-project-dir", "C:\\not-the-selected-project");
    });
    writeFileSync(fakeCodex.release, "finish\n");

    const evidence = win.locator(".result-card .result-evidence");
    await expect(evidence).toBeVisible({ timeout: 30_000 });
    await expect(evidence.locator(".result-evidence-figure")).toHaveCount(1);
    await expect(evidence.getByRole("heading", { name: "Before the worker started" })).toBeVisible();
    const saved = currentRecord(project);
    expect(saved?.value.captures).toHaveLength(1);
    expect(saved?.value.captures[0]?.boundary).toBe("worker-not-started");

    const capture = saved?.value.captures[0];
    if (!capture) throw new Error("The before capture was not recorded.");
    writeFileSync(join(dirname(saved!.path), capture.file), ONE_PIXEL_PNG);
    await win.reload();
    await expect(win.locator(".result-card")).toBeVisible({ timeout: 20_000 });
    await expect(win.locator(".result-card .result-evidence")).toHaveCount(0);
    await expect(win.getByRole("button", { name: "Open the local album" })).toHaveCount(0);
  } finally {
    if (app) await app.close();
    await closeServer(provider.server);
    rmSync(project, { recursive: true, force: true });
  }
});
