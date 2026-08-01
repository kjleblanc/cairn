import { _electron as electron, expect, type ElectronApplication, type Page } from "@playwright/test";
import { test } from "./fixtures/isolated-profile";
import { detachStoredConnection, restoreStoredConnection } from "./fixtures/conductor-connection";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// Task 161: conversion end to end. From the picker's "bring an existing
// project" card, the owner picks an ordinary folder, reads what Cairn found,
// answers four questions, and approves — the folder becomes a governed Cairn
// project (rulebook + records + one exact-path commit) and opens. The
// folder's pre-existing files and other tools' rules stay byte-identical.
//
// The native folder dialog is stood in for by the app's own test seam
// (CAIRN_TEST_PICK_FOLDER, the same family as CAIRN_OPEN); everything after
// the pick is the real flow.

function run(cwd: string, args: string[]) {
  execFileSync("git", args, { cwd, stdio: "pipe" });
}

function writeProject(dir: string, name: string) {
  mkdirSync(join(dir, "docs", "ai-work", "tasks"), { recursive: true });
  writeFileSync(
    join(dir, "AGENTS.md"),
    `# Project Contract\n\n\`\`\`text\nSTATUS: ACTIVE\nPROJECT NAME: ${name}\nWHAT WE ARE BUILDING: an e2e fixture\nWHO WILL USE IT: the suite\nCURRENT MILESTONE: fixture milestone\n\`\`\`\n\nCairn Contract v0.6.0\n`,
  );
  writeFileSync(join(dir, "docs", "ai-work", "PROJECT.md"), `# ${name}\n`);
  writeFileSync(
    join(dir, "docs", "ai-work", "LOG.md"),
    "| Task | Date | Lane | Draft/Final | Outcome | Decision | One-line summary | Milestone moved? |\n|---|---|---|---|---|---|---|---|\n",
  );
  run(dir, ["init", "-b", "main"]);
  run(dir, ["config", "user.email", "e2e@cairn.local"]);
  run(dir, ["config", "user.name", "Cairn E2E"]);
  run(dir, ["add", "-A"]);
  run(dir, ["commit", "-m", "scaffold"]);
}

let tmpRoot: string;
let homeDir: string;
let targetDir: string;
let fixtureClose: () => Promise<void> = async () => {};

test.beforeAll(async () => {
  const fixturePath = pathToFileURL(join(__dirname, "fixtures", "fake-conductor.mjs")).href;
  const fixture = (await import(fixturePath)) as {
    start: () => Promise<{ url: string; close: () => Promise<void> }>;
  };
  const server = await fixture.start();
  fixtureUrl = server.url;
  fixtureClose = server.close;
  detachStoredConnection();

  tmpRoot = mkdtempSync(join(tmpdir(), "cairn-convert-e2e-"));
  homeDir = join(tmpRoot, "Home Base");
  targetDir = join(tmpRoot, "LegacyApp");
  mkdirSync(homeDir, { recursive: true });
  writeProject(homeDir, "Home Base");

  // The conversion target: an ordinary project folder with its own history,
  // another tool's rules, and one untracked file — all must survive.
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(join(targetDir, "app.py"), "print('hello')\n");
  writeFileSync(join(targetDir, "CLAUDE.md"), "# Claude rules\n");
  run(targetDir, ["init", "-b", "main"]);
  run(targetDir, ["config", "user.email", "e2e@cairn.local"]);
  run(targetDir, ["config", "user.name", "Cairn E2E"]);
  run(targetDir, ["add", "-A"]);
  run(targetDir, ["commit", "-m", "existing work"]);
  writeFileSync(join(targetDir, "notes.txt"), "untracked, stay that way\n");
});

let fixtureUrl = "";

test.afterAll(async () => {
  await fixtureClose();
  restoreStoredConnection();
  rmSync(tmpRoot, { recursive: true, force: true });
});

test("an ordinary folder converts from the picker card and opens as a Cairn project", async () => {
  const env: { [key: string]: string } = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
  env.CAIRN_MOCK = "1";
  env.CAIRN_OPEN = homeDir;
  env.CAIRN_TEST_PICK_FOLDER = targetDir;

  const app: ElectronApplication = await electron.launch({
    args: [join(__dirname, "..")],
    env,
  });
  const win: Page = await app.firstWindow();

  try {
    // Mock mode boots disconnected; connect the fixture brain so the project
    // screen is usable after the conversion opens it.
    const card = win.locator(".card", { hasText: "connect cairn's brain" });
    await expect(card).toBeVisible({ timeout: 30_000 });
    await win.getByRole("button", { name: "Choose a different brain" }).click();
    await win.getByRole("button", { name: "Custom…" }).click();
    await card.locator('input[type="text"]').first().fill(fixtureUrl);
    await win.getByPlaceholder("e.g. moonshotai/kimi-k3").fill("convert-e2e-model");
    await win.getByPlaceholder("Stored encrypted; shown never again").fill("sk-test-key");
    await card.locator('input[type="checkbox"]').check();
    await win.getByRole("button", { name: "Connect" }).click();
    await expect(card).not.toBeVisible({ timeout: 10_000 });

    await win.getByRole("button", { name: "Open project" }).click();
    const overlay = win.getByRole("dialog", { name: "Your projects" });
    await overlay.getByRole("button", { name: "Convert an existing project" }).click();

    // The read-only look comes first: what Cairn found, stated plainly.
    await expect(win.getByRole("heading", { name: "Convert an existing project" })).toBeVisible();
    await expect(win.getByText(targetDir)).toBeVisible();
    await expect(win.getByText(/a git repository on branch main/)).toBeVisible();
    await expect(win.getByText(/1 untracked path\(s\)/)).toBeVisible();
    await expect(win.getByText(/CLAUDE\.md — another tool's rules/)).toBeVisible();
    await expect(win.getByText(/one git commit containing only those new files/)).toBeVisible();

    // Four questions — the name is pre-filled from the folder.
    await expect(win.getByPlaceholder("Recipe Box")).toHaveValue("LegacyApp");
    await win.getByPlaceholder("A simple app where I can save and search my recipes").fill("A tiny notes app");
    await win.getByPlaceholder("Just me, maybe my family later").fill("just me");
    await win.getByPlaceholder("A page that lists three of my recipes").fill("a page that shows one note");
    await win.getByRole("button", { name: "Convert this project" }).click();

    // The converted project opens like any project.
    await expect(win.getByPlaceholder("Talk with Cairn")).toBeVisible({ timeout: 15_000 });

    // On disk: rulebook, records, conversion report, one exact-path commit.
    const contract = readFileSync(join(targetDir, "AGENTS.md"), "utf8");
    expect(contract).toContain("# Project Contract");
    expect(contract).toContain("PROJECT NAME: LegacyApp");
    expect(contract).toContain("CURRENT MILESTONE: a page that shows one note");
    expect(existsSync(join(targetDir, "docs", "ai-work", "LOG.md"))).toBe(true);
    const report = readFileSync(join(targetDir, "docs", "ai-work", "CONVERSION.md"), "utf8");
    expect(report).toContain("CLAUDE.md");
    const subjects = execFileSync("git", ["log", "--format=%s"], { cwd: targetDir, encoding: "utf8" });
    expect(subjects.split("\n")[0]).toBe("Cairn conversion: contract and project records");
    const committed = execFileSync("git", ["show", "--name-only", "--format=", "HEAD"], { cwd: targetDir, encoding: "utf8" })
      .split("\n").filter(Boolean).sort();
    expect(committed).toEqual(["AGENTS.md", "docs/ai-work/CONVERSION.md", "docs/ai-work/LOG.md", "docs/ai-work/PROJECT.md"]);
    // What was there stays there, exactly: other rules intact, the untracked
    // file still untracked, the tracked file unmodified.
    expect(readFileSync(join(targetDir, "CLAUDE.md"), "utf8")).toBe("# Claude rules\n");
    const status = execFileSync("git", ["status", "--porcelain"], { cwd: targetDir, encoding: "utf8" });
    expect(status).toContain("?? notes.txt");
    expect(status).not.toMatch(/^ M /m);
  } finally {
    await app.close();
  }
});
