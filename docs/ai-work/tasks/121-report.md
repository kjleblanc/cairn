# Task 121 report — Take the circles off the town faces

## Requested visible outcome

Remove the circular framing from the town-square faces — dashed orbit ring,
bordered holo disc, dashed inner field ring — so the warm spirit face floats
as bare marks on the garden ground. The worker's warm floor pad stays (it is
a floor, not a face frame).

## What actually changed

- `app/src/renderer/components/TownSquare.tsx` — the `.town-face-orbit` span
  and the `.town-face-field` circle are gone from `TownFace`. Eyes, waveform
  mouth, thought particles, poses, and wrapper structure are untouched.
- `app/src/renderer/app.css` — deleted the orbit and field rules and the now
  unused `town-orbit-spin` keyframes; `.town-face-holo` lost its border,
  circular background, and ring box-shadow, keeping the float animation (the
  focused E2E checks its reduced-motion behavior) and gaining a soft
  drop-shadow glow so the bare marks keep presence; the reduced-motion list no
  longer names the deleted orbit.
- `docs/ai-work/LOG.md`, `docs/ai-work/tasks/121-report.md` — this record.

No behavior, model, IPC, core, CLI, contract, or dependency changes.

## Checks run and their real results

- `npm.cmd run typecheck` — green.
- `npm.cmd run test:unit` — 105/105 pass.
- `npm.cmd run build:lab` — green.
- Focused Electron E2E `a dispatched run lives in the conversation…` — 1/1
  pass (5.9s).
- Isolated Electron render (app token held, then released): DOM checks confirm
  `orbit: 0`, `field: 0`, no circles left in the Cairn SVG, holo border `0px`
  with a transparent background, eyes and mouth intact. Screenshots captured
  and visually inspected:
  - `design/attachments/task-121-town-no-circles.png` (ready — bare floating
    marks with a soft glow)
  - `design/attachments/task-121-town-no-circles-working.png` (amber worker
    and cyan Cairn floating free, task thread between them)
- Temporary harness files removed; app token verified free.

## How to try it

Open the visual lab preview: the Cairn node is now just the floating face
marks — no ring, no disc. "Task running" shows the worker the same way.

## Limitations / remaining human judgment

- The worker's floor pad and the thread target's rounded pill remain circular
  motifs; the owner's request was about the face framing. Easy follow-ups if
  wanted.
- The marks read clearly at town scale on the dark ground; the owner's eye is
  the final judge.

Disposition: DONE
