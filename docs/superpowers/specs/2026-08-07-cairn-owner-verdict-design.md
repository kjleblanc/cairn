# The Owner's Verdict — Design

**Status:** proposed 2026-08-07 by Task 203; revised the same day by Task 204
after a first adversarial review raised 68 findings, of which 39 survived
refutation (6 CRITICAL, 20 MAJOR, 13 MINOR); **revised again by Task 212 after
a second pass raised 57, of which 22 survived — 2 CRITICAL, 7 MAJOR, 13 MINOR.**

**Round two found that Task 204's headline fix was itself the defect.** Moving
the committed copy out of `docs/ai-work/tasks/` removed the only hard rejection
and left the spec asserting a protection that did not exist. Task 212 wrote the
guard, proved it with a two-arm harness against the real built core, and
rewrote the paragraph to say what the code does. **Read that as a warning about
this document's history rather than a boast: two rounds of review, and both
found a fabricated safety property stated as verified fact.** Nothing here
should be relied on without running it.

This design sits on top of the shipped evidence work (Tasks 173 and 188) and
the followups channel (Task 157). Nothing here loosens an approval, a
verification, or a risk boundary. Nothing here lets the owner's judgment move a
stone, a disposition, or a milestone.

**What the review changed, so a reader knows which parts were wrong once.** The
committed copy moved out of `docs/ai-work/tasks/` and gained a no-active-run
gate, because as first written it would have sealed a live run
`MODEL_RESULT_NOT_VERIFIED` and permanently accused a worker. Three factual
claims were false and are corrected in place with the correction named: the
brief-count statistic, the reason `promise` and `answer` are trustworthy, and a
`moved` "contradiction" the owner had already settled in Task 081. Two
decisions contradicted each other (the mandatory note against first-class
partial reviews) and one would have destroyed the publication-approval signal.
Every correction is marked where it appears rather than quietly rewritten. The
core — record the owner's verdict, resist forgery, keep `review` and
`disposition` on separate axes — is unchanged; the review did not touch it.

**Prerequisite added by Task 207.** The owner subsequently decided that Cairn
must regain a critic, calibrated so minor issues cannot reject an otherwise
successful task, and that the quality-intent/critic work must land before this
design's Plan 2 begins. The decision-complete source is
`docs/superpowers/specs/2026-08-07-cairn-quality-intent-and-critic-design.md`;
its implementation plan is
`docs/superpowers/plans/2026-08-07-cairn-quality-intent-and-critic-prerequisite.md`.
The four plans in this document keep their numbers. An unnumbered
**Prerequisite Q** now sits between completed Plan 1 and Plan 2.

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
commentary turns only (`app/src/main/conductor/service.ts:1227-1229`), rendering as
"Where we could go next" on the latest turn (`app/src/renderer/screens/Chat.tsx:1679`).

**The responding half has no machinery at all.** No spec, plan, type, store, or
IPC call carries the owner's judgment; `app/src/preload.ts` exposes no channel
for one, and every post-result call is either an acknowledgement or a read. The
judgment itself is not missing — see below — but nothing in Cairn holds it.

It is not missing because nobody noticed. It is missing because it is currently
done in prose. **Measured 2026-08-07 at commit `83dfd0d`** — these counts move
as work lands, and did move once during Task 203 — of 199 task reports, **14
quote the owner's own words** and a further **29 record that the owner reviewed
or approved without quoting them**:

> "The owner reviewed the refreshed safe-stream, wide, keyboard-focus, and
> compact evidence and said 'Looks right. Approved.'"
> (`docs/ai-work/tasks/194-report.md:36`)

The verdict already exists, and in the better cases it is even bound to named
evidence. What it is not is **structured, queryable, or hashed to what was on
screen** — and in every case it is a sentence Cairn wrote about the owner
rather than a record the owner authored. That is the gap, and it is narrower
and more honest than "the verdict is not recorded".

Two further facts set the stakes.

- **The owner's judgment already has one place it is deliberately kept out of.**
  `moved` is the worker's claim (`core/src/serial.ts:617`) and stones count
  DONE-plus-YES rows (`core/src/steps.ts:60`). **This is settled, not broken.**
  Task 081 (`17318e5`, "the stone keeps its mechanism and loses its false claim
  to verification") recorded the owner's decision to keep the mechanism and
  label the claim as a claim, in the contract and in the app's own words; the
  contract's "Task records are memory" section now says so. An earlier draft of this spec
  presented that as a live contradiction. It is not one, and nothing here
  reopens it — see Decision 7.
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
- **A post-completion review is advice.** The "Task records are memory" section
  of `AGENTS.md` says a review "may suggest a new task, and the completed record
  stands." Decision 2 holds this line rather than softening it. Prerequisite Q's
  critic is a different, task-scoped pre-seal inspection against a frozen Task
  Spec. Required/optional/off is visible before dispatch; a model allegation
  needs owner/native confirmation to block. It cannot reopen a completed record
  or speak as the owner.

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

This is consistent with the "Task records are memory" section of `AGENTS.md`,
and it has a second property worth naming: **the record shape is designed once
and any power can be built on it later without redesign.** Because Decision 4
keeps the owner's axis
separate from Cairn's and forbids the verdict path from writing `disposition`,
a gate could later be added without touching the record — a claim checkable
against this document rather than against anyone's product history. (An earlier
draft asserted that Percy and Applitools grew their gates on top of a
record-only field. Nothing in this repository supports that and it is
contestable on its face, so it is gone.)

The cost is stated plainly rather than discovered: a queue the owner must visit,
with nothing making them visit it. Decision 6 carries the two nudges that exist.

**Task 207 clarification:** Decision 2 governs the authenticated owner's verdict
designed here. A separately attributed critic assessment is not an owner
verdict and cannot write or derive one. Prerequisite Q may use a strictly parsed,
evidence-bound assessment while a task is still active, but only under the
bounded policy in its own design. It may not alter or reopen a sealed task. No
owner-verdict field is consumed by that policy.

## Decision 3 — The rubric is the brief's Checks, and the checks get stable ids

**Owner decision:** score the brief's Checks, one by one.

The rubric already exists and is already declared before work starts, which is
the one thing annotation-queue tools get right and everyone else gets wrong.

**But it is not one rubric.** Measured 2026-08-07 at `83dfd0d`: of 199 briefs,
**122 carry some `## Checks` heading, in eleven different wordings** — 57 use
`## Checks that will show the outcome holds`, 38 use a bare `## Checks`, and
the rest spread across nine more spellings. An earlier draft of this spec said
"120 of 197 carry" the canonical heading, conflating the two measurements.
**The spread is the argument, not an embarrassment:** a rubric written eleven
ways cannot be parsed, and that is what Decision 3's generator exists to fix.

**But it is prose, and it drifts.** Brief 197 promised five checks; report 197
delivered seven, adding an A/B control run and `git diff --check`. Both
numbered lists, neither aligned. Nothing in the repository can say whether all
five promises were answered.

**Cairn chose** the remedy, and the owner approved it as part of the spine:
**Cairn assigns a stable id to each check when it writes the brief**, and the
report answers each id explicitly. This is a brief-format change and a contract
amendment, not app code alone.

**The id is position-only — `c1` … `cM`, never `197.c1`.** Task 203's brief
used the task-numbered form and it is wrong: the contract mandates renumbering
when two lanes claim the same number (`AGENTS.md`, "Working in lanes"), and `renumberTask`
rewrites exactly one thing inside the files — the `# Task NNN` heading
(`cli/src/flows/claim.ts:271`). Task-numbered ids would silently survive a
renumber pointing at the old number, which is the opposite of stable. The task
number is already the filename; repeating it inside buys nothing and breaks.
Task 204's brief uses the corrected form.

**The amendment governs briefs a lane writes, not the adapter contract Cairn
generates.** `briefText()` at `core/src/serial.ts:250` emits a worker-facing
`## Checks` block from `contract.checks` on every dispatch, and it carries no
ids. Wording the rule to cover it would make Cairn's own shipped runtime
violate the contract on every run. Bringing the runtime into line is real work.
Task 207 moves that obligation from Plan 2 into Prerequisite Q because the
critic needs the exact same `cN` promises before the verdict store can parse
them. The rule remains scoped until Q lands; Plan 2 then consumes the proven
shape rather than inventing it.

**The Quality Plan is the source of the runtime rubric.** It is frozen before
dispatch and preserves the existing `owner-stated`, `owner-unsure`, and
`cairn-chosen` provenance. Every required criterion compiles to one existing
`cN` backed by an owner-stated row or contract rule; owner-unsure/Cairn-chosen
quality remains a separately visible `pN` until the owner adopts it in a new
turn. Advisory polish cannot become a hidden gate. A named reference is
untrusted, narrow evidence for declared
dimensions, never wholesale intent. Candidate and reference states are
snapshotted and hashed. An empty reference list is an honest and supported
value; Cairn does not invent one merely to run a critic. The complete schema
and blocking rules live in the Task 207 quality-intent design.

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
   (`CONTRACT-TEMPLATE.md:150-153`). The verdict scores against that rather than
   inventing a second evidence channel.

**Every brief written before the amendment records `rubric: "none"`** and takes
a whole-job verdict. The criterion is *carries ids*, not *carries a heading* —
77 of the 199 briefs measured at `83dfd0d` have no `## Checks` heading at all,
and the other 122 have one in eleven wordings and no ids. The record says
`"none"` rather than presenting an empty list as a completed scoring.

**This belongs under Evidence levels.** The contract's "Evidence levels"
section defines Verified as "Core plus executable 'done when' checks the report
cites." An owner verdict scoring those checks is what makes a project genuinely
Verified rather than merely declaring itself so. The amendment lands there,
not as a new concept.

## Decision 4 — The record: two artifacts, one authoritative

**Owner accepted a recommendation:** an authenticated store plus a committed
copy. Cairn marked this option "Recommended" among four; the owner took it.
The alternatives were a committed file alone, a verdict row appended to the
log, and `userData` alone.

The signed record lives at `userData/verdicts/<projectHash>/<task>.json` behind
a marker, following `cardauth.ts` exactly: content may sit where a worker can
reach it, but a digest recorded outside every project decides what counts, and
every failure drops rather than trusts (`app/src/main/conductor/cardauth.ts:38`).

```json
{
  "version": 1,
  "projectHash": "<sha256 of the canonical project root>",
  "task": 197,
  "runId": "<uuid>",
  "disposition": "DONE",
  "rubric": "checks",
  "checks": [{
    "id": "c4",
    "promise": "<brief text, verbatim>",
    "answer": "<report text, verbatim>",
    "score": "met",
    "note": null
  }],
  "added": [],
  "review": "pass",
  "note": null,
  "evidenceSeen": ["<sha256>"],
  "adviceSeen": ["<critic-assessment-sha256>"],
  "judgedAt": "<ISO8601>",
  "cairnVersion": "0.x.y"
}
```

Allowed check scores are `met`, `not-met`, and `cant-tell`; allowed review
states are `unjudged`, `pass`, `revise`, and `fail`. `answer: null` means a
promised check was never answered. With `rubric: "none"`, `checks` must be empty
and the owner makes only the whole-job judgment. Per-check and whole-job notes
may remain null while an autosaved record is `unjudged`; a terminal `revise` or
`fail` requires the whole-job note, and every terminal non-met/cant-tell check
requires its own note. These are parser invariants, not comments left for the UI
to interpret.

Seven properties carry the design.

- **`disposition` is copied and unwritable.** Cairn's verified outcome and the
  owner's judgment are separate axes, and the schema enforces the separation
  rather than leaving it to discipline. Decision 2 becomes a property of the
  code, not a promise about it.
- **`review` derives where it can and asks where it cannot.** All checks met
  yields `pass` automatically. Any `cant-tell` outstanding holds the job at
  `unjudged`, because the review is unfinished. Any `not-met` requires the owner
  to choose `revise` or `fail`, because that distinction is intent — nearly
  there against wrong thing — and only the owner holds it.
- **`promise`, `answer`, and `disposition` are snapshotted at seal time, not
  read at judge time.** The record must read standing alone, or the committed
  file is a page of identifiers. **The earlier justification for this was
  wrong:** it claimed the report "cannot move" because it is written `wx`
  (`core/src/serial.ts:600-607`). `wx` only stops *Cairn* clobbering its own file,
  it says nothing about anyone else, and it is not even unconditional — the
  code reads `flag: recovery?.overwriteReport ? "w" : "wx"`. The brief and
  report live in the project a worker can write to. So Cairn copies their text
  into the app-owned store at the moment the run's record seals, alongside
  `finalizeEvidenceRun`, and the verdict form renders from that snapshot.
  **What the owner judged is what the owner saw**, and a later edit to the file
  cannot rewrite history.
- **`evidenceSeen` pins the captures by hash.** Every PNG is already hashed.
  Recording which hashes were on screen means a later capture can never quietly
  become the thing the owner approved.
- **`adviceSeen` pins advice without laundering it into evidence.** A critic
  assessment hash records which attributed model advice was displayed. Main,
  not renderer input, derives a deduplicated list of at most three from the authenticated
  verdict session. Every digest must resolve through Cairn's marker and match the
  same project, run, Task Spec, sealed candidate, and pre-seal phase; stale,
  prior-round, cross-project, forged, duplicate, or not-rendered advice fails.
  It does not copy a critic result into the owner's scores, prove the advice
  true, or imply the owner agreed.
- **A note is required to leave `unjudged` for anything but a clean pass — not
  to save.** The value of this record a year from now sits almost entirely in
  the notes, but requiring one on every write would forbid the partial reviews
  Decision 6 promises are first-class. An autosaved partial sitting at
  `unjudged` requires nothing; the note is the price of a terminal verdict.
- **Verdicts append; they never overwrite.** A changed mind supersedes and both
  persist, matching the log's append-only contract and the report's `wx`. The
  record can answer whether the owner approved something before they knew what
  they know now.

**The committed copy is generated Markdown at `docs/ai-work/verdicts/NNN.md`,
carrying `recordSha256` in its frontmatter.** Cairn recomputes on read. A
hand-edited or worker-forged file matches no signed record and renders as
**not verifiable here** — the same fail-closed shape as an unmarked card line.
**The copy a worker can reach is the copy that is not authoritative, which is
exactly why committing it is safe.**

**It is not under `docs/ai-work/tasks/`, and that is load-bearing.** An earlier
draft put it there and it was the worst error in this design.
`changedTaskPaths` (`core/src/serial.ts:758`) returns null for any path under
`docs/ai-work/tasks/` that is not in the run's `ownedRecords`, and that set is
exactly `[brief, report, LOG]` (`:1027-1031`). The "Working in lanes" section of
`AGENTS.md` says it in words: "An automation is not a lane… it never touches
task paths."

**The path move alone left no protection behind it, and an earlier draft of
this spec claimed otherwise.** That draft said `commitExactPaths` (`:794-816`)
requires the whole changed set to equal the product paths plus the owned
records, and concluded that **any** new non-ignored file anywhere breaks a run
in flight. **That conclusion was false, and it was asserted as verified code
behaviour.** `expectedCommitSet` is *derived from* the changed set
(`:1334-1342`), so the equality holds by construction; `changedTaskPaths`
returns every other changed path as a **product path**. Moving the verdict copy
out of `docs/ai-work/tasks/` therefore removed the only hard rejection and put
nothing in its place. A two-arm harness against the real built core showed the
two paths behaving oppositely: a worker writing `docs/ai-work/verdicts/197.md`
mid-run reached **DONE** with that file committed inside
`Task NNN: complete verified worker task`, while `docs/ai-work/tasks/999-report.md`
stopped. The draft also cited `core/test/serial.test.ts:763` as proof; that test
writes a `tasks/` path and proves only the `tasks/` rule.

**Task 212 made the claim true instead of deleting it.** `changedTaskPaths` now
rejects any path under `docs/ai-work/verdicts/` outright, with a red-first test
and a control asserting an ordinary path merely containing the word still
commits. So the verdict tree is genuinely fail-closed — but by a guard that had
to be written, not by one that was already there.

Therefore:

- **The signed record in `userData` is written immediately.** It is outside the
  project and can never disturb a run.
- **The committed copy is written and committed together, and only while no run
  is active for that project** (the app already holds the run lock; the
  conversation surface gates the same way at
  `app/src/main/conductor/service.ts:203,794`). While a run is active the copy is
  **pending**, and the record says so. Cairn writes it at the next safe moment.
- **The contract's isolation condition applies unchanged.** The "whole
  workflow" and "Git protection" sections of `AGENTS.md` say to commit only
  when Git isolation is clear and to skip otherwise;
  a skipped copy stays pending rather than being forced.
- **A verdict can never seal a run.** Asserted by a test that saves a verdict
  during a live run and proves the run still reaches its own honest outcome.

**Portability, and what "not verifiable here" must never say.** The marker
store is per-machine, so a genuine verdict committed on one machine cannot be
authenticated on another. For a result card `cardauth`'s fail-closed drop is
right — a card is ephemeral and re-derivable. **A verdict is neither.** Dropping
it, or labelling it forged, would tell the owner their own recorded judgment was
fabricated, which is a worse failure than the one it guards. So the wording is
fixed here: an unverifiable copy is shown, marked **"recorded on another
machine — not verifiable here"**, and never called forged, never silently
dropped, and never counted as authenticated. The trade is deliberate: this
design chooses *the owner never loses their own words* over *every displayed
verdict is machine-proven*.

Cairn writes and commits the copy automatically, once, when the verdict is
saved and no run is active — including when a later verdict supersedes an
earlier one, which appends rather than rewrites. The commit is local and
reversible, so it takes no pause.
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
- **The verdict takes its own exact-path commit, and only when no run is
  active.** `serial.ts` verification is built around worker runs. A verdict is
  Cairn committing on its own behalf with no worker present, and it must never
  ride inside the commit of the run it judges — **nor land beside one that is
  still being verified.** An earlier draft named only the first direction;
  Decision 4 now carries the gate that covers both.
- **The conductor may cite a verdict only as a verbatim quotation carrying its
  task number.** No paraphrase, no summary across verdicts.

The last rule needs its reason recorded, because it will look like excessive
caution to whoever implements it. A conductor that has read forty verdicts
writes better briefs; that is the highest-value thing in this design. But
citation honesty has failed in the eval at `conductor-v1` and `conductor-v2`
**on the very scenario written to fix it** (S3, `docs/superpowers/evals/conductor-v0.md:118-119`).
The live constitution is `conductor-v8` (`app/src/main/conductor/constitution.ts:48`)
and **the eval has not been run since v2**, so v3 through v8 are entirely
unscored — the rule may well be fixed and nobody can say. Handing that conductor a corpus
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
- **No backfill.** Sealed task records do not enter — **206 of them as of
  2026-08-07 at `9572220`, and climbing while this is written.** A queue that
  ships carrying a two-hundred-item debt is a screen nobody opens. History stays judgeable
  from the album on demand.
- **Oldest first**, so nothing rots at the bottom.
- **Partial reviews are first-class.** Score three checks, leave two at
  `cant-tell`, close, reload: the record persists as `unjudged`, still queued,
  scores intact. A form that punishes stopping halfway is a form the owner
  avoids.
- **Surfacing gets its own quiet surface, and must not join `needsYou`.**
  `needsYou` is a boolean OR of three *blocking* decisions — a proposal to
  decide, a dispatch to confirm, and the publication approval — published as
  one dot (`app/src/renderer/screens/Chat.tsx:1552-1562`, Task 155). Feeding a
  standing, non-blocking count into it would pin it permanently true and
  **destroy the push-approval attention signal**, which is the one signal in
  the app guarding a real risk boundary. An earlier draft proposed exactly
  that. The unjudged count therefore gets a separate, quieter indicator. The
  commentary turn that already fires after every card may also raise
  outstanding reviews as a followup note, in the channel built for where to go
  next.

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
It does not seal, stop, or disturb a run — Decision 4's gate is what makes that
true in fact rather than in intention.

**`moved` in particular stays exactly where Task 081 put it.** An earlier draft
of this spec claimed a live contradiction between `moved` being the worker's
claim and the contract calling it the owner's call, and offered this design as
what would make it "visible and dated for the first time". That was wrong: the
owner settled it in Task 081 (`17318e5`), choosing to keep the mechanism and
label the claim honestly, and the contract and app already say so. Nothing here
reopens a closed owner decision. If the owner ever wants a stone to count their
judgment instead, that is a gate, which Decision 2 declined, and it would be a
fresh decision on its own evidence — not a defect this design is fixing.

## Order of work

**Cairn chose.** Four numbered plans plus one unnumbered prerequisite, not one
bundle. Bundling them would put the trust properties, a contract change, a
critic, and a new screen under a single review, and the one person who has to do
that reviewing said plainly that they do not know this material well. Each step
below is independently shippable and independently rejectable.

1. **The contract amendment (Decision 3's check ids).** First, because every
   brief written after it carries ids and the later plans parse them —
   retrofitting would mean rewriting briefs that had already shipped. It is
   also the only step with no app code, so it is the cheapest to review and the
   cheapest to reverse. **Completed by Task 205.**

**Prerequisite Q — Quality intent and the bounded critic.** After Plan 1 and
before Plan 2, execute
`docs/superpowers/plans/2026-08-07-cairn-quality-intent-and-critic-prerequisite.md`.
It freezes the Quality Plan/critic schemas, brings runtime briefs and reports
  onto `cN`, proves the critic's tool-free packet custody and finite policy, and
  runs the separately approved calibration. Plan 2 may not be written or started
  until Q10 is DONE. This prerequisite never renumbers Plans 2–4 and never
changes an already sealed task.

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

Each of these is a test rather than a claim. The first four are trust defects
if they fail, not bugs.

- **A verdict path can never enter a run's commit.** Shipped by Task 212 and
  asserted in `core/test/serial.test.ts`: a worker writing
  `docs/ai-work/verdicts/197.md` mid-run closes `MODEL_RESULT_NOT_VERIFIED`
  with HEAD unmoved, and a control proves an ordinary path merely containing
  the word still commits. **An earlier wording of this criterion — "the run
  still reaches its own honest outcome with HEAD unmoved by the verdict" —
  passed while the file was being laundered into the run's own commit**, which
  is why it is stated as an exclusion from the commit rather than as an
  outcome of the run.
- **Saving a verdict during a live run does not disturb it.** Separate from the
  guard above: start a run, save a verdict mid-flight through the real verdict
  path, and assert the run reaches its own outcome and the verdict is recorded
  once the run settles. This one is still unbuilt and belongs to Plan 2.
- **A worker cannot author a counted verdict.** A plausible
  `docs/ai-work/verdicts/197.md` written into the project renders as not
  verifiable, leaves the queue count unchanged, and is read by nothing.
- **The conductor cannot emit a verdict.** A conductor turn carrying a
  verdict-shaped fence produces no record, failing closed on read exactly as
  followups do.
- **The verdict path cannot write `disposition`, `moved`, or a stone.**
  Asserted directly. Decision 2 is a promise about what the code cannot do, and
  separate axes are only half of keeping it.
- **`evidenceSeen` pins what was on screen.** Judge a run, add a capture, and
  the verdict still names only the hashes that existed at `judgedAt`.
- **A note is required to reach a terminal verdict, and never to save.** A
  partial at `unjudged` saves with no note; moving to `revise` or `fail`
  without one is refused. Both halves asserted, because an earlier draft stated
  only the first and contradicted Decision 6.
- **A verdict recorded on another machine is shown, not accused.** Present a
  committed copy with no local marker and assert the wording says "recorded on
  another machine — not verifiable here", that it is not counted as
  authenticated, and that it is not dropped.
- **The snapshot is what the owner saw.** Seal a run, rewrite the brief and
  report on disk as a worker could, and assert the verdict form still renders
  the sealed text.
- **The unjudged count never pins `needsYou`.** With verdicts outstanding,
  assert `needsYou` is still false when no blocking decision is waiting, so the
  publication approval keeps its signal.
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
- **Critic advice cannot author the owner's judgment.** Feed a valid
  `CriticAssessmentV1` through every renderer/conductor/project-file path and
  assert that no verdict, owner score, note, queue state, disposition, `moved`,
  stone, dispatch, or next task is created or prefilled.
- **`adviceSeen` means actually seen for this candidate.** Cross-project,
  prior-round, stale-candidate, forged, duplicate, and not-rendered assessment
  hashes are rejected; main derives the exact bounded list shown in the
  authenticated verdict session.
- **A negative assessment after seal changes nothing.** A sealed DONE followed
  by critic-shaped advice retains the same disposition, commit, report/log,
  `moved` claim, stone, owner verdict, and queue state.
- **Quality and critic custody were proven before this plan starts.** Plan 2's
  tests consume the preregistered calibration result and frozen schema versions;
  they do not rerun, reinterpret, or weaken Prerequisite Q.
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
- **A post-verdict revise loop.** Turning an owner's `fail` or `revise` into a
  pre-filled next brief remains declined under Decision 2. Prerequisite Q's one
  separately approved repair occurs before seal against an unchanged Task Spec;
  it does not consume an owner verdict.
- **Owner-verdict gating.** Still declined under Decision 2. The pre-seal critic
  is task-scoped: only a Task Spec with owner-stated/contract basis may require
  it, optional/off tasks can seal without it, and it cannot operate on a
  completed record. A required task criterion is not inferred from a verdict.
- **Resolving the `moved` contradiction.** Decision 7.
- **Backfilling the seventeen verdicts that exist as prose in old reports.**
  Extracting them means an agent interpreting the owner's words and writing
  them down as the owner's judgment, which is the attribution failure this
  design exists to prevent. If those verdicts are wanted as records, the owner
  writes them.

## Open for the owner

1. **The contract amendment is complete; its runtime half is not.** Task 205
   landed stable ids in `CONTRACT-TEMPLATE.md`, `AGENTS.md`, `cairn claim`, and
   every future lane-authored brief. Prerequisite Q now owns carrying those ids
   through Cairn's generated runtime brief, worker evidence, and report before
   Plan 2 consumes them.
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
5. **Critic calibration is a separate paid/data-bearing boundary.** Before its
   first live call, Cairn must name the exact provider/resolved model, synthetic
   fixture payloads and hashes, at-most-16 one-fixture calls, time/output caps,
   and honest billing/quota basis. If the owner declines or the held-out bar
   fails, Q10 stops and Plan 2 remains unstarted; no existing task or verdict
   changes.
