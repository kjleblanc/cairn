# Task 027 report — one-request official Anthropic Messages broker Final

Date: 2026-07-20

## Result

The approved build produced a disabled, offline-green Final candidate that replaces
Task 026's Claude Agent SDK child with the official `@anthropic-ai/sdk` `0.93.0`
Messages client behind a mandatory one-request custom-`fetch` boundary. It also
adds strict canonical live authorization, a schema-3 durable journal, explicit
approval-freeze and task-commit transitions, deterministic transition recovery,
exact child-process ownership, and cleanup hardening.

The complete core suite, CLI suite, headed Desktop scenario, direct built-CLI
checks, and the standalone 60-case process-crash matrix passed. The matrix
recovered all 60 before/after transition cases with zero request retries and zero
duplicated task-log rows.

Task 027 nevertheless stops before live use with
`SUBSCRIPTION_TRANSPORT_INCOMPATIBLE`. The owner requires Cairn's beginner path to
use an existing Claude subscription connection. Cairn's existing app path uses the
Claude Agent SDK/Claude Code transport, which Anthropic supports with subscription
plans. Task 027's approved path instead makes a standalone Claude API
`POST /v1/messages` through the official TypeScript SDK. Anthropic's current
documentation says paid Claude subscriptions do not include Claude API or Console
access; the documented standalone API authentication and billing path is separate.
Reusing or forwarding the app's subscription session would leave the approved
official-Messages/custom-fetch architecture, cross its credential boundary, and
reopen Task 026's unproved Agent SDK network-boundary concern.

No credential was requested, inspected, copied, or used. No authorization file was
created. No provider request occurred and cost was **US$0.00**. No login, refresh,
billing change, activation, push, deployment, or public action occurred. Task 026
remains immutable stopped evidence, and the valuable Cairn repository was never a
bounded-run target.

## Files changed

Dependency declaration and bounded runtime:

- `package-lock.json`
- `core/package.json`
- `core/src/bounded-provider.ts`
- `core/src/bounded-broker-child.ts`
- `core/src/bounded-broker-protocol.ts`
- `core/src/bounded-network-guard.ts` — deleted
- `core/src/bounded-messages-fetch.ts` — added
- `core/src/concurrent-run.ts`
- `core/src/concurrent-state.ts`
- `core/src/index.ts`

Core proof files:

- `core/test/bounded-provider.test.ts`
- `core/test/bounded-broker.test.ts`
- `core/test/bounded-messages-fetch.test.ts` — added
- `core/test/concurrent-run-review.test.ts`
- `core/test/concurrent-run-faults.test.ts`
- `core/test/concurrent-run-transition-driver.ts` — added
- `core/test/concurrent-run.test.ts`

Supported surfaces and task record:

- `cli/src/flows/concurrent.ts`
- `cli/test/concurrent.test.ts`
- `app/tests/concurrency-final.spec.ts`
- `docs/ai-work/tasks/027-report.md` — added

The pinned Task 027 brief and `docs/ai-work/LOG.md` did not change. Task 024,
Task 025, and Task 026 records, contracts, public guides, app contract resources,
and activation files remained untouched.

## Retained-concern ledger

- **Agent SDK bypass:** resolved inside the candidate. The bounded broker imports
  the official Anthropic TypeScript SDK directly and contains no Agent SDK query or
  native Claude CLI path.
- **Mandatory request boundary:** resolved for the standalone Messages path. The
  custom fetch synchronously consumes its sole invocation, accepts only the exact
  HTTPS Messages endpoint and POST method, forces redirect rejection, and refuses
  every alternate URL or second invocation before delegation.
- **SDK provenance:** resolved. The exact direct dependency is `0.93.0`; all seven
  installed source/package hashes named in the brief matched.
- **Missing journal transitions:** resolved. `approval-freeze` and `task-commit`
  are durable before/effect/after transitions.
- **Incomplete recovery:** materially resolved for the supported disposable path.
  Strict state, lock, manifest, authorization, process, journal-order, ownership,
  and pending-transition checks now fail closed or reconcile deterministically.
- **Two crash points only:** resolved. A standalone driver exercised all 30
  transition instances before and after their effect in separate processes: 60/60
  passed with no request retry or duplicate log row.
- **Loose CLI authorization parsing:** resolved. The CLI passes only an exact
  repository-relative path to the core parser; duplicate keys, shadow keys,
  unknown fields, stale data, and noncanonical bytes fail before branch, worktree,
  broker, or state effects.
- **Full-suite gap:** resolved. The final complete core suite passed 150/150.
- **Headed-test timeout:** resolved. The final headed Desktop scenario passed with
  sufficient timeout and removed its exact fixture.
- **Activation assurance:** deliberately unresolved and not reached. No activation
  record exists; a qualified Git/concurrency developer would still be required
  before any later activation.
- **Subscription requirement:** not compatible with this candidate's standalone
  Messages API transport. Resolving it requires a new High-Stakes authentication
  architecture; it cannot be repaired inside the pinned Task 027 boundary.

## Commands and real results

- Pinned-brief verification — PASS. HEAD remained
  `92cb8328a2f481f00e82ac62664e4d887eab2ac3`; brief SHA-256 remained
  `9AAD018C54B78590732D5199569B159B525A88DCE4A0ACC5511A7B8FDB1803E9`.
- Expected-red controls against committed Task 026 — expected 7/7 failures for the
  intended reasons: no direct official SDK declaration, Agent SDK/native broker
  path, no mandatory one-request fetch, unjournaled approval-freeze and task-commit,
  only two external crash points, and duplicate-key CLI acceptance.
- Complete core suite, `npm.cmd test --workspace core` — PASS, 150/150 in about
  215 seconds.
- Focused concurrent-run suite — PASS, 20/20 in about 240 seconds.
- Standalone transition driver,
  `node core/dist/test/concurrent-run-transition-driver.js` — PASS, 60/60 in about
  901 seconds; aggregate receipt:
  `{"cases":60,"recovered":60,"requestRetries":0,"duplicateRows":0}`.
- Full CLI tests, `npm.cmd test --workspace cli` — PASS, 20/20.
- Direct built CLI fake run — PASS: two calls, integration order `001` then `002`,
  exact cleanup.
- Direct built CLI process-crash recovery — PASS: blocker
  `CALL_OUTCOME_UNKNOWN`, zero retry, exact cleanup.
- Direct built CLI authorization denial — PASS: noncanonical and duplicate-key
  files denied with zero branch/worktree/state effect.
- The first direct-CLI receipt wrapper had a PowerShell/JavaScript quoting error
  before Node ran. The corrected wrapper initially named `cli/dist/index.js`
  instead of `cli/dist/src/index.js`; its disposable fixture was removed in
  `finally`. The exact corrected built-entrypoint run then produced all three PASS
  receipts above. These were harness mistakes, not source failures.
- App typecheck — PASS.
- App Vite production build — PASS for main, preload, and renderer bundles.
- Headed `app/tests/concurrency-final.spec.ts` — PASS in about 14 seconds; the exact
  Task 027 fixture was recovered and deleted in `finally`.
- Direct dependency check — PASS. `@anthropic-ai/sdk` is exactly `0.93.0` and
  `npm.cmd install --package-lock-only --ignore-scripts --offline --dry-run
  --workspace core` reported `up to date`; no package download or install occurred.
- Installed SDK hash check — PASS, 7/7 exact planned hashes.
- Built credential-canary scan — PASS, zero matches across built core, CLI, and app
  assets.
- Bounded source/import audit — PASS, zero Agent SDK/native-Claude matches and no
  alternate network destination in the bounded source or built path.
- Protected-state audit — PASS. All 11 immutable hashes matched; one Cairn
  worktree remained; `.git/cairn` was absent; no Task 027 test fixture or Electron
  process remained.
- Disposable live-root preparation — PASS before the incompatibility was known.
  The newly created synthetic repository was clean with one main worktree, 12
  expected synthetic files, zero reparse points, zero owned processes, no
  authorization file, and no coordinator state. No run was admitted.
- The first OS process-inventory probe counted its own PowerShell command because
  that command contained the searched root. The corrected read-only probe excluded
  its own PID and passed with zero owned process. No product file changed.
- Official Anthropic documentation lookup — PASS as a read-only owner-approved
  network action. It established current Haiku 4.5 API pricing of US$1 per million
  input tokens, US$5 per million output tokens, and a 200,000-token context. It
  also established that Claude subscriptions and Claude API/Console access are
  separate. Sources:
  `https://support.claude.com/en/articles/9876003-i-have-a-paid-claude-subscription-pro-max-team-or-enterprise-plans-why-do-i-have-to-pay-separately-to-use-the-claude-api-and-console`,
  `https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan`,
  `https://platform.claude.com/docs/en/about-claude/models/overview`, and
  `https://www.anthropic.com/claude/haiku`.

The current API-rate calculation would have been at most US$0.20032 per task and
US$0.40064 total, inside the approved ceilings. It did not authorize or cause a
call. The subscription incompatibility stopped the task before the four live
approvals were requested.

## Rollback and safety state

The candidate remains disabled, unaccepted, and unactivated. Its implementation
and report form one exact-name local commit that can be reverted by a later
approved task. The direct SDK declaration points to already-installed bytes and
requires no uninstall. No external state or cost requires rollback.

The exact unused disposable proof root was:

`C:\Users\KenJL\AppData\Local\Temp\cairn-task-027-transition-live-proof-prepared-btXrYD`

After this report is committed, that exact task-owned root is deleted under the
brief's rollback checks. No broader temporary directory is touched.

Do not create a Task 027 live authorization file or attempt to reuse/export the
app's Claude Code subscription credential in this broker. A subscription-first
experience needs a new pinned High-Stakes brief that treats official interactive
login, provider-owned credential custody, entitlement/billing mode, cancellation,
logout, error recovery, and a beginner-visible connection state as first-class
boundaries.

## How the owner can inspect it

The candidate's safe local checks can be rerun without credentials:

```text
npm.cmd test --workspace core
npm.cmd test --workspace cli
npm.cmd --prefix app run typecheck
```

Do not attempt its live mode. The mandatory skeptical next step for this stopped
High-Stakes build remains a new chat with:

```text
Review High-Stakes task 027.
```

Milestone movement: **NO**

Disposition: **STOPPED — SUBSCRIPTION_TRANSPORT_INCOMPATIBLE**
