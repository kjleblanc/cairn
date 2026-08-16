# Task 257 brief — extract neutral activity truth with no visible change

**Lane:** A (the main checkout). **Base commit:** `c345022`. **Slice:** 2 of 11
in `docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`.

Slice 1 closed DONE at `d9df42d` (Task 255) and passed Owner gate 1. There is
**no owner gate in this slice**; the next one falls at the end of Slice 4.

## The requested visible outcome

The running app looks **exactly** as it does now, while its truthful runtime
state stops living in a Town-named module. A neutral activity projection —
truth, run identity, terminal outcome, and written status — can drive Cairn
without worker scenery.

"No visible change" is the deliverable, not a side effect. Every check below
exists to prove an absence.

## The boundary of intent — what must not change

Behaviour, in the reducer and in the app:

- monotonic snapshots (an older prefix never erases newer truth);
- repeated-activity deduplication (a poll never replays a spent cue);
- dispatch → return → terminal cue ordering, and the obsolete-dispatch drop;
- stale-timer inertness (a timer whose key is gone does nothing);
- `STOPPED` → `ERROR` escalation, and only that terminal transition;
- terminal settlement, new-run reset, and commentary over a terminal result;
- reduced-motion semantic equality with the animated path;
- the offline demonstration never colouring a real-worker `done`.

Everything else: current DOM, CSS, Town visuals, project switching, capture
identity, poll intervals, focus behaviour, `.cairn` data, stored
`town-square.json`, IPC, main-process code, `core/**`, `cli/**`, the phone
page, package manifests and locks.

Explicitly **not** in this slice: any wording change. `activityStatus` returns
the byte-identical strings the Town says today, including "Town is quiet." and
the Pond line's own labels. Retiring that vocabulary is Slice 4/5's work, and
changing it here would be a visible change.

Protected paths: every tracked, staged, modified and untracked path, including
untracked evidence under `app/test-results/` — `task229-builder-proposal-review.png`,
`task255-board/`, `task255-runner/`. `app/test-results/` is gitignored, so Git
cannot restore it. The repository-root `playwright.config.ts` declares **no**
`outputDir`, so it defaults to `test-results` and Playwright clears that
directory at the start of every run. Every Playwright invocation in this task
therefore passes `--output=test-results/task257-runner`. This is the exact
defect Task 255 caused and could not fully repair.

Boundaries: no dependency install, no mutation-test framework, no provider or
model call, no credential use, no paid call, no external-service write, no
push, no publication, no deployment. No worktree is created, deleted, reused,
reset or moved.

## What changes

Create:

- `app/src/renderer/activity/presentation.ts` — the neutral projection.
- `app/tests-unit/activitypresentation.test.ts` — characterization, causal
  transitions, and the mutation harness.
- `app/tests-unit/activityrender.test.ts` — the rendered no-visible-change
  golden.

Modify:

- `app/src/renderer/screens/Workspace.tsx`,
  `app/src/renderer/components/TownSquare.tsx`,
  `app/src/renderer/components/PondLine.tsx` — consume the neutral module.
- `app/tsconfig.unit.json` — swap the module into the include list, and add the
  three components the rendered golden must compile.
- `app/tests-unit/pondline.test.ts` — its import line only. Its outgoing visual
  contract stays until Slice 4.
- `app/lab/chatmock-view.tsx` — **its import line only.** The plan's exact-path
  list does not name this file; it is a real consumer of the module being
  deleted, found by sweeping every importer rather than trusting the list.
  Leaving it would break `npm run typecheck` and `npm run build:lab`. Recorded
  here as a disclosed in-scope repair under "Repair inside the same task".

Delete, in this same task and only after every import and characterization has
moved:

- `app/src/renderer/town/presentation.ts`
- `app/tests-unit/townpresentation.test.ts`

## The separation

`ActivityEvent` carries what happened and to whom — kind, key, worker, adapter.
`ActivityCue` is that event plus `phase: "flight" | "landing"`, which is
motion staging for a surface that animates it and is never read to decide
truth. Truth-bearing consumers can name `ActivityEvent` without touching
motion. The runtime shape is unchanged, so no behaviour moves with the type.

Town-only *positions* — `TOWN_CENTER`, the arc control points, the
`--town-from-*` custom properties — already live in `TownSquare.tsx` and stay
there. Nothing about them enters the neutral module.

`pondLineTone` and `pondLineLabel` stay exported from the neutral module this
slice, because the plan requires `pondline.test.ts` to change its import line
and nothing else. They are Pond vocabulary in a neutral module — a deliberate,
disclosed wart that Slice 4 retires.

## Checks

Run from `app/` unless stated. Every check names its exact command.

**`c1` — the characterization is real, and was taken from the old module
first.** `activitypresentation.test.ts` is written against
`src/renderer/town/presentation.js` and passes **before** the neutral module
exists. A characterization test that was never run against the code it
characterizes proves nothing.

```powershell
.\node_modules\.bin\tsc.cmd -p tsconfig.unit.json --pretty false
node --test dist-unit/tests-unit/activitypresentation.test.js
```

**`c2` — the neutral module reproduces the old module's recorded transcript
exactly.** A deterministic driver feeds a fixed matrix of snapshot sequences
through the reducer and records every observable field at every step. The
golden is generated from the **old** module, committed, and then asserted
against the **new** one. Any behavioural drift is a diff, not a judgment call.

**`c3` — causal state transitions hold.** Each item in the boundary-of-intent
behaviour list has at least one test that asserts the transition, not just the
end state: the guard rejects the stale prefix *and returns the same object*;
`STOPPED` → `ERROR` escalates while every other terminal change is refused;
a spent cue stays spent across repeated polls; a new run resets motion and
outcome; reduced motion reaches the animated path's settled state.

**`c4` — the tests actually bite.** Two source mutants are applied to the
neutral module, one at a time, with the editing tools and never a PowerShell
`Get-Content`/`Set-Content` round-trip: (1) drop the stale-snapshot guard, and
(2) allow terminal regression. Each mutant must fail `c1`'s suite; the file is
restored byte-exact and the suite re-run green after each. Recorded with the
failing test names. No mutation-test framework and no dependency is added.

**`c5` — the render is unchanged.** `activityrender.test.ts` renders
`TownSquare` and `PondLine` with `react-dom/server`'s `renderToStaticMarkup`
across a fixed matrix of runtime states and asserts the markup against a golden
captured from the pre-change tree. Markup equality, not pixels: no fonts,
timers or motion participate, so there is nothing to control. The precedent is
`tests-unit/builderproposalreview.test.ts`, which already renders this way.

**`c6` — nothing still points at the deleted module.** After the work, a
repository sweep finds zero references to `town/presentation`,
`TownRuntimePresentation`, `hydrateTownPresentation`, `observeTownPresentation`,
`advanceTownCue`, `settleTownPresentation`, `townPresentationStatus` or
`townRunKey` outside build output and historical records, and both deleted
files are absent.

**`c7` — the app still compiles, builds, and tests as it did.**

```powershell
npm.cmd run typecheck
npm.cmd run test:unit
npm.cmd run build:vite
npm.cmd run build:lab
```

`test:unit`'s pass/fail/skip counts are compared against a baseline captured on
`c345022` before any edit. The nine known failures in
`builderlivetransport.test.js` and `buildertrackedtext.test.js` are
pre-existing (Task 255 recorded them); the failure **set** must be identical,
not merely the count.

**`c8` — the real app behaves identically.** Focused Playwright scenarios from
`tests/conductor.spec.ts`, run with the app-token mutex held and
`--output=test-results/task257-runner`:

1. "a dispatched run lives in the conversation: the strip names its stage, the
   composer closes, and Stop lands the terminal state" — run state and cue
   ordering;
2. "a fresh confirmed dispatch reaches the same stable Town with reduced motion
   and no transient packet" — reduced motion;
3. "a stopped run posts an honest STOPPED card that names the stop code and
   claims no product change" — STOPPED;
4. "a reload mid-run reattaches the conversation's strip and shows the finished
   state there" — reattachment.

**ERROR has no E2E scenario today.** A sweep of `app/tests/**` finds no spec
asserting `data-town-truth="error"`; inducing a real runtime exception is
outside a no-visible-change slice. ERROR is covered by `c2`, `c3` (escalation,
both animated and reduced), `c4`'s terminal-regression mutant, and `c5`'s
rendered golden. This is stated as a gap, not papered over.

`workers: 1` is kept — it protects the owner's real conductor connection
snapshot and is not a performance setting. Both token locations
(`%TEMP%\cairn-app-token` and `app/.app-token`) are acquired with `mkdir`,
which fails if the directory exists; only locations this run creates are
released, in a `finally`. If acquisition fails, this task waits. No other
lane's or the owner's token is ever removed. The owner pre-cleared this step
on 2026-08-16.

**`c9` — records and Git protection are exact.** This brief is committed alone
to claim 257. The completion commit stages only this task's exact paths. No
clean, stash, reset, broad stage, or history rewrite. The final `git status` is
inspected and reported, and every other registered worktree is confirmed
unchanged by this task.

## DONE and STOPPED

**DONE** means: `town/presentation.ts` and `townpresentation.test.ts` are gone,
every consumer reads the neutral module, `c1`–`c9` completed with their real
results recorded, the rendered golden and the transcript golden both match, and
the four Playwright scenarios pass.

**STOPPED** means any of: truth cannot be separated without changing runtime
semantics; a stale project or run can paint the current project; a check fails
in a way that repair inside this task would change the requested outcome; the
app token cannot be acquired; or protected work changes unexpectedly.
