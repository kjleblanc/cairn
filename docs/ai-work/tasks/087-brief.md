# Task 087 — Second Phase 4 spec amendment: whose Claude Code runs

## Requested visible outcome

The Phase 4 design spec carries a second dated amendment recording a new
owner-delegated decision — the body runs the Claude Code the owner installed,
pinned through `pathToClaudeCodeExecutable`, rather than the copy the SDK
ships — together with three corrections the first amendment got wrong or left
imprecise (`skills`, `env`, process-tree kill) and one requirement it stated
too weakly (the fake lane's enforcement).

## Boundary of intent

Documentation only: no behavior, dependency, or contract change. Neither the
approved sections nor the first amendment may be edited in place; this is
appended, so the record shows the order in which things were learned.

Every SDK claim must come from the installed package read in this session.
Where the first amendment is being corrected, say so plainly rather than
quietly restating it.

## Checks

- Decision 4 states the fact that forces it (`claudeCodeVersion` 2.1.220
  shipped via platform `optionalDependencies`, against 2.1.202 on the owner's
  PATH), the three things it makes false, and the rule that follows,
  including no silent fallback.
- The decision records that it was the owner's and was delegated.
- The unverified `.cmd`-shim question is named as unverified, with the task
  that must settle it and what happens if the answer is no.
- `skills: []`, the `env` allowlist, and the withdrawn tree-kill waiver each
  quote the SDK text that settles them.
- The fake lane's enforcement requirement says where the guard belongs and
  that a test must be able to fail when it is removed.
- One log row; exact-path commit of the spec and this task's records.

## DONE / STOPPED

DONE: all six checks hold and the amendment is committed. STOPPED: a
correction turns out to need the owner rather than the record.
