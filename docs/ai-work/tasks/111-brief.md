# Task 111 — garden faces and worker pads

## Requested visible outcome

Port the approved "garden around you" character layer into the real town
square: Cairn and live workers appear as expressive hologram-ring faces from
mockup 2, and an active worker stands on a warm, softly breathing worker pad.
The current town identities, live-state derivation, drag behavior, details,
threads, and navigation remain truthful and unchanged; this is the next visual
layer after Task 100's night ground.

## Boundary of intent — what must not change

- Only renderer presentation code, styles, and directly related renderer tests
  may change. Runtime identities, worker derivation, project state, IPC,
  persistence, routing, dispatch behavior, and the contract remain unchanged.
- Worker pads appear only for real active workers already shown by the town;
  they must not invent idle, queued, or resting workers.
- Every new color lives as a named token in `tokens.css`; component styles use
  tokens rather than raw hex.
- Accessibility stays truthful: interactive nodes keep their existing names,
  keyboard focus behavior, pressed/selected states, and reduced-motion support.
  New animation is decorative and is disabled under reduced motion.
- No dependencies, installs, Electron/provider/Git side effects, or changes to
  shipped main/preload code.

## Checks that will show the outcome holds

1. Desktop typecheck passes with the changed renderer sources.
2. `build:vite` and `build:lab` pass.
3. Desktop unit suite passes, including any focused assertions added for the
   new face/pad presentation.
4. The lab serves the real repainted town; quiet, thinking, running, DONE, and
   STOPPED scenarios remain available for visual inspection.
5. The final diff is scoped to this task's renderer files, tests, and records;
  unrelated existing work remains untouched.

## What DONE and STOPPED mean here

- DONE: the real town square shows the holo faces and real-worker pads across
  the lab scenarios, behavior and accessibility checks stay green, and the
  diff is isolated.
- STOPPED: the visual port requires behavior/runtime changes, obscures existing
  state or text, breaks reduced motion/accessibility, or a check fails without
  an in-scope correction.
