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
| 2 — Extract neutral activity truth with no visible change | **DONE** | Task 257, commit `91b087e`. E2E partial, shortfall proved pre-existing |
| 3 — Semantic foundations and CairnProgram primitive | **DONE** | Task 258 |
| 4 — Chat-first workspace and Town/Pond retirement | **NEXT** | **Owner gate 2 falls at its end** — the first owner judgment since Slice 1 |
| 5 — Core conversation surface | not started | |
| 6 — Questions, proposals, approvals, operational papers | not started | |
| 7 — Running, results, evidence, history, publication | not started | **Owner gate 3** at its end |
| 8 — Welcome, projects, Dashboard, Settings, support | not started | |
| 9 — Compact desktop and phone parity | not started | |
| 10 — Retire obsolete Town/Pond implementation | not started | |
| 11 — Whole-app qualification and final verdict | not started | **Owner gate 4** at its end |

## What Slice 4 inherits

**The foundation exists and nothing consumes it.** Slice 3 added, in production:

- `src/renderer/tokens.css` — 61 `--rp-*` semantic tokens, appended. Theme
  variation rides in `light-dark()`, so each colour is declared **once**; only
  five non-colour tokens (two shadows, an opacity, a blend mode) carry explicit
  dark and System blocks, and a test compares those two token for token.
- `src/renderer/surfaces.css` — paper, ink, type, `.rp-control`, focus,
  semantic grounds.
- `src/renderer/workspace.css` — `.rp-desk`, rail, header, `.rp-transcript`,
  `.rp-activity`, `.rp-composer`, `.rp-scroll-x`, and the compact rules at the
  existing 820 px breakpoint.
- `src/renderer/components/CairnProgram.tsx` — the shipped Cairn, nine states,
  `size` = the amber pane's height, `variant="mark"` for chrome.
- `motion.css` — `rp-arrive` and `rp-settle`, both ending at `transform: none`,
  both re-killed under `prefers-reduced-motion`.

**Every new selector is `.rp-`-prefixed and a test enforces it.** That is what
made Slice 3 safe to land alone. Slice 4 is where that stops being true, because
it puts `rp-` classes onto real markup — so from Slice 4 on, "nothing visible
changed" is no longer the deliverable and those guards change meaning.

**The old aliases are all still there and still consumed.** `tokens-baseline.golden.txt`
pins all 110 pre-Slice-3 tokens byte-exact. Slice 4 migrates surfaces onto the
new system; do not delete a garden/lantern/town token until nothing reads it.

**The lab board draws the shipped component.** `lab/resident-program.tsx` imports
`CairnProgram` and `cairn-program.css` from `src/` and nothing else. The
direction is one-way and enforced: production must never import from `lab/`.

## Inherited hazards — read before starting Slice 4

1. **Three known-red E2E scenarios on `main`, none caused by the overhaul.**
   `conductor.spec.ts:3314` (carried since brief 243), plus `:3204` (reduced
   motion) and `:3466` (reattachment), which Task 257 proved pre-existing by
   rebuilding the renderer at `HEAD`. Pattern: scenarios that stop a run early
   pass; scenarios needing a run to reach verified DONE fail with `.run-strip`
   stuck in `Check`. **Slice 4 edits `conductor.spec.ts`, so expect to work
   around these rather than fix them.**
2. **Nine known-red app unit tests** in `builderlivetransport.test.js` and
   `buildertrackedtext.test.js`. Baseline to diff against is now
   **997 / 986 / 9 / 2**. Diff the failure SET, never the count.
3. **A test whose marker matches a word in a comment is not testing imports.**
   Task 257 turned `resident-program-bundle-dark.test.mjs` red just by naming
   the overhaul in a header comment, and Slice 2's checks never ran that file.
   Run every qualification your change could touch, not only the ones your plan
   section lists.
4. **The root `playwright.config.ts` declares no `outputDir`**, so it defaults to
   `test-results` and Playwright clears that directory at the start of every
   run. Pass `--output=test-results/taskNNN-runner` on every invocation.
5. **`app/test-results/` holds untracked, gitignored evidence** —
   `task229-builder-proposal-review.png`, `task255-board/`. Back it up before
   running Playwright. **The board's screenshots are NOT byte-reproducible:**
   two consecutive runs of identical code differ in 15 of 19, so never treat a
   screenshot hash as a no-change baseline. Measure instead.
6. **`playwright.cmd` fails from Git Bash** because the repository path contains
   a space. Use `node ./node_modules/@playwright/test/cli.js test …`.
7. **The Windows worker-teardown `EPERM`** aborts batched Playwright runs. Run
   one invocation per scenario so a teardown cannot cascade.
8. **Never spell a control character as a `\u` escape in source** — the editing
   tools and the shell both turn it into the raw invisible byte. Build it from
   its code point.
9. Task 255's board config takes **no app token** (no `globalSetup`, never
   launches Electron). Slice 4's Electron E2E **does** need both token
   locations.

## Start prompt for Slice 4

Copy everything inside the fence into a fresh Cairn/Codex conversation.

```text
Work on: Slice 4 of Cairn's resident-program visual overhaul — the chat-first
workspace, and retiring the Town and Pond from the visible app.

Authority: docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md
Read its Slice 4 section, section 2 (the approved visual constitution), section
3 (product truth that must survive — all fifteen items), section 4 (migration
seams) and section 6 (global execution rules) completely. Then read
docs/superpowers/specs/2026-08-13-cairn-resident-program-visual-design.md
section 7, which is the composition this slice implements.

Slices 1-3 are DONE. Read docs/ai-work/tasks/258-report.md and the "What Slice 4
inherits" and "Inherited hazards" sections of
docs/ai-work/HANDOFF-resident-program-visual-overhaul.md before starting.

Start conditions — verify each, do not assume:

1. Project root: C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework
2. main is clean and between tasks.
3. Task 258's report says Disposition: DONE.
4. Claim the LOWEST genuinely free task number. List docs/ai-work/tasks/ across
   the main checkout, EVERY registered worktree, and EVERY local branch. Any
   filename beginning with a number takes it, including a report with no brief.
   Do not trust a number quoted in any document, including this one. Commit the
   brief ALONE to claim your number.
5. Ask the owner to confirm Lane A is free.
6. Know what else is queued. At the time of writing, lane/h holds Task 254 as
   DONE and UNLANDED — two commits ahead of main and eight behind. Re-derive
   with `git rev-list --count main..lane/h`; it will be stale.

Do not create, delete, reuse, reset or move any registered worktree.

THIS SLICE CHANGES WHAT THE OWNER SEES. That inverts Slices 2 and 3, whose
deliverable was that nothing moved:

- Slice 3's guard that every `.rp-` selector reaches nothing is about to stop
  being true on purpose. Update it to mean what you now intend, and say so.
- "No visible change" is no longer the finish line. The finish line is the
  approved composition: slim rail, quiet header, centered conversation paper,
  ONE small Cairn presence, and a non-interactive written activity capsule.
- OWNER GATE 2 FALLS AT THE END OF THIS SLICE. It is the first owner judgment
  since Slice 1, and taste-dependent DONE requires it. Present real production
  screenshots or the running app in empty, responding, needs-owner, working,
  DONE and STOPPED states at wide, at the supported minimum 760x620, and at the
  test-only 540x900 containment stress. Ask about scale, calmness, hierarchy,
  and whether Cairn feels present but small. DO NOT PROCEED ON ASSUMED APPROVAL,
  and do not lower the 760 px minimum window width.

Work, in the plan's order:

1. Preserve Workspace's active project, polling, capture identity attributes,
   the project-generation guard, view routing and the Chat focus signal. These
   are behaviour, not scenery, and Slice 2's tests exist to catch you.
2. Add ONE pure CairnPresenceState combiner resolving the neutral runtime truth
   from activity/presentation.ts together with Chat's needs-owner seam. Written
   status and expression must derive from the SAME resolved value — two
   independent answers to "is something waiting?" would eventually disagree, and
   the line would be the one that lied. Cover overlapping streaming, needs-owner,
   terminal, stale-project and disconnected inputs, plus project switch.
3. Make Chat a main region/section rather than a permanently mounted dialog.
4. Replace the 1260 px pond-open state with deliberate chat-first responsive
   composition. Do not introduce another breakpoint cliff.
5. Leave the Town files and the persistence code present but unused. Slice 10
   deletes them. Never delete or transform an owner's .cairn/town-square.json.

Delete PondLine.tsx and pondline.test.ts only AFTER their truth, live-region and
focus coverage has moved. Stop mounting TownSquare; do not delete it.

Checks: no mounted Town/Pond/tucked DOM; written idle/ready plus working,
checking, needs-owner, DONE, STOPPED and error; a project-switch stale-event
test; a capture-bound identity test; keyboard focus; overflow at every desktop
size in the plan's matrix; reduced motion; contrast; and targeted E2E under the
mutex. Run from app/: npm.cmd run typecheck, npm.cmd run test:unit,
npm.cmd run build:vite, npm.cmd run build:lab, plus the board suites — Slice 3
proved a qualification can go red from a comment, so run the ones your change
could touch even if the plan does not list them.

Diff the unit failure SET against 997 / 986 / 9 / 2, never the count.

Boundaries. No dependency install, provider or model call, credential use, paid
call, external service write, push, publication or deployment. Protect every
tracked, staged, modified and untracked path, including untracked evidence under
app/test-results/. Stage by exact name; never clean, stash, reset, broadly
stage, or rewrite history. Subagents may perform read-only audits, but only one
task and one writer may change this repository at a time.

STOP if runtime behaviour cannot be preserved through the composition change, if
a stale project or run can paint the current project, or if the owner's gate-2
verdict is anything other than approval.

Close with a truthful report naming every file touched and every check's real
result, one LOG row, and one exact-path completion commit as DONE or STOPPED
under AGENTS.md. Record the owner's gate-2 words verbatim. Then refresh this
handoff for Slice 5. Do not begin Slice 5 in that conversation.
```

## Required reading for any slice

- `AGENTS.md` and `docs/ai-work/PROJECT.md`
- the saved plan, the design spec, and the preceding slice's report
- the complete Git status, and the current files themselves rather than
  historical line numbers
