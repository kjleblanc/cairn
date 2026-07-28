# Task 091 — keep project work alive while the owner moves

Requested outcome: A conductor reply and worker session remain owned by their
project when the owner navigates away, and Chat reattaches to the live reply
when the owner returns.

Boundary of intent:

- Preserve the existing one-reply and one-worker-task gates within each
  project.
- Preserve explicit Stop, New conversation, quit cancellation, persistence,
  provider consent, worker confirmation, and result-card behavior.
- Expose only bounded visible stream state: project, conversation id, turn
  kind, start time, and accumulated reply text. Do not expose credentials,
  requests, headers, raw provider events, or another project's state.
- No workspace shell or visual canvas is built in this task.

Checks:

1. A live conductor reply has a project-keyed main-process snapshot and clears
   that snapshot when it settles.
2. Navigating to Project home does not abort the reply.
3. Returning to Chat restores the saved conversation, partial visible text,
   Stop control, and eventual completed reply.
4. Existing conductor, routing, desktop unit, type, and build checks pass.
5. Git shows only this task's exact paths before commit.

DONE means navigation no longer owns the lifetime of project work and the
reattachment behavior is covered by an isolated fake-provider test.

STOPPED means preserving the reply would weaken a gate, mix project state, or
require a provider call or credential operation.
