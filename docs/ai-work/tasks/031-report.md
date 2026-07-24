# Task 031 — Report

What changed:

- New file `docs/superpowers/specs/2026-07-24-cairn-phase2-core-surgery-design.md`
  — the Phase 2 core-surgery design spec, produced in an owner-attended
  design session (2026-07-24). It records three owner decisions:
  sequencing debts → record authorship → adapter registry; the worker's
  claims travel as a fenced `cairn-claims` JSON block in its final
  message; adapters translate into one universal `worker-result/v1` shape
  validated centrally in core. It also records the session's scope
  corrections against the route spec: the six pre-reset
  record-verification burns were write-capability failures (Task 002's
  diagnosis), not format fumbles, so the record surgery's honest value is
  Phase 3/4 enablement plus deleting `readModelRecords`' eight-way
  conflation; and the operational debts are broader than the route spec's
  one line (no kill on app quit, a wedged worker blocks conductor chat via
  the shared gate, the run lock is in-process only, reattach needs the run
  to become main-process-owned state).
- New files `docs/ai-work/tasks/031-brief.md`, `docs/ai-work/tasks/031-report.md`,
  and one appended row in `docs/ai-work/LOG.md` — this task's own records.

Checks run and real results:

- Spec self-review (placeholders, internal consistency, scope, ambiguity):
  pass — no TBDs; chunk sections match the three recorded decisions; the
  two deliberately deferred numbers (claims field size caps, quit grace
  seconds) are named as implementation-plan detail, not left vague.
- `git status --porcelain` before staging: exactly the spec, this brief,
  this report, and the modified `LOG.md` — no other changes.
- `parseLog`-shape check by inspection: one new 8-column row for 031,
  outcome DONE, milestone NO.

How to try it: open
`docs/superpowers/specs/2026-07-24-cairn-phase2-core-surgery-design.md`
and read it top to bottom; the Decisions section is the short version.

Limitations and remaining human judgment:

- Design only — no behavior changed. The next step in the repo's rhythm is
  the Phase 2 implementation plan (spec → plan → serial recorded tasks).
- The Phase 1 closeout (push 029–031, run the conductor-v0 eval set,
  attempt the milestone) remains the owner's, is unblocked by this task,
  and is deliberately independent of Phase 2 work.
- The timeout defaults (10 minutes inactivity / 60 minutes absolute) were
  owner-approved at design level; real runs may teach better numbers.

Milestone movement: NO

Disposition: DONE
