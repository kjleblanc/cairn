# Task 005 — Report

What changed:

- `core/src/codex.ts` — the system process streams raw stdout JSONL and
  stderr to per-run debug files under `%LOCALAPPDATA%\Cairn\debug\` (system
  temp fallback) with credential-shaped tokens redacted; process failures
  reject with `CodexExecProcessError` carrying a precise code
  (`CODEX_EXEC_SPAWN_FAILED` or `CODEX_EXEC_STDIN_FAILED`) and the debug
  path; an oversized output line is skipped for parsing instead of killing
  the child.
- `core/src/serial.ts` — a process-failure stop's activity detail and safety
  report now name the precise code and the local debug evidence path.
- `core/test/codex.test.ts` — red-first tests: oversized-line survival,
  debug-file streaming with redaction, and the precise spawn code.
- `core/test/serial.test.ts` — red-first test: the stop record carries the
  code and debug path.
- Version 0.0.2 → 0.0.3 with changelog entry; contract version line,
  mirrors, package files, and lockfiles updated together.

Checks run and real results: the four new tests failed against the old code
for the expected reasons, then passed. Core 47/47, cli 9/9, app Playwright
13/13. Contract mirrors byte-identical (template ↔ core asset ↔ cairn.html
embed).

How to try it: any stopped real run now prints the failure code and a debug
file path in its report; open the file to read the run's full JSONL and
stderr. Debug files live outside every project and are never committed.

Limitations or remaining human judgment: redaction is applied per output
chunk, so a token split exactly across a chunk boundary could evade it —
acceptable for the owner's own local disk. Debug files accumulate until the
owner deletes them; no automatic expiry yet. The Task 004 root cause remains
undiagnosed pending the next real run, which will retain its evidence.

Milestone movement: NO

Disposition: DONE
