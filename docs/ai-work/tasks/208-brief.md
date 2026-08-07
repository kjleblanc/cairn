# Task 208 brief — frozen Quality Plan kernel, with critic activation empty

**Lane:** A (the main checkout)

**Base commit:** `2f71bc75b5220751b793835c4eb79d7ac7dedf9f`

**Plan position:** Prerequisite Q, Task Q1 only. Q2 and owner-verdict Plan 2
remain unstarted.

## Requested visible outcome

Cairn's core can turn a candidate Quality Plan plus the already authenticated
owner intent into one strictly parsed, source-checked, deeply frozen, canonically
serialized and hash-bound `TaskSpecV1`. Invalid, vague, incomplete, hidden, or
overpowered criteria fail before they can become proposal or dispatch
authority. The desktop also has an exact critic-activation registry that is
empty by default, so the new types cannot cause a live critic call.

This is the first implementation task from
`docs/superpowers/plans/2026-08-07-cairn-quality-intent-and-critic-prerequisite.md`.

## Boundary of intent — what must not change

- Implement Q1 only: the Quality Plan/Task Spec kernel, its public core exports,
  the empty activation registry, and their offline tests. Do not implement Q2
  parsing/policy, evidence capture, critic packets, repair, pending-candidate
  custody, UI, calibration, production activation, or owner-verdict Plan 2.
- Preserve `TaskIntent` and its authenticated source-span semantics. New
  authority must resolve to those existing owner-stated rows or a bounded local
  contract section; it must not reinterpret or rewrite intent.
- No live proposal, dispatch, conductor, worker, connection, provider, model,
  receipt, result-card, verdict, Git, or UI behavior may change. No production
  caller may use `TaskSpecV1` or the activation registry in this task.
- Add no dependency or generated artifact. Make no network/provider/model call,
  use no credential, and perform no install, push, publish, or deployment.
- Existing task records and the Task 207 design/plan are history and are not
  rewritten. Concurrent lane work remains protected.

## Checks that will show the outcome holds

1. **`c1`** — `core/src/quality.ts` exposes Q1's versioned candidate/frozen
   types and strict parser with the design's fixed caps, exact keys, bounded
   text, safe UTF-16, ordinary dense arrays/records, and rejection of accessors,
   Proxies, symbols, sparse arrays, duplicate/noncontiguous ids, vague promises,
   malformed structured states, and unsupported production activation.
2. **`c2`** — binding and validation preserve intent provenance and enforce
   authority in both directions: an owner-stated outcome and every owner-stated
   requirement have exact `cN` coverage; every basis resolves; the supported
   path has exactly one Cairn/owner non-regression criterion; preferences and
   uncertain/Cairn-chosen references cannot become hidden gates; and critic
   required/optional/off plus judge rules fail closed as designed.
3. **`c3`** — only branded, deeply frozen Task Specs reach projection,
   canonical serialization, or hashing; canonical bytes are stable across
   ordinary key insertion order, every authority field affects the hash, the
   fixed whole-run budget is exact and has no invented dollar cap, and the
   output-only review projection does not expose mutable authority.
4. **`c4`** — `EvidencePlanV1` and its one permitted typed revision are
   validated exactly: a main-proven pre-assertion failure, owner action, and one
   closed mechanical change may revise a procedure once while the criterion's
   promise, basis, judge, failure condition, and evidence standard remain
   byte-identical; semantic weakening requires a new Task Spec.
5. **`c5`** — `app/src/main/criticactivation.ts` starts with no active tuples,
   accepts only exact calibrated provider/model/prompt/schema/policy/modality/
   no-tools identities, and rejects Auto, unresolved models, production
   activation, malformed values, and every unregistered tuple. Repository
   inspection proves it has no live caller outside its unit test.
6. **`c6`** — Q1's focused and full offline checks pass, including the core
   workspace suite, activation unit test, App unit suite and typecheck;
   `git diff --check` passes; independent review finds no unresolved Q1
   authority or activation escape; and final diff/status contain only Task
   208's declared implementation, tests, report, and append-only LOG row.

## What DONE and STOPPED mean here

**DONE:** Cairn has a tested, source-bound frozen Quality Plan/Task Spec kernel
and a tested empty critic-activation registry, with no runtime consumer or live
critic capability.

**STOPPED:** implementing Q1 requires changing existing authenticated intent
semantics, accepting vague/unbounded authority, activating a live route, adding
a dependency, crossing a provider/data/risk boundary, or altering behavior
owned by Q2 or later. The report will preserve the state and name the smallest
safe next decision.
