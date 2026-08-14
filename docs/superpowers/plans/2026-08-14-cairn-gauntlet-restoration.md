# Cairn Gauntlet Restoration Implementation Plan

**Status:** Owner-requested direction recorded by Task 234. Implementation has
not started. This plan claims no future task numbers and authorizes no provider,
worker, credential, paid, deletion, push, or other external action. Choices that
affect live calls, recovery expectations, critic policy, milestone judgment, or
deletion remain explicit owner gates below.

**Audited baseline:** clean `main` at `eb46dde`, after Task 233.

**Goal:** Restore Cairn's own modified Gauntlet as a small extension of the
ordinary conversation -> coding worker -> verified result route. A beginner
should be able to see what Cairn intends to prove, approve the existing worker,
inspect an unsealed result, optionally ask a separate critic to challenge it,
approve at most one repair, and receive Cairn's honest final result.

**Approach:** Use a strangler migration. Build the smallest live stages around
the existing normal route, prove one complete Cairn self-improvement, then
remove the shadow Q9 and proposal-Builder routes from the outside inward. Reuse
small behavior or UI pieces only when they make the live route simpler. Existing
machinery has no presumption of survival.

## 1. Why this plan exists

The original Gauntlet design was bounded and product-shaped:

1. freeze the owner's visible promises and checks;
2. let the existing coding worker produce a candidate;
3. run Cairn's checks and any owner judgment;
4. let a separate tool-free critic challenge a frozen promise;
5. confirm or dismiss the exact challenge;
6. allow at most one separately approved repair;
7. rerun the original checks and seal `DONE` or `STOPPED` honestly.

The critic was never meant to invent requirements, make issue count control
completion, or authorize a block by itself. The design explicitly rejected an
unlimited repair treadmill.

Implementation took a different path. Q1-Q9 added about 70,000 lines before an
ordinary task could enter the lifecycle. Task 220 completed an extensive
fake-only route. Task 221 then confirmed that ordinary Main still called the
legacy `runSerialTask` path while only the guarded fixture could call the
candidate path. Tasks 222-223 tried to prove a new coding-worker sandbox and
universal Evidence Plan before restoring the user journey. Task 224 changed the
meaning of Builder from coding worker to tool-free proposal generator and began
a separate selector/applier/reservation architecture. Task 233 spent one
approved OpenRouter call, received HTTP 200, then discarded the answer because
router metadata could not satisfy an exact upstream-provider proof.

This was not a failure of the bounded Gauntlet idea. It was a failure of
implementation order and evidence proportionality: Cairn proved increasingly
narrow internal boundaries before giving the normal user a product entrance.

## 2. Lessons adopted from DELVE

DELVE has made more visible progress when it:

- puts one real artifact in front of the owner early;
- asks one plain judgment question;
- uses controlled A/B comparisons that vary one thing;
- lets executable checks reject technical invalidity while the owner judges
  appearance and usefulness; and
- changes method after two stopped attempts at the same goal.

This plan deliberately does not copy DELVE's weaker patterns: oversized memory
documents, ambiguous concurrent tracks, AI taste panels, exact old-state or
pixel-hash preservation across intentional repairs, and diagnostic ladders that
continue after the visible question is already answerable.

The transferable rule is simple: **build the artifact before building its
adjudication system.**

## 3. Owner-visible finish line

In ordinary Cairn Chat, with no task-specific environment flag or alternate
product entrance, a beginner can:

1. ask Cairn for a small software change and receive useful pushback;
2. see a short Task Card containing the visible outcome, normally one to three
   `cN` checks, every accepted blocking requirement, and any genuinely
   nonblocking preference;
3. cancel with no worker call, or approve the existing coding worker;
4. see the worker's real edits as an **unsealed candidate**, with original
   checks and honest limitations, before Cairn claims completion;
5. separately approve a tool-free critic call with exact provider, model, data,
   project, cost/quota, and retry disclosure;
6. see critic findings tied only to the frozen checks, with extra suggestions
   labeled advisory;
7. confirm or dismiss an alleged failure and, if confirmed, separately approve
   one repair by the same coding worker;
8. receive a verified `DONE` or honest `STOPPED` result card authored by the
   envelope, followed by the conductor's commentary; and
9. complete one small visible improvement to Cairn itself through that route.

The recommended first version is deliberately foreground-only. A graceful cancel or an
interruption Cairn can still observe may close `STOPPED`. Unexpected process
loss cannot author a durable card after death: it produces no `DONE` claim,
leaves worktree edits inspectable, and the next session explains the dirty state
without resuming or reconstructing the run. There is no automatic retry.

## 4. Restored roles and authority

### Cairn conductor

Talks with the owner, pushes back, clarifies intent, and prepares the compact
Task Card. It does not edit the project or decide that worker claims are proof.

### Builder

Means the **existing coding-worker adapter**. After the owner approves its
disclosed capability boundary, it may edit the named project using the current
worker route. Task 224's tool-free proposal model is not the Builder used by
this plan.

### Candidate

Means the coding worker's real worktree edits and claims after the worker
finishes but before Cairn seals the task. It is not an inert patch proposal and
does not require a second selector/applier product. The dispatch approval is
the edit authority; final sealing remains Cairn's responsibility.

### Critic

Is a separate, one-shot, tool-free inspector. It cannot write files, run
commands, add requirements, declare `DONE`, or authorize repair. It may allege
that a frozen check is met, not met, or unclear and may provide advisory notes.

### Envelope

Owns verification, confirmation of critic allegations, the one-repair limit,
rerunning checks, records, exact-path commit, result card, and honest terminal
state.

## 5. Non-negotiable protections

- Credentials never enter chat, terminal output, prompts, records, commits, or
  tests. The owner operates connection UI personally.
- Ordinary conductor messages and final commentary may run within the current
  standing connection authorization. Any widened data or selected-file scope
  pauses for renewed consent. Each worker dispatch, paid worker call, critic
  call, repair call, and other concrete-risk action retains its exact
  just-in-time approval naming provider/router, requested model, project, data,
  maximum cost or quota, and retry count.
- No automatic external retry, fallback, continuation, or second repair.
- Existing tracked, staged, modified, and untracked Git work is protected.
- A candidate is visibly nonterminal. Cairn never calls it applied, verified,
  committed, published, or `DONE` merely because a worker produced it.
- A critic finding blocks only after deterministic evidence or the owner
  confirms the exact frozen-check failure.
- A repair requires its own approval and uses the same declared worker boundary.
- Cairn authors the terminal report and result card from checks it actually ran;
  worker and critic claims remain attributed.
- Applying or finalizing any proposal outside this coding-worker route still
  requires the explicit authority of that future product surface.

Everything beyond these protections must earn its cost through an observed
failure in the live route.

## 6. The one product spine

For this plan, **normal route** means ordinary Chat and manual Task Run through
their production IPC/Main/renderer path. It excludes `CAIRN_TEST_Q9`, Q9 or
calibration markers, task-numbered environment hooks, lab pages, and alternate
fixture-only product entrances.

At the audited baseline:

- ordinary task execution in `app/src/main/tasks.ts` calls
  `runSerialTask(...)`;
- the guarded Q9 fake calls `runSerialTaskToCandidateForStateTest(...)`;
- the live adapters advertise the legacy serial task, while the candidate
  adapter is supplied by the fake route; and
- quality preview/activation is absent from the normal product route.

The intended live seam is one process-local, Main-held pause inside the existing
serial runner after successful worker-result, claims, and Git inspection and
before terminal records, commit, and result publication. The runner retains its
original lock, starting snapshot, selected adapter, and abort signal while Main
shows a bounded display projection and awaits an ordinary session-bound choice.
The continuation may later resolve `continue`, `stop`, or `repair`; repair is a
second adapter invocation owned by that same open runner, never a nested call to
the normal serial entry. Main must not export a new candidate custody protocol.
`runSerialTaskToCandidate(...)` and `app/src/main/qualityloop.ts` may be read as
historical evidence, but are not the implementation base.

Migration therefore proceeds from the normal route outward:

```text
ordinary accepted intent
  -> compact Task Card
  -> existing worker approval and dispatch
  -> in-memory unsealed candidate
  -> original checks / owner observation
  -> optional or required critic approval
  -> confirm or dismiss exact allegation
  -> zero or one approved repair
  -> rerun original checks
  -> envelope seal / result card / commentary
```

Do not activate Q9 wholesale. The implementation may extract a small concept or
presentation from Q9 only after comparing it with a simpler live-route change.
If reuse imports custody, persistence, activation, or recovery requirements the
visible slice does not need, do not reuse it.

## 7. Small data contracts

These are behavior shapes, not a requirement to create separate protocols or
versioned subsystems.

### Task Card

- one plain-language visible outcome and every accepted blocking requirement;
- normally one to three ordered checks, with `c1` representing the outcome and
  later ids representing every accepted requirement; never truncate or hide a
  requirement merely to meet the preferred card size;
- if an accepted request is too broad to present clearly, return to conductor
  pushback for narrowing or display every row; do not silently compact it;
- a manual direct request, when parity is implemented, starts with `c1` as its
  visible outcome rather than invented requirements;
- zero or more preferences only when the accepted source genuinely marks them
  advisory; `owner-unsure` or `cairn-chosen` is not automatically a preference;
- ids stay stable within the accepted run without requiring hashes,
  live-object identity, or byte-identical projections;
- which checks are automated and which require owner observation; and
- the active limits: whether critic and repair are available in this slice.

The same semantic promises must reach the worker contract, candidate, verifier,
critic, repair, and result. A display-only card is not an implementation. Do not
advertise critic or repair before those stages are actually live.

### Project verification menu

Slice 2 implements this menu; later slices consume it. Start Cairn-specific.
Select from a small set of already established project commands plus owner
observation before dispatch. After the worker and after any repair, the envelope
runs the same selected commands itself while the original serial lock remains
held. Worker-reported commands stay attributed claims. If no configured check
can test an outcome, say so and use owner observation or stop; do not invent a
universal Evidence Plan or command-authority DSL.

### Critic result

Each blocking candidate finding contains only:

- `checkId`;
- `judgment`: `met`, `not_met`, or `unclear`;
- a short observation; and
- references to evidence actually included in the critic packet.

Everything not tied to a frozen check is a nonblocking note. Raw issue count,
severity inflation, and preferences never determine completion.

## 8. Provider and routing truth

For calls through a router, Cairn discloses the router as a data recipient, the
requested model/provider constraints, bounded data and spend, retry policy, and
whatever routing metadata the router reports. Cairn must state that it cannot
independently attest which upstream physically served the request.

If the owner requires “provider X and nobody else” as a hard data boundary, use
a direct provider connection with exact approval or do not call. A response
parser cannot undo exposure or cost after a router has returned HTTP 200.

No exact upstream-provider attestation or calibration ladder is part of this
plan.

Candidate file contents sent to a critic must also obey Cairn's existing
selected-tracked-text boundary: at most eight eligible Git-tracked text files,
8,000 characters from one file, and 32,000 characters total, with renewed
consent where required. Exclude credential-like paths, ignored or untracked
files, linked files, binary files, dependencies/generated areas, `.git`,
`.cairn`, and anything outside the project. Unsupported evidence produces an
honest `unclear`; it never silently widens the packet.

## 9. Serial implementation slices

Each slice is separately claimed. Product Slices 1-5 are complete only when
their new action is visible through the ordinary route. Slice 6 is explicitly
post-milestone cleanup and claims no new product progress. At most one bounded
supporting repair may follow an observed blocker before the same normal journey
is rerun.

### Slice 1 - Pause ordinary Chat at one unsealed candidate

**Beginner-visible outcome:** After locally injected conductor and coding-worker
transports drive ordinary Chat, Cairn pauses before terminal authoring and shows
an **Unsealed candidate** containing the accepted request, actual changed paths,
worker claims clearly labeled as claims, and what remains before completion.
The current brief may already exist, but no report, LOG row, commit, result card,
or `DONE` exists until the owner chooses **Continue to Cairn's current checks**.
The owner may instead choose **Stop and keep the work for inspection**.

**Work:** Add one trusted pre-terminal continuation to the existing successful
`runSerialTask(...)` path after worker-result/claims/Git validation and before
the current DONE close. The runner retains its original lock, start snapshot,
chosen adapter, and abort signal. Main exposes only a display projection and
resolves `continue` or `stop`. Continue runs the existing terminal path. A
controlled stop while Cairn is alive writes an honest `STOPPED` report/LOG row,
commits nothing, and leaves edits for inspection. Abrupt process loss writes no
terminal claim. Limit acceptance to ordinary Chat; manual Task Run parity is
not required for the current milestone.

**Likely seams to inspect first:** the normal success branch in
`core/src/serial.ts`, `app/src/main/tasks.ts`, the normal Chat result/activity
surface, directly related shared IPC/types, and focused tests. Verify current
consumers before editing.

**Checks:** local injected conductor and worker transports at their existing
seams reach the checkpoint through ordinary Chat IPC/UI with no Q9/task-specific
product entrance; no terminal artifact exists before a choice; continue produces
the unchanged current terminal result once; controlled stop produces `STOPPED`
with no commit; abrupt callback/process loss cannot forge `DONE`; protected
starting work remains intact; the owner can judge the real checkpoint in an
ordinary-route screenshot captured from an owned offscreen disposable
project/profile under the app token. Do not use the owner's profile or add a
special visible-E2E marker merely for this judgment.

**Do not add:** Task Card `cN` promises, verification menu, critic, repair,
persistence, Q9 activation, provider call, credential access, new dependency,
manual-route parity, or broad cleanup.

**STOP if:** the checkpoint cannot stay inside the original runner/lock, the
existing success branch cannot continue unchanged, or decisive evidence needs
a task-specific product route. Explain the exact coupling instead of activating
the Q9 lifecycle.

**Owner gate 1:** Is it unmistakable that the worker has changed files but Cairn
has not yet declared the task complete? The owner judges the captured ordinary-
route screenshot; Playwright exercises the choices.

### Slice 2 - Make the Task Card and checks authoritative

**Beginner-visible outcome:** Before dispatch, ordinary Chat shows a compact
Task Card derived from the accepted intent. After the worker, the same semantic
promises and Cairn's own selected check results appear on the unsealed candidate.
No accepted requirement is hidden, and worker claims are distinct from envelope
checks and owner observations.

**Work:** Map the accepted outcome and every blocking requirement to run-local
`cN` rows, normally one to three but never silently truncated. Carry those
semantic rows into the normal worker contract, candidate, terminal report, and
result card without requiring hashes or object identity. Do not manufacture
preferences. Add the initial Cairn-specific verification menu: a small list of
known Cairn commands plus owner observation, selected before dispatch and shown
on the card. After the worker, the envelope runs the selected commands itself
inside the still-open serial run; owner-observation rows remain pending until
the owner answers. The worker may report other commands, but they remain claims.

**Checks:** cancel before dispatch makes zero worker calls; approval invokes the
existing worker once; the worker receives every displayed blocking row and its
result answers each as an attributed claim; the envelope runs only the selected
known checks; no hidden requirement or invented preference exists; owner checks
cannot be auto-passed; the candidate and terminal result preserve the same
semantic rows; the owner judges the card and candidate together in ordinary
Chat.

**Do not add:** generic Evidence Plan/command DSL, critic, repair, restart
recovery, calibration, provider proof, or manual Task Run parity unless it is a
small consequence of the shared normal component rather than a second scope.

**STOP if:** a check requires arbitrary command authority, an accepted request
cannot be represented without hiding a requirement, or binding the Task Card
would require importing Q9 custody/activation machinery.

**Owner gate 2:** Is it clear what counts as done, which evidence Cairn checked,
which statements came from the worker, and what still needs owner judgment?

### Slice 3 - Add one separately approved tool-free critic

**Beginner-visible outcome:** From the real candidate screen, the beginner can
skip critique or approve one disclosed critic call and see short findings tied
to the frozen checks. Suggestions are visibly advisory.

**Work:** Use a connected provider transport only if it can remain one-shot and
tool-free without the Q8/Q9 calibration route. Build the packet from the Task
Card, envelope check results, attributed worker claims, and only separately
approved eligible tracked-text excerpts within Section 8's limits. Show the
exact call disclosure before any new data or spend. Unsupported evidence yields
`unclear`.

**Checks:** a local fake at the same transport seam proves skip, unavailable,
`met`, `not_met`, `unclear`, injection-like candidate text, and advisory-only
notes through the normal UI; critic cannot write, add a blocking id, start a
repair, or declare a terminal result; malformed/unavailable output causes no
automatic retry; packet preview and request share the same disclosed semantic
contents without an identity-proof protocol.

**Live owner gate 3:** Before the first real critic call, the owner chooses
required or optional mode and approves the exact provider/router, model,
project, eligible packet contents, maximum cost/quota, and zero-retry rule. The
recommended milestone mode is required, but the owner decides when this gate is
reached.

**STOP if:** a useful call is conditional on an exact activation tuple,
upstream-provider proof, synthetic qualification corpus, or a second product
route.

### Slice 4 - Confirm one allegation, permit one repair, then seal

**Beginner-visible outcome:** A critic challenge names one frozen check. Cairn
or the owner can dismiss it or confirm it. A confirmed failure offers one
separately approved repair; afterward Cairn reruns every original check and
produces `DONE` or `STOPPED` with no treadmill.

**Work:** Extend the same open runner continuation with `repair`. Do not call
`runSerialTask(...)` recursively or release the original run lock. The original
runner owns a second invocation of the already selected adapter using the same
start snapshot and abort boundary. The repair request carries the immutable
Task Card, confirmed finding, and smallest requested correction; it cannot
widen the task. Refresh worker claims, Git facts, changed paths, and all original
verification-menu results before terminal close. A final critic call is allowed
only if the owner-selected mode requires it and receives a new exact approval.
Maximum: one repair and two critic calls total (initial and post-repair), with no
automatic network retry.

**Checks:** dismissal changes no files; repair cannot start without confirmation
and separate approval; nested normal runs are impossible; the original lock and
snapshot remain authoritative; a second repair is unavailable; every original
check reruns; normal scenarios cover successful repair, regression, worker
failure, critic unavailable, and failed checks; only the envelope authors
records, commit, result card, and terminal state.

**STOP if:** implementation requires releasing the original lock, restart
recovery, cross-process custody, native patching, a second writer, or a new
evidence language.

### Slice 5 - Prove the milestone on Cairn itself

**Beginner-visible outcome:** In one normal Cairn conversation, the owner asks
for one tiny visible Cairn improvement and watches request -> pushback -> Task
Card -> approved worker -> candidate -> critic policy -> optional one repair ->
checked result -> commentary.

**Work:** No architecture expansion. Choose a change whose result the owner can
judge in one session, such as clearer empty-Chat guidance. A disposable-project
rehearsal is optional only if the owner wants it; it is not another prerequisite
or qualification rung. Each concrete external call receives the approval
required by Section 5.

**Checks:** normal production entrance, no test marker; exact Git diff and
project checks; honest provider/worker/critic disclosures and usage; no hidden
retry; result card and commentary agree with envelope evidence; no task-owned
process or lock remains. The owner decides whether the milestone moved.

**STOP if:** any call, cost, data scope, worker capability, cleanup target, or
recovery is unclear. Do not repair architecture during the live evidence run;
record the first normal-path blocker for one bounded follow-up.

### Slice 6 - Retire the shadow routes after the milestone

This is post-milestone cleanup, not a new beginner capability or a milestone-
movement claim. Its evidence is unchanged normal Gauntlet behavior plus
net-negative source.

**Work:** One subsystem per cleanup task. First disable and remove task-specific
entrances and writers. Retain backward readers needed to open existing saved
Builder-review turns/cards. Remove modules and tests only when they have neither
a normal live consumer nor a historical-read compatibility role. Remove old
readers only after an explicit compatibility or migration decision. Preserve
all historical plans, briefs, reports, LOG rows, and owner data.

Recommended outside-in order:

1. Task 233 live fixture, strict upstream proof, markers, and bespoke harness;
2. Task 231-232 fixed writers/selectors and Task 229's lab entrance, while
   retaining any backward card reader still needed for saved conversations;
3. Task 224-228 proposal intercom, reservation kernel, and durability planner
   with no live or historical-read role;
4. Q9 environment boot, fake driver, dedicated E2E matrix, activation and
   calibration-only routes;
5. unused pending-run/candidate journals, custody graphs, and gates; and
6. duplicate Task Spec/Quality Plan layers after the compact live representation
   owns every normal consumer.

**Checks:** each task is net-negative; current and historical-read consumers are
classified before removal; the normal Task Card, candidate, critic, repair,
result, abrupt-loss-no-DONE behavior, and Git protections remain; old saved
Builder-review turns still open while their reader is promised; production
bundles contain no removed entrance marker.

**STOP if:** a file still owns runtime truth, historical-read compatibility,
current project identity, approval, Git protection, focus/accessibility
behavior, or a normal consumer.

## 10. Anti-drift execution rules

These are manual planning tripwires, not runtime gates, schemas, scores, or
another safety harness.

1. Every implementation task names one action the owner can try through
   ordinary Cairn in five minutes.
2. A test-only, lab-only, marker-only, or fake-only entrance cannot satisfy a
   product task. Fakes may replace a transport at an existing seam while tests
   drive the same normal IPC/UI route.
3. At most one bounded supporting task may follow a blocker observed in the
   immediately preceding normal trial. The next task reruns that trial.
4. Two stops for the same visible journey require a smaller outcome, different
   approach, experienced help, or deferral. Do not start a third proof ladder.
5. Any proposed journal, HMAC, receipt, object brand, activation tuple, route
   fingerprint, native helper, or task-specific hook must name the observed
   failure and credible harm it alone addresses.
6. If evidence/harness code exceeds the behavior implementation, if the harness
   is the only entrance, or if a slice approaches roughly eight production
   files or 1,000 added production lines, pause for a read-only owner scope
   choice. These are warning facts, not a PASS/FAIL score.
7. Do not use the LOG's self-reported “Milestone moved?” field to justify
   direction. Ask observable questions: Can normal Cairn do a new action? Did
   the owner see it? Where did the last normal trial stop?
8. Review remains optional. If the owner requests it or a concrete unresolved
   risk warrants it, cap it at one fresh round unless that round identifies the
   specific unresolved risk. Review does not become a standing ladder.
9. Once the live vertical slice succeeds, later Gauntlet work should reduce
   duplicate source until there is one route.

## 11. Risk register

| Risk | Smallest response |
|---|---|
| Legacy runner seals too early | Characterize it, split one post-worker/pre-seal seam, and reuse finalization. |
| Q9 types pull in the shadow lifecycle | Prefer a smaller live type or local projection; do not activate Q9 to save code. |
| Candidate looks like completed work | Label it nonterminal and show what remains before sealing. |
| App closes mid-candidate | Graceful shutdown may report `STOPPED`; abrupt loss makes no terminal claim and leaves edits inspectable. Defer resume machinery. |
| Worker has broad capability | Disclose the existing boundary immediately before dispatch and protect Git/credentials; qualify more only after an observed capability failure. |
| Critic recreates the old rejection loop | Only frozen check ids can be challenged; Cairn/owner confirms; one repair maximum. |
| Router cannot prove exact upstream | Disclose router limits or use a direct provider; do not infer attestation. |
| Cleanup removes useful truth | Delete only after normal-route success and a fresh zero-consumer check. |
| The plan becomes another ceremony | Keep each slice visible, bounded, and independently stoppable; do not elaborate speculative subprotocols. |

## 12. Whole-plan DONE

The restoration is complete only when:

- one ordinary Cairn conversation completes the full bounded Gauntlet on Cairn
  itself with no Q9/task-specific product entrance;
- the Task Card, candidate, critic, confirmation, optional one repair, checks,
  result card, and commentary tell one consistent beginner-readable story;
- credentials remain unexposed and every external/paid/data/worker/repair effect
  has its exact approval;
- worker and critic claims remain attributed while the envelope owns terminal
  truth;
- graceful interruption is handled honestly, while abrupt process loss creates
  no terminal claim and leaves inspectable Git state, without automatic resume
  or retry;
- the owner decides whether the evidence moves the milestone; and
- duplicate fake-only Builder/Q9 architecture has been removed or has a named
  current normal consumer and observed reason to remain.

## 13. Owner decisions at the real gates

This plan records a recommended architecture; it does not silently pre-approve
later risk or deletion decisions.

1. **Before Slice 1 implementation:** the owner accepts the recommended
   foreground-only checkpoint behavior or amends it. Rejecting foreground-only
   stops this plan; it does not automatically authorize persistence machinery.
2. **At Owner gate 1:** the owner judges whether the candidate state is plainly
   nonterminal before Cairn adds authoritative checks.
3. **At Owner gate 2:** the owner judges whether the Task Card and evidence
   distinctions are clear enough to continue toward an independent critic.
4. **Before any real coding-worker trial:** the owner chooses the named worker,
   provider/model, project, data scope, cost/quota, and accepts or rejects reuse
   of the existing worker capability boundary. Rejecting it stops the live trial;
   it does not automatically authorize another sandbox campaign.
5. **Before the first live critic:** the owner chooses required versus optional
   mode, provider/router and model, packet contents, spend/quota, and accepts
   honest router disclosure or requires a direct provider.
6. **Before the self-hosting demonstration:** the owner chooses the tiny visible
   Cairn change and approves each concrete external call as it arises.
7. **After the demonstration:** only the owner decides whether the milestone
   moved and whether the dormant Q9/Builder subsystems may be deleted.

## 14. Deliberate exclusions

This plan does not add or authorize:

- a new qualification ladder, forensic evidence level, automated Direction
  Gate, or milestone score;
- exact upstream-provider proof through a router;
- universal Evidence Plan or arbitrary command-attestation language;
- restart-resumable multi-round repair, cross-process custody, or automatic
  recovery;
- a native patch applier, private-ref publication system, permission-preserving
  writer, or new OS/network sandbox campaign;
- multi-agent execution, multiple simultaneous workers, or unlimited critic
  turns;
- broad visual redesign, phone-authority expansion, deployment, publication,
  push, dependency installation, or provider connection; or
- deletion of owner data, historical records, or existing work.
