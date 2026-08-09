# Task 217 brief - the one-shot critic transport, bound to one authorization

**Lane:** A (the main checkout). **Base commit:** `c1b0023`.

**Plan position:** Prerequisite Q, Task Q8, **stage 2 of 4**. Stage 1 (Task 216)
added Core's call authorization: what a single approved critic call *is*. This
stage adds the only thing allowed to send one. The owner-facing approval surface
and the calibration-only orchestrator are stages 3 and 4. Q9's repair call, Q10
activation, and owner-verdict Plan 2 remain unstarted. Task 215's pending-run
custody and Task 216's authorization layer are part of this base and must stay
intact. Task 212 remains unmerged on `lane/g` and is not touched.

## Requested visible outcome

The App gains `app/src/main/critictransport.ts`: a one-shot, tool-free critic
send that is bound to exactly one authorization. It sends only the bytes Core
composed for that authorization, only to the base URL that authorization names,
exactly once — and it can say honestly whether a paid call happened.

It is a thin wrapper over
`app/src/main/conductor/transports/openai-compatible.ts`, not a second copy of
it: the redirect refusal, the endpoint derivation, and the redacted HTTP error
mapping are shared with the conductor's own transport so they cannot drift
apart. Nothing here builds a request body; Core composes it and this module
carries it.

Five limitations recorded in `216-report.md` are what this stage exists to
close. Each is a check below: binding a send to a specific authorization (`c1`),
recording an attempt as spent (`c2`), choosing one meaning for
`routeRequestFingerprintSha256` and binding the four custody fields Task 209
took on trust (`c3`), and resolving the bytes-versus-characters cap mismatch
(`c4`).

This stage is dark: no adapter advertises `packet-only-critic`, the calibrated
activation registry stays empty, and no IPC channel, preload key, renderer
screen, or task path calls anything added here. Verification is fake-only.

## Boundary of intent

- Implement in `app/src/main/critictransport.ts` (new), its App unit test, the
  smallest possible shared-primitive extraction in
  `app/src/main/conductor/transports/openai-compatible.ts`, and the Core changes
  named below. No IPC, preload, renderer, adapter, `tasks.ts`, or Electron-suite
  change.
- **The one permitted change to Task 209 behavior, named here as this brief's
  explicit boundary:** `composeCriticAssessmentCustody` gains a required third
  argument, the branded authorization for the same request, and refuses when
  provider, model, resolved model revision, run, round, attempt, any bound hash,
  or the route/request fingerprint differs from it. Task 216 left those four
  fields accepted on trust and said this stage should close it. Callers and
  fixtures in `core/test/critic.test.ts` and `app/tests-unit/ownercheck.test.ts`
  are updated for the new argument; no other Task 209 parsing, packet, request,
  output, assessment, or policy behavior changes.
- **The one permitted change to Task 216 behavior:** the authorization's
  `serializer` is pinned to Core's own body-format constant instead of accepting
  any token, so an authorization can no longer name a body format Core does not
  emit. The committed digest-drift row for `serializer` becomes a refusal row.
- **No provider call, network call, credential, or dependency.** Every test uses
  an injected `fetch` or a local loopback fake. No real provider endpoint is
  contacted, no API key exists outside inert test strings, no `package.json` or
  lock file changes.
- The conductor's own live request must stay byte-identical: same URL, method,
  headers, body bytes, `redirect: "manual"`, and signal. The existing exact
  `seenInit` assertion in `app/tests-unit/conductor-transport.test.ts` is the
  guard and must pass unchanged.
- A credential never enters a result, an error, a refusal code, a hashed record,
  or a log. Refusal and unavailable reasons are a closed set of codes plus the
  existing owner-safe messages; raw provider text never becomes owner text.
- No filesystem, shell, process, browser, or tool channel exists in the new
  module. No tool, function, or hidden-history key can enter the body under any
  spelling, because the module never composes one.
- Preserve Task 215's pending-run custody, the legacy intent-only worker path,
  and every current Core, CLI, and App unit result.
- **Electron and Playwright are deferred by owner decision** to the stage that
  adds the visible surface. That suite is single-tenant: it needs the app token
  and the owner out of Cairn, and there is nothing owner-visible to journey
  through yet. No Electron run, no real app profile, no push, no publish, no
  deploy in this task.

## Checks

1. **`c1` - one send, bound to one authorization.** The transport accepts only a
   Core-branded authorization and the branded request it was minted from. Every
   fact that reaches the wire comes from that authorization: the endpoint is
   derived from its `baseUrl`, the bytes are exactly
   `criticCallRequestBody(authorization)`, and the body is re-verified with
   `criticCallRequestBodyAuthorized` before anything is issued. A caller cannot
   supply a URL, model, body, header, or extra message; a mismatched
   request/authorization pair, an unbranded or cloned authorization, and a
   `transportRevision` this module does not implement each refuse before any
   request exists. The observed request is exactly one POST, `redirect:
   "manual"`, `content-type` and `authorization` headers only, and its body
   carries two messages and no `tools`, `tool_choice`, `functions`, or
   `stream: true` key.
2. **`c2` - one approved call, one send, spent before it leaves.** The
   authorization is spent before the request is issued, so an interrupted and
   re-entered transport cannot bill twice — and a spent authorization can no
   longer even compose its own bytes. A freshly composed but identical
   authorization (same run, round, attempt, request, route) is refused by a
   process-lifetime spent-call ledger keyed on the authorization digest, which
   is what Task 216 could not do. The ledger is bounded and refuses when full
   rather than evicting. Every refusal happens before the spend and reports that
   nothing was sent; every outcome after the spend reports that a call was made,
   including a network failure or a timeout.
3. **`c3` - custody is the authorization plus a timestamp.** Custody no longer
   accepts provider, model, resolved model revision, or the route/request
   fingerprint from its caller: `composeCriticAssessmentCustody` requires the
   authorization and refuses any drift in them, and the transport composes
   custody only from the authorization it actually sent. `createdAt` is the only
   field a caller still supplies. **The decision this records:** custody's
   `routeRequestFingerprintSha256` means Task 216's per-call authorization
   digest, not `app/src/main/criticactivation.ts`'s stable calibrated activation
   identity. A test pins that the two values differ for the same route and that
   an activation fingerprint is refused as custody.
4. **`c4` - the answer is bounded before it is believed.** The transport reads
   at most `min(authorization.maxOutputCharacters,
   TASK_CALL_BUDGET_V1.maxCriticCapturedOutputBytes)` **bytes** off the wire and
   stops there, which is the stricter of the two limits Task 216 found to be in
   different units; a test proves the byte ceiling implies the character
   ceiling. A response past the cap, a provider-reported model that differs from
   the authorized one, a redirect, an HTTP error, a timeout, an abort, a missing
   body, and malformed JSON each yield one closed unavailable code and no
   assessment — never a product failure, never raw provider text.
5. **`c5` - nothing secret and nothing unapproved leaves.** The credential is
   used only as the Authorization header of the approved endpoint and appears in
   no result, error, code, message, or returned fact. A hostile fake provider
   that echoes the key, injects instructions, sets a `Location` header, returns
   deeply nested or oversized content, or answers as another model changes
   nothing about the bytes that were sent and reaches none of those places. The
   module contains no filesystem, shell, child-process, or tool import.
6. **`c6` - verified isolation and regression safety.** Focused new tests, the
   complete Core suite, the App unit suite, both typechecks, the Vite build,
   exact diff and status, and darkness searches proving no IPC channel, preload
   key, renderer reference, advertised capability, or activation entry all pass,
   with the conductor's own request bytes unchanged. An independent adversarial
   review runs against the final diff and its findings are repaired or recorded,
   never silently closed. No dependency, provider call, network call, credential,
   real app profile, Electron run, or external write occurs.

## DONE and STOPPED

**DONE** means all six checks pass; one authorization yields at most one send of
exactly the bytes Core approved, to exactly the endpoint it named; a second send
of the same approved call refuses whether or not the same object is reused;
custody can no longer be told what route answered; the captured answer is
bounded in the stricter unit; Task 209's, 215's, and 216's behavior is unchanged
except for the two boundary changes named above; one report and log row record
the evidence; the Task 217 paths land in one exact-path final commit; and `main`
is clean.

**STOPPED** means a body other than the approved one can be sent, a call can
reach a host the authorization did not name, one approval can produce two sends,
a credential can reach a result or an error, custody can be composed for a call
that was not approved, an unbounded response can be read, or anything added here
is reachable from normal routing.
