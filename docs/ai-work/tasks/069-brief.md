# Task 069 — Brief

Requested visible outcome: fix the four Important findings from the Task 068
review, so the result card's honesty guarantees are actually enforced rather
than merely intended.

Task 068's behavior held under review — the post-settle hook, the store filter
and the claims routing could not be broken, and its four resolved ambiguities
stand. What did not hold is the EVIDENCE for two of them and the completeness
of two others.

1. **The fail-closed store guard was untested.** The malformed fixture
   `{"role":"envelope","card":{"kind":"nope"}}` carried no `ts`, so the
   ts-check dropped it before `isResultCard` ever ran. The reviewer proved this
   by stubbing `isResultCard` to `return true`: all six tests still passed.
   Every malformed line must carry a valid `ts`, and each clause of the guard
   needs its own case.
2. **The claims-labeling guarantee was never exercised with claims present.**
   Both Playwright assertions of the claims heading ran against
   `composed.claims === null` — the offline demo parses none and a cancelled
   run never gets a claims fence — so only the fallback was ever rendered.
3. **The prompt assembly wrapped claims under Cairn's own guarantee.** The
   plan's verbatim string put the whole card JSON, `claims` included, under
   "verified by Cairn's runtime, not by the conversation model". Spec Chunk 4
   requires the opposite: the report's separation, verbatim — verified facts
   under one label, labeled claims under another. The spec governs.
4. **The card dropped two verified lines the record carries.**
   `recordRecovery` (Task 052's disclosure that a worker tampered with Cairn's
   own owned records and Cairn had to recover them) and `processFailure` (the
   worker process's failure code and its retained local debug path) were both
   absent from `ResultCard`. The tamper disclosure especially must reach the
   owner.

Also: MINOR 6, the card's commit fallback wording diverged from the record's,
and MINOR 5, a false rationale in shipped source — `relay.ts` claimed "a DONE
close is only returned after the commit actually succeeded", which is false at
two of the three DONE sites (the dirty-start worker DONE and the offline demo
both return `skipped`). The decision it defends still stands; the reason given
for it was wrong, and this repo treats a false rationale as a defect in itself
(repo task 059).

Ledgered, deliberately NOT fixed here: the three no-card dispatch outcomes
(gate refusal, detection throw, unauthorized), the unrecognized-ERROR-code
diagnostic gap, and the `event.turn as ConductorTurn` cast.

Checks that will show the outcome holds:

- The store test's malformed lines all carry a valid `ts`, one per guard
  clause, and the guard is verified to DISCRIMINATE: neutering `isResultCard`
  to `return true` must make the test fail, and restoring it must make it pass.
  Both observed and recorded.
- A new Playwright test in the fake-codex success lane renders a claims-bearing
  DONE card and asserts the worker's own sentence appears inside
  `.result-card-claims` and NOT in `.result-card-facts`.
- A unit assertion pins the prompt separation: the worker's sentence must not
  appear under the verified label, and the verified part must carry no `claims`
  key at all.
- `npm run typecheck`, `npm run test:unit`, `npx playwright test` in `app`, and
  `cd core && npm test` — all green.

DONE means: each guarantee is enforced by a test that fails when the guarantee
is removed. STOPPED means a guard cannot be exercised without weakening it.
