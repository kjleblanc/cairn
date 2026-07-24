# Task 048 — Report

## What changed

- `core/src/codex.ts` (modified — `taskPrompt` only): removed the two
  record-format instructions (write `NNN-report.md`; append the LOG row) and
  the "still write the report and log row" already-satisfied line. In their
  place: "Do not write any file under docs/ai-work. Cairn authors the task
  report and log row itself…"; "End your final message with exactly one fenced
  block labeled cairn-claims…" plus the seven-key JSON example; the
  DONE-vs-STOPPED and milestone rule; and the rephrased already-satisfied line
  ("Verify the existing behavior and say so in your claims, with milestone NO
  and the honest disposition."). The apply_patch lines, "do not invent a
  product change", and "Cairn owns the exact-path local commit" survive
  unchanged.
- `core/src/serial.ts` (modified):
  - `SerialStopReason`: `MODEL_RECORDS_MISSING` removed, `WORKER_CLAIMS_MISSING`
    added.
  - Deleted `interface ModelRecords` + `readModelRecords` (the old
    worker-wrote-the-records verifier) and `verifyModelGitResult` (folded into
    `commitExactPaths`).
  - New `scanChangedPaths(root)` — the bounded, forward-slashed, sorted set of
    changed + untracked paths from Git (`diff --name-only` + `ls-files
    --others --exclude-standard`), the ground truth for what the worker and
    Cairn's own record writes touched.
  - New `cairnWorkerRecords(...)` — builds `ComposedRecordInput` (`filesChanged`
    = `scanChangedPaths(...).slice(0, 100)`, always from Git never from claims;
    `protectedIntact` = the real verification; `evidenceSummary` =
    `boundedEventSummary` when the result validated; `paidCallStarted: true`),
    writes the report via `composeWorkerReport` with flag `wx`, appends one LOG
    row via `composeWorkerRowSummary` with `moved: claims?.milestone ?? "NO"`,
    and verifies its own brief/report/log/row writes byte-back exactly as
    `writeClosedRecords` does.
  - New `commitExactPaths(root, start, expected, taskNumber)` — recomputes the
    full changed set and requires it to equal the expected set (product paths ∪
    owned records), stages exactly that set, verifies the staged list with
    nothing else changed or untracked, commits `Task NNN: complete verified
    worker task`, and confirms ancestry + a single-commit count. Any failure
    restores the index and returns null. The phantom-dirty lesson (no
    post-commit whole-tree cleanliness check) is preserved verbatim.
  - `changedTaskPaths`: deleted the `contract.ownedRecords.every(...)`
    requirement (Cairn now authors the owned records after the scan); every
    other safety line — no path escapes the project, touches `.git`, or writes
    a non-owned task record — stays.
  - Rewrote the codex branch of `runSerialTask`: parse `claims` from
    `codexResult.claimsText` via `parseWorkerClaims`; stop-reason ladder
    `INVALID_ADAPTER_RESULT → ADAPTER_FAILED → PROTECTED_WORK_CHANGED →
    WORKER_CLAIMS_MISSING → MODEL_REPORTED_STOPPED`; a `closeStopped` closure
    authors STOPPED records and commits nothing; the DONE path checks head
    unchanged, then (dirty start) writes records with commit skipped, else
    scans product paths, writes records, and commits the exact set — swapping
    to a STOPPED `MODEL_RESULT_NOT_VERIFIED` close on any staging/commit
    failure via `replaceDoneRecordsWithStopped`.
  - Codex contract `checks`[1] and `stopConditions`[1] reworded for the claims
    model.
  - The catch path (adapter threw: boundary/timeout/cancel/process-failure)
    is untouched and still uses `writeSafetyRecordsWhenUnclaimed` + `reportText`.
- `core/test/codex.test.ts` (modified): replaced the seven prompt assertions
  (report heading, milestone line, disposition line, log-row shape, STOPPED
  decision, last-column rule, and the "still write the report and log row"
  line) with five positive matches (no `docs/ai-work` write; one `cairn-claims`
  block; `"disposition": "DONE"`; milestone rule; "say so in your claims, with
  milestone NO") and two `doesNotMatch` guards (`-report.md`; "Append exactly
  one row"). The apply_patch, "do not invent", and git-commit assertions stay.
- `core/test/serial.test.ts` (modified): added a `claimsFence(obj)` helper;
  converted every codex fake from writing report/LOG to returning a
  `cairn-claims` fence; renamed the no-records test to "a completed process
  with no claims fence stops WORKER_CLAIMS_MISSING"; and added two new tests —
  "claims saying STOPPED close as MODEL_REPORTED_STOPPED with evidence
  retained" and "perfect DONE claims cannot outrank a protected-work change".
  Worker-text assertions in composed reports expect the `> ` blockquote prefix.
- `app/tests/routing.spec.ts` (modified): the fake dispatcher's success/slow
  flow writes only `visible.txt` and emits the claims fence as one
  `agent_message` JSONL line; `missing-records` → `missing-claims`; expectation
  texts moved to `WORKER_CLAIMS_MISSING` and the two new result sentences.
- `app/src/renderer/screens/TaskRun.tsx` (modified): result copy now reads
  "Cairn verified the worker's changes and authored the task records itself."
  (done) and "Cairn stopped this task safely and authored honest STOPPED
  records. Retained evidence needs inspection before another task." (stopped).

No change to `claims.ts`, `records.ts`, `steps.ts`, or `routing.ts`. No new
dependency. No version bump.

## Verification (real results)

**Steps 1–2 green** — after the prompt rewrite and the codex.test.ts assertion
swap, with `serial.ts` still untouched, `cd core && npm test` stayed green at
78 (the old worker-record flow still verified).

**RED first (Step 3)** — the rewritten and new claims-based serial fakes, run
against the untouched old `serial.ts`, failed for the retired flow:

```
✖ one authorized fake Codex process completes one verified serial task
✖ a confirmed exact-path commit stays DONE despite a phantom stat-dirty file
✖ a phantom stat-dirty start still creates the exact-path task commit
✖ an already-satisfied fake Codex task closes honestly without a product edit
✖ a completed process with no claims fence stops WORKER_CLAIMS_MISSING
✖ a dirty-start Codex result preserves owner work and remains uncommitted
✖ an unrelated task-record path prevents Cairn from committing model work
✖ claims saying STOPPED close as MODEL_REPORTED_STOPPED with evidence retained
ℹ tests 80 / pass 72 / fail 8
```

(The new protected-work test already passed against the old code — its
`PROTECTED_WORK_CHANGED` sits above the record check in both ladders, which is
the point of the test.)

**GREEN (Step 4)** — after rewriting the codex branch, `cd core && npm test`:

```
ℹ tests 80
ℹ pass 80
ℹ fail 0
```

(78 pre-existing + 2 new serial tests = 80.) Root `npm test`:

```
core: tests 80 / pass 80 / fail 0
cli:  tests 9 / pass 9 / fail 0
```

**App gate (Steps 5–6)**:

```
npm run typecheck  → clean (tsc --noEmit, tests/ included)
npm run test:unit  → tests 43 / pass 43 / fail 0
npm run build:vite → built (main + preload + renderer)
npx playwright test → 23 passed (56.0s)
```

The Playwright run includes the claims-based success path ("Cairn verified the
worker's changes and authored the task records itself."), the invalid-JSONL
stop, the `missing-claims` bounded-evidence stop (`WORKER_CLAIMS_MISSING`, no
`sk-secret-event-payload` anywhere in the page or report), the owner-cancel
path, and both mid-run reattach tests on the slow claims flow.

## How to try it

`cd core && npm test` runs the rewritten codex fakes and the two new tests.
Reverting the codex branch of `serial.ts` to the `readModelRecords` flow (with
the new test file in place) reproduces the 8-failure RED above. In the app,
`cd app && npm run build:vite && npx playwright test routing` exercises the fake
Codex dispatcher's claims fence end to end.

## Limitations

The seam this task inverts is the record authorship only. Adapter-thrown
failures (the catch path) still write their own safety records via the older
`reportText`/`writeSafetyRecordsWhenUnclaimed` composer, unchanged from Task 7 —
the claims composer governs only the post-process branch. `replaceDoneRecordsWithStopped`
survives solely as the commit-failure self-check and still emits the older
report shape; that path is an internal safety net exercised by no test (a fresh
exact-path commit is always a descendant of its parent). A worker that writes
its own `NNN-report.md` would trip the `wx` write and fail the run hard
(fail-closed) rather than being reported gracefully — acceptable, since the
prompt forbids all `docs/ai-work` writes.

## Files changed

- `core/src/codex.ts` (modified — `taskPrompt` claims-fence rewrite)
- `core/src/serial.ts` (modified — codex-branch inversion; record helpers)
- `core/test/codex.test.ts` (modified — seven prompt assertions replaced)
- `core/test/serial.test.ts` (modified — claims-fence fakes; two new tests)
- `app/tests/routing.spec.ts` (modified — dispatcher claims fence; expectations)
- `app/src/renderer/screens/TaskRun.tsx` (modified — result copy)
- `docs/ai-work/tasks/048-brief.md` (new)
- `docs/ai-work/tasks/048-report.md` (new)
- `docs/ai-work/LOG.md` (modified — one appended row)

Milestone movement: NO

Disposition: DONE
