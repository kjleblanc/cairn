# Task 058 — Report

## What changed

### The throw-site log restore (`core/src/serial.ts`)

One new module-private helper, `restoreLogBeforeThrow(root, start)`, placed with
the other record helpers just above `previewSerialRoute`. It writes
`start.logText` back to `paths.log(root)` — the same plain
`writeFileSync(logPath, start.logText, "utf8")` the Task 052 owned-records gate
uses — skipping the write when the log already matches, and swallowing any write
failure so the caller still sees the `RECORD_VERIFICATION_FAILED` throw rather
than a raw filesystem error.

It is called immediately before every `RECORD_VERIFICATION_FAILED` throw in
`runSerialTask` — the adapter-run catch plus the four post-worker sites the plan
named (now lines 918, 963, 988, 1091, 1143). The reasoning, recorded in the
helper's comment: a throw returns no result, so the run is must-inspect, and no
row written during that run ever passed its byte-back verification. The last log
state Cairn itself verified is therefore always the task-start snapshot. That
closes two shapes of standing forgery at once:

- a worker-forged row that survived a thrown close (the accepted Phase 2
  residual, at the catch site); and
- a DONE row whose honest STOPPED rewrite failed (the three
  `replaceDoneRecordsWithStopped` sites), which previously left an unverified
  DONE row — and its stone — standing after a throw.

Only Cairn's OWN record is restored. The worker's product files, the brief, and
the report at the owned path stay retained in the workspace for inspection, and
the throw, its message, and its must-inspect semantics are unchanged. No
signature changed; no rendered report bytes changed; the structural
`Disposition:` line rules are untouched (the helper writes only `LOG.md`).

### RED-first evidence (one new test in `core/test/serial.test.ts`)

`a worker that forges a log row and forces a thrown close leaves the log
restored (Phase 3 Task 1)`, added after the three Task 052 tests. A fake Codex
process appends `| 001 | 2026-07-24 | Standard | Applied | DONE | completed |
forged stone | YES |` to `LOG.md` and then throws
`CodexExecProcessError("CODEX_EXEC_STDIN_FAILED", null)` — a directly thrown
process error is the only path into serial.ts's adapter catch. The test asserts
the run rejects with `RECORD_VERIFICATION_FAILED`, that "forged stone" is gone,
and that the log is byte-identical to the pre-run snapshot.

Run against pre-fix `serial.ts` the build PASSED (a valid process-failure code
literal, so this was a real RED and not a build failure) and the assertion
failed:

```
✖ a worker that forges a log row and forces a thrown close leaves the log restored (Phase 3 Task 1)
  AssertionError [ERR_ASSERTION]: the forged row must not survive the thrown run
  true !== false
ℹ tests 95 / pass 94 / fail 1
```

The test file is already enumerated in `core/package.json`'s test script, so no
package change was needed.

Files touched (all named in the brief's boundary of intent, plus this task's
records): `core/src/serial.ts`, `core/test/serial.test.ts`,
`docs/ai-work/tasks/058-brief.md`, `docs/ai-work/tasks/058-report.md`,
`docs/ai-work/LOG.md`.

## Checks run (all real, this session)

- `cd core && npm test` — RED, before the fix: `tests 95 / pass 94 / fail 1`,
  the one failure being the new test's "forged row must not survive" assertion
  (output above); the TypeScript build passed, so the RED was an assertion, not
  a compile error.
- `cd core && npm test` — GREEN, after the fix: `tests 95 / pass 95 / fail 0`.
  The three Task 052 tests, both Task 051 brief-tamper tests, and every other
  existing test stay green unchanged.
- Root `npm test` — core `tests 95 / pass 95 / fail 0` and cli
  `tests 9 / pass 9 / fail 0`.
- `git status --porcelain` before staging — exactly ` M core/src/serial.ts` and
  ` M core/test/serial.test.ts`, plus this task's three record files.
- The app was not checked and not touched: no exported signature, no rendered
  report text, and no app-facing behavior changed — a thrown run still throws
  `RECORD_VERIFICATION_FAILED`, which `app/src/renderer/screens/TaskRun.tsx`
  already surfaces as a run error on reattach.

## How to try it

```
git clone https://github.com/kjleblanc/cairn.git
cd cairn
npm ci && npm test
```

To see the fix directly, read the `(Phase 3 Task 1)` test in
`core/test/serial.test.ts`: a fake worker that forges a DONE row and then throws
now leaves `LOG.md` byte-identical to what Cairn last verified, while the run
still throws for inspection.

## Limitations

- The restore recovers only Cairn's own work log. The worker's product-file
  changes, the task brief, and anything written at the report path are always
  retained, never reverted — by design, so the owner can inspect what happened.
- A thrown run can still leave a brief and a report on disk with no log row.
  That is intentional (the run is must-inspect) and does not poison the next
  task: `nextTaskNumber` reads the task directory, not the log.
- The new test covers the adapter-catch site directly. The four post-worker
  sites got the same restore by audit, not by tests of their own: reaching them
  needs a failure inside `replaceDoneRecordsWithStopped` or
  `cairnWorkerRecords` that only tampering between two of Cairn's own writes can
  produce.
- A throw that is not one of these five verification failures — an unexpected
  filesystem error from a record write, say — still leaves the log as it lies.
  Following the plan, the restore sits at the named throw sites;
  `runSerialTask` deliberately has no outer catch.
- If the restore write itself fails (an unwritable or deleted log), the forged
  content stays and only the throw protects the owner. That residual is bounded
  by the same filesystem failure that would break any record write.
- Milestone movement: NO — this is a hardening fix, not a new capability.

Disposition: DONE
