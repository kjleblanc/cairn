import { _electron as electron, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { conductorFile, detachStoredConnection, restoreStoredConnection } from "./fixtures/conductor-connection";
import { fakeCodexEnvironment } from "./fixtures/fake-codex-env";

// One test here dispatches with `conversationId: "conv-1"`, which since Task 8
// posts a result card and since Task 9 asks the conductor to comment on it —
// a paid call against whatever provider connection is stored on this machine.
// This spec never wants one, so it runs against no connection at all and puts
// back exactly what it found.
test.beforeAll(() => { detachStoredConnection(); });
test.afterAll(() => { restoreStoredConnection(); });

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

test("the active renderer and IPC expose the serial route instead of legacy workflow surfaces", () => {
  const app = readFileSync(join(__dirname, "..", "src", "renderer", "App.tsx"), "utf8");
  const ipc = readFileSync(join(__dirname, "..", "src", "shared", "ipc.ts"), "utf8");
  const chat = readFileSync(join(__dirname, "..", "src", "renderer", "screens", "Chat.tsx"), "utf8");
  expect(app).toContain('name: "task"');
  expect(app).not.toMatch(/Wizard|Scheduler|parallelDraft|TaskDeck|Direction/);
  // Task 5: dispatch is inline. Chat's confirmation panel mounts the SAME
  // disclosure-and-confirm block the task screen uses, so the six facts an
  // owner reads before a paid call cannot drift between the two places a run
  // can start; the prefill navigation it replaced stays deleted.
  expect(chat).toContain("<DisclosureConfirm");
  expect(chat).not.toMatch(/onOpenTask/);
  expect(app).not.toMatch(/initialOutcome/);
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
  // A governed project boots straight into chat; the dashboard is one click away.
  const projectHome = win.getByRole("button", { name: "← Project home" });
  await expect(projectHome).toBeVisible({ timeout: 30_000 });
  await projectHome.click();
  await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible();
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
  // A governed project boots straight into chat; the dashboard is one click away.
  const projectHome = win.getByRole("button", { name: "← Project home" });
  await expect(projectHome).toBeVisible({ timeout: 30_000 });
  await projectHome.click();
  await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible();
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
  const denied = await win.evaluate(async ({ project }) => window.cairn.taskRun({
    dir: project,
    outcome: "Improve Cairn safely",
    details: "",
    adapterId: "codex-exec",
    realCallConfirmed: false,
  }), { project: proj });
  expect(denied.ok).toBe(false);
  const mismatched = await win.evaluate(async ({ project }) => {
    const preview = await window.cairn.taskRoute(project, "Improve Cairn safely", "");
    if (!preview.ok || !preview.value.disclosure) return preview;
    return window.cairn.taskRun({
      dir: project,
      outcome: "A changed task instruction",
      details: "",
      adapterId: "codex-exec",
      realCallConfirmed: true,
      disclosure: preview.value.disclosure,
    });
  }, { project: proj });
  expect(mismatched.ok).toBe(false);
  expect(existsSync(fakeCodex.marker)).toBe(false);
  expect(existsSync(join(proj, "docs", "ai-work", "tasks", "001-brief.md"))).toBe(false);
  await win.getByLabel("I confirm this one real Codex Exec call.").check();
  await expect(start).toBeEnabled();
  await start.click();
  await expect(win.getByRole("heading", { name: "Verified real Codex Exec result" })).toBeVisible({ timeout: 30_000 });
  await expect(win.getByText("Requested product change: completed and verified")).toBeVisible();
  await expect(win.getByText("Cairn verified the worker's changes and authored the task records itself.")).toBeVisible();
  await expect(win.getByText("DONE — one real Codex Exec task completed and was verified.")).toBeVisible();
  expect(existsSync(fakeCodex.marker)).toBe(true);
  expect(readFileSync(join(proj, "visible.txt"), "utf8")).toBe("model-authored result\n");
  const report = readFileSync(join(proj, "docs", "ai-work", "tasks", "001-report.md"), "utf8");
  expect(report).toContain("Disposition: **DONE**");
  expect(execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: proj, encoding: "utf8" })).toBe("");
  await app.close();
});

// Task 5 (Phase 3): the same real-call path, carrying the owner's own data.
// Four sites have to thread `details`, or the worker is handed a request the
// owner never confirmed. Each is caught by a DIFFERENT assertion below, which
// is why they all stand together (mapping corrected in Task 6; the earlier
// version of this comment named the wrong catcher for two of them):
//
//   route disclosure (`task:route`) — caught by `expect(disclosure.task)`:
//     the card stops naming the details it is about to send.
//   run-time disclosure gate (`task:run`) — caught by `expect(stale.ok)`:
//     a card confirmed for the outcome alone could dispatch this request.
//   the authorization handed to the adapter — caught by the confirmed run's
//     own `not.toContain("REAL_MODEL_CALL_NOT_AUTHORIZED")`: the gate refuses
//     every details-bearing dispatch instead of starting it.
//   `runSerialTask`'s own options — caught by that same pair of refusal
//     assertions, one layer down: core's `authorizationMatches` refuses the
//     contract, so no process ever spawns. NOT the prompt assertion — with no
//     run there is no capture file for it to read.
test("a details-bearing dispatch carries the owner's own data into the confirmed card and the real Codex prompt", async () => {
  const proj = mkdtempSync(join(tmpdir(), "cairn-codex-details-"));
  scaffold(proj);
  const fakeCodex = fakeCodexEnvironment(proj, true);
  const app = await electron.launch({ args: ["."], env: { ...process.env, ...fakeCodex.env, CAIRN_OPEN: proj, CAIRN_MOCK: "0" } });
  const win = await app.firstWindow();
  await expect(win.getByRole("button", { name: "← Project home" })).toBeVisible({ timeout: 30_000 });

  const outcome = "Add the shelf counts to the page";
  const details = "Use exactly 74, 477, 256 — do not round.";

  // The card the owner reads names BOTH parts of the request, concatenated
  // by core. This is the string the confirmation panel renders verbatim.
  const preview = await win.evaluate(
    ({ project, task, data }) => window.cairn.taskRoute(project, task, data),
    { project: proj, task: outcome, data: details },
  );
  expect(preview.ok).toBe(true);
  if (!preview.ok || !preview.value.disclosure) throw new Error("the codex lane must disclose its real call");
  const disclosure = preview.value.disclosure;
  expect(disclosure.task).toBe(`${outcome}\n\nDetails (verbatim):\n${details}`);

  // A card confirmed for the outcome alone cannot dispatch this request.
  const stale = await win.evaluate(async ({ project, task, data }) => {
    const outcomeOnly = await window.cairn.taskRoute(project, task, "");
    if (!outcomeOnly.ok || !outcomeOnly.value.disclosure) return outcomeOnly;
    return window.cairn.taskRun({
      dir: project, outcome: task, details: data, adapterId: "codex-exec",
      realCallConfirmed: true, disclosure: outcomeOnly.value.disclosure, conversationId: null,
    });
  }, { project: proj, task: outcome, data: details });
  expect(stale.ok).toBe(false);
  expect(JSON.stringify(stale)).toContain("REAL_MODEL_CALL_NOT_AUTHORIZED");
  expect(existsSync(fakeCodex.marker)).toBe(false);

  // The confirmed request runs: not refused, and the worker is handed the
  // owner's data unedited.
  //
  // This dispatch carries a conversation id, so its result card triggers the
  // envelope's own paid comment call. The `beforeAll` detach is what keeps that
  // off a developer's real provider account; assert it right here, one line
  // before the dispatch, so the protection is checked in this process rather
  // than assumed from a hook at the top of the file (repo task 080).
  expect(existsSync(conductorFile())).toBe(false);
  const run = await win.evaluate(
    ({ project, task, data, card }) => window.cairn.taskRun({
      dir: project, outcome: task, details: data, adapterId: "codex-exec",
      realCallConfirmed: true, disclosure: card, conversationId: "conv-1",
    }),
    { project: proj, task: outcome, data: details, card: disclosure },
  );
  expect(JSON.stringify(run)).not.toContain("REAL_MODEL_CALL_NOT_AUTHORIZED");
  expect(run.ok).toBe(true);
  if (run.ok) expect(run.value.status).toBe("done");
  expect(existsSync(fakeCodex.marker)).toBe(true);

  const prompt = readFileSync(fakeCodex.prompt, "utf8");
  expect(prompt).toContain("Details from the owner (use verbatim, do not restate):");
  expect(prompt).toContain(details);
  const brief = readFileSync(join(proj, "docs", "ai-work", "tasks", "001-brief.md"), "utf8");
  expect(brief).toContain(details);
  const session = await win.evaluate((project) => window.cairn.taskCurrent(project), proj);
  expect(session?.conversationId).toBe("conv-1");
  await app.close();
});

test("malformed Codex JSONL fails closed without exposing raw process output", async () => {
  const proj = mkdtempSync(join(tmpdir(), "cairn-codex-invalid-jsonl-"));
  scaffold(proj);
  const fakeCodex = fakeCodexEnvironment(proj, true, "invalid-jsonl");
  const app = await electron.launch({ args: ["."], env: { ...process.env, ...fakeCodex.env, CAIRN_OPEN: proj, CAIRN_MOCK: "0" } });
  const win = await app.firstWindow();
  // A governed project boots straight into chat; the dashboard is one click away.
  const projectHome = win.getByRole("button", { name: "← Project home" });
  await expect(projectHome).toBeVisible({ timeout: 30_000 });
  await projectHome.click();
  await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible();
  await win.getByRole("button", { name: "Start a task" }).click();
  await win.getByPlaceholder("Describe one visible outcome").fill("Improve Cairn safely");
  await win.getByRole("button", { name: "Find a route" }).click();
  await win.getByLabel("I confirm this one real Codex Exec call.").check();
  await win.getByRole("button", { name: "Start one real Codex Exec call" }).click();
  await expect(win.getByRole("heading", { name: "Adapter stopped safely" })).toBeVisible({ timeout: 30_000 });
  await expect(win.getByText(/Cairn stopped this task safely and authored honest STOPPED records/)).toBeVisible();
  await expect(win.getByText(/Retained evidence needs inspection before another task/)).toBeVisible();
  await expect(win.getByText("Cairn verified the worker's changes and authored the task records itself.")).toHaveCount(0);
  expect(existsSync(fakeCodex.marker)).toBe(true);
  const report = readFileSync(join(proj, "docs", "ai-work", "tasks", "001-report.md"), "utf8");
  expect(report).toContain("ADAPTER_FAILED");
  expect(report).not.toContain("secret-looking malformed provider output");
  expect(existsSync(join(proj, "visible.txt"))).toBe(false);
  await app.close();
});

test("missing worker claims show only bounded numeric Codex event evidence", async () => {
  const proj = mkdtempSync(join(tmpdir(), "cairn-codex-missing-claims-"));
  scaffold(proj);
  const fakeCodex = fakeCodexEnvironment(proj, true, "missing-claims");
  const app = await electron.launch({ args: ["."], env: { ...process.env, ...fakeCodex.env, CAIRN_OPEN: proj, CAIRN_MOCK: "0" } });
  const win = await app.firstWindow();
  // A governed project boots straight into chat; the dashboard is one click away.
  const projectHome = win.getByRole("button", { name: "← Project home" });
  await expect(projectHome).toBeVisible({ timeout: 30_000 });
  await projectHome.click();
  await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible();
  await win.getByRole("button", { name: "Start a task" }).click();
  await win.getByPlaceholder("Describe one visible outcome").fill("Add one bounded diagnostic");
  await win.getByRole("button", { name: "Find a route" }).click();
  await win.getByLabel("I confirm this one real Codex Exec call.").check();
  await win.getByRole("button", { name: "Start one real Codex Exec call" }).click();
  await expect(win.getByRole("heading", { name: "Adapter stopped safely" })).toBeVisible({ timeout: 30_000 });
  await expect(win.getByText(/Stopped safely: WORKER_CLAIMS_MISSING/)).toBeVisible();
  await expect(win.getByText(/Bounded worker evidence: agentMessageCount=1; cachedInputTokens=4; commandExecutionCount=2; exitCode=0;/)).toBeVisible();
  expect(await win.locator("body").innerText()).not.toContain("sk-secret-event-payload");
  const report = readFileSync(join(proj, "docs", "ai-work", "tasks", "001-report.md"), "utf8");
  expect(report).toContain("WORKER_CLAIMS_MISSING");
  expect(report).toContain("Bounded worker evidence: agentMessageCount=1; cachedInputTokens=4; commandExecutionCount=2; exitCode=0; failedToolItemCount=2; fileChangeCount=2; inputTokens=20; outputTokens=6; reasoningOutputTokens=2.");
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
  // A governed project boots straight into chat; the dashboard is one click away.
  const projectHome = win.getByRole("button", { name: "← Project home" });
  await expect(projectHome).toBeVisible({ timeout: 30_000 });
  await projectHome.click();
  await expect(win.getByText("retained task evidence")).toBeVisible();
  await expect(win.getByText(/without blocking a new task/)).toBeVisible();
  await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible();
  await app.close();
});

test("the owner can stop a running worker and gets honest CANCELLED_BY_OWNER records", async () => {
  const proj = mkdtempSync(join(tmpdir(), "cairn-codex-cancel-"));
  scaffold(proj);
  const fakeCodex = fakeCodexEnvironment(proj, true, "slow");
  const app = await electron.launch({ args: ["."], env: { ...process.env, ...fakeCodex.env, CAIRN_OPEN: proj, CAIRN_MOCK: "0" } });
  const win = await app.firstWindow();
  const projectHome = win.getByRole("button", { name: "← Project home" });
  await expect(projectHome).toBeVisible({ timeout: 30_000 });
  await projectHome.click();
  await win.getByRole("button", { name: "Start a task" }).click();
  await win.getByPlaceholder("Describe one visible outcome").fill("Improve Cairn safely");
  await win.getByRole("button", { name: "Find a route" }).click();
  await win.getByLabel("I confirm this one real Codex Exec call.").check();
  await win.getByRole("button", { name: "Start one real Codex Exec call" }).click();
  const stop = win.getByRole("button", { name: "Stop this task" });
  await expect(stop).toBeVisible({ timeout: 15_000 });
  // Only a started process incurs cost. Wait until the real exec has actually
  // begun (its marker is written on stdin end) so the cancel lands on a running
  // process and the report honestly names the already-spent cost — a pre-spawn
  // cancel, which spends nothing, would correctly omit that sentence (FIX 5a).
  await expect.poll(() => existsSync(fakeCodex.marker), { timeout: 15_000 }).toBe(true);
  await stop.click();
  await expect(win.getByRole("heading", { name: "Adapter stopped safely" })).toBeVisible({ timeout: 30_000 });
  const report = readFileSync(join(proj, "docs", "ai-work", "tasks", "001-report.md"), "utf8");
  expect(report).toContain("CANCELLED_BY_OWNER");
  expect(report).toContain("already spent");
  expect(existsSync(join(proj, "visible.txt"))).toBe(false);
  await app.close();
});

test("navigating away and back reattaches to the running worker and its finished result", async () => {
  const proj = mkdtempSync(join(tmpdir(), "cairn-codex-reattach-"));
  scaffold(proj);
  const fakeCodex = fakeCodexEnvironment(proj, true, "slow");
  const app = await electron.launch({ args: ["."], env: { ...process.env, ...fakeCodex.env, CAIRN_OPEN: proj, CAIRN_MOCK: "0" } });
  const win = await app.firstWindow();
  const projectHome = win.getByRole("button", { name: "← Project home" });
  await expect(projectHome).toBeVisible({ timeout: 30_000 });
  await projectHome.click();
  await win.getByRole("button", { name: "Start a task" }).click();
  await win.getByPlaceholder("Describe one visible outcome").fill("Improve Cairn safely");
  await win.getByRole("button", { name: "Find a route" }).click();
  await win.getByLabel("I confirm this one real Codex Exec call.").check();
  await win.getByRole("button", { name: "Start one real Codex Exec call" }).click();
  await expect(win.getByRole("button", { name: "Stop this task" })).toBeVisible({ timeout: 15_000 });
  // Walk away mid-run and come back: the screen must reattach, not orphan.
  await win.getByRole("button", { name: "← Project home" }).click();
  await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible();
  await win.getByRole("button", { name: "Start a task" }).click();
  await expect(win.getByRole("button", { name: "Stop this task" })).toBeVisible({ timeout: 10_000 });
  await expect(win.getByText(/Cairn is running one confirmed ephemeral workspace-scoped Codex Exec request/)).toBeVisible();
  await expect(win.getByRole("heading", { name: "Verified real Codex Exec result" })).toBeVisible({ timeout: 30_000 });
  expect(readFileSync(join(proj, "visible.txt"), "utf8")).toBe("model-authored result\n");
  await app.close();
});

test("a window reload mid-run reattaches instead of losing the result", async () => {
  const proj = mkdtempSync(join(tmpdir(), "cairn-codex-reload-"));
  scaffold(proj);
  const fakeCodex = fakeCodexEnvironment(proj, true, "slow");
  const app = await electron.launch({ args: ["."], env: { ...process.env, ...fakeCodex.env, CAIRN_OPEN: proj, CAIRN_MOCK: "0" } });
  const win = await app.firstWindow();
  const projectHome = win.getByRole("button", { name: "← Project home" });
  await expect(projectHome).toBeVisible({ timeout: 30_000 });
  await projectHome.click();
  await win.getByRole("button", { name: "Start a task" }).click();
  await win.getByPlaceholder("Describe one visible outcome").fill("Improve Cairn safely");
  await win.getByRole("button", { name: "Find a route" }).click();
  await win.getByLabel("I confirm this one real Codex Exec call.").check();
  await win.getByRole("button", { name: "Start one real Codex Exec call" }).click();
  await expect(win.getByRole("button", { name: "Stop this task" })).toBeVisible({ timeout: 15_000 });
  await win.reload();
  await expect(win.getByRole("button", { name: "← Project home" })).toBeVisible({ timeout: 30_000 });
  await win.getByRole("button", { name: "← Project home" }).click();
  await win.getByRole("button", { name: "Start a task" }).click();
  await expect(win.getByRole("heading", { name: "Verified real Codex Exec result" })).toBeVisible({ timeout: 30_000 });
  await app.close();
});
