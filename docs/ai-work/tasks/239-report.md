# Task 239 report - finish and prove Slice 2

**Lane:** A (the main checkout). **Base commit:** `64e75e4`.
**Brief claim commit:** `177cde6`.

Closes Slice 2 of
`docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md`, begun by Task
237 (Core engine) and Task 238 (app layer), both of which stopped.

## Outcome

In ordinary Cairn Chat, before dispatch, a **Task Card** now shows the accepted
outcome as `c1` and the accepted requirement as `c2`, each with a choice of how
it gets checked: a command Cairn runs itself from this project's own short menu,
or the owner's own eyes. After the worker, the same two rows appear on the
Unsealed candidate, each answered in three visibly separate voices - Cairn's own
check result, the worker's sentence attributed to the worker, and the owner's
judgment, which starts unanswered and which only the owner can give. The report
and the result card carry the same rows. **Continue stays disabled while an
owner row is unanswered**, and a run whose promise was not kept closes
`TASK_PROMISE_NOT_MET` rather than `DONE`.

The owner answered gate 2 from the two captured screenshots: **"Yes - all four
are clear."**

## What actually changed

App (6 files):

- `app/src/main/conductor/relay.ts` - the answered rows on the result card,
  added **only when there are any**, so a promise-free card stays byte-identical.
- `app/src/shared/ipc.ts` - `promises` made optional on `ResultCard`.
- `app/src/renderer/screens/Chat.tsx` - the result card's promise section, and
  the fix that sends `checkSelections` only when the owner actually chose.
- `app/src/renderer/components/TaskPromiseCard.tsx` - CSS classes renamed off
  the colliding `task-card`.
- `app/src/renderer/app.css` - the three surfaces' styles.
- `app/lab/mock-cairn.ts` - one field on its stub card.

Tests and fixtures (4 files):

- `app/tests-unit/unsealedcandidate.test.ts` - the 14 fixtures updated to the
  new contract, plus two new cases closing a gap found by mutation.
- `app/tests-unit/unsealedcandidatepaper.test.ts` - the Core containment guard
  updated to pin the new fail-closed shape, and **strengthened** with three
  further assertions.
- `app/tests/conductor.spec.ts` - three ordinary-route E2E cases.
- `app/tests/fixtures/fake-codex-env.ts` - the fake worker now answers its `cN`
  rows, which is what the prompt Task 238 wrote actually instructs a worker to do.

No Core source changed in this task. No provider, model, credential, network,
dependency, external write, push, deployment, Q9 activation, or persistence was
touched. No new preload channel or `CairnApi` method was added. No other lane's
worktree changed. The milestone did not move.

## Three real defects this task found and fixed

1. **A dispatch with no chosen checks was refused outright.** The renderer sent
   `checkSelections: {}` whenever the owner had chosen nothing, and Main
   correctly read an empty-but-present selection as incomplete and refused. No
   run started at all, which turned a Slice 1 E2E red. Now an empty selection is
   sent as absent - declining the card gives the run Cairn made before the card
   existed - while a *partial* selection still refuses, because opting in means
   answering every row.
2. **The new component's CSS class collided with the existing one.** I had named
   it `task-card`, which is the proposal card's class and the selector the E2E
   already uses. Renamed to `task-promise-card`.
3. **A legacy result card stopped being byte-identical.** Putting `promises: []`
   on every blank card added a key to cards that have nothing to say, which the
   `resultcard` guard caught. The key is now written only when there are rows, so
   saved conversations and existing readers see exactly the bytes they held
   before.

A containment guard also correctly rejected the word "seal" inside a comment I
had written in the renderer. I reworded the comment rather than relaxing the
guard.

## Check results

### `c1` - the 14 fixtures pass with every guard intact: PASSED

All Task 235 app unit tests pass. The guards were not weakened - the exact-keys
rule, the `answers` requirement and the settlement shape are unchanged, and the
paper guard gained three assertions.

Proved by mutation. Four deliberate breakages, and the exact test that caught
each:

| Mutation | Caught by |
|---|---|
| exact-keys no longer requires `ownerAnswers` | a malformed press is refused |
| any word accepted as an owner answer | a malformed press is refused |
| any row id accepted | a malformed press is refused |
| candidates no longer need `answers` | **GAP - nothing failed** |

The fourth was a genuine hole in the suite. I added
`a candidate Core did not mint is refused` cases for a missing and a non-array
`answers`, re-ran the mutation, and it is now caught.

### `c2` - the result card carries the same rows: PASSED

E2E asserts `.result-card-promises` contains "Cairn ran npm run typecheck and it
passed.", "You confirmed this yourself." and "reported, not checked", and the
report contains the matching `## Promises and how each was answered` section.

### `c3` - the Task Card appears before dispatch: PASSED

`the Task Card promises, Cairn checks them itself, and the owner answers their
own row` asserts `[data-row="c1"]` carries the outcome and `[data-row="c2"]` the
requirement, inside the ordinary dispatch panel, with the fixture conductor and
the fake-codex PATH shim at `CAIRN_MOCK=0` - no `CAIRN_TEST_Q9`, no marker, no
lab page.

### `c4` - cancelling makes zero worker calls: PASSED

`cancelling at the Task Card makes no worker call at all` - the shim's marker
file has zero spawns and `001-brief.md` does not exist.

### `c5` - approval invokes the worker once: PASSED

One spawn in the marker file, and a `DONE` report.

### `c6` - three separate voices: PASSED

The candidate row asserts all three: "Cairn ran npm run typecheck and it passed",
"Codex Exec says: I changed the page title" under "reported, not checked", and
"needs your judgment" on the owner's row.

### `c7` - an owner row cannot be auto-passed: PASSED

Continue is asserted **disabled** while `c2` is unanswered, with the visible
sentence "Answer c2 above before Cairn can finish this task", and enabled only
after the owner answers. Core's gate is the real guarantee and is proved
separately: `a failing Cairn check stops the run even though the worker claims it
passed` closes `TASK_PROMISE_NOT_MET`, commits nothing (HEAD unchanged), and
leaves `visible.txt` for inspection.

### `c8` - every earlier behavior still holds: PASSED

**The full `core/test/serial.test.js` ran to completion**: `node --test
dist/test/serial.test.js` - **185 tests, 179 passed, 0 failed, 6 skipped**,
1,752,612 ms (29 minutes). All three Slice 1 E2E cases pass alongside the three
new ones.

### `c9` - focused machine checks: PASSED, with the nine pre-existing failures

| Command | Result |
|---|---|
| `core: npx tsc` | PASS |
| `core: node --test dist/test/serial.test.js` | **185 tests, 179 pass, 0 fail, 6 skip** |
| `core: node --test dist/test/taskcard.test.js dist/test/records.test.js dist/test/claims.test.js dist/test/codex.test.js dist/test/kimi.test.js` | **102/102** |
| `app: npx tsc --noEmit` | PASS |
| `app: npx tsc -p tsconfig.unit.json` | PASS |
| `app: npm run build:vite` | PASS |
| `app: node --test dist-unit/tests-unit/*.test.js` | **907 tests, 896 pass, 9 fail, 2 skipped** |
| `app: npx playwright test tests/conductor.spec.ts --workers=1 -g "Task Card promises\|failing Cairn check stops the run\|cancelling at the Task Card\|unsealed candidate"` | **6 passed (1.1m)** |

The nine remaining app-unit failures are the pre-existing Task 224/231/233
Builder-transport ones in `builderlivetransport.test.ts` and
`buildertrackedtext.test.ts`, untouched here. I listed them by name from the
run rather than assuming the count: exact live transport, preflight drift, the
Novita fp8 ZDR endpoint shape, redirect/wrong-route refusal, the tracked-text
selector, the tool-free fake, file identity drift, selected context custody, and
fixed request identities. The red `cli` typecheck from Task
211 is likewise untouched. **The tenth failure seen mid-task was mine and is
fixed** - it was the legacy-card byte-identity guard above.

### `c10` - the owner can read both surfaces: PASSED, with the owner's own answer

Captured by the ordinary-route Playwright case from an owned disposable project
and the isolated offscreen E2E profile, under the app token, with no
visible-E2E marker and without touching the owner's real profile. The token was
taken with `mkdir` and released in a `trap` on every run.

My first capture was doubly inadequate and I redid it: the worker answered
neither row (the fake's claims predated the prompt change, so the "worker" voice
read "did not answer this" on both), and the sticky run bar clipped both
buttons - the same cropping failure Slice 1 hit. The fake now answers its rows
as the prompt instructs, the viewport was raised to 1440x2400, and the test
asserts `toBeInViewport()` on **both** buttons before the shot, so a future
crop fails the test rather than reaching the owner.

Presented in chat. The owner answered: **"Yes - all four are clear."**
Playwright, not the owner, exercised every press.

## How to try it

```
cd app
npx playwright test tests/conductor.spec.ts --workers=1 -g "Task Card promises"
```

Take the app token first (`mkdir %TEMP%\cairn-app-token`) and remove it after;
close your own Cairn window while it runs.

## Limitations and remaining owner decisions

- **Declining the card is silent.** An owner who chooses nothing gets a run with
  no promises and no warning. Requiring a choice before Start would make the
  card unignorable; it would also change every existing dispatch path, so it is
  recorded here rather than done unasked.
- **Cairn's own root `package.json` declares none of the three menu scripts**, so
  on Cairn itself the menu is empty today and every row falls to owner
  observation. Adding root `typecheck` / `test:unit` remains Slice 5's decision,
  for the reason Task 237 recorded: a root script that quietly skipped the red
  `cli` workspace would be a dishonest green.
- The menu is three fixed npm script names. Anything else needs a new task and,
  per the plan, a reason.
- No real conductor, worker, critic or provider call was made; both fakes sit at
  existing injectable seams.
- The nine pre-existing Builder failures and the red `cli` typecheck remain open
  and are not this slice's.
- Slice 2 is closed. **Slice 3 is not started**, and gate 2's answer is the
  plan's condition for considering it - not an approval of any critic call,
  which keeps its own separate gate.

**Disposition: DONE**
