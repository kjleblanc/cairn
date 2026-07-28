# Task 101 — one Cairn at a time (single-instance lock)

(Originally drafted as 099; renumbered when a parallel owner session landed
its own tasks 099 and 100 while this work was uncommitted. Their records are
untouched.)

Requested outcome: Launching Cairn while Cairn is already running does not
open a second app. The second launch quits itself, and the existing window
comes to the front (restored if minimized). Double-clicking the Desktop
shortcut twice is safe. Owner direction 2026-07-28: "Go ahead with single
instance lock", after the 12:47 incident where two instances shared one
profile and the app felt unresponsive.

Why: every stored file under `userData` (the conductor connection, remembered
projects, logs, result-card markers) is written by exactly one main process;
nothing in Cairn is built for two. Today nothing prevents the duplicate.

Boundary of intent:

- Files that may change: `app/src/main/main.ts`, plus this task's records.
  No test file changes (task 097's in-flight specs stay untouched).
- The lock is acquired at startup, after the Squirrel-startup check and the
  test-userData seam, before any window or IPC registration; the loser quits
  before registering anything.
- **Test launches never take the lock.** Every E2E spec sets `CAIRN_MOCK`
  (both the "1" mock lane and the "0" real-call lane), so the guard keys on
  the marker's presence, not its value. A test app that silently quit because
  the owner had Cairn open would fail in a way no assertion could explain.
- `electron-squirrel-startup` handling stays first; the before-quit task
  drain is unchanged; a single launch behaves exactly as before.
- Second-instance behavior: focus the existing window (restore if minimized);
  recreate it only if none exists (the macOS all-windows-closed case).

Checks:

1. `npm.cmd run build:vite` passes.
2. Manual, both lanes, against the built bundle: (a) a second plain launch
   quits itself and the first instance stays alive; (b) two `CAIRN_MOCK=1`
   launches coexist (the test lane is undisturbed).
3. The suites that were green stay green: `smoke`, `projects`, `away`,
   `connect-kimi`, and `conductor.spec.ts`'s connect-card test. (The eight
   pre-existing red tests from task 098's report are outside this task; they
   are not re-run here and their state is unchanged by construction — this
   task touches only startup, and test launches skip the lock.)
4. Final diff and Git status contain only `main.ts` and records.

DONE means a duplicate launch focuses the running app instead of becoming a
second one, the test lane is provably unaffected, and the green suites stay
green.

STOPPED means the lock interferes with the test lane or a single launch, a
green suite regresses, or the behavior cannot be verified on this machine.
