# Task 021 — OpenAI-compatible streaming client

Requested visible outcome: a production-grade streaming conductor client 
(OpenAI-compatible protocol) with plain-words error messages, usage capture, 
and abort signal support.

Boundary of intent: HTTP streaming only; no retry logic or provider-specific 
extensions. Error messages never include API keys or provider details. Usage 
events capture prompt/completion tokens and cost.

Checks: all 28 existing unit tests pass; 4 new tests pass (buildRequestBody, 
streaming deltas and usage, HTTP error handling with masked secrets, 
ownerMessageFor status coverage); typecheck clean; no dependencies added.

DONE means the outcome above holds and the checks pass. STOPPED means they do 
not.
