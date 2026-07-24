# Task 033 — Report

What changed:

- `core/src/codex.ts` — added `CodexExecTimeoutKind`, the
  `CodexExecTimeoutError` class (`code: "CODEX_EXEC_TIMED_OUT"`,
  `timeoutKind`, `debugPath`), the `isCodexExecTimeoutError` guard, the
  `CODEX_EXEC_INACTIVITY_MS` (600 000) and `CODEX_EXEC_ABSOLUTE_MS`
  (3 600 000) constants, the `CodexExecProcessOptions` interface, and a
  `killCodexProcessTree` helper that kills the whole Windows process
  tree via `taskkill /PID <pid> /T /F` (resolved by absolute path under
  `%SystemRoot%\System32` so it cannot be broken by a test's `PATH`
  override) or `SIGKILL` on POSIX. `createSystemCodexExecProcess` now
  accepts `options?: CodexExecProcessOptions` and wires two independent
  timers into `run(request)`: an inactivity timer reset on every
  stdout/stderr chunk, and a fixed absolute timer from process start.
  Either firing kills the process tree and, after a 5s grace period (or
  immediately on `close`), rejects with `CodexExecTimeoutError` naming
  which timer fired.
- `core/src/serial.ts` — `SerialStopReason` gains `"ADAPTER_TIMED_OUT"`.
  The adapter-call catch block now maps a `CodexExecTimeoutError` to
  that reason and carries its `{ code, debugPath }` as the
  `processFailure` note. `reportText`'s STOPPED branch now computes
  `paidStarted` (true when the codex route stopped with
  `ADAPTER_TIMED_OUT`) and appends "The worker process had already
  started before Cairn stopped it; any cost for that call is already
  spent." to the paragraph naming the fixed error code.
- `core/test/codex.test.ts` — added a `wedgedInstall(mode)` helper (a
  hermetic fake `codex` whose child goes silent forever or chatters
  forever) and two tests: one proving the inactivity timer kills a
  silent child and rejects with `timeoutKind: "inactivity"`, one
  proving the absolute cap kills a chattering child and rejects with
  `timeoutKind: "absolute"`.
- `core/test/serial.test.ts` — added one test proving a worker that
  throws `CodexExecTimeoutError` closes `runSerialTask` with `reason ===
  "ADAPTER_TIMED_OUT"` and a report naming `CODEX_EXEC_TIMED_OUT`, the
  debug path, and the "already spent" sentence.
- `docs/ai-work/tasks/033-brief.md`, `docs/ai-work/tasks/033-report.md`,
  and one appended row in `docs/ai-work/LOG.md` — this task's own
  records.

Checks run and real results:

- RED (Step 2 of the plan's Task 1): `cd core && npm test` failed at
  the TypeScript build step with `error TS2305: Module
  "../src/codex.js" has no exported member 'isCodexExecTimeoutError'`
  plus knock-on type errors in the new tests, exactly as predicted
  before any implementation existed.
- RED (unplanned, found during implementation): after writing Steps
  3–5 as specified, the two new watchdog tests failed/hung in a real
  foreground `npm test` run (dot-reporter showed `✖` for both, then the
  process never printed another line). Root cause, confirmed with
  `node --test --test-reporter tap`: `failureType: uncaughtException,
  error: 'spawn taskkill ENOENT'` — the test fixture
  (`withFakeEnvironment`) replaces `PATH` with only the fake bin
  directory, so the original bare `spawn("taskkill", ...)` could never
  resolve the binary; the resulting async `'error'` event had no
  listener and became an uncaught exception, and the never-killed
  grandchild fake-codex process kept the event loop alive forever. Five
  orphaned `dispatcher.cjs` processes from these hung runs were found
  (`Get-CimInstance Win32_Process`, matching this session's
  `%TEMP%\cairn-codex-wedged-bin-*` paths) and terminated with
  `taskkill /T /F` after the fix landed. Fixed by resolving
  `taskkill.exe` by absolute path, attaching an `error` listener to the
  killer child, destroying the child's stdio streams before the
  forced-settle rejection, and making `fail(...)` no-op once a timeout
  has already fired (an EPIPE race on the pending stdin write must not
  overwrite the honest timeout rejection).
- GREEN, foreground, tap reporter: `node --test --test-reporter tap
  --test-name-pattern "killed by the" dist/test/codex.test.js` — both
  watchdog tests pass (`# pass 2`, `# fail 0`), each settling in under a
  second.
- GREEN, foreground: `cd core && npm test` — 54/54 tests pass, 0
  failures, including every pre-existing test unchanged and the three
  new tests (two in `codex.test.ts`, one in `serial.test.ts`).
- GREEN, foreground: root `npm test` (core + cli workspaces) — core
  54/54, cli 9/9, 63/63 total, 0 failures.
- `git status --porcelain` before staging: exactly `core/src/codex.ts`,
  `core/src/serial.ts`, `core/test/codex.test.ts`,
  `core/test/serial.test.ts`, plus this brief, this report, and the
  amended `LOG.md`.

How to try it: from `core/`, run `npm run build && node --test
--test-reporter tap --test-name-pattern "killed by the"
dist/test/codex.test.js` to see the watchdog fire and reject precisely
under short (400ms/500ms) test timers; `npm test` for the full suite
under the real 600 000ms/3 600 000ms production defaults (which never
fire in any existing test).

Limitations and remaining human judgment:

- The 5-second forced-settle grace period inside the watchdog is
  hardcoded, not configurable — nothing in this task's scope calls for
  it to be, and adding an option for it would be speculative.
- This task lands only the process-level watchdog and the serial
  stop-reason mapping. Later plan tasks (2–11) still owe cancellation
  through the same seam, the cross-process run lock, app-level cancel
  and quit protection, and moving record authorship to Cairn — none of
  that is implemented or claimed here.
- Line-number references in the plan's Task 1 text matched the working
  tree at commit `2e7a142` closely enough that only interpretation (not
  correction) was needed; no anchor had drifted.

Milestone movement: NO

Disposition: DONE
