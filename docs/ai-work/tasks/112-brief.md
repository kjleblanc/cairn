# Task 112 brief — the Level 3a worker adapter implementation plan

## Requested visible outcome

An implementation plan exists at
`docs/superpowers/plans/2026-07-29-cairn-level3a-worker-adapter.md` that turns
the approved Level 3 design
(`docs/superpowers/specs/2026-07-28-cairn-kimi-cli-body-worker-design.md`,
including the Decision 6 amendment and the Task 106 spike findings amendment)
into serial, checkbox-tracked implementation tasks for the **3a half only**:
the Kimi worker adapter — `core/src/kimi.ts` shaped on the Codex adapter,
output-free + `source=oauth` detection, app wiring in
`app/src/main/tasks.ts`, the per-dispatch ask with Cairn's suggestion
(Decision 6), fakes and the fail-closed guard, and the full test story. 3b
(the ACP body) is explicitly not planned here; it follows the Phase 4 seam.

## Boundary of intent — what must not change

- Planning only: no application, core, cli, or test source changes; no
  builds or suites run (nothing changes behavior they measure); no real or
  fake CLI invocations.
- Every plan task must be implementable against observed spike facts only
  (the spec's Task 106 amendment); anything marked unverified there stays
  out of scope or becomes a test-time pin, never an assumption.
- The parallel lane's in-flight work (`111-brief.md`, the untracked
  `design/`) is untouched. This lane is A (main checkout); number 112 is
  claimed by committing this brief.
- Existing records and log rows are history: unchanged. Files created: the
  plan, this brief, `112-report.md`, one LOG.md row.

## Checks that will show the outcome holds

1. The plan names every file each task touches, in the repo's checkbox
   style, with red-first tests and the global constraints (no suite may
   invoke the real Kimi CLI; fail-closed guard keyed on a positive test
   marker; argv-only prompts with a length guard; session-persistence
   named in the disclosure's data sentence; billing truth from
   `source=oauth`).
2. The plan keeps single-candidate behavior byte-identical (Decision 6's
   fallback) and keeps Level 2 and the OpenRouter path untouched.
3. Final Git status contains only this task's named paths.

## What DONE and STOPPED mean here

- DONE: the plan is written, internally consistent with the spec's observed
  facts, and the checks pass.
- STOPPED: the plan cannot be made consistent with observed facts without
  new unknowns — in which case the unknowns are reported and the owner
  decides whether a second spike is needed.
