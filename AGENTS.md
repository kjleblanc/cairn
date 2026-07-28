# Project Contract

> **What this is.** Cairn Contract v0.4.0 is the small rulebook for AI work in this
> project. It is saved as `AGENTS.md` in the project root. The owner may be a
> complete beginner, so explain decisions and results in plain language.

## Project facts

Filled in during setup. Change the milestone when useful work lands.

```text
STATUS: ACTIVE
PROJECT NAME: Cairn
WHAT WE ARE BUILDING: Cairn, an AI conductor with a desktop app, portable contract, and swappable worker adapters, so people with zero coding experience can build real software safely
WHO WILL USE IT: complete beginners — and Cairn's own maintainers, starting now
CURRENT MILESTONE: one conversation on Cairn itself runs request -> pushback -> dispatch -> verified DONE -> honest explanation, delivered as the envelope's result card with the conductor's commentary
```

`ACTIVE` means work may proceed. `PAUSED` means the owner has explicitly frozen
product work; the owner resumes it by saying so.

## The whole workflow

**One lane, one task, one honest result.** Local reversible work proceeds in
one continuous conversation, pausing only immediately before a concrete risk.
A project may run up to two lanes — two chats, each with its own task — under
"Working in two lanes" below; everything in this contract applies within each
lane.

For each requested outcome:

1. Read this file, `docs/ai-work/PROJECT.md`, the latest relevant task record,
   and the complete Git status.
2. Identify the project root and protect every existing tracked, staged,
   modified, and untracked path.
3. Restate the visible outcome and write a short task brief.
4. Work directly and serially: inspect, implement, check, repair, and rerun.
5. Verify that the requested visible outcome actually holds, and inspect the
   real diff and final Git status.
6. Write an honest report, append one log row, and make one local exact-path
   commit when Git isolation is clear.
7. End with `DONE` or `STOPPED` and exact safe steps for the owner to try the
   result.

A new chat is a context tool, never a gate. Work too large for one continuous
task gets a short written plan first, then lands as serial recorded tasks.

## Working in two lanes

The owner may run up to two lanes — two human-driven chats working this
repository at the same time. The serial workflow above applies inside each
lane; these rules keep the lanes out of each other's way:

- **Each lane has its own worktree.** Lane A is the main checkout. Lane B is
  a git worktree (by convention `.lanes/b`, branch `lane/b`). A lane never
  writes outside its own worktree, so one lane's checks can never compile
  another lane's uncommitted work.
- **A task number is claimed by committing the brief.** Before any other
  work, check the working tree, `main`'s history, and every lane branch for
  the lowest free number; write `NNN-brief.md` and commit it alone at once.
- **The log merges itself.** `docs/ai-work/LOG.md` carries Git's union merge
  attribute, so concurrent rows both survive a merge; the landing lane
  confirms each row appears exactly once.
- **Landing is serial.** One lane merges into `main` at a time, then runs
  the settle check (build and unit tests) so `main` is proven good after
  every landing. The other lane syncs `main` into its branch between tasks,
  never mid-task. If both lanes claimed the same number, the later one
  renumbers before landing.
- **The app and its end-to-end tests are single-tenant.** The real app, any
  Playwright suite, and the owner's own use of the app share one profile and
  one conductor connection. A lane holds the app token — a lock directory
  created with `mkdir`, which fails if it exists — for the whole run, and
  waits while another lane or the owner holds it.
- **DONE is verified in the lane's own tree.** A lane's DONE means the
  outcome holds in its worktree on its branch; the settle check promotes
  that claim onto `main`. Reports name the base commit the lane synced from.

The product runtime stays serial: the envelope still runs one dispatched
worker task at a time, whatever the lanes are doing. Contract changes also
stay serial and remain the owner's decision, however many lanes are running.

## Task records are memory

Records exist so a later conversation can continue without guessing.
Verification always asks one question: does the requested visible outcome hold?
The outcome is what gets verified; records describe the work.

In a one-lane project, use the next unused number in `docs/ai-work/tasks/`
(`NNN-brief.md`, `NNN-report.md`). With two lanes, a number is claimed by
committing the brief — see "Working in two lanes".

The brief states:

- the requested visible outcome;
- the boundary of intent: what must not change (behavior, dependencies, stored
  data, security posture);
- checks that will show the outcome holds; and
- what DONE and STOPPED mean here.

The report states:

- what actually changed, naming every file touched;
- checks run and their real results;
- how to try it;
- limitations or remaining human judgment; and
- `Disposition: DONE` or `Disposition: STOPPED — [reason]`.

Append one truthful row per task to `docs/ai-work/LOG.md` using this table:

```text
| Task | Date | Lane | Draft/Final | Outcome | Decision | One-line summary | Milestone moved? |
|---|---|---|---|---|---|---|---|
```

Write `Standard`, `Applied`, and a plain `completed` or `stopped` decision
unless a different value clearly applies; the Lane and Draft/Final columns
carry compatibility with existing tools. Existing rows and task files are
history: never rewrite or delete them.

In an envelope-dispatched run, Cairn's runtime authors the report and log row
itself, from its own verification plus the worker's claims. The `Milestone
moved?` column is one of those claims: it carries the worker's answer, not
Cairn's own verification that the milestone moved.

`DONE` means the requested outcome holds and its checks completed. `STOPPED`
means it does not. A review requested by the owner is optional advice; it may
suggest a new task, and the completed record stands.

## Repair inside the same task

A compile error, failed test, behavior mismatch, or harness mistake is ordinary
work. Make the smallest safe in-scope correction, disclose every file it
touched, and rerun the affected checks. An obviously correct adjacent fix (a
stale fixture, a test timeout) is allowed with disclosure in the report.

After two stopped attempts at the same goal, step back and diagnose before a
third: compare a smaller goal, a different approach, experienced help, and
deferral.

Stop when repair would change the requested outcome, threaten protected work,
cross a concrete risk boundary without approval, require missing expertise, or
make recovery unclear.

## Concrete risk boundaries

Local, reversible edits inside the named repository need no separate approval.

Immediately before any of the following actions, pause and show the owner the
exact target, effect, likely cost or exposure, and recovery plan:

- installing or updating software or dependencies;
- deleting, overwriting, moving, or transforming valuable or unclear data;
- using a credential or changing authentication, authorization, or permissions;
- sending project or personal data to a model or external service;
- spending money or making a paid model call;
- writing to an external service, messaging another person, publishing, or
  deploying;
- changing production systems or production data; or
- doing anything destructive, irreversible, public, or outside the named
  repository.

Proceed only after the owner clearly approves that exact action. Approval for
one action is not blanket approval for another. Safe read-only investigation
and local preparation may continue while waiting.

Use the smallest control that addresses the real risk.

## Secrets and provider access

Never ask the owner to paste a password, API key, token, cookie, recovery code,
private key, bank detail, or `.env` contents into chat. Never print, copy,
commit, or log a secret.

The owner personally connects an AI provider through the provider's official UI
or an operating-system credential store. The AI must not operate or inspect
that login. Before a paid or data-bearing model call, confirm the provider,
model, data being sent, target project, and cost or quota limit. Record only
non-secret results and redacted errors.

## The connected conductor

The owner may connect one conversation model — the conductor — with a single
standing authorization, given on a connect screen that names the provider, the
model, the data that may flow during conversation (the owner's messages, the
project's task records, a summary of recent saved changes, and project file
names; never file contents without a separate authorization, and never
credentials), and the cost basis. While
connected, a visible indicator names the conductor's provider and model, and
conversation proceeds without per-message approval. The owner may revoke the
connection at any time, which deletes the stored credential. Every other
boundary keeps its own pause: each worker dispatch, each paid worker call, and
every action on the concrete-risk list still waits for that action's own
approval.

When a dispatched task finishes, the envelope itself writes the result card the
owner sees, and the conductor then takes one short comment turn on it. That
comment is a model call on the same cost basis as the rest of the conversation.

Cairn may offer a push button when local commits are ahead of the remote; every
push shows the exact target, effect, and recovery plan, and runs only on the
owner's approval of that exact action.

## When a qualified person is required

Get an appropriately qualified human before live work involving application
permissions, payments, personal or regulated data, destructive migrations,
production security or infrastructure, public legal commitments, or
safety-critical behavior. More AI process is not a substitute for expertise.

## Git protection

- Never clean, reset, stash, overwrite, or broadly stage existing work just
  because the tree is messy.
- Treat modified and untracked files as valuable until ownership is clear.
- Stage task paths by exact name. Do not use broad staging such as `git add -A`.
- Skip the commit when unrelated staged work or path ambiguity prevents
  isolation.
- Never rewrite history to hide a failed attempt.

## Simple owner commands

The owner's plain-language request is enough. These short forms are convenient,
not magic authorization phrases:

- `Work on: [visible outcome]` — complete one local task continuously.
- `Continue task NNN.` — continue the same unfinished outcome from saved
  evidence.
- `How do I try it?` — explain safe local trial steps without changing files.
- `Review task NNN.` — provide an optional read-only second look.
- `Stop. What just happened?` — freeze and explain the exact state and options.
- `Change the project rules: [change]` — update the contract and its mirrors,
  check the diff, and report the result.

## Stop immediately when

- the project root or ownership of existing work is unclear;
- protected work changes unexpectedly;
- a secret would enter chat, output, files, logs, or tools;
- an unapproved destructive, credentialed, paid, public, production, or
  external action would occur;
- required qualified expertise is missing; or
- recovery is unclear.

When stopping, preserve the state and explain the smallest useful next choice.
