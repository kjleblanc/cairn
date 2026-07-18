# Task 007 — brief

## Lane

**Standard.** One reason: this touches the desktop app's startup, its projects screen,
its dashboard, and the small list-keeping code behind them — several areas, so bigger
than a Tiny change; but it adds no dependency, keeps the remembered-projects file in
its existing shape, and touches nothing outside the app, so it is not High-Stakes.

## Draft or Final

**Final.** The owner named the outcome in plain words — easily load, track, and switch
between projects — and this brief spells out the exact design that approval adopts.
Approving this brief is choosing that design. If any piece of it feels wrong (for
example "the app reopens my last project by itself"), don't approve — say what should
be different and a new brief will say it.

## The visible outcome

Today, Cairn Desktop half-remembers projects:

- every launch lands on the "Your projects" screen — the app never reopens the
  project the owner was just working in;
- switching projects means leaving the dashboard for that full screen and clicking
  through it; and
- a remembered project that can't load (folder moved, renamed, or its rulebook gone)
  silently disappears from the list — no explanation, no way to tidy it away — while
  still quietly holding one of the eight remembered slots.

After this task, in the desktop app (`app/`):

1. **Load — the app opens where the owner left off.** Launching the app lands
   directly on the dashboard of the most recently opened project. If that project
   can't load, the app falls back to the "Your projects" screen with a plain
   one-line explanation — never an error dead-end. First-ever launch (nothing
   remembered) and "Claude isn't ready yet" still show the Welcome screen exactly
   as today, and the `CAIRN_OPEN` startup override keeps working exactly as today.
2. **Switch — one click from inside a project.** The dashboard's "Switch project"
   control opens a small in-place list of the other remembered projects (most
   recent first, with name and stone count); clicking one lands on that project's
   dashboard. An "All projects" entry still reaches the full projects screen.
3. **Track — the projects screen tells the truth.** "Your projects" shows every
   remembered project — name, milestone, stone count, and when it was last opened.
   A project that can't load is shown too, with its path, a plain reason ("Cairn
   can't find this project — the folder may have moved or lost its rulebook"), and
   a "Remove from this list" button. Removing only edits the app's own remembered
   list; it never deletes, moves, or changes anything inside any project folder.

**How this moves the current milestone** ("a real-model cairn task completes an
improvement to Cairn itself, end to end"): this task *is* an improvement to Cairn,
and it is being defined and built through Cairn's own tooling. If it truly completes
end to end that way, the report should record `Milestone movement: YES`; if it stalls
or completes some other way, the report must say what actually happened.

## What may change

Only these files:

- `app/src/main/registry.ts` — expose each entry's last-opened time; add a
  forget-one-entry function. The file it writes keeps its existing shape.
- `app/src/main/ipc.ts` — the project list carries last-opened times; a new
  "forget this entry" handler. `CAIRN_OPEN` behaviour unchanged.
- `app/src/shared/ipc.ts` and `app/src/preload.ts` — the matching types and the
  exposed call for the above, added alongside what exists.
- `app/src/renderer/App.tsx` — startup order becomes: Claude not ready → Welcome
  (unchanged); `CAIRN_OPEN` set → open it (unchanged); otherwise most recent
  remembered project → open it, falling back to the projects screen with a plain
  note if it fails; nothing remembered → Welcome (unchanged).
- `app/src/renderer/screens/Picker.tsx` — show every remembered project including
  ones that can't load, with last-opened, the plain reason, and "Remove from this
  list".
- `app/src/renderer/screens/Dashboard.tsx` — the in-place switcher.
- At most **one new** small component file under `app/src/renderer/components/`
  (for example `ProjectSwitcher.tsx`) if that keeps the dashboard tidy.
- `app/src/renderer/app.css` — only if a small style rule is needed.
- At most **one new** test file under `app/tests/` if new coverage helps — additive
  only; the existing smoke test file may not be edited.
- `docs/ai-work/tasks/007-report.md` — the report (new file).

## What must not change

- The remembered-projects file (`projects.json` in the app's private settings
  folder) keeps its exact current shape — a "recent" list of `{ dir, lastOpened }`
  entries, capped at eight. Entries may be added, removed, and reordered as today;
  no new fields, no new format, no migration.
- `CAIRN_OPEN` keeps its meaning and its first-priority place in startup — the
  smoke test and scripts rely on it.
- `app/tests/smoke.spec.ts` — must pass **unchanged**.
- The task loop and everything from accepted tasks 004–006: the Wizard, approvals,
  the Direction Gate, the model and effort dials and their saved choices.
- All app files not named above, including `app/src/main/tasks.ts`, `main.ts`,
  `log.ts`, `Welcome.tsx`, `Wizard.tsx`, `Direction.tsx`, `Settings.tsx`,
  `ModelEffort.tsx`.
- Everything outside the app: `core/`, `cli/`, `cairn.html`, `index.html`, all
  written guides, `AGENTS.md`, `CONTRACT-TEMPLATE.md`, `MAINTAINERS.md`,
  `CHANGELOG.md`.

## Pre-existing work that stays untouched

Git status at definition time: branch `main`, **two local commits not yet pushed**
(never push — pushing needs its own approval), and **one unstaged modification to
`docs/ai-work/LOG.md`** (the owner's task 006 decision row). Leave that LOG.md change
exactly as found — never stage it broadly, revert it, or fold it into this task's
commit; commit only this task's named files, staged by name. There are no untracked
files.

## What the owner will personally see or try

Offline, $0: from `app/`, run `set CAIRN_MOCK=1` then `npm start`.

Success looks like: the app opens straight onto the last project's dashboard; the
"Switch project" control lists the other remembered projects and one click lands on
one of them; the "Your projects" screen shows every remembered project with its
last-opened time; after renaming a test project's folder, its entry stays visible
with a plain reason and a "Remove from this list" button — and removing it leaves
the renamed folder itself untouched on disk.

Failure looks like: the app still opens to the picker every time, switching still
needs the full-screen round trip, a broken project still vanishes silently, or
removing an entry touches the real folder.

## Checks the AI will run

All offline; none calls a real model or spends money:

1. `app/ npm run typecheck` (`tsc --noEmit`) — must be clean.
2. `app/ npm run build:vite` — must build.
3. `app/ npx playwright test tests/smoke.spec.ts` — must pass, with that file
   unchanged.
4. Inspect the actual `git diff` — only the named files changed.
5. A mock-app pass of the visible outcomes above: relaunch reopens the last
   project; the failed-reopen fallback shows the projects screen with the plain
   note; the switcher switches; a broken entry is shown honestly; removing it
   edits only the app's own list, and the project folder still exists afterwards.

## DONE requires

All five checks pass, the three visible outcomes (load, switch, track) work in mock
mode, the remembered-projects file still has its current shape, and no file outside
the allowed list changed.

## STOPPED if

- A declared check fails and can't be fixed inside the allowed files —
  `STOPPED — CHECK_FAILED`.
- The feature turns out to need a protected file, a stored-format change, or the
  smoke test edited — `STOPPED — SCOPE_CONFLICT`.

## Actions needing separate approval

None planned. This task must not install anything, use the network, use credentials,
spend money, deploy, send messages, or write to any external service. It deletes and
moves no files: "Remove from this list" edits one line inside the app's own
`projects.json` list — it never deletes a file or folder, and never touches any
project's contents. If any action on this list turns out to be needed after all,
stop and ask.
