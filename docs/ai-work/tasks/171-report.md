# Task 171 report — The conversation panel and the visual language: Lantern on Water

**Disposition: DONE**

## What you will see

The conversation is no longer a big bright rectangle sitting on top of the town.
It is a warm, softly lit panel — the lantern — resting on dark water, with its
light spilling outward instead of covering the scene. The water underneath is
one smooth blend now: the three faint rings that used to be drawn on it
permanently are gone, and a ring appears only because something really happened,
in the colour of whoever received it.

The cast wears the muted pastels you chose. Buttons became chunky pills that
press down under your finger and sit back up. Suggestion chips arrive one after
another and slide when you point at them. The characters give a small squash
when you touch them. All the small machine-looking type, the shouty uppercase
readouts, and the dashed "data" lines around the town are gone — the faces carry
the identity, and everything around them went warm and rounded.

Make the window narrow and the town collapses to a single sentence at the top
that says who is working, turning amber when a decision is waiting for you.
Press it and the pond opens **whole**, over the window; one button brings the
conversation back. The pond is never shrunk to fit beside anything.

## What this did not touch

Nothing here goes near the run engine, the record, or the pauses that ask your
permission. Every changed file is appearance, the new narrow-window control, or
a test. What earns a DONE is exactly what it was. This was checked directly by
the closing review, not assumed.

## Please look at these with your own eyes

1. **The pond at rest**, for ten seconds. You should see one continuous blend
   and a sheen that drifts. If you can see where the pond's edge is, this
   failed regardless of what the tests say.
2. **The narrow window**, closed and open, and the way back.
3. **Both, with your system's "reduce motion" setting on.** Everything should
   arrive at the same place without travelling.

## One decision left for you

With the pond open at a narrow window, a villager you grab jumps to the left —
there is an invisible wall down the middle of a pond whose whole premise is that
no wall is there. That was a deliberate trade: letting a drag save freely means
the wide layout would quietly redraw it at the shore, and the "Reset layout"
button is not available at narrow widths to undo it.

The closing reviewer thinks the trade is the wrong way round, and gave a good
reason: the wide layout already redraws such a position **visibly**, and Reset
does exist at that width — so the current choice trades a rare silent surprise
for a visible jump every time you touch a villager in the mode this was built
for. I have left it as it is rather than decide for you. Look at it and say.

Related and smaller: there is no "Reset layout" control below 1260px at all,
because the header that carries it is replaced by the status line. Restoring it
means deciding what chrome the narrow pond carries, which the approved mockup
does not show.

## What not to trust yet

- **"Reduced motion is handled" is not fully true.** The sweep was targeted, not
  exhaustive: the stone-drop animation on the welcome scene still plays. Known,
  small, and outside this work.
- **The narrow window's screen-reader announcement is reasoned, not observed.**
  The live region is now placed correctly (outside the button, where a button
  does not strip its role), but nobody has heard it announce. It wants one real
  screen-reader pass at a narrow window.
- **The narrow-window Playwright block has run, but its assertions are young.**
  Four of them are known to be fragile or to prove less than their names imply.

## Receipts

Commits: `b0152bf` … `866e8aa` on `main`, 33 commits, nothing pushed.

| Check | Result |
|---|---|
| `app` `npm run test:unit` | **241 / 241**, output pristine |
| `app` `npm run typecheck` | clean, exit 0 |
| `app` `npm run build:vite` | clean, exit 0 |
| `app` `npm run build:lab` | clean, exit 0 |
| `core` `npm test` | **151 / 151** |
| `app` `npm run test:smoke` (Playwright) | **3 failed / 39 passed** against a documented 3-failure baseline that had 38 passing |

**All three Playwright failures were proven pre-existing, not argued.**
`conductor.spec.ts:988` fails at the plan's base commit `9d46a95` with a
byte-identical message; `routing.spec.ts:330` fails at base; `routing.spec.ts:387`
needs a real `codex` on PATH. The rotating third member
(`conductor.spec.ts:801` in the final run) passes in isolation — the `EPERM`
temp-profile contention the handoff already records as undiagnosed.

## Honest record of how this went

**Eight defects were found in the plan itself, and none in the implementations.**
Three were caught by implementers who stopped and asked rather than guessing;
five by reviewers. They are tabulated in the plan's "Corrections applied during
execution" section with their fix commits.

**Three of the eight are one defect wearing different clothes:** a CSS rule that
exists but does not *win*, guarded by a test that checked the rule was present
rather than that it prevailed. Two of the three lived in a different file from
the one being reviewed. That pattern is now written into the plan as the failure
mode to expect in this codebase.

Two regressions reached the full verification and were caught there, by nothing
smaller:

- **The lantern's sway broke the entire Playwright suite** — 19 failed / 4
  passed, every failure "element is not stable" sixty times over thirty seconds.
  An eight-second infinite animation on the panel means every control inside it
  is permanently moving. The approved mockup swayed a picture; this panel holds
  the composer, the run controls, and every card. **The sway is not shipped**, and
  that is a deliberate deviation from the look you approved — recorded in the
  code, in the plan, and here. Everything else about the lantern is the mockup.
- **A second test encoded the old narrow behaviour** and clicked Cairn's node at
  900px wide, where the cast now waits behind the line. Each assertion moved to
  the width where it still applies.

The closing whole-branch review found four more Important issues that no
per-task review could see, all now fixed: a popover that read straight through
to the conversation behind it, the back button covering the pond's caption, a
villager-face animation still playing under reduced motion in the *other*
stylesheet, and four warning surfaces still following the light theme on a panel
that is now permanently dark — one of which measured 2.84:1 against a 4.5:1
floor. That last one was fixed with measurements rather than by eye, and the
wash was deepened again afterwards when 18% still measured 4.27:1.
