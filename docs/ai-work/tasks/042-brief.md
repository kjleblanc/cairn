# Task 042 — Brief

Requested visible outcome: a review finding against `core/src/claims.ts`
(raised in the Task 041 review) said the `cairn-claims` fence-extraction
regex is O(n^2): `/^```cairn-claims[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/gm`
line-anchors on every opener, and when no closer follows, its lazy
`[\s\S]*?` body group re-scans all the way to end-of-string before giving
up. A crafted message with one opener per line pays that full rescan once
per line. This parser runs in the Electron main process on text that came
from the worker (an untrusted or at least adversarial-shaped source); a
crafted final message within the existing 262,144-character cap could stall
the UI thread while `parseWorkerClaims` runs. Fix it so the same input
parses in linear time with identical output for every case already covered
by tests, plus the caps that had no test yet.

Boundary of intent: `core/src/claims.ts` (replace only the fence-extraction
step inside `parseWorkerClaims` with a single-pass line walk; every
downstream validation — key set, enum checks, size caps, check-object
shape — is untouched) and `core/test/claims.test.ts` (append new tests;
the three existing tests stay byte-identical). No API change (same
exported signature and `WorkerClaims` shape), no new files, no other
module touched, no new dependency, no version bump.

The line walk must reproduce the old regex's exact semantics for every
input already under test: split the message on `/\r?\n/`; walk lines with
an open/closed state — a line matching `/^```cairn-claims[ \t]*$/` while
closed opens a fence; a line matching `/^```[ \t]*$/` while open closes it,
yielding the body collected since the opener (joined with `"\n"`); any
other line while open, including one that merely looks like another
opener, is body (matching the old regex's lazy behavior of just consuming
non-matching text); anything while closed is prose; an unclosed trailing
fence at end of input is not a fence, exactly as the old regex found no
match for it. Count completed fences: exactly one parses its body as JSON
and continues through the existing validation; zero or two-or-more returns
`null`, unchanged from today.

Checks that show the outcome holds:

- `core/test/claims.test.ts`: an adversarial case —
  `` "```cairn-claims\n".repeat(262_144 / 16) `` sliced to exactly 262,144
  chars (one opener per line, no closer, right at the size cap) — returns
  `null` and completes well under a loose 2000ms wall-clock bound (the old
  regex measured ~880ms-1100ms on this exact input on this machine; a
  linear walk should take low single-digit milliseconds); a total-size
  boundary case — a message padded to exactly 262,144 chars containing one
  valid fence parses, one char over is `null`; the check `name` (200),
  check `result` (500), `checks` count (30), `howToTry` (2000), and
  `limitations` (2000) caps, none of which had a dedicated test before,
  each return `null` one character/entry past the boundary; the three
  existing tests (well-formed fence, every listed malformed shape, empty
  strings/lists) stay byte-identical and green.
- `cd core && npm test` — full core suite green, including all new tests.
- Root `npm test` — core + cli both green.

DONE means: the fence extraction is a single-pass, linear-time walk with
the exact fence grammar above, every currently-tested input (existing
three tests) still produces byte-identical results, the new adversarial
and boundary tests pass, and the full core and root suites are green with
nothing else weakened. STOPPED means: the line-walk semantics cannot be
made to agree with the old regex on some already-tested input without
widening scope beyond the fence-extraction step.
