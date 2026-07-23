# Task 012 — A phantom-dirty start no longer skips a task's commit

Requested visible outcome: a task whose working tree is "dirty" only by
phantom differences — files that are content-identical to the index but differ
by stat or line endings (e.g. a CRLF working copy over an LF index under
autocrlf) — commits its verified work normally, instead of treating the start
as dirty, skipping the commit, and leaving the work uncommitted to poison the
next run.

Why (Task 010/011): run 1 finished DONE but skipped its commit because
`snapshot()` computed a non-empty `start.status` from `git status --porcelain`,
which reports phantom stat/line-ending dirt that a content diff does not. That
left the tree dirty, and the rerun (011) stopped with `PROTECTED_WORK_CHANGED`.
This is the same phantom class Task 007 fixed at the post-commit check
(`verifyModelGitResult`); the start snapshot still has it.

Boundary of intent:

1. `core/src/serial.ts` — `snapshot()` (and any dirtiness gate derived from it)
   ignores phantom, content-clean differences when deciding whether the start
   is dirty. Refresh the index (`git update-index -q --refresh`, or an
   equivalent content-based check) so stat-only and line-ending-only entries do
   not count as `start.status`.
2. Genuine owner work is still protected: a real content change present at start
   still makes the start dirty, still skips the isolated commit, and still
   leaves owner work byte-identical. Only phantom dirt stops counting.

What must not change: exact-path staging only; the tolerant dirty-start design
for real uncommitted work; no dependency, retry, scheduler, or sandbox change.

Checks (red-first):

- A repo with a phantom stat-dirty file (CRLF over LF, autocrlf) at start → a
  verified fake-Codex task creates its exact-path commit (commit `created`,
  DONE), where before it skipped the commit.
- The existing "a dirty-start Codex result preserves owner work and remains
  uncommitted" test still passes unchanged (real edits still tolerated).
- Core, cli, and app suites green.

Version 0.0.4 → 0.0.5 with changelog and mirrors.

DONE means the phantom-dirty-start test proves the commit is created and the
genuine dirty-start protection is intact, with all suites green. STOPPED means
it does not. Milestone movement: NO — this hardens the path the milestone runs
on.
