# High-Stakes — pause at the real boundary

High-Stakes is a description of risk, not a separate multi-chat workflow. Cairn
Contract v3.0 keeps the task moving locally and pauses only immediately before an
action that could cause real harm or external effect.

## Actions that need exact approval

Before acting, the agent must show the exact target, effect, likely cost or exposure,
and recovery plan for:

- installing or updating software or dependencies;
- deleting, overwriting, moving, or transforming valuable or unclear data;
- using credentials or changing authentication, authorization, or permissions;
- sending project, personal, or valuable data to a model or external service;
- paid model calls, purchases, payments, refunds, or money movement;
- external-service writes or messages to another person;
- publishing, releasing, or deploying;
- production systems or data; and
- destructive, irreversible, public, or out-of-repository actions.

The owner then approves or declines that exact action. Approval does not silently
cover retries, a different target, more cost, or another external effect.

Local preparation may continue: inspect, write a brief, implement disabled code,
run safe local checks, and prepare a rollback. Do not create a second task merely to
name the pause.

## A useful approval request

The agent should say, in plain language:

```text
I am ready to [ACTION] against [EXACT TARGET].
It will [EFFECT], expose or cost [BOUND], and recovery is [PLAN].
Do you approve this exact action?
```

No pinned-plan approval, fresh-chat review, reviewer verdict, Draft/Final label, or
owner-decision receipt is required unless the owner explicitly asks for one.

## Provider access

The owner connects a model provider through the provider's official interface or an
operating-system credential store. The AI never asks for, observes, prints, copies,
or logs the credential.

Before a paid or data-bearing model call, confirm:

- provider and model;
- target project;
- what data will be sent;
- whether tools are available to the model;
- maximum calls or retries; and
- cost or quota limit.

Record non-secret results and redacted errors only. A provider connection does not
grant permission for arbitrary tools, external writes, deployment, or valuable-data
access.

## Qualified expertise

An appropriately qualified person is required before live work involving:

- application permissions or security controls;
- payments, billing, or money movement;
- personal, regulated, or production data;
- destructive migrations;
- production infrastructure;
- public legal commitments; or
- safety-critical behavior.

When expertise is missing, safe preparation may continue, but the live action stays
stopped. More AI-generated paperwork is not a substitute.

## Recovery and evidence

Prefer reversible changes and local commits. Check the actual diff and the real
system state. A passing test proves only what it exercised. A review is optional
additional evidence, not a mandatory acceptance gate.

If the owner wants a second look:

```text
Review task NNN.
```

The review may recommend a follow-up task. It does not reopen the original task or
force an accept/revise loop.
