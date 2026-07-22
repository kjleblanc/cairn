# Task 042 report — Add credential-opaque Codex event diagnostics

## Result

Task 041 confirmed the current build and the real failure boundary: one Codex Exec
process returned `turn.completed`, but no product file, model report, or model log
row existed afterward. Cairn correctly stopped as `MODEL_RECORDS_MISSING`. The
previous implementation discarded every non-terminal JSONL event, so that evidence
could not distinguish no tool attempts from failed commands or partial file work.

Cairn now reduces completed Codex JSONL items to exactly four non-negative integers:

- completed agent-message items;
- completed command-execution items;
- completed file-change items; and
- failed command/file-change items, identified only by a `failed` status or nonzero
  numeric exit code.

The exact adapter result carries those four counters alongside the existing terminal
and token counts. Invalid, negative, fractional, hidden, accessor, symbol, Proxy, or
extra result fields continue to fail closed. When bounded process evidence is valid,
the activity feed and a Cairn-authored safety report show the numeric summary.

Cairn still discards and never places in the result, UI, task report, or log any item
text, reasoning, command, path, stdout, stderr, thread ID, account detail,
authentication data, or credential. The sandbox remains the documented
`workspace-write` plus `on-request` Auto policy; this task did not widen authority.

## Checks

- `npm.cmd test --workspace core` — PASS, 42 tests. This includes a real child
  process parser fixture with secret-looking agent text, command text, paths,
  stderr, and thread ID; the returned value contains only the expected numbers.
- `npm.cmd test --workspace cli` — PASS, 9 tests.
- `npm.cmd --prefix app run typecheck` — PASS.
- `npm.cmd --prefix app run test:smoke` — PASS, all 12 Electron tests. The new
  missing-record case shows `1` agent message, `2` commands, `2` file changes, and
  `2` failed items while the secret-looking payload is absent from UI and report.
- `git diff --check` — PASS before the final records; rerun in the final audit.
- Dependency/scope audit — no package manifest, lockfile, dependency, retry,
  continuation, scheduler, concurrency path, provider fallback, generic tracing
  framework, or broader sandbox changed.
- Real Codex/model calls during Task 042 — NONE.

## How to try it

1. Fully close any Cairn process started before this task and start the latest source
   build with `npm.cmd --prefix app start`.
2. Reuse the still-unimplemented small outcome from Task 041: `On the stopped task
   result card, show the safe stop reason code directly below "Codex Exec task:
   stopped", keep raw provider output hidden, and update the focused Electron test.`
3. Review the displayed OpenAI model, project, data scope, and quota. Confirm only
   if those exact terms are acceptable.
4. If the result stops, read the new `Bounded Codex events` activity/report line:
   - zero commands and zero file changes means the model attempted no workspace
     tools;
   - commands with failed items points to a command or sandbox failure;
   - file changes without records points to partial work or record noncompliance;
     and
   - a normal DONE result still requires the report, log row, protected-work check,
     and Cairn-created exact-path commit.

## Limitations and remaining judgment

Numeric item counts identify the failing layer but intentionally omit the raw cause.
If a later run shows failed items, resolving the exact command failure may require a
new separately approved, narrowly redacted diagnostic—not raw provider output or
credential inspection. The milestone still requires one real-model improvement to
complete end to end.

Milestone movement: **NO**

Disposition: **DONE**
