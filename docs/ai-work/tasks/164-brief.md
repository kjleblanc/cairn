# Task 164 — one confirmed real Codex Exec task

Requested outcome: Task 163's owed files and records — bodies.ts, its unit test, the brief, the report, and the LOG row — are in git history as exact-path commits containing nothing else, made only after a fresh green typecheck and unit-test run, and git status afterward shows no owed 163 file left behind.

Supported outcome: Run one explicitly confirmed worker task through the connected adapter and verify its result and Git state.

Lane: **Standard** — one explicitly confirmed OpenAI Codex Exec call; the model may make in-scope local workspace changes.

## Details (verbatim)

> Owner: 'Let's have the next task be doc and commit work.' then 'Alright, let's dispatch.' Known uncommitted Task 163 files needing their exact-path commit decision: app/src/shared/bodies.ts and app/tests-unit/bodies.test.ts. First inspect git status and name every dirty and untracked path. Commit only Task 163's owed records: the two code files plus 163's brief, report, and LOG.md row if uncommitted — by exact path, nothing swept along. If LOG.md carries another task's uncommitted row (Task 162's is a live possibility — see the concern), commit the file whole and say so plainly in the report rather than hand-editing an append-only record. Gate before any commit: cd app && npm run typecheck && npm run test:unit must be green on our side; if red, stop honestly with the failure as evidence instead of committing. Standing untracked design/ and app log files (lab-server.log, launch-build.log) stay as they are — known standing state, not this task's to commit. Anything else unexpected in the tree is named in the report, not committed.

## Route

- Adapter: Codex Exec
- Provider: OpenAI
- Model: gpt-5.6-sol
- Reason: Codex Exec is connected and supports serial tasks.

## Owned records

- `docs/ai-work/tasks/164-brief.md`
- `docs/ai-work/tasks/164-report.md`
- `docs/ai-work/LOG.md`

## Protected starting Git state

- HEAD: `c3a9cc5a640d06e6482d5cfc6479cb8f42fb0f24`
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
