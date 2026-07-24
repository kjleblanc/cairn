# Task 017 — conductor v0 implementation plan report

## What changed

- `docs/superpowers/plans/2026-07-23-cairn-conductor-v0.md` — new: ten
  test-first tasks mapping to repo Tasks 018–027. Pure conductor logic
  (task-block parser, constitution, briefing, streaming client, conversation
  store) lands first with node:test suites on a new app unit-test harness;
  Electron-bound code (keystore, consent gate, IPC) and the chat screen
  follow, gated behind CAIRN_CONDUCTOR=1; a fake OpenAI-compatible server
  proves the whole loop in Playwright; the final task lands the contract
  amendment, bumps to 0.1.0, and makes chat the home screen.
- `docs/ai-work/tasks/017-brief.md`, this report, and one log row.

## Checks run

- Plan self-review: spec coverage mapped task by task (recorded in the plan);
  placeholder scan clean except one deliberate, marked abbreviation (the
  constitution text lives verbatim in the spec, its single source of truth);
  type and function names cross-checked across tasks.

## How to try it

Read the plan top to bottom; each task is executable standalone by a worker
with no other context beyond the spec.

## Limitations

The plan is recorded, not executed. Repo Tasks 018–027 land next, one
recorded task per plan task. Running the evaluation set against real bodies
(paid) waits for the owner's explicit go after Task 027.

Milestone movement: NO

Disposition: DONE
