# Task 103 brief — re-verify the E2E suite on the settled tree

## Requested visible outcome

The full Playwright E2E suite (`app/tests/`: smoke, projects, away,
connect-kimi, conductor, routing, serial) runs against a freshly built bundle
on the now-settled tree, and we know — with evidence — whether the
30-second post-click hang failures Task 101 saw in `connect-kimi` and `smoke`
still exist. If they do, the failures are diagnosed to a named cause.

## Boundary of intent — what must not change

- No application or test source changes unless diagnosis proves a defect and
  a repair is in scope; any repair is disclosed file by file.
- No processes are killed and no software is installed without owner approval.
- The owner's real `conductor.json` is restored by the fixture exactly as
  before (the existing `workers: 1` guard is untouched).
- Existing task records, LOG rows, and the untracked `design/` directory are
  untouched.

## Checks that will show the outcome holds

1. `npm run build:vite` passes (fresh bundle, satisfying the global-setup
   freshness guard).
2. The full suite runs serially (`workers: 1`, the config's load-bearing
   setting) and each spec's result is recorded.
3. If any test fails with the post-click hang signature, the failure is
   reproduced in isolation (single spec, nothing else running against this
   project) and diagnosed: app log, fixture state, and machine state named.

## What DONE and STOPPED mean here

- DONE: the suite verdict is known from a real run — all green, or specific
  reds reproduced and diagnosed to a named cause with a proposed repair.
- STOPPED: the suite cannot complete (build blocked, machine state unsafe),
  or diagnosis would require an unapproved action (killing a foreign
  process, touching credentials, changing the fixture's safety model).

## Machine state at start

Tree is clean except the pre-existing untracked `design/`. One foreign
`C:\Program Files\nodejs\node.exe` (PID 33304, ~700 MB) listens on port 8081
— unrelated to Cairn (no `8081` anywhere in app source). Three `esbuild.exe`
watchers from this project's own `node_modules` are running (started
13:36–13:51, before this task), consistent with leftover dev watchers from
the earlier parallel session. They are left running unless they demonstrably
interfere; killing them is an owner decision.
