# Task 049 — Report

## What changed

- `core/src/routing.ts` (modified): deleted `OfflineDemoResult`,
  `CodexExecResult`, and `TaskAdapterResult`. Added the universal
  `WorkerRunResult` (`kind: "worker-result/v1"`, `taskNumber`,
  `requestedOutcomeSha256`, `status: "completed" | "failed"`, `claimsText`,
  `evidence: Record<string, number>`), `WorkerDisclosure` (six fields),
  `WorkerBoundaryError` (`boundary = "real-call"`), `WorkerFailureKind`, and
  `WorkerProcessError(failure, code, debugPath)`. `TaskAdapter` lost `kind` and
  gained `disclosure?(outcome): WorkerDisclosure`. `createOfflineDemoAdapter`
  returns the universal shape (`status: "completed"`, `claimsText: null`,
  `evidence: {}`).
- `core/src/codex.ts` (modified): `CodexExecModelCallBoundaryError extends
  WorkerBoundaryError`; `CodexExecProcessError` / `CodexExecTimeoutError` /
  `CodexExecCancelledError` extend `WorkerProcessError` with failure kinds
  `"process"` / `"timeout"` / `"cancelled"`, each keeping its exact code string
  and positional constructor. `createCodexExecAdapter` dropped `kind`, added
  `disclosure(outcome) { return codexExecDisclosure(cwd, outcome); }`, and
  translates the process result into `WorkerRunResult`: `status` from `exitCode
  === 0 && terminalEvent === "turn.completed"`, `claimsText` from the final
  message, and the nine numeric evidence fields (exitCode, four token counts,
  four event counts).
- `core/src/serial.ts` (modified):
  - Dropped every `isCodexExec*` import; imports `WorkerBoundaryError` /
    `WorkerProcessError` / `WorkerRunResult` from routing instead.
  - `RESULT_STATEMENT` and `CODEX_SUPPORTED_OUTCOME` deleted;
    `WORKER_SUPPORTED_OUTCOME` added ("Run one explicitly confirmed worker task
    through the connected adapter and verify its result and Git state.").
  - `boundedEventSummary` → `boundedEvidenceSummary(evidence)`: the numeric map
    sorted by key, rendered `key=value`, joined by "; ", ending in ".".
  - `validateAdapterResult` + `validateCodexResult` → one `validateWorkerResult`
    (exact six own string keys, ordinary prototype, all enumerable data
    descriptors, literal kind, matching task identity, completed/failed status,
    null-or-≤262144 claims) plus `validEvidence` (plain object, ≤24 entries,
    string keys ≤40, finite numbers with |v| ≤ 1e12; negatives allowed).
  - `briefText`, `reportText`, `rowFor`, `writeClosedRecords`,
    `writeSafetyRecordsWhenUnclaimed`, and `replaceDoneRecordsWithStopped` take
    a `demo` flag; wording keys off demo/worker and interpolates
    `contract.route.adapterLabel` / `.provider` so Codex renders byte-identical.
  - The master flag `chosen.kind === "codex-exec"` and the offline re-check
    `chosen.kind === "offline-demo"` both became
    `chosen.descriptor.capabilities.includes("offline-demo")`. The worker lane
    is now `if (!demo)`; the demo lane is the fall-through.
  - The worker lane uses `validateWorkerResult`, `workerResult.evidence`,
    `status === "completed"`, and passes `workerResult?.evidence` to
    `cairnWorkerRecords`. Activity strings interpolate the label
    (`DONE — one real ${label} task completed and was verified.`, `Running one
    confirmed ephemeral workspace-scoped ${label} request.`).
  - The catch maps on the universal classes: `WorkerBoundaryError` →
    REAL_MODEL_CALL_NOT_AUTHORIZED; `WorkerProcessError` by `failure` (timeout →
    ADAPTER_TIMED_OUT, cancelled → CANCELLED_BY_OWNER, process → ADAPTER_FAILED);
    anything else → ADAPTER_FAILED.
- `core/test/routing.test.ts` (modified): the `adapter()` helper and the offline
  descriptor test drop `kind`; the helper returns the universal shape.
- `core/test/codex.test.ts` (modified): `adapter.kind` assertion → `adapter.
  descriptor.id`; the adapter-level result `deepEqual` → the universal shape
  (`status` / `claimsText` / nine-field `evidence`).
- `core/test/serial.test.ts` (modified): `validResult` → universal shape; the
  WORKER_CLAIMS_MISSING bounded lines updated to `Bounded worker evidence:
  agentMessageCount=1; …`; the negative-count test replaced by three tests (NaN
  evidence → INVALID; 25-entry map → INVALID; negative `exitCode: -1` allowed →
  WORKER_CLAIMS_MISSING); the honest-labeling test repointed from the deleted
  `statement` to `claimsText: null` plus a demo-lane report assertion; the
  accessor hostile test repointed to the real `status` key; and the new
  PHASE 4 READINESS synthetic-adapter proof appended.
- `app/src/shared/ipc.ts` (modified): `CodexExecDisclosure` → `WorkerDisclosure`
  on `TaskRoutePreview` and `taskRun`.
- `app/src/main/tasks.ts` (modified): `sameDisclosure` widened to
  `WorkerDisclosure`; `task:route` now returns the ROUTED adapter's
  `disclosure?.(outcome)` (found from `detected.adapters` by
  `recommended.id`) instead of the codex-only ternary. `authorizeCodexExec` and
  the codex confirmation gate stay codex-side.
- `app/src/renderer/screens/TaskRun.tsx` (modified): `codexRoute` / `resultCodex`
  / `codexish` → `workerRoute` / `resultWorker` / `workerish`, all keyed off
  `!capabilities.includes("offline-demo")` (keeping `sessionWorker`); the
  confirm-checkbox and start-button strings interpolate `route.recommended.label`
  (byte-identical for Codex).
- `app/tests/routing.spec.ts` (modified): the two missing-claims bounded-evidence
  expectations moved to the new sorted `Bounded worker evidence: …` format.

No change to `claims.ts`, `records.ts`, `steps.ts`, `files.ts`, `lock.ts`, the
conductor, or the cli. No new dependency. No version bump.

## Verification (real results)

**RED first (Step 1–2)** — the synthetic `fixture-worker` test compiled against
the pre-surgery `TaskAdapter`:

```
test/serial.test.ts(855,11): error TS2322: … is not assignable to type
'(contract: AdapterTaskContract, signal?) => Promise<TaskAdapterResult>'. …
missing the following properties from type 'CodexExecResult': processCount,
exitCode, terminalEvent, inputTokens, and 8 more.
```

(Build error: `kind` required on the adapter, result-shape mismatch — exactly
the stated reason.)

**GREEN (Step 3–4)** — `cd core && npm test`:

```
ℹ tests 83
ℹ pass 83
ℹ fail 0
```

(80 pre-existing + the readiness proof + two hostile-evidence tests that
replaced the single negative-count test.) Root `npm test`:

```
core: tests 83 / pass 83 / fail 0
cli:  tests 9  / pass 9  / fail 0
```

**App gate (Step 5–6)**:

```
npm run typecheck  → clean (tsc --noEmit, tests/ included)
npm run test:unit  → tests 43 / pass 43 / fail 0
npm run build:vite → built (main + preload + renderer)
npx playwright test → 23 passed (55.8s)
```

The Playwright run includes the byte-identical Codex confirm/start strings, the
`missing-claims` stop now asserting the new `Bounded worker evidence:
agentMessageCount=1; cachedInputTokens=4; …` line (no `sk-secret-event-payload`
anywhere), the owner-cancel path, and both mid-run reattach tests.

## How to try it

`cd core && npm test` runs the synthetic `fixture-worker` proof: it reaches
verified DONE, commits exactly `visible.txt` plus the three records, and its
report names Fixture Worker / Fixture Provider while matching neither `/Codex/`
nor `/offline demonstration/`. Reverting `TaskAdapter` to require `kind`
reproduces the RED build error above.

## Limitations

The `reportText` boundary/stopped composer still carries codex-flavored prose
(the `codex exec` command reference, "OpenAI") in its worker branch; for the
real Codex adapter it renders byte-identically, and for a hypothetical third
adapter it would only surface on the adapter-THREW catch path (boundary /
timeout / cancel / process failure), which no test exercises and which the
readiness proof (a DONE path through `composeWorkerReport`) does not touch. The
worker DONE and STOPPED records already flow entirely through the route-labeled
`composeWorkerReport`, so the readiness guarantee holds for every tested path.
`replaceDoneRecordsWithStopped` remains the untested commit-failure self-check.

## Files changed

- `core/src/routing.ts` (modified — universal result, errors, disclosure seam)
- `core/src/codex.ts` (modified — error subclassing, disclosure, translation)
- `core/src/serial.ts` (modified — one validator, demo flag, generic evidence)
- `core/test/routing.test.ts` (modified — universal shape, no `kind`)
- `core/test/codex.test.ts` (modified — descriptor.id, universal result)
- `core/test/serial.test.ts` (modified — validResult, hostile evidence, proof)
- `app/src/main/tasks.ts` (modified — routed disclosure seam, WorkerDisclosure)
- `app/src/shared/ipc.ts` (modified — WorkerDisclosure)
- `app/src/renderer/screens/TaskRun.tsx` (modified — capability lane flags)
- `app/tests/routing.spec.ts` (modified — bounded-evidence format)
- `docs/ai-work/tasks/049-brief.md` (new)
- `docs/ai-work/tasks/049-report.md` (new)
- `docs/ai-work/LOG.md` (modified — one appended row)

Milestone movement: NO

Disposition: DONE
