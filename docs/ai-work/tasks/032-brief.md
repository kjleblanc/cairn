# Task 032 — Brief

Requested visible outcome: the Phase 2 core-surgery implementation plan
exists at `docs/superpowers/plans/2026-07-24-cairn-phase2-core-surgery.md`,
turning the approved spec (Task 031) into eleven test-first serial tasks
with exact file paths, complete code for every step, and honest gates —
ready for execution through the repo's own recorded-task workflow.

Boundary of intent: documentation only. No code, test, contract, version,
or dependency changes. Existing records are append-only history and stay
untouched.

Checks that will show the outcome holds:

- The plan file exists at the named path, starts with the required
  agentic-worker header, and contains no placeholders (no TBD/TODO, no
  "similar to Task N", no code-free code steps).
- The plan was adversarially verified against the spec and the working
  tree (four independent reviewers: spec coverage, code accuracy, type
  consistency, green-commit sequencing) and every blocker and important
  finding is resolved in the committed text.
- `git status` shows exactly this task's files: the plan, this brief, the
  report, and the amended `LOG.md`.

DONE means the verified plan is committed in one exact-path commit with
honest records. STOPPED means it could not be committed cleanly; whatever
was written stays for inspection.
