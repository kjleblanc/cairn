# Task 033 — Add one stopped-before-call Codex Exec adapter

Date: 2026-07-21

## Visible outcome

In normal mode, Cairn detects whether the official `codex` CLI is installed and
whether `codex login status` succeeds, while retaining and displaying only two
booleans. When both checks pass, the serial router offers exactly one model route:
Codex Exec.

Starting that route prepares one ephemeral, workspace-scoped `codex exec` request
and then records an honest STOPPED result immediately before a real process or model
call. A fake process verifies the exact one-process request offline.

## May change

- one Codex Exec-specific core adapter module, the narrow adapter/result types, the
  serial coordinator's fixed boundary result, core exports, package description,
  and focused core tests;
- CLI task routing, status wording, help/readme text, and focused tests;
- Desktop task IPC, route/result wording, and focused Electron tests;
- current README, getting-ready guide, Desktop guide, and changelog wording; and
- this task's brief, report, and one append-only log row.

No dependency, lockfile, contract, project scaffold, historical task record, prior
log row, credential store, provider configuration, model setting, or generated
build output may change.

## Protected starting state

- Project root: `C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework`
- Branch: `main`
- Starting commit: `f8898e5b93e116ce8f936d2d3bb4979633819e6c`
- Relationship: 47 commits ahead of `origin/main`
- Tracked modifications: none
- Staged changes: none
- Untracked files: none
- Every existing path and every earlier task/log byte is protected except the exact
  areas named above.

## First useful checkpoint

Core tests use one injected fake process to prove all of the following without
starting the real Codex executable:

- install and connection probes expose no stdout, stderr, auth method, account
  detail, token, environment value, or credential path;
- the prepared call uses `codex exec`, `--ephemeral`, the exact workspace as both
  working directory and `--cd`, `workspace-write`, on-request approvals, JSONL, and
  disabled multi-agent support;
- the task prompt travels through stdin rather than the process list;
- exactly one execution process is requested, with no retry, resume, continuation,
  fallback, scheduler, or second adapter; and
- the production adapter throws the fixed real-call boundary before invoking any
  execution process.

## Checks

- Missing executable reports not installed and not connected.
- Installed plus failed login-status reports installed and not connected.
- Installed plus successful login-status reports installed and connected.
- Raw status-process output cannot enter the adapter status type, route text, task
  records, logs, renderer IPC, or error messages.
- Normal CLI and Desktop routing use only the Codex Exec adapter; explicit
  `--mock` / `CAIRN_MOCK=1` still selects only the offline demonstration.
- A connected normal route writes one brief, one STOPPED report, and one log row
  with `REAL_MODEL_CALL_NOT_AUTHORIZED`, without starting `codex exec`.
- Core, CLI, typecheck, production build, and focused Electron checks pass.
- Source and built-output audits find no credential reads, real model invocation in
  tests, dependency addition, provider fallback, retry, resume, continuation,
  scheduler, concurrency, or generic provider registry/framework.
- The final diff contains only this task and the named areas.

## Assumptions

- The official, documented non-secret readiness surface is `codex --version`
  followed serially by `codex login status`; exit success is enough, and all command
  output can be discarded.
- `codex exec --ephemeral` is the one intended non-interactive process. This task
  prepares its workspace and safety arguments but deliberately does not authorize
  or launch it against a real model.
- The owner continues to install and connect Codex personally through official
  controls. Cairn neither performs login nor reads credential files.
- The existing offline demonstration remains an explicit test/demo mode, not a
  model, retry, or provider fallback.

## DONE and STOPPED

DONE means Cairn can report credential-opaque Codex Exec readiness, route to that
one adapter when connected, prove the exact ephemeral workspace-scoped invocation
through one fake execution process, stop before every real model call, pass all
offline checks, and create one exact local commit.

STOPPED means any credential or raw auth detail could be exposed, a real Codex/model
process starts, the implementation needs another dependency/provider/process path,
protected work changes unexpectedly, checks cannot complete, or recovery becomes
unclear.
