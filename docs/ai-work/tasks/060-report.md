# Task 060 — Report

## What changed

### `app/src/main/rungate.ts` (new)

Owns the one-running-task-per-project Set and the quit-drain flag, exposing
exactly: `markRunning`, `clearRunning`, `isTaskRunning`, `runningDirs`,
`beginQuitDrain`, `isQuitDraining`, `_resetForTests`, and `runRefusal`.
`runRefusal(alreadyRunning, quitDraining)` is the one refusal decision both the
`task:run` handler and the conductor's send gate need: quit-draining wins over
serial-run-active (a new run started a moment before the grace window closes
it would just be noise), returning `QUIT_IN_PROGRESS: Cairn is stopping the
current task and quitting. Start the next task after relaunch.` when draining,
`SERIAL_RUN_ACTIVE: One task is already running for this project.` when a run
is already active but not draining, and `null` otherwise. `_resetForTests`
clears both the Set and the flag.

### `app/src/main/tasks.ts`

Deleted the local `running` Set. `task:run`'s refusal check now reads
`runRefusal(isTaskRunning(dir), isQuitDraining())` in place of the old
`running.has(dir)` string literal — this is the actual hole-closer: a
`task:run` call that arrives after `beginQuitDrain()` now refuses with
`QUIT_IN_PROGRESS` instead of starting a new worker mid-drain.
`running.add`/`running.delete` at the two run-lifecycle sites became
`markRunning`/`clearRunning`. `activeTaskRuns()` now returns
`dirs: runningDirs()`. Nothing else in the handler changed — the
`REAL_MODEL_CALL_NOT_AUTHORIZED` and legacy-state paths are untouched.

### `app/src/main/conductor/service.ts`

Import path only: `isTaskRunning` now comes from `../rungate.js` instead of
`../tasks.js`. The send gate's own `SERIAL_RUN_ACTIVE` message and behavior
are unchanged — this task did not extend the send gate to also check
quit-draining, since the brief scoped the quit-drain hole to `task:run`
(the path that actually starts a new worker process).

### `app/src/main/main.ts`

One new call: `beginQuitDrain()` immediately after `quitting = true;` in the
`before-quit` handler, right before `runs.cancelAll()`. Everything else in the
handler (the confirmation dialog, the 8-second grace race, `readyToQuit`) is
unchanged.

### `app/tests-unit/rungate.test.ts` (new)

The brief's test verbatim: marks a dir running, checks `isTaskRunning` and
`runningDirs`, clears it, checks `runRefusal(false, false)` is `null` and
`runRefusal(true, false)` matches `/SERIAL_RUN_ACTIVE/`, then calls
`beginQuitDrain()` and checks `isQuitDraining()` is `true` and
`runRefusal(false, true)` matches `/QUIT_IN_PROGRESS/`. No `tsconfig.unit.json`
edit was needed — its `include` already globs `tests-unit/**/*.ts`, and
`rungate.ts` is pulled in transitively as the test's own import.

Files touched: `app/src/main/rungate.ts` (new),
`app/tests-unit/rungate.test.ts` (new), `app/src/main/tasks.ts`,
`app/src/main/main.ts`, `app/src/main/conductor/service.ts`,
`docs/ai-work/tasks/060-brief.md`, `docs/ai-work/tasks/060-report.md`,
`docs/ai-work/LOG.md`.

## TDD evidence (RED then GREEN, this session)

RED — before `rungate.ts` existed, with only the test file written:

```
cd app && npm run test:unit
> tsc -p tsconfig.unit.json && node --test dist-unit/tests-unit/*.test.js

tests-unit/rungate.test.ts(3,131): error TS2307: Cannot find module
'../src/main/rungate.js' or its corresponding type declarations.
```
Module-not-found, as the brief said to expect (no build-first gate beyond
`tsc -p tsconfig.unit.json`; this is the meaningful RED for a brand-new
module).

GREEN — after `rungate.ts` was implemented and `tasks.ts`/`service.ts`/
`main.ts` rewired:

```
cd app && npm run test:unit
...
✔ the running set and the quit drain gate one refusal decision (1.3ms)
...
ℹ tests 44
ℹ pass 44
ℹ fail 0
```

The unit suite holds 44 tests total (43 pre-existing + this one new test),
all passing.

## Checks run (all real, this session)

- `cd app && npm run test:unit` — RED (module not found) confirmed first,
  then GREEN: `tests 44 / pass 44 / fail 0`.
- `cd app && npm run typecheck` (`tsc --noEmit`, whole app project) — clean,
  no errors. This is what actually confirms `tasks.ts`, `main.ts`, and
  `service.ts`'s rewired imports resolve, since none of those three files are
  part of `tsconfig.unit.json`'s narrower include list.
- `cd app && npm run test:smoke` — full Playwright suite, 24 tests. First full
  run showed one failure
  (`conductor.spec.ts:105 the connect card blocks until consent...`) with 6
  further tests in the same file not run. Investigated before accepting:
  reverted to the pre-change code (`git stash -u`) and re-ran the same test in
  isolation — it passed there too, and re-running the same test and the full
  `conductor.spec.ts` file with my changes restored also passed every time.
  A full clean re-run of `npm run test:smoke` with the changes in place then
  passed all 24/24 (`24 passed (1.2m)`). Conclusion: the single failure was a
  pre-existing, order/timing-dependent flake in the Playwright run, not a
  regression from this change — confirmed by reproducing the pass on both the
  old and new code and by the failure not reproducing on a second full run.
- `git status --porcelain` before staging matched exactly the files listed
  above (three modified, two new source/test files, plus this task's three
  record files) — no unrelated changes.

## How to try it

```
git clone https://github.com/kjleblanc/cairn.git
cd cairn/app
npm ci
npm run test:unit
```

To see the fix directly: start a task, then in `main.ts`'s `before-quit`
handler confirm the quit dialog — `task:run` calls arriving after that point
now refuse with `QUIT_IN_PROGRESS` instead of starting a second worker during
the 8-second grace window.

## Self-review / concerns

- The brief's interface list is matched exactly; no extra exports were added
  (an earlier draft of `tasks.ts` re-exported `isTaskRunning` for backward
  compatibility, but nothing outside `tasks.ts` still imported it from there
  once `service.ts` was repointed at `../rungate.js`, so the re-export was
  removed to keep the surface minimal).
- `runRefusal` is wired into `task:run` only, not into `service.ts`'s send
  gate. The brief's interface section describes `service.ts`'s change as
  "import path only," and the quit-grace hole named in the task is specifically
  about a new worker run starting mid-drain, not about conductor chat sends.
  If a future task wants the conductor gate to also refuse mid-drain, that is
  a separate, deliberate scope decision, not something silently added here.
- `beginQuitDrain` is one-way in a live process (no reset path outside
  `_resetForTests`), matching the brief: quitting is not meant to be
  reversible once the owner has confirmed it.
- No behavior beyond the task: the `REAL_MODEL_CALL_NOT_AUTHORIZED`,
  `LEGACY_STATE_PRESENT`, and disclosure-matching paths in `task:run` are
  byte-for-byte unchanged; only the refusal check itself moved from a Set
  lookup and a literal string to `rungate.ts`'s shared helpers.
- Milestone movement: NO — this hardens existing behavior and completes a
  planned refactor; it adds no new owner-facing capability.

Disposition: DONE
