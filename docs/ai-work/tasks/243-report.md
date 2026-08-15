# Task 243 report - make the candidate screen readable by a beginner

**Lane:** A (the main checkout). **Base commit:** `d4c0df3`.
**Brief claim commit:** `d4c0df3`.

A repair task, raised by the owner twice from real use of the ordinary Chat
route, and a precondition for Slice 5 of
`docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md`.

## Outcome

The unsealed candidate now puts the decision first. What the owner meets is the
nonterminal sentence, what they asked for, both `cN` rows in three separate
voices, the offer of a second opinion, and their two choices with the owed row
named. The exact record - Git's changed-path list, the bounded evidence line,
the worker's whole account, and the four "what has not happened yet"
statements - is three one-line folds, still exact, still attributed, one click
away.

**Nothing was deleted.** Every fact the long card carried is still produced by
the same projection and still rendered from it.

The distance from the top of the card to its two buttons fell from **1,378
pixels to 881**, and the whole card from **1,509 pixels to 1,012**.

## What actually changed

Four files, all presentation and its tests. **No Core file was touched**, and
neither was `main/`, `shared/`, the projection, `boundedEvidenceSummary`, the
result card, the Task Card, the conductor, or records.

- `app/src/renderer/components/UnsealedCandidate.tsx` - the three evidence
  sections became three native `<details className="unsealed-candidate-fold">`
  inside their existing `<section>` wrappers, so every `aria-label` landmark
  and every existing CSS hook survives. The summary lines carry the provenance
  labels themselves, so who is speaking is legible before anything is opened,
  and the changed-files summary carries the count.
- `app/src/renderer/app.css` - the fold styling, copied from the pattern the
  owner already passed on the critic card, including
  `list-style-position: inside`, which Task 240 learned the hard way: the card
  has a left rule and no left padding, so an outside marker renders past the
  card's edge and clips.
- `app/tests/conductor.spec.ts` - the `c1` measurement, the `c2` fold-opening
  assertions, the `c5` re-check with folds open, the `c8` capture, and one new
  `openCandidateFolds` helper. Two existing tests were updated to open the
  folds; see "Two tests that would have kept passing while proving less".
- `app/tests-unit/unsealedcandidatepaper.test.ts` - **one added guard**, named
  as an addition rather than renumbering the brief's checks.

## The design choice, and why it was not re-litigated

The brief recorded it before the work: **fold, do not delete.** That is Task
240's pattern on this exact product surface - a few plain sentences on the
first screen and a native `<details>` carrying every exact number - and the
owner judged and passed it there. Extending a proven pattern beat inventing
one. A fold keeps Cairn honest: the evidence is still on the screen the owner
is looking at. No model summarises anything, nothing moved to another screen,
and nothing is conditional on a setting.

## Check results

### `c1` - the decision is reachable without wading: PASSED

Measured through the ordinary Chat route, in the same test that carries the two
promise rows, at **1440x2400**, in the state the owner actually meets first
(`c2` still unanswered, folds shut). The measurement is the distance from the
top of `.unsealed-candidate` to the top of `.unsealed-candidate-actions` - what
must be scrolled past before a choice can be made - taken with
`getBoundingClientRect()` inside `win.evaluate`.

| | Before | After |
|---|---|---|
| Top of card to top of buttons | **1,378px** | **881px** |
| Whole card | **1,509px** | **1,012px** |

Both figures fall by **497px, about 36%**. The "before" numbers are my own
measurement of the unfolded card through the same probe, not a figure carried
over from the brief; the brief's 1,510 is the card height, which my probe read
as 1,509.

The test asserts `toButtons` is under 1,000 and logs the real number, so the
figure is in the run output rather than only in this report.

**Honest variance:** across three runs the measurement read 899, 899 and 881.
The 18px spread is real. I believe it is the cost line wrapping differently as
the fixture's port number changes length between runs
("at the prices 127.0.0.1:55404 publishes today"), but I did not prove that,
so treat the number as 881-899 rather than exact.

### `c2` - nothing was deleted: PASSED, and mutation-proved

The E2E asserts each fold is shut, **opens all three**, and then asserts every
fact on a **visible** element rather than on the card's text content - because
`toContainText` matches hidden text, so a collapsed `<details>` would have let
"still there" mean "still in the DOM":

- the changed-path list, including `visible.txt` and
  `docs/ai-work/tasks/001-brief.md`;
- the bounded evidence line, key by key - `Bounded worker evidence:`,
  `agentMessageCount=1`, `exitCode=0`, `reasoningOutputTokens=20`;
- the worker's disposition, summary, changes, checks and limitations;
- all four "what has not happened yet" statements.

The added source guard was then **mutation-tested three ways**, because a green
guard proves nothing about whether it has teeth. Each mutation was applied to
the real component, the compiled guard re-run, and the file restored from a
backup and confirmed byte-identical:

| Mutation | Guard fired? |
|---|---|
| Delete the bounded evidence render | **yes** |
| Turn one fold into a plain `div` | **yes** |
| Move the critic offer above the folds | **yes** |

### `c3` - the three voices stay separate and attributed: PASSED

The promise rows were not restructured at all - Cairn's own finding, the
worker's attributed claim, and the owner's judgment are the same three
elements in the same order, and the section stays on the first screen. The E2E
asserts `Cairn checked this`, `Cairn ran npm run typecheck and it passed`,
`reported, not checked`, `Codex Exec says: ...`, `needs your judgment` and
`You have not judged this yet.` on the rows themselves. The added guard pins
the rows above every fold, so no future change can put a voice behind a click.

The heading `Files changed in your project` is unchanged and still carries
`checked by Cairn`. It did not become "Files the worker changed": Git's list
includes Cairn's own task brief, and the E2E now asserts that brief path is in
the list, which is exactly why the heading must not blame the worker.

### `c4` - the pinned sentences and provenance labels survive: PASSED

All **10** `unsealedcandidatepaper` guards pass - the 9 that existed and the 1
this task added. **None was relaxed, reworded or skipped.**

Every string the brief named is unchanged, and none needed a test update:

`Cairn checked this`, `reported, not checked`, `needs your judgment`,
`You have not judged this yet.`, `I checked this - it's done`, `Not done`,
`Continue to Cairn's current checks`, `Stop and keep the work for inspection`,
`Answer c2 above before Cairn can finish this task.`

So are `Cairn has not declared this task complete`, `No task report is
written.`, `No row is added to the work log.`, `Nothing is committed.`,
`Cairn has not said DONE or STOPPED.`, `Files changed in your project` and
`checked by Cairn`.

### `c5` - the second opinion is still above the decision: PASSED

Task 241's `compareDocumentPosition` check passes unmodified in
`the owner approves one review and reads findings tied to the frozen rows`. The
Slice 2 test now runs the same check a second time **with all three folds
open**, so opening the record cannot reorder the offer and the decision. The
added source guard pins the same order a third way: folds close, then
`{critique}`, then `candidate.choices.map`.

### `c6` - every Slice 1, 2 and 3 behaviour still holds: PASSED

Nine ordinary-route Playwright tests, all passing, covering each named
behaviour:

- disabled Continue with its named owed row - `the Task Card promises, Cairn
  checks them itself, and the owner answers their own row`;
- `TASK_PROMISE_NOT_MET` - `a failing Cairn check stops the run even though the
  worker claims it passed`;
- honest STOPPED - `stopping at the unsealed candidate writes an honest STOPPED
  record, commits nothing, and keeps the work`;
- the byte-identical close for a promise-free run - `ordinary Chat pauses at an
  unsealed candidate...` end to end, plus the result-card byte-identity literal
  at `app/tests-unit/resultcard.test.ts:364`, which passes untouched.

### `c7` - focused machine checks: PASSED, with the known unrelated reds

| Command (run from `app/`) | Result |
|---|---|
| `npx tsc --noEmit` | **PASS** |
| `npx tsc -p tsconfig.unit.json` | **PASS** |
| `node --test dist-unit/tests-unit/*.test.js` | **927 tests, 916 pass, 9 fail, 2 skipped** |
| `node --test dist-unit/tests-unit/unsealedcandidatepaper.test.js` | **10 pass, 0 fail** |
| `npm run build:vite` | **PASS** |
| `npx playwright test tests/conductor.spec.ts --workers=1 -g "unsealed candidate\|Task Card promises\|failing Cairn check\|cancelling at the Task Card\|one review and reads findings\|skipping asks nobody\|refused review"` | **9 passed (3.5m)** |

The unit baseline before this task was 926 / 915 / 9 / 2. This task adds one
test and one pass. **The nine failures are unchanged and are not mine** - the
Task 224/231/233 Builder machinery the brief names as out of scope: exact live
transport, preflight drift, the Novita fp8 ZDR endpoint shape, redirect/wrong
route refusal, the tracked-text selector, the tool-free fake, file identity
drift, selected context custody, and fixed request identities.

Every app and Playwright run took the app token with
`mkdir /c/Users/KenJL/AppData/Local/Temp/cairn-app-token` and released it only
because that run created it.

### `c8` - the owner can read it: PASSED, in the owner's own words

The capture is the whole candidate, taken by Playwright from the ordinary Chat
route in the offscreen disposable-profile lane, under the app token, in the
state the owner meets first: folds shut, `c2` still owed. Continue, Stop **and**
the critic offer are each asserted `toBeInViewport()` before the shot, so a
future crop fails the test rather than reaching the owner.

Asked whether someone who knows nothing about this project could read the
screen and know what happened, what is still owed, and what their two choices
are, the owner answered: **"Passes."**

Playwright, not the owner, exercised every press.

## Two tests that would have kept passing while proving less

`toContainText` reads hidden text. The moment three sections went behind
`<details>`, two existing assertions became weaker without failing:

- `ordinary Chat pauses at an unsealed candidate...` asserted `visible.txt`,
  `Added the visible result.` and `Codex Exec says: DONE` on the whole card;
- `a failing Cairn check stops the run...` asserted `Codex Exec says: DONE` the
  same way.

Both would have gone on passing while proving only that the strings were in the
DOM. Both now open the folds and assert on the specific visible element. This
is disclosed because the suite got quietly weaker for the length of one commit,
and a later reader should know the assertions were strengthened deliberately
rather than drifting.

One further test change: `the Task Card promises...` gained
`await candidate.scrollIntoViewIfNeeded()` before its in-viewport assertions.
It had relied on a viewport resize to bring the buttons into frame; with the
card shorter and the resize happening earlier, that side effect no longer
fired. Scrolling explicitly is what Task 240 already does and does not weaken
the assertion.

## The base commit, and a second lane

Task 241 was still open in this checkout when this task began, with its work
uncommitted. The owner chose to close it STOPPED rather than spend the gate-3
call. While I was verifying that 241's offline half was green, **another
session working this same checkout committed both `dd5a2a1` (241 closed
STOPPED, with its report and log row) and `d4c0df3` (this brief claimed)**. I
had made no commit. Nothing was lost - the uncommitted work became those two
commits - and the owner confirmed that session had finished before I continued.

I verified 241's offline half myself before it closed, and those results stand:
Core `critique` + `taskcard` **50/50**, app `tsc --noEmit` clean, focused
critic E2E **3/3**.

This is recorded because two lanes in the main checkout is exactly what the
contract's lane rules forbid, and the next reader should know the base commit
arrived that way.

## How to try it

```
npx playwright test tests/conductor.spec.ts --workers=1 -g "the Task Card promises"
```

Run it from `app/`. It prints the real measurement as
`[Task 243 c1] to buttons=...px whole card=...px` and writes the capture to
`%TEMP%\cairn-task-243-readable-candidate.png`. Take the app token first with
`mkdir %TEMP%\cairn-app-token` and remove it after; close your own Cairn window
first, since the app and its end-to-end tests share one profile.

## Limitations and remaining owner decisions

- **The full Core serial suite was not run.** It takes about 20 minutes and
  this task touched **no Core file at all** - the diff is four app files. Every
  behaviour `c6` names is proved by the ordinary-route E2E and the app unit
  suite above. A reader who wants the deeper proof should run
  `npm test -w @cairn/core`.
- **`c1`'s number is 881-899px, not a single figure.** See the variance note
  under `c1`.
- **The measurement is one viewport and one shape of task.** 1440x2400 with two
  promise rows is the shape the 1,510px baseline was recorded at, so before and
  after are comparable, but a task with twenty promise rows would still produce
  a long first screen. The rows are the decision, so folding them was never an
  option; if that shape turns up in real use it is a new task.
- **The three folds are shut by default and Cairn does not remember otherwise.**
  An owner who wants the detail every time must click every time.
- Inherited and still open: an owner who chooses nothing on the Task Card gets
  a promise-free run with no warning and no critic offer; and Cairn's own root
  `package.json` declares none of the three menu scripts, so on Cairn itself
  the check menu is empty. That remains a Slice 5 precondition.
- The milestone did not move. This was a repair, not a slice.

**Disposition: DONE**
