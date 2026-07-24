# Task 043 — Report

## Correction of the Task 042 report

The Task 042 report (`docs/ai-work/tasks/042-report.md`, not edited — records
in this repo are append-only) states, in its "Semantics-equivalence
reasoning" section:

> A bare CR with no following LF is not a recognized line ending in either
> version (the old regex's `\r?\n` requires a literal `\n`; `split(/\r?\n/)`
> only splits on `\n` or `\r\n`), so a bare-CR-only message behaves the same
> in both: no boundary found at that point.

This is wrong for the *old* regex. The old fence-extraction regex —
`/^```cairn-claims[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/gm` — used the `m`
flag, which makes `^` and `$` match at every line boundary, not just the
start/end of the whole string. Per the ECMAScript spec, the LineTerminator
set that `^`/`$` key off in multiline mode is `\n`, `\r`, U+2028 (LINE
SEPARATOR), and U+2029 (PARAGRAPH SEPARATOR) — all four, not just `\n`. So a
bare `\r` (no following `\n`) *was* a line boundary to the old regex's
anchors, even though the regex's own literal `\r?\n` (matched as ordinary
characters, not anchors) requires an actual `\n`. The 042 report's reasoning
conflated "the literal `\r?\n` text the regex matches" with "where `^`/`$`
can anchor," and concluded the two parsers agree on bare CR when they do
not. That gap — the old regex's anchors firing on a boundary the new
line-walk's `split(/\r?\n/)` cannot see at all — is exactly what this task
closes. Verified directly: `[...msg.matchAll(OLD_FENCE_REGEX)].length` finds
2 matches on a two-fence message joined by a bare `\r` where "```cairn-claims"
appears as a clean line of its own; the new pre-fix line walk parses a
single valid fence with a bare CR elsewhere in the message and returns a
non-null result — the fail-open case this task fixes.

## What changed

`core/src/claims.ts` — one guard clause added at the top of
`parseWorkerClaims`, immediately after the existing null/size check:

```ts
  // The line walk recognizes only \n and \r\n. A bare \r, U+2028, or U+2029
  // was a line boundary to the old multiline-regex parser and could hide a
  // second fence from this walk (fail-open). No real worker transport emits
  // them; reject the whole message instead of guessing.
  if (/\r(?!\n)|\u2028|\u2029/.test(finalMessage)) return null;
```

Nothing else in the file changed — `extractClaimsFences`'s `split(/\r?\n/)`
line walk, every downstream key/enum/cap check, and the exported signature
are byte-identical to before.

`core/test/claims.test.ts`:

- New test, "fail-closed on exotic line separators that could hide a second
  fence": the reviewer's literal reproducer (`fence(...) + "\r" + fence(...)`,
  and the same with `\u2028`/`\u2029`) asserts `null`; the genuinely
  discriminating case — one single, otherwise-perfectly-valid fence with a
  bare CR sitting in unrelated prose outside it (`"before\rafter" +
  fence(...)`) — asserts `null`; CRLF-fence parsing is reaffirmed unchanged.
- The adversarial timing test's bound tightened from `2000` to `250`
  (comment updated: linear runs ~1-5ms; the old quadratic code measured
  ~1000ms on this exact input, which the 2000ms bound failed to catch).

## RED evidence

The new test was written and run against the pre-fix source before touching
`claims.ts`. Real output, `cd core && npm test`:

```
✖ fail-closed on exotic line separators that could hide a second fence (1.1315ms)
  AssertionError [ERR_ASSERTION]: lone bare CR rejects the whole message
  + actual - expected

  + {
  +   changes: [ 'visible.txt — created with the requested text' ],
  +   checks: [ { name: 'read the file back', result: 'matches byte-for-byte' } ],
  +   disposition: 'DONE',
  +   howToTry: 'Open visible.txt.',
  +   limitations: 'None.',
  +   milestone: 'NO',
  +   summary: 'Added the visible result.'
  + }
  - null
```

Failed for exactly the stated reason: the pre-fix line walk found one clean,
valid fence in `"before\rafter" + fence(JSON.stringify(VALID))` (the bare CR
sits in unrelated prose before the fence and doesn't touch fence structure at
all) and silently parsed it, returning the typed claims object instead of
refusing — the fail-open bug the finding named. `tests 67 / pass 66 / fail 1`
before the fix; every other new assertion in the same test (the three
"glued" reproducers, CRLF-still-parses) already passed pre-fix, since those
specific inputs happen to be caught by the pre-existing fence-count or
JSON-parse checks by coincidence — only the lone-bare-CR case demonstrates
the true divergence discriminatingly.

## GREEN evidence

After adding the guard clause, `cd core && npm test`:

```
ℹ tests 67
ℹ pass 67
ℹ fail 0
```

`node --test dist/test/claims.test.js` in isolation:

```
✔ adversarial: repeated unclosed openers stay linear, not quadratic (1.8625ms)
✔ fail-closed on exotic line separators that could hide a second fence (0.1577ms)
ℹ tests 7
ℹ pass 7
ℹ fail 0
```

The adversarial test's tightened 250ms bound passes comfortably (measured
~1.9ms). `npx tsc --noEmit -p .` is clean (the fix's regex uses proper
`\u2028`/`\u2029` escape sequences — a raw LineTerminator character is not
legal inside a JavaScript regex literal, confirmed by an intermediate
`TS1161: Unterminated regular expression literal` error while drafting the
test file with literal characters instead of escapes, before switching to
escape sequences).

Root gate, `npm test`:

```
core: tests 67 / pass 67 / fail 0
cli:  tests 9 / pass 9 / fail 0
```

76/76 total, both suites green, nothing else regressed.

## How to try it

`cd core && npm test` runs the full suite including "fail-closed on exotic
line separators that could hide a second fence." Reverting only the new
guard clause in `core/src/claims.ts` (leaving the test file as-is) and
re-running reproduces the RED failure above.

## Limitations

The guard is a blanket rejection — any message containing a bare CR, U+2028,
or U+2029 anywhere is refused, not only when one of these characters
actually sits at a position that would shift fence structure. This is
deliberately conservative: no real worker transport in this repo (Node,
git, Codex Exec, the offline adapter) emits these characters, so the
stricter policy costs nothing in practice and avoids having to reason about
every possible position such a character could occupy relative to a fence
boundary.

## Files changed

- `core/src/claims.ts` (modified — one guard clause, 5 lines)
- `core/test/claims.test.ts` (modified — one new test; the adversarial
  test's bound tightened from 2000ms to 250ms with an updated comment)
- `docs/ai-work/tasks/043-brief.md` (new — repo task ceremony)
- `docs/ai-work/tasks/043-report.md` (new — repo task ceremony)
- `docs/ai-work/LOG.md` (modified — one appended row)

Milestone movement: NO

Disposition: DONE
