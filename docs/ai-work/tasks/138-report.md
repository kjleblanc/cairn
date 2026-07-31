# Task 138 report: N-lane protocol design — from two lanes to however many

**Lane:** B (`.lanes/b`) · **Base synced from:** main @ f32edab

## What changed

- `docs/ai-work/tasks/138-brief.md` — brief, committed alone first (74e3886)
  to claim the number. This task began as a double-claimed 134; the original
  134 brief (shots page) was restored on main (f32edab) and this task
  renumbered, per protocol.
- `docs/superpowers/specs/2026-07-30-cairn-n-lane-protocol-design.md` — the
  spec: evidence from the two-week pilot, the six mechanisms re-examined at
  N lanes, three new rules (claim-time hardening, landing-queue etiquette,
  automations-are-not-lanes), the lane-is-a-conversation definition, and
  three open questions for the owner.
- This report and one log row.

## Checks run and their real results

- Spec exists at the brief's path and covers every required topic (claiming,
  worktrees, landing queue, app token, lane definition, automations).
- Collision claims verified against LOG.md: tasks 123/124, both 126/127
  pairs, and the 2026-07-30 134 double-claim all appear in the log/history.
- `git status` before commit: only the spec, brief, report, and LOG.md.

## How to try it

Read the spec; answer its three open questions (lane cap, where the
claim-hardening sentence lives, whether the mobile lane counts against the
cap). The contract changes only when you approve an amendment.

## Limitations / remaining human judgment

- The "three by default" cap is an attention judgment, not a measured limit;
  it is stated as such in the spec.
- Landing into `main` waits for lane A's in-flight work (task 136 era,
  uncommitted in the main checkout) to close, per the landing etiquette this
  very spec proposes.

**Disposition: DONE**
