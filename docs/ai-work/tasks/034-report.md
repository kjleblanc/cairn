# Task 034 — Report

What changed:

- `core/src/codex.ts` — added the `CodexExecCancelledError` class
  (`code: "CODEX_EXEC_CANCELLED"`, `debugPath`) beside
  `CodexExecTimeoutError`, and the `isCodexExecCancelledError` guard.
  `CodexExecProcess.run` now takes an optional `signal?: AbortSignal`.
  Inside `createSystemCodexExecProcess`'s `run(request, signal)`: an
  already-aborted signal rejects immediately, before spawning, with
  `CodexExecCancelledError(null)`. A new `cancelled` boolean mirrors
  `timedOut`; an `onAbort` listener sets `cancelled = true` *before*
  calling `killCodexProcessTree` (the same EPIPE-race ordering the
  timeout path uses), then arms a 5-second force-settle. The `close`
  handler now checks `cancelled` before `timedOut` and rejects with
  `CodexExecCancelledError(debugPath)`. `clearWatchdog()` also removes
  the abort listener. `fail()`'s guard is now `if (settled || timedOut
  || cancelled) return;`. The Codex Exec adapter's `run(contract,
  signal)` forwards the signal to `processRunner.run(request, signal)`.
  **Folded-in fix (disclosed, not part of the plan's Task 2 text):** the
  force-settle callback that fires 5 seconds after a failed tree-kill —
  found by Task 1's reviewer to be missing a `clearWatchdog()` call
  before its rejection — is now a small shared `armForceSettle(reject)`
  helper used by both the timeout path (`fireTimeout`) and the new
  cancel path (`onAbort`). It calls `clearWatchdog()` first, so the
  sibling watchdog timer (and, now, the abort listener) can never dangle
  in that failed-kill fallback path. Implemented once since both callers
  share the helper, per the task instructions.
  I also extended `fireTimeout`'s own re-entrancy guard to `if (settled
  || timedOut || cancelled) return;` (previously `if (settled ||
  timedOut) return;`), symmetric with the new `onAbort` guard, so a
  timer that fires after a cancellation has already claimed the
  rejection cannot redundantly re-kill the tree or arm a second
  force-settle. This was not explicitly specified in the task text; it
  follows directly from the "cancelled mirrors timedOut" instruction and
  changes no existing behavior (`cancelled` stays permanently `false`
  when no signal is passed, so every pre-existing call site is
  unaffected).
- `core/src/routing.ts` — `TaskAdapter.run` gains an optional `signal?:
  AbortSignal` second parameter (source-compatible; the offline
  adapter's `run(contract)` needs no change).
- `core/src/serial.ts` — `SerialRunOptions` gains `signal?: AbortSignal`,
  passed at the call site as `chosen.run(freezeContract(contract),
  options.signal)`. `SerialStopReason` gains `"CANCELLED_BY_OWNER"`. The
  adapter-call catch block now maps a caught `CodexExecCancelledError` to
  that reason and carries its `{ code, debugPath }` as the
  `processFailure` note, mirroring exactly how Task 1 mapped
  `CodexExecTimeoutError`. `paidStarted` (used by `reportText`'s STOPPED
  branch to append the "already spent" sentence) now reads `codex &&
  (reason === "ADAPTER_TIMED_OUT" || reason === "CANCELLED_BY_OWNER")` —
  this replaces a one-line placeholder Task 1 had already left in the
  code (`// Task 2 extends paidStarted to cancellation.`) with the actual
  extension.
- `core/test/codex.test.ts` — imported `isCodexExecCancelledError` and
  added one test: aborting an `AbortController`'s signal 200ms into a
  silent wedged child kills it and rejects with
  `isCodexExecCancelledError(error) && error.code ===
  "CODEX_EXEC_CANCELLED"`.
- `core/test/serial.test.ts` — imported `CodexExecCancelledError`
  alongside the existing `CodexExecTimeoutError` import and added one
  test: a fake `CodexExecProcess` writes `partial.txt`, calls
  `controller.abort()`, asserts the signal reached the process seam
  (`signal?.aborted === true`), then throws `CodexExecCancelledError`.
  `runSerialTask` is called with `signal: controller.signal`. Asserts
  `result.status === "stopped"`, `result.reason ===
  "CANCELLED_BY_OWNER"`, `partial.txt` still exists (workspace evidence
  retained, never cleaned), and the report matches `/already spent/`.
- `docs/ai-work/tasks/034-brief.md`, `docs/ai-work/tasks/034-report.md`,
  and one appended row in `docs/ai-work/LOG.md` — this task's own
  records.

Checks run and real results:

- RED (Step 1–2 of the plan's Task 2): after appending only the new
  `codex.test.ts` cancel test and its `isCodexExecCancelledError` import,
  `cd core && npm test` failed at the TypeScript build step exactly as
  predicted:
  ```
  test/codex.test.ts(16,3): error TS2305: Module '"../src/codex.js"' has
  no exported member 'isCodexExecCancelledError'.
  test/codex.test.ts(531,10): error TS2554: Expected 1 arguments, but got 2.
  test/codex.test.ts(532,63): error TS18046: 'error' is of type 'unknown'.
  ```
  (The last two are knock-on errors from the extra `signal` argument and
  the then-untyped `error` in the assertion callback — both resolved by
  the Step 3 implementation, no separate fix needed.)
- GREEN, foreground: `cd core && npm test` — 56/56 tests pass, 0
  failures, including all 54 pre-existing tests unchanged plus the two
  new tests (`aborting the signal kills the codex child and rejects as
  cancelled` in `codex.test.ts`, settling in ~312ms — not the 5s
  force-settle fallback, confirming the tree-kill itself succeeded
  promptly on this machine; `an owner abort closes as CANCELLED_BY_OWNER
  with evidence retained` in `serial.test.ts`).
- GREEN, foreground: root `npm test` (core + cli workspaces) — core
  56/56, cli 9/9, 65/65 total, 0 failures.
- Orphan-process check after the full suite ran: `Get-CimInstance
  Win32_Process | Where-Object { $_.CommandLine -match 'cairn-codex' }`
  showed no leftover `dispatcher.cjs`/fake-codex processes — the tree
  kill and the folded-in `clearWatchdog()`-first fix leave nothing
  running.
- `git status --porcelain` before staging: exactly `core/src/codex.ts`,
  `core/src/routing.ts`, `core/src/serial.ts`, `core/test/codex.test.ts`,
  `core/test/serial.test.ts`, plus this brief, this report, and the
  amended `LOG.md` — matches the task's boundary of intent exactly.

How to try it: from `core/`, run `npm run build && node --test
--test-reporter tap --test-name-pattern "cancel" dist/test/codex.test.js
dist/test/serial.test.js` to see the abort path fire and reject
precisely; `npm test` for the full suite.

Limitations and remaining human judgment:

- `core/src/routing.ts`'s in-line comment above `TaskAdapter.run`
  ("never a root, path resolver, file handle, shell, process, Git
  handle, network client, credential, tool, or delegation hook") was not
  touched — an `AbortSignal` is a bounded, one-way stop signal, not any
  of those excluded surfaces, and the plan's own interface line for this
  task adds exactly this parameter, so no wording change was needed
  there.
- This task lands only the process-level cancel path and the serial
  stop-reason mapping. Later plan tasks still owe the cross-process run
  lock, app-level cancel wiring (an actual "stop" button calling
  `AbortController.abort()`), and quit protection — none of that is
  implemented or claimed here.
- The plan's line-number references were checked against the actual
  Task-1-amended tree (not the unamended snippets in the plan text) per
  this task's own instructions; no anchor drift beyond what was already
  flagged was found.

Milestone movement: NO

Disposition: DONE
