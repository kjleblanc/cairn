# Task 140 brief: contract v0.6.0 — lanes, not two lanes

**Lane:** B (`.lanes/b`)

## Requested visible outcome

The contract's "Working in two lanes" becomes **"Working in lanes"** at
version **0.6.0**, applying the owner-delegated decisions on the Task 138
spec (`docs/superpowers/specs/2026-07-30-cairn-n-lane-protocol-design.md`):

1. A lane is **one human-driven conversation**, whatever device it speaks
   from; **three lanes by default**, more only by owner amendment.
2. Claim hardening in the contract text: before writing, list
   `docs/ai-work/tasks/` — **a number is taken if its brief file exists,
   committed or not.**
3. Landing etiquette: **main must be between tasks to receive a landing**;
   first ready, first landed; waiters re-sync before attempting.
4. The single-tenant surface is **the profile, not the device** (app token
   generalizes to the future phone).
5. New rule: **an automation is not a lane** — it claims no number, writes
   only in its designated directory, and lanes treat that directory as
   automation-owned.
6. A fresh worktree needs its own dependency install and build before tests
   run (one parenthetical, also in MAINTAINERS.md).
7. The Task 138 spec's status becomes "accepted" with the three questions
   answered inline (cap three; hardening in contract; phone counts as a lane
   only when it works the repo).

Applied to: `AGENTS.md`, `CONTRACT-TEMPLATE.md`, the `cairn.html` embed,
`MAINTAINERS.md` (section reference + parenthetical), the three package files
and locks (0.6.0), and `CHANGELOG.md` (0.6.0 entry naming the delegated
decisions).

## Boundary of intent

- Contract text and its mirrors, the changelog, version strings, the spec
  status block, MAINTAINERS.md, and task records. No runtime behavior change.
- The mobile spec (Task 139) is adopted separately in Task 141.
- No other project touched.

## Checks that show the outcome holds

- `grep "0.5.0"` clean in the four live text carriers; 0.6.0 present.
- All seven decisions visible in the new lane section or the spec status.
- App unit suite and core suite green; diff limited to the named files plus
  task records.

## DONE / STOPPED here

- **DONE:** v0.6.0 text live in every mirror, changelog entry written, tests
  green, owner gets a plain summary.
- **STOPPED:** a mirror can't carry the new text without runtime change, or
  the amendment contradicts evidence from the pilot — say so instead.
