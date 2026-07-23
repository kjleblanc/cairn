# Task 014 — fresh-checkout tests and push CI report

## What changed

- `core/package.json` — the `test` script now builds first, then runs the
  contract-mirror test and the unit tests in one `node --test` invocation.
  The mirror test keeps its exact assertions; it simply runs after the build
  that creates `core/assets/contract.md`, the gitignored input it reads.
- `.github/workflows/ci.yml` — new: on every push and pull request, checkout,
  Node 20, `npm ci`, `npm test` (the core and cli workspaces), the same test
  step the release workflow uses. Read-only permissions.
- `docs/ai-work/tasks/014-brief.md`, this report, and one log row.

## Checks run

- Red first: a fresh local clone at the pre-fix HEAD failed `npm test` with
  ENOENT on `core/assets/contract.md` before any real test ran.
- Green: the same clone with the reordered script passed `npm ci && npm test`
  — core 51/51 (mirror + units), cli 9/9.
- Working copy after the change: core 51/51, cli 9/9.

## How to try it

Clone the repository anywhere, run `npm ci && npm test`. After pushing, the
Actions tab shows the `ci` workflow running the same tests.

## Limitations

The workflow runs on GitHub only after the owner pushes; nothing here pushes.
It covers the core and cli suites, matching the release workflow's test step.
The app's Playwright suite still runs locally only — it builds the renderer
and launches a real Electron window, and it temporarily rewrites the
machine's real `projects.json` registry, which needs its own hardening before
it belongs in CI. The release workflow's first `npm test` step now works on a
fresh checkout, but the full release pipeline remains never-exercised until a
`v*` tag is pushed.

Milestone movement: NO

Disposition: DONE
