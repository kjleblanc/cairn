# Task 203 report — record the owner-verdict design

**Lane:** A (the main checkout). **Base commit:** `4dcdc73`.

## What actually changed

Three files, all documentation. No product source, no test, no build output.

- `docs/ai-work/tasks/203-brief.md` — this task's brief, committed alone to
  claim 203.
- `docs/superpowers/specs/2026-08-07-cairn-owner-verdict-design.md` (new) —
  seven Decisions recording a design that did not exist: the owner's judgment of
  a finished job as a first-class, forgery-proof record.
- `docs/superpowers/plans/2026-08-07-cairn-check-ids-contract-amendment.md`
  (new) — Plan 1 of 4, four tasks, test-first, claiming no task number.
- `docs/ai-work/tasks/203-report.md` and one `LOG.md` row — this record.

## Checks run and real results

Answered by the stable ids the brief declared, in the format this task proposes.
All output was observed in Lane A's terminal and is not saved in the repository.

- **`203.c1` — the spec exists and is internally consistent.** PASSED.
  `grep -nE "TBD|TODO|FIXME|\bXXX\b"` against the spec returns nothing.
  The named risk was real and was found: an early draft of Decision 2 said
  "nothing automated reads it" while Decision 5 grants the conductor read
  access. Resolved in words rather than left to the reader — Decision 2 now
  says **no automated decision consumes it**, and states that reading is not
  consuming.
- **`203.c2` — every file:line citation resolves.** PASSED, and this check
  earned its place. A script extracted all eighteen `file:line` citations and
  read each cited line. **Three citations were wrong before this check ran, all
  three inherited from search results rather than from reading the file:**
  "fifteen of 156 task reports" (the true figures are seventeen of 197, and
  only two quote the owner directly), `evidence.ts:649` (pointed at a loop body
  rather than the `trusted: false` marking, corrected to `:664,675`), and "the
  197 existing tasks" where task numbers reach 202. Two further citations used
  a bare `Chat.tsx:` short form that resolves for someone reading top to bottom
  and not for anyone landing mid-document; both are now full paths. Final state:
  eighteen citations, eighteen resolve.
- **`203.c3` — the plan sequences the contract amendment first and claims no
  task number.** PASSED. The plan's four tasks run mirror-coverage → the
  taken-number rule → the check-id amendment → the generator.
  `grep -E "claims task number|^\*\*Task:\*\*"` against the plan returns
  nothing.
- **`203.c4` — attribution is correct.** PASSED. Four decisions marked **Owner
  decision** (1, 2, 3, 6), two marked **Owner accepted a recommendation**
  (4, 5), and three marked **Cairn chose** (Decision 3's remedy, Decision 7,
  and Order of work). The spec's header states the delegation in the owner's
  own words and records that it covered the design only.
- **`203.c5` — the repository is otherwise untouched.** PASSED.
  `git status --porcelain` showed only this task's own files at every stage.

### Checks added during the work

Named as additions rather than renumbered into the brief's, per the rule this
task's plan proposes.

- **`203.a1` — the existing suites still pass.** PASSED. `npm test --workspaces`
  → core 178 tests, 178 pass, 0 fail; cli 23 tests, 23 pass, 0 fail; exit 0.
  Not required by the brief, since no source changed. Run to establish the
  baseline honestly rather than assume it.

## What this task found that it did not go looking for

- **A shipping defect in the contract mirrors.** `core/test/contract-mirrors.test.mjs`
  checks three copies of the contract: `CONTRACT-TEMPLATE.md`,
  `core/assets/contract.md`, and the embedded block in `cairn.html`. There is a
  fourth — `app/resources/contract.md` — which `app/forge.config.ts:14` bundles
  as an `extraResource` and `app/src/main/main.ts:33-34` reads at runtime.
  **It ships to users and no test covers it.** All four are byte-identical
  today (sha256 prefix `11dc963a9c0404db`), so nothing is currently wrong; an
  amendment that updated three and missed the fourth would ship a stale
  contract silently. This is Task A of the plan, ordered before any contract
  edit, and proven red by deliberate divergence rather than asserted.
- **The taken-number rule's prose is weaker than its code.** The contract says a
  number is taken if its **brief** exists. Task 148's brief was renumbered away
  by `3e0be00`, leaving `148-report.md` and a STOPPED log row, so the written
  rule would have handed 148 to this task. The code refuses it:
  `taskNumbersInDir` matches `/^(\d{3,})-/` against every file
  (`cli/src/flows/claim.ts:37`) and the branch scan applies the same match
  (`:92`). The implementation is stricter than the sentence describing it. This
  is Task B of the plan.

## Repairs and disclosures

- **The claim commit was amended twice, both before any other work.** First
  because PowerShell here-string syntax in a bash heredoc produced a commit
  whose subject line was a bare `@`. Second because the brief's first wording
  described the 148 finding as a defect in the claiming rule without recording
  that the code already handles it correctly — an overstatement against
  Cairn's own tooling, corrected while the commit was local and unpushed.

## How to try it

Read the two documents in order:

1. `docs/superpowers/specs/2026-08-07-cairn-owner-verdict-design.md` — start at
   "Who decided what", which says whose judgment each Decision records.
2. `docs/superpowers/plans/2026-08-07-cairn-check-ids-contract-amendment.md` —
   Plan 1 of 4, and the only one written.

To re-run the citation check that found the three errors, extract every
`` `path:line` `` from the spec and read each cited line; the exact script is in
this task's terminal history and is four lines of Node.

## Limitations and remaining human judgment

- **Nothing is built.** This task records a design and one plan. No verdict
  record, store, queue, or contract amendment exists yet.
- **Plans 2–4 are not written**, deliberately. The spec's "Order of work"
  explains why: the check-id format must survive contact with real briefs
  before anything is built on it.
- **Whether to build this at all is the owner's call and is not claimed here.**
  The owner delegated the design decisions on 2026-08-07; that delegation
  explicitly did not cover spending money, publishing, or proceeding.
- **No paid call was made and nothing was pushed.** The spec's eval scenario is
  recorded as owner-open work. All commits are local. Measured immediately
  before this report landed, `git rev-list --count origin/main..main` returned
  **106**; this task contributed the claim commit among them and adds one more
  with this report. Publishing remains the owner's, untouched.
- **The design is unreviewed by anyone but its author.** Every prior spec of
  this size in this project was adversarially reviewed before it was built on,
  and several came back with Criticals. This one has not been.

**Disposition: DONE**
