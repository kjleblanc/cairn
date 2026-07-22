# Task 039 brief — Close an already-satisfied Codex task honestly

Date: 2026-07-22

## Requested visible outcome

When Cairn starts one confirmed Codex Exec call for an outcome that is already
satisfied, the task prompt tells Codex not to invent a product change and still
requires checks, one honest report, and one matching log row. The prompt also makes
clear that the displayed call disclosure was already confirmed, without granting
any other risk authority. If those records are absent, Cairn reports the precise
safe code `MODEL_RECORDS_MISSING` instead of the generic record-verification code.

## Files or areas that may change

- `core/src/codex.ts` and its focused request test
- `core/src/serial.ts` and focused fake-process serial tests
- current README/changelog wording if the no-op behavior needs user documentation
- this Task 039 report and one append-only `docs/ai-work/LOG.md` row

No dependency entry or lockfile may change. No real Codex process may start.

## Protected starting work

- Project root: `C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework`
- Starting branch: `main`, four commits ahead of `origin/main`
- Starting HEAD: `713f527` (`Task 038: retain repeated no-record evidence`)
- Starting working tree and index: clean
- Tasks 000–038 and all existing log rows are append-only history

## First useful checkpoint

One authorized fake process simulates an outcome that needs no product-file edit,
writes an honest DONE report with milestone movement NO plus the matching log row,
and returns a completed terminal event. Cairn verifies and commits exactly the three
task-record paths. A second fake returns completion without model records and Cairn
closes it with `MODEL_RECORDS_MISSING`.

## Checks

- The request says the one disclosed call was confirmed and explicitly limits that
  statement to this call and in-scope local reversible work.
- The request says an already-satisfied outcome still needs checks, report, and log,
  and forbids inventing a source change.
- A fake no-op DONE result produces one exact Cairn-created record-only commit.
- A completed fake with no records stops once with `MODEL_RECORDS_MISSING`, retains
  no raw provider text, and does not retry.
- Core, CLI, Desktop typecheck, and Electron smoke checks pass.
- `git diff --check` and dependency/scope audits pass.
- No real Codex process or model call runs.

## Important assumptions

- Task 038 used the repaired build: its generated brief contains Task 037’s new
  Cairn-owned commit wording.
- Task 038 repeated the exact visible change that Task 037 had already implemented,
  and the process left no product file, model report, or model log row.
- An already-satisfied result may be DONE only when the model verifies the requested
  behavior, writes an honest report and row, and records milestone movement NO.
- Cairn must still stop if those required records are absent; it may improve the
  reason but may not synthesize a successful model report.

## DONE and STOPPED

DONE means the bounded prompt covers confirmed-call and already-satisfied behavior,
missing records receive the precise safe code, fake-only regressions pass, and the
result is documented and committed by exact path.

STOPPED means the behavior cannot be made explicit and verified without retaining
raw provider output, making another model call, or widening the adapter.
