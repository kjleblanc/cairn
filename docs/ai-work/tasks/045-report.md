# Task 045 — Report

## What changed

`core/src/codex.ts`, inside `createSystemCodexExecProcess`'s `run` method:

- Added a helper right before `applyEvidence`, guarded by the same
  terminal-state freeze `applyEvidence` already uses:

  ```ts
  // A dropped line is an overwrite-to-null event, exactly like an
  // oversized agent_message: the dropped line may have been the true
  // final agent message; a partial view must not let an earlier
  // message masquerade as final. A later fully-visible message may
  // still legitimately overwrite this. Mirrors applyEvidence's own
  // terminal-state freeze below, since this assignment is direct and
  // does not go through applyEvidence.
  const clearFinalMessageForDroppedLine = (): void => {
    if (result.terminalEvent === "error" || result.terminalEvent === "turn.failed") return;
    result = { ...result, finalMessage: null };
  };
  ```

- Called it at all three points a line is dropped from the parse buffer:
  1. The mid-stream consumption branch, where a previously-flagged
     oversized line's tail is skipped (`if (skippingOversizedLine) { ...
     continue; }`).
  2. The mid-stream overflow-detection branch, where the buffer first
     exceeds 1,048,576 bytes and its head is cleared
     (`skippingOversizedLine = true; stdout = "";`).
  3. The close-time flush, in a new `else if (skippingOversizedLine)`
     branch alongside the existing `if (stdout.trim() &&
     !skippingOversizedLine) { applyEvidence(...); }` — covering the case
     where the process closes while a flagged partial line is still
     unresolved (no further newline ever arrived to trigger site 1).

No change to `terminalEvidence`'s per-item semantics, `applyEvidence`'s
counting/last-writer-wins logic, the worker prompt, or any other file.

`core/test/codex.test.ts`:

- Extended "an oversized output line is skipped without killing the run"
  with `assert.equal(result.finalMessage, null);`.
- New test "a dropped oversized line clears the final message so an
  earlier one cannot masquerade as final" — the reviewer's exact scenario:
  small valid `agent_message` ("first small valid message"), then a single
  JSONL line whose serialized length exceeds 1,048,576 bytes (a giant
  `agent_message`), then `turn.completed`. Asserts `finalMessage === null`.
- New test "a valid agent message arriving after a dropped oversized line
  still becomes the final message" — giant oversized line first, then a
  small valid `agent_message` ("recovered final"), then `turn.completed`.
  Asserts `finalMessage === "recovered final"`, proving the fix does not
  add a sticky suppression flag.

## RED evidence

Both new tests and the extended assertion were written first, then run
before any implementation change (`cd core && npm test`):

```
✖ a dropped oversized line clears the final message so an earlier one cannot masquerade as final (92.2761ms)
  AssertionError [ERR_ASSERTION]: the dropped line might have been the true final message; the earlier one must not masquerade as final
  + actual - expected

  + 'first small valid message'
  - null
  ...
    actual: 'first small valid message',
    expected: null,
    operator: 'strictEqual',

ℹ tests 70
ℹ pass 69
ℹ fail 1
```

Failed for exactly the stated reason: the reviewer's scenario returned the
earlier valid message instead of `null` — the pre-fix code dropped the
oversized line silently and left the stale `finalMessage` from "first small
valid message" in place. The other new test ("a valid agent message
arriving after a dropped oversized line...") and the extended assertion on
the pre-existing "an oversized output line is skipped..." test already
passed before the fix (the pure-oversized-with-no-earlier-message case, and
the after-the-drop-recovery case, both already produced the right result
by coincidence of the existing code's structure) — only the reviewer's
exact scenario (an earlier valid message stale-surviving a later drop) was
red, which is precisely the finding being closed.

## GREEN evidence

After implementing the fix, `cd core && npm test`:

```
✔ an oversized output line is skipped without killing the run (79.9769ms)
✔ a dropped oversized line clears the final message so an earlier one cannot masquerade as final (80.5299ms)
✔ a valid agent message arriving after a dropped oversized line still becomes the final message (78.5703ms)
...
ℹ tests 70
ℹ pass 70
ℹ fail 0
```

(68 tests before this task, +2 new = 70, all green.)

Root gate, `npm test`:

```
core: tests 70 / pass 70 / fail 0
cli:  tests 9 / pass 9 / fail 0
```

79/79 total (77 before this task, +2 new tests), both suites green, nothing
else regressed.

## How to try it

`cd core && npm test` runs the full suite including both new tests.
Reverting only the `clearFinalMessageForDroppedLine` helper and its three
call sites in `core/src/codex.ts` (leaving the test files as-is) reproduces
the RED failure above on the reviewer's exact scenario.

## Limitations

This closes the one Important finding from the Task 044 review: a dropped
oversized line can no longer let a stale earlier message pose as the
worker's final word. It remains plumbing only — nothing in `serial.ts` yet
reads or acts on `claimsText`, exactly as Task 044 left it; that is still
Task 9's job. The close-time flush branch (site 3) is defensive: in every
JSONL stream this repo's fakes can produce, the mid-stream sites (1 and 2)
already null the message before the process closes, since Node's stream
chunking means a still-flagged line at close would require the child to
exit mid-line with no trailing newline ever arriving. No test exercises
site 3 directly by observation (it is behaviorally redundant with site 2
under every reachable fake-install stream shape); it is included because
the review explicitly names it as one of the two required drop sites and
because a genuinely truncated real Codex Exec stream (child killed or
crashed mid-line) would reach exactly this path.

## Files changed

- `core/src/codex.ts` (modified — `clearFinalMessageForDroppedLine` helper,
  called at both mid-stream drop sites and the close-time flush)
- `core/test/codex.test.ts` (modified — extended the oversized-line test
  with one assertion, added two new tests)
- `docs/ai-work/tasks/045-brief.md` (new — repo task ceremony)
- `docs/ai-work/tasks/045-report.md` (new — repo task ceremony)
- `docs/ai-work/LOG.md` (modified — one appended row)

Milestone movement: NO

Disposition: DONE
