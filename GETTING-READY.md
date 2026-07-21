# Getting Ready — before your first project

Cairn's current foundation works locally and can demonstrate its complete serial
lifecycle without an AI account.

## What you need

**1. Git.** Git is the save-history tool Cairn uses to protect your work.

```text
git --version
```

If that prints a version, Git is ready. If it does not, install Git from
[git-scm.com](https://git-scm.com) yourself. Git commits also need a local name and
email:

```text
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

These are computer-wide settings, so Cairn does not change them for you.

**2. One folder per project.** New-project setup needs an empty folder. If the
folder already contains work, use [Project Conversion](PROJECT-CONVERSION.md).

**3. A coding agent only when you want real implementation.** The written Cairn
contract works with a coding agent that can read and edit a project folder. The
current Cairn app and CLI do not connect one yet. They stop honestly at
connection-required in normal mode.

`CAIRN_MOCK=1` enables the deterministic offline demonstration. It is not a model,
does not implement the requested change, and needs no login or secret.

## The one rule that protects you most

Never paste a password, bank detail, API key, token, private key, recovery code, or
the contents of a `.env` file into chat or Cairn. Provider connection will be a
separate reviewed feature; this foundation never asks for a credential.

## Words you'll see

| Word | Plain meaning |
|---|---|
| **Terminal** | A window where you type commands. On Windows this is PowerShell or Terminal. |
| **Git** | Save history for a project. |
| **Repository** | A project folder whose history Git tracks. |
| **Commit** | One named saved snapshot. |
| **Diff** | The exact before-and-after file changes. |
| **Tracked / staged / untracked** | Different kinds of current Git work. Cairn treats all of them as valuable. |
| **Dependency** | Someone else's software used by the project. Adding or updating one needs explicit approval. |
| **Deploy** | Put software somewhere other people can access it. |
| **Milestone** | The next result you can personally see or try. |
| **Task contract** | The short brief recording the requested outcome, supported outcome, route, owned records, checks, and stop conditions. |
| **Adapter** | A narrow connector between Cairn's serial coordinator and an execution method. The current offline adapter is deterministic and is not a model. |
| **Connected model** | A model route whose connection has been established outside the task. This foundation has none in normal mode. |
| **DONE / STOPPED** | DONE means the bounded supported outcome passed its checks. STOPPED means it did not. |
| **Milestone movement** | YES only when a finished task visibly advanced the project milestone. The offline demonstration records NO. |
| **Direction Gate** | A pause after repeated non-progress that compares a smaller milestone, different architecture, experienced help, and deferral. |
| **High-Stakes** | Work that is costly, external, destructive, credentialed, or hard to reverse and therefore needs a pinned plan and review. |

## Ready?

- Empty folder → [Project Kickoff](PROJECT-KICKOFF.md)
- Existing work → [Project Conversion](PROJECT-CONVERSION.md)
- Offline Desktop demonstration → set `CAIRN_MOCK=1`, start the app, and follow
  project → task → route → run → check → result.
