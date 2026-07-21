# Task 028 — build report

Date: **2026-07-20**

## Result

Cairn now has a separate, default-off Final candidate for one closed batch of one
or two Standard tasks. The Desktop accepts two plain-language outcomes and shows
the six required states: **Planning, Building, Waiting, Checking, Done, and Needs
attention**.

The coordinator owns all Git and checking effects. Planning uses the existing
Claude Code engine with a read-only tool policy and returns one strict declaration
of implementation paths, test paths, and shell-free checks. Disjoint tasks may
Build at the same time in isolated temporary worktrees. Exact, ancestor, and
case-only overlap Waits; after the earlier task reaches Done, the later task
re-plans once against current `main`. Uncertain, malformed, non-Standard,
dependent, external-action, and unsafe-check declarations also Wait and receive no
builder session.

Checking is serialized. It freezes the task commit, applies it to a detached
candidate from the latest checked `main`, inspects scope, reruns the declared
checks with `shell: false`, appends one exact Applied/completed/DONE row, and then
fast-forwards `main` only from the expected commit. Exact owned worktrees and the
merged task branch are removed without force. Ambiguous or failed effects retain
evidence as Needs attention.

The candidate remains gated by `CAIRN_TWO_TASK_SCHEDULER_FINAL=1` and additionally
refuses every repository outside a newly created operating-system temporary
directory. The real Cairn repository was never used as a scheduler target.

## Files changed

Core scheduler and policy:

- `core/package.json`
- `core/src/agents.ts`
- `core/src/prompts.ts`
- `core/src/scheduler.ts` (new)
- `core/src/scheduler-git.ts` (new)
- `core/src/steps.ts`
- `core/src/index.ts`
- `core/test/agents.test.ts`
- `core/test/scheduler.test.ts` (new)
- `core/test/scheduler-recovery.test.ts` (new)
- `core/test/steps.test.ts`

Desktop:

- `app/src/main/ipc.ts`
- `app/src/main/tasks.ts`
- `app/src/preload.ts`
- `app/src/shared/ipc.ts`
- `app/src/renderer/App.tsx`
- `app/src/renderer/app.css`
- `app/src/renderer/screens/Dashboard.tsx`
- `app/src/renderer/screens/Scheduler.tsx` (new)
- `app/src/renderer/components/SchedulerDeck.tsx` (new)
- `app/tests/scheduler.spec.ts` (new)
- `app/tests/scheduler-recovery.spec.ts` (new)

Read-only CLI status:

- `cli/package.json`
- `cli/src/flows/status.ts`
- `cli/test/scheduler.test.ts` (new)

Task record:

- `docs/ai-work/tasks/028-report.md` (new)

No dependency declaration, version, lockfile, contract, public guide, historical
task record, real work log, provider connection module, bounded/concurrent module,
or TaskDeck file changed.

## Checks and real results

### Pinned plan and protected starting state

- Pinned brief commit: `542bee714e02fb6f9f410f198547f20604a04cb6` — PASS.
- Pinned parent: `83af91723c12e2cba96e7a13eb41761e1218eef4` — PASS.
- Pinned/current brief blob:
  `2d25d3ae7a08e4982b5a449b8f08c35413b8f38f` — byte-identical PASS.
- The pre-build real repository was clean, on `main`, with one worktree, no
  `cairn/task-*` branches, and no `.git/cairn` state.
- The post-build audit still showed one real worktree, no scheduler task branch,
  and `.git/cairn` absent. The real `main` did not move during implementation.
- `git diff` from the pinned starting commit across every protected Task 016,
  Task 026, Task 027, provider, bounded/concurrent, contract, lockfile, public,
  and real-log path was empty — PASS.

### Expected-red control

The two new core acceptance files were created before product implementation and
run against the unchanged starting implementation. Four assertions failed for the
intended missing scheduler API/module/recovery/tool-profile behavior. No unrelated
setup or compilation failure substituted for that evidence.

### Final automated checks

- `npm.cmd run build --workspace core` — PASS.
- `node --test core/dist/test/scheduler.test.js core/dist/test/scheduler-recovery.test.js`
  — PASS, 20/20.
- `npm.cmd test --workspace core` — PASS, 173/173 on the exact final bytes.
- `npm.cmd test --workspace cli` — PASS, 22/22.
- `npm.cmd --prefix app run typecheck` — PASS.
- `npm.cmd --prefix app run build:vite` — PASS.
- From `app`, `npx.cmd --no-install playwright test tests/scheduler.spec.ts
  tests/scheduler-recovery.spec.ts tests/concurrency-parallel-safe.spec.ts
  tests/concurrency-final.spec.ts tests/smoke.spec.ts` — PASS, 8/8 on the exact
  final bytes.
- From `app`, `npx.cmd --no-install playwright test tests/scheduler.spec.ts
  --headed -g "six-state"` — PASS, 1/1.

The final focused scheduler suite proved:

- two disjoint builders active together, maximum active engines `2`, four total
  sessions, deterministic Task 001 then Task 002 integration, latest-main check
  reruns, two exact log rows, clean main, one remaining worktree, and no task
  branch after success;
- exact, ancestor, and case-only overlap Waits before the later builder can run;
- uncertainty and unsafe metadata consume no builder session;
- a third task and dirty main are rejected before effect;
- duplicate keys, unknown fields, aliases, traversal, protected paths, and unsafe
  checks fail closed;
- shell chaining and mutating/dangerous Git options are denied in Planning, while
  Building has exact Write/Edit paths and no Bash, notebook, web, MCP, owner-
  question, or integration authority;
- outside writes, deletion, failed checks, brief tamper, task-commit change,
  unexpected main movement, duplicate log injection, active foreign lock, and
  cleanup interference never produce a false Done;
- strict top-level and nested scheduler state rejects unknown fields; and
- a 22-boundary interruption matrix covers reservation, Planning, worktree and
  brief creation, Building, local checks and task commit, integration lease and
  worktree, commit application, latest-main checks and log commit, before/after
  main fast-forward, and cleanup. Every injected interruption used at most one
  Planning and one Building session, produced at most one log row, and never left
  a false Done state.

### Direct disposable Git evidence

One final successful Desktop fixture was retained at:

`C:\Users\KenJL\AppData\Local\Temp\cairn-task-028-desktop-nbkFq7\project`

The final combined run recorded two Done tasks, four sessions, two correct result
files, two Applied/completed/DONE rows, one remaining `main` worktree, and no
`cairn/task-*` branch. Additional `cairn-task-028-*` temporary roots retain
negative, interruption, recovery, overlap, uncertainty, and earlier failed-run
evidence. They were intentionally not deleted because deletion was not authorized.

## Important failed evidence and repairs

- The first focused implementation run passed 10/12 cases. Both successful-task
  scenarios moved synthetic `main` correctly but branch cleanup failed because a
  cherry-picked commit is not a graph ancestor of its source branch. Cleanup now
  compare-and-swaps only the exact owned branch from the frozen task commit to the
  integrated commit before normal non-force deletion.
- The next run passed 11/12; the remaining assertion assumed LF after Windows Git
  checkout. Assertions now normalize CRLF without weakening content checks.
- The first Desktop happy path stopped at local checks because its generated mock
  test expected a literal backslash-n. That mock fixture was corrected.
- The next Desktop attempt stopped at integration checks because checkout changed
  text line endings. The mock check now compares normalized line endings while
  still requiring exact content.
- A negative failed-check test initially exposed Node's inherited
  `NODE_TEST_CONTEXT`, which can make a nested `node --test` report through its
  parent harness rather than its own exit status. Shell-free checks now remove
  that harness-only variable. The negative check then failed correctly.
- The first full core regression run found that read-only status tried to locate
  scheduler state in a Cairn project with no Git repository. The no-Git fast path
  restored legacy behavior; the affected steps suite passed 19/19 before the full
  173/173 pass.
- The interruption matrix found two unsafe handoffs: a committed-plan interruption
  could still enter Building, and a task-commit interruption could still enter
  Checking. Both gates now require their exact durable ready marker.
- The final overlap UI rehearsal found Windows stat/line-ending noise could make an
  unchanged re-plan attempt an empty commit. Re-plan evidence now compares
  Git-normalized content and reuses the already committed identical brief only
  when the strict plan hash is also unchanged.
- One headed run timed out in Playwright after the enabled Start button's click had
  already fired while Electron performed synchronous Git work. The test now
  dispatches the same real click event directly; the headed rerun passed.

## Provider, authentication, and network boundary

No Claude session, credential use, network request, login, refresh, recovery,
billing action, provider switch, or standalone Messages request occurred.

The `agents.ts` diff changes scheduler tool authorization and mock-only scheduler
fixtures. The existing Claude Agent SDK import, `query()` call, model and effort
resolution, request options other than scheduler-specific allowed tools,
authentication behavior, environment forwarding, and provider networking remain
unchanged. The new scheduler imports neither the standalone Anthropic SDK client
nor any Task 026–027 bounded broker/provider module.

## How the owner can see it safely

The safest repeatable view is the offline headed test from the `app` directory:

```powershell
npx.cmd --no-install playwright test tests/scheduler.spec.ts --headed -g "six-state"
```

It creates a new disposable temporary project, uses `CAIRN_MOCK=1`, makes no model
or provider call, and leaves its evidence root in the test output. Success is one
passing test and two cards reaching Done after showing Planning, Waiting, Building,
and Checking; the legend also shows Needs attention. Failure is a Playwright error
plus a retained temporary repository for inspection.

Do not enable this candidate against valuable work. The current code refuses that
target even when its environment switch is set.

## Limitations and required human checks

- Offline fake-engine and synthetic Git evidence cannot prove Claude subscription
  availability, provider-owned networking behavior, quota effect, or real-model
  output quality.
- A qualified developer experienced with Git worktrees, concurrent Node/Electron
  state machines, interruption recovery, ref movement, and the Claude Agent SDK
  must review the exact candidate before any live proof.
- The separately approved live proof still requires one named disposable target,
  the exact model and effort, and separate owner approval for the existing
  connection, four model sessions, subscription/network effect, disposable Git
  effects, and retained non-secret evidence.
- Acceptance after fresh-context review preserves a disabled candidate only. A
  later High-Stakes task is required for any valuable-repository activation.

Milestone movement: **UNCLEAR** — the offline candidate is complete and all offline
checks pass, but the milestone requires qualified-human approval and the separately
authorized real Claude Code subscription proof.

Disposition: **STOPPED — QUALIFIED_REVIEW_REQUIRED**
