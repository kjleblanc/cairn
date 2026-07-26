# Task 081 — Brief

Requested visible outcome: the owner's decision on what a stone means is
recorded where an owner reads it, and the three residuals Phase 3's
whole-branch verification surfaced are closed — each proved by a check that
fails first.

## 1. The owner's decision: label the claim, keep the mechanism

`core/src/serial.ts:604` writes the worker's CLAIMED milestone value into the
log's `Milestone moved?` column, and `core/src/steps.ts:59` counts DONE + YES
rows as the stones rendered on the scene. The report already labels that value
as a claim and the result card labels it ("as the worker claims it"); the log
column and the stone do not. Twice — repo tasks 050 and 079 — a phase-closing
task hand-wrote `NO` specifically to avoid minting a stone for a run nobody had
demonstrated.

The owner's decision is to keep the mechanism and label it honestly. So
nothing about what a stone IS changes: not `serial.ts:604`, not what counts in
`steps.ts:59`, and not one byte of one existing LOG row — history is
append-only. The log's header is a schema the whole toolchain writes and
parses, so it is not touched either.

The labeling goes where it is free and true:

- **The contract**, in "Task records are memory": one sentence saying that in
  an envelope-dispatched run the milestone column carries the worker's claim
  rather than Cairn's verification, mirrored to every mirror.
- **The app**, wherever the stone count is rendered as a figure the owner
  reads: one short plain line saying what the figure counts.

## 2. The staleness guard has a hole exactly where the safety code lives

`app/playwright.global-setup.ts` compares the newest mtime under `app/src`
against `app/.vite`. But `vite.main.config.ts` externalises only Electron and
Node's built-ins, so `@cairn/core` is compiled INTO `.vite/build/main.js` from
`core/dist`, which is itself compiled from `core/src`. Editing `core/src`
without rebuilding core, or rebuilding core without rebuilding the app, yields
a stale bundle the guard passes — in the exact area Phase 3's envelope safety
fixes live. The guard checks the whole chain, each link naming the command
that fixes it, and still builds nothing.

## 3. The card-duplication residual

Repo task 080 disclosed it: a worker cannot forge a card, but it can COPY one
Cairn wrote, because a byte-identical copy of a genuine line is genuine by
every test authorship can apply. The copy renders twice and reaches the
conductor's briefing twice, which misrepresents how many times Cairn verified
something. `readTurns` de-duplicates by digest. This is safe with no false
positives: runs are serialised per project directory and `ts` is
millisecond-resolution ISO, so Cairn can never legitimately write two envelope
lines with the same digest in one conversation.

## 4. The setup file is not type-checked

`app/tsconfig.json`'s `include` lists `playwright.config.ts` but not
`playwright.global-setup.ts`, which is referenced only as a string path — so
the file extended in item 2 is invisible to `npx tsc --noEmit`.

## Boundary of intent

No change to what a run decides, what a record says, what counts as a stone, or
what the owner is charged. No existing LOG row, task record, or log header is
touched. No dependency is added. No version bump: 0.3.0 is closed and this
rides inside it. The only owner-visible behavior change is that a duplicated
result-card line renders once instead of twice.

Explicitly out of scope: marker-file pruning (housekeeping, no safety impact).

## Checks that will show it holds

- `core/test/contract-mirrors.test.mjs` fails on any mirror that did not take
  the contract sentence, and `AGENTS.md` — which no test guards — is
  diff-verified against the canonical template.
- A Playwright assertion for the gloss on each screen that shows the figure,
  failing first against the built app.
- A unit test that replays a byte-identical copy of a genuine card line and
  asserts it renders once, with a second genuine card in the same conversation
  proving the de-duplication does not over-drop.
- The staleness guard demonstrated refusing in both new directions, and
  passing once both builds are current.
- A deliberate type error in `playwright.global-setup.ts` passing `tsc` before
  the include and failing after it.
- Full battery: core, cli, app typecheck, app unit, and Playwright through
  `npm run test:smoke`.

DONE means the contract and the app say what a stone counts, the guard covers
the whole build chain, a replayed card renders once, the setup file is
type-checked, and the whole battery is green.

STOPPED means labeling the figure cannot be done without changing what a stone
is, or a de-duplication cannot be shown safe against genuine repeat cards.
