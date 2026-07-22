# Task 030 — repair and activate the contained scheduler Final

Date: **2026-07-21**

Status: **Proposed High-Stakes Final — not approved, built, reviewed, accepted, or active**

## Visible outcome and milestone movement

Cairn Desktop has one activation-ready contained scheduler path that can use the
owner's already linked official Anthropic provider connection to complete one or
two independent Standard passive-text tasks in a brand-new disposable repository.
Each admitted task receives exactly one Planning call and, only after a valid
plan, exactly one Building call. The whole batch can consume no more than four
provider calls, has no retry or continuation path, gives the model no tools, and
never reads or sends the opened Cairn repository or any other valuable repository.

The supported live transport is the already installed official Anthropic Claude
Agent SDK subscription connection, hard-pinned for this profile to model
`claude-opus-4-8`, with no fallback model and no metered API key. Task 030 does not
perform or observe login, linking, refresh, recovery, entitlement, or billing work.

This moves the current milestone only after a reviewed and accepted Final completes
one separately authorized real-model disposable proof. The offline build alone is
an activation-ready result, not proof that a provider call succeeded.

Expected milestone movement:

- after the offline build: **UNCLEAR**;
- after a conforming live disposable proof: **YES**; and
- if the transport, containment, or call budget cannot be proved: **NO**, with a
  truthful stopped result.

## Lane and why

This is **High-Stakes Final** work. It changes a provider/network boundary,
activates an accepted Experimental Draft for real-model use, uses owner-managed
account access and subscription quota, and repairs concurrency/recovery code whose
failure could misstate what ran. The effect is contained to disposable data, but a
provider call and quota use are external and cannot be rolled back.

Task 029 remains immutable historical evidence. This task names and repairs its
accepted implementation rather than resuming or rewriting it:

- Task 029 brief commit: `aa41a30b11a0faf5b39b1363efa92bc0ab49e920`;
- Task 029 implementation/report commit:
  `1e5aacd1298fb5567775af8c349372ba972a2dd2`;
- Task 029 acceptance record commit:
  `1ca24161b48440d5eaf9563b0f8f50520ee2d01f`; and
- Task 029 log decision: accepted as a disabled offline/mock Draft after a fresh
  review returned `FAIL`; no activation was authorized.

## Retained review concerns that the Final must close

Task 030 retains every known Task 029 concern rather than treating owner acceptance
as technical proof:

1. **Coordinator failures were misclassified.** The passive Planning catch boundary
   could turn failures while saving a plan, creating a worktree, committing a brief,
   or publishing state into `Waiting` / `PLAN_INVALID` instead of `Needs attention`.
2. **Read-tool containment was not physical.** `schedulerToolDecision` approved
   passive Planning `Read`, `Glob`, and `Grep` requests without proving their paths
   stayed inside the disposable root. Direct probes approved outside Windows/user
   paths.
3. **The live engine was not proven.** The passive entry point accepted an arbitrary
   engine factory and checked only `CAIRN_MOCK=1`; it did not prove that production
   selected the intended SDK transport or that offline tests selected only the mock
   transport.
4. **Restart recovery was not proved through the ordinary Desktop path.** The
   existing Desktop recovery check reopened a retained proof explicitly. The Final
   must prove what a beginner sees after an actual app restart and must never hide a
   consumed call behind a retry.
5. **The Draft never used a real model.** Its own passing tests established only an
   offline mock path. The Windows file-symlink case also skipped with `EPERM`, and
   the passive evaluator remains co-located with historical scheduler code. Those
   facts remain visible in the Final report and review.

Any additional fresh-review concern discovered before Task 030 is built becomes a
retained concern only if it fits this exact outcome and boundary. A concern that
requires broader product, provider, filesystem, or repository authority stops this
task for a new plan.

## One supported user path

The only supported path is one finite Cairn Desktop proof batch prepared and run as
follows:

1. The owner opens the contained scheduler screen. The scheduler entry point does
   not receive, inspect, copy, or prompt from the currently opened Cairn repository.
2. The owner supplies one or two newly written, disposable passive-text outcomes.
   Each outcome is length-bounded, must be independently useful, and must not contain
   a secret, personal or regulated data, valuable repository content, source-code or
   package work, an external action, or an executable check.
3. Cairn creates a new coordinator-owned repository beneath the operating system's
   temporary directory, verifies its one-use provenance, freezes the exact outcomes,
   task numbers, model, call slots, cost/quota cap, and proof root into a prepared
   batch manifest, and makes no provider call.
4. The UI shows the exact prepared manifest and the separate authorization text.
   Closing or changing the batch invalidates that preparation.
5. Only after the mandatory review and owner acceptance of Task 030, the owner may
   activate the Final for one local Desktop process. Activation makes no call by
   itself.
6. Immediately before execution, the owner separately authorizes that exact prepared
   manifest. Cairn then consumes the fixed call slots. A failure or interrupted call
   consumes its slot and is never retried, resumed, continued, or delegated.
7. Coordinator code validates strict model output, writes only frozen passive
   `.md`/`.txt` artifacts and each task report, performs bounded declarative byte
   checks, and integrates completed task commits one at a time into only the
   disposable repository.
8. The UI shows the retained proof root, model id, call ledger, non-secret quota/cost
   evidence when available, task dispositions, and any fixed redacted error. Cairn
   does not automatically delete the proof.

Executable work, arbitrary file reading, valuable repositories, a third task, a
fifth call, retries, continuation, task-to-task communication, model tools, another
provider/model, metered API billing, deployment, production, or public use are not
supported.

## Exact provider-call budget

For this profile, one **provider call** means one newly created top-level Agent SDK
`query()` session that is configured for one model turn and has no continuation,
resume, fallback, tool, subagent, or retry route. The coordinator reserves a durable
slot before invoking it. The slot remains consumed whether the session succeeds,
fails, times out, is interrupted, or returns invalid output.

| Slot | When present | Purpose | Input |
|---|---|---|---|
| 1 | Task 1 | Planning | Task 1's frozen disposable outcome and the bounded JSON schema |
| 2 | Task 2, if chosen | Planning | Task 2's frozen disposable outcome and the bounded JSON schema |
| 3 | Task 1, only after a valid admitted plan | Building | Task 1's frozen outcome, validated plan, brief, paths, and output schema |
| 4 | Task 2, only after a valid admitted plan | Building | Task 2's frozen outcome, validated plan, brief, paths, and output schema |

With one task the ceiling is two calls. With two tasks the ceiling is four calls.
Unused Building slots are not reassigned. Planning or Building may overlap with its
independent peer, but no model sees peer input or output and Checking/integration
remain coordinator-owned and one at a time.

Before implementation relies on the installed subscription transport, a read-only
feasibility audit must prove from the already installed SDK/CLI bytes that this
configuration permits at most one provider model request and zero automatic retries
per reserved slot. `maxTurns: 1` and one `query()` invocation are necessary but are
not, by themselves, accepted as proof of the network-request ceiling. The profile
must use an existing official retry-zero control or another locally provable
single-request mechanism without adding a dependency or using a metered API key.

If that proof cannot be made, implementation stops before any live call with:

`PROVIDER_CALL_BUDGET_UNENFORCEABLE`

The task may not redefine “call” to hide SDK/CLI retries or use the standalone
Messages API candidate from Task 027, whose subscription transport was already
found incompatible.

## Model authority and strict output boundary

Both contained Planning and Building use a new dedicated SDK profile. It must set
and independently verify at least these properties:

- `cwd` is the verified disposable root or its verified task worktree;
- model is exactly `claude-opus-4-8` and no fallback model is set;
- one turn and one fresh session; no continue, resume, or fork;
- `tools: []` and `allowedTools: []`;
- no MCP servers, plugins, hooks, skills, subagents, additional directories, or
  owner-question tool;
- no project/local setting sources that can add tools, hooks, instructions, or
  paths;
- no session persistence or transcript/debug surface that could record account
  material; and
- a sanitized child environment that does not forward API-key or raw-token
  variables. The code removes prohibited variable names without inspecting,
  printing, comparing, or recording their values.

Zero model tools is deliberately stricter than Task 029's Read/Write gate. Planning
receives only coordinator-supplied synthetic prompt bytes and returns one strict JSON
plan. Building receives only the frozen plan/brief/outcome bytes and returns one
strict JSON envelope containing the declared passive artifact bytes and report bytes.
Only coordinator code writes them after validation. A model cannot read the
filesystem, choose an arbitrary path at tool time, run a command, or write a file.

The exact JSON validators must reject duplicate keys, surplus fields, wrong task
numbers, unlisted or aliased paths, absolute/parent/drive/UNC paths, non-`.md`/`.txt`
artifacts, excessive file counts or byte lengths, invalid UTF-8, code/package or
external-action work, missing frozen assertions, and a report without a truthful
disposition. Model text outside the one JSON value is invalid and consumes the call.

Coordinator writes use exclusive regular-file creation beneath the verified task
directory after ancestor reparse/hard-link checks. Model output never supplies Git
arguments, process arguments, commands, imports, module names, or cleanup targets.

## Finite containment check

The Final's containment claim passes only if all of the following are independently
observed:

- the scheduler's live public entry point constructs the dedicated SDK engine
  internally and exposes no production engine-factory injection;
- the offline public entry point constructs only the mock/fake engine and cannot
  select the live SDK;
- both profiles reject the wrong activation/mock combination before reserving or
  consuming a call;
- captured SDK options contain the exact model, verified disposable `cwd`, one-turn
  and fresh-session settings, empty tool/plugin/MCP/hook/skill/settings surfaces,
  sanitized environment, and retry-zero enforcement;
- no prompt contains the selected Cairn repository path or bytes, any arbitrary file
  bytes, peer task content, account data, or secret;
- exactly two durable slots are available per task and at most four per batch;
- hard exits and errors before, during, and after each provider boundary never cause
  a second invocation for that slot;
- plan-save, worktree, commit, transition, assertion, integration, and recovery
  failures become `Needs attention`, not ordinary `Waiting`;
- changed files in each worktree are exactly the frozen task brief, passive artifact
  paths, and report; declarative checks compare passive bytes only and start no
  model-authored process;
- a ready task can integrate while its peer provider call remains active, without
  exceeding two active model sessions or one active Checking lease;
- a real Desktop restart reopens the exact retained disposable batch, reports every
  consumed slot, makes zero recovery calls, and does not claim false `Done`;
- source, built output, and runtime interception show no standalone Messages client,
  Web tool, shell, package runner, child check process, dynamic evaluator, arbitrary
  engine factory, valuable-root read, or provider debug logging in the contained
  path; and
- the final real proof, if later authorized, reports the expected live engine and
  model id and cannot be satisfied by mock output.

Any escaped path, extra provider request, retry, valuable-root access, credential
surface, model-authored execution, unapproved cost, false engine identity, or
unrecoverable state is a safety failure and stops the task.

## Safe rehearsal before any live effect

All build and review work is offline. No credential, provider connection, network
request, subscription quota, or live activation is used.

1. Preserve an expected-red test against accepted Task 029 that reproduces the broad
   Planning catch, outside-root Read approval, arbitrary engine injection, and the
   non-ordinary restart recovery path.
2. Build the new Final behind a new default-off switch,
   `CAIRN_CONTAINED_SCHEDULER_FINAL=1`. Do not repurpose or silently activate Task
   029's `CAIRN_PASSIVE_SCHEDULER_DRAFT` switch.
3. Run a live-shaped offline fake through the same strict schemas, durable call
   ledger, state transitions, coordinator writes, declarative checks, and Desktop
   screens. The fake may supply model result bytes only; it receives no engine
   factory or filesystem/tool authority.
4. Rehearse one-task and two-task batches, invalid Planning, invalid Building,
   provider failure, timeout, interrupted process, plan-save failure, worktree/Git
   failure, artifact escape, hard-link/reparse alias, ready-first integration, and
   actual Desktop restart. Every used slot remains spent and recovery invokes no
   model.
5. Capture the dedicated SDK options without starting the SDK process or touching
   authentication, and assert the full tool-free/root-scoped/single-call profile.
6. Run the normal local build, type, focused core, full core, and focused Desktop
   checks; inspect changed tests/checking tools, the actual diff, and final Git state.

The first visible checkpoint is a headed offline Desktop run showing the prepared
one- or two-task manifest, exact two- or four-slot call ledger, disposable proof root,
and completed passive artifacts while an outside sentinel and the opened Cairn
repository remain byte-for-byte unchanged.

## What may change

Only these existing implementation paths may change:

- `core/package.json` — add exact new focused test files to the existing local test
  command only;
- `core/src/agents.ts` — add the dedicated contained SDK profile and strict
  transport/options construction without changing ordinary engine behavior;
- `core/src/prompts.ts` — add tool-free strict-JSON contained prompts that embed only
  frozen disposable bytes;
- `core/src/scheduler.ts` — add the separate Final switch/state/call ledger and repair
  failure classification, admission, integration, and recovery for this path;
- `core/src/scheduler-checks.ts` — tighten passive byte validation only if required by
  the Final's declared assertions;
- `core/src/scheduler-proof.ts` — distinguish and verify a one-use contained Final
  proof without weakening Task 029 proof checks;
- `core/src/index.ts` — export only the supported contained entry points and types;
- `app/src/main/ipc.ts` — report the distinct default-off contained Final readiness;
- `app/src/main/tasks.ts` — prepare and run only the internally selected offline or
  live contained engine, without receiving a valuable repository argument;
- `app/src/preload.ts` and `app/src/shared/ipc.ts` — carry the prepared manifest,
  explicit activation/batch-approval data, call ledger, and redacted result shapes;
- `app/src/renderer/app.css`;
- `app/src/renderer/components/SchedulerDeck.tsx`;
- `app/src/renderer/screens/Dashboard.tsx`;
- `app/src/renderer/screens/Scheduler.tsx` — show the supported boundary, preparation,
  exact call plan, separate authorization, engine identity, recovery, and retained
  proof state; and
- `docs/ai-work/tasks/030-report.md` — record the offline implementation and evidence.

Only these test/checking paths may change or be added:

- `core/test/agents.test.ts`;
- `core/test/scheduler.test.ts`;
- `core/test/scheduler-recovery.test.ts`;
- `core/test/scheduler-checks.test.ts`;
- `core/test/scheduler-proof.test.ts`;
- `core/test/scheduler-contained.test.ts` — new focused Final boundary tests;
- `app/tests/scheduler.spec.ts`;
- `app/tests/scheduler-recovery.spec.ts`; and
- `app/tests/scheduler-contained.spec.ts` — new focused visible activation/manifest
  tests.

A new source module, dependency, package/lock change, installed helper, operating-
system sandbox, credential broker, standalone Messages client, CLI surface, or
different app file is scope expansion and stops the task for owner review.

## What must stay untouched

- `AGENTS.md`, `CONTRACT-TEMPLATE.md`, `MAINTAINERS.md`, public guides, embedded
  contract copies, version references, and `CHANGELOG.md`;
- `docs/ai-work/LOG.md` during the build; it changes only through the later owner
  decision command;
- every Task 016 and Task 026–029 brief, report, decision, and historical commit;
- dependencies, installed package bytes, package locks, release/build systems,
  remotes, pushes, releases, deployments, and public surfaces;
- Task 027's Messages client/broker and all bounded/concurrent runtime modules;
- CLI behavior and files;
- ordinary serial Cairn behavior and the historical Task 028/029 switches when the
  new Final switch is absent;
- the selected/opened Cairn repository's files, Git state, path in prompts, and data;
- provider-owned account, credential, entitlement, billing, login/linking, refresh,
  recovery, and logout state; and
- any disposable root not created and claimed by the exact Task 030 run.

No broad staging, cleanup, reset, stash, deletion, dependency operation, network
documentation lookup, provider preflight call, or live canary is authorized by the
build approval.

## Protected starting work

Orientation found the project at:

- root: `C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework`;
- branch: `main`;
- starting commit: `e3e9c2ffc9e7e7df8e1de24e05e8ffc419ec9239`;
- one worktree, on `main`;
- Git status: clean, with no modified or untracked files; and
- local branch: 42 commits ahead of `origin/main`.

All existing tracked bytes and repository history are protected except for the
exact paths listed above. Generated ignored output remains unstaged. If protected
work changes unexpectedly, Task 030 stops without cleaning, resetting, stashing, or
overwriting it.

## Damage that is possible and whether recovery is credible

- **Provider quota or cost:** up to the separately approved finite cap can be
  consumed and cannot be recovered. The fixed slot ledger, retry-zero proof, and
  just-in-time batch approval bound this risk. No metered API spend is authorized.
- **Credential or account disclosure:** not credibly recoverable once exposed. The
  AI never reads account state or secret values; the dedicated child environment,
  logs, renderer, prompts, evidence, and errors exclude them.
- **Valuable-data disclosure:** not recoverable once sent. The scheduler receives no
  valuable repository argument or bytes and supports only new disposable input. Any
  valuable or personal input stops the path.
- **Filesystem escape or execution:** Git can recover the disposable repository, but
  an outside write or executed model output could cause broader damage. Zero model
  tools, coordinator-only validated writes, passive comparisons, reparse/hard-link
  checks, and process interception make either a stop condition.
- **False completion or duplicate calls after interruption:** could waste quota or
  mislead the owner. Durable pre-call reservation and no-call recovery make consumed
  slots monotonic; ambiguous work is retained as `Needs attention`.
- **Product regression:** local Git recovery is credible because the Final is behind
  a new switch and the exact implementation/report commit can be reverted later.
- **Disposable proof residue:** may consume local disk space. It is intentionally
  retained for inspection; no automatic or Task 030 deletion is authorized.

## Exact rollback plan

Before any live batch, rollback is immediate: leave
`CAIRN_CONTAINED_SCHEDULER_FINAL` unset, close the app, and if necessary use a later
approved exact Git revert of Task 030's implementation/report commit. The accepted
Task 029 Draft remains disabled and unchanged.

After activation but before a provider call, close the prepared batch or app and
unset the Final switch. The unconsumed manifest cannot be resumed after its owner
approval inputs or process identity change.

After any provider boundary:

- never retry or resume a consumed slot;
- close the app and unset the Final switch;
- retain the exact disposable proof, call ledger, and fixed redacted error;
- do not delete, force-clean, reset, or integrate ambiguous state;
- do not alter or unlink the provider account; the owner controls it only through
  the provider's official installed UI; and
- if a later local rollback is desired, plan an exact Git revert separately. It
  cannot refund consumed quota or retract provider-visible disposable prompts.

Deletion of any retained proof requires a later exact absolute-path approval after
read-only ownership and target checks. No broader temporary directory may be used as
a deletion target.

## Checks to run and evidence to inspect

- pinned-brief commit, parent, blob, and working-file verification;
- complete pre/post Git status, worktree, branch, and `.git/cairn` audits in the real
  repository;
- exact comparisons proving protected historical, provider, concurrent, CLI,
  contract, dependency, lock, and valuable-repository paths are unchanged;
- preserved expected-red controls against accepted Task 029 for all four reproduced
  review failures;
- read-only installed-transport audit proving a one-turn, retry-zero provider
  request ceiling or the declared `PROVIDER_CALL_BUDGET_UNENFORCEABLE` stop;
- focused contained engine/options, strict JSON, call-ledger, path, output, failure-
  classification, ready-first, and recovery tests;
- `npm.cmd run build --workspace core`;
- `npm.cmd test --workspace core`;
- `npm.cmd --prefix app run typecheck`;
- `npm.cmd --prefix app run build:vite`;
- `npx.cmd --no-install playwright test tests/scheduler.spec.ts
  tests/scheduler-recovery.spec.ts tests/scheduler-contained.spec.ts
  tests/concurrency-parallel-safe.spec.ts tests/concurrency-final.spec.ts
  tests/smoke.spec.ts` from `app`;
- one headed offline prepared-batch and ready-first run;
- one real app hard-exit/restart rehearsal with consumed fake slots and zero recovery
  calls;
- child-process, network, SDK-option, prompt-byte, outside-sentinel, reparse/hard-link,
  changed-path, and no-model-authored-execution audits;
- source and built-output inspection proving actual offline-versus-live entry-point
  selection and the absence of a production engine factory;
- inspection of every changed test and checking tool before accepting its result;
- `git diff --check`, exact permitted-path diff inspection, and final status; and
- one exact-name local implementation/report commit containing only permitted paths.

The mandatory fresh reviewer reruns only safe decisive offline checks. The reviewer
does not use the provider connection or consume a call.

## Qualified human and mandatory review

Qualified human required: **none**, for this one contained scheduler profile only.

Concrete reason: Contract v2.3 expressly permits an accepted Experimental Draft to
be activated by one High-Stakes Final without a qualified-human verdict when the
owner alone manages official provider linking, the model receives only new
disposable input, at most two Standard tasks use one Planning and one Building call
each, tools and arbitrary paths are absent, checking is passive, retained concerns
and actual engine selection are proved, the fresh review is non-failing, and the
owner separately authorizes the exact finite batch. This brief requires every one of
those conditions and excludes application permissions, billing changes, valuable or
personal data, production, deployment, public action, and executable work.

This is not a general waiver. A failed containment condition, permission or
entitlement change, metered billing, valuable target, personal data, production
effect, or broader scheduler path again requires the ordinary qualified-human and
High-Stakes boundaries.

After the offline build, a brand-new chat must run:

`Review High-Stakes task 030.`

The review must read the pinned brief, actual diff, changed tests/checking tools, and
protected state before the builder report. It must independently audit all retained
Task 029 concerns, root/tool authority, retry-zero call accounting, live/mock engine
selection, restart behavior, rollback, and unproved claims. A verdict of `FAIL` or
`VALID STOPPED` forbids activation. `PASS WITH CONCERNS` permits owner consideration
only if every concern remains inside this brief's contained live boundary.

## Approvals required, listed separately

1. **Offline build approval:**
   `Approve High-Stakes task 030 at docs/ai-work/tasks/030-brief.md. Build it.`
   This authorizes only the scoped local implementation, offline rehearsal, checks,
   report, and exact-name local commit. It authorizes no provider/network call,
   credential use, account action, cost, activation, or proof deletion.
2. **Mandatory fresh-context review:** `Review High-Stakes task 030.` No live call is
   allowed during review.
3. **Owner post-review decision:**
   `My decision for High-Stakes task 030: accept` (or revise, rollback, defer, or
   escalate). A `FAIL` or `VALID STOPPED` review cannot be accepted for activation
   under the contained scheduler profile.
4. **Owner-managed provider connection:** the owner personally completes or confirms
   the official installed Anthropic connection outside AI observation. Task 030 does
   not click, type, inspect, refresh, recover, unlink, or change billing/entitlements.
5. **Separate operational activation, only after a permitted review and acceptance:**
   `Authorize Task 030 activation at commit [exact accepted implementation commit]:
   enable CAIRN_CONTAINED_SCHEDULER_FINAL=1 for one local Cairn Desktop process only;
   make no provider call until I approve the prepared batch.`
6. **Exact finite-batch approval immediately before execution:** after Cairn shows a
   prepared manifest, the owner must send:
   `Authorize Task 030 contained batch [manifest SHA-256] at [exact disposable root]
   using my already linked official Anthropic Claude subscription connection and
   model claude-opus-4-8 for [one/two] tasks and exactly [two/four] reserved provider
   calls: Planning and Building for Task [N] [and Planning and Building for Task N].
   No retries, continuation, fallback, tools, valuable data, or additional spend.
   Shared cap: [two/four] subscription calls and US$0 additional metered cost. Frozen
   disposable outcomes: [exact outcome(s)].`
7. **Any retained-proof deletion:** a later exact approval naming each verified
   absolute proof root. This task never deletes proof evidence.

Changing the root, manifest hash, outcome, provider, model, number of tasks, call
count, cost/quota cap, accepted implementation commit, or process after approval
invalidates that approval. Another batch always requires another exact approval.

## Activation-ready status

The planned code is an **activation-ready High-Stakes Final**, not an Experimental
Draft. It remains default-off throughout build and review. The build report may say
`Disposition: DONE` only for a completely verified activation-ready Final and must
state that no live activation or provider call occurred. It may not claim the
milestone moved until the later exact live proof succeeds.

Task 030 activation is real only after:

1. the offline Final is committed;
2. the mandatory fresh review is neither `FAIL` nor `VALID STOPPED`;
3. the owner accepts Task 030;
4. the owner gives the exact operational activation authority;
5. the prepared manifest receives the exact finite-batch authority; and
6. runtime evidence proves the live SDK/model, finite call ledger, passive output,
   and containment without a retry or safety failure.

Activation never makes valuable repositories, executable tasks, unattended future
batches, or automatic calls supported.

## DONE and STOPPED

The offline build is **DONE** only when the exact accepted Task 029 candidate is
repaired within this boundary, all declared offline checks pass, every retained
concern is addressed or explicitly bounded, rollback remains credible, the report
is accurate, and one exact-name implementation/report commit is made without a live
effect.

The live contained proof is **DONE** only when all post-build gates above are met and
one exact authorized disposable batch completes within its two- or four-call ledger,
with no retry, valuable access, secret surface, model-authored execution, false
engine, or unapproved cost. A one-task proof is sufficient if the approved manifest
contains one task; two tasks are a ceiling, not a requirement.

Task 030 is **STOPPED** when the transport call ceiling or retry-zero behavior is
unprovable, a retained `FAIL` concern remains in the supported path, review returns
`FAIL` or `VALID STOPPED`, protected work changes, a qualified-human boundary appears,
the owner has not given the exact next approval, account use would require AI-
observed login or metered billing, a secret/value could enter a prohibited surface,
the live/mock engine is ambiguous, the disposable root is unproved, a fifth or retry
call could occur, rollback is unclear, or any containment check fails.

Waiting for the mandatory review, owner decision, operational activation, or exact
prepared-batch approval is a truthful gate, never permission to infer authority.
