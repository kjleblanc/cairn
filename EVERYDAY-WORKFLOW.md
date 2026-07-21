# Everyday Workflow — the commands you actually use

Cairn Contract v2.3 uses **risk-based autonomy**: routine local work moves forward;
real risk pauses for you.

## The normal path

Open the project in your coding agent and type:

```text
Work on: [the visible result you want]
```

For example:

```text
Work on: the home page shows the three books I entered.
```

The AI reads the project, protects existing work, and classifies the task:

- **Tiny or Standard:** it saves a short task brief and continues immediately through
  implementation, checks, report, log, and a safe local commit. You do not approve
  each transition.
- **High-Stakes:** it changes nothing and tells you to use the High-Stakes planning
  command instead.

The brief is still useful: it records the outcome, boundary, protected files, first
visible checkpoint, and checks. It is project memory, not a permission slip for
routine work.

## Stay with the task

One outcome may continue in the same chat through implementation, failed checks,
repairs, verification, and your feedback. A task does not need a new chat merely
because one phase ended.

If you deliberately continue in a new chat, type:

```text
Continue task NNN.
```

The AI re-reads the saved task state and continues from the last real checkpoint.
It must not restart the task or discard unfinished work.

## What completion looks like

The AI finishes a Tiny or Standard task with one honest result:

- `DONE` — the bounded outcome and its checks completed; or
- `STOPPED — [reason]` — they did not.

It writes `docs/ai-work/tasks/NNN-report.md`, appends the work log, and tells you
exactly how to try the result. No separate owner-decision message is required.

To get the try-it steps again without changing anything:

```text
How do I try it?
```

If your feedback requires another code change after a task is DONE, use a new
`Work on:` outcome. The new task references the old one rather than rewriting its
history.

## High-Stakes work

Use High-Stakes when a mistake could be costly, hard to reverse, externally visible,
or security-sensitive. Start with:

```text
Plan a High-Stakes task: [the result you want]
```

The AI works read-only, saves and pins a detailed brief, shows it to you, and stops.
If you understand and accept that exact boundary, use the approval message it gives
you:

```text
Approve High-Stakes task NNN at docs/ai-work/tasks/NNN-brief.md. Build it.
```

A fresh build chat is optional; exact approval is not. Before any destructive, paid,
public, credentialed, production, or external action, the AI pauses again and shows
you the exact target, effect, and rollback.

After the build, open a brand-new chat and type:

```text
Review High-Stakes task NNN.
```

That fresh-context review is mandatory. After reading its verdict, record your
decision with:

```text
My decision for High-Stakes task NNN: [accept / revise / rollback / defer / escalate].
What I personally checked: [what you saw].
Uncertainty I accept: [what remains unknown].
```

Acceptance does not silently deploy, publish, spend money, use a credential, or
activate a Draft. Those actions still need exact separate approval.

See [HIGH-STAKES.md](HIGH-STAKES.md) for the full boundary and examples.

## Cairn's bootstrap workflow

While Cairn cannot reliably improve itself through its own app or CLI, maintainers
normally use the coding agent directly:

```text
Bootstrap Cairn: [the visible improvement]
```

This is not a safety bypass. Standard bootstrap work proceeds continuously; genuine
High-Stakes work still uses planning, approval, review, and expert requirements.
Once a separate High-Stakes Final has been approved, reviewed, accepted, and
activated, a bounded concurrent path may run at most two independent Standard tasks
in isolated operating-system temporary worktrees. Their declared implementation and
test paths cannot overlap, they have no task-to-task dependencies or task-level
external actions, and they integrate into `main` one at a time.

Task 016 stays immutable historical evidence. A new High-Stakes Final may reuse or
repair its exact implementation while retaining its review concerns; a contract
amendment does not itself activate parallel mode.

## Optional review for routine work

Routine work does not require a review gate. When another look would genuinely help,
open a new chat and type:

```text
Review task NNN.
```

The reviewer checks the brief, actual diff, tests, protected work, and report. Its
findings become evidence for follow-up work; they do not erase the completed task.

## When something goes wrong

### A check fails

The AI normally repairs the smallest in-scope mistake and reruns the affected checks
inside the same task. It should not create a new task for an ordinary compile error,
behavior mismatch, or broken fixture.

It stops when the repair would change the requested outcome, cross into High-Stakes
work, require missing authority, threaten protected work, or make rollback unclear.

### You feel lost

Type:

```text
Stop. What just happened?
```

The AI freezes and explains the current state, what happened, and the safest options.

### The same approach keeps failing

Type:

```text
Direction check: [what keeps going wrong]
```

The AI makes no patch. It compares genuinely different options: reduce the
milestone, change architecture, get experienced help, defer the work, or continue
with clear eyes. The gate advises you; it does not ban the current approach. To
continue it after reading the evidence, type:

```text
Owner override: continue this approach after the Direction Gate.
```

### You need to change a process step

Type:

```text
Owner override: [the exact process instruction]
```

An override can remove needless ceremony. It cannot expose secrets, alter protected
work without permission, invent expertise, or silently authorize an external effect.

## Changing the rules themselves

Type:

```text
Amend the project contract: [the rule change]
```

The AI freezes product work, inventories the tree, changes `STATUS` to `PAUSED`, and
updates only the contract and its required mirrors. It shows the complete checked
amendment while the project remains paused.

Only this exact later message restores the contract:

```text
I approve the contract amendment. Restore STATUS: ACTIVE.
```

## When Cairn updates

The app may show that a newer contract exists. Updating is a governance change, so
every Project fact except the temporary `STATUS: PAUSED` change must survive
byte-for-byte, and product work stays frozen during review.

### Check the proposed update

```text
Check the current Cairn contract version in AGENTS.md against the newest
CONTRACT-TEMPLATE.md. Work read-only. Explain the rule changes in plain language,
identify any project-specific rules that must be preserved, and show the exact files
that an update would change. Do not apply the update, install anything, use the
network, or change product files. End by telling me that applying the update requires
my next message beginning: "Amend the project contract: update this project to Cairn
Contract v[VERSION]."
```

### Apply the reviewed update

```text
Amend the project contract: update this project to Cairn Contract v[VERSION], using
the reviewed CONTRACT-TEMPLATE.md. Preserve every Project fact except the required
temporary change of STATUS to PAUSED, and keep all stronger project-specific safety
rules. Update only AGENTS.md and required local mirrors. Show the complete diff while
STATUS remains PAUSED. Do not start product work, install, push, deploy, or contact
an external service.
```

### Record an app-applied update

```text
I used the Cairn app to update this project's contract. Verify that AGENTS.md is the
new contract version, STATUS is PAUSED, every other Project fact is unchanged, and no
other file changed. If safe, commit only AGENTS.md by exact path. Do not push or start
product work. The contract remains PAUSED until I send: "I approve the contract
amendment. Restore STATUS: ACTIVE."
```

## The safety boundary in one paragraph

Tiny and Standard autonomy covers scoped local edits, already-installed tools,
proportionate checks, local previews, and safe exact-name commits. The AI still needs explicit
approval for installs, network access, credentials, money, deployment, messages,
external writes, destructive or irreversible actions, production changes, or
valuable data. Never paste a secret into chat.

For provider authentication only, owner-managed local AI access may use the
provider's official installed authentication without a qualified-human verdict. You
personally operate account linking; the AI never sees login or any credential, token,
cookie, or raw account value. The ordinary profile is one disposable tool-free call,
or two separately bounded Bootstrap calls. A contained scheduler profile may instead
use at most two Standard tasks and four fixed calls in a new disposable repository
after an approved Final proves root-scoped tools, passive-only writes, no model-
authored execution, and a fresh non-failing review. Immediately beforehand, you
approve the exact access, provider, model, target, finite call count, and total cost
or quota cap. Valuable repositories, permission changes, billing, production, and
public actions are outside this exception.
