# Task 042 report — the claims fence scan is linear

## What was implemented

`core/src/claims.ts`: added a module-private `extractClaimsFences(message:
string): string[]` and two module-level regexes (`FENCE_OPENER =
/^```cairn-claims[ \t]*$/`, `FENCE_CLOSER = /^```[ \t]*$/`). It splits the
message once on `/\r?\n/`, then walks the lines with an open/closed state
machine: a line matching the opener while closed opens a fence and resets
the body buffer; a line matching the closer while open closes it and
pushes `body.join("\n")` onto the result; any other line while open
(including one that merely looks like another opener) is pushed onto the
body; anything while closed is ignored (prose); a fence still open at the
end of input is discarded, never pushed. `parseWorkerClaims` now calls
`extractClaimsFences(finalMessage)` and reads `fences[0]` directly (a
plain string) instead of `fences[0][1]` (a regex match's capture group).
Every downstream check — the size cap ahead of extraction, the
exactly-one-fence count, JSON parsing, the seven-key set, enum checks, and
every string/array/count cap — is untouched, byte-identical to before.

This replaces the previous fence extraction, a single regex applied via
`matchAll`:
`/^```cairn-claims[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/gm`. That regex is
O(n^2) on adversarial input: it is line-anchored (`^`/`$` with the `m`
flag), so the engine attempts an opener match starting at every line; when
an opener line has no closer anywhere ahead of it, the lazy `[\s\S]*?`
body group re-scans forward to end-of-string before the whole attempt
fails, and a message can be built with one opener-looking line per line of
input, forcing that full end-of-string rescan once per line.

## Semantics-equivalence reasoning

The new line walk reproduces the old regex's behavior on every case that
matters here:

- **Exact-line match requirement.** The old regex's opener/closer pieces
  are anchored (`^`...`$`) and require the *entire* line (aside from
  optional trailing spaces/tabs) to be the literal fence marker. Splitting
  on `/\r?\n/` yields exactly the same per-line text (delimiters stripped),
  so testing `/^```cairn-claims[ \t]*$/` / `/^```[ \t]*$/` against a split
  line is the same constraint applied the same way.
- **Lazy body = "anything until the next real closer."** The old regex's
  `[\s\S]*?` does not care what the body contains — it only stops at the
  first position where `\r?\n```[ \t]*$` occurs. That includes a line that
  looks like another opener: the lazy match just consumes it as ordinary
  body text, because it's not the closer pattern. The line walk's "any
  other line while open is body" rule (the closer regex requires *only*
  backticks + optional whitespace, so an opener-looking line while open
  never matches it) produces the identical outcome without look-ahead.
- **Unclosed trailing fence is not a fence.** If no closer follows an
  opener, the old regex simply has no match for that attempt (lazy
  matching cannot succeed without finding the closer pattern). The line
  walk agrees: a fence left `open` at the end of the loop is never pushed
  to `fences`.
- **Sequential, non-overlapping fences.** `matchAll` finds fences in
  left-to-right order, continuing the search after each match's end. The
  line walk's single left-to-right pass with `open`/`closed` state
  produces the same left-to-right, non-overlapping sequence of completed
  fences.
- **CRLF.** The old regex consumes `\r?\n` explicitly around both fence
  delimiters rather than relying on JS's `\r`/`\n`-as-separate-terminators
  quirk in multiline `^`/`$`. Splitting on `/\r?\n/` treats `\r\n` as one
  boundary the same way. A bare CR with no following LF is not a
  recognized line ending in either version (the old regex's `\r?\n`
  requires a literal `\n`; `split(/\r?\n/)` only splits on `\n` or `\r\n`),
  so a bare-CR-only message behaves the same in both: no boundary found at
  that point.
- **Boundary positions (message starts/ends with the fence, no trailing
  newline).** Both approaches treat "no more input" the same as "end of
  line" for the closer's trailing `$`/last split element, so a fence that
  opens the message, or ends it without a trailing newline, closes
  correctly in both.

Every one of the three pre-existing tests (well-formed fence; every
malformed shape including two fences, non-JSON, unknown/missing keys, bad
enums, wrong-typed `changes`, a check missing `result`, the summary cap,
the changes-count cap, and the total-size cap; empty strings/lists) still
passes byte-for-byte with no change to those test files' assertions.

## RED/GREEN evidence

Tests were added to `core/test/claims.test.ts` **before** touching
`claims.ts`, then run against the still-unmodified (regex-based)
implementation, then again after the fix:

**Before the fix** (old O(n^2) regex, `cd core && npm test`):

```
✔ a well-formed fence parses to typed claims (0.9824ms)
✔ adversarial: repeated unclosed openers stay linear, not quadratic (1100.0247ms)
✔ total size cap boundary: exactly TOTAL_CAP parses, one char over is null (0.3745ms)
✔ remaining field caps: check name/result, checks count, howToTry, limitations (0.2015ms)
...
ℹ tests 66
ℹ pass 66
ℹ fail 0
```

Honest disclosure: the adversarial test's bound is 2000ms (chosen loosely,
per the review's own guidance, to avoid CI flake) — the old regex measured
**1100ms** on this machine for the exact 262,144-char adversarial input,
which is under 2000ms, so the test does not fail outright at this size on
this hardware. It does not serve as a strict pass/fail regression gate at
this exact input size; the real evidence is the measured wall-clock time
itself, which is what the test prints on failure and what this report
records. 1100ms for a single 256 KiB message on a UI-blocking synchronous
parse is itself the defect the finding described — confirmed reproduced,
not merely asserted.

**After the fix** (new linear line walk, `cd core && npm test`):

```
✔ a well-formed fence parses to typed claims (1.0104ms)
✔ adversarial: repeated unclosed openers stay linear, not quadratic (2.986ms)
✔ total size cap boundary: exactly TOTAL_CAP parses, one char over is null (0.9406ms)
✔ remaining field caps: check name/result, checks count, howToTry, limitations (0.3201ms)
...
ℹ tests 66
ℹ pass 66
ℹ fail 0
```

The adversarial input dropped from **1100ms to 2.986ms** — a ~368x
speedup, consistent with an O(n^2) → O(n) fix, and squarely inside the
"~1-5ms" linear estimate the finding predicted. 66/66 tests pass, 0 fail,
including the three byte-identical pre-existing tests.

Root gate, run after the fix:

```
core: tests 66 / pass 66 / fail 0
cli:  tests 9 / pass 9 / fail 0
```

75/75 (66 core + 9 cli), both suites green, nothing else regressed.

## How to try it

`cd core && npm test` runs the full suite including
`adversarial: repeated unclosed openers stay linear, not quadratic`, which
prints its own measured elapsed time on failure. Reducing the 2000ms bound
in `core/test/claims.test.ts` (e.g. to 50ms) and re-running against this
fix still passes; reverting `core/src/claims.ts` to the old regex (`git
show <parent>:core/src/claims.ts`) and re-running the same tightened bound
fails, demonstrating the speed difference directly.

## Limitations

The 2000ms bound is intentionally loose (per the finding's own guidance)
to avoid CI flake on slower shared runners; it does not by itself prove
linearity as a hard gate, only that the parse completes quickly. The
measured before/after numbers in this report are the actual evidence of
the fix. The adversarial test targets this one shape (one opener per
line, no closer, exactly at the size cap) — the specific shape the finding
named — not a fuzzed search over other pathological inputs; the semantics
reasoning above is the argument for why the fix generalizes.

## Files changed

- `core/src/claims.ts` (modified — replaced the regex fence extraction
  with `extractClaimsFences`, a single-pass line walk; no other line
  changed)
- `core/test/claims.test.ts` (modified — appended four new tests; the
  three pre-existing tests are byte-identical)
- `docs/ai-work/tasks/042-brief.md` (new — repo task ceremony)
- `docs/ai-work/tasks/042-report.md` (new — repo task ceremony)
- `docs/ai-work/LOG.md` (modified — one appended row)

- Milestone movement: NO

Disposition: DONE
