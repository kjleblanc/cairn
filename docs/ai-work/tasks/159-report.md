# Task 159 report — an error card that lets go

**Lane:** A (main checkout) · **Base commit:** 259cb7e (brief claimed at 9a25e6b; Task 157 landed mid-task at cc32c8a, disjoint files) · **Disposition: DONE**

## The owner's report

Screenshot: the "That folder has no Cairn contract…" card floating over the
workspace home screen — "Found a bug where this error persisted across
screens." The card had no way out: the shell's error state was cleared only
by a *successful* project open, so one failed open rode over every screen
until that happened or the app restarted.

## What actually changed

- `app/src/renderer/components/Ui.tsx` — `ErrorCard` gains an optional
  `onDismiss`. When provided, the card renders a plain "Got it" pill; when
  not, it is exactly today's card. The inline usages (Picker's create flow,
  ConnectCard, TaskRun) pass nothing and are unchanged.
- `app/src/renderer/App.tsx` — four changes: the shell error card is
  dismissible; a failed open raised inside the projects/settings overlay is
  cleared when that overlay closes; every fresh `openProject` attempt clears
  the previous failure while it runs; and an explicit boot target
  (`CAIRN_OPEN`) that fails now lands on a working screen — the picker, or
  the welcome when nothing is remembered — with the error on top, instead of
  hanging on "Getting ready…" forever underneath it (a real dead-end found
  while tracing the owner's path; behavior change disclosed here).
- `app/src/renderer/screens/Workspace.tsx` — the workspace's own error card
  (failed switch / town load / town save) is dismissible, and switching the
  active project clears a stale card from the previous context.
- `app/src/renderer/app.css` — `.error-card-actions` lays out the dismiss
  row. No other visual change.
- `app/tests/projects.spec.ts` — new last pin, the owner's exact flow: from
  inside an open project, the overlay lists Beta healthy, its contract file
  is removed, clicking its card raises the owner's exact message; "Got it"
  dismisses; triggered again, Escape (one of the overlay's three ways out)
  closes the overlay and the card clears with it; the town square is alive
  throughout. Also captures the shots-page image.
- `app/tests/smoke.spec.ts` — new pin: `CAIRN_OPEN` on a contractless folder
  shows the card over a working picker (never "Getting ready…"), dismisses,
  and the picker stays usable.
- `app/shots/` (gitignored, owner-review content): `task-159-error-card.png`
  captured from the E2E run and inspected; manifest entry prepended.

## Checks run (exact commands, real results)

1. `cd app && npm.cmd run typecheck` — clean.
2. `cd app && npm.cmd run test:unit` — 158/158 pass (includes Task 157's then
   -uncommitted followups tests; my change broke none).
3. `cd app && npm.cmd run build:vite && npm.cmd run build:lab` — both green
   (the E2E suite tests the built bundle; build preceded the run).
4. `cd app && ./node_modules/.bin/playwright.cmd test tests/smoke.spec.ts
   tests/projects.spec.ts` with BOTH app-token locations held
   (`app/.app-token`, `$TMPDIR/cairn-app-token`) — **8/8 pass (16.6s)**,
   including the two new pins; windows parked off every display by the
   suite's own `CAIRN_E2E=1` seam, owner's screen untouched; token released
   after. Re-runnable any time with the same command.
5. Final `git status --porcelain` — the protected in-flight paths (Task
   155's `Chat.tsx`/`conductor.spec.ts` WIP, LOG.md's pending rows, the
   148/150 records, `design/`, log files) untouched; staging was exact-path.

`conductor.spec.ts` deliberately NOT run (Task 155's foreign WIP pins), per
the brief; my change touches no chat behavior.

## Repairs inside the task (both test-side, disclosed)

- The smoke pin first asserted the welcome screen; the file's shared
  throwaway profile already remembers the earlier test's project, so the
  fallback correctly shows the picker. Assertion corrected to the design.
- The projects pin first clicked the overlay's × — which the floating error
  card covers. That is now a **deliberate, disclosed tradeoff**: while the
  card is up, the error is acknowledged first; "Got it", Escape, and scrim
  clicks all still close the overlay. The pin uses Escape. The owner can
  judge the feel from the capture; making the × reachable would mean
  repositioning or scoping the card, a design decision left for a later task.

## Harness notes

- The app-token locks seen at 22:34 belonged to the Task 157 lane, which was
  alive and landing (cc32c8a) while this task ran. Coordination happened
  through the token protocol exactly as designed: my two E2E runs held both
  locations only while its were free; its staged files were never touched
  and my commit was exact-path. `npx` is absent on this shell's PATH;
  Playwright was invoked via `node_modules/.bin/playwright.cmd`.

## How to try it

Open the app, open "Your projects", and open a folder that has no Cairn
rulebook: the card appears with "Got it". Click it, or close the overlay —
either way the card is gone and stays gone. (Or don't change anything: the
two new E2E pins reproduce both paths on demand.)

## Limitations / remaining human judgment

- The ×-coverage tradeoff above is the one feel decision; the capture on the
  shots page is the thing to look at.
- Errors from the phone bridge and from chat sends are different surfaces,
  untouched here.

**Milestone moved?** NO.
