# Task 175 report - source-bound task intent contract

**Lane:** B

**Base commit:** `3596137d0840ceabe91e0ad47a374bb1f33d059c`

**Brief commit:** `9f634e8`

**Milestone moved:** NO

## Outcome

Plan 4's first additive implementation slice is complete. Core now has one
public, immutable task-intent contract that can distinguish **You said so**,
**You weren't sure**, and **Cairn chose** without accepting provenance written
by a model.

An owner-attributed candidate carries only an exact quotation. Core binds that
quotation to caller-authenticated input, choosing the latest matching owner
turn and its first exact UTF-16 span. Direct App/CLI input must bind to the
whole raw input. The resulting intent is copied, deeply frozen, serialized in
one fixed authority-bearing order, and SHA-256 hashed. A public request view
keeps the visible interpretation and quotation while omitting input IDs,
offsets, context, and protocol metadata.

The boundary fails closed on malformed records, untrusted IDs or offsets,
alternate source spans, accessors, proxies, symbols, custom prototypes,
non-enumerable properties, sparse or subclassed arrays, mutation, cycles,
over-limit input, NUL, bidi controls, and unpaired surrogates. Serialized
intents must be revalidated against their authenticated sources before they
can be serialized, hashed, or projected again.

This is deliberately a pure Core foundation. It does not yet change Cairn's
cards, prompts, App/CLI task entry, adapters, worker contract, records,
persistence, consent, evidence, phone view, or visible product behavior.

## What changed

- `docs/ai-work/tasks/175-brief.md` claimed Task 175 alone in lane B and fixed
  the additive outcome, trust boundary, permitted paths, and checks.
- `core/src/intent.ts` adds the candidate, authenticated source, bound intent,
  owner-span, request-view, canonical JSON, digest, validation, binding, and
  direct-input APIs.
- `core/src/index.ts` exports the new public module.
- `core/test/intent.test.ts` adds 23 focused cases covering valid, hostile,
  mutation, canonicalization, attribution, and exact-boundary behavior.
- `core/package.json` explicitly includes `dist/test/intent.test.js` in the
  Core test command, so compilation cannot masquerade as test execution.
- This report and the Task 175 row in `docs/ai-work/LOG.md` are the task memory.

No dependency, existing runtime signature, data-scope string, project fact,
milestone, legacy record, or generated artifact changed.

## AI decisions

- Candidate data is untrusted interpretation plus quotation, never authority.
  Authenticated source IDs are canonical lowercase UUIDv4 values supplied by
  the caller, and Core derives every offset and stored source byte itself.
- Conversation binding is deterministic: scan newest to oldest and select the
  first occurrence in the newest matching turn. Direct binding accepts only
  the complete raw input at offset zero. Revalidation enforces the same rule.
- The authenticated-source collection shares the App's existing 200,000
  UTF-16-code-unit history ceiling. Because every source is meaningful and
  non-empty, that character boundary is also the only reachable count bound;
  valid histories are not silently cut off at an unrelated turn count.
- `parseTaskIntentCandidateEnvelopeJson()` charges the 12,000-code-unit limit
  against the complete raw `{intent, risks}` fence body before JSON decoding.
  The next Plan 4 task must exact-validate that outer object, then pass only its
  inner `intent` value to `parseTaskIntentCandidate()`.
- Only module-created, frozen objects carry private validation brands.
  Structural copies must use `validateTaskIntent()` with the authenticated
  sources before authority-sensitive helpers will accept them.
- Canonical JSON is assembled in a fixed key order rather than delegated to a
  caller-controlled serializer. It binds version, label, interpretation,
  source kind and ID, offsets, exact source text, requirement order, and
  context order into one UTF-8 SHA-256 digest.

## Review and repair record

Independent read-only reviews were used throughout implementation; reviewers
did not edit task files.

- Contract/test review identified missing boundary evidence during the first
  draft. The focused suite was expanded until each Plan 4 hostile-input,
  mutation, canonical-byte, source-span, redaction, and 2,000/2,001 boundary
  was executable rather than implied.
- Security review found that serialized-intent revalidation originally proved
  only that a stored span existed somewhere. That could preserve an older
  matching turn, a second occurrence, or a partial direct source instead of
  the canonical span. Failing cases reproduced all three paths; binding and
  revalidation now share the same latest-turn, first-occurrence, whole-direct
  rule.
- Final integration review found two lower-severity seams: an unrelated
  256-source cap could reject a valid short-turn provider history, and a bare
  inner-intent JSON parser did not prove the 12,000-character cap on the real
  outer model response. The implementation now aligns source count with the
  existing 200,000-character history boundary and exposes the bounded outer
  envelope parser described above.

The final security re-review reported **no remaining blocker** and reran the
focused suite at 23/23. A separate final Plan 4 compliance review also reported
no remaining blocker.

## Checks run and real results

1. `cd core && npm.cmd run build`
   - Passed. Contract assets synced and TypeScript compiled.
2. `cd core && node --test dist/test/intent.test.js`
   - Passed: 23 tests, 23 passed, 0 failed. The output explicitly names the
     complete outer-envelope cap, canonical revalidation, source bounds,
     hostile values, canonical bytes, and redacted view cases.
3. `cd core && npm.cmd test`
   - Passed: 174 tests, 174 passed, 0 failed. The compiled intent suite was
     visibly enumerated inside the full command. The locally allowed run was
     required for the existing Windows child-process watchdog behavior.
4. `cd cli && npm.cmd test`
   - Passed: 18 tests, 18 passed, 0 failed.
5. `cd app && npm.cmd run typecheck`
   - Passed with no TypeScript errors.
6. `cd app && npm.cmd run test:unit`
   - Passed: 308 tests total, 306 passed, 0 failed, with the same two
     Windows/platform skips.
7. `cd app && npm.cmd run build:vite`
   - Passed: main, preload, and renderer production bundles built. A first
     restricted-sandbox attempt could not traverse to Vite's worktree config;
     the identical locally allowed command passed.
8. `cd app && npm.cmd run build:lab`
   - Passed: the design-lab production bundle built under the same local
     allowance.
9. Independent review, `git diff --check`, exact-path diff inspection, and
   final lane status
   - Passed. No remaining correctness, trust, compatibility, scope, or
     test-evidence blocker was reported. Generated build output stayed ignored,
     and only the disclosed task paths were committed.

No Electron or Playwright run was needed for an additive pure-Core task with no
visible product behavior. No app token was acquired. No real provider, paid
model, credential, dependency change, external service, publish, push, or
external write was used.

## How to try it

1. From `core/`, run `npm.cmd test` and find all 23 lines beginning `intent:` in
   the TAP output. This proves the new suite is both compiled and executed.
2. Read `core/test/intent.test.ts` beside `core/src/intent.ts`. The first cases
   show candidate binding, direct-input preservation, source-sensitive hashes,
   serialized revalidation, and the output-only view without invoking the App.
3. Continue with Plan 4 ordered implementation task 2. Its `cairn-task` parser
   must call `parseTaskIntentCandidateEnvelopeJson()` on the complete raw fence,
   exact-validate `{intent, risks}`, and then bind the parsed inner candidate to
   main-authenticated owner turns.

## Limitations and remaining judgment

- The current product still uses its legacy task proposal and dispatch shapes;
  owners will not see the three source labels until later Plan 4 tasks wire the
  App, worker, records, result card, commentary, and phone.
- This module can verify an exact quotation against authenticated inputs. It
  cannot prove that a conversation model split ideas well, noticed every hedge,
  or selected the best interpretation; those behaviors need the later fake and
  separately approved real-model evaluations in Plan 4.
- The caller remains responsible for supplying only genuinely authenticated
  owner turns in oldest-to-newest order. Task 2 adds that main-owned custody.
- The 12,000-character helper intentionally decodes but does not define the
  App-owned `risks` schema. Task 2 must validate the exact outer envelope before
  it trusts or displays either field.
- Whether the eventual source labels and quotations feel calm and useful is
  still owner judgment after the visible implementation lands.

Disposition: **DONE**
