# Task 133 report: contract v0.5.0 — apply the owner-approved evolution

**Lane:** B (`.lanes/b`) · **Base synced from:** main @ 2318ab6 (Task 130)

## What changed

The Cairn contract is now **v0.5.0**, carrying all eight owner-approved
changes from Task 132's proposal. Files touched, exactly:

- `AGENTS.md` — version string; `EVIDENCE LEVEL: Verified` fact; `ARCHIVED`
  status; new "Who decides what", "Evidence levels", and "One template, many
  projects" sections; human-judgment and measurement-precondition sentences in
  the verification paragraph; checkable-evidence report bullet; the milestone
  records-rule paragraph.
- `CONTRACT-TEMPLATE.md` — identical text with blank facts and
  `EVIDENCE LEVEL: Core` as the template default.
- `cairn.html` — embedded contract block re-spliced from the new template;
  eyebrow bumped to v0.5.0.
- `app/package.json`, `cli/package.json`, `core/package.json` plus
  `app/package-lock.json`, `cli/package-lock.json`, `package-lock.json` —
  shared version 0.5.0 via `npm version --no-git-tag-version`.
- `MAINTAINERS.md` — lane-rules reference now names contract v0.5.0.
- `CHANGELOG.md` — the 0.5.0 entry, citing the proposal, the evidence base,
  and the owner's four delegated calls.
- `docs/ai-work/PROJECT.md` — declares evidence level **Verified**.
- `.gitignore` — ignores `docs-review/staged/` (regenerable copies).

Delegated calls applied: no mechanized milestone ratchet (records-rule only —
Cairn lacks delve's demonstrated failure); Cairn declares Verified;
`docs-review/staged/` ignored while REPORT.md and notes/ stay tracked; no
proposal items struck.

## Checks run and their real results

- `grep -c "0.4.0"` on AGENTS.md, CONTRACT-TEMPLATE.md, cairn.html,
  MAINTAINERS.md → **0** in each; v0.5.0 present in all four (cairn.html ×2:
  eyebrow + embed).
- `npm run test:unit` in `app/` → **111/111 pass**, including the
  constitution-pinning suite.
- `npm test` in `core/` → **139/139 pass**.
- `core` build's `sync-contract.mjs` regenerated `core/assets/contract.md`
  from the new template — the app now ships v0.5.0 text.
- `git status` before commit: only the 13 files above plus task records.

Two in-task harness repairs, disclosed per the repair rule: lane B's worktree
had no installed dependencies (`@cairn/core` unresolved) and no core build —
fixed with `npm install` in the worktree root and `npm run build` in `core/`.
Neither touched a file outside the worktree's ignored `node_modules`/`dist`.

## How to try it

Read the new sections in `AGENTS.md` ("Who decides what", "Evidence levels",
"One template, many projects") or open `cairn.html` — the contract tab shows
v0.5.0. The CHANGELOG's 0.5.0 entry is the plain-language summary.

## Limitations / remaining human judgment

- Other projects are untouched by design: rollout follows the proposal's
  table as separate owner-directed tasks (cairn-eval on resume, delve on
  unpause, SpecDeck after migration, cairn-test archive decision,
  Workflow Docs banner).
- `docs-review/REPORT.md` and `notes/` in the main checkout are still
  untracked; committing them belongs to lane A once task 131 closes (the
  .gitignore rule arrives with this landing).
- Landing into `main` remains deferred until lane A's task 131 closes; settle
  check (build + unit) then runs on `main`.

**Disposition: DONE**
