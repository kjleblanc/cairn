# Critic v1 preregistered fixture manifest

**Status:** preregistered offline expectations plus Q8's exact synthetic input
requests on 2026-08-11. No provider call, paid result, calibration pass, or
active critic tuple exists.

This manifest freezes the synthetic Q2 parser/policy cases before a live critic
route exists. The JSON files are candidate `CriticOutputV1` payloads used by
Core's offline tests. They contain no secret and no real project content. A
Q8's calibration-only driver now binds each scenario to one exact synthetic
canonical packet/request below. These output-fixture hashes remain offline
CriticOutput templates and must not be misreported as provider-input hashes.
For C01-C11, the local evaluator projects each illustrative template onto the
exact request's criterion, artifact, comparison, and real content-hash
identities before strict parsing; C12 is deliberately left unprojected and
must reject. The projection is evaluator-only and is never model-visible.

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

The synthetic-only Q8 route is fixed to provider `cairn-synthetic-fake`, base
URL `https://critic-calibration.invalid/v1`, configured/resolved model
`cairn/synthetic-critic-v1`, resolved revision `synthetic-fixture-v1`, consent
`synthetic-calibration-no-project-data-v1`, transport
`openai-compatible-critic/v1`, serializer `cairn-critic-body/v1`, and billing
basis "Injected synthetic fake only; no provider, network, credential, billing,
or quota is used." Cairn re-derives and shows those facts, the selected
synthetic rows, and one separate approval before every injected-fake call. A
random run id makes each approval/custody identity fresh, so its runtime route
fingerprint is shown on that card rather than preregistered here. Declining or
any failed case leaves activation off.

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

## Exact synthetic input schedule

The compiled manifest is `cairn-critic-calibration-manifest/v1`, SHA-256
`e5d321c74506bf70ded87baf9492c6bcae68de1781fbc35a1d0da7aad4bffda8`.
`Fixture SHA-256` binds the call id, its output-template identity/hash, the
preregistered scenario and expected policy, the three canonical input hashes,
and the timeout/output caps. `Packet` is Core's canonical packet hash; `Request`
is Core's canonical `CriticRequestV1` hash; `Body` is the exact two-message
OpenAI-compatible JSON body the injected fake receives. None is derived from a
project candidate or project file.

| Call | Fixture SHA-256 | Packet SHA-256 | Request SHA-256 | Body SHA-256 |
|---|---|---|---|---|
| C01 | `ec91e14fcb8ba56631075d7926c5451c48eb63359cb9b3133a45aca0ef945dcc` | `4a8c362957899ef4d9bc7a300055eb87d5c09463bf88931a79ea6c8dfd958c43` | `57eceed9b96c0d146711a78dcf73583a4ea61f59c46ae22b0f451c6298143aee` | `74d334215f019c590912ab91c65c414548fcb1af64e6890b146c68cdc4939990` |
| C02 | `b5615be97bdbbe98d1777bd1d26120a096abc2f0cb974d76abca0f4408ff1471` | `c123ff4ce7b5c20c2c15b92823df7ba3af00fb8626edfcf51a10038644f741cd` | `8bbf8a6e4ec911f14d80efd5a7d8182791c90b77a869a4f1f5e4821f6c3a0e44` | `4bb9e55a7670814187b2f18b87a2d472e92e86493b0ec0817778399f02057154` |
| C03 | `710fab01cc243f4ad13c494fac5edf0f0a5be5aaf9972edae8f8aeb1dab710ea` | `aa2d8b0b6b3d7bd361fb17a56c721e3278fddc3c8d66dd5964b90f944d288d3d` | `7e6a229c90eac7f63598abc763d240c100bdecc2bb46ec3cef6803efba971765` | `c4f7ca0ba1c762080f02804dc92f98ea1035dfefdec53338cad83c12466c9315` |
| C04 | `dc6517336301e78e5fc980873803e3cce3256e04b17568a2612483184eb85cea` | `e09494494dd21766fe427fe36c82832f0cb071facbffe90f211a0972e7deee64` | `7425e5219298d115e7e803d7beea0623ec5c6cecc2b7d610c52642d8034671d9` | `f7e6594420b6e6a9ae848f1c34dcdea671580acc0c09863881a64562c39a7bd4` |
| C05 | `3b9cae049cc158f65d20b1daf2c1b9adeafdc3f480c0d1711f93da7c788d7463` | `ae8f0a4cd1e8bbc93eb0ef34dd21f2e9b52e30c30635c9d7ba858595c68b25be` | `65413160fa2f8114ec3b5b830ca58d91977cb4181a40bf31bbad6844233c19a7` | `4f2ac553ab8ccbcafcc15b271265fe190ab180a8e1617f9157e253d20af01021` |
| C06 | `ece7fbce709f059d55d7cc9f5578e7eaae24455f699548ddf0ef90e125cf925c` | `4def1851b9714bc34d6aa9e51100da7c8378b44de48bfd866eb5288932a1e164` | `2685e18ce1624f4476a73a745648ac6681849cf0364819e40d2265bb5cc54efc` | `60c825417e5f746f5f8f1fbfbc857c3eadf4e044672cb994a23c145d9fd27c18` |
| C07 | `98067c6bc9119507fe322b03a15d8d16626ebb25e441c6166b36bdae45931d93` | `37e9810fb05b305faa01ecfffed67b1e572c0500a4549483595e16675d65ebc6` | `7a4f5db69f5467337e8e6f20b42e06dc52f031129ad723d443234668b9dad18c` | `56eab0e2627d0738b152da038f68825864c499fd3b3e606fc52823a1f8e8ef0a` |
| C08 | `6b2bc13137fed0e083bd2d2d2b305eb030fc0a3141b8220a54de2bd930cb8068` | `360917773445ba419758845dcea8d7f687f8cb1fd8b532937b1f33614bc6ccd2` | `6016b8e1040c261b48de1bf179dff8496608282523b278b11c5d325a9956d084` | `62a3f05e3618a4d9773927f5ff28fcd176861d6512f57aeaa1a8897ef0607e1f` |
| C09 | `c9d2ad66cf5f1132b32805a613d0eb3a4070fbae8e1f624f9b85a9ad9d6c9e49` | `a221bb999df10111838a1197ab08f8c7a240964d4d502fab56e31e0f3844a1e2` | `7c3fd8b427ae19386c7f897363c3b7cf047c3ff38c036673499eced113b55d5a` | `14ae8176b410c8543f4cca33b7599de2d1179d45892e83c0d4f4ab51d4c47813` |
| C10 | `a0b3a2e1494bbf4a26e1e97712d27752b420af451c5f193a986498f86d96970a` | `1d9d2d5a66c6050086f80dbedf861f9e18d17d51ba692396ebbf8e999e3e0437` | `8020fc76bef1f3cbe7c2aa00d4e50921ac3c3d7e50485bbe652d47f3407a8269` | `73c6f56fe7f67010eb945c00e12be4d6439e90217caa8843591b5e46037f76f6` |
| C11 | `c8032e6dbdc1853e2613ac9fe24a0c91e095676d0fa5b083320b7680c71f5828` | `ce3b2dbf97a225388a8b49815aae966f2c56cbc28a1aa3979a4f6e1a078190d9` | `ade35736ee2a78d03ba826068c5ec4979858523c6de34c05685bed4c376647d8` | `ba5a46637904ee74e12093a8b319b8db941d32207bb8325a57d0d83a2d9f9449` |
| C12 | `0dbf5dedfb8979e46c8973c561ea96c4ee123cbde6271a21182ed4e65a30ccac` | `f79980c5372e7474fde2b44ef7d1f325081d6a9541ef196619ab2f349cedc347` | `7af58bfa366a7f1e6455cac395cc79af26af1055689ab03e8b588db00c36e51d` | `cadd7d3ffb28f7a5a87edef10057ad166529107a2a35a0cfcf00a326f7e7c4a6` |

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
