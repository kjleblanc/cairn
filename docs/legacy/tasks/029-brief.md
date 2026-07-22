# Task 029 — contain and repair the two-task scheduler

Date: **2026-07-21**

Lane: **High-Stakes**

Mode: **Experimental Draft — default-off, passive-artifact only, and limited to a
coordinator-created disposable project**

Starting `main`: `0e841916c685e0a458680319390c2d1a1f17d570`

Task 028 decision: **revise**, recorded in `docs/ai-work/LOG.md` at the starting
commit above.

Historical evidence that remains immutable:

- Task 028 pinned brief: `542bee714e02fb6f9f410f198547f20604a04cb6`
- Task 028 stopped implementation/report: `cb9c16b45cb73455ee7f7919d3b49f6d484a5fab`
- Task 028 fresh-context verdict: **FAIL**

## Owner direction and planning boundary

The owner directed Cairn to record the Task 028 `revise` decision and plan the
repair immediately. The review found four failures:

1. the coordinator executed model-authored tests and arbitrary accepted npm
   scripts with the owner's ambient operating-system and network authority;
2. `Promise.all` made a completed task wait for every builder before Checking;
3. a path beneath the operating-system temporary directory was treated as proof
   that a repository was newly created, synthetic, and disposable; and
4. Planning engine failures were shown as Waiting instead of Needs attention.

This task repairs those findings by narrowing the supported user path. It does not
attempt to invent a cross-platform code-execution sandbox from prompts, argument
validation, environment filtering, or a temporary directory. The repaired Draft
does not execute model-authored source, tests, package scripts, commands, imports,
plugins, or build tools. It supports passive UTF-8 `.md` and `.txt` artifacts only.

This planning phase creates and pins only this brief. It authorizes no runtime or
test edit, process execution, synthetic repository creation, branch, worktree,
model session, network request, credential use, deletion, activation, or live
proof.

## Visible outcome and milestone movement

With the repaired Draft explicitly enabled in an offline mock rehearsal, the Cairn
Desktop creates a brand-new disposable proof project itself, accepts one or two
plain-language passive-artifact outcomes, and shows the six states **Planning,
Building, Waiting, Checking, Done, and Needs attention**.

Two disjoint tasks may Build concurrently. As soon as either task finishes, a
single integration pump may Check and integrate it against the latest `main`
without waiting for the other builder to return. Among tasks ready at the same
instant, the lower task number goes first. A task that is still Building, Waiting,
or in Needs attention cannot block an independently useful ready task.

Checking performs only coordinator-owned byte and path assertions. It never starts
`node`, `npm`, a shell, a test runner, an imported module, or any other child
process based on model output.

Expected milestone movement: **UNCLEAR**. The Draft would provide a contained,
visible two-task path and repair Task 028's review failures, but it would not yet
run a real model, work on the valuable Cairn repository, or support executable code
tasks. Any broader path remains a separate High-Stakes task.

## Supported user path

The only supported path is one closed Desktop batch in a proof project created by
the coordinator during that same owner action.

The proof project:

- is created with create-new filesystem semantics beneath the real operating-
  system temporary directory;
- is never a user-selected or pre-existing repository;
- contains only Cairn's synthetic project scaffold and scheduler-owned proof
  metadata;
- has no remote, submodule, alternate object database, linked Git directory,
  ignored starting file, extra ref, prior scheduler state, or reparse-point path;
- begins on `main` at one exact coordinator-created initial commit and tree;
- records a non-secret, random ownership token in the Git common directory;
- is admitted only when its canonical root, token, initial commit, tree, refs,
  file inventory, and clean status still match the creation record; and
- is retained after rehearsal unless the owner separately authorizes its exact
  deletion.

Each scheduled task may create or modify only its unique coordinator-assigned
directory:

`artifacts/task-NNN/`

Artifact files must be regular UTF-8 `.md` or `.txt` files, at most 256 KiB each.
They may not contain NUL bytes. Symlinks, junctions, reparse points, hard-link
aliases, executable extensions, hidden paths, task records, contracts, manifests,
configuration, source code, test code, scripts, or Git paths are not supported.

The coordinator, not the model, owns the task brief, report, scheduler state, log,
branches, worktrees, integration candidates, and `main` movement.

The Desktop states plainly that this Draft proves passive artifacts only. A code,
package, application, build, or executable-test outcome Waits and directs the owner
to the ordinary serial or a later sandboxed High-Stakes path.

## Non-executable planning and checking design

Planning uses the existing `SdkEngine` transport but receives only Read, Glob, and
Grep in the coordinator-created synthetic project. It receives no Bash, Write,
Edit, NotebookEdit, web, MCP, arbitrary command, Git command, or access to the real
Cairn repository.

The planner returns one strict JSON object. Unknown fields, duplicate keys,
accessors, proxies, non-plain values in tests, invalid UTF-8, oversized literals,
or values outside the exact schema fail closed. The schema contains:

- schema version and reserved task number;
- outcome, independent usefulness, and `lane: "Standard"`;
- exact passive artifact paths inside that task's assigned directory;
- declarative assertions only;
- `dependencies: []` and `externalActions: []`;
- certainty and a short uncertainty reason; and
- complete brief Markdown for coordinator-owned evidence.

The only assertion kinds are:

- `fileExists` — one declared artifact is a regular file;
- `utf8Equals` — one declared artifact equals a bounded literal exactly after the
  declared LF/CRLF policy; and
- `utf8Contains` — one declared artifact contains each bounded literal fragment.

Assertions are plain data. Their evaluator may use only bounded filesystem reads,
UTF-8 decoding, byte comparison, and string inclusion. It may not import or execute
an artifact; instantiate a regular expression from model output; invoke a parser
with extension hooks; start a process; load a package; access the network; or read
outside the frozen artifact paths.

The old `ShellFreeCheck`, `validateShellFreeCheck`, and `runShellFreeChecks` surface
must not be reachable from the repaired scheduler. Planner declarations containing
`executable`, `args`, `node`, `npm`, script names, command text, or legacy check
objects are rejected before a builder starts.

## Builder boundary

The scheduled builder receives Read, Glob, Grep, Write, and Edit only. Write and
Edit are exact-path gated to its passive artifact paths and unique report path. The
builder receives no Bash, NotebookEdit, web, MCP, owner-question, Git, checking,
integration, shared-log, scheduler-state, or real-project capability.

Immediately before builder control, Cairn rechecks the proof-project creation
record, task ownership, exact plan and brief hashes, passive path rules,
disjointness, current `main`, scheduler revision, and two-engine/two-builder limit.

After the builder returns, Cairn inspects committed and uncommitted changes before
staging. Any outside path, deletion, rename, copy, mode change, hard link, symlink,
junction, reparse point, non-regular file, non-UTF-8 bytes, NUL byte, oversized
artifact, changed brief, missing report, or executable-looking path becomes Needs
attention. No assertion or integration runs for that task.

## Ready-first integration design

Builders start concurrently, but integration does not await one combined
`Promise.all` before it can begin.

Each builder completion publishes one durable ready or Needs attention event. A
single integration pump observes those events and:

1. chooses the lowest-numbered task among tasks that are ready at that moment;
2. freezes its exact task commit;
3. creates one detached candidate at the latest checked `main`;
4. applies only the frozen commits;
5. re-inspects passive path and file-type containment;
6. evaluates the frozen declarative assertions without starting a process;
7. appends one exact `Applied / completed / DONE` row in the candidate;
8. compares the candidate, task commit, lease, clean root, and expected `main`;
9. advances `main` only by exact fast-forward; and
10. performs proved-owned, non-force cleanup.

A deliberately delayed peer must remain Building while the completed task visibly
passes through Waiting, Checking, and Done. The delayed task later integrates on
top of that new `main`. The batch call may still be waiting for the delayed model
session, but the ready task's integration and visible Done state must not be
blocked.

No model session is automatically retried or cancelled. Closing the app during an
unreturned session leaves that task Needs attention on restart; it does not undo an
already integrated independent peer.

## Planning failure and visible-state rules

- A syntactically valid uncertain, non-Standard, dependent, external-action, or
  unsupported executable-code declaration becomes Waiting with a plain reason and
  no builder session.
- Malformed or duplicate-key planner output becomes Waiting with `PLAN_INVALID`
  and no builder session.
- A thrown, rejected, disconnected, or otherwise failed Planning engine session
  becomes Needs attention with `PLANNING_ENGINE_FAILED`.
- A failed Building engine session becomes Needs attention with
  `BUILDING_ENGINE_FAILED`.
- A coordinator, Git, ownership, containment, assertion, integration, recovery, or
  cleanup failure becomes Needs attention and preserves evidence.

Waiting must never be used to disguise an engine or coordinator failure.

## Files that may change during the approved build

Only these tracked paths may be created or modified after approval:

Core implementation and policy:

- `core/package.json` — test-script entry only; no dependency or version change;
- `core/src/agents.ts` — repaired scheduler tool profile only;
- `core/src/prompts.ts` — passive-artifact planner/builder charter only;
- `core/src/scheduler.ts`;
- `core/src/scheduler-git.ts`;
- `core/src/scheduler-checks.ts` — new declarative evaluator;
- `core/src/scheduler-proof.ts` — new disposable-project creator and verifier;
- `core/src/index.ts` — exports for the two new modules only;
- `core/test/agents.test.ts` — repaired scheduler tool-policy cases only;
- `core/test/scheduler.test.ts`;
- `core/test/scheduler-recovery.test.ts`;
- `core/test/scheduler-checks.test.ts` — new;
- `core/test/scheduler-proof.test.ts` — new.

Desktop supported path:

- `app/src/main/tasks.ts`;
- `app/src/preload.ts`;
- `app/src/shared/ipc.ts`;
- `app/src/renderer/app.css`;
- `app/src/renderer/screens/Dashboard.tsx`;
- `app/src/renderer/screens/Scheduler.tsx`;
- `app/src/renderer/components/SchedulerDeck.tsx`;
- `app/tests/scheduler.spec.ts`;
- `app/tests/scheduler-recovery.spec.ts`.

Task record:

- `docs/ai-work/tasks/029-report.md` — new during the build.

The pinned `docs/ai-work/tasks/029-brief.md` may not change after approval.
Generated ignored build and Playwright output may be regenerated but must not be
staged.

If another tracked source, test, manifest, lockfile, public document, contract,
historical task record, or activation file is required, stop with
`SCOPE_TOO_NARROW`.

## Files and behavior that must stay untouched

The build must not change:

- Task 028's brief, report, implementation commits, or recorded decision;
- `docs/ai-work/LOG.md` in the real Cairn repository;
- Tasks 016, 026, or 027 and their runtime/test paths;
- provider connection, authentication, model, effort, `query()`, transport,
  network, retry, telemetry, or credential behavior;
- `core/src/coordinator.ts`, bounded/concurrent modules, or serial-v2 behavior;
- CLI behavior and files;
- dependencies, versions, package locks, installed package bytes, or public
  package interfaces unrelated to the new Draft modules;
- `AGENTS.md`, `CONTRACT-TEMPLATE.md`, `MAINTAINERS.md`, public guides,
  `cairn.html`, or `CHANGELOG.md`;
- ordinary serial behavior when the repaired Draft switch is absent;
- the historical Parallel Draft or Task 026–028 switches and evidence;
- remote refs, remotes, pushes, releases, deployments, public pages, messages,
  billing, account state, or any valuable repository; or
- any retained disposable evidence root without separate exact deletion approval.

## Protected starting state

At planning time:

- project root is
  `C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework`;
- `main` is `0e841916c685e0a458680319390c2d1a1f17d570`;
- the complete explicit tracked and untracked Git status is clean;
- nothing is staged;
- exactly one worktree exists, the project root on `main`;
- no `cairn/task-*` branch exists; and
- `.git/cairn` is absent.

There is no modified or untracked starting work. The complete tracked tree is
protected except for the exact permitted paths above. Any unexpected change outside
those paths stops the task.

## First visible checkpoint

The first checkpoint is an offline Desktop mock in a coordinator-created disposable
proof project that visibly demonstrates all of the following before any real model
or network use:

- two tasks enter Planning and Building;
- Task 001's builder is deliberately held open;
- Task 002 finishes, passes declarative Checking, and reaches Done while Task 001
  is still Building;
- Task 001 is then released and integrates against Task 002's new `main`;
- both artifacts have exact expected UTF-8 bytes;
- no model-authored process, module, script, or network action was invoked; and
- only the clean root worktree remains with two exact log rows.

Negative visible checkpoints show an unsupported code task Waiting, a Planning
engine failure in Needs attention, and a pre-existing temporary repository refused
before any engine session.

## Safe rehearsal and expected-red evidence

All build checks use fake engines and newly created disposable roots. Before
implementation, focused tests run against Task 028's unchanged implementation and
must fail for these exact reasons:

1. a fake builder can write an allowed Node test whose execution writes a sentinel
   outside the task worktree, proving ambient-authority escape;
2. `npm run deploy` and `npm run postinstall` declarations pass the old validator;
3. a completed builder cannot reach Checking until its delayed peer resolves;
4. a clean pre-existing Cairn repository beneath the temporary directory is
   admitted without coordinator creation provenance; and
5. a thrown Planning engine error is recorded as Waiting.

The sentinel is placed only inside the same newly owned disposable test root and is
never executed against valuable data. No test performs network access, credential
use, package installation, or deletion of retained evidence.

After implementation, the same acceptance intent must pass because no model-authored
code is executed, ready work integrates immediately, arbitrary temp repositories
are refused, and engine failure becomes Needs attention. Assertions may be repaired
only when the harness is wrong; the safety criteria may not be weakened.

## Declared checks

The builder must run and report the real result of:

- pinned-brief commit, parent, and blob verification;
- complete pre/post Git status, worktree, branch, and `.git/cairn` audits in the
  real repository;
- exact comparisons proving all protected historical/provider/concurrent paths are
  unchanged;
- expected-red controls against Task 028's exact implementation;
- `npm.cmd run build --workspace core`;
- focused scheduler, proof, declarative-check, recovery, and tool-policy tests;
- `npm.cmd test --workspace core`;
- `npm.cmd --prefix app run typecheck`;
- `npm.cmd --prefix app run build:vite`;
- `npx.cmd --no-install playwright test tests/scheduler.spec.ts tests/scheduler-recovery.spec.ts tests/concurrency-parallel-safe.spec.ts tests/concurrency-final.spec.ts tests/smoke.spec.ts` from `app`;
- one headed offline scheduler test showing the repaired visible path;
- a child-process interception audit proving no declarative assertion starts
  `node`, `npm`, a shell, or another process;
- negative declarations for legacy executable/args checks, executable extensions,
  scripts, source/test files, oversized/non-UTF-8/NUL artifacts, outside paths,
  symlinks, junctions, reparse points, and hard-link aliases;
- a ready-first control in which one task reaches Done while its peer is still
  Building, followed by latest-main integration of the delayed peer;
- arbitrary-temp, copied-marker, changed-tree, extra-ref, remote, submodule,
  ignored-file, dirty-root, wrong-token, reused-token, and reparse-root admission
  refusals before engine control;
- Planning engine rejection/throw/disconnect controls producing Needs attention,
  while valid uncertainty and unsupported code declarations produce Waiting;
- an external-process hard-exit interruption matrix, including before and after
  main movement, with no model retry, duplicate row, false Done, or unowned cleanup;
- source and built-output audits showing no scheduler import of the standalone
  Messages client, bounded broker, dynamic evaluator, VM, worker, child-process
  check runner, or package-script runner;
- an `agents.ts` diff audit showing provider/auth/network behavior is unchanged;
- confirmation that no dependency, lockfile, contract, public guide, Task 028
  record, real work log, activation file, or unrelated source changed;
- `git diff --check`, exact permitted-path diff inspection, and final clean status;
  and
- one exact-name local implementation/report commit containing only permitted
  paths.

These checks may start already installed build/test tools only as the human-approved
Task 029 verification harness. The repaired product scheduler itself must not start
a model-authored check process.

## Qualified human and mandatory review

A qualified developer experienced with Git worktrees, concurrent Node/Electron
state machines, Windows reparse and hard-link behavior, process interruption,
filesystem containment, and Claude Agent SDK subscription execution is required
before any real-model proof or valuable-repository activation.

The qualified reviewer must inspect:

- proof-project creation and non-forgeable-in-normal-operation ownership checks;
- passive artifact/path/file-type containment;
- the absence of model-authored execution and package-script paths;
- ready-first integration while another engine is still active;
- lock, state, intent, fast-forward, recovery, and no-force cleanup logic;
- actual hard-exit recovery evidence rather than caught exceptions alone;
- visible Waiting versus Needs attention truthfulness; and
- the unchanged provider/auth/network diff.

After the offline build, a brand-new chat must perform:

```text
Review High-Stakes task 029.
```

That review reads the pinned brief, actual diff, changed tests/checking tools,
protected state, and independent evidence before the builder report. Passing the
Draft's own tests is not independent assurance.

## What could be damaged and whether recovery is credible

- **Owner data or systems:** Task 028's check runner could execute arbitrary
  model-authored code with ambient authority. Task 029 removes product check
  processes entirely and targets only a coordinator-created disposable project.
  Any remaining execution path is a safety failure and stops the task.
- **Git history:** concurrent integration could move the wrong `main`. Exact
  commits, one integration lease, latest-main detached candidates, compare-before-
  fast-forward, and clean-root checks make local rollback credible.
- **Ready work:** incorrect event ordering could lose or double-integrate a task.
  Durable ready events, one pump, idempotent state transitions, and exact log-row
  checks contain this risk.
- **Disposable proof evidence:** crashes may retain worktrees, branches, locks, and
  files. Ambiguity retains them as Needs attention; no force deletion is allowed.
- **Historical truth:** rewriting Task 028 would erase why the Final failed. Its
  records, decision, and commit remain immutable.
- **Subscription quota and credential confidentiality:** Task 029 authorizes no
  real model session. A later proof requires qualified review and separate exact
  approval. No credential value may enter model-visible or recorded surfaces.

## Exact rollback plan

Runtime rollback is immediate: leave the repaired Draft switch unset. Task 029 may
not reuse `CAIRN_TWO_TASK_SCHEDULER_FINAL`; it uses a new default-off Draft switch so
Task 028 remains separately identifiable and inactive.

During offline rehearsal:

1. stop starting fake sessions;
2. retain any uncertain task, branch, worktree, lock, or proof root;
3. reconcile read-only first;
4. finish only exact proved local transitions;
5. otherwise show Needs attention;
6. never reset, clean broadly, force-remove, or delete an unproved resource; and
7. delete retained proof roots only after separate approval of exact absolute paths
   and ownership/reparse/not-project-root checks.

If the implementation is rejected, a later approved High-Stakes rollback may
`git revert` the exact Task 029 implementation commit. Never reset history or
rewrite Tasks 016, 026, 027, 028, or 029.

If the real Cairn repository gains scheduler state, a task branch, another
worktree, or unexpected `main` movement, stop with `REAL_PROJECT_MUTATED` and
preserve it for a separately approved recovery task.

## Assumptions and uncertainty

- The safest repair available without adding a platform sandbox or dependency is
  to support passive text artifacts only. This is an intentional narrowing, not a
  claim that general code execution is now safe.
- A temporary path alone is not provenance. Normal product admission must begin
  from the coordinator's create-new operation and verify its durable creation
  record. This is not intended to resist an administrator deliberately forging all
  local bytes; it prevents Cairn from mistaking an ordinary pre-existing project
  for its own disposable proof.
- Git itself remains a coordinator-owned installed tool. Model output never
  supplies Git arguments.
- A provider session can still hang or return an ambiguous result. Ready peers must
  integrate independently, while the unreturned task remains active until app exit
  or a provider result; no automatic cancellation or retry is claimed.
- The Experimental Draft does not complete the current real-model milestone by
  itself. A later approved proof and still later valuable-repository activation are
  separate High-Stakes outcomes.
- No dependency should be needed. A required package, OS sandbox installation,
  permission change, or platform helper is scope expansion and stops the task.

## Approvals required, listed separately

1. **Build approval:**
   `Approve High-Stakes task 029 at docs/ai-work/tasks/029-brief.md. Build it.`
   This authorizes only the exact local edits, fake-engine tests, disposable
   synthetic Git effects, generated ignored output, report, and exact-name local
   commit declared here.
2. **Mandatory fresh-context AI review:** required after the offline build.
3. **Owner decision:** accept, revise, rollback, defer, or escalate after review.
4. **Qualified-human real-model verdict:** required before any real Claude session.
5. **Live subscription proof approval:** a later High-Stakes task must name the
   exact accepted commit, disposable target, model, effort, finite sessions,
   connection/quota/network effect, evidence, and cleanup boundary.
6. **Qualified-human activation verdict:** required for any valuable target.
7. **Separate activation approval:** required in a later High-Stakes task; Task 029
   never activates itself or supports executable code.
8. **Any deletion of retained proof evidence:** separate exact approval after target
   verification.

No approval here authorizes a real model session, credential use, network request,
login, package operation, new dependency, arbitrary code execution, valuable-
repository run, deletion, push, release, deployment, message, billing change,
public action, or activation.

## DONE and STOPPED

**DONE** means all of the following are true:

- only permitted paths changed and protected work stayed unchanged;
- Task 028 and its recorded decision remain immutable;
- the repaired Experimental Draft uses a new default-off switch;
- only coordinator-created disposable proof projects are admitted;
- planner and builder access only the synthetic proof project;
- artifacts are bounded regular UTF-8 `.md` or `.txt` files inside unique task
  directories;
- no model-authored source, test, command, module, parser hook, package script, or
  child process is executed;
- declarative assertions use bounded reads and comparisons only;
- a ready task reaches Done while a peer builder remains active;
- delayed work later integrates against latest `main` without duplicate rows;
- engine failures show Needs attention and valid uncertainty/unsupported code shows
  Waiting;
- actual hard-exit recovery retains ambiguity and never retries a model;
- all focused, full regression, Desktop, headed, source-audit, diff, and protected-
  state checks pass;
- the report records real commands/results, limitations, `Milestone movement:
  UNCLEAR`, and `Disposition: DONE`;
- one exact-name implementation/report commit succeeds; and
- no real model, network, credential, valuable repository, activation, or deletion
  occurs.

**STOPPED** means any required containment, proof, check, or boundary fails. The
report names one stable blocker and does not blur partial work into DONE. Stable
blockers include:

- `STARTING_STATE_CHANGED`;
- `BRIEF_NOT_PINNED`;
- `REGRESSION_NOT_REPRODUCED`;
- `SCOPE_TOO_NARROW`;
- `PROTECTED_WORK_CHANGED`;
- `MODEL_AUTHORED_EXECUTION_REMAINS`;
- `DECLARATIVE_CHECK_ESCAPE`;
- `PASSIVE_PATH_ESCAPE`;
- `DISPOSABLE_PROVENANCE_UNPROVED`;
- `READY_TASK_BLOCKED`;
- `VISIBLE_STATE_FALSE`;
- `INTEGRATION_SAFETY_UNPROVED`;
- `RECOVERY_UNPROVED`;
- `REAL_PROJECT_MUTATED`;
- `DEPENDENCY_REQUIRED`;
- `QUALIFIED_REVIEW_REQUIRED` for any attempted live step; or
- `ROLLBACK_UNCLEAR`.

An ordinary implementation or test-harness mistake may be repaired and rerun
inside this exact boundary. Executing model-authored code, adding a dependency,
installing a sandbox, widening beyond passive artifacts, using a pre-existing
project, touching valuable data, starting a real model session, or changing the
approved outcome stops the task.
