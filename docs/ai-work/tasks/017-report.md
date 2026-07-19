# Task 017 — report

## Result in plain language

The exact Task 016 candidate
`e5c7b8f3eab5f7e628dbe48a67c552f7c7f0eede` qualifies to remain as
disabled Experimental Draft learning evidence under Cairn Contract v1.5.

The one supported headed desktop path passed. It showed safe Tasks 001 and
003 as independently navigable, showed Task 002 as `Refused — not queued`
with `PARALLEL_EXCLUSIVE_REFUSED`, exposed no approval or build control for
the refused task, and preserved the same evidence after the desktop restarted.

The Draft is disabled unless a child process receives the exact value
`CAIRN_PARALLEL_DRAFT=1`. The no-flag control passed and created no
coordinator state or `cairn/task-*` branch. The invoking PowerShell process
had no flag before or after every rehearsal.

Both retained Task 016 review findings were independently reproduced:

- three tasks reserved before classification all became admitted, producing
  `admitted=3`; and
- malformed refinement left a task admitted and `defined`, after which an
  approval attempt created `001-approval.json` before failing with
  `BRIEF_CHANGED`.

Neither finding's prerequisite occurs in the supported path. The supported
fixture reserves, writes, and classifies each task in sequence; it never holds
three unclassified reservations. It also never refines a brief or clicks an
approval or build control. The supported-path rehearsal created no approval
artifact.

Every candidate runtime effect observed in the supported path and both defect
reproductions remained beneath its newly created Task 017 temporary root. The
real repository retained the same HEAD, one worktree, no `cairn/task-*`
branch, no `.git/cairn`, and byte-identical protected work.

**Candidate verdict: PASS WITH CONCERNS**

This verdict means only that the candidate is useful as disabled,
synthetic-only learning evidence on the one supported path. It is not safe or
approved for valuable-repository or production use.

## Candidate, brief, and starting-state verification

- Active governing contract: Cairn Contract v1.5, `STATUS: ACTIVE`.
- Pinned Task 017 brief commit:
  `7d0a491f513ba5f8087438ecd370efc680eb53ff`.
- The brief commit's parent is the exact candidate:
  `e5c7b8f3eab5f7e628dbe48a67c552f7c7f0eede`.
- `docs/ai-work/tasks/017-brief.md` had no working-tree or staged diff from
  the pinned brief commit.
- Tracked product source and tests under `core/` and `app/` had no working,
  staged, or candidate-relative diff.
- `main` began 17 commits ahead of `origin/main`; nothing was staged.
- Only the main worktree existed; no `cairn/task-*` branch existed; and
  `.git/cairn` was absent.
- The process environment did not contain `CAIRN_PARALLEL_DRAFT`.
- The ten protected modified files and five protected untracked files matched
  every SHA-256 recorded in the brief.

## Files changed

The evaluation changed only:

- `docs/ai-work/tasks/017-report.md` (new).

The separately pinned brief remained unchanged. No product source, test,
dependency declaration, lockfile, earlier task artifact, or work-log row
changed. Builds regenerated only the ignored output permitted by the brief
under `core/dist`, `core/assets`, `app/.vite`, and `app/resources`.

## Supported user path

The unchanged candidate was compiled with:

```powershell
npm.cmd run build --workspace core
```

Result: passed. TypeScript compiled and `core/assets/contract.md` was synced
from the protected current contract as expected.

The exact supported headed command was then run with its child `TEMP` and
`TMP` confined to a fresh Task 017 root:

```powershell
npm.cmd --prefix app run test:smoke -- concurrency-parallel-safe.spec.ts --headed --grep "refused work stays visible evidence without displacing two navigable safe tasks"
```

Result: passed 1/1 in 40.5 seconds after the bounded checking-wrapper repair
described below. Vite built the main, preload, and renderer bundles. The
Playwright path completed all promised navigation and restart assertions.

The resulting state was:

- Task 001: `defined`, admitted, branch `cairn/task-001`;
- Task 002: `refused`, not admitted, blocker
  `PARALLEL_EXCLUSIVE_REFUSED`, branch `cairn/task-002`;
- Task 003: `defined`, admitted, branch `cairn/task-003`; and
- approval artifacts: 0.

The test harness set `CAIRN_OPEN` to the synthetic project, `APPDATA` to the
synthetic app-data directory, `CAIRN_MOCK=1`, and
`CAIRN_PARALLEL_DRAFT=1` only for child processes. In mock mode, preflight
returns before loading the real-model SDK or inspecting a credential. No real
model, credential, network service, money, deployment, or external action was
used.

## Default-off and rollback evidence

Source inspection found exact equality checks in the candidate:

- `core/src/coordinator.ts` enables the Draft only when
  `process.env[PARALLEL_DRAFT_ENV] === "1"`; and
- `app/src/main/ipc.ts` reports it enabled only when
  `process.env.CAIRN_PARALLEL_DRAFT === "1"`.

The exact no-flag control was run with its temporary directory confined to a
fresh Task 017 root:

```powershell
node --test --test-name-pattern "without the flag, task definition stays on the serial path and creates no coordinator" core/dist/test/coordinator-parallel-safe.test.js
```

Result: passed 1/1. Independent inspection found one main worktree, no
coordinator state, and no `cairn/task-*` branch in its synthetic repository.

After every flag-enabled child exited, the invoking PowerShell process still
had no flag. Closing the headed desktop and allowing the command-scoped child
environment to end therefore demonstrated immediate rollback. The real
repository also remained at the pinned brief commit with one worktree, no task
branch, and no coordinator state.

## Finding 1 — capacity bypass after pre-reservation

A separate synthetic repository reserved Tasks 001, 002, and 003 before any
classification. It then created each worktree and registered disjoint
Standard/Draft metadata. The exact candidate admitted all three:

```text
Task 001: phase=defined, admitted=true, branch=cairn/task-001
Task 002: phase=defined, admitted=true, branch=cairn/task-002
Task 003: phase=defined, admitted=true, branch=cairn/task-003
admitted=3
```

The reproduction created no approval artifact. Its project, coordinator
state, Git directory, worktree root, three worktrees, briefs, and branches all
resolved beneath:

`C:\Users\KenJL\AppData\Local\Temp\cairn-task-017-finding-1-04e08253540c422ca67501b24179f3b2`

Classification for the supported path: retained concern, not reachable. The
supported fixture's `define` helper calls `reserveTaskWorktree`, writes the
brief, and immediately calls `registerTaskMetadata` before the next task is
defined. It never creates three provisional reservations. The supported path
instead observed exactly two admitted safe tasks and one terminally refused
High-Stakes task.

Containment classification: retained but contained in this evaluation. The
finding changed the admitted count, not path derivation. Independent absolute
path inspection showed every resulting path beneath the synthetic root, and
the real repository was unchanged.

## Finding 2 — malformed refinement is not terminally refused

A separate synthetic repository created one valid admitted Standard/Draft
task, then used the normal refinement entry point to replace its metadata with
an incomplete block. The result was:

```text
refinement error: MALFORMED_METADATA
after refinement: phase=defined, admitted=true, blocker absent
approval error: BRIEF_CHANGED
approval artifact: present
final state: phase=defined, admitted=true, blocker absent
```

The approval artifact was created at:

`C:\Users\KenJL\AppData\Local\Temp\cairn-task-017-finding-2-73b5d40e984f48fa8dc6a4741f0fc960\project-cairn-worktrees\task-001\docs\ai-work\tasks\001-approval.json`

Its project, coordinator state, Git directory, worktree root, worktree, brief,
branch, and approval artifact all resolved beneath:

`C:\Users\KenJL\AppData\Local\Temp\cairn-task-017-finding-2-73b5d40e984f48fa8dc6a4741f0fc960`

Classification for the supported path: retained concern, not reachable. The
supported scenario never invokes refinement, never clicks `Approve this exact
brief`, and never clicks `Build it`. It only checks that the approval control
is visible for safe tasks and absent for refused work. Its retained root
contained no approval artifact.

Containment classification: retained but contained in this evaluation. The
unexpected artifact was written to the synthetic task worktree's declared task
artifact path. Independent absolute path inspection found no path outside the
assigned root, and the real repository was unchanged.

## Containment inspection and retained evidence

Five top-level Task 017 temporary roots were created and retained. Nothing was
deleted or cleaned up:

```text
C:\Users\KenJL\AppData\Local\Temp\cairn-task-017-no-flag-088ac72d3fcc481e9cf728851957b170
C:\Users\KenJL\AppData\Local\Temp\cairn-task-017-supported-path-20045b085df949cab4397aeb62738353
C:\Users\KenJL\AppData\Local\Temp\cairn-task-017-supported-path-rerun-61a2bd62e54841cc82925581f4b8267c
C:\Users\KenJL\AppData\Local\Temp\cairn-task-017-finding-1-04e08253540c422ca67501b24179f3b2
C:\Users\KenJL\AppData\Local\Temp\cairn-task-017-finding-2-73b5d40e984f48fa8dc6a4741f0fc960
```

A final recursive evidence inventory found every synthetic project, app-data
directory, coordinator state path, Git directory, coordinator worktree root,
task worktree, and approval artifact beneath its own listed root. There were
no Task 017 paths outside those roots.

## Checking-wrapper failures and bounded corrections

Three failures were checking-wrapper defects, not candidate behavior. Their
output and temporary roots were preserved.

1. The first headed invocation completed enough to leave its synthetic
   evidence, but PowerShell's `ErrorActionPreference=Stop` treated Vite's CJS
   deprecation warning on stderr as a terminating wrapper error before the
   test result could be collected. No product or test changed. The command was
   rerun in a new root with native stderr captured non-fatally; it passed 1/1.
2. The first Finding 1 inline wrapper lost JavaScript double quotes while
   passing the script through Windows PowerShell. Node reported a syntax error
   before the synthetic project existed. The root was confirmed empty.
3. A base64-preserving wrapper then used `eval`, which cannot contain static ES
   module imports. Node again failed before creating the project. Loading the
   same checking bytes as an ES module corrected the wrapper; the Finding 1
   reproduction then completed. Finding 2 used a plain readable dynamic-import
   wrapper and completed on its first invocation.

No acceptance criterion, product source, existing test, or finding assertion
was changed by these corrections.

## Other checks and real results

- Pinned brief and parent-candidate verification: passed.
- Candidate-relative `core/` and `app/` tracked diff: empty before and after.
- Pre- and post-rehearsal protected-file hashes: all 15 matched the brief.
- Pre- and post-rehearsal real-repository state: HEAD unchanged; one main
  worktree; no task branch; `.git/cairn` absent.
- Parent-shell feature flag checks: absent before and after every rehearsal.
- Absolute-path inspection across all five retained roots: passed.
- Supported-path prerequisite inspection: no three provisional reservations,
  refinement, approval click, build, retry, decision, or integration.
- Dependency and lockfile diff from the candidate: empty.
- `git diff --check`: passed. Git emitted only existing Windows line-ending
  warnings for protected modified files.
- Actual diff inspection: before this report, the complete status was exactly
  the ten protected modified files and five protected untracked files recorded
  in the brief; no product or test path appeared.

The final report-only diff, staging, commit, and status are inspected after
this report is written. Only `docs/ai-work/tasks/017-report.md` may be staged.

## What the owner can try

After the mandatory fresh-context review, run:

```powershell
npm.cmd run build --workspace core
npm.cmd --prefix app run test:smoke -- concurrency-parallel-safe.spec.ts --headed --grep "refused work stays visible evidence without displacing two navigable safe tasks"
```

Success looks like two safe tasks remaining visible and navigable, Task 002
remaining visibly refused and not queued, no approval or build control on its
refusal view, and the same three task cards returning after the desktop
restarts.

Failure includes a missing safe task, an approval or build control on refused
work, lost refusal evidence after restart, a non-temporary project, or any
mutation of the real repository.

## What still needs a human check

A mandatory fresh-context reviewer must independently compare the accepted
brief, candidate diff, supported-path test, both finding reproductions,
protected work, and this report. The owner should personally run the headed
path and judge whether the refusal explanation is understandable.

No evidence here proves production readiness or safety on valuable work. An
experienced Git/concurrency developer remains required before any Final
activation.

## Retained concerns

- Three pre-reservations can bypass the two-task admission limit.
- Malformed refinement remains admitted and can create an approval artifact
  before frozen-brief rejection.
- Refinement, approval, build, retry, decision, and integration sequences are
  unsupported by this evaluation.
- Crash and process-scheduling interleavings were not exhaustively tested.
- Only the evaluated Windows desktop environment was exercised.
- Production-filesystem and valuable-repository behavior remain unproved.
- No real model ran, so the current project milestone is not complete.

## Future Final activation gates

Before this candidate or a descendant may operate on valuable work, a separate
High-Stakes Final task must:

- name this exact candidate and both retained findings;
- fix or explicitly resolve the admission-capacity race;
- make malformed refinement fail closed before writing an approval artifact;
- define the supported production entry point and test every exposed operation;
- prove locking, worktree ownership, integration, crash recovery, and rollback
  against valuable-repository conditions;
- obtain review from a developer experienced with Git worktrees, concurrent
  state machines, locking, integration conflicts, and crash recovery;
- obtain exact owner approval for activation on the named repository;
- preserve a tested recovery plan; and
- obtain separate approval for any network, credential, cost, deployment,
  external write, or other live action.

Acceptance of this evaluation must leave the candidate disabled.

Milestone movement: UNCLEAR

Disposition: DONE
