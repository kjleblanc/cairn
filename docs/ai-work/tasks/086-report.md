# Task 086 — Report

## What actually changed

- `docs/superpowers/specs/2026-07-26-cairn-phase4-second-body-design.md` —
  one appended section, "Amendment 2026-07-27 — What the SDK actually is".
  Every section above it is byte-unchanged.
- `docs/ai-work/tasks/086-brief.md`, this report, one LOG.md row.

## How this was found, which is the part worth keeping

A Phase 4 implementation plan was drafted from the spec and put through three
adversarial reviews — spec fidelity, executability, safety. All three returned
a failing verdict, and twelve of their findings were Critical. The useful
signal was not the count but the convergence: three independent lenses landed
on the same defect from three directions, which is what distinguishes a real
hole from a reviewer's opinion.

Tracing each Critical back to its origin showed that five were not plan
mistakes. The plan had implemented the spec faithfully and the spec was
wrong — because it was written from documentation and a design conversation
rather than from the shipped type declarations. Patching the plan would have
re-derived the same holes from the same source, so the spec was amended
first.

The most serious was invisible to the plan by construction. The spec named "a
fake `claude` on PATH" as the protection against invoking the real Claude
Code. That protects the detection probe, which does resolve `claude` off
PATH — and protects the streaming path not at all, because the SDK spawns a
binary bundled inside its own package. Every end-to-end test of a
conversation would have run the real Claude Code against the owner's real
credentials. The spec both forbade that and prescribed a mitigation that
could not deliver it.

## Checks run and their real results

1. Five corrections written, each naming the requirement it replaces and the
   defect it prevents. ✓
2. Every SDK claim verified by reading `sdk.d.ts` and `package.json` from
   `@anthropic-ai/claude-agent-sdk` **0.3.220**, installed in a scratch
   directory outside the repository. Verified: `query({ prompt, options })`;
   `tools: []` documented as "Disable all built-in tools" while
   `allowedTools` is documented as auto-approval with the explicit note "To
   restrict which tools are available, use the `tools` option instead";
   `pathToClaudeCodeExecutable?: string`; `abortController?: AbortController`;
   `settingSources?: SettingSource[]` with `SettingSource = 'user' |
   'project' | 'local'`; `env`; `cwd`; `"type": "module"` with entry
   `sdk.mjs`. ✓
3. Two reviewer claims recorded as false with the correct answer beside them.
   One review stated `pathToClaudeCodeExecutable` does not exist — it does,
   and it is the seam the whole test strategy now rests on. One review
   proposed `disallowedTools: ["*"]` as the empty-tool-set remedy — the
   documented mechanism is `tools: []`. A third claim, that Claude Code has
   no `auth` subcommand and that the spec's detection design was therefore
   built on a guess, was checked directly against the local CLI: `claude
   --help` lists `auth — Manage authentication`, `claude auth status` exits 0,
   and the version is 2.1.202, exactly what task 084 recorded. The spec stood
   and the review was wrong. ✓
4. ESM-only packaging and the `cwd` default recorded. ✓
5. Approved sections unchanged; amendment appended under a dated heading. ✓
6. Log row appended; exact-path commit. ✓

## How to try it

Read the amendment. The claim most worth re-checking before the plan is
rewritten is the one nobody can verify from a type declaration: which
environment variables actually decide the spawned CLI's authentication path.
The amendment names `Options.env` as the lever and requires the implementer
to find out and record it, because the consent sentence promising plan usage
is only true if that is controlled.

## Limitations and remaining human judgment

No behavior changed and no dependency was added; the SDK was installed only
to be read. One correction is a decision rule rather than a design: if the
plan-usage promise cannot be guaranteed, the consent wording changes to match
reality. That may turn out to require the owner rather than the record.

The residual detection risk is worth naming plainly. `claude auth status`
exits 0 while signed in — verified — but nobody has observed its exit code
while signed out, and no test can establish it, because the fake shim defines
the contract it verifies. The design reads exit status only, so a signed-out
CLI that still exits 0 would leave Cairn reporting a body as ready when it is
not.

Disposition: **DONE**
