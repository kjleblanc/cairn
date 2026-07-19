# Task 016 — replace the disabled coordinator with a parallel-safe-only Draft

Lane: **High-Stakes**

Mode: **Draft**

Source candidate: Task 015 implementation commit  
`7a5302769ad94855e4d7cdb3e121d4e18c3bb58b`

Direction Gate choice: replace the general coordinator with a narrower coordinator that admits only work safe for parallel execution.

## Visible outcome

When `CAIRN_PARALLEL_DRAFT=1` is explicitly set, Cairn may run at most two tasks concurrently only when both tasks are:

- approved against byte-frozen briefs;
- fully and validly classified;
- `Standard`;
- `Draft`;
- free of external actions and dependencies; and
- assigned non-overlapping exact paths.

Every other task is refused, not placed into a waiting queue. Refused work never reaches approval, build, retry, decision, or integration.

Completed eligible tasks integrate one at a time. Before every initial builder run and every builder retry, Cairn revalidates both the frozen brief and the frozen approval before the builder engine receives control.

The feature remains disabled by default and restricted to new synthetic Git repositories under the operating-system temporary directory. It is not adopted as Cairn policy and is not activated in the real repository.

## Milestone movement

`UNCLEAR` — this produces a narrower safety candidate, but does not complete a real-model Cairn self-improvement task.

## Parallel admission boundary

A definition is provisional until its metadata has been parsed and checked. Provisional work is not an admitted parallel task and cannot make an already admitted task wait.

A task is admitted only when all of these are true:

1. Its metadata block is complete, strict, and machine-readable.
2. Its lane is `Standard`.
3. Its mode is `Draft`.
4. `externalActions` is empty.
5. `dependencies` is empty.
6. Its declared paths do not conflict with any non-integrated admitted task.
7. Fewer than two admitted non-integrated tasks already exist.

Path conflicts include:

- identical paths; and
- file/directory ancestry, such as `area` conflicting with `area/item.txt`.

The later conflicting task is refused. The earlier admitted task remains unchanged.

Refusal must use a terminal `refused` phase and one stable blocker:

- `PARALLEL_CLASSIFICATION_REFUSED`;
- `PARALLEL_EXCLUSIVE_REFUSED`;
- `PARALLEL_SCOPE_OVERLAP`; or
- `PARALLEL_EXTERNAL_ACTION_REFUSED`.

A refused task:

- retains its permanent number, branch, worktree, brief, and refusal evidence;
- never enters `waiting`, `approved`, `building`, `report`, `queued`, `integrating`, or `integrated`;
- never enters the integration queue;
- cannot be approved, built, retried as a builder, decided, or integrated;
- does not consume one of the two admitted-task slots; and
- cannot delay or block an admitted task.

A third eligible task is refused before reservation with `CONCURRENCY_LIMIT`; it receives no task number, branch, or worktree.

Definition-engine recovery may retain one provisional definition as Task 015 does, but it is never parallel-admitted and cannot delay an already admitted task. “Retry” in the frozen-artifact rule below means a builder retry, because a definition has no frozen approval yet.

When the parallel flag is set, High-Stakes, Final, Tiny, dependent, overlapping, malformed, or external-action work does not fall back to serial execution. The owner must leave the parallel flag unset and start that work through Cairn’s ordinary serial path.

## Frozen brief and approval boundary

Initial builds and builder retries must pass the same gate.

Immediately before the builder engine receives control, Cairn must verify:

- the task is admitted and approved;
- the brief exists and matches the coordinator’s frozen SHA-256;
- the approval file exists and matches the coordinator’s frozen SHA-256;
- the approval record names the same task and brief path;
- the approval record’s brief hash matches the coordinator’s frozen brief hash;
- the current brief bytes match that hash;
- retained retry changes remain inside the frozen allowed-path boundary;
- `main`, coordinator ownership, capacity, and integration state still permit the build.

These checks occur after any required rebase and inside the final lock-protected transition to `building`.

On failure:

- the builder engine is never called;
- no builder event or write occurs;
- an initial approved task remains safely approved;
- a `BUILDER_ENGINE_FAILED` retry remains blocked under that same identity;
- retained partial work remains untouched; and
- the failure is reported as `APPROVAL_CHANGED`, `BRIEF_CHANGED`, or the existing more specific state error.

The retry blocker must not be cleared before every check succeeds.

Post-build brief, approval, scope, report, and decision gates remain in force.

## Serialized integration boundary

Only admitted tasks can reach integration.

Task 015’s decision-commit protections remain:

- the decision records a complete immutable commit identifier;
- integration uses that commit, never a mutable branch name;
- post-decision branch or worktree movement is refused;
- integration uses one lease and one queue position at a time;
- accepted tasks update against the latest serialized `main`;
- approved checks rerun in the detached integration candidate;
- `main`, the work log, task branch, and task worktree remain unchanged after a refused integration;
- coordinator revision, lease, queue position, task branch, task worktree, and `main` are rechecked immediately before advancing `main`.

The second task may finish while the first awaits integration, but only one integration may advance at a time.

## Coordinator-state compatibility

The internal disabled-Draft coordinator schema may advance from version 1 to version 2 to represent terminal refusal.

No migration or automatic repair of retained Task 013–015 coordinator state is permitted. Older or malformed state fails closed as `UNSUPPORTED_STATE`.

## Files that may change

Only these files may be created or modified during the build:

- `core/package.json`;
- `core/src/coordinator.ts`;
- `core/src/steps.ts`;
- `core/test/coordinator.test.ts`;
- `core/test/coordinator-regressions.test.ts`;
- `core/test/coordinator-parallel-safe.test.ts` — new independent red/green regression suite;
- `app/src/renderer/App.tsx`;
- `app/src/renderer/components/TaskDeck.tsx`;
- `app/src/renderer/screens/Dashboard.tsx`;
- `app/src/renderer/screens/Wizard.tsx`;
- `app/tests/concurrency-parallel-safe.spec.ts` — new;
- `docs/ai-work/tasks/016-report.md` — new during the build.

The separately saved and pinned `docs/ai-work/tasks/016-brief.md` is governed by the High-Stakes save step.

Tests may regenerate ignored output under `core/dist`, `core/assets`, `app/.vite`, `app/resources`, and `app/test-results`. Generated output must not be staged.

If another tracked source file is required, stop with `SCOPE_TOO_NARROW`.

## Existing tests that may be adjusted

Existing coordinator assertions that require unsafe work to wait or run alone may be changed to require terminal refusal.

Their underlying cases must remain:

- High-Stakes;
- Tiny;
- Final;
- external action;
- dependency;
- unknown or malformed classification;
- exact overlap; and
- ancestor/descendant overlap.

No case may be removed, skipped, weakened, or converted into a superficial string-only assertion.

Task 015’s decision-freeze and engine-recovery cases must remain.

## Files and behavior that must not change

This task must not change:

- `core/src/agents.ts`;
- `core/src/gates.ts`;
- `core/src/index.ts`;
- other core tests;
- app main-process, preload, shared IPC, or API files;
- `app/tests/concurrency.spec.ts`;
- `app/tests/concurrency-recovery.spec.ts`;
- CLI source or tests;
- dependencies or lockfiles;
- canonical workflow policy or public artifacts;
- behavior when `CAIRN_PARALLEL_DRAFT` is absent;
- credentials, providers, billing, deployment, or external services;
- any earlier brief, report, approval, decision, or work-log history;
- the real repository’s branches, worktrees, or `.git/cairn` state.

No file, branch, worktree, lock, or retained evidence directory may be deleted, moved, reset, cleaned, stashed, or broadly staged.

## Protected starting state

At planning time:

- `main` is `7a5302769ad94855e4d7cdb3e121d4e18c3bb58b`;
- it is 14 commits ahead of `origin/main`;
- nothing is staged;
- only the main worktree exists;
- no `cairn/task-*` branch exists;
- `.git/cairn` is absent;
- Task 016 is the next unused task number.

These modified files must remain byte-identical:

| File | SHA-256 |
|---|---|
| `AGENTS.md` | `BC7F7D196A6F576DEE97369EE7A6AA4C1AE15B86DAC079375E3B93D52C3B5CFE` |
| `CHANGELOG.md` | `B4AE54BF3557FA2892C1044FF20EEB0A6696D8908D61949F14ABE36FC80E388F` |
| `CONTRACT-TEMPLATE.md` | `F1A254F6221BC47AD6AB8B3A78A5C8B6F396A4711CC83FC94A4E2121A6DDF47A` |
| `EVERYDAY-WORKFLOW.md` | `C6D6BDF27B587EE2B5C0EB28816F3F0A17E68EB205D4C3AD2024F7108BE03BAF` |
| `GETTING-READY.md` | `BC9B5DBBEF781D48800D9DA0740A42E033A463E10A26DDF5CBA8BFA517998449` |
| `HIGH-STAKES.md` | `4A2018E8C46443826D7BF5AE7F0FFBFA28B44F5E3B71E342B33513315109BA0B` |
| `MAINTAINERS.md` | `9EFAE920CB72C4F41DD534DD4C4AE078EE0D378E5A5C65B8A99BA0DA71EF8733` |
| `README.md` | `81BF146A4FD3F05052F029F5B2E104E8719BAB0BB40B229B3569C1A524CB526C` |
| `cairn.html` | `1CDDAFEA0188F2A8E74418888D2E39EC3D1507C1F7FFFFF9CA7898B67D835DD2` |
| `docs/ai-work/LOG.md` | `23C398C7240B2876CFC7491FCBDB6BFE6BF032BE849505490E6B35683B04D390` |

These files must remain byte-identical and untracked:

| File | SHA-256 |
|---|---|
| `docs/ai-work/tasks/007-approval.json` | `1204556CD1F51DF44D0EA2069643FE71CAA9BCFC08413E30CC35C6BDA07F2691` |
| `docs/ai-work/tasks/008-approval.json` | `2CB40F65212506ED3037AB1B174A769C7307D1C8D071DA6A7B42B9EDE145344E` |
| `docs/ai-work/tasks/009-approval.json` | `78933AC2EB2A00B6F6C40F92C6EDD2D5EBAF37D98F96C77FCF64F017A366D822` |
| `docs/ai-work/tasks/011-report.md` | `C70BABB41335C4F2D8C39FB44430A915C14F389A86D254524BFDE3E24FADF5F8` |
| `docs/ai-work/tasks/014-report.md` | `A67C8E09DFABDAF9B600B692FD31551B456DA50DFC4D452FB1F4D891CF6C3795` |

The builder must recheck all facts and hashes after the brief is pinned and before editing.

## Safe rehearsal

All coordinator execution occurs in newly named synthetic Git repositories under the operating-system temporary directory.

Before production edits:

1. Create `core/test/coordinator-parallel-safe.test.ts`.
2. Compile it against unchanged Task 015 production source.
3. Run it as an expected-red control.
4. Prove the current candidate fails for the intended reasons:

   - unsafe task types enter defined, approved, waiting, or building states instead of terminal refusal;
   - overlap waits instead of being refused;
   - malformed or unclassified work can obstruct an eligible peer;
   - changing the frozen approval lets an initial builder or builder retry receive control before rejection.

5. Confirm the control scenarios already pass:

   - two eligible disjoint tasks can build concurrently;
   - integration remains serial;
   - default no-flag behavior is unchanged.

Any compilation error, setup error, unrelated failure, unexpected pass, or different failure cause stops the task with `REGRESSION_NOT_REPRODUCED`.

After the repair, the same new assertions must pass unchanged.

The desktop rehearsal must show:

- two eligible tasks remain separately navigable;
- an unsafe task is labeled “refused — not queued” with its exact reason;
- no approval or build button exists for it;
- it does not displace or delay an eligible task;
- after dismissal or restart, it remains evidence rather than becoming active work;
- tampered initial-build and retry states never produce builder activity;
- completed eligible tasks integrate one at a time.

Every retained temporary root must be listed in the report. Nothing is cleaned up.

## Checks

The builder must run and report:

- pinned-brief and parent-commit verification;
- pre-build and post-build protected-file hash comparisons;
- expected starting hashes for the permitted Task 015 source;
- `npm.cmd run build --workspace core`;
- expected-red `node --test core/dist/test/coordinator-parallel-safe.test.js`;
- inspection proving every red failure occurred for its intended reason;
- the unchanged targeted suite after implementation;
- `npm.cmd test --workspace core`;
- `npm.cmd test --workspace cli`;
- `npm.cmd --prefix app run typecheck`;
- `npm.cmd --prefix app run test:smoke -- concurrency-parallel-safe.spec.ts concurrency-recovery.spec.ts concurrency.spec.ts away.spec.ts smoke.spec.ts`;
- `git diff --check`;
- actual diff inspection against the permitted-file list;
- confirmation that no dependency or lockfile changed;
- confirmation that existing tests were not weakened;
- final full Git status;
- final `git worktree list --porcelain`;
- final `git branch --list "cairn/task-*"`;
- confirmation that `.git/cairn` remains absent;
- exact-name staging and inspection of the Task 016 implementation commit.

A repairable in-scope implementation or checking-harness defect follows the contract’s repair-and-rerun procedure. The failed output remains recorded.

## What the owner will personally see or try

After the build and mandatory fresh-context review:

```powershell
npm.cmd run build --workspace core
node --test core/dist/test/coordinator-parallel-safe.test.js
```

Success is a passing suite proving strict admission, immediate refusal, frozen-artifact checking before engine entry, two eligible concurrent builds, and serial integration.

For the desktop view:

```powershell
npm.cmd --prefix app run test:smoke -- concurrency-parallel-safe.spec.ts --headed
```

Success shows two safe tasks, clear “refused — not queued” explanations for unsafe tasks, no unsafe approval or build control, and one-at-a-time integration.

These commands do not activate the Draft in the real repository.

## What could be damaged

A defect could:

- run High-Stakes, Final, Tiny, dependent, overlapping, malformed, or external-action work;
- allow a refused task to obstruct safe work;
- call the builder after brief or approval tampering;
- lose or overwrite retained partial work;
- exceed the two-task limit;
- integrate tasks simultaneously or from mutable commits;
- mutate the real repository’s branches, worktrees, log, or coordinator state.

Source changes are reversible. An unintended real-repository Git mutation may not be safely reversible without inspection and requires an immediate stop.

## Rollback plan

Immediate runtime rollback is to leave `CAIRN_PARALLEL_DRAFT` unset.

If the Task 016 candidate is rejected after its implementation commit, a separately approved High-Stakes rollback task may run:

```text
git revert [exact Task 016 implementation commit]
```

That returns the disabled candidate to Task 015 behavior without resetting history.

If real coordinator state, a `cairn/task-*` branch, or another worktree appears in this repository, stop with `REAL_PROJECT_MUTATED`, preserve it exactly, and request a separately approved recovery plan.

## Experienced human

No experienced human is required to build this disabled Draft because coordinator execution is confined to newly created synthetic temporary repositories and no network, credential, cost, deployment, external service, or valuable-repository integration is permitted.

Before any future Final task enables it on a valuable repository, a developer experienced with Git worktrees, concurrent state machines, atomic locking, integration conflicts, and crash recovery is required.

## Actions and approvals

Saving and pinning this brief requires a separate exact owner message.

A later exact build approval authorizes only:

- the listed source, test, and report edits;
- local compilation and tests;
- creation and retention of uniquely named synthetic repositories, branches, worktrees, locks, and coordinator state;
- local mock Electron and Playwright rehearsals;
- ignored generated build output; and
- one exact-name implementation/report commit.

It does not authorize:

- activation in this real repository;
- network or real-model access;
- credentials or provider login;
- spending money;
- installing or updating dependencies;
- deployment, publishing, pushing, or releasing;
- messaging anyone;
- writing to an external service;
- deleting or moving retained evidence; or
- reverting any commit.

## DONE requires

DONE requires all of the following:

1. The pinned brief and protected starting state were verified.
2. The expected-red rehearsal reproduced the reviewed defects for the intended reasons.
3. Only eligible Standard/Draft tasks can be admitted.
4. Unsafe, overlapping, dependent, malformed, or external-action tasks are terminally refused and never queued.
5. Refused and provisional tasks do not delay eligible work.
6. At most two admitted tasks can exist.
7. Frozen brief and approval checks occur before every initial builder call and builder retry.
8. Tampering leaves the builder uncalled and retained state intact.
9. Two eligible tasks build concurrently in isolated worktrees.
10. Completed tasks integrate serially from frozen decision commits.
11. Existing decision-freeze and recovery protections remain successful.
12. Default behavior without the flag remains unchanged.
13. Core, CLI, typecheck, desktop, scope, diff, and protected-state checks pass.
14. The real repository gains no coordinator state, task branch, or additional worktree.
15. The report records limitations and retained evidence.
16. The exact-name Task 016 implementation/report commit succeeds.

## STOPPED conditions

Stop with the named blocker when:

- starting facts or protected hashes changed: `STARTING_STATE_CHANGED`;
- the saved brief is not pinned or changed after approval: `BRIEF_NOT_PINNED`;
- the expected-red control does not reproduce the intended defects: `REGRESSION_NOT_REPRODUCED`;
- another tracked file is required: `SCOPE_TOO_NARROW`;
- protected work changes unexpectedly: `PROTECTED_WORK_CHANGED`;
- bounded repair cannot complete the declared checks: `BOUNDED_REPAIR_FAILED`;
- an external or separately gated action becomes necessary: `EXTERNAL_ACTION_REQUIRED`;
- rollback is no longer credible: `ROLLBACK_UNCLEAR`;
- the real repository is mutated by coordinator behavior: `REAL_PROJECT_MUTATED`; or
- a genuine safety failure occurs: `UNSAFE_COORDINATOR_EFFECT`.
