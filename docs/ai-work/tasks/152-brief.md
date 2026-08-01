# Task 152 brief — the cast learns to feel: states, marks, tilt, and motion

## Requested visible outcome

The owner approved Task 149's personalized stroke faces and asked for more
expression and character; shown the five options, they said "Build them
all." So the lab cast board gains, for every face:

1. **State expressions** — ready / thinking / working / done geometry per
   model (Cairn's thinking and working are the app's real marks; everything
   else is new but in-family), shown as a full grid.
2. **Signature micro-motion** — a per-model blink rhythm (single, double,
   slow, alternating, squeeze), live on the board, reduced-motion safe.
3. **One tiny signature mark** — crescent for Kimi, spark for Codex, a calm
   brow-line for Claude, two bobbing dots for Gemini; Cairn stays pure.
   Dots are zero-length round-capped strokes — the stroke vocabulary holds.
4. **Head-tilt** — a few degrees per model (Codex eager +4°, Kimi dreamy
   −2°, Gemini −1.5°, Claude and Cairn dead level).
5. **Reactive one-shot expressions** — board buttons: "A result lands"
   flashes a delighted variant on the whole cast; "Waiting on you" makes
   every face look toward the owner.

Captured (including the delighted flash and the waiting look, triggered in
the capture harness) and published as the top shots-page entry. Lab-only;
porting into the real town is a later task.

## Boundary of intent — what must not change

- Lab-only: no shipped-app behavior, layout, tokens, or copy changes.
- The stroke-face vocabulary is the constraint: lines, arcs, round caps,
  comparable weights; no fills-as-features, no bodies, no logos.
- Cairn's ready/thinking/working geometry stays byte-for-byte the app's.
- The tree carries other actors' uncommitted evidence (the stopped worker
  runs' Picker/spec edits, `148-report.md`, `150-brief.md`,
  `150-report.md`, LOG.md's pending rows, `app/tmp-capture/`). None of it
  is staged, modified, or deleted by this task. LOG.md gets this task's row
  appended but stays uncommitted per the Task 149/151 precedent.

## Checks that will show the outcome holds

- `npm.cmd run typecheck` and `npm.cmd run build:lab` clean.
- Board page and published images 200 on the lab server.
- Every capture inspected: states are distinguishable per model and
  consistent in family across models; marks and tilt read at town size; the
  delighted flash and waiting look are visibly different from ready.

## DONE and STOPPED

- DONE: board pass up, captures inspected and published, checks green,
  records written, exact-path commits (brief; then lab files + report).
- STOPPED: expressions can't be made credible in the vocabulary, or checks
  fail beyond honest repair; stop with state preserved and the smallest
  next choice named.
