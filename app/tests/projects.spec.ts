import { _electron as electron, expect } from "@playwright/test";
import { test } from "./fixtures/isolated-profile";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

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
    await expect(railProjects.nth(0)).toContainText("Beta");
    await expect(railProjects.nth(1)).toContainText("Alpha");
    await win.getByRole("button", { name: "Collapse project rail" }).click();
    await expect(win.locator(".workspace-shell")).toHaveClass(/workspace-rail-collapsed/);
    await win.getByRole("button", { name: "Expand project rail" }).click();

    // The villager bubble (Task 146): no divider, no tabs — the conversation
    // is a tailed dialog anchored to Cairn inside the town, at any width.
    const dialog = win.getByRole("dialog", { name: "Conversation with Cairn" });
    await expect(dialog).toBeVisible();
    await expect(win.getByRole("region", { name: "Beta town square" })).toBeVisible();

    await win.locator(".rail-project-select", { hasText: "Alpha" }).click();
    await expect(win.getByRole("region", { name: "Alpha town square" })).toBeVisible();
    await expect(dialog).toBeVisible();
    await win.locator(".rail-project-select", { hasText: "Beta" }).click();
    await expect(win.getByRole("region", { name: "Beta town square" })).toBeVisible();

    // Narrow or wide, the bubble stays in the world; the Chat/Town tabs are gone.
    await win.setViewportSize({ width: 900, height: 720 });
    await expect(win.getByRole("tab", { name: "Chat" })).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(win.getByRole("region", { name: "Beta town square" })).toBeVisible();

    // Tucked, the conversation is a chip by Cairn; the chip — or Cairn's
    // own node — brings the dialog back.
    await win.getByRole("button", { name: "Tuck the conversation away" }).click();
    await expect(dialog).toHaveCount(0);
    const chip = win.getByRole("button", { name: "Open the conversation with Cairn" });
    await expect(chip).toBeVisible();
    // Force: the chip bobs gently on purpose (the approved mock look), and a
    // perpetually animating element never reads "stable" to Playwright.
    await chip.click({ force: true });
    await expect(dialog).toBeVisible();
    await win.getByRole("button", { name: "Tuck the conversation away" }).click();
    await win.getByRole("button", { name: "Cairn, ready" }).click();
    await expect(dialog).toBeVisible();

    await win.setViewportSize({ width: 1320, height: 820 });
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
    await expect(win.getByRole("region", { name: "Alpha town square" })).toBeVisible();
    await win.getByRole("button", { name: "← Project home" }).click();
    await expect(win.getByRole("heading", { name: "Alpha" })).toBeVisible();
    await app.close();
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
    await expect(win.getByRole("region", { name: "Beta town square" })).toBeVisible();
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
});
