# Task 022 — Project-local conversation memory under .cairn/

Requested visible outcome: the repository exports conversation store functions
(ensureCairnIgnored, newConversationId, appendTurn, readTurns, listConversations)
and persists turns in .cairn/conversations/ using JSONL format, guarded by a
one-line .gitignore entry.

Boundary of intent: conversation persistence layer only. No UI, no Conductor
integration, no network. Stores ConductorTurn objects from IPC locally; recovers
gracefully from corrupt lines; tracks conversation IDs as zero-padded three-digit
strings.

Checks: app/tests-unit/store.test.ts passes all four cases (turns round-trip,
corrupt-line recovery, gitignore guard idempotency, gitignore creation). All
existing tests remain at 33 passing. Typecheck clean. No new dependencies.

DONE means the outcome above holds and the checks pass. STOPPED means they do
not.
