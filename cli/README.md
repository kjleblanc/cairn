# cairn-cli (early alpha)

The Cairn workflow as a command line: one AI conductor per step, and the safety rules
enforced by code instead of prose.

The written protocol in the repository root remains the canonical specification — the
CLI is its reference runtime. What the docs *ask* an AI to do, the CLI *makes* it do:

- **Nothing is built without you.** Approval is a keypress here, recorded with a
  hash of the exact brief. If the brief changes by one byte afterward, the build
  refuses to start.
- **Every step is a fresh agent.** Definer, builder, and reviewer run in separate,
  clean sessions — the files carry the memory, exactly as the contract says.
- **Forbidden actions are blocked, not discouraged.** Pushing, installing,
  deploying, network access, and destructive commands are denied at the tool layer.
- **The reviewer can't peek.** The builder's report is physically locked until the
  reviewer states its own provisional verdict.
- **The Direction Gate is mechanical.** Two STOPPED tasks in a row, or two closed
  tasks without visible progress, and the CLI refuses to define another patch —
  it runs a direction check instead.

## Use

Requires Node 18+ and a Claude Code login (the CLI runs on the Claude Agent SDK and
uses your existing Claude authentication — no API key to manage).

```sh
cd cli && npm install && npm run build

node dist/src/index.js init     # in an empty project folder
node dist/src/index.js task     # one full gated loop
node dist/src/index.js status   # your cairn at a glance
```

`--mock` runs any command with an offline demo engine (no AI calls) — useful for
trying the flow and for tests: `node dist/src/index.js task --mock`.

## Development

`npm test` builds and runs the gate and file-layer tests. `assets/contract.md` is
synced from `../CONTRACT-TEMPLATE.md` at every build — never edit it directly.
