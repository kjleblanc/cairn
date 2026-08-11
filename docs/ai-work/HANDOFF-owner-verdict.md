# Handoff — the owner-verdict work

Written 2026-08-08 at the end of the session that produced it, so the state
survives a fresh context.

**Spec:** `docs/superpowers/specs/2026-08-07-cairn-owner-verdict-design.md`
(seven Decisions).
**Plan 1 of 4:** `docs/superpowers/plans/2026-08-07-cairn-check-ids-contract-amendment.md`
— **executed** as Task 205.
**Plans 2–4:** not written, and **blocked** — see "What blocks Plan 2".

## Where it came from

The owner asked how to build what they already do by hand: a per-task page
explaining what the work did and what is next, with photo or video evidence,
plus a pass/fail/revise notes section that gets logged.

Research found the request splits in two, and the halves were in very different
states. **The showing half was already shipped** — evidence capture at two run
boundaries, the local album, evidence-led result cards, and the followups
channel for "where we could go next". **The responding half had no machinery at
all**: nothing in Cairn recorded what the owner thought. That is the whole
design.

## Shipped and running

- **Task 205 — contract v0.8.0.** Every brief's checks carry a stable id `cN`,
  and the contract requires the report to answer each declared id and to name
  additions as additions. `briefSkeleton` in `cli/src/flows/claim.ts` emits the
  ids, so it is a rule the tool follows. The id carries **no task number**:
  renumbering rewrites a brief's heading, not its body, so `205.c1` would
  strand. Also corrected the taken-number rule to match what `claim.ts` has
  always done — a number is taken if **any** file begins with it, not only a
  brief — and guarded `AGENTS.md`, the contract copy this repo runs under,
  which every amendment edits by hand and nothing compared to anything.
- **Task 212 — the verdict-path guard.** `changedTaskPaths` in
  `core/src/serial.ts` rejects any path under `docs/ai-work/verdicts/`. Task 215
  later refactored the literal into `serialCandidateReservedRecordClass` and
  applied it in **two** scan paths rather than one.
- **Task 212 — the version invariant.** Contract, `core`, `cli`, `app`, both
  lockfiles and `CHANGELOG.md` all at 0.8.0.

## The mistake worth not repeating

**Two adversarial review rounds each found a fabricated safety property stated
as verified code behaviour, and the second one was introduced by the first
one's fix.**

Round one flagged that a committed verdict copy at
`docs/ai-work/tasks/NNN-verdict.md` would seal a live run
`MODEL_RESULT_NOT_VERIFIED`. Task 204 "fixed" it by moving the copy out of that
directory, justified by the sentence *"any new non-ignored file anywhere in the
tree breaks a run in flight"*.

**That sentence was false.** `changedTaskPaths` rejects only non-owned paths
under `docs/ai-work/tasks/`; every other changed path it **returns as a product
path**, and `expectedCommitSet` is derived from that same set, so the equality
check holds by construction. The move removed the only hard rejection and put
nothing in its place — strictly worse than the bug it fixed, because a worker
could plant a verdict file and Cairn would commit it as verified work.

Proven with a two-arm harness against the real built core rather than argued:

| Worker writes mid-run | Before Task 212 | After |
|---|---|---|
| `docs/ai-work/verdicts/197.md` | **DONE**, file inside `Task NNN: complete verified worker task` | STOPPED |
| `docs/ai-work/tasks/999-report.md` | STOPPED | STOPPED |

Three further claims certified as verified were also false: a brief-count
statistic, the reason `promise`/`answer` were said to be trustworthy, and a
`moved` "contradiction" the owner had already settled in Task 081. Each is
corrected in place in the spec and **marked as a correction** rather than
quietly rewritten.

**The lesson, recorded because it recurred:** resolving a citation is not
testing the claim it supports. The `app/resources/contract.md` "shipping defect"
in Task 203 had every cited fact true — forge bundles it, main reads it — and
was still wrong, because nobody asked whether the file was tracked. It is a
gitignored build artifact.

## What blocks Plan 2

**Task 207 inserted an unnumbered Prerequisite Q** between Plan 1 and Plan 2:
`docs/superpowers/plans/2026-08-07-cairn-quality-intent-and-critic-prerequisite.md`,
from `docs/superpowers/specs/2026-08-07-cairn-quality-intent-and-critic-design.md`.
It states plainly that **Plan 2 may not be written or started until Q1–Q10 are
DONE**. As of 2026-08-08 the lane running it has reached **Q8, stage 3 of 4**
(Tasks 208–218).

## Open design questions Plan 2 must answer

Twelve round-two findings survived refutation and were deliberately left
unfixed, because they are design questions rather than defects in shipped code.
The ones that will bite:

- **Verdicts keyed by task number break under renumbering**, which the contract
  mandates. `renumberTask` moves only brief and report. Key by `runId` or a
  content hash and carry `task` as a display field.
- **There is no cross-process "is a run active" check, and core does not export
  its lock.** The design's no-active-run gate is in-process only. `core/src/lock.ts`
  would need a read-only holder accessor exported through `core/src/index.ts`.
- **`review` cannot express "every check met and the job is still wrong."**
  `pass` auto-derives with no owner override.
- **No `ERROR` disposition** in the schema, though runs can seal one with a null
  task number.
- **"Verdicts append; they never overwrite" is unimplementable** against the
  one-object-per-task path the same Decision specifies.
- **A cross-machine verdict is indistinguishable from a planted one.** The
  marker store is per-machine; `projectHash` is a hash of the folder path, so
  moving or renaming the project orphans every verdict.

## Known-red, and not ours

**`npm test -w cairn-cli` fails to build on `main`.** `c77b86c` (Task 211)
added the `QualityBoundCodexExec*` overloads to `core/src/codex.ts` and never
updated `cli/test/task.test.ts`, which still stubs the single old signature and
has not been touched since Task 177. Task 211's report does not mention the cli
suite. Two `TS2322` errors at `cli/test/task.test.ts:111` and `:119`.

This was verified red on `main` **before** Task 212 merged, and Task 212 touched
no cli source or test. It is a small fix — update the two stubs to match the
overloads — but it sits in the seam the other lane is actively working, so it
was left rather than reached into.

## Gotchas worth not relearning

- **`cairn.html` carries the contract version TWICE** — the page eyebrow and
  the embedded contract — and the mirror test compared only the embedded copy.
  Task 212 added a guard; before it, the public page could advertise a version
  its own shipped contract contradicted with every test green.
- **Bump versions by exact key, never by text replace.**
  `app/package-lock.json` carries `chardet` at a coincidental `0.7.0`.
- **A find-and-replace whose needle survives inside its own replacement is not
  idempotent.** The brief rule's original sentence is a prefix of its
  replacement; a rerun duplicated it in the template, caught by the mirror test.
- **Only three contract copies are hand-edited** — `CONTRACT-TEMPLATE.md`,
  `cairn.html`, `AGENTS.md`. `core/assets/contract.md` and
  `app/resources/contract.md` are gitignored build artifacts; `git add` exits 1
  on them. Regenerate with `core/scripts/sync-contract.mjs`.
- **Counts in this repository decay.** Three of them moved mid-task while this
  work was underway. State the measurement date and commit, or do not state the
  number.
- **Two sessions can share the main checkout.** When that happened, the fix was
  an isolated worktree on a fresh branch off main — Task 197's precedent — and
  the task-number claiming protocol correctly kept 212 reserved across lanes
  with no coordination.

## Worktree state left behind

`.lanes/e` is checked out on **`lane/g`**, the branch Task 212 was built on.
`lane/g` was merged into `main` by fast-forward, so the two are identical and
nothing is pending there. The branch `lane/e` is preserved at `2f71bc7`, and
`git -C .lanes/e checkout lane/e` restores that worktree to what it was.
`lane/c` still carries its two Task 195 commits, untouched.

## Open for the owner

1. **Nothing has been pushed.** Every commit from this work is local.
2. **The cli breakage above** needs routing — to the lane that caused it, or
   its own task.
3. **Whether the owner-verdict design is worth building at all** was never
   claimed by any task here. Plan 1 shipped because the check-id format is
   useful on its own; Plans 2–4 remain a decision.
4. **The corrected spec has not been re-reviewed.** Round one found 39
   survivors, round two found 22. The base rate suggests a third pass would
   find more.
