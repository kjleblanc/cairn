# Task 136 report: chat-in-scene mockup — the conversation lives in the world

## What actually changed

- `app/lab/chatmock.html`, `app/lab/chatmock.tsx`, `app/lab/chatmock-view.tsx`,
  `app/lab/chatmock.css` (all new) — a lab-only mockup page rendering the
  **real `TownSquare`** (driven by the lab's mock bridge, "running" scenario
  so a worker and thread are live) with three prototype conversation
  treatments floating over it:
  - **A · villager bubble** — a tailed dialog anchored beside Cairn's node;
    tucked, a one-line chip floats by Cairn with the last line.
  - **B · rising drawer** — a full-width rounded drawer rises from the bottom
    like an AC dialog box; tucked, a slim bar holds Cairn's face, the last
    line, and an up affordance.
  - **C · side companion** — a left panel floats in over a gently dimmed
    scene; tucked, a thin edge tab shows Cairn peeking.
  All three share one sample three-line conversation and composer so only the
  frame changes; clicking Cairn's node opens the conversation (the cohesion
  demo); a dashed-amber lab chrome switches treatments and tucks/expands.
  Boot/view split mirrors lab/main.tsx so the mock bridge installs before any
  renderer module evaluates.
- `app/vite.lab.config.ts` — `chatmock` added as a fifth `build:lab` input.
- `app/shots/` (untracked) — six new captures (3 treatments × open/tucked)
  and a manifest entry, now the first (newest) entry on the Review shots page.

Nothing shipped changed: renderer, main, IPC, and the real chat are
untouched; the page is reachable at `/lab/chatmock.html` on the lab server.

## Checks run and their real results (exact commands)

- `cd app && npm.cmd run typecheck` — green.
- `cd app && npm.cmd run build:lab` — green; emits `lab/chatmock.html` plus
  its JS/CSS chunks.
- `cd app && npm.cmd run lab` (temporary, port 7642; stopped after): `curl`
  HTTP 200 for `/lab/chatmock.html`, and after populating, for
  `/shots/manifest.json` and the new PNGs. Server confirmed stopped.
- Captures produced by a Playwright-driven Electron harness
  (`node tmp-capture/driver.mjs`, deleted after): all six states captured at
  1280×800 and inspected by me. One visual repair found by inspection —
  treatment C's panel opened under the lab chrome; moved below it and
  recaptured. Remaining known nits (accepted for a taste mock): A's tucked
  chip can overlap the "task thread" chip, and the town header's frosted
  band renders milky — the second matches the real app's current rendering,
  not a mock artifact.

## Harness repairs (disclosed, in-task)

1. **Blank first captures:** the mock page called `installMockCairn()` in its
   module body, but ES imports hoist — `api.ts` evaluated first and read
   `window.cairn` too early, so React never mounted (six identical
   background-only frames). Fixed with the boot/view split the lab's own
   `main.tsx` already documents.
2. **Harness flakiness:** the throwaway `.tmp-shot` directory vanished
   between runs (cause unknown — never committed, nothing lost), and the
   direct `electron.exe` binary then stopped evaluating scripts (instant
   silent exit 0). Switched to the Playwright `_electron.launch` pattern the
   E2E suite and Task 130 already prove, in a non-hidden `tmp-capture/`
   directory; deleted after success.
3. A heredoc mangled a regex escape in the first driver version; replaced
   with a plain substring match.

## How to judge it

Open the Review shots page (`/shots.html` on the preview or
`http://localhost:7640/shots.html`) — Task 136 is the top entry with all six
states. To play live: `/lab/chatmock.html` on the same server — switch
treatments in the amber mock bar, tuck/expand, and click Cairn's node.

## Limitations / remaining human judgment

- This is a taste exploration: treatments are throwaway styling over static
  sample text. Whichever the owner picks is rebuilt in the shell as its own
  task, with real conversation data, keyboard behavior, and narrow-screen
  treatment (where the current tabs live).
- Reduced-motion is handled (all three entrances killed in the media query),
  but focus management and screen-reader flow are not prototyped.
- The shots are 1280×800; narrow-window behavior of the treatments is not
  shown.

**Disposition: DONE**
