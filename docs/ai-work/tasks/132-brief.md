# Task 132 brief: contract-evolution proposal — what seven projects taught

**Lane:** B (`.lanes/b`)

## Requested visible outcome

A written, evidence-cited **contract-evolution proposal** the owner can accept,
reject, or amend section by section, saved at
`docs/ai-work/proposals/2026-07-29-contract-evolution.md`, containing:

1. A candidate **v0.5.0** change list for the Cairn contract — each proposed
   change with its rationale and the specific project evidence it came from
   (file and, where useful, line).
2. A **per-project rollout recommendation** for the six other reviewed
   projects (update, convert, keep-own, or archive).
3. An explicit "not proposed" list — ideas from other projects that were
   considered and rejected, with the reason.

The contract itself (`AGENTS.md`, `CONTRACT-TEMPLATE.md`, mirrors) is **not
changed by this task**. Changing the project rules remains the owner's
decision; this task delivers the basis for that decision.

## Boundary of intent

- No change to any contract file, app code, or test in this task.
- No change to any other project on disk; recommendations are written, not
  applied.
- Existing task records, log rows, and legacy archives are read-only evidence.
- The docs-review staging area (`docs-review/`) is evidence input; it is not
  committed by this task.

## Evidence base (already gathered)

- `CHANGELOG.md` + `docs/legacy/CHANGELOG-pre-reset.md` — why every clause
  exists; which ceremonies were tried and removed.
- `docs-review/REPORT.md` + `docs-review/notes/*.md` — the 2026-07-29
  seven-project review (contract drift findings).
- `docs-review/staged/delve/` — ratchet gates, notary receipts, ADR set,
  decision-authority partition, GPU-quiet-window amendment.
- `docs-review/staged/specdeck/Migration_Brief.md` — three-party
  Orchestrator/Executor/User model, STOP-AND-ASK conventions.
- `docs-review/staged/workflow-docs/` — Core/Verified/Forensic evidence
  levels; reviewer-independence rule.
- `docs/ai-work/LOG.md` — 130 post-reset tasks, including the two-lane
  collisions that produced v0.4.0.

## Checks that show the outcome holds

- The proposal file exists at the named path in lane B's tree.
- Every proposed change names its evidence source; every review finding from
  `docs-review/REPORT.md` is either addressed by a proposal item or appears
  in the "not proposed" list with a reason.
- The diff of this task touches only the proposal file and task records.

## DONE / STOPPED here

- **DONE:** the proposal file exists, is internally complete per the three
  content requirements above, and has been presented to the owner in chat
  with a plain-language summary.
- **STOPPED:** evidence is insufficient to ground a recommendation, or
  drafting reveals the premise (a single canonical contract across projects)
  is wrong — in which case the report says what should happen instead.
