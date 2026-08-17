# Task 258 brief — semantic foundations and the CairnProgram primitive

**Lane:** A (the main checkout). **Base commit:** `91b087e`. **Slice:** 3 of 11
in `docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`.

Slice 2 closed DONE at Task 257. There is **no owner gate in this slice**; the
next is Owner gate 2 at the end of Slice 4.

## The requested visible outcome

The approved visual system exists as **production** code: semantic tokens, type,
focus, controls, paper materials, motion primitives, and a real `CairnProgram`
component. The lab board stops drawing its own private copy of Cairn and
demonstrates the shipped one instead.

The running app still looks as it does today. Slice 3 builds the foundation;
Slice 4 swaps the composition onto it.

## The boundary of intent — what must not change

- **Every existing token keeps its exact computed value.** `--garden-*`,
  `--lantern-*`, `--town-*`, `--pond-*`, `--face-*`, `--rail-*`, `--field-*`,
  `--environment-*`, `--surface-*`, and the base set are consumed by unmigrated
  surfaces. A foundation task must not silently recolor the rest of the app
  before its surface slice.
- `color-scheme` on `:root` and on `[data-theme]`, and therefore every existing
  `light-dark()` resolution.
- Theme persistence (`cairn-theme` in `localStorage`), existing surfaces, safe
  Markdown, control callbacks, keyboard access, and every runtime behaviour.
- No new dependency. No runtime import from `@cairn/core` into the renderer.
- Task 255's board keeps its owner-approved appearance, its
  `[data-rp-scheme]` islands, and its product-dark guarantee.
- Nothing under `core/**`, `cli/**`, `src/main/**`, IPC, preload, stores, the
  phone page, or package manifests.

Protected paths: every tracked, staged, modified and untracked path, including
untracked evidence under `app/test-results/` (`task229-builder-proposal-review.png`,
`task255-board/`). That directory is gitignored, so Git cannot restore it, and
the root `playwright.config.ts` declares no `outputDir`.

Boundaries: no dependency install, provider or model call, credential use, paid
call, external-service write, push, publication or deployment. No worktree is
created, deleted, reused, reset or moved.

## Three decisions taken before the work (AI decisions)

1. **The production tokens keep the `--rp-*` names.** The design spec's own
   palette table names them, and `residentprogramboard.test.ts` recomputes
   contrast from those names. Renaming would make the constitution's table stop
   describing the product.

2. **Theme variation is carried by `light-dark()`, not by duplicated blocks.**
   The spec (§5, "The System trap") records that the lab's palette lives in
   three places and that forgetting one token in the `prefers-color-scheme`
   block would have shipped a 2.28:1 button label to every System-on-a-dark-OS
   user. `tokens.css` already uses `light-dark()` 37 times and resolves it from
   the `color-scheme` the theme blocks already set, so in production each token
   is declared **once** and the trap cannot exist. The lab keeps its three
   blocks — it needs them for the side-by-side islands — and a check pins the
   two copies together so they cannot drift.

3. **Every new selector is `.cairn-`-prefixed.** No existing rule, class or
   markup in this repository uses that prefix (verified: zero matches in
   `app.css`, `motion.css` and all of `src/`). A stylesheet that can only match
   selectors nothing yet uses cannot change an unmigrated surface, and that is
   checkable rather than hoped for.

## What changes

Create:

- `app/src/renderer/components/CairnProgram.tsx` — the production primitive.
- `app/src/renderer/cairn-program.css`, `app/src/renderer/surfaces.css`,
  `app/src/renderer/workspace.css`.
- `app/tests-unit/cairnprogram.test.ts`, `app/tests-unit/visualtokens.test.ts`.
- `app/tests-unit/tokens-baseline.golden.txt` — every existing token's exact
  value, extracted from `tokens.css` at `91b087e` **before** any edit. Not named
  in the plan; declared here as an addition, and it is the only way `c1` can be
  a measurement rather than a promise.

Modify:

- `app/src/renderer/tokens.css` — **append only**; the new semantic layer.
- `app/src/renderer/motion.css` — the new components' finite motion and its
  reduced-motion kills.
- `app/src/renderer/main.tsx` — import the new stylesheets.
- `app/tsconfig.unit.json` — compile the new component and tests.
- `app/lab/resident-program.tsx` — import the production `CairnProgram` and
  delete its local copy.
- `app/lab/resident-program.css` — import `cairn-program.css` so the board
  styles the shipped component.

`app/src/renderer/components/Ui.tsx` is in the plan's modify list. It will be
modified only if a component genuinely earns it; a wrapper with no consumer is
speculative code that rots. If it goes untouched, the report says so, as Task
255 did for `tsconfig.unit.json`.

## Checks

Run from `app/`. Each check names its exact command.

**`c1` — every existing token keeps its exact value.** `visualtokens.test.ts`
compares every `--name: value` pair in `tokens.css` against
`tokens-baseline.golden.txt`, generated from `git show 91b087e:` before any
edit. Any changed or removed pre-existing token fails. New tokens are permitted
and listed.

**`c2` — the new layer is complete and matches the approved constitution.**
Every role in the design spec's §5 palette table exists in production; the
production value for each `--rp-*` token equals the lab's approved value in
**both** themes, token for token, so the two copies cannot drift.

**`c3` — contrast is measured, not asserted.** Every ratio is recomputed from
the production stylesheet's own values, in both themes: semantic ground/ink
pairs at 4.5:1, control edges and the focus ring at 3:1 for WCAG 1.4.11.
Translucent values are composited over the ground they are actually drawn on.
Pinned numbers are not acceptable — Slice 1 proved they hide failures.

**`c4` — one definition per token; the System trap cannot exist.** No `--rp-*`
token is declared more than once in `tokens.css`, and every one that differs by
theme carries both values in a single `light-dark()`.

**`c5` — CairnProgram is the approved geometry at real size.** Constants match
the spec's §3 table exactly (pane 76 × 63.5, chamfer 12.8, eye and mouth
anchors, the three-block stepped mouth). All nine states render; **no two
states draw the same face**, compared by drawn marks rather than source text;
`size` means the amber pane's height, verified by computing the pane height back
out of the rendered height and the `viewBox`; the `mark` variant drops the rear
fan and the data squares.

**`c6` — the art announces nothing.** The SVG carries `aria-hidden="true"` and
`focusable="false"` and contains no `<title>`, `<desc>`, `role`, `aria-label`
or `aria-labelledby`. Textual labels remain the sole announced truth.

**`c7` — motion is finite and reduced motion reaches the identical end state.**
A source scan of `motion.css` and `cairn-program.css`: no `infinite`, every new
keyframe ends at `transform: none`, and every new animation is re-killed in the
reduced-motion block — the trap that file's own header warns about, and the one
Slice 1 hit where eight compound selectors outranked a bare element kill.

**`c8` — nothing unmigrated can be recolored.** Every selector in
`cairn-program.css`, `surfaces.css` and `workspace.css` is `.cairn-`-prefixed;
none is an element, universal, attribute-only or `:root` selector; and the new
`tokens.css` block adds custom properties only. Proved by parsing the files.

**`c9` — the board demonstrates the production primitive.** After the change,
`lab/resident-program.tsx` imports `CairnProgram` from `src/renderer/components/`
and defines no local copy, and the Slice 1 suites still pass unchanged:

```powershell
.\node_modules\.bin\tsc.cmd -p tsconfig.unit.json --pretty false
node --test dist-unit/tests-unit/residentprogramboard.test.js
.\node_modules\.bin\playwright.cmd test --config playwright.residentprogram.config.ts
node --test tests-qualification/resident-program-bundle-dark.test.mjs
```

That board config takes **no app token** — it declares no `globalSetup`, drives
only a local lab server and never launches Electron (Task 255 recorded this) —
so this slice does not disturb the owner's app or conductor connection.

**`c10` — the app compiles, builds and tests as it did.**

```powershell
npm.cmd run typecheck
npm.cmd run test:unit
npm.cmd run build:vite
npm.cmd run build:lab
```

The unit **failure set** is diffed against the Task 257 baseline of
970 / 959 / 9 / 2, never the count. The nine known failures sit in
`builderlivetransport.test.js` and `buildertrackedtext.test.js`.

**`c11` — records and Git protection are exact.** This brief is committed alone
to claim 258. The completion commit stages only this task's exact paths. No
clean, stash, reset, broad stage, or history rewrite; the final `git status` is
inspected and every sibling worktree confirmed unchanged.

## DONE and STOPPED

**DONE** means: the semantic layer, the three stylesheets and `CairnProgram`
exist in production; the board draws the shipped component; `c1`–`c11`
completed with their real results recorded; and the running app is unchanged
because nothing yet consumes the new selectors.

**STOPPED** means any of: the new foundation cannot be added without changing
an existing token's computed value or recoloring an unmigrated surface; theme
persistence or an existing surface changes; the board's owner-approved
appearance changes; or a check fails in a way that repair inside this task
would change the requested outcome.
