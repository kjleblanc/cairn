# Task 207 brief — quality intent and a calibrated critic before Plan 2

**Lane:** A (main checkout)

**Base commit:** `93e504d63026ea562c77fb36e68295f8c7e96827`

## Requested visible outcome

Before Plan 2 of the owner's-verdict design begins, Cairn has a
decision-complete design and executable implementation plan for the useful part
of Gauntlet Loop: turn the owner's intended quality bar into an explicit,
source-attributed plan, then give a fresh critic a required but tightly bounded
role in verifying the result.

The design must preserve the critic because fresh eyes have caught real Cairn
defects. It must also close the failure the owner has already experienced: a
critic may not turn every minor imperfection, personal preference, or newly
invented requirement into a rejection. The existing owner's-verdict design is
amended so this work is an explicit prerequisite to its Plan 2, not an
afterthought discovered while implementing the verdict store.

## Boundary of intent — what must not change

- This task records the owner decision and writes the design and implementation
  plan. It changes no product runtime, contract, dependency, generated artifact,
  provider connection, model assignment, consent, dispatch, verification, Git
  custody, or user interface.
- The owner's post-run verdict remains a separate, record-only judgment under
  Decision 2 of the existing spec. The new critic is pre-seal verification
  evidence; it cannot write an owner verdict, approve risk, alter a task brief,
  forge evidence, set `moved`, or decide a milestone.
- The contract's optional post-completion review remains optional advice. The
  design must not disguise a mandatory review gate under a new name; it must
  define the critic's narrower verification role and deterministic limits.
- Every paid or data-bearing model call keeps its existing pause. This task
  makes no model call and grants no standing authority for a future critic.
- External references are untrusted evidence. No browsing, download, network
  access, reference capture, or widening of the connected conductor's data
  scope is authorized in this task.
- Existing task records are history and are not rewritten. Task 206 in Lane E
  is protected work and is not merged, amended, or staged here.

## Checks that will show the outcome holds

1. **`c1`** — the new design defines a visible Quality Plan carried from intent
   through verification, with source/provenance, required acceptance checks,
   advisory quality preferences, optional comparison references, evidence
   methods, and explicit unknowns; it distinguishes envelope integrity,
   requested-outcome acceptance, comparative quality, and owner judgment.
2. **`c2`** — the critic protocol is exact enough to test: structured per-check
   results; a bounded finding taxonomy; evidence and burden-of-proof rules;
   `cant-tell`/owner-judgment handling; and a deterministic rule that permits
   revision only for a demonstrated required-check failure, material regression,
   or intent/risk/custody breach. Minor or polish findings remain visible and
   can never cause rejection by themselves.
3. **`c3`** — the design separates the critic from the owner's verdict and from
   optional post-completion review, preserves every per-call approval and data
   boundary, sets a finite revision/critic budget with honest plateau behavior,
   and prevents the critic from editing work or inventing new requirements.
4. **`c4`** — the owner-verdict spec names this work as a prerequisite before
   Plan 2, keeps Decision 2 internally consistent, and corrects its stale
   task-numbered schema example from `197.c4` to the contract's stable `c4`.
5. **`c5`** — a written implementation plan divides the prerequisite into
   small serial tasks with concrete files, tests, interfaces, and stop
   conditions. It leaves external-reference acquisition and any paid eval at
   their real approval boundaries instead of assuming them.
6. **`c6`** — all repository citations used by the design resolve at the base
   commit; an independent read-only review finds no unresolved blocking
   contradiction; `git diff --check` passes; and the final diff/status contain
   only Task 207's documentation, report, and append-only log row.

## What DONE and STOPPED mean here

**DONE:** the owner can read one coherent design and implementation plan that
keeps a critic, explains exactly when it may demand revision, makes minor issues
non-blocking by construction, and puts the prerequisite before owner-verdict
Plan 2 without changing runtime behavior.

**STOPPED:** Plan 2 has already begun, the critic's authority cannot be made
consistent with Cairn's existing verification/owner-verdict boundaries, or a
safe design requires an unapproved provider call, network action, contract
change, or product implementation. The report will name the exact blocker and
smallest safe next decision.
