# Task 168 — bring the Ripple Pond language into the live Town

Base commit: `9d662fafb296a3ecd7202c6e872abcada2ed276d`

Brief commit: `84abc912e48730b259f1e0339d58222d0dd0cf3e`

## Outcome

The live Cairn desktop workspace now presents Town and conversation as one
place. Cairn remains the conversation entry point, the existing in-world Chat
bubble stays readable beside the pond, and approved real worker activity moves
visibly through that shared surface.

A labeled TASK packet travels from Cairn to the real routed worker only after
main accepts the dispatch. The receiver's unchanged identity color produces one
landing ripple. The worker remains named as working without an invented
percentage. A real Run completion produces one RESULT return to Cairn before
the pond settles into checking and then the authoritative terminal state.
Verified DONE is moss-toned; STOPPED and ERROR are coral, keep Cairn's cyan
identity, and never borrow the DONE face or wording.

The owner inspected the quiet, dispatch, working, return, DONE, and STOPPED
states at desktop and narrow sizes and approved the live feel on 2026-08-02:
“Feels right. Let's stop here so another task can begin.” That is the decisive
human-judgment check required by the brief.

Disposition: **DONE**

## What changed

- Added a monotonic Town presentation reducer. It translates append-only real
  runtime evidence into one-time dispatch, return, DONE, STOPPED, or ERROR cues;
  repeated polls do not replay motion, stale prefixes cannot regress terminal
  truth, and a later evidence failure correctly escalates STOPPED/DONE to ERROR.
- Made runtime worker identity come from the adapter that actually won main's
  route and exposes the real-call disclosure seam, never from a renderer-owned
  confirmation Boolean. Offline demonstrations and pre-Run sessions cannot
  create fictional villagers or success water.
- Reworked the live Town into a restrained night pond while preserving
  `town/faces.ts` byte-for-byte. TASK and RESULT packets share a pond-side arc;
  identity colors belong to characters and receiver ripples, while moss/coral
  belong only to outcome water.
- Kept Chat inside the Town at every supported width. Worker positions are
  presentation-clamped away from the conversation without rewriting saved
  coordinates, including the old 1260/1261 rail breakpoint.
- Kept task-thread controls keyboard reachable through handoffs, transferred
  focus synchronously to Cairn when the thread truly disappears, retained
  visible focus rings, and made reduced motion settle the same semantic state
  without transient packets.
- Made project/task/presentation refreshes atomic and monotonic. Slow old-project
  or stale task responses cannot repaint the newly selected project or
  repopulate a closed worker.
- Extended the deterministic fake worker/conductor and focused UI suite to
  prove dispatch, landing proximity and color, return/checking, DONE versus
  STOPPED, narrow layout, saved-position clamping, keyboard focus, hydration,
  polling, and reduced motion.

## Files touched

Application and design lab:

- `app/lab/chatmock-view.tsx`
- `app/src/main/tasks.ts`
- `app/src/main/workeridentity.ts`
- `app/src/renderer/app.css`
- `app/src/renderer/components/TownDetail.tsx`
- `app/src/renderer/components/TownSquare.tsx`
- `app/src/renderer/motion.css`
- `app/src/renderer/screens/Workspace.tsx`
- `app/src/renderer/tokens.css`
- `app/src/renderer/town/model.ts`
- `app/src/renderer/town/presentation.ts`

Tests and local fixtures:

- `app/tests-unit/faces.test.ts`
- `app/tests-unit/townmodel.test.ts`
- `app/tests-unit/townpresentation.test.ts`
- `app/tests-unit/workeridentity.test.ts`
- `app/tests/conductor.spec.ts`
- `app/tests/fixtures/fake-codex-env.ts`
- `app/tests/fixtures/fake-conductor.mjs`
- `app/tsconfig.unit.json`

Task records:

- `docs/ai-work/tasks/168-brief.md` — claimed and bounded the task in its own
  earlier commit.
- `docs/ai-work/tasks/168-report.md` — this report.
- `docs/ai-work/LOG.md` — one appended Task 168 row.

Twelve ignored local verification captures were generated under `app/shots/`:
quiet, dispatch, working, return, DONE, and STOPPED at desktop and narrow sizes.
They were inspected and shown to the owner but are not product or commit paths.

`app/src/renderer/town/faces.ts` was not touched. Its working copy matches HEAD
exactly.

## Checks and real results

All command output was observed during this task.

- `npm.cmd run typecheck` from `app/` — passed.
- `npm.cmd run test:unit` from `app/` — passed: 187 tests, 0 failures.
- `npm.cmd run build:vite` from `app/` — passed: main, preload, and renderer
  production bundles built.
- `npm.cmd run build:lab` from `app/` — passed: 91 modules transformed.
- `& .\node_modules\.bin\playwright.cmd test tests/conductor.spec.ts
  --workers=1 --grep "a dispatched run lives|a fresh confirmed dispatch|a
  stopped run posts|a worker's claims render"` from `app/`, with both app-token
  directories held — passed: 4 tests in 1.0 minute. It proves the normal-motion
  dispatch/worker/STOPPED path, the same stable Town under reduced motion, an
  honest STOPPED card with no DONE crossover, and RESULT return followed by
  verified DONE and correct keyboard focus.
- `git diff --check` — passed.
- `git diff --exit-code HEAD -- app/src/renderer/town/faces.ts` — passed with no
  output; the approved cast definitions are byte-identical to HEAD.
- A search for temporary Task 168 capture instrumentation — no matches.
- Final app custody check — no Electron process and neither app-token directory
  remained.
- Visual inspection — all 12 real-app fixture captures had no clipped Town,
  conversation, node, label, action, horizontal scroll, or unreadable packet
  overlap. The owner approved the result in this conversation.

Verification found and repaired three real edges inside the task: stale runtime
responses could repopulate a worker after terminal truth; renderer confirmation
could be mistaken for actual worker identity; and STOPPED evidence could hide a
later record-writing ERROR. The final reducer and unit coverage pin all three.
Two sub-second E2E assertions were also made deterministic by reading the motion
observer armed before dispatch, and internal Electron buttons now skip
Playwright's irrelevant page-navigation waiter while their intended UI results
remain explicitly asserted.

No dependency was installed or changed. No owner profile, credential, provider,
network service, real model, or paid call was used. Every Electron run used the
repository's fake conductor/worker, isolated profile, and both app tokens.

While the task was open, unrelated commit
`f16a2e1c8868b85dc09771949c498b1195ee502c` added only
`docs/superpowers/specs/2026-08-02-cairn-showing-not-asking-design.md` after the
Task 168 brief. It overlaps no Task 168 path and remains untouched; it is the
parent of the final exact-path Task 168 commit.

## How to try it

1. From `app/`, run `npm.cmd start` when no other Cairn app/test instance owns
   the app token.
2. Open a project and select Cairn. The existing conversation should open and
   focus inside the Town rather than navigating to a separate Chat place.
3. Approve a real worker task through the existing dispatch panel. Watch one
   TASK packet land at the routed worker, then one RESULT packet return to Cairn.
4. Compare a verified DONE result with a stopped task: the result card remains
   authoritative, and the pond, wording, and face state must stay distinct.

## Limitations and remaining judgment

Worker-question and answer/resume travel remains deliberately separate. The
current runtime exposes no paused-worker question state, so this task did not
fake that choreography from generic activity or chat text. A future capability
task must add the real protocol and its consent/risk semantics first.

The owner approved the implemented visual density, pond darkness, conversation
prominence, and motion feel. No further Task 168 judgment remains.

Milestone moved: **NO**
