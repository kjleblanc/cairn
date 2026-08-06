# Task 192 — paper question annotation

**Lane:** E

**Base commit:** `fe3c8ee61b772f7325f56d66da61ebd4409aedfe`

**Synced main base:** `18a7a6e968e919783e824a7b44c1eb5daf6388bb`

## Visible outcome

When Cairn needs one answer before it can shape the work, the structured
question reads as a restrained annotation in the same paper conversation—not
a floating rounded form card. The question leads beside one short cyan
registration rule. Beneath it, the native labelled answer input, Answer, and
“I'm not sure — you decide” form one shallow response field instead of two
separate rows of glossy controls.

The surface uses the approved faded dusk paper language: slight grain and
translucency, controlled 4–8px corners, quiet rules, sparing pastel cyan, flat
text-like actions, and no glass edge, shadow, 22px card radius, inflated pill,
scribble, faux handwriting, halo, or decorative travel. The automatically
focused question heading uses a paper underline rather than a boxed false
action. The real input and actions retain stronger visible keyboard focus.

At compact width, a long question, a 300-character answer, and both response
paths wrap inside the lantern without horizontal travel or tiny targets.
Disabled, busy, and submitting states remain visually and semantically clear.

## Boundary of intent

- This is the inline `QuestionCard` presentation slice only. Main-issued action
  identity, current-only rendering, persistence, answer/defer authentication,
  reply construction, retirement, retry, and error behavior stay exact.
- Preserve the raw answer string byte-for-byte. `trim()` may continue to decide
  whether Answer is enabled, but it must never transform the submitted value.
- Preserve the native label/input association, text input, whitespace-only
  disabled Answer, Enter-to-answer, IME composition guard, single submission,
  exact “I'm not sure — you decide” text, and `kind: defer` reply.
- While busy or submitting, the input, Answer, and defer action remain disabled.
  Answer stays before defer in keyboard order. Enter, Space, mouse, and focus
  semantics remain native.
- Preserve the proposal-replacement focus lifecycle: the question `h2` remains
  programmatically focusable through the existing ref, and settled replies
  continue to receive the existing deliberate focus.
- Presentation-only grouping may move the defer row inside the answer field and
  add stable class hooks. Do not change callbacks, state, action IDs, IPC,
  shared `Pill` behavior, or global card/input styling.
- Scope the visual treatment to `.chat-column-villager .question-card`. Do not
  redesign proposals, dispatch, results, run thread, connection setup, push
  confirmation, composer, outer lantern, TaskRun, rail, pond, faces, or Town.
- Add no dependency, asset, breakpoint, keyframe, handwriting, or scribble.
- No Core/CLI/phone source, credential, real provider call, worker call, push,
  publish, deployment, production system, or production data.
- Main's stopped Task 180/183 work, Lane C's Task 190, and dormant lanes are
  protected. This task writes and commits only inside Lane E and does not land
  while main is dirty.

## Checks

1. Add a red-first renderer contract for one flat paper question surface,
   integrated response field, raw-answer/native-control semantics, deliberate
   heading and action focus, disabled states, compact wrapping, and no motion.
2. Run focused question/conversation/evidence renderer tests, the full App unit
   suite, typecheck, and both production builds.
3. With the owner's app closed and both app-token locks atomically held, use
   only Cairn's scripted loopback fake conductor. Exercise a current question,
   blank/whitespace/filled answers, keyboard order, Enter submission, raw bytes,
   busy/submitting locks, defer, retirement, reload/persistence, compact
   containment, and reduced motion. No worker or external service may run.
4. Capture and inspect compact blank, filled/focused, and pending question
   states in context with the conversation paper, then ask the owner for the
   remaining taste judgment.
5. Run `git diff --check`, inspect the exact diff and final Git status, and
   confirm main's protected work and every other lane remain unchanged.

## DONE / STOPPED

**DONE** means the structured question visibly belongs to the paper
conversation instead of reading as a glass form card; raw answer and defer
truth, native semantics, main-owned authority, focus, disabled states, compact
containment, and reduced-motion guarantees still hold; all mechanical checks
pass; the owner confirms the visual direction; and only isolated Task 192 paths
are committed in Lane E.

**STOPPED** means the design hides or transforms the question/answer, weakens
main-owned action authority, changes answer/defer behavior, permits duplicate
submission, loses native label/IME/keyboard/focus/disabled semantics, clips
compact content, changes a shared surface, a required check cannot be repaired
in scope, protected work changes, or the owner does not confirm the result.
