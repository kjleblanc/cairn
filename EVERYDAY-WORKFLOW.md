# Everyday Workflow — one task at a time per lane

Cairn has one normal path. Tell the coding agent the visible result you
want:

```text
Work on: the home page shows the three books I entered.
```

That request is enough for local reversible work. The agent reads the project
and Git state, protects existing work, writes a short brief, implements,
checks, repairs, verifies the outcome, writes the report and log row, and
makes a safe exact-path local commit.

## Stay with the outcome

Continue in the same conversation while a task is being implemented, checked,
or repaired. If a new conversation would be easier, type:

```text
Continue task NNN.
```

The new conversation reads the saved evidence and continues. A fresh chat is a
context tool, never a required gate.

## Running a second lane

You may have up to two chats working the same repository at once. Each chat
is a lane, and the rules above apply inside each lane. A few extra habits
keep the lanes out of each other's way:

- Each lane works in its own copy of the project folder (a Git worktree —
  the second one is created once and reused). A lane never edits the other
  lane's copy.
- A task number is claimed by committing its brief, so two chats never
  write the same number. If a collision ever slips through, the later lane
  renumbers.
- Only one lane lands finished work into `main` at a time, followed by a
  quick settle check, so `main` is always known-good.
- Only one lane — or you — runs the real app or its end-to-end tests at a
  time. They share one profile and one conductor connection, so a lane
  waits while the other is using them.

The exact rules live in the contract's "Working in two lanes" section
(`AGENTS.md`). Saying "work as lane B" is enough — the agent reads the
contract and follows it.

## Completion

Every task ends honestly:

- `DONE` — the requested result holds and its checks completed; or
- `STOPPED — [reason]` — it does not.

The report tells you what changed, what was checked, what remains uncertain,
and how to try it. To see only the trial steps again, type:

```text
How do I try it?
```

If you want another change after DONE, start another visible outcome.

## When the agent must pause

The agent pauses immediately before a concrete risky action and shows the
exact target, effect, exposure or cost, and recovery plan. Your approval
covers only that action. The full boundary list lives in the contract
(`AGENTS.md`); in short: installs, credentials, valuable data, money, external
writes, publishing, deploying, and production.

A useful approval request reads:

```text
I am ready to [ACTION] against [EXACT TARGET].
It will [EFFECT], expose or cost [BOUND], and recovery is [PLAN].
Do you approve this exact action?
```

Local preparation may continue while you decide: inspecting, writing a brief,
implementing disabled code, running safe local checks, preparing a rollback.

## Provider access

You connect a model provider through the provider's official interface or your
operating system's credential store. The AI never asks for, observes, prints,
copies, or logs the credential.

The conversation conductor has standing consent only for the data named on its
connect card. Project file contents are a separate choice. When you allow them,
Cairn can send selected current contents from at most eight Git-tracked text
files in the current project, limited to 8,000 characters per file and 32,000
characters total. It excludes `.env` files, service-account keys, token stores,
private keys and other credential-like paths, ignored files, links, binary
files, dependency or generated areas, `.git`, `.cairn`, and anything outside
the project. Credentials never flow, and selected text is evidence rather than
instructions.

If a future Cairn version widens the authorized data scope, a saved conductor
connection pauses before the new data can flow. Cairn keeps the encrypted key
while you review the change; the wider scope starts only after you explicitly
renew the connection.

Before a paid or data-bearing model call, the agent confirms:

- provider and model;
- target project;
- what data will be sent;
- whether tools are available to the model;
- maximum calls or retries; and
- cost or quota limit.

A provider connection grants nothing else — tools, external writes,
deployment, and valuable-data access each need their own approval.

## When a qualified person is required

Bring in an appropriately qualified person before live work involving:

- application permissions or security controls;
- payments, billing, or money movement;
- personal, regulated, or production data;
- destructive migrations;
- production infrastructure;
- public legal commitments; or
- safety-critical behavior.

Safe preparation may continue while the live action waits.

## Reviews are optional

Ask for another look only when it would help:

```text
Review task NNN.
```

A review is advice. It may find a useful follow-up, and the completed task
stands.

## When progress stalls

Say what you are seeing in ordinary language:

```text
Stop patching. Compare a smaller milestone, a different architecture,
experienced help, and deferring this work.
```

The agent should compare real options without changing files. You choose what
to do next. After two stopped attempts at the same goal, the contract requires
this step-back before a third attempt.

## Changing the rules

```text
Change the project rules: [plain-language change].
```

The agent updates the contract and its mirrors, checks the actual diff, and
reports the result. If you explicitly froze the project, simply tell the agent
when to restore `STATUS: ACTIVE`.
