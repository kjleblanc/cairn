# Task 259 report — the chat-first workspace, and the visible Town and Pond retired

**Lane:** A (the main checkout), owner-confirmed free before any file was
written. **Base commit:** `19e7584`. **Claim commit:** `63e4c70` (brief only).
**Slice:** 4 of 11 in
`docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`.

**Owner gate 2 fell at the end of this task, and it is approved.** The owner's
verdict, verbatim and complete: **"Approved"** — chosen from the gate's own
options rather than written as prose, against the thirteen real production
screenshots listed under `c13`. Nothing here proceeded on assumed approval.

This slice inverted Slices 2 and 3. Their deliverable was that nothing moved.
This one changed what the owner sees.

## What actually changed

Created:

- `app/src/renderer/activity/presence.ts` (188 lines) — the one pure
  `CairnPresenceState` combiner.
- `app/src/renderer/components/ActivityCapsule.tsx` (52 lines) — the
  non-interactive written capsule, one live region, one small Cairn.
- `app/tests-unit/cairnpresence.test.ts` (16 tests),
  `app/tests-unit/activitycapsule.test.ts` (10 tests),
  `app/tests-unit/deskcomposition.test.ts` (16 tests).
- this report, and one LOG row.

Modified:

- `app/src/renderer/screens/Workspace.tsx` — the desk composition. Town and
  Pond unmounted; the saved-position load/save call removed; the header, the
  capsule and a `<main>` view region added.
- `app/src/renderer/screens/Chat.tsx` — a named **region** instead of a
  permanently mounted **dialog**; the tuck control, the `tucked` state and the
  villager chip and its overlay root removed.
- `app/src/renderer/components/ProjectRail.tsx` — one className, wiring the
  rail into the desk. No behaviour touched.
- `app/src/renderer/activity/presentation.ts` — `pondLineTone`, `pondLineLabel`
  and `PondLineTone` removed; their job moved into `presence.ts`.
- `app/src/renderer/workspace.css` — the desk, from 119 lines to 400.
- `app/tsconfig.unit.json` — three lines.
- `app/tests-unit/visualtokens.test.ts`, `activityrender.test.ts`,
  `activitypresentation.test.ts`, `townlayout.test.ts`,
  `activity-render.golden.txt` — see "Dispositions" below.
- `app/tests/conductor.spec.ts`, `projects.spec.ts`, `contrast.spec.ts`.

Deleted: `app/src/renderer/components/PondLine.tsx`,
`app/tests-unit/pondline.test.ts`.

**Two files in the plan's path list were not touched.** `surfaces.css` needed
nothing — every material it declares was already right, and the composition
lives in `workspace.css`. `motion.css` needed nothing — the desk starts no
animation of its own, and the one it had to turn off (the retired panel's
entrance) is turned off where the panel is composed. `app.css` was **not
modified at all**: the Town, pond and villager rules are left present and
unused exactly as the plan asks, which is also what kept nine CSS-text unit
tests green with zero edits.

Nothing under `core/**`, `cli/**`, `src/main/**`, IPC, preload, stores, the
phone page or package manifests was touched — verified with `git status` over
those paths. No `.cairn` data was read, written or deleted.

## Three decisions, and one that the tests forced

**One resolved value, ten states, one precedence table.** `presence.ts` takes
the neutral runtime truth, Chat's `needsOwner` seam and the connection, and
returns one object whose `state` determines the written status, the secondary
detail, the ground tone and Cairn's expression. The precedence is in the brief;
it puts a waiting decision first (the approved Decision 9 rule, kept whole) and
`disconnected` **below** every real run state, because a reattached run and a
saved result are true whether or not the conductor is connected.

**`chat-column-villager` stays on the conversation, and that is not an
oversight.** Removing it was the first thing I did, and `conductor.spec.ts`
caught what it cost: roughly two hundred rules in `app.css` hang off that class
and give the cards and decision panels *inside* the conversation their paper.
The dispatch panel silently reverted to a pre-Task-186 card language — a 1 px
border and 22 px radius where the approved flat paper has none. Those interiors
are Slice 5's and Slice 6's. So the class stays as the interior's hook, and
`.rp-conversation` re-points the paired tokens those rules are already written
against, so the paper re-tones through the cascade instead of two hundred rules
being rewritten two slices early. The three-class selector
`.rp-conversation.chat-column.chat-column-villager` beats the old rule on
specificity rather than on source order, which a minifier may reorder.

**The stage keeps the class the main process captures by.**
`src/main/evidencecapture.ts` exports `WORKSPACE_STAGE_SELECTOR = ".workspace-stage"`
and finds the stage by that class to read the project identity off it. `src/main`
is out of this slice's scope, so renaming the element while moving the
composition would have blinded evidence capture with every other test green.
`deskcomposition.test.ts` now reads that exported selector out of the main
process and pins it to the element carrying both attributes.

**The connection is re-asked on a project switch.** Found by the E2E: switching
project left the header and the capsule reporting the *previous* project's
connection for up to two seconds, because only the poll refreshed it. Visible
before this task only in the rail's small label, and unmissable once the desk
says it in words. One added line asks again immediately.

## Checks

Run from `app/`. Every command below is the exact one run.

**`c1` — nothing of the Town, the pond or the tucked chat is mounted. PASS.**
Proved twice. In `deskcomposition.test.ts`: `PondLine.tsx` is gone and no
renderer source names it; no mounted component imports the Town, while
`TownSquare.tsx` and `TownDetail.tsx` are asserted still **present** on disk
because Slice 10 owns their deletion; no `chat-villager`, `chat-tuck` or tuck
control survives. And in the real app, `conductor.spec.ts` and
`projects.spec.ts` assert `.town-square` and `.pond-line` at **count 0** at six
widths, and the desk probe records `town: false, pond: false` on every single
observation it ever makes.

**The comment trap from the handoff caught me.** The first version of the
"nothing names PondLine" test failed on `presentation.ts`'s own comment
explaining the removal, and on three accurate comments in `Chat.tsx`. A marker
that matches a word in a comment is not testing imports — Task 257's lesson —
so every scan in that file now strips comments first, and a file may still
explain what it used to do.

**`c2` — the status and the expression come from one value. PASS.** 16 tests.
The strong one sweeps all 32 combinations of the eight runtime truths ×
`needsOwner` × `connected` and asserts that any two inputs resolving to the
same state produce the **same words, the same tone and the same face** — so a
future refactor computing the words from raw inputs breaks here rather than in
production. `activitycapsule.test.ts` proves the capsule is *handed* a resolved
presence and cannot resolve one itself, and `deskcomposition.test.ts` proves
`resolveCairnPresence` is called exactly once in the whole renderer and that
exactly one production component draws Cairn.

**Mutation-proved, not assumed.** Five deliberate defects were introduced one
at a time and every one was caught: demoting needs-owner below the runtime
truth (3 failures), giving `starting` and `working` the same words (3), making
the `checking` face unreachable (2), inventing a worker name where the runtime
says there is none (2), and letting `disconnected` outrank a real run (2).
`presence.ts` was restored byte-exact afterwards from a pre-mutation copy, and
its hash and its nine em dashes re-verified — a PowerShell read/write
round-trip had mangled them, which is the encoding hazard the handoff warns
about, hit in a new place.

**`c3` — every state the constitution names is written. PASS.** Ten distinct
written lines, no two alike, checked per state and again through the rendered
capsule. Overlaps resolve by the table: needs-owner buries nothing and is
buried by nothing; a live stream over a retained terminal outcome is already
one truth in the projection and is not re-decided; losing the connection never
rewrites what the run itself was doing. `DONE`, `STOPPED` and `ERROR` keep
their literal words, and compact dropping the detail is proved to lose no
state because the status alone carries it.

**`c4` — a stale project or run cannot paint the current project. PASS.** The
five stale-request guards are asserted present by name. In the real app, with a
worker still running in another project, switching away shows no run strip and
a settled quiet capsule **after waiting out more than a full two-second poll**,
and switching back restores the same run — compared by `startedAt`, so a
restart would fail.

**`c5` — capture identity survives. PASS.** The main-process capture selector
is read out of `evidencecapture.ts` and pinned to the element carrying
`data-project-dir` and `data-project-generation`; the generation guard is
asserted present.

**`c6` — Chat is a region, and the keyboard works. PASS.** No `role="dialog"`;
`role="region"` with its accessible name; exactly one `<main>`. The focus signal
still lands on the composer. Exactly one live region on the desk, polite and
atomic, outside any button — the retired line had to put its region outside its
own button because `role="button"` drops a nested region's role; the capsule has
no button at all, which settles it permanently. The capsule renders no
`<button>`, `<a>`, `<input>`, `tabindex` or `role="button"` in any state. Real
focus rings measured by **tabbing** in the app: solid, ≥2 px, ≥3 px offset.

**`c7` — the composition contains itself, and added no breakpoint. PASS.** In
the real app at 760×620, 819, 820, 821, 1259, 1260, 1261, 1320×820, 1320×980
and the test-only 540×900: no horizontal page scroll at any of them, header and
capsule and view stacked without overlapping, the conversation centred inside
the view, the transcript the only region that scrolls, and the connection state
never truncated. The breakpoint set across the three new sheets is asserted to
be exactly `{820, 1260}` — 820 is Slice 3's compact block and 1260 is where
`app.css` already narrows the rail. **The 1260 px pond cliff was removed and no
cliff replaced it.** The 760 px minimum window width was not lowered.

**`c8` — reduced motion, and nothing perpetual. PASS.** `workspace.css`
declares no `infinite` and starts no named animation; the only `animation:` in
it is `none`, turning off the retired panel's entrance, and a test asserts both
halves of that. In the app under `prefers-reduced-motion`, the run strip, the
capsule and the drawn Cairn all report `animation-name: none` and `0s`
durations, and the capsule is non-interactive so no transform can ever be
applied to a container holding a control.

**`c9` — measured contrast on the real composition. PASS.**

```powershell
node ./node_modules/@playwright/test/cli.js test contrast.spec.ts --output=test-results/task259-runner
# contrast: 19 elements measured, worst 5.50:1 (floor 3) on "← Project home"
```

Recomputed from the actual composited pixels via `capturePage`, not from the
stylesheet. Its root moved out from the retired conversation panel to
`.workspace-stage`, so it now covers the header and the capsule as well as the
conversation. **What it does not reach is recorded under "Limitations".**

**`c10` — Slice 3's isolation guard now says what it is meant to say.
PASS. Disposition: Rewritten.** Slice 3's three `c8` tests proved `.rp-` reached
*nothing*; that is the wrong guard the moment the foundation is consumed. Left
alone, the first would have kept passing while meaning nothing and the third
would have failed for behaviour that is now correct. Restated as the four things
that must still be true: every selector in the new sheets is **anchored** on an
`.rp-` class, so a rule may reach an old class name only inside a surface that
opted in; `app.css` still declares no `.rp-` selector, so Slice 10 can delete one
cascade without reading the other; production markup **does** now carry `rp-`
classes, which is the positive control that stops the anchor guard silently
reverting to guarding a stylesheet nobody uses; and custom properties may be
declared only inside an `.rp-`-anchored rule, because a scoped re-point cannot
recolour the app the way a `:root` declaration can. A breakpoint census over the
same three sheets was added.

**`c11` — the app compiles, builds and tests as it did. PASS.**

```powershell
npm.cmd run typecheck    # clean
npm.cmd run test:unit    # 1034 tests, 1023 pass, 9 fail, 2 skipped
npm.cmd run build:vite   # built
npm.cmd run build:lab    # built
node --test dist-unit/tests-unit/residentprogramboard.test.js          # 22/22
node --test tests-qualification/resident-program-bundle-dark.test.mjs  # 3/3
node --test tests-qualification/builder-proposal-bundle-dark.test.mjs  # 1/1
```

Against the 997 / 986 / 9 / 2 baseline the **failure set is byte-identical** —
the same nine pre-existing failures in `builderlivetransport.test.js` and
`buildertrackedtext.test.js`. Net +37 tests: +42 new, −6 from the deleted pond
suite (two of its eight tests were moved, not dropped), +2 in `visualtokens`,
−1 in `activityrender`.

**A stale build artifact briefly told a lie.** An intermediate run reported 13
failures including four pond tests, because `tsc` does not delete outputs for
removed sources and `dist-unit/tests-unit/pondline.test.js` was still there.
`dist-unit` is gitignored and holds no tracked file — both verified before
removing it — and the count settled at 1034 / 1023 / 9 / 2 afterwards.

**`c12` — targeted E2E under the exact mutex protocol. PASS, with four scenarios
green that were red before and one still red.** Both token locations
(`%TEMP%\cairn-app-token` and `app/.app-token`) were absent, created by this run,
recorded, and released at the end — only the two this run created. One
invocation per scenario, `workers: 1`, `--output=test-results/task259-runner`.

| Scenario | Result |
|---|---|
| `projects.spec.ts` (whole file, 7 tests) | **7 passed** |
| conductor · a dispatched run lives in the conversation | **passed** |
| conductor · reduced motion reaches the same stable written state | **passed** |
| conductor · a stopped run posts an honest STOPPED card | **passed** |
| conductor · a worker's claims render only inside the card | **passed** |
| conductor · a waiting decision is announced in words | **passed** |
| `contrast.spec.ts` | **passed** |
| conductor · a reload mid-run reattaches | **still failing** — `.run-strip` stuck in `Check`, the documented pre-existing symptom, untouched by this task |

`q9.spec.ts` and `evidence.spec.ts` were **not** run to completion: the first
exceeded a ten-minute shell limit and I did not restart it. Both read only
`.workspace-stage` and `data-project-dir`, which this task deliberately
preserved and `c5` pins, but that is an argument rather than a run, and it is
recorded here as a gap rather than claimed as a pass.

**`c13` — Owner gate 2. APPROVED.** Thirteen real production screenshots from
the built app, in `app/shots/task259-gate/`: ready, responding, needs-owner,
working, DONE and STOPPED at 1320×980; empty, working, needs-owner and STOPPED
at the supported minimum 760×620; empty, working and needs-owner at the
test-only 540×900 stress. The owner was asked about scale, calmness, hierarchy
and whether Cairn feels present but small. **Verdict, verbatim: "Approved".**

They live in `shots/` and not `test-results/` for a reason found the hard way:
Playwright cleared `test-results` **whole** during this task, taking Task 229's
and Task 255's untracked evidence with it despite `--output` naming a
subdirectory. Both were restored byte-exact from a backup taken before the first
run — `task229-builder-proposal-review.png` is 696,088 bytes, SHA-256
`C692EC68…FBEA69`, unchanged, and `task255-board` holds its 19 captures.
`shots/` is gitignored, is the owner's existing review directory, and nothing
clears it.

**`c14` — no dependency, no external action. PASS.** No install, provider or
model call, credential, paid call, network or external-service write, push,
publication or deployment. Every worker in every E2E run was the fake Codex
shim; every conductor was the local fixture or the mock. No `.cairn` data read,
written or deleted.

**`c15` — records and Git protection. PASS.** Brief committed alone at
`63e4c70`; the completion commit stages only this task's exact paths, by name.
Nothing cleaned, stashed, reset, broadly staged or rewritten. No registered
worktree was created, deleted, reused, reset or moved.

## Dispositions for every old test that moved

- **`pondline.test.ts` — Replaced (deleted).** Its truth and precedence
  coverage is in `cairnpresence.test.ts` (including "a waiting decision
  outranks everything else, exactly as the pond's line did"), its live region
  in `activitycapsule.test.ts`. Its two `townShore` tests were **moved intact**
  into `townlayout.test.ts`, because they were about the Town's shore rather
  than the pond and Slice 10 should decide their fate. Its `app.css` breakpoint
  census is duplicated by `evidencepresentation.test.ts`, which already allows
  exactly `{620, 621, 820, 1260}`.
- **`activityrender.test.ts` — Replaced in part.** The 32 `PondLine` sections
  and the test that read their tone and words are gone with the component. **The
  18 TownSquare hashes are unchanged byte for byte**, proved by Git rather than
  by claim: `git diff --numstat` on the golden reports `0 32` — thirty-two
  deletions, zero insertions. Its new SHA-256 is
  `D9D957F2613B078BF73DEE09C7E911DDEAB66D62E6E4AB26AB7A95C2DEE5B977`.
- **`activitypresentation.test.ts` — Preserved.** One assertion updated exactly
  as its own comment instructed: the scenic-export allowlist goes from the three
  pond names to empty.
- **`visualtokens.test.ts` — Rewritten.** See `c10`.
- **`conductor.spec.ts` — Rewritten and Replaced.** The Town motion probe is
  replaced by a desk activity probe that records what the capsule *says* and
  which face is drawn beside it, and asserts on every observation that the two
  agree. Roughly 150 lines of Town-only affordances are **Replaced with
  nothing**, disclosed: dragging a villager, its saved fractional position
  surviving a reload, a legacy far-shore point clamped across the old cliff,
  "Reset layout", the villager's focus ring and detail panel, and the task
  thread. None has a successor — there is nothing on the desk to drag. The
  stored data is untouched and `townstore.test.ts` still covers it. What could
  not be dropped was kept and rewritten: project isolation, reduced motion, and
  a real keyboard focus ring on a control the desk actually has. The tucked-chip
  test became "a waiting decision is announced in words", which is Task 155's
  rule checked on the surface that now carries it.
- **`projects.spec.ts` — Rewritten.** The dialog is a region, the town regions
  are the desk title, and the pond-line-replaces-the-header assertion is the
  desk's one header at every width.
- **`contrast.spec.ts` — Repointed.** Root widened from the retired panel to
  the whole stage.

## Two pre-existing defects found and fixed, both disclosed

Neither is this slice's work; both were in the way, and leaving them would have
handed the next slice a red to re-diagnose.

**`projects.spec.ts` clicked a button that does not exist.**
`getByRole("button", { name: "Open project" })` matched nothing: the rail's
button carries `aria-label="Open a project"`, which wins over its content, and
Playwright's `name` is a case-insensitive **substring** match — "open project"
is not a substring of "open a project". Collapsed, which is the rail's default,
the button has no text child at all. Verified pre-existing rather than assumed:
`git grep` at `19e7584` shows the identical test line and the identical
`aria-label`, and the rail's collapsed default is unchanged.

**One of the four "run cannot reach DONE" reds was an unanswered owner pause.**
`a worker's claims render only inside the card's claims block` stalls at the
unsealed-candidate pause — "Continue to Cairn's current checks" — which the
product grew *after* that test was written, so it waited forever for a card the
runtime was deliberately holding back. The page snapshot shows the run strip
stuck at `Check` with the pause on screen, which is exactly the symptom the
handoff records. Answering the pause is what the test always meant to do, and
the unsealed-candidate suite already answers the same pause the same way. It
now passes, and it is what produced the gate's DONE screenshot.

The STOPPED-card scenario the handoff listed as red also passes now, and I will
not claim credit for that: the assertion that was failing there polled the
**Town Cairn's face stroke**, and the rewrite necessarily removed it.

## How to try it

```powershell
cd "C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework\app"
npm start
```

The desk opens on the conversation. The header names the project and says
whether Cairn is connected; the capsule under it says what he is doing, with
one small Cairn beside the words. Narrow the window past 820 px and the project
name and the activity detail drop while the state and the connection stay. Send
Cairn a request that becomes a proposal and watch the capsule turn to
"Needs your decision" without anything needing to be opened. The screenshots
the gate was judged on are in `app/shots/task259-gate/`.

## Limitations and remaining judgment

- **The inside of the conversation is still the retired lantern's, re-toned.**
  Cards, panels, prose, composer and follow-ups keep their Task 186–197
  structure on warm paper. That is Slice 5's and Slice 6's work, and it is why
  `chat-column-villager` is still on the element.
- **The contrast sweep does not reach the decision surfaces.** Its lane runs
  with no conductor connection, so the conversation shows its connect card and
  no task card, dispatch panel or result card is on the paper to measure. That
  was true before this task too. An attempt to drive a real proposal into it
  failed — reaching one needs a connected conductor fixture, which is
  `conductor.spec.ts`'s machinery. **In the needs-owner gate capture the task
  card's primary control looks low-contrast to my eye and is unmeasured.**
  Slice 6 should bring these surfaces under that measurement and start there.
- **`q9.spec.ts` and `evidence.spec.ts` were not run to completion.** Recorded
  under `c12` as a gap, not a pass.
- **One E2E scenario stays red** (`a reload mid-run reattaches`), with the
  documented pre-existing symptom, and the Windows worker-teardown `EPERM`
  remains intermittent — it failed one reduced-motion run whose assertions had
  all passed, and the rerun was clean.
- **The activity cue machinery is now dead but present.** `activeCue`,
  `queuedCues` and the timer that advances them drive nothing the owner can see;
  the capsule reads `truth` alone. `activityrender.test.ts` still exercises them
  through the unmounted Town. Slice 10 should remove them with it.
- `activityStatus` still says "Town is quiet." It is read by `TownSquare`
  alone, which nothing mounts, and Slice 10 deletes both.
- **A rail identity mark and a header connection state both exist.** The rail's
  "C" monogram keeps the connected/paused dot it already had, so the connection
  is stated in two places. Both read the same `ConductorStatus`, so they cannot
  disagree, and the rail's identity block is Slice 8's.
- The 44 × 44 target floor is declared in `surfaces.css` and still measured
  only on the lab board's own controls; `.rp-control` is not yet rendered on the
  desk.
- The milestone did not move.

Slice 5 was not begun in this conversation. The handoff has been refreshed for
it.

**Disposition: DONE**
