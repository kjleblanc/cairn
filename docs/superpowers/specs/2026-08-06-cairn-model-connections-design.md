# Cairn model connections: connection-first design

**Date:** 2026-08-06

**Task:** 190

**Status:** Proposed implementation direction; planning artifact only

**Product authority:** This becomes the future authority for model connections
only after the owner approves the decision card below. Until then, current
shipped behavior and prior owner decisions remain authoritative. This document
does not change the running product or authorize a provider call.

## What the owner should experience

The normal setup is three short choices:

1. Pick a provider or an already-installed local agent and choose **Connect**.
2. Complete the provider's own sign-in, or enter an API credential in Cairn's
   dedicated secure field.
3. See **Cairn: Auto** when an approved recommendation exists and, when the
   connection has a trusted coding runtime and account catalog, **Builder:
   Auto**. A fixed-runtime connection says **Pinned** instead. Start talking.

The owner does not begin by comparing model identifiers. **Advanced model
choice** reveals the exact models that this connection currently reports as
available. Cairn remembers one connection for the conversation role and one
connection plus trusted runtime for the building role. A first successful
connection may fill empty compatible roles, but it never replaces an existing
assignment.

Before any paid or data-bearing call, the existing consent and risk pauses
still apply. The owner sees the exact access provider, an account-safe label
when the provider supplies one, otherwise the Cairn connection label plus
**account unavailable**, the resolved model, expected billing route, and data
scope. Auto is convenience, never hidden Cairn routing.

## Why the current shape must change

The current desktop has one conductor credential slot, one hard-coded curated
model list, an OpenAI-compatible chat-completions transport, and free-text
model editing. Core can route to more than one worker adapter, but the renderer
does not pass its existing adapter override and Core's priority sort can choose
silently. Codex and Kimi worker adapters also carry fixed model identifiers.

That made the first working slice small. It cannot honestly deliver the desired
experience:

- a model name is not proof that the current account can use it;
- API access to a chat model is not a coding-agent runtime;
- subscription access is provider-specific, not a generic OAuth trick;
- a static catalog becomes stale quickly; and
- one opaque conductor credential cannot represent multiple accounts,
  authentication methods, billing routes, or role assignments.

The proposed replacement is a connection registry with authenticated catalogs
and two explicit role assignments. It keeps the existing deterministic worker
envelope and adds no hidden Cairn fallback across connections or models. A
gateway's own serving-provider routing is separately disclosed and authorized.

## Plain-language terms

- **Connection:** one saved route to one provider account or one
  provider-managed local runtime. It has a stable Cairn identifier but no
  secret is exposed to the renderer.
- **Driver:** main-process code that knows how to authenticate, list models,
  and describe capabilities for one provider surface.
- **Cairn:** the conversation role, called conductor internally.
- **Builder:** the coding-work role, called worker internally.
- **Runtime:** the trusted agent program that implements Cairn's worker
  protocol. Codex Exec and the Kimi CLI are current examples.
- **Project authority ID:** a random main-owned identifier bound to the
  canonical selected-project root and its local filesystem identity. It is not
  a renderer path or the project-local conversation number. A moved, replaced,
  ambiguous, or unverifiable root pauses for project reauthorization.
- **Auto:** let a selected connection use Cairn's reviewed, versioned
  recommendation or a verified exact provider default. Auto never chooses a
  different connection, provider, account, billing route, role, or runtime.
- **Resolved route:** the exact connection, driver, access/billing provider,
  model author when known, model, billing route, credential/link revision,
  catalog revision, policy version, and runtime, if any, that a call will use.

## Product decisions

The owner must approve these three visible-behavior choices before an
implementation brief may execute:

1. after an explicit **Connect / Use this sign-in** action, the link/metadata
   grant, and the standing Cairn grant when Cairn would be filled, fill only
   empty compatible roles;
2. replace the old mandatory multi-worker chooser with one persistent Builder
   default plus an optional one-task override; and
3. make Auto sticky inside one connection under a reviewed quality/cost policy,
   pausing instead of silently changing when that resolution expires.

The plan recommends all three because they create the requested one-click
experience without cross-account routing. They are proposed owner decisions,
not decisions Task 190 silently makes. Until approval, Kimi Decision 6 and the
current connected-conductor contract remain in force.

### Decision 1 — Connect first; models are advanced

Settings opens on two large role cards:

- **Cairn** — who talks and reasons with the owner.
- **Builder** — who is allowed to work on the project.

Each card shows its selected connection, provider-verified account-safe label
when available (otherwise **account unavailable**), **Auto** or a pinned model,
status, and billing description. **Connect another provider** opens a provider
sheet. **Advanced model choice** opens a model sheet only after a connection is
ready.

Provider cards lead with recognizable access routes such as **Use OpenRouter
API**, **Use this existing Codex worker**, **Connect a separate Codex account
to Cairn**, or **Sign in with GitHub Copilot**. A provider route that is
unsupported is absent, not presented as a button that fails later.

### Decision 2 — Save many connections; activate exactly two assignments

Cairn may save multiple connections. There is exactly one active Cairn
assignment and exactly one active Builder assignment. Either role may be
unassigned.

After an explicit owner connection action and its role-applicable grants, a
successful connection may fill only empty roles it genuinely supports:

- conductor-only connection: fill Cairn if empty;
- worker-only connection: fill Builder if empty;
- connection with both proven capabilities: fill each empty role;
- no empty compatible role: save it without changing either assignment.

Detection alone produces an unsaved candidate. It never creates a connection,
fills a role, or uses current priority order. If Codex and Kimi are both
detected while Builder is empty, Builder stays empty until the owner explicitly
chooses **Use this sign-in** for one of them.

Disconnecting or revoking one connection affects only that connection. It
never selects another connection automatically.

Version 1 assignments are defaults for the local Cairn app profile, not hidden
per-project choices. A conversation pins its exact Cairn resolution, and a
Builder change affects later previews only. Existing project-specific data
selection, consent, and task records remain project-bound.

### Decision 3 — A connection is not a worker

A raw API connection can power Cairn when a conductor transport supports it.
It cannot power the Builder merely because its catalog contains a capable
model name.

Builder assignment binds:

1. one saved connection;
2. one trusted agent runtime that implements Cairn's TaskAdapter protocol; and
3. Auto or one exact model that the runtime and account both permit.

Only dispatch resolution materializes the exact TaskAdapter. Existing Codex
Exec and Kimi CLI behavior remains trusted by its current adapter boundary.
Any new worker runtime requires its own containment, tool-permission, request,
evidence, and cancellation proof.

**Change for this task** creates a short-lived main-owned OneTaskWorkerSelection
with its own connection, runtime, Auto/pinned policy, selection revision,
expiry, and one-preview use. It never edits the saved Builder assignment.

Preview creation atomically redeems that selection into an immutable
PendingWorkerRouteAuthority. Redemption prevents the selection ID from making
a second preview; it does not invalidate the preview it just authorized. A
change or expiry before redemption fails. After redemption, only preview
expiry/cancellation or a failed authority revalidation retires the preview.

Main resolves either the persistent assignment or that one-task selection
first, then constructs exactly one adapter. Stable adapter IDs continue to name
runtime kinds; a separate routeInstanceId and authenticated full route
distinguish accounts/models. This avoids duplicate Core adapter IDs and keeps
Core process invocation names stable.

### Decision 4 — Auto is deterministic and connection-scoped

Eligible models are the intersection of:

- the authenticated account catalog;
- the driver's conductor transport or trusted worker runtime compatibility;
- the selected role;
- provider lifecycle and policy information; and
- Cairn's explicit compatibility rules.

Auto then resolves in this order:

1. retain the assignment's last exact resolved model while it remains eligible;
2. otherwise use a versioned, reviewed Cairn driver recommendation that names
   exact eligible model IDs for this role and exposes its reason and cost band;
   or
3. use a provider-declared exact default, such as an authenticated isDefault
   flag, when the driver has verified its semantics.

If none exists, Auto is unavailable and the owner chooses an exact model.
Cairn never sorts arbitrary model names and calls the first one Auto.
Newly discovered models appear in Advanced immediately, but do not become Auto
until a later reviewed policy version names them. This lets catalogs stay
modern without silently changing Cairn's quality/cost choice.

An existing CLI runtime with only one hard-coded supported model is **Pinned**,
not Auto. It becomes Auto-capable only after its connection-specific catalog
and recommendation/default are proven.

For Cairn, Auto pins the exact resolution for conversational continuity. It
does not silently change mid-conversation. If the model or credential revision
becomes invalid, the conversation pauses and offers a one-click **Choose new
Auto** action with the new exact route.

That pin belongs to a conversation binding keyed by project conversation ID,
not to the profile-global assignment. Two conversations can therefore remain
on different exact models after a policy/catalog update and restart.

For the Builder, Auto resolves before the dispatch disclosure. The exact route
is frozen into the existing preview. Main re-detects the runtime and recomputes
the canonical route-authority fields immediately before work. It compares a
digest that excludes only the preview's audit identity and timestamps; any
authority difference returns TASK_ROUTE_CHANGED and no worker starts. A match
uses the preview's original routeInstanceId/resolvedAt and records a separate
revalidatedAt rather than pretending a second resolution is byte-identical.

### Decision 5 — Dynamic catalogs are authenticated evidence, not promises

Every driver returns a normalized ModelOption list from the current connection.
Catalog refresh is a metadata request and sends no project or conversation
content. The connect disclosure says that Cairn will request account and model
metadata. It does not claim that the metadata request is always free; the
driver records the provider's documented cost basis or **unknown**.

First connection has two distinct gates:

1. **Link and metadata authorization** names the access provider, credential or
   provider-managed link Cairn will use, exact account/model metadata requested,
   absence of project data, possible metadata cost or **unknown**, and how to
   remove the saved link. Only after this owner action may Cairn store the
   connection and fetch its catalog.
2. **Standing Cairn authorization** occurs after catalog normalization and
   exact pinned/Auto resolution. It names the connection, account-safe label or
   unavailable state, billing route, gateway-routing policy, exact model or
   bounded sticky Auto policy, and project data scope.

If the owner stops between gates, the connection remains saved as **Connected,
not authorized for Cairn**, no Cairn role is filled, and no project data or
inference request occurs. They may finish later or use the explicit Forget
action.

Credentialed metadata clients do not follow redirects automatically.
Provider-specific drivers allow only documented same-origin metadata redirects;
compatible/custom endpoints reject any metadata origin change before
forwarding an Authorization header. Every inference transport is stricter: it
uses manual redirect handling and rejects every 3xx response. It never
automatically replays an Authorization header or project/conversation body to
the Location target, including on 307/308. Later native transports inherit this
rule and prove it with two-origin fake servers.

A listed model can still fail at call time because quotas, organization policy,
regional availability, or provider state can change. Cairn describes it as
**available to choose on this connection**, not guaranteed capacity.

The cache key includes connectionId and a random, non-secret
authenticationRevision. Reconnecting or replacing a credential creates a new
revision, so one account's catalog cannot be shown for another. This revision
means **Cairn changed or renewed this link**; it does not prove an external
subscription account stayed unchanged.

Cached results include fetchedAt and catalogRevision. A stale cache may be
shown for orientation with a clear timestamp, but cannot authorize a newly
resolved paid or data-bearing call. A pinned model missing from a fresh catalog
becomes unavailable; no fallback occurs.

For a gateway such as OpenRouter, **no fallback** means Cairn never changes the
saved connection or requested model. The link grant separately discloses
whether OpenRouter may select/fall back among serving providers or BYOK/shared
capacity. The route freezes that gateway policy and billing-source rule.
Completed receipts capture is_byok, the actual serving provider, and router
attempt metadata when safely returned. Advanced owners may instead pin an
allowed serving provider and disable gateway fallback when the provider surface
supports it. Cairn never calls an unknown pre-call serving endpoint exact.

### Decision 6 — Main owns secrets, catalogs, resolution, and receipts

Credentials are captured only in a dedicated connection form, never chat. The
renderer may hold the entered characters only in the live input needed for the
one IPC submission; it clears them immediately and never puts them in
localStorage, application state stores, logs, analytics, test snapshots, URLs,
or records. The secret enters only the main process, is encrypted with
Electron safeStorage, and never returns over IPC.

Provider-managed runtimes keep their own credentials. Cairn stores only a
non-secret connection reference and status. Cairn uses provider-owned browser
or device authorization; it does not import, inspect, or relay consumer tokens.
An explicitly linked ambient CLI may expose no stable account identity. Cairn
then records accountLabelProvenance **unavailable**, says **current runtime
account — Cairn cannot verify which one**, keeps billing **unknown** where
needed, and never presents it as an account-bound Auto route. Owner labels are
display convenience, never verified identity.

A connection and permission to use it are separate. Each conductor connection
has main-owned ConductorGrants keyed by projectAuthorityId. Each grant binds
that project, connectionId, authenticationRevision, the authorized data-scope
version, expected billing kind, and either one exact pinned model or one bounded
Auto policy version.
Changing credential revision, data scope, billing kind, connection, or Auto
policy requires a new grant before project data flows. Selecting a different
already-saved connection never borrows another connection's grant. A project or
conversation with the same display name or local 001-999 conversation number
never borrows another project's grant or binding.

The renderer sends connection and assignment identifiers. Main independently
resolves the selected root to a ProjectAuthorityId from its profile-owned
registry, whose entry binds a random ID to canonical real path plus local
filesystem identity. A path move, replacement, collision, unavailable identity,
or registry mismatch requires explicit project reauthorization rather than
guessing. Main then parses exact records, reads the credential or
provider-managed runtime, refreshes the catalog when required, resolves the
exact route, and creates the transport or TaskAdapter. Renderer-supplied path,
project ID, provider, model, billing, capability, revision, or runtime facts are
never trusted.

All connection-store mutations run through one main-process queue and compare
the expected persisted storeRevision before atomic replacement/readback. OAuth
completion, reconnect, assignment change, one-task selection, and Forget
cannot overwrite one another from stale snapshots.

An initial legacy connection receives an explicit legacy-pinned authorization
bridge: one link grant with no catalog/metadata scope and one Cairn grant bound
only to the already-authorized exact endpoint, model, and data scope. The bridge
cannot authorize catalog refresh, Auto, a new model, a new billing route, or a
wider scope. It lets unchanged calls receive complete route custody during the
headless migration slices; the first visible connection-first flow replaces it
with explicit current grants before any changed route sends project data.

recovery-required blocks calls and ordinary mutation, but never removes the
owner's ability to revoke. A dedicated **Erase Cairn model connections**
recovery action names model-connections.json, model-catalogs.json, and any
legacy conductor.json credential reference, explains that provider accounts
remain signed in, and deletes those exact local files only after the owner's
destructive-risk approval. Each later connector that creates Cairn-owned
credential state must extend this recovery manifest/card before it becomes
visible. The recovery surface ships in the same task that can first enter
recovery-required. It deletes and verifies every known Cairn-owned credential
file/home first, cache second, and the new authority store last. If any
credential deletion fails, it does not delete the authority store. Partial
deletion therefore remains recovery-required without making restart eligible
to remigrate a surviving credential, and it reports the exact surviving path
without a secret. Ambient provider homes are never part of the manifest.

A provider-managed runtime may instead own its login. An ambient runtime stays
outside Cairn custody, so Forget removes only Cairn's reference and says it did
not log the provider out. A dedicated runtime home created for one Cairn
connection is different: Forget must use a provider-supported logout when
available, then name and remove the exact connection-scoped auth/config/log/
session directory after destructive-risk approval. It never touches an
ambient provider home, never claims remote revocation it cannot prove, verifies
that restart cannot reuse the local credential, and leaves partial removal in
recovery-required. Its connector also adds the bounded dedicated provider-home
root to corrupt-store recovery, because a malformed authority store may no
longer reveal individual connection IDs.

### Decision 7 — Every attempted call has exact route custody

Main appends two immutable authenticated custody events for each conductor
request, including a normal Cairn turn and the short post-result commentary
turn:

1. **attempt** is durably appended, flushed, read back, and authenticated before
   any provider I/O or project data release; and
2. **completion** is appended later with success, stopped, redacted failure, or
   cancellation. It never rewrites the attempt.

The attempt binds:

- callId and conversation/result-card identity;
- projectAuthorityId, independently resolved by main;
- connectionId, driverId, access provider, model author when known, exact
  model, and selection mode;
- expected billing route;
- assignment, link grant, applicable Cairn grant, authentication, billing,
  catalog, capability,
  gateway-routing, runtime, and executable revisions;
- routeInstanceId and runtimeId when a worker is involved;
- authorized data-scope digest; and
- startedAt.

The separate completion event binds completedAt plus success, stopped,
cancellation, or redacted failure. Neither event can rewrite the other.

If attempt persistence or authentication is uncertain, transport I/O does not
start. On restart, an attempt without completion is retained as
**indeterminate — no completion recorded**; it never disappears or becomes
success. The transcript/custody parser recognizes and orders these events
alongside owner, Cairn, and envelope events.

Successful completions bind the provider request identifier when one is safely
available, plus the actual serving provider when a gateway safely reports it.
Failed calls retain the exact attempted route and a normalized non-secret
error. Attribution is not lost merely because no reply arrived.

routeAuthorityDigest is a canonical digest of every authority and displayed
route field: connection, driver/provider/account identity, model, billing,
project authority, assignment or one-task selection revision, grants,
authentication, catalog, capability, gateway policy, runtime, executable,
selection mode, and policy.
The canonical input excludes the digest slot itself plus routeInstanceId,
resolvedAt, and later observation timestamps. Those audit fields are retained
but never compared as if a fresh resolution could reproduce them.

Worker previews and terminal task records bind the same resolved-route fields
through the existing descriptor/disclosure revalidation. Persisted task records
remain secret-free.

### Decision 8 — Billing language is honest

BillingKind is one of pay-as-you-go, subscription, local, or unknown. It
describes the expected route established by the driver. It does not claim what
the provider ultimately charged.

The UI uses phrases such as **Expected billing: GitHub Copilot subscription**
and **Provider reported: 42% premium requests remaining** only when the
provider supplies that fact. Otherwise it says **Billing could not be
verified**. The existing per-paid-call approval and quota/cost disclosure stay
in force.

## Durable types

These are design shapes, not a requirement to export one giant shared object.
Secrets never appear in them.

~~~ts
type CairnRole = "conductor" | "worker";
type AuthKind = "api-key" | "oauth" | "provider-managed" | "none";
type BillingKind = "pay-as-you-go" | "subscription" | "local" | "unknown";
type ProjectAuthorityId = string;

interface ConnectionSummary {
  id: string;
  driverId: string;
  accessProvider: string;
  displayName: string;
  accountSafeLabel: string | null;
  accountLabelProvenance: "provider-verified" | "owner-label" | "unavailable";
  authKind: AuthKind;
  billingKind: BillingKind;
  supportedRoles: readonly CairnRole[];
  status:
    | "checking"
    | "linked-not-authorized"
    | "ready"
    | "offline"
    | "reconnect-required"
    | "runtime-missing"
    | "policy-blocked"
    | "catalog-stale"
    | "model-removed"
    | "role-incompatible"
    | "unavailable"
    | "unsupported"
    | "recovery-required";
  authenticationRevision: string;
}

interface ModelOption {
  connectionId: string;
  modelId: string;
  displayName: string;
  supportedRoles: readonly CairnRole[];
  reasoningOptions: readonly string[];
  modalities: readonly string[];
  lifecycle: "stable" | "preview" | "deprecated" | "unknown";
  catalogSource: "authenticated" | "provider-managed" | "manual";
  availabilityEvidence:
    | "account-confirmed"
    | "provider-catalog"
    | "configured-manually";
  price: {
    inputPerMillion: string | null;
    outputPerMillion: string | null;
    currency: string | null;
  };
  driverRecommendationEligible: boolean;
  providerDefault: boolean;
  fetchedAt: string;
}

interface CatalogSnapshot {
  connectionId: string;
  authenticationRevision: string;
  catalogRevision: string;
  fetchedAt: string;
  freshness: "fresh" | "stale" | "display-only";
  models: readonly ModelOption[];
}

interface ProviderManagedRuntimeLink {
  runtimeId: string;
  runtimeKind: string;
  executableRevision: string;
  accountState: "provider-verified" | "account-uninspectable";
  runtimeRevision: string;
}

type ConductorAssignment =
  | {
      role: "conductor";
      mode: "auto";
      connectionId: string;
      policyVersion: string;
      assignmentRevision: string;
    }
  | {
      role: "conductor";
      mode: "pinned";
      connectionId: string;
      modelId: string;
      assignmentRevision: string;
    };

type WorkerAssignment =
  | {
      role: "worker";
      mode: "auto";
      connectionId: string;
      runtimeId: string;
      lastResolvedModelId?: string;
      policyVersion: string;
      assignmentRevision: string;
    }
  | {
      role: "worker";
      mode: "pinned";
      connectionId: string;
      runtimeId: string;
      modelId: string;
      assignmentRevision: string;
    };

interface ConversationRouteBinding {
  projectAuthorityId: ProjectAuthorityId;
  conversationId: string;
  resolvedRoute: ResolvedRoute;
  resolvedRouteDigest: string;
  boundAt: string;
}

interface OneTaskWorkerSelection {
  selectionId: string;
  selectionRevision: string;
  projectAuthorityId: ProjectAuthorityId;
  connectionId: string;
  runtimeId: string;
  model:
    | { mode: "auto"; policyVersion: string }
    | { mode: "pinned"; modelId: string };
  createdAt: string;
  expiresAt: string;
}

type RouteAuthoritySource =
  | { kind: "assignment"; assignmentRevision: string }
  | { kind: "one-task-selection"; selectionRevision: string };

interface LinkMetadataGrant {
  grantRevision: string;
  connectionId: string;
  authenticationRevision: string;
  authorizationBasis: "explicit" | "legacy-pinned-bridge";
  metadataScope: readonly string[];
  metadataCostCertainty: "documented-no-charge" | "may-charge" | "unknown";
  routingPolicyRevision: string;
  grantedAt: string;
}

interface ConductorGrant {
  grantRevision: string;
  projectAuthorityId: ProjectAuthorityId;
  connectionId: string;
  authenticationRevision: string;
  authorizationBasis: "explicit" | "legacy-pinned-bridge";
  authorizedDataScope: string;
  billingRevision: string;
  routingPolicyRevision: string;
  modelAuthorization:
    | { mode: "pinned"; modelId: string }
    | { mode: "auto"; policyVersion: string };
  grantedAt: string;
}

interface GatewayRoutingPolicy {
  mode: "not-a-gateway" | "gateway-managed" | "pinned-serving-provider";
  allowedServingProviders: readonly string[];
  allowServingProviderFallback: boolean;
  allowByok: boolean;
  allowSharedCapacityAfterByok: boolean;
  region: string | null;
}

interface ResolvedRoute {
  routeInstanceId: string;
  projectAuthorityId: ProjectAuthorityId;
  connectionId: string;
  driverId: string;
  accessProvider: string;
  accountSafeLabel: string | null;
  accountLabelProvenance:
    | "provider-verified"
    | "owner-label"
    | "unavailable";
  modelAuthor: string | null;
  modelId: string;
  billingRoute: {
    kind: BillingKind;
    source:
      | "provider-account"
      | "subscription-quota"
      | "byok"
      | "byok-with-provider-fallback"
      | "local"
      | "unknown";
    certainty: "verified" | "provider-reported" | "unknown";
    label: string;
  };
  billingRevision: string;
  authoritySource: RouteAuthoritySource;
  linkGrantRevision: string;
  conductorGrantRevision: string | null;
  authenticationRevision: string;
  catalogRevision: string | null;
  capabilityRevision: string;
  runtimeRevision: string | null;
  executableRevision: string | null;
  gatewayRouting: GatewayRoutingPolicy;
  routingPolicyRevision: string;
  selection: "auto" | "pinned";
  policyVersion: string | null;
  runtimeId: string | null;
  routeAuthorityDigest: string;
  resolvedAt: string;
}

interface PendingWorkerRouteAuthority {
  previewId: string;
  resolvedRoute: ResolvedRoute;
  disclosureDigest: string;
  expiresAt: string;
}
~~~

accessProvider is the service that authenticates and bills the connection,
such as OpenRouter. modelAuthor is the model creator when known. A call receipt
may add servingProvider after the response when a gateway safely reports the
actual inference endpoint. Cairn never calls the model author the billing
provider or pretends a gateway-selected endpoint was known before the call.

ConversationRouteBinding, not the profile-global assignment, owns sticky Cairn
continuity. Its authenticated, secret-free ResolvedRoute snapshot lets a
conversation retain its connection and exact model even if the profile default
later changes; every call still revalidates current grants, credentials,
catalog, and route policy before I/O. Two conversations can therefore retain
different exact routes across restart. A one-task worker selection is
main-owned and memory-only. Preview creation atomically redeems its ID once
into PendingWorkerRouteAuthority. Both the selection and a selection-backed
pending preview are memory-only: restart removes them; otherwise the redeemed
preview carries its own immutable authority until preview expiry. It never
mutates the saved Builder assignment.

Main materializes exactly one adapter for the selected resolved worker route.
The existing stable adapter ID continues to identify the runtime kind, such as
Codex Exec; routeInstanceId and the authenticated full route distinguish
accounts and models. Core never receives two same-ID candidates, and process
invocation names do not need to encode a connection or account.

Detection returns an unsaved runtime candidate. An explicit owner click creates
a stable random connectionId and stores a ProviderManagedRuntimeLink whose
executableRevision is a non-secret canonical fingerprint of the exact
executable/version that will run. Re-detection reconciles only that stored
runtime kind and fingerprint. When the runtime exposes no safe account/session
fingerprint, accountState stays account-uninspectable; the route is pinned,
billing is unknown where necessary, and external login changes are disclosed
as an unobservable limitation rather than a false revision guarantee.

The absolute executable path, argument prefix, and sanitized environment are a
main-only ExecutableLaunchBinding, not renderer/shared data. Detection and
dispatch-time revalidation fingerprint that exact target. The adapter captures
and spawns the same absolute path without a second PATH lookup, with an
immediate pre-spawn fingerprint check. PATH reordering or replacement fails
closed; the design does not claim protection from an operating-system attacker
who can replace an executable in the final system-call race.

The initial persisted store is model-connections.json beside the legacy
conductor.json. Its first strict shape uses the discriminant
cairn-model-connections/v1, exact-record parsing, atomic replacement, and an
OS-encrypted credential reference. Later shape changes require explicit,
idempotent, version-to-version migrations; they never mutate an old shape as if
it had always meant the new thing. The separate normalized cache is
model-catalogs.json. Runtime status and capabilities are derived again rather
than trusted from disk.
The root carries storeRevision; main serializes all mutations and rejects a
stale expected revision before writing.

catalogRevision is null only for a legacy or manual exact model with no
provider catalog. Null never means fresh or account-confirmed.

## Four separate implementation seams

### Connection and catalog driver

Owns provider identity, supported authorization routes, account-safe labels,
catalog refresh, billing description, catalog normalization, and lifecycle
rules. It cannot read project content.

### Conductor transport

Converts Cairn's provider-neutral turn into one provider request and normalizes
stream events, request identifiers, usage, finish state, and redacted errors.
OpenAI Responses, Anthropic Messages, Gemini generateContent, and compatible
chat completions are separate transports rather than pretending every provider
is OpenAI-compatible.

### Worker runtime factory

Takes a main-resolved WorkerAssignment and fresh runtime detection, then
materializes one exact TaskAdapter. It owns agent containment and Cairn's worker
protocol. A connection driver cannot manufacture a worker adapter by itself.

### Assignment and route resolver

Intersects the catalog and role/runtime capabilities, applies deterministic
Auto, emits the exact ResolvedRoute, and supplies an immutable descriptor to
the existing preview/run revalidation.

## Provider capability matrix

The matrix is deliberately conservative. **Gated** means a later spike must
prove the boundary before the route appears in production.

| Connection route | Auth/catalog surface | Cairn | Builder | Billing | Product treatment |
|---|---|---:|---:|---|---|
| OpenRouter API key or supported OAuth | Authenticated Models API | Yes, compatible transport | No raw API worker | Pay-as-you-go/credits | First vertical slice; dynamic account catalog |
| OpenAI API key | Models API + Responses API | Yes | No raw API worker | Pay-as-you-go | Native driver after transport seam |
| Anthropic API key | Models API + Messages API | Yes | No raw API worker | Pay-as-you-go | Native API only |
| Google Gemini Developer API key | Models API + generateContent | Yes | No raw API worker | Pay-as-you-go/unknown | Native API-key slice only; OAuth and Vertex require separate future connectors |
| Generic OpenAI-compatible or local endpoint | Optional models endpoint or explicit manual model | Yes when compatible | No raw API worker | Local/unknown | Advanced connection; no invented catalog |
| Explicitly linked existing Codex worker | Ambient CLI detection; no proven account catalog | No | Yes, pinned current Codex Exec | Unknown | Preserve current worker after owner click; account unavailable; never Auto |
| Separate Cairn Codex connection | Provider-owned sign-in in dedicated isolated CODEX_HOME + app-server model/list | Gated | Gated | Subscription/API/unknown | Ship only capabilities whose isolation/account/billing spike passes |
| GitHub Copilot subscription | Official OAuth + Copilot SDK model discovery | Gated, then conductor first | Gated separately | Subscription | First broad subscription candidate after dependency/containment spike |
| Kimi Code Console API credential | api.kimi.com/coding/v1 + fixed kimi-for-coding | Yes, pinned | No raw API worker | Membership quota | Existing conductor route; independent of CLI OAuth |
| Explicitly linked Kimi CLI OAuth worker | Provider-managed CLI/ACP detection | Gated | Yes, pinned until catalog proof | Subscription/unknown | Existing Builder route after owner click; never borrow it for Cairn |
| Claude.ai Free/Pro/Max sign-in | Current legal guidance forbids third-party login/routing | No | No | Subscription | Absent today; offer Anthropic API and recheck policy before implementation |
| Google Antigravity subscription | Provider-owned CLI/SDK and plan model list | Deferred | Gated trusted runtime | Subscription | Candidate after install/auth/tool/model containment spike |
| Gemini CLI consumer subscription | Consumer service moved to Antigravity | No | No | Subscription | Obsolete route; offer Gemini Developer API or gated Antigravity instead |

### Official evidence and gates

- OpenAI's Models API lists models available through the authenticated API, and
  the Responses API is the native conversation surface:
  https://developers.openai.com/api/reference/resources/models/methods/list and
  https://developers.openai.com/api/reference/resources/responses/methods/create
- Codex app-server exposes account login and model/list for deep integrations,
  but its production transport and containment must be proven before Cairn
  entrusts it with conductor traffic:
  https://learn.chatgpt.com/docs/app-server
- GitHub documents third-party OAuth for the Copilot SDK and model discovery,
  capabilities, policy, and billing metadata. Cairn still needs dependency,
  packaging, tool-denial, and runtime-containment proof:
  https://docs.github.com/en/copilot/how-tos/copilot-sdk/setup/github-oauth and
  https://docs.github.com/en/copilot/how-tos/copilot-sdk/troubleshooting/compatibility
- Anthropic directs third-party products to its API and prohibits routing
  Claude.ai consumer credentials:
  https://code.claude.com/docs/en/legal-and-compliance
- Anthropic also describes subscription usage by the Agent SDK and third-party
  apps in a current help article. That broader description does not provide a
  Cairn authorization flow and conflicts with the explicit product-builder
  restriction above, so Cairn fails closed unless Anthropic exposes a supported
  third-party route or gives applicable written approval:
  https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan
- Anthropic's native surfaces are its Models and Messages APIs:
  https://platform.claude.com/docs/en/api/models/list and
  https://platform.claude.com/docs/en/api/messages
- Google's Gemini API provides Models and generateContent:
  https://ai.google.dev/api/models and
  https://ai.google.dev/api/generate-content
- Google moved individual/free Gemini CLI service to Antigravity CLI in June
  2026. Antigravity exposes a provider-owned authenticated CLI/SDK and a
  plan-specific model list, but its built-in agent tools require a dedicated
  Builder containment spike:
  https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/,
  https://antigravity.google/docs/sdk/overview,
  https://antigravity.google/docs/cli/install, and
  https://antigravity.google/docs/models
- OpenRouter exposes a Models API whose metadata includes modalities,
  parameters, pricing, and lifecycle information. Its authenticated user route
  also filters by that user's provider preferences, privacy settings, and
  guardrails:
  https://openrouter.ai/docs/api/api-reference/models/list-models-user
- OpenRouter may route among serving providers and BYOK/shared capacity inside
  one access-provider connection. Cairn must disclose and freeze that policy,
  then capture safe router metadata rather than claiming the serving provider
  was known before the call:
  https://openrouter.ai/docs/guides/routing/provider-selection,
  https://openrouter.ai/docs/guides/features/router-metadata, and
  https://openrouter.ai/docs/guides/overview/auth/byok

Provider documentation is checked again in the implementation task that ships
each connector. Policy can change; a plan citation is not permanent
authorization.

## Safe migration from the current conductor slot

Migration runs only when the new store does not exist.

1. Read conductor.json with a strict legacy parser.
2. If it is malformed or has an unknown shape, set recovery-required and block
   calls and ordinary mutation. Keep the explicit exact-file erase recovery
   action available. The current behavior of treating malformed data as merely
   disconnected is not safe enough.
3. If valid, create one metadata connection and pinned Cairn assignment with a
   fresh authenticationRevision. Preserve baseUrl, exact model, and
   authorizedDataScope.
4. Label auth origin **legacy / unknown**. The current stored form cannot
   distinguish a pasted key from the result of OpenRouter OAuth, so migration
   must not invent that fact.
5. Keep exactly one decryptable secret copy. The new connection stores a
   main-only legacy-file credential reference plus a digest of the expected
   ciphertext; it does not copy keyB64. Calls verify the digest before
   decryption. A changed legacy file pauses as reconnect/recovery-required.
6. Create the narrowly bounded legacy-pinned authorization bridge described
   above. Its link metadata scope is empty, and its Cairn grant preserves only
   the exact legacy endpoint, model, billing-unknown state,
   authorizedDataScope, and main-resolved current ProjectAuthorityId. It cannot
   be reused by another project, fetch a catalog, or authorize Auto. If no
   canonical current project exists, bridge creation waits. The first visible
   connection-first release asks once for explicit current grants before Auto
   or a changed route can send project data.
7. Write the new version atomically, read it back, and verify the canonical
   metadata and legacy ciphertext digest before marking migration complete.
8. Preserve conductor.json as the one active legacy credential location. A
   future consolidation may move it only behind a separate destructive-risk
   approval, verified new custody, and an explicit end to old-binary rollback.
9. Ship the main/IPC/preload/renderer exact-file recovery action in this same
   migration task; recovery-required never lands before its owner-visible exit.

Migration is idempotent and never creates duplicate secret custody. While the
legacy reference exists and Forget has not crossed its first irreversible
boundary, rollback to an older binary can still use that one credential. Forget
serializes competing mutations, deletes and verifies conductor.json first,
then persists/reads back forget-pending, removes the cache, and removes or
rewrites connection metadata last. If credential deletion fails, Forget has
not succeeded and changes no authority. A crash after verified deletion leaves
the old new-store reference visibly recovery-required, but no old binary can
recover the absent secret. Corrupt-store erase follows the same all-credentials-
first/cache-second/authority-last order and never deletes authority after any
credential deletion failure. Tests inject failure or crash after every
irreversible boundary.

The initial legacy-file migration is separate from later new-store upgrades.
When the dedicated Kimi Code driver lands, a strict versioned store migration
marks only the exact normalized api.kimi.com/coding/v1 plus kimi-for-coding
legacy-compatible route as a pending Kimi Code classification while preserving
connection ID, credential reference, old compatibility driver, assignment,
and the old billing-unknown bridge. Migration alone is not new call authority:
it pauses for explicit current membership-quota disclosure, creates new
billing, capability, assignment, and ConductorGrant revisions, then rebinds the
route before the Kimi driver or new billing claim can send project data. Owners
who ran any earlier slice therefore receive the same safe classification as a
first-time migration; near-matches remain compatible endpoints.

## Failure behavior

| Condition | What Cairn does |
|---|---|
| Catalog network outage | Shows timestamped cached choices for orientation; starts no newly resolved call |
| Credential expired or revoked | Marks only that connection reconnect-required; preserves assignments; no fallback |
| Model removed after assignment | Marks assignment unavailable and asks for Choose new Auto or exact model |
| Provider changes the account externally | Revalidates at the next refresh/call; authenticationRevision is not overstated as account proof |
| Runtime disappears | Builder unavailable; preview or run fails closed before worker start |
| Route changes between preview and run | Returns TASK_ROUTE_CHANGED with old/new non-secret disclosure; owner previews again |
| Renderer tampers with role/model/revision | Main rejects exact-record or derives the authoritative values independently |
| Provider returns malformed catalog | Rejects refresh, retains prior timestamped cache for display only, records redacted diagnostic |
| Provider call fails | Completes authenticated attempted-call receipt with exact route and redacted error |
| Store is malformed or unknown version | recovery-required; no call or ordinary mutation; exact-file Erase Cairn model connections remains available after destructive-risk approval |

## Connection UI details

The normal view avoids a matrix of models:

- **Cairn** — OpenRouter · Personal API connection; Auto — exact model pinned
  for this conversation; expected billing: pay as you go; **Change**;
  **Advanced model choice**.
- **Builder** — Codex · Explicitly linked existing worker; Pinned — fixed model
  shown before every dispatch; account unavailable · billing could not be
  verified; **Change**; **Advanced model choice**.

The connection sheet groups supported routes:

- **Use a subscription I already have**
- **Use an API account**
- **Use a local or compatible server**

Only supported options appear. API credential input says **Paste it here, not
in chat**. Subscription routes hand off to provider-owned authorization.
Connection verification fetches only metadata and does not send project data
or make a model inference.

The link/metadata gate comes first. The standing Cairn/data grant appears only
after an exact pinned model or bounded Auto policy can be shown. Canceling that
second card leaves a saved, unassigned **Connected, not authorized for Cairn**
connection. Detected CLIs appear only as candidates with a **Use this sign-in**
button; they are never assigned by detection order.

Advanced model choice supports search and provider-supplied display names. It
shows lifecycle, modalities, reasoning controls, timestamp, and why an option
is unavailable. It does not show models from another connection.

## Consent and contract alignment

This design preserves:

- the standing connected-conductor authorization and selected-file limits;
- a visible provider/model indicator;
- the separate per-worker-dispatch approval;
- the paid-call and data-bearing-call disclosure;
- the serial worker envelope and its deterministic verification;
- envelope-authored result cards plus one short Cairn comment; and
- per-push and every other concrete-risk pause.

When the multi-connection store and role UI ship together, that implementation
task must amend AGENTS.md and its canonical mirrors so **one connected
conductor** means one active Cairn assignment chosen from multiple saved
connections. The consent screen must name the exact resolved route and expected
billing basis. The contract is not amended in advance of working behavior.

## Supersession and preserved history

This is a proposed ledger. A **would supersede** row takes effect only after the
owner approves the decision card and matching behavior ships.

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

No old document is rewritten or deleted.

## Acceptance criteria

The implementation is complete only when:

1. the owner has approved the three-decision card;
2. a beginner can authorize a supported link/metadata check without first
   choosing a model;
3. only an explicit connection action plus role-applicable grants may fill
   empty compatible roles; detection never does;
4. main-resolved ProjectAuthorityId isolates grants, bindings, receipts, and
   same-numbered conversations across projects;
5. each role has one explicit assignment and no hidden cross-connection
   fallback;
6. authenticated catalogs replace the static picker where the provider offers
   them, while manual compatible endpoints stay honest;
7. Auto follows the deterministic rule and resolves an exact route before the
   standing Cairn grant or dispatch;
8. Cairn pins the complete secret-free route per conversation; Builder redeems
   one-task authority exactly once and revalidates the frozen preview by its
   stable authority digest and exact executable immediately before run;
9. raw API connections never appear as Builder-capable without a trusted
   runtime;
10. secrets remain main-only, migration keeps one credential copy and a narrow
   legacy authorization bridge, Forget/erase use secret-first ordering, and the
   owner-visible recovery path co-lands with recovery-required and expands for
   every Cairn-owned provider home;
11. successful, failed, crashed, and indeterminate model attempts plus
    post-result commentary carry append-only authenticated route receipts;
12. no inference transport follows a redirect or replays credentials/project
    data to its target;
13. gateway serving-provider/BYOK routing is explicitly authorized and recorded
    without being called pre-call exact;
14. unsupported Claude consumer and obsolete Gemini CLI subscription routes
    are absent, while Antigravity remains visibly gated until proven;
15. Kimi Code API and Kimi CLI OAuth remain separate connections, including a
    versioned pending classification plus explicit new route grant for owners
    who already have the new store;
16. gated Copilot and dedicated Codex routes ship only after their explicit
    go/no-go evidence passes, and dedicated Codex state has an exact safe
    removal lifecycle;
17. Gemini Developer API is key-only until a separate OAuth design exists; and
18. the matching contract amendment, records, fake-only tests, builds, and
    owner-visible walkthrough land with the behavior.
