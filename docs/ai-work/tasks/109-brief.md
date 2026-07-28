# Task 109 brief — every E2E spec boots an isolated throwaway profile

## Requested visible outcome

The full E2E suite runs green with no environment variables set by the
operator, and never reads or writes the owner's real app profile
(`AppData/Roaming/Cairn`) — so test runs can never again pollute
`projects.json` or touch the real stored conductor connection (the
accumulation that wedged the app, diagnosed in Task 103).

## Boundary of intent — what must not change

- No application source changes; `app/src` is untouched (the
  `CAIRN_TEST_USER_DATA` + `CAIRN_E2E` guard at `main.ts:16` already exists
  and stays as it is).
- Test behavior and assertions are unchanged: same tests, same checks,
  same `workers: 1`. Only *where the profile points* changes.
- The conductor-connection snapshot fixture keeps its exact behavior; it
  now operates on the throwaway profile (defense in depth), and its stale
  "can't be redirected" comment is corrected.

## Design (verified against the code before writing)

A worker-scoped auto Playwright fixture
(`tests/fixtures/isolated-profile.ts`) creates one fresh temp profile per
spec file, sets `CAIRN_E2E=1` and `CAIRN_TEST_USER_DATA` for the file's
duration (worker fixtures run before `beforeAll`, so the existing
snapshot/seed hooks see the isolated path), and restores the environment
and deletes the temp dir at teardown. Every spec launch spreads
`process.env`, so no launch site changes. Relaunches inside one test
(reload/reattach specs) correctly share the file's profile. Each spec's
`test` import switches to the fixture module.

## Checks that will show the outcome holds

1. Full suite, no operator env: 41/41 green (same batches as Task 103).
2. The real `projects.json` entry count is identical before and after the
   run (currently 3 — from Task 108's canary runs).
3. No `cairn-e2e-profile-*` temp dirs leak after the run.
4. Typecheck clean; bundle untouched (`git diff app/src` empty).

## What DONE and STOPPED mean here

- DONE: all four checks pass and the diff is test files plus records only.
- STOPPED: any test needs the real profile by design, or isolation breaks
  an assertion — report before improvising.
