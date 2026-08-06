# Cairn model connections implementation plan

**Task:** 190

**Base:** 18a7a6e968e919783e824a7b44c1eb5daf6388bb

**Design authority:**
docs/superpowers/specs/2026-08-06-cairn-model-connections-design.md

**Plan status:** Proposed; do not execute until the owner approves the
three-decision card in the design

**Would supersede after approval and matching behavior:**
docs/superpowers/plans/2026-07-27-cairn-phase4-second-body.md

**Would absorb after approval:** the unshipped multi-worker chooser in Task 5
of docs/superpowers/plans/2026-07-29-cairn-level3a-worker-adapter.md

## Outcome

A complete beginner can connect an approved API account or provider-supported
subscription runtime, let Cairn fill compatible empty roles with Auto, and
start. Advanced users can pin any model reported available for that exact
connection. Every Cairn call and Builder dispatch resolves and records one
exact route. No raw chat API is mislabeled as a coding worker, and no Auto
choice crosses a provider, account, billing source, role, or runtime.

This is a sequence of small, independently recorded tasks. Each task begins
from landed main, claims its own number with a brief-only commit, preserves a
working Cairn, and closes with its own report and log row. No task may depend on
an unlanded provider branch.

Every **Task** or lettered **Slice** heading below maps to one separate future
repo task. Lettered slices are never combined into one brief.

## Owner-visible finish line

The default Connections view has two cards:

- **Cairn** — selected connection, Auto or exact model, connection state, and
  expected billing route.
- **Builder** — selected connection and trusted runtime, Auto or exact model,
  and the same honest state.

One click begins a provider-owned subscription sign-in. An API route needs one
additional secure credential entry. Only an explicit Connect / Use this
sign-in action and the required grants may fill empty compatible roles;
detection never does. The model list comes from that authenticated connection.
The ordinary screen never asks the owner to understand model IDs.

## Owner decisions required before execution

The plan recommends, but Task 190 does not approve:

1. after explicit connection, the link/metadata grant, and the standing Cairn
   grant when Cairn would be filled, fill only empty compatible roles;
2. use one persistent Builder default plus an expiring main-owned one-task
   selection instead of the old chooser on every multi-worker dispatch; and
3. use conversation-sticky Auto inside one connection under an approved,
   versioned quality/cost policy.

The owner must approve those three choices before Task 1. Until then, the
current connected-conductor contract and Kimi Decision 6 remain authoritative.
The following technical constraints do not need a new owner product choice:

4. A raw API connection is conductor-only. Builder capability requires a
   separately trusted TaskAdapter runtime.
5. Dynamic account catalogs are availability evidence, not a guarantee of
   capacity.
6. Unsupported consumer sign-in routes are absent. Experimental first-party
   runtimes remain gated until their own evidence passes.
7. Current consent, file limits, paid/data-bearing call pauses, serial
   execution, and envelope-authored results remain in force.

Version 1 assignments are app-profile defaults. A per-conversation binding
pins the exact Cairn route, each dispatch pins its exact Builder route, and
project data grants are keyed by a main-resolved ProjectAuthorityId, never by a
project-local conversation number alone.

If the owner declines or changes any of Decisions 1–3, stop and revise the
design before implementation.

## Global engineering rules

### Authority and custody

- Main owns connection storage, credential use, catalog refresh, assignment
  validation, Auto resolution, call receipts, and worker materialization.
- Main owns a project-authority registry. It binds a random non-secret ID to the
  selected root's canonical real path plus local filesystem identity; moves,
  replacements, ambiguity, or unavailable identity pause for project
  reauthorization. Renderer paths/project IDs are never authority.
- Renderer requests contain only bounded IDs and modes. Main re-derives
  access provider, account-safe label, model author, capabilities, model,
  billing, revisions, and runtime.
- Gateway routes distinguish the access/billing provider from the model author
  and from an actual serving provider reported only after a call.
- Every inference transport uses manual redirect handling and rejects every
  3xx. It never replays credentials or project/conversation bodies to a
  Location target. Metadata redirects follow the narrower documented
  same-origin rules in the design.
- Credentials never return over IPC and never enter localStorage, logs, task
  records, snapshots, fixtures, URLs, or chat.
- A main-owned ConductorGrant is separate from the credential. It binds the
  connection/auth revision, authorized data-scope version, billing and gateway
  routing revisions, and exact model or bounded Auto policy. Grants never
  transfer across connections.
- Provider-managed runtimes retain their own credentials. Cairn never reads or
  copies their token/config stores.
- Catalog caches contain normalized bounded metadata only, keyed by
  connectionId plus Cairn's authenticationRevision.
- Main serializes mutations and compares persisted storeRevision, so OAuth,
  reconnect, assignment, and Forget cannot lose one another's updates.

### Compatibility

- Keep the current OpenRouter connection working after every invisible
  foundation task.
- Migrate the legacy exact model as pinned, not Auto.
- Preserve old authenticated turns, result cards, run sessions, task records,
  and reports on read. New route fields use an additive version or explicit
  legacy absence.
- Preserve Core's overrideAdapterId seam. Main supplies or constrains it from
  the active Builder assignment; the renderer does not gain route authority.
- Keep Codex and Kimi fixed-model defaults until their connection-specific
  catalogs are proven; represent them as pinned, never Auto.
- A migrated connection references conductor.json as its one secret location;
  never duplicate keyB64. Forget removes every referenced Cairn-held copy.

### Test isolation

- Automated tests use fake local servers, fake executables, temporary homes,
  deterministic clocks/IDs, and inert credentials only.
- Tests must make real provider discovery impossible: explicit fake executable
  paths, sanitized environment allowlists, no inherited provider homes, and
  loopback-only network fixtures.
- Playwright remains serial with one worker and uses the existing app token.
- A dependency install, OAuth application registration, sign-in, credential
  use, paid request, or real model call is a separate concrete-risk approval.
- A metadata request may be non-billable and still uses a credential; real
  metadata smoke tests therefore also pause for approval.

### Definition of a shippable connector

Throughout this plan, **package every supported desktop target** means run
`npm run package` from `app` on each supported target host/CI image; a package
made only on the current operating system is not cross-target proof.

A connector is visible only if it has:

1. an official supported authorization route;
2. bounded account-safe status;
3. connection-specific model discovery or an honest exact manual fallback;
4. explicit conductor and worker-runtime capabilities;
5. billing wording it can defend;
6. deterministic Auto or Auto disabled;
7. redacted failures, cancellation, and reconnect behavior;
8. fake-only protocol tests;
9. packaging proof;
10. one owner-authorized real smoke check recorded without secrets, if the
    provider boundary cannot otherwise be proven; and
11. two-origin proof that inference credentials/project bodies are never
    replayed through a redirect, or an equivalent documented provider-runtime
    guarantee when Cairn does not own the HTTP transport.

## Canonical data flow

### Cairn call

1. Link/metadata authorization has already allowed a credentialed catalog check
   with no project data, and the standing ConductorGrant has then authorized
   the exact pinned model or bounded Auto policy plus project data scope.
2. Renderer sends the owner turn plus active assignment ID.
3. Main independently resolves the selected root's ProjectAuthorityId, then
   reads the assignment and binding keyed by project ID plus conversation ID,
   validates that project's grant and a fresh-enough catalog, and resolves an
   exact model.
4. Main freezes ResolvedRoute, durably appends/flushes/readbacks/authenticates
   an immutable attempt event, and releases no data if that fails.
5. The selected transport performs one request.
6. Main appends an immutable completion event with success, stopped, cancel,
   or redacted failure. An attempt without completion after crash remains
   indeterminate.
7. The conversation binding keeps Auto pinned. Any required new resolution
   pauses.

### Builder dispatch

1. Renderer asks for a preview using the active Builder assignment or an
   expiring main-owned one-task selection ID; it does not submit trusted route
   facts.
2. Main independently resolves ProjectAuthorityId, atomically redeems only a
   selection bound to that project into an immutable pending preview authority
   (or reads the active assignment), re-detects the runtime, validates
   connection/catalog, resolves the exact model, and builds exactly one
   adapter. Redemption blocks a second preview but leaves the created preview
   valid.
3. Main passes that adapter ID into Core's existing override seam.
4. Preview custody freezes routeInstanceId, connection, runtime, executable,
   model, billing, assignment/selection, link grant, authentication, catalog,
   capability, gateway-routing, and policy revisions.
5. Renderer confirms only the one-use preview and exact displayed disclosure.
6. Main repeats detection and resolution immediately before acceptance and
   recomputes the canonical routeAuthorityDigest over every stable authority
   and displayed field. routeInstanceId/resolvedAt are audit fields and are
   excluded from this comparison.
7. Any digest difference returns TASK_ROUTE_CHANGED, retires the preview, and
   starts nothing.
8. A match starts the adapter bound to the preview's original route once and
   records revalidatedAt. Provider rejection is a terminal honest failure,
   never permission to fall back.

## Serial tasks

### Task 1 — Extract the conductor transport seam with zero behavior change

**Visible outcome:** Existing OpenRouter/custom conversations look and behave
the same, but service code no longer assumes every future provider is one
OpenAI-compatible client.

**Create**

- app/src/main/conductor/transports/types.ts
- app/src/main/conductor/transports/openai-compatible.ts
- app/tests-unit/conductor-transport.test.ts

**Modify**

- app/src/main/conductor/client.ts
- app/src/main/conductor/service.ts
- app/tsconfig.unit.json

**Red first**

- A transport contract test pins current chat-completions request JSON, SSE
  delta ordering, finish, cancellation, malformed event, 401, 429, 5xx, and
  network error normalization.
- Existing client tests pin byte-compatible request headers and current fake
  server behavior.
- A service injection test proves the service depends on ConductorTransport,
  not a provider hostname.

**Implement**

- Define provider-neutral request, stream-event, usage, finish, request-ID, and
  redacted-error shapes.
- Move current HTTP/SSE behavior unchanged into openai-compatible.ts.
- Leave client.ts as the compatibility wrapper until all callers migrate.
- Inject a transport factory into service.ts with the current transport as the
  only registered implementation.

**Verify**

- From app: npm run test:unit
- From app: npm run typecheck
- From app: npm run build:vite
- Inspect one fake conversation in app/tests/conductor.spec.ts only if service
  wiring changed beyond unit coverage.

**Stop if:** the seam changes current consent, request payload, stream order,
or provider-visible behavior. Repair in this task before proceeding.

### Slice 1B — Make every inference redirect fail closed

**Visible outcome:** Normal conversations behave identically. A provider or
compatible endpoint that returns any redirect now stops with a redacted error;
Cairn never follows it with the owner's project/conversation body.

**Create**

- app/tests/fixtures/fake-model-provider.mjs

**Modify**

- app/src/main/conductor/client.ts
- app/src/main/conductor/transports/types.ts
- app/src/main/conductor/transports/openai-compatible.ts
- app/tests-unit/client.test.ts
- app/tests-unit/conductor-transport.test.ts
- app/tsconfig.unit.json

**Red first**

- Two loopback origins cover 301, 302, 303, 307, and 308 for a project-bearing
  POST. The first server receives the intended request; the Location target
  receives zero requests, headers, credentials, and body bytes.
- Same-origin and cross-origin inference redirects both stop. OAuth browser
  callbacks and explicitly documented metadata redirects are separate clients
  and retain their own rules.
- The transport returns one bounded redacted redirect error without logging
  Location credentials/query data or silently retrying.
- A hostile custom endpoint cannot override manual redirect behavior through
  renderer input or provider response.

**Implement**

- Set redirect: "manual" on the compatibility inference fetch and reject every
  3xx before stream parsing.
- Make no-follow inference behavior mandatory in ConductorTransport; every
  later native transport test must run the same two-origin fixture.

**Verify**

- From app: npm run test:unit
- From app: npm run typecheck
- From app: npm run build:vite

**Stop if:** the HTTP client can replay headers or body before Cairn observes
the redirect, or the policy would accidentally alter provider-owned OAuth
browser callbacks. Use a lower-level no-follow client before proceeding.

### Task 2 — Add versioned connection, assignment, and route types

**Visible outcome:** None. The running single connection remains authoritative.
The repository gains one strict vocabulary shared by later tasks.

**Create**

- app/src/shared/model-connections.ts
- app/src/main/connections/schema.ts
- app/tests-unit/model-connections-schema.test.ts

**Modify**

- app/src/shared/ipc.ts
- app/tsconfig.unit.json

**Red first**

- Exact parsers reject unknown keys, controls/HTML in labels, duplicate IDs,
  oversized strings/arrays, unknown enums, malformed URLs, secret-like fields,
  worker roles without runtime IDs, and unsafe model IDs.
- Renderer projections cannot contain ciphertext, tokens, executable paths,
  raw provider payloads, or provider runtime configuration.
- Legacy absence is distinct from a malformed current version.
- Account labels distinguish provider-verified, owner-label, and unavailable;
  an owner label is never rendered as verified identity.
- ProjectAuthorityId is required on conductor grants, conversation bindings,
  one-task selections, and resolved routes. Project-local conversationId alone
  is never a profile-store key.
- ResolvedRoute cannot parse without route instance, an assignment-or-selection
  authority union, link grant, authentication, billing, catalog, capability,
  gateway-routing, runtime, executable, and route-authority-digest fields,
  plus a Cairn grant revision for conductor routes.
- Conductor routes accept only assignment authority and require a Cairn grant;
  worker routes accept assignment or one-task selection authority, require a
  runtime/link grant, and reject a borrowed Cairn grant.
- ConductorAssignment contains no profile-global continuity model.
- OneTaskWorkerSelection has its own revision, is bounded and expiring, and is
  separate from the persistent WorkerAssignment. Its ID redeems exactly once
  into PendingWorkerRouteAuthority without invalidating that preview.

**Implement**

- Add the design's ConnectionSummary, ModelOption, ConductorAssignment,
  WorkerAssignment, ConversationRouteBinding, OneTaskWorkerSelection,
  PendingWorkerRouteAuthority, RouteAuthoritySource,
  ProviderManagedRuntimeLink, LinkMetadataGrant, ConductorGrant,
  GatewayRoutingPolicy, CatalogSnapshot, ProjectAuthorityId, and ResolvedRoute
  types.
- Keep persisted credential unions main-only.
- Bound every string, collection, URL scheme, and catalog size.
- Represent billing as pay-as-you-go, subscription, local, or unknown, with a
  structured source/certainty and a non-authoritative display label.
- Include normalized price/currency, availability evidence, recommendation
  eligibility, and provider-default facts needed by a price-banded Auto policy.
- Document authenticationRevision as Cairn link revision, not proof of an
  unchanged external account.

**Verify**

- From app: npm run test:unit
- From app: npm run typecheck

**Stop if:** shared types require a secret, raw SDK object, or executable path.

### Task 3 — Land the main-only store and lossless legacy migration

**Visible outcome:** Current owners reconnect to the same pinned model without
re-entering a credential. No normal connection hub appears yet; a malformed
store receives only the minimal exact-file recovery card needed to avoid
stranding the owner.

**Create**

- app/src/main/connections/store.ts
- app/src/main/connections/secrets.ts
- app/src/main/connections/migrate.ts
- app/src/main/connections/project-authority.ts
- app/tests-unit/model-connections-store.test.ts
- app/tests-unit/model-connections-migrate.test.ts
- app/tests-unit/project-authority.test.ts

**Modify**

- app/src/main/conductor/keystore.ts
- app/src/main/conductor/service.ts
- app/src/main/conductor/store.ts
- app/src/shared/ipc.ts
- app/src/preload.ts
- app/src/main/ipc.ts
- app/src/renderer/components/ConnectCard.tsx
- app/src/renderer/app.css
- app/src/main/atomicwrite.ts only if a verified-readback helper is genuinely
  general
- app/tests-unit/atomicwrite.test.ts only if that helper changes
- app/tests/fixtures/conductor-connection.ts
- app/tests/conductor.spec.ts
- app/tsconfig.unit.json

**Storage decision**

- The new app has one active authority,
  app.getPath("userData")/model-connections.json, beside conductor.json. Its
  root discriminant is cairn-model-connections/v1.
- A migrated connection references conductor.json as its one active secret
  location and stores only its expected ciphertext digest; keyB64 is not copied.
- New connections store one OS-encrypted credential blob in the new store or a
  provider-managed reference, plus non-secret metadata.
- Catalog cache is the separate model-catalogs.json, so corruption cannot
  threaten credentials.
- The root storeRevision is changed only by a serialized main-process mutation
  queue with expected-revision comparison.
- The same main-owned store holds bounded project-authority registry entries:
  random ProjectAuthorityId, canonical-root digest, local filesystem-identity
  digest, and revision. Renderer paths/IDs and project conversation numbers are
  never keys. Raw paths do not enter renderer projections or task records.

**Red first**

- Valid v1 baseUrl, exact model, keyB64, and authorizedDataScope migrate
  losslessly to one pinned Cairn assignment.
- Migration creates a legacy-pinned LinkMetadataGrant with empty metadata scope
  and a legacy-pinned ConductorGrant restricted to the unchanged endpoint,
  model, billing-unknown state, exact old data scope, and main-resolved current
  ProjectAuthorityId. Tasks 3-5 can record both revisions, but the bridge cannot
  cross projects, refresh a catalog, use Auto, change model/billing, or widen
  data. With no canonical current project, bridge creation waits.
- Pasted-key and OAuth legacy records both become legacy/unknown auth origin.
- Unknown endpoints become constrained openai-compatible connections.
- Migration is idempotent and does not rewrite on read.
- Migration never creates a second decryptable credential copy.
- Atomic-write failure leaves conductor.json and the last valid new store
  byte-identical.
- Verified readback mismatch fails closed.
- Truncated, malformed, or unknown-version legacy/new data becomes
  recovery-required and blocks calls/ordinary mutation while preserving the
  exact-file erase recovery action.
- Forget serializes competing mutations, deletes and verifies the referenced
  legacy credential as its first irreversible boundary, then persists/readbacks
  forget-pending, removes cache, and removes or rewrites new metadata last. A
  failed credential deletion changes no authority. Failpoints after every
  irreversible boundary prove restart/remigration/old-reader cannot recover a
  credential once deletion succeeds.
- Corrupt legacy, corrupt new store, both present, failed/partial deletion, and
  successful exact-file erase each have deterministic recovery states.
- The first recovery-required state has an owner-visible exact-file card and
  main-owned IPC action in this task. It names target/effect/recovery, requires
  destructive-risk approval, supports cancel, and never exposes a secret.
- Recovery erase deletes/verifies conductor.json first, cache second, and the
  authority store last. If credential deletion fails, the authority store is
  untouched; every partial state remains recovery-required.
- Overlapping OAuth completion, reconnect, assignment, and Forget mutations
  serialize or reject stale storeRevision; no successful write is lost.
- The Electron fixture detaches/restores conductor.json,
  model-connections.json, and model-catalogs.json together; no real/stale
  credential can remain active during or after a test.
- Reconnecting generates a new random non-secret authenticationRevision.
- Two canonical project roots with conversation 001 receive different random
  ProjectAuthorityIds and cannot read each other's bridge, binding, grant,
  attempt, or completion. Renderer path/ID tampering fails; root move,
  replacement, ambiguity, and unavailable filesystem identity require
  reauthorization.
- No serialized status, cache, log message, or thrown error includes fake
  secret material.

**Implement**

- Parse before decrypt; bound before allocate.
- Resolve the selected root in main and persist a random ProjectAuthorityId
  bound to canonical real path plus local filesystem identity. Never accept a
  renderer project ID or key profile authority by conversationId alone.
- Store a main-only legacy-file reference and ciphertext digest without copying
  or exposing the encrypted blob.
- Preserve the legacy exact model as pinned and current consent scope exactly.
- Materialize the narrow legacy-pinned grant bridge; never infer metadata or
  Auto authorization from it.
- Ignore renderer cairn-last-seat as authority.
- Use atomic replacement followed by strict readback.
- Surface a redacted recovery state instead of treating malformed data as
  disconnected.
- Implement the exact **Erase Cairn model connections** recovery operation over
  model-connections.json, model-catalogs.json, and a referenced conductor.json.
  Co-land its minimal ConnectCard/IPC/preload surface now. It is called only
  after the exact owner-facing destructive-risk approval, follows
  secret-first/cache-second/authority-last order, and reports partial failure
  without secrets.
- Retain matching legacy authorizedDataScope as legacy evidence, not as a grant
  for Auto. Compatibility mode keeps today's exact pinned route until Task 6;
  the first visible connection-first use renews the grant once.

**Verify**

- From app: npm run test:unit
- From app: npm run typecheck
- From app: npm run build:vite
- With the app token: npx playwright test tests/conductor.spec.ts --workers=1

**Rollback:** while the legacy reference exists and Forget has not verified
credential deletion, an older binary may still use that one conductor.json
credential. Verified deletion is the first irreversible boundary and ends that
rollback path. A crash before the later forget-pending write leaves a missing
referenced credential that new Cairn reports as recovery-required; an old
binary finds no credential. Reconnect is then the recovery. Never create a
backup credential copy.

**Stop if:** recovery-required would land without its approved exact-file exit,
the legacy bridge authorizes anything beyond the unchanged pinned route, or a
failpoint can delete authority before the surviving legacy credential.

### Task 4 — Add catalog drivers, cache, and sticky Auto headlessly

**Visible outcome:** None. Current pinned OpenRouter behavior continues while
the selection kernel becomes testable without network access.

**Create**

- app/src/main/connections/drivers/types.ts
- app/src/main/connections/registry.ts
- app/src/main/connections/catalog.ts
- app/src/main/connections/catalog-cache.ts
- app/src/main/connections/resolve.ts
- app/src/main/connections/drivers/fake.ts
- app/tests-unit/model-catalog.test.ts
- app/tests-unit/model-resolve.test.ts

**Modify**

- app/src/main/conductor/service.ts
- app/tsconfig.unit.json

**Red first**

- Cache identity requires exact connectionId and authenticationRevision.
- Normalization rejects duplicate/control/oversized/malformed entries.
- A stale snapshot is display-only after the hard TTL.
- Network outage does not mark auth revoked; 401/403 does.
- Removed pinned model becomes needs-attention.
- Auto retains the last resolved eligible model.
- Without a retained model, Auto accepts only a versioned, reviewed driver
  recommendation over exact eligible IDs, then an explicit provider default
  whose exact semantics the driver has verified.
- Unknown/new/preview/deprecated/hidden entries do not become Auto merely by
  sort order.
- No eligible default makes Auto unavailable.
- No resolution crosses connection, provider, account, billing, role, or
  runtime.
- A raw API model fails worker resolution even when it advertises tools.
- A fixed worker with no account catalog resolves only as pinned, never Auto.
- Reauth invalidates cache and prior Auto resolution.
- Two conversations on one profile assignment can keep different exact models
  across policy/catalog change and restart.
- Two projects may both have conversation 001; their grants, bindings,
  selections, previews, receipts, and result commentary remain isolated by
  ProjectAuthorityId.
- A conversation binding persists the authenticated secret-free ResolvedRoute,
  not only a model ID/digest, so a later profile assignment change cannot erase
  the old connection needed for continuity.
- routeAuthorityDigest is deterministic over all stable authority/display
  fields and excludes the digest slot itself plus routeInstanceId/resolvedAt/
  observation timestamps.
- Gateway billing source and routing policy are part of eligibility/revision;
  a BYOK/shared-capacity change cannot reuse an old resolution.

**Implement**

- Keep provider raw responses inside the driver.
- Canonically normalize and hash bounded catalog fields into catalogRevision.
- Make freshness policy explicit and clock-injected.
- Store conductor continuity in ConversationRouteBinding keyed by
  ProjectAuthorityId plus conversationId, never by the project-local number
  alone or as lastResolvedModelId on the profile assignment.
- Revalidate the binding's current grants, credential, catalog, billing,
  capability, and routing policy before each call; the persisted route is
  continuity evidence, not permission to ignore revocation.
- Return reason codes suitable for beginner UI and diagnostics.
- Resolve before data-bearing I/O; never accept a provider-side opaque router
  alias when exact model attribution cannot be recovered.

**Verify**

- From app: npm run test:unit
- From app: npm run typecheck

**Stop if:** any Auto rule needs a global ranking of providers or an invented
meaning of newest/best.

### Task 5 — Add authenticated exact-route call receipts before visible Auto

**Visible outcome:** Current conversations still look the same. New and failed
calls have durable exact route attribution; old conversations remain readable.

**Create**

- app/src/main/conductor/callreceipt.ts
- app/tests-unit/callreceipt.test.ts

**Modify**

- app/src/shared/ipc.ts
- app/src/main/conductor/service.ts
- app/src/main/conductor/store.ts
- app/src/main/conductor/turnauth.ts
- app/src/main/conductor/cardauth.ts
- app/src/main/conductor/relay.ts
- app/src/main/conductor/custody.ts
- app/tests-unit/store.test.ts
- app/tests-unit/turnauth.test.ts
- app/tests-unit/resultcard.test.ts
- app/tests/conductor.spec.ts
- app/tsconfig.unit.json

**Red first**

- A normal turn durably appends one immutable attempt event and a later
  immutable completion event.
- Attempt append, flush, readback, or authentication failure starts no
  transport and releases no project data.
- A simulated crash after attempt persistence but before completion recovers as
  indeterminate, never missing or successful.
- 401, 429, cancel, malformed stream, and network failure retain the exact
  attempted route with only a normalized non-secret error.
- The post-result commentary call receives its own callId and route receipt.
- routeInstanceId, connection, driver, access provider, model author, exact
  model, billing, ProjectAuthorityId, assignment, link grant, applicable Cairn
  grant, authentication, catalog, capability, gateway-routing,
  runtime/executable, selection, policy, authorized-scope digest, and
  runtimeId/null are covered by custody digests.
- Two fake projects using conversation 001 cannot replay or read each other's
  attempt/completion, binding, grant, or result-commentary route.
- A gateway-reported serving provider is appended to the completed receipt; it
  is never claimed as pre-call fact.
- Any tamper fails authentication.
- Legacy turns/cards with no route receipt retain their historical meaning.
- An unchanged migrated pinned call records both legacy-bridge grant revisions;
  the bridge still rejects catalog, Auto, changed-model, changed-billing, and
  widened-scope attempts before transport.
- No credential or raw provider error appears.

**Implement**

- Extend transcript event parsing/order for attempt and completion alongside
  owner, Cairn, and envelope custody.
- Main freezes ResolvedRoute and durably appends, flushes, reads back, and
  authenticates the attempt before transport I/O.
- Completion appends; it never rewrites the attempt.
- Link owner turn, provider attempt, reply, result card, and commentary where
  applicable without pretending a failed call produced a reply.
- Bind safe provider request IDs and usage only after receipt.

**Verify**

- From app: npm run test:unit
- From app: npm run typecheck
- From app: npm run build:vite
- With the app token: npx playwright test tests/conductor.spec.ts --workers=1

**Stop if:** attribution exists only on successful replies or changes old
custody meaning silently.

### Slice 6A — Prove the OpenRouter connection backend

This is one headless repo task. It changes no owner-facing connection flow.

**Create**

- app/src/main/connections/drivers/openrouter.ts
- app/tests-unit/openrouter-connection.test.ts

**Modify**

- app/tests/fixtures/fake-model-provider.mjs
- app/src/main/connections/registry.ts
- app/src/main/connections/catalog.ts
- app/src/main/conductor/oauth.ts
- app/src/main/conductor/service.ts
- app/src/main/conductor/consent.ts
- app/tsconfig.unit.json

**Red first**

- Link/metadata authorization is distinct from the later standing Cairn grant.
- No credentialed catalog request occurs before the link grant; it sends no
  project/conversation data.
- Cancel after metadata leaves a saved, unassigned **not authorized for Cairn**
  connection and no inference call.
- /api/v1/models/user, not catalog order or BODIES, supplies normalized choices:
  https://openrouter.ai/docs/api/api-reference/models/list-models-user
- Auto uses canonical exact slugs; mutable latest aliases and opaque
  cross-model routers are ineligible for standing exact-route consent.
- Region-specific API origin is preserved for catalog and calls.
- Cross-origin redirects are rejected before forwarding Authorization.
- Inference uses Slice 1B's no-follow rule; the two-origin 307/308 cases receive
  neither Authorization nor project/conversation body at the target.
- Gateway provider fallback and BYOK/shared-capacity policy are structured,
  revisioned, and never collapsed into one pay-as-you-go label.
- Safe completion metadata captures is_byok, serving provider, and router
  attempts; none is claimed before the call.
- Brand-new Auto uses only the later owner-approved exact-ID/price-band policy;
  without it Auto is unavailable.

**Verify:** app unit, typecheck, and Vite build.

**Stop if:** account filtering, billing-source truth, redirect protection, or
routing metadata cannot be represented honestly.

Routing evidence:
https://openrouter.ai/docs/guides/routing/provider-selection,
https://openrouter.ai/docs/guides/features/router-metadata, and
https://openrouter.ai/docs/guides/overview/auth/byok

### Slice 6B — Ship the minimal OpenRouter Cairn connection and contract

This is a second repo task. The owner must already have approved the design's
three decisions, exact contract wording, and the first versioned OpenRouter
recommendation (ordered exact IDs, role, reason, maximum expected price band).
The contract amendment lands with this first visible behavior, not before.

The approved contract text must distinguish link/metadata authorization from
standing project-data authorization; name one active Cairn assignment among
saved connections; bind standing consent to connection, billing/gateway policy,
exact model or bounded sticky policy, and main-resolved target
ProjectAuthorityId; record the exact resolved model/project on every call;
distinguish Forget from external provider logout; and preserve exact approval
for every Builder dispatch.

**Create**

- app/src/renderer/components/ConnectionHub.tsx
- app/src/renderer/components/RoleConnectionCard.tsx
- app/tests/model-connections.spec.ts

**Modify**

- AGENTS.md
- CONTRACT-TEMPLATE.md
- cairn.html
- CHANGELOG.md
- app/package.json
- app/package-lock.json
- cli/package.json
- cli/package-lock.json
- core/package.json
- package-lock.json
- app/src/shared/ipc.ts
- app/src/preload.ts
- app/src/main/ipc.ts
- app/src/main/connections/store.ts
- app/src/main/conductor/service.ts
- app/src/main/conductor/consent.ts
- app/src/renderer/components/ConnectCard.tsx
- app/src/renderer/screens/Settings.tsx
- app/src/renderer/screens/Workspace.tsx
- app/src/renderer/screens/Chat.tsx
- app/src/renderer/App.tsx
- app/src/renderer/app.css
- app/tests-unit/consent.test.ts
- app/tests/conductor.spec.ts
- app/tests/fixtures/conductor-connection.ts

**Red first**

- API key and current PKCE begin connection-first; the uncontrolled secret input
  clears after one IPC request and never returns.
- Metadata grant → catalog/Auto → standing grant is the only order.
- Only the explicit successful action plus standing grant fills empty Cairn;
  later connections and detected runtimes never replace it.
- A migrated connection renews its connection/billing/model grant once before
  Auto or a changed route sends project data.
- Auto is per-conversation sticky across restart; two conversations may retain
  different exact models.
- Two projects with local conversation 001 show and use only their own standing
  grants/bindings; selecting the second project never reuses the first grant.
- Renderer-tampered route facts fail closed.
- Normal Forget removes the one credential location. recovery-required exposes
  Task 3's already-shipped exact-file erase authority inside the new hub, with
  target/effect/recovery and a separate destructive-risk approval; partial
  failure remains blocked and honest.
- Contract mirrors and current selected-file limits pass.

**Implement**

- Keep Advanced and compatible endpoints on their current legacy surface until
  Slice 6C; this slice changes only the normal OpenRouter Cairn path.
- Move contract, desktop, CLI, Core, and lockfiles together to the next unused
  minor version at the landed base.
- Run sync-contract for the ignored core/assets/contract.md artifact; never
  stage it.

**Verify**

- From core: npm test
- From app: npm run test:unit
- From app: npm run typecheck
- From app: npm run build:vite
- From app on each supported target: npm run package
- With the app token: npx playwright test tests/model-connections.spec.ts
  tests/conductor.spec.ts --workers=1
- Inspect normal, metadata-consented, standing-grant, canceled-between-gates,
  migrated-renewal, and recovery-required states at wide/narrow sizes.

**Stop if:** the three owner decisions or exact contract wording are not
approved, the two grants can be bypassed, or current selected-file and
per-dispatch consent cannot remain intact. Do not ship a partial visible flow.

### Slice 6C — Add Advanced catalog/failure UI and compatible endpoints

This is a third repo task.

**Create**

- app/src/main/connections/drivers/openai-compatible.ts
- app/tests-unit/compatible-connection.test.ts

**Modify**

- app/src/shared/bodies.ts
- app/src/main/conductor/seatnote.ts
- app/src/renderer/components/ConnectionHub.tsx
- app/src/renderer/components/ConnectCard.tsx
- app/src/renderer/components/BodyPill.tsx
- app/src/renderer/screens/Settings.tsx
- app/src/renderer/app.css
- app/vite.lab.config.ts
- app/tests-unit/bodies.test.ts
- app/tests-unit/seatnote.test.ts
- app/tests/model-connections.spec.ts

**Red first**

- Advanced shows only one connection's search, lifecycle, reasoning, price, and
  fetched time.
- Stale, removed, revoked, offline, malformed, loading, and empty are distinct.
- Compatible endpoints default to HTTPS; loopback HTTP is explicitly local.
- Credentialed probes never follow an origin-changing redirect.
- Inference rejects same-origin and cross-origin redirects without replaying
  credentials or body; compatible endpoint configuration cannot weaken this.
- Missing/invalid models endpoint means exact manual model and no Auto.
- Static BODIES/prices are presentation history, never access/billing truth.

**Verify**

- From app: npm run test:unit
- From app: npm run typecheck
- From app: npm run build:vite
- From app: npm run build:lab
- From app on each supported target: npm run package
- With the app token: npx playwright test tests/model-connections.spec.ts
  --workers=1
- Visually inspect each bounded state.

**Stop if:** compatible endpoints can redirect credentials across origins,
manual-model truth cannot be separated from authenticated availability, or any
failure state collapses into a misleading connected/ready state.

### Task 7 — Parameterize existing Codex and Kimi worker adapters

**Visible outcome:** None. Current fixed routes behave identically, but one
immutable binding can carry a validated exact model and connection identity
through every worker surface.

**Create**

- app/src/main/workers/types.ts
- app/src/main/workers/resolver.ts
- app/tests-unit/worker-resolver.test.ts

**Modify**

- core/src/routing.ts
- core/src/serial.ts
- core/src/records.ts
- core/src/codex.ts
- core/src/kimi.ts
- core/src/index.ts
- app/src/main/adapters.ts
- app/src/main/workeridentity.ts
- app/src/shared/ipc.ts
- core/test/routing.test.ts
- core/test/serial.test.ts
- core/test/records.test.ts
- core/test/codex.test.ts
- core/test/kimi.test.ts
- app/tests-unit/kimi-wiring.test.ts
- app/tests-unit/workeridentity.test.ts
- app/tests-unit/resultcard.test.ts

**Red first**

- Today's production factories keep one explicit legacy-v3 binding through
  this headless task. It carries the current fixed model and exact launch
  target but does not fabricate a connection, assignment, grant, account, or
  catalog revision. The full-authority production cutover belongs to Task 8.
- The future resolved-binding test path requires routeInstanceId, connectionId,
  runtimeId, assignment/selection, link grant, authentication/link, billing,
  catalog, capability, gateway-routing, runtime/executable revisions, exact
  model, and selection mode. It never borrows a standing Cairn grant.
- Offline stays explicitly offline and does not invent connection identity.
- Bound model appears identically in descriptor, disclosure, authorization
  comparison, task contract, record/result route, and CLI process argument.
- Confirmation for model A can never spawn model B.
- Changed connection/auth/billing/capability cannot cross the process seam.
- Existing factory calls default to today's Codex and Kimi models and keep
  current fake fixtures compatible through only the named legacy-v3 path.
- Detection resolves an absolute executable and canonical fingerprint once;
  the adapter captures that main-only launch target and sanitized environment.
  PATH reordering cannot change the spawned file, and executable replacement
  before the pre-spawn check fails closed.
- Codex and Kimi runners never perform a second PATH/command resolution after
  the binding is made. Tests fail if the probe and spawn paths differ.
- A synthetic third TaskAdapter still reaches verified DONE.
- Main materializes one resolved adapter only. Stable adapter IDs identify the
  runtime kind; routeInstanceId/full descriptor distinguish accounts/models, so
  Core sees no duplicate IDs and serial invocation names remain stable.

**Implement**

- Keep universal TaskAdapter; do not put provider SDK types in Core.
- Parameterize Codex --model and Kimi -m from an immutable main-resolved
  binding.
- Add a main-only ExecutableLaunchBinding with absolute path, argv prefix,
  sanitized environment, and executableRevision. Pass the exact path into the
  Codex/Kimi process runner and fingerprint it immediately before spawn; never
  re-run findExecutable or consult a changed PATH.
- Keep route-instance identity separate from descriptor.id; do not derive a
  process command or invocation name from a composite account/model ID.
- Extend the adapter/task contract additively for the tested future binding but
  leave current execution on the explicit legacy-v3 discriminant until Task 8
  can create real connections/grants. Preserve legacy report/card reads.
- Do not claim dynamic Codex or Kimi catalogs yet.

**Verify**

- From core: npm test
- From app: npm run test:unit
- From app: npm run typecheck
- From app: npm run build:vite

**Stop if:** the same absolute executable/fingerprint cannot be carried from
detection through the adapter into spawn without exposing its path to the
renderer, or unchanged production execution would require invented authority.

### Task 8 — Ship one active Builder assignment and exact dispatch resolution

**Visible outcome:** Settings shows one Builder connection. Dispatch uses it by
default, displays the exact runtime/model/billing route, and offers **Change
for this task** without asking on every run.

**Create**

- app/src/renderer/components/BuilderConnectionCard.tsx
- app/tests-unit/worker-assignment-ipc.test.ts

**Modify**

- app/src/shared/model-connections.ts
- app/src/shared/ipc.ts
- app/src/preload.ts
- app/src/main/ipc.ts
- app/src/main/connections/store.ts
- app/src/main/connections/registry.ts
- app/src/main/workers/resolver.ts
- app/src/main/adapters.ts
- app/src/main/tasks.ts
- app/src/main/conductor/relay.ts
- app/src/renderer/components/ConnectionHub.tsx
- app/src/renderer/components/DisclosureConfirm.tsx
- app/src/renderer/components/ModelRoute.tsx
- app/src/renderer/screens/Settings.tsx
- app/src/renderer/screens/TaskRun.tsx
- app/src/renderer/screens/Chat.tsx
- app/src/renderer/town/model.ts
- app/src/renderer/town/presentation.ts
- app/src/renderer/app.css
- app/tests-unit/workeridentity.test.ts
- app/tests-unit/resultcard.test.ts
- app/tests-unit/townmodel.test.ts
- app/tests-unit/townpresentation.test.ts
- app/tests/routing.spec.ts
- app/tests/serial.spec.ts

**Red first**

- Current Codex/Kimi detection creates provider-managed connection candidates
  without reading their auth stores.
- Detection alone saves and assigns nothing. With both Codex and Kimi detected
  and Builder empty, priority/order chooses neither.
- An explicit **Use this sign-in** creates a stable random connectionId and
  ProviderManagedRuntimeLink plus its explicit link grant; only that successful
  owner action may fill empty Builder.
- Restart reconciles only the stored runtime kind plus exact non-secret
  executable/version fingerprint. Runtime/executable drift invalidates a
  preview; an unobservable external account switch remains explicitly
  account-uninspectable rather than receiving a fake auth revision.
- Other connected workers stay inactive until the owner changes Builder.
- Existing fixed Codex/Kimi workers migrate as pinned exact models, never Auto.
- A raw API connection is labeled Conversation only and cannot save as Builder.
- task:route reads main-owned assignment and materializes one exact adapter.
- This is the production cutover: every newly materialized worker now requires
  the full resolved assignment-or-selection authority and link grant. The
  Task-7 legacy-v3 execution path cannot be selected after the new Builder flow
  is active, and no placeholder authority is invented.
- **Change for this task** creates an expiring main-owned selection with its own
  ProjectAuthorityId and model policy; its one-preview use never mutates the
  active assignment and cannot be redeemed from another project.
- Preview creation atomically redeems selectionId/selectionRevision into
  PendingWorkerRouteAuthority. The external ID cannot create another preview,
  but redemption does not invalidate the preview it authorized.
- One-task selection and its redeemed pending authority are memory-only;
  restart invalidates either state and any selection-backed preview without
  changing the active Builder. Assignment-backed previews may reattach only
  when their full persisted custody passes.
- Existing overrideAdapterId can only match the one adapter main materialized
  from the active assignment/one-task selection.
- Pending preview stores routeInstanceId plus assignment/selection, link grant,
  authentication, catalog, capability, runtime/executable, gateway-routing,
  billing, exact model revisions, and canonical routeAuthorityDigest.
- Assignment change, new Auto result, auth/link change, billing change, removed
  model, revoked connection, runtime disappearance, or catalog failure between
  preview and run returns TASK_ROUTE_CHANGED and starts nothing.
- Run-time resolution recomputes the stable authority/display fields and
  compares routeAuthorityDigest; it does not compare new routeInstanceId or
  resolvedAt values. A match retains the preview audit identity, records
  revalidatedAt, runs once, and consumes the preview once.
- Revalidation produces the same main-only absolute launch target and
  executable fingerprint; the adapter spawns that target without a second PATH
  lookup and checks it immediately before spawn.
- Provider model rejection does not retry or fall back.
- DisclosureConfirm renders the full main-derived route; checkedDisclosure
  validates every displayed field.
- RunSessionSnapshot, reload/reattach, result relay/card, and task record retain
  the exact route.
- Existing reload coverage is extended so a preview/session reattaches with the
  full route or fails authentication; adapterId alone is insufficient.
- An account-uninspectable ambient runtime says so and uses billing unknown;
  owner labels never become verified account labels.
- Codex-specific running/result copy becomes Builder/provider-neutral.

**Implement**

- Resolve assignment before calling previewSerialRoute, then pass the exact
  adapter ID through Core's existing override.
- Add oneTaskSelectionId as the renderer's only optional selection authority;
  legacy adapterId cannot switch a connection/model.
- At run, re-read/re-detect/re-resolve and compare the canonical stable route
  digest before accepting; preserve routeInstanceId/resolvedAt as audit fields.
- Renderer confirms the one-use preview; it never posts trusted route facts.
- Main derives ProjectAuthorityId from the selected root for selection,
  preview, reattach, run, record, and commentary; renderer project IDs are
  ignored/rejected.
- Keep per-dispatch disclosure and approval unchanged.

**Verify**

- From core: npm test
- From app: npm run test:unit
- From app: npm run typecheck
- From app: npm run build:vite
- From app on each supported target: npm run package
- With the app token: npx playwright test tests/routing.spec.ts tests/serial.spec.ts --workers=1
- Manually inspect one and two connected-worker layouts without invoking either
  real worker.

**Stop if:** an ambient CLI would be presented as account-verified or
Auto-capable. A deliberately linked legacy worker may remain pinned with
account-uninspectable and billing unknown; it never satisfies the stronger
dedicated-connection claim.

### Task 9 — Codex app-server go/no-go spike

**Visible outcome:** A durable task report says exactly which Codex
subscription capabilities Cairn may ship. No connector appears solely because
the protocol exists.

**Create**

- app/src/main/connections/spikes/codex-app-server.ts
- app/tests/fixtures/fake-codex-app-server.mjs
- app/tests-unit/codex-app-server-spike.test.ts

**Modify**

- app/tsconfig.unit.json

**Fake-only proof**

- stdio JSONL framing, startup/shutdown, account/read, login event handling,
  model/list pagination/capabilities/default, rate-limit read, cancellation,
  crash, timeout, malformed messages, and redaction.
- A dedicated Cairn Codex home/environment can exclude project config,
  AGENTS/skills, MCP servers, session history, and ambient credentials.
- Provider logout and exact cleanup of that dedicated fake home remove reusable
  auth/config/log/session state without touching an ambient Codex home;
  partial cleanup is recoverable and secret-free.
- The executable detected is the executable later used.
- No executable path, token, raw account payload, or home path reaches renderer.

**Go/no-go questions**

1. Is the app-server surface documented as production-suitable for Cairn's
   packaging and transport?
2. Can provider-owned sign-in be isolated without Cairn touching tokens?
3. Can model/list and the exact exec invocation be tied to the same account and
   runtime revision?
4. Can a conductor turn be guaranteed tool-free, instruction-free, session-free,
   and cancellable?
5. Can billing be stated as subscription, API, or honestly unknown?
6. Does the provider expose a bounded logout, and can Cairn delete only its
   exact dedicated connection home so restart cannot reuse local credentials?

Official evidence:
https://learn.chatgpt.com/docs/app-server

**Risk pause**

No install, sign-in, credential, metadata request, or real call belongs in the
fake phase. If fake/docs evidence is promising, show the owner the exact Codex
binary/home, metadata sent, project data exclusion, cost/quota possibility,
and recovery before requesting one real smoke approval.

**Disposition**

- Pass only the proven capabilities: worker catalog, conductor, or both.
- If account binding or tool containment fails, keep the current Codex worker
  fixed-model/provider-managed and leave conductor gated.

**Verify**

- From app: npm run test:unit
- From app: npm run typecheck
- Run the focused compiled fake app-server spike test with no Codex discovery
  or provider home inherited.

**Stop if:** dedicated state, logout/cleanup, account binding, executable
identity, or tool/session containment cannot be proven with the fake harness
and official surface. A no-go report is a valid DONE outcome.

### Task 10 — Ship only the Codex capabilities that passed Task 9

**Create if the spike passes**

- app/src/main/connections/drivers/codex.ts
- app/src/main/conductor/transports/codex-app-server.ts only if conductor
  containment passed
- app/tests-unit/codex-connection.test.ts

**Modify**

- app/src/main/connections/registry.ts
- app/src/main/connections/store.ts
- app/src/main/connections/secrets.ts
- app/src/main/ipc.ts
- app/src/main/workers/resolver.ts
- app/src/main/adapters.ts
- core/src/codex.ts
- core/test/codex.test.ts
- app/src/main/conductor/service.ts only for a passed conductor capability
- app/src/renderer/components/ConnectionHub.tsx
- app/src/renderer/components/ConnectCard.tsx
- app/tests/model-connections.spec.ts
- app/tests/fixtures/fake-codex-app-server.mjs

**Required pins**

- Provider-owned login never exposes tokens to Cairn renderer or records.
- UI says **Connect a separate Codex account to Cairn**. It never calls the
  ambient worker's stored login an isolated connection.
- Catalog and exec use the same dedicated account/runtime revision.
- Core launches the exact worker with the dedicated CODEX_HOME and explicit
  environment allowlist; it inherits no ambient auth/config/session state.
- Auto uses a reviewed versioned Codex recommendation or a verified exact
  isDefault flag.
- Runtime/account change invalidates preview and conversation resolution.
- No inherited tool/config/session surface exists for conductor.
- Forgetting Cairn's connection does not falsely claim global ChatGPT logout.
- Each dedicated connection owns exactly
  `app.getPath("userData")/provider-homes/codex/<connectionId>` as its
  main-only CODEX_HOME. Forget shows the resolved absolute
  target/effect/recovery, invokes
  provider logout when the accepted spike proved it, then deletes and verifies
  only that connection-scoped auth/config/log/session directory after the
  destructive-risk approval. It never touches the ambient Codex home.
- If local cleanup is partial, the connection remains recovery-required. A
  restart test proves neither removed metadata nor residual state can silently
  recreate/reuse the dedicated connection. Remote provider sessions are
  described as unknown unless provider logout proves revocation.
- Before this connector becomes visible, extend the corrupt-store Erase
  manifest/card to the resolved bounded root
  `app.getPath("userData")/provider-homes/codex`. When individual IDs cannot
  be parsed, the card names that whole Cairn-owned Codex root. It deletes/verifies
  all dedicated homes before cache/authority, never touches ambient CODEX_HOME,
  and leaves authority/recovery evidence intact if any home survives.
- The existing ambient Codex worker remains a separate explicitly linked,
  pinned, account-uninspectable connection.

Official state-location evidence:
https://learn.chatgpt.com/docs/config-file/config-advanced#config-and-state-locations

**Verify**

- From core: npm test
- From app: npm run test:unit
- From app: npm run typecheck
- From app: npm run build:vite
- From app on each supported target: npm run package
- With the app token: npx playwright test tests/model-connections.spec.ts
  tests/routing.spec.ts --workers=1
- Corrupt-store, multiple-dedicated-home, one-home-delete-failure, cancel, and
  restart tests prove no local Codex credential is orphaned or reused.
- One separately approved real metadata/login/call smoke only when required by
  the accepted spike. Record redacted provider/model/billing results and
  uncertainty; never record tokens.

**Stop if:** the locked binary cannot preserve the exact account/runtime/model
binding, dedicated state cannot be removed in normal and corrupt-store recovery
without touching ambient state, or any capability exceeds the Task 9 pass
record. Keep that capability gated.

### Task 11A — GitHub Copilot SDK go/no-go spike

**Why now:** one official Copilot subscription connection can expose a broad,
current multi-provider catalog without maintaining static rows. It is the best
candidate after existing runtimes, but it adds a dependency and OAuth app
custody.

**Spike create**

- app/src/main/connections/spikes/copilot-sdk.ts
- app/tests/fixtures/fake-copilot-sdk.mjs
- app/tests-unit/copilot-sdk-spike.test.ts

**Go/no-go proof**

- Explicit third-party GitHub OAuth only; disable CLI, gh, environment, and
  other ambient credential fallback.
- Disable and reject BYOK/custom-provider configuration. Any such route bypasses
  Copilot subscription billing and belongs to a separate API connection:
  https://docs.github.com/en/copilot/how-tos/copilot-sdk/auth/byok
- Token refresh/storage stays main-only and recoverable.
- listModels normalization retains capabilities, policy, billing, lifecycle,
  and a defensible default.
- Conductor configuration denies every tool and inherited instruction/session.
- Worker configuration proves a separately bounded TaskAdapter: workspace
  scope, tools, approval mapping, cancellation, watchdog, output/claims, and
  exact model.
- Published SDK/package metadata, license, update cadence, native-component
  claims, and unsupported-platform behavior are acceptable. If that evidence
  passes, an owner-approved exact-version install occurs only in a newly named
  disposable temp probe, never in app/package.json during 11A; the task records
  the resolved temp path and includes its cleanup in the approval. The probe
  must import and package under Cairn's Electron/Node targets before 11B may
  install the dependency in the repo.

Official evidence:

- https://docs.github.com/en/copilot/how-tos/copilot-sdk/setup/github-oauth
- https://docs.github.com/en/copilot/how-tos/copilot-sdk/troubleshooting/compatibility
- https://docs.github.com/en/copilot/how-tos/copilot-sdk/auth/authenticate
- https://docs.github.com/en/copilot/reference/ai-models/supported-models

**Risk pauses**

- Ask before dependency install/update.
- Ask separately before registering/using a GitHub OAuth application.
- Ask separately before sign-in or real metadata/model calls.

The spike may finish DONE with no-go and no visible connector.

**Verify**

- From app: npm run test:unit
- From app: npm run typecheck
- Run the focused compiled fake Copilot spike test with ambient GitHub, gh,
  Copilot CLI, environment, BYOK, and custom-provider discovery disabled.
- If separately approved, run the recorded exact-version temp import/package
  probe; no app package or lockfile changes in 11A.

**Stop if:** explicit OAuth, credential isolation, tool denial, billing
classification, or the temp package probe fails. Record no-go and leave the
connector absent.

### Task 11B — Ship only passed GitHub Copilot capabilities

This is a separate conditional repo task.

**Create**

- app/src/main/connections/drivers/copilot.ts
- app/src/main/connections/oauth/copilot.ts
- app/src/main/conductor/transports/copilot.ts only for passed conductor
- app/src/main/workers/copilot.ts only for separately passed worker
- app/tests-unit/copilot-connection.test.ts
- app/tests-unit/copilot-oauth.test.ts

**Modify**

- app/package.json
- app/package-lock.json
- app/src/shared/model-connections.ts
- app/src/shared/ipc.ts
- app/src/preload.ts
- app/src/main/ipc.ts
- app/src/main/connections/schema.ts
- app/src/main/connections/store.ts
- app/src/main/connections/secrets.ts
- app/src/main/connections/registry.ts
- app/src/main/conductor/service.ts only for passed conductor
- app/src/main/workers/resolver.ts only for passed worker
- app/src/renderer/components/ConnectionHub.tsx
- app/tests/fixtures/fake-copilot-sdk.mjs
- app/tests/model-connections.spec.ts

**Required pins**

- Pause before installing the exact SDK version even if 11A recommended it;
  approval for the spike is not blanket dependency approval.
- Explicit OAuth callback/state/PKCE, cancel, timeout, refresh, restart,
  reconnect, revoke, and Forget are main-owned and secret-free over IPC.
- useLoggedInUser is false; environment, CLI, gh, BYOK, and custom-provider
  fallbacks are rejected.
- Every Auto-eligible model is verified as Copilot-subscription billing for
  this connection; other billing routes do not enter this catalog.
- Dependency/package/license evidence from 11A still matches the locked version.

Ship conductor and worker capabilities independently. A failed worker
containment result does not block a proven tool-free conductor route.

**Verify**

- From app: npm run test:unit
- From app: npm run typecheck
- From app: npm run build:vite
- Package every supported desktop target with the locked SDK.
- With the app token: npx playwright test tests/model-connections.spec.ts
  --workers=1

All automated provider behavior uses the fake SDK. Any real OAuth, metadata, or
model smoke is separately approved and recorded with minimal data.

**Stop if:** the locked dependency differs from the approved probe, packaging
fails, ambient/BYOK fallback becomes possible, or the chosen capability did not
pass 11A. Do not register the connector.

### Task 12A — Google Antigravity subscription-runtime spike

Gemini CLI consumer subscription routing is obsolete. Google's current
subscription candidate is Antigravity CLI/SDK, which carries a powerful agent
harness and therefore starts as a gated Builder runtime, not a raw conductor.

**Spike create**

- app/src/main/connections/spikes/antigravity.ts
- app/tests/fixtures/fake-antigravity.mjs
- app/tests-unit/antigravity-spike.test.ts

**Prove**

- provider-owned keyring/browser sign-in without Cairn inspecting tokens;
- account/plan-safe model discovery and exact model selection;
- deny-by-default workspace/tool policy, no inherited plugins/skills/MCP,
  bounded project directory, cancellation, lifecycle hooks, claims, and
  packaging;
- exact runtime/account/model revision between preview and start; and
- honest quota/billing state.

Official evidence:

- https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/
- https://antigravity.google/docs/sdk/overview
- https://antigravity.google/docs/cli/install
- https://antigravity.google/docs/models

**Risk pauses:** dependency/install, provider sign-in, metadata, and any model
call each need their exact approval.

The spike may finish DONE with no-go. Conductor remains deferred; built-in agent
tools make that a different trust claim.

**Verify**

- From app: npm run test:unit
- From app: npm run typecheck
- Run the focused compiled fake Antigravity spike test with provider homes,
  plugins, skills, MCP, network, and executable discovery disabled.
- Only after the exact install/sign-in approvals, run the minimum isolated real
  metadata/containment smoke the task card names; no project content is sent.

**Stop if:** exact model/account/runtime binding, tool denial, bounded workspace,
credential custody, cancellation, or packaging cannot be proven. Record no-go
and keep Antigravity gated.

### Task 12B — Ship the Antigravity Builder only after a pass

This is a separate conditional repo task.

**Create**

- app/src/main/connections/drivers/antigravity.ts
- app/src/main/workers/antigravity.ts
- app/tests-unit/antigravity-connection.test.ts

**Modify**

- app/src/shared/model-connections.ts
- app/src/shared/ipc.ts
- app/src/preload.ts
- app/src/main/ipc.ts
- app/src/main/connections/store.ts
- app/src/main/connections/registry.ts
- app/src/main/workers/resolver.ts
- app/src/main/adapters.ts
- app/src/main/tasks.ts
- app/src/renderer/components/ConnectionHub.tsx
- app/src/renderer/components/DisclosureConfirm.tsx
- app/tests/fixtures/fake-antigravity.mjs
- app/tests/model-connections.spec.ts
- app/tests/routing.spec.ts

Pins repeat explicit auth, no ambient plugins/skills/MCP, bounded workspace,
exact model/runtime revision, cancellation, claims, billing, preview/run
revalidation, and packaged behavior. This slice integrates the separately
installed provider CLI and adds no Cairn dependency. If 12A concludes an SDK
dependency is required, stop and write a revised exact dependency/packaging
slice before installing it. No conductor capability enters this task.

**Verify**

- From core: npm test
- From app: npm run test:unit
- From app: npm run typecheck
- From app: npm run build:vite
- Package every supported desktop target without provider contact.
- With the app token: npx playwright test tests/model-connections.spec.ts
  tests/routing.spec.ts --workers=1

All automated behavior uses the fake runtime. Any provider install, sign-in,
metadata, or model smoke keeps its separate exact approval.

**Stop if:** the installed CLI differs from the passed runtime, containment or
preview/run identity fails, an SDK dependency is actually required, or a real
provider call is needed without approval. Leave the connector gated.

### Task 13A — Preserve the Kimi Code API conductor as its own connection

**Visible outcome:** Existing api.kimi.com/coding/v1 owners retain one pinned
kimi-for-coding Cairn route. It keeps honest legacy-unknown billing until the
owner explicitly accepts the Kimi Code membership-quota disclosure; that
renewal then creates new route authority. It never borrows or claims the Kimi
CLI OAuth account.

**Create**

- app/src/main/connections/drivers/kimi-code-api.ts
- app/tests-unit/kimi-code-connection.test.ts

**Modify**

- app/src/shared/model-connections.ts
- app/src/main/connections/schema.ts
- app/src/main/connections/store.ts
- app/src/main/connections/migrate.ts
- app/src/main/connections/registry.ts
- app/src/main/conductor/service.ts
- app/src/main/conductor/consent.ts
- app/src/renderer/components/ConnectionHub.tsx
- app/tests/fixtures/fake-model-provider.mjs
- app/tests/conductor.spec.ts

**Pins**

- Add an explicit idempotent new-store v1-to-v2 migration. It reclassifies only
  the exact normalized https://api.kimi.com/coding/v1 plus kimi-for-coding
  legacy-compatible route as **pending Kimi Code API**, preserving connectionId,
  one credential reference, old compatibility driver, billing-unknown bridge,
  assignment, and revisions. It runs for owners who launched any earlier slice
  as well as fresh legacy-file migration; near-matches stay compatible.
- The v2 write is atomic/readback-verified, interruption leaves the last valid
  shape usable, and rerun never duplicates the connection or credential.
- Migration alone changes no active driver, billing claim, grant, binding, or
  call authority. The old exact compatibility route may continue with unknown
  billing. Promotion requires an explicit standing-grant card naming the Kimi
  driver and membership-quota/unknown-cost truth, then atomically creates new
  ConductorGrant, billingRevision, capabilityRevision, assignmentRevision, and
  conversation binding before the new driver can send project data.
- Legacy baseUrl/model/key therefore become a Kimi Code API credential
  connection only after that renewal, never a provider-managed CLI link.
- Fixed kimi-for-coding is pinned and Auto remains unavailable until an
  authenticated API catalog/default is proven.
- After renewal, billing says membership quota Cairn cannot see; before renewal
  it remains legacy unknown. The Code Console credential stays main-only.
- Detecting/signing out of Kimi CLI cannot create, replace, revoke, or identify
  this conductor connection.

**Verify**

- From app: npm run test:unit
- From app: npm run typecheck
- From app: npm run build:vite
- From app on each supported target: npm run package
- With the app token: npx playwright test tests/conductor.spec.ts
  tests/model-connections.spec.ts --workers=1

All calls use the fake model provider. Any real Kimi credential/metadata/call
is a separate exact approval.

**Stop if:** v1 owners cannot upgrade losslessly and idempotently, migration
changes driver/billing/grant authority before renewal, a near-match is
reclassified, Kimi CLI identity leaks across the boundary, or the pinned route
changes. Keep the compatible legacy route and record the no-go.

### Task 13B — Modernize the existing Kimi CLI worker connection

**Visible outcome:** The existing Kimi CLI Builder can expose model choice only
when its current official runtime returns trustworthy account-scoped model IDs.
Otherwise it remains one honest fixed model.

**Create**

- app/src/main/connections/drivers/kimi.ts
- app/tests-unit/kimi-connection.test.ts

**Modify**

- app/src/main/connections/registry.ts
- app/src/main/workers/resolver.ts
- app/src/main/adapters.ts
- core/src/kimi.ts
- app/tests/fixtures/fake-kimi-env.ts
- core/test/kimi.test.ts
- app/tests-unit/kimi-wiring.test.ts
- app/tests/connect-kimi.spec.ts

**Pins**

- Never read Kimi token/config stores.
- The owner must explicitly choose **Use this Kimi CLI sign-in**; detection
  alone remains an unsaved candidate.
- This provider-managed Builder connection has a different connectionId from
  any Kimi Code API conductor, even if the owner believes the accounts match.
- Detect auth-required, logout, billing source, model discovery, runtime
  revision, cancel, and removal through output-safe official surfaces.
- If usable model IDs are not available, advertise only today's fixed supported
  model and disable Auto rather than inventing a catalog.
- Same exact model passes through disclosure and -m.

Official evidence to recheck immediately before implementation:

- https://moonshotai.github.io/kimi-cli/en/reference/kimi-acp.html
- https://moonshotai.github.io/kimi-code/en/configuration/providers.html

**Verify**

- From core: npm test
- From app: npm run test:unit
- From app: npm run typecheck
- From app: npm run build:vite
- Package every supported desktop target without provider contact.
- With the app token: npx playwright test tests/connect-kimi.spec.ts
  tests/routing.spec.ts --workers=1

Automated checks use the fake executable and sanitized provider homes. Any real
runtime metadata or dispatch requires its own exact approval.

**Stop if:** the official runtime cannot expose a trustworthy catalog, account
binding, or billing state. Preserve the explicitly linked fixed pinned route;
do not invent Auto or borrow Kimi Code API identity.

### Task 14 — Add native OpenAI API connection

**Create**

- app/src/main/connections/drivers/openai.ts
- app/src/main/conductor/transports/openai-responses.ts
- app/tests-unit/openai-connection.test.ts
- app/tests-unit/openai-responses.test.ts

**Modify**

- app/src/main/connections/registry.ts
- app/src/main/conductor/service.ts
- app/src/renderer/components/ConnectionHub.tsx
- app/tests/model-connections.spec.ts
- app/tests/fixtures/fake-model-provider.mjs

**Pins**

- API key lives in safeStorage; ChatGPT subscription is not implied.
- Models API results are normalized for this connection and remain
  conductor-only.
- Responses streaming, request ID, usage, cancel, 401/429/5xx, and redaction
  match the transport contract.
- The shared two-origin redirect fixture proves no 3xx target receives API
  credentials or project/conversation body.
- Auto requires a reviewed versioned OpenAI recommendation or a verified exact
  provider default; otherwise exact choice.
- Provider/model upgrade policy is rechecked through the OpenAI model resolver
  and current official docs in this task.

Official evidence:

- https://developers.openai.com/api/reference/resources/models/methods/list
- https://developers.openai.com/api/reference/resources/responses/methods/create

**Verify**

- From app: npm run test:unit
- From app: npm run typecheck
- From app: npm run build:vite
- Package every supported desktop target without provider contact.
- With the app token: npx playwright test tests/model-connections.spec.ts
  --workers=1

The fake server proves catalog/stream/cancel/auth/quota/error/redaction and that
the route is conductor-only. Any real API metadata/call needs exact separate
credential, data, model, cost/quota, and project approval.

**Stop if:** native Responses semantics, authenticated catalog filtering,
credential custody, billing, or conductor-only capability cannot be represented
without compatibility guesses. Do not register the connector.

### Task 15 — Add native Anthropic API connection; block consumer login

**Create**

- app/src/main/connections/drivers/anthropic.ts
- app/src/main/conductor/transports/anthropic-messages.ts
- app/tests-unit/anthropic-connection.test.ts
- app/tests-unit/anthropic-messages.test.ts

**Modify**

- app/src/main/connections/registry.ts
- app/src/main/conductor/service.ts
- app/src/renderer/components/ConnectionHub.tsx
- app/tests/model-connections.spec.ts
- app/tests/fixtures/fake-model-provider.mjs

**Pins**

- Models and Messages APIs are native, not forced through compatible semantics.
- The shared two-origin redirect fixture proves no 3xx target receives API
  credentials or project/conversation body.
- API catalog is conductor-only.
- Auto requires its own reviewed exact-ID/price-band policy or a verified exact
  provider default; otherwise exact choice.
- Claude.ai Free/Pro/Max login does not appear.
- Current Anthropic legal guidance is rechecked on implementation day. Its
  explicit third-party login prohibition wins over ambiguous subscription
  usage descriptions. A subscription connector remains blocked unless
  Anthropic exposes a supported third-party authorization path for Cairn or
  gives applicable written approval.

Official evidence:

- https://platform.claude.com/docs/en/api/models/list
- https://platform.claude.com/docs/en/api/messages
- https://code.claude.com/docs/en/legal-and-compliance
- https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan

**Verify**

- From app: npm run test:unit
- From app: npm run typecheck
- From app: npm run build:vite
- Package every supported desktop target without provider contact.
- With the app token: npx playwright test tests/model-connections.spec.ts
  --workers=1

The fake server proves native catalog/message streaming, cancellation,
auth/quota/errors/redaction, and that consumer login is absent. Any real API
metadata/call uses its own exact approval.

**Stop if:** current policy does not support Cairn's API use, consumer login
would be required, native semantics are lost, or API billing/account truth
cannot be stated. Leave consumer subscription absent and do not register an
unsafe connector.

### Task 16 — Add native Gemini Developer API connection

**Visible outcome:** An owner can connect a Gemini Developer API key for Cairn
and see its authenticated native model catalog. This task does not promise
Google AI Pro/Ultra subscription access, OAuth, Vertex, or a Builder runtime.

**Create**

- app/src/main/connections/drivers/gemini.ts
- app/src/main/conductor/transports/gemini.ts
- app/tests-unit/gemini-connection.test.ts
- app/tests-unit/gemini-transport.test.ts

**Modify**

- app/src/main/connections/registry.ts
- app/src/main/conductor/service.ts
- app/src/renderer/components/ConnectionHub.tsx
- app/tests/model-connections.spec.ts
- app/tests/fixtures/fake-model-provider.mjs

**Pins**

- Version 1 accepts a Gemini Developer API key only. OAuth requires a separate
  future design/task with callback, refresh-token, revoke, IPC, and custody
  proof; it is absent here.
- Gemini Developer API authorization does not imply Google AI Pro/Ultra
  subscription billing.
- models.list and generateContent normalization are native and
  conductor-only.
- The shared two-origin redirect fixture proves no 3xx target receives API
  credentials or project/conversation body.
- Auto requires its own reviewed exact-ID/price-band policy or a verified exact
  provider default; otherwise exact choice.
- Consumer Gemini CLI OAuth does not appear as a connection route.
- Antigravity remains its separately gated worker runtime.
- Vertex is not included. Its project/region identity, cloud authorization,
  endpoint/model namespace, policy, and billing require a separately sourced
  future design and task.

Official evidence:

- https://ai.google.dev/api/models
- https://ai.google.dev/api/generate-content

**Verify**

- From app: npm run test:unit
- From app: npm run typecheck
- From app: npm run build:vite
- Package every supported desktop target without provider contact.
- With the app token: npx playwright test tests/model-connections.spec.ts
  --workers=1

The fake server proves native list/generate streaming, cancellation,
auth/quota/errors/redaction, key-only UI, and absence of OAuth/consumer/
Vertex/Builder claims. Any real API metadata/call uses its own exact approval.

**Stop if:** native model/call semantics, key custody, Developer API billing,
or conductor-only capability cannot be represented without implying consumer
subscription or Vertex access. Do not register the connector.

### Task 17 — Read-only release verification and owner walkthrough

**Visible outcome:** The complete connection-first flow is understandable,
accessible, recoverable, packaged, and honestly recorded.

This task is verification-only: it changes no product/source path. Any finding
creates a new bounded repair brief with exact paths and checks, then this review
is rerun from landed main. Its own writes are only its normal brief, report, and
LOG row; docs/ai-work/PROJECT.md changes only in a separate owner-confirmed
milestone task.

**Required adversarial matrix**

- two accounts at one provider;
- two projects that both have conversation 001, plus project move/replacement;
- both ambient workers detected with no explicit owner link;
- cancel between metadata grant and standing Cairn grant;
- duplicate model IDs across accounts/providers;
- reauth while a Cairn stream is active;
- reconnect after renderer crash;
- revoke/forget during catalog refresh;
- stale cache at soft and hard TTL;
- removed Auto and pinned models;
- changed billing/policy/default;
- provider-side alias that hides the exact model;
- malicious catalog text and oversized payload;
- malformed/unknown store version and interrupted migration;
- corrupt authority store with legacy and dedicated provider-home credentials;
- migration then Forget then restart/old-reader rollback;
- overlapping OAuth/reconnect/assignment/Forget mutations;
- call-attempt persistence failure and crash before completion;
- OpenRouter serving-provider fallback and BYOK/shared-capacity change;
- external runtime account changes between preview and spawn;
- runtime upgrade/downgrade and executable replacement;
- result-commentary failure after worker DONE;
- renderer replay/tamper;
- old turn/card/report/run-session compatibility;
- narrow screen, keyboard-only operation, screen-reader names, contrast, and
  reduced motion.

**Decisive verification**

- From core: npm test
- From app: npm run test:unit
- From app: npm run typecheck
- From app: npm run build:vite
- From app: npm run build:lab
- With the app token: npx playwright test --workers=1
- Package for every supported desktop target without contacting a provider.
- Inspect normal and every failure/recovery state at wide and narrow sizes.
- Owner walkthrough: connect one approved fake or explicitly authorized real
  route, confirm the role cards and Advanced list make sense, preview one fake
  Builder dispatch, and confirm the exact disclosure is understandable.

Real smoke checks are optional per connector unless their task established they
are required for truth. Each remains separately approved, minimal-data, and
non-secret in records.

**Stop if:** any adversarial case, package target, accessibility check, or owner
walkthrough fails. Record Task 17 as STOPPED, claim a new bounded repair task,
land that repair, and rerun Task 17 from settled main; do not repair source in
this read-only task.

## Provider support ledger at plan close

| Route | Earliest shipping task | Default capability | Gate |
|---|---:|---|---|
| OpenRouter API/OAuth | 6B | Cairn | two grants, account catalog, gateway/BYOK policy, current OAuth |
| Generic/local compatible | 6C | Cairn | honest manual fallback and no cross-origin credential redirect |
| Explicitly linked ambient Codex worker | 8 | pinned Builder | account unavailable, billing unknown |
| Separate Cairn Codex connection | 10 | passed capability only | dedicated-home account/model/tool proof |
| Kimi Code API credential | 13A | pinned Cairn | membership-quota key route, separate from CLI |
| Explicitly linked Kimi CLI | 8 then 13B | pinned/dynamic Builder | official discovery or fixed only |
| GitHub Copilot subscription | 11B | capability-by-capability | 11A pass, explicit OAuth, no BYOK, containment, packaging |
| Google Antigravity subscription | 12B | Builder candidate | 12A pass, install/auth/tools/model/account proof |
| OpenAI API | 14 | Cairn | native transport/catalog |
| Anthropic API | 15 | Cairn | native transport/catalog |
| Claude consumer subscription | none | unsupported today | explicit legal/policy change or written approval |
| Gemini Developer API key | 16 | Cairn | native key-only transport/catalog; not OAuth, Vertex, or AI Pro/Ultra |
| Gemini CLI consumer subscription | none | obsolete | use gated Antigravity route |

## Supersession ledger

| Prior record and decision | Proposed disposition | Replacement |
|---|---|---|
| 2026-07-23 conductor v0: one OpenRouter body, one credential file, model chosen at connect, static picker/free-text switch | Would supersede model/connection structure; preserve consent, data scope, and main secret custody | Multiple connections, one Cairn assignment, authenticated catalog, conversation-sticky Auto |
| 2026-07-26 Phase 4 second-body design: monolithic ConductorBody, fixed Claude subscription detection/model | Would supersede future selection/provider route; preserve transport-neutral seam and provider-owned login principle | Separate connection driver, catalog, conductor transport, and worker runtime; Anthropic API only today |
| 2026-07-27 Phase 4 plan Tasks 1–10 | Would supersede as executable plan | This serial plan |
| 2026-07-28 Kimi design Decision 6: mandatory chooser whenever multiple workers are connected | Would supersede chooser UX only after owner approval; preserve exact per-dispatch disclosure and no silent cross-provider routing | One active Builder assignment, expiring one-task selection, exact preview/run revalidation |
| 2026-07-28 Kimi fixed-model/auth facts | Preserve shipped boundary; re-probe stale provider facts before any expansion | Separate Kimi Code API conductor and Kimi CLI OAuth worker connections |
| 2026-07-29 Level 3a Tasks 1–4 and universal TaskAdapter boundary | Preserve | Parameterized exact binding behind the same envelope |
| 2026-07-29 Level 3a unshipped Task 5 chooser | Would absorb after owner approval | Builder assignment slice |
| Tasks 124/126/127/137 static bodies, two-door start, renderer seat memory | Would supersede as authority; preserve short beginner flow and no renderer secret | Main-owned connections/assignments and connection-first role cards |
| Task 163 static provider IDs/prices | Would demote to optional presentation metadata | Authenticated provider catalog and honest billing route |

Historical records are not edited or deleted.

## Plan-level DONE and STOP rules

An implementation task is DONE only when its visible outcome holds, all
fake-only checks pass, the real diff/status are inspected, and its report names
every limitation. A provider spike may be DONE with a **no-go** result if it
truthfully answers its bounded question and leaves the connector gated.

Stop a task when:

- provider policy does not clearly support the route;
- account identity is neither provider-verified nor explicitly labeled
  unavailable for a deliberately limited pinned legacy runtime;
- access provider, model, billing source/certainty, or runtime attribution
  cannot be defended;
- a raw API would be treated as a worker;
- secrets could reach renderer, output, fixtures, logs, records, or chat;
- Auto would cross a connection or change without the required pause;
- migration could overwrite recoverable state;
- containment depends on inherited tools, config, credentials, or sessions;
- a concrete-risk action lacks the owner's exact approval; or
- repair would change the visible outcome or recovery is unclear.

The smallest safe response is to leave that capability unavailable, keep the
last proven connector working, and record the precise missing proof. Breadth is
valuable only when connection, model, billing, and worker authority remain
honest.
