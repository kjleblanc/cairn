# Task 149 report — the cast, take two: personalized stroke faces per model

Requested visible outcome: the owner's pivot on Task 147's board — "Keep the
style faces we have now, but personalize them per model type." Rework the lab
cast board into a face gallery in the app's own TownFace stroke vocabulary:
Cairn keeps the real marks untouched, each worker model gets distinct
geometry plus a signature color. Captured and published for the owner to
judge; porting into the real town is a later task.

## What actually changed

- `app/lab/castboard.tsx` — fully reworked (the Task 147 animal cast is
  replaced; it stays in Git history). Five stroke faces, all drawn with the
  app's own vocabulary (lines, arcs, round caps, comparable weights, 100×100
  box): **Cairn** — the real ready marks copied byte-for-byte from
  `TownSquare.tsx`, soft teal; **Kimi worker** — closed happy arcs and a soft
  open smile, lilac; **Codex worker** — one angled eye borrowed from the
  app's own thinking marks, one winking dash, a crooked smirk, amber;
  **Claude worker** — two level horizontal strokes and a gentle level smile,
  dusty blue; **Gemini worker** — every stroke doubled, two-part smile,
  mint. Today's shared worker face is shown as the "before". Layout:
  per-model cards (large face, town-size chips on dusk and on light, color
  hex, rationale), then full line-ups in two worlds — the shipped Lantern
  dusk and the Meadow morning daylight check.
- `app/lab/castboard.css` — reworked for the gallery (cards, chips, scenes).
- `app/shots/` (gitignored content) + `design/attachments/` — three captures
  and a new top manifest entry (numbered 149): `task-148-cards.png`,
  `task-148-dusk.png`, `task-148-meadow.png` (filenames kept from the
  pre-renumber captures; the images are the current board).
- No shipped-app files touched. Lab-only.

## The collision and the renumber (the reason for two numbers)

While this task was mid-flight, the Cairn envelope dispatched a real Codex
Exec worker run on this same repository (picker "Remove from this list"
controls). My brief commit moved `main` under that run, its Git protection
tripped as designed, and it stopped safely with `RECORD_VERIFICATION_FAILED`
— retaining its edits (`app/src/renderer/screens/Picker.tsx`,
`app/tests/projects.spec.ts`), its `docs/ai-work/tasks/148-report.md`, and
its STOPPED LOG row, all uncommitted, for owner inspection. Its run claimed
task number 148 before my brief did (its report records my brief appearing
mid-run), so per "the later one renumbers", this task moved to 149: the
brief was renamed with a renumber note in one exact-path commit. The
worker's retained evidence is untouched and uncommitted, awaiting the
owner's decision (inspect-and-land as a new task, or set aside).

## Checks run and their real results

- `npm.cmd run typecheck` — clean.
- `npm.cmd run build:lab` — clean.
- `curl http://localhost:7390/lab/castboard.html`, manifest, and published
  images — 200.
- All three captures inspected before publishing: five faces unmistakably
  one family yet individually distinguishable at full size and at 40 px town
  size; colors legible on the dusk world and on the daylight meadow (Kimi's
  lilac and Claude's blue sit quieter on the green but remain readable;
  Gemini's mint relies on its doubled geometry there — noted for the port).

## Repairs disclosed

1. The capture harness again used `channel: "chrome"` (no Playwright browser
   cache on this machine); harness was throwaway, deleted after use.
2. The renumber itself: brief renamed 148 → 149 via `git mv` plus a
   renumber note; a stray `n` from a `sed` insertion in the brief's note was
   caught and fixed before committing (verified in the committed file).
3. The shots manifest's top entry was renumbered to 149 after its captures
   were published; image filenames keep the `task-148-` prefix (untracked
   content; renamed titles would buy nothing).

## How to try it

Open `http://localhost:7390/lab/castboard.html` (lab server running), or
judge from the three captures at the top of `/shots.html`. The decision
requested: do these five faces read as one family with five personalities?
Any face to redraw? The picked set ports into the real town as a later task
(workers currently share Cairn's exact marks in coral — `TownSquare.tsx`
renders `<TownFace kind="worker" />` with the default ready geometry).

## Limitations and remaining human judgment

- States (thinking / working variants) are deliberately out of scope, noted
  on the board; they will reuse these geometries the way the app's current
  faces do.
- Claude and Gemini have no shipped adapter today; their faces are the
  system showing it scales.
- LOG.md: this task's row is appended in the working tree but **LOG.md is
  deliberately left uncommitted** — committing it would sweep the worker's
  stopped 148 row into history before the owner decides its disposition
  (exact-path isolation is not clear). The row lands with the owner's
  decision on the retained evidence.

Disposition: DONE
