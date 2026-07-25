# Task 064 — Brief

Requested visible outcome: make the run live where it was started (Phase 3
Task 6). Since Task 063 an owner can dispatch a task from inside the
conversation, but the moment it starts the conversation goes quiet: the
confirmation panel says only "Cairn is running this task", there is no stop
control, no stage, no clock, and when the run ends the panel simply vanishes.
The composer meanwhile still looks open, though main refuses every send while
a task runs for the project. After this task the conversation carries the run:
a compact status strip with the latest activity stage, the elapsed clock, a
stop control on the existing cancel path, and a link to the run screen; a
composer that says plainly it is closed; and, when the session closes, the
run's own terminal line in the strip so the conversation is never silent
between this task and Task 8's result cards.

The stage union is `"Route" | "Run" | "Check" | "Result"` — four stages, not
five. The Phase 3 design spec names a fifth ("Guard"); that is an error in the
spec, recorded here rather than propagated into the code.

Nothing new is added to the IPC surface. The strip reads the same two seams
the run screen reads — `taskCurrent(dir)` on mount and `onTaskActivity` while
it runs — because the run belongs to the main process, so a reload or a walk
to another screen must reattach rather than orphan.

The lane this needs does not exist as a shared thing yet. A run slow enough to
watch, stop, or reload into exists only in the fake-codex environment
(`CAIRN_MOCK=0` plus a PATH shim, with the real disclosure confirmation in the
way), today a private helper inside `app/tests/routing.spec.ts`. This task
ports that helper VERBATIM to `app/tests/fixtures/fake-codex-env.ts` so both
spec files can launch it; routing.spec.ts imports it unchanged and must stay
green byte-for-byte in behavior.

Two fixes carried from the Task 063 review land with it:

1. `app/tests/routing.spec.ts` — the details-guard comment mis-attributes
   which assertion catches which neutered site. The mapping is rewritten to
   the one the 063 neutering table actually produced.
2. `app/src/renderer/screens/Chat.tsx` — `startDispatch` lacks the
   `dispatchToken` guard `onCardSend` has, so a second dispatch pressed while
   the first is still running can be clobbered by the first one's late answer.

Boundary of intent: `app/src/renderer/screens/Chat.tsx`,
`app/src/renderer/App.tsx` (one navigation prop for the strip's link),
`app/src/renderer/app.css`, a new `app/tests/fixtures/fake-codex-env.ts`,
`app/tests/routing.spec.ts`, `app/tests/conductor.spec.ts`, plus this task's
three record files. No change to `core/`, to the IPC surface, or to the
main process.

Checks that will show the outcome holds:

- `cd app && npx playwright test tests/conductor.spec.ts` — RED first on two
  new tests in the shared fake-codex slow lane (no strip exists), then GREEN.
- `cd app && npx playwright test tests/routing.spec.ts` — GREEN before and
  after the fixture extraction, proving the port changed no behavior.
- `cd app && npx tsc --noEmit`, `npm run test:unit`, `npm run test:smoke` —
  all green, no test lost.
- The reattachment assertion is checked by neutering: with the mount-time
  `taskCurrent` read removed, the post-reload assertion must fail.

DONE means: the fixture is a verbatim port that routing.spec.ts imports; a run
dispatched in chat shows a strip with one of the four real stages, an elapsed
clock, "Stop this task" and "Open the run screen"; the composer is disabled
and says "A task is running. The composer reopens when it finishes."; stopping
closes the run CANCELLED_BY_OWNER and the strip shows that terminal state;
a reload mid-run reattaches the strip from the main-process session and the
run's finish still lands there; both carried fixes are applied; typecheck,
unit, and smoke suites are green. STOPPED means any of those does not hold.
