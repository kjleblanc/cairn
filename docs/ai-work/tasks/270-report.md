# Task 270 report — Slice 7's owner gate 3, answered

**Lane:** A (the main checkout). **Base commit:** `acd7489`. **Brief committed
alone at:** `eb4af06`. **Contract:** v0.8.0.

Records only. No product file, no test, no stylesheet and no contract file
changed.

## The verdict

**The owner approved all five decisions, on 2026-08-17.** Their words: *"all
five approved"*.

| id | The decision put to the owner | Answer |
|---|---|---|
| `d1` | The disposition is a word with a geometric mark, not a coloured pill. DONE is a filled disc, STOPPED a bar, ERROR a doubled outline, and the run strip uses the same vocabulary so a live run and a settled receipt read alike. | **Approved** |
| `d2` | Provenance is stated in the summary line, in small uppercase — `CHECKED BY CAIRN`, `REPORTED, NOT CHECKED`, `REFERENCE, NOT A VERIFIED RESULT` — so the owner knows what is behind a fold before opening it. | **Approved** |
| `d3` | Every control on the paper is flat, at least 44 × 44, and never fades when disabled. | **Approved** |
| `d4` | Nothing in the result family arrives with motion any more. | **Approved** |
| `d5` | The registration rule is a real left border in the surface's semantic ink. | **Approved** |

**`d2` was flagged as the one to look at hardest** and was approved anyway. It
is the lowest-contrast text in the conversation at **4.77:1** against a 4.5
floor — 12 px bold in the muted ink — down from 5.47:1 before this slice. It
clears the floor and `contrast.spec.ts` measures it on every run, so a
regression would be caught; but it has less headroom than anything else on the
paper, and this record exists partly so a later reader knows that was seen and
accepted rather than missed.

**With this, Slice 7 of 11 is complete, gate included.** Slice 8 may begin.

## What the owner was actually shown

One complete route through a disposable fixture project and an isolated test
profile, captured from the real built app at 1320 × 980 through the local fake
conductor, in a single conversation and in order:

connected desk → question → answered question → proposal carrying a concern →
its attributed request rows → concern set aside → dispatch checkpoint → working
→ **VERIFIED DONE receipt** → both provenance disclosures open → Cairn's
commentary turn → follow-ups.

Presented as a page built from Cairn's own measured tokens and its own
typeface, with each stage on a sheet carrying a registration rule in that
stage's semantic ink, the five decisions as their own section, and an explicit
list of what the captures do not show.

**Why a second capture set existed at all.** Task 267's captures were of the
result end only — six states at three sizes in two themes. The gate asks
whether the workflow *reads as one Cairn conversation*, and endpoint captures
cannot answer that question however many of them there are. A temporary harness
walked the whole route, captured each stage in sequence, and was deleted
immediately afterwards, exactly as Slices 5, 6 and 7 deleted theirs.

## Checks

**`c1` — the verdict is recorded in full. PASS.** All five ids, the decision
each stands for, the owner's answer, the date, and the owner's own words are in
the table above.

**`c2` — the evidence exists where this report says it does. PASS.**

```bash
ls app/shots/task267-gate3/*.png | wc -l   # 30   (15 stages x 2 themes)
ls app/shots/task267/*.png       | wc -l   # 36   (6 states x 3 sizes x 2 themes)
git check-ignore app/shots/task267-gate3   # ignored
```

**`app/shots/` is gitignored, so these images are NOT in any commit.** They are
local evidence on the owner's machine, the same arrangement Slices 5, 6 and 7
used. This report says so plainly rather than implying a future reader can
recover them from Git — if the working copy is lost, the captures are lost, and
what survives is this record and the harness recipe in Task 267's report.

**`c3` — Task 267's records are unchanged. PASS.**

```bash
git diff --stat a7a9b83 -- docs/ai-work/tasks/267-brief.md docs/ai-work/tasks/267-report.md
# (empty)
```

Task 267 still reads "Owner gate 3 is not answered. No owner has seen this."
That was true when it was written and is left standing; this record is what
supersedes it, in the order the two were written.

**`c4` — no product file, no test and no contract file changed. PASS.**

```bash
git status --porcelain -- app core cli AGENTS.md CONTRACT-TEMPLATE.md cairn.html
# (empty)
```

**`c5` — records and Git protection. PASS.** The brief was committed alone
(`eb4af06`) after re-reading the task listing across every branch. The
completion commit stages only this task's exact paths by name. One LOG row,
appearing exactly once. Nothing cleaned, stashed, reset, broadly staged or
history-rewritten. Nothing was written under `docs/ai-work/verdicts/`.

## How to try it

```powershell
cd "C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework"
type docs\ai-work\tasks\270-report.md
dir app\shots\task267-gate3
```

The captures are named for their stage and theme, so reading the directory in
order walks the same route the owner judged.

## Limitations and remaining judgment

- **Four things the captures did not show, and the owner judged without them**,
  which is stated here so the approval is not read as broader than it was: a
  STOPPED or ERROR receipt (the offline demonstration always succeeds), the
  evidence section (it needs images the main process has vouched for, which this
  route does not produce), the manual run screen (TaskRun was deliberately not
  migrated by Slice 7 and is visually unchanged), and the commentary as a
  verified record rather than as something seen on screen.
- **TaskRun still wants its own task.** Slice 7's report explains why it was
  left: making Slice 6's `.rp-conversation`-anchored rules reach a second screen
  needs either a second anchor across roughly 150 selector entries or an `:is()`
  prelude that the anchor guard rejects, and that is a decision about a test
  boundary.
- **`d2`'s 4.77:1 is the tightest measurement on the paper.** Approved, measured
  every run, and worth revisiting first if the owner ever finds small text hard
  to read.
- The milestone did not move; Task 269 moved it, and this task does not touch it.

**Disposition: DONE**
