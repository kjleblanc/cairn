# Task 050 — Brief

Requested visible outcome: close Task 11 of the Phase 2 core-surgery plan —
the phase's version bump, changelog entry, and a docs-truth pass — landing
Cairn at version 0.2.0 everywhere the version is declared.

Boundary of intent: `CONTRACT-TEMPLATE.md` (version line only), `AGENTS.md`
(version line only, project-facts block untouched), `cairn.html` (the eyebrow
line and the `id="src-contract"` embed's own version line — the embed must
stay byte-identical to `CONTRACT-TEMPLATE.md`), `core/package.json`,
`cli/package.json`, `app/package.json`, and all three lockfiles (root and
`app/` regenerated via `npm install`; `cli/package-lock.json` hand-edited,
per the Task 027/028/030 pattern, since it is not regenerable from this repo
layout). `CHANGELOG.md` gains one new top entry. `cli/README.md` gets one
stale clause fixed (a Task 048 review finding, folded into this task): it
still described Cairn as verifying model-authored task records after the
Task 048 inversion moved authorship to Cairn. No product code changes. No new
dependency. No milestone movement — this closes a version, not a capability.

Checks that show the outcome holds:

- `npm run build --workspace core` — clean rebuild, `assets/contract.md`
  regenerated at the new version.
- Root `npm test` — the `contract mirrors match the canonical template` test
  proves `CONTRACT-TEMPLATE.md`, `core/assets/contract.md`, and `cairn.html`'s
  embed agree at 0.2.0; core and cli suites both green.
- `cd app && npm run typecheck && npm run test:unit && npm run build:vite &&
  npx playwright test` — all green, `resources/contract.md synced from core`
  confirms the re-versioned asset flowed through the app build too.
- `git status --porcelain` before staging matches exactly this task's file
  list plus its own three record files.

DONE means: all three version mirrors read 0.2.0 and are proven byte-equal by
the existing mirror test; the changelog's new top entry honestly describes
every Task 1–10 outcome (watchdog/cancel, the cross-process lock,
run-reattach, the record-authorship inversion, and the universal
worker-result contract) and ends "Added no dependency"; `cli/README.md` no
longer says Cairn verifies model-authored records; core, cli, app-unit, and
Playwright suites are all green; and the exact-path commit contains only the
files this brief names plus the three new record files. STOPPED means a gate
failed, mirror equality broke, or the changed-file set held anything
unexpected.
