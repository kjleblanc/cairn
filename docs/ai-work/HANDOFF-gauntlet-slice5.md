# Handoff - Slice 5, partly proved on Cairn itself

**Last refreshed 2026-08-16 after Task 252.** Read "2026-08-16, later: three
real runs" first - it is the newest section and supersedes the older ones where
they disagree. Sections above it are kept because they still explain how each
slice was built, not because their status lines are current.

Originally written after Task 246 closed. The saved plan
`docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md` is still the
execution authority; this file is orientation.

**This file was `HANDOFF-gauntlet-slice4.md` until Task 246.** Tasks 244, 245
and 246 reference it at that path, and Slices 1 to 4 are now all done, so it
was renamed rather than left claiming to hand off finished work. The Slice 4
brief is `docs/ai-work/tasks/244-brief.md`; the Slice 4 handoff as it stood
before Slice 4 was executed is in Git history at `46715d8`.

## Where the restoration actually stands

| Slice | State |
|---|---|
| 1 - pause at one unsealed candidate | **Done** (Task 235) |
| 2 - authoritative Task Card and checks | **Done** (Task 239) |
| 3 - one separately approved tool-free critic | **Code complete and green. The live call has still never been made.** (Tasks 240, 241) |
| 4 - confirm one allegation, permit one repair | **Done** (Task 244) |
| 5 - prove the milestone on Cairn itself | **Partly done, for real.** Cairn ran on Cairn three times on 2026-08-16 and sealed one of them with its own commit. What is missing is a single run that carries the whole journey **and** leaves a durable record of it - see below |
| 6 - retire the shadow routes | Not started; post-milestone by design |

Recent commits, newest first:

- `de9336a` **Task 252**: the critic's findings survive the seal
- `0e22486` Task 252 part 1: the report can carry them
- `6b9ac2f` / `1fc2407` / `65c3f01` **Task 253**: untrack the build log, adopt the run it stranded
- `dcd3a60` **Task 250 - Cairn's own commit**, authored by Cairn
- `574b85b` Close Tasks 242 and 247 DONE
- `44b8428` **Task 249**: adopt the menu-bar change Cairn's crashed run left behind
- `991b569` **Task 247**: say something true when Git refuses the project folder
- `d48b65f` Claim Task 247
- `d10805f` Stop the handoff quoting an unpushed count that cannot stay true
- `1a11923` Update the handoff: two of Slice 5's three blockers are settled
- `c543a70` Record Task 242's landing and re-verify its numbers on main
- `ff53294` Put Task 242's log row back in order after the union merge
- `56b5700` **Land Task 242** (merge of `claude/keen-hawking-b5dfb8`)
- `01ed7b9` Record the owner's `c10` answer: it failed, and it is deferred
- `4ec95fb` Retitle the renamed handoff and fix its self-reference
- `425b7a4` Record Task 246's Core suite result: green
- `fdcf896` Complete Task 246: a check menu Cairn can actually pass
- `851e32a` Claim Task 246
- `fc23bec` Record that a second session wrote this checkout mid-task
- `07118f9` Task 245: a candidate screen that no longer contradicts itself
- `4fa9eed` Fill in Task 244's Core suite result and record the flake
- `dde2662` Complete Task 244

## What the last three tasks changed

**Task 244 built Slice 4.** A critic finding that a frozen `cN` row was not met
is now something the owner can act on. Cairn answers first for the rows it can:
an allegation against a row whose own `cairn-check` passed is refused by Core,
refused again by Main, and never offered on screen. What is left is the
owner's - dismiss, which calls nobody and changes no file, or confirm, which
offers **one** repair. The repair is a second dispatch of the same adapter
inside the **same still-open run**: same lock, same start snapshot, same abort
signal, `runSerialTask` never re-entered. Afterwards every original check reruns,
the pause reopens with repair no longer on offer and every owner row owed
again, and the envelope seals.

Three properties are structural rather than promised, and should stay that way:

- **The correction is the critic's own observation, verbatim.** There is no
  text input anywhere on the surface; a paper guard asserts the absence of
  `<input`, `<textarea` and `contentEditable`. That is what makes "a repair
  cannot widen the task" a fact about the shape.
- **Main whitelists the words.** The renderer holds the confirm/dismiss state,
  so it is the surface that could invent a correction. `allegationsFor` in
  `app/src/main/tasks.ts` hands Core only the `not_met` sentences a critic
  really sent for that exact checkpoint.
- **One loop, not a second ladder.** The whole post-dispatch verification block
  in `core/src/serial.ts` is wrapped in one `for (;;)`; the repair branch is the
  only thing that loops. A repaired tree therefore meets *exactly* the same
  verification the first attempt met. **`git diff` on that file looks enormous
  and is mostly re-indentation - read it with `-w`.**

**Task 245 repaired the screen** after the owner failed Task 244's `c12`. Amber
now follows what is still **owed** rather than what was alleged, so an
accusation Cairn has disproved is no longer painted like a live failure above
Cairn's own rebuttal. The accepted request is rendered once instead of twice.
Measured: findings on screen 968 -> 800px, a repair offered 1,072 -> 880px.

**Task 246 gave Cairn a check menu it can pass.** The root `package.json` now
declares `typecheck` (11s) and `build` (8s), composed from each package's own
script. Both are mutation-proved on **exit codes**, which is what
`runProjectCheck` actually reads: a type error in core gives exit 2, one in app
gives exit 2, a clean tree gives 0.

## What Slice 5 is waiting on - two of the three are now settled

**Updated 2026-08-15.** Two of the three blockers below are closed. Read this
section rather than the older prose above it where they disagree.

**1. Task 245's `c10` - ANSWERED, and it FAILED.** The owner was shown the four
captures and said: *"I don't think so, but I don't want to spend time here
fixing it. We've tried twice now already and it's still overly complicated."*
Recorded in `245-report.md` at `01ed7b9`; Task 245 is closed STOPPED.

**Do not open a third readability attempt.** Task 244's `c12` and Task 245's
`c10` are two consecutive stops on the same visible journey by the same judge.
The contract's repair rule and the plan's anti-drift rule 4 both require
weighing deferral before a third, and the owner chose deferral to a separate
beginner-friendliness effort. **Slice 5 is no longer gated on this** - the
owner has judged the screens not beginner-ready and elected to proceed anyway.
Slice 5's evidence therefore proves the route works, never that it reads well.

**2. Task 242 - LANDED.** Merged at `56b5700`, its log row put back in order at
`ff53294`, its record re-verified at `c543a70`. Its numbers were retaken on
today's `main` rather than trusted, because the log had grown by four tasks
while the branch waited:

| Measured on `main` | Before | After |
|---|---|---|
| briefing + constitution vs the 200,000 limit | **238,248 - over by 38,248** | **118,553 - 81,447 to spare** |
| the work-log section | 145,403 | **26,047** |

The section now reports `240 rows total - 9 in full, 231 as index only, 0
omitted`. **The conductor reads full summaries for tasks 238-246 only**;
everything to 237 is number, date, and outcome. Nine rows, not the nineteen
242's own report predicted - summaries kept growing, exactly as it warned.

**`c9` is still open and is the owner's**: they must send one real Chat message
in Cairn on this repo. Task 242 stays STOPPED until they do. The exact steps
are at the end of `242-report.md`. **The app token was released for that
attempt** - take it again before any app or Playwright run.

**The first attempt at `c9` did not reach the briefing at all - Task 247.**
Cairn refused with `fatal: detected dubious ownership`, because this repo's
root folder was owned by `Obelisk\CodexSandboxOffline` while everything inside
it was the owner's. Cairn scrubs `GIT_CONFIG_GLOBAL` on every Git call, so the
`safe.directory` exception the owner already had was never read - and Cairn
then printed Git's advice to add one, which its own hardening guarantees cannot
work. **The folder's owner was changed with the owner's approval and the
machine is unblocked**; Task 247 fixed the message, deliberately not the check.
Task 247's `c8` and Task 242's `c9` are now the same single press.

**Two traps this landing hit, for whoever lands the next branch:**

- **`npm run test:unit -w cairn-app` cannot work.** `app` is not a workspace -
  the root declares only `core` and `cli` - and the package is `cairn-desktop`.
  Run it from `app/`. Task 242's own report asks for the broken form.
- **`LOG.md`'s union merge appends, and `parseLog` does not sort.** A landed
  branch's row arrives *after* the newest task, and since position is recency,
  the landing task masquerades as the most recent work in the very section
  Task 242 added. Move the row to its number and say so.

## 2026-08-16, later: three real runs, one sealed, and what they cost to learn

**Read this before the sections below it; where they disagree, this is newer.**

Cairn ran on Cairn three times. Tasks 248, 250 and 251 are Cairn's own records,
in Cairn's own words. **Task 250 sealed completely** - request, interpretation,
a risk the owner set aside, confirmed Codex Exec dispatch, real edits, Cairn
verifying the changed files against Git rather than against claims, Cairn
authoring the report, **and Cairn's own exact-path commit `dcd3a60`**. That is
most of the milestone's spine, done for real.

Tasks 248 and 251 did not seal, for two different reasons, and both reasons are
now fixed:

| Run | What happened | Fixed by |
|---|---|---|
| 248 | Cairn crashed mid-run | not fixed - cause never established |
| 250 | **sealed, with its own commit** | - |
| 251 | completed, then **skipped its commit** | Task 253 |

**Task 253 found the loop that cost 251 its commit.** `app/launch-build.log` was
tracked by accident, and `launch-cairn.ps1` rewrites it on every rebuild - so
launching Cairn dirtied the repo, and a dirty repo makes the next run skip its
exact-path commit. Cairn edits your source, you relaunch to look, the log
changes, the next run silently loses its work. Untracked and ignored now, proved
by doing the thing that used to break it.

**Task 252 fixed the record layer.** A run that paid for a critic sealed into a
report that never mentioned one was asked for: `records.ts` had no section for
findings, and they lived only in Main's foreground-only sidecar. They now reach
the sealed report, attributed as the reviewer's claim and quarantined like every
other untrusted field. **This is what makes the next gate-3 run leave evidence
that outlives the window.**

Three things remain open from those runs, none of them claimed:

1. **A candidate silently became the product.** After 248 crashed, the launcher
   rebuilt Cairn from the worker's *unsealed* edit, so the app the owner
   reopened was running unverified code with no report, no log row and no commit
   anywhere. They reasonably concluded the task was done, because the product
   showed them the finished result. Nothing lied - Cairn never claimed `DONE` -
   but the evidence of completion reached the owner **through the running app,
   around the envelope**. Still true today.
2. **"Protected starting work" names nothing.** A run that skips its commit tells
   the owner only that. Task 253 removed the commonest cause without making the
   sentence useful.
3. **Why 248 crashed was never established.** No crash appeared in the Windows
   event log. `npm start` (electron-forge dev mode) watches `src/main/main.ts`
   and restarts on change, which a Cairn task editing that file would trigger and
   which looks exactly like a crash - but the owner uses the `Cairn` desktop
   shortcut, which runs `launch-cairn.ps1` and watches nothing. Unexplained.

## Superseded: the earlier reading of that first crash

The owner ran a real task through Cairn on Cairn - request, pushback, Task
Card, confirmed Codex Exec dispatch, real edits. **Cairn crashed before
sealing.** Tasks 248 (Cairn's own, unsealed) and 249 (the adoption) hold the
detail. Three findings, in order of how much they matter:

1. **A candidate silently became the product.** `launch-cairn.ps1` compares
   timestamps, saw `src` was newer, rebuilt, and started the app - so the Cairn
   the owner reopened was **running the worker's unsealed edit**, with no
   report, no log row and no commit anywhere. They reasonably concluded the
   task was done, because the product showed them the finished result. Nothing
   lied; Cairn never claimed `DONE`. But the evidence of completion reached the
   owner **through the running app, around the envelope** that is supposed to
   be the only thing allowed to say so. **Not fixed. No task claimed.** This is
   the sharpest thing Slice 5 has produced and no fixture could have found it.
2. **Abrupt-loss protection held under a real crash.** No `DONE`, no report, no
   log row, no commit, edits inspectable. Proved by an actual crash rather than
   a test, which is worth more than the test.
3. **`npm start` is the wrong launcher and this handoff previously implied
   otherwise.** It is `electron-forge start`, dev mode, which watches
   `src/main/main.ts` and restarts Electron when it changes - so a Cairn task
   that edits Cairn's main process kills the run that dispatched it. **Use
   `app\launch-cairn.ps1`.**

Also settled that day: Tasks 242 and 247 are **DONE** - the owner sent a real
message on the Cairn repo and it went. Task 249 adopted the crashed run's two
lines as reviewed work, mutation-proving the worker's inherited test rather
than trusting it, and recorded two consequences nobody knew when the risk was
set aside: **on macOS, removing the application menu stops copy and paste
working in text fields** (this app builds for macOS; Windows is unaffected),
and keyboard DevTools is gone on every platform.

## Gate 3: what it is, and the runbook

**Half of it does not exist.** The plan says the owner chooses `required` or
`optional` mode. **Required is not implemented on the live route** - the
`"required" | "optional"` types live in `app/src/shared/quality-preview.ts`,
`task-review.ts` and `TaskReview.tsx`, all Q9/Builder shadow machinery, while
the live `CandidateCritique.tsx` offers exactly **Ask for one review** and
**Skip this**. The plan's recommended milestone mode cannot be honoured without
new work. Gate 3 therefore reduces to approving the call.

**What the call actually sends**, read out of `composeSerialCritiquePacket` in
`core/src/critique.ts` rather than off the card: four artifacts - the accepted
outcome, the changed file **paths**, Cairn's own check results with exit codes,
and the worker's claims. **No file contents.** Section 8 of the plan permits up
to eight tracked files and 32,000 characters under separate approval; this
implementation sends none. One request, no retry. The card states its cost
ceiling before anything is pressed.

**Reaching the card:**

1. Start with `app\launch-cairn.ps1`, **not** `npm start`.
2. Ask for a small change, ideally **not** under `app/src/main/`.
3. **Accept at least one check on the Task Card.** With zero promise rows
   `composeSerialCritiquePacket` returns `null`, so there is **no critic offer
   at all** and gate 3 is unreachable. It fails silently. This is the inherited
   promise-free-run limitation, and this is where it bites.
4. Approve the worker; wait for the unsealed candidate.
5. The second-opinion card appears above the two choices. **That card is gate
   3.**

**3. Gate 3 - and this one is genuinely unresolved.** The owner reports that the
review card appeared and that they pressed review, which would mean the first
real critic call **has** been made. Nothing on disk agrees: Task 250 recorded no
`cN` rows, and `app/src/main/critique.ts:121` returns `null` from
`composeSerialCritiquePacket` when there are no rows, so the card cannot be
offered on such a run. Both cannot be true.

**The discriminator is concrete: the review card names a provider, a model and a
dollar ceiling.** A press with no price on the card was the pause's *Continue*,
not the review offer. Settle this before treating Task 241's `c9`/`c10` as
closed, and before assuming money was or was not spent. Everything below in this
older section was written believing the call had never happened.

Slice 3's one real critic call may or may not have been made. Everything around it is built and proved
against the fixture conductor. It costs money and sends project data off the
machine; the card states its own ceiling before anything is pressed. **A new
conversation must not spend it on its own initiative, and must not treat a
passing fixture test as having closed `c9`/`c10` of Task 241.** This is now the
only unsettled blocker.

## Current baselines - measure against these

Re-measured on `main` at `de9336a` on 2026-08-16.

| Suite | Result |
|---|---|
| `npm test -w @cairn/core` | **518 / 508 pass / 0 fail / 10 skipped**, ~21 min |
| `app: npm run test:unit`, run **from `app/`** | **943 / 932 pass / 9 fail / 2 skipped**, 305-357s |
| `npm test -w cairn-cli` | **24 / 24 pass / 0 fail**, 5s (last run Task 247) |
| `npm run typecheck` (root) | PASS, ~26s |
| `npm run build` (root) | PASS, ~14s |

Core rose 508 -> 513 -> 518 across Tasks 247 and 252; app unit rose 940 -> 941 ->
943 across Tasks 249, 250 and 251. Every rise is an added test, and the nine
Builder failures have been diffed identical at every step.

The app-unit count rose 935 -> 940 because Task 242 added five tests; the nine
failures are unchanged and their names diff identically. Typecheck and build
are slower than Task 246 measured (11s and 8s) but far inside the 120s cap -
treat 246's figures as one machine's reading, not a bound.

## Other unmerged work nobody has been tracking

Found while landing Task 242. None of it blocks Slice 5; none of it is
abandoned on purpose as far as any record says.

| Branch | Ahead | What |
|---|---|---|
| `lane/f` | **15** | Tasks 200 and 202, the press/acknowledgement design |
| `claude/vigorous-tharp-0cbd3c` | 2 | **Task 236**, the hard-link-guard diagnosis Task 246's report relies on |
| `lane/b` / `lane/c` / `lane/d` | 2 each | Stopped Tasks 180, 195, 163 |
| `codex/recovery-main-stopped-180-183` | 1 | A recovery snapshot |

Task 236 is the one worth a decision: Task 246 cites its diagnosis while that
diagnosis has never been on `main`.

## Known reds that are NOT yours

- **Nine app unit failures** from the Task 224/231/233 Builder machinery.
- **`conductor.spec.ts:3314`**, proved pre-existing by Task 240 by rebuilding
  at its brief-only commit.
- **The full `conductor.spec.ts` does not complete in one pass on this
  machine.** Long runs abort near test 39 on a Windows profile-cleanup `EPERM`
  in worker teardown. Run focused `-g` subsets.

**The `cli` typecheck is no longer on this list.** Task 211 left two
two-argument test doubles that could not satisfy an overloaded type; Task 246
fixed them and `cli` has been green since `fdcf896`.

## Working rules that keep costing time when forgotten

- **Capture long runs whole, never through `tail`.** Task 244 lost a Core
  failure's identity to `tail -15` and paid 20 minutes to get it back. Redirect
  to a file and grep the file.
- **This suite has load-induced flakes, and they are recorded, not hidden.**
  The concurrent full Core suite failed once where every file passed alone
  (Task 244); the taskcard cap test, which has a real 4-second bound, failed
  once right after a build saturated disk (Task 246). **When the full suite
  fails, run each file alone before suspecting your change** - and do not let
  this become a reason to wave away a real failure.
- **Take the app token before any app or Playwright run**, and release it in a
  `finally` only if that run created it.
- **Verify against the artifact the test asserts on**, not a file you fetched
  by hand. Task 244 raised and withdrew a false "product defect" after reading
  a stale mid-run snapshot of a fake worker's prompt file.
- **`toContainText` reads hidden text.** Anything meaning "the owner can see
  this" must be `toBeVisible()` on the specific element.
- **Stage task paths by exact name.** Never `git add -A`.
- **One lane per checkout - this keeps being violated.** It happened during
  Task 243, and again during Task 244, whose work was committed by a *different*
  session before its own verification finished. Before editing shared files,
  confirm with the owner that no other lane is live, and read `git log` before
  concluding work was lost.

## Copy-ready prompt

**Slice 5 is no longer blocked - it is partly done.** Cairn has run on itself
and sealed a run with its own commit. What is missing is one run that carries
the whole journey *and* records it, which is now possible for the first time:
Task 253 restored Cairn's ability to commit, and Task 252 made the critic's
findings survive the seal.

**Settle the gate-3 question first** - see the discriminator above. It decides
whether a paid call has already happened.

```text
Work on: Continue Cairn's Gauntlet restoration described in:

docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md

Read first, before editing anything:

- docs/ai-work/HANDOFF-gauntlet-slice5.md (this handoff)
- docs/ai-work/tasks/242-report.md, 244-report.md, 245-report.md, 246-report.md
- AGENTS.md, and the complete Git status

Slices 1 to 4 are done. Task 245's c10 FAILED and the owner deferred the fix -
do not reopen it and do not start a third readability attempt. Cairn has now
run on itself three times and sealed one run with its own commit (dcd3a60), so
Slice 5 is partly done rather than blocked. What is missing is one run that
carries the whole journey AND records it, which Tasks 252 and 253 just made
possible. Do not begin Slice 6.

Do not assume gate 3 is unspent OR spent - the handoff names a concrete
discriminator; settle it with the owner before acting either way. Never spend a
paid call on your own initiative.

Three findings are recorded and unclaimed: a candidate can silently become the
product on next launch, "protected starting work" names nothing, and the Task
248 crash was never explained.

No provider, model or credential work without the owner's approval on that
exact call. A paid call needs its own gate, given after they read the card.

Take the app token before any app or Playwright run and release it in a
finally only if that run created it. It is currently FREE.

Not yours: the nine Builder unit failures, conductor.spec.ts:3314, and the
full-suite worker-teardown EPERM.

Write the brief first and commit it alone to claim the number. The lowest free
number is not 247 by assumption - list docs/ai-work/tasks/, and check every
lane branch and worktree, because a number is taken if ANY file there begins
with it.
```

## Open owner decisions carried forward

- **Gate 3: whether the one real critic call has already happened.** Genuinely
  unresolved - the owner reports pressing review, the records say the card could
  not have been offered. The discriminator is whether the card showed a price.
  Settle before treating Task 241's `c9`/`c10` as closed either way.
- **Task 242's `c9`.** ANSWERED and passed - *"it sent, message went through
  fine"*. Task 242 is DONE, as is Task 247, whose `c8` was the same press.
- **A candidate can silently become the product.** After a crash the launcher
  rebuilt Cairn from an unsealed candidate, and the owner reasonably read the
  result as done. Recorded in Task 249's report; **no task claimed.**
- **"Protected starting work" names nothing** when a run skips its commit. Task
  253 removed the commonest cause without making the sentence useful. **No task
  claimed.**
- **Why Task 248 crashed was never established.** **No task claimed.**
- **Main's half of Task 252 has no test**, and the on-screen result card still
  does not carry critic findings - only the sealed report does.
- **Task 245's `c10`.** ANSWERED and FAILED; the fix is deferred to a separate
  beginner-friendliness effort, not to a third attempt here. See above.
- **Whether `maxLogDetailChars` should rise.** Task 242 landed it at 20,000,
  which today keeps only 9 tasks' summaries. There is room - the briefing sits
  19,075 under its own budget and 81,447 under the prompt limit. The owner was
  shown this and chose to land the constant as written; revisiting it is cheap
  and is a design change, not a bug fix.
- **Task 236 and `lane/f` have never landed.** See the unmerged-work table
  above. Task 246's report relies on Task 236's diagnosis.
- **Whether the milestone moved** is always the owner's call; the log column
  stays a claim.
- **Local commits are not on the remote, and the count is deliberately not
  written here.** Run `git rev-list --count origin/main..main`. Every previous
  handoff wrote a number that was stale before the ink dried - the commit that
  records the count increments the count - so the number is gone and only the
  command remains. Pushing is the owner's decision and needs its own approval.
- Inherited and still open: an owner who chooses nothing on the Task Card gets
  a promise-free run with no warning, no critic offer, and now no repair
  either, for the same reason - there are no frozen rows for an allegation to
  name.
- **Cairn's menu still has no `test:unit`.** Task 246 left it undeclared
  deliberately: the app suite takes 471 seconds against a 120-second cap and
  exits 1 with nine failures, so it could only ever end `unfinished` or
  `failed`. Declaring it becomes correct when the nine are fixed **and** it
  fits the cap - both, not either.
