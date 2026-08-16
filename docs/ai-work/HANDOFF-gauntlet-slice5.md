# Handoff - Slice 5, and the three things it is waiting on

Written after Task 246 closed. The saved plan
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
| 5 - prove the milestone on Cairn itself | Not started. Three things are owed first - see below |
| 6 - retire the shadow routes | Not started; post-milestone by design |

Recent commits, newest first:

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

## The three things Slice 5 is waiting on

**1. Task 245's `c10` is the owner's, and unanswered.** Its disposition is
**STOPPED** pending that judgment. Four captures are waiting:

- `%TEMP%\cairn-task-244-allegation.png`
- `%TEMP%\cairn-task-245-settled-opened.png`
- `%TEMP%\cairn-task-244-repair-offer.png`
- `%TEMP%\cairn-task-244-repaired-candidate.png`

Slice 5 puts a beginner in front of exactly these screens, so this judgment
gates it. The owner's words on the previous round were: *"It's not good enough
for a beginner, but I am going to have another agent work on making everything
more beginner friendly, so let's focus on having it work for right now."*

**2. Task 242 is STOPPED and unmerged.** It lives on
`claude/keen-hawking-b5dfb8` (`6a01ba2`). Cairn's project briefing emits the
**whole** work log uncapped - 133,272 characters against a 200,000 prompt
budget when Task 241 measured it, growing with every task - so ordinary Chat
refuses to send on the Cairn repo itself. **Cairn cannot be talked to about its
own repository until this lands**, which is precisely what Slice 5 requires.

**3. Gate 3 is still unspent, and it is the owner's alone.** Slice 3's one real
critic call has never been made. Everything around it is built and proved
against the fixture conductor. It costs money and sends project data off the
machine; the card states its own ceiling before anything is pressed. **A new
conversation must not spend it on its own initiative, and must not treat a
passing fixture test as having closed `c9`/`c10` of Task 241.**

## Current baselines - measure against these

| Suite | Result |
|---|---|
| `npm test -w @cairn/core` | **508 / 498 pass / 0 fail / 10 skipped** |
| `app: npm run test:unit` | **935 / 924 pass / 9 fail / 2 skipped**, and it takes **471 seconds** |
| `npm test -w cairn-cli` | **24 / 24 pass / 0 fail**, 5s |
| `npm run typecheck` (root) | PASS, 11s |
| `npm run build` (root) | PASS, 8s |

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

Slice 5 is not runnable until items 1-3 above are settled. If the owner wants
the next bounded step instead, the honest candidates are: land Task 242, answer
Task 245's `c10`, or make Slice 3's real call under gate 3.

```text
Work on: Continue Cairn's Gauntlet restoration described in:

docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md

Read first, before editing anything:

- docs/ai-work/HANDOFF-gauntlet-slice5.md (this handoff)
- docs/ai-work/tasks/244-report.md, 245-report.md and 246-report.md
- AGENTS.md, and the complete Git status

Slices 1 to 4 are done. Slice 5 - one whole Gauntlet journey on Cairn itself -
is blocked on three things this handoff names: Task 245's unanswered c10, Task
242 unmerged on claude/keen-hawking-b5dfb8, and gate 3 unspent. Do not start
Slice 5 until the owner has settled them, and do not begin Slice 6.

No provider, model or credential work without the owner's approval on that
exact call. A paid call needs its own gate, given after they read the card.

Take the app token before any app or Playwright run and release it in a
finally only if that run created it.

Not yours: the nine Builder unit failures, conductor.spec.ts:3314, and the
full-suite worker-teardown EPERM.

Write the brief first and commit it alone to claim the number. The lowest free
number is not 247 by assumption - list docs/ai-work/tasks/, and check every
lane branch and worktree, because a number is taken if ANY file there begins
with it.
```

## Open owner decisions carried forward

- **Gate 3: the one real critic call.** Unspent. See above.
- **Task 245's `c10`.** Unanswered. See above.
- **Whether the milestone moved** is always the owner's call; the log column
  stays a claim.
- **209 local commits are not on the remote** as of this writing. **Never state
  that count from memory** - run `git rev-list --count origin/main..main`.
  Pushing is the owner's decision and needs its own approval.
- Inherited and still open: an owner who chooses nothing on the Task Card gets
  a promise-free run with no warning, no critic offer, and now no repair
  either, for the same reason - there are no frozen rows for an allegation to
  name.
- **Cairn's menu still has no `test:unit`.** Task 246 left it undeclared
  deliberately: the app suite takes 471 seconds against a 120-second cap and
  exits 1 with nine failures, so it could only ever end `unfinished` or
  `failed`. Declaring it becomes correct when the nine are fixed **and** it
  fits the cap - both, not either.
