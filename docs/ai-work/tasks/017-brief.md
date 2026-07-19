# Task 017 — evaluate the exact Task 016 candidate as a contained Experimental Draft

Lane: **High-Stakes**

Reason: the candidate coordinates concurrent Git worktrees and approval gates; an unsafe rehearsal could damage valuable repository state.

Mode: **Draft — Experimental Draft evaluation**

Candidate under evaluation:

`e5c7b8f3eab5f7e628dbe48a67c552f7c7f0eede`

Governing standard: **Cairn Contract v1.5**

This is an evaluation-only task. It must not repair, reinterpret, activate, or change the candidate.

## Visible outcome

Produce a judgeable report determining whether the exact Task 016 candidate qualifies to remain as disabled Experimental Draft learning evidence.

The report must establish:

- whether one narrowly defined desktop user path works;
- whether the candidate is disabled by default;
- whether every rehearsal effect remains inside newly created synthetic temporary repositories;
- whether leaving the flag unset provides an immediate rollback;
- whether each of the two Task 016 review findings can affect the supported user path;
- whether either finding can escape the synthetic containment boundary; and
- which concerns and activation gates must remain for any future Final task.

If the path works and containment holds, the expected candidate verdict is `PASS WITH CONCERNS`, never `PASS`, because both reproduced review findings remain unresolved.

This task does not complete a real-model Cairn self-improvement task.

Milestone movement: **UNCLEAR**

## Exact candidate and evidence boundary

The evaluation covers only the product behavior in commit:

`e5c7b8f3eab5f7e628dbe48a67c552f7c7f0eede`

Relevant historical evidence includes:

- pinned Task 016 brief commit `bae645005356867f5b27f01896bf00639ecb08ca`;
- Task 016 report;
- the fresh-context Task 016 review;
- the Task 016 `revise` decision in the work log; and
- the current Contract v1.5 Experimental Draft standard.

Historical claims are evidence, not proof. The evaluator must inspect and exercise the exact candidate independently.

## The two retained Task 016 review findings

### Finding 1 — capacity bypass after pre-reservation

Three tasks can be reserved before classification and later all become admitted because metadata registration does not recheck the two-task capacity limit while admitting each task.

The Task 016 review independently observed `admitted=3`.

### Finding 2 — malformed refinement is not terminally refused

A valid admitted task can be refined into malformed metadata without entering terminal refusal. It remains admitted and consumes capacity. A later approval attempt can write an approval file before failing the frozen-brief check.

The Task 016 review independently observed the task remain admitted and `defined`, with an approval artifact created before `BRIEF_CHANGED`.

Neither finding may be erased, weakened, described as fixed, or excluded from a future Final activation task.

## One supported desktop user path

The sole supported path is the existing headed desktop refusal-and-navigation scenario:

```powershell
npm.cmd run build --workspace core
npm.cmd --prefix app run test:smoke -- concurrency-parallel-safe.spec.ts --headed --grep "refused work stays visible evidence without displacing two navigable safe tasks"
```

The first command prepares the exact current candidate product source. The second launches Cairn in mock mode against a newly created synthetic Git repository.

The visible path is:

1. The desktop shows safe Task 001, refused Task 002, and safe Task 003.
2. Task 002 is labeled `Refused — not queued` with `PARALLEL_EXCLUSIVE_REFUSED`.
3. The automation opens `Continue Task 001`, observes `Approve this exact brief`, and returns through `← Project home`.
4. It repeats that navigation for Task 003.
5. It opens `View refusal for Task 002`.
6. The refusal view contains no `Approve this exact brief` or `Build it` button.
7. The task deck still shows Tasks 001 and 003 as independently navigable.
8. After the desktop closes and restarts, the refusal and both safe tasks remain visible.

No other desktop sequence is supported by this Experimental Draft evaluation. Refinement, three provisional reservations, building, retrying, deciding, integrating, crash recovery, real-model execution, and valuable-repository use are outside this supported path.

## Planning hypothesis to test

This is a hypothesis, not an acceptance claim:

- Finding 1 appears outside the supported path because the path reserves and classifies each seeded task in sequence; it never holds three unclassified reservations.
- Finding 2 appears outside the supported path because the path never invokes brief refinement or approval after malformed refinement.
- Both findings appear containable because coordinator initialization, state, branches, and worktrees are restricted to the synthetic temporary project used by each rehearsal.

The task must verify that hypothesis. It must not assume it is true because the visible test passes.

## Default-off containment boundary

The candidate may execute only when `CAIRN_PARALLEL_DRAFT=1` is supplied to an individual child process.

Finite default-off proof requires:

1. Confirm the parent shell does not contain `CAIRN_PARALLEL_DRAFT` before rehearsal.
2. Inspect the exact candidate and confirm the feature check is equality with the explicit value `1`.
3. Run the existing no-flag control:

   ```powershell
   node --test --test-name-pattern "without the flag, task definition stays on the serial path and creates no coordinator" core/dist/test/coordinator-parallel-safe.test.js
   ```

4. Confirm that control creates no coordinator state or `cairn/task-*` branch in its synthetic repository.
5. After every flag-enabled child process exits, confirm the parent shell still has no flag.
6. Confirm the real repository has no `.git/cairn`, no `cairn/task-*` branch, and no additional worktree.

The flag must never be set persistently or globally.

## Synthetic-only containment boundary

Every candidate execution must receive a newly created synthetic Git repository beneath the operating-system temporary directory.

On this machine, retained evidence roots will use a unique prefix beneath:

`C:\Users\KenJL\AppData\Local\Temp\cairn-task-017-*`

Each root must contain only newly created synthetic project data, app data, branches, worktrees, coordinator state, and checking evidence.

Before execution, the evaluator must inspect the exact test and harness arguments and prove that:

- `CAIRN_OPEN` names the synthetic project, never this repository;
- `CAIRN_MOCK=1` is used;
- no real model, credential, network service, or external action is available;
- the synthetic project and app-data paths are under the retained Task 017 temporary root; and
- every coordinator worktree is under the synthetic coordinator worktree root.

Every retained Task 017 temporary root must be listed in the report. Nothing is deleted or cleaned up.

## Safe rehearsal

The rehearsal has four bounded parts:

1. Run the no-flag control in a newly created synthetic repository.
2. Run the one supported headed desktop path.
3. Independently reproduce Finding 1 in a separate synthetic repository by reserving three tasks before classifying them, then record the admitted count and every resulting path.
4. Independently reproduce Finding 2 in another synthetic repository by refining an admitted valid brief into malformed metadata, attempting approval, and recording the phase, blocker, approval-artifact path, and error.

The two finding rehearsals diagnose known defects. Their expected reproduction is not itself a containment failure.

A finding becomes disqualifying when evidence shows that it:

- is reachable through the supported desktop path;
- alters what that path promises;
- writes outside its assigned synthetic root;
- mutates this real repository;
- defeats default-off behavior; or
- makes immediate rollback incredible.

No production source or test may be changed if a rehearsal fails.

## Files that may change

The separately saved and pinned brief:

- `docs/ai-work/tasks/017-brief.md`

During the approved evaluation:

- `docs/ai-work/tasks/017-report.md`

Tests may regenerate ignored output only under:

- `core/dist`;
- `core/assets`;
- `app/.vite`;
- `app/resources`; and
- `app/test-results`.

Synthetic evidence may be created only under the named operating-system temporary roots.

No product source, test, dependency declaration, lockfile, earlier task artifact, or work-log row may change.

If another tracked file is needed, stop with `SCOPE_TOO_NARROW`.

## Protected starting state

At planning time:

- branch: `main`;
- HEAD: `e5c7b8f3eab5f7e628dbe48a67c552f7c7f0eede`;
- `main` is 16 commits ahead of `origin/main`;
- nothing is staged;
- only the main worktree exists;
- no `cairn/task-*` branch exists;
- `.git/cairn` is absent; and
- Task 017 is unused.

Saving the brief may advance `main` by exactly one brief-only commit whose parent is the candidate commit. No other starting fact may drift.

These modified files must remain byte-identical:

| File | SHA-256 |
|---|---|
| `AGENTS.md` | `C4DA88A877D45443CCA53C2247C29719B6CBFF45C2C1496EBA911D88E3B324BF` |
| `CHANGELOG.md` | `AC1003C0A7B54FF834EDD1389CAB4DAD270DD621760E6B9BA1B918C8AB1E2896` |
| `CONTRACT-TEMPLATE.md` | `0FC4CA8775C8BB8853CD387947B6CE583357DBBB4E52300CB304C962201958E8` |
| `EVERYDAY-WORKFLOW.md` | `AF8755027E830045164136E344D0A6B4AD3231926C204621EB8652305BABFD35` |
| `GETTING-READY.md` | `5D9AD9F6920D8E2EB203847F14EBE8839751529AF7951DB1F5712E86D7BFA5EC` |
| `HIGH-STAKES.md` | `175A4D5B7C32EF8F40288D0C9AF9E1E474D7FB726F81CB649D123D3D5C97A54B` |
| `MAINTAINERS.md` | `67B9F5514081E5E45CFDE3BCD988CF5B9C8F60F3802E8AD2900E7C823ED6F548` |
| `README.md` | `524CFC49BA19D75C0263D51C66C245FB583924F6A2CE7BC9FEBCC7E03E4297E7` |
| `cairn.html` | `4967DE0AF81664AE3C0252956ACE622053BA5661C1C711118EF0D0E1E06E6587` |
| `docs/ai-work/LOG.md` | `F428CCD609485334E4ABD13468A4B672C2FC6A4B21277AD8B0D6A99679C0C56E` |

These files must remain byte-identical and untracked:

| File | SHA-256 |
|---|---|
| `docs/ai-work/tasks/007-approval.json` | `1204556CD1F51DF44D0EA2069643FE71CAA9BCFC08413E30CC35C6BDA07F2691` |
| `docs/ai-work/tasks/008-approval.json` | `2CB40F65212506ED3037AB1B174A769C7307D1C8D071DA6A7B42B9EDE145344E` |
| `docs/ai-work/tasks/009-approval.json` | `78933AC2EB2A00B6F6C40F92C6EDD2D5EBAF37D98F96C77FCF64F017A366D822` |
| `docs/ai-work/tasks/011-report.md` | `C70BABB41335C4F2D8C39FB44430A915C14F389A86D254524BFDE3E24FADF5F8` |
| `docs/ai-work/tasks/014-report.md` | `A67C8E09DFABDAF9B600B692FD31551B456DA50DFC4D452FB1F4D891CF6C3795` |

## Checks

The evaluator must run and report:

- active Contract v1.5 and pinned Task 017 brief verification;
- verification that the brief-only commit’s parent is the exact candidate;
- verification that current product source and tests under `core/` and `app/` match the candidate;
- pre- and post-rehearsal hashes for all protected files;
- pre- and post-rehearsal Git status, worktree list, task-branch list, HEAD, and `.git/cairn` state;
- parent-shell flag checks before and after execution;
- the exact no-flag control;
- the exact single headed supported-path test;
- an independent Finding 1 reproduction;
- an independent Finding 2 reproduction;
- absolute-path inspection of every project, app-data, state, branch, worktree, and approval artifact created by those rehearsals;
- inspection showing whether each finding’s prerequisites occur anywhere in the supported path;
- `git diff --check`;
- actual diff inspection against the permitted-file list;
- confirmation that no dependency or lockfile changed;
- final full Git status; and
- exact-name staging and commit of only `docs/ai-work/tasks/017-report.md`.

A broken temporary checking harness may be corrected only inside its synthetic temporary root. The failed output must be preserved and reported. Production source or existing tests may not be repaired in this task.

## What the owner will personally see or try

After the evaluation and mandatory fresh-context review, the owner may run the two supported-path commands exactly as shown above.

Success looks like:

- two safe tasks remain visible and navigable;
- Task 002 is visibly refused and not queued;
- the refusal has no approval or build control;
- it consumes no safe-task slot; and
- the same state survives a desktop restart.

Failure includes any missing safe task, an approval/build control on refused work, loss of refusal evidence after restart, use of a non-temporary project, or mutation of the real repository.

## What could be damaged

A faulty rehearsal could create branches, worktrees, coordinator state, approval artifacts, or commits in this valuable repository.

Synthetic repositories may be freely changed because they are newly created disposable evidence. They will still be retained rather than deleted.

Changes to the brief and report are reversible through a separately approved Git revert. An unexpected mutation of real repository state may not be safely reversible without inspection.

## Rollback plan

Runtime rollback is immediate:

1. Close the headed desktop process.
2. Allow the command-scoped child environment to end.
3. Confirm `CAIRN_PARALLEL_DRAFT` remains absent from the parent shell.
4. Leave the candidate disabled.
5. Confirm this repository’s branches, worktrees, HEAD, protected files, and `.git/cairn` match the pre-rehearsal fingerprint.

No synthetic evidence is cleaned up.

If this real repository gains coordinator state, a task branch, another worktree, an unexpected commit, or changed protected bytes, stop with `REAL_PROJECT_MUTATED`. Preserve everything exactly and request a separately approved recovery plan. Do not reset, revert, clean, delete, move, or stash anything.

## Concerns permitted to remain

A successful Experimental Draft evaluation may retain:

- the three-pre-reservation capacity bypass;
- malformed refinement remaining admitted and creating an approval artifact before rejection;
- unsupported refinement, approval, build, retry, decision, and integration sequences;
- untested crash and process-scheduling interleavings;
- platforms other than the evaluated Windows desktop environment;
- production-filesystem behavior;
- valuable-repository behavior; and
- the absence of real-model execution.

None may remain merely as a concern if it can break the supported path or escape containment.

## Future Final activation gates

Before this candidate, or a descendant of it, may operate on valuable work, a separate High-Stakes Final task must:

- name this exact candidate and both retained review findings;
- fix or explicitly resolve the admission-capacity race;
- make malformed refinement fail closed before any approval artifact is written;
- define the supported production entry point;
- test every operation exposed through that entry point;
- prove locking, worktree ownership, integration, crash recovery, and rollback against valuable-repository conditions;
- obtain review from a developer experienced with Git worktrees, concurrent state machines, locking, integration conflicts, and crash recovery;
- obtain exact owner approval for activation on the named repository;
- preserve a tested recovery plan; and
- obtain separate approval for any network, credential, cost, deployment, external write, or other live action.

Acceptance of this evaluation must leave the candidate disabled.

## Experienced human

No experienced human is required merely to evaluate and retain this disabled candidate because all execution is mock-only and confined to newly created synthetic repositories.

An experienced Git/concurrency developer is required before any Final activation on valuable work.

## Actions and approvals

Saving and pinning this brief requires a separate exact owner message.

A later fresh-chat build approval may authorize only:

- local compilation using already installed dependencies;
- ignored generated build output;
- mock Electron and Node execution;
- creation and retention of the named synthetic temporary repositories;
- creation of `docs/ai-work/tasks/017-report.md`; and
- one exact-name report commit.

No live or external action is authorized or expected.

The task does not authorize:

- product-code or test changes;
- activation in this repository;
- dependency installation or updates;
- network access;
- real-model access;
- credentials;
- cost;
- deployment, publishing, pushing, or releasing;
- messaging anyone;
- external-service writes;
- deleting or moving evidence; or
- reverting any commit.

If any becomes necessary, stop with `EXTERNAL_ACTION_REQUIRED`.

## DONE requires

`Disposition: DONE` requires:

1. The exact candidate and pinned evaluation brief were verified.
2. No product source or test changed.
3. The one supported desktop path passed.
4. Default-off behavior was proved.
5. Every rehearsal effect stayed within its named synthetic temporary root.
6. Both review findings were independently reproduced and retained.
7. Evidence showed neither finding can affect the supported path nor escape containment.
8. Immediate rollback was demonstrated.
9. Protected work and real repository state remained unchanged.
10. The report states `Candidate verdict: PASS WITH CONCERNS`.
11. The report names all retained concerns and future Final gates.
12. The exact-name report commit succeeded.

DONE means the candidate is useful disabled learning evidence. It does not mean production readiness.

## STOPPED conditions

Stop with the named blocker when:

- the starting state changed unexpectedly: `STARTING_STATE_CHANGED`;
- the brief is unpinned or changed: `BRIEF_NOT_PINNED`;
- executable product bytes do not match the candidate: `CANDIDATE_MISMATCH`;
- a safe isolated rehearsal cannot be established: `ISOLATED_REHEARSAL_UNAVAILABLE`;
- default-off behavior is not proved: `DEFAULT_OFF_NOT_PROVEN`;
- the supported desktop path fails: `SUPPORTED_PATH_FAILED`;
- either finding cannot be classified: `FINDING_NOT_CLASSIFIED`;
- a finding can affect the supported path: `SUPPORTED_PATH_AT_RISK`;
- any effect escapes its synthetic root: `CONTAINMENT_FAILED`;
- rollback is unclear or fails: `ROLLBACK_UNCLEAR`;
- protected work changes: `PROTECTED_WORK_CHANGED`;
- another tracked file is required: `SCOPE_TOO_NARROW`;
- a separately gated action becomes necessary: `EXTERNAL_ACTION_REQUIRED`;
- the real repository is mutated: `REAL_PROJECT_MUTATED`; or
- an unexpected genuine safety failure occurs: `UNSAFE_COORDINATOR_EFFECT`.
