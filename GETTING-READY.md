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
| **Task brief** | A short saved file describing one task's boundary — what will change and what will not — which you approve before anything is built. |
| **Report** | The saved file the AI writes after building, saying what actually happened. |
| **Draft / Final** | A Draft is a candidate for you to judge. A Final makes an already-chosen result the project's real behavior. Drafts never become real silently. |
| **DONE / STOPPED** | DONE means the approved work and its checks completed. STOPPED means they did not. Both are honest outcomes. |
| **Lane** | How much care a task gets: Tiny, Standard, or High-Stakes. |
| **Direction Gate** | The rule that stops endless patching: after two failed attempts at the same thing, the approach changes instead. |
| **Fresh-context review** | Asking a brand-new chat to check finished work, so the reviewer is not attached to the builder's assumptions. |
| **Secret** | Any password, key, token, or private detail. Secrets never go into a chat. |

## Ready?

- Empty folder → [Project Kickoff](PROJECT-KICKOFF.md)
- Folder that already has files in it → [Project Conversion](PROJECT-CONVERSION.md)
