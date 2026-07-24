# Task 054 — Report

## What actually changed

**Product (the two root-cause fixes and one review-driven sibling):**

- `core/src/files.ts` — new exported `canonicalPath()`: `realpathSync.native`
  with a fail-closed fallback to `resolve()` when the filesystem cannot
  answer.
- `core/src/serial.ts` — `snapshot()`'s root-identity gate canonicalizes both
  sides before comparing, and a firing gate now names all four spellings
  (git's toplevel raw and canonical, the given root raw and canonical)
  instead of the bare `PROJECT_ROOT_MISMATCH` code. The local compare logic
  is otherwise unchanged; genuinely different directories still refuse.
- `core/src/codex.ts` — `insideWorkspace()` canonicalizes both sides
  (review finding: a project opened through an aliased spelling let a
  repo-planted codex binary slip past the workspace-containment exclusion;
  demonstrated red-first before the fix).

**Tests:**

- `core/test/alias-spelling.ts` (new) — shared `aliasedSpelling()` helper:
  8.3 short-name spelling via cmd `%~sI` on win32 (chcp 65001 so output
  decodes as UTF-8; quoted echo so a literal `&` cannot split the command),
  symlink spelling on POSIX, honest null when no alias exists.
- `core/test/serial.test.ts` — new test: an aliased root completes a serial
  task (RED `PROJECT_ROOT_MISMATCH` before the fix, GREEN after). The
  overlapping-run test's adapter-entry spin-wait became `untilAdapterEntry`,
  which fails fast when the watched run settles before adapter entry; a new
  regression test pins that (10-second test timeout; watched it hang under a
  45-second bound with the escape deliberately neutered, instant green with
  it restored).
- `core/test/codex.test.ts` — new test: readiness ignores a workspace-local
  codex under an aliased root spelling (RED
  `{installed: true, connected: true}` before the codex.ts fix, GREEN after).

**Workflows:**

- `.github/workflows/ci.yml` — `timeout-minutes: 20` on the test job and a
  `concurrency` group with `cancel-in-progress: true`, so a newer push
  supersedes a stalled run.
- `.github/workflows/release.yml` — `timeout-minutes: 45` per matrix leg
  (review finding: it runs the same suites plus Electron `make` on two OSes
  with no bound; the macOS leg also needed the serial.ts fix — its tmpdir is
  a symlinked spelling `/var → /private/var`, the same class).

**Version 0.2.1 (post-close fix, per 0.1.1/0.1.2 precedent):**
`CONTRACT-TEMPLATE.md`, `AGENTS.md`, `cairn.html` (both embedded version
lines), `core/package.json`, `cli/package.json`, `app/package.json`,
`package-lock.json`, `app/package-lock.json`, and a `CHANGELOG.md` entry.

## Root causes (diagnosed this session, evidence in the brief)

1. GitHub's Windows runners address TEMP through an 8.3 short name;
   `resolve()` never expands it while git reports the long path, so every
   serial test that reached `snapshot()` failed `PROJECT_ROOT_MISMATCH`.
   Reproduced locally (37 of 39 serial tests) by pointing TEMP at a
   short-name alias.
2. The overlapping-run test's bare spin-wait had no escape when the watched
   run threw pre-adapter; the abandoned immediate chain held the test
   process open forever. Diagnosed by handle dump (one perpetually
   rescheduled `Immediate` after all tests completed); every `ci` run to
   date burned to GitHub's six-hour kill this way.

## Checks run and real results

1. Alias serial test: RED (`PROJECT_ROOT_MISMATCH`) before, GREEN after. ✓
2. Spin-wait: the brief planned "only the wait fix applied, whole suite
   fails fast" — executed instead as a pinned regression test with a
   discrimination check (escape neutered → reproduced the hang under a
   bounded kill; restored → passes in ~3 ms). Same evidence, kept in the
   suite forever. ✓
3. Full suites under short-name TEMP/TMP (the CI condition): five
   consecutive runs, core 93–94/93–94 each, exiting in 24–32 s. ✓
4. Normal paths: core 94/94, cli 9/9, app unit 43/43, Playwright 24/24. ✓
5. `ci.yml` carries `timeout-minutes: 20` (plus concurrency);
   `release.yml` carries `timeout-minutes: 45`. ✓

Codex alias-shadow test (added at review): RED before the codex.ts fix,
GREEN after, inside the full suite. ✓

## Review

Three-lens adversarial review over the working diff. Applied from it: the
enriched mismatch error, the release.yml timeout, the `insideWorkspace`
canonicalization with its red-first test, the test timeout on the fail-fast
regression, the cmd codepage/`&` hardening in `aliasedSpelling`, the ci.yml
comment accuracy pass, and the concurrency group. One reviewer observed the
fixed gate fail transiently under short-name TEMP (2 of their 8 runs,
consistent with a transient `realpathSync.native` failure on first touch of
a fresh alias tree); five later runs here could not reproduce it. If it
recurs, the enriched error now names the exact spellings compared, so the
next investigation starts with evidence instead of a bare code.

## Repairs disclosed (both mine, both inside this task)

- A PowerShell rewrite of `cairn.html` re-encoded it and mangled multi-byte
  characters; caught by the contract-mirror test, restored from HEAD, redone
  as a two-line encoding-safe edit (final diff: the two version lines only).
- The `app/package.json` version bump briefly gained a UTF-8 BOM, which
  broke Vite's PostCSS config JSON parse; rewritten BOM-less, Playwright
  green after.

## How to try it

- `npm test` at the repo root — both workspaces green.
- The CI condition locally (PowerShell):
  point `$env:TEMP`/`$env:TMP` at any 8.3 spelling of your temp directory
  (e.g. from `cmd /c for %I in ("<a-long-named-dir>") do @echo %~sI`) and
  run `npm test` — green, exits in about half a minute.
- Push: the `ci` workflow should produce this repository's first green run;
  any future wedge dies at 20 minutes.

## Limitations and remaining judgment

- The POSIX symlink branch of `aliasedSpelling` and the macOS
  `/var → /private/var` claim are reasoned, not machine-verified here
  (Windows box); the windows-latest condition — the one that burned the
  three runs — is verified end to end. The runner's own green run lands with
  the owner's next push.
- The reviewer-observed transient canonicalization failure is unreproduced
  (5/5 clean here); treated as hardening-by-evidence, not a closed defect.
- The still-running wedged CI run (30118066281) is the owner's to cancel
  (`gh run cancel 30118066281`) or to leave for its ~6-hour self-kill; the
  new concurrency group will also cancel it automatically on the next push.

Disposition: **DONE**
