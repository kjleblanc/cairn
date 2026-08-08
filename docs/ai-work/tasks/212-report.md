# Task 212 report — close the round-two findings against the owner-verdict work

**Lane:** G (worktree `.lanes/e`, branch `lane/g`). **Base commit:** `9572220`.

Four work commits: `ab627f9`, `5a2791a`, `f37a0b3`, and this record.

## What actually changed

- `core/src/serial.ts` — `changedTaskPaths` rejects any path under
  `docs/ai-work/verdicts/`.
- `core/test/serial.test.ts` — two new tests: the rejection, and a control
  proving the guard is not a widening.
- `core/test/contract-mirrors.test.mjs` — a new test that every version
  `cairn.html` states matches the canonical template.
- `docs/superpowers/specs/2026-08-07-cairn-owner-verdict-design.md` — the false
  paragraph replaced, the acceptance criterion restated, the status block
  recording both review rounds, and a stale count corrected.
- `core/package.json`, `cli/package.json`, `app/package.json`,
  `package-lock.json`, `app/package-lock.json` — 0.7.0 → 0.8.0.
- `CHANGELOG.md` — the 0.8.0 entry.
- `docs/ai-work/PROJECT.md`, `MAINTAINERS.md` — version citations, and
  `MAINTAINERS.md`'s statement of the taken-number rule.

**The main checkout was not touched.** Another session holds Tasks 208–211
there; `main` was at `9572220` when this task began and is still at `9572220`
now.

## The defect this task existed to fix

Task 204 moved the committed verdict copy out of `docs/ai-work/tasks/` to fix a
hazard, justified by a sentence asserting that **any** new non-ignored file
anywhere breaks a run in flight. That sentence was false.
`changedTaskPaths` (`core/src/serial.ts:758`) rejects only non-owned paths
under `docs/ai-work/tasks/`; every other changed path it **returns as a product
path**, and `expectedCommitSet` is derived from that same set, so
`commitExactPaths`'s equality check holds by construction.

**The move therefore removed the only hard rejection and put nothing in its
place** — a strictly worse state than the bug it was fixing, because a worker
could plant a verdict file and Cairn would commit it as verified work.

Proven with a two-arm harness against the real built core, arms identical but
for the path the worker writes mid-run:

| Worker writes | Before Task 212 | After |
|---|---|---|
| `docs/ai-work/verdicts/197.md` | **DONE**, file inside `Task 001: complete verified worker task` | STOPPED / `MODEL_RESULT_NOT_VERIFIED` |
| `docs/ai-work/tasks/999-report.md` | STOPPED / `MODEL_RESULT_NOT_VERIFIED` | STOPPED / `MODEL_RESULT_NOT_VERIFIED` |

## Checks run and real results

Answered by the ids `212-brief.md` declared. Output was observed in Lane G's
terminal and is not saved in the repository.

- **`c1` — the regression test.** PASSED, red first. `a verdict path in the
  change set prevents Cairn from committing model work` failed against the
  unmodified `changedTaskPaths` and passes with the guard. Its control, `an
  ordinary product path is still committed — the verdict guard is not a
  widening`, **passed before the guard existed**, which is what proves the
  guard narrowed nothing: it writes `docs/notes/verdicts-elsewhere.md` and
  asserts that path still commits. The harness was then re-run against the
  rebuilt core and both arms now stop identically.
- **`c2` — the spec says what the code does.** PASSED. The false sentence is
  replaced by the real behaviour, the harness result, and a note that Task 212
  wrote the guard rather than the guard already existing. The
  `core/test/serial.test.ts:763` citation no longer carries a claim it does not
  support — that test writes a `tasks/` path and proves the `tasks/` rule only.
- **`c3` — the version invariant.** PASSED. All three packages read 0.8.0 and
  both lockfiles agree. **Bumped by exact key, not by text replacement:**
  `app/package-lock.json` carries `chardet` at a coincidental `0.7.0`, and a
  naive replace would have corrupted a dependency pin. `git diff --stat` shows
  seven changed lines across five files with no reformatting.
  `CHANGELOG.md` carries the 0.8.0 entry.
- **`c4` — Cairn's checkup on Cairn.** PASSED, by running the real code rather
  than re-deriving its logic. `runCheckup` against this worktree reports
  **"Contract in sync — v0.8.0"** and zero contract-drift findings. Its
  remaining findings are pre-existing and unrelated (missing records for 195,
  200, 202; task 162 brief without report; 8 honest stopped runs; no backup
  remote). It independently reports **"Task 148 has a report but no brief"** —
  the exact case that motivated Task 205's rule correction.
- **`c5` — the page's version line.** PASSED, red first. Diverging **only**
  `cairn.html:43`, the line the existing mirror test cannot see, fails the new
  test with `cairn.html states Cairn Contract v0.7.0; the template states
  v0.8.0`. Restored and green.
- **`c6` — suites and tree.** PASSED. Against the `9572220` baseline of core
  222 / cli 24: **core 225, cli 24, 0 failures.** App: **typecheck clean, 619
  unit tests, 617 pass, 0 fail, 2 Windows skips.** Working tree clean; every
  file in `git diff --name-only 9572220..HEAD` checked against
  `git check-ignore` — none ignored.

### Checks added during the work

- **`a1` — citations resolve.** 32 `file:line` citations across the brief and
  the revised spec were extracted and read. One was a bare filename
  (`serial.test.ts:763`) that resolves only for a reader going top to bottom;
  it is now a full path. All 32 resolve.

## How to try it

From `.lanes/e`:

```
npm test --workspaces
```

Then read `core/src/serial.ts`'s `changedTaskPaths` and the two new cases in
`core/test/serial.test.ts`. To see the defect itself, revert the one-line guard
and run the same tests.

## Limitations and remaining human judgment

- **This branch is not merged.** `lane/g` sits on `.lanes/e` awaiting a quiet
  main checkout; another session holds Tasks 208–211 there. **Landing it is the
  owner's call.**
- **`lane/e` is preserved** at `2f71bc7` and one checkout restores it. `lane/c`
  and its two Task 195 commits were not touched.
- **Twelve of the twenty-two surviving round-two findings are not addressed
  here**, deliberately, because they are design questions for Plan 2 rather
  than defects in shipped code. The substantive ones: verdicts keyed by task
  number break under the renumbering the contract mandates; there is no
  cross-process "is a run active" check and core does not export its lock, so
  the design's gate is in-process only; `review` cannot represent "every check
  met and the job is still wrong"; the schema has no `ERROR` disposition though
  runs can seal one; "verdicts append" is unimplementable against a
  one-file-per-task path; and a cross-machine verdict is currently
  indistinguishable from a planted one. Each belongs to Plan 2's design, and
  Plan 2 is blocked by Prerequisite Q.
- **The `briefSkeleton` test's assertions are unanchored** and would pass on a
  wrong-but-plausible skeleton. Left as-is: it is a real weakness, not a live
  defect, and fixing it well means parsing the section rather than grepping it.
- **No paid call was made, nothing was pushed, no dependency was installed.**
  Measured immediately before this report landed,
  `git rev-list --count origin/main..HEAD` returned **134** on `lane/g`.

**Disposition: DONE**
