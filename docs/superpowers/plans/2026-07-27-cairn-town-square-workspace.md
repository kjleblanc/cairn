# Cairn Town Square Workspace — Implementation Plan

**Goal:** Replace Cairn's page-like desktop navigation with one honest
workspace: projects and tasks in a collapsible left rail, conversation in the
middle, and a functional town square on the right whose entities and threads
are projections of real runtime state.

**Architecture:** The Electron main process exposes one project-keyed
workspace snapshot assembled from the existing project registry, task-session
map, conductor-stream map, and project records. React owns only view state:
rail expansion, pane selection, canvas selection, and divider width. Chat and
town square consume the same active project and runtime truth. Project-local
visual positions live in ignored `.cairn/town-square.json`; the remembered
project registry continues to hold navigation metadata only.

**Tech stack:** Existing TypeScript, Electron 33, React 18, SVG, CSS,
`node:test`, and Playwright. No new dependency is required. The bounded layout
is small and deterministic because the visible worker cap is eight.

**Governing design:** `docs/superpowers/specs/2026-07-27-cairn-town-square-workspace-design.md`

## Runtime semantics

These definitions are load-bearing. A visual element that cannot be produced
from them does not appear.

- **Cairn** is the persistent conductor for the active project. Its state is
  `thinking` only while that project's conductor stream exists, `working`
  while that project's worker task runs, and `ready` otherwise.
- **Worker villager** is one live worker-task session, not an adapter installed
  on the machine, a model name, a historical task, or a decorative resident.
  The current runtime permits at most one per project. Its stable current-era
  id is derived from the session's adapter id. A future multi-agent design must
  introduce real run-instance ids before it may show more than one instance of
  the same adapter.
- **Thread** is one live task relationship between Cairn and that worker
  session. It exists only while the worker session is running. Proposed tasks,
  old conversations, and installed adapters do not create threads.
- **Overflow landmark** appears only when more than eight real live worker
  entities exist. The current serial runtime can never produce it; the state
  and accessible interaction are still defined so a later approved concurrency
  design has a bounded surface.
- **Finished workers** leave the square when the session closes. Their task
  remains in the rail and project records.
- **Town state** stores only presentation coordinates keyed by entity id,
  schema version, and the canvas divider width. It stores no task,
  conversation, provider, credential, or project-record content.

## Global constraints

- Existing worker confirmation, conductor consent, push confirmation, Git
  protection, result-card authorship, and project-local record ownership stay
  unchanged.
- Switching projects never cancels a task or conductor reply. A returning
  screen reattaches to both through main-process snapshots.
- Project activity is keyed by canonical project path. No snapshot may contain
  another project's tasks, conversations, entities, or saved positions.
- Pointer and keyboard interactions expose the same selections and safe
  actions. Canvas actions never dispatch, confirm, push, stop, or cross a risk
  boundary.
- Color and motion are never the sole status signal. Reduced motion disables
  continuous settling and uses deterministic final positions.
- Tests use local fakes and isolated app data. No suite reaches a real
  provider or the owner's stored connection.
- Each task writes its own brief, report, LOG row, and exact-path commit.

---

## Task 1 — Durable per-project workspace state

**Visible slice:** Switching away from a project no longer stops its conductor
reply; returning restores the live partial reply and task state.

**Files:**

- modify `app/src/main/conductor/service.ts`
- modify `app/src/main/tasks.ts`
- modify `app/src/main/ipc.ts`
- modify `app/src/preload.ts`
- modify `app/src/shared/ipc.ts`
- modify `app/src/renderer/screens/Chat.tsx`
- add or update unit and Playwright tests for reattachment and isolation

**Work:**

1. Add a bounded `ConductorStreamSnapshot` containing project directory,
   conversation id, turn kind, start time, and accumulated visible text.
2. Expose `conductor:current` and a read-only task-session accessor.
3. Add the session's adapter id to `RunSessionSnapshot`.
4. Remove Chat's navigation-unmount abort. Reattach on mount from the snapshot;
   explicit Stop and New conversation retain their current meaning.
5. Prove two projects can each hold their own stream/task state and that every
   event remains directory-filtered.

**Preserve:** one reply and one worker task per project; a task still blocks a
reply in that same project; cancel and quit behavior; conversation persistence.

**Checks:** unit tests for snapshot lifecycle; Playwright switch-away/return
for a slow fake reply; existing conductor, routing, and serial suites.

---

## Task 2 — Workspace shell and multi-project rail

**Visible slice:** A governed project opens into the desktop workspace with a
collapsible rail, chat middle pane, canvas pane, and narrow-width Chat/Town
tabs.

**Files:**

- add `app/src/renderer/screens/Workspace.tsx`
- add rail and workspace components under `app/src/renderer/components/`
- modify `app/src/renderer/App.tsx`
- modify `app/src/renderer/screens/Chat.tsx`
- modify `app/src/renderer/app.css`
- modify `app/src/main/main.ts`
- modify project-list IPC types and assembly
- update project and smoke Playwright tests

**Work:**

1. Replace the governed-project page switch with one workspace owner.
2. Extend remembered-project summaries with current activity and task
   summaries assembled from that project's log, unmatched records, worker
   session, and conductor stream.
3. Order active project first, then remaining projects by last-opened time.
4. Keep independent task-group expansion in React memory for the app session;
   selecting a project expands it and collapses only the prior default
   expansion, while explicit manual expansions remain.
5. Collapse the rail to an icon strip with activity badges still readable.
6. Use a remembered divider width. At 980 CSS pixels or narrower, show Chat
   and Town as adjacent tabs with Chat selected by default.
7. Raise the default window width so the three panes are the ordinary desktop
   experience while retaining a genuinely usable minimum.

**Preserve:** Welcome, project creation/conversion, Settings, legacy-state
warning, task run screen, and broken-project removal remain reachable.

**Checks:** rail ordering and collapse tests with two projects; active task
ordering; responsive tab test; existing project-picker tests.

---

## Task 3 — Accessible town entities and relationships

**Visible slice:** Cairn, a real live worker, and their live task thread can be
selected by pointer or keyboard, with truthful non-modal details.

**Files:**

- add `app/src/renderer/town/model.ts`
- add `app/src/renderer/components/TownSquare.tsx`
- add `app/src/renderer/components/TownDetail.tsx`
- modify `Workspace.tsx` and CSS
- add model unit tests and canvas Playwright tests

**Work:**

1. Derive `TownEntity[]` and `TownRelationship[]` purely from the active
   workspace snapshot.
2. Render Cairn at center. Render no worker while idle and exactly one for the
   current serial worker session.
3. Select Cairn to focus Chat; select a worker or thread to open a detail
   region inside the canvas; select empty ground to clear.
4. Give every selectable element a stable accessible name, status text, shape
   cue, focus ring, Enter/Space behavior, and pointer behavior.
5. Prevent drag, double-click, and selection from invoking any IPC mutation
   except town-position persistence introduced in Task 4.

**Preserve:** Chat transcript and composer remain mounted and unobscured;
selection never changes project or run state.

**Checks:** pure-model truth table; keyboard parity; no-idle-worker assertion;
detail facts match the task session; no dispatch IPC from canvas actions.

---

## Task 4 — Bounded deterministic layout and project-local persistence

**Visible slice:** Up to eight real workers settle around centered Cairn,
dragging temporarily pins a worker, reset restores automatic layout, and
positions return after reopening the project.

**Files:**

- add `app/src/renderer/town/layout.ts`
- add `app/src/main/townstore.ts`
- modify IPC, preload, shared types, `TownSquare.tsx`, and CSS
- add layout/store unit tests and persistence Playwright tests

**Work:**

1. Implement a bounded deterministic force step: center attraction, link
   attraction, pairwise collision, boundary clamping, fixed Cairn, and a fixed
   maximum iteration count.
2. Seed positions from an entity-id hash; reuse valid saved positions.
3. Persist versioned normalized coordinates in
   `.cairn/town-square.json` through validated main-process IPC. Write only
   presentation state and keep `.cairn/` excluded from Git.
4. Pointer drag pins for the current session. Reset clears saved worker
   coordinates and recomputes deterministic positions.
5. Under `prefers-reduced-motion`, compute the final positions without
   animated settling.
6. Cap visible workers at eight and derive an accessible counted overflow
   landmark from any remainder.

**Preserve:** no new dependency; no records or conversations duplicated in the
town store; worker/task serial limits unchanged.

**Checks:** deterministic layout, bounds, collision, center pin, corrupt-store
fallback, project isolation, reduced-motion path, overflow count.

---

## Task 5 — Live projection, responsive polish, and end-to-end close

**Visible slice:** Activity moves honestly across rail, chat, and town while
switching projects; narrow layouts, keyboard operation, and inactive/finished
state all behave as approved.

**Files:** focused changes to workspace/town components and tests; README and
app README only where current launch/use descriptions become false.

**Work:**

1. Refresh rail badges from task and conductor events for every project, not
   only the viewed one.
2. Verify a running project remains visible and intact while another project
   is selected.
3. Verify closed workers leave the square and their task remains in history.
4. Verify Chat/Town tabs, divider memory, rail icon state, focus order,
   selection clearing, and reduced motion.
5. Run the complete core, CLI, desktop unit, typecheck, Vite, and isolated
   Playwright suites. Repair regressions in this same task.
6. Inspect the complete diff and final Git state. Update truthful usage prose.

**DONE for the workspace:** all acceptance anchors in the approved design hold
against real application state with no new approval, storage, credential, or
concurrency claim.
