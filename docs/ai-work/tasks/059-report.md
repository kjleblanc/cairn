# Task 059 — Report

## Correcting the Task 058 report (append-only)

`docs/ai-work/tasks/058-report.md` is history and was not edited. This section
is the correction.

That report justified the throw-site restore this way: "no row written during
that run ever passed its byte-back verification. The last log state Cairn itself
verified is therefore always the task-start snapshot." **That justification is
false at two of the five throw sites**, and the same false sentence stood in the
058 helper comment in `core/src/serial.ts`.

- At the `MODEL_RESULT_NOT_VERIFIED` site (the clean-start commit failure), the
  code only reaches the throw by falling through `if (!records.verified) return
  closeRecordRewrite(records)` — so `records.verified === true`. A DONE row that
  passed its byte-back check is on disk.
- At the offline-demo site the guard is `if (!closed.verified ||
  !verifyProtected(...))`. The second disjunct reaches the throw with
  `closed.verified === true`. Again a verified DONE row is on disk.

The outcome 058 shipped is still correct, for a reason it did not state:
**verified-as-written is not verified-as-true.** A byte-back check proves Cairn
wrote what it meant to write; it says nothing about whether the run those bytes
describe finished. A run that throws never completed, so its DONE row — and the
stone that row would earn — must not stand. The task-start snapshot is the last
log state that is both Cairn's own and still true of this run. That is the
reason now recorded in the helper comment and at each of the two sites where the
old wording was wrong.

## What changed

### The restore is read back and its failure is disclosed (`core/src/serial.ts`)

`restoreLogBeforeThrow(root, start)` now returns `boolean`. After
`writeFileSync` it reads the log back and returns whether the bytes match
`start.logText` — the same write-then-read-back discipline every other record
write in this file uses (`replaceDoneRecordsWithStopped`, lines 752-757). A
thrown filesystem error still lands in the `catch`, but the `catch` now returns
`false` rather than silently returning.

One new module-private helper composes the throw:

```ts
function recordVerificationFailed(detail: string, restored: boolean): Error {
  const unrestored = " The work log could not be restored and may carry rows Cairn did not write.";
  return new Error(`RECORD_VERIFICATION_FAILED: ${detail}${restored ? "" : unrestored}`);
}
```

All five throw sites (the adapter catch, the worker STOPPED close, the two
`replaceDoneRecordsWithStopped` sites, and the offline site) now capture the
boolean and throw through it. A failed restore produces, for example:

```
RECORD_VERIFICATION_FAILED: Model-authored evidence was retained without overwrite. The work log could not be restored and may carry rows Cairn did not write.
```

Fail-closed is preserved exactly: a `false` return changes only the message. The
throw always happens, the run still returns no result, and the must-inspect
semantics are unchanged. No exported signature changed; no rendered report bytes
changed; the structural `Disposition:` line rules are untouched (the helper
writes only `LOG.md`).

### The rationale is corrected in the code (`core/src/serial.ts`)

The helper's block comment now states the true reason (verified-as-written is
not verified-as-true; a thrown run never completed) and says outright that the
old reason does not hold at the two `replaceDoneRecordsWithStopped` sites. Each
of those two sites carries a one-line comment saying the row on disk may well
have passed its own check and goes anyway. The comment also names the
owner-edit tradeoff and points here.

### RED-first evidence (`core/test/serial.test.ts`)

New test: `a thrown close whose log restore cannot be written says so in the
thrown message (FIX / Task 059)`. A fake Codex process appends a forged
`| 001 | ... | DONE | ... | YES |` row to `LOG.md`, then `chmodSync(logPath,
0o444)`, then throws `CodexExecProcessError("CODEX_EXEC_STDIN_FAILED", null)` —
a directly thrown process error is the only path into serial.ts's adapter catch.
The test asserts the run still rejects, that the message starts
`RECORD_VERIFICATION_FAILED: `, that it carries the unrestored-log clause, and
that the forged row really did survive (so the warning is true, not decorative).
Permissions are restored in a `finally`.

The staging is portable and was NOT flaky: read-only refuses writes for every
user on Windows (`FILE_ATTRIBUTE_READONLY`) and for every non-root user on
POSIX. Rather than assume, a new `readOnlyBlocksWrites(root)` helper probes a
throwaway file once and the test calls `t.skip` if the probe shows the platform
or user ignores read-only (a root-owned container is the case that matters).
On this machine the probe held and the test ran for real — it did not skip, in
either the RED run or the GREEN run.

The existing 058 test (`a worker that forges a log row and forces a thrown close
leaves the log restored (Phase 3 Task 1)`) was strengthened to capture the
thrown error and assert `doesNotMatch(/could not be restored/)` — the clause
must not cry wolf when the restore did take. It covers the true branch of the
same boolean the new test covers false.

RED, against pre-fix `serial.ts` (the build PASSED, so this was a real assertion
failure and not a compile error):

```
✖ a thrown close whose log restore cannot be written says so in the thrown message (FIX / Task 059)
  AssertionError [ERR_ASSERTION]: the owner is told the log may carry rows Cairn did not write
    actual: 'RECORD_VERIFICATION_FAILED: Model-authored evidence was retained without overwrite.'
    expected: /The work log could not be restored and may carry rows Cairn did not write\./
ℹ tests 96 / pass 95 / fail 1
```

Files touched (all named in the brief's boundary of intent, plus this task's
records): `core/src/serial.ts`, `core/test/serial.test.ts`,
`docs/ai-work/tasks/059-brief.md`, `docs/ai-work/tasks/059-report.md`,
`docs/ai-work/LOG.md`.

## Checks run (all real, this session)

Covering tests, both in `core/test/serial.test.ts`:

- `a thrown close whose log restore cannot be written says so in the thrown
  message (FIX / Task 059)` — new; the `false` branch of the restore contract.
- `a worker that forges a log row and forces a thrown close leaves the log
  restored (Phase 3 Task 1)` — strengthened; the `true` branch, and the clause's
  absence on the ordinary path.

Command and real output:

- `cd core && npm test` — RED, before the fix: `tests 96 / pass 95 / fail 1`,
  the one failure being the new test's disclosure assertion (output above).
- `cd core && npm test` — GREEN, after the fix: `tests 96 / pass 96 / fail 0`,
  `skipped 0` (so the read-only staging really ran). The three Task 052 tests,
  both Task 051 brief-tamper tests, and every other existing test stay green
  unchanged.
- Root `npm test` — core `tests 96 / pass 96 / fail 0` and cli
  `tests 9 / pass 9 / fail 0`.
- `git status --porcelain` before staging — exactly ` M core/src/serial.ts` and
  ` M core/test/serial.test.ts`, plus this task's three record files.
- The app was not checked and not touched: no exported signature and no rendered
  report text changed. `app/src/renderer/screens/TaskRun.tsx` surfaces the throw
  message as run-error text, so the appended clause reaches the owner there with
  no app change.

## How to try it

```
git clone https://github.com/kjleblanc/cairn.git
cd cairn
npm ci && npm test
```

Read the `(FIX / Task 059)` test in `core/test/serial.test.ts`: a worker forges
a log row, makes `LOG.md` unwritable, and throws — the run still throws, and the
message now tells the owner the log may carry rows Cairn did not write.

## Limitations

- **Disclosed tradeoff (review Finding 3): the restore overwrites a log Cairn
  declined to overwrite.** At the two `replaceDoneRecordsWithStopped` sites, a
  null return means precisely "the on-disk records are not what Cairn wrote, so
  I declined to overwrite them" — and the throw-site restore then writes
  `LOG.md` anyway. For worker tampering that is the whole point: the row Cairn
  did not write is exactly the row that must not survive. For an owner who
  edited `LOG.md` by hand while a run was in flight, the same write discards
  that edit. It is recoverable — `LOG.md` is a committed file, so
  `git diff docs/ai-work/LOG.md` and `git checkout` reach the pre-run state and
  any committed edit is untouched — but an uncommitted mid-run owner edit to the
  work log is lost. The restore does not distinguish an owner's hand from a
  worker's; it cannot, and it chooses the tamper-resistant side.
- The unrestored-log clause is a message, not a guarantee. When the restore
  fails, the forged or unverified rows really are still on disk; the owner must
  inspect. Cairn has no other channel here — a throw returns no result, so there
  is no report and no row to carry the warning.
- The read-only staging is skipped, not failed, on a platform or user that
  ignores read-only (POSIX root, typically a container). On such a host the
  `false` branch of `restoreLogBeforeThrow` goes uncovered. The helper is
  module-private, so a direct unit assertion would have required exporting it;
  the probe-and-skip keeps the coverage honest without widening the API.
- Everything Task 058 listed as a limitation still holds: only Cairn's own work
  log is restored (worker product files, brief, and report stay retained); a
  thrown run can leave a brief and report with no log row (intentional, and
  `nextTaskNumber` reads the task directory, not the log); and a throw outside
  these five verification failures leaves the log as it lies, since
  `runSerialTask` deliberately has no outer catch.
- The three post-worker sites other than the adapter catch still get their
  restore by audit, not by tests of their own — reaching them needs tampering
  between two of Cairn's own writes.
- Milestone movement: NO — this is a review fix on a hardening fix, not a new
  capability.

Disposition: DONE
