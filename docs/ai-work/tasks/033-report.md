# Task 033 report — Add one stopped-before-call Codex Exec adapter

Date: 2026-07-21

## Result

DONE. Cairn's normal serial path now contains one model adapter: Codex Exec. The
CLI and Desktop check `codex --version` and then `codex login status` serially,
discard stdout and stderr, and retain only `installed` and `connected` booleans.
They never read a credential file, retain an authentication method, open login, or
display raw command output.

When both checks succeed, routing recommends Codex Exec with provider OpenAI and
the model described only as the Codex-configured model. Starting the route prepares
one `codex exec` request with:

- the exact Cairn project as both process working directory and `--cd` workspace;
- `--ephemeral` session handling;
- `--sandbox workspace-write` and `--ask-for-approval on-request`;
- `--disable multi_agent` and `--json`; and
- the bounded task prompt on stdin rather than in the process arguments.

The production adapter then stops with `REAL_MODEL_CALL_NOT_AUTHORIZED` before
starting the execution process. It writes one brief, one STOPPED report, and one log
row that say the requested change was not attempted, no task data was sent to
OpenAI, and no model was called.

The explicit offline demonstration remains available only through `--mock` or
`CAIRN_MOCK=1`. It is not a provider fallback.

## What changed

- Added the Codex-specific readiness probe, prepared request, fixed real-call
  boundary, and fake-only execution seam in `core/src/codex.ts`.
- Extended the existing narrow adapter union and serial report path for Codex Exec;
  no generic provider registry or framework was added.
- Wired normal CLI and Desktop routing to the one Codex adapter, including honest
  not-installed, not-connected, connected, and stopped-before-call wording.
- Added core fake-process tests and an Electron fake executable whose `exec` marker
  proves the production path never launched it.
- Updated current guides, package description, and changelog.
- Added no dependency and changed no manifest dependency entry or lockfile.

The implementation follows the current official Codex command documentation for
`codex login status`, non-interactive `codex exec`, `--ephemeral`, workspace `--cd`,
sandbox/approval flags, JSONL, stdin prompting, and the `multi_agent` feature flag.
No real Codex login status was inspected during development or verification.

## Checks and real results

- `npm.cmd test --workspace core` — PASS: 33 tests, including three Codex-specific
  readiness/boundary/fake-process tests and the connected serial STOPPED record.
- `npm.cmd test --workspace cli` — PASS: 9 tests, including disconnected normal
  mode, the single connected Codex candidate, and explicit offline mock mode.
- `npm.cmd --prefix app run typecheck` — PASS.
- `npm.cmd --prefix app run build:vite` — PASS: current main, preload, and renderer
  bundles built. Vite printed only its existing CJS API deprecation warnings.
- `npm.cmd exec -- playwright test` from `app/` — PASS: 10 Electron tests. The
  connected fake-Codex path reached the route, wrote the fixed STOPPED record, and
  left the fake executable's `exec` marker absent.
- `git diff --check` — PASS.
- Dependency audit — PASS: no root, CLI, or app lockfile changed; no dependency
  manifest entry changed.
- Active source/current-bundle audit — PASS: status probes discard process output;
  no credential-file/API-key surface, provider fallback, resume, scheduler,
  continuation, provider registry, or concurrent call path was added. The production
  Desktop bundle prepares the request and immediately throws the fixed boundary;
  its tree-shaken adapter contains no fake execution branch.
- Historical-evidence audit — PASS: Tasks 000–032 and every existing log row were
  unchanged before this report and append.

## Repair evidence

One initial renderer typecheck failed because DONE results do not have a `reason`
field. The stopped-boundary check was narrowed correctly and typecheck passed.

The first production build was blocked by the filesystem sandbox while Vite resolved
its config. The identical build passed with the required local build permission.

The first focused Electron run found a Windows-only fake-fixture problem: the test
could not hard-link the installed Node executable into its temporary fake-command
directory. Copying it into that disposable directory fixed the permission issue.
The next run showed the preload-hook fake remained disconnected, so the harness was
simplified to project-local fake `login` and `exec` scripts. The same four focused
tests then passed, followed by all ten Electron tests. These repairs did not loosen
the product assertions or introduce a real Codex process.

## How to try it safely

With the repository's existing dependencies already installed, start Desktop:

```powershell
npm.cmd --prefix app start
```

Open a disposable Cairn project, choose **Start a task**, enter an outcome, and
choose **Find a route**. Cairn will report whether Codex Exec is not installed,
installed but not connected, or installed and connected. It displays no account or
authentication detail.

If Codex is connected, choose **Prepare Codex Exec run**. The safe expected result
is **Stopped before the real model call**, followed by a report containing
`REAL_MODEL_CALL_NOT_AUTHORIZED`. No real `codex exec` process should start.

The CLI exposes the same boundary through ordinary `cairn task`. The owner remains
responsible for installing and connecting Codex through official controls; do not
paste any credential into Cairn or chat.

## Limits and remaining human judgment

- Cairn still does not call a model, parse Codex JSONL, verify model-authored work,
  or complete an arbitrary requested change.
- Cairn does not inspect or select a model. It leaves that setting with Codex and
  reports it as `Codex configured model`.
- There is no provider fallback, retry, continuation, scheduler, concurrency path,
  login flow, cost estimate, generic provider framework, or new dependency.
- A future real call must separately identify the provider, model, data being sent,
  exact project, and cost/quota limit and receive owner approval at that concrete
  boundary. This task grants none of that authority.

Milestone movement: **NO** — the real-model self-improvement milestone remains
incomplete because no real model was called.

Disposition: **DONE**
