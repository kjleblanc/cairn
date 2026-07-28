# Task 107 — refresh the public guides for two lanes (lane B's first task)

(Renumbered from 106: this task and the parallel session's Level 3 spike
claimed 106 within the same minute — lane A's claim (`232a9ad`) reached
`main` first, and this lane's merge detected the double-claim exactly as
the contract's backstop prescribes. Their record stands; this one moved.)

Requested outcome: `README.md`, `EVERYDAY-WORKFLOW.md`, and
`MAINTAINERS.md` no longer describe the project as strictly one-chat
serial; they describe one task at a time **per lane** and point at the
contract's "Working in two lanes" rules, in plain beginner language.
This is also lane B's maiden run: it exercises the v0.4.0 protocol end
to end — claim by brief commit, work inside `.lanes/b`, serial landing
with a settle check.

Context: Task 104 amended the contract (v0.4.0) and left this prose debt
in its report. MAINTAINERS.md's contract-changes checklist names
"update the public guides" as step 3 of the same change, so this task
completes the 0.4.0 amendment — no new version bump, no changelog entry.

Boundary of intent:

- Files that may change: `README.md`, `EVERYDAY-WORKFLOW.md`,
  `MAINTAINERS.md`, this task's records, and one LOG.md row. All edits
  happen inside the lane B worktree (`.lanes/b`, branch `lane/b`) and
  land on `main` by merge.
- No contract text changes (`CONTRACT-TEMPLATE.md`, `AGENTS.md`,
  mirrors, companion embed are untouched), no version bump, no code, no
  tests.
- Product-truth stays intact: the worker runtime is still serial —
  README's "Worker execution is still deliberately serial" remains
  correct and stays. The guides gain *maintainer/owner chat* lanes, not
  product concurrency.
- Writing rules in MAINTAINERS.md apply: plain language, one name per
  concept, no machine-local paths as instructions (the lane worktree is
  described as a convention, matching the contract's own wording).
- Other lanes' work (the untracked `design/`, the in-flight Task 103,
  the Task 105 spec edits) is untouched.

Checks:

1. No phrase remains in the three guides that contradicts the contract's
   two-lane rules (grep for the old serial-only claims).
2. The contract-mirror test still passes (nothing it compares was
   touched).
3. Landing ritual: merge `lane/b` into `main`, then the settle check —
   root `npm test` (core + cli) and app typecheck — green on `main`.
4. Both lanes' LOG rows appear exactly once after the merge (union
   attribute in effect).
5. Final diff contains only this task's named paths.

DONE means the three guides read consistently with v0.4.0, the merge
lands cleanly, and the settle check is green — lane B's first full
circuit.

STOPPED means the prose cannot be made consistent without touching
out-of-boundary files, the merge conflicts beyond LOG.md, or the settle
check fails — in which case the lane branch is preserved and reported.
