# Task 060 — Brief

Requested visible outcome: close the quit-grace run-refusal hole (Phase 3 Task
2). During the quit grace window — `quitting = true` through the 8-second race
in `app/src/main/main.ts`'s `before-quit` handler — `task:run` could still
accept and start a brand-new worker run. It now refuses with
`QUIT_IN_PROGRESS` while draining. Alongside this, the one-running-task-per-
project Set moves out of `app/src/main/tasks.ts` into a new
`app/src/main/rungate.ts`, so `conductor/service.ts`'s send gate reads the same
running-set without importing from `tasks.ts` — the cycle-breaker later Phase
3 tasks (result relay) need once `tasks.ts` starts importing from
`service.ts`.

Boundary of intent: `app/src/main/rungate.ts` (new), `app/src/main/tasks.ts`,
`app/src/main/main.ts`, `app/src/main/conductor/service.ts` (import path only),
`app/tests-unit/rungate.test.ts` (new), plus this task's three record files.
No other IPC handler, no renderer change, no version bump, no milestone
movement — this is a hardening/refactor fix inside 0.2.1.

Checks that show the outcome holds:

- `cd app && npm run test:unit` — RED first (module not found for the new
  `rungate.ts`), then GREEN across the full unit suite after the implementation.
- `cd app && npm run test:smoke` — full Playwright suite green, proving no
  observable behavior changed for any existing path.
- `cd app && npm run typecheck` — clean, confirming the rewired imports
  (`tasks.ts`, `service.ts`, `main.ts`) all resolve.

DONE means: `rungate.ts` owns the running-set and the quit-drain flag behind
the exact interface named in the plan (`markRunning`, `clearRunning`,
`isTaskRunning`, `runningDirs`, `beginQuitDrain`, `isQuitDraining`,
`_resetForTests`, `runRefusal`); `task:run` refuses a new run during quit-drain
with `QUIT_IN_PROGRESS` and otherwise keeps refusing `SERIAL_RUN_ACTIVE`
unchanged; `tasks.ts` no longer owns a local running Set; `service.ts` imports
`isTaskRunning` from `../rungate.js`; every existing unit and smoke test stays
green. STOPPED means a check failed or the changed set held anything
unexpected.
