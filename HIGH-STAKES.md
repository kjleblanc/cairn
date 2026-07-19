# High-Stakes — when autonomy must pause

Cairn Contract v2.0 lets Tiny and Standard work move continuously. This guide covers
the smaller set of changes where a mistake could be costly, hard to reverse, or
externally visible.

More process cannot replace missing expertise. Security, payments, production data,
and other specialist boundaries need a qualified person, not a longer AI checklist.

## What belongs here

Use High-Stakes for:

- dependencies, build/release systems, or public interfaces;
- stored-data formats, migrations, destructive operations, or valuable data;
- authentication, authorization, permissions, secrets, or security controls;
- production systems, deployment, payments, billing, or money movement;
- network calls, external-service writes, public messages, or legal commitments;
- broad refactors whose recovery path is uncertain; or
- anything that can affect people, systems, or data outside the named local repository.

Removing or moving clearly scoped tracked code can remain Standard when Git makes it
plainly recoverable. Untracked files, user data, production data, and unclear
ownership always move the work up.

## What changes from Standard

High-Stakes adds four gates:

1. A detailed brief is written and pinned before implementation.
2. The owner explicitly approves the exact brief.
3. Each destructive, paid, public, credentialed, production, or external action gets
   its own just-in-time approval after the exact target and rollback are shown.
4. A fresh-context review and owner decision are mandatory before acceptance or
   activation.

A new build chat is optional. The exact approval and fresh review are not.

## Step 1 — plan

Paste:

```text
Plan a High-Stakes task: [the result I want].
```

The AI works read-only first, then saves the next numbered task brief. The brief must
name:

- the visible outcome and milestone movement;
- every allowed and protected path;
- the first safe visible checkpoint;
- what could be damaged;
- the rollback plan;
- the rehearsal before any live effect;
- the exact checks;
- every separately approved action;
- the qualified human required, or `none` with a concrete reason;
- whether the result is an Experimental Draft or activation-ready; and
- the DONE and STOPPED conditions.

When Git is safe, the AI commits only the brief so the approved bytes are pinned. It
shows the complete brief and stops.

Planning does not authorize an install, network call, credential, cost, deployment,
message, external write, destructive action, or production effect.

## Step 2 — approve and build

After reading the exact saved brief, paste the message the AI provided:

```text
Approve High-Stakes task NNN at docs/ai-work/tasks/NNN-brief.md. Build it.
```

The AI rechecks the pinned brief and protected starting state, rehearses safely, and
builds only that boundary. A correctable implementation or checking mistake is fixed
and rerun in the same task. Scope growth, missing authority, secret exposure,
protected-state changes, uncertain rollback, or a genuine safety failure stops the
task.

Immediately before any authorized live action, the AI pauses and states:

- the exact target;
- the exact effect;
- what data, people, service, or money is involved;
- the rollback; and
- the exact approval message it will accept.

The original brief is not blanket authority for that moment.

The build ends with a report and, when safe, an exact-name local commit. It does not
silently activate a Draft.

## Step 3 — fresh-context review

Open a brand-new chat and paste:

```text
Review High-Stakes task NNN.
```

The reviewer reads the pinned brief, actual diff, protected starting work, and test
changes before reading the builder's report. It forms a provisional verdict, runs
safe decisive checks, then audits the report last.

The verdict is one of:

- `PASS`
- `PASS WITH CONCERNS`
- `FAIL`
- `VALID STOPPED`

The review says what actually worked, whether the boundary held, what remains
unproved, and which qualified human is still required. A fresh AI chat reduces tunnel
vision; it is not independent expert assurance.

## Step 4 — owner decision

After reading the review and trying the result where safe, paste:

```text
My decision for High-Stakes task NNN: [accept / revise / rollback / defer / escalate].
Review verdict I accept: [VERDICT].
Qualified human involved: [NAME OR ROLE, or "none" with the reason].
What I personally checked: [WHAT I SAW].
Uncertainty I accept: [WHAT REMAINS UNKNOWN].
```

The AI records the decision in the work log and changes no product file. Revision or
rollback is a new task. Acceptance still does not authorize deployment, publishing,
credentials, cost, or another external effect.

## Experimental Drafts

Use an Experimental Draft when risky technology can be learned from safely before it
is ready for valuable work. The candidate must be:

- disabled by default;
- restricted to newly created synthetic or disposable inputs;
- free of credentials, network calls, money, deployment, public action, and other
  live effects;
- judged through one named supported user path; and
- immediately reversible by leaving it disabled.

The review judges that path and containment, not imaginary production perfection.
Defects outside the supported path may remain documented concerns when they cannot
break the path or escape containment. `PASS WITH CONCERNS` preserves learning
evidence only. A later High-Stakes task must name the exact candidate and all retained
concerns before activation.

## Repair and rerun

A failed check is evidence, not an automatic stop or new task. The AI may make the
smallest correction when:

- the cause is an in-scope implementation or checking-harness mistake;
- the approved outcome and safety boundary do not change;
- no acceptance criterion is weakened;
- protected work and rollback remain sound; and
- no genuine safety failure occurred.

Important failed output and corrections go in the report. If a checking tool changes,
the test must not be made easier merely to pass. Every affected check is rerun.

## When a qualified human is mandatory

A qualified human must review before live work involving:

- application login, authorization, or permissions;
- payments, billing, refunds, or money movement;
- personal, regulated, or production data;
- destructive migrations;
- production infrastructure or security controls;
- public legal commitments; or
- safety-critical behavior.

Without that person, preparation may continue safely, but the live outcome is
`STOPPED — EXPERT_NEEDED`.

## Owner-managed local AI credentials

A provider credential can avoid expert review solely for provider authentication
only when a real process or operating-system boundary keeps its value out of:

- chat, prompts, model context, and model output;
- tool requests, results, subprocess environments, and command arguments;
- project files, Git, logs, errors, crash output, analytics, and telemetry; and
- renderer memory, IPC, browser APIs, and browser storage.

The owner must manage the credential through the provider's official local login or
an operating-system credential store. The provider-facing component may return only
non-secret status, opaque handles, and redacted errors. A synthetic canary rehearsal
and boundary inspection must support the claim before real use.

The owner separately approves credential use, provider network access, and any cost.
This exception does not cover application-user authentication, permissions, billing,
money movement, or another secret class. Cairn's current broad model-tool runtime is
not automatically qualified.

## Evidence without theater

A hash proves bytes match bytes. A passing test proves only what it exercises. A
second AI can share the first AI's blind spots. Add receipts, hashes, branches,
worktrees, and generated evidence only when a concrete risk or reviewer needs them.

For many High-Stakes tasks, one experienced human reading the actual change is more
valuable than a large pile of AI-generated paperwork.
