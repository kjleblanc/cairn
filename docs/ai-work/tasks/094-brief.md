# Task 094 — persist a bounded deterministic town layout

Requested outcome: Real town entities settle deterministically around centered
Cairn, worker placement can be dragged and reset, and the active project's
positions and divider width return from an ignored project-local presentation
store.

Boundary of intent:

- Persist only schema version, normalized entity coordinates, and divider
  width in `.cairn/town-square.json`.
- Store no task, conversation, provider, credential, record, authorization, or
  runtime content; keep the remembered-project registry unchanged.
- Cairn remains fixed at the center. Dragging and reset change presentation
  only and never dispatch, stop, confirm, push, or alter task state.
- Preserve the current one-worker serial runtime and the Task 093 truth model.
- Add no dependency and make no external call.

Checks:

1. Pure layout checks prove deterministic output, center pin, bounds,
   separation, saved-point reuse, and the eight-worker visible bound.
2. Store checks prove valid round-trip, corrupt fallback, project isolation,
   validation, and ignored `.cairn/` ownership.
3. A live local fake-worker check drags a villager, observes the normalized
   presentation file, reloads to the same placement, and resets it.
4. Reduced motion removes layout transitions while preserving the final
   deterministic positions.
5. Divider width is project-local, bounded, and persists through the same
   presentation store.
6. Type, unit, build, focused isolated Electron, and diff checks pass.

DONE means layout is deterministic, bounded, movable, resettable, and
project-local without changing any runtime or trust fact.

STOPPED means persistence could capture non-presentation data, mix projects,
enter Git history, or let a canvas action change work.
