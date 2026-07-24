# Task 035 — Brief

Requested visible outcome: one task at a time holds across processes, not
just within one (Task 3 of the Phase 2 core-surgery plan,
`docs/superpowers/plans/2026-07-24-cairn-phase2-core-surgery.md`). Today
the guard against overlapping runs is an in-process `Set`
(`activeRoots`) in `core/src/serial.ts` — it says nothing about a second
Cairn process (a second terminal, a second app instance, a stray
background run) started against the same project. This task adds a real
lock FILE at `<git-common-dir>/cairn-run.lock`, holding `{ pid, hostname,
startedAt }` as JSON, acquired by a new `core/src/lock.ts` and wired into
`runSerialTask` right after the in-process guard. A lock held by another
live process on this machine, or by any recorded holder on another
machine, or unreadable for any reason, refuses with an `Error` whose
message starts `SERIAL_RUN_ACTIVE:`. A lock whose recorded pid is dead on
this machine self-heals: it is removed and re-acquired so the run
proceeds.

Boundary of intent: `core/src/lock.ts` (new), `core/src/serial.ts` (wire
the acquire/release around the existing try/finally), `core/package.json`
(register the new test file in the enumerated `test` script), and
`core/test/lock.test.ts` (new) only. No dependency, version, or contract
changes. The lock file lives outside every worktree — in the git common
directory — so it can never trip the exact-path or phantom-dirty
invariants, and `.git/cairn` (the reserved legacy-state signal) is never
touched.

Checks that show the outcome holds:

- Acquiring the lock writes `<git-common-dir>/cairn-run.lock` and leaves
  the worktree's `git status --porcelain` exactly empty; releasing it
  removes the file.
- A real second `node` process holding the lock causes
  `runSerialTask` in this process to reject with `SERIAL_RUN_ACTIVE`.
- A lock file naming a pid that is dead on this machine self-heals:
  `runSerialTask` proceeds to `status: "done"` and the stale file is gone
  afterward.
- An unreadable (non-JSON) lock file refuses with a message that starts
  `SERIAL_RUN_ACTIVE:` and names `cairn-run.lock`, instead of guessing at
  its contents.
- The full core suite (`cd core && npm test`) and the root suite (`npm
  test`) stay green, including every pre-existing test, with the new
  suite registered (an unregistered `dist/test/*.js` file silently never
  runs under this repo's enumerated, non-glob test script).

DONE means the lock module is implemented exactly as specified, wired
into `runSerialTask`, red-then-green with the failing build observed
first, and the full core and root suites pass. STOPPED means a required
check could not be made to pass; whatever was written stays for
inspection.
