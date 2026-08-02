# Showing, Not Asking — Design

**Status:** proposed 2026-08-02. Sits on top of the Task 167 Ripple Pond
direction and the Task 168 live-Town port, which is in flight and untouched by
this spec. Nothing here loosens an approval, a verification, or a risk
boundary.

Six decisions were taken by the owner during the design conversation — the
kind of picture to show, how long to keep them, how to signal uncertainty, the
card's shape, how much Cairn explains itself, and how warm Cairn should be.
They are marked **Owner decision** where they appear. The eight numbered
Decisions below are the design that follows from them.

**This spec yields three implementation plans, not one.** See "Order of work".
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
- `app/tests/conductor.spec.ts:920` (`captureTask168`) already captures six
  real app states at two window sizes, gated on `process.env.TASK168_CAPTURE_SIZE`.
  All twelve files exist on disk right now.
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
- **The shipped cast is untouched.** `app/src/renderer/town/faces.ts` stays
  byte-for-byte, including Cairn `#7fd8c8`, Kimi `#c9a7e8`, Codex `#f2a35c`,
  Claude `#9fb8d8`.
- **Task 168 finishes first.** It has uncommitted work in the tree. This spec
  changes nothing it touches and must land after it.

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

`captureTask168` is the shape to generalise, not to copy. Capture moves out of
one spec's helper and into a reusable harness fixture, keyed by the task being
run rather than by a hard-coded task number and an env var named after it.

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
   briefs, reports, and result cards.
2. **Nothing scores it.** The other three honesty rules are exercised by
   `docs/superpowers/evals/conductor-v0.md`; this one is a courtesy that slips
   whenever anyone forgets.

The rule extends to every artifact the owner reads, and gains eval scenarios
alongside the existing ten, with the same written pass/fail bars and the same
`constitution` column.

## Order of work

Design all three together — done here, so the card's shape is settled once —
then build in sequence. Bundling them would make review harder for the one
person who has to do the reviewing, which works against the goal.

**Each step below becomes its own plan and its own claimed task.** They share
this spec so the card's shape is decided once, and nothing else.

1. **Evidence (Decisions 1–4).** Highest relief, most of it already built, and
   it upgrades the owner's ability to review everything after it by letting
   them look instead of read.
2. **Voice (Decisions 7–8).** Small, and it improves every brief and report
   read during step 3.
3. **Where answers come from (Decisions 5–6).** Last: the only piece needing
   real judgment about which questions are the owner's, and by then its effects
   can be seen rather than described.

## How we would know it holds

- A finished job with a visible change shows before/after pictures in its card
  without the owner running anything.
- A job with no visible change shows no evidence section, and no placeholder.
- A worker-supplied image never appears on the verified side. A test asserts
  this directly.
- A capture exists only for a state the run actually reached; a repeated poll
  or re-render never produces a second capture of one event.
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

## Open for the owner

1. **A new eval run costs real money.** The last one was $0.0283 across ten
   scenarios. Adding scenarios for Decisions 6–8 means a fresh run to score
   them, and paid calls need the owner's explicit go.
2. **Disk growth is real but modest.** 54 stills currently occupy roughly
   22 MB. Stills on every job plus occasional short clips will grow steadily.
   No deletion policy is proposed, because the owner chose to keep everything;
   this is recorded so the decision stays a decision rather than a surprise.
