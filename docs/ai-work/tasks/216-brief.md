# Task 216 brief - one approvable critic call, bound before it can be sent

**Lane:** A (the main checkout). **Base commit:** `7f6cedf`.

**Plan position:** Prerequisite Q, Task Q8, **stage 1 of 4**. Q8 as written
spans Core types, a transport wrapper, a calibration orchestrator, shared IPC,
preload, both renderer screens, and Electron journeys; by owner decision it
lands as serial recorded tasks instead of one. This task is the Core kernel
only. The one-shot no-tools transport, the owner-facing approval surface, and
the calibration-only orchestrator are the later stages. Q9's repair call, Q10
activation, and owner-verdict Plan 2 remain unstarted. Task 215's landed
pending-run custody is part of this base and must remain intact.

## Requested visible outcome

Core can turn one authenticated critic request into exactly one **approvable
call**: a frozen, hash-bound authorization naming the exact route, model,
consent, transport, caps, purpose, attempt, and every selected file, plus a
verifier that accepts only the exact request body that authorization describes.
Anything wider, later, or different — an added message, a tool schema, a
changed parameter, a second send — fails before anything could be transmitted.

Task 209 already built what the critic is *asked*: the packet, the request, the
output parser, the assessment, and the policy. Nothing yet binds *which call is
approved*; `core/src/critic.ts` contains no notion of a provider, base URL,
transport revision, or billing basis. This task adds that layer and nothing
else.

## Boundary of intent

- Implement in `core/src/critic.ts`, its staged exports, and Core tests only.
  Do not add the transport, the approval surface, the calibration orchestrator,
  an activation identity, or any App, IPC, preload, or renderer change.
- No HTTP client, socket, provider process, or network call exists in this
  task, in tests or in source. No dependency is added.
- A credential never enters an authorization, a request, a packet, a hash
  input, an error, or a log. Authorizations carry the route's identity, never
  its secret.
- The critic stays unreachable from normal routing: no adapter advertises
  `packet-only-critic`, the activation registry stays empty, and no App code
  calls anything added here.
- Task 209's existing request, packet, output, assessment, and policy behavior
  is preserved exactly; this task adds a layer above them and rewrites none of
  them.
- Preserve Task 215's pending-run custody, the legacy intent-only worker path,
  and every current Core suite result.
- Use local fake/unit/build verification only. Do not make a provider, model,
  or network call, use a credential, install a dependency, touch the owner's
  real app profile, run the Electron suite, push, publish, or deploy.

## Checks

1. **`c1` - one exact, hash-bound authorization.** Core mints a privately
   branded, deeply frozen `CriticCallAuthorizationV1` only from an
   authenticated request plus exact route facts, binding the base URL,
   provider, configured and resolved model, consent version, transport
   revision, serializer, generation parameters, system-prompt/schema/policy
   hashes, tool mode, task/candidate/packet/request hashes, purpose, attempt,
   timeout and output caps, honest billing/quota text, and every selected
   file's relative name, hash, and character count. Canonical bytes and their
   digest are stable and key-order independent; clones, proxies, extra or
   missing keys, sparse arrays, accessors, and prototype tricks refuse.
2. **`c2` - the body must be the approved body.** A verifier accepts only a
   serialized request body whose hash equals the authorized one and whose
   content is the pinned system message plus the packet message. An added,
   removed, or reordered message, hidden prior history, any tool or function
   schema, a changed generation parameter, a changed prompt or policy, and a
   changed serializer each refuse, and each refusal names no secret.
3. **`c3` - the packet boundary holds at authorization time.** No absolute
   path, outside-project path, `.git`, `.cairn`, or `userData` path, image,
   binary, link, untracked or ignored file, dependency or generated area, or
   credential-like content can enter an authorization. Selection caps are
   exact: at most eight tracked text files, at most 8,000 characters each and
   32,000 total, rejected at the boundary rather than truncated silently.
4. **`c4` - route drift refuses.** A base URL, provider, configured model,
   resolved model, consent version, transport revision, serializer, tool mode,
   timeout, output cap, purpose, or attempt that differs from the authorized
   value refuses. An unresolved or `Auto` model refuses. A route advertising
   implicit server-side tools refuses.
5. **`c5` - one call, once.** An authorization is single-use and bound to its
   exact request and attempt: replay, a second send, a cross-request or
   cross-attempt swap, a stale authorization after the request changed, and a
   forged or lookalike branded object all refuse without consuming the genuine
   one. Attempts are bounded by the frozen call budget.
6. **`c6` - verified isolation and regression safety.** Focused critic tests,
   the complete Core suite, typecheck and build, exact diff and status,
   darkness searches proving no App caller, no advertised capability, an empty
   activation registry and no transport, and an independent adversarial review
   all pass. No dependency, provider or network call, credential, real app
   profile, Electron run, or external write occurs.

## DONE and STOPPED

**DONE** means all six checks pass, one authenticated request yields exactly
one approvable call whose every bound fact is verifiable, no wider or later
send can be authorized, Task 209's and Task 215's behavior is unchanged, one
report and log row record the evidence, the Task 216 paths land in one
exact-path final commit, and `main` is clean. **STOPPED** means an
authorization can be minted without an authenticated request, a body can differ
from what was approved, a tool schema or a path outside the consent can enter a
call, a credential can reach any recorded value, an authorization can be
replayed, or anything added here is reachable from normal routing.
