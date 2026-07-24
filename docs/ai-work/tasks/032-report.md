# Task 032 — Report

What changed:

- New file `docs/superpowers/plans/2026-07-24-cairn-phase2-core-surgery.md`
  — the Phase 2 implementation plan: eleven test-first serial tasks
  implementing the Task 031 spec. Tasks 1–5 pay the operational debts
  (watchdog timers + tree-kill, cancel through the seam, cross-process
  lock at `<git-common-dir>/cairn-run.lock`, app cancel + quit
  protection, main-process run sessions with reattach). Tasks 6–9 move
  record authorship to Cairn (claims parser, final-message capture,
  record composition, and the inversion — which deliberately lands core
  and app changes in ONE commit so no intermediate commit leaves the
  Playwright suite red). Task 10 lands the universal worker-result
  contract with a synthetic-third-adapter readiness proof. Task 11
  closes at 0.2.0.
- New files `docs/ai-work/tasks/032-brief.md`,
  `docs/ai-work/tasks/032-report.md`, and one appended row in
  `docs/ai-work/LOG.md` — this task's own records.

Checks run and real results:

- Adversarial verification (this session, before commit): four
  independent reviewers checked the draft plan against the spec and the
  working tree at `e9812f0` — spec coverage, code accuracy (line
  numbers, signatures, quoted snippets), internal type consistency and
  placeholder scan, and per-task green-commit simulation. They returned
  5 blockers, 10 importants, and 8 minors; all were folded into the
  committed plan. The heaviest: `core/package.json`'s test script
  enumerates files (new suites must register or silently never run);
  the original Task 9/10 split left four Playwright tests red between
  commits (merged into one atomic task); the composed report layout
  stated fixed phrases ("byte-identical", "files changed: none") where
  the real verification result belongs, and put text after the
  disposition marker that `steps.ts`'s end-anchored parser cannot read
  (layout corrected, golden test added); two direct old-signature
  `taskRun` calls in `routing.spec.ts` would have broken typecheck
  (now updated in Task 5); an oversized final agent message would have
  silently kept a stale earlier message as "final" (overwrite-to-null
  rule pinned with a test).
- Placeholder scan of the committed plan: no TBD/TODO, every code step
  carries code, the two deliberate implementer freedoms (private helper
  names in serial.ts; the golden-report constant pasted from the first
  reviewed run) are named as such.
- `git status --porcelain` before staging: exactly the plan, this
  brief, this report, and the modified `LOG.md`.

How to try it: open
`docs/superpowers/plans/2026-07-24-cairn-phase2-core-surgery.md`; the
Global Constraints section and Task 1 show the shape of the whole.

Limitations and remaining human judgment:

- A plan is a prediction. Line numbers reference commit `e9812f0`; the
  first implementation task should confirm anchors before editing, and
  later tasks will shift them (the plan warns about this).
- The plan's per-task gates rely on the suites the repo has; the quit
  dialog (Task 4) has no automated test — the plan says to record that
  honestly rather than claim coverage.
- Execution has not started. Every task still lands through the repo's
  own workflow: red test first, brief/report/log row, one exact-path
  commit each.

Milestone movement: NO

Disposition: DONE
