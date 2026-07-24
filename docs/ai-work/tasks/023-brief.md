# Task 023 — Conductor keystore, standing-consent gate, and IPC surface

Requested visible outcome: the app process exposes a working, testable
main-process surface for the conductor's provider connection and chat send/
stop flow — a keystore that never lets the API key leave main, a consent
service that re-derives and checks the connect disclosure the same way
`tasks.ts` re-derives its dispatch disclosure, and the IPC channels/preload
bindings that surface all of it. No renderer screen consumes any of this yet.

Boundary of intent: `app/src/main/conductor/keystore.ts` (encrypted key
storage via `safeStorage`, persisted to `userData/conductor.json` as
`{ baseUrl, model, keyB64 }`), `app/src/main/conductor/service.ts`
(`conductorConsentCard`, connect/disconnect/setModel/status, and the
send/stream/stop flow that persists turns and pushes `conductor:delta`),
`app/src/shared/ipc.ts` (the new shared types and `CairnApi` methods),
`app/src/main/ipc.ts` (`registerConductorIpc`, not yet called from
`main.ts` — that wiring is Task 024's job per the plan), `app/src/preload.ts`
(the `window.cairn.conductor*` bindings). `app/src/main/tasks.ts` gains one
minimal exported helper, `isTaskRunning(dir)`, only if the running-set
wasn't already exported.

Checks: `npm run typecheck` clean; `npm run test:unit` stays at 37/37 (no
new unit tests — this is Electron-bound code, per the plan Playwright covers
it starting at Task 026); `npm run build:vite` bundles cleanly; the existing
`npm run test:smoke` Playwright suite (13 tests) stays green since main and
preload changed.

DONE means the outcome above holds and the checks pass. STOPPED means they
do not.
