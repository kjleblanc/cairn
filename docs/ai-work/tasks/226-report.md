# Task 226 report - freeze the native patch safety boundary

**Lane:** A (the main checkout). **Base commit:** `89f18d8`.
**Brief claim commit:** `e0c1a33`.

## Outcome

Task 226 is **DONE as an offline architecture decision**. It authorizes no
writer, permission change, Git publication, native probe, or real-project
mutation.

The safest practical direction is now split into three separate gates:

1. build an inert authenticated reservation/journal kernel that cannot write
   Git objects, refs, the index, or the worktree;
2. qualify exact Git object-to-private-ref-to-journal crash durability on a
   disposable repository/profile under a separate owner-approved test; then
3. only if both pass, publish one worktree-read-only candidate commit under a
   create-only `refs/cairn/candidates/<uuid>` ref.

That candidate does not touch the live worktree, real index, `HEAD`, current
branch, or any existing ref. It is still a protected `.git` write and a second
local copy of source text, so the exact repository, paths, byte counts,
reservation copy, retention, backup/bundle/mirror/push exposure, lack of secure
erasure, and recovery choices must be disclosed. It is only “candidate ready
for review,” never applied, verified, integrated, or task DONE.

Automatic worktree application remains a separate qualified security boundary.
Microsoft's `ReplaceFileW` is the leading future Windows/local-NTFS candidate
because it documents a meaningful metadata merge, but it replaces file
identity, has an unsupported write-through flag, does not promise every
security/storage property, and has distinct partial failure states. No native
implementation or disposable permission/power-loss probe may begin until a
qualified application-permission/filesystem-security reviewer approves the
exact helper, platform/filesystem matrix, access/share/flags, metadata policy,
test plan, and recovery semantics. The owner must then approve that exact
security-sensitive probe or real-file action just in time.

## Files touched

- `docs/ai-work/tasks/226-brief.md` was created and committed alone at
  `e0c1a33` to claim Task 226.
- `docs/superpowers/specs/2026-08-13-cairn-native-patch-safety-design.md`
  records the primary-source facts, four-way comparison, selected architecture,
  authenticated state machine, crash classifications, disclosures, STOP rules,
  and qualified-review packet.
- This report records the completed design result.
- `docs/ai-work/LOG.md` receives one truthful Task 226 row.

No Core, App, package, activation, route, credential, profile, project-source,
permission, dependency, or operating-system file was touched.

## Check results

### `c1` - the platform facts are exact and sourced: PASSED

The decision cites Microsoft primary documentation for `ReplaceFileW`,
`CreateFileW`, `WriteFile`, `SetEndOfFile`, `FlushFileBuffers`, handle/file-id
and security-descriptor inspection, streams, reparse points, hard links,
oplocks, and TxF deprecation. It records the target and replacement access/share
behavior separately, the explicit preserved-property list, result file-id rule,
zero-ignore policy, unsupported `REPLACEFILE_WRITE_THROUGH`, and exact
1175/1176/1177 states. Documented facts, Cairn inferences, and facts requiring
qualification are labelled separately.

The selected Git path cites official Git documentation for exact unfiltered
blob creation, private-index mechanics, tree/commit creation, deterministic
commit inputs, create-only compare-and-swap refs, environment/repository layout,
and alternates. The document expressly says those individual commands do not
jointly prove Cairn's power-loss protocol.

### `c2` - alternatives are compared at the real risk boundary: PASSED

The four-way table evaluates same-handle writing, `ReplaceFileW`, a non-HEAD
namespaced Git candidate, and owner/manual application across metadata and
permissions, crash states, race/concurrency, recovery, product value, remaining
expertise, and disposition. Manual application is described honestly as Cairn
authority separation with unverified editor/tool write safety, not as a proof.

The selected path minimizes current authority: it leaves every live target
file and its security metadata untouched, while explicitly accounting for its
own Git object/ref and source-persistence effects.

### `c3` - the transaction and recovery contract is bounded: PASSED

The design freezes a domain-separated HMAC-authenticated, monotonic reservation
outside the project/Git roots before any Git effect. It binds the exact
repository/common-dir/object-store/index/ref state; Git executable/config;
Task Spec, Evidence Plan, consent and proposal; per-file before/after bytes,
hashes, modes and handle-derived metadata; deterministic object/tree/commit/ref
inputs; per-object preexisting/new baseline; private index; and exact admitted
Git deltas. A process-local one-use grant is consumed only after the
`reserved/flushed` revision.

The ordered states and precedence cover absent, orphan artifact, custody/tamper,
allowed-prefix interruption, object mismatch/loss, exact-ref-but-unacknowledged,
ready, and later drift/conflict. Evidence may inspect and explain only. It can
never mint, resume, retry, roll back, delete, prune, overwrite, clean, apply, or
declare DONE. The publisher remains blocked until a separate approved Git
durability qualification closes object/ref/journal power-loss ordering.

### `c4` - the qualification gate is owner-visible and actionable: PASSED

The packet asks a qualified reviewer to decide the exact Windows/filesystem,
metadata, privilege, handle/share/oplock/filter, backup, failure and durability
boundary for one named helper revision. It states that the reviewer must approve
the helper/matrix before the probe and interpret the transcript afterward;
owner approval or more AI review cannot substitute.

Separate fixed approval packets disclose a future candidate publication and a
future real-project native application. The latter includes exact files,
helper hash, platform/filesystem, access/share/flags/privileges, metadata and
refusals, backup exposure, cost, documented failure states and manual recovery.
No such action occurred in Task 226.

### `c5` - product and permission state remain unchanged: PASSED

Only documentation and task records changed. Source, packages, App/IPC/UI,
legacy/Q9 behavior, activation, routes, profiles, credentials, providers,
network, dependencies, permissions and OS configuration remain unchanged. No
Git candidate, private ref, native helper, disposable probe or real-file write
was created.

### `c6` - records and independent review are complete: PASSED

Three independent read-only adversarial reviews challenged the initial design.
They found and then verified repairs to the `ReplaceFileW` access/failure
account, Git primary sourcing, reservation-before-effect ordering, deterministic
commit fields, per-file metadata and per-object baselines, ref namespace/backend
rules, exact protected deltas, crash precedence, private-index custody,
reservation-copy and external-publication disclosure, qualified-review timing,
and future task ordering. All three final reviews returned CLEAR on the stable
substantive design (SHA-256
`0A22CE52ADA8F4A57CB9D9DBD50794DBB423C52B8ED98E429461B67810099A96`).
The later status-only change marks that reviewed design accepted.

## Exact commands and observed results

From the repository root:

`Get-FileHash -Algorithm SHA256 -LiteralPath 'docs\superpowers\specs\2026-08-13-cairn-native-patch-safety-design.md' | Select-Object -ExpandProperty Hash`

Result for the stable substantive design reviewed by all three agents:
`0A22CE52ADA8F4A57CB9D9DBD50794DBB423C52B8ED98E429461B67810099A96`.
After the status-only acceptance edit, the final document hash is
`ED9713064FE40F264452FFE9C88023D39793DBD09405850CB080FC8B508C09F5`.

`git diff --check`

Result: exit 0, no whitespace diagnostic.

`git diff --no-index --check -- NUL docs\superpowers\specs\2026-08-13-cairn-native-patch-safety-design.md`

Result: exit 1 because the new file differs from `NUL`; no whitespace
diagnostic was emitted.

`rg -n "builder-workspace|builder-candidate|ReplaceFileW|CreateFileW" core app --glob '!dist/**' --glob '!dist-unit/**'`

Result: exit 1, no match. No Task 226 effect or native API entered Core or App.

`git diff --name-only; git ls-files --others --exclude-standard`

Result before records: no tracked diff; only the new architecture document was
untracked.

`git diff --cached --check; git diff --cached --name-status; git status --short --branch; git diff --name-status`

Result after exact-path staging: cached whitespace check exited 0; the index
contained exactly:

- `M docs/ai-work/LOG.md`
- `A docs/ai-work/tasks/226-report.md`
- `A docs/superpowers/specs/2026-08-13-cairn-native-patch-safety-design.md`

Status showed exactly those three staged paths on `main`, ahead of
`origin/main` by 166 commits. The unstaged name-status output was empty. The
brief remains isolated in claim commit `e0c1a33`.

## How to try it

There is intentionally no new product behavior to try. The useful result is a
plain-language decision document a maintainer or qualified reviewer can inspect.
Do not run a native probe, create a candidate ref, or apply a file based on this
task alone.

## Limitations and next safe step

The next task is the inert authenticated broker/reservation kernel only. After
that, a separate owner-approved disposable Git durability qualification must
pass before an effectful candidate publisher may be implemented. Verifier
execution remains blocked by Task 223's network escape, and Q10 live calibration
remains later and separately approved one call at a time.

Native application may never qualify. If it does not, a private candidate plus
manual application remains the honest fallback. No provider/model/credential/
network/paid call, dependency, permission change, Git candidate/ref, external
write, publication, push or deployment occurred. The milestone did not move.

**Disposition: DONE — Cairn now has a primary-source-backed, independently
reviewed least-authority architecture and a bounded qualified gate; no writer
or risky effect was authorized or implemented.**
