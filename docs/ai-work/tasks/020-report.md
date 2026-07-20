# Task 020 — report

## Result in plain language

The disabled Task 019 provider-connection Draft now rejects the hidden adapter
response shapes that its first validator missed.

An accepted fake adapter response must now be a non-Proxy ordinary object with
exactly one own key: an enumerable data property named `status`. Cairn uses
`Reflect.ownKeys` so non-enumerable and symbol keys cannot hide from validation,
and it reads the status from the property's descriptor so getters and setters are
not invoked.

The focused synthetic tests prove that all of these fail with the same fixed
`PROVIDER_STATUS_INVALID` message before provider state or serial-task artifacts
are written:

- an enumerable `status` plus a non-enumerable canary-valued extra field;
- an enumerable `status` plus a symbol extra field;
- a non-enumerable `status` field;
- an accessor `status` field with both getter and setter;
- a non-enumerable accessor extra field; and
- a Proxy whose inspection traps would throw the synthetic canary.

The accessor and Proxy counters remained zero. The error message, error stack, and
all files beneath each synthetic project remained canary-free. Existing ordinary
fake Claude and OpenAI responses still write exactly `provider` and `status` and
complete the unchanged serial-v2 mock Standard task.

No real provider, credential, credential store, browser, account, network request,
model, payment, filesystem link, sandbox experiment, dependency, or valuable
project was used. The Experimental Draft remains unexported, unwired, fake-only,
synthetic-only, serial-only, and disabled by default.

## Starting point and protected work

- Pinned Task 020 brief commit:
  `f9bf1e4b789ee92d9c76ef592c536df19637322d`.
- Task 019 implementation being repaired:
  `bfb12dd139b3e67c7a8e2ccc033cc917dfabb21e`.
- The pinned and working Task 020 brief retained the same Git blob:
  `d8e3ccec6a8ed4901dfcbdf545eccb3ba35f77a1`.

The owner recorded Task 019's `revise` decision before this build. The resulting
protected root `docs/ai-work/LOG.md` remained unstaged and byte-identical throughout
the Task 020 build at SHA-256:

`4FBA1D433EFA2B1C05FC59EB30820660DC6F7279ABE8EF646E2729EC90E8EB6A`.

The five protected untracked files remained untracked and byte-identical:

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

## Files changed

- `core/src/provider-connection.ts` — rejects Proxies before reflection, inspects
  every own key, requires one enumerable `status` data descriptor, and reads only
  that descriptor's value.
- `core/test/steps.test.ts` — adds one focused regression group covering hidden,
  symbol, accessor, Proxy, no-write, non-invocation, fixed-error, and canary
  behavior.
- `docs/ai-work/tasks/020-report.md` — this report.

No serial lifecycle, Desktop source, package, lockfile, dependency, public export,
CLI, task handler, legacy gate, coordinator, parallel, contract, project-fact, or
public-document file changed. Existing ignored core build output refreshed through
the declared build commands and was not staged.

## Commands run and real results

### Approval and boundary verification

- Verified repository root, exact HEAD, full status, empty index, and pin commit.
- Verified the working brief and committed brief had the same Git blob.
- Read the active contract, project facts, maintainer standards, Task 019 decision
  row, complete pinned brief, current validator, and existing focused tests.
- Recomputed the post-decision log hash and all five protected untracked-file hashes
  before editing. All matched the approved build boundary.

### First visible checkpoint

- `npm.cmd run build --workspace core`: **passed**. Contract asset sync and
  TypeScript compilation completed with the already-installed toolchain.
- `node --test --test-name-pattern="serial v2 provider connection Draft" core/dist/test/steps.test.js`:
  **5/5 passed** in about 0.8 seconds.

The five passing groups covered all original Task 019 guards and tainted adapter
cases, the six new response shapes, all allowed non-secret statuses, and complete
clean fake Claude/OpenAI serial paths.

### Full regression and Desktop check

- First combined full-suite/typecheck command: **timed out at the checking
  harness's 180-second command limit before the full suite finished**. Output up to
  termination showed passing tests and no assertion failure; the Desktop typecheck
  had not started. No acceptance criterion or product code changed in response.
- `npm.cmd test --workspace core`, rerun unchanged with a sufficient local timeout:
  **84/84 passed** in about 187.5 seconds. This includes all unchanged serial,
  coordinator, and parallel tests plus the new Task 020 group.
- `npm.cmd --prefix app run typecheck`: **passed** with no TypeScript errors.

The initial timeout is preserved as checking-harness evidence. The successful
unchanged rerun establishes the declared full-suite result.

### Source, diff, and protected-state audits

- `git diff --check` on the named Task 020 files: **passed**.
- Focused validator scan found no filesystem-link, network, subprocess, browser,
  provider SDK, provider executable, home-directory, or external URL operation.
- Root-export and product-wiring scan found no new package-root, Desktop, or CLI
  wiring.
- Actual diff inspection confirmed the implementation and tests stayed within the
  two permitted code paths.
- Pinned-brief and protected-hash rechecks passed after executable checks.

### Final staging and commit check

- `git add -- core/src/provider-connection.ts core/test/steps.test.ts docs/ai-work/tasks/020-report.md`:
  **blocked before staging** because the sandbox denied creation of
  `.git/index.lock`.
- The approved brief prohibited sandbox escalation, so the command was not retried
  at that point. The index remained empty, and the task was honestly reported
  `STOPPED — EXACT_NAME_COMMIT_BLOCKED`.
- The owner then issued this process-only override:
  `Owner override: For Task 020 only, allow sandbox escalation solely to stage and
  commit core/src/provider-connection.ts, core/test/steps.test.ts, and
  docs/ai-work/tasks/020-report.md by exact path.`
- The override does not widen the implementation, executable checks, or live-effect
  boundary. It permits only the exact-name local staging and commit needed to finish
  the already-tested result.

The final exact-name staging audit and local commit occur after this report is
finalized. Their result and commit hash are stated in the build handoff. The
protected log and five protected untracked files remain outside the index.

## How the owner can try it safely

From the repository root, the smallest safe check is:

```powershell
npm.cmd run build --workspace core
node --test --test-name-pattern="serial v2 provider connection Draft" core/dist/test/steps.test.js
```

Success looks like `5` tests, `5` passes, and `0` failures. One test name explicitly
says it rejects hidden, symbol, accessor, and Proxy shapes before writes.

These commands use only installed local tools and newly created ordinary synthetic
temporary projects. They do not contact or sign in to a provider, use a credential,
open a browser, make a model call, or run a filesystem-link experiment. Do not set
the Draft flags manually against a real project.

## Limitations and human checks

- This proves the listed synthetic JavaScript response shapes on the current Node
  runtime; it is not a proof of every theoretically unusual object shape.
- It does not prove filesystem-link containment, hostile-code containment,
  operating-system isolation, future Node behavior, or real adapter behavior.
- It does not verify Claude Code, Codex, ChatGPT subscription access, provider
  commands, browser handoffs, sign-out, revocation, or billing.
- No provider connected and no model ran, so the real-model milestone remains
  incomplete.
- A qualified authentication/isolation human remains required before any later
  live provider connection unless every active-contract exception condition is
  separately established.
- A mandatory fresh-context reviewer must inspect the pinned brief, implementation,
  changed tests, full diff, protected state, and this report before acceptance.

## Rollback status

Immediate containment remains leaving `CAIRN_PROVIDER_CONNECTION_DRAFT` and
`CAIRN_SERIAL_V2_DRAFT` unset. The repair is local and Git-recoverable. If rejected,
a separately approved High-Stakes rollback task can additively revert only Task
020's implementation/report commit and rerun the focused test, full core suite,
Desktop typecheck, diff audit, and protected-state checks.

There is no provider session, credential, external service, or live data to undo.

Milestone movement: YES

Disposition: DONE
