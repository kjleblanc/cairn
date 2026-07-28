# Task 102 report — a two-lane working protocol for human-driven AI chats

## What actually changed

- `docs/superpowers/specs/2026-07-28-cairn-two-lane-protocol-design.md` —
  new. The design proposal, written to the existing spec naming
  convention and marked `Status: proposed — awaiting owner approval`.
  One numbered decision per observed gap: (1) task numbers are claimed
  by committing the brief, with cross-lane visibility through the shared
  `.git` refs and a double-claim backstop at merge; (2) one
  `.gitattributes` line, `docs/ai-work/LOG.md merge=union`, makes
  concurrent log appends auto-merge; (3) each lane gets its own git
  worktree and branch, eliminating mixed-tree verification by
  construction; (4) a serial merge ritual with a post-merge settle
  check keeps `main` always-good; (5) a machine-wide app token
  serializes the real app, all E2E, and the owner's own app use;
  (6) lane-DONE is today's DONE evaluated in the lane's solely-owned
  worktree, promoted onto `main` by the settle check.
- `docs/ai-work/tasks/102-brief.md`, this report, one LOG.md row.

Work done before this task, at the owner's direction in the same
request:

- Repaired the collision: `git checkout 7db6f97 -- docs/ai-work/tasks/099-brief.md`
  restored the overwritten brief byte-for-byte (verified: no diff
  against its commit).
- Assessed the unfinished single-instance-lock work. While this session
  was inspecting it, the parallel session completed and committed it as
  Task 101 (`ac2f3d2`, tree now clean). This session verified the commit
  contains exactly the brief, report, one LOG row, and the `main.ts`
  change those records describe, and that its stated open item
  (green-suite re-confirmation once the tree settles) is honestly
  disclosed in its report. Nothing further was recorded for 101; its
  open item stands as its own report left it.

## Checks run and their real results

1. **All six gaps addressed by name** — yes; one decision section each,
   numbered to match the brief's list. **Pass.**
2. **Mechanisms verified against the repository** — `CAIRN_TEST_USER_DATA`
   (`app/src/main/main.ts:16`), the conductor-connection fixture's
   detach/restore and the load-bearing `workers: 1`
   (`app/tests/fixtures/conductor-connection.ts`,
   `app/playwright.config.ts:14`), and the Task 101 single-instance lock
   (commit `ac2f3d2`) were read directly. Git worktree/shared-ref
   behavior and the built-in `union` merge driver are standard Git;
   the spec treats them as proposals to be exercised in the adoption
   tasks, not as verified-here behavior. **Pass, with that scope noted.**
3. **What stays serial, and trade-offs** — stated in their own sections:
   integration into `main`, the app/E2E token, the product runtime,
   contract changes, and the two-lane scope limit; each rejected
   alternative is named with its reason. **Pass.**
4. **Diff isolation** — `git status` before commit shows only this
   task's four paths plus the pre-existing untracked `design/` directory
   (the parallel session's garden mockups, not this task's; left
   untouched). **Pass.**

## How to try it

Read `docs/superpowers/specs/2026-07-28-cairn-two-lane-protocol-design.md`.
If the direction is right, the owner says `Change the project rules: …`
(or amends the spec first); adoption is then four small recorded tasks:
the `.gitattributes` line, the worktree creation and install, and the
`AGENTS.md` amendment. The spec's open questions (worktree location,
whether dev `npm start` runs take the app token, pilot week vs. direct
amendment) are the owner's calls.

## Limitations and remaining human judgment

- This task ran in the shared tree it proposes to retire — fittingly,
  it had to pause at the start to repair the parallel session's
  overwritten 099 brief, its fifth check-class incident this week.
- The `union` driver and worktree claims are standard Git but were not
  exercised here; the first adoption task should prove both with a
  throwaway test merge before the protocol is trusted.
- The spec is a proposal. Nothing in it governs any work until the
  owner amends the contract.

Disposition: DONE — the proposal exists at the conventional path, covers
all six gaps with mechanisms checked against the repository, states its
trade-offs and its serial core, and changes nothing else.
