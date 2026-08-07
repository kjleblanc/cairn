# Task 204 brief — correct the owner-verdict design against its review

**Lane:** A (the main checkout).

**Base commit:** `83dfd0d` — main after Lane E landed Task 201 and merged.

**Why this task exists.** Task 203 recorded a design and Plan 1 and closed DONE.
An adversarial review then raised 68 findings; 28 were refuted and **39 survived
— 6 CRITICAL, 20 MAJOR, 13 MINOR**. Three claims Task 203 certified as verified
are false, one design choice would break run verification, and Plan 1 is not
executable as written. Task 203's report is sealed (`wx`) and its log row is
append-only, so the corrections land here, in the next task's report, which is
this repository's convention: a false rationale is itself a defect.

## Requested visible outcome

The spec and Plan 1 say only true things and can be executed, and Task 203's
record carries a correction naming every claim that was wrong.

## The corrections this task must land

**Three false claims made in Task 203.**

1. **The "shipping defect" was not a defect.** Task 203 reported that
   `app/resources/contract.md` ships to users and no test covers it. Both
   `app/resources/contract.md` and `core/assets/contract.md` are **gitignored,
   untracked build artifacts** (`.gitignore:8`, `app/.gitignore:4`,
   `core/.gitignore:3`) regenerated from the canonical template by
   `app/scripts/copy-assets.mjs` and `core/scripts/sync-contract.mjs`. They
   cannot drift and cannot ship stale. Only `CONTRACT-TEMPLATE.md`,
   `cairn.html`, and `AGENTS.md` are tracked. The shipping half of the claim was
   verified; the question that falsifies it — *is this file tracked?* — was
   never asked. Plan 1's Task A is built on this premise and is deleted.
2. **"120 of 197 briefs carry `## Checks that will show the outcome holds`" is
   false.** Measured 2026-08-07 at `83dfd0d`: 199 briefs, of which **122 carry
   some `## Checks` heading in eleven different wordings** and **57 use that
   exact one**. The variation is itself an argument for a generator, and it
   belongs in the spec.
3. **The `moved` contradiction that set the spec's stakes was settled.** Task
   081 (`17318e5`, "the stone keeps its mechanism and loses its false claim to
   verification") recorded the owner's decision that a stone counts the worker's
   claim and is labelled as a claim in both the contract and the app. The spec
   presented this as a live contradiction. It is a closed decision.

Related: `CONTRACT-TEMPLATE.md:176` is the `## Evidence levels` heading, not the
Verified definition quoted at it (that is `:183`), so Task 203's `203.c2`
"eighteen citations, eighteen resolve" was itself overstated.

**The CRITICAL.** The spec puts the committed verdict copy at
`docs/ai-work/tasks/NNN-verdict.md`. `changedTaskPaths` (`core/src/serial.ts:758`)
returns null for any path under `docs/ai-work/tasks/` not in the run's
`ownedRecords` — which is exactly `[brief, report, LOG]` (`:1027-1031`) — and
`commitExactPaths` (`:794-816`) requires the whole changed set to equal the
product paths plus those records, so **any** new non-ignored file anywhere
breaks a run in flight, not only one under a task path. `core/src/serial.ts:1315`
stops on HEAD moving. A verdict saved during a live run therefore seals that run
`MODEL_RESULT_NOT_VERIFIED`, permanently accusing a worker of an unverifiable
result. `core/test/serial.test.ts:763` already proves the mechanism, and
`AGENTS.md:105-107` says an automation "never touches task paths".

## Boundary of intent — what must not change

- **Task 203's committed records are not edited.** The report is sealed and the
  log row is append-only. Corrections are additive.
- **The design's core survives.** Recording the owner's verdict, forgery
  resistance, and separate `review`/`disposition` axes are unchanged; the review
  did not touch them.
- **No product source is touched.** Documentation only.
- **No risk boundary moves. Nothing is pushed. No paid call is made.**
- **No count is stated without the date and commit it was measured at.** Counts
  in this repository decay — Task 201 landed mid-task and moved three of them.

## Checks that will show the outcome holds

Ids are position-only (`c1`…`cN`), not `NNN.cN`, because renumbering is the
correction that makes the task-numbered form unstable.

1. **`c1`** — every surviving CRITICAL is resolved in the spec or the plan, or
   is explicitly recorded as accepted with a reason. Evidence: a table in the
   report naming each of the six and where it landed.
2. **`c2`** — the three false claims above no longer appear in the spec, and
   the corrected values are stated with their measurement date and commit.
3. **`c3`** — Plan 1 is executable: Task A deleted; no `git add` names a
   gitignored path; the new test file is registered in `core/package.json`'s
   enumerated test script; the pinning regex matches the text the plan tells the
   worker to write. Evidence: the regex checked against the replacement text
   character by character, and `grep` for the ignored paths in every `git add`.
4. **`c4`** — every file:line citation in both revised documents resolves to
   what it claims, re-run after the edits, reporting the count checked.
5. **`c5`** — the working tree shows only this task's own files, and Task 203's
   two commits remain reachable from `main`.

## What DONE and STOPPED mean here

**DONE:** the corrections are committed, all five checks pass, and a reader of
Task 203's record is told plainly what in it was wrong.

**STOPPED:** a correction cannot be verified, or fixing a CRITICAL turns out to
require a design decision the owner has not delegated. The owner delegated the
design on 2026-08-07; that did not cover spending money, publishing, or whether
to build this at all.

**Remaining human judgment.** Whether the design is still worth pursuing after a
review this damaging is the owner's call and is not claimed by this task.
