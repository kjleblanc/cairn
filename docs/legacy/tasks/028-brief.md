# Task 028 — build the simple subscription-backed two-task scheduler

Date: **2026-07-20**

Lane: **High-Stakes**

Mode: **Final candidate — disabled until build, live-proof approval, mandatory
fresh-context review, owner acceptance, qualified-human approval, and a separate
activation**

Starting `main`: `83af91723c12e2cba96e7a13eb41761e1218eef4`

Historical candidates that remain immutable:

- Task 016 implementation: `e5c7b8f3eab5f7e628dbe48a67c552f7c7f0eede`
- Task 026 stopped implementation/report: `4d766f0`
- Task 027 stopped implementation/report: `558f312`
- Task 027 deferred decision at current `main`: `83af917`

## Owner direction and planning boundary

The owner requested a simple scheduler for one closed batch of one or two Standard
tasks. A read-only Planning phase declares exact paths. Disjoint tasks may Build at
the same time in separate Git worktrees. Overlapping or uncertain tasks visibly
Wait. Completed tasks enter a one-at-a-time Checking and integration gate against
the latest `main`. The Desktop must show exactly these beginner-facing states:
**Planning, Building, Waiting, Checking, Done, and Needs attention**.

This task reuses Cairn's existing `SdkEngine`, which runs through the already
installed Claude Agent SDK and the owner's existing Claude Code subscription
connection. It does not replace, wrap, export, inspect, redirect, or recreate that
connection. It does not add an API-key path or a standalone Messages API path.

Tasks 026 and 027 remain stopped historical evidence. Their briefs, reports,
runtime modules, tests, CLI command, dependency pins, and Desktop read-only bounded
view are not redesigned, activated, repaired, relabeled, or deleted. Task 016 also
remains immutable history; Task 028 may reuse lessons and verified invariants, but
it creates a separate scheduler rather than activating the old Parallel Draft.

This planning phase creates and pins only this brief. It authorizes no product or
test edit, package change, branch, worktree, scheduler state, model session,
credential use, network request, subscription usage, live proof, activation,
cleanup, push, publish, deployment, or change to `main` beyond the brief-only
planning commit.

## Visible outcome and milestone movement

With the new Final candidate explicitly enabled in a supported test or later
activation, the Cairn Desktop accepts one or two plain-language Standard outcomes
as a closed batch and runs them through a small visible board:

1. each task enters **Planning** while the existing Claude Code engine inspects the
   project without changing product files and declares exact implementation paths,
   test paths, and shell-free checks;
2. when both declarations are exact and disjoint, up to two tasks enter
   **Building** simultaneously in separate temporary Git worktrees;
3. an overlapping task enters **Waiting** until the earlier conflicting task has
   integrated, then returns to Planning against the latest `main` before it can
   build;
4. an uncertain, malformed, non-Standard, dependent, external-action, or otherwise
   unsafe declaration also enters **Waiting**, with a plain-language reason and no
   work on product files;
5. a completed builder enters **Checking** while Cairn freezes its exact task
   commit, applies it to a detached candidate based on the latest checked `main`,
   and reruns every declared check without a shell;
6. only one task may Check or advance `main` at once; another finished builder
   visibly Waits for that integration turn;
7. a successful fast-forward and exact owned-resource cleanup produce **Done**;
   and
8. engine failure, scope escape, failed check, merge conflict, unexpected Git
   movement, ambiguous crash recovery, or cleanup interference produces
   **Needs attention** without overwriting or deleting the retained evidence.

Expected milestone movement: **YES** only if the separately approved real Claude
Code subscription proof completes two disjoint disposable tasks through Done and
the candidate then passes mandatory fresh-context review. The scheduler will have
completed a real-model improvement path end to end, but it will still remain off in
the valuable Cairn repository until the later activation is explicitly approved.
If only the offline proof completes, milestone movement is **UNCLEAR**, not YES.

## Supported user path

The one supported path is a single closed Desktop batch containing one or two
independently useful Standard tasks in one clean Cairn Git repository on `main`.
For the decisive proof, the repository is newly created beneath the operating
system's temporary directory and contains only synthetic, disposable files.

The owner sees two outcome boxes and one clear start action. Before starting, the
screen explains that a disjoint two-task batch normally uses four Claude sessions:
one Planning session and one Building session per task. An overlapping second task
may use one additional re-Planning session after the first task integrates. There
are no automatic engine retries. A retry after Needs attention is a new explicit
owner action and a newly disclosed session.

The supported path does not include arbitrary task counts, task dependencies,
High-Stakes child tasks, external actions, cancellation that deletes retained work,
remote Git operations, deployment, package installation, provider setup, login,
credential recovery, billing, or provider switching.

## Simple scheduler design

Task 028 creates a new scheduler and state namespace. It does not change the
existing `CAIRN_PARALLEL_DRAFT` coordinator or `cairn concurrent` bounded run.

The Final candidate is gated by a new default-off environment switch:
`CAIRN_TWO_TASK_SCHEDULER_FINAL=1`. During build and review it may run only in
newly created synthetic temporary repositories. The real Cairn repository must
refuse scheduler admission even if the switch is set. A later activation task must
change that repository boundary after all required review and acceptance evidence
exists. The environment switch alone is never authority to run against valuable
work.

One project may have one active closed scheduler batch. Admission requires:

- an active Cairn Contract v2.x project;
- a clean main worktree with no modified or untracked starting work;
- current branch `main`, with its exact starting commit recorded;
- no active legacy Parallel Draft coordinator;
- no active Task 026–027 bounded run;
- one or two nonblank outcomes reserved together under one scheduler lock; and
- no existing active scheduler batch.

If any condition fails, no branch or worktree is created. The UI shows Needs
attention and identifies the protected condition in plain language. Cairn never
stashes, resets, cleans, overwrites, or broadly stages the owner's work.

## Planning and declared-path boundary

Planning uses the existing `SdkEngine` with a new scheduler tool profile. The
profile changes tool authorization only; it must not change the SDK import, model
or effort selection, `query()` transport, provider options, authentication
behavior, environment forwarding, or network behavior.

During Planning the model may:

- read project files with Read, Glob, and Grep;
- run only the existing read-only Git commands `status`, `log`, `diff`, `show`,
  and `branch`; and
- ask the owner through the existing optional question bridge.

During Planning the model may not Write, Edit, use NotebookEdit, run any other
command, create a branch or worktree, change Git state, contact another service, or
write the task brief itself. The coordinator reserves task numbers in private
scheduler state, but product and task-record files remain unchanged while the model
is active.

The planner returns one strict JSON object. The coordinator rejects duplicate keys,
unknown keys, accessors, proxies, non-plain values in tests, and any value outside
the exact schema. The schema contains:

- schema version and reserved task number;
- the plain-language outcome and why it is independently useful;
- `lane: "Standard"`;
- exact implementation paths;
- exact test paths;
- exact shell-free checks as executable plus argument arrays;
- `dependencies: []`;
- `externalActions: []`;
- a certainty value and a short uncertainty reason; and
- complete task-brief Markdown for the coordinator to save after validation.

Paths must be normalized repository-relative Git file paths. They may not be
absolute, drive-relative, UNC, ADS, parent-traversing, empty, wildcarded,
environment-expanded, shell-shaped, case aliases, `.git` paths, submodules,
symlinks, junctions, reparse points, the shared work log, scheduler state, another
task's records, or an escaping resolved parent. Existing directories may not be
declared as writable files. Identical paths and file/directory ancestor conflicts
count as overlap, case-insensitively on Windows.

The coordinator, not the model, adds each task's unique brief and report paths to
its owned scope. `docs/ai-work/LOG.md`, scheduler state, locks, branches,
worktrees, integration candidates, and `main` remain coordinator-owned.

After a plan is validated, the coordinator records it durably, creates an exact
task branch and isolated worktree beneath a newly owned scheduler root in the
operating-system temporary directory, writes the validated brief, and commits that
brief by exact path. A task with uncertain or unsafe metadata may receive a
brief-only evidence worktree, but it does not receive builder control.

## Waiting and admission rules

At most two task engines may be active at once, and at most two Building tasks may
be active. A valid Standard task is build-eligible only when its implementation and
test paths are disjoint from every Planning, Building, Waiting-for-integration, or
Checking peer that could still change those paths.

The later overlapping task Waits. The earlier task continues. When the earlier task
reaches Done, the waiting task performs at most one automatic re-Planning session
against the new `main`; its old plan and brief remain recorded as prior revisions.
It builds only if the new declaration is exact and no longer conflicts. Another
overlap or uncertainty remains Waiting and requires an explicit owner action; it
does not loop or consume more subscription sessions automatically.

An uncertain declaration also Waits rather than being silently guessed, refused,
or run serially. The card states what is uncertain and offers only safe choices:
clarify and re-plan, leave it waiting, or use the ordinary serial/High-Stakes path.
No product worktree changes occur while uncertainty remains.

Tiny, High-Stakes, dependent, external-action, malformed, or out-of-bound tasks do
not fall back to autonomous Building. They Wait with a stable reason that tells the
owner which ordinary Cairn path to use. They consume no builder slot.

## Building boundary

Each build uses a fresh `SdkEngine.run` session in that task's isolated worktree.
The existing Claude Code subscription transport remains unchanged.

The scheduled builder tool profile allows Read, Glob, Grep, Write, and Edit. Write
and Edit are limited to the task's frozen implementation paths, test paths, and
unique report path. The scheduled builder receives no Bash, NotebookEdit, web,
MCP, arbitrary command, branch, worktree, Git integration, shared-log, scheduler,
or owner-question capability. The coordinator runs checks and Git operations
outside the model session.

Immediately before builder control, under the scheduler lock, Cairn rechecks:

- the task plan and brief bytes and their recorded hashes;
- the exact task number, branch, worktree, base commit, and owner token;
- path validity and disjointness;
- current `main` and scheduler revision;
- the absence of another owner for the task resources; and
- the environment, supported-repository, and two-builder limits.

After the model returns, Cairn inspects committed and uncommitted changes before it
stages anything. A deletion, rename, copy, submodule, mode change, path outside the
frozen list, missing report, or changed brief is a scope failure. Cairn marks Needs
attention, leaves the worktree and branch intact, and does not run integration.

The coordinator runs every frozen check once in the task worktree with `shell:
false`, a fixed executable allowlist, an exact argument array, the task worktree as
the working directory, and secret-shaped environment variables removed. It then
commits only the named allowed paths and unique task records. No broad staging is
permitted.

## Checking, integration, and Done boundary

Checking has one project-wide lease. If two builders finish close together, one
enters Checking and the other visibly Waits for the integration turn. Among tasks
that are ready at the same time, lower task number goes first. A task that is not
ready or is in Needs attention does not indefinitely block an independently useful
ready peer.

For each ready task, the coordinator:

1. freezes and records the exact task commit;
2. rechecks the task branch, worktree, plan, brief, report, changed paths, checks,
   scheduler revision, and expected current `main`;
3. creates one detached integration worktree beneath the exact owned temporary
   scheduler root at the latest checked `main`;
4. applies the frozen task commit without using a mutable branch name;
5. inspects the resulting paths and reruns every frozen check with `shell: false`;
6. appends exactly one `Applied / completed / DONE` row to the candidate's
   `docs/ai-work/LOG.md` and commits that exact shared file;
7. rechecks the integration lease, state revision, task commit, clean main
   worktree, and expected `refs/heads/main` immediately before movement;
8. advances local `main` only by exact fast-forward to the checked candidate;
9. records the observed new main commit before cleanup; and
10. removes only the clean, proved-owned integration worktree, task worktree, and
    merged task branch without force.

Done is shown only after the new main commit is durable, the log row is present
exactly once, the task branch is merged, and every owned resource is either removed
or truthfully recorded as retained. If safe cleanup cannot be proved, the result is
Needs attention rather than Done.

A merge conflict, failed recheck, failed command, main movement, dirty root,
changed task commit, duplicate or conflicting log row, or cleanup interference does
not move `main`. The exact candidate and worktrees are retained and the card becomes
Needs attention with a stable blocker.

## Durable state and interruption behavior

Scheduler state lives under the repository's exact Git common directory, not in a
model-writable worktree. It has a strict version, repository identity, run id,
revision, task records, owner tokens, expected commits, pending operation, and
resource paths. Unknown or malformed state fails closed.

Every external Git or filesystem effect is preceded by a durable intent and
followed by an observed-result record. State writes use a create-new temporary file,
flush and close, atomic replacement, and a previous-valid backup. The project lock
uses create-new semantics and records the run, owner token, PID, process-start
identity when available, and state revision.

On restart Cairn performs read-only reconciliation first. It may automatically
finish only a transition whose exact before/after state and resource ownership are
proved. An interrupted model session is never retried automatically. An ambiguous
provider result, changed worktree, foreign process, unexpected ref, unverifiable
lock, conflicting bytes, or uncertain ownership becomes Needs attention. Recovery
never force-removes a worktree, overwrites a differing task record, deletes an
unproved branch, resets a ref, or moves `main` from an unexpected commit.

The decisive interruption matrix covers at least these before/after boundaries:

- closed-batch and task-number reservation;
- plan start and validated-plan recording;
- task branch/worktree creation;
- brief creation and brief commit;
- builder start and builder result;
- local check completion and task commit;
- integration lease and integration worktree creation;
- frozen commit application;
- integration check completion and log commit;
- immediately before and after the main fast-forward; and
- task/integration worktree and branch cleanup.

Each exercised interruption must end in either a safely resumed local transition or
a truthful Needs attention state, with no provider retry, duplicate log row,
simultaneous main movement, unowned cleanup, or hidden active state.

## Files that may change during the build

Only these tracked paths may be created or modified after approval:

Core scheduler and tool policy:

- `core/package.json` — test-script entry only; no dependency or version change;
- `core/src/agents.ts` — scheduler tool profiles only; no provider transport,
  authentication, model, effort, or `query()` option change;
- `core/src/prompts.ts` — scheduled planner and builder charters only;
- `core/src/scheduler.ts` — new;
- `core/src/scheduler-git.ts` — new;
- `core/src/steps.ts` — scheduler mutual exclusion and read-only status only;
- `core/src/index.ts` — scheduler exports only;
- `core/test/agents.test.ts` — scheduler tool-policy cases only;
- `core/test/scheduler.test.ts` — new;
- `core/test/scheduler-recovery.test.ts` — new;
- `core/test/steps.test.ts` — scheduler status/mutual-exclusion cases only.

Desktop supported path:

- `app/src/main/ipc.ts`;
- `app/src/main/tasks.ts`;
- `app/src/preload.ts`;
- `app/src/shared/ipc.ts`;
- `app/src/renderer/App.tsx`;
- `app/src/renderer/app.css`;
- `app/src/renderer/screens/Dashboard.tsx`;
- `app/src/renderer/screens/Scheduler.tsx` — new;
- `app/src/renderer/components/SchedulerDeck.tsx` — new;
- `app/tests/scheduler.spec.ts` — new;
- `app/tests/scheduler-recovery.spec.ts` — new.

Read-only CLI visibility:

- `cli/package.json` — test-script entry only; no dependency or version change;
- `cli/src/flows/status.ts`;
- `cli/test/scheduler.test.ts` — new.

Task record:

- `docs/ai-work/tasks/028-report.md` — new during the build.

The pinned `docs/ai-work/tasks/028-brief.md` may not change after approval.
Generated ignored output under `core/dist`, `core/assets`, `cli/dist`,
`app/.vite`, `app/resources`, `app/test-results`, and Playwright's local artifact
directories may be regenerated but must not be staged.

If any other tracked source, test, manifest, lockfile, documentation, contract,
task record, or public artifact is required, stop with `SCOPE_TOO_NARROW`.

## Files and behavior that must stay untouched

The build must not change:

- `docs/ai-work/tasks/016-*`, `026-*`, or `027-*`;
- `docs/ai-work/LOG.md` in the real Cairn repository;
- `core/src/coordinator.ts` or its tests;
- `core/src/bounded-*`, `core/src/concurrent-*`, or their tests;
- `cli/src/flows/concurrent.ts` or `cli/test/concurrent.test.ts`;
- `app/src/renderer/components/TaskDeck.tsx` or the bounded Final display;
- `app/tests/concurrency-final.spec.ts` or any Task 026–027 proof;
- `core/src/provider-connection.ts` or `core/src/serial-v2.ts`;
- `core/src/gates.ts`, `core/src/files.ts`, or stored-data formats outside the new
  private scheduler namespace;
- `package.json`, `package-lock.json`, `core` or `cli` dependency declarations,
  `app/package.json`, or any installed package bytes;
- the Claude Agent SDK import target, `SdkEngine` model/effort resolution,
  provider request construction, subscription authentication, credential custody,
  login/preflight behavior, network destinations, retries, telemetry, or error
  reporting;
- `AGENTS.md`, `CONTRACT-TEMPLATE.md`, `MAINTAINERS.md`, public guides,
  `cairn.html`, or `CHANGELOG.md`;
- the behavior of ordinary serial tasks when the Final switch is absent;
- the behavior of the historical `CAIRN_PARALLEL_DRAFT` switch;
- remote refs, pushes, releases, deployments, public pages, messages, external
  services other than the separately approved Claude Code proof, or billing; or
- any existing task brief, report, approval, decision, evidence, or log row.

Task 028 must not copy a subscription credential into a child process, prompt,
state file, environment snapshot, command argument, model-visible result, report,
log, test fixture, browser surface, or Git. It uses only the provider-owned behavior
already exercised by Cairn's normal `SdkEngine` path.

## Protected starting state

At planning time:

- project root is
  `C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework`;
- `main` is `83af91723c12e2cba96e7a13eb41761e1218eef4` and is 35 commits ahead of
  `origin/main`;
- the complete tracked and untracked Git status is clean;
- nothing is staged;
- exactly one worktree exists, the project root on `main`;
- no `cairn/task-*` branch exists;
- `.git/cairn` is absent;
- Task 028 is the next unused task number; and
- the Git warning about the unreadable user-level ignore file is environmental;
  the repository's explicit `--untracked-files=all` status is still clean.

There is no modified or untracked starting work. The complete tracked tree at the
starting commit is protected except for the exact permitted build paths above.
Any unexpected change outside those paths stops the task. The Task 026 and 027
files and provider/bounded runtime paths are additionally protected by the explicit
no-change list.

## First visible checkpoint

The first visible checkpoint is an offline synthetic Desktop scenario, reached
before any real Claude session, that shows:

- two task cards start in Planning;
- two disjoint declared tasks are simultaneously in Building;
- one finishes Building while the other continues;
- only one card is in Checking at a time;
- both reach Done in a deterministic checked integration order; and
- the synthetic main worktree contains both exact results and two accurate
  `Applied / completed / DONE` log rows.

A second offline scenario must show an exact or ancestor path overlap as Waiting,
not refused and not built, while the earlier task continues. An uncertainty
scenario must show Waiting with a plain-language reason and zero builder calls.

## Safe rehearsal before production edits

All scheduler execution during build begins in newly created synthetic Git
repositories beneath the operating-system temporary directory, using injected fake
engines and disposable files.

Before production edits, the builder creates the new core acceptance tests and runs
them against the unchanged starting implementation as expected-red controls. The
controls must fail for the intended reasons:

- no Task 028 scheduler API or six-state view exists;
- the historical Parallel Draft refuses overlap instead of visibly waiting;
- the historical flow requires approval/review/decision rather than completing a
  Standard task continuously;
- there is no read-only scheduler Planning tool profile; and
- there is no scheduler path that builds two disjoint tasks and serially checks
  them against latest `main`.

The current serial path, Task 016 disabled behavior, Task 026–027 disabled behavior,
and ordinary mock engine tests must remain green as controls. An unrelated setup
failure, compilation-only failure, unexpected pass, or different failure cause is
not acceptable red evidence and stops with `REGRESSION_NOT_REPRODUCED`.

After implementation, the same acceptance assertions pass unchanged. Fault
injection and external-process interruption tests use only disposable synthetic
roots and fake engines. No real repository scheduler state, branch, worktree, or
main movement is allowed during rehearsal.

## Declared checks

The builder must run and report the real result of:

- pinned-brief commit, parent commit, and brief-blob verification;
- complete pre-build and post-build Git status, worktree, branch, and `.git/cairn`
  audits in the real repository;
- starting-commit comparisons for every protected Task 016, 026, and 027 path and
  every forbidden provider/bounded path;
- an expected-red run of the new scheduler acceptance cases against the starting
  implementation, with each intended failure inspected;
- `npm.cmd run build --workspace core`;
- `node --test core/dist/test/scheduler.test.js core/dist/test/scheduler-recovery.test.js`;
- `npm.cmd test --workspace core`;
- `npm.cmd test --workspace cli`;
- `npm.cmd --prefix app run typecheck`;
- `npm.cmd --prefix app run build:vite`;
- from `app`, `npx.cmd --no-install playwright test tests/scheduler.spec.ts tests/scheduler-recovery.spec.ts tests/concurrency-parallel-safe.spec.ts tests/concurrency-final.spec.ts tests/smoke.spec.ts`;
- a headed `tests/scheduler.spec.ts` run showing all six visible states;
- direct synthetic Git inspection proving two simultaneous builders, a maximum of
  two active engines, one Checking lease, latest-main integration, check reruns,
  exact log rows, and clean proved-owned cleanup;
- exact overlap, ancestor overlap, case-alias, uncertainty, malformed plan,
  non-Standard lane, dependency, external action, third-task, and dirty-main
  negative controls with zero unauthorized builder effect;
- brief/plan tamper, outside-path write, Bash attempt, deletion/rename, check
  failure, merge conflict, changed main, changed task commit, duplicate-log,
  foreign lock, and cleanup-interference controls;
- the declared interruption matrix, including before and after main fast-forward,
  with no automatic provider retry or duplicate log row;
- a source and built-output audit showing Task 026–027 modules and Desktop bounded
  view are unchanged and the new scheduler does not import the standalone Messages
  client or bounded broker;
- an `agents.ts` diff audit showing the existing SDK import, `query()` call,
  model/effort selection, options, authentication behavior, and network behavior
  are unchanged; only scheduler tool authorization may differ;
- confirmation that no dependency, version, lockfile, contract, public guide,
  historical task record, real work log, or activation file changed;
- `git diff --check` and actual diff inspection against the exact permitted list;
- exact-name staging inspection; and
- one safe local Task 028 implementation/report commit containing only the
  permitted build paths.

Tests that inspect provider integration use injected fake engines or source-level
assertions and make no network request. A repairable in-scope implementation or
test-harness error follows repair and rerun without weakening an assertion. The
report preserves important failed evidence.

## Separately approved live subscription proof

The build approval below does **not** authorize a Claude session. After every
offline check passes, the task pauses at the external-action boundary. The builder
must show the owner:

- the exact newly created disposable temporary repository path;
- its clean status, synthetic file list, and absence of reparse points or valuable
  data;
- the exact candidate source digest and scheduler state version;
- the exact selected Claude model and effort;
- two fixed harmless outcomes with disjoint exact paths;
- the maximum of four `SdkEngine.run` sessions for this proof: two Planning and two
  Building sessions, with no retry or re-planning;
- that normal Claude Code subscription networking is provider-owned and is not
  intercepted or enumerated by Cairn;
- the expected subscription/quota effect, with no claim of zero impact unless the
  owner confirms the current plan terms; and
- the exact owned branches, worktrees, possible main movement inside the disposable
  repository, cleanup target, and rollback.

Before that proof, a qualified human described below must review the exact candidate
diff and give a recorded `PASS` or `PASS WITH CONCERNS` for the disposable proof.
Then the owner must separately approve all of these exact actions in chat:

1. use the already installed, provider-owned Claude Code subscription connection
   without inspecting or changing it;
2. start the named four model sessions in the exact disposable repository;
3. allow those sessions to consume the disclosed subscription quota and use normal
   provider-controlled networking;
4. create, advance, and clean only the named disposable Git resources; and
5. retain only non-secret evidence: model id, effort, session count, timing,
   disposition, task outputs, checks, commits, and fixed redacted errors.

No retry, fifth session, login, refresh, browser authorization, credential recovery,
credential inspection, provider/network redesign, API-key use, standalone Messages
request, package operation, valuable-repository run, or broader external action is
authorized by those approvals. If the existing connection is unavailable, Cairn
stops with `CLAUDE_CODE_CONNECTION_UNAVAILABLE`; the AI does not start login or ask
for a secret. If a request-level destination guarantee becomes necessary, stop with
`PROVIDER_REDESIGN_REQUIRED` because the owner explicitly excluded that redesign.

The live proof must show two Planning sessions and two Building sessions, simultaneous
Building for a measurable overlap, serialized Checking, deterministic latest-main
integration, two correct outputs, two passing check reruns, exact cleanup, no retry,
no secret-shaped evidence, and the six truthful Desktop states. The real Cairn
repository remains untouched as a scheduler target.

## Qualified human and mandatory reviews

A qualified developer experienced with Git worktrees, concurrent Node/Electron
state machines, process interruption, local ref movement, and Claude Agent SDK
subscription execution is required before the live proof and before any valuable-
repository activation. The reviewer must inspect:

- exact path validation and overlap rules;
- tool-policy enforcement rather than prompt-only claims;
- scheduler lock, state, intent, and recovery logic;
- branch/worktree ownership and no-force cleanup;
- frozen task commits and compare-before-fast-forward integration;
- shell-free check execution and environment filtering;
- app restart behavior and visible state truthfulness;
- the `agents.ts` diff proving provider/auth/network behavior did not change; and
- the exact live-proof target and retained limitations.

The qualified reviewer never needs to inspect a credential or provider-owned
account file. A verdict other than PASS or PASS WITH CONCERNS stops live proof.

After the complete build and any approved live proof, a brand-new chat must perform:

```text
Review High-Stakes task 028.
```

That skeptical reviewer reads this pinned brief, the actual diff, all changed tests
and checking tools, synthetic and live evidence, and protected state before reading
the builder's report. The build is not accepted or activated by its own checks.

After review, the owner records one Task 028 decision. Acceptance preserves the
Final candidate but does not activate it. A later separate High-Stakes activation
must bind the exact accepted implementation commit, fresh-context verdict,
qualified-human verdict, owner decision, exact target repository, emergency stop,
and rollback before the real-repository refusal can be removed.

## What could be damaged and whether recovery is credible

- **Protected project work:** a broken scheduler could overwrite uncommitted files
  or move the wrong `main`. Admission requires a clean exact main, tasks work in
  isolated worktrees, integration compares exact commits under one lease, and
  unexpected state fails closed. Git commits make local source recovery credible;
  uncommitted valuable data would not, so any such data blocks admission.
- **Task scope:** a model could write outside declared paths or use a command as an
  escape. Scheduled builders receive no Bash and Write/Edit are exact-path gated;
  the coordinator independently inspects the full diff before staging. Out-of-scope
  work is retained and never integrated.
- **Git resources:** a crash could leave branches, worktrees, locks, or a moved ref.
  Durable intents, owner tokens, compare-before-move, and normal no-force cleanup
  make proved-owned transitions recoverable. Ambiguous ownership is retained as
  Needs attention rather than guessed.
- **Evidence truth:** a crash could duplicate a log row or report Done too early.
  Exact task commits, create-new or exact-match task records, one integration lease,
  and post-fast-forward observation prevent a Done claim until state agrees.
- **Subscription use:** concurrent or repeated sessions consume provider quota and
  create external network activity. The UI discloses a finite session maximum,
  there are no automatic retries, and the live proof needs separate exact approval.
  Consumed quota and completed requests cannot be rolled back.
- **Credential confidentiality:** changing the engine could expose provider-owned
  authentication. The task forbids provider/auth/network changes and records no raw
  provider data. If any secret-like value appears in model-visible output, files,
  logs, argv, evidence, or Git, stop immediately; do not inspect, copy, or repair it.
- **Historical candidates:** accidental edits could blur why Tasks 026–027 stopped.
  Their records and runtime paths are protected and compared to the starting commit.

## Exact rollback plan

Before activation, immediate runtime rollback is to leave
`CAIRN_TWO_TASK_SCHEDULER_FINAL` unset. Ordinary serial Cairn behavior remains the
default.

During synthetic rehearsal or the separately approved disposable live proof:

1. stop starting new model sessions;
2. mark any interrupted session outcome unknown and do not retry;
3. read scheduler state, Git refs, worktrees, locks, and process identity without
   changing them;
4. automatically finish or remove only an exact transition whose ownership and
   before/after state are proved;
5. otherwise retain the exact disposable repository and mark Needs attention;
6. never force-remove, reset, broadly clean, or delete an unproved path; and
7. after the report has captured the non-secret evidence, remove a disposable root
   only if the owner separately approves the exact deletion and absolute-path,
   temporary-parent, ownership-token, reparse-point, and not-project-root checks all
   pass.

The implementation and report will be one exact-name local commit after the pinned
brief. If the candidate is rejected, a later approved High-Stakes rollback task may
run `git revert [exact Task 028 implementation commit]`. Never reset history or
rewrite Tasks 016, 026, 027, or 028.

If the real Cairn repository gains unexpected scheduler state, a task branch,
another worktree, or an unplanned main commit, stop with `REAL_PROJECT_MUTATED`,
preserve it exactly, and require a separately approved recovery plan. Do not try to
clean it during Task 028.

## Assumptions and uncertainty

- The existing `SdkEngine` is the only supported subscription transport. Planning
  observed its current Claude Agent SDK implementation and normal Desktop preflight,
  but made no model call and inspected no provider-owned credential or account data.
- The Claude Agent SDK may make provider-controlled internal requests within one
  `query()` session. Task 028 bounds sessions, not HTTP request count, and does not
  claim a network-destination enforcement boundary. This is an explicit limitation,
  not permission to redesign the transport.
- The scheduler's production feature remains disabled until a later activation;
  therefore build and review can safely use only synthetic temporary repositories.
- Git worktree, ref, process, and atomic-file behavior on Windows requires direct
  tests and qualified-human judgment. Passing synthetic tests proves the supported
  path, not every filesystem or crash condition.
- The task assumes one local `main` branch and no remote operation. Other branch
  names, detached roots, submodules, worktree repositories, network filesystems,
  or multiple concurrent Cairn processes are unsupported and must fail closed.
- No dependency should be needed. A missing package or required version change is a
  scope expansion and stops the task rather than authorizing an install.

## Approvals required, listed separately

1. **Build approval:**
   `Approve High-Stakes task 028 at docs/ai-work/tasks/028-brief.md. Build it.`
   This authorizes only the exact permitted local edits, fake-engine tests,
   disposable synthetic Git resources, generated ignored output, report, and local
   exact-name commit. It does not authorize a real Claude session or activation.
2. **Qualified-human disposable-proof verdict:** required after offline build and
   before any subscription session.
3. **Live subscription proof approval:** the owner separately approves the exact
   connection use, four sessions, quota/network effect, disposable target, Git
   effects, cleanup boundary, and evidence after they are shown at the boundary.
4. **Mandatory fresh-context AI review:** required in a brand-new chat after build.
5. **Owner acceptance decision:** recorded only after review.
6. **Qualified-human activation verdict:** required for the exact accepted commit
   and exact valuable target.
7. **Separate activation approval:** a later High-Stakes task; Task 028 never
   activates itself.
8. **Any exact deletion of retained disposable evidence:** separate approval after
   target verification. Retention is the safe default.

No approval here authorizes login, credential creation or recovery, a fifth model
session, retry, provider/API redesign, dependency install/update, push, release,
deployment, message, billing change, public action, or valuable-data deletion.

## DONE and STOPPED

**DONE** means all of the following are true:

- only the exact permitted files changed and every protected path stayed unchanged;
- the new Final candidate remains default-off and refuses the real Cairn repository;
- the existing subscription engine transport/auth/network code is unchanged;
- Planning is product-read-only and produces strict exact path/check declarations;
- two disjoint Standard tasks build simultaneously in isolated worktrees;
- overlap and uncertainty visibly Wait with zero unauthorized builder effect;
- no task exceeds the two-engine/two-builder limit or retries automatically;
- scheduled builders have exact Write/Edit scope and no shell or integration power;
- local and latest-main check reruns use exact argv with `shell: false`;
- integration is one at a time from a frozen commit with compare-before-fast-forward;
- Done is truthful and Needs attention preserves ambiguous or failed work;
- the interruption matrix passes without duplicate logs, provider retries,
  simultaneous main movement, or unowned cleanup;
- all core, CLI, Desktop, headed, diff, source-audit, and protected-state checks pass;
- the qualified-human disposable-proof verdict permits the proof;
- after the separate owner approvals, exactly four existing-transport Claude Code
  sessions complete two disjoint disposable tasks through all six visible states,
  with correct results, serialized integration, cleanup, no retry, and no secret
  evidence;
- the report records all commands, exact real results, retained limitations,
  `Milestone movement: YES`, and `Disposition: DONE`; and
- one exact-name local implementation/report commit succeeds without changing the
  real `docs/ai-work/LOG.md`.

**STOPPED** means any required boundary or proof fails or remains unavailable. The
report names one stable blocker, preserves decisive non-secret evidence, records
`Milestone movement: NO` or `UNCLEAR`, and does not blur partial offline progress
into DONE. Stable blockers include:

- `STARTING_STATE_CHANGED`;
- `BRIEF_NOT_PINNED`;
- `REGRESSION_NOT_REPRODUCED`;
- `SCOPE_TOO_NARROW`;
- `PROTECTED_WORK_CHANGED`;
- `SUBSCRIPTION_ENGINE_CHANGE_REQUIRED`;
- `PROVIDER_REDESIGN_REQUIRED`;
- `QUALIFIED_REVIEW_REQUIRED`;
- `LIVE_SUBSCRIPTION_PROOF_NOT_AUTHORIZED`;
- `CLAUDE_CODE_CONNECTION_UNAVAILABLE`;
- `PLANNING_SCOPE_UNPROVED`;
- `BUILDER_SCOPE_UNPROVED`;
- `CHECK_EXECUTION_UNSAFE`;
- `INTEGRATION_SAFETY_UNPROVED`;
- `RECOVERY_UNPROVED`;
- `REAL_PROJECT_MUTATED`;
- `BOUNDED_REPAIR_FAILED`; or
- `ROLLBACK_UNCLEAR`.

An ordinary implementation or test-harness mistake may be repaired and rerun inside
the exact boundary. A provider/auth/network change, new dependency, new tracked
path, valuable-repository run, missing qualified review, unapproved external action,
or unclear rollback stops the task.
