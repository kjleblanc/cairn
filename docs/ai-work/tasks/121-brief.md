# Task 121 brief — Take the circles off the town faces

## Requested visible outcome

The owner, seeing the ported warm spirit faces: "Let's take away the circles,
it's giving too much of an 'emoji' look." Remove the circular framing from the
town-square faces — the dashed orbit ring, the bordered holo disc with its
dark circular background, and the dashed inner field ring — so the spirit face
floats as bare marks (eyes, waveform mouth, thought particles) on the garden
ground. The worker's warm floor pad stays: it is a floor the worker stands on,
not a circle around a face.

## Boundary of intent

- Only avatar framing changes: `app/src/renderer/components/TownSquare.tsx`
  and `app/src/renderer/app.css` (plus task records).
- The face marks themselves (geometry, colors, poses, blink/float/thought
  animations) stay as Task 120 shipped them; only the circular containers go.
- `.town-face-holo` keeps existing as an element with its float animation —
  the focused E2E checks its reduced-motion behavior — but loses the circle
  (border, background, ring shadow). A soft glow may replace the ring so the
  marks keep presence on the dark ground.
- No behavior, model, IPC, core, CLI, contract, or dependency changes.

## Checks that will show the outcome holds

- Typecheck green; desktop unit tests green; lab build green.
- Focused town-square E2E green (presence, reduced motion, disappearance).
- Isolated Electron render (app token held and released) with screenshots of
  the ready and working states, visually inspected: no circles around any
  face, marks still clearly visible.

## DONE and STOPPED

- DONE: no orbit ring, no holo disc, no inner field ring around any face; the
  marks read clearly; all checks pass.
- STOPPED: checks fail or the marks become unreadable without framing.
