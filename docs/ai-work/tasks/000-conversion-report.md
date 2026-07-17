# Task 000 — conversion report

## What changed

Six files were created, all under `docs/ai-work/` — nothing else in the repository
was touched:

- `tasks/000-conversion-brief.md` (the approved brief, SHA-256 starts `9F1B2FFB9BA6`)
- `CONTRACT-CANDIDATE.md` — Cairn Contract v1.2 with the project facts filled in
- `PROJECT.md`, `LOG.md`, `PILOT.md` — goal file and empty tables
- `tasks/000-conversion-report.md` (this file)

## What remains inactive

The candidate contract carries `STATUS: CANDIDATE — NOT ACTIVE`. The maintainer
`AGENTS.md` remains the repository's authoritative rulebook, in its original place
and byte-for-byte unchanged. The new workflow governs nothing until the owner's
separate activation commit performs the swap described in the brief's section 3.

## Protected paths, and how they were checked

`git status --porcelain` was clean before the audit and shows only the new
`docs/ai-work/` paths after installation. No tracked file was modified; the ignored
`cli/node_modules/`, `cli/dist/`, and `cli/assets/contract.md` remain untracked.

## Commands and results

- `git status --porcelain` — clean before; only `docs/` additions after.
- Candidate built from `CONTRACT-TEMPLATE.md` through the CLI's own `fillFacts`
  function, then verified line-by-line against the template: exactly five lines
  differ (STATUS, PROJECT NAME, WHAT WE ARE BUILDING, WHO WILL USE IT, CURRENT
  MILESTONE). The timebox line is identical to the template's default, as intended.
  An automated check initially reported failure because it expected six changed
  lines — the check's expectation was wrong, not the file; noted here for honesty.

## Known baseline failures

None. The CLI's build and 13 unit tests pass at commit `952ed4b`. Open bugs recorded
in the brief for the task backlog: the CLI's `isCairnProject()` false positive, no
revise-brief loop, no Tiny lane.

## Limitations and rollback

This conversion cannot itself prove the workflow fits this project — that is what
the five-task pilot is for. Rollback before activation: delete `docs/ai-work/` in a
normal commit; the maintainer `AGENTS.md` was never displaced. After activation:
a new commit reversing the section-3 swap. No history rewriting, ever.

Disposition: DONE
