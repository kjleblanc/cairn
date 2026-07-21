# Project Contract

> **What this is.** Cairn Contract v3.0 is the small rulebook for AI work in this
> project. It is saved as `AGENTS.md` in a project root. The owner is a beginner, so
> explain decisions and results in plain language.

## Project facts

Filled in during setup. Change the milestone when useful work lands.

```text
STATUS: ACTIVE
PROJECT NAME:
WHAT WE ARE BUILDING:
WHO WILL USE IT:
CURRENT MILESTONE:
```

`ACTIVE` means work may proceed. `PAUSED` means the owner has explicitly frozen
product work. No review ceremony or special phrase is required to resume; the owner
may simply say to restore `ACTIVE`.

## The whole workflow

**One project, one task, one honest result.** Local reversible work proceeds in one
continuous conversation. Pause only at a concrete risk boundary, not at an internal
phase boundary.

For each requested outcome:

1. Read this file, `docs/ai-work/PROJECT.md`, the latest relevant task record, and
   the complete Git status.
2. Identify the project root and protect every existing tracked, staged, modified,
   and untracked path.
3. Restate the visible outcome and write the next short task brief before substantial
   editing.
4. Work directly and serially: inspect, implement, check, repair, and rerun as needed.
5. Inspect the actual diff and final Git status.
6. Write an honest report, append one log row, and make one local exact-path commit
   when Git isolation is clear.
7. End with `DONE` or `STOPPED` and exact safe steps for the owner to try the result.

There is no required planning chat, approval of a brief, fresh-chat review, reviewer
verdict, owner-decision message, activation ceremony, Direction Gate, Experimental
Draft, Bootstrap mode, scheduler, parallel lane, role handoff, or separate phase
task. A new chat is a context tool, never a gate.

## Task records are memory, not permission slips

Use the next unused number in `docs/ai-work/tasks/`.

The brief records only what helps the work stay bounded:

- requested visible outcome;
- files or areas that may change;
- protected starting work;
- first useful checkpoint;
- checks;
- important assumptions; and
- what DONE and STOPPED mean.

The report records:

- what actually changed;
- checks run and their real results;
- how to try it;
- limitations or remaining human judgment;
- `Milestone movement: YES / NO / UNCLEAR`; and
- `Disposition: DONE` or `Disposition: STOPPED — [reason]`.

Append one truthful row to `docs/ai-work/LOG.md`. Existing rows and task files are
history: do not rewrite or delete them to improve the story.

`DONE` means the requested bounded outcome and proportionate checks completed.
`STOPPED` means they did not. A review requested by the owner is optional evidence;
it may suggest a new task, but it does not retroactively reopen or relabel completed
work.

## Repair inside the same task

A compile error, failed test, behavior mismatch, or harness mistake is not a process
event. Make the smallest safe in-scope correction and rerun affected checks. Preserve
important failed evidence in the report.

Stop only when repair would change the requested outcome, threaten protected work,
cross a concrete risk boundary without approval, require missing expertise, or make
recovery unclear.

## Concrete risk boundaries

Local, reversible edits inside the named repository need no separate approval.

Immediately before any of the following actions, pause and show the owner the exact
target, effect, likely cost or exposure, and recovery plan:

- installing or updating software or dependencies;
- deleting, overwriting, moving, or transforming valuable or unclear data;
- using a credential or changing authentication, authorization, or permissions;
- sending project or personal data to a model or external service;
- spending money or making a paid model call;
- writing to an external service, messaging another person, publishing, or deploying;
- changing production systems or production data; or
- doing anything destructive, irreversible, public, or outside the named repository.

Proceed only after the owner clearly approves that exact action. Approval for one
action is not blanket approval for another. Safe read-only investigation and local
preparation may continue while waiting.

Adding a task brief, report, hash, branch, worktree, agent, receipt, or second review
does not make a risky action safe. Use the smallest control that addresses the real
risk.

## Secrets and provider access

Never ask the owner to paste a password, API key, token, cookie, recovery code,
private key, bank detail, or `.env` contents into chat. Never print, copy, commit, or
log a secret.

The owner personally connects an AI provider through the provider's official UI or
an operating-system credential store. The AI must not operate or inspect that login.
Before a paid or data-bearing model call, confirm the provider, model, data being
sent, target project, and cost or quota limit. Record only non-secret results and
redacted errors.

## When a qualified person is required

Get an appropriately qualified human before live work involving application
permissions, payments, personal or regulated data, destructive migrations,
production security or infrastructure, public legal commitments, or safety-critical
behavior. More AI process is not a substitute for expertise.

## Git protection

- Never clean, reset, stash, overwrite, or broadly stage existing work just because
  the tree is messy.
- Treat modified and untracked files as valuable until ownership is clear.
- Stage task paths by exact name. Do not use broad staging such as `git add -A`.
- Skip the commit when unrelated staged work or path ambiguity prevents isolation.
- Never rewrite history to hide a failed attempt.

## Simple owner commands

The owner's plain-language request is enough. These short forms are convenient, not
magic authorization phrases:

- `Work on: [visible outcome]` — complete one local task continuously.
- `Continue task NNN.` — continue the same unfinished outcome from saved evidence.
- `How do I try it?` — explain safe local trial steps without changing files.
- `Review task NNN.` — provide an optional read-only second look.
- `Stop. What just happened?` — freeze and explain the exact state and options.
- `Change the project rules: [change]` — update the contract and required mirrors,
  check the diff, and report the result. No separate review or reactivation ritual is
  created unless the change itself crosses a concrete risk boundary.

## Stop immediately when

- the project root or ownership of existing work is unclear;
- protected work changes unexpectedly;
- a secret would enter chat, output, files, logs, or tools;
- an unapproved destructive, credentialed, paid, public, production, or external
  action would occur;
- required qualified expertise is missing; or
- recovery is unclear.

When stopping, preserve the state and explain the smallest useful next choice. Do
not create another process loop merely to describe the blocker.
