# Task 032 report — Remove the remaining runtime process gates

Date: 2026-07-21

## Result

DONE. Cairn's active core, CLI, Desktop IPC, and Desktop renderer no longer contain
the Direction workflow, a Direction timebox, automatic non-progress blocking, or a
missing-old-decision blocker. A project with retained unmatched task records shows
that evidence and still lets the beginner start a new serial task.

New projects now ask the four useful project questions, create `AGENTS.md`,
`docs/ai-work/PROJECT.md`, `docs/ai-work/LOG.md`, and `docs/ai-work/tasks/`, and do
not create `PILOT.md`. Existing historical pilot files and task evidence were not
changed.

Preserved legacy `.git/cairn` state still blocks new mutation. Cairn continues to
treat those bytes as opaque: it does not parse, migrate, rewrite, or delete them.

## Files changed

- Core scaffolding, project status, serial-start checks, exports, and tests.
- CLI setup, status, help, labels, and tests.
- Desktop setup, dashboard, route IPC, preload/shared types, styles, and Electron
  tests; the unused Direction screen was removed.
- `PROJECT-KICKOFF.md` and `CHANGELOG.md`.
- This task's brief, report, and append-only log row.

The obsolete `core/src/gates.ts`, `core/test/gates.test.ts`, and
`app/src/renderer/screens/Direction.tsx` files were removed. Git history retains
their complete contents.

## Checks and real results

- `npm.cmd test --workspace core` — PASS: 29 tests.
- `npm.cmd test --workspace cli` — PASS: 8 tests.
- `npm.cmd --prefix app run typecheck` — PASS.
- `npm.cmd --prefix app run build:vite` — PASS: main, preload, and renderer
  production bundles built.
- `npm.cmd exec -- playwright test` from `app/` — PASS: 9 Electron tests, including
  the offline beginner flow and retained-unmatched-record regression.
- Active source and current-bundle audit for Direction/timebox/PILOT and old blocker
  identifiers — PASS: no matches.

One initial parallel check was invalid because the core clean-build raced the CLI's
read of core output; the suites were rerun in dependency order and passed. One
initial Playwright invocation used the repository root, launched the wrong target,
and timed out; the generated artifacts were removed and the suite was rerun from
`app/`, where all tests passed.

## How the owner can try it

From the repository root, run:

```powershell
$env:CAIRN_MOCK='1'
npm.cmd --prefix app start
```

Open or create a disposable project, choose **Start a task**, enter one visible
outcome, choose **Find a route**, and run the offline demonstration. Success means
the activity feed reaches Result, the verified result says the requested product
change was not attempted, and the project returns to idle with an honest record.

## Limits

- This task connects no provider, uses no credential, makes no model call, adds no
  dependency, deploys nothing, and does not claim self-hosting.
- The built-in adapter remains an offline lifecycle demonstration only.
- Legacy `.git/cairn` migration is deliberately not implemented here.
- Existing historical task and pilot records remain as evidence, including Task
  031's old-process records.

Milestone movement: **NO** — this removes the process trap and clears the serial
path, but a real model has not yet improved Cairn.

Disposition: **DONE**
