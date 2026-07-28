# Task 089 — one confirmed real Codex Exec task

Requested outcome: A design brief in `docs/superpowers/specs/` that records the owner's decisions on rail contents, canvas behavior, project model, and chat placement, with owner approval noted on each section, ready to scope the implementation tasks

Supported outcome: Run one explicitly confirmed worker task through the connected adapter and verify its result and Git state.

Lane: **Standard** — one explicitly confirmed OpenAI Codex Exec call; the model may make in-scope local workspace changes.

## Details (verbatim)

> The brief captures the cyberpunk x Animal Crossing theme: Cairn as central entity with visual presence, agents as villagers, threads connecting them, left rail with multi-project navigation and task lists, right canvas as functional spatial town square. The brief asks and records owner answers to: 1) rail section order and collapse behavior, 2) canvas layout fixed or force-directed / Cairn position / agent cap / click behavior, 3) project store location and switching behavior with concurrency rules, 4) chat placement in split view. The owner approves each section before proceeding.

## Route

- Adapter: Codex Exec
- Provider: OpenAI
- Model: gpt-5.6-sol
- Reason: Codex Exec is connected and supports serial tasks.

## Owned records

- `docs/ai-work/tasks/089-brief.md`
- `docs/ai-work/tasks/089-report.md`
- `docs/ai-work/LOG.md`

## Protected starting Git state

- HEAD: `0bf12ba337407a58997fb6943c78fced2573f020`
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
