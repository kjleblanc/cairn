# Cairn

Build real software with an AI through **risk-based autonomy**: routine local work
moves forward; real risk pauses for you.

Cairn is written for complete beginners. You describe the result you want. The
project contract protects existing work, keeps external authority explicit, records
what happened, and stops repeated patching when the approach is wrong.

## Start here

- New empty folder: [Project Kickoff](PROJECT-KICKOFF.md)
- Existing project with files or history: [Project Conversion](PROJECT-CONVERSION.md)
- Already using Cairn: [Everyday Workflow](EVERYDAY-WORKFLOW.md)
- Risky or hard-to-reverse work: [High-Stakes](HIGH-STAKES.md)
- Need the glossary and setup tools: [Getting Ready](GETTING-READY.md)

The browser companion at [kjleblanc.github.io/cairn](https://kjleblanc.github.io/cairn/)
walks through the same written framework. The Markdown files remain canonical.

## The normal command

```text
Work on: [the visible result you want]
```

For Tiny or Standard work, the AI:

1. reads the project and protects unfinished files;
2. writes a short task brief as project memory;
3. builds the result immediately;
4. repairs ordinary mistakes and reruns checks in the same task;
5. writes the report and work-log row; and
6. tells you exactly how to try it.

There is no separate brief approval, build chat, review chat, or decision gate for
local reversible work.

When the task is genuinely High-Stakes, the AI changes nothing and points you to:

```text
Plan a High-Stakes task: [the result you want]
```

High-Stakes work keeps exact approval, safe rehearsal, mandatory fresh-context
review, qualified-human boundaries, and separate authority for every live action.

## Why Cairn changed in v2.0

Earlier Cairn versions used the same multi-chat gated loop for nearly every feature.
That protected boundaries, but it also let planning and review become the work. In
Cairn's own development, repeated repair tasks and two Direction Gates failed to
produce an activatable result.

Contract v2.0 keeps the protections that stop real harm and removes gates from
routine implementation. The guiding question is now: **is this action local and
reversible, or does it cross a real risk boundary?**

## Cairn's own bootstrap

Cairn cannot require an unreliable Cairn runtime to repair itself. Maintainers use:

```text
Bootstrap Cairn: [the visible improvement]
```

Bootstrap work runs directly through the current coding agent, serially and one
outcome at a time. Standard work proceeds continuously; High-Stakes work retains all
of its gates. Parallel execution and coordinator repair are outside the current
milestone, and existing parallel candidates remain disabled historical evidence.

Bootstrap ends only after a later contract amendment records that Cairn completed a
reliable serial self-improvement task end to end.

## The safety boundary

Tiny and Standard autonomy includes scoped repository edits, already-installed local
tools, proportionate tests, local previews, and safe exact-name Git commits.

The AI still needs your exact approval for:

- installing or updating software;
- network access or external-service writes;
- credentials or model cost;
- deployment, publishing, or public messages;
- destructive or irreversible actions;
- production changes or valuable data; and
- work requiring a qualified security, payments, infrastructure, legal, or safety
  expert.

Never paste a password, API key, token, bank detail, recovery code, or `.env` contents
into chat.

## The files that keep memory

Each project keeps:

- `AGENTS.md` — the project contract;
- `docs/ai-work/PROJECT.md` — the goal, users, milestone, and current boundaries;
- `docs/ai-work/tasks/NNN-brief.md` — the task's recorded outcome and boundary;
- `docs/ai-work/tasks/NNN-report.md` — what actually happened; and
- `docs/ai-work/LOG.md` — one row per completed or stopped task.

Routine briefs are not permission slips. They let another chat continue without
guessing. Existing `PILOT.md` files may remain, but the pilot no longer gates work.

## When the AI should stop

The AI stops when the project root or ownership is unclear, protected work changes,
the task crosses into High-Stakes work, required authority or expertise is missing,
a secret could leak, rollback is not credible, an external effect is unapproved, or
the Direction Gate requires a different approach.

An ordinary compile error, behavior mismatch, or broken fixture is normally repaired
and rerun inside the same task.

If you feel lost, type:

```text
Stop. What just happened?
```

If the same approach keeps failing, type:

```text
Direction check: [what keeps going wrong]
```

A second Direction Gate on the same implementation ends that approach. The next
choice must be a smaller milestone, different architecture, experienced help, or
deferral—not another renamed repair.

## Current software status

The written protocol and browser companion describe Contract v2.0. The current Cairn
CLI and Desktop runtime still implement the older gated sequence and are **legacy
until a separate bootstrap implementation updates them**. Do not treat their extra
approval screens or parallel coordinator as the v2.0 workflow.

The written commands can be used with any coding agent that can read and edit project
files. Cairn's existing CLI and Desktop use Claude models; no provider credential
should ever be pasted into Cairn or chat.

## Sharing and versioning

Share this folder or the repository link. Cairn is language-independent and licensed
under the [MIT License](LICENSE).

The project contract carries a version number (`Cairn Contract v2.0`).
[CHANGELOG.md](CHANGELOG.md) records each version, and
[Everyday Workflow](EVERYDAY-WORKFLOW.md) explains reviewed updates.
