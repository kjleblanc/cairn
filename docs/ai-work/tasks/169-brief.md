# Task 169 brief — Cairn speaks warmly, and says why a run stopped in words the owner can read

**Lane:** A (main checkout)
**Base commit:** 0cd51d2

## Requested visible outcome

Cairn gets warmer, and stops putting words the owner cannot read in front of
them. Two things the owner will actually see.

First, Cairn's own voice. The owner's direction was to make Cairn *"more warm
like a character from animal crossing"*. That warmth arrives as rhythm — short
delighted sentences, noticing things, being glad the owner is here — and
explicitly not as catchphrases, verbal tics, or pet names. The reason is
mechanical rather than aesthetic: a tic cannot step aside when the news is bad,
and a familiar flourish attached to an unverified result reads to a beginner as
a shrug. The existing rule that cheer steps aside for anything wrong, risky, or
STOPPED stays exactly as written.

Second, the result card stops speaking in machine constants. Today a stopped
run shows **"STOPPED — CANCELLED_BY_OWNER"** — this is not hypothetical, it is
visible in this repository's own capture at
`app/shots/task-168-stopped-desktop.png`, which the owner had never been shown.
After this task the card leads with a plain clause — "STOPPED — you stopped it
yourself" — and demotes the code to a quiet second line, kept because it is
useful in the record and to anyone debugging, but never arriving alone. The
written report says the same thing.

This implements Decisions 7 and 8 of
`docs/superpowers/specs/2026-08-02-cairn-showing-not-asking-design.md`, per
plan `docs/superpowers/plans/2026-08-02-cairn-voice-and-plain-language.md`.

## Boundary of intent — what must not change

- **Every honesty rule keeps its exact wording.** The three v2 rules (data
  fidelity, citation honesty, result commentary) and every boundary rule are
  untouched. This task changes voice and readability only.
- **No risk boundary moves.** Nothing about what Cairn may perform or approve
  changes. Installing software, spending money, sending data, deleting, and
  publishing all still pause for the owner's approval of that exact action.
- **No paid call is made.** Eval scenarios are added but deliberately not run;
  a run costs real money and needs the owner's explicit go.
- **No new dependencies**, in any `package.json`.
- **The renderer keeps importing `@cairn/core` for types only.** All five
  existing renderer imports are `import type`; this task must not introduce the
  first runtime import. That is why the card's lookup table lives in
  `app/src/shared/`.
- **`core/src/records.ts` imports `serial.ts` with `import type` only** —
  `serial.ts:8` already imports `records.ts` as a value, so a value import back
  would create a runtime cycle.
- **`.result-card-disposition` is not touched.** Eight Playwright assertions
  target that span (`app/tests/conductor.spec.ts` lines 662, 677, 1354, 1452,
  1646, 2016, 2109, 2291) and must stay green unchanged.
- **A code is never deleted, only explained.** The fixed code stays on the card
  and in the report; it simply stops being the first thing the owner meets.
- No change to stored data, provider settings, consent wording, approvals, the
  Town, the shipped faces, or security behavior.

## Plan (AI decision)

Five test-first tasks, detailed with full code in
`docs/superpowers/plans/2026-08-02-cairn-voice-and-plain-language.md`:

1. Warm the voice to `conductor-v4`; pin the three new load-bearing sentences.
2. Extend the plain-words rule past chat into task outcomes, details, and notes.
3. `app/src/shared/stopwords.ts` plus `Chat.tsx` — the card says why, then gives
   the code. This is the surface the owner actually photographed.
4. `core/src/records.ts` — the written report says the same, with a mirror test
   asserting the two copies never disagree. Two copies exist because the
   renderer cannot import core at runtime; the mirror follows the pattern
   `core/test/contract-mirrors.test.mjs` already sets.
5. Eval scenarios 11 and 12, added and deliberately not run.

## Checks that will show the outcome holds

1. From `app/`: `npm.cmd run typecheck` — exit 0, no output.
2. From `app/`: `npm.cmd run test:unit` — all pass, including the new
   `constitution.test.ts` pins and the six new `stopwords.test.ts` cases.
3. From `app/`: `npm.cmd run build:vite` — builds clean, confirming no runtime
   `@cairn/core` import entered the renderer bundle.
4. From `core/`: `npm test` — all suites pass, including the mirror test that
   fails if the app's and core's wording for a shared code ever diverge.
5. `git diff --check` — no output. `git status --short` — clean at the end.
6. `git diff docs/superpowers/evals/conductor-v0.md` — confirm no existing row
   gained a score and no new row was added. A row may only come from a real
   paid run with the owner's go.
7. **Look at it.** Reach a STOPPED result card in the running app and read the
   headline aloud. If it still needs a glossary, this task failed regardless of
   what the tests say.

## DONE and STOPPED

- **DONE**: the constitution is at `conductor-v4` with the warmer voice and the
  extended plain-words rule, both pinned verbatim; a stopped result card leads
  with a plain clause and demotes its code; the written report matches, guarded
  by a mirror test; eval scenarios 11 and 12 exist with written bars and no
  invented results; every check above passed with its real output observed; and
  the report plus LOG row land in one exact-path commit.
- **STOPPED**: any check fails and cannot be honestly fixed inside this task's
  boundary — in particular if warming the voice would require weakening an
  honesty rule, if the card change would need a runtime `@cairn/core` import in
  the renderer, or if a type-only import cannot break the records/serial cycle.
  The report then names the safe state left behind and what was not verified.
