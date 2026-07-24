# Task 026 — Fake body + Playwright end-to-end

Requested visible outcome: a scripted, offline OpenAI-compatible fixture
server (`app/tests/fixtures/fake-conductor.mjs`) and a Playwright spec
(`app/tests/conductor.spec.ts`) prove the whole conductor loop end to end
without a real model — connect (consent gate, pill, disconnect wipes),
converse (full loop through the proposed-task card into TaskRun's offline
mock dispatch, landing a `LOG.md` row on disk), persistence (`.cairn/`
survives a relaunch and stays untracked by git), and honest failure (a
malformed task block never becomes a card; a 401 shows only plain words,
never a status code or the key). The fixture scripts its reply off the last
user message's content only: `"title"` → a valid `cairn-task` block with one
risk concern; `"garble"` → the same shape with an extra key (invalid);
`"fail-key"` → HTTP 401; anything else → a two-delta plain reply. Every
streamed reply ends with a usage chunk (`prompt_tokens: 20,
completion_tokens: 9, cost: 0.00002`) then `[DONE]`.

Two small in-scope additions, both from review of the existing conductor
code while writing this spec: (A) `Chat.tsx` only ever stops the server-side
stream via the Stop button or "New conversation" — navigating back mid-
stream leaves it running and the per-dir lock held, so a fresh `useEffect`
cleanup calls `window.cairn.conductorStop(dir)` on unmount whenever a stream
is in flight (read via the existing `inFlightRef`, no new state). (B) the
spec must also cover the busy-chip rule already implemented in `TaskCard`
(the `busy` prop disables an unresolved chip's controls while any reply
streams) — coverage only, no production code change for (B).

Boundary of intent: create `app/tests/fixtures/fake-conductor.mjs` and
`app/tests/conductor.spec.ts`; modify `app/src/renderer/screens/Chat.tsx`
(the addition-A unmount cleanup only — no other behavior change). The
fixture may add markers beyond the three named above only if a scenario
needs one to stay deterministic without a wall-clock sleep in the test
itself (e.g. a slower-streaming marker for the mid-stream-navigation and
busy-chip scenarios) — no randomness, same input always scripts the same
reply.

Checks: `cd app && npx playwright test tests/conductor.spec.ts` all pass;
then the full `npm run test:smoke` all pass (13 existing + the new
scenarios); `npm run typecheck` clean; `npm run test:unit` 37/37.

DONE means the outcome above holds and the checks pass. STOPPED means they
do not.
