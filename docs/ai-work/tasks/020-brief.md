# Task 020 — strictly reject hidden adapter response fields

Lane: **High-Stakes**

Mode: **Experimental Draft — default-off, fake-only, synthetic-only, serial only**

Reason: this repair changes the validation boundary that is meant to prevent
provider adapters from carrying credential-like or raw provider data into Cairn.
Task 019's fresh-context review proved that the current validator accepts some
forbidden hidden fields, so a mistake in this repair could preserve a false
isolation claim. The repair remains contained: no real provider, credential,
network, browser, process, account, payment, or valuable project is used.

## Visible outcome and milestone movement

Task 019's disabled provider-connection Draft rejects every adapter response that
is not one ordinary, enumerable data field named `status` with one allowed value.
In particular, Cairn rejects before any provider-state or serial-task write:

- a non-enumerable `status` field;
- any non-enumerable extra field;
- any symbol field;
- an accessor field, including a getter or setter named `status`;
- an accessor extra field;
- any other extra, missing, or unknown field already covered by Task 019; and
- a Proxy or another response shape that cannot be safely inspected as an ordinary
  object.

No getter, setter, or Proxy trap is invoked during rejection. Every rejected case
returns only the existing fixed Cairn-owned invalid-status error and leaves the
synthetic provider-state path, task directory, and work log unchanged.

Expected milestone movement: **YES**, because the provider-neutral seam on the
accepted serial-v2 path will match its approved strict-response claim. It still
does not connect a provider or run a real model, so the real-model milestone remains
incomplete.

## Review finding being repaired

Task 019's report said that every extra field failed closed. The review confirmed
that the pinned brief, allowed changed paths, protected work, existing builds,
current focused tests, credential-file-probe removal, lack of public export, and
fake-only/default-off containment all held up.

The strict-field claim did not hold up. `validateAdapterResponse` uses
`Object.keys`, which returns only enumerable string keys. An ordinary synthetic
response with enumerable `status: "connected"` plus a non-enumerable `rawOutput`
field was accepted. Cairn wrote provider state and completed the synthetic serial
task. That directly violated Task 019's requirement to reject extra fields before
any write.

Task 020 repairs only that finding. It does not revisit the abandoned
filesystem-link idea from the review, and it makes no broader containment or
real-provider claim.

## Supported user path

The supported user path remains Task 019's single contained path:

1. A newly created synthetic Cairn Contract v2.x project is beneath the
   operating-system temporary directory.
2. `CAIRN_SERIAL_V2_DRAFT=1`, `CAIRN_PROVIDER_CONNECTION_DRAFT=1`, and
   `CAIRN_MOCK=1` are set only for the test process;
   `CAIRN_PARALLEL_DRAFT` is absent.
3. The caller selects `claude` or `openai` and injects a local fake adapter.
4. Only an ordinary object with exactly one enumerable own string data property,
   `status`, and one allowed status value can pass validation.
5. A clean connected fake response stores exactly `provider` and `status`, then
   completes the unchanged serial-v2 mock Standard task.
6. Every tainted or unsupported response fails before state or task writes and
   exposes no synthetic canary.

Real sign-in, provider discovery, connection refresh, sign-out, model selection,
model execution, account switching, retries, billing, CLI/Desktop wiring,
filesystem-link containment, and valuable-project use remain unsupported.

## Exact validation contract

The repair must inspect the response without reading a property value through
ordinary property access.

An accepted response must satisfy all of these:

1. it is a non-null object and not an array;
2. it is not a Proxy;
3. its prototype is exactly `Object.prototype` or `null`;
4. `Reflect.ownKeys` returns exactly one key;
5. that key is the string `status`;
6. the own property descriptor for `status` exists, is enumerable, and is a data
   descriptor rather than an accessor descriptor; and
7. the descriptor's value is exactly `unknown`, `disconnected`, or `connected`.

The implementation may use Node's already-available standard library to identify
a Proxy. It must add no dependency. Any exception during shape inspection becomes
the same fixed `PROVIDER_STATUS_INVALID` error. Original exception messages,
stacks, values, keys, symbols, descriptors, or canaries must not be returned,
logged, persisted, or copied into task evidence.

## Files that may change during the approved build

- `core/src/provider-connection.ts` — replace enumerable-string-only response
  inspection with the exact validation contract above.
- `core/test/steps.test.ts` — add focused ordinary synthetic regression cases for
  hidden, symbol, accessor, Proxy, strict no-write, non-invocation, and redaction
  behavior without weakening existing Task 018 or Task 019 assertions.
- `docs/ai-work/tasks/020-report.md` — final build evidence.

Ignored generated output under existing `core/dist` and `core/assets` paths may
refresh only as a result of the declared installed core build commands. It is not
staged or committed.

The pinned `docs/ai-work/tasks/020-brief.md` must remain byte-identical during the
build.

## Files and behavior that must stay untouched

- `core/src/serial-v2.ts`; Task 018's accepted lifecycle and Task 019's wrapper do
  not need repair.
- `app/src/main/ipc.ts` and every other Desktop file; Task 019's credential-file
  probe removal remains unchanged.
- `core/src/index.ts`; the Experimental Draft remains absent from the package root.
- `core/src/steps.ts`, legacy approval/review behavior, coordinator and parallel
  source/tests, CLI commands, current SDK engine, renderer storage, model catalog,
  and public artifacts.
- Package manifests, lockfiles, dependencies, build/release configuration, project
  contract, project facts, and public documentation.
- Real repositories, valuable data, Git branches/worktrees, provider accounts,
  provider credential stores, browser state, billing, and external systems.

No file may be deleted or moved. Nothing may be broadly staged, pushed, published,
released, deployed, installed, or written outside newly created ordinary synthetic
temporary projects and the named repository files.

## Explicitly prohibited checks and actions

This task must not create, inspect, or manipulate a filesystem link, junction,
mount, reparse point, alternate path, or sandbox boundary. It must not request or
use sandbox escalation or retry a blocked command outside the sandbox.

It also must not:

- access a network or current provider documentation;
- invoke a provider executable, SDK behavior, browser, account, or credential;
- inspect a home directory, credential store, provider-owned file, or the owner's
  environment for secrets;
- install or update software;
- use a real or valuable project as test input;
- run a shell-security, penetration, malware, or sandbox-escape experiment; or
- perform a destructive, external, paid, public, or production action.

If an approved ordinary local check cannot run without one of these actions, the
task is `STOPPED`; the builder does not seek escalation or substitute a more
aggressive check.

## Protected starting work

The Task 019 implementation under review is commit
`bfb12dd139b3e67c7a8e2ccc033cc917dfabb21e`. Task 020 will build on that disabled,
unaccepted Draft without amending Task 019's pinned brief or report.

At planning time, the following pre-existing modified file is protected and must
remain unstaged:

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

Task 019's `revise` decision has not yet been appended to the protected work log.
That append-only governance action is separate from the Task 020 build. If the
owner records it before approving the build, the builder must record the resulting
new log hash during re-orientation and protect those exact post-decision bytes.
Task 020 itself may not append, edit, stage, or commit the root work log.

## First visible checkpoint

One targeted installed-tool test group proves all of these with newly created
ordinary synthetic temporary projects:

1. an enumerable `status` plus a non-enumerable canary-valued extra property is
   rejected with `PROVIDER_STATUS_INVALID` before any state or task write;
2. an enumerable `status` plus a symbol extra property is rejected before writes;
3. a non-enumerable `status`, an accessor `status`, and an accessor extra property
   are each rejected before writes;
4. accessor getters and setters are never invoked during validation;
5. a Proxy is rejected without invoking its inspection traps;
6. every returned error and synthetic file remains canary-free; and
7. the existing clean Claude and OpenAI fake responses still write the exact
   two-field state and complete the serial-v2 mock path.

If this checkpoint fails, repair only an in-scope implementation or checking-
harness mistake and rerun. Stop if passing would weaken the strict contract, alter
the supported path, or require a prohibited action.

## Safe rehearsal and containment proof

All test inputs are newly allocated in-memory JavaScript objects and newly created
synthetic Cairn projects beneath the operating-system temporary directory. The
only canary is a fixed fake label created in the test source; it is not copied from
an environment, account, filesystem, provider, or external service.

The finite rehearsal covers:

- the exact hidden, symbol, accessor, Proxy, and ordinary-object shapes named in
  the first visible checkpoint;
- descriptor-based status reading without invoking accessors;
- fixed redacted errors and unchanged state/task/log bytes after every rejection;
- recursive canary scanning of the ordinary synthetic project root and captured
  Cairn-owned return/error values;
- preservation of every existing Task 018 and Task 019 focused test; and
- source inspection confirming no new network, subprocess, browser, provider SDK,
  provider executable, home-directory, credential, or filesystem-link operation.

The rehearsal does not attempt to prove filesystem-link behavior, operating-system
isolation, real adapter behavior, or malicious code containment. Those claims are
outside Task 020. Immediate containment remains leaving all Draft flags unset.

## Checks

The builder must run and report the real results of:

1. Re-orientation, pinned-brief verification, exact HEAD, full Git status, empty
   index, and protected hash/state checks before editing.
2. Focused source inspection of Task 019's validator and response-shape tests.
3. `npm.cmd run build --workspace core` with the already-installed toolchain.
4. A targeted compiled Node test run matching
   `serial v2 provider connection Draft`.
5. `npm.cmd test --workspace core` for the full existing core suite, including
   unchanged serial, coordinator, and parallel tests.
6. `npm.cmd --prefix app run typecheck` to confirm the existing Desktop still
   typechecks against the rebuilt core. A Vite build is not required because no app
   source or public core export may change.
7. Exact assertions for own keys, descriptors, non-invocation, redaction, no writes,
   exact successful state, and recursive canary containment described above.
8. Focused source inspection showing no new filesystem-link, network, process,
   browser, provider, home-directory, or credential operation.
9. `git diff --check` on every named Task 020 file.
10. Inspection of the actual diff and changed-file list, confirming no serial,
    Desktop, package, lock, public API, CLI, task-handler, legacy gate, coordinator,
    parallel, contract, or public-document file changed.
11. Final full Git status, exact protected-hash/state recheck, and exact-name staging
    audit.
12. If safe, one local implementation commit containing only
    `core/src/provider-connection.ts`, `core/test/steps.test.ts`, and
    `docs/ai-work/tasks/020-report.md`. The pinned brief stays in its separate plan
    commit; the root log and protected untracked files remain outside the index.
13. A mandatory skeptical fresh-context review in a brand-new chat after the build.

No check may be rerun with sandbox escalation. Passing checks prove only the listed
ordinary synthetic JavaScript shapes on the fake-only supported path.

## What could be damaged and whether recovery is credible

The main risks are:

- continuing to accept hidden raw output while claiming the boundary is strict;
- invoking a getter, setter, or Proxy trap and allowing its exception or canary to
  escape;
- writing provider state or serial artifacts before response validation finishes;
- rejecting the clean ordinary response and breaking Task 019's supported path;
- weakening Task 018 or another retained test to obtain a pass; or
- widening the repair into real-provider, Desktop, public API, or containment work.

Recovery is credible because the feature remains unexported, unwired, fake-only,
synthetic-only, serial-only, and disabled by default. The only approved product
change is one local Git-recoverable validator. The tests use disposable ordinary
temporary projects. A real credential disclosure would not be recoverable, which
is why real credentials and providers remain forbidden rather than rehearsed.

## Exact rollback plan

If the Task 020 candidate is rejected:

1. Leave `CAIRN_PROVIDER_CONNECTION_DRAFT` and `CAIRN_SERIAL_V2_DRAFT` unset.
2. Preserve the report and review evidence; do not clean, reset, stash, or rewrite
   history.
3. Start a separate High-Stakes rollback task.
4. Revert only Task 020's implementation/report commit with an additive
   `git revert`; never broadly restore or delete files.
5. Rebuild core and rerun the Task 019 focused tests, full core suite, app typecheck,
   diff inspection, and protected-state checks.
6. Confirm the repository is back at the still-disabled Task 019 candidate plus its
   preserved review evidence.

No provider session, external service, or live data exists to roll back.

## Separate approvals and exact handoffs

Task 019's review decision should be recorded separately with:

`My decision for High-Stakes task 019: revise`

That message authorizes only the append-only Task 019 decision row. It does not
authorize Task 020's build.

The only approval that can authorize this contained repair build is:

`Approve High-Stakes task 020 at docs/ai-work/tasks/020-brief.md. Build it.`

That approval authorizes only the named local validator/test/report edits,
ordinary installed offline checks, and exact-name local commit. It does not
authorize any prohibited check or live action.

After the build, the mandatory next step is a brand-new chat containing:

`Review High-Stakes task 020.`

Any real adapter, provider documentation lookup, network request, sign-in, browser,
credential, account, model, cost, installation, deployment, push, publication, or
valuable-project activation requires a later separately planned High-Stakes task
and its own exact approval.

## Qualified human and uncertainty

Qualified human for this repair build: **none**. It changes only a disabled local
fake-response validator and ordinary synthetic tests. It performs no application
login, authorization, permission, real credential, personal-data, billing,
production, security-control activation, or external-service action.

A qualified human with practical desktop/CLI authentication, operating-system
isolation, subprocess-environment, and log-redaction experience remains required
before any later real provider connection unless every active-contract local-AI-
credential exception condition is separately established.

The repair can prove how the current Node runtime classifies the exact ordinary
synthetic shapes listed here. It cannot prove real provider behavior, hostile code
containment, operating-system isolation, filesystem-link containment, future Node
semantics, or absence of every theoretically unusual JavaScript object shape.

## DONE and STOPPED

`Disposition: DONE` means every named hidden, symbol, accessor, Proxy, missing,
unknown, and extra response shape is rejected with one fixed redacted error before
provider-state or serial-task writes; no accessor or Proxy trap is invoked; clean
fake Claude and OpenAI responses still complete the unchanged serial-v2 path; all
declared ordinary local checks pass; protected work remains intact; and one exact-
name local implementation commit is created.

DONE does not mean Task 019 or Task 020 is accepted, a real provider is connected,
filesystem-link containment is proved, operating-system isolation exists, or a real
model can run. The fresh-context review remains mandatory.

`Disposition: STOPPED — [stable blocker]` means strict rejection, non-invocation,
redaction, no-write behavior, clean-path compatibility, a declared build/test,
protected-work preservation, or the exact-name commit does not complete; or any
completion path would require sandbox escalation, a prohibited test, broader scope,
or a real/provider/external action.

After this brief is pinned, planning stops. No repair begins until the owner sends
the exact Task 020 build-approval message above.
