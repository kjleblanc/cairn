# Task 032 — Remove the remaining runtime process gates

Date: 2026-07-21

## Visible outcome

A beginner can start the next serial task without being blocked by repeated NO or
STOPPED rows, a historical task missing an old decision row, a Direction screen, or
a project timebox. New projects ask four useful questions and do not create a
`PILOT.md` process file.

This makes the active runtime match Cairn Contract v3.0. It does not connect a
provider, call a model, migrate legacy `.git/cairn` state, deploy, install anything,
or change the honest brief/report/log lifecycle.

## May change

- core project scaffolding, status, serial-start checks, exports, and their tests;
- CLI setup/status copy and their tests;
- Desktop project setup, dashboard, task-route IPC, preload/shared types, styling,
  and tests;
- removal of the unused Direction core module/export, UI screen, IPC surface, and
  obsolete tests;
- current guides/changelog where they describe new-project `PILOT.md`; and
- this task's brief, report, and one append-only log row.

No dependency, lockfile, contract rule, historical task file, existing log row, or
legacy `.git/cairn` byte may be changed.

## Protected starting state

- Project root: `C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework`
- Branch: `main`
- Starting commit: `5140f4d7fa092e675a80f5e1e9cbcdc57b3baa1d`
- Working tree before this brief: clean
- Existing Task 031 brief/report and the append-only log remain historical evidence.

## First useful checkpoint

Core tests prove that two consecutive STOPPED/NO rows and Task 031-style retained
records no longer block route or run, while legacy `.git/cairn` state still blocks
without mutation.

## Checks

- New projects contain `AGENTS.md`, `PROJECT.md`, `LOG.md`, and `tasks/`, with no new
  `PILOT.md` or Direction timebox.
- Project facts no longer expose `timebox`.
- Project status may report retained unmatched records but never treats them as a
  permission gate.
- Serial route/run ignores historical outcome patterns and missing old decision rows.
- Legacy `.git/cairn` state remains read-only and blocking.
- No Direction module, export, IPC method/channel, renderer view, dashboard control,
  CLI label, or new-project question remains.
- Core, CLI, typecheck, production build, reduced Electron tests, and a headed
  offline serial run pass.
- Source and current-bundle audits find no active Direction/timebox/PILOT process
  surface.
- The final diff contains only this task and named runtime/documentation areas.

## Assumptions

- Existing `PILOT.md` files remain untouched historical files; only new creation and
  active references are removed.
- Retained briefs/reports without a log row remain visible evidence. Starting a new
  task does not rewrite, resume, or silently close them.
- The existing eight-column log format remains for backward-compatible honest record
  reading; its legacy column names do not block work.

## DONE and STOPPED

DONE means the remaining automatic process gates are absent from the active runtime,
the next task can start on a project with Task 031-style evidence, new project setup
has no timebox/PILOT ceremony, all checks pass, and one exact local commit is created.

STOPPED means a process gate remains reachable, Git or historical evidence protection
fails, legacy state is mutated, checks do not complete, or the change would require a
dependency, provider, credential, model call, external action, or unclear recovery.
