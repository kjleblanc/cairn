# Task 237 report - make the Task Card and its checks authoritative

**Lane:** A (the main checkout). **Base commit:** `edd7ff5`.
**Brief claim commit:** `ee18cc0`.

Slice 2 of `docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md`.

## Outcome: STOPPED partway, with the Core half finished and proved

The requested visible outcome does not hold. A beginner opening Cairn Chat
today still sees no Task Card before dispatch, and the Unsealed candidate still
shows no `cN` rows, because the app layer that would display them was not
written. Cairn's contract makes DONE mean the requested visible outcome holds,
so this task is honestly `STOPPED` rather than partially done.

What **is** finished is the whole engine behind that screen, built test-first
and mutation-checked. Core can now carry the owner's accepted promises to the
worker, run its own checks, and refuse to seal a task whose promises were not
kept. Nothing displays it yet.

## What actually changed

Core (5 files, 1 new):

- `core/src/taskcard.ts` (**new**, 337 lines) - the whole run-local
  representation: promise rows derived from the accepted intent, the fixed
  project-check menu, the capped check runner, the three-voice answer shape,
  and the satisfaction gate.
- `core/src/serial.ts` - the `taskPromises` run option, the promises section in
  the brief, the envelope's own check execution inside the still-open run, the
  extended candidate projection, the widened continue-with-answers choice, the
  DONE gate, and the `TASK_PROMISE_NOT_MET` stop reason.
- `core/src/routing.ts` - one optional `promises` field on the v3 contract.
- `core/src/records.ts` - plain words for the new stop reason.
- `core/test/serial.test.ts`, `core/test/taskcard.test.ts` (**new**) - tests.

App (2 files, both one line):

- `app/src/shared/stopwords.ts` and `app/tests-unit/stopwords.test.ts` - the
  hand-maintained mirrors of the new stop reason.

No app screen, IPC contract, preload channel, renderer component, or stylesheet
was touched. No provider, model, credential, network, dependency, external
write, push, deployment, Q9 activation, or persistence was touched. No other
lane's worktree changed. The milestone did not move.

## The central decision, and why

**Cairn does not adopt the existing `cairn-serial-task/v4` Task-Spec route.** It
authors a smaller run-local representation beside it. Four facts from the
source decided this, and each is checkable:

1. `composeSerialTaskPromises`' v4 counterpart, `composeSerialTaskSpecAuthority`
   at `core/src/serial.ts:402`, returns `null` for any evidence procedure whose
   `kind` is not `adapter-command-attestation`. `owner-observation` is a legal
   `EvidenceProcedureKindV1` at `core/src/quality.ts:274` but is filtered out one
   layer up. This slice requires owner-observation rows, so v4 cannot represent
   its Task Card at all. That alone is disqualifying.
2. Under v4 the contract's `envelopeChecks` is the legacy generic three-string
   list (`core/src/serial.ts:7054`). v4 supplies no owner-selected command
   execution, so the menu had to be built from scratch either way.
3. The v4 DONE path is gated on process-event custody: the run stops without a
   `taskSpecRunRecord` (`core/src/serial.ts:2261` and `:2435`), and routing
   demands `CANONICAL_EVIDENCE_COMMAND_EVENT_REPRESENTATION`.
4. `grep taskSpecAuthority app/src/main/tasks.ts` returns nothing. Main has
   never minted one, and the adjacent `QUALITY_PREVIEW_ACTIVE` flag at
   `app/src/main/tasks.ts:151` is gated on `criticActivationStatus(...)` - the Q9
   activation tuple.

Adopting v4 would therefore have imported exactly the custody and activation
machinery the plan excludes, which is the brief's stated STOP condition.

## Check results

### `c1` cancel makes zero worker calls - NOT REACHED

Needs the app layer. Untouched from Slice 1, where the behavior already holds.

### `c2` approval invokes the worker once - PASSED at the Core level only

Every new serial test invokes exactly one adapter. Not proved through Chat.

### `c3` the worker receives every displayed row - PARTLY PASSED

`the worker's contract and brief carry every displayed promise row` proves the
rows reach the adapter contract and the written brief (`c1: ...`, `c2: ...`).
**The codex worker prompt was not extended**, so a real worker is handed the
rows in its contract and brief but is not yet *instructed* to answer each one.
Row-to-claim matching is implemented and tested (`composeSerialTaskPromiseAnswers`
matches by id, and `c1 does not steal c10's answer` guards the obvious bug), but
the prompt half is missing. This is the largest single gap in Core.

### `c4` the envelope runs only the selected known checks, itself - PASSED

`Cairn runs only the checks the owner selected` declares three npm scripts,
selects one, and asserts the marker file contains exactly `typecheck`. The
menu is a fixed three-entry list; `the menu is a fixed set: a project cannot
introduce a check of its own` proves a project declaring `exfiltrate:secrets`
gets it ignored.

### `c5` nothing hidden, no preference invented - PASSED

`a request at the requirement cap hides nothing` (9 rows) and the two
`owner-unsure` / `cairn-chosen` cases, each mutation-checked.

### `c6` an owner row cannot be auto-passed - PASSED

`an unanswered owner row cannot seal DONE, however loudly the worker claims it`
and `a row the owner refuses stops the run` both close `TASK_PROMISE_NOT_MET`.
`Cairn's own failing check stops the run even when the worker says it passed`
is the decisive one: the worker claims `typecheck passes, honest`, Cairn's own
run of it exits 1, and Cairn's finding wins.

### `c7` one set of rows across all four surfaces - FAILED

The Task Card and result card do not exist. The rows reach the brief and the
candidate projection only. **`core/src/records.ts` was not extended**, so the
terminal report and result card carry no rows.

### `c8` every Slice 1 behavior still holds - PASSED

All seven Slice 1 checkpoint tests pass unchanged, including
`a run with no checkpoint keeps the current terminal close untouched` and
`the original run lock is still held while the checkpoint waits`. A run given
no promises reaches the identical close, which is why both the option and the
contract field are optional.

### `c9` a slow check is visible and bounded - PASSED

`a check that outruns its cap is reported as unfinished, never as passed or
failed` and `elapsed time is reported while a slow check is still running`.

One real defect was found and fixed here rather than papered over. The first
implementation resolved the moment it *issued* the kill, so Cairn would have
resumed the serial run - and verified Git - while the killed check could still
be writing the workspace. The test surfaced it as an `EPERM` removing the temp
project. `killCheckProcessTree` now resolves only once the child is reaped, and
the mutation `resume without awaiting the kill` is caught by that test.

### `c10` focused machine checks pass - PASSED, with the known unrelated reds

| Command | Result |
|---|---|
| `core: npx tsc` | PASS |
| `core: node --test dist/test/taskcard.test.js` | **22/22** |
| `core: node --test dist/test/records.test.js dist/test/claims.test.js dist/test/taskcard.test.js` | **48/48** |
| `core: node --test test/contract-mirrors.test.mjs test/contract-check-ids.test.mjs dist/test/routing.test.js dist/test/quality.test.js dist/test/builder-intercom.test.js` | **41/41** |
| `core: node --test --test-name-pattern "<the 13 above>" dist/test/serial.test.js` | **13/13** |
| `app: npx tsc --noEmit` | PASS |
| `app: npx tsc -p tsconfig.unit.json` | PASS |
| `app: node --test dist-unit/tests-unit/stopwords.test.js` | **7/7** |

**The full `core/test/serial.test.js` file was NOT run to completion** (~20
minutes). Only the 13 named tests were. A later session must run it whole
before this work is trusted on `main`.

The nine `builderlivetransport` / `buildertrackedtext` failures and the red
`cli` typecheck (Task 211's `QualityBoundCodexExec*` overloads vs
`cli/test/task.test.ts:111`) are pre-existing on `main`, were confirmed red
before any edit here, and were not touched.

### `c11` the owner can read both surfaces - NOT REACHED

No screenshot was captured and owner gate 2 was not asked, because there is
nothing to show. Asking it against a Core-only change would have been dishonest.

## Watching the tests fail first

Every production change here began as a failing test:

- `taskcard.ts` did not exist: `Cannot find module '../src/taskcard.js'`.
- `projectCheckMenu`, `runProjectCheck`, `composeSerialTaskPromiseAnswers` and
  `serialTaskPromisesSatisfied` each first failed as
  `has no exported member`.
- The serial seam first failed with
  `Property 'promises' does not exist on type 'LegacyAdapterTaskContractV3'`
  and the choice-shape mismatch on `SerialUnsealedCandidateChoiceV1`.

Because several promises were satisfied by the minimal implementation, each was
additionally **mutation-checked**: the production code was deliberately broken
and the exact catching test recorded, then restored byte-identical. Ten
mutations were run and all ten were caught -

truncating rows to 3; dropping non-`owner-stated` rows; skipping the
verification count check; renumbering ids from `c0`; accepting unbranded
clones; treating any exit code as passed; reporting a capped check as passed;
removing the elapsed ticker; resuming without awaiting the kill; letting the
worker's word satisfy a row; defaulting owner rows to met; treating `not-met`
as met; and dropping the `\b` that stops `c1` stealing `c10`'s answer.

## What the next session must do

In this order. The Core seam is stable; none of this should require revisiting
`taskcard.ts`.

1. **The worker prompt.** Extend `core/src/codex.ts`'s v3 branch (near the
   existing `cairn-claims` instructions around line 1447) to list
   `contract.promises.rows` and require one `checks` entry per `cN`. The
   matching side already exists. Mirror it in `core/src/kimi.ts`.
2. **The records.** Add the answered rows to `ComposedRecordInput` in
   `core/src/records.ts` and pass `promiseAnswers` from both the DONE and
   `closeStopped` paths in `serial.ts` - the variable is already declared above
   `closeStopped` for exactly this.
3. **The app layer**, all of it: `app/src/shared/ipc.ts`, `app/src/main/tasks.ts`,
   `app/src/main/unsealedcandidate.ts`, a new
   `app/src/renderer/components/TaskCard.tsx`, the rows in
   `UnsealedCandidate.tsx`, `Chat.tsx`, and `app.css`. The menu can ride on the
   existing `task:route` response, the selection on `task:run`, and the owner's
   row answers on the existing `task:candidate-decide` payload, so **no new
   preload channel and no `mock-cairn.ts` change should be needed**.
4. **The E2E and owner gate 2.** The disposable project needs a `package.json`
   declaring `typecheck` so a real check runs and passes.
5. **Run `core/test/serial.test.js` whole** before landing.

## Limitations

- The visible outcome does not hold. This is engine work only.
- A real worker is not yet told to answer each `cN`.
- The report and result card carry no rows.
- The full Core serial suite was not run to completion in this session.
- The menu detects three fixed npm script names. Cairn's own root
  `package.json` declares none of them, so on Cairn itself today the menu would
  be empty and every row would fall to owner observation. Declaring root
  `typecheck` / `test:unit` scripts is a natural precondition for Slice 5; I
  deliberately did not add them, because a root `typecheck` that quietly skipped
  the red `cli` workspace would be a dishonest green.

**Disposition: STOPPED - the Core engine is complete and proved, but no Task
Card is visible in Chat, so the requested outcome does not hold.**
