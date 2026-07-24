# Task 039 — Report

What changed (every file touched):

- `app/src/shared/ipc.ts` — added `RunSessionSnapshot` (`dir`, `outcome`,
  `startedAt`, `activities`, `phase: "running" | "closed"`, `result`,
  `error`); added `taskCurrent(dir)` and `taskAcknowledge(dir)` to
  `CairnApi`; changed `TaskActivityEvent` from `{ dir, sessionId, activity }`
  to `{ dir, activity }`; changed `taskRun`'s signature to drop the
  `sessionId` parameter (`taskRun(dir, outcome, adapterId?,
  realCallConfirmed?, disclosure?)`).
- `app/src/preload.ts` — mirrored all three: `taskRun` no longer forwards a
  `sessionId` over `ipcRenderer.invoke`; added `taskCurrent` and
  `taskAcknowledge` wired to new `"task:current"` / `"task:acknowledge"`
  channels.
- `app/src/main/tasks.ts` — added `const sessions = new Map<string,
  RunSessionSnapshot>()` beside the existing `running` / `controllers` /
  `settlements` bookkeeping from Task 034/Task 4. In `task:run`: dropped the
  `sessionId` parameter; after the existing overlap and real-call guards,
  seeds `sessions.set(dir, { dir, outcome, startedAt: new
  Date().toISOString(), activities: [], phase: "running", result: null,
  error: null })`. `onActivity` now does `sessions.get(dir)?.activities
  .push(activity)` **before** building the `{ dir, activity }` payload and
  calling `win()?.webContents.send("task:activity", payload)` — the ordering
  is load-bearing (see below). On success, `session.phase = "closed"` and
  `session.result = safeValue` before returning; in the `catch`, same but
  `session.error = plainMessage(error)`. Neither branch deletes the session
  — it stays available for `task:current` until the renderer acknowledges
  it. Added `ipcMain.handle("task:current", ...)` (returns the snapshot or
  `null`) and `ipcMain.handle("task:acknowledge", ...)` (deletes the session
  only if its phase is `"closed"`, so an acknowledge racing a still-running
  session cannot delete live state; always returns `{ ok: true, value: null
  }`).
- `app/src/renderer/screens/TaskRun.tsx` — removed the `sessionId =
  useRef(Date.now()).current` tag entirely (dropped the `useRef` import,
  added `useCallback`). Added a `refresh` callback that calls
  `cairn.taskCurrent(dir)`; if a session exists it seeds `outcome` and
  `activities` from the snapshot and sets `phase` to `"running"`, or to
  `"result"` with the stored result (skipping a stale
  `connection-required` shape, which cannot happen for a genuinely closed
  session but keeps the type narrow), or surfaces `session.error` through
  the existing `ErrorCard` if the run closed on a thrown error instead of a
  normal result. A mount-time `useEffect` calls `refresh` once; the
  `onTaskActivity` subscription now filters only on `event.dir === dir`
  (no `sessionId` to compare) and additionally calls `refresh()` again
  whenever it sees a `"Result"`-stage activity, so a screen that adopted a
  still-running session gets a second authoritative read the moment the
  run closes rather than trusting only the streamed activity list. Dropped
  `sessionId` from the `cairn.taskRun(...)` call in `run()`. Added
  `resultCodex` (does the *closed result's* recommended route say
  `codex-exec`?) and `codexish = codexRoute || Boolean(resultCodex)`, and
  replaced `codexRoute` with `codexish` in the two places a reattach can
  land directly (the running card's descriptive text, and every
  `codexRoute` test inside the result card) — the route-selection card
  itself (phase `"route"`) still uses the narrower `codexRoute`, since a
  reattach never has a `RouteResult` to route through in the first place.
  Added `void cairn.taskAcknowledge(dir);` as the first line of
  `tryAnother()`, and changed the result card's "Return to project" button
  to `onClick={() => { void cairn.taskAcknowledge(dir); onBack(); }}`.
- `app/tests/routing.spec.ts` — fixed the two pre-existing direct
  `window.cairn.taskRun(...)` calls (the `denied` and `mismatched` checks
  inside "connected Codex requires confirmation…") to drop their
  now-removed `123` / `124` sessionId arguments, matching the new
  signature. Appended two new scenarios: "navigating away and back
  reattaches to the running worker and its finished result" (start a real
  fake-Codex run with the `"slow"` fixture, walk back to project home while
  it is still running, reopen "Start a task", and confirm the screen shows
  "Stop this task" again and then the verified result — proving the
  worker was never orphaned) and "a window reload mid-run reattaches
  instead of losing the result" (same setup, but `win.reload()` instead of
  navigating away, then walk back into the task screen and confirm the
  same verified result appears).

TDD evidence:

RED — before Step 3's implementation, ran
`npx playwright test tests/routing.spec.ts --reporter=list` (only the two
new tests added, old signature still in place, main process unchanged):

```
8 passed
  x 9 navigating away and back reattaches to the running worker and its finished result (11.3s)
  x 10 a window reload mid-run reattaches instead of losing the result (31.8s)
2 failed
```

Failure for test 9: `expect(locator).toBeVisible()` timed out waiting for
`getByRole('button', { name: 'Stop this task' })` after reopening "Start a
task" — the screen showed a fresh entry form instead of the still-running
task, exactly the stated failure mode. Failure for test 10: timed out
waiting for the "Verified real Codex Exec result" heading after reload —
same fresh-entry-form loss. Both failed for the reason the brief predicted,
not for an unrelated reason (e.g. no timeouts from the fixture's 8-second
delay itself; each failure happened well inside its own wait window).

GREEN — after Steps 3-5, rebuilt (`npm run build:vite`) and ran the full
Playwright suite:

```
npx playwright test --reporter=list
23 passed (53.1s)
```

All 23 specs across `away.spec.ts`, `conductor.spec.ts`, `projects.spec.ts`,
`routing.spec.ts` (10 tests, including both new reattach scenarios, now
10.1s and 10.3s respectively — well inside their timeouts and not
lengthened by any padding), `serial.spec.ts`, and `smoke.spec.ts` are
green. None of the other specs referenced `sessionId`, confirmed by a
grep across `app/src` and `app/tests` returning no matches after the
change.

Checks run and their real results:

- `cd app && npm run typecheck` — clean, no errors (this also typechecks
  `app/tests/routing.spec.ts`, since `app/tsconfig.json` includes `tests/`;
  the Step 4 signature fix was required for this to pass once Step 3
  landed).
- `cd app && npm run test:unit` — 43/43 pass, unchanged.
- `cd app && npm run build:vite` — main, preload, and renderer bundles all
  built clean.
- `cd app && npx playwright test` — 23/23 pass in one run (53.1s,
  workers:1), shown above.
- Root `npm test` (core + cli) — core: 60/60 pass (`node --test` against
  the explicit enumerated file list); cli: 9/9 pass. Neither package was
  touched by this task, and both stayed green, confirming no drift.

How to try it: launch the app against a real connected fake-Codex fixture
(as the new Playwright tests do), start a real Codex Exec task, and while
"Stop this task" is visible, either click "← Project home" and reopen
"Start a task" for the same project, or reload the window (Ctrl+R /
Cmd+R) and navigate back in. Either path reattaches to the same running
worker's activity feed and, once it finishes, shows the same verified
result — the task is never silently orphaned in the main process with no
way to see it finish.

Limitations and remaining human judgment:

- Session snapshots live only in the main process's memory (`Map`, not a
  file) and are cleared on app quit — same lifetime as `running` /
  `controllers` / `settlements`, and consistent with the constraint that
  runtime state never lives inside the project worktree or `.git/cairn`.
  A quit while a task is running still goes through Task 037/038's
  cancel-and-settle quit protection unchanged; this task does not add any
  persistence across a full app restart, and none was requested.
- `task:acknowledge` is fire-and-forget from the renderer (`void
  cairn.taskAcknowledge(dir)`); if it never fires (e.g. the process is
  killed uncleanly), the closed session simply stays in memory until the
  next `task:run` for that directory overwrites it via `sessions.set(dir,
  ...)` at the top of the next run, or the process exits. No leak persists
  across restarts, and no other project's session is affected, since the
  map is keyed by directory.
- Milestone movement: NO
- This closes plan Task 5 (run-reattach) of the Phase 2 core-surgery plan.

Disposition: DONE
