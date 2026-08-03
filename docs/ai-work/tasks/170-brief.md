# Task 170 brief — Close the two defects Task 169's verification surfaced: a test pinning removed copy, and run-screen messages still showing raw codes

**Lane:** A (main checkout)
**Base commit:** cf00a12

## Requested visible outcome

Two defects, both found while verifying Task 169 rather than by looking for
them, both closed. They share only their provenance, which is why they share one
task instead of costing two ceremonies for an hour of work.

**One: a test has been pinning copy the app stopped showing.**
`app/tests/away.spec.ts:40` asserts the projects screen contains the words
*"does not transform legacy"*. Task 161 (`c3a9cc5`) rewrote that screen and moved
the sentence into the new Convert screen without updating the test; `git log -S`
confirms it. The test has failed on every full Playwright run since, and the harm
runs past its own red mark: verifying Task 169 meant spending real effort working
out which of five failures were mine, with this one adding noise the whole way. A
suite that is already red teaches you to ignore red.

**Two: the run screen still speaks in machine constants.** Task 169 made the
result card, the written report, and the run strip say why a run stopped. Five
`Check`-stage activities in `core/src/serial.ts` sat outside its stated boundary
and still read *"Stopped safely: WORKER_CLAIMS_MISSING."* on the run screen —
named as remaining work in Task 169's own report. Same defect, same fix. Leaving
it means Cairn is honest on three surfaces and not on the fourth.

After this, a stopped run reads *"Stopped safely: the worker never said what it
had done (WORKER_CLAIMS_MISSING)."* The run screen is a debugging surface, so
unlike the one-line strip it keeps the code beside the plain clause.

## Boundary of intent — what must not change

- **The away.spec test keeps its intent.** It exists to prove legacy state is
  preserved and the conversion path stays reachable. Its byte-level checks on the
  preserved evidence file stay exactly as they are; only the stale on-screen
  assertion is retargeted at the copy that replaced it.
- **No app copy is rewritten to suit a test.** The test moves to the app, never
  the reverse. If the current wording does not carry the old sentence's meaning,
  that is a finding to report, not a licence to edit the screen.
- **No honesty, boundary, or approval rule moves.** This is wording and one
  assertion.
- **The code is not deleted from the run screen.** It is a debugging surface and
  the constant is genuinely useful there; it stops arriving *alone*.
- **`conductor-v4` is untouched.** No constitution change.
- No new dependencies, no stored-data change, no paid call, no eval run.

## Plan (AI decision)

1. Retarget `away.spec.ts:40` from `/does not transform legacy/` to the Picker's
   successor promise, `/nothing is overwritten, moved, or deleted/`
   (`Picker.tsx:177`). Same screen, same claim, current words.
2. Convert the five `Check`-stage emits in `core/src/serial.ts` (lines 1218,
   1252, 1385, 1420, 1464) to use `stopReasonInPlainWords`, keeping the code in
   parentheses. Update the `routing.spec.ts:270` pin red-first.

## Checks that will show the outcome holds

1. From `app/`: `npm.cmd run typecheck` — exit 0.
2. From `app/`: `npm.cmd run test:unit` — all pass.
3. From `core/`: `npm test` — all pass, with any core-side pin updated red-first
   and observed failing before the fix.
4. From `app/`: `npx playwright test tests/away.spec.ts` — passes, app token held
   and released.
5. From `app/`: the `routing.spec.ts` stopped-path case passes.
6. `git diff --check` clean; `git status --short` clean at the end.
7. **Look at it.** Reach a stopped run and read the run screen's Check line. If it
   still needs a glossary, this task failed whatever the tests say.

## DONE and STOPPED

- **DONE**: `away.spec.ts` passes with its byte-level preservation checks
  unchanged; all five Check-stage messages read as a plain clause with the code in
  parentheses; every check above passed with its real output observed; and the
  report plus LOG row land in one exact-path commit.
- **STOPPED**: the current Picker copy turns out not to carry the old sentence's
  meaning (in which case the finding is reported, not papered over by editing the
  screen), or the Check-stage change cannot be made without touching a rule
  outside this boundary. The report names the safe state left behind.
