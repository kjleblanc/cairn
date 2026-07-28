# Task 093 report — add accessible town entities and relationships

The town square is now a live projection of the active project rather than a
decorative placeholder. Cairn is always present. A villager and its luminous
task thread appear only while a real, confirmed worker-backed run is active;
offline demos, installed adapters, history, and closed sessions do not create
residents.

Every entity and relationship is a native button with a stable accessible
name, visible text and shape status, a focus ring, and matching pointer,
Enter, and Space behavior. Worker and thread selections open non-modal details
inside the town; Cairn focuses Chat; empty ground clears only the selection.

Files changed:

- `app/src/renderer/town/model.ts` — adds the pure town truth model, real-session
  projection, duplicate-id defense, eight-worker cap, and future overflow
  landmark semantics.
- `app/src/renderer/components/TownSquare.tsx` — renders Cairn, real live
  workers, task threads, accessible selection, and safe Chat/run navigation.
- `app/src/renderer/components/TownDetail.tsx` — renders truthful worker,
  thread, Cairn, and overflow details inside the canvas.
- `app/src/renderer/components/TownSquarePlaceholder.tsx` — removed after the
  real semantic surface replaced it.
- `app/src/renderer/screens/Workspace.tsx` — reattaches the active project's
  task and conductor snapshots and passes them to the town without mixing
  project state.
- `app/src/renderer/app.css` and `app/src/renderer/tokens.css` — add distinct
  conductor, villager, relationship, status, focus, and detail treatments.
- `app/tests-unit/townmodel.test.ts` — adds the runtime truth table for idle,
  thinking, demo, live, closed, duplicate, and overflow states.
- `app/tsconfig.unit.json` — includes the pure town model in the unit build.
- `app/tests/conductor.spec.ts` — verifies idle honesty, Cairn focus,
  keyboard selection, real detail facts, empty-ground clearing, and worker
  departure through a local fake-worker run.
- `docs/ai-work/tasks/093-brief.md` — records the requested outcome and bounds.
- `docs/ai-work/tasks/093-report.md` — records this result.
- `docs/ai-work/LOG.md` — appends the task outcome.

Checks run:

- `npm run typecheck` — passed.
- `npm run test:unit` — passed, 83 tests.
- `npm run build:vite` — passed.
- isolated Electron live fake-worker canvas scenario — passed, 1 test.
- isolated Electron project and smoke checks — passed, 4 tests.
- visual capture of the live relationship view — inspected; it exposed an
  overlapping thread control, which was moved below the relationship line and
  the affected Electron scenario was rerun successfully.
- `git diff --check` — passed.

One unit check initially failed because the duplicate-id implementation kept
the last entry while its contract said the first. The derivation was repaired
to keep the first, and all 83 unit checks then passed.

How to try it:

1. Open a project and select Cairn in the town; focus returns to Chat.
2. Start one confirmed real worker call. While it runs, select its villager or
   glowing task-thread control by pointer, Enter, or Space.
3. Inspect the live task facts in the town detail, select empty ground to clear
   them, and use “View run activity” for the existing run surface.
4. Finish or stop the run; the villager and thread leave while task history
   remains in the rail and project records.

Limitations:

- This task uses deterministic temporary positions. Force layout, dragging,
  reset, reduced-motion settlement, and project-local coordinate persistence
  arrive in Task 094.
- The current approved runtime remains serial, so only one real worker can
  appear. The model's cap and overflow object define honest future behavior
  without claiming that concurrency exists today.

Disposition: DONE
