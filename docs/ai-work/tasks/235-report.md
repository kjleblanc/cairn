# Task 235 report - pause ordinary Chat at one unsealed candidate

**Lane:** A (the main checkout). **Base commit:** `ecaa1de`.
**Brief claim commit:** `f02dac1`.

Slice 1 of `docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md`.

## Outcome

Ordinary Cairn Chat now stops before it writes anything terminal and shows an
**Unsealed candidate**. The owner sees the accepted request, the real changed
paths, the worker's statements labelled as the worker's, a plain sentence that
Cairn has not declared the task complete, and two choices. **Continue to
Cairn's current checks** resumes the existing terminal path exactly once.
**Stop and keep the work for inspection** writes an honest `STOPPED` record,
commits nothing, and leaves the worker's edits in place.

The pause lives inside the still-open `runSerialTask(...)` run. It holds the
same run lock, starting snapshot, chosen adapter, and abort signal while it
waits, so no second writer can take the run and the close it resumes into is
byte-for-byte the close a checkpoint-free run reaches.

The owner accepted the foreground-only recovery tradeoff before the brief was
claimed, and answered owner gate 1 (`c8`) from the captured screenshot.

## What actually changed

Core (3 files):

- `core/src/serial.ts` - one optional `onUnsealedCandidate` continuation on
  `SerialRunOptions`, the `SerialUnsealedCandidateV1` display projection, and
  the checkpoint itself, placed after the stop decision and before the DONE
  path. Adds the `OWNER_STOPPED_AT_CANDIDATE` stop reason.
- `core/src/records.ts` - one plain-words clause for that reason.
- `core/src/index.ts` - exports the new version constant and two types.

App (7 files, 3 of them new):

- `app/src/shared/unsealed-candidate.ts` (new) - the display projection, the
  two-choice decision request, and its exact-keys parser.
- `app/src/main/unsealedcandidate.ts` (new) - one pending pause per project,
  answered once. No process, network, filesystem, or Electron surface.
- `app/src/renderer/components/UnsealedCandidate.tsx` (new) - the card.
- `app/src/main/tasks.ts` - the checkpoint callback on the ordinary run and one
  `task:candidate-decide` handler.
- `app/src/shared/ipc.ts` - `RunSessionSnapshot.unsealedCandidate` and one API
  method.
- `app/src/preload.ts` - one channel.
- `app/src/renderer/screens/Chat.tsx` - renders the card and returns the
  choice.
- `app/src/renderer/app.css` - the card's styles.
- `app/src/shared/stopwords.ts` - the app-side mirror of the new clause.
- `app/lab/mock-cairn.ts` - one refusing stub, required because `CairnApi`
  gained a method.

Tests:

- `core/test/serial.test.ts` - 8 checkpoint cases.
- `core/test/records.test.ts`, `app/tests-unit/stopwords.test.ts` - the new
  reason added to both hand-maintained mirror lists.
- `app/tests-unit/unsealedcandidate.test.ts` (new) - 13 cases for the pause.
- `app/tests-unit/unsealedcandidatepaper.test.ts` (new) - 8 containment guards.
- `app/tests/conductor.spec.ts` - 3 ordinary-route Playwright cases.

No provider, model, credential, network, dependency, external write, push,
deployment, Q9 activation, persistence, or DELVE path was touched. No other
lane's worktree changed. The milestone did not move.

## Design decisions worth naming

**The pause is not an authority.** Answering `continue` grants nothing new: the
run is already open, already approved, already past its worker call, and the
choice only releases it into the close it was headed for. That is why there is
no grant, receipt, hash, brand, or custody protocol here - there is no spend or
irreversible effect for one to protect. The one-use `checkpointId` exists only
so a stale press cannot answer a live pause.

**Fail closed on every unclear path.** Core seals only on an exact `continue`;
anything else takes the honest STOPPED door. Main returns `stop` when there is
no window to ask or when it cannot vouch for the candidate. Cancel and renderer
loss both close honestly. A thrown continuation propagates: the run throws,
nothing terminal is written, and the workspace is left dirty for inspection.

**`changedPaths` is Git's answer, and includes Cairn's own brief.** The brief is
untracked at the checkpoint, so `changedSetForRecord` really does return it -
the same set the final result card carries. I kept that rather than filtering,
so the candidate and the result can never disagree about what changed, and the
card labels the list "Files changed in your project - checked by Cairn" rather
than attributing it to the worker. My first test asserted `["visible.txt"]`
alone; that was my guess about the helper, and I corrected the expectation to
the observed truth and additionally pinned it equal to `composed.filesChanged`.

**The renderer needed no new push channel.** Core emits its "waiting" activity
immediately before the callback, and Chat already refreshes the session on every
activity and polls once a second while a run is live.

## Check results

### `c1` - the ordinary route reaches the checkpoint: PASSED

Playwright drives ordinary Chat with the fixture conductor and the fake-codex
PATH shim at `CAIRN_MOCK=0` - both existing seams, no `CAIRN_TEST_Q9`, no
task-numbered marker, no lab page. The card shows the accepted request
("Change the page title", "Keep the counts 74, 477, 256 exactly."), the real
changed paths (`visible.txt`, which the worker really wrote), the attributed
claims ("Codex Exec says: DONE - this is the worker's own verdict, not
Cairn's"), and "Cairn has not declared this task complete".

Core-side, `the checkpoint carries the worker's real changed paths and its
attributed claims` pins the same facts.

### `c2` - nothing terminal exists before a choice: PASSED

At the checkpoint the E2E asserts no report file, an unchanged LOG, an
unchanged HEAD, zero `.result-card` elements, and that
`docs/ai-work/tasks/` contains exactly `["001-brief.md"]`. The Core test
`no report, log row, or commit exists while the checkpoint is open` asserts the
same four facts from inside the run.

### `c3` - Continue resumes the existing close exactly once: PASSED

`continue resumes the existing terminal close with exactly one worker call`
runs the same task twice - once with a checkpoint, once without - and asserts
identical `reportText`, `row`, `commit.status`, and `composed`, with one worker
invocation each. The E2E additionally asserts one worker spawn in the shim's
marker file, a DONE report, an appended log row, and a moved HEAD.

### `c4` - controlled Stop closes honestly: PASSED

Core: `stopping at the checkpoint writes an honest STOPPED record and commits
nothing` - `OWNER_STOPPED_AT_CANDIDATE`, HEAD unchanged, nothing staged,
`visible.txt` retained, exactly one appended log row. E2E: the same, plus the
card reads "you looked at the worker's changes and kept them without finishing
the task" rather than a bare code.

### `c5` - no failure can forge a terminal success: PASSED

Core: `a throwing checkpoint cannot leave a DONE record, log row, or commit
behind` (workspace left dirty and inspectable) and `a throwing checkpoint still
releases the run so the next task is not refused`. `the original run lock is
still held while the checkpoint waits` proves a competing `acquireRunLock`
fails `SERIAL_RUN_ACTIVE` while the pause is open. E2E: cancelling mid-pause
closes STOPPED and never DONE, with HEAD unchanged.

### `c6` - protected work stays intact: PASSED

The checkpoint is placed after Core's existing protected-work verification and
owned-records gate, so every existing protection still runs before the pause is
offered; `continue` re-enters the unchanged close. The full Core serial suite
(which contains the protected-work, dirty-start, and record-recovery cases)
passes with the checkpoint present.

### `c7` - focused machine checks pass: PASSED, with 9 unrelated failures disclosed

Commands and results:

- `core: npx tsc` - PASS.
- `core: node --test dist/test/serial.test.js dist/test/records.test.js
  dist/test/claims.test.js` - **202 tests, 196 passed, 0 failed, 6 skipped**
  (1,216,155 ms; this suite is genuinely ~20 minutes).
- `core: node --test test/contract-mirrors.test.mjs
  test/contract-check-ids.test.mjs dist/test/builder-intercom.test.js
  dist/test/quality.test.js dist/test/routing.test.js dist/test/lock.test.js` -
  **48 tests, 48 passed, 0 failed**.
- `app: npx tsc --noEmit` - PASS.
- `app: npx tsc -p tsconfig.unit.json` - PASS.
- `app: node --test dist-unit/tests-unit/*.test.js` - **907 tests, 896 passed,
  9 failed, 2 skipped**. All 21 new tests pass.
- `app: npm run build:vite` - PASS.
- `app: npx playwright test tests/conductor.spec.ts --workers=1 -g "unsealed
  candidate"` - **3 passed (27.9 s)**, under the app token.

**The 9 failures are not this task's and are not fixed here.** They are in
`app/tests-unit/builderlivetransport.test.ts` and
`app/tests-unit/buildertrackedtext.test.ts` - Task 224/231/233 Builder
machinery. Every failing test is one that expects a *successful* tracked-text
selection; every refusal test in those files still passes. Evidence that this
task did not cause them:

- `git diff --quiet HEAD` reports `app/src/main/buildertrackedtext.ts`,
  `app/src/main/conductor/builderreviewauth.ts`,
  `app/src/main/builderlivetransport.ts` and both test files **unmodified**;
- those modules' only non-builtin dependency outside themselves is
  `@cairn/core`, and this task's Core diff is +102/-1 confined to `serial.ts`,
  `records.ts` and `index.ts`; and
- the exact Core functions they import are covered by
  `core/test/builder-intercom.test.ts`, which passes 11/11.

I also built the app sources at `HEAD` into a throwaway copy and ran the two
suites there; they failed too, but with **12** failures rather than 9, because
that copy has no `.git`. That is not a clean comparison, so I do not offer it as
proof of pre-existence - only as a datapoint. **The cause is undiagnosed.**
Task 233's report recorded these suites green at 886/884/0, so something changed
between then and now outside this task's diff.

### `c8` - the owner can read the checkpoint: PASSED

Captured by the ordinary-route Playwright case from an owned offscreen
disposable project and the isolated E2E profile, under the app token, with no
visible-E2E marker and without touching the owner's real profile. My first
capture cropped the card - the changed files, the claims and both buttons were
off-screen - so I widened the viewport to 1440x1800 and captured the card
element itself before asking. Presented in chat; the owner answered **"Yes -
unmistakable"**. Playwright, not the owner, exercised Continue and Stop.

## Watching the tests fail first

- The Core seam: the first run failed to compile (`onUnsealedCandidate does not
  exist`), and after adding only the type and option it failed behaviourally on
  6 of 7 cases because the callback was never invoked. The seventh - the
  no-checkpoint regression guard - passed throughout, as it should.
- The plain-words mirror: green, then removing `OWNER_STOPPED_AT_CANDIDATE`
  from the app table produced `AssertionError: no plain words for
  OWNER_STOPPED_AT_CANDIDATE`, then restoring returned it to green.
- The E2E: renaming the `onUnsealedCandidate` option in `tasks.ts` so Core never
  receives it, rebuilding the bundle and re-running produced a failure on
  `expect(locator).toBeVisible()` for `.unsealed-candidate`; reverting and
  rebuilding returned all 3 to green.

## Scope warning the brief asked me to raise

This slice touches **13 production files**, above the brief's "roughly eight"
tripwire, at about 700 added production lines (under the 1,000 line half). The
brief says to explain the coupling rather than invent precursor tasks, so:

one visible checkpoint is inherently a vertical slice. The pause must live in
Core, inside the open run, because that is the only place where nothing
terminal has been written yet; it must cross the shared IPC contract, Main,
preload and the renderer to reach a screen. Those six are irreducible. The
remaining files are one line each: the two hand-maintained plain-words mirrors
(required by an exhaustive `Record<SerialStopReason, string>` and a mirror
test), the lab stub (required because `CairnApi` gained a method), and the CSS.
The median change to a modified file is 18 lines. I do not think this warrants
splitting, but it is the owner's call.

## How to try it

Cairn cannot yet show you this on a real project without a connected worker.
To see the automated proof:

```
cd app
npx playwright test tests/conductor.spec.ts --workers=1 -g "unsealed candidate"
```

Take the app token first (`mkdir %TEMP%\cairn-app-token`) and remove it after;
close your own Cairn window while it runs.

## Limitations and remaining owner decisions

- Foreground only, as accepted: a controlled Stop and a cancel close honestly,
  but an abrupt process loss writes no terminal claim at all. It leaves the
  worker's edits and the brief in the workspace for the next session to
  inspect, and Cairn does not resume or reconstruct the run.
- Chat only. Manual Task Run shows no candidate; the plan does not require it.
- The card shows no `cN` checks. Slice 2 binds those to the worker, the
  envelope and the result together; adding them to the display first would have
  been the decorative-promise failure the plan explicitly rejects.
- No real conductor, worker, critic or provider call was made; both fakes sit
  at existing injectable seams.
- The 9 unrelated app-unit failures above remain open and undiagnosed.
- Slice 2 is not started, and this checkpoint by itself does not prove the
  milestone journey.

**Disposition: DONE**
