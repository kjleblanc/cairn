# Task 040 — Brief

Requested visible outcome: a reattached run screen tells the truth about
which lane produced its running task, for the entire remainder of the run —
not just at the moment of reattachment.

The Task 039 review found that on a mid-run reattach (navigate away and
back, or reload the window, while a real Codex Exec task is still running)
`TaskRun.tsx` has neither a `RouteResult` (the reattach never went through
`task:route`) nor a `SerialRunResult` (the run hasn't finished yet). Its
`codexish` flag — `codexRoute || Boolean(resultCodex)` — is false in that
window, so the running card shows the offline-demo sentence ("The
deterministic adapter is exercising the same core serial coordinator used
by the CLI.") for what is actually a real, paid Codex Exec call, for as
long as the run keeps going. `RunSessionSnapshot`, the main process's
record of a live or closed run, carries no lane information at all — it has
no field the renderer could consult to know better.

Boundary of intent: this is a naming-only fix. It does not touch the
result-card logic (already correct, since a closed session/result has a
route to inspect), the offline lane, or `core/`. No new dependency. No
version bump.

The fix:

1. `app/src/shared/ipc.ts` — `RunSessionSnapshot` gains `worker: boolean`
   (placed right after `outcome`), commented as true only for a real
   confirmed worker call, never the offline demo.
2. `app/src/main/tasks.ts` — the session seeded at the top of `task:run`
   sets `worker: realCallConfirmed === true` — exactly the same flag the
   real-call authorization gate already requires before a Codex Exec run
   can start, so seeding it needs no new detection logic.
3. `app/src/renderer/screens/TaskRun.tsx` — a new `sessionWorker` piece of
   state, set from `session.worker` inside `refresh()`, folds into the
   lane derivation: `codexish = codexRoute || Boolean(resultCodex) ||
   sessionWorker`. Reset to `false` in `tryAnother()` alongside the other
   per-run state.
4. `app/tests/routing.spec.ts` — the existing "navigating away and back
   reattaches…" scenario (already a real Codex Exec run under the `"slow"`
   fixture) gains one assertion right after the post-reattach "Stop this
   task" check: the running card must show the real-lane sentence
   ("Cairn is running one confirmed ephemeral workspace-scoped Codex Exec
   request…"), not the offline one. This pins the fix at the exact moment
   the bug reproduces — mid-run, right after reattachment, before the
   result has landed.

Checks that show the outcome holds:

- The new assertion in `routing.spec.ts`, run once against the pre-fix
  source (reverted) to confirm it fails for the stated reason, then again
  after the fix to confirm it passes.
- `cd app && npm run typecheck` — clean.
- `cd app && npm run test:unit` — 43/43, unchanged.
- `cd app && npm run build:vite && npx playwright test` — full 23-spec
  suite green.

DONE means: the new assertion is a true negative on the pre-fix code and a
true positive on the fixed code, and the full app gate (typecheck, unit,
build, Playwright) stays green with nothing else weakened. STOPPED means:
the assertion cannot be made to discriminate correctly, or the full gate
cannot be made green without touching code outside this fix's stated scope.
