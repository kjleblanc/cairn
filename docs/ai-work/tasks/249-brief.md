# Task 249 brief - adopt the menu-bar change Cairn's crashed run left behind

**Lane:** A (the main checkout). **Base commit:** `574b85b`.

## Why this task exists

On 2026-08-16 the owner ran a real task through Cairn on Cairn itself. Cairn
wrote `docs/ai-work/tasks/248-brief.md`, dispatched **Codex Exec / OpenAI /
gpt-5.6-sol** on the owner's confirmation, and the worker edited
`app/src/main/main.ts` and added `app/tests-unit/applicationmenu.test.ts`.

**Cairn then crashed before sealing anything.** There is no `248-report.md`, no
`LOG.md` row for 248, no commit, no result card, and no `DONE`. That is the
correct behaviour for abrupt process loss and it is the first time it has been
proved by a real crash rather than a test.

The edits have sat uncommitted since. The owner has asked for them to be
adopted as ordinary reviewed work.

**This task does not claim the change as a Cairn result**, because Cairn never
verified it. The code's origin is disclosed and the verification here is this
lane's own.

## Requested visible outcome

Cairn's window no longer shows the File / Edit / View / Window / Help bar, the
change is committed with its origin recorded truthfully, and the working tree
is clean so a proper gate-3 run can start from a clean snapshot.

## Boundary of intent

- **`248-brief.md` is committed unedited, and no `248-report.md` is written.**
  The brief is Cairn's own artifact and committing it preserves the record and
  claims the number so it cannot be reused. Authoring 248's report would be
  this lane impersonating the envelope, which only Cairn's runtime may do. The
  interrupted run is explained here instead, which is what the restoration plan
  asks of the next session: explain the dirty state without resuming or
  reconstructing the run.
- **The worker's two edits are adopted as written.** No redesign, no
  relocation, no rewriting of its test. If something is wrong with them, say so
  and stop rather than quietly improving them.
- No behaviour changes beyond removing the application menu.
- No provider, model, credential, network call, dependency install, external
  write, push, or deployment. **This task makes no Cairn run and no worker
  call.**
- Not this task's: the nine Builder unit failures, `conductor.spec.ts:3314`,
  the full-suite worker-teardown EPERM.

## Checks

1. **`c1` - the change is present and minimal.** `git diff` on
   `app/src/main/main.ts` is the `Menu` import and one
   `Menu.setApplicationMenu(null);` before `new BrowserWindow(`, and nothing
   else.
2. **`c2` - the inherited test actually guards the change.** It passes, and
   mutation-proves: removing `Menu.setApplicationMenu(null)` from `main.ts`
   makes it fail, and removing `Menu` from the import makes it fail. `main.ts`
   restored byte-identical after each.
3. **`c3` - what the test does and does not prove is written down.** It reads
   `main.ts` as text and matches it; it never launches a window. The report
   says so plainly rather than letting a passing test imply the menu is gone at
   runtime.
4. **`c4` - nothing else regressed.** Root `typecheck` and `build`, and the app
   unit suite, each named with its exact command and real result against the
   940 / 929 / 9 / 2 baseline.
5. **`c5` - the owner has seen the menu bar gone.** Already answered: the owner
   reopened Cairn after the crash and reported the buttons were removed. Their
   words go in the report. No new app launch is needed for this.
6. **`c6` - the tree is clean afterwards**, so a gate-3 run starts from a clean
   snapshot, with every deliberate path named and `app/launch-build.log`
   accounted for.

## DONE and STOPPED

**DONE** means `c1`-`c6` pass with their real output recorded, the origin of
the code is disclosed rather than presented as this lane's own work, and the
exact-path commits leave the checkout clean.

**STOPPED** means the worker's change is wrong or unsafe to adopt, or adopting
it would require editing what the worker wrote - in which case say exactly what
and stop, because rewriting a crashed run's output into something else and
committing it as "adopted" would misrepresent both.

The milestone does not move here. This clears the way for the gate-3 run; it is
not that run.
