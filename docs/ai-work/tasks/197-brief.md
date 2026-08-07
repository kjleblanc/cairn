# Task 197 brief — one continuous space

**Lane:** F (worktree `.lanes/d`, branch `lane/f`)

**Base commit:** `be4b7ef5dce965cde252f15b096fab69ef09a595` — main immediately
after Task 196's transport seam landed.

**Lane note.** Lane F reuses the idle `.lanes/d` worktree on a new branch off
main, by owner decision. Branch `lane/d` is untouched at `59cfb4e` and still
carries Task 163's two commits. No dependency install was needed: the only
`package.json` difference between `lane/d` and main was a `0.6.0 → 0.7.0`
version bump. Main was deliberately left free so the concurrent conversation
could land its own Task 196, which it did.

## Requested visible outcome

The workspace reads as **one continuous space** rather than a card sitting on a
background. Three things change together, and are judged together:

1. **The conversation surface stops being a slab.** It keeps a readable paper
   fill but loses its outline and its drop shadow, and its edge thins out over
   roughly 36px on every side so the surface never hard-stops. The pond behind
   it — light, haze, grain — reads through it.
2. **The pond gains a light source.** A cool key light on Cairn's side, a warm
   counter-light low on the opposite side, and a deep vignette, so the space has
   a direction light comes from instead of being one flat gradient.
3. **The paper grain becomes perceptible.** Not louder — correctly blended. The
   existing grain is invisible because `soft-light` crushes mid-grey noise
   against a dark ground, not because its opacity is too low.

The owner approved this direction on two rendered boards on 2026-08-06:
surface = "C's feathered edge with B's fill"; depth = "3 — a light source";
grain = "restrained — .30 at overlay".

## Boundary of intent — what must not change

- **Still water (Decision 9, rule 4).** No drawn contour rings, marks, or
  outlines return to the pond. All added depth is continuous fields only —
  haze, light falloff, vignette, grain. A ripple still lands only when an
  event does.
- **No new palette.** Every value derives from the approved garden and lantern
  tokens. No new hue is invented.
- **The approved paper surfaces stay as they are.** Flat ruled checkpoints,
  receipts, questions, publication controls, and follow-up notes (Tasks
  186–194) are not redesigned. Only the surface *under* them and the field
  *behind* them change.
- **No circular avatar borders**, and no change to Cairn's character or to any
  motion. Cairn's hand-drawn presence and the interaction feel are deliberately
  Tasks B and C, not this one.
- **The lantern's existing structural contracts hold**: the `--card`,
  `--card-solid`, `--card-ink`, `--card-muted` and `--line` re-pointing; no
  villager tail; the `villager-rise` entrance; no infinite animation; and
  reduced motion still *winning* on the `(0,2,0)` selector rather than merely
  naming it.
- **Environment tokens stay global**, because the lab renders TownSquare
  standalone outside `.workspace-shell`.
- No component/TSX behavior change, no new dependency, no `app.css`
  restructure, no contract change, no credential, no provider call.

### One contract deliberately changes

`tests-unit/lantern.test.ts`'s *"one soft light spill lifts the paper without a
stacked halo"* asserts the lantern's `box-shadow` carries exactly two `rgb()`
values — one warm spill and one quiet drop. **Removing that drop shadow is the
point of this task**: the drop is what makes the surface read as floating above
the pond. The contract becomes "one spill, no drop." The test is rewritten
red-first and the reason recorded in the report. Nothing else in that file
changes.

## Checks that will show the outcome holds

1. `npm.cmd run typecheck` — clean.
2. `npm.cmd run test:unit` — full App suite green, including new red-first unit
   contracts for the feathered surface, the light-source field, the grain blend
   mode, and the no-`backdrop-filter` fallback.
3. `npm.cmd run build:vite` and `npm.cmd run build:lab` — both pass.
4. **A new measured-contrast check.** Today the panel is ~90% opaque so text
   contrast is effectively fixed; at a translucent fill over a *lit, varying*
   field the background decides it. There is no contrast guard anywhere in the
   suite today, and this project has already shipped a 2.84:1 failure against a
   4.5:1 floor once. The check renders the real app, samples the **actual
   composited pixels** behind lantern text at the worst case — the brightest
   part of the key light — computes WCAG contrast, and fails under 4.5:1 for
   body text and 3:1 for large text.
   **The final fill alpha is whatever this check permits, not what looked good
   on the board.**
5. A guarded fake-only Electron journey with both app-token locations held, no
   real provider, producing wide and compact screenshots for the owner.

### Precondition the owner confirms immediately before check 5

No other Cairn or Electron window is running and neither app-token location is
held. The AI never closes the owner's applications itself.

## What DONE and STOPPED mean here

**DONE** — all five checks pass in this worktree, the measured contrast floor
holds at the shipped fill value, every boundary above is intact, and the owner
has looked at the screenshots and confirmed the space reads as continuous.
This task carries a required human taste judgment, so DONE cannot be claimed
without it.

**STOPPED** — the contrast floor cannot be met at any fill that still reads as
blended (meaning the approved direction and legibility genuinely conflict, and
the owner must choose), or a boundary above would have to move to finish.
