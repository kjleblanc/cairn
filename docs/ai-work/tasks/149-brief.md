# Task 149 brief — the cast, take two: personalized stroke faces per model

(Renumbered from 148 after the Cairn envelope's stopped Codex Exec worker
run claimed 148 concurrently — the earlier claim keeps the number. Its
retained evidence is untouched; see the 149 report for the full account.)


## Requested visible outcome

The owner's call on Task 147's board: "Not quite what I had in mind. Keep the
style faces we have now, but personalize them per model type." So: no bodies,
no animals — keep the app's existing stroke-face language (the TownFace
marks: minimal strokes, round caps, 100×100 box) and give each model type
its own face within that language — distinct geometry plus a signature
color. Cairn keeps its exact current face. Rework the lab cast board into a
face gallery (line-ups in the Meadow and Lantern Dusk worlds, per-model
cards with rationale, town-size legibility), capture, and publish as the top
shots-page entry for the owner to judge. Porting the winner into the real
town is a later task.

## Boundary of intent — what must not change

- No change to shipped app behavior, layout, tokens, or copy — lab-only.
- The face style itself is the constraint: same stroke vocabulary (lines,
  arcs, round caps, comparable weights). No fills-as-features, no bodies,
  no logos.
- Cairn's existing face marks stay byte-for-byte the reference; only worker
  faces get new geometry.
- Other lanes' branches and uncommitted work stay untouched; records are
  append-only.

## Checks that will show the outcome holds

- `npm.cmd run typecheck` and `npm.cmd run build:lab` clean.
- Board page and published images 200 on the lab server.
- Every capture inspected: each face is unmistakably the same family as the
  current marks, faces are distinguishable from each other at town node
  size, and colors stay legible on both the Meadow and Lantern Dusk worlds.

## DONE and STOPPED

- DONE: reworked board up, captures inspected and published, checks green,
  records written, one exact-path commit.
- STOPPED: the faces can't be made credible in the stroke vocabulary, or
  checks fail beyond honest repair; stop with state preserved and the
  smallest next choice named.
