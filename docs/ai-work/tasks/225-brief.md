# Task 225 brief - add Cairn-owned selection and exact patch application

**Lane:** A (the main checkout). **Base commit:** `1759f8e`.

## Requested visible outcome

Cairn has a dark, provider-independent workspace kernel for the proposal-only
Builder route. Given Main-chosen paths in a clean Git worktree, it captures
complete ordinary tracked-text files and their exact Git/filesystem custody,
then composes the Task 224 Builder context itself. Given one genuine bounded
replacement proposal, it may derive one opaque, one-use plan and change only
those exact existing files when every bound fact is still current. A durable
transaction record precedes the first write, and later inspection can report
exactly `not-applied`, `applied`, `partial`, or `recovery-required` without
retrying, rolling back, deleting, or overwriting anything.

This is an offline kernel, not a product route. It gives the Builder no file,
Git, process, network, credential, approval, or execution handle. It gives
Cairn no permission to stage, commit, run project code, or activate Q10.

## Boundary of intent

- Implement selection, proposal-to-plan conversion, exact text replacement,
  durable transaction evidence, and read-only crash reconciliation only. Do
  not add App routing, IPC, preload, renderer, approval UI, pending-run schema,
  provider transport, saved-key access, live Builder, verifier, command
  runner, critic route, calibration, activation, dependency, or package.
- Tests may write only disposable local Git fixtures and disposable custody
  roots. Do not invoke a model, provider, credential, Internet or local
  service, package manager, project-code command, external action, or the real
  Cairn app.
- V1 is deliberately narrow: a valid direct Git worktree must be clean; paths
  are the Task 224 printable-ASCII vocabulary; files already exist, are
  tracked at one normal index stage, complete UTF-8 ordinary text, direct
  regular files with one hard link, and outside every protected, credential,
  dependency, generated, install, deployment, Git-control, and reserved area.
  Replacements cannot add, delete, rename, link, change mode, or widen scope.
- Main-selected editable scope is independent of Builder output. No model or
  renderer path, provenance boolean, digest, serialized record, or matching
  text can mint scope or write authority. An effect function stays outside the
  public package barrel and requires an opaque process-local plan joined to
  the genuine branded context and response.
- Bind the canonical project/worktree identity, current symbolic HEAD and
  object id, exact index custody, clean worktree state, selected path spelling,
  file mode/topology/identity, complete before bytes, Task Spec, Evidence
  Plan, consent revision, context, response, and implementation revision.
  Recheck the complete boundary immediately before every filesystem
  transition.
- Git use is read-only. Do not stage, update the index, write Git objects,
  checkout, apply, commit, invoke filters/textconv/diff drivers/hooks, consult
  unsafe ambient Git configuration, or trust a project-selected executable.
- Never truncate a target in place. Prepare an exclusive same-directory file,
  write and sync exact after bytes, preserve the existing mode, revalidate,
  and atomically replace only the bound leaf. Clean up only a still-identical
  Cairn-created temporary file.
- Multi-file replacement is not claimed atomic. Durable intent must precede
  the first possible write. A cut may leave an exact prefix or mixture. On
  inspection, every row must be exactly its recorded before or after state;
  any third bytes, missing path, or changed topology is recovery-required.
  Durable bytes are evidence only and can never recreate a live plan, retry,
  roll back, or complete a partial transaction.
- Cairn's repository run lock prevents cooperative Cairn processes from
  overlapping, and tests inject changes at every exposed transition. This
  task does not claim race-free defense against a malicious same-user process
  that can mutate paths between native system calls; a command-capable or
  adversarial local process still requires the later qualified hard-isolation
  boundary.
- Preserve Task 224's public protocol, current legacy/Q9 behavior, empty
  activation registry, stored project/profile data, dependencies, and
  platform behavior. Existing real worktrees and files are never test targets.

## Checks

1. **`c1` - selection is exact, complete, and independently trusted.** A
   Cairn-owned selector derives rather than accepts canonical root, Git state,
   index, topology, hashes, and complete file bytes; composes the genuine Task
   224 context with exact provenance; and refuses dirty, untracked, ignored,
   filtered, linked, multiply-linked, submodule, special, malformed, unsafe,
   oversized, duplicate/alias, untracked, or out-of-scope inputs without
   reading them into Builder context.
2. **`c2` - only a genuine current proposal becomes a plan.** Plan composition
   requires the exact live branded context and response plus fresh equality of
   root, HEAD, index, worktree, path, topology, mode, and before bytes. Clones,
   JSON, wrong project/task/plan/consent/context, stale Git state, unselected
   paths, no-ops, credential-like after text, and every scope or hash drift
   refuse with zero write.
3. **`c3` - one-use application changes exactly the selected text.** In a
   disposable fixture, a current opaque plan writes only its ordered selected
   full-file replacements, preserves modes and the index, runs no hook/filter/
   executable, returns exact bounded receipt evidence, and cannot be replayed.
   Changing HEAD, index, worktree, selected bytes, topology, identity, case,
   config, or protected state at each injected boundary causes zero additional
   write.
4. **`c4` - crash evidence is honest and non-authoritative.** Intent is sealed
   before the first rename and transition evidence is durable. Cuts before and
   after each transition classify exact all-before, all-after, or partial
   states; tampered or third-state bytes/topology produce recovery-required.
   Restart inspection is read-only and never resumes, retries, rolls back,
   cleans, overwrites, or rebrands a plan.
5. **`c5` - effects and routes remain closed.** The effectful module is absent
   from the package barrel and normal App imports. Package consumers,
   structural clones, provider output, renderer input, environment values, and
   test callbacks cannot mint a live plan or select a writer. No provider,
   transport, verifier, broker, approval, candidate, critic, Q9, calibration,
   or activation path changes.
6. **`c6` - verification and records are complete.** Red-first focused tests,
   Core build and complete tests, App typecheck/unit compatibility, exact
   diff/status inspection, and three independent adversarial reviews pass.
   One report and LOG row answer every check, and exact Task 225 paths land in
   one local final commit.

## DONE and STOPPED

**DONE** means all six checks pass; disposable fixtures prove complete safe
selection, exact one-use replacement, and non-authoritative crash
classification; every stale, widened, linked, protected, or third state fails
closed; existing routes remain dark; no external or credentialed action
occurred; and the implementation and records land in one isolated commit.

**STOPPED** means safe selection requires trusting model provenance; a plan can
be cloned, replayed, or widened; Git/config/filter/hook behavior can execute or
redirect authority; a write can target an unbound or unsafe path, silently
overwrite a third state, or run without prior durable intent; restart evidence
can recreate authority; honest crash classification is unavailable; the
implementation would need a live provider, credential, external action,
permission change, native security claim, existing route/schema change, or
protected work; or any claimed invariant lacks causal offline proof.
