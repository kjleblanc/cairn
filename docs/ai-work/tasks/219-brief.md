# Task 219 brief - drive the Independent-critic card with synthetic calibration only

**Lane:** A (the main checkout). **Base commit:** `186a6b2`.

**Plan position:** Prerequisite Q, Task Q8, **stage 4 of 4**. Task 216 says
which call is approved; Task 217 is the only sender; Task 218 is the approval
card and one-use decision. This stage adds their only caller: a calibration-only
orchestrator for preregistered synthetic fixtures, plus the fake-only Electron
journeys deferred from stages 2 and 3. Q9, Q10, and owner-verdict Plan 2 remain
unstarted. Task 212 remains unmerged on `lane/g` and is not touched.

## Requested visible outcome

Cairn can drive its real **Independent critic** approval card for one exact,
preregistered synthetic calibration fixture while the live activation registry
is empty. Main derives the canonical request and its disclosure from an
immutable fixture id/hash pair; the owner approves or declines that exact call;
and only an approval can release exactly one authorization to an injected fake
transport. The fake result is recorded before another fixture may begin, and a
restart, cancellation, stale press, or packet mismatch cannot create or repeat
a call.

The desktop journeys show the real card and prove approve, decline, stale,
cancellation, restart, and exact packet-boundary behaviour without a provider,
network request, credential, paid call, or project candidate. Calibration
results cannot activate themselves: activation remains empty before, during,
and after every path.

## Boundary of intent

- Implement Q8 stage 4, centred on new
  `app/src/main/criticcalibration.ts`, its unit tests, the smallest Main/IPC and
  test-fixture integration needed to drive the existing Task 218 surface, the
  guarded Electron journeys, and the preregistered synthetic input hashes those
  journeys prove. Do not implement Q9 repair, Q10's live calibration or
  activation, or owner-verdict Plan 2.
- The orchestrator accepts only a closed preregistered fixture id plus its exact
  hash and exact route authorization facts. It derives the request internally.
  It has no input for a project candidate, arbitrary packet, selected file,
  project root, provider body, tool, URL redirect, or activation entry.
- The four Task 218 provenance-based "not sent" claims must become verified
  facts before its card is driven. Synthetic packet material is immutable and
  path-free or selected by a test-proven closed synthetic selector; no caller
  may assert provenance booleans that the orchestrator simply trusts.
- Preserve Task 215's pending-run gate, Task 216's authorization, Task 217's
  one-shot sender and process ledger, Task 218's disclosure/decision semantics,
  and all legacy task behaviour. Main state and session lookup use the canonical
  project key consistently; a differently spelled path cannot decide a card and
  miss the snapshot.
- A completed fake result and its bounded usage are durably recorded before a
  next fixture can begin. No raw credential, project data, absolute path,
  `userData` path, provider prose outside the bounded result, or renderer claim
  becomes authority or durable state. Restart never replays a spent or pending
  call automatically.
- No production path may call a live provider in this task. The sender is
  injected and fake, the activation registry stays the empty frozen literal,
  no adapter advertises `packet-only-critic`, and no dependency or credential is
  added or used. Nothing is pushed, published, deployed, or written outside the
  repository and isolated test profiles.
- **Electron precondition:** immediately before the guarded Playwright check,
  the owner confirms Cairn is closed and not using the shared app profile. The
  lane then acquires the repository's app-token lock for the whole run and
  releases it afterwards. The AI never closes the owner's application itself.

## Checks

1. **`c1` - only an exact preregistered synthetic fixture can become a call.**
   The closed manifest is bounded to at most sixteen one-fixture requests and
   pins each fixture id, input hash, canonical packet/request hash, and expected
   output-fixture hash. Unknown, duplicated, missing, mismatched, cloned,
   accessor-backed, proxied, or extra-key input refuses before an approval or
   transport exists. No project candidate or arbitrary packet is accepted.
2. **`c2` - the card's packet boundary is true by construction.** The request
   bytes are exactly Core's pinned system message plus one canonical synthetic
   packet message with explicit generation parameters and no tools, functions,
   hidden history, extra message, redirect, credential, absolute/outside path,
   project root, `.git`, `.cairn`, `userData`, link, binary, ignored/untracked,
   dependency, generated, or wider content. Every selected synthetic text row
   and every provenance claim is derived and independently checked rather than
   accepted as a caller-supplied boolean. The existing metadata-count view stays
   exact against the whole packet.
3. **`c3` - one per-call decision drives at most one fake send.** Opening a
   fixture places its real Task 218 disclosure in the canonical run snapshot.
   Approve consumes the grant and authorization once and invokes the injected
   fake sender once; decline invokes it zero times. A malformed, mismatched,
   cross-project, stale, replayed, concurrent, already-cancelled, or replaced
   decision starts nothing and cannot consume a genuine current approval.
4. **`c4` - durable calibration state is ordered and restart-safe.** A bounded
   answered or unavailable fake result, its custody and usage, and the exact
   fixture/route/request identity are authenticated and durably recorded before
   another fixture may open. Cancellation and restart never auto-send, a spent
   call cannot be reconstructed and sent again, torn or forged state fails
   closed without deleting recoverable evidence, and renderer/project files
   cannot mint or alter the record.
5. **`c5` - calibration cannot activate itself or reach live/project data.** The
   activation count stays zero across approve, decline, failure, cancellation,
   persistence, and restart. The orchestrator has no activation-registry writer,
   project-candidate input, filesystem selector over a project, credential
   source, process primitive, or non-injected network primitive. A calibration
   result cannot advertise `packet-only-critic`, unlock normal task routing, or
   become an assessment without the exact transport custody Core requires.
6. **`c6` - the real desktop journeys and complete regression checks pass.**
   After the owner confirms the named single-tenant precondition and the app
   token is acquired, guarded fake-only Electron journeys prove approve,
   decline, stale, cancellation, restart, and packet boundary in the real
   window/profile with zero real provider traffic. Focused tests, both
   typechecks, App unit, Vite and lab builds, the complete Core suite, exact
   diff/status, and three owner-approved independent adversarial reviews also
   pass; every finding is verified, repaired or honestly recorded.

## DONE and STOPPED

**DONE** means all six checks pass; one exact preregistered synthetic fixture can
drive the real approval card and at most one injected fake send; every card
claim is demonstrably true; decline, stale, cancellation and restart send
nothing unintended; durable results precede a next call; activation remains
empty; the guarded Electron journeys run under the confirmed precondition; one
report and one log row answer every check; the exact Task 219 paths land in one
local final commit; and `main` is clean.

**STOPPED** means a project candidate or arbitrary packet can enter calibration,
an approval card can repeat an unverified provenance claim, any unapproved or
duplicate call can start, restart can replay a call, a calibration result can
activate routing or forge custody, a real provider/network/credential is needed
to prove the route, the single-tenant Electron precondition is not confirmed,
or recovery from durable state is unclear.
