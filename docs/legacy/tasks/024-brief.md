# Task 024 — deliver the Contract v2.2 bounded concurrent path as a Final

Lane: **High-Stakes**

Mode: **Final — activation-ready candidate, disabled until later activation**

Planning date: **2026-07-20**

Starting `main`: `91fccd3d7594885ca961f6f01510a89d45dc8232`

Historical source candidate that may be selectively reused:
`e5c7b8f3eab5f7e628dbe48a67c552f7c7f0eede`

## Fixed direction and planning boundary

The direction is fixed: implement Cairn Contract v2.2's bounded concurrent path.
Task 016 remains immutable historical evidence. This task does not resume, rewrite,
accept, or activate Task 016. It may reuse selected code from the exact Task 016
implementation commit only after independently verifying each reused part.

This planning task creates and pins only this brief. It authorizes no runtime edit,
test-generated repository, worktree, provider process, credential use, network
request, cost, activation, valuable-repository execution, cleanup, install, update,
push, publish, or deployment.

## Visible outcome and milestone movement

Cairn gains one bounded concurrent run that can admit a fixed batch of one or two
independently useful Standard tasks. For the two-task path:

1. both strict task definitions are validated together before either task is
   admitted or receives a worktree;
2. each task receives its own Git worktree under the operating-system temporary
   directory;
3. each builder is limited to its frozen exact implementation and test paths plus
   its unique report;
4. the two builders may execute concurrently;
5. completed work is integrated into `main` strictly by task number, one task at a
   time, against the latest `main`;
6. each task's declared checks are rerun in its integration candidate before
   `main` advances;
7. successful and stopped outcomes receive honest reports and log rows; and
8. normal completion or tested failure leaves one clean main worktree, no task
   branch, no task worktree, no live lock, and no active coordinator state.

The supported provider transport permits at most two separately bounded tool-free
calls through official installed authentication, exactly one allocation for each
admitted task. No model receives a tool, project path, command, arbitrary prompt,
credential, valuable data, or authority to cause an external effect.

Expected milestone movement: **YES** only if the implementation and offline
rehearsal pass, the separately approved two-call disposable proof completes both
useful tasks end to end, cleanup invariants hold, and the real Cairn repository is
changed only by Task 024's pinned brief and later exact implementation/report
commit. An offline-only result is useful but does not satisfy this task's DONE
criteria.

## What “Final” means here

This task produces a Final candidate for the supported Windows CLI-started,
Desktop-observed path defined below. “Final” does not mean active, accepted,
cross-platform, deployed, or safe for every repository.

The candidate remains disabled unless either:

- it is running in the exact Task 024 rehearsal/proof mode against a newly created
  disposable Git repository beneath the operating-system temporary directory; or
- a later separately approved activation task creates a repository-bound activation
  record naming Task 024's exact accepted implementation commit, review verdict,
  owner acceptance, target repository, and activation authorization.

An environment variable alone must never enable valuable-repository execution.
The emergency value `CAIRN_BOUNDED_CONCURRENCY_DISABLE=1` must take precedence over
every activation record for new admissions and provider calls. Offline recovery and
cleanup must remain available while admissions and calls are disabled.

The build, its mandatory review, the owner's acceptance, and activation are four
separate gates. Task 024 build approval reaches only the first gate.

## Historical evidence read and exact provenance

Planning inspected all Task 016 evidence retained in this repository:

- pinned brief commit
  `bae645005356867f5b27f01896bf00639ecb08ca`;
- implementation/report commit
  `e5c7b8f3eab5f7e628dbe48a67c552f7c7f0eede`, whose parent is the
  pinned brief and whose tree is
  `a9bf0c2a7ffaa84f0b3e0afe51022d79a6852ad9`;
- Task 016 brief and report;
- every source and test patch in the implementation commit;
- Task 017's pinned evaluation brief
  `7d0a491f513ba5f8087438ecd370efc680eb53ff`;
- Task 017's independent reproduction report
  `4723e221cfeb793ba21b0a2df27fc92827ad79c6`;
- the Task 016 `revise` decision now retained in `docs/ai-work/LOG.md` by
  commit `8f29d811971cd07d32c4df746e03e6641709a1ad`; and
- Contract v2.2 and Task 023's governance report at current HEAD.

The original fresh-context Task 016 review is not retained as a standalone file in
the repository. Its exact two findings are preserved in both Task 017 records, and
Task 017 independently reproduced them. Those committed reproductions, the Task 016
tests and implementation, and the append-only `revise` decision are the available
durable review evidence.

At planning time, `git diff e5c7b8f..HEAD` was empty for every Task 016 source and
test path below. The current files therefore still have the exact Task 016 blobs:

| Task 016 path | Git blob in `e5c7b8f` |
|---|---|
| `core/package.json` | `3f359d06a796bd2a611e2ac8baf884bcf5eb6e78` |
| `core/src/coordinator.ts` | `4b9f1b1c2e312d1541fcbdca9987a7d6d0ba27f6` |
| `core/src/steps.ts` | `dd15d2cd3d84fe67de053ecfd9b7571fb01d89eb` |
| `core/test/coordinator.test.ts` | `727fb74d5e3df223b3256c2bad781eb5e007c3fc` |
| `core/test/coordinator-regressions.test.ts` | `2bc9d08c6f136d2e8671c57665f02f3696741e10` |
| `core/test/coordinator-parallel-safe.test.ts` | `b4ed38ac38d58e7cf7ee17fc48cfe159a3fbf4b2` |
| `app/src/renderer/App.tsx` | `0cd60791feabf4199885965a7093c3733fa63834` |
| `app/src/renderer/components/TaskDeck.tsx` | `c11bec565f65721d9ac3bdd6c325143d47bb5ce6` |
| `app/src/renderer/screens/Dashboard.tsx` | `7b673b47658f51a02bd8532227d49419e19d48a7` |
| `app/src/renderer/screens/Wizard.tsx` | `5cbe5a781b052944f02e959496bd5ccc4e0ce999` |
| `app/tests/concurrency-parallel-safe.spec.ts` | `6cb803429583382eaecd8d1d8c86117d93783fa8` |

The immutable historical record blobs are:

- `docs/ai-work/tasks/016-brief.md`:
  `2f4b0e316662d3bd129303f37c5af5e086108dd8`;
- `docs/ai-work/tasks/016-report.md`:
  `232ee72057dee582ccb01dd1c3be35203f9e78a3`.

No Task 016 assertion is accepted merely because it passed in 2026. Reused code is
treated as untrusted source until the independent checks below pass against the new
Final.

## Task 016 parts that may be reused

The implementation may selectively retain and repair these mechanisms from exact
commit `e5c7b8f`:

- strict repository-relative path parsing;
- temporary-directory worktree derivation and ownership checks;
- atomic coordinator-state replacement and exclusive lock acquisition;
- task branch/worktree creation;
- frozen brief and approval hashing;
- pre-builder scope inspection;
- builder write gating;
- immutable task-commit integration input;
- detached integration rehearsal and rerun of declared checks;
- serialized main advancement;
- refusal visibility in the Desktop task deck; and
- no-flag legacy behavior.

Every retained function or UI path must appear in a reuse ledger in the Task 024
report with its Task 016 blob, its Task 024 blob, whether it was retained or
repaired, and at least one independent test or black-box observation that exercises
it. Unlisted Task 016 behavior is not claimed as reused or verified.

## Retained Task 016 concerns and required resolution

### Concern 1 — admission-capacity bypass

Task 017 reproduced three provisional reservations becoming three admitted tasks,
showing `admitted=3`. Task 024 must remove this state shape, not only add a later
count check.

Resolution required: a run receives a complete fixed batch of one or two frozen
task definitions. Under one coordinator lock, Cairn parses and validates the whole
batch, checks its total size and all cross-task paths, and only then records the
batch as admitted. Admission closes permanently for that run. A third definition,
late registration, or a second process racing the same run is refused before it
receives a task identity, branch, or worktree.

### Concern 2 — malformed refinement writes approval evidence

Task 017 reproduced a valid admitted task being refined into malformed metadata,
remaining admitted/defined, and creating `001-approval.json` before
`BRIEF_CHANGED`.

Resolution required: the bounded path accepts only already pinned task briefs and
exposes no refinement operation after batch validation. Any changed, missing,
malformed, incomplete, or extra-field brief invalidates admission before approval
or builder activity. Approval creation must use create-new semantics only after the
same in-lock validation succeeds. Tests must prove zero approval artifact and zero
provider/builder call for malformed or changed input.

### Other retained concerns from Task 017

The Final must also resolve, for its supported path:

- previously unsupported approval, build, recovery, stopped-outcome, integration,
  and cleanup sequences;
- crash and scheduling interleavings at every persistent transition in the finite
  run state machine;
- production entry-point ambiguity by naming the exact CLI/Desktop path below;
- valuable-repository uncertainty by keeping the candidate inactive and requiring
  a later repository-specific activation plan and qualified Git/concurrency review;
  and
- absence of real-model evidence by completing the separately approved disposable
  two-call proof.

Non-Windows activation remains outside this Final. The code must fail closed on an
unsupported platform; a later task may add and prove another platform.

## Fixed-batch admission schema

The bounded path accepts one strict run manifest with exactly one or two task
entries. Unknown fields, duplicate keys, proxies/accessors in programmatic input,
missing fields, invalid enum values, blank arrays where a field is required, and
non-canonical paths fail closed.

Each task entry must bind all of these fields:

- schema version;
- permanent task number and exact brief path;
- exact frozen brief SHA-256;
- `lane: "Standard"`;
- `recordMode: "Applied"`;
- a non-empty plain-language visible outcome;
- `independentlyUseful: true` with a plain-language reason;
- exact `implementationPaths`;
- exact `testPaths`;
- the subset of those paths the credentialless builder may write;
- exact argv-based checks with no shell;
- `dependencies: []`;
- `externalActions: []`;
- provider, model, exact input digest, one-call allocation, and maximum allocated
  cost; and
- the unique brief, approval, report, and evidence paths owned by that task.

The entire batch is refused before side effects unless every task is complete,
Standard, Applied, independent, free of dependencies and task-level external
actions, and assigned disjoint exact paths.

Path comparison uses normalized repository-relative Git paths. It rejects:

- identical paths;
- file/directory ancestry in either direction;
- `.` and `..` traversal;
- absolute, drive-relative, UNC, alternate-data-stream, glob, environment,
  shell-substitution, empty, or non-normalized forms;
- `.git`, coordinator state, activation state, `docs/ai-work/LOG.md`, another
  task's records, or another coordinator-owned path;
- case-only aliases when the repository is case-insensitive; and
- any existing symlink, junction, reparse point, submodule boundary, or path whose
  resolved parent escapes the repository/worktree.

Conflict comparison uses the union of both tasks' implementation paths and test
paths. Unique task-record paths are allocated by the coordinator and may not be
declared by a task.

## Worktree, main, and ownership boundary

- The main worktree must start on clean `main`, with no merge, rebase,
  cherry-pick, or revert in progress.
- The run records the exact starting main commit and repository identity.
- Each admitted task receives one branch `cairn/task-NNN` and one worktree beneath
  a fresh run-specific directory under the operating-system temporary directory.
- The resolved worktree root must not exist before the run and must not contain a
  link, junction, mount, or reparse point.
- A builder process receives only its disposable task worktree and may write only
  its frozen writable implementation/test paths and unique report path.
- Builders never receive the main-worktree path, `.git` path, coordinator-state
  path, other worktree path, activation record, or `docs/ai-work/LOG.md` as a
  writable or model-visible path.
- Main, the work log, run state, locks, admission, integration candidates, evidence
  finalization, and cleanup are coordinator-owned.
- Task processes cannot stage, commit, merge, rebase, create refs/worktrees, edit
  another task, or append the shared log. The credentialless coordinator performs
  those Git operations with exact argv arrays and rechecks ownership first.
- No broad staging is permitted. Every task and integration commit stages exact
  named paths.

The supported run is a closed batch. After admission, no replacement or third task
can join even after one task finishes.

## Frozen-artifact and pre-execution gate

The coordinator freezes the run manifest, each brief, each call-approval record,
each allowed/writable/test path set, each starting test hash, each provider input,
each cost allocation, the starting main commit, the activation/proof gate, and the
runtime implementation identity.

Immediately before each initial build, recovery resume, attempted retry, provider
call, model-result application, task commit, integration rehearsal, and main
advance, the coordinator must revalidate under the current exclusive lock:

- state schema, repository identity, run identity, ownership token, revision, and
  closed batch size;
- admitted task identity and phase;
- current main branch, clean state, and expected commit;
- frozen manifest, brief, approval, provider input, allowed scope, writable scope,
  test hashes, checks, call allocation, and cost cap;
- task branch, worktree, base commit, retained changes, and absence of undeclared
  paths or destructive changes;
- the other task's phase, capacity, scope, and integration ownership;
- the activation/proof mode and emergency-disable value;
- provider-call ledger and total-cost ledger; and
- absence of an unfinished Git operation or unowned/stale active process.

No blocker, lease, or call allocation is cleared before all applicable checks pass.
Failure occurs before provider or builder control and preserves the previous
truthful phase.

The bounded path authorizes no provider retry. An attempted retry still passes the
frozen-artifact gate, then fails with `PROVIDER_CALL_LIMIT` before any call because
its one allocation is already consumed or possibly consumed. A crash after a
request starts but before a validated result records `CALL_OUTCOME_UNKNOWN`, consumes
that task's allocation, and causes an honest STOPPED outcome. A sealed validated
result may be resumed after a local crash without another provider call only when
its digest and every frozen artifact still match; this is recovery, not a retry.

## Provider boundary and exact disposable proof calls

The Final supports only Anthropic Claude through the already-installed official
`@anthropic-ai/claude-agent-sdk` bytes. Planning observed installed version
`0.2.141`. No dependency or model update is permitted. If the installed version or
required option surface differs at build time, stop before a live call.

Both proof tasks use model `claude-haiku-4-5`, one SDK query, one turn, no fallback,
and a hard maximum allocation of **US$0.25**. The fixed total cap is **US$0.50**.
Allocations cannot be transferred between tasks. A second request, SDK retry,
fallback, or higher cost is denied. If one outbound provider request per task cannot
be enforced and observed, live execution stops.

The shared exact system text is:

```text
Return only strict JSON matching {"replacement":"string"}. Do not use tools, request more information, or include extra fields.
```

### Disposable proof Task 001

- Provider: Anthropic via official installed Claude authentication.
- Model: `claude-haiku-4-5`.
- Exact implementation path: `content/welcome.txt`.
- Exact test path: `test/welcome.test.mjs`.
- Writable path: `content/welcome.txt` only, plus Task 001's report.
- Exact user input:

  ```text
  Write one welcoming sentence of 8 to 18 words for a synthetic beginner reading-list demo. It must include the word "welcome".
  ```

- Exact canonical UTF-8 input bundle (one line, no trailing newline):

  ```json
  {"system":"Return only strict JSON matching {\"replacement\":\"string\"}. Do not use tools, request more information, or include extra fields.","user":"Write one welcoming sentence of 8 to 18 words for a synthetic beginner reading-list demo. It must include the word \"welcome\"."}
  ```

- Canonical UTF-8 input-bundle SHA-256:
  `3f50f7d24b6e52247aa05eae652d6a0bed39ce8bd7ce6da42642b74ee117bfe8`.
- Call allocation: exactly one.
- Maximum allocated/provider-reported cost: US$0.25.
- Declared checks, as argv without a shell:
  - `node --test test/welcome.test.mjs`;
  - `node --test test/welcome.test.mjs test/add-book.test.mjs`.
- Independent usefulness: it replaces the placeholder welcome copy in the
  disposable reading-list demo and remains useful if Task 002 stops.

### Disposable proof Task 002

- Provider: Anthropic via official installed Claude authentication.
- Model: `claude-haiku-4-5`.
- Exact implementation path: `content/add-book.txt`.
- Exact test path: `test/add-book.test.mjs`.
- Writable path: `content/add-book.txt` only, plus Task 002's report.
- Exact user input:

  ```text
  Write one instruction sentence of 8 to 18 words for a synthetic beginner reading-list demo. It must include the words "add" and "book".
  ```

- Exact canonical UTF-8 input bundle (one line, no trailing newline):

  ```json
  {"system":"Return only strict JSON matching {\"replacement\":\"string\"}. Do not use tools, request more information, or include extra fields.","user":"Write one instruction sentence of 8 to 18 words for a synthetic beginner reading-list demo. It must include the words \"add\" and \"book\"."}
  ```

- Canonical UTF-8 input-bundle SHA-256:
  `2196cff705d1b7e4dff0507afc0ba808871e377aadf14da1e9a7631f2fb6bdd8`.
- Call allocation: exactly one.
- Maximum allocated/provider-reported cost: US$0.25.
- Declared checks, as argv without a shell:
  - `node --test test/add-book.test.mjs`;
  - `node --test test/welcome.test.mjs test/add-book.test.mjs`.
- Independent usefulness: it replaces the placeholder add-book guidance and
  remains useful if Task 001 stops.

The two implementation and test sets are disjoint and have no ancestry conflict.
The fixture tests are committed in the disposable repository before admission and
must remain byte-identical throughout both builds and integrations.

Each provider process receives only its exact system/user strings and output
schema. It runs from a newly created empty broker directory, not from a project or
worktree. Configuration is fixed to `maxTurns: 1`, one model, no fallback,
`tools: []`, `allowedTools: []`, no MCP servers, no agents, no skills, no plugins,
no hooks, no settings sources, no session resume/persistence, no debug transcript,
no file checkpointing, and a deny-all tool callback. Model output is inert until a
credentialless validator accepts an ordinary non-Proxy object with exactly one
enumerable data property, `replacement`, meeting the task-specific sentence rules.

## Credential, network, output, and evidence boundary

The owner creates, installs, rotates, revokes, and, if necessary, repairs the Claude
credential only through Anthropic's official installed authentication or the
operating-system credential store. Cairn does not perform login, refresh, recovery,
account setup, or billing changes and never asks the owner to paste a credential.

Credential values must never enter chat, prompts, command arguments, process output,
model-visible tools, model output, project files, Git, state, locks, approvals,
reports, logs, evidence, renderer/browser/IPC state, analytics, telemetry, crash
output, or raw errors. The credentialless coordinator and both task workers receive
no credential value, provider headers, account data, provider-owned files, or
credential-facing process environment.

The credential-facing broker:

- uses official installed authentication without locating, reading, printing,
  copying, or reporting the credential;
- accepts only the two compile-time proof request schemas and fixed model/cost
  configurations;
- has no project/worktree path and no arbitrary filesystem or subprocess API;
- maps every failure to a fixed Cairn-owned redacted code;
- emits no raw provider message, stack, header, account datum, or debug output;
- disables or blocks telemetry, update, browser, and crash-report destinations;
- permits only the separately approved provider request to `api.anthropic.com`
  over HTTPS; and
- closes after its task's first success, failure, or uncertain outcome.

Network observation records only non-secret destination, start/end time, request
count, model id, bounded provider-reported cost, and disposition. It never records
headers or bodies. If the SDK cannot use official authentication while meeting
these conditions, cannot disable/block a second request, or might expose a
credential through telemetry/crash behavior, stop without calling it.

Evidence may contain only validated replacement sentences, their hashes, fixed
redacted error codes, model id, bounded cost, timing, task disposition, Git commit
ids, path lists, and check results. Raw authentication/provider material is never
evidence.

## Serialized integration, evidence, and cleanup

Builders may finish in either order. Integration is deterministic by task number.
For each task, the coordinator:

1. freezes the builder result and exact task commit;
2. creates one detached integration candidate from the latest serialized main;
3. applies only that task's frozen commit when the task is DONE;
4. creates or verifies the honest task report;
5. reruns every declared check in the candidate;
6. verifies no undeclared path, changed test, shared log write, task-branch movement,
   or other task's bytes entered the candidate;
7. appends the one coordinator-owned `Applied / completed` row for DONE or
   `Applied / stopped` row for STOPPED;
8. advances clean `main` only by an exact fast-forward from the previously checked
   commit; and
9. records the new main commit before releasing the integration lease.

A STOPPED task contributes its frozen brief, honest report, and stopped log row but
none of its implementation bytes. Its generated partial output is summarized by
path and hash, not copied into main. The proof fixtures explicitly pre-authorize
discarding generated partial output after this evidence is committed.

After both outcomes are durable on main, or after a tested terminal failure has
been converted to honest stopped evidence, the coordinator must:

- verify each task worktree belongs to the recorded task and contains no protected
  user starting work;
- remove each clean generated task worktree by exact path;
- delete each generated `cairn/task-NNN` branch only after its durable evidence is
  confirmed;
- remove detached integration worktrees;
- prune only the exact stale metadata created by this run;
- remove the run lock, temporary state, backup, sealed result, and activation-free
  call ledger;
- leave the run-specific top-level disposable proof repository retained for review
  with one main worktree and no active coordinator artifact; and
- verify main, work log, reports, branches, worktrees, refs, state, locks, and
  provider processes agree.

No cleanup command may target the real repository root, home directory, generic
temporary directory, unresolved variable, wildcard, or unowned path.

## Crash recovery and finite failure envelope

The coordinator uses a write-ahead journal with explicit ownership and
before/after commit ids. Recovery runs before new admission and never makes a
provider call. Fault-injection tests must interrupt every persistent transition,
including:

- batch validation/admission;
- first and second worktree creation;
- approval freeze;
- before, during, and after each provider-call ledger transition;
- sealed-result validation and application;
- task commit;
- integration lease acquisition;
- candidate creation/rebase/check;
- immediately before and after main advances;
- success/stopped evidence commit;
- each worktree and branch removal; and
- final state/lock removal.

On restart, recovery must either finish the already determined local transition or
mark the affected task STOPPED without another provider call, serialize honest
evidence, and complete owned cleanup. The tested failure matrix must end with the
same cleanup invariant as success.

Unexpected external movement or dirtying of main, ownership mismatch, corrupted
unattributable paths, or protected user work is outside the automatic-cleanup
authority. It fails closed as `EXTERNAL_INTERFERENCE` or
`RECOVERY_OWNERSHIP_UNPROVEN`, changes nothing further, and makes Task 024 STOPPED;
the Final may not be called activation-ready if that condition is reproducible
without external interference. The supported user path assumes the owner does not
edit main or start another Git operation while the fixed run is active.

## Supported CLI/Desktop user path

The only mutating production entry point is the CLI command:

```text
cairn concurrent run --manifest <exact-repository-relative-manifest-path>
```

The command accepts one already pinned one-or-two-task manifest on clean main. It
validates and admits the whole batch, shows both exact briefs/scopes/provider
allocations, records the separately supplied live approvals, starts at most two
credentialless builders/provider brokers, serializes integration, performs
recovery if needed, and prints final evidence and cleanup status. It never falls
back to the legacy multi-turn `cairn task` engine.

The recovery-only entry point is:

```text
cairn concurrent recover --run <exact-run-id>
```

It may make no provider call and may touch only state and paths already owned by
that run.

Desktop is the read-only companion for an active bounded run. Opening the same
repository shows both task numbers, scopes, phase, call-consumed state, blocker,
check result, integration order, stopped evidence, and cleanup result. It exposes
no legacy define/refine/approve/build/retry/review/decide button for a bounded run,
never starts a provider process, never receives raw provider output, and directs
recovery to the exact CLI command. Existing serial CLI/Desktop behavior remains
unchanged while the Final is inactive.

The build's headed Desktop proof must show two tasks separately, one-at-a-time main
advancement, honest stopped evidence in the fake failure scenario, and a final
“cleaned up” state with no active action controls.

## Exact files allowed to change during the approved build

Only these tracked repository paths may be created or modified:

### Core implementation and registration

- `core/package.json`;
- `core/src/coordinator.ts`;
- `core/src/steps.ts`;
- `core/src/index.ts`;
- `core/src/bounded-provider.ts` — new;
- `core/src/concurrent-run.ts` — new.

### Core tests

- `core/test/coordinator.test.ts`;
- `core/test/coordinator-regressions.test.ts`;
- `core/test/coordinator-parallel-safe.test.ts`;
- `core/test/coordinator-final.test.ts` — new independent Task 016 concern suite;
- `core/test/coordinator-recovery.test.ts` — new fault/cleanup matrix;
- `core/test/bounded-provider.test.ts` — new fake-provider/canary/call-limit suite;
- `core/test/concurrent-run.test.ts` — new offline end-to-end suite.

### CLI implementation and tests

- `cli/package.json`;
- `cli/src/index.ts`;
- `cli/src/flows/task.ts`;
- `cli/src/flows/status.ts`;
- `cli/src/flows/concurrent.ts` — new;
- `cli/test/coordinator.test.ts`;
- `cli/test/concurrent.test.ts` — new.

### Desktop observation path and tests

- `app/src/main/ipc.ts`;
- `app/src/main/tasks.ts`;
- `app/src/preload.ts`;
- `app/src/shared/ipc.ts`;
- `app/src/renderer/api.ts`;
- `app/src/renderer/global.d.ts`;
- `app/src/renderer/App.tsx`;
- `app/src/renderer/components/TaskDeck.tsx`;
- `app/src/renderer/screens/Dashboard.tsx`;
- `app/src/renderer/screens/Wizard.tsx`;
- `app/tests/concurrency-parallel-safe.spec.ts`;
- `app/tests/concurrency-recovery.spec.ts`;
- `app/tests/concurrency.spec.ts`;
- `app/tests/concurrency-final.spec.ts` — new.

### Task record

- `docs/ai-work/tasks/024-report.md` — new during the build.

This pinned `docs/ai-work/tasks/024-brief.md` must not change after approval.
Ignored output may be regenerated only under existing build/test output directories
such as `core/dist`, `core/assets`, `cli/dist`, `app/.vite`, `app/resources`, and
`app/test-results`. It must not be staged.

If any other tracked path is required, stop with `SCOPE_TOO_NARROW`. A future
approved revision must use a new task; this brief is not widened after approval.

## Files and behavior that must remain untouched

The build must not change:

- Task 016, Task 017, Task 021, or any earlier brief, report, review evidence,
  approval, decision, or log history;
- `docs/ai-work/LOG.md` in the real Cairn repository;
- `AGENTS.md`, `CONTRACT-TEMPLATE.md`, `MAINTAINERS.md`, public guides,
  `CHANGELOG.md`, `README.md`, `cairn.html`, or generated contract policy bytes;
- dependency declarations other than test-script registration, dependency versions,
  package lockfiles, installed packages, build/release systems, or public release
  artifacts;
- `core/src/agents.ts` and its legacy tool-enabled `SdkEngine`;
- `core/src/provider-connection.ts` and the accepted Task 020 fake-only seam;
- Task 018's serial v2 implementation and default serial behavior;
- provider account, credential, login, billing, model catalog, or external-service
  configuration;
- remote refs, `origin`, releases, deployments, published packages, or websites;
  or
- the real repository's main history except for the pinned Task 024 brief commit
  during planning and the exact implementation/report commit during the approved
  build.

The old `CAIRN_PARALLEL_DRAFT` flag must not activate the Final or any valuable
repository. Historical Task 016 code may remain named internally during repair only
when the Final gate prevents accidental activation and the report records the
mapping honestly.

## Protected starting work

At planning time:

- project root:
  `C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework`;
- branch: `main`;
- HEAD: `91fccd3d7594885ca961f6f01510a89d45dc8232`;
- local main is 27 commits ahead of `origin/main`;
- the index, tracked working tree, and untracked working tree are empty;
- exactly one worktree exists, the main worktree;
- no `cairn/task-*` branch exists;
- `.git/cairn` is absent; and
- Task 024 is the next unused task number.

There is no modified or untracked starting work to list. Every tracked path outside
the exact allowed-file list is protected by the starting commit. The following
historical/governance files receive an additional byte check before and after the
build:

| Protected file | Planning SHA-256 |
|---|---|
| `AGENTS.md` | `9ED59AF0C49AD3C74314A411D0E7C58BDBDCF6AE138F450D7CF26CEA0B0E3272` |
| `docs/ai-work/PROJECT.md` | `B814178D7470445DBB38F5548605936628946EC737EA37D2359501DE1FD01F71` |
| `docs/ai-work/LOG.md` | `7834219771B1863FC7706A0EAF894AC6150A64D79E77E9F46F879D0F6DB3C18B` |
| `docs/ai-work/tasks/016-brief.md` | `888EC5B04D987CEA5FE9B1A2A9593836353990B2E060BD7F6704B2F8774C10B9` |
| `docs/ai-work/tasks/016-report.md` | `360D7BEA5831C92A7ADA8D0482051221D171F77473F06BD29C4989EADF1F5891` |
| `docs/ai-work/tasks/017-brief.md` | `1EA3B74E04B3CBE522B070454E2928418BCCE1FC27A7225B6CCC40015AFEF76D` |
| `docs/ai-work/tasks/017-report.md` | `E85A1B53537C0E7181ABFC6DF4581963F892C8B7DA3B27462F310BE0366994EB` |
| `docs/ai-work/tasks/021-brief.md` | `2C7BD105B098891C47557440A3EDC55BE0DE2CA813D034CA69C5110C2D973F68` |
| `docs/ai-work/tasks/023-report.md` | `D0C565CED468E637615EF1FDEE2F9517380D0F15E6D3029D68CC2164FFD57500` |

Saving this brief may advance main by exactly one brief-only commit whose parent is
the starting HEAD. Before build edits, the builder must confirm the pinned brief is
unchanged, its parent is the exact starting HEAD, the worktree is otherwise clean,
and all protected bytes still match.

## First visible checkpoint: offline fake-provider rehearsal

The approved build must proceed offline first. No credential is located or used,
no provider SDK query starts, outbound provider access is blocked, and no valuable
repository runs the coordinator.

Before changing production source, create the four new independent core test files
listed above and run them against the unchanged Task 016-derived source. The
expected-red control must independently reproduce at least:

- three pre-reservations becoming three admitted tasks;
- malformed refinement remaining admitted and creating an approval artifact;
- inability to close a run without retained task branches/worktrees/state;
- stale/crash states that require manual preservation rather than deterministic
  owned recovery;
- the lack of a strict one-call tool-free provider ledger; and
- the lack of the supported CLI/Desktop Final path.

Existing passing controls for two disjoint worktrees, serialized integration,
frozen approval checks, scope gating, and default-off behavior must be identified
separately. An unexpected pass, unrelated compile/setup failure, or different red
cause stops with `REGRESSION_NOT_REPRODUCED`. After implementation, the same
substantive independent assertions must pass without weakening.

The full offline rehearsal then creates only new disposable Git repositories under
a unique `%TEMP%\cairn-task-024-*` root and uses a fake provider with a fixed
non-secret canary. It must prove:

1. strict one- and two-task batch admission;
2. third/late/racing admission refusal before identity or worktree creation;
3. incomplete, High-Stakes, non-Applied, dependent, external-action, identical,
   ancestry-overlap, protected-path, case-alias, and link-escape rejection;
4. two disjoint builders overlap in time in separate worktrees;
5. neither builder can see or write main, the other task, coordinator state, the
   shared log, undeclared paths, or test paths marked read-only;
6. frozen manifest/brief/approval/scope/test/input/cost checks immediately before
   both builds and every recovery/retry attempt;
7. fake call allocation exactly once per admitted task, total cap enforcement,
   hostile result rejection, canary redaction, fixed errors, and no outbound
   connection;
8. DONE/DONE, DONE/STOPPED, STOPPED/DONE, and STOPPED/STOPPED evidence truthfulness;
9. deterministic one-at-a-time integration against latest main with declared
   checks rerun before each advance;
10. failure before and after each journal transition recovers without another fake
    call and reaches the cleanup invariant;
11. CLI execution and recovery output is novice-readable;
12. headed Desktop observation is read-only, truthful, and exposes no unsafe
    action;
13. the old flag and absent activation leave valuable-repository behavior off; and
14. every retained disposable root is listed in the report with one main worktree,
    no task branch/worktree, no lock/state, and no live child process at completion.

The owner can inspect the first visible checkpoint: a disposable reading-list repo
whose fake pair ran concurrently, integrated serially, preserved both reports and
log rows, and ended fully cleaned. Passing this checkpoint authorizes no live call.

## Separately gated real-provider end-to-end proof

After every offline check passes, the builder must stop and show:

- exact Task 024 implementation bytes and hashes;
- installed SDK version;
- broker executable/hash and fixed configuration;
- exact two input bundles and digests;
- exact model, endpoint, one-request counters, per-task allocations, and total cap;
- resolved new disposable repository/broker/worktree roots;
- real repository protected-state fingerprint;
- expected reversible file effects and irreversible request/cost effects;
- fake-canary and zero-network results; and
- the four exact live approvals still needed below.

Only after all four approvals are present may the build create one new disposable
Git repository and perform the proof. Both calls may overlap only after both tasks
pass their immediate pre-call gate. The proof must record exactly two provider
requests total, one per task, and no other outbound destination. Each validated
sentence is applied by a credentialless worker, both task reports are written, Task
001 integrates and reruns its checks, Task 002 rebases/integrates against the new
main and reruns its checks, both Applied/completed rows appear, and owned cleanup
finishes.

If either call fails, is uncertain, exceeds its allocation, returns invalid data,
or would require a retry, that task is STOPPED without another call. Because Task
024's required live proof is two successful independently useful tasks, Task 024 is
then STOPPED even though honest stopped evidence and cleanup must still complete.

The proof repository is retained for review but contains only its main worktree and
durable task evidence. Nothing is copied, merged, or activated in the real Cairn
repository.

## Decisive checks

The builder must run and report real results for all of these:

1. re-orientation, pinned-brief blob/parent verification, full status, empty index,
   protected hashes, worktree list, task-branch list, and `.git/cairn` absence;
2. exact Task 016 commit/tree/blob verification and an empty current-vs-`e5c7b8f`
   diff for all reused starting paths;
3. expected-red independent suite and inspection of each intended cause before
   production edits;
4. `npm.cmd run build --workspace core`;
5. the unchanged independent suite after implementation;
6. `npm.cmd test --workspace core`;
7. `npm.cmd test --workspace cli`;
8. `npm.cmd --prefix app run typecheck`;
9. existing serial, coordinator, Task 016, Task 018, and Task 020 regression suites;
10. targeted headed Desktop suites including
    `concurrency-final.spec.ts`, `concurrency-recovery.spec.ts`,
    `concurrency-parallel-safe.spec.ts`, `concurrency.spec.ts`, `away.spec.ts`, and
    `smoke.spec.ts`;
11. a direct CLI fake-provider run outside the test runner in a newly created
    disposable Git repository;
12. a separate temporary fault-matrix driver against compiled public APIs, not the
    modified test helpers;
13. direct Git inspection after every fake outcome combination and every injected
    crash: exact main/log/report commits, `git status`, `git worktree list
    --porcelain`, `git branch --list "cairn/task-*"`, refs, Git-operation markers,
    lock/state paths, and child-process inventory;
14. direct reproduction of the two Task 016 review findings showing each now fails
    before its former side effect;
15. source inspection proving no legacy `SdkEngine`, tool list, arbitrary prompt,
    project path, credential value, broad environment, shell, fallback, or retry is
    reachable from the bounded provider path;
16. fake-canary scans of only Task 024-created roots and captured Cairn evidence;
17. observed zero outbound network during the fake rehearsal;
18. before live use, local inspection of installed SDK bytes/options sufficient to
    establish one request, tool-free operation, official authentication, no
    telemetry/debug/session/crash leakage, and the cost cap; otherwise STOPPED;
19. if separately approved, the exact two-call disposable proof and non-secret
    request-count/cost evidence;
20. after proof, broker/child termination and disposable cleanup invariant;
21. protected real-repository hash/status/worktree/branch/state comparison;
22. `git diff --check`;
23. complete actual diff and test-diff inspection against this exact file list;
24. confirmation that no dependency, lockfile, public policy, historical task,
    activation state, or unrelated path changed;
25. reuse ledger audit mapping every reused Task 016 part to independent proof;
26. exact-name staging and staged diff/blob inspection; and
27. one local Task 024 implementation/report commit containing only allowed paths.

Modified tests are not independent proof. The direct CLI run, external fault
driver, raw Git/state inspection, two reproduced-review probes, protected-byte
comparison, source audit, live request counter, headed owner-visible path, mandatory
fresh-context review, and qualified developer review provide checks beyond them.

No test may be deleted, skipped, weakened, converted to a string-only assertion, or
changed after expected-red merely to obtain a pass. A checking-harness defect may
be repaired only when the original acceptance criterion remains intact; the failed
evidence and correction must be reported and all affected checks rerun.

## What could be damaged

A defect could:

- admit more than two tasks or admit an unsafe/dependent/overlapping task;
- let a malformed or changed brief create approval/provider/build effects;
- expose one task, main, coordinator state, the shared log, or test files to the
  other builder;
- overwrite protected main work or advance main from a stale/conflicting commit;
- merge a failed task or append a false DONE row;
- skip declared checks, weaken tests, or integrate two tasks concurrently;
- lose stopped evidence or delete generated work before durable evidence exists;
- strand a task branch, worktree, integration worktree, lock, journal, call ledger,
  provider process, or coordinator state;
- repeat a provider call after failure/crash or exceed the two-call/US$0.50 cap;
- expose a credential through prompts, commands, tools, environment, output, logs,
  evidence, Desktop/browser state, telemetry, or crashes;
- let model output select a path, tool, command, prompt, network action, or external
  effect;
- accidentally activate the candidate in Cairn's valuable repository; or
- make a disposable result look like reviewed, accepted, or active production
  behavior.

Source changes and disposable Git effects are recoverable. Credential disclosure,
provider transmission, and cost are not reversible. Wrong main advancement or
deletion of unowned work may not be safely reversible without inspection. These
are the reasons for expected-red rehearsal, exact live approvals, write-ahead
recovery, pre-main checks, default-off activation, and mandatory reviews.

## Rollback, containment, and cleanup plan

Before live provider use:

1. leave activation absent and emergency disable available;
2. stop the fake run;
3. run only its ownership-verified offline recovery path;
4. serialize honest stopped evidence in the disposable repo;
5. remove only that run's generated branches/worktrees/locks/state;
6. retain the top-level disposable repo for inspection; and
7. record STOPPED in Task 024's report.

After a live request starts:

1. mark that task's allocation consumed even if the response is unknown;
2. issue no retry or fallback;
3. close both brokers and outbound permission;
4. validate and apply only a complete exact-schema result;
5. otherwise write honest stopped evidence without implementation bytes;
6. finish owned cleanup and retain the proof repo; and
7. record provider-reported cost because it cannot be undone.

If credential exposure is suspected, stop all AI/model/tool processing. The owner
uses the provider's official interface to revoke or rotate the credential and
inspects provider activity; no credential is pasted into chat or examined by
Cairn.

If the real Cairn repository changes unexpectedly, do not reset, clean, stash,
revert, delete, or move anything. Stop with `REAL_PROJECT_MUTATED`, preserve state,
and require a separately planned recovery.

Immediate runtime rollback before later activation is simply absence of the
repository-bound activation record. After future activation,
`CAIRN_BOUNDED_CONCURRENCY_DISABLE=1` blocks new admissions/calls while offline
recovery remains available. Removal of an activation record, rollback of an
accepted implementation commit, or cleanup of retained proof roots is a separate
High-Stakes task with exact targets. A source rollback may use `git revert` of the
exact Task 024 implementation commit only after active runs are fully recovered and
the owner separately approves it.

## Approval boundaries

### 1. Build approval

The only build approval is:

`Approve High-Stakes task 024 at docs/ai-work/tasks/024-brief.md. Build it.`

It authorizes only the exact listed source/test/report edits, already-installed
offline builds, expected-red and fake-provider rehearsals, creation and owned
cleanup of newly created disposable temporary Git evidence, ignored generated
output, and one exact-name local implementation/report commit.

It does **not** authorize credential use, provider authentication, network, either
live call, cost, login, browser flow, billing change, activation, valuable-repo
execution, installation/update, push, publish, deploy, release, external message,
or deletion of retained evidence.

### 2. Credential-use approval immediately before proof

After the offline stop and exact boundary display, the required credential message
is:

`For High-Stakes task 024's disposable proof only, I confirm my Claude credential is owner-managed through Anthropic's official installed authentication or operating-system store, and I approve the verified broker to use it only for the two named tool-free tasks. Do not reveal, inspect, copy, or log its value.`

This authorizes no network request or cost by itself.

### 3. Exact Task 001 provider call

The required Task 001 message is:

`For High-Stakes task 024 disposable Task 001 only, approve exactly one tool-free request to api.anthropic.com using claude-haiku-4-5 and input SHA-256 3f50f7d24b6e52247aa05eae652d6a0bed39ce8bd7ce6da42642b74ee117bfe8, with no retry, fallback, tool, or other destination.`

### 4. Exact Task 002 provider call

The required Task 002 message is:

`For High-Stakes task 024 disposable Task 002 only, approve exactly one tool-free request to api.anthropic.com using claude-haiku-4-5 and input SHA-256 2196cff705d1b7e4dff0507afc0ba808871e377aadf14da1e9a7631f2fb6bdd8, with no retry, fallback, tool, or other destination.`

### 5. One fixed total cost cap

The required cost message is:

`For High-Stakes task 024's disposable proof, approve one fixed total provider-cost cap of US$0.50: at most US$0.25 allocated to Task 001 and at most US$0.25 allocated to Task 002. Allocations are not transferable; no retry, second call for either task, fallback model, higher cost, or billing change is approved.`

All four live messages must be present after the offline rehearsal and immediately
before execution. Missing, altered, stale, or unbindable approval means no affected
call. A Task 001 approval cannot be reused for Task 002 or vice versa.

### 6. Review, acceptance, and activation

After the build, the mandatory next step is a brand-new chat:

`Review High-Stakes task 024.`

The fresh-context AI reviewer repairs nothing and is not independent expert
assurance. Before activation, a qualified Git/concurrency developer must also
review the exact candidate and evidence as described below.

Only after review may the owner record:

`My decision for High-Stakes task 024: accept`

Acceptance still leaves the Final disabled. Separate activation begins with a new
High-Stakes plan naming the accepted implementation commit and exact repository:

`Plan a High-Stakes task: Activate accepted Task 024 Final commit [exact commit] for the Cairn repository at [exact absolute path].`

No message in Task 024, including build approval, live-call approval, review PASS,
qualified-human PASS, or owner acceptance, creates the activation record.

## Qualified human and mandatory independent review

No qualified human is required solely for owner-managed official provider
authentication in the disposable proof when every Contract v2.2 credential
exception condition is actually met. If any condition is not met, the proof stops;
the task does not silently add a broader security boundary.

A qualified developer **is required before owner acceptance for activation**
because this Final will eventually coordinate Git worktrees, concurrent state,
atomic locks, crash recovery, branch removal, and main advancement on valuable
work. The developer must have practical experience with Git worktrees/refs/rebase
and fast-forward behavior, concurrent state machines, write-ahead recovery,
filesystem atomicity on Windows, process failure, integration conflicts, and safe
cleanup. They must inspect the exact implementation commit, modified tests, direct
fault evidence, cleanup roots, and both Task 016 concern probes. They do not inspect
or receive a credential.

Their recorded verdict must identify role, scope, verdict, and retained concerns
without personal data. A passing form is:

`For Task 024, a qualified Git/concurrency developer reviewed the exact implementation commit, admission locking, worktree ownership, serialized integration, crash recovery, and cleanup evidence. Verdict: PASS for the named Windows CLI-started/Desktop-observed path; retained concerns: [none or exact list]. No credential value was disclosed.`

A qualified or missing verdict prevents activation. It does not erase a truthful
build report.

## Assumptions and remaining uncertainty

- Git, Node, npm, the current installed dependencies, and the installed Claude SDK
  remain available; no install/update is authorized.
- The owner does not edit main or start another Git operation during a bounded run.
- The supported activation target is Windows. Other platforms fail closed.
- The two fixed proof inputs are disposable and contain no valuable repository or
  user data.
- Passing fault injection covers the finite modeled transitions, not every possible
  operating-system, hardware, antivirus, power-loss, SDK, provider, or filesystem
  defect.
- Official provider authentication and the installed SDK must satisfy the strict
  no-secret/no-telemetry/no-extra-request boundary without Cairn inspecting a
  credential. If that cannot be established from installed behavior, STOPPED is
  the correct result.
- A fresh-context AI review reduces anchoring but does not replace the qualified
  Git/concurrency developer or the owner's personal check.

## DONE criteria

`Disposition: DONE` requires every item below:

1. The pinned brief, starting parent, clean state, and protected hashes pass.
2. Task 016 remains immutable and the exact reuse ledger is complete.
3. Expected-red independently reproduces both retained review defects and the new
   cleanup/provider/entry-point gaps for their intended reasons.
4. Whole-batch admission makes `admitted > 2` structurally unreachable in the
   supported state machine and refuses late/racing admission before side effects.
5. Strict classification rejects incomplete, non-Standard, non-Applied, dependent,
   external-action, identical, ancestry-overlap, protected, case-alias, and
   path-escape work.
6. Malformed/changed refinement cannot remain admitted or create approval/provider/
   builder evidence.
7. Every initial build, recovery resume, and attempted retry revalidates all frozen
   artifacts/scopes immediately before control; no provider retry is possible.
8. Exactly one isolated temporary worktree exists per admitted task while building,
   and both fake builders demonstrably overlap.
9. Builders cannot write main, coordinator state, shared log, another task, or an
   undeclared/read-only path.
10. DONE and STOPPED task evidence and log rows remain truthful in every fake outcome
    combination.
11. Integration is one at a time by task number against latest main, and every
    declared check reruns before each main advance.
12. Every modeled failure/restart finishes without an extra provider call and
    reaches the cleanup invariant.
13. CLI mutation/recovery and Desktop read-only observation match the supported
    path; inactive legacy behavior is unchanged.
14. The fake-provider canary, strict output, fixed error, no-tool, no-network,
    one-call, and cost-ledger checks pass.
15. All four separate live approvals are present at the immediate boundary.
16. Exactly two approved provider requests occur in the one disposable proof,
    exactly one per task, through official installed authentication; both stay
    within US$0.25 and the total stays within US$0.50.
17. Both fixed disposable tasks produce valid independently useful changes, reports,
    checks, and `Applied / completed / DONE` rows.
18. Task 002 integrates after Task 001 against the latest main, and the final proof
    repo contains both visible improvements.
19. No credential, raw provider/account data, canary, arbitrary model instruction,
    or forbidden path enters any prohibited surface.
20. Both fake and live disposable roots end with one clean main worktree, no task or
    integration worktree, no `cairn/task-*` branch, no live lock/state/call ledger,
    and no provider child.
21. The real Cairn repository gains no coordinator/activation state, task branch,
    extra worktree, provider artifact, or product effect outside the exact allowed
    source/test/report changes.
22. All declared core, CLI, Desktop, legacy, direct, diff, scope, protected-state,
    reuse, and independent checks pass without weakened tests.
23. The Task 024 report states limitations, provider costs, retained disposable
    roots, reuse verification, cleanup evidence, human checks, and
    `Milestone movement: YES`.
24. One exact-name implementation/report commit succeeds and contains only allowed
    paths.
25. The candidate remains disabled and ready for mandatory fresh-context review; it
    is not activated or described as accepted.

DONE means the bounded Final candidate and its disposable two-call proof are
complete. It does not mean the mandatory review passed, the owner accepted it, the
qualified developer approved activation, or any repository is activated.

## STOPPED criteria

Stop and write `Disposition: STOPPED — [stable blocker]` when any required condition
fails, including:

- `STARTING_STATE_CHANGED` — parent, status, protected bytes, or Task 016 evidence
  changed;
- `BRIEF_NOT_PINNED` — this brief is absent, unpinned, or changed;
- `REGRESSION_NOT_REPRODUCED` — expected-red does not fail for the intended reason;
- `SCOPE_TOO_NARROW` — another tracked path is required;
- `ADMISSION_BOUNDARY_FAILED` — more than two or unsafe work can be admitted;
- `FROZEN_GATE_FAILED` — a changed artifact/scope reaches approval, provider, or
  builder control;
- `ISOLATION_FAILED` — a builder can reach main, another task, state, log, or an
  undeclared path;
- `SERIALIZATION_FAILED` — main can advance concurrently, stale, or without checks;
- `EVIDENCE_MISMATCH` — DONE/STOPPED files, log, commits, or observed effects
  disagree;
- `RECOVERY_FAILED` — a modeled crash cannot finish honestly without another call;
- `CLEANUP_INCOMPLETE` — a tested path leaves a task branch/worktree/lock/state or
  live process;
- `PROVIDER_BOUNDARY_UNPROVEN` — installed official authentication/SDK cannot meet
  the tool-free, one-request, redaction, telemetry/crash, or fixed-input boundary;
- `LIVE_APPROVAL_MISSING` — any of the four exact immediate approvals is absent;
- `PROVIDER_CALL_FAILED` or `CALL_OUTCOME_UNKNOWN` — either disposable call fails or
  its single request outcome is uncertain;
- `MODEL_RESULT_INVALID` — either result fails strict validation;
- `COST_BOUNDARY_FAILED` — per-task or total cap cannot be enforced or is exceeded;
- `CREDENTIAL_EXPOSURE_SUSPECTED` — any prohibited secret surface may have been
  reached;
- `REAL_PROJECT_MUTATED` — the real Cairn repository gains an unintended effect;
- `PROTECTED_WORK_CHANGED` — unrelated or protected work changes;
- `EXTERNAL_INTERFERENCE` or `RECOVERY_OWNERSHIP_UNPROVEN` — safe automatic recovery
  ownership is not credible;
- `ROLLBACK_UNCLEAR` — containment or recovery is no longer credible;
- `EXTERNAL_ACTION_REQUIRED` — install, update, login, billing, deployment,
  activation, valuable-repository execution, broader network, or other authority is
  needed; or
- `EXACT_NAME_COMMIT_BLOCKED` — the bounded implementation/report commit cannot be
  made safely.

STOPPED preserves honest evidence, consumes no extra provider call, performs only
owned cleanup that remains safe, leaves the candidate inactive, and never claims
milestone movement merely because source code exists.

## Planning stop

After this brief is saved and committed by exact path, stop. The only message that
authorizes the offline build phase is:

`Approve High-Stakes task 024 at docs/ai-work/tasks/024-brief.md. Build it.`

That message still does not authorize any credential, live provider call, cost,
activation, or valuable-repository execution.
