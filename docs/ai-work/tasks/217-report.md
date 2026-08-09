# Task 217 report - the one-shot critic transport, bound to one authorization

**Lane:** A (the main checkout). **Base commit:** `c1b0023`; the brief was
claimed alone in `64b7f74`.

This task implements Prerequisite Q's Task Q8, **stage 2 of 4**. Stage 1 (Task
216) said which call is approved; this stage adds the only thing allowed to send
one. The owner-facing approval surface and the calibration-only orchestrator are
stages 3 and 4. Q9, Q10, and owner-verdict Plan 2 remain unstarted. Task 215's
pending-run custody is part of this base and was not modified. Task 212 remains
unmerged on `lane/g` and was not touched.

## What actually changed

Ten Task 217 paths across the brief-only claim and this final commit:

- `docs/ai-work/tasks/217-brief.md` - the committed claim and six stable checks
  (already committed as `64b7f74`).
- `app/src/main/critictransport.ts` (new, 447 lines) - the one-shot, tool-free
  critic send described below.
- `app/tests-unit/critictransport.test.ts` (new, 793 lines) - 19 tests.
- `app/tests-unit/critictransport-ledger.test.ts` (new, 62 lines) - one test
  that exhausts the module-global spent-call ledger, in its own file because
  exhausting it poisons every later case in the same process.
- `app/tests-unit/critic-call-fixture.ts` (new, 252 lines) - the shared request
  and authorization fixtures both test files need.
- `app/src/main/conductor/transports/openai-compatible.ts` - extracted
  `postChatCompletions`, the one place Cairn issues a completion request.
- `app/tests-unit/conductor-transport.test.ts` - two tests for branches the
  extraction turned into standalone code.
- `core/src/critic.ts` - the serializer pin, the custody binding, and one new
  predicate.
- `core/test/critic.test.ts` - the Core side of those, plus repairs described
  under "the independent review".
- `app/tests-unit/ownercheck.test.ts` - fixture update for the custody
  signature.
- `docs/ai-work/LOG.md` - one append-only Task 217 row.

No dependency, no `package.json` or lock-file change, no IPC channel, preload
key, renderer reference, adapter capability, or activation entry.

### The transport

- **A send is bound to one authorization.** The endpoint is derived from
  `authorization.baseUrl`; the bytes are exactly `criticCallRequestBody`; the
  module composes nothing. A caller supplies the request, the approval, and the
  credential — not a URL, a model, a body, a header, or a message.
- **The approval is spent before the request leaves.** Nothing between function
  entry and the ledger write awaits, so two concurrent sends cannot both reach
  the provider, and a re-entered transport finds an approval that can no longer
  compose its own bytes.
- **A process-lifetime ledger records the attempt, not just the object.** Keyed
  on the authorization digest, module-private, bounded at 512, and refusing when
  full rather than evicting — evicting the oldest entry is exactly how a replay
  of a paid call would get through. This is what Task 216 could not do.
- **The answer is bounded in bytes** at `min(maxOutputCharacters,
  TASK_CALL_BUDGET_V1.maxCriticCapturedOutputBytes)`, checked before each chunk
  is retained.
- **Every owner-facing sentence is a literal keyed by a closed code.** A
  provider cannot write Cairn's explanation of its own call.

### The Core changes, against the brief's boundary

The brief permitted two changes. A third was needed and is disclosed here:

1. **Permitted:** `composeCriticAssessmentCustody` takes the authorization and
   binds every field to it. Custody is the approved call plus a timestamp.
2. **Permitted:** `serializer` is pinned to `CRITIC_CALL_BODY_SERIALIZER`. Before
   this, an authorization could truthfully record `openai-chat/v1` while Core
   emitted `cairn-critic-body/v1` bytes.
3. **Not named in the brief, and disclosed as an addition:**
   `criticCallAuthorizationCoversRequest` is a new exported predicate. `c1`
   requires the transport to refuse a mismatched request/authorization pair
   *before* any request exists, and the maps that answer that question are
   Core-private, so the check could not be implemented without it. It applies
   the same rule custody applies afterwards, and it survives the spend.

A fourth change followed from the review: custody now also requires the approval
to have been **spent**. Core can prove the approval was consumed, not that a
socket was opened — but the transport consumes only immediately before it issues
the request, so custody is no longer mintable for a call nobody made.

### Decision: what `routeRequestFingerprintSha256` means

Task 216 recorded that this field name has two meanings in the repository. This
task picks one and enforces it: **in custody it is the per-call authorization
digest**, never `app/src/main/criticactivation.ts`'s stable calibrated
activation identity. That meaning was chosen because it is the one that can be
*checked* today — custody can be compared against the approval in hand, while
the activation registry is empty until Q10. Nothing was renamed: the design
document uses the same name for both concepts, so a rename here would diverge
from the spec. Instead both sites carry a comment, and two tests pin the
distinction — the activation identity does not move between attempts over one
route, the custody digest does, and an activation fingerprint is refused as
custody.

### Decision: bytes versus characters

`TaskCallBudgetV1.maxCriticCapturedOutputBytes` counts bytes;
`CRITIC_LIMITS.rawOutputCharacters` counts UTF-16 units. Both are 262,144. The
transport enforces the **byte** ceiling, which is the stricter of the two: a
UTF-8 encoding is never shorter than the UTF-16 unit count of the same text
(1 byte per unit for ASCII, 2 and 3 bytes per single unit for the rest of the
BMP, 4 bytes per 2 units for astral characters), so bounding bytes bounds
characters and one number enforces both. The `Math.min` means this holds even if
the two constants later diverge. What that ceiling is applied to is a real
limitation, recorded below.

## The independent review, and what it changed

Three independent adversarial reviews ran against the final diff, with distinct
lenses: the send binding and spend accounting, the Core custody binding, and the
response/credential boundary. **All three found real defects, including one
CRITICAL and one regression I introduced.** Every finding below was verified by
reading the named line, and the two most consequential were verified by running
mutations rather than by argument.

**CRITICAL - the credential screen could be walked past with a JSON escape.**
The echoed-credential check ran on the pre-parse HTTP text, so a provider
returning `"inert-..."` defeated `text.includes(apiKey)` while `JSON.parse`
restored the key, which then landed in `result.requestId` or `rawOutput` — a
recorded, hashed fact. That is this brief's own STOPPED clause ("a credential can
reach a result"). Every kept value is now screened after parsing, and the raw
screen is retained for fields the parser never reads. Four escape-based payloads
are now tested.

**A regression I introduced, and did not notice.** Restructuring the committed
test "critic assessment: main alone adds exact custody and canonical hashes bind
every accepted field" replaced a loop that varied one custody field at a time
with one that varies a whole approved call. Because the fingerprint moves with
every route fact, each row was then satisfiable by the fingerprint alone. I
confirmed this by mutation rather than accepting the argument: three mutations of
`canonicalAssessmentValue` — dropping the provider value, reading `provider`
where `model` belongs, and dropping the resolved revision — **all shipped green**
under my change. I then restored the committed pair at `HEAD` and re-ran the same
three: **all three were caught before Task 217.** I had genuinely removed
coverage. The key-presence loop is now a key-**and-value** loop over all fifteen
fields, plus a split route where the configured and resolved models differ so
`model` proves which source it reads. All three mutations are caught again.

Also repaired, each verified by mutation:

- **`input` was re-read on every use.** An accessor could return a benign
  credential to the guard and the real one to the wire, or a genuine request to
  the pairing check and another to custody. Every caller-supplied value is now
  read exactly once, and two getter-backed tests hold it.
- **An already-cancelled call spent the approval.** `AbortSignal.any` with an
  already-aborted input rejects before any bytes leave, but the approval and one
  of the owner's three attempts were already gone and the result claimed a paid
  call. It now refuses before the spend, with its own code.
- **A `signal` that was not an `AbortSignal`** (`null` from a `?? null` or a JSON
  round-trip) threw a raw `TypeError` after the spend, bypassing the
  refused/unavailable split entirely. Refused before the spend now.
- **The most likely double-send reported the wrong thing.** Re-sending the same
  object failed at body composition, so the owner was told "Cairn had no approved
  critic call to send" rather than "That critic call was already made." The order
  now checks brandedness with a predicate that survives the spend, so both
  double-send paths report `CRITIC_CALL_ALREADY_SPENT`.
- **A credential above U+00FF** passed the guard and threw inside the platform's
  header encoding after the spend, reported as a network failure the owner never
  had. The guard now requires header-encodable bytes.
- **A refusing `cancel()`** turned an over-large answer into a network failure.
  Swallowed now, as the conversation transport already swallows its own.
- **Provider prose and numbers were under-screened.** `requestId` and
  `finishReason` could carry 256 attacker-chosen characters including bidi
  overrides, drive paths, and `javascript:` shapes; `usage` accepted `1e308`,
  `0.5`, and `-0`. Both are screened now, under the same rules Core applies to
  the same concepts.
- **`fetchImpl` was invoked as a method of its input object**, so a `fetch` that
  brand-checks its receiver would throw on every conversation turn. Latent under
  Node's global, real under a browser or proxied `fetch`. Fixed, and both paths
  now have a strict-receiver test.
- **An orphaned JSDoc block.** The new predicate was inserted between
  `consumeCriticCallAuthorization`'s doc and the function, so the
  "cannot quietly bill the owner twice" rationale documented nothing. Moved.
- **A dead `ROUTE_SHA` constant** left in `ownercheck.test.ts`. Removed.
- **The `LEDGER_FULL` message told the owner to restart Cairn**, which is exactly
  the action that clears the replay guard. Reworded.
- **Empty chunks were retained**, so a stream of them grew the buffer without
  ever reaching the ceiling. Skipped now — see limitations for what this is and
  is not proven by.
- **The conductor's `!response.body` branch had no test**, and the test whose
  name claims to cover it uses a 304, which the shared primitive consumes first.
  A 200/204/205 null-body test now covers it.

Two review findings were **not** acted on and are recorded under limitations
instead: the byte ceiling applies to the whole HTTP body, and the provider-model
check only catches a provider that self-reports a substitution.

## Checks run and real results

Each result answers the matching id in `217-brief.md`.

- **`c1` - one send, bound to one authorization. PASSED.** The observed request
  is exactly one POST to `${baseUrl}/chat/completions` with `redirect: "manual"`,
  the two-header set, and a body byte-identical to `criticCallRequestBody`; it
  carries two messages, `stream: false`, and no `tools`, `tool_choice`,
  `functions`, or `stream_options` key. Another request, a spread copy, a clone,
  `null`, a cloned request, an unimplemented transport revision, and four
  unusable credentials each refuse with none reaching the provider. Two
  getter-backed inputs prove the request and the credential are each read once.
  Mutation-checked: neutering the pairing check, the transport-revision pin, or
  the credential guard each fail this file.
- **`c2` - one approved call, one send, spent before it leaves. PASSED.** The
  approval cannot compose its own bytes from inside the `fetch` call, so the
  spend precedes the send. A replay of the same object, and a freshly composed
  identical approval, both refuse as `CRITIC_CALL_ALREADY_SPENT` with one
  request reaching the provider; a genuine second attempt sends. Three
  concurrent sends started in one tick reach the provider once. A network
  failure still reports `sent: true`; an already-cancelled call refuses and
  spends nothing. A full ledger refuses rather than evicting and consumes no
  slot. Mutation-checked: neutering the ledger, moving the spend after the send,
  making overflow evict, re-reading the credential at the send site, and
  accepting an already-aborted signal each fail.
- **`c3` - custody is the authorization plus a timestamp. PASSED.** The
  transport's custody carries the approval's fingerprint, provider, resolved
  model, revision, run, round and attempt, and Core accepts it as the authority
  for an assessment. Seven substitutions refuse; a spread copy, a clone, `null`,
  `undefined`, and an approval for another request refuse; a split route proves
  `model` binds to the resolved model rather than the configured one; an
  unspent approval refuses and a spent one still records. The two fingerprint
  meanings are pinned by two tests. Mutation-checked: dropping the provider
  binding, dropping the fingerprint binding, reading the configured model, and
  accepting an unspent approval each fail.
- **`c4` - the answer is bounded before it is believed. PASSED, with a
  limitation.** A response exactly at the ceiling is read and one byte over is
  refused; a chunked stream over the ceiling is refused; a body-release failure
  does not disguise why. A redirect, five HTTP statuses, a wrong model, five
  malformed shapes, a missing body, a timeout, a caller abort, and a broken
  clock each yield one closed code with `sent: true` and no raw provider text. A
  provider that reports no model is still allowed. Mutation-checked: widening
  the ceiling tenfold, neutering the model check, and removing the clock guard
  each fail. **The ceiling applies to the whole HTTP body, not to the answer
  alone — see limitations.**
- **`c5` - nothing secret and nothing unapproved leaves. PASSED.** Four
  credential-echo payloads — including three JSON-escaped ones and one in a
  field this parser never reads — are refused and keep no copy of the key.
  Hostile prose, paths, schemes, bidi overrides and oversize ids are dropped;
  hostile counts become `null`. The module's import list is pinned to exactly
  three modules, so no filesystem, process, or second network primitive can
  appear without failing the test. Mutation-checked: neutering either credential
  screen, the prose shape screen, or the count bounds each fail.
- **`c6` - verified isolation and regression safety. PASSED, with findings.**
  Results below. Three independent adversarial reviews ran against the final
  diff; their decisive findings are repaired and re-proven, and the two that
  cannot be met at this layer are recorded rather than closed.

The decisive commands and final results were:

```powershell
cd core
npm.cmd exec -- tsc -p tsconfig.json --noEmit   # pass
npm.cmd run build                               # pass
npm.cmd test                                    # 384 total, 374 passed, 10 platform skips, 0 failed (~12 min)

cd ..\app
npm.cmd run typecheck                           # pass
npm.cmd exec -- tsc -p tsconfig.unit.json       # pass
npm.cmd run test:unit                           # 716 total, 714 passed, 2 platform skips, 0 failed
npm.cmd run build:vite                          # exit 0; Main, preload, and renderer bundles built

cd ..
git diff --check                                # exit 0; no output
git status --porcelain                          # exactly the Task 217 paths
```

App unit rose from 694 to 716 tests (19 in `critictransport.test.ts`, one in
`critictransport-ledger.test.ts`, two in `conductor-transport.test.ts`). Core
rose from 380 to 384.

Darkness was checked by reading: no `app/src`, `cli/src`, or `core/src` file
calls `sendCriticCall`; nothing advertises `packet-only-critic`; the calibrated
activation registry is still the empty frozen literal; no `criticCall`,
`CriticCall`, or `CRITIC_CALL` reference exists anywhere in `app/src/shared`,
`app/src/preload.ts`, or `app/src/renderer`; and no `package.json` or lock file
changed.

## How to try it

There is no visible product change, by design — this layer still has no caller.
A maintainer can run the commands above. The clearest demonstration is
`node --test dist-unit/tests-unit/critictransport.test.js`: one approval becomes
one request to one endpoint carrying exactly Core's bytes, a second send of the
same approved call refuses whether or not the same object is reused, a provider
that echoes the saved key gets nothing recorded, and custody names the call that
was actually made.

## Limitations and remaining human judgment

- **The byte ceiling applies to the whole HTTP response, not to the answer
  alone.** The envelope and JSON escaping both count, so an answer near the
  approved character limit that is quote-dense can be refused although Core
  would have accepted it — and the owner has already paid for that call. The
  ceiling is the safety property and raising it would break the implication that
  makes one number enforce both limits, so this is a deliberate, disclosed
  trade-off rather than a fix. The owner message no longer claims the answer
  exceeded "the approved limit".
- **The provider-model check only catches a provider that self-reports a
  substitution.** A provider that omits `model` entirely is allowed, because the
  compatible transport has never required one. `c4`'s clause therefore gives no
  protection against a provider that silently serves a cheaper model; it catches
  an honest one that says so.
- **Skipping empty chunks is unproven depth.** It bounds memory against a stream
  of zero-length chunks, but no test in this suite can distinguish retaining
  them from skipping them — the mutation is not caught, and I am recording that
  rather than counting it as covered.
- **The spent-call ledger is process-lifetime.** Within one process, a second
  send of the same approved call refuses whether or not the same object is
  reused. Across a restart the ledger is empty, so a stage-4 orchestrator that
  persisted route facts could re-compose and re-send a call already paid for.
  Durable spend belongs to Task 215's pending-run journal and is not wired here.
  The brief's DONE clause states this property without that qualifier; it holds
  only within one process.
- **Custody proves the approval was spent, not that a socket was opened.**
  `consumeCriticCallAuthorization` is exported, so an in-process caller could
  spend without sending. The transport is the only production caller and spends
  immediately before issuing the request, but Core cannot prove more than this.
- **One spent approval can still mint many custody records**, because `createdAt`
  is the one field a caller supplies. Bounding that to one assessment per call
  belongs with the pending-run journal, not here.
- **`CRITIC_CALL_BODY_NOT_AUTHORIZED` and `CRITIC_CALL_CUSTODY_UNAVAILABLE` are
  unreached.** The first is a determinism guard that cannot fire while Core's
  body composition is a pure function of the approval; the second cannot fire
  while the transport builds custody from the authorization it just spent. Both
  are depth, and neither should be counted as proven behaviour.
- **`fetchImpl` and `now` are caller seams.** A caller supplying `fetchImpl`
  supersedes the endpoint entirely. `c1`'s guarantee is that the module composes
  nothing a caller chose, not that a caller cannot reach the network; this
  matches the existing conductor seam and the module is dark.
- **All transport verification is against injected `fetch` and hand-built
  `Response` objects.** Core's `criticCallBaseUrl` requires `https:`, so the
  repository's loopback fake-provider fixture cannot be reached by any
  Core-minted authorization. The redirect, HTTP-error, timeout and cancellation
  behaviour of the real platform is inherited from the shared primitive, whose
  loopback coverage is the conversation transport's existing suite.
- **The ledger-exhaustion test depends on `node --test` giving each file its own
  process.** Its first assertion is that the ledger starts empty; if the runner
  ever shared a process across files, that test and the main transport file
  would become order-dependent.
- Verification was fake/unit/build only. **No Electron or Playwright run**, by
  owner decision: that suite is single-tenant, needs the app token and the owner
  out of Cairn, and there is nothing owner-visible to journey through until the
  stage that adds the surface. No provider or network call, no credential, no
  dependency change, no real app profile, nothing pushed.
- Task 215's two open judgment calls — the changed Q6 test expectation and boot
  opening gated instead of quitting — were **ratified by the owner during this
  task** and both stand as landed.

**Disposition: DONE**
