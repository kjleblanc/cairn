# Task 045 — Brief

Requested visible outcome: close the Important finding from the Task 044
code review. `core/src/codex.ts`'s `createSystemCodexExecProcess` stdout
handler drops a raw JSONL line exceeding the ~1 MiB parse-buffer cap via
`skippingOversizedLine` before `terminalEvidence` ever parses it. That
dropped line could have been the worker's true final `agent_message`, so
the retained `finalMessage` from an earlier message stayed in place and
could masquerade as final — violating Task 044's own exact rule ("a stale
earlier message must never masquerade as the final one"). Task 9 of the
Phase 2 plan will make `claimsText` load-bearing, so this must close before
that lands.

The fix: a dropped line is treated as an overwrite-to-null event, exactly
like an oversized `agent_message`. At every point a line is dropped from the
parse buffer — the mid-stream overflow detection that sets
`skippingOversizedLine` and clears the buffer, the mid-stream consumption
that skips the resulting flagged partial line, and the close-time flush
that skips a still-flagged partial line at process end — `finalMessage` is
overwritten to `null`, mirroring `applyEvidence`'s own terminal-state freeze
(`error`/`turn.failed`) so a drop after a frozen terminal state changes
nothing. A later, fully-visible `agent_message` arriving after the drop
still legitimately overwrites the `null` through the existing
`applyEvidence` last-writer-wins path — no sticky flag suppresses it.

Boundary of intent: `core/src/codex.ts` only, inside
`createSystemCodexExecProcess`. No change to `terminalEvidence`'s existing
per-item semantics, no change to `applyEvidence`'s existing counting logic,
no change to the worker prompt, no new dependency, no version bump.
`core/test/codex.test.ts` gains two new tests and one new assertion on an
existing test; no existing assertion is weakened.

Checks that show the outcome holds:

- New test: a small valid `agent_message` ("first small valid message")
  followed by a single JSONL line whose serialized length exceeds
  1,048,576 bytes (a giant `agent_message`), followed by `turn.completed`,
  yields `finalMessage === null` (this is the reviewer's exact scenario;
  RED against pre-fix code, which returned the earlier valid message).
- New test: a giant oversized line first, then a small valid
  `agent_message` ("recovered final"), then `turn.completed`, yields
  `finalMessage === "recovered final"` — proving the fix does not add a
  sticky suppression flag that blocks legitimate later overwrites.
- Extended existing test ("an oversized output line is skipped without
  killing the run") with `assert.equal(result.finalMessage, null)`.
- `cd core && npm test` — full core suite green (68 pre-existing + 2 new
  = 70).
- Root `npm test` — core + cli both green.

DONE means the null-overwrite lands at all three drop sites exactly as
scoped, respects the same terminal-state freeze `applyEvidence` already
uses, a later valid message still legitimately overwrites the null, both
new tests and the extended assertion pass, and the full core and root
suites are green with no existing assertion weakened. STOPPED means the
fix cannot be made without changing `terminalEvidence`'s or
`applyEvidence`'s existing semantics, or an existing protected-work,
exact-path, phantom-dirty, or secrecy assertion would have to be weakened
to pass.
