# Task 044 brief — Isolate nested Codex Exec from parent tool shims

Date: 2026-07-22

## Requested visible outcome

One confirmed Codex Exec process receives the normal host tool environment but does
not inherit temporary `~/.codex/tmp/arg0` command shims from the parent Codex
session. The task prompt explicitly directs Codex to use its built-in `apply_patch`
tool for edits. No sandbox permission is widened and no real model call is made.

## Files or areas that may change

- `core/src/codex.ts`
- focused fake-process checks in `core/test/codex.test.ts`
- current README/changelog wording if needed for accurate behavior documentation
- this Task 044 report and one append-only `docs/ai-work/LOG.md` row

No dependency entry or lockfile may change. No provider fallback, retry,
continuation, scheduler, concurrency, or generic provider framework may be added.

## Protected starting work

- Project root: `C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework`
- Starting branch: `main`, nine commits ahead of `origin/main`
- Starting HEAD: `c95298c` (`Task 043: retain failed edit-command evidence`)
- Starting working tree and index: clean
- Tasks 000–043 and all existing log rows are append-only history

## First useful checkpoint

A fake Codex executable starts successfully when its parent `PATH` contains both a
temporary `.codex/tmp/arg0` entry and ordinary tool directories. Inside that fake
child, the temporary entry is absent while the ordinary directories remain.

## Checks

- Resolve the installed Codex command before preparing the child environment.
- Remove only absolute `PATH` entries beneath `.codex/tmp/arg0`, independent of
  Windows path separators and environment-key casing.
- Retain the command directory, `.codex/.sandbox-bin`, and every other normal path.
- Keep the readiness/status probe and credential-opaque result contract unchanged.
- Ensure the task prompt names Codex's built-in `apply_patch` tool without exposing
  or invoking a parent executable.
- Core, CLI, Desktop typecheck, and Electron smoke checks pass.
- `git diff --check` and dependency/scope audits pass.
- No real Codex process or model call runs.

## Important assumptions

- Task 043's bounded evidence—12 completed command executions, two failed
  command/file-change items, and zero file changes—proves prompt delivery but does
  not reveal the failed commands.
- The parent Cairn process was launched from a Codex session whose `PATH` contains a
  temporary `~/.codex/tmp/arg0/.../apply_patch.bat`. Treating that inherited shim as
  the likely collision is a narrow, testable diagnosis rather than a claim about
  hidden provider output.
- Official Codex documentation describes `apply_patch` as a built-in tool and says
  `workspace-write` with `on-request` permits normal workspace edits, so the repair
  does not justify disabling or widening the sandbox.

## DONE and STOPPED

DONE means a fake child proves only temporary parent tool shims are removed, normal
tools remain available, the built-in patch instruction is present, all fake-only
checks pass, and the result is committed by exact path.

STOPPED means the repair would require raw provider output, another model call,
credential inspection, broader sandbox authority, dependency changes, or removal of
ordinary host tool paths.
