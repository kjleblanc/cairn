# Task 027 — one-request official Anthropic Messages broker Final

Date: **2026-07-20**

Lane: **High-Stakes**

Mode: **Final candidate — disabled until build, fresh-context review, owner
acceptance, qualified-human review, and a later repository-specific activation**

Starting `main`: `4d766f0b0ae5fe07cb8a818e24ae3a78d8931c29`

Immutable stopped predecessor:
`docs/ai-work/tasks/026-report.md` at
`638D04BA90C6F3EABA1183DF3A6D3241CA7885B1AD73DC593A8071D211BF18B9`

## Owner direction and fixed boundary

The owner asked for a new High-Stakes plan that completes Task 026's goal by
replacing its unproved Claude Agent SDK transport with an isolated official
Anthropic SDK Messages broker and a mandatory one-request custom-`fetch`
boundary.

Task 026 remains immutable historical evidence with
`Disposition: STOPPED — PROVIDER_BOUNDARY_UNPROVEN`. This task does not edit,
resume, relabel, accept, or erase Task 026. It begins at Task 026's committed
result, treats that result as an untrusted candidate, and carries forward every
retained review or report concern that still affects the bounded outcome.

This planning phase creates and pins only this brief. It authorizes no source or
test edit, dependency installation or download, temporary proof repository,
provider process, authentication use, credential refresh, network request, cost,
cleanup, activation, valuable-repository concurrent run, push, publish, or
deployment.

## Visible outcome and milestone movement

Cairn gains a disabled-by-default Windows Final candidate for one closed batch of
one or two independently useful Standard tasks. Each admitted task receives one
fixed, disposable, tool-free Anthropic Messages request through its own broker
process. The broker's only network-capable function is a custom `fetch` that may
delegate exactly one `POST` to exactly
`https://api.anthropic.com/v1/messages`; it rejects a retry, redirect, credential
refresh, telemetry call, alternate host, alternate path, query, fragment, or any
other URL before the platform `fetch` can run.

The complete candidate must also:

1. validate strict canonical manifest and live-authorization bytes before any
   task identity, approval, broker, branch, or worktree effect;
2. durably journal and reconcile every effect-bearing transition, including the
   Task 026 transitions that were named but not actually recorded;
3. consume a task's one-call allocation before broker spawn and never retry an
   unknown call outcome;
4. let only the credentialless worker apply a sealed semantic result to the one
   declared writable path in that task's isolated worktree;
5. integrate completed tasks by task number, serially against the latest checked
   `main`, rerunning every frozen argv check before each advance;
6. recover deterministically or fail closed at every journaled transition;
7. expose only the existing sanitized, read-only bounded-run view to Desktop; and
8. end every supported success, owned failure, and crash-recovery case with one
   clean main worktree, no task branches, no integration worktree, no broker or
   worker process, and no active coordinator state or lock.

Expected milestone movement: **YES** only if the full offline proof and the later,
separately approved two-call disposable proof both complete. That would establish
the real-model transport needed for Cairn's self-hosting milestone. It would not
activate bounded concurrency in the valuable Cairn repository or complete a real
Cairn self-improvement task.

## Why this is High-Stakes

The candidate controls local authentication use, two paid provider requests,
external network effects, isolated Git worktrees and branches, recovery after
process failure, and eventual movement of a protected branch. A defect could leak
a credential, spend beyond the cap, repeat a provider call, lose truthful
evidence, or move a repository incorrectly. The work therefore remains
High-Stakes even though its supported live proof uses only a newly created
disposable repository and synthetic content.

This is a **Final candidate**, not an Experimental Draft, because the intended
proof includes separately approved real network requests and cost. It remains
disabled and unaccepted after the build until the required reviews and decisions
occur.

## Task 026 evidence and retained concerns

Task 026 proved useful local components but stopped honestly because its Claude
Agent SDK child could make provider traffic outside Cairn's loopback proxy. Its
focused checks also left material gaps. Task 027 must preserve the stopped report
and resolve, not conceal, the following:

| Task 026 evidence or gap | Required Task 027 resolution | Decisive proof |
|---|---|---|
| Agent SDK/CLI transport can bypass the loopback guard | The bounded live path imports the official `@anthropic-ai/sdk` directly and supplies a custom `fetch`; it never imports Agent SDK `query()` or spawns its native CLI. | Installed-byte/source audit, import/export inspection, fake-fetch broker tests, and exact live request count. |
| Proxy environment was not an enforcement boundary | Delete the loopback CONNECT guard from the bounded path. The custom `fetch` itself rejects every non-Messages URL and a second invocation before delegating. | Direct tests for host, scheme, port, user info, path, query, fragment, method, redirect, refresh URL, telemetry URL, and second call. |
| `approval-freeze` and `task-commit` were listed but not journaled | Record both transitions around their exact effects and require them in the strict journal. | Journal inspection and process-kill cases before and after each effect. |
| Recovery reconciled only `main-fast-forward` and cleared other pending transitions | Give every transition a strict before/intended-after observation and deterministic reconcile-or-stop rule. Never clear a pending transition merely because recovery started. | Independent external process-kill driver at every pre/post transition point. |
| Only two external crash points were exercised | Exercise all 30 transition instances both before and after their effect in fresh OS processes: 60 cases. | Standalone driver output plus exact Git, state, evidence, process, and cleanup assertions. |
| CLI parsed live authorization with ordinary `JSON.parse` | Reject duplicate keys, unknown fields, noncanonical bytes, wrong ordering/whitespace, stale values, and byte replacement. Hash the complete canonical bytes under the lock and recheck before each provider transition. | Raw CLI fixtures including duplicate and shadowed approval keys show zero broker effect. |
| Focused tests passed but the full core suite was not established | Run the complete core suite plus focused provider, broker, state, recovery, CLI, app, and external-driver checks. | Real command results recorded without treating a tool timeout as an assertion failure. |
| Headed Desktop proof exceeded the prior tool timeout | Run the headed scenario with a sufficient bounded timeout and inspect both assertion result and cleanup. | Passing headed result or an honest STOPPED report with preserved output. |
| Final activation still lacks independent expert evidence | Keep the candidate disabled and require a qualified Git/concurrency developer before any activation. | No activation record is created by Task 027. |

The first expected-red checkpoint runs review controls against the committed Task
026 candidate. It must demonstrate, for the intended reasons, the missing direct
SDK declaration, Agent SDK/native broker path, lack of mandatory custom-fetch
boundary, unjournaled approval/task-commit transitions, incomplete recovery, two
rather than 60 external crash cases, and duplicate-key acceptance in the CLI.
Those failures are preserved in the report before production edits.

## Supported manifest and frozen approval boundary

The only mutating entry point remains:

```text
cairn concurrent run --manifest <exact-repository-relative-manifest-path>
```

The manifest remains one tracked, repository-relative strict JSON file containing
exactly one or two independently useful Standard tasks. Task 027 preserves Task
026's closed-batch, path-containment, no-dependency, no-external-action, frozen
artifact, shell-free check, one-call, and serial-integration rules. It creates no
late registration, refinement, replacement, or programmatic mutation API.

Raw manifest and live-authorization parsing must reject duplicate object keys
before `JSON.parse`. After exact-schema validation, each accepted file must be
byte-for-byte identical to Cairn's one canonical UTF-8 serialization with fixed
property order and whitespace. Therefore duplicate keys, unknown fields, reordered
fields, alternate whitespace, alternate newline form, or a shadow value cannot
share authority with the approved bytes.

The live authorization is a newly created strict file inside the disposable proof
repository. Its exact schema binds:

- schema and task number `027`;
- this brief's pinned Git commit and SHA-256;
- the built runtime digest and the two frozen input digests;
- the exact provider, SDK version, model, endpoint, method, no-retry setting, and
  one-call allocation for each task;
- the exact current pricing and model-context facts attested by the owner at the
  live boundary;
- the per-task and total cost ceilings;
- a creation timestamp and fixed short expiry;
- the four separately granted approval statements.

The coordinator computes a separate SHA-256 over the complete canonical
authorization bytes and pins that digest in the journal; the file does not contain
or exclude a self-referential digest field.

The coordinator opens and hashes the authorization under its exclusive lock and
rechecks the same path, canonical bytes, hash, expiry, runtime digest, and brief
commit immediately before each `call-consume` and broker spawn. A changed,
replaced, missing, stale, or noncanonical authorization stops before the provider
allocation is consumed.

## Official SDK and mandatory custom-fetch boundary

Task 027 uses the already installed official package `@anthropic-ai/sdk` version
`0.93.0`. The build may add the exact version as a direct `core/package.json`
dependency and make the matching minimal `package-lock.json` declaration because
the package and lock entry already exist locally as a transitive dependency. The
build may run only package-lock/offline validation; it may not install, download,
update, or resolve a different version.

The runtime pins and verifies these planning-observed installed bytes before any
credential or request use:

- `@anthropic-ai/sdk/index.mjs` —
  `B8E991BB4F9F16463649C88EA0CA3121DC9BE79D9FDA97EFFE67FD4A3A37B891`;
- `@anthropic-ai/sdk/client.mjs` —
  `C5876AB8D1C531619BA03F44DE1719219CB8A7618BEFF1E7B43B6EE9204AD6C7`;
- `@anthropic-ai/sdk/package.json` —
  `5970D7AE800E23D677C7A10C94711C072DB929664B12FDE67A20BC3163C65928`;
- `@anthropic-ai/sdk/core/credentials.mjs` —
  `076961BDBAD452A028C205CFC7CF37F8793AE89B6D1D961CF9D260B1E62F7B2D`;
- `@anthropic-ai/sdk/lib/credentials/credential-chain.mjs` —
  `478EBB41963A7A9DA3FF786849C46F4362EA5E853338AB3BFCFE64F841A643D6`;
- `@anthropic-ai/sdk/lib/credentials/user-oauth.mjs` —
  `C7D63C76E7E46259F6A0457E6FC0398366E2182864E4BA283D3A2200301336B2`;
- `@anthropic-ai/sdk/lib/credentials/token-cache.mjs` —
  `0FC4CAEF05B3E656188C2991DDE2DE560ABABDD868D91C75E8C2364D5176191C`.

The isolated broker constructs the SDK client with an explicit base URL and:

```text
baseURL: https://api.anthropic.com
fetch: Cairn's one-request bounded fetch
maxRetries: 0
timeout: a fixed bounded value
logger: a no-op logger
logLevel: error
```

The custom fetch owns the enforcement boundary. It atomically claims its only
invocation before examining the allowed URL and before delegating. It delegates
only when all of these are exact:

- invocation count is one;
- URL is `https://api.anthropic.com/v1/messages` with no user name, password,
  explicit alternate port, query, or fragment;
- method is `POST`;
- redirect mode is `error`;
- the broker's fixed timeout signal is present; and
- the request comes from the single non-streaming `messages.create` operation.

Every other invocation or destination fails locally with a fixed Cairn code. A
credential refresh, OIDC exchange, telemetry/error report, upload, retry, or
redirect therefore cannot reach the network. Once the invocation is claimed, any
throw, timeout, cancellation, parse failure, or ambiguous transport result consumes
the allocation and yields `CALL_OUTCOME_UNKNOWN`; Cairn never retries.

The guard never reads, copies, logs, serializes, hashes, or returns headers or body.
It records only invocation count, accepted destination, delegated/not-delegated,
and a fixed status category. The SDK's raw response headers, request id, raw error,
account data, and authentication material never enter broker IPC or Cairn evidence.

## Broker request, authentication, and output

Each task runs in a separate child process whose current directory is a newly
created empty broker directory. The child receives no project, Git, worktree,
activation, state, log, report, evidence, or arbitrary filesystem path; no tool,
plugin, skill, hook, MCP server, command, subprocess, native Claude CLI, arbitrary
prompt, or model-chosen path is available.

The broker environment does not inherit `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`,
`ANTHROPIC_BASE_URL`, custom-header, debug/log, proxy, or profile-override variables.
It may retain only the ordinary operating-system user-profile locations required
for the official SDK to resolve an owner-managed installed Anthropic credential.
The AI never reads those locations or the credential. The SDK receives the same
bounded custom fetch for credential providers as for Messages. A fresh cached
credential may be used; an expired or near-expiry credential whose provider asks
to refresh is rejected locally before network and stops with a fixed code. The AI
does not perform login, credential creation, refresh, rotation, recovery, or
billing changes, and no credential file may be written.

For Task 001 or Task 002, the broker performs exactly one non-streaming
`messages.create` with:

- model `claude-haiku-4-5`;
- `service_tier: "standard_only"`;
- `max_tokens: 64`;
- the fixed Task 026 system and task-specific user message;
- no tools, server tools, metadata, prompt caching, streaming, or fallback.

It accepts only one text content block, `stop_reason: "end_turn"`, no server-tool
use, zero cache tokens, and the expected standard service tier. The text must be
strict JSON with exactly `{ "replacement": <task-valid string> }` and pass the
task-specific semantic validator. The broker discards all other response content.

The one-shot IPC result contains only the validated replacement, exact model,
input/output usage, computed bounded cost, one-request count, fixed destination,
broker PID, and empty broker cwd. It contains no prompt, raw response, id, headers,
raw error, authentication status detail, or account data.

## Fixed disposable proof tasks and cost bound

Task 001 remains the synthetic reading-list welcome sentence:

- implementation: `content/welcome.txt`;
- test: `test/welcome.test.mjs`;
- fixed input SHA-256:
  `3f50f7d24b6e52247aa05eae652d6a0bed39ce8bd7ce6da42642b74ee117bfe8`;
- exactly one request and at most **US$0.25**.

Task 002 remains the synthetic add-book instruction:

- implementation: `content/add-book.txt`;
- test: `test/add-book.test.mjs`;
- fixed input SHA-256:
  `2196cff705d1b7e4dff0507afc0ba808871e377aadf14da1e9a7631f2fb6bdd8`;
- exactly one request and at most **US$0.25**.

Allocations are not transferable. A retry is a second request and is not
authorized. The calls may overlap in time only after both tasks have independently
passed admission and both allocations are durably consumed.

Because provider billing can count more than visible prompt text, the live proof
does not estimate its maximum from request bytes. Immediately before execution,
the owner's fourth approval must attest from the provider's official current facts
that all of these are true:

- standard input price is at most **US$1.00 per million tokens**;
- standard output price is at most **US$10.00 per million tokens**; and
- the selected model's maximum input context is at most **200,000 tokens**.

With `max_tokens: 64`, the conservative maximum is
`200,000 × $1/M + 64 × $10/M = $0.20064` per task and `$0.40128` total,
below the per-task `$0.25` and combined **US$0.50** caps. The authorization also
records the current rates used to calculate actual usage cost. If the owner cannot
make the attestation, a rate exceeds a ceiling, usage fields are absent, cache or
server-tool usage appears, or computed usage cost exceeds an allocation, no further
call or integration is allowed.

## Journal, ownership, and recovery

New Task 027 admissions use a strict state schema version 3. Task 026 schema-2
state may have a narrow recovery-only reader if required to clean a previously
owned disposable run, but schema 2 can never authorize admission or a provider
call.

State lives beneath the exact Git common directory. Every state mutation uses
create-new temporary bytes, flush/close, atomic same-volume replacement, a
previous-valid backup, a monotonically increasing revision, and an exact digest.
The parser validates the complete nested state, journal pending item, every
completed item, strictly increasing sequence, task identity, exact field sets, and
allowed transition ordering. Unknown fields, truncated state, duplicate sequence,
nonmonotonic completion, mismatched repository/run/owner id, impossible phase, or
unverifiable backup fails closed.

The lock records run id, random owner token, coordinator PID, process-start
identity, and timestamp. Child ownership records broker/worker PID, start identity,
task, executable, and empty cwd before launch. Normal admission never steals a
lock. Recovery may act only after proving a recorded process is absent or matches
the exact owned process; it never kills a merely reused PID. Unexpected processes,
paths, worktree changes, branch movement, evidence bytes, or state stop with
`EXTERNAL_INTERFERENCE`.

There are 30 transition instances: four run-level transitions and thirteen for
each task. The standalone external driver kills a fresh coordinator process both
immediately before and immediately after each effect, producing 60 independent
cases.

Run-level transitions:

1. `admission`;
2. `worktree-root`;
3. `process-cleanup`;
4. `run-cleanup`.

Per-task transitions for Task 001 and Task 002:

1. `task-worktree`;
2. `approval-freeze`;
3. `call-consume`;
4. `broker-result`;
5. `result-apply`;
6. `task-commit`;
7. `integration-lease`;
8. `integration-candidate`;
9. `candidate-checks`;
10. `evidence-finalize`;
11. `main-fast-forward`;
12. `task-cleanup`;
13. `integration-cleanup`.

Every transition writes a strict pending record with target, before observation,
intended after observation, task, sequence, revision, and owner before its effect.
On restart, recovery observes the real Git/filesystem/process state and either
completes the already-proved effect, safely performs the still-unstarted local
effect, or records a stable STOPPED result. It does not clear a pending record as a
generic recovery shortcut.

`call-consume` is special: recovery may never spawn or repeat a provider request.
If a complete sealed result was not durably recorded, the task becomes
`CALL_OUTCOME_UNKNOWN`. A complete result may be used only when its digest, task
input, SDK/runtime identity, approval hash, request count, state revision, and all
frozen artifacts still match.

Evidence, reports, approvals, and commits use create-new or exact-hash idempotent
semantics. An already integrated task is never rewritten or logged twice. Cleanup
removes only exact proved-owned disposable paths/refs/processes. It never
force-removes an unexpected worktree, kills an unproved PID, deletes an unproved
branch, overwrites different evidence, or moves `main` when its expected commit no
longer matches.

The test-only crash selector is renamed for this task and is honored only in a
newly created temporary offline-proof repository with rehearsal mode already
proved. It grants no activation or provider authority and is rejected in live mode
or the valuable Cairn repository.

## What may change during the approved build

Only these paths may change:

Dependency declaration and bounded runtime:

- `package-lock.json`
- `core/package.json`
- `core/src/bounded-provider.ts`
- `core/src/bounded-broker-child.ts`
- `core/src/bounded-broker-protocol.ts`
- `core/src/bounded-network-guard.ts` — delete after removing all bounded-path use
- `core/src/bounded-messages-fetch.ts` — new
- `core/src/concurrent-run.ts`
- `core/src/concurrent-state.ts`
- `core/src/index.ts`

Core proof files:

- `core/test/bounded-provider.test.ts`
- `core/test/bounded-broker.test.ts`
- `core/test/bounded-messages-fetch.test.ts` — new
- `core/test/concurrent-run-review.test.ts`
- `core/test/concurrent-run-faults.test.ts`
- `core/test/concurrent-run-transition-driver.ts` — new independent driver
- `core/test/concurrent-run.test.ts`

Supported surfaces and final task record:

- `cli/src/flows/concurrent.ts`
- `cli/test/concurrent.test.ts`
- `app/tests/concurrency-final.spec.ts`
- `docs/ai-work/tasks/027-report.md` — new

An unexpected need to edit any other implementation, test, build, dependency, app,
contract, public interface, or task-record path is scope expansion and stops the
task for a new owner decision. Generated `dist` output may be created by declared
build commands only when it is already ignored and is not staged or committed.

## What must stay untouched

- all Task 024, Task 025, and Task 026 briefs, reports, commits, and evidence;
- `AGENTS.md`, `MAINTAINERS.md`, `CONTRACT-TEMPLATE.md`, and
  `docs/ai-work/PROJECT.md`;
- `docs/ai-work/LOG.md` until the owner's later Task 027 decision;
- public guides, contract mirrors, app contract resources, and activation files;
- credential files, environment configuration, login state, billing, account data,
  and provider settings;
- the real Cairn repository as a bounded-run target;
- `main` during concurrent proof runs; only the disposable proof repository's main
  branch may advance;
- unrelated modified or untracked work, should any appear.

No activation record is created. The candidate cannot be activated by an
environment variable or by the Task 027 build commit alone.

## Protected starting work

The repository was clean at planning on `main`, ahead of `origin/main` by 32 local
commits, with one worktree and no active Cairn coordinator state. Those local
commits are valuable starting work and must not be rewritten, reset, stashed,
cleaned, broadly staged, or pushed.

Protected hashes at planning:

- `AGENTS.md` —
  `9ED59AF0C49AD3C74314A411D0E7C58BDBDCF6AE138F450D7CF26CEA0B0E3272`
- `MAINTAINERS.md` —
  `36B94238F78D4DBEFAFF171D2CE27B2C66F0DE22081A20A99D51B5588CEEC29A`
- `CONTRACT-TEMPLATE.md` —
  `585170BD1CABC73548C4894F416A4931A100A9E83D7157B0F26FEF5BDB21E3B2`
- `docs/ai-work/PROJECT.md` —
  `B814178D7470445DBB38F5548605936628946EC737EA37D2359501DE1FD01F71`
- `docs/ai-work/LOG.md` —
  `0F5073E4D326495492B4603F93FA637BFB36A19F47326B3985CEF6A9F0950695`
- `docs/ai-work/tasks/024-brief.md` —
  `93F10CBF0C3EAE75016372B4359C7C92095AFEBED6720014D26623C762B9350F`
- `docs/ai-work/tasks/024-report.md` —
  `8EBF9325E60A53B59B33E9F4A205656597CC9F829D0666F4D0FBAAFFCCF83A76`
- `docs/ai-work/tasks/025-brief.md` —
  `9E59FFA9ADD4517ACEDD534A5A88D5BD543CD279F4B4305E680E80ED2820326D`
- `docs/ai-work/tasks/025-report.md` —
  `00E2A70C73BB461EA99D3DC288C54578625F1F87B612974267602B2489C23061`
- `docs/ai-work/tasks/026-brief.md` —
  `C0ABF2CC3D6368D3B91B02F31617987C6D5AEE3E7730922E2ED4CE20D797FC58`
- `docs/ai-work/tasks/026-report.md` —
  `638D04BA90C6F3EABA1183DF3A6D3241CA7885B1AD73DC593A8071D211BF18B9`
- `core/package.json` —
  `A63190FED6DCF10265A4683B965F809018C321B1F918BF03B7703F24A60F55E6`
- `package-lock.json` —
  `D2C1769D42E67FC397D71B46BD1949453AE43470DF93469E0B03C96B6A55DC2B`

The approved build must recheck these hashes, starting `main`, worktree count, and
absence of active state before its first source edit and after all verification.

## First visible checkpoint and safe rehearsal

The first visible checkpoint is an entirely offline, credentialless fake-fetch run
in a newly created repository beneath the operating-system temporary directory.
It proves two task-valid semantic replacements, overlapping broker lifetimes,
serial integration order `001 → 002`, exact request count one per broker, frozen
checks, complete evidence, and owned cleanup. Its custom fetch receives synthetic
Requests only and its delegate is a local in-memory fake; it does not open a socket.

Before that green rehearsal, the expected-red controls against Task 026 are run and
preserved. Before any later live effect, the same built commit must pass the entire
offline matrix, dependency/source audit, fake credential canaries, strict approval
tests, 60-case external crash driver, CLI path, and Desktop headed proof.

No live proof may use the Cairn repository, an existing repository, valuable data,
or an input created outside this task. The live repository, content, tests,
manifest, approvals, state, worktrees, and results are all newly created disposable
artifacts under one exact temporary root that is printed before use and proved not
to contain a reparse point or valuable starting data.

## Declared checks

The approved build runs and records the real result of each applicable check:

1. verify the protected hashes, `main` commit, complete Git status, one-worktree
   topology, and absence of active Cairn coordinator state;
2. run review controls against the committed Task 026 candidate and preserve the
   expected-red reasons;
3. run focused custom-fetch tests for every allowed and rejected URL/method/count,
   synchronous claim-before-delegate behavior, redirect denial, timeout, and no
   request inspection or raw error leakage;
4. run focused official-SDK broker tests with fake fetch and fake credential
   providers, including retryable status, transport error, 401, redirect, refresh,
   telemetry, second request, malformed output, cache/tool usage, timeout, and
   process termination;
5. run strict manifest, canonical authorization, byte-swap, duplicate-key, stale
   approval, runtime hash, call-consumption, semantic result, path, ownership,
   sanitized view, integration order, and cleanup tests;
6. run the standalone 60-case external process-kill transition driver in fresh
   temporary repositories and verify no repeated call, duplicated evidence, dirty
   worktree, orphan ref/process, state, lock, or ordering violation;
7. run the full core test suite, not only the modified tests;
8. run CLI build and full CLI tests, then invoke the built CLI directly for a
   two-task fake run, recovery, malformed authorization, and duplicate-key denial;
9. run app typecheck/build and the headed bounded-concurrency scenario with a
   timeout long enough to distinguish a test failure from harness startup time;
10. run fake credential canaries across stdout, stderr, IPC, evidence, reports,
    state, Git objects, temp roots, process argv/environment inventories, and built
    assets; require zero matches and zero sockets;
11. validate the direct `@anthropic-ai/sdk` `0.93.0` declaration against the existing
    lock and installed bytes using offline/package-lock-only commands; no install or
    registry access;
12. audit the built import graph and installed SDK bytes to prove the bounded live
    path contains no Agent SDK `query()`, native Claude CLI, global fetch outside
    the custom delegate, retry, streaming, upload, telemetry, or alternate request
    destination;
13. inspect every changed test/checking tool before relying on its result, inspect
    the actual diff, and repeat protected hashes, full Git status, worktree/process
    inventory, rollback check, and active-state absence.

If an offline check exposes a correctable in-scope implementation or test-harness
defect, make the smallest correction without weakening the acceptance criterion and
rerun every affected check. Any dependency download, changed SDK version, request
outside the exact endpoint, second invocation, credential refresh/write, secret
surface, inability to prove cleanup, scope expansion, protected-work change, or
ambiguous rollback is a stable stop.

## Live boundary and separately required approvals

Only after every offline check passes does the build pause and show the owner the
exact disposable root, endpoint, model, two fixed prompt digests, request counts,
pricing/context facts, per-task caps, total cap, current commit/digest, anticipated
effect, and rollback. Four approvals are required separately and are then bound
verbatim into the canonical authorization:

1. approval to use the owner's already installed, fresh official local Anthropic
   authentication for these two brokers only, without inspecting or refreshing it;
2. approval for Task 001's one exact `POST` to
   `https://api.anthropic.com/v1/messages`;
3. approval for Task 002's one exact `POST` to the same endpoint; and
4. approval of the fixed combined **US$0.50** cap together with the exact current
   standard input/output prices and maximum-context attestation described above.

The ordinary build approval for this brief is not any of those approvals. If one
approval is absent, authentication is not fresh, official local authentication
cannot operate without refresh or secret exposure, the pricing/context attestation
cannot be made, or the authorization expires, the live proof does not run.

The two approved requests are the only authorized external effects. A retry, login,
refresh, third request, install, registry access, credential change, billing
change, push, message, deployment, or public action remains unauthorized.

## What could be damaged and whether recovery is credible

- **Credential confidentiality:** a bad broker could expose authentication.
  Containment is process isolation, an allowlisted environment, official SDK
  credential resolution, no request/body/header inspection, fixed IPC, fixed error
  mapping, canary scans, and a custom fetch that rejects refresh or alternate
  traffic locally. If any secret-like material reaches model-visible output,
  files, logs, IPC, argv, evidence, or Git, stop immediately; the AI does not inspect
  or attempt to repair the credential.
- **Unexpected provider cost:** a retry or oversized request could spend more.
  Containment is one invocation claimed before delegate, SDK `maxRetries: 0`, one
  non-streaming request, `max_tokens: 64`, standard-only tier, conservative context
  pricing, per-task allocation, and a $0.50 total cap. Money already spent cannot be
  rolled back, but the maximum authorized amount is fixed before execution.
- **Disposable Git state:** crash recovery could move the wrong ref or delete an
  unowned path. Containment is a newly created temporary proof repository, durable
  before-state/ownership records, exact compare-and-move, reparse-point denial, and
  fail-closed cleanup. Git commits and exact temp paths make recovery credible.
- **Truthful task evidence:** recovery could duplicate or overwrite reports. Files
  use create-new/exact-hash semantics and every external crash case checks byte and
  row counts. Conflicting bytes stop instead of being overwritten.
- **Valuable Cairn work:** accidental activation could touch this repository.
  Admission remains disabled without a later repository-bound activation record;
  Task 027 creates none. Protected hashes and topology are checked before and after.

## Exact rollback plan

1. Before any live call, rollback is deletion of the exact task-owned disposable
   proof root plus local revert of Task 027's implementation/report commit. The
   direct SDK declaration points to bytes already installed and does not require an
   uninstall.
2. During an active disposable run, recovery first verifies state/owner tokens,
   PIDs, refs, worktrees, and paths. It terminates only exact owned child processes,
   records any consumed call as used, restores or truthfully stops the local
   transition, removes exact clean owned worktrees/branches/state/lock, and confirms
   one clean disposable main worktree.
3. If request outcome is ambiguous, do not retry. Record
   `CALL_OUTCOME_UNKNOWN`, clean only proved-owned local artifacts, and retain the
   bounded possible cost as truthful evidence.
4. After proof, delete only the printed exact disposable root once its report and
   required non-secret evidence are committed to Task 027. Deletion must be preceded
   by absolute-path, temporary-parent, ownership-token, no-reparse-point, and
   not-project-root checks.
5. The implementation is one exact-name local commit after this pinned brief. If
   rejected, a later approved task can revert that commit by id. Never reset,
   rewrite Task 026, or broadly clean the working tree.

Rollback cannot undo an already completed provider request or its bounded cost.
That irreversible effect is why the exact live approvals remain separate.

## Qualified human, review, acceptance, and activation

No qualified human is required solely for the two disposable provider calls if all
owner-managed local AI credential exception conditions in `AGENTS.md` hold. A
qualified Git/concurrency developer **is required before any activation**. That
person must review the exact built commit, custom-fetch and installed-SDK source
pins, strict authorization bytes, journal/state parser, every transition recovery
rule, Windows atomic replacement and PID-start identity, Git compare-and-move,
process cleanup, external crash-driver independence, and absence of a valuable-repo
escape.

After the build, a brand-new chat must perform:

```text
Review High-Stakes task 027.
```

That reviewer reads this pinned brief, actual diff, changed tests/checking tools,
and independent evidence before reading the builder's report. The build is not
accepted or activated by passing its own tests.

The owner then records one Task 027 decision. Acceptance makes this a reviewed
candidate only. A later separate High-Stakes activation task must bind the accepted
implementation commit, fresh-context verdict, qualified-human verdict, owner
decision, exact valuable repository, runtime digest, emergency-disable behavior,
and activation rollback. Until that record exists, the candidate refuses the real
Cairn repository.

## Assumptions and uncertainty

- Planning inspected the installed official SDK bytes without using a credential or
  network. The observed SDK routes API and credential-provider requests through the
  supplied custom `fetch`, supports `maxRetries: 0`, and exposes the Messages model,
  usage, service tier, timeout, logger, and base-URL controls required here. The
  build must re-prove those facts from the pinned bytes and tests.
- The official installed authentication may be absent, stale, or unable to operate
  without refresh. That is an acceptable STOPPED outcome; it is not authority to
  inspect a credential or begin login/refresh.
- Current provider pricing and maximum model context are intentionally not assumed
  by the plan. The owner must approve exact official current facts within the fixed
  ceilings immediately before live use.
- Windows process identity and directory replacement behavior require both direct
  tests and qualified-human judgment before activation. Passing temporary-repo
  tests proves only the supported proof path.
- Task 026's existing candidate may contain additional in-scope implementation
  defects exposed by the declared checks. Small corrections within the exact files
  above are permitted; a changed outcome, public interface, dependency version, or
  new path is not.

## DONE and STOPPED

**DONE** means all of the following are true:

- every retained Task 026 concern named here is resolved inside the exact boundary;
- expected-red evidence was preserved and every declared offline check passed;
- the standalone 60-case external crash driver passed without retries, duplicate
  evidence, orphan resources/processes, dirty state, or serial-order violation;
- the official SDK and mandatory one-request custom-fetch boundary were proved from
  pinned bytes and fake controls;
- after the four separate owner approvals, Task 001 and Task 002 each completed
  exactly one approved Messages request in its isolated broker, within its allocation
  and the total cap, with only strict semantic output crossing IPC;
- both task-valid results integrated serially in the disposable repository and all
  frozen checks passed;
- cleanup and rollback were verified, protected work remained unchanged, Task 026
  remained immutable, no activation record was created, and the real Cairn
  repository was never a bounded-run target;
- `docs/ai-work/tasks/027-report.md` states real command results, cost, remaining
  human judgment, `Milestone movement: YES`, and `Disposition: DONE`; and
- one safe exact-name local implementation/report commit was created without
  changing `docs/ai-work/LOG.md`.

**STOPPED** means any required offline proof, separate live approval, fresh
authentication condition, exact one-request boundary, semantic result, cost bound,
recovery invariant, cleanup invariant, protected hash, supported scope, or live
request fails or remains unproved. The report must name the stable blocker and
preserve the decisive non-secret evidence. A provider allocation consumed with no
sealed result remains consumed and is never retried. STOPPED is not relabeled as
DONE merely because some checks passed.
