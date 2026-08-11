# Task 219 report - synthetic calibration drives the Independent-critic card safely

**Lane:** A (the main checkout). **Base commit:** `186a6b2`.
**Brief claim commit:** `6e6af86`. A protected, unrelated handoff/documentation
commit, `615f8dd`, landed after the claim and was preserved.

## Outcome

Q8 stage 4 is complete. Cairn can now open its real Independent-critic approval
card for one exact row in a closed twelve-fixture synthetic manifest while the
live activation registry is empty. Main derives and displays the fixture,
packet, request, and body identities; approval releases one Core authorization
to an opaque injected fake transport; refusal releases none; and the bounded
raw result, custody, usage, exact request identity, and terminal state are
authenticated and made durable before the next fixture can open.

The synthetic authority is distinct from live/project provenance. It cannot
accept a project candidate, arbitrary packet, selected project file, provider
URL, credential, activation entry, or caller-supplied provenance boolean. It
has no live-provider fallback. Authenticated append-only spend markers make a
sent call non-replayable after restart or state rollback, and task work and
calibration work now exclude each other through canonical project identities.
Quit cancels and drains an approved in-flight fake send under Cairn's existing
grace period; an unapproved card remains memory-only and can be reopened
manually after restart.

Q9 repair, Q10 live calibration/activation, and owner-verdict Plan 2 remain
unstarted. Task 212 on lane G was not touched. No adapter advertises
`packet-only-critic`, and the activation registry remains the empty frozen
literal.

## Files changed

Twenty-eight exact Task 219 paths are in the brief claim and final task commit:

- Task records: `docs/ai-work/tasks/219-brief.md`,
  `docs/ai-work/tasks/219-report.md`, and `docs/ai-work/LOG.md`.
- Calibration implementation and Main integration:
  `app/src/main/criticcalibration.ts`,
  `app/src/main/criticcalibrationfake.ts`,
  `app/src/main/criticapproval.ts`, `app/src/main/main.ts`,
  `app/src/main/rungate.ts`, and `app/src/main/tasks.ts`.
- Shared bridge and visible card integration: `app/src/preload.ts`,
  `app/src/shared/critic-call.ts`, `app/src/shared/critic-call-parse.ts`,
  `app/src/shared/ipc.ts`, `app/src/renderer/components/CriticCall.tsx`,
  `app/src/renderer/screens/Chat.tsx`, and
  `app/src/renderer/screens/TaskRun.tsx`.
- Core synthetic authority and tests: `core/src/critic.ts` and
  `core/test/critic.test.ts`.
- App unit and desktop evidence: `app/tests-unit/criticcalibration.test.ts`,
  `app/tests-unit/criticapproval.test.ts`,
  `app/tests-unit/criticcallpaper.test.ts`,
  `app/tests-unit/pendingboot.test.ts`,
  `app/tests-unit/pendinggates.test.ts`,
  `app/tests-unit/rungate.test.ts`,
  `app/tests/critic-calibration.spec.ts`, and `app/lab/mock-cairn.ts`.
- Preregistered evidence and plan status:
  `docs/superpowers/evals/critic-v1.md` and
  `docs/superpowers/plans/2026-08-07-cairn-quality-intent-and-critic-prerequisite.md`.

No dependency, live route, provider key, activation writer, or project-file
selector was added.

## Independent review and repair

Three owner-approved adversarial reviews examined evidence integrity,
lifecycle/restart behaviour, and authority/security boundaries. Their concrete
findings were reproduced and repaired inside this task. The material repairs
included:

- replacing replayable mutable state with authenticated append-only one-use
  spend markers and honest interrupted-send recovery;
- making task/calibration exclusion canonical and bidirectional, rejecting
  profile/project overlap, and preserving exact approval ownership across
  replacement and cancellation;
- replacing caller-selected fake mode and nullable `fetch` injection with a
  module-private opaque fake-transport token that has no global-fetch fallback;
- separating synthetic Core authority from fabricated filesystem/Git
  provenance and keeping expected evaluator policy out of the request;
- binding all twelve output projections to the exact request identities,
  preserving raw invalid output, custody, usage, and an honest null provider
  status, and retaining distinct C10/C11 boundary evidence;
- showing the manifest, fixture position, full fixture/packet/request/body
  hashes, exact synthetic text, and the truthful one-attempt limit on the real
  card;
- adding invocation receipts for duplicate-send detection, visible refusal
  feedback, lifecycle drain, and regression checks for stale/replaced cards.

Each reviewer re-audited the repaired tree. The final security, lifecycle, and
evidence reviews reported no remaining concrete Critical, Major, or Minor
defect in Task 219's c1-c6 boundary.

## Verification

### `c1` - exact closed fixture only: PASSED

The twelve-row manifest and runtime parsers reject unknown, duplicated,
missing, mismatched, cloned, accessor-backed, proxied, or extra-key inputs.
The final manifest SHA-256 is
`e5d321c74506bf70ded87baf9492c6bcae68de1781fbc35a1d0da7aad4bffda8`.
The Core and App calibration tests exercise every row and the malformed C12
case against its exact request.

### `c2` - truthful packet boundary: PASSED

Core constructs the path-free synthetic packet and exact request internally;
the evaluator-only policy and output projection never enter the provider
request. The unit suite proves the fixed system message, one canonical packet
message, explicit generation parameters, no tools/functions/history, exact
metadata counts, and denial of project paths, credential-like material,
dependencies, generated areas, redirects, and wider content. The real card
renders the full manifest and per-call identities plus the exact synthetic
input.

### `c3` - one decision, at most one fake send: PASSED

Approval id, canonical echoed disclosure, live held disclosure object, and the
exact pending Core authorization are checked before the fake-send boundary.
Decline, malformed, mismatched, cross-project, stale, replayed, concurrent,
cancelled, and replaced decisions send zero times and cannot consume or clear
an independently owned current approval. The fake's append-style receipt lets
the desktop test assert its invocation count does not change on stale paths.

### `c4` - durable ordered restart-safe state: PASSED

Authenticated terminal records retain fixture/route/request identity, bounded
raw output, custody, and usage before another open. Append-only authenticated
spend markers refuse rollback replay. Restart does not auto-send; a durable
`sending` marker recovers to an honest unavailable terminal with unknown
completion/status and never retries. Torn, forged, or worker-writable state
fails closed without deleting recoverable evidence.

### `c5` - no activation or live/project-data reach: PASSED

The calibration API has no activation writer, candidate input, project
selector, credential source, process primitive, or live network primitive.
Only the module-private injected fake token can cross the send boundary.
Tests assert zero activation before, during, after, across restart, and on all
terminal paths. Synthetic output cannot mint normal critic custody or advertise
task capability.

### `c6` - desktop journey and complete regression evidence: PASSED

The exact commands and observed results were:

- Repository root: `npm.cmd test`. Its complete Core workspace leg built and
  ran **385 tests: 375 passed, 10 documented platform skips, 0 failed** in
  1,613.6 seconds. The aggregate then exited 1 only when the unrelated CLI
  workspace reached pre-existing TypeScript overload errors at
  `cli/test/task.test.ts:111` and `:119`; protected commit `615f8dd` already
  records that red state, and Task 219 changes no CLI path.
- `app`: `npm.cmd run test:unit` - **760 tests: 758 passed, 2 documented Windows
  skips, 0 failed**.
- `app`: `npm.cmd run typecheck` - passed after the final assertions.
- `app`: `npm.cmd run build:vite` - passed for Main, preload, and renderer.
- `app`: `npm.cmd run build:lab` - passed.
- `app`: `npx.cmd tsc -p tsconfig.unit.json; if ($LASTEXITCODE -eq 0) {
  node --test dist-unit/tests-unit/criticapproval.test.js
  dist-unit/tests-unit/criticcalibration.test.js
  dist-unit/tests-unit/pendinggates.test.js
  dist-unit/tests-unit/rungate.test.js }` - **41/41 passed** in the final
  security re-audit; the focused calibration run was **16/16**.
- Repository root: `git diff --check` - passed.

The first Vite/lab build attempt was refused only because the desktop sandbox
could not read a configuration dependency above the working directory. The
identical build commands passed after granting workspace-read access; no code
or dependency repair was involved.

Immediately before Electron, the owner confirmed Cairn was closed. Preflight
found zero Cairn/Electron processes and both app-token directories absent. The
guard acquired `app/.app-token` and the isolated-profile token
`C:\Users\KenJL\AppData\Local\Temp\cairn-app-token`, then ran from `app`:

`.\node_modules\.bin\playwright.cmd test tests/critic-calibration.spec.ts --workers=1`

The fake-only approve/decline/stale/cancellation/restart/packet-boundary journey
passed **1/1** in 8.0 seconds (7.6 seconds in the scenario). The guard released
both tokens in `finally`; postflight again found both absent and zero
Cairn/Electron processes. An initial wrapper attempt used an unsupported
`New-Item -LiteralPath` parameter and stopped before acquiring a token or
starting a process; the corrected exact-path wrapper then produced the passing
result above.

No real provider, network, credential, paid call, project data, external
write, dependency installation, activation, push, publication, or deployment
was used.

## How to try it

This is deliberately a calibration/test route, not a normal production
button. A maintainer can close Cairn, confirm the shared profile is unused,
acquire both app-token locks, and rerun the single Playwright command above.
The window shows the real Independent-critic card and the test checks the
durable isolated-profile receipts. Ordinary task routing remains dark because
activation is empty.

## Limitations and honest boundaries

- This completes Q8 stage 4, not Q10's live calibration or activation. It
  produces no accepted evaluator result and changes no activation entry.
- The Electron fake deliberately returns `{}`. Cairn records
  `CRITIC_CALIBRATION_OUTPUT_INVALID` together with bounded raw output, custody,
  and usage, which proves the unavailable-result path rather than critic
  quality.
- After a durable send marker, process interruption cannot prove whether the
  remote side completed. Recovery therefore records completion and provider
  status as unknown and never retries.
- The fake boundary does not retain an actual HTTP status, so
  `providerStatus` is honestly `null`; this is asserted immediately, after
  restart, and in Electron.
- The repository-wide aggregate remains red only on the pre-existing unrelated
  CLI overload errors documented by `615f8dd`; the complete Core suite and all
  Task 219 App evidence passed.

**Disposition: DONE**
