# Task 013 — report

## Result (plain language)

Cairn now has a complete but disabled parallel-task coordinator Draft. It is
available only when `CAIRN_PARALLEL_DRAFT=1`, and even then its real coordinator
behavior refuses valuable or dirty repositories: the full behavior is restricted to
newly created throwaway Git repositories under the operating-system temporary
directory.

The Draft demonstrates:

- atomic, permanent task-number reservations shared across operating-system
  processes;
- one `cairn/task-NNN` branch and isolated worktree per task;
- strict machine-readable task metadata and frozen exact-path scope;
- at most two Standard/Draft tasks, with classification, overlap, dependency,
  High-Stakes, Final, live-action, pending-decision, and blocked-task waits enforced
  by coordinator state rather than UI state;
- separately stored briefs, approvals, reports, and decisions;
- post-build Git scope inspection and approval-hash validation;
- independent desktop task sessions and one-click navigation between them;
- serialized decision handling and integration against the latest `main`, with safe
  checks rerun before `main` or its work log advances;
- fail-closed behavior for worktree collisions, invalid scope, approval tampering,
  failed checks, integration conflicts, corrupt state, and stale locks; and
- CLI visibility without a second path that bypasses the coordinator.

Without the flag, the existing single-task desktop and CLI flow remains the default.
This is a candidate to judge, not adopted workflow policy, and it did not create a
real parallel Cairn task.

## Starting point and protected work

- Pinned brief commit and implementation starting commit:
  `c7a807d1a38caaef9af31f9eddd6ca96ab415dbe`
  (`Task 013: pin parallel coordinator Draft brief`).
- The exact pinned brief had no working-tree diff before or after the build.
- `main` was ten commits ahead of `origin/main`; nothing was staged.
- The real repository had only its `main` branch and main worktree, no
  `cairn/task-*` branch, and no `.git/cairn` directory. Those facts remained true
  through the final pre-commit audit.
- The following pre-existing modified or untracked files were protected and remained
  byte-identical at their starting SHA-256 values:

| Protected file | Starting and final SHA-256 |
|---|---|
| `CHANGELOG.md` | `760DF019240F8539E96074D8D8DFFAA3AC2E11EC85A573394AD6CCA15783CB85` |
| `CONTRACT-TEMPLATE.md` | `92B1D74630D2B4D588DBDD0670CF14CD45C78763AD8E9143624E458B2559E5BB` |
| `EVERYDAY-WORKFLOW.md` | `577CAD0E89C57C46733C5A2C1A666650D05D4850FA5287BA321ACD1C8E619ABC` |
| `GETTING-READY.md` | `5FA9D8A338FD2DF73AD4C05919A8C956D53D0933E34F11B0DA27FA0289920406` |
| `HIGH-STAKES.md` | `267161B307C7B4EE576353566112B6BE65E57391B7F8014793BAF9B58FCB2389` |
| `README.md` | `3AA6133267C2F437741101FC9F31F09C78F8C8246D3E9FA871F300AFA6D8A7B1` |
| `cairn.html` | `40B4EEE8707DD0CEB046BCF438025C51E3246982D95C2B5837566C169F80A0FF` |
| `docs/ai-work/LOG.md` | `1A6771996084DAB29A00CA4AA9FC857F5090C705D2F788FF2A611821793422A8` |
| `docs/ai-work/tasks/007-approval.json` | `1204556CD1F51DF44D0EA2069643FE71CAA9BCFC08413E30CC35C6BDA07F2691` |
| `docs/ai-work/tasks/008-approval.json` | `2CB40F65212506ED3037AB1B174A769C7307D1C8D071DA6A7B42B9EDE145344E` |
| `docs/ai-work/tasks/009-approval.json` | `78933AC2EB2A00B6F6C40F92C6EDD2D5EBAF37D98F96C77FCF64F017A366D822` |
| `docs/ai-work/tasks/011-report.md` | `C70BABB41335C4F2D8C39FB44430A915C14F389A86D254524BFDE3E24FADF5F8` |

The eight tracked protected files remain modified but unstaged, and the four
untracked protected task artifacts remain untracked.

## Files changed

### Core

- `core/package.json`
- `core/src/agents.ts`
- `core/src/coordinator.ts` — new coordinator, state schema, locking, scheduling,
  scope gates, decisions, and serialized integration.
- `core/src/files.ts`
- `core/src/index.ts`
- `core/src/prompts.ts`
- `core/src/steps.ts`
- `core/test/coordinator.test.ts` — new synthetic coordinator rehearsal suite.

### Desktop app

- `app/src/main/ipc.ts`
- `app/src/main/tasks.ts`
- `app/src/preload.ts`
- `app/src/shared/ipc.ts`
- `app/src/renderer/App.tsx`
- `app/src/renderer/app.css`
- `app/src/renderer/components/RunReminder.tsx`
- `app/src/renderer/components/TaskDeck.tsx` — new two-task Draft deck.
- `app/src/renderer/screens/Dashboard.tsx`
- `app/src/renderer/screens/Wizard.tsx`
- `app/tests/concurrency.spec.ts` — new desktop concurrency rehearsal.

### CLI compatibility and task record

- `cli/package.json`
- `cli/src/flows/status.ts`
- `cli/src/flows/task.ts`
- `cli/test/coordinator.test.ts` — new status and bypass-refusal coverage.
- `docs/ai-work/tasks/013-report.md` — this report.

No dependency, lockfile, policy document, public artifact, earlier task record, or
other tracked source file was changed by Task 013. Generated ignored test output was
not staged.

## Commands run and their real results

1. Re-orientation read the project contract, project memory, recent log rows, Task
   012 report, High-Stakes guide, maintainer standards, pinned Task 013 brief, commit
   history, full Git status, branches, worktrees, and coordinator-state location.
   The exact approval and starting-state checks passed.
2. SHA-256 comparison before implementation and after the final test run covered all
   12 protected files. Every value matched the pinned brief — **passed**.
3. The first `npm` command was blocked by the local PowerShell script-execution
   policy before tests ran. It changed no source. Subsequent commands used
   `npm.cmd`, the Windows executable for the same package scripts.
4. Development runs of the new tests exposed a cross-process lock-content race,
   transient desktop integration-state observation, rebase line-ending behavior,
   and several test-locator assumptions. Each failing result was treated as a
   failure, corrected within the approved files, and rerun. Only the final green
   runs below are completion evidence.
5. `npm.cmd test --workspace core` — **58 passed, 0 failed**. This included two
   separate processes reserving distinct consecutive numbers, simultaneous isolated
   builds behind an overlap barrier, all declared waiting/exclusivity cases, scope
   and approval tamper gates, two serialized integrations against latest `main`, a
   failed check, a real Git conflict with branch restoration, corrupt state, stale
   lock, permanent reservation after worktree failure, and refusal of the dirty real
   project.
6. `npm.cmd test --workspace cli` — **18 passed, 0 failed**. The Draft status output
   reports active tasks and the CLI task path refuses to bypass the coordinator.
7. `npm.cmd --prefix app run typecheck` — **passed**.
8. `npm.cmd --prefix app run test:smoke -- concurrency.spec.ts away.spec.ts smoke.spec.ts`
   — Vite builds passed and Playwright reported **4 passed, 0 failed**. The run
   covered the new parallel desktop behavior, both existing away-mode cases without
   the flag, and the existing ordinary closing loop. The app run required approved
   execution outside the file sandbox because the bundled build tool was denied
   there; it used no network, credentials, provider, or external service.
9. `git diff --check` — **passed** with no whitespace errors. Git printed only
   line-ending notices and an inaccessible global-ignore warning; neither changed a
   file nor invalidated the result.
10. Exact-path diff inspection found only the 23 implementation/test paths listed
    above plus this report. Every path is on the brief's allowlist. No deletion,
    rename, copy, dependency change, or generated artifact was included.
11. Final pre-commit `git worktree list --porcelain` showed only the real main
    worktree; `git branch --list` showed only `main`; and `.git/cairn` was absent —
    **passed**.

The inaccessible global Git-ignore and line-ending warnings were environmental
warnings, not silent passes. The final commands exited successfully.

## Safe rehearsal and retained temporary paths

The final core rehearsal retained every synthetic repository and worktree for
inspection. Nothing below was deleted or cleaned:

- Atomic reservations:
  `C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-atomic-8Lyr0V`.
- Permanent number after worktree failure:
  `C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-reservation-failure-GvnwTY`;
  its retained, empty sibling worktree area is the same path with
  `-cairn-worktrees` appended.
- Concurrent isolated builds:
  `C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-overlap-barrier-3nmuiM`;
  retained sibling worktrees are `task-001` and `task-002` under the corresponding
  `-cairn-worktrees` directory.
- Classification wait:
  `C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-wait-classification-ylMODR`;
  retained sibling worktrees: `task-001`, `task-002`.
- Exact-path overlap wait:
  `C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-wait-overlap-krZ4pJ`;
  retained sibling worktrees: `task-001`, `task-002`.
- Dependency wait:
  `C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-wait-dependency-Jhkqvm`;
  retained sibling worktrees: `task-001`, `task-002`.
- High-Stakes exclusivity:
  `C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-wait-exclusive-CCIEck`;
  retained sibling worktrees: `task-001`, `task-002`.
- Live-action exclusivity:
  `C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-wait-live-RCPQBX`;
  retained sibling worktrees: `task-001`, `task-002`.
- Final-mode exclusivity:
  `C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-wait-final-TD9Oi0`;
  retained sibling worktrees: `task-001`, `task-002`.
- Post-build scope rejection:
  `C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-scope-gate-Qm7k0n`;
  retained sibling worktree: `task-001`.
- Approval tamper rejection:
  `C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-approval-tamper-I6bC2W`;
  retained sibling worktree: `task-001`.
- Successful serialized integrations:
  `C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-serialized-xT08ge`;
  retained sibling worktrees: `task-001`, `task-002`,
  `integration-001-1784417948958`, and `integration-002-1784417953238`.
- Failed approved check:
  `C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-failed-check-NHBTl1`;
  retained sibling worktree: `task-001`.
- Real Git file/directory conflict:
  `C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-conflict-zsWhT1`;
  retained sibling worktrees: `task-001`, `task-002`, and
  `integration-001-1784417967134`.
- Corrupt state:
  `C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-corrupt-state-UCecdt`.
- Stale lock:
  `C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-stale-lock-0HXLES`.

The final desktop rehearsal retained:

- root:
  `C:\Users\KenJL\AppData\Local\Temp\cairn-desktop-concurrency-UYUe99`;
- synthetic repository: the root's `project` directory;
- isolated application data: the root's `appdata` directory; and
- sibling worktrees: `task-001`, `task-002`, and
  `integration-001-1784418059561` under the root's
  `project-cairn-worktrees` directory.

Earlier development runs also left their disposable test folders in the system
temporary directory, as required by the no-cleanup rule. The paths above are the
complete set created by the final passing rehearsal and are the evidence set for
this report.
+
+For completeness, the final audit found the following **98 retained top-level
+temporary paths** from the final and earlier Task 013 rehearsal runs. Every name in
+this inventory is under
+`C:\Users\KenJL\AppData\Local\Temp\`; a name ending in
+`-cairn-worktrees` is the sibling container for that synthetic repository's task
+and integration worktrees. This records all retained rehearsal roots without
+pretending that ordinary internal Git directories are separate test artifacts.
+
+```text
cairn-coordinator-approval-tamper-I6bC2W
cairn-coordinator-approval-tamper-I6bC2W-cairn-worktrees
cairn-coordinator-atomic-8Lyr0V
cairn-coordinator-atomic-C7lakb
cairn-coordinator-atomic-ElZ64V
cairn-coordinator-atomic-xOd43I
cairn-coordinator-atomic-xqcPxr
cairn-coordinator-conflict-LS6KcN
cairn-coordinator-conflict-LS6KcN-cairn-worktrees
cairn-coordinator-conflict-USFvpO
cairn-coordinator-conflict-USFvpO-cairn-worktrees
cairn-coordinator-conflict-zeTCFF
cairn-coordinator-conflict-zeTCFF-cairn-worktrees
cairn-coordinator-conflict-zsWhT1
cairn-coordinator-conflict-zsWhT1-cairn-worktrees
cairn-coordinator-corrupt-state-JOdCad
cairn-coordinator-corrupt-state-MfVP3B
cairn-coordinator-corrupt-state-UCecdt
cairn-coordinator-corrupt-state-XU0daZ
cairn-coordinator-failed-check-427Snd
cairn-coordinator-failed-check-427Snd-cairn-worktrees
cairn-coordinator-failed-check-NHBTl1
cairn-coordinator-failed-check-NHBTl1-cairn-worktrees
cairn-coordinator-failed-check-roTxrt
cairn-coordinator-failed-check-roTxrt-cairn-worktrees
cairn-coordinator-failed-check-XRHkUz
cairn-coordinator-failed-check-XRHkUz-cairn-worktrees
cairn-coordinator-overlap-barrier-3nmuiM
cairn-coordinator-overlap-barrier-3nmuiM-cairn-worktrees
cairn-coordinator-overlap-barrier-gFuEHj
cairn-coordinator-overlap-barrier-gFuEHj-cairn-worktrees
cairn-coordinator-overlap-barrier-K1yLN3
cairn-coordinator-overlap-barrier-K1yLN3-cairn-worktrees
cairn-coordinator-overlap-barrier-mpa43G
cairn-coordinator-overlap-barrier-mpa43G-cairn-worktrees
cairn-coordinator-reservation-failure-GvnwTY
cairn-coordinator-reservation-failure-GvnwTY-cairn-worktrees
cairn-coordinator-scope-gate-bQyHW3
cairn-coordinator-scope-gate-bQyHW3-cairn-worktrees
cairn-coordinator-scope-gate-Qm7k0n
cairn-coordinator-scope-gate-Qm7k0n-cairn-worktrees
cairn-coordinator-serialized-5nTrcI
cairn-coordinator-serialized-5nTrcI-cairn-worktrees
cairn-coordinator-serialized-5R0FtG
cairn-coordinator-serialized-5R0FtG-cairn-worktrees
cairn-coordinator-serialized-kmQoVN
cairn-coordinator-serialized-kmQoVN-cairn-worktrees
cairn-coordinator-serialized-NURwvY
cairn-coordinator-serialized-NURwvY-cairn-worktrees
cairn-coordinator-serialized-WBFRjo
cairn-coordinator-serialized-WBFRjo-cairn-worktrees
cairn-coordinator-serialized-xT08ge
cairn-coordinator-serialized-xT08ge-cairn-worktrees
cairn-coordinator-stale-lock-0HXLES
cairn-coordinator-stale-lock-9AulFP
cairn-coordinator-stale-lock-W21Q1h
cairn-coordinator-stale-lock-XQvLbG
cairn-coordinator-wait-classification-ylMODR
cairn-coordinator-wait-classification-ylMODR-cairn-worktrees
cairn-coordinator-wait-dependency-CeiXli
cairn-coordinator-wait-dependency-CeiXli-cairn-worktrees
cairn-coordinator-wait-dependency-Jhkqvm
cairn-coordinator-wait-dependency-Jhkqvm-cairn-worktrees
cairn-coordinator-wait-dependency-pnWM6I
cairn-coordinator-wait-dependency-pnWM6I-cairn-worktrees
cairn-coordinator-wait-dependency-xZVn4T
cairn-coordinator-wait-dependency-xZVn4T-cairn-worktrees
cairn-coordinator-wait-exclusive-AcPBeb
cairn-coordinator-wait-exclusive-AcPBeb-cairn-worktrees
cairn-coordinator-wait-exclusive-CCIEck
cairn-coordinator-wait-exclusive-CCIEck-cairn-worktrees
cairn-coordinator-wait-exclusive-Ccp5jp
cairn-coordinator-wait-exclusive-Ccp5jp-cairn-worktrees
cairn-coordinator-wait-exclusive-VvILFd
cairn-coordinator-wait-exclusive-VvILFd-cairn-worktrees
cairn-coordinator-wait-final-TD9Oi0
cairn-coordinator-wait-final-TD9Oi0-cairn-worktrees
cairn-coordinator-wait-live-4BQ6F2
cairn-coordinator-wait-live-4BQ6F2-cairn-worktrees
cairn-coordinator-wait-live-fjCJOT
cairn-coordinator-wait-live-fjCJOT-cairn-worktrees
cairn-coordinator-wait-live-RCPQBX
cairn-coordinator-wait-live-RCPQBX-cairn-worktrees
cairn-coordinator-wait-live-ZH8IHM
cairn-coordinator-wait-live-ZH8IHM-cairn-worktrees
cairn-coordinator-wait-overlap-8P9N0q
cairn-coordinator-wait-overlap-8P9N0q-cairn-worktrees
cairn-coordinator-wait-overlap-8Qyr39
cairn-coordinator-wait-overlap-8Qyr39-cairn-worktrees
cairn-coordinator-wait-overlap-CUG6qj
cairn-coordinator-wait-overlap-CUG6qj-cairn-worktrees
cairn-coordinator-wait-overlap-krZ4pJ
cairn-coordinator-wait-overlap-krZ4pJ-cairn-worktrees
cairn-desktop-concurrency-Aowngx
cairn-desktop-concurrency-F5AdvZ
cairn-desktop-concurrency-mMncdj
cairn-desktop-concurrency-uBtiP2
cairn-desktop-concurrency-UYUe99
+```

The successful serialized repository shows no log row before integration, exactly
one row after the first integration, and exactly two after the second. The failed
check and conflict repositories show synthetic `main` and its log unchanged. The
conflicted task branch was restored to its pre-attempt commit.

## Rollback proof

Immediate rollback is simply to leave `CAIRN_PARALLEL_DRAFT` unset; that is the
tested default. Task 013's implementation and report are isolated in one exact-name
commit following the separately pinned brief commit. If the owner rejects the
Draft, a separately approved High-Stakes rollback task can perform an additive:

```text
git revert [exact Task 013 implementation commit]
```

The implementation commit identifier is supplied at handoff because a commit cannot
contain its own identifier. No reset, clean, stash, checkout, branch deletion,
worktree removal, lock removal, or temporary-folder deletion was performed.

## How the owner can see or try the result

After the mandatory fresh-context review, run this from the project root:

```powershell
npm.cmd --prefix app run test:smoke -- concurrency.spec.ts --headed
```

Success looks like an unmistakable “Parallel Draft — not active by default” label,
separate Task 001 and Task 002 cards, one-click navigation to either task, different
branch and worktree paths, visible wait reasons, one task integrating without
closing the other, and the serialized-integration completion remaining visible.

Failure includes duplicate numbers, the same folder on both cards, mixed task
events, a third active task, unsafe work proceeding instead of waiting, an early or
duplicate log row, or changed ordinary behavior when the flag is absent.

The retained repositories listed above can also be inspected locally without making
changes. Do not delete or repair them as part of inspection.

## What still needs a human check

- The owner should watch the headed desktop rehearsal and judge whether the two-task
  presentation and wait explanations are understandable.
- A mandatory fresh-context Cairn review must inspect Task 013 before the owner
  closes it.
- Before any later Final task enables this on a valuable repository, a developer
  experienced with Git worktrees/conflict recovery and cross-platform atomic locking
  must review the design and failure recovery.

## Limitations and remaining uncertainty

- The checks prove only the named synthetic Windows scenarios. They do not prove
  crash safety on every filesystem, operating system, Node version, or Git version.
- The Draft detects unexpected manual Git activity and fails closed; it cannot
  physically prevent Git commands run outside Cairn.
- A process or machine crash can leave retained state, locks, branches, or worktrees
  requiring deliberate human recovery. Automatic cleanup is intentionally absent.
- The check runner accepts a narrow safe command grammar. It is not a general shell
  sandbox and does not authorize live actions.
- Mock-agent output proves coordinator routing and isolation, not real-model quality
  or behavior.
- No network, real model, credential, cost, provider, deployment, external write, or
  external service was used. Concurrency was not enabled by default or activated in
  this real project.
- Passing tests cannot establish that this Draft should become Cairn policy. That is
  an owner decision after review, and any adoption requires a separate Final task.

## Milestone movement

UNCLEAR — Cairn now has a judgeable, tested concurrency safety foundation, but this
Draft neither activates concurrency on a valuable project nor completes the current
milestone's real-model self-improvement task.

Disposition: DONE
