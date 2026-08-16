# Task 252 brief - let the critic's findings survive the seal

**Lane:** A (the main checkout). **Base commit:** `dcd3a60`.

## The defect

Cairn asks a paid, separately approved critic to judge the frozen `cN` rows,
shows the owner its findings at the pause, and then **throws them away**.

Nothing durable records them. `core/src/records.ts` composes the sealed report
from sections for the request, the kept context, Cairn's verification, the
promises, the one approved repair, and the worker's account. **There is no
section for critic findings**, and the only symbol it imports from
`critique.js` is the repair-request type. Nothing about a critic is written
under `.cairn/` either. The findings live only in Main's checkpoint-keyed
sidecar (`app/src/main/critique.ts`), which is foreground-only by Slice 1's
design and dies with the pause.

So a run that spent real money on a second opinion seals into a report that
never mentions one was asked for. On 2026-08-16 that is exactly what Task 250's
records show.

Against the restoration plan's whole-plan DONE - "the Task Card, candidate,
critic, confirmation, optional one repair, checks, result card, and commentary
tell one consistent beginner-readable story" - the story survives only as its
first and last chapter.

## What is already there, and is not this task's to rebuild

- **The `cN` rows already survive.** `records.ts:769` renders
  `## Promises and how each was answered` from `input.promiseAnswers`, which
  `serial.ts:7626` fills. Task 250's report lacks the section because that run
  carried no rows, not because the rendering is missing. **Verify this and say
  so; do not rebuild it.**
- **Cairn's own check results already survive**, inside that same block.
- **The one approved repair already survives**, as `acceptedRepair` threaded
  into `cairnWorkerRecords` and rendered by `repairBlock` (`records.ts:646`).

**That last one is the shape to copy.** A finding already reaches the report
when it is confirmed and repaired; this task carries the rest of them.

## Requested visible outcome

When the owner approves a critic call, the sealed report records what the
critic was asked, what it answered for each frozen row, and in the critic's own
words - clearly attributed as an opinion Cairn did not verify, never as Cairn's
own finding. A run where nobody asked for a critic seals exactly as it does
today.

## Boundary of intent

- **The critic gains no authority.** Recording a finding must not let it block,
  change a disposition, alter a check result, or read as Cairn's verification.
  The section says who said it.
- **A run with no critic is byte-identical to today.** The existing golden
  report expectations must pass unmodified.
- **No new persistence subsystem.** The findings ride the existing
  pause-to-runner channel that `acceptedRepair` already uses. No journal, no
  sidecar file, no custody record, no `.cairn` writer.
- **No packet or provider change.** What is sent to the critic is untouched;
  only what Cairn keeps afterwards changes.
- No provider, model, credential, network call, dependency install, external
  write, push, or deployment. **This task makes no Cairn run and no paid call.**
- Not this task's: the nine Builder unit failures, `conductor.spec.ts:3314`,
  the full-suite worker-teardown EPERM, and the silent promise-free run.

## Checks

1. **`c1` - red first.** A test asserting the report carries a critic's
   findings fails before the change, with its real output recorded.
2. **`c2` - every finding is recorded with what it judged.** For each finding:
   the frozen row id, the judgment (`met` / `not_met` / `unclear`), and the
   critic's own observation, in its own words.
3. **`c3` - it reads as an opinion, not a verification.** The section states
   that these are the reviewer's claims and that Cairn did not verify them, in
   the same voice the report already uses for the worker's account. A reader
   cannot mistake a `not_met` finding for a failed Cairn check.
4. **`c4` - a run with no critic is unchanged.** Reports for runs that asked no
   critic render byte-identically to today; the existing expectations pass
   unmodified. Mutation-proved: emitting the section unconditionally must fail
   this check.
5. **`c5` - the findings reach the report through the live path**, threaded
   from the pause the way `acceptedRepair` already is - not by a test
   constructing the input directly.
6. **`c6` - nothing else regressed.** Core suite, root `typecheck` and `build`,
   and the app unit suite, each named with its exact command and real result
   against the baselines: Core 513 / 503 / 0 / 10, app unit 941 / 930 / 9 / 2.
7. **`c7` - the two already-working halves are verified, not assumed.** The
   report is shown to carry the `cN` rows and Cairn's own check results when a
   run has them, so this task's claim about what was already fine is checked
   rather than asserted.

## DONE and STOPPED

**DONE** means `c1`-`c7` pass with their real output recorded, and a report from
a run that asked a critic carries its findings attributed.

**STOPPED** means the findings cannot reach the report without a new
persistence subsystem, without giving the critic authority it must not have, or
without changing what a critic-free run seals - in which case say which, and
stop.

The milestone does not move here. This makes the next gate-3 run leave evidence
that outlives the window; it is not that run.
