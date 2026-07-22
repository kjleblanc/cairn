# Task 014 — repair the disabled parallel-coordinator Draft

Lane: **High-Stakes**

Mode: **Draft**

Source candidate: Task 013 implementation commit  
`7a4bc45c75e720f719cd735541266df3c9aa79ad`

## Visible outcome

Revise the disabled Task 013 parallel coordinator so its three reviewed failures are fixed:

1. **Freeze the decision-time commit.**

   When an owner records a decision, the coordinator records the exact task-branch commit produced by that decision. Integration must refuse with the stable blocker `DECISION_BRANCH_MOVED` if either the task branch or its worktree moves away from that commit afterward.

   Accepted integration must use the recorded commit itself, not a mutable branch name. It must recheck the branch before advancing `main`. A refusal leaves synthetic `main`, its work log, and the frozen task branch unchanged.

2. **Give the older exclusive task priority.**

   An earlier High-Stakes, Final, Tiny, unknown-classification, or live-action task may proceed alone even when a later task already exists. The later task waits with an explicit exclusivity reason.

   Tests must cover High-Stakes, Final, and live-action cases separately. Two eligible Standard/Draft tasks with disjoint scope must still be allowed to build concurrently.

3. **Recover honestly from engine failure.**

   If the definer engine throws, the task enters `blocked` with `DEFINER_ENGINE_FAILED`. If the builder engine throws, it enters `blocked` with `BUILDER_ENGINE_FAILED`.

   Retrying must reuse the same permanent task number, branch, and worktree. It must not silently reserve another task, discard partial artifacts, reset a branch, or bypass normal metadata, approval, scope, and check gates.

   The desktop must explain the stopped state in plain language and offer the correct retry step after returning to the task or restarting Cairn.

Concurrency remains available only when `CAIRN_PARALLEL_DRAFT=1`. Without that exact flag, core, CLI, and desktop behavior remain unchanged.

This task repairs a candidate for judgment. It does not adopt concurrency as policy or make it the default.

## Milestone movement

`UNCLEAR` — this produces a safer, independently tested coordinator candidate, but it still does not complete the current milestone’s real-model Cairn self-improvement task.

## Decision-commit boundary

The repaired design must:

- save the exact commit returned when the task decision is committed;
- validate that saved value as a full Git commit identifier;
- require it for every newly queued decision;
- fail closed if older retained synthetic state has a queued decision but no frozen decision commit;
- compare both the task branch reference and task-worktree `HEAD` with the frozen commit before integration;
- use the frozen commit—not `task.branch`—as the accepted integration source;
- recheck the task branch before the final fast-forward of `main`;
- preserve the original task branch as decision-time evidence;
- never incorporate a post-decision commit, even when it changes only an otherwise allowed path and passes every declared check.

No automatic migration or repair of Task 013’s retained synthetic coordinator states is permitted.

## Exclusive scheduling boundary

Scheduling uses reservation order:

- an exclusive task waits only for an earlier active task;
- the earliest active exclusive task can proceed while all later tasks wait;
- a later Standard/Draft task waits behind an earlier High-Stakes, Final, or live-action task;
- a later exclusive task waits behind an earlier active task;
- disjoint Standard/Draft tasks remain eligible for parallel building;
- existing overlap, dependency, integration-pending, classification, and two-task-limit gates remain in force.

UI state must not authorize a build; coordinator state remains authoritative.

## Engine-failure recovery boundary

A caught exception from `engine.run` must cause a lock-protected coordinator transition:

- `defining` → `blocked / DEFINER_ENGINE_FAILED`;
- `building` → `blocked / BUILDER_ENGINE_FAILED`.

Recovery must:

- be allowed only for the matching stable blocker;
- reuse the existing task number, branch, and worktree;
- rerun the normal definition or build entry gates;
- retain partial files for scope inspection rather than cleaning them;
- leave a repeatedly failing retry blocked under the same stable name;
- remain recoverable after the desktop is closed and reopened;
- avoid storing raw engine error text in coordinator state.

A process crash that prevents Cairn from catching the exception remains outside this task. No automatic stale-lock or crash cleanup may be added.

## Independent regression tests first

Before changing production source, create new tests that use public Cairn behavior and their own setup helpers. They must not import helpers from or modify Task 013’s `core/test/coordinator.test.ts`.

The new core regression suite must independently demonstrate:

1. A clean post-decision commit on an allowed path is incorrectly integrated by commit `7a4bc45…`.
2. An earlier exclusive task and a later task both wait under commit `7a4bc45…`, covering High-Stakes, Final, and live-action classifications.
3. A thrown definer engine leaves a task in `defining`, and a thrown builder engine leaves a task in `building`, with retry unable to complete.

The builder must run these tests against the unmodified Task 013 production source. That red rehearsal succeeds only when every failure is reproduced for the intended reason. An unexpected pass, compile-only failure, unrelated setup failure, or different failure cause stops the task with `REGRESSION_NOT_REPRODUCED`.

This expected red rehearsal is not a completion check. After implementation, the same tests must pass without weakening their assertions.

A separate desktop recovery test must use a deliberately failing test engine against a newly created synthetic project. It must prove that definer and builder failures are shown honestly and that retry completes the same task number after reopening.

## Files that may change

Only these tracked source and test files may be created or modified during the build:

- `core/package.json`
- `core/src/coordinator.ts`
- `core/src/steps.ts`
- `core/test/coordinator-regressions.test.ts` — new
- `app/src/renderer/screens/Dashboard.tsx`
- `app/src/renderer/screens/Wizard.tsx`
- `app/tests/concurrency-recovery.spec.ts` — new
- `docs/ai-work/tasks/014-report.md` — new during the build

The separately saved and pinned `docs/ai-work/tasks/014-brief.md` is governed by the High-Stakes save step.

Tests may regenerate existing ignored output under `core/dist`, `core/assets`, `app/.vite`, `app/resources`, and `app/test-results`. Generated output must not be staged.

If another tracked file is required, stop with `SCOPE_TOO_NARROW`.

## Files and behavior that must not change

This task must not change:

- Task 013’s brief, report, implementation commit, or existing tests;
- `core/test/coordinator.test.ts`;
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
- default Cairn behavior;
- canonical workflow policy;
- public artifacts;
- credentials, providers, billing, deployment, or external services.

No file may be deleted, moved, renamed, reset, cleaned, stashed, or broadly staged.

## Protected starting work

At planning time:

- `main` is exactly `7a4bc45c75e720f719cd735541266df3c9aa79ad`;
- it is 11 commits ahead of `origin/main`;
- nothing is staged;
- only the main worktree exists;
- no `cairn/task-*` branch exists;
- `.git/cairn` is absent.

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
| `docs/ai-work/LOG.md` | `026A5A7520102F9670D620BB49B94E037D5A0CC85DC1B4EEAE333E05194E8B85` |

These files must remain byte-identical and untracked:

| File | SHA-256 |
|---|---|
| `docs/ai-work/tasks/007-approval.json` | `1204556CD1F51DF44D0EA2069643FE71CAA9BCFC08413E30CC35C6BDA07F2691` |
| `docs/ai-work/tasks/008-approval.json` | `2CB40F65212506ED3037AB1B174A769C7307D1C8D071DA6A7B42B9EDE145344E` |
| `docs/ai-work/tasks/009-approval.json` | `78933AC2EB2A00B6F6C40F92C6EDD2D5EBAF37D98F96C77FCF64F017A366D822` |
| `docs/ai-work/tasks/011-report.md` | `C70BABB41335C4F2D8C39FB44430A915C14F389A86D254524BFDE3E24FADF5F8` |

The builder must recheck these facts and hashes after the brief is pinned and before implementation.

## Safe rehearsal

All coordinator execution must occur in newly created, uniquely named synthetic Git repositories under the operating-system temporary directory.

The rehearsal must:

1. Add the independent regression tests without changing production source.
2. Run the red reproduction and record the intended failures.
3. Implement the narrow fixes.
4. Rerun the same regression tests and prove they pass.
5. Move a synthetic task branch after its decision using an allowed-path commit.
6. Prove integration refuses with `DECISION_BRANCH_MOVED`.
7. Prove synthetic `main` and its log remain byte-identical after refusal.
8. Prove High-Stakes, Final, and live-action tasks each run alone while a later task waits.
9. Prove disjoint Standard/Draft tasks remain parallel-eligible.
10. Throw from synthetic definer and builder engines.
11. Prove both tasks enter their stable blocked states.
12. Retry and prove the same task numbers, branches, and worktrees are reused.
13. Close and reopen the desktop rehearsal before retrying.
14. Confirm ordinary Cairn behavior without the flag.
15. Record every retained temporary root in the report.

No temporary repository, worktree, branch, or folder may be deleted. Cleanup requires separate approval.

## Checks

The builder must run and report the actual result of:

- protected-file SHA-256 comparison before and after;
- the expected red regression rehearsal against the unmodified Task 013 source;
- the same targeted core regression suite after implementation;
- `npm.cmd test --workspace core`;
- `npm.cmd test --workspace cli`;
- `npm.cmd --prefix app run typecheck`;
- `npm.cmd --prefix app run test:smoke -- concurrency-recovery.spec.ts concurrency.spec.ts away.spec.ts smoke.spec.ts`;
- `git diff --check`;
- actual diff inspection against the exact permitted file list;
- confirmation that no dependency or lockfile changed;
- final full Git status;
- final `git worktree list --porcelain`;
- final `git branch --list "cairn/task-*"`;
- final confirmation that `.git/cairn` remains absent in the real repository.

The existing core tests, CLI tests, `away.spec.ts`, and `smoke.spec.ts` are checks not created by this task.

Passing tests prove only the named synthetic scenarios. They cannot establish crash safety on every filesystem or protection from Git commands run outside Cairn.

## What the owner will personally see or try

After the build and mandatory fresh-context review, the owner can run:

```powershell
npm.cmd run build --workspace core
node --test core/dist/test/coordinator-regressions.test.js
```

Success is a passing independent regression suite covering frozen decisions, exclusive-task priority, and both engine-failure recoveries.

The owner can watch recovery in the desktop app with:

```powershell
npm.cmd --prefix app run test:smoke -- concurrency-recovery.spec.ts --headed
```

Success looks like:

- a definer failure shown as safely stopped;
- a clear retry route;
- retry reusing the same task number;
- a builder failure returning to the approved task;
- the same task successfully building after retry.

The existing headed concurrency rehearsal must still work:

```powershell
npm.cmd --prefix app run test:smoke -- concurrency.spec.ts --headed
```

## What could be damaged

A defective repair could:

- integrate changes made after the owner’s decision;
- block every task when one exclusive task exists;
- permit two exclusive tasks to run together;
- reuse or lose a permanently reserved task number;
- hide an engine failure as active work;
- overwrite partial work during recovery;
- weaken legacy behavior;
- mutate the real Cairn repository’s branches, worktrees, or Git metadata.

The source changes are reversible. An unintended integration or real-repository mutation may not be safely reversible without inspection, so those cases require an immediate stop rather than automatic cleanup.

## Rollback plan

Immediate runtime rollback is to leave `CAIRN_PARALLEL_DRAFT` unset.

If Task 014’s candidate is rejected after its implementation commit, a separately approved High-Stakes rollback task may use:

```text
git revert [exact Task 014 implementation commit]
```

It must not revert Task 013, reset history, clean files, remove branches, remove worktrees, or delete temporary evidence.

If any coordinator state, task branch, or worktree unexpectedly appears in the real Cairn repository, stop with `REAL_PROJECT_MUTATED`, preserve it, and request separate recovery approval. Do not remove it automatically.

## Experienced human

No experienced human is required to build this disabled Draft because all coordinator behavior is restricted to synthetic temporary repositories and no live integration is permitted.

Before any future Final task enables the coordinator on a valuable repository, it requires review by a developer experienced with:

- Git commit and reference identity;
- worktrees, rebase conflicts, and recovery;
- concurrent state machines and atomic file locking.

Task 014 also requires Cairn’s mandatory fresh-context review before the owner decides whether to keep it.

## Actions and approvals

Saving and pinning this brief requires the owner’s exact High-Stakes save message.

Building later authorizes only:

- the exact permitted source and test edits;
- synthetic Git repositories, branches, worktrees, and coordinator state under unique temporary folders;
- local mock Electron and Playwright rehearsals;
- ignored build output;
- the named Task 014 implementation/report commit using exact-path staging.

This task does not authorize:

- coordinator activation in the real Cairn repository;
- installing or updating dependencies;
- network or real-model access;
- credentials or login;
- spending money;
- pushing, publishing, releasing, or deploying;
- messaging anyone;
- writing to an external service;
- deleting or moving any file, branch, worktree, lock, or temporary folder.

Each prohibited action requires separate explicit approval in a later task.

## DONE requires

Task 014 is `DONE` only when:

- all three Task 013 failures are independently reproduced before production changes;
- the same tests pass after the fixes;
- decision-time commit movement is detected and refused;
- synthetic `main` and its log remain unchanged after refusal;
- High-Stakes, Final, and live-action precedence cases pass;
- definer and builder engine failures become stable, retryable blocked states;
- retries reuse the original task identity and retained artifacts;
- desktop recovery remains understandable after restart;
- legacy behavior without the flag passes;
- the real repository remains free of coordinator state, task branches, and extra worktrees;
- protected work remains byte-identical;
- all completion checks pass;
- the report records limitations and retained rehearsal paths honestly;
- one exact-name implementation commit contains only the permitted implementation, tests, and report.

## STOPPED conditions

Stop without a success commit on:

- `START_STATE_CHANGED`
- `BRIEF_NOT_PINNED`
- `SCOPE_TOO_NARROW`
- `REGRESSION_NOT_REPRODUCED`
- `DECISION_COMMIT_GATE_FAILED`
- `EXCLUSIVE_SCHEDULING_FAILED`
- `ENGINE_RECOVERY_FAILED`
- `LEGACY_BEHAVIOR_REGRESSED`
- `PROTECTED_WORK_CHANGED`
- `REAL_PROJECT_MUTATED`
- `CHECK_FAILED`
- `ROLLBACK_UNCLEAR`
- `EXPERT_NEEDED`

Do not widen the task to repair a STOPPED condition.

Plain-language summary: this repairs the three reviewed safety failures in Task 013, proves each failure independently before fixing it, and keeps the entire coordinator disabled and confined to disposable test repositories.
