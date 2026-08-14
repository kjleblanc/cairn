# Handoff - Gauntlet Slice 2: make the Task Card and checks authoritative

Written after Task 235 completed Slice 1. The saved plan
`docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md` is the
execution authority; this file is orientation and a copy-ready prompt.

Slice 1 built the pause. Slice 2 is what makes it mean something: today the
Unsealed candidate shows what changed and what the worker claimed, but Cairn
still promises the owner nothing specific and checks nothing of its own. This
slice binds the promises and the evidence together, in one move, so no displayed
`cN` is decorative.

Copy the prompt below into a fresh conversation.

```text
Work on: Continue Cairn's Gauntlet restoration described in:

docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md

Execute only Slice 2: make the Task Card and its checks authoritative. Do not
begin Slice 3 or broaden this into critic, repair, Q9 activation, provider
calls, sandbox work, cleanup, or qualification work.

Visible beginner outcome

Before dispatch, ordinary Cairn Chat shows a compact Task Card carrying the
accepted outcome as `c1` and every accepted blocking requirement as a later
`cN`, each marked as either a check Cairn will run itself or one the owner must
look at. After the worker, the SAME rows appear on the Unsealed candidate,
each answered by three visibly separate voices:

- what Cairn checked and what it found;
- what the worker claimed, attributed to the worker; and
- what still needs the owner's own eyes, still unanswered.

The terminal report and result card carry the same rows. Nothing the owner
accepted is hidden, shortened away, or silently turned into a preference.

Start conditions

Do not edit anything until all of these are true:

1. The project root is:
   C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework
2. Task 235's completion commit contains its report with `Disposition: DONE`.
   It was `3dbdc91` when this handoff was written, but other work has landed
   since. Verify current history rather than trusting that hash.
3. The complete working tree is clean and `main` is between tasks: no staged,
   modified, or untracked paths.
4. Inspect every registered worktree and local branch as required by `AGENTS.md`.
   Do not create, delete, reuse, reset, or move a registered worktree.
5. Identify the lowest task number free in `docs/ai-work/tasks/`, every
   registered worktree, and every local branch. Any filename beginning with the
   number takes it. A separate session was diagnosing failing Builder tests
   after Task 235 and will have claimed at least one number; do not assume 236.
6. Obtain the owner's decision on ONE thing before claiming the task, because it
   shapes the design and cannot be inferred: the envelope runs the selected
   checks itself while the original serial run lock is still held, so a slow
   check is a visibly frozen task. Cairn's own core test suite takes about
   twenty minutes. Ask the owner what belongs in the first menu and what should
   happen when a check is slow. Recommend starting with only fast Cairn
   commands (typecheck, a focused unit run, a build) plus owner observation, and
   showing elapsed time while a check runs. If the owner wants long checks in
   the menu, that is their call, but say plainly that the task looks stuck for
   the duration.

If any condition fails, make no edits. Report the exact blocker and smallest
safe next step.

Read completely before editing

- `AGENTS.md`
- `docs/ai-work/PROJECT.md`
- the plan above, especially Section 7's Task Card and Project verification menu
- `docs/ai-work/tasks/235-brief.md` and `docs/ai-work/tasks/235-report.md`
- this handoff

Then inspect current source rather than trusting historical line numbers.

What Slice 1 already left you

- `core/src/serial.ts` has an optional `onUnsealedCandidate` continuation on
  `SerialRunOptions`, called inside the still-open run after the stop decision
  and before the DONE path. It hands out `SerialUnsealedCandidateV1`, a display
  projection carrying the accepted request, Git's changed paths, the worker's
  claims and the bounded evidence line. Extend that projection; do not add a
  second pause.
- `changedPaths` is Git's own set and legitimately includes Cairn's own task
  brief, because the brief is untracked at that moment. The card labels the
  list "Files changed in your project - checked by Cairn" for exactly that
  reason. Keep that framing when you add check results beside it.
- `app/src/main/unsealedcandidate.ts` holds one pending pause per project and
  answers exactly one press. It is deliberately not an authority and has no
  grant, receipt, hash, or custody. Keep it that way.
- `app/src/shared/unsealed-candidate.ts` is the display contract,
  `app/src/renderer/components/UnsealedCandidate.tsx` the card,
  `RunSessionSnapshot.unsealedCandidate` the session field, and
  `task:candidate-decide` the one channel.
- The renderer needs no new push channel: Core emits an activity immediately
  before the pause, and Chat already refreshes on every activity and polls once
  a second while a run is live.
- A new `SerialStopReason` must be added to FOUR hand-maintained places or a
  mirror test fails: `core/src/records.ts`, `app/src/shared/stopwords.ts`, and
  the lists inside `core/test/records.test.ts` and
  `app/tests-unit/stopwords.test.ts`.

The central decision this slice must make and record

Cairn already has a `cN` contract shape, and it already works on the ordinary
route. `core/src/serial.ts` builds a `cairn-serial-task/v4` contract whenever
`options.taskSpecAuthority` is supplied, carrying `taskSpec`, `evidencePlan`
and `envelopeChecks`; `core/src/codex.ts` already writes "Required Task Spec
promises - every cN must be answered. These are distinct from envelope checks"
into the worker prompt; and `core/test/serial.test.ts`'s "the staged v4 run
keeps Task Spec, claims, adapter events, and envelope result separate" proves
this runs through plain `runSerialTask(...)` with NO Q9 candidate custody.
What is missing is only that normal Main never supplies an authority - the gap
Task 221 recorded.

So the real question is not "build cN plumbing" but: adopt the existing v4
Task-Spec route on the normal path, or author a smaller live representation
beside it? Compare both before writing code and record the choice and its
reason in the task report.

Adopting v4 is not the same as activating Q9. Q9 is the candidate lifecycle -
`runSerialTaskToCandidate(...)`, `app/src/main/qualityloop.ts`, custody,
activation, persistence - and remains out of scope. If adopting v4 drags any of
that in, stop and use the smaller representation instead.

Fixed decisions for this slice

- `c1` is the accepted outcome. Later ids are the accepted blocking
  requirements, in order. Normally one to three rows.
- Never truncate, merge, or hide a requirement to keep the card small. If an
  accepted request cannot be shown clearly, return to conductor pushback for
  narrowing or show every row.
- Do not manufacture preferences. `owner-unsure` and `cairn-chosen` are not
  automatically advisory.
- Ids stay stable within the accepted run. Do not require hashes, live-object
  identity, or byte-identical projections to prove that.
- The worker receives every displayed blocking row and its result answers each
  one as an attributed claim. A worker answer is never an envelope check.
- The envelope runs only the checks the owner selected from the menu, itself,
  inside the still-open run. Commands the worker reports remain claims.
- Owner-observation rows stay pending until the owner answers. They can never
  be auto-passed, and a run cannot seal DONE by ignoring them.
- The menu is Cairn-specific and drawn from a small set of already established
  project commands. If no configured check can test the outcome, say so and use
  owner observation or stop.
- Do not advertise critic or repair on the card. They are not live.
- Chat only. Manual Task Run parity is not required unless it falls out of a
  shared component for free.

Non-goals

Do not add, activate, or import:

- a universal Evidence Plan, command-authority DSL, or arbitrary command
  execution;
- critic execution, repair execution, or a second worker invocation;
- Q9 lifecycle, candidate persistence, custody, activation, calibration, route
  fingerprints, or restart recovery;
- provider proof, real model calls, or credential access;
- Task 224-233 proposal machinery;
- new dependencies, sandbox campaigns, or broad cleanup.

Provider, credential, and app boundary

Make no real conductor, Builder, critic, or external model call. Do not
request, read, print, copy, move, or inspect credentials or connection storage.
Install nothing. Automated evidence stays local and injects fakes only at the
existing conductor-transport and worker-adapter seams - the fixture conductor
in `app/tests/fixtures/fake-conductor.mjs` and the fake-codex PATH shim in
`app/tests/fixtures/fake-codex-env.ts`, combined at `CAIRN_MOCK=0` exactly as
the Slice 1 tests at the end of `app/tests/conductor.spec.ts` already do.

Before any app or Playwright run, take the single-tenant app token
(`mkdir %TEMP%\cairn-app-token`, which fails if it exists) and release it in a
`finally`. Wait if the owner or another lane holds it; never close their app.
Use only a task-owned disposable project and the isolated offscreen E2E
profile. Do not use the owner's real profile or add a marker that makes E2E
visible.

First action

Run a read-only preflight:

- verify root, complete status, recent history, and Task 235 DONE;
- inspect registered worktrees, local branches, and task filenames;
- read the accepted-intent shape (`TaskIntent`, `taskRequestView`) and how
  `renderAcceptedTaskRequest` already carries outcome and requirements into
  both the brief and the worker prompt;
- read the v4 contract branch in `runSerialTask(...)` and decide the central
  question above;
- identify where the Task Card must appear before dispatch in ordinary Chat,
  next to the existing dispatch panel; and
- list the small set of Cairn commands that could form the first menu, with
  their real runtimes.

Then get the owner's menu decision, restate the exact beginner-visible outcome,
claim the lowest genuinely free task number by writing its complete brief with
stable `cN` checks, and commit that brief alone before any source change.

Implementation boundary

Preserve worker authority, the worker prompt's existing content, routing,
pre-work approval, cancellation, timeout and orphan handling, protected-Git
checks, records, exact-path commit behavior, result cards, conductor
commentary, provider connections, milestone logic, and every Slice 1 behavior
including the pause, the two choices, honest STOPPED, and abrupt-loss silence.

DONE evidence

Do not call this done because a unit test or an isolated component passes.
Prove through the ordinary Chat product path that:

1. cancelling before dispatch makes zero worker calls;
2. approving invokes the existing worker exactly once;
3. the worker receives every displayed blocking row, and its result answers
   each one as an attributed claim;
4. the envelope runs only the selected known checks, itself, and its findings
   are visibly Cairn's rather than the worker's;
5. no accepted requirement is hidden and no preference is invented;
6. an owner-observation row cannot be auto-passed, and a run with one
   unanswered cannot seal DONE;
7. the Task Card, the Unsealed candidate, the terminal report, and the result
   card all carry the same semantic rows;
8. every Slice 1 behavior still holds - the pause, continue-resumes-once,
   controlled Stop, cancel, and no forged DONE;
9. focused typecheck, build, Core and App behavior tests, and ordinary-route UI
   tests pass, each named with its exact command; and
10. under the app token, capture the Task Card and the answered Unsealed
    candidate from the ordinary-route offscreen disposable-profile E2E and put
    both screenshots in front of the owner. Ask one question: "Is it clear what
    counts as done, which evidence Cairn checked, which statements came from
    the worker, and what still needs your judgment?" Automated Playwright, not
    the owner, exercises the presses.

Make sure each screenshot shows the WHOLE card. Slice 1's first capture cropped
away the changed files and both buttons, which cannot support a judgment; widen
the viewport and capture the element.

Wait for the owner's answer on that last gate; do not infer it from automated
tests.

Stop instead of widening scope if

- the tree is not clean at the expected base or protected work changes;
- a check would require arbitrary command authority rather than a small known
  menu;
- an accepted request cannot be represented without hiding a requirement;
- binding the card would require importing Q9 custody, activation, or
  persistence;
- the work needs a provider call, credential, dependency, or external action;
- the slice approaches roughly eight production files or 1,000 added production
  lines. Treat that as a manual scope warning, not an automated gate: explain
  the coupling to the owner and let them choose. Slice 1 landed at 13 files and
  about 700 lines for a much smaller change, so expect this one to reach the
  tripwire and have the conversation early rather than at the end; or
- the same underlying blocker has already stopped this slice twice. Change
  direction; do not build a third proof ladder.

Two things you will meet that are NOT yours

- Nine app unit tests in `app/tests-unit/builderlivetransport.test.ts` and
  `app/tests-unit/buildertrackedtext.test.ts` fail on main. They are Task
  224/231/233 Builder machinery, were green at Task 233, and were undiagnosed
  when Slice 1 closed; a separate session was investigating. Do not chase them
  and do not count them as your regression.
- `core/test/serial.test.ts` takes about twenty minutes. It is I/O-bound on
  real `git`, not hung. Use
  `node --test --test-name-pattern "<name>" dist/test/serial.test.js` for a
  fast loop.

After the owner's judgment, close only this slice with an honest report, one
LOG row, and exact-path commits under `AGENTS.md`. Do not begin Slice 3. Do not
change the milestone: an authoritative Task Card does not by itself prove the
full request -> pushback -> dispatch -> verified DONE -> explanation journey.
```
