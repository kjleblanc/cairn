import { _electron as electron, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { pathToFileURL } from "node:url";

function scaffold(proj: string): void {
  const core = pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
  execFileSync(process.execPath, [
    "--input-type=module",
    "-e",
    `import { initProject } from ${JSON.stringify(core)}; initProject(process.argv[1], { name: "Routing", what: "w", who: "me", milestone: "see it" });`,
    proj,
  ]);
  execFileSync("git", ["config", "user.name", "Cairn Test"], { cwd: proj });
  execFileSync("git", ["config", "user.email", "cairn-test@example.invalid"], { cwd: proj });
}

function fakeCodexEnvironment(_project: string, connected: boolean, behavior: "success" | "invalid-jsonl" | "missing-records" = "success"): { env: NodeJS.ProcessEnv; marker: string } {
  const bin = mkdtempSync(join(tmpdir(), "cairn-fake-codex-"));
  const marker = join(bin, "real-exec-started.txt");
  const dispatcher = join(bin, "fake-codex.cjs");
  const dispatcherSource = `
const fs = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2);
if (args.includes("--version")) process.exit(0);
if (args[0] === "login" && args[1] === "status") process.exit(${connected ? 0 : 1});
if (!args.includes("exec")) process.exit(2);
process.stdin.resume();
process.stdin.on("end", () => {
  fs.writeFileSync(process.env.CAIRN_FAKE_CODEX_MARKER, "started\\n");
  if (${JSON.stringify(behavior)} === "invalid-jsonl") {
    process.stdout.write("secret-looking malformed provider output\\n");
    return;
  }
  if (${JSON.stringify(behavior)} === "missing-records") {
    process.stdout.write(JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "sk-secret-event-payload" } }) + "\\n");
    process.stdout.write(JSON.stringify({ type: "item.completed", item: { type: "command_execution", command: "sk-secret-event-payload", status: "completed", exit_code: 0 } }) + "\\n");
    process.stdout.write(JSON.stringify({ type: "item.completed", item: { type: "command_execution", command: "sk-secret-event-payload", status: "failed", exit_code: 1 } }) + "\\n");
    process.stdout.write(JSON.stringify({ type: "item.completed", item: { type: "file_change", path: "sk-secret-event-payload", status: "completed" } }) + "\\n");
    process.stdout.write(JSON.stringify({ type: "item.completed", item: { type: "file_change", path: "sk-secret-event-payload", status: "failed" } }) + "\\n");
    process.stdout.write(JSON.stringify({ type: "turn.completed", usage: { input_tokens: 20, cached_input_tokens: 4, output_tokens: 6, reasoning_output_tokens: 2 } }) + "\\n");
    return;
  }
  const root = process.cwd();
  const tasks = path.join(root, "docs", "ai-work", "tasks");
  const brief = fs.readdirSync(tasks).find((name) => /^\\d{3}-brief\\.md$/.test(name) && !fs.existsSync(path.join(tasks, name.replace("-brief", "-report"))));
  if (!brief) process.exit(2);
  const number = brief.slice(0, 3);
  const report = path.join(tasks, number + "-report.md");
  const visible = path.join(root, "visible.txt");
  fs.writeFileSync(visible, "model-authored result\\n");
  fs.writeFileSync(report, "# Task " + number + " report\\n\\n## Result\\n\\nAdded the requested visible result and verified it.\\n\\nMilestone movement: **YES**\\n\\nDisposition: **DONE**\\n");
  const log = path.join(root, "docs", "ai-work", "LOG.md");
  fs.appendFileSync(log, "| " + number + " | 2026-07-21 | Standard | Applied | DONE | completed | Added and verified the visible result. | YES |\\n");
  process.stdout.write(JSON.stringify({ type: "thread.started", thread_id: "fake" }) + "\\n");
  process.stdout.write(JSON.stringify({ type: "turn.completed", usage: { input_tokens: 200, cached_input_tokens: 50, output_tokens: 80, reasoning_output_tokens: 20 } }) + "\\n");
});
`;
  writeFileSync(dispatcher, dispatcherSource);
  if (process.platform === "win32") {
    writeFileSync(join(bin, "codex.cmd"), `@"${process.execPath}" "${dispatcher}" %*\r\n`);
  } else {
    const executable = join(bin, "codex");
    writeFileSync(executable, `#!${process.execPath}\n${dispatcherSource}`);
    chmodSync(executable, 0o755);
  }
  // The fake install carries its own sandbox helper so command resolution
  // accepts it as-is, and LOCALAPPDATA points at an empty root so no test can
  // ever escape to a real versioned Codex install and start a real paid call.
  writeFileSync(join(bin, "codex-windows-sandbox-setup.exe"), "");
  const emptyLocalAppData = mkdtempSync(join(tmpdir(), "cairn-fake-localappdata-"));
  const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";
  return {
    marker,
    env: {
      [pathKey]: `${bin}${delimiter}${process.env[pathKey] ?? ""}`,
      CAIRN_FAKE_CODEX_MARKER: marker,
      LOCALAPPDATA: emptyLocalAppData,
    },
  };
}

test("the active renderer and IPC expose the serial route instead of legacy workflow surfaces", () => {
  const app = readFileSync(join(__dirname, "..", "src", "renderer", "App.tsx"), "utf8");
  const ipc = readFileSync(join(__dirname, "..", "src", "shared", "ipc.ts"), "utf8");
  expect(app).toContain('name: "task"');
  expect(app).not.toMatch(/Wizard|Scheduler|parallelDraft|TaskDeck|Direction/);
  expect(ipc).toMatch(/taskRoute/);
  expect(ipc).toMatch(/taskRun/);
  expect(ipc).not.toMatch(/taskDefine|taskApprove|taskBuild|taskReview|taskClose|schedulerStart|taskDirection|timebox/);
});

test("the production main bundle includes the Squirrel startup dependency", () => {
  const mainBundle = readFileSync(join(__dirname, "..", ".vite", "build", "main.js"), "utf8");
  expect(mainBundle).not.toMatch(/require\(["']electron-squirrel-startup["']\)/);
});

test("normal mode shows connection-required and creates no task records", async () => {
  const proj = mkdtempSync(join(tmpdir(), "cairn-routing-"));
  scaffold(proj);
  const logPath = join(proj, "docs", "ai-work", "LOG.md");
  const before = readFileSync(logPath, "utf8");
  const fakeCodex = fakeCodexEnvironment(proj, false);
  const app = await electron.launch({ args: ["."], env: { ...process.env, ...fakeCodex.env, CAIRN_OPEN: proj, CAIRN_MOCK: "0" } });
  const win = await app.firstWindow();
  await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible({ timeout: 30_000 });
  await win.getByRole("button", { name: "Start a task" }).click();
  await win.getByPlaceholder("Describe one visible outcome").fill("Create a welcome page");
  await win.getByRole("button", { name: "Find a route" }).click();
  await expect(win.getByRole("heading", { name: "Connect a model to continue" })).toBeVisible();
  await expect(win.getByText(/Codex Exec is installed but not connected/)).toBeVisible();
  expect(readFileSync(logPath, "utf8")).toBe(before);
  expect(existsSync(fakeCodex.marker)).toBe(false);
  await app.close();
});

test("connected Codex requires confirmation then completes one fake-process real-call path", async () => {
  const proj = mkdtempSync(join(tmpdir(), "cairn-codex-real-path-"));
  scaffold(proj);
  const fakeCodex = fakeCodexEnvironment(proj, true);
  const app = await electron.launch({ args: ["."], env: { ...process.env, ...fakeCodex.env, CAIRN_OPEN: proj, CAIRN_MOCK: "0" } });
  const win = await app.firstWindow();
  await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible({ timeout: 30_000 });
  await win.getByRole("button", { name: "Start a task" }).click();
  await win.getByPlaceholder("Describe one visible outcome").fill("Improve Cairn safely");
  await win.getByRole("button", { name: "Find a route" }).click();
  const route = win.getByRole("region", { name: "Recommended route" });
  await expect(route).toContainText("Codex Exec");
  await expect(route.locator(".route-facts p", { hasText: "Provider" })).toContainText("OpenAI");
  await expect(win.getByText("gpt-5.6-sol", { exact: true }).first()).toBeVisible();
  await expect(win.getByText(proj, { exact: true })).toBeVisible();
  await expect(win.getByText(/any file inside the selected project/i)).toBeVisible();
  await expect(win.getByText(/Exactly one ephemeral Codex Exec process/i)).toBeVisible();
  const start = win.getByRole("button", { name: "Start one real Codex Exec call" });
  await expect(start).toBeDisabled();
  const denied = await win.evaluate(async ({ project }) => window.cairn.taskRun(
    project,
    "Improve Cairn safely",
    123,
    "codex-exec",
    false,
  ), { project: proj });
  expect(denied.ok).toBe(false);
  const mismatched = await win.evaluate(async ({ project }) => {
    const preview = await window.cairn.taskRoute(project, "Improve Cairn safely");
    if (!preview.ok || !preview.value.disclosure) return preview;
    return window.cairn.taskRun(
      project,
      "A changed task instruction",
      124,
      "codex-exec",
      true,
      preview.value.disclosure,
    );
  }, { project: proj });
  expect(mismatched.ok).toBe(false);
  expect(existsSync(fakeCodex.marker)).toBe(false);
  expect(existsSync(join(proj, "docs", "ai-work", "tasks", "001-brief.md"))).toBe(false);
  await win.getByLabel("I confirm this one real Codex Exec call.").check();
  await expect(start).toBeEnabled();
  await start.click();
  await expect(win.getByRole("heading", { name: "Verified real Codex Exec result" })).toBeVisible({ timeout: 30_000 });
  await expect(win.getByText("Requested product change: completed and verified")).toBeVisible();
  await expect(win.getByText("Cairn verified the model-authored task records and Git result.")).toBeVisible();
  await expect(win.getByText("DONE — one real Codex Exec task completed and was verified.")).toBeVisible();
  expect(existsSync(fakeCodex.marker)).toBe(true);
  expect(readFileSync(join(proj, "visible.txt"), "utf8")).toBe("model-authored result\n");
  const report = readFileSync(join(proj, "docs", "ai-work", "tasks", "001-report.md"), "utf8");
  expect(report).toContain("Disposition: **DONE**");
  expect(execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: proj, encoding: "utf8" })).toBe("");
  await app.close();
});

test("malformed Codex JSONL fails closed without exposing raw process output", async () => {
  const proj = mkdtempSync(join(tmpdir(), "cairn-codex-invalid-jsonl-"));
  scaffold(proj);
  const fakeCodex = fakeCodexEnvironment(proj, true, "invalid-jsonl");
  const app = await electron.launch({ args: ["."], env: { ...process.env, ...fakeCodex.env, CAIRN_OPEN: proj, CAIRN_MOCK: "0" } });
  const win = await app.firstWindow();
  await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible({ timeout: 30_000 });
  await win.getByRole("button", { name: "Start a task" }).click();
  await win.getByPlaceholder("Describe one visible outcome").fill("Improve Cairn safely");
  await win.getByRole("button", { name: "Find a route" }).click();
  await win.getByLabel("I confirm this one real Codex Exec call.").check();
  await win.getByRole("button", { name: "Start one real Codex Exec call" }).click();
  await expect(win.getByRole("heading", { name: "Adapter stopped safely" })).toBeVisible({ timeout: 30_000 });
  await expect(win.getByText(/Cairn could not verify the model-authored records or Git result/)).toBeVisible();
  await expect(win.getByText(/Retained evidence needs inspection before another task/)).toBeVisible();
  await expect(win.getByText("Cairn verified the model-authored task records and Git result.")).toHaveCount(0);
  expect(existsSync(fakeCodex.marker)).toBe(true);
  const report = readFileSync(join(proj, "docs", "ai-work", "tasks", "001-report.md"), "utf8");
  expect(report).toContain("ADAPTER_FAILED");
  expect(report).not.toContain("secret-looking malformed provider output");
  expect(existsSync(join(proj, "visible.txt"))).toBe(false);
  await app.close();
});

test("missing model records show only bounded numeric Codex event evidence", async () => {
  const proj = mkdtempSync(join(tmpdir(), "cairn-codex-missing-records-"));
  scaffold(proj);
  const fakeCodex = fakeCodexEnvironment(proj, true, "missing-records");
  const app = await electron.launch({ args: ["."], env: { ...process.env, ...fakeCodex.env, CAIRN_OPEN: proj, CAIRN_MOCK: "0" } });
  const win = await app.firstWindow();
  await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible({ timeout: 30_000 });
  await win.getByRole("button", { name: "Start a task" }).click();
  await win.getByPlaceholder("Describe one visible outcome").fill("Add one bounded diagnostic");
  await win.getByRole("button", { name: "Find a route" }).click();
  await win.getByLabel("I confirm this one real Codex Exec call.").check();
  await win.getByRole("button", { name: "Start one real Codex Exec call" }).click();
  await expect(win.getByRole("heading", { name: "Adapter stopped safely" })).toBeVisible({ timeout: 30_000 });
  await expect(win.getByText(/Stopped safely: MODEL_RECORDS_MISSING/)).toBeVisible();
  await expect(win.getByText(/Bounded Codex events: 1 agent messages; 2 command executions; 2 file changes; 2 failed command\/file-change items/)).toBeVisible();
  expect(await win.locator("body").innerText()).not.toContain("sk-secret-event-payload");
  const report = readFileSync(join(proj, "docs", "ai-work", "tasks", "001-report.md"), "utf8");
  expect(report).toContain("MODEL_RECORDS_MISSING");
  expect(report).toContain("Bounded Codex events: 1 agent messages; 2 command executions; 2 file changes; 2 failed command/file-change items.");
  expect(report).not.toContain("sk-secret-event-payload");
  expect(existsSync(join(proj, "visible.txt"))).toBe(false);
  await app.close();
});

test("retained unmatched records stay visible without blocking a new task", async () => {
  const proj = mkdtempSync(join(tmpdir(), "cairn-retained-record-"));
  scaffold(proj);
  writeFileSync(join(proj, "docs", "ai-work", "tasks", "001-brief.md"), "# Retained brief\n");

  const app = await electron.launch({ args: ["."], env: { ...process.env, CAIRN_MOCK: "1", CAIRN_OPEN: proj } });
  const win = await app.firstWindow();
  await expect(win.getByText("retained task evidence")).toBeVisible({ timeout: 30_000 });
  await expect(win.getByText(/without blocking a new task/)).toBeVisible();
  await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible();
  await app.close();
});
