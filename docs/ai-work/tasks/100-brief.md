# Task 100 — garden design tokens and the night ground

Requested outcome: The design language of the approved "garden around you"
direction exists as real design tokens, and the town square's ground is
repainted with them: a calm, dark digital space — deep ink, a soft cyan
glow above, a warm amber glow below, faint stars, and a barely-there
scanline texture — replacing the current flat sky-to-ground gradient, in
both light and dark app themes. Component structure, layout, faces, and
behavior do not change yet; this is the atmosphere layer the next tasks
build on.

Owner direction (2026-07-28): approved the immersive garden direction from
mockup 2 (calm cozy digital space, Ghost-in-the-Shell texture, Animal
Crossing warmth) and asked to dive into design, tokens first.

Boundary of intent:

- Two files: `app/src/renderer/tokens.css` (a new garden token group) and
  the `.town-square` background in `app/src/renderer/app.css`.
- The garden space is night in BOTH themes — a deliberate choice, like a
  cinema: the immersive area stays dark while cards, chat, and controls
  keep their paired light/dark tokens. Disclosed here so a future reader
  does not "fix" it as a theming bug.
- Every new color lives in tokens.css as a named token; no raw hex in
  component styles. Readability rule: decorative layers sit behind all
  content at low opacity; no text contrast may change.
- No layout, component, motion, or behavior change. No new dependencies.
  Reduced-motion is unaffected (the new layers are static).

Checks:

1. `npm.cmd run typecheck` and `npm.cmd run build:vite` pass.
2. `npm.cmd run build:lab` passes, and the lab serves the repainted town.
3. Desktop unit suite passes (100 tests).
4. The diff touches only tokens.css, app.css, and this task's records.
5. The town's existing entities, grid, threads, and detail card remain
   fully readable over the new ground (visual check via the lab; states
   posed from the scenario panel).

DONE means the night ground is live in the lab and every check is green.

STOPPED means readability suffers or a check fails without an in-scope
correction.
