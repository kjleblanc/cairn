# Task 054 — CI tells the truth: the suite passes on aliased paths and can never hang the job

## Requested visible outcome

`npm test` passes on GitHub's windows-latest runner — where the temp
directory is addressed through an 8.3 short-name path (`RUNNER~1`) — and a
failing suite can never again hold the CI job open until GitHub's six-hour
kill. Concretely: the first green `ci` run in the repository's history
becomes possible, and any future red run ends in minutes, honestly red.

## Where this comes from (evidence, this session)

The `ci` workflow has never passed. All three runs to date (pushes at
tasks 028, 032, and 052) show the same signature in their logs:

1. **Environmental failure.** Every serial test that reaches `snapshot()`
   fails `PROJECT_ROOT_MISMATCH`. Root cause at `core/src/serial.ts:139-140`:
   the gate compares `resolve(git rev-parse --show-toplevel)` against
   `resolve(root)` case-folded. The runner's `TEMP` contains the 8.3
   component `RUNNER~1`; git reports the expanded long path; `resolve()`
   expands neither; the strings differ. Reproduced locally by pointing
   `TEMP`/`TMP` at a short-name alias: 37 of 39 serial tests fail
   identically (the two passing tests stop before `snapshot()`).
2. **Then the hang.** All tests complete, but the test process never
   exits, so `node --test`'s parent waits forever and CI burns to the
   6-hour default timeout. Diagnosed by handle dump: one perpetually
   rescheduled `Immediate`. Source: the overlapping-run test
   (`core/test/serial.test.ts:793`) spin-waits `while (!release) await
   setImmediate` for adapter entry; when the first run throws before
   reaching the adapter, `release` is never assigned and the abandoned
   test function schedules immediates for the life of the process.

## What will change

- `core/src/serial.ts` — `snapshot()` canonicalizes both sides of the
  root-identity compare with `realpathSync.native` (fail-closed fallback
  to the current `resolve()` on error) so aliased spellings of the same
  real directory pass and genuinely different roots still refuse.
- `core/test/serial.test.ts` — a new regression test drives a serial task
  through an aliased root (8.3 short path on win32, symlink elsewhere;
  skips honestly if the platform cannot make an alias); the overlapping-run
  wait races adapter entry against the first run's settlement so an early
  throw fails the test immediately instead of spinning forever.
- `.github/workflows/ci.yml` — the test job gets `timeout-minutes` so any
  future hang dies in minutes, not hours.

## Boundary of intent (must not change)

- The `PROJECT_ROOT_MISMATCH` gate keeps refusing genuinely different
  roots (a subdirectory, a different repo); only alias spellings of the
  same directory are newly accepted.
- No behavior change for canonical-path projects; no dependency changes;
  no other envelope logic touched; no stored-data or security-posture
  changes.

## Checks that show the outcome holds

1. New alias regression test is RED before the serial.ts fix
   (`PROJECT_ROOT_MISMATCH`) and GREEN after (verified DONE).
2. With only the spin-wait fix applied, the short-TEMP suite run fails
   fast and the process exits — no hang (the CI failure mode, dead).
3. Full suite under short-name `TEMP`/`TMP` passes and exits — the CI
   condition reproduced green locally.
4. All suites green under normal paths: core, cli, app unit, Playwright.
5. `ci.yml` carries `timeout-minutes` on the test job.

## DONE / STOPPED

DONE: all five checks hold. STOPPED: any check fails or the fix would
require weakening the root-identity gate.
