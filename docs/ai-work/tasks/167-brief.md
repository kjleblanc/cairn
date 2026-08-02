# Task 167 — a taste-driven Cairn ease-of-use mockup

Lane: **Standard (main checkout)**

Base commit: `d69966cb3fa6839655dbf552ad31d481b11f6222`

## Requested visible outcome

The owner can inspect and interact with one coherent desktop mockup of Cairn
that makes the beginner journey legible: describe a rough goal, let Cairn
organize it, see useful pushback, approve a clearly bounded dispatch, follow
honest activity, and read a verified result. The visual direction should feel
warm, tactile, and alive while using a nocturnal, luminous cybernetic palette.
It must be Cairn's own visual language rather than a copy of another product or
fictional property.

The mockup should express one AI's taste as a concrete proposal the owner can
judge, not silently replace the already approved product design.

## Boundary of intent

- This is an interactive design mockup and ease-of-use pass, not an app rewrite.
  Do not change application behavior, source, stored data, approvals, provider
  access, dependencies, security posture, or the milestone.
- Preserve the approved rail / conversation / functional town-square structure
  and Cairn's honest request → pushback → dispatch → verified result workflow.
- Use only fictional local sample content. Do not open the owner's app profile,
  use credentials, call a real model, send data externally, or make paid calls.
- Create the conversation preview in this thread's assigned visualization
  workspace. Inside the repository, touch only this task's records and LOG row.
- Motion must communicate real state, respect reduced-motion preferences, and
  never imply progress or authorization that has not happened.
- The visual references are principles—friendliness, tactility, luminous
  cybernetics—not copied characters, art, layouts, or branding.

## Checks that will show the outcome holds

- The first view is a useful full desktop workspace with realistic Cairn
  content, not an invented metrics dashboard.
- One native step control moves through the complete beginner journey and each
  step updates the proposal/approval/activity/result surface plus the town's
  honest state.
- The layout remains readable at the normal conversation width and down to
  320px without clipped text, controls, or horizontal scrolling.
- Every control is keyboard reachable, statuses use words as well as color and
  motion, and `prefers-reduced-motion` has an explicit fallback.
- The fragment contains no network calls, loads no unapproved resources, has no
  undefined JavaScript identifiers, and its primary interaction works in a
  rendered local preview.
- Run the visualization renderer, inspect a browser capture at desktop and
  narrow widths, run `git diff --check`, inspect the real diff, and confirm Git
  contains only Task 167's record paths before the final exact-path commit.

## DONE and STOPPED

**DONE** means the owner receives the interactive mockup in this conversation,
the whole task flow is explorable and locally verified, the visual and
ease-of-use rationale is recorded honestly, one LOG row is appended, and the
task records land in one exact-path local commit.

**STOPPED** means the mockup cannot be rendered safely in the assigned local
workspace, its interaction or responsive layout cannot be verified, protected
work changes unexpectedly, or continuing would cross a concrete risk boundary.
