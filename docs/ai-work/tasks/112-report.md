# Task 112 report — the Level 3a worker adapter implementation plan

## What actually changed

- `docs/superpowers/plans/2026-07-29-cairn-level3a-worker-adapter.md` —
  NEW. The implementation plan for the 3a half of the approved Level 3
  design: six serial checkbox-tracked tasks — (1) detection (installed /
  connected / billing via `source=oauth`), (2) the exec process (argv
  prompts with a 24,000-char guard, the spike-observed stream-json parser,
  codex-shape watchdogs and tree kill), (3) disclosure/authorization/
  adapter factory (billing-selected quota wording, the session-persistence
  data sentence, the shared `REAL_MODEL_CALL_NOT_AUTHORIZED` code,
  priority 90), (4) app wiring (generalized `detectedAdapters`, the
  fake-kimi PATH-shim fixture, the fail-closed test-lane guard), (5) the
  per-dispatch ask with Cairn's suggestion (Decision 6: optional
  `worker`/`workerWhy` task-block fields, chooser only when two or more
  candidates, suggestion dropped unless it names a connected candidate),
  and (6) the close (full suites, one changelog entry, 0.5.0).
- This report, `112-brief.md` (committed at task start to claim the
  number), and one LOG.md row.

The plan was written against the actual integration points, re-read today:
`core/src/routing.ts` (the seam), `core/src/codex.ts` (the adapter shape),
`app/src/main/tasks.ts` (the already adapter-general disclosure gate),
`app/src/main/conductor/taskblock.ts` (the strict-shape block parser),
`app/src/renderer/components/ModelRoute.tsx`, and
`app/tests/fixtures/fake-codex-env.ts` (the fixture idiom). Every Kimi CLI
fact it relies on comes from the spec's Task 106 spike amendment; the two
things the spike marked unobserved (print-mode tool-failure marking;
failure exit codes) are handled as conservative implementation choices
with the choice documented, not assumed facts.

## Checks run and their real results

- The plan names every file each task touches, in house checkbox style,
  with red-first tests and all global constraints (no suite may invoke the
  real CLI — load-bearing now that a signed-in one exists on this machine;
  wire-level pins; single-candidate byte-identity; Level 2 untouched)
  (brief check 1, 2).
- Number 112 claimed by committing the brief before writing the plan, per
  the two-lane protocol; the parallel lane's `111-brief.md` and `design/`
  untouched (check 3).
- No source, build, or suite was run — planning only.

## How to try it

Read the plan at
`docs/superpowers/plans/2026-07-29-cairn-level3a-worker-adapter.md`.
"Continue" starts its Task 1 (core detection, red first).

## Limitations and remaining human judgment

- The plan is unreviewed by a second reader; the Phase 4 experience says
  plans written against docs drift — this one is written against observed
  behavior, but the wire pins in Tasks 1–2 exist precisely to catch what
  the spike's one sample could not prove (universal permission coverage is
  a 3b concern; 3a's containment is the CLI's own static deny rules, named
  in the disclosure).
- Task 5 touches renderer dispatch code while the parallel lane's Task
  111 (renderer visual layer) may still be in flight; the plan instructs
  coordination rather than collision.
- The 0.5.0 bump at close follows the one-version rule; if the parallel
  lane ships a user-visible change first, the close task takes the next
  number instead.

Disposition: DONE
