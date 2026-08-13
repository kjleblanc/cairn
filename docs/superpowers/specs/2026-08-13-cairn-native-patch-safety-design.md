# The Native Patch Safety Boundary — Architecture Decision

**Status:** accepted as an offline design by Task 226 on 2026-08-13 after three
independent adversarial reviews. It does not authorize implementation,
permission changes, a Git publication, or a real-project write.

## Decision in one sentence

The first proposal-only Builder route will produce a **worktree-read-only,
non-HEAD Git candidate under a private Cairn ref**. Automatic worktree
application is a separate later effect. On Windows, `ReplaceFileW` remains the
leading native candidate for that later effect, but it is not eligible until a
qualified application-permission/security reviewer accepts an exact local-NTFS
matrix and disposable causal proof.

In plain language: Cairn can safely put the proposed change in a sealed display
case first. Putting it into the owner's live files is a different job with a
different safety review.

## Why this decision exists

Task 224 made the Builder proposal-only. It can describe bounded full-text
replacements for exact text rows, but it cannot write a file or choose a
command. Task 225 then attempted the obvious Cairn-owned application strategy:
write a same-directory temporary file, copy the ordinary mode bits, and rename
it over the target.

That strategy was stopped. The rename changes the file object. Correct text
and `rwx` bits do not prove preservation of owner, group, ACLs, integrity
labels, alternate streams, encryption, compression, sparse state, extended
attributes, object ids, filter-managed state, or other filesystem metadata.
Portable Node APIs cannot establish the promised security boundary.

The owner asked Cairn to choose the better architecture. This record separates
two questions that the earlier plan had combined:

1. How can Cairn preserve a Builder result as a real, inspectable software
   candidate without granting it write authority?
2. How may that candidate later enter the live worktree without silently
   changing permissions or damaging data?

The first question has a lower-authority answer today: a non-HEAD Git commit
retained by one private Cairn ref. The second remains a qualified native
boundary.

## Evidence labels

Every claim below uses one of three labels.

- **Documented:** stated by the linked Microsoft or local Cairn source.
- **Cairn inference:** follows from documented behavior, but is not itself an
  API guarantee.
- **Qualification required:** must be decided by a suitably qualified human
  and, where approved, proved on a disposable fixture before production use.

## Primary Windows facts

### `ReplaceFileW`

Microsoft documents that `ReplaceFileW` combines replacement steps and
preserves this explicit list from the replaced file: creation time, short
file name, object identifier, DACLs, security resource attributes, encryption,
compression, and named streams not already present in the replacement file.
The resulting file keeps the **replacement** file's file ID, not the replaced
file's ID. All files must be on one volume. Microsoft says the replaced target
is opened with `GENERIC_READ | DELETE | SYNCHRONIZE` and
`FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE`; the caller must have
write access to that target. The replacement is first opened with
`SYNCHRONIZE`, `GENERIC_READ`, `GENERIC_WRITE`, `DELETE`, and `WRITE_DAC`, then
retried without `GENERIC_WRITE`; no sharing mode is specified for that
replacement-file open. The selected v1 design uses **zero ignore flags**
because either ignore flag can permit success without preserving ACL
information.
`REPLACEFILE_WRITE_THROUGH` is explicitly unsupported.

The documented failures are distinct states, not examples of one generic
failure:

- error 1175 leaves the replaced and replacement files under their original
  names;
- error 1176 also leaves both original names when a backup name was supplied,
  but without a backup the replaced file no longer exists and the replacement
  remains under its original name; and
- error 1177 leaves the replacement under its original name after it inherited
  streams and attributes, while the replaced file moves to another name (the
  backup name when supplied).

Other errors retain both original names, but Microsoft does not guarantee that
the replacement avoided inheriting attributes or streams. Therefore a false
return is never equivalent to “nothing happened.”

Source: [ReplaceFileW function](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-replacefilew).

**Cairn inference:** `ReplaceFileW` is materially safer than a plain rename for
the metadata Microsoft names, but that list is not permission to assume it
also preserves owner, group, SACL, mandatory integrity, every extended or
filter-managed property, or power-loss durability.

### Opening an existing file

Microsoft documents that `CreateFileW` with `OPEN_EXISTING` opens only an
existing object, and that a supplied security descriptor is ignored when an
existing file is opened. Share mode zero prevents later opens requesting
read, write, or delete while the handle remains open, but an incompatible
handle that already exists makes the open fail. `FILE_FLAG_OPEN_REPARSE_POINT`
opens the reparse point rather than following it. `FILE_FLAG_WRITE_THROUGH`
requests direct writes, while `FILE_FLAG_NO_BUFFERING` has strict alignment
requirements. `WriteFile` explicitly says a multi-sector write is not
guaranteed atomic without a transaction. `SetEndOfFile` truncates or extends
the stream at the current file pointer, and newly extended bytes are undefined.

Sources:

- [CreateFileW function](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew)
- [WriteFile function](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-writefile)
- [SetEndOfFile function](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-setendoffile)

**Cairn inference:** writing through one `OPEN_EXISTING` handle avoids replacing
the file object, so object-bound metadata is not recreated merely because new
content is written. It does not make a sequence of writes and a length change
atomic. A process or power loss can expose zero, partial, mixed, or truncated
content.

### Flush is not a transaction

Microsoft documents that `FlushFileBuffers` writes buffered information for
one handle to the device and that it does not flush metadata unless that
metadata is associated with the handle's buffered data.

Source: [FlushFileBuffers function](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-flushfilebuffers).

**Cairn inference:** flushing can establish ordering evidence for an approved
filesystem/device matrix, but no combined atomic content transaction or
universal hardware-cache durability guarantee is documented here. It cannot
turn an in-place multi-write update into all-before-or-all-after atomicity, and
`ReplaceFileW` supplies no supported write-through flag.

### Identity, topology, streams, and security descriptors

Microsoft documents that:

- `GetFileInformationByHandleEx` can return basic, standard, stream,
  compression, reparse-tag, storage, and 128-bit file-id information; some
  information classes depend on OS and filesystem drivers;
- `BY_HANDLE_FILE_INFORMATION` carries volume id, file id, link count, size,
  attributes, and times; file-id behavior is filesystem-specific;
- `GetSecurityInfo` can retrieve owner, group, DACL, and SACL by handle, but
  SACL access requires `ACCESS_SYSTEM_SECURITY` and the security privilege;
- NTFS files may have multiple named streams, and each stream can have its own
  compression, encryption, and sparse state;
- backup stream records can represent default data, alternate data, security
  data, extended attributes, links, object ids, reparse data, and sparse data;
  and
- hard links expose one file object through multiple paths, so content changes
  are visible through every link.

Sources:

- [GetFileInformationByHandleEx](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-getfileinformationbyhandleex)
- [BY_HANDLE_FILE_INFORMATION](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/ns-fileapi-by_handle_file_information)
- [GetSecurityInfo](https://learn.microsoft.com/en-us/windows/win32/api/aclapi/nf-aclapi-getsecurityinfo)
- [File streams](https://learn.microsoft.com/en-us/windows/win32/fileio/file-streams)
- [WIN32_STREAM_ID](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-win32_stream_id)
- [Reparse points and file operations](https://learn.microsoft.com/en-us/windows/win32/fileio/reparse-points-and-file-operations)
- [Hard links and junctions](https://learn.microsoft.com/en-us/windows/win32/fileio/hard-links-and-junctions)

**Cairn inference:** a production applier must scope one exact filesystem and
must refuse any property it cannot observe with ordinary, non-elevated access.
Silently enabling backup, restore, owner, or security privileges would widen
the app's permission boundary and needs its own owner decision and qualified
review.

### Sharing and opportunistic locks

Create-file share modes remain active for a handle's lifetime. Opportunistic
locks are requests used for coherence; a filesystem may refuse them and they
can be broken when another client needs incompatible access. They are not an
unconditional hostile-process compare-and-swap.

Sources:

- [CreateFileW sharing modes](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew)
- [Opportunistic locks](https://learn.microsoft.com/en-us/windows/win32/fileio/opportunistic-locks)

**Qualification required:** decide the exact share mode and whether an oplock
adds useful notification without creating liveness or filter-driver hazards.
Cairn's cooperative run lock remains necessary but is not OS containment.

### Transactional NTFS is not the escape hatch

Microsoft recommends alternatives rather than adding a new dependency on TxF
because it may not remain available. For document-like single-file updates,
Microsoft names writing a new file and calling `ReplaceFile` as a common
alternative.

Source: [Alternatives to using Transactional NTFS](https://learn.microsoft.com/en-us/windows/win32/fileio/deprecation-of-txf).

**Decision:** Cairn will not adopt TxF.

## Primary Git facts for the selected non-HEAD candidate

Git documents these individual mechanics:

- `git hash-object -w --stdin --no-filters` writes the exact input as an object;
  `--path` instead selects attributes and filters and is therefore forbidden;
- `git read-tree` reads a tree into an index without updating worktree files
  unless `-u` is used, and `-i` is intended for a temporary index unrelated to
  the current worktree;
- `git update-index --cacheinfo` records an exact mode, object id, and path in
  the selected index;
- `git write-tree` creates a tree object from a fully merged current index;
- `git commit-tree` creates a commit from a tree and parent, and the commit
  identity also contains author/committer names, emails, timestamps, timezone
  offsets, and message bytes;
- `git update-ref <ref> <new> <old>` checks the old value before updating; an
  all-zero or empty old value requires the new ref to be absent; and
- the repository layout permits a worktree `.git` file and a separate common
  directory/object database, and permits borrowed object stores through
  alternates. Those redirections must therefore be resolved and refused unless
  they are the one authenticated layout.

Sources:

- [git-hash-object](https://git-scm.com/docs/git-hash-object)
- [git-read-tree](https://git-scm.com/docs/git-read-tree)
- [git-update-index](https://git-scm.com/docs/git-update-index)
- [git-write-tree](https://git-scm.com/docs/git-write-tree)
- [git-commit-tree](https://git-scm.com/docs/git-commit-tree)
- [git-update-ref](https://git-scm.com/docs/git-update-ref)
- [Git repository layout](https://git-scm.com/docs/gitrepository-layout)
- [Git environment and repository interfaces](https://git-scm.com/docs/git)

**Cairn inference:** these commands can be composed into a worktree-read-only
candidate publisher when every Git executable, environment, config, object
database, index, ref, and byte input is independently bound. Their manuals do
not jointly promise Cairn's crash/durability protocol. In particular,
`update-ref` visibility is not by itself proof of power-loss durability, and
reflog creation depends on ref/config state unless deliberately controlled and
verified. No effectful implementation may land until official guarantees or an
owner-approved causal probe close the required object/ref/journal ordering.

## Alternatives

| Choice | Metadata and permissions | Crash states | Race/concurrency | Recovery clarity | Product value | Qualified expertise still required | Decision |
|---|---|---|---|---|---|---|---|
| Same-handle in-place write | Keeps the existing file object, so it avoids replacement inheritance; complete metadata observability is still unproved | May leave partial, mixed, shortened, or extended bytes | Restrictive sharing can refuse competing opens but cannot erase pre-existing handles, mappings, filter drivers, or every same-user race | Ambiguous bytes require full before evidence and manual recovery; never auto-overwrite | Directly changes the live file | Exact Windows/filesystem, access/share, caching, crash, and recovery review | Not the default; retain only as a qualified recovery candidate for an exact already-open object |
| `ReplaceFileW` | Preserves Microsoft's explicit list, but replaces file identity and does not document every security property | One call narrows the transition, but unsupported write-through and errors 1175/1176/1177 leave distinct name/content states | Share/access failures, existing handles, hard links, oplocks, filters, and path substitution remain | Exact names, file IDs, streams, descriptors, and backup state must classify each documented outcome; no blind retry | Familiar live-file save semantics | Qualified local-NTFS metadata, permissions, concurrency, durability, and recovery review plus approved disposable proof | Leading future native candidate; still dark |
| Non-HEAD namespaced Git candidate | Does not touch a worktree target, its ACLs, streams, identity, or contents; does add protected Git objects and one private ref | Objects, temporary index/locks, journal revisions, and the ref can diverge across crashes; any reflog is unexpected and recovery-required | CAS refuses an occupied private ref, but another process, Git maintenance, object loss/corruption, ref publication rules, and GC remain relevant | An authenticated reservation plus exact ref/object inspection can report published, interrupted, conflict, or recovery-required without applying | Produces an exact reviewable commit while postponing live-file risk | Git executable/config/storage/durability review; no Windows permission expert is needed merely to leave the worktree untouched | **Selected for the first persistence slice, after the journal/publisher boundary is separately proved** |
| Owner/manual application | Cairn performs no write, so Cairn's authority is separated; the chosen editor/tool's metadata behavior is unverified | The external editor/tool owns crash states | The owner/tool may race with other writers and Cairn cannot enforce serialization | Recovery belongs to that tool and the owner; Cairn must not claim it is safe or verified | Available fallback but burdens beginners and weakens evidence | Human/tool-specific judgment; qualified help if permissions or recovery are material | Supported fallback, not the primary product path |

## Selected near-term architecture: non-HEAD namespaced candidate

The next effectful implementation task may publish a Git candidate only. It
must not apply that candidate to the live worktree.

This is still a protected `.git` effect. The proposed after text becomes
persistent local Git data, is reachable while the private ref exists, may
survive ref deletion in objects, backups, bundles, or clones, and has no secure
erasure promise. Wildcard refspecs, `push --mirror`, mirror clones, bundles, and
backup tools can expose a private namespace unless each path is proved to
exclude it. Cairn's existing push path must be causally locked to its exact
ordinary branch ref and must never enumerate or select `refs/cairn/**`.

Cairn must screen before and after text for credentials and disclose the exact
repository, common directory, object database, candidate ref, selected paths,
byte counts, local persistence, later-publication risk, and recovery choices.
Creating the objects or ref must be inside the exact task's ordinary local
authority; otherwise it receives its own just-in-time owner approval.

### Inputs and live authority

The publisher consumes only:

- a genuine Task 224 context and exact replacement proposal;
- a Main-owned tracked-text selection bound to canonical project/common-dir/
  object-database identity, exact `HEAD` and base tree, symbolic ref, raw real
  index bytes, clean worktree state, task/run/turn, Task Spec, Evidence Plan,
  consent revision, selected path spelling, index mode, before bytes, and after
  bytes;
- an exact authenticated reservation already sealed outside the project and
  Git directories; and
- a process-local, one-use publication grant composed after a fresh complete
  reinspection and spent with the reservation's `reserved/flushed` revision
  before the first object, index, lock, or ref write.

No serialized record, provider response, renderer value, matching digest,
environment value, path hint, Git object id, restart state, or journal byte can
mint or reconstruct the live grant.

### Authenticated reservation contract

The future broker must reuse Cairn's authenticated profile custody principles,
not invent an unsigned project-local record. A Main-only 32-byte key outside
the project, common directory, and object database authenticates canonical
bytes with domain-separated HMAC-SHA256. Immutable `O_EXCL` revisions form a
monotonic previous-digest chain joined to an authenticated high-water and
inventory anchor; stable readback and the supported directory-flush guarantee
must complete before publication authority is consumed.

The reservation freezes:

- schema, publisher, Git, serializer, and policy revisions; operation/run/turn
  ids; revision number; previous revision digest; and creation time;
- canonical project, worktree, Git directory, common directory, object
  database, reservation root, and private-index path identities, including
  volume/device/file identities and disjointness;
- trusted Git executable path, version, and digest; repository object format;
  every accepted environment/config value; and absence of alternates,
  quarantine, replacement refs, and unsafe ref backends;
- symbolic `HEAD`, exact `HEAD` commit/base tree, raw real-index digest and
  modes, complete ref/reflog inventory digest, clean/protected-state digest,
  and the absent target `refs/cairn/candidates/<operation-id>`;
- Task Spec, Evidence Plan, consent, context, response, selection, and plan
  canonical hashes;
- each ordered selected path, mode, before and after bounded full bytes and
  hashes, plus a handle-derived worktree-leaf observation: volume serial and
  file id, ordinary-file type, link count, reparse tag/absence, size,
  attributes, basic timestamps, stream inventory digest, and every
  non-privileged security/metadata digest required by the accepted selector;
  any required but unreadable fact refuses selection; and
- every expected blob/tree/commit id, the exact parent and tree, fixed
  author/committer names and emails, fixed author/committer timestamps and
  timezone offsets, encoding, exact message bytes, private ref, and expected
  no-reflog policy; and
- for every bounded expected blob/tree/commit id, whether it existed before
  reservation, its verified object type and canonical content digest, and its
  admitted transition (`pre-existing/no-op` or `absent/may-create`). This
  baseline makes later object attribution and loss/corruption classification
  deterministic without claiming ownership of a shared pre-existing object.

The operation id is Main-generated lowercase UUID text only
(`[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}`),
so the complete ref is bounded and contains no provider/renderer text. Before
reservation and again before CAS, Git's `check-ref-format` must accept the
exact ref and a complete case-insensitive ref inventory must prove absence of
the target and every loose/packed directory-file or prefix/descendant conflict
at `refs/cairn`, `refs/cairn/candidates`, and the target. Any alias or namespace
collision refuses.

All expected object ids must be computed and cross-checked before the first
repository object write. The private index is sensitive operation evidence: it
lives only in the authenticated reservation root, is regular/no-link,
bounded, exact-permission, disjoint from project/Git roots, and is named in the
inventory. A missing, replaced, linked, stale, or extra index/lock file is a
classification event, never automatic cleanup authority.

### Git effect and exact admitted protected delta

Only after `reserved/flushed` may the one-use publisher:

1. revalidate the absolute trusted Git executable, complete environment,
   canonical repository/common-dir/object database, reservation, real index,
   ref/reflog inventory, and every selected/protected fact;
2. refuse filters, text conversions, hooks, fsmonitor/visibility bits, index
   stages, aliases, submodules, special modes, dirty/untracked state, and every
   project/config/environment-selected execution seam;
3. write exact proposal blobs from standard input with filters disabled and
   without `--path`;
4. populate only the authenticated private index from the exact base tree,
   update exact literal selected entries with existing `100644`/`100755`
   modes, and write one expected tree;
5. create the exact expected commit with the frozen parent, identity, dates,
   timezone offsets, encoding, and message;
6. verify every object and prove the commit contains exactly the expected base
   parent, tree, selected diff, bytes, and modes;
7. revalidate ref absence, then CAS-create the private ref from absence to the
   exact commit without requesting reflog creation; and
8. seal and read back a `published/verified` journal revision only after the
   ref, object closure, no-reflog rule, and protected-state comparison succeed.

V1 admits only Git's **files** ref backend, independently proven before
reservation and before CAS. The only admitted repository deltas are newly
absent expected objects from the frozen per-OID baseline, one new loose private
ref file containing the exact expected OID, and its exact transient `.lock`
during CAS. A pre-existing expected object is an admitted no-op, not an
operation-owned delta. Reftable, packed creation/update of the target, an
unexpected backend, reflog creation, or any other backend artifact refuses.
`HEAD`, its symbolic branch, every pre-existing ref/reflog/object/config byte,
the real index, worktree identities/contents/modes, and every other protected
path must remain unchanged. No broad claim that “all protected state” is
unchanged is made.

The local `commitCandidateExactPaths` at `core/src/serial.ts:3334` is **not**
security evidence for this route. It uses filter-aware `hash-object --path` at
lines 3467–3469, temporarily installs its generated index over the real index
at line 3522, and CAS-updates `HEAD`. Only its general blob/tree/commit/CAS
mechanics are informative; none of its real-index, filter, or `HEAD` behavior
may be reused here.

### Ordered states and restart classification

The authenticated journal state machine is:

`planned (memory only)` → `reserved/flushed + live grant spent` →
`object-writing` → `candidate-verified/ref-absent` → `CAS-publishing` →
`published/verified`.

At each boundary the immutable revision records the exact observed artifact
inventory. Git objects, private index and lock files, candidate ref/backend
locks, any unexpected reflog, journal revisions, and the inventory anchor are
all part of classification. Git ref visibility is a process-crash fact,
not a power-loss guarantee. Until official guarantees or an owner-approved
causal power-cut probe establish exact object→ref→journal durability for the
supported Git/filesystem/config matrix, implementation remains blocked.

Restart uses this precedence:

| Observation | Classification | Automatic action |
|---|---|---|
| No authenticated reservation and no candidate ref/object/private-index/lock artifact attributable to the operation | Absent | None |
| Any attributable ref/object/index/lock artifact with no exact authenticated reservation | Recovery required | Read-only explanation only |
| Missing, invalid, truncated, replayed, conflicting, or non-current reservation/anchor/inventory | Tamper or custody failure | Recovery required |
| Exact `reserved/flushed` lineage, target ref absent, and only an exact allowed prefix of recorded artifacts | Interrupted before publication | Record/display interruption; never resume or clean automatically |
| Target ref absent but objects/index/locks differ from the recorded prefix, or expected objects are missing/corrupt | Conflict | Recovery required |
| Exact target ref points to the exact commit but the journal is not exact `published/verified` | Published but unacknowledged | Recovery required; read-only inspection may explain the candidate |
| Exact `published/verified` lineage, ref, object closure, no-reflog rule, and unchanged non-admitted state | Candidate ready for review | Rehydrate the read-only candidate card only |
| Ref has another value; ref/reflog/backend inventory is unexpected; worktree/index/`HEAD`/existing ref/config/protected state changed; or the published object later disappears/corrupts | Conflict or later drift | Recovery required; never apply or recreate |

Evidence never reconstructs a plan/grant, resumes, retries, rolls back, deletes,
prunes, overwrites, or cleans. Deleting a candidate ref, applying or
cherry-picking it, creating a branch, repairing custody, or discarding objects
is a new owner-visible operation with its own authority and recovery plan.

### What “candidate ready” means

A namespaced candidate is not a completed live-file change. It can truthfully
be reported only as **candidate ready for review**. It may become verified only
inside a separately proved disposable verifier environment. It becomes
integrated only after a separately approved, qualified application path. The
Builder's claim, commit, and private ref never make the original task DONE.

This does not by itself solve Q10, finalization, or verifier containment. It
only removes worktree mutation from the Builder proposal/persistence step.

## Future Windows-native application candidate

`ReplaceFileW` is retained for qualification because it has a stronger
documented metadata merge than plain rename and is Microsoft's named
document-update alternative to TxF. It is not selected for production yet.

Initial scope proposed for review:

- Windows 11 first, then explicitly tested supported Windows releases;
- local NTFS only;
- direct regular file, one hard link, no reparse tag;
- non-sparse, non-offline, non-cloud-placeholder, non-EFS file at first;
- no named alternate stream at first unless complete preservation is proved;
- ordinary non-elevated token only; inability to read any required security
  fact refuses rather than enabling a privilege;
- same-volume private replacement and evidence roots whose containment and
  security descriptors are independently proved; and
- zero ignore flags.

That intentionally refuses most unusual states. A qualified reviewer may
reject even this scope.

## Qualified reviewer packet

The reviewer must answer these questions before code can be production-eligible:

1. Does `ReplaceFileW` with zero ignore flags preserve the complete required
   security posture for the accepted local-NTFS class, including owner, group,
   DACL, SACL, mandatory integrity, resource attributes, EFS, compression,
   alternate streams, object id, sparse/offline state, timestamps, and
   filter-managed properties? Which facts are guarantees and which need a
   pre/post refusal check?
2. Can the app prove absence or exact equality of every accepted metadata
   family without enabling `SeSecurityPrivilege`, backup/restore privileges,
   administrator rights, or another ambient authority? If not, should the
   route refuse the file class entirely?
3. What exact `CreateFileW` desired-access/share/flag combination safely binds
   the replaced file, replacement, parent directory, and evidence before the
   call? What races remain with existing handles, mappings, oplock breaks,
   antivirus, cloud/filter drivers, and same-user processes?
4. How are documented partial failure states 1175, 1176, and 1177 identified
   without guessing, and which names/file IDs/stream inventories must be stored
   for manual recovery?
5. With `REPLACEFILE_WRITE_THROUGH` unsupported, what durability claim is
   honest for local NTFS? Is a directory/volume flush possible and appropriate
   without elevation, and what device/cache caveats remain?
6. Does an optional backup file create a second sensitive copy, inherit weaker
   access, or leave ambiguous cleanup? Is omitting it safer despite the 1176
   failure state? Who may authorize recovery or deletion?
7. Are EFS, compressed, sparse, integrity-stream, deduplicated, offline,
   cloud-placeholder, ReFS, FAT/exFAT, SMB/network, Dev Drive, and unknown
   filter cases categorically refused in v1?
8. Is same-handle in-place writing acceptable only as a human-approved recovery
   action after an interrupted replacement, or should it remain unsupported?

The reviewer is not asked to approve Cairn in general. They review one named
helper revision, supported OS/filesystem matrix, access mask, metadata schema,
state machine, and disposable test plan. The qualified reviewer must approve
that exact helper and matrix **before** the probe runs and must interpret the
resulting transcript afterward. Owner approval and additional AI review are
not substitutes for that expertise.

## Disposable proof matrix requiring later owner approval

The following changes permissions or creates security-sensitive filesystem
fixtures. It must not run under this task. Immediately before a later run,
Cairn must show the exact temporary root, APIs/helper digest, effects, needed
privileges, cleanup, and recovery, then obtain approval for that exact run.

For each supported Windows/filesystem version, use a disposable root outside
all real projects and profiles. Create independent cases for:

- explicit allow/deny and inherited DACLs; owner/group; SACL/audit; low/high
  integrity where permitted;
- named streams, object id, EFS, compression, sparse ranges, offline/cloud
  attributes, timestamps, read-only/system/archive attributes, and a file with
  an unknown/unsupported property that must refuse;
- one and multiple hard links; file/directory reparse points; case aliases;
- open read/write/delete handles, mapped files, sharing violations, oplock
  grant/break/refusal, and a cooperating mutation at every transition;
- every documented `ReplaceFileW` success and failure class, including forced
  1175/1176/1177 where a safe harness can cause it;
- process termination and machine/VM power cuts before and after replacement,
  evidence flush, ref/journal transitions, and UI receipt delivery; and
- exact pre/post backup-stream, security-descriptor, file-id, stream, attribute,
  content, directory, and volume observations.

Tests must run in a disposable VM or equivalent snapshot when they manipulate
privileges, audit policy, EFS, filters, power state, or filesystem configuration.
Cleanup is exact-root-only and occurs only after the transcript and recovery
state are sealed. A failed or incomplete probe leaves the production path dark.

## Fixed owner-visible approval packets

Before a candidate publication that is not already covered by the exact local
task authority, Cairn shows:

- canonical project, Git common directory, object database, and exact new
  `refs/cairn/candidates/<operation-id>` target;
- selected path names, per-file and total before/after byte counts, exact
  context/response/plan hashes, and the fact that after text is stored in Git;
- the canonical Cairn profile reservation root and the fact that its
  authenticated journal stores a second bounded copy of both before and after
  source bytes, its file-security custody, local backup/sync exposure,
  retention/deletion policy, and the same no-secure-erasure limitation;
- no worktree, real-index, `HEAD`, branch, existing-ref, or live-file change;
- persistence, backup/bundle/mirror/wildcard-push exposure, garbage-collection,
  and secure-erasure limitations; and
- recovery choices as separate effects: inspect only, delete the private ref,
  apply/cherry-pick, or leave it retained. Approval publishes only this one
  candidate and authorizes none of those recovery/application actions.

Before any future **real-project native application**, Cairn separately shows:

- every exact target file and before/after hash and byte count;
- the native helper path, SHA-256, revision, compiler provenance, supported OS
  build, volume and filesystem type/features;
- every requested access mask, share mode, flag, privilege, handle lifetime,
  and the exact zero-ignore `ReplaceFileW` call;
- metadata families proved, refused, or still unknown, including owner/DACL/
  SACL/integrity/EFS/compression/streams/reparse/link/filter state;
- whether a backup is created, where its sensitive duplicate bytes live, its
  security custody and retention/deletion authority;
- likely local time/storage cost and any installer/toolchain effect;
- documented success and 1175/1176/1177/other failure states; and
- the manual recovery operator, preserved evidence, no-auto-retry rule, and
  rollback/cleanup choices. The owner approves one exact write only after the
  qualified reviewer has accepted the helper/matrix/transcript.

## Owner decisions at later concrete boundaries

The owner must separately approve:

- installing/building a native helper or toolchain if the required pinned
  compiler is not already part of the repository's reviewed build;
- enabling or using any privilege, changing a disposable ACL/SACL/integrity/
  EFS/compression state, or running a VM power-cut proof;
- sending project text to a Builder provider;
- publishing the non-HEAD namespaced Git candidate when the task's ordinary local-work
  authority does not already cover that exact repository effect;
- applying, cherry-picking, checking out, deleting, or recovering a candidate
  when it can overwrite or transform valuable work; and
- any real-project native application after qualified review.

Approval for one probe, one candidate, or one file is not blanket approval.

## Task sequence from here

1. **Authenticated broker/reservation kernel, inert only.** One fake closed
   handler, immutable journal/high-water/inventory state machine, and one-use
   in-process test grant; no Git object, index, lock, ref, or worktree effect.
2. **Owner-approved disposable Git durability qualification.** A non-product,
   exact temporary repository/profile fixture exercises every
   object→private-index→ref→journal/anchor cut, including process and approved
   VM power cuts, under one pinned Git/files-backend/filesystem/config matrix.
   It needs its own owner risk packet and may not use a real project or profile.
3. **Worktree-read-only selector plus non-HEAD Git object/ref publisher.** It
   may become effectful only after Tasks 1–2 pass. No provider, verifier, App
   route, native helper, real-index, `HEAD`, branch, or worktree write.
4. **Verifier vocabulary and hard isolated disposable execution.** Still
   blocked by Task 223's network escape until separately solved.
5. **Tool-free Builder transport and normal route integration, dark.** Exact
   file-data/cost approval remains separate.
6. **Live Q10 calibration, one separately approved call at a time.** Activation
   remains empty until the exact tuple passes.
7. **Optional native application helper.** Only after the qualified packet and
   owner-approved disposable matrix pass. Manual application remains available
   if this step never qualifies.

This sequence lets the intercom advance without pretending that automatic
worktree mutation is already safe.

## STOP conditions

Stop a later implementation before effect if:

- proposal data can reach `HEAD`, the real index, or the worktree;
- a namespaced candidate can be treated as task DONE or automatically applied;
- a candidate object, private index, lock, or ref can be written before an
  exact authenticated `reserved/flushed` revision consumes its live grant;
- Git filters, hooks, text conversions, environment, PATH, project config, or
  a renderer/provider value can influence the candidate effect;
- a wildcard/mirror push, clone, bundle, backup, refspec, or existing Cairn
  push route can export `refs/cairn/**` without a separate disclosure;
- a native helper accepts a filesystem, metadata family, privilege, reparse/
  link topology, filter, or failure state outside the qualified matrix;
- an API's documentation does not promise the relied-on property and no
  approved causal proof/qualified judgment closes it;
- evidence bytes can recreate a plan, grant, retry, rollback, overwrite, or
  cleanup action;
- a crash or third state can trigger automatic mutation;
- permission/security probing would occur without exact owner approval or the
  required qualified person;
- a secret, real project, profile, provider, network, dependency, OS setting,
  or valuable file would enter an unapproved probe; or
- recovery is unclear.

## Decision summary

Task 225's STOP was correct: portable rename was not a safe writer. The better
next move is not to keep polishing that writer. Cairn will first build the
authenticated, inert reservation kernel, then—only after its Git durability
boundary is closed—preserve Builder output under one exact non-HEAD private
candidate ref while leaving the worktree untouched. Application remains its
own owner-visible effect. `ReplaceFileW` is the leading Windows-native candidate
for that future effect because Microsoft documents a meaningful metadata
merge, but it remains dark until a qualified reviewer and owner-approved
disposable matrix establish the exact supported boundary.
