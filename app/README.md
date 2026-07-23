# Cairn Desktop

The app and the contract share one version number, declared in
`app/package.json`; the newest entry in `../CHANGELOG.md` states it.

Cairn Desktop gives a beginner one understandable path:

```text
choose a project → enter a task → see the recommended route → run → check → result
```

## What the app does

- first-run instructions, new/open/recent project handling, and Project
  Conversion guidance;
- a model-route card, compact activity view, Git protection, and honest task
  history;
- readiness checks: whether the official Codex CLI is installed and connected,
  discarding every byte of command output and keeping only two booleans;
- one confirmed real Codex Exec call: the app shows OpenAI, pinned model
  `gpt-5.6-sol`, the exact project path, workspace data scope, and the
  one-process quota, and keeps **Start one real Codex Exec call** disabled
  until the owner checks that one-task confirmation;
- one ephemeral process per confirmed call, reduced to terminal and numeric
  usage evidence, with bounded numeric JSONL item counts shown when a stop
  needs diagnosis;
- record verification and, for a clean-start DONE, an exact-path commit staged
  and created by Cairn itself; and
- a child environment that keeps normal host and sandbox tools while excluding
  temporary parent-session command shims; file edits use Codex's built-in
  `apply_patch` tool.

## What the app never does

- open, perform, or inspect a provider login, or display or retain
  credentials, login output, raw model output, commands, paths, stdout,
  stderr, thread IDs, or account details;
- retry, resume, continue, schedule, or start another provider; and
- clean, reset, stash, overwrite, or broadly stage the owner's work.

## Offline demonstration

With repository dependencies already installed:

```powershell
$env:CAIRN_MOCK = "1"
npm.cmd --prefix app start
```

The demo route is labeled:

```text
Cairn offline demonstration
Provider: none
Model: none
```

It proves route → run → check → result and record protection. It does not
implement the arbitrary product request, call a model, use a credential, or
add a milestone stone.

## Windows installer

```powershell
npm.cmd --prefix app run make
```

The installer is written beneath `app/out/`. Local builds are not digitally
signed, so Windows may show an unknown-publisher or SmartScreen warning.

## Local verification

```text
npm run build --workspace core
npm.cmd --prefix app run typecheck
npm.cmd --prefix app run build:vite
cd app
npx --no-install playwright test
```
