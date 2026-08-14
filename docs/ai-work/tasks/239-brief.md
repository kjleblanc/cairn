# Task 239 brief - finish and prove Slice 2

**Lane:** A (the main checkout). **Base commit:** `64e75e4`.

Closes Slice 2 of
`docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md`, begun by Task
237 (the Core engine) and continued by Task 238 (the app layer). Both stopped.
Task 238's report is the prerequisite reading; its "What the next session must
do" list is this task's scope, in that order.

The owner confirmed Slice 3 does not begin until this task's owner gate is
answered, because the plan makes gate 2 the gate for continuing toward the
critic.

## Requested visible outcome

Unchanged from Task 238, and now actually shown to work through the ordinary
Chat product path - no `CAIRN_TEST_Q9`, task-numbered marker, calibration
environment, lab page, or alternate product entrance:

Before dispatch, a compact **Task Card** shows the accepted outcome as `c1` and
every accepted blocking requirement as a later `cN`, each marked either as a
check Cairn runs itself or as one the owner must look at. After the worker, the
same rows appear on the Unsealed candidate, each answered by three visibly
separate voices - what Cairn checked and found, what the worker claimed
(attributed to it), and what still needs the owner's own eyes. The terminal
report and the result card carry the same rows. A row the owner has not
answered, or answered as not met, cannot seal `DONE`.

## Boundary of intent

- Work in Task 238's order: fixtures, result card, Playwright and screenshots,
  owner gate, full Core serial suite.
- **Fix the 14 red Task 235 fixtures by updating them to the new contract, never
  by weakening the contract.** `checkedCandidate` keeps requiring `answers`;
  `parseUnsealedCandidateDecisionRequest` keeps its exact-keys rule and keeps
  requiring `ownerAnswers`; the settlement stays an object. If a fixture cannot
  be updated without relaxing a guard, stop and say so.
- Add the answered rows to the result card only; do not redesign it.
- Do not redesign Task 237's `core/src/taskcard.ts` or Task 238's shared
  contract. This task proves them, it does not rework them.
- Preserve worker authority, the worker prompt's other content, routing,
  pre-work approval, cancellation, timeout and orphan handling, protected-Git
  checks, records, exact-path commit behavior, conductor commentary, provider
  connections, milestone logic, and every Slice 1, Task 237 and Task 238
  behavior including the pause, the two choices, honest `STOPPED`, and
  abrupt-loss silence.
- A run given no promises must still reach the current terminal close
  byte-for-byte.
- Add no new preload channel and no new `CairnApi` method.
- Do not add or activate critic execution, repair execution, a second worker
  invocation, Q9 lifecycle, persistence, custody, activation, calibration,
  restart recovery, Task 224-233 proposal machinery, a universal Evidence Plan
  or command DSL, new dependencies, sandbox campaigns, or broad cleanup.
- Do not add root `typecheck` / `test:unit` scripts to Cairn's own
  `package.json`. That remains Slice 5's decision, for the reason Task 237
  recorded.
- Make no real conductor, Builder, critic, or external model call. Request,
  read, print, copy, move, and inspect no credential or connection storage.
  Install nothing.
- Local fakes only at the existing seams - `app/tests/fixtures/fake-conductor.mjs`
  and `app/tests/fixtures/fake-codex-env.ts` at `CAIRN_MOCK=0`.
- Hold the single-tenant app token for any app or Playwright run, released in a
  `finally`. Use only a task-owned disposable test project and the isolated
  offscreen E2E profile. Do not use the owner's real profile, do not close the
  owner's app, and add no marker that makes E2E visible.
- Change no other lane's worktree, no DELVE path, no historical record, and no
  milestone fact. Make no push, publication, or deployment.
- The nine failing tests in `app/tests-unit/builderlivetransport.test.ts` and
  `app/tests-unit/buildertrackedtext.test.ts`, and the red `cli` typecheck from
  Task 211, are pre-existing on `main` and belong to other tasks.

## Checks

1. **`c1` - the 14 fixtures pass again with every guard intact.** All Task 235
   app unit tests pass, and the exact-keys rule, the `answers` requirement and
   the settlement shape are unchanged. A deliberate mutation of each guard still
   fails a test.
2. **`c2` - the result card carries the same rows**, with Cairn's finding, the
   worker's attributed claim, and the owner's judgment distinct.
3. **`c3` - the Task Card appears before dispatch in ordinary Chat**, showing
   every accepted row and its verification kind, with no task-specific entrance.
4. **`c4` - cancelling before dispatch makes zero worker calls.**
5. **`c5` - approving invokes the existing worker exactly once.**
6. **`c6` - the answered candidate shows three separate voices** and is where the
   owner answers their rows.
7. **`c7` - an owner row cannot be auto-passed.** A run whose owner row is
   unanswered or answered not-met closes `TASK_PROMISE_NOT_MET`, not `DONE`.
8. **`c8` - every earlier behavior still holds**, including a promise-free run
   reaching the current close unchanged, and **the full
   `core/test/serial.test.js` run to completion**.
9. **`c9` - focused machine checks pass**, each named with its exact command and
   real result: Core typecheck and suites, app typecheck, unit typecheck, Vite
   build, full app unit suite, and ordinary-route Playwright.
10. **`c10` - the owner can read both surfaces.** Under the app token, an
    ordinary-route offscreen disposable-profile E2E captures the WHOLE Task Card
    and the WHOLE answered Unsealed candidate - buttons included, nothing
    cropped - and the owner answers: "Is it clear what counts as done, which
    evidence Cairn checked, which statements came from the worker, and what
    still needs your judgment?" Playwright, not the owner, exercises the presses.

## DONE and STOPPED

**DONE** means the outcome holds through the ordinary Chat path, all ten checks
pass with `c10` carrying the owner's own answer, no test this slice touched is
red, this report and one LOG row close the task, and exact-path commits leave
the main checkout clean.

**STOPPED** means a fixture cannot be updated without weakening a guard; the
outcome cannot be shown through the ordinary route; protected work changes; a
provider call, credential, dependency or external action would be needed; or the
same underlying blocker has stopped this slice twice.

The milestone does not move here. Slice 3 does not begin here.
