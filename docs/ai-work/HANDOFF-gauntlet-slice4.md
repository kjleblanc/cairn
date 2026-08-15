# Handoff - Gauntlet Slice 4, and the one gate Slice 3 left open

Written after Task 243 closed. The saved plan
`docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md` is the
execution authority; this file is orientation and a copy-ready prompt.

## Where the restoration actually stands

| Slice | State |
|---|---|
| 1 - pause at one unsealed candidate | **Done** (Task 235) |
| 2 - authoritative Task Card and checks | **Done** (Task 239) |
| 3 - one separately approved tool-free critic | **Code complete and green. The live call was never made.** (Tasks 240, 241) |
| 4 - confirm one allegation, permit one repair | **Not started** |
| 5 - prove the milestone on Cairn itself | Not started; its readability precondition is now met (Task 243) |
| 6 - retire the shadow routes | Not started |

Recent commits, newest first:

- `c9f6a53` Complete Task 243: a candidate screen a beginner can read
- `d4c0df3` Claim Task 243
- `dd5a2a1` Stop Task 241 with the price shipped and the real call unmade
- `6baf3c0` Claim Task 241
- `b932d30` Complete Task 240

## The one gate that is still open, and whose it is

**Slice 3's single real critic call has never been made.** Everything around it
is built and proved against the fixture conductor: the offer, the one-shot
rule, the packet, the strict parser, the findings tied to frozen `cN` rows, the
honest `unavailable`, and Task 241's cost ceiling read from the provider's own
published prices. Task 241 closed **STOPPED** for exactly one reason - gate 3
was never given - and that is a legitimate end under its own brief, not a
defect.

**This is the owner's decision and nobody else's.** It costs money and sends
project data off the machine. The card states its own ceiling before anything
is pressed; on the fixture it read `At most about USD 0.0852`. A new
conversation must not spend it on its own initiative, and must not treat a
passing fixture test as having closed `c9`.

The owner has two reasonable paths, and should be asked which:

1. **Close Slice 3 first.** A small task makes the one real call under gate 3,
   captures the real findings, and records `c9`/`c10` in the owner's own words.
   All of its code is already committed and green, so this is a short task.
2. **Proceed to Slice 4 with Slice 3 fixture-proved**, and make the real call
   later. Slice 4's own work is provable against the same fixtures, so this is
   not blocked - but the plan is serial by design, and Slice 4 raises the
   maximum to two critic calls, which is a wider money question to open while
   the first one is still unspent.

## What Task 243 changed, and why the next task should care

The unsealed candidate now puts the decision first. The changed-path list, the
bounded evidence line, the worker's whole account and the four "what has not
happened yet" statements sit behind three native `<details>`. Measured through
the ordinary Chat route at 1440x2400 with two promise rows: top of card to
buttons **1,378 -> 881 pixels**, whole card **1,509 -> 1,012**.

Three things follow for anyone editing this screen next:

- **`toContainText` reads hidden text.** A string inside a collapsed
  `<details>` still satisfies it. Any assertion that means "the owner can see
  this" must call `toBeVisible()` on the specific element. This already bit two
  existing tests the moment the folds landed - both kept passing while proving
  only that their strings were in the DOM. Use the `openCandidateFolds` helper
  in `app/tests/conductor.spec.ts`.
- **`app/tests-unit/unsealedcandidatepaper.test.ts` now has 10 guards, not 9.**
  The added one pins the three folds, the facts inside them, and the order:
  promise rows above every fold, folds closed before `{critique}`, critic offer
  before `candidate.choices.map`. It is mutation-proved. **If it fires, reword
  the code - never relax the guard.**
- **The critic offer must stay above the two buttons.** Task 241 STOPPED partly
  because the offer rendered below Continue and the owner passed it without
  seeing it. A `compareDocumentPosition` check now guards this in two places.

## Known reds that are NOT yours

Do not try to fix these inside a Gauntlet slice, and do not let them fail a
check you are reporting on:

- **Nine app unit failures** from the Task 224/231/233 Builder machinery: exact
  live transport, preflight drift, the Novita fp8 ZDR endpoint shape,
  redirect/wrong-route refusal, the tracked-text selector, the tool-free fake,
  file identity drift, selected context custody, and fixed request identities.
  The current app unit baseline is **927 tests, 916 pass, 9 fail, 2 skipped**.
- **The `cli` package does not typecheck.** Verified again on 2026-08-15:
  Task 211 (`c77b86c`, "bind worker Task Spec evidence") added the
  `QualityBoundCodexExec*` overloads and never updated `cli/test/task.test.ts`,
  which still supplies two-argument stubs at **lines 111 and 119**. Both fail
  `TS2322` for the missing `taskSpecSha256` and `evidencePlanSha256`, so
  `npm test -w cairn-cli` cannot build. It is one small, well-understood fix
  and deserves its own task rather than a drive-by inside a slice.
- **`conductor.spec.ts:3314`** is a reproducible pre-existing failure, proved
  not to belong to Task 240 by rebuilding at its brief-only commit.
- **The full `conductor.spec.ts` does not complete in one pass on this
  machine.** Long runs abort near test 39 on a Windows profile-cleanup `EPERM`
  in worker teardown. Run focused `-g` subsets.

## Working rules that keep costing time when forgotten

- **Take the app token before any app or Playwright run**, and release it in a
  `finally` only if that run created it. The app, the E2E suites and the
  owner's own Cairn window share one profile.
- **The Core serial suite takes about 20 minutes** and is I/O-bound. Check CPU
  and git child processes before assuming a hang. If a task touches no Core
  file, say so and cite the focused proofs instead of running it blind.
- **Stage task paths by exact name.** Never `git add -A`.
- **One lane per checkout.** During Task 243 a second Claude session was
  working this same main checkout and committed `dd5a2a1` and `d4c0df3` under
  the owner's git identity mid-verification; 547 uncommitted lines appeared to
  vanish and had simply become those commits. **Before concluding work was
  lost, read `git log` and `git reflog`.** Before editing shared files, confirm
  with the owner that no other lane is live.

## Copy-ready prompt

Ask the owner which of the two paths above they want first. If they choose
Slice 4, copy this into a fresh conversation.

```text
Work on: Continue Cairn's Gauntlet restoration described in:

docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md

Execute only Slice 4: confirm one allegation, permit one repair, then seal. Do
not begin Slice 5 or Slice 6, and do not broaden this into a second worker
task, Q8/Q9 calibration, activation tuples, upstream-provider proof, sandbox
work, or cleanup.

Read first, before editing anything:

- docs/ai-work/HANDOFF-gauntlet-slice4.md (this handoff)
- docs/ai-work/tasks/240-report.md, 241-report.md and 243-report.md
- AGENTS.md, and the complete Git status

Visible beginner outcome

A critic finding that says a frozen cN row was NOT met becomes something the
owner can act on. They can dismiss it - which changes no file - or confirm it.
A confirmed failure offers ONE separately approved repair. Afterwards Cairn
reruns every original check itself and closes DONE or STOPPED, with no
treadmill and no second repair.

Boundary of intent

- Extend the SAME open runner continuation with `repair`. Do not call
  runSerialTask(...) recursively and do not release the original run lock.
- The repair request carries the immutable Task Card, the confirmed finding,
  and the smallest requested correction. It cannot widen the task.
- Maximum one repair, and two critic calls in total, with no automatic retry.
- Refresh worker claims, Git facts, changed paths and every original
  verification-menu result before the terminal close.
- Only the envelope authors records, the commit, the result card and the
  terminal state. The critic still cannot write, run, add a blocking row, or
  declare DONE or STOPPED.
- Preserve every Slice 1, 2 and 3 behaviour, including the disabled Continue
  with its named owed row, TASK_PROMISE_NOT_MET, honest STOPPED, and the
  byte-identical close for a promise-free run.
- Preserve Task 243's folds. Assert visibility, not text, on anything a
  collapsed <details> could hide, and never relax a paper guard.
- No provider, model or credential work without the owner's approval on that
  exact call. A paid call needs its own gate, given after they read the card.
- Take the app token before any app or Playwright run and release it in a
  finally only if that run created it.
- Not yours: the nine Builder unit failures, the red cli typecheck from Task
  211, conductor.spec.ts:3314, and the full-suite worker-teardown EPERM.

STOP if implementation requires releasing the original lock, restart recovery,
cross-process custody, native patching, a second writer, or a new evidence
language.

Write the brief first and commit it alone to claim the number. The lowest free
number is not 244 by assumption - list docs/ai-work/tasks/, and check every
lane branch and worktree, because a number is taken if ANY file there begins
with it.
```

## Open owner decisions carried forward

- **Gate 3: the one real critic call.** Unspent. See above.
- **Whether the milestone moved** is always the owner's call; the log column
  stays a claim.
- **199 local commits are not on the remote.** Never state that count from
  memory - run `git rev-list --count origin/main..main`. Pushing is the
  owner's decision and needs its own approval.
- Inherited and still open: an owner who chooses nothing on the Task Card gets
  a promise-free run with no warning and no critic offer; and Cairn's own root
  `package.json` declares none of the three menu scripts, so on Cairn itself
  the check menu is empty. **That is a Slice 5 precondition and is still not
  met.**
