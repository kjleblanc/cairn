# Task 146 brief — The villager bubble, for real: chat moves into the town

**Lane:** C (main checkout) · **Base:** main @ 2019847 (Task 145)

## Requested visible outcome

The owner picked **A · villager bubble** from the Task 136 chat-treatment
mock. Build it for real: in the workspace, the town square becomes the whole
stage, and the conversation with Cairn lives *inside* it — a cream, tailed
dialog anchored beside Cairn's node (Cairn always stands at the town center),
using the mock's approved geometry. The split chat pane, the drag divider,
and the narrow-screen Chat/Town tabs go away: one world, one conversation.
Tucked, the dialog becomes a one-line chip floating by Cairn showing his last
line; clicking the chip **or Cairn's node** brings the dialog back and
focuses the composer. Dashboard ("project home") and the run screen keep
their existing swap semantics but use the full stage width.

## Boundary of intent — what must not change

- **No IPC, shared-type, or saved-file changes.** `TownPresentationState`
  keeps its `dividerWidth` field (old files load; it is simply no longer
  rendered). No main-process changes.
- **The standalone (non-embedded) chat screen is untouched** — only the
  workspace-embedded presentation changes.
- **Chat behavior is identical**: same conversation state, streaming,
  run strip, result cards, dispatch panel, push flow, task cards, connect
  card, BodyPill, "← Project home" navigation. Only the frame changes.
- **The lab (chatmock/worldboard) is untouched.**
- Navigation semantics preserved: a governed project still boots into chat;
  "← Project home" still opens the dashboard; E2E role/text selectors keep
  working.

## Implementation sketch (from recon)

- `Workspace.tsx`: drop the chat pane, divider, tabs, chat-width machinery;
  the town pane fills the stage and hosts `<Chat embedded>` as an overlay
  when the center view is chat; `focusChat` bumps a numeric `focusSignal`.
- `Chat.tsx`: embedded mode renders the villager frame — tailed dialog
  (mock geometry: `left: calc(50% + 96px); top: 12%; width: min(400px,38%);
  max-height: 62%`) or, when tucked, the chip (`left: calc(50% + 84px);
  top: 30%`) with Cairn's last line; tuck/expand state internal; the chip
  and dialog are `pointer-events: auto` inside a `pointer-events: none`
  overlay root so the town stays clickable; `focusSignal` untucks + focuses.
- `app.css`: villager dialog/chip/tail/rise/bob styles in the Lantern
  palette (cream `--card-solid` + `--card-ink`); remove the dead
  divider/tabs/embedded-pane rules; narrow windows center the dialog and
  drop the tail; reduced-motion honored.
- Known a11y note to disclose: tucking unmounts the run-strip live region;
  a terminal announcement made while tucked is heard only as the chip's
  text. Acceptable (the owner tucked deliberately) and disclosed.

## Checks that will show the outcome holds

- `npm.cmd run typecheck`, `npm.cmd run test:unit`, `npm.cmd run build:vite`,
  `npm.cmd run build:lab` (in `app/`) — all green.
- Full E2E suite with the app token held (boot-into-chat, Project home,
  connect, run flows exercise the changed shell).
- Settled captures on the shots page: dialog open in the workspace, tucked
  chip, dashboard full-stage; inspected by eye.

## DONE / STOPPED

- **DONE** = the workspace is rail + town with the tailed villager dialog
  (or chip) anchored at Cairn; tuck/expand/focus all work; all checks
  above green; captures published.
- **STOPPED** = E2E or a11y regressions repair can't safely fix, the anchor
  geometry can't be made to work at real window sizes, or protected/lane
  work would be touched.
