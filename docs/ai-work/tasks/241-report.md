# Task 241 report - price the critic call, then make the first real one

**Lane:** A (the main checkout). **Base commit:** `b932d30`.
**Brief claim commit:** `6baf3c0`.

The second half of Slice 3 of
`docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md`.

## Outcome: STOPPED, with the pricing shipped and the real call never made

The card now names what a review costs before the owner presses anything. It
reads, from the owner's own connected provider's published prices:

> At most about USD 0.0852, at the prices openrouter.ai publishes today.

and behind the fold, the working: the per-million input and output prices, the
character count they were applied to, the token bounds, and that it rounds up.
When no price can be read it says so in those words and shows no number.

**No real critic call was made.** Gate 3 was never reached, so `c9` and `c10`
are NOT REACHED and this is STOPPED rather than DONE. That is not a code
failure - everything `c1` through `c8` asked for is built and green. Two things
in front of it stopped the owner getting there, and the second was mine.

## What actually changed

Core (3 files):

- `core/src/critique.ts` - the cost bound and the per-token to per-million
  conversion, both integer-only.
- `core/test/critique.test.ts` - 6 more tests, 28 total.
- `core/src/index.ts` - exports the four new symbols.

App (7 files):

- `app/src/shared/critique.ts` - `CandidateCritiqueCostV1`, and **three literal
  NUL bytes removed**. See below.
- `app/src/main/critique.ts` - `attachCandidateCritiquePrice`, the keyless
  lookup.
- `app/src/main/tasks.ts` - fires the lookup without awaiting it, and publishes
  the priced offer onto the polled session.
- `app/src/renderer/components/CandidateCritique.tsx` - the cost line and the
  arithmetic behind it.
- `app/src/renderer/components/UnsealedCandidate.tsx` - a `critique` slot
  rendered above the two buttons.
- `app/src/renderer/screens/Chat.tsx` - passes the card into that slot instead
  of rendering it as a sibling.
- `app/src/renderer/app.css`, `app/tests/fixtures/fake-conductor.mjs`,
  `app/tests/conductor.spec.ts` - styling, a keyless `/v1/models` route, and
  the ordering check.

One real network request was made during development, disclosed here: a single
keyless `GET https://openrouter.ai/api/v1/models`, carrying no credential and
no project data, to read the real catalog shape before writing a parser for it.
No model was called and nothing was charged. No credential was read, printed,
copied or logged. The owner's stored connection was never inspected.

## The decision, and why

**Cairn authors a small keyless price lookup; it adopts nothing from
`app/src/main/connections/catalog.ts`.** `refreshCatalog`
(`app/src/main/connections/catalog.ts:217`) takes a `ModelConnectionDriver` and
calls `driver.fetchCatalog(...)`, but the only implementations are
`app/src/main/connections/drivers/fake.ts:109` and the interface at
`drivers/types.ts:59`. There is no real `openai-compatible` driver, so that
path cannot fetch anything today. This is the third time this slice has met the
same shape: a complete-looking subsystem whose live path does not exist.

Its price *shape* is copied, and it was right to:
`{inputPerMillion, outputPerMillion, currency}` as canonical decimal strings
(`app/src/main/connections/schema.ts:230`). Money never becomes a float
anywhere in this task - the ceiling is computed in scaled `BigInt` units and
rounded up.

**I checked the catalog shape against the real endpoint rather than from
documentation.** That is Task 233's lesson applied directly, and it mattered:
OpenRouter publishes `pricing.prompt` as a **per-token** string (`"0.000015"`),
not per million. A parser written from memory would have been wrong by a factor
of a million, and the card would have shown a confident, badly wrong number.

## Three defects, two of them mine from Task 240

**1. Task 240 shipped three literal NUL bytes.** `app/src/shared/critique.ts`
carried raw `U+0000` in `keys.join(...)` where the neighbouring
`app/src/main/unsealedcandidate.ts:143` writes the two-character escape. It
compiled, behaved identically, and made the file binary to git, grep and any
reviewer - so nothing caught it. It is committed in `b932d30`. Fixed here, and
I audited all fifteen files Task 240 touched: only that one was affected. I had
checked the records and the Core files for stray bytes and never this one.

**2. The price landed in Main and never reached the screen.** My unit test
asserted `currentCandidateCritique(DIR)` - the module's own state - while the
renderer reads `session.unsealedCandidateCritique`, set once when the pause
opens. The unit test passed throughout; only driving the real UI exposed it.
Fixed by publishing the priced offer onto the polled session, guarded so a
price can only land on the checkpoint still on screen.

**3. The critic offer rendered BELOW the buttons that end the pause.** This is
the one that cost the owner their attempt. `Chat.tsx` rendered the offer as a
sibling after `UnsealedCandidateCard`, whose last element is Continue/Stop. The
owner read down the card, reached the decision, took it, and never saw the
offer. Their words: *"I think I missed it or skipped through it."* They did not
miss it; it was unreachable.

My E2E could not have caught this. It screenshotted `.candidate-critique` in
isolation, so the component looked correct and was unreachable in the page it
lived in. Fixed by making the offer a slot inside the candidate card rendered
above its actions, proved by a document-order check, and the screenshots now
capture the whole candidate rather than the component.

## A defect found next door, not fixed here

Ordinary Chat now refuses to send on the Cairn repo itself:

> "Cairn did not send this because the project briefing and conversation
> together are too large."

`app/src/main/conductor/context.ts:604` builds the work-log briefing section
from **every** row of `LOG.md` with no cap, while every other section is
clipped. Measured: 236 rows, 133,272 characters, against a `PROMPT_CHAR_LIMIT`
of 200,000 (`app/src/main/conductor/transports/types.ts:108`) - **67% of the
whole prompt budget**, growing with every task forever. My own Task 240 row is
1,614 characters of it.

Not fixed here: what to drop is a design decision about what Cairn should know
of its own history, and it would have blown this task's scope. Raised as its
own task, which the owner started; it claimed task 242. **It blocks Slice 5**,
which cannot run while Cairn cannot be talked to about itself.

## Check results

### `c1` - the offer states a maximum cost and where it came from: PASSED

Proved through the ordinary Chat route against a fixture catalog carrying the
real OpenRouter shape. The card shows `data-cost="known"` and the sentence
above.

### `c2` - the prices and sizes are visible in the fold: PASSED

`Worked out from USD 15 per million in and USD 75 per million out, applied to
1670 characters (at most 557 tokens) in and at most 1024 tokens back, rounded
up.` The E2E opens the fold and asserts it.

### `c3` - no price is said plainly, never guessed: PASSED

Six shapes covered - thrown transport, non-200, unparseable body, empty
catalog, entry without pricing, and the model absent - each producing
`known: false` with a reason and no number, one attempt each.

### `c4` - the lookup is keyless and carries nothing of the project: PASSED

The unit fixture asserts no `authorization` header and an empty body; the E2E
asserts `lastCatalogAuthorization()` is null.

### `c5` - the ceiling is a true worst case: PASSED

Over the whole prompt including the system message, at three characters per
token where English runs nearer four, against the declared 1,024-token output
cap, in scaled `BigInt` units, rounded up. Tested against a price whose exact
product needs more precision than the display, and against `0.1`/`0.2`, which
no binary float holds exactly.

### `c6` - a failed lookup never delays or breaks the pause: PASSED

The offer opens with `cost: null` before any network call - asserted by `the
offer opens at once, with no price and no network call yet` - and a failed
lookup leaves the card pressable and the run closing normally.

### `c7` - every Task 240 and Slice 1-3 behaviour still holds: PASSED

Core `489 tests, 479 pass, 0 fail, 10 skipped`, `serial.test.js` included. All
eight containment guards pass unrelaxed.

### `c8` - focused machine checks: PASSED, with the known unrelated reds

| Command | Result |
|---|---|
| `core: npm run build` | PASS |
| `core: npm test` | **489 tests, 479 pass, 0 fail, 10 skipped** |
| `app: npx tsc --noEmit` | PASS |
| `app: node --test dist-unit/tests-unit/*.test.js` | **926 tests, 915 pass, 9 fail, 2 skipped** |
| `app: npx playwright test tests/conductor.spec.ts -g "one review\|refused review\|skipping asks nobody"` | **3 passed** |

The nine app-unit failures are the pre-existing Task 224/231/233 Builder
machinery, unchanged from the 907/896/9/2 baseline plus this slice's additions.
The full Playwright file does not complete in one pass on this machine: three
runs failed on three different tests, two of which pass in isolation, each run
aborting near test 39 on a Windows profile-cleanup `EPERM` in worker teardown.
The one reproducible failure, `conductor.spec.ts:3314`, was proved not mine in
Task 240 by rebuilding at the brief-only commit and watching it fail there.

### `c9` - one real critic call is made: NOT REACHED

No provider call was made. The owner reached a candidate on a real project but
the offer was below the decision, so they passed it without seeing it. The
ordering defect is fixed and the next attempt cannot repeat it.

### `c10` - the owner judges the real result: NOT REACHED

Follows `c9`.

## What the next session must do

1. Make the one real call. The code is complete and green; nothing needs
   building first. Run the app on a small project - a fresh one, because the
   Cairn repo itself cannot be talked to until task 242 lands - reach a
   candidate, and read the offer, which now sits directly above Continue.
2. Gate 3 is the owner's, on that exact call, after they read the card. Record
   the provider, model, packet size, stated ceiling, zero-retry rule, and their
   approval in their own words. If a router served it, state plainly that Cairn
   cannot attest which upstream answered.
3. Record honestly whatever the provider reports about usage and cost, **or
   that it reported nothing**. Do not build a gate that requires the provider
   to prove something it cannot; absent facts are allowed, only contradicting
   ones refuse.
4. Then ask the owner `c10`.

## Limitations

- The cost ceiling is a character-based token estimate, not a tokenizer. It is
  deliberately pessimistic at three characters per token, so it over-states
  rather than under-states, but it is an upper bound and not a prediction.
- Only providers publishing an OpenRouter-shaped `pricing.prompt` /
  `pricing.completion` at `{baseUrl}/models` can be priced. Any other provider
  gets the honest "could not find out" line rather than a number.
- The lookup runs on every candidate pause where a connection exists, even if
  the owner always skips. It is keyless and cheap, but it is a network request
  the owner did not press for.
- Inherited and still open: no file contents are sent and the eight-file
  selector is still unwritten (Task 240's `c8`); the candidate screen is dense
  enough that the owner missed a card on it, which is task 243; and Cairn's own
  root `package.json` still declares none of the three menu scripts.

**Disposition: STOPPED - the pricing shipped and every offline check passed, but
the one real critic call was never made, so gate 3 was never reached.**
