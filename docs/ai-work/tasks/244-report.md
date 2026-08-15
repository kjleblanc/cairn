# Task 244 report - confirm one allegation, permit one repair, then seal

**Lane:** A (the main checkout). **Base commit:** `46715d8`.
**Brief claim commit:** `c9caf3b`.

Slice 4 of `docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md`.

## Outcome

A critic finding that says a frozen `cN` row was not met is now something the
owner can act on, in ordinary Chat, on the candidate screen they already know.

Cairn answers first, for the rows it can: an allegation against a row whose own
`cairn-check` passed is dismissed by Cairn itself, on screen, and the owner is
never offered a button for it. What is left is theirs. They can dismiss it -
which calls nobody and changes no file - or confirm it, which offers **one**
repair, naming the worker and the exact correction. Pressing it dispatches the
same worker a second time inside the same still-open run. Cairn then refreshes
Git's facts, the worker's claims and **every** original check, and shows the
candidate again with repair no longer on offer and every owner row owed afresh,
before it seals `DONE` or `STOPPED`.

**Gate 3 is still unspent. No real critic call was made here.** Everything
below is proved against the fixture conductor at the transport seam Slice 3
built. This DONE does not close Task 241's `c9`/`c10`.

**`c12` FAILED.** See below - the owner judged the screen and it is not good
enough for a beginner.

## The owner's judgment on `c12`, and their decision

Shown the two captures, the owner answered:

> "It's not good enough for a beginner, but I am going to have another agent
> work on making everything more beginner friendly, so let's focus on having it
> work for right now."

That is a failed check, recorded as one. The owner then made a scope decision:
readability is not this task's to fix, and is going to a separate effort. No
readability work was done after that instruction. The specific confusions found
while looking at the captures are written down for whoever takes it:

- A finding renders as `c1 not met` in amber directly above Cairn's own line
  saying it checked that row itself and it passed. The sequence is right -
  allegation, then rebuttal - but a beginner scanning colour first may read the
  amber as fact.
- The card now stacks the nonterminal sentence, the request, the promise rows
  in three voices, three folds, the second-opinion card (which itself carries
  allegations, confirm/dismiss and possibly a repair offer), and then the two
  choices. Task 243 measured 881-899px to the buttons with **no** critic answer
  on screen; with findings and a repair offer it is much longer again.
- After a repair the card gains a fourth section above everything else.

## What actually changed

**14 production files and 5 test files.** That is above the 10-13 I estimated
when the owner made the scope call under the plan's anti-drift rule 6, and it
is disclosed here because they decided on the smaller number.

Core (7):

- `core/src/serial.ts` - the `repair` continuation, the second dispatch, and
  the verification loop. See "One loop, not a second ladder" below.
- `core/src/critique.ts` - `SerialCandidateRepairRequestV1`, its fail-closed
  parser, and `serialCandidateAllegationOpen`.
- `core/src/routing.ts` - optional `repair` on the live v3 contract.
- `core/src/codex.ts` - the repair instructions in the worker prompt.
- `core/src/kimi.ts` - the same lines, mirrored, so a repair means the same
  thing whichever worker Cairn routes it to.
- `core/src/records.ts` - the `## The one repair you approved` section.
- `core/src/index.ts` - exports.

App (7):

- `app/src/shared/unsealed-candidate.ts` - the third press, the repair shape,
  two exact key sets on the one channel, and `unsealedCandidateOpenRowIds`.
- `app/src/main/unsealedcandidate.ts` - the repair settlement and the
  allegation whitelist.
- `app/src/main/tasks.ts` - `allegationsFor`, and the hook's repair answer.
- `app/src/renderer/components/CandidateCritique.tsx` - confirm/dismiss per
  finding, and the repair offer.
- `app/src/renderer/components/UnsealedCandidate.tsx` - the repaired-candidate
  section.
- `app/src/renderer/screens/Chat.tsx` - `askUnsealedCandidateRepair`, wiring.
- `app/src/renderer/app.css` - styling, using only defined tokens.

Tests (5): `core/test/critique.test.ts` (+8, 28 to 36),
`core/test/serial.test.ts` (+11 repair cases),
`app/tests-unit/unsealedcandidate.test.ts` (+6, 13 to 19),
`app/tests-unit/unsealedcandidatepaper.test.ts` (+1 guard, 9 to 10), and
`app/tests/conductor.spec.ts` (+2 ordinary-route tests and two helpers).

No provider, model, credential, network, dependency, external write, push,
deployment, Q9 activation, calibration or persistence was touched.

## The decisions, and why

**1. The correction is the critic's own observation, carried verbatim.** There
is no text input anywhere on this surface - the added guard asserts the absence
of `<input`, `<textarea` and `contentEditable`. "A repair cannot widen the
task" is therefore a fact about the shape rather than a promise about
behaviour, the same way Task 240 made "a finding names only a frozen row" a
fact about positional binding.

**2. Cairn dismisses what its own evidence already disproved.** Section 5 of
the plan says a finding blocks only after deterministic evidence or the owner
confirms the exact failure. So a `not_met` against a row whose `cairn-check`
**passed** is refused by Core, refused again by Main, and never offered on
screen. Only rows Cairn has no passing evidence for - the owner's own, a check
that failed, a check Cairn stopped, and a selected check the project can no
longer answer - can be confirmed.

**3. The repair request lives in `core/src/critique.ts`, not `taskcard.ts`.**
The correction is a critic observation, so it must obey the critic's own
display cap and character rules. Putting it beside them means the two cannot
drift; putting it in `taskcard.ts` would have duplicated
`SERIAL_CRITIQUE_TEXT_CAP` and `FORBIDDEN_TEXT_RE`.

**4. The pause reopens rather than sealing blind.** The owner's row judgments
from the first pause are discarded: they judged code that has since changed.
This cost almost nothing because Main already mints a fresh checkpoint per
pause (`app/src/main/tasks.ts:1449`), so the second candidate screen, its
refreshed rows and the second critic offer all follow from machinery that
already shipped.

**5. The renderer holds the confirm/dismiss state; Main whitelists the words.**
Dismissing calls nobody and changes nothing, so it needs no channel. That makes
the renderer exactly the surface that could invent a correction - so
`allegationsFor` hands Core only the `not_met` sentences a critic really sent
for that exact checkpoint, and a repair naming anything else is refused before
it can become a dispatch. Proved by `a correction no critic ever sent Cairn
cannot be dispatched`, which forges three shapes including the real observation
with a sentence appended.

## One loop, not a second ladder

The repair had to re-verify everything: parse the worker result, the
owned-records gate, protected work, and every project check. The cheap way is a
second copy of that ladder at the repair site. The copy would drift.

Instead the whole post-dispatch block is now wrapped in one `for (;;)`, and the
repair branch is the only thing that loops; every other path returns. A
repaired tree therefore meets **exactly** the same verification the first
attempt met, by construction. That is what `c7` asserts and what a duplicate
could not guarantee.

The cost is that `git diff core/src/serial.ts` looks enormous. It is mostly
re-indentation:

```
git diff -w --stat core/src/serial.ts   ->  126 insertions(+), 9 deletions(-)
```

Read the diff with `-w` and the real change is 126 lines.

## Three defects of my own, all in the test

The product needed no correction during this task. All three defects were mine,
in the new end-to-end test, and each cost a run.

**1. My critic fixture cited no evidence, and Slice 3 correctly refused it.**
`core/src/critique.ts:164` refuses any `met`/`not_met` finding citing no packet
artifact - Task 240's rule that an unsupported opinion never arrives dressed as
a verdict. My fixture gave both `not_met` findings `evidenceRefs: []`, so Cairn
produced one honest `unavailable` and my test waited for an `answered` that was
never coming. **The rule working, caught by my mistake rather than despite it.**
Fixed by citing `a2`, the worker's own account.

**2. A click race.** Pressing `Ask for one review` before the asynchronous
price lookup settles lets the card reflow under the pointer, and Playwright's
actionability wait then has no bound but the test timeout. Two runs burned five
minutes each and reported a bare timeout with no failing assertion. Fixed by
adopting Task 240's own pattern in a helper: settle the cost line, scroll,
assert enabled, then press.

**3. Prompt assertions written from the wrong fixture.** I asserted the frozen
row texts as `The page title changed.` / `The numbers were kept.`, which are
the **unit** fixture's wording. The ordinary-route conductor fixture says
`Change the page title` / `Keep the counts 74, 477, 256 exactly.`
(`conductor.spec.ts:4834`).

**And one false alarm I raised and had to withdraw.** Mid-diagnosis I read a
fake-worker prompt file off disk by hand, saw no repair lines, and stated that
the repair dispatch never tells the worker what to correct - a product defect.
It was not. I had caught a stale mid-run snapshot; Playwright's own assertion
output showed the three repair-prompt assertions had passed and only my bogus
row text had failed. **Verify against the artifact the test asserts on, not a
file fetched by hand.**

## A correction to the handoff

`app/tests-unit/unsealedcandidatepaper.test.ts` contains **9** tests at
`46715d8`, not the 10 that `docs/ai-work/HANDOFF-gauntlet-slice4.md` and Task
243's report both state. Verified with `git show HEAD:...| grep -c "^test("`
and by running it: 9 tests, 9 pass. This task adds one, so it is 10 now. My own
brief repeated the wrong number; briefs are history and were not rewritten.

## Check results

### `c1` - dismissal changes nothing: PASSED

`dismissing an allegation changes nothing at all` presses Dismiss through the
ordinary route, then asserts the worker spawn count is still 1, the critic call
count is unmoved, no repair block exists, and both choices are exactly as they
were - Continue still disabled on the owner's owed row. The sealed report
contains neither `## The one repair you approved` nor the allegation's text.

### `c2` - Cairn dismisses what it has already disproved: PASSED

Proved at two layers. Core: `a repair against a row Cairn's own check already
passed is refused`, and `a repair against a row Cairn's own check proved is
refused by the runner`, which drives a whole run and asserts no second dispatch
happened. UI: the E2E asserts `[data-dismissed-by="cairn"]` is visible on `c1`
with the words `checked this one itself`, and that `c1` carries **no** confirm
button at all.

### `c3` - repair needs a confirmation and its own approval: PASSED

The E2E asserts the worker spawn count is still 1 after confirming, and only
moves to 2 after the separate `Ask for this one correction` press. No path
reaches a dispatch from a finding alone.

### `c4` - the repair cannot widen the task: PASSED

Core's `a repair cannot widen the task: same accepted request, same rows, same
brief` asserts the second contract carries the same `requestSha256`, the same
`intent`, the same frozen `promises`, and that the brief file on disk is
**byte-identical** before and after. The E2E asserts the real repair prompt
contains the correction verbatim, `the only correction`, `Do not widen the
task`, and both original row texts unchanged.

### `c5` - no nested run; the original run stays authoritative: PASSED

The repair is dispatched from inside the pause at `core/src/serial.ts:7525`,
through the same `chosen` adapter, with `options.signal`, while the run holds
its lock and start snapshot. `runSerialTask` is not re-entered. Proved
behaviourally by the run completing as one run with one set of records, and
structurally by the loop being inside the existing `if (!demo)` block.

### `c6` - one repair, and only one: PASSED

Core's `one repair, and only one: the reopened pause offers none and cannot
spend another` answers `repair` at **both** pauses and asserts
`repairAvailable` is true then false, that the worker ran exactly twice, and
that the second repair press falls through to the honest
`OWNER_STOPPED_AT_CANDIDATE` - because a choice this pause never offered is not
a continue. The E2E asserts no confirm or repair button exists on the reopened
pause, even though the second critic repeats the same allegation.

### `c7` - everything is refreshed before the seal: PASSED

Core's `a confirmed allegation dispatches one repair, and Cairn's own check
answers again` moves Cairn's own `c1` finding from `failed` to `passed` across
the repair - which can only happen if the check really ran again - and asserts
the refreshed claims and that Git's changed-path list no longer carries the
removed file. `the owner's row judgments do not survive a repair` asserts the
owner row is `pending` again at the reopened pause and that continuing without
re-answering stops `TASK_PROMISE_NOT_MET`. The E2E asserts Continue is disabled
again after the repair.

### `c8` - five endings close honestly: PASSED

| Ending | Test | Result |
|---|---|---|
| repair works | `a confirmed allegation dispatches one repair...` | `DONE` |
| repair regresses a passing check | `a repair that breaks a check which had passed stops the run` | `STOPPED` / `TASK_PROMISE_NOT_MET`, nothing staged |
| repair's worker fails | `a repair whose worker fails closes honestly and never DONE` | `STOPPED` / `ADAPTER_FAILED`, nothing committed, first attempt's edits retained |
| critic unavailable | `a refused review is reported honestly` (Task 240, unmodified) | honest `unavailable` |
| owner stops at the reopened pause | `one repair, and only one...` | `OWNER_STOPPED_AT_CANDIDATE` |

### `c9` - the envelope still owns terminal truth: PASSED

`the record says a repair happened, what it corrected, and that Cairn
rechecked` asserts the report carries `## The one repair you approved`, the row
id, the correction, and Cairn's own sentence `Cairn ran every check again
afterwards`. The E2E additionally asserts the sealed report does **not** carry
the allegation Cairn dismissed - nothing the critic said stands as Cairn's own
finding. The critic gained no new power: `app/src/main/critique.ts` is
unchanged by this task.

### `c10` - every Slice 1, 2 and 3 behaviour still holds: PASSED

All **10** paper guards pass, **none relaxed**. Task 243's folds are untouched
and its `openCandidateFolds` helper still drives them. Task 241's
`compareDocumentPosition` ordering check passes unmodified. Core's `a run
nobody repairs reaches exactly the close it reaches today` asserts a
promise-free run's `reportText`, `row` and `composed` are equal to a run with
no checkpoint at all - the byte-identical close, preserved.

### `c11` - focused machine checks: PASSED, with the known unrelated reds

| Command | Result |
|---|---|
| `core: npm run build` | PASS |
| `core: npm test` (full suite) | **507 tests, 497 pass, 0 fail, 10 skipped** — but see "The Core suite failed once" below |
| `app: npx tsc --noEmit` | PASS |
| `app: npx tsc -p tsconfig.unit.json` | PASS |
| `app: node --test dist-unit/tests-unit/*.test.js` | **934 tests, 923 pass, 9 fail, 2 skipped** |
| `app: npm run build:vite` | PASS |
| `app: npx playwright test tests/conductor.spec.ts --workers=1 -g "confirms one allegation\|dismissing an allegation"` | **2 passed (21.2s)** |
| `app: npx playwright test tests/conductor.spec.ts --workers=1 -g "one review and reads findings"` | **1 passed (10.7s)** |

The app-unit baseline was 927 / 916 / 9 / 2. This task adds 7 tests and 7
passes; the nine failures are unchanged and are the Task 224/231/233 Builder
machinery the brief names as out of scope. Every app and Playwright run took
the app token with `mkdir /c/Users/KenJL/AppData/Local/Temp/cairn-app-token`
and released it only because that run created it.

The new test prints its own phase timeline, so a later slow or hung step names
itself instead of appearing as one timeout:

```
[Task 244] start: +0ms
[Task 244] first candidate: +6465ms
[Task 244] first findings: +63ms
[Task 244] repair offered: +247ms
[Task 244] repaired candidate: +1085ms
[Task 244] second offer: +163ms
[Task 244] second findings: +658ms
[Task 244] result card: +1099ms
```

## The Core suite failed once, and I could not reproduce it

**The first full `npm test -w @cairn/core` run FAILED.** The visible dump was a
test asserting `expected: null` that received a whole run result carrying
`stopReason: 'PROTECTED_WORK_CHANGED'` and a `SerialCandidateV1` with
`repairEligibility` and `criticMode: 'required'` — the Q6/Q9 candidate
subsystem, which is `runSerialTaskToCandidate` and not the `runSerialTask`
block this task changed. I lost the test's name to my own `tail -15`.

What I then established, and what I did not:

- Every Core file passes **in isolation**: `serial.test.js` alone is 195 tests,
  189 pass, **0 fail**, 6 skipped; `candidate.test.js` is 36/32/0/4; the other
  16 files and both `.mjs` files are all zero-fail.
- The full suite **passed on re-run**: 507 tests, 497 pass, 0 fail, 10 skipped.
- `npm test` runs all nineteen files in ONE `node --test` invocation, which
  parallelises across files over heavy git I/O in temp directories.

So the honest statement is: **the suite failed once under concurrency, every
file is green alone, and a second full run was green. I never named the failing
test and never proved whose it was.** A single green re-run is not proof the
suite is stable, and this should not be read as one. If it recurs, the next
session should capture the WHOLE output — not a `tail` — and settle ownership
by rebuilding at `c9caf3b`, this task's brief-only commit.

The handoff warns that the Core suite is slow and I/O-bound. It does not warn
that its concurrent full-suite run can fail where every file passes alone.
That is the sharper warning, and it is recorded here.

## This report was committed by another session, mid-write

While I was still running verification, **a second session working this same
main checkout committed this task's work as `dde2662` and then claimed Task 245
as `83f481f`** and began editing `CandidateCritique.tsx`,
`UnsealedCandidate.tsx`, `app.css`, `conductor.spec.ts` and
`unsealedcandidatepaper.test.ts`. I made neither commit.

`dde2662` therefore captured this report with the literal placeholder
`CORE_SUITE_RESULT` still standing in the `c11` table, because the Core suite
had not finished. This commit replaces that placeholder with the real result
and adds the section above. Nothing else in the record was rewritten.

Two consequences a later reader should know:

- **The E2E results in `c1`-`c11` were measured before Task 245's edits.** They
  were true of `dde2662`. Task 245 changes these same screens and owns
  re-proving them; my assertions on wording (`checked this one itself`, the
  confirm and dismiss button labels) are exactly the ones its work will move.
- This is the second time this has happened in this checkout — Task 243's
  report records the first. **Two lanes in one checkout is what the contract's
  lane rules forbid**, and it is why this task's own completion commit was not
  made by the session that did the work.

### `c12` - the owner can read it: FAILED

Recorded above in the owner's own words, with the specific confusions written
down and handed to a separate effort by the owner's decision.

## How to try it

```
npx playwright test tests/conductor.spec.ts --workers=1 -g "confirms one allegation"
```

Run it from `app/`. It prints the phase timeline above and writes three
captures to `%TEMP%\cairn-task-244-allegation.png`,
`cairn-task-244-repair-offer.png` and `cairn-task-244-repaired-candidate.png`.
Take the app token first with `mkdir %TEMP%\cairn-app-token` and remove it
after; close your own Cairn window first, since the app and its end-to-end
tests share one profile.

## Limitations and remaining owner decisions

- **`c12` failed and is not fixed here.** The screens work; they are not yet
  readable enough for a beginner. That is now a separate task.
- **No real critic call was made.** Gate 3 is unspent and this task is not
  evidence that a real critic works.
- **The repair is only reachable on the live v3 contract.** The pause carries
  frozen rows only for v3, so a v4 Task-Spec run offers no repair. That matches
  where Slices 1-3 live and was not widened here.
- **The repair's own dispatch has no separate paid-call disclosure.** It reuses
  the worker the owner already approved for this task, under that approval. If
  a worker is ever priced per call, a repair will need its own gate.
- **A repair whose worker fails ends the task.** There is no second attempt by
  design, and the first attempt's edits are retained for inspection.
- Inherited and still open: an owner who chooses nothing on the Task Card gets
  a promise-free run with no warning and no critic offer - and now no repair
  either, for the same reason; and Cairn's own root `package.json` declares
  none of the three menu scripts, so on Cairn itself the check menu is empty.
  **That remains a Slice 5 precondition and is still not met.**
- The milestone did not move. Slice 5 is what tests the milestone.

**Disposition: DONE** - `c1` through `c11` hold through the ordinary Chat path
against the fixture conductor, and `c12` is recorded FAILED in the owner's own
words with readability descoped by their decision.
