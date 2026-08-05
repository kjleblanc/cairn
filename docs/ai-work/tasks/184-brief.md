# Task 184 — one-screen proposal handoff

**Lane:** E

**Base commit:** `7931656011a0f04fb85d7e82a3d8cd92ebc268e0`

## Visible outcome

Cairn's active task proposal becomes a compact, decision-first card. The card
shows one plain heading, the proposed outcome, any concern that needs the
owner's decision, and the next action. Full source attribution, exact owner
quotations, requirements, and carried context remain available behind a
closed-by-default **Details** disclosure instead of filling the conversation.

The visible primary action shortens from **Review dispatch** to **Review**.
When the owner sets the last concern aside, Task 181's guaranteed fresh card
appears with no risks, **Review** enabled, and the carried concern available in
Details. Cairn's proposal reply itself uses at most one short sentence and
does not repeat the card or explain its mechanics.

## Boundary of intent

- This task changes the desktop proposal presentation and the conductor's
  proposal-copy instruction only. The top bar, composer completed by Task 182,
  questions, final dispatch preview, result cards, run screen, phone UI, and
  general conversational replies do not change.
- Main remains the only action, risk, replacement, preview, and dispatch
  authority. Task 181's fallback, exact accepted request, risk identities,
  context carry, one-time retirement, stored data, and every owner-only gate
  remain unchanged.
- Details hides nothing permanently: it uses a native keyboard-accessible
  disclosure and contains the same reusable attributed intent view the card
  shows today. The final preview continues to show the complete task before
  any work can start.
- No dependency, credential, connection, paid/real model call, worker dispatch,
  project fact, milestone, push, publish, deployment, or production change.
- Task 180/183's retained stopped work on `main` remains protected. Task 182's
  committed composer is the clean base in Lane E; nothing lands to `main`
  while that checkout is dirty.

## Checks

1. Add red-first renderer and constitution contracts for the compact card,
   closed Details disclosure, plain action labels, removed mechanics copy, and
   one-sentence/no-repetition proposal instruction.
2. Keep the pure main-owned action view and exact existing busy/current/risk
   gates pinned; verify full attribution and context remain inside Details.
3. Run the focused unit contracts, full App unit suite, typecheck, and both
   production builds.
4. With the owner's app closed and both app-token directories held, run a
   fake-provider Electron path at the narrow window size. Inspect the initial
   risk card, expand Details, set the risk aside, prove the fresh risk-free
   card and enabled Review action, and capture the visible result. No real
   provider or worker may run.
5. Run `git diff --check`, inspect the exact diff and final Lane E/main status,
   and confirm the stopped main-checkout paths remain outside this lane.

## DONE / STOPPED

**DONE** means the real desktop proposal visibly reads as one concise decision,
Details preserves the complete attributed request and carried context, the
fresh set-aside replacement remains reliable and reviewable, the copy budget
is pinned, all required checks pass, and only isolated Task 184 paths are
committed in Lane E.

**STOPPED** means important task information becomes unavailable, the card or
disclosure is inaccessible, proposal or dispatch authority moves into the
renderer, the replacement card/risk gates regress, the narrow layout still
overwhelms or clips, a required check cannot be repaired safely, or protected
work changes unexpectedly.
