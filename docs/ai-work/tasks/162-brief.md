# Task 162 brief — end the task-number collisions: one-command claim, the envelope's own record space, lane A in a worktree

**Lane:** A (main checkout)
**Base commit:** ac19576 (Task 161 brief claimed; Task 161 in flight in this
tree — its files are protected work here, untouched)

## Requested visible outcome

The owner, after a review of the lane evidence: "We're getting hit with a lot
of concurrent task issues when it comes to renaming tasks or concurrently
working on a project… Draft a proper brief for it all. Reins are yours."

Three visible changes, one honest result each:

1. **Claiming a task number becomes one command, not a ritual.** A lane runs
   one CLI command (`cairn claim`) and gets the lowest free number with a
   brief skeleton committed alone, atomically. The command sees what humans
   keep missing: another lane's *uncommitted* brief sitting in a sibling
   worktree. A companion `cairn renumber <old> <new>` performs the collision
   ritual mechanically — `git mv`, reference fixes, byte-exact verification of
   the other lane's restored brief — so a rename is one command with checks,
   not hand surgery.
2. **The envelope keeps its own records and never claims a task number.**
   Dispatched worker runs write to `docs/ai-work/runs/` (keyed by run, not by
   task number) and append to a separate union-merged `RUNS.md`. `LOG.md`
   becomes lane-only, so a lane can always commit its own row the moment its
   task ends — the "pending LOG pool" and the Task 149 precedent retire. The
   contract's own sentence "an automation claims no task number" becomes true
   instead of contradicted.
3. **Lane A works in a worktree like every other lane.** `.lanes/a` becomes
   lane A's home; the main checkout stays clean by construction, so "main
   must be between tasks to receive a landing" is finally enforceable and a
   landing commit can never again absorb another lane's uncommitted work.

Contract text changes (items 2 and 3 amend "Working in lanes") are the
owner's decision: the exact diff will be shown for approval before landing,
with version bumped (0.6.0 → 0.7.0), mirrors, MAINTAINERS.md, and
EVERYDAY-WORKFLOW.md updated in owner language, per the Task 140 pattern.

## Why — the demonstrated failures this closes

From the project's own records, seven renumbers and one overwrite in the last
~30 tasks: 138 (renumbered from 134 *after overwriting* another lane's
brief), 142 (from 139), 144 (140→144), 149 (from 148 — colliding with the
envelope's stopped run, not a lane), 153 (from 152), 156 (154→156, commit
9d19564), 158 (157→158, commit e0999ee). Plus: the 148/150 envelope claims
contradicting the contract clause; six-plus tasks leaving LOG.md uncommitted
"per the Task 149 precedent" until the owner closed the pool by hand
(c95ecbf); and two landing commits absorbing another lane's uncommitted work
(be248f6; Task 143's row). Root cause: the claim check is impossible to do
correctly by hand (uncommitted sibling-worktree briefs are invisible to git),
the envelope is an off-book lane, and lane A's dirty main checkout makes
"main is clean" never actually true.

## Boundary of intent — what must not change

- **Task 161's in-flight work is protected.** `core/src/files.ts`,
  `core/src/index.ts`, `core/src/steps.ts`, `core/src/convert.ts`, the
  uncommitted LOG.md row for 160, and `design/` stay exactly as they are.
  This task's brief is claimed and committed alone, by exact path, now;
  implementation that touches `core/src` begins only after 161 lands or
  stops (main between tasks, per contract). Docs-only preparation may
  proceed meanwhile.
- **History is never rewritten.** Every existing brief, report, LOG row, and
  commit stays byte-identical. The union merge attribute stays. Renumbering
  remains the correction mechanism for past collisions; nothing retroactive.
- **The workflow's spine is untouched:** one lane, one task, one honest
  result; claim-by-commit; serial landings with settle checks; the app
  token; every dispatch and every paid call still waits for its own owner
  approval; the envelope still writes the result card and the conductor
  still comments.
- **The envelope's behavior changes only in where its records live.** Same
  honesty, same STOPPED/DONE, same verification — new paths.
- **No new external dependencies.** The claim/renumber commands are local
  git-and-filesystem plumbing in the existing `cli/` package.
- **App runtime untouched** except the envelope's record-writing paths in
  `core/`; no UI work.
- **Deferred, explicitly out of scope:** per-task log fragments (the fourth
  option from the review). Item 2 is expected to settle the shared-file
  problem; fragments are reconsidered only if it demonstrably does not.

## Plan (AI decision)

- **`cli/`: `cairn claim`** — scans, in one shot: own `docs/ai-work/tasks/`,
  every `.lanes/*/docs/ai-work/tasks/` (uncommitted briefs included), and
  every branch's tree; computes the lowest free number; writes
  `NNN-brief.md` from a skeleton; commits it alone by exact path. Refuses
  with a named reason if the tree state is ambiguous. **`cairn renumber`** —
  `git mv` of brief/report, LOG-row and reference fixes, restores the other
  lane's brief byte-exact from its commit and verifies with `cmp`, then
  reports every file it touched.
- **`core/`: envelope record space** — dispatched runs write
  `docs/ai-work/runs/<utc-date>-<worker>-<seq>.md` and append one row to
  `docs/ai-work/runs/RUNS.md`; `.gitattributes` gains the union attribute for
  `RUNS.md`. Existing 148/150 records stay where they are as history.
- **Contract 0.7.0** — "Working in lanes" amended: every lane works in a
  worktree (lane A included, `.lanes/a`); the main checkout exists for
  landings and settle checks and stays clean; the automations clause
  rewritten to describe the runs/ record space truthfully. Mirrors,
  MAINTAINERS.md, EVERYDAY-WORKFLOW.md, and package versions updated; the
  exact contract diff shown to the owner before landing.
- **Regression pins:** unit tests for lowest-free-number across all three
  sources — including the demonstrated failure (uncommitted brief in a
  sibling worktree is seen and skipped); claim end-to-end in a fixture repo
  (two claims → distinct numbers, exact-path commits); renumber's byte-exact
  restore; an envelope fixture dispatch proving no `NNN-*` task files are
  created and `LOG.md` is untouched.

## Checks that will show the outcome holds

1. `cli` unit tests green, including the sibling-worktree and double-claim
   pins; `core` unit suite green including the envelope record-space pins.
2. Fixture proof: two concurrent claims cannot receive the same number, and
   a claim issued while a sibling worktree holds an uncommitted brief skips
   that number — output shown in the report.
3. Envelope fixture dispatch: records land under `docs/ai-work/runs/`, one
   `RUNS.md` row appears, no task-number files created, `LOG.md` untouched.
4. The contract diff (0.6.0 → 0.7.0) shown to and approved by the owner;
   mirror files byte-consistent after the version bump.
5. Settle check at landing: build and unit tests green in the main checkout,
   which by the new rules is clean of in-flight work.
6. Final `git status --porcelain` per commit: exact-path staging only; Task
   161's in-flight files and the pending LOG.md row untouched throughout.

## DONE and STOPPED

- **DONE**: checks 1–6 pass; claiming a number is one command that cannot
  miss a sibling lane's uncommitted brief; a dispatched run provably claims
  no task number and leaves `LOG.md` alone; the amended contract and its
  mirrors say the true thing about lanes and automations.
- **STOPPED**: any of the three outcomes can't hold without crossing a
  boundary above (e.g., touching 161's in-flight work or rewriting history);
  the report names what was tried, what landed (if anything), and the safe
  state left behind.
