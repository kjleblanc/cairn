# Task 015 — report

## Result (plain language)

Task 015 stopped at its mandatory desktop-recovery check. Before that stop, the
corrected independent core suite reproduced all three Task 013 safety failures for
their intended reasons, and the same ten assertions passed after a bounded core
repair. The desktop source also typechecked.

The first desktop recovery rehearsal did not reach Electron recovery behavior. Its
new test generated invalid inline JavaScript because `\n` inside the TypeScript
template became a literal newline inside a quoted JavaScript string. Node rejected
the synthetic definer seed with `SyntaxError: Invalid or unexpected token`.

The accepted brief names `DESKTOP_RECOVERY_FAILED` as a stop condition, and the
project contract says a failed required High-Stakes check must stop the build. The
test was therefore not patched after the failure. The remaining completion checks
were not run, no files were staged, and no success commit was made.

## Starting point and protected work

- Pinned Task 015 brief commit: `6d89413cae0080624b0958d86267b6f704ad93c9`.
- Its parent is the stated planning commit:
  `4c9f853b633c2be3e9080dbfff527e43dafa2a66`.
- The brief had no working-tree or staged diff.
- `main` was 13 commits ahead of `origin/main`; nothing was staged.
- Only the real `main` branch and main worktree existed, no `cairn/task-*` branch
  existed, and `.git/cairn` was absent.
- All 13 protected tracked and untracked files matched the SHA-256 values pinned in
  the brief before work. The final comparison after the stop matched all 13 again.
- Both retained Task 014 test inputs matched their pinned starting hashes before the
  first edit.
- `core/src/coordinator.ts`, `core/src/steps.ts`,
  `app/src/renderer/screens/Dashboard.tsx`, and
  `app/src/renderer/screens/Wizard.tsx` were unchanged from Task 013 before the red
  rehearsal.

## Files changed

- `core/package.json` — retains Task 014's registration of the independent
  regression suite; Task 015 did not alter its retained bytes.
- `core/test/coordinator-regressions.test.ts` — corrects Task 014's directory setup,
  uses Task 015 synthetic names, adds the passing custom-definer setup control, and
  exercises each failure fully before its final assertions.
- `core/src/coordinator.ts` — records and validates the decision commit, refuses
  moved decision evidence, prepares accepted integration in a detached worktree,
  gives the earlier exclusive task priority, and adds locked retry transitions.
- `core/src/steps.ts` — catches definer and builder engine exceptions, records stable
  blockers without raw error text, and routes retries through retained task state.
- `app/src/renderer/screens/Dashboard.tsx` — explains both recovery states and names
  their routes in plain language.
- `app/src/renderer/screens/Wizard.tsx` — shows retained definer/builder evidence and
  offers same-task retry controls after restart.
- `app/tests/concurrency-recovery.spec.ts` — new desktop restart rehearsal. It is the
  file whose first run stopped on the inline-JavaScript escaping defect.
- `docs/ai-work/tasks/015-report.md` — this stopped report.

No dependency, lockfile, CLI, existing core test, existing desktop test, policy,
public artifact, protected file, or earlier task artifact was changed by Task 015.
The eight protected tracked files and five protected untracked artifacts remain the
owner's pre-existing work.

## Commands run and their real results

1. Re-orientation read the project contract, project memory, recent log, Task 014
   report, pinned Task 015 brief, High-Stakes guide, maintainer standards, complete
   Git status, commits, branches, worktrees, and the real coordinator-state path.
   The approval, pinned-brief, parent-commit, starting-state, and scope checks passed.
2. Pre-build SHA-256 comparison covered all 13 protected files and both retained
   Task 014 test inputs. Every value matched the brief.
3. Production-baseline comparison against
   `7a4bc45c75e720f719cd735541266df3c9aa79ad` returned exit 0 for all four permitted
   Task 013 production files.
4. `npm.cmd run build --workspace core` after correcting only the regression setup —
   **passed**.
5. Expected-red
   `node --test core/dist/test/coordinator-regressions.test.js` against unchanged
   Task 013 production — exited **1** with **2 passed and 8 failed**:
   - the disjoint Standard/Draft and custom-definer setup controls passed;
   - decision movement integrated the moved commit, advanced synthetic `main` and
     changed its log instead of refusing;
   - missing and malformed retained decision commits failed to close safely;
   - earlier High-Stakes, Final, and live-action tasks each waited instead of
     running alone;
   - definer and builder exceptions left tasks in `defining` and `building`, and
     retry could not complete the same identity;
   - no failure involved compilation, `ENOENT`, or unrelated setup.
6. `npm.cmd run build --workspace core` after the core repair — **passed**.
7. The unchanged targeted regression suite after implementation — **passed**, 10 of
   10 tests in about 78 seconds.
8. `npm.cmd --prefix app run typecheck` — **passed**.
9. `npm.cmd --prefix app run test:smoke -- concurrency-recovery.spec.ts` inside the
   restricted sandbox — Vite could not read its config because the sandbox denied a
   parent-directory read. This did not exercise the product.
10. The same command rerun with approved unrestricted local execution — all three
    Vite builds **passed**, then the one Playwright test **failed** while seeding its
    synthetic definer state. Node reported `SyntaxError: Invalid or unexpected
    token` at the generated `writeFileSync` string. Electron recovery behavior was
    not reached.
11. Final read-only inspection confirmed all protected hashes still match, nothing
    is staged, only the real main worktree and main branch exist, no real
    `cairn/task-*` branch exists, and `.git/cairn` remains absent.

The remaining declared completion checks were not run after the stable stop
condition. Their absence is not represented as a pass.

## Retained temporary evidence

Nothing was deleted or cleaned. The two core suite runs and stopped desktop setup
retained these roots and sibling worktree containers:

```text
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-builder-engine-recovery-o4Vwpf
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-builder-engine-recovery-o4Vwpf-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-builder-engine-recovery-zb0Dpa
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-builder-engine-recovery-zb0Dpa-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-custom-definer-setup-control-3EoEAZ
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-custom-definer-setup-control-3EoEAZ-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-custom-definer-setup-control-Rh1Qhb
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-custom-definer-setup-control-Rh1Qhb-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-decision-branch-moved-EILZOf
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-decision-branch-moved-EILZOf-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-decision-branch-moved-MPcDVY
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-decision-branch-moved-MPcDVY-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-definer-engine-recovery-10AAx6
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-definer-engine-recovery-10AAx6-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-definer-engine-recovery-rpouK8
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-definer-engine-recovery-rpouK8-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-desktop-recovery-zHdsf2
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-disjoint-standard-drafts-A16yNk
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-disjoint-standard-drafts-A16yNk-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-disjoint-standard-drafts-v4WapA
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-disjoint-standard-drafts-v4WapA-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-legacy-missing-decision-commit-6z5LUl
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-legacy-missing-decision-commit-6z5LUl-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-legacy-missing-decision-commit-e5IIDW
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-legacy-missing-decision-commit-e5IIDW-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-malformed-decision-commit-VTAujS
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-malformed-decision-commit-VTAujS-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-malformed-decision-commit-xpEOe1
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-malformed-decision-commit-xpEOe1-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-older-final-OIRUvz
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-older-final-OIRUvz-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-older-final-w19dCH
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-older-final-w19dCH-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-older-high-stakes-1oRMYY
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-older-high-stakes-1oRMYY-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-older-high-stakes-aMtj1d
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-older-high-stakes-aMtj1d-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-older-live-action-HRYHjI
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-older-live-action-HRYHjI-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-older-live-action-UA4IiY
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-older-live-action-UA4IiY-cairn-worktrees
```

## How the owner can see or try the result

There is no complete Task 015 candidate to accept. The safest next step is the
mandatory fresh-context review, which should independently inspect the pinned brief,
the core red/green evidence, the new desktop test's escaping defect, and the fact
that the remaining checks and success commit are absent.

If the owner only wants to reproduce the stopped check without changing files, run:

```powershell
npm.cmd --prefix app run test:smoke -- concurrency-recovery.spec.ts
```

The current expected result is failure during synthetic setup with the quoted Node
syntax error. That is evidence of this stop, not a successful desktop rehearsal.

## What still needs a human check

- A fresh-context reviewer must form a verdict from the brief, actual diff, retained
  test changes, and command evidence rather than trusting this report.
- The owner must decide whether to revise the stopped desktop test in a new task,
  defer this Draft, or abandon it.
- Any later revision must rerun the desktop restart behavior and every completion
  check that this task did not reach.

## Limitations and remaining uncertainty

- The core targeted suite passed, but the full core suite and CLI suite were not run
  after the desktop stop.
- No Playwright recovery behavior ran, so the new desktop wording and retry controls
  have only typecheck evidence.
- Existing desktop concurrency, away, and smoke checks were not rerun.
- `git diff --check`, the final full completion suite, exact-name staging inspection,
  and the Task 015 implementation commit did not occur.
- The core tests cover named synthetic scenarios only. They do not prove crash safety
  on every filesystem or protect against Git commands run outside Cairn.
- The Draft remains disabled unless `CAIRN_PARALLEL_DRAFT=1` is supplied and was not
  activated in the real repository.

Milestone movement: NO

Disposition: STOPPED — DESKTOP_RECOVERY_FAILED

## Continuation — repair and rerun under Cairn Contract v1.4

This continuation does not erase or relabel the stopped evidence above. After the
owner adopted Contract v1.4 and returned the project to `STATUS: ACTIVE`, the amended
repair-and-rerun rule classified the desktop failure as a correctable checking-harness
mistake:

- the failure was caused by TypeScript template-literal escaping in the permitted
  `app/tests/concurrency-recovery.spec.ts` file;
- Node saw literal newlines inside three generated quoted JavaScript strings;
- no Electron recovery behavior, credential, external service, real coordinator
  state, or genuine product-safety boundary was reached; and
- the correction doubled only those nested backslashes. No case, assertion, expected
  safety behavior, production source, or allowed-path boundary changed.

The original failing output remains recorded above. The repaired generated script now
writes the intended newline characters and the same desktop assertions run to
completion.

### Contract-amendment preservation boundary

The separately approved v1.4 contract amendment happened after the original stopped
report. It intentionally changed `AGENTS.md` and its public governance mirrors, which
means several historical SHA-256 values pinned in the Task 015 brief are no longer the
current governance bytes. This continuation does not claim otherwise.

At re-orientation, the current amendment bytes were fingerprinted as a new
preservation baseline. The post-check comparison matched every one of those values,
including:

```text
BC7F7D196A6F576DEE97369EE7A6AA4C1AE15B86DAC079375E3B93D52C3B5CFE  AGENTS.md
B4AE54BF3557FA2892C1044FF20EEB0A6696D8908D61949F14ABE36FC80E388F  CHANGELOG.md
F1A254F6221BC47AD6AB8B3A78A5C8B6F396A4711CC83FC94A4E2121A6DDF47A  CONTRACT-TEMPLATE.md
C6D6BDF27B587EE2B5C0EB28816F3F0A17E68EB205D4C3AD2024F7108BE03BAF  EVERYDAY-WORKFLOW.md
BC9B5DBBEF781D48800D9DA0740A42E033A463E10A26DDF5CBA8BFA517998449  GETTING-READY.md
4A2018E8C46443826D7BF5AE7F0FFBFA28B44F5E3B71E342B33513315109BA0B  HIGH-STAKES.md
9EFAE920CB72C4F41DD534DD4C4AE078EE0D378E5A5C65B8A99BA0DA71EF8733  MAINTAINERS.md
81BF146A4FD3F05052F029F5B2E104E8719BAB0BB40B229B3569C1A524CB526C  README.md
1CDDAFEA0188F2A8E74418888D2E39EC3D1507C1F7FFFFF9CA7898B67D835DD2  cairn.html
```

`docs/ai-work/LOG.md` and the five protected untracked historical artifacts still
match the original brief hashes. All unrelated amendment and historical files stayed
unstaged. The original report's successful pre-build and original-stop comparisons
remain the evidence for the pre-amendment portion of Task 015.

### Continuation commands and actual results

1. Re-orientation re-read the active amended contract, project memory, recent log,
   latest report, pinned brief, High-Stakes guide, maintainer standards, complete Git
   status, full diff, branches, worktrees, and real coordinator-state path. The brief
   is unchanged at `6d89413cae0080624b0958d86267b6f704ad93c9`, with the declared parent
   `4c9f853b633c2be3e9080dbfff527e43dafa2a66`. The real repository still had one
   worktree, no `cairn/task-*` branch, and no `.git/cairn` path.
2. The bounded edit changed the three generated JavaScript write strings from `\n`
   at the TypeScript-template layer to `\\n`. The outer test expectation still
   requires the retained file to contain a real newline.
3. `npm.cmd --prefix app run test:smoke -- concurrency-recovery.spec.ts concurrency.spec.ts away.spec.ts smoke.spec.ts`
   first reproduced the sandbox-only Vite parent-directory access denial. That run
   did not exercise product behavior.
4. The identical approved local command with the required filesystem access passed:
   all three Vite builds succeeded and all **5 of 5** Playwright tests passed in about
   163 seconds. The recovery test crossed its former setup failure, opened, closed,
   reopened, and retried both recovery routes with the same task identities. The
   pre-existing `away.spec.ts` check performed its own ephemeral fixture cleanup; no
   Task 015 evidence root was deleted.
5. `npm.cmd test --workspace core` passed: **68 of 68** tests, including the unchanged
   ten-case Task 015 regression suite and the pre-existing coordinator suite.
6. `npm.cmd test --workspace cli` passed: **18 of 18** tests, including the independent
   legacy no-flag behavior check.
7. `npm.cmd --prefix app run typecheck` passed after the test correction.
8. `git diff --check` passed.
9. Actual diff inspection found Task 015 changes only in the eight permitted
   implementation, test, and report paths. The separately amended governance files
   and historical untracked artifacts remained unrelated and unstaged.
10. No dependency entry or lockfile changed. `core/package.json` changes only the
    existing test command so it includes `coordinator-regressions.test.js`.

### New retained rehearsal roots

Nothing in Task 015's retained evidence was cleaned, reset, moved, or removed. This
continuation added the following retained roots and sibling worktree containers:

```text
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-desktop-recovery-dzCJNR
C:\Users\KenJL\AppData\Local\Temp\cairn-desktop-concurrency-6xvF1A
C:\Users\KenJL\AppData\Local\Temp\cairn-smoke-TJ2C3X
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-decision-branch-moved-QHgYf6
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-decision-branch-moved-QHgYf6-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-legacy-missing-decision-commit-CqQzaz
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-legacy-missing-decision-commit-CqQzaz-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-malformed-decision-commit-sQnC07
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-malformed-decision-commit-sQnC07-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-older-high-stakes-8LpGw5
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-older-high-stakes-8LpGw5-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-older-final-d9v5mQ
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-older-final-d9v5mQ-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-older-live-action-XbLR2Y
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-older-live-action-XbLR2Y-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-disjoint-standard-drafts-Awk0nn
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-disjoint-standard-drafts-Awk0nn-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-custom-definer-setup-control-3DYDIC
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-custom-definer-setup-control-3DYDIC-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-definer-engine-recovery-SWlg11
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-definer-engine-recovery-SWlg11-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-builder-engine-recovery-Nt616W
C:\Users\KenJL\AppData\Local\Temp\cairn-task-015-builder-engine-recovery-Nt616W-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-atomic-YBCVFj
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-reservation-failure-6NQTTJ
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-reservation-failure-6NQTTJ-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-overlap-barrier-G6ukzq
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-overlap-barrier-G6ukzq-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-overlap-barrier-K95byW
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-wait-classification-dj9FSH
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-wait-classification-dj9FSH-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-wait-overlap-79XzoF
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-wait-overlap-79XzoF-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-wait-dependency-ED7A9O
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-wait-dependency-ED7A9O-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-wait-exclusive-9hoVEi
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-wait-exclusive-9hoVEi-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-wait-live-8ToooE
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-wait-live-8ToooE-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-wait-final-mKpTjb
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-wait-final-mKpTjb-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-scope-gate-618BS4
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-scope-gate-618BS4-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-approval-tamper-r0TKkZ
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-approval-tamper-r0TKkZ-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-serialized-VgCN5a
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-serialized-VgCN5a-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-failed-check-1dJSZu
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-failed-check-1dJSZu-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-conflict-OjPgxX
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-conflict-OjPgxX-cairn-worktrees
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-corrupt-state-EqeT5r
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-stale-lock-3tK4wy
```

The serialized coordinator rehearsal also retained these specific worktrees:

```text
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-serialized-VgCN5a-cairn-worktrees\task-001
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-serialized-VgCN5a-cairn-worktrees\integration-001-1784477078482
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-serialized-VgCN5a-cairn-worktrees\task-002
C:\Users\KenJL\AppData\Local\Temp\cairn-coordinator-serialized-VgCN5a-cairn-worktrees\integration-002-1784477085096
```

### Result after continuation

The corrected desktop rehearsal now proves the stopped state and same-task retry are
understandable after a real close and reopen. Together with the unchanged green core
regressions, full core and CLI suites, typecheck, existing desktop checks, scope
inspection, and real-repository boundary checks, Task 015 now reaches its approved
judgeable Draft checkpoint.

The evidence still covers only the named synthetic cases. It does not prove crash
safety on every filesystem, protect against Git commands run outside Cairn, or make
parallel coordination the default. The Draft remains disabled unless
`CAIRN_PARALLEL_DRAFT=1` is explicitly supplied. Mandatory fresh-context review is
still required before the owner decides whether to keep it.

Milestone movement: UNCLEAR

Disposition: DONE
