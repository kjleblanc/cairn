# Task 063 — Brief

Requested visible outcome: make dispatch inline (Phase 3 Task 5). A task
proposed in chat is handed to the task screen today as a bare outcome
sentence: the owner's details are dropped at the door, the sentence is
re-typed into a form, and a fresh route lookup re-derives everything. After
this task, "Send to dispatch" opens a confirmation panel inside the
conversation — the outcome and the owner's details verbatim, the six facts of
the real call when the routed adapter declares one, and the same confirm box
the task screen uses — and the run starts from there. The app never navigates
away, and the request that runs is the one the owner just read.

The run request becomes one object (`TaskRunRequest`), because a positional
signature that quietly drops a part would dispatch something the owner never
confirmed. `details` then threads every app-side gate: the route disclosure,
the authorization handed to the codex adapter, the run-time disclosure gate,
and the contract `runSerialTask` builds. Task 3 (repo task 061) widened those
core seams and deliberately left `app/src/main/tasks.ts:77` and `:111` failing
`tsc --noEmit`; closing that breakage is this task's job.

Boundary of intent: `app/src/shared/ipc.ts`, `app/src/preload.ts`,
`app/src/main/tasks.ts`, `app/src/renderer/screens/Chat.tsx`,
`app/src/renderer/screens/TaskRun.tsx`, `app/src/renderer/App.tsx`, a new
`app/src/renderer/components/DisclosureConfirm.tsx`, `app/src/renderer/app.css`,
`app/tests/conductor.spec.ts` (the legacy "full loop" test asserts the retired
prefill navigation and cannot survive — rewriting it to the inline flow is
authorized and required), `app/tests/routing.spec.ts`,
`app/tests/serial.spec.ts` (call-site migration),
`app/tests/fixtures/fake-conductor.mjs`, plus this task's three record files.
No change to `core/`.

Checks that will show the outcome holds:

- `cd app && npx playwright test tests/conductor.spec.ts` — RED first on the
  rewritten full-loop test (no inline panel exists), then GREEN.
- `cd app && npx tsc --noEmit` — GREEN, closing Task 3's deliberate breakage.
- `cd app && npm run test:unit` and `npm run test:smoke` — whole suites green.
- The real lane's guard: a details-bearing dispatch through the fake-codex
  PATH shim is not refused, and the shim's own capture of what it received
  carries the owner's data.

DONE means: `taskRun(request)` and `taskRoute(dir, outcome, details,
adapterId?)` at every call site; `details` threads all four app-side gate
sites; `RunSessionSnapshot` carries `conversationId`; the inline panel always
shows outcome and details and renders the six-field disclosure plus confirm
box only when a disclosure exists; the Chat→TaskRun prefill navigation is
gone; app typecheck is green and both suites pass. STOPPED means any of those
does not hold.
