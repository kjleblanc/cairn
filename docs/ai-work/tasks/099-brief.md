# Task 099 — the visual lab: real components, mock bridge, no Electron

Requested outcome: `npm.cmd --prefix app run lab` starts a browser dev
server that mounts the REAL renderer — the same App, Workspace, Chat, town
square, styles, and fonts the desktop app ships — against a mock
`window.cairn` bridge, with an on-screen scenario panel for switching
between the states a designer needs (idle, thinking, task running, DONE
and STOPPED result cards, zero to several workers). No Electron, no
provider, no credential, no Git side effects. This is the iteration
environment for the approved "garden around you" visual direction; the
port itself is the next task.

Owner direction (2026-07-28): the new UI direction is a calm, cozy digital
space with expressive holo-face avatars (Ghost in the Shell texture,
Animal Crossing warmth, Cowboy-Bebop-style faces), immersive "garden
around you" layout — and the owner wants to iterate on visuals without
booting Cairn each time.

Boundary of intent:

- New files only, plus one `package.json` script (`lab`) and the tsconfig
  include needed to type the lab sources. Nothing the desktop app builds
  or ships may change: `vite.main/preload/renderer.config.ts`,
  `forge.config.ts`, and everything under `app/src` stay byte-identical.
- The mock bridge implements the full `CairnApi` surface from
  `shared/ipc.ts` with honest canned data, in-memory only. It never reads
  the owner's config, projects, or files.
- The lab page carries a visible "mock data" badge, and the mock project
  is named so nothing in a screenshot can be mistaken for real runtime.
- No new runtime dependencies. Vite and the React plugin are already
  project dev dependencies.
- No Electron, provider call, credential, external write, or install.

Checks:

1. `npm.cmd run typecheck` passes with the lab sources included.
2. `vite build -c vite.lab.config.ts` bundles the lab cleanly.
3. `npm run lab` serves the page (HTTP 200) and the page boot mounts the
   real App against the mock bridge; the scenario panel switches states.
4. Shipped-app verification is unchanged: desktop unit suite passes and
   `git status` shows only the new lab files, the script line, tsconfig,
   and this task's records.
5. Reduced-motion: the lab page declares the same reduced-motion respect
   as the app.

DONE means the owner can open a browser, see the real current UI with mock
state, and flip scenarios without touching Electron.

STOPPED means the lab cannot be built without changing shipped code, or
checks 1–4 fail without an in-scope correction.
