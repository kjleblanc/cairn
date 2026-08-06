# Task 183 — one confirmed real Codex Exec task

Supported outcome: Run one explicitly confirmed worker task through the connected adapter and verify its result and Git state.

Lane: **Standard** — one explicitly confirmed OpenAI Codex Exec call; the model may make in-scope local workspace changes.

## What you asked for

### Outcome

**You said so**

Interpretation:

> Retire the Project Home screen and roll all of its functionality into the project side bar.

Your exact words (authoritative if they conflict with the interpretation):

> I want to retire the "project home" screen, it's functionality rolled into the project's side bar.

### Requirement 1

**You said so**

Interpretation:

> Target the screen opened by the Project Home button inside the conversation view.

Your exact words (authoritative if they conflict with the interpretation):

> It's the screen the "Project Home" button within this chat takes me to

### Requirement 2

**Cairn chose**

Interpretation:

> Opening a project lands directly on the main workspace view, with the side bar hosting all project details and navigation.

No owner quotation — this is Cairn’s choice, not evidence of owner preference.

## Context kept with the task — not a requirement

> Set aside by the owner: Moving all project details into the side bar could crowd smaller window widths.

## Route

- Adapter: Codex Exec
- Provider: OpenAI
- Model: gpt-5.6-sol
- Reason: Codex Exec is connected and supports serial tasks.

## Owned records

- `docs/ai-work/tasks/183-brief.md`
- `docs/ai-work/tasks/183-report.md`
- `docs/ai-work/LOG.md`

## Protected starting Git state

- HEAD: `18a7a6e968e919783e824a7b44c1eb5daf6388bb`
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
