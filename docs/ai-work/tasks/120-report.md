# Task 120 report — Port the warm interface spirit into the town square

## Requested visible outcome

Port the owner-approved Concept 04 (Warm interface spirit) from the lab
concept board into the shipped town square: Cairn's live avatar becomes the
sparse spirit field with one larger asymmetric eye, a smaller second eye, and
an off-center waveform mouth, replacing the blush-and-smile emoji face; the
worker face moves to the same spirit family (working pose) in amber.

## What actually changed

- `app/src/renderer/components/TownSquare.tsx` — `TownFace` rewritten. It now
  takes Cairn's live state (`ready` / `thinking` / `working`; workers always
  take the working pose) and renders the warm-spirit geometry: a dashed inner
  field ring, stroke-based asymmetric eyes, and the warm waveform mouth
  (cyan-amber mix for Cairn, amber for workers). The thought-particle group
  stays Cairn-only, as before. Wrapper classes the E2E suite depends on
  (`.town-face-cairn`, `.town-face-worker`, `.town-face-holo`,
  `.town-face-orbit`) are unchanged, and the Cairn node now passes
  `state={entity.state}` into the face.
- `app/src/renderer/app.css` — face CSS replaced: `.town-face-skin`,
  `-eye-shine`, `-blush`, and the worker-eye/brow/mouth rules are gone;
  `.town-face-field`, stroke-based `.town-face-eye` (large/small/heavy), and
  the warm `.town-face-mouth` rules are in. Blink, float, orbit, thought, and
  the reduced-motion behavior are unchanged.
- `docs/ai-work/LOG.md`, `docs/ai-work/tasks/120-report.md` — this record.

No behavior changes: entity model, layout, drag, selection, threads, detail
panel, IPC, core, CLI, contract, and dependencies are untouched. The other
lane's uncommitted work (`core/`, `app/src/main`, `app/tests`,
`tsconfig.unit.json`) was left alone; `design/` stays untracked.

## Checks run and their real results

- `npm.cmd run typecheck` (in `app/`) — green.
- `npm.cmd run test:unit` — 105/105 pass (includes the other lane's new wiring
  test; its in-progress files compiled clean).
- `npm.cmd run build:lab` — green.
- Focused Electron E2E `a dispatched run lives in the conversation…` — 1/1
  pass (5.6s): town presence, worker face/pad, reduced motion, and honest
  disappearance all still hold against the new face.
- Isolated Electron render of the real town square (lab mock bridge; app
  token held, then released): DOM checks confirm the spirit face
  (`town-face-field`, one large + one small eye, warm mouth, thought group)
  and confirm the old skin/blush are gone (count 0). Three scenarios captured
  and visually inspected:
  - `design/attachments/task-120-town-warm-spirit.png` (ready)
  - `design/attachments/task-120-town-warm-spirit-thinking.png` (thinking)
  - `design/attachments/task-120-town-warm-spirit-working.png` (Cairn working
    + amber worker on its pad with the task thread)
- Two harness repairs during the render, disclosed: the first captures came
  back blank because a hidden window with `--disable-gpu` never composites
  animated layers (fixed by enabling GPU compositing with
  `paintWhenInitiallyHidden`), and the working-scenario shot needed a "Quiet"
  reset click first (the thinking scenario stays active otherwise). Temporary
  harness files (`.tmp-town-shot.cjs`, `.tmp-town-shot-runner.mjs`) were
  removed; the app token is free.

## How to try it

Open the visual lab preview. The town square's Cairn node now wears the warm
interface spirit face. Use the lab scenario buttons — "Cairn thinking" and
"Task running" — to see the thinking pose and the amber worker with the task
thread. The real app shows the same faces live.

## Limitations / remaining human judgment

- DONE and STOPPED poses remain lab-only; the live town only produces ready,
  thinking, and working.
- The aesthetic judgment is the owner's: this is the shipped face "for now",
  per the owner's approval of Concept 04.

Disposition: DONE
