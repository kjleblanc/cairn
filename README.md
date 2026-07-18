# Cairn — build software with AI, without knowing how to code

Cairn is a workflow (and a companion app) for building real software with an AI coding
agent, one small visible step at a time, while you stay in charge. Like the stacked
stones that mark a mountain trail, it exists so you always know where the safe path is.

You never need to write code. Your job is four things:

- say what you want in plain language;
- look at what the AI built and try it yourself;
- keep passwords and other secrets out of the chat;
- let the AI stop when something is unsafe or unclear.

## Start here

**The easiest way in: open [the Cairn app](https://kjleblanc.github.io/cairn/)** — or
double-click `cairn.html` from this folder; it works offline either way, saves your
progress on your device, and sends nothing anywhere. It walks you through everything
below, generates your setup message from five questions, and keeps every daily command
one tap away.

Get the framework: visit the [repository](https://github.com/kjleblanc/cairn) and use
**Code → Download ZIP**, or share the links above.

Prefer reading? The same journey as written guides:

1. **First time?** Read [Getting Ready](GETTING-READY.md) — ten minutes of setup and a
   plain-language glossary.
2. **Empty project folder?** Follow [Project Kickoff](PROJECT-KICKOFF.md).
3. **Folder that already has files?** Follow [Project Conversion](PROJECT-CONVERSION.md).
   When unsure, treat the folder as existing — setup must never turn into cleanup.
4. **Already set up?** Keep [Everyday Workflow](EVERYDAY-WORKFLOW.md) open; it is your
   daily reference.

## How it works

At setup, your project gets a **contract** — a rules file (`AGENTS.md`) the AI reads
at the start of every chat. The contract carries all the safety rules and defines a
handful of short commands, so your daily messages stay as simple as:

```text
Define a task: show my book list on the home page.
```

The AI answers with a saved **task brief** — a short file saying exactly what will
change and what will not. Nothing is built until you approve it. After building, the
AI writes a **report** of what actually happened, you try the result yourself, and you
decide what happens next.

That is the whole loop: **Define → Build → Verify → Decide.**

## One task, one chat

AI chats forget, and long chats drift. So each task lives in its own chat, and the
project's files — the contract, the briefs, the reports — carry the memory between
chats. This is why the framework saves small files as it goes: they are the project's
memory, not paperwork.

## Three lanes

Every task gets a level of care matched to its risk. The AI proposes the lane and
explains why; uncertainty always moves a task **up**, never down.

- **Tiny** — one small, obvious, reversible change. One message, no files.
- **Standard** — the everyday default. The full loop with a brief and a report.
- **High-Stakes** — hard-to-reverse work: money, personal data, security, deployment,
  dependencies. Stricter steps, described in [High-Stakes](HIGH-STAKES.md). Some of it
  also requires an experienced human — an AI verdict alone is never enough there.

## If you ever feel lost

Paste this, any time, in any chat:

```text
Stop. What just happened?
```

The AI must freeze, change nothing, and explain in plain language where things stand
and what your options are. Feeling lost is normal; this command is the way out.

## Two safety habits worth memorizing

1. **Nothing is built before you approve a saved brief.** If code appears without one,
   stop and say so.
2. **No secrets in chat, ever.** No password, key, or bank detail — no matter who asks.

Everything else — protecting existing files, honest DONE/STOPPED reporting, the
Direction Gate that stops endless patching — is written into your project's contract,
and the AI is bound by it so you don't have to remember it.

## The command line (early alpha)

For those ready to go further, [cairn-cli](cli/README.md) runs the whole loop for
you: you describe the outcome, approve the brief with a keypress, and separate AI
agents define, build, and review — with the contract's rules enforced by code, not
trust. The written guides above remain the canonical protocol; Claude Code is the
recommended agent for following them.

## Sharing this framework

Share this whole folder — or the repository link. Cairn works with any programming
language. It is built on Claude — the CLI and app run Claude models, and Claude Code
is the recommended agent — though the written commands can be pasted into any AI
coding agent that can read and edit files.

Licensed under the [MIT License](LICENSE): use it, adapt it, and share what you build.
The project contract carries a version number (`Cairn Contract v1.2`) so projects can
say which rules they run. [CHANGELOG.md](CHANGELOG.md) records what each version
changed; updating a project takes two approved messages, described in the
[Everyday Workflow](EVERYDAY-WORKFLOW.md).
