# Task 147 report — the cast: a character board for Cairn and the workers

Requested visible outcome: a lab-only "character board" presenting distinct
avatars for Cairn and for each type of AI worker — the owner's idea: "design
different avatars for each type of AI model, as well as one for Cairn, so all
workers look different" — under two or three art directions, captured and
published on the shots page so the owner can pick a treatment.

## What actually changed

- `app/lab/castboard.tsx` — new board page. Five hand-drawn SVG villagers,
  grounded in the app's real adapter roster (`town/model.ts`): **Cairn** (a
  stone-stack spirit — a cairn come alive — keeping the real TownFace ready
  marks on the top stone, carrying the paper lantern, with one glowing seam
  between the stones), **Mochi** the moon rabbit (Kimi worker; crescent mark,
  glowing ear seam), **Rusty** the fox (Codex worker; tool satchel, data-wisp
  tail tip), **Barnaby** the owl (Claude worker; circuit trace on the left
  wing), **Pip & Kit** the twin kittens (Gemini worker; one thin halo ring).
  Each carries exactly one Ghost in the Shell detail. The same cast renders
  under three lighting directions reusing the Task 144 worlds — **Paper
  villagers** (Meadow morning, glow at 35%, blush on), **Golden hour** (glow
  at 65%), **Neon seam** (Lantern dusk, glow full, bodies rim-lit via a CSS
  light filter) — each with essence/keep/watch notes and a town-size strip
  (44 px) for the silhouette legibility check.
- `app/lab/castboard.css` — board styling (throwaway, like the worldboard's).
- `app/lab/castboard.html` — entry page.
- `app/vite.lab.config.ts` — `castboard` added to the lab build inputs.
  Nothing else in the config changed; the shipped app is untouched.
- `app/shots/` (gitignored content) + `design/attachments/` — five captures
  and a new top manifest entry: `task-147-paper.png`, `task-147-golden.png`,
  `task-147-neon.png`, `task-147-townsize.png`, `task-147-notes.png`.

## Checks run and their real results

- `npm.cmd run typecheck` — clean.
- `npm.cmd run build:lab` — clean; `castboard` bundle emitted (~15 kB).
- `curl http://localhost:7390/lab/castboard.html` — 200; manifest and
  published images — 200.
- All five captures inspected before publishing: silhouettes distinct and
  readable at full size and at 44 px town size; the three directions are
  genuinely different treatments (glow strength, blush, scene light), not
  palette swaps of the backdrop alone.

## Repairs disclosed

1. The capture harness first failed: no Playwright browser cache exists on
   this machine (the app's E2E drives Electron, not Chromium). Fixed by
   launching with `channel: "chrome"` (system Chrome). Harness was throwaway
   (`app/tmp-capture/`, deleted after use) — no shipped file affected.
2. One self-caught code slip: an invalid JSX spread in the `Character`
   component was replaced with a direct render-function call before any
   check ran.

## How to try it

Open `http://localhost:7390/lab/castboard.html` (the lab server is running),
or judge from the captures: the top entry on `/shots.html`. The decision
requested: pick a treatment (Paper villagers / Golden hour / Neon seam) —
and react to the cast itself (species, names, the one-detail rule). Porting
the winner into the real town is a later task.

## Limitations and remaining human judgment

- Villager names (Mochi, Rusty, Barnaby, Pip & Kit) are placeholders, noted
  on the board itself; Animal Crossing names every resident and the owner's
  taste decides ours.
- Claude and Gemini have no shipped adapter today; their villagers are
  concepts showing the system scales, noted in the board's cast notes.
- States (idle / working / done poses) are deliberately out of scope — the
  board establishes identity first, and the notes say so.

Disposition: DONE
