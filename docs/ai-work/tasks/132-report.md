# Task 132 report: contract-evolution proposal — what seven projects taught

**Lane:** B (`.lanes/b`) · **Base synced from:** main @ 2318ab6 (Task 130)

## What changed

- `docs/ai-work/tasks/132-brief.md` — the brief, committed alone first (39ab88f)
  to claim the number.
- `docs/ai-work/proposals/2026-07-29-contract-evolution.md` — the proposal:
  eight candidate v0.5.0 changes (P1–P8), nine considered-and-rejected ideas,
  a seven-project rollout table, and five questions for the owner.
- This report and one log row.

No contract file, app code, test, or other project was touched.

## Checks run and their real results

- Proposal exists at the brief's named path — confirmed by writing it.
- Evidence coverage: each of P1–P8 names its source file (and line where
  useful). Every finding in `docs-review/REPORT.md` is addressed: contract
  drift → P5/P6; duplicated guides → Workflow Docs rollout row; per-project
  gaps → the rollout table; heavy delve machinery → P4/P7; SpecDeck's model →
  §3 table + P8; pre-reset ceremonies → §3 table.
- `git status` in lane B before commit: only the proposal, this report, and
  LOG.md modified/added — nothing else.

## How to try it

Read `docs/ai-work/proposals/2026-07-29-contract-evolution.md` and answer §5's
five questions — accept, reject, or amend each of P1–P8. The contract changes
only when you say `Change the project rules: …`.

## Limitations / remaining human judgment

- RunWithFriends' real docs were never readable (nested `runwithfriends/`
  subdirectory), so its recommendation rests on the pre-reset kit's README and
  the review's wrapper-file finding, not on its actual contract text.
- The proposal does not change the contract; whether any item becomes law is
  the owner's decision, section by section.
- Landing into `main` is deferred: lane A holds task 131 (OAuth) in flight
  with uncommitted work in the main checkout. This lane is synced from
  2318ab6; land after task 131 closes, then run the settle check.

**Disposition: DONE**
