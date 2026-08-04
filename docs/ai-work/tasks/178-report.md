# Task 178 report - authenticated accepted-request cards and persistence

**Lane:** B

**Base commit:** `dc735234722f3f69deb82a9b9fc28e50ff21d508`

**Brief commit:** `e71b509`

**Milestone moved:** NO

## Outcome

Plan 4's fourth ordered slice is complete. Every newly composed ResultCard now
owns one explicit accepted-request state: the source-marked `TaskRequestView`
for an accepted DONE, STOPPED, or thrown ERROR; `null` for a new card whose path
accepted no task; and no property for a legacy card that never carried one.

DONE and STOPPED cards copy only Core's composed request view. ERROR cards copy
only the view main retained at Task 177's atomic acceptance point, including an
error thrown during accepted setup. The retained view is detached before it is
persisted, and renderer text, conversation prose, worker claims, project data,
and a later session lookup never become attribution authority.

The conversation store preserves absent, null, and present as distinct wire
states. It validates a present view with Core's exact shape and bounds, rejects
impossible duplicate visible rows, and calculates custody from the original
card bytes. Adding, removing, or changing `acceptedRequest` without a new
out-of-project marker therefore drops the whole envelope line; no compatibility
default is inserted before authentication.

The conductor's post-run briefing remains structurally separated. A present
request adds exactly one third block headed `The accepted request
(source-marked; not a result fact)`. That block is rebuilt from a whitelist of
friendly source label, interpretation, and exact owner quotation only. Claims,
context, source IDs and offsets, evidence identities and images, captions,
paths, metadata, and arbitrary extras do not enter it. Null and legacy cards
retain the two existing blocks.

Result-card rendering is deliberately unchanged here. Desktop presentation is
Plan 4 Task 5, phone presentation is Task 6, and full attribution E2E/evaluation
is Task 7.

## What changed

- `app/src/shared/ipc.ts` adds the optional compatibility field
  `acceptedRequest?: TaskRequestView | null` and documents that it is
  source-marked context, not a verified result fact.
- `app/src/main/conductor/relay.ts` deep-copies the accepted view from the only
  authoritative normal/error inputs, gives every new blank card an explicit
  null state, and builds the present-only third briefing block from a narrow
  field and label whitelist.
- `app/src/main/conductor/store.ts` adds proxy-safe, accessor-free, exact-record
  and dense-array inspection for a present view. It enforces Core's 300/500/
  2,000-character row caps, eight-requirement cap, 6,000 visible UTF-16-unit
  total, source/quotation relationship, well-formed text, and exact
  `[source, text, ownerText]` uniqueness while leaving the original card
  untouched for digest authentication.
- `app/src/main/tasks.ts` captures the output-only request at the acceptance
  point, retains it across accepted setup and Core/run errors, and hoists the
  existing authenticated card-post/comment order so an early accepted error
  gets the same result card. Manual task-screen runs still post no conversation
  card.
- `app/tests-unit/resultcard.test.ts` covers DONE/STOPPED/error copying,
  accepted caller wiring, explicit null and legacy absence, add/remove/edit
  marker invalidation, exact malformed shapes and bounds, 6,000/6,001 totals,
  duplicate/distinct row semantics, alias compatibility, replay and
  cross-conversation refusal, forged attribution, exact briefing output, and
  private data exclusion.
- `docs/ai-work/tasks/178-brief.md` claimed this task before source work.
- `docs/ai-work/tasks/178-report.md` is this report.
- `docs/ai-work/LOG.md` receives the one truthful Task 178 row.

No dependency, provider data scope, consent wording, evidence format, renderer,
phone UI, project fact, milestone, external service, publish, push, deployment,
or production data changed.

## AI decisions and review record

- The optional field is intentional compatibility: new cards always own the
  property, while historical authenticated bytes remain absent and are never
  rewritten into null.
- Main captures the request immediately after one-time acceptance. Normal
  closes still use Core's composed record input; exceptional closes do not ask
  renderer, conversation, or mutable session state to reconstruct provenance.
- Store validation mirrors the subset of Core invariants visible in the
  redacted view. Exact visible duplicates are impossible because identical
  quotations canonically bind to the same owner span; rows differing in source,
  interpretation, or quotation remain valid.
- Provider context is rebuilt rather than spread. Friendly labels replace
  protocol enums, and only the three approved visible row fields can cross the
  existing connected-conductor seam.
- Initial red-first compilation failed on the deliberately missing ResultCard
  field and old error-card signature. During review, a new marker-backed test
  then failed because the first validator accepted exact duplicate visible
  rows. The validator repair moved that focused suite from 17/18 to 18/18.
- Independent review also found missing removal coverage, no direct pin on the
  three accepted ERROR callers, newly non-legacy alias fixtures, a broad
  substring-only briefing assertion, and comments that still described two
  blocks. All were corrected before the final checks. Final reviewers reported
  no remaining actionable P0-P3 finding.

## Checks run and real results

1. `cd app && npx.cmd tsc -p tsconfig.unit.json`, then
   `node --test dist-unit/tests-unit/resultcard.test.js`
   - Final focused result: **18 tests, 18 passed, 0 failed**. The review-added
     duplicate case first failed against the old validator, then passed after
     the exact visible-row uniqueness repair.
2. `cd app && npm.cmd run test:unit`
   - Passed from the final source tree: **351 total, 349 passed, 0 failed, 2
     platform-specific skips**. The existing consent test kept the shared data
     scope sentence byte-identical, and the Task 173 evidence/custody suites
     remained green.
3. `cd app && npm.cmd run typecheck`
   - Passed with no TypeScript errors.
4. `cd app && npm.cmd run build:vite`
   - Passed: main, preload, and renderer production bundles built. The first
     restricted attempt was denied dependency-path traversal by the sandbox;
     the same local build passed with the required worktree read allowance.
5. `cd app && npm.cmd run build:lab`
   - Passed: the design-lab production bundle built. Its earlier restricted
     attempt had the same sandbox-only traversal denial and passed with the
     required worktree read allowance.
6. `cd core && npm.cmd test`
   - Passed during this task: **178 tests, 178 passed, 0 failed**. The final
     repair changed App store/tests only; Core remained byte-identical.
7. `cd cli && npm.cmd test`
   - Passed during this task: **23 tests, 23 passed, 0 failed**. CLI remained
     byte-identical.
8. Independent specification, test, and security/data-flow review; `git diff
   --check`; exact changed-path and final-status inspection
   - Passed with no remaining actionable finding. Generated build/test output
     stayed ignored, and only the disclosed task paths were modified.

No Electron, Playwright, installed worker, provider connection, or real/paid
model process was launched for Task 178.

## How to try it

1. From `app/`, run `npm.cmd run test:unit`.
2. In the output, find the ResultCard cases for the three wire states, original
   request shape, malformed marker-backed views, accepted error callers,
   alias/replay custody, and the three-part conductor briefing.
3. For the quickest focused rerun, use
   `node --test dist-unit/tests-unit/resultcard.test.js` after the unit compile.

The accepted request is not yet drawn on the desktop or phone result card; that
visible presentation begins in the next ordered task.

## Limitations and remaining judgment

- Desktop rendering, final ordering, wording, keyboard/focus behavior, live
  regions, and narrow-window presentation remain Task 5.
- Phone rendering and 390-pixel bridge behavior remain Task 6.
- Full fake-run attribution E2E and evaluation coverage remains Task 7. This
  slice pins accepted ERROR production callers at the source seam without
  launching Electron.
- Historical cards remain byte-for-byte historical: absence is preserved and
  never backfilled with a guessed request.

Disposition: **DONE**
