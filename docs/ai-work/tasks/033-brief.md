# Task 033 — Brief

Requested visible outcome: a wedged `codex` child process (Task 1 of the
Phase 2 core-surgery plan, `docs/superpowers/plans/2026-07-24-cairn-phase2-core-surgery.md`)
can no longer hang a Cairn task forever. `core/src/codex.ts` gains a
two-timer watchdog — an inactivity timer reset on every stdout/stderr
chunk, and a fixed absolute cap from process start — that kills the
whole Windows process tree (not just the cmd.exe shim, which would
orphan the real codex process) or sends SIGKILL on POSIX, then rejects
with a new precise error, `CodexExecTimeoutError`
(`code: "CODEX_EXEC_TIMED_OUT"`, `timeoutKind: "inactivity" | "absolute"`,
`debugPath`). `core/src/serial.ts` maps this to a new `SerialStopReason`,
`"ADAPTER_TIMED_OUT"`, and the stop report now tells the owner honestly
that the worker process had already started and any cost for that call
is already spent.

Boundary of intent: `core/src/codex.ts` and `core/src/serial.ts` only,
plus their test files. No dependency, version, or contract changes. No
change to any other adapter or to the CLI/app layers (those are later
tasks in the same plan).

Checks that show the outcome holds:

- A hermetic fake `codex` child that goes silent forever is killed by
  the inactivity timer; the run rejects with `CodexExecTimeoutError`
  (`code: "CODEX_EXEC_TIMED_OUT"`, `timeoutKind: "inactivity"`) and
  settles promptly instead of hanging.
- A hermetic fake `codex` child that chatters forever is killed by the
  absolute cap; the run rejects with `timeoutKind: "absolute"`.
- `runSerialTask` closes a timed-out worker with `reason ===
  "ADAPTER_TIMED_OUT"`, and the written report names the fixed error
  code, the local debug path, and states plainly that the worker
  process had already started before Cairn stopped it.
- The full core suite (`cd core && npm test`) and the root suite (`npm
  test`) stay green, including every pre-existing test — the default
  timers (600 000 ms inactivity, 3 600 000 ms absolute) are far too long
  to ever fire in an existing test.

DONE means the watchdog and the new stop reason are implemented,
red-then-green with the failing tests observed first, and the full
core and root suites pass. STOPPED means a required check could not be
made to pass; whatever was written stays for inspection.
