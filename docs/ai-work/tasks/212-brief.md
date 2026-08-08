# Task 212 brief — close the round-two findings against the owner-verdict work

**Lane:** G (worktree `.lanes/e`, branch `lane/g`).

**Base commit:** `9572220` — main after Task 211's brief was committed.

**Lane note.** Lane G reuses the idle `.lanes/e` worktree on a new branch off
main, the arrangement Task 197 used for Lane F. It was chosen because `lane/e`
was zero commits ahead of main, so nothing is at risk; the branch is preserved
at `2f71bc7` and one checkout restores it. No dependency install was needed —
the worktree already carried `node_modules` and `core/dist`, and its baseline
matches main exactly at core 222 / cli 24. **A separate session is working
Tasks 208–211 in the main checkout**, which is why this task is isolated
rather than landing there directly.

**Why this task exists.** A second adversarial pass over the shipped Task 205
work and the corrected owner-verdict spec raised 57 findings; 35 were refuted
and **22 survived — 2 CRITICAL, 7 MAJOR, 13 MINOR**. The two CRITICALs are the
same defect, and it is one this author introduced while claiming to fix a
different one.

## The CRITICAL, reproduced rather than argued

The spec asserts, as verified code behaviour, that "**any** new non-ignored
file anywhere in the tree — under `verdicts/` just as much as under `tasks/` —
breaks a run in flight". **That is false.** `changedTaskPaths`
(`core/src/serial.ts:758`) rejects only paths under `docs/ai-work/tasks/` that
the run does not own; every other changed path is **returned as a product
path**, and `expectedCommitSet` is derived from that same set, so
`commitExactPaths`'s equality check is satisfied rather than broken.

Moving the committed verdict copy out of `docs/ai-work/tasks/` — the Task 204
"fix" — therefore removed the only hard rejection and put nothing in its place.

Proven with a two-arm harness against the real built core, identical but for
the path the worker writes mid-run:

| Worker writes | Result |
|---|---|
| `docs/ai-work/verdicts/197.md` | **DONE** — file committed inside `Task 001: complete verified worker task` |
| `docs/ai-work/tasks/999-report.md` | **STOPPED / MODEL_RESULT_NOT_VERIFIED** |

A worker can plant a verdict file and Cairn commits it as verified work,
attributed to the worker. That is the forgery door Tasks 048 and 052 closed for
records, reopened for a record type that does not exist yet.

## Requested visible outcome

1. A worker that writes anywhere under `docs/ai-work/verdicts/` during a run is
   **stopped**, exactly as one writing under `docs/ai-work/tasks/` is — so the
   protection the spec describes actually exists before any verdict is written.
2. The spec says what the code does, with the false sentence removed and marked
   as a correction.
3. Cairn's own version invariant holds again: `MAINTAINERS.md:22-30` requires
   the contract and all three `package.json` files to move together with a
   changelog entry. Task 205 bumped the contract to v0.8.0 and moved none of
   them.
4. Cairn's own checkup stops reporting Doc drift on Cairn: `PROJECT.md` and
   `MAINTAINERS.md` no longer cite a superseded contract version.
5. `cairn.html`'s user-facing version line is guarded, so the page cannot
   advertise a version its own embedded contract contradicts.

## Boundary of intent — what must not change

- **The main checkout is not touched.** All work happens in `.lanes/e` on
  `lane/g`. Tasks 208–211 belong to another session.
- **`lane/e` and `lane/c` keep their commits.** No branch is deleted or reset.
- **No behaviour changes except the new rejection.** The guard rejects one new
  path prefix; every other run outcome is unchanged, proven by the existing
  suite.
- **Nothing is pushed. No paid call. No dependency installed.**
- **Prerequisite Q is not touched.** Owner-verdict Plan 2 remains blocked by
  Task 207 until Q1–Q10 are DONE; this task neither starts nor unblocks it.
- **Tasks 203, 204 and 205 records are not edited.** Corrections are additive.

## Checks that will show the outcome holds

1. **`c1`** — a regression test, red first, proves a worker writing
   `docs/ai-work/verdicts/<file>` mid-run is STOPPED with
   `MODEL_RESULT_NOT_VERIFIED` and HEAD unmoved, and its control arm proves an
   ordinary product file is still committed normally. The two-arm harness that
   found this becomes that test.
2. **`c2`** — the spec's false sentence is gone, replaced by what the code
   does, and marked as a correction; the `core/test/serial.test.ts:763` citation no
   longer carries a claim it does not support.
3. **`c3`** — `core`, `cli`, and `app` `package.json` all read 0.8.0, every
   lockfile agrees, and `CHANGELOG.md` carries a 0.8.0 entry.
4. **`c4`** — `PROJECT.md` and `MAINTAINERS.md` cite v0.8.0, and a real
   `runCheckup` run against this worktree reports no Doc drift row.
5. **`c5`** — a test fails when `cairn.html`'s eyebrow version and its embedded
   contract version disagree, proven by deliberate divergence and restored.
6. **`c6`** — `npm test --workspaces` passes in this worktree with both counts
   named against the `9572220` baseline of core 222 / cli 24, and the working
   tree holds only this task's own files.

## What DONE and STOPPED mean here

**DONE:** all six checks pass in `.lanes/e`, and the branch is ready to land
into `main` when the main checkout is quiet.

**STOPPED:** the guard cannot be added without changing an unrelated run
outcome, or the version bump turns out to require a release action that is the
owner's to take.

**Remaining human judgment.** Whether to land this branch into `main`, and when,
is the owner's call — the main checkout currently has another session mid-task.
Pushing remains the owner's throughout.
