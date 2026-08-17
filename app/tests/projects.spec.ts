import { _electron as electron, expect } from "@playwright/test";
import { test } from "./fixtures/isolated-profile";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Owner gate 2 evidence (Task 259, Slice 4). Real production screenshots.
 *
 * `app/shots/` and not `app/test-results/`: Playwright clears its output
 * directory at the start of every run, and it cleared `test-results` WHOLE
 * during this task — taking Task 229's and Task 255's untracked evidence with
 * it, which had to be restored from a backup. `shots/` is the owner's existing
 * review directory, it is gitignored, and nothing clears it.
 */
const GATE = join(__dirname, "..", "shots", "task259-gate");
mkdirSync(GATE, { recursive: true });

// Task 007: load (reopen where the owner left off), switch (in place, one click),
// track (the projects screen tells the truth about broken entries).
//
// The app's remembered-projects list is a plain JSON file in the app's settings
// folder. Every spec runs against a throwaway copy of that folder (see
// fixtures/isolated-profile.ts), so `registryFile()` below resolves to the
// throwaway file and the owner's real list is never touched. The
// snapshot/seed/restore dance in this describe block therefore operates on the
// throwaway file — belt and suspenders: it keeps this block deterministic even
// if another spec one day shares the profile, and harmless if it never does.

// Core is ESM and Playwright transpiles specs to CJS, so the scaffold runs in a
// node subprocess instead of being imported here (same pattern as smoke.spec.ts).
function scaffold(proj: string, name: string): void {
  const core = pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
  execFileSync(process.execPath, [
    "--input-type=module",
    "-e",
    `import { initProject } from ${JSON.stringify(core)}; initProject(process.argv[1], { name: process.argv[2], what: "w", who: "me", milestone: "see it" });`,
    proj,
    name,
  ]);
}

// Electron's default per-user settings folder for an app named "Cairn".
function registryFile(): string {
  if (process.env.CAIRN_TEST_USER_DATA) return join(process.env.CAIRN_TEST_USER_DATA, "projects.json");
  if (process.platform === "win32") {
    return join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "Cairn", "projects.json");
  }
  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "Cairn", "projects.json");
  }
  return join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "Cairn", "projects.json");
}

type Entry = { dir: string; lastOpened: string };

function readRegistry(): Entry[] {
  return (JSON.parse(readFileSync(registryFile(), "utf8")) as { recent: Entry[] }).recent;
}

test.describe("remembered projects: load, switch, track", () => {
  test.describe.configure({ mode: "serial" });

  let root: string;
  let projA: string; // "Alpha"
  let projB: string; // "Beta"
  let snapshot: Buffer | null = null;

  function baseEnv(): { [key: string]: string } {
    const env: { [key: string]: string } = {};
    for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
    env.CAIRN_MOCK = "1";
    delete env.CAIRN_OPEN;
    return env;
  }

  test.beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "cairn-projects-"));
    projA = join(root, "proj-a");
    projB = join(root, "proj-b");
    mkdirSync(projA);
    mkdirSync(projB);
    scaffold(projA, "Alpha");
    scaffold(projB, "Beta");

    // Preserve the machine's real remembered list, then seed a clean one.
    const file = registryFile();
    snapshot = existsSync(file) ? readFileSync(file) : null;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ recent: [] }, null, 2));
  });

  test.afterAll(() => {
    // Put the machine's real remembered list back exactly as it was.
    const file = registryFile();
    if (snapshot !== null) writeFileSync(file, snapshot);
    else rmSync(file, { force: true });
    try { rmSync(root, { recursive: true, force: true }); } catch { /* best-effort temp cleanup */ }
  });

  test("remembers each opened project in its own list, keeping the file shape", async () => {
    // CAIRN_OPEN keeps first priority (the smoke test relies on it too).
    for (const [proj, name] of [[projA, "Alpha"], [projB, "Beta"]] as const) {
      const app = await electron.launch({ args: ["."], env: { ...baseEnv(), CAIRN_OPEN: proj } });
      const win = await app.firstWindow();
      // A governed project boots straight into chat; the dashboard is one click away.
      const projectHome = win.getByRole("button", { name: "← Project home" });
      await expect(projectHome).toBeVisible({ timeout: 30000 });
      await projectHome.click();
      await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible();
      await expect(win.getByRole("heading", { name })).toBeVisible();
      await app.close();
    }

    // The list keeps its exact shape: { recent: [{ dir, lastOpened }] },
    // most recent first, and each entry keeps a time of its own.
    const recent = readRegistry();
    expect(recent.map((e) => e.dir)).toEqual([projB, projA]);
    for (const e of recent) {
      expect(Object.keys(e).sort()).toEqual(["dir", "lastOpened"]);
      expect(typeof e.lastOpened).toBe("string");
      expect(Number.isNaN(Date.parse(e.lastOpened))).toBe(false);
    }
  });

  test("launch reopens the last project, and the switcher swaps in one click", async () => {
    // No CAIRN_OPEN: the app should land straight on Beta (most recent), in chat.
    const app = await electron.launch({ args: ["."], env: baseEnv() });
    const win = await app.firstWindow();
    // Chat is the home view; the dashboard is one click away.
    const projectHome = win.getByRole("button", { name: "← Project home" });
    await expect(projectHome).toBeVisible({ timeout: 30000 });
    const railProjects = win.locator(".rail-project-select");
    await expect(railProjects).toHaveCount(2);
    const rail = win.locator(".project-rail");
    await expect(rail).toHaveClass(/rp-desk-rail-slim/);
    await expect(win.getByRole("button", { name: /^Beta, idle/ })).toBeVisible();
    await win.getByRole("button", { name: "Expand project rail" }).click();
    await expect(railProjects.nth(0)).toContainText("Beta");
    await expect(railProjects.nth(1)).toContainText("Alpha");
    await win.getByRole("button", { name: "Collapse project rail" }).click();
    await expect(rail).toHaveClass(/rp-desk-rail-slim/);
    await win.getByRole("button", { name: "Expand project rail" }).click();

    /* REWRITTEN by Task 259 (Slice 4). This asserted the conversation was a
       DIALOG anchored beside Cairn inside a town square, and that tucking it
       away left a chip to bring it back. The desk retires all three: the
       conversation is a named region and the centre of gravity, the town is
       gone, and nothing puts the conversation away because there is nothing
       behind it to look at. What the test still proves is unchanged — the
       conversation survives a project switch and every width, and the project
       you are in is legible while it does. */
    const conversation = win.getByRole("region", { name: "Conversation with Cairn" });
    await expect(conversation).toBeVisible();
    await expect(win.getByRole("dialog", { name: "Conversation with Cairn" })).toHaveCount(0);
    const deskTitle = win.locator(".rp-desk-title");
    await expect(deskTitle).toHaveText("Beta");

    await win.locator(".rail-project-select", { hasText: "Alpha" }).click();
    await expect(deskTitle).toHaveText("Alpha");
    await expect(conversation).toBeVisible();
    await win.locator(".rail-project-select", { hasText: "Beta" }).click();
    await expect(deskTitle).toHaveText("Beta");

    // Narrow or wide, the conversation stays; the Chat/Town tabs are gone, and
    // so is everything that used to be able to hide it.
    await win.setViewportSize({ width: 900, height: 720 });
    await expect(win.getByRole("tab", { name: "Chat" })).toHaveCount(0);
    await expect(conversation).toBeVisible();
    await expect(win.locator(".town-square")).toHaveCount(0);
    await expect(win.locator(".pond-line")).toHaveCount(0);
    await expect(win.getByRole("button", { name: "Tuck the conversation away" })).toHaveCount(0);

    await win.setViewportSize({ width: 1320, height: 820 });
    await expect(conversation).toBeVisible();
    /* The activity capsule speaks at every width, and never has to be opened.
       This suite never connects a conductor, so the honest thing for it to say
       is that there is no connection — which is also the precedence table
       working: `disconnected` sits below every real run state and above a
       quiet desk, so with nothing running it is what shows. */
    await expect(win.locator(".rp-activity-status")).toHaveText("Not connected");

    await projectHome.click();
    await expect(win.getByRole("heading", { name: "Beta" })).toBeVisible();
    await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible();

    // The in-place switcher lists the other project with its stone count,
    // plus an "All projects" entry; one click lands on Alpha's dashboard.
    await win.getByRole("button", { name: "Switch project" }).click();
    await expect(win.getByRole("button", { name: "All projects" })).toBeVisible();
    const alphaItem = win.locator(".switcher-item", { hasText: "Alpha" });
    await expect(alphaItem).toContainText("0 stones");
    await alphaItem.click();
    await expect(win.locator(".rp-desk-title")).toHaveText("Alpha");
    await win.getByRole("button", { name: "← Project home" }).click();
    await expect(win.getByRole("heading", { name: "Alpha" })).toBeVisible();
    await app.close();
  });

  test("the desk's chrome contains itself at wide and compact sizes", async () => {
    // This proof deliberately does not use Project Home or Dashboard. It is
    // visual environment work, so its evidence stays valid if that older
    // navigation path is retired in a later, separately reconciled task.
    //
    // REWRITTEN by Task 259 (Slice 4). It measured the town square's header
    // inside the town pane, and asserted the pond line replaced that header
    // below 1260 px. The desk has one header at every width and an activity
    // capsule that never hides, so the containment contract is the same and
    // the surfaces it is measured on are not.
    const file = registryFile();
    const registryBefore = readFileSync(file);
    writeFileSync(file, JSON.stringify({ recent: [
      { dir: projB, lastOpened: "2026-08-05T12:01:00.000Z" },
      { dir: projA, lastOpened: "2026-08-05T12:00:00.000Z" },
    ] }, null, 2));

    try {
      const app = await electron.launch({ args: ["."], env: baseEnv() });
      try {
        const win = await app.firstWindow();
        await win.setViewportSize({ width: 1320, height: 820 });

        const railProjects = win.locator(".rail-project-select");
        await expect(railProjects).toHaveCount(2);
        await expect(win.locator(".project-rail")).toHaveClass(/rp-desk-rail-slim/);
        await expect(win.getByRole("button", { name: /^Beta, idle/ })).toHaveAttribute("aria-current", "page");
        await win.getByRole("button", { name: "Expand project rail" }).click();
        await expect(win.locator(".rail-project-select[aria-current='page']")).toContainText("Beta");

        await win.locator(".rail-project-select", { hasText: "Alpha" }).click();
        await expect(win.locator(".rp-desk-title")).toHaveText("Alpha");
        await expect(win.locator(".rail-project-select[aria-current='page']")).toContainText("Alpha");
        await win.locator(".rail-project-select", { hasText: "Beta" }).click();
        // Project switching reorders the rail under the pointer. Move onto the
        // desk so the evidence does not mistake an incidental hover for a
        // second selected project.
        await win.mouse.move(700, 500);
        await win.getByRole("button", { name: "Collapse project rail" }).click();
        await expect(win.locator(".project-rail")).toHaveClass(/rp-desk-rail-slim/);

        const conversation = win.getByRole("region", { name: "Conversation with Cairn" });
        const header = win.locator(".rp-desk-header");
        const capsule = win.locator(".rp-activity");
        await expect(conversation).toBeVisible();
        await expect(win.locator(".rail-project-select[aria-current='page']"))
          .toHaveAttribute("aria-label", /^Beta, idle/);
        await expect(win.locator(".town-square")).toHaveCount(0);
        await expect(win.locator(".pond-line")).toHaveCount(0);
        await expect(header).toBeVisible();
        await expect(win.locator(".rp-desk-title")).toHaveText("Beta");
        await expect(win.locator(".rp-desk-connection")).toBeVisible();
        await expect(capsule.locator("[role='status']")).toBeVisible();
        await expect.poll(() => conversation.evaluate((element) =>
          element.getAnimations().every((animation) => animation.playState !== "running"))).toBe(true);

        const chromeBounds = await win.evaluate(() => {
          const rail = document.querySelector<HTMLElement>(".project-rail")!.getBoundingClientRect();
          const stage = document.querySelector<HTMLElement>(".workspace-stage")!.getBoundingClientRect();
          const view = document.querySelector<HTMLElement>(".rp-desk-view")!.getBoundingClientRect();
          const bar = document.querySelector<HTMLElement>(".rp-desk-header")!.getBoundingClientRect();
          const state = document.querySelector<HTMLElement>(".rp-desk-connection")!.getBoundingClientRect();
          const activity = document.querySelector<HTMLElement>(".rp-activity")!.getBoundingClientRect();
          const paper = document.querySelector<HTMLElement>(".rp-conversation")!.getBoundingClientRect();
          return {
            railRight: rail.right, stageLeft: stage.left,
            stageLeft2: stage.left, stageRight: stage.right,
            barLeft: bar.left, barRight: bar.right, barBottom: bar.bottom,
            stateRight: state.right,
            activityTop: activity.top, activityBottom: activity.bottom,
            viewTop: view.top, viewLeft: view.left, viewRight: view.right,
            paperLeft: paper.left, paperRight: paper.right, paperBottom: paper.bottom,
            viewBottom: view.bottom,
          };
        });
        expect(Math.abs(chromeBounds.railRight - chromeBounds.stageLeft)).toBeLessThanOrEqual(1);
        // The header spans the stage, and the connection state is inside it —
        // whether you are connected is never the thing pushed off the edge.
        expect(chromeBounds.barLeft).toBeGreaterThanOrEqual(chromeBounds.stageLeft2 - 1);
        expect(chromeBounds.barRight).toBeLessThanOrEqual(chromeBounds.stageRight + 1);
        expect(chromeBounds.stateRight).toBeLessThanOrEqual(chromeBounds.barRight);
        // Header, capsule and view stack without overlapping, in that order.
        expect(chromeBounds.activityTop).toBeGreaterThanOrEqual(chromeBounds.barBottom - 1);
        expect(chromeBounds.viewTop).toBeGreaterThanOrEqual(chromeBounds.activityBottom - 1);
        // The conversation is centred paper inside the view, not spilling out.
        expect(chromeBounds.paperLeft).toBeGreaterThanOrEqual(chromeBounds.viewLeft - 1);
        expect(chromeBounds.paperRight).toBeLessThanOrEqual(chromeBounds.viewRight + 1);
        expect(chromeBounds.paperBottom).toBeLessThanOrEqual(chromeBounds.viewBottom + 1);
        expect(await win.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
        await win.screenshot({ path: join(tmpdir(), "cairn-task-259-desk-wide.png") });
        // Owner gate 2 evidence, in the repository rather than the temp
        // directory, because a gate's screenshots have to outlive the run.
        await win.setViewportSize({ width: 1320, height: 980 });
        await win.screenshot({ path: join(GATE, "01-empty-wide-1320x980.png") });

        // Compact: the project name drops and the activity DETAIL drops. The
        // activity STATE never does.
        await win.setViewportSize({ width: 760, height: 620 });
        await expect(win.locator(".rp-desk-title")).toBeHidden();
        await expect(capsule).toBeVisible();
        await expect(win.locator(".rp-activity-status")).toHaveText("Not connected");
        await expect(win.locator(".rp-desk-connection")).toBeVisible();
        await expect(conversation).toBeVisible();
        expect(await win.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
        await win.screenshot({ path: join(tmpdir(), "cairn-task-259-desk-minimum.png") });
        await win.screenshot({ path: join(GATE, "02-empty-minimum-760x620.png") });

        /* The test-only containment stress, 540×900. This is BELOW the
           supported 760 px minimum and is not a supported size; the plan does
           not lower that minimum. What must hold is only that a deliberately
           wide composition contains itself — the page never scrolls sideways,
           and the written state is still readable. */
        await win.setViewportSize({ width: 540, height: 900 });
        await expect(capsule).toBeVisible();
        await expect(win.locator(".rp-activity-status")).toHaveText("Not connected");
        await expect(win.locator(".rp-desk-connection")).toBeVisible();
        await expect(conversation).toBeVisible();
        expect(await win.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
          "the desk scrolls sideways at the 540px containment stress").toBe(true);
        await win.screenshot({ path: join(GATE, "03-empty-stress-540x900.png") });
        await win.setViewportSize({ width: 1320, height: 820 });
      } finally {
        await app.close();
      }
    } finally {
      writeFileSync(file, registryBefore);
    }
  });

  test("a broken entry is shown honestly; removing it edits only the app's list", async () => {
    // Break the most recent project (Alpha) the way an owner would: move the folder.
    const contentsBefore = readdirSync(projA).sort();
    const movedA = projA + "-moved";
    renameSync(projA, movedA);

    // Launch: reopening Alpha fails, so the app falls back to the projects
    // screen with a plain note — not an error dead-end.
    const app = await electron.launch({ args: ["."], env: baseEnv() });
    const win = await app.firstWindow();
    await expect(win.getByRole("heading", { name: "Your projects" })).toBeVisible({ timeout: 30000 });
    await expect(win.getByText(/couldn't reopen/)).toBeVisible();
    // Repo task 081: every screen that shows a stone count as a figure says
    // what the figure counts.
    await expect(win.getByText(/A stone marks a task whose record claims the milestone moved\./)).toBeVisible();

    // The broken entry is listed with its path, a plain reason, and a remove
    // button; the healthy project shows when it was last opened.
    const brokenCard = win.locator(".card", { hasText: "proj-a" });
    await expect(brokenCard.getByText(/can't find this project/)).toBeVisible();
    const betaCard = win.locator(".card", { hasText: "Beta" });
    await expect(betaCard.getByText("last opened today")).toBeVisible();
    // Scoped to the broken card: healthy cards carry the same control now.
    const removeButton = brokenCard.getByRole("button", { name: "Remove from this list" });
    await expect(removeButton).toBeVisible();

    // Removing edits only the app's own list…
    await removeButton.click();
    await expect(removeButton).not.toBeVisible();
    expect(readRegistry().map((e) => e.dir)).toEqual([projB]);

    // …and never touches the project folder itself: the moved folder still
    // exists with the same contents, and nothing reappeared at the old path.
    expect(existsSync(movedA)).toBe(true);
    expect(readdirSync(movedA).sort()).toEqual(contentsBefore);
    expect(existsSync(projA)).toBe(false);

    // The screen is still a working picker: Beta opens from here.
    await win.getByText("Beta", { exact: true }).click();
    await expect(win.locator(".rp-desk-title")).toHaveText("Beta");
    await win.getByRole("button", { name: "← Project home" }).click();
    await expect(win.getByRole("heading", { name: "Beta" })).toBeVisible();
    await app.close();
  });

  test("a healthy project can be removed without changing its folder, then opened again", async () => {
    const contract = join(projB, "AGENTS.md");
    const contractBefore = readFileSync(contract);

    const app = await electron.launch({ args: ["."], env: baseEnv() });
    const win = await app.firstWindow();
    await expect(win.getByRole("button", { name: "← Project home" })).toBeVisible({ timeout: 30_000 });
    await win.getByRole("button", { name: "← Project home" }).click();
    await win.getByRole("button", { name: "Switch project" }).click();
    await win.getByRole("button", { name: "All projects" }).click();

    const betaCard = win.locator(".card", { hasText: "Beta" });
    await betaCard.getByRole("button", { name: "Remove from this list" }).click();
    await expect(betaCard).toHaveCount(0);
    expect(readRegistry().some((entry) => entry.dir === projB)).toBe(false);
    expect(readFileSync(contract)).toEqual(contractBefore);

    // Opening the untouched folder through the same API the folder picker uses
    // both succeeds and remembers it again.
    const reopened = await win.evaluate((dir) => window.cairn.projectOpen(dir), projB);
    expect(reopened.ok).toBe(true);
    expect(readRegistry()[0]?.dir).toBe(projB);
    expect(readFileSync(contract)).toEqual(contractBefore);
    await app.close();
  });

  test("the remembered list is bounded: a legacy oversized file reads cheap and shrinks on the next open", async () => {
    // Task 110: seed 30 entries — a legacy file from before the bound — with
    // the still-healthy Beta last. The read cap keeps the boot scan inside
    // the renderer's poll (the Task 103 wedge started past this size), and
    // opening Beta rewrites the file at the cap: 25 entries, Beta first.
    const ghosts: Entry[] = Array.from({ length: 29 }, (_, i) => ({
      dir: join(root, `ghost-${String(i).padStart(2, "0")}`),
      lastOpened: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
    }));
    const seeded: Entry[] = [...ghosts, { dir: projB, lastOpened: new Date(Date.UTC(2026, 0, 2)).toISOString() }];
    writeFileSync(registryFile(), JSON.stringify({ recent: seeded }, null, 2));

    const app = await electron.launch({ args: ["."], env: { ...baseEnv(), CAIRN_OPEN: projB } });
    const win = await app.firstWindow();
    await expect(win.getByRole("button", { name: "← Project home" })).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => readRegistry()[0]?.dir).toBe(projB);
    expect(readRegistry()).toHaveLength(25);
    await app.close();
  });

  test("a failed open lets go: dismissible, and never follows across screens", async () => {
    // Task 159, the owner's report: one failed open floated over every screen
    // until a successful one replaced it. Reproduce that exact flow from
    // inside an open project — the overlay lists Beta healthy, its contract
    // file then goes away, and clicking its card fails the open.
    const projC = join(root, "proj-c");
    mkdirSync(projC);
    scaffold(projC, "Gamma");
    writeFileSync(registryFile(), JSON.stringify({
      recent: [
        { dir: projC, lastOpened: new Date().toISOString() },
        { dir: projB, lastOpened: new Date(Date.now() - 60_000).toISOString() },
      ],
    }, null, 2));

    const app = await electron.launch({ args: ["."], env: baseEnv() });
    const win = await app.firstWindow();
    await expect(win.locator(".rp-desk-title")).toHaveText("Gamma", { timeout: 30_000 });

    /* The overlay lists Beta healthy…
       `"Open project"` stood here and matched nothing. The rail's button
       carries `aria-label="Open a project"`, which wins over its content, and
       Playwright's name option is a case-insensitive SUBSTRING match — "open
       project" is not a substring of "open a project". Collapsed, which is the
       rail's default, the button has no text child at all. This was already
       failing on `main` at 19e7584, where the same line and the same
       `aria-label` both exist unchanged; Task 259 found it while rewriting the
       surfaces around it and fixed it in place rather than leaving a red the
       next slice would have to re-diagnose. */
    await win.getByRole("button", { name: "Open a project" }).click();
    const overlay = win.getByRole("dialog", { name: "Your projects" });
    const betaCard = overlay.locator(".card", { hasText: "Beta" });
    await expect(betaCard).toBeVisible();
    // …then its contract file goes away, so the open itself fails with the
    // owner's exact message.
    rmSync(join(projB, "AGENTS.md"));
    await betaCard.getByText("Beta", { exact: true }).click();

    // The card appears — and now carries a way out.
    const errorOverlay = win.locator(".app-error-overlay");
    await expect(errorOverlay).toContainText("That folder has no Cairn contract.");
    const dismiss = errorOverlay.getByRole("button", { name: "Got it" });
    await expect(dismiss).toBeVisible();
    // The owner's review routine: the settled capture goes to the shots page.
    await win.screenshot({ path: join(__dirname, "..", "shots", "task-159-error-card.png") });
    await dismiss.click();
    await expect(errorOverlay).toHaveCount(0);

    // Triggered again, closing the overlay acknowledges and clears it. The ×
    // is out of reach while the card floats over it (deliberate: the error
    // is acknowledged first — disclosed in the report), so this uses Escape,
    // one of the overlay's three ways out.
    await betaCard.getByText("Beta", { exact: true }).click();
    await expect(errorOverlay).toContainText("That folder has no Cairn contract.");
    await win.keyboard.press("Escape");
    await expect(win.getByRole("dialog", { name: "Your projects" })).toHaveCount(0);
    await expect(errorOverlay).toHaveCount(0);

    // …and the world underneath was alive the whole time.
    await expect(win.locator(".rp-desk-title")).toHaveText("Gamma");
    await app.close();
  });
});
