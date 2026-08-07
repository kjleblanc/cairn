# Task 198 brief - make inference redirects fail closed

**Lane:** E

**Base commit:** `be4b7ef5dce965cde252f15b096fab69ef09a595`

## Requested visible outcome

Normal OpenRouter and compatible/custom conductor conversations continue to
behave as they do now. If an inference endpoint returns any HTTP redirect,
Cairn stops with one bounded owner-safe error before credentials or the
owner's project/conversation body can be replayed to the redirect target.

This implements only **Slice 1B - Make every inference redirect fail closed**
from `docs/superpowers/plans/2026-08-06-cairn-model-connections.md`.

## Boundary of intent - what must not change

- Do not implement Task 2 or any later connection, schema, catalog, storage,
  assignment, Auto, receipt, provider, worker, or UI work.
- Preserve normal request URL construction, headers, compact JSON, selected
  model, consent timing, history/prompt assembly, payload limits, SSE ordering,
  usage, cancellation, body cleanup, and non-redirect owner-safe errors.
- Reject 301, 302, 303, 307, and 308 for both same-origin and cross-origin
  inference responses. Never retry or follow a Location value.
- Keep redirect Location contents, credentials, query values, and provider
  response bodies out of owner messages, logs, task records, and fixtures.
- Do not change OpenRouter's provider-owned OAuth browser callback behavior or
  any separately documented metadata client.
- Use only inert fake loopback servers and fake fetches. No provider login,
  credential use, metadata request, model call, dependency change, install,
  push, publication, or deployment is authorized.
- Touch only Slice 1B's named source/test/config paths plus this task's report
  and append-only LOG row. Lane F's Task 197 `app.css` work and every other
  lane remain protected.

## Implementation plan (AI decisions)

1. Add a reusable local two-origin fake inference fixture that records exactly
   what each origin receives without contacting the network beyond loopback.
2. Write red tests covering 301, 302, 303, 307, and 308, same-origin and
   cross-origin targets, credential/body non-replay, redacted errors, no retry,
   and hostile Location values.
3. Set `redirect: "manual"` on the compatible inference request, reject every
   3xx before stream parsing, and encode the fail-closed redirect rule in the
   provider-neutral transport contract for later native transports.
4. Keep the existing client wrapper and all non-redirect behavior unchanged.

## Checks that will show the outcome holds

1. Red-first focused redirect tests fail against Task 196's default-following
   transport and pass only after the no-follow policy is implemented.
2. The two-origin matrix proves the first origin receives one intended POST
   while every Location target receives zero requests, headers, credentials,
   and body bytes for all five redirect statuses.
3. Existing compatible-transport and client tests continue to pin normal
   payload, stream, cancellation, cleanup, and error behavior.
4. From `app`, run exactly:
   - `npm.cmd run test:unit`
   - `npm.cmd run typecheck`
   - `npm.cmd run build:vite`
5. Run `git diff --check`, inspect the complete diff against the brief commit,
   and confirm final Lane E status contains only disclosed Task 198 paths.

## DONE and STOPPED

- **DONE:** all inference redirects are observed without following, every
  target remains untouched, one bounded redacted error reaches the service,
  normal compatible behavior and OAuth/metadata clients remain unchanged, all
  exact checks pass, and the report, LOG row, and exact-path local commit are
  complete.
- **STOPPED:** the HTTP client can replay a header/body before Cairn observes
  the redirect, the fix would alter OAuth or metadata behavior, a required
  check cannot pass with an in-scope repair, protected work changes, or
  completion requires a dependency, provider access, or a later plan slice.
