# Handoff — Cairn resident-program visual overhaul

**This file always starts the NEXT unfinished slice.** It is refreshed when a
slice closes, so if the ledger below disagrees with `git log`, trust `git log`
and refresh this file before working from it.

**Execution authority:** `docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`.
This file is orientation plus a copy-ready start prompt; the plan decides.

## Where the overhaul stands

| Slice | State | Evidence |
|---|---|---|
| 1 — Visual constitution and owner-approved system board | **DONE** | Task 255, commit `d9df42d`. Owner gate 1 approved 2026-08-16: *"Looks amazing. Passes all questions."* |
| 2 — Extract neutral activity truth with no visible change | **DONE** | Task 257. No owner gate. E2E partial — see below |
| 3 — Semantic foundations and CairnProgram primitive | **NEXT** | prompt below |
| 4 — Chat-first workspace and Town/Pond retirement | not started | **Owner gate 2** falls at its end |
| 5 — Core conversation surface | not started | |
| 6 — Questions, proposals, approvals, operational papers | not started | |
| 7 — Running, results, evidence, history, publication | not started | **Owner gate 3** at its end |
| 8 — Welcome, projects, Dashboard, Settings, support | not started | |
| 9 — Compact desktop and phone parity | not started | |
| 10 — Retire obsolete Town/Pond implementation | not started | |
| 11 — Whole-app qualification and final verdict | not started | **Owner gate 4** at its end |

Slice 1 produced the written visual constitution at
`docs/superpowers/specs/2026-08-13-cairn-resident-program-visual-design.md`, the
lab board at `app/lab/resident-program.{html,tsx,css}`, and the two hash-checked
approved references under `docs/visual-reference/`. Its `--rp-*` tokens are a
**proposal** and are still not in `src/renderer/tokens.css` — promoting them is
Slice 3's job.

Slice 2 replaced `app/src/renderer/town/presentation.ts` with
`app/src/renderer/activity/presentation.ts`. Both it and
`app/tests-unit/townpresentation.test.ts` are deleted. The projection is
reached through `hydrateActivityPresentation`, `observeActivityPresentation`,
`advanceActivityCue`, `settleActivityPresentation`, `activityStatus` and
`activityRunKey`, over `ActivityPresentation` / `ActivityCue` / `ActivityEvent`.
Two committed goldens guard it: a step-by-step reducer transcript
(`app/tests-unit/activity-transcript.golden.txt`) and per-section render hashes
(`app/tests-unit/activity-render.golden.txt`), both generated from the OLD
module before it was deleted.

## Inherited hazards — read before starting Slice 3

1. **Three known-red E2E scenarios on `main`, none caused by the overhaul.**
   `conductor.spec.ts:3314` (carried in briefs 243–252), plus two Task 257
   recorded by rebuilding the renderer at `HEAD` and watching them fail
   identically: `a fresh confirmed dispatch reaches the same stable Town with
   reduced motion and no transient packet` (3204) and `a reload mid-run
   reattaches the conversation's strip and shows the finished state there`
   (3466). Pattern: scenarios that stop a run early pass; scenarios needing a
   run to reach verified DONE fail, with `.run-strip` stuck in `Check`.
2. **Nine known-red app unit tests**, all in `builderlivetransport.test.js` and
   `buildertrackedtext.test.js`. Baseline to diff against is now
   **970 / 959 / 9 / 2**. Diff the failure SET, never the count.
3. **The root `playwright.config.ts` declares no `outputDir`**, so it defaults
   to `test-results` and Playwright clears that directory at the start of every
   run. Pass `--output=test-results/taskNNN-runner` on every invocation, or
   declare `outputDir` in any new config. Task 255 destroyed Task 229's cited
   screenshot this way and it was gitignored and unrecoverable.
4. **`app/test-results/` holds untracked, gitignored evidence** —
   `task229-builder-proposal-review.png`, `task255-board/` (19 screenshots).
   Git cannot restore it. Back it up before running Playwright.
5. **Never round-trip a source file through PowerShell `Get-Content`/
   `Set-Content`.** It double-encodes non-ASCII and can empty the file. Also
   note that the editing tools and the shell both silently convert a `\u`
   escape in a string literal into the raw control byte — Task 257 hit this on
   the run-key separator and replaced it with `String.fromCharCode(31)`.
6. **Re-run a test after you edit it.** Task 255 shipped an edited assertion
   that had never been run.
7. **`playwright.cmd` fails from Git Bash** because the repository path contains
   a space. Use `node ./node_modules/@playwright/test/cli.js test …`, or run it
   from PowerShell.
8. **The Windows worker-teardown `EPERM`** on profile cleanup aborts batched
   Playwright runs (~190 stale `cairn-e2e-profile-*` dirs in `%TEMP%` since
   2026-07-30, not ours — leave them). Run one Playwright invocation per
   scenario so a teardown cannot cascade.

## Start prompt for Slice 3

Copy everything inside the fence into a fresh Cairn/Codex conversation.

```text
Work on: Slice 3 of Cairn's resident-program visual overhaul — semantic
foundations and the CairnProgram primitive.

Authority: docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md
Read its Slice 3 section, section 2 (the approved visual constitution, which is
what you are implementing), section 3 (product truth that must survive),
section 4 (migration seams) and section 6 (global execution rules) completely.

Slice 2 closed DONE at Task 257. Read docs/ai-work/tasks/257-report.md before
starting — its "Limitations" and its `c8` shortfall are your inherited hazards,
and docs/ai-work/HANDOFF-resident-program-visual-overhaul.md lists eight more.

Start conditions — verify each, do not assume:

1. Project root: C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework
2. main is clean and between tasks.
3. Task 257's report says Disposition: DONE.
4. Claim the LOWEST genuinely free task number. List docs/ai-work/tasks/ across
   the main checkout, EVERY registered worktree, and EVERY local branch. Any
   filename beginning with a number takes it, including a report with no brief.
   Do not trust a number quoted in any document, including this one. Commit the
   brief ALONE to claim your number.
5. Ask the owner to confirm Lane A is free. Git cannot prove human lane
   availability, and a registered worktree's existence proves nothing.
6. Know what else is queued. At the time of writing, lane/h holds Task 254 as
   DONE and UNLANDED — two commits ahead of main and six behind, waiting for
   main to be between tasks. Landing is serial and first-ready first-landed, so
   if lane/h lands while you are mid-task, re-sync main into your work only
   BETWEEN tasks, never mid-task. Re-derive with
   `git rev-list --count main..lane/h`; it will be stale.

Do not create, delete, reuse, reset or move any registered worktree.

What changes in posture from Slice 2:

- Slice 2's deliverable was that NOTHING visible changed. This slice adds real
  production tokens, CSS and a component — but the production workspace
  composition is NOT yet swapped, so the app should still look essentially as
  it does. Swapping composition is Slice 4.
- You must PRESERVE the old token aliases and their existing computed values
  while unmigrated surfaces still consume them. A foundation task must not
  silently recolor the rest of the app before its surface slice.
- There is still NO owner gate. Owner gate 2 falls at the end of Slice 4. Bring
  the owner a rendered surface only at a real risk boundary.

Visible finish line: approved tokens, type, focus, controls, paper materials,
motion primitives and CairnProgram exist as reusable production components and
stay demonstrated in the lab, with the production composition untouched.

Work, in the plan's order:

1. Add semantic roles — desk field/chrome, paper/raised paper, ink/muted,
   hairline/focus, Cairn amber/teal/seam, info/attention/success/stop, depth.
2. Preserve every old alias and its current computed value.
3. Remove the forced-night assumption from new components; do NOT delete old
   garden tokens.
4. Implement the approved state geometry as ONE decorative SVG with
   aria-hidden="true" and focusable="false". It has no announced name or state;
   textual labels remain the sole announced truth.
5. Consolidate reduced-motion behaviour for new components and remove motion
   specificity traps.

Exact paths, from the plan: modify app/src/renderer/tokens.css,
app/src/renderer/main.tsx, app/src/renderer/motion.css,
app/src/renderer/components/Ui.tsx, the Slice 1 lab files, and
app/tsconfig.unit.json. Create app/src/renderer/workspace.css,
app/src/renderer/surfaces.css, app/src/renderer/cairn-program.css,
app/src/renderer/components/CairnProgram.tsx,
app/tests-unit/cairnprogram.test.ts and app/tests-unit/visualtokens.test.ts.
If you find a consumer the list does not name — Slice 2 found
app/lab/chatmock-view.tsx that way — handle it and disclose it rather than
trusting the list.

Preserve: theme persistence, existing surfaces, safe Markdown, control
callbacks, no new dependency, and no runtime import from @cairn/core into the
renderer.

Checks. Run from app/:
  npm.cmd run typecheck
  npm.cmd run test:unit
  npm.cmd run build:lab
  npm.cmd run build:vite
plus the Slice 1 browser board config updated to import the production
primitive WITHOUT making the page reachable from production. Cover token
completeness, explicit theme renders, measured contrast recomputed from the
stylesheet's own values (Slice 1 proved pinned numbers hide failures),
focus and non-text contrast, the SVG's accessible treatment, a
finite/no-infinite-motion source check, and reduced-motion final-state
equality.

Diff the unit failure SET against the baseline, never the count. The baseline
is 970 tests / 959 pass / 9 fail / 2 skipped, and all nine failures sit in
builderlivetransport.test.js and buildertrackedtext.test.js.

If you run Playwright: keep workers: 1, hold both token locations (the OS-temp
cairn-app-token and repository-local app/.app-token), acquire atomically, track
what YOU created and release only that in a finally, and wait rather than
remove anyone else's. Pass --output=test-results/taskNNN-runner on EVERY
invocation. Run one invocation per scenario. Back up app/test-results/ first.

Boundaries. No dependency install, provider or model call, credential use, paid
call, external service write, push, publication or deployment. Never delete or
transform an owner's .cairn/town-square.json. Protect every tracked, staged,
modified and untracked path, including untracked evidence under
app/test-results/. Stage by exact name; never clean, stash, reset, broadly
stage, or rewrite history. Subagents may perform read-only audits, but only one
task and one writer may change this repository at a time.

STOP if the new foundation cannot be added without recoloring an unmigrated
surface, or if theme persistence or an existing surface would change.

Close with a truthful report naming every file touched and every check's real
result, one LOG row, and one exact-path completion commit as DONE or STOPPED
under AGENTS.md. Then refresh this handoff for Slice 4 — and note that Slice 4
ends at Owner gate 2, the first owner judgment since Slice 1. Do not begin
Slice 4 in that conversation.
```

## Required reading for any slice

- `AGENTS.md` and `docs/ai-work/PROJECT.md`
- the saved plan, and the preceding slice's report
- the complete Git status, and the current files themselves rather than
  historical line numbers
