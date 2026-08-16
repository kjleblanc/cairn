# Cairn's resident-program visual design — the written constitution

**Task:** 255 (Slice 1 of
`docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`).
**Status:** the drawn proposal awaits Owner gate 1. The D body, the daylight
palette and the shell direction are already approved and are recorded here as
settled. The derived expressions, the Dark treatment and the compact treatment
are proposals until the owner says otherwise.

**Authority:** this document records how the approved direction is *built*. It
does not supersede the plan, and it decides nothing the owner has not decided.
Where the plan's approved seed and a measurement disagree, both are written
down and the reason for the choice is given.

**Where to look at it:** `app/lab/resident-program.html`, lab-only. It is absent
from every production import, route and bundle, and
`app/tests-qualification/resident-program-bundle-dark.test.mjs` proves that
against a fresh build rather than against intent.

---

## 1. Custody of the approved references

Two generated references are the approved target. They were verified by hash at
their source and copied byte-for-byte into the repository:

| Tracked copy | SHA-256 |
|---|---|
| `docs/visual-reference/cairn-resident-program-ui-approved-2026-08-13.png` | `5B56B4A7018D35BA4D815DD161E591470092915E11A705873E758B3F698CF470` |
| `docs/visual-reference/cairn-face-d-approved-2026-08-13.png` | `AFCAD4FF92CF8C07B7F1E00B34B1D28E2F2A12F70B964EDB454AF275738EC5D0` |

Neither destination existed beforehand, so nothing was overwritten. The eight
mood images at `C:\Users\KenJL\Desktop\CAIRN REF\` contributed principles only
— emotionally legible presence, one playful program inside a machine, warm and
cool cinematic contrast, calm friendly hierarchy. No mark, body, character,
signature, cursor, tab or layout was copied from any of them. Every shape in
Cairn is drawn from the coordinates in section 3 of this document.

---

## 2. What Cairn is

Cairn is a small resident software program: three offset rounded panes, seen
slightly from the side, as if a few windows were stacked on a desk. He is not a
humanoid, animal, orb, spider robot, anime portrait, or a conventional
assistant avatar, and he is not a mascot who appears on everything.

- The **front pane** is warm amber and carries the face. Its top-right corner
  is clipped on the diagonal.
- Two **rear panes** are translucent teal, fanned behind it — one leaning
  counter-clockwise and reaching down-left, one leaning clockwise and reaching
  up-right.
- A **cyan seam pane** sits behind them all; only its lower-left corner clears
  the stack.
- Two **data marks** — a sage square and an amber square — sit off the right
  seam.

He should read as warm, capable, conspiratorial and slightly impish.

**One presence per screen.** Cairn inhabits the surface that currently matters —
the header at rest, the current response, a decision pause, activity, or a
result. The small mark in the chrome is furniture and never becomes a second
status source. The synthetic shell on the board demonstrates this: the rail
carries a navigation glyph, not a second Cairn.

---

## 3. The geometry, measured

Everything below was measured from
`docs/visual-reference/cairn-face-d-approved-2026-08-13.png` by classifying
pixels and reading edges, then converted into a unit space where the front pane
is 76 × 63.5. The reference's pane measures 241 × 201 px, so one unit is
0.3154 reference pixels; the pane's aspect ratio is 1.199 and the drawn pane's
is 1.197.

The `viewBox` is `0 3 128 94`. The compact mark's is `22 18 90 78`.

| Element | Position and size, in units |
|---|---|
| Front pane | x 30, y 26, w 76, h 63.5, corner radius 5.5, top-right chamfer 12.8 |
| Rear pane, back | 76 × 63.5 at (9, 24), rotated −7° about (47, 55.75) |
| Rear pane, middle | 76 × 63.5 at (16, 13), rotated +7° about (54, 44.75) |
| Cyan seam pane | 45 × 50.7 at (24, 44), drawn first so the fan veils all but its corner |
| Data mark, sage | 6.8 square at (118.3, 50.3) |
| Data mark, amber | 6.8 square at (113, 59.7) |
| Left eye | outlined square, 12.3 at (46.4, 45.9), stroke 2.5, inner hole 7.3 |
| Right eye | crescent arc, centre x 84.6, ends at y 54.4, rx 4.95, ry 3.9, stroke 3, butt caps |
| Mouth | three blocks — see below |

### The lopsided stepped smile

The mouth is the detail most easily got wrong, and it is not one outline. Read
row by row, the reference gives three **separate** blocks: two small posts side
by side at the top, and a wider bar below and strictly **between** them — a
staircase, not a `U`.

| Block | Units |
|---|---|
| Left post | x 65.9, y 70.8, 3.8 × 3.8 |
| Bar | x 69.7, y 74.9, 10.1 × 3.5 |
| Right post | x 79.8, y 70.8, 4.1 × 3.8 |

The lopsidedness is quiet and comes from two things: the right post is a hair
wider than the left, and the whole mouth sits to the right of the eyes'
midpoint — its centre is at 74.9 against the eyes' 68.6, an offset of 6.3
units, or about 8% of the pane's width. It is a sidelong half-smile, not a grin.

The **clipped corner** is the silhouette's most distinctive line and the
easiest thing to get wrong by eye. On the reference the pane's right edge
climbs from x = 388 at its top row to x = 429 forty rows lower: a 45° cut of
41 px across a 240 px pane, which is 12.8 units. An earlier eyeballed 9.5 was
26% short and had to be corrected against the measurement.

### `size` means the pane, not the box

`CairnProgram`'s `size` prop is the **height of the amber front pane** — how big
Cairn actually looks — not the SVG's bounding box. Measured against the approved
mockup, that is the honest reading: Cairn's pane there is roughly 90 px tall in
a 1320 px window and roughly 28 px in the header, which is exactly the 28–88
range the plan names. Sizing by the bounding box would have shipped a Cairn
about a third smaller than the one the owner approved.

### The mark is a reduction, not a shrink

Below about 40 px the rear fan and the data squares turn to mud. The `mark`
variant therefore drops them and keeps the pane, its clipped corner and the
face. The approved mockup does the same thing in its own header. **This is an
implementation decision on the owner's list at Owner gate 1.**

---

## 4. The nine semantic states

Written language carries the truth. Face and pane treatments reinforce it and
never replace it — cover every face on the board and every state still reads.

| State | Written truth | Expression | Motion |
|---|---|---|---|
| Ready / idle | `Ready` | Face D exactly as approved | Static |
| Thinking / replying | `Thinking` | Closed eye opens to a small solid square; smile relaxes to a short step; rear panes separate by a hair | One finite arrival, then still; text is never held back |
| Needs owner / pushback | `Needs decision` | Two open outlined eyes, the right one lifted — the quizzical tilt of waiting for an answer — over a short mouth | One finite amber emphasis on the front pane edge |
| Starting / working | `Working · 1 approved task` | Both eyes drop to level bars, looking down at the work; the lower data mark turns teal | One dispatch pulse; no loop |
| Checking | `Checking` | Two outlined eyes, the right one smaller, reading closely; one faint band rests low on the pane | One finite scan that settles and stops |
| Done | `Verified done` | Both eyes close into crescents; the approved stepped smile is unchanged | One settle; no confetti |
| Stopped | `Stopped` **plus its reason and the owner's next choice** | Both eyes open and level, mouth a full-width bar, hollow **square** at the seam | Static after one arrival |
| Error | `Error` **plus the plain-language effect and recovery** | Eyes narrow to upright bars, stepped mouth **inverts**, seam mark is a **circle** | Static after one arrival |
| Disconnected | `Not connected` | Two level dashes and a short mouth on a drained pane | Static |

Two of these states are not finished by their badge. The constitution requires
STOPPED to carry its reason and the owner's next choice, and ERROR to carry the
plain-language effect and recovery, so both cards on the board print that
sentence in full ink beneath the badge. A board that showed only the word would
be demonstrating a state Cairn is not allowed to ship.

Three consequences are load-bearing and are tested:

- **No two states are drawn with the same face.** An early draft gave
  needs-decision and stopped identical geometry; a test now fails if any two
  states' drawn expressions match.
- **Stopped and error never differ by colour alone.** They differ by the word,
  by the mouth (full-width bar versus inverted staircase), by the eyes (open
  squares versus upright bars), and by the seam mark (square versus circle).
- **Every card's written description matches its drawing.** The needs-decision
  card said its eyes were "level" while the drawing lifted the right one —
  erasing the one feature that separates pushback from a stop, in the caption
  the owner reads to know what to look for. Corrected; card prose is now
  checked against the spec table rather than written twice.

The expression vocabulary is five shapes — outlined square, solid square,
crescent, bar, stepped mouth — recombined. No state invents a sixth.

---

## 5. The palette

Values marked **measured** were sampled from the approved mockup. Values marked
**derived** exist because the measured or seeded colour did not clear its WCAG
floor for the job it was actually doing. `residentprogramboard.test.ts`
recomputes every ratio from these same tokens, so a later edit that drops a
colour below its floor fails a test rather than shipping.

### Daylight

| Role | Token | Value | Source |
|---|---|---|---|
| Dusty shell | `--rp-field` | `#B4C1C7` | the mockup's shell measures `#C1C8CD`; **one step darker**, as the owner asked |
| Quiet chrome | `--rp-chrome` | `#DBDCDD` | measured |
| Rail | `--rp-rail` | `#C6CCCF` | measured `#CBCFD2`, a shade down |
| Conversation paper | `--rp-paper` | `#F6ECDC` | measured |
| Raised paper | `--rp-paper-raised` | `#FBF4E7` | measured |
| Chrome paper | `--rp-paper-chrome` | `#F0E8DC` | measured |
| Ink | `--rp-ink` | `#15384B` | the plan's approved seed |
| Muted ink | `--rp-ink-muted` | `#47606D` | derived — `#5C7480` measured 4.21:1 on paper |
| Teal, surfaces | `--rp-teal` | `#177F8C` | approved seed |
| Teal, text | `--rp-teal-ink` | `#0F5F6B` | derived — the seed measures 4.03:1, fine for a button but short for small text |
| Cairn amber | `--rp-amber` | `#F0C65A` | approved seed |
| Owner apricot | `--rp-apricot` | `#F7DBB9` | measured |
| Activity blue | `--rp-activity` | `#D2E2E9` | approved seed |
| Success sage | `--rp-sage` | `#D9E4C9` | approved seed |
| Risk coral, rule | `--rp-coral-line` | `#BF5F56` | derived — the seed `#C86F67` measures 3.03:1, too close to the floor to trust |
| Risk coral, text | `--rp-coral-ink` | `#9A453E` | derived |

Every semantic ground is paired with an ink that clears 4.5:1 on it, because a
state is always written and never coloured alone.

**The mockup's ink runs deeper than the seed.** Its prose measures near
`#0C1628` at the stroke core. The approved seed `#15384B` is used instead
because it is what the constitution says and it clears 10.5:1 on paper with
room to spare. If the owner wants the deeper ink, that is a one-token change.

### Dark — the same warm desk after dusk

Not the retired night garden, and not an inverted daylight theme. The paper is
still the warmest, lightest thing in the frame — lit by a lamp, not switched off
— and the shell recedes to a cool slate.

One inversion is forced by contrast rather than taste: on the lighter dark-theme
teal, a white button label measures 2.28:1, so the label goes dark
(`--rp-on-teal: #10262A`) instead. **This is on the owner's list at Owner gate
1.**

### The System trap, and the guard against it

CSS custom properties cannot be aliased across a media query, so the dark
palette exists in three places: `:root[data-theme="dark"]`, the
`[data-rp-scheme="dark"]` island used for the side-by-side comparison, and the
`prefers-color-scheme: dark` block that serves the System choice.

That duplication is a real hazard, and it bit immediately: `--rp-on-teal` was
added to the explicit-dark block and forgotten in the System block, which would
have shipped a 2.28:1 button label to every System-on-a-dark-OS user. A test now
compares the two blocks token for token, and the browser qualification renders
the explicit choice against the **opposite** operating system in both directions
to prove the override actually wins.

---

## 6. Type, density, controls, and motion

- Bundled Quicksand only — 400 for prose, 600 for labels and controls, 700 for
  headings and decisive states. No font is installed.
- Conversation prose is 18 px at 1.6 line height with a 62 `ch` measure.
  Monospace is reserved for commands, paths, hashes and check ids.
- Every interactive target is at least 44 × 44 px, verified in the browser from
  real bounding boxes rather than from the stylesheet.
- Focus is drawn: a 3 px solid ring in `--rp-focus` at a 2 px offset. It is
  verified by tabbing to a control, because a programmatic `.focus()` sets
  `:focus` but never `:focus-visible` — testing that way measures a ring users
  never see.
- One restrained static paper texture, shared by every paper surface. Never
  animated. Five bespoke noises would read as five textures, not as paper.

**Nothing moves that you did not cause.** There is exactly one animation
vocabulary — one finite arrival and one finite settle — both event-driven,
transform- and opacity-only, both ending at `transform: none`. No perpetual
float, sheen, blink, packet, ripple, bounce or glitch loop; no delayed
typewriter text. No transform is applied to a container that holds an
interactive control, which is tested by parsing the stylesheet with a
brace-tracking scanner rather than a regex — a plain `\b` also matches inside
`text-transform`, which made an earlier version of that test pass on eight
harmless rules.

Reduced motion reaches the **identical semantic end state**. That is asserted on
computed position and opacity, not on pixels: a settled
`transform: matrix(1,0,0,1,0,0)` and a `transform: none` put the element in the
same place, but the first promotes it to its own compositing layer, so their
antialiasing differs by a few bytes. The test also proves the arrival genuinely
moves something mid-flight, so "the end states match" cannot be true merely
because nothing ever moved.

---

## 7. Composition

The conversation is the object; everything else is subordinate. A slim rail
holds navigation, a quiet header holds identity and connection state, and the
warm paper holds the exchange.

- **The transcript scrolls; nothing else does.** The activity capsule and the
  composer keep their natural size and never scroll out of sight, because what
  Cairn is doing right now must not be something you have to hunt for.
- **A long project name shortens; the connection state never does.** Which
  project you are in is legible, but *whether you are connected* must not be the
  thing that gets pushed off the edge.
- **Compact is the same components with less room, not a second design.** It
  narrows the rail and drops the project name and the activity detail. The
  activity state itself never drops.
- Below the supported 760 px minimum, 540 px is a containment stress test and
  not a supported size. A deliberately wide composition viewed on a narrow
  screen scrolls inside its own frame; the page itself never scrolls sideways.

The board's phone view is synthetic lab composition. The shipped companion stays
self-contained, LAN-only, and read-only after pairing; nothing here implements
or cancels the separately accepted full-parity direction, and production Cairn
belongs to Slice 3.

---

## 8. What this board deliberately does not do

- It changes no production file. `app/src/**`, `core/**`, the phone page, IPC,
  stores, package manifests and production routes are untouched.
- It carries no action. Its only two behaviours are switching its own theme and
  replaying one animation; both change local view state and nothing else. The
  approval pair in the sample sequence is **drawn**, not built from controls —
  a board must never offer an approval that could be mistaken for a real one.
- It defines its own `--rp-*` token layer rather than importing the shipped
  `app.css`. That cascade is the retired night garden; judging the new system
  through it would be judging the wrong thing. Promoting these tokens into
  `src/renderer/tokens.css` is Slice 3's work, and Slice 3 must preserve the old
  aliases while unmigrated surfaces still consume them.
- It pre-approves nothing. Face D, the daylight palette and the shell direction
  came in approved; the expressions, Dark and compact go out for judgment.
