# Task 066 — Brief

Requested visible outcome: Phase 3 Task 7 — every closed serial run carries
`composed: ComposedRecordInput`, the structured truth a result card can be
authored from, so Task 8 never has to scrape a rendered Markdown report to
learn what a run did.

Today exactly one close site builds that value: `cairnWorkerRecords`
(`core/src/serial.ts`) composes it and hands it to `composeWorkerReport`, then
throws it away. Every other close — the adapter-throw safety close, both
record rewrites, and the whole offline demonstration lane — renders one of the
legacy `reportText()` templates and holds no structured value at all. After
this task the done and stopped arms of `SerialRunResult` all carry one; the
`connection-required` arm still carries none, because at that point no task
number, brief, or record exists to describe.

The change is ADDITIVE. No rendered report byte may move: the record guard
re-derives `briefText` and byte-compares its own writes at several sites, and
the golden report layout test in `core/test/records.test.ts` pins the report
exactly. Those tests are the guard, and they must pass unmodified.

Every synthesized field gets the site's REAL value, never a phrase keyed on
the disposition:

- `filesChanged` is Git's answer (the same bounded, sorted, capped scan
  `cairnWorkerRecords` already uses), never the worker's `changes` claims.
- `protectedIntact` is a verification result Cairn actually performed at that
  site, not an assumed `true`.
- `commit` is the real commit outcome, `null` on stops.
- `claims` is the worker's own account, carried as CLAIMS — a consumer that
  reads it as fact is misreading the field, and the field's own doc says so.
- `paidCallStarted` must agree with what the same run's report already says
  about spent cost.

Boundary of intent: `core/src/serial.ts` and `core/test/serial.test.ts`, plus
this task's three record files. No change to `core/src/records.ts`, to `app/`,
or to `cli/`.

Checks that will show the outcome holds:

- New tests in `core/test/serial.test.ts` — RED first, then GREEN — covering a
  verified worker DONE (Git-derived `filesChanged`, claims as claims, real
  commit), a flawless-DONE-claims run stopped by a protected-work change, the
  offline demo DONE (no paid call, the run's real commit result), and the
  adapter-throw stops (the paid-call flag equals the report's own already-spent
  sentence, run by run).
- `cd core && npm test` — the full suite, with every pre-existing byte-back and
  golden-layout test untouched.
- `npm test` at the repo root — core and cli both green.

DONE means: every done/stopped `SerialRunResult` carries `composed`; each
field at each site is a real value that agrees with that site's own report; no
report byte changed; both suites green. STOPPED means any of those does not
hold — in particular, any rendered-record test that needed editing to pass.
