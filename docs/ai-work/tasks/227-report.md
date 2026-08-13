# Task 227 report - build the inert authenticated reservation kernel

**Lane:** A (the main checkout). **Base commit:** `1e60b11`.
**Brief claim commit:** `1b88462`.

## Outcome

Task 227 is **DONE as a dark, offline proof only**. Cairn now has a bounded
authenticated reservation kernel that can freeze one synthetic Builder
candidate plan in an exact local journal, re-read and classify its current
bytes, and allow one closed effect-free test fake to consume one opaque live
grant once.

The result is deliberately unreachable from the product. It does not publish a
Git candidate, write a worktree or profile, call a model, run a command, or
activate a route. Serialized records, hashes, copied objects, JSON, restart,
stale bindings, import order, and caller-selected callbacks cannot recreate the
live authority.

This task proves current stable readback and process-crash behavior in disposable
repository-owned test fixtures. It does **not** prove power-loss durability,
directory-entry flush completion, confidentiality, exact Windows ACL custody,
hostile-same-user resistance, or production eligibility.

## Files touched

- `docs/ai-work/tasks/227-brief.md` was created and committed alone at
  `1b88462` to claim Task 227.
- `app/src/main/builderreservation.ts` adds the deliberately unimported store,
  canonical authenticated records, current-state classifier, and process-local
  one-use authority. It is absent from product and package entry surfaces.
- `app/tests-unit/builderreservation.test.ts` adds the focused functional,
  topology, crash, replay, cleanup, mutation, and darkness matrix.
- `app/tests-unit/support/builderreservation-fake.ts` contains the one closed,
  bounded, deterministic and effect-free fake consumer.
- `app/tests-unit/support/builderreservation-crash.mjs` supplies fixed child
  process crash cuts without adding a production fault-injection seam.
- `app/tests-unit/support/builderreservation-mutant.mjs` builds identity-owned
  temporary source mutants that causally prove the critical guards matter.
- `app/tsconfig.unit.json` includes the new focused unit sources.
- `app/src/main/builderreservation-authority-internal.ts` was created during
  implementation and then removed after review proved its generic install-first
  verifier registry was forgeable by import order. Its ignored compiled
  `app/dist-unit/src/main/builderreservation-authority-internal.js` artifact was
  also removed. The final authority instead closes over the store, and neither
  transient file remains.
- This report records the verified result.
- `docs/ai-work/LOG.md` receives one truthful Task 227 row.

Builds and tests regenerated ignored `core/dist/**`, `app/dist-unit/**`, and
`app/.vite/**` outputs and re-synchronized `app/resources/contract.md` to its
existing bytes. Test processes created only ignored `app/test-results/task227-*`
fixture trees. One deliberately time-limited early regression command was
terminated after ten seconds and left
`task227-mutant-consumption-spend-1c919146-5e66-41bd-aa6d-13649ac4e3f2`.
Its exact direct-child containment, link-free topology and matching creation
time were inspected before that disposable fixture alone was removed. It
contained no project or user data, is not recoverable, and the final Task 227
residue count is zero.

No dependency, package surface, production route, IPC, activation, real profile,
credential, provider, network, external service, or operating-system setting
changed. No persistent, existing, production, or real-project permission/ACL
changed. The kernel and its tests created no candidate/private ref, private
index, `HEAD`/current-branch change, or real-project worktree effect; ordinary
task work created the isolated brief commit, edited and exactly staged the eight
disclosed final paths, and will create the required local completion commit.

## Check results

### `c1` - records and custody are exact and bounded: PASSED

The store uses its own 32-byte key, versioned domain-separated HMAC-SHA256
records, strict exact-key parsing, manual canonical bytes, fixed text/count/path
limits, and create-only files. Revision 1 records `reserved`; revision 2 records
the deterministic inert receipt and `complete`. Each generation joins an exact
previous digest, high-water record, inventory and anchor.

The journal binds the generated operation UUID, schema/policy/handler revisions,
exact synthetic plan and hashes, canonical fixture root identity, revision and
receipt lineage. Reads reject accessors, proxies, malformed UTF-16, extra keys,
truncation, reordered noncanonical bytes, mismatched HMACs, wrong roots, hard
links, symbolic links/junctions, identity swaps, extra artifacts and stale or
conflicting generations.

Successful live writes fsync the opened file and perform a stable topology/byte
readback. Cold evidence says only `exact-stable-readback`; it expressly says
that file-fsync completion after a crash is not provable and power-loss
durability is unproved. Requested `0600`/`0700` creation modes are not represented
as a Windows ACL or confidentiality proof.

### `c2` - authority is opaque, current, and one-use: PASSED

Handles, grants, post-spend consumption values and fake receipts are held in
private WeakMap/WeakSet custody. A fresh exact-current revision 1 may mint only
one grant. The store revalidates authenticated current state at mint, consume,
and close/receipt consume. Receipt composition follows synchronously from the
freshly validated one-use consumption and uses only that opaque value. A
mismatched call does not spend; the first exact attempt spends before the fake
outcome, including the closed refusal and throw paths. The fake receipt is
separately branded and spent before revision 2 can begin.

The generic install-first verifier callback discovered during review was
removed. Verification and all live brands now close directly over the store.
Tests and causal mutants cover duplicate mint, grant replay, consumption replay,
receipt replay after a pre-create failure, stale state, forged structural
objects, JSON/clone boundaries, and cross-operation/root/binding attempts.

### `c3` - restart only classifies: PASSED

A cold child process can read exact current bytes as `absent`, `reserved`,
`complete`, `interrupted`, or `recovery-required`, but it cannot obtain a live
handle, mint or consume a grant, create a fake receipt, or close an operation.
Restart verifies and classifies journal custody only; it performs no cleanup,
repair, resume, retry, rollback, publication, application, underlying-task
verification, or DONE decision.

Real child-process cuts cover record creation/fsync and post-validation readback
for both generations, after mint, after a throw that spent the grant but created
no receipt, after the fake receipt, and after receipt spend before revision 2.
Generation-1 prefixes remain inert `interrupted`; nonterminal generation-2
prefixes fail closed as `recovery-required`; exact terminal bytes classify
`reserved` or `complete` without live authority.

An authenticated journal without an external monotonic witness cannot detect
coherent deletion of the entire latest generation: exact generation-1 bytes may
again classify `reserved`. That label is still fail-closed after restart and
does not prove that no earlier attempt occurred. Task 227 therefore proves one
live-process attempt and no restart authority, not hostile rollback detection.

### `c4` - every effect surface stays closed: PASSED

The fixed fake under `app/tests-unit/support/` is the sole normal stable-path
grant consumer. The causal mutant harness calls low-level functions only in
identity-owned isolated source copies.
Strict source tests lock the store and fake import allowlists, runtime export
set, absence of any product consumer, and exact product scan. They prove that no
package/root barrel, Main entrypoint, task route, IPC, preload, renderer,
activation registry, environment switch, provider, network, credential, Git,
command, callback or arbitrary product handler reaches the kernel.

The production Vite bundles contain no `builderreservation` or reservation
domain marker. The private source module remains ordinary JavaScript module
privacy, not an OS security boundary, and is intentionally not described as a
public or production-ready API.

### `c5` - causal offline checks cover the real failure modes: PASSED

The focused suite passes 24/24. It covers success, refusal/throw, strict bounds,
canonical and authenticated corruption, wrong/stale/cross bindings, all live
brands and spends, cold restart non-authority, partial generations, extra
artifacts, hard-link and symlink/junction topology, exact root confinement,
pre-existing stores, and identity-gated cleanup.

The child crash harness cuts actual compiled filesystem transitions without a
production hook. The mutation harness runs 21 end-to-end modes. Those modes
causally remove or corrupt the semantic high-water join, deterministic receipt
digest, revision HMAC, root identity, canonical-byte check, stable-read link
guard, path confinement, exact-key parser, text bound, handle/grant/receipt
brands, single-mint guard, grant/consumption/receipt spend guards and freshness
revalidation. Every admitted mutant produces the failure the original guard
prevents.

Every test fixture is an atomically claimed random direct child of
`app/test-results`, with an exclusive fsynced owner marker and captured identity.
Cleanup removes only that exact identity after rechecking canonical containment,
marker bytes and topology. Unknown, replaced or pre-existing paths are left
untouched and fail the test.

### `c6` - compatibility and records are complete: PASSED

Core build, App typecheck, production Vite build, the focused Task 227 suite and
the complete App unit matrix pass on the final source. Static bundle inspection
confirms product darkness. Three independent read-only adversarial reviews
found issues during development, re-read the repairs, and returned CLEAR on the
stable six-file implementation/test hashes below. No Task 227 fixture remains.

## Exact commands and observed results

From `core/`:

`npm.cmd run build`

Result: exit 0. Core compiled successfully.

From `app/`:

`npm.cmd run typecheck`

Result: exit 0. The App production TypeScript configuration passed. Unit
TypeScript is compiled separately by each `tsc -p tsconfig.unit.json` command
below.

`npm.cmd run build:vite`

Result: the first sandboxed attempt was blocked when the bundled esbuild binary
could not be launched (`Access is denied`). The exact elevated retry exited 0:
Main built 104 modules, preload 1 module and renderer 77 modules. Only the
existing Vite CommonJS deprecation warnings were emitted.

`npx.cmd tsc -p tsconfig.unit.json --pretty false; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node --test dist-unit/tests-unit/builderreservation.test.js`

Result on the independently reviewed stable bytes: exit 0; 24 tests passed, 0
failed, cancelled, skipped or todo. The final root run took 6698.0997 ms; an
independent reviewer rerun took 6947.5411 ms.

`npm.cmd run test:unit`

Result on the earlier compatibility snapshot before the final proof-harness-only
repairs: exit 0; 853 tests ran, 851 passed, the two existing host-dependent tests
skipped, and zero failed. Duration was 442487.3767 ms. The compact complete run
below repeated the full compiled matrix on the final bytes.

`npx.cmd tsc -p tsconfig.unit.json --pretty false; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node --test --test-reporter=dot dist-unit/tests-unit/*.test.js`

Result on the final bytes: exit 0 after 464.7 seconds. The compact reporter
printed all 853 completion markers with no failure marker.

`rg -n -i "builderreservation|cairn-builder-reservation" .vite/build .vite/renderer --glob '*.js'`

Result: exit 1, no match. The production bundles do not contain the kernel.

Stable SHA-256 values reviewed independently:

- `app/src/main/builderreservation.ts`:
  `6105246780DBDC5A237FD7205A4004E5A8905A75A211BEA5DA0F9C9A9DEF9CBC`
- `app/tests-unit/builderreservation.test.ts`:
  `47BFD3812A7999301A402353CEE6B271D5BD4AB1548EBDB75A9D3C0BC532F95A`
- `app/tests-unit/support/builderreservation-fake.ts`:
  `19B77CBE23EFEB4EB285A5F3B6DCE9C55620ADBAB4B20C3D8E225AB56C032CC3`
- `app/tests-unit/support/builderreservation-crash.mjs`:
  `9C04BC66EB826E295DC1DD7EE28AB7BD851F23C3F628365A8258EF7EBD964FC4`
- `app/tests-unit/support/builderreservation-mutant.mjs`:
  `C99D9814EC801CF17F3CA8D36F886A425FB28D211B037D4FEF2F30ED32FDE3DD`
- `app/tsconfig.unit.json`:
  `18D0BB4D9E6D4C4551F268301ED50350AEC962466FF6DD77BFB735FE4712E37E`

`git diff --check`

Result before staging: exit 0, no tracked whitespace diagnostic. Exact cached
whitespace and manifest evidence is recorded in the final pre-commit inspection
below.

## Final pre-commit inspection

`git diff --cached --check; git diff --cached --name-status; git status --short --branch; git diff --name-status`

Result after exact-path staging: cached whitespace check exited 0. The index
contained exactly:

- `A app/src/main/builderreservation.ts`
- `A app/tests-unit/builderreservation.test.ts`
- `A app/tests-unit/support/builderreservation-crash.mjs`
- `A app/tests-unit/support/builderreservation-fake.ts`
- `A app/tests-unit/support/builderreservation-mutant.mjs`
- `M app/tsconfig.unit.json`
- `M docs/ai-work/LOG.md`
- `A docs/ai-work/tasks/227-report.md`

Status showed exactly those eight staged paths on `main`, ahead of
`origin/main` by 168 commits. The unstaged name-status output was empty, and no
untracked path remained. The brief remains isolated in claim commit `1b88462`.

## How to try it

There is intentionally no product control to try. To inspect the offline proof,
run the focused command above from `app/`. It writes only identity-owned ignored
fixtures under `app/test-results/task227-*/` during test execution and removes
them after verification; its leading compile step also regenerates ignored
`app/dist-unit/**`. Do not install this store in a real profile or use it to
authorize Git, provider, project, native, or external work.

## Limitations and next safe step

Task 227 is not a candidate publisher and not a security claim about a real
profile. HMAC authenticity depends on the disposable key custody; the records
are not encrypted; same-user whole-store rollback is outside the threat model;
Windows ACLs and exact private permissions are not proven; file fsync and stable
readback do not establish containing-directory or power-loss durability; and no
restart bytes can authorize recovery or retry.

Per Task 226, the next separate task is an owner-approved disposable Git
object-to-private-ref-to-journal durability qualification. No publisher may
become effectful until that exact test and its recovery boundary pass. Native
worktree application remains separately gated by qualified Windows/filesystem
security review. Q10 and any provider call remain later and separately approved.

No paid call, provider/model/credential/network access, dependency, persistent
or real-project permission/ACL change, external action, publication, push or
deployment occurred. Beyond the disclosed brief and completion task commits,
source/test/record edits and exact-path staging, the kernel/tests caused no
candidate/private-ref/private-index or real-project runtime worktree effect.
The milestone did not move.

**Disposition: DONE - Cairn now has an independently reviewed, dark authenticated
reservation kernel and causal offline proof; it authorizes no production or
external effect.**
