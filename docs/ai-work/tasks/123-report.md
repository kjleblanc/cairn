# Task 123 report — Port the Soft festival palette into the tokens

## Requested visible outcome

Port the owner's chosen look-board direction, Soft festival, into
`app/src/renderer/tokens.css` so the whole environment re-colors: dusk
lavender night ground, warm firefly stars, coral Cairn, lantern-amber worker
and highlights, cream-on-lavender town text, with scanlines and the
perspective grid retired to invisible through their tokens.

## What actually changed

- `app/src/renderer/tokens.css` — values only, no token renamed:
  - Garden: `--garden-deep`/`--garden-ink` become dusk indigo-lavender
    (`#1e1736`/`#332852`); `--garden-cyan` (Cairn's color) becomes coral
    `#ff8f7a` with dim/glow partners; `--garden-amber` becomes lantern
    `#ffd27a`; stars become warm firefly light; `--garden-scanline` is now a
    transparent gradient (scanlines retired everywhere the token is used,
    town and lab included); the comment block records the owner-chosen
    palette and Task number.
  - Town: ink warm cream, muted lavender, lantern-tinted lines and threads,
    lavender selection, lantern focus ring, lavender-tinted
    header/detail/entity surfaces; `--town-grid` transparent (the grid draws
    nothing; its element removal is deferred structural work).
  - Chrome: workspace and rail dark sides move from blue-black to the
    festival lavender family.
  - `--neon` family shifts to coral/lantern; `--neon-green` (DONE) unchanged
    — meadow green already suits the direction.
  - Light-theme sides of `light-dark()` tokens unchanged; the garden is night
    in both themes by design.
- `docs/ai-work/LOG.md`, `docs/ai-work/tasks/123-report.md` — this record.

Deliberately not touched: `app/src/renderer/app.css` and every other file the
parallel lane holds uncommitted (connect-card/bodies work, actively changing
during this task — their files were fingerprinted before and after and never
edited by this lane). Consequences deferred to the unification slice: the
invisible grid's element removal, rolling-hills structure, the hardcoded
8%-cyan `.town-skyglow` haze, and the worker's sky-blue stroke (app.css
references `--garden-amber` for worker strokes, so the worker wears lantern
amber — festival lanterns — until that reference can change without a
same-file collision).

## Checks run and their real results

- `npm.cmd run typecheck` — green.
- `npm.cmd run test:unit` — 106/106 pass (the other lane added a test
  mid-task; all green).
- `npm.cmd run build:lab` — green.
- Focused Electron E2E `a dispatched run lives in the conversation…` — 1/1
  pass (5.9s).
- Isolated Electron render (app token held, then released): computed tokens
  confirmed live in the page (`--garden-cyan: #ff8f7a`, `--garden-amber:
  #ffd27a`, transparent scanline/grid, lavender rail). Screenshots captured
  and visually inspected:
  - `design/attachments/task-123-soft-festival-town.png` (ready)
  - `design/attachments/task-123-soft-festival-town-working.png` (working,
    with a close crop of the worker/thread/Cairn chain)
  Both read as the Soft festival panel: dusk lavender ground, warm fireflies,
  coral Cairn, lantern worker, no scanlines, no grid.
- Temporary harness files removed; app token verified free.

## How to try it

Open the visual lab preview — the whole environment (rail, chat column, town,
and the lab pages themselves) is now the festival dusk. "Task running" shows
the lantern worker and warm thread.

## Limitations / remaining human judgment

- The worker is lantern amber, not the board's sky blue (token-reference
  boundary; see above).
- Chat cards, buttons, and chat bubbles keep their shared neutral/green app
  tokens; unifying those is slice 4.
- The `.town-skyglow` element still adds a faint cool haze (hardcoded in
  app.css); negligible at 8% alpha, queued for the unification slice.
- The aesthetic judgment is the owner's.

Disposition: DONE
