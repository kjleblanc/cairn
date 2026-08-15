# Task 246 report - give Cairn a check menu it can actually pass

**Lane:** A (the main checkout). **Base commit:** `fc23bec`.
**Brief claim commit:** `851e32a`.

The Slice 5 precondition of
`docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md`, named unmet
in the reports for Tasks 240, 241, 243 and 244.

## Outcome

Cairn's own check menu is no longer empty. On this repository it now offers
**Check the code still compiles** and **Build the project**, both of which pass
and both of which finish in seconds against a 120-second cap. A Task Card row
on Cairn itself can therefore be answered by Cairn's own envelope instead of
falling to owner observation for want of anything to run.

Getting there required fixing the `cli` package, which has not typechecked
since Task 211 (`c77b86c`) — four handoffs called that "its own task", and it
sat on Slice 5's critical path because a `typecheck` script that always fails
is worse than no script at all. **`cli` is green for the first time since:
24 tests, 24 pass, in 5 seconds.**

## What actually changed

Five files. No product behaviour, no dependency, no new tool or config.

- `package.json` (root) — declares `typecheck` and `build`.
- `core/package.json`, `cli/package.json` — each declares its own `typecheck`,
  so the root composes them rather than assuming one compiler. See below.
- `cli/test/task.test.ts` — the two test doubles Task 211 left behind.
- `core/test/taskcard.test.ts` — one test asserting Cairn's own menu.

## The decisions, and why

**1. Only checks Cairn can truthfully pass are declared. `test:unit` is not.**
Measured today: `npm run test:unit` in `app` takes **471 seconds** and exits
**1**, with 935 tests, 924 passing and the 9 known Task 224/231/233 Builder
failures. That is nearly **four times** the 120,000 ms cap
(`PROJECT_CHECK_DEFAULT_CAP_MS`, `core/src/taskcard.ts:114`), so a row answered
by it could only ever end `unfinished` — and would end `failed` even if it fit.
Declaring it would put a promise on the Task Card that is guaranteed to break.
An empty menu is bad; a menu that lies is worse.

**2. The `cli` typecheck was fixed, not excluded.** Making the script green by
narrowing what it checks is the same dishonesty in a different place.

The root cause is exactly what the handoffs described. `TaskFlowDependencies`
(`cli/src/flows/task.ts:58-59`) types two dependencies as Core's own functions,
and Task 211 made both overloaded. **An arrow literal cannot satisfy an
overloaded type** — one signature cannot return both the legacy and the
quality-bound shape — so the two-argument doubles stopped compiling. They are
now declared with the same two overloads and delegate on the same branch, so
they record and observe exactly what they did before. `taskFlow` itself only
ever calls the two-argument form; the three-argument overload exists purely so
the double really is Core's type rather than a narrowing of it.

**No production file was touched for this.** `core/src/index.ts` is
`export * from "./codex.js"`, so the four overload types were already public
and nameable; I had briefly assumed otherwise.

**3. Each package declares its own `typecheck`; the root composes them.** The
first version of the root script was
`tsc -p core --noEmit && tsc -p app --noEmit && tsc -p cli --noEmit`. It worked,
in 7 seconds — but it used the **root's** TypeScript against `app`'s config, and
`app` is not a workspace (root `workspaces` is `["core", "cli"]`). Both resolve
to 5.9.3 today and nothing enforces that. Composing each package's own script
costs 4 seconds and removes the assumption; it also means Cairn pointed at
`core/` alone would find a menu there.

## Check results

### `c1` - the root typecheck passes and really covers Cairn: PASSED, mutation-proved

`npm run typecheck` exits **0 in 11 seconds**, and its own output names every
package it ran:

```
> @cairn/core@0.8.0 typecheck
> cairn-cli@0.8.0 typecheck
> cairn-desktop@0.8.0 typecheck
```

A green script only proves it ran, so it was **mutation-tested on the thing
Cairn actually reads** — `runProjectCheck` decides `passed`/`failed` from the
**exit code** (`core/src/taskcard.ts:250`), not from printed output, so a
script that reports errors and exits 0 would pass falsely:

| Mutation | Exit code |
|---|---|
| a type error in `core/src/critique.ts` | **2** |
| a type error in `app/src/shared/critique.ts` | **2** |
| clean tree | **0** |

The `app` case is the one that mattered: it is reached through
`npm --prefix app`, not through `--workspaces`. Both files were restored from
backups and confirmed byte-identical by `git status`.

### `c2` - the root build passes: PASSED

`npm run build` exits **0 in 8 seconds**, running `@cairn/core` and `cairn-cli`
through `--workspaces` and then `app`'s `build:vite`. It leaves no tracked file
modified — verified with `git status` immediately afterwards, which showed only
this task's own edits.

### `c3` - both fit the cap with room to spare: PASSED

| Check | Measured | Cap | Headroom |
|---|---|---|---|
| `npm run typecheck` | 11 s | 120 s | ~11x |
| `npm run build` | 8 s | 120 s | ~15x |

### `c4` - Cairn's own menu is no longer empty: PASSED, red first

`Cairn's own project offers real checks, not an empty menu` reads the **real**
repository root rather than a fixture, and asserts the menu is exactly
`["typecheck", "build"]` with commands `npm run typecheck` and `npm run build`.
It was written first and failed with `actual: []` — the empty menu this task
exists to fix.

### `c5` - `test:unit` is deliberately absent, with evidence: PASSED

Recorded under decision 1: **471 seconds, exit 1, 935 tests with 9 failing.**
This is a decision, not an oversight, and the number is here so a later reader
can re-take it. Declaring `test:unit` becomes correct when the nine Builder
failures are fixed **and** the suite fits the cap — both, not either.

### `c6` - the `cli` package builds and its own tests run: PASSED

`npm test -w cairn-cli` — **24 tests, 24 pass, 0 fail, in 5 seconds**, having
built first. This is the first green run of this package since Task 211.

### `c7` - nothing else moved: PASSED, with the known unrelated reds

| Command | Result |
|---|---|
| `npm run typecheck` (root) | PASS, 11 s |
| `npm run build` (root) | PASS, 8 s |
| `npm test -w cairn-cli` | **24 / 24 / 0 fail**, 5 s |
| `npm test -w @cairn/core` | **still running at commit time** — see below |
| `app: npm run test:unit` | **935 tests, 924 pass, 9 fail, 2 skipped**, 471 s |

The app-unit baseline moved from 934 to 935 because Task 245 added a guard
between Task 244 and this task; the nine failures are unchanged and are the
Task 224/231/233 Builder machinery.

**The full Core suite had not finished when this was committed.** What IS known
about Core at commit time, all measured in this session:

- `core/dist/test/taskcard.test.js` — the file this task adds a test to — ran
  **23 tests, 23 pass, 0 fail** on a full-file run, after the one load-induced
  flake described below.
- Every other Core file was run individually earlier in this session and was
  zero-fail: `builder-intercom` 11, `convert` 9, `files` 8, `steps` 5, `intent`
  23, `quality` 13, `critic` 45, `candidate` 36, `routing` 8, `codex` 22,
  `kimi` 32, `critique` 36, `lock` 7, `claims` 10, `records` 16, both `.mjs`
  files 9, and `serial` 195.
- **No Core source file was changed by this task.** The diff is
  `core/package.json` (one script) and `core/test/taskcard.test.ts` (one test).

That is strong evidence and it is not the same thing as a green full-suite run.
Task 244 records that this suite can fail under concurrency where every file
passes alone. If the run that was in flight comes back red, it needs its own
investigation and this row must be corrected rather than explained away.

## A second timing flake, recorded

`a check that outruns its cap is reported as unfinished, never as passed or
failed` (`core/test/taskcard.test.ts:156`) **failed once**, on the full-file run
that happened immediately after `npm run build` had saturated disk I/O. It uses
a real 4-second bound, so a starved machine can push it past its own assertion.
It passes **3/3 in isolation** and the next full-file run was **23/23**.

That is the second load-induced flake in two tasks — Task 244 records the
first, in the concurrent full Core suite. Both are recorded rather than
re-rolled quietly, because a suite whose failures are sometimes environmental
is a suite whose next real failure will be dismissed as environmental.

## How to try it

```
npm run typecheck
```

From the repository root. Then `npm run build`. Both should exit 0 in seconds.
To see what Cairn itself now offers, the menu is asserted by:

```
node --test --test-name-pattern="own project offers real checks" core/dist/test/taskcard.test.js
```

## Limitations and remaining owner decisions

- **`test:unit` is still missing from Cairn's own menu**, so a Task Card row on
  Cairn cannot be answered by running its tests. That needs the nine Builder
  failures fixed and the suite brought under 120 seconds, and is its own task.
- **The two declared checks are shallow.** `typecheck` and `build` prove Cairn
  compiles and bundles, not that it works. On Cairn itself a promise about
  behaviour still falls to owner observation.
- **The 120-second cap is not configurable per project.** A project whose real
  checks take longer has no way to say so; it simply gets `unfinished` rows.
  Not in scope here, but it will shape what Slice 5 can promise.
- Slice 5's other inherited blocker is untouched: **Task 242** — the briefing
  that emits the whole work log uncapped — is STOPPED and unmerged on
  `claude/keen-hawking-b5dfb8`, and Task 241's report says it blocks Slice 5
  because Cairn cannot be talked to about its own repository until it lands.
- The milestone did not move. This unblocks the task that tests it.

**Disposition: DONE** - Cairn's own menu offers two checks it can pass, both
mutation-proved to fail when the code is broken, and `cli` builds again.
