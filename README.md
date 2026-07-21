# Cairn

Cairn is for beginners who want AI-assisted software work to stay understandable,
recoverable, and honest.

The active CLI and Desktop product now use one serial path:

```text
project → task entry → route → run → check → result
```

There is no active parallel queue, scheduler, bounded batch, five-gate Standard
workflow, or experimental provider route. Earlier experiments remain in Git and in
the append-only task history; they are evidence, not active product features.

## What works now

- first-run instructions;
- creating, opening, remembering, and switching projects;
- Project Conversion guidance for existing work;
- one task entry at a time;
- deterministic routing among connected compatible adapters;
- a connection-required result when none is connected;
- a compact route/run/check/result activity view;
- protected Git state and exact task records; and
- an explicit offline demonstration adapter.

The offline adapter is not a local model. It proves the serial lifecycle without
implementing the arbitrary product request. Its report says:

```text
Routing demonstration: verified
Requested product change: not attempted
Milestone movement: NO
```

Normal mode currently has no connected model adapter. It stops before writing task
records and explains that a provider connection is a later separately reviewed
feature.

## Start here

- New empty folder: [Project Kickoff](PROJECT-KICKOFF.md)
- Existing project with files or history: [Project Conversion](PROJECT-CONVERSION.md)
- Already using Cairn: [Everyday Workflow](EVERYDAY-WORKFLOW.md)
- Risky or hard-to-reverse work: [High-Stakes](HIGH-STAKES.md)
- Setup terms and tools: [Getting Ready](GETTING-READY.md)

The browser companion at [kjleblanc.github.io/cairn](https://kjleblanc.github.io/cairn/)
walks through the written framework. The Markdown files remain canonical.

## The project contract

`AGENTS.md` governs AI work inside each Cairn project. It uses risk-based autonomy:
local reversible Tiny and Standard work proceeds, while costly, external,
destructive, credentialed, or hard-to-reverse work pauses for exact approval.

The product's short serial task contract is deliberately smaller than the maintainer
contract. It records the requested and supported outcomes, route, owned paths,
protected Git state, checks, and DONE/STOPPED meanings. It is project memory, not a
legacy approval ceremony.

Each project keeps:

- `AGENTS.md` — the project contract;
- `docs/ai-work/PROJECT.md` — goal, users, and milestone;
- `docs/ai-work/tasks/NNN-brief.md` — the short task contract;
- `docs/ai-work/tasks/NNN-report.md` — what actually happened; and
- `docs/ai-work/LOG.md` — one append-only row per completed or stopped task.

A visible stone counts only a DONE record that also says milestone movement was YES.
The offline lifecycle demonstration never creates a stone.

## Safety boundary

Cairn protects existing tracked, staged, and untracked work. It never cleans,
resets, stashes, or broadly stages that work. Legacy `.git/cairn` state is detected
read-only and blocks new mutation until a separately reviewed migration exists.

Never paste a password, API key, token, recovery code, bank detail, or `.env`
contents into chat or Cairn.

Provider connection, credential use, model calls, cost, dependency changes,
deployment, valuable-data migration, and public effects remain separate
High-Stakes work.

## Trying the offline foundation

With the repository's dependencies already installed:

```powershell
$env:CAIRN_MOCK = "1"
npm.cmd --prefix app start
```

Or use the CLI from a Cairn project:

```powershell
node path\to\cairn\cli\dist\src\index.js task --mock "Describe one visible outcome"
```

Success is a route card labeled `Provider none` and `Model none`, four activity
stages, a verified result, exactly one brief/report/log append, and no milestone
stone. It is not proof of self-hosting or real model work.

## History and versioning

Contract v2.3 remains the current project-governance version. The scheduler,
concurrency, provider, and experimental paths explored under earlier tasks remain
recoverable in Git and documented in [CHANGELOG.md](CHANGELOG.md) and
`docs/ai-work/tasks/`. The active runtime reset does not rewrite that history or
activate any historical candidate.

Cairn is licensed under the [MIT License](LICENSE).
