# Task 125 brief — One sky: rail, chat, and town in one continuous garden

## Requested visible outcome

The owner: "The rail and chat just don't live in the same cohesion. It's
still more like three separate pages than one integrated experience." Make
the whole workspace one continuous Soft festival environment: the dusk-lavender
sky with warm fireflies spans the entire window behind everything; the rail
becomes a soft frosted strip floating on that sky instead of an opaque panel
with a page-edge shadow; the chat pane's opaque slab goes away so the
conversation floats on the same sky; the 8px divider bar turns invisible
until hovered; the town's own duplicate sky becomes transparent so it is
literally the same sky, and the now-invisible perspective-grid element is
removed for real. This is the unification slice, pulled forward by the
owner's feedback.

## Boundary of intent

- Files: `app/src/renderer/app.css`, `app/src/renderer/tokens.css`,
  `app/src/renderer/components/TownSquare.tsx` (grid element removal only),
  plus task records.
- No behavior changes: layout grid, drag, divider drag, tabs, chat logic,
  town model, IPC, core, CLI, contract, dependencies all untouched. Surfaces
  keep their contrast duties — cards, bubbles, chips, and popovers keep
  solid-or-frosted backgrounds; only the page-level slabs go translucent.
- Light theme untouched; the workspace garden is night in both themes.
- Tokens keep their names; dark-side values shift to the lavender family so
  cards and lines harmonize with the sky.

## Checks that will show the outcome holds

- Typecheck green; desktop unit tests green; lab build green.
- Focused town-square E2E green; plus a full-app Electron render (app token
  held and released) with screenshots in ready and working states, visually
  inspected for the one-sky read: no seam between rail, chat, and town; text
  still legible everywhere.

## DONE and STOPPED

- DONE: rail, chat, and town read as one continuous festival dusk with no
  hard page edges; legibility holds; all checks pass.
- STOPPED: checks fail, legibility drops, or the change cannot stay inside
  the boundary.
