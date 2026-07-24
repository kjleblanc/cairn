# Task 049 — Brief

Requested visible outcome: land Task 10 of the Phase 2 core-surgery plan — the
universal worker-result contract. Every adapter (codex, offline demo, and any
future third adapter) returns ONE result shape (`WorkerRunResult`), throws ONE
family of errors (`WorkerBoundaryError` / `WorkerProcessError`), and — when it
makes a real call — declares its own six disclosure facts through an optional
`disclosure(outcome)` seam. `serial.ts` validates that one shape, keys all
demo-vs-worker wording off `capabilities.includes("offline-demo")` (never an
adapter id) and the route labels, and maps the catch on the universal error
classes. The proof is a synthetic third adapter (`fixture-worker`) that reaches
verified DONE through the whole envelope with zero `serial.ts` special-casing,
whose report names Fixture Worker / Fixture Provider and never says Codex or
offline demonstration.

Boundary of intent: `core/src/routing.ts`, `core/src/codex.ts`,
`core/src/serial.ts`, the three core test files, `app/src/main/tasks.ts`,
`app/src/shared/ipc.ts`, `app/src/renderer/screens/TaskRun.tsx`, and
`app/tests/routing.spec.ts`. No change to `claims.ts`, `records.ts`,
`steps.ts`, `files.ts`, `lock.ts`, the conductor, or the cli. No new dependency.
No version bump. The protected-work, exact-path, phantom-dirty, and secrecy
assertions are never weakened.

The change, exactly:

1. `routing.ts`: replace `OfflineDemoResult` / `CodexExecResult` /
   `TaskAdapterResult` with one `WorkerRunResult` (`kind: "worker-result/v1"`,
   `status`, `claimsText`, `evidence: Record<string, number>`); add
   `WorkerDisclosure`, `WorkerBoundaryError`, `WorkerProcessError(failure, code,
   debugPath)`. `TaskAdapter` drops `kind`, gains `disclosure?(outcome)`. The
   offline adapter returns the universal shape (`status: "completed"`,
   `claimsText: null`, `evidence: {}`).
2. `codex.ts`: the four error classes subclass the universal ones (keeping their
   exact code strings and positional constructors); the adapter drops `kind`,
   adds `disclosure()`, and translates to `WorkerRunResult` (`status` from
   `exitCode === 0 && terminalEvent === "turn.completed"`, the nine numeric
   evidence fields, `claimsText` from the final message).
3. `serial.ts`: one `validateWorkerResult` (+ `validEvidence`) with all the
   hostile-object paranoia; `boundedEvidenceSummary(evidence)`; the demo flag at
   both former `kind` sites; briefText/reportText/rowFor keyed off a `demo`
   parameter with route-label interpolation (byte-identical for Codex); the
   catch mapped on `WorkerBoundaryError` / `WorkerProcessError.failure`; the
   worker supported-outcome generalized.
4. App: `task:route` returns the routed adapter's `disclosure?.(outcome)`;
   `sameDisclosure` and the ipc/renderer types widen to `WorkerDisclosure`;
   `TaskRun.tsx` lane flags become capability checks and the confirm/start
   strings interpolate the route label (byte-identical for Codex); the
   bounded-evidence Playwright expectations move to the new sorted format.

Checks that show the outcome holds:

- Red first: the synthetic `fixture-worker` test fails to build against the old
  `TaskAdapter` (`kind` required, result-shape mismatch). Confirmed.
- `cd core && npm test` green (83, up from 80 — the readiness proof plus two new
  hostile-evidence tests replacing the negative-count test).
- Root `npm test` green (core 83 + cli 9); cli compiles unchanged.
- App gate green: `npm run typecheck`, `npm run test:unit` (43),
  `npm run build:vite`, `npx playwright test` (23).

DONE means: a synthetic third adapter reaches verified DONE with no `serial.ts`
special-casing and a Fixture-Worker-named report; the codex and offline lanes
stay byte-identical everywhere Playwright and the core suite assert exact text;
the one validator fails NaN and 25-entry evidence closed while allowing honest
negatives; and every suite is green. STOPPED means a shared result shape could
not be reached without weakening an invariant or breaking a protected assertion.
