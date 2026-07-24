# Task 040 — Report

What changed (every file touched):

- `app/src/shared/ipc.ts` — `RunSessionSnapshot` gained one field, placed
  right after `outcome`:

  ```ts
  export type RunSessionSnapshot = {
    dir: string;
    outcome: string;
    // true when this run is a real confirmed worker call, not the offline demo; Task 10 re-keys lane wording off adapter capabilities
    worker: boolean;
    startedAt: string;
    activities: SerialActivity[];
    phase: "running" | "closed";
    result: SerialRunResult | null;
    error: string | null;
  };
  ```

- `app/src/main/tasks.ts` — the session object seeded at the top of the
  `task:run` handler now includes `worker: realCallConfirmed === true,`.
  `realCallConfirmed` is the same boolean the existing real-call
  authorization gate already requires to be `true` before a non-mock Codex
  Exec run is allowed to start (`if (!mock && (realCallConfirmed !== true
  || ...))` a few lines above), so this seed needed no new detection or
  plumbing — it reuses a value already in scope at the call site.
- `app/src/renderer/screens/TaskRun.tsx` — added `const [sessionWorker,
  setSessionWorker] = useState(false);` beside the other per-run state.
  Inside `refresh()`, added `setSessionWorker(session.worker);` right after
  `setOutcome(session.outcome);`, so every mount and every post-Result
  re-query picks up the session's lane truth. Changed the `codexish`
  derivation from `codexRoute || Boolean(resultCodex)` to `codexRoute ||
  Boolean(resultCodex) || sessionWorker`. Added `setSessionWorker(false);`
  to `tryAnother()`'s reset line, alongside the other per-run state resets,
  so a fresh task never inherits a stale worker flag from the previous run.
- `app/tests/routing.spec.ts` — in "navigating away and back reattaches to
  the running worker and its finished result", added one assertion
  immediately after the post-reattach `Stop this task` visibility check:

  ```ts
  await expect(win.getByRole("button", { name: "Stop this task" })).toBeVisible({ timeout: 10_000 });
  await expect(win.getByText(/Cairn is running one confirmed ephemeral workspace-scoped Codex Exec request/)).toBeVisible();
  await expect(win.getByRole("heading", { name: "Verified real Codex Exec result" })).toBeVisible({ timeout: 30_000 });
  ```

  This assertion sits at the exact moment the bug reproduces: reattached,
  mid-run, before the result has landed, when `route` and `result` are
  both still null and only `sessionWorker` can tell the running card which
  sentence to show.

Nothing else was touched: the result-card logic, the offline lane, and
`core/` are unchanged, matching the fix's stated scope.

RED/GREEN evidence:

Rather than writing the test in isolation and guessing, I applied the test
change first, then temporarily reverted only the three source files
(`git stash push -- app/src/shared/ipc.ts app/src/main/tasks.ts
app/src/renderer/screens/TaskRun.tsx`) to get a true red against the exact
pre-fix code, before restoring them. This is a discriminating assertion,
verified both ways, not a fix-and-test-together guess.

**RED** — pre-fix source, rebuilt (`npm run build:vite`), then:

```
npx playwright test tests/routing.spec.ts -g "navigating away and back reattaches" --reporter=list
```

```
x  1 tests\routing.spec.ts:284:5 › navigating away and back reattaches to the running worker and its finished result (6.6s)

  Error: expect(locator).toBeVisible() failed
  Locator: getByText(/Cairn is running one confirmed ephemeral workspace-scoped Codex Exec request/)
  Expected: visible
  Timeout: 5000ms
  Error: element(s) not found
  ...
  1 failed
```

Failed for exactly the stated reason: mid-run reattach, `codexish` false,
the offline sentence rendered instead — the new assertion never found the
real-lane text because pre-fix code cannot produce it in this window.

Restored the three source files (`git stash pop`).

**GREEN** — fix restored, rebuilt, then the full app gate:

- `cd app && npm run typecheck` — clean, no errors.
- `cd app && npm run test:unit` — 43/43 pass.
- `cd app && npm run build:vite` — main, preload, renderer bundles all
  built clean.
- `cd app && npx playwright test` — full suite, real output:

  ```
  Running 23 tests using 1 worker
  ...
  ok 20 tests\routing.spec.ts:284:5 › navigating away and back reattaches to the running worker and its finished result (10.0s)
  ok 21 tests\routing.spec.ts:310:5 › a window reload mid-run reattaches instead of losing the result (10.4s)
  ...
  23 passed (53.2s)
  ```

  All 23 specs across `away.spec.ts`, `conductor.spec.ts`,
  `projects.spec.ts`, `routing.spec.ts` (10/10, including the pinned
  reattach scenario), `serial.spec.ts`, and `smoke.spec.ts` are green in
  one run — no flake, no rerun needed.

How to try it: launch against a real connected fake-Codex fixture with the
`"slow"` behavior (as `routing.spec.ts` does), start a real Codex Exec
task, walk away to project home while "Stop this task" is still visible,
then reopen "Start a task" for the same project. The running card
immediately reads "Cairn is running one confirmed ephemeral
workspace-scoped Codex Exec request…" — never the offline sentence — for
the entire remainder of the run, until the verified result replaces it.

Limitations and remaining human judgment:

- `sessionWorker` is seeded once per `refresh()` call and never
  re-evaluated mid-run from anything other than the session snapshot; this
  matches the finding's exact scope (`RunSessionSnapshot` needed lane
  information, nothing else did) and needs no further reconciliation logic
  since `worker` is fixed for the lifetime of a single run.
- The `worker` field's comment names a forward pointer ("Task 10 re-keys
  lane wording off adapter capabilities") carried verbatim from the
  finding; no Task 10 exists yet in this repo's ceremony and none was
  created by this fix — the comment is documentation for whoever picks
  that up later, not a claim that it is done.
- Milestone movement: NO

Disposition: DONE
