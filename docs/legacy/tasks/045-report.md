# Task 045 — Windows installer report

## Result

Disposition: **DONE**

Cairn's Electron Forge configuration now produces a local Windows x64 Squirrel
installer whose packaged application starts without a missing-module or main-process
exception. The repaired packaged executable was run only in mock mode for a bounded
startup check; the installer was not run or installed.

## Artifacts

- Installer: `app/out/repaired/make/squirrel.windows/x64/Cairn-0.1.0 Setup.exe`
  - Size: 112,637,952 bytes
  - Product version: 0.1.0
  - SHA-256: `90BA45EC7901A5B8507E2DA0F12176CE7E58525344860234EDAACBAA1B6C3BF0`
  - Signing state: NotSigned
- Packaged executable: `app/out/repaired/Cairn-win32-x64/cairn-desktop.exe`
  - Size: 188,784,128 bytes
  - Product version: 0.1.0
  - Signing state: NotSigned

Both paths are ignored by Git through `app/.gitignore` and the root `.gitignore`.

## What changed

- Built the already-configured Windows Squirrel target from installed dependencies.
- Fixed the production main-process bundle so `electron-squirrel-startup` is included
  while Electron and every Node built-in remain external for the Electron runtime.
- Added a focused Electron assertion that rejects an unresolved packaged runtime
  import for `electron-squirrel-startup`.
- Added root README instructions for the one-line development launch command and the
  local installer build command.
- Added a changelog entry and the required Task 045 records.
- Changed no package manifest, lockfile, dependency, renderer behavior, provider
  route, or credential handling.

## Failed evidence and repairs

- The first packaged executable failed with `Cannot find module
  'electron-squirrel-startup'`. The Vite bundle had externalized a dependency that
  Forge's Vite packaging hook did not copy.
- The first repair bundled that dependency but failed with `TypeError: basename is
  not a function`. The custom main-process Vite config had replaced Forge's complete
  Node built-in external list with an incomplete `node:`-only pattern.
- The corrected config matches Forge's main-process boundary: the application
  dependency is bundled and both bare and `node:` built-ins remain runtime externals.
- Two full-suite attempts against the broken intermediate bundle timed out and left
  exact Playwright Electron processes. Those test processes were identified and
  removed before the passing rerun.
- A repaired make attempt against the original output reached packaging but stopped
  because two processes from the owner's broken raw-executable launch still locked
  that generated folder. Forge's API then built the same verified configuration into
  the separate ignored `app/out/repaired/` path without altering the old evidence.

## Checks run

- `npm.cmd run build:vite` — passed.
- Focused production-main bundle assertion — passed.
- Bounded development startup — passed: the process remained open for ten seconds
  with no startup exception or stderr.
- Focused Electron startup test — passed.
- Full Electron smoke suite — passed: 13 tests.
- Repaired package build in `app/out/repaired/` — passed.
- Installer and packaged executable discovery and non-empty size checks — passed.
- Repaired packaged-executable mock startup — passed: it remained open for eight
  seconds with no stderr, missing module, TypeError, or main-process exception, then
  its exact process tree was closed.
- Authenticode inspection — both artifacts honestly report `NotSigned`.
- SHA-256 calculation for the repaired installer — passed; value recorded above.
- `git check-ignore` — confirmed repaired `app/out/` artifacts are ignored.
- Dependency-file audit — no package or lockfile changed.
- Real Codex process/model call — not run.

## How to try it

Double-click the repaired installer:

`C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework\app\out\repaired\make\squirrel.windows\x64\Cairn-0.1.0 Setup.exe`

For the development build, open PowerShell in the project root and run:

`npm.cmd --prefix app start`

## Limitations and remaining judgment

The installer is a local unsigned development build. Windows may display an
unknown-publisher or SmartScreen warning. The original broken raw executable under
`app/out/Cairn-win32-x64/` must not be used. Two protected child processes from that
broken launch could not be stopped from this session; closing the old error window,
Task Manager, or a Windows restart will release that original generated folder.

Code signing, public distribution, automatic updates, installation, and publication
are out of scope and were not attempted.

Milestone movement: **NO**

Disposition: **DONE**
