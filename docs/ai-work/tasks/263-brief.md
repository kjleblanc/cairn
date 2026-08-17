# Task 263 brief — questions, proposals, approvals and the operational papers

**Lane:** A (the main checkout), owner-confirmed free. **Base commit:**
`6b6295a`. **Slice:** 6 of 11 in
`docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`.

**This task was renumbered TWICE, and both reasons are disclosed rather than
tidied away.** A second session was working the same checkout, and the two of us
raced for a number three times in ten minutes.

1. **261 → 262.** The other session claimed 261 at `e9242d4` for the
   owner-verdict document repairs; that commit landed on `main` in the minutes
   between this task's enumeration and its write, and this task then used a
   whole-file write on a path it had verified free earlier, **overwriting their
   brief** (`e0b4272`). Their brief was restored byte-exact from `e9242d4`
   (blob `5b3c3ac5`, verified by hash on `main` afterwards) in `6b6295a`.
   Nothing of theirs was lost.
2. **262 → 263.** While this task was renumbering to 262 on `main`, that session
   was independently renumbering to 262 on its own new branch. Their claim
   `ae29482` is timestamped `11:47:52`; this task's `6b6295a` is `11:48:36`.
   **They were first by 44 seconds**, so under AGENTS.md the later claimant —
   this task — moves again, to 263.

**Two lessons, for whoever reads this next.**

- Enumerating the free numbers and writing the brief are two moments, and `main`
  moves between them when another session is live. Re-read `git log`
  **immediately before the write**, not only before the commit — and never use a
  whole-file write on a task path.
- A number verified free can be claimed by someone else *while you are claiming
  it*. Neither session did anything wrong the second time; the checkout was the
  problem. That session has since moved into its own worktree (`.lanes/i`,
  branch `lane/i`), which is what AGENTS.md asks for and what stops this.

**A merge hazard this leaves behind, for the `lane/i` session.** `lane/i`
branched from `e0b4272` — the commit carrying the overwrite — so on that branch
`docs/ai-work/tasks/261-brief.md` holds **this task's** Slice 6 text, while on
`main` it holds **your** owner-verdict text, restored. When `lane/i` lands, that
path will conflict: **take `main`'s side.** 261 stays a consumed number carrying
your superseded claim; your live brief is 262.

**Number claimed by this commit.** Immediately before this write, every filename
beginning with a number was listed across `main`, `lane/i`, every other local and
remote branch, and every worktree working directory: the run is unbroken
`001`–`262` and `263` occurs nowhere. The evidence-spec repair at `cf6033b`
claimed no number.

There is no owner gate at the end of this slice. The next owner judgment is
gate 3, at the end of Slice 7.

## The requested visible outcome

Questions, pushback, task proposals, quality review, dispatch disclosure,
connection consent, the critic/repair/harness pauses and the lab-only Builder
proposal review read as one decision family on the paper Slice 5 built. One
hierarchy throughout: **decision first, effect and reason and recovery next,
complete details on demand, actions last.** The next owner action and its
consequences are visually obvious.

## What the read-only audit settled before any file was opened

**This slice is two problems, not one.**

Only three surfaces are inside the `chat-column-villager` hook — the question
card, the task card with its intent rows, and the dispatch panel. That is
**88 rules and 95 selector-list entries**: 19 on the task card (app.css
972–1042), 44 on the dispatch panel (1872–2027), 23 on the question card
(2033–2119), one hiding the bubble-only duplicate of the active question, and
two in the last reduced-motion block. Slice 5's recipe applies to them
directly.

**Six of this slice's surfaces also render on TaskRun, which is Slice 7's
screen.** `TaskReviewView`, `TaskSpecProposalPreviewView`, `CriticCallCard`,
`RepairCallCard`, `HarnessRevisionCard` and `DisclosureConfirm` are mounted by
both `Chat.tsx` and `TaskRun.tsx`, and their rules are **unscoped** — they only
re-tone inside the conversation because the column re-points `--card`, `--line`,
`--muted` and `--stop`. `visualtokens.test.ts` requires every selector in
`surfaces.css` to be anchored on an `.rp-` class, so they cannot be moved there
unscoped. **They get `.rp-conversation`-anchored rules and their unscoped
originals stay for TaskRun until Slice 7 migrates it.** That is a deliberate,
temporary duplication, forced by the guard rather than chosen, and it is
recorded here so it is not rediscovered mid-slice.

**Three decision pauses post-date the plan's path list.** `TaskPromiseCard`,
`UnsealedCandidateCard` and `CandidateCritiqueCard` arrived in Tasks 238–245.
They are owner decisions, they render only inside the conversation, and leaving
them in the retired language beside restyled siblings would read as broken.
They are **in scope**, disclosed as an addition to the plan's list — the same
way Slice 2 added `chatmock-view.tsx` by sweeping consumers rather than trusting
the list.

**The intent row exists three times and this slice owns two.** It is styled
inside `.task-card` (with fills), inside `.dispatch-panel` (flat), and a third
time inside `.result-card-request-body` — Slice 7's receipt, near-identical to
the dispatch copy. This slice writes ONE shared rule set with the task-card
variation as an override, leaves the receipt's copy alone, and the report and
handoff tell Slice 7 to delete its copy in favour of the shared one rather than
porting it. Reaching into the receipt's interior here is the mistake the Slice 5
discipline exists to prevent.

**`.card` is rendered by sixteen files**, every screen included, and
`conductor.spec.ts` finds the connect card with `locator(".card", …)`. No global
`.card` restyle. Every existing class name stays; `rp-` classes are added beside
them, exactly as Slice 5 did.

## The boundary of intent

**Every approval boundary survives unchanged.** Unsent question drafts, defer
and set-aside choices, busy state, callback identity, focus movement, and the
exact provider/model/project/data/cost copy. **A prettier card must never look
already approved, executed, applied, published, verified or terminal.**

**Task 229's contract is absolute.** The Builder proposal review stays lab-only,
literal-text, no-callback, no-control, no-route, nonterminal and authority-free.
Its qualification pins hard facts: `borderLeftWidth` exactly `"5px"`, and
**zero** elements inside the card matching `a, button, input, textarea, select,
option, form, label, details, summary, iframe, object, embed, audio, video,
canvas, img, svg, style, script, [href], [src], [for], [role], [tabindex],
[contenteditable=true]`; nothing focusable; no navigation or network request on
interaction; no horizontal overflow at 1280 or 600, single column at 600. **No
`role=`, no SVG mark and no `<details>` fold may be added to that card**, and a
changed border is a Rewritten disposition with a stated reason, never a quiet
edit.

The dormant Task-Spec candidate route and Builder proposal activation stay dark
or output-only. Existing critic, repair and harness approval surfaces stay
exactly as active and reachable as they are today.

Nothing under `core/**`, `cli/**`, `src/main/**`, IPC, preload, stores, the phone
page, package manifests or lockfiles. No `.cairn` data read, written or deleted.
No dependency install, provider or model call, credential use, paid call,
external-service write, push, publication or deployment. No registered worktree
created, deleted, reused, reset or moved. Every tracked, staged, modified and
untracked path is protected, including the untracked evidence under
`app/test-results/` and `app/shots/`.

## Checks

Each check has a stable id. Commands are run from `app/` unless stated.

1. **`c1` — the decision family's own rules leave the hook.** The 88 hooked
   rules are gone from `app.css` and exist in `surfaces.css` anchored on
   `.rp-conversation`. The boundary guards pass unchanged: every new selector
   anchored, `app.css` declaring no `.rp-` selector **in a rule or a comment**,
   production markup carrying `rp-` classes, tokens declared only inside an
   `.rp-` scope, and the breakpoint census across the three new sheets still
   exactly `{820, 1260}`. The eight rules currently behind `max-width: 620px`
   move to 820 px, because 620 sits below the supported 760 px minimum.

2. **`c2` — every component's behaviour is unchanged, measured.** Before any
   edit, strip the VALUE of every `className` out of each component this slice
   touches and hash the rest; re-run afterwards and report the entire diff.
   Callbacks, gates, refs, effects, busy flags and focus moves must not move.

3. **`c3` — one hierarchy, and nothing reads as already acted on.** Decision,
   then effect/reason/recovery, then details on demand, then actions. Asserted
   per surface, and seen in the captures under `c9`.

4. **`c4` — Task 229's contract holds.** The dedicated browser qualification
   green, the literal-text and no-action-seam proofs green, and no production
   consumer added.

5. **`c5` — native controls, keyboard, and target size.** Native semantics and
   accessible names unchanged; focus rings drawn and measured by **tabbing**
   from real computed styles; every interactive target in the decision family at
   44 × 44 from real bounding boxes. The question card's actions currently pin
   `min-height: 40px`, which is below that floor: raising it is recorded as a
   Rewritten disposition with its reason.

6. **`c6` — long disclosure, long model, path and outcome text contain
   themselves** at 1320×980, the supported minimum 760×620 and the test-only
   540×900 stress. The page never scrolls sideways and the paper never widens.

7. **`c7` — nothing moves that the owner did not cause.** No perpetual motion;
   reduced motion reaches the identical end state; and no transform on a
   container holding interactive controls — `motion.css`'s `chat-arrive` still
   slides and scales `.task-card`, which this slice owns.

8. **`c8` — measured contrast, with the decision surfaces brought under
   `contrast.spec.ts`.** Slice 5 gave that file a connected conversation and the
   fixture machinery to reach a proposal; this slice widens that scenario rather
   than writing a third. Two disabled-opacity defects already in this family are
   fixed and re-measured: `.task-card-actions .pill-primary:disabled`
   (`opacity: .68`) and `.question-card-controls input:disabled` (`opacity: .5`),
   plus the `transition: opacity` on the question card's actions.

9. **`c9` — every semantic state, seen.** Captures of the real built app for
   question, pushback, proposal with and without a concern, quality review,
   dispatch disclosure, connection consent, a critic pause and the Builder
   proposal review, at wide / minimum / stress in both themes, into
   `app/shots/task261/` — never `test-results/`.

10. **`c10` — a disposition for every old visual test that moved**, Preserved,
    Rewritten or Replaced, each with its reason. The blast radius is wider than
    the plan's list: `conversationpaper.test.ts` (thirteen task-card selectors
    Slice 5 deliberately left behind), `resultreceipt.test.ts` (one intent row),
    and **`evidencepresentation.test.ts`, which carries eight assertions on the
    same class families UNSCOPED** and which a scoped grep misses.

    Three guards that go quiet rather than red are repaired while their files
    are open, each with a positive `-1` assertion: `questionpaper.test.ts:112`
    (**already dead on `main`** — its marker
    `".chat-column-villager .question-card,"` has zero occurrences in `app.css`,
    so its ordering assertion has been vacuously true), `dispatchpaper.test.ts:116`
    (live today, silent the moment its one-line marker is reformatted or moved),
    and `repaircallpaper.test.ts:32` (an empty slice satisfies every
    `doesNotMatch` on it).

11. **`c11` — the app compiles, builds and tests as it did.**

    ```powershell
    npm.cmd run typecheck
    npm.cmd run test:unit
    npm.cmd run build:vite
    npm.cmd run build:lab
    node --test dist-unit/tests-unit/residentprogramboard.test.js
    node --test tests-qualification/resident-program-bundle-dark.test.mjs
    node --test tests-qualification/builder-proposal-bundle-dark.test.mjs
    node ./node_modules/@playwright/test/cli.js test --config playwright.builderproposal.config.ts
    ```

    The unit failure SET is diffed by full test title against a baseline
    **re-derived in this lane before the first edit**, not against the
    1036 / 1025 / 9 / 2 in the handoff. `dist-unit/` is removed first if any
    test source is deleted.

12. **`c12` — targeted E2E under the exact mutex protocol.** Both token
    locations acquired with `mkdir`, ownership recorded, released in a `finally`
    that also covers the launch. One invocation per scenario, `workers: 1`,
    `--output=test-results/task261-runner`, with `test-results/` backed up first
    and its hashes verified after. The proposal, question, set-aside, dispatch,
    critic and Builder-review scenarios in `conductor.spec.ts` and
    `builder-proposal-conversation.spec.ts`, plus `contrast.spec.ts`.

13. **`c13` — no dependency, no external action.** No install, provider or model
    call, credential, paid call, network beyond loopback, external-service
    write, push, publication or deployment.

14. **`c14` — records and Git protection.** This brief is committed alongside
    the byte-exact restoration of the other session's Task 261 brief and nothing
    else; the completion commit stages only this task's exact paths, by name.
    Nothing is cleaned, stashed, reset, broadly staged or rewritten, and the
    erroneous 261 claim stays in the log. Because a second session is live in
    this checkout, `git log` is re-read immediately before **every** write to a
    shared path, not only before a commit.

## DONE and STOPPED

**DONE** means the decision family is drawn by the approved paper language, one
hierarchy is visible across all of it, every approval boundary and Task 229's
contract are intact, every check above has a real recorded result, the unit
failure set is unchanged from the re-derived baseline, and no component's
behaviour moved.

**STOPPED** means an approval boundary could not be preserved through the
restyle, a restyled card could be mistaken for one already acted on, a contrast
floor could not be met without changing an approved colour, or a concrete risk
boundary was reached.
