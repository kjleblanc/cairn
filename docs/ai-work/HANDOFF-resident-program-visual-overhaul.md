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
| 2 — Extract neutral activity truth with no visible change | **NEXT** | prompt below |
| 3 — Semantic foundations and CairnProgram primitive | not started | |
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
approved references under `docs/visual-reference/`. Its tokens are a **proposal**
and are deliberately not yet in `src/renderer/tokens.css` — promoting them is
Slice 3's job, and Slice 3 must preserve the old aliases while unmigrated
surfaces still consume them.

## Start prompt for Slice 2

Copy everything inside the fence into a fresh Cairn/Codex conversation.

```text
Work on: Slice 2 of Cairn's resident-program visual overhaul — extract neutral
activity truth with no visible change.

Authority: docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md
Read its Slice 2 section, section 3 (product truth that must survive), section 4
(migration seams), and section 6 (global execution rules) completely.

Slice 1 closed DONE at commit d9df42d (Task 255) and was approved at Owner gate
1. Read docs/ai-work/tasks/255-report.md before starting — its "Limitations" and
its three disclosed defects are your inherited hazards.

Start conditions — verify each, do not assume:

1. Project root: C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework
2. main is clean and between tasks.
3. Task 255's report says Disposition: DONE.
4. Claim the LOWEST genuinely free task number. List docs/ai-work/tasks/ across
   the main checkout, EVERY registered worktree, and EVERY local branch. Any
   filename beginning with a number takes it, including a report with no brief.
   Do not trust a number quoted in any document, including this one: the handoff
   that started Slice 1 named a number that was 25 short by the time it ran.
   Commit the brief ALONE to claim your number.
5. Ask the owner to confirm Lane A is free. Git cannot prove human lane
   availability, and a registered worktree's existence proves nothing.
6. Know what else is queued. At the time of writing, lane/h holds Task 254 as
   DONE and UNLANDED — two commits ahead of main, four behind. It is waiting for
   main to be between tasks so it can land. Landing is serial and first-ready
   first-landed, so if lane/h lands while you are mid-task, re-sync main into
   your work only BETWEEN tasks, never mid-task. Re-derive this yourself with
   `git rev-list --count main..lane/h`; it will be stale.

Do not create, delete, reuse, reset or move any registered worktree.

THIS SLICE EDITS PRODUCTION CODE. That inverts Slice 1, which was forbidden to
touch app/src/**. Three postures change here:

- You will edit app/src/** for the first time in this overhaul.
- Your Playwright scenarios DO need the app-token mutex. Slice 1's did not.
- There is NO owner gate in this slice. Owner gate 2 falls at the end of Slice 4.
  Do not ask the owner to approve a look; ask only at a real risk boundary.

Visible finish line: the running app looks EXACTLY as it does now, while its
truthful runtime state stops living in a Town-named module, and a neutral
activity projection can drive Cairn and written status without worker scenery.
"No visible change" is the deliverable, not a side effect.

Work, in this order:

1. Characterize app/src/renderer/town/presentation.ts BEFORE changing anything.
   Capture its current behaviour as tests that pass against today's code. Those
   characterization tests are the real deliverable; the new module is the easy
   half.
2. Create app/src/renderer/activity/presentation.ts and
   app/tests-unit/activitypresentation.test.ts.
3. Move consumers to it: app/src/renderer/screens/Workspace.tsx,
   app/src/renderer/components/TownSquare.tsx,
   app/src/renderer/components/PondLine.tsx, and app/tsconfig.unit.json.
4. Separate truth fields from Town-only flight and landing positions WITHOUT
   changing the rendered Town yet.
5. Delete app/src/renderer/town/presentation.ts and
   app/tests-unit/townpresentation.test.ts in the SAME task, only after every
   import and characterization has moved.
6. Touch app/tests-unit/pondline.test.ts only to change its import. Its outgoing
   visual contract stays until Slice 4.

Preserve, and prove you preserved: monotonic snapshots, repeated-activity
deduplication, dispatch/return/terminal cue ordering, stale-timer inertness,
STOPPED to ERROR escalation, terminal settlement, new-run reset, commentary over
a terminal result, reduced-motion semantic equality, current DOM and CSS, Town
visuals, project switching, capture identity, poll intervals, and focus.

Checks. Run from app/:
  npm.cmd run typecheck
  npm.cmd run test:unit
  npm.cmd run build:vite
then mutex-protected focused Playwright for run state, reattachment, STOPPED,
ERROR and reduced motion, named in your brief. Keep workers: 1 — it protects the
owner's real conductor connection and is not a performance preference. Acquire
every required token location atomically (currently the OS-temp cairn-app-token
and repository-local app/.app-token where the harness requires both), track what
YOU created, and release only that, in finally. If acquisition fails, wait.
Never remove a token another lane or the owner holds.

Also required: causal state-transition tests, source mutants for stale snapshots
and terminal regression, and a rendered no-visible-change assertion with
controlled fonts, timers and motion wherever pixels are compared. Add no
mutation-test framework and no dependency.

Three hazards Task 255 created or hit. Do not repeat them:

- Any new Playwright config MUST declare its own outputDir. Playwright clears
  that directory at the start of every run and the default is the shared
  test-results; Task 255 destroyed Task 229's cited screenshot that way, and the
  original was gitignored and is unrecoverable.
- Never round-trip a source file through PowerShell Get-Content/Set-Content. It
  double-encodes non-ASCII and can empty the file. Use the editing tools, and
  use a BOM-free file for any git message written from PowerShell.
- Re-run a test after you edit it. Task 255 shipped an edited assertion that had
  never been run and was passing for the wrong reason; the full suite caught it.

Boundaries. No dependency install, provider or model call, credential use, paid
call, external service write, push, publication or deployment. Never delete or
transform an owner's .cairn/town-square.json. Protect every tracked, staged,
modified and untracked path, including untracked evidence under
app/test-results/. Stage by exact name; never clean, stash, reset, broadly
stage, or rewrite history. Subagents may perform read-only audits, but only one
task and one writer may change this repository at a time.

STOP if truth cannot be separated without changing runtime semantics, or if a
stale project or run can paint the current project.

Close with a truthful report naming every file touched and every check's real
result, one LOG row, and one exact-path completion commit as DONE or STOPPED
under AGENTS.md. Then refresh this handoff for Slice 3. Do not begin Slice 3 in
that conversation.
```

## Required reading for any slice

- `AGENTS.md` and `docs/ai-work/PROJECT.md`
- the saved plan, and the preceding slice's report
- the complete Git status, and the current files themselves rather than
  historical line numbers
