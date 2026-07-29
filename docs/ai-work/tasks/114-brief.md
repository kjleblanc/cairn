# Task 114 — make the visual lab preview open at the lab

## Requested visible outcome

The Kimi Work preview card for `app/` stops sitting on the launcher's
"Getting ready…" page: when the preview server opens the site root `/`, the
visual lab itself is served there with the mock-data badge and scenario
panel. The existing `/lab/index.html` path keeps working, and the shipped
Electron renderer config remains untouched.

## Boundary of intent — what must not change

- Only the lab dev-server wiring and this task's records may change. The
  shipped main/preload/renderer bundles, product runtime, core, CLI,
  contract, and the parallel lane's in-flight `core/package.json` and
  `core/test/kimi.test.ts` remain untouched.
- No dependencies, installs, external writes, credentials, provider calls,
  or Git side effects.
- The lab remains clearly marked as mock data and keeps its existing
  scenario panel and reduced-motion behavior.

## Checks that will show the outcome holds

1. `npm.cmd run typecheck` in `app/` passes.
2. `npm.cmd run build:lab` passes.
3. An in-process Vite lab server returns HTTP 200 and the mock-data badge
   for both `/` and `/lab/index.html`, then closes cleanly.
4. `git diff --check` is clean and the committed diff is scoped to the lab
   wiring plus task records.

## What DONE and STOPPED mean here

- DONE: opening the preview root serves the visual lab, while the old lab
  path still works and all checks pass.
- STOPPED: serving the root requires changing shipped code, breaks the old
  lab path, or a check fails without an in-scope correction.
