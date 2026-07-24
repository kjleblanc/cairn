# Task 046 — Brief

Requested visible outcome: implement Task 8 of the Cairn Phase 2 core-surgery
plan — the record composition module `core/src/records.ts`. It gives Cairn a
pure function that composes a worker's task report and its one-line LOG.md
row, with a hard separation between what Cairn itself verified (`protectedIntact`,
`filesChanged` from Git, the `commit` result) and what the worker merely
claims (its own `WorkerClaims` account, clearly labeled and never treated as
verified fact). This is a purely additive module: nothing else in the repo
calls it yet — Task 9 of the plan wires it into the serial run path.

Boundary of intent: create `core/src/records.ts` and
`core/test/records.test.ts` only; register the new compiled test file in
`core/package.json`'s enumerated `test` script. No change to `serial.ts`,
`steps.ts`, `claims.ts`, `routing.ts`, or any other existing module. No new
dependency. No version bump.

Three non-negotiables carried from the Phase 2 global constraints and the
Task 8 brief:

1. `Disposition: **DONE**` / `**STOPPED**` is alone on its own line so
   `core/src/steps.ts:36`'s end-anchored regex
   (`/^Disposition:\s*\*\*(DONE|STOPPED)\*\*\s*$/gim`) keeps matching exactly
   once; the STOPPED reason lives in its own preceding paragraph, never on
   the disposition line itself.
2. Every "Verified by Cairn" line states the REAL result the caller
   supplies — never a fixed phrase. In particular, "Protected starting
   work" renders `byte-identical` only when the caller's `protectedIntact`
   boolean is `true`; a `PROTECTED_WORK_CHANGED` input (protectedIntact:
   `false`) can never render `byte-identical`.
3. The paid-call sentence ("any cost for that call is already spent")
   appears only when `disposition === "STOPPED"`; a verified DONE report
   never carries stopped-it language even when `paidCallStarted` is `true`.

The privacy paragraph matches the wording Task 044 established in
`serial.ts`: "Cairn retained only the worker's final message (for claims
verification) and bounded numeric evidence; no other item text, reasoning,
commands, paths, stdout, stderr, thread IDs, account details, authentication
data, or credentials."

Checks that show the outcome holds:

- Red first: `core/test/records.test.ts` created and run before
  `core/src/records.ts` exists — expected and confirmed build failure
  (`Cannot find module '../src/records.js'`).
- Five new tests, all green after implementation:
  - a DONE report separates Cairn-verified facts from worker claims (and
    never states "already spent" language).
  - a `PROTECTED_WORK_CHANGED` report never claims protected work is
    intact, states `CHANGED`, lists the protected path, and does carry the
    "already spent" clause and "must be inspected" language.
  - a claims-missing STOPPED report says so plainly, with `Milestone
    movement: **NO**`.
  - the DONE report matches a golden fixture exactly (reviewed line by
    line against the layout spec before being frozen).
  - the LOG.md row summary is one bounded (≤160 char) honest line for both
    DONE and STOPPED, with truncation-plus-ellipsis verified separately by
    hand for an oversized summary (not exercised by the fixed test file).
- `cd core && npm test` green (70 pre-existing + 5 new = 75).
- Root `npm test` green (core 75 + cli 9 = 84).

DONE means all five new tests pass including the golden layout comparison,
the disposition-line regex parses exactly once in every case, the paid-call
sentence appears only on STOPPED, protected-work truth is never
misrepresented, the privacy paragraph is worded exactly as Task 044
established, the core suite is green with `dist/test/records.test.js`
registered in `core/package.json`, and the root suite is green. STOPPED
means the layout in the Task 8 brief cannot be honored without weakening
any of the three non-negotiables above, or the golden fixture cannot be
made to match the brief's spec after review.
