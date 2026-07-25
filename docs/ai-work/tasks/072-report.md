# Task 072 — Report

Phase 3 Task 10: the push machinery. `app/src/main/push.ts` is new; the IPC
surface (`push:preview`, `push:execute`) reaches through `shared/ipc.ts`,
`preload.ts`, and `main/ipc.ts`. No UI — that is Task 11.

## What was built

`pushPreview(dir, exec?)` and `pushExecute(dir, exec?)` in
`app/src/main/push.ts`, both defaulting `exec` to `realExec(dir)` — a small
wrapper over `spawnSync("git", args, { cwd: dir, env: { GIT_TERMINAL_PROMPT:
"0", ... } })`, the same idiom `core/src/serial.ts`'s `git()` helper uses.
`spawnSync` (not `execFileSync`) so a non-zero exit is a value to classify,
not an exception to catch.

`pushPreview` is one read-only sequence: `rev-parse --abbrev-ref
--symbolic-full-name @{u}` (null on failure — no upstream, nothing to
preview), then `remote get-url`, `rev-list --count @{u}..HEAD`, and
`log @{u}..HEAD --format=%s`. Every command reads local refs; none contacts
the remote.

`pushExecute` runs exactly one `git push` per call, in every branch —
success, no-remote, auth, remote-ahead, other alike. There is no pre-check
call and no follow-up call. Classification reads only that one call's
stderr:

1. auth — `Authentication failed|could not read (Username|Password)|
   Permission denied`
2. remote-ahead — `fetch first|non-fast-forward|\[rejected\]`
3. no-remote — see below
4. else other, message built from the first non-blank stderr line

## The no-remote pattern is a design decision, not a literal transcription

The brief's classification order names only two regexes (auth, remote-ahead)
before "else other" — but the fixture recipe separately requires a plain
`git init` directory to classify `pushExecute` as `kind: "no-remote"`, and
"one plain `git push`" (no pre-check) rules out detecting that case any way
other than reading the push's own stderr. Verified empirically in a scratch
fixture: a directory with no remote at all gives `git push` exit 128 and
`fatal: No configured push destination.` — a string that matches neither
named regex, so without a third pattern it would silently land in "other"
and the fixture's `kind: "no-remote"` expectation would fail. Added
`NO_REMOTE_PATTERN = /No configured push destination|has no upstream
branch/`, checked after remote-ahead and before the final "other" fallback,
so it never shadows either named case. The second alternative
(`has no upstream branch`) covers a remote-configured-but-untracked-branch
push failure; also verified empirically against real git
(`fatal: The current branch feature has no upstream branch.`) though no
fixture in this task's brief exercises it directly.

## The success summary is read from stderr, not stdout

Verified empirically: `git push`'s human-readable ref-update line ("To
<url>\n   <old>..<new>  <branch> -> <branch>") is written to stderr, and
stdout is empty, even on a clean success. `summarizeSuccess` parses that
line for the destination and branch; if the shape is ever unrecognized (a
brand-new branch with no prior remote ref, for instance — not exercised by
this task's fixtures) it falls back to generic wording rather than failing
the call over a cosmetic mismatch.

## Fixture recipe, and why the corrected version was necessary

Confirmed directly before writing any test: a plain `git init` (non-bare)
origin refuses a push to its checked-out branch
("refusing to update checked out branch"), which is neither the auth nor the
remote-ahead pattern — the happy path would be unreachable and the refusal
would misclassify. The test fixture instead creates a bare origin plus two
working clones, A and B, matching `core`'s own test convention
(`core/test/serial.test.ts`) for real git repos in temp dirs, with
`user.name`/`user.email` configured locally in each clone so commits work on
a CI machine with no global identity.

## Test-first, and the RED that was actually observed

Per the task's explicit instruction, RED here means an assertion failure,
not a missing-module compile error. `app/tests-unit/push.test.ts` was
written first and initially failed to compile (module missing) as expected,
but that RED was not recorded as evidence. A deliberately wrong stub
(`pushPreview` always `null`, `pushExecute` always `{ ok: false, kind:
"other", ... }`) was committed to disk just long enough to typecheck clean
and run:

```
tests 6
pass 1
fail 5
```

Real assertion failures against real git fixtures — `undefined !== 1`,
`'other' !== 'remote-ahead'`, `'other' !== 'no-remote'`, `'other' !== 'auth'`,
and a `notStrictEqual(actual, null)` failure — proving the fixtures and
assertions exercise real behavior before any real implementation existed.
The one test that passed against the stub (`pushPreview` returns null with
no upstream) passed for the right reason: the stub's `null` return happens to
be the correct answer for that one case. The real implementation then made
all six pass, unchanged from the RED run except for `push.ts` itself.

## The auth test proves the no-retry guarantee, not just the classification

The injected-exec test supplies a fake `exec` returning status 128 and
`fatal: Authentication failed for 'https://…'` on every call, counts its own
invocations, and asserts the count is exactly 1 after `pushExecute` returns —
so a future change that adds a retry loop fails this test immediately rather
than only showing up as a slower CI run or an unexpected second network call
in production.

## IPC surface

`shared/ipc.ts` gained `PushPreview`, `PushResult`, and two `CairnApi`
methods (`pushPreview`, `pushExecute`); `preload.ts` wires both to
`ipcRenderer.invoke("push:preview"/"push:execute", dir)`; `main/ipc.ts`
registers both handlers inside the existing `registerProjectIpc()` (already
called unconditionally from `main.ts` at startup — no `main.ts` change
needed). `tsconfig.unit.json` gained `src/main/push.ts` in its file-listed
`include`, matching the existing convention of listing each new main-process
source file explicitly (its test file needed no such addition — the
`tests-unit/**/*.ts` glob already there covers new test files).

## Checks run (all real, this session)

- `npm run typecheck` (app) — clean.
- `npm run test:unit` (app) — **tests 59 / pass 59 / fail 0** (53 prior + 6
  new).
- `npx playwright test` (app) — **35 passed**, one clean run, IPC surface
  change confirmed harmless to the renderer/main bridge. (A first attempt
  showed 3 failures, all `ERR_MODULE_NOT_FOUND` for `@cairn/core`'s dist
  entry point — caused by running `cd core && npm test` concurrently in
  another shell, whose `pretest` build deletes and rebuilds `core/dist`; a
  clean rerun with nothing else touching `core/dist` passed all 35.)
- `cd core && npm test` — **tests 104 / pass 104 / fail 0**. No `core/`
  changes; unaffected.

Files touched: `app/src/main/push.ts` (new), `app/tests-unit/push.test.ts`
(new), `app/src/shared/ipc.ts`, `app/src/preload.ts`, `app/src/main/ipc.ts`,
`app/tsconfig.unit.json`, `docs/ai-work/tasks/072-brief.md`,
`docs/ai-work/tasks/072-report.md`, `docs/ai-work/LOG.md`.

## Limitations and remaining human judgment

- **Ledgered: the "other" bucket surfaces raw git text.** Its message is
  `"The push did not complete. " + <first non-blank stderr line>` — plain
  sentence around it, but the appended fragment is git's own wording for
  whatever this module does not recognize. Deliberate: a silently generic
  message for a truly unclassified failure would be less honest than the
  real detail, and this bucket is explicitly the catch-all for cases this
  task's fixtures do not name.
- **Not exercised by an automated fixture: a real credential failure against
  a live remote.** The auth path is proven by the injected `exec` seam
  exactly as the brief specifies (real network auth failures are not
  reproducible offline); the classification regex itself is the plan's own
  text, not independently re-derived.
- **Not exercised: the brand-new-branch push summary fallback.** Verified by
  reading the regex logic, not by a fixture — no test pushes a branch with
  no prior remote ref.
- Milestone movement: NO. This is internal machinery; Task 11 is what an
  owner will actually see and use.

Disposition: DONE
