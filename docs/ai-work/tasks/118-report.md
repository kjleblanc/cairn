# Task 118 report — Warm interface spirit concept

## Requested visible outcome

Add a fourth lab-only avatar concept to the Avatar concepts board: a mix of
Concept 01 (Lopsided hologram) and Concept 03 (Interface spirit), leaning
slightly toward Concept 03 — sparse digital field/waveform as the base, with a
measured amount of Concept 01's asymmetric warmth — shown across the five
states so the owner can judge it before any port into the shipped town square.

## What actually changed

- `app/lab/concepts.tsx` — added `"warm"` to `ConceptId`; added a fourth
  `CONCEPTS` entry titled "Warm interface spirit"; added `WarmSpiritFace`
  (sparse spirit rings/mask, one larger asymmetric eye, a smaller second eye,
  an off-center waveform mouth) across ready / thinking / working / DONE /
  STOPPED; wired `FACES.warm`; header "Three ways…" → "Four ways…"; concept
  numbering now uses `String(index + 1).padStart(2, "0")`.
- `app/lab/concepts.css` — board widened to four columns, two columns under
  980px, one under 760px; Concept 04 gets dashed spirit framing with a slight
  cyan/amber warmth.
- `docs/ai-work/LOG.md`, `docs/ai-work/tasks/118-report.md` — this record.

No changes to `app/src`, the shipped renderer, core, CLI, the contract,
dependencies, credentials, or Git behavior. `design/` remains untracked and
was not committed.

## Checks run and their real results

- `npm.cmd run typecheck` (in `app/`) — green.
- `npm.cmd run build:lab` — green; bundled `lab/index.html` and
  `lab/concepts.html`.
- In-process Vite serve check — HTTP 200 with correct badges on all three:
  `/` (`mock data · visual lab`), `/lab/index.html` (`mock data · visual
  lab`), `/lab/concepts.html` (`mock concepts · visual lab`).
- Isolated Electron render (machine-wide app token held, released afterward):
  all four concept names present (`Lopsided hologram`, `Grown-up Ed`,
  `Interface spirit`, `Warm interface spirit`); all five state labels present
  (ready, thinking, working, DONE, STOPPED, case-insensitive).
- Screenshot captured at `design/attachments/task-118-warm-interface-spirit.png`
  (471548 bytes) and visually inspected: Concept 04 leans interface-spirit,
  with a small warm/lopsided mouth and asymmetric eyes as intended.
- Temporary harness files (`app/.tmp-concept-shot.cjs`,
  `app/.tmp-concept-shot-runner.mjs`) removed; app token verified free.

## How to try it

Open the Cairn visual lab and click through to Avatar concepts (or serve
`/lab/concepts.html` directly). Concept 04 "Warm interface spirit" is the
fourth tile; use the state controls to pose it.

## Limitations / remaining human judgment

- Concept 04 is still a lab-only visual pose; nothing has been ported into the
  real town square yet.
- The aesthetic judgment is the owner's: if this mix lands, the next task
  would port the chosen face into `app/src/renderer/components/TownSquare.tsx`
  and `app/src/renderer/app.css`.

Disposition: DONE
