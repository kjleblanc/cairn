# Task 038 — Brief

Requested visible outcome: fix a review finding against Task 037's
`before-quit` handler (`app/src/main/main.ts`, commit `4936487`). The
`quitting` flag only suppressed re-showing the confirm dialog; it did not
block a second quit attempt. If an impatient owner clicked the window's
close button again during the 8-second cancel/settle grace (window-all-closed
firing `app.quit()` a second time), the handler returned without calling
`event.preventDefault()`, so Electron proceeded with the default quit and
could kill the process before the cancelled run finished writing its honest
`CANCELLED_BY_OWNER`/`STOPPED` record — contradicting the dialog's own
promise that quitting "writes honest STOPPED records first."

Boundary of intent: restructure only the `before-quit` handler in
`app/src/main/main.ts` so quit stays blocked for the whole grace period and
only the handler's own final `app.quit()` (fired once the run settles or the
grace times out) is allowed through. The dialog's `showMessageBoxSync`
options (type, buttons, defaultId, cancelId, message, detail) stay
byte-identical — this is a control-flow fix, not a copy or UX change. No
other file changes, no core/CLI changes, no new dependency, no version
bump.

The fix: track two flags. `quitting` still marks that the owner confirmed
and the grace period is underway. A new `readyToQuit` flag is set only
inside the grace's resolution callback, immediately before the handler's own
`app.quit()` call. The handler's top check becomes `if (readyToQuit) return;`
(let the real final quit sail through with no `preventDefault()`). Then, if
a task is still running (`runs.dirs.length !== 0`), always
`event.preventDefault()` first — regardless of `quitting` — so every quit
attempt during the grace is blocked at the Electron level. Only after that
does the handler check `if (quitting) return;` to silently swallow a
re-entrant quit attempt without showing the dialog again.

Checks that show the outcome holds:

- `cd app && npm run typecheck` — clean.
- `cd app && npm run test:unit` — 43/43 pass (this task does not add or
  change any unit test; the fix is exercised only through the reasoning
  below and manual code review, since no automated harness can drive the
  native quit dialog — the same disclosed limitation Task 037 recorded).
- `cd app && npm run build:vite` — builds clean.
- `cd app && npx playwright test` — 21/21 pass (workers:1); the existing
  cancel-and-quit-adjacent coverage in `tests/routing.spec.ts` (the Stop
  button / `CANCELLED_BY_OWNER` scenario) stays green unchanged, since this
  task does not touch `tasks.ts` or the Stop button path.
- Read-through confirmation of four semantics against the edited handler
  body: (a) a second quit attempt during the grace is silently blocked (no
  dialog spam) while records finish; (b) once `readyToQuit` is set by the
  grace's resolution, the handler's own final `app.quit()` proceeds with no
  `preventDefault()` in its way; (c) if every run settles naturally before
  any quit attempt, `runs.dirs.length === 0` lets that first quit proceed
  normally, exactly as before; (d) choosing "Keep running" in the dialog
  (`choice !== 0`) still leaves the app open with the run alive —
  `preventDefault()` already fired before the dialog, and `quitting` never
  flips to `true` in that branch.

DONE means: the handler is restructured exactly as above, the dialog
options are unchanged, all four semantics hold on inspection, and every
automated gate above is green. STOPPED means: any required gate could not
be made to pass, or the restructure changes the dialog's visible options;
whatever was written stays for inspection instead of being claimed as done.
