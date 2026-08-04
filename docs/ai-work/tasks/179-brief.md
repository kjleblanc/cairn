# Task 179 brief - desktop attributed review, result, and accessibility

**Lane:** B

**Base commit:** `ab01d4dae577de19b4bd89143042f8efcb26b56e`

## Requested visible outcome

Implement Plan 4's fifth ordered slice on Cairn's desktop conversation. The
owner must be able to answer a current structured question directly or choose
**I'm not sure - you decide**, review every proposed and final requirement with
the fixed visible source labels **You said so**, **You weren't sure**, and
**Cairn chose**, and see the same authenticated list after a run under **What
you asked for**.

One reusable `TaskIntentList` must render the proposal, main-owned final
preview, and accepted result view. Exact owner quotations remain visibly
separate from Cairn's plain interpretation; non-requirement context has its own
untagged section on proposal and confirmation only. Starting work says plainly
that the press accepts displayed **Cairn chose** rows.

The result card order must remain checked pictures, Cairn-verified facts,
worker claims, **What you asked for**, then existing actions. A legacy terminal
card with a task number and absent `acceptedRequest` must say, "This older
result did not record where its requirements came from." A new null request
omits the section; an accepted ERROR shows it.

When an action-bearing reply settles, Cairn must announce the settled change
once and move focus to the replacement QuestionCard or TaskCard heading. A
successful reply with no replacement focuses its settled Cairn reply/status;
a failed reply restores focus to recovery/composer. Ordinary conversation
replies do not steal focus.

## Boundary of intent - what must not change

- Main remains the sole action, risk, preview, and acceptance authority.
  Renderer request rows, displayed labels, local component state, conversation
  prose, worker claims, and result cards never become dispatch input.
- Task 177's route generations, one-time preview, atomic Start/Run consume,
  disclosure/paid-call gate, serial run gate, correction/cancel invalidation,
  and accepted ERROR retention remain unchanged.
- Task 178's absent/null/present card states, strict store validation, original
  card digest, persistence, replay/alias custody, and conductor briefing remain
  unchanged.
- Task 173 checked pictures stay first and keep their local evidence custody.
  Claims remain visibly separate from verified facts; request attribution is
  context, never a verified result fact.
- Native consent, concrete-risk, paid-call, and push controls remain separate
  owner-only gates and receive no defer shortcut.
- Preserve Task 171's Lantern on Water layout, approved palette and face
  geometry, the existing 1260/620 breakpoints, still-water and reduced-motion
  behavior. Add no breakpoint, horizontal scrolling, or new motion.
- Phone rendering is Plan 4 Task 6. Full fake-run attribution E2E and eval
  scenarios are Task 7. No phone, Core, CLI, main-process, IPC schema,
  dependency, provider, credential, real/paid model call, publish, push,
  project fact, or milestone change belongs here.
- Source work stays in Plan 4 Task 5's named renderer, CSS, and App unit-test
  files. Any required adjacent correction must be disclosed before landing.

## Implementation plan (AI decisions)

1. Add red source/DOM-contract tests for the reusable list, question controls,
   final preview repetition, result ordering and compatibility copy, exact
   action replies, settled announcements/focus paths, and responsive CSS.
2. Add `QuestionCard.tsx` with a semantic heading, real labelled input, raw
   Enter/Answer submission, whitespace-only disable, and the exact defer
   action. Add `TaskIntentList.tsx` with semantic heading/list structure and a
   fixed protocol-to-owner-label map.
3. Replace TaskCard's local resolved-answer model with a pure current-action
   view: source-marked intent plus context, unresolved main-owned risks, and
   **Review dispatch** only while the exact action is current and risk-free.
4. Integrate question/task actions in `Chat.tsx`, render only main's preview in
   the final panel, discard an open preview before a correction send, and add
   the accepted-request result section after claims for DONE/STOPPED/ERROR.
5. Add one stable polite atomic announcement and explicit focus destinations
   for replacement, successful no-replacement, and failure. Keep token streams
   out of live regions and leave ordinary replies alone.
6. Add source treatments and long-text layout using `min-width: 0`,
   `overflow-wrap: anywhere`, `white-space: pre-wrap`, and wrapping/stacked
   controls at existing widths only; then run focused and full App checks plus
   independent specification, accessibility, and trust-boundary review.

## Checks that will show the outcome holds

1. Renderer tests prove QuestionCard sends raw answers with the exact current
   action ID, defer sends the fixed message plus `kind: "defer"`, whitespace
   stays disabled, and stale/busy actions expose no usable control.
2. One `TaskIntentList` renders proposal, final preview, and result; every row
   has its fixed visible source label without relying on color, interpretation,
   and exact owner quotation where present. Context is untagged and absent from
   results.
3. Result tests pin the order evidence -> verified -> claims -> request ->
   actions, accepted ERROR display, null omission, exact legacy sentence, and
   no attribution made from claims or renderer values.
4. Accessibility tests pin semantic headings/lists/labels, one persistent
   polite atomic settled region, focus to replacement action heading,
   successful no-action reply/status, and failure recovery; token streaming has
   no live region and ordinary replies do not steal focus.
5. CSS tests pin mint **You said so**, dashed amber **You weren't sure**, quiet
   neutral **Cairn chose**, long UTF-16 wrapping, no horizontal overflow seam,
   no new breakpoint, and no new animation/transition.
6. `npm.cmd run test:unit`, `npm.cmd run typecheck`, `npm.cmd run build:vite`,
   and `npm.cmd run build:lab` in `app/`; proportionate unchanged Core/CLI
   compatibility; independent review; `git diff --check`; and exact final
   status all pass.

## DONE and STOPPED

- **DONE:** the current structured question and proposal are keyboard-usable,
  source-marked, correctable, and main-authoritative; the final preview repeats
  the exact request and acceptance meaning; authenticated results show the
  request in the required order with honest legacy/null behavior; settled
  announcements/focus and long-text responsive rules hold; and every named
  check passes.
- **STOPPED:** renderer state can author or revive attribution/dispatch, a
  defer shortcut reaches an owner-only gate, exact owner words are trimmed or
  relabelled, context becomes a requirement, request context appears as
  verified/worker fact, accepted ERROR/legacy/null behavior lies, focus or live
  regions announce repeatedly or steal ordinary focus, Task 173 evidence moves,
  a new breakpoint/motion/overflow regression is required, protected work
  changes unexpectedly, or completion crosses an unapproved external or paid
  boundary.
