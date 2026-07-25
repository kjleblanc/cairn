# Task 058 — Brief

Requested visible outcome: close the catch-path residual Task 052 accepted. A
worker that forges a row in the append-only work log and then forces a thrown
close can no longer leave that forged row standing: after ANY thrown
`runSerialTask`, `docs/ai-work/LOG.md` holds exactly what Cairn last verified —
the task-start snapshot — with every suite still green.

Boundary of intent: `core/src/serial.ts` and `core/test/serial.test.ts`, plus
this task's three record files. No signature changes, no rendered report bytes
changed, no change to the structural `Disposition:` line rules. No version bump
(this is Phase 3 Task 1, a hardening fix inside 0.2.1). No new dependency. No
milestone movement — this hardens existing behavior, it does not add a
capability.

The residual (Phase 2's one accepted gap, confirmed at HEAD `3419ca2`): Task
052's owned-records gate protects the RETURN path — a worker that tampers with
the log and returns normally is restored and closed honestly as STOPPED. The
CATCH path was untouched. A worker that appends a forged
`| 001 | … | DONE | completed | … | YES |` row and then THROWS reaches the
adapter catch, where `writeSafetyRecordsWhenUnclaimed` sees the tampered log,
returns null, and the run throws `RECORD_VERIFICATION_FAILED` with the forged
row standing in a must-inspect run — a forged stone in the count.

The fix — one throw-site restore helper, `restoreLogBeforeThrow`, applied at
every `RECORD_VERIFICATION_FAILED` throw in `runSerialTask` (the adapter catch
plus the four post-worker sites). No row written during a thrown run ever passed
its byte-back verification, so the last log state Cairn itself verified is
always `start.logText`; the helper writes it back with the same mechanics the
052 gate uses, then the throw and its must-inspect semantics stand unchanged.
Only Cairn's OWN record is restored: the worker's product files, its brief, and
its report stay retained for inspection. A restore that cannot be written is
swallowed so the caller still sees `RECORD_VERIFICATION_FAILED`.

Checks that show the outcome holds:

- `cd core && npm test` — core suite green, including the new red-first test
  reproduced against pre-fix `serial.ts` (build passing, assertion failing).
- Root `npm test` — core + cli green.
- `git status --porcelain` before staging matches exactly the two files above
  plus this task's three record files.

DONE means: the catch-path hole is closed and proven by a red-first test run
against pre-fix code; the restore is contract-honest (Cairn restores only its
own log; worker evidence stays retained); the throw and its must-inspect
semantics are unchanged; every suite is green; and the exact-path commit holds
only the files this brief names. STOPPED means a check failed, the fix could not
be verified, or the changed set held anything unexpected.
