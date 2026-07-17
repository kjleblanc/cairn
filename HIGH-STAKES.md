# High-Stakes — when a mistake would really hurt

Use this lane when a mistake would be hard to notice, hard to reverse, or genuinely
harmful. It slows the loop down on purpose: more checking before, during, and after.

Be honest about what it cannot do. **A longer checklist cannot make you qualified to
approve security, payments, legal, or infrastructure work.** For those, the missing
ingredient is a person, not more process.

## When this lane applies

The AI must propose High-Stakes (and you can demand it) for:

- dependencies, build configuration, or release systems;
- stored-data formats, schemas, migrations, or public interfaces;
- broad refactors that cross several parts of the project;
- tools that write, move, delete, or transform files;
- production systems or real effects outside your computer;
- anything you would seriously regret shipping wrong.

**Work that also requires an experienced human before anything runs live:**

- real login, permissions, or anything guarding who can do what;
- secrets, personal data, health data, or financial data;
- payments, billing, refunds — any movement of money;
- destructive migrations, deletions, or anything irreversible;
- production infrastructure and security controls;
- public messages, legal commitments, or safety-critical behavior.

If no qualified person is available, the honest outcome is `STOPPED — EXPERT_NEEDED`.
The AI may investigate, explain, and prepare a plan that executes nothing — but it
must not perform the live risky action. This rule holds even when everything seems to
work.

## What changes from Standard

The loop is still Define → Build → Verify → Decide, with four additions:

1. **Define splits in two.** The AI first proposes the plan in chat without saving
   anything; the brief file is written only after you have read the proposal.
2. **The brief gets its own commit** before building starts, so what you approved is
   pinned and cannot quietly drift.
3. **Fresh-context review is mandatory,** on every High-Stakes task, plus a qualified
   human where the list above requires one.
4. **You sign the decision.** The closing decision records what was checked, by whom,
   and what uncertainty you knowingly accepted.

## A. Ask for the plan (nothing is saved)

```text
Plan a High-Stakes task, read-only: [OUTCOME].
Why it is High-Stakes: [RISK].

Follow the project contract, plus: change nothing and save nothing this turn.
Propose the complete brief in chat only, and add to the usual brief contents:
- what could be damaged and whether the damage is reversible;
- the rollback plan — the exact way we get back to safety;
- a rehearsal: how to try this safely before it counts;
- which experienced human this needs, or "none" with a concrete reason;
- every live action needing separate approval, listed one by one.

If the project state cannot be trusted, rollback is not credible, or required
expertise is missing, propose STOPPED instead of a plan.
```

Read the proposal slowly. Ask about anything you do not understand — "explain the
rollback plan like I'm new to this" is a perfectly good message.

## B. Save the brief, then pin it

```text
Save exactly the brief you proposed as docs/ai-work/tasks/[NNN]-brief.md. Change
nothing else. Then commit only that brief file so it is pinned before building.
Saving is not approval — stop and wait for mine.
```

## C. Approve and build (in a fresh chat)

Start a **new chat** for the build, so the builder reads the pinned brief with fresh
eyes:

```text
I approve the exact current contents of docs/ai-work/tasks/[NNN]-brief.md. Build it.

Follow the project contract, plus: confirm the brief's pinned commit exists and the
brief is unchanged. Rehearse before any live effect. Pause and show me the exact
target and rollback before any destructive, paid, public, or production action, even
if the brief authorizes it. Include at least one check that was not created as part
of this task. Do not call the task DONE while any required approval, human review,
or rollback proof is missing.
```

## D. Review from a fresh chat (mandatory)

```text
Review task [NNN].

This was High-Stakes, so additionally verify: the built work matches the pinned
brief exactly; the rehearsal and rollback actually happened and are believable;
every required approval and human review is present, not promised; and any changes
to tests or checking tools are themselves examined. State clearly which risks remain
open and whether a qualified human still needs to look.
```

Where the work touches the expert-required list, the verdict you act on is the
human's. The AI review supplements it; it cannot substitute for it.

## E. Close with a signed decision

```text
My decision for High-Stakes task [NNN]: [ACCEPT / CORRECT / ROLLBACK / DEFER / ABANDON].
Review verdict I accept: [VERDICT].
Experienced human involved: [NAME OR ROLE, or "not required" and why].
What I personally checked: [WHAT YOU SAW].
Uncertainty I knowingly accept: [WHAT REMAINS UNKNOWN].

Record this in the task report. Do not release, push, deploy, or activate anything —
if a live action is next, I will authorize it separately and explicitly.
```

## About proof and paperwork

Before adding heavier machinery — generated receipts, hashes, evidence chains — ask
who needs the proof and which real dispute it would settle. A hash proves bytes match
bytes, not that the bytes are right. A passing script proves only what the script
tests. A second AI can share the first one's blind spots. One qualified human reading
the actual change usually beats all of it. Add machinery only when a real reviewer,
contract, or regulation demands it and someone will maintain it.

## Stop immediately when

- a required expert or approval is missing;
- a secret would need to enter the chat;
- the rollback plan is unclear or untested;
- the accepted brief changed after approval;
- a decisive check fails;
- the live state no longer matches what was reviewed.

High-Stakes succeeds when risk and authority stay visible — not when it produces the
most paperwork.
