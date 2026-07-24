# Task 031 — Brief

Requested visible outcome: the owner-approved Phase 2 core-surgery design
spec exists at `docs/superpowers/specs/2026-07-24-cairn-phase2-core-surgery-design.md`,
recording the design session's decisions — sequencing (debts → record
authorship → adapter registry), the `cairn-claims` fenced claims channel,
and the universal worker-result contract — plus the scope corrections the
session's code-and-history evaluation produced.

Boundary of intent: documentation only. No code, test, contract, version,
or dependency changes. Existing task records and log rows are append-only
history and stay untouched.

Checks that show the outcome holds:

- The spec file exists at the named path and reads as one coherent
  document (no placeholders, no contradictions between decisions and
  chunks).
- `git status` shows exactly this task's files: the spec, this brief, the
  report, and the amended `LOG.md`.
- The log gains exactly one row for Task 031.

DONE means the spec is committed in one exact-path commit with honest
records. STOPPED means the spec or its records could not be committed
cleanly; whatever was written stays for inspection.
