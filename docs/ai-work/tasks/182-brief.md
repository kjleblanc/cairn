# Task 182 — one cohesive Cairn composer

**Lane:** Standard (main checkout)

**Base commit:** `64dccfcee91b03f41ac02fc6b154b37d6e365ab6`

## Visible outcome

The desktop conversation has one deliberate composer instead of three
competing controls. **Talk to Cairn**, **New**, and **Send** live inside the
same bordered composer surface: the writing area occupies the top, a quiet
**New** action sits at the lower left, and **Send** remains the clear primary
action at the lower right. The detached **New conversation** row disappears,
and the whole control still fits Cairn's narrow conversation panel.

## Boundary of intent

- This is the owner-approved first visual simplification only. Conversation
  wording, task cards, proposal authority, provider calls, cost behavior,
  dispatch, queueing, retries, stored data, and result cards do not change.
- Existing send, Enter/Shift+Enter, draft, focus, disabled-state, action-reply,
  and new-conversation behavior remains exact. The visually shorter **New**
  control keeps the accessible name **New conversation**.
- No dependency, Core/CLI/phone source, connection, credential, provider,
  worker, push, publish, or deployment changes.
- Existing Task 180 stopped evidence, the uncommitted Task 180/181 `LOG.md`
  rows, and the pre-existing runtime-written `app/launch-build.log` change are
  protected and remain outside this task.
- No real provider or worker call is part of verification. A desktop visual
  check uses Cairn's scripted fake only, both app-token locks, and waits while
  the owner's real app is open.

## Checks

1. Add a red-first renderer contract test proving the textarea, **New**, and
   **Send** share one composer surface and the old detached row is gone.
2. Pin the compact/narrow CSS structure, focus behavior, keyboard behavior,
   and exact enabled/disabled gates without reimplementing them.
3. Run the focused renderer unit test, full App unit suite, typecheck, and both
   production builds.
4. With the owner's app closed and both app-token directories held, run one
   focused fake-provider Electron path that inspects the real composer DOM,
   checks **New** and **Send** behavior, and captures the visible result.
5. Run `git diff --check`, inspect the exact diff and final Git status, and
   re-hash every protected pre-existing path.

## DONE / STOPPED

**DONE** means the real desktop composer visibly reads as one control at normal
and narrow widths, all existing behavior remains pinned, the checks pass, the
owner can safely judge the captured result, and only isolated Task 182 paths
are committed.

**STOPPED** means the three controls still read as separate pieces, narrow
layout clips or overlaps, behavior/accessibility changes, a check fails without
a safe in-scope repair, protected work changes unexpectedly, or the required
single-tenant desktop check cannot run after waiting for its token.
