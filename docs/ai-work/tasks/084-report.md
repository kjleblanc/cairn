# Task 084 — Report

## What actually changed

- `docs/superpowers/specs/2026-07-26-cairn-phase4-second-body-design.md` —
  the Phase 4 design: a `ConductorBody` seam mirroring Phase 2's worker
  surgery, a Claude Code body reached by detection, and the selection,
  consent, and contract work that closes the phase at 0.4.0.
- `docs/ai-work/tasks/084-brief.md`, this report, one LOG.md row.

## How the design was made, and what changed the plan

The route spec scoped Phase 4 as "second worker, second body." This session's
re-plan reshaped it around what the owner actually needs and what is actually
true:

- The bottleneck is the conductor, not the worker — Codex already runs on a
  subscription and works.
- The premise that motivated the phase was false. The owner believed a
  subscription body was a prerequisite for putting Opus 5 in the conductor's
  seat; OpenRouter carries `anthropic/claude-opus-5` at first-party pricing
  and the owner already holds a working OpenRouter key. Opus 5 is reachable
  today through the connect card's Custom field with no code. The phase is
  therefore an improvement, not an unblocking, and the Opus 5 evaluation can
  and should run before any of it is built.
- A policy question surfaced and was resolved into a design decision rather
  than an argument. The Agent SDK's documentation asks third-party products
  not to offer claude.ai login without prior approval. The owner's position —
  that Cairn is local, holds no credential, and drives a CLI the user
  independently installed — is defensible, and I recorded a correction to my
  own overstatement that the policy "precisely" prohibited it. The design
  lands on detection rather than a connect flow, which is both less code and
  further from the distinction the policy turns on, and the report notes the
  owner may still ask Anthropic before Phase 5 puts Cairn in front of other
  people.

## Checks run and their real results

1. The spec carries all three owner decisions and the four re-plan findings.
   ✓
2. Every factual claim was verified in-session rather than recalled:
   `client.ts:86`'s `Bearer` header, the `StreamEvent` union and
   `promptTooLarge` in `client.ts`, `vite.main.config.ts` externalizing only
   Electron and Node built-ins, `forge.config.ts:11-13`'s `asar: false`
   comment naming the agent SDK, the Agent SDK's `includePartialMessages` /
   `settingSources` / `maxTurns` / `systemPrompt` options, OpenRouter's
   `anthropic/claude-opus-5` id and pricing, and `claude auth status` on the
   locally installed Claude Code 2.1.202. ✓
3. Self-review found one asserted-but-unverified claim — the exact auth
   subcommand — which was checked against the local CLI and corrected in
   place before commit, with the verification noted in the spec. ✓
4. Log row appended; exact-path commit. ✓

## How to try it

Read the spec. Its riskiest line is the one about `settingSources`: left at
its default, the Agent SDK loads `.claude/` from the working directory and
`~/.claude/`, so the conductor would inherit the host machine's CLAUDE.md,
skills, commands, and MCP servers into every conversation. That is invisible
at runtime, which is why the spec asks for a test that pins it.

## Limitations and remaining human judgment

The spec awaits the owner's read before an implementation plan is written.
Two items are deliberately deferred with their reasons recorded: the Claude
worker adapter, and the question of whether to seek Anthropic's approval
before Phase 5. Ollama is recorded as needing no work at all, which is worth
re-checking against a real Ollama install before anyone relies on it.

Disposition: **DONE**
