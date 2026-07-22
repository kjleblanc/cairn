# Task 034 brief — Enable one confirmed real Codex Exec call

Date: 2026-07-21

## Requested visible outcome

Cairn can run exactly one real, ephemeral, workspace-scoped Codex Exec task after
the owner explicitly confirms the provider, exact model, data scope, target project,
and one-call quota. The serial path then verifies and reports the model-authored task
result honestly.

## Files or areas that may change

- `core/src/codex.ts`, `core/src/routing.ts`, and `core/src/serial.ts`
- focused core tests for the real-process seam and serial result verification
- CLI confirmation and result wording plus focused CLI tests
- Desktop IPC, confirmation UI, activity/result wording, and Electron tests
- current package descriptions, guides, and changelog
- this task report and one append-only `docs/ai-work/LOG.md` row

No dependency manifest entry or lockfile may change.

## Protected starting work

- Project root: `C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework`
- Starting branch: `main`, 48 commits ahead of `origin/main`
- Starting working tree and index: clean
- Tasks 000–033 and all existing log rows are append-only history

## First useful checkpoint

A fake process crosses the same production execution seam once, receives the exact
`gpt-5.6-sol` ephemeral request on stdin, emits bounded JSONL completion evidence,
and lets the serial coordinator accept one valid model-authored report and log row.

## Checks

- Core, CLI, Desktop typecheck/build, and Electron tests pass.
- A fake executable proves one process only, exact workspace scope, explicit model,
  no retry or continuation, and no raw process output retained in public results.
- Missing or mismatched confirmation cannot start the process or create task records.
- Invalid JSONL, non-zero exit, missing/invalid task records, or protected-work
  changes fail closed without exposing raw provider or credential details.
- The normal UI and CLI show provider, model, data scope, exact project, and quota
  immediately before the real-call confirmation.
- No real Codex Exec process or model call runs during implementation or tests.
- No dependency, provider fallback, retry, continuation, scheduler, concurrency,
  generic provider framework, login flow, or credential inspection is added.

## Important assumptions

- Provider is OpenAI and the one pinned model is `gpt-5.6-sol`, resolved from current
  official OpenAI guidance on 2026-07-21.
- Data exposure includes the task prompt, `AGENTS.md`, the generated task brief, and
  any selected-workspace file Codex chooses to read while completing the task.
- The enforced quota is one ephemeral Codex Exec process with no retry or
  continuation. Connected-account pricing, credits, and limits apply. Cairn keeps
  the authentication method opaque, so it cannot promise a dollar-denominated cap.
- The model may make in-scope workspace edits and must follow `AGENTS.md`, write the
  one matching report, append one matching log row, and make one local exact-path
  commit when Git isolation is clear.

## DONE and STOPPED

DONE means the confirmed production path can make one real call, fake-process and
product checks pass, result records are verified, and no real call occurred while
building this capability.

STOPPED means that bounded capability or its checks did not complete, protected work
became ambiguous, or continuing would require an unapproved real model call or wider
product scope.
