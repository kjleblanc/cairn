# Task 260 report — the core conversation surface

**Lane:** A (the main checkout), owner-confirmed free before any file was
written. **Base commit:** `258c434`. **Claim commit:** `7c213b6` (brief only).
**Slice:** 5 of 11 in
`docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`.

There is no owner gate at the end of this slice. The next owner judgment is
gate 3, at the end of Slice 7.

## What this slice actually did

Slice 4 put the conversation on the desk and the owner approved that
composition. Its **inside** was still the retired lantern's, re-toned: about
thirty paired tokens re-pointed on the column so that roughly 281 rules written
against `chat-column-villager` would land on warm paper without being rewritten.

This slice rewrote the conversation's own share of those rules against the
constitution's semantics and deleted them from `app.css`. Measured: the string
`chat-column-villager` goes from **305 occurrences to 262**, which is 42 whole
rules plus the composer's and the notes' share of two shared reduced-motion
lists. The other ~237 rules are the decision family (Slice 6) and the result
family (Slice 7).

**The hook stays, and that is not an oversight — it is the schedule.** Those
237 rules still need it. Task 259 proved what removing it early costs: the
dispatch panel silently reverted to a pre-Task-186 card language and
`conductor.spec.ts` caught it. The class comes off at the end of Slice 7, when
the last family has moved. The generic `.pill` skin in `app.css` was left
untouched for the same reason.

## What actually changed

Modified:

- `app/src/renderer/surfaces.css` — 198 lines to 833. The conversation's paper
  language: top bar, transcript, Cairn's prose, the owner's note, the queued
  note, the refusal note, commentary, Markdown and machine evidence, next-step
  notes, the composer, and one compact block at 820 px. **Every selector starts
  at `.rp-conversation`**, so nothing here can reach TaskRun, the Dashboard, an
  overlay, or the standalone chat branch, all of which are still the night
  garden's until their own slice.
- `app/src/renderer/app.css` — 2776 lines to 2692. Six blocks deleted, each
  replaced by a comment naming where it went and why. Nothing was deleted from
  the decision or result families. Four small base rules were **added** for the
  classes that replaced BodyPill's inline styles.
- `app/src/renderer/motion.css` — the transcript's turns no longer travel, and
  the conversation's controls and notes reach the same final state under
  reduced motion.
- `app/src/renderer/screens/Chat.tsx` — nine class strings, one inline style
  removed, three comments. Nothing else. See `c2`.
- `app/src/renderer/components/Md.tsx` — three class strings.
- `app/src/renderer/components/BodyPill.tsx` — four inline styles became classes.
- `app/tests/contrast.spec.ts` — the measuring sweep extracted unchanged, and a
  second scenario that measures the **connected** conversation.
- `app/tests/fixtures/fake-conductor.mjs` — one scripted reply, reachable only
  by an exact phrase, carrying the four things that overflow a conversation.
- `app/tests-unit/conversationpaper.test.ts`, `followuppaper.test.ts`,
  `papersignal.test.ts`, `newhorizons.test.ts`, `continuousspace.test.ts`,
  `resultreceipt.test.ts`, `runpaper.test.ts` — see "Dispositions".

Created: this report, and one LOG row. Deleted: nothing.

Nothing under `core/**`, `cli/**`, `src/main/**`, IPC, preload, stores, the
phone page, package manifests or lockfiles was touched — verified with
`git status` over those paths, and that fact is what settles one of the results
below. No `.cairn` data was read, written or deleted. No registered worktree
was created, deleted, reused, reset or moved.

## Three decisions

**The composer is a tray, not a turn.** The transcript is the record; the place
you write is a tool. It takes `--rp-paper-chrome` — still paper, one shade
deeper than the sheet — so it recedes from the record in both themes without
becoming the desk's cool chrome. Its two actions keep Decision 9's arrangement
(one shared boundary, focus drawn on that boundary) and gain the
constitution's 44 × 44 floor.

**The owner's note keeps its shape and loses its literals.** Task 187's
paper-cut corner and right-hand fill are exactly as they were. What went is the
hard-coded `#fae3c8 → #f3d0a8` gradient with `#453120` ink: three fixed hex
values on a surface that used to be permanently dark, with no dark-theme value
and no ink measured against them. It is `--rp-apricot` / `--rp-apricot-ink` now
— a pair `visualtokens.test.ts` recomputes in both themes.

**Cairn's speaker mark is drawn at full strength.** The retired rule drew it at
44% opacity, and the follow-up rules at 52% and 46%. Those marks *mean*
something — who is speaking, where a suggestion starts — so WCAG 1.4.11 holds
them to 3:1, and a faded mark on warm paper does not clear it. They are
`--rp-teal-ink` at full opacity.

## Two defects found, and both fixed

**A disabled control is still read.** The new connected-contrast sweep found
this on its first run, pointed at a real composer for the first time: Send sits
disabled whenever the box is empty, which is most of the time, and `opacity:
.55` on a teal fill measured **2.45:1** against a 4.5:1 floor. WCAG exempts an
inactive component, so this could have been argued away; it is fixed instead,
because the argument is about the standard and the owner's question is whether
they can read the button. Inactive is now carried by losing the teal fill and
the strong edge rather than by fading the words. Same fix for the queued note's
Take back, the refusal's Try again, the top bar, and a disabled next-step note
(whose ink measured about 2.8:1 at `.5`). Send now measures **5.47:1**.

**A transform was applied to containers holding interactive controls.**
`motion.css`'s `chat-arrive` slides *and scales* every `.bubble`. Three of the
four bubble kinds hold a control — the streaming turn holds Stop, a queued
message holds Take back, a refusal holds Try again — which the constitution
forbids outright, and a scaled container blurs its own text mid-flight on the
one surface whose entire content is text. Inside the conversation a turn now
simply appears. Everywhere the conversation is not keeps Task 126's entrance
until its own slice.

## Checks

Run from `app/`. Every command below is the exact one run.

**`c1` — the conversation's paper language is real, not a re-point. PASS.**
`visualtokens.test.ts` passes unchanged, which is the guard that matters here:
every selector in the three new sheets is still anchored on an `.rp-` class,
`app.css` still declares no `.rp-` selector, production markup still carries
`rp-` classes, tokens are still declared only inside an `.rp-` scope, and the
breakpoint census across those sheets is still exactly `{820, 1260}`.

**That last guard nearly caught me, in the way the handoff warns about.** The
`.rp-` check regexes the whole of `app.css` **including comments**, and my first
draft explained two deletions by naming the class they moved to. Two comments,
no rule, and the file would have gone red. Both are reworded, and both now say
out loud that this file may not name that class in a comment either.

**`c2` — Chat's state machine is unchanged, and it is measured rather than
promised. PASS.** Before any edit, a small harness stripped the VALUE of every
`className=` attribute out of `Chat.tsx`, `Md.tsx` and `BodyPill.tsx` and hashed
what was left. Re-run afterwards, the entire diff of that stripped source is:

- three added comments;
- `style={{ marginTop: 8 }}` removed from the streaming turn's control row (it
  is a class now); and
- four `style={{ … }}` attributes removed from `BodyPill` (they are classes now,
  with the identical values in `app.css`).

Not one handler, gate, ref, effect, state initialiser or callback moved.
Connection restore, transcript merging, the stream lifecycle, queued messages
and take-back, pending actions, task attachment, result recovery, retry, stop,
new conversation and focus settlement are byte-identical. The pre-edit digests
were `aa3898fd…` / `17ccbac2…` / `5bb3ae8f…`.

**`c3` — Cairn open on paper, the owner in quieter apricot, machine evidence
bounded. PASS.** Cairn's prose carries no fill, no outline and no second avatar
— one short teal stroke in the margin — at 17 px, 1.6 line height and a 68 `ch`
measure, taken from `.rp-prose`, the material Slice 3 declared and nothing
consumed. Owner turns take `.rp-note-owner`. Machine evidence takes
`.rp-machine` and `.rp-scroll-x`, asserted in `conversationpaper.test.ts` and
measured in the running app under `c6`.

**`c4` — exactly one Cairn, and no face beside a historical turn. PASS.**
`deskcomposition.test.ts` passes unchanged: `resolveCairnPresence` is called
exactly once in the whole renderer and exactly one production component draws
Cairn. This slice added no `<CairnProgram>`.

**`c5` — native composer semantics, keyboard, and target size. PASS.** The
textarea is still a textarea, New and Send are still native buttons with their
exact disabled gates and accessible names, and the live regions are unchanged in
number, politeness and node identity. Measured in the running app, by
**tabbing** rather than by `.focus()` — a programmatic focus sets `:focus` but
never `:focus-visible`, so testing that way measures a ring users never see:

```powershell
node ./node_modules/@playwright/test/cli.js test tests/contrast.spec.ts --output=test-results/task260-runner
```

New and Send each report `{ style: "solid", width: "3px", offset: "2px" }`,
Shift+Tab walks back to the textarea so nothing is a one-way trap, and every
`button`, `input`, `textarea` and `select` inside `.rp-conversation` clears
44 × 44 from its real bounding box. **The first version of that walk failed
honestly**: it could not reach Send, because Send is disabled while the box is
empty and a disabled control is correctly skipped by the tab order. It types an
unsent draft first, then clears it so the sweep still measures the disabled
state.

**`c6` — long Markdown, paths and code contain themselves. PASS.** One scripted
fixture reply carries all four things that overflow a conversation at once: an
absolute Windows path in inline code, a fenced command far wider than the
measure, a table, and a 100-character unbroken token. Measured in the running
app at 1320 × 980: the page does not scroll sideways, the paper does not widen,
the fenced block's `overflow-x` is `auto` **and it really is wider than its
frame** (asserted, so "contained" cannot be true merely because nothing
overflowed), and the table's wrapper scrolls inside itself. Seen at all three
sizes in the captures under `c9`.

**`c7` — nothing moves that the owner did not cause. PASS.** No `infinite`
anywhere in the new rules. The transcript's turns carry no animation at all
(see "Two defects"). The next-step notes keep Task 194's single finite
staggered arrival, which still lives on the unscoped rule in `app.css` — the
scoped rule is asserted NOT to declare an animation, so it cannot silently
outrank it. Under `prefers-reduced-motion`, the conductor scenario
*a fresh confirmed dispatch reaches the same stable written state with reduced
motion* passes.

**`c8` — measured contrast, on the CONNECTED conversation. PASS, and it closed
the gap Task 259 recorded.**

```powershell
node ./node_modules/@playwright/test/cli.js test tests/contrast.spec.ts --output=test-results/task260-runner
# contrast (disconnected desk): 19 elements measured, worst 6.06:1 (floor 4.5) on "← Project home"
# contrast (connected conversation): 22 elements measured, worst 5.47:1 (floor 4.5) on "Send"
```

The second scenario is new. Task 259 wrote down that this file "has never
measured a Cairn turn, an owner note or a composer" because its lane runs with
no conductor, and that reaching one needs a connected conductor fixture. It now
connects the same local fake `conductor.spec.ts` uses, by the same visible route
an owner takes to a custom provider — no real provider, no credential of the
owner's, no paid call, nothing off the machine, and the stored connection lands
in the throwaway profile `isolated-profile.ts` installs, which
`conductor-connection.ts` refuses to resolve a path outside.

The disconnected sweep's worst case improved from Task 259's 5.50:1 to 6.06:1
because `← Project home` is drawn in the measured teal ink now. **The
disconnected sweep deliberately keeps its ORIGINAL element list**; only the
connected one adds `code`, `td`, `th` and `li`, so this slice cannot turn an
unmigrated surface red merely by widening what the check looks at.

**What it still does not reach:** the decision surfaces. Driving a proposal into
the sweep is possible now that it connects, but the task card, the dispatch
panel and the question card are Slice 6's to redraw, and measuring them here
would have made this task's disposition depend on another slice's surface.
Slice 6 should widen this scenario rather than write a third.

**`c9` — the surface, seen. PASS.** Thirty captures of the real built app in
`app/shots/task260/`: five states — disconnected, connected and empty, a plain
exchange, machine evidence, and a proposal on the paper — each at 1320 × 980,
the supported minimum 760 × 620, and the test-only 540 × 900 stress, in explicit
Light and Dark. They live in `shots/` and not `test-results/` for the reason
Task 259 found the hard way.

**`c10` — dispositions.** Below, in their own section.

**`c11` — the app compiles, builds and tests as it did. PASS.**

```powershell
npm.cmd run typecheck    # clean
npm.cmd run test:unit    # 1036 tests, 1025 pass, 9 fail, 2 skipped
npm.cmd run build:vite   # built
npm.cmd run build:lab    # built
node --test dist-unit/tests-unit/residentprogramboard.test.js          # 22/22
node --test tests-qualification/resident-program-bundle-dark.test.mjs  # 3/3
node --test tests-qualification/builder-proposal-bundle-dark.test.mjs  # 1/1
```

Against the 1034 / 1023 / 9 / 2 baseline — re-derived in this lane before any
edit, not taken on trust from the handoff — the **failure SET is byte-identical**:
the same nine pre-existing failures, four in `builderlivetransport.test.js` and
five in `buildertrackedtext.test.js`, compared by full test title. Net +2 tests
from the two rewritten suites.

**`c12` — targeted E2E under the exact mutex protocol. PASS, one rerun.** Both
token locations (`%TEMP%\cairn-app-token` and `app/.app-token`) were absent,
created by these runs, recorded, and released at the end — only the two each run
created. One invocation per scenario, `workers: 1`,
`--output=test-results/task260-runner`.

| Scenario | Result |
|---|---|
| `contrast.spec.ts` (both) | **2 passed** |
| conductor · New and Send share one narrow Cairn composer | **passed** |
| conductor · a message sent while a reply streams queues and flushes | **passed** |
| conductor · a message sent while the comment streams waits visibly | **passed** |
| conductor · private commentary settles into contained paper next steps | **passed** |
| conductor · a 401 shows only the plain-words key message | **passed** |
| conductor · a live reply belongs to its project and reattaches | **passed** |
| conductor · stopping a reply after reattachment shows the partial turn once | **passed** |
| conductor · a conversation persists across a relaunch | **passed** |
| conductor · navigating back mid-stream releases the lock | **passed** |
| conductor · a dispatched run lives in the conversation | **passed** |
| conductor · reduced motion reaches the same stable written state | **passed on rerun** |
| conductor · a waiting decision is announced in words | **passed** |
| conductor · a compact paper question keeps Answer and defer honest | **passed** |
| conductor · a reload mid-run reattaches | **still failing**, the documented pre-existing symptom |

The reduced-motion rerun: its first attempt hit the Windows worker-teardown
`EPERM` on the profile directory **and** a 60 s test timeout under a loaded
machine. Run alone it passes in 5.8 s. That is hazard 7 in the handoff, hit in
the batch it warns about.

The reload scenario fails exactly as documented — `.run-strip` stuck showing
`Check` while the assertion waits for `DONE —`. Unchanged by this task.

**A pre-existing red nobody had seen, found and diagnosed, not fixed.**
`evidence.spec.ts` fails at its first scenario, inside its own
`connectAndRestore` helper (`evidence.spec.ts:190`): `expect(connected.ok)`
receives `false` in about 900 ms. Task 259 recorded this suite as "not run to
completion" and left it as a gap; this task ran it. **It is not a regression from
this slice**, and that is checkable rather than asserted:

- `git status` shows this task modified no file under `src/main`, `src/shared`,
  `core/` or `cli/` — the entire path `conductorConnect` runs through.
- `git log -1 -- app/tests/evidence.spec.ts` is `9fe6703`, Task 189, 2026-08-06.
  Since then the connect path changed nine times, including Task 201 "store
  model connection authority" and Task 206 "add headless catalog and sticky
  Auto".
- The spec's `fakeProvider` answers *every* request with an SSE chat completion
  and serves no catalog endpoint.

It is out of Slice 5's scope and it is recorded here as a gap, with a separate
task suggested for it. `q9.spec.ts` was not run: it exceeded a ten-minute shell
limit during Task 259 and nothing in this slice touches its surfaces.

**`c13` — no dependency, no external action. PASS.** No install, provider or
model call, credential, paid call, network beyond loopback, external-service
write, push, publication or deployment. Every conductor in every run was the
local fixture or the mock; no owner credential was read, and the isolated
profile makes the owner's stored connection unreachable from a test.

**`c14` — records and Git protection. PASS.** Brief committed alone at
`7c213b6`; the completion commit stages only this task's exact paths, by name.
Nothing cleaned, stashed, reset, broadly staged or rewritten.

**The untracked evidence under `app/test-results/` survived, and that is
measured.** All 24 pre-existing files were hashed before the first Playwright
run and every one is present and byte-identical afterwards —
`task229-builder-proposal-review.png` is still 696,088 bytes with SHA-256
`C692EC68…FBEA69`, and `task255-board` still holds its 19 captures.

## Dispositions for every old test that moved

- **`conversationpaper.test.ts` — Rewritten (bubbles) and Preserved (proposal).**
  Task 187's shape assertions all survive, re-pointed to `surfaces.css`: the
  owner's flat clipped memo with no glow, Cairn's unboxed prose with one short
  registration stroke, and no decorative motion on either. Added: the note must
  no longer decide its own colour (a `background:` or `color:` in that rule
  would put a colour decision outside the layer `visualtokens.test.ts`
  measures), the retired peach literals must be gone from both sheets, the
  speaker mark must not be faded, the refusal note must carry a rule as well as
  a colour, and machine evidence must be bounded. **The task-card half is
  untouched** — that is Slice 6's surface.
- **`followuppaper.test.ts` — Rewritten.** Every behavioural assertion is
  verbatim: the native group and its accessible name, the heading and hint, the
  ordered native buttons, focus returning to writing on an accepted send and to
  the exact note on a refusal, no `autoFocus`, and commentary's note never
  becoming a live region. The CSS assertions moved to `surfaces.css` and gained
  three: the marks may not be faded, the scoped note may not declare its own
  animation (which would outrank the staggered one), and no breakpoint below the
  supported minimum may return.
- **`papersignal.test.ts` — Rewritten in part.** Task 186's contract is
  unchanged and still asserted — the composer is one field with a single
  boundary and its actions are flat inside it — read from `surfaces.css`, plus
  the new 44 × 44 floor and Send's teal pair. The composer left the "one shared
  paper grain" list because the new system's single shared texture is
  `--rp-grain`, not `--paper-grain`; the other four surfaces still hold that
  contract. Its reduced-motion test now checks both files, because the
  composer's kill had to move to `motion.css`.
- **`newhorizons.test.ts` — Repointed.** Decision 9's rules are unchanged. The
  suggestion's restrained slide is read from `surfaces.css`; the stagger, the
  `backwards` fill and the unscoped reduced-motion block are still read from
  `app.css`, because that is still where they live. The composer's markup match
  became a **prefix** match on the class list — an exact-attribute match would
  simply have stopped finding the element, which is a test going quiet rather
  than a test passing. The unscoped rules are still checked, for the standalone
  chat branch Slice 8 owns.
- **`continuousspace.test.ts` — Repointed.** Task 197's "these approved surfaces
  were not deleted" list keeps the result card and now names the composer's new
  home instead of its old one, so the guard still means what it said.
- **`resultreceipt.test.ts` — Preserved.** One end marker re-pointed: it sliced
  the Task 188 receipt block up to the scoped composer rule, which moved. The
  boundary is Task 186's control skin now. No assertion changed.
- **`runpaper.test.ts` — Preserved.** One marker widened to a class-list prefix,
  with an added `assert.notEqual(composer, -1)`. The old exact match would have
  returned `-1`, which compares as "before the connection gate" and would have
  **passed while proving nothing**.
- **`visualtokens.test.ts`, `deskcomposition.test.ts`, `questionpaper.test.ts`,
  `dispatchpaper.test.ts`, `taskreviewpaper.test.ts`, `pushpaper.test.ts`,
  `resultcard.test.ts`, `evidencepresentation.test.ts`, `lantern.test.ts` —
  Preserved, unedited, and green.**

## How to try it

```powershell
cd "C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework\app"
npm start
```

Open a project and connect Cairn. Your own messages are warm apricot notes on
the right with one clipped corner; Cairn answers as open prose on the paper with
a short teal stroke in the margin and no box around it. Ask for something with a
command or a file path in the answer and watch the mono block scroll inside its
own frame rather than stretching the page. Narrow the window past 820 px and the
same components get less room — nothing is dropped but the project name and the
activity detail. The captures are in `app/shots/task260/`.

## Limitations and remaining judgment

- **The decision and result surfaces are still the retired lantern's,
  re-toned.** The task card, the dispatch panel, the question card, the result
  receipt, the run strip and the publication checkpoint all still hang off
  `chat-column-villager`. That is Slices 6 and 7, and the class comes off at the
  end of Slice 7, not before.
- **The connected contrast sweep does not reach those surfaces.** It could, now
  that it connects — Slice 6 should widen this scenario rather than write a
  third. In the `05-with-proposal` captures the proposal's primary control still
  looks low-contrast to my eye and is unmeasured, which is the same observation
  Task 259 recorded.
- **`evidence.spec.ts` is red for a reason older than this overhaul**, diagnosed
  above and not fixed here. `q9.spec.ts` was not run.
- **One E2E scenario stays red** (`a reload mid-run reattaches`), with the
  documented pre-existing symptom, and the Windows worker-teardown `EPERM`
  remains intermittent.
- **No owner has seen this yet.** There is no gate at the end of Slice 5, and
  taste is the owner's. If the composer's tray, the apricot weight or the
  measure read wrong, that is a change to make before gate 3, and the captures
  are there to judge from.
- The milestone did not move.

Slice 6 was not begun in this conversation. The handoff has been refreshed
for it.

**Disposition: DONE**
