# Task 099 report — the visual lab

## What actually changed

New files (nothing shipped was touched):

- `app/lab/index.html` — the lab page: mock badge ("mock data · visual
  lab"), scenario-panel styles, reduced-motion respect, and a CSP matching
  the app's own with localhost allowance for the dev server.
- `app/lab/main.tsx` — lab boot: installs the mock bridge, mounts the
  scenario panel, then loads the REAL renderer entry (`src/renderer/main`),
  so the lab runs the exact App the desktop ships.
- `app/lab/mock-cairn.ts` — a complete in-memory `CairnApi` (all 36
  methods): one mock project ("Garden Lab (mock)"), a connected fake
  conductor, one conversation with seeded turns, in-memory town state, and
  an event system mirroring the real bridge's. Scenarios (`window.__lab`):
  quiet, thinking (a reply actually streams), task running (a real
  `RunSessionSnapshot`, so the town shows a worker through the same
  derivation the app uses), DONE and STOPPED cards (posted through the
  envelope event path, not faked into the DOM). Capabilities the lab does
  not simulate — routing, running, pushing, creating, forgetting — return
  plain refusals rather than pretending.
- `app/lab/controls.ts` — the on-screen scenario panel (lab-only DOM
  outside the React root).
- `app/vite.lab.config.ts` — dev/build config; output goes to ignored
  `.vite/lab`; the port is unpinned so preview tooling can assign one.

Two-line wiring changes: `app/package.json` gained `dev`/`lab` and
`build:lab` scripts; `app/tsconfig.json` includes the lab sources and
config for type checking.

## Checks run and their real results

1. `npm.cmd run typecheck` — clean with lab sources included (one repair
   during the task: a `.tsx` import-extension error, fixed).
2. `npm.cmd run build:lab` — bundles cleanly to ignored `.vite/lab/`
   (216 kB JS gzip ~68 kB, real fonts and styles).
3. Serve check — `vite dev` answered HTTP 200 for `/lab/index.html` on the
   pinned port and again on the default port after unpinning; the server
   was stopped after each check.
4. Desktop unit suite — 100/100 pass; `git status` shows only the lab
   files, the two wiring lines, and this task's records. `vite.main`,
   `vite.preload`, `vite.renderer`, `forge.config.ts`, and everything
   under `app/src` are byte-identical.
5. Reduced-motion — declared on the lab page.

Not performed: a scripted in-browser runtime check. No Chromium is
installed for Playwright (the flaky suite drives Electron, not a plain
browser), and installing one is an approval-gated action. Compilation,
types, bundling, and HTTP serving are verified; the first visual open is
the owner's to enjoy.

## How to try it

```powershell
npm.cmd --prefix app run lab
```

then open the printed localhost URL (usually
`http://localhost:5173/lab/index.html`). The real current UI appears with
the mock project; the "lab scenarios" panel bottom-left poses quiet,
thinking, running, DONE, and STOPPED states. Editing any renderer file
hot-reloads instantly — this is the iteration loop for the garden port.

## Limitations and remaining human judgment

- The mock bridge is honest but minimal: routing/dispatch flows are not
  simulated (the lab panel poses their end states instead). If the port
  needs the dispatch panel live, that is a small follow-up.
- The two static mockups in `design/mockups/` stay untracked as intended
  throwaway exploration; delete or keep at the owner's taste.

Disposition: DONE
