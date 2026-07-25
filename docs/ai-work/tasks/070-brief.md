# Task 070 — Brief

Requested visible outcome: Phase 3 Task 9 — the commentary turn. After the
envelope posts a result card, the conductor adds one short plain-language
comment on it, in its own voice, as an ordinary turn in the same conversation.

Task 068 gave the envelope a turn of its own and Task 069 made the prompt carry
the report's separation — what Cairn's runtime verified under one label, the
worker's claims under another. Neither gave the owner a sentence in plain words
about what the card means. This task does, and it does it as a comment on a
record that already exists: the card is written, announced, and on screen before
the comment begins, and nothing the comment says can change what the card says.

The comment is the ONE call Cairn makes that the owner did not ask for. Every
guard is arranged around that fact.

Details (verbatim):

- `commentary(dir, conversationId, card, onDelta): void` in
  `app/src/main/conductor/service.ts`. Messages: constitution + briefing + full
  history (the card arrives through Task 8's system-role mapping, so it reaches
  the model as `cardBriefing`'s two labeled parts) + one system instruction,
  last: "The envelope just posted the result card above. Add one short
  plain-language comment for the owner. State result facts only from the card or
  the records in your briefing, and name your source. Do not propose a task."
- It skips silently — spending nothing, saying nothing — when there is no stored
  connection, when a stream is already in flight for the project, or when
  `isTaskRunning(dir)`. It never retries, and it can never delay or block the
  card.
- The streaming body of `runStream` becomes a private `streamTurn(…, kind)`
  shared by both turns; the comment persists as a normal cairn turn with tokens
  and cost. `kind` also decides that a commentary turn proposes no task and that
  a commentary failure is logged and dropped rather than surfaced.
- `app/src/main/tasks.ts` calls it from the existing post-settle hook, strictly
  after the card is posted and announced, with an `onDelta` built from `win()`.
- `app/tests/fixtures/fake-conductor.mjs` keys a fixed commentary script off the
  LAST message being a system message that names the result card — a commentary
  request adds no user turn, so the old keying would replay a stale reply.

Checks that will show the outcome holds:

- `app/tests/conductor.spec.ts`, RED first, in both lanes: the mock lane for a
  comment following the card, and the fake-codex lane for the disconnected
  choreography — dispatch, disconnect mid-run, settle, reconnect, reopen — where
  the card must stand alone with no comment and no error.
- `npm run typecheck`, `npm run test:unit`, `npx playwright test` in `app`, and
  `cd core && npm test` — all green.

DONE means: a card posted while connected is followed by one short comment that
persists as an ordinary cairn turn, and a card posted while disconnected is
followed by nothing at all. STOPPED means the comment can delay, block, or
contradict the card, or a paid call can be attempted without a connection.
