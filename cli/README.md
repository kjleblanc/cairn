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

Normal `cairn task` has no connected model adapter yet. It shows
connection-required and writes no task records.

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
in generated output. No provider login or credential is used.
