# Task 073 — Brief

Requested visible outcome: review fix on Task 072 (Phase 3 Task 10, the push
machinery). A self-review dispatched against the 072 diff found one real
Important-severity defect in code the implementer added beyond the plan's
literal text: `pushExecute`'s `NO_REMOTE_PATTERN` matched two different real
git failures under one `kind: "no-remote"` and one message, and that message
is false for one of the two.

`task-10-brief.md`'s classification order names only two stderr regexes
(auth, remote-ahead) before "else other". The plan's own fixture recipe
separately requires a plain `git init` directory (no remote at all) to
classify as `kind: "no-remote"`, and "one plain `git push`, no pre-check"
rules out detecting that case any way other than reading the push's own
stderr — so Task 072 added a third pattern,
`/No configured push destination|has no upstream branch/`. The first
alternative is exactly and only the no-remote-at-all case
(`fatal: No configured push destination.`, verified against real git). The
second alternative, `has no upstream branch`, instead fires when a remote
IS configured and the current branch simply isn't tracking it — a real git
message (`fatal: The current branch <name> has no upstream branch.`,
independently verified) but a DIFFERENT state than "no remote configured."
The returned message unconditionally reads "This project has no remote
configured, so there is nothing to push to" — false for that second case.

Details (verbatim from the review):

> `push.ts:44-49` (`NO_REMOTE_PATTERN`) — message is factually wrong for one
> of its two matched cases... Both real states are conflated under one
> `kind: "no-remote"` and one message... this should be split into a
> distinct kind... or reworded to not assert remote absence, before Task 11
> wires it up.

The brief's `PushResult` type fixes the `kind` union to exactly
`"no-remote" | "auth" | "remote-ahead" | "other"` — adding a fifth kind
(e.g. `"no-upstream"`) would depart from that exact, verbatim signature.
The chosen fix instead narrows `NO_REMOTE_PATTERN` to only the alternative
that is both tested by the plan's own fixture recipe and always true when
matched (`No configured push destination`), dropping the untested,
sometimes-false `has no upstream branch` alternative. That real git failure
now falls into the `other` bucket, which reports git's own real wording
rather than a possibly-false named `kind`.

Checks that will show the fix holds:

- All 6 existing `app/tests-unit/push.test.ts` tests continue to pass
  unchanged (none of them exercised the removed alternative — the removed
  code was genuinely untested, exactly as the review noted).
- `npm run typecheck`, `npm run test:unit` (app), `npx playwright test`
  (app), `cd core && npm test` — all green.

DONE means: the `no-remote` kind and its message are true together in every
case that reaches them. STOPPED means any owner-facing string in this module
can still assert something false.
