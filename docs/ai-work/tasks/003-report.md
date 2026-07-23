# Task 003 — Report

What changed:

- `core/src/codex.ts` — the real invocation now uses `--ask-for-approval
  never`, adds `-c windows.sandbox="elevated"` on Windows (config isolation
  via `--ignore-user-config` kept), upgrades a helperless PATH launcher stub
  to Codex's versioned install (newest `%LOCALAPPDATA%\OpenAI\Codex\bin\<hash>\`
  directory containing both the binary and `codex-windows-sandbox-setup.exe`),
  and prepends the launched binary's directory to the child PATH; the task
  prompt now states the exact report and log-row format the verifier checks.
- `core/test/codex.test.ts` — red-first: new argument-contract assertions, a
  versioned-install resolution test, prompt-format assertions, and a hermetic
  seal (fake installs carry a helper marker; LOCALAPPDATA stubbed).
- `app/tests/routing.spec.ts` — the same hermetic seal for the Electron fakes.
- Version 0.0.1 → 0.0.2: three package files and lockfiles, the contract
  version line in CONTRACT-TEMPLATE.md and AGENTS.md, the cairn.html eyebrow
  and embed, regenerated mirrors, and a CHANGELOG entry.
- Task records: 003-brief.md, this report, one log row.

Checks run and real results:

- Red-first: the changed argument assertions and the new resolution test
  failed against the old code for the expected reasons, then passed.
- Suites: core 43/43, cli 9/9, app Playwright 13/13, all green; contract
  mirrors byte-identical (template ↔ core asset ↔ app resource ↔ cairn.html
  embed).
- Real smoke runs through Cairn's own CLI on disposable projects, each
  confirmed by the owner in Cairn's UI:
  1. Run 1: the model created the requested file perfectly and reported
     honestly, but record verification failed — the prompt left the record
     shape implicit, the fresh contract prose had dropped the "Milestone
     movement" line the runtime requires, and the model wrote `completed` in
     the log's Outcome column. Repaired in-task by stating the exact format
     in the prompt.
  2. Run 2: verified DONE with the correct record format; Cairn correctly
     skipped its commit because a cancelled earlier attempt had left an
     orphan 001-brief.md, making the start dirty.
  3. Run 3 (clean project): full path — file created (`cairn commits
     verified work`), records verified, and Cairn created its exact-path
     commit `d88915f "Task 001: complete verified Codex Exec task"` with a
     clean final tree. Every DONE criterion of the brief held.

Incident disclosed: before the test fakes were sealed, one Playwright run
resolved the real versioned Codex install and started real Codex processes
from the app's connected-path tests (up to six starts across two runs, each
killed near a 30-second timeout, cents-scale token cost, disposable temp
projects only). The seal — fake installs carry their own sandbox helper and
tests run against an empty LOCALAPPDATA — makes that escape structurally
impossible; the changelog records it.

How to try it: scaffold a disposable project, then run
`cairn task "Create a file named X.md containing exactly: hello"`, confirm
the one-call disclosure, and inspect `git log` for Cairn's task commit.

Limitations or remaining human judgment:

- A cancelled confirmation still leaves an orphan brief with no report or
  log row, which dirties the next run's start and blocks Cairn's commit —
  the "guarantee terminal records" gap, now reproduced live; strong Task 004
  candidate alongside Cairn-authored records.
- The contract prose and the runtime's record requirements still differ (the
  prose omits the Milestone movement line); the prompt bridges the gap until
  records become Cairn-authored.
- The versioned-install search follows Codex's current updater layout and
  falls back to the PATH binary if that layout changes.

Milestone movement: NO

Disposition: DONE
