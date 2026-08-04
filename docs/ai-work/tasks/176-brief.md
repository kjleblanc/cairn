# Task 176 brief - authenticated owner turns and inert conductor actions

**Lane:** B

**Base commit:** `66e24431b0012f4b876e96b2dfcd9fd0128e9fb3`

## Requested visible outcome

Implement Plan 4's second additive slice: Cairn's main process can prove which
raw owner turns it accepted, bind a conductor's source-marked task candidate to
only those authenticated turns, and retain exactly one inert question or task
action for the current project/conversation.

The new path must:

- write a main-owned marker outside the selected project before an owner turn
  is persisted or sent to a provider;
- preserve every accepted owner code unit and bind markers to project,
  conversation, turn UUID, timestamp, raw text, and bounded inert reply context;
- parse at most one exact `cairn-question` or new `{intent, risks}`
  `cairn-task` candidate, strip all control fences from visible prose, and bind
  owner quotations only to authenticated turns in the exact provider snapshot;
- issue action and risk IDs in main, expose only an output-safe projection, and
  keep the bound `TaskIntent` private to main;
- persist question wording as passive conversation text while never restoring
  live controls from project-writable history; and
- retire current action state on the next successfully appended owner turn,
  carrying a bounded, ID-free snapshot of what the owner answered, deferred,
  set aside, or corrected into that turn's authenticated provider context.

This task makes actions trustworthy and inert. It does not yet switch dispatch,
adapter, Core serial, record, result-card, phone, or renderer task-control
signatures; that remains Plan 4 ordered implementation task 3 and later.

## Boundary of intent - what must not change

- Existing legacy conversation history remains readable but can never be
  guessed into **You said so** or **You weren't sure** provenance.
- Existing shipped task proposal/dispatch behavior stays compatible until the
  later one-green-vertical-slice migration. New action state carries no direct
  dispatch authority and renderer-supplied action/source data is never trusted.
- A marker failure refuses before conversation persistence and before any
  provider call. An orphan marker after a later append failure is harmless.
- Main accepts no whitespace-only owner message but preserves the complete raw
  string, including outer spaces and line breaks, for every accepted message.
- Action use is single-current and exact: stale, wrong-project,
  wrong-conversation, wrong-action, wrong-risk, duplicate, and commentary paths
  fail closed before append or provider use. Provider/parse failure cannot
  resurrect retired state.
- The Plan 4/Task 175 limits and validation remain authoritative: complete raw
  task envelope at most 12,000 UTF-16 code units, one question or task only,
  at most three risks, exact source matching, and output-only request views.
- No dependency, provider data-scope expansion, consent wording change,
  credential use, paid/real model call, external write, publish, push, project
  fact, or milestone change is in scope.
- Source changes stay within Plan 4 Task 2's named App main/shared/preload,
  constitution, test, and unit-config paths plus this task's records unless a
  required adjacent correction is disclosed.

## Implementation plan (AI decisions)

1. Reuse the demonstrated `cardauth.ts` custody boundary for a separate
   owner-turn marker store under Electron `userData`, with exact-shape,
   bounded, atomic marker validation and no secret material.
2. Add dedicated store helpers that append authenticated owner turns and read
   only marker-matching turns, de-duplicated by turn UUID and intersected with
   the exact history snapshot used for a reply.
3. Extend the task-block parser with exact, bounded question and new task
   candidate envelopes. Validate the outer body before the inner Task 175
   intent, reject mixed/duplicate controls, and remove every control fence from
   visible conversation prose.
4. Add main-owned current-action state and safe projections. Generate all
   action/risk IDs in main, retain the bound intent privately, persist passive
   question text, and forbid commentary from creating actions.
5. Authenticate bounded inert reply-context snapshots on owner answers,
   deferrals, risk dismissal, and corrections; retire state exactly once and
   include only the ID-free snapshot in provider history/retries.
6. Wire marker-root configuration and additive IPC/preload/shared types without
   migrating task routing or renderer controls in this task.
7. Update the constitution and add red/green unit plus fake-only Electron tests
   for raw bytes, marker ordering/failure, source binding, legacy refusal,
   passive questions, remount/relaunch, retry, action/risk identity, clearing,
   and commentary exclusion.

## Checks that will show the outcome holds

1. Focused unit tests prove marker bytes and ordering, exact raw text, bounded
   reply context, de-duplication, exact-history intersection, edited/unmarked
   legacy refusal, and failure before provider/persistence.
2. Task-block tests prove exact question/task shapes and bounds, complete outer
   candidate limit, source binding, mixed/duplicate rejection, complete control
   fence removal, and no model-supplied IDs or offsets.
3. Service/store/IPC tests prove main-issued action/risk IDs, output-only
   projection, one current action, exact reply targeting, clear-on-owner-turn,
   failure/retry context, remount continuity, relaunch non-restoration, and no
   commentary actions.
4. The focused fake-only `app/tests/conductor.spec.ts` checks pass while holding
   the app token; no real conductor or worker call is made.
5. `npm.cmd run test:unit`, `npm.cmd run typecheck`, `npm.cmd run build:vite`,
   and `npm.cmd run build:lab` pass in `app/`; existing Core and CLI suites stay
   green; no data-scope or legacy dispatch signature changes.
6. Independent read-only review finds no remaining custody, replay, parsing,
   compatibility, lifecycle, or executable-evidence blocker; `git diff --check`
   and final exact status match only disclosed task paths.

## DONE and STOPPED

- **DONE:** owner turns have main-owned external markers; only authenticated
  snapshot turns can support a bound task intent; exactly one inert current
  action with main-issued IDs survives remount but not relaunch; reply context
  remains intelligible across failure/retry; all focused and compatibility
  checks pass; and the exact changes land with one report and one log row.
- **STOPPED:** provenance depends on project-writable history, raw owner bytes
  are normalized, a marker failure can spend/provider-persist, stale or forged
  action data can affect a turn, controls revive after failure/relaunch,
  commentary can create actions, protected work changes unexpectedly, or the
  requested guarantees require the out-of-scope dispatch migration.
