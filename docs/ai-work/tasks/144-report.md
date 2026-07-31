# Task 144 report — World palette board: three de-digitized directions

## What was asked

The owner's direction: the app still reads too "digital" / "techy". Target feel:
"Animal Crossing for app development", with the color and warmth of the new
Ghost in the Shell anime carried by the art and characters rather than by neon
tech. Before touching the real tokens, paint one shared scene under three
candidate world palettes so a direction can be picked by eye.

## What changed (every file touched)

- `app/lab/worldboard.html` — new lab page entry.
- `app/lab/worldboard.tsx` — new. Paints one town scene (reusing the real
  TownFace SVG paths) three times, once per direction, each with its title,
  keep/watch notes, and its palette chips.
- `app/lab/worldboard.css` — new. The three palettes:
  - Meadow morning: sky #9fd9f2, meadow #4da267, panels #fbf6ea, Cairn
    #14b8a6, worker #ff5e7e, buttons #ffd45e — the full Animal Crossing
    daylight world with cream panels and chalky colors.
  - Golden hour: #ffc98f / #7d9b52 / #fbf1de / #12a394 / #ff6e6e / #f5a83d —
    the middle step.
  - Lantern dusk: #2e2a4e / #35304f / #f4ead9 / #7fd8c8 / #ff9e8a / #f2b95c —
    today's night world, de-neoned.
- `app/vite.lab.config.ts` — added the `worldboard` build input.
- `app/lab/mock-cairn.ts` — added `PairingOffer` / `PhoneBridgeState` type
  imports only (see Repairs).
- `app/shots/task-144-meadow.png`, `task-144-golden.png`,
  `task-144-lantern.png` — settled captures (shots dir content is gitignored).
- `app/shots/manifest.json` — Task 144 entry prepended (gitignored content).

Lane B's in-flight work was not touched: `app/src/shared/ipc.ts`,
`app/src/main/ipc.ts`, `app/src/main/main.ts`, `app/src/main/tasks.ts`,
`app/src/preload.ts`, `app/src/renderer/screens/Settings.tsx`,
`app/tsconfig.unit.json`, `app/src/main/bridge/`,
`app/src/renderer/components/PairPhone.tsx`, `app/tests-unit/bridge.test.ts`,
`app/tests/bridge.spec.ts`, `app/launch-build.log`.

## Checks run (exact commands, real results)

- `npm.cmd run typecheck` (in `app/`) — passes. Note: this compiles lane B's
  uncommitted `ipc.ts`, which is why the mock needed the type imports below.
- `npm.cmd run build:lab` (in `app/`) — passes; emits `dist-lab/lab/worldboard.html`.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:7394/lab/worldboard.html`
  — 200 (my dev-server instance landed on port 7394; 7390–7393 are held by the
  client's own preview servers, config asks for 7390 non-strict).
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:7394/shots/manifest.json`
  and the three shot URLs — all 200.
- Visual inspection of all three captures — scene, title, keep/watch notes,
  and chips all render; a small sliver of the adjacent panel shows at the
  frame edge, acceptable for a review board.

## Repairs made during the task (disclosed)

1. **Task-number double-claim.** I claimed 140 for this task, but lane B had
   already claimed it (commit 4394913). Commit 2eff24e restored their
   `140-brief.md` byte-for-byte and renumbered my brief to 144.
2. **Mock typecheck vs lane B's in-flight ipc.ts.** My brief had planned to
   add mock `phoneBridge*` methods, but lane B already landed those in the
   mock; my duplicate-method addition was removed and replaced with type-only
   imports. Typecheck then green.
3. **Hidden-window capture stall.** Playwright element/page/CDP screenshots
   of this page all timed out in a hidden Electron window (compositor stall).
   Solved by capturing with `show: true` in the temp capture harness; the
   window flashes briefly on screen. Harness (`app/tmp-capture/`) deleted
   after use.

## How to judge it

Open `/shots.html` in the lab preview (top entry) or `/lab/worldboard.html`
live. Pick a direction (or a mix). The picked palette gets ported into
`tokens.css` as a later task; nothing in the real app changed.

## Limitations / remaining human judgment

- This is a static board, not a reskin: the real town header, chat, and rail
  still use today's tokens until a direction is picked and ported.
- Still open from Task 136: the chat treatment pick (A villager bubble /
  B rising drawer / C side companion) was never chosen — the two picks
  together decide the unified look.
- Meadow is the fullest jump toward the owner's brief; Golden is the
  compromise; Lantern is the smallest move.

Disposition: DONE
