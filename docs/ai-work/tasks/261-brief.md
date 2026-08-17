# Task 261 brief — the owner-verdict documents become true, and the gate is retired

**Lane:** A (the main checkout). **Base commit:** `cf6033b`.

**261 is the lowest genuinely free number.** Every filename beginning with a
number was listed across the main checkout, all five populated lane worktrees
(`.lanes/b,c,d,e,h`) and all thirteen local branches: the highest taken number
is 260 and nothing begins with 261. The number was not taken from a handoff.

**A second session is active in this checkout.** HEAD moved twice while this
task was being prepared (`e9f9fdd`, then `cf6033b`). This task touches only
`docs/`, commits by exact path, and re-reads `git log` before committing.

## Where this came from

The owner asked for the state of the owner-verdict workstream and was told, by
`docs/ai-work/HANDOFF-owner-verdict.md`, that Prerequisite Q was DONE and Plan 2
was no longer blocked. **Both sentences are false.** Q10 is STOPPED as Task 221
and was never re-attempted. Two verification passes then established that the
spec this workstream runs on carries roughly a dozen statements that are false
or point at code that has moved.

The owner made two decisions on 2026-08-17, from stated options:

- **Owner decision — delete the gate outright.** The four sentences forbidding
  Plan 2 from being written are retired, with no replacement condition.
- **Owner decision — repairs first, then Plan 2.** Correct the documents before
  writing anything on top of them.

**Cairn chose** to split that into three serial tasks rather than one: this
documentation task, then the contract amendment (code and three hand-edited
contract copies), then Plan 2. Each is independently reversible and
independently rejectable, which is the same reason Plan 1 shipped alone.

## The requested visible outcome

Someone opening `docs/superpowers/specs/2026-08-07-cairn-owner-verdict-design.md`
reads a document whose statements about the code are true, whose citations land
on the thing they name, and which no longer forbids the next step. The six
design questions that blocked Plan 2 are answered in it, each answer carrying
how it was established — run, read, or neither — so a Plan 2 author can tell
proof from assertion without repeating the investigation.

`docs/ai-work/HANDOFF-owner-verdict.md` no longer tells its reader something
that is not so.

## The one thing this task must not get wrong

**This document has twice shipped a fabricated safety property stated as
verified code behaviour, and the second was introduced by the first round's
fix.** Every sentence this task writes about what the code does carries an
explicit marking: `(ran)` for executed against built code, `(read)` for resolved
against the file at a named commit, `(UNVERIFIED)` for neither. A correction
that swaps one unproven claim for another is worse than the defect, because it
spends the reader's trust to do it.

## The boundary of intent — what must not change

- **No source changes.** No file under `core/src`, `app/src`, `cli/src`, or any
  test directory is touched. The numberers, the guard, and the runtime are Task
  262's business.
- **No contract copies.** `CONTRACT-TEMPLATE.md`, `AGENTS.md` and `cairn.html`
  are untouched here, and no version moves. Declaring
  `docs/ai-work/verdicts/` reserved is Task 262.
- **Plan 2 is not written here.** This task makes its source true; it does not
  consume it.
- **No sealed record is edited.** Existing task briefs, reports and LOG rows are
  history. This task appends one LOG row and writes one report.
- **The owner's decisions are not re-litigated.** The gate is deleted because
  the owner said so on 2026-08-17; this task records that, and does not argue it
  either way.
- **Nothing leaves the machine.** No push, no paid call, no provider, no
  credential, no dependency, no external write.
- **The critic's capability is not retired with the gate.** The owner's sentence
  wanted a critic and a critic ships. Only the sequencing half is retired.

## Checks

Run from the repository root. Every check names a command whose output a later
reader can reproduce.

1. **`c1` — no document forbids Plan 2 any more.**
   `grep -rn "may not be written or started" docs/` returns nothing, and
   `grep -rniE "before .*plan 2 (begins|starts)" docs/` returns only sentences
   that describe the retired gate in the past tense. Each of the four gate sites
   named in the report carries the owner's dated decision rather than a silent
   deletion.

2. **`c2` — the retirement does not overstate what the owner retired.** The
   quality-intent spec's status block still records the owner's full sentence
   verbatim, still records that a critic was wanted, and states in its own words
   that the calibration bar which was to stop the critic rejecting everything
   for minor issues was never run. Proved by reading the block, not by grepping
   for the word "critic".

3. **`c3` — every citation this task touches resolves.** For each `file:NNN`
   the task edits or adds in the spec, open the file at `cf6033b` and confirm
   the named symbol or text is at that line. Zero mismatches. The report lists
   every citation checked and its result, and separately lists any citation left
   untouched so a reader knows the pass was partial.

4. **`c4` — the false claims are corrected in place and marked as corrections.**
   The spec's existing convention — "every correction is marked where it appears
   rather than quietly rewritten" — is followed for each. A reader can see which
   sentences were once wrong. Nothing is deleted to hide it.

5. **`c5` — no unproven claim is stated as verified.** Every statement the task
   adds about code behaviour carries `(ran)`, `(read)`, or `(UNVERIFIED)`.
   Proved by reading every added paragraph and counting: the report states the
   count of each marking and names every `(UNVERIFIED)` item explicitly.

6. **`c6` — the six answers are recorded and are decision-complete.** Each of
   the six questions carries one decision, its reason, its ground truth with
   markings, and the test that would prove it. A reader can start Plan 2 without
   re-deriving any of them. `grep -c` on the six decision headings returns six.

7. **`c7` — the handoff no longer states anything false.** Each claim in its
   "Update, 2026-08-17" block is either true, corrected, or removed. Every count
   it carries states the counting rule and the commit it was measured at, so it
   can be re-run.

8. **`c8` — the two live defects are recorded, not fixed.**
   `docs/ai-work/verdicts/` is fatal to any run that touches it while no
   contract copy mentions it, and `pendingVerdictCopyRefusal` ignores its own
   `_boundary` argument. Both are written down as Task 262's inbox with their
   file and line, and neither is touched here.

9. **`c9` — nothing outside `docs/` changed.** `git status --short` before the
   commit lists only paths under `docs/`, and `git show --stat` on the commit
   confirms it. No lockfile, no version, no source.

10. **`c10` — the other session's work is intact.** `git log --oneline` is
    re-read immediately before committing; if HEAD moved, the diff is
    re-inspected. The commit stages by exact path, never `git add -A`.

11. **`c11` — the owner can read it.** The owner opens the spec's new "The six
    questions Plan 2 asked" section and the corrected handoff update, and says
    whether they can tell what was wrong, what is now decided, and what is still
    unproven. **This check is the owner's own eyes and cannot be closed by
    Cairn.**

## DONE and STOPPED

**DONE** means `c1`–`c10` hold as written and the owner has answered `c11`. The
spec is true and decision-complete for Plan 2, the handoff is honest, the gate
is retired with the owner's decision recorded, and no source file moved.

**STOPPED** means any of these: a correction could not be verified and would
have shipped as another assertion; the retirement would have to overstate what
the owner decided; a source or contract change turned out to be unavoidable to
make a document true; protected work from the other session changed
unexpectedly; or the owner's `c11` answer says the result is not readable. A
STOPPED here leaves every document exactly as it was found, because every change
in this task is one commit of prose.
