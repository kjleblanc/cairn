# Task 248 — one confirmed real Codex Exec task

Supported outcome: Run one explicitly confirmed worker task through the connected adapter and verify its result and Git state.

Lane: **Standard** — one explicitly confirmed OpenAI Codex Exec call; the model may make in-scope local workspace changes.

## What you asked for

### Outcome

**You said so**

Interpretation:

> Hide the top application menu bar containing File, Edit, View, Window, and Help

Your exact words (authoritative if they conflict with the interpretation):

> hide the file/edit/view/window/help bar

## Context kept with the task — not a requirement

> The owner set aside the risk that hiding the menu bar removes standard window menu items.

> Set aside by the owner: Hiding the menu bar removes standard window menu items.

## Route

- Adapter: Codex Exec
- Provider: OpenAI
- Model: gpt-5.6-sol
- Reason: Codex Exec is connected and supports serial tasks.

## Owned records

- `docs/ai-work/tasks/248-brief.md`
- `docs/ai-work/tasks/248-report.md`
- `docs/ai-work/LOG.md`

## Protected starting Git state

- HEAD: `b91b7f563471c63de51ccdf6beeedeeaf6f4780d`
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
