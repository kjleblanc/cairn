# Task 067 — Report

Review fix on Task 066: one Important finding. The finding was correct and is
fixed; the review's three approved deviations from the plan stand unchanged.

## What changed

### `core/src/serial.ts` — `safetyCloseFacts(...)`, and a fall-through that closes honestly

The adapter-throw safety close's two Git reads — the bounded change scan and the
protected-work verification whose real results Task 066's composed record
carries — moved into one private helper that returns null when Git cannot
answer:

```ts
function safetyCloseFacts(root, start, owned, demo, reason):
  { filesChanged: readonly string[]; protectedIntact: boolean } | null
```

At the close site, a null falls through to the same door every other
unverifiable close uses:

```ts
const facts = safetyCloseFacts(projectRoot, start, ownedSet, demo, reason);
if (!facts) {
  const restored = restoreLogBeforeThrow(projectRoot, start);
  throw recordVerificationFailed(
    "Git could not be read to compose this stop's record; model-authored evidence was retained without overwrite.",
    restored,
  );
}
```

No composed value is invented for that branch — it never returns one.

**The ordering was deliberately NOT reversed.** Both reads still happen before
`writeSafetyRecordsWhenUnclaimed`. Reading them afterwards would let Cairn's own
log append read back as a protected-work change on a start-dirty log: a false
record, which is worse than a forced inspection. The reviewer asked for exactly
this shape, and the helper's doc comment records the reason so a later reader
does not "simplify" the ordering away.

**Scope held.** The reviewer confirmed the worker lane (`closeStopped` →
`cairnWorkerRecords`) and the demo lane have the same pre-existing shape and
ledgered them for the final whole-branch review. This task did not widen to
them; it fixed only the site Task 066 introduced.

## TDD evidence

**The stage.** The fake worker appends a forged DONE row to Cairn's
append-only log, corrupts `.git/index` (a plain file write — `.git` itself
stays present, so the run lock still releases and the failure under test is the
one being staged), then throws `CODEX_EXEC_STDIN_FAILED`. The first Git read in
the close window is `git diff --name-only -z --`, which reads the index and
fails.

**RED, in the suite:**

```
✖ a Git failure while composing the stop record still restores the work log (repo task 067)
    code: 'ERR_ASSERTION',
    actual: Error: Command failed: git diff --name-only -z --
    expected: /RECORD_VERIFICATION_FAILED/,
```

**RED, on the second half of the finding.** The suite assertion above fires
before the log assertion can run, so the log half was proved separately: a
one-off probe drove the same scenario against the then-current build and read
LOG.md back with `fs`:

```
THROWN: Command failed: git diff --name-only -z --
LOG RESTORED: false
FORGED ROW STANDS: true
```

**GREEN, same probe, after the fix:**

```
THROWN: RECORD_VERIFICATION_FAILED: Git could not be read to compose this
        stop's record; model-authored evidence was retained without overwrite.
LOG RESTORED: true
FORGED ROW STANDS: false
```

The probe was a scratch file outside the repository; the behavior it proved is
now pinned by the suite test, which asserts all four facts — the rejection is
Cairn's own record failure, the log is byte-identical to the task-start
snapshot, no report was written, and the brief stays retained as evidence.

## Checks run (all real, this session)

- `cd core && npm test` — **tests 104 / pass 104 / fail 0** (103 after Task 066,
  plus this task's 1). Task 066's four tests and every pre-existing byte-back
  and golden-layout test passed unmodified.
- `npm test` at the repo root — core as above, then **cairn-cli: tests 9 / pass
  9 / fail 0**.
- `git diff --stat`: `core/src/serial.ts` and `core/test/serial.test.ts` only.

Files touched: `core/src/serial.ts`, `core/test/serial.test.ts`,
`docs/ai-work/tasks/067-brief.md`, `docs/ai-work/tasks/067-report.md`,
`docs/ai-work/LOG.md`.

## Limitations and remaining human judgment

- **No report byte changed here either.** Nothing in this fix touches a
  template; the new branch throws before any record is written.
- **The two ledgered siblings stand.** The worker lane's stop close
  (`verifyProtectedStartingPaths` and the scan inside `cairnWorkerRecords`) and
  the demo lane's scan have carried the same unwrapped shape since Tasks 048 and
  066 respectively. They are the reviewer's ledger item for the whole-branch
  review, not silently fixed here.
- **A Git failure in that window still produces no task report.** That is the
  honest outcome — a record composed from a Git that cannot be read would be a
  guess — and the thrown message says so, with the brief and the worker's
  changes retained on disk. If the restore itself also fails,
  `recordVerificationFailed` appends its unrestored-log clause, as Task 059
  established.
- Milestone movement: NO. This is a safety repair on Task 066's own new code.

Disposition: DONE
