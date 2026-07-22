# Task 026 — complete the bounded concurrent path as a Final

Date: **2026-07-20**

Lane: **High-Stakes**

Mode: **Final candidate — disabled until review, acceptance, qualified-human
approval, and a later repository-specific activation**

Starting `main`: `810c1f577551cc40370b51a741a6bbfe259f2ded`

Source candidate being replaced and repaired:
`c63aba80fcda61549dd3b304a026819c5b06bbcb`

Task 025 fixture repair already present:
`810c1f577551cc40370b51a741a6bbfe259f2ded`

## Owner direction and fixed boundary

The owner declined another Direction Gate comparison, explicitly overrode that
process pause, and then requested this new High-Stakes plan. That override permits
continuing the selected architecture. It does not waive build approval, live-call
approval, credential protection, rollback, mandatory fresh-context review,
qualified-human review, owner acceptance, or later activation.

Task 024 remains immutable `STOPPED — SCOPE_TOO_NARROW` evidence. Task 025 remains
its separate completed fixture repair. Task 026 does not resume, rewrite, relabel,
or accept either task. It uses their exact committed source and evidence as an
untrusted starting point and produces one new bounded result.

This planning phase creates and pins only this brief. It authorizes no runtime or
test edit, temporary proof repository, provider process, credential use, network
request, cost, activation, valuable-repository concurrent run, cleanup, install,
update, push, publish, or deployment.

## Visible outcome and milestone movement

Cairn gains a disabled-by-default Windows Final candidate for one closed batch of
one or two independently useful Standard tasks. The candidate:

1. validates the complete raw JSON manifest and every frozen artifact before any
   task identity, branch, worktree, approval, broker, or builder effect;
2. records write-ahead ownership before creating each Git or filesystem resource;
3. runs each credential-facing provider call in a separate, empty-directory broker
   process with no project path, tool, arbitrary prompt, or retry;
4. lets only a credentialless worker apply a strictly validated result to one exact
   writable path in its isolated task worktree;
5. integrates completed tasks by task number, one at a time, against the latest
   checked `main`, rerunning every frozen argv check before each advance;
6. recovers deterministically at every recorded transition without another
   provider call and without overwriting truthful evidence;
7. exposes only a sanitized, read-only bounded-run view to Desktop; and
8. ends every tested success or owned failure with one clean main worktree, no task
   branch, no integration worktree, no live broker/worker/proxy, and no active
   coordinator state or lock.

Expected milestone movement: **YES** if the full offline matrix and the separately
approved two-call disposable proof both complete. That establishes the safe
real-model transport needed for Cairn's self-hosting milestone. It does not itself
activate concurrent work in the valuable Cairn repository or complete the later
repository-specific self-improvement run.

## Review findings and required resolution

Every retained Task 024 review concern is inside this task:

| Retained concern | Required Task 026 resolution | Decisive proof |
|---|---|---|
| Wrong emergency variable | Use only `CAIRN_BOUNDED_CONCURRENCY_DISABLE`; value `1` blocks new admission and provider spawn before any effect while recovery remains available. Remove the reversed legacy spelling from the bounded path. | Direct black-box admission and pre-spawn probes for both spellings. |
| Worktrees can exist before durable ownership | Persist a strict write-ahead intent containing exact branch, worktree, base commit, owner token, and before-state before each creation. | Kill after intent, after branch creation, and after worktree creation; recovery either finishes or removes only the proved-owned resource. |
| Recovery is not a transition journal | Replace phase-only recovery with a finite journal whose pending operation, before/after commit ids, revision, ownership, and completion rule are strict data. | External process-kill driver at every persistent transition and direct Git/state inspection after restart. |
| Recovery can overwrite or duplicate evidence | Evidence and reports use create-new or exact-hash idempotent semantics. An already integrated task is never rewritten or logged twice. Main movement not recorded in state is reconciled from exact commit ancestry and content. | Crashes immediately before/after evidence commits and main fast-forwards, followed by byte and row-count checks. |
| Approval artifacts are not frozen exactly | Parse strict schemas with duplicate-key rejection, reject unknown/hidden/accessor programmatic inputs by removing programmatic mutation entry points, hash the entire approval bytes, and recheck the hash under lock before every protected transition. | Extra-field, changed-byte, duplicate-key, missing, stale, and replaced-file probes show zero broker/builder effect. |
| Raw programmatic manifests can contain Proxy/accessor behavior | The mutating public path accepts only an exact repository-relative tracked JSON file. Internal code receives a newly parsed deep-frozen plain-data value; no raw object mutation API is exported. | Export-surface inspection plus hostile object tests against non-mutating validators and raw-file CLI tests. |
| “Broker” runs in the coordinator process | Move SDK import and query into a dedicated child entry point whose working directory is a new empty broker directory and whose stdin/stdout protocol has one strict request and one redacted result. | PID/cwd/environment/IPC probes prove separation; parent never imports the SDK query path. |
| Provider destination/request and telemetry boundary is unproved | Add a credentialless loopback CONNECT allowlist/counting guard when supported by the installed SDK, permit only `api.anthropic.com:443`, set the SDK's nonessential-traffic/error-reporting controls, invoke exactly one SDK `query()` per consumed task allocation, and record only non-secret counts. If direct bypass or an extra destination cannot be ruled out without inspecting a credential or changing OS security policy, stop before live use with `PROVIDER_BOUNDARY_UNPROVEN`. | Installed-byte/options audit, fake guard tests, child-process inventory, and separately approved live destination/query-count evidence. |
| Live provider path is not reachable from the supported CLI | The same `cairn concurrent run --manifest <path>` command handles offline or live-proof manifests. Live mode additionally requires one strict, newly created authorization file shown at the boundary; no hidden programmatic-only path. | Direct CLI fake run and, after approval, direct CLI live proof. |
| Desktop receives the full coordinator state | Replace the renderer-facing value with a strict sanitized view containing only run id, task number, scope labels, phase, call-consumed flag, check result, integration order, blocker, and cleanup status. | IPC/renderer test rejects project roots, Git paths, worktree paths, authorization text, provider output, and internal tokens. |
| Only two recovery faults were exercised | Define and inject every persistent transition named below; keep a separate external driver outside the modified unit-test helpers. | Coverage table maps every transition to expected pre/post state and observed cleanup. |
| Test checks can accept placeholders | Proof checks must require the exact task-specific semantic result and explicitly reject the starting placeholder. Test bytes are frozen and compared before task commit, candidate check, and main advance. | Placeholder-negative control plus frozen-test tamper probes. |
| Task 016 capacity and malformed-refinement defects | Preserve the already repaired legacy behavior and prove the new closed-batch path has no late registration/refinement operation at all. | Existing two direct reproductions plus export/CLI inspection. |
| No qualified review or activation evidence | Keep the candidate disabled. Require the fresh-context AI review, the qualified Git/concurrency developer verdict, owner acceptance, and a later repository-bound activation task. | Absence of an activation record continues to refuse this valuable repository. |

Passing Task 024's existing tests is necessary but not sufficient. Task 026's
review-specific red controls must fail against commit `c63aba8` for the intended
reasons before production edits and pass afterward without weakening.

## Supported input and admission boundary

The only mutating input is a tracked, repository-relative strict JSON manifest.
The CLI reads its raw bytes, rejects duplicate keys before `JSON.parse`, validates
an exact schema, canonicalizes to new plain data, deep-freezes it, hashes the raw
bytes, and then admits the whole batch under one coordinator lock.

The manifest contains exactly one or two tasks. Each task binds:

- schema version and permanent task number;
- exact brief path and full brief SHA-256;
- `lane: "Standard"`, `recordMode: "Applied"`, and an independently useful
  outcome/reason;
- exact implementation, test, and writable path lists;
- exact shell-free argv checks;
- `dependencies: []` and `externalActions: []`;
- provider, model, fixed input digest, one-call allocation, and cost allocation;
- coordinator-assigned brief, approval, report, and evidence paths; and
- frozen starting hashes for every tracked test and existing implementation path.

Unknown fields, duplicate keys, missing fields, noncanonical JSON types, invalid
enums, blank required arrays/strings, or a nontracked manifest/brief/test fail before
the journal exists. There is no late registration, replacement, or refinement API
for a bounded run.

Path rules remain the strict Task 024 rules: repository-relative normalized Git
paths only; no identical or ancestor overlap; no absolute, drive-relative, UNC,
ADS, traversal, glob, environment, or shell forms; no case aliases; no `.git`,
shared log, activation, coordinator state, another task record, symlink, junction,
reparse point, submodule, or escaping resolved parent.

## Activation and emergency-disable boundary

The candidate permits execution only when either:

- the repository is newly created beneath the operating-system temporary directory
  in exact Task 026 offline/live proof mode; or
- a later High-Stakes activation task creates a tracked strict activation record
  binding the accepted Task 026 implementation commit, fresh-context verdict,
  owner acceptance decision, qualified-developer verdict, exact target repository
  identity/path, runtime blob digest, and activation authorization.

Task 026 creates no activation record. Unit tests may validate the pure activation
schema using synthetic values but may not activate or run the real Cairn repository.
An environment variable alone can never activate a valuable repository.

`CAIRN_BOUNDED_CONCURRENCY_DISABLE=1` has unconditional precedence for new
admissions and broker calls. Recovery, read-only status, and ownership inspection
remain available so an active run is not stranded.

## Journal, locking, and recovery model

The run state is strict versioned data stored beneath the exact Git common directory.
Every write uses create-new temporary bytes, flush/close, atomic replacement, a
previous-valid backup, a monotonically increasing revision, and an exact state
digest. Unknown fields, invalid transitions, mismatched repository/run/owner ids,
or an unverifiable backup fail closed without cleanup.

The lock contains run id, owner token, PID, process-start identity, and timestamp.
Normal admission never steals a lock. Recovery may replace a stale lock only after
proving the recorded process is absent and the exact run owns every referenced
path; otherwise it stops with `EXTERNAL_INTERFERENCE`.

The write-ahead transition list is finite and must be tested before and after each
effect:

1. run intent and closed-batch admission;
2. worktree-root creation;
3. Task 001 branch/worktree creation;
4. Task 002 branch/worktree creation;
5. approval creation/freeze for each task;
6. call allocation consumption and broker spawn for each task;
7. broker result sealing and validation for each task;
8. credentialless result application and scope inspection for each task;
9. task report/evidence creation and exact task commit for each task;
10. integration lease and detached candidate creation for each task;
11. frozen commit application and declared checks for each task;
12. evidence/log finalization for each task;
13. immediately before and after each exact main fast-forward;
14. task worktree removal and task branch deletion;
15. integration worktree removal;
16. broker/worker/network-guard termination;
17. final state, backup, and lock removal.

A provider allocation becomes consumed before broker spawn. A crash from that point
until a complete sealed result is durably recorded yields `CALL_OUTCOME_UNKNOWN`
and never retries. A complete sealed result may be applied after restart only when
its digest, task input, runtime identity, approval, state revision, and all frozen
artifacts still match.

Recovery may finish a determined local transition or record an honest STOPPED
outcome. It may not force-remove a worktree containing unexpected changes, overwrite
an existing report/evidence file with different bytes, delete an unproved branch,
or move main when the expected before commit no longer matches.

## Provider broker and worker boundary

The credentialless coordinator validates the manifest and authorization, consumes
the call allocation, creates a new empty broker directory under the run's temporary
root, and starts one fixed child executable by exact argv. It never imports the SDK
query implementation and never reads a credential-facing environment value.

The broker child:

- receives no project, Git, task-worktree, activation, state, log, or arbitrary
  filesystem path;
- receives one fixed Task 001 or Task 002 request over strict one-shot stdin;
- runs from the empty broker directory with an allowlisted non-secret environment;
- imports the exact installed SDK version `0.2.141` and verifies the installed entry
  SHA-256 observed at planning,
  `48bde6aeabf7e71ad5528bf52c8feb1642c21f505ea2495c70f39db7df226d97`;
- uses model `claude-haiku-4-5`, one `query()` invocation, `maxTurns: 1`, no fallback,
  tools, MCP servers, agents, skills, plugins, hooks, settings, resume, checkpoint,
  debug transcript, or raw stderr;
- denies every tool callback and maps all failures to fixed Cairn codes;
- emits only one exact-schema result containing validated replacement, model,
  bounded cost, and non-secret query/destination counts; and
- terminates after success, failure, or uncertain outcome.

The credentialless worker receives only the task worktree, exact writable path,
and sealed validated replacement. It cannot choose a path, command, prompt, check,
or Git operation. The coordinator independently rechecks the resulting diff before
staging exact names.

No credential is requested, inspected, copied, printed, stored, logged, committed,
or passed through parent IPC. If official installed authentication cannot operate
through the allowlisted environment without broader secrets or network behavior,
the task stops before a live call.

## Fixed disposable proof tasks

Task 001 remains the synthetic reading-list welcome sentence:

- implementation: `content/welcome.txt`;
- test: `test/welcome.test.mjs`;
- fixed input SHA-256:
  `3f50f7d24b6e52247aa05eae652d6a0bed39ce8bd7ce6da42642b74ee117bfe8`;
- exactly one call and at most US$0.25.

Task 002 remains the synthetic add-book instruction:

- implementation: `content/add-book.txt`;
- test: `test/add-book.test.mjs`;
- fixed input SHA-256:
  `2196cff705d1b7e4dff0507afc0ba808871e377aadf14da1e9a7631f2fb6bdd8`;
- exactly one call and at most US$0.25.

The combined fixed cap is US$0.50 and allocations are not transferable. Each test
must fail on its starting placeholder and pass only a task-valid replacement.

## Supported CLI and Desktop path

The mutating entry point remains:

```text
cairn concurrent run --manifest <exact-repository-relative-manifest-path>
```

Offline mode uses only the fake broker. Live-proof mode additionally requires the
strict authorization-file path printed by the CLI after the offline gate and owner
approvals. There is no fallback to the legacy engine or programmatic-only live API.

Recovery remains:

```text
cairn concurrent recover --run <exact-run-id>
```

It never spawns a provider and touches only strictly proved run-owned state.

Desktop remains read-only. It receives the sanitized view only, exposes no bounded
mutation button, and points the owner to the exact recovery command.

## Exact files allowed to change during the approved build

### Core implementation

- `core/package.json`
- `core/src/bounded-provider.ts`
- `core/src/bounded-broker-protocol.ts` — new
- `core/src/bounded-broker-child.ts` — new
- `core/src/bounded-network-guard.ts` — new if the installed SDK supports the
  credential-safe loopback guard
- `core/src/concurrent-activation.ts` — new
- `core/src/concurrent-state.ts` — new
- `core/src/concurrent-worker-child.ts` — new
- `core/src/concurrent-run.ts`
- `core/src/index.ts`
- `core/src/steps.ts`

### Core tests

- `core/test/bounded-provider.test.ts`
- `core/test/bounded-broker.test.ts` — new
- `core/test/concurrent-activation.test.ts` — new
- `core/test/concurrent-fixture.ts` — new shared disposable fixture
- `core/test/concurrent-run.test.ts`
- `core/test/concurrent-run-review.test.ts` — new expected-red/review suite
- `core/test/concurrent-run-faults.test.ts` — new transition matrix
- `core/test/coordinator-final.test.ts`
- `core/test/coordinator-recovery.test.ts`
- `core/test/steps.test.ts`

### CLI implementation and tests

- `cli/package.json`
- `cli/src/index.ts`
- `cli/src/flows/concurrent.ts`
- `cli/src/flows/status.ts`
- `cli/src/flows/task.ts`
- `cli/test/concurrent.test.ts`

### Desktop observation and tests

- `app/src/renderer/components/TaskDeck.tsx`
- `app/src/renderer/screens/Dashboard.tsx`
- `app/tests/concurrency-final.spec.ts`

### Task report

- `docs/ai-work/tasks/026-report.md` — new during the approved build

This pinned brief must not change after approval. No dependency declaration,
version, lockfile, generated contract source, public guide, policy, historical task,
real-project log, or activation record may change. Existing ignored build output may
be regenerated but must not be staged.

If another tracked path is genuinely required, Task 026 stops with
`SCOPE_TOO_NARROW`; this brief is not widened or revised in place.

## Protected starting work

At planning time:

- root:
  `C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework`;
- branch: `main`;
- HEAD: `810c1f577551cc40370b51a741a6bbfe259f2ded`;
- local main is 30 commits ahead of `origin/main`;
- index, tracked worktree, and untracked worktree are empty;
- one main worktree exists;
- no `cairn/task-*` branch or `.git/cairn` state exists.

There is no modified or untracked starting work. Every path outside the allowed
list is protected. Additional planning SHA-256 checks are:

| Protected file | Planning SHA-256 |
|---|---|
| `AGENTS.md` | `9ED59AF0C49AD3C74314A411D0E7C58BDBDCF6AE138F450D7CF26CEA0B0E3272` |
| `MAINTAINERS.md` | `36B94238F78D4DBEFAFF171D2CE27B2C66F0DE22081A20A99D51B5588CEEC29A` |
| `CONTRACT-TEMPLATE.md` | `585170BD1CABC73548C4894F416A4931A100A9E83D7157B0F26FEF5BDB21E3B2` |
| `docs/ai-work/PROJECT.md` | `B814178D7470445DBB38F5548605936628946EC737EA37D2359501DE1FD01F71` |
| `docs/ai-work/LOG.md` | `0F5073E4D326495492B4603F93FA637BFB36A19F47326B3985CEF6A9F0950695` |
| `docs/ai-work/tasks/016-brief.md` | `888EC5B04D987CEA5FE9B1A2A9593836353990B2E060BD7F6704B2F8774C10B9` |
| `docs/ai-work/tasks/016-report.md` | `360D7BEA5831C92A7ADA8D0482051221D171F77473F06BD29C4989EADF1F5891` |
| `docs/ai-work/tasks/024-brief.md` | `93F10CBF0C3EAE75016372B4359C7C92095AFEBED6720014D26623C762B9350F` |
| `docs/ai-work/tasks/024-report.md` | `8EBF9325E60A53B59B33E9F4A205656597CC9F829D0666F4D0FBAAFFCCF83A76` |
| `docs/ai-work/tasks/025-brief.md` | `9E59FFA9ADD4517ACEDD534A5A88D5BD543CD279F4B4305E680E80ED2820326D` |
| `docs/ai-work/tasks/025-report.md` | `00E2A70C73BB461EA99D3DC288C54578625F1F87B612974267602B2489C23061` |
| `package-lock.json` | `D2C1769D42E67FC397D71B46BD1949453AE43470DF93469E0B03C96B6A55DC2B` |

The pinned-brief commit may advance main by one brief-only commit whose parent is
the exact starting HEAD. The builder must revalidate that parent, brief blob,
status, protected hashes, worktrees, branches, and state before editing.

## First visible checkpoint and safe rehearsal

Before production edits, add only the new independent review/fault/broker tests and
run them against the Task 024 source. Expected red must independently show:

- the required emergency variable does not block admission;
- a kill between resource creation and state persistence can strand ownership;
- recovery lacks strict schema/transition validation and can duplicate or overwrite
  evidence around main advancement;
- approval byte changes/extra fields are not fully frozen;
- live SDK code executes in the coordinator process;
- the CLI cannot run the live proof;
- Desktop receives internal state; and
- the transition matrix has untested gaps.

An unexpected pass or unrelated compile/setup failure stops with
`REGRESSION_NOT_REPRODUCED`. Existing green controls are recorded separately.

The first green checkpoint is a complete fake-provider run in a newly created
`%TEMP%\cairn-task-026-*` repository. It must visibly show two overlapping broker
and worker pairs, serial `001 → 002` integration, exact reports/log rows, and the
cleanup invariant. No credential, SDK query, or network is used.

The full offline rehearsal then runs every outcome combination, every transition
kill point, duplicate/hidden/tampered inputs, path attacks, stale locks, external
main movement, check failure, broker crash, worker crash, uncertain call, sealed
result recovery, and cleanup interruption. A separate temporary driver invokes the
compiled CLI/public APIs and inspects raw Git/process/state results rather than
trusting modified test helpers.

## Decisive checks

The approved builder must run and report:

1. pinned brief parent/blob, full status, protected hashes, Task 024/025 immutability,
   worktrees, branches, Git markers, state, and installed SDK identity;
2. expected-red causes before production edits;
3. `npm.cmd run build --workspace core`;
4. unchanged expected-red assertions after implementation;
5. all Task 026 broker, activation, admission, isolation, evidence, integration,
   and fault suites;
6. `npm.cmd test --workspace core` unchanged;
7. `npm.cmd test --workspace cli` unchanged;
8. `npm.cmd --prefix app run typecheck`;
9. Desktop production build and targeted headed bounded suite;
10. existing serial, Task 016, Task 018, Task 020, away, smoke, and recovery
    regressions relevant to changed paths;
11. direct CLI fake run outside the test runner;
12. external process-kill matrix at every journal transition;
13. direct reproduction of both original Task 016 findings and every Task 024
    review concern;
14. source/export inspection proving the coordinator cannot import or call the SDK,
    no raw object mutation API exists, and Desktop receives only sanitized data;
15. fake canary and secret-pattern scans restricted to Task 026-created roots and
    Cairn-owned captured evidence;
16. zero outbound destination during all offline checks;
17. installed SDK/broker/network-guard audit sufficient to prove the live boundary,
    or STOPPED before credential use;
18. the separately approved two-call disposable live proof, if and only if all four
    exact approvals below are present;
19. provider/broker/worker/guard termination and retained proof-root inspection;
20. complete actual source and test diff inspection against the allowed file list;
21. `git diff --check`;
22. final protected real-repository status/hash/worktree/branch/state comparison;
23. exact-name staging plus staged diff/blob inspection; and
24. one local Task 026 implementation/report commit containing only allowed paths.

No expected assertion may be weakened, skipped, converted to a source-string-only
claim, or changed after red merely to pass. A harness correction is allowed only
when the original safety property remains intact, and the failed output, correction,
and affected reruns are preserved in the report.

## Live boundary and separate approvals

Build approval authorizes only local source/test/report edits, installed offline
tools, fake-provider rehearsals, newly created disposable temporary Git/process
evidence, owned cleanup, and the exact local implementation/report commit. It does
not authorize a credential, network, provider call, cost, login, billing change,
activation, valuable-repository run, install, update, push, publish, or deployment.

After every offline check passes, the builder must stop and show the exact source
digest, broker/worker/guard hashes, installed SDK identity, fixed inputs, model,
endpoint, disposable roots, query counters, allocations, rollback, and protected
real-project fingerprint.

Only then may the owner provide all four exact messages:

1. `For High-Stakes task 026's disposable proof only, I confirm my Claude credential is owner-managed through Anthropic's official installed authentication or operating-system store, and I approve the verified isolated broker processes to use it only for the two named tool-free tasks. Do not reveal, inspect, copy, or log its value.`
2. `For High-Stakes task 026 disposable Task 001 only, approve exactly one tool-free provider call to api.anthropic.com using claude-haiku-4-5 and input SHA-256 3f50f7d24b6e52247aa05eae652d6a0bed39ce8bd7ce6da42642b74ee117bfe8, with no retry, fallback, tool, or other destination.`
3. `For High-Stakes task 026 disposable Task 002 only, approve exactly one tool-free provider call to api.anthropic.com using claude-haiku-4-5 and input SHA-256 2196cff705d1b7e4dff0507afc0ba808871e377aadf14da1e9a7631f2fb6bdd8, with no retry, fallback, tool, or other destination.`
4. `For High-Stakes task 026's disposable proof, approve one fixed total provider-cost cap of US$0.50: at most US$0.25 allocated to Task 001 and at most US$0.25 allocated to Task 002. Allocations are not transferable; no retry, second call for either task, fallback model, higher cost, or billing change is approved.`

They must be present in this chat after the offline display and immediately before
execution. Credential approval alone authorizes no network request; call approval
without the cost approval authorizes no spending. A retry is never authorized.

## What could be damaged and rollback

A defect could strand or delete a worktree/branch, overwrite task evidence, move
main from stale bytes, merge a failed task, repeat a provider call, exceed cost,
expose credentials or project paths, contact an extra destination, weaken tests,
activate valuable-repository behavior, or misrepresent STOPPED work as DONE.

Before a live call, rollback is absence of an activation record plus
`CAIRN_BOUNDED_CONCURRENCY_DISABLE=1`. Stop the fake run, execute only its
ownership-verified recovery, retain the top-level disposable repository, and report
STOPPED.

After a call starts, consume the allocation permanently, issue no retry, terminate
both brokers/guards, apply only a complete sealed result, otherwise record an honest
STOPPED outcome, recover owned local effects, retain the proof repository, and
report the non-secret provider cost. Suspected credential exposure stops all AI and
tool processing; the owner uses Anthropic's official interface to inspect activity
and rotate/revoke without exposing the value to Cairn.

If the real Cairn repository changes unexpectedly, do not reset, clean, stash,
revert, delete, or move anything. Stop with `REAL_PROJECT_MUTATED` and preserve the
state for a separately authorized recovery.

Source rollback after this task is a separate High-Stakes action using the exact
Task 026 implementation commit only after all active disposable runs are recovered.
No Task 026 operation may target home, the real repository root, a generic temp
directory, wildcard, unresolved variable, or unproved resource for deletion.

## Qualified human, review, acceptance, and activation

No qualified human is required solely for the disposable provider proof if every
Contract v2.2 owner-managed-credential exception condition is met. Otherwise the
proof stops before live use.

A qualified Git/concurrency developer is required before later activation. They
must inspect the exact implementation commit, changed tests, journal transitions,
Windows atomicity, stale-lock handling, branch/worktree ownership, serialized
fast-forwards, broker separation, external fault evidence, and cleanup roots. Their
recorded verdict must name role, scope, verdict, and retained concerns without
personal data or credential material.

After the build, the mandatory next step is a brand-new chat:

`Review High-Stakes task 026.`

Only after that review and the qualified verdict may the owner record:

`My decision for High-Stakes task 026: accept`

Acceptance still creates no activation. Activation requires a new High-Stakes plan
naming the exact accepted commit and exact repository. No Task 026 message or test
creates that record.

## Assumptions and uncertainty

- Windows, Git, Node, npm, Electron, the current installed dependencies, and SDK
  `0.2.141` remain available; no install or update is authorized.
- The owner does not edit main or start another Git operation during a proof run.
- The installed SDK may not provide a provable credential-safe destination guard.
  If so, `PROVIDER_BOUNDARY_UNPROVEN` is the correct final stop; the implementation
  does not silently weaken the boundary.
- Process-kill tests cover the finite modeled transitions, not power loss, hardware
  corruption, every antivirus/filesystem defect, or every future Git/SDK version.
- A passing AI review is not qualified independent assurance.
- This is the final bounded attempt under the present architecture. A STOPPED result
  is preserved honestly; Task 026 will not be widened or rewritten in place.

## DONE criteria

`Disposition: DONE` requires all of the following:

1. The pinned brief, exact parent, starting cleanliness, and protected hashes hold.
2. Task 024/025 history remains immutable and the Task 026 reuse/repair ledger is
   complete.
3. Every retained review defect reproduces red against the old candidate for the
   intended reason and the same property passes after implementation.
4. The required emergency disable blocks admission and provider spawn while
   recovery remains available.
5. Closed-batch validation and strict frozen approval/artifact gates occur before
   every relevant effect.
6. Write-ahead ownership and recovery pass every before/after transition kill point
   without duplicate evidence, unsafe cleanup, stale main movement, or another call.
7. Broker and worker processes are isolated as specified; the coordinator never
   imports the SDK query path or receives a credential-facing environment.
8. Fake-provider one-call, cost, destination, tool, strict-output, and canary checks
   pass with two observed overlapping tasks.
9. All DONE/STOPPED combinations remain truthful and integrate serially against
   latest main with frozen tests rerun before each advance.
10. CLI offline/live/recovery and sanitized Desktop observation match the supported
    path; serial behavior remains unchanged.
11. The full core, CLI, Desktop, legacy, independent external, diff, scope, and
    protected-state checks pass.
12. All four live approvals are present at the immediate boundary.
13. Exactly two approved live provider calls occur, one per task, with no retry,
    fallback, tool, or other observed destination, within both per-task caps and the
    US$0.50 total.
14. Both live tasks produce valid visible changes, reports, evidence, checks, and
    Applied/completed rows; Task 002 integrates after Task 001's latest main.
15. Fake and live proof roots finish with one clean main worktree and no active
    branch/worktree/state/lock/process artifact.
16. The real Cairn repository changes only in the pinned brief commit and exact
    allowed implementation/test/report commit.
17. The report records real costs, retained roots, limitations, reuse, cleanup,
    external fault evidence, human requirements, `Milestone movement: YES`, and
    `Disposition: DONE`.
18. The candidate remains disabled, unaccepted, and unactivated for mandatory
    fresh-context review.

## STOPPED criteria

Stop and report `Disposition: STOPPED — [stable blocker]` if any required property
fails, including `STARTING_STATE_CHANGED`, `BRIEF_NOT_PINNED`,
`REGRESSION_NOT_REPRODUCED`, `SCOPE_TOO_NARROW`, `ADMISSION_BOUNDARY_FAILED`,
`FROZEN_GATE_FAILED`, `ISOLATION_FAILED`, `SERIALIZATION_FAILED`,
`EVIDENCE_MISMATCH`, `RECOVERY_FAILED`, `CLEANUP_INCOMPLETE`,
`PROVIDER_BOUNDARY_UNPROVEN`, `LIVE_APPROVAL_MISSING`, `PROVIDER_CALL_FAILED`,
`CALL_OUTCOME_UNKNOWN`, `MODEL_RESULT_INVALID`, `COST_BOUNDARY_FAILED`,
`CREDENTIAL_EXPOSURE_SUSPECTED`, `REAL_PROJECT_MUTATED`,
`PROTECTED_WORK_CHANGED`, `EXTERNAL_INTERFERENCE`,
`RECOVERY_OWNERSHIP_UNPROVEN`, `ROLLBACK_UNCLEAR`, `EXTERNAL_ACTION_REQUIRED`, or
`EXACT_NAME_COMMIT_BLOCKED`.

STOPPED means no extra call, no activation, no hidden scope expansion, and no claim
that useful partial code is a completed Final. This task will not automatically
create another revision.

## Planning stop

After this brief is saved and committed alone, stop. The only message authorizing
the offline build is:

`Approve High-Stakes task 026 at docs/ai-work/tasks/026-brief.md. Build it.`

That message still authorizes no credential, network request, provider call, cost,
activation, valuable-repository concurrent run, installation, push, publish, or
deployment.
