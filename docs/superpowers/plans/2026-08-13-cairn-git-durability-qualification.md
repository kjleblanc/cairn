# Cairn disposable Git durability qualification plan

**Status:** pre-approval, dark, and non-effectful. Task 228 may prepare pure
planning/test code from this document, but it may not create a fixture root,
initialize a repository, invoke Git, kill a child, manipulate a VM, or write a
Git object/index/lock/ref/journal until the exact owner packet is complete and
approved.

## Decision in plain language

Cairn wants to preserve a Builder proposal without touching the owner's live
files. The proposed next storage place is one private Git commit and ref. Before
building that publisher, Task 228 must prove that a very specific Git/Windows/
NTFS setup leaves an honest, classifiable state when the process or machine dies
between the object, ref and journal writes.

This is a qualification, not a publisher. It uses fixed synthetic text in a
throwaway repository. A successful process-kill test is useful but is not a
power-loss proof. A GO decision requires a real disposable VM/snapshot power-cut
matrix and review by a qualified filesystem/durability person. If either is
missing, Task 228 stops and the publisher stays blocked.

## Read-only inventory observed on 2026-08-13

The current host has:

- Git for Windows `2.52.0.windows.1`;
- candidate executable
  `C:\Program Files\Git\mingw64\bin\git.exe` with SHA-256
  `FC0F1CAE1304FCDCF4D0749F421C5ED21471EFC856301F92F56D4B844BE84363`;
- the `C:` fixed volume reported as NTFS by .NET `DriveInfo`; and
- no discoverable Hyper-V PowerShell module, `VBoxManage`, VMware `vmrun`, or
  Windows Sandbox executable. WSL is present, but it is not an ungraceful
  machine-power-cut facility and is not accepted as one.

This inventory is not approval and does not make the host a supported matrix.
The Git executable and volume must be re-hashed/re-inspected inside the eventual
approved VM immediately before the probe.

## Primary Git facts used by the plan

Official Git documentation says:

- [`git hash-object --stdin --no-filters`](https://git-scm.com/docs/git-hash-object)
  hashes the exact supplied bytes while explicitly refusing path-selected
  filters;
- [`git init`](https://git-scm.com/docs/git-init) can freeze SHA-1 object format
  and the files ref backend;
- [`git update-ref`](https://git-scm.com/docs/git-update-ref) accepts an all-zero
  old OID to require an absent target ref and updates an individual ref
  atomically from the process-visible perspective; and
- [`core.fsync` and `core.fsyncMethod`](https://git-scm.com/docs/git-config)
  select which repository components Git hardens and the strategy used. The
  documentation also warns that components not hardened may be lost after an
  unclean shutdown.

Those facts do not jointly prove Cairn's object-to-ref-to-journal protocol.
`update-ref` success and an `fsync` return do not alone prove that a disk,
filesystem, hypervisor cache and later journal survived power loss. The approved
causal matrix exists to answer that narrower question.

## Frozen synthetic operation

The pure planner owns these values; provider/renderer/project bytes cannot
replace them:

- operation id: `22800000-0000-4000-8000-000000000001`;
- candidate ref:
  `refs/cairn/candidates/22800000-0000-4000-8000-000000000001`;
- one printable-ASCII path: `candidate.txt`;
- ordinary mode: `100644`;
- seed content and candidate content: fixed short UTF-8, LF-terminated strings
  embedded in the reviewed planner;
- fixed author/committer name and `example.invalid` email;
- fixed UTC author/committer seconds and `+0000` timezone;
- fixed UTF-8 commit messages and encoding; and
- SHA-1 object format only.

The planner computes the seed and candidate blob, tree and commit object IDs
from raw Git object bytes in memory, then binds them in a canonical SHA-256 plan.
The eventual harness must ask pinned Git to compute the same IDs without `-w`
and refuse before any object write if one byte or OID differs.

## Safe pre-approval files

Task 228 may prepare only:

- a pure exact-key planner/OID calculator under `app/tests-qualification/`;
- pure in-memory tests and causal parser/canonical mutants;
- a separate qualification-only TypeScript configuration;
- an effect harness source that is never imported by product/test defaults and
  cannot run without an exact reviewed manifest; and
- this plan and the task approval/report records.

Pre-approval checks may compile pure source into ignored repo-local build output.
They must not invoke Git or create any repository, journal, external root,
process-kill target, VM, snapshot or virtual disk.

## Exact approved fixture shape

The actual root does not exist yet. The final packet must name it exactly. The
required shape is one direct child of the dedicated volume root; nested roots,
DOS device aliases and alternate spellings refuse. The shape is:

```text
<dedicated-local-NTFS-virtual-disk>\cairn-task228-<uuid>\
  owner.json
  repo\
    .git\
    candidate.txt
  custody\
    key
    private-index
    journal\
    high-water\
    inventory\
    anchors\
  transcript\
```

The parent and root are atomically created by the approved harness and bound by
canonical path plus volume/file identity. The dedicated virtual disk/root must
be disjoint from every real project, profile, Git directory/common directory/
object store, OS temp path, cloud/backup/sync root and shared folder. No host
folder passthrough is admitted.

The fixture contains only the fixed synthetic text. It has no remote. It must
have SHA-1 objects, files refs, one ordinary seed branch/commit, a clean ordinary
worktree/index, no hooks, attributes, filters, text conversions, submodules,
alternates, quarantine, replacement refs, fsmonitor, maintenance, GC, reflogs,
packed refs, reftable, sparse state or extra objects.

## Pinned process boundary

Every Git call uses the exact reviewed absolute executable and a newly composed
environment. The final manifest must bind every retained environment variable;
everything else is removed or given a fixed inert value. In particular:

- system/global config is disabled and HOME/profile points only inside the
  fixture;
- terminal prompting, credential interaction, editor, askpass, tracing,
  optional locks and replacement refs are disabled or fixed; `--no-pager` is
  present on every argv and no `GIT_PAGER`/`PAGER` program is supplied;
- hooks point to a fixed empty directory under custody;
- `core.logAllRefUpdates=false`, `core.useReplaceRefs=false`,
  `core.fsmonitor=false`, automatic maintenance and GC are disabled;
- `i18n.commitEncoding=UTF-8` is explicit so `commit-tree` cannot inherit a
  fixture config that adds a different encoding header;
- `core.fsync=all` and `core.fsyncMethod=fsync` are explicit candidates to be
  approved and causally tested, not assumed guarantees; and
- `core.createObject=link` preserves Git's no-overwrite check for absent object
  creation and is itself part of the exact NTFS qualification rather than a
  cross-platform assumption; ref/packed-ref lock retry timeouts are zero; and
- the private `GIT_INDEX_FILE` is the exact custody path and is never the
  repository's ordinary index.

No shell command string, PATH lookup, alias, config include, remote helper,
credential helper, diff/textconv/filter driver, hook, submodule helper or
project-selected executable may run.

Each frozen command record additionally binds the fixture-internal repository
working directory, direct absolute-binary/no-shell execution, a wholly replaced
environment, one foreground non-detached child with piped standard streams, a
10-second timeout, exact stdin bytes, exit code `0`, exact stdout bytes
(including Git's final LF on OID output), exact empty stderr, and the complete
admitted write set. Empty output is the exact zero-byte string, never an
unchecked/null expectation.

The closed candidate command vocabulary is:

1. three non-writing `hash-object -t <type> --stdin --no-filters` cross-checks
   for the candidate blob, raw tree and raw commit bytes;
2. `hash-object -w -t blob --stdin --no-filters`, followed by exact `cat-file`
   verification;
3. `read-tree -i <base-tree>` into the private index;
4. `update-index --cacheinfo` without `--add`, so a missing base entry refuses;
5. `write-tree` and exact raw-tree verification;
6. `commit-tree` with every identity/time/message byte frozen, followed by exact
   raw-commit verification;
7. zero-old-OID `update-ref --no-deref`; and
8. exact `show-ref --verify --hash` readback.

The three object-writing commands admit only their exact final loose-object
paths plus at most one
`objects\\<expected-two-hex-fanout>\\tmp_obj_[A-Za-z0-9]{6}` temporary artifact
per command. A second match, another basename, or residue outside that exact
fanout parent is recovery-required. `write-tree` also admits the exact private
index and its `.lock`, because Git may rewrite the index's cache-tree extension;
that before/after index transition is inventoried. Read-only cross-check and
object/ref verification commands admit no writes.

## Ordered qualification protocol

The effect protocol is:

1. atomically claim and inspect the external fixture root;
2. create the deterministic seed repository and freeze its exact baseline;
3. precompute and cross-check every candidate OID without writing it, using the
   frozen no-filter direct commands above, then
   create the exact empty candidate object fanout directories and empty
   `refs/cairn/candidates` hierarchy as part of the frozen setup baseline;
4. create and stable-read an authenticated `reserved` revision, high-water,
   inventory and anchor; establish the approved directory-flush boundary;
5. consume one process-local qualification authority;
6. write and verify the candidate blob(s) with exact standard input and no
   filters;
7. populate only the private custody index from the exact base tree, replace the
   one fixed entry, write and verify the candidate tree;
8. create and verify the exact deterministic candidate commit;
9. seal `candidate-verified/ref-absent`, re-inspect every protected fact and the
   complete case/prefix ref namespace;
10. seal `CAS-publishing`, then create the one loose candidate ref from absence
    with an all-zero old OID;
11. re-read the exact ref/object closure and prove there is no reflog, packed ref
    or non-admitted delta; and
12. seal and stable-read `published/verified` plus the final transcript.

The authenticated record immediately before each effect names the exact next
effect and complete artifact inventory. Every record is create-only, canonical,
HMAC-authenticated and linked through monotonic high-water/inventory/anchor
state. The process-local authority is spent before the first candidate object,
index, lock or ref effect. Restart evidence can inspect only and can never mint,
resume, retry, clean, repair, publish or delete.

## Cut matrix

Both the ordinary child-process matrix and the separately approved VM power-cut
matrix cut immediately before and after:

- each reservation/journal/high-water/inventory/anchor create, file hardening,
  directory hardening and stable readback;
- each candidate loose-object create/hardening and object verification;
- private-index creation, update, hardening and tree verification;
- commit creation/hardening and closure verification;
- the ref-absence/namespace recheck;
- ref lock creation, ref replacement/visibility and post-CAS verification;
- final journal/anchor hardening and transcript receipt.

The process matrix uses a real child termination, never a returning callback.
The power matrix uses an ungraceful VM power-off at an externally controlled
barrier, then boots a separate read-only inspector first. Graceful guest
shutdown, process kill, suspension, WSL termination and host cache flush are not
substitutes for a power cut.

## Restart classification

Inspection precedence is:

- no reservation and no attributable artifact: `absent`;
- exact reserved lineage and only its exact recorded prefix with no ref:
  `interrupted-before-publication`;
- exact target ref and closure without exact final journal:
  `published-unacknowledged`;
- exact final lineage, ref, closure, no-reflog rule and unchanged non-admitted
  state: `candidate-ready-in-fixture`;
- any missing/corrupt/replayed record, unexpected/missing object, index/lock/ref
  mismatch, reflog/backend/config/protected drift, or third state:
  `recovery-required`.

Every state is evidence only. No automatic action follows. Even
`candidate-ready-in-fixture` qualifies only the exact test matrix; it is not a
real candidate, task verification, integration, application or DONE.

## Exact owner packet status

The packet is **not ready for approval** because no suitable VM/power-cut
facility or qualified filesystem/durability reviewer has been identified. The
final packet must fill all of these fields without placeholders:

- hypervisor, guest OS build and snapshot identifier;
- dedicated virtual disk controller/cache mode, volume identity, NTFS version/
  features and exact absent fixture root;
- pinned guest Git and Node absolute paths, versions, SHA-256 digests and build
  provenance;
- complete environment/config/protocol revisions;
- exact operation/ref, synthetic path/text byte counts and all expected OIDs;
- every process and power cut point and expected classification;
- expected object/index/lock/ref/journal/transcript files, maximum bytes and
  estimated time;
- local persistence, snapshot/backup exposure and no-secure-erasure limitation;
- exact success cleanup target and whether success cleanup is included;
- retention/manual-recovery operator for every interrupted or
  recovery-required state;
- qualified reviewer identity/scope and the fact that they must review the
  matrix before the run and interpret the transcript afterward; and
- explicit authorization for this one matrix only, with no install, privilege,
  permission, network, provider, project, profile, publication, application or
  host-power authority implied.

Expected direct monetary/model/network cost is zero. Local time and storage
cannot be promised until the VM/disk exists; the target envelope is a few hours
and less than 100 MiB excluding the VM image, but the final packet must replace
that estimate with observed available capacity and a bounded run count.

## Cleanup and recovery

Clean-success deletion may happen only if it is named in the exact approval,
the final transcript is sealed, and root/parent/owner-marker/volume identities
still match. The harness removes only that one exact disposable root and verifies
absence. Snapshot deletion, VM deletion or virtual-disk deletion are separate
effects and are not implied.

Interrupted, published-unacknowledged, recovery-required, identity-drifted or
ambiguous roots are retained. The inspector reports the exact artifacts and
plain-language owner choices. It never auto-cleans on startup. Deleting a ref,
objects, index, root, snapshot, VM or virtual disk requires a later exact owner
decision and recovery plan.

## GO and STOP

GO means all Task 228 checks pass on the exact approved VM/Git/NTFS/files matrix
and the qualified reviewer accepts the transcript. GO only lets a later task
design a still-dark publisher for that exact matrix.

STOP before any effect, or stop the qualification afterward, when approval,
the VM/power-cut facility, qualified review, directory/disk flush semantics,
binary/config isolation, object/ref attribution, exact classification, or safe
recovery is missing; when an unexpected artifact/executable/config/backend
appears; or when any real project/profile/data/secret/permission/network/provider
or valuable file could enter. Process-only success remains STOP for publisher
eligibility.
