# Task 085 — Report

## What actually changed

- `docs/superpowers/specs/2026-07-23-cairn-conductor-route-design.md` — one
  appended section, "Amendment 2026-07-26 — Acquiring software during a
  task". Every section above it is byte-unchanged.
- `docs/ai-work/tasks/085-brief.md`, this report, one LOG.md row.

## The finding, and why it was worth a record

The owner raised installing plugins and tools as a capability Cairn will
eventually need. Checking the repository before answering turned up something
better than an opinion: Cairn already answers the question twice, in opposite
directions.

`core/assets/contract.md:113` names "installing or updating software or
dependencies" as a concrete risk boundary — pause, show the exact target,
effect, likely cost, and recovery plan, proceed only on the owner's approval
of that exact action. The permission is written and mirrored in all four
copies. Meanwhile `core/src/codex.ts:718` runs the worker under
`--sandbox workspace-write`, and `network_access` appears nowhere in the
repository, so the worker cannot reach the network at all. A task needing a
dependency does not ask and get refused; it fails. The rule is enforced by a
wall rather than by a prompt, and nothing has hit it because every task to
date has edited files that already existed.

Two decisions follow, and both are recorded rather than built:

- **The word "tools" was hiding three different risks.** Dependencies inside
  the workspace are Git-revertible and land in the disclosure; software on the
  owner's machine escapes the workspace, Git, and the run; instruction
  packages change how a body behaves, which makes an install channel a
  distribution channel for instructions. Only the first is in scope, and the
  line is drawn on a property the envelope already tracks.
- **Consent is the gate, not the safety.** "May I install `chalk@5.3.0`?" is
  not a question a beginner can answer — refusing stops their work and they
  have no basis to judge — so the prompt would transfer liability without
  transferring understanding. That is the pattern this project exists to
  replace, so the surface follows the dispatch shape instead: name it before,
  show what changed after, keep the undo real.

Category 3 is refused on a concrete ground rather than a general one: Phase 4
pins the Agent SDK's `settingSources` to empty specifically so a body cannot
inherit the host machine's CLAUDE.md, skills, commands, and MCP servers. A
deliberate install channel for instructions would undo the wall Phase 4 is
about to build.

## Checks run and their real results

1. Both sides of the contradiction cited with exact locations; the contract
   line and the sandbox flag were read this session, and the absence of
   `network_access` was established by a repository-wide search rather than
   recalled. ✓
2. Three categories distinguished, the in-scope line drawn on Git
   revertibility, and each exclusion given its own reason. ✓
3. The consent finding recorded. ✓
4. Placed in Phase 5, with Phase 4's "nothing observable changes" criterion
   given as the reason it is the wrong home. ✓
5. Claims labelled: the three repository facts as verified, and the
   consequence — that the worker therefore has no network — as inferred from
   Codex's documented workspace-write default, with a run named as what would
   confirm it. ✓
6. Approved sections untouched; the finding appended under a dated heading. ✓

## How to try it

Read the amendment at the end of the route spec. The claim most worth
checking before anyone builds on it is the inferred one: dispatch a task
through Cairn that requires reaching the network, and confirm the failure is
the sandbox rather than something else.

## Limitations and remaining human judgment

This records a direction; it builds nothing and changes no behavior. The
contract keeps a rule the runtime cannot currently exercise, which is
harmless today and should be reconciled when Phase 5 implements the
dependency path — either the runtime gains the capability the rule governs,
or the rule is scoped to say so. Whether category 2 stays permanently out is
the owner's, not settled here: detection covers the software Cairn itself
needs, but a beginner missing a runtime entirely is a Phase 5 on-ramp problem
that this amendment does not solve.

Disposition: **DONE**
