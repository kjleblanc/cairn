# Task 050 — Report

## What changed

- **Version 0.1.2 → 0.2.0**, in MAINTAINERS' six-step contract-change order:
  - `CONTRACT-TEMPLATE.md` line 3 (the "What this is" version line) first.
  - `AGENTS.md` line 3, the same version line, with its project-facts block
    (lines 13–16: `PROJECT NAME`, `WHAT WE ARE BUILDING`, `WHO WILL USE IT`,
    `CURRENT MILESTONE`) left untouched — confirmed with `diff
    CONTRACT-TEMPLATE.md AGENTS.md`, which now differs only in that block.
  - `cairn.html`'s two sites: the eyebrow line (`<p class="eyebrow">Cairn
    Contract v0.2.0</p>`) and the `id="src-contract"` embed's own "What this
    is" line. Confirmed byte-identical to `CONTRACT-TEMPLATE.md` directly
    with a Node script that extracts the `<script type="text/plain"
    id="src-contract">` block and compares it EOL-normalized against the
    template file: equal, both 8084 characters.
  - `core/package.json`, `cli/package.json`, `app/package.json` — the
    `version` field in each.
  - `npm install` at the repo root: `package-lock.json` changed exactly 2
    lines (the `cli` and `core` workspace entries' `version` fields).
  - `npm install` in `app/`: `app/package-lock.json` changed exactly 3 lines
    (the top-level `version`, the `""` package's `version`, and the
    `../core` workspace entry's `version`).
  - Hand-edited `cli/package-lock.json`'s two version fields (line 3, the
    top-level `version`; line 9, the `""` package's `version`) — the
    Task 027/028/030 pattern, since that lockfile isn't regenerable from this
    repo layout (it pulls `@anthropic-ai/claude-agent-sdk` and its platform
    optional dependencies, which aren't installed in this workspace).
  - Rebuilt core (`npm run build --workspace core`), regenerating the
    gitignored `core/assets/contract.md` from the re-versioned template;
    `app/resources/contract.md` (also gitignored) regenerated in turn via
    `app/scripts/copy-assets.mjs` during `build:vite`. The contract body was
    not touched — only the version line — so mirror equality at 0.2.0 was a
    pure rebuild, not a content edit.
- **`CHANGELOG.md`**: new top entry `## 0.2.0 — the envelope holds the pen —
  2026-07-24`, honestly describing all five plan-task groups that landed as
  repo tasks 033–049:
  - the watchdog and honest stop path (`ADAPTER_TIMED_OUT` on a wedged
    worker, tree-kill on both Windows and POSIX; `CANCELLED_BY_OWNER` on an
    owner-initiated stop; quit asking first instead of abandoning a running
    process);
  - the cross-process run lock (`cairn-run.lock` in the Git common directory,
    never the worktree or `.git/cairn`, with re-verified stale-lock healing);
  - run-reattach (navigation or reload mid-run reattaches to the live worker
    and its eventual result instead of orphaning it, naming the real lane);
  - the record-authorship inversion (the worker speaks one `cairn-claims`
    fence instead of writing `docs/ai-work` files itself; Cairn authors the
    report and log row from the claims plus its own Git verification;
    `MODEL_RECORDS_MISSING` retired for `WORKER_CLAIMS_MISSING`; worker text
    kept blockquote-quarantined so it can never forge a structural record
    line; and the retained-final-message privacy change stated plainly —
    Cairn now retains the worker's final message across the run for claims
    verification, where previously no item text was retained at all); and
  - the universal worker-result contract (one `WorkerRunResult` shape, one
    error family, one disclosure seam, one validator; proven by a synthetic
    fixture adapter that reaches verified DONE with zero envelope changes).
  Closes with "Added no dependency."
- **`cli/README.md`** (review-carried item from the Task 11 dispatch,
  originally flagged in the Task 048 review): line 30 said Cairn "verifies
  the model-authored task records" — stale after the Task 048 inversion moved
  record authorship to Cairn itself. Changed to "authors the task records
  itself from the worker's claims and its own Git verification," keeping the
  adjacent, still-true clause about creating the exact-path commit.
- **Docs-truth grep** (the Task 11 dispatch's second review-carried item):
  ran `git grep -n "model-authored"` across the repo. Outside `docs/ai-work`
  task records, `docs/legacy`, and `docs/superpowers` specs/plans (left
  untouched as history, per the dispatch), the only hit in the four named
  guides (`README.md`, `MAINTAINERS.md`, `EVERYDAY-WORKFLOW.md`,
  `app/README.md`) was the `cli/README.md` line already fixed above; none of
  the other three files matched at all. A second, broader pass (grepping
  those same four files for "writes the report/log," "worker/model writes,"
  and "docs/ai-work" phrasing) found one more candidate,
  `EVERYDAY-WORKFLOW.md`:12 ("writes the report and log row"), but on
  inspection this sentence describes the AGENTS.md-style general repo-task
  ceremony (any coding agent working on this repository, including Claude
  Code itself) — the same wording AGENTS.md's own "whole workflow" section
  already uses unchanged — not the product's conductor/worker split that
  Task 048 inverted. Left as-is; no other stale line was found.

Files touched (all named in the dispatch's boundary of intent, plus the
review-carried `cli/README.md` fix and this task's own records):
`CONTRACT-TEMPLATE.md`, `AGENTS.md`, `cairn.html`, `core/package.json`,
`cli/package.json`, `app/package.json`, `package-lock.json`,
`app/package-lock.json`, `cli/package-lock.json`, `CHANGELOG.md`,
`cli/README.md`, `docs/ai-work/tasks/050-brief.md`,
`docs/ai-work/tasks/050-report.md`, `docs/ai-work/LOG.md`.

## Checks run (all real, this session)

- `npm run build --workspace core` — clean: `assets/contract.md synced from
  CONTRACT-TEMPLATE.md`, `tsc` clean.
- Root `npm test`:
  ```
  core: tests 83 / pass 83 / fail 0   (includes "contract mirrors match the
                                        canonical template", now proving
                                        equality at 0.2.0)
  cli:  tests 9  / pass 9  / fail 0
  ```
  Counts unchanged from Task 049 (83 core / 9 cli) — this task touched no
  test files, only version strings and prose.
- `cd app && npm run typecheck` — clean, no errors.
- `cd app && npm run test:unit` — 43/43 pass, unchanged from Task 049.
- `cd app && npm run build:vite` — clean build (main 75.47 kB, preload
  1.77 kB, renderer 183.71 kB); `resources/contract.md synced from core`
  confirms the re-versioned asset flowed through.
- `cd app && npx playwright test` — 23/23 pass (55.9s, workers:1), including
  both reattach scenarios and the owner-cancel scenario, unchanged from
  Task 049.
- Direct byte-for-byte check (Node, EOL-normalized): `cairn.html`'s
  `id="src-contract"` block equals `CONTRACT-TEMPLATE.md` — equal (8084
  characters each), run after the version edits.
- `diff CONTRACT-TEMPLATE.md AGENTS.md` — differs only in the project-facts
  block, confirmed after both version edits.
- `git diff --stat` on `package-lock.json` (2 lines), `app/package-lock.json`
  (3 lines) after `npm install` — version fields only, same shape as
  Tasks 028/030.
- `git status --porcelain` before staging — matched exactly this task's file
  list (11 modified files) plus its own three new/modified record files.

## How to try it

```
git clone https://github.com/kjleblanc/cairn.git
cd cairn
npm ci && npm test
cd app && npm ci && npm run build:vite && npx playwright test
```

The app's version banner, the contract download from `cairn.html`, and every
`package.json` now read 0.2.0. `CHANGELOG.md`'s top entry describes what
Phase 2 actually built: the watchdog/cancel/quit protections, the
cross-process run lock, run-reattach, Cairn-authored records from a worker's
`cairn-claims` fence, and the universal worker-result contract proven by a
fixture adapter in `core/test/serial.test.ts`. `cli/README.md` now describes
record authorship accurately.

## Limitations

- This is a version-close and docs-truth task: no product behavior changed.
  All ten prior plan tasks (033–049) already carry their own real test
  coverage; this task's own verification is the rebuild-and-gate re-run plus
  the mirror-equality and docs greps described above.
- The broader docs-truth grep was scoped exactly as the dispatch specified —
  `README.md`, `MAINTAINERS.md`, `EVERYDAY-WORKFLOW.md`, `app/README.md` —
  and deliberately left `docs/ai-work` task records, `docs/legacy`, and
  `docs/superpowers` specs/plans untouched as historical records, per
  MAINTAINERS' "history belongs in the changelog" writing rule.
- Milestone movement: NO — this closes Phase 2's version, not a new capability.

Disposition: DONE
