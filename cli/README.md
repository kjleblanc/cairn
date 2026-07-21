# cairn-cli (early alpha)

The CLI exposes one serial lifecycle:

```text
project → task → route → run → check → result
```

Commands:

```text
cairn init
cairn task
cairn status
```

Normal `cairn task` checks the official Codex CLI with `codex --version` and
`codex login status`. All command output is discarded; Cairn retains only installed
and connected booleans. If either check fails, it shows the exact non-secret
readiness state and writes no task records.

If both checks pass, the only normal model route is Codex Exec. Running it prepares
one ephemeral workspace-scoped request and records STOPPED with
`REAL_MODEL_CALL_NOT_AUTHORIZED` before starting the real process. No task data is
sent and no model is called in this build.

Use the explicit offline demonstration with:

```text
cairn task --mock "Describe one visible outcome"
```

The offline adapter is deterministic and is not a model. It writes one short brief,
one report, and one append-only log row. The report states that the requested
product change was not attempted and milestone movement was NO.

There are no active define/approve/build/review/decide commands, model-effort flags,
concurrent commands, scheduler commands, retries, or continuation paths.

## Development

With repository dependencies already installed:

```text
npm run build --workspace core
npm test --workspace cli
```

Builds clean `core/dist` and `cli/dist` first so deleted legacy modules cannot remain
in generated output. Tests inject fake readiness and execution processes; they do
not inspect a real login, use a credential, or call a model.
