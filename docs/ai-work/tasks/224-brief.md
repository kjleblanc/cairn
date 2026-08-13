# Task 224 brief - freeze the proposal-only Builder intercom foundation

**Lane:** A (the main checkout). **Base commit:** `cc88db2`.

**Owner direction and AI decision:** The owner asked Cairn to look for a safer
alternative and, if none existed, proceed with the Builder-to-Cairn intercom.
Cairn chooses the stronger form of that design: the future quality Builder is
a pure, tool-free model turn over an exact packet. It cannot receive a local
filesystem, process, shell, network, credential, or local-service capability.
It may only return a bounded patch proposal or ask Cairn for a capability.
Cairn alone validates and later performs approved effects. Existing legacy
Codex Exec remains available on its current route; this task does not relabel
it as the production quality Builder.

## Requested visible outcome

Cairn has a provider-independent, offline Builder intercom foundation and a
reviewed design that make the authority split executable: a Builder response
is untrusted proposal data, never permission. One exact turn is bound to its
Task Spec, Evidence Plan, base Git state, and selected tracked-text inputs. It
can propose bounded replacement text only for those inputs, or return a
bounded capability request that necessarily pauses for Cairn. No proposal can
run a command, open a socket, read another file, apply itself, choose a
verifier, use a credential, or mint an owner approval. The production route
and critic activation remain dark.

## Boundary of intent

- Implement only the dark, offline proposal/intercom protocol, validation, and
  design record. Do not implement a provider transport, saved-key access,
  live Builder, project writer, verifier runner, external-action executor,
  production task route, Q10 calibration, activation, IPC, preload, renderer,
  Electron journey, or operating-system permission change.
- Do not invoke Codex Exec, a model, a provider, a credential, the Internet, a
  local network service, a package manager, or an external process. Tests use
  only in-memory or repository-owned frozen fixtures.
- A Builder proposal is data, not authority. Parsing, canonicalizing, hashing,
  or branding a response must not authorize a file write, command, verifier,
  URL, credential, dependency change, deployment, publication, or other side
  effect. No executable callback or ambient handle enters the protocol.
- Patch proposals are text-only and replacement-only in v1. They may name only
  exact preselected Git-tracked ordinary files, must carry their exact before
  hashes and bounded after text, and must bind the resulting after hashes.
  New files, deletes, renames, links, binaries, ignored/generated/dependency
  areas, credentials, `.git`, `.cairn`, `.agents`, `.codex`, and paths outside
  the canonical project are unsupported and refuse.
- Capability requests use a closed category vocabulary and bounded explanatory
  text. Suggested targets are explicitly untrusted and cannot become an
  executable plan. A later Main-owned resolver must independently turn a
  supported request into an exact disclosure and one-use owner-approved plan;
  this task intentionally supplies no such resolver or executor.
- A future pure-inference provider call will require its own exact data, model,
  cost, and credential approval. Any future local tool runner still requires a
  hard OS/VM/container boundary: the Task 223 loopback failure cannot be
  repaired by an application-level broker.
- Preserve the empty activation registry, normal legacy route, Codex
  `serial-task`-only capability, Q9 guards, existing approval/journal formats,
  dependencies, stored data, and platform behavior.

## Checks

1. **`c1` - the architecture is least-authority and explicit.** A decision
   record compares direct sandboxing, proxy/allowlist, VM/container, remote
   runner, and proposal-only approaches; chooses pure inference plus a Cairn
   capability broker; explains why the broker complements rather than replaces
   hard isolation for any process that can execute code; and divides the later
   patch applier, verifier vocabulary, concrete capability brokers, production
   route, live calibration, and activation into honest follow-up boundaries.
2. **`c2` - one exact Builder turn is closed and bounded.** Core accepts only
   the exact v1 turn/context keys, stable task/check/base/input identities, one
   of the two closed response kinds, bounded counts/text, canonical relative
   paths, unique rows, exact SHA-256 joins, and deeply frozen plain data.
   Getters, exotic prototypes, extra keys, duplicate paths, malformed hashes,
   oversize values, and canonicalization ambiguity refuse.
3. **`c3` - patch proposals cannot widen their input authority.** A patch may
   replace only an exact selected tracked-text row whose before path/hash/text
   still match the turn context. Protected, linked, ignored, binary,
   generated/dependency, credential-like, new, deleted, renamed, absolute,
   traversal, case-alias, and unselected paths refuse. The protocol computes
   rather than trusts every after hash and performs no write.
4. **`c4` - capability requests are inert.** Only closed request categories and
   bounded plain-language `what`, `why`, expected effect, data exposure, cost
   basis, and recovery fields survive. They compose no URL, argv, process,
   fetch, credential, grant, or approval authority; structural clones and
   JSON round trips remain inert proposal data. Source/package-surface tests
   prove there is no executor, transport, live mint, or environment switch.
5. **`c5` - current product routes remain dark and compatible.** Activation
   literals remain empty; normal tasks remain legacy; Codex advertises no
   candidate capability; Q9 and calibration fake authority remain exact; no
   App IPC, preload, renderer, saved connection, pending-run schema, or
   external transport changes; no existing public API changes meaning.
6. **`c6` - verification and records are complete.** Red-first focused tests,
   Core build and complete Core tests, App typechecks/unit tests needed to
   prove package compatibility, exact diff/status inspection, and three
   independent adversarial reviews pass. One report and LOG row answer every
   check, and the exact Task 224 paths land in one local final commit.

## DONE and STOPPED

**DONE** means all six checks pass; the proposal-only architecture is frozen;
one executable offline protocol accepts only exact bounded patch proposals or
inert capability requests; no proposal can perform or authorize an effect;
current routes and activation remain dark; no provider/model/credential/
network/permission action occurred; and the exact records and implementation
land in one clean local commit.

**STOPPED** means the protocol must grant an ambient handle, trust a
model-selected path/hash/command/URL, cannot bind exact selected inputs and
base state, can mutate the project, can mint or replay effect authority, needs
a provider/credential/network/permission action, changes an existing route or
Q9 behavior, makes compatibility ambiguous, protected work changes
unexpectedly, or any claimed invariant lacks causal offline proof.
