# Cairn

Cairn helps beginners keep AI-assisted software work understandable, recoverable,
and honest.

The active product and Contract v3.0 share one path:

```text
project -> task -> route -> run -> check -> result
```

Local reversible work proceeds continuously. Cairn pauses only immediately before a
real risk: a credential, paid call, destructive change, external write, deployment,
production effect, or valuable-data exposure.

There is no active five-gate workflow, mandatory fresh review, reviewer verdict,
owner-decision receipt, Direction Gate, Experimental Draft, Bootstrap mode,
scheduler, parallel queue, bounded batch, passive proof, or experimental provider
route. Earlier experiments remain visible in Git, the changelog, and task history.

## What works now

- first-run instructions;
- creating, opening, remembering, and switching projects;
- preservation-first Project Conversion guidance;
- one task at a time;
- deterministic routing among connected compatible adapters;
- an honest connection-required result when none is connected;
- one Codex Exec adapter that detects installed/connected readiness without reading
  or displaying credentials or login output;
- one explicitly confirmed real Codex Exec call pinned to `gpt-5.6-sol`, with the
  exact project, data scope, and one-call quota shown before it starts;
- a compact route/run/check/result activity view;
- protected Git state and exact task records; and
- an explicit deterministic offline demonstration adapter.

The offline adapter is not a model. It proves the lifecycle without implementing the
requested product change. Its result says:

```text
Routing demonstration: verified
Requested product change: not attempted
Milestone movement: NO
```

Normal mode checks `codex --version` and `codex login status` with all process output
discarded. If both succeed, Cairn recommends the single Codex Exec route. The owner
must then confirm OpenAI, model `gpt-5.6-sol`, the exact project path, the disclosed
workspace data scope, and a quota of one ephemeral process with no retry or
continuation. Only that confirmation authorizes the process.

## Start here

- [Getting Ready](GETTING-READY.md)
- [Project Kickoff](PROJECT-KICKOFF.md) for an empty folder
- [Project Conversion](PROJECT-CONVERSION.md) for existing work
- [Everyday Workflow](EVERYDAY-WORKFLOW.md)
- [High-Stakes](HIGH-STAKES.md) for concrete just-in-time risk boundaries

The self-contained browser companion at
[kjleblanc.github.io/cairn](https://kjleblanc.github.io/cairn/) provides the same
contract and links. The Markdown files remain canonical.

## Project memory

Each Cairn project keeps:

- `AGENTS.md` — the small project contract;
- `docs/ai-work/PROJECT.md` — goal, users, milestone, and current scope;
- `docs/ai-work/tasks/NNN-brief.md` — the boundary for one task;
- `docs/ai-work/tasks/NNN-report.md` — what actually happened; and
- `docs/ai-work/LOG.md` — an append-only one-line history.

These files are memory, not approval gates. Optional reviews can suggest follow-up
work but cannot automatically reopen a completed task.

## Safety boundary

Cairn protects tracked, staged, modified, and untracked work. It never cleans,
resets, stashes, overwrites, or broadly stages that work merely because it is messy.

Never paste a password, API key, token, recovery code, bank detail, or `.env`
contents into chat or Cairn. The owner connects providers through official controls;
the AI never sees the credential.

Immediately before an install, credential use, paid or data-bearing model call,
destructive action, external write, publication, deployment, or production change,
Cairn shows the exact action and recovery plan and waits for that action's approval.

## Try the offline foundation

With the repository's dependencies already installed:

```powershell
$env:CAIRN_MOCK = "1"
npm.cmd --prefix app start
```

Or use the CLI from a Cairn project:

```powershell
node path\to\cairn\cli\dist\src\index.js task --mock "Describe one visible outcome"
```

Success is a route labeled `Provider none` and `Model none`, four activity stages,
one brief/report/log append, a verified lifecycle result, and no milestone stone.
It is not proof of self-hosting or real model work.

## Try one real Codex Exec task

Run ordinary `cairn task` or start a Desktop task without `CAIRN_MOCK`. Cairn will
report one of three non-secret states: not installed, installed but not connected,
or installed and connected. If connected, review the real-call disclosure, check the
one-call confirmation, and choose **Start one real Codex Exec call**.

The call sends the task instructions and lets Codex read files inside the selected
project as needed. It consumes the connected account's pricing, credits, or quota.
Cairn runs one pinned, ephemeral process, retains no raw process output, verifies the
model-authored report and log, and creates the exact-path commit itself when the task
started from a clean tree. It does not retry, resume, continue, schedule, or start
another provider. Cairn never opens a login flow; install and connect Codex yourself
through official Codex controls.

If the requested behavior is already present, Codex must not invent a change. It
still checks the behavior and writes an honest report and log row with milestone
movement NO. If a completed process writes no model records, Cairn stops with the
specific safe code `MODEL_RECORDS_MISSING` and does not claim success.

## History

Contract v3.0 replaced the old governance machinery with one serial task and
just-in-time approval at concrete risk. Contract v2.x, scheduler, concurrency,
provider, and review-loop experiments remain recoverable historical evidence.

Cairn is licensed under the [MIT License](LICENSE).
