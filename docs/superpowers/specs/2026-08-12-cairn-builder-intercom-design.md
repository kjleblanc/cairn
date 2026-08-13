# The Proposal-Only Builder Intercom — Architecture Decision

**Status:** accepted direction chosen by Cairn on 2026-08-12 after the owner
delegated the implementation choice; frozen by Task 224 on 2026-08-13. This
document is a design boundary, not an activated product route. Task 224
implements only an offline, provider-independent proposal protocol. It does
not make a model call, apply a patch, run a verifier, install anything, open a
broker, or grant Codex candidate-writer authority.

**Context:** Task 223 proved a useful half of the proposed Windows Builder
sandbox and disproved the other half. The pinned Codex 0.145.0 elevated
sandbox allowed one disposable project write while denying the tested writes
to project control paths, Electron `userData`, sibling/outside directories,
and temporary directories. The same fixed child opened a raw TCP connection
to a preregistered `127.0.0.1` listener despite both available network-denial
controls. Localhost can expose services carrying authority that the Builder
was never given. An application-level intercom cannot make that direct socket
disappear.

**Decision:** the first production quality Builder will not be a local coding
agent with a shell. It will be one pure-inference, tool-free model turn over an
exact packet selected by Cairn. It may return only one bounded text-replacement
proposal or one inert capability request. Cairn validates the response as
untrusted data. Later, separate Cairn-owned components may turn a supported
proposal into an exact plan, obtain any required owner approval, and perform a
fixed effect. No model response is itself a plan, grant, command, verifier, or
approval.

The short rule is:

> **The Builder may describe a change or a need. Only Cairn can plan an effect,
> and only the owner can approve a concrete risk.**

This choice does not replace the existing legacy Codex Exec route. It does not
repair Task 223, and it does not authorize Q10. Any future local process that
can execute model-chosen code still needs a causally proved OS, VM, or
container boundary that denies raw loopback and every other unapproved local
or external communication path for the complete process tree.

## Why a different boundary is needed

A Builder is useful precisely because its output is not predetermined. That
also means its output and every project byte it reads must be treated as
untrusted. Prompt instructions such as “do not use the network,” a proxy
variable, a localhost allowlist, and an application broker are policy
descriptions. They are not enforcement against a process that can create a raw
socket or start a child that ignores them.

The Task 223 result closes the tempting narrower arguments:

- **Read-only is not no-authority.** A read-only Codex child can still read the
  project, execute commands, connect to localhost, and send data or invoke an
  ambient service. Having Cairn apply its final patch would remove its direct
  project-write authority but would not remove those channels.
- **A broker is not a firewall.** A cooperative client may ask the broker for a
  download or package install. A hostile or merely mistaken command-capable
  child can bypass the broker and contact another listener directly.
- **No Internet is not no network.** Loopback, private-LAN addresses, IPv6,
  local sockets, named pipes, RPC/COM, and other IPC can reach services with
  credentials or host authority even when public Internet traffic is blocked.
- **Tool-free must be structural.** Telling an agent not to use tools is weaker
  than giving an inference request no tool definitions, no local process, no
  filesystem handle, no callback, and no service endpoint in the first place.

The selected architecture removes the local command-capable model process
from this route. A trusted Cairn transport sends an exact packet to a model and
accepts bounded response bytes. The model cannot discover a file, invoke a
tool, or open a socket because no such interface is part of the turn. This
does not make the model trustworthy; it makes its untrusted output inert.

## Threat model and trust boundaries

The design protects against a Builder response, selected project text, or
renderer message that is malformed, adversarial, prompt-injected, stale,
oversized, duplicated, or crafted to look like authority. It also protects
against crash/restart replay and against a caller trying to replace a safe
display with a different effect.

The design does not claim that a proposed code change is correct. Correctness
still requires a frozen Task Spec, a Main-owned Evidence Plan, deterministic
checks where possible, critic inspection where declared, and owner judgment
where only a person can decide.

The trust split is:

| Component or data | Trust and authority |
|---|---|
| Owner action | Can approve only the exact disclosure currently on screen; never inferred from prose or a model response. |
| Cairn Main/Core | Trusted to select data, validate topology and Git state, compose plans, enforce budgets, journal operations, and call fixed implementations. |
| Project files | Untrusted evidence. Selected contents may influence a proposal but never become instructions or authority. |
| Builder model | Untrusted inference source. Receives one exact packet and returns data only. |
| Provider transport | Trusted narrow adapter. It owns the fixed endpoint/model serialization and credential use; it exposes no tool or arbitrary request seam. |
| Patch proposal | Frozen, canonical, hash-bound data. It authorizes nothing and survives JSON only as data. |
| Capability request | Frozen, canonical, hash-bound data. Its category and prose express a need, not an executable target. |
| Cairn plan | Main-only opaque authority derived from fresh trusted inspection. It is never parsed from Builder JSON and cannot be reconstructed by a renderer. |
| Broker receipt | Durable evidence of an attempt and outcome. It is not reusable authority. |
| Verifier output | Evidence from a separately isolated, predeclared verifier; never a command chosen by the Builder. |

Credentials stay entirely on the trusted transport or category-specific broker
side. They never enter the Builder packet, proposal, capability request,
renderer echo, journal, report, stdout, stderr, or debug capture.

## Options considered

| Option | What it gives | Why it is not the v1 answer | When it can return |
|---|---|---|---|
| Direct local sandboxing | A familiar coding agent that can inspect, edit, and test a workspace. Task 223 showed that Codex’s explicit profile can provide useful filesystem confinement. | The tested Windows boundary allowed raw loopback despite both network-denial controls. A local command-capable process remains able to bypass a Cairn broker. | After a separately reviewed AppContainer/WFP/firewall, VM, or container boundary causally denies IPv4, IPv6, loopback, LAN, public network, and unapproved local IPC for the child and every descendant. |
| Proxy or destination allowlist | Good observability and a narrow route for cooperative HTTP clients. Useful defense in depth for a trusted broker. | Environment proxies and application allowlists do not mediate raw sockets. A direct client can bypass them; Task 223 demonstrated the relevant class of bypass. | Inside a hard isolation boundary, or in a trusted fixed broker that has no untrusted command execution. Never as the sole boundary around an agent. |
| Local VM or container | Strong separation can confine filesystem mounts, process capabilities, and network namespaces while retaining tools. | It adds installation/setup, image provenance, host integration, resource cost, platform differences, update custody, and recovery work. On Windows it requires qualified security review and an owner-approved system change. | As a later command-enabled Builder or verifier substrate after a disposable proof denies the same raw socket and host-service probes and proves exact mount/write scope. |
| Remote runner | Removes the untrusted command process from the owner’s PC and can provide disposable compute isolation. | It sends more project data to external infrastructure, needs authentication, cost, source/runner custody, network policy, artifact return, and provider-specific recovery. Cairn has no accepted remote-runner product boundary. | As a separately chosen product with explicit data/cost approval and independently verified remote isolation. |
| Pure inference plus Cairn broker | The model sees only an exact packet and can return only inert data. Cairn retains all local, network, credential, and approval authority. Provider-independent protocol and offline tests are possible now. | It is deliberately less capable: no arbitrary repository exploration, commands, package installs, downloads, or self-selected tests. Those become explicit later capabilities. | **Chosen for v1.** Capability grows through reviewed Cairn components, not by returning ambient tools to the model. |

The choice is not “broker instead of isolation.” It is “no local tool runner in
this route, plus a broker for later Cairn-owned effects.” If a later design
puts a shell, code interpreter, MCP tool, local model agent, browser driver, or
project test process under model control, the hard-isolation prerequisite
returns immediately.

## Proposal is not plan

Four objects must remain distinct:

| Object | Who creates it | What it may do |
|---|---|---|
| Proposal | Builder response, then strict Cairn parser | Describe replacement text for preselected files, or describe a capability need. Nothing else. |
| Plan | Cairn Main after fresh inspection and category-specific resolution | Name one exact possible effect, implementation revision, target, input hashes, limits, and recovery. A plan still cannot execute itself. |
| Grant | Exact current owner decision, held only in Main | Permit one plan to be reserved once. A decline, stale card, changed bytes, restart, or second press yields no grant. |
| Receipt | Cairn journal/broker after reservation and attempt | Record what was attempted and the bounded result. It cannot authorize a retry or a different operation. |

Canonicalization and hashing provide identity and custody, not permission. A
deeply frozen proposal, a structural clone, a JSON round trip, a matching
SHA-256 string, or a renderer echo remains inert. Live plan and grant authority
must use non-serializable process-local binding to the exact trusted objects
Main created. Durable JSON records decisions and outcomes but is never
rebranded into live authority after restart.

## The exact v1 turn

Task 224’s offline protocol is the contract between a future transport and
Cairn. It has no executable handle, callback, or effect. An Evidence Plan may
describe a Main-owned verifier as inert data; neither that description nor
any Builder output can invoke it. The context version is
`cairn-builder-turn-context/v1`; the only accepted response version is
`cairn-builder-turn-response/v1`. One context has these exact top-level
subjects:

- `version`, UUIDv4 `runId` and `turnId`, and `taskNumber`;
- `projectHash` and the bounded `connectionConsentVersion` machine token;
- exact already-branded `taskSpec` (`TaskSpecV1`) and `evidencePlan`
  (`EvidencePlanV1`), their `taskSpecSha256` and `evidencePlanSha256`, and
  ordered `criterionIds`. The composer proves the plan binds that exact spec;
  their canonical bodies are part of the future model-visible turn and the
  context digest without creating effect authority;
- `baseHead` as exactly 40 or 64 lowercase hexadecimal characters and
  `gitStateSha256` for the admitted Git state;
- `selectedTrackedText`, one ordered set of exact, untruncated rows including
  their closed provenance.

Canonical encoding of that complete context produces `contextSha256`; every
response must echo that digest. It is derived custody, not a recursive field
inside the context.

Each selected row carries its unique id, exact NFC canonical
repository-relative path, content SHA-256, full content, `truncated: false`,
the selector version `cairn-builder-context-selector/v1`, and closed
provenance facts proving that it is tracked, ordinary, regular,
not a symbolic link or reparse point, has `hardLinkCount: 1`, is not a
submodule, and is non-ignored, non-dependency, non-generated, non-credential,
non-reserved, inside the project, and consented. It also carries explicit
`packageOrDependencyControl: false`, `installScript: false`, and
`deploymentOrProductionControl: false` facts. The offline composer prefilters
known unsafe names but cannot infer arbitrary file semantics from spelling; a
future trusted selector must causally classify these facts, and the later
applier must recheck them. Row provenance must agree with top-level
`projectHash` and `connectionConsentVersion`. V1 path spelling is deliberately
limited to printable ASCII, and duplicate ids and paths that alias after the
protocol’s invariant-uppercase fold refuse. A later trusted selector may
broaden this only with causal native-filesystem alias evidence. Text
is serialized under the protocol’s fixed UTF-8 rule,
but all v1 text caps are measured in UTF-16 code units. NUL, invalid text, BOM
ambiguity, binary content, and implicit normalization are unsupported. Line
endings are data and are not normalized. Paths are exact printable-ASCII Git
spelling and forward-slash relative. The parser applies its conservative
identity fold; the future trusted selector must additionally prove native-host
alias freedom.
Paths are free of absolute prefixes, empty/dot/traversal segments, backslashes,
control characters, and link/reparse ambiguity.

Only Git-tracked ordinary files may be selected. V1 refuses:

- `.git`, `.cairn`, `.agents`, and `.codex` at any depth;
- ignored, untracked, generated, dependency/cache/vendor, build-output, and
  credential-like areas;
- symlinks, junctions, reparse points, hardlink-sensitive aliases, submodules,
  device files, and anything outside the canonical project;
- lockfiles, dependency manifests, package-manager configuration, install
  scripts, and deployment/production configuration whose semantics need a
  dedicated capability review; and
- a file whose complete text does not fit the turn caps.

The conservative v1 caps are:

- one Builder turn and one response; no automatic retry or continuation;
- at most 8 selected tracked-text rows and at most 8 replacement rows;
- at most 8,000 UTF-16 code units for each selected content value and each
  replacement `afterText` value;
- at most 32,000 UTF-16 code units across selected content and at most 32,000
  across replacement `afterText` values;
- at most 1,024 UTF-16 code units in a repository-relative path; and
- at most 1,000 UTF-16 code units in each response prose field, including a
  patch summary and every capability-request explanatory field.

Count, length, uniqueness, exact-key, provenance, and canonical encoding
limits are checked during strict composition and parsing. Revisions own these
values. Widening a cap is a new policy revision, not a configuration or
renderer choice.

## The two response kinds

### 1. Text-replacement proposal

A replacement proposal contains one to eight rows. A zero-row or semantically
no-op patch refuses. Every row must match one selected input by exact path and
`beforeSha256`. It supplies only the proposed full `afterText` and claimed
`afterSha256`. Cairn encodes the after text under the protocol’s fixed UTF-8
rule, computes the SHA-256 itself, and rejects a different claimed hash. Rows
are unique and remain in canonical path order. The common response fields are
the exact response version, echoed `contextSha256`, and response kind. The
kind literal is `replacement-proposal`; it adds only its bounded summary and
replacement rows.

There is no unified diff, hunk offset, glob, rename, delete, create, file mode,
link target, binary payload, patch command, or “apply” flag. Full replacement
avoids fuzzy-hunk and path-resolution authority. A proposal may replace only
the exact bytes it was shown; it cannot widen its input set by naming another
path. Parsing performs no filesystem write and returns no callback, file
descriptor, resolver, process, or Git handle.

A later patch applier must still re-read and prove all of the following before
it composes a plan:

1. canonical project identity, base object, index, worktree state, and every
   protected path remain exact;
2. the selected path still resolves directly beneath the same root and has not
   become a link, reparse point, alias, hardlink-sensitive object, generated
   file, ignored file, or special dependency/credential path;
3. current bytes equal the proposal’s bound before bytes;
4. the complete proposed result changes only the admitted rows and stays
   within the task’s declared scope; and
5. the applier’s fixed implementation revision and recovery plan match the
   owner-visible task route.

Applying replacement text is a Cairn effect, not a Builder effect. Ordinary
local reversible work may proceed under the task’s existing dispatch decision
only when the project contract permits it and the exact admitted scope has not
changed. A dependency, download, credential, external, production,
destructive, permission, publish, or unclear-data effect always needs its own
just-in-time owner decision regardless of what the Builder proposed.

### 2. Capability request

A capability request is one closed category plus exactly seven bounded,
owner-readable, inert plain-text fields:

- `suggestedTarget`;
- `what`;
- `why`;
- `expectedEffect`;
- `dataExposure`;
- `costBasis`; and
- `recovery`.

The closed v1 categories are:

1. `additional-tracked-text`;
2. `external-reference`;
3. `dependency-change`;
4. `external-service-action`; and
5. `owner-clarification`.

These names describe why Cairn paused. They do not select an implementation.
There is deliberately no verifier or command category and no URL, host, port,
argv, shell, package manager, package specifier, credential handle, service
method, deployment handle, callback, executor, or approval id in the schema.
`suggestedTarget` is untrusted explanatory text only; no resolver may copy it
into a plan.

For example, “download library X,” “call localhost port 3000,” and “run npm
install” are not executable requests. Main may later decide there is no
supported mapping, ask the owner for more information, or use a
category-specific resolver to discover an exact safe target from trusted
project and app state. Unsupported or ambiguous mappings stop. The Builder
does not get a generic escape hatch.

The current turn ends when it returns a capability request. A completed
capability can inform a newly composed turn only after Cairn makes a fresh
selection, binds a new generation and packet, shows any newly exposed data,
and obtains the separately required model-call approval. There is no hidden
continuation or automatic second call.

## Authority sequence

The production sequence, when its later prerequisites exist, is:

1. **Freeze task authority.** Main holds the source-bound Task Spec and a
   Main-owned Evidence Plan. The Builder cannot revise either.
2. **Select the packet.** Main reads Git and the canonical project, applies the
   closed text-selection policy, and binds the exact base, Git state, paths,
   hashes, contents, and caps into a turn digest.
3. **Disclose the model call.** The owner sees provider, exact model/revision,
   project, purpose, selected file names and counts, complete data-scope
   summary, one-call quota, timeout/output caps, credential basis, and cost or
   quota basis. File content authorization remains exact and separate where
   the project contract requires it.
4. **Reserve before send.** Main durably records a new operation id, turn and
   request hashes, route revision, approval id, attempt number, and consumed
   call allocation. Only then does it consume the process-local one-use grant.
5. **Send through a fixed tool-free transport.** The transport chooses no
   endpoint from Builder or renderer text, exposes no tool definitions or
   server-side tools, follows no redirect, sends no ambient conversation or
   project data, and captures bounded bytes.
6. **Seal before interpretation.** A complete response is stored with its
   request/turn identity and hash before it can affect later state. A partial,
   oversized, malformed, model-mismatched, or uncertain response is not a
   proposal.
7. **Parse as inert data.** The strict protocol admits exactly one replacement
   proposal or capability request. Parsing never writes, executes, fetches,
   authenticates, or approves.
8. **Resolve separately.** A later Cairn component may inspect current state
   and compose an exact patch plan or category-specific capability plan. The
   plan is Main-only, versioned, and bound to fresh state.
9. **Pause at the real boundary.** Immediately before a concrete risk, Cairn
   shows exact target, effect, data exposure, likely cost/quota, credentials or
   permissions involved, and recovery. A qualified person is required where
   the project contract says so. Only the matching current owner action yields
   a one-use grant.
10. **Journal, execute once, and verify.** Main records the decision and
    reservation before the effect, calls one fixed implementation, records a
    bounded receipt, independently verifies the postcondition, and never lets
    the Builder’s claims determine DONE.

No renderer, provider response, environment variable, project file, durable
journal row, approval-id string, or matching digest may skip a step.

## The Cairn capability broker

“Broker” means a collection of closed, Main-owned operation handlers, not a
general localhost server and not a shell proxy. Each handler has its own exact
request schema, disclosure composer, one-use plan/grant binding, implementation
revision, timeout/output limits, and recovery rules. There is no generic
`execute`, `fetch`, `spawn`, `open`, `install`, or `call` method.

The intercom between model and Cairn is conceptual: request bytes go through
the trusted inference transport and response bytes return. It must not be
implemented as a loopback listener the Builder can discover. If an isolated
fixed helper process is justified for credentials or dangerous libraries, it
receives one inherited anonymous pipe or equivalent kernel-protected handle,
one exact schema, a minimal environment, an empty/private working directory,
and no project path. Its output is sanitized fixed data. The handle is not a
substitute for denying every other communication path when that helper or a
descendant can execute untrusted code.

Category requirements include:

- **Additional tracked text:** Main reruns the tracked-text selection policy;
  `suggestedTarget` is a hint only. New contents require a new packet,
  data-scope disclosure, and model-call approval.
- **External reference:** Main independently resolves any possible document,
  URL, or download to an exact source and inert bounded result. A later
  handler must pin origin, redirects, bytes, media type, provenance, digest,
  storage, and recovery. It never executes downloaded bytes, and unknown
  provenance or digest stops.
- **Dependency change:** never a generic package-manager pass-through. A later
  handler must pin manager/executable, manifest and lockfile before hashes,
  exact package/version/registry, lifecycle-script policy, cache/write scope,
  cost/license/security disclosures, and rollback. Install/update always
  pauses for the owner.
- **External service action:** this broad inert category does not grant a
  generic service caller. A supported later handler names one independently
  resolved local or external service, fixed origin/method/schema, exact data,
  credential custody, cost, return cap, and recovery. Localhost is external to
  the Builder’s authority: Task 223 makes direct Builder access categorically
  unsupported. Destructive, production, permission, credentialed, publish,
  and deploy effects each still require a separate expert-reviewed handler
  and exact owner decision; an absent qualified implementation means STOPPED.
- **Owner clarification:** opens no effect. Main shows a bounded question with
  the Builder clearly attributed; the answer is new source-bound owner input,
  not an approval for another category.

Verifier requests and commands are intentionally outside the v1 capability
vocabulary. Main owns a predeclared verifier vocabulary and selects any
criterion-to-verifier mapping before dispatch; Builder prose cannot add argv,
cwd, parser, assertion, expected exits, or a new check. Because repository
tests execute code, even a Main-owned verifier needs the separate hard
execution isolation described below.

## Crash, replay, and “exactly once”

For many external effects, universal exactly-once execution is impossible.
Cairn must promise what it can prove: one durable allocation and at most one
automatic attempt. The journal records `decision -> reserved -> sending ->
answered/unavailable/interrupted`. Allocation is consumed before the first
possible effect.

- A crash after reservation but before a sealed result is an unknown outcome.
  Restart never recreates a grant and never automatically sends again.
- A second attempt, when policy permits one, is a new operation with a new
  disclosure and owner decision that explicitly states the first outcome may
  be unknown.
- When a remote service supports a pinned idempotency key and a safe status
  query, the operation id may be used as that key. This narrows uncertainty;
  it does not authorize a blind resend.
- A complete response or receipt may resume after restart only when its bytes
  were sealed before the crash and every request, operation, state, and policy
  hash still matches. Durable bytes remain evidence; Main reconstructs no
  live grant from them.
- Local text replacement uses before and after hashes for reconciliation. If
  current bytes are exactly before, the effect did not land; if they are
  exactly after, it did; any third state requires recovery. Recovery never
  overwrites an unexpected state.
- Package operations, lifecycle scripts, downloads, local-service mutations,
  publication, and deployment are not assumed atomic. If their handler cannot
  determine a safe post-crash state without another risky effect, it stops for
  owner/expert recovery.

The existing pending-run design supplies useful patterns: monotonic revisions,
authenticated state outside the project, explicit operation ids, durable
owner decisions before spending, reserved/sending terminalization on restart,
and process-local one-use grants. A future broker should reuse those principles,
not silently widen the existing schema in this task.

## Why proposal-only still needs verification isolation

Writing text does not execute it. Verification often does. A test command may
load the proposed code, package scripts, compilers, plugins, fixtures, and
existing repository code. Therefore the trusted choice of a verifier is not
enough to make its execution safe.

A production verifier must run from a disposable exact-base copy or other
proved containment with:

- predeclared executable real path and digest, argv, cwd, environment, timeout,
  parser, assertions, and accepted exits;
- no credential, provider, package-download, user profile, Electron
  `userData`, or mutable host configuration;
- writes only to a disposable verifier work/scratch root, never valuable
  project or profile data;
- causal denial of raw IPv4/IPv6 loopback, LAN, public network, DNS escape,
  local sockets, named pipes/RPC, and unapproved inherited handles for the
  complete process tree; and
- bounded stdout/stderr and an authenticated receipt joined to the exact
  Task Spec, Evidence Plan, candidate, command, and input tree.

The Main-owned bounded verifier vocabulary selected before Builder dispatch is
still a separate prerequisite. Codex’s opaque model-chosen command events do
not become evidence merely because its final patch is now a proposal.

## Causal proof obligations

Each later capability must have offline failure tests before any live effect.

### Task 224 protocol

- hostile getters, proxies/exotic prototypes, symbol or extra keys, duplicate
  rows, duplicate case aliases, malformed hashes, oversized values, and
  non-canonical object shapes refuse;
- absolute/traversal/backslash/link/protected/generated/dependency/credential
  and unselected paths refuse;
- before path/hash/text must join the frozen selection exactly;
- after hashes are recomputed from exact UTF-8 bytes;
- parsing replacement and capability responses causes zero filesystem,
  process, network, credential, approval, or environment effect; and
- structural clones and JSON round trips remain data and cannot reach an
  executor or authority mint.

### Selection and patch applier

- temporary Git fixtures prove tracked ordinary-text selection and every
  excluded topology;
- mutate HEAD, index, worktree, protected path, selected bytes, case spelling,
  or link/reparse state after proposal and observe zero writes;
- a clean plan changes exactly the selected full files, with filters/hooks and
  arbitrary Git configuration unable to execute;
- fault injection immediately before and after each filesystem transition
  reconciles only exact before/after states; and
- dependency manifests, lockfiles, new/delete/rename/mode/binary operations,
  and a proposal outside task scope remain unsupported.

### Owner approval and broker

- a fake fixed handler proves exact disclosure, card echo, state generation,
  one-use grant, durable decision-before-effect, at-most-one call, redacted
  output, cancellation, timeout, and restart interruption;
- altered, stale, replayed, cloned, pre-approved, or wrong-project cards cause
  zero effect and do not destroy the genuine pending decision;
- hostile `what` prose containing URLs, ports, argv, paths, package commands,
  credentials, approval ids, or a second operation is never copied into the
  plan;
- each category rejects unsupported resolution rather than falling through to
  a generic shell/fetch path; and
- fake canaries placed only in broker-private state never reach Builder data,
  receipts, errors, logs, or the project.

### Hard isolation for any command runner

- one fixed child and one grandchild each attempt raw IPv4 and IPv6 loopback
  connections, a private-LAN endpoint, public-network routing, DNS, local
  sockets, named pipes/RPC, shared host service handles, and listener creation;
- preregistered local controls prove every unapproved connection count remains
  unchanged while the one intended inherited control pipe works;
- the process tree cannot escape, elevate, start an unsandboxed descendant, or
  outlive cancellation/timeout; and
- filesystem probes repeat Task 223’s project/control/userData/outside/temp
  matrix under the same production boundary.

This proof changes OS or container state and therefore requires its own exact
owner risk pause and qualified security review. Until it passes, no local
command-capable Builder or verifier is eligible for the production quality
route.

### Production tool-free transport

- fake transports capture exact request bytes and prove no tools, server-side
  tools, ambient conversation, unselected files, arbitrary endpoint, redirect,
  retry, or second turn;
- model/route/revision, request digest, timeout, output cap, usage, and response
  identity drift refuse;
- credentials are transport-only and secret echoes are reduced to fixed Cairn
  errors; and
- crash at reserve/send/response-seal boundaries produces the declared
  at-most-once and unknown-outcome behavior.

Only after these fake checks may a separately approved live call establish
provider behavior. A live pass still does not activate the route.

## Follow-up task boundaries

The work must land in this order, with a new brief and honest STOP conditions
for each boundary:

1. **Offline intercom protocol (Task 224).** Exact turn context, replacement
   proposal, inert capability request, canonical custody, and adversarial pure
   tests. No App route or effect.
2. **Selection and patch applier.** Git-owned tracked-text selection, exact
   topology/base/state binding, proposal-to-plan conversion, replacement-only
   application, diff custody, and crash reconciliation. No provider call.
3. **Owner approval and durable broker kernel.** Generic *authority pattern*,
   not a generic executor: exact disclosure, one-use plan/grant, authenticated
   journal transitions, one fake closed handler, and interruption recovery.
   Category-specific handlers remain separate tasks.
4. **Verifier vocabulary and execution isolation.** Main maps supported `cN`
   checks to fixed commands before dispatch. A separately approved hard
   process/network boundary must pass the raw-socket/process-tree matrix before
   repository code executes.
5. **Production tool-free Builder transport.** One exact provider/model call,
   no tools or local agent process, bounded packet/response, transport-only
   credentials, spend/data disclosure, and fake-first route receipts. Existing
   Codex Exec remains legacy.
6. **Production quality route integration.** Join proposal, patch, verifier,
   candidate, critic packet, pending-run, repair, and terminal result-card
   custody without activating them. Re-run legacy/Q9 separation and restart
   matrices.
7. **Live calibration and activation.** Use the preregistered Q10 fixture set,
   one separately approved external call at a time. Only an exact passing
   provider/model/prompt/schema/policy/transport tuple enters the activation
   registry. Any miss leaves activation empty.

Package installation, downloads, local-service calls, credentials, production
changes, destructive operations, and publication are not delivered by “the
broker kernel.” Each needs a category-specific task, disclosure, qualified
review where required, causal fake tests, and owner approval at the concrete
effect.

## STOP conditions

Stop the relevant task before activation or effect if any of these is true:

- the Builder needs a filesystem, shell, process, command tool, browser, MCP
  server, arbitrary callback, local-service connection, credential, or ambient
  network capability;
- a local command-capable process can reach raw IPv4/IPv6 loopback, LAN,
  public network, DNS, named pipes/RPC, local sockets, or another host service
  outside one intended kernel-enforced channel;
- a proxy, allowlist, prompt instruction, bearer token, or application broker
  is being used as the sole containment for untrusted code;
- selected inputs cannot be proved complete, tracked, ordinary, direct,
  non-secret text at one exact base and Git state;
- a response can name a new/delete/rename/link/binary/mode path, trust its own
  hash, widen its selected files, or cause a write while parsing;
- a capability category requires a model-selected URL, host, port, argv,
  package specifier, path, credential, verifier, or implementation callback;
- Main cannot independently resolve one exact target and show the owner the
  complete effect, data exposure, cost/quota, credential/permission use, and
  recovery immediately before the risk;
- a cloned, serialized, stale, replayed, or journal-rehydrated object can act
  as a live plan or grant;
- crash outcome is ambiguous and the implementation would retry, overwrite,
  clean up, or declare success without safe reconciliation;
- a package may execute uncontrolled lifecycle code, a download lacks bounded
  provenance/digest, a local service has an arbitrary method/origin, or a
  credential could enter Builder-visible data or logs;
- a verifier runs project code without a causally proved hard network,
  filesystem, descendant, and timeout boundary;
- the production transport cannot prove one exact tool-free request and
  bounded response without redirects, hidden tools, fallback, or retry;
- an existing legacy/Q9 path, pending journal, stored profile, dependency, or
  activation tuple must change before its own task; or
- a provider call, credential use, network request, installation, permission
  change, external write, publication, deployment, or valuable-data
  transformation would occur without its exact owner pause.

## What this decision deliberately leaves open

This design does not choose a production Builder provider or model, a remote
versus local inference endpoint, a Windows isolation technology, package
manager support, a download catalog, a local-service connector, or the set of
tasks eligible for the bounded verifier vocabulary. Those choices require
evidence from their own implementation context.

It does choose the authority direction permanently for this route: the model
may reduce uncertainty by proposing; it may never increase its own authority.
Every added capability must end at Cairn and the owner before it begins as an
effect.
