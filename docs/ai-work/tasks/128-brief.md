# Task 128 brief — Motion slice: Animal Crossing softness

> **Renumber note.** This task was briefed and built as Task 126 (brief commit
> f05a9d9). The connect-flow lane had claimed 126 first (0166612) and landed
> it (2698644); per the two-lane rule the later claim renumbers. Their lane
> has since claimed 127 (d03128d), so this task takes **128**. The original
> brief text is preserved in f05a9d9 and copied below unchanged.

## Requested visible outcome

The owner's direction: the feel, responsiveness, and animations should read
"Animal Crossing for app development". Today everything snaps like a tool.
This slice gives the app gentle behavior: softer springs, entrances instead
of blink-ins, calmer idle life, and one celebratory pop on state changes —
with reduced-motion fully respected.

Concretely:

- **Softer spring**: retune `--spring` to a gentler overshoot; town node
  movement slows to a settle.
- **Entrances**: chat bubbles, result cards, task cards, the push chip, and
  the run strip ease up-and-in (opacity + small rise + slight scale); town
  nodes arrive with a soft pop (scale .55 → 1.06 → 1) instead of blinking in.
- **State pop**: when Cairn's node changes state (ready/thinking/working),
  the face pops once, then settles — the "bubble pop" from the look board.
- **Idle life**: the face bob slows from 6s to 7.5s and shallows; the town's
  lantern skyglow breathes slowly.
- **Response**: primary buttons (composer send, town header, rail actions)
  lift 1px on hover and settle on press.
- **Reduced motion**: every new animation and transition joins the existing
  `prefers-reduced-motion` block.

## Boundary of intent

- Files: `app/src/renderer/app.css`, `app/src/renderer/tokens.css` (the
  `--spring` value only), plus task records. (At build time the parallel lane
  held `app.css` uncommitted, so the motion rules shipped as a new
  `app/src/renderer/motion.css` imported after `app.css` instead.)
- Motion only: no layout, color, structure, behavior, IPC, core, CLI,
  contract, or dependency changes. Animations use transform/opacity only.
- No generic `button` rules: town nodes are `<button>`s positioned by
  transform, so interactive polish targets named classes only.
- Entrance animations must not break the town position/persistence E2E.

## Checks that will show the outcome holds

- Typecheck green; desktop unit tests green; lab build green.
- Focused town-square E2E green — especially the reduced-motion assertions
  and the position persistence measurement.
- Isolated Electron render (app token held and released): computed styles
  confirm entrances/pop/reduced-motion wiring; screenshots confirm nothing
  regressed visually.

## DONE and STOPPED

- DONE: all six motion behaviors above are live, reduced-motion covers them,
  and all checks pass.
- STOPPED: checks fail, the E2E position test is disturbed, or the change
  cannot stay motion-only.
