# Task 145 brief — Port the Lantern Dusk palette into the real app

**Lane:** C (main checkout) · **Base:** main @ 724d97c (Task 143)

## Requested visible outcome

The owner picked **Lantern dusk** from the Task 144 world palette board. The
real app should read like that panel: a plum-dusk night world (no electric
cyan, no neon glow), lamp-lit cream panels with warm dark ink instead of
backlit violet glass, Cairn in soft teal, the worker in warm coral, and
lantern-gold ambers — "Animal Crossing cozy, Ghost in the Shell warmth in the
art, not the tech." The change is felt everywhere the night world shows: the
always-night garden/town square in both themes, and the whole dark theme.

## Boundary of intent — what must not change

- **No behavior, layout, structure, or copy changes.** Colors only.
- **Light-theme values untouched.** Every edit hits the dark side of
  `light-dark()` pairs or the theme-independent garden tokens (the garden is
  night in both themes by design — that design stays).
- **Token names unchanged** (two additions only: `--card-ink`, `--card-muted`,
  needed because cream panels can no longer inherit the light `--ink`).
- **No dependency changes, no new files in the product.** `phonepage.ts`
  stays a self-contained string page; only its embedded dark values are
  harmonized to the new palette (it cannot import tokens.css).
- Lane A/B in-flight work is not touched; stage exact paths only.

## Palette mapping (from the Task 144 board's Lantern panel)

plum sky #2e2a4e → dusk hills #46406a/#35304f → ground #2c2842; cream panels
#f4ead9 / #fffaf0 with ink #54452f and muted #97856b; Cairn #7fd8c8; worker
#ff9e8a; lantern gold #f2b95c with deep-gold ink #4e3208; dusty-violet
threads #8d80a8; warm accent #ffd98a.

## Checks that will show the outcome holds

- `npm.cmd run typecheck`, `npm.cmd run test:unit`, `npm.cmd run build`,
  `npm.cmd run build:lab` (in `app/`) — all green.
- Settled captures, inspected by eye and published to the shots page:
  the lab chatmock page (real TownSquare under the new world tokens) and the
  real app shell (rail + chat + town) showing cream panels and the de-neoned
  night.
- Contrast sanity pass on the flipped surfaces (cream cards carry
  `--card-ink`; nothing light-on-cream or dark-on-dusk).

## DONE / STOPPED

- **DONE** = the Lantern mapping above is what's on screen in dark theme and
  in the garden/town in both themes; all checks green; captures on the shots
  page.
- **STOPPED** = checks fail in a way repair can't safely fix, the flip proves
  unreadable in captures and can't be made readable within "colors only", or
  protected/lane work would be touched.
