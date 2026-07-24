# Task 044 — Report

## What changed

`core/src/codex.ts`:

- `CodexExecProcessResult` gains `finalMessage: string | null`.
- `terminalEvidence`'s `item.completed` branch now also computes the
  three-way `finalMessage` value alongside the existing counts:

  ```ts
  const agent = item.type === "agent_message";
  return {
    finalMessage: agent
      ? (typeof item.text === "string" && item.text.length <= 262_144 ? item.text : null)
      : undefined,
    agentMessageCount: agent ? 1 : 0,
    commandExecutionCount: command ? 1 : 0,
    fileChangeCount: fileChange ? 1 : 0,
    failedToolItemCount: failed ? 1 : 0,
  };
  ```

- `applyEvidence` destructures `finalMessage` out of each evidence partial
  and applies last-writer-wins with the undefined/null distinction:
  `finalMessage: finalMessage !== undefined ? finalMessage : result.finalMessage,`.
  A non-`agent_message` item's `undefined` leaves the running value alone; a
  valid or oversized `agent_message` (`string` or `null`) always overwrites.
- The seed `result` object initializes `finalMessage: null`.
- The adapter's `run` method maps `claimsText: result.finalMessage` onto the
  returned `CodexExecResult`.

`core/src/routing.ts`: `CodexExecResult` gains `claimsText: string | null`.

`core/src/serial.ts`:

- `validateCodexResult`'s exact-key list gains `"claimsText"`, and its value
  check requires `descriptors.claimsText.value === null || typeof
  descriptors.claimsText.value === "string"`.
- The privacy sentence in `reportText`'s bounded-process-evidence section
  changed from claiming no item text was retained at all to stating
  honestly that the worker's final message is now retained for claims
  verification:

  Before: "Cairn did not retain item text, reasoning, commands, paths,
  stdout, stderr, thread IDs, account details, authentication data, or
  credentials."

  After: "Cairn retained only the worker's final message (for claims
  verification) and these bounded counts; no other item text, reasoning,
  commands, paths, stdout, stderr, thread IDs, account details,
  authentication data, or credentials."

`core/test/codex.test.ts`:

- The existing "the system process reduces JSONL items to numeric evidence
  without retaining payload text" test now expects `finalMessage:
  SECRET_SENTINEL` in the full result, asserts `result.finalMessage` equals
  the sentinel directly, then destructures `finalMessage` out and asserts
  the remaining bounded fields still contain no trace of the secret text.
- New test, "only the last agent message is retained, and an oversized final
  message becomes null" (verbatim from the plan brief): proves last-writer-
  wins across two valid `agent_message` items, and proves a second,
  oversized (262,145-char) `agent_message` overwrites `finalMessage` to
  `null` rather than retaining the earlier valid message.
- The adapter-level fake in "one authorized fake verifies the real-call
  request without a model" gains `finalMessage: null` on its
  `CodexExecProcessResult`, and the `assert.deepEqual` on the adapter's
  `CodexExecResult` gains `claimsText: null`.

`core/test/serial.test.ts`: every fake `CodexExecProcessResult` (eight call
sites across eight tests) gains `finalMessage: null`. The one assertion on
the old blanket-secrecy sentence is updated to match the reworded sentence.

The worker prompt (`taskPrompt` in `core/src/codex.ts`) is untouched — real
runs still close entirely on worker-authored report/log records, exactly as
before this task. Only the plumbing that carries the final message across
the process seam and into the adapter result changed.

## RED evidence

The tests were written first (Step 1), then run before any implementation
change. `cd core && npm test`:

```
test/codex.test.ts(178,25): error TS2339: Property 'finalMessage' does not exist on type 'CodexExecProcessResult'.
test/codex.test.ts(193,25): error TS2339: Property 'finalMessage' does not exist on type 'CodexExecProcessResult'.
npm error Lifecycle script `build` failed with error:
npm error code 2
```

Failed for exactly the stated reason: the build step fails a `tsc` type
check because `finalMessage` did not yet exist on `CodexExecProcessResult`
— the test file references it before the implementation adds it.

## GREEN evidence

After implementing Step 3, `cd core && npm test`:

```
✔ the system process reduces JSONL items to numeric evidence without retaining payload text (81.5016ms)
✔ only the last agent message is retained, and an oversized final message becomes null (152.8334ms)
✔ one authorized fake verifies the real-call request without a model (0.3495ms)
...
ℹ tests 68
ℹ pass 68
ℹ fail 0
```

(67 tests before this task, +1 new test = 68, all green.)

Root gate, `npm test`:

```
core: tests 68 / pass 68 / fail 0
cli:  tests 9 / pass 9 / fail 0
```

77/77 total (76 before this task, +1 new test), both suites green, nothing
else regressed.

## How to try it

`cd core && npm test` runs the full suite including "only the last agent
message is retained, and an oversized final message becomes null." Reverting
only the `finalMessage`/`applyEvidence`/`claimsText` additions in
`core/src/codex.ts` (leaving the test files as-is) reproduces the RED
failure above.

## Limitations

This task is plumbing only, exactly as scoped: `finalMessage`/`claimsText`
now flow from the process result through to `CodexExecResult`, and
`validateCodexResult` accepts the new key, but nothing in `serial.ts` reads
or acts on `claimsText` yet — it is validated and carried, not yet load-
bearing. Real Codex Exec runs still close entirely on the worker's own
report and log records; a worker that writes a syntactically valid report
whose claims disagree with `claimsText` is not yet caught by anything in
this codebase. That is explicitly Task 9's job. The app's Playwright fake
codex (`app/tests/routing.spec.ts`) already emits `agent_message` JSONL
lines in its `missing-records` fixture mode; that text now flows into
`claimsText` on the resulting `CodexExecResult` but is never rendered or
otherwise surfaced anywhere in the app in this interim state, so the app
suite (out of this task's scope; not run here) is expected to stay
unaffected.

## Files changed

- `core/src/codex.ts` (modified — `finalMessage` field, three-way
  `terminalEvidence` value, last-writer-wins `applyEvidence`, seed
  `finalMessage: null`, adapter `claimsText` mapping)
- `core/src/routing.ts` (modified — `CodexExecResult.claimsText: string | null`)
- `core/src/serial.ts` (modified — `validateCodexResult` accepts
  `claimsText`; privacy sentence reworded)
- `core/test/codex.test.ts` (modified — extended JSONL-reduction test, new
  last-wins/oversized test, adapter-fake `finalMessage`/`claimsText`)
- `core/test/serial.test.ts` (modified — eight fakes gain
  `finalMessage: null`; reworded-sentence assertion)
- `docs/ai-work/tasks/044-brief.md` (new — repo task ceremony)
- `docs/ai-work/tasks/044-report.md` (new — repo task ceremony)
- `docs/ai-work/LOG.md` (modified — one appended row)

Milestone movement: NO

Disposition: DONE
