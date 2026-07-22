# cairn-cli

Version 0.0.1, shared with the contract.

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

If both checks pass, the only normal model route is Codex Exec. Before it starts, the
CLI shows OpenAI, pinned model `gpt-5.6-sol`, the exact project, workspace data scope,
and the one-process quota. A default-no confirmation authorizes exactly one
ephemeral workspace-scoped process. Cairn retains only bounded JSONL terminal and
numeric usage evidence, verifies the model-authored task records, and creates the
exact-path commit itself for a clean-start DONE result. It never retries or continues
the run.

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
