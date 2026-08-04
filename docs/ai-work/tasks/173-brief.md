# Task 173 brief — Show the evidence: automatic pictures and the local album

**Lane:** B

**Base commit:** `58f8977ca69dd44ce093de726446e6df9bff6f2d`

## Requested visible outcome

Continue the four-part **Showing, Not Asking** design that Task 171 carried
through Plan 2. Plan 3 now makes Cairn show what changed: a finished run with
captures leads its result card with a full-width before/after pair and plain
captions, and one control opens a local album containing that run and earlier
runs. Capture is standing machinery rather than a throwaway helper, so the
owner does not have to run a script or ask for pictures after the work is done.

A run with no captures shows no evidence section and no placeholder. At a
narrow window the pair stacks at full width, as Decision 9 already settled.

## Boundary of intent — what must not change

- **Verified versus claimed.** Only Cairn-owned captures bound to the real run
  may appear as checked evidence. A worker-supplied path or claim can never put
  an image on the verified side of the card.
- **Event truth.** Capture timing reuses the keyed one-time cues from
  `app/src/renderer/town/presentation.ts`; it does not invent a second answer
  to whether a task event happened. Repeated polls and re-renders do not create
  duplicate evidence for one cue.
- **Run identity.** Album entries are bound to the actual routed run and worker
  identity, not to a renderer Boolean or display label.
- **Risk and dispatch.** Worker dispatch, paid calls, approvals, serial
  execution, result-card authorship, Git verification, and every existing
  permission boundary remain unchanged.
- **Storage.** Captures stay local under ignored `app/shots/`; images and clips
  do not enter Git history, and no retention/deletion policy is added.
- **Visible rules.** Stills are the baseline for every captured job. A clip is
  optional only when motion or sequence is the visible outcome. No empty
  evidence chrome is shown.
- **Panel and faces.** Task 171's Lantern on Water layout, its 1260px and 620px
  breakpoints, reduced-motion result, palette, and verbatim face geometry stay
  intact. No new breakpoint is introduced.
- **Dependencies and external actions.** No dependency is added. No real or
  paid model call, publish, push, or other external write is part of this task.

## Plan (AI decisions)

1. Write Plan 3 against the actual run, card, presentation-cue, identity, and
   existing shots-manifest seams; record the durable manifest and custody
   choices before implementation.
2. Add a bounded, fail-closed local evidence store and typed IPC that accepts
   only Cairn-owned run evidence under `app/shots/`.
3. Turn the existing one-off capture pattern into reusable fake-first harness
   machinery keyed by real run/cue identity, with de-duplication and honest
   before/after selection.
4. Put the pair first on eligible result cards, omit it when absent, and add a
   local album that opens on the matching run but can browse earlier entries.
5. Prove wide, narrow, absent-evidence, duplicate-cue, wrong-run, untrusted-
   worker-path, persistence, and reduced-motion behavior; inspect real captures.

## Checks that will show the outcome holds

1. Focused unit tests prove manifest validation, canonical containment, run
   binding, deterministic pair selection, duplicate-cue suppression, and that
   worker-supplied image claims never become verified evidence.
2. Renderer tests prove evidence is first on an eligible result card, absent
   without captures, and the album opens on the correct run and reaches past
   runs.
3. Focused offline Playwright uses only fake conductor/worker fixtures while
   holding both app-token locations. It completes a run, receives standing
   captures without an owner-run helper, shows the pair and captions, opens the
   album, and proves the same event does not capture twice.
4. The evidence pair is exercised at 1320×820 and 760×620; the narrow pair
   stacks, no content is clipped, and reduced motion reaches the same final
   state.
5. From `app/`: `npm.cmd run typecheck`, `npm.cmd run test:unit`,
   `npm.cmd run build:vite`, and `npm.cmd run build:lab` pass.
6. From `core/`: `npm.cmd test` passes. `git diff --check` is clean, the final
   status contains only disclosed Task 173 paths, and ignored capture artifacts
   are never staged.

## DONE and STOPPED

- **DONE:** automatic, run-bound local evidence appears honestly on the result
  card and in the browsable album, every boundary above is executable and
  green, real wide/narrow captures have been inspected, and the task has one
  report, one log row, and exact-path commits.
- **STOPPED:** capture can be forged, misbound, duplicated, leaked outside the
  local ignored store, shown as verified from worker input, or any required
  check fails without a safe in-scope repair. The retained state and next safe
  choice are named honestly.
