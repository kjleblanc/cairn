# Cairn Phase 3 — The Full Atom — Design

Date: 2026-07-24
Status: approved by owner (design session); revised after adversarial review
(three lenses, 24 findings adjudicated) before commit
Scope: design only. This document changes no behavior. It governs the Phase 3
implementation plan and its serial recorded tasks.

## Where this comes from

The route spec (`2026-07-23-cairn-conductor-route-design.md`) gives Phase 3
two lines: the proposed-task card gains its own dispatch button, and the
conductor relays results from what the envelope verified. A phase boundary is
a re-plan moment, so this session pressure-tested those lines against the
code at 0.2.1 and the day's evidence. Four findings shaped the design:

- **The Phase 1 milestone landed hours before this session** (repo Task 055;
  Bookshelf fixture task 004, commit `5b65dab`): a vague request, scoped
  through clarifying questions, dispatched through the Phase 2 envelope to a
  verified DONE. The loop works. What broke was fidelity at the seams.
- **The conductor invents what it has no channel to carry.** Two observed
  failures, one family: the eval's S3 partial cited "the log" for a
  file-content fact the briefing cannot contain, and the milestone run
  dropped the owner's supplied word counts (74, 477, 256) from the card, so
  the worker shipped plausible invented ones (65,252 / 95,356 / 168,000).
  The `cairn-task` block has only `outcome`, `concerns`, `notes` — gathered
  data has nowhere to ride except the conductor's prose.
- **Run state is already surface-independent.** Phase 2's reattach work
  moved run ownership into the main process; any screen can render a run.
  Inline dispatch and inline status are views, not new machinery.
- **Two envelope defects identified at Phase 2 close are worth paying
  now.** The catch-path record restore (the Phase 2 final verification's
  accepted residual: a worker forging a log row while forcing its own
  adapter throw leaves the forged row standing in a thrown, must-inspect
  run) and the quit-grace escape window (`task:run` never checks the
  stop-and-quit grace flag in `app/src/main/main.ts`, so a new run can
  start while the app is draining toward quit). Both verified against the
  code in this session; the third seam defect — the task screen's
  `refresh()` overwriting a card-seeded outcome from a stale closed session
  (`TaskRun.tsx`) — dies structurally in Chunk 3.

## Decisions

Owner-approved in this session, each against named alternatives:

1. **The envelope speaks the result; the conductor comments.** When a
   card-dispatched run reaches a terminal state, Cairn posts a
   deterministic result card in the dispatching conversation, built only
   from the verified record. The conductor then adds plain-language
   commentary, visibly separate from the card. Rejected:
   conductor-narrates-the-facts (narration is precisely where both observed
   inventions happened); facts-card-only (the milestone names an honest
   explanation, and silence outsources it).
2. **The run lives in chat compactly; the run screen keeps the depth.**
   Confirmation and a small live status render in the conversation; the
   existing hardened run screen stays one click away. Rejected: the whole
   run inline (duplicates the run screen now; folding screens is Phase 5
   work); dispatch-jumps-to-task-screen (breaks the conversation mid-atom).
3. **The push nudge is an envelope-triggered chip whose press opens the
   contract's own pause.** Deterministic signals decide when the chip
   appears; pressing it opens a pre-push confirmation showing the exact
   target, effect, and recovery plan, and approving that exact action runs
   the push. Rejected: commit help for stray owner edits (ownership of
   stray edits is exactly what the envelope refuses to judge); advice-only
   (trades presses for copy-paste and reintroduces conductor judgment
   where a fact suffices). Review revision: the original one-press design
   violated the contract's concrete-risk ceremony ("pause and show the
   owner the exact target, effect, likely cost or exposure, and recovery
   plan" before writing to an external service); the chip-then-confirm
   two-step is the minimal compliant shape, and it is compliant from the
   day it ships, not from the later amendment.

## Chunk 1 — Envelope hardening (first, protecting paid runs)

- **Catch-path record restore.** The Task 052 integrity gate restores
  tampered Cairn-owned records on the return path; the same restoration
  moves into the catch path, so a worker that forges a log row and then
  forces its own adapter throw still leaves the log exactly as Cairn wrote
  it, with the run stopping honestly. Red-first against the Phase 2 final
  verification's construction.
- **Quit-grace escape window.** During stop-and-quit's bounded grace, a new
  run is refused; red-first against the unchecked-grace-flag scenario.

## Chunk 2 — The data channel (core-side, authorization-bound)

The `cairn-task` block gains one field:

- `details`: owner-supplied specifics the task needs — numbers, names,
  exact wording — carried **verbatim**. Optional; parsed fail-closed in
  both strict parsers (the conductor task-block parser in the app, which
  today rejects unknown fields, and any core validation it feeds) with its
  own size cap; hostile shapes die exactly as they do for the other fields.

`details` is data being sent to a paid worker, so it joins the
byte-checked authorization chain, not just the display:

- The adapter task contract gains a `details` field and bumps to
  `cairn-serial-task/v2`; the contract's integrity hash binds outcome and
  details together (a canonical two-part digest replacing the outcome-only
  `sha256(outcome.trim())`), so the tamper-detection that today protects
  the outcome protects the whole payload.
- The disclosure the owner byte-confirms shows the details verbatim
  alongside the outcome; the run gate's byte-compare covers it. What the
  owner approved and what dispatches are the same bytes, as the contract's
  "confirm the data being sent" requires.
- The worker prompt appends details under the requested outcome, unedited.
  The task brief records it verbatim, so the record of what was asked
  matches what was sent.
- Core tests prove the verbatim path at this chunk's own level: a details
  payload passed through `runSerialTask` appears in the composed worker
  prompt and the brief byte-for-byte — the exact seam where the milestone
  run's word counts were lost.

The proposed-task card displays `details` in full, so the owner sees what
rides before anything spends. The conductor stops being a copyist because
the data no longer passes through its prose. (The conductor is taught to
emit the field by constitution v2 in Chunk 6; until the phase closes, the
channel is built and tested envelope-side but dark — the phase ships as
one release.)

## Chunk 3 — Inline dispatch

- The proposed-task card gains a dispatch button. Pressing it opens the
  per-action disclosure confirmation inline — the same byte-checked
  disclosure mechanism the task screen uses, now carrying outcome and
  details per Chunk 2, for the routed adapter.
- Confirmation starts the run through the existing main-process run
  session. The handoff is first-class: the run request carries the card's
  outcome and details directly, plus the dispatching conversation's id,
  and never touches the task screen's prefill path. This structurally
  retires the seeding clash (a card outcome silently lost to a stale
  task-screen session's `refresh()`).
- While the run lives, the conversation shows a compact status strip — the
  run's current activity stage (Route / Guard / Run / Check / Result, the
  same `SerialActivity` stream the run screen renders), elapsed time, and
  a stop control wired to the existing cancel path — plus a link to the
  run screen for full activity. Reload and navigation reattach from the
  same main-process session the run screen uses.
- The chat composer during a run shows the existing refusal honestly as a
  visible disabled state beside the status strip, instead of accepting a
  send that the shared serial gate will refuse. Chat-during-run stays
  refused by design; that gate is a Phase 2 safety decision this phase
  does not reopen.
- Until Chunk 4 lands, a card-dispatched run's result still surfaces on
  the run screen; the conversation shows the status strip's terminal state
  with a link. This interim is deliberate and short-lived.

## Chunk 4 — The result relay

- **Which runs, which conversation:** result cards post only for
  card-dispatched runs, into the conversation whose id rode the run
  request. Task-screen and CLI runs keep their existing surfaces
  unchanged.
- **Every terminal state posts a card:** a DONE card and a STOPPED card
  (connection-required included) render from the verified record; a
  thrown, must-inspect run posts an error card that names the thrown code,
  says plainly that Cairn could not verify the workspace and the run needs
  inspection, and links the run screen and retained records. No terminal
  state of a card-dispatched run leaves the conversation silent.
- **The card's source of truth is structural, not re-parsed:** the
  envelope's run result carries the structured composed record data —
  disposition, files changed from git, protected-work result, bounded
  evidence, commit state, and the worker's claims labeled as claims — the
  same values that authored the report, today discarded inside
  `cairnWorkerRecords` after rendering. Extending `SerialRunResult` with
  that composed structure is a named core seam change of this chunk. The
  card renders from it deterministically; the conductor is never involved.
- **Persistence:** the card is a new envelope-authored entry role in the
  project-local conversation store. The store's reload filter (which today
  keeps only `owner` and `cairn` roles and would silently drop anything
  else) learns the new role, so cards survive restart. Prompt assembly
  maps persisted cards into the model's history as clearly labeled
  envelope-authored content — never as conductor prose — so the card stays
  in view on later turns, which the constitution's commentary rule
  depends on.
- **Commentary:** after the card posts, the conductor takes one
  commentary turn, automatically. Its briefing for that turn carries the
  card's structured facts and the labeled claims — the report's
  separation, verbatim. This is a paid conductor turn initiated by the
  envelope rather than an owner send; the connect card's standing-consent
  wording gains one sentence naming it (Chunk 6), and reconnection under
  the updated wording is the consent for it. If the body is disconnected
  or the turn fails, the card stands alone; the envelope's truth never
  waits on the brain.

## Chunk 5 — The push chip

- **Trigger (a git fact, computed locally):** this is new machinery —
  nothing in the codebase computes an ahead-count today, and it does not
  enter the conductor's briefing (which would change the connect
  disclosure; it deliberately does not). After a **DONE** result card
  posts, the app layer runs a local, network-free
  `git rev-list --count @{upstream}..HEAD` for the project. A positive
  count surfaces a chip under the result card:
  "This project is N commits ahead of `<remote>`. Push?" — a plain count
  of all local commits, whatever their origin; the word "verified" does
  not appear, because the envelope has not verified the owner's own
  commits and never claims to. STOPPED and error cards trigger no chip;
  no tracked remote means no chip (remote setup is a Phase 5 on-ramp
  concern).
- **Press opens the contract's pause, then the owner approves that exact
  action:** the chip opens a pre-push confirmation showing the exact
  target (remote name and URL, branch), the effect (the N commit subjects
  that would publish, and — for a public repository — that pushing makes
  them public), and the recovery plan (a pushed commit can be reverted by
  a new commit; publication itself is not recallable). Approving runs one
  plain `git push` and posts the honest outcome — success, no remote,
  auth refused, remote ahead — in plain words, preserving state exactly.
  No retries, no force, no history rewriting, ever. Declining leaves
  everything untouched.
- The contract has no push-specific rule; the governing rule is the
  concrete-risk pause for writing to an external service with a stored
  credential, and this two-step is that pause. Pushes remain
  owner-initiated by construction. The conductor has no channel that
  tells it a chip exists, and none is added; it is not presumed aware of
  chips.

## Chunk 6 — Constitution v2, the contract's one revisit, 0.3.0

Constitution bumps to `conductor-v2`. The task-block schema it teaches
gains `details`, and three rules land, born from observed failures,
invariants pinned by tests like v1's:

- **Citation honesty:** never attribute to a source a fact that source
  cannot contain. The briefing carries records, a git summary, and file
  names — never file contents — so a claim about what code contains is an
  inference and must be spoken as one.
- **Data fidelity:** anything the owner supplies that the task needs goes
  into the card's `details` verbatim; if it does not fit, ask. Never
  invent values.
- **Result commentary:** state result facts only with their source in
  view — the result card or the task's records in the briefing — and name
  which. A result fact found in neither is not the conductor's to state.
  (This extends v1's "the last report says…" sourcing rule; it does not
  replace it.)

The conductor-v1 eval row becomes historical; the eight scenarios deserve
a fresh conductor-v2 run (owner's go, per the eval doc's own rule), with
fabricated sourcing explicitly re-scored.

The deferred contract amendment lands once, in this chunk, scoped for both
of the contract's audiences: workflow step 6 ("write an honest report,
append one log row") remains the standing instruction for an AI working
directly under AGENTS.md — this repository's own tasks included — and the
contract adds that in envelope-dispatched runs, Cairn's runtime authors
the report and log row from its own verification plus the worker's claims.
The connected-conductor section gains the relay (results reach the owner
as an envelope-authored card with conductor commentary, including the
envelope-initiated commentary turn's cost) and names the push affordance
while pushes remain owner-approved per action. The same task reconciles
the milestone line in AGENTS.md and PROJECT.md to the designed behavior
("explained honestly as the envelope's result card with the conductor's
commentary") and updates the connect card's consent wording.

Mirror mechanics, stated precisely: the mirror test byte-guards
CONTRACT-TEMPLATE.md against `core/assets/contract.md` and cairn.html's
embedded `src-contract` block; `core/assets` and `app/resources` copies
regenerate mechanically at build. AGENTS.md is the filled per-project
instance — no test guards it, so the amendment task updates it by hand and
verifies the diff deliberately, as Task 054's version bump did for
cairn.html's two version lines.

Phase 3 closes at **0.3.0**.

## Testing

Every change red-first, through the repo's own workflow.

- **Hardening:** the forged-log-plus-forced-throw construction shows a
  restored log and an honest stop; the quit-grace scenario shows the
  second run refused.
- **Data channel (core):** `details` joins the hostile-input, oversize,
  and duplicate-fence suites; absent stays valid; nothing undeclared
  survives. A details payload through `runSerialTask` reaches the worker
  prompt and the brief byte-for-byte; the two-part integrity digest
  refuses a tampered details exactly as it refuses a tampered outcome.
- **Relay and dispatch (fake body, Playwright):** a scripted conversation
  drives card → inline confirmation (outcome and details shown) → fake
  run → result card; assertions pin that the card renders only envelope
  truth, that details displayed equal details dispatched, that the card
  survives restart, that commentary is visibly separate and arrives only
  after the card, that a disconnected body leaves the card standing, and
  that STOPPED and thrown runs produce their own honest cards.
- **Push chip:** a local bare repo serves as the fixture remote for the
  end-to-end success, no-remote, and remote-ahead paths; the auth-refused
  rendering is covered at unit level by driving the push executor with an
  injected failing pusher. The chip appears only after DONE cards with a
  positive ahead-count; the confirmation lists the exact commit subjects.
- **Constitution:** v2 invariants pinned verbatim; version constant
  asserted.
- **Evals:** manual, owner-run, one conductor-v2 row.

## Sequencing

Hardening (Chunk 1) → data channel (Chunk 2) → inline dispatch (Chunk 3)
→ relay (Chunk 4) → push chip (Chunk 5) → constitution, contract, close
(Chunk 6). Dispatch precedes the relay because the relay's destination is
the dispatching conversation's id, which inline dispatch introduces; the
relay's Playwright flow depends on inline confirmation existing. The
phase's proof is its milestone: one conversation on Cairn itself runs
request → pushback → dispatch → verified DONE → honest explanation as
card plus commentary; then the v2 eval run.

## Out of scope

New worker adapters and the Ollama body (Phase 4); folding the old
screens away and remote setup on-ramps (Phase 5); the living scene
(Phase 6); multi-agent anything (Phase 7); giving the conductor file
contents — the citation-honesty rule leans on the briefing boundary
staying exactly where the contract drew it; reopening the
chat-during-run serial gate; and the remaining deferred minors (the
Codex-noun mislabels in the stop-report text and the run-screen renderer
→ Phase 4 pre-work; the demo-lane status check; the filesChanged
truncation marker) unless one becomes trivially adjacent to a task
already touching its code.

## Version

Phase 3 closes at 0.3.0.
