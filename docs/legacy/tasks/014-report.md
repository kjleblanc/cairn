# Task 014 — report

## Result (plain language)

Task 014 stopped at its mandatory test-first gate. The independent regression suite
compiled against the unchanged Task 013 production source and reproduced the
decision-freeze and exclusive-scheduling failures. However, both engine-recovery
cases reached an unrelated test setup error before they could reproduce the intended
coordinator failure: the custom test engine tried to write a partial brief before
creating the untracked `docs/ai-work/tasks` directory in its synthetic worktree.

The accepted brief says that any unrelated setup failure in this red rehearsal must
stop the task with `REGRESSION_NOT_REPRODUCED`. Production source was therefore not
changed, the desktop recovery test was not created, later checks were not run, and no
success commit was made.

## Starting point and protected work

- Pinned Task 014 brief commit and implementation starting commit:
  `4c9f853b633c2be3e9080dbfff527e43dafa2a66`.
- The pinned brief had no working-tree or staged diff.
- `main` was 12 commits ahead of `origin/main`; nothing was staged.
- Only the real `main` branch and main worktree existed, no `cairn/task-*` branch
  existed, and `.git/cairn` was absent.
- All 12 protected modified or untracked files matched the SHA-256 values pinned in
  the brief before work. The same comparison after the stopped rehearsal matched all
  12 values again.
- The eight protected tracked files remain modified but unstaged. The four protected
  task artifacts remain untracked.

## Files changed

- `core/package.json` — adds the independent regression suite to the core test list.
- `core/test/coordinator-regressions.test.ts` — new independent public-API regression
  suite. It does not import helpers from or modify Task 013's test file.
- `docs/ai-work/tasks/014-report.md` — this stopped report.

No production source, existing test, dependency, lockfile, CLI file, desktop file,
policy file, public artifact, protected file, or earlier task artifact was changed by
Task 014.

## Commands run and their real results

1. Re-orientation read the project contract, project memory, recent work log, Task
   013 report, pinned Task 014 brief, High-Stakes guide, maintainer standards, commit
   history, full Git status, branches, worktrees, and the real coordinator-state
   location. The approval, pinned-brief, and starting-state checks passed.
2. The pre-build SHA-256 comparison covered all 12 protected files. Every value
   matched the pinned brief.
3. `npm.cmd run build --workspace core` — **passed**. The new TypeScript regression
   suite compiled against unmodified Task 013 production source. The existing sync
   step reported that `core/assets/contract.md` was synchronized; it created no
   working-tree diff.
4. `node --test core/dist/test/coordinator-regressions.test.js` — expected-red run
   exited **1**, with **1 passed and 8 failed**:
   - The post-decision case failed because queueing supplied no full frozen commit.
     This is the intended Task 013 decision-freeze defect.
   - The retained missing-commit case failed because integration did not refuse.
     This is the intended fail-closed defect.
   - The malformed frozen-commit case failed because state validation accepted it.
     This is the intended validation defect.
   - The separate earlier High-Stakes, earlier Final, and earlier live-action cases
     each failed because the older exclusive task waited. These are the intended
     scheduling defects.
   - The disjoint Standard/Draft parallel-eligibility case passed, as intended.
   - The definer recovery case failed with `ENOENT` while its custom engine tried to
     write the partial brief. The test had not created the untracked task-artifact
     directory in the task worktree. This is an unrelated setup failure, not the
     intended stranded-`defining` assertion.
   - The builder recovery case hit the same `ENOENT` during its setup definition,
     before the failing builder ran. This is an unrelated setup failure, not the
     intended stranded-`building` assertion.
5. Exact production-source diff inspection returned exit 0 for
   `core/src/coordinator.ts`, `core/src/steps.ts`,
   `app/src/renderer/screens/Dashboard.tsx`, and
   `app/src/renderer/screens/Wizard.tsx`: none changed.
6. The stopped-state SHA-256 comparison covered the same 12 protected files. Every
   value still matched the brief.
7. Final read-only Git inspection showed only `main`, only the real main worktree,
   and no `.git/cairn` directory. Nothing was staged.

The remaining declared completion checks were not run after the stable stop
condition. Their absence is not represented as a pass.

## Retained temporary evidence

Nothing was deleted or cleaned. The red rehearsal retained these 18 top-level
temporary roots and sibling worktree containers:

```text
C:\Users\KenJL\AppData\Local\Temp\cairn-task-014-builder-engine-recovery-HsiA0I
C:\Users\KenJL\AppData\Local\Temp\cairn-task-014-builder-engine-recovery-HsiA0I-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-014-decision-branch-moved-s174Zf
C:\Users\KenJL\AppData\Local\Temp\cairn-task-014-decision-branch-moved-s174Zf-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-014-definer-engine-recovery-esKBk1
C:\Users\KenJL\AppData\Local\Temp\cairn-task-014-definer-engine-recovery-esKBk1-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-014-disjoint-standard-drafts-cpwFHV
C:\Users\KenJL\AppData\Local\Temp\cairn-task-014-disjoint-standard-drafts-cpwFHV-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-014-legacy-missing-decision-commit-1tnREp
C:\Users\KenJL\AppData\Local\Temp\cairn-task-014-legacy-missing-decision-commit-1tnREp-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-014-malformed-decision-commit-Ph4qr3
C:\Users\KenJL\AppData\Local\Temp\cairn-task-014-malformed-decision-commit-Ph4qr3-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-014-older-final-ktabzB
C:\Users\KenJL\AppData\Local\Temp\cairn-task-014-older-final-ktabzB-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-014-older-high-stakes-UUZbHA
C:\Users\KenJL\AppData\Local\Temp\cairn-task-014-older-high-stakes-UUZbHA-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-014-older-live-action-98a4Sw
C:\Users\KenJL\AppData\Local\Temp\cairn-task-014-older-live-action-98a4Sw-cairn-worktrees
```

## How the owner can see or try the result

There is no repaired coordinator candidate to try. The useful next check is a
mandatory fresh-context review of this stopped task. That review should confirm that
the red rehearsal really contained an unrelated setup failure and that production
source remained unchanged.

## What still needs a human check

- A fresh-context reviewer must inspect the stopped evidence and actual diff.
- The owner must decide whether to keep this stopped test work, revise it through a
  new task, or defer the repair.
- Any later repair remains High-Stakes and still requires its own pinned brief and
  mandatory fresh-context review.

## Limitations and remaining uncertainty

- The decision and scheduling failures were reproduced, but neither engine failure
  reached its intended assertion. This task therefore provides no valid red-to-green
  proof for recovery.
- No production fix, desktop recovery behavior, rollback rehearsal, or completion
  suite exists from Task 014.
- Passing compilation and one passing parallel-eligibility test do not establish
  that the candidate is safe.
- The retained test directories are evidence only. They were not inspected as a
  substitute for the failed assertions and were not cleaned.

## Milestone movement

NO — Task 014 stopped before production implementation and did not move the current
real-model self-improvement milestone.

Disposition: STOPPED — REGRESSION_NOT_REPRODUCED
