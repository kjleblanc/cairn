# Task 038 — Report

What changed:

- `app/src/main/main.ts` — restructured the `before-quit` handler. Added a
  second module-level flag, `let readyToQuit = false;`, beside the existing
  `let quitting = false;`. The handler now:
  1. Returns immediately if `readyToQuit` is already `true` (the real,
     final quit — let it sail through with no `preventDefault()`).
  2. Reads `activeTaskRuns()`; if no run is active (`runs.dirs.length ===
     0`), returns immediately, letting quit proceed normally — unchanged
     from before.
  3. Otherwise calls `event.preventDefault()` unconditionally (moved ahead
     of the `quitting` check, so it fires on every quit attempt while a run
     is active, not just the first).
  4. Only after blocking does it check `if (quitting) return;` — this
     silently swallows a re-entrant quit attempt (no second dialog) while
     the grace period from the first confirmed quit is still running.
  5. Unchanged: shows the `dialog.showMessageBoxSync` confirm (byte-identical
     options — type, buttons, defaultId, cancelId, message, detail); if the
     owner picks "Keep running" (`choice !== 0`), returns (app stays open,
     `quitting` never flips to `true`, `preventDefault()` already fired).
  6. On confirmation, sets `quitting = true`, calls `runs.cancelAll()`,
     races `runs.settled()` against an 8-second grace timer, and in the
     race's resolution callback now sets `readyToQuit = true` immediately
     before calling `app.quit()` — so the handler's own final quit call is
     let through by check (1) on its inevitable re-entry into
     `before-quit`.

No other file was touched. No new dependency. No version bump.

Four-semantics confirmation (read against the edited handler body in
`app/src/main/main.ts`):

- (a) A second quit attempt arriving during the grace: `readyToQuit` is
  still `false` and `runs.dirs.length` is still non-zero (the cancelled run
  has not yet settled), so the handler reaches step 3, calls
  `event.preventDefault()`, then step 4's `if (quitting) return;` is true
  (the first attempt already set it) — the attempt is silently blocked, no
  second dialog, and the process cannot die before the grace's `Promise.race`
  resolves. Confirmed.
- (b) Once the grace resolves (run settles or the 8s timer fires), the
  callback sets `readyToQuit = true` and calls `app.quit()`. That call
  re-enters `before-quit`; step 1's `if (readyToQuit) return;` is now true,
  so the handler returns with no `preventDefault()` in the way, and
  Electron's default quit behavior proceeds — the handler's own quit sails
  through exactly once. Confirmed.
- (c) If every active run settles naturally before any quit attempt is ever
  made, `activeTaskRuns().dirs.length === 0` is true the first time
  `before-quit` fires, so the handler returns at step 2 before ever calling
  `preventDefault()` — quit proceeds normally, unchanged from Task 037's
  behavior. Confirmed.
- (d) Choosing "Keep running" (`choice !== 0`, or dismissing via `cancelId:
  1`): the handler has already called `event.preventDefault()` in step 3, so
  the app stays open and the run keeps going; `quitting` is never set to
  `true` on this branch, so a later quit attempt shows the dialog again
  rather than being silently swallowed — matching the pre-existing "Keep
  running" behavior. Confirmed.

Checks run and real results:

- `cd app && npm run typecheck` — clean, no errors.
- `cd app && npm run test:unit` — 43/43 pass, node --test, no changes to
  any unit test (this fix is a control-flow change with no unit-testable
  surface beyond the type checker).
- `cd app && npm run build:vite` — main, preload, and renderer bundles all
  built clean.
- `cd app && npx playwright test` — 21/21 pass in one run (32.5s,
  workers:1), including `tests/routing.spec.ts`'s "the owner can stop a
  running worker and gets honest CANCELLED_BY_OWNER records" scenario,
  unaffected by this change since it never drives `before-quit` a second
  time. No flake was observed in this run, so no rerun was needed.

Honest disclosure: as anticipated in the brief, no automated test drives
the native `dialog.showMessageBoxSync` quit-confirmation prompt or
simulates a second `before-quit` firing mid-grace — Playwright's Electron
harness has no hook for either. This fix's coverage is `tsc --noEmit`
(passes), the full app gate staying green (unchanged 43/43 unit + 21/21
Playwright, none of which exercise this exact re-entrant path), and the
line-by-line semantics confirmation above against the edited handler body.
This is the same disclosed limitation Task 037 recorded for the original
handler; it is not newly introduced by this fix.

How to try it: read `app/src/main/main.ts`'s `before-quit` handler
(currently lines 57-81) alongside the four-semantics confirmation above.
There is no interactive way to reproduce the race in this environment
(no manual desktop session was available to click the close button twice
in the 8-second window), so this was verified statically, as disclosed.

Limitations and remaining human judgment:

- The fix is verified by types, code reading, and the unchanged automated
  cancel coverage — not by a new automated test, since none can drive the
  native dialog or a second `before-quit` re-entrancy. A future task could,
  in principle, add a unit-level test around a refactored, dialog-free
  version of this control flow if that becomes a priority, but that is out
  of this task's scope.
- Milestone movement: NO

Disposition: DONE
