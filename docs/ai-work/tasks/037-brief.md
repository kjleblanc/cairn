# Task 037 — Brief

Requested visible outcome: wire the core cancel path (Tasks 33-36: watchdog
timers and process-tree kill, `CodexExecCancelledError`, the
`SerialRunOptions.signal` seam, and the cross-process `cairn-run.lock`) into
the Electron app so an owner can stop a running worker from the UI, and so
quitting the app while a worker is running asks first instead of silently
orphaning or killing it. Concretely: a "Stop this task" button appears on
the running-task screen; clicking it aborts the in-flight run through the
already-landed signal-based cancel path, and the run closes honestly as
`CANCELLED_BY_OWNER`, naming the cost already spent — the same behavior the
CLI already has, now reachable from the desktop UI. Quitting Electron while
a task is running shows a native confirm dialog naming the running worker;
declining keeps the app open, confirming cancels the task and gives it a
bounded grace period to write its honest STOPPED records before the app
actually quits.

Boundary of intent: app-only wiring that reuses core's already-landed
cancel machinery untouched — no core changes, no CLI changes, no new
dependency, no version bump. Files:

- `app/src/shared/ipc.ts` — add `taskCancel(dir: string): Promise<Result<null>>`
  to `CairnApi`.
- `app/src/preload.ts` — bridge the new `task:cancel` channel.
- `app/src/main/tasks.ts` — track a per-project `AbortController` and an
  in-flight settlement promise beside the existing `running` set; add the
  `task:cancel` IPC handler; export `activeTaskRuns()` for quit protection.
- `app/src/main/main.ts` — a `before-quit` handler that, when a task is
  running, blocks the quit, asks via a native dialog, and on confirmation
  cancels the run and waits (bounded) for its honest close before quitting.
- `app/src/renderer/screens/TaskRun.tsx` — a "Stop this task" button visible
  only while `phase === "running"`.
- `app/tests/routing.spec.ts` — a new `"slow"` fake-codex behavior (an 8s
  delay before the existing success flow) and one new Playwright scenario
  that starts a real-call task, stops it mid-flight, and checks the
  resulting report.

Checks that show the outcome holds:

- Red first: the new Playwright cancel scenario is written and run before
  any implementation, and fails for the stated reason (no "Stop this task"
  button on screen); every pre-existing routing scenario stays green at
  that point.
- After implementation: `cd app && npm run typecheck && npm run test:unit
  && npm run build:vite && npx playwright test` all green, including the
  new cancel scenario and every pre-existing scenario across the whole
  Playwright suite (not just `routing.spec.ts`).
- Root `npm test` (core 60 + cli 9) stays green and numerically unchanged,
  confirming this task touched neither core nor cli.
- Honest disclosure, not a claimed test: no automated test can drive the
  native OS quit-confirmation dialog (Playwright's Electron harness has no
  hook for `app.on("before-quit")`'s native `dialog.showMessageBoxSync`
  prompt). That path's coverage is `tsc --noEmit`, code review against the
  brief's exact handler body, and the fact that it calls the same
  `cancelAll()` / `signal` primitives the tested Stop button already
  exercises — not an automated end-to-end scenario.

DONE means: the Stop button lands and cancels the run through the real
`AbortController`/`signal` path; the run closes as `CANCELLED_BY_OWNER` with
the already-spent cost named in the report; no partial product file is
left on disk; the quit-protection handler is written, typechecks, and is
reviewed line-by-line against the brief; and every automated gate above is
green. STOPPED means: any required gate could not be made to pass; whatever
was written stays for inspection instead of being claimed as done.
