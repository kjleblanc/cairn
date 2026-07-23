# Task 016 — conductor v0 design spec report

## What changed

- `docs/superpowers/specs/2026-07-23-cairn-conductor-v0-design.md` — new: the
  full Phase 1 design. Architecture (non-agentic conductor in Electron main,
  OpenAI-compatible slot, one streamed call per turn), connect flow with
  standing consent and safeStorage key handling, layout A chat screen, the
  deterministic briefing, the complete constitution draft (conductor-v1), the
  proposed-task card with concern gating, project-local conversation storage,
  the contract-amendment wording (lands last with the 0.1.0 bump), the
  eight-scenario evaluation set, failure/cost honesty, the test plan, v0
  exclusions, and a five-step implementation sketch.
- `docs/ai-work/tasks/016-brief.md`, this report, and one log row.

## Checks run

- Spec self-review: one real defect found and fixed inline (the constitution
  block nested a triple-backtick fence inside another; the outer fence is now
  four backticks). No placeholders; sections consistent; scoped to one
  implementation plan.

## How to try it

Read the spec — especially "The constitution" and "The evaluation set", the
two sections that define Cairn's character and how bodies get judged.

## Limitations

The design is recorded, not built. The owner reviews the spec next;
implementation follows the writing-plans step as serial recorded tasks.

Milestone movement: NO

Disposition: DONE
