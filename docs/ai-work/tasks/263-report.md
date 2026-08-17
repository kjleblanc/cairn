# Task 263 report — questions, proposals, approvals and the operational papers

**Lane:** A (the main checkout), owner-confirmed free. **Base commit:** `6b6295a`.
**HEAD when the CSS began:** `ae15cae`. **Slice:** 6 of 11 in
`docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`.

There is no owner gate at the end of this slice. The next owner judgment is
gate 3, at the end of Slice 7.

## What this slice actually did

Slice 5 rewrote the conversation's own share of the retired lantern's rules and
deleted them from `app.css`, leaving the decision family and the result family
still hanging off `chat-column-villager`. This slice took the decision family.

Measured: `chat-column-villager` goes from **262 occurrences to 167** — exactly
the **95 selector-list entries** the read-only audit predicted, being the 88
hooked rules plus the two reduced-motion kills plus the shared lists they sat
in. `app.css` goes from 2692 lines to 2393; `surfaces.css` from 833 to 1846;
`motion.css` from 209 to 251.

**The hook stays**, exactly as it did after Slice 5, because the result family
still needs it. It comes off at the end of Slice 7.

## Three things the handoff got wrong, found before any edit

**1. The handoff's thirteen baseline digests are not reproducible.** The handoff
reproduces a `behaviour-digest.mjs` verbatim and gives thirteen digests to check
against. Re-created faithfully, that script produces **thirteen different
values**, with no overlap at all between the two sets. Fourteen candidate shapes
were tried across three trees — raw bytes, CRLF and LF normalisation, `latin1`,
stripping `style=` as well, prefixing the label or the relative path,
trailing-whitespace stripping, and no stripping — and none reproduces either the
pre- or post-repair value the handoff records for `HarnessRevision.tsx`.

**The tree itself is provably correct, by a stronger check than a hash table.**
`git hash-object` on the working file equals the `HEAD` blob, `HEAD` equals
`7f093f8` for that path (`git log 7f093f8..HEAD -- app/src/renderer/components/`
is empty), a byte comparison of the working file against `git show 7f093f8:…`
returns equal, and the double-encoded arrow is gone. Git is content-addressed;
that is the "nothing moved before I started" evidence this task used, and the
`pre` capture from my own harness is the `c2` baseline. **Do not trust that
table in a future session** — it and the script it ships with disagree.

**2. The Builder proposal review is not lab-only in the sense the brief implies.**
The brief and the plan both describe it as lab-only with no production consumer.
`Chat.tsx` renders `<BuilderProposalReview>` at **lines 2167 and 2214**. What is
true — and what Task 229's contract actually says — is that it takes no
callback, offers no action and carries no authority; that is intact and this
slice added no consumer. But it renders inside the conversation, so leaving it
in the retired language would have looked broken beside its restyled siblings.
It got `.rp-conversation`-anchored rules like the other shared surfaces.

**3. The blast radius is wider than the handoff's test map again.** The handoff
correctly warned that `evidencepresentation.test.ts` would be missed by a scoped
grep. It did not warn that **`conductor.spec.ts` carries Task 187/191/192
appearance pins** — **ten of them, across four scenarios**, in seven kinds:
computed `border-radius`, `box-shadow`, mono `font-weight`, the concern's
`border-left-width`, an `opacity: 0.68` on a disabled control, a focus-ring
geometry, a focused-heading mechanism, and the registration mark read off a
`::before`. None is findable by grepping for a selector: they are
`getComputedStyle` reads in the running app, and the first batch buried them
under Windows teardown noise. They are listed under Dispositions.

## What actually changed

Modified:

- `app/src/renderer/surfaces.css` — 833 lines to 1846. The decision family's
  paper language: one shared sheet, one heading, one shared intent-row rule set,
  the routed disclosure ledger, the question's response field, the operational
  ledgers, the Builder review, one action skin, and one compact block at 820 px.
  **Every selector starts at `.rp-conversation`.**
- `app/src/renderer/app.css` — 2692 lines to 2393. Three blocks deleted, each
  replaced by a comment that names what went and why **without naming the class
  it went to**, because `visualtokens.test.ts` regexes this file including its
  comments.
- `app/src/renderer/motion.css` — `chat-arrive` no longer slides and scales
  `.task-card` inside the conversation, and the decision family's controls reach
  the same end state under reduced motion.
- `app/lab/builderproposal.css` — Task 229's lab page restyled onto the warm
  desk. The pinned 5 px left border stays 5 px.
- `app/tests/contrast.spec.ts` — the connected scenario widened to drive a
  proposal onto the paper before it measures.
- `app/tests/conductor.spec.ts`, `app/tests-unit/conversationpaper.test.ts`,
  `questionpaper.test.ts`, `dispatchpaper.test.ts`, `repaircallpaper.test.ts`,
  `runpaper.test.ts` — see Dispositions.

Created: this report, and one LOG row. Deleted: nothing.

**No component was touched at all.** Not one `.tsx` file is in the diff — this
turned out to be a pure stylesheet migration, which is what makes `c2` a zero
rather than an argument.

Nothing under `core/**`, `cli/**`, `src/main/**`, IPC, preload, stores, the phone
page, package manifests or lockfiles — verified with `git status` over those
paths, and that fact is what settles one of the results below. No `.cairn` data
read, written or deleted. No registered worktree created, deleted, reused, reset
or moved.

## Decisions

**One sheet, one rule, one hierarchy.** Every decision surface is a raised paper
sheet with a registration rule down its left edge, and the rule's colour is the
surface's semantic: teal for a routine decision, the attention ink for a
proposal carrying a concern, a waiting run, or an unapplied Builder proposal.
Colour never carries it alone — every one of these cards states its condition in
its own heading.

**The registration mark became a real border.** The retired language drew it as
an absolutely positioned 2 px `::before`. A `border-left` is the same signal
with no positioned box to contain, and it is already the vocabulary
`.rp-note-attention` and `.rp-note-stop` use.

**The grain rides under the children, not over them.** These are paper surfaces
and the constitution asks for one shared texture on all of them, but the
`.rp-paper*` material classes draw it with an absolutely positioned `::after` —
which would paint over the contents of a card that holds interactive controls,
tinting the teal fill of every primary action and moving a contrast pairing that
is measured elsewhere. The grain is on the element's own background instead, at
`soft-light`, exactly as the retired cards drew it. Only the outer sheet is
grained; five grains would read as five textures.

**One intent-row rule set.** It is used flat by the dispatch checkpoint and the
operational papers, with the proposal's filled variation as an override. The
result receipt's near-identical copy in `app.css` was deliberately **not**
touched: its rules sit at (0,3,0) and outrank this (0,2,0) one, so the receipt
looks exactly as it did. **Slice 7 should delete its copy in favour of the
shared one rather than porting it.**

## Three defects found and fixed

**Two disabled controls were still being read through a fade.** The proposal's
Review at `opacity: .68` and the question's answer input at `opacity: .5`, with
the question's actions also *transitioning* opacity. This is the same defect
Slice 5 measured at 2.45:1 on the composer's Send: `opacity` fades a label and
its ground together. Inactive is carried by losing the teal fill and the strong
edge now. `conductor.spec.ts` had the `.68` **pinned as correct**, which is why
it is a Rewritten disposition rather than a quiet edit.

**A transform on a container holding interactive controls.** `chat-arrive` still
slid *and scaled* `.task-card`, which holds Review and a Set aside on every
concern row — forbidden by the constitution outright, and the scale blurred the
outcome sentence, the one line the owner has to read before deciding. Inside the
conversation the proposal now simply appears.

**One I introduced and the guard caught.** Excising the Task 192 block took
`.chat-column-villager .bubble-active-question-only { display: none; }` with it,
and I had not re-added it. `Chat.tsx` still renders that class, so an empty
Cairn prose row would have appeared above every active question.
`questionpaper.test.ts` went red on it. It is in `surfaces.css` now.

**And one the FULL suite caught that a targeted run had hidden.** Restoring the
paper grain split the sheet's `background:` shorthand into `background-color:`
plus `background-image:`, so three test files needed re-pointing — and I did it
with a repository-wide `sed`, which is exactly the wrong tool. It also rewrote
an assertion about the question card's answer INPUT, a control that takes the
colour on its own and still uses the shorthand. That test had passed when run on
its own earlier in the task, because the run predated the grain change; only
`npm.cmd run test:unit` over everything showed it, as a **tenth** failure
against the nine-failure baseline. Fixed, and the suite re-run from scratch
rather than the one file re-checked — a targeted green is what hid it in the
first place.

## Checks

Run from `app/`. Every command below is the exact one run.

**`c1` — the decision family's own rules leave the hook. PASS.**

```powershell
node --test dist-unit/tests-unit/visualtokens.test.js   # 17/17
```

All four boundary guards pass unchanged: every selector in the three new sheets
is anchored on an `.rp-` class, `app.css` declares no `.rp-` selector **in a
rule or a comment** (`grep -c "rp-" app.css` is **0**), production markup carries
`rp-` classes, tokens are declared only inside an `.rp-` scope, and the
breakpoint census across those sheets is still exactly `{820, 1260}`. The eight
rules that sat behind `max-width: 620px` are at 820 px.

**`c2` — every component's behaviour is unchanged, measured. PASS, and it is a
zero.** The harness stripped the VALUE of every `className` out of all thirteen
components and hashed the rest before the first edit; re-run afterwards, the
entire diff is:

```text
=== 1. digests that MOVED ===
  none
=== 2. the exact non-className change in each ===
=== 3. LITERALS gained or lost ===
```

Nothing at all. No component file is in the diff, so no callback, gate, ref,
effect, busy flag or focus move could have moved, and none of the **558
literals** under watch across those thirteen files (472 distinct, counted from
this task's own capture rather than taken from the handoff) changed. That watch
exists because several of them look like class names and are not: `"stop-task"`,
`"approve-revision"` and `"continue-without-critic"` are action ids the main
process matches on, `"owner-stated"` / `"owner-unsure"` / `"cairn-chosen"` are
intent-source data, `"not-met"` / `"cant-tell"` / `"waiting-owner"` are status
values, and `"replacement-proposal"` / `"capability-request"` are discriminants.
A restyle that fat-fingered one would change what the product does.

**`c3` — one hierarchy, and nothing reads as already acted on. PASS, with one
honest exception.** Asserted in `conversationpaper.test.ts` ("every decision
surface ends in its actions, and none is filled like a settled one"): every
heading is the strongest ink on its surface at weight 700, the action row is
last and carries a rule above it, no surface takes a success or verified ground,
and the unapplied Builder proposal carries the attention rule rather than the
routine teal one. Seen in the captures under `c9`.

**The exception, not papered over:** `TaskCard.tsx` renders its actions row
BEFORE its `<details>` fold, so on that one surface "details on demand" sits
after "actions" in the DOM. Reordering it would change the KEYBOARD ORDER of a
live approval surface, and this slice's boundary of intent keeps focus movement
and native semantics exactly as they are. It belongs to a task that can carry
its own keyboard evidence.

**`c4` — Task 229's contract holds. PASS.**

```powershell
node ./node_modules/@playwright/test/cli.js test --config playwright.builderproposal.config.ts
# 1 passed (7.2s)
```

With the lab card restyled, the qualification still measures `borderLeftWidth`
exactly `"5px"`, **zero** elements inside the card matching its long interactive
selector list, nothing focusable, no navigation, no new page, no network
request, and no horizontal overflow at 1280 or 600. No `role=`, no SVG mark and
no `<details>` fold was added — the change is presentation on existing class
names. `builderproposalreview.test.ts` passes unedited, including its three CSS
assertions and its production-consumer allowlist.

**`c5` — native controls, keyboard, and target size. PASS.** Native semantics and
accessible names are unchanged because no component changed. Focus is measured
by **tabbing** in the running app, from real computed styles, and every
interactive target inside `.rp-conversation` clears 44 × 44 from its real
bounding box with the proposal on screen. The question card's actions were
pinned at `min-height: 40px`, below the constitution's floor; **raising them to
44 px is a Rewritten disposition with its reason stated**, in both
`questionpaper.test.ts` and `conductor.spec.ts`.

**`c8` — measured contrast, with the decision surfaces finally under it. PASS,
and it closes the gap Tasks 259 and 260 both recorded.**

```powershell
node ./node_modules/@playwright/test/cli.js test tests/contrast.spec.ts --output=test-results/task263-runner
# contrast (disconnected desk): 19 elements measured, worst 6.06:1 (floor 4.5) on "← Project home"
# contrast (connected conversation): 36 elements measured, worst 5.47:1 (floor 4.5) on "Outcome"
```

The connected sweep went from Task 260's **22 elements to 36** because it now
drives a proposal onto the paper before measuring — the folio, its concern row,
its attributed request rows behind an opened fold, and its **disabled** primary
control, which is the state the retired rule faded to `.68`. Worst case is
unchanged at 5.47:1 against a 4.5 floor. The disconnected sweep keeps its
original element list and is untouched at 6.06:1.

**`c9` — every semantic state, seen. PASS, with two states it cannot reach.**
**Forty-two captures** of the real built app in **`app/shots/task263/`** — seven
states, each at 1320 × 980, the supported minimum 760 × 620, and the test-only
540 × 900 stress, in explicit Light and Dark:

`01-connection-consent`, `02-question`, `03-question-answered` (an unsent draft
in the field), `04-proposal-with-concern` (the attention rule, the concern row,
and Review gated), `05-proposal-details-open` (the attributed request rows),
`06-proposal-risk-free` (the rule back to teal, Review live), and
`07-dispatch-checkpoint`.

They live in `shots/` and not `test-results/`, for the reason Task 259 found the
hard way.

**The brief said `app/shots/task261/`.** That path is a leftover from before the
two renumbers — AGENTS.md says a renumber rewrites a task's heading and not its
body, which is why the stale path survived. The captures are under `task263`,
and the Playwright output went to `test-results/task263-runner` rather than the
brief's `task261-runner`, for the same reason: 261 is a consumed number holding
another session's superseded claim, and writing this task's evidence there would
be actively misleading.

**Two states are not captured, and neither is a harness gap.** The routed
disclosure ledger and the one-call approval do not exist under `CAIRN_MOCK` —
the offline checkpoint deliberately carries neither, which `conductor.spec.ts`
asserts directly — and reaching the real ones is a paid worker call, outside
this task's boundary. A critic/repair/harness pause and the Builder review need
the Q9 and Task 232 fixtures, and the Task 232 route is the one that is
pre-existing-red. All four have their rules asserted against the stylesheet.

**The capture harness was temporary and is deleted**, exactly as Slice 5 did: a
spec left in `tests/` joins every future Playwright sweep. It was
`app/tests/task263-captures.spec.ts`, it imported `test` from
`./fixtures/isolated-profile` and scaffolded with core's `initProject`, and it
drove the seven states above through the local fake conductor.

**Two mistakes in that harness are worth recording, because both are traps.**
Its first draft imported `test` from `@playwright/test` directly, which bypasses
the `isolatedProfile` fixture — so `CAIRN_TEST_USER_DATA` was unset and Electron
launched against **the owner's real Cairn profile**. It wedged on boot in
precisely the way `isolated-profile.ts`'s own comment describes (the
remembered-projects scan outrunning the renderer's poll) and was killed before
it reached the connect card. **Nothing of the owner's was written** — verified
against `%APPDATA%\Cairn`, where the only file touched was Electron's transient
`DevToolsActivePort` and `projects.json` is hours older than the run — but the
next version of that draft would have stored a fixture conductor connection
there. Its second draft scaffolded a project by writing three files by hand,
which the app does not recognise as a project; the scaffold must come from
core's own `initProject`.

**`c6` — long disclosure, long model, path and outcome text contain themselves.
PASS.** Measured in the running app rather than argued from the stylesheet. At
1320 × 980 the connected sweep asserts the page does not scroll sideways and the
paper does not widen with a proposal, its concern and its opened detail rows on
screen. At the **test-only 540 × 900 stress**, `a compact paper question` reads
`element.scrollWidth - element.clientWidth` as `0`, asserts the card sits inside
the messages column, asserts every control's box is inside the card's, and
asserts the long question actually WRAPS — so "contained" cannot be true merely
because nothing was long. The set-aside scenario polls the same containment for
the proposal's controls. Seen at all three sizes in the captures under `c9`.

**`c7` — nothing moves that the owner did not cause. PASS.** No `infinite`
anywhere in `surfaces.css`, `workspace.css` or `cairn-program.css`. The two in
`motion.css` are `.town-face-holo` and `.town-skyglow` — retired Town components
unmounted since Slice 4, Slice 10's to delete, and not rendered. The Slice 6
block declares **no** `@keyframes` and **no** `animation:` at all; its single
`transition` is on the action skin, and every one of those is killed at the end
of `motion.css` under `prefers-reduced-motion`. The proposal's arrival transform
is gone — asserted three ways: in the stylesheet
(`conversationpaper.test.ts`), in `motion.css`'s text, and **in the running
app**, where `contrast.spec.ts` reads the proposal's computed `animationName` as
`none` and its computed `transform` as none. The conductor scenario *a fresh
confirmed dispatch reaches the same stable written state with reduced motion*
passes.

**`c10` — a disposition for every old visual test that moved.** Below, in its
own section. Seven files moved; three quiet guards were repaired.

**`c11` — the app compiles, builds and tests as it did. PASS.**

```powershell
npm.cmd run typecheck    # clean
npm.cmd run test:unit    # 1037 tests, 1026 pass, 9 fail, 2 skipped
npm.cmd run build:vite   # built
npm.cmd run build:lab    # built
node --test dist-unit/tests-unit/residentprogramboard.test.js          # 22/22
node --test tests-qualification/resident-program-bundle-dark.test.mjs  # 3/3
node --test tests-qualification/builder-proposal-bundle-dark.test.mjs  # 1/1
node ./node_modules/@playwright/test/cli.js test --config playwright.builderproposal.config.ts  # 1 passed
```

Against the **1036 / 1025 / 9 / 2 baseline re-derived in this lane before the
first edit** — not taken on trust from the handoff — the **failure SET is
byte-identical**, compared by full test title: the same nine pre-existing
failures, four in `builderlivetransport.test.js` and five in
`buildertrackedtext.test.js`. Net **+1 test**, the `c3` hierarchy test added to
`conversationpaper.test.ts`; every other file was rewritten in place at the same
count. `dist-unit/` needed no removal: the only file deleted was the temporary
capture spec under `tests/`, which `tsconfig.unit.json` never compiled. All four
qualifications were re-run against the FINAL tree after the last edit, not just
the tree they first passed on.

**`c12` — targeted E2E under the exact mutex protocol. 7 of 8 pass; the eighth
is pre-existing.** Both token locations were absent, acquired with `mkdir`,
ownership recorded per location, and released in a `trap` that also covers the
launch — verified free afterwards, including after a run I killed mid-flight.
One invocation per scenario, `workers: 1`, `--output=test-results/task263-runner`.

| Scenario | Result |
|---|---|
| `contrast.spec.ts` (both scenarios) | **2 passed** |
| conductor · a fresh confirmed dispatch reaches the same stable written state with reduced motion | **passed** |
| conductor · a compact paper question keeps exact Answer and defer decisions honest | **passed** |
| conductor · a waiting decision is announced in words | **passed** |
| conductor · a dispatched run lives in the conversation | **passed** |
| conductor · one compact proposal carries its complete details through a set-aside replacement | **passed** |
| conductor · dispatch preview accepts only the current risk-free proposal | **passed** |
| `builder-proposal-conversation.spec.ts` | **failed — pre-existing** |

**The eighth is checkably not mine.** It fails with `TASK232_SELECTION_REFUSED`,
thrown at `src/main/builderreviewroutefixture.ts:22` when
`captureBuilderTrackedTextSelection` / `builderTrackedTextSelectionStillExact`
in `buildertrackedtext.ts` refuse. That is the **same module carrying five of
the nine documented pre-existing unit failures**, it was last touched at
`fab1403` (Task 232, 2026-08-14), the throw happens in the main process before
anything renders, and `git status` shows this task modified no file under
`src/main`, `src/shared`, `core/` or `cli/`.

**The Windows worker-teardown `EPERM` is real and was hit.** The first batch
reported five failures; every one was `rmSync` at `isolated-profile.ts:46` with
**no assertion error at all**, and the handoff's hazard 4 says exactly that a
failure inside a batch is not evidence until rerun alone. Rerun alone, reduced
motion passed in 7.5 s. The other four turned out to carry real assertion
failures underneath the teardown noise, which is why they were investigated
one at a time rather than dismissed.

**`c14` — records and Git protection. PASS.** The brief was committed alongside
the byte-exact restoration of the other session's Task 261 brief and nothing
else (`6b6295a`). The completion commit stages only this task's exact paths, by
name. Nothing was cleaned, stashed, reset, broadly staged or rewritten, and the
erroneous 261 claim stays in the log. `git log` was re-read immediately before
each write to a shared path; `main` did not move during this task.

**The untracked evidence under `test-results/` survived, and that is measured.**
`task229-builder-proposal-review.png` was hashed before the first Playwright run
and is present and byte-identical after the last one — still 522,095 bytes,
SHA-256 prefix `9cbc0aa741dec1ba`. A full copy of the directory was taken before
the first run regardless.

**Playwright cleared its own directories anyway, exactly as Task 259 recorded.**
`--output=test-results/task263-runner` places this task's artifacts there, but a
later run under a different config removed every `task2*` output directory in
`test-results/` — including this task's own. The loose `task229` PNG survived
because it is a stray file rather than a run directory. That is the reason the
`c9` captures were written to `app/shots/`, which nothing clears, and it is why
nothing this task needed to keep was left under `test-results/`.
(`.last-run.json` is Playwright's own state file, rewritten by every run and not
protected work.)

**`c13` — no dependency, no external action. PASS.** No install, provider or
model call, credential, paid call, network beyond loopback, external-service
write, push, publication or deployment. Every conductor in every run was the
local fixture or the mock; no owner credential was read, and the isolated
profile makes the owner's stored connection unreachable from a test.

## Dispositions for every old test that moved

- **`conversationpaper.test.ts` — Rewritten (the proposal), Preserved (the two
  voices), plus one test ADDED.** Slice 5 deliberately left the proposal half
  pointing at `app.css`, because the task card was Slice 6's surface; this slice
  moved the rules, so the guard moved with them. Task 187's ideas are all still
  asserted — one folio rather than an enclosing glass card, a concern as a
  margin note, a label that does not compete with its outcome, details behind a
  native disclosure with visible focus, no decorative travel — against
  `surfaces.css` and the measured tokens. Three changes are named in the file so
  they are not mistaken for drift: the registration mark is a `border-left`, the
  shadow is `--rp-shadow-low` rather than `none`, and disabled Review no longer
  fades. **Added:** the `c3` hierarchy test.
- **`questionpaper.test.ts` — Rewritten, and one dead guard repaired.** Task
  192's contract is intact and still asserted. Three changes are named: the
  44 px floor (it pinned `min-height: 40px`, below the constitution's floor),
  the disabled input no longer fading from `opacity: .5`, and the actions no
  longer transitioning opacity. **The repair:** `the late compact cascade` used
  `css.lastIndexOf(".chat-column-villager .question-card,")` — with a trailing
  comma — as its ordering marker. That string had **zero** occurrences in
  `app.css` on `main`, so `lastIndexOf` returned `-1`, `taskStart > -1` was
  vacuously true, and the assertion had been proving nothing since it was
  written. Every marker in the file asserts it was found now.
- **`dispatchpaper.test.ts` — Rewritten (five tests), Preserved (one), and one
  quiet guard repaired.** `the shared disclosure keeps every byte` still reads
  `app.css` and is **unedited**: `DisclosureConfirm` mounts on TaskRun too, and
  its unscoped rules stay there until Slice 7. **The repair:** `the final
  compact cascade` pinned the whole one-line declaration
  `.chat-column-villager .route-facts { grid-template-columns: repeat(3, 1fr); }`
  as an ordering marker — live, but silent the moment that rule was reformatted
  or moved, and a `-1` compares as "before everything" and passes.
- **`runpaper.test.ts` — Preserved, one end marker re-pointed.** Task 189's
  slice ended at Task 191's opening comment, which this slice deleted. It ends
  at the note left in its place, and both ends assert they were found. **No
  assertion changed.** It went RED rather than quiet, which is the right
  failure.
- **`repaircallpaper.test.ts` — Preserved, one quiet guard repaired.** Its
  custody slice was taken from bare `indexOf` results and carries only
  `doesNotMatch` assertions, so a renamed marker yields an empty string that
  satisfies every one of them. All three markers assert they were found, and a
  positive control asserts the slice really does carry fields.
- **`conductor.spec.ts` — Rewritten, ten computed-style pins across four scenarios.** Listed in
  "Three things the handoff got wrong" above. Every one is a Task 187/191/192
  appearance pin read from the running app rather than from a stylesheet, so no
  selector grep would have found them. Each carries its reason in the file. Two
  further improvements were made while they were open: every shadow assertion is
  now **theme-stable** (`--rp-shadow-low` is a cool ink at 10% in Light and
  black at 30% in Dark, so pinning the whole computed string made those
  scenarios depend on the machine's theme), and the provenance-colour assertion
  no longer pins an `rgb()` triple from a `light-dark()` palette — it asserts
  that attribution is distinguished from the role beside it, and the token
  itself is named in the unit test.
- **`contrast.spec.ts` — Rewritten by widening, not by adding.** Task 260 said
  Slice 6 should widen its connected scenario rather than write a third. It
  drives a proposal onto the paper, opens its details fold, asserts the gated
  control really is disabled, and asserts the proposal neither animates nor sits
  under a transform — then runs the identical sweep over it.
- **Preserved, unedited and green:** `visualtokens.test.ts`,
  `builderproposalreview.test.ts`, `criticcallpaper.test.ts`,
  `taskreviewpaper.test.ts`, `qualitypreviewpaper.test.ts`,
  `harnessrevisionpaper.test.ts`, `unsealedcandidatepaper.test.ts`,
  `taskblock.test.ts`, `setaside.test.ts`, `resultreceipt.test.ts`,
  `evidencepresentation.test.ts`, `papersignal.test.ts`, `newhorizons.test.ts`,
  `continuousspace.test.ts`, `followuppaper.test.ts`.

  Two of those deserve a note, because the handoff predicted they would break
  and they did not. `evidencepresentation.test.ts` carries eight assertions on
  these class families **unscoped**, and `resultreceipt.test.ts` reads one
  `.result-card-request-body .task-intent-row` — both still pass, because this
  slice deleted only the `chat-column-villager`-scoped rules and left every
  unscoped rule in place. That is the same fact that keeps TaskRun looking
  exactly as it did.

## How to try it

```powershell
cd "C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework\app"
npm start
```

Open a project and connect Cairn, then ask for something concrete — "please
change the page title" will do it. The proposal arrives as one sheet of paper
with a rule down its left edge; because it carries a concern, that rule is drawn
in the warm attention ink and the heading says **One thing needs your call**.
Review is greyed but still readable — that is the fix, not a bug. Set the
concern aside and the rule turns teal, the heading becomes **Ready to review**,
and Review comes alive. Open **Details** to see what Cairn thinks you asked for,
each row tagged with who decided it. Press Review and the dispatch checkpoint
uses the same paper, the same heading weight and the same action row.

Tab through any of it: the focus ring is the same 3 px ring everywhere, and
every control is at least 44 × 44. Narrow the window past 820 px and the same
components get less room — the ledger rows stack, the actions left-align, and
nothing is dropped.

The captures are in `app/shots/task263/`.

## Limitations and remaining judgment

- **No owner has seen this.** There is no gate at the end of Slice 6 and taste is
  the owner's. Gate 3 is at the end of Slice 7. If the radius, the shadow depth,
  the grain strength or the amber/teal split read wrong, the captures are there
  to judge from and each is a small isolated change.
- **`TaskCard` renders its actions before its details fold**, so on that one
  surface the hierarchy's "details on demand, then actions" is inverted in the
  DOM. Not reordered here, because that changes the keyboard order of a live
  approval surface and this slice's boundary keeps focus movement as it is.
- **The routed disclosure ledger and the one-call approval are not in the
  captures.** Under `CAIRN_MOCK` the checkpoint is the offline demonstration,
  which deliberately carries neither; reaching the real ones needs a paid worker
  route. Their rules are asserted against the stylesheet instead.
- **A critic pause, a repair pause, a harness revision and the Builder review
  are not in the captures either.** They need the Q9 and Task 232 fixtures, and
  the Task 232 route is the one that is pre-existing-red. Their rules are
  asserted in `surfaces.css` and their components' own suites are green.
- **Six surfaces now have duplicated rules**, scoped for the conversation and
  unscoped for TaskRun. That is forced by the anchor guard, not chosen, and
  Slice 7 removes the duplication when it migrates TaskRun.
- **Slice 7 must delete the result receipt's intent-row copy** rather than
  porting it. The shared rule set is already written and the receipt's copy
  outranks it only by specificity.
- **`builder-proposal-conversation.spec.ts` is red for a reason older than this
  slice**, diagnosed above and not fixed here.
- The milestone did not move.

**Disposition: DONE**
