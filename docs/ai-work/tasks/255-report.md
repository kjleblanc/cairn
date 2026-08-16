# Task 255 report - the resident-program visual constitution and state board

**Lane:** A (the main checkout). **Base commit:** `be921e9`. **Claim commit:**
`e71db92` (brief only). **Slice:** 1 of 11 in
`docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`.

**Owner gate 1 verdict, given 2026-08-16:** *"Looks amazing. Passes all
questions."* That confirms implementation fidelity to the already-approved D
body, daylight palette and shell direction, and approves the three previously
unseen decisions - the derived expressions, the Dark treatment and the compact
treatment - plus the two implementation calls put to the owner (what `size`
means, and the small mark's reduction).

## What actually changed

Created:

- `docs/superpowers/specs/2026-08-13-cairn-resident-program-visual-design.md`
- `docs/visual-reference/cairn-resident-program-ui-approved-2026-08-13.png`
- `docs/visual-reference/cairn-face-d-approved-2026-08-13.png`
- `app/lab/resident-program.html`, `.tsx`, `.css`
- `app/tests-unit/residentprogramboard.test.ts`
- `app/playwright.residentprogram.config.ts`
- `app/tests-qualification/resident-program-board.browser.spec.ts`
- `app/tests-qualification/resident-program-bundle-dark.test.mjs`
- this report, and one LOG row

Modified, additively and only these:

- `app/lab/controls.ts` (+6 lines: one link to the new lab page)
- `app/vite.lab.config.ts` (+1 line: one build input)
- `docs/ai-work/tasks/255-brief.md` (corrected after review; see below)

`app/tsconfig.unit.json` was **not** modified. The plan permitted it, but the
new suite lives under `tests-unit/**/*.ts`, which that config already includes,
so the edit was unnecessary. Nothing under `app/src/**`, `core/**`, `cli/**`,
the phone page, IPC, preload, stores, package manifests or production routes
was touched. The complete tracked diff outside this task's own records is seven
added lines.

## Checks

Run from `app/` unless stated. Everything below is the real result on the
settled tree.

**`c1` - the approved references are preserved byte-exact. PASS.**
Both sources hashed to the plan's section 2.6 values before copying; neither
destination existed, so nothing was overwritten. Re-verified after all work:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath docs/visual-reference/cairn-resident-program-ui-approved-2026-08-13.png
Get-FileHash -Algorithm SHA256 -LiteralPath docs/visual-reference/cairn-face-d-approved-2026-08-13.png
```

`5B56B4A7018D35BA4D815DD161E591470092915E11A705873E758B3F698CF470` and
`AFCAD4FF92CF8C07B7F1E00B34B1D28E2F2A12F70B964EDB454AF275738EC5D0`.

**`c2` - the resident program is code-native and faithful at real size. PASS.**
One SVG draws the whole body and face from measured constants; there is no
raster asset anywhere and no `url()` but the in-document clip reference. The
size row renders 28, 34, 64 and 88 px from the same geometry, and the browser
test computes each figure's real pane height back out of its bounding box and
`viewBox` and asserts exactly `[28, 34, 64, 88]`.

Geometry was measured from the reference by pixel classification, not by eye.
The pane aspect is 1.197 against the reference's 1.199; eye and mouth positions
land within about 1% of measured. Two things the measuring corrected:

- **The mouth is not a `U`.** Row by row it is three *separate* blocks - two
  posts, and a wider bar below and strictly between them.
- **`size` means the amber pane's height, not the bounding box.** Sizing by the
  box would have shipped a Cairn about a third smaller than the approved one.

**`c3` - every semantic state has a proposed expression beside its written
truth. PASS.** All nine render, each with its literal status text, and the
browser test asserts each badge's exact words. Three guards were added during
the work (declared here as additions, not renumbering):

- no two states may draw the same face, compared by *drawn marks* rather than
  source text, and now including `ready`;
- no card may describe eyes the drawing does not draw;
- STOPPED and ERROR must carry their required effect and recovery in full ink.

**`c4` - the visual system is measurably legible. PASS.** The unit suite
recomputes every WCAG ratio from the stylesheet's own token values in both
themes, including palette specimens *derived from the board's own table*, and
resolves translucent hairlines composited over each ground they are drawn on.
Type size, line height and measure are read from the stylesheet rather than
pinned. The browser test measures every control's real bounding box for the
44x44 floor and reads the focus ring after reaching it by keyboard, because a
programmatic `.focus()` sets `:focus` but never `:focus-visible`.

**`c5` - the board holds together across theme and size. PASS.** 1320x980,
760x620, 540x900 and 390x700, in explicit Light, explicit Dark, and System
resolved through browser colour-scheme emulation - never by changing the
owner's operating-system setting. Each explicit choice is tested against the
*opposite* emulated OS, which is the only way to prove the override wins.
`scrollWidth` is compared against `documentElement.clientWidth`, not
`innerWidth`, which would tolerate a scrollbar's width of real overflow.
Sixteen full-page screenshots in `app/test-results/task255-board/`.

**`c6` - motion is finite and reduced motion is equal. PASS.** A brace-tracking
scanner (not a regex - a plain `\b` also matches inside `text-transform`) proves
only the button itself and the two keyframe openings move, and that both
keyframes end at `transform: none`. The browser test proves the arrival really
moves something mid-flight and that reduced motion lands on the identical
semantic end state - measured as position and opacity, because a settled
`matrix(1,0,0,1,0,0)` and a `none` sit in the same place but composite
differently by a few bytes.

**`c7` - the board is product-dark. PASS.** After fresh builds, the board's
markers appear in the lab bundle (positive control first, or the negatives
prove nothing) and nowhere in the emitted main, preload or renderer bundles;
nothing under `app/src` names it. Keyboard traversal reaches ten controls, none
of which can act - clicking every one causes no navigation, no new window and
no request. The sample approval pair is drawn from spans, not controls.

**`c8` - verification, evidence and records are exact. PASS.** Commands and real
results:

```powershell
npm.cmd run typecheck                                              # clean
.\node_modules\.bin\tsc.cmd -p tsconfig.unit.json --pretty false   # clean
node --test dist-unit/tests-unit/residentprogramboard.test.js      # 22/22
npm.cmd run build:lab                                              # built
npm.cmd run build:vite                                             # built
node --test tests-qualification/resident-program-bundle-dark.test.mjs   # 3/3
.\node_modules\.bin\playwright.cmd test --config playwright.residentprogram.config.ts   # 4/4
npm.cmd run test:unit    # 965 tests, 954 pass, 9 fail, 2 skipped
```

The full-suite baseline before this task was 943/932/9/2. The nine failures are
unchanged and all sit in `builderlivetransport.test.js` and
`buildertrackedtext.test.js`, neither of which this task touches; the board
suite contributes zero failures. Ports 7390, 7397, 7398 and 7399 have no
listeners, no `msedge` process remains, and no scratch script remains in `app/`.
**This task took no app token**: like Task 229's board config it declares no
`globalSetup`, drives only a local lab server and never launches Electron, and
neither token location exists. Every other registered worktree reports zero
status entries.

## Three defects this task caused, and what happened to them

**1. Another task's evidence was destroyed, and could not be fully restored.**
`playwright.residentprogram.config.ts` originally declared no `outputDir`.
Playwright clears its output directory at the start of every run and the
default is the shared `test-results`, so this task's runs deleted
`app/test-results/task229-builder-proposal-review.png`, which Task 229's report
cites by size and hash. It was regenerated with Task 229's own config and its
test passes, but it is **not byte-identical**: 696,088 bytes against the
recorded 708,318, and SHA-256
`C692EC68BC12B5110ED7360DC1922A1373E55F499D2A784BAEADE77F7BDFEA69` against the
recorded `55E1E96069DAD1CC24D44661A7D8B68F2CC3CEEAA9799CF198217291E5AFBA6A`.
The file was gitignored, so Git never held it and the exact bytes are
unrecoverable; Task 229's report still documents what they were, and the file
is regenerable by the command that report names. The config now writes to
`test-results/task255-runner`, proved causally - Task 229's file survives
subsequent runs. This violated the contract's rule to treat untracked files as
valuable until ownership is clear; the brief's boundary now says so explicitly
so the next slice inherits it.

**2. The board source was corrupted and briefly emptied.** A PowerShell
`Get-Content -Raw` / `Set-Content -Encoding utf8` round-trip used for mutation
testing double-encoded every non-ASCII character in `resident-program.tsx`, and
a follow-up repair attempt wrote a zero-byte file. Recovered from a backup taken
in the same command and repaired with a Node script carrying an explicit
Windows-1252 reverse map. All eleven files this task writes were then verified:
zero mojibake sequences, zero byte-order marks, zero replacement characters.
Mutation testing afterwards used the Edit tool rather than shell round-trips.

**3. A test was edited and not re-run.** The `onClick` allowlist assertion was
changed after its last green run and its regex ran past the handler's closing
brace. The full suite caught it. It is now brace-counted.

## The adversarial review, and what it changed

Six independent read-only lenses raised 33 findings; 21 were refuted under
skeptical verification and 9 survived. Nine survivors and several MINORs judged
real on inspection were fixed:

- **The needs-decision card said its eyes were "level" while the drawing lifted
  the right one** - erasing in prose the single feature separating pushback from
  a stop, in the caption that tells the owner what to look for. STOPPED's card
  used near-identical words.
- **The chamfer was 26% too shallow.** The reference's cut is 41 px across a
  240 px pane - 12.8 units, not the eyeballed 9.5 - on the most distinctive line
  of the silhouette, in a file whose header claims every coordinate was
  measured.
- **STOPPED and ERROR showed only their badge**, when the constitution requires
  the reason and next choice, and the plain-language effect and recovery.
- **Three contrast failures the original test could not see**: the amber
  specimen at 1.48:1 in Dark, the teal at 4.31:1 in Light, and every control's
  own border at 1.68:1 where WCAG 1.4.11 requires 3:1. A `--rp-control-edge`
  token now carries control boundaries; hairlines are decoration and the brief
  no longer claims the non-text floor for them.
- **`c4` claimed hairlines were proved at 3:1** while the helper threw on the
  first rgba value.
- **`--rp-on-teal` was missing from the System block**, which would have shipped
  a 2.28:1 button label to every System-on-a-dark-OS user. Caught by the test,
  before review.
- Plus: the coral rule printed a rejected value, the measure sat at 62ch outside
  the plan's 65-75, `.rp-anim-settle` was asserted but never used, the raster
  scan never read the CSS (the file that actually embeds an image), the preload
  check had no positive control, and the hover state was undesigned.

Found by looking at the render rather than by any test: the Checking scan band
sat across the mouth's own rows and read as a strike-through. It now sits below.

The brief was corrected where the review showed it overclaimed - the app-token
release it never needed, the `claude/*` worktrees it called dirty when they are
clean, Task 248's attribution, and `c8` assigning the report's duty to the log
row. Existing rows and prior task files were not touched.

Three findings were raised but never verified, because each lens's verification
was capped at six. They are recorded here rather than silently dropped: the
`npm run typecheck` include list does not cover this task's two new TypeScript
files, and two board-copy nits. Fixing the first would require editing
`app/tsconfig.json`, which this slice is not authorised to modify; Task 229's
board config is uncovered in exactly the same way.

## How to try it

```powershell
cd "C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework\app"
npm run lab
```

Open `http://localhost:7390/lab/resident-program.html`, or open
`http://localhost:7390/` and use the "Resident program" link in the lab panel.
Switch System / Light / Dark at the top, tab through the controls to see the
focus ring, and press "Play the arrival once" to see the whole motion
vocabulary. Judge the faces at their true size on screen; a scaled screenshot is
a different object. Stop the server with Ctrl+C.

## Limitations and remaining judgment

- This is a lab board, not the product. No production file changed, and the
  board is absent from every emitted production bundle.
- The board defines its own `--rp-*` token layer rather than importing
  `app.css`. Promoting these tokens into `src/renderer/tokens.css` is Slice 3's
  work, and Slice 3 must preserve the old aliases while unmigrated surfaces
  still consume them.
- Four fidelity deltas remain, disclosed to the owner and accepted at the gate:
  the rear teal panes read lighter than the reference where they overlap
  (`--rp-rear` is the single token), the seam corner reads more as a bottom
  edge, and the data squares follow the UI mockup's sage-plus-amber pairing
  rather than the face board's two sage.
- The unit suite reads the board as text, so a syntactically broken board can
  still pass it. `npm run typecheck` and the browser qualification are the real
  guards, and both caught exactly that during this task.
- The phone view is synthetic lab composition. The shipped companion remains
  self-contained, LAN-only and read-only; production Cairn belongs to Slice 3.
- No dependency install, provider or model call, credential use, paid call,
  network or external-service write, push, publication or deployment occurred.
  No `.cairn` data was read, written or deleted. The milestone did not move.

Slice 2 was not begun in this conversation.

**Disposition: DONE**
