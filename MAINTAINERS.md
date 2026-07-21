# Cairn maintainer instructions

These content standards apply to Cairn's public framework. The project contract in
`AGENTS.md` governs the work itself.

## Product promise

Cairn is for complete beginners. It should help one person move one project through
one task to one honest result without turning internal AI phases into owner-facing
ceremony.

The active product path is:

`project -> task -> route -> run -> check -> result`

Do not reintroduce planning/building/reviewing role loops, mandatory fresh chats,
review verdict gates, owner-decision receipts, Direction Gates, Experimental Drafts,
Bootstrap modes, schedulers, queues, parallel lanes, bounded-run protocols, passive
proofs, or provider experiments as beginner workflow concepts.

## Canonical public files

- `README.md` — front door and current product boundary;
- `GETTING-READY.md` — local setup and plain-language glossary;
- `CONTRACT-TEMPLATE.md` — portable project contract;
- `PROJECT-KICKOFF.md` — setup for an empty folder;
- `PROJECT-CONVERSION.md` — preservation-first setup for existing work;
- `EVERYDAY-WORKFLOW.md` — the normal one-task workflow;
- `HIGH-STAKES.md` — concrete just-in-time risk approvals and expert boundaries;
- `cairn.html` — self-contained browser companion and contract download;
- `CHANGELOG.md` — append-only plain-language version history; and
- `core/assets/contract.md` plus `app/resources/contract.md` — exact generated copies
  of `CONTRACT-TEMPLATE.md`.

Historical task records, Git commits, and older changelog entries remain evidence.
They may mention systems that are no longer active.

## Writing rules

1. Lead with the beginner's next visible action.
2. Use plain language and define unfamiliar terms once.
3. Keep one name per active concept: project contract, task brief, report, owner,
   DONE, STOPPED, milestone, adapter, and connected model.
4. Describe task records as memory, not approval artifacts.
5. Reviews are optional evidence. They never automatically reopen a completed task.
6. Preserve existing tracked, modified, staged, and untracked work.
7. Keep real safety boundaries explicit: secrets, valuable data, credentials,
   permissions, paid calls, external writes, deployment, production, destructive
   actions, and missing qualified expertise.
8. Do not imply that a local deterministic adapter is a model or that a lifecycle
   demonstration implemented the requested product change.
9. Keep the browser companion self-contained: no CDN, analytics, or automatic
   network requests.

## Contract changes

When the contract meaning changes:

1. update `CONTRACT-TEMPLATE.md` first;
2. update this repository's `AGENTS.md` without changing its project-specific facts;
3. update the public guides and browser companion;
4. sync both generated contract assets;
5. bump the version and add a changelog entry; and
6. verify exact mirror equality, active wording, the actual diff, and Git status.

A contract edit does not create a review or reactivation ritual. If the owner has
explicitly paused work, only the owner resumes it. External, destructive,
credentialed, paid, or otherwise concrete risk still needs approval at the moment of
that action.

Do not add hashes, receipts, branches, worktrees, agents, or documents unless a real
risk or debugging need justifies them.
