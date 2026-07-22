# Task 031 — Reset the active product to one serial task path

Date: 2026-07-21

Status: BUILT — mandatory fresh-context review and owner decision still required

## Result

Cairn now has one active task lifecycle in Desktop and CLI:

`project -> task entry -> route -> run -> check -> result`

A beginner can complete that lifecycle with the explicit offline demonstration
adapter. The UI names it as an adapter, reports `provider: none` and `model: none`,
shows the four serial activity stages, and ends with a verified result that says the
requested product change was not attempted. Normal mode has no pretend connection:
it stops at `connection-required` and writes no task records.

The active five-gate, concurrent, bounded-run, scheduler, passive-proof, and
experimental provider paths were removed from source exports, CLI commands, IPC,
renderer navigation, package manifests, clean built output, and the active tests.
Their prior Git history and task evidence remain unchanged.

This is an offline foundation. No provider was connected, no credential was used or
inspected, no model was called, no dependency was added or updated, no deployment
occurred, and no self-hosting claim is made.

## What changed

- Added deterministic connected-and-compatible routing plus one narrow offline
  adapter seam in `core/src/routing.ts`.
- Added one-run-per-project serial execution, the short task contract, exact
  brief/report/log records, Git baseline protection, exact-name optional record
  commits, fixed-schema adapter validation, and read-only legacy-state blocking in
  `core/src/serial.ts`.
- Reduced core exports and CLI commands to the serial foundation, and added
  package-local fail-closed `dist` cleaners so deleted modules cannot survive a
  clean build.
- Replaced the Desktop workflow with welcome/project selection, a project dashboard,
  task entry, route card, connection-required state, route/run/check/result activity,
  and an honest result screen.
- Kept first-run guidance, create/open/recent-project behavior, the existing Project
  Conversion entry, local settings, deterministic Direction guidance, honest record
  viewing, and Git protections.
- Removed the Anthropic SDK dependency and its unused transitive lock entries using
  the already-installed package manager in offline, lockfile-only, ignore-scripts
  mode.
- Deleted only the legacy runtime and obsolete test files named in the approved
  brief. All deletions remain recoverable from Git.
- Updated the README, getting-ready guide, CLI/Desktop guides, and changelog to
  describe the smaller product honestly.

The implementation diff before this report contained 105 approved paths: 94 tracked
changes/deletions and 11 approved additions, with 732 insertions and 18,008
deletions. `docs/ai-work/LOG.md`, Task 030, all earlier task records, and all contract
files and mirrors remained unchanged.

## Safe rehearsal and repair evidence

The required pre-build baseline failed as expected:

- `npm.cmd run build --workspace core` could not find the not-yet-created
  `routing.js` and `serial.js` modules.
- The focused renderer/IPC audit found the old Wizard, scheduler, parallel draft,
  task deck, and legacy IPC surfaces, while the new route/run channels did not exist.

Two ordinary in-scope implementation defects appeared during the build and were
repaired without weakening the checks:

- The first core serial run had three failures because Git porcelain's meaningful
  leading status space was trimmed, and the overlap guard ran after unfinished-task
  detection. Git output now uses `trimEnd()`, and overlap is refused first.
- The first focused Desktop run passed four checks and failed the serial check only
  because its locator expected text from separately styled `Provider` and `none`
  elements to be one literal string. The locator was narrowed to the displayed fact;
  the product assertion was retained.

During final diff inspection, a record-integrity edge case was also corrected. If a
provisional DONE record fails exact verification, Cairn now changes both its report
and log row to STOPPED only after proving they are byte-for-byte its own writes. If
that proof is unavailable, it preserves the records for inspection and fails closed.

## Commands and observed results

- `npm.cmd install --package-lock-only --ignore-scripts --offline` at the repository
  root: passed; lockfile-only removal completed offline, 12 packages audited, zero
  vulnerabilities reported.
- The same command in `app`: passed; 552 packages audited, zero vulnerabilities
  reported.
- `npm.cmd test --workspace core`: passed, 34 tests and 0 failures.
- `npm.cmd test --workspace cli`: passed, 8 tests and 0 failures.
- `npm.cmd --prefix app run typecheck`: passed.
- `npm.cmd --prefix app run build:vite`: passed; current main, preload, and renderer
  bundles built. Vite printed only its existing CJS Node API deprecation warnings.
- `npx.cmd --no-install playwright test` in `app`: passed, 8 tests and 0 failures.
  This covered legacy-state containment, project registry behavior, active-surface
  removal, normal connection-required behavior, the full offline serial path, and
  startup smoke behavior.
- `npx.cmd --no-install playwright test tests/serial.spec.ts --headed`: passed,
  1 test and 0 failures. The visible beginner path completed in a disposable local
  project.
- Source, clean-output, manifest, and current-bundle audits: passed with no forbidden
  runtime identifiers, experiment surfaces, Anthropic SDK references, provider API
  endpoint, or references from the current main bundle to stale chunks.
- Approved-path audit: passed for all 105 implementation paths before this report.
- Protected-history audit: passed. The pinned Task 031 brief Git object hash remained
  `480cb673fda7d7099fb4bdf9267af563e2d79a49`.
- `git diff --check HEAD`: passed.

The test fixtures emitted harmless Git warnings because the sandbox could not read
the user's global ignore file and because Git may normalize LF to CRLF on a future
write. No fixture failure or project-file change resulted.

## How the owner can try it

From the repository root, with the existing dependencies already installed:

```powershell
$env:CAIRN_MOCK = "1"
npm.cmd --prefix app start
```

Then create or open a disposable Cairn project, choose **Start one task**, enter one
visible outcome, choose **Find a route**, and run the offline demonstration.

Success looks like this:

- the route card says `Provider none` and `Model none`;
- the activity feed reaches Route, Run, Check, and Result;
- the result says `Routing demonstration: verified`, `Requested product change: not
  attempted`, and `Milestone movement: NO`;
- the disposable project receives one brief, one report, and one appended log row;
  and
- the dashboard adds no milestone stone.

Unset `CAIRN_MOCK` and reopen Cairn to see the ordinary foundation. It should stop at
the connection-required screen and create no task record.

## Limitations and human checks

- The adapter is deterministic local code, not a model. Cairn still cannot perform
  an arbitrary product task or improve itself through a real model.
- No provider connection or live model-selection UI is implemented. That requires a
  separately scoped High-Stakes task.
- Project Conversion remains guidance. Legacy `.git/cairn` state is preserved and
  blocks new task mutation; it is not migrated.
- `app/vite.main.config.ts` is outside the approved change boundary and retains an
  inert historical SDK externalization string. The active source does not import the
  SDK, the dependency is absent from manifests and locks, and the current main bundle
  contains no SDK reference.
- `app/.vite/build` retains two ignored, unreferenced chunks from older builds because
  the approved task explicitly prohibited cleaning generated directories other than
  package-local core/CLI `dist`. The current main bundle does not reference them, and
  they are not staged or committed.
- The owner should personally try the disposable headed path and verify that the
  beginner-facing wording feels clear. A fresh-context reviewer must independently
  inspect the approved boundary, diff, tests, record safety, and these limitations.

No qualified specialist was required for this local, reversible, offline build. The
mandatory fresh-context review remains required because this broadly changes the
active public workflow.

Milestone movement: **NO**

Disposition: **DONE**

Mandatory next step in a brand-new chat:

`Review High-Stakes task 031.`
