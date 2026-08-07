# Task 199 brief - strict model-connection vocabulary

**Lane:** E

**Base commit:** `2dbffe5f83c32388e1e9df63956ce4c7548e9746`

## Requested visible outcome

None. The currently running single OpenRouter/compatible conductor connection
remains authoritative and behaves exactly as it does on landed main. The
repository gains the strict, secret-free model-connection vocabulary and
parsers that later connection, assignment, sticky Auto, and route-custody
tasks can share safely.

This implements only **Task 2 - Add versioned connection, assignment, and
route types** from
`docs/superpowers/plans/2026-08-06-cairn-model-connections.md`.

## Boundary of intent - what must not change

- Do not implement Task 3 or any later store, migration, secret handling,
  project-authority registry, provider driver, catalog fetch, assignment
  resolver, route receipt, worker materialization, UI, or IPC handler.
- Preserve the current connected-conductor consent, payload, route, streaming,
  history, storage, OAuth callback, and OpenRouter/custom behavior byte for
  byte at runtime.
- Shared/renderer-safe types and parser outputs must never contain credentials,
  ciphertext, token fields, executable paths, argument/environment bindings,
  raw provider payloads, or provider runtime configuration. Any future
  persisted credential union stays main-only.
- Parse current records exactly: reject unknown keys, unsafe labels/model IDs,
  malformed URLs/timestamps/decimals, unknown enum values, duplicate IDs,
  secret-like fields, invalid role/runtime combinations, oversized values,
  and inconsistent authority unions.
- Treat a legacy/absent value differently from a malformed current-version
  value; never reinterpret a malformed current record as legacy.
- Require a main-resolved `ProjectAuthorityId` on every project-scoped grant,
  conversation binding, one-task selection, pending worker authority, and
  resolved route. A project-local conversation ID is never authority by
  itself.
- Use only deterministic unit fixtures and inert strings. No provider login,
  credential use, metadata request, model call, dependency change, install,
  push, publication, or deployment is authorized.
- Touch only Task 2's named source/test/config paths plus this task's report and
  append-only LOG row. Every other lane and task remains protected.

## Implementation plan (AI decisions)

1. Define small readonly JSON-safe shared unions and records for connections,
   catalogs, assignments, grants, bindings, one-task authority, gateway
   routing, billing, project authority, and resolved routes.
2. Implement main-only exact parsers with explicit bounds and field-level
   validation. Parser results will distinguish absent legacy input, a valid
   current record, and malformed current input without accepting partial data.
3. Encode conductor-versus-worker authority rules and the one-task redemption
   boundary in discriminated unions rather than optional-field combinations.
4. Add adversarial unit tables for unknown keys, unsafe text and identifiers,
   duplicate collections, caps, secret-shaped fields, project isolation,
   billing provenance, and complete route authority.
5. Add only the minimal shared IPC type exports needed to establish the
   vocabulary; do not add a runtime channel or handler.

## Checks that will show the outcome holds

1. Red-first focused unit compilation/tests fail until the strict schema and
   types exist and reject every malformed or authority-incomplete fixture.
2. Valid conductor and worker examples round-trip without adding secrets or
   executable/provider configuration to renderer-safe projections.
3. Source-contract checks prove persisted credential/launch bindings remain
   absent from the shared module and no new IPC channel or handler exists.
4. From `app`, run exactly:
   - `npm.cmd run test:unit`
   - `npm.cmd run typecheck`
5. Run `git diff --check`, inspect the complete diff against this brief commit,
   and confirm final Lane E status contains only disclosed Task 199 paths.

## DONE and STOPPED

- **DONE:** the complete Task 2 vocabulary exists with strict bounded parsers,
  all conductor/worker/project/authority invariants and legacy distinction are
  executable, current runtime behavior is untouched, both exact checks pass,
  and the report, LOG row, and exact-path local commit are complete.
- **STOPPED:** a shared type would require a secret, raw SDK/provider object,
  executable path or provider runtime configuration; the schema cannot express
  the design without later-task behavior; a required check cannot pass with an
  in-scope repair; protected work changes; or completion requires provider or
  dependency access.
