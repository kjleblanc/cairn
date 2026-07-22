# Task 007 — report

## Result (plain language)

Cairn Desktop now loads, switches, and tracks projects the way the brief asked:

1. **Load.** Launching the app opens straight onto the dashboard of the project
   you were last working in. If that project can't load (folder moved, renamed,
   or its rulebook gone), the app lands on "Your projects" with one plain
   amber note — "Cairn couldn't reopen [name] — the folder may have moved or
   lost its rulebook" — never an error dead-end. First-ever launch still shows
   Welcome, "Claude isn't ready" still shows Welcome, and the `CAIRN_OPEN`
   startup override still comes first, all exactly as before.
2. **Switch.** The dashboard's "Switch project" button now opens a small list
   right there in place: the other remembered projects that can load, most
   recent first, each with its name and stone count. One click lands on that
   project's dashboard. An "All projects" entry still reaches the full screen.
3. **Track.** "Your projects" now shows every remembered project — including
   ones that can't load. A broken entry shows its name, its full path, the
   plain reason, when it was last opened, and a "Remove from this list"
   button. Removing edits one entry in the app's own remembered list and
   nothing else — the folder on disk is untouched. Working entries now also
   show "last opened today / yesterday / N days ago".

Behind this, the remembered-projects file keeps its exact shape (a "recent"
list of `{ dir, lastOpened }`, capped at eight). One quiet repair inside that
shape: opening a project used to restamp *every* entry with the same time (the
owner's real file showed all eight entries sharing one timestamp); now each
entry keeps its own honest time, which is what makes "last opened" truthful.

**One judgment call, disclosed:** the in-place switcher lists only the other
projects that can *load* — clicking a broken project can't land on its
dashboard, which is what the switcher promises. Broken entries are handled on
the projects screen, one "All projects" click away.

## Files changed

- `app/src/main/registry.ts` — each entry keeps its own last-opened time; new
  `forgetProject`; same file shape.
- `app/src/main/ipc.ts` — the project list carries last-opened times; new
  `project:forget` handler. `CAIRN_OPEN` untouched.
- `app/src/shared/ipc.ts`, `app/src/preload.ts` — the matching type and the
  exposed call, added alongside what exists.
- `app/src/renderer/App.tsx` — the new startup order with the plain-note
  fallback.
- `app/src/renderer/screens/Picker.tsx` — every entry shown honestly;
  last-opened lines; the Remove button; the fallback note.
- `app/src/renderer/screens/Dashboard.tsx` — renders the new switcher.
- `app/src/renderer/components/ProjectSwitcher.tsx` — **new**; the one allowed
  component file.
- `app/src/renderer/app.css` — small rules for the note banner and the
  switcher list.
- `app/tests/projects.spec.ts` — **new**; the one allowed test file (three
  tests covering load, switch, and track end to end in mock mode).
- `docs/ai-work/tasks/007-report.md` — this report.

`app/tests/smoke.spec.ts` was **not** edited (verified in the diff). The
owner's uncommitted `docs/ai-work/LOG.md` decision rows (tasks 005 and 006)
and the two unpushed commits were left exactly as found. Nothing was pushed.

## Commands run and their real results

All offline on this machine; no real model call, no money, nothing installed.
The only screens the tests visit (dashboard, projects, wizard) trigger no
network use; the app's built-in update check lives on the Settings screen,
which no test opens.

1. `app/ npm run typecheck` → **clean** (one type error in the new test file
   during development was fixed; the final run reports nothing).
2. `app/ npm run build:vite` → **built** (main, preload, renderer bundles).
3. `app/ npx playwright test` → **4 passed (44.3 s)**: the three new projects
   tests and, run last and unchanged, `tests/smoke.spec.ts` → passed (8.8 s).
4. `git diff` inspected in full → only the files listed above changed; the
   LOG.md diff is exactly the owner's two pre-existing decision rows.
5. The mock-app pass is the new test file itself, run twice on purpose:
   - **Against the old code first**, it failed exactly where it should —
     "launch reopens the last project" timed out because the old app landed on
     the picker. That failure is evidence the test really checks the new
     behavior (the first test, which pins the protected `CAIRN_OPEN` behavior
     and the file shape, already passed on old code).
   - **Against the new build**, all three passed: relaunch reopened the last
     project; after the most recent project's folder was renamed on disk, the
     app fell back to the projects screen with the plain note; the switcher
     swapped Beta → Alpha in one click; the broken entry appeared with its
     reason and was removed; the remembered file then held only the other
     project; and the renamed folder still existed with identical contents.

## An honest incident during checking, and what it changed

My first version of the test tried to point the app's settings folder at a
throwaway directory through environment variables. Windows ignores that (it
asks the operating system directly), so one early test run wrote two temporary
test entries into the **real** remembered list at `%APPDATA%\Cairn\projects.json`.
I had snapshotted that file before running anything, restored it immediately,
and rewrote the test to do this properly: it snapshots the real file, seeds a
clean list, and restores the snapshot afterwards — Playwright runs that
restore even when a test fails.

Two related notes from the same file:

- While this task was being built, the entries in the real file were restamped
  at 05:51 by an **old-build app instance** — meaning a Cairn Desktop window
  was likely open on this machine during the build. A running app keeps its
  old code until restarted.
- The unchanged smoke test has always added its temporary test project to the
  real remembered list and never cleaned up (the file already held seven dead
  temp entries from tasks 003–006 before this task). Since the app now
  auto-reopens the most recent project, I removed the one entry my own smoke
  run added and put back the one it pushed off the eight-entry list — the
  entry set is exactly as this task found it, with the newer times the owner's
  own app wrote preserved. My pre-task snapshot also still exists at
  `%TEMP%\cairn-007-projects-snapshot.json` if anything ever looks wrong.

## How the owner can see or try the result (offline, $0)

Close any open Cairn Desktop window first — a window opened before this task
still runs the old code. Then from the repo root: `cd app`, then
`set CAIRN_MOCK=1`, then `npm start`.

- **Success looks like:** the app opens straight onto this project's dashboard
  (no picker first). "Switch project" opens a small list in place; "All
  projects" reaches the full screen. On that screen you'll now see the truth:
  this project, plus several dead "cairn-006-…" test entries from earlier
  tasks that were always secretly there — each with its path, a plain reason,
  and a "Remove from this list" button that only tidies the list. To try the
  fallback: make a throwaway project in an empty folder, quit, rename that
  folder, relaunch — the app should land on "Your projects" with the amber
  note, and the renamed folder should be untouched on disk.
- **Failure looks like:** the app still opens to the picker every time,
  switching still needs the full-screen round trip, broken projects are
  invisible, or removing an entry touches the real folder.

## What still needs a human check

1. **Your own eyes on the reopen.** The scripted pass proves it in mock mode;
   your one-minute `npm start` try is the real confirmation.
2. **The dead test entries.** Removing the "cairn-006-…" leftovers is your
   call with the new Remove button — a nice first real use of the feature.
3. **Look and feel.** Whether the switcher list and the amber note feel right
   is a taste call only you can make.

## Limitations and remaining uncertainty

- **A known wrinkle to watch:** every future smoke-test run will still add a
  temporary "Smoke" project to the front of the real remembered list, and the
  app will now auto-reopen it on the next launch. Fixing that means teaching
  the smoke test to clean up after itself — but editing `smoke.spec.ts` was
  (rightly) off-limits in this task. A small follow-up task could do it; until
  then, after running tests, expect one odd "Smoke" project first, and use
  its Remove button or just open your real project.
- The scripted pass drives the built bundles in mock mode; no real model call
  was made or needed. The packaged/installed app was not tested (none was
  built), same as previous tasks.
- Evidence proves the named checks ran and passed; it cannot prove the feature
  *feels* right — that is the owner's check above.
- A session tooling glitch: the PowerShell command runner's permission layer
  failed repeatedly with an internal error, so all commands ran through the
  Bash runner instead. No effect on the work, disclosed for completeness.

## Milestone movement

YES — the milestone is "a real-model cairn task completes an improvement to
Cairn itself, end to end." This task is a real improvement to Cairn, defined,
hash-approved, and built through Cairn's own gated tooling with a real model,
with the checks green and the honest paperwork written. The loop's last step —
your decision (and a fresh-context review if you want one) — is what finally
closes it end to end; if that step stalls, the next report must say so.

Disposition: DONE
