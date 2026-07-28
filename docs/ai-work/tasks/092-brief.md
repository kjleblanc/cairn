# Task 092 — make the workspace the desktop home

Requested outcome: A governed project opens into one responsive workspace with
a collapsible multi-project rail, Chat as the primary middle pane, and a town
pane on the right, while existing project, task, settings, and safety flows
remain reachable.

Boundary of intent:

- The town pane in this task shows Cairn only; worker entities and functional
  relationships arrive in the next task and must not be invented early.
- Preserve all provider, worker, push, Git, credential, record, legacy-state,
  and serial-run behavior.
- Remember only presentation state for the divider. Project registry entries
  remain path and last-opened metadata.
- Do not add dependencies or alter project-owned records.

Checks:

1. Active project is first in the rail; other remembered projects follow
   most-recent order with truthful activity and task summaries.
2. Project task groups and the whole rail collapse as approved, retaining
   running/unfinished badges.
3. Selecting a project changes rail, Chat, task context, and town heading
   together without cancelling its work.
4. Desktop shows rail/chat/town; narrow width shows Chat and Town tabs.
5. Existing Dashboard, TaskRun, Picker, Settings, legacy, and project-switch
   flows remain reachable.
6. Type, unit, build, and focused isolated Electron checks pass.

DONE means the persistent shell is Cairn's governed-project home and is ready
for real town entities without changing the trust envelope.

STOPPED means the shell would orphan an existing flow, mix project state, or
require changing an approved safety or storage rule.
