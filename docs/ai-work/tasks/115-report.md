# Task 115 report — Level 3a plan, Task 2: the Kimi exec process (argv, stream-json, watchdogs)

## What actually changed

- `core/src/kimi.ts` — the process half, appended below the Task 113
  detection half:
  - `KimiExecRequest { command, args, cwd, prompt }` and
    `KimiExecProcess { kind: "system" | "fake" }`; the prompt is separate
    from args and is appended at spawn as one `-p` argv element.
  - `KimiExecProcessResult` carries only spike-observed fields: `exitCode`,
    `terminalEvent` (`"process-exit"` — the spike observed no terminal
    event; the terminal state is process exit — or `"error"` for a malformed
    line), `agentMessageCount`, `toolCallCount`, `failedToolItemCount`,
    `finalMessage`. No token fields, not even zeroed.
  - `KIMI_EXEC_INACTIVITY_MS` 600 s, `KIMI_EXEC_ABSOLUTE_MS` 3 600 s,
    `KIMI_EXEC_PROMPT_MAX_CHARS` 24 000.
  - `KimiExecProcessError` (`KIMI_EXEC_SPAWN_FAILED`,
    `KIMI_PROMPT_TOO_LONG`), `KimiExecTimeoutError` (`KIMI_EXEC_TIMED_OUT`,
    inactivity/absolute), `KimiExecCancelledError` (`KIMI_EXEC_CANCELLED`) —
    the kimi specializations of `WorkerProcessError`, with the `is*` guards.
  - `createSystemKimiExecProcess(options?)`: resolves the command through
    the Task 113 resolver (so the fail-closed `CAIRN_TEST_LANE` guard covers
    the exec path too), refuses an over-long prompt pre-spawn
    (killed-by-construction), spawns
    `[...args, "-p", prompt]` with stdin ignored (the spike: stdin is not a
    prompt channel, so there is no stdin failure class), `.cmd` shims via
    ComSpec, codex-shape inactivity + absolute watchdogs, tree kill
    (`taskkill /T` on Windows, process-group SIGKILL on POSIX), owner
    cancel, the 5-second force-settle fallback, and redacted debug copies
    (`kimi-*.jsonl`, `kimi-*.stderr.log`) in the same outside-every-project
    debug directory.
  - The stream-json parser, from spike-observed lines only: assistant string
    `content` → finalMessage (last wins, 262 144-char cap) + count 1;
    assistant `tool_calls` → toolCallCount += length; `role:"tool"` → no
    numeric change except the documented conservative failure rule (counts
    only when content parses as a JSON object carrying `status:"failed"` or
    `isError:true` — error-looking plain text never counts, because
    print-mode failure marking was not observed); `role:"meta"` → ignored
    for results, retained in the debug copy; malformed line → terminalEvent
    `"error"` with evidence frozen after it; oversized line (>1 MB) →
    dropped and finalMessage nulled (the codex overwrite-to-null rule), with
    recovery by a later fully-visible message.
- `core/test/kimi.test.ts` — 15 new tests (24 total in the file), written
  red-first: constants; PONG clean finish with exact six-field shape;
  echo-tool sequence; conservative failed-tool counting both ways; malformed
  line freezing; oversized drop + null + recovery; non-zero exit; missing
  final message; the wire pin asserting the fake child's real argv
  (`--output-format stream-json -m kimi-code/kimi-for-coding` then `-p` +
  the prompt as one element); prompt >24 000 refused pre-spawn (fake never
  ran); unresolvable command → `KIMI_EXEC_SPAWN_FAILED`; inactivity and
  absolute watchdog kills on wedged fakes; pre-spawn and mid-run cancel;
  redacted debug copies with the meta line retained.
- This report, `115-brief.md` (committed first to claim the number), and
  one LOG.md row.

No other files. `core/src/index.ts` already re-exports `kimi.js`.

## Checks run and their real results

1. `npm test` at the root: **core 130/130** (the Task 113 baseline of 115
   plus the 15 new tests; the 9 detection tests pass unmodified), **cli
   9/9**. Red-first held: the new tests failed at build (missing exports)
   before the implementation existed.
2. `git status --porcelain` and `git diff --stat`: only the two named files.
   `design/` remains the parallel lane's pre-existing untracked directory.
3. No test reached the real signed-in CLI: every exec test runs against a
   hermetic fake on a minimal PATH (fake bin + System32 only) with an empty
   home, so the `~/.kimi-code/bin` fallback has nothing to find.

### Disclosed harness repair (in-scope, one)

The first red run failed all spawn-based tests with `KIMI_EXEC_SPAWN_FAILED`
— reproduction showed `spawn cmd.exe ENOENT`: this shell sets no `ComSpec`,
and the test helper had replaced PATH entirely, so a bare `cmd.exe` shim
launch could not resolve. The Task 113 helper masked this by prepending to
the inherited PATH. Fix: the helper's PATH is now the fake bin plus
System32 only — `cmd.exe` resolves, and a user PATH carrying the real CLI
is never inherited (stronger isolation than the prepend idiom). Touched only
`core/test/kimi.test.ts`.

## How to try it

`npm test` at the repo root. To read the seam: `core/src/kimi.ts` from
`KimiExecRequest` down; the parser rules are the `streamJsonEvidence` and
`conservativeToolFailure` functions with their comments.

## Limitations and remaining human judgment

- Every fact parsed is spike-observed; failure exit codes and provider
  retry notices were never observed and are treated as ordinary non-zero
  exits / stderr text, not special shapes.
- The conservative failed-tool rule is a documented implementation choice,
  not an observed CLI behavior; if a later CLI version marks failures
  differently, the wire pins are the tripwire.
- The disclosure, authorization, adapter factory, and worker prompt are
  plan Task 3 — not built here.

Disposition: DONE
