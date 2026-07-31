# Task 146 report — the villager bubble, for real

Requested visible outcome: build the owner's Task 136 pick (treatment A, the
"villager bubble") into the real app. The chat stops being a separate pane
beside the town; the town fills the stage and the conversation becomes a
cream, tailed dialog anchored to Cairn's node, which can tuck away into a
small floating chip.

## What actually changed

- `app/src/renderer/screens/Workspace.tsx` — rewritten. The town pane now
  fills the stage and hosts `<Chat embedded focusSignal={chatFocusSignal}>`.
  Removed: the chat pane, the drag divider (`beginResize`, `saveChatWidth`,
  `maxChatWidth`), the narrow-width tabs, and the `--chat-width` custom
  property. `dividerWidth` stays in `defaultTownPresentation` so previously
  saved presentation files still parse. Dashboard and task views render
  full-stage inside `.workspace-scroll`. Clicking Cairn's node ("Cairn,
  ready") bumps `chatFocusSignal`, which untucks and focuses the
  conversation.
- `app/src/renderer/screens/Chat.tsx` — new optional `focusSignal?: number`
  prop; new `tucked` state and `composerRef`. An effect untucks and focuses
  the composer when the signal changes. Embedded mode builds the shared
  conversation column once, then returns either the standalone layout
  (unchanged) or the villager layout: a `.chat-villager-root` overlay holding
  the dialog (`role="dialog" aria-label="Conversation with Cairn"`) or, when
  tucked, the chip (`aria-label="Open the conversation with Cairn"`, showing
  Cairn's last reply text or "Talk with Cairn"). A tuck button
  (`aria-label="Tuck the conversation away"`) lives in the chat topbar.
- `app/src/renderer/app.css` — villager styles: `.chat-villager-root`
  (pointer-events none; children auto), `.chat-column.chat-column-villager`
  at `left: calc(50% + 96px); top: 12%; width: min(400px, 38%); max-height:
  62%` with a cream tail (`::before`) and `villager-rise` entrance,
  `.chat-villager-chip` at `calc(50% + 84px) / 30%` with `villager-bob`,
  `.chat-tuck`. Dead rules removed (workspace-content grid, divider, narrow
  tabs, `chat-screen-embedded`, `chat-column-embedded`, the 980px media
  block). The 620px media query centers dialog and chip with `animation:
  none`; reduced-motion covers the villager animations.
- `app/tests/projects.spec.ts` — one test updated for the deliberate design
  change (see Repairs).
- `app/shots/` (gitignored content) + `design/attachments/` — three captures
  and a new shots-page manifest entry: `task-146-bubble.png`,
  `task-146-tucked.png`, `task-146-home.png`.

## Checks run and their real results

- `npm.cmd run typecheck` — clean.
- `npm.cmd run test:unit` — 141/141 pass.
- `npm.cmd run build:vite` — clean.
- `npm.cmd run build:lab` — clean.
- Full Playwright E2E, run file-by-file with the app token held (the suite
  exceeds the 300 s foreground cap, so it was chunked): smoke 1/1, away 1/1,
  projects 4/4, connect-kimi 1/1, routing + serial 14/14, bridge 1/1,
  conductor 26/26 (four `:line` chunks). **48/48 pass.**
- Captures made with a throwaway Electron harness (`app/tmp-capture/`,
  deleted after use; visible windows, per the Task 144 lesson). All three
  shots inspected: the bubble with the connect card inside it and the tail
  pointing at Cairn's node; the tucked chip; the full-stage dashboard.

## Repairs disclosed

1. `app/tests/projects.spec.ts` (test at :116) asserted the old divider/tab
   layout. The design change is intentional, so the test was updated to
   assert the new behavior: dialog visible, no tabs at 900 px, tuck → chip →
   untuck via the chip, and untuck via clicking the "Cairn, ready" node.
2. The chip click in that test needed `{ force: true }`: the intentional
   `villager-bob` animation never reads "stable" to Playwright's actionability
   checks. Commented in the spec.
3. Two earlier line-122 boot failures ("← Project home" not found, Welcome
   snapshot) were investigated and proven environmental, not a regression: a
   standalone exact-replication repro passed 2/2, the project registry was
   verified full [B, A] at launch in 3/3 cycles, and 122 passed in every
   full-file run afterward. Filtered `:116` runs fail by design (the
   `beforeAll` seeds `{recent: []}` and test 1 doesn't run) — never diagnose
   on filtered runs.
4. EPERM on fixture teardown of Windows temp profiles is a pre-existing
   harness nuisance, unrelated to this task.
5. The app token was taken at `app/.app-token` this run rather than the
   `$TEMP/cairn-app-token` convention from lane A's 143 report. Same
   mkdir-lock semantics; released after the run. Noted so the convention can
   be re-aligned.

## How to try it

Open the app (or the lab preview) and pick a project. The town is the whole
stage; the conversation floats beside Cairn as a cream bubble with a tail.
Talk, then press the tuck button (↘) in the chat topbar — the bubble folds
into a chip floating by Cairn. Click the chip, or click Cairn's node, and
the conversation rises back. Project home and run screens now use the full
stage. The shots page top entry (`/shots.html`) shows the three captures.

## Limitations and remaining human judgment

- Tucking unmounts the run-strip live region, so terminal announcements
  while tucked survive only as chip text. Accepted per the brief.
- Dialog and chip geometry is the mock's, tuned by eye in the captures; the
  owner may want it nudged after living with it.
- The two earlier boot-flake failures are documented as environmental with
  evidence, but they remain worth watching in future runs.

Disposition: DONE
