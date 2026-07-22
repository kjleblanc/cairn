# Task 009 — brief

## Lane

**Standard.** One reason: this touches several screens of the desktop app plus how the
window behaves while an agent is running — more than one small obvious change, so not
Tiny; but it adds no dependency, changes no stored file format, never touches the
engine room, the network, or the approval gate, and everything is local and easy to
undo, so it is not High-Stakes.

## Draft or Final

**Draft.** Both halves of this task are look-and-feel: how text reads on screen, and
how moving around the app feels while an agent works. This task builds one candidate
for the owner to judge by using it, like tasks 006–008. Accepting it later means
recording this task's result as the chosen design.

## The problem, in plain language

Two rough edges in the desktop app's five-step walk (define → approve → build →
verify → decide):

1. **Text formatting is rough.** The app has a tiny home-grown text renderer that
   only understands headings, plain bullet lists, **bold**, and `code` words. But
   real briefs and reports also use numbered lists, indented sub-points, fenced code
   blocks, and tables — and today those show up as raw symbol-littered lines
   (`1.`, `**`, `|---|`, triple backticks). The owner has to squint through markup to
   read the very text they are being asked to approve. The live activity feed is
   plain raw lines too.
2. **There is no way home while the AI works.** During "writing the brief",
   "building", and "fresh eyes at work" there is no button out — the owner is locked
   into watching one screen, sometimes for many minutes with a real model. They
   cannot glance at another project or the home screen and come back.

A fact that makes the fix safe: the running agent lives in the app's engine room
(the main process), not in the window. It keeps working no matter which screen the
window shows. Today's screens just don't take advantage of that — leaving the task
screen throws away the live view and any waiting question card.

## The visible outcome

1. **The five-step walk reads cleanly.** The brief, the report, the reviewer's
   verdict, and the "try it yourself" box render numbered lists as numbered lists,
   indented sub-points as indented, fenced code blocks as one styled block, and
   simple tables as readable tables — no raw `**`, `#`, `|`, or backtick litter on
   the kind of text Cairn's own agents actually write (this repo's real task 008
   brief and report are the yardstick). The live activity feed is tidier to read.
   Rendering stays safe the way it is today: built as screen elements, never
   injected HTML.
2. **A way home, and a way back.** From any step of the walk there is one visible
   control back to the project's home screen — including while an agent is working.
   Going home (or browsing to another project) never cancels, restarts, or
   duplicates the run. While a run is alive, a clear reminder is visible on the
   home and project screens — something like "Task 009 is still building — return" —
   and it says so plainly if the AI is waiting on a question. One click returns to
   the live task screen exactly where it stands. If the run finishes while the
   owner is away, nothing is lost: returning shows the finished result and the
   right next step. Trying to start a second task while one runs still gets
   today's plain "One step at a time — an agent is already running" message.

**How this moves the current milestone** ("a real-model cairn task completes an
improvement to Cairn itself, end to end"): this task is itself an improvement to
Cairn, defined and built through Cairn's own gated tooling. Readable briefs directly
strengthen the loop's most human step — the owner can only approve well what they
can read well — and the way home removes a real reason to abandon a long real-model
run midway. The report must record honestly whether it completed that way.

## What may change

Only these files — all in the window's display layer (`app/src/renderer/`), plus
one test and the report:

- `app/src/renderer/components/Md.tsx` — the text renderer learns numbered lists,
  indented sub-points, fenced code blocks, and simple tables. Display only; it must
  keep building screen elements (never injected HTML), and it never alters what any
  file on disk contains — approval still hashes the file bytes, so the gate's
  meaning cannot shift.
- `app/src/renderer/components/ActivityFeed.tsx` — tidier live feed.
- `app/src/renderer/components/StepRail.tsx` — only if small polish is needed.
- `app/src/renderer/screens/Wizard.tsx` — the home control on every step; keeps its
  live state when the owner steps away.
- `app/src/renderer/App.tsx` — lets the task screen stay alive behind other screens
  and shows the "return to the running task" reminder.
- `app/src/renderer/screens/Dashboard.tsx` and `app/src/renderer/screens/Picker.tsx`
  — only what's needed to show that reminder.
- `app/src/renderer/app.css` — style rules.
- At most **two new** small components under `app/src/renderer/components/`.
- Exactly **one new** test file under `app/tests/` — additive only.
- `docs/ai-work/tasks/009-report.md` — the report (new file).

A free side effect, disclosed: the Direction screen also uses the same text
renderer, so it will read better too — without `Direction.tsx` being edited.

## What must not change

- **The engine room and the wiring.** Nothing under `app/src/main/`,
  `app/src/preload.ts`, `app/src/shared/`, or `app/src/renderer/api.ts`. No new
  messages between window and engine room. The run already survives screen changes
  on its own; this task only changes what the window shows. If that turns out not
  to be enough, stop — see STOPPED below.
- **The shared engine and the CLI.** Nothing under `core/` or `cli/`.
- **Dependencies.** No new packages; `package.json` and lockfiles untouched. The
  better formatting is written by hand into the existing tiny renderer.
- **The approval gate and the one-agent rule.** Approval still hash-locks the exact
  brief file; the "one step at a time" refusal and its message stay exactly as they
  are (they live in the engine room, which is off-limits anyway).
- **Task 008's question behavior.** A waiting question is never silently lost
  because the owner stepped away: in a real run it waits, and the reminder says the
  AI is waiting; in mock (demo) mode the untouched card's 10-second self-skip works
  exactly as today. Answering after returning still works.
- **Resume.** Quitting the app mid-task and relaunching still resumes from disk
  exactly as today.
- `app/tests/smoke.spec.ts`, `app/tests/projects.spec.ts`, and
  `app/tests/ask.spec.ts` — must pass **unchanged**.
- **The contract and every public document.** `AGENTS.md`, all guides, `cairn.html`,
  `index.html`, `CHANGELOG.md`, `MAINTAINERS.md`, and everything accepted in tasks
  001–008 not named above.

## Pre-existing work that stays untouched

Git status at definition time: branch `main`, **four local commits not yet pushed**
(never push — pushing needs its own approval), **one unstaged modification to
`docs/ai-work/LOG.md`** (the owner's decision rows), and **two untracked files**:
`docs/ai-work/tasks/007-approval.json` and `docs/ai-work/tasks/008-approval.json`.
Leave all of these exactly as found — never stage broadly, revert, or fold them into
this task's commit; commit only this task's named files, staged by name. The
machine's real remembered-projects file (`%APPDATA%\Cairn\projects.json`) is the
owner's data: the new test must snapshot and restore it, the way `ask.spec.ts`
already does.

## What the owner will personally see or try

Offline, $0. Close any open Cairn Desktop window first (an old window runs old
code). Then from the repo root: `cd app`, then `set CAIRN_MOCK=1`, then `npm start`.

Success looks like: start a task; the drafted brief reads like a clean document —
numbered lists numbered, sub-points indented, tables readable, no `**` or `|---|`
litter. Approve, and while the build runs, click the home control: the home screen
appears with a plain reminder that the task is still working; browse another project
if you like; click the reminder and land back on the live task exactly where it
stands (or on the finished report, if it finished while you were away). Try starting
a second task while the first runs — you get the plain one-step-at-a-time note and
nothing breaks.

Failure looks like: raw markup litter still shows in briefs or reports; going home
kills, restarts, or doubles a run; there is no way back, or the way back lands on a
blank or wrong screen; a question the AI asked while you were away is silently
thrown away; or a second agent starts alongside the first.

## Checks the AI will run

All offline, in mock mode; none calls a real model, spends money, or installs
anything:

1. `app/ npm run typecheck` — clean.
2. `app/ npm run build:vite` — all bundles build.
3. `app/ npx playwright test` — all pass: the three existing spec files unchanged,
   plus the one new spec, which must at minimum prove: (a) text containing a
   numbered list, indented sub-points, a fenced code block, and a small table
   renders with no raw markdown symbols visible; and (b) a mock run left mid-way
   via the home control keeps running, the reminder appears, returning shows the
   live or finished task, the task number is the same one (never a restart), and
   the run reaches its normal end.
4. Inspect the actual full `git diff` and `git status` — only the named files
   changed; the protected work above is exactly as found.

What these checks cannot prove, said now: they run in mock mode, so the first
real-model run with the home button should be watched; and whether the formatting
and the navigation *feel* right is the owner's Draft judgment, not a script's.

## DONE requires

All four checks pass; the task 008 brief and report texts render cleanly by the
yardstick above; the go-home-and-return round trip provably never disturbs the run;
the three existing spec files are untouched; and no file outside the allowed list
changed.

## STOPPED if

- A declared check fails and cannot be fixed inside the allowed files —
  `STOPPED — CHECK_FAILED`.
- Keeping a run and its waiting question safe across navigation turns out to be
  impossible from the display layer alone — that is, it would require engine-room,
  preload, or wiring changes — `STOPPED — RENDERER_NOT_ENOUGH`.
- The work turns out to need a protected file, a new dependency, or anything else
  outside the allowed list — `STOPPED — SCOPE_CONFLICT`.

## Actions needing separate approval

None planned. This task must not install anything, add any dependency, use the
network, use credentials, spend money, deploy, push, send messages, delete or move
files, or write to any external service. If any listed action turns out to be
needed after all, stop and ask.
