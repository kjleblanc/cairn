# Task 253 report - stop a build log from costing Cairn its own commits

**Lane:** A (the main checkout). **Base commit:** `98691d5`.
**Brief claim commit:** `65c3f01`.

## Outcome

Launching Cairn no longer dirties the repository, so a Cairn run that follows a
launch can still make its own exact-path commit. Task 251's work - stranded by
exactly this defect - is adopted with its origin disclosed.

**The isolation rule was not touched.** `core/src/serial.ts` still refuses to
commit when it cannot prove exact-path isolation, which is correct and is what
protects the owner's work. What changed is that a generated log no longer gives
it a spurious reason to fire.

## What actually changed

- `.gitignore` - one line, `app/launch-build.log`.
- `app/launch-build.log` - **untracked, not deleted.** `git rm --cached` only;
  the file is still on disk, where the launcher will keep rewriting it.
- `app/src/renderer/app.css` and `app/tests-unit/environmentchrome.test.ts` -
  Task 251's two edits, adopted **unmodified**.
- `docs/ai-work/tasks/251-brief.md` and `251-report.md` - Cairn's own records
  from that run, committed **unedited**.
- `docs/ai-work/LOG.md` - carries Cairn's own row for 251, which Cairn wrote and
  which is committed as written, plus this task's row.
- `docs/ai-work/tasks/253-brief.md` and this report.

**No file under `core/` was modified.**

## The loop, and the evidence for it

`app/launch-build.log` is written by `launch-cairn.ps1` whenever it rebuilds,
which it does whenever anything under `app/src` is newer than the last build. It
was tracked by accident of `144f070`, a bulk commit whose own message says it was
"committed whole by owner hand".

So: Cairn edits your source, you relaunch to see the change, the launcher
rebuilds because `src` is now newer, the tracked log changes, and **the next
Cairn run cannot prove exact-path isolation and skips its own commit**
(`core/src/serial.ts:4556`).

Two consecutive real runs on this machine, nothing else differing:

| Task | Starting tree, in Cairn's words | Cairn's commit |
|---|---|---|
| 250 | `clean` | **created** - `dcd3a60` |
| 251 | `existing changes protected` | **skipped** |

Task 251's own report is the witness: `app/launch-build.log` appears in its
**"Files changed (from Git, not from claims)"** list, alongside the two files
its worker actually edited. Task 250 started clean only because Task 249 had
restored that log by hand a few hours earlier - which at the time looked like
tidiness and was in fact the reason that run could seal.

**Nothing surfaces this to the owner.** Cairn's report says "Protected starting
work prevented an isolated task commit", which is true and gives no hint that
the culprit is a log file the owner never edited. From inside the product the
loop is invisible.

## Check results

### `c1` - the log is no longer tracked and is ignored: PASSED

```text
$ git ls-files --error-unmatch app/launch-build.log
error: pathspec 'app/launch-build.log' did not match any file(s) known to git

$ git check-ignore -v app/launch-build.log
.gitignore:14:app/launch-build.log	app/launch-build.log
```

The file is still on disk. Nothing was deleted.

### `c2` - a rebuild no longer dirties the tree: PASSED

Proved by doing the thing that used to break it. On the committed tree, the log
was appended to exactly as a rebuild appends to it:

```text
$ printf '\nrebuild marker 12:0x:xx\n' >> app/launch-build.log
$ git status --porcelain | grep -c 'launch-build.log'
0
```

Zero entries. The file is still on disk at 517 bytes, still being written. And
`git status --porcelain --untracked-files=no` is empty, so **a Cairn run
starting now sees a clean tree and can make its own commit** - which is the
whole point.

Before this change the same append produced `M app/launch-build.log`, and any
Cairn task started from there skipped its commit.

### `c3` - the isolation rule is untouched: PASSED

`git diff --name-only HEAD` carries nothing from `core/`. The refusal at
`serial.ts:4556` is unchanged; this task removed a spurious trigger, not the
rule.

### `c4` - Task 251's change is real and guarded: PASSED, mutation-proved

The test is Codex Exec's, not this lane's, so it was not taken on trust. Each
mutation was applied to the real `app.css`, the unit build re-run, and the file
restored and confirmed byte-identical with `cmp`:

| State | `environmentchrome.test.js` |
|---|---|
| as the worker left it | **6 pass, 0 fail** |
| `-webkit-app-region: drag` removed from the header | **5 pass, 1 fail** |
| the `no-drag` rule for interactive controls removed | **5 pass, 1 fail** |
| restored | **6 pass, 0 fail** |

The change itself is right, and its second half is the part usually forgotten:
making a header a drag region swallows the clicks of every control inside it
unless those controls are given `no-drag`. Both halves are guarded.

It pairs with Task 250, which removed the native title bar - the window needed
somewhere to be dragged from, and that is what this restores.

### `c5` - nothing else regressed: PASSED

| Command | Result |
|---|---|
| `npm run typecheck` (root) | **PASS** |
| `npm run build` (root) | **PASS** |
| `npm run test:unit` from `app/` | **943 tests, 932 pass, 9 fail, 2 skipped** |

Up two tests from the 941 / 930 baseline: one from Task 250's committed change
and one from Task 251's, both of which this tree now carries. The failure set
was sorted and diffed against that baseline: **identical**, the nine
pre-existing Builder failures. None is this task's.

### `c6` - the tree is clean afterwards: PASSED

Every path is named above.

## What this does not fix

- **The owner is still not told.** A run that skips its commit says "protected
  starting work" and nothing more. Whatever dirtied the tree - a log, a stray
  edit, another lane - the owner gets the same sentence and no way to act on it.
  Naming the protecting paths in that message would close the loop properly;
  this task only removes the most common cause. **Not claimed, not started.**
- **Other generated files may be tracked the same way.** `144f070` was a bulk
  hand commit; this task fixed the one file proved to have cost a commit, and
  did not audit the rest.
- **Task 251 stays uncommitted-by-Cairn forever.** Adopting its work here does
  not give it the Cairn-authored commit it should have had, and no
  `251-report.md` was written by this lane - Cairn's own is committed unedited,
  because only the envelope may author one.

## How to try it

Launch Cairn from `app\launch-cairn.ps1`, let it rebuild, then:

```text
git status --porcelain
```

It should be empty. Before this change it showed `M app/launch-build.log`, and
any Cairn task started from there could not commit its own work.

## Limitations and remaining human judgment

- **This is an adoption for Task 251's half.** The two CSS edits are checked;
  the run that produced them is not, and cannot be - Cairn's own record of it is
  committed as written.
- **The drag region is judged by test, not by hand.** Nobody has dragged the
  window by its header in this task. The owner will see it the next time they
  launch.
- No provider, model, credential, network call, dependency install, external
  write, push, or deployment occurred in this task, and no Cairn run was made.

## Disposition

**Disposition: DONE - `c1` through `c6` pass with their real output recorded
above, and Task 251's work is committed with its origin disclosed rather than
presented as this lane's own.**

The thing worth carrying forward is in "What this does not fix": a run that
skips its commit still tells the owner only "protected starting work". This
task removed the most common cause of that sentence; it did not make the
sentence useful.
