# Task 235 brief - pause ordinary Chat at one unsealed candidate

**Lane:** A (the main checkout). **Base commit:** `ecaa1de`.

Slice 1 of `docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md`,
begun from `docs/ai-work/HANDOFF-gauntlet-restoration.md`. The owner accepted
the foreground-only recovery tradeoff before this brief was claimed.

## Requested visible outcome

In ordinary Cairn Chat - no `CAIRN_TEST_Q9`, task-numbered marker, calibration
environment, lab page, or alternate product entrance - Cairn stops before it
authors anything terminal and shows an **Unsealed candidate** carrying:

- the accepted request;
- the actual changed paths;
- the worker's statements, clearly labelled as the worker's claims;
- a plain sentence that Cairn has not declared the task complete; and
- the next choice.

The brief the runner already wrote may exist. No report, LOG row, commit,
result card, or `DONE` exists until the owner chooses **Continue to Cairn's
current checks**, which resumes the existing terminal path exactly once.
**Stop and keep the work for inspection** writes an honest `STOPPED` report and
LOG row, creates no commit, and leaves the worker's edits in place.

The checkpoint is foreground-only by the owner's decision. A controlled Stop
while Cairn is alive closes honestly. An abrupt process loss writes no terminal
claim at all and leaves the ordinary Git state for the next session to inspect;
Cairn neither resumes nor reconstructs the run.

## Boundary of intent

- Add one process-local trusted continuation to the existing successful
  `runSerialTask(...)` path, after worker-result, claims, and Git validation and
  before terminal report/log/commit/result authoring. The original runner keeps
  its starting snapshot, run lock, selected adapter, and abort signal while it
  waits.
- Main may send the renderer only a bounded display projection and resolve
  `continue` or `stop`. Do not export a candidate authority or custody protocol.
- Preserve worker authority, the worker prompt, routing, pre-work approval,
  cancellation, timeout and orphan handling, protected-Git checks, records,
  exact-path commit behavior, result cards, conductor commentary, provider
  connections, and milestone logic, except for the deliberate pause before the
  existing successful terminal close.
- Builder means Cairn's existing coding-worker adapter. Do not extend Task 224's
  proposal generator, selector, applier, reservation, broker, or provider-proof
  route.
- Limit acceptance to Chat. Manual Task Run parity is out of scope.
- Do not add a Task Card `cN` contract, project verification menu, Evidence
  Plan, critic, repair, nested serial run, candidate persistence, journals,
  HMACs, receipts, replay, object brands, recovery machinery, Q9 activation,
  calibration, route fingerprints, sandbox campaign, or broad cleanup.
- Do not copy `runSerialTaskToCandidate(...)` or activate
  `app/src/main/qualityloop.ts` merely because they exist. Reuse a small
  presentation or helper only when it imports no Q9 lifecycle, persistence,
  activation, custody, or recovery rule.
- Make no real conductor, Builder, critic, repair, OpenRouter, or other external
  model call. Request, read, print, copy, move, and inspect no credential or
  connection storage. Install nothing and add no dependency.
- Local fakes may replace the conductor and coding worker only at their existing
  injectable transport and adapter seams. The decisive UI check must drive the
  same ordinary Chat IPC and renderer path as production.
- Hold the single-tenant app token for any app or Playwright run, and use only a
  task-owned disposable test project and the isolated offscreen E2E profile.
  Do not use the owner's real profile, and do not add a marker or route that
  makes E2E visible.
- Change no other lane's worktree, no DELVE path, no historical record, and no
  milestone fact. Make no push, publication, or deployment.

## Checks

1. **`c1` - the ordinary route reaches the checkpoint.** Locally injected
   conductor and coding-worker transports drive normal Chat IPC and UI, with no
   Q9 or task-specific product entrance, and Cairn shows one Unsealed candidate
   carrying the accepted request, the actual changed paths, attributed worker
   claims, and an unmistakable nonterminal statement.
2. **`c2` - nothing terminal exists before a choice.** At the checkpoint there
   is no report, no LOG row, no commit, no result card, and no `DONE`; the
   already-created brief is the only expected task record.
3. **`c3` - Continue resumes the existing terminal path exactly once.** The
   choice produces the current terminal result unchanged, through the existing
   close, with exactly one worker invocation and no second run.
4. **`c4` - controlled Stop closes honestly.** Stop while Cairn is alive writes
   a `STOPPED` report and one LOG row, creates no commit, and leaves the
   worker's edits in the workspace for inspection.
5. **`c5` - no failure can forge a terminal success.** A thrown continuation,
   renderer loss, or simulated abrupt process cut creates no `DONE` claim and
   does not release the run to a competing task while the original process is
   still alive.
6. **`c6` - protected work stays intact.** Starting staged, modified, and
   untracked work is byte-identical after every scenario above.
7. **`c7` - focused machine checks pass.** Focused typecheck, build, Core and
   App behavior tests, and one ordinary-route UI test pass, each named with its
   exact command in the report.
8. **`c8` - the owner can read the checkpoint.** Under the app token, an
   ordinary-route offscreen disposable-profile E2E captures the real checkpoint,
   and the owner answers one question about that screenshot: "Is it unmistakable
   that the worker changed files but Cairn has not declared the task complete?"
   Automated Playwright, not the owner, exercises Continue and controlled Stop.

## DONE and STOPPED

**DONE** means the Unsealed candidate holds through the ordinary Chat product
path, all eight checks pass with `c8` carrying the owner's own answer, this
report and one LOG row close the task, and exact-path commits leave the main
checkout clean. A passing callback unit test or isolated component is not DONE.

**STOPPED** means the tree is not clean at the expected base or protected work
changes; the checkpoint cannot stay inside the original serial run and lock; the
existing success branch cannot resume unchanged after Continue; decisive
verification is possible only through a Q9 or task-specific product entrance;
the work would need persistent state, cryptographic custody, another provider or
sandbox qualification, a dependency install, or any external call; or the same
underlying blocker has already stopped this slice twice.

If the slice approaches roughly eight production files or 1,000 added production
lines, that is a manual scope warning, not an automated gate: explain the
coupling to the owner rather than inventing precursor tasks.
