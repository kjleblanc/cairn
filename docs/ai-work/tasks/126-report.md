# Task 126 report — Motion slice: Animal Crossing softness

## Requested visible outcome

Give the app gentle behavior: softer springs, entrances instead of blink-ins,
calmer idle life, one celebratory pop on state changes, pointer-responsive
buttons — with reduced-motion fully respected.

## What actually changed

- `app/src/renderer/motion.css` (new) — the whole slice in one file:
  - `chat-arrive` entrance (opacity + 10px rise + slight scale, .38s spring)
    on `.bubble`, `.result-card`, `.task-card`, `.push-chip`, `.run-strip`.
  - `town-node-arrive` soft pop (scale .55 → 1.06 → 1, .5s) on `.town-node`,
    keyframes including the static centering transform.
  - `town-face-pop` (.45s) on the Cairn face svg — the state-class swap
    restarts it, so Cairn pops once on every ready/thinking/working change.
  - Calmer idle: face float slowed 6s → 7.5s and shallowed (overrides
    app.css's keyframes by cascade), and the lantern `.town-skyglow` now
    breathes over 9s.
  - Node movement slowed to a 460ms spring settle.
  - Pointer response on named classes only (`.chat-composer button`,
    `.town-square-header button`, `.rail-action`, `.rail-collapse`): 1px
    hover lift, settle-on-press. No generic `button` rules — town nodes are
    transform-positioned buttons.
  - A `prefers-reduced-motion` block that re-kills every animation and
    transition this file declares (required because this file wins cascade
    ties with app.css's own reduced-motion block — noted in a header comment).
- `app/src/renderer/main.tsx` — imports `./motion.css` after `./app.css`.
- `app/src/renderer/tokens.css` — `--spring` softened to
  `cubic-bezier(.3, 1.3, .45, 1)`.
- `docs/ai-work/LOG.md`, `docs/ai-work/tasks/126-report.md` — this record.

The motion CSS lives in its own file because the parallel lane held
`app.css` uncommitted when this task began (its work has since landed
unmodified by this lane).

## Checks run and their real results

- `npm.cmd run typecheck` — green.
- `npm.cmd run test:unit` — 107/107 pass.
- `npm.cmd run build:lab` — green.
- Focused Electron E2E `a dispatched run lives in the conversation…` — 1/1
  pass (7.4s), including the reduced-motion assertions and the town position
  persistence measurement alongside the new arrive animation.
- Isolated Electron render (app token held, then released): computed styles
  confirm every behavior live — bubbles `chat-arrive`, nodes
  `town-node-arrive` + 0.46s settle, face `town-face-pop`, holo 7.5s,
  skyglow `town-sky-breathe`, send-button transitions. Under CDP-emulated
  `prefers-reduced-motion: reduce`, all of them compute to `none`/`0s`.
  Screenshot `design/attachments/task-126-motion.png` inspected: no visual
  regression.
- Two disclosed harness repairs: the first reduced-motion probe used
  Playwright's `emulateMedia`, which does not exist on an Electron window
  (switched to CDP `Emulation.setEmulatedMedia`); and hidden windows do not
  tick the animation timeline, so fill-mode entrance animations held elements
  at opacity 0 in captures (the harness now finishes document animations
  before screenshotting — real visible windows and the Playwright E2E tick
  normally, which the E2E's visibility assertions confirm).
- Temporary harness files removed; app token verified free.

## How to try it

Open the visual lab preview and watch: bubbles ease in, Cairn's face pops
when you flip scenarios ("Cairn thinking", "Task running"), the worker pops
into the square, the skyglow breathes, and Send lifts under the pointer.
With system reduced-motion on, all of it is still.

## Limitations / remaining human judgment

- Motion feel is subjective; the spring curve and durations are a first
  tuning the owner should judge live, not from stills.
- Entrance animations replay if React remounts an element (e.g., project
  switch re-renders the conversation) — noticeable but gentle.
- Firefly twinkle in the sky was left out (the star field is a static
  gradient layer); a future scene-life task can add it.

Disposition: DONE
