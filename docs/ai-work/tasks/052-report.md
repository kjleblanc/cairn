# Task 052 — Report

## What changed

### The owned-records integrity gate (`core/src/serial.ts`)

The task brief, the append-only work log (`docs/ai-work/LOG.md`), and the task
report path are all Cairn-owned records that live OUTSIDE the protected-path
snapshot: the brief and report are written untracked at task start, and the log
is one Cairn appends to itself. Task 051 guarded only the brief. This task
replaces that single brief check with a three-part gate that runs in the worker
lane BEFORE any record-writing close — the claims-lane stop closes and the DONE
authoring alike:

- **Brief** must byte-equal `contractMarkdown` (the 051 check, folded in). A
  tampered or missing brief is retained as evidence and only triggers the honest
  stop.
- **Log** must byte-equal `start.logText`. On mismatch Cairn RESTORES the log by
  writing the task-start snapshot back — done inside the gate, BEFORE the stop
  close appends its row, so the close's byte-back verification starts from the
  pristine log.
- **Report slot** must be empty. If the worker pre-wrote the report path, the
  stop close OVERWRITES it (plain `writeFileSync` with flag `"w"`, not `"wx"`) in
  exactly this one disclosed case.

On any violation the gate closes as STOPPED `RECORD_VERIFICATION_FAILED` through
the existing `closeStopped` path, now carrying a `RecordRecovery`
(`{ disclosure, overwriteReport }`). The recovery is contract-honest: Cairn
recovers only its OWN records; the worker's product-file changes stay retained
in the workspace for inspection. A code comment records the reasoning — restoring
the log is not destroying worker evidence (product files stay retained), whereas
leaving a worker-forged row standing would be dishonest.

The gate is the single owned-records check for the whole worker lane: the old
DONE-branch brief check and its `startBriefPath` local were removed (the gate
runs earlier and covers the DONE path, so no forged DONE record can be authored).
The DEMO lane (`writeClosedRecords`) and the adapter-throw catch path
(`writeSafetyRecordsWhenUnclaimed`) are untouched; `replaceDoneRecordsWithStopped`
and all other 051 behavior stay as-is.

### The disclosure line (`core/src/records.ts`)

`ComposedRecordInput` gains an optional `recordRecovery?: string | null`
(additive — every existing construction site stays valid). When set,
`composeWorkerReport` renders it as one Cairn-authored bullet under "Verified by
Cairn". `cairnWorkerRecords` passes the gate's disclosure through it and, when
`overwriteReport` is set, authors the report with `"w"` instead of `"wx"`. The
two disclosure sentences are:

- Log restore: "The worker modified the append-only work log; Cairn restored it
  from the task-start snapshot and recorded this stop. The worker's modification
  was discarded from the log; its product-file changes remain retained in the
  workspace for inspection."
- Report overwrite: "The worker pre-wrote the task report path; Cairn replaced it
  with this honest record."

Both fire together when both records were tampered.

### RED-first evidence (three new tests in `core/test/serial.test.ts`, run against pre-fix `serial.ts`)

- **Log-append tamper** — a fake worker writes a product file, appends a forged
  `| 001 | … | DONE | completed | forged | YES |` row to `LOG.md`, and returns a
  DONE/YES claims fence: `runSerialTask` THREW
  `RECORD_VERIFICATION_FAILED: Task records were retained for inspection.` with
  the forged row standing (`closeRecordRewrite`'s precondition failed because the
  forged row sat between the header and the appended DONE row).
- **Log-truncate tamper** — a fake truncates `LOG.md` to just its header
  (discarding a seeded committed history row): same `RECORD_VERIFICATION_FAILED`
  throw, history lost.
- **Report pre-write** — a fake pre-writes its own `001-report.md`: a raw
  `EEXIST: … open '…001-report.md'` throw from the `"wx"` report write (Minor M2).

### GREEN after the fix

All three return STOPPED `RECORD_VERIFICATION_FAILED` (no throw):

- Log-append: `LOG.md` equals the pristine start log plus exactly ONE
  Cairn-authored STOPPED row — the forged row is GONE — `projectStatus().stones`
  is 0, HEAD unmoved, report disposition STOPPED with the restoration disclosure,
  the worker's product file retained.
- Log-truncate: the seeded history is restored in full plus one STOPPED row.
- Report pre-write: the report at the owned path is Cairn's honest STOPPED record
  (the forgery gone, exactly one structural `Disposition:` line) carrying the
  replacement disclosure, with exactly one STOPPED log row and the product file
  retained.

The 051 brief-tamper tests (`… edits its own brief …`, `… deletes its own
brief …`) and every existing test stay green unchanged.

Files touched (all named in the brief's boundary of intent, plus this task's
records): `core/src/serial.ts`, `core/src/records.ts`,
`core/test/serial.test.ts`, `docs/ai-work/tasks/052-brief.md`,
`docs/ai-work/tasks/052-report.md`, `docs/ai-work/LOG.md`.

## Checks run (all real, this session)

- `cd core && npm test`:
  ```
  core: tests 91 / pass 91 / fail 0
  ```
  Up from 88 at Task 051: +3 red-first tests. All three live in the
  already-enumerated `core/test/serial.test.ts`, so `core/package.json`'s test
  file list needed no change. `core/test/records.test.ts` was not touched (the
  `recordRecovery` field is optional and its DONE golden-layout test — which
  passes no recovery — stays byte-identical).
- Root `npm test` — core (91) + cli (9) green.
- `cd app && npm run typecheck` — clean, no errors.
- `cd app && npm run test:unit` — 43/43 pass, unchanged (no app surface touched).
- `cd app && npm run build:vite` — clean build.
- `cd app && npx playwright test` — 24/24 pass (workers:1), unchanged.
- RED-first reproduction was run against pre-fix `serial.ts` (see above) and
  captured the two `RECORD_VERIFICATION_FAILED` throws and the raw `EEXIST`
  before the fix turned all three into honest STOPPED closes.
- `git status --porcelain` before staging — matched exactly the three code/test
  files above plus this task's three record files.

## How to try it

```
git clone https://github.com/kjleblanc/cairn.git
cd cairn
npm ci && npm test
```

To see the fix directly, read the three `(FIX / Task 052)` tests in
`core/test/serial.test.ts`: a fake worker that appends to, truncates, or
pre-empts a Cairn-owned record now closes STOPPED with the record restored or
replaced, no DONE row, and no stone.

## Limitations

- The gate recovers only Cairn's OWN records (the log and the report path). The
  worker's product-file changes are always retained, never reverted or cleaned —
  by design, so the owner can inspect what the worker did.
- The gate reads the three owned records once, after the worker returns and
  before any record write; it assumes the workspace is quiescent at that point
  (the timeout/orphan case is handled separately by the run lock, unchanged).
- Milestone movement: NO — this is a review hardening fix inside 0.2.0, not a new
  capability.

Disposition: DONE
