# Task 262 brief — design Cairn's solution-frame gate

**Lane:** A (the main checkout), clean and between tasks. **Base commit:**
`41a2c2e`. **Contract:** Cairn Contract v0.8.0.

## The requested visible outcome

The repository contains one complete, approved design specification for a
small Cairn capability that prevents a conductor-created task from silently
preserving the current implementation frame. The specification makes the
frame check mandatory, explains when Cairn decides and when the owner decides,
defines the pre-dispatch review, and leaves implementation ready for a later
written plan.

## The boundary of intent — what must not change

- **No product implementation.** Nothing under `app/src/**`, `core/src/**`,
  `cli/**`, preload, IPC, package manifests, or lockfiles changes.
- **No test implementation.** Existing tests are evidence about the current
  seams; this task does not alter or add executable tests.
- **No contract or milestone change.** `AGENTS.md`, its mirrors, and
  `docs/ai-work/PROJECT.md` remain untouched.
- **No implementation plan yet.** The brainstorming workflow requires the
  owner to review the committed specification before planning begins.
- **No scope inflation.** Durable cross-task recurrence, semantic defect
  matching, mid-run representation stops, and manual/offline task entry remain
  follow-on work rather than being smuggled into this first slice.
- **Protected work stays protected.** Existing tracked, staged, modified, and
  untracked paths are not cleaned, reset, stashed, overwritten, or broadly
  staged.

## Checks

1. **`c1` — the approved design is complete.** The specification records the
   approved architecture, exact proposal shape, tripwires, owner experience,
   lifecycle, rollout boundary, and verification strategy.

2. **`c2` — current and proposed behavior are not confused.** The specification
   names the existing Cairn seams it relies on and labels every new type,
   control, state, and record as proposed rather than shipped.

3. **`c3` — the forcing function is mechanical and its limit is honest.** A
   task without a valid frame cannot become a TaskCard or fall back to the
   legacy proposal path, while the specification says plainly that structural
   validation cannot prove a model's causal reasoning is true.

4. **`c4` — decision authority and anti-thrashing rules are explicit.** Cairn
   keeps implementation-only decisions; owner-visible choices use the decision
   paper; unchanged request/frame resolutions are reused; existing risk and
   dispatch approvals remain separate.

5. **`c5` — the specification passes its self-review.** It contains no `TBD`,
   `TODO`, placeholder language, unresolved contradiction, or ambiguous
   implementation boundary, and it is focused enough for one implementation
   plan.

6. **`c6` — no product, test, contract, or milestone file changes.** Final Git
   inspection shows only the specification and this task's own records and log
   row changed after the brief-only claim commit.

7. **`c7` — records and Git protection.** This brief is committed alone to
   claim Task 262; the completion commit stages only exact task paths; one log
   row appears exactly once; nothing is cleaned, reset, stashed, broadly staged,
   or history-rewritten.

## What DONE and STOPPED mean here

**DONE** means `c1`–`c7` hold, the approved design is committed at
`docs/superpowers/specs/2026-08-17-cairn-solution-frame-gate-design.md`, and the
owner has a stable file to review before implementation planning.

**STOPPED** means the specification cannot state the approved design without
guessing, repository isolation becomes unclear, protected work changes, or a
product/contract change would be required to make the document truthful.
