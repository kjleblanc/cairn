# Task 258 report — semantic foundations and the CairnProgram primitive

**Lane:** A (the main checkout). **Base commit:** `91b087e`. **Claim commit:**
`b2d7a66` (brief only). **Slice:** 3 of 11 in
`docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`.

No owner gate in this slice; the next is Owner gate 2 at the end of Slice 4.
Nothing in this task disturbed the owner's app: the only browser work uses Task
255's board config, which declares no `globalSetup`, drives a local lab server
and never launches Electron, so **no app token was taken**.

## What actually changed

Created:

- `app/src/renderer/components/CairnProgram.tsx` (388 lines) — the shipped
  primitive.
- `app/src/renderer/surfaces.css`, `app/src/renderer/workspace.css`,
  `app/src/renderer/cairn-program.css` — paper, ink, type, controls, focus,
  semantic grounds, and the desk composition.
- `app/tests-unit/visualtokens.test.ts` (17 tests),
  `app/tests-unit/cairnprogram.test.ts` (12 tests).
- `app/tests-unit/tokens-baseline.golden.txt` — every pre-Slice-3 token and its
  exact value, extracted before any edit. **Not named in the plan**; declared in
  the brief as an addition, and it is the only thing that makes `c1` a
  measurement rather than a promise.
- this report, and one LOG row.

Modified:

- `app/src/renderer/tokens.css` — **append only.** 61 new tokens; not one of the
  110 that existed before was changed or removed.
- `app/src/renderer/motion.css` — two keyframes and their reduced-motion kills.
- `app/src/renderer/main.tsx` — three stylesheet imports.
- `app/tsconfig.unit.json` — one line.
- `app/lab/resident-program.tsx` / `.css` — the board now draws the shipped
  component instead of a private copy, and defines the face-ink token.
- `app/tests-unit/residentprogramboard.test.ts` and
  `app/tests-qualification/resident-program-bundle-dark.test.mjs` — **neither is
  named in the plan's path list.** Both had to follow the code that moved; see
  "Two Slice 1 tests had to be rewritten" below.

`app/src/renderer/components/Ui.tsx` is in the plan's modify list and was **not
touched**. The foundation it would have carried is CSS — paper, controls, type,
focus — and a component wrapper with no consumer is speculative code that rots.
`CairnProgram` is the one new thing that genuinely needed to be a component.
Recorded the way Task 255 recorded `tsconfig.unit.json`: permitted, unnecessary.

Nothing under `core/**`, `cli/**`, `src/main/**`, IPC, preload, stores, the
phone page, `app.css`, or package manifests was touched.

## Three decisions, taken before the work and stated in the brief

**Names stay `--rp-*`.** The design spec's own palette table names those tokens
and Slice 1's suite recomputes contrast from them. Renaming would make the
constitution stop describing the product.

**Theme variation rides in `light-dark()`, not duplicated blocks.** The spec
records that the lab's palette lives in three places and that forgetting one
token there would have shipped a 2.28:1 button label to every
System-on-a-dark-OS user. `tokens.css` already resolves `light-dark()` from the
`color-scheme` its theme blocks set, so in production each colour is declared
**once** and that trap cannot be built. Five tokens are not colours — two
shadows, an opacity and a blend mode — and CSS `light-dark()` takes colours, so
those five keep explicit blocks and are guarded by a token-for-token comparison.

**Every new selector is `.rp-`-prefixed.** No rule, class or component in this
repository used that prefix. A stylesheet that can only match selectors nothing
yet uses cannot change an unmigrated surface — and that is checkable rather than
hoped for.

## Checks

Run from `app/`.

**`c1` — no token that existed before Slice 3 changed. PASS.** The baseline was
extracted from `tokens.css` at `91b087e` before any edit: 110 tokens,
`tokens-baseline.golden.txt`, SHA-256
`91796cccdff937da050ee5ab21b0a4e57bc63a96e3574c983953c5fee3493421`. After the
work: 171 tokens, **61 added, 0 changed, 0 removed**. The `color-scheme` wiring
is asserted untouched, because moving it would shift 37 already-shipped
`light-dark()` resolutions without editing a single colour.

That check found its own weakness first. Written against an empty golden it
passed vacuously; the companion test that asserts the baseline is non-trivial
failed on its first run and is why the golden is known to be real.

**`c2` — production is the constitution's, and agrees with the board. PASS.**
Every `--rp-*` the lab defines exists in production with the identical value in
**both** themes, compared token for token, so the two copies cannot drift. Every
role named in the design spec's §5 table is present, plus the geometry, type,
motion, grain, shadow and focus roles the plan calls for.

**`c3` — contrast recomputed, never pinned. PASS in both themes.** Thirty-three
pairings that `surfaces.css` actually draws, each recomputed from the shipped
token values: text at 4.5:1, controls, focus rings and state marks at 3:1, with
translucent values composited over the ground they sit on.

**It found a real defect in CSS written in this task.** `.rp-note-attention`
drew its left rule in `--rp-amber` on raised paper: **1.48:1**, the same number
and the same mistake Slice 1 found in its own amber specimen. `--rp-amber-edge`
was measured too and also fails (2.34:1 Light, 2.89:1 Dark). The rule now uses
`--rp-amber-ink` — 5.74:1 and 6.81:1 — which is the same warm token the note's
own words use.

**`c4` — one declaration per token; the System trap cannot be built. PASS.**
Only the five non-colour tokens are declared more than once, exactly three times
each, and the explicit-dark and System blocks are compared token for token.

That comparison was silently vacuous on its first run: `:root[data-theme="dark"]`
appears twice in `tokens.css` — once as the original one-line `color-scheme`
switch — and taking the first match returned an empty map. The
"yielded nothing" guard caught it. **Mutation-proved afterwards:** deleting one
token from the System block fails 2 of 17 tests; `tokens.css` restored
byte-exact.

**`c5` — the shipped Cairn is the approved geometry. PASS.** Twelve tests that
*render* the component rather than reading it as text. The measured constants are
compared against the design spec's own §3 tables, read out of the document, so
the drawing cannot drift from what approved it. The mouth is proved a staircase —
bar below the posts, strictly between them, right post wider. `size` is verified
to mean the amber pane's height by computing the pane back out of the rendered
box and `viewBox` at 28, 34, 64 and 88 px in both variants. All nine states
draw, **no two draw the same face**, and STOPPED and ERROR differ by hollow
square versus circle and by inverted mouth — not by colour, which they share.

**The promotion changed no coordinate.** The drawing was diffed against
`git show b2d7a66:app/lab/resident-program.tsx`, comments stripped: the only
differences are the `useId` import, two exported records that draw nothing, the
type rename, the `export` keyword, and `#12303f` becoming `var(--rp-face-ink)` —
a token whose value is `#12303f`, pinned in both files by its own test. Every
drawn coordinate is byte-identical.

**`c6` — the art announces nothing, and its motion is finite. PASS.** For all
nine states in both variants: `aria-hidden="true"`, `focusable="false"`, and no
`<title>`, `<desc>`, `role`, `aria-label`, `aria-labelledby`, `aria-live` or
`tabindex`. The arrival is opt-in; both keyframes end at `transform: none`,
neither loops, and both are re-killed in `prefers-reduced-motion` — the trap
`motion.css`'s own header warns about. Both classes are plain `(0,1,0)`
selectors, so the eight-compound-selector specificity trap Slice 1 hit cannot
arise here.

**`c7` — the app compiles, builds and tests as it did. PASS.**

```powershell
npm.cmd run typecheck    # clean
npm.cmd run test:unit    # 997 tests, 986 pass, 9 fail, 2 skipped
npm.cmd run build:vite   # built
npm.cmd run build:lab    # built
```

Against the Task 257 baseline of 970 / 959 / 9 / 2, the **failure set is
byte-identical** — the same nine pre-existing failures in
`builderlivetransport.test.js` and `buildertrackedtext.test.js`. Net +27 tests.

**`c8` — nothing unmigrated can be recoloured. PASS.** Every selector in the
three new stylesheets is `.rp-`-prefixed, proved by brace-tracked parsing; none
is an element, universal or `:root` selector; none declares a custom property.
A companion test asserts the prefix is genuinely unused elsewhere, because
without that the guard would prove nothing. **The running app is therefore
unchanged: nothing in it carries an `rp-` class.**

**`c9` — the board demonstrates the production primitive. PASS.**

```powershell
node --test dist-unit/tests-unit/residentprogramboard.test.js   # 22/22
node ./node_modules/@playwright/test/cli.js test --config playwright.residentprogram.config.ts   # 4/4
node --test tests-qualification/resident-program-bundle-dark.test.mjs   # 3/3
```

All 22 of Slice 1's board assertions pass against the moved component, including
the nine-state coverage, the no-two-faces-alike comparison, the geometry table
and the card-versus-drawing check. The browser qualification passes at every
size and theme, still computing the size row's pane heights back to exactly
28, 34, 64 and 88 px.

**On the board's screenshots: they are not a byte baseline.** Comparing the 19
regenerated captures against Task 255's showed 18 changed — but **two
consecutive runs of identical code differ in 15 of 19**, so the captures are
non-deterministic on this machine and prove nothing either way. That is why the
source diff above, and the browser suite's measurements, are the evidence cited
here. Task 255's screenshots were backed up to the scratchpad before the first
run.

**`c10` — no dependency, no external action.** No install, provider or model
call, credential, paid call, network or external-service write, push,
publication or deployment. No `.cairn` data read, written or deleted. The lab
server and browser are stopped: no listener on 7390 or 7399, and no `msedge`,
`node` or `electron` process remains.

**`c11` — records and Git protection. PASS.** Brief committed alone at
`b2d7a66`; completion commit stages only this task's exact paths. Nothing
cleaned, stashed, reset, broadly staged or rewritten. `app/test-results/`
protected: `task229-builder-proposal-review.png` is 696,088 bytes, SHA-256
`C692EC68…FBEA69`, unchanged.

## Two Slice 1 tests had to be rewritten, and one was already red

Both are disclosed as **Rewritten** under the plan's disposition rule: the
contract each enforces is unchanged, but the file that must satisfy it moved.

**1. `residentprogramboard.test.ts` asserted the board imports nothing from
production.** Slice 1 was forbidden to touch `app/src/**`, so that was the right
rule then. Slice 3 deliberately inverts one half of it — a board exists so the
owner can judge the thing that *ships*. The half that must never invert is the
**direction**: production still imports nothing from `lab/`. The allowlist gains
exactly two entries and stays exact, so importing `app.css` or the token file
would still fail; nineteen assertions were repointed from the lab file to the
component; and the test's now-inaccurate title was corrected rather than left
lying.

**2. `resident-program-bundle-dark.test.mjs` matched on `CairnProgram`,
`rp-program` and the bare phrase `resident-program`** as proof-of-board. All
three now legitimately live in production, because that is exactly what this
slice promoted.

Fixing it surfaced a defect of my own: **Task 257 had already turned this test
red on `main`.** `renderer/activity/presentation.ts` names "the resident-program
visual overhaul" in its header comment, the loose phrase matched it, and Task
257's check set never ran this file — verified by testing the regex against
`git show 91b087e:` of that file. A marker that matches a word in a *comment* was
never testing imports. The markers are now board-only: its declared marker, a
path reference to its source, and three classes that exist nowhere else. The
positive control — the lab bundle must contain the board — still runs and
passes, so the negative results are not vacuous.

## How to try it

The app should look and behave exactly as it does today; the foundation is
there but nothing consumes it until Slice 4.

```powershell
cd "C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework\app"
npm run lab
```

Open `http://localhost:7390/lab/resident-program.html`. Every Cairn on that
board is now the component the app ships. Switch System / Light / Dark, tab to
see the focus ring, press "Play the arrival once". Then `npm start` and confirm
the app is unchanged.

## Limitations and remaining judgment

- **Nothing consumes the new foundation yet.** `surfaces.css` and
  `workspace.css` are written against the constitution's section 7 but are
  unproven in composition until Slice 4 mounts them — that is the slice
  boundary, and Owner gate 2 falls at its end.
- The 44 × 44 target floor and the focus ring are declared in CSS here and
  measured in the browser only on the board's own controls. The new
  `.rp-control` is not yet rendered anywhere, so its real bounding box is
  unverified.
- `c3` measures token pairs, not composed reality: a future surface that layers
  translucency over an unexpected ground could still fall below its floor.
- The board's screenshots are regenerable but not byte-reproducible on this
  machine, as recorded above.
- One coordinate in the drawing emits as `79.80000000000001` (the right mouth
  post, `65.9 + 13.9` in binary floating point). It parses to the same place and
  the arithmetic is left exactly as the owner approved it; a later slice may
  tidy the emitted text.
- The milestone did not move.

Slice 4 was not begun in this conversation.

**Disposition: DONE**
