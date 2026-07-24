# Task 035 — Report

What changed:

- `core/src/lock.ts` (new) — exports `interface RunLock { release(): void }`
  and `acquireRunLock(root: string): RunLock`. `lockFilePath` resolves
  `<git-common-dir>/cairn-run.lock` via `git rev-parse --git-common-dir`
  run in `root` (`GIT_TERMINAL_PROMPT=0`, resolved against `root` since
  the common dir can be relative). `tryCreate` writes
  `{ pid, hostname, startedAt }` with `flag: "wx"` (atomic create-only;
  fails if the file exists). `acquireRunLock`: if create fails, it reads
  and JSON-parses the existing file; a parse failure or a shape that
  does not have a numeric `pid`, string `hostname`, and string
  `startedAt` throws `SERIAL_RUN_ACTIVE: A run lock exists but could not
  be read...` naming `cairn-run.lock`. A holder on a different hostname
  throws `SERIAL_RUN_ACTIVE:` naming that hostname and timestamp. A
  holder whose pid answers `process.kill(pid, 0)` (alive, or `EPERM`
  meaning alive-but-not-ours) throws `SERIAL_RUN_ACTIVE:` naming the pid
  and timestamp. Otherwise the pid is dead on this machine: the stale
  file is unlinked (a failed unlink — lost a race with another healer —
  falls through to one more `tryCreate` attempt rather than crashing) and
  recreated. `release()` is idempotent and unlinks the file, treating a
  missing file as already-released.
- `core/src/serial.ts` — imports `acquireRunLock, type RunLock` from
  `./lock.js`. In `runSerialTask`, immediately after
  `activeRoots.add(projectRoot);`: acquires the lock in a `try/catch`
  that removes `projectRoot` from `activeRoots` and rethrows on failure
  (so a second-process refusal never leaves the in-process guard stuck
  believing a run is active). The existing outer `finally` block now
  calls `lock.release();` first, before `activeRoots.delete(projectRoot);`
  — release always runs on every exit path (done, stopped, or thrown)
  because it sits in the same `finally` that already guaranteed the
  in-process guard was cleared. The in-process `Set` still throws first
  for same-process overlap (line ~658, before the file lock is ever
  reached), so the file lock only ever speaks for a genuinely different
  process — exactly the plan's intent.
- `core/package.json` — appended ` dist/test/lock.test.js` to the
  enumerated `node --test` file list in the `test` script (line 14), in
  the same step as creating the test file, per the plan's explicit
  warning that an unregistered suite silently never runs.
- `core/test/lock.test.ts` (new) — four tests, verbatim from the task
  brief: (1) acquiring writes the lock file at the git-common-dir path
  with the right `pid`/`hostname`, leaves the worktree's
  `git status --porcelain=v1 --untracked-files=all` exactly empty, and
  releasing removes the file; (2) a real second `node` child process
  (spawned with `--input-type=module -e ...`, importing `dist/src/lock.js`
  directly) acquires and holds the lock until killed; while it holds,
  `runSerialTask` in this process rejects matching `/SERIAL_RUN_ACTIVE/`;
  (3) a lock file naming pid `999_999_999` (dead on this machine)
  self-heals — `runSerialTask` reaches `status: "done"` and the file is
  gone afterward; (4) a lock file containing `"not json at all"` makes
  `acquireRunLock` throw synchronously with a message starting
  `SERIAL_RUN_ACTIVE:` that includes `cairn-run.lock`.
- `docs/ai-work/tasks/035-brief.md`, `docs/ai-work/tasks/035-report.md`,
  and one appended row in `docs/ai-work/LOG.md` — this task's own
  records.

Checks run and real results:

- RED (Step 1–2): after creating `core/test/lock.test.ts` and
  registering it in `core/package.json`, before `core/src/lock.ts`
  existed, `cd core && npm test` failed at the TypeScript build step
  exactly as predicted:
  ```
  test/lock.test.ts(8,32): error TS2307: Cannot find module '../src/lock.js'
  or its corresponding type declarations.
  ```
- GREEN, foreground: `cd core && npm test` — 60/60 tests pass, 0
  failures: all 56 pre-existing tests unchanged plus the four new
  `lock.test.ts` tests (`the lock file lives in the git common dir and
  never dirties the worktree`, 327ms; `a lock held by another live
  process refuses a second run`, 284ms — the real child-process holder
  test, no timing flakiness observed; `a stale lock from a dead process
  self-heals`, 530ms; `an unreadable lock refuses and names the file
  instead of guessing`, 156ms).
- GREEN, foreground: root `npm test` (core + cli workspaces) — core
  60/60, cli 9/9, 69/69 total, 0 failures.
- Orphan-process check after the full suite ran:
  `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match
  'cairn-lock-test' }` showed no leftover holder processes — the test's
  `finally { holder.kill(); }` cleans up the spawned child every time.
- `git status --porcelain` before staging: exactly `core/package.json`,
  `core/src/serial.ts`, plus the two new files `core/src/lock.ts` and
  `core/test/lock.test.ts` — matches the task's boundary of intent
  exactly, nothing unexpected.

How to try it: from `core/`, run `npm run build && node --test
--test-reporter tap dist/test/lock.test.js` to see all four lock
behaviors in isolation; `npm test` for the full suite.

Limitations and remaining human judgment:

- The lock is per-repository (keyed by git common dir), so it is shared
  across all worktrees of one repository — the plan's deliberately
  conservative reading of "one task at a time." A user running Cairn
  against two different worktrees of the same repo at once will see the
  second refused, which is intended, not a bug.
- Cross-machine holders are refused unconditionally (no liveness check
  is possible across hosts) rather than guessed at; the stop message
  names the recorded hostname and timestamp so the owner can judge
  staleness themselves.
- This task lands only the lock module and its wiring into
  `runSerialTask`. Later plan tasks still owe app-level surfacing of a
  `SERIAL_RUN_ACTIVE` refusal (a friendly UI message rather than a raw
  thrown error reaching the CLI/app boundary) — not implemented or
  claimed here.
- The plan's line-number references (`serial.ts:664`, `:878-880`) had
  already shifted from Tasks 1–2's edits by the time this task started;
  anchors were confirmed against the actual current file (`activeRoots.add`
  at line 668, the `finally` block at lines 890–892 pre-edit) rather than
  the plan's literal numbers, per this task's own instructions.

Milestone movement: NO

Disposition: DONE
