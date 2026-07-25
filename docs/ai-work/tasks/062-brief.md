# Task 062 — Brief

Requested visible outcome: build the app side of the owner-details channel
(Phase 3 Task 4). Task 3 (repo task 061) landed the core half — contract v2
carries `details` verbatim, the digest binds outcome and details together, and
the codex disclosure/authorization gate recomputes its expected card from both
parts. None of that reaches the owner yet: Cairn's own conductor parser still
drops any `details` key from a model's proposed-task block (it is not in the
allowed set), and the proposed-task card has no way to show it even if it
arrived. After this task the parser accepts `details` (a plain string, capped
at 2000 characters, trimmed, wrong shape drops the whole block — same
fail-closed rule as every other field), `TaskBlock` carries it, and the card
renders a "Details (sent verbatim)" section whenever it is non-empty.

Boundary of intent: `app/src/main/conductor/taskblock.ts`,
`app/src/shared/ipc.ts` (`TaskBlock`), `app/src/renderer/components/TaskCard.tsx`,
`app/src/renderer/screens/Chat.tsx` (thread the widened `onSend(outcome,
details)` signature — until Task 5 lands, Chat may still route outcome-only
into the existing TaskRun prefill navigation), `app/tests/fixtures/fake-conductor.mjs`,
`app/tests/conductor.spec.ts`, `app/tests-unit/taskblock.test.ts`, plus this
task's three record files. Do not thread `details` into `app/src/main/tasks.ts`
or the codex dispatch call — that is Task 5's scope.

Two additions carried into this task, both authorized in the dispatch brief:

1. Review-carried hardening from Task 3's review: the parser also rejects an
   `outcome` containing embedded newlines (`\r` or `\n`), because the
   confirmed disclosure card concatenates outcome and details into one string
   (`codexExecDisclosure`) — a multi-line outcome could otherwise impersonate a
   details section within that concatenation.
2. An authorized bridge for `app/src/main/tasks.ts:77` and `:111` (still
   calling `disclosure?.(outcome)` against the now two-parameter core seam,
   left unfixed by Task 3 on purpose), to be applied ONLY if this task's own
   build steps (`tsc -p tsconfig.unit.json`, or the Playwright build via
   `npm run build:vite`) actually sweep those call sites in and fail on them.

Checks that will show the outcome holds:

- `cd app && npm run test:unit` — RED first for content reasons (missing
  `details` field, no newline rejection), then GREEN across the whole suite.
- `cd app && npm run test:smoke` — the fixture's new details-bearing scripted
  reply renders a card whose "Details (sent verbatim)" section shows the text
  verbatim; the full Playwright suite stays green.
- `cd app && npm run typecheck` — confirms no NEW type errors beyond the two
  pre-existing, out-of-scope `tasks.ts` errors Task 3 already disclosed.

DONE means: `TaskBlock.details: string` ("" when absent); the parser accepts
`details` within its 2000-character cap and drops the whole block outside it or
on the wrong type; the parser rejects any `outcome` containing `\r` or `\n`;
`TaskCard` renders "Details (sent verbatim)" when `block.details` is non-empty
and calls `onSend(block.outcome, block.details)`; `Chat` compiles against the
widened signature; the fixture and Playwright suite prove the card renders
real details end to end. STOPPED means any of those does not hold or a suite
is not green.
