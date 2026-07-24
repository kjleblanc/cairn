# Task 039 — Brief

Requested visible outcome: the Electron main process becomes the owner of
live run state, so navigating away from a running task (or reloading the
window) reattaches to that same running worker and its eventual result
instead of orphaning it behind a fresh, empty entry form. Today
`TaskRun.tsx` keeps the running task's activity feed and result in
component state tagged with a per-mount `sessionId`; leaving the screen and
coming back mounts a new component with a new `sessionId`, so the worker
keeps running in the main process but the renderer that asked for it is
gone and no surviving screen can show its progress or its finished result.

Boundary of intent: the serial-task engine in `core/` is untouched — this
is a main-process bookkeeping and renderer-adoption change only. No new
dependency. No version bump (version bumps land only in the separate plan
task reserved for that). The existing task-run guards (one run per project,
real-call confirmation, quit-time cancel-and-settle from Tasks 034/037/038)
keep behaving exactly as before; this task adds a session store beside
them, it does not replace them. `TaskActivityEvent` and `taskRun` drop the
renderer-generated `sessionId` argument entirely — the main process now
identifies a run by project directory alone, which is already the unique
key `running`/`controllers`/`settlements` use.

The fix: `app/src/main/tasks.ts` gains an in-memory
`Map<string, RunSessionSnapshot>` (`sessions`), keyed by project directory,
holding the outcome, start time, the activity log so far, a
`"running" | "closed"` phase, and the eventual result or thrown error. A
session is seeded when `task:run` starts (after the existing overlap and
real-call guards), each `onActivity` callback pushes to that session's
activity array *before* broadcasting over IPC (so a renderer that re-queries
after any broadcast event always sees at least that event — no race where
the query lands between the broadcast and the local push), and the run's
success or failure closes the session with its result or error. Two new
handlers — `task:current` (read the snapshot for a directory, or `null`)
and `task:acknowledge` (delete a closed session so it does not leak forever)
— let a renderer adopt whatever is live. `TaskRun.tsx` queries
`task:current` on every mount (and on every `Result`-stage activity event,
in case the initial query landed mid-run before the result closed), seeds
its local state from the snapshot, and calls `task:acknowledge` when the
owner leaves a finished result (either "Return to project" or "Try another
task"). Because a reattached screen never went through `task:route`, it has
no `RouteResult` to test for the Codex-Exec lane; a new `codexish` flag
also considers the *result's* recommended adapter id, and replaces the
narrower `codexRoute` test in the running and result cards (which are the
two cards a reattach can land directly into).

Checks that show the outcome holds:

- Two new Playwright scenarios in `app/tests/routing.spec.ts`, run first to
  fail (fresh entry form, result never appears) then to pass after the
  fix: navigating to project home and back mid-run reattaches to the
  running worker and then shows its verified result; reloading the window
  mid-run does the same.
- `cd app && npm run typecheck` — clean (this also validates
  `tests/routing.spec.ts`, which the app's `tsconfig.json` includes).
- `cd app && npm run test:unit` — unchanged, all pass.
- `cd app && npm run build:vite && npx playwright test` — the full spec
  suite (`away`, `conductor`, `projects`, `routing`, `serial`, `smoke`) all
  green, proving the `sessionId` removal did not break any other path
  (none of the other specs referenced `sessionId` directly).
- Root `npm test` (core + cli) — unchanged and green, confirming no drift
  into the untouched core/CLI packages.

DONE means: the two new reattach scenarios pass, the full app gate
(typecheck, unit, build, Playwright) and the root gate both stay green
with no other spec weakened, and the session-store ordering guarantee
(push before broadcast) is present in the code as written. STOPPED means:
a reattach scenario cannot be made to pass without weakening another test,
or the full gate cannot be made green; whatever was written stays for
inspection instead of being claimed as done.
