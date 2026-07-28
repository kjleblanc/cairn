# Task 102 — a two-lane working protocol for human-driven AI chats

Requested outcome: a written design proposal, saved as a spec under
`docs/superpowers/specs/` following the existing naming convention, that
lets two human-driven AI chats work in this repository at the same time
without the six failures observed live this week. The owner approves or
amends the proposal before anything is implemented; this task writes the
proposal only. Owner direction 2026-07-28: "Plan a two-lane working
protocol … scoped as small as honestly solves the six gaps."

Why: on 2026-07-28 two parallel owner sessions collided repeatedly — a
task-number race (two chats drafted 099), a working-tree overwrite of the
committed `099-brief.md`, a contaminated verification (Task 100's checks
compiled a parallel chat's uncommitted work), and a two-instance app
incident that corrupted shared profile state (12:47). The owner wants
more than one task/chat at a time; the contract today assumes one serial
task and a resting tree.

Context on numbering: this task is 102. Task 099 (visual lab) and 100
(garden tokens) were committed by a parallel session; Task 101
(single-instance lock) was completed and committed by that same session
(`ac2f3d2`) while this session was starting — its records, log row, and
code were verified coherent as committed, so this session records nothing
further for 101. The working-tree overwrite of `099-brief.md` was
repaired by this session with `git checkout 7db6f97 --
docs/ai-work/tasks/099-brief.md` before any other work; the file is
byte-identical to its commit.

Boundary of intent:

- Files that may change: `docs/ai-work/tasks/102-brief.md`,
  `docs/ai-work/tasks/102-report.md`, one new spec file under
  `docs/superpowers/specs/`, and one appended row in `docs/ai-work/LOG.md`.
  Nothing else — no code, no test, no configuration, no `.gitattributes`.
- `AGENTS.md` is NOT changed. Adopting the protocol is a contract
  decision the owner makes separately (`Change the project rules:`).
- Product-runtime concurrency is out of scope: the envelope stays serial
  (`runRefusal(isTaskRunning…)`, no real run ids). The protocol governs
  human-driven chats only.
- Existing task records and log rows are history: none are rewritten.
- Prior art that must be read and honored: the bounded concurrent path
  built under legacy Contract v2.2 and removed at the 0.0.1 reset
  (`docs/legacy/CHANGELOG-pre-reset.md`), the concurrency warning in
  `docs/travelers/2026-07-24-claude-fable-5.md`, "Multi-agent concurrency
  is explicitly late" in `docs/ai-work/PROJECT.md`, and the owner-approved
  route spec `2026-07-23-cairn-conductor-route-design.md` (Phase 7
  excludes product concurrency; this proposal is not Phase 7).

Checks:

1. The spec addresses each of the six gaps by name: task-number
   allocation, LOG.md merge conflicts, the shared working tree, the
   serial merge ritual, app/E2E single-tenancy, and lane-DONE
   verification.
2. Every mechanism the spec relies on is real and named accurately:
   git worktrees and shared refs, the `merge=union` attribute,
   `CAIRN_TEST_USER_DATA`, the E2E fixture that detaches/restores the
   owner's real `conductor.json`, and the Task 101 single-instance lock.
3. The spec states plainly what stays serial, and why, and presents
   trade-offs for each rejected alternative.
4. Final diff and Git status contain only this task's four paths.

DONE means the spec exists at the conventional path, covers all six gaps
with mechanisms verified against the repository, and is honestly labeled
as a proposal awaiting owner approval.

STOPPED means a gap has no honest small solution, a relied-upon mechanism
turns out not to exist, or the diff cannot be isolated to this task's
paths.
