# Task 070 — Report

Phase 3 Task 9: the commentary turn. The envelope posts its card; the conductor
then adds one short comment on it. Test-first in both Playwright lanes.

## What was built

`commentary(dir, conversationId, card, onDelta)` in
`app/src/main/conductor/service.ts`. It returns at once, and by the time it runs
the card is already written, already announced, and already on screen — so the
card cannot wait on it and cannot be changed by it. It skips silently, spending
nothing and saying nothing, on the three conditions the plan names: no stored
connection, a stream already in flight for the project, `isTaskRunning(dir)`.
It never retries.

The streaming body of `runStream` was extracted into a private
`streamTurn(dir, id, conn, controller, onDelta, kind)` rather than duplicated.
`kind` is `"reply" | "commentary"`, and it decides exactly three things:

| | reply | commentary |
|---|---|---|
| The envelope's instruction rides the prompt | no | yes, LAST |
| A task block in the answer reaches the owner | yes | no |
| A failure is surfaced to the owner | yes | no — logged and dropped |

The last two are the same judgment twice. The owner asked for a reply, so a
proposal is welcome there and a failure is theirs to see and retry. Nobody asked
for the comment, so it proposes nothing — "Do not propose a task" is enforced in
code as well as asked for in words — and a comment that fails leaves the card
standing alone instead of growing an error bubble and a "Try again" for a
question that was never asked.

The card reaches the model through Task 8's system-role mapping, which is
`cardBriefing` — Task 069's two labeled parts, verified facts and worker claims,
kept apart structurally. Nothing re-flattens it, and the unit assertion "a claim
must never sit under the verified label" still holds.

One guard beyond the plan's three, which is what makes the `card` parameter
load-bearing: the card must really be the last turn in the conversation the
model is about to read. `readTurns` DROPS an envelope line whose card fails its
guard, so a card that cannot be read back is a card the model cannot see, and
the instruction says "the card above". No card in the history, no comment.

`app/src/main/tasks.ts` calls it from the existing post-settle hook, after the
card is posted and its delta sent, with an `onDelta` built from `win()` exactly
like the activity sender. A card that failed to post is never commented on.

## Test-first, and what each RED actually proved

**The connected scenario, RED before any implementation existed:**

```
Locator:  locator('.chat-messages .result-card ~ .bubble-cairn')
Expected: 1
Received: 0
```

The sibling combinator is the assertion: the two replies that came BEFORE the
dispatch cannot satisfy it. Green after implementation, with the comment's own
text — a string only the fixture's commentary script produces, which is also the
proof that the fixture's new last-message keying fired and no stale reply was
replayed.

**The disconnected scenario could not RED before implementation**, and saying so
plainly matters more than a tidy sequence: before `commentary` existed, nothing
could post a comment, so the test passed vacuously. A negative guarantee is
proved by removing the guard, so the guard was staged out instead — `commentary`
made to fall back to a connection captured at send time, which is the plausible
wrong design (hold the connection you had, use it later):

```
Error: expect(locator).toHaveCount(expected) failed   // .bubble-system
Expected: 0
Received: 1
```

That staged run found a real defect **in the test**, not only in the staging.
The first version asserted the conversation's contents immediately after
reconnecting, and a wrongly-fired comment lands about 700ms after the card — so
the assertion sometimes ran before the harm arrived, and the test passed with
the guard removed. It now waits on something real instead of on nothing: after
reconnecting it sends a message and waits for the answer, which proves the
provider was reachable the whole time and gives a comment that should never have
started every chance to land. The assertion is then that the turn following the
card is the OWNER's own question, and the only Cairn turn after it is the answer
to it. With the guard staged out the test fails; with the guard restored it
passes. The staging was then removed in full — `service.ts` carries no trace of
it.

## The suite could have made a real paid call

`app/tests/routing.spec.ts` dispatches one run with `conversationId: "conv-1"`.
Since Task 8 that posts a result card; since this task it would also ask the
conductor to comment on it — a paid call against whatever connection is stored
on the machine running the suite, which on a developer's own machine is a real
key and a real provider account. `conductor.spec.ts` was already careful here;
nothing else was.

`conductor.spec.ts`'s own snapshot-and-restore helper moved to
`app/tests/fixtures/conductor-connection.ts` (ported verbatim, plus a
detach/restore pair), and `routing.spec.ts` now runs against no connection at
all and puts back exactly what it found. Any future spec that dispatches with a
conversation id needs the same two lines.

## The renderer needed no change, verified rather than assumed

The comment arrives over the ordinary delta path and renders as a cairn bubble.
Both new tests assert it at render level, and the reload/reattach tests still
pass unchanged.

## Checks run (all real, this session)

- `npm run typecheck` (app) — clean.
- `npm run test:unit` (app) — **tests 53 / pass 53 / fail 0**.
- `npx playwright test` (app) — **34 passed** (32 before, plus the two new
  tests), both lanes, in one run. The known connect-card flake did not appear;
  no rerun was needed.
- `cd core && npm test` — **tests 104 / pass 104 / fail 0**. Core untouched.
- The disconnect guard's discrimination check above: RED with the guard staged
  out, GREEN restored.

Files touched: `app/src/main/conductor/service.ts`, `app/src/main/tasks.ts`,
`app/tests/conductor.spec.ts`, `app/tests/routing.spec.ts`,
`app/tests/fixtures/fake-conductor.mjs`,
`app/tests/fixtures/conductor-connection.ts` (new),
`docs/ai-work/tasks/070-brief.md`, `docs/ai-work/tasks/070-report.md`,
`docs/ai-work/LOG.md`.

## Correction to the 069 report (append-only, per repo task 059)

The 069 report states "Both labels are `core/src/records.ts`'s own section
wording." Only the claims label is (`records.ts:191`); the verified label is the
plan's own string, and `records.ts:185` reads "## Verified by Cairn". The
behavior is correct — the plan's string names who did not write the card — only
the sentence was loose.

## Limitations and remaining human judgment

- **Ledgered: the quit drain.** A run cancelled by the quit grace still settles,
  still posts its card, and so still starts a comment — a paid call begun as the
  app exits, killed part-way by the process ending. `isQuitDraining()` is right
  there in `rungate.ts` and would close it, but it is a fourth skip condition the
  plan does not name, so it is recorded here for the owner rather than added
  quietly.
- **Ledgered: the composer during a comment.** The renderer shows no streaming
  bubble for a turn it did not start, so for the second or so a comment streams,
  the composer looks open while main would refuse a send with "Cairn is already
  answering for this project." Honest, but unexplained on screen. It is the same
  per-project lock that has always existed; only the reason is new.
- **Ledgered: an empty comment.** A model that answers with nothing (or with
  only a task block, which is stripped) persists an empty cairn turn and renders
  an empty bubble. Rare, harmless, and not guarded.
- The comment's honesty is a matter for the conductor eval, not for this task.
  The instruction holds it to the card and the briefing and tells it to name its
  source; whether a given model obeys is measured where model behavior is
  measured. Task 053's eval found one invented citation, and that finding stands.
- Milestone movement: NO. The owner can already see every result; this makes the
  result speak in plain words.

Disposition: DONE
