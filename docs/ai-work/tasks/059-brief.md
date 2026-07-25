# Task 059 — Brief

Requested visible outcome: three Important review findings on Task 058's
throw-site log restore are closed. The restore is read back like every other
record write in `core/src/serial.ts`, and a restore that did not take is named
in the very message the owner sees instead of being swallowed; the helper's
recorded rationale states the reason that is actually true at all five throw
sites; and the tradeoff the restore accepts is disclosed in this task's report.

Boundary of intent: `core/src/serial.ts` and `core/test/serial.test.ts`, plus
this task's three record files. No signature changes to any export, no rendered
report bytes changed, no change to the structural `Disposition:` line rules. No
version bump (still 0.2.1). No new dependency. No milestone movement — this
hardens Task 058, it does not add a capability. `docs/ai-work/tasks/058-report.md`
is NOT edited: records are history, and the correction lands append-only here.

The findings, all confirmed at HEAD `577822c`:

1. The recorded rationale is false at two sites. The 058 comment claims "no row
   written during the run passed its byte-back". At the `MODEL_RESULT_NOT_VERIFIED`
   site the fall-through requires `records.verified === true`, and at the offline
   site the guard is reachable through its second disjunct with
   `closed.verified === true` — a verified DONE row is on disk at both. The
   OUTCOME is still right, for a different reason: verified-as-written is not
   verified-as-true, and a run that threw never completed, so its DONE row and
   the stone it would earn must not stand.
2. The restore is unverified and swallows its own failure, alone among the
   record writes in this file (`replaceDoneRecordsWithStopped` reads every write
   back). An unwritable log therefore threw a message identical to the one a
   clean restore throws.
3. The tradeoff is undisclosed: at the two `replaceDoneRecordsWithStopped` sites
   a null return means "the on-disk records are not what Cairn wrote, so I
   declined to overwrite" — and the restore overwrites the log anyway.

The fix — `restoreLogBeforeThrow` reads the log back after writing and returns
whether the restore took; one new `recordVerificationFailed(detail, restored)`
composes the throw and appends a plain clause when it did not. Fail-closed: a
false return never suppresses the throw. The comment is rewritten to the true
reason. Finding 3 needs no code beyond this; it is disclosed in the report.

Checks that show the outcome holds:

- `cd core && npm test` — core suite green, including a new red-first test that
  stages a read-only `LOG.md` and asserts the thrown message discloses the
  failed restore, reproduced against pre-fix `serial.ts` (build passing,
  assertion failing).
- Root `npm test` — core + cli green.
- `git status --porcelain` before staging matches exactly the two files above
  plus this task's three record files.

DONE means: the restore is read back and its failure disclosed in the thrown
message, proven by a red-first run against pre-fix code; the recorded rationale
is true at all five sites; the tradeoff and 058's error are named in this
report; every suite is green; and the exact-path commit holds only the files
this brief names. STOPPED means a check failed, the red-first staging could not
be made to hold, or the changed set held anything unexpected.
