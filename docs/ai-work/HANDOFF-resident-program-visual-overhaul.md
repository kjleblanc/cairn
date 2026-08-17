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
| 4 — Chat-first workspace and Town/Pond retirement | **DONE** | Task 259. Owner gate 2 approved 2026-08-17: *"Approved."* |
| 5 — Core conversation surface | **NEXT** | No owner gate; the next is Owner gate 3 at the end of Slice 7 |
| 6 — Questions, proposals, approvals, operational papers | not started | |
| 7 — Running, results, evidence, history, publication | not started | **Owner gate 3** at its end |
| 8 — Welcome, projects, Dashboard, Settings, support | not started | |
| 9 — Compact desktop and phone parity | not started | |
| 10 — Retire obsolete Town/Pond implementation | not started | |
| 11 — Whole-app qualification and final verdict | not started | **Owner gate 4** at its end |

## What Slice 5 inherits

**The frame is done; the interior is not, and that gap is the whole of Slice 5.**
Task 259 replaced the Town and the pond with the desk: `.rp-desk` (slim rail,
quiet header, activity capsule, `<main>` view region) and the conversation as
centered warm paper. The owner has approved that composition.

**The conversation's INSIDE is still the retired lantern's, re-toned.** This is
the single most important thing to understand before starting:

- The conversation column carries `chat-column rp-conversation chat-column-villager`.
  The third class is deliberate and load-bearing. Roughly two hundred rules in
  `app.css` hang off it and give the cards, panels and decision surfaces their
  paper. **Removing it silently reverted the dispatch panel to a pre-Task-186
  card language, and `conductor.spec.ts` is what caught that** — expect the same
  if you drop it without moving those rules first.
- `.rp-conversation.chat-column.chat-column-villager` in `workspace.css`
  re-points roughly thirty paired tokens (`--card`, `--card-ink`, `--line`,
  `--stop`, `--green-deep`, `--pond-*`, `--lantern-*`, `--garden-*`) onto
  `--rp-*` values, so those two hundred rules re-tone through the cascade
  instead of being rewritten. Slice 5's job is to replace that indirection with
  the real paper language, and then the class and its rules can go.
- The three-class selector beats `.chat-column.chat-column-villager` on
  **specificity**, not source order, because a CSS minifier may reorder equal
  rules. Keep that property if you touch it.

**One resolved value drives Cairn and the words.**
`renderer/activity/presence.ts` is pure and total: it takes the neutral runtime
truth, Chat's `needsOwner` seam and the connection, and returns `state`,
`status`, `detail`, `tone` and `expression`. `ActivityCapsule` is handed the
result and cannot resolve one itself, and a test proves the whole renderer calls
the combiner exactly **once** and draws Cairn in exactly **one** component. Do
not add a second `<CairnProgram>` to production without deciding what it means.

**`.rp-` now reaches production, and the guard says so.** `visualtokens.test.ts`
was rewritten: every selector in the three new sheets must be **anchored** on an
`.rp-` class (a descendant of an opted-in surface is fine), `app.css` must still
declare no `.rp-` selector, production markup **must** carry `rp-` classes, and
tokens may be declared only inside an `.rp-` scope. The breakpoint set across
those sheets is asserted to be exactly `{820, 1260}`.

**Dead but present, for Slice 10.** `TownSquare.tsx`, `TownDetail.tsx`, the whole
`renderer/town/` directory, every `.town-*`/`.pond-*`/`.chat-column-villager`
rule in `app.css`, the town-square persistence path, `activityStatus`'s "Town is
quiet.", and the activity **cue** machinery (`activeCue`, `queuedCues`, the
advancing timer) all still exist and drive nothing the owner sees. Two unit
suites still exercise the Town through the unmounted component. Do not delete
any of it in Slice 5.

**The old aliases are all still there.** `tokens-baseline.golden.txt` pins all
110 pre-Slice-3 tokens byte-exact. Do not delete a garden/lantern/town token
until nothing reads it — and the re-point above means the conversation still
reads many of them.

## Inherited hazards — read before starting Slice 5

1. **ONE known-red E2E scenario, down from four.** `conductor.spec.ts` ·
   *a reload mid-run reattaches the conversation's strip* still fails with
   `.run-strip` stuck in `Check`, which is the documented pre-existing symptom.
   Task 259 resolved the other three: the STOPPED-card scenario's failing
   assertion polled the **Town Cairn's face stroke** and the rewrite removed it;
   the reduced-motion scenario passes (one run failed on the Windows
   worker-teardown `EPERM` alone, with every assertion green, and the rerun was
   clean); and *a worker's claims render only inside the card* was stalling at an
   **unanswered owner pause** — "Continue to Cairn's current checks" — that the
   product grew after the test was written. **If a scenario needing verified DONE
   hangs at `Check`, look for an owner pause on screen before assuming the
   documented red.**
2. **Nine known-red app unit tests** in `builderlivetransport.test.js` and
   `buildertrackedtext.test.js`. Baseline to diff against is now
   **1034 / 1023 / 9 / 2**. Diff the failure SET, never the count.
   **Delete `app/dist-unit/` after removing a test file:** `tsc` does not delete
   outputs for removed sources, and a stale compiled test reported four
   phantom failures during Task 259. It is gitignored and holds nothing tracked.
3. **A test whose marker matches a word in a comment is not testing imports.**
   Task 257 turned `resident-program-bundle-dark.test.mjs` red just by naming
   the overhaul in a header comment, and Slice 2's checks never ran that file.
   Run every qualification your change could touch, not only the ones your plan
   section lists.
4. **`--output=test-results/taskNNN-runner` IS NOT ENOUGH.** The root
   `playwright.config.ts` declares no `outputDir`, and during Task 259
   Playwright cleared **the whole of `test-results`** anyway, deleting Task 229's
   and Task 255's untracked evidence. Pass the flag *and* back the directory up
   first. **Write anything you need to survive a run into `app/shots/` instead**
   — it is gitignored, it is the owner's existing review directory, and nothing
   clears it. Task 259's gate screenshots are in `app/shots/task259-gate/`.
5. **`app/test-results/` holds untracked, gitignored evidence** —
   `task229-builder-proposal-review.png`, `task255-board/`. Back it up before
   running Playwright and verify the hashes afterwards. **The board's
   screenshots are NOT byte-reproducible:** two consecutive runs of identical
   code differ in 15 of 19, so never treat a screenshot hash as a no-change
   baseline. Measure instead.
6. **`playwright.cmd` fails from Git Bash** because the repository path contains
   a space. Use `node ./node_modules/@playwright/test/cli.js test …`.
7. **The Windows worker-teardown `EPERM`** aborts batched Playwright runs. Run
   one invocation per scenario so a teardown cannot cascade.
8. **Never spell a control character as a `\u` escape in source** — the editing
   tools and the shell both turn it into the raw invisible byte. Build it from
   its code point. **And never round-trip a source file through PowerShell's
   `Get-Content -Raw` / `Set-Content`:** in Windows PowerShell 5.1 that mangles
   every em dash. Task 259 did it while mutation-testing and had to restore
   `presence.ts` from a pre-mutation copy. Use the editor tools for edits.
9. Task 255's board config takes **no app token** (no `globalSetup`, never
   launches Electron). Electron E2E **does** need both locations
   (`%TEMP%\cairn-app-token` and `app/.app-token`); create both with `mkdir`,
   record which ones you created, and release only those.
10. **`Locator.isVisible()` does not wait.** Task 259 wrote
    `isVisible({ timeout })` as a soft guard and it returned `false`
    immediately, silently skipping the click it guarded. Use
    `await expect(locator).toBeVisible({ timeout })` then act.
11. **Playwright's `getByRole` `name` is a case-insensitive SUBSTRING match
    against the accessible name, and `aria-label` beats element text.** That
    combination had `projects.spec.ts` clicking `"Open project"` against a
    button whose label is `"Open a project"` — matching nothing, on `main`,
    since long before this overhaul.

## Start prompt for Slice 5

Copy everything inside the fence into a fresh Cairn/Codex conversation.

```text
Work on: Slice 5 of Cairn's resident-program visual overhaul — the core
conversation surface.

Authority: docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md
Read its Slice 5 section, section 2 (the approved visual constitution), section
3 (product truth that must survive — all fifteen items), section 4 (migration
seams) and section 6 (global execution rules) completely. Then read
docs/superpowers/specs/2026-08-13-cairn-resident-program-visual-design.md
sections 6 and 7 — type, density, controls, motion, and the composition your
surface now sits inside.

Slices 1-4 are DONE. Read docs/ai-work/tasks/259-report.md and the "What Slice 5
inherits" and "Inherited hazards" sections of
docs/ai-work/HANDOFF-resident-program-visual-overhaul.md before starting.

Start conditions — verify each, do not assume:

1. Project root: C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework
2. main is clean and between tasks.
3. Task 259's report says Disposition: DONE.
4. Claim the LOWEST genuinely free task number. List docs/ai-work/tasks/ across
   the main checkout, EVERY registered worktree, and EVERY local branch. Any
   filename beginning with a number takes it, including a report with no brief.
   Do not trust a number quoted in any document, including this one. Commit the
   brief ALONE to claim your number.
5. Ask the owner to confirm Lane A is free.
6. Know what else is queued. At the time of writing, lane/h holds Task 254 as
   DONE and UNLANDED. Re-derive with `git rev-list --count main..lane/h`; it
   will be stale.

Do not create, delete, reuse, reset or move any registered worktree.

THE FRAME IS APPROVED; THE INTERIOR IS YOURS. Owner gate 2 approved the desk on
2026-08-17 with one word: "Approved". Do not redesign the rail, the header, the
activity capsule or where the conversation sits — that is settled, and the next
owner judgment is gate 3 at the end of Slice 7. What is not settled is
everything inside the paper.

The central inherited fact, and the one that will bite you:

- The conversation column carries `chat-column rp-conversation chat-column-villager`.
  That third class is the hook for roughly two hundred rules in `app.css` that
  give the transcript, cards and panels their paper, and
  `.rp-conversation.chat-column.chat-column-villager` in `workspace.css`
  re-points about thirty paired tokens so those rules re-tone onto warm paper
  rather than being rewritten. **Slice 5 is where that indirection is replaced
  by the real paper language.** Task 259 tried removing the class first and
  `conductor.spec.ts` caught what it cost: the dispatch panel silently reverted
  to a pre-Task-186 card language. Move the rules, then drop the hook — and the
  dispatch panel and the other decision surfaces belong to SLICE 6, so leave
  their structure alone or you will hit the same wall.

Work, in the plan's order:

1. Change markup and classes only where presentation needs it. Add no new state
   owner. Preserve Chat's connection restore, transcript merging, stream
   lifecycle, queued messages, pending actions, task attachment, result
   recovery, retry/take-back, stop/new conversation, and focus settlement.
2. Keep Cairn's prose mostly open on paper; owner text uses quieter apricot
   notes; machine evidence stays in bounded mono surfaces.
3. Do not place a full Cairn face beside every historical turn. Production draws
   Cairn in exactly ONE component today and a test enforces it.
4. Characterize the behaviour you are about to restyle BEFORE editing.

Checks: conversation, stream, queue and error tests; composer native semantics;
long Markdown, path and code containment; keyboard and screen-reader flow;
wide, compact and minimum screenshots in both themes; no perpetual motion;
and measured contrast. **Bring the connected conversation under
contrast.spec.ts if you can** — it currently runs with no conductor, so it has
never measured a Cairn turn, an owner note or a composer, and Task 259 recorded
that gap rather than closing it.

Run from app/: npm.cmd run typecheck, npm.cmd run test:unit,
npm.cmd run build:vite, npm.cmd run build:lab, plus the board suites and every
qualification your change could touch even if the plan does not list them —
Slice 3 proved a qualification can go red from a comment.

Diff the unit failure SET against 1034 / 1023 / 9 / 2, never the count.

Boundaries. No dependency install, provider or model call, credential use, paid
call, external service write, push, publication or deployment. Protect every
tracked, staged, modified and untracked path, including untracked evidence under
app/test-results/ and app/shots/. Stage by exact name; never clean, stash,
reset, broadly stage, or rewrite history. Subagents may perform read-only
audits, but only one task and one writer may change this repository at a time.

STOP if a behaviour in Chat's state machine cannot be preserved through the
restyle, if a contrast floor cannot be met without changing an approved colour,
or if a concrete risk boundary is reached.

Close with a truthful report naming every file touched and every check's real
result, one LOG row, and one exact-path completion commit as DONE or STOPPED
under AGENTS.md. Then refresh this handoff for Slice 6. Do not begin Slice 6 in
that conversation.
```

## Required reading for any slice

- `AGENTS.md` and `docs/ai-work/PROJECT.md`
- the saved plan, the design spec, and the preceding slice's report
- the complete Git status, and the current files themselves rather than
  historical line numbers
