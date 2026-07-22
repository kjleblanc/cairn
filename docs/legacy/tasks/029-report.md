# Task 029 — contain and repair the two-task scheduler

Date: **2026-07-21**

## Result

Task 029 built the approved offline/mock-only Experimental Draft. Cairn Desktop now creates a brand-new disposable proof project for one closed scheduler batch and supports only bounded passive UTF-8 `.md` and `.txt` artifacts. The selected project is never given to either scheduled engine.

The repaired path:

- uses the new default-off `CAIRN_PASSIVE_SCHEDULER_DRAFT` switch and also requires `CAIRN_MOCK=1` before consuming a proof;
- rejects real transport mode before creating model state or claiming the proof token;
- gives passive Planning only Read, Glob, and Grep;
- gives passive Building only Read, Glob, Grep, Write, and Edit, with exact-path gates;
- replaces model-authored process checks with frozen `fileExists`, `utf8Equals`, and `utf8Contains` data;
- admits only a coordinator-created, one-use disposable repository whose root, token, initial commit/tree/files, refs, remotes, ignored state, Git directory, and object-store shape are checked;
- integrates a ready task immediately through one Checking lease while its peer builder may still be active;
- records Planning engine failure as Needs attention and valid unsupported code work as Waiting;
- retains ambiguous hard-exit evidence without retrying an engine, duplicating a log row, or claiming false Done; and
- states visibly that the Draft is an offline mock proof and does not support real models or executable work.

No real model, network request, credential, valuable-repository scheduler run, dependency operation, deletion, activation, push, release, deployment, or external action occurred.

## Files changed

Core implementation and policy:

- `core/package.json` — adds the new focused tests to the existing test command only.
- `core/src/agents.ts` — passive tool profiles and offline mock behavior; provider/auth/query behavior is unchanged.
- `core/src/prompts.ts` — passive planner and builder charters.
- `core/src/scheduler.ts` — separate schema-2 state, ready-first pump, offline gate, integration, and recovery.
- `core/src/scheduler-git.ts` — scheduler-owned Git commands ignore ambient `GIT_*` repository/config overrides and interactive prompting.
- `core/src/scheduler-checks.ts` — new bounded declarative evaluator.
- `core/src/scheduler-proof.ts` — new disposable proof creator, verifier, and one-use claim.
- `core/src/index.ts` — exports the approved new modules.

Core checks:

- `core/test/agents.test.ts`
- `core/test/scheduler.test.ts`
- `core/test/scheduler-recovery.test.ts`
- `core/test/scheduler-checks.test.ts`
- `core/test/scheduler-proof.test.ts`

Desktop path and checks:

- `app/src/main/tasks.ts`
- `app/src/shared/ipc.ts`
- `app/src/renderer/app.css`
- `app/src/renderer/screens/Dashboard.tsx`
- `app/src/renderer/screens/Scheduler.tsx`
- `app/src/renderer/components/SchedulerDeck.tsx`
- `app/tests/scheduler.spec.ts`
- `app/tests/scheduler-recovery.spec.ts`

Task evidence:

- `docs/ai-work/tasks/029-report.md`

`app/src/preload.ts` was permitted but did not need a change. No lockfile, dependency, contract, public guide, real work log, Task 028 record, activation file, provider module, bounded/concurrent module, or CLI file changed.

## Safe rehearsal and repair evidence

The expected-red rehearsal compiled and then failed seven intended behavior assertions in about 85.6 seconds. It proved that Task 028 could execute an allowed Node test that wrote a sentinel outside its worktree; accepted both `npm run deploy` and `npm run postinstall`; had no coordinator proof-creation API; showed a thrown Planning engine failure as Waiting; blocked a ready Task 002 behind a delayed Task 001 through `Promise.all`; and admitted an arbitrary pre-existing temporary repository. The sentinel remained inside the newly owned test root. No network, credential, install, or valuable path was used.

Two later harness mistakes were repaired without weakening an acceptance criterion:

1. The first green-focused command used `value` instead of `expected` in one test assertion and passed a label to a zero-argument proof creator. TypeScript failed, so stale built tests also reported the two old ready/unsupported failures. The test data was corrected, rebuilt, and the affected focused tests passed.
2. After the offline-only gate was added, the Desktop hard-exit seeding child omitted `CAIRN_MOCK=1`. The product correctly stopped with `SCHEDULER_OFFLINE_ONLY`; seven other Desktop tests passed. The child harness received the exact missing offline marker, the recovery test passed alone, and the complete later Desktop set passed.

## Commands and real results

- Pinned brief audit: commit `aa41a30b11a0faf5b39b1363efa92bc0ab49e920`, parent `0e841916c685e0a458680319390c2d1a1f17d570`, committed and working blob `a09621ca298cbc101393af1c7614e3879af4d6d0` — **passed**.
- `npm.cmd run build --workspace core` — **passed** repeatedly, including before the final full suite.
- Focused passive assertion/proof/schema/ready-first/tool/recovery checks — **passed**. The Windows file-symlink case skipped because creating a file symlink returned `EPERM`; junction, ancestor-junction, hard-link, and other reparse/path controls ran and passed.
- External-process hard exits at `building-start:1` and `main-fast-forward-observed:1` — **passed**; exactly two sessions remained recorded, recovery retried none, rows were not duplicated, and no interrupted state claimed Done.
- `npm.cmd test --workspace core` after the final offline/Git-environment changes — **passed: 192 passed, 1 skipped, 0 failed** in about 230.5 seconds.
- `npm.cmd --prefix app run typecheck` — **passed** after final source changes.
- `npm.cmd --prefix app run build:vite` — **passed** after final source and UI wording changes. Vite printed only its existing CJS API deprecation warning.
- `npx.cmd --no-install playwright test tests/scheduler.spec.ts tests/scheduler-recovery.spec.ts tests/concurrency-parallel-safe.spec.ts tests/concurrency-final.spec.ts tests/smoke.spec.ts` — final corrected run **passed: 8 passed, 0 failed** in about 1.5 minutes.
- Headed offline ready-first scheduler rehearsal — **passed: 1 passed, 0 failed**. One retained proof was `C:\Users\KenJL\AppData\Local\Temp\cairn-passive-proof-RaU4Oy`.
- Final scheduler UI check after the offline/mock wording change — **passed: 1 passed, 0 failed**. Its retained proof was `C:\Users\KenJL\AppData\Local\Temp\cairn-passive-proof-bJnjco`.
- Passive evaluator source and built-output audit — **passed**: no child-process, VM, worker, dynamic import, npm, or postinstall surface exists in `scheduler-checks`.
- `agents.ts` provider/auth/network-sensitive diff audit — **passed**: no `query()`, credential, auth, network, retry, or telemetry line changed.
- Exact permitted-path audit — **passed**.
- Protected exact comparison for contracts, guides, logs, locks, Tasks 016/026/027/028, package locks, and activation evidence — **passed**.
- `git diff --check` — **passed**.
- Real-repository state audit — **passed** before the report: one worktree on pinned `main`, no `cairn/task-*` or `cairn/passive-*` branch, and `.git/cairn` absent.

All generated build and Playwright output remained ignored and will not be staged. Disposable evidence roots were retained; none was deleted.

## How to try the result safely

This Draft is intentionally not active by default. From PowerShell in the repository root:

```powershell
$env:CAIRN_PASSIVE_SCHEDULER_DRAFT = "1"
$env:CAIRN_MOCK = "1"
npm.cmd --prefix app start
```

Open a Cairn project, choose **Schedule one or two tasks**, and request one or two passive note outcomes. Cairn should show the six states, print the retained disposable proof path, and leave the opened project unchanged. A request for source code, a script, package work, a build, or an executable test should remain Waiting. Unset either environment variable to leave the Draft unavailable.

Success is a retained disposable proof with passive files under `artifacts/task-NNN/`, one exact log row per Done task, one clean root worktree, and no task branches. Failure is any real-model attempt, process-based assertion, mutation of the opened project, outside artifact, duplicate row, false Done, or unproved cleanup; those require stopping and review.

## Limitations and required human check

- This proves an offline mock path only. It does not advance a real-model Cairn task, support code, or establish production readiness.
- The host denied file-symlink creation, so that exact test case skipped. Windows junction/reparse and hard-link cases passed, and the evaluator rejects a symbolic-link file in code, but a qualified Windows filesystem reviewer must still inspect that boundary.
- `scheduler.ts` retains Task 028's separately gated historical `ShellFreeCheck` imports and calls before the Task 029 section. The Task 029 entry accepts only schema 2 passive assertions and never calls them; `scheduler-checks` source and built output contain no runner. A fresh reviewer should verify this separation rather than treating module co-location as proof.
- A qualified developer experienced with Git worktrees, concurrent Electron/Node state, Windows reparse/hard-link behavior, hard-exit recovery, and Claude Agent SDK execution is still required before any later real-model proof or valuable-repository activation.
- Retained disposable evidence has not been deleted. Deletion still requires separate approval of exact absolute paths.

The mandatory next step is a brand-new chat with:

```text
Review High-Stakes task 029.
```

Milestone movement: **UNCLEAR**

Disposition: **DONE**
