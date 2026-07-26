# Task 084 — Commit the Phase 4 second-body design spec

## Requested visible outcome

The owner-approved Phase 4 design lives in the repository as
`docs/superpowers/specs/2026-07-26-cairn-phase4-second-body-design.md`: a
general conductor-body seam, a Claude Code body reached by detection rather
than a connect flow, and a consent story that names a plan's usage limits
instead of a dollar figure that would not be true.

## Boundary of intent

Documentation only: the spec changes no behavior. Design decisions were made
by the owner in the 2026-07-26 session and the spec records them; it may not
silently alter them. Every claim the spec makes about current code or about
the Agent SDK must be one that was checked in that session, not recalled.

## Checks

- The spec carries the owner's three decisions (general body seam; detection
  rather than a connect flow; plan-usage rather than a cost estimate) and the
  re-plan findings that reshaped Phase 4 away from the route spec's original
  "second worker, second body".
- Every factual claim about the existing code (`client.ts`'s Bearer header,
  the `StreamEvent` union, `vite.main.config.ts`'s external list,
  `forge.config.ts`'s `asar: false`) and about the Agent SDK
  (`includePartialMessages`, `settingSources`, `maxTurns`, `systemPrompt`,
  `claude auth status`) was verified this session and is stated as verified.
- Self-review passes: no placeholders, no internal contradictions, single
  implementation-plan scope, no requirement readable two ways.
- One log row; exact-path commit of the spec and this task's records.

## DONE / STOPPED

DONE: all four checks hold and the spec is committed. STOPPED: a decision in
the spec turns out to need the owner rather than the record.
