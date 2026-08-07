# Task 206 report — headless catalog, cache, and sticky Auto kernel

**Lane:** E. **Base commit:** `93e504d63026ea562c77fb36e68295f8c7e96827`.
The brief was claimed alone in commit
`9166abc5fecca6f3df5dae5d8e86f8bd59cdbb43`.

Implements only Task 4 of
`docs/superpowers/plans/2026-08-06-cairn-model-connections.md`. There is no new
owner-facing picker or production Auto route. The current OpenRouter/custom
conductor still uses its same exact pinned model and compatible transport.

## What actually changed

Twelve files in the implementation/report commit:

- `app/src/main/connections/drivers/types.ts` defines the main-only catalog
  driver boundary. A driver receives only the exact connection/authentication
  identity, derives the access provider for that connection, must affirm exact
  model attribution, and exposes fixed catalog failures plus reviewed policy
  metadata.
- `app/src/main/connections/drivers/fake.ts` adds the inert test driver. It
  records only connection/authentication identity, keeps hidden and opaque
  provider entries inside the driver, and turns raw fake failures into fixed
  codes.
- `app/src/main/connections/registry.ts` adds an explicit construction-time
  registry with bounded IDs, freshness policies, required callbacks, and
  duplicate rejection. No production provider is registered.
- `app/src/main/connections/catalog.ts` strictly detaches, normalizes, orders,
  and hashes bounded catalog evidence. It rejects accessors, Proxies, duplicate
  IDs/defaults, non-exact attribution, malformed fields, and opaque fake router
  aliases; it recomputes freshness using an injected clock and translates
  refresh failure without exposing provider text.
- `app/src/main/connections/catalog-cache.ts` adds bounded, canonical,
  atomic/readback-checked `model-catalogs.json` storage for disposable catalog
  snapshots and secret-free conversation bindings. Catalog lookup keys are the
  exact connection plus authentication revision; binding keys are project
  authority plus conversation. A full-state integrity digest covers timestamps
  and bindings, reads require canonical bytes and valid UTF-8, and a refresh
  completion must supply main's current identity so a late pre-reauth result
  cannot replace the current cache.
- `app/src/main/connections/resolve.ts` adds deterministic pinned and Auto
  resolution, full route/binding digests, and fail-closed revalidation of
  project, connection, provider, account, grants, catalog, billing, capability,
  gateway routing, role, and runtime. Auto retains an eligible exact model
  first, then uses reviewed exact IDs, then one verified exact provider default;
  it never sorts into a choice or changes connection. Bound conductor Auto keeps
  its exact eligible model across profile policy/catalog changes. Task 8's
  one-task worker authority is explicitly rejected here because Task 4 cannot
  validate it.
- `app/src/main/conductor/service.ts` passes the existing connection's pinned
  model through a deliberately narrow legacy-bridge selector, then feeds that
  same string to the existing seat note and transport. Consent, prompt assembly,
  key access, request bytes, streaming/cancellation order, and the compatible
  OpenRouter/custom route are otherwise untouched.
- `app/tests-unit/model-catalog.test.ts` adds fake-only catalog, failure,
  freshness, exact-attribution, cache identity, late-reauth, restart, canonical
  persistence, and timestamp-tamper coverage.
- `app/tests-unit/model-resolve.test.ts` adds fake-only pinned/Auto order,
  removal, sticky restart, project/conversation isolation, authority-change,
  raw-API worker, fixed-worker, callback-redaction, future-authority refusal,
  digest, and current-service seam coverage.
- `app/tsconfig.unit.json` includes the six new main modules in unit compilation.
- `docs/ai-work/tasks/206-report.md` is this report.
- `docs/ai-work/LOG.md` receives one append-only Task 206 row.

## AI implementation decisions

- Catalog metadata and secret-free continuity share the separate disposable
  cache file because Task 4 specifies that path and no credential enters it.
  Persisted bindings are evidence only: the resolver still requires current
  grants, credential state, fresh catalog, billing, capability, routing, and
  runtime authority before returning a route.
- Reauthentication keeps old bindings as explicit invalidation evidence but
  evicts the old catalog. `putCatalog` also requires the caller to re-read the
  current connection identity after an asynchronous refresh, preventing a late
  old-account completion from restoring old metadata.
- A missing recommendation is different from a malformed or throwing driver.
  Missing proceeds only to a driver-verified exact provider default; malformed
  or throwing policy/attribution callbacks stop with fixed codes and no raw
  error. Existing sticky exact models are checked before either path.
- Provider identity is derived by the driver from exact connection identity,
  rather than being one global string on a driver. This leaves the headless
  seam honest for later connection-bound compatible endpoints.
- The reviewed policy's `costBand` is validated metadata in Task 4, not a
  numeric spending ceiling. The concrete maximum expected price band remains
  the explicitly owner-approved policy decision in the later OpenRouter visible
  flow. No production driver or Auto route may activate from this task.

## Checks run and real results

The output was observed in Lane E's terminal and is not saved in the repository.

- **Red-first evidence:** from `app`, `npx.cmd tsc -p tsconfig.unit.json`
  failed before implementation because the six plan-listed catalog/resolver
  modules did not exist. After the kernel was present, focused runs of
  `node --test dist-unit/tests-unit/model-catalog.test.js
  dist-unit/tests-unit/model-resolve.test.js` passed all 19 Task 4 tests.
- **`c1` — full fake-only App unit suite:** PASSED. From `app`, exact command
  `npm.cmd run test:unit` reported **577 tests: 575 passed, 0 failed, 2 skipped**.
  The skips are the existing Windows-host POSIX-backslash and unavailable file
  symlink cases. The Task 4 tests cover every red-first item named by the brief,
  including late reauthentication completion, timestamp-only cache tampering,
  verified-default-without-recommendation, retained-without-current-policy,
  and direct connection/driver/provider/role/billing/runtime isolation.
- **`c2` — complete app typecheck:** PASSED. From `app`, exact command
  `npm.cmd run typecheck` completed with no diagnostics.
- **`c3` — scope, diff, and status:** PASSED. `git diff --check` passed.
  Complete staged-diff and exact-path inspection showed only the ten Task 4
  implementation/test/config paths above plus this report and the one LOG row.
  The main checkout remained clean at the base commit. Lane E's final status was
  clean after its exact-path local commit. Inspection confirmed one unchanged
  pinned model feeds both the seat note and the one existing transport call;
  no receipt, IPC, UI, real driver, provider call, credential, dependency,
  install, push, or deployment entered the task.

## How to try it

There is intentionally no new screen to try. A normal existing connected
conversation should look and behave exactly as before. To exercise the new
headless kernel locally with existing dependencies:

```powershell
cd app
npx.cmd tsc -p tsconfig.unit.json
node --test dist-unit/tests-unit/model-catalog.test.js dist-unit/tests-unit/model-resolve.test.js
```

The focused result is 19 passing tests and no network or credential use.

## Limitations and remaining human judgment

- This is a headless kernel. It does not read or write the production
  connection store, register OpenRouter or another real provider, expose a
  model picker, or change the running conductor to catalog-backed resolution.
- Task 5 still owns authenticated exact-route attempt/completion receipts before
  any visible Auto cutover. Later connection tasks own metadata authorization,
  provider drivers, UI, and production cache coordination.
- `costBand` carries reviewed policy metadata only. Before production Auto, the
  later owner-approved OpenRouter policy must represent and enforce its concrete
  maximum expected price band; this task chooses no model, threshold, budget,
  or cost.
- Verification was fake-only. No provider login, credential, metadata request,
  model call, dependency change, install, push, or deployment occurred.

**Disposition: DONE**
