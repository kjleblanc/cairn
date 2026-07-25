# Task 066 — Report

Phase 3 Task 7: the envelope's run result now carries its structured truth.

## What changed

### `core/src/serial.ts` — `ClosedSerialResult` gains `composed`

```ts
composed: ComposedRecordInput;
```

Both closed arms of `SerialRunResult` (done, stopped) carry it; the
`connection-required` arm does not, and cannot — it returns before a task
number, a brief, or a record exists. Because the property is required, the
compiler enumerated every close site for me: nine returns, each of which now
states its own truth.

### `cairnWorkerRecords` returns the input it composed

The worker lane already built a `ComposedRecordInput` and rendered the report
from it. It now returns that same object alongside the report text, so the card
and the record are literally the same value — they cannot drift into two
accounts of one run. Three sites (the claims-lane stop close, the dirty-start
DONE, the clean-start DONE) pass it straight through.

### `composedForClose(...)` — the six legacy-template sites

The safety close, both worker-lane record rewrites, and the three offline-lane
closes render legacy `reportText()` templates and compose nothing of their own.
They now synthesize a value through one private helper whose `site` parameter
has **no optional fields**: a new close site cannot inherit someone else's
value by omission. Nothing it returns is rendered — see the byte-safety section.

Per site, the real values:

| Site | disposition / stopReason | claims | filesChanged | protectedIntact | commit | paidCallStarted |
|---|---|---|---|---|---|---|
| Adapter-throw safety close | STOPPED / the thrown reason | `null` — the adapter threw, no result was parsed | Git scan taken **before** Cairn writes its own stop records | real verification (see below) | `null` | the report's own predicate (see below) |
| `closeRecordRewrite` | STOPPED / `RECORD_VERIFICATION_FAILED` | the parsed claims | Git scan at the close | `protectedValid` | `null` | `true` — a full worker process ran and returned |
| Commit-failure rewrite | STOPPED / `MODEL_RESULT_NOT_VERIFIED` | the parsed claims | Git scan at the close | `protectedValid` | `null` | `true` — same |
| Demo stop | STOPPED / the real stop reason | `null` — the lane parses no claims | Git scan at the close | `protectedValid` | `null` | `false` |
| Demo record rewrite | STOPPED / `RECORD_VERIFICATION_FAILED` | `null` | Git scan at the close | the real re-verification | `null` | `false` |
| Demo DONE | DONE / `null` | `null` | Git scan taken **before** the record commit | the real re-verification | the run's real `RecordCommit` | `false` |

Two supporting one-liners keep the sites uniform: `changedSetForRecord(root)`
is the single definition of the bounded, sorted, 100-path Git scan (the worker
lane now calls it too, same value), and `paidCallAlreadyStarted(...)` is
described below.

### Three corrections to the plan's site table, each caught by a test

The plan's table was written before the review corrected its premise, and three
of its literal values were not the site's real value. Each correction was
observed as a RED, not reasoned about in the abstract:

**1. `filesChanged: []` was a lie in the shape of a default.** An empty list
does not read as "not enumerated"; it renders and reads as "no files changed".
At the demo DONE the truth is three records; at a boundary stop it is the brief.
Every site now scans Git, the same ground truth the worker lane uses.

**2. `paidCallStarted: !demo && reason !== "REAL_MODEL_CALL_NOT_AUTHORIZED"`
contradicted the report Cairn had just written.** On a pre-spawn owner cancel
the stop report deliberately omits the already-spent sentence (Task FIX 5a
proved nothing started: a null debug path), and that formula would have had the
result card assert a spent cost on the same run. The fix is structural rather
than a second copy of the rule: the predicate moved into
`paidCallAlreadyStarted(demo, reason, processFailure)` and BOTH the report
sentence and the composed field read it. The same expression, so no rendered
byte moved, and the two statements can no longer disagree. It also gets the
process-failure codes right: `CODEX_EXEC_SPAWN_FAILED` and
`CODEX_EXEC_STDIN_FAILED` both fail before any request reaches the model.

**3. `protectedIntact: true` at the safety close would have been a claim Cairn
never checked.** That site's legacy report makes no protected-work claim; the
card would have made one for it. The boolean is now a verification actually
performed at the close, in the form the site's own question deserves: a boundary
stop started no process and the offline adapter receives no root, so the cheap
status-level `verifyProtected` answers exactly "did anything outside Cairn's own
records move at all?"; any other throw may follow real worker activity, where
new files are expected work and not a protection failure, so the worker lane's
hash-level `verifyProtectedStartingPaths` answers it there. Both are read-only
Git and both run before Cairn's own records are written, so Cairn's own log
append can never read back as a protected-work change.

One related ordering change: in the demo lane the post-DONE `verifyProtected`
re-check now runs unconditionally instead of only when the records verified,
because its real result is what both that DONE close and the honest STOPPED
rewrite carry. The branch it guards is unchanged; the call is read-only.

## TDD evidence (three REDs, all observed this session)

**RED 1 — the property does not exist.** Four new tests written first; `cd core
&& npm test` runs `tsc` before the suite:

```
test/serial.test.ts(1549,23): error TS2339: Property 'composed' does not exist
  on type '{ status: "done"; } & ClosedSerialResult & { disposition: "DONE"; }'.
```

27 such errors, build exit code 2.

**RED 2 — assertion-level, on the plan's literal `filesChanged: []`.** With the
interface and all nine sites wired exactly as the plan's table specified, two
tests failed on values:

```
AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  actual: [],
  expected: [ 'docs/ai-work/LOG.md', 'docs/ai-work/tasks/001-brief.md',
              'docs/ai-work/tasks/001-report.md' ]

AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  actual: [],
  expected: [ 'docs/ai-work/tasks/001-brief.md' ]
```

**RED 3 — assertion-level, on the plan's paid-call formula.** With the Git scans
in place, the pre-spawn-cancel case failed:

```
✖ an adapter-throw stop composes the same paid-call truth its report renders
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  actual: true, expected: false
```

**GREEN** after the shared predicate landed. The fourth test closes with the
invariant that produced RED 3, run over all four stop shapes at once:

```ts
assert.equal(
  stop.result.composed.paidCallStarted,
  /already spent/.test(stop.report),
  `the card and the report disagree about ${stop.result.reason}`,
);
```

## The rendered report bytes did not change

Stated plainly, because it was the task's hardest constraint: **no report byte
changed, and no existing test was modified to make that true.** The evidence:

- Every pre-existing test passed unmodified — including the golden layout test
  (`core/test/records.test.ts`, "the DONE report matches its golden layout
  exactly") and the whole family of byte-back record tests in
  `core/test/serial.test.ts` (worker-edited brief, deleted brief, forged log
  row, truncated log, pre-written report, thrown-close log restore). Those
  re-derive `briefText` and byte-compare Cairn's own writes; a template drift
  fails them.
- The only edit inside `reportText` replaced one `const` initializer with a call
  to the function holding that same expression. No template literal was touched
  (`git diff core/src/serial.ts` shows no change inside any backtick block).
- `composed` is read by nobody in this repo yet; it is data on the returned
  object.

## Checks run (all real, this session)

- `cd core && npm test` — **tests 103 / pass 103 / fail 0** (99 before this
  task, plus this task's 4). Includes `tsc` clean and the contract-mirrors test.
- `npm test` at the repo root — core as above, then **cairn-cli: tests 9 / pass
  9 / fail 0**.
- `git diff --stat`: `core/src/serial.ts` and `core/test/serial.test.ts` only.

Files touched: `core/src/serial.ts`, `core/test/serial.test.ts`,
`docs/ai-work/tasks/066-brief.md`, `docs/ai-work/tasks/066-report.md`,
`docs/ai-work/LOG.md`.

## Limitations and remaining human judgment

- **`composed.claims` is claims.** The field carries whatever the worker said
  about itself, quarantined nowhere at this layer — `records.ts` does the
  blockquote containment when it renders. Task 8's card must label it as the
  worker's account and must never let a claims string begin a structural line.
- **`ComposedRecordInput` is not re-exported from `core/src/index.ts`** (which
  exports codex, files, routing, serial, steps — not records or claims). The app
  can read `result.composed` structurally and TypeScript resolves the type
  through `serial.d.ts`, so nothing is blocked; naming the type in app code
  would want a one-line re-export, which is outside this task's boundary.
- **On the clean-start worker DONE, `composed.commit` is the value the report
  was rendered from** (status `created`, the pre-commit reason) while
  `result.commit` carries the reason and the hash from `commitExactPaths`. Both
  are true of the same commit; a card that wants the hash should read
  `result.commit`. If the commit had failed, that path never returns DONE — it
  rewrites to STOPPED, where `composed.commit` is `null`.
- **A bounded residual at the safety close.** Its two Git reads now run before
  `writeSafetyRecordsWhenUnclaimed`, so a Git failure in that window would throw
  instead of writing the stop record (and would skip the throw-site log
  restore). This is the same exposure the worker-lane stop path has carried since
  Task 048, where `verifyProtectedStartingPaths` and the change scan likewise
  precede the record write; the alternative — scanning after Cairn's own writes —
  would let Cairn's own log append read back as a protected-work change on a
  start-dirty log, which is a false record rather than a forced inspection.
- **The demo lane's `filesChanged` is scanned before its record commit**, so a
  committed demo DONE still names its three records rather than reporting the
  empty set a committed workspace shows afterwards. That matches the worker
  lane, whose composer also scans before its commit.
- Milestone movement: NO. This is the data foundation for the Task 8 result
  card; no owner-visible surface changed.

Disposition: DONE
