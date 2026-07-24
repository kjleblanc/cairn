# Task 020 — Briefing assembly

## Visible outcome

The conductor can assemble a deterministic project briefing from facts, logs, recent task records, git history, and a capped file tree — all the context a thinking partner needs to understand a project's state without reading files.

## Boundary of intent

- Create `app/src/main/conductor/context.ts` with `assembleBriefing(root: string, caps?: BriefingCaps): string`
- Tests prove the briefing captures facts, logs, task records, git info, and file tree
- Tree respects `maxDepth`, `maxTreeEntries`; records respect `maxRecordChars`
- Deterministic for an unchanged project (same input → same output)
- Skips `node_modules`, `dist`, `dist-unit`, `out`, `.cairn` and dotfiles

## Checks

- 3 new unit tests all pass (facts, logs, records, git, tree present; caps respected; deterministic)
- All 28 unit tests pass (25 existing + 3 new)
- `npm run typecheck` clean
- No external dependencies added

## DONE meaning

All tests pass, typecheck clean, briefing is feature-complete and deterministic.

## STOPPED meaning

Tests fail or typecheck breaks; briefing is incomplete or non-deterministic.
