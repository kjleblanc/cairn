# Task 211 report - Task-Spec-bound worker evidence and records, dark

**Lane:** A (the main checkout). **Base commit:**
`da37d9f135914660197295f94626673bb40ff477`.

The brief was claimed alone in commit `9572220`. This task implements
Prerequisite Q's Task Q4 only. Q5 and owner-verdict Plan 2 remain unstarted.

## What actually changed

Twenty-three Task 211 paths were touched across the brief-only claim and final
task commit:

- `docs/ai-work/tasks/211-brief.md` - the committed task claim and six stable
  checks.
- `core/src/routing.ts` - preserves the live `cairn-serial-task/v3` and
  `worker-result/v2` shapes, and adds the staged Task-Spec-bound v4/v3 shapes,
  strict hash/exit-only process-event bundles, and internal adapter capability
  matching.
- `core/src/claims.ts` - adds exact Task-Spec worker claims bound to one frozen
  Task Spec hash and the complete ordered `cN`/`pN` vocabulary.
- `core/src/codex.ts` - binds disclosure, authorization, prompt, request, and
  result to the branded Task Spec and Evidence Plan, retains only opaque
  command hashes/exits, and refuses substituted review data before spawn.
- `core/src/kimi.ts` - makes the existing Windows timeout/cancel tree-kill
  result honest: only a successful whole-tree kill is confirmed; a direct
  shim fallback remains unconfirmed.
- `core/src/serial.ts` - adds Main's branded Q4 authority mint, the separate
  `cN`/advisory-`pN` worker brief, exact v4 routing/result validation, complete
  planned-event matching, and hash-bound v4 close records while leaving legacy
  composed result bytes unchanged.
- `core/src/records.ts` - adds the branded Task Spec run-record mint,
  classification, and report rendering with required promises, advisory
  preferences, adapter execution facts, worker claims, and Cairn's envelope
  result kept structurally separate.
- `core/test/claims.test.ts`, `core/test/codex.test.ts`,
  `core/test/kimi.test.ts`, `core/test/records.test.ts`,
  `core/test/routing.test.ts`, and `core/test/serial.test.ts` - cover strict
  version/hash/id custody, hostile shapes, adapter eligibility, process-event
  completeness, false-DONE attempts, legacy serialization, and process cleanup.
- `app/src/main/adapters.ts` - stages an optional quality-bound authorization
  input; Codex remains opaque-only and Kimi receives no Q4 authorization or
  canonical capability.
- `app/src/main/evidence.ts` - adds Main's branded reduction from exact
  canonical command hashes/exits to only their predeclared `cN`, without
  executing or retaining command text.
- `app/src/shared/ipc.ts` - adds an optional output-only Task Spec result
  projection for cards; no route/run input gains Task Spec authority.
- `app/src/main/conductor/relay.ts` - projects the Core v4 record into the card
  and conductor briefing with verified bindings, unverified worker claims, and
  the separate envelope result under different labels. Legacy card objects and
  briefing bytes remain unchanged when the projection is absent.
- `app/src/main/conductor/store.ts` - strictly validates and cross-binds the
  optional durable projection, including complete `cN`/sequence/claim custody
  for DONE while retaining partial evidence honestly on STOPPED.
- `app/tests-unit/evidence.test.ts`, `app/tests-unit/kimi-wiring.test.ts`, and
  `app/tests-unit/resultcard.test.ts` - prove Main derivation, adapter
  ineligibility, detached card data, legacy compatibility, hostile persistence,
  and the separate briefing vocabulary.
- `docs/ai-work/tasks/211-report.md` - this report.
- `docs/ai-work/LOG.md` - one append-only Task 211 row.

The main implementation decisions were:

- The new worker contract is a discriminated staged v4 path beside the exact
  legacy v3 path. Task 210's production caller still passes only the existing
  branded intent, so no live response or IPC object gains a new `null` or
  optional field merely because Q4 exists.
- Main alone maps a process event to a criterion. An adapter event contains
  only a dense sequence, a command SHA-256, and an exit code. It cannot name a
  `cN`, artifact, source, status, critic finding, verdict, seal, disposition,
  or raw command.
- Q4 accepts only a branded Evidence Plan whose every required row is one
  unique canonical adapter-command attestation. Current Codex reports an
  explicitly opaque provider representation and Kimi reports none, so both are
  ineligible for this staged exact-command route. Fakes prove the contract
  without claiming current provider support.
- A v4 DONE is total: the process-event set must equal the frozen command set;
  every command must appear once with a contiguous retained sequence and an
  expected exit; Task-Spec claims must exist and say DONE; the plan must contain
  no unsupported evidence kind; and the Task Spec must not require the critic
  Q4 does not run. Extra, missing, duplicate, ambiguous, gapped, or wrong-exit
  events cannot disappear on the way to DONE. STOPPED records may retain
  partial or failed facts honestly.
- A successful exit proves only that exact predeclared command ran and returned
  that code. Worker `cN`/`pN` answers remain claims, preferences remain advisory,
  and Cairn's envelope result remains a different fact. Q4 creates no critic
  authority and every new record/card explicitly says `criticReady: false`.
- The durable card repeats the Core record's safe DONE invariants because the
  project-owned JSONL is a structural boundary. It carries only detached output
  data and is accepted as Cairn-authored only through the existing external
  card marker; renderer input still cannot create authority.
- Full verification exposed pre-existing Windows fake-helper leaks in both
  Codex and Kimi timeout/cancel tests. Their production tree-kill helpers now
  wait for the real `taskkill` outcome: exit zero confirms the whole tree;
  spawn failure, nonzero exit, direct-shim fallback, or force-settle stays
  unconfirmed so the existing orphan/run-lock protection is not weakened.

## Checks run and real results

Each result below answers the matching id in `211-brief.md`. Terminal output was
observed in Lane A and is not saved in the repository.

- **`c1` - Task Spec custody across the worker envelope. PASSED.** The v4
  contract, Codex disclosure/authorization/request, worker result, Task-Spec
  claims, run record, and card carry and recheck the exact request, Task Spec,
  and Evidence Plan hashes applicable to that layer. Branded Task Spec and
  Evidence Plan identity is recomputed before routing, prompt composition,
  process spawn, result acceptance, and record minting. Missing/wrong hashes,
  same-intent different specs, substituted reviews, structural clones, v2
  results, and unbranded records fail closed.
- **`c2` - source-honest brief and result vocabulary. PASSED.** The v4 brief
  renders every exact required `cN`, then a separately labelled advisory `pN`
  section. The strict claims fence, branded record, report, output-only card,
  and conductor briefing preserve the same ordered ids. Worker assertions are
  labelled unverified, `pN` never becomes a DONE gate, and Cairn's envelope
  result is rendered under its own heading.
- **`c3` - authenticated command-event evidence. PASSED.** Only a complete
  canonical adapter stream whose exact unique command-hash set equals the
  frozen Evidence Plan can produce attestations. Tests reject forged claims,
  missing/wrong/duplicate/extra events, duplicate planned hashes, changed or
  unexpected exits, incomplete/gapped sequences, unrelated successful
  commands, unsupported procedures, and direct-record false-DONE attempts.
  Main derives every `cN` and artifact reference from the branded plan and
  never executes evidence prose.
- **`c4` - adapter eligibility and authority separation. PASSED.** Routing
  requires the exact internal canonical event representation for Q4. A
  Kimi-like adapter with no support and today's opaque-only Codex are excluded;
  a compatible fake completes the route. Exact-key parsers reject
  worker-authored criterion/envelope/critic/verdict fields, and the report/card
  keep adapter facts, worker claims, and Cairn's envelope result in distinct
  structures. A required critic is refused before worker spawn.
- **`c5` - records and compatibility. PASSED.** The record mint requires
  branded upstream authority and a total DONE relationship across plan,
  commands, exits, claims, and sequences. Plain copies classify invalid and all
  Q4 records remain not critic-ready. Legacy record/report/card paths still
  load under their historical schema, omit `taskSpecRunRecord` entirely rather
  than adding `null`, and cannot be upgraded by structural resemblance.
- **`c6` - verified isolation and regression safety. PASSED.** The final Core
  command passed 253/253. App typecheck passed; the complete App unit run
  reported 632 tests: 630 passed, 0 failed, and the same 2 Windows-only cases
  skipped. Main, preload, and renderer production bundles built. Focused final
  runs passed records 16/16, serial Q4 19/19, Codex 22/22, Kimi 32/32, and App
  result-card 25/25. `git diff --check`, exact status/diff inspection, darkness
  searches, and two independent final audits passed with no blocker.

The decisive commands and final results were:

```powershell
cd core
npm.cmd exec tsc -- --noEmit
# pass

npm.cmd test
# pass; 253 tests, 253 passed, 0 failed

cd ..\app
npm.cmd run typecheck
# pass

npm.cmd run test:unit
# pass; 632 total, 630 passed, 2 platform skips, 0 failed

npm.cmd run build:vite
# pass; Main, preload, and renderer production bundles built

cd ..
git diff --check
# exit 0; no output

rg -n 'CALIBRATED_ACTIVATION_LITERALS|QUALITY_PREVIEW_ACTIVATION_IDENTITY|taskSpecAuthority|reduceAdapterCommandEvidence' `
  app/src/main/criticactivation.ts app/src/main/tasks.ts `
  app/src/main/conductor/service.ts app/src/main/evidence.ts core/src/serial.ts
# registry remains empty; both staged activation identities remain literal
# null; tasks.ts has no taskSpecAuthority/reducer caller
```

The first combined Core attempts exposed idle Windows test helpers after all
Codex or Kimi TAP cases had printed. Focused diagnosis repaired the real
nonzero-`taskkill` handling and hermetic helper cleanup; final unfiltered Codex
and Kimi runs exited normally with no new process left behind, and the normal
`npm.cmd test` command then passed all 253 tests in 46.8 seconds. The first App
Vite attempt could not read the repository path through the restricted
filesystem view; the required rerun used the same local build command with
filesystem elevation, exited zero, and made no tracked source change.

No dependency/install, provider/model/network call, credential use, real app or
E2E run, external write, push, publish, or deployment occurred.

## How to try it

There is intentionally no visible production change yet. Opening Cairn still
uses Task 210's v8 proposal and intent-only worker route because the critic
activation registry is empty and `tasks.ts` supplies no Q4 authority. A
maintainer can safely run the Core and App commands above. The fake v4 tests
show the same branded Task Spec and ids reaching the worker, record, and card
without contacting a provider.

## Limitations and remaining human judgment

- Q4 is deliberately dark. No current production adapter claims canonical
  Evidence Plan command-event compatibility; Codex is opaque-only and Kimi is
  ineligible. Enabling a real adapter requires an authenticated exact command
  representation, not a feature flag or a hash of display prose.
- An exact expected command exit is execution provenance, not proof that the
  test was well chosen or that a product promise is true. Q4 preserves that
  distinction; Q6 owns candidate-versus-seal lifecycle and later evidence
  completeness.
- Required-critic tasks stop before this Q4 worker route because Q8 owns the
  packet-only critic call. Optional/off Task Specs may use the staged fake path,
  but no critic assessment or policy result is created here.
- Q5 still owns carrying Task Spec evidence state and owner observations through
  both owner-facing run surfaces. No renderer or preload authority input was
  added in this task.
- The task intentionally used fake/unit/build checks only, not the real shared
  app/E2E profile.
- Owner-verdict Plan 2 has not begun.

**Disposition: DONE**
