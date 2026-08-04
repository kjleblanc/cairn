# Task 178 brief - authenticated accepted-request cards and persistence

**Lane:** B

**Base commit:** `dc735234722f3f69deb82a9b9fc28e50ff21d508`

## Requested visible outcome

Implement Plan 4's fourth ordered slice. Every new envelope ResultCard must
persist one explicit, authenticated accepted-request state:

- a present `TaskRequestView` for an accepted DONE, STOPPED, or thrown ERROR;
- `null` for a new card whose path never accepted a task; and
- no `acceptedRequest` property at all for a legacy card.

The view must come only from Core's composed record input for DONE/STOPPED, or
from main's already-retained accepted view for an ERROR after acceptance. The
conversation store must authenticate the card's original shape and bytes before
it applies any compatibility interpretation. A malformed present view is
dropped, and adding, removing, or changing any visible request byte invalidates
the existing out-of-project card marker.

When an authenticated card is supplied to the connected conductor for its one
post-run comment, `cardBriefing()` must keep three structurally separate parts:
Cairn-verified facts, worker claims, and `The accepted request (source-marked;
not a result fact)`. The request part may contain only visible source labels,
interpretations, and exact owner quotations. Context notes, source IDs and
offsets, evidence IDs and images, captions, paths, metadata, and arbitrary card
extras must not enter it.

## Boundary of intent - what must not change

- `acceptedRequest` is output-only compatibility data. Renderer values,
  conversation prose, worker claims, project files, and stored cards never
  become dispatch authority.
- Task 177 remains the acceptance authority. This task does not alter preview
  generation, proposal consumption, route/disclosure authorization, Core's v3
  contract, worker v2, or the one-time Start/Run gate.
- Absent, `null`, and present are distinct wire states. The store must not add a
  default before `cardauth.ts` checks the exact original card digest, and legacy
  marker compatibility remains fail-closed under project aliases.
- Existing result-card custody, transcript ordering, replay suppression, and
  forged project-line refusal remain intact. Strict validation may reject a bad
  present view but may not make a previously invalid card valid.
- Task 173 evidence remains local and first-class but never enters conductor
  request context. The connected-conductor `DATA_SCOPE` and all owner consent
  wording remain byte-identical; no new provider data category is introduced.
- ResultCard rendering, the legacy owner-facing sentence, final desktop
  ordering/accessibility/CSS are Plan 4 Task 5. Phone rendering and 390-pixel
  bridge behavior are Task 6. Neither is implemented here.
- No dependency, credential, real/paid model call, provider connection,
  Electron run, external write, publish, push, project fact, or milestone
  change is in scope.
- Source changes stay within Plan 4 Task 4's named App card/store/test files,
  plus the required `app/src/main/tasks.ts` call seam that alone holds the
  accepted ERROR view. Any further adjacent correction must be disclosed.

## Implementation plan (AI decisions)

1. Add red ResultCard composition tests for DONE, STOPPED, connection-required,
   accepted ERROR, and unaccepted ERROR, pinning present/null/absent semantics
   and defensive copying from the only authoritative inputs.
2. Add the optional compatibility field to the shared card type; copy Core's
   composed view in `composeResultCard()` and accept a main-retained view in
   `composeErrorCard()` only after Task 177's acceptance point.
3. Add strict, bounded, exact-shape request-view validation in `store.ts` while
   preserving original-card marker verification order and legacy absence.
4. Add the separately labelled request-context block to `cardBriefing()` with
   a deliberate whitelist, then prove claims, context notes, Task 173 evidence,
   arbitrary extras, and hidden attribution fields stay out.
5. Pin unchanged consent wording and exercise persistence, reload, forged
   attribution, marker mismatch, alias/replay, and malformed-view cases before
   running the complete App unit/type/build checks and independent review.

## Checks that will show the outcome holds

1. `app/tests-unit/resultcard.test.ts` proves DONE and STOPPED copy only
   `SerialRunResult.composed.acceptedRequest`, accepted ERROR uses only main's
   retained view, connection/unaccepted paths use `null`, and legacy cards keep
   the property absent.
2. Store tests prove exact source/row/array shapes and bounds, absent/null/present
   round trips, malformed present views fail before persistence/display, and a
   marker for the original shape cannot authorize an added, removed, or edited
   request.
3. Existing alias, replay, forged envelope, transcript-order, and marker-store
   tests remain green; new assertions prove project/conversation/worker values
   cannot manufacture attribution.
4. Commentary tests prove exactly three separated blocks and whitelist only the
   visible request projection; owner/source custody fields, context notes,
   evidence metadata/images/paths, worker claims, and arbitrary extras never
   cross between blocks.
5. The consent test pins the pre-task `DATA_SCOPE` byte-for-byte, and Task 173
   evidence exclusion remains executable.
6. `npm.cmd run test:unit`, `npm.cmd run typecheck`, `npm.cmd run build:vite`,
   and `npm.cmd run build:lab` in `app/`; proportionate Core/CLI compatibility;
   independent review; `git diff --check`; and exact final status all pass.

## DONE and STOPPED

- **DONE:** every new ResultCard has the correct explicit accepted-request
  state; only Core composition or main's post-accept retained view can supply a
  present request; original bytes are marker-bound and strictly validated on
  reload; legacy absence stays absent; conductor commentary receives a third
  separately labelled and narrowly whitelisted block; consent and Task 173
  evidence boundaries remain unchanged; and all named checks pass.
- **STOPPED:** any output or project-controlled value can supply attribution,
  legacy cards are guessed into a new state before authentication, a malformed
  view survives, a marker authorizes changed request bytes, accepted ERROR
  loses the request, claims/evidence/context cross into the request block,
  consent must widen, Task 5/6 presentation becomes necessary, protected work
  changes unexpectedly, or completion requires a dependency, provider, paid,
  external, destructive, or otherwise out-of-scope action.
