# The Owner's Verdict — Design

**Status:** proposed 2026-08-07. Sits on top of the shipped evidence work
(Tasks 173 and 188) and the followups channel (Task 157). Nothing here loosens
an approval, a verification, or a risk boundary. Nothing here lets the owner's
judgment move a stone, a disposition, or a milestone.

**Who decided what.** This spec marks its own sources using the three markings
the showing-not-asking spec defines, because it would be absurd for a document
about recording the owner's judgment to be vague about whose judgment it
records.

| Marking | What it means here |
|---|---|
| **Owner decision** | The owner chose it explicitly, from stated options, on 2026-08-07. |
| **Owner accepted a recommendation** | Cairn recommended; the owner agreed rather than choosing independently. |
| **Cairn chose** | The owner handed the decision over. Cairn decided and marks it as its own. |

Four choices are the owner's outright: what the evidence is a picture of
(Decision 1), what a verdict may do (Decision 2), the rubric (Decision 3), and
where the owner sits to write it (Decision 6). Two the owner took on
recommendation: the two-artifact record (Decision 4) and the conductor's
quote-only read (Decision 5). Decision 7 and every sequencing choice below are
Cairn's.

**Then the owner handed over the rest**, in these words: *"I don't know enough
to answer, so I am giving you complete control on these decisions."*
Everything decided after that point is marked **Cairn chose** and is Cairn's
to defend. This follows Decision 6 of the showing-not-asking spec: choosing is
permitted when the owner hands the decision over; **attributing a choice to an
owner who did not make it is not, and no marking below launders one into the
other.**

The delegation covered the design. It did not cover spending money, publishing,
or the decision to build this at all — those remain the owner's, and "Open for
the owner" names them.

**This spec closes at Cairn's own captures.** Photographing the product a
worker actually changed is phase two, by the owner's own sequencing, and needs
its own spec and its own risk review. See "Deliberately out of scope".

## Where this comes from

The owner's words:

> "Whenever testing things, sometimes we create test environments/pages
> explaining what work did, what's next etc with photo or video evidence, as
> well as a pass/fail/revise notes section from the user, all of which gets
> logged."

Read against the repository, that request splits cleanly in two, and the halves
are in very different states.

**The showing half is built.** `ResultCardView` renders `ResultEvidence` as the
first section of a result card, above the verified facts
(`app/src/renderer/screens/Chat.tsx:345`). Captures fire at two run boundaries
through `webContents.capturePage`, and land outside the project at
`userData/evidence/<projectHash>/<runId>/` precisely so a `workspace-write`
worker cannot author its own evidence (`app/src/main/evidence.ts:131,183`).
"What's next" is built too: one conductor commentary turn chains after every
posted card (`app/src/main/tasks.ts:452`) and its followups are granted to
commentary turns only (`app/src/main/conductor/service.ts:966`), rendering as
"Where we could go next" on the latest turn (`app/src/renderer/screens/Chat.tsx:1679`).

**The responding half does not exist at all.** No spec, plan, type, store, or
IPC call records what the owner thought. This is the only hole.

It is not missing because nobody noticed. It is missing because it is currently
done in prose. Seventeen of 197 task reports mention the owner reviewing,
confirming, approving, or accepting the work. **Two of them quote what the owner
actually said** — *"The owner reviewed the refreshed safe-stream, wide,
keyboard-focus, and compact evidence and said 'Looks right. Approved.'"*
(`docs/ai-work/tasks/194-report.md:36`). The verdict already exists. In fifteen
cases out of seventeen it survives only as Cairn's summary of the owner's
judgment, bound to no evidence and answerable to no query; in the remaining
two, as a sentence Cairn still wrote.

Two further facts set the stakes.

- **The owner's judgment is already load-bearing and already unrecorded.**
  `moved` is the worker's claim (`core/src/serial.ts:617`), and stones count
  DONE-plus-YES rows (`core/src/steps.ts:60`). Yet the contract says "Whether a
  milestone truly moved is the owner's call; the log column stays a claim"
  (`AGENTS.md:169`). Those two statements contradict each other today.
- **Cairn's own development ritual is already the thing being asked for,
  manually.** `app/shots/manifest.json` holds thirteen entries shaped
  `{task, title, caption, shots:[{file, label}]}` — a per-task page of prose
  and captioned photographs — viewed at `app/lab/shots.html` and surfaced in
  the app as explicitly untrusted history (`app/src/main/evidence.ts:664,675`).
  Report 197's pictures live at `C:\cairn-board\*.png`, outside the repository
  and outside the evidence store. The ritual exists. It is unstructured,
  gitignored, lab-side, and unqueryable.

## The fixed reference: what must not move

- **Git remains the ledger, and the verdict is not a second one.** A verdict
  never rescues a failed verification and never converts a STOPPED run into a
  DONE one. It records a judgment about a result; it does not produce results.
- **The claim/verified split holds.** A worker-supplied image is a claim and
  never renders as evidence. This spec adds a third kind of statement — the
  owner's judgment — and it must be as hard to forge as the other two.
- **Record authorship stays away from whoever benefits from it.** Task 048 took
  record duties from the worker; Task 052's owned-records gate catches a worker
  pre-writing a path it does not own. A record of the owner's judgment must not
  be authorable by the worker it judges or by the conductor that briefed it.
- **Every risk boundary keeps its pause.** This spec moves none. It adds no
  capability to install, spend, send, delete, or publish.
- **A review is advice.** `AGENTS.md:174` says a review "may suggest a new task,
  and the completed record stands." Decision 2 holds this line rather than
  softening it.

## Decision 1 — Cairn's own record first; the product second

**Owner decision:** both, in that order.

Phase one scores and records a verdict against the captures Cairn already
takes: its own window at the run's boundaries. Phase two adds a capture adapter
that can photograph the product a worker changed, which is what buys per-check
images and motion clips.

The order is not a compromise. Phase one proves the record, the custody, and
the queue end to end against evidence that already exists and costs nothing new
to obtain. Phase two crosses a boundary — launching changed project code —
that the Task 173 plan deliberately refused to cross, and it deserves a risk
review it will not get if it arrives bundled with a schema.

## Decision 2 — The verdict is recorded, and changes nothing

**Owner decision:** recorded only.

The verdict writes no disposition, no `moved`, no stone, no gate. It does not
block the next dispatch. It is a permanent, hash-bound, forgery-proof record
placed beside a sealed one, and **no automated decision consumes it.** The
conductor may read it as context under Decision 5's quote-only terms; reading
is not consuming, and nothing branches on what it finds.

This is consistent with `AGENTS.md:174` as written, and it has a second
property worth naming: **the record shape is designed once and any power can be
built on it later without redesign.** Percy and Applitools both grew their
gates on top of a review field that began as pure record. Because Decision 4
keeps the owner's axis separate from Cairn's, that door stays open without
being walked through.

The cost is stated plainly rather than discovered: a queue the owner must visit,
with nothing making them visit it. Decision 6 carries the two nudges that exist.

## Decision 3 — The rubric is the brief's Checks, and the checks get stable ids

**Owner decision:** score the brief's Checks, one by one.

The rubric already exists and is already declared before work starts, which is
the one thing annotation-queue tools get right and everyone else gets wrong.
120 of 197 briefs carry `## Checks that will show the outcome holds`.

**But it is prose, and it drifts.** Brief 197 promised five checks; report 197
delivered seven, adding an A/B control run and `git diff --check`. Both
numbered lists, neither aligned. Nothing in the repository can say whether all
five promises were answered.

**Cairn chose** the remedy, and the owner approved it as part of the spine:
**Cairn assigns a stable id to each check when it writes the brief**
(`197.c1` … `197.c5`), and the report answers each id explicitly. This is a
brief-format change and a contract amendment, not app code alone. Task 203's
own brief uses the format provisionally, as the cheapest available proof that
it works before the contract adopts it.

Three things follow at no extra cost.

1. **Promised-versus-answered becomes visible.** A promised check with no
   answer is a hole the owner sees without looking for it. A report item with
   no brief id is disclosed as added during the work — which is what report
   197's items six and seven were, and they were good additions.
2. **Commentary anchors to the check, not the job.** A note a month old is
   attached to the thing it was about.
3. **The evidence pointer is already mandated.** The contract requires the
   report to name "each check's exact command and where its output can be seen,
   so a later conversation — or the owner — can re-run the decisive one"
   (`CONTRACT-TEMPLATE.md:143`). The verdict scores against that rather than
   inventing a second evidence channel.

**Seventy-seven briefs predate the convention.** They record `rubric: "none"`
and take a whole-job verdict. The record says so rather than presenting an
empty list as a completed scoring.

**This belongs under Evidence levels.** The contract already defines Verified
as "Core plus executable 'done when' checks the report cites"
(`CONTRACT-TEMPLATE.md:176`). An owner verdict scoring those checks is what
makes a project genuinely Verified rather than merely declaring itself so. The
amendment lands there, not as a new concept.

## Decision 4 — The record: two artifacts, one authoritative

**Owner accepted a recommendation:** an authenticated store plus a committed
copy. Cairn marked this option "Recommended" among four; the owner took it.
The alternatives were a committed file alone, a verdict row appended to the
log, and `userData` alone.

The signed record lives at `userData/verdicts/<projectHash>/<task>.json` behind
a marker, following `cardauth.ts` exactly: content may sit where a worker can
reach it, but a digest recorded outside every project decides what counts, and
every failure drops rather than trusts (`app/src/main/conductor/cardauth.ts:38`).

```jsonc
{
  "version": 1,
  "projectHash": "<sha256 of the canonical project root>",
  "task": 197,
  "runId": "<uuid>",
  "disposition": "DONE",          // copied from the sealed record; never written here
  "rubric": "checks",             // or "none"
  "checks": [{
    "id": "197.c4",
    "promise": "<brief text, verbatim>",
    "answer": "<report text, verbatim>",   // null means promised and never answered
    "score": "met" | "not-met" | "cant-tell",
    "note": "..."                          // required unless met
  }],
  "added": [{ "answer": "...", "score": "...", "note": "..." }],
  "review": "unjudged" | "pass" | "revise" | "fail",
  "note": "...",                  // whole-job note; required unless pass
  "evidenceSeen": ["<sha256>"],   // the exact captures on screen at judgedAt
  "judgedAt": "<ISO8601>",
  "cairnVersion": "0.x.y"
}
```

Six properties carry the design.

- **`disposition` is copied and unwritable.** Cairn's verified outcome and the
  owner's judgment are separate axes, and the schema enforces the separation
  rather than leaving it to discipline. Decision 2 becomes a property of the
  code, not a promise about it.
- **`review` derives where it can and asks where it cannot.** All checks met
  yields `pass` automatically. Any `cant-tell` outstanding holds the job at
  `unjudged`, because the review is unfinished. Any `not-met` requires the owner
  to choose `revise` or `fail`, because that distinction is intent — nearly
  there against wrong thing — and only the owner holds it.
- **`promise` and `answer` are copied verbatim.** The record must read standing
  alone, or the committed file is a page of identifiers. The report cannot move
  in any case, being written `wx` (`core/src/serial.ts:600`), but the copy is
  what makes the artifact worth committing.
- **`evidenceSeen` pins the captures by hash.** Every PNG is already hashed.
  Recording which hashes were on screen means a later capture can never quietly
  become the thing the owner approved.
- **A note is required on anything but a clean pass.** The value of this record
  a year from now sits almost entirely in the notes.
- **Verdicts append; they never overwrite.** A changed mind supersedes and both
  persist, matching the log's append-only contract and the report's `wx`. The
  record can answer whether the owner approved something before they knew what
  they know now.

**The committed copy is generated Markdown at
`docs/ai-work/tasks/NNN-verdict.md`, carrying `recordSha256` in its
frontmatter.** Cairn recomputes on read. A hand-edited or worker-forged file
matches no signed record and renders as **unauthenticated** — the same
fail-closed shape as an unmarked card line. **The copy a worker can reach is
the copy that is not authoritative, which is exactly why committing it is
safe.**

Cairn writes and commits the copy automatically, once, when the verdict is
saved — including when a later verdict supersedes an earlier one, which appends
rather than rewrites. The commit is local and reversible, so it takes no pause.
**Publishing is untouched:** pushing remains behind the existing publication
approval, and a verdict commit never pushes itself.

## Decision 5 — Custody: who may write, and who may read

**Owner accepted a recommendation:** the conductor may read verdicts, quoting
only. Offered as read-quote-only, off entirely, or deferred; the owner replied
*"We'll follow your recommendation."* The reasoning below is therefore Cairn's
and must survive scrutiny on its own.

- **Only main writes a verdict, and only on an authenticated owner action.**
  Never the renderer, never the conductor, never a worker.
- **The conductor may never write or amend one.** It writes commentary after
  every card today. It must not emit "the owner approved this"; that is a
  forged verdict wearing prose.
- **The verdict takes its own exact-path commit.** `serial.ts` verification is
  built around worker runs. A verdict is Cairn committing on its own behalf
  with no worker present, and it must never ride inside the commit of the run
  it judges.
- **The conductor may cite a verdict only as a verbatim quotation carrying its
  task number.** No paraphrase, no summary across verdicts.

The last rule needs its reason recorded, because it will look like excessive
caution to whoever implements it. A conductor that has read forty verdicts
writes better briefs; that is the highest-value thing in this design. But
citation honesty has failed in the eval at v1 and v2 **on the very scenario
written to fix it**, and v4 did not address it. Handing that conductor a corpus
of the owner's recorded judgments hands it forty new opportunities to
misattribute. Decision 6 of the showing-not-asking spec drew the boundary at
attribution rather than choice; misquoting the owner's verdict is attribution
at its worst, because it puts words in their mouth about their own standards.
Quote-only keeps the value and makes any dishonesty checkable against a file
instead of merely implausible.

## Decision 6 — A dedicated queue, project-scoped, without backfill

**Owner decision:** a dedicated review queue.

- **Project-scoped.** No surface may show another project's records merely
  because both are active. The count is per-project.
- **Every terminal run enters when its record seals.** DONE jobs carry the
  check rubric. STOPPED jobs carry `rubric: "none"` and a whole-job verdict,
  because whether stopping was right is worth judging and the checks never ran.
- **No backfill.** The 197 sealed task records do not enter. A queue that ships
  carrying a 197-item debt is a screen nobody opens. History stays judgeable
  from the album on demand.
- **Oldest first**, so nothing rots at the bottom.
- **Partial reviews are first-class.** Score three checks, leave two at
  `cant-tell`, close, reload: the record persists as `unjudged`, still queued,
  scores intact. A form that punishes stopping halfway is a form the owner
  avoids.
- **Surfacing rides shipped machinery.** The unjudged count joins the needs-you
  signal (`app/src/renderer/screens/Chat.tsx:1545`, Task 155), as its fourth item and its only
  non-blocking one. The commentary turn that already fires after every card may
  raise outstanding reviews as a followup note, in the channel built for where
  to go next.

**One limit, stated here so it is not discovered on the first review.** The
captures are of Cairn's own window at two run boundaries. They are not
per-check evidence, and a check reading `npm run typecheck — clean` has no
picture and never will. In phase one, **per-check evidence is a re-runnable
command; images are run-level only.** Per-check images are precisely what
Decision 1's phase two buys.

## Decision 7 — What the owner's verdict does not touch

**Cairn chose.** Recorded here because the temptation will arrive during
implementation, not during design.

The verdict does not set `moved`. It does not add or remove a stone. It does not
edit the report, the log row, or the brief. It does not reopen a sealed record.
The contradiction named in "Where this comes from" — that `moved` is the
worker's claim while the contract calls it the owner's call — is **recorded by
this design and resolved by none of it.** A verdict that scores checks makes
the contradiction visible and dated for the first time; closing it means
letting the owner's judgment drive a stone, which is a gate, which Decision 2
declined. That is a later decision made on evidence this design will produce.

## Order of work

**Cairn chose.** Four plans, not one. Bundling them would put the trust
properties, a contract change, and a new screen under a single review, and the
one person who has to do that reviewing said plainly that he does not know this
material well. Each step below is independently shippable and independently
rejectable.

1. **The contract amendment (Decision 3's check ids).** First, because every
   brief written after it carries ids and the later plans parse them —
   retrofitting would mean rewriting briefs that had already shipped. It is
   also the only step with no app code, so it is the cheapest to review and the
   cheapest to reverse.
2. **The verdict record and its custody (Decisions 4, 5's write half, and 7).**
   Second: types, the marker store, the IPC surface, and the committed copy.
   No user interface. This is where every trust property lives — a worker
   cannot forge one, the conductor cannot author one, and the schema cannot
   write a disposition — and those deserve a review of their own rather than
   arriving underneath a screen.
3. **The review queue (Decision 6).** Third, built onto a record already proven
   forgery-proof.
4. **The conductor's read access and its eval scenario (Decision 5's read
   half).** Last, because scoring quote-only honesty is worthless until real
   verdicts exist to misquote, and because it costs a paid run the owner must
   authorize.

**The order differs from the showing-not-asking spec's, deliberately.** That
spec moved its user-interface work early because the narrow window held its
largest unknown. Here the largest unknown is whether the check-id format
survives contact with real briefs — a format that reads well in a spec and
fights every brief an author writes would invalidate Plans 2 through 4. So the
format goes first and gets used before anything is built on it.

## How we would know it holds

Each of these is a test rather than a claim. The first three are trust defects
if they fail, not bugs.

- **A worker cannot author a counted verdict.** A plausible `197-verdict.md`
  written into the project renders as unauthenticated, leaves the queue count
  unchanged, and is read by nothing.
- **The conductor cannot emit a verdict.** A conductor turn carrying a
  verdict-shaped fence produces no record, failing closed on read exactly as
  followups do.
- **The verdict path cannot write `disposition`, `moved`, or a stone.**
  Asserted directly. Decision 2 is a promise about what the code cannot do, and
  separate axes are only half of keeping it.
- **`evidenceSeen` pins what was on screen.** Judge a run, add a capture, and
  the verdict still names only the hashes that existed at `judgedAt`.
- **A note is required on anything but a clean pass.** The record cannot be
  written without it.
- **A partial review survives a reload** as `unjudged`, still queued, scores
  intact.
- **Promised-versus-answered surfaces itself.** Brief 197 and report 197 run
  through it produce five promises, seven answers, and two disclosed additions,
  without the owner looking for them.
- **No backfill.** First launch after upgrade shows an empty queue against 197
  sealed tasks.
- **Divergence is detected.** A hand-edited committed copy mismatches
  `recordSha256` and says so.
- **Re-judging appends.** Both verdicts persist, the later displays, the
  earlier stays readable.
- **A brief with no Checks section records `rubric: "none"`**, never an empty
  `checks` array that reads as scored and clean.
- **Project isolation holds.** Two projects open; neither queue counts the
  other's runs.
- **Quote-only gains an eval scenario with a written bar**, scoring a
  paraphrase of a verdict as a failure, alongside the existing scenarios and
  under the same `constitution` column. Given S3's history this is the only
  reason to believe the rule holds.
- Existing suites stay green: `npm.cmd run typecheck`, `test:unit`,
  `build:vite`, `build:lab`, and the Playwright cases.
- **The owner's judgment is required for DONE on the implementing task**, as
  Task 197 required for itself. Fitting, given what it builds.

## Deliberately out of scope

- **Photographing the product a worker changed.** Phase two by Decision 1.
  Launching changed project code after the worker exits is a risk boundary the
  Task 173 plan refused deliberately, and it needs its own spec and review. It
  is also what per-check images and motion clips depend on.
- **Video.** Nothing in the stack records, encodes, stores, or plays it. It
  arrives with phase two or not at all.
- **A revise loop.** Turning a `fail` or `revise` into a pre-filled next brief
  is the obvious next capability and was declined under Decision 2. The record
  carries what such a loop would need; nothing consumes it yet.
- **Gating.** Declined under Decision 2, and the schema keeps it possible.
- **Resolving the `moved` contradiction.** Decision 7.
- **Backfilling the seventeen verdicts that exist as prose in old reports.**
  Extracting them means an agent interpreting the owner's words and writing
  them down as the owner's judgment, which is the attribution failure this
  design exists to prevent. If those verdicts are wanted as records, the owner
  writes them.

## Open for the owner

1. **The contract amendment is real work outside the app.** Stable check ids
   touch `CONTRACT-TEMPLATE.md`, `AGENTS.md`, `cairn claim`, and every future
   brief. It should be its own task, landing before the app work that depends
   on it.
2. **A new eval scenario costs a paid run.** Scoring quote-only means running
   the eval, which needs the owner's connected provider and their explicit go.
   The last full run cost $0.0283 across ten scenarios.
3. **Disk growth is negligible and worth stating anyway.** A verdict is
   kilobytes of JSON and Markdown. This adds no images.
4. **`cant-tell` is the state to watch.** It is deliberately offered because "I
   looked and I honestly cannot tell" is the most common real answer and the
   one most likely to be rounded up to a pass by a form that omits it. If it
   proves to be where every review goes to die, that is a finding about the
   checks being written, not about this design.
