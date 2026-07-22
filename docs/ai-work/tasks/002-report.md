# Task 002 — Report

What changed: only this task's records (002-brief.md, this report, one log
row). No product code, dependency, or configuration changed. All experiments
ran in disposable git-initialized folders under the session scratchpad.

## The diagnosis

Every pre-reset real Codex Exec run (tasks 036–047) failed for three stacked
reasons in Cairn's invocation, confirmed by four live runs with visible
output against codex-cli 0.145.0:

1. **`--ask-for-approval on-request` cannot work non-interactively.**
   `codex exec` accepts no approval flag at all; the root-level `on-request`
   policy lets the model ask a user who does not exist. Codex stderr:
   "patch rejected: writing is blocked by read-only sandbox; rejected by
   user approval settings."
2. **`--ignore-user-config` strips the Windows sandbox enablement.** The
   owner's `~/.codex/config.toml` sets `[windows] sandbox = "elevated"` —
   the setting that makes `workspace-write` actually writable on Windows.
   Without it the exec sandbox is read-only regardless of the
   `--sandbox workspace-write` flag.
3. **The PATH-resolved `codex.exe` is a launcher stub without sandbox
   helpers.** Elevated-sandbox writes spawn `codex-windows-sandbox-setup.exe`
   by name. That helper lives only in the self-updated versioned install
   (`%LOCALAPPDATA%\OpenAI\Codex\bin\<hash>\`), which is on no PATH. The
   stub directory (`...\Programs\OpenAI\Codex\bin\`) has no helper, so
   helper launch fails with "program not found" even after fixing 1 and 2.

## Checks run (four owner-approved paid calls, tiny prompts)

- Test A — Cairn's exact argument list, disposable project: reproduced the
  failure (exit 0, no file, zero file_change items; write rejected by
  read-only sandbox). Usage 26,281 in / 126 out tokens.
- Test B — `--ask-for-approval never` alone: same read-only rejection.
  Usage 25,421 in / 107 out.
- Test C — adding `-c windows.sandbox="elevated"`: sandbox activated, model
  attempted real file_change items, helper launch failed ("program not
  found"). Usage 53,915 in / 375 out.
- Test D — versioned `codex.exe` invoked directly with the helper directory
  on the child PATH, `--ask-for-approval never`, and
  `-c windows.sandbox="elevated"`: **SMOKE.md created with the exact
  requested content; file_change item completed.** Usage 40,809 in / 365
  out.

Free evidence: `codex exec --help` (no approval option), root help approval
policy definitions, the owner's config.toml `[windows]` table, directory
listings of the stub and versioned installs, and Codex's own sandbox log
showing the elevated sandbox succeeding earlier the same day inside the
owner's normal Codex session.

## The proven fix recipe for Task 003

1. Replace `--ask-for-approval on-request` with `--ask-for-approval never`.
2. Pass `-c windows.sandbox="elevated"` on Windows (keeping
   `--ignore-user-config` isolation intact).
3. Resolve the versioned Codex binary (newest hash directory under
   `%LOCALAPPDATA%\OpenAI\Codex\bin\`) or prepend its directory to the child
   PATH so `codex-windows-sandbox-setup.exe` and the command runner resolve;
   the PATH stub alone can never launch elevated-sandbox writes.

How to try it: run the Test D command shape from any shell against a
disposable folder; the file appears. Raw JSONL/stderr evidence for all four
runs is retained in the session scratchpad (not committed).

Limitations: proven on codex-cli 0.145.0 on Windows 11 with the elevated
sandbox already set up by the owner's Codex install; the hash-directory
location is an implementation detail of Codex's updater and may change;
first-run machines without prior sandbox setup were not tested. The
`windows.sandbox = "elevated"` setting mirrors the owner's own config choice
rather than widening Cairn's sandbox policy.

Milestone movement: NO

Disposition: DONE
