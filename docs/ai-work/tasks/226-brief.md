# Task 226 brief - freeze the Windows-native patch safety boundary

**Lane:** A (the main checkout). **Base commit:** `89f18d8`.

## Requested visible outcome

Cairn has a plain-language, primary-source-backed architecture decision for
the native Windows patch boundary that Task 225 proved portable Node cannot
supply. The record compares same-handle in-place writing, `ReplaceFileW`, a
Git-object-only result, and owner/manual application; selects the least-
authority viable direction or stops it explicitly; defines exact crash and
recovery states; and gives a qualified application-permission/security
reviewer a bounded packet with concrete questions and causal disposable tests.

This is a documentation and offline-design task. It does not implement or run
a native helper, alter an ACL or permission, replace any project file, install
software, invoke a provider, or activate the Builder/Q10 route.

## Boundary of intent

- Use Microsoft primary documentation and existing repository evidence.
  Record which statements are documented facts, which are Cairn inferences,
  and which require qualified judgment or a disposable causal probe.
- Compare at least four choices: a same-handle `CreateFileW`/`WriteFile`/
  `SetEndOfFile` path, `ReplaceFileW`, an inert Git-object/commit result with no
  worktree application, and owner/manual application. Do not select a familiar
  API merely because it looks atomic.
- Define the supported Windows and filesystem scope before describing a writer.
  Account for file identity, reparse points, hard links, share modes/oplocks,
  owner/DACL/SACL/integrity labels, EFS, compression, sparse state, alternate
  streams, extended attributes/object ids, timestamps, and unknown filter or
  filesystem metadata. Unknown or unobservable state fails closed.
- Define a transaction state machine. A durable pre-write record must identify
  exact before and after bytes, file identity/metadata evidence, project/Git
  state, operation identity, and recovery choices. Crash or third-state bytes
  never trigger an automatic retry, rollback, overwrite, DONE, or authority
  reconstruction.
- Separate ordinary implementation decisions from owner decisions and
  qualified security decisions. The handoff must name the exact target,
  permission/security effect, exposure, recovery, and disposable proof needed
  before any native helper or real-project write can be approved.
- Do not create native source, FFI bindings, executable code, test fixtures
  that change permissions, package/dependency changes, App/IPC/UI changes,
  provider/model/credential/network calls, or operating-system configuration.
- Preserve Task 224's inert proposal protocol, Task 225's STOP evidence,
  current legacy/Q9 behavior, empty activation registry, stored data,
  dependencies, platform behavior, and all existing worktrees/branches.

## Checks

1. **`c1` - the platform facts are exact and sourced.** The record cites
   authoritative Windows documentation for every relied-on API guarantee and
   distinguishes explicitly undocumented or unsupported behavior, including
   replacement identity, metadata merging, write-through, handle/reparse
   behavior, stream/security data, and flush semantics.
2. **`c2` - alternatives are compared at the real risk boundary.** Each of the
   four approaches is evaluated for metadata preservation, permissions,
   crash states, race/concurrency behavior, recovery clarity, product value,
   and remaining qualified expertise; the selection or STOP follows from
   those facts rather than from implementation convenience.
3. **`c3` - the proposed transaction and recovery contract is bounded.** The
   decision names exact preconditions, immutable evidence, one-use authority,
   before/write/flush/verify states, every admitted restart classification,
   and the rule that evidence can inspect but never resume or authorize.
4. **`c4` - the qualification gate is owner-visible and actionable.** A
   reviewer packet lists exact security questions and disposable tests for
   ACL/owner/SACL/integrity/EFS/compression/streams/reparse/hardlink/share/
   crash behavior, and identifies every action that still needs just-in-time
   owner approval. More AI review is not represented as qualified expertise.
5. **`c5` - product and permission state remain unchanged.** Source, package,
   App routes, activation, project files, permissions, credentials, providers,
   network, dependencies, and OS configuration are untouched; only Task 226
   records and the architecture document may land.
6. **`c6` - records and independent review are complete.** Three independent
   read-only adversarial reviews challenge the chosen boundary, every finding
   is resolved or recorded as a blocker, exact diff/status checks pass, and
   one report and one LOG row answer all checks in one isolated local commit.

## DONE and STOPPED

**DONE** means the architecture decision truthfully selects a viable bounded
direction or a clearly superior non-writing alternative, defines its crash and
qualification contract, receives three clear read-only reviews, and lands only
documentation/records. DONE does not authorize implementation, permission
changes, native execution, or real-project writes.

**STOPPED** means primary documentation cannot support the required guarantee;
all approaches still risk silent permission/metadata loss or unclear recovery;
the decision would require an unapproved permission/OS change, native probe,
installation, credential, network call, or real-project mutation; qualified
expertise is required to choose even the architecture; or any claimed boundary
cannot be explained and reviewed honestly.
