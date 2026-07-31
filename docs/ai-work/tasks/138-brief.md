# Task 138 brief: N-lane protocol design — from two lanes to however many

**Lane:** B (`.lanes/b`)

## Requested visible outcome

A design spec at
`docs/superpowers/specs/2026-07-30-cairn-n-lane-protocol-design.md`, written
in the same style as the two-lane spec it extends
(`2026-07-28-cairn-two-lane-protocol-design.md`): where the need comes from,
what the two-week evidence says about each of the six existing mechanisms,
the proposed decisions for N lanes, what stays serial, what is deliberately
not built, trade-offs, and open questions for the owner.

The spec must cover: task-number claiming at 3+ lanes (keep or replace
claim-by-commit), the worktree convention for N lanes, landing-queue rules at
N lanes (including "main checkout must be between tasks so the settle check
never compiles uncommitted work"), the app token as the true serializer, a
definition of "lane" that already fits a future phone conversation (a lane is
a human-driven conversation, not a device), and how recurring automations
(like the docs-review cron) relate to lanes (they are not lanes; they write
only to their designated directories).

## Boundary of intent

- One new spec file plus task records. No contract edit, no code, no fixture
  change — adoption follows owner approval, as with v0.4.0.
- E2E parallelism (proving the conductor fixture safe for two processes)
  stays deferred; the spec names it as the real work without doing it.
- The mobile bridge itself is Task 142's subject; this spec only makes the
  lane model ready for it.

## Checks that show the outcome holds

- The spec file exists and addresses every topic listed above.
- Every claim about past collisions is checkable against LOG.md rows.
- The diff touches only the spec and task records.

## DONE / STOPPED here

- **DONE:** the spec is complete per above and presented with a plain summary.
- **STOPPED:** the evidence contradicts expansion (e.g., the two-lane pilot
  shows failures this spec can't honestly resolve) — say so instead.
