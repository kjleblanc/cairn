# Showing, Not Asking — Design

**Status:** proposed 2026-08-02; revised the same day after Task 168 landed at
`d776558`. Sits on top of the Task 167 Ripple Pond direction and the Task 168
live-Town port, both complete. Nothing here loosens an approval, a
verification, or a risk boundary.

Every choice below was taken by the owner during one design conversation on
2026-08-02: which kind of picture to show, how long to keep them, how to
signal uncertainty, the card's shape, how much Cairn explains itself, how warm
Cairn should be, the release of visual preservation, the chosen visual
direction, the pastel palette, still-by-default water, and the New Horizons
treatment. Owner choices are marked **Owner decision** where they appear. The
nine numbered Decisions are the design that follows from them.

**This spec yields four implementation plans, not one.** See "Order of work".
Each step is independently shippable and independently reviewable, which is
the point: the owner has to review this work, and bundling it would make that
harder.

## Where this comes from

The owner's words, in order:

> "I am also asked a lot to run commands and tests to check for changes that
> could simply be presented to me via screenshot or video."

> "I feel often I am taken too literally, when I am answering or responding to
> questions on things I don't know the answer to or am knowledgeable on."

> "container vs snapshot.. empirical half.. these are alien terms to me."

Three complaints, one cause. Cairn asks the owner to supply what Cairn could
establish itself, then writes the answer down as though it were certain, in
words the owner cannot check. The fix is not to ask less and assume more. It
is to **verify more and show the result**, and to be honest in the record about
where every requirement came from.

The repository already contains most of what this needs.

- `app/shots/` holds 54 screenshots going back to Task 130, beside a
  `manifest.json` that already carries `{task, title, caption, shots:[{file,
  label}]}` — plain-language captions, written per task, for the owner.
  `.gitignore` excludes the whole directory, and nothing in the app links to
  it. The owner has never seen any of them.
- **The capture code is written fresh each task and deleted with it.** Task 168
  carried a `captureTask168` helper, gated on `process.env.TASK168_CAPTURE_SIZE`,
  that captured six real app states at two window sizes. It produced all twelve
  `task-168-*.png` files, and then **never entered the commit** — `d776558`
  contains no screenshot call in `conductor.spec.ts`. The only survivor
  anywhere in the suite is a single hand-placed line at
  `app/tests/projects.spec.ts:307`. The pictures persist; the mechanism that
  made them is rebuilt and thrown away every time. That waste is the clearest
  argument for Decision 4.
- Task 167's report records the gap plainly: "Automated browser screenshot
  capture was unavailable in this environment, so it was not claimed."
- `app/playwright.config.ts` sets no `screenshot`, `video`, or `trace` option.
  Capture is hand-rolled per task and named after that task's number.

The work is therefore mostly **delivery**, not construction.

## The fixed reference: what must not move

- **Git remains the ledger.** `core/src/serial.ts` verifies a run with
  `git status --porcelain`, an exact staged-path match with nothing else
  changed or untracked, ancestry, and a single-commit count; a mismatch closes
  `MODEL_RESULT_NOT_VERIFIED`. Pictures are added evidence. They never become
  an alternative source of truth, and a run that fails Git verification is not
  rescued by a screenshot that looks correct.
- **The claim/verified split is load-bearing.** `core/src/records.ts` divides
  every card into `verifiedByCairnLines()` and "The worker's account (claims,
  not verified by Cairn)". A picture Cairn captured is evidence and belongs on
  the verified side. **A worker-supplied image is a claim and must never be
  rendered as evidence.** This extends an existing rule rather than inventing
  one: Task 048 took record duties away from the worker so Cairn authors the
  report and log row from claims plus its own Git verification, and Task 052's
  owned-records gate exists precisely to catch a worker pre-writing a record
  path it does not own (`core/src/serial.ts:739` names a forged log row as the
  threat). Evidence capture must not reopen that door.
- **Motion may only replay what happened.** Task 168's rule holds for pictures
  too: a capture may record a state the run actually reached. It may never
  manufacture, anticipate, or stage one.
- **Every risk boundary keeps its pause.** Task 085 settled this: "Consent is
  the gate, not the safety." Cairn deciding *more* never means Cairn approving
  more. Installing software, spending money, sending data, deleting, and
  publishing all still stop for the owner's approval of that exact action.
- **Visual preservation is released — deliberately, by the owner, on
  2026-08-02.** Every prior brief carried a preserve-the-visuals boundary;
  Task 168's went as far as `faces.ts` byte-for-byte. The owner has now said:
  *"No prior visuals should be regarded as should be preserved."* Face
  geometry, colors, layout, and the conversation panel are all open.

  **This release covers appearance only.** It does not touch a single item
  above it in this list. Git remains the ledger, the claim/verified split
  stays load-bearing, a capture may still only replay an event that actually
  happened, and every risk boundary keeps its pause. A redesign may change how
  a verified DONE *looks*; it may never change what earns one. If a visual
  change would require softening one of those, the visual change is wrong.
- **Task 168's presentation reducer is the arbiter of "an event happened".**
  `app/src/renderer/town/presentation.ts` already turns append-only runtime
  evidence into one-time keyed cues (`${runKey}:${index}:dispatch`), escalates
  monotonically, and guarantees that repeated polls do not replay motion and
  that stale timers are inert. Evidence capture **subscribes to that, and does
  not invent a second notion of when something occurred.** Two independent
  answers to "did this happen?" would eventually disagree, and the picture
  would be the one that lied.

## Decision 1 — A finished job answers three questions, not two

The card gains a third section. In owner-facing wording:

| Section | Holds | Status |
|---|---|---|
| What Cairn checked | Files, tests, **and now pictures** | exists; extended |
| What the worker says it did | The worker's own account | unchanged |
| What you asked for | Each requirement, marked by where it came from | new |

The third section is what fixes being taken too literally. Today a value the
owner specified, a value the owner guessed at, and a value Cairn chose are
indistinguishable once written down, so everything downstream builds on a
shrug as though it were a requirement.

## Decision 2 — The card leads with the picture; the album holds the rest

**Owner decision:** before-and-after leads the card, with a browsable album
behind it.

- The evidence section sits **first**, above the text, showing a before/after
  pair at full width with one plain sentence under each.
- One control opens the album: every capture from this job, and every past
  job's captures, in one place.
- A job with no captures shows no evidence section rather than an empty one.
  Absence is honest; a placeholder is not.

The section's presence is decided by **whether captures exist for that run**,
not by a judgment about whether the change "looks visible". That keeps the
rule concrete: no captures, no section, and no implementer left guessing what
counts as visible.

## Decision 3 — Pictures always; a clip only when the change is about motion

**Owner decision:** stills on every job, video only when movement is the point.

- Stills are the default and the baseline.
- A clip is captured only when the outcome concerns motion or a sequence —
  Task 168's packet-and-ripple work is the canonical case, and stills would
  genuinely fail to show it.
- **Cairn decides which applies.** The owner is never asked to choose, because
  that is exactly the kind of question they cannot answer and should not carry.

Clips are large. Restricting them to motion outcomes keeps growth bounded
without a retention rule that would delete the owner's history.

## Decision 4 — Capture becomes standing, not per-task

Task 168's deleted `captureTask168` is the shape to generalise, not to copy —
and it is genuinely deleted, so this is a rebuild from the pattern rather than
a refactor of live code. Capture moves out of a per-task helper and into a
reusable harness fixture, keyed by the run rather than by a hard-coded task
number and an env var named after it.

Two seams Task 168 built are reused rather than duplicated:

- **When to capture** comes from `town/presentation.ts`'s keyed one-time cues.
  A capture fires on a cue, so it inherits the guarantee that a repeated poll
  produces no second event.
- **Who the capture belongs to** comes from `app/src/main/workeridentity.ts`,
  which resolves the worker from the adapter that actually won main's route and
  exposes the real-call disclosure seam. Task 168 added it specifically so a
  renderer-owned Boolean could not conjure a fictional villager; the same
  reasoning applies to evidence, and it supplies the run identity Decision 4
  needs to bind a manifest entry to a verified result.

`app/shots/` **stays excluded from the project's history.**

**Owner decision:** keep every job's pictures, browsable, on the machine —
not in the project's permanent history. Images are large and never truly
removable once committed. The existing `.gitignore` entry is therefore correct
as it stands and needs no change.

`manifest.json` becomes the album's index and the card's source. Its current
shape already carries what is needed; it gains the run identity that ties an
entry to a verified result, so the album can never show a picture from one job
under another job's name.

## Decision 5 — Where a requirement came from is recorded and travels

Three markings, in the owner's language:

- **You said so** — supplied by the owner and carried verbatim, as today.
- **You weren't sure** — the owner offered it but hedged. A starting point,
  not a rule.
- **Cairn chose** — decided by Cairn; the owner was never asked.

The marking is set two ways, both of which the owner chose:

1. **An explicit answer.** "I'm not sure — you decide" is offered among the
   answers whenever Cairn asks the owner a question, so deferring is never
   awkward.
2. **Cairn noticing.** When a reply hedges — "maybe 300?", "whatever you
   reckon" — Cairn says so out loud rather than deciding silently, so a
   misread is correctable in one turn.

**Owner decision:** Cairn names its choice briefly and does not explain its
reasoning. "No problem — I'll take that one off your plate. Going with 300."

The marking must reach the worker's brief. A worker that can see "the owner
specified this" against "Cairn chose this; the owner had no preference" treats
the two differently, which is the whole point.

## Decision 6 — "Never invent values" gains a boundary, not an exception

The current constitution says: *"Anything the owner supplies that the task
needs — numbers, names, exact wording — goes into details verbatim; if it does
not fit, ask. Never invent values."*

That rule exists because a worker once dropped the owner's word counts and
substituted its own (Task 055). Read literally it also forbids Decision 5.
The two must be reconciled explicitly, or an implementer will pick one and
silently break the other.

**The boundary is attribution, not choice.** Cairn may *choose* a value when
the owner hands it the decision, and must mark it as its own. Cairn may never
*attribute* a value to the owner that the owner did not give. Choosing is
permitted; putting words in the owner's mouth is not. Task 055's failure was
attribution, and stays forbidden.

## Decision 7 — Cairn's warmth lives in rhythm, not catchphrases

**Owner decision:** warmer than today, in the middle register.

The owner's stated aesthetic is Animal Crossing crossed with Ghost in the
Shell — friendly, responsive dialogue against serious colour and crisp system
detail. This design applies that split directly: **the conversation is Animal
Crossing; the record underneath is Ghost in the Shell.** The owner can be
casual precisely because the machinery is strict.

Warmth is delivered through sentence rhythm — short delighted sentences,
noticing things, being glad the owner is here — and **not** through
catchphrases, verbal tics, or pet names. The reason is mechanical rather than
aesthetic: v3's existing rule requires cheer to step aside when something is
wrong, risky, or STOPPED. Rhythm can go quiet and leave Cairn recognisable. A
catchphrase cannot: drop it for bad news and the character seems to have gone
cold, keep it and an unverified result reads to a beginner as a shrug. The one
signal that must land is the one it costs.

That rule stays exactly as written, and stays load-bearing.

## Decision 8 — Plain language extends past chat, and gets scored

The constitution already says *"Plain words; when a technical term is genuinely
needed, explain it in passing once."* Two gaps:

1. It governs **chat only**. The jargon the owner actually hits lives in task
   briefs, reports, and result cards. Two examples were found by looking at
   Task 168's own captures rather than by reasoning about it:

   - `task-168-stopped-desktop.png` shows a result card reading
     **"STOPPED — CANCELLED_BY_OWNER"**. That is a raw machine constant,
     shown to a beginner, in the exact place the constitution's plain-words
     rule does not reach. The sentence beside it — "The worker didn't leave a
     readable summary of what it did" — shows the standard is achievable.
   - `task-168-done-desktop.png` shows Cairn's own status line reading
     **"brain disconnected"**. It means no conductor is connected. To someone
     new it reads as something being wrong with Cairn.

   Neither is a Task 168 defect; both predate it and sit outside its boundary.
   They are recorded here because they are the failure this decision exists to
   catch, found in the wild, in captures the owner had never been shown.
2. **Nothing scores it.** The other three honesty rules are exercised by
   `docs/superpowers/evals/conductor-v0.md`; this one is a courtesy that slips
   whenever anyone forgets.

The rule extends to every artifact the owner reads, and gains eval scenarios
alongside the existing ten, with the same written pass/fail bars and the same
`constitution` column.

## Decision 9 — The visual language: Lantern on Water

Four directions were built and independently checked; the owner chose one and
then corrected it twice. The result is settled and recorded here rather than
left to whoever implements it.

**The direction is "Lantern on Water".** The conversation is a warm, softly lit
lantern resting on dark water — light spills from it onto the pond instead of
covering the pond. It replaces the current panel, which is a large bright white
rectangle occupying roughly a third of the screen and fighting the whole scene.

Five rules follow from the owner's corrections:

1. **The cast carries the identity; the furniture does not.** The owner's words
   were that they were *missing the "emoji" Ghost-in-the-Shell AI avatars* and
   that the imagery read *"too sci fi"*. The resolution: the crisp luminous
   face strokes on dark **are** the Ghost in the Shell half. Everything around
   them — panels, menus, buttons, type — goes warm, rounded, and friendly.
   Hairline rules, monospaced type, HUD labels, and crawling data-threads are
   removed. The characters must be large and central, not edge decoration.

2. **Face geometry stays verbatim — now by choice, not by constraint.** The
   preserve-the-visuals boundary was lifted, and the owner then asked for these
   faces back. Every path in the approved mockup was checked against
   `app/src/renderer/town/faces.ts` and matched 20 of 20. Implementation must
   keep that property and test it.

3. **Colours are muted toward pastel.** Cairn `#a3ddd0`, Kimi `#d5c0ec`, Codex
   `#f3c49a`, Claude `#b8c9de`; done `#c2ddb6`, stopped `#f2aaa4`, work in
   transit `#f7d3a8`. These supersede the saturated set. Pastels on a dark
   pond raise contrast rather than lowering it, so this costs no legibility.

4. **Still water is the default; ripples are earned.** At rest the pond is one
   continuous blend — no rings, no drawn contours, no perpetual animation. A
   ripple exists **only** because a real event landed, in the receiver's own
   colour, and then it is gone. This is not new policy: Task 168's brief
   already required that "motion is information… never perpetual decoration."
   **The shipped pond does not yet obey it** and ripples continuously. Bringing
   it into line is part of this work, and is a rule Task 168 stated rather than
   a defect it introduced.

5. **New Horizons treatment on every interactive surface.** Buttons are chunky
   pills with a solid lower edge that compresses on press. Motion uses
   overshoot easing rather than linear ease-out. Menu items stagger in and
   slide on hover. Characters spring when touched. Type is rounded and heavy
   (600–850), never thin. `prefers-reduced-motion` still reaches the same
   final state.

**The narrow window — resolved 2026-08-03, owner-approved.** All four explored
directions failed at 760×620, each differently: content silently clipped, a
responsive rule that never fired at the size it was written for, the premise
vanishing, and a hard-coded width with no responsive rule at all. Four
failures, one cause: **each tried to shrink its wide layout.**

A first attempt kept a reduced pond as a horizontal band. The owner's verdict
was that it *"reads more consolation prize"*, which settled the rule:

> **A line is honest because it is a line. A small pond is dishonest because it
> pretends to be a picture.**

The resolution, approved on the interactive mockup:

- **The pond is never reduced. At any width it is either its whole self or it
  is a sentence.** No in-between exists to feel like a compromise.
- **Below 1260px the conversation is the default and takes the window.** That
  is where the owner acts; the pond is orientation, and orientation is
  something you go and check.
- **A status line sits at the top** carrying who is working and the water's
  state, going amber when a decision waits — reusing Task 155's needs-you
  machinery. Pressing it opens the pond **whole**, over the window; a "back to
  the conversation" control returns.
- **The before/after pair stacks below 1260px**, full width each. This is a
  decision *about Decision 2*, made here so the evidence work does not
  rediscover it — and stacking reads better here than the wide layout's
  side-by-side pair, so narrow is not purely a sacrifice.
- **No new breakpoints.** 1260px and 620px already exist in
  `app/src/renderer/app.css`. Every failed direction invented its own, and
  Terminal Glass's never fired at the size it was written for.
- **Nothing above 1260px changes.** The approved wide layout is untouched.

The recorded fallback, if the toggle proves wrong in the real app: no pond
below 1260px at all, only the line. Worse product, still honest — and
preferable to a half-pond.

One process note worth keeping. Three of the four generated directions asserted
in their own header comments that they had invented no colours — "Nothing
invented", "Every colour is a shipped Cairn token" — and all three had. The
claims were confident, specific, checkable, and false. They were caught by an
independent check, which is the same reason this project separates what Cairn
verified from what a worker claimed.

## Order of work

Design all three together — done here, so the card's shape is settled once —
then build in sequence. Bundling them would make review harder for the one
person who has to do the reviewing, which works against the goal.

**Each step below becomes its own plan and its own claimed task.** They share
this spec so the card's shape is decided once, and nothing else.

**The order changed once, on evidence.** It was originally evidence-first,
because that was the owner's fastest relief. Then all four panel directions
failed at the narrow window. That moved the largest unknown into the panel
work, and unknown risk belongs early, so the panel moved up.

1. **Voice (Decisions 7–8).** First because it is genuinely small — constitution
   text plus eval scenarios — and it compounds: every brief, report, and card
   produced by steps 2 through 4 is written under the improved rule rather than
   retrofitted afterwards.
2. **The panel and the visual language (Decision 9).** Second because it holds
   the only unsolved problem in this spec. Narrow-window behaviour is proven
   hard, and finding out late what a 760×620 window does to a lantern would
   invalidate work built on top of it. It is also the container the next step
   fills, so building the evidence section into a panel about to be replaced
   would be doing it twice.
3. **Evidence (Decisions 1–4).** Third, into a panel already known to hold a
   full-width image pair at both sizes. Most of this already exists —
   the captures, the captioned manifest — so it is largely delivery.
4. **Where answers come from (Decisions 5–6).** Last: the only piece needing
   real judgment about which questions belong to the owner, and by then its
   effects can be looked at rather than described.

## How we would know it holds

- A finished job with a visible change shows before/after pictures in its card
  without the owner running anything.
- A job with no visible change shows no evidence section, and no placeholder.
- A worker-supplied image never appears on the verified side. A test asserts
  this directly.
- A capture exists only for a state the run actually reached; a repeated poll
  or re-render never produces a second capture of one event. Task 168's
  `townpresentation.test.ts` already pins that guarantee for motion cues — the
  evidence tests extend the same fixtures rather than starting a parallel set.
- The album opens from a card, shows that job's captures under that job's
  name, and reaches past jobs.
- A hedged answer produces a "you weren't sure" marking, and Cairn says so in
  the same turn.
- The marking reaches the worker's brief with its wording intact.
- Existing suites stay green: `npm.cmd run typecheck`, `test:unit`,
  `build:vite`, `build:lab`, and the Playwright cases.
- `tests-unit/constitution.test.ts` pins the amended sentences verbatim, as it
  pins the current ones.
- New eval scenarios score plain language and the attribution boundary against
  written bars.
- **Every face path still matches `faces.ts` verbatim**, asserted by a test
  rather than by eye. The approved mockup matched 20 of 20; that is the bar.
- **At rest, the pond produces no ripple.** A test observes a quiet session
  across repeated polls and asserts no ripple element is created. A ripple
  appears only against a real landed event, in the receiver's colour.
- **The narrow window is checked first, not last.** Every panel state is
  exercised at 760×620 as well as 1320×820, and the check is that no content
  is clipped, no container is silently overflowed, and no responsive rule
  fails to fire at the size it was written for. All four explored directions
  failed at least one of those.
- `prefers-reduced-motion` reaches the same final state, with no ripple or
  packet animation pending.

## Deliberately out of scope

- **A worker pausing mid-run to ask the owner a question.** No transport
  exists: Task 168's brief records that `RunSessionSnapshot`, the serial
  envelope, and the Town model expose no paused-worker question or answer state,
  and sets it aside as its own capability task. That stays true here. Decision
  5 covers Cairn's questions in conversation, which is where the owner's
  complaint actually lands.
- **Distinct voices for Kimi, Codex, and Claude.** Appealing, and raised by the
  owner, but each needs its own register and its own scoring. Claim separately.
- **Any change to what Cairn may approve.** This spec makes Cairn decide more
  small things and show more evidence. It moves no risk boundary.

- **Distinct personalities beyond appearance.** Decision 9 fixes how the cast
  *looks*. Giving Kimi, Codex, and Claude their own writing voices is the
  separate item above.

## Open for the owner

1. **A new eval run costs real money.** The last one was $0.0283 across ten
   scenarios. Adding scenarios for Decisions 6–8 means a fresh run to score
   them, and paid calls need the owner's explicit go.
2. **Disk growth is real but modest.** 54 stills currently occupy roughly
   22 MB. Stills on every job plus occasional short clips will grow steadily.
   No deletion policy is proposed, because the owner chose to keep everything;
   this is recorded so the decision stays a decision rather than a surprise.
