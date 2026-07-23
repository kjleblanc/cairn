# Task 007 — Report

What changed:

- `core/src/serial.ts` — `verifyModelGitResult` no longer re-checks whole-tree
  cleanliness after committing. A confirmed exact-path commit (pre-commit
  staging validation + post-commit ancestry + single-commit count) is reported
  `created`/DONE. The removed `git status --porcelain` check could report a
  file dirty on a stat difference alone (identical content) and tore a correct
  DONE commit into STOPPED.
- `.gitattributes` (new) — normalizes text line endings so tracked files stop
  producing phantom stat-only modifications on Windows checkouts, the trigger
  of the Task 006 mislabel.
- `core/test/serial.test.ts` — red-first test "a confirmed exact-path commit
  stays DONE despite a phantom stat-dirty file" reproducing the Task 006 tear.
- Version 0.0.3 → 0.0.4: contract line, mirrors, package files, lockfiles,
  changelog.

Checks run and real results: the new test failed against the old code with
`'stopped' !== 'done'` (the exact tear), then passed. Core 49/49, cli 9/9, app
Playwright 13/13. Contract mirrors byte-identical (template ↔ core asset ↔
cairn.html embed), confirmed by the model-authored Task 006 mirror test.

Root cause confirmed: line 504 checked dirt with a content diff
(`git diff --name-only`, clean for the phantom), but the removed line 517
re-checked with a stat-based `git status --porcelain` (dirty for the phantom)
after the commit already existed, so the caller overwrote the committed DONE
records with STOPPED. The Task 006 milestone commit was always correct.

How to try it: a real run whose model commits verified work now reports DONE
even if an unrelated tracked file is stat-dirty; `.gitattributes` prevents the
phantom from arising in the first place.

Limitations or remaining human judgment: `.gitattributes` normalizes future
checkouts; existing local working copies may need one `git add --renormalize`
if they already hold CRLF (not required for correctness now that the
post-commit check is gone). Genuine stray files are still caught before the
commit is made, so removing the post-commit check does not weaken isolation.

Milestone movement: NO

Disposition: DONE
