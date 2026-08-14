# Handoff - Cairn Gauntlet restoration

Written with Task 234. The saved implementation plan is the execution authority;
this file is orientation and a copy-ready prompt for the first visible slice.
It starts at the real post-worker/pre-terminal seam, not with a display-only
Task Card or the whole Gauntlet.

Copy the prompt below into a fresh conversation after Task 234 is committed and
its report says `Disposition: DONE`.

```text
Work on: Begin Cairn's Gauntlet restoration described in:

docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md

Execute only Slice 1: pause ordinary Chat at one unsealed candidate. Do not
begin Slice 2 or broaden this into Task Card `cN` contracts, verification-menu
work, critic, repair, Q9, provider, sandbox, cleanup, or qualification work.

Visible beginner outcome

After locally injected conductor and coding-worker transports drive ordinary
Cairn Chat, Cairn pauses before terminal authoring and shows an "Unsealed
candidate" with:

- the accepted request;
- actual changed paths;
- worker claims clearly labeled as claims;
- a plain statement that Cairn has not declared the task complete; and
- the next choice.

The current brief may already exist because the legacy runner writes it before
the worker. No report, LOG row, commit, result card, or `DONE` exists until the
owner chooses "Continue to Cairn's current checks." That choice resumes the
existing terminal path once. "Stop and keep the work for inspection" writes an
honest `STOPPED` close and no commit while Cairn is still alive.

An abrupt process loss cannot write a durable result. It must create no `DONE`
claim and leave the ordinary Git state for the next session to inspect. Do not
add persistence or claim that a crash always produces a STOPPED card.

Start conditions

Do not edit anything until all of these are true:

1. The project root is:
   C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework
2. Task 234's completion commit contains its report with `Disposition: DONE`,
   the saved plan, and this handoff. The brief-only claim commit is `aaa1bed`;
   do not mistake that claim for completion. Verify current history rather than
   assuming the eventual completion hash.
3. The complete working tree is clean and `main` is between tasks: no staged,
   modified, or untracked paths.
4. Inspect every registered worktree and local branch as required by `AGENTS.md`.
   Do not create, delete, reuse, reset, or move a registered worktree.
5. Identify the lowest task number free in `docs/ai-work/tasks/`, every
   registered worktree, and every local branch. Any filename beginning with the
   number takes it. Do not assume a number from this prompt.
6. Before claiming the implementation task, tell the owner plainly that v0 is
   foreground-only: controlled Stop can close honestly, while a crash leaves
   inspectable Git state with no reconstructed run. Obtain the owner's decision.
   If foreground-only is rejected, stop; do not infer authority to build
   persistence or recovery machinery.

If any condition fails, make no edits. Report the exact blocker and smallest
safe next step.

Read completely before editing

- `AGENTS.md`
- `docs/ai-work/PROJECT.md`
- `docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md`
- `docs/ai-work/tasks/234-brief.md`
- `docs/ai-work/tasks/234-report.md`
- `docs/ai-work/tasks/221-report.md` for the normal-route gap
- this handoff

Then inspect current source rather than trusting historical line numbers,
starting with:

- the successful normal `runSerialTask(...)` branch in `core/src/serial.ts`;
- `app/src/main/tasks.ts`;
- the normal Chat activity/result surface;
- directly related shared IPC/types and focused tests.

Tasks 220 and 222-233 and the old critic design are historical references, not
prerequisite reading. Open one only if a concrete current seam requires that
specific evidence. Do not survey or refactor all Q9/Builder code as preparation.

Fixed decisions for this slice

- Builder means Cairn's existing coding-worker adapter. Do not extend Task
  224's tool-free proposal generator, selector, applier, reservation, broker, or
  provider-proof route.
- Normal route means ordinary Chat production IPC/Main/renderer behavior with
  no `CAIRN_TEST_Q9`, task-numbered marker, calibration environment, lab page,
  or alternate product entrance.
- Limit acceptance to Chat. Manual Task Run parity is not required by this
  slice or the current milestone.
- Add one process-local trusted continuation after successful worker-result,
  claims, and Git validation and before terminal report/log/commit/result
  authoring. The original runner retains its starting snapshot, run lock,
  selected adapter, and abort signal while waiting.
- Main may send the renderer only a bounded display projection and resolve
  `continue` or `stop`. Do not export a candidate authority/custody protocol.
- Continue uses the existing normal terminal path once. Controlled Stop while
  alive writes an honest STOPPED close, commits nothing, and leaves edits for
  inspection. Abrupt loss writes no terminal claim.
- Show the accepted request and attributed worker claims. Do not add or imply
  authoritative `cN` checks in this slice; Slice 2 binds those to the worker and
  envelope together.
- Local fakes may replace the conductor and coding worker only at their existing
  injectable transport/adapter seams. The decisive UI check must drive the same
  ordinary Chat IPC and renderer path as production.

Non-goals

Do not add, activate, qualify, repair, or remove:

- a compact Task Card contract, project verification menu, or Evidence Plan;
- critic execution, provider calibration, activation tuples, route
  fingerprints, or exact upstream-provider proof;
- repair execution or a nested second serial run;
- candidate persistence, journals, HMACs, receipts, replay systems, object
  brands, recovery graphs, or new durability machinery;
- Task 224-233 proposal selection/application machinery;
- a new OS/network sandbox campaign or native patch application;
- manual Task Run parity, dependencies, cross-platform qualification, or broad
  cleanup/deletion.

Provider, credential, and app boundary

Make no real conductor, Builder, critic, repair, OpenRouter, or other external
model call in this task. Do not request, read, print, copy, move, or inspect
credentials or connection storage. Do not install anything. Automated evidence
must remain local and inject fakes only at existing conductor-transport and
worker-adapter seams.

Before any app or Playwright run, acquire the repository's single-tenant app
token exactly as the current source and tests require. Wait if the owner or
another lane holds it; never close their app yourself. Use only a task-owned
disposable test project/profile and release only task-owned resources in
`finally`. The isolated E2E profile is intentionally offscreen and unfocusable;
do not use the owner's real profile or add a marker/route that makes E2E visible.

First action

Run a read-only preflight:

- verify root, complete status, recent history, Task 234 DONE, plan, and handoff;
- inspect registered worktrees, local branches, and task filenames;
- trace ordinary Chat acceptance through `task:run` into `runSerialTask(...)`;
- identify the narrow successful-result point after worker/claims/Git validation
  and before report/log/commit/result authoring;
- identify the existing injectable conductor-transport seam, worker-adapter
  seam, and current app-token protocol; and
- confirm that the original serial lock can remain held while Main waits for
  one renderer choice.

After the foreground-only owner decision, restate the exact beginner-visible
outcome. Claim the lowest genuinely free task number by writing its complete
brief with stable `cN` checks for this implementation outcome and commit the
brief alone before any source change. Those task-record ids verify this slice;
they are not a new in-product Task Card.

Implementation boundary

Make the smallest change that adds the process-local checkpoint to the current
normal success branch. Preserve worker authority, worker prompt, routing,
pre-work approval, cancellation, timeout/orphan handling, protected-Git checks,
records, exact-path commit behavior, result cards, commentary, provider
connections, and milestone logic except for the deliberate pause before the
existing successful terminal close.

Do not copy `runSerialTaskToCandidate(...)` or activate
`app/src/main/qualityloop.ts` merely because they already exist. Reuse a small
presentation or helper only if it does not import Q9 lifecycle, persistence,
activation, custody, or recovery rules.

DONE evidence

Do not call this done because a callback unit test or isolated component passes.
Prove through the ordinary Chat product path that:

1. Locally injected conductor and coding-worker transports reach one Unsealed
   candidate through normal Chat IPC/UI with no Q9/task-specific product
   entrance.
2. The candidate shows the accepted request, actual changed paths, attributed
   worker claims, and an unmistakable nonterminal statement.
3. Before a choice, no report, LOG row, commit, result card, or `DONE` exists;
   the already-created brief is the only expected task record.
4. Continue resumes the existing terminal path exactly once.
5. Controlled Stop writes an honest STOPPED report/row, creates no commit, and
   preserves edits for inspection.
6. A thrown continuation, renderer loss, or simulated abrupt process cut cannot
   forge a terminal success or release the run to a competing task while the
   original process remains alive.
7. Protected starting staged, modified, and untracked work remains intact.
8. Focused typecheck, build, Core/App behavior tests, and one ordinary-route UI
   test pass.
9. Under the app token, capture the real checkpoint from the ordinary-route
   offscreen disposable-profile E2E and present that screenshot to the owner in
   chat. Ask one question: "Is it unmistakable that the worker changed files
   but Cairn has not declared the task complete?" Automated Playwright, not the
   owner, exercises Continue and controlled Stop.

If that last readability judgment is part of DONE, wait for the owner's answer;
do not infer it from automated tests. Then use Continue or controlled Stop as
the automated brief scenarios declare and clean up only task-owned test
resources. Do not create a visible E2E phase or use the owner's profile for the
judgment gate.

Stop instead of widening scope if

- the tree is not clean at the expected base or protected work changes;
- the checkpoint cannot remain inside the original serial run and lock;
- the existing success branch cannot resume unchanged after Continue;
- decisive verification is possible only through a Q9/task-specific product
  entrance;
- the work needs persistent state, cryptographic custody, another provider or
  sandbox qualification, a dependency install, or any external call;
- the slice approaches roughly eight production files or 1,000 added production
  lines. Treat that as a manual scope warning, not an automated gate: explain
  the coupling instead of inventing precursor tasks; or
- the same underlying blocker has already stopped twice. Change direction; do
  not build a third proof ladder.

After the owner's judgment, close only this slice with an honest report, one LOG
row, and exact-path commit under `AGENTS.md`. Do not begin Slice 2 in this
conversation. Do not change the milestone: an unsealed-candidate checkpoint by
itself does not prove the full request -> pushback -> dispatch -> verified DONE
-> explanation journey.
```
