# Task 009 — Guard the offline adapter's honest-labeling statement

Requested visible outcome: a core test fails if the offline demonstration
adapter ever stops reporting that it did not attempt the requested product
change, so Cairn's core honesty promise cannot silently drift.

Boundary of intent: add one test to `core/test/serial.test.ts` that calls the
real `createOfflineDemoAdapter()` and asserts its result statement. Change no
product code, no contract, no version. This is the completion of the offline-
honesty task that stopped on a stale build in Task 008.

Checks: the new test passes against current code; a drift to a completion
claim is proven to fail (verified against the built adapter); core, cli, and
app suites green.

DONE means the guard is in place and the suites are green. STOPPED means they
are not. Milestone movement: NO.
