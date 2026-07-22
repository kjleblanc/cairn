# Cairn Desktop

Cairn Desktop gives a beginner one understandable path:

```text
choose a project → enter a task → see the recommended route → run → check → result
```

The app retains first-run instructions, new/open/recent project handling, Project
Conversion guidance, a model-route card, compact activity, Git protection, and
honest task history.

Normal mode checks only whether the official Codex CLI is installed and connected,
discarding every byte of command output. A missing or disconnected CLI stops at the
connection-required screen and writes nothing.

When Codex is connected, the app recommends one Codex Exec route. It then displays
OpenAI, pinned model `gpt-5.6-sol`, the exact project path, workspace data scope, and
the one-process quota. **Start one real Codex Exec call** remains disabled until the
owner checks that one-task confirmation. Provider setup is never hidden or performed
by Cairn.

The confirmed path starts one ephemeral process, reduces JSONL to terminal and
numeric usage evidence, and verifies the model-authored report, append-only log row,
and protected starting work. Codex leaves changes unstaged; for a clean-start DONE,
Cairn stages the exact verified paths and creates the isolated commit itself. It adds
no fallback, retry, continuation, scheduler, concurrency, provider framework, or
dependency.

The child environment keeps normal host and sandbox tools but excludes temporary
parent-session `.codex/tmp/arg0` command shims. File-edit instructions name Codex's
built-in `apply_patch` tool instead of an inherited executable.

When model records are missing, Desktop may show numeric counts for completed Codex
agent-message, command-execution, file-change, and failed command/file-change JSONL
items. It never shows or retains those items' text, commands, paths, stdout, stderr,
thread IDs, account details, authentication data, or credentials.

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

It proves route → run → check → result and record protection. It does not implement
the arbitrary product request, call a model, use a credential, or add a milestone
stone.

## Local verification

```text
npm run build --workspace core
npm.cmd --prefix app run typecheck
npm.cmd --prefix app run build:vite
cd app
npx --no-install playwright test
```

The app has no active five-gate Standard workflow, provider SDK import, parallel
task deck, bounded-run screen, scheduler, passive proof, model-effort control, or
experimental activation path. It adds no provider fallback, retry, continuation,
generic provider framework, or dependency. Earlier implementations remain in Git
history and task evidence.
