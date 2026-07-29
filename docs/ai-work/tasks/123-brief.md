# Task 123 brief — Port the Soft festival palette into the tokens

## Requested visible outcome

The owner picked Direction 02, Soft festival, from the look board. Port that
direction into `app/src/renderer/tokens.css` — the one token file the shipped
app and the lab share — so the whole environment re-colors: dusk lavender
night ground, warm firefly stars, coral Cairn, lantern-amber worker and
highlights, cream-on-lavender town text, and the scanlines and perspective
grid retired to invisible through their tokens. The app should read as the
Soft festival panel did: warm dusk, characters carrying the color.

## Boundary of intent

- **Only `app/src/renderer/tokens.css` changes** (plus task records). The
  other lane currently holds uncommitted work in `app/src/renderer/app.css`
  (connect-card styles), so this task deliberately touches no shared CSS file;
  structural scene work (hills, removing the now-invisible grid element, the
  worker's sky-blue stroke which lives as a token *reference* in app.css) is
  deferred to the unification slice after that lane lands.
- Token names stay; values change. No behavior, layout, motion, IPC, core,
  CLI, contract, or dependency changes. Light-theme sides of `light-dark()`
  tokens stay as they are; the night garden is dark in both themes by design.
- The scanline and grid retire at the token level (transparent values), which
  is honest and reversible; their structural removal is unification-slice
  work.

## Checks that will show the outcome holds

- Typecheck green; desktop unit tests green; lab build green.
- Focused town-square E2E green (no color assertions, but presence, reduced
  motion, and disappearance must keep passing).
- Isolated Electron render (app token held and released): screenshots of the
  town ready and working states plus a full-app view, visually inspected for
  the festival read — dusk lavender ground, warm fireflies, coral Cairn,
  lantern worker, no scanlines, no grid.

## DONE and STOPPED

- DONE: the app and lab render the Soft festival palette through tokens only;
  all checks pass; the other lane's uncommitted files are byte-identical.
- STOPPED: checks fail, the palette is unreadable, or the task cannot stay
  out of the files the other lane holds.
