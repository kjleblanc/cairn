# Task 111 report — garden faces and worker pads

## What actually changed

- `app/src/renderer/components/TownSquare.tsx` — added the decorative
  `TownFace` renderer and placed it on the existing Cairn and live-worker
  buttons. Cairn now has the warm hologram face, blink, blush, and
  thinking dots from the approved mockup; a real active worker has the
  focused worker face and a warm two-ring pad. The existing accessible
  button names, entity derivation, thread behavior, selection, drag, and
  persistence paths are unchanged.
- `app/src/renderer/tokens.css` — added named garden tokens for face skin,
  ink, shine, blush, and worker-pad colors/textures. No raw hex was added
  to component styles.
- `app/src/renderer/app.css` — replaced the old letter-and-ears town shapes
  with holo rings, orbit rings, faces, thought dots, and worker pads. All
  new motion is decorative and disabled under `prefers-reduced-motion`;
  labels and status text sit above the decorative pad.
- `app/tests/conductor.spec.ts` — the existing live-town E2E now asserts
  that Cairn's face is present before a run, a real worker gets exactly one
  face and pad, reduced motion really stops the face/pad animation, and
  both disappear when the worker closes.

No main/preload code, runtime identity, IPC, persistence, routing,
dispatch, dependency, or contract file changed.

## Checks run and their real results

1. `npm.cmd run typecheck` in `app/` — green.
2. `npm.cmd run build:vite` in `app/` — green; main, preload, and renderer
   bundles built.
3. `npm.cmd run build:lab` in `app/` — green; the lab bundle built.
4. `npm.cmd run test:unit` in `app/` — 100/100 pass.
5. Lab serve check through Vite's in-process server — HTTP 200 for
   `/lab/index.html`, with the `mock data · visual lab` badge present; the
   server was closed in the same command.
6. Focused Electron E2E with the machine-wide app token held —
   `a dispatched run lives in the conversation...` passed 1/1. The token
   was released and verified free afterward.
7. Root `npm.cmd test` — core 106/106 and CLI 9/9 pass.
8. Final `git diff --check` — clean. The product diff is scoped to the four
   files above. The pre-existing untracked `design/` mockups remain
   untouched and uncommitted.

Two invocation attempts before the focused E2E pass were harness-only:
`npx` is not on this shell's PATH, and the direct Playwright `.cmd` shim
mishandles the space in this workspace path. The successful run used
`npm.cmd exec -- playwright ...` under the app token.

## How to try it

```powershell
npm.cmd --prefix app run lab
```

Open the printed localhost URL, choose the town view, and flip the lab
scenarios. Quiet and thinking show Cairn's holo face; Task running adds the
focused worker face and warm pad; DONE and STOPPED return the square to
Cairn alone. The same change is in the real renderer bundle used by the
desktop app.

## Limitations and remaining human judgment

- The focused E2E proves the real ready/running/reduced-motion/closed
  lifecycle. The full 42-test E2E suite was not rerun for this
  presentation-only task; the last full-suite green is Task 110, and this
  task's affected test passed after the change.
- Final aesthetic judgment — face size, pad placement, glow strength, and
  whether the expression feels right — remains the owner's eye. The lab is
  the fast place to tune those values.

Disposition: DONE
