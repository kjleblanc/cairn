# Task 037 — Report

What changed:

- `app/src/shared/ipc.ts` — added `taskCancel(dir: string): Promise<Result<null>>`
  to the `CairnApi` interface, next to `taskRun`.
- `app/src/preload.ts` — bridged it: `taskCancel: (dir) =>
  ipcRenderer.invoke("task:cancel", dir)`.
- `app/src/main/tasks.ts` — added two module-level maps beside the existing
  `running` set: `controllers: Map<string, AbortController>` and
  `settlements: Map<string, Promise<unknown>>`. Added and exported
  `activeTaskRuns()`, returning a snapshot of running dirs plus
  `cancelAll()` (aborts every live controller) and `settled()` (awaits
  `Promise.allSettled` over the in-flight settlement promises). Restructured
  the `task:run` handler: after the existing running-guard and
  authorization checks, it creates an `AbortController`, registers it in
  `controllers`, wraps the run body in an IIFE whose returned promise is
  stored in `settlements` and also returned to the IPC caller, passes
  `signal: controller.signal` into `runSerialTask`'s options (the seam
  Task 2/32 already exposed), and in the `finally` block deletes the dir
  from all three maps (`running`, `controllers`, `settlements`). Added a new
  `ipcMain.handle("task:cancel", ...)` that looks up the controller for a
  dir, aborts it if present, and returns a `Result<null>` (an honest
  "No task is running for this project." message if not).
- `app/src/main/main.ts` — imported `dialog` from `electron` and
  `activeTaskRuns` from `./tasks.js`. Added a module-level `quitting` flag
  and an `app.on("before-quit", ...)` handler placed after the existing
  `registerTaskIpc` wiring: if a task is running and quit isn't already in
  progress, it prevents the default quit, shows a native
  `dialog.showMessageBoxSync` confirm ("Stop the task and quit" /
  "Keep running", default and cancel both mapped to "Keep running"). On
  confirmation it sets `quitting = true`, calls `cancelAll()`, and races
  `settled()` against an 8-second grace timer before calling `app.quit()`
  — so a run that closes its honest STOPPED record quickly lets the app
  exit promptly, and a run that doesn't converge in time doesn't block
  quitting forever.
- `app/src/renderer/screens/TaskRun.tsx` — added a "Stop this task" `Pill`
  (`kind="quiet"`) inside the `phase === "running"` card, right after
  `<ActivityFeed .../>`, calling `void cairn.taskCancel(dir)`.
- `app/tests/routing.spec.ts` — widened `fakeCodexEnvironment`'s `behavior`
  union to include `"slow"`. Wrapped everything the dispatcher does after
  writing the started-marker in a `const finish = () => { ... }` closure,
  and changed the `process.stdin.on("end", ...)` callback to call
  `setTimeout(finish, behavior === "slow" ? 8000 : 0)` — so `"slow"`
  produces the exact same eventual success flow as `"success"`, just 8s
  later, and a process killed before then never reaches `finish`. Added one
  new test, "the owner can stop a running worker and gets honest
  CANCELLED_BY_OWNER records": launches with the `"slow"` fake Codex,
  starts a real-call task, waits for and clicks "Stop this task", confirms
  the resulting screen ("Adapter stopped safely"), and asserts the written
  `001-report.md` contains `CANCELLED_BY_OWNER` and `already spent`, and
  that no `visible.txt` product file was created.

TDD evidence:

RED (`cd app && npm run build:vite && npx playwright test
tests/routing.spec.ts`, before any implementation in Step 4):

```
Running 8 tests using 1 worker
  ok 1..7 (all pre-existing routing scenarios)
  x  8 tests\routing.spec.ts:261:5 the owner can stop a running worker and gets honest CANCELLED_BY_OWNER records (16.3s)

    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('button', { name: 'Stop this task' })
    Expected: visible
    Timeout: 15000ms
    Error: element(s) not found

  1 failed
  7 passed (25.2s)
```

Exactly the stated red reason (no "Stop this task" button); every
pre-existing scenario stayed green.

GREEN, same command after Step 4's implementation:

```
Running 8 tests using 1 worker
  ok 1 .. ok 7 (all pre-existing)
  ok 8 tests\routing.spec.ts:261:5 the owner can stop a running worker and gets honest CANCELLED_BY_OWNER records (1.6s)
  8 passed (10.9s)
```

The cancel scenario now passes in ~1.6s (well inside the "slow" fixture's
8s window — the abort reaches the process long before the scripted delay
would have finished it), and it never regressed timing for the other
routing scenarios.

Checks run and real results:

- `npm run typecheck` (app): passes, no errors.
- `npm run test:unit` (app): 43/43 pass.
- `npm run build:vite` (app): builds clean each time it was run.
- `npx playwright test tests/routing.spec.ts`: 8/8 pass (shown above).
- `npx playwright test` (full app suite, all spec files, workers:1): 21/21
  pass in the final clean run (33.3s). One earlier full-suite run hit a
  single flake — `conductor.spec.ts`'s first test (`the connect card
  blocks until consent...`) timed out waiting 30s for a card that normally
  appears in ~2s. Diagnosed before trusting it: stashed every task-037
  change, rebuilt, and ran the full suite against the untouched baseline —
  it passed clean (20/20, 30.5s). Popped the stash, rebuilt, ran the full
  suite again with the real changes in place — it passed clean (21/21,
  33.3s), same as the baseline run. Two clean full-suite runs (one without
  and one with this task's changes) bracket the single failure, so it is
  an environmental flake (this machine, Windows, workers:1, many
  sequential Electron launches) rather than a regression this task
  introduced; the conductor screen and its IPC were not touched by this
  task.
- Root `npm test` (core + cli, foreground): core **60/60** pass, cli
  **9/9** pass, both unchanged counts from before this task — confirming
  honestly that this task touched neither `core/` nor `cli/`.

How to try it: build the app (`cd app && npm run build:vite`), then run
`npx playwright test tests/routing.spec.ts -g CANCELLED_BY_OWNER` to see
the cancel scenario alone, or `npx playwright test` for the full suite.
Manually: open a governed project with a connected (real or fake) Codex
Exec, start a task, click "Stop this task" while it's running, and the
task closes with a `CANCELLED_BY_OWNER` report naming the already-spent
cost.

Limitations and remaining human judgment:

- No automated test drives the native quit-confirmation dialog. Playwright
  Electron has no hook into `app.on("before-quit")`'s
  `dialog.showMessageBoxSync` prompt, so that path's coverage is:
  `tsc --noEmit` (passes), line-by-line review against the brief's exact
  handler body (done, matches), and the fact that it calls the same
  `cancelAll()`/`AbortController`/`signal` primitives the tested Stop
  button already exercises end-to-end. This is disclosed honestly, not
  claimed as tested. I did not manually click through the native OS quit
  dialog in this session (no interactive desktop session available to
  observe it); the only verification is static (types + review), as the
  task brief anticipated.
- The `settled()` grace period is a fixed 8 seconds, matching the brief
  exactly; a run whose adapter takes longer than that to write its honest
  STOPPED record after cancellation will have the app quit anyway without
  waiting further — an intentional bounded wait, not a bug, per the
  brief's own wording.
- One Playwright flake was observed and diagnosed (see above); it was
  environmental, not a regression, and does not recur across two clean
  bracketing runs.

Milestone movement: NO

Disposition: DONE
