# Task 155 brief — a smoother conversation with Cairn

**Lane:** A (main checkout)
**Base commit:** 288f8b0 (Task 154 brief; re-sync main before landing)

## Requested visible outcome

The owner, after Task 153's repair: "It's better, but still a bit cluttered.
How can we make the flow of a conversation with CAIRN smoother?" — and then
approved all four proposed improvements: "All of them sound great."

The four, as the owner saw them:

- **A. Fold away the past** — older envelope result cards collapse into
  one-line chips ("Task 001 — DONE · tap to open"). Only the current moment
  stays expanded.
- **B. Queue instead of bounce** — a message sent while Cairn is answering or
  commenting waits visibly ("will send when Cairn finishes") instead of being
  refused.
- **C. Less chrome** — plain chat bubbles get lighter styling; card weight is
  reserved for decisions.
- **D. "Needs you" dot** — the tucked-away chip shows a dot when an approval
  or decision is waiting inside.

## Boundary of intent — what must not change

- **Protected uncommitted work, never touched or swept into a commit:**
  `app/src/renderer/screens/Picker.tsx`, `app/tests/projects.spec.ts`,
  `app/src/main/main.ts` and `app/tests/bridge.spec.ts` (Task 154's pending
  landing), `design/`, `app/lab-server.log`, `app/launch-build.log`, and task
  records 148-report, 150-brief, 150-report, 154-report.
- `docs/ai-work/LOG.md` rows are appended but the file stays **uncommitted**
  (Task 149 precedent: rows 148–154 await the owner's decision).
- The run gate stays as it is: while a worker run is active the composer is
  closed with its explanation. The queue applies only while Cairn is
  streaming a reply or a result-card comment.
- The dispatch/approval flows (risk chips, Send to dispatch, push flow) keep
  their exact behavior; only the tucked chip gains a passive dot.
- No dependencies added; renderer + CSS only if possible (main-process
  changes only if the queue truly needs them — current design is
  renderer-only).
- Existing tests are extended, never weakened. If a spec pins the composer
  *disabled* while a reply streams, that pin now contradicts the approved
  outcome and is updated deliberately and disclosed.
- `app/tests/projects.spec.ts` is never run (stopped worker's file).
- The pending queue is ephemeral renderer state (like composer text): it does
  not survive a screen change or app restart. Disclosed in the report.

## Checks that will show the outcome holds

- `npm.cmd run typecheck`; unit tests; `build:vite` and `build:lab`.
- New/changed E2E pins in `conductor.spec.ts` (fixture-driven, no paid
  calls): a send during streaming queues visibly and flushes on done; a
  second send replaces the pending text; a settled older result card is
  folded and re-opens on tap; the tucked chip shows the needs-you dot when an
  approval waits.
- Chunked E2E: conductor (line-targeted under the 300s cap), bridge/away/
  serial, routing/smoke/connect-kimi, with the app token held.
- Real-app fixture captures of the four states (folded history, queued
  bubble, lighter chrome, chip dot) inspected and published as the top entry
  of the shots page (`app/shots/` + manifest).
- Full final `git status --porcelain` confirming protected paths untouched
  and exact-path staging only.

## DONE and STOPPED

- **DONE** means: all four behaviors hold in the lane's own tree, checks
  above green, captures inspected, report + LOG row written, one exact-path
  commit made (protected files excluded).
- **STOPPED** means: any of the four can't land without crossing a boundary,
  or checks can't be made green honestly; the report names what was tried
  and the safe state left behind.
