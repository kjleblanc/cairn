# Task 201 brief - main-only model connection store and legacy migration

**Lane:** E

**Base commit:** `4dcdc7333afc432839b85d70c6c2822992ae808a`

## Requested visible outcome

An owner with Cairn's current valid `conductor.json` connection can reopen the
app on the same project and keep the unchanged pinned endpoint, model, consent
scope, and one existing encrypted credential location without entering the
credential again. No ordinary connection hub appears yet. If either legacy or
current authority data is malformed, calls and ordinary mutation stop and the
owner sees only the minimal exact-file **Erase Cairn model connections**
recovery card.

This implements only **Task 3 - Land the main-only store and lossless legacy
migration** from
`docs/superpowers/plans/2026-08-06-cairn-model-connections.md`. Task 200 is
already claimed in protected Lane F and is unrelated visual work.

## Boundary of intent - what must not change

- Do not implement Task 4 or any catalog driver/cache, Auto resolver, new
  provider connector, general connection hub, role assignment UI, route
  receipt, provider call, or worker materialization.
- Preserve today's valid OpenRouter/custom pinned conductor behavior,
  connection consent, payload, stream ordering, OAuth callback, and encrypted
  legacy credential bytes. Migration stores one reference plus expected
  ciphertext digest; it never copies `keyB64` or creates a second decryptable
  credential.
- The legacy bridge is project-bound, pinned, billing-unknown, metadata-empty,
  and restricted to the exact old endpoint, model, authentication revision,
  and authorized data scope. It cannot refresh metadata, use Auto, widen data,
  change model/billing, cross projects, or exist without a main-resolved
  current project.
- Parse and bound before decryption/allocation. Unknown versions, malformed or
  truncated data, readback mismatch, project-root ambiguity/replacement, and
  partial destructive state fail closed as `recovery-required`; none silently
  becomes disconnected or legacy.
- Renderer input never supplies project authority, paths, provider/model/
  billing facts, revisions, or recovery targets. Renderer projections and
  errors contain no raw path or secret material except the recovery card's
  exact owner-facing file names/targets required by the approved design.
- Every mutation is serialized and compares expected `storeRevision`; no stale
  OAuth/reconnect/assignment/Forget write may win.
- Implement Forget/recovery ordering and failpoints, but exercise deletion
  only on test-owned fake files. Do not inspect, decrypt, move, delete, or
  transform the owner's real profile or any real credential.
- Use existing dependencies and fake/local fixtures only. No provider login,
  credential use, metadata/model call, dependency change, install, push,
  publication, or deployment is authorized.
- Touch only Task 3's named paths, this brief/report, and the append-only LOG
  row. Do not touch or absorb Lane F's protected Task 200 files.

## Implementation plan (AI decisions)

1. Define one strict main-only `cairn-model-connections/v1` store with bounded
   credential references, assignments/grants, recovery state, and a
   main-resolved project-authority registry.
2. Add serialized expected-revision mutation plus atomic replacement and
   strict readback, reusing `atomicwrite.ts` only if the helper is genuinely
   general.
3. Add an idempotent legacy reader/migrator that preserves valid current
   endpoint/model/scope/ciphertext bytes in place and emits only the narrow
   project-bound legacy bridge.
4. Add secret-first/cache-second/authority-last Forget and exact-file recovery
   state machines with deterministic failpoints and restart proofs.
5. Integrate the compatibility store behind the current conductor service,
   add only the minimal recovery IPC/preload/ConnectCard surface, and keep
   ordinary connection management absent.
6. Extend unit and fake Electron fixtures so all three model-connection files
   are test-owned, detached/restored together, and no real profile credential
   can become active.

## Checks that will show the outcome holds

1. Red-first focused unit tests cover lossless/idempotent migration, one active
   credential reference, strict current/legacy corruption handling, serialized
   stale-write rejection, exact project authority, failpoint ordering,
   readback mismatch, secret-free errors/status, and deterministic recovery.
2. Existing conductor unit tests prove unchanged valid pinned behavior; new
   project/store/migration suites use only inert fake secret canaries and
   test-owned temporary roots.
3. From `app`, run exactly:
   - `npm.cmd run test:unit`
   - `npm.cmd run typecheck`
   - `npm.cmd run build:vite`
4. Run `npx.cmd playwright test tests/conductor.spec.ts --workers=1` only if
   the app token is free and inspection proves the fixture cannot read/use a
   real credential and safely owns/restores all three files. Otherwise stop
   before the check and name that precise blocker.
5. Run `git diff --check`, inspect the complete exact-path diff and final
   status, and confirm only disclosed Task 201 paths changed.

## DONE and STOPPED

- **DONE:** valid legacy state migrates losslessly and idempotently to one
  strict current authority without duplicating the credential; project/grant,
  mutation, corruption, Forget, and recovery invariants pass; current pinned
  behavior stays compatible; the exact local checks pass; and the report, LOG
  row, and exact-path local commit are complete.
- **STOPPED:** recovery-required would lack its exact-file exit; a bridge can
  authorize anything beyond the unchanged pinned route; any failpoint can
  delete authority before a surviving credential; verification would touch a
  real credential/profile; a required check cannot pass with an in-scope
  repair; protected work changes; or recovery becomes unclear.
