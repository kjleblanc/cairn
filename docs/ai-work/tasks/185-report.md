# Task 185 report — bring the project chrome into the pond

**Lane:** E

**Base commit:** `4eaf8effae8cde08094d83aa6bc3c658ce88f5ad`

**Brief commit:** `75d957daffddeb5433e0b6edf3a737e395dcf5c2`

**Synced main base:** `18a7a6e968e919783e824a7b44c1eb5daf6388bb`

**Milestone moved:** NO

## Outcome

The project rail and current-project context now read as furniture in Cairn's
pond instead of opaque application panels beside and above it. The rail is a
soft shore with no hard right-hand divider. Its selected project is a rounded
translucent island rather than a rectangular block with a neon sidebar stripe.
The old full-width wide header is now only a positioning layer: project identity
and status/reset sit on two small islands with open water visible between them.

At compact sizes, Cairn still shows exactly one honest pond line in place of the
wide header. That line now uses the same shore material and begins with the full
active-project name — for example, **Beta · Town is quiet.** — so the CSS-folded
rail's initials never become the owner's only project context. Its existing
status live region remains separate, so a status change is not announced as a
project switch. Project selection, rail collapse and expansion, task disclosure,
activity states, reset-layout behavior, pond opening, and responsive ownership
all remain unchanged.

Keyboard focus is clearer throughout the project chrome. Collapse, project,
task-toggle, rail-action, and Reset layout controls now receive the same visible
three-pixel pond-cyan ring.

Task 185 is complete in Lane E only. The stopped Task 180/183 evidence in the
main checkout remains untouched, so this lane was not merged into main.

## What changed

- `app/src/renderer/tokens.css` points the rail's legacy teal/status aliases to
  the approved pond palette and defines one global night-garden shore, island,
  edge, and shadow material. Global scope is deliberate: the standalone Town
  preview in the visual lab renders outside the desktop workspace shell.
- `app/src/renderer/app.css` softens the rail and its internal separators,
  gives the selected project and wide current-project controls the shared
  island treatment, removes the wide header slab, carries the shore treatment
  into the compact pond line, and adds explicit keyboard focus rings.
- `app/src/renderer/components/PondLine.tsx` puts the active project name first
  in the compact visual line while leaving the status-only live region intact.
- `app/src/renderer/screens/Workspace.tsx` passes its already trusted current
  project name into `PondLine`; no route, screen, or project behavior changes.
- `app/tests-unit/environmentchrome.test.ts` is the red-first visual contract
  for the shared material, rimless rail, header islands, palette, focus rings,
  and the standalone Town preview consumer.
- `app/tests/projects.spec.ts` adds a self-contained local-mock journey that
  seeds and restores its own isolated project registry, switches projects,
  checks wide/compact identity and status ownership, verifies geometry and no
  horizontal overflow, and writes the two screenshots. It never uses Project
  Home or Dashboard.
- `docs/ai-work/tasks/185-report.md` is this report.
- `docs/ai-work/LOG.md` receives the Task 185 row. A later union merge must
  retain the independent Task 180, 181, 183, 184, and 185 rows exactly once.

No dependency, lockfile, credential, saved-project format, provider connection,
conversation, proposal, accepted task, dispatch, worker, permission, project
fact, milestone, push, publish, deployment, or production data changed.

## AI decisions and review record

- The implementation reuses the existing React landmarks and handlers. The
  visual header itself becomes transparent; its existing project/status groups
  become the islands. No new panel component or state owner was introduced.
- The same material variables are global night-garden tokens rather than
  workspace-local values. A review caught that `TownSquare` also renders in the
  standalone Chat mock lab, where workspace-local variables would have made
  the island declarations invalid even though the lab compiled.
- Compact mode keeps one line instead of restoring a second header. A visual
  review caught that CSS-compacted project buttons showed initials only, so the
  active name was added ahead of the existing status on that line.
- The Task 185 Electron proof is separate from the older Project Home journey.
  A review caught that embedding the new assertions there would unnecessarily
  couple this proof to the stopped Task 183 structural direction.
- The first wide artifact was captured before the conversation entrance had
  fully settled. The test now waits for its animation and moves the pointer off
  the reordering rail before capture, so neither partial opacity nor incidental
  hover can masquerade as the final composition.
- Task 180's three stopped mock directions were not copied or treated as owner
  approval. A final custody review found distinct values and no Task 180 lab or
  Task 183 ProjectRail/navigation structure in this change.
- Three independent read-only final reviews reported no remaining P0–P2
  visual, accessibility, code, test, or provenance findings.

## Checks run and real results

1. Red-first focused contract: from `app`, run
   `& .\node_modules\.bin\tsc.cmd -p tsconfig.unit.json`, then
   `node --test dist-unit/tests-unit/environmentchrome.test.js`.
   - The first run failed all **4** new assertions against the old hard-edged
     rail/header treatment, as intended.
   - After implementation and the standalone-lab repair, the final focused
     source passed: **5 tests, 5 passed, 0 failed**.
2. `cd app && npm.cmd run typecheck`
   - Final pass with no TypeScript errors.
3. `cd app && npm.cmd run test:unit`
   - Final pass: **376 total, 374 passed, 0 failed, 2 Windows host-specific
     skips**.
4. `cd app && npm.cmd run build:vite`
   - Final pass with the local worktree-read allowance required by Vite's
     config traversal: main **63 modules**, preload **1 module**, renderer **73
     modules**.
5. `cd app && npm.cmd run build:lab`
   - Final pass with the same local allowance: **96 modules**. The focused
     contract separately proves its standalone `TownSquare` receives all four
     global environment materials.
6. With no Cairn/Electron process and both `.lanes/e/app/.app-token` and
   `%TEMP%/cairn-app-token` held, run
   `& .\node_modules\.bin\playwright.cmd test tests/projects.spec.ts --workers=1`
   from `app`.
   - Final complete file pass: **7 passed, 0 failed** in 15.9 seconds.
   - The Task 185 journey itself passed in 2.3 seconds. It uses `CAIRN_MOCK=1`,
     an isolated throwaway profile and registry, two temporary local projects,
     and no provider or worker.
   - It proves selected project identity stays synchronized through Beta →
     Alpha → Beta, collapse/expand reflows, the wide header and compact line
     remain mutually exclusive, both are contained without horizontal
     overflow, and the compact line retains the full project name.
7. Visual inspection of the final settled artifacts:
   - `%TEMP%/cairn-task-185-integrated-project-pond-wide.png` — passed: selected
     rail project and both top context islands share one material, open water
     remains visible between them, navigation stays legible, and no transient
     animation or hover state is present.
   - `%TEMP%/cairn-task-185-integrated-project-pond-compact.png` — passed: the
     rail and one-line status share the shore treatment, **Beta** remains
     explicit despite the initials-only rail, and no content clips.
8. `git diff --check`, exact diff/status inspection, final process/lock check,
   and separate main-checkout status inspection
   - Passed. Lane E held only the six intended implementation/test paths before
     records. No Cairn/Electron process or app lock remained. Main stayed at
     `18a7a6e968e919783e824a7b44c1eb5daf6388bb` with the same retained Task
     180/183 paths and custody hashes unchanged.

Diagnostic failures were repaired and are not counted as passes. This Windows
PowerShell blocks `npm.ps1`, so final npm checks used `npm.cmd`. Its `New-Item`
also rejected `-LiteralPath` before any lock or app existed; the compatible
exact `-Path` form was used. Review found the initial compact-name, transient
screenshot, standalone-lab variable-scope, and future Project Home test-coupling
gaps; all four were repaired and rechecked. Every Electron run released both
locks and left no app process behind.

## How to try it

The safest immediate review is the settled wide capture:

`C:\Users\KenJL\AppData\Local\Temp\cairn-task-185-integrated-project-pond-wide.png`

The compact counterpart is beside it as
`cairn-task-185-integrated-project-pond-compact.png`.

For a local live look before landing, first close Cairn, then run `npm.cmd
start` from `.lanes/e/app`. Switching, collapsing, and resizing projects are
local actions. Sending a message through an existing conductor connection may
share the already authorized context and use provider quota, so it is not
needed to judge this task.

The main checkout does not contain this completed result. Land the full Lane E
sequence only after the retained Task 180/183 work on main is resolved and main
is clean between tasks; Task 185 must not be cherry-picked without its Task 182
and 184 predecessors.

## Limitations and remaining judgment

- The structural and responsive relationships, identity synchronization,
  keyboard focus, project switching, and overflow are mechanically verified.
  Whether this is the right amount of visual separation remains the owner's
  taste judgment.
- Below 1260 pixels the active name and status share one ellipsizing line. The
  project name comes first, while the existing fixed pond affordance remains
  at the far edge.
- Task 185 is committed and DONE in Lane E but intentionally not merged into
  the dirty main checkout.

Disposition: **DONE**
