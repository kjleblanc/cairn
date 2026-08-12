# Task 220 report - one approved repair and one final critic round

**Lane:** A (the main checkout). **Base commit:** `0bb5a23`.
**Brief claim commit:** `951e89d`. Task 212's completed lane-G work and the
unrelated CLI overload state recorded before this task were preserved.

## Outcome

Q9 is complete. A current original required-check blocker can reach a repair
only after the owner makes a distinct authenticated confirmation and then
approves the exact Builder repair card. Cairn permits one repair, re-runs every
frozen original `cN`, and shows a fresh exact approval for a final critic only
when the Task Spec's frozen mode requires or offers it. Advisory output and a
dismissed allegation never open repair. Critic text, renderer echoes, project
files, and self-hashed pending bytes cannot become instruction or authority.

The terminal path is honest and bounded by policy: one repair, at most three
critic calls total, and at most one unavailable-call retry. DONE requires
complete evidence, a current completion authority, and an exact seal. Repair
decline, required-critic refusal, exhaustion, native boundary stops, incomplete
evidence, and post-repair regression produce a specific owner-readable STOP
cause. Both candidate rounds,
Evidence Plan versions, counters, decisions, approvals, and terminal
preparation survive restart without auto-send, cap reset, duplicate records,
duplicate result card, or duplicate commit.

The whole Q9 route remains injected, fake-only, and offline. Normal routing has
no activation tuple. Guarded Q9 boot suppresses the phone bridge and external
update check; no provider key, billable call, network transport, dependency,
external write, push, publication, or deployment was used.

## Files changed

The final Task 220 commit contains 74 implementation/test paths plus this
report, the Task 220 log row, and the Q9 plan status. The brief remains in its
own claim commit.

- Core implementation: `core/src/candidate.ts`, `core/src/codex.ts`,
  `core/src/critic.ts`, `core/src/index.ts`, `core/src/quality.ts`,
  `core/src/records.ts`, `core/src/routing.ts`, `core/src/serial.ts`,
  `core/src/candidate-seal-internal.ts`,
  `core/src/critic-assessment-internal.ts`,
  `core/src/critic-call-internal.ts`,
  `core/src/critic-completion-internal.ts`,
  `core/src/critic-prior-findings-internal.ts`, `core/src/main-pending.ts`,
  `core/src/pending-journal-auth-internal.ts`, and
  `core/src/pending-restore-internal.ts`.
- Core tests: `core/test/candidate.test.ts`, `core/test/critic.test.ts`,
  `core/test/records.test.ts`, and `core/test/serial.test.ts`.
- Main and private recovery bridge: `app/internal/main-pending.d.ts`,
  `app/internal/main-pending.js`, `app/src/main/conductor/relay.ts`,
  `app/src/main/conductor/service.ts`, `app/src/main/conductor/store.ts`,
  `app/src/main/criticapproval.ts`, `app/src/main/harnessapproval.ts`,
  `app/src/main/ipc.ts`, `app/src/main/main.ts`,
  `app/src/main/ownercheck.ts`, `app/src/main/pendingcandidate.ts`,
  `app/src/main/pendingrun.ts`, `app/src/main/q9fake.ts`,
  `app/src/main/qualityloop.ts`, `app/src/main/repairapproval.ts`, and
  `app/src/main/tasks.ts`.
- Shared bridge and parsers: `app/src/preload.ts`,
  `app/src/shared/critic-call-parse.ts`, `app/src/shared/critic-call.ts`,
  `app/src/shared/harness-revision.ts`, `app/src/shared/ipc.ts`,
  `app/src/shared/repair-call-parse.ts`, `app/src/shared/repair-call.ts`,
  `app/src/shared/stopwords.ts`, and `app/src/shared/task-review.ts`.
- Renderer surfaces: `app/src/renderer/components/CriticCall.tsx`,
  `app/src/renderer/components/HarnessRevision.tsx`,
  `app/src/renderer/components/RepairCall.tsx`,
  `app/src/renderer/components/TaskReview.tsx`,
  `app/src/renderer/screens/Chat.tsx`, and
  `app/src/renderer/screens/TaskRun.tsx`.
- Harness/package integration: `app/lab/mock-cairn.ts` and
  `app/package.json`.
- App unit evidence: `app/tests-unit/critic-call-fixture.ts`,
  `app/tests-unit/criticapproval.test.ts`,
  `app/tests-unit/criticcalibration.test.ts`,
  `app/tests-unit/criticcallpaper.test.ts`,
  `app/tests-unit/harnessrevisionpaper.test.ts`,
  `app/tests-unit/ownercheck.test.ts`, `app/tests-unit/pendingboot.test.ts`,
  `app/tests-unit/pendingcandidate.integration.test.ts`,
  `app/tests-unit/pendingcandidate.test.ts`,
  `app/tests-unit/pendinggates.test.ts`, `app/tests-unit/pendingrun.test.ts`,
  `app/tests-unit/pendingworkflow.test.ts`, `app/tests-unit/q9fake.test.ts`,
  `app/tests-unit/qualityloop.test.ts`,
  `app/tests-unit/repairapproval.test.ts`,
  `app/tests-unit/repaircallpaper.test.ts`,
  `app/tests-unit/resultcard.test.ts`, `app/tests-unit/runpaper.test.ts`,
  `app/tests-unit/stopwords.test.ts`, and
  `app/tests-unit/taskreviewpaper.test.ts`.
- Guarded desktop evidence: `app/tests/q9.spec.ts`.
- Records/status: this report, `docs/ai-work/LOG.md`, and
  `docs/superpowers/plans/2026-08-07-cairn-quality-intent-and-critic-prerequisite.md`.

No dependency or normal-route activation was added.

## Independent review and repair

At least three independent adversarial reviews examined Core authority, Main
lifecycle/restart behavior, desktop evidence, and the final result-card wire
shape. Concrete findings were reproduced and repaired inside this task. After
the repairs, the final authority, lifecycle, desktop, and card-schema reviews
reported no remaining concrete defect inside Task 220's boundary. The material
repairs included:

- one-way Q9 activation that closes legacy transition, raw repair, and seal
  bypasses, including stripped/rehashed pending capsules and prepared terminal
  reconstruction;
- an App-private, HMAC-journal-authenticated, exact-tuple, one-use pending
  recovery bridge, while the public Core package refuses authority-bearing Q9
  recovery and exposes no internal restorer;
- exact attempt/candidate/round/policy-context joins, same-round retry lineage,
  one unavailable retry, one repair, stale decision refusal, and process-crash
  settlement without automatic send;
- separate owner confirmation for Cairn-judged failures, replay-proof nonce and
  receipt handling, mixed owner/Cairn/critic ordering, inert durable
  confirmation bytes, and deterministic STOP across the pre-checkpoint crash
  gap;
- exact carried round-one prior findings, immutable reference identities,
  authenticated dismissal completion, and a narrow owner-approved harness
  revision/rerun with both plans and the failed evidence retained;
- actual-result-bound terminal cards, authenticated physical JSONL delivery,
  restart-safe outbox/commentary claiming, offline result visibility, specific
  STOP wording, and current-card support for mixed owner/critic and adapter
  evidence without weakening legacy cards;
- deterministic internal Git commit identity independent of missing or hostile
  ambient configuration, and hard-cut callbacks that stop JavaScript before a
  fake send or terminal effect;
- suppression of the phone bridge and external update fetch under the exact Q9
  guard, plus global task serialization and truthful cancellation refusal.

The final card-schema audit found no remaining defect. The final static audit
found one stale 30-second Playwright click and an outer timeout too small for
the heavy revision journey on this Windows host; both were corrected and the
affected journeys then passed 3/3 before the complete matrix passed 17/17.

## Verification

### `c1` - only a confirmed original blocker can authorize one repair: PASSED

Core brands the exact current original `cN`, frozen failure condition, evidence
refs, candidate, round, run, plan, and owner action. Main journals confirmation
before it composes the separate repair card. Dismissed, cant-tell, advisory,
stale, replayed, cross-context, renderer-authored, and unconfirmed inputs cannot
mint repair. The guarded Cairn-blocker journey visibly requires confirmation,
then a distinct repair approval, and records exactly one Builder invocation.

### `c2` - round custody and rubric stay immutable: PASSED

Round zero and round one retain distinct candidate/bundle/call identities while
Task Spec, original `cN` set, failure conditions, and declared reference hashes
remain frozen. The final critic packet carries exact prior confirmed findings.
Owner-judged checks return to an owner action after repair. A changed original
check STOPs; unrelated advice does not become a blocker.

### `c3` - exact repair and critic caps with separate approvals: PASSED

Core and the authenticated journal enforce one repair, three critic calls total,
and one same-candidate unavailable retry. Every call has a fresh request,
authorization, disclosure, decision, reservation, and receipt. The Electron
matrix proves initial/final approvals, optional decline, a successful retry,
two-unavailable exhaustion with no third card, and both after-reserve and
after-send restart cuts without auto-send or duplicate receipt.

### `c4` - restart cannot reset authority: PASSED

The HMAC journal, profile high-water/inventory chain, exact capsule binding, and
private Core token preserve counters, decisions, both bundles, evidence-plan
custody, and terminal preparation. Reserved/sending work becomes interrupted;
critic crash settlement runs once without send, interrupted repair is STOP-only,
and terminal cards/records/commits are reconciled exactly once. Forged, torn,
replayed, stripped, cross-run, and public-package restore attempts fail closed.

### `c5` - honest outcomes and narrow harness repair: PASSED

DONE requires completion and seal authority plus exact original-check evidence.
Repair, required-critic, or harness-correction refusal; retry exhaustion;
native stop; incomplete evidence; and an original post-repair failure expose
distinct plain-language terminal causes. Optional critic decline remains an
eligible DONE route rather than becoming a hidden gate.
The harness revision accepts only the preregistered timeout correction, keeps
revision zero and one plus failed evidence, reruns the exact original checks,
and reaches DONE; refusal stays revision zero and STOPs once. Both critic-off
controls—one owner-judged blocker and one Cairn-judged blocker—reached DONE
after exactly one Builder receipt and zero critic receipts.

### `c6` - dark, offline, authority-separated: PASSED

Activation remains empty and ordinary tasks cannot advertise or reach the Q9
critic/repair routes. The exact guard requires Electron/test context plus
`CAIRN_E2E=CAIRN_MOCK=CAIRN_TEST_Q9=1`; routes use injected no-network/no-key/
no-charge dependencies. Q9 boot suppresses the phone bridge and update fetch.
No critic prose becomes Builder instruction and no renderer/project payload
crosses an authority boundary.

### `c7` - complete regression and real desktop evidence: PASSED

The exact commands and observed results were:

- `core`: `npm.cmd test` - **411 tests: 401 passed, 10 documented Windows
  skips, 0 failed** in 1,452.5 seconds. Core was unchanged after this complete
  run; later repairs were App/test-only.
- `app`: `npm.cmd run test:unit` - **829 tests: 827 passed, 2 documented
  Windows skips, 0 failed** in 468.7 seconds.
- `app`: `npm.cmd run typecheck` - passed.
- `app`: `.\node_modules\.bin\tsc.cmd -p tsconfig.unit.json` - passed after
  the final Electron-spec timeout adjustment.
- `app`: `npm.cmd run build:vite` - passed: Main 103 modules, preload 1, and
  renderer 77.
- `app`: `npm.cmd run build:lab` - passed with 101 modules.
- `app`: `node --test dist-unit/tests-unit/resultcard.test.js` - **30/30
  passed**, including current mixed owner/adapter DONE, legacy compatibility,
  malformed flags, and restart-exact delivery.
- Repository root: `git diff --check` - passed.

Immediately before Electron, the owner confirmed Cairn was closed. Preflight
found both app-token directories absent and zero Cairn/Electron processes. The
lane acquired `app/.app-token` and
`C:\Users\KenJL\AppData\Local\Temp\cairn-app-token`, then ran from `app`:

`node .\node_modules\@playwright\test\cli.js test tests/q9.spec.ts --workers=1 --reporter=line`

The final current-source, fake-only, isolated-profile matrix passed **17/17**
in 12.3 minutes: thirteen lifecycle scenarios, after-reserve and after-send
restart cuts, and DONE/STOP terminal-preparation cuts. The `finally` guard
released both tokens; postflight reported both absent and zero Cairn/Electron
processes.

An earlier matrix run was kept as repair evidence rather than hidden. It passed
14/17 and exposed two stale 30-second post-restart click budgets plus a five-
minute outer timeout that expired after the heavy harness revision had already
created its exact DONE commit/card. The repaired three cases passed, then the
complete matrix passed as stated above.

## How to try it

Q9 is deliberately not a normal production route. A maintainer can close
Cairn, ensure the shared profile is unused, acquire both app-token directories,
and run the guarded Playwright command above from `app`. The real Task Review,
critic, repair, harness-revision, STOP-cause, restart, and result-card surfaces
appear against isolated local fixtures. Ordinary routing remains dark until a
separate Q10 task and owner approval.

## Limitations and honest boundaries

- This completes Q9, not Q10 live calibration/activation and not owner-verdict
  Plan 2. No accepted live evaluator result or activation entry exists.
- Canonical Cairn-confirmation bytes are durable audit evidence, not replay
  authority. A crash after the confirmed decision but before the awaiting-
  repair checkpoint therefore STOPs deterministically without re-card or send.
- A first harness-revision Electron run observed one unusually slow internal
  `git commit-tree` child (about four minutes); it nevertheless produced the
  exact DONE commit/card and the final full matrix completed normally. Git
  command-timeout hardening is not added here because it is a shared terminal
  transaction change beyond Q9's repair/critic authority scope.
- The current-card `adapterAttested` flag is output-only. It permits an honest
  mixed owner/critic-plus-adapter DONE projection but cannot mint completion;
  legacy cards retain their prior all-adapter-attested rule.
- No push was requested or performed. The project milestone did not move.

**Disposition: DONE**
