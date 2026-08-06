# Task 180 — one confirmed real Codex Exec task

Supported outcome: Run one explicitly confirmed worker task through the connected adapter and verify its result and Git state.

Lane: **Standard** — one explicitly confirmed OpenAI Codex Exec call; the model may make in-scope local workspace changes.

## What you asked for

### Outcome

**You said so**

Interpretation:

> A lab-only look board showing directions for blending the project's side panel and top active-project bar into the pond, so the app reads as one cohesive environment and the owner can pick a direction.

Your exact words (authoritative if they conflict with the interpretation):

> We need a way to blend the project's side panel and top "active project" bar in with the rest of the "pond" so the app reads one cohesive environment better.

### Requirement 1

**You said so**

Interpretation:

> Show the directions on a lab board first, before any shipped app change.

Your exact words (authoritative if they conflict with the interpretation):

> Yes, lab board first.

### Requirement 2

**Cairn chose**

Interpretation:

> Paint three directions side by side: dissolve the panels into bare marks on the water, rebuild the panels from the pond's own material, and one middle step between them.

No owner quotation — this is Cairn’s choice, not evidence of owner preference.

## Context kept with the task — not a requirement

> Set aside by the owner: the owner may like none of the three directions; then the board is revised, which is cheaper than revising shipped app code.

> The lab-side details — mock scene, panel presentation, which settled captures go on the Review shots page — are the builder's judgment, matching the earlier board tasks (136, 144, 147).

## Route

- Adapter: Codex Exec
- Provider: OpenAI
- Model: gpt-5.6-sol
- Reason: Codex Exec is connected and supports serial tasks.

## Owned records

- `docs/ai-work/tasks/180-brief.md`
- `docs/ai-work/tasks/180-report.md`
- `docs/ai-work/LOG.md`

## Protected starting Git state

- HEAD: `30b42898c4d84053bfa27d490ff97b62da076e00`
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
