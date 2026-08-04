# Task 179 report - desktop attributed review, result, and accessibility

**Lane:** B

**Base commit:** `ab01d4dae577de19b4bd89143042f8efcb26b56e`

**Brief commit:** `0fce4f3`

**Milestone moved:** NO

## Outcome

Plan 4's fifth ordered slice is complete. Cairn's desktop conversation now
draws structured questions as real labelled keyboard controls, lets the owner
answer with their exact bytes or choose **I'm not sure — you decide**, and uses
one reusable `TaskIntentList` for the proposal, main-owned final preview, and
authenticated result.

Every requirement carries one fixed visible source label: **You said so**,
**You weren't sure**, or **Cairn chose**. Cairn's interpretation and the
owner's exact quotation stay visibly separate. Optional context has its own
untagged section on proposal and confirmation only, so it cannot look like a
requirement or reappear as a result fact. The final preview says plainly that
Start accepts the displayed Cairn-chosen rows.

Main remains the sole action and dispatch authority. The renderer sends the
current main-issued action or risk identity with the exact answer, defer,
correction, or risk reply; it cannot resolve a risk or reconstruct a task
locally. Stale actions reconcile from main without a retry loop. A preview is
discarded before a correction is sent, and the Review dispatch control is
available only for the current, risk-free task action.

Action replies settle through one persistent polite atomic announcement.
Focus moves only to a deliberate destination: the replacement question/task
heading, the settled Cairn reply when no action replaces it, or the recovery
error/composer after failure. Ordinary conversation and streaming tokens do
not enter a live region or steal focus. Retry and queued-send ownership are
explicit, so restored streams, simultaneous sends, and a delayed queue head
cannot duplicate, reorder, or revive action authority or overwrite an
unrelated composer draft.

Authenticated result cards keep checked pictures first, then Cairn-verified
facts, worker claims, **What you asked for**, and the existing actions. A
present accepted request uses the same list, including on accepted ERROR; an
explicit null omits the section; and an older card whose field is absent says
exactly, "This older result did not record where its requirements came from."

Two required adjacent corrections were disclosed before landing. First, the
live conductor constitution still requested the superseded task-control shape,
so the new attributed question/task interface could not be reached from a
normal conductor reply. Constitution v7 now requests the active source-marked
shape, preserves owner-only gates, forbids invented identities, keeps context
outside requirements, and explains the owner-stated, uncertain, and
Cairn-chosen boundaries.

Second, renderer reattachment could not tell a still-live ordinary reply from
a still-live targeted action reply, so a reload or project return could miss
the required settlement announcement and focus. Main's live-stream snapshot
now carries one optional output-only `settlementKind`, added only after main
validates, persists, and consumes the exact targeted reply. It contains no
action or risk ID, request text, or resend/route/dispatch authority; ordinary
replies and commentary omit it. Neither adjacent correction called a provider.

## What changed

- `app/src/main/conductor/constitution.ts` advances the local conductor prompt
  to v7 and makes the active attributed question/task protocol reachable while
  preserving provenance, data-fidelity, and owner-only risk boundaries.
- `app/src/main/conductor/service.ts` attaches only the accepted targeted
  reply's kind to its still-live main-owned stream and omits it from ordinary
  replies and commentary.
- `app/src/shared/ipc.ts` exposes that optional output-only settlement kind in
  the live stream snapshot, with no spent identity or action authority.
- `app/src/renderer/components/QuestionCard.tsx` adds the semantic question
  heading, labelled input, raw Answer/Enter path, whitespace-only guard, exact
  defer control, and busy/stale protection.
- `app/src/renderer/components/TaskIntentList.tsx` adds the single semantic
  requirement list with the three fixed labels, separate interpretations and
  quotations, and optional separate context.
- `app/src/renderer/components/TaskCard.tsx` becomes a pure view of the current
  main-owned task action and unresolved risks, without renderer-authored
  resolution state.
- `app/src/renderer/screens/Chat.tsx` integrates exact action replies,
  main-owned previews, correction invalidation, authenticated result request
  states, atomic settlements and focus, stale reconciliation, and race-safe
  queue/retry/draft ownership.
- `app/src/renderer/app.css` adds supplemental source treatments and long-text
  wrapping at the existing layout widths, with no new motion or breakpoint.
- `app/tests-unit/constitution.test.ts` pins constitution v7 and its active
  attributed-action rules.
- `app/tests-unit/evidencepresentation.test.ts` pins the question, reusable
  list, pure proposal, exact sends, preview/result reuse, ordering,
  announcements/focus, stale reconciliation, and CSS contracts.
- `app/tests-unit/resultcard.test.ts` pins desktop absent/null/present request
  presentation, accepted ERROR, and exact legacy wording.
- `docs/ai-work/tasks/179-brief.md` claimed the task before source work.
- `docs/ai-work/tasks/179-report.md` is this report.
- `docs/ai-work/LOG.md` receives the one truthful Task 179 row.

The only IPC change is the optional inert live-stream `settlementKind`
described above. No dependency, Core or CLI source, phone UI, evidence
custody, credential, provider connection, paid call, project fact, milestone,
publish, push, deployment, or production data changed.

## AI decisions and review record

- Raw answers are retained unchanged; trimming is used only to decide whether
  Answer is enabled. This keeps exact owner quotation custody intact.
- `TaskIntentList` maps protocol sources to fixed owner-facing language in one
  place. Color and border are supplemental; the words carry attribution.
- The renderer never converts display rows back into intent. Final preview and
  accepted result views remain output-only copies authenticated by main/Core.
- One persistent settlement region avoids remount announcements. Destination
  focus is scheduled only after the settled replacement exists; ordinary
  replies are deliberately excluded.
- Main, rather than renderer storage, marks a still-live targeted reply for
  accessibility reattachment. The renderer can use that kind only to choose
  settlement words and focus; it cannot rebuild or resend an action from it.
- Retries keep a one-shot authenticated reply rather than recovering authority
  from visible prose. The queue claims one head at a time, keeps quiet action
  replies ahead of later ordinary messages, and blocks new-conversation
  replacement during that handoff.
- Red-first checks initially failed on the deliberately missing components and
  integration. Review then found stale-action retry exposure, restored-stream
  provenance loss, global draft clobbering, queue reordering, a new-conversation
  crossing, and a claimed-head retry loop. Each was repaired and the affected
  focused/full checks were rerun.
- The final audit found two more races before commit: New conversation could
  clear a message queued during its awaited stop, and a restored targeted
  stream lacked settlement provenance. The first now closes every entrance
  synchronously and drains one ref-backed live queue before awaiting; the
  second uses the bounded main-authored snapshot field above.
- Independent trust, UI, and final queue reviews reported no remaining P0-P2
  finding after those repairs.

## Checks run and real results

1. `cd app && npx.cmd tsc -p tsconfig.unit.json`, then `node --test
   dist-unit/tests-unit/evidencepresentation.test.js
   dist-unit/tests-unit/constitution.test.js
   dist-unit/tests-unit/resultcard.test.js`
   - Passed from the final source tree: **73 tests, 73 passed, 0 failed**.
2. `cd app && npm.cmd run test:unit`
   - Passed from the final source tree: **363 total, 361 passed, 0 failed, 2
     platform-specific skips**.
3. `cd app && npm.cmd run typecheck`
   - Passed with no TypeScript errors.
4. `cd app && npm.cmd run build:vite`
   - Passed: main **62 modules**, preload **1 module**, and renderer **73
     modules** built. The local build needed the worktree read allowance that
     Vite's configuration traversal requires.
5. `cd app && npm.cmd run build:lab`
   - Passed: the design-lab production bundle built **96 modules** with the
     same local worktree read allowance.
6. `git diff --check`; exact changed-path, diff, and final-status inspection;
   independent accessibility/trust/queue review
   - Passed. Core and CLI have no changed paths, generated build/test output
     stayed ignored, and reviewers found no remaining actionable P0-P2 issue.

A local browser preview attempt could not reach the review-lab server after
the server startup timed out, so it produced no screenshot and is not counted
as verification. No Electron, Playwright, real screen-reader, installed
worker, provider connection, or real/paid model process was launched for Task
179.

## How to try it

1. From `app/`, run `npm.cmd run test:unit` for the complete deterministic App
   check.
2. For the quickest focused rerun, use the two commands in check 1 above.
3. After the later fake-run E2E slice lands, open Cairn and have the fake
   conductor produce a question, an uncertain task proposal, and a finished
   result. Verify the same three labels and exact quotation appear in the
   proposal, final preview, and **What you asked for** section, and listen
   through the settlement flow with a screen reader.

Using a connected real conductor to exercise this now would send authorized
conversation/project briefing data to that provider and may consume its paid
quota; that is optional and was not part of this task's verification.

## Limitations and remaining judgment

- The checks inspect source and DOM/accessibility contracts; they are not a
  real screen-reader listen-through or Electron focus run. Human judgment of
  the spoken experience remains open.
- Phone attribution and 390-pixel presentation remain Plan 4 Task 6.
- The complete fake-conductor/fake-worker attribution journey and evaluation
  scenarios remain Task 7.
- The failed browser preview means no new visual screenshot accompanies this
  task. Both production bundles nevertheless compile from the final source.

Disposition: **DONE**
