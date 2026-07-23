# Task 012 — phantom-dirty start report

## What changed

- `core/src/serial.ts` — new `statusLines()` helper: a worktree-only
  modification entry (` M`) counts toward the working-tree state only when
  `git diff --name-only` confirms a real content change; staged, untracked,
  renamed, and deleted entries always count. Used by `snapshot()` for the
  starting state and by `verifyProtected()` for the offline path's live
  comparison, so both sides share one view. The brief's first suggestion,
  `git update-index -q --refresh`, was tried and proven insufficient: a
  scratch-repo experiment showed the CRLF phantom survives `--refresh` and
  `--really-refresh`, while the content diff stays clean — so the fix uses the
  brief's alternative, a content-based check.
- `core/test/serial.test.ts` — new red-first test "a phantom stat-dirty start
  still creates the exact-path task commit". It failed before the fix with
  commit `skipped`, and passes after with commit `created`, exact commit
  paths, no leftovers beyond the untouched phantom entry, and a clean content
  diff. One assertion was corrected during the task: git keeps showing the
  phantom stat entry until the file itself is touched, so the test asserts
  nothing else remains and the content view is clean, rather than raw status
  emptiness.
- Version 0.0.4 → 0.0.5 with mirrors: `CONTRACT-TEMPLATE.md`, `AGENTS.md`,
  `cairn.html` (eyebrow and embed), `core/package.json`, `cli/package.json`,
  `app/package.json`, `package-lock.json`, `app/package-lock.json`,
  `cli/package-lock.json`, and a new `CHANGELOG.md` entry.

## Checks run

- Red first: the new test failed `skipped !== created` before the fix.
- Core suite: 50/50 pass, including the existing "a dirty-start Codex result
  preserves owner work and remains uncommitted" test unchanged — genuine
  dirty starts still skip the commit — and the contract-mirror test at 0.0.5.
- CLI suite: 9/9 pass. App: typecheck clean, Playwright 13/13 pass.
- Known issue confirmed in passing: core's `npm test` runs the mirror test
  before the build that regenerates its input, so the mirror test failed once
  against the stale 0.0.4 asset until a manual rebuild. That ordering fix is
  deliberately out of this task's boundary and lands as Task 014.

## How to try it

In a project with a stat-only or line-ending-only modified file, run a task
that completes DONE: Cairn now creates the exact-path commit instead of
skipping it, and a rerun starts clean.

## Limitations

Paths containing characters that `git status --porcelain=v1` quotes are never
treated as phantom (the quoted form does not match the diff view), so they
fall back to the stricter old behavior: counted as real dirt. Fail-closed, and
consistent with the existing path handling.

Milestone movement: NO

Disposition: DONE
