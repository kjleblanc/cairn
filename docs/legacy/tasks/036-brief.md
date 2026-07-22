# Task 036 — one confirmed real Codex Exec task

Requested outcome: When a real Codex Exec task stops because its result cannot be verified, the Desktop result screen must not claim that Cairn verified the model-authored task records and Git result. Show clear wording that verification failed and retained evidence should be inspected. Keep the successful DONE wording unchanged, and add or update a focused Electron test covering both outcomes.

Supported outcome: Run one explicitly confirmed, ephemeral, workspace-scoped Codex Exec task and verify its task records and Git result.

Lane: **Standard** — one explicitly confirmed OpenAI Codex Exec call; the model may make in-scope local workspace changes.

## Route

- Adapter: Codex Exec
- Provider: OpenAI
- Model: gpt-5.6-sol
- Reason: Codex Exec is connected and supports serial tasks.

## Owned records

- `docs/ai-work/tasks/036-brief.md`
- `docs/ai-work/tasks/036-report.md`
- `docs/ai-work/LOG.md`

## Protected starting Git state

- HEAD: `43ab0468d2bc7f81445294a98929e8e56641e83b`
- Working tree: clean
- Existing staged work: no

## Checks

- Confirm exactly one Codex Exec process returns a completed JSONL terminal event.
- Confirm the model-authored report has one terminal disposition and the append-only log has one matching row.
- Confirm protected starting work is byte-identical and any clean-start DONE result has one isolated local commit.

## Stop conditions

- A real Codex Exec process or model call would start without separate authorization.
- The process fails, returns invalid bounded evidence, or the model reports STOPPED.
- Protected Git work changes unexpectedly.
- Any task record cannot be verified exactly.

DONE means the one Codex Exec process completed, the requested outcome and checks are reported, the append-only log row matches, protected starting work remains intact, and Git isolation is verified.

STOPPED means the call was not authorized, the model reported a stop, process evidence failed, protected work changed, or the result records could not be verified.
