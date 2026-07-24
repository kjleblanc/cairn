# Task 044 — Brief

Requested visible outcome: Phase 2 core-surgery plan Task 7 — capture the
worker's final agent message as it crosses the codex process seam, purely as
plumbing. The worker prompt does not change in this task; real runs still
close on worker-authored records, unchanged from before. This is preparation
for Task 9, which will later make the retained text load-bearing for claims
verification.

Boundary of intent:

- `core/src/codex.ts` — add `finalMessage: string | null` to
  `CodexExecProcessResult`. In `terminalEvidence`'s `item.completed` branch,
  compute a three-way value for a completed item: a non-`agent_message` item
  leaves `finalMessage` `undefined` (last-writer-wins in `applyEvidence`
  leaves the running value alone); an `agent_message` with valid string text
  at or under 262,144 characters sets `finalMessage` to that text; an
  `agent_message` with oversized (over 262,144 characters) or non-string text
  overwrites `finalMessage` to `null` so a stale earlier message can never
  masquerade as the final one. `applyEvidence` destructures `finalMessage`
  out of each evidence partial and applies last-writer-wins with the
  undefined/null distinction preserved. The seed `result` initializes
  `finalMessage: null`. The adapter's `run` method maps
  `claimsText: result.finalMessage` onto the returned `CodexExecResult`.
- `core/src/routing.ts` — `CodexExecResult` gains `claimsText: string | null`.
- `core/src/serial.ts` — `validateCodexResult` accepts the new `claimsText`
  key (requiring it be `null` or a `string`) as part of its exact-schema
  check. One honesty reword: the privacy sentence in `reportText`'s bounded
  process evidence section changes from claiming Cairn retained no item text
  at all to stating plainly that Cairn now retains the worker's final message
  for claims verification, alongside the existing bounded counts, and nothing
  else.
- `core/test/codex.test.ts` and `core/test/serial.test.ts` — test coverage
  for the new field and rule, and every existing fake result updated to the
  new shape.

No API removal, no new dependency, no version bump, no change to the worker
prompt (`taskPrompt` in `core/src/codex.ts` is untouched), no change to what
`readModelRecords`/`verifyModelGitResult` require of the worker's own report
and log records.

Checks that show the outcome holds:

- `core/test/codex.test.ts`: the existing JSONL-reduction test asserts
  `result.finalMessage` equals the fixture's secret sentinel text, and that
  the bounded fields (everything except `finalMessage`) still contain no
  trace of that text. A new test proves last-writer-wins across two
  `agent_message` items and proves an oversized final `agent_message`
  overwrites `finalMessage` to `null` rather than retaining the prior valid
  message.
- `core/test/serial.test.ts`: every fake `CodexExecProcessResult` gains
  `finalMessage: null`; the reworded privacy sentence is asserted instead of
  the old blanket-secrecy wording.
- `cd core && npm test` — full core suite green, including the new test.
- Root `npm test` — core + cli both green.

DONE means: `finalMessage` is threaded end to end (process result to adapter
result to `CodexExecResult.claimsText`) with the exact three-way rule from
the plan, `validateCodexResult` accepts the new key, the privacy sentence in
worker-run reports is honest about what is now retained, every existing test
and fake is updated to match, and the full core and root suites are green
with no other assertion weakened. STOPPED means: the three-way rule cannot
be implemented without changing `terminalEvidence`'s existing count
semantics, or an existing protected-work, exact-path, phantom-dirty, or
secrecy assertion would have to be weakened to pass.
