# Task 237 brief - make the Task Card and its checks authoritative

**Lane:** A (the main checkout). **Base commit:** `edd7ff5`.

Slice 2 of `docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md`,
begun from `docs/ai-work/HANDOFF-gauntlet-slice2.md`. Task 236 is claimed by
another lane, so this task takes 237.

Three owner decisions were taken before this brief was claimed, and they shape
the work:

- **The first verification menu is fast Cairn commands plus owner observation.**
  Typecheck, the app build, and a focused unit subset. Core's full suite
  (~20 minutes) and the app's full unit suite (339.5 s, and red on `main`) stay
  out.
- **A slow check shows its elapsed time and is capped.** On the cap the row
  reports honestly as unfinished - never as passed, never as the worker's fault.
- **Slice 2 stays one task.** Its ~13 production files cross the plan's
  tripwire; the owner chose one task over a split because Owner gate 2 asks
  four questions at once and only the complete slice can answer them.

## Requested visible outcome

In ordinary Cairn Chat - no `CAIRN_TEST_Q9`, task-numbered marker, calibration
environment, lab page, or alternate product entrance:

**Before dispatch**, next to the existing Start-this-task panel, a compact
**Task Card** shows the accepted outcome as `c1` and every accepted blocking
requirement as a later `cN`, in order. Each row is marked either as a check
Cairn will run itself - chosen from a short menu of commands this project
actually supports - or as one the owner must look at. Nothing accepted is
hidden, shortened away, or silently turned into a preference.

**After the worker**, the same rows appear on the Unsealed candidate, each
answered by three visibly separate voices:

- what Cairn checked and what it found;
- what the worker claimed, attributed to the worker; and
- what still needs the owner's own eyes, still unanswered.

The terminal report and the result card carry the same rows. A row the owner
has not answered, or has answered as not met, cannot seal `DONE`.

## Design choice recorded before the work

Cairn already has a `cairn-serial-task/v4` Task-Spec route. This task does
**not** adopt it. It authors a smaller run-local representation beside it,
because v4 cannot carry this slice's promises:

- `composeSerialTaskSpecAuthority` rejects any evidence procedure that is not
  `adapter-command-attestation` (`core/src/serial.ts`), so an
  owner-observation row - which this slice requires - can never be minted into
  a v4 authority.
- Under v4 the contract's `envelopeChecks` are the legacy generic strings, so
  v4 supplies no owner-selected command execution either way.
- The v4 DONE path is gated on process-event custody and a `taskSpecRunRecord`,
  and Main's `QUALITY_PREVIEW_ACTIVE` is gated on the Q9 activation tuple.
  `grep taskSpecAuthority app/src/main/tasks.ts` returns nothing: the ordinary
  route has never reached v4.

Adopting v4 would therefore import exactly the custody and activation machinery
the plan excludes. The report restates this with exact line references.

## Boundary of intent

- Derive the rows from the already-accepted `TaskIntent`: `c1` is the outcome,
  later ids are the accepted blocking requirements in order. Never truncate,
  merge, or hide a requirement to keep the card small. If an accepted request
  cannot be shown clearly, return to conductor pushback for narrowing or show
  every row.
- Do not manufacture preferences. `owner-unsure` and `cairn-chosen` are not
  automatically advisory.
- Ids stay stable within the accepted run without hashes, live-object identity,
  or byte-identical projections.
- Carry every displayed blocking row into the existing worker contract and
  prompt. A worker answer is an attributed claim and is never an envelope check.
- The envelope runs only the owner-selected menu commands, itself, inside the
  still-open serial run, holding the original lock, snapshot, adapter, and abort
  signal. Commands the worker reports stay claims.
- The menu is a small fixed set of known Cairn commands, offered only when the
  project actually supports them, plus owner observation. If no configured check
  can test the outcome, say so and use owner observation or stop. Do not add a
  universal Evidence Plan, command-authority DSL, or arbitrary command
  execution.
- Owner-observation rows stay pending until the owner answers, can never be
  auto-passed, and block `DONE` while unanswered.
- Extend Slice 1's single `onUnsealedCandidate` pause and its display
  projection. Do not add a second pause, a new preload channel, or a candidate
  authority or custody protocol.
- Do not advertise critic or repair on the card. They are not live.
- Preserve worker authority, the worker prompt's existing content, routing,
  pre-work approval, cancellation, timeout and orphan handling, protected-Git
  checks, records, exact-path commit behavior, result cards, conductor
  commentary, provider connections, milestone logic, and every Slice 1 behavior
  including the pause, the two choices, honest `STOPPED`, and abrupt-loss
  silence.
- A run given no rows keeps the current terminal close byte-for-byte, the same
  way an absent `onUnsealedCandidate` does today.
- Limit acceptance to Chat. Manual Task Run parity is out of scope unless it
  falls out of a shared component for free.
- Do not add or activate critic execution, repair execution, a second worker
  invocation, Q9 lifecycle, candidate persistence, custody, activation,
  calibration, route fingerprints, restart recovery, Task 224-233 proposal
  machinery, new dependencies, sandbox campaigns, or broad cleanup.
- Make no real conductor, Builder, critic, repair, OpenRouter, or other external
  model call. Request, read, print, copy, move, and inspect no credential or
  connection storage. Install nothing.
- Local fakes may replace the conductor and coding worker only at their existing
  injectable seams - `app/tests/fixtures/fake-conductor.mjs` and
  `app/tests/fixtures/fake-codex-env.ts` at `CAIRN_MOCK=0`. The decisive UI
  checks must drive the same ordinary Chat IPC and renderer path as production.
- Hold the single-tenant app token for any app or Playwright run, released in a
  `finally`, and use only a task-owned disposable test project and the isolated
  offscreen E2E profile. Do not use the owner's real profile, and do not add a
  marker or route that makes E2E visible.
- Change no other lane's worktree, no DELVE path, no historical record, and no
  milestone fact. Make no push, publication, or deployment.
- The nine failing tests in `app/tests-unit/builderlivetransport.test.ts` and
  `app/tests-unit/buildertrackedtext.test.ts`, and the red `cli` typecheck from
  Task 211, are pre-existing on `main` and belong to other tasks. Do not chase
  them and do not count them as this task's regression.

## Checks

1. **`c1` - cancelling before dispatch makes zero worker calls.** With the Task
   Card shown, Cancel invokes no adapter and writes no task record.
2. **`c2` - approving invokes the existing worker exactly once.** One adapter
   invocation, through the unchanged dispatch path.
3. **`c3` - the worker receives every displayed blocking row and answers each
   one.** Every `cN` on the card reaches the worker contract and prompt, and the
   result answers each id as a claim attributed to the worker.
4. **`c4` - the envelope runs only the selected known checks, itself.** Cairn
   executes exactly the owner-selected menu commands inside the still-open run,
   and its findings are displayed as Cairn's rather than the worker's. An
   unselected command never runs.
5. **`c5` - nothing accepted is hidden and no preference is invented.** Every
   accepted blocking requirement appears as its own row, and no `owner-unsure`
   or `cairn-chosen` value is demoted to advisory.
6. **`c6` - an owner-observation row cannot be auto-passed.** A run whose owner
   row is unanswered, or answered as not met, cannot seal `DONE`.
7. **`c7` - one set of rows across all four surfaces.** The Task Card, the
   Unsealed candidate, the terminal report, and the result card carry the same
   semantic rows.
8. **`c8` - every Slice 1 behavior still holds.** The pause, Continue resuming
   the terminal close exactly once, controlled Stop, cancel, protected work
   byte-identical, and no forged `DONE`.
9. **`c9` - a slow check is visible and bounded.** A check that exceeds the cap
   reports honestly as unfinished, is never recorded as passed or blamed on the
   worker, and its elapsed time is visible while it runs.
10. **`c10` - focused machine checks pass.** Focused typecheck, build, Core and
    App behavior tests, and ordinary-route UI tests pass, each named with its
    exact command and its real result in the report.
11. **`c11` - the owner can read both surfaces.** Under the app token, an
    ordinary-route offscreen disposable-profile E2E captures the whole Task Card
    and the whole answered Unsealed candidate, and the owner answers one
    question about those screenshots: "Is it clear what counts as done, which
    evidence Cairn checked, which statements came from the worker, and what
    still needs your judgment?" Automated Playwright, not the owner, exercises
    the presses. Each screenshot must show the whole card, buttons included.

## DONE and STOPPED

**DONE** means the authoritative Task Card and its answered rows hold through
the ordinary Chat product path, all eleven checks pass with `c11` carrying the
owner's own answer, this brief's report and one LOG row close the task, and
exact-path commits leave the main checkout clean. A passing unit test or an
isolated component is not DONE.

**STOPPED** means the tree is not clean at the expected base or protected work
changes; a check would require arbitrary command authority rather than a small
known menu; an accepted request cannot be represented without hiding a
requirement; binding the card would require importing Q9 custody, activation, or
persistence; the work would need a provider call, credential, dependency, or
external action; or the same underlying blocker has already stopped this slice
twice.

The milestone does not move here. An authoritative Task Card does not by itself
prove the full request -> pushback -> dispatch -> verified DONE -> explanation
journey.
