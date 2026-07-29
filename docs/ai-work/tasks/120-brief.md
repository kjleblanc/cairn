# Task 120 brief — Port the warm interface spirit into the town square

## Requested visible outcome

The owner approved Concept 04 (Warm interface spirit) from the lab concept
board: "That's the one. Let's go with this for now." Port that face into the
shipped town square so Cairn's live avatar uses the warm interface spirit
language — sparse spirit field, one larger asymmetric eye, a smaller second
eye, and an off-center waveform mouth — instead of the current blush-and-smile
emoji face. The worker face moves to the same spirit family (the working pose)
in its existing amber palette so the square stays coherent.

The visual lab mounts the real renderer, so the ported face is visible in the
owner's existing lab preview.

## Boundary of intent

- Only the avatar rendering changes: `app/src/renderer/components/TownSquare.tsx`
  and `app/src/renderer/app.css` (plus task records).
- No behavior changes: entity model, layout, drag, selection, threads, detail
  panel, IPC, adapters, core, CLI, contract, and dependencies stay untouched.
- Wrapper classes the E2E suite relies on (`.town-face-cairn`,
  `.town-face-worker`, `.town-face-holo`, orbit/holo structure) keep existing.
- Live Cairn states in the town are ready / thinking / working; the lab-only
  DONE and STOPPED poses stay lab-only. Reduced-motion behavior must keep
  working (orbit/holo/thought animations off under `prefers-reduced-motion`).
- The other lane's uncommitted work (`core/`, `app/src/main`, `app/tests`)
  stays untouched; `design/` stays untracked.

## Checks that will show the outcome holds

- `npm.cmd run typecheck` in `app/` — green.
- Desktop unit tests green; lab build green.
- Focused conductor E2E (town square presence / reduced motion / honest
  disappearance) green.
- Isolated Electron render (app token held and released) showing the spirit
  face on the Cairn node, with a screenshot saved under
  `design/attachments/` for the owner's judgment.

## DONE and STOPPED

- DONE: the Cairn node shows the warm spirit face across ready, thinking, and
  working; the worker node shows the amber spirit working pose; all checks
  above pass with real results.
- STOPPED: any check fails, the render is broken, or the port would require
  touching the boundary-of-intent list.
