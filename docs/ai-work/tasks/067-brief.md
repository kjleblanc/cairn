# Task 067 — Brief

Requested visible outcome: fix the one Important finding from the Task 066
review — the adapter-throw safety close can throw a raw Git error out of
`runSerialTask`, skipping the work-log restore that Tasks 058/059 made binding.

Task 066 added two Git reads to that close (`core/src/serial.ts`): the bounded
change scan and the protected-work verification whose real results the composed
record carries. They run BEFORE `writeSafetyRecordsWhenUnclaimed`, and they
must — reading them after Cairn writes its own records would let Cairn's own log
append read back as a protected-work change on a start-dirty log, which is a
false record rather than a forced inspection. But neither call was wrapped, and
`git`/`gitZ` throw on a non-zero exit. This project's threat model includes a
worker corrupting the repository, so that window is reachable: Git fails, the
raw `execFileSync` error escapes, no STOPPED record is written, and
`restoreLogBeforeThrow` never runs — leaving a worker-forged DONE row standing
in Cairn's own append-only log. The binding rule it breaks: after ANY thrown
`runSerialTask`, LOG.md contains exactly what Cairn last wrote.

The fix is not to reverse the ordering. Both values are computed inside one
private helper that returns null when Git cannot answer, and the close falls
through to `restoreLogBeforeThrow` + `recordVerificationFailed` — the same door
every other unverifiable close already uses. No composed value is invented for
that branch: it never returns one.

Boundary of intent: `core/src/serial.ts` and `core/test/serial.test.ts`, plus
this task's three record files. The reviewer confirmed the worker lane and the
demo lane have the same pre-existing shape and ledgered them for the final
whole-branch review; this task deliberately does NOT widen to them, and fixes
only the site Task 066 introduced.

Checks that will show the outcome holds:

- A new test in `core/test/serial.test.ts` — RED first — where the fake worker
  forges a DONE row into LOG.md, corrupts `.git/index`, then throws. The run
  must reject with `RECORD_VERIFICATION_FAILED` (not a raw Git error), the log
  must be byte-identical to the task-start snapshot, and no report may exist.
  Only the index file is corrupted, so `.git` stays present and the run lock
  still releases — the failure under test is the one being staged, not a
  collapsed fixture.
- `cd core && npm test` and `npm test` at the repo root — both green, with
  Task 066's four tests and every pre-existing byte-back test unmodified.

DONE means: a Git failure in that window closes as Cairn's own record failure
with the log restored, proved by a test that fails against the unfixed code.
STOPPED means the failure cannot be staged portably, or the restore does not
take.
