# Task 150 — one confirmed real Codex Exec task

Requested outcome: In the desktop app's project picker, every remembered project has a visible 'Remove from this list' control; using it removes the project from the list without touching its folder or files on disk, and the folder can be re-opened afterward.

Supported outcome: Run one explicitly confirmed worker task through the connected adapter and verify its result and Git state.

Lane: **Standard** — one explicitly confirmed OpenAI Codex Exec call; the model may make in-scope local workspace changes.

## Details (verbatim)

> Owner confirmed scope: remove from Cairn's remembered-projects list only — never delete from disk. This is a fresh dispatch of the work the stopped Task 148 run attempted (its worker's account: Picker.tsx gained removal controls for healthy remembered projects and projects.spec.ts gained a reopen-safety test; typecheck and unit tests passed per that account, build:vite and the picker E2E were never run before the stop). Treat that account as a design hint only — re-verify everything from scratch.

## Route

- Adapter: Codex Exec
- Provider: OpenAI
- Model: gpt-5.6-sol
- Reason: Codex Exec is connected and supports serial tasks.

## Owned records

- `docs/ai-work/tasks/150-brief.md`
- `docs/ai-work/tasks/150-report.md`
- `docs/ai-work/LOG.md`

## Protected starting Git state

- HEAD: `03d90b1275adf0c16ca7cd307ed3673a74be183b`
- Working tree: existing changes protected
- Existing staged work: no

## Checks

- Confirm exactly one Codex Exec worker returns one completed result with bounded numeric evidence.
- Confirm the worker's final message carries one readable cairn-claims block and the append-only log gains one matching Cairn-authored row.
- Confirm protected starting work is byte-identical and Cairn creates one exact-path local commit for a clean-start DONE result.

## Stop conditions

- A real worker process or model call would start without separate authorization.
- The process fails, returns invalid bounded evidence, returns no readable claims, or claims STOPPED.
- Protected Git work changes unexpectedly.
- Any task record cannot be verified exactly.

DONE means the one Codex Exec process completed, the requested outcome and checks are reported, the append-only log row matches, protected starting work remains intact, and Cairn verified Git isolation and created the exact-path commit when the task started clean.

STOPPED means the call was not authorized, the model reported a stop, process evidence failed, protected work changed, or the result records could not be verified.
