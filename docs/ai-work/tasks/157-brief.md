# Task 157 — Remove projects from the remembered-projects list

Requested outcome: In the desktop app's project picker ("Your projects"), every
remembered project — healthy or broken — has a visible "Remove from this list"
control; using it removes the project from Cairn's remembered list without
touching its folder or files on disk, and the same unchanged folder can be
re-opened afterward.

Lane: **Standard** (Lane A, main checkout). Continuation of the stopped
envelope runs 148/150 — their retained Picker/spec edits are the starting
point, now verified from scratch in this lane.

## Details

Task 148 (STOPPED, RECORD_VERIFICATION_FAILED) left the picker's healthy-card
removal control and a reopen-safety E2E scenario uncommitted; Task 150
(STOPPED, MODEL_REPORTED_STOPPED) re-verified typecheck and unit tests but
could not build or run the Electron scenario in its sandbox. This task picks
the work up in the owner's real environment: verify the retained edits end to
end, repair whatever the never-run suite reveals, and land them.

## Boundary of intent — what must not change

- Removal edits Cairn's own remembered list only; it never deletes, moves, or
  transforms project folders or their files on disk.
- No behavior change outside the picker removal flow; no dependency changes.
- Protected starting work stays byte-identical: every pre-existing modified or
  untracked path, including the Task 156 cast-port files (TownSquare.tsx,
  Chat.tsx, app.css, tokens.css, town/faces.tsx), `design/`, the two app logs,
  and the uncommitted LOG.md rows 148–154 (left uncommitted per the Task 149
  precedent — this task appends its own row but does not commit the file).

## Owned records

- `docs/ai-work/tasks/157-brief.md`
- `docs/ai-work/tasks/157-report.md`
- `docs/ai-work/LOG.md` (row appended, file left uncommitted per the Task 149
  precedent)

## Protected starting Git state

- HEAD: `9d19564` (main)
- Working tree: existing changes protected (listed in the boundary above)
- Existing staged work: no

## Checks (exact commands, run from `app/`)

- `npm run typecheck`
- `npm run test:unit`
- `npm run build:vite`
- `npx playwright test tests/projects.spec.ts` — the full picker file (5
  scenarios) with the app token held at `app/.app-token`; includes the new
  removal-and-reopen scenario. The suite runs against a throwaway profile
  (isolated-profile fixture) so the owner's real list is never touched, and
  its windows park off every display (Task 154, `CAIRN_E2E=1`).
- Machine-state precondition: no other Cairn instance may hold the
  single-tenant surface during the E2E run — verified by taking the app token
  (`mkdir app/.app-token` succeeds); released immediately after the run.
- Final: `git status` shows protected work intact; this task's paths are
  committed by exact name.

DONE means the requested outcome holds in this tree with all checks green and
the task's paths committed by exact name. STOPPED means a check fails beyond
in-scope repair, protected work changes unexpectedly, or the app token is
held by another lane or the owner.
