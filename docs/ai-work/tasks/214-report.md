# Task 214 report - authenticated serial candidates before terminal sealing

**Lane:** A (the main checkout). **Base commit:**
`da6a32032ec6a06928b30f527a48fbeec3d8b272`.

The brief was claimed alone in commit `bc9a184`. This task implements
Prerequisite Q's Task Q6 only. Q7 restart custody, Q8's real critic, Q9's real
repair call, Q10 activation, and owner-verdict Plan 2 remain unstarted. Task
212 remains unmerged on `lane/g` and was not modified or absorbed.

## What actually changed

Nine Task 214 paths were touched across the brief-only claim and final task
commit:

- `docs/ai-work/tasks/214-brief.md` - the committed task claim and six stable
  checks.
- `core/src/candidate.ts` (new) - defines the privately branded, deeply frozen
  Task-Spec-bound candidate, lossless round bundle, exact lifecycle
  transitions, one repair instruction/replacement, seal authorization, and
  internal one-use terminal token.
- `core/src/serial.ts` - adds the dark candidate route/run, repair
  authorization/capture, finalize, and stop seams while preserving the
  existing intent-only one-call path; retains the in-process run lock while a
  candidate waits; and makes all candidate terminal records and commits pass
  through one exact custody transaction.
- `core/src/index.ts` - exports only the staged public candidate decisions and
  serial terminal functions. Raw capture, composition, repair, and terminal
  reservation functions remain unavailable from the package root.
- `core/package.json` - adds the candidate suite to the complete Core command
  and constrains the published package to its root export, so a deep import
  cannot bypass serial's terminal boundary.
- `core/test/candidate.test.ts` (new) - covers strict brands and hostile input,
  state transitions, round replacement, bundle bytes and modes, path/content
  safety, Git-index provenance, environment confinement, ignored-write
  eligibility, repair limits, replay, and package-surface custody.
- `core/test/serial.test.ts` - covers pre-seal pause behavior, exact terminal
  authoring, dirty and clean Git states, one repair lineage, legacy
  compatibility, record/index/ref races, protected and owned paths, unsafe
  Git metadata/environment, observer failures, and one-shot stop recovery.
- `docs/ai-work/tasks/214-report.md` - this report.
- `docs/ai-work/LOG.md` - one append-only Task 214 row.

The main implementation decisions were:

- Builder completion now yields a branded `SerialCandidateV1`, not terminal
  success. Candidate creation may write the already-declared brief, but it
  writes no report, LOG row, commit, terminal record, or Result/DONE activity.
  The open serial context retains the run lock until one explicit finalize or
  stop consumes it.
- The lifecycle derives its phase rather than accepting a caller-selected next
  state. Required and optional critic modes begin `awaiting-critic`; off begins
  `ready-to-seal`. Branded one-use transition objects, an opaque lineage, exact
  project/run/task/spec/plan/candidate/evidence/bundle bindings, and generation
  invalidation reject clones, replays, and cross-candidate substitutions.
- A bundle preserves sorted path identity, deletion/file state, executable
  mode, raw byte length, content hash, exact Base64 bytes, canonical Git blob,
  base-HEAD provenance, and the recoverable stage-0 index relation. Round 0
  and round 1 remain separate immutable bundles and are never ranked. A third
  partial-stage state fails with a fixed redacted reason instead of retaining
  its unbound staged bytes.
- Candidate capture is all-or-nothing. It component-walks and reads regular
  files without following links, verifies identity and bytes twice, enforces
  path/file/aggregate caps, and rejects case aliases, special Git modes,
  links/hardlinks, generated/dependency areas, binary/control content,
  credentials, unsafe paths, and snapshot races without exposing rejected
  names or bytes.
- Repair remains separately fail-closed. It requires a fresh exact candidate,
  a conclusive empty ignored-write boundary, one Main-derived instruction made
  only from the frozen promise/failure/artifact ids, and a separately captured
  round-one bundle. It cannot consume critic prose or commands, change the
  Task Spec/Evidence Plan/reference hashes, reset counters, or run twice.
- Every candidate Git child uses literal NUL-delimited paths and a confined
  environment: alternate repositories, indexes, objects, pathspecs, configs,
  trace/redirect output, replacement objects, fsmonitor, case folding,
  external diff/text conversion, hostile filters, and concealment flags are
  rejected or neutralized before they can become authority.
- Clean finalization builds and verifies an exact temporary index/tree and
  commit before one compare-and-swap HEAD update. A held real-index sentinel
  protects exact index bytes, identity, flags, and mode through install or
  rollback. Product and Cairn-owned blobs/modes are independently bound; no
  hook or external filter authors the terminal commit; no fallible verification
  runs after the successful ref update.
- Dirty finalization and every STOP path recheck the exact HEAD/ref, typed
  protected state, full non-owned path set, worktree bytes, stage-0 index,
  owned bytes/index/mode/topology, ignored-write classification, and Git
  metadata. STOP's pre-reservation recovery is tri-state and identity-bound,
  so missing LOG recovery is possible but a product moved onto report or LOG
  cannot be wildcard-overwritten. Post-write drift either produces a verified
  conservative rewrite or leaves must-inspect evidence; it never returns a
  stale successful terminal result.
- The capability is deliberately dark. The App still calls the legacy
  `runSerialTask(dir, pending.intent, ...)` path; neither Codex nor Kimi
  advertises `serial-task-candidate`; both quality activation identities are
  literal `null`; and the calibrated critic registry remains empty.

## Checks run and real results

Each result below answers the matching id in `214-brief.md`. Terminal output
was observed in Lane A and is not saved in the repository.

- **`c1` - candidate creation is pre-seal only. PASSED.** Fake worker tests
  prove a strict DONE claim becomes one immutable candidate only after process,
  protected-work, Task-Spec claims, event, Git path, bundle, and hash checks.
  HEAD and the original LOG remain unchanged, the report is absent, no terminal
  Result activity exists, product/brief bytes remain, and a second exact or
  aliased project run is refused while the pending candidate holds the lock.
- **`c2` - explicit authenticated lifecycle. PASSED.** Tests cover every
  declared phase and required/optional/off mapping. Structured/spread clones,
  duplicate same-digest candidates, prior genuine generations, wrong root,
  run, task, spec, plan, candidate, evidence state, round, bundle, transition,
  seal, and lineage all fail without consuming the untouched valid action.
- **`c3` - lossless round custody and fail-closed repair eligibility. PASSED.**
  Exact BOM/CRLF/non-ASCII/no-final-newline bytes, executable modes,
  deletions, renames-as-delete-plus-file, base/product index relations, and
  distinct round manifests/hashes round-trip. Unsafe path/content/link/
  hardlink/ignored/generated/dependency/binary/oversize/race/third-index-state
  cases return only fixed redacted failure state and retain no canary name or
  bytes. Parent swaps, case/backslash aliases, replace refs, and hidden Git
  metadata cannot create an incomplete candidate.
- **`c4` - one bounded, non-authoritative repair. PASSED.** Only an exact
  current round-zero `awaiting-repair` candidate can receive one frozen typed
  repair instruction and one post-instruction round-one capture. Successful
  replacement increments the generation/round/repair count, refreshes the
  candidate/claims/evidence hashes, preserves the original spec/plan/reference
  custody, invalidates every old transition, and requires evidence to run
  again. Replay, rollback, a second repair, prose/command injection, stale
  ignored proof, self-declared protected paths, and pre-captured round one fail.
- **`c5` - one honest terminal authoring boundary. PASSED.** Package tests
  reject deep imports of raw terminal functions. Finalize accepts only the
  exact current ready-to-seal candidate and seal authorization; stop accepts a
  current pending candidate once. Concurrency, observer exceptions, stale
  worktree/index/HEAD, linked owned paths, missing/moved products, record
  filters, trace/fsmonitor/config tricks, terminal record staging, index races,
  commit hooks, and post-record drift either fail before authoring or close one
  truthful verified result. A replay performs zero writes, and the lock is
  released exactly once.
- **`c6` - verified isolation and regression safety. PASSED.** The dedicated
  candidate command reported 28 tests: 24 passed, 4 Windows/POSIX capability
  skips, 0 failed. The dedicated serial command reported 139 tests: 133
  passed, 6 platform skips, 0 failed. The complete final-tree Core command
  reported 350 tests: 340 passed, 10 platform skips, 0 failed. Core no-emit
  typecheck and build passed. App typecheck, unit TypeScript compile, and all
  three production Vite bundles passed; the complete App unit command reported
  650 tests: 648 passed, 2 platform skips, 0 failed. Exact diff/status,
  process-leak, package export, live-call darkness, activation-registry, and
  Task-212 path checks passed, and the final independent audit returned no
  blocker.

The decisive commands and final results were:

```powershell
cd core
npm.cmd exec -- tsc -p tsconfig.json --noEmit
# pass

npm.cmd run build
# pass

node --test dist/test/candidate.test.js
# pass; 28 total, 24 passed, 4 platform skips, 0 failed

node --test dist/test/serial.test.js
# pass; 139 total, 133 passed, 6 platform skips, 0 failed

npm.cmd test
# pass; 350 total, 340 passed, 10 platform skips, 0 failed

cd ..\app
npm.cmd run typecheck
npm.cmd exec -- tsc -p tsconfig.unit.json --noEmit
# pass

npm.cmd run test:unit
# pass; 650 total, 648 passed, 2 platform skips, 0 failed

npm.cmd run build:vite
# pass; Main, preload, and renderer production bundles built

cd ..
git diff --check
# exit 0; no output

rg -n 'runSerialTaskToCandidate|finalizeSerialCandidate|stopSerialCandidate|serial-task-candidate' `
  app core/src/codex.ts core/src/kimi.ts
# no matches

rg -n 'runSerialTask\(dir, pending\.intent|QUALITY_PREVIEW_ACTIVATION_IDENTITY' `
  app/src/main/tasks.ts app/src/main/conductor/service.ts
# the live worker call remains intent-only and both activation identities are null
```

One early dedicated serial invocation reached its 480-second command bound
without a test failure while the adversarial file was still expanding. The
definitive longer invocation completed with the totals above. The first Vite
attempt inside the restricted filesystem view could not traverse the project
path; the identical local command passed after filesystem sandbox elevation.
Neither harness event changed tracked source. The complete Core suite was also
rerun with bounded output after its first execution cell closed without
retaining the final summary; the recorded rerun exited zero with the totals
above and left no new Node or command helper process.

No dependency/install, provider/model/network call, credential use, real app
or E2E run, external service write, push, publish, or deployment occurred.

## How to try it

There is intentionally no visible production change yet. Opening Cairn still
uses the existing intent-only worker path because the candidate capability has
no live adapter or App caller and critic activation remains empty. A maintainer
can safely run the Core commands above. The fake tests demonstrate the new
boundary: Builder completion returns a frozen candidate with no terminal
records, then an exact simulated lifecycle either stops it once or explicitly
authorizes and finalizes one verified terminal outcome.

## Limitations and remaining human judgment

- Q6 pending custody is deliberately in memory. A restart cannot yet resume
  or honestly retire a waiting candidate; Q7 owns the durable journal and
  restart/recovery boundary.
- No real critic or repair provider is called. Q8 owns the critic route, Q9
  owns the single provider repair, and Q10 owns live activation. Plan 2 still
  owns the owner's permanent verdict and remains unstarted.
- Repair requires a conclusive empty ignored-write boundary. Ordinary projects
  with existing ignored trees such as `node_modules` or `dist` can still form
  and seal a candidate, but Q6 reports repair unavailable until later enforced
  writer custody can prove ignored task output did not appear.
- A Git-visible unsafe, linked, sensitive, binary, generated, dependency, or
  unbounded artifact conservatively stops candidate creation. Q6 does not yet
  expose a metadata-only non-repair candidate for those paths.
- Filter-free candidate capture writes screened product bytes as unreachable
  Git objects before seal so the exact canonical blob can later enter the
  temporary-index transaction. It changes no ref, index, or Git status, but
  candidate creation is therefore not wholly memory-only.
- The final ref compare-and-swap binds the exact starting HEAD object and
  candidate tree. If another actor switches branch names to a branch at that
  same object during the final instant, `update-ref HEAD` follows normal Git
  current-branch semantics; Q7's journal/sandbox work owns stronger durable
  coordination beyond Q6's in-process run lock.
- POSIX-only literal-backslash, case-collision, symlink, executable-mode, and
  exact index-permission cases remain present in the suite but skip where the
  Windows test environment cannot create that filesystem state.
- The task intentionally used fake/unit/build checks only, not the shared real
  app/E2E profile. Task 212 remains on `lane/g`.

**Disposition: DONE**
