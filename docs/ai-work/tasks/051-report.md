# Task 051 — Report

## What changed

### FIX 1 — a tampered brief can no longer forge a DONE record (`core/src/serial.ts`, `core/test/serial.test.ts`)

The task brief is written untracked at task start, so it is not part of the
protected-path snapshot. A worker that edited or deleted its own brief passed
every protected-work and exact-path check; the byte-back check inside
`cairnWorkerRecords` then failed, but only AFTER it had written the DONE report
and appended the DONE log row, and the DONE branch's bare `throw` left them
standing. Three layers now close it:

- **(a) Verify before writing.** In the worker lane, right after the claims
  checks pass and the HEAD check, before either DONE branch, the brief is
  compared byte-for-byte against `contractMarkdown` (the text Cairn wrote at
  task start); a missing file also fails. On failure the run closes as an honest
  STOPPED (`RECORD_VERIFICATION_FAILED`) through the normal stop-close path,
  which writes fresh STOPPED records (none exist yet).
- **(b) Fail-closed rewrite fallback.** Both worker-lane DONE branches now call
  a shared `closeRecordRewrite` that runs `replaceDoneRecordsWithStopped`
  (reason `RECORD_VERIFICATION_FAILED`) and returns an honest STOPPED result;
  only an unrewritable failure throws.
- **(c) No raw ENOENT.** `cairnWorkerRecords`' checks are `existsSync`-guarded
  before each `readFileSync`, so a deleted record makes the corresponding check
  false instead of throwing after the log row was appended. The brief byte-back
  check is scoped to the DONE disposition (on a STOPPED close the brief is
  retained evidence, never committed, so its integrity is not part of what makes
  the honest STOPPED records verified — and the DONE path already verified it in
  layer (a)).

**RED-first evidence (run against pre-fix `serial.ts`, FIX 2/3/5 kept in place
so the file compiled):**

- Forged-brief case: `runSerialTask` THREW `RECORD_VERIFICATION_FAILED` and left
  a standing dishonest row in `LOG.md`:
  `| 001 | 2026-07-24 | Standard | Applied | DONE | completed | Added the visible result. (worker claim; files verified against Git by Cairn) | YES |`
  and a report reading `- Commit: One exact-path commit contains the product
  changes and these records.` with `Disposition: **DONE**` — a DONE claim with
  zero commits (HEAD was unmoved).
- Deleted-brief case: an unhandled `ENOENT … 001-brief.md` was thrown from
  `cairnWorkerRecords`' `readFileSync` (after the row was appended).

**GREEN after the fix:** both new tests
(`a worker that edits its own brief cannot forge a DONE record (FIX 1)` and
`a worker that deletes its own brief closes honestly with no unhandled ENOENT (FIX 1)`)
pass: run returns STOPPED `RECORD_VERIFICATION_FAILED`, exactly one STOPPED row
for the task and no DONE row anywhere, report disposition STOPPED,
`projectStatus(root).stones` unchanged at 0, HEAD unmoved, and the tampered/
deleted brief is retained as evidence.

### FIX 2 — an unconfirmed kill keeps the run lock (`core/src/routing.ts`, `core/src/codex.ts`, `core/src/serial.ts`)

`readonly killConfirmed: boolean` was added to the universal `WorkerProcessError`
(default `true`, keeping serial adapter-agnostic) and threaded through
`CodexExecTimeoutError` / `CodexExecCancelledError`: `false` on the force-settle
path (kill issued, child never closed), `true` on the close-handler path and on
a pre-spawn cancel (nothing started). In `runSerialTask`'s `finally`, the
in-process guard always clears but the cross-process file lock is released only
when no unconfirmed-kill stop occurred; when it is held, the STOPPED report's
stop paragraph and the run activity both say so plainly, and a code comment
records that the lock holder is this app process (alive), so the next run is
refused `SERIAL_RUN_ACTIVE` rather than self-healed — the stale-lock heal
applies once the app restarts and this pid reads as dead (residual risk bounded
and documented). Two tests cover it: an unconfirmed-kill timeout keeps the lock
and refuses a second run; a confirmed-kill timeout releases it as before.

### FIX 3 — the POSIX kill is a real tree kill (`core/src/codex.ts`, `CHANGELOG.md`)

On non-win32 the codex child now spawns with `detached: true` so it leads its
own process group, and `killCodexProcessTree` does `process.kill(-child.pid,
"SIGKILL")` (falling back to a direct `child.kill("SIGKILL")` if the group send
fails). The win32 spawn options and the win32 `taskkill /T` path are byte-for-
byte unchanged. The CHANGELOG's 0.2.0 first bullet is corrected to state exactly
what each platform does (Windows: absolute-path `taskkill /PID <pid> /T /F`;
POSIX: `SIGKILL` to the child's process group) and to note the unconfirmed-kill
lock-hold behavior. **No new POSIX test is runnable on this Windows machine, so
the POSIX group-kill path is not exercised by CI here — stated honestly.** The
win32 codex tests (silent-timeout, chatter-absolute, cancel) stay green.

### FIX 4 — the run-time disclosure gate follows the routed adapter (`app/src/main/tasks.ts`, `app/tests/serial.spec.ts`)

`task:run`'s gate no longer hard-codes `codexExecDisclosure(dir, outcome)` (that
import is gone). It resolves the routed adapter exactly as `task:route` does
(route preview against the detected adapters, find by `route.recommended.id`)
and takes `expected = routed?.disclosure?.(outcome)`. If `expected` exists (a
real worker adapter) it requires `realCallConfirmed === true &&
sameDisclosure(disclosure, expected)`; with no `expected` (the demo lane) no
confirmation is needed. For codex the behavior is byte-identical because its
`disclosure()` delegates to `codexExecDisclosure` — the existing routing.spec
`denied` and `mismatched` assertions pass unchanged (they cover the codex lane
refusing a mismatch). One new assertion was added
(`FIX 4: the demo lane runs through task:run with no disclosure because its
routed adapter exposes none` in `serial.spec.ts`): a mock-lane `taskRun` call
with neither `realCallConfirmed` nor a disclosure returns `ok:true`, status
`done`.

While implementing FIX 4 the gate's detection was consolidated to a SINGLE
`detectCodexExecStatus` call, and the live session is now registered BEFORE that
detection with the detected adapters reused by the run. The first draft resolved
the route in the gate AND re-detected in the run body; that doubled detection
delayed session registration enough that a fast reattach's `taskCurrent`
returned null and the reattach screen missed the running task
(`navigating away and back…` failed). Registering the session first (with a
cleanup on a gate-fail return) and detecting once restores the reattach window
and keeps `denied`/`mismatched` returning `ok:false` with no brief or marker
created.

### FIX 5 — record-honesty batch (`core/src/serial.ts`, `core/test/serial.test.ts`, `app/tests/routing.spec.ts`, `CHANGELOG.md`, `cli/README.md`)

- **(a)** The "already spent" sentence is now gated in `reportText` so it does
  not fire for a pre-spawn cancel (`CANCELLED_BY_OWNER` with a null
  `debugPath` = the process never started). The existing owner-abort serial test
  was updated so its fake, which writes a partial file, throws with a non-null
  debug path and keeps the sentence; a new test asserts a pre-spawn cancel omits
  it. The app Playwright cancel test now waits for the real exec's
  process-started marker before clicking Stop, so it reliably cancels a started
  process (a pre-spawn cancel, which spends nothing, would correctly omit the
  sentence).
- **(b)** The CHANGELOG 0.2.0 lock bullet is softened from "can never delete a
  fresh, live lock" to match the code's honest comment: it defeats every
  realistic race, a microsecond residual window remains (Node has no atomic
  compare-and-delete), contained downstream by the protected-work and exact-path
  checks.
- **(c)** `cli/README.md`'s retention sentence now reads "retains the worker's
  final message (for claims verification) plus bounded numeric evidence,"
  aligning with the records.ts privacy paragraph.

Files touched (all named in the brief's boundary of intent, plus this task's
records): `core/src/serial.ts`, `core/src/codex.ts`, `core/src/routing.ts`,
`core/test/serial.test.ts`, `app/src/main/tasks.ts`, `app/tests/serial.spec.ts`,
`app/tests/routing.spec.ts`, `CHANGELOG.md`, `cli/README.md`,
`docs/ai-work/tasks/051-brief.md`, `docs/ai-work/tasks/051-report.md`,
`docs/ai-work/LOG.md`.

## Checks run (all real, this session)

- `cd core && npm test`:
  ```
  core: tests 88 / pass 88 / fail 0
  ```
  Up from 83 at Task 050: +2 FIX 1 tests, +2 FIX 2 lock tests, +1 FIX 5a
  pre-spawn-cancel test. All new tests live in the already-enumerated
  `core/test/serial.test.ts`, so `core/package.json`'s test file list needed no
  change.
- Root `npm test` — core (88) + cli (9) green.
- `cd app && npm run typecheck` — clean, no errors.
- `cd app && npm run test:unit` — 43/43 pass, unchanged (no unit surface
  touched).
- `cd app && npm run build:vite` — clean build.
- `cd app && npx playwright test` — 24/24 pass (workers:1), up from 23: +1 FIX 4
  demo-lane assertion. Includes the owner-cancel, reattach, and reload scenarios
  green after the FIX 4 session-registration and FIX 5a marker-wait changes.
- RED-first reproduction for FIX 1 was run against pre-fix `serial.ts` (see FIX 1
  above) and captured the forged `DONE | … | YES` row, the zero-commit "One
  exact-path commit contains…" report line, and the raw ENOENT, before the fix
  turned both cases into honest STOPPED closes.
- `git status --porcelain` before staging — matched exactly the nine code/doc
  files above plus this task's three record files.

## How to try it

```
git clone https://github.com/kjleblanc/cairn.git
cd cairn
npm ci && npm test
cd app && npm ci && npm run build:vite && npx playwright test
```

To see FIX 1 directly, read the two `(FIX 1)` tests in
`core/test/serial.test.ts`: a fake worker that edits or deletes its own brief
now closes STOPPED with no DONE row and no stone. FIX 2's lock behavior is in
the two `(FIX 2)` tests; FIX 5a's pre-spawn-cancel case is the new
`already-spent` test.

## Limitations

- The POSIX process-group kill (FIX 3) cannot be exercised on this Windows
  development machine; it is covered by construction and code review only, and
  the win32 kill/timeout/cancel tests stay green. A POSIX CI run would exercise
  it directly.
- FIX 2's held-lock recovery is by design a fail-closed state: until the app
  restarts, the affected project reports `SERIAL_RUN_ACTIVE` and the owner must
  close the orphaned process manually. The residual microsecond stale-lock race
  is unchanged and remains contained downstream.
- Milestone movement: NO — this is a hardening fix wave inside 0.2.0, not a new
  capability.

Disposition: DONE
