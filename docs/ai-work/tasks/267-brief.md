# Task 267 brief — running, results, evidence, history, publication, and the hook

**Lane:** A (the main checkout), confirmed clean and between tasks. **Base commit:**
`ee19118`. **Slice:** 7 of 11 in
`docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`.

**Contract drift, disclosed.** `main` carries **Cairn Contract v0.8.0** and this task
works to it. `lane/i` carries v0.9.0, which reserves `docs/ai-work/verdicts/`, widens
the number check to that tree, and requires the task listing to be re-read immediately
before the brief is written. A project's own contract is law even when another branch
is newer, so v0.8.0 governs here — but nothing in this task goes near
`docs/ai-work/verdicts/`, and the listing was re-read across every branch immediately
before this file was written, so the task satisfies v0.9.0's stricter clauses anyway.

## The requested visible outcome

Live work, terminal receipts, evidence, commentary, follow-ups, history, the manual
TaskRun screen and the separate push checkpoint all move onto the same warm paper as
the conversation and the decision family, and **truth is easier to scan than
decoration**. When it is done, `chat-column-villager` — the retired hook that has
carried the interior of the conversation since Slice 4 — no longer exists anywhere in
the product, and nothing on screen lost its skin when it went.

This is the last family. Slices 5 and 6 moved the conversation and the decision
surfaces; the result family is what remains, and the hook comes off with it.

## The boundary of intent — what must not change

**Behaviour.** No callback, gate, ref, effect, busy flag, focus move, keyboard order,
accessible name or native semantic changes. Every protocol literal — run states, push
phases, evidence kinds, disposition values, action ids the main process matches on —
stays byte-identical. These are not class names and a restyle that fat-fingers one
changes what the product does.

**Product truth.** The envelope authors the result card; the conductor's commentary
stays a separate turn. Push stays its own risk approval with its exact target, effect
and recovery text. Screenshots never rescue a failed Git verification. Checked facts
stay visibly separate from Builder-reported claims. Source and model identity survive.
Evidence keeps its trust indicator, its pagination, its focus containment and its
local-image loading. TaskRun and Chat continue to agree on session truth.

**Everything outside the renderer's stylesheets and result-family markup.** Nothing
under `core/**`, `cli/**`, `src/main/**`, `src/shared/**`, IPC, preload, stores, the
phone page, package manifests or lockfiles. No `.cairn` data read, written or deleted.
No registered worktree created, deleted, reused, reset or moved. No other lane's paths.

**No risk boundary is crossed.** No dependency install, provider or model call,
credential, paid call, external-service write, push, publication or deployment. If the
work turns out to need one, it stops there.

## What makes this slice different from Slice 6

Slice 6 was a pure stylesheet migration that touched no component. This one removes the
hook itself, and three facts found before any edit make that the hard half:

1. **`workspace.css` keys three selectors on the class being deleted.**
   `workspace.css:248` and `:320` are deliberately three-class
   (`.rp-conversation.chat-column.chat-column-villager`) so they out-specify
   `app.css`'s `.chat-column.chat-column-villager` (0,2,0), and `:358` does the same
   for the top bar. Line 248 carries the **entire paired-token block** (274–309) that
   re-tones every unmigrated rule onto warm paper. Deleting the class silently kills
   these too. They must be reduced to `.rp-conversation.chat-column`, not left behind.

2. **Slice 6's action skin is an enumerated allowlist, not a generic rule.** It names
   eight action containers (`surfaces.css` 1626–1632 and 1652–1659) and does **not**
   cover a bare `.pill` inside `.rp-conversation`. The top bar's "← Project home", the
   provider·model BodyPill and `.result-card-actions .pill` are all skinned today by
   the generic `.chat-column-villager .pill` at `app.css:1160`. Dropping that without a
   generic `.rp-conversation` replacement returns them to the unscoped base at
   `app.css:32` — which is the glossy 999 px pill with a 4 px hard edge, a
   `scale(1.04)` hover transform the constitution forbids on containers holding
   controls, a `--garden-cyan` focus ring instead of the constitution's, and
   `opacity: .5` on `:disabled`, **the exact accessibility defect Slice 6 removed**.
   Four regressions from one deletion. This is `c7`.

3. **`.chat-tuck` is already dead.** No `.tsx` renders it, so `app.css` 1187–1188 and
   1600 are deletions to be proved, not rules to be moved.

## Checks

Every check is run from `app/` unless stated. Each carries its exact command.

1. **`c1` — the result family's own rules leave the hook, and the hook is gone.**
   `chat-column-villager` reaches **zero** occurrences in `app/src/**` — every
   stylesheet and every component. `visualtokens.test.ts` stays green: every selector
   in the migrated sheets is anchored on an `.rp-` class, `app.css` names no `rp-`
   string in a rule **or a comment**, and the breakpoint census is unchanged.
   `node --test dist-unit/tests-unit/visualtokens.test.js`

2. **`c2` — every component's behaviour is unchanged, measured.** A `pre` capture taken
   before the first edit strips the value of every `className` from all 47 renderer
   screens, components and lab entries and hashes the rest, and inventories every string
   literal in them. The `post` capture is compared to it. Any digest that moves must be
   explained line by line; **any protocol literal gained or lost is a defect, not a
   note.** `pre` is already captured at `ee19118` against a clean tree: 47 files,
   2,898 literals.

3. **`c3` — the result keeps its picture and its outcome first, and checked facts stay
   separate from Builder-reported claims.** Asserted against the stylesheet and seen in
   the captures: the disposition and outcome lead the receipt, Cairn-checked facts stay
   open, and the builder's account and the original request remain complete behind
   their own native disclosures rather than being merged into one list.

4. **`c4` — DONE, STOPPED and ERROR are distinguished without colour.** Each keeps a
   distinct geometric mark as well as its semantic ink — today a filled disc, a bar and
   a doubled outline at `app.css` 1030–1039. Asserted on shape, not on colour, so the
   distinction survives a monochrome reading.

5. **`c5` — native controls, keyboard order, focus and target size.** Focus is the
   constitution's 3 px ring at 2 px offset, measured by **tabbing** in the running app
   rather than by `.focus()`, and every interactive target inside the conversation
   clears 44 × 44 from its real bounding box with a result card, a run strip and the
   push confirmation on screen.

6. **`c6` — long data contains itself.** Long paths, long model names, long outcome
   sentences and a long push target wrap rather than widening the paper. Measured in the
   running app at 1320 × 980, at the supported 760 × 620 minimum and at the test-only
   540 × 900 stress, with a positive control proving the long text really does wrap.

7. **`c7` — every control keeps its skin when the hook comes off.** The decisive check
   of this slice. A red-first test proves that with `chat-column-villager` gone, no
   control inside `.rp-conversation` falls back to the unscoped base: none takes
   `border-radius: 999px` or the `0 4px 0` hard edge, none scales on hover, none fades
   to `opacity: .5` when disabled, and every focus ring is the constitution's. Verified
   from **computed styles in the running app**, because that is the only place a
   cascade regression of this kind is visible — `conductor.spec.ts` is what caught it
   when Task 259 removed the hook early.

8. **`c8` — measured contrast, with a result card under it.** `contrast.spec.ts`'s
   connected scenario is widened a third time rather than a fourth scenario written, so
   the same sweep reaches a terminal receipt, its disposition word, its evidence row and
   the push confirmation. Every measured element clears 4.5:1.

9. **`c9` — every semantic state, seen.** Captures of the real built app in
   **`app/shots/task267/`**, each at 1320 × 980, the supported minimum 760 × 620 and the
   540 × 900 stress, in explicit Light and Dark: a running strip, a DONE receipt, a
   STOPPED receipt, an ERROR receipt, evidence, follow-ups, a folded historical receipt,
   the push confirmation and its outcome. States that cannot be reached without a paid
   worker call are named rather than skipped, with their rules asserted against the
   stylesheet instead.

10. **`c10` — a disposition for every old visual test that moved**, one of Preserved,
    Rewritten or Replaced, each with its reason. `lantern.test.ts` is the hard case:
    all seven of its tests are about the class being deleted, so each needs an
    equivalent rendered or causal check **before** deletion, not after. Every quiet
    guard found on the way is repaired — starting with
    `evidencepresentation.test.ts:109`, whose two bare `indexOf` markers carry only a
    negative assertion, so an empty slice would satisfy it while reading nothing.

11. **`c11` — the app compiles, builds and tests as it did.** `npm.cmd run typecheck`,
    `npm.cmd run test:unit`, `npm.cmd run build:vite`, `npm.cmd run build:lab`. The
    failure **set** is compared by full test title against the baseline re-derived in
    this lane before the first edit, never against a count and never against a number
    taken from a document.

12. **`c12` — targeted E2E under the exact mutex protocol.** Both token locations
    (`%TEMP%\cairn-app-token` and `app/.app-token`) acquired with `mkdir`, ownership
    tracked per location, released in a `trap` that also covers the launch. `workers: 1`.
    The run/result/evidence/push scenarios of `conductor.spec.ts`, `routing.spec.ts` and
    `evidence.spec.ts`, plus `contrast.spec.ts`. Every scenario that fails inside a batch
    is rerun **alone** with `--reporter=list` before it is believed, because the Windows
    worker-teardown `EPERM` reports failures with no assertion error at all.

13. **`c13` — no dependency, no external action, no crossed risk boundary.**

14. **`c14` — records and Git protection.** This brief is committed alone to claim the
    number; the completion commit stages only this task's exact paths by name. Nothing
    is cleaned, stashed, reset, broadly staged or history-rewritten. `git log` is
    re-read immediately before every write to a shared path, not only before a commit.

15. **`c15` — owner gate 3.** In a disposable fixture project and an isolated test
    profile, one complete request → pushback/question → proposal → approval →
    working/checking → DONE or STOPPED → evidence → commentary route, put on the owner's
    screen as rendered surfaces rather than code. **This check is the owner's judgment
    and cannot be self-answered.** The task's own disposition does not depend on it; the
    plan's gate does.

## What DONE and STOPPED mean here

**DONE** means all of `c1`–`c14` hold in this lane's tree, measured by the commands
above and reported with their real output; the result, run, evidence, history and push
surfaces read as one Cairn conversation; `chat-column-villager` exists nowhere in
`app/src/**`; and nothing lost its skin, proved from computed styles in the running app
rather than argued from the stylesheet. `c15` is put in front of the owner with exact
safe steps, and its answer is theirs.

**STOPPED** means any of these, stated plainly with the state preserved: a regression
the slice cannot fix inside its own boundary; a check that cannot be made to pass
without changing behaviour the boundary protects; the unit failure **set** differing
from the baseline in any way this task caused; a needed action crossing a concrete risk
boundary; or protected work changing unexpectedly.

A pre-existing red stays a pre-existing red and is named as such with its evidence —
`builder-proposal-conversation.spec.ts` is already failing on `main` with
`TASK232_SELECTION_REFUSED` from `src/main/builderreviewroutefixture.ts:22`, and the
nine documented unit failures in `builderlivetransport.test.js` and
`buildertrackedtext.test.js` are not this task's to fix.
