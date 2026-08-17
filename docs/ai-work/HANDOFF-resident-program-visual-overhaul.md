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
| 5 — Core conversation surface | **DONE** | Task 260 |
| 6 — Questions, proposals, approvals, operational papers | **NEXT** | No owner gate; the next is Owner gate 3 at the end of Slice 7 |
| 7 — Running, results, evidence, history, publication | not started | **Owner gate 3** at its end |
| 8 — Welcome, projects, Dashboard, Settings, support | not started | |
| 9 — Compact desktop and phone parity | not started | |
| 10 — Retire obsolete Town/Pond implementation | not started | |
| 11 — Whole-app qualification and final verdict | not started | **Owner gate 4** at its end |

## What Slice 6 inherits

**The conversation is real paper now; the decisions on it are not.** Task 260
rewrote the transcript, Cairn's prose, the owner's note, the queue, errors,
commentary, next-step notes, machine evidence and the composer into
`surfaces.css`, drawn from `--rp-*` semantics, and deleted them from `app.css`.
What is left on the old hook is **your family and Slice 7's**.

**The hook is still there, and it is still load-bearing.** The column carries
`chat-column rp-conversation chat-column-villager`. `chat-column-villager` went
from 305 occurrences in `app.css` to 262, and what remains is the decision
family — question card, task card, task intent rows, dispatch panel, approvals —
plus the result family and the generic `.pill` skin every one of them consumes.
**Slice 6 moves the decision family; the class itself comes off at the end of
Slice 7, not before.** Task 259 proved what removing it early costs: the
dispatch panel silently reverted to a pre-Task-186 card language, caught by
`conductor.spec.ts`.

- `.rp-conversation.chat-column.chat-column-villager` in `workspace.css` still
  re-points roughly thirty paired tokens (`--card`, `--card-ink`, `--line`,
  `--stop`, `--green-deep`, `--pond-*`, `--lantern-*`, `--garden-*`) onto
  `--rp-*` values. Your surfaces are still riding that indirection.
- The three-class selector beats `.chat-column.chat-column-villager` on
  **specificity**, not source order, because a CSS minifier may reorder equal
  rules. Keep that property if you touch it.
- **`app.css` may not name an `.rp-` class in a RULE or in a COMMENT.**
  `visualtokens.test.ts` regexes the whole file, comments included. Task 260's
  first draft explained two deletions by naming where they went and would have
  gone red on prose alone.

**The pattern Slice 5 used, if you want it.** Anchor every new rule at
`.rp-conversation`, put it in `surfaces.css`, delete the `.chat-column-villager`
original from `app.css`, and re-point the test that guarded it with a recorded
disposition. Seven test files needed that in Slice 5; expect a similar spread —
`questionpaper`, `dispatchpaper`, `taskreviewpaper`, `qualitypreviewpaper`,
`criticcallpaper`, `repaircallpaper`, `harnessrevisionpaper`,
`builderproposalreview`, and possibly `conversationpaper`'s proposal half, which
Slice 5 deliberately left untouched.

**Two defect classes Slice 5 found; check for them in your family.**

1. **`opacity` on a disabled control fades its words and its ground together.**
   Send measured 2.45:1 that way. WCAG exempts an inactive component, so it can
   be argued away; Slice 5 fixed it instead. `.chat-column-villager
   .dispatch-actions .pill:disabled`, `.question-card-actions .pill:disabled`
   and `.push-confirm-actions .pill:disabled` all still exist and are yours.
2. **A transform on a container that holds interactive controls.**
   `motion.css`'s `chat-arrive` still slides and scales `.result-card`,
   `.task-card` and `.push-chip`, every one of which holds controls. Slice 5
   removed it from `.bubble` only, inside the conversation.

**One resolved value drives Cairn and the words.**
`renderer/activity/presence.ts` is pure and total. `ActivityCapsule` is handed
the result and cannot resolve one itself, and a test proves the whole renderer
calls the combiner exactly **once** and draws Cairn in exactly **one**
component. Do not add a second `<CairnProgram>` to production without deciding
what it means.

**The contrast sweep now connects, and widening it is your cheapest win.**
`contrast.spec.ts` has a second scenario that connects the local fake conductor
by the visible route and measures the conversation. Task 259 recorded that the
decision surfaces were unmeasured and that Slice 6 should start there; the
machinery to reach them now exists in that file — send a message the fixture
answers with a task block and sweep again. **In `shots/task260/05-with-proposal-*`
the proposal's primary control still looks low-contrast to my eye and is
unmeasured.** The sweep also measures the focus ring by TABBING and the 44 × 44
floor from real bounding boxes; both are worth extending to your controls.
Note the disconnected scenario deliberately keeps a NARROWER element list than
the connected one, so a slice cannot turn an unmigrated surface red merely by
widening what the check looks at.

**The breakpoint set across the three new sheets is asserted to be exactly
`{820, 1260}`.** The retired rules used 620 px, which sits below the supported
760 px minimum and only ever reached the containment stress view. Slice 5 moved
its compact treatment to 820 px; yours must too.

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

## Inherited hazards — read before starting Slice 6

1. **TWO known-red E2E scenarios.** `conductor.spec.ts` ·
   *a reload mid-run reattaches the conversation's strip* still fails with
   `.run-strip` stuck in `Check`, which is the documented pre-existing symptom,
   confirmed unchanged by Task 260. And `evidence.spec.ts` fails at its first
   scenario inside its own `connectAndRestore` helper (`evidence.spec.ts:190`,
   `expect(connected.ok)` receives `false` in ~900 ms). Task 259 recorded that
   suite as never run to completion; Task 260 ran it and found this. **It is
   older than the overhaul:** that spec was last touched at Task 189
   (`9fe6703`, 2026-08-06) and the connect path has changed nine times since,
   including Task 201 "store model connection authority" and Task 206 "add
   headless catalog and sticky Auto", while its `fakeProvider` answers every
   request with an SSE chat completion and serves no catalog endpoint.
   **If a scenario needing verified DONE hangs at `Check`, look for an owner
   pause on screen before assuming the documented red.**
2. **Nine known-red app unit tests** in `builderlivetransport.test.js` and
   `buildertrackedtext.test.js`. Baseline to diff against is now
   **1036 / 1025 / 9 / 2**. Diff the failure SET, never the count — and
   **re-derive the baseline in your own lane before your first edit** rather
   than trusting this line.
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
   one invocation per scenario so a teardown cannot cascade. Task 260 hit it
   again on the reduced-motion scenario — `EPERM` on the isolated profile
   directory **plus** a 60 s test timeout under a loaded machine — and the same
   scenario passed alone in 5.8 s. **A 60 s timeout in a batch is not evidence
   of a regression until it has been rerun alone.**
8. **Do not edit anything under `app/src/` while a Playwright sweep is
   running.** `playwright.global-setup.ts` compares `.vite`'s mtime against
   `app/src` and `core/dist` and refuses the whole run. Task 260 edited one CSS
   rule mid-sweep and lost twelve of fourteen scenarios to
   "the bundle in app/.vite is missing or older than app/src" — which looks like
   twelve failures and is one stale timestamp. Editing under `app/tests/` is
   safe; editing under `app/src/` means rebuild and start over.
9. **Never spell a control character as a `\u` escape in source** — the editing
   tools and the shell both turn it into the raw invisible byte. Build it from
   its code point. **And never round-trip a source file through PowerShell's
   `Get-Content -Raw` / `Set-Content`:** in Windows PowerShell 5.1 that mangles
   every em dash. Task 259 did it while mutation-testing and had to restore
   `presence.ts` from a pre-mutation copy. Use the editor tools for edits.
10. Task 255's board config takes **no app token** (no `globalSetup`, never
    launches Electron). Electron E2E **does** need both locations
    (`%TEMP%\cairn-app-token` and `app/.app-token`); create both with `mkdir`,
    record which ones you created, and release only those. **Acquire them and
    release them in a `finally` that also covers the launch itself** — Task 260
    put the launch outside the guard, threw before it, and left both locations
    held.
11. **`Locator.isVisible()` does not wait.** Task 259 wrote
    `isVisible({ timeout })` as a soft guard and it returned `false`
    immediately, silently skipping the click it guarded. Use
    `await expect(locator).toBeVisible({ timeout })` then act.
12. **Playwright's `getByRole` `name` is a case-insensitive SUBSTRING match
    against the accessible name, and `aria-label` beats element text.** That
    combination had `projects.spec.ts` clicking `"Open project"` against a
    button whose label is `"Open a project"` — matching nothing, on `main`,
    since long before this overhaul.
13. **A disabled control is skipped by the tab order**, so a keyboard walk
    cannot reach it. Task 260's focus-ring check could not reach Send until it
    typed an unsent draft first. And **an exact-attribute marker in a
    source-text test goes QUIET, not red, when a class is appended** — the
    `indexOf` returns `-1`, which compares as "before" everything. Match on a
    prefix and assert the marker was found at all.

## Start prompt for Slice 6

Copy everything inside the fence into a fresh Cairn/Codex conversation.

```text
Work on: Slice 6 of Cairn's resident-program visual overhaul — questions,
proposals, approvals and the operational papers.

Authority: docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md
Read its Slice 6 section, section 2 (the approved visual constitution), section
3 (product truth that must survive — all fifteen items, and items 4, 5, 13 and
14 are yours in particular), section 4 (migration seams) and section 6 (global
execution rules) completely. Then read
docs/superpowers/specs/2026-08-13-cairn-resident-program-visual-design.md
sections 6 and 7 — type, density, controls, motion, and the composition your
surfaces now sit inside.

Slices 1-5 are DONE. Read docs/ai-work/tasks/260-report.md and the "What Slice 6
inherits" and "Inherited hazards" sections of
docs/ai-work/HANDOFF-resident-program-visual-overhaul.md before starting.

Start conditions — verify each, do not assume:

1. Project root: C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework
2. main is clean and between tasks.
3. Task 260's report says Disposition: DONE.
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

THE FRAME AND THE PAPER ARE SETTLED; THE DECISIONS ON THEM ARE YOURS. Owner
gate 2 approved the desk on 2026-08-17 with one word: "Approved", and Slice 5
redrew the conversation it holds. Do not redesign the rail, the header, the
activity capsule, the transcript, the two voices or the composer. The next
owner judgment is gate 3 at the end of Slice 7.

The central inherited fact, and the one that will bite you:

- The conversation column still carries
  `chat-column rp-conversation chat-column-villager`. Slice 5 moved the
  conversation's own families out of that hook — `chat-column-villager` went
  from 305 occurrences in app.css to 262 — and what is LEFT is your family
  (question card, task card, task intent rows, dispatch panel, approvals,
  critic/repair/harness) plus Slice 7's (receipts, run strip, evidence, push)
  and the generic `.pill` skin all of them consume. **The class comes off at
  the end of Slice 7, not at the end of yours.** Task 259 proved what removing
  it early costs: the dispatch panel silently reverted to a pre-Task-186 card
  language and conductor.spec.ts caught it.
- The pattern that worked in Slice 5: anchor every new rule at
  `.rp-conversation`, put it in surfaces.css, delete the
  `.chat-column-villager` original from app.css, and re-point the test that
  guarded it with a recorded disposition. **app.css may not name an `.rp-`
  class in a rule OR IN A COMMENT** — visualtokens.test.ts regexes the whole
  file, comments included.

Work, in the plan's order:

1. One hierarchy: decision first, effect/reason/recovery next, complete details
   on demand, actions last.
2. Keep native controls, unsent question drafts, defer and set-aside choices,
   busy state, callback identity, focus movement, and the exact
   provider/model/project/data/cost copy. A prettier card must never look
   already approved, executed, applied, published, verified or terminal.
3. Task 229's Builder proposal review stays lab-only, literal-text, no-callback,
   no-control, no-route, nonterminal and authority-free. Restyle it; add no
   action seam and no production consumer.
4. Characterize the behaviour you are about to restyle BEFORE editing. Slice 5's
   harness is worth copying: strip the VALUE of every className out of the
   components you touch, hash the rest before and after, and make "only
   presentation moved" a measurement rather than a promise.

Two defects Slice 5 found that are very likely in your family too:

- `opacity` on a disabled control fades its words and its ground together. Send
  measured 2.45:1 that way. `.chat-column-villager .dispatch-actions
  .pill:disabled`, `.question-card-actions .pill:disabled` and
  `.push-confirm-actions .pill:disabled` all still exist.
- motion.css's `chat-arrive` slides and SCALES `.result-card`, `.task-card` and
  `.push-chip`, every one of which holds interactive controls — which the
  constitution forbids, and which blurs their own text mid-flight.

Checks: the focused behavioural and custody tests for every component you touch;
the hostile literal-text qualification and the no-action-seam proof for the
Builder proposal card; keyboard and focus movement; long disclosure containment;
all semantic states; wide, compact and minimum screenshots in both themes; no
perpetual motion; and measured contrast. **Bring the decision surfaces under
contrast.spec.ts** — Slice 5 gave that file a connected conversation and the
fixture machinery to reach a proposal, and Task 259 recorded that the task
card's primary control looks low-contrast and is unmeasured. Widen the
connected scenario rather than writing a third.

Run from app/: npm.cmd run typecheck, npm.cmd run test:unit,
npm.cmd run build:vite, npm.cmd run build:lab, the dedicated Builder proposal
browser qualification, and every other qualification your change could touch
even if the plan does not list them — Slice 3 proved a qualification can go red
from a comment.

Diff the unit failure SET against 1036 / 1025 / 9 / 2, never the count, and
re-derive that baseline in your own lane before your first edit.

Boundaries. No dependency install, provider or model call, credential use, paid
call, external service write, push, publication or deployment. Protect every
tracked, staged, modified and untracked path, including untracked evidence under
app/test-results/ and app/shots/. Stage by exact name; never clean, stash,
reset, broadly stage, or rewrite history. Subagents may perform read-only
audits, but only one task and one writer may change this repository at a time.

STOP if an approval boundary cannot be preserved through the restyle, if a
restyled card could be mistaken for one already acted on, if a contrast floor
cannot be met without changing an approved colour, or if a concrete risk
boundary is reached.

Close with a truthful report naming every file touched and every check's real
result, one LOG row, and one exact-path completion commit as DONE or STOPPED
under AGENTS.md. Then refresh this handoff for Slice 7. Do not begin Slice 7 in
that conversation.
```

## Required reading for any slice

- `AGENTS.md` and `docs/ai-work/PROJECT.md`
- the saved plan, the design spec, and the preceding slice's report
- the complete Git status, and the current files themselves rather than
  historical line numbers
