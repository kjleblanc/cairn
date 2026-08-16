# Task 249 report - adopt the menu-bar change Cairn's crashed run left behind

**Lane:** A (the main checkout). **Base commit:** `574b85b`.
**Brief claim commit:** `2ce9d9e`.

## Outcome

Cairn's window no longer carries the File / Edit / View / Window / Help bar.
The change is committed, its origin is recorded truthfully, and the working
tree is clean so a gate-3 run can start from a clean snapshot.

**The code is Codex Exec's, not this lane's.** It was produced during a real
Cairn run on Cairn itself that crashed before sealing. This task verified it
and adopted it; it did not write it, and it does not present it as a verified
Cairn result, because Cairn never verified it.

## What actually changed

Four paths, and one restored.

- `app/src/main/main.ts` - the worker's edit, adopted **unmodified**: `Menu`
  added to the `electron` import, and one `Menu.setApplicationMenu(null);`
  immediately before `new BrowserWindow(`. Two lines.
- `app/tests-unit/applicationmenu.test.ts` - the worker's test, adopted
  **unmodified**.
- `docs/ai-work/tasks/248-brief.md` - Cairn's own artifact from the crashed
  run, committed **unedited**.
- `docs/ai-work/tasks/249-brief.md`, this report, and one `LOG.md` row.
- `app/launch-build.log` - **restored to `HEAD`, not committed.** See below.

## The interrupted run, explained rather than resumed

Cairn wrote `248-brief.md` at 00:24:39, dispatched Codex Exec, and the worker
edited `main.ts` at 00:25:22. Cairn then stopped running. What it left is
exactly what the restoration plan requires of abrupt process loss:

| | |
|---|---|
| `248-brief.md` | written |
| `248-report.md` | **absent** |
| `LOG.md` row for 248 | **none** |
| Commit | **none** |
| Result card / `DONE` | **never authored** |

The change existed in no commit on any branch, verified with
`git log --all -S`. **No `248-report.md` was authored by this lane**, and none
should be: in an envelope-dispatched run Cairn's runtime authors the report and
log row itself, so a lane writing one would be impersonating the envelope. The
brief is committed so the record survives and task number 248 cannot be reused;
the run is explained here instead of reconstructed, which is what the plan asks
of the next session.

**`248-brief.md` also records the run's protected starting state as `HEAD:
b91b7f5` with a clean working tree, and lists "Protected Git work changes
unexpectedly" among its stop conditions.** This lane committed `574b85b` at
00:29:23, moving `HEAD` off that snapshot and modifying `LOG.md`, one of the
run's three owned records, roughly forty seconds after the app's last observed
write. There is no `STOPPED` report, which a detected protected-work change
would have produced, so the run had most likely already died - but that cannot
be proved, and committing into a checkout with a live Cairn run in it was a
mistake regardless. It is recorded here rather than left out.

## Check results

### `c1` - the change is present and minimal: PASSED

`git diff` on `app/src/main/main.ts` is exactly:

```diff
-import { app, BrowserWindow, dialog, screen } from "electron";
+import { app, BrowserWindow, dialog, Menu, screen } from "electron";
...
+  Menu.setApplicationMenu(null);
   const win = new BrowserWindow({
```

Nothing else in the file changed.

### `c2` - the inherited test actually guards the change: PASSED, mutation-proved

The test is not this lane's, so it was not taken on trust. Each mutation was
applied to the real `main.ts`, the unit build re-run, and the file restored and
confirmed byte-identical with `cmp`:

| State | `applicationmenu.test.js` |
|---|---|
| as the worker left it | **1 pass, 0 fail** |
| `Menu.setApplicationMenu(null);` removed | **0 pass, 1 fail** |
| `Menu` dropped from the import | **0 pass, 1 fail** |
| restored | **1 pass, 0 fail** |

### `c3` - what the test does and does not prove: RECORDED

**It is a source-text guard, not a behaviour test.** It reads
`src/main/main.ts` as a string and matches two regular expressions: that the
`electron` import mentions `Menu`, and that `Menu.setApplicationMenu(null);`
appears after `export function createWindow` and before `new BrowserWindow(`.

It never launches a window, never starts Electron, and never observes a menu.
It would keep passing if `createWindow` were never called, or if the call sat
in an unreachable branch. That is a real pattern in this repository -
`unsealedcandidatepaper.test.ts` is the same shape - and it is a reasonable
guard against the line being deleted later. It is not evidence that the menu is
gone at runtime. `c5` is that evidence.

It also reads through `process.cwd()`, so it only works when the suite is run
from `app/`, which is how `npm run test:unit` runs it.

### `c4` - nothing else regressed: PASSED

| Command | Result |
|---|---|
| `npm run typecheck` (root) | **PASS** |
| `npm run build` (root) | **PASS** |
| `npm run test:unit` from `app/` | **941 tests, 930 pass, 9 fail, 2 skipped** |

One more test and one more pass than the 940 / 929 / 9 / 2 baseline measured on
this tree earlier today - the worker's own test, which ran and passed. The
failure set was sorted and diffed against that baseline: **identical**, the
nine pre-existing Task 224/231/233 Builder failures. None is this task's.

### `c5` - the owner has seen the menu bar gone: PASSED

Already answered, before this task existed. After the crash the owner reopened
Cairn and reported:

> I had CAIRN complete a task. I asked it to remove buttons at the top of
> CAIRN's window. it crashed, but when re-opened, the task was done as the
> buttons were removed.

That is the runtime evidence `c3` says the test cannot give. **Note what it
also shows**: the app they reopened had been rebuilt by `launch-cairn.ps1` from
the worker's uncommitted edit, so the running product was built from an unsealed
candidate. That is a finding in its own right and is recorded below.

### `c6` - the tree is clean afterwards: PASSED

Every path is named above. `app/launch-build.log` was modified by the
relaunch's rebuild and has been **restored to `HEAD` rather than committed**: it
is generated output, rewritten by `launch-cairn.ps1` on every build that runs,
and it is tracked only by accident - swept into `144f070`, whose own message
says it was "committed whole by owner hand". Committing a stale build log as
though it were work would be worse than restoring it, and nothing is lost
because the next launcher build regenerates it.

## Two consequences of the change, neither of them blocking

The owner set aside the risk that "hiding the menu bar removes standard window
menu items" before dispatch. These are its concrete forms, found by reading
rather than assumed, and neither was known when it was set aside.

**On macOS, copy and paste stop working in text fields.** This app builds for
macOS - `forge.config.ts:16` carries `MakerDMG` and `MakerZIP(["darwin"])` - and
on macOS the Cut/Copy/Paste/Select-All roles are provided *by the application
menu*. `Menu.setApplicationMenu(null)` removes them, and nothing else in `src/`
registers a menu, a role, or a global shortcut. On Windows, where this was run
and judged, Chromium handles those keys natively and nothing is lost. **So the
owner's machine is unaffected and a macOS build would be badly affected.**

**DevTools is no longer reachable by keyboard, on any platform.** Nothing in
`src/` calls `openDevTools` or registers a shortcut, so the default menu was the
only way in.

Both are reported, not fixed: the brief forbids changing what the worker wrote,
and whether to restore a minimal Edit menu on macOS is a product decision.

## A finding this task did not fix

**Cairn's launcher rebuilt Cairn from an unsealed candidate.** After the crash,
`launch-cairn.ps1` compared timestamps, saw `src` was newer than the last build,
rebuilt, and started the app - so the product the owner reopened was running
code Cairn itself still regarded as an unverified candidate, with no report, no
log row and no commit anywhere.

The owner reasonably concluded the task was done, because the product showed
them the finished result. Nothing lied: Cairn never claimed `DONE`. But the
evidence of completion reached the owner through the running app, going around
the envelope that is supposed to be the only thing permitted to say so. A
candidate silently became the product on next launch.

This is the sharpest finding of the session and no fixture could have produced
it; it needed Cairn running on itself and crashing. It is recorded and not
fixed - the owner has been told and has not asked for it, and it is a design
question about what may build a project, not a defect in these two lines.

## How to try it

```text
npm run typecheck
npm run build
```

from the repository root, and from `app/`:

```text
npx tsc -p tsconfig.unit.json
node --test dist-unit/tests-unit/applicationmenu.test.js
```

To see the outcome rather than the guard, start Cairn with
`app\launch-cairn.ps1` - **not** `npm start`, which is electron-forge dev mode
and restarts the app whenever `src/main/main.ts` changes.

## Limitations and remaining human judgment

- **This is an adoption, not a verification of Cairn.** The two lines are
  checked; the run that produced them is not, and cannot be - it left no report.
- **The test proves the source, not the window.** See `c3`.
- **macOS is a real regression** and this task did not address it. See above.
- **No Cairn run, no worker call, and no provider, model, credential, network,
  dependency, external write, push or deployment occurred in this task.**
- The milestone does not move. This clears the way for the gate-3 run; it is
  not that run.

## Disposition

**Disposition: DONE - `c1` through `c6` pass with their real output recorded
above, the code's origin is disclosed rather than presented as this lane's own,
and the checkout is clean.**

`c5` was answered by the owner before this task existed, which is why no new app
launch was needed. The two consequences named above - macOS copy and paste, and
keyboard DevTools - are real and unfixed by design: the brief forbade editing
what the worker wrote, and both are product decisions rather than defects in
these two lines.
