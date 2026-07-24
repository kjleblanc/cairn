# Task 034 — Brief

Requested visible outcome: the owner can stop a running Codex Exec
worker (Task 2 of the Phase 2 core-surgery plan,
`docs/superpowers/plans/2026-07-24-cairn-phase2-core-surgery.md`) through
the same adapter seam the Task 1 watchdog uses. `core/src/routing.ts`'s
`TaskAdapter.run` and `core/src/codex.ts`'s `CodexExecProcess.run` gain an
optional `AbortSignal`. Aborting it kills the whole Windows process tree
(or sends SIGKILL on POSIX) the same way a timeout does, and the process
rejects with a new precise error, `CodexExecCancelledError` (`code:
"CODEX_EXEC_CANCELLED"`, `debugPath`). `core/src/serial.ts` gains
`SerialRunOptions.signal`, passes it through to the chosen adapter, and
maps a caught cancellation to a new `SerialStopReason`,
`"CANCELLED_BY_OWNER"` — the stop report tells the owner honestly that
the worker process had already started and any cost for that call is
already spent, the same sentence Task 1 wrote for a timeout.

Boundary of intent: `core/src/codex.ts`, `core/src/routing.ts`, and
`core/src/serial.ts` only, plus their test files. No dependency,
version, or contract changes. No change to any other adapter or to the
CLI/app layers (those are later tasks in the same plan) — `TaskAdapter`'s
extra optional parameter is source-compatible, and neither the CLI nor
the app implements the interface directly, so nothing else needs to
change for the suites to stay green.

One adjacent one-line fix from Task 1's review is folded in here because
it touches the exact watchdog code this task extends: the shared
force-settle callback (fired 5 seconds after a failed tree-kill) now
calls `clearWatchdog()` before rejecting, so the sibling watchdog timer
and the abort listener can never dangle in that failed-kill fallback
path. It is implemented once, in a small `armForceSettle` helper shared
by both the timeout and the cancel paths.

Checks that show the outcome holds:

- A hermetic fake `codex` child that goes silent forever is killed when
  its caller's `AbortSignal` is aborted; the run rejects with
  `CodexExecCancelledError` (`code: "CODEX_EXEC_CANCELLED"`).
- `runSerialTask` closes an aborted worker with `reason ===
  "CANCELLED_BY_OWNER"`, retains whatever workspace evidence the worker
  had already written, and the written report states plainly that the
  worker process had already started before Cairn stopped it.
- The full core suite (`cd core && npm test`) and the root suite (`npm
  test`) stay green, including every pre-existing test, with no orphaned
  child processes left behind.

DONE means the cancel path and the new stop reason are implemented,
red-then-green with the failing tests observed first, and the full core
and root suites pass. STOPPED means a required check could not be made
to pass; whatever was written stays for inspection.
