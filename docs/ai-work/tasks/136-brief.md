# Task 136 brief: chat-in-scene mockup — the conversation lives in the world

**Lane:** A (main checkout)

## Requested visible outcome

The owner approved mocking up the next unification slice before it touches
the real shell: **chat becomes a villager conversation** — the conversation
lives *in* the scene, anchored to Cairn, expanding over the world while the
owner talks and tucking back to a small presence when done — instead of a
pane that splits the screen with the town (or a tab that hides it).

The deliverable is a **lab-only mockup page** presenting the same living
town scene under two or three distinct chat treatments, each shown in both
expanded and tucked states, captured onto the Review shots page
(`/shots.html`) for the owner to judge feel from screenshots. Nothing
shipped changes; this is a taste exploration exactly like the lookboard was.

## Boundary of intent

- **Lab-only.** New `lab/chatmock.html` + script + styles, one more
  `build:lab` rollup input, untracked shots content. No renderer, main, or
  IPC changes; the real chat stays exactly as it is.
- **Reuse, don't fork:** the mock renders the real `TownSquare` against the
  lab's mock bridge so the world the treatments float over is the true one.
- Treatments are prototypes built in the mock file itself — throwaway by
  design; whichever the owner picks gets rebuilt properly in the shell as a
  later task.
- AI decision (recorded per v0.5.0): the mock page is plain React like its
  lab siblings, with a variant switcher so one page carries all treatments.
- The other lane's work is never staged or touched.

## Checks (exact commands; outputs cited in the report)

- `cd app && npm.cmd run typecheck` — green.
- `cd app && npm.cmd run build:lab` — green, emits the new page.
- `cd app && npm.cmd run lab` (temporary, then stopped): `curl` HTTP 200 for
  the mock page path.
- Isolated Electron captures (temporary harness, deleted after): each
  treatment, expanded and tucked, inspected by me; the settled set copied to
  `app/shots/` with a manifest entry, and the page re-verified by curl.

## DONE / STOPPED

- **DONE:** the shots page shows a Task 136 entry with clear, labeled
  treatments and states; checks green; commit contains only the lab page,
  config input, and records.
- **STOPPED:** the real town cannot be reused in the mock without forking
  shipped code, or captures cannot be produced.
