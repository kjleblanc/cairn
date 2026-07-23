# Cairn

Cairn helps beginners build real software with AI while keeping the work
understandable, recoverable, and honest.

The app and the contract share one version number; the newest entry in
[CHANGELOG.md](CHANGELOG.md) states it.

One path:

```text
project -> task -> route -> run -> check -> result
```

Local reversible work proceeds continuously. Cairn pauses only immediately
before a real risk: a credential, paid call, destructive change, external
write, deployment, production effect, or valuable-data exposure.

## What works now

- creating, opening, remembering, and switching projects;
- preservation-first conversion of existing work;
- one task at a time with an honest DONE or STOPPED result;
- deterministic routing to one connected adapter, and an honest
  connection-required result when none is connected;
- one Codex Exec adapter that detects installed/connected readiness without
  reading or displaying credentials or login output;
- one explicitly confirmed real Codex Exec call, with the provider, pinned
  model, exact project path, data scope, and one-call quota shown before it
  starts;
- a compact route/run/check/result activity view;
- protected Git state and exact task records; and
- an explicit deterministic offline demonstration adapter that proves the
  lifecycle without calling a model.

## Where Cairn is heading

Today Cairn runs one carefully protected task at a time, and the owner writes
each task request themselves. The destination is a conductor: a model of your
choosing that lives in the app, reads the project's records, and thinks
through your request with you — asking the question you didn't know to ask,
flagging the risk you couldn't see — then sends the coding work to connected
worker AIs and reports back honestly. The deterministic safety layer described
above stays underneath: the conductor decides what to try; the safety envelope
decides what counts as done. The owner-approved route lives in
[the conductor route spec](docs/superpowers/specs/2026-07-23-cairn-conductor-route-design.md).

## What you need

**Git.** Git is the save-history tool Cairn uses to protect your work.

```text
git --version
```

Commits also need a local name and email. These are computer-wide settings, so
Cairn does not change them for you:

```text
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

**One folder per project.** Use [Project Kickoff](PROJECT-KICKOFF.md) for an
empty folder and [Project Conversion](PROJECT-CONVERSION.md) when anything
valuable already exists.

**The most important rule.** Never paste a password, bank detail, API key,
token, private key, recovery code, or `.env` contents into chat or Cairn. You
connect providers through their official controls; the AI never sees the
credential.

## Launch or install Cairn Desktop

From this repository's root, launch the development build with:

```powershell
npm.cmd --prefix app start
```

To build a double-clickable Windows installer:

```powershell
npm.cmd --prefix app run make
```

The installer is written beneath `app/out/`. Local builds are not digitally
signed, so Windows may show an unknown-publisher or SmartScreen warning.
Installing or distributing a build is a separate owner decision.

## Start here

- [Project Kickoff](PROJECT-KICKOFF.md) for an empty folder
- [Project Conversion](PROJECT-CONVERSION.md) for existing work
- [Everyday Workflow](EVERYDAY-WORKFLOW.md) for daily use, risk approvals,
  provider access, and expert boundaries

The self-contained browser companion at
[kjleblanc.github.io/cairn](https://kjleblanc.github.io/cairn/) provides the
same contract and links. The Markdown files remain canonical.

## Project memory

Each Cairn project keeps:

- `AGENTS.md` — the small project contract;
- `docs/ai-work/PROJECT.md` — goal, users, milestone, and current scope;
- `docs/ai-work/tasks/NNN-brief.md` and `NNN-report.md` — the boundary and
  honest result of one task; and
- `docs/ai-work/LOG.md` — an append-only one-line history.

These files are memory. Reviews are optional advice and never reopen a
completed task.

## Safety boundary

Cairn protects tracked, staged, modified, and untracked work. It never cleans,
resets, stashes, overwrites, or broadly stages that work merely because it is
messy. Immediately before an install, credential use, paid or data-bearing
model call, destructive action, external write, publication, deployment, or
production change, Cairn shows the exact action and recovery plan and waits
for that action's approval.

## Try it offline

With the repository's dependencies already installed:

```powershell
$env:CAIRN_MOCK = "1"
npm.cmd --prefix app start
```

Or from the CLI inside a Cairn project:

```powershell
node path\to\cairn\cli\dist\src\index.js task --mock "Describe one visible outcome"
```

The offline adapter is not a model. It proves route → run → check → result and
honest record-keeping; its result plainly states that the requested product
change was not attempted.

## Try one real Codex Exec task

Run `cairn task` (or start a Desktop task) without `CAIRN_MOCK`. Cairn reports
one of three non-secret states: not installed, installed but not connected, or
installed and connected. If connected, review the disclosure — provider,
pinned model, exact project path, data scope, one-process quota — check the
confirmation, and choose **Start one real Codex Exec call**. The call consumes
the connected account's pricing, credits, or quota; Cairn runs one ephemeral
process, never retries, and never opens a login flow. You install and connect
Codex yourself through official Codex controls.

## Glossary

| Word | Meaning |
|---|---|
| Git | Save history for a project. |
| Repository | A project folder tracked by Git. |
| Commit | One named saved snapshot. |
| Diff | The exact before-and-after file changes. |
| Tracked / staged / untracked | Kinds of current Git work. Cairn protects all of them. |
| Dependency | Someone else's software used by the project. Installing or updating it needs approval. |
| Route | The execution path Cairn picks for a task — which adapter and model, or the offline demonstration. |
| Milestone | The next result you can personally see or try. |
| Task brief | A short boundary for one outcome. |
| Report | The honest account of what actually happened. |
| DONE / STOPPED | Whether the requested outcome holds and its checks completed. |

## History

Cairn 0.0.1 is a formal reset. The full pre-reset history — contracts v1.0
through v3.0 and task records 000–047 — is preserved in
[docs/legacy/](docs/legacy/README.md) and at git tag `legacy-v3.0`. See
[CHANGELOG.md](CHANGELOG.md).

Cairn is licensed under the [MIT License](LICENSE).
