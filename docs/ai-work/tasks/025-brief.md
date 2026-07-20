# Task 025 brief — repair the Contract v2.x regression fixture

Date: 2026-07-20

Lane: **Standard**

## Visible outcome

The serial-v2 guard test actually downgrades the current Contract v2.2 fixture to
v1.9, so the complete core regression suite can test the intended refusal instead
of failing because it still searches for the old v2.0 heading.

This removes Task 024's narrow test-harness blocker without rewriting, resuming,
accepting, reviewing, or activating Task 024.

## Why this lane fits

This is one local, Git-recoverable test-fixture correction. It changes no product
runtime, dependency, public interface, credential, network boundary, cost,
activation state, or external system.

## Exact allowed files

- `core/test/steps.test.ts`
- `docs/ai-work/tasks/025-brief.md`
- `docs/ai-work/tasks/025-report.md`
- `docs/ai-work/LOG.md`

Everything else must stay untouched.

## Protected starting work

- Clean `main` at `c63aba80fcda61549dd3b304a026819c5b06bbcb`.
- Task 024's pinned brief, STOPPED report, implementation commit, retained
  disposable evidence, and disposition are immutable historical evidence.
- All contract, policy, product runtime, dependency, lockfile, activation, and
  unrelated task files are protected.

## Implementation boundary

Change only the test setup that replaces a Contract v2 heading with `Contract
v1.9`. The matcher must accept the current v2.2 heading and later v2.x minor
versions while remaining narrow enough not to alter unrelated content.

Do not weaken or remove the expected `SERIAL_V2_CONTRACT_REQUIRED` assertion.

## First visible checkpoint

The previously failing serial-v2 provider guard test passes for its intended
reason: the fixture bytes contain v1.9 and the product guard refuses them.

## Checks

1. Build core.
2. Run the targeted `core/dist/test/steps.test.js` suite.
3. Run `npm.cmd test --workspace core` unchanged.
4. Inspect the test diff and prove the assertion was not weakened.
5. Run `git diff --check` and a final exact-path scope/status audit.

## Assumptions and uncertainty

- The one 99/100 failure recorded by Task 024 is reproducible and caused only by
  the stale literal v2.0 matcher.
- No Task 024 runtime repair is authorized or needed in this task.

## High-Stakes boundary

This task authorizes no provider SDK query, credential use, network request,
spending, live proof, owner acceptance, qualified-human verdict, activation,
deployment, or valuable-repository bounded run. Reaching any of those requires a
new pinned High-Stakes task and its separate approvals.

## DONE and STOPPED

DONE means the fixture makes the intended v1.9 mutation, the targeted and complete
core suites pass unchanged, only the four named task paths change, and the task is
reported, logged, and committed by exact name.

STOPPED means the failure has another cause, the full suite still fails, repair
requires product or out-of-scope changes, protected work changes, or a High-Stakes
boundary is reached.
