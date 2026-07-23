# Task 003 — Wire the proven Codex Exec invocation into Cairn

Requested visible outcome: a real `cairn task` (CLI or Desktop) run on
Windows can actually write files — the adapter uses the invocation Task 002
proved end-to-end, and one owner-approved real smoke call through Cairn's own
runtime creates a requested file in a disposable project with Cairn-verified
records.

Boundary of intent, from the Task 002 evidence:

1. `core/src/codex.ts` — `prepareCodexExecRequest` replaces
   `--ask-for-approval on-request` with `--ask-for-approval never` and, on
   Windows, adds `-c windows.sandbox="elevated"` (config isolation via
   `--ignore-user-config` stays).
2. `core/src/codex.ts` — command resolution prefers a Codex install whose
   directory contains the sandbox helpers: when the PATH-resolved binary has
   no adjacent `codex-windows-sandbox-setup.exe`, search
   `%LOCALAPPDATA%\OpenAI\Codex\bin\<hash>\` for the newest directory
   holding both `codex.exe` and the helper. The chosen binary's directory is
   prepended to the child PATH so bare-name helper spawns resolve. The
   existing workspace-shadow rejection and `.codex/tmp/arg0` stripping stay.
3. Tests updated red-first to assert the new argument and environment
   contract (`core/test/codex.test.ts`; app/cli fakes as needed) — fakes
   must certify the contract the real process honors, not the one it
   rejects.
4. Shared version bumps 0.0.1 → 0.0.2 per MAINTAINERS: three package files,
   the contract version line, mirrors resynced, changelog entry, lockfiles.

What must not change: sandbox mode stays `workspace-write` scoped to the
selected project; no retry, fallback, scheduler, login flow, or new
dependency; the one-call owner confirmation and credential-opaque readiness
probes stay; non-Windows behavior is unchanged except the approval-policy
fix.

Checks: updated core tests fail against the old invocation, then pass; core,
cli, and app suites green; then one owner-approved real Codex Exec smoke
call through Cairn's own CLI against a disposable temp project must produce
the requested file plus Cairn's verified report, log row, and exact-path
commit. The paid call pauses for the owner's exact confirmation at the
boundary as always.

DONE means the suites are green and the real smoke call through Cairn
produced the file and verified records. STOPPED means it did not, with the
evidence retained. Milestone movement stays NO — the milestone attempt on
Cairn itself is Task 004.
