# Task 159 brief — an error card that lets go

**Lane:** A (main checkout)
**Base commit:** 259cb7e (Task 158 report; tree carries Tasks 155+157 in flight, uncommitted — untouched here)

## Requested visible outcome

The owner, with a screenshot of the "That folder has no Cairn contract…" card
floating over the workspace home screen: "Found a bug where this error
persisted across screens."

When opening a folder fails, the error card must let go:

1. It has a working dismiss control ("Got it"), in plain language.
2. It never outlives the context it came from: closing the projects overlay
   clears a failure that happened inside it, and starting a fresh open attempt
   clears the previous failure.
3. The same dismiss works on the workspace's own error card (failed project
   switch / town load / town save).
4. A failed explicit boot target (`CAIRN_OPEN` on a folder with no contract)
   lands on a working screen — the picker or welcome — with the error on top,
   instead of hanging on "Getting ready…" forever under the card.

## Why

Today the shell-level error in `App.tsx` is cleared only by a *successful*
project entry. Nothing dismisses it, no navigation clears it, and it renders
above every screen — so one failed open follows the owner everywhere until
they happen to open a project successfully or restart the app. The boot path
is worse: an explicit-target failure leaves the base view stuck on "loading".

## Boundary of intent — what must not change

- **Protected in-flight work (Tasks 155+157), never touched or swept into a
  commit:** `app/src/renderer/screens/Chat.tsx`, `app/src/shared/ipc.ts`,
  `app/src/main/conductor/service.ts`, `app/src/main/conductor/store.ts`,
  `app/tests-unit/store.test.ts`, `app/tests/conductor.spec.ts`,
  `app/tests/fixtures/fake-conductor.mjs`, `app/src/main/conductor/followups.ts`,
  `app/tests-unit/followups.test.ts`. `conductor.spec.ts` is NOT run (foreign
  WIP pins). The untracked 148/150 records, `design/`, and the log files stay
  as they are.
- `docs/ai-work/LOG.md`: row appended, file stays uncommitted (Task 149
  precedent: rows 148–158 await the owner's decision).
- The error message texts themselves, and every successful flow (open, boot,
  switch, save), behave exactly as today.
- Inline `ErrorCard` usages that already live inside a screen (Picker create,
  ConnectCard, TaskRun) keep their exact look — the dismiss control is opt-in
  per usage.
- No dependency changes; renderer only (`Ui.tsx`, `App.tsx`, `Workspace.tsx`,
  `app.css` if styling needs it).

## Plan (AI decision)

- `Ui.tsx`: `ErrorCard` gains an optional `onDismiss`. When provided, the card
  renders a "Got it" pill; when not, it is byte-for-byte today's card.
- `App.tsx`: pass `onDismiss`; clear the shell error at the start of each new
  `openProject` attempt; clear it when the overlay closes; on explicit-boot
  failure, show the error and land on the picker (or welcome when nothing is
  remembered) instead of "loading".
- `Workspace.tsx`: pass `onDismiss` on its own error overlay.
- Regression pins (fixture-driven, no paid calls):
  - `projects.spec.ts` (last test, owns its fixtures): from inside an open
    project, open the projects overlay, break the other project's contract
    file, click its card → the owner's exact error appears → "Got it" clears
    it → trigger again → closing the overlay clears it → the town square
    underneath is alive throughout.
  - `smoke.spec.ts`: `CAIRN_OPEN` on a contractless folder → error card over a
    working picker screen (not "Getting ready…"), dismissed by "Got it".
- One capture of the dismissible card from the E2E run, published to the
  shots page per the owner's review routine.

## Checks that will show the outcome holds

1. `npm.cmd run typecheck`; `npm.cmd run test:unit` — green.
2. `npm.cmd run build:vite`; `npm.cmd run build:lab` — green.
3. `npx playwright test tests/smoke.spec.ts tests/projects.spec.ts` with BOTH
   app-token locations held (`app/.app-token`, `$TMPDIR/cairn-app-token`),
   windows parked off-display by the suite's own `CAIRN_E2E=1` seam —
   including the two new pins.
4. Final `git status --porcelain` confirming the protected paths are untouched
   and staging was exact-path only.

## DONE and STOPPED

- **DONE**: checks 1–4 pass; a failed open shows a card the owner can dismiss,
  the card never survives the context that raised it, and the explicit-boot
  failure lands on a working screen.
- **STOPPED**: any of the four can't hold without touching protected work or
  changing a successful flow; the report names what was tried and the safe
  state left behind.
