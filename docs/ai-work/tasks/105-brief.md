# Task 105 brief — design the Kimi Code CLI body and worker adapter (Level 3)

## Requested visible outcome

A design spec exists at
`docs/superpowers/specs/2026-07-28-cairn-kimi-cli-body-worker-design.md` that
designs "Level 3" from the Task 098 scoping conversation: a Kimi Code CLI
conductor body (detection of a locally installed, owner-signed-in Kimi Code
CLI used as the conductor's brain) and a Kimi worker adapter (the same CLI
running one envelope-governed serial task, beside the existing Codex Exec
adapter). The spec is written against Cairn's real seams — the Phase 4
`ConductorBody` design (approved, not yet implemented) and the Phase 2
`TaskAdapter` worker seam (`core/src/routing.ts`, `core/src/codex.ts`) — and
it names every fact that is verified today versus every fact that a spike
must settle before implementation.

## Boundary of intent — what must not change

- Design only. No application, core, cli, or test source changes; no
  dependency, config, contract, or mirror changes; no E2E or build runs
  (nothing here changes behavior they measure).
- No real model calls and no paid calls of any kind. Web research is
  read-only.
- The parallel session's in-flight files are untouched: the untracked
  `design/` directory, `103-brief.md`, `104-brief.md`, and any LOG row or
  records it lands during this task. If its row appears before staging, this
  task's commit stages only its own exact paths.
- Existing task records and log rows are history: unchanged.
- Files that may be created: the one spec, `105-brief.md`, `105-report.md`,
  and one appended LOG.md row.

## Checks that will show the outcome holds

1. The spec exists and answers the questions the Phase 4 spec's own
   amendments teach: detection without inspecting credentials, isolation of
   the child process from host configuration, the consent/disclosure truth
   conditions, process hardening, the fake-lane test protection, and the
   spike gating facts that cannot be verified on this machine (no Kimi Code
   CLI is installed here — only a stray `~/.kimi-code/bin/rg.exe`, confirmed
   again today).
2. Final `git status` and diff contain only the named new files; the
   parallel session's paths are absent from the commit.
3. Root `npm test` still passes (nothing it covers changed, but the tree is
   shared with the parallel session and this proves this task broke nothing).

## What DONE and STOPPED mean here

- DONE: the spec is written, scoped as above, with verified and unverified
  facts plainly separated, and the checks pass.
- STOPPED: the design cannot be made honest against the real seams, or
  isolation from the parallel session cannot be maintained — report, no
  commit.
