# Task 221 report - calibrate and activate the exact critic tuple

**Lane:** A (the main checkout). **Base commit:** `35e5607`.
**Brief claim commit:** `ae904eb`.

## Outcome

Task 221 stopped before the first provider call. The activation registry is
still empty, the existing twelve-fixture calibration remains injected and
fake-only, and no credential, network request, billable call, project data,
dependency, external write, push, publication, or deployment was used.

The decisive issue is structural. Adding a passing tuple to
`app/src/main/criticactivation.ts` would activate only the quality prompt and
Task Spec preview. Ordinary task start still calls the legacy
`runSerialTask(...)` path and does not pass the accepted Task Spec into
candidate custody. The only Main call to the candidate runner is inside the
guarded Q9 fake harness. Production Codex advertises only `serial-task`, while
Core's candidate-writer authorities are restricted to Node tests and guarded
Q9 Electron fixtures. Main also has no normal Evidence Plan authoring seam and
no production structured packet-selection path.

That means a successful live calibration could not produce the visible outcome
the owner was asked to approve: Cairn could advertise a calibrated critic while
ordinary tasks still bypassed it. Repairing this inside Task 221 would require
a new production writer-isolation authority, pre-dispatch Evidence Plan
authoring, structured tracked-evidence selection, and a production dependency
branch through the durable Q9 lifecycle. That is materially broader than this
task's accepted boundary, which is centred on the existing Q8 calibration path
and explicitly does not alter Q9 authority. The safe result is therefore
STOPPED, not a misleading partial activation.

## Files changed

- `docs/ai-work/tasks/221-brief.md` was created and committed alone at
  `ae904eb` to claim Task 221 before investigation began.
- `docs/superpowers/plans/2026-08-07-cairn-quality-intent-and-critic-prerequisite.md`
  records the Q10 STOP and the exact missing prerequisite.
- This report records the evidence and disposition.
- `docs/ai-work/LOG.md` receives one truthful Task 221 row.

No application, Core, test, fixture, activation, provider, or dependency file
changed. Three implementation agents were stopped before editing after the
scope boundary became clear.

## Check results

### `c1` - every live call has an exact, separate owner decision: NOT REACHED

No live card was opened and no credential was retrieved. The owner therefore
was not asked to approve an action that could not lead to the promised product
route. The existing Q8 fake approval path remains one-use and restart-safe.

### `c2` - the provider boundary is closed and auditable: NOT REACHED

The real provider route, exact resolved model revision, complete live request
schedule, and billing basis were never selected or sent. The existing fake
route remains `.invalid`, injected, tool-free, and free of a global-fetch
fallback.

### `c3` - the preregistered activation bar is evaluated mechanically: NOT RUN

Running the held-out set would spend owner-approved external calls while no
normal task could consume a passing result. No live calibration request or
result was retried, dropped, changed, relabeled, or used for prompt tuning. The
focused offline tests did re-evaluate the frozen fixture projections and one
injected-fake send path.

### `c4` - activation is exact, atomic, and dark on every non-pass: PARTIAL - SAFE DEFAULT HOLDS

The registry remains empty. The focused activation/calibration run below
passed 23/23 and proves the current exact identity is inactive, the twelve
fixtures remain closed, only the injected fake transport can open them, and
restart never auto-sends.

### `c5` - restart and failure preserve evidence without tuning or replay: NOT REACHED LIVE

The existing fake journal tests passed, but no live campaign was begun. There
is consequently no live state to replay, tune against, or discard.

### `c6` - the selected tuple works only through the bounded Q9 task route: FAILED

The required production entry route does not exist. Source inspection showed:

- `app/src/main/tasks.ts` keeps the activation identity `null` and ordinary
  execution calls `runSerialTask(...)`;
- that file has no normal `bindInitialEvidencePlan`,
  `composeSerialCandidateTaskSpecAuthority`, or `runSerialTaskToCandidate`
  callsite;
- `app/src/main/qualityloop.ts` accepts only the guarded
  `synthetic-q9-builder` and `synthetic-q9-critic` dependency kinds; and
- `core/src/routing.ts` limits candidate-writer support to Node-test and Q9
  Electron scopes, while `core/src/codex.ts` advertises only `serial-task`.

Three independent read-only architecture/security reviews reached the same
conclusion and found no hidden production route.

### `c7` - complete regression and owner-visible evidence pass: NOT RUN

The full suites, app builds, guarded Electron activation flow, live fixtures,
and live task observation were not run because `c6` had already failed before
the external boundary. Running them could not turn the absent production route
into evidence.

## Exact commands and observed results

From `app`:

`node --test dist-unit/tests-unit/criticactivation.test.js dist-unit/tests-unit/criticcalibration.test.js`

Result: **23 passed, 0 failed** in 0.7 seconds. This included the empty
activation registry, exact identity drift checks, twelve-fixture manifest,
one-use injected send, decline/stale/replay/cancel behavior, no transport
fallback, authenticated restart, and Main/IPC/renderer containment.

From the repository root:

`rg -n 'QUALITY_PREVIEW_ACTIVATION_IDENTITY|runSerialTaskToCandidate|runSerialTask\(' app/src/main/tasks.ts`

Result: the identity is `null`; ordinary execution has one `runSerialTask(...)`
call and no candidate-runner call.

`rg -n 'bindInitialEvidencePlan|composeSerialCandidateTaskSpecAuthority|runSerialTaskToCandidate' app/src/main/tasks.ts`

Result: **no normal candidate or Evidence Plan callsite**.

`rg -n 'scope:|capabilities:' core/src/routing.ts core/src/codex.ts`

Result: candidate-writer scopes are `node-test-only` or
`q9-electron-e2e-only`; production Codex exposes `capabilities:
["serial-task"]` only.

`rg -n 'synthetic-q9-builder|synthetic-q9-critic|Q9QualityLoopDependenciesV1' app/src/main/qualityloop.ts`

Result: start and restore both require the two exact synthetic Q9 dependency
kinds.

`git diff --cached --check`

Result: **passed** after the three final record paths were staged exactly,
including this previously untracked report.

`git status --short --branch`

Result before the final commit: the branch was ahead of `origin/main` by 156
local commits and exactly the three Task 221 closing record paths were staged;
there were no other modified, staged, or untracked paths.

## Smallest safe continuation

Before another live-calibration task, Cairn needs a separately reviewed serial
prerequisite plan covering:

1. one production candidate-capable Builder with an enforced write sandbox
   confined to the canonical project and disjoint from Electron `userData`;
2. honest pre-dispatch Evidence Plan authoring for normal Task Specs;
3. structured, consent-bound tracked-file selection for packet-only criticism;
4. a production dependency branch through the durable candidate/critic loop,
   with the Q9 synthetic branch unchanged; and
5. a causal normal-task test proving one Task Spec survives proposal, Builder,
   pending custody, critic approval, assessment, and terminal result.

Only after those prerequisites pass should a new task add the truthful live
calibration disclosure/evaluator, pause with the complete twelve-call schedule,
and ask for the first exact provider action.

## How to try it

There is intentionally no live control to try. A maintainer can rerun the
23-test command above and inspect the four source queries. They should continue
to see an empty activation registry and no normal candidate/critic route.

## Limitations and owner decision

The selected provider, model, authoritative resolved revision, quota/billing
basis, and complete live request bodies were never resolved because the task
stopped earlier at a local architecture boundary. The next owner decision is
whether to authorize the broader production-route prerequisite plan. It is not
approval for a provider call; any future live request still needs its own exact
just-in-time approval.

The project milestone did not move.

**Disposition: STOPPED - the production task route required by checks c6 and c7 does not exist, and adding it would exceed Task 221's accepted calibration boundary.**
