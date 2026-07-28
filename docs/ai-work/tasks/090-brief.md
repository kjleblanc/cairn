# Task 090 — plan the town-square workspace implementation

Requested outcome: Turn the owner-approved Cairn town-square workspace design
into a serial implementation plan that is precise enough to build without
inventing agents, relationships, activity, or authorization.

Boundary of intent:

- This task changes planning and task-memory files only; it changes no runtime
  behavior.
- The approved visual direction, storage ownership, approval gates, credential
  handling, and per-project serialization rules must not change.
- The plan must require real runtime identities for every visual entity and
  relationship. It must not create decorative agents that application state
  cannot support.
- No dependency, provider call, external write, deployment, or multi-agent
  concurrency is authorized.

Checks:

1. The plan scopes independently verifiable serial tasks for runtime state,
   workspace shell and rail, accessible canvas interactions, bounded layout
   and persistence, live projection, and end-to-end verification.
2. It defines what Cairn, a worker villager, a thread, overflow, and saved town
   state mean in the current one-worker-per-project runtime.
3. Every task names exact files, preserved behavior, and visible checks.
4. The real diff and final Git status show only this task's planning records.

DONE means the plan is committed with this brief, a report, and one truthful
LOG row, ready for its first implementation task.

STOPPED means the approved brief cannot be translated without changing an
owner decision, crossing a risk boundary, or guessing about runtime truth.
