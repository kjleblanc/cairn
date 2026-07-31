# Task 144 brief: world palette board — Animal Crossing world, GitS characters

**Lane:** A (main checkout)

## Requested visible outcome

The owner's read of the current state: "an improvement… still a bit too
'digital' or 'techy'. More 'animal crossing' with a color palette and vibe of
ghost in the shell." The current festival-dusk world is still a neon night
scene. This task explores the *environment* direction the same way the
lookboard (Task 122) and chat mockup (Task 136) did: a **lab-only board**
painting the same town scene — sky, meadow, Cairn and worker faces, a chat
card, a button, a thread — under three de-digitized directions:

1. **Meadow morning** — full Animal Crossing daylight: soft blue sky,
   rolling green hills, cream paper surfaces; GitS saturation lives on the
   characters (teal Cairn, coral-magenta worker).
2. **Golden hour** — warm peach-gold sky and amber-green meadow; the middle
   step between daylight and today's dusk.
3. **Lantern dusk** — the current night kept, but de-neoned: warmer indigo,
   paper-lantern light, softer labels, glow dialed down.

Captured onto the Review shots page for the owner to judge by screenshot.

**Renumber note:** claimed as 140, but lane B2019s contract-v0.6.0 brief (4394913)
claimed 140 first; renumbered to 144 per the lane rule, and lane B2019s
140-brief.md is restored byte-for-byte.

## Boundary of intent

- **Lab-only.** New `lab/worldboard.html` + script + styles, one more
  `build:lab` input, untracked shots content. No renderer or token changes —
  the winning direction gets ported into `tokens.css` as a later task.
- The faces reuse the real `TownFace` SVG paths (copied into the mock,
  throwaway) so what is judged is color and world, not new marks.
- AI decision (recorded per v0.5.0): plain React + inline per-direction
  palettes, matching the lookboard's structure.
- The other lane's work is never staged or touched.

## Checks (exact commands; outputs cited in the report)

- `cd app && npm.cmd run typecheck` — green.
- `cd app && npm.cmd run build:lab` — green, emits the new page.
- `cd app && npm.cmd run lab` (temporary, then stopped): `curl` HTTP 200 for
  the board path.
- Playwright-driven Electron captures (temporary harness, deleted after):
  one settled frame per direction, inspected by me, copied to `app/shots/`
  with a manifest entry; manifest re-verified by curl.

## DONE / STOPPED

- **DONE:** the shots page shows a Task 144 entry with the three directions;
  checks green; commit contains only the lab page, config input, and records.
- **STOPPED:** the board cannot be produced without touching shipped code.
