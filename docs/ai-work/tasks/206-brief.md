# Task 206 brief — headless catalog, cache, and sticky Auto kernel

**Lane:** E

**Base commit:** `93e504d63026ea562c77fb36e68295f8c7e96827`

**Plan:** Task 4 of
`docs/superpowers/plans/2026-08-06-cairn-model-connections.md`

## Requested visible outcome

There is deliberately no new owner-facing screen or behavior in this task.
Cairn's current exact pinned OpenRouter/custom-compatible conductor continues
to behave exactly as it does now, while main gains a fake-testable kernel for:

- bounded, canonical connection-specific model catalogs;
- cache identity and freshness tied to the exact authentication revision;
- deterministic pinned and reviewed/versioned Auto resolution; and
- project-and-conversation-sticky exact route continuity that can be
  revalidated without granting permission by persistence alone.

This implements only **Task 4 — Add catalog drivers, cache, and sticky Auto
headlessly**. The owner's approved rule remains authoritative: Auto is sticky
within one conversation and one connection under a reviewed, versioned policy.

## Boundary of intent — what must not change

- Preserve the current consent, authorized payload, stream ordering,
  cancellation, provider-visible request behavior, endpoint, and exact pinned
  OpenRouter/custom-compatible model. The migrated legacy authorization bridge
  remains pinned and cannot authorize catalog refresh, Auto, a model or billing
  change, wider scope, or another project.
- No Task 5 route attempt/completion receipts, transcript/custody changes, or
  receipt IPC enter this task.
- No connection hub, model picker, visible Auto, role-filling flow, Builder
  default/one-task override, runtime materialization, or other Task 6+ work
  enters this task.
- No real provider driver, provider login, credential use, metadata request,
  model call, non-loopback network access, dependency or lockfile change,
  install, push, publication, or deployment is authorized.
- Tests use only inert fake drivers, deterministic clocks/identifiers, and
  temporary local files. Provider raw data stays inside its driver, and a
  driver cannot read project content.
- Auto never ranks providers or invents a meaning for newest, best, or first by
  sort order. It never crosses connection, account, billing source, role, or
  runtime, and a raw API model never becomes a worker merely by advertising
  tools.

## Checks that will show the outcome holds

1. **`c1`** — from `app`, `npm.cmd run test:unit` passes. The new fake-only
   catalog and resolver tests cover Task 4's red-first list: exact cache key and
   reauthentication invalidation; strict normalization and canonical revision;
   hard-TTL display-only handling; outage versus 401/403 classification;
   removed pins; reviewed recommendation/provider-default Auto ordering; no
   sort fallback; role/runtime/billing/routing isolation; raw-API worker
   refusal; pinned-only fixed workers; project/conversation binding isolation
   and restart continuity; full secret-free route persistence and
   revalidation; and deterministic authority digests.
2. **`c2`** — from `app`, `npm.cmd run typecheck` passes with the new main-only
   driver, registry, catalog, cache, and resolver types included in the unit
   TypeScript project.
3. **`c3`** — `git diff --check`, the complete real diff, and final Git status
   show only Task 4's plan-listed implementation/test/config paths plus Task
   206's records and one append-only LOG row. Inspection confirms the existing
   conductor service still takes the same pinned path and transport, no secret
   or raw provider response crosses the new seams, and no Task 5 or later work
   was absorbed.

## What DONE and STOPPED mean here

**DONE:** all three checks pass; deterministic sticky Auto, cache freshness,
and exact-route isolation are proven with fakes; and current pinned conductor
behavior remains unchanged.

**STOPPED:** any required rule needs a global provider ranking or an invented
meaning of newest/best, fake-only proof is insufficient, pinned behavior would
change, provider/credential/network access would be required, or the safe
repair would cross into Task 5 or a later slice. The report will name the exact
blocker and smallest safe next step.
