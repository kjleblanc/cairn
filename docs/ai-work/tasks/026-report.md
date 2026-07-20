# Task 026 report — final bounded concurrent path

Date: 2026-07-20

## Result

The approved offline build produced a disabled bounded-concurrency candidate and
closed several concrete Task 024 review defects. The focused offline controls are
green, including strict admission/authorization checks, isolated broker and worker
entry points, sanitized Desktop state, all four DONE/STOPPED combinations, and two
real process-kill recovery cases.

Task 026 nevertheless stops before live use with
`PROVIDER_BOUNDARY_UNPROVEN`. The installed Claude Agent SDK 0.2.141 accepts proxy
environment variables, but its installed public options and bytes do not provide a
Windows enforcement boundary proving that every provider, retry, authentication,
telemetry, or error-reporting connection must traverse Cairn's loopback CONNECT
guard. The SDK spawns its own CLI process and contains direct fetch/retry networking;
its documented sandbox controls apply to command/tool execution and do not prove
exclusive routing of the SDK's own provider traffic. Proving exclusivity would
require a VM/container or operating-system network policy not authorized by this
brief. The pinned brief explicitly requires this stop before any credential or live
call when direct bypass cannot be ruled out.

No credential was requested, inspected, or used. No live provider call occurred,
and cost was **US$0.00**. No activation record was created. The real Cairn repository
was not used as a bounded-run target.

## Files changed

Core implementation:

- `core/package.json`
- `core/src/bounded-provider.ts`
- `core/src/bounded-broker-child.ts`
- `core/src/bounded-broker-protocol.ts`
- `core/src/bounded-network-guard.ts`
- `core/src/concurrent-activation.ts`
- `core/src/concurrent-run.ts`
- `core/src/concurrent-state.ts`
- `core/src/concurrent-worker-child.ts`
- `core/src/index.ts`
- `core/src/steps.ts`

Core tests:

- `core/test/bounded-broker.test.ts`
- `core/test/concurrent-activation.test.ts`
- `core/test/concurrent-run-faults.test.ts`
- `core/test/concurrent-run-review.test.ts`
- `core/test/concurrent-run.test.ts`

CLI and Desktop:

- `cli/src/flows/concurrent.ts`
- `cli/src/flows/task.ts`
- `app/src/renderer/components/TaskDeck.tsx`
- `app/tests/concurrency-final.spec.ts`

Task record:

- `docs/ai-work/tasks/026-report.md`

The pinned brief and real-project `docs/ai-work/LOG.md` did not change. Task 024 and
Task 025 records remain immutable.

## Retained-concern ledger

- **Emergency disable:** corrected to
  `CAIRN_BOUNDED_CONCURRENCY_DISABLE`; the legacy reversed spelling grants no
  authority. Focused admission probes pass.
- **Durable ownership and journal:** a strict versioned state/journal, atomic state
  replacement, ownership data, stale-lock PID check, and before/after crash hook were
  added. Two external process kills recover cleanly. The required exhaustive
  before/after matrix for every one of the 17 modeled transitions was not completed,
  so this is useful partial evidence rather than a DONE claim.
- **Evidence recovery:** recovery reconciles an observed main fast-forward and avoids
  duplicate task log rows in the exercised case. Exhaustive evidence-creation and
  cleanup interruption points remain unproved.
- **Frozen approval:** strict exact-key authorization parsing, full-file hashes, and
  rechecks under the coordinator path were added. Extra-field and wrong-variable
  probes fail before broker/worker effect.
- **Programmatic mutation:** the raw-object admission/run exports were removed. The
  supported mutating path now loads an exact tracked repository-relative manifest
  file and the CLI uses that path.
- **Broker and worker isolation:** SDK import/query moved to a dedicated broker child
  in an empty directory; result application moved to a credentialless fixed-path
  worker. Parent source no longer imports or calls the SDK query path.
- **Provider destination boundary:** a strict loopback CONNECT counter/allowlist and
  nonessential-traffic/error-reporting environment controls were added and fake
  guard tests pass. Exclusive routing cannot be proved on this Windows/SDK boundary;
  this is the stable stop.
- **CLI and Desktop:** the CLI exposes the same manifest-file run command for offline
  and live modes, with a separate authorization file for live mode. Desktop receives
  a sanitized read-only view and no bounded mutation control.
- **Placeholder checks:** the synthetic welcome and add-book checks now reject their
  starting placeholders and require task-specific semantic output.
- **Task 016 regressions:** the prior capacity and malformed-refinement probes remain
  green, and the closed batch has no late task registration/refinement operation.
- **Activation:** absence of a strict repository-bound activation record continues
  to refuse valuable-repository admission; the emergency disable also blocks new
  admission while leaving recovery available.

## Commands and real results

- Pinned-brief and starting-state audit — PASS. Brief commit
  `87eb01d10fae6d2e68d3a53bff82d8a182008565`, parent
  `810c1f577551cc40370b51a741a6bbfe259f2ded`, and brief blob/hash matched. The
  protected hashes, clean starting state, one main worktree, no task branch, and no
  `.git/cairn` state matched the brief.
- Installed SDK audit — version `0.2.141` and planned entry SHA-256
  `48bde6aeabf7e71ad5528bf52c8feb1642c21f505ea2495c70f39db7df226d97`
  matched. Source/type inspection found proxy configuration conventions and direct
  fetch/retry paths, but no mandatory Windows exclusive-transport option —
  `PROVIDER_BOUNDARY_UNPROVEN`.
- Expected-red review controls against the retained candidate — expected 9/9
  failures for the intended missing-boundary reasons; no unrelated setup failure.
- Post-implementation review controls — PASS, 9/9.
- Focused bounded provider/concurrent/Task 016/recovery set — PASS, 16/16.
- Strengthened broker/activation/review/journal/concurrent set — PASS, 26/26 in
  about 248 seconds. This included strict broker protocol, rejected unauthorized
  destination, exact emergency variable, extra authorization field rejection,
  sanitized view, all four outcome combinations, a process kill after the first
  task-worktree creation, and a process kill after the first main fast-forward.
- `npm.cmd run build --workspace core` — PASS after one in-scope TypeScript
  annotation repair.
- `npm.cmd run build --workspace cli` — PASS.
- `npm.cmd test --workspace cli` — PASS, 19/19.
- `npm.cmd --prefix app run typecheck` — PASS.
- First `npm.cmd --prefix app run build:vite` — blocked by the filesystem sandbox
  reading the repository's own Vite config; no source failure. Exact rerun outside
  that sandbox — PASS for main, preload, and renderer production bundles.
- `npx.cmd playwright test tests/concurrency-final.spec.ts --headed` — INCOMPLETE.
  The command hit its 184-second runner timeout and ended with `EPIPE`. It had only
  admitted the disposable offline run: both call allocations were unused. The exact
  recovery command then completed with 0 calls and US$0.00, recorded both disposable
  tasks as `STOPPED — RECOVERED_AFTER_INTERRUPTION`, and restored one clean main
  worktree with no task branch or `.git/cairn` state.
- Complete core-suite rerun — NOT ESTABLISHED after the final edits. Two attempted
  background launch wrappers failed to produce a trustworthy completion receipt;
  they are not counted as checks.
- No live proof command was run because the provider boundary failed before the
  four live approvals could safely become relevant.

The loopback guard's rejected-destination test used localhost and rejected the
request before opening an external connection. No package install/update, provider
network call, deployment, message, external-service write, or valuable-data action
occurred.

## Retained disposable evidence

The focused checks retained 33 disposable Git fixture repositories under
`C:\Users\KenJL\AppData\Local\Temp` plus isolated headed-test artifacts. Their
container names are:

- `cairn-task-024-admit-only-{0d6kqi,1YHTKe,WLXAxS}`
- `cairn-task-024-approval-extra-NHIf1h`
- `cairn-task-024-desktop-final-NqPk1w`
- `cairn-task-024-disable-exact-I789NS`
- `cairn-task-024-disable-legacy-khaX9a`
- `cairn-task-024-done-done-{7qIEKi,Fl55pL,ST57PT}`
- `cairn-task-024-done-stopped-{1DxaQz,7boS1N,la2nGZ}`
- `cairn-task-024-fault-after-building-state-{dpPqgY,pOT5UB,xcr8Qc}`
- `cairn-task-024-fault-after-builds-{0sIK4v,NPghC4,u4ZhQ3}`
- `cairn-task-024-process-after-main-fast-forward-1-HzHlKk`
- `cairn-task-024-process-after-task-worktree-1-VhJAYN`
- `cairn-task-024-red-capacity-KeMO7S`
- `cairn-task-024-red-malformed-refinement-tU6xh3`
- `cairn-task-024-sanitized-view-vn7FON`
- `cairn-task-024-stopped-done-{7xPjMm,KltIjd,xDHM5E}`
- `cairn-task-024-stopped-stopped-{89ABHZ,pv35il,SkHtfp}`
- `cairn-task-024-validation-{bu6XSB,JTJiwA,Wfpxgv}`

The final audit found one main worktree, no task branch, and no coordinator state for
every completed/recovered fixture. The intentionally malformed approval fixture
retains its changed test input as failed evidence but created no coordinator state.
The headed fixture was recovered after the timeout and is clean. Related isolated
artifacts include the `cairn-final-proof-desktop-final-*` and
`playwright-artifacts-*` containers; no process from the timed-out run remains.

## Rollback and safety state

The candidate remains disabled by default and is not accepted or activated. The
implementation/report commit can be reverted as one local commit after review; the
pinned brief remains historical evidence. No production state, dependency, lockfile,
contract, policy, public guide, activation record, or real-project log requires
rollback.

Do not create a live authorization file, set an activation record, or make the two
provider calls from this candidate. The safe next step is the mandatory skeptical
fresh-context review. A qualified Git/concurrency developer would still be required
before any later activation even if a future separately approved architecture
provides an enforceable provider network boundary.

## How the owner can inspect it

After the implementation/report commit, use a new chat and type:

```text
Review High-Stakes task 026.
```

The review should inspect the pinned brief, actual diff, changed tests, the installed
SDK boundary evidence, and this report last. It should not repair the candidate.

Milestone movement: **NO**

Disposition: **STOPPED — PROVIDER_BOUNDARY_UNPROVEN**
