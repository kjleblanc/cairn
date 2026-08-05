# Task 184 report — one-screen proposal handoff

**Lane:** E

**Base commit:** `7931656011a0f04fb85d7e82a3d8cd92ebc268e0`

**Brief commit:** `64979cc6d135c4440bc219d13b7cb8973c8f37d7`

**Milestone moved:** NO

## Outcome

Cairn's active task proposal is now a compact decision rather than a second
wall of task documentation. It shows a plain heading, the outcome, any concern
the owner must decide, **Review**, and a closed **Details** disclosure. Opening
Details reveals the complete reusable attributed intent: source labels, exact
owner words, Cairn-chosen requirements, and carried context. The final preview
still repeats that complete task before any work can start.

The conversational handoff is concise too. Conductor protocol v8 puts a task's
hidden control fence first. Once main validates and source-binds that task, it
replaces the live model prose with one main-owned acknowledgement and persists
the same concise truth. Deliberately repetitive post-fence fixture prose never
appears. Ordinary non-proposal replies retain their existing additive streaming
path.

A set-aside reply uses the neutral live text **Updating the plan...** until a
fresh proposal actually exists. The Electron journey stops one such reply and
proves it saves no false “carried forward” claim and creates no card. A retry
then exercises Task 181's main-owned fallback: the fresh card has no risks,
Review is enabled, and the selected concern is present in Details and the final
preview. No renderer-authored risk or replacement state was introduced.

Task 184 is complete in Lane E only. The retained Task 180/183 work on `main`
remains untouched, so this lane was not merged into that checkout.

## What changed

- `app/src/renderer/components/TaskCard.tsx` makes the card decision-first,
  changes both the visible and accessible primary name to **Review**, and moves
  the full `TaskIntentList` into a native closed Details disclosure.
- `app/src/renderer/app.css` compacts the outcome, concern, action, heading
  focus, and native disclosure while retaining narrow wrapping and keyboard
  focus visibility.
- `app/src/main/conductor/constitution.ts` advances to conductor v8 and tells
  task proposals to signal with their hidden task fence before one short,
  non-repetitive acknowledgement.
- `app/src/main/conductor/service.ts` validates proposal candidates without
  creating early IDs or authority, replaces live proposal prose with main-owned
  copy, persists the same concise acknowledgement, and uses neutral pending
  copy for an interruptible set-aside.
- `app/src/shared/ipc.ts` adds the main-originated `replace` stream event used to
  reset only a validated proposal's live bubble.
- `app/src/renderer/screens/Chat.tsx` applies that replacement event to the live
  bubble; ordinary additive deltas remain unchanged.
- `app/tests-unit/constitution.test.ts` pins conductor v8, fence-first ordering,
  the one-sentence budget, and the no-repetition rule.
- `app/tests-unit/evidencepresentation.test.ts` pins the compact decision order,
  closed complete Details structure, plain accessible Review name, unchanged
  main-owned gates, live/final acknowledgement ownership, and unchanged
  ordinary streaming path.
- `app/tests/conductor.spec.ts` adds the guarded narrow Electron journey and
  updates existing proposal-button locators to the new accessible name.
- `app/tests/fixtures/fake-conductor.mjs` adds deterministic held proposal and
  set-aside windows, including deliberately repetitive model prose.
- `app/tests/evidence.spec.ts` updates its proposal-button locator from the old
  accessible name to **Review**; its data-bearing real-worker path was not run.
- `docs/ai-work/tasks/184-report.md` is this report.
- `docs/ai-work/LOG.md` receives the Task 184 row. A later union merge must keep
  the independent Task 180, 181, and 183 rows on `main` exactly once.

No dependency, lockfile, credential, saved-task format, accepted request,
action/risk identity, provider connection, real model call, worker dispatch,
project fact, milestone, push, publish, deployment, or production data changed.

## AI decisions and review record

- Native `<details>` supplies keyboard and disclosure semantics without a new
  state owner. `TaskCard` is keyed by main's fresh action ID, so a replacement
  starts closed automatically.
- Review uses its visible text as its accessible name. The earlier hidden
  “Review dispatch” override was removed after review found that it preserved
  jargon for screen-reader users.
- Main owns both the live replacement and settled acknowledgement. The early
  classifier reuses source validation but creates no IDs and grants no action;
  final parsing remains the only authority path.
- Task proposals put their hidden fence first so main can classify them before
  later prose. A proposed global one-sentence cap was rejected during review
  because it would have changed how ordinary multi-sentence chat streams.
- A set-aside in progress says only **Updating the plan...**. “I carried that
  concern forward” appears only after main publishes the real replacement.
- Two independent read-only review passes found and drove repairs for the
  accessible name, prompt-only enforcement, live prose replacement, truthful
  Stop behavior, and ordinary-streaming boundary. Their final verdicts both
  reported no remaining P0–P2 findings.

## Checks run and real results

1. Red-first focused contracts: `cd app`, `npx.cmd tsc -p
   tsconfig.unit.json`, then `node --test
   dist-unit/tests-unit/constitution.test.js
   dist-unit/tests-unit/evidencepresentation.test.js`
   - The first run failed the six new compact-card/copy assertions against the
     old presentation, as intended.
   - Final source passed: **59 tests, 59 passed, 0 failed**.
2. `cd app && npm.cmd run typecheck`
   - Passed with no TypeScript errors.
3. `cd app && npm.cmd run test:unit`
   - Final pass: **371 total, 369 passed, 0 failed, 2 Windows host-specific
     skips**.
4. `cd app && npm.cmd run build:vite`
   - Final pass with the worktree-read allowance needed by Vite's config
     traversal: main **63 modules**, preload **1 module**, renderer **73
     modules**.
5. `cd app && npm.cmd run build:lab`
   - Final pass with the same local allowance: **96 modules**.
6. With zero Electron processes and both `.lanes/e/app/.app-token` and
   `%TEMP%/cairn-app-token` atomically held by a `try/finally` wrapper, set
   `CAIRN_TEST_LANE=1`, then run `npx.cmd playwright test
   tests/conductor.spec.ts --workers=1 --grep "one compact proposal|a live
   reply belongs"` from `app`.
   - Final pass: **2 passed, 0 failed** in 12.5 seconds, using only Cairn's
     scripted loopback fixture.
   - The compact path holds a fence-first proposal before repetitive prose,
     proves only main's acknowledgement is live, checks the risk card and
     closed/full Details, stops a held set-aside without a false completion
     claim or fresh card, retries to the guaranteed risk-free replacement,
     opens carried context, and reaches the complete final preview.
   - The companion existing path proves an ordinary multi-chunk reply still
     streams, remains attached across navigation, and completes normally.
   - No real provider, model, or worker was called.
7. Visual inspection at 760 by 720 pixels:
   - `%TEMP%/cairn-task-184-compact-proposal.png` — passed: one short Cairn
     sentence, one outcome, one concern, Review, and Details fit without
     clipping.
   - `%TEMP%/cairn-task-184-fresh-proposal.png` — passed: the replacement is
     compact, risk-free, and Review is visibly enabled.
   - `%TEMP%/cairn-task-184-details.png` — passed: the expanded disclosure shows
     source labels, exact words, requirement, and carried context.
8. `git diff --check`, exact diff/status inspection, final process/token check,
   and separate main-checkout status inspection
   - Passed. Lane E held only the eleven intended implementation/test changes
     before records. No Electron process or app-token remained. Main stayed at
     `18a7a6e968e919783e824a7b44c1eb5daf6388bb` with its exact retained
     Task 180/183 work unchanged.

Several diagnostic failures were repaired and are not counted as passes. A raw
provider-body assertion initially missed an escaped newline; it now parses and
normalizes the JSON prompt. This Windows PowerShell rejected `New-Item
-LiteralPath` before either lock or app existed; the compatible exact `-Path`
form was used. Sandboxed Vite traversal and Electron launch were denied access;
the required local worktree-read/Electron allowances were then granted and all
final checks passed. One constitution regex failed after a deliberate line
wrap in the fence-first rule; only that test assertion changed before the final
full green run. Every attempted Electron run released both locks, and no app
process was left behind.

## How to try it

The safest immediate review is the final compact capture:

`C:\Users\KenJL\AppData\Local\Temp\cairn-task-184-compact-proposal.png`

The risk-free replacement and expanded disclosure are beside it as
`cairn-task-184-fresh-proposal.png` and `cairn-task-184-details.png`.

For a local live look before landing, first close Cairn, then run `npm.cmd
start` from `.lanes/e/app`. Opening the conversation is local. Sending a real
message through an existing connection may share authorized project context
and use provider quota, so the captured fake-provider journey is sufficient
for this review.

The main checkout does not contain this completed result yet. Land `lane/e`
only after the retained Task 180/183 work on `main` is resolved and main is
clean between tasks.

## Limitations and remaining judgment

- Before a valid task fence exists, main cannot know that arbitrary model text
  is a proposal. Conductor v8 therefore requires the hidden fence first; once
  it validates, later model prose is replaced and never becomes the saved
  proposal reply. A model that violates both ordering and copy instructions
  could still show pre-signal prose until its task fence arrives.
- The card, narrow geometry, keyboard disclosure, Stop/retry truth, and ordinary
  streaming boundary are mechanically verified. Whether the density and
  hierarchy feel calm enough remains the owner's visual judgment.
- Task 184 is committed and DONE in Lane E but intentionally not merged into
  the dirty main checkout.

Disposition: **DONE**
