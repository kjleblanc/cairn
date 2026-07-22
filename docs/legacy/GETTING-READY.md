# Getting Ready

Cairn's current foundation works locally and can demonstrate its serial lifecycle
without an AI account.

## What you need

**Git.** Git is the save-history tool Cairn uses to protect your work.

```text
git --version
```

Commits also need a local name and email. These are computer-wide settings, so Cairn
does not change them for you:

```text
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

**One folder per project.** Use [Project Kickoff](PROJECT-KICKOFF.md) for an empty
folder and [Project Conversion](PROJECT-CONVERSION.md) when anything valuable already
exists.

**Codex Exec readiness for the next step.** Cairn's app and CLI now check whether the
official `codex` CLI is installed and whether its login-status command succeeds.
They discard all command output and keep only installed/connected booleans. The
owner still installs and connects Codex personally through official controls.

Even when Codex is connected, this build stops before starting the real
`codex exec` process. It does not send the task, call a model, or implement the
requested change yet.

`CAIRN_MOCK=1` enables a deterministic offline lifecycle demonstration. It is not a
model and does not implement the requested change.

## The most important rule

Never paste a password, bank detail, API key, token, private key, recovery code, or
`.env` contents into chat or Cairn.

## Plain-language glossary

| Word | Meaning |
|---|---|
| Git | Save history for a project. |
| Repository | A project folder tracked by Git. |
| Commit | One named saved snapshot. |
| Diff | The exact before-and-after file changes. |
| Tracked / staged / untracked | Kinds of current Git work. Cairn protects all of them. |
| Dependency | Someone else's software used by the project. Installing or updating it needs approval. |
| Deploy | Put software somewhere other people can use it. |
| Milestone | The next result you can personally see or try. |
| Task brief | A short boundary and checklist for one outcome. |
| Report | The honest account of what actually happened. |
| Adapter | A narrow connector between Cairn and an execution method. |
| Connected model | A model route whose connection is actually available. |
| DONE / STOPPED | Whether the bounded task and its checks completed. |
| Milestone movement | YES only when a finished task visibly advanced the milestone. |

## Next

- Empty folder → [Project Kickoff](PROJECT-KICKOFF.md)
- Existing work → [Project Conversion](PROJECT-CONVERSION.md)
- Daily use → [Everyday Workflow](EVERYDAY-WORKFLOW.md)
- Concrete risk → [High-Stakes](HIGH-STAKES.md)
