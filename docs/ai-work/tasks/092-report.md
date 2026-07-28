# Task 092 report — make the workspace the desktop home

The governed-project home is now one responsive workspace. Its left rail keeps
the active project first, exposes truthful activity and task summaries, and can
collapse without hiding running or unfinished state. Chat remains the primary
surface, the existing dashboard and run views stay inside the shell, and the
right pane is an intentionally limited Cairn-only town surface ready for the
semantic entities in Task 093.

Files changed:

- `app/src/shared/ipc.ts` — added project activity and task-summary shapes.
- `app/src/main/ipc.ts` — derives project activity and bounded task groups from
  real conductor, run-session, unfinished-task, and log state.
- `app/src/main/registry.ts` — retains every remembered project instead of
  truncating the rail to eight entries.
- `app/src/main/main.ts` — gives the desktop workspace a larger default window
  while keeping a usable narrow minimum.
- `app/src/renderer/App.tsx` — makes the persistent workspace the governed
  project route.
- `app/src/renderer/screens/Workspace.tsx` — owns project switching, center
  navigation, the remembered divider, responsive tabs, and synchronized town
  context.
- `app/src/renderer/screens/Chat.tsx` — supports the workspace's embedded chat
  presentation without changing message behavior.
- `app/src/renderer/components/ProjectRail.tsx` — adds the collapsible project
  and task rail with Cairn's connection state and safe navigation controls.
- `app/src/renderer/components/TownSquarePlaceholder.tsx` — adds the honest
  Cairn-only town boundary used until the next task introduces real entities.
- `app/src/renderer/app.css` and `app/src/renderer/tokens.css` — add the
  softened cyberpunk workspace, rail, divider, town, and narrow-mode styling.
- `app/tests/projects.spec.ts` — verifies project order, rail collapse,
  responsive Chat/Town tabs, synchronized project switching, and picker return.
- `docs/ai-work/tasks/092-brief.md` — records the requested outcome and bounds.
- `docs/ai-work/tasks/092-report.md` — records this result.
- `docs/ai-work/LOG.md` — appends the task outcome.

Checks run:

- `npm run typecheck` — passed.
- `npm run test:unit` — passed, 78 tests.
- `npm run build:vite` — passed.
- isolated Electron `projects.spec.ts`, `away.spec.ts`, and `smoke.spec.ts` —
  passed, 5 tests.
- isolated Electron conductor live-reply navigation check — passed, 1 test.
- `git diff --check` — passed.

How to try it:

1. Start Cairn and open a governed project.
2. Use the project rail to switch projects and expand their task histories.
3. Collapse the rail, drag the Chat/Town divider, and resize the window below
   980 pixels to use the Chat and Town tabs.
4. Use “Project home” and a run's activity link to confirm the existing
   dashboard and task surfaces remain inside the same workspace.

Limitations:

- This slice deliberately shows Cairn alone in the town. Workers, task threads,
  selection details, and real town interactions belong to Task 093.
- The divider is presentation state stored by the renderer; no project record,
  runtime authorization, or task behavior changed.

Disposition: DONE
