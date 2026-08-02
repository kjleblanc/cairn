# Task 163 — one confirmed real Codex Exec task

Requested outcome: The model picker lists Anthropic's Claude models as selectable entries, each with its real model id and a plain per-use billing line re-verified against OpenRouter's keyless catalog, and the consent screen is unchanged.

Supported outcome: Run one explicitly confirmed worker task through the connected adapter and verify its result and Git state.

Lane: **Standard** — one explicitly confirmed OpenAI Codex Exec call; the model may make in-scope local workspace changes.

## Details (verbatim)

> Owner's request: "Let's get Anthropic's models enabled for the model selections, as well as being able to just link existing subs like for chat gpt." This task covers the picker entries only; subscription linking is follow-up work. Model set: the current Claude family as listed on OpenRouter's catalog at task time (flagship, mid, and fast tiers), with ids and prices re-verified during the task and prices written in the same plain style as the existing entries.

## Route

- Adapter: Codex Exec
- Provider: OpenAI
- Model: gpt-5.6-sol
- Reason: Codex Exec is connected and supports serial tasks.

## Owned records

- `docs/ai-work/tasks/163-brief.md`
- `docs/ai-work/tasks/163-report.md`
- `docs/ai-work/LOG.md`

## Protected starting Git state

- HEAD: `c3a9cc5a640d06e6482d5cfc6479cb8f42fb0f24`
- Working tree: existing changes protected
- Existing staged work: no

## Checks

- Confirm exactly one Codex Exec worker returns one completed result with bounded numeric evidence.
- Confirm the worker's final message carries one readable cairn-claims block and the append-only log gains one matching Cairn-authored row.
- Confirm protected starting work is byte-identical and Cairn creates one exact-path local commit for a clean-start DONE result.

## Stop conditions

- A real worker process or model call would start without separate authorization.
- The process fails, returns invalid bounded evidence, returns no readable claims, or claims STOPPED.
- Protected Git work changes unexpectedly.
- Any task record cannot be verified exactly.

DONE means the one Codex Exec process completed, the requested outcome and checks are reported, the append-only log row matches, protected starting work remains intact, and Cairn verified Git isolation and created the exact-path commit when the task started clean.

STOPPED means the call was not authorized, the model reported a stop, process evidence failed, protected work changed, or the result records could not be verified.
