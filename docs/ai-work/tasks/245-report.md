# Task 245 report - make the unsealed candidate readable when a critic has accused it

**Lane:** A (the main checkout). **Base commit:** `dde2662`.
**Brief claim commit:** `83f481f`.

The readability repair the owner descoped out of Task 244 when they failed its
`c12`.

## Outcome

The candidate screen no longer contradicts itself, and no longer prints the
same sentences twice.

An accusation Cairn's own check has disproved is not painted like a live
failure any more. Amber follows what is still **owed** rather than what was
alleged, so the one amber `not met` on the screen is the one row that is
genuinely the owner's to settle - and it now says why it is theirs. Cairn's own
answer to the other accusation is folded away under a line that states how many
there are and who settled them; one click shows the reviewer's exact words with
Cairn's rebuttal above them, as one settled thing rather than two contradictory
ones. Two states that used to render an amber accusation with **no** confirm,
no dismiss and no explanation beside it at all now say what they are.

The card also stopped repeating itself: the accepted request was printed once
under "What you asked for" and again a hundred pixels lower as the `cN` rows,
word for word. It is now rendered once, and the reason Continue is disabled
reads **above** the disabled button instead of under it.

| State | Before | After | Change |
|---|---|---|---|
| A critic's findings on screen | **968px** | **800px** | **-168, -17.4%** |
| A repair offered | **1,072px** | **880px** | **-192, -17.9%** |
| After a repair | **1,024-1,043px** | **894px** | **-130 to -149, ~-13%** |
| No critic answer (Task 243's own figure) | 881-899px | **782px** | -99 to -117 |

**Nothing was deleted.** Every fact is still produced and still rendered.

## What actually changed

Five files, all presentation and its tests. **No Core file, no `main/` file and
no `shared/` file was touched** - `git diff --name-only` returns nothing outside
`app/src/renderer/` and the two test files.

- `app/src/renderer/components/CandidateCritique.tsx` - a finding now has one
  derived **state** that drives both its words and its colour; the settled fold;
  the two silent states given words.
- `app/src/renderer/components/UnsealedCandidate.tsx` - the plain heading, the
  request de-duplication, the owed line above the buttons, and the repaired
  banner as one paragraph instead of a fourth section.
- `app/src/renderer/app.css` - amber rebound to `data-owed`, the settled fold's
  styling, and a density pass across the stacked blocks.
- `app/tests-unit/unsealedcandidatepaper.test.ts` - **one added guard**, named
  as an addition rather than renumbering the brief's checks. 10 guards became
  11; **none of the 10 was relaxed, reworded or skipped.**
- `app/tests/conductor.spec.ts` - the `c5` measurement helper, the settled
  fold's both-ways assertions, the computed-colour assertions, the owed-line
  document-order check, the de-duplication assertions, the `no-repair-left`
  assertion, and one new capture.

No provider, model, credential, network, dependency, external write, push or
deployment occurred. Gate 3 is still unspent and no real critic call was made.

## The decisions, and why

**1. The colour follows what is owed, not what was alleged.** This is the whole
of the owner's first confusion. `app.css` keyed amber on
`[data-judgment="not_met"]`, so a row Cairn had run and watched pass was painted
in exactly the same amber as a live failure, directly above Cairn's own line
disproving it. A reader scanning colour first read the opposite of what Cairn
had found. Amber now keys on `[data-owed="yes"]`, which is true only for the
four states where the row is genuinely unsettled. The reviewer's word "not met"
is still on screen, unchanged - Cairn's own evidence decides how loud it is,
not whether it is said.

**2. One derived state per finding, not a ladder of conditions.** The old
render made the same decision three times over in nested ternaries, and two of
its branches fell through to `null` - which is how an amber accusation with
nothing beside it shipped. `findingStateFor` decides once, returns one of eight
states, and every state has words. A future state that forgets its words is a
missing map entry, not a silent blank.

**3. Cairn's settled answers are folded, not deleted.** Task 240's pattern,
extended by Task 243, judged and passed by the owner twice on this surface. The
summary line carries the whole of what is behind it - how many, and that Cairn
settled them itself - so the fold conceals nothing and the reviewer's exact
words are one click away. Proved both ways: **not** visible while shut, visible
after one click.

**4. The accepted request is rendered once.** Every promise row is one part of
the accepted request, so the section above the rows was printing the outcome
and every requirement a second time, a hundred pixels earlier. That is the "a
lot of information being thrown at me" the owner reported, in its most literal
form.

This is a de-duplication and not a deletion, and it is written so it cannot
decay into one: the section is skipped only while **every** one of its own
texts is matched against a promise row's own text. It is decided from what the
rows actually say, not from an assumption about how they are derived, so the
moment the rows stop covering the request the section returns by itself. A
promise-free run has no rows, so it keeps today's card exactly.

**This is an addition to the brief's list, not one of the three confusions it
named.** It was found by looking at the capture, and it is disclosed here as an
addition.

**5. The reason a button is disabled reads before the button.** "Answer c2
above before Cairn can finish this task." rendered *after* the two choices, so
a beginner reading top to bottom met a Continue that would not press and only
then the sentence explaining why. It moved above them. The string is unchanged.
This costs about 26px on `c5`'s own metric and was taken anyway.

**6. The heading is the owner's word.** "Unsealed candidate" is this project's
internal name for the pause and was the first thing on the card. It is now
"Cairn is waiting for you". The `aria-label` matches the visible heading; the
`.unsealed-candidate` class - which every test and every stylesheet locates
this card by - is untouched.

## Check results

### `c1` - nothing on screen contradicts itself: PASSED, measured

Asserted from the **computed colours in the running app**, not from the source
and not from the capture, because the defect was a colour:

- the settled row's judgment word is **not** the same colour as the live row's;
- inside the settled row, Cairn's answer and the reviewer's superseded claim
  are **not** the same colour either - the answer carries the operative ink.

The second of those was itself a defect I introduced and caught from the
capture: my first version made Cairn's rebuttal bright but left the reviewer's
claim brighter still, which is the same inversion in tone that the amber made
in colour. Fixed, and now asserted rather than eyeballed.

### `c2` - every allegation says what it is and what the owner may do: PASSED, with one state untested

| State | What it says | Proved by |
|---|---|---|
| settled by Cairn's own check | "Cairn checked this one itself and it passed, so there is nothing here for you to answer" | E2E, fold opened, `[data-dismissed-by="cairn"]` visible |
| the owner's to settle | "Cairn cannot check this one itself - is the reviewer right?" plus both buttons | E2E, `.candidate-critique-ask` visible |
| dismissed by the owner | "You decided this is fine. Nothing was changed." | `dismissing an allegation changes nothing at all` |
| the one repair is spent | "This task's one correction has already been used, so Cairn cannot ask for another." | E2E at the reopened pause, `[data-dismissed-by="spent"]` visible |
| another row holds the repair | "Cairn's one correction is already being decided on another row." | **not tested - see below** |

**Honest gap:** the fifth state needs two open rows alleged at once, and the
ordinary-route fixture has exactly one open row. It previously rendered
nothing at all and now renders a sentence; that is an improvement I have
reasoned about and not exercised. It is named in the limitations.

### `c3` - the three voices stay separate and attributed: PASSED

The promise rows were not restructured. `the Task Card promises, Cairn checks
them itself, and the owner answers their own row` passes unmodified, asserting
`Cairn checked this`, `reported, not checked`, `needs your judgment`, `You have
not judged this yet.` and both owner buttons on the rows themselves. The paper
guard pins the rows above every fold. `Files changed in your project` and
`checked by Cairn` are unchanged, and the guard forbidding "Files the worker
changed" passes.

### `c4` - the order Task 241 stopped for still holds: PASSED

Task 241's `compareDocumentPosition` check passes unmodified in both places -
in `the owner approves one review and reads findings tied to the frozen rows`,
and in the Slice 2 test with all three folds open. The paper guard's own
document-order assertion (`folds close, then {critique}, then the two choices`)
passes. All **10** original guards pass **unrelaxed**; the 11th is this task's
addition.

### `c5` - the decision is reachable, in the three states nobody had measured: PASSED

Measured through the ordinary Chat route at 1440x2400 with two promise rows, by
`reachToButtons` in the run output - the distance from the top of
`.unsealed-candidate` to the top of `.unsealed-candidate-actions`. Before
figures are my own measurement of the same probe on `dde2662` with the product
code unchanged.

The table is in "Outcome" above. Where it went, from a per-section probe I ran
on the baseline and then removed:

| Change | Effect |
|---|---|
| Cairn's settled finding folded | **-77px** |
| the request rendered once instead of twice | **-97px** |
| the repaired banner as one paragraph, no heading | **-66px** (that state only) |
| density pass across the stacked blocks | **-35px** |
| the owed line moved above the buttons | **+26px**, taken deliberately |
| the new "is the reviewer right?" line | **+20px**, taken deliberately |

**Honest variance:** across runs the third figure read 894, 894 and 876. The
~18px spread is the same one Task 243 recorded and attributed to the cost
line's port number changing length between runs; I did not prove that either,
so treat it as 876-894. The before figure for that state also read 1,024 and
1,043 on two baseline runs, so its reduction is stated as a range.

### `c6` - nothing was deleted: PASSED

- Task 243's fold assertions pass unmodified: all three folds opened, and the
  changed-path list, the bounded evidence line, the worker's whole account and
  all four "what has not happened yet" statements asserted on **visible**
  elements.
- The settled fold is proved both ways - `not.toBeVisible()` while shut,
  `toBeVisible()` after one click - and the reviewer's own observation asserted
  visible and exact inside it.
- The accepted request's two texts are asserted **visible on the rows that
  answer them**, so "rendered once" is a checked claim.

The new guard was then **mutation-tested three ways**. Each mutation was
applied to the real component, the guard recompiled and re-run, and the file
restored and confirmed byte-identical against a backup taken first:

| Mutation | Guard fired? |
|---|---|
| Drop the request section outright | **yes** |
| Decide coverage from a constant instead of the rows' own text | **yes** |
| Stop rendering the requirements at all | **yes** |

### `c7` - the decision still behaves exactly as it did: PASSED

Continue is still disabled on an unanswered owner row with that row named, and
a new document-order check asserts the reason now precedes the button.
Dismissing still spawns no worker, spends no call and leaves both choices as
they were. Confirming still dispatches nothing without its own separate press.
The reopened pause still offers no confirm and no repair. All asserted by the
two Task 244 tests, which pass unmodified in substance.

### `c8` - no Core behaviour changed: PASSED

`git diff --name-only dde2662` returns five paths, all under
`app/src/renderer/` or `app/tests*`. Nothing under `core/`, `app/src/main/` or
`app/src/shared/`.

### `c9` - focused machine checks: PASSED, with the known unrelated reds

| Command (from `app/`) | Result |
|---|---|
| `npx tsc --noEmit` | **PASS** |
| `npx tsc -p tsconfig.unit.json` | **PASS** |
| `node --test dist-unit/tests-unit/*.test.js` | **935 tests, 924 pass, 9 fail, 2 skipped** |
| `node --test dist-unit/tests-unit/unsealedcandidatepaper.test.js` | **11 pass, 0 fail** |
| `npm run build:vite` | **PASS** |
| `npx playwright test tests/conductor.spec.ts --workers=1 -g "unsealed candidate\|Task Card promises\|failing Cairn check\|cancelling at the Task Card\|one review and reads findings\|skipping asks nobody\|refused review\|confirms one allegation\|dismissing an allegation"` | **11 passed (2.9m)** |

The app-unit baseline at `dde2662` was 934 / 923 / 9 / 2 - **Task 244's own
measurement, not mine**; what I measured is the 935 / 924 above, which is that
baseline plus the one guard this task adds, and the arithmetic is the only
check I ran on it. The nine failures are unchanged and are the Task 224/231/233
Builder machinery the brief names as out of scope; I read their names out of
the run rather than assuming: exact live transport, preflight drift, the Novita
fp8 ZDR endpoint shape, redirect/wrong-route refusal, the tracked-text
selector, the tool-free fake, file identity drift, selected context custody,
and fixed request identities. **None is mine.**

**The full Core serial suite was not run.** It takes about 20 minutes and this
task touched **no Core file at all**. Every behaviour `c7` names is proved by
the ordinary-route E2E above. A reader who wants the deeper proof should run
`npm test -w @cairn/core`.

Every app and Playwright run took the app token with
`mkdir /c/Users/KenJL/AppData/Local/Temp/cairn-app-token` and released it only
because that run created it.

### `c10` - the owner can read it: AWAITING THE OWNER

Four captures, all taken by Playwright from the ordinary Chat route in the
offscreen disposable-profile lane, under the app token, with the decisive
controls asserted `toBeInViewport()` before each shot so a future crop fails
the test rather than reaching the owner:

- `%TEMP%\cairn-task-244-allegation.png` - a critic has accused both rows;
- `%TEMP%\cairn-task-245-settled-opened.png` - the same screen with Cairn's own
  settled answer opened;
- `%TEMP%\cairn-task-244-repair-offer.png` - the owner confirmed, one repair
  offered;
- `%TEMP%\cairn-task-244-repaired-candidate.png` - after the repair.

Playwright, not the owner, exercised every press.

## A note on Task 244's close

Task 244's work was finished but **entirely uncommitted** when this task began:
19 modified files and an untracked `244-report.md` in the main checkout, on no
branch anywhere, and with no `LOG.md` row. Its session ended after the owner's
`c12` judgment without committing. On the owner's decision I closed it first at
`dde2662` - its own files and its own report, unedited, plus a log row I wrote
from that report - so that this task's diff could be isolated from it. Without
that, my changes and Task 244's would have shared three files and no exact-path
commit could have separated them.

Two things in Task 244's records are worth a later reader's attention, and I
did not edit another task's report to fix them: its `c11` table carries an
unreplaced `CORE_SUITE_RESULT` placeholder where the Core full-suite result
should be, so that cell records nothing; and its own brief repeats the handoff's
wrong guard count, which its report corrects.

## How to try it

```
npx playwright test tests/conductor.spec.ts --workers=1 -g "confirms one allegation"
```

Run it from `app/`. It prints the three `[Task 245 c5]` measurements and writes
the four captures named above. Take the app token first with
`mkdir %TEMP%\cairn-app-token` and remove it after; close your own Cairn window
first, since the app and its end-to-end tests share one profile.

## Limitations and remaining owner decisions

- **`c10` is the owner's and is not yet answered.** Everything else holds.
- **One finding state is reasoned about but not exercised**: the "another row
  is holding the one repair" case needs two open alleged rows at once, and the
  fixture has one. It rendered nothing before and renders a sentence now.
- **The measurements are one viewport and one shape of task.** 1440x2400 with
  two promise rows, matching the baselines. A task with twenty rows would still
  produce a long screen; the rows are the decision, so folding them was never
  an option.
- **The de-duplication is text equality.** A request whose wording is
  transformed on the way to a row would fail the match and print both sections,
  which is the safe direction - redundant, never missing.
- **No real critic call was made.** Gate 3 is unspent. This is not evidence
  that a real critic works, and it does not close Task 241's `c9`/`c10`.
- Inherited and still open: an owner who chooses nothing on the Task Card gets
  a promise-free run with no warning, no critic offer and no repair; and Cairn's
  own root `package.json` declares none of the three menu scripts, so on Cairn
  itself the check menu is empty. **That remains a Slice 5 precondition and is
  still not met.**
- The milestone did not move. This is a repair, not a slice.

**Disposition: STOPPED - waiting on the owner's `c10` judgment.** `c1` through
`c9` all hold through the ordinary Chat path against the fixture conductor. The
work is committed so it cannot be lost the way Task 244's nearly was; this
report is updated and the disposition settled the moment the owner answers.
