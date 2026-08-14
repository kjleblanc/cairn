# Handoff - Gauntlet Slice 3: one separately approved tool-free critic

Written after Task 239 closed Slice 2. The saved plan
`docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md` is the
execution authority; this file is orientation and a copy-ready prompt.

Slice 2 made the Task Card authoritative: the owner's promises are frozen as
`cN` rows, Cairn checks the ones it can, the worker answers each as an
attributed claim, and the owner answers the rest. Slice 3 adds the first
independent opinion about whether those promises were actually kept - and it is
the first stage in this whole plan that spends money and sends project data
outside the machine. Read the money and data sections carefully; they are the
reason this slice is not just more UI.

Copy the prompt below into a fresh conversation.

```text
Work on: Continue Cairn's Gauntlet restoration described in:

docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md

Execute only Slice 3: one separately approved, tool-free critic. Do not begin
Slice 4 (confirming an allegation or permitting a repair), and do not broaden
this into repair execution, a second worker call, Q8/Q9 calibration, activation
tuples, upstream-provider proof, sandbox work, or cleanup.

Visible beginner outcome

From the real Unsealed candidate screen - the one Slice 2 already ships - the
beginner can either skip critique entirely or approve ONE disclosed critic call,
and then see short findings tied to the frozen `cN` rows they already accepted.
Each finding names one row and says met, not met, or unclear, with a short
observation and a reference to evidence that was actually in the packet.
Anything the critic says that is not tied to a frozen row appears as a visibly
advisory note that gates nothing.

The critic cannot write a file, run a command, invent a new blocking row, start
a repair, or declare the task DONE or STOPPED. After reading its findings the
owner still makes the same two choices Slice 2 gave them.

Start conditions

Do not edit anything until all of these are true:

1. The project root is:
   C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework
2. Task 239's completion commit contains its report with `Disposition: DONE`.
   It was `5804ae7` when this handoff was written; verify current history
   rather than trusting that hash.
3. The complete working tree is clean and `main` is between tasks: no staged,
   modified, or untracked paths. (Task 239's own start condition failed on a
   single untracked handoff file. If this file is still untracked, committing it
   alone is the smallest safe fix.)
4. Inspect every registered worktree and local branch as required by `AGENTS.md`.
   Do not create, delete, reuse, reset, or move a registered worktree.
5. Identify the lowest task number free in `docs/ai-work/tasks/`, every
   registered worktree, and every local branch. Any filename beginning with the
   number takes it. 236 was claimed by the `claude/vigorous-tharp-0cbd3c`
   worktree and 237-239 are used; do not assume 240 without checking, because
   other lanes may have claimed more since.
6. Obtain the owner's decision on ONE thing before claiming the task, because it
   changes what the task is:

   **Does this task make a real critic call, or prove the whole stage with a
   local fake and leave the live call to a later task?**

   Recommend proving it with a fake. Every behaviour Slice 3 must demonstrate -
   skip, unavailable, met, not_met, unclear, injection-like candidate text, and
   advisory-only notes - is provable at the existing transport seam without
   spending anything. A live call needs the owner's gate 3 (mode, provider or
   router, model, project, exact packet contents, maximum cost or quota, and the
   zero-retry rule), and that approval is the owner's to give OUTSIDE the agent
   loop, on the exact call. Splitting also means a bad first live call cannot be
   blamed on unproven plumbing.

   If the owner wants the live call in this task anyway, that is their decision,
   but say plainly that it sends the accepted request, Cairn's own check results,
   the worker's claims and any separately approved file excerpts to a third
   party, and that Cairn cannot attest which upstream physically served it.

If any condition fails, make no edits. Report the exact blocker and smallest
safe next step.

Read completely before editing

- `AGENTS.md`
- `docs/ai-work/PROJECT.md`
- the plan above, especially Section 5 (protections), Section 7's Critic result,
  Section 8 (provider and routing truth, and the tracked-text limits), and
  Slice 3
- `docs/ai-work/tasks/237-report.md`, `238-report.md` and `239-report.md`
- this handoff

Then inspect current source rather than trusting historical line numbers.

What Slices 1 and 2 already left you

- `core/src/taskcard.ts` is the whole promise representation: `cN` rows derived
  from the accepted intent, a fixed three-entry project check menu, a capped
  check runner, `SerialTaskPromiseAnswerV1` (the three-voice answer), and
  `serialTaskPromisesSatisfied`. The frozen rows a critic may challenge are
  exactly these ids. Do not redesign this module.
- `core/src/serial.ts` carries `SerialRunOptions.taskPromises`, runs the
  selected checks itself inside the still-open run, and refuses to seal on
  `TASK_PROMISE_NOT_MET`. The pause is `onUnsealedCandidate`, and its projection
  now includes `answers`.
- **The pause's projection is minted ONCE, when the checkpoint opens**
  (`app/src/main/unsealedcandidate.ts`). A critic call happens while that pause
  is open, so its findings must reach a projection that already exists. Deciding
  how the card refreshes - and doing it without adding a second pause, releasing
  the run lock, or inventing custody - is real design work. Budget for it.
- The renderer surfaces are `app/src/renderer/components/TaskPromiseCard.tsx`
  (before dispatch) and `UnsealedCandidate.tsx` (after the worker). The
  candidate card already holds per-row owner controls and disables Continue
  while a row is unanswered.
- The owner's row answers ride on the existing `task:candidate-decide` payload,
  and the check menu and selections ride on the existing `task:route` and
  `task:run`. Slice 2 added NO new preload channel and no new `CairnApi` method.
  Try hard to keep that true.

The central decisions this slice must make and record

1. **Reuse the existing critic-call disclosure, or author a smaller one?**
   `app/src/shared/critic-call.ts` already defines `CriticCallDisclosureV1`,
   `CriticCallModeV1` (`required` | `optional`) and - notably -
   `CriticCallActionV1` as exactly `approve` | `stop-task` |
   `continue-without-critic`, which is precisely the choice Slice 3 needs. The
   card `app/src/renderer/components/CriticCall.tsx` is already wired into Chat
   (`decideCriticCall`, `cairn.criticCallDecide`) and renders in the dispatch
   panel today.

   The trap: that surface is currently reached through
   `app/src/main/criticcalibration.ts` (`CriticCalibrationOrchestrator`), and
   `CriticCallKindV1` includes `synthetic-calibration` and `synthetic-task`.
   Reuse the disclosure ONLY if it imports no calibration, activation tuple, or
   qualification corpus. If pulling the card in drags any of that with it, author
   the smaller representation instead and say so.

2. **What to do with `core/src/critic.ts`.** It is about 4,000 lines and
   predates this plan. Read it as historical evidence, compare it against a small
   live representation, and record the comparison in the report the way Task 237
   recorded its `cairn-serial-task/v4` decision. Do not adopt it wholesale
   because it exists. If it imports custody, calibration, or activation that the
   visible slice does not need, do not reuse it.

3. **Where the call is made from.** It must be one shot, tool-free, and owned by
   the still-open runner or by Main beside it - never a nested serial run, never
   a second writer, never a released lock.

Record all three choices and their reasons in the task report.

Fixed decisions for this slice

- A blocking finding contains only: the `checkId` of a frozen row, a judgment of
  `met`, `not_met` or `unclear`, a short observation, and references to evidence
  that was actually in the packet. Nothing else.
- A finding that names no frozen row is a nonblocking note and must look
  advisory on screen. Issue count and severity never determine completion.
- **In this slice a critic finding changes nothing by itself.** It is displayed;
  the owner still chooses continue or stop. Confirming an allegation and
  permitting one repair is Slice 4 and must not be started here.
- One call. No automatic retry, fallback, continuation, or second attempt.
  Malformed, empty, or unavailable output is reported honestly as unavailable.
- Evidence the packet does not support yields `unclear`. It never silently
  widens the packet.
- The packet obeys the existing selected-tracked-text boundary: at most eight
  eligible Git-tracked text files, 8,000 characters from one file, 32,000 total.
  Exclude `.env` and other credential-like paths, ignored and untracked files,
  linked files, binary files, dependency and generated areas, `.git`, `.cairn`,
  and anything outside the current project. File contents require their own
  separate authorization beyond the standing conversation consent.
- Candidate and worker text in the packet is untrusted data. Text that looks
  like instructions must not change what Cairn does, and proving that is one of
  the required checks.
- Do not advertise repair on any surface. It is not live.
- Chat only. Manual Task Run parity is out of scope unless it falls out of a
  shared component for free.

Non-goals

Do not add, activate, or import:

- repair execution, a second worker invocation, or any Slice 4 behaviour;
- Q8/Q9 calibration, activation tuples, route fingerprints, qualification
  corpora, candidate custody, persistence, or restart recovery;
- exact upstream-provider attestation through a router;
- a universal Evidence Plan, command-authority DSL, or arbitrary command
  execution;
- Task 224-233 proposal machinery;
- new dependencies, sandbox campaigns, or broad cleanup.

Provider, credential, and app boundary

This is the slice where money and data can leave the machine, so the boundary is
stricter than Slice 2's:

- Make NO real conductor, Builder, or critic model call unless the owner has
  given gate 3 for that exact call, in this conversation, after seeing the exact
  provider or router, model, project, packet contents, maximum cost or quota,
  and the zero-retry rule. Approval for one call is not approval for another.
- Never ask the owner to paste a key, token, or `.env` contents into chat. Never
  print, copy, commit, or log a secret. The owner operates the connection UI
  personally; do not inspect or operate that login.
- If a call is made through a router, disclose the router as a data recipient
  and state plainly that Cairn cannot attest which upstream physically served
  the request. Do not build a parser that pretends otherwise - Task 233 already
  spent a real call learning that lesson.
- Install nothing. Automated evidence stays local and injects fakes only at the
  existing seams: the fixture conductor in `app/tests/fixtures/fake-conductor.mjs`
  and the fake-codex PATH shim in `app/tests/fixtures/fake-codex-env.ts`,
  combined at `CAIRN_MOCK=0` exactly as the Slice 2 tests at the end of
  `app/tests/conductor.spec.ts` already do.
- Before any app or Playwright run, take the single-tenant app token
  (`mkdir %TEMP%\cairn-app-token`, which fails if it exists) and release it in a
  `trap`/`finally`. Wait if the owner or another lane holds it; never close their
  app. Use only a task-owned disposable project and the isolated offscreen E2E
  profile. Do not use the owner's real profile and add no marker that makes E2E
  visible.

First action

Run a read-only preflight:

- verify root, complete status, recent history, and Task 239 DONE;
- inspect registered worktrees, local branches, and task filenames;
- read `core/src/taskcard.ts` and the checkpoint in `core/src/serial.ts` so the
  frozen rows a critic may challenge are unambiguous;
- read `app/src/shared/critic-call.ts`, `app/src/renderer/components/CriticCall.tsx`
  and how `Chat.tsx` already decides a critic call, then trace what
  `app/src/main/criticcalibration.ts` couples to it, and decide central question 1;
- skim `core/src/critic.ts` for shape only, and decide central question 2;
- identify exactly how the open pause's projection would carry findings, and
  decide central question 3.

Then get the owner's live-call decision, restate the exact beginner-visible
outcome, claim the lowest genuinely free task number by writing its complete
brief with stable `cN` checks, and commit that brief alone before any source
change.

Implementation boundary

Preserve worker authority, the worker prompt's content, routing, pre-work
approval, cancellation, timeout and orphan handling, protected-Git checks,
records, exact-path commit behavior, result cards, conductor commentary,
provider connections, milestone logic, and every Slice 1 and Slice 2 behaviour:
the pause, the two choices, the Task Card, the three-voice answered rows, the
disabled Continue while an owner row is unanswered, `TASK_PROMISE_NOT_MET`,
honest STOPPED, abrupt-loss silence, and a promise-free run reaching the current
close byte-for-byte.

Two byte-level invariants Task 239 had to restore; do not break them again:

- a result card with nothing new to say must stay byte-identical, which is why
  `promises` is written only when there are rows; and
- the `unsealedcandidatepaper` containment guards forbid terminal words in
  renderer decision code. If one fires, reword your code or comment - do not
  relax the guard.

DONE evidence

Do not call this done because a unit test or an isolated component passes. Prove
through the ordinary Chat product path that:

1. the owner can skip critique entirely and the run closes exactly as it does
   today;
2. approving makes exactly one call, and no automatic retry, fallback, or second
   attempt exists on any failure path;
3. findings are tied only to frozen `cN` ids, and anything else is visibly
   advisory and gates nothing;
4. `met`, `not_met`, `unclear`, unavailable, and malformed output each behave
   honestly and distinguishably through the normal UI;
5. injection-like text in the candidate or the worker's claims changes nothing
   about what Cairn does;
6. the critic cannot write a file, run a command, add a blocking row, start a
   repair, or declare a terminal result, and the run's terminal truth is still
   the envelope's;
7. the packet preview and the actual request carry the same disclosed semantic
   contents, without inventing an identity-proof protocol;
8. the packet never exceeds the tracked-text limits and never includes an
   excluded path, and file contents appear only under their own approval;
9. every Slice 1 and Slice 2 behaviour still holds, including the full
   `core/test/serial.test.js` run to completion;
10. focused typecheck, build, Core and App suites, and ordinary-route Playwright
    pass, each named with its exact command and real result; and
11. under the app token, capture the critic decision and the findings on the real
    candidate from the ordinary-route offscreen disposable-profile E2E, put both
    screenshots in front of the owner, and ask one question: "Is it clear what
    the critic was asked, what it found, which of that is only advice, and that
    Cairn has not acted on it?"

Capture WHOLE cards - buttons included. Slice 1 and Slice 2 both shipped a
cropped first attempt; assert the decisive controls are in viewport before the
screenshot so a future crop fails the test rather than reaching the owner.

Wait for the owner's answer on that last gate; do not infer it from automated
tests.

Stop instead of widening scope if

- the tree is not clean at the expected base or protected work changes;
- a useful call is conditional on an exact activation tuple, upstream-provider
  proof, a synthetic qualification corpus, or a second product route;
- reusing the existing critic surface drags in calibration, activation, custody,
  or persistence;
- the packet cannot be built within Section 8's limits without widening it;
- carrying findings onto the open pause would need a second pause, a released
  lock, a second writer, or cross-process custody;
- the work needs a provider call, credential, dependency, or external action the
  owner has not approved for that exact action; or
- the same underlying blocker has already stopped this slice twice. Change
  direction; do not build a third proof ladder.

Expect this to take more than one task. Slice 2 took three (237 built the
engine, 238 wrote the app layer, 239 proved it). A fake-proved critic stage and a
later live call at gate 3 is a reasonable two-task shape; say so early rather
than discovering it at the end.

Four things you will meet that are NOT yours

- Nine app unit tests in `app/tests-unit/builderlivetransport.test.ts` and
  `app/tests-unit/buildertrackedtext.test.ts` fail on main. They are Task
  224/231/233 Builder machinery and were failing before Slice 2 began. Do not
  chase them and do not count them as your regression. The honest baseline is
  907 tests, 896 passing, 9 failing, 2 skipped.
- `npx tsc --noEmit` in `cli/` is red from Task 211's `QualityBoundCodexExec*`
  overloads versus `cli/test/task.test.ts:111`. Also not yours.
- `core/test/serial.test.js` takes about 29 minutes (185 tests, 179 passing, 6
  skipped). It is I/O-bound on real `git` and on npm-spawning checks, not hung.
  Use `node --test --test-name-pattern "<name>" dist/test/serial.test.js` for a
  fast loop and run it whole once before landing.
- Two Slice 2 limitations are recorded and deliberately open: an owner who
  chooses nothing on the Task Card gets a promise-free run with no warning, and
  Cairn's own root `package.json` declares none of the three menu scripts, so on
  Cairn itself the check menu is empty today. Neither is Slice 3's to fix; the
  second is a Slice 5 precondition.

After the owner's judgment, close only this slice with an honest report, one LOG
row, and exact-path commits under `AGENTS.md`. Do not begin Slice 4. Do not
change the milestone: an independent critic does not by itself prove the full
request -> pushback -> dispatch -> verified DONE -> explanation journey.
```
