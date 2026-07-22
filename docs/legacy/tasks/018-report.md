# Task 018 — report

## Result in plain language

Cairn now has the smallest executable Contract v2.0 core lifecycle. It is an
internal experiment that is off by default, works only in mock mode, accepts only a
Cairn v2 project beneath the operating-system temporary directory, and refuses to
run when the parallel Draft flag is enabled.

With the two exact opt-ins present, the path completed one synthetic Standard task
serially in this order:

1. wrote `001-brief.md`;
2. wrote the visible `serial-v2-001.txt` mock result;
3. checked that the file exists and its bytes match the fixed expectation;
4. wrote `001-report.md` with `Disposition: DONE`;
5. appended an `Applied / completed / DONE` row to the synthetic `LOG.md` and parsed
   it back; and
6. returned `DONE`.

The synthetic task directory contained exactly the brief and report. It contained
no approval JSON, decision JSON, review artifact, coordinator state, Git repository,
branch, or worktree.

The current CLI and Desktop remain on their existing default behavior because the
new module is not imported by either one and is not exported from
`core/src/index.ts`. No legacy gate, coordinator source, parallel test, package
manifest, lockfile, dependency, or public document changed.

## Files changed

- `core/src/serial-v2.ts` — new internal default-off, mock-only, temporary-only
  serial v2 lifecycle.
- `core/test/steps.test.ts` — two tests for the closed guards, valuable-workspace
  refusal, complete synthetic lifecycle, and absence of gates/coordinator/Git.
- `docs/ai-work/tasks/018-brief.md` — task boundary.
- `docs/ai-work/tasks/018-report.md` — this evidence.

The build refreshed ignored generated output under `core/dist` and
`core/assets/contract.md`; neither appears in the tracked diff.

## Commands run and real results

### Contract amendment preservation

- Embedded-contract equality check: passed. The `cairn.html` contract block matched
  `CONTRACT-TEMPLATE.md` exactly after newline normalization; both declared Contract
  v2.0 and the template declared `STATUS: ACTIVE`.
- Amendment-only `git diff --check`: passed with only existing Windows line-ending
  warnings.
- Exact-name staging audit: passed. The staged set contained exactly eleven
  amendment files and excluded `docs/ai-work/LOG.md` plus every untracked artifact.
- `git commit -m "Adopt Cairn Contract v2.0"`: passed as commit
  `9a3d36f6bffbd76cee7b7df4ba3554927ea5728e`.

### Serial v2 implementation

- `npm.cmd run build --workspace core`: passed. The contract asset synced and
  TypeScript compiled.
- `node --test --test-name-pattern "serial v2 mock path" core/dist/test/steps.test.js`:
  passed 2/2 before the final valuable-workspace assertion was added.
- `npm.cmd test --workspace core`: passed 79/79 after all test assertions were in
  place, including both serial-v2 tests. The full suite took about 120 seconds.
- Final focused rerun of the same `node --test --test-name-pattern` command: passed
  2/2 with every guard and lifecycle assertion in place.
- Focused source/test `git diff --check`: passed.
- Pre-staging diff audit: only `core/test/steps.test.ts` had a tracked diff and
  `core/src/serial-v2.ts` was the only new product source. There was no tracked diff
  under `cli/`, `app/`, coordinator files, package manifests, lockfiles, or public
  documents.
- Protected-byte audit: all six SHA-256 values from the brief still matched after
  build and test execution.
- Exact-name staging audit: passed. The staged set contained exactly the brief,
  report, new internal module, and focused test change. The protected root log and
  five protected untracked artifacts remained outside the index.

The exact-name local task commit is the final operation after this report is written;
its result and commit hash are stated in the task handoff.

The full existing core suite exercised its own disabled parallel-candidate tests in
new synthetic temporary repositories. Those tests emitted their existing retained
temporary evidence paths. They did not change or activate parallel code in this
repository; the real project retained no coordinator state, task branch, or extra
worktree.

## How the owner can try it

From the repository root, run:

```powershell
npm.cmd run build --workspace core
node --test --test-name-pattern "serial v2 mock path" core/dist/test/steps.test.js
```

Success looks like two passing tests. The first proves the path refuses default-off,
non-mock, parallel-flag, and valuable-workspace use before task writes. The second
proves one temporary synthetic project reaches brief, visible build, checks, report,
log, and `DONE` with no approval, review, coordinator, or Git artifacts.

Failure looks like a compilation error, either test failing, a task artifact written
while a guard is closed, a missing or mismatched result file, a log row other than
`Standard / Applied / DONE / completed`, or any approval/decision/Git artifact.

## Limitations and human checks

- This is a fixed mock outcome, not a general definer or real-model runner.
- It is deliberately not reachable from the current CLI, Desktop, or package-root
  API.
- It proves one synthetic temporary path only. It proves nothing about valuable
  repositories, model quality, credentials, cost, network access, production use,
  failure recovery after partial filesystem writes, or broader task classification.
- The owner can inspect the two focused tests to judge whether their lifecycle is
  the right smallest foundation for the next real-model milestone step.

## Protected work and project-history exception

The pre-existing `docs/ai-work/LOG.md` change remained unstaged and byte-identical at
SHA-256
`F428CCD609485334E4ABD13468A4B672C2FC6A4B21277AD8B0D6A99679C0C56E`.
The five named untracked artifacts also remained untracked and byte-identical.

The owner explicitly required that root work-log change to remain untouched, so no
Task 018 row was appended to the real project's `docs/ai-work/LOG.md`. This is a
disclosed project-history exception to the usual Standard-task closeout. The
synthetic v2 lifecycle itself did append and verify the required
`Applied / completed / DONE` row, which is the product behavior this task set out to
prove.

Milestone movement: YES

Disposition: DONE
