# Task 227 brief - build the inert authenticated reservation kernel

**Lane:** A (the main checkout). **Base commit:** `1e60b11`.

## Requested visible outcome

Cairn has a dark, offline reservation kernel that can freeze one bounded
synthetic Builder-candidate operation into an authenticated, append-only local
journal, re-read and classify its exact current state, and allow one closed
effect-free test handler to consume one opaque in-process grant once. Serialized
records, matching hashes, process restart, stale authority, and caller-selected
data can never recreate or replay that grant.

This task proves only process-crash/readback custody in disposable ignored test
roots inside this repository. It does not claim power-loss durability,
confidentiality, hostile-same-user resistance, or production eligibility.

## Boundary of intent

- Keep the production route dark. No Main entrypoint, task route, IPC, preload,
  renderer, approval UI, activation, provider, model, transport, credential,
  network, Git, native helper, verifier, or worktree path may import or consume
  the kernel.
- Store tests only beneath an exact Task-227 directory inside ignored
  `app/test-results/`; never use the real Electron profile, another project,
  OS temp, a Git directory, or an external path. Cleanup is limited to the
  exact freshly created fixture root after canonical containment checks.
- Use a distinct Builder-reservation key, domains, versions, filenames, and
  bounds. Do not expose the existing pending-run key, accept a caller-supplied
  key, or offer a generic signer/verifier.
- Canonical exact-key records must bind one generated operation UUID, handler/
  schema/policy revisions, exact frozen synthetic plan fields and hashes,
  monotonic revision, previous-revision digest, high-water and inventory/anchor
  state. Before/after synthetic text is evidence, not instructions or authority.
- Create immutable revision records with no-follow/create-only semantics,
  fsync each opened file where the host supports it, re-read exact bytes and
  topology, and distinguish that from unproved parent-directory/power-loss
  durability. Missing, malformed, truncated, replayed, aliased, linked,
  reordered, extra, stale, or conflicting custody fails closed.
- Mint only an opaque process-local test grant after fresh exact-current
  revalidation. Exact mismatches do not spend it; the first exact closed-handler
  invocation spends it before the handler runs, including refusal or throw.
  No bytes, clone, JSON round-trip, digest, restart, environment value, or
  unregistered callback can mint, consume, retry, resume, close, or clean.
- The only handler is a compile-time closed fake with a bounded synthetic tuple
  and deterministic inert receipt. It has no filesystem path, Git, process,
  provider, network, credential, command, callback, or application surface.
- Public/root package exports remain unchanged. Any Main/Core bridge is private,
  non-barrel, absent from package exports, and unimported by the product.
- Preserve Task 224, Task 225's STOP, Task 226's sequencing, existing pending-
  run custody, legacy/Q9 behavior, empty activation, dependencies, permissions,
  stored profile data, and all existing worktrees/branches.

## Checks

1. **`c1` - records and custody are exact and bounded.** Strict canonical
   schemas, distinct HMAC domains, a store-owned 32-byte key, immutable linked
   revisions, high-water/inventory anchor, exact topology, stable readback, and
   fixed count/byte limits accept only one complete current synthetic operation;
   the report labels process-crash evidence separately from unproved power-loss,
   confidentiality, and hostile-same-user properties.
2. **`c2` - authority is opaque, current, and one-use.** Only a fresh exact
   authenticated current reservation mints one process-local grant; wrong
   operation/project/revision/handler/plan bindings, structural clones, JSON,
   forged records/tokens, stale lineage and replay refuse; the first exact
   attempt spends before the fake handler, including throw/refusal.
3. **`c3` - restart only classifies.** Cold restart accepts exact current bytes
   only as read-only `reserved`, `complete`, `interrupted`, or
   `recovery-required` evidence. It never recreates a grant, invokes the fake,
   resumes, retries, rolls back, deletes, cleans, repairs, publishes, applies,
   or declares the underlying task DONE.
4. **`c4` - every effect surface stays closed.** The only consumer is one
   deterministic effect-free fake in test support. Source/package/import
   assertions prove no public API, arbitrary handler/callback, command, Git,
   filesystem target, process, network, credential, IPC, route, activation, or
   environment-selected production seam can consume the grant.
5. **`c5` - causal offline checks cover the real failure modes.** Focused tests
   cover the happy path, bounds, exact-key/canonical tampering, wrong/stale/cross
   bindings, one-use and spend-on-throw/refusal, revision/high-water/inventory/
   key/topology corruption, clone/restart non-authority, extra artifacts, and
   deterministic cuts around record/readback/anchor/spend/fake/receipt states;
   mutation checks prove removing each critical guard fails.
6. **`c6` - compatibility and records are complete.** Core/App typechecks and
   affected focused/regression tests pass; three independent read-only reviews
   find no remaining concrete defect; real diff/status checks pass; one report,
   one LOG row and one isolated local commit account for every touched path.

## DONE and STOPPED

**DONE** means the dark kernel and its disposable offline proofs satisfy
`c1`-`c6`, while no production or external effect becomes reachable. DONE does
not authorize a real profile installation, power-cut test, Git durability
probe, candidate publisher, provider call, project write, or native applier.

**STOPPED** means authenticated current custody or one-use authority cannot be
proved without a public/forgeable seam; the implementation would rely on
unproved power-loss/confidentiality/hostile-user claims; tests require a real
profile, external directory, permission change, Git/provider/network effect,
or qualified security judgment; restart can replay or mutate; existing
behavior/records change; or recovery is unclear.
