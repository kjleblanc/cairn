# Task 091 — Report

## What actually changed

- `app/src/main/conductor/service.ts` — live conductor turns now retain a
  bounded project-keyed snapshot of their visible text, conversation, kind,
  and start time until the turn settles.
- `app/src/main/tasks.ts` — run snapshots now retain the selected adapter id
  and expose a read-only main-process accessor for the coming workspace.
- `app/src/main/ipc.ts`, `app/src/preload.ts`, and
  `app/src/shared/ipc.ts` — added the typed `conductorCurrent` reattachment
  seam and extended run snapshots.
- `app/src/renderer/screens/Chat.tsx` — navigation unmount no longer aborts a
  reply; mounting Chat restores a live reply before falling back to the newest
  saved conversation.
- `app/tests/conductor.spec.ts` — added an end-to-end slow-reply test covering
  navigation away, snapshot continuity, return, partial text, Stop, completion,
  and snapshot cleanup.
- `app/src/main/main.ts`,
  `app/tests/fixtures/conductor-connection.ts`, and
  `app/tests/projects.spec.ts` — added a fail-closed E2E-only `userData`
  override so Electron tests can use an isolated temporary profile instead of
  touching the owner's encrypted connection or remembered-project registry.
- `docs/ai-work/tasks/091-brief.md`, this report, and one LOG row record the
  task.

## Checks run and real results

1. `npm.cmd --prefix app run typecheck` — PASS.
2. `npm.cmd --prefix app run test:unit` — PASS, 78/78.
3. `npm.cmd --prefix app run build:vite` — PASS.
4. Isolated Playwright reattachment test — PASS, 1/1.
5. Complete isolated `tests/conductor.spec.ts` — PASS, 22/22. The suite used a
   fresh `C:\tmp` profile and local fake provider; the owner's real connection
   and registry were unreachable.
6. `git diff --check`, real diff, and final status — PASS before exact-path
   commit.

The first isolated run failed before sending a message because changing
`APPDATA` did not redirect Electron's `userData`; the app therefore saw the
owner's existing connection status. No provider call occurred. The harness was
repaired with the explicit guarded `app.setPath("userData", ...)` seam above,
then the focused and full conductor suites passed against isolated profiles.

## How to try it

Start a slow conductor reply, choose Project home, then return with Talk with
Cairn. The partial reply and Stop control reappear, and the reply completes in
the same conversation.

## Limitations and remaining human judgment

This task supplies the lifetime and reattachment seam only. The current UI
still navigates through Project home; the persistent rail and workspace shell
arrive in the next task.

Commentary turns are retained in the same snapshot but continue using their
existing quiet presentation rather than showing a partial bubble.

Disposition: **DONE**
