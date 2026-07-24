# Cairn Phase 2 — Core Surgery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pay the operational debts (timeout, cancel, quit-kill, cross-process lock, run-reattach), move record authorship from the worker to Cairn via a `cairn-claims` fence, and generalize the adapter seam to one universal worker-result contract — closing at version 0.2.0.

**Architecture:** Core (`core/src`) stays the deterministic trust envelope; every surgery preserves its invariants (exact-path staging, protected-work byte checks, fail-closed STOPPED, honest DONE, no retries, one task at a time). The desktop app's main process becomes the owner of live run state. Spec: `docs/superpowers/specs/2026-07-24-cairn-phase2-core-surgery-design.md`. This plan was adversarially reviewed against the spec and the working tree at commit `e9812f0` before being committed; line numbers reference that tree.

**Tech Stack:** TypeScript (Node 20+, ESM), `node --test` for core, Electron + React + Playwright for the app. No new dependencies anywhere.

## Global Constraints

- **No new dependencies.** Every CHANGELOG entry ends "Added no dependency" per convention.
- **Every plan task closes as one recorded repo task** per `AGENTS.md`: at close, write `docs/ai-work/tasks/NNN-brief.md` and `NNN-report.md` (next unused number), append one LOG.md row, and make one exact-path commit (`git add -- <each file by name>`, never `git add -A`). The commit paths listed in each task's final step are the code paths; add that task's own three record files to the same commit.
- **Red first.** Write the failing test, run it, watch it fail for the stated reason, then implement.
- **Core test loop:** `cd core && npm test`. The script builds with tsc, then runs `node --test` against an **explicitly enumerated file list** (`core/package.json:14`) — it is NOT a glob. Any task that creates a new core test file MUST also append its `dist/test/<name>.test.js` path to that script in the same step, or the new suite silently never runs. Full gate: root `npm test` (core + cli). App: `cd app && npm run typecheck && npm run test:unit`, Playwright via `npm run build:vite && npx playwright test` (workers:1; run single specs while iterating). Note: `app/tsconfig.json` includes `tests/`, so Playwright spec files must also typecheck.
- **Windows first.** All kill/lock code must work on win32 (the dev machine) and POSIX (CI). The codex child launches through a `cmd.exe` shim on Windows — killing only the shim orphans the real child; always kill the tree.
- **Timeout defaults (from the spec, owner-approved):** inactivity 600 000 ms, absolute 3 600 000 ms.
- **Never place a runtime file inside the project worktree** (it would trip exact-path staging and phantom-dirty invariants) **and never use `.git/cairn`** (reserved legacy-state signal). The run lock lives at `<git-common-dir>/cairn-run.lock`.
- **Version bumps only in Task 11** (0.1.2 → 0.2.0, contract mirrors via MAINTAINERS' six-step order). Tasks 1–10 change no version string.
- **Record-format compatibility:** `core/src/steps.ts:36` parses dispositions with the end-anchored regex `/^Disposition:\s*\*\*(DONE|STOPPED)\*\*\s*$/gim`. Every Cairn-authored report must keep `Disposition: **DONE**` / `Disposition: **STOPPED**` ALONE on its line — no trailing text.
- Existing tests are a safety net, not an obstacle: when a task legitimately changes behavior, the task says exactly which existing tests to rewrite. Never weaken the protected-work, exact-path, phantom-dirty, or secrecy assertions.

---

## Task 1: Watchdog timers and tree-kill for the Codex child (`ADAPTER_TIMED_OUT`)

**Files:**
- Modify: `core/src/codex.ts` (new error class, kill helper, timers in `createSystemCodexExecProcess`)
- Modify: `core/src/serial.ts` (new stop reason, catch mapping, paid-call sentence)
- Test: `core/test/codex.test.ts`, `core/test/serial.test.ts`

**Interfaces:**
- Produces: `CodexExecTimeoutError` with `readonly code = "CODEX_EXEC_TIMED_OUT"`, `readonly timeoutKind: "inactivity" | "absolute"`, `readonly debugPath: string | null`; guard `isCodexExecTimeoutError(value): value is CodexExecTimeoutError`; `interface CodexExecProcessOptions { inactivityMs?: number; absoluteMs?: number }`; `createSystemCodexExecProcess(options?: CodexExecProcessOptions)`; constants `CODEX_EXEC_INACTIVITY_MS = 600_000`, `CODEX_EXEC_ABSOLUTE_MS = 3_600_000`; `SerialStopReason` gains `"ADAPTER_TIMED_OUT"`.
- Consumes: existing `CodexExecProcessError`, `fakeInstall`/`withFakeEnvironment` test helpers in `core/test/codex.test.ts:210-246`.

- [ ] **Step 1: Write the failing system-process tests** — append to `core/test/codex.test.ts` (uses the existing `fakeInstall` pattern but with a custom dispatcher, since `fakeInstall`'s dispatcher always streams then exits):

```ts
function wedgedInstall(mode: "silent" | "chatter"): { bin: string; localAppData: string } {
  // A hermetic fake codex whose child either goes silent forever or chatters
  // forever — used to prove the watchdog kills the tree and rejects precisely.
  const bin = mkdtempSync(join(tmpdir(), "cairn-codex-wedged-bin-"));
  const localAppData = mkdtempSync(join(tmpdir(), "cairn-codex-wedged-lad-"));
  const dispatcher = join(bin, "dispatcher.cjs");
  writeFileSync(dispatcher, mode === "silent"
    ? `process.stdin.resume();\nsetInterval(() => {}, 1000);\n`
    : [
      `process.stdin.resume();`,
      `setInterval(() => {`,
      `  process.stdout.write(JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "still going" } }) + "\\n");`,
      `}, 50);`,
      "",
    ].join("\n"), "utf8");
  const command = join(bin, process.platform === "win32" ? "codex.cmd" : "codex");
  writeFileSync(command, process.platform === "win32"
    ? `@echo off\r\n"${process.execPath}" "${dispatcher}" %*\r\n`
    : `#!/usr/bin/env node\nrequire(${JSON.stringify(dispatcher)});\n`, "utf8");
  if (process.platform !== "win32") chmodSync(command, 0o755);
  writeFileSync(join(bin, "codex-windows-sandbox-setup.exe"), "", "utf8");
  return { bin, localAppData };
}

test("a silent codex child is killed by the inactivity timer with a precise rejection", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "cairn-codex-silent-ws-"));
  const { bin, localAppData } = wedgedInstall("silent");
  await withFakeEnvironment(bin, localAppData, async () => {
    const started = Date.now();
    await assert.rejects(
      () => createSystemCodexExecProcess({ inactivityMs: 400, absoluteMs: 60_000 }).run({
        command: process.platform === "win32" ? "codex.exe" : "codex",
        args: ["exec", "-"],
        cwd: workspace,
        stdin: "bounded fake request",
      }),
      (error: unknown) => isCodexExecTimeoutError(error) &&
        error.code === "CODEX_EXEC_TIMED_OUT" && error.timeoutKind === "inactivity",
    );
    assert.ok(Date.now() - started < 30_000, "the run must settle promptly after the kill, not hang");
  });
});

test("a chattering codex child is killed by the absolute cap", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "cairn-codex-chatter-ws-"));
  const { bin, localAppData } = wedgedInstall("chatter");
  await withFakeEnvironment(bin, localAppData, async () => {
    await assert.rejects(
      () => createSystemCodexExecProcess({ inactivityMs: 60_000, absoluteMs: 500 }).run({
        command: process.platform === "win32" ? "codex.exe" : "codex",
        args: ["exec", "-"],
        cwd: workspace,
        stdin: "bounded fake request",
      }),
      (error: unknown) => isCodexExecTimeoutError(error) && error.timeoutKind === "absolute",
    );
  });
});
```

Add `isCodexExecTimeoutError` to the import list from `../src/codex.js` at the top of the file.

- [ ] **Step 2: Run and watch them fail**

Run: `cd core && npm test`
Expected: TypeScript build fails — `isCodexExecTimeoutError` is not exported. (A missing export is this suite's red state, because tests compile with tsc before running.)

- [ ] **Step 3: Implement in `core/src/codex.ts`**

After the `CodexExecProcessError` block (below line 115), add:

```ts
export type CodexExecTimeoutKind = "inactivity" | "absolute";

/** A wedged CLI used to hold a task open forever (Phase 2). The watchdog
 * kills the whole process tree and rejects with the timer that fired. */
export class CodexExecTimeoutError extends Error {
  readonly code = "CODEX_EXEC_TIMED_OUT";

  constructor(
    readonly timeoutKind: CodexExecTimeoutKind,
    readonly debugPath: string | null,
  ) {
    super(`CODEX_EXEC_TIMED_OUT: the Codex Exec process was stopped by the ${timeoutKind} watchdog.`);
    this.name = "CodexExecTimeoutError";
  }
}

export function isCodexExecTimeoutError(value: unknown): value is CodexExecTimeoutError {
  return value instanceof CodexExecTimeoutError;
}

export const CODEX_EXEC_INACTIVITY_MS = 600_000;
export const CODEX_EXEC_ABSOLUTE_MS = 3_600_000;

export interface CodexExecProcessOptions {
  inactivityMs?: number;
  absoluteMs?: number;
}

/** On Windows the child is a cmd.exe shim chain; killing only the shim
 * orphans the real codex process, so the whole tree goes. */
function killCodexProcessTree(child: ChildProcess): void {
  if (child.pid === undefined) return;
  if (process.platform === "win32") {
    try {
      spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    } catch {
      // The grace timer below still settles the run.
    }
  } else {
    try {
      child.kill("SIGKILL");
    } catch {
      // Already gone.
    }
  }
}
```

Import `type ChildProcess` from `node:child_process` (extend the existing import on line 1).

Change the signature on line 319 to `export function createSystemCodexExecProcess(options?: CodexExecProcessOptions): CodexExecProcess` and wire the watchdog inside `run(request)`, after `child` is spawned and `debugPath` is computed:

```ts
        const inactivityMs = options?.inactivityMs ?? CODEX_EXEC_INACTIVITY_MS;
        const absoluteMs = options?.absoluteMs ?? CODEX_EXEC_ABSOLUTE_MS;
        let timedOut: CodexExecTimeoutKind | null = null;
        let forceSettle: NodeJS.Timeout | undefined;
        const fireTimeout = (kind: CodexExecTimeoutKind): void => {
          if (settled || timedOut) return;
          timedOut = kind;
          killCodexProcessTree(child);
          // If even the tree kill cannot make the child close, settle anyway.
          forceSettle = setTimeout(() => {
            if (settled) return;
            settled = true;
            rejectRun(new CodexExecTimeoutError(kind, debugPath));
          }, 5_000);
        };
        const absoluteTimer = setTimeout(() => fireTimeout("absolute"), absoluteMs);
        let inactivityTimer = setTimeout(() => fireTimeout("inactivity"), inactivityMs);
        const sawActivity = (): void => {
          clearTimeout(inactivityTimer);
          if (!timedOut) inactivityTimer = setTimeout(() => fireTimeout("inactivity"), inactivityMs);
        };
        const clearWatchdog = (): void => {
          clearTimeout(absoluteTimer);
          clearTimeout(inactivityTimer);
          if (forceSettle) clearTimeout(forceSettle);
        };
```

Call `sawActivity()` at the top of both the `child.stdout.on("data", ...)` and `child.stderr.on("data", ...)` handlers. In the `child.once("close", ...)` handler, first call `clearWatchdog()`, then before the existing resolve logic add:

```ts
          if (timedOut) {
            if (settled) return;
            settled = true;
            rejectRun(new CodexExecTimeoutError(timedOut, debugPath));
            return;
          }
```

Also call `clearWatchdog()` inside `fail(...)` so spawn/stdin failures don't leave timers pending.

- [ ] **Step 4: Map the stop reason in `core/src/serial.ts`**

Add `"ADAPTER_TIMED_OUT"` to `SerialStopReason` (line 51). Extend the import on line 5 with `isCodexExecTimeoutError`. In `runSerialTask`'s catch around the adapter call (line 732), replace the reason expression with:

```ts
      const reason: SerialStopReason = isCodexExecModelCallBoundaryError(error)
        ? "REAL_MODEL_CALL_NOT_AUTHORIZED"
        : isCodexExecTimeoutError(error)
          ? "ADAPTER_TIMED_OUT"
          : "ADAPTER_FAILED";
      const processFailure: ProcessFailureNote | undefined = isCodexExecProcessError(error)
        ? { code: error.code, debugPath: error.debugPath }
        : isCodexExecTimeoutError(error)
          ? { code: error.code, debugPath: error.debugPath }
          : undefined;
```

In `reportText`'s final STOPPED branch (after line 310), compute `const paidStarted = codex && reason === "ADAPTER_TIMED_OUT";` and append this sentence to the paragraph that names the fixed error code: `${paidStarted ? " The worker process had already started before Cairn stopped it; any cost for that call is already spent." : ""}` (Task 2 extends `paidStarted` to cancellation.)

- [ ] **Step 5: Write the failing serial-level test** — append to `core/test/serial.test.ts` (import `CodexExecTimeoutError` from `../src/codex.js`):

```ts
test("a timed-out worker closes as ADAPTER_TIMED_OUT with the paid-call truth", async () => {
  const root = project();
  const wedged: CodexExecProcess = {
    kind: "fake",
    async run() {
      throw new CodexExecTimeoutError("inactivity", "C:\\Users\\owner\\AppData\\Local\\Cairn\\debug\\codex-wedged.jsonl");
    },
  };
  const result = await runSerialTask(root, "Improve Cairn safely", {
    adapters: [createCodexExecAdapter(root, { installed: true, connected: true }, authorizeCodexExec(root, "Improve Cairn safely"), wedged)],
  });
  assert.equal(result.status, "stopped");
  if (result.status !== "stopped") return;
  assert.equal(result.reason, "ADAPTER_TIMED_OUT");
  const report = readFileSync(result.reportPath, "utf8");
  assert.match(report, /CODEX_EXEC_TIMED_OUT/);
  assert.match(report, /codex-wedged\.jsonl/);
  assert.match(report, /already spent/);
});
```

- [ ] **Step 6: Run the full core suite to green**

Run: `cd core && npm test`
Expected: PASS, including all pre-existing tests (the default timers are far too long to fire in any existing test).

- [ ] **Step 7: Close the task** — record files per Global Constraints; commit code paths:

```bash
git add -- core/src/codex.ts core/src/serial.ts core/test/codex.test.ts core/test/serial.test.ts
```

---

## Task 2: Cancel through the seam (`CANCELLED_BY_OWNER`)

**Files:**
- Modify: `core/src/routing.ts` (adapter `run` gains an optional `AbortSignal`)
- Modify: `core/src/codex.ts` (`CodexExecCancelledError`, signal handling in process + adapter)
- Modify: `core/src/serial.ts` (`SerialRunOptions.signal`, pass-through, mapping)
- Test: `core/test/codex.test.ts`, `core/test/serial.test.ts`

**Interfaces:**
- Produces: `CodexExecCancelledError` with `readonly code = "CODEX_EXEC_CANCELLED"`, `readonly debugPath: string | null`; guard `isCodexExecCancelledError`; `TaskAdapter.run(contract, signal?: AbortSignal)`; `CodexExecProcess.run(request, signal?: AbortSignal)`; `SerialRunOptions.signal?: AbortSignal`; `SerialStopReason` gains `"CANCELLED_BY_OWNER"`.
- Consumes: `killCodexProcessTree`, the watchdog `fireTimeout` structure, and `wedgedInstall` from Task 1.

- [ ] **Step 1: Write the failing system-process test** — append to `core/test/codex.test.ts`:

```ts
test("aborting the signal kills the codex child and rejects as cancelled", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "cairn-codex-cancel-ws-"));
  const { bin, localAppData } = wedgedInstall("silent");
  await withFakeEnvironment(bin, localAppData, async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 200);
    await assert.rejects(
      () => createSystemCodexExecProcess({ inactivityMs: 60_000, absoluteMs: 60_000 }).run({
        command: process.platform === "win32" ? "codex.exe" : "codex",
        args: ["exec", "-"],
        cwd: workspace,
        stdin: "bounded fake request",
      }, controller.signal),
      (error: unknown) => isCodexExecCancelledError(error) && error.code === "CODEX_EXEC_CANCELLED",
    );
  });
});
```

- [ ] **Step 2: Run to fail** — `cd core && npm test`. Expected: build error, `isCodexExecCancelledError` not exported.

- [ ] **Step 3: Implement**

`core/src/codex.ts` — beside `CodexExecTimeoutError`:

```ts
/** The owner pressed stop. The tree is killed the same way as a timeout. */
export class CodexExecCancelledError extends Error {
  readonly code = "CODEX_EXEC_CANCELLED";

  constructor(readonly debugPath: string | null) {
    super("CODEX_EXEC_CANCELLED: the owner stopped the Codex Exec process.");
    this.name = "CodexExecCancelledError";
  }
}

export function isCodexExecCancelledError(value: unknown): value is CodexExecCancelledError {
  return value instanceof CodexExecCancelledError;
}
```

`CodexExecProcess` interface: `run(request: CodexExecRequest, signal?: AbortSignal): Promise<CodexExecProcessResult>`. Inside `createSystemCodexExecProcess`'s `run(request, signal)`:
- At the very top (inside the Promise executor, before spawning): `if (signal?.aborted) { rejectRun(new CodexExecCancelledError(null)); return; }`
- Beside the watchdog: a `cancelled` boolean mirroring `timedOut`; an abort listener `const onAbort = () => { if (settled || cancelled || timedOut) return; cancelled = true; killCodexProcessTree(child); forceSettle = setTimeout(<reject CodexExecCancelledError(debugPath)>, 5_000); }; signal?.addEventListener("abort", onAbort, { once: true });`
- In the `close` handler, check `cancelled` before `timedOut` and reject with `CodexExecCancelledError(debugPath)`; in `clearWatchdog`, also `signal?.removeEventListener("abort", onAbort)`.

`core/src/routing.ts` line 70: `run(contract: AdapterTaskContract, signal?: AbortSignal): Promise<TaskAdapterResult>;` — the offline adapter's `run(contract)` needs no change (extra parameter is optional).

`core/src/codex.ts` adapter (line 544): `async run(contract, signal): Promise<CodexExecResult> { ... const result = await processRunner.run(request, signal); ... }`.

`core/src/serial.ts`: add `signal?: AbortSignal` to `SerialRunOptions`; pass `options.signal` at the call site (line 730): `adapterValue = await chosen.run(freezeContract(contract), options.signal);`. Add `"CANCELLED_BY_OWNER"` to `SerialStopReason`; extend the catch mapping and `processFailure` with `isCodexExecCancelledError` exactly as Task 1 did for timeout; extend `paidStarted` to `codex && (reason === "ADAPTER_TIMED_OUT" || reason === "CANCELLED_BY_OWNER")`.

- [ ] **Step 4: Write the failing serial-level test** — append to `core/test/serial.test.ts` (import `CodexExecCancelledError` alongside the Task 1 import):

```ts
test("an owner abort closes as CANCELLED_BY_OWNER with evidence retained", async () => {
  const root = project();
  const controller = new AbortController();
  const cancellable: CodexExecProcess = {
    kind: "fake",
    async run(_request, signal) {
      writeFileSync(join(root, "partial.txt"), "the worker had already begun\n");
      controller.abort();
      assert.equal(signal?.aborted, true, "the abort signal must reach the process seam");
      throw new CodexExecCancelledError(null);
    },
  };
  const result = await runSerialTask(root, "Improve Cairn safely", {
    adapters: [createCodexExecAdapter(root, { installed: true, connected: true }, authorizeCodexExec(root, "Improve Cairn safely"), cancellable)],
    signal: controller.signal,
  });
  assert.equal(result.status, "stopped");
  if (result.status !== "stopped") return;
  assert.equal(result.reason, "CANCELLED_BY_OWNER");
  assert.equal(existsSync(join(root, "partial.txt")), true, "workspace evidence is retained, never cleaned");
  assert.match(readFileSync(result.reportPath, "utf8"), /already spent/);
});
```

- [ ] **Step 5: Green** — `cd core && npm test`, then root `npm test` (cli must still pass — `TaskAdapter.run`'s extra optional parameter is source-compatible; cli never implements the interface, it only passes factory-built adapters through).

- [ ] **Step 6: Close the task** — commit code paths:

```bash
git add -- core/src/codex.ts core/src/routing.ts core/src/serial.ts core/test/codex.test.ts core/test/serial.test.ts
```

---

## Task 3: Cross-process run lock

**Files:**
- Create: `core/src/lock.ts`
- Modify: `core/src/serial.ts` (acquire after the in-process guard, release in `finally`)
- Modify: `core/package.json` (register the new test file — the test script enumerates files)
- Test: `core/test/lock.test.ts` (new)

**Interfaces:**
- Produces: `interface RunLock { release(): void }`; `acquireRunLock(root: string): RunLock` — throws `Error` whose message starts `SERIAL_RUN_ACTIVE:` when another live process holds the lock, when the holder is on another machine, or when the lock file is unreadable. Lock path: `<git-common-dir>/cairn-run.lock`, JSON `{ pid: number, hostname: string, startedAt: string }`.
- Consumes: nothing new.

- [ ] **Step 1: Write the failing tests and register the suite** — create `core/test/lock.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { acquireRunLock } from "../src/lock.js";
import { createOfflineDemoAdapter } from "../src/routing.js";
import { runSerialTask } from "../src/serial.js";

const LOG_HEADER =
  "| Task | Date | Lane | Draft/Final | Outcome | Decision | One-line summary | Milestone moved? |\n" +
  "|---|---|---|---|---|---|---|---|\n";

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trimEnd();
}

function project(): string {
  const root = mkdtempSync(join(tmpdir(), "cairn-lock-test-"));
  mkdirSync(join(root, "docs", "ai-work", "tasks"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), [
    "# Project Contract", "", "Cairn Contract v0.0.1", "STATUS: ACTIVE",
    "PROJECT NAME: Lock fixture", "WHAT WE ARE BUILDING: a fixture",
    "WHO WILL USE IT: tests", "CURRENT MILESTONE: see a verified result", "",
  ].join("\n"));
  writeFileSync(join(root, "docs", "ai-work", "PROJECT.md"), "# Lock fixture\n");
  writeFileSync(join(root, "docs", "ai-work", "LOG.md"), LOG_HEADER);
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Cairn Test"]);
  git(root, ["config", "user.email", "cairn-test@example.invalid"]);
  git(root, ["add", "AGENTS.md", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md"]);
  git(root, ["commit", "-q", "-m", "fixture"]);
  return root;
}

function lockPath(root: string): string {
  const common = git(root, ["rev-parse", "--git-common-dir"]);
  return join(resolve(root, common), "cairn-run.lock");
}

test("the lock file lives in the git common dir and never dirties the worktree", () => {
  const root = project();
  const lock = acquireRunLock(root);
  assert.equal(existsSync(lockPath(root)), true);
  const held = JSON.parse(readFileSync(lockPath(root), "utf8"));
  assert.equal(held.pid, process.pid);
  assert.equal(held.hostname, hostname());
  assert.equal(git(root, ["status", "--porcelain=v1", "--untracked-files=all"]), "");
  lock.release();
  assert.equal(existsSync(lockPath(root)), false);
});

test("a lock held by another live process refuses a second run", async () => {
  const root = project();
  const lockModule = pathToFileURL(resolve("dist", "src", "lock.js")).href;
  // A real second process acquires the lock and holds it until killed.
  const holder = spawn(process.execPath, [
    "--input-type=module",
    "-e",
    `import { acquireRunLock } from ${JSON.stringify(lockModule)};
     acquireRunLock(process.argv[1]);
     process.stdout.write("held\\n");
     setInterval(() => {}, 1000);`,
    root,
  ], { stdio: ["ignore", "pipe", "pipe"] });
  await new Promise<void>((resolveHeld, rejectHeld) => {
    holder.stdout.on("data", (chunk: Buffer) => { if (chunk.toString().includes("held")) resolveHeld(); });
    holder.once("exit", () => rejectHeld(new Error("holder exited before acquiring")));
  });
  try {
    await assert.rejects(
      () => runSerialTask(root, "A bounded outcome", { adapters: [createOfflineDemoAdapter()] }),
      /SERIAL_RUN_ACTIVE/,
    );
  } finally {
    holder.kill();
  }
});

test("a stale lock from a dead process self-heals", async () => {
  const root = project();
  writeFileSync(lockPath(root), JSON.stringify({ pid: 999_999_999, hostname: hostname(), startedAt: "2026-01-01T00:00:00.000Z" }), "utf8");
  const result = await runSerialTask(root, "A bounded outcome", { adapters: [createOfflineDemoAdapter()] });
  assert.equal(result.status, "done");
  assert.equal(existsSync(lockPath(root)), false);
});

test("an unreadable lock refuses and names the file instead of guessing", () => {
  const root = project();
  writeFileSync(lockPath(root), "not json at all", "utf8");
  assert.throws(() => acquireRunLock(root), (error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    return message.startsWith("SERIAL_RUN_ACTIVE:") && message.includes("cairn-run.lock");
  });
});
```

In `core/package.json:14`, append ` dist/test/lock.test.js` to the enumerated `node --test` file list in the `test` script (the script is not a glob; an unregistered suite silently never runs).

- [ ] **Step 2: Run to fail** — `cd core && npm test`. Expected: build error, `../src/lock.js` does not exist.

- [ ] **Step 3: Implement `core/src/lock.ts`**

```ts
import { execFileSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { basename, join, resolve } from "node:path";

export interface RunLock {
  release(): void;
}

interface LockHolder {
  pid: number;
  hostname: string;
  startedAt: string;
}

function lockFilePath(root: string): string {
  const common = execFileSync("git", ["rev-parse", "--git-common-dir"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  }).trim();
  return join(resolve(root, common), "cairn-run.lock");
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function tryCreate(path: string): boolean {
  const holder: LockHolder = { pid: process.pid, hostname: hostname(), startedAt: new Date().toISOString() };
  try {
    writeFileSync(path, JSON.stringify(holder), { encoding: "utf8", flag: "wx" });
    return true;
  } catch {
    return false;
  }
}

/**
 * One task at a time, across processes. The lock lives in the git common
 * directory: outside every worktree (so it can never trip exact-path or
 * phantom-dirty checks) and shared by all worktrees of the repository (the
 * deliberately conservative reading of one-task-at-a-time). `.git/cairn`
 * stays untouched — it is the reserved legacy-state signal.
 */
export function acquireRunLock(root: string): RunLock {
  const path = lockFilePath(root);
  if (!tryCreate(path)) {
    let holder: LockHolder | null = null;
    try {
      const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
      if (parsed && typeof parsed === "object" &&
          typeof (parsed as LockHolder).pid === "number" &&
          typeof (parsed as LockHolder).hostname === "string" &&
          typeof (parsed as LockHolder).startedAt === "string") {
        holder = parsed as LockHolder;
      }
    } catch {
      holder = null;
    }
    if (!holder) {
      throw new Error(`SERIAL_RUN_ACTIVE: A run lock exists but could not be read. If no task is running, delete ${basename(path)} inside the project's .git folder and try again.`);
    }
    if (holder.hostname !== hostname()) {
      throw new Error(`SERIAL_RUN_ACTIVE: One task is already running for this project on ${holder.hostname} (since ${holder.startedAt}).`);
    }
    if (pidAlive(holder.pid)) {
      throw new Error(`SERIAL_RUN_ACTIVE: One task is already running for this project (pid ${holder.pid} since ${holder.startedAt}).`);
    }
    // The recorded process is dead on this machine: the lock is stale.
    try {
      unlinkSync(path);
    } catch {
      // Lost a race with another healer; fall through to one more attempt.
    }
    if (!tryCreate(path)) {
      throw new Error("SERIAL_RUN_ACTIVE: One task is already running for this project.");
    }
  }
  let released = false;
  return {
    release() {
      if (released) return;
      released = true;
      try {
        unlinkSync(path);
      } catch {
        // A missing file is already the released state.
      }
    },
  };
}
```

- [ ] **Step 4: Wire into `core/src/serial.ts`**

Import `acquireRunLock, type RunLock` from `./lock.js`. In `runSerialTask`, immediately after `activeRoots.add(projectRoot);` (line 664):

```ts
  activeRoots.add(projectRoot);
  let lock: RunLock;
  try {
    lock = acquireRunLock(projectRoot);
  } catch (error) {
    activeRoots.delete(projectRoot);
    throw error;
  }
```

and in the `finally` block (line 878-880), release before clearing the Set:

```ts
  } finally {
    lock.release();
    activeRoots.delete(projectRoot);
  }
```

(The in-process guard throws before the file lock for same-process overlap, so the file lock only ever speaks for other processes.)

- [ ] **Step 5: Green** — `cd core && npm test`. The whole existing suite must stay green (every existing test acquires and releases cleanly around its single run).

- [ ] **Step 6: Close the task** — commit code paths:

```bash
git add -- core/src/lock.ts core/src/serial.ts core/package.json core/test/lock.test.ts
```

---

## Task 4: App cancel control and quit protection

**Files:**
- Modify: `app/src/shared/ipc.ts` (`taskCancel` on `CairnApi`)
- Modify: `app/src/preload.ts`
- Modify: `app/src/main/tasks.ts` (per-dir `AbortController`s; `task:cancel`; expose `activeTaskRuns` for quit)
- Modify: `app/src/main/main.ts` (`before-quit` confirm + cancel + bounded wait)
- Modify: `app/src/renderer/screens/TaskRun.tsx` (Stop button while running)
- Test: `app/tests/routing.spec.ts` (new `"slow"` fake behavior + cancel scenario)

**Interfaces:**
- Produces: `taskCancel(dir: string): Promise<Result<null>>` on `CairnApi` / channel `task:cancel`; `export function activeTaskRuns(): { dirs: string[]; cancelAll(): void; settled(): Promise<void> }` from `app/src/main/tasks.ts`; fake-codex behavior `"slow"` (8 s delay before the success flow).
- Consumes: `SerialRunOptions.signal` (Task 2).

- [ ] **Step 1: Add the `"slow"` behavior to the fake codex** — in `app/tests/routing.spec.ts`, widen the behavior union on line 20 to `"success" | "invalid-jsonl" | "missing-records" | "slow"`. Inside the dispatcher source, wrap everything after `fs.writeFileSync(process.env.CAIRN_FAKE_CODEX_MARKER, "started\\n");` in `const finish = () => { ... };` and call `setTimeout(finish, ${JSON.stringify(behavior)} === "slow" ? 8000 : 0);` so `"slow"` behaves exactly like `"success"` after 8 seconds. A killed child never runs `finish`.

- [ ] **Step 2: Write the failing Playwright cancel test** — append to `app/tests/routing.spec.ts`:

```ts
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
  await stop.click();
  await expect(win.getByRole("heading", { name: "Adapter stopped safely" })).toBeVisible({ timeout: 30_000 });
  const report = readFileSync(join(proj, "docs", "ai-work", "tasks", "001-report.md"), "utf8");
  expect(report).toContain("CANCELLED_BY_OWNER");
  expect(report).toContain("already spent");
  expect(existsSync(join(proj, "visible.txt"))).toBe(false);
  await app.close();
});
```

- [ ] **Step 3: Run to fail** — `cd app && npm run build:vite && npx playwright test tests/routing.spec.ts`. Expected: the new test FAILS (no "Stop this task" button); all existing routing tests still pass.

- [ ] **Step 4: Implement**

`app/src/shared/ipc.ts` — add to `CairnApi`: `taskCancel(dir: string): Promise<Result<null>>;`

`app/src/preload.ts` — add: `taskCancel: (dir) => ipcRenderer.invoke("task:cancel", dir),`

`app/src/main/tasks.ts` — controllers plus settle tracking beside the `running` Set (which stays for `isTaskRunning`):

```ts
const running = new Set<string>();
const controllers = new Map<string, AbortController>();
const settlements = new Map<string, Promise<unknown>>();

/** Quit protection: name live runs, cancel them, and await their fail-closed close. */
export function activeTaskRuns(): { dirs: string[]; cancelAll(): void; settled(): Promise<void> } {
  return {
    dirs: [...running],
    cancelAll() {
      for (const controller of controllers.values()) controller.abort();
    },
    async settled() {
      await Promise.allSettled([...settlements.values()]);
    },
  };
}
```

In the `task:run` handler: create `const controller = new AbortController();` after the running-guard, `controllers.set(dir, controller);` beside `running.add(dir);`, pass `signal: controller.signal` in the `runSerialTask` options, track the in-flight promise in `settlements`, and in the `finally` also delete from `controllers` and `settlements`. Add:

```ts
  ipcMain.handle("task:cancel", (_event, dir: string): Result<null> => {
    const controller = controllers.get(dir);
    if (!controller) return { ok: false, message: "No task is running for this project." };
    controller.abort();
    return { ok: true, value: null };
  });
```

`app/src/main/main.ts` — quit protection (import `dialog` from electron and `activeTaskRuns` from `./tasks.js`):

```ts
let quitting = false;
app.on("before-quit", (event) => {
  const runs = activeTaskRuns();
  if (quitting || runs.dirs.length === 0) return;
  event.preventDefault();
  const choice = dialog.showMessageBoxSync({
    type: "warning",
    buttons: ["Stop the task and quit", "Keep running"],
    defaultId: 1,
    cancelId: 1,
    message: "A worker task is still running.",
    detail: "Quitting stops the worker safely: Cairn writes honest STOPPED records first. The model call already made is already paid for.",
  });
  if (choice !== 0) return;
  quitting = true;
  runs.cancelAll();
  const grace = new Promise((resolve) => setTimeout(resolve, 8_000));
  void Promise.race([runs.settled(), grace]).then(() => app.quit());
});
```

`app/src/renderer/screens/TaskRun.tsx` — in the `phase === "running"` card, after `<ActivityFeed ... />`:

```tsx
          <div className="row" style={{ marginTop: 12 }}>
            <Pill kind="quiet" onClick={() => void cairn.taskCancel(dir)}>Stop this task</Pill>
          </div>
```

- [ ] **Step 5: Green** — `cd app && npm run typecheck && npm run test:unit && npm run build:vite && npx playwright test tests/routing.spec.ts`. Expected: all pass including the new cancel scenario.

- [ ] **Step 6: Note the quit-dialog coverage honestly.** No automated test drives the native quit dialog — Playwright cannot. State in this task's report that quit protection is covered by typecheck, code review, and the shared cancel path it reuses, and record any manual observation honestly. Do not claim automated coverage that does not exist.

- [ ] **Step 7: Close the task** — commit code paths:

```bash
git add -- app/src/shared/ipc.ts app/src/preload.ts app/src/main/tasks.ts app/src/main/main.ts app/src/renderer/screens/TaskRun.tsx app/tests/routing.spec.ts
```

---

## Task 5: Run-reattach — the main process owns the run

**Files:**
- Modify: `app/src/shared/ipc.ts` (`RunSessionSnapshot`, `taskCurrent`, `taskAcknowledge`; `TaskActivityEvent` drops `sessionId`; `taskRun` drops `sessionId`)
- Modify: `app/src/preload.ts`
- Modify: `app/src/main/tasks.ts` (session store + broadcast)
- Modify: `app/src/renderer/screens/TaskRun.tsx` (adopt-on-mount, refresh on Result stage, surface stored errors)
- Modify: `app/tests/routing.spec.ts` (two existing direct `taskRun` calls; two new reattach scenarios)

**Interfaces:**
- Produces:

```ts
export type RunSessionSnapshot = {
  dir: string;
  outcome: string;
  startedAt: string;
  activities: SerialActivity[];
  phase: "running" | "closed";
  result: SerialRunResult | null;
  error: string | null;
};
// CairnApi additions:
taskCurrent(dir: string): Promise<RunSessionSnapshot | null>;
taskAcknowledge(dir: string): Promise<Result<null>>;
// Changed: export type TaskActivityEvent = { dir: string; activity: SerialActivity };
// Changed: taskRun(dir, outcome, adapterId?, realCallConfirmed?, disclosure?) — sessionId is gone.
```

- Consumes: Task 4's controller bookkeeping.

- [ ] **Step 1: Write the failing Playwright reattach tests** — append to `app/tests/routing.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run to fail** — `npx playwright test tests/routing.spec.ts`. Expected: both new tests FAIL (returning shows a fresh entry form; the result never appears).

- [ ] **Step 3: Implement the main-process session store** — `app/src/main/tasks.ts`:

```ts
import type { RunSessionSnapshot, TaskActivityEvent } from "../shared/ipc.js";

const sessions = new Map<string, RunSessionSnapshot>();
```

In `task:run`: after the guards, seed `sessions.set(dir, { dir, outcome, startedAt: new Date().toISOString(), activities: [], phase: "running", result: null, error: null });`. The `onActivity` callback becomes (ORDER IS LOAD-BEARING: push to the session BEFORE broadcasting, so a renderer that re-queries after any event always sees at least that event):

```ts
          onActivity: (activity) => {
            sessions.get(dir)?.activities.push(activity);
            const payload: TaskActivityEvent = { dir, activity };
            win()?.webContents.send("task:activity", payload);
          },
```

On success: `const session = sessions.get(dir); if (session) { session.phase = "closed"; session.result = safeValue; }` before returning. In the catch: same, with `session.error = plainMessage(error);`. Drop the `sessionId` parameter from the handler signature (and from `taskRun` in `shared/ipc.ts` + `preload.ts`).

New handlers:

```ts
  ipcMain.handle("task:current", (_event, dir: string): RunSessionSnapshot | null => sessions.get(dir) ?? null);

  ipcMain.handle("task:acknowledge", (_event, dir: string): Result<null> => {
    const session = sessions.get(dir);
    if (session && session.phase === "closed") sessions.delete(dir);
    return { ok: true, value: null };
  });
```

`shared/ipc.ts`: add the `RunSessionSnapshot` type and the two `CairnApi` methods; change `TaskActivityEvent` to `{ dir: string; activity: SerialActivity }`; change `taskRun` to `(dir, outcome, adapterId?, realCallConfirmed?, disclosure?)`. `preload.ts`: mirror all three.

- [ ] **Step 4: Update the two existing direct `taskRun` calls** — `app/tests/routing.spec.ts` lines 147-153 and 155-166 pass the old signature (`123` / `124` as sessionId) and `app/tsconfig.json` includes `tests/`, so typecheck breaks unless they change:

```ts
  const denied = await win.evaluate(async ({ project }) => window.cairn.taskRun(
    project,
    "Improve Cairn safely",
    "codex-exec",
    false,
  ), { project: proj });
```

and in the `mismatched` block: `return window.cairn.taskRun(project, "A changed task instruction", "codex-exec", true, preview.value.disclosure);`

- [ ] **Step 5: Implement adopt-on-mount in `TaskRun.tsx`**

Remove `const sessionId = useRef(Date.now()).current;` (drop the `useRef` import; add `useCallback`). Adoption + subscription:

```tsx
  const refresh = useCallback(async () => {
    const session = await cairn.taskCurrent(dir);
    if (!session) return;
    setOutcome(session.outcome);
    setActivities(session.activities);
    if (session.phase === "running") setPhase("running");
    else if (session.result && session.result.status !== "connection-required") {
      setResult(session.result);
      setPhase("result");
    } else if (session.error) {
      // A run that ended in a thrown error (e.g. RECORD_VERIFICATION_FAILED)
      // must surface on reattach, not vanish into a blank entry form.
      setError(session.error);
    }
  }, [dir]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => cairn.onTaskActivity((event) => {
    if (event.dir !== dir) return;
    setActivities((current) => [...current, event.activity]);
    if (event.activity.stage === "Result") void refresh();
  }), [dir, refresh]);
```

(A momentarily stale snapshot self-heals: the main process appends to the session before broadcasting, and every Result-stage event triggers a re-query.) In `run()`, drop `sessionId` from the `cairn.taskRun(...)` call. A reattached screen has `route === null`, so derive the worker-lane flag from the result too:

```tsx
  const resultCodex = result && result.status !== "connection-required" && result.route.recommended.id === "codex-exec";
  const codexish = codexRoute || Boolean(resultCodex);
```

and use `codexish` everywhere the result card and running card currently test `codexRoute`. (Task 10 re-keys this off descriptor capabilities when ids stop being special.) Acknowledge on exit from a result: in `tryAnother()` add `void cairn.taskAcknowledge(dir);` as the first line, and change the result card's "Return to project" button to `onClick={() => { void cairn.taskAcknowledge(dir); onBack(); }}`.

- [ ] **Step 6: Green** — `cd app && npm run typecheck && npm run test:unit && npm run build:vite && npx playwright test`. Run the FULL Playwright suite: `serial.spec.ts` and `conductor.spec.ts` exercise the offline run path through the UI only (no direct `taskRun` calls, no `sessionId` references) and must stay green.

- [ ] **Step 7: Close the task** — commit code paths:

```bash
git add -- app/src/shared/ipc.ts app/src/preload.ts app/src/main/tasks.ts app/src/renderer/screens/TaskRun.tsx app/tests/routing.spec.ts
```

---

## Task 6: The `cairn-claims` fence parser

**Files:**
- Create: `core/src/claims.ts`
- Modify: `core/package.json` (register the new test file)
- Test: `core/test/claims.test.ts` (new)

**Interfaces:**
- Produces:

```ts
export interface WorkerClaimCheck { name: string; result: string }
export interface WorkerClaims {
  disposition: "DONE" | "STOPPED";
  summary: string;
  changes: string[];
  checks: WorkerClaimCheck[];
  howToTry: string;
  limitations: string;
  milestone: "YES" | "NO" | "UNCLEAR";
}
export function parseWorkerClaims(finalMessage: string | null): WorkerClaims | null;
```

Fail-closed rules: null/empty input → null; exactly one ` ```cairn-claims ` fence must exist (zero or two+ → null); the fence body must be a JSON object with exactly the seven keys above (missing, extra, or wrong-typed keys → null); string caps — `summary` ≤ 300, each `changes` entry ≤ 500 (≤ 50 entries), each check `name` ≤ 200 / `result` ≤ 500 (≤ 30 checks), `howToTry` ≤ 2000, `limitations` ≤ 2000; input over 262 144 characters → null. Empty strings and empty arrays are allowed (an honest "nothing to say").

- [ ] **Step 1: Write the failing tests and register the suite** — create `core/test/claims.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { parseWorkerClaims } from "../src/claims.js";

const VALID = {
  disposition: "DONE", summary: "Added the visible result.",
  changes: ["visible.txt — created with the requested text"],
  checks: [{ name: "read the file back", result: "matches byte-for-byte" }],
  howToTry: "Open visible.txt.", limitations: "None.", milestone: "NO",
};
const fence = (body: string) => "I finished.\n\n```cairn-claims\n" + body + "\n```\n";

test("a well-formed fence parses to typed claims", () => {
  const claims = parseWorkerClaims(fence(JSON.stringify(VALID)));
  assert.deepEqual(claims, VALID);
});

test("fail-closed on every malformed shape", () => {
  assert.equal(parseWorkerClaims(null), null);
  assert.equal(parseWorkerClaims(""), null);
  assert.equal(parseWorkerClaims("no fence at all"), null);
  assert.equal(parseWorkerClaims(fence(JSON.stringify(VALID)) + fence(JSON.stringify(VALID))), null, "two fences");
  assert.equal(parseWorkerClaims(fence("not json")), null);
  assert.equal(parseWorkerClaims(fence(JSON.stringify({ ...VALID, extra: 1 }))), null, "unknown key");
  const { milestone: _dropped, ...missing } = VALID;
  assert.equal(parseWorkerClaims(fence(JSON.stringify(missing))), null, "missing key");
  assert.equal(parseWorkerClaims(fence(JSON.stringify({ ...VALID, disposition: "MAYBE" }))), null);
  assert.equal(parseWorkerClaims(fence(JSON.stringify({ ...VALID, milestone: "PROBABLY" }))), null);
  assert.equal(parseWorkerClaims(fence(JSON.stringify({ ...VALID, changes: "one string" }))), null);
  assert.equal(parseWorkerClaims(fence(JSON.stringify({ ...VALID, checks: [{ name: "x" }] }))), null, "check missing result");
  assert.equal(parseWorkerClaims(fence(JSON.stringify({ ...VALID, summary: "x".repeat(301) }))), null, "summary cap");
  assert.equal(parseWorkerClaims(fence(JSON.stringify({ ...VALID, changes: Array(51).fill("x") }))), null, "changes count cap");
  assert.equal(parseWorkerClaims("x".repeat(262_145)), null, "total size cap");
});

test("empty strings and empty lists are honest and allowed", () => {
  const sparse = { ...VALID, summary: "", changes: [], checks: [], howToTry: "", limitations: "" };
  assert.deepEqual(parseWorkerClaims(fence(JSON.stringify(sparse))), sparse);
});
```

In `core/package.json:14`, append ` dist/test/claims.test.js` to the enumerated test-script file list.

- [ ] **Step 2: Run to fail** — `cd core && npm test`. Expected: build error, no `../src/claims.js`.

- [ ] **Step 3: Implement `core/src/claims.ts`**

```ts
export interface WorkerClaimCheck { name: string; result: string }

export interface WorkerClaims {
  disposition: "DONE" | "STOPPED";
  summary: string;
  changes: string[];
  checks: WorkerClaimCheck[];
  howToTry: string;
  limitations: string;
  milestone: "YES" | "NO" | "UNCLEAR";
}

const TOTAL_CAP = 262_144;
const SUMMARY_CAP = 300;
const CHANGE_CAP = 500;
const CHANGES_COUNT_CAP = 50;
const CHECK_NAME_CAP = 200;
const CHECK_RESULT_CAP = 500;
const CHECKS_COUNT_CAP = 30;
const PROSE_CAP = 2_000;

function cappedString(value: unknown, cap: number): value is string {
  return typeof value === "string" && value.length <= cap;
}

/**
 * The worker's account of its own work, parsed fail-closed from the one
 * fenced cairn-claims block in its final message. Anything unexpected —
 * zero fences, two fences, non-JSON, unknown keys, oversized fields —
 * returns null, and the caller stops honestly instead of guessing.
 */
export function parseWorkerClaims(finalMessage: string | null): WorkerClaims | null {
  if (!finalMessage || finalMessage.length > TOTAL_CAP) return null;
  const fences = [...finalMessage.matchAll(/^```cairn-claims[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/gm)];
  if (fences.length !== 1) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(fences[0][1]);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const expected = ["changes", "checks", "disposition", "howToTry", "limitations", "milestone", "summary"];
  const keys = Object.keys(record).sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) return null;
  if (record.disposition !== "DONE" && record.disposition !== "STOPPED") return null;
  if (record.milestone !== "YES" && record.milestone !== "NO" && record.milestone !== "UNCLEAR") return null;
  if (!cappedString(record.summary, SUMMARY_CAP)) return null;
  if (!cappedString(record.howToTry, PROSE_CAP)) return null;
  if (!cappedString(record.limitations, PROSE_CAP)) return null;
  if (!Array.isArray(record.changes) || record.changes.length > CHANGES_COUNT_CAP ||
      !record.changes.every((entry) => cappedString(entry, CHANGE_CAP))) return null;
  if (!Array.isArray(record.checks) || record.checks.length > CHECKS_COUNT_CAP) return null;
  const checks: WorkerClaimCheck[] = [];
  for (const entry of record.checks) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const check = entry as Record<string, unknown>;
    const checkKeys = Object.keys(check).sort();
    if (checkKeys.length !== 2 || checkKeys[0] !== "name" || checkKeys[1] !== "result") return null;
    if (!cappedString(check.name, CHECK_NAME_CAP) || !cappedString(check.result, CHECK_RESULT_CAP)) return null;
    checks.push({ name: check.name, result: check.result });
  }
  return {
    disposition: record.disposition,
    summary: record.summary,
    changes: [...(record.changes as string[])],
    checks,
    howToTry: record.howToTry,
    limitations: record.limitations,
    milestone: record.milestone,
  };
}
```

- [ ] **Step 4: Green** — `cd core && npm test`.

- [ ] **Step 5: Close the task** — commit code paths:

```bash
git add -- core/src/claims.ts core/package.json core/test/claims.test.ts
```

---

## Task 7: Capture the worker's final message (plumbing only — prompt unchanged)

**Files:**
- Modify: `core/src/codex.ts` (`finalMessage` on `CodexExecProcessResult`; `claimsText` on the adapter result)
- Modify: `core/src/routing.ts` (`CodexExecResult` gains `claimsText: string | null`)
- Modify: `core/src/serial.ts` (`validateCodexResult` accepts the new key; privacy sentence reworded honestly)
- Test: `core/test/codex.test.ts`, `core/test/serial.test.ts`

The worker still writes records after this task — real runs stay coherent. Only Task 9 flips the flow.

**Interfaces:**
- Produces: `CodexExecProcessResult.finalMessage: string | null` — the text of the LAST `agent_message` item; an agent message with oversized (> 262 144 chars) or non-string text OVERWRITES it with null (a stale earlier message must never masquerade as the final one); `CodexExecResult.claimsText: string | null`.

- [ ] **Step 1: Write the failing tests** — in `core/test/codex.test.ts`, extend the existing "reduces JSONL items to numeric evidence" test: the fixture already emits an `agent_message` with `SECRET_SENTINEL` text. Change its expectation to include `finalMessage: SECRET_SENTINEL` and replace the blanket secrecy line with:

```ts
    assert.equal(result.finalMessage, SECRET_SENTINEL, "the last agent message text is retained for claims parsing");
    const { finalMessage: _retained, ...bounded } = result;
    assert.doesNotMatch(JSON.stringify(bounded), new RegExp(SECRET_SENTINEL));
```

Add a new test covering last-wins AND the oversized-overwrite rule:

```ts
test("only the last agent message is retained, and an oversized final message becomes null", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "cairn-codex-final-msg-ws-"));
  const lastWins = [
    { type: "item.completed", item: { id: "a", type: "agent_message", text: "first" } },
    { type: "item.completed", item: { id: "b", type: "agent_message", text: "second and final" } },
    { type: "turn.completed", usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1, reasoning_output_tokens: 0 } },
  ].map((value) => JSON.stringify(value)).join("\n") + "\n";
  const { bin, localAppData } = fakeInstall(lastWins, "");
  await withFakeEnvironment(bin, localAppData, async () => {
    const result = await createSystemCodexExecProcess().run({
      command: process.platform === "win32" ? "codex.exe" : "codex",
      args: ["exec", "-"], cwd: workspace, stdin: "bounded fake request",
    });
    assert.equal(result.finalMessage, "second and final");
  });

  const workspace2 = mkdtempSync(join(tmpdir(), "cairn-codex-oversize-msg-ws-"));
  const oversized = [
    { type: "item.completed", item: { id: "a", type: "agent_message", text: "small early message" } },
    { type: "item.completed", item: { id: "b", type: "agent_message", text: "x".repeat(262_145) } },
    { type: "turn.completed", usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1, reasoning_output_tokens: 0 } },
  ].map((value) => JSON.stringify(value)).join("\n") + "\n";
  const big = fakeInstall(oversized, "");
  await withFakeEnvironment(big.bin, big.localAppData, async () => {
    const result = await createSystemCodexExecProcess().run({
      command: process.platform === "win32" ? "codex.exe" : "codex",
      args: ["exec", "-"], cwd: workspace2, stdin: "bounded fake request",
    });
    assert.equal(result.finalMessage, null, "an oversized final message overwrites to null — the earlier message must not masquerade as final");
  });
});
```

- [ ] **Step 2: Run to fail** — `cd core && npm test`. Expected: build error (`finalMessage` missing from the result type).

- [ ] **Step 3: Implement**

`core/src/codex.ts`: add `finalMessage: string | null;` to `CodexExecProcessResult`. In `terminalEvidence`'s `item.completed` branch, compute the three-way value — non-agent-message → `undefined` (keep previous); agent message with valid text ≤ 262 144 → the text; agent message with oversized or non-string text → `null` (overwrite):

```ts
    const agent = item.type === "agent_message";
    return {
      finalMessage: agent
        ? (typeof item.text === "string" && item.text.length <= 262_144 ? item.text : null)
        : undefined,
      agentMessageCount: agent ? 1 : 0,
      commandExecutionCount: command ? 1 : 0,
      fileChangeCount: fileChange ? 1 : 0,
      failedToolItemCount: failed ? 1 : 0,
    };
```

In `applyEvidence`, destructure `finalMessage` and apply last-writer-wins with the undefined/null distinction: `finalMessage: finalMessage !== undefined ? finalMessage : result.finalMessage,`. Initialize `finalMessage: null` in the seed `result`. In the adapter's `run`, add `claimsText: result.finalMessage,` to the returned object; add `claimsText: string | null;` to `CodexExecResult` in `core/src/routing.ts`.

`core/src/serial.ts` `validateCodexResult`: add `"claimsText"` to the `expected` key array and require `(descriptors.claimsText.value === null || typeof descriptors.claimsText.value === "string")`.

**Privacy honesty (spec requirement):** in `reportText`'s `boundedEvidence` string (serial.ts:314), replace `Cairn did not retain item text, reasoning, commands, paths, stdout, stderr, thread IDs, account details, authentication data, or credentials.` with `Cairn retained only the worker's final message (for claims verification) and these bounded counts; no other item text, reasoning, commands, paths, stdout, stderr, thread IDs, account details, authentication data, or credentials.` Update the two assertions on the old sentence: `core/test/serial.test.ts:380` and the matching `result.activities` line if present (search the file for `did not retain item text`).

Existing fakes: add `finalMessage: null,` to every fake `CodexExecProcessResult` object in `core/test/serial.test.ts` (eight sites) and `core/test/codex.test.ts`'s adapter-level fake (one site; its `deepEqual` expectation gains `claimsText: null`).

- [ ] **Step 4: Green** — `cd core && npm test`, then root `npm test`. Note for the interim (Tasks 7→9): the app's Playwright fake codex emits agent messages only in `missing-records` mode; its retained text flows into `claimsText`, is never rendered anywhere, and worker-authored records still verify — the suite stays green.

- [ ] **Step 5: Close the task** — commit code paths:

```bash
git add -- core/src/codex.ts core/src/routing.ts core/src/serial.ts core/test/codex.test.ts core/test/serial.test.ts
```

---

## Task 8: Record composition (`core/src/records.ts`)

**Files:**
- Create: `core/src/records.ts`
- Modify: `core/package.json` (register the new test file)
- Test: `core/test/records.test.ts` (new)

**Interfaces:**
- Produces:

```ts
import type { WorkerClaims } from "./claims.js";
import type { AdapterTaskContract } from "./routing.js";

export interface ComposedRecordInput {
  taskNumber: number;
  route: AdapterTaskContract["route"];
  disposition: "DONE" | "STOPPED";
  stopReason: string | null;               // SerialStopReason when STOPPED
  claims: WorkerClaims | null;
  filesChanged: readonly string[];         // from git, NEVER from claims; on stops: the retained changed paths
  protectedIntact: boolean;                // the REAL protected-work verification result
  commit: { status: "created" | "skipped"; reason: string } | null;  // null on stops
  evidenceSummary: string | null;          // the bounded numeric line, or null
  processFailure: { code: string; debugPath: string | null } | null;
  paidCallStarted: boolean;
}
export function composeWorkerReport(input: ComposedRecordInput): string;
export function composeWorkerRowSummary(input: ComposedRecordInput): string;  // one LOG.md cell, ≤ 160 chars
```

`composeWorkerReport` layout (exact section order — every "Verified by Cairn" line states the REAL result, never a fixed phrase):

```markdown
# Task NNN — {route.adapterLabel} worker report

## Verified by Cairn

- Route: {adapterLabel} — {provider} / {model}
- Protected starting work: {protectedIntact ? "byte-identical" : "CHANGED — the run stopped for this reason and the evidence was retained"}
- Files changed (from Git, not from claims): {each on its own "- `path`" indented line, or "none"}
- Commit: {commit ? commit.reason : "none — stopped evidence is retained for inspection, never committed by Cairn"}
- {evidenceSummary line, when present}
- {Process failure line naming code and debug path, when present}

{when STOPPED, one paragraph: "The run stopped with the fixed code `REASON`. The workspace may contain retained worker-authored evidence and must be inspected before another task."
 + when also paidCallStarted: " The worker process had already started; any cost for that call is already spent."}

{always, one privacy paragraph: "Cairn retained only the worker's final message (for claims verification) and bounded numeric evidence; no other item text, reasoning, commands, paths, stdout, stderr, thread IDs, account details, authentication data, or credentials."}

## The worker's account (claims, not verified by Cairn)

{when claims: the summary paragraph; "What changed:" bullets from changes; "Checks the worker says it ran:" bullets "name — result"; "How to try it:" paragraph; "Limitations:" paragraph}
{when claims is null: "The worker returned no readable claims block."}

Milestone movement: **{claims?.milestone ?? "NO"}**

Disposition: **{disposition}**
```

The disposition line is BARE — `core/src/steps.ts:36`'s end-anchored regex must keep parsing it (Global Constraints). The paid-call sentence appears only on STOPPED (a verified DONE needs no "stopped it" language). Row summaries: DONE → `` `${claims.summary} (worker claim; files verified against Git by Cairn)` `` truncated to 160 with a trailing `…`; STOPPED → `` `${route.adapterLabel} stopped safely (${stopReason}); requested change was not verified.` ``

- [ ] **Step 1: Write the failing tests and register the suite** — create `core/test/records.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { composeWorkerReport, composeWorkerRowSummary } from "../src/records.js";

const ROUTE = { adapterId: "codex-exec", adapterLabel: "Codex Exec", provider: "OpenAI", model: "gpt-5.6-sol", reason: "connected" };
const CLAIMS = {
  disposition: "DONE" as const, summary: "Added the visible result.",
  changes: ["visible.txt — created"], checks: [{ name: "cat visible.txt", result: "matches" }],
  howToTry: "Open visible.txt.", limitations: "None.", milestone: "NO" as const,
};
const STEPS_DISPOSITION = /^Disposition:\s*\*\*(DONE|STOPPED)\*\*\s*$/gim;

test("a DONE report separates Cairn-verified facts from worker claims", () => {
  const report = composeWorkerReport({
    taskNumber: 7, route: ROUTE, disposition: "DONE", stopReason: null, claims: CLAIMS,
    filesChanged: ["visible.txt"], protectedIntact: true,
    commit: { status: "created", reason: "One exact-path commit contains the product changes and these records." },
    evidenceSummary: "Bounded worker evidence: outputTokens=80.", processFailure: null, paidCallStarted: true,
  });
  assert.match(report, /^# Task 007 — Codex Exec worker report/);
  assert.match(report, /## Verified by Cairn/);
  assert.match(report, /Protected starting work: byte-identical/);
  assert.match(report, /Files changed \(from Git, not from claims\)/);
  assert.match(report, /- `visible\.txt`/);
  assert.match(report, /Commit: One exact-path commit contains the product changes and these records\./);
  assert.match(report, /## The worker's account \(claims, not verified by Cairn\)/);
  assert.match(report, /cat visible\.txt — matches/);
  assert.match(report, /Cairn retained only the worker's final message/);
  assert.equal(report.match(/^Milestone movement:/gm)?.length, 1);
  assert.equal(report.match(STEPS_DISPOSITION)?.length, 1, "steps.ts's end-anchored parser must find exactly one disposition");
  assert.match(report, /Milestone movement: \*\*NO\*\*/);
  assert.doesNotMatch(report, /already spent/, "a verified DONE carries no stopped-it language");
});

test("a PROTECTED_WORK_CHANGED report never claims protected work is intact", () => {
  const report = composeWorkerReport({
    taskNumber: 9, route: ROUTE, disposition: "STOPPED", stopReason: "PROTECTED_WORK_CHANGED", claims: CLAIMS,
    filesChanged: ["protected.txt", "visible.txt"], protectedIntact: false,
    commit: null, evidenceSummary: null, processFailure: null, paidCallStarted: true,
  });
  assert.doesNotMatch(report, /Protected starting work: byte-identical/);
  assert.match(report, /Protected starting work: CHANGED/);
  assert.match(report, /- `protected\.txt`/);
  assert.match(report, /must be inspected before another task/);
  assert.match(report, /already spent/);
  assert.equal(report.match(STEPS_DISPOSITION)?.length, 1);
});

test("a claims-missing STOPPED report says so plainly with milestone NO", () => {
  const report = composeWorkerReport({
    taskNumber: 8, route: ROUTE, disposition: "STOPPED", stopReason: "WORKER_CLAIMS_MISSING", claims: null,
    filesChanged: [], protectedIntact: true, commit: null,
    evidenceSummary: null, processFailure: null, paidCallStarted: true,
  });
  assert.match(report, /The worker returned no readable claims block\./);
  assert.match(report, /WORKER_CLAIMS_MISSING/);
  assert.match(report, /Commit: none — stopped evidence is retained for inspection/);
  assert.match(report, /Milestone movement: \*\*NO\*\*/);
  assert.match(report, /already spent/);
  assert.equal(report.match(STEPS_DISPOSITION)?.length, 1);
});

test("the DONE report matches its golden layout exactly", () => {
  const report = composeWorkerReport({
    taskNumber: 7, route: ROUTE, disposition: "DONE", stopReason: null, claims: CLAIMS,
    filesChanged: ["visible.txt"], protectedIntact: true,
    commit: { status: "created", reason: "One exact-path commit contains the product changes and these records." },
    evidenceSummary: "Bounded worker evidence: outputTokens=80.", processFailure: null, paidCallStarted: true,
  });
  // Golden comparison pins layout drift regexes cannot see. Fill this constant
  // with the composed output once, review it line by line, then freeze it.
  assert.equal(report, GOLDEN_DONE_REPORT);
});

test("the log-row summary is one bounded honest line", () => {
  const done = composeWorkerRowSummary({
    taskNumber: 7, route: ROUTE, disposition: "DONE", stopReason: null, claims: CLAIMS,
    filesChanged: ["visible.txt"], protectedIntact: true, commit: null,
    evidenceSummary: null, processFailure: null, paidCallStarted: true,
  });
  assert.ok(done.length <= 160);
  assert.match(done, /Added the visible result\./);
  assert.match(done, /worker claim/);
  const stopped = composeWorkerRowSummary({
    taskNumber: 8, route: ROUTE, disposition: "STOPPED", stopReason: "WORKER_CLAIMS_MISSING", claims: null,
    filesChanged: [], protectedIntact: true, commit: null,
    evidenceSummary: null, processFailure: null, paidCallStarted: true,
  });
  assert.match(stopped, /stopped safely \(WORKER_CLAIMS_MISSING\)/);
});
```

Define `GOLDEN_DONE_REPORT` as a template-literal constant at the top of the test file; on the first implementation run, paste the composed output in after reviewing it line by line against the layout spec above. In `core/package.json:14`, append ` dist/test/records.test.js` to the enumerated test-script file list.

- [ ] **Step 2: Run to fail** — `cd core && npm test`. Expected: build error, no `../src/records.js`.

- [ ] **Step 3: Implement `core/src/records.ts`** to the layout above, exactly.

- [ ] **Step 4: Green** — `cd core && npm test`.

- [ ] **Step 5: Close the task** — commit code paths:

```bash
git add -- core/src/records.ts core/package.json core/test/records.test.ts
```

---

## Task 9: The inversion — Cairn authors the records, core and app flip together (`WORKER_CLAIMS_MISSING`)

This task lands the prompt rewrite, the serial.ts rewrite, AND the app-side fixture/copy updates in ONE commit. Splitting them would leave the Playwright suite red in between: the fake dispatcher's success flow writes worker records and emits no claims fence, which the new core rejects (`WORKER_CLAIMS_MISSING`) and whose leftover report file collides with Cairn's own `wx` write.

**Files:**
- Modify: `core/src/codex.ts` (`taskPrompt` rewrite)
- Modify: `core/src/serial.ts` (codex-branch rewrite; delete `readModelRecords` and `MODEL_RECORDS_MISSING`)
- Modify: `core/test/serial.test.ts` (rewrite worker fixtures), `core/test/codex.test.ts` (prompt assertions)
- Modify: `app/tests/routing.spec.ts` (dispatcher emits claims; `missing-records` → `missing-claims`; expectation texts)
- Modify: `app/src/renderer/screens/TaskRun.tsx` (result copy stops saying "model-authored")

**Interfaces:**
- Consumes: `parseWorkerClaims` (Task 6), `claimsText` (Task 7), `composeWorkerReport`/`composeWorkerRowSummary` (Task 8).
- Produces: `SerialStopReason` loses `"MODEL_RECORDS_MISSING"`, gains `"WORKER_CLAIMS_MISSING"`. `MODEL_REPORTED_STOPPED` now means: the claims block said `disposition: "STOPPED"`.

- [ ] **Step 1: Rewrite `taskPrompt` in `core/src/codex.ts`** — replace lines 470-475 (the record-format instructions and the already-satisfied line) with:

```ts
    "Do not write any file under docs/ai-work. Cairn authors the task report and log row itself, from your claims block and its own Git verification.",
    "End your final message with exactly one fenced block labeled cairn-claims containing only JSON with exactly these keys, for example:",
    "```cairn-claims",
    "{ \"disposition\": \"DONE\", \"summary\": \"<one line>\", \"changes\": [\"<what changed and why>\"], \"checks\": [{ \"name\": \"<check you ran>\", \"result\": \"<its real result>\" }], \"howToTry\": \"<safe local steps>\", \"limitations\": \"<what still needs human judgment>\", \"milestone\": \"NO\" }",
    "```",
    "Use disposition DONE only when the outcome truly holds and your checks passed; otherwise STOPPED. milestone is YES, NO, or UNCLEAR.",
    "If the requested outcome is already satisfied, do not invent a product change. Verify the existing behavior and say so in your claims, with milestone NO and the honest disposition.",
```

- [ ] **Step 2: Update the prompt assertions in `core/test/codex.test.ts`** — in "one authorized fake verifies the real-call request without a model", replace the SEVEN assertions that depend on the removed lines — the six at lines 426-431 (report heading, milestone line, disposition line, log-row shape, STOPPED decision, last-column rule) AND line 435 (`/still write the report and log row, use milestone movement NO/`) — with:

```ts
  assert.match(requests[0].stdin, /Do not write any file under docs\/ai-work/);
  assert.match(requests[0].stdin, /exactly one fenced block labeled cairn-claims/);
  assert.match(requests[0].stdin, /"disposition": "DONE"/);
  assert.match(requests[0].stdin, /milestone is YES, NO, or UNCLEAR/);
  assert.match(requests[0].stdin, /say so in your claims, with milestone NO/);
  assert.doesNotMatch(requests[0].stdin, /-report\.md/);
  assert.doesNotMatch(requests[0].stdin, /Append exactly one row/);
```

(Line 434's "do not invent a product change" and line 437's "Cairn owns the exact-path local commit" both survive the rewrite — leave them.) After Steps 1-2, `cd core && npm test` is green again: serial.ts is untouched so the worker-record flow still verifies; the red for the inversion comes from Step 3's new serial tests.

- [ ] **Step 3: Rewrite the serial worker fixtures and add the new tests (red)** — in `core/test/serial.test.ts`:

The canonical happy path ("one authorized fake Codex process completes one verified serial task") — the fake stops writing records entirely; a comment names the retired failure class:

```ts
      // The pre-surgery world stopped this run MODEL_RECORDS_MISSING: a worker
      // that wrote no report/log row failed paperwork verification. Now the
      // worker only does product work and speaks through the claims fence.
      writeFileSync(join(root, "visible.txt"), "model-authored result\n");
      return {
        exitCode: 0, terminalEvent: "turn.completed",
        inputTokens: 200, cachedInputTokens: 50, outputTokens: 80, reasoningOutputTokens: 20,
        agentMessageCount: 1, commandExecutionCount: 2, fileChangeCount: 1, failedToolItemCount: 0,
        finalMessage: [
          "Done.",
          "",
          "```cairn-claims",
          JSON.stringify({
            disposition: "DONE", summary: "Added the visible result.",
            changes: ["visible.txt — created with the requested text"],
            checks: [{ name: "read the file back", result: "matches" }],
            howToTry: "Open visible.txt.", limitations: "None.", milestone: "YES",
          }),
          "```",
        ].join("\n"),
      };
```

Keep the exact-path commit assertion (same four committed paths — report and LOG row now Cairn-authored) and add: `assert.match(result.reportText, /## Verified by Cairn/); assert.match(result.reportText, /claims, not verified by Cairn/);`

Then, per existing test: "no model records" → rename to "a completed process with no claims fence stops WORKER_CLAIMS_MISSING" (fake returns `finalMessage: null`; expect the new reason; report matches `/The worker returned no readable claims block\./` plus the bounded-evidence line; keep the secrecy assertions). "already-satisfied" → fake makes no product change, claims DONE/milestone NO; DONE with a three-path commit. "unrelated task-record path" → fake writes `999-report.md` + valid claims; still `MODEL_RESULT_NOT_VERIFIED`, HEAD unchanged. Phantom-dirty pair + dirty-start → same fence conversion; committed-path assertions unchanged. And two NEW tests:

```ts
test("claims saying STOPPED close as MODEL_REPORTED_STOPPED with evidence retained", async () => {
  // fake writes partial.txt, returns claims with disposition STOPPED,
  // summary "Could not finish safely." — expect status stopped,
  // reason MODEL_REPORTED_STOPPED, partial.txt retained, no commit,
  // report contains the worker's own stopped summary labeled as claims.
});

test("perfect DONE claims cannot outrank a protected-work change", async () => {
  // project() with a committed protected.txt; fake overwrites protected.txt
  // AND returns a perfect DONE claims fence — expect PROTECTED_WORK_CHANGED,
  // not DONE and not WORKER_CLAIMS_MISSING; protected.txt evidence retained.
});
```

(Write both in full following the surrounding fixtures' idiom.) Run `cd core && npm test` — the new and rewritten tests FAIL against the old serial.ts. That is this task's red state.

- [ ] **Step 4: Rewrite the codex branch of `core/src/serial.ts`**

Replace the worker-record verification (lines 765-829) with the claims flow:

```ts
    if (codex) {
      const codexResult = validateCodexResult(adapterValue, contract) ? adapterValue : null;
      const resultValid = codexResult !== null;
      if (codexResult) {
        emit(activities, options.events, { stage: "Check", state: "working", detail: boundedEventSummary(codexResult) });
      }
      const processCompleted = codexResult?.exitCode === 0 && codexResult.terminalEvent === "turn.completed";
      const protectedValid = verifyProtectedStartingPaths(projectRoot, start);
      const claims = codexResult ? parseWorkerClaims(codexResult.claimsText) : null;
      const stopReason: SerialStopReason | null = !resultValid
        ? "INVALID_ADAPTER_RESULT"
        : !processCompleted
          ? "ADAPTER_FAILED"
          : !protectedValid
            ? "PROTECTED_WORK_CHANGED"
            : !claims
              ? "WORKER_CLAIMS_MISSING"
              : claims.disposition === "STOPPED"
                ? "MODEL_REPORTED_STOPPED"
                : null;
      ...
    }
```

Structure the close with two helpers beside `writeClosedRecords` (private names are the implementer's choice; behavior is fixed):

1. **`cairnWorkerRecords(...)`** — builds `ComposedRecordInput`: `filesChanged` from a bounded git scan (`git diff --name-only` + `ls-files --others --exclude-standard`, capped at 100 entries — on stops this lists the RETAINED evidence, never `[]` when the workspace changed); `protectedIntact` = the real `protectedValid`; `commit` = null on stops, `{ status: "skipped", reason: "Protected starting work prevented an isolated task commit." }` on dirty-start DONE, `{ status: "created", reason: "One exact-path commit contains the product changes and these records." }` on clean-start DONE; `evidenceSummary` = `boundedEventSummary(codexResult)` when present; `paidCallStarted` = true whenever the process ran. Calls `composeWorkerReport`/`composeWorkerRowSummary`, writes the report with `flag: "wx"`, appends the log row with `moved: claims?.milestone ?? "NO"`, verifies its own writes byte-back exactly as `writeClosedRecords` does, and returns `{ reportText, row, verified }`.
2. **A STOPPED close path** that calls (1) and returns the `status: "stopped"` result shaped exactly like today's stop returns (emit the same Check/Result activities, `commit: { status: "skipped", reason: "Stopped evidence was retained for inspection." }`).

DONE path order: verify head unchanged → if `start.status.length > 0`, write records (dirty-start commit-skipped variant) and return DONE with the skip reason → else scan product paths via `changedTaskPaths` (which MUST no longer require the owned records to pre-exist: delete serial.ts:487's `if (!contract.ownedRecords.every(...)) return null;` and keep every safety line) → a `null` scan closes as `MODEL_RESULT_NOT_VERIFIED` → write records via (1) → recompute the full changed set, require it to equal product paths ∪ owned records → stage exactly that set, verify the staged list, commit `Task ${pad(taskNumber)}: complete verified worker task` → ancestry + single-commit count (existing code) → on any staging/commit failure: `unstageExactPaths`, swap the DONE records via `replaceDoneRecordsWithStopped` (it survives for exactly this one self-check), close `MODEL_RESULT_NOT_VERIFIED`.

Delete `readModelRecords` and `interface ModelRecords`; remove `"MODEL_RECORDS_MISSING"` from `SerialStopReason`, add `"WORKER_CLAIMS_MISSING"`. Update the codex brief `checks` (line 698): second entry becomes `"Confirm the worker's final message carries one readable cairn-claims block and the append-only log gains one matching Cairn-authored row."`; in `stopConditions` (line 707) replace the second entry with `"The process fails, returns invalid bounded evidence, returns no readable claims, or claims STOPPED."`. Import `parseWorkerClaims` from `./claims.js` and the composers from `./records.js`.

Run `cd core && npm test` to green, then root `npm test`.

- [ ] **Step 5: Flip the app fixtures and copy in the same commit**

`app/tests/routing.spec.ts` dispatcher — the success/slow flow stops writing `NNN-report.md` and the LOG row; after writing `visible.txt` it emits:

```js
  process.stdout.write(JSON.stringify({ type: "item.completed", item: { id: "m", type: "agent_message", text: "Done.\n\n```cairn-claims\n" + JSON.stringify({ disposition: "DONE", summary: "Added the visible result.", changes: ["visible.txt — created"], checks: [{ name: "read back", result: "matches" }], howToTry: "Open visible.txt.", limitations: "None.", milestone: "YES" }) + "\n```" } }) + "\n");
  process.stdout.write(JSON.stringify({ type: "turn.completed", usage: { input_tokens: 200, cached_input_tokens: 50, output_tokens: 80, reasoning_output_tokens: 20 } }) + "\n");
```

Rename behavior `"missing-records"` → `"missing-claims"` (same secret-bearing event stream, no claims fence) and update its test: expected stop text `WORKER_CLAIMS_MISSING` (lines 230/234), bounded-events line unchanged, secrecy assertions unchanged — the composed report embeds only a *parsed* claims block, and here parsing failed, so `sk-secret-event-payload` must still appear nowhere.

`app/src/renderer/screens/TaskRun.tsx` — replace the two "model-authored" sentences (lines 159-160): success → `"Cairn verified the worker's changes and authored the task records itself."`; failure → `"Cairn stopped this task safely and authored honest STOPPED records. Retained evidence needs inspection before another task."`. Update the exact expectation texts in `routing.spec.ts`: line 175 (success test) to the new success sentence; line 202 (invalid-jsonl test) to the new failure sentence; line 203 (`/Retained evidence needs inspection before another task/`) needs no change; line 204's `toHaveCount(0)` target becomes the new success sentence (the old text would pass vacuously).

- [ ] **Step 6: Green everywhere** — root `npm test`; `cd app && npm run typecheck && npm run test:unit && npm run build:vite && npx playwright test` (full suite: routing incl. cancel + both reattach tests on the claims-based slow flow, serial, conductor, projects, away, smoke).

- [ ] **Step 7: Close the task** — commit code paths:

```bash
git add -- core/src/codex.ts core/src/serial.ts core/test/codex.test.ts core/test/serial.test.ts app/tests/routing.spec.ts app/src/renderer/screens/TaskRun.tsx
```

---

## Task 10: The universal worker-result contract

**Files:**
- Modify: `core/src/routing.ts` (`WorkerRunResult`, `WorkerBoundaryError`, `WorkerProcessError`, `WorkerDisclosure`, final `TaskAdapter` shape; offline adapter returns the universal shape)
- Modify: `core/src/codex.ts` (translate to `WorkerRunResult`; error classes extend the universal ones; `disclosure` on the adapter)
- Modify: `core/src/serial.ts` (one validator; demo-flag wording; generic evidence line and commit message; catch keyed on universal errors)
- Modify: `app/src/main/tasks.ts`, `app/src/shared/ipc.ts`, `app/src/renderer/screens/TaskRun.tsx` (disclosure through the seam; worker-lane flag from capabilities, not adapter id)
- Modify: `app/tests/routing.spec.ts` (bounded-evidence expectation format)
- Test: `core/test/routing.test.ts`, `core/test/codex.test.ts`, `core/test/serial.test.ts` (port + the synthetic-third-adapter proof)

**Interfaces:**
- Produces (in `core/src/routing.ts`):

```ts
export interface WorkerRunResult {
  kind: "worker-result/v1";
  taskNumber: number;
  requestedOutcomeSha256: string;
  status: "completed" | "failed";
  claimsText: string | null;
  evidence: Record<string, number>;
}
export interface WorkerDisclosure {
  provider: string; model: string; project: string; task: string; data: string; quota: string;
}
export class WorkerBoundaryError extends Error { readonly boundary = "real-call" as const; }
export type WorkerFailureKind = "process" | "timeout" | "cancelled";
export class WorkerProcessError extends Error {
  constructor(readonly failure: WorkerFailureKind, readonly code: string, readonly debugPath: string | null) { super(`${code}: the worker process did not return a verified result.`); }
}
export interface TaskAdapter {
  descriptor: AdapterDescriptor;          // `kind` is deleted
  run(contract: AdapterTaskContract, signal?: AbortSignal): Promise<WorkerRunResult>;
  disclosure?(outcome: string): WorkerDisclosure;
}
```

**Evidence validation rule (exact):** plain object, ≤ 24 entries, string keys ≤ 40 chars, every value `typeof number` && `Number.isFinite` && `Math.abs(value) <= 1_000_000_000_000`. Negative values are ALLOWED — `exitCode: -1` is the honest translation of a child that closed without a numeric exit code (codex.ts:426); count-vs-sign semantics belong to the adapter that produced the key, and the envelope never trusts evidence as ground truth anyway. `claimsText`: null or string ≤ 262 144. The old "negative bounded count" hostile test becomes a "NaN evidence value" test plus an "oversized evidence map (25 entries)" test.

**Error mapping:** codex error classes become subclasses — `CodexExecModelCallBoundaryError extends WorkerBoundaryError`; `CodexExecProcessError extends WorkerProcessError` (failure `"process"`); `CodexExecTimeoutError` (failure `"timeout"`); `CodexExecCancelledError` (failure `"cancelled"`) — all keeping their exact `code` strings. serial.ts's catch drops the `isCodexExec*` imports and maps `instanceof WorkerBoundaryError` → `REAL_MODEL_CALL_NOT_AUTHORIZED`; `instanceof WorkerProcessError` → by `failure`: timeout → `ADAPTER_TIMED_OUT`, cancelled → `CANCELLED_BY_OWNER`, process → `ADAPTER_FAILED`; anything else → `ADAPTER_FAILED`.

**Wording:** the demo lane is `chosen.descriptor.capabilities.includes("offline-demo")` — BOTH current `kind` checks (serial.ts:668 master flag and serial.ts:830 offline-branch re-check) become this flag. Every wording site (`briefText`, `reportText`, `rowFor`, checks, stopConditions, activity details, supported outcome, boundary report, commit message `Task NNN: complete verified worker task`) keys off demo/worker + `contract.route` labels. **Activity strings must interpolate the label so Codex output stays byte-identical** — routing.spec.ts:176 asserts `"DONE — one real Codex Exec task completed and was verified."`, which `` `DONE — one real ${route.adapterLabel} task completed and was verified.` `` reproduces exactly; same for `"Running one confirmed ephemeral workspace-scoped ${label} request."`. The evidence line becomes `boundedEvidenceSummary(evidence)`: `"Bounded worker evidence: " + entries sorted by key as "key=value" joined by "; " + "."` — routing.spec.ts lines 231/235 (missing-claims test) must be updated to the new format (e.g. `agentMessageCount=1; commandExecutionCount=2; ...`), as must the serial.test.ts assertions that check the old `Bounded Codex events:` sentence. The offline adapter returns `{ kind: "worker-result/v1", ..., status: "completed", claimsText: null, evidence: {} }`; the demo lane keeps its existing deterministic record wording and never reaches the claims path.

- [ ] **Step 1: Write the failing synthetic-adapter proof** — append to `core/test/serial.test.ts`:

```ts
test("PHASE 4 READINESS: a synthetic third adapter reaches verified DONE with no serial.ts special-casing", async () => {
  const root = project();
  const synthetic: TaskAdapter = {
    descriptor: {
      id: "fixture-worker", label: "Fixture Worker", provider: "Fixture Provider", model: "fixture-1",
      connected: true, capabilities: ["serial-task"], priority: 50,
    },
    async run(contract) {
      writeFileSync(join(root, "visible.txt"), "fixture worker result\n");
      return {
        kind: "worker-result/v1",
        taskNumber: contract.taskNumber,
        requestedOutcomeSha256: contract.requestedOutcomeSha256,
        status: "completed",
        claimsText: [
          "Done.", "", "```cairn-claims",
          JSON.stringify({
            disposition: "DONE", summary: "Added the visible result.",
            changes: ["visible.txt — created"], checks: [{ name: "read back", result: "matches" }],
            howToTry: "Open visible.txt.", limitations: "None.", milestone: "NO",
          }),
          "```",
        ].join("\n"),
        evidence: { anythingBounded: 3 },
      };
    },
  };
  const result = await runSerialTask(root, "Add one visible result", { adapters: [synthetic] });
  assert.equal(result.status, "done");
  if (result.status !== "done") return;
  assert.equal(result.commit.status, "created");
  const report = readFileSync(result.reportPath, "utf8");
  assert.match(report, /Fixture Worker/);
  assert.match(report, /Fixture Provider/);
  assert.doesNotMatch(report, /Codex|offline demonstration/i);
  assert.deepEqual(git(root, ["show", "--format=", "--name-only", "HEAD"]).split(/\r?\n/).filter(Boolean).sort(), [
    "docs/ai-work/LOG.md",
    "docs/ai-work/tasks/001-brief.md",
    "docs/ai-work/tasks/001-report.md",
    "visible.txt",
  ]);
});
```

- [ ] **Step 2: Run to fail** — `cd core && npm test`. Expected: build error (`kind` required on `TaskAdapter`, result shape mismatch).

- [ ] **Step 3: Implement across the three core files** in this order: routing.ts types/errors/offline-adapter; codex.ts translation (`status` from `exitCode === 0 && terminalEvent === "turn.completed"`, the nine-key evidence map, `disclosure(outcome) { return codexExecDisclosure(cwd, outcome); }`, error subclassing); serial.ts (single `validateWorkerResult` with the paranoia ported from both old validators plus the evidence rule above; demo flag at BOTH former `kind` sites — 668 and 830; wording/activity/commit-message re-keying with byte-identical Codex strings; universal error mapping; delete `RESULT_STATEMENT` and both old validators; the worker supported-outcome constant becomes `"Run one explicitly confirmed worker task through the connected adapter and verify its result and Git state."`). Known test casualties to port by name:
  - `core/test/codex.test.ts:321` `assert.equal(adapter.kind, "codex-exec")` — delete the line; assert `adapter.descriptor.id === "codex-exec"` instead. The adapter-level `deepEqual` result expectation becomes the universal shape (status/claimsText/evidence).
  - `core/test/routing.test.ts` adapter literals and any result-type references — update to the universal shape (`kind` off adapters, `validResult`-style objects).
  - `core/test/serial.test.ts` `validResult` helper → returns the universal shape; hostile tests attack it (hidden key, symbol, accessor, Proxy, NaN evidence value, 25-entry evidence map → `INVALID_ADAPTER_RESULT`).
  - "the real offline demonstration adapter never claims it attempted the product change" (serial.test.ts:471-484) — the `statement` field it guards is deleted; repoint the honest-labeling guard: assert the offline adapter's result has `claimsText: null` and that a demo-lane `runSerialTask` report still contains `Requested product change: **not attempted**` (the sentence now lives only in the demo record wording).

- [ ] **Step 4: Generalize the app's disclosure and lane flag** — `app/src/main/tasks.ts`: `task:route` returns `disclosure: adapter.disclosure?.(outcome)` for the routed adapter (replacing the codex-only ternary); `sameDisclosure` compares the same six fields typed as `WorkerDisclosure` (widen in `shared/ipc.ts`; `TaskRun.tsx` imports the new type). `TaskRun.tsx`: replace the id checks from Task 5 with capability checks — `const workerRoute = route?.status === "ready" && !route.recommended.capabilities.includes("offline-demo");` and `const resultWorker = result && result.status !== "connection-required" && !result.route.recommended.capabilities.includes("offline-demo");` — and interpolate the route label into the confirm-checkbox and start-button strings (`` `I confirm this one real ${route.recommended.label} call.` ``, `` `Start one real ${route.recommended.label} call` ``): for Codex these render byte-identically, so no Playwright expectation changes. `authorizeCodexExec` stays codex-side (a future adapter brings its own authorization); the `realCallConfirmed` gate keys off `disclosure != null`.

- [ ] **Step 5: Update the bounded-evidence expectations** — `app/tests/routing.spec.ts` lines 231/235: old `Bounded Codex events: 1 agent messages; 2 command executions; 2 file changes; 2 failed command/file-change items` → new sorted `Bounded worker evidence: agentMessageCount=1; cachedInputTokens=4; commandExecutionCount=2; exitCode=0; failedToolItemCount=2; fileChangeCount=2; inputTokens=20; outputTokens=6; reasoningOutputTokens=2.` (compute from the missing-claims fixture's usage values; assert a distinctive substring, not necessarily the whole line).

- [ ] **Step 6: Green everywhere** — `cd core && npm test`; root `npm test`; `cd app && npm run typecheck && npm run test:unit && npm run build:vite && npx playwright test`.

- [ ] **Step 7: Close the task** — commit code paths:

```bash
git add -- core/src/routing.ts core/src/codex.ts core/src/serial.ts core/test/routing.test.ts core/test/codex.test.ts core/test/serial.test.ts app/src/main/tasks.ts app/src/shared/ipc.ts app/src/renderer/screens/TaskRun.tsx app/tests/routing.spec.ts
```

---

## Task 11: Close the phase — 0.2.0, changelog, docs truth

**Files:**
- Modify: `CONTRACT-TEMPLATE.md` (version line only), `AGENTS.md` (version line only, project-facts block untouched), `cairn.html` (eyebrow + embed version lines)
- Modify: `core/package.json`, `cli/package.json`, `app/package.json`, three lockfiles
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Version bump** — 0.1.2 → 0.2.0 following MAINTAINERS' six-step order exactly as Task 028's report describes: template first, then `AGENTS.md`, then the `cairn.html` embed; `npm install` at root and in `app/` to refresh lockfiles; hand-edit `cli/package-lock.json`'s two version fields (the Task 027/028 pattern).
- [ ] **Step 2: CHANGELOG entry** — `## 0.2.0 — the envelope holds the pen — 2026-07-24`, honestly describing: the watchdog and cancel path (a wedged or unwanted worker now stops with `ADAPTER_TIMED_OUT`/`CANCELLED_BY_OWNER` and honest records; quit asks before leaving a paid process behind), the cross-process run lock in the git common dir, run-reattach (navigation and reload no longer orphan a run), record authorship moved to Cairn (workers emit a `cairn-claims` block; `MODEL_RECORDS_MISSING` is retired; reports separate verified facts from worker claims; the retained-final-message privacy change stated plainly), and the universal worker-result contract (one validator; a future worker adapter needs no serial.ts changes — proven by a fixture adapter in the suite). Close with "Added no dependency."
- [ ] **Step 3: Rebuild + full gates** — `npm run build --workspace core`; root `npm test`; `cd app && npm run typecheck && npm run test:unit && npm run build:vite && npx playwright test`. The contract-mirrors test proves the three version-bumped mirrors match.
- [ ] **Step 4: Close the task** — commit code paths:

```bash
git add -- CONTRACT-TEMPLATE.md AGENTS.md cairn.html CHANGELOG.md core/package.json cli/package.json app/package.json package-lock.json app/package-lock.json cli/package-lock.json
```

---

## Plan self-review (performed at write time, then adversarially re-verified)

- **Spec coverage:** debts → Tasks 1–5 (timeout, cancel, quit, lock, reattach); record authorship → Tasks 6–9 (parser, capture, composition, inversion — core and app atomically); universal contract → Task 10 (shape, errors, disclosure, capability-keyed wording in core AND the run screen, readiness proof); version close → Task 11. The spec's "deliberately unchanged" invariants are guarded by the exact-path/phantom-dirty/protected-work tests, re-run in every task.
- **Adversarial review findings folded in:** core/package.json's enumerated test list (new suites must register); the Task 9/10 split that would have left Playwright red is merged into one atomic Task 9; `composeWorkerReport` carries the real `protectedIntact`, retained `filesChanged`, and `commit` results instead of fixed phrases, keeps the disposition line bare for steps.ts's end-anchored parser, and restates the retained-evidence and reworded privacy sentences; the two direct old-signature `taskRun` calls in routing.spec are updated in Task 5; codex.test.ts:435's prompt assertion is in Task 9's replacement list; the oversized final message overwrites to null (not keep-previous); evidence values allow negatives (exitCode −1) with NaN/oversize hostile tests instead; routing.spec's bounded-evidence and activity-string expectations are pinned byte-identical or explicitly updated in Task 10.
- **Type consistency:** `finalMessage` (process result) vs `claimsText` (adapter result) is deliberate — the process reports what it saw; the adapter names what it hands the envelope. `RunSessionSnapshot`, `WorkerRunResult`, `WorkerDisclosure`, `parseWorkerClaims`, `ComposedRecordInput`, `composeWorkerReport`, `composeWorkerRowSummary`, `acquireRunLock`, `activeTaskRuns` are each defined once and consumed by name in later tasks.
- **Known judgment calls left to the implementer:** private helper decomposition inside serial.ts's rewritten codex branch (behavior, activity text, and the stop-reason ladder are fixed; names are not); Playwright timing margins on the 8-second slow fixture; the exact `GOLDEN_DONE_REPORT` constant (pasted from the first reviewed composition run).
