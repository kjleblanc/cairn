# Cairn Desktop

Cairn Desktop gives a beginner one understandable path:

```text
choose a project → enter a task → see the recommended route → run → check → result
```

The app retains first-run instructions, new/open/recent project handling, Project
Conversion guidance, a model-route card, compact activity, Git protection, and
honest task history.

Normal mode currently has no connected model. It stops at a connection-required
screen and writes nothing. Provider setup is not hidden in this build.

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
experimental activation path. Earlier implementations remain in Git history and
task evidence.
