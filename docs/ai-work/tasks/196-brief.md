# Task 196 brief — verify the zero-behavior conductor transport seam

**Lane:** E

**Base commit:** `41acbc277e2257243d77b6f4019773ccaec50e60`

## Requested visible outcome

Existing OpenRouter and compatible/custom conductor conversations continue to
look and behave exactly as they do now, while the main-process conductor
service depends on a provider-neutral transport seam instead of assuming every
future provider uses the current OpenAI-compatible client.

This is a fresh implementation of only **Task 1 — Extract the conductor
transport seam with zero behavior change** from
`docs/superpowers/plans/2026-08-06-cairn-model-connections.md`. Task 195 is
stopped evidence on Lane C and will not be merged; only its reviewed ideas and
fake-test matrix may be ported onto this newer landed source.

## Boundary of intent — what must not change

- Do not implement Slice 1B or any later model-connections task. In particular,
  do not add manual redirect handling or otherwise change current redirect
  behavior.
- Preserve the current consent timing, history/prompt assembly, request URL and
  headers, compact request JSON, selected model, payload limits,
  provider-visible behavior, SSE event boundaries/order, finish behavior,
  cancellation, usage handling, request-ID behavior, and owner-safe errors.
- Preserve the working OpenRouter and compatible/custom endpoint route.
- Keep `app/src/main/conductor/client.ts` as the compatibility wrapper and keep
  one runtime error-constructor identity for existing `instanceof` callers.
- Preserve all Tasks 184–194 behavior now present in the landed
  `app/src/main/conductor/service.ts`; do not replace that file with Task 195's
  older version.
- Add no dependency, schema, connection store, catalog, Auto selection, role
  assignment, UI, contract, credential, provider configuration, or worker
  behavior.
- Use fake-only automated tests. No provider login, credential use, metadata
  request, model call, dependency change, install, push, publish, or deployment
  is authorized.
- Touch only Task 1's named source/test/config paths plus this task's report and
  append-only LOG row. Every other lane and the Task 180/183 recovery branch
  remain protected.

## Implementation plan (AI decisions)

1. Compare the current landed client/service behavior with Task 195's stopped
   patch and port only the provider-neutral types, compatible transport,
   wrapper, narrow factory injection, and fake-only behavior pins.
2. Use a strict discriminated transport-event union and a neutral redacted
   transport-error base while preserving the public HTTP subclass.
3. Keep fake `fetch` injection implementation-specific; the provider-neutral
   factory receives only its connection.
4. Put the factory at the current service's existing transport-call point,
   after all present consent, persistence, prompt-size, and history logic.
5. Run the exact Task 1 checks in this already-prepared lane and repair only
   in-scope failures.

## Checks that will show the outcome holds

1. The transport contract pins exact chat-completions request bytes, current
   headers and default redirect behavior, OpenRouter/custom URL construction,
   SSE ordering and malformed frames, finish/request-ID non-use, EOF, usage
   edges, cancellation identity, 401, 429, 5xx, body cleanup, and network-error
   normalization with inert fakes only.
2. Existing client coverage continues to pass, and a fake service factory
   proves selection does not branch on a provider hostname.
3. From `app`, run exactly:
   - `npm.cmd run test:unit`
   - `npm.cmd run typecheck`
   - `npm.cmd run build:vite`
4. Inspect one fake `app/tests/conductor.spec.ts` conversation only if service
   wiring goes beyond complete unit coverage. Never contact a provider.
5. Run `git diff --check`, inspect the complete diff against the brief commit,
   and confirm final Lane E status contains only disclosed Task 196 paths.

## DONE and STOPPED

- **DONE:** the provider-neutral transport seam is implemented on current
  landed source; every exact Task 1 check passes; fake tests prove zero change
  to consent, payload, stream/error/cancellation behavior, and the existing
  OpenRouter/custom route; the report, LOG row, and exact-path local commit are
  complete.
- **STOPPED:** any current behavior changes, fake-only coverage cannot prove
  the seam, a required check fails without a safe in-scope repair, protected
  work changes, or completion would require Slice 1B, a later task, dependency
  work, provider access, or another unapproved external action.
