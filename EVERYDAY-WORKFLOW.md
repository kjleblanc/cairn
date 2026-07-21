# Everyday Workflow — one task at a time

Cairn Contract v3.0 has one normal path. Tell the coding agent the visible result you
want:

```text
Work on: the home page shows the three books I entered.
```

That request is enough for local reversible work. The agent reads the project and
Git state, protects existing work, writes a short brief, implements, checks, repairs,
writes the report and log row, and makes a safe exact-path local commit. It does not
stop for approval between those phases.

## Stay with the outcome

Continue in the same conversation while a task is being implemented, checked, or
repaired. If a new conversation would be easier, type:

```text
Continue task NNN.
```

The new conversation reads the saved evidence and continues. A fresh chat is never
a required gate.

## Completion

Every task ends honestly:

- `DONE` — the requested bounded result and checks completed; or
- `STOPPED — [reason]` — they did not.

The report tells you what changed, what was checked, what remains uncertain, and how
to try it. To see only the trial steps again, type:

```text
How do I try it?
```

If you want another change after DONE, start another visible outcome. Do not rewrite
the old report.

## When the agent must pause

The agent pauses immediately before a concrete risky action: installing software,
using a credential, sending valuable data to a model, spending money, deleting or
transforming valuable data, writing to an external service, messaging someone,
publishing, deploying, or changing production.

It must show the exact target, effect, exposure or cost, and recovery plan. Your
approval covers only that action. There is no separate planning/review workflow
wrapped around the whole task.

See [High-Stakes](HIGH-STAKES.md) for examples and the boundaries that require a
qualified person.

## Reviews are optional

Ask for another look only when it would help:

```text
Review task NNN.
```

A review is advice. It may find a useful follow-up, but it does not automatically
change DONE to revise, require a decision receipt, or block the next task.

## When progress stalls

Say what you are seeing in ordinary language:

```text
Stop patching. Compare a smaller milestone, a different architecture, experienced
help, and deferring this work.
```

The agent should compare real options without changing files. You choose what to do
next. No override phrase is required.

## Changing the rules

```text
Change the project rules: [plain-language change].
```

The agent updates the contract and required mirrors, checks the actual diff, and
reports the result. The change itself does not invent a review or reactivation loop.
If you explicitly froze the project, simply tell the agent when to restore
`STATUS: ACTIVE`.

## Safety in one paragraph

Local reversible repository work proceeds. Existing work is never cleaned, reset,
stashed, overwritten, or broadly staged merely because it is messy. Never paste a
secret into chat. Credentials, paid calls, external writes, destructive actions,
deployment, production, and valuable data need exact approval immediately before the
action, plus qualified expertise where the contract requires it.
