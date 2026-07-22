# Task 034 report — Enable one confirmed real Codex Exec call

Date: 2026-07-21

## Result

DONE. Cairn can now start exactly one real Codex Exec task after the owner confirms
the complete boundary shown immediately before the call: provider OpenAI, model
`gpt-5.6-sol`, exact target project, exact task instructions, readable data scope,
and the one-process quota. The confirmation is bound to those exact values in the
trusted CLI or Desktop main process; missing, stale, or changed-task confirmation is
rejected before Cairn creates task records or crosses the process seam.

The production request is ephemeral, workspace-scoped, uses `workspace-write`,
keeps approvals at `on-request`, disables `multi_agent`, ignores user configuration,
requests JSONL, and sends the task prompt on stdin. There is no retry, continuation,
scheduler, delegation, concurrency, provider fallback, or generic provider layer.

Cairn retains only the exit code, terminal event, and numeric token counts. Stderr
is drained and discarded. Malformed or oversized stdout fails closed, and raw
provider output is not copied into the result, report, or log.

## What changed

- Activated the existing Codex-specific adapter only when a canonical one-call
  authorization matches the exact workspace and requested outcome.
- Pinned the route to OpenAI `gpt-5.6-sol` and added one fixed disclosure describing
  project data exposure and connected-account quota/cost limits.
- Added one system process runner and one fake-process seam. Windows resolves the
  Codex CLI to an absolute executable or official command shim from `PATH`, skips
  the selected workspace, and therefore does not run a project-local `codex` file.
- Added bounded JSONL parsing that recognizes `turn.completed`, `turn.failed`, and
  `error`, caps retained stdout buffering, discards stderr, and never exposes raw
  process text through Cairn's result object.
- Extended the serial coordinator to verify the one-process evidence, matching task
  number, one report disposition, one milestone value, one matching append-only log
  row, protected starting paths, and the Git result. A clean-start DONE requires one
  descendant commit and a clean tree.
- Added the exact default-off confirmation screen to Desktop and the equivalent
  default-no prompt to the CLI. Desktop revalidates the displayed disclosure in its
  main process before constructing the authorized adapter.
- Added unit and Electron fake-process coverage for success, missing confirmation,
  changed task instructions, malformed JSONL, raw-output redaction, protected work,
  and a workspace-local CLI shadow.
- Updated current guides, package description, and changelog.
- Added no dependency and changed no dependency entry or lockfile.

## Checks and real results

- `npm.cmd test --workspace core` — PASS: 36 tests. This includes the authorized
  one-process fake, strict result/Git verification, credential-opaque readiness,
  the default stopped-before-call boundary, and workspace-local command rejection.
- `npm.cmd test --workspace cli` — PASS: 9 tests.
- `npm.cmd --prefix app run typecheck` — PASS.
- `npm.cmd --prefix app run test:smoke` — PASS: production main, preload, and
  renderer bundles built; all 11 Electron tests passed. The suite used only fake
  Codex command shims and did not contact a model.
- Focused Electron repair run — PASS: both the confirmed success case and malformed
  JSONL fail-closed case passed before the final full suite.
- Installed CLI help-only validation — PASS: the final global flag placement and
  `exec --ephemeral --model gpt-5.6-sol --cd <project> --sandbox workspace-write
  --disable multi_agent --ignore-user-config --json` shape exited 0 with `--help`.
  This did not start Codex Exec or call a model.
- `git diff --check` — PASS.
- Dependency audit — PASS: no lockfile and no dependency entry changed;
  `core/package.json` changes only its description.
- Scope audit — PASS: active code contains no provider fallback, retry,
  continuation, scheduler, concurrency, generic provider framework, credential
  inspection, login UI, or second model route.
- Real-call audit — PASS: no real Codex Exec process or model call ran during
  implementation or verification.

Vite printed only its existing CommonJS Node API deprecation warning. Core tests
also printed existing sandbox-related Git global-ignore and line-ending warnings;
all assertions passed.

## Repair evidence

The first renderer build attempted to import a Node-dependent disclosure helper
into browser code. The disclosure was moved to the trusted Desktop main process and
returned over IPC; typecheck and production builds then passed.

The first CLI and core checks were accidentally started together while the core
build was replacing its `dist` folder. They were rerun serially and passed.

The initial Electron success fixture made its project-local fake scripts appear as
dirty work, so Cairn correctly refused to accept the model commit. The fixture was
changed to a disposable external fake command shim. Correcting the official CLI
flag order then exposed that the old renamed-Node fake depended on `exec` being the
first argument; the dispatcher fake now parses the real argument order.

The full Electron suite subsequently revealed that Windows command lookup could
consider a project-local `codex.cmd`. The production resolver now chooses an
absolute Codex path outside the workspace, and a new regression test proves the
workspace-local shadow is ignored. The final core, CLI, typecheck, build, and full
Electron checks all passed after these repairs.

## How to try it

With the repository's existing dependencies already installed, fully restart the
Desktop app:

```powershell
npm.cmd --prefix app start
```

Open a Cairn project and choose **Start a task**. Enter one bounded outcome and
choose **Find a route**. If Codex is installed and connected, Cairn shows a
confirmation card. Read every displayed value carefully, especially the exact
project, task, readable-data scope, and quota. The start button remains disabled
until **I confirm this one real Codex Exec call** is checked.

Checking that box and choosing **Start one real Codex Exec call** is now the actual
risk boundary: it starts one Codex process, sends the task instructions to OpenAI,
allows Codex to read and edit the selected workspace under `workspace-write`, and
uses the connected account's credits or quota. Cairn will not retry or choose
another provider.

The CLI exposes the same boundary through `cairn task` and defaults its confirmation
to no.

## Limits and remaining human judgment

- This task enabled and fake-verified the live route but did not execute it. The
  first real Cairn self-improvement task remains a separate owner-confirmed action.
- Cairn cannot inspect whether the connected Codex account is subscription-backed,
  credit-backed, or API-billed, so it cannot promise a dollar cap. It enforces only
  the exact one-process, one-task quota shown in the confirmation.
- The model may read any file inside the selected project that it chooses while
  completing the task. Secrets and valuable or regulated data do not belong in the
  selected workspace for an ordinary trial.
- A process failure, malformed evidence, model STOPPED report, record mismatch,
  protected-work change, or unverifiable Git state stops the run without retry.
  Model-authored evidence may remain in the workspace for inspection.
- Provider login and credentials remain exclusively in official Codex controls;
  Cairn does not open login, inspect credential files, or display authentication
  details.

Milestone movement: **NO** — the requested live capability landed, but the project
milestone requires a real model task to improve Cairn end to end, and no real model
was called in Task 034.

Disposition: **DONE**
