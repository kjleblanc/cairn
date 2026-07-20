# Task 025 report — repair the Contract v2.x regression fixture

Date: 2026-07-20

## Result

The stale Contract v2.0-only test fixture now recognizes the current Contract v2.2
heading (and later v2 minor headings) before replacing it with `Contract v1.9`.
The refusal assertion remains unchanged, and the complete core suite now passes
100/100.

Task 024 remains immutable STOPPED evidence. This task did not review, accept,
activate, or perform a live run of its bounded-concurrency candidate.

## Files changed

- `core/test/steps.test.ts`
- `docs/ai-work/tasks/025-brief.md`
- `docs/ai-work/tasks/025-report.md`
- `docs/ai-work/LOG.md`

## Commands and real results

- `npm.cmd run build --workspace core` — PASS.
- `node --test core/dist/test/steps.test.js` — PASS, 18/18 tests.
- First `npm.cmd test --workspace core` launch with a one-second command-runner
  timeout — INCONCLUSIVE; the runner terminated it before tests executed.
- `npm.cmd test --workspace core` with a sufficient timeout — PASS, 100/100 tests,
  0 failures, in about 155 seconds.
- `git diff --check` — PASS.
- Exact-path status audit — PASS; only the four paths declared in the brief changed.
- Task 024 immutability audit — PASS; its brief and report have no diff from the
  protected starting commit.
- Coordinator cleanup audit — PASS; one `main` worktree, no `cairn/task-*` branch,
  and no `.git/cairn` state were present before the exact-name task commit.

The suite emitted expected fixture-level Git warnings and one intentional
`fatal: not a git repository` line from an existing negative test; the test process
exited 0.

## What changed and why it is decisive

The fixture matcher changed from the obsolete literal `/Contract v2\.0/` to
`/Contract v2(?:\.\d+)?/`. That matches `Contract v2.2`, replaces it with v1.9,
and lets the unchanged `SERIAL_V2_CONTRACT_REQUIRED` expectation exercise the
real product guard. No runtime code or assertion was changed.

## How the owner can see the result

From the repository root, run:

```powershell
npm.cmd test --workspace core
```

Success is a final summary of `tests 100`, `pass 100`, and `fail 0`. This is an
offline regression check; it does not put bounded concurrency online.

## Limitations and human check

- This proves only the corrected local fixture and the unchanged offline core suite.
- It does not turn Task 024 into a completed, accepted, or activated Final.
- No provider call, credential, network access, spending, live proof, deployment,
  or valuable-repository execution occurred.
- A new pinned High-Stakes Final, fresh-context review, owner acceptance, required
  qualified-human check, and separate activation/live-action approvals remain
  necessary before anything can go online.

Milestone movement: NO

Disposition: DONE
