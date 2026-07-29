# Task 126 report — Ask the power question first, collapse the picker

## Requested visible outcome

Owner direction after Task 124: simplify and streamline the connect process
and model picker — options A (the card asks how you want to power Cairn
before presuming) and B (the picker stops being a wall of text). Full brief:
`126-brief.md` (0166612).

## What actually changed

- `app/src/renderer/bodies.ts` — `Body` gains `primary?: true`; Kimi K3 and
  the Kimi subscription seat are marked primary (the two doors), and the
  subscription entry moves up to sit beside K3 so the primaries render in
  array order. The doc comment records the field's meaning.
- `app/src/renderer/components/ConnectCard.tsx` — new `start` panel is the
  card's first screen: "How do you want to power Cairn?" with the two
  primary doors rendered from the same Body data as the picker (via a shared
  `BodyButton` — name, blurb, billing line, recommendation note can never
  drift apart), plus the quiet "Choose a different brain" link. The picker
  shows the two primaries, then a dashed "More choices (3)" toggle hiding
  Kimi K2, DeepSeek V3.1, and GPT-5 Mini until clicked; "Custom…" and "The
  model I want isn't listed…" stay visible without expanding, so the
  22-call connectToFixture helper is untouched. Picker Back now returns to
  the start screen; the toggle resets when leaving the picker flow. The
  paste screen, consent block, checkbox, and gate keep their exact strings.
- `app/src/renderer/app.css` — one rule: `.brain-toggle` (dashed border).
- `app/tests-unit/bodies.test.ts` — new red-first pin: exactly two primary
  bodies, and they are K3 and the subscription seat.
- `app/tests/conductor.spec.ts` — the connect walk rewritten for the new
  flow: start-screen assertions (question, both doors, both billing lines,
  no text inputs), door choice lands on the pre-filled paste screen, picker
  hides the three non-primaries until the toggle opens (explicit
  `not.toContainText` pre-expand), the not-listed and guide walks re-walked,
  Custom… path unchanged.
- `app/tests/connect-kimi.spec.ts` — the seat is now clicked straight from
  the start screen (one click fewer than before); all consent-wording and
  CLI-truth assertions unchanged.
- `docs/ai-work/tasks/126-brief.md` (restored — see below), this report,
  `docs/ai-work/LOG.md`.

`consent.ts` byte-identical; no IPC, core, CLI, contract, or dependency
changes. Screenshots (untracked scratch): `design/attachments/task-126-*.png`
— start screen, collapsed picker, expanded picker, paste screen; visually
inspected.

## Checks run and their real results

- `npm run test:unit` — 107/107 pass (106 + the red-first primary pin).
- `npm run typecheck`, `npm run build:vite`, `npm run build:lab` — green.
- Full Playwright E2E with the app token held
  (`$TEMP/cairn-app-token`, taken and released): 43/43 pass (21 + 22), run
  on a fresh build of the exact post-landing tree. Token verified released;
  scratch screenshot spec deleted after its run.
- A Daimon restart interrupted the first conductor-spec attempt mid-run;
  state was re-verified (token still held, no stray Electron from this task)
  before re-running.

## Mixed-tree and double-claim disclosures (parallel lane, same checkout)

- The parallel lane landed Task 125 ("one sky", 0c7b903 — including
  `app.css` changes) while this task was mid-flight. This lane's working
  `app.css` was verified to sit cleanly on top (diff = exactly the
  `.brain-toggle` rule; no reversal of their styles), and every check above
  ran against the merged tree — the same content this commit lands.
- The same lane then claimed task number 126 a second time (f05a9d9, a
  brief-only commit that overwrote this lane's `126-brief.md` in the
  committed tree). Their claim is later than this lane's 0166612, and this
  lane is landing first, so per the two-lane rule ("the later one renumbers
  before landing") this task keeps 126 and their motion-slice task must
  renumber to 127 before it lands; its brief content is fully preserved in
  f05a9d9. This lane restored its own brief at `126-brief.md` with a note
  pointing there.
- Three electron.exe processes from a PREVIOUS day's E2E run (2026-07-28)
  remain alive on the machine — not this task's, left for the owner's call.
- `design/` stays untracked scratch; the parallel lane's files were never
  staged or committed by this lane.

## How to try it

Open the app on any governed project while disconnected: the card now asks
"How do you want to power Cairn?" with Kimi K3 and your subscription as the
two doors. "Choose a different brain" shows the two doors plus a dashed
"More choices (3)" toggle for the rest; Custom… and the not-listed path are
right there without expanding.

## Limitations / remaining human judgment

- The start screen asks the question on every fresh disconnect; remembering
  the last seat is option D, briefed separately as the next task.
- "More choices (3)" counts from data, but the collapsed hint line
  ("lower prices than K3") is prose — it stays true while every non-primary
  OpenRouter entry is cheaper than K3; a future pricier entry must reword it
  (the billing lines remain the per-entry truth).
- The toggle's dashed border is the only expand affordance beyond the
  chevron; the owner's eye is the final judge of discoverability.

Disposition: DONE
