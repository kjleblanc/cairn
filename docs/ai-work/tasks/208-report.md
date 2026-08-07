# Task 208 report - frozen Quality Plan kernel, with critic activation empty

**Lane:** A (the main checkout). **Base commit:**
`2f71bc75b5220751b793835c4eb79d7ac7dedf9f`.

The brief was claimed alone in commit `d334c46`. This task implements
Prerequisite Q's Task Q1 only. Q2 and owner-verdict Plan 2 remain unstarted.

## What actually changed

Nine Task 208 paths were touched across the brief-only claim and final task
commit. There is no live runtime consumer of the new Core API or activation
evaluator.

- `docs/ai-work/tasks/208-brief.md` - the committed task claim and its six
  stable checks.
- `core/src/quality.ts` (new) - strict Quality Plan parsing; authenticated
  intent/contract binding; branded, deeply frozen and canonical `TaskSpecV1`;
  its fixed call budget and output-only review projection; and a branded,
  hash-bound Evidence Plan with one typed mechanical revision.
- `core/test/quality.test.ts` (new) - 13 adversarial tests for strict parsing,
  provenance, reverse coverage, critic modes, references, canonical custody,
  review projection, fixed budgets, evidence plans, and exact revision
  authorization.
- `core/src/index.ts` - exports the new Core module.
- `core/package.json` - adds the emitted Quality test to the explicit Core
  workspace suite.
- `app/src/main/criticactivation.ts` (new) - a strict future activation
  identity and fingerprint evaluator backed by a private, immutable, empty
  calibrated-tuple collection.
- `app/tests-unit/criticactivation.test.ts` (new) - seven tests proving the
  registry stays inactive, rejects hostile or widened identities, binds every
  fingerprint constituent, and has no runtime caller or mutation seam.
- `docs/ai-work/tasks/208-report.md` - this report.
- `docs/ai-work/LOG.md` - one append-only Task 208 row.

Four implementation decisions close gaps between the design prose and a
mechanically enforceable kernel:

- Contract-backed authority is accepted only with a section name plus its
  authenticated SHA-256, supplied separately to the binder.
- Because Q1's comparison schema has no closed deterministic-method field,
  every comparison `cN` is conservatively owner-judged. A task with no
  comparison may correctly carry zero candidate states.
- Evidence commands separate executable, arguments, fixtures, parser mode,
  assertion, and content digests. Path repair preserves the executable or
  fixture digest, and parser repair stays inside a closed parser family; an
  easier assertion or new executable/data identity cannot be called
  mechanical.
- A revision authorization is compared against a separately supplied
  main-authenticated context carrying the exact run, Task Spec, criterion,
  before/after/unchanged hashes, change kind, failure, ordered evidence, owner
  nonce, and time. This rejects cross-run and mix-and-match replay before the
  revised plan receives its private brand.

## Checks run and real results

Each result below answers the matching id in `208-brief.md`. Terminal output was
observed in Lane A and is not saved in the repository.

- **`c1` - strict candidate parser and limits. PASSED.** Exact-key,
  descriptor-based parsing accepts only ordinary records and dense ordinary
  arrays, copies accepted values, and freezes the complete result. Fixed caps,
  safe UTF-16, bounded text, contiguous `cN`/`pN`, duplicate checks, structured
  target/state/reference relationships, and the closed vague-promise rule are
  covered. Accessors, Proxies (including revoked and nested), symbols,
  non-enumerable extras, custom prototypes, sparse/extended arrays, unsafe
  controls, malformed ids, and `production-activation` fail closed without
  executing caller code.
- **`c2` - source authority and coverage. PASSED.** Binding requires an
  existing privately branded `TaskIntent` with an owner-stated outcome. Every
  `cN` resolves only to an owner-stated row or authenticated contract-section
  digest; coverage is checked in both directions for the outcome and every
  owner-stated requirement. The supported path maps to exactly one Cairn/owner
  non-regression check. Unknowns cannot hide an owner decision; optional/off
  rejects critic-judged `cN`; required mode and every critic-judged check share
  exact authoritative basis; subjective comparison remains owner-judged; and
  unsure/Cairn-chosen references can support only advisory `pN`.
- **`c3` - brand, freeze, canonical bytes, hash, budget, and projection.
  PASSED.** Private `WeakSet` brands gate canonicalization, SHA-256, validation,
  and projection. Canonical serializers use fixed field order and validated
  primitives, remain stable across ordinary insertion order and inherited
  `toJSON` poisoning, and include every authority field. The binder injects
  exactly one Builder call, one repair, three critic attempts, zero external
  evidence calls, the specified time/output caps, and `null` for an
  unenforceable dollar limit. The frozen review projection omits intent source
  ids/offsets/context and reference locators and cannot be reused as authority.
- **`c4` - one exact Evidence Plan revision. PASSED.** Revision zero is branded,
  frozen, complete, canonical, and hash-bound. A non-authoritative preview may
  change exactly one procedure and one closed mechanical field. Revision one
  needs the exact branded prior plan, exact failure/change pairing, identical
  criterion authority, matching ordered main evidence, and the complete
  separately authenticated main/owner context described above. Cross-run,
  cross-nonce, cross-time, cross-failure, reordered evidence, mix-and-match
  hashes, semantic command widening, and a second revision all reject.
- **`c5` - activation remains dark. PASSED.** The private activation literals
  array is frozen and empty, and the derived registry exposes no collection or
  mutator. The strict identity pins local target, provider/base URL, pinned
  configured model and exact resolved revision, consent, transport,
  serializer, exact generation settings, prompt version/hash, Task Spec/packet/
  output schemas, policy, text modality, and no-tools. Auto, unresolved,
  non-local, production, multimodal, tool-bearing, malformed, and every valid
  but unregistered tuple remain inactive. Repository searches found no
  production import/call of this module and no App consumer of `TaskSpecV1`.
- **`c6` - full checks, independent review, and isolation. PASSED.** Focused
  Core and activation suites, the full Core workspace suite, App typecheck and
  unit suite, whitespace checks, darkness searches, exact diff/status, and two
  independent final reviews passed. The Core reviewer found and drove repairs
  for executable/fixture/parser weakening, revision replay/mix-and-match, and
  unnecessary state invention, then found no remaining `c1`-`c4` blocker in
  exact hashes `DB64D5C9...D12CE` and `55943213...63B4`. A separate activation
  and integration reviewer found no `c5` or darkness blocker in the final tree.

The decisive commands and results were:

```powershell
cd core
npx.cmd tsc -p tsconfig.json --noEmit
npm.cmd run build
node --test dist/test/quality.test.js
# pass; 13 tests, 0 failures

cd ..
npm.cmd test --workspace @cairn/core
# pass; 198 tests, 0 failures

cd app
npm.cmd run typecheck
npm.cmd run test:unit
# typecheck pass; 584 tests, 582 pass, 0 fail, 2 intentional skips

node --test dist-unit/tests-unit/criticactivation.test.js
# pass; 7 tests, 0 failures

cd ..
git diff --check
# exit 0; no output
```

The first full Core attempt inside the restricted process sandbox timed out at
300.3 seconds after 25 printed passes and no assertion failure. Read-only
isolation reproduced the hold inside unchanged Kimi Windows watchdog tests:
their fake silent child had passed its assertion but could not complete the
intended process-tree cleanup under that restriction. The exact workspace
command was therefore rerun outside the process restriction, still with only
the repository's hermetic local fakes; it exited zero with all 198 tests
passing in 33.8 seconds. No Kimi or Codex file was changed. An earlier
red-first Core run before `quality.ts` existed failed as intended with TS2307
for `../src/quality.js`.

The final source/test SHA-256 values used by the reviews were:

```text
DB64D5C9F6A7BB37C7CE4A1BB6458034A5BFC1015549AE429FB1837C851D12CE  core/src/quality.ts
55943213A54D3E7B22416DFB04B48C92BCDB385760D7F3A43A5329BB58E063B4  core/test/quality.test.ts
85BCB1B0285755883337BC617B938779E3C4D20C54F5A418DBC5FB1934176FDC  app/src/main/criticactivation.ts
360077D6C26B1C669D0D449C1F872FFD1837F3CFA2B03E6A5A753940C9E72DE6  app/tests-unit/criticactivation.test.ts
```

No dependency/install, network/provider/model call, credential use, app/E2E
run, external write, push, publish, or deployment occurred.

## How to try it

There is intentionally no UI or live route to try yet. Maintainers can rerun
the two focused commands above. A valid local caller can import the new Core
types and helpers through `@cairn/core`, but normal Cairn routing cannot create
or consume a `TaskSpecV1`, and the desktop activation evaluator reports every
valid identity as `CRITIC_ACTIVATION_NOT_CALIBRATED` with active count zero.

## Limitations and remaining human judgment

- Q1 is a dark authority kernel. Q2 parsing/policy, evidence capture, critic
  packets, repairs, pending custody, UI, calibration, and live routing do not
  exist yet.
- Future main wiring must derive revision authority context from its
  authenticated current run and owner event, and must verify declared
  executable/fixture digests. Caller prose or a worker claim is not that
  authority.
- Q1 supports owner-judged comparison only. A deterministic comparison gate
  needs a future closed method identity rather than inference from prose.
- The activation registry remains empty through Q1-Q9. Only Q10 may add one
  separately approved, held-out-calibrated exact tuple. Production activation
  remains a later owner decision.
- Owner-verdict Plan 2 has not begun.

**Disposition: DONE**
