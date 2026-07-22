# Task 037 report — Let Cairn commit verified Codex work

## Result

Cairn no longer asks non-interactive Codex Exec to stage or commit its work. The
model prompt now assigns Codex the workspace edits, checks, matching report, and
single append-only log row while explicitly leaving Git metadata to Cairn.

After a clean-start DONE result, Cairn now:

- verifies the completed process evidence, model-authored report and log row,
  protected starting paths, and unchanged starting HEAD;
- derives changed and untracked paths with NUL-delimited Git output;
- rejects absolute, outside-project, `.git`, and unrelated task-record paths;
- stages every derived path by exact name after `--`, verifies that the index has
  exactly those paths and no worktree remainder, and creates one local commit; and
- leaves retained evidence uncommitted when any check fails.

Dirty-start work stays byte-identical and is never included in a Cairn-created
commit. Desktop STOPPED results now say that verification failed and retained
evidence needs inspection. The real-route activity feed also renders a proper em
dash instead of the garbled `â€”` shown in the reported screen.

No dependency, lockfile, provider fallback, retry, continuation, scheduler,
concurrency path, generic provider framework, or real model call was added or run.

## Checks

- `npm.cmd test --workspace core` — PASS, 38 tests.
- `npm.cmd test --workspace cli` — PASS, 9 tests.
- `npm.cmd --prefix app run typecheck` — PASS.
- `npm.cmd --prefix app run test:smoke` — PASS, all 11 Electron tests on the final
  code, including the fake confirmed route, exact Cairn-created commit, honest
  malformed-output STOPPED screen, and corrected result punctuation.
- `git diff --check` — PASS before the final records were written; rerun in the
  final audit.
- Dependency and scope audit — no package manifest or lockfile changed.

A standalone sandboxed Vite rebuild initially stopped before compilation because
Windows denied the sandbox access to the repository path. The approved full
Electron smoke command rebuilt the same app outside that boundary and all 11 tests
passed. No product failure was hidden.

## How to try it

1. Fully close the currently running Cairn window so it cannot retain the earlier
   build in memory.
2. From this repository, run `npm.cmd --prefix app start` and open this Cairn
   project.
3. Enter one small, visible Cairn improvement. Review the displayed OpenAI model,
   selected project, data scope, and quota disclosure, then confirm the one call
   only if those exact terms are acceptable.
4. A successful clean-start task should end as DONE with one Cairn-created local
   commit. A failed verification should use the honest STOPPED wording and retain
   the evidence for inspection.

## Limitations and remaining judgment

This repair was verified only with deterministic fake processes. It deliberately
made no external or paid model call. The next real task is still required to prove
the current milestone end to end, and the owner must make the per-call disclosure
and cost/quota decision in Cairn before that process starts.

Milestone movement: **NO**

Disposition: **DONE**
