# cairn-cli

A maintainer and development front end over the same core the desktop app
uses; the desktop app is the surface for beginners. The app, CLI, and contract
share one version number; the newest entry in `../CHANGELOG.md` states it.

The CLI exposes one serial lifecycle:

```text
project → task → route → run → check → result
```

Commands:

```text
cairn init
cairn task
cairn status
cairn claim
cairn renumber
```

`cairn claim "title"` claims the lowest free task number in one atomic step:
it scans this worktree's task records, every `.lanes/*` worktree's records
(including briefs no lane has committed yet — the check humans kept missing),
and every local branch, then writes the brief skeleton and commits it alone
by exact path. It refuses, naming why, if unrelated staged work would prevent
the commit from being exactly one file.

`cairn renumber <from> <to>` performs the collision ritual mechanically:
`git mv` of the brief/report, title and LOG-row fixes for that task only, and
a free-number check on the target. It commits nothing; the lane inspects,
verifies any restored foreign brief byte-exact against its commit, and stages
by exact path.

Normal `cairn task` checks the official Codex CLI with `codex --version` and
`codex login status`. All command output is discarded; Cairn retains only installed
and connected booleans. If either check fails, it shows the exact non-secret
readiness state and writes no task records.

If both checks pass, the only normal model route is Codex Exec. Before it starts, the
CLI shows OpenAI, pinned model `gpt-5.6-sol`, the exact project, workspace data scope,
and the one-process quota. A default-no confirmation authorizes exactly one
ephemeral workspace-scoped process. Cairn retains the worker's final message (for
claims verification) plus bounded numeric evidence, authors the task records itself
from the worker's claims and its own Git verification, and creates the exact-path
commit itself for a clean-start DONE result. It never retries or continues the run.

Use the explicit offline demonstration with:

```text
cairn task --mock "Describe one visible outcome"
```

The offline adapter is deterministic and is not a model. It writes one short brief,
one report, and one append-only log row. The report states that the requested
product change was not attempted and milestone movement was NO.

## Development

With repository dependencies already installed:

```text
npm run build --workspace core
npm test --workspace cli
```

Builds clean `core/dist` and `cli/dist` first so deleted legacy modules cannot remain
in generated output. Tests inject fake readiness and execution processes; they do
not inspect a real login, use a credential, or call a model.
