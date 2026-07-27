# Task 086 — Amend the Phase 4 spec against the SDK's real types

## Requested visible outcome

The Phase 4 design spec carries a dated amendment correcting five
requirements that were written before anyone read the Agent SDK's shipped
type declarations: where the composed options go and what the
`settingSources` test must pin, how an empty tool set is actually expressed,
what can and cannot protect a test from invoking the real Claude Code, how
the consent sentence about plan usage is made true, and how far the contract
amendment reaches.

## Boundary of intent

Documentation only: no behavior, dependency, or contract change. The
approved sections of the spec may not be edited — the corrections are
appended as a dated amendment, because rewriting an approved decision in
place would hide that it was made later and would hide that the first
version was wrong.

Every factual claim about the SDK must come from the installed package read
in this session, not from a reviewer's assertion and not from recall. The
package is installed outside the repository; this task adds no dependency.

## Checks

- Each of the five corrections names the requirement it replaces and the
  observable defect it prevents.
- Every SDK claim states the version it was verified against, and the
  verification was reading `sdk.d.ts` and `package.json` from an installed
  copy.
- Reviewer claims that turned out to be false are recorded as false, with
  the correct answer beside them — `pathToClaudeCodeExecutable` exists, and
  the remedy for the tool set is `tools: []` rather than the proposed
  `disallowedTools: ["*"]`.
- The ESM-only packaging fact and the `cwd` default are recorded, since both
  change the packaging chunk.
- Approved sections byte-unchanged; the amendment appended under a dated
  heading.
- One log row; exact-path commit of the spec and this task's records.

## DONE / STOPPED

DONE: all six checks hold and the amendment is committed. STOPPED: a
correction turns out to need an owner decision the record cannot supply.
