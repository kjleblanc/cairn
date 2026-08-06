# Task 186 — quiet paper field

**Lane:** E

**Base commit:** `43519bf`

## Visible outcome

Cairn's real desktop workspace takes the restrained direction approved after
the visual studies. The project rail starts tucked at the side instead of
claiming a full panel; the current-project context, conversation lantern, and
composer feel like parts of one faded paper-and-light environment rather than
glassy operating-system chrome. A very quiet grain gives the dusk and paper
surfaces texture, while borders stay controlled and sparse instead of
scribbled.

The existing cast faces keep their readable three-stroke identities and never
gain a circular frame. Their extra flair comes from an offset pastel wash and
small signal accent behind the drawing, not from more marks on the face.
**Talk with Cairn**, **New**, and **Send** remain inside the same composer field,
with flatter, less chunky controls.

## Boundary of intent

- This is a renderer presentation pass. Project selection, rail expansion,
  conversation, draft, send, new-conversation, keyboard, focus, task-card,
  dispatch, provider, worker, queue, retry, and result behavior stay exact.
- The approved cast path data and face-state semantics do not change. No face
  outline, circular badge, new avatar asset, or decorative scribble is added.
- Existing responsive behavior remains: the conversation is the narrow-window
  default, the full pond remains available, and every control keeps an
  unmistakable keyboard focus state and reduced-motion outcome.
- No dependency, Core/CLI/phone source, stored data, credential, real provider
  call, worker call, push, publish, deployment, or production-data change.
- The stopped Task 180/183 work in the main checkout is protected. This task
  writes and commits only inside Lane E and does not land while `main` is dirty.

## Checks

1. Add a red-first renderer contract for the tucked initial rail, restrained
   workspace controls, shared grain, controlled edges, and unframed face wash.
2. Run the focused renderer tests, the full App unit suite, typecheck, and both
   production builds.
3. With the owner's app closed and both app-token locks held, use Cairn's
   scripted local fixture only to capture the real workspace at wide and
   compact widths and verify the composer/rail interactions and keyboard focus.
4. Inspect both captures for a quieter paper field with no scribbly edge or
   emoji-like face frame, then ask the owner for the remaining taste judgment.
5. Run `git diff --check`, inspect the exact diff and final Git status, and
   confirm the main checkout's protected work has not changed.

## DONE / STOPPED

**DONE** means the real app visibly opens with the rail tucked, the shared
paper texture and flatter controls hold at wide and compact widths, the face
remains unframed and readable, the unified composer and all existing behavior
stay intact, every mechanical check passes, the owner confirms the visual
direction, and only isolated Task 186 paths are committed in Lane E.

**STOPPED** means the app still reads as glassy chrome, the treatment becomes
scribbly or emoji-like, any behavior/accessibility/responsive contract changes,
a required check cannot be repaired in scope, protected work changes, or the
owner does not confirm the visual result.
