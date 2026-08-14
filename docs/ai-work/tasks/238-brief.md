# Task 238 brief - show the Task Card and its answered checks in Chat

**Lane:** A (the main checkout). **Base commit:** `0fdaffe`.

Continues Slice 2 of
`docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md`, which Task
237 stopped after building the Core engine. Task 237's report is the
prerequisite reading; its "What the next session must do" list is this task's
scope, in that order.

Task 237 already landed, tested and mutation-proved: `core/src/taskcard.ts`
(promise rows, the fixed check menu, the capped runner, three-voice answers,
the satisfaction gate), the `taskPromises` serial option, the rows in the
contract and brief, the extended candidate projection, continue-with-owner-
answers, and the `TASK_PROMISE_NOT_MET` stop reason. **Do not redesign any of
it.** This task makes it visible.

## Requested visible outcome

In ordinary Cairn Chat - no `CAIRN_TEST_Q9`, task-numbered marker, calibration
environment, lab page, or alternate product entrance:

**Before dispatch**, beside the existing Start-this-task panel, a compact
**Task Card** shows the accepted outcome as `c1` and every accepted blocking
requirement as a later `cN`, in order, each marked either as a check Cairn will
run itself - chosen from the short menu of commands this project actually
supports - or as one the owner must look at.

**After the worker**, the same rows appear on the Unsealed candidate, each
answered by three visibly separate voices: what Cairn checked and found, what
the worker claimed (attributed to it), and what still needs the owner's own
eyes, still unanswered until the owner answers it there.

The terminal report and the result card carry the same rows. A row the owner
has not answered, or answered as not met, cannot seal `DONE`.

## Boundary of intent

- Work in Task 237's order: worker prompt, then records, then the app layer,
  then the E2E and the owner gate.
- The menu rides on the existing `task:route` response, the selection on
  `task:run`, and the owner's row answers on the existing
  `task:candidate-decide` payload. Add no new preload channel and no new
  `CairnApi` method, so `app/lab/mock-cairn.ts` needs no stub.
- Extend the existing worker prompt; do not rewrite it or change its other
  content. The row-to-claim matching already exists in Core and is tested.
- Preserve worker authority, routing, pre-work approval, cancellation, timeout
  and orphan handling, protected-Git checks, records, exact-path commit
  behavior, result cards, conductor commentary, provider connections, milestone
  logic, and every Slice 1 and Task 237 behavior including the pause, the two
  choices, honest `STOPPED`, and abrupt-loss silence.
- A run given no promises must still reach the current terminal close
  byte-for-byte.
- Do not advertise critic or repair on the card. They are not live.
- Chat only. Manual Task Run parity is out of scope unless it falls out of a
  shared component for free.
- Do not add or activate critic execution, repair execution, a second worker
  invocation, Q9 lifecycle, candidate persistence, custody, activation,
  calibration, route fingerprints, restart recovery, Task 224-233 proposal
  machinery, a universal Evidence Plan or command DSL, new dependencies,
  sandbox campaigns, or broad cleanup.
- Do not add root `typecheck` / `test:unit` scripts to Cairn's own
  `package.json`. Task 237 recorded why: a root script that quietly skipped the
  red `cli` workspace would be a dishonest green. That is Slice 5's decision.
- Make no real conductor, Builder, critic, or external model call. Request,
  read, print, copy, move, and inspect no credential or connection storage.
  Install nothing.
- Local fakes only at the existing seams - `app/tests/fixtures/fake-conductor.mjs`
  and `app/tests/fixtures/fake-codex-env.ts` at `CAIRN_MOCK=0`.
- Hold the single-tenant app token for any app or Playwright run, released in a
  `finally`, and use only a task-owned disposable test project and the isolated
  offscreen E2E profile. Do not use the owner's real profile, and add no marker
  that makes E2E visible.
- Change no other lane's worktree, no DELVE path, no historical record, and no
  milestone fact. Make no push, publication, or deployment.
- The nine failing tests in `app/tests-unit/builderlivetransport.test.ts` and
  `app/tests-unit/buildertrackedtext.test.ts`, and the red `cli` typecheck from
  Task 211, are pre-existing on `main` and belong to other tasks.

## Checks

1. **`c1` - the worker is told to answer every row.** The dispatched worker
   prompt lists each displayed `cN` and requires one claims entry per row, and
   its answers are matched back to the rows as attributed claims.
2. **`c2` - the terminal report and result card carry the same rows.** Both
   name each `cN`, what Cairn found, what the worker said, and what the owner
   judged, with the three kept distinct.
3. **`c3` - the Task Card appears before dispatch in ordinary Chat.** It shows
   every accepted row with its verification kind, next to the existing dispatch
   panel, with no new product entrance.
4. **`c4` - cancelling before dispatch makes zero worker calls.**
5. **`c5` - approving invokes the existing worker exactly once.**
6. **`c6` - the answered candidate shows three separate voices.** Cairn's own
   findings, the worker's attributed claims, and the owner's still-unanswered
   rows are visibly distinct, and the owner answers the owner rows there.
7. **`c7` - an owner row cannot be auto-passed.** A run whose owner row is
   unanswered or answered not-met closes `TASK_PROMISE_NOT_MET`, not `DONE`.
8. **`c8` - every Slice 1 and Task 237 behavior still holds**, including a
   promise-free run reaching the current close unchanged, and the full
   `core/test/serial.test.js` file run to completion.
9. **`c9` - focused machine checks pass**, each named with its exact command and
   real result, including app unit, typecheck, build and ordinary-route
   Playwright.
10. **`c10` - the owner can read both surfaces.** Under the app token, an
    ordinary-route offscreen disposable-profile E2E captures the WHOLE Task Card
    and the WHOLE answered Unsealed candidate - buttons included, nothing
    cropped - and the owner answers: "Is it clear what counts as done, which
    evidence Cairn checked, which statements came from the worker, and what
    still needs your judgment?" Playwright, not the owner, exercises the presses.

## DONE and STOPPED

**DONE** means the Task Card and its answered rows hold through the ordinary
Chat product path, all ten checks pass with `c10` carrying the owner's own
answer, this report and one LOG row close the task, and exact-path commits leave
the main checkout clean.

**STOPPED** means the tree is not clean at the expected base or protected work
changes; a check would require arbitrary command authority; an accepted request
cannot be represented without hiding a requirement; the work would require Q9
custody, activation or persistence; a provider call, credential, dependency or
external action would be needed; or the same underlying blocker has stopped
this slice twice.

The milestone does not move here.
