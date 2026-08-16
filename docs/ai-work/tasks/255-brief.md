# Task 255 brief - the resident-program visual constitution and state board

**Lane:** A (the main checkout). **Base commit:** `be921e9`.

**Slice:** 1 of 11 in
`docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`.

The plan's handoff was written when Task 230 landed and expected the next free
number to be near 231. Twenty-three unrelated tasks have landed since. 255 is
the lowest number free across the main checkout, every registered worktree, and
every local branch: 236 is held by `claude/vigorous-tharp-0cbd3c`, and 248 and
254 are held by `lane/h`. The plan anticipated this and claims no future number.

## Requested visible outcome

The owner can open one lab-only board in a browser and judge Cairn's new visual
direction without running a real task, opening the product, or reading code.

The board shows the approved resident program — three offset rounded panes,
warm amber front with a clipped top-right corner, translucent teal rear panes,
a cyan seam pane, tiny data squares, and face D — drawn in code at the exact
sizes it will really be used: a 28 px brand mark and a 64–88 px conversational
presence. It proposes one expression for each of Cairn's nine semantic states
next to the plain-language truth that state must always carry. It shows the
daylight palette, type scale, materials, controls, focus, disabled and long-copy
states, a written activity capsule, and one representative owner-note →
Cairn-reply → decision → approval → working → verified-result sequence. It shows
all of that in System, Light and Dark, at wide, supported-minimum, below-minimum
and phone compositions, with reduced motion reaching the same end states.

Three things on the board have never been seen and are the owner's decision at
Owner gate 1: the derived expressions, the Dark treatment, and the compact
treatment. The D body, the daylight palette and the shell direction are already
approved and are here only for a fidelity verdict.

## Boundary of intent

- **Lab-only and product-dark.** Product-dark means absent from production
  imports, routes and emitted bundles — not dark-coloured. No edit under
  `app/src/**`, `core/**`, `cli/**`, `app/src/main/bridge/phonepage.ts`, package
  manifests or locks, IPC, preload, stores, or production routes. The phone view
  is synthetic lab composition; the production `CairnProgram` belongs to Slice 3.
- **Exact paths.** This task writes only: its own brief, report and one LOG row;
  `docs/superpowers/specs/2026-08-13-cairn-resident-program-visual-design.md`;
  the two hash-checked reference copies under `docs/visual-reference/`;
  `app/lab/resident-program.{html,tsx,css}`;
  `app/tests-unit/residentprogramboard.test.ts`;
  `app/playwright.residentprogram.config.ts`;
  `app/tests-qualification/resident-program-board.browser.spec.ts`;
  `app/tests-qualification/resident-program-bundle-dark.test.mjs`; and three
  bounded edits to `app/lab/controls.ts`, `app/vite.lab.config.ts` and
  `app/tsconfig.unit.json`.
- **References are custody, not raw material.** Verify both approved SHA-256
  hashes before copying. If a destination already exists, verify its hash and
  stop on any mismatch; never overwrite a different file. The eight
  `CAIRN REF` mood images contribute principles only. No Laughing Man mark or
  circular text, Tachikoma body, anime character, Ed signature, Animal Crossing
  cursor or tabs, or any proprietary logo or layout. Cairn's geometry is
  original.
- **Drawn, not generated.** Every mark on the board is code-native SVG, CSS and
  real text. No image-generation call, no remote image, no new dependency, font,
  or browser install.
- **Truth is written, never carried by colour alone.** Every state on the board
  shows its literal words. Expression and colour reinforce; they never replace.
- **Nothing moves that the owner did not cause.** Finite, event-driven,
  transform/opacity motion only. No perpetual float, sheen, blink, ripple or
  glitch loop, no delayed typewriter text, and no transform on a container
  holding interactive controls. Reduced motion reaches the identical semantic
  end state.
- **Accessibility is not deferred.** Body text meets 4.5:1 and large text and
  non-text controls meet 3:1 in both themes. Interactive targets are at least
  44×44 px. Focus is visible at 3:1. The program art is decorative
  (`aria-hidden`, `focusable="false"`) and announces nothing.
- **No risk boundary is crossed.** No dependency install, provider or model
  call, credential use, paid call, external write, push, publication or
  deployment. No stored owner data is read, written or deleted; `.cairn` is
  untouched.
- **Concurrency.** `lane/h` holds an in-flight Task 254 and the three
  `claude/*` worktrees hold their own uncommitted records. Protect every
  existing tracked, staged, modified and untracked path; stage by exact name;
  never clean, stash, reset, broadly stage or rewrite history.
- **Task 229 stands.** Its lab entry, build input and the lab-only, literal,
  actionless, authority-free Builder proposal card are unchanged. Playwright
  stays at `workers: 1`; any app token this task creates is released in
  `finally`, and no token another lane or the owner holds is ever removed.

## Checks

1. **`c1` - the approved references are preserved byte-exact.** Both source
   images hash to the values recorded in the plan's section 2.6, and
   `docs/visual-reference/cairn-resident-program-ui-approved-2026-08-13.png`
   and `docs/visual-reference/cairn-face-d-approved-2026-08-13.png` hash to the
   same two values after copying. No pre-existing destination is overwritten.
2. **`c2` - the resident program is code-native and faithful at real size.**
   One SVG component draws the approved body — two translucent teal rear panes,
   the cyan seam pane, the amber front pane with a clipped top-right corner, and
   the data squares — plus face D's outlined square left eye, closed crescent
   right eye and lopsided stepped smile. It renders at 28, 34, 64 and 88 px from
   the same geometry with no raster asset, and the board shows those true sizes
   without magnification. The written design spec records the geometry, the
   measured approved palette, and the originality boundary.
3. **`c3` - every semantic state has a proposed expression beside its written
   truth.** Ready, thinking, needs-decision, working, checking, DONE, STOPPED,
   error and disconnected each appear with the exact literal status words the
   plan requires, the proposed face and pane treatment, and the state's motion
   rule. A test proves the board renders all nine and that each one's literal
   status text is present in the DOM.
4. **`c4` - the visual system is measurably legible.** A test computes WCAG
   contrast from the board's own token values and proves body ink on paper and
   on chrome clears 4.5:1, and that large text, the teal action, focus ring,
   hairlines and every state colour clear 3:1, in both Light and Dark. Type
   sizes, line height and measure fall inside the plan's section 2.4 bounds, and
   every interactive control on the board is at least 44×44 px.
5. **`c5` - the board holds together across theme and size.** The browser
   qualification renders the board at 1320×980, at the supported minimum
   760×620, at a below-minimum 540×900 containment stress, and at a 390×700
   phone composition, in explicit Light, explicit Dark, and System resolved
   through browser colour-scheme emulation — never by changing the owner's
   operating-system setting. At every combination `scrollWidth` does not exceed
   the viewport width. Screenshots are captured for the owner's verdict.
6. **`c6` - motion is finite and reduced motion is equal.** A source check
   proves no `infinite` animation and no transform on an interactive container.
   The browser test proves that under `prefers-reduced-motion: reduce` the board
   reaches the same rendered end state as with motion allowed.
7. **`c7` - the board is product-dark.** After a fresh `npm.cmd run build:vite`
   and `npm.cmd run build:lab`, a test proves the board's markers appear in the
   lab bundle and appear nowhere in the emitted main, preload or renderer
   bundles, and that no file under `app/src/**` references the board. Keyboard
   traversal of the board reaches no control that could apply, run, open, send,
   publish or approve anything, because none exists.
8. **`c8` - verification, evidence and records are exact.** Typecheck, the unit
   test, both builds, the bundle-dark test and the browser qualification run
   with their exact commands and real results recorded. Every lab and browser
   process is shut down afterwards and the strict port and any task-owned token
   are proved released. The final diff and Git status contain only this task's
   exact paths; one LOG row and one exact-path completion commit answer every id
   above, and the report names the owner's Gate 1 verdict.

## DONE and STOPPED

**DONE** means checks `c1`–`c8` pass, the owner has seen the rendered board and
explicitly confirmed at Owner gate 1 that it is faithful to the already-approved
D body, daylight palette and shell direction, and has decided the previously
unseen derived expressions, Dark treatment and compact treatment. Owner gate 1
is taste-dependent: this task does not close itself. Revisions the owner asks
for at the gate are ordinary in-task repair and are disclosed in the report.

**STOPPED** means a reference source or destination hash cannot be reconciled;
the approved direction cannot be drawn in code without a new owner art decision;
faithfulness would require weakening contrast, focus, touch targets or written
truth; the board cannot be kept out of production imports, routes and bundles;
another lane's work cannot be protected or the task's paths cannot be isolated;
a risk boundary would have to be crossed; or the owner rejects the direction
rather than asking for a revision.

Slice 2 does not begin in this conversation under any verdict.
