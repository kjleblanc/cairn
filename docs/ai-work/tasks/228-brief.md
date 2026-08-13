# Task 228 brief - qualify disposable Git candidate durability

**Lane:** A (the main checkout). **Base commit:** `edafdbc`.

## Requested visible outcome

Cairn has an owner-approved, non-product qualification that decides honestly
whether one pinned Git-for-Windows/files-ref-backend/NTFS matrix preserves the
required object -> private index -> private candidate ref -> authenticated
journal/anchor ordering across deterministic process crashes and approved
machine/VM power cuts in one exact disposable repository/profile fixture on a
dedicated local NTFS virtual disk.

The result is a bounded GO or STOP decision for a later candidate publisher,
not a publisher itself. No proposal or real project enters the probe; all
content is fixed synthetic text. A passing process-crash matrix alone cannot
qualify power-loss durability.

Writing the brief and preparing inert source/tests are safe local work. Before
the first probe creates a repository, Git object, private index, lock, ref, or
journal file, Cairn must show the owner the exact fixture root, pinned binary and
digest, filesystem/ref/config matrix, synthetic bytes, expected writes, cuts,
time/storage cost, exposure, cleanup and recovery, and receive approval for that
exact run. VM creation, VM power control, installation, privileges, permissions,
or OS/filesystem changes require their own later exact approval and are not
implied by approval of a host process-crash run.

## Boundary of intent

- Keep production dark. No Main entrypoint, route, IPC, preload, renderer,
  activation, provider, model, credential, network, verifier, native helper,
  candidate publisher or real-profile path may import or consume the probe.
- Repo-local preparation may add only inert dark harness/test source under a
  dedicated `app/tests-qualification/` surface and must invoke no Git or create
  any fixture. The approved probe may run only inside one atomically claimed,
  identity-bound root on a dedicated local NTFS virtual disk in the approved
  disposable VM/snapshot. Its Git repository, worktree, private index,
  reservation/journal and transcript all stay there. The root must be disjoint
  from every real project, profile, Git/common/object directory, OS temp and
  backup/sync root; never use Cairn's real `.git`, worktree, index, `HEAD`, refs
  or profile.
- Use the absolute reviewed Git executable only. Bind its version and SHA-256;
  scrub Git environment/config/trace/pager/editor hooks; require SHA-1 object
  format, the files ref backend, local NTFS, no alternates/quarantine/replace
  refs, no filters/text conversions/hooks/fsmonitor, and one closed synthetic
  repository shape. Any drift or unsupported fact refuses.
- Freeze every expected blob/tree/commit id before the first object write,
  including exact fixed parent/tree, modes, author/committer identity, timestamp,
  timezone, encoding and message. Use an authenticated, create-only reservation
  and spend one live test authority before the first Git object/index/lock/ref
  effect. Serialized bytes or restart may never mint or resume authority.
- Admit only expected absent objects, one private index under fixture custody,
  its exact transient lock, one exact create-only loose
  `refs/cairn/candidates/<lowercase-uuid>` ref and its transient lock, and exact
  journal/high-water/inventory/anchor revisions. Any reflog, packed/reftable
  update, unexpected object/ref/config/index/worktree byte or extra artifact is
  recovery-required.
- Exercise literal boundaries from reservation through object writes, private
  index, tree/commit verification, ref-absence recheck, ref CAS, journal seal and
  receipt/readback. Child termination and approved power cuts must inspect only
  on restart; they may never auto-resume, retry, roll back, delete, prune, repair,
  clean, apply, cherry-pick, check out or declare a candidate/task DONE.
- Cleanup may remove only a freshly created fixture whose canonical root,
  parent, owner marker, topology and identity are still exact and whose final
  transcript/recovery classification has been sealed, and only when that exact
  success cleanup was included in the approval packet. Interrupted,
  recovery-required or ambiguous states leave evidence in place and report the
  exact later owner choice; no broad, startup or automatic cleanup.
- Do not install software, enable virtualization, manipulate the host power
  state, change permissions/ACLs/privileges, create a real candidate, use project
  text, or run a VM power cut without the separately required exact approval.
- Preserve Task 224's intercom, Task 225's native-writer STOP, Task 226's
  architecture, Task 227's dark reservation kernel, existing pending-run
  custody, Q9/legacy behavior, empty activation, dependencies, permissions,
  profiles, worktrees, branches and remote state.

## Checks

1. **`c1` - the approved matrix and authority are exact.** The report records
   the exact owner-approved fixture, Git path/version/digest, NTFS/files-backend/
   object-format/config/environment tuple, synthetic byte counts, operation/ref,
   expected object ids, authenticated reservation and one-use spend. Wrong,
   stale, copied, reordered, extra or restarted data cannot authorize an effect.
2. **`c2` - the admitted Git delta is closed.** Success creates only the frozen
   object closure, private fixture index/lock, one exact loose candidate ref/lock
   and authenticated journal lineage. The fixture's ordinary worktree, real
   fixture index, `HEAD`, current branch, existing refs/reflogs/config and every
   main-project/profile path remain byte-for-byte unchanged; hooks, filters and
   project-selected execution can never run.
3. **`c3` - every process-crash boundary classifies without replay.** Real child
   termination before/after each object, index, verification, ref-CAS,
   journal/anchor and receipt/readback boundary yields only the exact documented
   absent/interrupted/published-unacknowledged/ready/recovery-required state,
   with no automatic second write, cleanup, grant reconstruction or DONE claim.
4. **`c4` - power-loss qualification is honest.** A separately approved VM or
   equivalent snapshot harness runs the same fixed matrix around the exact flush
   boundaries and records filesystem/Git observations after restart. DONE
   requires causal evidence for the object -> ref -> journal ordering on the
   named matrix plus review of that exact matrix and transcript by a qualified
   filesystem/durability person; process visibility, `fsync` return,
   `update-ref` success or further AI review alone cannot substitute. If no
   approved credible power-cut environment or qualified review exists, the
   qualification stops and the publisher remains blocked.
5. **`c5` - the harness stays disposable and dark.** Source/package/import and
   bundle assertions prove the probe has no production consumer or network/
   provider/credential/native/real-project surface. Exact-root ownership tests,
   sentinels, link/alias/preplant cases and faulted cleanup prove protected work
   cannot be deleted or transformed. Final inspection accounts for every probe
   artifact and leaves no ambiguous residue hidden.
6. **`c6` - compatibility, review and records are complete.** Focused causal
   tests, Core/App compatibility checks and three independent read-only reviews
   pass; the real diff and status are clean; one report, one LOG row and one
   isolated local commit account for every transient and final path, approval,
   observed failure and limitation.

## DONE and STOPPED

**DONE** means the exact owner-approved disposable matrix satisfies `c1`-`c6`,
including credible power-cut evidence, while the real product/project/profile
remain untouched. DONE only permits a later task to design the still-dark
worktree-read-only candidate publisher; it does not authorize publication,
application, verification, provider use, Q10 or activation.

**STOPPED** means approval is absent; the fixture/pinned matrix or expected
objects cannot be frozen; any real project/profile/permission/network/provider
or unexpected Git behavior can enter; authority or cleanup can replay; a crash
state is ambiguous; the process matrix fails; no approved credible power-cut
environment is available; power-loss ordering is not proven; production becomes
reachable; protected work changes; required expertise is missing; or recovery
is unclear. A STOP leaves the publisher blocked and preserves exact evidence.
