# Task 008 — one confirmed real Codex Exec task

Requested outcome: Add a new core test file core/test/offline-honesty.test.mjs that asserts the offline demonstration adapter's result reports the requested product change was NOT attempted and milestone movement NO, so Cairn's honest-labeling guarantee cannot silently drift. Do not modify existing tests or the contract.

Supported outcome: Run one explicitly confirmed, ephemeral, workspace-scoped Codex Exec task and verify its task records and Git result.

Lane: **Standard** — one explicitly confirmed OpenAI Codex Exec call; the model may make in-scope local workspace changes.

## Route

- Adapter: Codex Exec
- Provider: OpenAI
- Model: gpt-5.6-sol
- Reason: Codex Exec is connected and supports serial tasks.

## Owned records

- `docs/ai-work/tasks/008-brief.md`
- `docs/ai-work/tasks/008-report.md`
- `docs/ai-work/LOG.md`

## Protected starting Git state

- HEAD: `5b12e574ce06b6b3938401fa1c4799b14a9592bb`
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
