# Task 010

## What changed

- `app/src/renderer/screens/TaskRun.tsx` now reads the running app version from
  `cairn.updateCheck().current` when the task-entry screen mounts.
- The eyebrow now shows `Cairn v<current version>` beside `one serial task`, so
  an older running build is visible before a task starts.
- `docs/ai-work/tasks/010-report.md` records this result.
- `docs/ai-work/LOG.md` has the single append-only row for task 010.

## Checks

- `npm --prefix app run typecheck` could not start because this computer blocks
  the PowerShell `npm.ps1` wrapper.
- `npm.cmd --prefix app run typecheck` ran the same npm script successfully:
  `tsc --noEmit` exited with code 0.
- The final diff was inspected to confirm the only product-code change is
  `TaskRun.tsx`.

## How to try it

Start Cairn locally and open a project's task-entry screen. Beside the
`one serial task` eyebrow, confirm that the screen shows `Cairn v` followed by
the running app version, such as `Cairn v0.0.4`.

## Limitations and human judgment

The version appears after the asynchronous update information returns. The
screen was not launched for a visual check; the required TypeScript check
passed.

Milestone movement: YES

Disposition: DONE
