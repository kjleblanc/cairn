# Task 021 — run one contained real-Claude serial task on a disposable Cairn copy

Lane: **High-Stakes**

Mode: **Final — one-shot live evaluation plan, not product activation**

This is not an Experimental Draft because its final phase intentionally uses an
owner-managed Claude credential, provider network access, and model cost. After
every gate below passes, it is activation-ready only for the single disposable run
defined here. It does not activate a real-provider path in Cairn, make the current
CLI or Desktop safe for live use, or authorize moving the result into the real
repository.

Reason: a real Claude call crosses credential, network, cost, external-service, and
security-boundary risks. The model-produced change is reversible because it is
confined to a new disposable copy, but a credential disclosure, provider request,
or charge cannot be undone. Those live effects require a pinned plan, a qualified
security review, a synthetic-canary rehearsal, and three separate owner approvals.

## Visible outcome and milestone movement

One newly created disposable copy of Cairn commit
`24447599937f4d4bcaa83e9aa21812bcd1af2e32` completes one serial Contract v2.0
Standard task using a real Claude model:

1. Cairn writes a copy-local Task 021 brief for one small README improvement.
2. A tool-free Claude turn proposes one beginner-friendly example sentence for the
   `Work on:` section of the disposable `README.md`.
3. A credentialless Cairn worker validates and applies only that sentence.
4. Finite checks prove the disposable README is the only product/content file
   changed by the model.
5. Cairn writes a copy-local Task 021 report, appends an
   `Applied / completed / DONE` row to the copy-local work log, and returns `DONE`.

The sentence must appear immediately after the existing `Work on:` code block, be
35 words or fewer, include one concrete `Work on:` example framed as a visible user
result, avoid implementation instructions and unexplained jargon, and leave every
other README byte unchanged. Its exact wording is chosen by the model and judged by
the declared structural checks plus the owner's plain-language check.

This is the smallest visible result that advances the current milestone: a real
model contributes a useful novice-facing improvement and the serial Cairn
lifecycle closes it end to end. The result remains evidence in a disposable copy;
the milestone is not complete for valuable repositories or normal Cairn entry
points.

Expected milestone movement: **YES** only if the real model call occurs, the
copy-local task reaches `DONE`, every containment check passes, and the real
repository's product and public files remain unchanged. An offline rehearsal alone
is useful safety evidence but records milestone movement as **NO**.

## Accepted foundation and supported path

The source foundation is the accepted Task 020 implementation at
`24447599937f4d4bcaa83e9aa21812bcd1af2e32`. Its strict provider-response validator
accepts only a non-Proxy ordinary object with exactly one enumerable data property
named `status` and one allowed non-secret status value. It rejects hidden, symbol,
accessor, Proxy, extra, missing, or unknown shapes before provider-state or task
writes.

Task 021 uses that boundary without weakening it. A disposable-only real-connection
adapter may return only `{ status: "unknown" | "disconnected" | "connected" }`.
The Task 020 validator must accept that strict object before the one-shot model
operation can begin. Provider headers, tokens, account data, raw errors, raw SDK
messages, response metadata, and model text must never pass through the connection
status object.

The single supported path is:

1. Resolve the operating-system temporary directory and fail if the exact new Task
   021 destination already exists.
2. Materialize a non-Git disposable copy from `git archive` of exact commit
   `24447599937f4d4bcaa83e9aa21812bcd1af2e32`; do not copy the working tree.
3. Copy only the already-installed local Node dependency tree needed to build and
   run the isolated harness. Do not install, update, link, junction, or fetch it.
4. Build and test inside the copy. Keep `CAIRN_PARALLEL_DRAFT` absent and refuse if
   it is `1`.
5. Run the complete offline fake-broker and synthetic-canary rehearsal below.
6. Obtain the qualified-human verdict and all three live-action approvals below.
7. Start one credential-facing broker process with its fixed allow-listed
   interface, validate its strict connection status through Task 020, and issue one
   tool-free Claude SDK query for the pinned README outcome.
8. Give the credentialless worker only an opaque one-use result handle. The worker
   reads the schema-validated sentence from the new Task 021 exchange area, applies
   it to the disposable README, runs the checks, writes the copy-local report and
   log row, and stops.
9. Close the broker, invalidate the handle, leave the disposable copy quarantined
   for review, and do not copy or merge anything into the real repository.

No retry, fallback model, second model turn, second task, second disposable copy,
or alternate credential/provider route is supported. A rejected or malformed model
result is an honest stopped task even if the provider call already incurred cost.

## Exact model task and live query limits

The pinned copy-local model task is only:

> Add one beginner-friendly example sentence immediately after README.md's normal
> `Work on:` command block. Keep it to 35 words or fewer, include a concrete
> `Work on:` example that describes a visible user result, avoid implementation
> instructions and unexplained jargon, and change nothing else.

The broker may receive only the pinned task identifier, the expected SHA-256 of the
unchanged disposable README, the relevant README text, and the fixed output schema.
It must reject unknown or extra request fields, caller-selected paths, arbitrary
prompts, alternate models, tools, plugins, MCP servers, settings sources, session
resumption, or fallback behavior.

The already-installed `@anthropic-ai/claude-agent-sdk` version observed during
planning is `0.2.141`. The only approved live query configuration is:

- model: `claude-haiku-4-5`;
- one query and `maxTurns: 1`;
- `maxBudgetUsd: 0.25`;
- no fallback model and no Cairn retry;
- `tools: []`, `allowedTools: []`, no MCP servers, no agents, no skills, no plugins,
  no hooks, and a deny-all `canUseTool` callback as defense in depth;
- `settingSources: []`, a custom minimal system prompt, an empty broker working
  directory, `persistSession: false`, debug output off, and no transcript mirror;
- a minimal explicitly constructed child environment rather than `process.env`;
- a JSON-schema result with exactly one ordinary string data field named
  `sentence`, a maximum length consistent with 35 words, and no extra fields; and
- no browser, login prompt, elicitation, update, telemetry, file checkpointing,
  prompt suggestion, or background-agent behavior.

`tools: []` is not treated as the credential-isolation proof by itself. The real
proof must be the separate process allow-list and operating-system boundary attested
by the qualified human below. If the installed SDK cannot run with every named
restriction, if the named model is unavailable, or if the SDK cannot enforce the
declared budget option, the task stops before the live query or after the single
failed query; it does not change versions, models, or limits.

SDK transport may internally retry a transient request. The network approval below
covers one SDK query with only that installed SDK's built-in transport behavior; it
does not authorize a second Cairn query. The reviewer must determine whether that
behavior fits the US$0.25 limit. If a credible hard upper bound cannot be
established, disposition is `STOPPED — COST_BOUNDARY_UNPROVEN` before network use.

## Credential isolation boundary

The credential value is never entered into Cairn, the disposable copy, chat, a
prompt, a command argument, a task record, an environment inherited by the
credentialless worker, or any model-visible surface.

The owner creates and manages the credential only through Anthropic's official
local login or an operating-system credential store. Cairn and the model do not
perform login, open a browser, ask for the credential, locate credential files,
copy a credential, or print connection details. If an interactive login or token
refresh prompt appears, the task stops before responding.

The supported isolation design has two processes and one fixed exchange:

1. **Credential-facing broker.** A small trusted process may ask the already-
   installed SDK to use the owner's official local credential. It runs from a new
   empty broker directory, has no project path in its current directory, exposes
   only `checkConnection` and `runPinnedTask`, accepts only the exact schemas above,
   and offers the model no tools. The connection operation returns only the strict
   Task 020 status object. The task operation returns only an opaque, random,
   single-use result handle or a fixed redacted error code.
2. **Credentialless Cairn worker.** This process owns the disposable copy and finite
   edit/check lifecycle. It receives no credential, credential path, provider
   header, account identifier, raw provider response, parent environment, or SDK
   object. It can redeem the one-use handle only for a broker-produced result file
   containing the validated sentence and non-secret bounded evidence. It cannot
   choose another path, prompt, model, tool, or query.
3. **Exchange.** A new Task 021-only temporary directory contains only request
   digests, one-use handles, fixed status/error codes, the validated sentence, and
   non-secret model/cost evidence. It contains no raw provider envelope, headers,
   debug output, transcript, credential, account data, or reusable authorization.
   Unknown files or fields fail closed.

The process boundary is an allow-list, not a shell-command deny-list: no interface
exists through which model output can request filesystem reads, commands, tools,
network access, a new prompt, or another provider call. Model output is inert data
until the credentialless worker validates the exact schema and exact one-sentence
README transformation.

Before any credential use, the qualified human must verify all of these against the
actual processes and operating system:

- the worker and every process it can spawn cannot read the official credential
  store, broker memory, broker-private directory, or broker environment;
- the SDK child receives only the minimal declared environment and no synthetic or
  real secret through command arguments, logs, renderer/IPC/browser storage, crash
  output, analytics, or telemetry;
- user, project, and local Claude settings, memory, hooks, plugins, MCP servers, and
  session persistence are disabled for the query without disabling authentication;
- the broker cannot read or write the real repository or the disposable project
  except for the fixed request/result exchange;
- model output cannot create a tool call or cause any operation other than the
  exact validated README insertion;
- outbound access is fail-closed and limited to HTTPS port 443 at
  `api.anthropic.com` for the one approved SDK query; redirects, update checks,
  telemetry endpoints, and every other destination are blocked; and
- process crash dumps and error surfaces cannot capture or disclose the credential.

If the operating system or installed SDK cannot establish these facts with a real
process or OS boundary, the task is `STOPPED — CREDENTIAL_ISOLATION_UNPROVEN`.
Prompt instructions, path filters, `tools: []`, and a command deny-list alone are
insufficient.

## Synthetic-canary rehearsal before any live effect

The first build phase is entirely local and fake. Provider network access is
blocked, no real credential is located or used, and the real SDK query is not
started.

The qualified human places the fixed fake value
`CAIRN_TASK_021_SYNTHETIC_CREDENTIAL_CANARY_NOT_A_SECRET` only in the fake broker's
broker-private credential slot. It is never copied from a real environment or
credential store. The rehearsal must prove:

1. The credentialless worker and every child it is permitted to spawn cannot read
   the canary location or inherit the canary through its environment.
2. The fake broker can consume the canary internally but returns only an ordinary
   exact `{ status: "connected" }` object and an opaque one-use handle.
3. Task 020 rejects non-enumerable, symbol, accessor, Proxy, missing, unknown, and
   extra status fields before any copy-local provider-state or task write.
4. Canary-tainted fake provider errors, raw responses, extra fields, stdout,
   stderr, and thrown values become fixed Cairn-owned errors with no original text,
   stack, keys, or values.
5. A hostile model-shaped result containing an extra field, path, command, tool
   request, second prompt, canary, code fence, multi-paragraph text, or more than 35
   words is rejected before README, report, or log writes.
6. A clean fake one-sentence result changes only the disposable README at the exact
   insertion point, then completes brief, checks, report, `Applied / completed /
   DONE` log row, and returned `DONE` serially.
7. Recursive scans of the disposable project, exchange directory, captured return
   values, stdout, stderr, errors, and report/log evidence find no canary.
8. Source and process inspection confirms the live configuration is fixed to one
   model, one turn, no fallback, no Cairn retry, no tools/settings/plugins/MCP,
   session persistence off, debug off, minimal environment, exact schemas, and the
   declared budget.
9. Network monitoring confirms the rehearsal opens no outbound connection.
10. The real repository's tracked, modified, untracked, and staged state remains
    exactly within the protected boundary below.

The canary rehearsal supports only this exact one-sentence, tool-free, one-query
path. It does not prove that the current CLI/Desktop `SdkEngine`, arbitrary agent
tools, valuable repositories, multiple turns, other models, other providers, or
normal Cairn runs safely isolate credentials.

## Files and state that may change during the approved build

In the real repository:

- `docs/ai-work/tasks/021-report.md` — the final build evidence only.

The pinned `docs/ai-work/tasks/021-brief.md` must remain byte-identical. The root
work log is protected and is updated only later by the owner's separate
post-review decision command.

Inside the one newly created operating-system temporary Task 021 directory:

- an exact non-Git archive of Cairn commit `24447599937f4d4bcaa83e9aa21812bcd1af2e32`;
- a physical offline copy of already-installed dependencies needed by core and the
  harness;
- disposable-only broker, worker, schema, and test files;
- the copy-local Task 021 brief, report, work-log row, provider state, exchange,
  before/after evidence, and modified `README.md`; and
- ordinary build output created by the already-installed toolchain.

Every path must be resolved and recorded before creation. Creation must fail rather
than reuse, overwrite, clean, or delete an existing path. No filesystem link,
junction, mount, reparse point, alternate data stream, Git worktree, Git branch, or
second project copy may be used.

## Real repository files and behavior that must stay untouched

- All product, runtime, test, package, lock, build/release, public documentation,
  project-contract, project-fact, and public-app files, including `README.md`,
  `core/`, `cli/`, `app/`, `AGENTS.md`, `CONTRACT-TEMPLATE.md`, and `cairn.html`.
- Task 018's serial lifecycle, Task 020's provider validator, the existing legacy
  SDK engine, and every CLI/Desktop entry point.
- Coordinator and parallel source, tests, flags, state, branches, and worktrees.
- Provider account, credential contents, login state, billing configuration,
  payment settings, subscriptions, model catalog, and external services except for
  the one separately approved query and its bounded cost.
- Existing modified and untracked owner work named below.

Nothing may be pushed, published, released, deployed, merged, cherry-picked, copied
back, activated, broadly staged, installed, updated, deleted, or moved. No provider
documentation or other website may be fetched by the AI during this task. A needed
dependency, model change, login, browser flow, billing change, second query, broader
network destination, or valuable-repository action stops the task.

## Protected starting work

Planning began at exact HEAD
`24447599937f4d4bcaa83e9aa21812bcd1af2e32` on `main`, 24 commits ahead of
`origin/main`, with an empty index.

The following pre-existing modified file is protected and must remain unstaged and
byte-identical:

- `docs/ai-work/LOG.md` — SHA-256
  `0E51EAC1EEAEB13899D1DF8655BD8037AF6EF6E2957DE77ADCA1C0B2E75BBB9D`.

It contains the owner's accepted Task 020 decision row. Task 021 must not append,
edit, stage, or commit it during planning or building.

The following pre-existing untracked files must remain untracked and byte-identical:

- `docs/ai-work/tasks/007-approval.json` —
  `1204556CD1F51DF44D0EA2069643FE71CAA9BCFC08413E30CC35C6BDA07F2691`;
- `docs/ai-work/tasks/008-approval.json` —
  `2CB40F65212506ED3037AB1B174A769C7307D1C8D071DA6A7B42B9EDE145344E`;
- `docs/ai-work/tasks/009-approval.json` —
  `78933AC2EB2A00B6F6C40F92C6EDD2D5EBAF37D98F96C77FCF64F017A366D822`;
- `docs/ai-work/tasks/011-report.md` —
  `C70BABB41335C4F2D8C39FB44430A915C14F389A86D254524BFDE3E24FADF5F8`;
- `docs/ai-work/tasks/014-report.md` —
  `A67C8E09DFABDAF9B600B692FD31551B456DA50DFC4D452FB1F4D891CF6C3795`.

If any protected byte or tracked/untracked/staged state changes unexpectedly, stop
without trying to repair, restore, clean, stash, or reset it.

## First visible checkpoint

Before any credential or provider use, the owner can inspect a newly created
disposable copy whose offline fake path has completed the exact README task end to
end. The copy shows:

- one fake-generated qualifying sentence in its README;
- a copy-local Task 021 brief and report;
- an `Applied / completed / DONE` copy-local log row;
- strict Task 020 status validation and canary-free evidence;
- no Git repository, approval/review/coordinator artifact, branch, worktree, or
  parallel flag; and
- no change to any real-repository product or public file.

This checkpoint demonstrates the lifecycle and containment shape only. It does not
count as the real-model result and authorizes no credential, provider, or cost.

## Checks

The builder must run and report the real results of:

1. Re-orientation; exact plan-pin and brief-blob verification; full root Git status;
   empty-index check; accepted Task 020 commit verification; and all protected hash
   and tracked/untracked state checks before any write.
2. Exact temp destination resolution and nonexistence check, followed by archive
   creation from Task 020's commit rather than the working tree.
3. A baseline manifest proving the disposable tracked source matches that commit
   before disposable-only harness files are added.
4. Core build in the disposable copy with only physically copied already-installed
   dependencies; no package operation that can install, update, or contact a
   registry.
5. The existing targeted `serial v2 provider connection Draft` tests in the copy,
   including Task 020's hidden-field, non-invocation, redaction, no-write, and clean
   fake-provider assertions.
6. Focused disposable-only tests for the broker/worker schemas, one-use handles,
   exact model configuration, fixed errors, fail-closed behavior, single sentence
   transformation, serial artifacts, and absent parallel/coordinator/Git state.
7. The complete ten-part synthetic-canary rehearsal above, including recursive
   canary scans and observed zero outbound network connections.
8. Source inspection for credential discovery, inherited environment, raw logs,
   renderer/IPC/browser storage, settings/memory/hooks/plugins/MCP, session files,
   debug/crash/telemetry surfaces, arbitrary prompts/paths, retries, fallback,
   multiple turns, tools, and broader network operations.
9. The qualified-human boundary review and signed/attributed plain-language verdict
   described below, without exposing a real credential or personal data.
10. A deliberate stop showing the exact resolved paths, broker executable and hash,
    process boundary, SDK version, model, endpoint, budget, single query, expected
    effect, irreversible effects, and rollback before collecting live approvals.
11. Verification that the three separate live approvals below are present verbatim
    and that no login, browser, billing, or activation action was inferred from
    them.
12. Immediately before the live query: Task 020 strict `connected` status;
    credentialless-worker environment check; no parallel flag; unchanged disposable
    README hash; empty result exchange; root protected-state check; outbound
    allow-list check; and exact SDK option assertion.
13. If every live gate passes, one SDK query. Record only the non-secret model id,
    start/end time, final disposition, provider-reported cost, fixed redacted error
    code if any, opaque handle, validated sentence, and resulting focused diff. Do
    not record raw SDK/provider messages, headers, account data, stacks, or debug
    output.
14. Refusal without Cairn retry if the result is absent, malformed, over 35 words,
    contains extra fields/canary/tool/path/command content, or would change anything
    outside the exact README insertion.
15. On a valid result, exact byte comparison proving one insertion in disposable
    `README.md`; Markdown structure check; novice-language human check; copy-local
    brief/report/log/DONE agreement; and absence of approval, review, coordinator,
    branch, worktree, or parallel runtime artifacts.
16. Recursive post-run canary and secret-pattern scans of only the new disposable
    project/exchange and captured Cairn-owned evidence. Never scan a real credential
    store, home directory, provider file, or unrelated user data.
17. Broker termination, one-use handle invalidation, outbound access closure, copy
    quarantine, and proof that nothing was copied into the real repository.
18. Root diff inspection, full Git status, exact protected-hash/state recheck, and
    confirmation that the only Task 021 build file in the real working tree is the
    report.
19. `git diff --check` on `docs/ai-work/tasks/021-report.md` and inspection of its
    actual content for accidental raw provider or personal data.
20. If safe, one exact-name local build-evidence commit containing only
    `docs/ai-work/tasks/021-report.md`. The plan remains in its separate pin commit;
    the protected log and untracked files remain outside the index.
21. A mandatory skeptical fresh-context review in a brand-new chat after the build.

Passing tests prove only the pinned one-sentence, tool-free, one-query disposable
path. They do not prove general hostile-model containment, provider correctness,
credential-store security, cost accounting, valuable-project safety, or the current
CLI/Desktop live path.

## What could be damaged and whether recovery is credible

The main harms are:

- disclosure of the owner's Claude credential through process inheritance, tools,
  settings, logs, crashes, telemetry, raw errors, or evidence;
- a provider request or charge outside the exact approved model, endpoint, query,
  and budget;
- model output causing an arbitrary file, command, tool, prompt, retry, or second
  call;
- the real repository or protected uncommitted work changing;
- provider raw data or personal/account data entering the disposable copy, task
  records, or Git;
- parallel/coordinator behavior becoming active; or
- a disposable result being mistaken for a safe live Cairn feature.

Recovery is credible for file effects because the model can affect only a new
non-Git disposable copy, the real product tree is hash/status checked, and nothing
is merged or activated. The copy can be quarantined and abandoned without changing
the real repository.

Recovery is not complete for a credential disclosure, provider transmission, or
cost. A disclosed credential must be revoked/rotated by the owner through the
official provider path; a provider request cannot be recalled; an incurred charge
cannot be rolled back. Those are the reasons rehearsal, qualified review, exact
live approvals, one-query behavior, and fail-closed stopping are mandatory.

## Exact rollback and containment plan

Before credential use, rollback is immediate and fully local:

1. Do not start the live broker.
2. Leave all real-path Draft flags unset and parallel disabled.
3. Close the fake broker, invalidate fake handles, and mark the new temp directory
   `QUARANTINED-NOT-LIVE` without deleting or overwriting it.
4. Preserve the failed evidence in the Task 021 report and leave the real product
   tree unchanged.

After credential access but before a successful provider response:

1. Terminate the broker and SDK child; close outbound access; issue no retry.
2. Invalidate every Task 021 handle and make the exchange read-only for inspection.
3. Preserve only redacted, non-secret evidence. If any secret exposure is suspected,
   stop all AI/tool work and have the owner revoke or rotate the credential through
   the provider's official interface; the owner never pastes it into chat.
4. Have the qualified human inspect provider-account activity and any crash/log
   surface before another task is considered.

After a provider response or charge:

1. Apply output only if it passes every exact schema and transformation check;
   otherwise leave the disposable README unchanged and record `STOPPED`.
2. Stop the broker, close outbound access, invalidate the one-use handle, and
   quarantine the copy. Do not merge, copy back, push, publish, or activate it.
3. Record the provider-reported cost and acknowledge that it cannot be undone.
4. If unexpected provider activity, data disclosure, or cost appears, the owner
   revokes/rotates the credential and inspects account/billing activity with the
   qualified human. No automated cleanup or second provider call is attempted.

The disposable directory is not deleted during this task because deletion would
erase review evidence. Later deletion requires the owner to approve the exact
resolved temp path as a separate destructive cleanup action. Rejection of the Task
021 result requires no product rollback because no product source is changed; the
brief, report, and review remain as honest history.

## Exact approvals and handoffs

### 1. Offline build and rehearsal approval

The only message that authorizes creation of the disposable copy, disposable-only
harness work, installed offline checks, and the synthetic-canary rehearsal is:

`Approve High-Stakes task 021 at docs/ai-work/tasks/021-brief.md. Build it.`

It does **not** authorize a real credential, SDK authentication, login, browser,
provider network, model call, cost, billing change, live activation, or copy-back.
The builder must stop after the offline rehearsal and show the exact live boundary.

### 2. Qualified-human boundary verdict

Before any live approval can take effect, the owner must record a qualified
reviewer's identity by role (not personal data), verdict, scope checked, and
remaining concerns. A passing handoff is:

`For Task 021, the qualified security reviewer has inspected the exact broker, worker, process, environment, crash/log, and network boundary. Verdict: PASS for this one disposable run. No credential value was disclosed.`

If that statement is unavailable or qualified, the task stops. It authorizes no
live action by itself.

### 3. Credential-use approval

Only after the passing human verdict, the credential approval is:

`For Task 021 only, I confirm my Claude credential is owner-managed through the provider's official local login or operating-system store, and I approve the verified broker to use it for the one pinned disposable task. Do not reveal, inspect, copy, or log its value.`

This authorizes credential use only through the verified broker. It does not
authorize login, credential creation/change, network access, cost, or activation.

### 4. Provider-network approval

The separate network approval is:

`For Task 021 only, approve one installed-SDK query to api.anthropic.com over HTTPS for the pinned disposable README task, including only the SDK's built-in transport behavior and no Cairn retry. Block every other destination and stop after success or failure.`

This authorizes only the named provider network path. It does not authorize another
query, browser/login flow, update, telemetry destination, external write beyond the
query, cost beyond the separate cap, or activation.

### 5. Cost approval

The separate cost approval is:

`For Task 021 only, approve provider-reported model cost up to US$0.25 for one claude-haiku-4-5 query. No fallback model, second query, billing change, or higher amount is approved.`

All three live approvals must be present after the passing human verdict and after
the builder shows the exact resolved live boundary. Missing one means no live call.
If the SDK, provider, account, or network boundary cannot credibly enforce these
terms, the task stops instead of asking for a broader same-task approval.

### 6. Review and decision

After the build or honest stop, the mandatory next step is a brand-new chat:

`Review High-Stakes task 021.`

Only after that review may the owner record one of:

`My decision for High-Stakes task 021: accept`

`My decision for High-Stakes task 021: revise`

`My decision for High-Stakes task 021: rollback`

`My decision for High-Stakes task 021: defer`

`My decision for High-Stakes task 021: escalate`

Acceptance preserves the disposable result as milestone evidence only. Copying the
README sentence into the real repository, wiring the broker into core/CLI/Desktop,
enabling a real-provider flag, using a valuable project, publishing, or repeating
the call requires a new High-Stakes task. No activation approval exists inside Task
021.

## Qualified-human requirement and remaining uncertainty

A qualified human is **required before credential use** because this task relies on
a new process/OS credential-isolation and network security boundary. Fresh-context
AI review cannot replace this person.

The reviewer must have practical experience with Windows process identities or
restricted tokens, Node child-process environments, desktop/CLI credential stores,
Claude/agent SDK tool and settings behavior, local IPC or one-use handles, outbound
network allow-lists, crash/log redaction, and secret incident response. They must
inspect the exact executable bytes/configuration and observe the canary rehearsal.
They must not inspect or receive the real credential value.

No separate billing specialist is required merely for a one-time cost under an
already configured account if the US$0.25 boundary is credible and no billing,
payment, subscription, or spend-control setting changes. Any account setup, billing
change, payment issue, authorization ambiguity, security-control change, or
unbounded cost requires the applicable qualified human and a new plan.

Even a passing review cannot prove absence of every SDK, operating-system,
provider, or side-channel defect. It supports only the named one-turn configuration,
fixed process boundary, exact canary, exact endpoint, current installed bytes, and
one disposable input. If the reviewer cannot make that narrow claim confidently,
the correct result is STOPPED.

## DONE and STOPPED

`Disposition: DONE` means the exact accepted Task 020 commit was copied without Git
or protected working-tree data; offline builds, focused tests, process inspection,
and the full canary rehearsal passed; a qualified human gave the required PASS;
all three live approvals were present; one bounded tool-free Claude query occurred;
one valid model-authored README sentence was applied only in the disposable copy;
the copy-local Task 021 brief, checks, report, log row, and returned disposition all
say DONE; cost stayed within the approved boundary; no canary or secret reached any
forbidden surface; parallel stayed disabled; the broker was closed; and the real
repository changed only by the pinned plan and final Task 021 report commits.

DONE does not mean the current CLI/Desktop live engine is safe, Task 021 is a
reusable real-provider feature, the disposable change is accepted into Cairn,
valuable repositories are supported, the credential boundary is generally proven,
or live activation is authorized.

`Disposition: STOPPED — [stable blocker]` means any source/hash/protected-state,
copy, build, strict-status, canary, isolation, qualified-human, exact-approval,
network, budget, model, output-schema, single-diff, lifecycle, redaction, root-
preservation, closeout, or exact-name commit condition fails; or completion would
require an install, update, login, browser, extra endpoint, model change, retry,
second call, broader prompt/path/tool access, billing change, valuable data,
parallel execution, activation, deletion, or another unapproved action.

Stable blocker codes include `ISOLATION_UNAVAILABLE`,
`CREDENTIAL_ISOLATION_UNPROVEN`, `EXPERT_NEEDED`, `CANARY_FAILED`,
`COST_BOUNDARY_UNPROVEN`, `LIVE_APPROVAL_MISSING`, `PROVIDER_CALL_FAILED`,
`MODEL_RESULT_INVALID`, `PROTECTED_WORK_CHANGED`, `SCOPE_DRIFT`, and
`EXACT_NAME_COMMIT_BLOCKED`.

After this brief is pinned, planning stops. No disposable copy, broker, canary,
credential access, provider call, model cost, or product activation begins until
the owner sends the exact Task 021 build-approval message above.
