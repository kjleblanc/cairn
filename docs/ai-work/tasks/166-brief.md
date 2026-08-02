# Task 166 — proposal cards still appear after a conversation's first dispatch

Lane: **Standard (main checkout)**

Base commit: `144f070f945638c5e6a4af85aa15b34cba6d57ac`

## Requested visible outcome

In one Cairn conversation, after the first proposed task has been approved,
dispatched, and completed, a later well-formed task proposal renders as the
current proposal card with an enabled **Send to dispatch** action. The fix is
the smallest one supported by an offline reproduction, and a regression test
covers the proposal immediately after that first dispatch.

The owner confirmed the failure twice after Task 163: neither the later
model-effort proposal nor a diagnostic-task proposal rendered. Task 153
already covers a second proposal and dispatch, but no saved record covers a
third proposal; Task 155's result-card folding is a possible cause, not an
assumed one.

Tasks 164 and 165 completed in the preceding conversation. The supplied and
saved evidence does not establish whether proposals after those dispatches
rendered, whether the final proposal for this bug rendered, or whether Task
165 was approved through a rendered card. Those points remain unknown and
are not used as proof of a cause.

## Boundary of intent

- Reproduce with Cairn's own fixture conductor and offline worker/demo path.
  Make no real model or paid calls.
- Stay inside this repository. Do not read the running app's logs, profile
  store, credentials, or any other path outside the repository without first
  pausing for the owner's approval.
- Establish from observable main-process state—not model prose—whether the
  failing-turn fixture emitted and parsed a well-formed proposal block, and
  record that result in the report.
- Do not rebuild or relaunch the owner's running app; applying the already
  committed Task 165 bundle remains a separate hand step.
- Do not implement the later model-effort toggle. Its agreed scope remains
  conductor-brain-only effort, beginner wording, an honest unsupported-model
  state, a cost hint, and unchanged consent.
- Preserve task dispatch approval, result-card folding, commentary, queued
  messages, phone behavior, stored conversations, consent, dependencies, and
  security posture except for the minimum change necessary to restore the
  missing proposal card.
- Existing tests are strengthened, not weakened. No dependency changes.

## Checks that will show the outcome holds

- A red-first offline fixture reproduction demonstrates the missing proposal
  after the conversation's first completed dispatch and captures the relevant
  main-process proposal state.
- A regression test drives: first proposal → approval → offline dispatch →
  completed result → later well-formed proposal, then proves the later card
  renders as current with an enabled **Send to dispatch** action.
- Run the focused regression plus every directly affected test suite, then
  `npm.cmd run typecheck`, `npm.cmd run test:unit`, and the relevant app builds.
- Run `git diff --check`, inspect the real diff, and confirm final Git status
  contains only Task 166's exact paths before the final commit.

## DONE and STOPPED

**DONE** means the offline reproduction identifies the real failure, the
smallest in-scope fix makes the post-dispatch proposal visible, the regression
and affected checks are green, the report truthfully states whether main
received a well-formed block, one LOG row is appended, and Task 166 lands as
an exact-path local commit.

**STOPPED** means the failure cannot be reproduced without outside-repository
state or a real model call, a safe fix would cross the boundary above, a check
cannot be repaired in scope, protected work changes unexpectedly, or recovery
becomes unclear.
