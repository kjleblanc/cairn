# Task 093 — add accessible town entities and relationships

Requested outcome: The town square projects the active project's real runtime
as selectable Cairn, live worker, and task-thread controls with truthful
non-modal details and pointer/keyboard parity.

Boundary of intent:

- Cairn is always present. A worker appears only for a real, confirmed,
  worker-backed session while it is running; the offline demo and closed
  sessions never become villagers.
- A task thread exists only between Cairn and that same live worker.
- Canvas interactions may focus Chat or navigate to existing run activity, but
  may not dispatch, stop, confirm, push, mutate records, or cross any approval
  boundary.
- This task uses deterministic temporary positions. Force layout, dragging,
  reset, and project-local position persistence belong to Task 094.
- Preserve all provider, worker, Git, record, serial-run, and project-isolation
  behavior.

Checks:

1. A pure model truth table proves idle, thinking, offline-demo, live-worker,
   closed-worker, deduplication, and overflow semantics.
2. Idle town contains Cairn and no worker or thread.
3. A real fake-backed live run shows exactly one matching worker and thread;
   both expose real task facts through pointer or keyboard selection.
4. Selecting Cairn focuses Chat, and selecting empty ground clears town detail.
5. The worker leaves when the run closes, while existing run and task history
   behavior remains intact.
6. Type, unit, build, focused isolated Electron, and diff checks pass.

DONE means every visible town object is derived from real active-project state
and exposes the approved safe interactions accessibly.

STOPPED means the canvas would invent runtime state, mix projects, dispatch
work, or require changing an existing safety boundary.
