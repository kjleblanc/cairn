# Task 019 — prove a provider-owned connection boundary on the serial v2 path

Lane: **High-Stakes**

Mode: **Experimental Draft — default-off, fake-only, synthetic-only, serial only**

Reason: this work defines an authentication and credential-isolation boundary for
provider accounts. A mistake could expose credentials, create false connection
claims, enable network or paid effects, or weaken the accepted serial path. The
first build is deliberately contained so none of those live effects can occur.

## Visible outcome and milestone movement

The accepted serial Contract v2 path gains an internal provider-connection layer
with two choices:

- `claude` — reserved for a future adapter owned by the official Claude Code
  account flow; and
- `openai` — reserved for a future adapter owned by official Codex **Sign in with
  ChatGPT** subscription access.

In this task, both choices use fake adapters only. With three exact opt-ins, one
newly created synthetic temporary Cairn project can choose either provider, receive
an enumerated non-secret connection status from its fake provider-owned adapter,
store exactly the provider choice and status, and then complete the already
accepted serial-v2 mock Standard task through brief, visible build, checks, report,
work-log row, and `DONE`.

The same supported path is rehearsed once per provider choice. No real adapter,
provider executable, SDK, browser, account, credential, network service, model, or
money is used. DONE for this task proves only the fake boundary and connection-state
shape; it does **not** mean Claude or OpenAI is connected or that Cairn can yet make
a real model call.

Expected milestone movement: **YES**, because the real-model milestone gains a
tested provider-neutral seam on the accepted serial lifecycle and removes Cairn's
existing direct Claude credential-file probe. A later High-Stakes activation task
must implement and verify each official provider adapter before the milestone can
be completed.

## Supported user path

This Experimental Draft supports exactly one path, exercised with two provider
variants:

1. A new synthetic Cairn Contract v2.x project exists strictly beneath the
   operating-system temporary directory.
2. `CAIRN_SERIAL_V2_DRAFT=1`, `CAIRN_PROVIDER_CONNECTION_DRAFT=1`, and
   `CAIRN_MOCK=1` are set only for the test process; `CAIRN_PARALLEL_DRAFT` is absent.
3. The caller selects `claude` or `openai`.
4. The matching injected fake adapter returns one allowed connection-status value.
5. Cairn validates the response and writes one state file whose parsed object has
   exactly two keys: `provider` and `status`.
6. The unchanged serial-v2 lifecycle completes its fixed local mock Standard task.
7. The result, state file, task brief, visible artifact, report, and log row contain
   no synthetic canary and no field other than the explicitly allowed provider
   choice and non-secret status.

Provider selection outside this path, real sign-in, connection refresh, sign-out,
model selection, model execution, retries, account switching, billing, CLI/Desktop
wiring, and valuable-project use are unsupported.

## Connection contract and stored data

The internal contract may expose only:

- provider: `claude` or `openai`;
- status: a small closed enum such as `unknown`, `disconnected`, or `connected`; and
- fixed Cairn-owned failure codes that do not include provider output.

The only new persisted runtime object is a synthetic-project state file such as
`.cairn/provider-connection.json`, containing exactly:

```json
{"provider":"claude","status":"connected"}
```

or the equivalent `openai` choice. It may not contain an account name, email,
identifier, subscription or plan detail, tenant, organization, scope, token,
cookie, key, credential, session value, expiry, provider URL, command, environment
value, raw provider output, error text, opaque handle, filesystem path, or history.
No credential, account-identity detail, or provider-output detail other than the
allowed provider choice and status may be placed in localStorage, sessionStorage,
IndexedDB, renderer memory, IPC, a task artifact, a work log, Git, terminal output,
analytics, telemetry, or crash output.

Adapters are dependency-injected. The connection layer must reject unknown
providers, unknown statuses, missing fields, and extra fields before writing state
or starting the serial task. An adapter exception must become one fixed redacted
failure code; its original message, stack, and data must not be logged, returned,
stored, or copied into task evidence.

## Files that may change during the approved build

- `core/src/provider-connection.ts` — new internal provider/status types, strict
  validation, redacted error handling, synthetic-only state persistence, and fake
  adapter seam.
- `core/src/serial-v2.ts` — add a provider-connected wrapper around the accepted
  serial-v2 mock lifecycle without weakening its existing guards.
- `core/test/steps.test.ts` — focused guard, canary, exact-state, containment, and
  two-provider supported-path tests using newly created temporary projects.
- `app/src/main/ipc.ts` — remove Cairn's direct checks for Claude credential-file
  paths. If the existing legacy preflight retains a software-presence check, it may
  check only already-installed software without invoking provider authentication;
  it may not claim that a provider account is connected by inspecting
  provider-owned files.
- `docs/ai-work/tasks/019-report.md` — final build evidence.

Ignored generated output under existing `core/dist`, `core/assets`, `app/.vite`, and
`app/resources` paths may refresh only as a result of the declared installed build
commands. It is not staged or committed.

The pinned `docs/ai-work/tasks/019-brief.md` must remain byte-identical during the
build.

## Files and behavior that must stay untouched

- All coordinator and parallel candidate source, tests, fixtures, flags, retained
  evidence, branches, worktrees, and task records, including
  `core/src/coordinator.ts` and every coordinator test.
- `core/src/steps.ts`, the legacy approval/review path, and every existing gate.
- `core/src/index.ts`; neither the serial-v2 experiment nor the connection layer is
  exported from the package root.
- The current SDK engine, CLI commands, Desktop task handlers, provider/model
  chooser, renderer storage, and model catalog. They are outside the supported
  path and receive no new live-provider claim.
- Package manifests, lockfiles, dependencies, build/release configuration, public
  documentation, project contract, and project facts.
- Real repositories, valuable data, Git branches/worktrees, provider accounts,
  provider credential stores, browser state, billing, and external systems.

Nothing may be deleted, moved, broadly staged, pushed, published, released,
deployed, or written outside newly created synthetic temporary roots and the named
repository files.

## Protected starting work

The accepted serial-v2 starting point is commit
`5b3e3efed6c40bfa5b30acb8d6582247ba69a3ee`.

The following pre-existing modified file must remain unstaged and byte-identical:

- `docs/ai-work/LOG.md` — SHA-256
  `F428CCD609485334E4ABD13468A4B672C2FC6A4B21277AD8B0D6A99679C0C56E`.

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

Because the existing root work-log change is protected, the build must not append
or stage a Task 019 row. A later owner-decision step may record the High-Stakes
decision without rewriting this brief or report.

## First visible checkpoint

A targeted installed-tool test proves all of these before broader work continues:

1. without every exact Draft/mock flag, with the parallel flag enabled, or outside
   a synthetic temporary Contract v2 project, the provider path refuses before any
   state or task write;
2. a tainted fake adapter that includes a synthetic canary in an extra field or
   thrown error fails closed, returns only a fixed redacted code, and writes nothing;
3. clean `claude` and `openai` fake adapters each write an exact two-key state object
   and complete the accepted serial-v2 mock lifecycle; and
4. a recursive scan of returned values, captured Cairn output, and synthetic files
   finds no canary, credential-shaped field, approval/review artifact, coordinator
   state, Git repository, branch, worktree, or network evidence.

If this checkpoint fails, repair only an in-scope implementation or checking-harness
mistake and rerun. Stop if passing would weaken the boundary or widen the task.

## Safe rehearsal and containment proof

All rehearsal data is newly created, synthetic, and disposable. The fixed canary is
clearly labelled as fake, for example
`CAIRN_TASK_019_SYNTHETIC_CANARY_NOT_A_CREDENTIAL`, and is never copied from an
environment, account, home directory, provider file, browser, or external service.

The rehearsal must cover:

- both allowed provider choices and every allowed status;
- unknown provider, unknown status, missing field, and extra-field refusal;
- a fake raw-output field containing the canary;
- a fake exception whose message and stack contain the canary;
- a canary-valued unrelated environment variable that must not be persisted or
  returned;
- default-off, non-mock, parallel-flag, non-temporary, inactive-contract, wrong
  contract-version, and tripped-Direction-Gate refusal before provider-state writes;
- exact JSON-key and value inspection after each successful run;
- recursive canary scanning of the complete synthetic root and every captured
  Cairn-owned output;
- absence of network modules, `fetch`, provider SDK imports, provider executable
  invocation, browser opening, `child_process`, home-directory lookup, credential
  filenames, or provider-auth file paths in the new connection and serial modules;
  and
- source inspection confirming `app/src/main/ipc.ts` no longer probes `.claude`,
  `.credentials.json`, or another provider-owned credential path.

The test process may set and restore only the named Draft/mock flags and the fake
canary. It may not inspect the owner's environment for secrets or enumerate the
owner's home or provider directories.

The Draft is immediately contained by leaving the flags unset. The new modules stay
unexported and unwired from CLI and Desktop task execution. No background process,
browser, account session, provider state, or network connection exists to clean up.

## Checks

The builder must run and report the real results of:

1. Re-orientation, pinned-brief verification, full Git status, exact HEAD, and all
   protected hashes before editing.
2. Focused source inspection of the accepted Task 018 serial-v2 path and the new
   provider boundary.
3. `npm.cmd run build --workspace core` with the already-installed toolchain.
4. A targeted compiled Node test run matching `serial v2 provider connection Draft`.
5. `npm.cmd test --workspace core` for the full existing core suite, including all
   unchanged parallel tests.
6. `npm.cmd --prefix app run typecheck` and
   `npm.cmd --prefix app run build:vite` after removing the legacy credential-file
   probe.
7. Exact schema, redaction, no-write-on-failure, recursive canary, default-off,
   temporary-root, and no-forbidden-artifact assertions described above.
8. A runtime-source audit for direct provider credential-file probes. Historical
   task evidence and third-party package contents are preserved and are not treated
   as runtime code.
9. `git diff --check` on every named task file.
10. Inspection of the actual diff and changed-file list, confirming no package,
    lock, public API, CLI, task-handler, legacy gate, coordinator, or parallel file
    changed.
11. Final full Git status, exact protected-hash/state recheck, and exact-name staging
    audit.
12. If safe, one local implementation commit containing only the pinned brief's
    allowed implementation, test, and report paths. The protected root log and five
    protected untracked files remain outside the index.
13. A mandatory skeptical fresh-context review in a brand-new chat after the build.

Passing checks prove only the fixed fake adapters and synthetic temporary path.
They cannot prove the behavior of Claude Code, Codex, ChatGPT subscription access,
provider browsers, provider credential stores, provider subprocesses, operating
system isolation, real network errors, or model cost.

## What could be damaged and whether recovery is credible

The main risks are:

- accepting or propagating credential-like data through an adapter, error, log,
  renderer, IPC payload, state file, task artifact, or Git;
- falsely labelling a provider account connected;
- accidentally invoking an installed provider SDK/CLI, browser, network service, or
  paid model during a supposedly fake rehearsal;
- leaving the existing Desktop credential-file probe in place while claiming Cairn
  never inspects provider files;
- weakening Task 018's default-off, mock-only, temporary-only, or serial-only guards;
- changing legacy or parallel behavior while adding the new seam; or
- turning an Experimental Draft schema into an unsupported public interface.

Recovery from the approved fake-only build is credible because all product changes
are local and Git-recoverable, all runtime evidence is synthetic beneath fresh
temporary roots, and the feature remains unexported, unwired, and disabled by
default. A real credential disclosure would not be recoverable by deleting files;
that is why any such access is forbidden rather than rehearsed here.

## Exact rollback plan

Before implementation, record the pinned brief commit and implementation starting
commit in the report.

If the local candidate is rejected:

1. Leave both Draft flags unset so the provider path remains unreachable.
2. Preserve the report and synthetic failure evidence; do not clean or rewrite it.
3. Start a separate High-Stakes rollback task.
4. Revert only Task 019's implementation/report commit with an additive
   `git revert`; never reset, clean, stash, or broadly restore.
5. Rebuild and rerun the Task 018 serial-v2 tests, app typecheck/build, runtime
   credential-probe audit, protected hashes, diff inspection, and full status.
6. Confirm the accepted Task 018 behavior is restored and every protected file
   retains its original bytes and tracked/untracked state.

If the build stops before a clean implementation commit, preserve the exact state
and use a separately approved rollback task to reverse only the named Task 019
paths against the pinned starting commit.

There is no live provider rollback in this task because no provider action is
allowed. Any later real-provider task must identify and verify the official
provider-owned sign-out/revocation procedure before sign-in and must never ask Cairn
to delete or inspect provider credential files.

## Qualified human and mandatory review

Qualified human for this Experimental Draft build: **none**. The build uses only
fake adapters, a fake canary, already-installed offline tools, new synthetic
temporary projects, and local reversible code. It makes no application login,
authorization, permission, real credential, personal-data, billing, production,
security-control activation, or external-service change.

Before any later real Claude Code or Codex account connection, a qualified human is
required unless a separate High-Stakes task establishes every local-AI-credential
exception condition in the active project contract. That person must have practical
experience with desktop/CLI authentication boundaries, operating-system process and
filesystem isolation, subprocess environments, log redaction, and AI-agent tool
access. Fake adapter tests do not satisfy that requirement.

After the Task 019 build, a mandatory fresh-context High-Stakes review must inspect
the pinned brief, actual implementation/test diff, removal of the legacy file probe,
default-off and containment evidence, canary failures, protected work, and builder
report. The review must give `PASS`, `PASS WITH CONCERNS`, `FAIL`, or
`VALID STOPPED`. Even a PASS accepts only the disabled Experimental Draft.

## Uncertainty and assumptions

- The owner named the intended official account experiences. Their exact current
  commands, executable behavior, browser handoff, status contract, subscription
  entitlement, and sign-out/revocation steps were not independently verified during
  planning because that would require separately approved current documentation,
  provider software, browser, or network access.
- Therefore this task reserves provider choices and proves a provider-owned adapter
  boundary, but deliberately implements no real adapter and makes no compatibility
  claim beyond the names supplied by the owner.
- The existing in-process Anthropic SDK engine is legacy and remains outside this
  supported path. This task does not claim it meets the new isolation boundary and
  must not invoke it.
- Removing the Desktop's direct credential-file probe is necessary to honor the
  owner's global no-inspection rule. Checking only installed software is not proof
  of connection and must not be described as such.
- An exact two-field state object is sufficient for this first connection seam.
  Account identity, plan details, model catalogs, capabilities, costs, and refresh
  metadata are intentionally excluded.
- Passing fake tests cannot establish a real process or operating-system isolation
  boundary.

## Separate approvals and forbidden actions

The only approval that can authorize the contained build is:

`Approve High-Stakes task 019 at docs/ai-work/tasks/019-brief.md. Build it.`

That approval authorizes only the named local fake-only implementation, installed
offline checks, report, and exact-name local commit. It does not authorize any item
below.

Each of these requires a later separately planned High-Stakes activation task and
its own just-in-time approval for the exact target and effect:

1. fetching current Anthropic, Claude Code, OpenAI, Codex, or ChatGPT documentation;
2. invoking or inspecting the behavior of a real Claude Code, Codex, provider SDK,
   provider MCP server, or provider executable, even for status or help if it could
   access an account, credential store, browser, or network;
3. opening a real provider browser sign-in or changing an account session;
4. any provider network request or connection-status request;
5. installing, updating, repairing, or configuring provider software or any
   dependency;
6. wiring a real adapter into serial v2, CLI, Desktop, or a public package API;
7. activating provider work on a valuable repository;
8. any model execution, paid or otherwise, and any cost, subscription, billing, or
   payment effect;
9. contacting a reviewer or another person, pushing, publishing, deploying,
   releasing, or writing to an external service; and
10. any deletion, sign-out, revocation, rollback, or other destructive/external
    action.

Cairn inspecting, requesting, reading, storing, logging, transmitting, or displaying
a real provider credential or provider credential file is **forbidden**, not a
just-in-time approval option. If any proposed implementation requires it, the task
must stop.

## DONE and STOPPED

`Disposition: DONE` means the default-off internal layer recognizes both provider
choices through clean fake adapters, persists only the exact two-field non-secret
state, completes the accepted serial-v2 mock path for both variants, rejects and
redacts tainted fake data without writes, passes every contained check, removes the
existing direct Desktop credential-file probe, leaves all parallel and protected
work untouched, and receives one exact-name local implementation commit.

DONE does not mean a provider is connected, the official flows were verified, a
real model can run, the Draft is accepted, or activation is safe. The mandatory next
step is a brand-new chat containing:

`Review High-Stakes task 019.`

`Disposition: STOPPED — [stable blocker]` means any guard, redaction, no-write,
canary, exact-state, containment, build, test, diff, protected-work, or commit check
does not complete; completion would require a real provider/dependency/network/live
action; or the supported path cannot be kept separate from legacy and parallel code.

After this brief is pinned, the planner stops. No build begins until the owner sends
the exact build-approval message above.
