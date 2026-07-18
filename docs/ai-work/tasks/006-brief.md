# Task 006 — brief

## Lane

**Standard.** One reason: this moves working controls between two screens of the desktop
app and touches the shared "remembered choice" behaviour behind them — more than one
area, so it is bigger than a Tiny change, but it adds no dependency, changes no stored
format, and touches nothing external, so it is not High-Stakes.

## Draft or Final

**Final.** The owner has already chosen the exact outcome in plain words: the model and
effort choices move next to the "Start a task" button. This task integrates that chosen
outcome; there is no candidate left to judge first.

## The visible outcome

Today, choosing the model and the effort lives on the Settings screen (task 005's
accepted result). The owner wants those choices **next to the "Start a task" button**
on the project dashboard, so the two dials are visible and changeable right where a
task begins — no detour through Settings.

After this task, on the dashboard (`app/src/renderer/screens/Dashboard.tsx`):

- Beside (or directly under) the "Start a task" button, the owner sees and can change:
  - **the model** — the same pick-list of seven current Claude models, still accepting
    any typed id, blank meaning the default (`claude-opus-4-8`); and
  - **the effort** — the same six choices (Default + low / medium / high / xhigh / max).
- The controls show what is currently active, exactly as Settings does today.
- Changing them here behaves byte-for-byte like changing them in Settings did:
  the same saved keys (`cairn-model`, `cairn-effort` in localStorage), the same
  `task:setModel` / `task:setEffort` calls, the same "blank/Default means today's
  default" rule. A choice made before this task is still honoured after it.
- The one-line cost note ("a bigger model, or a higher effort, costs more per real
  run") moves with the controls.
- The Settings screen's separate "model" and "effort" cards are **removed** — the
  choices move, they are not duplicated. (Two homes for one remembered choice invites
  the two showing different values.) Settings keeps appearance, sound, and about.

**How this moves the current milestone** ("a real-model cairn task completes an
improvement to Cairn itself, end to end"): it does not move it directly —
`Milestone movement` will honestly be NO or UNCLEAR. It makes the milestone run easier
to start deliberately: both dials sit beside the button that fires the run. It is also
itself a small improvement to Cairn chosen by the owner, so it is a natural candidate
outcome for the milestone run later.

## What may change

Only these files:

- `app/src/renderer/screens/Dashboard.tsx` — the controls appear next to "Start a task".
- `app/src/renderer/screens/Settings.tsx` — the model and effort cards are removed.
- A **new** small shared component file under `app/src/renderer/components/` (for
  example `ModelEffort.tsx`) holding the moved controls, so the logic lives once.
- `app/src/renderer/app.css` — only if a small style rule is needed to keep the row tidy.
- `docs/ai-work/tasks/006-report.md` — the report (new file).

## What must not change

- The pick-list itself (the seven model ids), the default model, the effort levels,
  the localStorage key names, and the saved values' meaning — unchanged.
- `app/src/shared/ipc.ts`, `app/src/preload.ts`, `app/src/main/tasks.ts`,
  `app/src/renderer/App.tsx` — the IPC seam and the startup-apply behaviour from
  tasks 004/005 stay exactly as accepted.
- Everything outside the app: `core/`, `cli/`, `cairn.html`, all written guides,
  `AGENTS.md`, `CONTRACT-TEMPLATE.md`, tests in `core/` and `cli/`.
- When the Direction Gate banner is showing (the "Start a task" button is hidden),
  no new way to start a task may appear — the gate's behaviour is untouched.

## Pre-existing work that stays untouched

Git status at definition time: branch `main`, **one local commit not yet pushed**
(never push — pushing needs its own approval), and **one unstaged modification to
`docs/ai-work/LOG.md`** (the task 005 decision row). That LOG.md change is the owner's
recorded decision: do not stage it broadly, revert it, or fold it into this task's
commit unless it is still uncommitted at commit time — in which case leave it exactly
as found and commit only this task's named files. There are no untracked files.

## What the owner will personally see or try

Offline, $0: from `app/`, run `set CAIRN_MOCK=1` then `npm start`. Open a project's
dashboard. Success looks like: the model and effort choices sit next to "Start a task",
show the active values, remember a change after closing and reopening the app, and the
Settings screen no longer has its own model/effort cards. Failure looks like: the
dashboard shows nothing new, the choices forget themselves, or Settings still shows
the old cards.

## Checks the AI will run

All offline; none calls a real model or spends money:

1. `app/ npm run typecheck` (`tsc --noEmit`) — must be clean.
2. `app/ npm run build:vite` — must build.
3. `app/ npx playwright test tests/smoke.spec.ts` — must pass.
4. Inspect the actual `git diff` — only the five named files changed.
5. A manual mock-app pass of the visible outcome above (choose, restart, verify
   remembered).

## DONE requires

- The controls are visible and working next to "Start a task", the Settings cards are
  gone, all five checks pass, and no file outside the allowed list changed.

## STOPPED if

- Any declared check fails and can't be fixed inside the allowed files —
  `STOPPED — CHECK_FAILED`.
- The move turns out to require touching a protected file (for example the IPC seam) —
  `STOPPED — SCOPE_CONFLICT`.

## Actions needing separate approval

None planned. This task must not install anything, use the network, use credentials,
spend money, deploy, send messages, delete or move files (the Settings cards are code
edits inside one file, not file deletions), or write to any external service. If any
of those turns out to be needed, stop and ask.
