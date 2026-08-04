# Task 175 brief - source-bound task intent contract

**Lane:** B

**Base commit:** `3596137d0840ceabe91e0ad47a374bb1f33d059c`

## Requested visible outcome

Implement Plan 4's first additive slice: Core can represent one task as a
source-bound, immutable intent whose outcome and requirements say **You said
so**, **You weren't sure**, or **Cairn chose** without trusting model-supplied
provenance.

The new public contract must:

- bind owner-attributed rows to an exact verified UTF-16 span of authenticated
  conversation text or exact direct input;
- keep ordinary context separate from attributed requirements;
- project an output-only request view that contains no IDs or offsets;
- serialize and hash every authority-bearing byte in one fixed canonical
  order; and
- fail closed on malformed, over-bound, accessor, proxy, prototype, Unicode,
  and mutation attempts.

This task builds only the pure Core foundation. It does not yet change the App,
CLI, adapters, worker contract, task records, cards, or visible product flow.

## Boundary of intent - what must not change

- Existing shipped Core, App, CLI, adapter, report, persistence, consent,
  evidence, and phone signatures and behavior remain unchanged.
- No legacy task or conversation data is upgraded, relabelled, normalized,
  truncated, or guessed.
- Candidate data may describe an interpretation and quote owner text, but it
  may never supply trusted input IDs or offsets. Binding must re-derive source
  text from caller-supplied authenticated sources, choose the latest matching
  input and its first matching span, and reject when there is no exact match.
- The fixed limits and three protocol labels in the corrected Task 174 plan are
  authoritative, including 2,000 accepted source characters and rejection at
  2,001.
- Canonical serialization must cover version, source kind, input ID, offsets,
  exact source text, interpretations, ordering, and context. A change to any
  one must change the SHA-256 request digest.
- No dependency, project fact, milestone, provider data scope, credential,
  paid/real model call, external write, publish, push, or app/Electron run is in
  scope.
- Only `core/src/intent.ts`, `core/src/index.ts`, `core/test/intent.test.ts`,
  `core/package.json`, and this task's records may change unless an adjacent
  correction is required and disclosed.

## Implementation plan (AI decisions)

1. Follow Core's existing public validation style and define the Plan 4 intent,
   candidate, source-span, request-view, and digest APIs in one pure module.
2. Inspect hostile values by property descriptors and reject proxies before
   reading them; accept only ordinary/null-prototype records and ordinary
   arrays with enumerable own data properties.
3. Bind candidate quotations against caller-supplied authenticated sources,
   deterministically derive UTF-16 spans, deep-copy and deep-freeze the result,
   and expose only the bounded view to consumers.
4. Add fixed-order canonical serialization and SHA-256 hashing that changes for
   source-only, ordering, interpretation, exact-text, and context changes.
5. Add focused tests for valid firm, tentative, delegated, direct, multiline,
   whitespace, and Unicode input plus every malformed, hostile, duplicate,
   overflow, mutation, and 2,000/2,001 boundary named by Plan 4.
6. Export the new API and explicitly add its compiled test file to Core's
   `node --test` list without replacing any existing caller.

## Checks that will show the outcome holds

1. `cd core && npm.cmd test` passes and its output explicitly includes the new
   intent cases; `core/package.json` names `dist/test/intent.test.js`.
2. Tests prove exact source-span derivation, latest-turn/first-span matching,
   direct-source round trips, view redaction, deep freezing, fixed-order
   serialization, and source-sensitive digest changes.
3. Tests prove rejection before accessor execution for symbols, accessors,
   custom prototypes, non-enumerable properties, proxies, invalid spans,
   duplicate rows, forbidden Unicode, unpaired surrogates, and every fixed
   count/character limit.
4. Existing Core tests stay green, `npm.cmd run build` succeeds, and no shipped
   signature or data-scope string changes.
5. Independent read-only review finds no remaining correctness, trust,
   compatibility, or test-evidence blocker; `git diff --check` and final exact
   status match the disclosed task paths.

## DONE and STOPPED

- **DONE:** the additive public Core contract is implemented, hostile and
  boundary behavior is executable and passing, the intent suite is actually
  enumerated by `npm test`, existing callers remain green, review blockers are
  resolved, and the exact changes are committed with one report and log row.
- **STOPPED:** trustworthy binding would require model-authored authority,
  validation would invoke hostile code, canonical bytes omit an authoritative
  field, an existing shipped signature must change in this slice, protected
  work changes unexpectedly, or verification cannot prove the boundary.
