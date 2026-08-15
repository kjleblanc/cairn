# Task 241 brief - price the critic call, then make the first real one

**Lane:** A (the main checkout). **Base commit:** `b932d30`.

The second half of Slice 3 of
`docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md`, split from
Task 240 by the owner's scope decision. Task 240's report is prerequisite
reading; its `## Limitations` list is this task's scope.

## Owner decisions taken before this brief was claimed

- **The card works out its own cost ceiling from the provider's published
  prices.** The owner chose a keyless public catalog fetch over a fixed
  ceiling they set, and over showing token counts with no money at all. The
  fetch carries no project data and no credential.
- **This task makes the one real critic call**, using the connection the owner
  already has. That call still needs gate 3 on the exact call, given by the
  owner after reading the real card. Nothing here pre-approves it.
- **The packet does not change.** It stays exactly what Task 240 already sends:
  four artifacts, no file contents. The first real call should be the smallest
  one that proves the route, not the widest.

## Requested visible outcome

On the same unsealed-candidate card Task 240 ships, the offer now also states
what the call will cost at most, in money, and where that number came from -
for example "At most about $0.02, at the prices openrouter.ai publishes
today". Opening "Exactly what would be sent" shows the per-million input and
output prices it was worked out from, and the sizes it was applied to.

When Cairn cannot get a price - the catalog is unreachable, the provider
publishes none, or the connected model is not in it - the card says so in
those words and states the sizes instead. It never shows a made-up number, and
it never quietly omits the line.

Then, once and for real: the owner reads that card in their own Cairn, gives
gate 3 on that exact call, presses it, and sees genuine findings from a real
provider on their own task.

## Design choice recorded before the work

**Cairn authors a small keyless price lookup. It does not adopt
`app/src/main/connections/catalog.ts`.** `refreshCatalog`
(`app/src/main/connections/catalog.ts:217`) takes a `ModelConnectionDriver`
and calls `driver.fetchCatalog(...)`, but the only implementations are
`app/src/main/connections/drivers/fake.ts:109` and the interface at
`drivers/types.ts:59`. There is no real `openai-compatible` driver, so that
path cannot fetch anything today, and adopting it means writing the missing
driver and wiring `catalog-cache.ts` as well. That is bigger than the one
thing this task needs: the two published prices for one model id.

Its price *shape* is right and is copied: `{inputPerMillion, outputPerMillion,
currency}` held as canonical decimal **strings**
(`app/src/main/connections/schema.ts:230`), never floats, so money is never
carried in a type that cannot represent it exactly. The report restates this
with exact line references.

## Boundary of intent

- Preserve every Task 240 behaviour: the four-fact first screen, the fold, one
  call per approval, findings tied only to frozen `cN` rows, advisory notes,
  honest `unavailable`, and the owner's two untouched choices.
- Preserve every Slice 1 and Slice 2 behaviour, including the byte-identical
  close for a promise-free run and the result-card literal at
  `app/tests-unit/resultcard.test.ts:364`.
- The price lookup is **keyless**. It sends no `Authorization` header, no
  project data, no file names, no packet, and no credential. If it cannot be
  done without a credential for a given provider, it is not done at all and
  the card says the price is unknown.
- One attempt. The lookup gets no retry, no fallback provider, and no second
  route, exactly like the critic call itself.
- A failed or slow lookup must never delay, break, or block the pause. The
  pause is a run holding its lock; a price is a nicety and must behave like
  one.
- Cairn never invents, rounds down, or estimates a price it did not read. A
  ceiling is a worst case over the real packet size and the real output cap,
  computed upward.
- Do not widen the packet. No file contents, no new artifact, no new row.
- Do not activate or import: repair, Slice 4, Q8/Q9, activation tuples, route
  fingerprints, custody, persistence, the Task 224-233 Builder machinery, or
  the dormant driver/catalog-cache subsystem.
- Do not touch `app/src/main/builderlivetransport.ts`. Its nine failing tests
  and the red `cli` typecheck from Task 211 are pre-existing and not this
  task's.
- Never ask the owner to paste a key. Never print, copy, commit, or log a
  secret. Do not read or inspect the stored connection file or the owner's
  login; the owner operates that UI personally.
- Before any app or Playwright run, take the app token with
  `mkdir %TEMP%\cairn-app-token` and release it in a `finally` only if this
  run created it.
- **The one real call needs the owner's gate 3 on that exact call, given in
  conversation after they have read the real card.** Approval for the price
  lookup is not approval for the model call.

## Checks

1. **`c1` - the offer states a maximum cost in money and says where it came
   from.** Proved through the ordinary Chat route against a fixture catalog,
   and visible on the card.
2. **`c2` - the per-million prices and the sizes they were applied to are
   visible in the fold.** The owner can check the arithmetic themselves.
3. **`c3` - when no price can be had, the card says so and invents nothing.**
   Unreachable catalog, malformed catalog, and a model absent from the catalog
   each produce the same honest sentence and no number.
4. **`c4` - the lookup is keyless and carries nothing of the project.** The
   fixture asserts the recorded request has no `Authorization` header and no
   body, and names no project path, file, or packet content.
5. **`c5` - the ceiling is a true worst case for the packet actually sent.**
   Arithmetic is checked against known prices and known sizes, computed
   upward, in decimal strings rather than floats.
6. **`c6` - a failed or slow lookup never delays or breaks the pause.** One
   attempt, no retry; the candidate still appears, the critic can still be
   approved or skipped, and the run still closes.
7. **`c7` - every Task 240 and Slice 1-2 behaviour still holds**, including
   the full `core/test/serial.test.js` run and the containment guards.
8. **`c8` - focused machine checks pass**, each named with its exact command
   and its real result in the report.
9. **`c9` - one real critic call is made, and only one.** After the owner gives
   gate 3 on the exact call, Cairn makes exactly one request to the owner's
   connected provider and shows what came back. The report records the
   provider, model, packet size, the stated ceiling, the zero-retry rule, the
   owner's approval in their own words, and - honestly - whatever the provider
   reported about usage and cost, or that it reported nothing. If a router
   served it, the report states plainly that Cairn cannot attest which upstream
   physically answered.
10. **`c10` - the owner judges the real result.** They see the findings from a
    real model on their own task and answer: "Is this a useful second opinion,
    and is it clear that Cairn has not acted on it?"

## DONE and STOPPED

**DONE** means the cost line holds through the ordinary Chat path, checks
`c1`-`c8` pass, one real call was made under the owner's explicit gate 3, and
`c9` and `c10` carry the owner's own words. A passing fixture test is not DONE
for `c9`.

**STOPPED** means the price cannot be read without a credential or without
widening what is sent; or the lookup cannot be made not to block the pause; or
the owner declines gate 3 after reading the card, which is a legitimate end and
not a failure; or the real call reveals a defect that cannot be fixed inside
this task's boundary; or the same blocker has stopped this slice twice.

A response gate must never demand the provider prove something it cannot.
Task 233 got HTTP 200, refused its own paid answer because the gate required
the router to prove which upstream served it, and discarded the evidence, so
that call's real cost is permanently unknown. Response checks here test
Cairn's own correctness: absent facts are allowed, only contradicting ones
refuse.

The milestone does not move here. Slice 4 does not begin.
