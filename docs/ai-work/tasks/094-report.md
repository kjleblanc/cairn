# Task 094 report — persist a bounded deterministic town layout

The town now has a dependency-free deterministic force layout. Cairn is fixed
at the center; linked workers settle inside bounded ground with collision
separation; up to the approved eight visible workers remain supported. Normal
mode transitions between final positions and communicates thinking/working
state with restrained motion, while reduced motion uses the same final layout
without transitions or animation.

A worker can be dragged with the pointer. Its normalized position, together
with that project's Chat/Town divider width, is validated and stored in the
project's ignored `.cairn/town-square.json`. Reloading restores placement.
“Reset layout” clears saved coordinates and returns to the deterministic
automatic result. The divider is also keyboard adjustable with Left/Right and
restores independently for each project.

Files changed:

- `app/src/renderer/town/layout.ts` — adds the deterministic bounded force
  solver, stable hash seeds, fixed center, link attraction, collision,
  damping, and clamping.
- `app/src/main/townstore.ts` — adds the validated, project-local presentation
  store with corrupt-state fallback and `.cairn/` exclusion.
- `app/src/shared/ipc.ts`, `app/src/preload.ts`, and `app/src/main/ipc.ts` —
  expose governed-project load/save channels for presentation state only.
- `app/src/renderer/components/TownSquare.tsx` — consumes force positions,
  restores saved points, tracks pointer drag, places thread controls
  perpendicular to any link direction, and resets placement safely.
- `app/src/renderer/screens/Workspace.tsx` — moves divider memory from global
  renderer storage into the active project's town store, bounds it to both
  panes, and adds keyboard adjustment.
- `app/src/renderer/app.css` — adds position transitions, working/thinking
  motion, drag cues, Reset styling, reduced-motion overrides, and a
  pane-safe grid bound.
- `app/tests-unit/townlayout.test.ts` — verifies deterministic output, center
  pinning, bounds, separation, saved placement, and clamping.
- `app/tests-unit/townstore.test.ts` — verifies round-trip, corrupt fallback,
  project isolation, validation, schema-only serialization, and Git exclusion.
- `app/tsconfig.unit.json` — includes the layout and store in the unit build.
- `app/tests/conductor.spec.ts` — verifies live dragging, normalized storage,
  reload restoration, reduced motion, reset, pane bounds, and unchanged run
  controls through the local fake-worker lane.
- `app/tests/projects.spec.ts` — verifies keyboard divider adjustment and
  independent restoration for two temporary projects.
- `docs/ai-work/tasks/094-brief.md` — records the requested outcome and bounds.
- `docs/ai-work/tasks/094-report.md` — records this result.
- `docs/ai-work/LOG.md` — appends the task outcome.

Checks run:

- `npm run typecheck` — passed.
- `npm run test:unit` — passed, 92 tests.
- `npm run build:vite` — passed.
- isolated Electron project/divider suite — passed, 3 tests.
- isolated Electron live fake-worker layout scenario — passed, 1 test,
  including drag, reload, reduced motion, reset, and stop.
- visual capture of the force-settled live relationship — inspected; the
  worker, Cairn, and perpendicular thread control were distinct.
- `git diff --check` — passed.

The first live drag attempts failed because the new deterministic seed placed
the worker below Cairn, where the prior always-downward thread control covered
the worker's pointer target. Drag tracking was also moved to window-level
pointer listeners. The thread control now offsets perpendicular to its real
link in every direction; the complete scenario then passed repeatedly.

How to try it:

1. Start a real confirmed worker run and drag its villager around the bounded
   town ground.
2. Reload the app while the run remains active; the villager returns to the
   saved place.
3. Select “Reset layout” to return it to the automatic force result.
4. Drag the Chat/Town divider, or focus it and use Left/Right. Switch projects
   and back to see each project restore its own width.
5. Inspect `.cairn/town-square.json` if desired; it contains only `version`,
   normalized `positions`, and `dividerWidth`, and Git ignores it.

Limitations:

- The current serial runtime still provides at most one real live worker.
  Eight-worker force behavior is verified in the pure solver but does not
  imply approved multi-agent concurrency.
- Saved coordinates are keyed by the current stable adapter-derived entity id.
  A future concurrent runtime must first introduce real run-instance ids.

Disposition: DONE
