# Task 115 brief — Level 3a plan, Task 2: the Kimi exec process (argv, stream-json, watchdogs)

Claims task number 115 (checked `main` history, `docs/ai-work/tasks/`, and the
lane B branch and worktree: highest claimed is 114).

## Requested visible outcome

The process half of `core/src/kimi.ts` exists and is unit-tested, in the codex
idiom against the Task 106 spike's observed facts only:

- `KimiExecRequest { command, args, cwd, prompt }` — the prompt is separate
  from args and is appended at spawn as one `-p` argv element; past 24,000
  chars the run is refused pre-spawn with `KIMI_PROMPT_TOO_LONG` (a
  `WorkerProcessError` with failure `"process"`, killed-by-construction).
- `KimiExecProcessResult` carries only what the spike observed: `exitCode`,
  `terminalEvent` (`"process-exit"` — the observed terminal state is process
  exit — or `"error"` for a malformed line), `agentMessageCount`,
  `toolCallCount`, `failedToolItemCount`, `finalMessage`. No token fields.
- `createSystemKimiExecProcess(options?)` spawns the resolved command with
  `kimi -p <prompt> --output-format stream-json -m kimi-code/kimi-for-coding`,
  cwd = the project, `.cmd` shims via ComSpec exactly as the detection half
  does; inactivity (600 s) + absolute (3 600 s) watchdogs in the codex timer
  shape, tree kill, owner cancel, force-settle fallback, and redacted debug
  copies (`kimi-*.jsonl`, `kimi-*.stderr.log`) outside every project.
- The stream-json parser is built only from spike-observed lines: assistant
  string `content` → finalMessage (last wins) + count 1; assistant
  `tool_calls` → toolCallCount += length; `role:"tool"` → no numeric change,
  except a conservatively defined explicit-failure shape counts one failed
  tool (documented in code: only content that parses as a JSON object
  carrying `status:"failed"` or `isError:true` counts — error-looking plain
  text never does, because print-mode failure marking was not observed);
  `role:"meta"` → ignored for results, retained in the debug copy; malformed
  line → terminalEvent `"error"`; oversized line (>1 MB) → dropped and
  finalMessage nulled (the codex overwrite-to-null rule, same reason).

## Boundary of intent — what must not change

- Files that may change: `core/src/kimi.ts` (process half appended),
  `core/test/kimi.test.ts` (new tests appended), this task's records, one
  LOG.md row. `core/src/index.ts` already re-exports `kimi.js` — no change.
- No codex, routing, serial, app, cli, design, or contract changes. The
  parallel lane owns renderer visuals; its files are untouched.
- Red-first: the new tests are written and seen failing before the
  implementation. **No test may reach the real signed-in CLI** — every
  process test runs against a hermetic fake on PATH with an empty home (the
  `~/.kimi-code/bin` fallback isolated), exactly as the Task 113 tests do;
  the `CAIRN_TEST_LANE` guard and its test stay.
- The disclosure, authorization, adapter factory, and worker prompt are plan
  Task 3 — out of scope here. Detection-half behavior and its existing tests
  pass unmodified.

## Checks that will show the outcome holds

1. `npm --prefix core test` passes, including the new process tests: clean
   finish (PONG transcript), echo-tool sequence, failed-tool conservative
   counting (explicit shape counts, plain error text does not), meta line
   ignored-but-debugged, malformed line, oversized line, non-zero exit,
   missing final message, inactivity and absolute timeouts with wedged
   fakes, cancel pre-spawn and mid-run, unresolvable command →
   `KIMI_EXEC_SPAWN_FAILED`, prompt >24,000 chars refused pre-spawn (fake
   records zero runs), redacted debug copies, the result carries exactly the
   six observed fields, and a wire pin asserting the fake child received
   `-p`, the prompt element, `--output-format stream-json`, and
   `-m kimi-code/kimi-for-coding`.
2. `git diff --stat` and status contain only the named files.

## What DONE and STOPPED mean here

- DONE: the exec process works against fakes with the guard in place, the
  full core suite is green, and the diff is scoped.
- STOPPED: a check fails without an in-scope correction, a test cannot be
  kept away from the real CLI, or isolation from the parallel lane cannot be
  maintained.
