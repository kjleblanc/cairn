# Task 031 — Reset the active product to one serial task path

Date: 2026-07-21

Status: PLANNED — awaiting the owner's exact High-Stakes build approval

Classification: High-Stakes Final

## Owner direction

Reset Cairn's active product to one serial task path.

Keep:

- first-run setup and beginner instructions;
- project creation, opening, recent-project selection, and the existing migration/conversion entry;
- task entry;
- the useful parts of the model-choice and activity UI;
- Git protection; and
- honest task records.

Replace the legacy five-gate Standard workflow with a streamlined serial router and
a short task contract. Remove concurrency, bounded-run, scheduler, passive-proof,
and experimental provider paths from the active runtime while preserving their Git
history and existing task evidence.

This task may implement one offline adapter seam. It must not connect a provider,
use or inspect a credential, make a model call, add a dependency, deploy anything,
or claim the self-hosting milestone.

## Relationship to Task 030

Task 030 is an unapproved plan for activating the contained scheduler. It was added
in another session at the protected starting commit for this task. Task 031 does not
resume, amend, build, delete, or rewrite Task 030. The reset makes Task 030's proposed
direction obsolete, but `docs/ai-work/tasks/030-brief.md` remains immutable planning
evidence in the working tree and Git history.

All earlier task briefs, reports, reviews, decisions, and append-only log rows remain
historical evidence. Removing code from the active tree must not rewrite that
history or suggest that the experiments never happened.

## Visible outcome

A beginner can use Cairn Desktop entirely offline to:

1. complete first-run setup when needed;
2. create, open, select, or enter the existing guided migration/conversion path for
   a project;
3. enter one task outcome;
4. see Cairn route it to the only available offline demonstration adapter, with a
   short plain-language reason and honest `provider: none` / `model: none` labels;
5. start one serial run;
6. watch a compact activity sequence — route, run, check, result; and
7. receive a verified result and honest task records that say the routing
   demonstration completed but the requested product change was not attempted.

The supported offline result is deliberately narrow. It proves that the new serial
product path, record lifecycle, verification, and Git protections work without a
provider. It does not pretend that deterministic local code implemented an arbitrary
user request.

In ordinary non-demo mode, where this task connects no model, the same task entry
must end at a useful connection-required choice. It must say that no model is
connected, offer to choose any already connected compatible route if one exists,
and explain that connecting a provider is not part of this foundation. That path
must create no task brief, report, log row, commit, or hidden scheduler state.

## Why this is High-Stakes

This is a broad replacement of Cairn's active public workflow. It removes exported
runtime modules, CLI commands, UI routes, provider dependencies, and tests, and it
changes how new task records are created. A mistake could silently preserve a live
experimental path, damage a beginner's existing work, or report a false success.
Although the work is local and Git-recoverable, its breadth and public-interface
impact make it High-Stakes.

## Milestone movement

This task does not claim the current self-hosting milestone. The most it can prove is
that Cairn has a small, honest, offline foundation on which a later provider task can
be built.

The product-generated demonstration report and log row must record:

`Milestone movement: NO`

Task 031's eventual builder report may describe whether the reset creates a credible
foundation, but it must not say that Cairn improved Cairn through a real model.

## Product boundary

### One active path

Desktop and CLI will expose one serial lifecycle:

`project -> task entry -> route -> run -> deterministic check -> result`

There is no task-level approval gate, role handoff, review agent, decision gate,
continuation, retry, delegation, parallel lane, scheduler, or background queue in
this lifecycle. Only one run may be active for a project. A second overlapping start
is refused with a plain-language explanation and no new records.

The project contract in `AGENTS.md` is governance for maintainers and is not replaced
by this product lifecycle. Task 031 must not amend that contract.

### Short serial task contract

Every started offline demonstration writes one concise Markdown brief before it
runs. The brief is the complete runtime task contract and contains only:

- task number and requested outcome;
- the bounded supported outcome: demonstrate routing and record verification, not
  implement the requested product change;
- lane: Standard, with the reason;
- selected adapter, provider, model, and routing reason;
- exact owned record paths and the protected starting Git state;
- the deterministic checks;
- stop conditions; and
- unambiguous DONE and STOPPED meanings.

It contains no approval, planning-agent, building-agent, review-agent, owner-decision,
continuation, scheduler, batch, or parallel-worktree fields.

### Serial router

Add a small core router whose input is task text plus adapter capability metadata.
It considers connected and compatible adapters only, returns one deterministic
recommendation with a reason, and permits a user override only to another connected
compatible candidate. With no candidate it returns `connection-required`; it never
silently substitutes an unconnected model.

The selection rule must be deterministic and unit-tested. No model may choose the
model in this task.

### One offline adapter seam

Define one narrow adapter interface and one deterministic offline demonstration
implementation. The interface receives the short structured task contract, not a
project root, arbitrary path, file contents, tool handle, shell, process, Git handle,
network client, credential, plugin, hook, skill, or MCP server.

The demonstration adapter:

- is available only through an explicit local demo/mock switch;
- is labeled as an adapter, not a local model;
- reports `provider: none` and `model: none`;
- performs no provider import, network access, process execution, or project-file
  mutation;
- returns a fixed-schema routing demonstration result derived only from the contract;
- has no retry or continuation; and
- cannot register another adapter or delegate work.

The coordinator, not the adapter, owns the three permitted records: brief, report,
and one append-only log row.

### Honest result and records

A successful offline demonstration report must visibly distinguish:

- `Routing demonstration: verified`;
- `Requested product change: not attempted`;
- one final `Disposition: DONE` for the bounded demonstration; and
- `Milestone movement: NO`.

Its append-only log row uses the Standard lane, `Applied`, `completed`, and a summary
equivalent to: `Offline routing demonstration verified; requested product change
not attempted.` It must not create approval, review, decision, scheduler, or provider
receipts.

If the adapter or a deterministic check fails, the same task closes once with an
honest STOPPED report and log row. There is no automatic retry. A partial failure
must never be shown as DONE.

Task numbering remains append-only and uses the next unused number. Existing task
records are view-only and are never renumbered, transformed, or deleted.

### Git protection

Before a run, record the selected project's Git HEAD plus complete tracked,
untracked, and staged status. Existing changes are protected and must not be cleaned,
reset, stashed, overwritten, moved, broadly staged, or absorbed into Cairn's commit.

The coordinator may atomically write only the new task brief, report, and exact log
append. It compares the ending state with the protected baseline, excluding only
those declared owned record changes. Unexpected changes force STOPPED.

If Git is available and the index is safe, Cairn may create one local commit by
staging the three record paths by exact name. It must skip the commit and explain why
when prior staged work or any ambiguity makes isolation unsafe. It may not use broad
staging, cleanup, reset, stash, or force operations.

The project dashboard must count visible milestone movement only from honest DONE
records that also say `Milestone movement: YES`; the offline demonstration must not
create a stone or imply milestone progress.

### Legacy project state

Existing task documents and log rows remain readable. If a selected project contains
legacy `.git/cairn` coordinator, scheduler, concurrent, or bounded-run state, the new
runtime detects its presence without parsing, changing, migrating, or deleting it.
Starting a new task is blocked with a plain-language legacy-state message. A later
separately planned migration may address that data.

This task performs no stored-data migration.

### Beginner-facing surfaces retained

Keep the current first-run welcome/setup flow, local project registry, create/open/
recent-project flows, project switcher, settings needed for those local features,
and the existing project conversion/migration guidance. The migration entry must be
honest that Task 031 does not transform stored task state.

Keep and simplify the useful UI ideas:

- one model-route card showing connection state, adapter/provider/model labels, and
  the recommendation reason;
- one compact activity feed for route, run, check, and result;
- a clear connection-required panel; and
- a final result screen with exact try-again or return-to-project actions.

Remove five-gate step rails, role cards, model-effort controls that imply live
providers, parallel task decks, scheduler decks, bounded-run status, and experimental
provider copy from active navigation.

The local Direction screen may remain only as deterministic, provider-free guidance.
It must not invoke a model or imply that it did.

## Files that may change during the approved build

Task 031 may modify only these existing product and documentation files:

- `README.md`
- `GETTING-READY.md`
- `CHANGELOG.md`
- `package-lock.json`
- `core/package.json`
- `core/src/files.ts`
- `core/src/gates.ts`
- `core/src/index.ts`
- `core/src/steps.ts`
- `core/test/files.test.ts`
- `core/test/gates.test.ts`
- `core/test/steps.test.ts`
- `cli/package.json`
- `cli/README.md`
- `cli/src/index.ts`
- `cli/src/ui.ts`
- `cli/src/flows/init.ts`
- `cli/src/flows/status.ts`
- `cli/src/flows/task.ts`
- `cli/test/ui.test.ts`
- `app/package.json`
- `app/package-lock.json`
- `app/README.md`
- `app/src/main/ipc.ts`
- `app/src/main/tasks.ts`
- `app/src/preload.ts`
- `app/src/shared/ipc.ts`
- `app/src/renderer/App.tsx`
- `app/src/renderer/app.css`
- `app/src/renderer/components/ActivityFeed.tsx`
- `app/src/renderer/components/RunReminder.tsx`
- `app/src/renderer/screens/Dashboard.tsx`
- `app/src/renderer/screens/Direction.tsx`
- `app/src/renderer/screens/Picker.tsx`
- `app/src/renderer/screens/Welcome.tsx`
- `app/tests/away.spec.ts`
- `app/tests/projects.spec.ts`
- `app/tests/smoke.spec.ts`

Task 031 may add only these implementation and test files:

- `core/scripts/clean-dist.mjs`
- `core/src/routing.ts`
- `core/src/serial.ts`
- `core/test/routing.test.ts`
- `core/test/serial.test.ts`
- `cli/scripts/clean-dist.mjs`
- `cli/test/task.test.ts`
- `app/src/renderer/components/ModelRoute.tsx`
- `app/src/renderer/screens/TaskRun.tsx`
- `app/tests/routing.spec.ts`
- `app/tests/serial.spec.ts`
- `docs/ai-work/tasks/031-report.md`

Task 031 may delete only these active runtime and obsolete test files. Their committed
history remains recoverable in Git:

- `core/src/agents.ts`
- `core/src/bounded-broker-child.ts`
- `core/src/bounded-broker-protocol.ts`
- `core/src/bounded-messages-fetch.ts`
- `core/src/bounded-provider.ts`
- `core/src/concurrent-activation.ts`
- `core/src/concurrent-run.ts`
- `core/src/concurrent-state.ts`
- `core/src/concurrent-worker-child.ts`
- `core/src/coordinator.ts`
- `core/src/parse.ts`
- `core/src/prompts.ts`
- `core/src/provider-connection.ts`
- `core/src/scheduler.ts`
- `core/src/scheduler-checks.ts`
- `core/src/scheduler-git.ts`
- `core/src/scheduler-proof.ts`
- `core/src/serial-v2.ts`
- `core/test/agents.test.ts`
- `core/test/bounded-broker.test.ts`
- `core/test/bounded-messages-fetch.test.ts`
- `core/test/bounded-provider.test.ts`
- `core/test/concurrent-activation.test.ts`
- `core/test/concurrent-run.test.ts`
- `core/test/concurrent-run-faults.test.ts`
- `core/test/concurrent-run-review.test.ts`
- `core/test/concurrent-run-transition-driver.ts`
- `core/test/coordinator.test.ts`
- `core/test/coordinator-final.test.ts`
- `core/test/coordinator-parallel-safe.test.ts`
- `core/test/coordinator-recovery.test.ts`
- `core/test/coordinator-regressions.test.ts`
- `core/test/parse.test.ts`
- `core/test/scheduler.test.ts`
- `core/test/scheduler-checks.test.ts`
- `core/test/scheduler-proof.test.ts`
- `core/test/scheduler-recovery.test.ts`
- `cli/src/flows/concurrent.ts`
- `cli/test/concurrent.test.ts`
- `cli/test/coordinator.test.ts`
- `cli/test/effort.test.ts`
- `cli/test/model.test.ts`
- `cli/test/scheduler.test.ts`
- `app/src/renderer/components/modelCatalog.ts`
- `app/src/renderer/components/ModelEffort.tsx`
- `app/src/renderer/components/QuestionCard.tsx`
- `app/src/renderer/components/SchedulerDeck.tsx`
- `app/src/renderer/components/StepRail.tsx`
- `app/src/renderer/components/TaskDeck.tsx`
- `app/src/renderer/screens/Scheduler.tsx`
- `app/src/renderer/screens/Wizard.tsx`
- `app/tests/ask.spec.ts`
- `app/tests/concurrency.spec.ts`
- `app/tests/concurrency-final.spec.ts`
- `app/tests/concurrency-parallel-safe.spec.ts`
- `app/tests/concurrency-recovery.spec.ts`
- `app/tests/model-effort.spec.ts`
- `app/tests/scheduler.spec.ts`
- `app/tests/scheduler-recovery.spec.ts`

The build may append no product-task row to `docs/ai-work/LOG.md`. Under the project
contract, Task 031's High-Stakes row is appended only when the owner later gives a
post-review decision.

If implementation discovers that another product file must change, work stops. The
approved brief must not be silently widened.

## Dependency boundary

No dependency may be added or updated. The approved build may remove the existing
Anthropic SDK packages and their now-unused lockfile entries from the core and app
manifests because the active provider path is being removed.

Lockfiles may be normalized only with an already-installed package manager in
offline, lockfile-only, ignore-scripts mode. The command must not install packages,
run lifecycle scripts, or use the network. If clean lockfile removal cannot be done
offline, the task stops rather than contacting a registry or leaving a misleading
manifest/lock mismatch.

No `node_modules` contents are part of the implementation commit.

## Generated-build protection

Deleted TypeScript sources can leave obsolete JavaScript in ignored `dist`
directories. The two permitted `clean-dist.mjs` scripts may remove only their own
resolved package-local `dist` directory immediately before a build. Each script must
fail closed if the resolved target is not exactly that package's `dist` child.

No source, project data, task evidence, dependency directory, user directory, or
other generated directory may be cleaned. Generated build output remains uncommitted.

## Protected starting state

The protected starting commit is:

`7ebf87ce8f61ad3f1daf647529f4c54b98a65a8c`

At planning time:

- branch: `main`;
- relationship: 43 commits ahead of `origin/main`;
- tracked modifications: none;
- staged changes: none;
- untracked files: none; and
- worktrees: only the main worktree observed during orientation.

Every tracked byte at that commit is protected except for the exact change/add/delete
paths listed above. All existing `docs/ai-work/tasks/000-*` through Task 030, all
reviews and decision records, and all prior rows of `docs/ai-work/LOG.md` are
especially protected.

The contract and its mirrors are out of scope:

- `AGENTS.md`
- `CONTRACT-TEMPLATE.md`
- `MAINTAINERS.md`
- `EVERYDAY.md`
- `HIGH-STAKES.md`
- `core/assets/contract.md`
- `app/resources/contract.md`
- contract version references

Task 031 also must not create a branch, worktree, task agent, scheduler state,
provider receipt, credential file, or deployment artifact.

## First visible checkpoint

The first visible checkpoint is a headed Desktop run against a newly created
disposable local project in explicit offline-demo mode:

`setup/picker -> project -> task entry -> offline route card -> route/run/check feed
-> verified result`

The disposable project's diff must contain only the new brief, report, and one log
append. The result must state that the requested product change was not attempted,
and the dashboard must show no milestone stone from the demo.

Before that headed check, the smaller core and CLI serial paths must already pass so
the visible UI is exercising the same coordinator rather than a renderer-only mock.

## Safe rehearsal

Before removing the legacy runtime, add focused tests and run them against the
current code to obtain an expected red baseline. The baseline should prove that the
new router/serial modules and the simplified UI do not yet exist, and that forbidden
legacy exports or controls are still reachable. Preserve the decisive failed output
in the Task 031 report.

The build then proceeds locally with no live effect. No provider package may be
loaded as part of a check.

## Required checks

### Core behavior

- deterministic connected-and-compatible routing and plain routing reasons;
- connection-required when no compatible adapter is connected;
- user override limited to connected compatible candidates;
- the demo adapter exposes no project root, path, files, tools, process, network,
  credentials, or delegation surface;
- one active serial run per project and a refused overlapping start;
- exact short contract, report, and append-only log formats;
- exactly one terminal disposition;
- successful demo records `requested product change: not attempted` and milestone
  movement NO;
- adapter/check failure records STOPPED once with no retry;
- dirty, untracked, and staged starting work is preserved;
- exact-name commit is skipped safely when isolation is unclear;
- unexpected path changes force STOPPED;
- legacy `.git/cairn` state blocks without mutation; and
- existing record numbering and reading remain intact.

### Negative provider and experiment checks

- normal mode has zero connected adapters and writes nothing at connection-required;
- no Anthropic SDK remains in an active manifest or lockfile;
- no active source, built module, export, CLI command, IPC channel, renderer route,
  or package script exposes provider connection, five-gate orchestration,
  concurrency, bounded runs, broker children, scheduler, passive proofs, parallel
  worktrees, model effort, continuation, or experimental activation;
- no test makes a network call, uses a credential, spawns provider code, or installs
  software; and
- no hidden mock labels a deterministic adapter as a real model.

### Build and test commands

Run the repository's already-installed, offline commands for:

- lockfile-only dependency removal with scripts disabled;
- core clean build and the reduced core suite;
- CLI clean build and its reduced suite;
- app typecheck and production build;
- the reduced Playwright suite; and
- one headed Playwright smoke run of the supported offline user path.

Run source and built-output audits after clean builds. Inspect the actual diff and
complete final Git status. Confirm that protected starting paths are unchanged and
that generated build output is not staged.

Any harness repair must preserve or strengthen the acceptance criteria. It may not
make a test easier merely to obtain green output.

## What could be damaged

- A broad deletion could remove onboarding, project selection, or useful history
  views along with the experimental workflow.
- A stale export or built file could leave a supposedly removed provider or
  scheduler path active.
- Lockfile edits could accidentally update packages or contact a registry.
- New record writing could absorb, overwrite, or commit the owner's existing work.
- A deterministic demo could be mistaken for real model work or milestone progress.
- Old `.git/cairn` data could be corrupted by an implicit migration.
- Removing active public modules could break CLI or Desktop startup.

These risks are credible but locally recoverable because all implementation changes
are limited to named tracked paths and one exact task commit. Existing user or legacy
state is never transformed.

## Rollback

Before build, verify the protected commit and clean starting state again.

If the approved build completes, it creates one local implementation commit that
contains only the named implementation changes and `031-report.md`. It does not
include a Task 031 log decision row.

Rollback is a new, explicit High-Stakes action after review: use `git revert` on the
exact Task 031 implementation commit, inspect the revert diff, rebuild, and rerun the
pre-reset smoke checks. Do not use `git reset --hard`, broad checkout, cleanup, stash,
or deletion. The already committed planning brief and all historical task evidence
remain.

If checks fail before a safe implementation commit, stop with the working tree
intact and report the exact state. Do not partially activate, deploy, or clean it.

## Approvals and human review

Required approvals are separate:

1. The owner must approve this exact pinned brief with:
   `Approve High-Stakes task 031 at docs/ai-work/tasks/031-brief.md. Build it.`
2. After the build, a brand-new chat must perform:
   `Review High-Stakes task 031.`
3. After reading that skeptical review and personally trying the offline path, the
   owner records accept, revise, rollback, defer, or escalate through the contract's
   decision command.

No qualified specialist is required for the approved build because it is a local,
reversible, offline refactor with no authentication, credential, valuable-data
migration, production, deployment, payment, public action, or external effect. The
fresh review and owner UI trial remain mandatory because the public workflow and
record safety are changing broadly.

No provider, credential, model call, network access, cost, dependency addition,
deployment, release, or live stored-data migration is approved here. Each would
require a separately scoped later task and its own exact authority.

## Assumptions and uncertainties

- The existing project migration/conversion entry is guidance, not an automatic
  stored-data transformer. This task preserves and clarifies that entry; it does not
  invent a migration engine.
- The offline adapter proves lifecycle wiring, not task competence. A later provider
  connection task must prove real model selection and execution separately.
- Removing provider dependencies may reveal undocumented imports. Repair is in scope
  only inside the named files and without adding or updating dependencies.
- Existing legacy runtime state may need a future read-only inspector or migration.
  Task 031 intentionally fails closed instead.
- The reset targets source, package entry points, and clean built output. Historical
  Git objects and task documents are expected to continue mentioning removed
  experiments.

## STOP conditions

STOPPED means the visible offline path or required checks do not complete, or any of
these occurs:

- the protected starting state changes unexpectedly;
- another product path must change;
- the implementation needs a new or updated dependency;
- lockfile work requires network access or package installation;
- a provider import, credential, model call, external service, deployment, or cost
  becomes necessary;
- existing project or `.git/cairn` state would need mutation or deletion;
- record isolation or rollback is unclear;
- a deleted experimental path remains reachable after a clean build;
- the demo could be mistaken for implementation of the user's product request;
- a check reveals unauthorized data loss, secret exposure, or external effect; or
- the scope expands beyond one offline adapter and one serial route.

The builder must write an honest STOPPED report and leave recoverable evidence. It
must not blur partial progress into DONE.

## DONE meaning

DONE means all of the following are true:

- Desktop and CLI expose one serial task route and no active five-gate, concurrent,
  bounded-run, scheduler, passive-proof, or experimental provider route;
- onboarding, project create/open/recent/migration guidance, task entry, useful route
  and activity UI, Git protection, and honest record viewing remain usable;
- the one deterministic offline adapter seam works without provider code, credentials,
  model calls, tools, network, project-file mutation, or delegation;
- normal mode honestly stops at connection-required and writes nothing;
- a beginner completes the supported headed offline path through a verified result;
- the resulting records say that the product request was not attempted and milestone
  movement is NO;
- all required negative, unit, integration, build, and headed checks pass;
- the actual diff contains only approved paths and historical evidence is unchanged;
- one exact local implementation commit is created safely; and
- `031-report.md` records real evidence, limitations, and the mandatory fresh-review
  next step without claiming self-hosting.

DONE does not mean a provider is connected, a real model selected or called, an
arbitrary coding task implemented, a migration completed, Cairn deployed, or the
self-hosting milestone achieved.
