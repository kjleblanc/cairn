import { _electron as electron, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

// Task 009: the five-step walk reads cleanly, and there is a way home — and
// back — while an agent works.
//  - Markdown the agents actually write (numbered lists, indented sub-points,
//    fenced code blocks, simple tables — including the real task 008 brief and
//    report from this repo) renders as document elements, no raw symbol litter.
//  - Leaving the task screen mid-run never cancels, restarts, or duplicates
//    the run: the reminder appears (and says so when the AI waits on a
//    question), a second start gets the engine room's plain refusal, and one
//    click returns to the same task — live or finished — through to its
//    normal end.

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

// Electron's default per-user settings folder for an app named "Cairn" (same
// helper as ask.spec.ts): snapshot the machine's real remembered-projects list
// and put it back afterwards, so a test run leaves no trace in the owner's app.
function registryFile(): string {
  if (process.platform === "win32") {
    return join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "Cairn", "projects.json");
  }
  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "Cairn", "projects.json");
  }
  return join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "Cairn", "projects.json");
}

// Every markdown shape the outcome names, wrapped across lines like real briefs.
const FIXTURE = [
  "# Task 001 — brief",
  "",
  "## What this proves",
  "",
  "This text exists to prove the renderer. Its paragraphs wrap across lines",
  "the way real briefs are written, and must read as one clean paragraph.",
  "",
  "1. **First step.** The lead sentence continues here and",
  "   wraps onto a second line that must join it.",
  "   - a sub-point, indented under the first step",
  "   - another sub-point with `inline code` in it",
  "2. **Second step.** Numbered items stay numbered.",
  "3. Third step, plain.",
  "",
  "```",
  'const fenced = "code block";',
  "```",
  "",
  "| Task | Lane | Outcome |",
  "|---|---|---|",
  "| 101 | Standard | DONE |",
  "| 102 | Tiny | STOPPED |",
  "",
  "The end of the fixture.",
].join("\n");

// The brief's yardstick: markdown Cairn's own agents actually wrote. Task
// history is immutable under the contract, so these bytes are stable.
function yardstick(): string {
  const tasks = join(__dirname, "..", "..", "docs", "ai-work", "tasks");
  return `${readFileSync(join(tasks, "008-brief.md"), "utf8")}\n\n${readFileSync(join(tasks, "008-report.md"), "utf8")}`;
}

test.describe("readable text, and a way home while the agent works", () => {
  test.describe.configure({ mode: "serial" });

  let root: string;
  let snapshot: Buffer | null = null;

  test.beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "cairn-away-"));
    const file = registryFile();
    snapshot = existsSync(file) ? readFileSync(file) : null;
  });

  test.afterAll(() => {
    const file = registryFile();
    if (snapshot) {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, snapshot);
    } else if (existsSync(file)) {
      rmSync(file);
    }
    try { rmSync(root, { recursive: true, force: true }); } catch { /* best-effort temp cleanup */ }
  });

  test("briefs render as a document — no raw markdown litter, real 008 texts included", async () => {
    const proj = join(root, "render");
    mkdirSync(proj);
    scaffold(proj, "Render");
    // A brief on disk with no approval resumes at the approve step, so the
    // exact crafted text below is what the renderer is fed.
    const briefFile = join(proj, "docs", "ai-work", "tasks", "001-brief.md");
    mkdirSync(dirname(briefFile), { recursive: true });
    writeFileSync(briefFile, `${FIXTURE}\n\n---\n\n${yardstick()}`);

    const app = await electron.launch({ args: ["."], env: { ...process.env, CAIRN_MOCK: "1", CAIRN_OPEN: proj } });
    const win = await app.firstWindow();

    await expect(win.getByRole("button", { name: "Continue it" })).toBeVisible({ timeout: 30000 });
    await win.getByRole("button", { name: "Continue it" }).click();
    const card = win.locator("section.card", { hasText: "task 001 — the brief" });
    await expect(card).toBeVisible();

    // Numbered list: a real <ol>, the wrapped lead line joined, sub-points nested.
    await expect(card.locator("ol > li").first())
      .toContainText("First step. The lead sentence continues here and wraps onto a second line that must join it.");
    await expect(card.locator("ol > li ul > li").first()).toContainText("a sub-point, indented under the first step");
    // Fenced code: one styled block, backticks consumed.
    await expect(card.locator("pre.md-code").first()).toContainText('const fenced = "code block";');
    // Simple table: real header and body cells.
    await expect(card.locator("table.md-table th").first()).toHaveText("Task");
    await expect(card.locator("table.md-table td").first()).toHaveText("101");

    // No raw markdown litter outside code blocks — in the fixture and in the
    // real task 008 brief and report alike.
    const text = await card.evaluate((el) => {
      const clone = el.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("pre").forEach((p) => p.remove());
      document.body.appendChild(clone); // innerText needs layout
      const t = clone.innerText;
      clone.remove();
      return t;
    });
    expect(text).not.toContain("**");
    expect(text).not.toContain("```");
    expect(text).not.toContain("|---");
    expect(text).not.toMatch(/^\s*\d+\.\s/m);
    expect(text).not.toMatch(/^\s*- /m);
    expect(text).not.toMatch(/^#+\s/m);

    await app.close();
  });

  test("going home mid-run never cancels, restarts, or duplicates the task", async () => {
    test.setTimeout(120_000);
    const proj = join(root, "wander");
    mkdirSync(proj);
    scaffold(proj, "Wander");

    const app = await electron.launch({ args: ["."], env: { ...process.env, CAIRN_MOCK: "1", CAIRN_OPEN: proj } });
    const win = await app.firstWindow();

    await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible({ timeout: 30000 });
    await win.getByRole("button", { name: "Start a task" }).click();
    await win.getByPlaceholder("The home page shows my list of books").fill("A demo file appears");
    await win.getByRole("button", { name: "Write the brief" }).click();

    // The mock definer pauses on its question — a guaranteed live, waiting run.
    await expect(win.getByText("the AI asks — question 1 of 3")).toBeVisible({ timeout: 15000 });

    // Home, while the AI waits: the dashboard appears with the reminder, and
    // the reminder says plainly that the AI is waiting on a question.
    await win.getByRole("button", { name: "← Project home" }).click();
    await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible({ timeout: 15000 });
    const reminder = win.locator("button.run-reminder");
    await expect(reminder).toContainText("The AI is waiting on a question for you");

    // A second start is refused with the engine room's own words.
    await win.getByRole("button", { name: "Start a task" }).click();
    await expect(win.getByText("One step at a time — an agent is already running.")).toBeVisible();

    // One click returns to the same live screen: the question is still there,
    // untouched — never silently thrown away.
    await reminder.click();
    await expect(win.getByText("the AI asks — question 1 of 3")).toBeVisible();

    // Step away again and stay away: the untouched card's demo self-skip fires
    // as today, the define finishes without us, and the reminder flips.
    await win.getByRole("button", { name: "← Project home" }).click();
    await expect(reminder).toContainText("has a brief ready for you to read", { timeout: 30000 });

    // Nothing restarted or doubled: still task 001, and exactly one brief file.
    await reminder.click();
    await expect(win.locator("section.card", { hasText: "task 001 — the brief" })).toBeVisible();
    const tasks = join(proj, "docs", "ai-work", "tasks");
    expect(existsSync(join(tasks, "001-brief.md"))).toBe(true);
    expect(existsSync(join(tasks, "002-brief.md"))).toBe(false);

    // Approve, then leave immediately mid-build: the reminder shows the run
    // living or already finished, and returning lands on the same task's report.
    await win.getByRole("button", { name: "Approve this exact brief" }).click();
    await win.getByRole("button", { name: "← Project home" }).click();
    await expect(reminder).toContainText(/still building|finished building/, { timeout: 15000 });
    await reminder.click();
    await expect(win.getByRole("button", { name: "Skip to the decision" })).toBeVisible({ timeout: 20000 });
    await expect(win.locator("section.card", { hasText: "task 001 — the report" })).toBeVisible();
    expect(existsSync(join(tasks, "002-brief.md"))).toBe(false);

    // The walk still ends normally — the run was never disturbed.
    await win.getByRole("button", { name: "Skip to the decision" }).click();
    await win.getByRole("button", { name: "Accept — it does what I wanted" }).click();
    await win.getByPlaceholder("What did you personally see?").fill("demo.txt exists");
    await win.getByRole("button", { name: "Yes", exact: true }).click();
    await win.getByRole("button", { name: "Close the task — a stone on your cairn" }).click();
    await expect(win.getByText("▸ idle · 1 stone · gate quiet")).toBeVisible();

    await app.close();
  });
});
