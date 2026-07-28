# Task 101 report — one Cairn at a time (single-instance lock)

## What actually changed

- `app/src/main/main.ts` — the only code file. The whole app boot (window,
  IPC registration, quit handlers) moved into a `bootstrap()` function that
  is gated on `app.requestSingleInstanceLock()`: a launch that loses the lock
  calls `app.quit()` before creating a window, registering an IPC handler, or
  touching the shared profile; the winner listens for `second-instance` and
  focuses its window (restoring if minimized, recreating only in the
  all-windows-closed case). `electron-squirrel-startup` handling stays first;
  the before-quit task drain is unchanged. Test launches never take the lock:
  the guard keys on `CAIRN_MOCK` being present (every E2E spec sets it, both
  lanes), so no test file changed.
- Records: `101-brief.md` (renumbered from 099 — see below), this report,
  one LOG.md row.

## Checks run and their real results

- `npm.cmd run build:vite`: **pass**. `npm.cmd run typecheck`: **pass**.
- Duplicate launch against the built bundle: the second instance **exits by
  itself, code 0, with a completely empty log** — no window, no preflight, no
  profile cache writes. Exactly one app remains (4 processes). **Pass.**
- Test lane: two `CAIRN_MOCK=1` launches coexist as two full apps
  (8 processes). **Pass.**
- Green-suite re-check (`smoke`, `projects`, `away`, `connect-kimi`,
  conductor's connect-card test): **confounded by parallel-session churn.**
  `connect-kimi` and `smoke` — green hours earlier — failed with the same
  30-second post-click hang signature as the pre-existing red tests. A
  controlled experiment (this task's `main.ts` change stashed, rebuild,
  re-run) **fails identically without the change**, proving the regression is
  not this task's. At the time, a parallel owner session was actively
  committing (its own tasks 099 and 100) with six `node` processes and a dev
  server on port 8081 running. Re-confirming these suites once the tree is
  quiet remains open.

## Parallel-session collision and resolution

While this task was uncommitted, a parallel session committed Task 097
(`c4b996f`), its own Task 099 "the visual lab" (`7db6f97`), and Task 100
"garden tokens" (`146276c`). Its 099 collided with this task's drafted
number. This task was renumbered to 101; the parallel session's
`099-brief.md` was restored byte-for-byte from its commit, and its records
are untouched. The commit below was made at the owner's direction
(2026-07-28 14:09) while the other session was settling.

## How to try it

1. Open Cairn (Desktop shortcut or `npm start`).
2. Open it again — the second window never appears; the running one comes to
   the front. Double-clicking the shortcut repeatedly is now safe.

## Limitations and remaining human judgment

- The `second-instance` handler's focus/restore behavior was verified by
  process-level evidence (the loser never becomes a window); the visual
  focus of the existing window was not separately asserted.
- The suite regression present at verification time belongs to the parallel
  session's in-flight state or machine load, not to this change (revert
  experiment above). Whether those suites are green again should be confirmed
  once the tree settles; if they stay red, that is a new task, not a repair
  of this one.
- Dev (`npm start`) and shortcut launches share the lock, as intended; a
  second `npm start` while one is running will now quit its app process (the
  dev server may still occupy port 5173 — separate, pre-existing behavior).

Disposition: DONE — the requested outcome holds and was directly verified in
both lanes; the suite-level regression check was confounded externally and
proven independent of this change, with re-confirmation at settle left open.
