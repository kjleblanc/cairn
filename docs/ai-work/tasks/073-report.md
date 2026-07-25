# Task 073 — Report

Review fix on Task 072 (repo task, Phase 3 Task 10). A code-reviewer subagent
was dispatched against commit `f92e1b7` (base `c9b7895`) per
`superpowers:requesting-code-review`, with independent instructions to
actually run `npm run typecheck`, `npm run test:unit` (app), and `npm test`
(core) rather than trust the 072 report's claimed numbers. It confirmed all
three green on its own, then flagged one Important issue in code the 072
implementation added beyond the plan's literal text.

## The finding

`app/src/main/push.ts`'s `NO_REMOTE_PATTERN` (added because the plan's named
stderr regexes — auth, remote-ahead — don't cover the fixture recipe's
required no-remote case) was `/No configured push destination|has no
upstream branch/`. The reviewer reproduced both real git messages
independently:

- `fatal: No configured push destination.` — no remote configured at all.
- `fatal: The current branch main has no upstream branch.` — a remote IS
  configured; the current branch just isn't tracking it.

Both matched the same pattern, mapped to the same `kind: "no-remote"` and the
same message: "This project has no remote configured, so there is nothing to
push to." That sentence is false in the second case. Since this exact string
is what Task 11 will surface to the owner verbatim, the reviewer's assessment
was that this is disqualifying under the plan's own stop condition ("a
misclassification that could mislead the owner-facing confirmation").

## The fix

`PushResult`'s `kind` union is fixed by the plan to exactly `"no-remote" |
"auth" | "remote-ahead" | "other"` — adding a fifth kind would depart from
the brief's verbatim signature, so that option was rejected. Instead,
`NO_REMOTE_PATTERN` in `app/src/main/push.ts` was narrowed to
`/No configured push destination/` only — the alternative that is (a)
required by the plan's own fixture recipe and (b) always true when matched.
The `has no upstream branch` alternative was removed entirely; that real git
failure now falls into the `other` bucket, which reports git's own real
wording (`"The push did not complete. fatal: The current branch <name> has
no upstream branch."`) instead of a named `kind` that could be wrong.

This also resolves the reviewer's Minor note that the removed alternative
was never exercised by any fixture — it no longer exists to be untested.

## Verification

No test needed to change: all 6 of Task 072's `app/tests-unit/push.test.ts`
tests only ever exercised the "no remote at all" case for `kind: "no-remote"`
(the plan's own fixture recipe), never the untracked-branch case — so they
continued to pass unchanged after the narrowing, confirming the removed
alternative really was dead/untested code rather than something silently
depended on.

- `npm run typecheck` (app) — clean.
- `npm run test:unit` (app) — **59 / 59** (unchanged from Task 072).
- `npx playwright test` (app) — **35 passed**, one clean run.
- `cd core && npm test` — **104 / 104**. No `core/` changes.

Files touched: `app/src/main/push.ts`, `docs/ai-work/tasks/073-brief.md`,
`docs/ai-work/tasks/073-report.md`, `docs/ai-work/LOG.md`.

## Other reviewer notes, and why they were not changed

- **`ipc.ts`'s `push:preview`/`push:execute` handlers skip the `toResult`
  wrapper other handlers use.** Confirmed intentional, not an oversight:
  `CairnApi.pushPreview`/`pushExecute` are typed to return `PushPreview |
  null` / `PushResult` directly (per the plan's verbatim signatures) — not
  `Result<PushPreview | null>` — because both already carry their own
  success/failure discriminant. Wrapping them in `toResult` would double the
  discriminant and depart from the specified interface shape.
- **`summarizeSuccess`'s brand-new-branch fallback is unverified by a
  fixture.** Left as disclosed, low-risk, and out of scope — no fixture in
  this task's brief pushes a branch with no prior remote ref.
- **`ahead` silently falls back to `0` if `rev-list` fails after `@{u}`
  already resolved.** Left as is: `rev-list --count` failing after a
  successful `@{u}` resolution on the same repo has no realistic trigger in
  this module's usage, and `0` is the least alarming wrong answer if it ever
  did (Task 11's chip would simply not offer a push instead of offering a
  larger one).

## Limitations and remaining human judgment

- Milestone movement: NO. This narrows one classification pattern in
  internal machinery; nothing owner-visible existed before Task 11.

Disposition: DONE
