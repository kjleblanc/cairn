# Task 004 — one confirmed real Codex Exec task

Requested outcome: A core test fails whenever a contract mirror drifts: core/assets/contract.md and the contract embedded in cairn.html's src-contract script block must each match CONTRACT-TEMPLATE.md after normalizing line endings.

Supported outcome: Run one explicitly confirmed, ephemeral, workspace-scoped Codex Exec task and verify its task records and Git result.

Lane: **Standard** — one explicitly confirmed OpenAI Codex Exec call; the model may make in-scope local workspace changes.

## Route

- Adapter: Codex Exec
- Provider: OpenAI
- Model: gpt-5.6-sol
- Reason: Codex Exec is connected and supports serial tasks.

## Owned records

- `docs/ai-work/tasks/004-brief.md`
- `docs/ai-work/tasks/004-report.md`
- `docs/ai-work/LOG.md`

## Protected starting Git state

- HEAD: `d426ba50f615fe353441a5395fb55b91cf5a92f3`
- Working tree: clean
- Existing staged work: no

## Checks

- Confirm exactly one Codex Exec process returns a completed JSONL terminal event.
- Confirm the model-authored report has one terminal disposition and the append-only log has one matching row.
- Confirm protected starting work is byte-identical and Cairn creates one exact-path local commit for a clean-start DONE result.

## Stop conditions

- A real Codex Exec process or model call would start without separate authorization.
- The process fails, returns invalid bounded evidence, or the model reports STOPPED.
- Protected Git work changes unexpectedly.
- Any task record cannot be verified exactly.

DONE means the one Codex Exec process completed, the requested outcome and checks are reported, the append-only log row matches, protected starting work remains intact, and Cairn verified Git isolation and created the exact-path commit when the task started clean.

STOPPED means the call was not authorized, the model reported a stop, process evidence failed, protected work changed, or the result records could not be verified.
