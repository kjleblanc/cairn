# Task 015 — repair the disabled parallel-coordinator Draft

Lane: **High-Stakes**

Mode: **Draft**

Source candidate: Task 013 implementation commit  
`7a4bc45c75e720f719cd735541266df3c9aa79ad`

Revision evidence:

- Task 013’s recorded review found three safety failures: post-decision changes could integrate, exclusive tasks could deadlock, and engine errors could strand tasks.
- Task 014’s recorded review verdict was `VALID STOPPED`.
- Task 014 changed no production source. Its engine tests stopped during setup because their custom definers wrote a brief before creating `docs/ai-work/tasks` in the synthetic worktree.
- Task 014’s retained test work is an input to this task, not proof that Task 015 passes.

## Visible outcome

Revise the disabled Task 013 parallel coordinator so all three reviewed failures are repaired:

1. **Freeze the decision-time commit.**

   When the owner records a decision, the coordinator records the exact task commit created by that decision.

   Integration must refuse with `DECISION_BRANCH_MOVED` if the task branch or its worktree moves afterward. Accepted integration must use the recorded commit, never a mutable branch name.

2. **Give the older exclusive task priority.**

   An earlier High-Stakes, Final, Tiny, unknown-classification, or live-action task can proceed alone. Later tasks wait with a clear reason.

   Disjoint Standard/Draft tasks remain eligible to run in parallel.

3. **Recover honestly from engine failure.**

   A caught definer failure becomes `blocked / DEFINER_ENGINE_FAILED`. A caught builder failure becomes `blocked / BUILDER_ENGINE_FAILED`.

   Retry reuses the same task number, branch, worktree, approval, and retained partial files. It does not reserve another task or reset work.

The desktop shows the stopped state in plain language and provides the correct retry route after Cairn is closed and reopened.

Concurrency remains available only when `CAIRN_PARALLEL_DRAFT=1`. This task does not activate it in the real repository, adopt it as policy, or make it the default.

## Milestone movement

`UNCLEAR` — this creates a safer, reviewable concurrency candidate, but it does not complete the current milestone’s real-model Cairn self-improvement task.

## Decision-commit boundary

The repaired coordinator must:

- save the complete 40-character Git commit identifier returned when the decision artifacts are committed;
- validate any stored decision commit as a complete Git identifier;
- require a frozen commit for every newly queued decision;
- fail closed with `DECISION_COMMIT_MISSING` when retained queued state has no frozen commit;
- reject malformed retained values as `UNSUPPORTED_STATE`;
- compare both the task branch and task-worktree `HEAD` with the frozen commit before integration;
- use the frozen commit, not `task.branch`, as the accepted integration source;
- update a detached synthetic integration worktree against current serialized `main`, leaving the evidence branch unchanged;
- rerun the declared checks in that detached integration candidate;
- recheck the task branch, task-worktree `HEAD`, coordinator lease and revision, and `main` immediately before advancing `main`;
- leave synthetic `main`, its work log, the task branch, and its worktree unchanged when movement is refused;
- never incorporate post-decision changes, even when they affect only an allowed path and pass every check.

No automatic migration or repair of retained Task 013 or Task 014 coordinator state is permitted.

## Exclusive scheduling boundary

Scheduling follows reservation order:

- an exclusive task waits only for an earlier active task;
- the earliest active exclusive task can proceed while every later task waits;
- later Standard/Draft tasks wait behind an earlier High-Stakes, Final, Tiny, unknown, or live-action task;
- a later exclusive task waits behind any earlier active task;
- disjoint Standard/Draft tasks remain parallel-eligible;
- dependency, overlap, classification, integration-pending, and two-task-limit gates remain in force;
- coordinator state, not renderer state, remains authoritative.

## Engine-failure recovery boundary

A caught `engine.run` exception must cause a lock-protected transition:

- `defining` → `blocked / DEFINER_ENGINE_FAILED`;
- `building` → `blocked / BUILDER_ENGINE_FAILED`.

Definition retry must:

- detect the single preserved `DEFINER_ENGINE_FAILED` task before reserving anything new;
- reuse its permanent task number, branch, and worktree;
- re-enter `defining` under the coordinator lock;
- retain and expose the partial brief for inspection;
- rerun normal metadata validation before reaching `defined`.

Build retry must:

- accept only the matching `BUILDER_ENGINE_FAILED` task number;
- revalidate the locked brief and approval;
- inspect retained partial changes against the allowed-path boundary before resuming;
- rerun waiting, dependency, overlap, classification, and main-position gates;
- preserve the branch, worktree, and partial allowed work;
- pass through the normal report, disposition, scope, and check gates after the engine succeeds.

Both paths must:

- remain blocked under the same stable name after repeated failures;
- remain retryable after the desktop restarts;
- never store raw engine error text in coordinator state;
- never reset, clean, delete, or silently overwrite retained evidence.

A process or machine crash that prevents Cairn from catching the exception remains outside this task. No stale-lock recovery or automatic cleanup may be added.

## Corrected independent regression setup

Task 014’s retained regression suite must be corrected before any production source changes.

The correction must:

- use newly named `cairn-task-015-*` synthetic repositories;
- create `dirname(briefPath)` recursively before every custom definer writes either a partial or complete brief;
- include a setup control proving a successful custom definer can create its brief on unchanged Task 013 source;
- exercise the unsafe behavior completely before making its final safety assertions;
- avoid an early assertion that prevents the decision test from attempting integration;
- catch engine errors long enough to inspect the resulting coordinator phase and retry identity;
- use public Cairn behavior and independent helpers;
- neither import helpers from nor modify `core/test/coordinator.test.ts`.

Against unchanged Task 013 production source, the red rehearsal must establish these intended failures:

1. **Decision freeze:** after a decision, an allowed-path commit moves the task branch; Task 013 integrates that moved commit and advances synthetic `main` or its log instead of refusing it.

2. **Exclusive scheduling:** an earlier High-Stakes, Final, or live-action task cannot enter `building` because the later task causes both to wait.

3. **Engine recovery:** after setup succeeds, thrown definer and builder engines leave their tasks in `defining` and `building`; retry cannot complete the same task identity.

The disjoint Standard/Draft control and custom-definer setup control must pass during the red run.

Any compile failure, `ENOENT`, unrelated setup error, unexpected pass, or different failure cause stops the task with `REGRESSION_NOT_REPRODUCED`.

After the production repair, the same tests must pass without removing cases, weakening assertions, or changing the expected safety behavior.

## Files that may change

Only these files may be created or modified during the build:

- `core/package.json` — retain or narrowly adjust Task 014’s registration of the regression suite;
- `core/src/coordinator.ts`;
- `core/src/steps.ts`;
- `core/test/coordinator-regressions.test.ts` — correct and adopt Task 014’s retained untracked suite;
- `app/src/renderer/screens/Dashboard.tsx`;
- `app/src/renderer/screens/Wizard.tsx`;
- `app/tests/concurrency-recovery.spec.ts` — new;
- `docs/ai-work/tasks/015-report.md` — new during the build.

The separately saved and pinned `docs/ai-work/tasks/015-brief.md` is governed by the High-Stakes save step.

Tests may regenerate ignored output under `core/dist`, `core/assets`, `app/.vite`, `app/resources`, and `app/test-results`. Generated output must not be staged.

If another tracked source file is required, stop with `SCOPE_TOO_NARROW`.

## Files and behavior that must not change

This task must not change:

- Task 013’s brief, report, implementation commit, or existing tests;
- Task 014’s brief, report, retained evidence directories, or review record;
- `core/test/coordinator.test.ts`;
- `app/tests/concurrency.spec.ts`;
- CLI source or tests;
- dependencies or lockfiles;
- `AGENTS.md`;
- `CHANGELOG.md`;
- `CONTRACT-TEMPLATE.md`;
- `EVERYDAY-WORKFLOW.md`;
- `GETTING-READY.md`;
- `HIGH-STAKES.md`;
- `README.md`;
- `cairn.html`;
- `index.html`;
- `docs/ai-work/PROJECT.md`;
- `docs/ai-work/LOG.md`;
- `docs/ai-work/PILOT.md`;
- any earlier task artifact;
- canonical workflow policy;
- public artifacts;
- behavior when `CAIRN_PARALLEL_DRAFT` is absent;
- credentials, providers, billing, deployment, or external services.

No file, branch, worktree, lock, or temporary evidence directory may be deleted, moved, renamed, reset, cleaned, stashed, or broadly staged.

## Protected starting state

At planning time:

- `main` is `4c9f853b633c2be3e9080dbfff527e43dafa2a66`;
- it is 12 commits ahead of `origin/main`;
- nothing is staged;
- only the main worktree exists;
- no `cairn/task-*` branch exists;
- `.git/cairn` is absent;
- Task 015 is the next unused task number;
- the permitted Task 013 production files remain byte-equivalent to the Task 013 candidate.

Saving the brief may add one pinned Task 015 brief commit whose parent is the planning commit above. Before building, that pinned brief commit must be the only expected committed change.

These modified files must remain byte-identical:

| File | SHA-256 |
|---|---|
| `CHANGELOG.md` | `760DF019240F8539E96074D8D8DFFAA3AC2E11EC85A573394AD6CCA15783CB85` |
| `CONTRACT-TEMPLATE.md` | `92B1D74630D2B4D588DBDD0670CF14CD45C78763AD8E9143624E458B2559E5BB` |
| `EVERYDAY-WORKFLOW.md` | `577CAD0E89C57C46733C5A2C1A666650D05D4850FA5287BA321ACD1C8E619ABC` |
| `GETTING-READY.md` | `5FA9D8A338FD2DF73AD4E059A8C956D53D0933E34F11B0DA27FA0289920406` |
| `HIGH-STAKES.md` | `267161B307C7B4EE576353566112B6BE65E57391B7F8014793BAF9B58FCB2389` |
| `README.md` | `3AA6133267C2F437741101FC9F31F09C78F8C8246D3E9FA871F300AFA6D8A7B1` |
| `cairn.html` | `40B4EEE8707DD0CEB046BCF438025C51E3246982D95C2B5837566C169F80A0FF` |
| `docs/ai-work/LOG.md` | `D1CAB6F944991B820926611091A9058359F9985ED1EF2D9FEC73552351CD783D` |

The `LOG.md` value above deliberately replaces Task 014’s historical pre-decision value. It includes the recorded Task 014 decision and review verdict.

These files must remain byte-identical and untracked:

| File | SHA-256 |
|---|---|
| `docs/ai-work/tasks/007-approval.json` | `1204556CD1F51DF44D0EA2069643FE71CAA9BCFC08413E30CC35C6BDA07F2691` |
| `docs/ai-work/tasks/008-approval.json` | `2CB40F65212506ED3037AB1B174A769C7307D1C8D071DA6A7B42B9EDE145344E` |
| `docs/ai-work/tasks/009-approval.json` | `78933AC2EB2A00B6F6C40F92C6EDD2D5EBAF37D98F96C77FCF64F017A366D822` |
| `docs/ai-work/tasks/011-report.md` | `C70BABB41335C4F2D8C39FB44430A915C14F389A86D254524BFDE3E24FADF5F8` |
| `docs/ai-work/tasks/014-report.md` | `A67C8E09DFABDAF9B600B692FD31551B456DA50DFC4D452FB1F4D891CF6C3795` |

These reviewed Task 014 test inputs may change only within this task’s permitted boundary:

| File | Starting SHA-256 |
|---|---|
| `core/package.json` | `7AB492A38E5807903D43EF693F9933D0B76B94174158D45C71D2DEAF3B10C709` |
| `core/test/coordinator-regressions.test.ts` | `8727478505A4861457B798D54E04F094A45DBBFB357A9F585A799187E14BF29F` |

The builder must recheck all facts and hashes after the brief is pinned and before editing.

## Safe rehearsal

All coordinator execution must occur in newly created, uniquely named synthetic Git repositories under the operating-system temporary directory.

The rehearsal must:

1. Correct only the retained regression setup and test labels.
2. Verify the permitted production source still matches Task 013.
3. Compile the corrected tests against unchanged production source.
4. Run the expected-red rehearsal and record all three intended failure categories.
5. Stop if either engine test reports `ENOENT` or another setup failure.
6. Implement the narrow production and desktop repairs.
7. Rerun the unchanged regression assertions and prove they pass.
8. Move a synthetic task branch after its decision through an allowed-path commit.
9. Prove integration refuses with `DECISION_BRANCH_MOVED`.
10. Prove synthetic `main`, its log, task branch, and task worktree remain unchanged after refusal.
11. Prove retained queued state without a decision commit fails closed.
12. Prove malformed decision-commit state is rejected.
13. Prove High-Stakes, Final, and live-action tasks each run alone while later work waits.
14. Prove disjoint Standard/Draft tasks remain parallel-eligible.
15. Throw from synthetic definer and builder engines after their parent directories exist.
16. Prove both tasks enter their stable blocked states without raw error text in coordinator state.
17. Retry and prove the same task numbers, branches, worktrees, approvals, and partial artifacts are retained.
18. Seed desktop recovery states through Cairn’s public core API using a local failing test engine.
19. Open, close, and reopen the desktop rehearsal before retrying.
20. Confirm ordinary Cairn behavior without the environment flag.
21. Record every retained temporary root in the report.

No temporary repository, worktree, branch, lock, file, or folder may be deleted. Cleanup requires separate approval.

## Checks

The builder must run and report the actual results of:

- pinned-brief and parent-commit verification;
- pre-build and post-build protected-file SHA-256 comparisons;
- starting-hash verification for the two retained Task 014 test inputs;
- verification that permitted production source still matches Task 013 before the red run;
- `npm.cmd run build --workspace core`;
- the expected-red `node --test core/dist/test/coordinator-regressions.test.js` run against unchanged production;
- inspection proving every red failure occurred for its intended reason;
- the same targeted regression suite after implementation;
- `npm.cmd test --workspace core`;
- `npm.cmd test --workspace cli`;
- `npm.cmd --prefix app run typecheck`;
- `npm.cmd --prefix app run test:smoke -- concurrency-recovery.spec.ts concurrency.spec.ts away.spec.ts smoke.spec.ts`;
- `git diff --check`;
- actual diff inspection against the exact permitted-file list;
- confirmation that no dependency or lockfile changed;
- confirmation that no earlier task artifact was staged;
- final full Git status;
- final `git worktree list --porcelain`;
- final `git branch --list "cairn/task-*"`;
- final confirmation that `.git/cairn` remains absent in the real repository;
- exact-name staging and inspection of the Task 015 implementation commit.

The existing core tests, CLI tests, `concurrency.spec.ts`, `away.spec.ts`, and `smoke.spec.ts` are checks not created by this task.

Passing tests prove only the named synthetic scenarios. They do not establish crash safety on every filesystem or protection against Git commands run outside Cairn.

## What the owner will personally see or try

After the build and mandatory fresh-context review, the owner can run:

```powershell
npm.cmd run build --workspace core
node --test core/dist/test/coordinator-regressions.test.js
```

Success is a passing suite covering decision freezing, exclusive-task priority, setup controls, and both engine-recovery paths.

The owner can watch recovery in the desktop app with:

```powershell
npm.cmd --prefix app run test:smoke -- concurrency-recovery.spec.ts --headed
```

Success looks like:

- a definer failure shown as safely stopped;
- the same task number offered for definition retry after reopening;
- a builder failure returning to its already approved task;
- retained partial work visible to the recovery engine;
- the same task completing after retry.

The existing headed concurrency rehearsal must also remain successful:

```powershell
npm.cmd --prefix app run test:smoke -- concurrency.spec.ts --headed
```

None of these commands activates the coordinator in the real repository.

## What could be damaged

A defective repair could:

- integrate changes made after the owner’s decision;
- alter the evidence branch while preparing integration;
- block every task when one exclusive task exists;
- permit two exclusive tasks to run together;
- reuse or lose a permanently reserved task number;
- hide an engine failure as active work;
- discard or overwrite partial work during recovery;
- bypass approval, scope, dependency, or check gates;
- weaken default Cairn behavior;
- mutate the real repository’s branches, worktrees, or Git metadata.

Source changes are reversible. An unintended real-repository integration or Git mutation may not be safely reversible without inspection, so it requires an immediate stop rather than automatic cleanup.

## Rollback plan

Immediate runtime rollback is to leave `CAIRN_PARALLEL_DRAFT` unset.

If the Task 015 candidate is rejected after its implementation commit, a separately approved High-Stakes rollback task may use:

```text
git revert [exact Task 015 implementation commit]
```

That rollback must not revert Task 013 or the pinned Task 014 and Task 015 briefs. It must not reset history, clean files, remove branches or worktrees, or delete retained evidence.

If coordinator state, a `cairn/task-*` branch, or another worktree unexpectedly appears in the real repository, stop with `REAL_PROJECT_MUTATED`, preserve the state exactly, and request a separately approved recovery plan. Do not remove it automatically.

## Experienced human

No experienced human is required to build this disabled Draft because:

- coordinator execution is confined to synthetic temporary repositories;
- no valuable repository integration is permitted;
- the feature remains off unless the exact environment flag is supplied;
- no credential, network, production, destructive, or external action is involved.

Cairn’s mandatory fresh-context review is still required before the owner decides whether to keep the Draft.

Before any future Final task enables this coordinator on a valuable repository, it requires review by a developer experienced with Git commit identity, worktrees, concurrent state machines, atomic locking, integration conflicts, and failure recovery.

## Actions and approvals

Saving and pinning this brief requires the owner’s exact High-Stakes save message.

A later exact build approval authorizes only:

- the listed source and test edits;
- creation and retention of uniquely named synthetic temporary repositories, branches, worktrees, locks, and coordinator state;
- local mock Electron and Playwright rehearsals;
- ignored local build output;
- one exact-name Task 015 implementation/report commit using named-file staging.

No live action is part of this Draft.

The following each require separate explicit approval and are not authorized:

1. activating the coordinator in the real Cairn repository;
2. running it against another valuable repository;
3. deleting or moving retained temporary evidence, branches, worktrees, locks, or files;
4. installing or updating a dependency;
5. network or real-model access;
6. using credentials or logging into a provider;
7. spending money;
8. pushing, publishing, releasing, or deploying;
9. messaging anyone;
10. writing to an external service;
11. reverting the Task 015 implementation commit.

## DONE requires

Task 015 is `DONE` only when:

- the Task 014 test-directory setup defect is corrected before production edits;
- all three Task 013 failures are independently reproduced for their intended reasons;
- no red failure is caused by compilation, `ENOENT`, or unrelated setup;
- the same regression assertions pass after the fixes;
- post-decision movement is detected and refused;
- the frozen evidence branch and synthetic `main` remain unchanged after refusal;
- missing and malformed decision commits fail closed;
- High-Stakes, Final, and live-action precedence cases pass;
- disjoint Standard/Draft parallel eligibility remains;
- definer and builder failures become stable, retryable blocked states;
- retries reuse the original task identity, approval, and retained artifacts;
- desktop recovery remains understandable after restart;
- legacy behavior without the flag passes;
- the real repository remains free of coordinator state, task branches, and extra worktrees;
- protected work remains byte-identical;
- all completion checks pass;
- the report records actual commands, limitations, and every retained rehearsal path;
- one exact-name implementation commit contains only the permitted implementation, tests, and Task 015 report.

## STOPPED conditions

Stop without a success commit on:

- `START_STATE_CHANGED`
- `BRIEF_NOT_PINNED`
- `SCOPE_TOO_NARROW`
- `REGRESSION_NOT_REPRODUCED`
- `DECISION_COMMIT_GATE_FAILED`
- `EXCLUSIVE_SCHEDULING_FAILED`
- `ENGINE_RECOVERY_FAILED`
- `DESKTOP_RECOVERY_FAILED`
- `LEGACY_BEHAVIOR_REGRESSED`
- `PROTECTED_WORK_CHANGED`
- `REAL_PROJECT_MUTATED`
- `CHECK_FAILED`
- `ROLLBACK_UNCLEAR`
- `EXPERT_NEEDED`

Do not widen the task to repair a STOPPED condition.

Plain-language summary: this proposal carries Task 014’s useful test work forward, fixes its setup and current protection hash, reruns all three Task 013 failures from scratch, repairs only those failures, and keeps the resulting Draft disabled and away from the real repository’s Git state.
