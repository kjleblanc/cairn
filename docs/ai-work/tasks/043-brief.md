# Task 043 — Brief

Requested visible outcome: the Task 042 re-review (opus, empirically verified)
found a fail-open divergence in `core/src/claims.ts`. Task 042's linear line
walk splits a message only on `/\r?\n/`, but the regex it replaced used
JavaScript's multiline `^`/`$` anchors, which treat a bare `\r` (a CR with no
following LF), U+2028 (LINE SEPARATOR), and U+2029 (PARAGRAPH SEPARATOR) as
line boundaries too, not just `\n`/`\r\n`. A message can be constructed where
the new walk and the old regex disagree about fence structure because of this
gap; more concretely, a single otherwise-valid `cairn-claims` fence with a
bare CR sitting anywhere else in the message parses successfully under the
new walk today, silently returning typed claims for adversarial-shaped input.
Fix it so the parser rejects, fail-closed, any message containing one of
these three characters, rather than trying to special-case every way they
could shift fence boundaries.

The review also names a factual error in the Task 042 report's "Semantics-
equivalence reasoning" section: it states "a bare CR is not a recognized line
ending in either version," true only for the *new* line-split step in
isolation — it omits that the *old* regex's multiline anchors did recognize a
bare CR (and U+2028/U+2029) as a line ending, which is exactly the mechanism
that made the two parsers diverge. Records in this repo are append-only:
`docs/ai-work/tasks/042-report.md` is not edited. This task's own report
states the correction plainly instead.

Boundary of intent: `core/src/claims.ts` (one guard clause added at the top
of `parseWorkerClaims`, immediately after the existing null/size check; no
other line changed — the CRLF-splitting semantics of `extractClaimsFences`
are untouched, this only rejects input the walk cannot see correctly) and
`core/test/claims.test.ts` (one new test; the adversarial test's wall-clock
bound tightened from 2000ms to 250ms). No API change, no new files beyond
this task's own ceremony records, no other module touched, no new dependency,
no version bump.

The fix: reject the whole message when
`/\r(?!\n)|\u2028|\u2029/.test(finalMessage)` is true, before fence
extraction runs.

Checks that show the outcome holds:

- `core/test/claims.test.ts`: a new test, "fail-closed on exotic line
  separators that could hide a second fence" — the reviewer's reproducer
  (two complete fences glued by a bare CR / U+2028 / U+2029) returns `null`
  for all three separators; a message with one single, otherwise-valid fence
  plus a bare CR in unrelated prose returns `null` (this is the case that
  parses successfully, fail-open, on today's un-fixed code — confirmed
  empirically before applying the fix); CRLF fences still parse, unchanged.
- The adversarial timing test's bound tightens from 2000ms to 250ms (linear
  runs ~1-5ms; the old quadratic regex measured ~1000ms on this exact input,
  which a 2000ms bound failed to catch as a regression).
- `cd core && npm test` — full core suite green, including the new test.
- Root `npm test` — core + cli both green.

DONE means: the new guard rejects every input built from a bare CR, U+2028,
or U+2029, the new test is a true negative on the pre-fix code (parses
instead of rejecting) and a true positive on the fixed code, the tightened
250ms bound still passes reliably, and the full core and root suites are
green with nothing else weakened. STOPPED means: the guard cannot be made to
reject the adversarial cases without also rejecting a real, currently-tested
CRLF or LF input.
