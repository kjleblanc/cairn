# Task 044 — Nested Codex tool isolation report

## Result

Disposition: **DONE**

Cairn now resolves the installed Codex CLI from the parent environment, then starts
the one confirmed process with a copied environment that excludes only absolute
`PATH` entries beneath `.codex/tmp/arg0`. Ordinary command directories and
`.codex/.sandbox-bin` remain available. The task prompt also directs Codex to use
its built-in `apply_patch` tool instead of an inherited command with that name.

## What changed

- Added a private child-environment builder to `core/src/codex.ts`.
- Normalized slash direction and letter casing only for the narrow temporary-path
  comparison; the retained `PATH` values themselves are not rewritten.
- Passed the sanitized environment only to the confirmed Codex Exec child. Status
  detection and its output-free connection checks remain unchanged.
- Extended the real child-process harness so it exits with a failure unless the
  fake `.codex/tmp/arg0` entry is absent and both its resolved command directory and
  fake `.codex/.sandbox-bin` entry remain present.
- Updated current documentation and the changelog.

## Diagnosis and bounded evidence

Task 043 proved that the real route delivered its prompt: it observed five completed
agent messages and twelve completed command executions. It also observed two failed
command/file-change items and zero completed file changes, then stopped with
`MODEL_RECORDS_MISSING`.

The Cairn process used for that run inherited a temporary parent-session
`.codex/tmp/arg0/.../apply_patch.bat` entry. Because Cairn deliberately retains no
command text, paths, stdout, or stderr, the collision cannot be claimed as directly
observed provider output. It is the strongest narrow, testable explanation for the
bounded pattern. This repair removes that collision without widening the sandbox or
retaining raw output.

## Checks run

- `npm.cmd test --workspace @cairn/core` — passed: 42 tests.
- `npm.cmd test` — passed: 42 core tests and 9 CLI tests.
- `npm.cmd run typecheck` in `app` — passed.
- `npm.cmd run test:smoke` in `app` — first build attempt was blocked by the local
  filesystem sandbox before tests ran; the approved sandbox-aware rerun passed all
  12 Electron tests.
- `git diff --check` — passed.
- Dependency-file audit — no package or lockfile changed.
- Scope audit — no fallback, retry, continuation, scheduler, concurrency, generic
  provider framework, credential handling, sandbox widening, or raw provider output
  was added.
- Real Codex process/model call — not run.

## How to try it

Start a fresh Cairn Desktop process from this build, open the Cairn project, and use
the same exact-content smoke prompt. Review Cairn's provider/model/project/data/quota
disclosure before authorizing that separate real call. A successful run should show
at least one completed file change and should create the requested file plus the
matching task report and log row.

## Limitations and remaining judgment

Fake-process verification proves the environment boundary but cannot prove how the
real model will act. The owner must authorize and observe one new real task. Cairn
will continue to hide raw provider output, so any further failure will be diagnosed
only from bounded counters and retained workspace evidence.

Milestone movement: **NO**

Disposition: **DONE**
