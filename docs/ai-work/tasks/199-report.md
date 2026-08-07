# Task 199 report - strict model-connection vocabulary

**Lane:** E

**Base commit:** `2dbffe5f83c32388e1e9df63956ce4c7548e9746`

**Brief commit:** `e41d7b37221e11b466e30d6c86d457637919d201`

**Milestone moved:** NO

## Outcome

Cairn now has one versioned, secret-free vocabulary for later model
connections, catalogs, assignments, grants, project-scoped route authority,
conversation bindings, and one-task Builder choices. Main-only exact parsers
accept immutable JSON-safe records and return one of three fixed outcomes:
absent legacy data, a valid detached/frozen current value, or malformed current
data.

The parser rejects unknown or hidden keys, proxies and accessors, malformed or
oversized text, unsafe model identifiers and URLs, duplicates, unknown enums,
invalid billing/gateway combinations, incomplete project authority, and
partial role/runtime authority. API conductors carry all-null runtime custody;
provider-managed conductors carry an all-present runtime/fingerprint set;
workers always carry runtime custody. The old pinned-conductor bridge cannot
create worker or provider-managed-runtime authority.

The running single OpenRouter/compatible conductor remains authoritative.
There is no new store, migration, credential shape, provider request, model
selection, IPC channel, resolver, runtime materialization, or UI behavior.

## What changed

- `docs/ai-work/tasks/199-brief.md` claimed Task 199 from landed main before
  implementation.
- `app/src/shared/model-connections.ts` defines the versioned readonly shared
  vocabulary for connection/catalog projections, assignments, grants,
  project authority, structured billing and gateway policy, resolved routes,
  bindings, and one-task/pending worker authority.
- `app/src/main/connections/schema.ts` adds main-only exact parsers, fixed
  absent/valid/malformed results, explicit bounds, hardened data-record and
  dense-array inspection, canonical timestamps/prices/fingerprints, and
  cross-field authority checks.
- `app/src/shared/ipc.ts` re-exports only the renderer-safe connection and
  catalog projection types. The exports are type-only and add no channel or
  runtime import.
- `app/tsconfig.unit.json` includes the new shared vocabulary and main parser
  in the existing isolated unit compilation.
- `app/tests-unit/model-connections-schema.test.ts` adds deterministic
  adversarial fixtures for every current shape, field boundary, nested exact
  record, role branch, billing route, project binding, and secret/configuration
  exclusion.
- `docs/ai-work/tasks/199-report.md` is this report.
- `docs/ai-work/LOG.md` receives the append-only Task 199 row.

No dependency, provider account, credential, metadata/model request, stored
connection, existing consent or route, app behavior, push, publication,
deployment, production system, or production data changed.

## AI decisions and review record

- `ProjectAuthorityId` is deliberately documented as syntax-checked at this
  seam, not as proof of a registry match. Task 3's main-owned canonical-project
  registry supplies that authority. Every project-scoped shape nevertheless
  requires the field now, and nested bindings/previews require exact equality.
- A worker-capable connection summary carries a secret-free runtime ID. A
  resolved route has an explicit conductor/worker discriminator rather than
  relying on nullable-field inference.
- The design's authority gaps are made explicit: conductor grants bind the
  expected billing kind, routes identify authenticated/provider-managed,
  manual, or legacy catalog evidence, and pending worker authority repeats its
  project ID rather than trusting a preview ID alone.
- Executable custody is a lowercase `sha256:<64 hex>` fingerprint only. Paths,
  arguments, environments, SDK objects, raw provider data, credentials, and
  ciphertext stay out of shared types.
- Current compatible custom endpoints remain compatible with canonical HTTP
  and HTTPS URLs, including localhost and LAN routes. Credentials, query/hash
  material, whitespace/backslashes, missing authorities, and WHATWG-normalized
  malformed spellings fail closed. Later connection UI owns any stronger
  new-link HTTPS guidance and disclosure.
- Billing is a discriminated structured fact, not inferred from its display
  sentence. BYOK and shared-capacity policy is checked in both directions;
  serving-provider fallback remains separate from shared-capacity fallback.
- `providerDefault` remains a provider fact even for a preview model. Task 4's
  reviewed Auto policy, not catalog parsing, decides whether that fact is
  eligible for selection. Persisted catalog freshness is documented as a
  display projection and cannot authorize a call without clock/policy
  recomputation.
- One-task selections and pending previews are structurally separate,
  immutable, project-bound, and expiring here. Atomic exactly-once redemption
  is runtime behavior intentionally left to Task 8; this task does not claim
  that ledger behavior.
- Three independent read-only reviews examined parser hardening, shared-type
  authority, route/billing semantics, URL/model-ID compatibility, and test
  coverage. Their concrete findings were repaired and the focused suite was
  rerun after each final authority correction.

## Checks run and real results

All output was observed in Lane E's task terminal and was not saved into the
repository.

1. Red-first focused compilation from `app`: `npx.cmd tsc -p
   tsconfig.unit.json`.
   - Failed as expected before implementation because
     `shared/model-connections.js`, `main/connections/schema.js`, and the IPC
     `ConnectionSummary` export did not exist.
2. Focused current-schema compilation and test from `app`: `npx.cmd tsc -p
   tsconfig.unit.json`, then `node --test
   dist-unit/tests-unit/model-connections-schema.test.js`.
   - Final result: **16 passed, 0 failed**.
3. Exact Task 2 unit command from `app`: `npm.cmd run test:unit`.
   - Final result: **490 total, 488 passed, 0 failed, 2 Windows
     host-specific skips**.
4. Exact Task 2 typecheck command from `app`: `npm.cmd run typecheck`.
   - Passed with no TypeScript errors.
5. `git diff --check`, complete exact-path staged-diff inspection, and final
   status inspection:
   - Passed. The implementation stage contains only Task 2's five named
     source/test/config paths; the report and LOG row are added separately by
     exact path. No unstaged implementation change or protected-lane path is
     present.

No Electron, Playwright, build, or real-provider check is required for this
invisible type/parser task. Every executable check is local and fake-only.

## How to try it

The decisive safe checks are local:

```powershell
cd "C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework\.lanes\e\app"
npm.cmd run test:unit
npm.cmd run typecheck
```

The adversarial schema matrix is in
`app/tests-unit/model-connections-schema.test.ts`.

## Limitations

This task creates vocabulary and validation only. It does not make model
switching or picking visible yet. Task 3 still owns the main-only store,
credential references, canonical project registry, and lossless legacy
migration. Later tasks own driver catalogs, reviewed/versioned Auto resolution,
conversation binding, Builder selection UI, atomic one-task redemption, route
receipts, and provider/runtime execution.

While Task 199 was in progress, clean `main` advanced independently through
landed Task 197. Lane E did not absorb that work mid-task; serial re-sync and
settlement happen only after this task's exact-path commit.

Disposition: **DONE**
