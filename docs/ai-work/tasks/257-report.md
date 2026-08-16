# Task 257 report — extract neutral activity truth with no visible change

**Lane:** A (the main checkout). **Base commit:** `c345022`. **Claim commit:**
`d454c18` (brief only). **Slice:** 2 of 11 in
`docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`.

The owner confirmed Lane A was free and pre-cleared the app-token E2E step on
2026-08-16. There is no owner gate in this slice; the next is Owner gate 2 at
the end of Slice 4.

## What actually changed

Created:

- `app/src/renderer/activity/presentation.ts` (365 lines) — the neutral
  projection.
- `app/tests-unit/activitypresentation.test.ts` (660 lines) — characterization,
  transcript golden, causal transitions, neutrality guards.
- `app/tests-unit/activityrender.test.ts` (362 lines) — the rendered
  no-visible-change golden and structural pins.
- `app/tests-unit/activity-transcript.golden.txt` (117 lines) and
  `app/tests-unit/activity-render.golden.txt` (50 lines) — the two goldens.
  **Neither path is named in the plan**; they are the recorded baselines the
  plan's rule 4 asks for, kept as files rather than inline constants so a
  reviewer can read them. Declared here as an addition.
- this report, and one LOG row.

Deleted, in this same task, only after every import and characterization had
moved: `app/src/renderer/town/presentation.ts` (305 lines) and
`app/tests-unit/townpresentation.test.ts` (360 lines).

Modified — the complete tracked diff outside this task's records is
**37 insertions, 34 deletions across six files**, and every one of those lines
is an identifier or path rename:

- `app/src/renderer/screens/Workspace.tsx` (26 lines)
- `app/src/renderer/components/TownSquare.tsx` (14 lines)
- `app/src/renderer/components/PondLine.tsx` (4 lines)
- `app/tests-unit/pondline.test.ts` (18 lines) — import plus the six call sites
  that name the renamed function. No assertion changed.
- `app/tsconfig.unit.json` (5 lines) — swaps the module path, and adds
  `PondLine.tsx`, `TownSquare.tsx` and `TownDetail.tsx` so `c5` can render them.
- `app/lab/chatmock-view.tsx` (4 lines) — **not named in the plan's exact-path
  list.** It is a real consumer of the deleted module, found by sweeping every
  importer rather than trusting the list; leaving it would have broken
  `npm run typecheck` and `npm run build:lab`. Disclosed in the brief before the
  work, and repaired here under "Repair inside the same task".

Nothing under `core/**`, `cli/**`, `src/main/**`, the phone page, IPC, preload,
stores, `app.css`, package manifests or locks was touched. No stylesheet
changed. No `.cairn` data was read, written or deleted.

## The separation

`ActivityEvent` carries what happened and to whom — kind, key, worker, adapter.
`ActivityCue` is that event plus `phase: "flight" | "landing"`, which is motion
staging and is never read to decide truth. A truth-bearing consumer can name
`ActivityEvent` without touching motion; the runtime shape is unchanged, so no
behaviour moved with the type.

Town-only flight and landing *positions* — `TOWN_CENTER`, the arc control
points, the `--town-from-*` custom properties — already lived in
`TownSquare.tsx` and stayed there. None entered the neutral module.

`pondLineTone`, `pondLineLabel` and `PondLineTone` remain exported from the
neutral module, and `activityStatus` still returns "Town is quiet." and the two
handoff sentences. Both are deliberate: the plan requires `pondline.test.ts` to
change its import and nothing else, and changing a visible word would break the
one thing this slice must not break. A guard test pins those three names as the
only surface vocabulary allowed to remain, so a fourth cannot appear quietly.
Slice 4 retires all of it.

One implementation call, recorded as an AI decision. The old module wrote the
run key's separator as a unit-separator escape inside a string literal. Both
the editor and the shell in this session silently converted that escape into
the raw control byte, which then sits invisible in the source. The neutral
module uses `const RUN_KEY_SEPARATOR = String.fromCharCode(31)` instead — same
string at runtime, proved by the transcript golden, and nothing invisible left
in the file (verified: zero code points below 32 other than newline).

## Checks

Run from `app/`. Every result below is the real one.

**`c1` — the characterization is real, and was taken from the old module
first. PASS.** Both new suites were written against
`src/renderer/town/presentation.js` and run **green against it before the
neutral module existed**: 16/16, recorded in this session. The suites reach the
module through local aliases so the swap is an import-block edit and nothing
else. The diff across the swap was taken and is exactly that: the seven-line
import block in each file, plus two neutrality tests added afterwards and
declared below as additions rather than as before/after evidence.

**`c2` — the neutral module reproduces the old module's transcript exactly.
PASS.** Twenty-three scenarios drive the reducer step by step; every observable
field is recorded per step, including `same=yes/no` for whether the reducer
returned the previous object *by identity*, which `Workspace` depends on.

The golden was generated from the OLD module and is asserted against the NEW
one. When `c4` forced a twenty-third scenario to be added, the old module was
restored from Git (`git show HEAD:…`), the import block flipped back, the whole
golden regenerated from it, and then the module deleted again — so the golden
is still entirely the old module's output, not the new module's opinion of
itself.

```powershell
.\node_modules\.bin\tsc.cmd -p tsconfig.unit.json --pretty false
node --test dist-unit/tests-unit/activitypresentation.test.js
```

`tests-unit/activity-transcript.golden.txt` SHA-256
`09adf225908acd0ce8f35d6c562a96945cff2ba0d64f3b98f7dd45d4fa1e5574`.

**`c3` — causal state transitions hold. PASS.** Eleven tests, each asserting the
transition rather than the end state: run-key composition (each of the five
fields re-keys the run); stale rejection **by object identity** on both the
animated and reduced paths; the length guard alone; ERROR as the only terminal
escalation, with the reverse refused; a spent cue staying spent across twelve
polls; an advance with a foreign key changing nothing; new-run reset;
reduced-motion equality with the settled animated state; commentary over a
retained outcome; and the offline demonstration never claiming verified work.

**`c4` — the tests actually bite. PASS, and it found a real hole.**

*Mutant 2* (terminal regression allowed, `if (false && …)`) was killed
immediately by two tests: `c2` and `c3: ERROR is the only terminal escalation`.

*Mutant 1* (the stale-snapshot length guard deleted) **survived the first
run — 19/19 still green.** That was a genuine gap, not a formality: both
"older prefix" cases started from a *terminal* state, where the terminal guard
below rejects the snapshot anyway and hides the deletion. Nothing in the suite
covered a shorter snapshot with **no** terminal evidence, which is the only
case where the length check is the sole protection — and where losing it lets
truth regress from `checking` back to `working` and rewinds
`nextActivityIndex` far enough to replay a return cue the owner has already
watched.

One transcript scenario and one causal test were added for exactly that case
(both generated and verified against the old module, per `c2`). Mutant 1 then
failed 2 of 19. Each mutant was applied with the editing tools, never a
PowerShell round-trip, and the file restored from a byte-exact backup and
re-verified: SHA-256
`43a96d13438f5537770e715073432baf0f60b9f498a61d33fcf49eaabba77ea0` before and
after both mutants. No mutation-test framework and no dependency was added.

**`c5` — the render is unchanged. PASS.** `TownSquare` and `PondLine` are
rendered with `react-dom/server` across eighteen runtime states plus a
thirty-two-cell narrow-window matrix, and each section's markup is hashed
against a golden captured from the pre-change tree. Markup, not pixels: nothing
here compares pixels, so there is no font, clock or animation in the loop to
control and the comparison is exact rather than tolerant. The states are
produced by driving the real reducer, so this covers the whole truth-to-markup
path. Four structural tests additionally pin `data-town-truth`,
`data-town-motion`, `data-town-outcome`, the cue key/kind/phase, Cairn's
accessible name, the spoken status, worker-node provenance, and the line's
tone — in the same terms `conductor.spec.ts` asserts against the real app.

`tests-unit/activity-render.golden.txt` SHA-256
`d68069f9ddde35963484ad789073d4d9600306f47d3ce59c812c12a72cac0a0a`. Recording
it here makes a later silent regeneration detectable.

Two defects in this suite's own first draft, both caught by its matrix guard
and fixed before the golden was kept: chaining `observe` from a quiet start
left the *first* cue active, so three cases were not the states they were named
for; and a saved worker position of x=0.42 sits inside both shore bounds, so
the whole-pond case hashed identically to the beside-chat case and proved
nothing. The guard now asserts the two must differ.

**`c6` — nothing still points at the deleted module. PASS.** A repository-wide
sweep for `town/presentation`, `TownRuntimePresentation`,
`hydrateTownPresentation`, `observeTownPresentation`, `advanceTownCue`,
`settleTownPresentation`, `townPresentationStatus` and `townRunKey` returns only
two prose mentions in comments recording where the code came from. Both files
are absent; `src/renderer/town/` now holds `faces.ts`, `layout.ts`, `model.ts`.

**`c7` — the app compiles, builds and tests as it did. PASS.**

```powershell
npm.cmd run typecheck    # clean
npm.cmd run test:unit    # 970 tests, 959 pass, 9 fail, 2 skipped
npm.cmd run build:vite   # built
npm.cmd run build:lab    # built
```

The pre-task baseline captured on `c345022` before any edit was 965 / 954 / 9 /
2. The **failure set is byte-identical** — not merely the count: the same nine
pre-existing tests in `builderlivetransport.test.js` and
`buildertrackedtext.test.js`, which Task 255 also recorded and which this task
does not touch. Net +5 tests: 19 added, 14 removed with
`townpresentation.test.ts`.

**`c8` — the real app behaves identically. PARTIAL, with the shortfall proved
not mine.** Four focused scenarios from `tests/conductor.spec.ts`, run with both
token locations held:

| Scenario | Result |
|---|---|
| `a dispatched run lives in the conversation…` (run state, cue ordering) | **PASS** 15.6s |
| `a stopped run posts an honest STOPPED card…` (STOPPED) | **PASS** 8.9s |
| `a fresh confirmed dispatch reaches the same stable Town with reduced motion…` | **FAIL** — pre-existing |
| `a reload mid-run reattaches the conversation's strip…` | **FAIL** — pre-existing |

Both failures are reproducible, not flaky — each failed twice on this tree. I
did not stop at "probably not mine". Following Task 240's precedent I backed up
my three modified renderer files and the full uncommitted diff, restored
`Workspace.tsx`, `TownSquare.tsx`, `PondLine.tsx` and `town/presentation.ts` to
`HEAD` with `git checkout HEAD -- <exact paths>`, rebuilt `build:vite`, and ran
both scenarios again. **Both failed identically on the pre-change baseline, at
the same 1.0m and 36.0s.** My work was then restored and verified byte-exact:
all three file hashes match the backup and `git diff` is identical to the saved
patch. The only files touched were my own uncommitted ones; nothing was
stashed, cleaned or reset.

The reattachment failure is `expect(.run-strip).toContainText("DONE —")` timing
out at 30s with the strip stuck in `Check` — `.run-strip` belongs to `Chat`,
which this task never touched, and Cairn's Check stage is main-process work.
The pattern across all four is consistent: every scenario that stops a run
early passes; every scenario that needs a run to reach verified DONE fails.
**These two are newly recorded pre-existing reds.** They are distinct from the
already-known `conductor.spec.ts:3314`, which briefs 243–252 carry as
not-this-task's. The next slice should carry all three.

Reduced motion and reattachment therefore have no E2E proof from this task.
They are covered at unit level instead: reduced motion by two transcript
scenarios, `c3: reduced motion reaches the animated path's settled state`, and
`c5`'s reduced-motion render case; reattachment by the hydrate-then-observe path
that `c5` uses for every mid-run case, which is literally what `Workspace` does
on mount.

**ERROR has no E2E scenario at all**, as the brief said before the work: no spec
in `app/tests/**` asserts `data-town-truth="error"`, and inducing a real runtime
exception is outside a no-visible-change slice. ERROR is covered by `c2`, by
`c3`'s escalation test in both motion modes, by mutant 2, and by `c5`'s rendered
error case.

Mutex discipline: `workers: 1` throughout. Both locations
(`%TEMP%\cairn-app-token` and `app/.app-token`) were acquired with `mkdir`,
which fails if the directory exists, and released in a shell `trap` — only ever
the locations that run created. Both are confirmed absent now. No other lane's
or the owner's token was removed.

Every Playwright invocation passed `--output=test-results/task257-runner`.
The repository-root `playwright.config.ts` declares no `outputDir`, so it
defaults to `test-results`, which Playwright clears at the start of every run —
the exact mechanism by which Task 255 destroyed Task 229's cited screenshot.
`app/test-results/` was also copied to a scratch backup before the first run.
After every run: `task229-builder-proposal-review.png` is 696,088 bytes,
SHA-256 `C692EC68…FBEA69`, **unchanged**; `task255-board` still holds its 19
screenshots; `task255-runner` and the root `.last-run.json` (16:47, Task 255's)
are untouched.

**`c9` — records and Git protection are exact. PASS.** The brief was committed
alone at `d454c18`. Nothing was cleaned, stashed, reset, broadly staged, or
rewritten. All five sibling worktrees (`.lanes/b`–`.lanes/e`, `.lanes/h`) report
zero status entries and were never written to. No worktree was created, deleted,
reused, reset or moved.

## Two conditions found, neither caused here

- **~190 leftover `cairn-e2e-profile-*` directories** in `%TEMP%`, dating back
  to 2026-07-30, from the Windows `EPERM` profile-cleanup failure in worker
  teardown that Task 241 also recorded. That teardown timeout is what stopped
  the first batched run after two tests, which is why the remaining scenarios
  were run one Playwright invocation each. I did not delete any of them: they
  are not this task's, and several predate this session by weeks.
- The two E2E scenarios above.

## How to try it

The app should look and behave exactly as it did. From the repository root:

```powershell
cd "C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework\app"
npm start
```

Open a project, talk with Cairn, and dispatch a task: the Town, the pond, the
narrow-window line below 1260px, the status sentence, the reset control and
every animation are unchanged. To see the proof rather than the absence:

```powershell
npm run test:unit
```

`c2`, `c3` and `c5` are the decisive ones. The full generated transcript and
render text are written to `app/dist-unit/tests-unit/` on every run.

## Limitations and remaining judgment

- **`c8` is partial.** Two of the four named scenarios do not pass, on this tree
  and equally on the pre-change baseline. Reduced motion and reattachment rest
  on unit-level evidence in this task.
- `c5` compares markup, not pixels, and cannot see CSS. No stylesheet changed,
  and `pondline.test.ts` still asserts the narrow-window CSS contract directly.
- `c5` cannot reach `TownSquare`'s selection states, which are internal
  `useState` and unreachable from props under server rendering. They are
  untouched by this task and belong to Slice 4.
- The neutral module still exports three Pond-named things and still says "Town
  is quiet." Both are required by this slice's own no-visible-change rule and
  are pinned by a guard so the exception cannot widen. Slice 4 retires them.
- Tokens promoted into `src/renderer/tokens.css` remain Slice 3's work; Slice 1's
  `--rp-*` layer is still lab-only.
- No dependency install, provider or model call, credential use, paid call,
  network or external-service write, push, publication or deployment occurred.
  The milestone did not move.

Slice 3 was not begun in this conversation.

**Disposition: DONE**
