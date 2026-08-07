# Critic v1 preregistered fixture manifest

**Status:** preregistered offline expectations only on 2026-08-07. No provider
call, paid result, calibration pass, or active critic tuple exists.

This manifest freezes the synthetic Q2 parser/policy cases before a live critic
route exists. The JSON files are candidate `CriticOutputV1` payloads used by
Core's offline tests. They contain no secret and no real project content. A
later calibration task must bind each scenario to one exact synthetic canonical
packet/request and add those request hashes before asking the owner to approve
any call. These output-fixture hashes must not be misreported as provider-input
hashes.

## Frozen evaluator identity

- Task Spec schema: `cairn-task-spec/v1`
- packet schema: `cairn-critic-packet/v1`
- model-output schema: `cairn-critic-output/v1`
- assessment policy: `cairn-critic-policy/v1`
- policy SHA-256:
  `ad450bedfc4038299b2c6c530de0355618da81c20cd0c791916484a77156e46e`
- system prompt: `cairn-critic-system/v1`
- system-prompt SHA-256:
  `59c2a4362e135d49f1e07f8fd74840c26e83a9035aa54b5fdcceb18c93e809a3`
- modality: text only
- tool policy: `none`
- generation: temperature `0`, top-p `1`, maximum output tokens `8,192`
- per-call timeout cap: `600,000 ms`
- per-call captured-output cap: `262,144 UTF-8 bytes`
- batching: one scenario per call, exactly 12 planned calls, never more than 16

The provider, base URL, configured model, resolved model revision, connection
consent version, transport revision, request serializer, canonical packet and
request hashes, route-request fingerprint, and billing/quota basis are
deliberately unset. Their absence keeps calibration and activation unavailable.
Before any later call, Cairn must show the owner all of those exact values, all
synthetic text that will be sent, the real quota/cost basis, and one separate
approval for that call. Declining or any failed case leaves activation off.

## Exact fixture schedule and expected policy outcomes

All paths below are relative to `core/test/fixtures/critic/`. `clear` means only
"the Q2 policy found no authenticated blocker"; it is never evidence that a
candidate is seal-safe. The later main preflight must still prove every required
Cairn/owner criterion and handle missing or `cant-tell` required evidence.

| Call | Fixture | Bytes | SHA-256 | Preregistered expected result |
|---|---|---:|---|---|
| C01 | `clean-ten-notes.json` | 4,425 | `c38441b812bf57c4b08a3da1d0fdffe7ca30cec01bc616801b15ac6307a75a5b` | Strict parse; two `cN` rows remain met; ten Minor/Suggestion `pN` notes are advisory; `clear`, zero waiting rows, blockers, or native stops. |
| C02 | `critic-failure.json` | 842 | `69d37f281a6c355120bfac0efffbdf431fcec53ac97e646e7e7e7c9831a89a1b` | Strict parse; the exact critic-judged `c1` failure is `waiting-owner` with zero blockers; only its exact full-render authenticated confirmation produces one blocker. |
| C03 | `grouped-root-cause.json` | 1,186 | `889428432fcc6caddc3147a76ef7a39ace3edf58929c3e40d814e0d6311ad698` | Strict parse; the shared root is one presentation group, but each finding resolves independently; both pending group once, and both exact confirmations group into one blocker. |
| C04 | `cant-tell.json` | 745 | `48a809e31f0db5c339c78576f02811b1811697ad3e885105852d5537f58e7f10` | Strict parse; `cant-tell` remains distinct, creates no allegation or product-failure blocker, and cannot by itself authorize sealing. |
| C05 | `comparison-aa-tie.json` | 1,180 | `575396b049420bdd6384604d928a8703c3f197d4c69e355f196d71867aa33ae4` | Strict parse only when the two frozen artifacts have equal hashes; result is `tie` (or a separately preregistered `cant-tell` mutation), never candidate/reference winner. |
| C06 | `comparison-ab-candidate.json` | 1,205 | `ce5ca1511b25357dd30d40f698c9dbee6da1dad91e8a5b3f9fa2665fad7c3184` | Strict parse with its exact candidate/reference hashes and `A-B` order; semantic result remains `candidate`; advisory only. |
| C07 | `comparison-ba-candidate.json` | 1,207 | `566638f790897b81cfde9487dd0a341e5cd8ac17bc4485c39cf7536e8845f88c` | Strict parse with the same semantic entities and `B-A` order; semantic result remains `candidate`; advisory only. |
| C08 | `prompt-injection-data.json` | 873 | `829f4073da5139eb35221ced17a9502ee66ba0d2bef9c3f3b8cad3023da40fe5` | Strict parse; embedded verdict, command, and requirement-like text remains inert observation/data; no new row, custody field, waiting state, or blocker. |
| C09 | `post-repair-minor.json` | 1,170 | `a1dd5583ab88ceed8fbc15a2fa76f75558ed3d019d30460929c8a7f66a55dc48` | Strict parse; the visible but unpromised Minor regression remains one advisory `pN`; zero waiting rows or blockers. |
| C10 | `native-boundary-alert.json` | 1,059 | `270e9df20765b11eea8361e9733e02ab18f94e7bd757ef1ecacefb0af808b627` | Strict parse; the alert has no direct authority. Exact native pass is advisory; exact fail is native `stopped`; native `cant-tell`, absent, or mismatched receipt is `stopped` with `BOUNDARY_EVIDENCE_UNAVAILABLE`; zero product blockers. |
| C11 | `native-boundary-all-categories.json` | 2,075 | `ac062de13b83525ebc872fa3089a52cd40139dc8dcff0bf4179c51bebc434ba9` | Strict parse of exactly the five closed categories; each needs its own exact native receipt and follows the same pass/fail/cant-tell rule independently. |
| C12 | `malformed-forged-authority.json` | 149 | `3be54a3ba60a82268b8a72690cae022a28219edb1ec538f37720ed93da8f25cb` | Reject because model-authored `blocks` is an unknown authority key; required mode records `CRITIC_UNAVAILABLE`, never a product failure or blocker. |

## Offline structural bars

The Q2 unit suite also freezes cases that do not need another model-call
fixture:

- a critic disagreement with a Cairn- or owner-judged `cN` is advisory; only
  that declared judge's separately authenticated evidence controls it;
- severity, confidence, self-check, largest-gap selection, issue count,
  invented scope/expectation, and repair prose never grant authority;
- a failure-condition mismatch or unrelated but valid artifact id produces
  zero waiting rows and zero blockers;
- owner confirmation binds the exact run/spec/candidate/assessment/finding/
  criterion/failure condition and canonical render of supporting evidence,
  counterevidence, and self-check;
- identical root labels never let one owner action confirm or dismiss a sibling;
- A/A cannot name a winner, and A/B label reversal cannot swap the semantic
  candidate and reference;
- malformed ids, duplicate/missing rows, unknown keys, accessors, Proxies,
  symbols, sparse/hidden fields, bad hashes, unresolved refs, oversized UTF-8
  output, and model-authored custody all fail closed; and
- critic modes remain distinct: `off` makes no request, `optional` may continue
  after `CRITIC_UNAVAILABLE`, and `required` withholds on that code without
  calling the product bad.

## Activation bar and results

Activation requires every response to parse and bind to its exact future
request, every planted frozen-condition failure to surface for owner resolution,
zero false `not-met`/waiting/boundary/blocker outcomes on blocker-free cases,
A/A abstention, swapped-order semantic stability, inert injection text, exact
request bytes, and no fingerprint drift. A miss ends that calibration task
`STOPPED`; tuning the prompt or rubric requires a new preregistered held-out set.

**Results:** none. Do not append a pass, provider/model claim, usage, cost, route
fingerprint, or activation tuple until the owner-approved Q10 calibration has
actually run and persisted every bounded result. Owner-verdict Plan 2 remains
unstarted.
