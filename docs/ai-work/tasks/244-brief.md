# Task 244 brief - confirm one allegation, permit one repair, then seal

**Lane:** A (the main checkout). **Base commit:** `46715d8`.

Slice 4 of `docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md`,
begun from `docs/ai-work/HANDOFF-gauntlet-slice4.md`. Tasks 240, 241 and 243
reports are prerequisite reading.

The owner chose one vertical task over an engine-first split, after being shown
that this slice crosses the plan's roughly-eight-production-file warning line
(anti-drift rule 6). A Core-only repair engine with no screen is the exact
failure the restoration plan exists to correct.

## What is true before this task, and stays true after it

**Gate 3 is unspent. This task does not spend it.** Slice 3's one real critic
call has still never been made, and nothing here makes it. Every behaviour
below is proved against the fixture conductor at the existing transport seam,
exactly as Slice 3's offline half was. **A DONE on this task does not close
`c9`/`c10` of Task 241 and is not evidence that any real critic works.**

## Requested visible outcome

A critic finding that says a frozen `cN` row was NOT met becomes something the
owner can act on, in ordinary Chat, on the candidate screen they already know.

1. A `not_met` finding is visibly an **allegation**, not a result.
2. If Cairn's own check for that row passed, **Cairn dismisses the allegation
   itself** and says so. The owner is not asked to adjudicate something Cairn
   has already disproved.
3. Otherwise the owner can **dismiss** it - which changes no file, calls
   nobody, and leaves their two choices exactly as they were - or **confirm**
   it.
4. A confirmed failure offers **one** separately approved repair, naming the
   worker, the row, and the exact correction being asked for.
5. After the repair Cairn refreshes everything it knows and reruns every
   original check itself, then shows the candidate again - with repair no
   longer on offer - and closes `DONE` or `STOPPED`.

No treadmill: one repair, two critic calls, no automatic retry.

## Design choices recorded before the work

These are AI decisions - implementation detail - recorded here so the work
cannot quietly drift into a wider one.

**1. Only a critic finding can start this.** The owner answering `not-met` on
their own row already has an honest ending: `TASK_PROMISE_NOT_MET`. Repair is
tied to a critic allegation against a frozen row, which is what the plan
describes and what keeps the surface small.

**2. Cairn dismisses what its own evidence already disproves.** Section 5 of
the plan: a finding blocks only after deterministic evidence or the owner
confirms the exact failure. So a `not_met` against a row whose `cairn-check`
**passed** is dismissed by Cairn, on screen, with the check's own name and
result as the reason. Only rows Cairn has no passing evidence for - owner-judged
rows, and `cairn-check` rows that failed or did not finish - can be confirmed.

**3. The owner confirms a correction; they do not author one.** The requested
correction is the critic's own observation, carried verbatim and capped. There
is no free-text box on this screen. That makes "the repair cannot widen the
task" structural rather than a promise, and it is the same reason the critic
cannot add a row: nothing new can enter the run at this point.

**4. The repair re-opens the same pause rather than sealing blind.** Core calls
its existing `onUnsealedCandidate` hook a second time with refreshed facts.
Main already mints a fresh checkpoint per pause
(`app/src/main/tasks.ts:1449`), so the second candidate screen, its refreshed
rows, and the second critic offer all follow from machinery that already ships.
**The owner's row judgments from the first pause are discarded**, because they
judged code that has since changed; every owner row is owed again.

**5. The Task Card is immutable, and so is the brief on disk.** The second
dispatch carries the original accepted request and the original frozen rows.
`contractMarkdown` and the owned-records guard (`core/src/serial.ts:7387`) keep
using the **original** text, so the brief file must be byte-identical before
and after a repair.

## Boundary of intent

- **Extend the SAME open runner continuation with `repair`.** Do not call
  `runSerialTask(...)` recursively and do not release the original run lock.
  The second dispatch is the already-chosen adapter, the same start snapshot,
  the same abort signal.
- Maximum **one** repair and **two** critic calls in total, with no automatic
  retry anywhere.
- Refresh worker claims, Git facts, changed paths, protected-work verification
  and **every** original verification-menu result before the terminal close.
- Only the envelope authors records, the commit, the result card and the
  terminal state. The critic still cannot write, run, add a blocking row, or
  declare `DONE` or `STOPPED`.
- Preserve every Slice 1, 2 and 3 behaviour: the disabled Continue with its
  named owed row, `TASK_PROMISE_NOT_MET`, honest `STOPPED`, and the
  byte-identical close for a promise-free run. A run nobody asks to repair must
  reach the close it reaches today, unchanged.
- **Preserve Task 243's folds.** `toContainText` reads hidden text, so any
  assertion meaning "the owner can see this" must call `toBeVisible()` on the
  specific element. Use the `openCandidateFolds` helper in
  `app/tests/conductor.spec.ts`.
- The critic offer stays **above** the two buttons (Task 241), guarded by
  `compareDocumentPosition` in two places. Any new control must not push it
  below them.
- `app/tests-unit/unsealedcandidatepaper.test.ts` has **10** guards. **If one
  fires, reword the code - never relax the guard.**
- No provider, model or credential work. No real critic call. Install nothing,
  add no dependency, touch no `.env` or stored key.
- Do not begin Slice 5 or Slice 6, and do not broaden this into a second worker
  task, Q8/Q9 calibration, activation tuples, upstream-provider proof, sandbox
  work, or cleanup.
- Take the app token before any app or Playwright run and release it in a
  `finally` only if that run created it.
- Stage task paths by exact name. Never `git add -A`.
- **Not yours:** the nine Builder unit failures (baseline **927 tests, 916
  pass, 9 fail, 2 skipped**), the red `cli` typecheck from Task 211
  (`cli/test/task.test.ts:111` and `:119`), `conductor.spec.ts:3314`, and the
  full-suite worker-teardown `EPERM` that aborts long Playwright runs here.

## Checks

1. **`c1` - dismissal changes nothing.** Dismissing an allegation writes no
   file, dispatches no worker, spends no call, and leaves the owner's two
   choices and their state exactly as they were.
2. **`c2` - Cairn dismisses what it has already disproved.** A `not_met`
   against a row whose own `cairn-check` passed is dismissed by Cairn, on
   screen, naming that check and its result. The owner is never offered a
   confirm button for it.
3. **`c3` - repair cannot start without both a confirmation and its own
   approval.** No path reaches a second dispatch from a finding alone, from a
   confirmation alone, or from any critic output whatsoever.
4. **`c4` - the repair cannot widen the task.** The second dispatch carries the
   original accepted request and the original frozen rows; the correction is
   the critic's own observation and nothing else; and the brief file on disk is
   **byte-identical** before and after.
5. **`c5` - no nested run, and the original run stays authoritative.** The
   repair is a second invocation of the already-chosen adapter inside the same
   open runner. `runSerialTask` is not re-entered, the lock is never released,
   and the start snapshot still decides protected work.
6. **`c6` - one repair, and only one.** The second candidate offers no repair
   whatever the second critic says, and no press can produce a third dispatch.
7. **`c7` - everything is refreshed before the seal.** Worker claims, Git's
   changed-path list, protected-work verification, and **every** original
   verification-menu check run again after the repair. The owner's row
   judgments from the first pause do not carry over; every owner row is owed
   again.
8. **`c8` - five endings close honestly**, each through the ordinary route or
   its Core equivalent: a repair that works (`DONE`), a repair that breaks a
   check that had passed (`STOPPED`, `TASK_PROMISE_NOT_MET`), a repair whose
   worker fails outright (honest `STOPPED`, never `DONE`), a critic unavailable
   at the second pause, and the owner stopping at the second pause.
9. **`c9` - the envelope still owns terminal truth.** Nothing the critic said
   appears in the report or the result card as Cairn's own finding; the critic
   cannot write, run a command, add a blocking row, or declare a terminal
   state. Repair is disclosed in the record as what actually happened.
10. **`c10` - every Slice 1, 2 and 3 behaviour still holds**, including Task
    243's folds, the disabled Continue with its named owed row,
    `TASK_PROMISE_NOT_MET`, honest `STOPPED`, and the byte-identical close for
    a promise-free run. All 10 paper guards pass **unrelaxed**.
11. **`c11` - focused machine checks pass**, each named in the report with its
    exact command and its real result, against the baselines above.
12. **`c12` - the owner can read it.** Under the app token, an ordinary-route
    offscreen disposable-profile capture shows the allegation with its confirm
    and dismiss choices, and the post-repair candidate. The owner answers:
    "Can someone who knows nothing about this project tell what is being
    alleged, what confirming it will do, and that Cairn will only try once?"

## DONE and STOPPED

**DONE** means the outcome above holds through the ordinary Chat path against
the fixture conductor, `c12` carries the owner's own words, all 12 checks are
answered honestly in the report, and exact-path commits leave the main checkout
clean. **It does not mean gate 3 is closed.**

**STOP** if implementation requires releasing the original lock, restart
recovery, cross-process custody, native patching, a second writer, or a new
evidence language - and say which one.

The milestone does not move here. Slice 5 is what tests the milestone.
