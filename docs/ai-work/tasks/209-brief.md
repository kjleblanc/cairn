# Task 209 brief - strict critic assessment and deterministic policy

**Lane:** A (the main checkout)

**Base commit:** `0f6501e2f3462523cb4f1e55b0256586731cc8b8`

**Plan position:** Prerequisite Q, Task Q2 only. Q3 and owner-verdict Plan 2
remain unstarted.

## Requested visible outcome

Cairn Core can strictly parse one bounded, hash-bound `CriticOutputV1`, wrap it
with separately supplied main-authored custody as a branded and canonical
`CriticAssessmentV1`, and derive advisory notes, owner-waiting allegations, and
real blockers only through the design's closed judge/native-confirmation
rules. Minor criticism, confidence, self-check, issue count, invented scope,
and a model-supplied global verdict have no blocking authority.

This is Task Q2 from
`docs/superpowers/plans/2026-08-07-cairn-quality-intent-and-critic-prerequisite.md`.

## Boundary of intent - what must not change

- Implement Q2 only in the declared Core source, tests, bounded fake fixtures,
  calibration manifest, exports, and explicit test list. Do not implement Q3
  proposal/preview wiring, live packet selection, provider transport, repair,
  pending-candidate custody, UI, calibration calls, activation, or
  owner-verdict Plan 2.
- Preserve Task 208's authenticated intent, frozen Task Spec, evidence-plan,
  fixed-budget, and empty activation semantics. The critic cannot reinterpret
  intent, add criteria, edit work, approve risk, write a verdict, or seal a
  result.
- Main alone supplies run, round, attempt, route/model/consent, request/packet/
  candidate hashes, policy/prompt identity, and time. Model output is untrusted
  data and carries no custody metadata or global decision.
- Add no dependency or generated artifact. Make no network/provider/model
  call, use no credential, and perform no install, app/E2E run, push, publish,
  or deployment. Fixtures are local, synthetic, bounded, and secret-free.
- Existing task records and Task 207's design/plan are history and are not
  rewritten. Concurrent lane work remains protected.

## Checks that will show the outcome holds

1. **`c1`** - `core/src/critic.ts` exposes Q2's versioned packet/request/output/
   assessment/finding/comparison/result/owner-evidence types and strict parser
   with exact keys, fixed caps, bounded safe text, ordinary dense arrays/
   records, deep detachment/freezing, contiguous/unique ids, exact hashes, and
   rejection of accessors, Proxies, symbols, sparse arrays, unknown authority
   fields, missing/duplicate criteria, unresolved evidence, and malformed
   cross-field relationships.
2. **`c2`** - only branded Task Specs and exact main-authored packet/request/
   custody inputs can compose a branded assessment; canonical bytes and
   SHA-256 bind every output and custody field while model-authored run/round/
   route/time/hash fields fail parsing. Assessment shape has no pass/fail,
   blocks, disposition, owner-verdict, dispatch, edit, or self-authorizing
   field.
3. **`c3`** - `deriveCriticPolicy` implements the one closed predicate: Cairn
   and owner checks obey their authenticated evidence; a critic-judged `cN`
   allegation waits for an exact authenticated owner confirmation before it
   can block; unrelated evidence, failure-condition mismatch, confidence,
   severity, self-check, invented expectations/scope, issue count, `pN`, and
   Minor/Suggestion notes produce no critic blocker. Repeated root causes group
   related valid allegations into one pending resolution/blocker.
4. **`c4`** - comparisons bind exact packet trials and per-trial A/B order,
   A/A cannot name a winner, tie and `cant-tell` remain distinct, prompt
   injection remains inert data, and each closed unscoped alert maps only
   through an independently supplied native verifier pass/fail/cant-tell to
   advisory/native STOPPED/`BOUNDARY_EVIDENCE_UNAVAILABLE`. Malformed or
   unavailable critic output maps to `CRITIC_UNAVAILABLE`, never product
   failure.
5. **`c5`** - bounded synthetic JSON fixtures and the preregistered
   `critic-v1.md` manifest cover clean-with-ten-notes, real critic allegation
   before/after owner confirmation, blocker-free bait, wrong-judge and forged
   authority/evidence cases, grouped root cause, A/A and swapped A/B, prompt
   injection, post-repair Minor regression, native boundary outcomes, and
   malformed output, with expected policy results only and no paid result or
   active tuple.
6. **`c6`** - focused and full Core offline checks pass, `git diff --check`
   passes, independent adversarial review finds no unresolved Q2 authority or
   policy escape, repository inspection proves no live caller/provider route,
   and final diff/status contain only Task 209's declared implementation,
   tests, fixtures, manifest, report, and append-only LOG row.

## What DONE and STOPPED mean here

**DONE:** Core can strictly custody critic output and derive policy without
letting criticism manufacture authority; the implementation remains dark and
all Q2 offline evidence passes.

**STOPPED:** Q2 would require trusting model prose/global verdicts, changing
Task 208 authority, activating a provider route, accepting unbounded data, or
moving behavior owned by Q3 or later. The report will preserve the state and
name the smallest safe next decision.
