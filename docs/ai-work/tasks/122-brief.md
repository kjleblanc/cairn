# Task 122 brief — Unification look board: one scene, three directions

## The owner's direction

"Currently it's all too.. 'digital'. I want the colors/art to read the new
vibrant Ghost in the Shell anime, but more in the art/characters than the
digital world. In the feel, responsiveness, animations, ease of use… I imagine
this as 'Animal Crossing' for app development. We need to bring it all
together in one fun, simple, easy environment."

Read: the vivid, saturated palette of the new GitS anime — carried by the
**characters and crafted objects**, not by neon grids and scanlines — with
Animal Crossing's gentle, rounded, welcoming feel in motion and interaction.
The digital-world trappings recede; the garden and its spirits carry the life.

## The plan (serial slices)

1. **Task 122 — look board (this task).** A lab-only page showing the whole
   town square scene under three unified art directions, side by side:
   palette, characters, ground, threads, sky, and motion notes. The owner
   judges and picks (or mixes), exactly as with the avatar concepts.
2. **Palette task.** Port the chosen direction into `tokens.css` so one token
   file owns every color the app and lab share; retire the "digital" crutches
   the direction drops (scanlines, perspective grid, glow-everything).
3. **Motion task.** Tune easings and cadence toward Animal Crossing softness:
   springy but gentle entrances, calm idle bob, honest state changes;
   reduced-motion stays respected.
4. **Unification task.** Bring chat, cards, rail, and town into the same
   language so the whole environment reads as one place.

Each slice lands as its own recorded task with the usual checks.

## Requested visible outcome (this task)

A lab-only "look board" page, linked from the visual lab, showing three
directions for the unified scene — working titles: **Vibrant garden** (GitS
palette on the characters, warm organic ground), **Soft festival** (lighter,
playful, festival-lantern warmth), **Deep calm** (darker, quieter, close to
today but de-digitized). Each panel renders the same scene: Cairn ready, a
worker on its pad, a thread between them, ground and sky. Lab-only; shipped
code untouched.

## Boundary of intent

- New lab files only (plus the lab index link and task records). No changes
  to `app/src`, tokens, shipped renderer, core, CLI, contract, or
  dependencies.
- The faces stay as Task 121 shipped them (bare marks, no circles); the board
  re-skins the scene around them and may restyle mark colors per direction.
- Mock art only — no runtime claims.

## Checks that will show the outcome holds

- Typecheck green; lab build green; all lab HTTP paths 200 with correct
  badges.
- Isolated Electron render (app token held and released): all three direction
  panels present with the scene elements; screenshot captured and visually
  inspected.

## DONE and STOPPED

- DONE: the look board renders all three directions with the full scene, the
  owner can open it from the lab, checks pass.
- STOPPED: checks fail, or the board would require touching shipped code.
