# Task 171 brief — The conversation panel and the visual language: Lantern on Water

**Lane:** A (main checkout)
**Base commit:** 0db4a0c

## Requested visible outcome

The conversation stops being a large bright white rectangle over the town and
becomes what the owner approved: a warm, softly lit lantern resting on dark
water, with the light spilling out of it onto the pond instead of covering the
pond. The cast and the water wear the owner's muted pastels — Cairn `#a3ddd0`,
Kimi `#d5c0ec`, Codex `#f3c49a`, Claude `#b8c9de`, done `#c2ddb6`, stopped
`#f2aaa4`, work in transit `#f7d3a8`. At rest the pond is one continuous blend
with no rings drawn on it at all: a ripple appears only because something
really happened, in the receiver's own colour, and then it is gone. Buttons
become chunky pills that compress when pressed, suggestions arrive one after
another and slide under the pointer, the characters spring when touched, and
the town's own labels stop being monospaced HUD readouts. And at a small
window the pond is never shrunk to fit: the conversation takes the window, a
line at the top says who is working and turns amber when a decision is waiting,
and pressing it opens the pond whole — *"a line is honest because it is a line;
a small pond is dishonest because it pretends to be a picture."*

## Boundary of intent — what must not change

- **Face geometry.** Every path stays verbatim from
  `app/src/renderer/town/faces.ts`. The approved mockups matched 20 of 20; a
  test now pins that and must stay green through every later task.
- **Who decides that an event happened.** `app/src/renderer/town/presentation.ts`
  remains the only arbiter. No second notion of when something occurred, in CSS
  or anywhere else.
- **What earns a DONE.** Git remains the ledger, the claim/verified split stays
  load-bearing, and every risk boundary keeps its pause. Decision 9's release of
  visual preservation covers appearance only.
- **Dependencies.** Nothing is added to any `package.json`.
- **Breakpoints.** Only the existing 1260px and 620px. Every failed direction
  invented its own.
- **Above 1260px.** The approved wide layout is untouched by the narrow work.
- **Invented colours.** None. Every value is one of the seven approved colours,
  a value verbatim from an approved mockup, or a `color-mix` of those. The one
  exception is the ERROR chip's ink `#4a201c`, labelled in the plan.
- **Reduced motion.** `prefers-reduced-motion` reaches the same final state, with
  no ripple or packet animation pending.

## Plan (AI decision)

Executed from
`docs/superpowers/plans/2026-08-03-cairn-conversation-panel-and-visual-language.md`
(plan 2 of 4 from the `2026-08-02-cairn-showing-not-asking-design.md` spec,
covering Decision 9). Seven tasks, each with its own test cycle and commit:

1. Pin the approved mockups' face geometry against `faces.ts`.
2. The pastel palette onto the token names the cast already reads.
3. Still water — delete the three permanently drawn contour rings; the outcome
   tint moves from a coloured rim to a wash in the water.
4. The lantern — the panel's own surface, re-pointing the app's paired tokens
   inside its scope so its descendants re-tone through the cascade.
5. The furniture — monospaced HUD labels, uppercase readouts, dashed threads,
   and the hairline ring under each character all go.
6. The New Horizons treatment — pills with a solid lower edge, overshoot
   easing, staggered suggestions, springing characters, heavier type.
7. The narrow window — a status line plus a whole-pond toggle below 1260px.

Owner decisions taken before execution: work stays on `main` as in every prior
phase, and the plan's seven regression-guard tests (which pass the moment they
are written) are kept, with the plan's reasons recorded at each one.

## Checks that will show the outcome holds

1. `cd app && npm.cmd run typecheck` — exit 0, no output.
2. `cd app && npm.cmd run test:unit` — all pass, including the face-geometry,
   palette, still-water, lantern, furniture, New Horizons, and pond-line tests.
3. `cd app && npm.cmd run build:vite` — builds clean.
4. `cd app && npm.cmd run build:lab` — builds clean.
5. `cd core && npm test` — all pass (this task touches no core file; a green
   core is what proves that).
6. `cd app && npm.cmd run test:smoke` — the three proven pre-existing failures
   and no others, holding the `%TEMP%\cairn-app-token` mutex for the whole run.
7. Looked at by eye, on the owner's screen: the pond at rest with no ring of any
   kind, the narrow window closed and opened, and both under
   `prefers-reduced-motion`.

## DONE and STOPPED

- **DONE**: the seven tasks are committed, checks 1–6 hold, and captures of the
  wide layout and both narrow states are in front of the owner. Decision 9 is a
  taste decision; the tests only prove it was implemented as written.
- **STOPPED**: any check fails and the cause is not one of the three proven
  pre-existing Playwright failures. The report names which task last committed
  cleanly, so the safe state is that commit.
