# Task 035 brief — Replace README with routing-test text

Date: 2026-07-21

## Requested visible outcome

`README.md` contains the heading `# Routing test` followed by one sentence stating
that this project verifies Cairn’s Codex Exec route.

## Files or areas that may change

- `README.md`
- `docs/ai-work/tasks/035-brief.md`
- `docs/ai-work/tasks/035-report.md`
- one append-only row in `docs/ai-work/LOG.md`

## Protected starting work

- Project root: `C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework`
- Starting branch: `main`, 49 commits ahead of `origin/main`
- Starting working tree and index: clean
- Existing tracked `README.md`: 5,371 bytes of Cairn project documentation
- Tasks 000–034 and all existing log rows are append-only history

## First useful checkpoint

The owner explicitly confirms replacing the existing tracked README after seeing
the exact target, effect, and recovery plan.

## Checks

- `README.md` has exactly one level-one heading and the requested sentence.
- The actual diff contains only the bounded task paths.
- `git diff --check` passes.

## Important assumptions

- “Create README.md” means replace the existing README rather than preserve its
  current documentation.
- The existing content can be recovered from the current Git commit.

## DONE and STOPPED

DONE means the owner confirms the overwrite, the README has the requested two-line
content, checks pass, the report and log are truthful, and an isolated local commit
is created.

STOPPED means the owner does not confirm replacing the existing README, protected
work changes unexpectedly, or the bounded result cannot be completed safely.
