# Task 009 — Report

What changed: added one test to `core/test/serial.test.ts` — "the real
offline demonstration adapter never claims it attempted the product change" —
that calls the real `createOfflineDemoAdapter()` and asserts its result
`statement` is exactly "The offline route completed without attempting the
requested product change." and contains no completion/implementation claim.
No product code, contract, or version changed.

Why it is new: the exact statement appears only in test fixtures elsewhere
(routing.test.ts, serial.test.ts validResult), which are fakes; nothing
asserted the real adapter still returns it. A dishonest edit would have
passed the whole suite.

Checks run and real results: the new test passes; core 48/48, cli 9/9, app
Playwright 13/13. The guard was proven to bite by running the built adapter
directly — the honest string matches real output, and asserting a
completion-claim throws. (A source edit to demonstrate the failure hits the
type system first: `serial.ts`'s `RESULT_STATEMENT` constant and the
`OfflineDemoResult` literal type cross-check the string across files, so a
dishonest statement also fails to compile — a second, independent guard.)

How to try it: `npm test --workspace core` — the new test runs in the serial
suite.

Limitations: this guards the offline adapter's statement only; the broader
honest-labeling of reports is covered by existing end-to-end tests. Note this
task was completed directly by a maintainer after the Task 008 app run
stopped on a stale build (no 0.0.3 write-fix/debug); the real fix for that
misfire is using a current build.

Milestone movement: NO

Disposition: DONE
