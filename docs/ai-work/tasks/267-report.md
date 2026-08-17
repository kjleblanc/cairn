# Task 267 report — running, results, evidence, publication, and the hook

**Lane:** A (the main checkout), confirmed clean and between tasks.
**Base commit:** `ee19118`. **Brief committed alone at:** `28b46d0`.
**Slice:** 7 of 11 in
`docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`.

**Contract:** Cairn Contract **v0.8.0**, which is what `main` carries and what
governs here. `lane/i` carries v0.9.0. Nothing in this task goes near
`docs/ai-work/verdicts/`, and the task listing was re-read across every branch
immediately before the brief was written, so v0.9.0's stricter clauses are
satisfied anyway.

**Owner gate 3 falls at the end of this slice and has not been answered.** It is
`c15`, it is the owner's judgment, and this task's DONE does not depend on it.
The captures are on disk and the exact steps are under "How to try it".

## What this slice actually did

Slice 5 moved the conversation onto paper and Slice 6 moved the decision family.
This slice took the last family — the result receipt, the run strip, the inline
evidence and the publication checkpoint — **and then removed
`chat-column-villager` itself**, the retired hook that has carried the interior
of the conversation since Slice 4.

Measured: `chat-column-villager` goes from **167 occurrences in `app.css` to
zero**, and from **2 occurrences in `Chat.tsx` to zero**. Across the whole of
`app/src/**` exactly **three** mentions remain, all of them prose inside
comments that explain why the class is gone; stripping comments leaves none.
`app.css` goes from 2393 lines to **1777**, `surfaces.css` from 1846 to
**3206**, `motion.css` from 251 to **291**, `workspace.css` from 423 to **436**.

## Six things found before or during the work that the handoff did not have

**1. `workspace.css` keyed three selectors on the class being deleted.** This is
the one that would have caused a hundred apparently-unrelated colour
regressions. `workspace.css:248` and `:320` were deliberately three-class
(`.rp-conversation.chat-column.chat-column-villager`) so they out-specified
`app.css`'s `.chat-column.chat-column-villager` (0,2,0), and `:358` did the same
for the top bar. Line 248 carries the **entire paired-token block** that
re-points `--card`, `--line`, `--lantern-*`, `--garden-*` and `--pond-*` — which
is what keeps every unmigrated surface on warm paper. Removing the class from
`Chat.tsx` without shortening those selectors would have stopped them matching.
Both were reduced to `.rp-conversation.chat-column` in the same change.

**2. Slice 6's action skin is an enumerated allowlist, so a generic replacement
was mandatory.** It names eight action containers and does not cover a bare
`.pill`. Three real controls depended entirely on the retired generic skin: the
receipt's own action, **Push and Not now**, and the evidence album's opener.
Without a replacement they would have fallen back to `app.css:32` — a 999 px
capsule with a hard 4 px edge, a `scale(1.04)` hover the constitution forbids, a
`--garden-cyan` focus ring, and `opacity: .5` when disabled, **the exact defect
Slice 6 removed as an accessibility problem**. Four regressions from one
deletion, none visible in a stylesheet diff. One rule —
`.rp-conversation .pill` — is why the hook could come off, and `c7` measures it
in the running app.

**3. The evidence album is portaled, so half of `EvidenceAlbum.tsx` could not be
scoped.** `EvidenceAlbum.tsx:247` is `createPortal(..., document.body)`. The
`result-evidence*` section is inline in the receipt and moved; the
`evidence-album*` overlay is **outside `.rp-conversation` entirely** and no rule
anchored there could ever reach it. Six rules were written scoped and then
removed again once this was found; the album's rules stay unscoped in `app.css`,
and `evidencepresentation.test.ts` now asserts that split in both directions so
it cannot be got backwards later.

**4. The follow-up family was already migrated by Slice 5.** The plan lists
follow-ups among Slice 7's surfaces. `surfaces.css` 559–678 already holds the
whole family. Re-declaring them would have been strictly harmful — later in the
same file, silently overriding Slice 5's rules with a weaker copy. The block was
written and then deleted; what stands in its place is a comment saying so.

**5. `.chat-tuck` and the pond's put-away rules were already dead.** No `.tsx`
renders `chat-tuck`, `chat-villager-chip`, `workspace-town-pane` or
`workspace-town-pane-pond-open`. Those are deletions proved, not rules moved.

**6. A second pre-existing red, in this slice's own territory.**
`conductor.spec.ts` — *a reload mid-run reattaches the conversation's strip and
shows the finished state there* — **fails on `main` at `ee19118`, before any
edit.** It was run three times, once batched and twice alone, and fails
identically each time at the `toContainText("DONE —")` assertion: after a
mid-run reload the run never finishes, and the strip stays at the `Check` stage.
Without that baseline this would have looked like damage done by the migration.
The handoff named only `builder-proposal-conversation.spec.ts`.

**And one handoff claim that did not survive checking.** The handoff states that
`lantern.test.ts`'s helper has "no `-1` assertion". It does:
`lantern.test.ts:11` was `assert.notEqual(start, -1, "the villager column rule
is gone")`. The helper was guarded and its failure message was clear.

## What actually changed

Modified:

- **`app/src/renderer/surfaces.css`** — 1846 lines to 3206. The result family's
  paper language: one shared control skin, the run strip, the receipt with its
  promised rows and three disclosures, the inline evidence, the publication
  checkpoint and its outcome line, plus one narrow block at 1260 px and
  additions to the existing 820 px compact block. **Every selector starts at
  `.rp-conversation`** — 452 selector entries scanned, all anchored.
- **`app/src/renderer/app.css`** — 2393 lines to 1777. Eleven blocks deleted,
  each replaced by a comment naming what went and why **without naming the class
  it went to**, because `visualtokens.test.ts` regexes this file including its
  comments. `grep -c "rp-" app.css` is **0**.
- **`app/src/renderer/workspace.css`** — the two three-class selectors reduced,
  as above, with the reason recorded in the file.
- **`app/src/renderer/motion.css`** — `chat-arrive` no longer slides and scales
  `.result-card`, `.run-strip` or `.push-chip` inside the conversation, and the
  shared control skin's one transition is stilled for reduced motion.
- **`app/src/renderer/screens/Chat.tsx`** — the class removed from the one
  element that carried it, and its comment rewritten.
- Ten test files, listed under Dispositions. One deleted.

Created: this report, one LOG row, and 36 captures under `app/shots/task267/`
(gitignored, like Slice 6's). Deleted: `app/tests-unit/lantern.test.ts` and its
compiled artifact in `dist-unit/`, plus the temporary capture harness.

Nothing under `core/**`, `cli/**`, `src/main/**`, `src/shared/**`, IPC, preload,
stores, the phone page, package manifests or lockfiles. No `.cairn` data read,
written or deleted. No registered worktree created, deleted, reused, reset or
moved.

## Decisions

**One shared control skin, stated once.** The retired language dressed every
control in the conversation with one generic rule; Slice 6 replaced part of it
with an enumerated list. Rather than extend that list — a list to forget to
extend — Slice 7 restates the floor once for every control on the paper, at
(0,2,0), so the eight enumerated rules at (0,3,0) still override it wherever a
decision surface wants something louder. That single rule is what made removing
the hook safe.

**The registration mark became a real border, again.** The receipt's and the
checkpoint's marks were absolutely positioned 2 px `::before` elements. They are
`border-left` now, the same conversion Slice 6 made, and the same signal with no
positioned box to contain.

**Both halves of the family moved, because there is no second consumer.** Unlike
Slice 6, this slice left no duplication behind: `result-card*`, `run-strip*`,
`push-*` and the inline evidence are rendered by `Chat.tsx` alone — verified by
reading `TaskRun.tsx`, which renders seven class names and none of them are in
this family. So the unscoped bases moved too rather than staying for a second
screen. (One subagent asserted those bases "serve TaskRun"; it flagged the claim
as unverified, and reading `TaskRun.tsx` disproved it.)

**Three states are distinguished by shape, not only by ink.** DONE is a filled
disc, STOPPED a bar, ERROR a doubled outline — and the run strip uses the same
five-mark vocabulary so a live run and a settled receipt read alike. The tests
now assert the marks **differ from one another**, which three identical rules
would previously have satisfied.

**The push outcome stayed a receipt LINE.** The first draft made it a raised
card. Task 193 chose a ruled line deliberately, so that what already happened
does not compete with the checkpoint still asking for something. It was changed
back before the tests were re-pointed.

## Two defects I introduced, both caught by tests rather than by eye

**1. A second reduced-motion block moved every `lastIndexOf` marker.** The
slice's motion kill was first added as a new `@media (prefers-reduced-motion:
reduce)` block at the end of `motion.css`. Four tests in three files pin their
contract with `motion.lastIndexOf("@media (prefers-reduced-motion: reduce)")`,
and all four silently started reading the new block instead. Merged into the
existing final block, with a comment in the file saying there is exactly one and
why, and `papersignal.test.ts` now asserts the count.

**2. Moving the run strip's compact rules from 620 px to 820 px broke a
supported size.** This looked like a mechanical port and was not: 820 px is
**above** the supported 760 px minimum, so a reflow that had only ever reached
the unsupported stress view began firing at a size people actually use. It
restacked the run controls onto their own row — and `conductor.spec.ts` measures
at exactly 760 × 620 that *the current safe actions share the status line*. The
strip tightens and wraps at 820 px now instead of restacking. **This is the
strongest argument in the slice for measuring in the running app**: every unit
test passed while this was broken.

## Checks

Run from `app/`. Every command below is the exact one run.

**`c1` — the result family's rules leave the hook, and the hook is gone. PASS.**

```powershell
node --test dist-unit/tests-unit/visualtokens.test.js   # 17/17
```

`chat-column-villager` reaches **zero** selectors and zero rendered classes
across `app/src/**`; three prose mentions remain in comments, and stripping
comments leaves none. All four boundary guards pass unchanged: every selector in
the migrated sheets is anchored on an `.rp-` class (452 entries scanned),
`app.css` declares no `rp-` string in a rule **or a comment**, production markup
carries `rp-` classes, and the breakpoint census is still exactly `{820, 1260}`.
The eleven rules that sat behind `max-width: 620px` are at 820 px.

**`c2` — every component's behaviour is unchanged, measured. PASS.** The harness
stripped the value of every `className` from all **47** renderer screens,
components and lab entries and hashed the rest, before the first edit, against a
tree `git status` reported clean at `ee19118`. Re-run afterwards, the entire
diff is one file:

```text
=== 1. digests that MOVED ===
<  c61431bb…  Chat.tsx
>  e0310caf…  Chat.tsx
=== 2. the exact non-className change ===
--- Chat        (the comment above the column, rewritten — nothing else)
=== 3. LITERALS gained or lost ===
--- Chat
<  rp-conversation chat-column-villager
>  rp-conversation
```

The className value itself is the intended change. **No protocol literal moved**
— no run state, push phase, evidence kind, disposition, action id or
discriminant among the 2,896 literals under watch. No callback, gate, ref,
effect, busy flag or focus move could have changed, because the only
non-className edit in any component is a comment.

**`c3` — the outcome first, and checked facts separate from reported claims.
PASS.** Asserted in `resultreceipt.test.ts` and seen in the captures under `c9`:
the receipt leads with pictures, then the disposition, then *What Cairn checked*
open and unfolded; the builder's account and the original request stay complete
behind their own native disclosures, and each disclosure states its provenance
**in its summary line** — `CHECKED BY CAIRN`, `REPORTED, NOT CHECKED`,
`REFERENCE, NOT A VERIFIED RESULT` — so the owner knows what is behind a fold
before opening it. The promised rows keep Cairn's status, the owner's and the
worker's separate, with only the worker's marked *(reported, not checked)*.

**`c4` — DONE, STOPPED and ERROR are distinguished without colour. PASS.** A
filled disc, a bar, and a doubled outline, on both the receipt and the run
strip, which now share one five-mark vocabulary (adding an open ring for running
and a hollow square for closed). The tests assert the marks **differ from each
other**, not merely that each exists.

**`c5` — native controls, keyboard, focus and target size. PASS.** No component
changed, so native semantics and accessible names are unchanged by construction
(`c2`). Focus is measured by **tabbing** in the running app: every ring is the
constitution's 3 px at a 2 px offset. Every interactive target inside
`.rp-conversation` clears 44 × 44 from its real bounding box with a receipt, a
run strip and the composer on screen. Two controls were **below** the floor and
are Rewritten dispositions with reasons: the run strip's actions (roughly 20 px
tall — one of them is *Stop this task*) and the push chip (40 px).

**`c6` — long data contains itself. PASS.** Measured in the running app at
1320 × 980, at the supported 760 × 620 minimum and at the test-only 540 × 900
stress. `evidence.spec.ts` reads the receipt's `scrollWidth - clientWidth` as 0
at 760 px with every control inside the card's box, and the same for the run
strip. A long `file://` remote URL wraps inside the checkpoint's ledger rather
than widening the paper — visible in `05-push-confirm-*`.

**`c7` — every control keeps its skin when the hook comes off. PASS, and it is
the check the slice turns on.** Measured from **computed styles in the running
app**, inside `contrast.spec.ts`'s connected scenario with a receipt, a run
strip and the composer all on the paper:

```text
capsules (border-radius >= 100px)   []
lifted   (box-shadow !== none)      []
faded    (disabled with opacity <1) []
controls counted                    > 6
```

No control fell back to the retired tactile base: none is a capsule, none
carries the hard offset edge, and **no disabled control is read through a
fade**. The count is asserted so an empty sweep cannot pass as a clean one.

**`c8` — measured contrast, with the result family under it. PASS.**

```powershell
node ./node_modules/@playwright/test/cli.js test tests/contrast.spec.ts --output=test-results/task267-runner
# contrast (disconnected desk): 19 elements measured, worst 6.06:1 (floor 4.5) on "← Project home"
# contrast (connected conversation): 42 elements measured, worst 4.77:1 (floor 4.5) on "checked by Cairn"
```

The connected sweep went from Task 263's **36 elements to 42** because it now
drives a DONE receipt and both provenance disclosures onto the paper before
measuring. **The worst case moved from 5.47:1 to 4.77:1** and is the disclosure
provenance label — 12 px bold in the muted ink. It clears the 4.5 floor with
less headroom than before, and that is stated rather than buried: it is the new
worst element in the conversation and the first place to look if the owner finds
anything hard to read.

The disconnected sweep measured **19** elements here against 21 in this task's
own pre-edit baseline, at an identical 6.06:1 worst ratio on the identical
element. That sweep skips containers whose box is mostly covered by a child
painting its own background, and two connect-card controls changed fill, so two
containers became "covered" and their children were measured instead. No element
was lost from the measurement; the worst case is unchanged.

**`c9` — every semantic state, seen. PASS, with two states it cannot reach.**
**Thirty-six captures** of the real built app in **`app/shots/task267/`** — six
states, each at 1320 × 980, the supported minimum 760 × 620, and the test-only
540 × 900 stress, in explicit Light and Dark:

`01-receipt-done`, `02-receipt-details-open` (both provenance disclosures open —
the state where CHECKED and REPORTED sit side by side), `03-receipt-request-open`
(the attributed request rows, now wearing the one shared provenance rule set),
`04-push-chip`, `05-push-confirm` (the ruled ledger, the exposure sentence and
the recovery sentence on separate rules, Push and Not now), and
`06-push-outcome`.

They live in `shots/`, which is gitignored and which nothing clears, for the
reason Task 259 found the hard way about `test-results/`.

**Two states are not captured, and neither is a harness gap.** A STOPPED receipt
and an ERROR receipt need routes this harness does not drive — the offline
demonstration always succeeds — and reaching a real failure needs a paid worker
call, outside this task's boundary. Both have their rules asserted against the
stylesheet, and `conductor.spec.ts`'s *a stopped run posts an honest STOPPED
card* passes against the running app.

**The capture harness was temporary and is deleted**, exactly as Slice 5's and
Slice 6's were. It imported `test` from `./fixtures/isolated-profile` and
scaffolded with core's `initProject`; both traps are recorded in the report it
came from. Its push upstream was a **bare git repository in a temp directory**
addressed as a `file://` URL, so the publication route was photographed end to
end with nothing leaving the machine.

**`c10` — a disposition for every old test that moved.** Below, in its own
section. Ten files moved, one was Replaced and deleted, and three quiet guards
were repaired.

**`c11` — the app compiles, builds and tests as it did. PASS.**

```powershell
npm.cmd run typecheck    # clean
npm.cmd run test:unit    # 1033 tests, 1022 pass, 9 fail, 2 skipped (456.9s)
npm.cmd run build:vite   # built
npm.cmd run build:lab    # built
```

Against the **1037 / 1026 / 9 / 2 baseline re-derived in this lane before the
first edit** — not taken on trust from the handoff, which happened to be right —
the **failure SET is byte-identical**, compared by full test title: the same
nine pre-existing failures, four in `builderlivetransport.test.js` and five in
`buildertrackedtext.test.js`. Not one baseline failure disappeared either, which
would have meant a check had been masked rather than kept.

Net **−4 tests**: seven removed with `lantern.test.ts`, three added (the token
re-pointing guard, the disposition-ink guard inherited from that file, and the
shared-provenance guard). `dist-unit/` needed a manual deletion for exactly one
file — `tsc` leaves the compiled artifact of a deleted test behind, and
`node --test dist-unit/tests-unit/*.test.js` would have gone on running the
stale copy against rules that no longer exist.

**The lab was swept rather than trusted.** `lab/chatmock.tsx` and
`lab/builderproposal.tsx` both import `app.css`, and `chatmock-view.tsx` is the
consumer Slice 2 was caught by. Checked: the lab renders **zero** classes from
the moved family — only `.bubble`, `.chat-composer` and the unscoped `.pill`
base, none of which this slice touched — and `build:lab` succeeds.

**`c12` — targeted E2E under the exact mutex protocol.** Both token locations
(`%TEMP%\cairn-app-token` and `app/.app-token`) were absent, acquired with
`mkdir`, ownership tracked per location, and released in a `trap` that also
covers the launch — verified free after every run. One invocation per scenario
group, `workers: 1`, `--output=test-results/task267-runner`.

| Scenario | Result |
|---|---|
| `contrast.spec.ts` (both scenarios, incl. `c7`) | **2 passed** |
| `evidence.spec.ts` (both scenarios) | **2 passed** |
| conductor · the envelope posts a DONE result card | **passed** |
| conductor · a dispatched run lives in the conversation | **passed** |
| conductor · a stopped run posts an honest STOPPED card | **passed** |
| conductor · a DONE card offers the push chip | **passed** |
| conductor · a refused push reports the real reason | **passed** |
| conductor · a stopped run never evaluates the push chip | **passed** |
| conductor · a fresh confirmed dispatch … with reduced motion | **passed** |
| conductor · a live reply belongs to its project and reattaches | **passed** |
| conductor · a reload mid-run reattaches the strip | **failed — pre-existing** |

**The failure is checkably not mine.** It was run before the first edit, three
times, and failed identically then: the strip never reaches `DONE —` after a
mid-run reload and stays at the `Check` stage. Its baseline is recorded in this
task's own pre-edit E2E capture.

**The Windows worker-teardown `EPERM` is real and was hit**, at
`fixtures/isolated-profile.ts:46`, with no assertion error of its own. Every
failure inside a batch was rerun **alone** with `--reporter=list` before it was
believed — which is how four genuine assertion failures were separated from the
teardown noise, and how the run-strip 820 px regression above was found.

**`c13` — no dependency, no external action, no crossed risk boundary. PASS.**
No install, provider or model call, credential, paid call, network beyond
loopback and `file://`, external-service write, publication or deployment. Every
conductor in every run was the local fixture or the mock; the isolated profile
makes the owner's stored connection unreachable from a test.

**`c14` — records and Git protection. PASS.** The brief was committed alone
(`28b46d0`) to claim the number. The completion commit stages only this task's
exact paths, by name. Nothing was cleaned, stashed, reset, broadly staged or
history-rewritten. `git log` was re-read immediately before each write to a
shared path; `main` did not move during this task.

**`c15` — owner gate 3. NOT ANSWERED, and it is not mine to answer.** See
"Limitations".

## Dispositions for every old test that moved

- **`lantern.test.ts` — REPLACED, and deleted.** All seven of its tests were
  about `.chat-column.chat-column-villager`, the retired panel this slice
  deleted. Each was given an equivalent **before** the file was removed, and
  every equivalent was green first: *warm lit paper* → the conversation's paper
  from `--rp-paper`; *one soft spill, no drop* → `--rp-shadow-paper`, asserted
  as the token rather than an rgb() triple so it is theme-stable; *re-points the
  paired tokens* → a new test that also asserts the selector no longer carries
  the deleted class, because that re-pointing is now the ONLY one and is what
  keeps unmigrated surfaces on paper; *no tail* → asserted on both the old and
  the new selector; *lands then holds still* and *reduced motion wins* → the
  entrance is retired outright, and the replacement asserts `animation`,
  `transform`, `transition`, `backdrop-filter` and `mask-image` are each turned
  off **by name** rather than left unset; *each receipt disposition word keeps
  its approved colour* → moved to `resultreceipt.test.ts`, re-pointed from the
  pond's aliases to the constitution's inks. The compiled artifact was removed
  from `dist-unit/` too — left behind, the stale copy keeps running.
- **`continuousspace.test.ts` — REPLACED (seven tests) plus one ADDED.** Its
  whole "surface" half read the retired panel out of `app.css`. It reads
  `workspace.css`'s real surface now. One premise is genuinely retired and says
  so instead of being reworded into something that passes: *the surface reads
  the pond through itself* is gone, because there is no pond; what replaces it
  is the stronger guard, that each retired property is cancelled by name. The
  `@supports not (backdrop-filter…)` fallback is asserted **removed** rather
  than assumed gone.
- **`resultreceipt.test.ts` — REWRITTEN (four), plus two ADDED.** Task 188's
  contract is intact. Three changes are named in the file: the registration mark
  is a `border-left`, the shadow is `--rp-shadow-low` rather than `none`, and
  the disposition marks bind to SHAPE rather than to exact pixel widths. Added:
  the disposition-ink test inherited from `lantern.test.ts`, and a test that the
  receipt's request rows wear the **one shared** provenance rule set — which is
  what makes Slice 6's instruction checkable rather than a claim.
- **`runpaper.test.ts` — REWRITTEN (five).** Four differences named: a 3 px
  registration mark in `--rp-teal`; a 2 px running ring rather than 1.5 px,
  because a sub-pixel border rounds inconsistently between themes; the 44 px
  target floor; and the constitution's focus ring. Its compact assertion was
  rewritten a second time after the 760 px regression above, and now asserts
  **both** that the actions are contained and that they do **not** restack at a
  supported width.
- **`pushpaper.test.ts` — REWRITTEN (six).** Task 193's contract is intact. The
  chip and the actions are at 44 px; the mark is a `border-left`; the actions
  are dressed by the one shared skin; the outcome's three state marks are
  asserted to **differ from one another**; the compact rules are at 820 px.
- **`evidencepresentation.test.ts` — REWRITTEN (one) and one QUIET GUARD
  REPAIRED.** The repair is the one the handoff predicted: line 109 took two
  bare `indexOf` results and asserted only a NEGATIVE over the slice between
  them, so either marker moving yielded `slice(-1, -1)` → `""`, which contains
  no animation and passes while reading nothing. **Slice 7 moved one of those
  markers**, which is exactly the event it would have failed to notice. Both
  ends now assert they were found, the slice asserts a plausible size, and a
  positive control asserts the region really carries the rules it audits. The
  rewritten test also asserts the portal split in **both** directions.
- **`conductor.spec.ts` — REWRITTEN, five computed-style pins across two
  scenarios.** Two focus rings (2 px at 3 px → the constitution's 3 px at 2 px —
  the ring got THICKER, which is the direction that matters for 1.4.11), the
  push chip's radius and practical target, and the checkpoint's radius and
  shadow. The shadow assertion is **theme-stable**: the colour is stripped
  before comparison, because `--rp-shadow-low` is a cool ink at 10% in Light and
  black at 30% in Dark, and pinning the whole computed string would make the
  scenario depend on the machine's theme.
- **`contrast.spec.ts` — REWRITTEN by widening, not by adding**, for the third
  slice running. It drives the proposal through set-aside, Review and the
  offline demonstration to a DONE receipt, opens both provenance disclosures,
  runs the `c7` control-skin check, asserts the receipt and strip do not travel,
  and then runs the identical sweep over all of it.
- **`papersignal.test.ts` (three), `newhorizons.test.ts` (one),
  `conversationpaper.test.ts` (one), `dispatchpaper.test.ts` (one),
  `followuppaper.test.ts` (one), `questionpaper.test.ts` (one) — RE-POINTED.**
  Each named the retired scope, or sliced `app.css`/`motion.css` at a marker
  this slice moved. Two carry real content changes with reasons:
  `newhorizons.test.ts` is REWRITTEN because the primary action's identity moved
  from the pond's cyan to the constitution's teal pair, and
  `conversationpaper.test.ts` is REWRITTEN because the arrival opt-out list grew
  by the three names `chat-arrive` still slid and scaled. `dispatchpaper.test.ts`
  needed a new ordering marker, because Slice 6's repaired guard correctly went
  RED when the rule it pinned was deleted — the repair working as designed.
- **`newhorizons.test.ts` also had a helper HOISTED**: `surfaceRule` was declared
  inside one test and a second test now needs it. Same body, module scope.
- **Preserved, unedited and green:** `visualtokens.test.ts`,
  `deskcomposition.test.ts`, `taskreviewpaper.test.ts`,
  `qualitypreviewpaper.test.ts`, `criticcallpaper.test.ts`,
  `repaircallpaper.test.ts`, `harnessrevisionpaper.test.ts`,
  `unsealedcandidatepaper.test.ts`, `builderproposalreview.test.ts`,
  `taskblock.test.ts`, `setaside.test.ts`, `resultcard.test.ts`,
  `activitypresentation.test.ts`, `activitycapsule.test.ts`.

## How to try it

```powershell
cd "C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework\app"
npm start
```

Open a project, connect Cairn, and ask for something concrete — "please change
the page title" will do it. Set the concern aside, press **Review**, then **Run
offline demonstration**.

The receipt arrives as one sheet of paper with a rule down its left edge, teal
because the run is DONE. The disposition is a word with a filled disc beside it;
a stopped run gets a bar and an amber rule, an error a doubled outline and a
coral one — turn the screen greyscale and the three are still three. *What Cairn
checked* is open. *Run details* says **CHECKED BY CAIRN** in its own summary
line; *Builder's account* says **REPORTED, NOT CHECKED**; *Original request*
says **REFERENCE, NOT A VERIFIED RESULT**. Open them and the unverified material
sits behind its own rule, so it still reads as a quotation rather than as
Cairn's finding.

Tab through any of it: the focus ring is the same 3 px ring everywhere, and
every control is at least 44 × 44 — including *Stop this task*, which used to be
a 20 px text link. Narrow the window past 820 px and the same components get
less room; nothing is dropped.

The captures are in **`app/shots/task267/`**.

## Limitations and remaining judgment

- **Owner gate 3 is not answered.** No owner has seen this. The plan asks for one
  complete request → pushback → proposal → approval → working → DONE → evidence
  → commentary route on the owner's screen, and for the owner to confirm it
  reads as one Cairn conversation. The 36 captures are the thing to judge from,
  and each finding is a small isolated change.
- **TaskRun was NOT migrated, and this is the one named part of the slice that
  is not done.** The plan lists `TaskRun.tsx` among Slice 7's paths and Slice 6
  expected this slice to remove the six components' duplicated unscoped rules
  when it did. It is not blocked, but it is a different job from the one this
  task finished, and it cannot be done cheaply: those six components' rules are
  anchored on `.rp-conversation`, and TaskRun is a separate screen that is not a
  conversation. Making them reach it needs either a second anchor on roughly 150
  selector entries, or an `:is()` prelude — which `visualtokens.test.ts`'s
  requirement that every selector *begin* with `.rp-` would reject. That is a
  decision about the anchor guard, which is a boundary, and improvising it at
  the end of this task would have been the wrong way to make it. **TaskRun is
  visually unchanged by this task**, and the ~41 unscoped rules that serve it
  stay in `app.css`. It wants its own task with its own captures.
- **The worst measured contrast in the conversation moved from 5.47:1 to
  4.77:1**, on the disclosure provenance label. It clears the 4.5 floor, it is
  measured every run, and it is the first thing to look at if anything reads
  faint.
- **A STOPPED and an ERROR receipt are not in the captures.** Their rules are
  asserted against the stylesheet and the STOPPED route passes in
  `conductor.spec.ts`, but the offline demonstration always succeeds, so the
  harness cannot photograph them.
- **`conductor.spec.ts`'s mid-run reload reattachment is red for a reason older
  than this slice**, baselined before the first edit and diagnosed above.
- **`builder-proposal-conversation.spec.ts` remains red** for the reason Task
  263 diagnosed (`TASK232_SELECTION_REFUSED` from
  `src/main/builderreviewroutefixture.ts`), and was not re-run here.
- The milestone did not move.

**Disposition: DONE**
