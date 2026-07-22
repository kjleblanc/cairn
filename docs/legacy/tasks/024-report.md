# Task 024 report — bounded concurrent Final candidate

Date: 2026-07-20

Lane: **High-Stakes**

Mode: **Final candidate, disabled and not accepted or activated**

## Result in plain language

The approved build produced a disabled bounded-concurrency candidate and proved its
main offline path in disposable repositories. The candidate admits a closed batch
of one or two independently useful Standard/Applied tasks, validates disjoint exact
implementation and test paths, creates one temporary worktree per task, consumes a
strict one-call fake-provider allocation per task, runs the two fake builders with
measured overlap, integrates in task-number order against the latest `main`, reruns
declared checks before each advance, preserves DONE and STOPPED evidence, and cleans
owned branches, worktrees, locks, and state.

The two retained Task 016 review failures were independently reproduced before the
production edits. After repair, a third admission is refused inside the locked
state transition, and malformed refinement becomes terminal before any approval
artifact can be written.

The supported CLI mutation/recovery commands and read-only Desktop observation path
were built and exercised offline. The direct CLI proof completed two tasks and left
one clean `main` worktree. The headed Desktop proof showed two separate bounded
tasks, no unsafe action controls, and the exact recovery command; its owned
recovery then left one clean `main` worktree.

Task 024 nevertheless stopped. The complete core regression command passed 99 of
100 tests. The one failure is an existing Contract v2.2 fixture defect in
`core/test/steps.test.ts`: its downgrade setup replaces only the literal text
`Contract v2.0`, which is absent under Contract v2.2, so it makes no change and then
incorrectly expects `SERIAL_V2_CONTRACT_REQUIRED`. The pinned Task 024 brief does
not permit that tracked file to change. Repairing it would cross the exact approved
file boundary, so the stable blocker is `SCOPE_TOO_NARROW`.

No credential was located or used. No provider SDK query, provider network request,
cost, login, billing change, activation, valuable-repository coordinator run, or
external effect occurred. The four live approvals were never requested because the
offline gate did not fully pass.

## Source and reuse ledger

- Pinned brief commit: `73590ee0223c22402fc3e2c2e25c9829992c8a16`.
- Pinned brief Git blob: `b5d04ab87a867a1e3ee03d15f7e059c91a7da26a`.
- Task 016 implementation source commit:
  `e5c7b8f3eab5f7e628dbe48a67c552f7c7f0eede`.
- Before editing, every Task 016-derived source/test path named in the brief matched
  that source commit exactly.
- Reused and independently rechecked:
  - temporary-directory worktree derivation and ownership checks;
  - exact-path validation and ancestry comparison;
  - atomic coordinator state plus exclusive lock;
  - frozen brief/approval and scope checks;
  - exact-name task commits;
  - detached integration candidates and fast-forward-only `main` advancement;
  - coordinator-owned log append and cleanup inspection;
  - Desktop refusal/status presentation.
- Repaired rather than trusted:
  - admission capacity is checked inside the final admission transaction;
  - invalid refinement terminally refuses an already admitted, unapproved task.
- New independent boundary:
  - strict closed-batch manifest and duplicate-key rejection;
  - tracked frozen test hashes from the actual task-worktree bytes;
  - fixed one-call/cost provider ledger and hostile-output validation;
  - durable DONE/STOPPED evidence and recovery-only CLI;
  - read-only bounded Desktop deck;
  - separately gated official SDK seam with exact Task 024 approval text.

## Files changed

Core implementation:

- `core/package.json`
- `core/src/coordinator.ts`
- `core/src/steps.ts`
- `core/src/index.ts`
- `core/src/bounded-provider.ts`
- `core/src/concurrent-run.ts`

Core tests:

- `core/test/coordinator-final.test.ts`
- `core/test/coordinator-recovery.test.ts`
- `core/test/bounded-provider.test.ts`
- `core/test/concurrent-run.test.ts`

CLI implementation and tests:

- `cli/package.json`
- `cli/src/index.ts`
- `cli/src/flows/task.ts`
- `cli/src/flows/status.ts`
- `cli/src/flows/concurrent.ts`
- `cli/test/concurrent.test.ts`

Desktop implementation and tests:

- `app/src/renderer/components/TaskDeck.tsx`
- `app/src/renderer/screens/Dashboard.tsx`
- `app/tests/concurrency-final.spec.ts`

Task evidence:

- `docs/ai-work/tasks/024-report.md`

No dependency, lockfile, public policy, contract, historical task record,
activation record, or real-project log was changed.

## Important failed evidence and repairs

### Expected-red control

The first run against unchanged Task 016-derived production source had 5 intended
failures and 0 passes:

- the bounded-provider module did not exist;
- the concurrent-run module did not exist (two entry-point assertions);
- three pre-reservations became three admitted tasks;
- malformed refinement stayed admitted instead of becoming terminal.

The expected-red roots were inspected after the run. Their cleanup harness left one
clean main worktree, no task branch, and no coordinator state.

After the two coordinator repairs, both substantive Task 016 probes passed.

### Offline implementation harness corrections

Three correctable harness/implementation issues appeared during green work:

- Windows `git status` parsing lost a leading status byte because a trimming helper
  was used; parsing now uses NUL-delimited porcelain output directly.
- Windows requires recursive directory removal even for an empty directory; exact
  owned state-directory cleanup now uses that form.
- a test initially reached the writable-subset rejection before its intended
  cross-task overlap rejection; the test now constructs a valid writable subset
  and still proves the overlap.

All affected checks were rerun. Every interrupted disposable run was passed through
the exact recovery entry point before testing continued.

A later frozen-test check exposed Git line-ending rendering between the main and a
fresh Windows worktree. The gate now freezes the actual bytes in each isolated
task worktree—the bytes the builder and checks execute—rather than a differently
rendered main-worktree copy. Interrupted roots were again recovered before rerun.

### Headed test invocation correction

The Desktop production build passed. The first Playwright invocation started from
the repository root, so Electron's `args: ["."]` named the wrong application
directory and timed out. Its exact disposable run was recovered cleanly. The
unchanged headed test was rerun from `app/`, its intended working directory, and
passed in 7.2 seconds.

### Stable blocker

`npm.cmd test --workspace core` finished with 100 tests, 99 passes, and 1 failure:

```text
serial v2 provider connection Draft refuses before writes when any guard is closed
AssertionError: Missing expected exception.
Expected: /SERIAL_V2_CONTRACT_REQUIRED/
```

The pinned version of `core/test/steps.test.ts` contains:

```ts
contract.replace(/Contract v2\.0/, "Contract v1.9")
```

Contract v2.2 means that expression changes no bytes. The failure is unrelated to
the bounded runtime, but the approved brief explicitly requires the full regression
suite to pass and does not allow `core/test/steps.test.ts` to change. Continuing
would require a new approved boundary.

## Commands and real results

- Reorientation, full status, pinned brief blob/parent, protected hashes,
  worktree/branch/state inventory: **PASS** before editing.
- Task 016 exact source commit and reused-path comparison: **PASS**.
- Expected-red independent suite: **EXPECTED FAIL**, 5/5 intended causes observed.
- Repaired Task 016 concern suite: **PASS**, 2/2.
- `npm.cmd run build --workspace core`: **PASS** on each build attempt.
- Targeted bounded provider/concurrent/recovery suite: **PASS**, 12/12 before the
  later expansion; final concurrent suite **PASS**, 9/9 including four outcome
  combinations and two interruption points.
- `npm.cmd test --workspace cli`: **PASS**, 19/19.
- `npm.cmd --prefix app run typecheck`: **PASS**.
- `npm.cmd --prefix app run build:vite`: **PASS** after the required local sandbox
  execution approval; no network was used.
- `npx.cmd playwright test tests/concurrency-final.spec.ts` from `app/`:
  **PASS**, 1/1 in 7.2 seconds.
- Direct CLI run outside the test runner in
  `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-validation-wo9Cdl`:
  **PASS** — exactly two fake calls, cost `$0.00`, Task 001 DONE/checks passed,
  Task 002 DONE/checks passed, integration order `001 -> 002`, cleanup complete.
- Direct Git inspection of that root: **PASS** — clean status, one main worktree,
  no `cairn/task-*` branch, no `.git/cairn`; Task 002 evidence records Task 001's
  integration commit as its integration base.
- Four fake outcome combinations: **PASS** — DONE/DONE, DONE/STOPPED,
  STOPPED/DONE, STOPPED/STOPPED all retained truthful reports/log rows and omitted
  stopped implementation bytes.
- Fault probes after the build-state transition and after both calls/builds:
  **PASS** — recovery made no extra fake call and ended at the cleanup invariant.
- Installed SDK read-only identity: version `0.2.141`; entry SHA-256
  `48bde6aeabf7e71ad5528bf52c8feb1642c21f505ea2495c70f39db7df226d97`.
- `npm.cmd test --workspace core`: **FAIL**, 99/100 because of the out-of-scope
  stale Contract v2.0 fixture described above.
- `git diff --check`: **PASS**.
- Protected real-repository bytes, one worktree, no task branch, and no
  `.git/cairn`: **PASS** at the stop audit.

Not run after the stable blocker:

- the remaining legacy headed Desktop suite list;
- a wider external transition-by-transition fault driver;
- live SDK query/network observation;
- either provider call or any cost-bearing proof;
- fresh-context or qualified-human review.

## Provider, credential, network, and cost evidence

- Fake provider calls: bounded to two per two-task run, exactly one per task.
- Direct CLI fake calls: 2.
- Live provider calls: 0.
- Network requests authorized or made by Task 024: 0.
- Credential values requested, inspected, copied, logged, or exposed: 0.
- Provider cost: US$0.00.
- Login, refresh, recovery, billing, deployment, external write, and activation:
  none.
- The official-provider code path is unreachable from the offline fake CLI entry
  and from Desktop. It requires an exact two-task live manifest, a new empty
  temporary broker root, the pinned Task 024 commit, all four exact approval
  strings, and a fresh timestamp. No such authorization bundle was created.

Because the offline gate stopped, no claim is made that live SDK traffic, telemetry,
crash behavior, or a single outbound HTTP request has been proved. That proof would
have been required before either approved live request.

## Protected starting work

The final stop audit matched every protected planning fingerprint:

- `AGENTS.md`: unchanged.
- `docs/ai-work/PROJECT.md`: unchanged.
- `docs/ai-work/LOG.md`: unchanged.
- Task 016 brief/report: unchanged.
- Task 017 brief/report: unchanged.
- Task 021 brief and Task 023 report: unchanged.
- Task 024 brief Git blob remains
  `b5d04ab87a867a1e3ee03d15f7e059c91a7da26a`.

The real Cairn repository has one `main` worktree, no `cairn/task-*` branch, no
`.git/cairn`, no activation record, and no staged file before the exact-name task
commit.

## Retained disposable roots and cleanup

Every retained Task 024 Git repository was audited. Each has clean status, exactly
one main worktree, zero `cairn/task-*` branches, and no coordinator state or lock.
The eight empty legacy expected-red `*-cairn-worktrees` directories and two empty
`.git/cairn` directories left by the early Windows cleanup defect were removed by
exact verified path.

Retained roots:

- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-admit-only-51b1O6`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-admit-only-cou665`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-admit-only-SQ0ZaQ`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-admit-only-sqRjf6`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-admit-only-uw4rBm`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-desktop-final-rTzaG7`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-desktop-final-tBzjld`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-done-done-3AArOL`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-done-done-g0EwXs`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-done-done-IvPrtz`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-done-done-l11jje`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-done-done-Xsr7Yh`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-done-stopped-96947r`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-done-stopped-GUi3cD`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-done-stopped-qeTDuF`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-done-stopped-vxdVcZ`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-done-stopped-xnMUW4`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-fault-after-building-state-KgZT1u`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-fault-after-building-state-sY7Z3o`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-fault-after-building-state-XZf5Un`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-fault-after-builds-7mN7Bm`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-fault-after-builds-DOdsNH`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-fault-after-builds-QjkACX`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-red-capacity-KDTiHs`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-red-capacity-kkPxvp`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-red-capacity-NJADJQ`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-red-capacity-R7p4Iq`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-red-malformed-refinement-3Y7A3H`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-red-malformed-refinement-6avopT`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-red-malformed-refinement-aT6fuf`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-red-malformed-refinement-wEdqqy`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-stopped-done-jPNBLr`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-stopped-done-Kg0aiz`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-stopped-done-RbC9Bb`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-stopped-done-tSzrMU`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-stopped-done-XQEKF2`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-stopped-stopped-mwSfGo`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-stopped-stopped-Q0hnu3`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-stopped-stopped-QGyzkY`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-stopped-stopped-SFoFPJ`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-stopped-stopped-XoVahL`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-validation-4tSL0M`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-validation-GRP16t`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-validation-lWrNwD`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-validation-trLaEa`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-validation-wo9Cdl`

## How the owner can inspect the offline result

No command is needed to keep the project safe. The candidate is disabled.

For read-only inspection of the most direct successful proof:

```powershell
git -C "C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-validation-wo9Cdl" status --short
git -C "C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-validation-wo9Cdl" log --oneline -6
Get-Content "C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-validation-wo9Cdl\docs\ai-work\LOG.md"
Get-Content "C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-validation-wo9Cdl\docs\ai-work\tasks\001-evidence.json"
Get-Content "C:\Users\KenJL\AppData\Local\Temp\cairn-task-024-validation-wo9Cdl\docs\ai-work\tasks\002-evidence.json"
```

Expected: empty status; separate task/evidence and integration commits; two
`Applied / completed / DONE` rows; Task 002's integration base equals Task 001's
latest-main integration commit.

Do not set an activation record or construct live approval data from this report.

## Limitations and required human checks

- Task 024 did not satisfy its full offline gate because one required legacy test
  is stale and out of scope.
- No live provider boundary was proved and the separately approved two-call proof
  did not occur.
- The remaining headed regression suites and exhaustive external fault matrix were
  not run after the stable blocker.
- The implementation has not received mandatory fresh-context review.
- No qualified Git/concurrency developer reviewed the exact implementation commit.
- The owner has not accepted the candidate.
- No activation is authorized or present.
- The local candidate code is historical STOPPED evidence, not an activation-ready
  result despite the useful offline checkpoints.

The smallest follow-up is a new task that explicitly allows the stale v2.0 fixture
to be corrected and then reruns the whole Final proof. Task 024 itself must not be
resumed or rewritten.

Milestone movement: **NO**

Disposition: **STOPPED — SCOPE_TOO_NARROW**
