# Task 250 — one confirmed real Codex Exec task

Supported outcome: Run one explicitly confirmed worker task through the connected adapter and verify its result and Git state.

Lane: **Standard** — one explicitly confirmed OpenAI Codex Exec call; the model may make in-scope local workspace changes.

## What you asked for

### Outcome

**You said so**

Interpretation:

> Remove the Cairn text label and icon from the top header bar of the app.

Your exact words (authoritative if they conflict with the interpretation):

> Let's remove the "Cairn" text and icon on the top bar.

## Context kept with the task — not a requirement

> Set aside by the owner: The top header bar will no longer display the application name or logo.

## Route

- Adapter: Codex Exec
- Provider: OpenAI
- Model: gpt-5.6-sol
- Reason: Codex Exec is connected and supports serial tasks.

## Owned records

- `docs/ai-work/tasks/250-brief.md`
- `docs/ai-work/tasks/250-report.md`
- `docs/ai-work/LOG.md`

## Protected starting Git state

- HEAD: `f368dc9e81b34a34de9d31a06aed58a312b1c52d`
- Working tree: clean
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
