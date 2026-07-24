# Task 052 — Brief

Requested visible outcome: close the last Phase 2 Critical (C1). In the worker
lane, tampering with the append-only work log or pre-writing the task report
path can no longer forge a DONE, a log row, or a stone: Cairn restores its own
records and stops honestly, with every suite still green.

Boundary of intent: `core/src/serial.ts`, `core/src/records.ts`,
`core/test/serial.test.ts`, plus this task's three record files. No version
bump (this is a review fix inside 0.2.0, not a release). No new dependency. No
milestone movement — this hardens existing behavior, it does not add a
capability.

The finding (Critical C1, confirmed at HEAD `1f3e06c`): Task 051 guards the
task brief before any DONE record is authored, but not `docs/ai-work/LOG.md`.
On a clean start the log is neither in the protected-path snapshot (that
protects status paths plus tracked `docs/ai-work/tasks/` files) nor guarded
pre-write. A worker that appends a forged `DONE | … | YES` row to the log and
claims DONE reaches the DONE branch: `cairnWorkerRecords` appends the real DONE
row onto the tampered log, its byte-back fails, and `closeRecordRewrite`'s
precondition (`currentLog === start.logText + doneRow`) also fails — so the run
THROWS with the forged row standing and `projectStatus().stones` inflated.
Sibling Minor M2: a worker that pre-writes `NNN-report.md` produces a raw `wx`
EEXIST throw (fail-closed but unclean).

The fix — an owned-records integrity gate over all three owned records before
ANY record write in the worker lane:

1. **Brief** byte-identical to the text Cairn wrote at task start (the 051
   check, folded into the gate).
2. **Log intact** — on mismatch, the log is Cairn's own record, so Cairn
   restores it from the task-start snapshot BEFORE the stop close writes its
   records, and closes honestly as STOPPED `RECORD_VERIFICATION_FAILED`. The
   report discloses that the worker's log modification was discarded and its
   product-file changes remain retained for inspection.
3. **Report slot empty** — on violation, the report path is Cairn-owned, so the
   stop close OVERWRITES the worker's file (plain write, not `wx`, in exactly
   this disclosed case) with the honest STOPPED report, disclosing the
   replacement.

The gate runs before the claims-lane stop closes AND before the DONE authoring,
produces `RECORD_VERIFICATION_FAILED`, and routes through the same honest
stop-close. The demo lane and the adapter-throw catch path are untouched; all
051 behavior stays as-is.

Checks that show the outcome holds:

- `cd core && npm test` — core suite green, including the three new red-first
  tests (log-append tamper, log-truncate tamper, report pre-write) reproduced
  against pre-fix code.
- Root `npm test` — core + cli green.
- `cd app && npm run typecheck && npm run test:unit && npm run build:vite &&
  npx playwright test` — all green.
- `git status --porcelain` before staging matches exactly this task's file list
  plus its three record files.

DONE means: the log-forgery and report-pre-write holes are closed and proven by
red-first tests run against pre-fix code; the restore/overwrite recoveries are
contract-honest (Cairn recovers only its OWN records; worker product files stay
retained); every suite is green; and the exact-path commit holds only the files
this brief names plus the three records. STOPPED means a gate failed, the fix
could not be verified, or the changed set held anything unexpected.
