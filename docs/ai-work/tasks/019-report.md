# Task 019 — report

## Result in plain language

Cairn now has a provider-owned connection boundary attached to the accepted serial
Contract v2 mock lifecycle. It is an internal Experimental Draft that is off by
default, fake-only, synthetic-only, temporary-directory-only, and serial-only.

The supported path recognizes two provider choices:

- `claude`, reserved for a future official Claude Code account adapter; and
- `openai`, reserved for a future official Codex **Sign in with ChatGPT** adapter.

Both currently use injected fake adapters only. A strict adapter response may
contain exactly one field, `status`, with one of three values: `unknown`,
`disconnected`, or `connected`. Cairn combines that with the owner's provider choice
and persists exactly two fields:

```json
{"provider":"claude","status":"connected"}
```

The equivalent OpenAI state passed as well. Unknown and disconnected states were
stored as non-secret status, then refused before the serial task began. A connected
fake status completed the accepted Task 018 lifecycle for both provider choices:
brief, visible mock build, finite checks, report, `Applied / completed / DONE` work
log row, and returned `DONE`.

Tainted fake adapters failed closed. Missing fields, extra fields, unknown values,
unknown providers, missing adapters, and an adapter exception all returned only
fixed Cairn-owned errors. A clearly fake synthetic canary placed in an extra field,
an exception, and an unrelated environment variable did not appear in returned
errors, results, state, task artifacts, the synthetic work log, or any file beneath
the synthetic project.

The Desktop preflight no longer looks for `.claude/.credentials.json` or
`.claude.json`. It now treats a successful import only as evidence that the existing
legacy provider software is installed; it does not inspect provider-owned account
files or claim their existence proves a connection.

No real adapter, provider executable, provider authentication, browser, credential,
credential file, provider network, model, paid call, dependency install, account,
billing setting, external service, valuable repository, branch, worktree, or
coordinator state was used or changed.

## Starting point and protected work

- Pinned Task 019 brief commit:
  `7cb0348e855b249667c54c1f05dfdd320e1b4803`.
- Implementation starting commit:
  `7cb0348e855b249667c54c1f05dfdd320e1b4803`.
- Accepted serial-v2 parent:
  `5b3e3efed6c40bfa5b30acb8d6582247ba69a3ee`.
- The working brief and pinned brief had the same Git blob id before and after the
  build: `9a34704f2890b7ac13e19b3096382b99ca4a741c`.

The protected root `docs/ai-work/LOG.md` remained unstaged and byte-identical at
SHA-256
`F428CCD609485334E4ABD13468A4B672C2FC6A4B21277AD8B0D6A99679C0C56E`.

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

The real repository retained one `main` worktree, no `cairn/task-*` branch, and no
`.git/cairn` coordinator state. As required by the brief, no Task 019 row was added
to the protected root work log.

## Files changed

- `core/src/provider-connection.ts` — new internal provider/status types, strict
  fake-adapter response validation, fixed redacted errors, the exact Draft flag,
  temporary-root guard, and exact two-field state persistence.
- `core/src/serial-v2.ts` — factors the accepted Task 018 guards into one helper and
  adds the provider-connected wrapper. Existing Task 018 behavior and entry point
  remain intact.
- `core/test/steps.test.ts` — four focused test groups covering every guard, tainted
  adapter redaction, no-write failures, all allowed statuses, exact state bytes,
  canary containment, and both provider variants through the complete serial path.
- `app/src/main/ipc.ts` — removes the direct Claude credential-file path probes.
- `docs/ai-work/tasks/019-report.md` — this report.

Builds refreshed only ignored generated output under the existing `core/dist`,
`core/assets`, `app/.vite`, and `app/resources` locations. No package manifest,
lockfile, dependency, public API export, CLI file, Desktop task handler, legacy gate,
coordinator source/test, parallel candidate, public document, project contract, or
project fact changed.

## Commands run and real results

### Re-orientation and boundary verification

- Read the active project contract, `PROJECT.md`, `MAINTAINERS.md`, recent work-log
  rows, the full pinned Task 019 brief, and Task 018 report.
- Verified HEAD was the brief-only commit, the brief's working and pinned blob ids
  matched, the index was empty, and all six protected hashes matched.
- Verified one worktree, no task branch, and no coordinator state.

### First visible checkpoint

- First `npm.cmd run build --workspace core`: **failed before tests ran**. TypeScript
  correctly reported two checking-harness casts from `assert.throws`'s `void` return
  type to `Error`. The acceptance criterion did not change. The tests were repaired
  to capture thrown errors explicitly, and the same build was rerun.
- Second `npm.cmd run build --workspace core`: **passed**.
- First targeted
  `node --test --test-name-pattern "serial v2 provider connection Draft" core/dist/test/steps.test.js`:
  **3 passed, 1 failed**. The Direction Gate fixture intentionally added two
  synthetic log rows, but its helper compared against the log from before fixture
  setup and misclassified the fixture rows as product writes. The baseline capture
  moved after setup; no product criterion or expected behavior changed.
- Rebuilt core after that harness correction: **passed**.
- Reran the same targeted command: **4/4 passed**. It proved closed guards, tainted
  adapter redaction and no writes, all allowed non-secret statuses, exact two-field
  state, both fake providers, canary containment, and complete serial-v2 `DONE`.

### Full regression and Desktop checks

- `npm.cmd test --workspace core`: **83/83 passed** in about 166 seconds. This
  includes the original Task 018 serial tests, all four Task 019 groups, and all
  unchanged retained parallel/coordinator tests.
- First `npm.cmd --prefix app run build:vite` inside the filesystem sandbox:
  **blocked by the sandbox** while Vite/esbuild tried to resolve the existing config
  above its allowed directory view. It performed no provider or network action.
- The same installed local Vite command rerun with filesystem-sandbox approval:
  **passed**. Main, preload, and renderer bundles built; no download or provider
  contact occurred.
- `npm.cmd --prefix app run typecheck`: **passed** with no TypeScript errors.

### Source, diff, and containment audits

- Runtime-source scan across `core/src`, `app/src`, and `cli/src` found
  `NO_DIRECT_PROVIDER_CREDENTIAL_FILE_PROBES`.
- Focused scan of the new provider and serial modules found
  `NO_NETWORK_PROCESS_BROWSER_HOME_OR_CREDENTIAL_PROBES`.
- Product-wiring scan found
  `NO_PRODUCT_WIRING_OUTSIDE_INTERNAL_MODULES`.
- Manual diff inspection confirmed the provider layer is not exported from
  `core/src/index.ts` and is not wired to CLI, Desktop task execution, the current
  SDK engine, or parallel code.
- Focused `git diff --check`: passed, with only existing Windows line-ending
  warnings.
- Post-build protected hash and pinned-brief checks: passed.

The final exact changed-file audit, `git diff --check`, protected-state recheck,
exact-name staging audit, and local implementation commit are performed after this
report is written. Their results and the final commit hash are stated in the task
handoff.

## How the owner can try it safely

From the repository root, run only these local installed-tool commands:

```powershell
npm.cmd run build --workspace core
node --test --test-name-pattern "serial v2 provider connection Draft" core/dist/test/steps.test.js
```

Success looks like four passing tests:

1. every missing guard and the parallel flag refuse before provider/task writes;
2. tainted fake adapters return redacted errors and write nothing;
3. unknown and disconnected states persist only provider/status and do not start a
   task; and
4. connected Claude and OpenAI fake variants each complete the serial mock task and
   return `DONE`.

These commands do not sign in, open a browser, access a credential, contact a
provider, or make a model call. Do not set the Draft flags manually against a real
project; the implementation refuses any root outside the operating-system temporary
directory.

## Limitations and human checks

- This is fake-provider learning evidence, not real Claude or OpenAI support.
- Exact current Claude Code and Codex account commands, browser handoffs,
  subscription entitlement, status behavior, operating-system isolation, and
  sign-out/revocation paths remain unverified.
- The existing in-process Anthropic SDK engine is legacy and outside this supported
  path. It was not changed, invoked, or declared safe by this task.
- A software import in the legacy Desktop preflight does not prove an account is
  connected; the code now says so explicitly.
- The tests prove fixed synthetic responses and state bytes. They cannot prove that
  a future real adapter cannot leak through its own process, filesystem,
  environment, logs, browser, SDK, or provider behavior.
- No model ran, so the project's real-model milestone is not complete.
- A qualified human remains required before live provider connection unless a later
  High-Stakes task establishes every active-contract exception condition.

A mandatory fresh-context reviewer must independently inspect the pinned brief,
actual source and test diff, canary and no-write assertions, Desktop probe removal,
protected state, and this report. Even a PASS accepts only the disabled Experimental
Draft.

## Rollback status

Immediate containment is in place: `CAIRN_PROVIDER_CONNECTION_DRAFT` and
`CAIRN_SERIAL_V2_DRAFT` are unset by default, the path also requires `CAIRN_MOCK=1`,
it refuses the parallel flag and non-temporary projects, and it is unwired from
public entry points.

If rejected, a separate High-Stakes rollback task can additively revert only the
Task 019 implementation/report commit, then rerun the Task 018 serial tests,
Desktop compile checks, source audit, protected hashes, and full status. No live
provider rollback exists because Task 019 created no provider session or external
effect.

Milestone movement: YES

Disposition: DONE
