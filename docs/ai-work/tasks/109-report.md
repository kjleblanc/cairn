# Task 109 report — every E2E spec boots an isolated throwaway profile

## What actually changed

- `app/tests/fixtures/isolated-profile.ts` — **new.** A worker-scoped auto
  Playwright fixture: one fresh temp profile per spec file, `CAIRN_E2E=1`
  and `CAIRN_TEST_USER_DATA` set for the file's duration (worker fixtures
  precede `beforeAll`, so every existing hook sees the isolated path),
  environment restored and temp dir deleted at teardown. Uses the app's
  own guarded test seam (`main.ts:16-22`); no application code touched.
- `app/tests/{away,conductor,connect-kimi,projects,routing,serial,smoke}.spec.ts`
  — one import line each: `test` now comes from the fixture module. No
  assertion, launch, or helper changed (every launch spreads
  `process.env`, so the redirect covers all of them).
- `app/tests/fixtures/conductor-connection.ts`, `app/tests/projects.spec.ts`
  — stale header comments corrected: the profile *can* be redirected (and
  now always is); the snapshot/seed/restore dances stay as defense in
  depth, now operating on the throwaway file.
- Records: `109-brief.md`, this report, one LOG.md row.

## Checks run and their real results

1. **Full suite, zero operator environment: 41/41 green** (8 + 11 + 11 +
   11, same batches as Task 103; conductor line numbers shifted +1 from
   the import edit and were re-listed).
2. **Real profile untouched:** `AppData/Roaming/Cairn/projects.json` held
   2 entries before the run and 2 after (the suite previously appended
   one per test). No real `conductor.json` exists to touch; none was
   created. **Pass.**
3. **No leaks:** zero `cairn-e2e-profile-*` dirs in Temp after the run.
   **Pass.**
4. `tsc --noEmit` — clean (one typing repair during the task: the fixture
   generic uses Playwright's `{}` idiom; `Record<string, never>` made the
   `void` fixture unassignable — caught by typecheck, fixed, disclosed).
   **Pass.**
5. `git diff app/src` — empty. **Pass.**

## How to try it

```powershell
cd app
npm.cmd run test:smoke
```

Nothing to set, nothing to clean: the suite builds, runs entirely against
throwaway profiles, and your own remembered projects and connection are
exactly where you left them.

## Limitations and remaining human judgment

- `workers: 1` stays, per the config's load-bearing comment; with
  isolation the original hazard is smaller, but changing it was out of
  scope.
- The registry still grows unbounded in real use (the app the owner
  runs); that is Task 110.

Disposition: DONE — the suite is green with nothing to set, and it can no
longer touch the owner's real profile.
