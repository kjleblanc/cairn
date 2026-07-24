# Task 021 — Report

What changed: created `app/src/main/conductor/client.ts` (streaming client with 
5 exports: SlotWithKey, ChatTurnMessage, StreamEvent interfaces; 
ConductorHttpError class; ownerMessageFor, buildRequestBody, streamChat 
functions); created `app/tests-unit/client.test.ts` (4 tests covering request 
body shape, streaming protocol, error masking, and status messages); updated 
`app/tsconfig.unit.json` to include client.ts in the unit test compile.

Checks run: unit test suite `cd app && npm run test:unit` — 32 tests pass 
(28 existing + 4 new); typecheck `npm run typecheck` — clean, no errors or 
warnings. No new dependencies added.

How to try it: import { streamChat } from "./src/main/conductor/client.js" in 
any conductor component; pass a SlotWithKey (baseUrl, model, apiKey) and an 
array of ChatTurnMessage; consume the AsyncGenerator<StreamEvent>. The 
generator yields delta events for text chunks, a usage event with token counts 
and cost, and a done event when streaming completes. HTTP errors (401, 402, 
404, 429, 5xx) raise ConductorHttpError with a plain-English ownerMessage and 
never expose the API key or provider response body.

Limitations: no retry logic; no timeout handling beyond AbortSignal; no 
streaming backpressure (buffers entire response); assumes UTF-8 encoded SSE 
protocol. Cost calculation depends on provider-supplied cost field; if absent, 
costUsd is undefined.

Milestone movement: NO

Disposition: DONE
