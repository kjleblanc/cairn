# Task 170 — Close the two defects Task 169's verification surfaced

Base commit: `cf00a12`

Brief commit: `ffe23d6`

## Outcome

Both defects are closed. Neither was hunted for; both fell out of verifying
Task 169, which is why they shared one task rather than costing two ceremonies
for an hour of work.

**The stale test is fixed, and the app was never wrong.** `away.spec.ts` had
been asserting the projects screen contained *"does not transform legacy"* —
copy Task 161 (`c3a9cc5`) moved into the new Convert screen without updating
the test. It now asserts the successor promise on the same screen, *"nothing is
overwritten, moved, or deleted"* (`Picker.tsx:177`), which carries the same
claim in the app's current words. The test moved to the app; the screen was not
edited to suit the test.

**The fourth surface speaks plainly.** Five `Check`-stage emits in
`core/src/serial.ts` still read *"Stopped safely: WORKER_CLAIMS_MISSING."* on
the run screen. They now read *"Stopped safely: the worker never said what it
had done (WORKER_CLAIMS_MISSING)."* All eleven stopped-path emits in that file
now say why before they say a code.

Disposition: **DONE**

## One decision worth naming

The run screen keeps the code; the run strip does not. That is deliberate, not
an inconsistency. The strip is a one-line glanceable status where a constant is
pure noise. The run screen is a debugging surface sitting directly beneath the
bounded numeric evidence line, where the constant is genuinely the useful part
for anyone diagnosing a failure. Same rule — never *alone* — applied to two
surfaces with different jobs.

## What changed

- `app/tests/away.spec.ts` — one assertion retargeted, with a comment naming
  Task 161 as the cause so the next reader does not repeat the investigation.
  The byte-level checks on the preserved evidence file are untouched, so what
  the test actually proves is unchanged.
- `core/src/serial.ts` — five `Check`-stage emits (lines 1218, 1252, 1385,
  1420, 1464) now call `stopReasonInPlainWords`, keeping the code in
  parentheses.
- `app/tests/routing.spec.ts` — its pin updated to the new wording, red-first.

## Checks and real results

All output was observed in this task's terminal.

1. `npm test` from `core/` — **151 pass, 0 fail**. ✓
2. `npm.cmd run typecheck` from `app/` — exit 0, no output. ✓
3. `npm.cmd run test:unit` from `app/` — **198 pass, 0 fail**. ✓
4. `npm.cmd run build:vite` — clean. ✓
5. Red-first on the run-screen change: `routing.spec.ts:253` was updated to the
   new wording and **observed failing** before `serial.ts` was touched, then
   observed passing after. ✓
6. `away.spec.ts` passes. Worth recording precisely: it went green the moment
   the assertion was retargeted, **before any source change** — proof the app
   had been right and the test stale, rather than the reverse. ✓
7. **Looked at it.** Captured the live run screen at a `WORKER_CLAIMS_MISSING`
   stop. It reads `Check  Stopped safely: the worker never said what it had done
   (WORKER_CLAIMS_MISSING).` above `Result  STOPPED — the worker never said what
   it had done`. Both readable; the temporary capture line was removed before
   committing. ✓
8. App token held for every E2E run and **released**. Isolated throwaway
   profiles, fakes only. No real model call, no paid call, no credential. ✓
9. `git diff --check` clean, working tree clean. ✓

## The suite is measurably better

Full Playwright before this task: **5 failed, 29 passed**.
After: **3 failed, 38 passed**.

The three that remain were all proven pre-existing during Task 169:

- `routing.spec.ts:330` and `:387` fail identically with Task 169's source
  changes reverted to `84abc91` — verified by reverting, rebuilding, re-running,
  and restoring. `:387` is the documented "a real codex may exist on this
  machine's PATH" caveat from `HANDOFF-level3a.md`.
- One member of a rotating set (`conductor.spec.ts:774` this run, `:801` and
  `:538` in earlier ones) that differs between full runs and **passes in
  isolation**, alongside `EPERM` errors removing temp profiles. Contention, not
  correctness.

## Limitations and remaining judgment

**Two of the three remaining failures deserve their own task.** They are
proven pre-existing and unrelated to this work, but "proven pre-existing" is not
"fine" — `:387`'s adapter-candidate mismatch depends on what is installed on
this machine, which makes the suite non-portable.

**The rotating failures are unexplained, not benign.** Passing in isolation and
failing under load points at profile-cleanup contention (`EPERM`), but nothing
here diagnosed the mechanism. A suite that fails differently each run is only
slightly better than one that always fails.

**One thing seen and deliberately not changed.** The run screen shows
`Bounded worker evidence: agentMessageCount=1; cachedInputTokens=4; …` directly
above the line this task fixed. It is dense and machine-shaped, but it is
bounded numeric debugging evidence on a debugging surface, deliberately scoped
by Task 044 for privacy. Different category from a stop code; left alone on
purpose rather than by oversight.

## How to try it

Reach a stopped run and open the run screen. The Check line says what happened
in words, then names the code; the Result line beneath says the same thing
without it. Read the Check line as someone who does not know what a "claims
block" is — that is the bar.

Milestone moved: **NO**
