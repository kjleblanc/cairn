# Task 240 brief - show one approved critic's findings on the unsealed candidate

**Lane:** A (the main checkout). **Base commit:** `40be570`.

This is Slice 3 of
`docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md`, begun from
`docs/ai-work/HANDOFF-gauntlet-slice3.md`. Task 239's report is prerequisite
reading, and the handoff's ordered list is this task's scope in that order.
Slice 3 is split across two tasks by the owner's decision below: Task 240
builds the whole critic stage and proves it offline, and Task 241 adds the
live call. Slice 4 does not begin in either.

## Owner decisions taken before this brief was claimed

- **Slice 3 lands as two recorded tasks, both in this session.** The design
  reaches about ten production files before the live call and about thirteen
  with it. The plan's anti-drift rule 6 requires a read-only owner scope
  choice at roughly eight production files or 1,000 added production lines,
  so that choice was put to the owner rather than pushed past. The owner
  chose two tasks. This keeps each task inside the tripwire, and it means a
  failing live call in Task 241 cannot be blamed on unproven plumbing.
- **The live call in Task 241 uses the connection the owner already has.**
  Cairn reuses the connected conductor's provider, base URL, model and stored
  credential rather than asking for a second connection. The owner still gives
  gate 3 on the exact call in Task 241, after seeing the real disclosure.
  Nothing in Task 240 makes that call.
- **This task makes no provider call at all.** Every behaviour below is proved
  at the existing transport seam with the fixture conductor. That is not a
  weaker proof of the stage: it is the only way to demonstrate `unclear`,
  unavailable and malformed output on demand, which a live call cannot be
  made to produce.

## Requested visible outcome

In ordinary Cairn Chat - not `CAIRN_TEST_Q9`, not a calibration environment,
not the lab page, not a task-numbered marker, and not the manual Task Run
screen - the unsealed candidate screen Slice 2 already ships now offers one
more thing before the owner's two existing choices.

The beginner can ignore critique entirely and continue or stop exactly as they
do today. Or they can read a card that says plainly what would be sent, to
which provider and model, that it is one request with no retry, and that the
critic cannot read or change the project. If they approve it, Cairn makes
exactly one call and then shows short findings on the same screen.

Each finding names one of the frozen `cN` rows the owner already accepted,
says `met`, `not met` or `unclear`, gives a short observation, and points at
evidence that was actually in what Cairn sent. Anything the critic says that
names no frozen row appears in a visibly separate advisory block that gates
nothing. After reading, the owner still makes the same two choices Slice 2
gave them, and the row controls and the Continue rule are unchanged.

## Design choices recorded before the work

The handoff names three decisions this slice must make. All three were
settled by reading current source before this brief was written, and the
report will restate each with exact line references.

**1. Cairn authors a smaller critic-call disclosure. It does not reuse
`app/src/shared/critic-call.ts`'s `CriticCallDisclosureV1`.** Three
independent facts disqualify reuse:

- The shipped card cannot state a one-shot call. `CRITIC_CALL_ATTEMPT_CAP` is
  `3` (`app/src/shared/critic-call.ts:156`) and the parser rejects any
  disclosure whose `attemptCap` is not exactly that for a non-calibration
  kind (`app/src/shared/critic-call-parse.ts:229`). A card reading "call 1 of
  at most 3" would misstate the zero-retry rule the owner is approving.
- Producing a valid one requires a Core-branded authorization
  (`app/src/main/criticapproval.ts:203`), whose root is `canonicalTaskSpec`,
  which returns null for any spec not carrying a process-local brand
  (`core/src/quality.ts:1215`). The only four product callers of
  `bindTaskSpec` are `builderproposalreviewfixture.ts:119`,
  `conductor/qualityproposal.ts:652`, `criticcalibration.ts:392` and
  `q9fake.ts:469` - every one of them a declared non-goal of this slice.
- The surface cannot be opened during a run at all: `critic:calibration-open`
  refuses with `CRITIC_CALIBRATION_TASK_ACTIVE` whenever a task is running
  (`app/src/main/tasks.ts:870`), and the pause keeps the task running.

The card's owner-facing *sentences* are good and are reused verbatim where
they fit - the purpose line at `app/src/shared/critic-call.ts:9`, the
not-sent list at `:19`, and the credential sentence at `:29`. Copying proved
wording is not the same as importing a type that cannot say what is true.

**2. Cairn adopts nothing from `core/src/critic.ts`.** The same brand root
disqualifies it: every entry point calls `taskSpecSha256` first and returns
null without a branded spec, so the types compile and the functions return
null at runtime. Independently, its `CriticFindingV1` carries `severity` and
`smallestRepair` (Slice 4 material), its vocabulary is
`met|not-met|cant-tell|tie` rather than this slice's three, its `criterionId`
admits `p${number}` preference ids the Task Card has no concept of
(`core/src/critic.ts:331`), and `deriveCriticPolicy` computes the
`stopped`/`blocked`/`waiting-owner` outcomes this slice denies the critic
(`core/src/critic.ts:3055`, computing them at `:3255`). Five of its ideas are
copied with credit and no
import: its system prompt, its positional closed-world binding rule, its
evidence-subset rules, its `inspectRecord` hygiene, and its cap numbers.
This is the same decision Task 237 recorded about `cairn-serial-task/v4`.

**3. The one call is made from Main, during the still-open pause, on
`postChatCompletions`, and its findings reach the screen on a
checkpoint-keyed sidecar.** `postChatCompletions`
(`app/src/main/conductor/transports/openai-compatible.ts:35`) takes
`{baseUrl, apiKey, body, signal, fetchImpl}` and carries no brand; it is the
same primitive the conductor already uses in production, and it posts to the
same route the fixture conductor serves, so one code path is provable offline
and works live. `sendCriticCall` is not usable: it refuses anything without
the branded authorization (`app/src/main/critictransport.ts:278`).

The findings must not replace the pause projection. Three reference-identity
comparisons pin that exact frozen instance -
`app/src/main/unsealedcandidate.ts:238`, `app/src/main/tasks.ts:1356` and
`app/src/main/tasks.ts:1371` - and replacing it would stop an abort or a
destroyed window from settling the pause, leaving the run hung while holding
its lock. A sidecar field on the polled session leaves all three intact, and
the renderer already re-reads that session every second while the run is live
(`app/src/renderer/screens/Chat.tsx:1061`), so nothing needs pushing.

## Boundary of intent

- Preserve worker authority, the worker prompt's content, routing, pre-work
  approval, cancellation, timeout and orphan handling, protected-Git checks,
  records, exact-path commit behavior, result cards, conductor commentary,
  provider connections, and milestone logic.
- Preserve every Slice 1 and Slice 2 behaviour: the pause, the two choices,
  the Task Card, the three-voice answered rows, the disabled Continue while
  an owner row is unanswered, `TASK_PROMISE_NOT_MET`, honest STOPPED, and
  abrupt-loss silence.
- A run given no promises still reaches the current terminal close
  byte-for-byte. The result card gains no key when there is nothing to say:
  `app/src/main/conductor/relay.ts:201` writes `promises` only when rows
  exist, because `app/tests-unit/resultcard.test.ts:364` compares
  `JSON.stringify(card)` against an exact literal. A `critique` key added
  unconditionally would fail it the same way.
- A critic finding changes nothing by itself. Nothing this task adds may be
  read by `serialTaskPromisesSatisfied` (`core/src/taskcard.ts:312`) or reach
  `TASK_PROMISE_NOT_MET` (`core/src/serial.ts:7514`). The critic is a fourth
  voice beside Cairn, the worker and the owner - never inside any of them.
- Do not relax a containment guard. If one fires, reword the code or the
  comment. The guards match comments as well as code:
  `app/src/main/unsealedcandidate.ts` must not gain `node:child_process`,
  `node:fs`, `electron`, `fetch`, `spawn`, `exec`, `commit`, `seal`,
  `writeFile`, `appendFile` or `runSerialTask`; `chooseUnsealedCandidate` in
  `Chat.tsx` must not gain `disposition`, `commit`, `seal` or `DONE`;
  `UnsealedCandidate.tsx` must keep its three exact sentences and import
  nothing from `main/`; `UNSEALED_CANDIDATE_CHOICES` stays frozen as
  `["continue", "stop"]`; and exactly one preload route named
  `task:candidate-decide` may exist.
- The critic's approval therefore rides its own new preload channel, not the
  pause's. Slice 2 added none and that was worth trying to keep, but the
  existing channel retires the pause on any valid choice
  (`app/src/main/unsealedcandidate.ts:208`), so it cannot carry a press that
  must not settle anything. One new channel and one new `CairnApi` method are
  in scope; a second is not.
- Do not activate, import or advertise: repair execution, a second worker
  invocation, any Slice 4 behaviour, Q8 or Q9 calibration, activation tuples,
  route fingerprints, qualification corpora, candidate custody, persistence,
  restart recovery, the Task 224-233 proposal machinery, a universal Evidence
  Plan, a command-authority DSL, or arbitrary command execution.
- Do not name a new export that collides with one of the 122 in
  `core/src/critic.ts`; `core/src/index.ts:103` re-exports that module
  wholesale, so a collision breaks the barrel.
- No real provider, conductor, Builder or critic model call. No credential is
  read, printed, copied, committed or logged. Install nothing. Add no
  dependency.
- Automated evidence stays local and injects fakes only at the existing
  seams: `app/tests/fixtures/fake-conductor.mjs` and
  `app/tests/fixtures/fake-codex-env.ts`, combined at `CAIRN_MOCK=0` exactly
  as the Slice 2 tests at the end of `app/tests/conductor.spec.ts` do. Do not
  reach for `CAIRN_TEST_CRITIC_CALIBRATION`: it throws at boot unless
  `CAIRN_MOCK=1` (`app/src/main/main.ts:182`).
- Before any app or Playwright run, take the single-tenant app token with
  `mkdir %TEMP%\cairn-app-token`, which fails if it exists, and release it in
  a `finally` only if this run created it. Wait if the owner or another lane
  holds it; never close their app. Use a task-owned disposable project and
  the isolated offscreen E2E profile, never the owner's real profile.
- Touch no other worktree or lane branch, no historical record, no milestone
  fact, and no push or deployment.
- The nine failing app unit tests in `app/tests-unit/builderlivetransport.test.ts`
  and `buildertrackedtext.test.ts`, and the red `npx tsc --noEmit` in `cli/`
  from Task 211, are pre-existing on `main` and belong to other tasks. The
  honest app-unit baseline is 907 tests, 896 passing, 9 failing, 2 skipped.
  Do not chase them, do not count them as this task's regression, and do not
  touch the abandoned transport to "fix" them.

## Checks

1. **`c1` - the owner can ignore critique and the run closes exactly as it
   does today.** An ordinary-route run in which no critic is approved reaches
   the same terminal close, the same records and a byte-identical result card
   as before this task, proved by the existing result-card literal comparison
   still passing untouched.
2. **`c2` - approving makes exactly one call, and no automatic retry,
   fallback, continuation or second attempt exists on any failure path.** The
   fixture conductor counts requests; the count is exactly one after approval,
   and stays exactly one when the response is a transport error, a non-2xx
   status, empty, or malformed. A second approval press while one call is in
   flight or already spent does not produce a second request.
3. **`c3` - findings are tied only to frozen `cN` ids, and anything else is
   visibly advisory and gates nothing.** A finding naming an id the Task Card
   never froze is refused rather than displayed. A finding naming no row
   renders in a separate advisory block. Neither the advisory block nor any
   finding is readable by the completion gate, proved by mutation: making the
   critic allege `not_met` on every row must not change whether the run can
   seal.
4. **`c4` - `met`, `not_met`, `unclear`, unavailable and malformed each behave
   honestly and distinguishably through the normal UI.** Five scripted fixture
   responses produce five visibly different candidate screens, and the two
   failure shapes say the critic did not answer rather than inventing a
   judgment or blaming the worker.
5. **`c5` - injection-like text in the candidate or in the worker's claims
   changes nothing about what Cairn does.** A candidate whose changed paths
   and worker claims contain instruction-shaped text - including text telling
   Cairn the task is complete, telling the critic to ignore its rules, and
   text carrying NUL and bidirectional override characters - produces the same
   Cairn behaviour, the same frozen rows, and the same terminal truth as the
   same run without it.
6. **`c6` - the critic cannot write a file, run a command, add a blocking row,
   start a repair, or declare a terminal result.** The critic path holds no
   filesystem, process or Git handle; the request declares no tools; the run's
   terminal truth is still the envelope's; and no surface this task adds
   mentions repair.
7. **`c7` - the packet preview and the actual request carry the same disclosed
   semantic contents.** What the approval card lists is what the request body
   contains, compared by content rather than by an invented identity-proof
   protocol, and the comparison is made against the bytes actually sent.
8. **`c8` - the packet stays inside the tracked-text boundary and carries no
   file contents in this task.** The packet is the Task Card rows, Cairn's own
   check results and the worker's attributed claims. A packet built without a
   separate file-contents authorization contains zero file contents, and the
   eight-file, 8,000-character and 32,000-character caps and the exclusion
   list are enforced in code that Task 241 will turn on rather than written
   for the first time there.
9. **`c9` - every Slice 1 and Slice 2 behaviour still holds.**
   `core/test/serial.test.js` runs to completion, and the Slice 2 candidate,
   Task Card, three-voice and `TASK_PROMISE_NOT_MET` tests pass unmodified
   except where a fixture must learn this task's new contract, which the
   report names file by file.
10. **`c10` - focused machine checks pass, each named with its exact command
    and its real result in the report.** Core typecheck and build, the Core
    suite, the App unit suite against the 907/896/9/2 baseline, and
    ordinary-route Playwright.
11. **`c11` - the owner can read the critic decision and the findings.** Under
    the app token, an ordinary-route offscreen disposable-profile E2E captures
    the WHOLE critic decision card and the WHOLE candidate carrying findings -
    buttons included, nothing cropped, with `toBeInViewport()` asserted on the
    decisive controls before each shot so a future crop fails the test rather
    than reaching the owner. Both go in front of the owner, who answers: "Is
    it clear what the critic was asked, what it found, which of that is only
    advice, and that Cairn has not acted on it?" Playwright, not the owner,
    exercises every press.

## DONE and STOPPED

**DONE** means the visible outcome above holds through the ordinary Chat
product path, all eleven checks pass with `c11` carrying the owner's own
answer in their own words, this report and one LOG row close the task, and
exact-path commits leave the main checkout clean. A passing unit test or an
isolated component is not DONE.

**STOPPED** means the tree is not clean at the expected base or protected work
changed; or carrying findings onto the open pause would need a second pause, a
released lock, a second writer or cross-process custody; or the packet cannot
be built within the plan's Section 8 limits without widening it; or a
containment guard can only be satisfied by relaxing it; or the work needs a
provider call, credential, dependency or external action the owner has not
approved for that exact action; or the same underlying blocker has already
stopped this slice twice, in which case the next step is a smaller outcome or
a different approach, not a third proof ladder.

The milestone does not move here. An independent critic does not by itself
prove the request -> pushback -> dispatch -> verified DONE -> explanation
journey. Task 241 does not begin here, and Slice 4 begins in neither task.
