# Task 152 report — the cast learns to feel: states, marks, tilt, and motion

Requested visible outcome: the owner approved Task 149's personalized stroke
faces and asked for more expression; shown five options they said "Build
them all." The lab cast board gains state expressions, signature
micro-motion, signature marks, head-tilt, and reactive one-shots — captured
and published, lab-only.

## What actually changed

- `app/lab/castboard.tsx` — reworked again (149's gallery stays in
  history). The face data model now carries five states per model
  (ready / thinking / working / done / delighted), a blink rhythm, a tilt
  angle, and signature-mark strokes:
  - **States.** Cairn's ready/thinking/working are the app's real marks
    byte-for-byte (only its done is new — the lopsided smile opened wider).
    Kimi's happy arcs flatten when thinking, narrow when working, and the
    smile opens on done. Codex's wink opens into a second angled eye when
    thinking, both eyes go keen when working, done is a grin. Claude's
    level strokes dip toward the middle when thinking, shorten when
    working, warm on done. Gemini's twin pairs rest one side when thinking,
    the other when working, and arc both on done. Delighted is a distinct
    joyful geometry per face.
  - **Marks.** Kimi a small crescent with a dot, Codex a spark, Claude a
    calm brow-line, Gemini two bobbing dots; Cairn stays pure. Dots are
    zero-length round-capped strokes — the vocabulary holds.
  - **Tilt.** Codex +4°, Kimi −2°, Gemini −1.5°, Claude and Cairn level
    (their levelness is the character).
  - **Motion.** Per-face blink rhythms via CSS on nested eye groups
    (single / double-left-only / slow / alternating / squeeze), Gemini's
    dots bob in alternation, `prefers-reduced-motion` disables all of it.
  - **Reactive one-shots.** Board buttons: "A result lands" flashes the
    delighted state on the whole cast for 1.6 s; "Waiting on you" toggles
    a 2.5 px downward glance of every face's eyes (nested `fb-look` group
    so the glance composes with blink transforms).
  - Layout: the live cast row on the Lantern dusk scene (with mood
    buttons), the state grid ("Every mood of every face", with today's
    shared coral face as the before row), and per-face note cards
    explaining states, marks, and blink.
- `app/lab/castboard.css` — animation keyframes and grid/mood styles.
- `app/shots/` (gitignored content) + `design/attachments/` — four captures
  and a new top manifest entry: `task-152-grid.png`, `task-152-cast.png`,
  `task-152-delighted.png`, `task-152-waiting.png`.
- No shipped-app files touched. Lab-only.

## Checks run and their real results

- `npm.cmd run typecheck` — clean.
- `npm.cmd run build:lab` — clean.
- Board page, manifest, and published images — 200.
- All four captures inspected before publishing: states distinguishable
  per model and consistent in family across models; marks and tilt read at
  town size; the delighted flash is unmistakable; the waiting look is
  subtle (a 2.5 px glance — honest note: it reads better live with its
  0.35 s transition than in a still). The delighted and waiting captures
  were triggered through the board's real buttons in the harness, not
  mocked markup.

## Repairs disclosed

1. `app/tmp-capture/` in the tree belongs to another actor's run (Task
   150/151); this task used its own `app/tmp-faceshot/` harness, deleted
   after use. The foreign harness is untouched.
2. The capture harness again used `channel: "chrome"` (no Playwright
   browser cache on this machine).
3. LOG.md: this task's row is appended in the working tree but **LOG.md
   stays uncommitted** — it already carries the pending 148/149/150/151
   rows, and committing it remains the owner's call (Task 149/151
   precedent).

## How to try it

Open `http://localhost:7390/lab/castboard.html` (lab server running) —
blinks, bobbing dots, and tilt are live; press "A result lands" and
"Waiting on you". Or judge from the four captures at the top of
`/shots.html`. The decision requested: does the cast feel alive enough to
port? The port is a later task and would wire states to the conductor's
own signals (thinking while Cairn streams, working while a run is live,
done on the result card, waiting while an approval is pending).

## Limitations and remaining human judgment

- Blink rhythms and the waiting glance are judged on a lab page; their
  final feel only exists in the real town (port task).
- The waiting look is intentionally gentle; if the owner wants it bolder,
  that's a one-line change at port time.
- The uncommitted foreign evidence (stopped worker runs' picker edits and
  records, LOG.md's pending rows) is untouched and still awaits the
  owner's decision.

Disposition: DONE
