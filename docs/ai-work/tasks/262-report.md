# Task 262 report — design Cairn's solution-frame gate

**Lane:** A (the main checkout). **Base commit:** `41a2c2e`. **Brief committed
alone at:** `8816b77`. **Contract:** Cairn Contract v0.8.0.

This was a design-only task. No product source, executable test, contract,
dependency, lockfile, or milestone file changed.

## Outcome

Cairn now has one implementation-ready design for a mandatory solution-frame
gate:

- every conductor-created task proposal must state its causal account,
  representation owners and relationship, a remove/replace/reuse alternative,
  and a bound keep/change/diagnose decision;
- a missing or malformed frame creates no TaskCard and cannot fall back to the
  legacy task format;
- Cairn decides when the accepted visible outcome stays the same, while an
  unresolved owner-visible difference gets a neutral pre-task decision paper;
- exact Main-owned action, source, option, reply, restart, correction, and
  anti-replay rules prevent a model or renderer from inventing authority;
- ordinary clarification does not retire the choices, and custom wording can
  resolve directly only while its exact live guard remains bound;
- the accepted frame becomes durable only in the task brief, before the worker
  starts; and
- the design distinguishes enforceable structure from semantic model quality.

The specification also draws a deliberate first-slice boundary. Cross-task
recurrence, automatic attempt counting, oscillation detection, a new mid-run
terminal reason, and manual/offline entry enforcement remain follow-on work.

## Files changed

- `docs/ai-work/tasks/262-brief.md` — the brief-only task claim, committed
  before the design was written.
- `docs/superpowers/specs/2026-08-17-cairn-solution-frame-gate-design.md` — the
  approved design, protocol objects, authority model, lifecycle, owner paper,
  rollout, and verification strategy.
- `docs/ai-work/tasks/262-report.md` — this report.
- `docs/ai-work/LOG.md` — one Task 262 completion row.

## Repository interruption and recheck

After the brief claim, `main` advanced from `8816b77` to `00c5926` while this
lane held an untracked draft. Work stopped for an ownership check. On the
owner's “check again,” the recheck showed that `00c5926` added only
`docs/ai-work/HANDOFF-slice-8-surfaces.md`; it did not touch Task 262's brief,
specification, report, log, product code, contract, or milestone. The sole
uncommitted path remained this task's specification, so work resumed without a
reset, stash, clean, overwrite, or history rewrite.

```powershell
git show --format=fuller --name-status --no-renames 00c5926
# A  docs/ai-work/HANDOFF-slice-8-surfaces.md

git status --short --branch
# main at 00c5926; only the Task 262 specification was untracked
```

## Checks

**`c1` — the approved design is complete. PASS.** The committed specification
contains the failure account, goals and non-goals, current seams, exact protocol
and bound-record shapes, structural invariants, review trigger, owner paper,
reply authority, normal and owner-decision flows, durability, anti-thrashing,
failure handling, activation, component boundaries, verification strategy,
acceptance criteria, and follow-ons. Its final shape was 797 lines, 16 balanced
fence markers, and SHA-256
`1d269955ffa742e185b30b47ae6cbee8c97f963b781ad0f7888cd984aac07715`.

```powershell
rg -n "^## " docs/superpowers/specs/2026-08-17-cairn-solution-frame-gate-design.md
# 16 top-level sections, from Summary through Follow-on work

$p = 'docs/superpowers/specs/2026-08-17-cairn-solution-frame-gate-design.md'
$lines = Get-Content -LiteralPath $p
$fences = (Select-String -LiteralPath $p -SimpleMatch '```').Count
Get-FileHash -Algorithm SHA256 -LiteralPath $p
# Lines 797; fences 16/even; hash recorded above
```

**`c2` — current and proposed behavior are not confused. PASS.** `Existing
seams` names the current constitution, parser, Main action custody, IPC,
renderer, intent, serial, and brief boundaries. New objects and modules are
consistently under `Proposed` headings, and the summary, non-goals, activation,
and acceptance sections state that this design has not shipped. Every named
existing anchor was confirmed present with `Test-Path`.

**`c3` — the forcing function is mechanical and its limit is honest. PASS.**
Structural invariants 1 and 2 require no task action and no legacy fallback for
an absent or invalid frame. The bounds require a real remove/replace/reuse
candidate except for one tightly constrained non-representation `none` case.
The verification section explicitly says deterministic checks cannot prove that
a live model's causal account or alternative is useful; the creature case gets
a separate live-model evaluation gate requiring its own paid-call approval.

**`c4` — decision authority and anti-thrashing are explicit. PASS.** The spec
separates Cairn's same-visible implementation decisions from unresolved
owner-visible choices; binds selections, delegation, corrections, and fresh
owner wording to authenticated sources; makes clarification non-resolving;
prevents saved action text from laundering a lost receipt after restart; reuses
only current equal resolutions; and refuses both duplicate resolved reviews and
the same two options after the owner rejects them. Risk, task review, dispatch,
provider, credential, publication, and result gates stay separate. Three
independent read-only adversarial passes finished clean on authority, durability,
beginner UX, and anti-thrashing after their findings were incorporated.

**`c5` — the specification passes self-review. PASS.** These searches returned
no matches (exit 1), the fence count was even, and the final staged diff check
reported no whitespace error:

```powershell
rg -n -i '\b(TBD|TODO|FIXME|PLACEHOLDER)\b|\?\?\?' docs/superpowers/specs/2026-08-17-cairn-solution-frame-gate-design.md
rg -n '[ \t]+$' docs/superpowers/specs/2026-08-17-cairn-solution-frame-gate-design.md
git diff --cached --check
```

**`c6` — no product, test, contract, or milestone file changed. PASS.** Before
the records were written, this exact scope check was empty:

```powershell
git status --porcelain=v1 -- app core cli AGENTS.md CONTRACT-TEMPLATE.md docs/ai-work/PROJECT.md
# empty
```

The completion diff contains only the specification, this report, and the one
log row; the already-committed brief is the only earlier Task 262 path.

**`c7` — records and Git protection. PASS.** `git show --name-status 8816b77`
shows only `docs/ai-work/tasks/262-brief.md`. Completion staging used the three
exact paths named above, the Task 262 log row appears exactly once, and final
Git inspection was performed after the commit. Nothing was broadly staged,
cleaned, reset, stashed, overwritten, or history-rewritten.

## How to try it

Open
`docs/superpowers/specs/2026-08-17-cairn-solution-frame-gate-design.md` and read
the Summary, Structural invariants, Owner-facing paper, Anti-thrashing rules,
and Acceptance criteria. Those sections give the shortest complete view of the
mechanism and its owner-visible consequences.

## Limitations and remaining judgment

- This task ships a design, not the capability. No conductor proposal is gated
  until a later implementation task lands.
- Structural validation can force an alternative field and reject known
  contradictions; it cannot prove the model found the best alternative.
- The creature behavioral case needs a live paid-model evaluation during
  implementation, behind Cairn's existing exact approval boundary. No paid or
  external call occurred here.
- Cross-task same-cause recurrence, repeated-attempt tripwires, oscillation, and
  mid-run reframing need their own design because they change durable and
  terminal authority.
- The implementation plan intentionally waits for the owner's review of the
  committed specification, as required by the brainstorming workflow.
- The current phone milestone did not move.

**Disposition: DONE**
