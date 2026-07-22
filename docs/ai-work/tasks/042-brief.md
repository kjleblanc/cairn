# Task 042 brief — Add credential-opaque Codex event diagnostics

Date: 2026-07-22

## Requested visible outcome

When one confirmed Codex Exec process completes without model task records, Cairn
retains bounded numeric evidence showing how many completed agent messages, command
executions, file-change items, and failed command/file-change items the JSONL stream
contained. The result screen and safety report show those counts without retaining
or exposing message text, reasoning, commands, paths, stdout, stderr, thread IDs,
account details, authentication data, or credentials.

## Files or areas that may change

- `core/src/codex.ts`, `core/src/routing.ts`, and `core/src/serial.ts`
- focused core fake-process tests
- Desktop stopped-result diagnostic wording and focused Electron tests
- current README/changelog wording
- this Task 042 report and one append-only `docs/ai-work/LOG.md` row

No dependency entry or lockfile may change. No real Codex process may start.

## Protected starting work

- Project root: `C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework`
- Starting branch: `main`, seven commits ahead of `origin/main`
- Starting HEAD: `9227db8` (`Task 041: retain bounded missing-record evidence`)
- Starting working tree and index: clean
- Tasks 000–041 and all existing log rows are append-only history

## First useful checkpoint

A fake JSONL stream includes completed agent-message, command-execution, and
file-change items plus failed items containing secret-looking text. Cairn returns
only fixed non-negative numeric counters. A fake serial task with no model records
stops as `MODEL_RECORDS_MISSING` and places those safe counts in its activity feed
and safety report while the secret-looking text is absent everywhere.

## Checks

- Counters increment only from `item.completed` JSONL objects with known item types.
- Failure count increments only for a known command/file-change item whose status is
  `failed` or whose numeric exit code is nonzero.
- The adapter result schema remains exact, primitive, frozen-by-contract, and
  rejects hidden fields, accessors, symbols, and invalid counters.
- Malformed JSONL still fails closed; raw process output remains discarded.
- Electron STOPPED output shows the fixed safe code and numeric diagnostic line.
- Core, CLI, Desktop typecheck, and Electron smoke checks pass.
- `git diff --check` and dependency/scope audits pass.
- No real Codex process or model call runs.

## Important assumptions

- Official Codex documentation says `--json` streams `item.*` events and documents
  agent messages, command executions, and file changes as item types.
- Official documentation also says `workspace-write` plus `on-request` is the Auto
  mode that can edit and run commands inside the working directory automatically.
  Task 041 therefore does not justify widening the sandbox or disabling it.
- Numeric counts are sufficient for the next diagnostic decision and do not expose
  provider text or credential-adjacent values.

## DONE and STOPPED

DONE means bounded item counters flow from fake JSONL through the exact adapter
result into a safe missing-record report/UI, secret-looking payloads never surface,
all fake-only checks pass, and the result is committed by exact path.

STOPPED means useful diagnostic evidence would require raw provider output, another
model call, broader sandbox authority, credential inspection, or a generic tracing
framework.
