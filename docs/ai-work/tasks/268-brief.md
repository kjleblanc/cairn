# Task 268 — one confirmed real Codex Exec task

Supported outcome: Run one explicitly confirmed worker task through the connected adapter and verify its result and Git state.

Lane: **Standard** — one explicitly confirmed OpenAI Codex Exec call; the model may make in-scope local workspace changes.

## What you asked for

### Outcome

**You said so**

Interpretation:

> The app window can be dragged by its top bar, and the minimize, fullscreen, and exit buttons blend cleanly into the header without overlapping app controls or text.

Your exact words (authoritative if they conflict with the interpretation):

> CAIRN's window isn't draggable and the minimze, fullscreen and exit buttons don't blend in with the app, they overlap it.

### Requirement 1

**Cairn chose**

Interpretation:

> Mark top bar areas as draggable while keeping interactive controls clickable

No owner quotation — this is Cairn’s choice, not evidence of owner preference.

### Requirement 2

**Cairn chose**

Interpretation:

> Add top bar spacing and window control overlay styling so minimize, fullscreen, and exit buttons blend in without overlapping content

No owner quotation — this is Cairn’s choice, not evidence of owner preference.

## Context kept with the task — not a requirement

> Set aside by the owner: Top bar buttons or inputs could become hard to click if drag regions cover them.

## Promises the owner accepted — every cN must be answered

- c1: The app window can be dragged by its top bar, and the minimize, fullscreen, and exit buttons blend cleanly into the header without overlapping app controls or text.
  - You look at this yourself
- c2: Mark top bar areas as draggable while keeping interactive controls clickable
  - You look at this yourself
- c3: Add top bar spacing and window control overlay styling so minimize, fullscreen, and exit buttons blend in without overlapping content
  - You look at this yourself

## Route

- Adapter: Codex Exec
- Provider: OpenAI
- Model: gpt-5.6-sol
- Reason: Codex Exec is connected and supports serial tasks.

## Owned records

- `docs/ai-work/tasks/268-brief.md`
- `docs/ai-work/tasks/268-report.md`
- `docs/ai-work/LOG.md`

## Protected starting Git state

- HEAD: `a7a9b83c42c5f4c006666ab869d318c8833aadac`
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
