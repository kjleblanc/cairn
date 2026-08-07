# Cairn — one continuous space (Task 197 design)

**Date:** 2026-08-06
**Lane:** F (`.lanes/d` worktree, branch `lane/f`)
**Base:** main at `be4b7ef5dce965cde252f15b096fab69ef09a595`
**Status:** owner-approved direction, ready to implement

This is the first of three tasks closing the visual overhaul. It covers the
*space*. Cairn's hand-drawn presence and the Animal Crossing interaction feel
are deliberately separate tasks, judged inside the space this one builds.

## The gap

The workspace reads as a card on a background, not as one place.

Three specific causes, each verified against the running app on 2026-08-06:

1. **The conversation surface is a slab.** `app.css` gives it a 1px outline, a
   `0 20px 48px rgb(0 0 0 / 30%)` drop shadow, and a fill mixed at 92/89/87%
   opacity. At that opacity nothing behind it reads through, and the drop
   shadow explicitly places it *above* the pond rather than in it.
2. **The field is one flat gradient.** `linear-gradient(160deg, --garden-ink,
   --garden-deep)` plus two faint glows. There is no direction light comes
   from, so there is no near and no far.
3. **The paper grain is invisible.** Not because `.10` is too low — because
   `background-blend-mode: soft-light` crushes mid-grey noise against a dark
   ground. The fibre is being drawn and then cancelled.

Cause 3 is a defect, not a taste question. Causes 1 and 2 were put to the owner
on two rendered boards and decided.

## Owner decisions (2026-08-06)

| Question | Decision |
|---|---|
| How far does the surface dissolve? | **C's feathered edge with B's fill** — the ~45% translucent fill, but with no border at all and an edge that thins out rather than stopping |
| How deep is the field? | **A light source** — cool key, warm counter, deep vignette |
| How much paper? | **Restrained — `.30` at `overlay`** |

## Design

### 1 · The field

`.workspace-shell` gains four continuous layers above its existing gradient.
All are continuous fields; **nothing is drawn**. Still water (Decision 9,
rule 4) forbids contour rings and marks, and this design adds none — a ripple
still lands only when an event does.

- **Key light** — cool, upper-left, on Cairn's side of the pond.
- **Counter-light** — warm, low on the opposite side.
- **Haze** — a cool wash falling off from the top, giving a horizon.
- **Vignette** — corners fall away, giving a floor and edges.

Placing the key on Cairn's side has a useful second effect: the conversation
surface sits on the *right*, inside the falloff, so the brightest part of the
field is not behind the text. That helps the contrast floor below rather than
fighting it.

### 2 · The surface

`.chat-column.chat-column-villager` loses its border and its drop shadow, and
keeps one widened warm spill. The fill, grain, blur and feather move to a
`::before` layer so **the mask never touches text**.

The rule itself continues to source the lantern tokens — it declares the
surface's own custom properties from `--lantern-paper-lit` and
`--lantern-paper`, and the pseudo-element consumes them. This is not a trick to
satisfy a test: the lantern's paper is still defined by the lantern's own
palette, in the lantern's own rule. Only the painting moves.

The feather is a two-axis mask composited with `mask-composite: intersect`, so
all four edges thin out over `--surface-feather` (36px) and the surface never
hard-stops.

### 3 · The grain

The fibre keeps its shape and rises modestly to `.30`, but the real fix is
`background-blend-mode: overlay` in place of `soft-light`. Overlay pushes noise
both lighter and darker around the mid-point, so it survives against a dark
ground where soft-light does not.

## The contrast guarantee

This is the part that must not be got wrong.

Today the surface is ~90% opaque, so text contrast is effectively fixed and no
guard is needed. At a translucent fill over a *lit, varying* field, the
background behind the glyphs decides the contrast — and it now varies by
position. There is **no contrast check anywhere in the suite today**, and this
project has already shipped a surface measuring 2.84:1 against a 4.5:1 floor
(found in Task 171's whole-branch review, not by any per-task check).

So Task 197 adds one, and it measures rather than reasons:

1. Drive the real app to a conversation containing lantern body text.
2. For each sampled element, read its `color` via `getComputedStyle`.
3. Capture the **actual composited pixels** for that element's bounding box
   using Electron's `webContents.capturePage(rect)`, then `NativeImage.getBitmap()`
   for raw pixel data. This needs **no new dependency** — it is Electron's own
   API, reached through `electronApp.evaluate`.
4. Average the captured region to get the effective background, compute WCAG
   relative luminance for both, and assert the ratio.
5. Floors: **4.5:1 for body text, 3:1 for large text.**
6. Sample the worst case deliberately — the position where the key light puts
   the most light behind the surface — not a convenient one.

**The shipped fill alpha is whatever this check permits.** The board's ~45% is
a starting point, not a commitment. If it fails, the alpha rises until it
passes and the owner sees the result.

### Why measured and not computed

The composite is `field gradient → backdrop blur → translucent fill → grain at
overlay`. Reproducing that stack arithmetically in a unit test would be a
second implementation of the browser's compositor, and would drift from it
silently. Sampling the real pixels cannot drift.

## The fallback

With `backdrop-filter` unavailable — GPU disabled, software rendering, or a
future Electron flag — a 45% fill over a lit field is unreadable, and the
feather makes it worse by thinning the fill exactly where it meets the
brightest part of the field.

`@supports not (backdrop-filter: blur(1px))` restores today's opacity and a
hairline border, and drops the feather. It fails **closed to legible**.

## Contracts

### Preserved unchanged

- Still water: no drawn rings or marks; depth is continuous fields only.
- No new palette: every value derives from approved garden and lantern tokens.
- Tasks 186–194's paper surfaces — checkpoints, receipts, questions,
  publication controls, follow-up notes — are not redesigned.
- The lantern's `--card`, `--card-solid`, `--card-ink`, `--card-muted` and
  `--line` re-pointing.
- No villager tail; the `villager-rise` entrance; no infinite animation.
- Reduced motion still **wins** on the `(0,2,0)` selector rather than merely
  naming it.
- Environment tokens stay global, because the lab renders TownSquare standalone
  outside `.workspace-shell`.
- No component behavior change, no new dependency, no `app.css` restructure.

### Deliberately changed — one

`tests-unit/lantern.test.ts`, *"one soft light spill lifts the paper without a
stacked halo"*, asserts the `box-shadow` carries exactly two `rgb()` values: a
warm spill and a quiet drop.

**Removing the drop is the point of this task.** A drop shadow is the single
strongest signal that a surface floats above what is behind it; keeping it
would preserve the slab reading the owner asked to close. The contract becomes
*one spill, no drop*: still exactly one `rgb()`, still the mockup's lantern
gold `247 211 168`, still no glassy hairline halo. The test is rewritten
red-first, and the report records why.

## Out of scope

- **Task B** — Cairn's hand-drawn anime presence, line weight and scale.
- **Task C** — the Animal Crossing interaction feel: response, settle,
  acknowledgement, and the rule that buttons never become chunky toys.
- Anything touching the conductor, dispatch, approval, or provider surfaces.

## Checks

1. `npm.cmd run typecheck`.
2. `npm.cmd run test:unit` — full App suite, plus new red-first contracts for
   the feathered surface, the field layers, the grain blend mode, and the
   fallback branch.
3. `npm.cmd run build:vite` and `npm.cmd run build:lab`.
4. The measured-contrast check above.
5. A guarded fake-only Electron journey, both app-token locations held, no real
   provider, producing wide and compact screenshots for the owner's judgment.

The owner's taste judgment is required for DONE; this task cannot claim it from
automated checks alone.
