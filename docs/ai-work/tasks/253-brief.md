# Task 253 brief - stop a build log from costing Cairn its own commits

**Lane:** A (the main checkout). **Base commit:** `98691d5`.

## The defect, and its loop

`app/launch-build.log` is a generated build log that `launch-cairn.ps1` rewrites
whenever it rebuilds. **It is tracked**, swept into `144f070` by a bulk commit
whose own message says it was "committed whole by owner hand".

Because it is tracked, launching Cairn dirties the repository. Because the
repository is dirty, the next Cairn run cannot prove exact-path isolation and
**skips its own commit** - `core/src/serial.ts:4556`, "Protected starting work
prevented an isolated candidate task commit."

That closes a loop:

> Cairn edits your source -> you relaunch to see the change -> the launcher
> rebuilds because `src` is newer -> the tracked build log changes -> **the
> next Cairn run silently loses its commit.**

Observed on this machine, on consecutive runs, with nothing else differing:

| Task | Starting tree, as Cairn recorded it | Cairn's commit |
|---|---|---|
| 250 | `clean` | **created** - `dcd3a60` |
| 251 | `existing changes protected` | **skipped** |

Task 251's own report names the file: `app/launch-build.log` appears in its
"Files changed (from Git, not from claims)" list. Task 250 started clean only
because Task 249 had restored that log by hand a few hours earlier.

Nothing tells the owner any of this. The report says "protected starting work",
which is true and gives no hint the culprit is a log file, so the loop is
invisible from inside the product.

## Requested visible outcome

Launching Cairn no longer dirties the repository, so a Cairn run that follows a
launch can still make its own exact-path commit. Task 251's stranded work -
which this defect is the sole reason is uncommitted - is adopted with its origin
disclosed.

## Boundary of intent

- **The isolation rule does not change.** `serial.ts` keeps refusing to commit
  when it cannot prove exact-path isolation. That refusal is correct and is what
  protects the owner's work; this task removes a spurious reason for it to fire,
  not the rule.
- **The log file is not deleted.** It stops being tracked and starts being
  ignored. The file on disk is left alone.
- **Task 251's two product edits are adopted as written**, the way Task 249
  adopted Task 248's. No redesign. Its records are committed unedited and no
  `251-report.md` is authored by this lane - only Cairn's runtime may write one.
- No provider, model, credential, network call, dependency install, external
  write, push, or deployment. **This task makes no Cairn run and no worker
  call.**
- Not this task's: the nine Builder unit failures, `conductor.spec.ts:3314`,
  the full-suite worker-teardown EPERM, the vanishing critic findings (Task
  252), and the silent promise-free run.

## Checks

1. **`c1` - the log is no longer tracked and is ignored.**
   `git ls-files --error-unmatch app/launch-build.log` fails, and
   `git check-ignore` names it. The file still exists on disk.
2. **`c2` - a rebuild no longer dirties the tree.** After touching the log the
   way a build does, `git status --porcelain` is empty. This is the actual
   defect and is proved by doing the thing that used to break it.
3. **`c3` - the isolation rule is untouched.** No file under `core/src/` is
   modified; `git diff --name-only` carries nothing from `core/`.
4. **`c4` - Task 251's change is real and guarded.** Its own test passes, and
   mutation-proves: removing `-webkit-app-region: drag` from
   `.town-square-header` fails it, and removing the `no-drag` rule for
   interactive controls fails it. `app.css` restored byte-identical after each.
5. **`c5` - nothing else regressed.** Root `typecheck` and `build`, and the app
   unit suite, each named with its exact command and real result against the
   941 / 930 / 9 / 2 baseline.
6. **`c6` - the tree is clean afterwards**, with every deliberate path named, so
   the next Cairn run starts clean and can commit.

## DONE and STOPPED

**DONE** means `c1`-`c6` pass with their real output recorded, and Task 251's
work is committed with its origin disclosed rather than presented as this
lane's own.

**STOPPED** means untracking the log would lose something a reader needs, or
Task 251's change is wrong to adopt - in which case say which, and stop.

The milestone does not move here. It removes a silent tax on every future Cairn
run.
