# Cairn Town Square Workspace — Design

Date: 2026-07-27  
Status: approved by owner, section by section  
Scope: design only. This document changes no behavior. It is the source for
scoping serial implementation tasks.

## Owner direction

> The brief captures the cyberpunk x Animal Crossing theme: Cairn as central entity with visual presence, agents as villagers, threads connecting them, left rail with multi-project navigation and task lists, right canvas as functional spatial town square. The brief asks and records owner answers to: 1) rail section order and collapse behavior, 2) canvas layout fixed or force-directed / Cairn position / agent cap / click behavior, 3) project store location and switching behavior with concurrency rules, 4) chat placement in split view. The owner approves each section before proceeding.

## Visual premise

The workspace is a lived-in cyberpunk village, not a dashboard decorated with
characters. Cairn is the persistent central presence. Worker agents appear as
villagers, and visible threads show which task, conversation, or handoff joins
them. Warm, rounded, approachable forms keep the Animal Crossing character;
faded neon, quiet circuitry, and luminous connection lines provide the
cyberpunk layer. Motion communicates real state and must respect reduced-motion
settings.

The town square is functional: selecting its entities changes the working
context, and its threads expose real relationships. It must never imply an
agent, task, or connection that does not exist in application state.

## 1. Left rail

### Decision

From top to bottom, the rail contains:

1. Cairn identity and global connection/body status.
2. Projects, ordered with the active project first and all others by most
   recently opened. Each project row carries its name and compact activity
   state.
3. The active project's tasks: unfinished or running first, then recent
   completed tasks newest first.
4. Bottom-pinned controls for opening or creating a project and settings.

Projects are the rail's primary navigation; task lists are subordinate to the
selected project rather than one global mixed list. Each project's task group
can collapse independently. Selecting a project expands it and collapses the
previous project by default, while a manual expansion remains until the app
closes. The whole rail can collapse to an icon strip; it does not disappear, so
project switching and activity state remain reachable. Running and unfinished
items remain represented by a badge when their section or the rail is
collapsed.

### Owner approval

Approved. This section fixes the rail contents, order, hierarchy, and collapse
behavior for implementation scoping.

## 2. Functional town-square canvas

### Decision

Use a bounded force-directed layout, not fixed coordinates. Cairn is pinned at
the visual center. Agent villagers settle around Cairn while task and
conversation threads provide the force links; deterministic starting positions
and saved settled positions prevent a fresh shuffle on every render. Dragging
an agent temporarily pins it, and a reset action restores automatic layout.

Show at most eight agent villagers at once. This is a legibility cap, not a
concurrency promise: additional agents collect into one clearly counted
overflow landmark that can be opened as a list. Finished or inactive agents
leave the active ring and remain discoverable through the task history rather
than crowding the square.

Click behavior is functional and consistent:

- Cairn focuses the conversation and its current project context.
- An agent opens a non-modal detail panel with its role, state, current task,
  latest activity, and available safe action.
- A thread selects the relationship and shows its task or handoff summary.
- Empty ground clears the selection without changing projects or stopping work.
- Double-click and drag never dispatch work or cross an approval boundary.

Keyboard focus exposes the same entities and actions as pointer input. Status
must be communicated by text or shape as well as color and animation.

### Owner approval

Approved. This section fixes the layout model, Cairn position, visible-agent
cap, overflow treatment, and click behavior for implementation scoping.

## 3. Project model, storage, switching, and concurrency

### Decision

Keep the remembered-project registry in Electron's per-user `userData` area
(`projects.json` in the current implementation). It stores navigation metadata
only: project path and last-opened time. Project-owned truth stays in each
project folder: contract and task records remain under `docs/ai-work/`, while
conversation memory remains under that project's ignored `.cairn/` directory.
No central database duplicates project records or conversation contents.

Switching projects changes the rail selection, canvas, chat, and task context
as one atomic view change. Each project restores its own most recent
conversation and town-square state. Switching away does not cancel a running
task or reply; its project row continues to show activity, and completion is
surfaced there. Returning restores the live or completed state rather than
starting over.

Concurrency is isolated by project:

- Within one project, allow one worker task and one conductor reply at a time,
  with the existing rule that a running task blocks another reply or dispatch
  for that project.
- Different projects may continue independently, but each retains the same
  per-project serial limit.
- No agent may read, write, or display another project's records merely because
  both projects are active.
- Any future multi-agent work inside one project remains out of scope until its
  own approved design changes this rule.

### Owner approval

Approved. This section fixes store ownership, project-switch behavior, and
concurrency boundaries for implementation scoping.

## 4. Chat placement

### Decision

Desktop uses a three-part split: collapsible project rail on the left, chat in
the middle, and town-square canvas on the right. Chat is the primary working
surface and keeps the composer visible at its bottom; the canvas remains
visible while the owner talks so Cairn, agents, and threads can react to real
state without replacing the conversation.

The chat/canvas divider is draggable and remembers its width locally. Neither
pane may shrink below a usable minimum. At narrower widths, the canvas becomes
a tab beside Chat rather than overlaying it; Chat is the default tab and the
rail may remain in its collapsed icon state. Selecting Cairn on the canvas
focuses Chat. Selecting an agent or thread opens its detail within the canvas
side, not on top of the transcript or composer.

### Owner approval

Approved. This section fixes chat in the middle pane, the canvas on the right,
resizing behavior, and the narrow-width fallback for implementation scoping.

## Implementation boundaries

The implementation plan should be divided into small serial tasks. At minimum,
scope these independently:

1. Workspace shell and responsive rail/chat/canvas split.
2. Multi-project rail state, task summaries, and safe project switching.
3. Canvas state model and accessible entity/relationship interactions.
4. Bounded force layout, position persistence, and reduced-motion behavior.
5. Live task/conductor state projection, agent overflow, and cross-project
   activity badges.
6. End-to-end verification of storage isolation, per-project serialization,
   switching during active work, keyboard access, and narrow-width behavior.

Implementation must preserve the existing approval gates, provider consent,
project record ownership, credential handling, and serial-task safety. This
design does not authorize new dependencies, model calls, external writes,
deployment, or multi-agent concurrency within a project.

## Acceptance anchors for the implementation plan

The plan is ready when every task names the visible slice it delivers, the
existing behavior it must preserve, and a check tied to one of these anchors:

- the rail order and collapse rules are observable with multiple projects;
- Cairn stays central while up to eight real agent states remain legible;
- clicks and keyboard actions reveal real state without dispatching work;
- switching projects never mixes records, chat, agents, or task state;
- a running project remains visible and intact while another is viewed;
- chat and canvas remain usable in desktop and narrow layouts; and
- no visual state overclaims concurrency, completion, or authorization.
