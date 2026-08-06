# Task 196 report - zero-behavior conductor transport seam

**Lane:** E

**Base commit:** `41acbc277e2257243d77b6f4019773ccaec50e60`

**Brief commit:** `bc13b245e6dccbbab717e3e70894ecf4143c13b6`

**Milestone moved:** NO

## Outcome

The conductor service now streams through a provider-neutral transport factory,
with the current OpenAI-compatible transport as its only implementation. The
existing `client.ts` entry point remains as a compatibility wrapper.

The current OpenRouter and compatible/custom route is unchanged: the transport
constructs the same chat-completions URL, headers, compact JSON body, model,
messages, usage option, and AbortSignal; keeps fetch's existing default redirect
behavior; parses and orders SSE events the same way; ignores finish reason and
request ID as before; performs the same body cleanup; and preserves the same
owner-safe HTTP errors and generic network-error path. Consent, history and
prompt assembly, prompt-size rejection, key decryption point, persistence, and
public streaming behavior remain in their existing service order.

Only Task 1 of the model-connections plan was implemented. Slice 1B and all
later connection, redirect, catalog, assignment, Auto, UI, storage, and worker
work remain absent.

## What changed

- `docs/ai-work/tasks/196-brief.md` claimed Task 196 on landed main before
  implementation.
- `app/src/main/conductor/transports/types.ts` defines neutral request,
  message, stream-event, usage, finish, request-ID, redacted-error, transport,
  and factory shapes, plus the existing prompt-size guard.
- `app/src/main/conductor/transports/openai-compatible.ts` contains the moved
  HTTP request, SSE parser, error mapping, and body-cleanup behavior and exposes
  the current compatible transport factory.
- `app/src/main/conductor/client.ts` remains the legacy-compatible public
  wrapper, retains mutable input types and the existing HTTP error constructor
  identity, and delegates to the compatible transport.
- `app/src/main/conductor/service.ts` receives a transport factory at the
  existing call boundary, defaults it to the compatible implementation, and
  handles the neutral redacted transport error without changing surrounding
  consent, prompt, stream, persistence, or Tasks 184-194 behavior.
- `app/tests-unit/conductor-transport.test.ts` adds inert fake-only contracts
  for exact request bytes and default redirect behavior, compatible/custom URL
  construction, malformed and split SSE frames, event order, usage, EOF,
  ignored finish/request ID, cancellation identity, 401/429/5xx redaction,
  cleanup failures, network errors, legacy compatibility, neutral shapes, and
  service factory wiring.
- `app/tsconfig.unit.json` includes the two new transport sources in unit
  compilation.
- `docs/ai-work/tasks/196-report.md` is this report.
- `docs/ai-work/LOG.md` receives the append-only Task 196 row.

No dependency, credential, provider account, provider/model/metadata call,
installation, schema, consent rule, project fact, push, publication,
deployment, production system, or production data changed.

## AI decisions and review record

- The compatibility-specific `{ baseUrl, model, apiKey }` connection input is
  intentionally transitional. Task 1 makes requests, events, errors, and the
  service dependency neutral without prematurely designing later connection
  storage or native-provider routes.
- The transport event is a strict discriminated union, while `client.ts` keeps
  its original looser event interface and mutable input interfaces for existing
  TypeScript callers.
- One neutral error base gives the service one owner-safe catch point. The
  existing `ConductorHttpError` subclasses it and is re-exported from
  `client.ts`, preserving one constructor identity for `instanceof` callers.
- Fake `fetch` injection stays on the concrete compatible factory; the neutral
  factory receives only the connection and returns a transport.
- Service injection is covered in two parts without loading Electron: a pure
  fake factory proves the executable connection/request/event contract, and a
  narrow source contract proves `streamTurn` uses that factory exactly once at
  the existing post-cap/key boundary and contains no provider-host selection.
- Three independent read-only reviews compared the stopped Task 195 ideas with
  current Tasks 184-194 source. They required a narrow manual reconciliation of
  `service.ts` and preservation of the legacy mutable client types. The final
  implementation includes both corrections and retains all later landed
  service behavior.

## Checks run and real results

All output was observed in Lane E's task terminal and was not saved into the
repository.

1. Red-first unit compilation from `app`: `npx.cmd tsc -p
   tsconfig.unit.json`.
   - Before the new sources existed, it failed as expected with missing
     transport modules and dependent type errors.
2. Focused fake-only compile and tests from `app`: `npx.cmd tsc -p
   tsconfig.unit.json`, then `node --test
   dist-unit/tests-unit/client.test.js
   dist-unit/tests-unit/conductor-transport.test.js`.
   - Final result: **20 passed, 0 failed**.
3. Exact Task 1 unit command from `app`: `npm.cmd run test:unit`.
   - **461 total, 459 passed, 0 failed, 2 Windows host-specific skips**.
4. Exact Task 1 typecheck command from `app`: `npm.cmd run typecheck`.
   - Passed with no TypeScript errors.
5. Exact Task 1 production build from `app`: `npm.cmd run build:vite`.
   - The first sandboxed attempt was blocked before config loading because
     esbuild could not traverse the worktree path. The identical command was
     rerun outside that filesystem sandbox, with no network access, and passed:
     main **64 modules**, preload **1 module**, renderer **73 modules**.
6. `git diff --check`, complete exact-path diff inspection, and final status
   inspection:
   - Passed. The implementation contains no `redirect` request option, so the
     compatible route still uses fetch's prior default behavior. The service
     diff is limited to neutral imports/types, the default factory, the one
     transport call, and the neutral error catch; later landed logic is intact.

No Electron/Playwright conversation was needed: the service wiring stayed
inside the complete fake unit proof described above. No real provider,
credential, metadata endpoint, model, worker, external service, or remote was
contacted.

## How to try it

This task is deliberately invisible in normal use. The decisive safe check is:

```powershell
cd "C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework\.lanes\e\app"
npm.cmd run test:unit
npm.cmd run typecheck
npm.cmd run build:vite
```

The compatible transport contract is in
`app/tests-unit/conductor-transport.test.ts`; it uses inert fake fetch
implementations only.

## Limitations

This task provides the seam only. It does not make redirects fail closed, add a
second transport, migrate connection storage, discover models, assign Cairn or
Builder roles, implement one-task overrides or conversation-sticky Auto, or
change any user-visible connection flow. Those remain later serial tasks.

Disposition: **DONE**
