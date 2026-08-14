# Task 230 report - save the resident-program visual-overhaul plan and handoff

**Lane:** A (the main checkout). **Base commit:** `c3a9575`.
**Brief claim commit:** `77530e2`.

## Outcome

Task 230 saves the owner-approved Cairn visual direction as one executable,
serial implementation plan and one copy-ready fresh-conversation handoff.
No application, runtime, test, package, IPC, store, phone, or generated project
data changed.

The plan freezes the small three-pane resident-program body, face D, slightly
darker dusty-blue shell, warm-paper conversation, chat-first hierarchy, and
retirement of the visible pond, Town, workers, and literal stone scene. It
separates those presentation decisions from the behavior that must survive:
runtime truth, project isolation, approval and cost boundaries, provider/model
identity, evidence custody, result authorship, serial execution, accessibility,
theme persistence, overlay focus, and the currently shipped phone authority.

The implementation is divided into eleven separately claimable serial slices.
The dependency order extracts neutral activity truth before visual shell
surgery, adds semantic foundations before broad restyling, migrates every
owner-facing desktop and phone surface, and removes legacy Town/Pond code only
after all consumers have moved. Four owner gates cover derived character/theme
treatments, the new workspace, one complete request-to-result route, and final
whole-app/phone judgment. Exact first-slice paths and commands make the next
task immediately executable without preclaiming any future number.

The handoff authorizes only Slice 1. It requires a clean post-Task-230
preflight, a brief-only task claim before any reference copy, exact reference
hash verification, composition with Task 229's landed lab, no production
source changes, a fresh production-bundle exclusion test, and a pause for the
owner's fidelity verdict before Slice 2.

## Files touched

- `docs/ai-work/tasks/230-brief.md` - separately committed task claim.
- `docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`
  - authoritative eleven-slice implementation plan.
- `docs/ai-work/HANDOFF-resident-program-visual-overhaul.md` - saved copy-ready
  fresh-conversation prompt.
- `docs/ai-work/tasks/230-report.md` - this closeout.
- `docs/ai-work/LOG.md` - one Task 230 row.

## Verification

### `c1` - the implementation plan is complete and serial: PASSED

Commands run from the repository root:

```powershell
(Select-String -LiteralPath docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md -Pattern '^### Slice [0-9]+').Count
(Select-String -LiteralPath docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md -Pattern '^\*\*Owner gate [0-9]+:').Count
Select-String -LiteralPath docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md,docs/ai-work/HANDOFF-resident-program-visual-overhaul.md -Pattern 'TODO|TBD|Likely paths|activity/ or presence/|resident-program\.\*|expandable activity|supported compact desktop.*540'
```

Results: eleven numbered slices, four owner gates, and no placeholder or
superseded-vagueness matches. The plan names the frozen visual constitution,
current architecture, exact migration order, exact Slice 1 paths and commands,
preservation matrix, coverage matrix, legacy-test classification, lane/mutex
protocol, risk register, and final qualification. Independent architecture,
convention, and correctness reviews all returned clear after their findings
were incorporated.

### `c2` - the handoff can safely start a fresh conversation: PASSED

Commands run:

```powershell
(Select-String -LiteralPath docs/ai-work/HANDOFF-resident-program-visual-overhaul.md -Pattern '^```').Count
(Select-String -LiteralPath docs/ai-work/HANDOFF-resident-program-visual-overhaul.md -Pattern 'brief alone before any source').LineNumber
(Select-String -LiteralPath docs/ai-work/HANDOFF-resident-program-visual-overhaul.md -Pattern '^After that brief-only claim commit, copy').LineNumber
```

Results: the prompt has one balanced fenced block (two fence lines), and the
brief-only claim instruction precedes reference copying (lines 199 and 201 in
the checked revision). It verifies Task 229 and Task 230 completion, inventories
all lanes before choosing a number, protects Task 229's inert Builder surface,
permits only lab/spec/reference/test work from Slice 1, and stops at Owner gate
1. The independent handoff and convention reviewers returned clear.

### `c3` - the documents reflect the actual settled repository: PASSED

Commands run:

```powershell
git log -3 --oneline
rg -n '^Disposition:' docs/ai-work/tasks/229-report.md
Get-FileHash -Algorithm SHA256 -LiteralPath C:\Users\KenJL\.codex\generated_images\019ffd1c-5e39-7273-89bb-aeff037f9650\exec-916fd1da-c80e-47ca-8be7-b725b8a39398.png,C:\Users\KenJL\.codex\generated_images\019ffd1c-5e39-7273-89bb-aeff037f9650\exec-2d6630ac-e3b0-4191-9618-8c30e34589c5.png
```

Results: Task 229 is DONE at `c3a9575`; Task 230's brief-only claim is
`77530e2`. The approved darker-UI image hash is
`5B56B4A7018D35BA4D815DD161E591470092915E11A705873E758B3F698CF470`; the
face-D board hash is
`AFCAD4FF92CF8C07B7F1E00B34B1D28E2F2A12F70B964EDB454AF275738EC5D0`.
The audited renderer, Main, phone, lab, test, theme, overlay, and runtime paths
all exist at this baseline. The plan accurately records desktop
System/Light/Dark, the 760-by-620 supported minimum, the phone's system-scheme
and self-contained font exceptions, the neutral activity extraction, the
two-location app-token discipline, and Task 229's product-dark boundary.

### `c4` - records and Git isolation are exact: PASSED

Commands run after adding the closeout records:

```powershell
git diff --check
git status --short --branch
git diff --name-status
rg -c '^\| 230 \|' docs/ai-work/LOG.md
```

Results: the diff is whitespace-clean. Before exact staging, the only changes
after the separately committed brief are this plan, handoff, report, and one
LOG edit; the Task 230 row occurs exactly once. The staged-name and final-status
checks are repeated around the exact-path completion commit. No product source
or historical task record changed.

## How to try it

1. Open
   `docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`
   to review the complete roadmap and gates.
2. Open `docs/ai-work/HANDOFF-resident-program-visual-overhaul.md` and copy its
   single fenced prompt into a fresh conversation when ready to begin Slice 1.
3. The next conversation should render the lab-only state/theme board and stop
   for the owner's judgment; it should not begin product implementation.

## Limitations and remaining judgment

- The overhaul has not begun. No future implementation task number is claimed.
- The two external approved images remain at their source paths; Slice 1 owns
  their hash-checked, no-overwrite copies into the repository.
- The already-approved D body, daylight palette, and shell direction are fixed.
  Owner gate 1 judges implementation fidelity and the newly derived expression,
  Dark, and compact treatments.
- The candidate OS-temp fixtures disclosed by Task 229 were not inspected,
  changed, or deleted.
- No provider/model/credential use, dependency change, paid call, network or
  external-service write, push, deployment, or product runtime effect occurred.
  The milestone did not move.

**Disposition: DONE**
