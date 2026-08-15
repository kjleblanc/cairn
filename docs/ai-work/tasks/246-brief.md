# Task 246 brief - give Cairn a check menu it can actually pass

**Lane:** A (the main checkout). **Base commit:** `fc23bec`.

The Slice 5 precondition of
`docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md`, named as
still-unmet in the reports for Tasks 240, 241, 243 and 244. Slice 5 asks a
beginner to watch one whole Gauntlet journey **on Cairn itself**; today Cairn
cannot check its own work at all.

## The observed failure

`projectCheckMenu` (`core/src/taskcard.ts:89`) reads the project root's
`package.json` and offers only the checks it actually declares: `typecheck`,
`build`, `test:unit`. Cairn's own root `package.json` declares **one** script,
`test`. So on Cairn itself the menu is **empty**, every Task Card row falls to
owner observation, and Cairn's own envelope has nothing to verify with.

It is worse than a missing line. Measured today, each candidate check against
the 120-second cap (`PROJECT_CHECK_DEFAULT_CAP_MS`, `taskcard.ts:114`), past
which a row is `unfinished` and can never seal DONE:

| Candidate | State | Fits the cap? |
|---|---|---|
| `typecheck` | **RED** — `cli/test/task.test.ts:111` and `:119` | yes, ~10s once fixed |
| `build` | green — core 3s, app 5s | yes, ~10s |
| `test:unit` | 9 known Builder failures **and** over 120s | **no** |

The `typecheck` red is Task 211's leftover (`c77b86c`, "bind worker Task Spec
evidence"), which added the `QualityBoundCodexExec*` overloads and never
updated the two-argument stubs in `cli/test/task.test.ts`. Both fail `TS2322`
for the missing `taskSpecSha256` and `evidencePlanSha256`. Four handoffs have
named it as "deserving its own task"; it is now on Slice 5's critical path,
because a `typecheck` script that always fails is worse than none.

One structural fact that shapes the work: the root `workspaces` is
`["core", "cli"]`. **`app` is not a workspace**, so a root script that means
"all of Cairn" has to invoke `app` explicitly rather than rely on
`--workspaces`.

## Requested visible outcome

On Cairn itself, in ordinary Chat, the Task Card before dispatch offers real
checks the owner can pick — **Check the code still compiles** and **Build the
project** — instead of an empty menu. Both pass when the tree is healthy, and
both finish well inside the cap, so a row answered by one of them can actually
reach DONE.

## Design choices recorded before the work

**1. Declare only checks Cairn can truthfully pass.** `test:unit` is left
undeclared. Nine app unit tests fail today (the Task 224/231/233 Builder
machinery) and the suite exceeds the 120-second cap on this machine, so
declaring it would put a row on the Task Card that is guaranteed to end
`failed` or `unfinished`. An empty menu is bad; a menu that lies is worse. The
menu filters to what the project declares, so a two-entry menu is a legitimate
menu, and the report will say plainly what is missing and why.

**2. Fix the `cli` typecheck rather than exclude `cli` from the script.**
Excluding it would make `typecheck` green by narrowing what it checks, which is
the same dishonesty in a different place.

**3. The scripts describe what Cairn already does**, not new machinery. They
compose commands this repo already runs — no new tool, no new dependency, no
new config file.

## Boundary of intent

- **Change no product behaviour.** This task adds scripts and fixes a test
  file's types. `projectCheckMenu`, the cap, the Task Card, the candidate, the
  critic, the repair, and every record stay exactly as they are.
- **The `cli` fix is types only.** The two stubs must keep recording exactly
  what they record and delegating exactly as they delegate; if the fix would
  change what the test observes, stop and say so.
- Do not fix the nine Builder unit failures, do not touch
  `conductor.spec.ts:3314`, and do not start Slice 5 or Slice 6.
- Add no dependency, install nothing, and touch no credential, provider or
  network.
- Stage task paths by exact name. Never `git add -A`.
- Take the app token before any app or Playwright run and release it in a
  `finally` only if that run created it.
- **One lane per checkout.** This has now gone wrong twice (Tasks 243 and 244).
  Before editing, confirm the tree is clean and no other session is live.

## Checks

1. **`c1` - the root typecheck passes and really covers Cairn.**
   `npm run typecheck` at the repo root exits 0, and its output or command
   shows it covered `core`, `app` **and** `cli`. A script that passes by
   skipping a package fails this check.
2. **`c2` - the root build passes.** `npm run build` at the repo root exits 0
   and builds what Cairn ships.
3. **`c3` - both fit the cap with room to spare.** The report states each
   measured duration against the 120,000 ms cap.
4. **`c4` - Cairn's own menu is no longer empty.** `projectCheckMenu` against
   this repo root returns exactly `typecheck` and `build`, proved by a test
   that reads the real root `package.json` rather than a fixture.
5. **`c5` - `test:unit` is deliberately absent, with evidence.** The report
   states the measured duration and the nine failures, so a later reader knows
   this was a decision and not an oversight.
6. **`c6` - the `cli` package builds and its own tests run.**
   `npm test -w cairn-cli` gets past the TypeScript build that has blocked it
   since Task 211, and its real result is reported honestly whatever it is.
7. **`c7` - nothing else moved.** Focused machine checks for `core` and `app`
   at their existing baselines, each named with its exact command and real
   result: core `507 / 497 / 0 / 10`, app unit `934 / 923 / 9 / 2`.

## DONE and STOPPED

**DONE** means `npm run typecheck` and `npm run build` both pass from the repo
root inside the cap, Cairn's own menu offers exactly those two, the `cli`
package builds again, and no product behaviour changed.

**STOPPED** means the `cli` types cannot be fixed without changing what its
test observes, or a root script cannot be made honest without excluding part of
Cairn - in which case say which, because a check menu that lies is worse than
an empty one.

The milestone does not move here. This unblocks the task that tests it.
