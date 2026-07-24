# Task 048 — Brief

Requested visible outcome: land the inversion (Task 9 of the Phase 2
core-surgery plan). The Codex Exec worker stops authoring any task record; it
does product work and speaks its account through exactly one `cairn-claims`
fence in its final message. Cairn parses that fence and authors the report and
log row itself, from the worker's claims and its own Git verification. Because
splitting the change would leave the Playwright suite red in between (the fake
dispatcher's success flow would still write records and emit no claims fence,
which the new core rejects), the core prompt rewrite, the `serial.ts` rewrite,
and the app-side fixtures and copy all flip together in ONE commit.

Boundary of intent: `core/src/codex.ts` (`taskPrompt` only), `core/src/serial.ts`
(the codex branch of `runSerialTask`, plus the record helpers), the two core
test files, `app/tests/routing.spec.ts`, and `app/src/renderer/screens/TaskRun.tsx`.
No change to `claims.ts`, `records.ts`, `steps.ts`, `routing.ts`, the catch
path of `serial.ts` (adapter-threw boundary/timeout/cancel/process-failure), or
any other module. No new dependency. No version bump. The protected-work,
exact-path, phantom-dirty, and secrecy assertions are never weakened.

The change, exactly:

1. `taskPrompt`: replace the report/log-row format instructions and the
   already-satisfied "still write the report and log row" line with: forbid any
   write under `docs/ai-work`; require exactly one fenced `cairn-claims` JSON
   block with the seven typed keys; state the DONE-vs-STOPPED and milestone
   rules; keep the already-satisfied guidance rephrased to "say so in your
   claims, with milestone NO". The apply_patch, "do not invent a product
   change", and "Cairn owns the exact-path local commit" lines survive.
2. `serial.ts`: `SerialStopReason` loses `MODEL_RECORDS_MISSING`, gains
   `WORKER_CLAIMS_MISSING`. Delete `interface ModelRecords` + `readModelRecords`
   and `verifyModelGitResult`. Add `scanChangedPaths` (bounded Git change set),
   `cairnWorkerRecords` (composes the report via `composeWorkerReport`/
   `composeWorkerRowSummary`, writes with flag `wx`, appends one log row with
   `moved: claims?.milestone ?? "NO"`, verifies its own writes byte-back), and
   `commitExactPaths` (the exact-path stage/verify/commit + ancestry +
   single-commit-count, reused from the old flow). `changedTaskPaths` no longer
   requires the owned records to pre-exist (Cairn writes them after the scan);
   every other safety line stays. Rewrite the codex branch as the stop-reason
   ladder → STOPPED close (Cairn-authored) or the DONE path (head unchanged →
   dirty-start commit-skipped variant → clean-start exact-path commit; any
   staging/commit failure unstages, swaps to STOPPED via
   `replaceDoneRecordsWithStopped`, and closes `MODEL_RESULT_NOT_VERIFIED`).
   Codex `checks`/`stopConditions` reworded for the claims model.
3. App: the fake dispatcher's success/slow flow writes only `visible.txt` and
   emits the claims fence as an `agent_message` JSONL line; `missing-records`
   renames to `missing-claims` (same secret-bearing stream, no fence);
   expectation texts move to `WORKER_CLAIMS_MISSING` and the two new result
   sentences. `TaskRun.tsx` result copy stops saying "model-authored".

Checks that show the outcome holds:

- Red first: after the prompt/assertion pair, the rewritten and new
  `serial.test.ts` fakes (claims-fence based) fail against the untouched old
  `serial.ts` — 8 failures, all for the retired worker-record flow. Confirmed.
- `cd core && npm test` green (80, up from 78 — two new serial tests).
- Root `npm test` green (core 80 + cli 9).
- App gate green: `npm run typecheck`, `npm run test:unit` (43),
  `npm run build:vite`, `npx playwright test` (23, including cancel and both
  reattach tests on the claims-based slow flow).

DONE means: the worker prompt carries no `docs/ai-work` write instruction and
one `cairn-claims` block; a DONE claims fence on a clean start produces one
Cairn-authored exact-path commit of exactly product paths ∪ owned records; a
missing fence stops `WORKER_CLAIMS_MISSING`; a STOPPED claim stops
`MODEL_REPORTED_STOPPED`; a protected-work change or an unrelated task-record
path still stops regardless of a perfect DONE claim; the composed reports keep
worker text blockquote-quarantined and never leak the secret event payload; and
core, cli, app-unit, and Playwright suites are all green. STOPPED means a
verification ordering could not be made coherent without weakening an invariant.
