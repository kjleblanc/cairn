# Task 130 report: overlays, not pages — settings and picker over a persistent world

## What actually changed

- `app/src/renderer/App.tsx` — the shell is no longer a page router. The view
  state is now a **base view** (welcome / picker / workspace) plus an optional
  **overlay** (settings, or the project picker when a project is open).
  Settings is no longer a full-screen route at all. The base view stays
  mounted under an overlay; opening a project from the picker overlay enters
  the workspace through one `enterWorkspace` path that closes the overlay.
  Workspace is keyed by `dir:session` where `session` bumps on every explicit
  project entry — without this, opening a project from the overlay could
  inherit the workspace's *internal* project-switch state, a stale-state bug
  the old unmount-per-navigation flow never had a chance to express.
- `app/src/renderer/components/Overlay.tsx` (new) — the overlay host: fixed
  layer, dimmed scrim, `role="dialog" aria-modal` card, close button, scrim
  click, and Escape all settle the layer by unmounting it. The card is
  focused on open (with its `:focus` ring cleared) so the owner's place in
  the world is undisturbed on close.
- `app/src/renderer/app.css` — overlay layout: `.shell-base` (layout-
  transparent wrapper), `.overlay-layer` (z-index 500, under the z-1000 error
  overlay), `.overlay-scrim` (58% dusk dim + slight blur — the world stays
  visible behind it), `.overlay-card` (solid rounded panel matching the chat
  column's established "floats over the scene" look), `.overlay-close`.
- `app/src/renderer/motion.css` — `overlay-rise` (26px rise + settle on the
  town spring, .42s) and `overlay-scrim-in` (.28s fade); both re-killed in
  the reduced-motion block, keeping the file's in-sync rule.
- `app/src/renderer/bodies.ts` — **deleted** (disclosed adjacent cleanup):
  the Task 128 re-export shim had zero importers once the other lane's
  Task 127 landed; verified by grep before removal.
- The shell also `inert`s + `aria-hidden`s the base while an overlay is open
  (callback ref + `toggleAttribute`; React 18 has no `inert` prop), so the
  keyboard can't reach the world behind the dialog.

No functional changes: Settings' controls and save behavior, the picker's
create/open/recent flows, and Workspace's entire view model are untouched.
Welcome stays a full scene; the cold-boot picker (no project open) stays a
base scene — there is no world to layer over in either case.

## Checks run and their real results

- `npm run typecheck` — green.
- Unit suite — green, 0 failures.
- `npm run build:lab` and `npm run build:vite` — both green.
- Full Playwright E2E with the app token held, run per-spec because the suite
  exceeds the 5-minute command limit: smoke+routing 13, projects 4, serial 3,
  away 1, connect-kimi 1, conductor 23 — **45/45 passed**. No test needed
  changing: every existing assertion about settings/picker checks for
  presence, which overlays preserve.
- Focused isolated-Electron verification (temporary harness, since deleted):
  with settings open the town square is still mounted (DOM-level check) while
  the base is `inert`+`aria-hidden`; `.overlay-card` computes
  `animation-name: overlay-rise`; Escape closes, scrim click closes, picker
  overlay opens over the same live town and closes; under CDP-emulated
  reduced motion both card and scrim compute `animation-name: none`.
- Screenshots inspected (`design/attachments/task-130-settings-overlay.png`,
  `task-130-picker-overlay.png`): opaque card over a dimmed, visible world.
- App token released; temp harness deleted.

## Harness repairs (disclosed, in-task)

1. The first focused check used a role locator for the town; role queries
   correctly exclude the `aria-hidden` world, so the check was switched to a
   DOM-level `.town-square` locator — the world was never unmounted.
2. The first settings screenshot caught the rise mid-flight (translucent
   card bleeding the connect card through); the harness now waits for
   `document.getAnimations()` to finish before shooting. Styling was never
   wrong.

## How to try it

In the lab preview (hard refresh once): open a project, then click
**Settings** or **Open project** in the rail — the card rises out of the
dimmed town, which keeps living behind it. Close with the ×, Escape, or a
click on the dim. In the real app the same flows come from the rail and from
the dashboard's "Switch project → All projects".

## Limitations / remaining human judgment

- The base picker (cold boot, no project) and Welcome remain full scenes by
  design; whether they should also grow a world-behind treatment is a later
  call.
- The center-view swaps inside the workspace (chat / dashboard / task) and
  the narrow Chat|Town tabs are untouched — they were named as separate
  follow-ups in the diagnosis, not part of this slice.
- The dim/blur strength and rise distance are judgment calls for the owner
  to feel live.

**Disposition: DONE**
