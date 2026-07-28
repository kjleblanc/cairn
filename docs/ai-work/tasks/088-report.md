# Task 088 — Report

## What actually changed

- `docs/superpowers/specs/2026-07-26-cairn-phase4-second-body-design.md` — a
  third appended amendment, "The types are not the behaviour". The approved
  sections and the first two amendments are byte-unchanged.
- `docs/superpowers/plans/2026-07-27-cairn-phase4-second-body.md` — the Phase
  4 implementation plan enters the repository for the first time, carrying a
  status block that names its six known defects and a new Task 0 (the spike).
- `docs/ai-work/tasks/088-brief.md`, this report, one LOG.md row.

## What three review rounds actually established

The plan was written, reviewed by three adversarial lenses, rewritten against
a spec amendment, reviewed again, rewritten again, and reviewed a third time.
The verdicts never came back clean. The useful part is how the findings
changed shape:

- **Round 1 (12 Criticals): structural.** The prescribed test seam could not
  work, the tool option was the wrong one, and a bridge file was never
  touched. Five findings traced to the spec, which task 086 amended.
- **Round 2 (11 Criticals): detail inside a sound structure.** The reviews
  independently confirmed the parts that were uncertain — the suspected
  import cycle is not real, and `tsc --module NodeNext` really does emit
  `await import(...)` verbatim into CommonJS. One finding was a fact that
  changed a decision, which task 087 amended.
- **Round 3: the instrument, not the artifact.** This round's findings came
  from reading `sdk.mjs` rather than `sdk.d.ts`, and three of them contradict
  what task 087 established from the declarations alone.

That last round is why this task exists. The design had twice been built on
the SDK's type declarations and twice been wrong in ways invisible there.
More iterations of the same method would have kept producing plans that read
correct and were not.

## The three corrections, each verified against `sdk.mjs`

**`skills: []` does nothing.** There is no `--skills` flag in the SDK's
implementation at all; the option only appends `Skill(...)` entries to
`allowedTools`, so an empty array is byte-identical to omitting it. Task 087
named it one of three load-bearing pins. It is not one. `--tools` and
`--setting-sources=` do reach argv, so those two are real, and every claim
this design makes about skill inheritance rests on `tools: []` alone.

**Two required options were never considered.** `--strict-mcp-config` is the
only lever that suppresses MCP servers from project `.mcp.json`, user
settings, and plugins — none of which `settingSources: []` gates. And
`--no-session-persistence` is emitted only when `persistSession === false`;
left alone, the CLI writes every conductor turn to a resumable transcript
under `~/.claude/projects/`, a second at-rest copy of project data in a place
the consent card does not name.

**The fake-lane guard was inverted.** The plan had the real body throw *when*
`CAIRN_FAKE_CLAUDE=1` — firing when a suite remembered the switch and
standing aside when it forgot, which is the only case that matters, and
`conductor.spec.ts`'s `baseEnv()` never sets it. This was the most serious
defect found across all six reviews, and it was introduced by the fix for the
problem it reopened.

## Checks run and their real results

1. `skills` corrected with the absence of the flag quoted; two pins, not
   three. ✓
2. `strictMcpConfig` and `persistSession` each carry their reason and the
   emitted flag that establishes it; the persistence entry names the consent
   consequence and decides it (persistence off) rather than leaving it open. ✓
3. The inverted guard corrected, with the fail-open reasoning stated. ✓
4. Version skew recorded — the turn is pinned to 2.1.202 while the SDK
   composes flags for 2.1.220 — with option-level assertions kept but
   declared insufficient on their own. ✓
5. The spike required first, its four questions named, its approval placed
   outside the agent loop with the reason ("a task that solicits and receives
   approval inside its own execution has not been approved"). ✓
6. Redistribution recorded as the owner's, alongside Decision 2's existing
   deferred question. ✓
7. The plan's status block names six known defects, and Task 0 changes no
   source file and stops before spending anything. ✓
8. Log row appended; exact-path commit. ✓

## How to try it

Read the third amendment, then the plan's status block. Nothing here is
executable except Task 0, and Task 0's first step is to stop and hand back.

## Limitations and remaining human judgment

This corrects task 087, one session old, on a point task 087 stated as
verified. It was verified — against the type declarations, which is where the
verification was insufficient rather than absent. Recorded as a correction
per this repository's rule that a false rationale is itself a defect.

Tasks 1-10 of the plan are committed while known to be defective. That is
deliberate: the sequencing and the constraints are worth keeping, and a
reader who might mistake them for ready work is warned in the header. They
are revised after the spike, not before.

Two questions remain the owner's and neither is answered here: whether to
redistribute Anthropic-licensed binaries inside an MIT installer, and whether
to ask Anthropic about any of this before Phase 5.

Disposition: **DONE**
