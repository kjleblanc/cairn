# Task 014 — a fresh checkout passes `npm test`, and tests run on every push

Requested visible outcome: `npm ci && npm test` succeeds on a clean clone of
the repository, and GitHub runs the same tests automatically on every push and
pull request.

Why: core's `test` script runs the contract-mirror test before the build, but
that test reads `core/assets/contract.md` — a gitignored file only the build
creates. On any fresh checkout (including the release workflow's) `npm test`
fails with ENOENT before a single real test runs. The failure reproduced live
during Task 012's version bump. The release workflow has never run and would
fail at this step today; no workflow runs tests on push at all.

Boundary of intent:

1. `core/package.json` — reorder the `test` script: build first, then the
   mirror test and unit tests. The mirror check keeps its exact assertions and
   stays release-blocking; only its position changes.
2. `.github/workflows/ci.yml` — new minimal workflow: on push and pull
   request, checkout, Node 20, `npm ci`, `npm test` (the core and cli
   workspaces), matching the release workflow's test step.

What must not change: the mirror test's assertions; the release workflow; app
packaging; no dependency changes. The app's Playwright suite stays local-only
for now (it launches a real Electron window) and is noted in the report.

Checks (red-first):

- A fresh local clone at the current HEAD fails `npm test` with the ENOENT.
- The same clone with the reordered script passes `npm ci && npm test`.
- The full working-copy suites stay green.

DONE means the fresh-clone check passes and the CI workflow file exists with
the same test step the release workflow uses. STOPPED means it does not.
Milestone movement: NO.
