# Task 045 brief — Build a double-clickable Windows installer

Date: 2026-07-22

## Requested visible outcome

Create a local Windows installer for the current verified Cairn Desktop build so the
owner can install and launch Cairn without typing the development command. Also give
the exact development launch command as a fallback.

## Files or areas that may change

- ignored build output under `app/out/`
- `app/vite.main.config.ts` and one focused packaged-main smoke assertion if the
  first artifact does not start
- current launch/build documentation if clarification is useful
- this Task 045 report and one append-only `docs/ai-work/LOG.md` row

No dependency or lockfile may change. Nothing may be uploaded, published, installed,
signed, or sent to an external service.

## Protected starting work

- Project root: `C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework`
- Starting branch: `main`, ten commits ahead of `origin/main`
- Starting HEAD: `0fa4523` (`Task 044: isolate nested Codex tool shims`)
- Starting working tree and index: clean
- Tasks 000–044 and all existing log rows are append-only history

## First useful checkpoint

Electron Forge completes its existing Windows Squirrel maker and produces a
non-empty `Setup.exe` beneath `app/out/make/squirrel.windows/`.

## Checks

- Build from the already-installed project dependencies with `npm.cmd run make`.
- Confirm the installer and packaged `cairn-desktop.exe` exist and are non-empty.
- Confirm the production main bundle has no unresolved runtime import for a required
  packaged startup dependency.
- Record the installer size, version metadata, and signing state without executing
  or installing it.
- Confirm package and lockfiles remain unchanged.
- Keep generated `app/out/` artifacts ignored by Git.
- Run no Codex process or model call.

## Important assumptions

- The existing Electron Forge configuration already declares the Windows Squirrel
  maker. If its first artifact exposes a packaging defect, repair only the bundling
  boundary without installing or changing the dependency.
- A locally built installer is likely unsigned. Windows may show a publisher or
  SmartScreen warning; code signing and public distribution are out of scope.
- Building the installer is local and reversible. Installing it is a separate system
  change that the owner may choose later.

## DONE and STOPPED

DONE means the current source produces a non-empty Windows installer and packaged
executable, the exact paths and limitations are recorded, no dependency changes or
external writes occur, and Task 045 records are committed by exact path.

STOPPED means packaging would require installing or updating software, downloading
missing components, changing signing credentials, publishing, or altering the
verified application behavior.
