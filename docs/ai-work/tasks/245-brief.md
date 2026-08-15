# Task 245 brief - make the unsealed candidate readable when a critic has accused it

**Lane:** A (the main checkout). **Base commit:** `dde2662`.

This is not part of the Gauntlet plan's slice list. It is the readability
repair the owner descoped out of Task 244, and it is the third time they have
raised the same complaint about this one screen. Tasks 240, 243 and 244 reports
are prerequisite reading.

## The observed failure

Shown Task 244's captures - an allegation with its confirm and dismiss choices,
and the post-repair candidate - the owner judged `c12` and failed it:

> "It's not good enough for a beginner, but I am going to have another agent
> work on making everything more beginner friendly, so let's focus on having it
> work for right now."

Task 244 recorded three specific confusions and did no readability work after
that instruction. They are this task's subject:

1. **A finding contradicts itself on screen.** A `not_met` finding renders as
   `c1 not met` in amber (`app.css:2671`, `:2713`, both keyed on
   `[data-judgment="not_met"]`) immediately above Cairn's own line saying
   "Cairn checked this one itself and it passed, so this is not something you
   need to answer." The sequence is right - allegation, then rebuttal - but a
   beginner scanning colour first reads the amber as fact when Cairn has in
   fact disproved it.
2. **The card is long, and nobody has measured it in this state.** It stacks
   the nonterminal sentence, what was asked, the promise rows in three voices,
   three folds, the second-opinion card - which itself carries the authority
   sentence, the findings, confirm/dismiss and possibly a repair offer - and
   then the two choices. Task 243 measured **881-899px** to the buttons with
   **no** critic answer on screen. With findings and a repair offer it is much
   longer again, and that figure does not exist.
3. **After a repair the card gains a fourth section above everything else.**
   `unsealed-candidate-repaired` is three paragraphs before "What you asked
   for".

**A fourth, found while reading the code for this brief.** At the reopened
pause `repairAvailable` is false, so a `not_met` finding against a row Cairn
has **not** disproved renders the amber `c2 not met` and its observation with
**nothing beside it at all** - no confirm, no dismiss, no explanation
(`CandidateCritique.tsx:217`). That is confusion 1 in its worst form: a live
accusation, in the colour of a failure, that the owner cannot act on and is
told nothing about. It is in scope because it is the same defect.

## Requested visible outcome

A complete beginner who reaches the unsealed candidate in ordinary Chat - with
a critic's findings on screen, before and after a repair - can tell, without
scrolling past the decision:

1. that Cairn has not finished this task, and what it needs from them;
2. which accusations are already settled and which are theirs to answer, with
   **no place where the colour says one thing and the words say the opposite**;
3. what confirming one would do, and that Cairn will try exactly once; and
4. what their two choices are, and why one of them is disabled.

Everything else stays exactly where Tasks 240 and 243 put it: still exact,
still attributed, one click away. Nothing is deleted.

## Design choices recorded before the work

These are AI decisions - presentation detail - recorded here so the work cannot
quietly drift into a wider one.

**1. An allegation and its answer are one thing on screen, not two.** A finding
against a row whose own `cairn-check` passed renders in a settled state whose
lead sentence carries both halves - what the reviewer claimed, and Cairn's own
disproof - with the reviewer's observation kept below it, attributed and quiet.
Nothing the reviewer said is removed. This is the minimum that stops a reader
from taking the accusation as the answer.

**2. The colour follows what is owed, not what was alleged.** Amber today means
"the critic said `not_met`". It will mean "this is live and yours to answer".
A finding Cairn settled, or the owner dismissed, or that nothing can now be
done about, is not amber. This is the actual fix for the contradiction: the
word "not met" is the critic's and stays, but Cairn's own evidence decides how
loud it is.

**3. Fold, do not delete.** Task 240's pattern, extended by Task 243, judged
and passed by the owner twice on this exact surface. Do not solve length by
deleting a fact, summarising with a model, moving evidence to another screen,
or making anything conditional on a setting.

**4. The reason a button is disabled sits with the button.** The owed line
("Answer c2 above before Cairn can finish this task.") renders **after** the
two buttons today (`UnsealedCandidate.tsx:286`), so a beginner meets a dead
Continue and only then the explanation. It moves above them. The string does
not change.

**5. The heading is the owner's word, not Cairn's.** "Unsealed candidate" is
this project's internal name for the pause. No test asserts the visible `h3`
text or the `aria-label`; both may become plain English. The class `.unsealed-candidate`
is the E2E's locator everywhere and does **not** change.

## Boundary of intent

These are load-bearing. Several are pinned by
`app/tests-unit/unsealedcandidatepaper.test.ts`, which has **10** guards. **If
a guard fires, reword the code - never relax the guard.**

- The nonterminal sentence "Cairn has not declared this task complete" and the
  four "what has not happened yet" statements: "No task report is written.",
  "No row is added to the work log.", "Nothing is committed.", "Cairn has not
  said DONE or STOPPED."
- The three separate voices per promise row - Cairn's own check, the worker's
  attributed claim, the owner's judgment - **may never be merged**, and none
  may stand where another belongs. They may be laid out more compactly.
- The provenance labels "checked by Cairn" and "reported, not checked", and the
  heading **"Files changed in your project"**, which must NOT become "Files the
  worker changed": Git's list includes Cairn's own task brief, so attributing
  it to the worker would be false. Guarded at `unsealedcandidatepaper.test.ts:37`.
- The frozen `cN` ids stay visible on every row and every finding.
- **Exactly three** `<details className="unsealed-candidate-fold">` remain
  (`unsealedcandidatepaper.test.ts:54`). The three folds may not be merged into
  one, and the record may not be nested a second click deep.
- The promise rows stay above every fold; the folds close, then the critic
  offer, then the two choices (`:71`, `:73`).
- **The critic offer stays ABOVE the two buttons.** Task 241 stopped because it
  rendered below and the owner passed it without seeing it. Guarded by
  `compareDocumentPosition` in two places in `conductor.spec.ts` and by
  document order in the paper test. Any control added here must not push it
  below them.
- `candidate.repairAsked` stays before `candidate.choices.map` (`:105`).
- The correction is still the critic's own observation:
  `onRepair(finding.checkId, finding.observation)`, and there is still no
  `<input`, `<textarea` or `contentEditable` anywhere on the surface (`:96`, `:97`).
- Continue stays disabled while an owner row is unanswered, **with the owed row
  named**.
- `UnsealedCandidate.tsx` and `CandidateCritique.tsx` import nothing from
  `main/` and use no `fetch`, `spawn` or `exec`.
- **No Core behaviour changes. This is presentation.** No file under `core/`,
  `app/src/main/` or `app/src/shared/` is touched. If a fact is hard to present
  well, that is a presentation problem to solve here, not a reason to stop
  producing the fact.
- The E2E depends on exact strings. Any that change must be updated in the same
  commit and **named individually in the report**. Currently asserted and known
  to be at risk: "checked this one itself", "Nothing was changed.", "This is
  the only repair for this task.", "runs every check again", "no second
  repair", "Answer c2 above before Cairn can finish this task.", "Cairn checked
  this", "reported, not checked", "needs your judgment", "You have not judged
  this yet.", "I checked this - it's done", "Not done", "Continue to Cairn's
  current checks", "Stop and keep the work for inspection".
- `toContainText` reads hidden text. Any assertion meaning "the owner can see
  this" must call `toBeVisible()` on the specific element. Use the
  `openCandidateFolds` helper in `app/tests/conductor.spec.ts`.
- Do not touch the result card, the Task Card before dispatch, the conductor,
  records, or any Gauntlet slice behaviour. Do not begin Slice 5 or 6.
- No provider, model, or credential work. **No real critic call - gate 3 stays
  unspent.** Install nothing, add no dependency, touch no `.env` or stored key.
- Take the app token before any app or Playwright run and release it in a
  `finally` **only if that run created it**.
- Stage task paths by exact name. Never `git add -A`.
- **Not yours:** the nine pre-existing Builder unit failures (baseline **934
  tests, 923 pass, 9 fail, 2 skipped** at `dde2662`), the red `cli` typecheck
  from Task 211, `conductor.spec.ts:3314`, and the full-suite worker-teardown
  `EPERM` that aborts long Playwright runs here.

## Checks

1. **`c1` - nothing on screen contradicts itself.** In no state does a
   finding's colour or wording present as a live failure a row Cairn's own
   check has passed. Proved by asserting the rendered state of the settled
   finding, and by the amber being bound to what is owed rather than to
   `data-judgment="not_met"`.
2. **`c2` - every allegation says what it is and what the owner may do.** Each
   of the four states is on screen in its own words: settled by Cairn's own
   check; the owner's to confirm or dismiss; dismissed by the owner; and - at
   the reopened pause - live but unanswerable because the one repair is spent.
   The fourth is new and is named in the report as an addition, not a
   renumbering of this list.
3. **`c3` - the three voices stay separate and attributed**, the provenance
   labels survive, and "Files changed in your project" is unchanged.
4. **`c4` - the order that Task 241 stopped for still holds.** The critic offer
   is above the two buttons, proved by the existing `compareDocumentPosition`
   checks in both places, with the folds open and shut. All **10** paper guards
   pass **unrelaxed**.
5. **`c5` - the decision is reachable, measured in the states nobody has
   measured.** Through the ordinary Chat route at 1440x2400, the distance from
   the top of the candidate to its buttons is measured and reported for three
   states: findings on screen, a repair offered, and after a repair. Each
   carries a before figure taken by me on this baseline and an after figure. A
   number that has not moved is a failed check, not a small one.
6. **`c6` - nothing was deleted.** Every fact the card shows today is still
   present and still exact - the changed-path list, the bounded evidence line,
   the worker's whole account, the four nonterminal statements, every finding's
   observation, the notes block and the full disclosure fold - asserted on
   **visible** elements after opening every fold.
7. **`c7` - the decision still behaves exactly as it did.** Continue is
   disabled while an owner row is unanswered with that row named, the owed line
   now reads above the buttons, dismissing still changes nothing, confirming
   still dispatches nothing on its own, and there is still exactly one repair.
8. **`c8` - no Core behaviour changed.** `git diff --stat dde2662` names only
   `app/src/renderer/` files and their tests. Nothing under `core/`,
   `app/src/main/` or `app/src/shared/` is modified.
9. **`c9` - focused machine checks pass**, each named in the report with its
   exact command and its real result, against the baselines above.
10. **`c10` - the owner can read it.** Under the app token, ordinary-route
    offscreen disposable-profile captures show the allegation with its choices,
    the repair offer, and the post-repair candidate, with the decisive controls
    asserted in viewport before each shot. The owner answers: "Could someone
    who knows nothing about this project look at this and tell what is being
    claimed, what Cairn has already settled, what is still theirs to answer,
    and what their two choices are?"

## DONE and STOPPED

**DONE** means the outcome above holds through the ordinary Chat path against
the fixture conductor, `c5` carries real measured reductions in all three
states, `c10` carries the owner's own words, all 10 checks are answered
honestly in the report, and exact-path commits leave the main checkout clean.

**STOPPED** means the screen cannot be made readable without merging the three
voices, deleting a fact, relaxing a guard, moving the critic offer below the
buttons, or changing Core - in which case say exactly which one and stop,
because every one of those is a worse outcome than a screen that reads poorly.

The milestone does not move here. This is a repair, not a slice.
