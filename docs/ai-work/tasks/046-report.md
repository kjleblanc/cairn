# Task 046 — Report

## What changed

- `core/src/records.ts` (new) — implements the `ComposedRecordInput`
  interface exactly as specified in the Task 8 brief, and two exported
  functions:
  - `composeWorkerReport(input)` — composes the full Markdown worker report
    with a `## Verified by Cairn` section (route, protected-work truth,
    Git-derived files changed, commit result, optional bounded evidence
    line, optional process-failure line), a STOPPED-only paragraph naming
    the fixed stop code and, when `paidCallStarted`, the paid-call
    sentence, the fixed Task 044 privacy paragraph (always present), a
    `## The worker's account (claims, not verified by Cairn)` section (the
    worker's summary/changes/checks/how-to-try/limitations, or "The worker
    returned no readable claims block." when `claims` is `null`), a bare
    `Milestone movement: **X**` line, and a bare `Disposition: **DONE**` /
    `**STOPPED**` line alone on its own line.
  - `composeWorkerRowSummary(input)` — one LOG.md cell, ≤160 chars, using
    the worker's claimed summary for DONE (labeled "worker claim; files
    verified against Git by Cairn") or a fixed "stopped safely (REASON)"
    sentence for STOPPED, truncated to 160 chars with a trailing `…` when
    the input summary is longer.
  - Internal helpers only: `pad` (3-digit task number, kept local to this
    file rather than imported from `files.ts`, so the module's only
    dependencies remain the two type-only imports the brief's interface
    names — `./claims.js` and `./routing.js`), `truncateRow`,
    `filesChangedLine`, `verifiedByCairnLines`, `stoppedParagraph`,
    `bulletsOrNone`, `checkBullets`, `workersAccountBlock`.
- `core/test/records.test.ts` (new) — the five tests from the Task 8 brief,
  verbatim, plus the `GOLDEN_DONE_REPORT` template-literal constant filled
  in after implementation and reviewed line by line against the brief's
  layout spec (see Verification below), then frozen.
- `core/package.json` (modified) — appended ` dist/test/records.test.js` to
  the enumerated `test` script's file list (line 14).

No other file changed. No new dependency. No version bump.

## Verification (real results)

**RED first** — `core/test/records.test.ts` and the `core/package.json`
registration were created, then `cd core && npm test` was run before
`core/src/records.ts` existed:

```
test/records.test.ts(3,62): error TS2307: Cannot find module '../src/records.js' or its corresponding type declarations.
npm error Lifecycle script `build` failed with error:
npm error code 2
```

Failed for exactly the stated reason: the build step (`tsc`) cannot find the
not-yet-created module. No test runtime, no assertion failures — a clean
red on the missing implementation.

**Implementation**, then GREEN — `cd core && npm test`:

```
✔ a DONE report separates Cairn-verified facts from worker claims (0.8ms)
✔ a PROTECTED_WORK_CHANGED report never claims protected work is intact (0.13ms)
✔ a claims-missing STOPPED report says so plainly with milestone NO (0.87ms)
✔ the DONE report matches its golden layout exactly (0.1ms)
✔ the log-row summary is one bounded honest line (0.21ms)
...
ℹ tests 75
ℹ pass 75
ℹ fail 0
```

(70 tests before this task, +5 new = 75, all green, nothing else regressed.)

**Golden fixture review**: before freezing `GOLDEN_DONE_REPORT`, the actual
composed output for the DONE fixture was printed independently (via a
one-off `node --input-type=module` script importing the built
`dist/src/records.js`, not by trusting the test's own pass/fail) and
compared line by line against the Task 8 brief's layout spec:

- Title line (`# Task 007 — Codex Exec worker report`) instantiates
  `# Task NNN — {adapterLabel} worker report` correctly.
- `## Verified by Cairn` section: route line, `Protected starting work:
  byte-identical` (protectedIntact true), the files-changed bullet with one
  indented `` - `visible.txt` `` sub-line, the commit reason line, and the
  bounded evidence bullet — each instantiates its template line exactly, in
  order, with no process-failure line (correctly omitted — none supplied).
- No STOPPED paragraph present (correctly omitted — disposition is DONE).
- The exact Task 044 privacy sentence, verbatim, always present.
- `## The worker's account (claims, not verified by Cairn)` section:
  summary paragraph, `What changed:` bullets, `Checks the worker says it
  ran:` bullets in `name — result` form, `How to try it:` and
  `Limitations:` paragraphs — each instantiates its template slot.
- `Milestone movement: **NO**` and `Disposition: **DONE**`, each alone on
  its own line, in that order, at the end.

Every line in the actual output was traced back to a specific line in the
brief's layout template; nothing extra, nothing missing, nothing
mismatched. The constant was then pasted in and the golden test passed
without further changes.

**Row-summary truncation** (not exercised by the brief's fixed test file,
which only checks a short summary against the ≤160 bound): verified by hand
with a 200-char summary. Result length was exactly 160, ending in `…`,
confirming the truncate-to-159-chars-plus-ellipsis behavior for oversized
inputs, not just the pass-through case for short ones.

**Root gate**, `npm test`:

```
core: tests 75 / pass 75 / fail 0
cli:  tests 9 / pass 9 / fail 0
```

84/84 total (79 before this task, +5 new tests), both suites green, nothing
else regressed.

## How to try it

`cd core && npm test` runs the full suite including all five new
`records.test.ts` tests. Reverting `core/src/records.ts` (leaving the test
file and `package.json` registration in place) reproduces the RED build
failure above.

## Limitations

This module is pure composition/rendering: it renders exactly the facts and
claims it is given, and does not itself verify Git state, re-derive
`protectedIntact`, or validate `WorkerClaims` (that is `claims.ts`'s job, and
Task 9's job to wire the two together with `serial.ts`'s real Git-derived
values). Nothing in the repository calls `composeWorkerReport` or
`composeWorkerRowSummary` yet; `records.ts` is not re-exported from
`core/src/index.ts` either, matching the same not-yet-wired precedent
`claims.ts` set at Task 041 — both await Task 9's integration. The
process-failure bullet line's exact wording is untested (the brief's fixed
test file does not exercise it), though it was reviewed against the
brief's "naming code and debug path" requirement and both fields do appear
in it.

## Files changed

- `core/src/records.ts` (new — record composition module)
- `core/test/records.test.ts` (new — five tests from the Task 8 brief plus
  the frozen `GOLDEN_DONE_REPORT` fixture)
- `core/package.json` (modified — registered `dist/test/records.test.js` in
  the enumerated test script)
- `docs/ai-work/tasks/046-brief.md` (new — repo task ceremony)
- `docs/ai-work/tasks/046-report.md` (new — repo task ceremony)
- `docs/ai-work/LOG.md` (modified — one appended row)

Milestone movement: NO

Disposition: DONE
