# Task 209 report - strict critic assessment and deterministic policy

**Lane:** A (the main checkout). **Base commit:**
`0f6501e2f3462523cb4f1e55b0256586731cc8b8`.

The brief was claimed alone in commit `10e0844`. This task implements
Prerequisite Q's Task Q2 only. Q3 and owner-verdict Plan 2 remain unstarted.

## What actually changed

Twenty Task 209 paths were touched across the brief-only claim and final task
commit. The critic implementation is a dark Core policy kernel: there is no
App, runtime, provider, repair, candidate-lifecycle, UI, or activation caller.

- `docs/ai-work/tasks/209-brief.md` - the committed task claim and six stable
  checks.
- `core/src/critic.ts` (new) - the versioned Task Spec projection, bounded
  packet and canonical request, strict model-output parser, main-custodied
  assessment, exact owner/native evidence records, canonical hashes, and the
  closed critic policy derivation.
- `core/test/critic.test.ts` (new) - 24 adversarial tests covering packet
  provenance and caps, hostile parsing, canonical custody, all three critic
  modes, judge-specific authority, owner resolution, root grouping,
  comparisons, prompt injection, native boundaries, and every fixture.
- `core/test/fixtures/critic/cant-tell.json` (new) - honest uncertainty.
- `core/test/fixtures/critic/clean-ten-notes.json` (new) - two met promises and
  ten non-blocking Minor/Suggestion preferences.
- `core/test/fixtures/critic/comparison-aa-tie.json` (new) - equal-hash A/A
  abstention.
- `core/test/fixtures/critic/comparison-ab-candidate.json` (new) - semantic
  candidate result presented A-B.
- `core/test/fixtures/critic/comparison-ba-candidate.json` (new) - the same
  semantic result presented B-A.
- `core/test/fixtures/critic/critic-failure.json` (new) - one exact
  critic-judged failure before and after owner confirmation.
- `core/test/fixtures/critic/grouped-root-cause.json` (new) - related findings
  whose authority remains independently resolved.
- `core/test/fixtures/critic/malformed-forged-authority.json` (new) - a forged
  model-authored `blocks` key that must reject.
- `core/test/fixtures/critic/native-boundary-alert.json` (new) - one attributed
  native-boundary alert.
- `core/test/fixtures/critic/native-boundary-all-categories.json` (new) - all
  five and only five closed boundary categories.
- `core/test/fixtures/critic/post-repair-minor.json` (new) - an unpromised Minor
  regression that remains advice.
- `core/test/fixtures/critic/prompt-injection-data.json` (new) - verdict,
  requirement, and command-like text that remains inert observation data.
- `docs/superpowers/evals/critic-v1.md` (new) - the preregistered 12-case
  fixture schedule, exact hashes, bounds, and expected policy results. It says
  explicitly that no provider identity, request hash, result, paid pass, or
  active tuple exists.
- `core/src/index.ts` - exports the new dark Core module.
- `core/package.json` - adds the emitted critic test to the explicit Core
  workspace suite.
- `docs/ai-work/tasks/209-report.md` - this report.
- `docs/ai-work/LOG.md` - one append-only Task 209 row.

The main implementation decisions were:

- Three explicit main trust-boundary constructors detach, deeply freeze, and
  privately WeakMap-bind packet authority, assessment custody, and policy
  authority to the exact branded Task Spec/Evidence Plan/request/assessment
  objects that minted them. The downstream compose/derive functions require
  those exact returned identities; plain records and structural clones are
  powerless even when every visible key and hash is plausible.
- Packet selection accepts only separately supplied main authority with the
  contract's tracked-text provenance flags, project-relative safe paths,
  content hashes, eight-file/8,000-each/32,000-total caps, and one
  collision-free hash-bearing artifact registry. Q8 must derive that context
  from the real selector; a caller-shaped object is not itself proof of Git or
  consent state.
- A nonempty prior-confirmation summary is rejected in Q2. Hash-shaped
  assessment/resolution ids are not provenance, and no main-owned registry
  exists yet to reauthenticate them. The field remains reserved until that
  later custody boundary exists.
- Model output has exactly five top-level keys and no verdict or custody field.
  Private brands and request bindings gate canonical packet/request/output/
  assessment reuse. Main supplies run, round, attempt, hashes, route/model,
  consent, prompt/policy, and time separately.
- A critic `cN` failure can only wait. It becomes a blocker after an exact owner
  resolution binds the run/spec/candidate/assessment/finding/criterion/failure
  condition and the canonical render of every cited artifact,
  counterevidence, and attributed self-check. A repeated root key groups only
  already-independent outcomes for presentation; one resolution never affects
  a sibling.
- Cairn and owner criteria obey only their own separately authenticated
  evidence. Preference rows, severity, confidence, self-check, largest-gap
  choice, issue count, invented scope/expectation, unrelated valid artifacts,
  and model repair prose carry no blocking authority.
- Comparisons bind the frozen reference snapshot, exact candidate/reference
  artifact hashes, both trial artifacts, and each trial's own A/B order.
  Candidate/reference identity never follows the display label; equal hashes
  cannot name a winner, and tie/`cant-tell` remain distinct.
- An unscoped alert has no direct authority. Exact native pass is advisory,
  exact fail uses the native stop reason, and native `cant-tell`, absence, or a
  mismatched receipt stops as `BOUNDARY_EVIDENCE_UNAVAILABLE`. Missing or
  malformed criticism records `CRITIC_UNAVAILABLE`; optional may remain
  policy-clear, required withholds, and off composes no request.
- `state: "clear"` is deliberately documented as policy-clear only, never a
  seal verdict. Q3/main must preflight complete current Cairn/owner `cN`
  evidence and route missing/`cant-tell` required evidence through the existing
  waiting/STOPPED lifecycle before any future seal.

## Checks run and real results

Each result below answers the matching id in `209-brief.md`. Terminal output was
observed in Lane A and is not saved in the repository.

- **`c1` - strict packet and output parsing. PASSED.** Exact-key,
  descriptor-based inspection accepts only ordinary enumerable records and
  dense ordinary arrays, catches hostile reflection, detaches and deeply
  freezes results, requires contiguous declared rows, and enforces the fixed
  row/ref/text/UTF-8-byte caps. Invalid UTF-16, blank meaningful text, hidden or
  accessor fields, symbols, sparse arrays, Proxies, custom prototypes, unknown
  authority keys, unresolved ids/refs, duplicate bodies, malformed hashes,
  `-0` custody, sensitive/generated/dependency paths, and cross-field
  contradictions all fail closed.
- **`c2` - brand and custody. PASSED.** Only branded Task Specs and Evidence
  Plans plus the exact main-minted packet-authority object can compose a
  privately branded canonical request. The packet registry binds every exposed
  artifact id to a SHA-256; request/output brands bind raw output to one
  request; and only exact request-bound main-minted custody can wrap every
  model-output field with run/round/attempt/spec/plan/packet/request/candidate/
  route/model/consent/prompt/policy/time authority. Plain or cloned packet and
  custody objects reject. Output cannot carry `pass`, `fail`, `blocks`,
  disposition, owner verdict, dispatch, edit, or main-authored metadata.
- **`c3` - closed blocker predicate. PASSED.** Authenticated Cairn and owner
  evidence alone control their rows. An exact critic-judged allegation yields
  `waiting-owner` and zero blockers; its exact full-render owner confirmation
  yields one blocker. Dismissal stays advisory and `cant-tell` stays pending.
  Shared roots are grouped only after each member resolves independently.
  Wrong judges, forged authority, preferences, Minor/Suggestion count,
  severity/confidence/self-check, invented scope, failure-condition mismatch,
  and unrelated valid evidence never produce a critic blocker. A plausible
  plain or cloned context containing forged Cairn, owner, resolution, and
  native rows produces zero blockers and zero native stops; only the exact
  detached main-minted policy context can supply those sources.
- **`c4` - comparison, injection, native, and availability behavior. PASSED.**
  A/A cannot select a winner; A-B and B-A bind their own recorded order while
  preserving semantic entities and results; tie and `cant-tell` are distinct.
  Injection text remains data. All five unscoped categories require an exact
  independent native receipt and map pass/fail/cant-tell/missing/mismatch only
  to advisory, native STOPPED, or `BOUNDARY_EVIDENCE_UNAVAILABLE` with zero
  product blockers. Off, optional, required, missing, and malformed critic
  states remain distinct, and required unavailability records
  `CRITIC_UNAVAILABLE` rather than product failure.
- **`c5` - fixtures and preregistration. PASSED.** All 12 checked-in JSON files
  are enumerated by the focused suite, request-bound or deliberately rejected,
  and checked for their expected policy meaning. A separate read-only hash
  check recomputed every file's SHA-256 and found every value in
  `critic-v1.md`; the manifest fixes 12 one-scenario calls under the 16-call
  maximum, 600,000 ms and 262,144 captured UTF-8 bytes per call, text-only,
  no-tools, synthetic/secret-free inputs, and expected outcomes only. Provider,
  model, request fingerprints, billing, results, and activation remain unset.
- **`c6` - full checks, isolation, darkness, and review. PASSED.** Focused and
  full Core checks, whitespace inspection, manifest hashing, production import
  searches, exact diff/status inspection, and two independent final read-only
  reviews passed. Searches found no import or call of the critic APIs outside
  `core/src/critic.ts`, its test, and the index export. Searches for network,
  process, environment, IPC, or UI seams found none; the only provider text is
  bounded assessment custody. The reviewers found and drove repairs for hidden
  descriptors, whitespace and negative-zero aliases, unauthenticated prior
  hashes, sensitive paths, UTF-8 cap drift, comparison/reference substitution,
  root-group authority sharing, missing native receipts, and fixture/schema
  mismatches and plain-record evidence impersonation before reporting no
  remaining Task 209 blocker.

The decisive commands and results were:

```powershell
cd core
npx.cmd tsc -p tsconfig.json --noEmit
npm.cmd run build
node --test dist/test/critic.test.js
# pass; 24 tests, 0 failures

cd ..
npm.cmd test --workspace @cairn/core
# pass; 222 tests, 0 failures

git diff --check
# exit 0; no output

rg -n 'from .*critic|composeCriticRequest|composeCriticAssessment|parseCriticOutput|deriveCriticPolicy' core/src app/src --glob '!core/src/critic.ts' --glob '!core/src/index.ts'
# exit 1; no production import/call matches
```

The full Core command ran outside the restricted process sandbox because the
existing hermetic Windows watchdog tests need to terminate their own fake child
process trees. The final post-hardening rerun exited zero with all 222 tests
passing in 28.1 seconds and
made no product or source change. The first red-first no-emit compile, before
`critic.ts` existed, failed as intended with TS2307 for `./critic.js`.

The final implementation evidence reviewed was:

```text
B35AD65835960199FB8107F2A3C5CBDF997305EA92166540BB6942DC548D4E54  core/src/critic.ts
47AB6E4C9FB72EE3F3AACEAEFF14FB39E2F1040569C597F2683AE9D9B5FA2DC4  core/test/critic.test.ts
1165F324F12B1961FF62CCE16DFFFD897B43B9D34FF64D8087840EA8786D71D7  docs/superpowers/evals/critic-v1.md
```

No dependency/install, network/provider/model call, credential use, app/E2E
run, external write, push, publish, or deployment occurred.

## How to try it

There is intentionally no UI or live route to try yet. A maintainer can rerun
the focused commands above. The new types and pure helpers are exported through
`@cairn/core`, but normal Cairn routing imports none of them and Task 208's
activation registry remains empty.

## Limitations and remaining human judgment

- Q2 is a dark parser/policy kernel. Q3 proposal/preview wiring, the real main
  selector and authenticated-context constructor, provider transport, repairs,
  pending-candidate custody, UI, calibration calls, and activation do not exist
  yet.
- Q8 must derive packet provenance and policy authority from main's real Git,
  consent, run, evidence, and owner-event state. Q2 validates a complete closed
  context but cannot prove that an arbitrary caller is main.
- Prior confirmed findings stay empty until a main-owned registry can
  reauthenticate their assessment and owner-resolution records.
- Policy-clear is not seal-safe. Later orchestration must prove complete
  required evidence before consuming this result.
- The calibration manifest contains no paid results and cannot activate a
  tuple. Exact route/request identity and billing disclosure remain a future
  owner-approved Q10 boundary.
- Owner-verdict Plan 2 has not begun.

**Disposition: DONE**
