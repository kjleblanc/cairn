# Task 013 — brief

Status: **Proposed in chat only — not saved or approved**

Lane: **High-Stakes**

Mode: **Draft**

## Visible outcome

Cairn gains an explicitly opt-in concurrency Draft, enabled only with `CAIRN_PARALLEL_DRAFT=1`, that demonstrates:

- one coordinator per Git project;
- atomic, never-reused task-number reservations;
- one `cairn/task-NNN` branch and isolated worktree per task;
- machine-readable allowed paths, dependencies, checks, and external actions;
- separate brief, approval, report, and decision state for every task;
- at most two simultaneous tasks, and only when both are Standard/Draft;
- overlapping or dependent tasks waiting instead of building;
- High-Stakes, Final, or live-action tasks remaining exclusive;
- independent task lifecycles;
- accepted results entering a serialized integration queue;
- updates against latest `main`, checks rerun, and one integration at a time;
- `docs/ai-work/LOG.md` changing only during integration.

The desktop Draft shows both tasks separately and lets the owner return to either one. Closing one does not require closing the other.

Without the environment flag, Cairn behaves exactly as it does now. This Draft is not adopted policy and does not make parallel tasks the default.

## Milestone movement

This creates a judgeable safety foundation for Cairn maintainers to run isolated improvements without disk collisions. It does not itself complete a real-model task or activate concurrency on a valuable project, so direct movement toward the current milestone remains **UNCLEAR** until the owner evaluates the Draft.

## Candidate coordinator design

The Draft will use the repository’s shared Git directory so every worktree and Cairn process sees the same coordinator state:

- state: `.git/cairn/coordinator-v1.json`;
- lock: `.git/cairn/coordinator-v1.lock`;
- previous valid state retained as a backup;
- task branches: `cairn/task-NNN`;
- task worktrees: a clearly named sibling worktree area recorded as an absolute path in coordinator state.

State updates must:

1. acquire the lock atomically using exclusive file creation;
2. read and validate the complete current schema;
3. write a complete temporary replacement;
4. replace the state atomically;
5. release the lock.

A missing, stale, corrupt, or unsupported lock/state fails closed. The Draft must not guess, reconstruct state silently, reuse a reserved number, or automatically delete a stale lock.

Each task record contains at least:

- schema version and task number;
- project root, base commit, branch, and worktree;
- lane and Draft/Final mode;
- lifecycle phase;
- exact repository-relative allowed paths;
- task-number dependencies;
- declared safe checks;
- declared external actions;
- brief and approval hashes;
- decision and disposition;
- integration state and queue position;
- timestamps and stable blocker names.

Every generated brief contains one strict JSON metadata block. Paths must be exact repository-relative paths: no absolute paths, parent traversal, `.git` paths, shell expansion, or broad wildcard scope.

Task-owned brief, approval, report, and decision artifacts are automatically permitted and do not create false overlap between tasks.

## Reservation and worktree behavior

- The coordinator reserves the number before an agent writes anything.
- The reservation advances permanently, even if worktree creation later fails.
- A reservation in progress is recorded rather than hidden or reused.
- Git worktree creation uses the reserved number, `cairn/task-NNN`, and the recorded base commit.
- Worktree or branch collisions stop safely and preserve evidence.
- Real activation must require a clean `main`, the expected repository root, a usable Git identity, and no unfinished Git operation.
- The current dirty Cairn repository must refuse real Draft activation with a plain explanation.

## Concurrency rules

- No more than two non-integrated tasks may exist concurrently.
- Parallel work is allowed only when both tasks are `Lane: Standard`, `Mode: Draft`, and declare no live external action.
- Exact allowed-path overlap makes the later task wait.
- A dependency waits until the named task is successfully integrated.
- High-Stakes, Final, unknown-lane, malformed-scope, or live-action tasks are exclusive.
- Defined or waiting tasks remain independently navigable.
- No new task starts while a pending decision still needs log integration and could make the Direction Gate’s main-log view stale.

The coordinator state is authoritative for scheduling. UI state alone must never authorize a build.

## Build and scope enforcement

The coordinator resolves the task’s worktree; callers cannot supply an arbitrary build folder.

The builder receives the worktree as its root. Direct file-writing tools are limited to:

- the exact allowed paths;
- that task’s report;
- other explicitly permitted task-owned artifacts.

After every build, the coordinator independently compares the real Git changes with the frozen machine-readable scope. Any undeclared path blocks approval, queueing, and integration even if the agent claimed success.

Shell commands remain subject to existing Cairn gates. Post-build Git inspection is mandatory because shell commands cannot safely be trusted from path declarations alone.

## Independent decisions and integration

A task decision is saved against that task only. It does not close or cancel another task.

All decisions enter serialized coordinator handling:

- accepted work queues its branch plus its eventual log row;
- revise, defer, rollback, or escalate queues a log-only integration;
- only one integration may touch `main` at a time.

For accepted work, integration must:

1. acquire the integration lease;
2. verify clean, expected `main` and unchanged coordinator state;
3. update the task branch against the latest `main`;
4. stop and return the task branch safely if conflicts occur;
5. recheck actual changed paths against the approved scope;
6. rerun every approved safe check;
7. append exactly one decision row to the latest work log;
8. commit the integration result;
9. advance `main` only after every check passes;
10. record the final integrated commit.

A conflict, failed check, changed `main`, or invalid scope leaves `main` and its work log unchanged. No worktree or branch is automatically removed after integration.

Manual Git activity cannot be physically prevented, so the coordinator must detect unexpected changes and fail closed.

## Draft boundary

The Draft may run its complete coordinator behavior only inside newly created throwaway Git repositories under the system temporary directory.

It must not create any of the following in this real Cairn repository:

- `.git/cairn`;
- a `cairn/task-*` branch;
- another real worktree;
- an integration queue entry;
- a real parallel Cairn task.

The opt-in desktop path must also refuse this repository because its main worktree contains protected uncommitted work.

## Files that may change

Only these tracked source files may be created or modified during the build:

### Core

- `core/package.json`
- `core/src/agents.ts`
- `core/src/coordinator.ts` — new
- `core/src/files.ts`
- `core/src/gates.ts`
- `core/src/index.ts`
- `core/src/prompts.ts`
- `core/src/steps.ts`
- `core/test/agents.test.ts`
- `core/test/coordinator.test.ts` — new
- `core/test/files.test.ts`
- `core/test/steps.test.ts`

### Desktop app

- `app/src/main/ipc.ts`
- `app/src/main/tasks.ts`
- `app/src/preload.ts`
- `app/src/shared/ipc.ts`
- `app/src/renderer/App.tsx`
- `app/src/renderer/app.css`
- `app/src/renderer/components/RunReminder.tsx`
- `app/src/renderer/components/TaskDeck.tsx` — new
- `app/src/renderer/screens/Dashboard.tsx`
- `app/src/renderer/screens/Wizard.tsx`
- `app/tests/concurrency.spec.ts` — new

### CLI fail-closed compatibility

- `cli/package.json`
- `cli/src/flows/status.ts`
- `cli/src/flows/task.ts`
- `cli/test/coordinator.test.ts` — new

### Task record

- `docs/ai-work/tasks/013-report.md` — new during the approved build

The saved and pinned `docs/ai-work/tasks/013-brief.md` is governed by the separate High-Stakes save step.

Tests may regenerate only existing ignored build output under `core/dist`, `core/assets`, `cli/dist`, `app/.vite`, `app/resources`, and `app/test-results`. Nothing generated may be staged.

If another tracked file is required, stop with `SCOPE_TOO_NARROW`.

## Files and behavior that must not change

This Draft must not change:

- `AGENTS.md`;
- `CONTRACT-TEMPLATE.md`;
- `CHANGELOG.md`;
- `EVERYDAY-WORKFLOW.md`;
- `GETTING-READY.md`;
- `HIGH-STAKES.md`;
- `README.md`;
- `cairn.html`;
- `index.html`;
- `docs/ai-work/PROJECT.md`;
- `docs/ai-work/LOG.md`;
- `docs/ai-work/PILOT.md`;
- any earlier brief, approval, report, or decision;
- dependencies or lockfiles;
- default Cairn behavior;
- canonical workflow policy;
- public artifacts;
- real credentials, model providers, billing, deployment, or external services.

No existing file may be deleted, moved, renamed, reset, cleaned, stashed, or overwritten outside the exact permitted edits.

## Protected starting work

At planning time, `main` is at `874636f32a84bdcf20a5da833c9f62af29641fbe`, nine commits ahead of `origin/main`.

These modified files must remain byte-identical:

| File | SHA-256 |
|---|---|
| `CHANGELOG.md` | `760DF019240F8539E96074D8D8DFFAA3AC2E11EC85A573394AD6CCA15783CB85` |
| `CONTRACT-TEMPLATE.md` | `92B1D74630D2B4D588DBDD0670CF14CD45C78763AD8E9143624E458B2559E5BB` |
| `EVERYDAY-WORKFLOW.md` | `577CAD0E89C57C46733C5A2C1A666650D05D4850FA5287BA321ACD1C8E619ABC` |
| `GETTING-READY.md` | `5FA9D8A338FD2DF73AD4C05919A8C956D53D0933E34F11B0DA27FA0289920406` |
| `HIGH-STAKES.md` | `267161B307C7B4EE576353566112B6BE65E57391B7F8014793BAF9B58FCB2389` |
| `README.md` | `3AA6133267C2F437741101FC9F31F09C78F8C8246D3E9FA871F300AFA6D8A7B1` |
| `cairn.html` | `40B4EEE8707DD0CEB046BCF438025C51E3246982D95C2B5837566C169F80A0FF` |
| `docs/ai-work/LOG.md` | `1A6771996084DAB29A00CA4AA9FC857F5090C705D2F788FF2A611821793422A8` |

These untracked files must remain byte-identical and untracked:

| File | SHA-256 |
|---|---|
| `docs/ai-work/tasks/007-approval.json` | `1204556CD1F51DF44D0EA2069643FE71CAA9BCFC08413E30CC35C6BDA07F2691` |
| `docs/ai-work/tasks/008-approval.json` | `2CB40F65212506ED3037AB1B174A769C7307D1C8D071DA6A7B42B9EDE145344E` |
| `docs/ai-work/tasks/009-approval.json` | `78933AC2EB2A00B6F6C40F92C6EDD2D5EBAF37D98F96C77FCF64F017A366D822` |
| `docs/ai-work/tasks/011-report.md` | `C70BABB41335C4F2D8C39FB44430A915C14F389A86D254524BFDE3E24FADF5F8` |

The real repository currently has no `.git/cairn` directory, no `cairn/task-*` branch, and only its main worktree. Those facts must remain true.

The builder must recheck these facts and hashes after the brief is pinned and before implementation starts.

## Safe rehearsal

The automated rehearsal must:

1. Create a unique temporary folder.
2. Confirm every planned mutation resolves inside that folder.
3. Initialize a fake local Git repository with synthetic Cairn files and a test-only local Git identity.
4. Start two separate operating-system processes that reserve task numbers simultaneously.
5. Prove they receive distinct, consecutive numbers.
6. Prove each receives its own branch and worktree.
7. Define two Standard/Draft tasks with disjoint exact scopes.
8. Run both mock builds with an overlap barrier proving they were active simultaneously.
9. Prove each changed only its own worktree.
10. Show an overlapping task waiting.
11. Show a dependent task waiting until its dependency integrates.
12. Show High-Stakes and live-action tasks refusing concurrency.
13. Close one task while the other remains open.
14. Queue and integrate the first task.
15. Update the second against the new latest `main`, rerun its checks, and integrate it second.
16. Prove the work log received exactly one row per integration and none beforehand.
17. Simulate a conflict, a failed check, a corrupt state file, and a stale lock.
18. Prove each failure leaves synthetic `main` and its log unchanged.
19. Launch the desktop app in mock mode with the Draft flag and show two separately navigable tasks.
20. Confirm the CLI reports the active tasks but refuses to bypass the coordinator.
21. Record every retained temporary path in the report.

The rehearsal must use no real model, network, credentials, cost, external service, or real project worktree.

Temporary repositories and worktrees must be left in place for inspection. Deleting them requires separate approval.

## Checks

The builder must run and report the real result of:

- protected-file SHA-256 comparison before and after;
- `npm test --workspace core`;
- `npm test --workspace cli`;
- `npm --prefix app run typecheck`;
- the new targeted desktop concurrency test;
- existing `app/tests/away.spec.ts`, proving default single-session behavior still works without the flag;
- existing `app/tests/smoke.spec.ts`, proving the ordinary loop still closes normally;
- the cross-process atomic-reservation stress rehearsal;
- integration conflict and failed-check rehearsals;
- `git diff --check`;
- actual diff inspection against the permitted file list;
- final full Git status;
- final `git worktree list --porcelain`;
- final `git branch --list "cairn/task-*"`;
- final confirmation that `.git/cairn` does not exist in this real repository.

The existing core, CLI, away, and smoke checks count as checks that were not created by Task 013.

Passing tests prove only the named synthetic scenarios. They cannot prove crash safety on every filesystem, correct behavior on every operating system, or protection from manual Git commands outside Cairn.

## What the owner will personally see or try

After the build and mandatory fresh-context review, the owner can run the targeted desktop test in headed mode:

```powershell
npm --prefix app run test:smoke -- concurrency.spec.ts --headed
```

Success looks like:

- an unmistakable “Parallel Draft — not active by default” label;
- Task 001 and Task 002 shown separately;
- one-click return to either task;
- different branches and worktree paths;
- overlapping or dependent work visibly waiting;
- one task entering integration without closing the other;
- the log changing only after serialized integration.

Failure includes duplicate numbers, the same folder used twice, mixed task events, a third concurrent task, unsafe work proceeding, early log changes, or ordinary Cairn changing without the flag.

The report must also name the retained temporary repository so the owner or reviewer can inspect its branches, worktrees, coordinator state, and log.

## What could be damaged

A defective coordinator could:

- assign duplicate task numbers;
- send an agent into the wrong worktree;
- allow overlapping edits;
- route questions or output to the wrong task;
- merge against stale `main`;
- write the shared log too early or twice;
- leave partial branches, worktrees, locks, or state;
- overwrite valuable work during cleanup.

The Draft limits those risks to source code behind an off-by-default flag and synthetic temporary repositories. The most serious remaining risk is accidentally activating it against this real dirty project; therefore that path must fail closed and be tested.

## Rollback plan

Immediate safe rollback is to leave `CAIRN_PARALLEL_DRAFT` unset. Legacy behavior must remain the default.

If the Draft implementation is later rejected, a separately approved High-Stakes rollback task will use an additive:

```text
git revert [exact Task 013 implementation commit]
```

It must never use reset, clean, stash, broad checkout, or deletion.

No temporary worktree, branch, lock, or folder is automatically removed. If unexpected real-project coordinator state appears, stop, record its exact paths, and request separate recovery approval instead of cleaning it.

## Experienced human

No experienced human is required to build this disabled Draft because it performs only local code changes, mock execution, and synthetic Git rehearsal in newly created temporary folders.

Before any later Final task enables this behavior on a valuable project, review is required from a developer experienced with:

- Git worktrees and merge/conflict recovery;
- atomic file locking and crash recovery on Windows and Unix-like systems;
- concurrent process coordination.

A mandatory fresh-context Cairn review is also required for Task 013 before the owner closes it.

## Actions and approvals

The following are authorized only through Cairn’s later exact save and build messages:

- save and pin only `docs/ai-work/tasks/013-brief.md`;
- edit only the permitted implementation files;
- create synthetic repositories, branches, worktrees, and coordinator state inside unique temporary folders;
- regenerate ignored local build output;
- create the exact Task 013 implementation/report commit using named staging.

The following are not authorized and require separate explicit approval in a new task:

- enabling concurrency by default;
- changing canonical workflow documents or policy;
- creating coordinator state, task branches, or worktrees in this real project;
- integrating a synthetic or real parallel task into this real `main`;
- deleting or moving any file, branch, worktree, lock, or temporary folder;
- installing or updating dependencies;
- network or real-model access;
- credentials or provider login;
- spending money;
- pushing, publishing, releasing, or deploying;
- messaging anyone;
- writing to any external service.

## DONE requires

Task 013 is `DONE` only when:

- the implementation stays inside the exact permitted files;
- legacy Cairn remains the default;
- the real repository’s branches, worktrees, and `.git` coordinator state remain unchanged;
- the full synthetic rehearsal proves unique reservations, isolation, scope waiting, exclusivity, independent closure, and serialized integration;
- conflict, check-failure, corrupt-state, and stale-lock cases all fail closed;
- existing checks and new checks pass;
- protected work remains byte-identical;
- rollback evidence is credible;
- the report states limitations honestly;
- one exact-name Task 013 implementation commit contains only the brief, permitted implementation, and report.

## STOPPED conditions

Stop without a success commit if any of these occurs:

- `START_STATE_CHANGED`
- `BRIEF_NOT_PINNED`
- `SCOPE_TOO_NARROW`
- `PROTECTED_WORK_CHANGED`
- `REAL_PROJECT_MUTATED`
- `ATOMICITY_UNPROVEN`
- `WORKTREE_ISOLATION_FAILED`
- `SCOPE_GATE_FAILED`
- `INTEGRATION_SAFETY_FAILED`
- `LEGACY_BEHAVIOR_REGRESSED`
- `CHECK_FAILED`
- `ROLLBACK_UNCLEAR`
- `EXPERT_NEEDED`

Do not widen the task to repair a STOPPED condition.

Plain-language summary: this builds a complete but disabled concurrency candidate and proves it in disposable repositories. It does not activate parallel tasks or touch the existing uncommitted framework work.
