# Task 151 — make the villager bubble actually usable

Requested outcome: In the desktop app's workspace, the chat bubble anchored to
Cairn (Task 146's villager bubble) is laid out so its contents are usable:
the message area keeps a real, scrollable share of the dialog instead of
collapsing to a thin strip with an OS button-scrollbar; the run strip's
controls ("Stop this task", "Open the run screen") are fully visible instead
of clipped at the bubble's right edge; and the top bar, cards, and composer
sit tidily at the bubble's width instead of stacking and overflowing.

Owner's words: "The new chat bubble needs work to make it actually usable —
it's a jumbled mess right now" (with a screenshot showing the collapsed
message strip, the clipped run strip, and the three-line top bar).

## Boundary of intent

- Layout and geometry only. No behavior, copy, or flow changes: tuck/chip,
  focusSignal, run-strip live region, dispatch, and push flows all work as
  they do now. The bubble keeps the owner-approved Task 136 treatment — a
  cream tailed dialog anchored to Cairn's node that tucks into a chip.
- Protected in-flight work must stay byte-identical: the stopped Task 148 /
  Task 150 worker edits (`app/src/renderer/screens/Picker.tsx`,
  `app/tests/projects.spec.ts`), their records and log rows
  (`docs/ai-work/LOG.md`, `docs/ai-work/tasks/148-report.md`,
  `150-brief.md`, `150-report.md`), the `design/` directory, and
  `app/lab-server.log` / `app/launch-build.log`.
- `app/tests/projects.spec.ts` is the stopped worker's file: this task does
  not run it, change it, or diagnose it. E2E scope is the chat specs only.
- The standalone chat screen keeps its geometry; the one shared rule that
  may touch it (message-list scrollbar styling) must not change its layout.
- No new dependencies. Captures go to gitignored `app/shots/` only; the
  throwaway capture harness is deleted after use.

## Checks

- `npm run typecheck`, `npm run test:unit`, `npm run build:vite`,
  `npm run build:lab` in `app/` — all green.
- Throwaway Electron capture harness (visible windows, per the Task 144/146
  method): capture the open bubble holding conversation content and a live
  run strip, and the tucked chip; inspect the captures and confirm the three
  screenshot failures above are gone.
- `npx playwright test tests/conductor.spec.ts tests/bridge.spec.ts` with the
  app token held at `app/.app-token` (removed after) — green.
- `git diff --check` and a final protected-work check: the protected paths
  listed above byte-identical to their state at task start.

DONE means the layout outcome holds in the captures, every check above is
green, protected work is untouched, and the changes land as one exact-path
local commit.

STOPPED means a check fails that repair inside this task cannot fix,
protected work changes, or the captures still show the jumble.
