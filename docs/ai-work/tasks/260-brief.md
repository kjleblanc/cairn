# Task 260 brief — the core conversation surface

**Lane:** A (the main checkout), owner-confirmed free before any file was
written. **Base commit:** `258c434`. **Slice:** 5 of 11 in
`docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`.

**Number claimed by this commit.** Task files across the main checkout, all nine
registered worktrees and all twelve local branches form an unbroken run
`001`–`259` with no gap, so `260` is the lowest genuinely free number. Nothing
else is landing: `git rev-list --count main..lane/h` is 2, which is Task 254's
claim and completion commits.

## The requested visible outcome

The inside of the conversation stops being the retired lantern's, re-toned, and
becomes the approved paper language in its own right. The transcript, Cairn's
prose, the owner's notes, streaming, the queue, errors, follow-ups and the
composer are drawn from `--rp-*` semantics by rules that hang off
`.rp-conversation`, not from thirty paired tokens re-pointed under
`chat-column-villager`.

The frame does not move. The rail, the header, the activity capsule and where
the conversation sits were approved at Owner gate 2 on 2026-08-17 and are not
redesigned here.

## The boundary of intent

**The hook stays.** `chat-column-villager` remains on the conversation element.
Roughly 281 rules hang off it, and only 44 of them belong to this slice: the
decision family (87 rules — question card, task card, dispatch panel, approvals)
is Slice 6's and the result family (128 rules — receipts, run strip, evidence,
push) is Slice 7's. Their structure is not touched. Task 259 proved what happens
otherwise: the dispatch panel silently reverted to a pre-Task-186 card language
and `conductor.spec.ts` caught it. The hook can only be dropped once every
family has moved, which is the end of Slice 7.

Nothing else changes:

- **No new state owner.** Chat's connection restore, transcript merging, stream
  lifecycle, queued messages and take-back, pending actions, task attachment,
  result recovery, retry, stop, new conversation and focus settlement all keep
  their exact current behaviour. Markup and classes change only where
  presentation needs it.
- **No second Cairn.** Production draws Cairn in exactly one component and
  `deskcomposition.test.ts` enforces it. No face is placed beside a historical
  turn.
- **No approved colour is changed.** The palette is the constitution's. If a
  contrast floor cannot be met without moving one, this task stops.
- Nothing under `core/**`, `cli/**`, `src/main/**`, IPC, preload, stores, the
  phone page, package manifests or lockfiles. No `.cairn` data read, written or
  deleted. No dependency install, provider or model call, credential use, paid
  call, external-service write, push, publication or deployment.
- No registered worktree created, deleted, reused, reset or moved.
- Every tracked, staged, modified and untracked path is protected, including the
  untracked evidence under `app/test-results/` and `app/shots/`.

## Checks

Each check has a stable id. Commands are run from `app/` unless stated.

1. **`c1` — the conversation's paper language is real, not a re-point.** Every
   rule in the transcript, bubble, commentary, follow-up, composer, top-bar and
   body-pill families is gone from `app.css` and exists in `surfaces.css`
   anchored on `.rp-conversation`. `app.css` still declares no `.rp-` selector,
   every new selector is anchored, and the breakpoint census across the three
   new sheets is still exactly `{820, 1260}` — asserted by the existing
   `visualtokens.test.ts`.

2. **`c2` — Chat's state machine is unchanged.** The behaviour is characterized
   BEFORE any edit — the exact current text of every send, queue, retry,
   take-back, stop, reset, attach, restore and focus path is captured — and
   compared afterwards. The existing behavioural suites
   (`evidencepresentation`, `runpaper`, `builderproposalreview`, `followups`,
   `store`, `newhorizons`) stay green on their behavioural assertions.

3. **`c3` — Cairn open on paper, the owner in quieter apricot, machine evidence
   bounded.** Cairn's prose carries no box and one restrained speaker mark, at
   the constitution's measure and line height. Owner turns use the measured
   `--rp-apricot` / `--rp-apricot-ink` pair rather than the retired lantern's
   hard-coded peach. Commands, paths, hashes and code sit in mono surfaces that
   scroll inside their own frame.

4. **`c4` — exactly one Cairn, and no face beside a historical turn.**
   `deskcomposition.test.ts`'s existing assertions still hold.

5. **`c5` — native composer semantics, keyboard and screen reader.** The
   textarea stays a textarea, New and Send stay native buttons with their exact
   disabled gates and accessible names, focus is drawn and measured by TABBING,
   every conversation control the composer and top bar own clears 44 × 44, and
   the live regions are unchanged in number, politeness and node identity.

6. **`c6` — long Markdown, paths and code contain themselves.** A long
   unbroken path, a wide table and a long fenced block scroll inside their own
   frame at 1320×980, 760×620 and the test-only 540×900; the page never scrolls
   sideways and the paper never widens.

7. **`c7` — nothing moves that the owner did not cause.** No `infinite` in the
   new rules; every animation is finite and ends at `transform: none`; reduced
   motion reaches the identical semantic end state, measured in the running app.
   The transcript's own turns no longer carry a transform, which removes a
   transform applied to containers that hold interactive controls.

8. **`c8` — measured contrast, on the CONNECTED conversation.**
   `contrast.spec.ts` has never measured a Cairn turn, an owner note or a
   composer, because its lane runs with no conductor. This task brings a
   connected conversation under that measurement using the same local fixture
   `conductor.spec.ts` uses — no provider call, no credential, no network beyond
   loopback. If that cannot be reached, it is recorded as a gap and not claimed.

9. **`c9` — the surface, seen.** Screenshots of the real built app at 1320×980,
   the supported minimum 760×620 and the test-only 540×900 stress, in explicit
   Light and Dark, written to `app/shots/task260/` (never `test-results/`).

10. **`c10` — every old visual test that moved has a disposition.** Preserved,
    Rewritten or Replaced, each named with its reason, per the plan's section 6.
    No blanket snapshot update and no unexplained deletion.

11. **`c11` — the app compiles, builds and tests as it did.**

    ```powershell
    npm.cmd run typecheck
    npm.cmd run test:unit
    npm.cmd run build:vite
    npm.cmd run build:lab
    node --test dist-unit/tests-unit/residentprogramboard.test.js
    node --test tests-qualification/resident-program-bundle-dark.test.mjs
    node --test tests-qualification/builder-proposal-bundle-dark.test.mjs
    ```

    The unit failure SET is diffed against the 1034 / 1023 / 9 / 2 baseline by
    full test title, never by count. `dist-unit/` is removed before the run if
    any test source was deleted.

12. **`c12` — targeted E2E under the exact mutex protocol.** Both token
    locations (`%TEMP%\cairn-app-token` and `app/.app-token`) are acquired with
    `mkdir`, ownership recorded, and only the ones this run created are
    released. One invocation per scenario, `workers: 1`,
    `--output=test-results/task260-runner`, with `test-results/` backed up
    first and its hashes verified after.

13. **`c13` — no dependency, no external action.** No install, provider or model
    call, credential, paid call, network or external-service write, push,
    publication or deployment.

14. **`c14` — records and Git protection.** This brief committed alone; the
    completion commit stages only this task's exact paths, by name. Nothing
    cleaned, stashed, reset, broadly staged or rewritten.

## DONE and STOPPED

**DONE** means the conversation's interior is drawn by the approved paper
language, every check above has a real recorded result, the unit failure set is
unchanged from the baseline, and no behaviour in Chat's state machine moved.

**STOPPED** means a behaviour could not be preserved through the restyle, a
contrast floor could not be met without changing an approved colour, or a
concrete risk boundary was reached. There is no owner gate at the end of this
slice; the next owner judgment is gate 3 at the end of Slice 7.
