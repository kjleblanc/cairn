# Task 216 report - one approvable critic call, bound before it can be sent

**Lane:** A (the main checkout). **Base commit:** `7f6cedf`; the brief was
claimed alone in `f3811c8`.

This task implements Prerequisite Q's Task Q8, **stage 1 of 4**, by owner
decision to land Q8 as serial recorded tasks rather than one task spanning
Core, transport, IPC, preload, both renderer screens, and Electron journeys.
The transport, the approval surface, and the calibration-only orchestrator are
the later stages. Q9, Q10, and owner-verdict Plan 2 remain unstarted. Task
215's pending-run custody is part of this base and was not modified.

## What actually changed

Five Task 216 paths across the brief-only claim and this final commit:

- `docs/ai-work/tasks/216-brief.md` - the committed claim and six stable checks
  (already committed as `f3811c8`).
- `core/src/critic.ts` (+316) - the call-authorization layer described below.
- `core/test/critic.test.ts` (+255) - eight new `critic call:` tests.
- `docs/ai-work/tasks/216-report.md` - this report.
- `docs/ai-work/LOG.md` - one append-only Task 216 row.

No other file changed. No dependency, no App, IPC, preload, or renderer change,
no transport, and no network primitive exists in this task.

The starting position was narrower than the plan's file list suggested. Task
209 had already built the packet, request, output parser, assessment, and
policy; `core/src/critic.ts` contained **no** occurrence of an authorization,
base URL, transport revision, or billing basis. So the real gap was not "critic
types" but the single missing layer between them: which call is approved.

The main implementation decisions were:

- **`CriticCallAuthorizationV1` is composed only from an authenticated
  request.** The request must carry Task 209's private brand, and its binding
  supplies the task spec, evidence plan, packet, request, and consent hashes.
  A structural clone or lookalike composes nothing.
- **The selection is copied from the packet, never from the caller.** A caller
  passes route facts only; the files, their hashes, and their character counts
  come from the authenticated request. Nothing outside Core can widen an
  approved call, and the caps are re-checked here as depth rather than trusted.
- **Core composes the outgoing body itself.** `criticCallRequestBody` emits
  exactly the pinned system message and the canonical packet message, explicit
  generation parameters, and no tool surface. A transport does not get to build
  a body — it gets to send this one — so "the body must be the approved body"
  is structural rather than a rule a transport is asked to follow.
- **The digest is the `routeRequestFingerprintSha256`.** Task 209's assessment
  custody already carries that field; this task is what can finally produce it,
  so a later "what came back" can be checked against "what was approved".
- **One approval, one send.** `consumeCriticCallAuthorization` spends it. A
  retry is a new approval with its own attempt number, so an interrupted and
  re-entered transport cannot quietly bill the owner twice.
- Route facts are validated rather than recorded: a model that is a path, a
  drive path, a dangerous scheme, or carries `auto` in any `/`, `@`, or `:`
  segment; a placeholder revision; a plaintext, credential-bearing, or
  query-carrying base URL; a consent version the request was not built under;
  an attempt past the frozen budget; a timeout past it; a widened output cap;
  any other purpose; or a route that does not declare no server-side tools —
  all refuse.
- The bounds come from the frozen Task Spec's `callBudget`, not from literals
  in this module, so the approval cannot outlive what the spec froze.

## The independent review, and what it changed

The review required by `c6` found this task's first draft **not fit to land**,
and it was right. Two findings were decisive and both are now fixed:

1. **A model id was only length-bounded.** `criticCallModel` checked for the
   bare word `auto` and nothing else, so
   `C:/Users/.../userData/config.json`, `file:///etc/passwd`,
   `https://attacker.example/steal`, and `anthropic/auto` all authorized — and
   `resolvedModel` is the one route fact copied straight onto the wire, so each
   reached the authorization, its digest, and the outgoing body. The repository
   already contained the reviewed rules for exactly this field in
   `app/src/main/criticactivation.ts`; this kernel had dropped all of them.
   Under this brief's own STOPPED clause — "a path outside the consent can
   enter a call" — that was a stopping condition, repaired rather than shipped.
   Core now applies the same id shape, drive-path, dangerous-scheme, and
   segment-wise `auto` rules, and rejects `auto`/`unresolved` revisions.
2. **The tests proved almost nothing about the digest.** The only assertion
   compared the fingerprint to itself, so thirteen deletions from the canonical
   preimage left the whole suite green. A new test now varies each route fact
   and requires the digest to move, and names every key the preimage must
   carry. Re-run as a matrix, eight distinct preimage mutations — `baseUrl`,
   `packetSha256`, `billingBasis`, `transportRevision`, `selection`,
   `generation`, `candidateSha256`, `toolPolicy` — each now fail the suite.
   Two earlier mutation attempts appeared to pass and did not: they had hit the
   first matching text in the *request* and *packet* canonicalizers instead of
   the authorization's, and were re-run scoped to the right function.

Four further repairs came from the same review: the selection re-check now
counts UTF-16 units, the unit the packet's own cap counted, instead of code
points, which made it strictly weaker than the cap it backstops; a route must
now declare `serverSideTools: "none"`, so `c4`'s server-side-tools clause has a
representable input instead of none; `candidateRound` is compared with
`Object.is`, so `-0` is no longer accepted; and owner-facing prose is screened
for control characters and path or scheme shapes before it reaches a hashed
record. A dead `deepFreeze` call was removed — its argument was already frozen,
so it did nothing.

## Checks run and real results

Each result answers the matching id in `216-brief.md`.

- **`c1` - one exact, hash-bound authorization. PASSED.** An authenticated
  request plus exact route facts mint one deeply frozen authorization carrying
  every bound fact; its canonical digest equals its own
  `routeRequestFingerprintSha256`; a spread copy and a structured clone both
  canonicalize to null.
- **`c2` - the body must be the approved body. PASSED.** The composed body
  carries exactly two messages and no `tools`, `tool_choice`, or `functions`
  key. An appended message, an added tool array, and a changed temperature each
  fail authorization. Mutation-checked: forcing
  `criticCallRequestBodyAuthorized` to return true fails this test.
- **`c3` - the packet boundary holds at authorization time. PARTIALLY MET —
  see limitations.** Thirteen hostile model strings — drive paths, `.cairn` and
  `userData` paths, `..` traversal, `file:`/`javascript:`/`https:` schemes,
  segment-wise `auto`, whitespace — are each refused for both `model` and
  `resolvedModel`, which is what the review's stopping condition turned on.
  Each disclosed file's character count and hash match the packet's own
  content, the eight-file / 8,000 / 32,000 caps hold, and the composed body
  carries no absolute path, `.git`, `.cairn`, `userData`, project hash, consent
  version, base URL, or billing text. **The content exclusions themselves —
  untracked, ignored, binary, link, generated, dependency, credential-like —
  are enforced by Task 209's packet layer, not by this one**, and this task's
  cap re-check is unreachable through the public API because a packet that
  violated the caps cannot be built. That part is depth, not proven behavior.
- **`c4` - route drift refuses. PASSED.** Fourteen route variations each
  refuse, plus an extra key, a missing key, and an unbranded request; a route
  that does not declare `serverSideTools: "none"` refuses, so the clause has a
  representable input; and every route fact is proven to move the digest.
- **`c5` - one call, once. PARTIALLY MET — see limitations.** The first send is
  allowed and a replay is refused; a spent authorization composes no body and
  authorizes none; a second attempt is a distinct authorization with a distinct
  fingerprint; one request's approval does not cover another request's body; a
  lookalike consumes nothing; and attempts are now bounded by the frozen Task
  Spec's budget rather than by literals. Mutation-checked: forcing
  `consumeCriticCallAuthorization` to return true fails this test. **The
  cross-*attempt* swap the check names does not refuse**, and single use is per
  authorization object rather than per call — both explained below.
- **`c6` - verified isolation and regression safety. PASSED, with findings.**
  Results below. The required independent review ran against the final diff and
  found the first draft unfit to land; its two decisive findings are repaired
  and re-proven, four smaller ones are repaired, and three that cannot be met
  at this layer are recorded under limitations rather than closed. It confirmed
  the mint path is unforgeable — structured clones, spreads, proxies,
  prototype-swapped objects, getter-backed routes, symbol keys, and inherited
  properties all refuse — and that the body composer exposes no tool surface
  under any spelling.

The decisive commands and final results were:

```powershell
cd core
npm.cmd exec -- tsc -p tsconfig.json --noEmit   # pass
npm.cmd run build                               # pass
npm.cmd test                                    # 380 total, 370 passed, 10 platform skips, 0 failed
node --test --test-name-pattern="critic call:" dist/test/critic.test.js
                                                # 8 passed, 0 failed

cd ..\app
npm.cmd run typecheck                           # pass
npm.cmd run test:unit                           # 694 total, 692 passed, 2 platform skips, 0 failed

cd ..
git diff --check                                # exit 0; no output
git status --porcelain                          # exactly core/src/critic.ts and core/test/critic.test.ts
```

Core rose from 372 to 380 tests, all eight new. App unit results are unchanged
from Task 215, which is the point: nothing App-side can see this layer yet.

Darkness was checked by reading rather than by trusting comments: no `app/src`
or `cli/src` file references `CriticCallAuthorization`, `criticCallRequestBody`,
`composeCriticCallAuthorization`, or `consumeCriticCallAuthorization`; nothing
in the repository advertises `packet-only-critic`; the calibrated activation
registry is still the empty frozen literal; `core/src/critic.ts` contains no
`fetch`, `node:http`, socket, or WebSocket reference; and no `package.json` or
lock file changed.

## How to try it

There is no visible product change, by design — this layer has no caller. A
maintainer can run the Core commands above. The eight `critic call:` tests are
the demonstration: one authenticated request becomes one approvable call, the
body it authorizes is the only body it authorizes, a path or a URL cannot pose
as a model, every named fact is inside the digest, and the approval is spent
once.

## Limitations and remaining human judgment

- `c3` is partially inherited, as stated above. The content exclusions live in
  Task 209's packet layer; this task proves the caps and the disclosure
  boundary of the composed body, and its own cap re-check cannot be reached
  through the public API.
- **A gap this task deliberately did not close:**
  `composeCriticAssessmentCustody` validates the task spec, plan, packet,
  request, candidate, consent, prompt, and policy hashes, but **not**
  `provider`, `model`, `resolvedModelRevision`, or
  `routeRequestFingerprintSha256` — they are accepted from the caller. The
  authorization added here is what makes checking them possible, but binding
  custody to an authorization would change Task 209 behavior, which this
  brief's boundary forbids. Stage 2 or 3 should close it, when a transport
  exists to produce a real fingerprint.
- **`c5`'s cross-attempt swap does not refuse, and cannot at this layer.** Two
  authorizations over the same request compose byte-identical bodies, because
  the body is the packet and the packet does not vary by attempt. So a body
  approved under attempt 1 verifies under attempt 2. I did not invent a
  mechanism to make the check true — putting an attempt nonce into the body
  would change the bytes sent to the provider for no benefit to the owner. The
  honest statement is that the check as written cannot be met by byte
  comparison, and that binding a *send* to a specific authorization belongs in
  the transport stage, which holds the send.
- Single use is per authorization object, not per (request, attempt) pair:
  re-composing the same request and route facts yields a fresh authorization
  and therefore a fresh send, with an identical fingerprint. That is correct
  for a legitimate retry, but it means Core does not by itself bound the number
  of sends. Attempts are now checked against the frozen budget, but nothing
  records that an attempt was already spent; the approval surface and the
  transport own that, and both are later stages.
- **`routeRequestFingerprintSha256` now has two meanings in the repository.**
  `app/src/main/criticactivation.ts` already uses that field name for a stable
  calibrated activation identity; this task's digest is per run and per
  attempt, so the two can never be equal. Both preimages are domain-separated
  by their own version string, and `parseAssessmentCustody` accepts any 64-hex
  value for the field and cross-checks it against nothing, so nothing is
  currently wrong — but a later stage must choose which definition custody
  means, and say so.
- `criticCallRequestBody` emits an OpenAI-compatible shape (`model`,
  `messages`, `temperature`, `top_p`, `max_tokens`, `stream`). That is a
  serializer decision recorded in the authorization as
  `cairn-critic-body/v1`; a provider needing a different shape needs a new
  serializer id and a new authorization, not a transport-side edit.
- Verification was fake/unit/build only, as the brief required. No provider,
  model, or network call, no credential, no Electron run, no dependency change,
  nothing pushed.

**Disposition: DONE**
