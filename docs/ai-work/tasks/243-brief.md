# Task 243 brief - make the candidate screen readable by a beginner

**Lane:** A (the main checkout). **Base commit:** `dd5a2a1`.

This is not part of the Gauntlet plan's slice list. It is a repair task, raised
by the owner twice from real use of the ordinary Chat route, and it is a
precondition for Slice 5 of
`docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md` ("Prove the
milestone on Cairn itself"), which asks a beginner to follow the whole journey
on screen. Task 240's report and Task 241's report are prerequisite reading.

## The observed failure

The owner ran the ordinary route on a real project, reached the unsealed
candidate, and could not act on what was there. In their own words:

> "There was still a lot of information being thrown at me, the 'average' user
> who won't know much. I think I missed it or skipped through it."

That was the second time. The first was about the critic card alone, in Task
240: "It's a bit over complicated for the end user. Let's vastly simplify the
messaging here, with the ability to see the full details if wanted." That card
was rewritten to four plain facts with everything exact behind one fold, and
the owner passed it. **The same technique is now needed on the screen that card
lives in.**

Measured at 1440x2400 with two promise rows, the candidate card is **1,510
pixels tall** before the owner reaches either button. It carries nine sections.
One of them reads, in full:

> Bounded worker evidence: agentMessageCount=1; cachedInputTokens=50;
> commandExecutionCount=0; exitCode=0; failedToolItemCount=0;
> fileChangeCount=0; inputTokens=200; outputTokens=80;
> reasoningOutputTokens=20.

That is `boundedEvidenceSummary` (`core/src/serial.ts:1527`) rendering an
adapter's numeric map as `key=value`. It is real evidence and worth keeping. It
is not something a beginner reads before deciding.

## Requested visible outcome

A beginner who reaches the unsealed candidate in ordinary Chat can tell, from
what is on screen without scrolling past the decision, four things:

1. the worker changed files and **Cairn has not said this is done**;
2. what they asked for, and which promises are answered and which still need
   them;
3. that they can ask for a second opinion first; and
4. what their two choices are.

Everything else - the changed-path list, the worker's full account, the bounded
evidence line, the list of what has not happened yet - is still there, still
exact, still attributed, and reachable in one click. Nothing is deleted.

## Design choice recorded before the work

**Fold, do not delete.** The proven pattern on this surface is Task 240's: a
few plain sentences on the first screen and a native `<details>` carrying every
exact number. It was judged and passed by the owner on this exact product
surface, so it is the pattern to extend rather than a new idea to invent. A
fold keeps Cairn's honesty intact - the evidence is still on the screen the
owner is looking at - while a deletion would quietly narrow what Cairn shows.

Do not solve this by summarising with a model, by moving evidence to another
screen, or by making any of it conditional on a setting.

## Boundary of intent

These are load-bearing and must survive unchanged in meaning. Several are
pinned by `app/tests-unit/unsealedcandidatepaper.test.ts`; if a guard fires,
reword the code, never relax the guard.

- The nonterminal statement: "Cairn has not declared this task complete".
- The three exact sentences "No task report is written.", "No row is added to
  the work log.", "Nothing is committed." (`unsealedcandidatepaper.test.ts:24`).
- The provenance labels "checked by Cairn" and "reported, not checked", and the
  heading "Files changed in your project" - which must NOT become "Files the
  worker changed", because Git's list includes Cairn's own task brief and
  attributing it to the worker would be false.
- The three separate voices per row: Cairn's own check, the worker's attributed
  claim, and the owner's own judgment. They may be laid out more compactly but
  may never be merged, and the worker's sentence may never stand where Cairn's
  finding or the owner's judgment belongs.
- The frozen `cN` ids stay visible on every row.
- Both choices, their exact labels, and the rule that Continue is disabled
  while an owner row is unanswered, with the owed row named.
- The critic offer stays **above** the two buttons (Task 241), and its own
  first screen stays as the owner passed it.
- `app/src/renderer/components/UnsealedCandidate.tsx` imports nothing from
  `main/` and uses no `fetch`, `spawn` or `exec`.
- Change no Core behaviour. `boundedEvidenceSummary` and the projection stay as
  they are; this is a presentation task. If a fact is hard to present well,
  that is a presentation problem to solve here, not a reason to stop producing
  the fact.
- The E2E depends on these exact strings; any that change must be updated in
  the tests in the same commit, and the report must name each one: "Cairn
  checked this", "reported, not checked", "needs your judgment", "You have not
  judged this yet.", "I checked this - it's done", "Not done", "Continue to
  Cairn's current checks", "Stop and keep the work for inspection", "Answer c2
  above before Cairn can finish this task."
- Do not touch the result card, the Task Card before dispatch, the conductor,
  records, or any Gauntlet slice behaviour.
- No provider, model, or credential work. Install nothing. Add no dependency.
- Take the app token before any app or Playwright run and release it in a
  `finally` only if this run created it.
- Not yours: the nine failing Builder unit tests, the red `cli` typecheck from
  Task 211, `conductor.spec.ts:3314`, and the full-suite worker-teardown EPERM
  that aborts long Playwright runs on this machine.

## Checks

1. **`c1` - the decision is reachable without wading.** Measured through the
   ordinary Chat route at a stated viewport, the distance from the top of the
   candidate to its buttons is materially smaller than the 1,510 pixels
   recorded above, and the report states the new figure and how it was
   measured. A number that has not moved is a failed check, not a small one.
2. **`c2` - nothing was deleted.** Every fact the card shows today is still
   present and still exact: the changed-path list, the worker's disposition,
   changes, checks and limitations, the bounded evidence line, and the four
   "what has not happened yet" statements. A test opens each fold and asserts
   the content is really there, not merely present in the DOM while collapsed.
3. **`c3` - the three voices stay separate and attributed.** A row still shows
   Cairn's own finding, the worker's claim labelled as a claim, and the owner's
   judgment, with none standing in for another.
4. **`c4` - the pinned sentences and provenance labels survive**, and every
   containment guard passes unrelaxed.
5. **`c5` - the second opinion is still above the decision**, proved by the
   document-order check Task 241 added.
6. **`c6` - every Slice 1, 2 and 3 behaviour still holds**, including the
   disabled Continue with its named owed row, `TASK_PROMISE_NOT_MET`, honest
   STOPPED, and the byte-identical close for a promise-free run.
7. **`c7` - focused machine checks pass**, each named with its exact command
   and its real result in the report.
8. **`c8` - the owner can read it.** Under the app token, an ordinary-route
   offscreen disposable-profile E2E captures the WHOLE candidate, with the
   decisive controls asserted in viewport first. The owner answers: "Could
   someone who knows nothing about this project read this screen and know what
   happened, what is still owed, and what their two choices are?"

## DONE and STOPPED

**DONE** means the outcome above holds through the ordinary Chat path, `c1`
carries a real measured reduction, `c8` carries the owner's own words, and
exact-path commits leave the main checkout clean.

**STOPPED** means the screen cannot be shortened without merging the voices,
dropping a fact, or relaxing a guard - in which case say exactly which one and
stop, because every one of those is a worse outcome than a long screen.

The milestone does not move here. This is a repair, not a slice.
