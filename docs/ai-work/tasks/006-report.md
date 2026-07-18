# Task 006 — report

## Result (plain language)

The model and effort dials now live on the project dashboard, directly under the
"Start a task" button — right where a task begins. The Settings screen's separate
"model" and "effort" cards are gone; Settings keeps appearance, sound, and about.
The choices moved, they were not duplicated: there is exactly one home for each
remembered choice.

Nothing about how the choices work changed. The controls are the same logic,
lifted whole out of Settings into one small shared component: the same seven-model
pick-list (any typed id still accepted, blank still means the default
`claude-opus-4-8`), the same six effort choices (Default + low / medium / high /
xhigh / max), the same saved keys (`cairn-model`, `cairn-effort` in localStorage),
the same `task:setModel` / `task:setEffort` calls, and the same one-line cost note,
which moved with the controls. A choice made before this task is still honoured.

One placement judgment, disclosed plainly: when the Direction Gate banner is
showing, the "Start a task" button is hidden — and the dials are hidden with it.
The brief says the gate's behaviour must stay untouched and no new start-a-task
path may appear there; pairing the dials with the button is the cleanest reading.
Any choice saved earlier still applies while the gate is up (the app applies saved
choices at startup, unchanged from task 005).

## Files changed

- `app/src/renderer/components/ModelEffort.tsx` — **new**; the moved controls,
  living once, as the brief asked.
- `app/src/renderer/screens/Dashboard.tsx` — renders the new component directly
  under the "Start a task" row (only while the gate is quiet); two small additions.
- `app/src/renderer/screens/Settings.tsx` — the model and effort cards and their
  now-unused state, functions, and constants removed; appearance, sound, and about
  untouched.
- `docs/ai-work/tasks/006-report.md` — this report.

`app/src/app.css` turned out not to need any change (the brief allowed it "only if
needed"); it was not touched. No other file changed — verified against the real
diff, not memory (see check 4).

## Commands run and their real results

All offline; no real model call, no money spent, nothing installed, no network use.

1. `app/ npm run typecheck` (`tsc --noEmit`) → **clean, no errors**.
2. `app/ npm run build:vite` → **built OK** (main, preload, renderer bundles).
3. `app/ npx playwright test tests/smoke.spec.ts` → **1 passed (9.2 s)**.
4. `git diff` inspected in full → only the three code files above changed; the
   owner's uncommitted `docs/ai-work/LOG.md` decision row and the one unpushed
   commit were left exactly as found.
5. Mock-app pass of the visible outcome, driven by a throwaway script kept in the
   system temp folder (never inside the repo, deleted afterwards; it snapshotted
   and restored any saved choices it touched). Real output:

   ```
   OK: model box is on the dashboard next to Start a task
   OK: active model updated to claude-haiku-4-5
   OK: active effort updated to high
   OK: Settings has no model or effort card
   OK: saved choices honoured on open (box shows claude-haiku-4-5)
   RESULT: PASS
   ```

**One honest wrinkle in check 5.** The script boots the app from the *built*
bundles, which load at a `file://` address where Chromium does not save
localStorage to disk between full app restarts — so a true "quit the process,
relaunch, still remembered" could not be shown in that harness. Two pieces of
evidence cover the gap:

- The app's real storage on disk (`%APPDATA%\Cairn\Local Storage`) holds the
  owner's previously saved `cairn-model`, `cairn-effort`, and `cairn-theme` values
  under the `http://localhost:5173` origin — the origin `npm start` actually uses —
  proving persistence works in the flow the owner will try.
- The restart was simulated instead: the saved keys were seeded and the window
  reloaded, and the dashboard honoured them on open (the app-side half of
  remembering, which is the only half this task's code touches).

This task changed nothing about how choices are saved or loaded — only where the
controls sit — so the remembering behaviour is exactly task 005's, already accepted.

## How the owner can see or try the result (offline, $0)

From the repo root: `cd app`, then `set CAIRN_MOCK=1`, then `npm start`. Open a
project's dashboard.

- **Success looks like:** a "model & effort" card sits directly under the
  "Start a task" button, showing the active model and effort; pick a model and an
  effort, close the app, reopen — the choices are still shown; open Settings —
  only appearance, sound, and about remain.
- **Failure looks like:** the dashboard shows nothing new, the choices reset after
  reopening, or Settings still shows its old model/effort cards.

## What still needs a human check

1. **The close-and-reopen memory, with your own eyes.** The checks above prove the
   controls work and that saved choices are honoured on open; the full
   quit-relaunch-remembered loop in `npm start` mode deserves your one-minute
   glance (the evidence says it works, but a script could not perform that exact
   loop — see the wrinkle above).
2. **A pre-existing question, not caused by this task:** the *installed* (packaged)
   desktop app also loads at a `file://`-style address. Whether the packaged build
   remembers choices across restarts was never verified in task 005 either, and
   this task could not test a packaged build. Worth one try on an installed copy
   whenever one is next built.
3. **Look and feel.** Whether the card under the button feels right — or should be
   more compact — is a taste call only you can make.

## Limitations and remaining uncertainty

- No real model call was made; nothing about live model/effort behaviour was
  (or needed to be) validated here.
- The Direction Gate placement reading (dials hidden while the gate banner shows)
  is my judgment call on the brief's gate rule, disclosed above; if you want the
  dials visible during a gate, that is a small follow-up task.
- The mock pass drove the built bundles, not `npm start` itself; the two share all
  the same renderer code, but the dev server flow specifically ran only in the
  smoke test's boot, not in the choose-and-reload pass.

## Milestone movement

NO — as the brief predicted. This puts both dials beside the button that will fire
the milestone run; it does not perform that run.

Disposition: DONE
