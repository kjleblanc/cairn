# Task 130 brief: overlays, not pages — settings and picker over a persistent world

**Lane:** A (main checkout)

## Requested visible outcome

The app stops feeling like a stack of menus. The owner's words: "everything
still feels like separate menus rather than one cohesive experience." This
slice kills the page-router feeling at the shell level:

- **The world persists.** When a project is open, the workspace — sky, town,
  chat — never unmounts just because the owner opens settings or the project
  picker. It stays rendered, alive, and visibly present behind what opened.
- **Overlays, not pages.** Settings and the project picker (when reached from
  inside a project) open as cards that rise over a dimmed, living scene and
  settle back down when closed — no full-screen swap anywhere in the shell.
- Closing is effortless: a close affordance, clicking the dimmed scrim, and
  the Escape key all settle the overlay back down. Entrances use the town
  spring and respect reduced motion, consistent with Task 128.

## Boundary of intent

- **No functional changes.** Settings keeps its exact controls and save
  behavior; the picker keeps its create/open/recent flows and its callbacks;
  Workspace's view model (chat/dashboard/task center, rail, tabs, resize) is
  untouched. Only *how these surfaces enter and leave* changes.
- **Welcome stays a full scene.** First run (no project yet) has no world to
  return to, so Welcome remains the base scene; settings opened from there
  overlays Welcome itself.
- **The picker is an overlay only when a project is open.** Cold-boot project
  choice (no active project) remains a base scene — there is nothing to layer
  over.
- **No dependency, data, or security changes.** No changes to main process,
  IPC, or persisted shapes.
- **Adjacent cleanup (disclosed):** `app/src/renderer/bodies.ts`, the Task 128
  re-export shim, now has zero importers after the other lane's Task 127
  landed; it is removed as planned cleanup.
- The other lane's work is never staged or touched.

## Checks that show the outcome holds

- `npm run typecheck` green; full unit suite green.
- `npm run build:lab` and the production build green.
- Full Playwright E2E (with the app token held) green — updated where a test
  legitimately encoded page-swap assumptions, with every change disclosed.
- A focused check (E2E or isolated render) that with settings open, the town
  scene is still mounted underneath, and that Escape / scrim-click closes the
  overlay back to the untouched world.
- Isolated Electron render + screenshots inspected: overlay rises over a dimmed
  living scene; reduced-motion variant has no rise.

## DONE / STOPPED

- **DONE:** a project owner can open settings or the picker and see the world
  alive behind a dimmed scrim, close it three ways, and land back in the
  untouched world; all checks green; commit contains only this slice's paths.
- **STOPPED:** overlays cannot keep the world mounted without breaking
  existing flows or tests in ways that change requested behavior.
