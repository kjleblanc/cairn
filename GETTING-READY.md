# Getting Ready — before your first project

Ten minutes of setup, once. After this you will not need to install anything else to
use the framework.

## What you need

**1. An AI coding agent.** This is an AI that can read and edit files in a folder on
your computer — not just a chat window. Cairn is built for Claude Code — its app and
CLI run Claude models — so install Claude Code if you can. The written commands also
work in similar tools, such as Cursor.

**2. Git.** Git is a save-history tool. It takes snapshots of your project so any
mistake can be undone by going back to an earlier snapshot. It is free and safe to
install.

To check whether you already have it, open a **terminal** (see the glossary below) and
type:

```text
git --version
```

If you see a version number, you have Git. If you see an error, download it from
[git-scm.com](https://git-scm.com) and install it with the default options.

Git snapshots are labeled with a name and email. Set yours once (they stay on your
computer; nothing is sent anywhere):

```text
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Do this yourself rather than letting an AI do it — the framework forbids the AI from
changing settings that affect your whole computer.

**3. One folder per project.** Make an empty folder anywhere you like, named after
your project. Everything the AI builds will live inside it.

## The one rule that protects you most

**Never paste a password, bank detail, API key, token, private key, recovery code, or
the contents of a `.env` file into any chat.** No legitimate step in this framework
ever needs you to. If an AI asks for one, stop and refuse — the framework's rules say
it must never ask.

## Words you'll see

Plain one-line meanings for every term the framework uses. Skim now; return when a
word confuses you.

| Word | What it means |
|---|---|
| **Terminal** | A window where you type commands instead of clicking. On Windows it is called PowerShell or Terminal; on Mac, Terminal. |
| **Git** | The save-history tool. It snapshots your project so mistakes can be undone. |
| **Repository (repo)** | A folder whose history Git is tracking. |
| **Commit** | One saved snapshot in Git, with a note saying what changed. |
| **Diff** | A before-and-after comparison showing exactly which lines changed. |
| **Untracked / modified files** | Files Git has not snapshotted yet, or files changed since the last snapshot. They may be unsaved work — the framework protects them. |
| **Dependency** | Someone else's code your project relies on. Installing one downloads outside code, so it always needs your approval. |
| **Deploy** | Putting your project on the internet where other people can reach it. |
| **Check / test** | A small program that verifies a piece of your project still works. |
| **Milestone** | The next result you could actually see or try — "the page shows my list," not "the code is better." |
| **Project contract** | The `AGENTS.md` rules file in your project that the AI must read and obey in every chat. |
| **Task brief** | A short saved record of one task's outcome, boundary, protected work, and checks. For Tiny and Standard work it is project memory, not a separate approval gate. |
| **Report** | The saved file the AI writes after building, saying what actually happened. |
| **Applied** | A completed Tiny or Standard change that became local project behavior without a separate owner-decision gate because it was reversible and stayed inside the repository. |
| **Draft / Final** | High-Stakes terms. A Draft is a candidate to judge; a Final is intended for activation after approval and review. Drafts never become real silently. |
| **Experimental Draft** | A disabled, synthetic-only High-Stakes Draft used to learn from one supported user path before anyone claims it is safe for valuable work. |
| **Supported user path** | The exact visible buttons or commands the owner will use to judge an Experimental Draft. Internal helpers and unsupported call sequences stay outside that promise unless they can break containment. |
| **DONE / STOPPED** | DONE means the bounded outcome and its checks completed. STOPPED means they did not. Both are honest outcomes. |
| **Lane** | The task's risk level: Tiny, Standard, or High-Stakes. Tiny and Standard proceed; High-Stakes pauses for approval and review. |
| **Risk-based autonomy** | Cairn's default: local reversible work proceeds continuously, while costly, external, destructive, or hard-to-reverse work pauses for the owner. |
| **Direction Gate** | A pause that shows what failed and compares real options. It advises the owner but does not ban another attempt on the same approach after an explicit owner decision. |
| **Fresh-context review** | Asking a brand-new chat to check finished work. It is optional for routine work and mandatory for High-Stakes work. |
| **Repair and rerun** | Fixing a correctable implementation or test-harness mistake inside the same bounded task, preserving important failed evidence, and rerunning affected checks. |
| **Bootstrap Cairn** | The temporary serial workflow Cairn's maintainers use to improve Cairn directly until reliable self-hosting works. It bypasses the unproven runtime, not the safety rules. |
| **Owner override** | Your explicit instruction to change a process-only next step. It cannot expand the task's bounded scope or waive protection, authority, secret, external-effect, rollback, or product-safety boundaries. |
| **Contract amendment** | Your always-available way to pause product work, change the rules, inspect the complete rule diff, and reactivate only with a separate exact approval. |
| **Secret** | Any password, key, token, or private detail. Ordinary secrets never go into a chat or an AI-accessible surface. |
| **Owner-managed local AI credential** | A provider login the owner manages through the provider's official installed authentication or operating-system credential store. It may support one disposable tool-free call without expert, canary, or OS-isolation prerequisites, but its value never enters chat, commands, model-visible tools, output, logs, project files, or Git, and the owner separately approves its use, provider call, and cost cap. |

## Ready?

- Empty folder → [Project Kickoff](PROJECT-KICKOFF.md)
- Folder that already has files in it → [Project Conversion](PROJECT-CONVERSION.md)
