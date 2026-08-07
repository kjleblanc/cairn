# Task 197 report — one continuous space

**Lane:** F (worktree `.lanes/d`, branch `lane/f`)

**Base commit:** `be4b7ef5dce965cde252f15b096fab69ef09a595`

**Brief commit:** `b47f94d`

**Milestone moved:** NO

## Outcome

The workspace reads as one continuous space instead of a card on a background.
The owner confirmed it on 2026-08-06, looking at the wide capture: *"it does."*

Three things changed together:

1. **The conversation surface stopped being a slab.** Its outline and drop
   shadow are gone, and its edge thins out over 36px on every side, so it never
   stops anywhere. The pond — light, haze, fibre — reads through it.
2. **The field gained a direction light comes from**: a cool key on Cairn's
   side, a warm counter low on the opposite side, haze from the top, and a
   vignette. Continuous fields only; still water is intact.
3. **The paper grain became perceptible.** The fibre was never too faint — it
   was cancelled. `soft-light` leaves a mid-grey unchanged against any base, so
   noise centred on mid-grey was drawn and then erased against the dark ground.

## What actually changed

- `app/src/renderer/tokens.css` — `--paper-grain` raised .10 → .30 (owner's
  "restrained"); new `--field-key`, `--field-counter`, `--field-haze`,
  `--field-vignette`, all mixed from approved garden/lantern tokens with no new
  hue; new `--surface-feather` and the three `--surface-alpha-*` values.
- `app/src/renderer/app.css` — `.workspace-shell` gains the four field layers
  and blends the fibre with `overlay`; `.chat-column.chat-column-villager`
  loses its border and drop shadow, keeps one widened warm spill, and declares
  the surface colours; the new `.chat-column.chat-column-villager::after`
  paints and feathers them; a `@supports not (backdrop-filter: blur(1px))`
  fallback; `--inner-card-fill`/`--inner-card-tint`; and the contrast repairs
  described below.
- `app/tests-unit/continuousspace.test.ts` — **new**, 12 red-first contracts.
- `app/tests-unit/lantern.test.ts` — the one contract the brief declared would
  change (below).
- `app/tests-unit/papersignal.test.ts` — the shared-grain contract, widened
  (below).
- `app/tests/contrast.spec.ts` — **new**, the measured-contrast check.
- Records: `docs/ai-work/tasks/197-brief.md`,
  `docs/superpowers/specs/2026-08-06-cairn-continuous-space-design.md`, this
  report, and one `docs/ai-work/LOG.md` row.

### Scope widened once, with the owner's approval

The first render showed that blending the outer surface had **exposed the inner
cards**: Tasks 188/191 gave the receipt and checkpoint a 3% cream wash that was
invisible against ~90% opaque paper but read as a hard-edged lighter block once
the surface became translucent. The owner approved widening Task 197 to cover
them. The wash goes to transparent and the tint drops; the 2px rule down each
card's left edge and its spacing already identify it, which is what "flat ruled
paper" meant. The `@supports` fallback restores both the wash and the opaque
surface together, because this is a relationship between the two rather than a
new opinion about the cards.

### Two existing contracts changed

1. **Declared in the brief.** `lantern.test.ts`'s *"one soft light spill lifts
   the paper without a stacked halo"* required exactly two `rgb()` values in
   the surface's `box-shadow` — a warm spill and a quiet drop. Task 197 retires
   the drop: a drop shadow is the strongest signal that a surface floats above
   what is behind it, and with the outline gone it was the last thing holding
   the slab reading. The contract is now one spill, no drop.
2. **Not declared, disclosed here.** `papersignal.test.ts`'s *"one static paper
   grain belongs to the field, shelf, lantern, and composer"* looked for the
   texture in the surface's own rule; the paint moved to `::after`. It now
   checks the surface **and** its skin, and additionally asserts that a second
   texture token can never appear. Widened, not relaxed — it still fails if a
   surface stops sharing the one texture. An earlier attempt that introduced a
   second `--paper-fibre` token was abandoned for exactly that reason.

### The contrast work, which changed the answer

The brief required a measured-contrast check because translucency makes the
background behind the glyphs vary. On its first run it found **six failures**,
and a real A/B on this branch with the pre-Task-197 values restored proved five
of them older than Task 197:

- *"Cairn's starting recommendation"* used `--green-deep`, a `light-dark()`
  pair, which on permanently dark paper resolved to the **light theme's**
  `#3f5c31` — dark green on dark, **1.14:1**. The same class of bug Task 171's
  whole-branch review found once already.
- Four `--lantern-soft` muted body-text elements measured **4.21–4.48:1**.

The sixth was a fault in the check, not the app: it sampled a container whose
box is mostly covered by a child pill painting its own background, comparing
the parent's ink against the child's fill. Such containers are now skipped and
their children measured instead.

The owner chose to fix all of them rather than log them. The lantern now
re-points the dark-side green exactly as it already did for `--stop`;
`--green-soft` drops 12% → 5% because that wash sits *under* the green ink and
a lighter wash costs contrast (12% gave the Recommended tag 4.05:1, 5% gives
4.62:1); and `--lantern-soft` is lifted to `#d8cabd` **inside the lantern
only**, because the shelf and town square use it over different material.

This mattered for the shipped look. Before the repairs, the only way to avoid a
new failure was to raise the surface to 68/60/52 — visibly more opaque than the
board the owner approved. After them, the surface keeps the chosen **52/42/34**
and every element still clears the floor. The contrast was never really the
translucency's fault.

## Checks run and real results

All output was observed in Lane F's terminal and is not saved in the repository.

1. `npm.cmd run typecheck` — passed, no TypeScript errors.
2. `npm.cmd run test:unit` — **480 total, 478 passed, 0 failed, 2 Windows
   host-specific skips.** The 12 new contracts were run red first: 8 of 12
   failed before implementation, and the 4 that passed were the "must not
   change" guards, which is what they are for.
3. `npm.cmd run build:vite` — passed: main 64 modules, preload 1, renderer 73.
4. `npm.cmd run build:lab` — passed: 96 modules.
5. `.\node_modules\.bin\playwright.cmd test tests/contrast.spec.ts` with
   `CAIRN_TEST_LANE=1`, both `.lanes/d/app/.app-token` and
   `%TEMP%/cairn-app-token` held atomically, no Cairn or Electron process
   running first — **1 passed, 15 elements measured, worst 4.62:1 against a
   4.5:1 floor**, with the pre-existing allowlist empty. No real provider,
   model, worker, network remote, public write, or non-test project was
   contacted.
6. A/B control run: the same check with the pre-Task-197 values temporarily
   restored in this worktree, then restored again — **6 failures**, which is
   how the five pre-existing defects were proven pre-existing rather than
   assumed to be.
7. `git diff --check` and exact-path status inspection — clean. One repair
   disclosed: an early scripted edit rewrote `app.css` with CRLF endings, which
   broke a test slicing a multi-line selector; the file was rewritten to LF and
   `git diff --check` confirms no line-ending damage remains.

## Visual evidence

Captured from the visual lab's `done` scenario through an off-display Electron
window (Task 154's convention), outside the repository:

- `C:\cairn-board\t197-compare.png` — before/after at 1320×980 from main and
  from lane/f, with the surface's lower-left corner at 2×.
- `C:\cairn-board\t197-approved.png` — 1320×980, the shipped values.
- `C:\cairn-board\t197-compact.png` — 540×900; the narrow layout holds, text
  wraps, nothing clips, and the feather still reads.

## How to try it

```powershell
cd "C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework\.lanes\d\app"
npm.cmd run build:vite
npm.cmd start
```

Close any other Cairn window first. For the visual lab instead:
`npm.cmd run lab`, then pick the "DONE card" scenario.

## Limitations and remaining human judgment

- The captures come from the visual lab, which renders the real renderer and
  the real stylesheet against mock data. The contrast check drives the real
  Electron app.
- The inner receipt block still reads as a slightly lighter panel than its
  surroundings even with its fill transparent. It is softer than before and the
  owner accepted the result, but what remains painting it was not chased down.
- `--lantern-soft` was lifted inside the lantern only. The shelf, composer and
  town square still use the original value over their own material; whether
  they need the same lift was not measured and is not this task's claim.
- Tasks B (Cairn's hand-drawn presence) and C (the Animal Crossing interaction
  feel) remain, and are judged inside this space.
- Task 197 is complete in Lane F and **not landed on main**. Landing is a
  separate owner decision, because a concurrent conversation is also writing
  main.

The owner supplied the required taste judgment.

Disposition: **DONE**
