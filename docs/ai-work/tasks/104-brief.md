# Task 104 — adopt the two-lane working protocol

Requested outcome: the owner-approved two-lane protocol
(`docs/superpowers/specs/2026-07-28-cairn-two-lane-protocol-design.md`,
Task 102, approved 2026-07-28 by "Proceed with implementation") becomes
real: the contract names it, the log auto-merges, and lane B exists as a
working git worktree. Owner direction 2026-07-28: "Proceed with
implementation."

Context: Task 102's spec lists four adoption pieces — the
`.gitattributes` union rule, the lane worktree with its own install, and
the `AGENTS.md` amendment — plus the mechanisms it relied on. Both
load-bearing mechanisms were proven in a throwaway repository before this
task: a nested worktree at `.lanes/b` works under Git 2.54, and
`merge=union` resolved concurrent `LOG.md` appends keeping both rows
with no conflict. Task numbering: 103 was claimed by the parallel
session (E2E re-verification) while this task was being prepared; this
task is 104.

Open questions from the spec, decided here under the owner's blanket
approval: lane B lives at `.lanes/b` **inside** the repo (keeps one
folder; the spec allowed either); dev `npm start` runs take the app
token like any real-app launch (they share the real profile); adoption
is direct, not piloted — the protocol governs on commit.

Boundary of intent:

- Files that may change: `CONTRACT-TEMPLATE.md`, `AGENTS.md`,
  `core/assets/contract.md` (via the existing sync script), `cairn.html`
  (its embedded contract block and version eyebrow), `core/package.json`,
  `cli/package.json`, `app/package.json`, the three lockfiles' own
  version fields, `CHANGELOG.md` (one 0.4.0 entry), `.gitattributes`,
  `.gitignore`, `docs/ai-work/PROJECT.md` (the working-rule line), this
  task's records, and one LOG.md row. The contract version bumps
  v0.3.0 → v0.4.0 everywhere it is declared, per the changelog's
  one-version rule.
- The lane B worktree at `.lanes/b` (branch `lane/b`) is created and its
  dependencies installed (`npm install` at the lane root and in
  `.lanes/b/app` — the install the owner approved with this
  implementation; same lockfiles, reversible by removing the worktree).
  `.lanes/` is gitignored; the worktree is not committed.
- No application, core, cli, or test source changes. No E2E run in this
  task: the parallel session's Task 103 owns the app/E2E surface right
  now, and this task changes no behavior it measures (the version string
  feeds only the update-check IPC; no test asserts it). No `build:vite`
  either — `app/dist` is shared with that run. Task 103's fresh build
  and full suite on the merged tree serve as the settle check for this
  landing.
- The parallel session's in-flight work (`103` records, its LOG row when
  it lands, the untracked `design/`) is not staged, not rewritten, not
  deleted.
- Existing task records and log rows are history: unchanged.

Checks:

1. `core/test/contract-mirrors.test.mjs` passes — template, asset, and
   companion block identical.
2. Root `npm test` (core + cli) passes with the amended contract text.
3. `cd app && npm run typecheck` passes (noEmit; nothing written into
   the shared `app/dist`).
4. `git worktree list` shows `.lanes/b` on `lane/b`; main-tree
   `git status` stays clean of it; the lane's installs complete and
   `npm run typecheck` passes inside `.lanes/b/app` (writes only into
   the lane's own tree).
5. Final diff and Git status contain only this task's named paths; if
   the parallel session's uncommitted LOG row or records appear before
   staging, the commit waits rather than staging them.

DONE means the contract (template, both mirrors, AGENTS.md) names the
two-lane protocol at v0.4.0, the union rule and `.lanes/` ignore are in
place, lane B exists and typechecks, and the checks above pass.

STOPPED means a mirror cannot be brought into sync, a check regresses,
the worktree or install fails, or isolation from the parallel session's
work cannot be maintained — in which case the tree is preserved and the
owner decides.
