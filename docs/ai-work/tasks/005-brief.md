# Task 005 — Retain raw Codex evidence and name process failures precisely

Requested visible outcome: a stopped real Codex Exec run leaves enough
evidence on the owner's own disk to diagnose it — the full JSONL stream and
stderr are written to a local debug file outside the repository, the stop
record names which process failure occurred, and an oversized output line no
longer kills the whole task.

Boundary of intent (from the Task 004 stop, which retained no cause):

1. `core/src/codex.ts` — the system process streams raw stdout and stderr to
   `%LOCALAPPDATA%\Cairn\debug\` (tmpdir fallback), one pair of files per
   run, with credential-shaped tokens redacted; the files never live inside
   the target project, so Git protection and exact-path commits are
   untouched.
2. Distinct failure codes replace the single opaque rejection: spawn,
   stdin, and output-overflow failures each carry their own code, and the
   stop activity plus safety report name the code and the debug file path.
3. The 1 MiB single-line guard stops killing the child: an oversized line is
   skipped for parsing (it is already in the debug file) and the run
   continues to its honest terminal event.
4. Red-first tests for each behavior; version 0.0.2 → 0.0.3 with changelog
   and mirrors.

What must not change: no raw provider output, reasoning, or paths enter Cairn
results, task records, or the repository; the debug files are the owner's
local diagnostic copy only. No retry, fallback, scheduler, dependency, or
sandbox change.

Checks: new core tests fail against current code, then pass; core, cli, and
app suites green; a fake overflowing process completes instead of failing; a
fake spawn failure surfaces its precise code and debug path in the safety
report.

DONE means the suites are green and a stopped fake run demonstrably leaves
the debug files and precise code. STOPPED means it does not. Milestone
movement: NO — this builds the eyes for the next milestone attempt.
