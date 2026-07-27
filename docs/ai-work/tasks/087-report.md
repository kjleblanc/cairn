# Task 087 — Report

## What actually changed

- `docs/superpowers/specs/2026-07-26-cairn-phase4-second-body-design.md` —
  a second appended section, "Amendment 2026-07-27 (second) — Whose Claude
  Code runs". The approved sections and the first amendment are
  byte-unchanged.
- `docs/ai-work/tasks/087-brief.md`, this report, one LOG.md row.

## What the second review round actually showed

The implementation plan was rewritten against task 086's amendment and put
back through the same three lenses. Verdicts were again NOT FAITHFUL, NOT
SAFE TO EXECUTE, and NOT EXECUTABLE, with eleven Criticals — a similar count
to the first round and a different character. The first round failed
structurally: the wrong test seam, the wrong tool option, a bridge file never
touched. This round the structure held and the failures were details inside
it, which is what the reviews independently confirmed by checking the parts
that were uncertain: the suspected import cycle is not real (the path back to
`keystore` is type-only and erases), and the dynamic-import claim is true —
verified empirically, `tsc --module NodeNext` emits `await import(...)`
verbatim into CommonJS rather than downleveling it.

One finding was not a defect in the plan or in the first amendment. It was a
fact about the SDK that changes a decision, and it is why this amendment
exists rather than a third plan revision.

## The finding that changed a decision

`@anthropic-ai/claude-agent-sdk` declares `claudeCodeVersion: 2.1.220` and
ships that binary through eight platform-specific `optionalDependencies`. The
`claude` on the owner's PATH is 2.1.202. So without a pin, the conductor runs
a Claude Code that **Cairn distributes**, signed in with the owner's
credentials.

That falsifies three things this design asserts: the consent card's promise
that conversation runs on the plan "already installed on this computer";
detection, which would certify a binary that never runs; and Decision 2's
policy rationale, which rests on Cairn being a local tool that notices a CLI
the owner independently installed rather than a product that offers a login.
The third is the one that matters beyond code — it is the distinction the
owner's position was argued on, and the plan as written would have quietly
undercut it.

`pathToClaudeCodeExecutable` closes all three together. Notably, an earlier
review had called this option over-build and recommended cutting it, and an
earlier review had asserted it does not exist at all. It is the answer.

## Checks run and their real results

1. Decision 4 states the forcing fact, the three falsehoods, and the rule
   including no silent fallback. ✓
2. The delegation is recorded: the owner was asked, declined to decide, and
   delegated it. ✓
3. The `.cmd`-shim question is named as unverified, assigned to the task that
   introduces the pin, and given an escalation path. Established by reading
   the package: the bundled binary is a native single-file executable and the
   SDK separately exposes `executable: 'bun' | 'deno' | 'node'` with
   `executableArgs`, so a `.cmd` shim is genuinely uncertain rather than
   assumed either way. ✓
4. Each of the three corrections quotes the SDK text that settles it:
   `skills` omitted is "**not** 'skills off'"; `env` set "REPLACES the
   subprocess environment entirely" and omitted means the child "inherits
   `process.env`", a sentence naming `ANTHROPIC_API_KEY`; `Query.close()`
   "forcefully ends the query, cleaning up all resources including... the CLI
   subprocess". The last withdraws a waiver task 086 granted on a reason that
   was wrong. ✓
5. The fake lane's requirement names where the guard belongs (fail-closed in
   the module that imports the SDK) and that a test must fail when it is
   removed. ✓
6. Log row appended; exact-path commit. ✓

## How to try it

Read the second amendment. The claim to settle first is the one that is
explicitly unverified: whether `pathToClaudeCodeExecutable` accepts the form
of `claude` present on this machine. Everything else in Decision 4 follows
from facts already read out of the package.

## Limitations and remaining human judgment

No behavior changed and no dependency was added; the SDK remains installed
only outside the repository, for reading.

Two corrections here are corrections to task 086, one session old: the
tree-kill waiver rested on a reason contradicted by the SDK's own
documentation, and "an explicit `env`" was too vague to be implementable
against an option that replaces rather than merges. Both are recorded as
corrections rather than restated silently, per this repository's rule that a
false rationale is itself a defect.

The residual detection limitation from task 086 stands unchanged and is now
sharper: `claude auth status` exits 0 while signed in, verified on 2.1.202,
but its signed-out exit code has never been observed and no test can
establish it.

Disposition: **DONE**
