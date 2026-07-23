# Task 006

## Result

The core test command now fails before its build-time contract sync whenever either contract mirror differs from `CONTRACT-TEMPLATE.md`, apart from CRLF/LF differences. The test checks `core/assets/contract.md` directly and extracts the `src-contract` script contents from `cairn.html`; a missing script block also fails.

## Files changed

- `core/test/contract-mirrors.test.mjs` adds the pre-build mirror regression test.
- `core/package.json` runs that test before the build can synchronize the core asset.
- `docs/ai-work/tasks/006-report.md` records this result.
- `docs/ai-work/LOG.md` receives the one Task 006 row.

The successful build also regenerated ignored `core/dist/` outputs and resynchronized ignored `core/assets/contract.md`; these produced no Git-visible task changes.

`core/test/files.test.ts` was temporarily patched while locating the check, then restored byte-for-byte. Its working-file hash and HEAD blob are both `b6416760d9489bdaf2face4442533bac92a3725f`, and `git diff` is empty. The read-only `.git` sandbox could not refresh its cached timestamp, so this run's status still displays a stat-only `M` for that path.

## Checks

- `npm test --workspace core` did not start because Windows PowerShell blocked `npm.ps1`; no project code ran.
- `npm.cmd test --workspace core` passed: the new pre-build mirror test passed, then all 47 existing core tests passed.
- The final diff and Git status were inspected. Task changes remain unstaged, the existing Task 006 brief remains intact, and no unrelated content change appeared.

## How to try it

Run `npm.cmd test --workspace core` from the repository root. With both mirrors current, the mirror test and the remaining core suite pass. A content change to either mirror causes the first test phase to fail before the asset synchronization step.

## Limitations

The failure paths were not exercised by altering the real mirrors because those files are project content. The assertions compare each normalized value directly, and the passing check confirms the current mirrors match.

Milestone movement: YES

Disposition: DONE
