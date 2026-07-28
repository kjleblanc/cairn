# Task 105 report — design the Kimi Code CLI body and worker adapter (Level 3)

## What actually changed

- `docs/superpowers/specs/2026-07-28-cairn-kimi-cli-body-worker-design.md` —
  NEW. The Level 3 design from the Task 098 scoping conversation, proposed
  and awaiting owner approval. It splits the level into two independent
  halves: **3a, the Kimi worker adapter** — a second real occupant of the
  shipped Phase 2 `TaskAdapter` seam, spawning one ephemeral
  `kimi -p --output-format stream-json` process per confirmed task, shaped
  on `core/src/codex.ts` (output-free probes, re-derived authorization,
  watchdogs with tree kill, redacted debug copies, universal
  `worker-result/v1` translation) — and **3b, the Kimi Code CLI conductor
  body**, designed against the approved-but-unimplemented Phase 4
  `ConductorBody` interface over the CLI's ACP transport
  (`agent_message_chunk` streaming, `session/cancel`, fail-closed refusal of
  every reverse-RPC file request). Key decisions, each with its rejected
  alternatives recorded: detection stays output-free with "connected" read
  from ACP's `authRequired (-32000)` code rather than from
  `~/.kimi-code/` contents; the disclosure says the billing truth detection
  can actually know (the CLI may be on membership OAuth or a metered key,
  and Cairn cannot tell which); Codex stays the default worker with Kimi a
  lower-priority named candidate under the existing route override; and the
  body is gated on a spike finding a no-shell configuration, because Kimi's
  ACP layer runs shell commands locally without routing them through the
  client — if no configuration suppresses that, the level closes with only
  the worker adapter, as a designed outcome. A six-question owner-authorized
  spike (the CLI is not installed on this machine; installing it and the
  OAuth sign-in are the owner's actions) precedes any implementation task,
  per the Phase 4 third amendment's no-implementation-on-inference rule.
- `docs/ai-work/tasks/105-brief.md` — NEW, the task brief.
- This report, and one appended LOG.md row.

Facts in the spec were verified today against Kimi's own documentation
(Help Center install/quick-start and membership guides; Kimi Code Docs
`kimi` command reference, ACP capability matrix, and changelog through
0.24.2) and the MoonshotAI/kimi-cli issue tracker; machine state was
re-checked directly (`where kimi` finds nothing; `~/.kimi-code/` still
holds only the stray `bin/rg.exe`). Third-party claims were either
confirmed against official sources or deferred to the spike and marked as
such.

## Checks run and their real results

- Root `npm.cmd test` (core + cli): **pass** (exit 0; cli suite 9/9, core
  suite green earlier in the same run) — nothing it covers changed, run as
  the brief's proof that this design task broke nothing on the shared tree.
- Final `git status --porcelain`: only this task's three new files, the
  parallel session's still-untracked `103-brief.md`, and its pre-existing
  untracked `design/` directory. Neither parallel path was staged or
  touched. The parallel session's Task 104 (contract v0.4.0, two-lane
  adoption) landed as commit `103ad30` during this task; this task's files
  are disjoint from everything it changed.
- The spec names every unverified fact as a spike question rather than
  asserting it (brief check 1): stdin-prompt acceptance, stream-json
  schema/usage records, the auth probe's real behavior, credential/config
  separability, the no-shell configuration, and membership-vs-key
  distinguishability.

## How to try it

Read the spec:
`docs/superpowers/specs/2026-07-28-cairn-kimi-cli-body-worker-design.md`.
It ends with three open questions for the owner — approve the route,
authorize the spike's prerequisites (install + sign-in + bounded real-quota
calls), and confirm the routing default. "Proceed with implementation" (or
edits) is the next step; nothing runs until then.

## Limitations and remaining human judgment

- This is a design only: no code, no contract change, no commit to any
  behavior. Every implementation fact about the Kimi CLI is documented,
  not yet observed on this machine — the spike exists precisely for that.
- The body's shell hazard is real and unresolved by documentation; the
  design deliberately makes "worker adapter only" a possible honest close
  for the level rather than promising the body.
- The spec was written while the parallel session's Task 103 E2E
  re-verification is still in flight; no interference either way (this
  task ran no builds and no E2E).

Disposition: DONE
