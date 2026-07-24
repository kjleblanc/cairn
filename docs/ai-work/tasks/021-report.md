# Task 021 — Report

What changed: created `app/src/main/conductor/client.ts` (streaming client with 
5 exports: SlotWithKey, ChatTurnMessage, StreamEvent interfaces; 
ConductorHttpError class; ownerMessageFor, buildRequestBody, streamChat 
functions); created `app/tests-unit/client.test.ts` (4 tests covering request 
body shape, streaming protocol, error masking, and status messages); updated 
`app/tsconfig.unit.json` to include client.ts in the unit test compile.

Checks run: unit test suite `cd app && npm run test:unit` — 33 tests pass 
(28 existing + 5 new including body-release test); typecheck `npm run typecheck` 
— clean, no errors or warnings. No new dependencies added.

How to try it: import { streamChat } from "./src/main/conductor/client.js" in 
any conductor component; pass a SlotWithKey (baseUrl, model, apiKey) and an 
array of ChatTurnMessage; consume the AsyncGenerator<StreamEvent>. The 
generator yields delta events for text chunks, a usage event with token counts 
and cost, and a done event when streaming completes. HTTP errors (401, 402, 
404, 429, 5xx) raise ConductorHttpError with a plain-English ownerMessage and 
never expose the API key or provider response body.

Limitations: no retry logic; no timeout handling beyond AbortSignal; assumes 
UTF-8 encoded SSE protocol. Cost calculation depends on provider-supplied cost 
field; if absent, costUsd is undefined.

Review fix: http errors now release the response body via cancel() to prevent 
socket pool exhaustion in long-lived processes; covered by a new test.

Milestone movement: NO

Disposition: DONE
