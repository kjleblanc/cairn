import { _electron as electron, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

// Task 007: load (reopen where the owner left off), switch (in place, one click),
// track (the projects screen tells the truth about broken entries).
//
// The app's remembered-projects list is a plain JSON file in the app's settings
// folder. Electron resolves that folder through the operating system, so it can't
// be redirected from here. Instead, these tests snapshot the real file, seed a
// clean list for a deterministic run, and restore the snapshot byte-for-byte in
// afterAll — which Playwright runs even when a test fails.

// Core is ESM and Playwright transpiles specs to CJS, so the scaffold runs in a
// node subprocess instead of being imported here (same pattern as smoke.spec.ts).
function scaffold(proj: string, name: string): void {
  const core = pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
  execFileSync(process.execPath, [
    "--input-type=module",
    "-e",
    `import { initProject } from ${JSON.stringify(core)}; initProject(process.argv[1], { name: process.argv[2], what: "w", who: "me", milestone: "see it", timebox: "default" });`,
    proj,
    name,
  ]);
}

// Electron's default per-user settings folder for an app named "Cairn".
function registryFile(): string {
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
      await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible({ timeout: 30000 });
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
    // No CAIRN_OPEN: the app should land straight on Beta's dashboard (most recent).
    const app = await electron.launch({ args: ["."], env: baseEnv() });
    const win = await app.firstWindow();
    await expect(win.getByRole("heading", { name: "Beta" })).toBeVisible({ timeout: 30000 });
    await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible();

    // The in-place switcher lists the other project with its stone count,
    // plus an "All projects" entry; one click lands on Alpha's dashboard.
    await win.getByRole("button", { name: "Switch project" }).click();
    await expect(win.getByRole("button", { name: "All projects" })).toBeVisible();
    const alphaItem = win.getByRole("button", { name: /Alpha/ });
    await expect(alphaItem).toContainText("0 stones");
    await alphaItem.click();
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

    // The broken entry is listed with its path, a plain reason, and a remove
    // button; the healthy project shows when it was last opened.
    const brokenCard = win.locator(".card", { hasText: "proj-a" });
    await expect(brokenCard.getByText(/can't find this project/)).toBeVisible();
    const betaCard = win.locator(".card", { hasText: "Beta" });
    await expect(betaCard.getByText("last opened today")).toBeVisible();
    const removeButton = win.getByRole("button", { name: "Remove from this list" });
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
    await expect(win.getByRole("heading", { name: "Beta" })).toBeVisible();
    await app.close();
  });
});
