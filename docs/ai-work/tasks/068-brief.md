# Task 068 — Brief

Requested visible outcome: Phase 3 Task 8 — the envelope speaks every result.
A run that reaches any terminal state posts a result card into the conversation
that dispatched it, as a new conversation role the model cannot author.

Until now the conversation went silent when a run finished: the status strip
above the composer carried a one-line terminal state and nothing else, and the
only full account lived in `docs/ai-work`. This task gives the ENVELOPE a turn
of its own. The card is built deterministically in the main process from
`result.composed` — the structured record input Task 066 carried out of core,
the very value Cairn rendered its own report from — so the card and the record
on disk cannot become two accounts of one run. Nothing is scraped from rendered
Markdown, and nothing is asked of the conversation model.

The split the card exists to hold: Git's answer for what changed, the real
protected-work finding, and the real commit result are Cairn's own verification;
the worker's summary and milestone are CLAIMS and are rendered under a heading
that says so. They are never merged into a verified line.

Details (verbatim):

- `ResultCard` (`app/src/shared/ipc.ts`): `kind`, `disposition`
  (`DONE | STOPPED | ERROR`), `taskNumber`, `stopReason`, `errorCode`,
  `filesChanged`, `protectedIntact`, `commit`, `evidenceSummary`, `claims`
  (`{summary, milestone}`), `route` (`{adapterLabel, provider, model}`).
- `ConductorTurn` becomes a union: the existing owner/cairn arm, plus
  `{ role: "envelope"; card: ResultCard; ts: string }`.
- `app/src/main/conductor/relay.ts` exports `composeResultCard`,
  `composeErrorCard`, and `postResultCard`. The connection-required arm carries
  no `composed` and maps to a STOPPED card with the fixed code
  `CONNECTION_REQUIRED` and no task, files, or route.
- The post-settle hook in `app/src/main/tasks.ts` chains on the SETTLED run
  promise, after `settlements.set(dir, run)`, so it runs after the run closure's
  `finally` and the running set is already clear. It posts only when the request
  carried a `conversationId`, and it depends on nothing that
  `task:acknowledge` may have deleted.
- Fail-closed: a stored envelope line whose `card` is not a result card is
  DROPPED by `readTurns`, never coerced.

Checks that will show the outcome holds:

- `app/tests-unit/resultcard.test.ts` — RED first — covering the done card's
  Git-derived files, the stopped card's fixed reason, the connection-required
  mapping, the error card's fixed code, the store round-trip and drop, and the
  `listConversations` preview of a card-first conversation.
- `app/tests/conductor.spec.ts` in BOTH lanes: the mock lane for a DONE card
  rendering and surviving a reload, and the fake-codex lane for a stopped run's
  honest card.
- `npm run typecheck`, `npm run test:unit`, `npx playwright test` in `app`, and
  `cd core && npm test` — all green.

DONE means: every terminal run posts one card, built from envelope truth only,
with worker claims visibly labeled as claims. STOPPED means the card cannot be
built without reading something the conversation model wrote, or a terminal
state exists that posts nothing.
