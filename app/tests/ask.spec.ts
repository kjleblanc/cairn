import { _electron as electron, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

// Task 008: two-way talk in mock mode, end to end.
//  - While the brief is written, the AI's question card appears; the owner's
//    answer flows back into the same run and lands in the brief.
//  - Before approving, the owner can ask about the brief (plain answer, brief
//    untouched) or request a change (revised brief, shown again).
//  - Approval locks exactly the final shown brief: the recorded hash matches
//    the brief file byte for byte — and building then works as before.
//  - Skipping a question never hangs or kills the run: the brief carries the
//    written assumption instead.

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
// helper as projects.spec.ts): these tests snapshot the machine's real
// remembered-projects list and put it back afterwards, so a test run leaves no
// trace in the owner's own app.
function registryFile(): string {
  if (process.platform === "win32") {
    return join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "Cairn", "projects.json");
  }
  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "Cairn", "projects.json");
  }
  return join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "Cairn", "projects.json");
}

test.describe("two-way talk: questions while defining, ask-or-change before approving", () => {
  test.describe.configure({ mode: "serial" });

  let root: string;
  let snapshot: Buffer | null = null;

  test.beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "cairn-ask-"));
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
  });

  test("answer → brief; ask-or-change rounds; approval locks the final shown text", async () => {
    const proj = join(root, "talk");
    mkdirSync(proj);
    scaffold(proj, "Talk");

    const app = await electron.launch({ args: ["."], env: { ...process.env, CAIRN_MOCK: "1", CAIRN_OPEN: proj } });
    const win = await app.firstWindow();

    await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible({ timeout: 30000 });
    await win.getByRole("button", { name: "Start a task" }).click();
    await win.getByPlaceholder("The home page shows my list of books").fill("A demo file appears");
    await win.getByRole("button", { name: "Write the brief" }).click();

    // 1. The AI's question card appears and pauses the run; answering resumes it,
    //    and the exact answer lands in the drafted brief.
    await expect(win.getByText("the AI asks — question 1 of 3")).toBeVisible({ timeout: 15000 });
    await expect(win.getByText(/never needs a password or key/)).toBeVisible();
    await win.getByPlaceholder("Your answer, in plain words").fill("tread carefully around the demo note");
    await win.getByRole("button", { name: "Send answer" }).click();

    await expect(win.getByRole("button", { name: "Approve this exact brief" })).toBeVisible({ timeout: 15000 });
    await expect(win.getByText(/The owner answered: tread carefully around the demo note/)).toBeVisible();

    // 2. A question round: a plain answer appears and the brief is untouched.
    const box = win.getByPlaceholder("e.g. Why is that file excluded? / Please keep it to one screen");
    await box.fill("Does this touch anything else?");
    await win.getByRole("button", { name: "Send to the AI" }).click();
    await expect(win.getByText(/Answer \(mock\)/)).toBeVisible({ timeout: 15000 });
    await expect(win.getByText("Revision (mock)")).toHaveCount(0);

    // 3. A change round: the brief is revised and shown again before any approval.
    await box.fill("Please also cover the demo note");
    await win.getByRole("button", { name: "Send to the AI" }).click();
    await expect(win.getByText(/The brief was revised — read it again before approving/)).toBeVisible({ timeout: 15000 });
    await expect(win.getByText("Revision (mock)").first()).toBeVisible();
    await expect(win.getByText(/Please also cover the demo note/).first()).toBeVisible();

    // The shown revision is exactly what sits in the brief file.
    const briefFile = join(proj, "docs", "ai-work", "tasks", "001-brief.md");
    const briefBytes = readFileSync(briefFile);
    expect(briefBytes.toString("utf8")).toContain("Revision (mock)");
    expect(briefBytes.toString("utf8")).toContain("The owner answered: tread carefully around the demo note");

    // 4. Approving locks exactly that final text: the recorded hash matches the
    //    brief file byte for byte — and building then works exactly as before.
    await win.getByRole("button", { name: "Approve this exact brief" }).click();
    await expect(win.getByRole("button", { name: "Skip to the decision" })).toBeVisible({ timeout: 20000 });

    const approval = JSON.parse(readFileSync(join(proj, "docs", "ai-work", "tasks", "001-approval.json"), "utf8")) as { briefSha256: string };
    const lockedNow = createHash("sha256").update(readFileSync(briefFile)).digest("hex");
    expect(approval.briefSha256).toBe(lockedNow);
    expect(readFileSync(briefFile)).toEqual(briefBytes); // approval changed nothing

    await app.close();
  });

  test("skipping a question neither hangs nor kills the run — the assumption is written instead", async () => {
    const proj = join(root, "skip");
    mkdirSync(proj);
    scaffold(proj, "Skip");

    const app = await electron.launch({ args: ["."], env: { ...process.env, CAIRN_MOCK: "1", CAIRN_OPEN: proj } });
    const win = await app.firstWindow();

    await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible({ timeout: 30000 });
    await win.getByRole("button", { name: "Start a task" }).click();
    await win.getByPlaceholder("The home page shows my list of books").fill("A demo file appears");
    await win.getByRole("button", { name: "Write the brief" }).click();

    await expect(win.getByText("the AI asks — question 1 of 3")).toBeVisible({ timeout: 15000 });
    await win.getByRole("button", { name: "Skip — let the AI use its judgment" }).click();

    // The run finishes on its own and the brief carries the written assumption.
    await expect(win.getByRole("button", { name: "Approve this exact brief" })).toBeVisible({ timeout: 15000 });
    await expect(win.getByText(/No answer — use your best judgment/)).toBeVisible();

    await app.close();
  });
});
