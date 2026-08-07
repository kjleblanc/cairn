# Task 204 report — correct the owner-verdict design against its review

**Lane:** A (the main checkout). **Base commit:** `83dfd0d`.

## Correction to Task 203's record

Task 203's report is sealed and its log row is append-only, so its corrections
are here. **Three claims Task 203 certified as verified are false.**

1. **Task 203 reported a shipping defect that does not exist.** It said
   `app/resources/contract.md` ships to users and no test covers it, and built
   Plan 1's Task A on that. Both `app/resources/contract.md` and
   `core/assets/contract.md` are **gitignored, untracked build artifacts**
   (`.gitignore:8`, `app/.gitignore:4`, `core/.gitignore:3`) regenerated from
   `CONTRACT-TEMPLATE.md` by `app/scripts/copy-assets.mjs` and
   `core/scripts/sync-contract.mjs`. They cannot drift and cannot ship stale.
   The mirror test's coverage was correct. **How the error happened, since that
   matters more than the error:** the shipping half of the claim was verified
   against `app/forge.config.ts:14` and `app/src/main/main.ts:33-34` and both
   are true. The question that falsifies the claim — *is this file tracked?* —
   was never asked. Resolving a citation is not testing the claim it supports.
2. **"120 of 197 briefs carry `## Checks that will show the outcome holds`" is
   false.** Measured 2026-08-07 at `83dfd0d`: of 199 briefs, **122 carry some
   `## Checks` heading across eleven wordings** and **57 use that exact one**.
   Task 203 ran `grep -l "^## Checks"` and reported the result as the count for
   one exact heading.
3. **The `moved` contradiction that set the spec's stakes was already settled.**
   Task 081 (`17318e5`, "the stone keeps its mechanism and loses its false
   claim to verification") recorded the owner's decision that a stone counts
   the worker's claim and is labelled as one, in the contract and the app. Task
   203 presented it as live and offered the design as what would make it
   "visible and dated for the first time".

**Task 203's `203.c2` was therefore itself overstated.** It reported "eighteen
citations, eighteen resolve". `CONTRACT-TEMPLATE.md:176` is the
`## Evidence levels` heading, not the Verified definition quoted at it — that is
`:183`. The honest answer is seventeen of eighteen, now corrected.

**Also corrected:** Task 203's brief and this task's first draft used the
task-numbered id form `NNN.cN`. It is unstable — the contract mandates
renumbering (`AGENTS.md:93`) and `renumberTask` rewrites only the `# Task NNN`
heading (`cli/src/flows/claim.ts:271`), so such ids would survive a renumber
pointing at the old number. The format is now position-only, `c1`…`cN`.

Task 203's disposition stands. It recorded a design and a plan, and it did; the
design and plan were wrong in the ways listed here.

## What actually changed

Three documents. No product source.

- `docs/ai-work/tasks/204-brief.md` — this task's brief, committed alone to
  claim 204, then corrected once (a bare `serial.ts:1315` made a full path).
- `docs/superpowers/specs/2026-08-07-cairn-owner-verdict-design.md` — revised.
- `docs/superpowers/plans/2026-08-07-cairn-check-ids-contract-amendment.md` —
  rewritten.
- This report and one `LOG.md` row.

## The six CRITICALs and where each landed

| # | Finding | Resolution |
|---|---|---|
| 1 | Saving a verdict during a live run seals that run STOPPED | Decision 4: copy moved to `docs/ai-work/verdicts/NNN.md`, **plus** a no-active-run gate on both the write and the commit |
| 2 | The automatic commit tears down an in-flight run, falsifying "changes nothing" | Same gate; Decision 5 now names both directions of interference, not just one |
| 3 | Plan Task A's divergence probe cannot restore a gitignored file, and its check is blind to that | Task A deleted; its replacement probes `AGENTS.md`, which is tracked, so `git checkout` genuinely restores |
| 4 | Plan Task C's regex can never match its own replacement text | Assertions now collapse whitespace before matching; verified by simulation against the plan's own text |
| 5 | Task A reads an app build artifact from core's suite — ENOENT on a fresh clone | Task A deleted |
| 6 | Task A reads a gitignored artifact — CI red on every fresh checkout | Task A deleted |

**Findings 1 and 2 were the same defect, and the review understated it.**
`commitExactPaths` (`core/src/serial.ts:794`) requires the whole changed set to
equal the product paths plus the owned records, so **any** new non-ignored file
anywhere breaks a run in flight — not only one under `docs/ai-work/tasks/`.
Moving the path alone would not have fixed it; the gate is what does.
`core/test/serial.test.ts:763` already proves the mechanism as a passing test,
and `AGENTS.md:105-107` states the rule in words.

**Findings 3, 5 and 6 were one deleted task.** Its replacement closes the gap
that is real: `AGENTS.md` is tracked, hand-edited by every amendment, and
compared to nothing.

The twenty MAJOR and thirteen MINOR findings were addressed in the same pass;
the ones that changed the design rather than the prose are the mandatory-note
contradiction, the `needsYou` pinning, the snapshot-at-seal trust correction,
and the cross-machine "not verifiable here" wording.

## Checks run and real results

Answered by the ids `204-brief.md` declared.

- **`c1` — every surviving CRITICAL resolved.** PASSED; the table above names
  each and where it landed. Placeholder scan across both revised documents
  (`TBD|FIXME|XXX`) returns nothing. One internal contradiction introduced by
  the corrections themselves was caught and fixed: "the responding half does
  not exist at all" against the corrected "the verdict already exists".
- **`c2` — the three false claims are gone and the corrections are dated.**
  PASSED. Each is corrected in place and **marked as a correction** rather than
  silently rewritten, so a reader learns which parts were wrong once. Every
  count now carries its measurement date and commit, because these counts decay
  — Task 201 landed mid-task and moved three of them.
- **`c3` — Plan 1 is executable.** PASSED. Task A deleted. No `git add` in the
  plan names a gitignored path (checked by grep). `test/contract-check-ids.test.mjs`
  is registered in `core/package.json`'s enumerated script, with a step saying
  so. The three pinning regexes were simulated against the plan's own
  replacement text: all three MATCH.
- **`c4` — every citation resolves.** PASSED after two repairs. 53 citations
  across the three documents. **Two were wrong and both were inherited from the
  review's own text without reading the line** — the exact failure this task
  exists to correct. `service.ts:562` is `++oauthGeneration`, not the run gate;
  the real gate is `taskRunningForProject` at `app/src/main/conductor/service.ts:203,794`.
  `AGENTS.md:94` is the tail of the renumber sentence; it starts at `:93`.
- **`c5` — the tree and Task 203's history.** PASSED. `git status --porcelain`
  shows only this task's three files. `git merge-base --is-ancestor` confirms
  both `35f372f` and `212564e` remain reachable from `main` after Lane E landed
  Task 201 and merged.

### Checks added during the work

- **`a1` — the new preload claim is true.** PASSED. `app/src/preload.ts`
  exposes 43 channels and none is a verdict or review channel; the two
  `review` grep hits are `preview` substrings.

## How to try it

Read the spec's status block first — it names, in one paragraph, everything the
review changed. Then Decision 4, which holds the CRITICAL's fix, and Plan 1's
revision note, which explains the deleted task.

## Limitations and remaining human judgment

- **Nothing is built.** Two documents and their corrections.
- **The corrected design has not been re-reviewed.** One adversarial pass found
  39 surviving findings in the first version; a second pass over this one has
  not run, and the base rate suggests it would find more.
- **Plans 2–4 remain unwritten**, and Plan 2 now carries two obligations this
  revision handed it: bringing `briefText()` and `composeWorkerReport` into
  line with the id rule, and the run-gate the verdict store depends on.
- **Whether this design is worth pursuing after a review this damaging is the
  owner's call and is not claimed here.** The owner delegated the design on
  2026-08-07; that did not cover spending money, publishing, or proceeding.
- **No paid call was made and nothing was pushed.** Measured immediately before
  this report landed, `git rev-list --count origin/main..main` returned **111**.
  Publishing remains the owner's, untouched. (A draft of this line said 112,
  written from arithmetic rather than from the command. The same slip was
  caught in Task 203. Run the command.)

**Disposition: DONE**
