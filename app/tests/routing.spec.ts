import { _electron as electron, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
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
}

function fakeCodexEnvironment(project: string, connected: boolean): { env: NodeJS.ProcessEnv; marker: string } {
  const bin = mkdtempSync(join(tmpdir(), "cairn-fake-codex-"));
  const executable = join(bin, process.platform === "win32" ? "codex.exe" : "codex");
  if (process.platform === "win32") copyFileSync(process.execPath, executable);
  else { symlinkSync(process.execPath, executable); chmodSync(executable, 0o755); }
  const marker = join(bin, "real-exec-started.txt");
  writeFileSync(join(project, "login"), `process.exit(${connected ? 0 : 1});\n`);
  writeFileSync(join(project, "exec"), 'require("node:fs").writeFileSync(process.env.CAIRN_FAKE_CODEX_MARKER, "started\\n");\n');
  const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";
  return {
    marker,
    env: {
      [pathKey]: `${bin}${delimiter}${process.env[pathKey] ?? ""}`,
      CAIRN_FAKE_CODEX_MARKER: marker,
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

test("connected Codex readiness reaches the honest real-call boundary without starting exec", async () => {
  const proj = mkdtempSync(join(tmpdir(), "cairn-codex-boundary-"));
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
  await win.getByRole("button", { name: "Prepare Codex Exec run" }).click();
  await expect(win.getByRole("heading", { name: "Stopped before the real model call" })).toBeVisible();
  await expect(win.getByText("Real Codex Exec process: not started")).toBeVisible();
  expect(existsSync(fakeCodex.marker)).toBe(false);
  const report = readFileSync(join(proj, "docs", "ai-work", "tasks", "001-report.md"), "utf8");
  expect(report).toContain("REAL_MODEL_CALL_NOT_AUTHORIZED");
  expect(report).toContain("No task data was sent to OpenAI");
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
