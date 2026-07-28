# Task 106 brief — the Level 3 spike: six questions against a real Kimi Code CLI

## Requested visible outcome

The six spike questions in the approved Level 3 design
(`docs/superpowers/specs/2026-07-28-cairn-kimi-cli-body-worker-design.md`,
approved by the owner 2026-07-28: "I approve, build it") are answered by
recorded fact, and the spec is amended with those findings:

1. Does `kimi -p` accept a piped stdin prompt? Exact argv and Windows
   shim/shimless spawn behavior of the installed `kimi`.
2. The full stream-json schema: event shapes, usage/token records, terminal
   marking, retry notices, exit codes for success / provider failure /
   auth failure.
3. The ACP auth probe: real `initialize` + `authenticate` behavior
   signed-in vs signed-out, startup cost, session-store disturbance.
4. Credential storage: separability from config (does a redirected
   `KIMI_CODE_HOME` lose sign-in?); which config knobs (MCP, skills,
   subagents) reach a headless run.
5. The body's shell hazard: can an ACP session be driven to no-shell, what
   is observed when the model attempts Bash under it, does
   `session/cancel` stop a running tool, how does the constitution ride the
   session?
6. Does the CLI distinguish membership OAuth from API-key sign-in in any
   output-free way?

## Boundary of intent — what must not change

- Every concrete risk action pauses for its own owner approval at the
  moment of action, per the contract and the design: (a) installing the
  Kimi Code CLI; (b) the OAuth sign-in, which the owner performs personally
  — the AI never operates or inspects the login; (c) each bounded real
  membership-quota call. The owner's route approval is not blanket approval
  for these.
- No implementation code: no adapter, body, app, core, cli, or test source
  changes. The spike's products are recorded findings and spec amendments
  only. Any throwaway probe scripts live outside the repo (temp dir) and
  are deleted with the spike's end; they never enter Git.
- The parallel lane's in-flight work (`103-brief.md`, the untracked
  `design/`) is untouched. This lane is A (main checkout); number 106 is
  claimed by committing this brief.
- Spike calls are minimal and bounded: the smallest prompts that answer
  each question, a named count of calls per question, no task-shaped work,
  no writes to this repository by the CLI (probe runs happen in a throwaway
  temp directory, not in Cairn's tree).
- Existing records and log rows are history: unchanged. Files that may
  change: this brief, `106-report.md`, one LOG.md row, and the spec
  (findings amendment only).

## Checks that will show the outcome holds

1. Every one of the six questions has a recorded answer marked observed /
  not-observable / blocked, with the exact command or probe that produced
  it.
2. The spec's amendment cites only observed facts; anything not observed
  stays marked as unverified.
3. Final Git status contains only this task's named paths; no probe
  artifacts, no credentials or account details in any record (token-shaped
  output redacted before it reaches disk).
4. Membership-quota spend is reported honestly: how many real calls were
  made.

## What DONE and STOPPED mean here

- DONE: all six questions answered (observed, or marked not-observable with
  the reason), the spec amended, no repo or credential contamination.
- STOPPED: the CLI cannot be installed or signed in, an approval is not
  given at a boundary, or a question cannot be answered safely — findings
  so far are recorded and the owner decides what continues.
