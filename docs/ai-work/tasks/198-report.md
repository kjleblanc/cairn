# Task 198 report - fail-closed inference redirects

**Lane:** E

**Base commit:** `be4b7ef5dce965cde252f15b096fab69ef09a595`

**Brief commit:** `ab8be7d2f7913e1e9110275b95b78a4fa32d3c0b`

**Milestone moved:** NO

## Outcome

Every request made by the current OpenAI-compatible inference transport now
uses manual redirect handling. Any response from status 300 through 399 is
rejected before SSE parsing with one fixed owner-safe error, after best-effort
body cleanup. Cairn never reads, retries, or follows the response's Location.

A required literal policy on `ConductorTransport` records the same reject-all
invariant for every later native inference transport. A reusable two-loopback-
origin fixture supplies the behavioral proof: for 301, 302, 303, 307, and 308,
both same-origin and cross-origin targets received zero requests, headers,
credentials, and body bytes while the intended source received exactly one
POST.

Normal OpenRouter and compatible/custom responses retain their exact prior URL,
headers, compact JSON body, model, messages, usage option, AbortSignal, SSE
ordering, cancellation, cleanup, and non-redirect error behavior. The conductor
service, consent, prompt/history assembly, OAuth browser callback, and metadata
clients were not changed.

Only Slice 1B of the model-connections plan was implemented. Task 2 and all
later connection, catalog, assignment, Auto, receipt, provider, worker, and UI
work remain absent.

## What changed

- `docs/ai-work/tasks/198-brief.md` claimed Task 198 from landed main before
  implementation.
- `app/src/main/conductor/transports/types.ts` adds the provider-neutral
  `reject-all` inference redirect policy and makes it required on every
  `ConductorTransport`.
- `app/src/main/conductor/transports/openai-compatible.ts` pins
  `redirect: "manual"`, rejects every 3xx before stream parsing, cancels any
  response body best-effort, and returns one fixed redacted HTTP/transport
  error without inspecting Location or response contents.
- `app/src/main/conductor/client.ts` re-exports the transport policy while
  preserving the legacy wrapper and its signatures.
- `app/tests/fixtures/fake-model-provider.mjs` adds two numeric-loopback fake
  origins and records only counts, paths, byte lengths, and hashes of inert
  request material; it retains no raw credential or project-body value.
- `app/tests-unit/client.test.ts` proves the legacy wrapper pins manual handling,
  exposes the mandatory policy, makes one request, and returns only the bounded
  redirect error.
- `app/tests-unit/conductor-transport.test.ts` adds the ten-case real-fetch
  redirect matrix, 300/304/399 boundary cases, hostile response material,
  missing-body and cleanup-failure cases, and pins the unchanged successful
  request and transport contract.
- `app/tsconfig.unit.json` compiles the reusable JavaScript fixture into the
  isolated unit output.
- `docs/ai-work/tasks/198-report.md` is this report.
- `docs/ai-work/LOG.md` receives the append-only Task 198 row.

No dependency, credential, provider account, provider/model/metadata call,
installation, schema, stored data, consent rule, project fact, push,
publication, deployment, production system, or production data changed.

## AI decisions and review record

- The redirect rule is a non-configurable provider-neutral literal on the
  transport contract. It is not accepted from renderer, connection, provider,
  or request data; concrete behavioral tests remain the proof that an
  implementation honors it.
- The existing `ConductorHttpError`/`ConductorTransportError` identity is kept
  rather than adding a new public error class. The redirect branch supplies a
  private fixed sentence and the numeric status, so existing service handling
  stays unchanged and no Location, status text, or response body can leak.
- The response body is canceled best-effort before the error is thrown. A
  cleanup failure cannot replace or enrich the bounded redirect error.
- The loopback fixture deliberately makes a followed target return valid SSE,
  making the pre-fix behavior fail decisively. It stores only hashes and counts
  for inert authorization/body canaries and omits query values from its
  observations.
- Three read-only implementation reviews examined real-fetch behavior, fixture
  design, and the transport contract before the patch. A final read-only diff
  review checked the implemented slice for bypasses, leaks, regressions, and
  later-task scope.

## Checks run and real results

All output was observed in Lane E's task terminal and was not saved into the
repository.

1. Red-first focused compilation from `app`: `npx.cmd tsc -p
   tsconfig.unit.json`.
   - Passed, proving the tests exercised the existing transport rather than
     depending on an unimplemented symbol.
2. Red-first focused tests from `app`: `node --test
   dist-unit/tests-unit/client.test.js
   dist-unit/tests-unit/conductor-transport.test.js`.
   - Failed as expected: **33 total, 18 passed, 15 failed**. The existing fetch
     omitted manual handling, and all ten matrix targets were contacted. The
     301/302/303 cases were replayed as GETs; the 307/308 cases replayed the
     POST body. Same-origin replays also carried authorization, demonstrating
     the precise issue the slice was required to close.
3. The same focused compile and tests after implementation.
   - **33 passed, 0 failed**. Every matrix target remained at exactly zero
     requests, header bytes, authorization bytes, and body bytes.
4. Exact Slice 1B unit command from `app`: `npm.cmd run test:unit`.
   - **474 total, 472 passed, 0 failed, 2 Windows host-specific skips**.
5. Exact Slice 1B typecheck command from `app`: `npm.cmd run typecheck`.
   - Passed with no TypeScript errors.
6. Exact Slice 1B production build from `app`: `npm.cmd run build:vite`.
   - The first sandboxed attempt was blocked before config loading because
     esbuild could not traverse the worktree path. The identical command was
     rerun with local filesystem access, with no network access, and passed:
     main **64 modules**, preload **1 module**, renderer **73 modules**.
7. `git diff --check`, complete exact-path diff inspection, and final status
   inspection:
   - Passed. Only the seven plan-named source/test/config paths, Task 198's two
     records, and the append-only LOG row are present. Main remains clean at the
     task's base commit, and no protected lane work entered this diff.

No Electron/Playwright or real-provider check was needed: this is an invisible
transport rule, and the real Node fetch against two local fake origins is the
direct behavioral proof. No credential, metadata endpoint, model, worker,
external service, or remote was contacted.

## How to try it

The decisive safe check is local and fake-only:

```powershell
cd "C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework\.lanes\e\app"
npm.cmd run test:unit
npm.cmd run typecheck
npm.cmd run build:vite
```

The redirect matrix is in
`app/tests-unit/conductor-transport.test.ts`; its servers bind only to
`127.0.0.1` on ephemeral ports.

## Limitations

This slice closes inference redirects only. It does not add another model,
connection storage, model discovery, model switching/picking UI, role
assignment, Builder defaults or overrides, conversation-sticky Auto, route
receipts, or any other Task 2+ capability.

Disposition: **DONE**
