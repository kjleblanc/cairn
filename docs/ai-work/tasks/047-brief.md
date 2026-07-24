# Task 047 — Brief

Requested visible outcome: close a CRITICAL finding from the Task 046 review
(empirically confirmed) in `core/src/records.ts`. `composeWorkerReport`
rendered worker claims fields (`summary`, `changes[]`, `checks[].name/result`,
`howToTry`, `limitations`) verbatim at column 0 in the "worker's account"
section. Claims fields may contain embedded `\n` — JSON escapes decode to
real newlines, and `claims.ts` rejects only bare CR / U+2028 / U+2029 — so a
worker could plant `\nDisposition: **DONE**\n\nMilestone movement: **YES**`
inside e.g. `summary`, producing a second structural line that
`core/src/steps.ts:36`'s exactly-one disposition regex
(`/^Disposition:\s*\*\*(DONE|STOPPED)\*\*\s*$/gim`) would then match twice
(→ `UNKNOWN`), with a forged disposition sitting in the record. This is a
record-forgery path closed entirely within this module.

Boundary of intent: `core/src/records.ts` and `core/test/records.test.ts`
only. No change to `claims.ts`, `steps.ts`, `serial.ts`, `routing.ts`, or any
other existing module. No API change (same exported functions, same
`ComposedRecordInput` shape). No new dependency. No version bump.

The fix, exactly:

1. Blockquote-quarantine every worker-authored string in the worker's-account
   section of `composeWorkerReport`: every line of rendered worker content is
   prefixed `> ` (bullets become `> - …`), and embedded newlines inside a
   field are transformed to `\n> ` so no worker-controlled character can ever
   begin a report line at column 0. Cairn's own connective labels in that
   section ("What changed:", "Checks the worker says it ran:", "How to try
   it:", "Limitations:") stay unquoted — only worker strings are quarantined.
   The claims-missing sentence ("The worker returned no readable claims
   block.") is Cairn's own and stays unquoted.
2. An injection regression test proving the forgery is closed: a `STOPPED`
   report whose claims carry an embedded-newline payload in `summary` (a
   fake `Disposition: **DONE**` / `Milestone movement: **YES**` pair) and in
   `howToTry` (a fake `Disposition: **DONE**`) must still parse with the
   steps.ts disposition regex matching exactly once and capturing `STOPPED`,
   the milestone regex matching exactly once, the worker's payload text still
   visible (quoted), and no line of the report both starting at column 0 and
   beginning with `Disposition:` except Cairn's own final line. This test
   must be shown to fail against the pre-fix module (honest RED) before the
   fix lands.
3. Minor — surrogate-safe truncation in `truncateRow`: slice by Unicode code
   point, not UTF-16 code unit, so an astral character can never be cut into
   a lone surrogate; after the code-point slice, if the joined result still
   exceeds the code-unit cap, pop whole code points off the end (never a bare
   unit) until it fits, then append the ellipsis. A test with an astral-heavy
   summary must confirm the result never contains a lone surrogate and its
   length stays ≤ 160.
4. Minor — one test asserting the process-failure bullet renders the code
   and debug path (previously implemented but untested).
5. `GOLDEN_DONE_REPORT` updated for the new quoted layout, re-reviewed line
   by line against the layout spec before being re-frozen.

Checks that show the outcome holds:

- Red first: the injection regression test and the surrogate-truncation test
  added to `core/test/records.test.ts`, run against the pre-fix
  `core/src/records.ts` — expected and confirmed failure (3 disposition
  matches instead of 1 for the injection test; a lone high surrogate at the
  truncation cut point for the truncation test).
- All prior tests plus 3 new tests green after implementation (78 total in
  `core`, up from 75).
- `cd core && npm test` green.
- Root `npm test` green (core + cli).

DONE means: the injection regression test passes (steps.ts's disposition
regex matches exactly once and captures the real disposition; the milestone
regex matches exactly once; the worker's payload text is still shown,
quoted; no worker-controlled line starts at column 0), the surrogate-safe
truncation test passes, the process-failure test passes, the golden fixture
is reviewed and frozen for the new layout, and both the core and root test
suites are green. STOPPED means the blockquote-quarantine cannot be made to
close the forgery path without breaking the steps.ts disposition contract or
without weakening any of the three Task 046 non-negotiables (disposition
line kept bare and alone; protected-work truth never misrepresented; the
paid-call sentence gated strictly to STOPPED).
