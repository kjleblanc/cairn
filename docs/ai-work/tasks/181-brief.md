# Task 181 — guaranteed fresh proposal after setting a risk aside

**Lane:** Standard (main checkout)

**Base commit:** `30b42898c4d84053bfa27d490ff97b62da076e00`

## Visible outcome

When the owner presses **Set aside** on a current task risk, the old proposal
retires once and Cairn always shows a fresh main-owned proposal for the same
task. The set-aside concern is retained as context, the selected risk is no
longer unresolved, and **Review dispatch** is enabled when no other risks
remain — even when the conductor's replacement reply contains only prose or
an invalid/missing control block.

## Boundary of intent

- Main remains the only action and dispatch authority. The renderer must not
  reconstruct, edit, or revive a proposal.
- The fallback may use only the exact authenticated task action the owner just
  answered and the exact accepted set-aside reply. It gets a new opaque action
  identity and cannot restore the spent action or dispatch work.
- A valid fresh conductor action still wins. Other answers, corrections,
  ordinary messages, provider consent, costs, credentials, stored conversation
  data, dependencies, Core/CLI behavior, phone UI, and shipped visual styling
  do not change.
- Existing Task 180 stopped evidence is protected and stays byte-identical:
  `app/lab/pondchrome.css`, `app/lab/pondchrome.html`,
  `app/lab/pondchrome.tsx`, `app/vite.lab.config.ts`,
  `docs/ai-work/tasks/180-brief.md`,
  `docs/ai-work/tasks/180-report.md`, and its existing `LOG.md` row.
- No real provider or worker call is part of verification. Electron checks use
  only Cairn's fake provider and require both app-token locks; they wait while
  the owner's real app is open.

## Checks

1. Add a red-first deterministic service test proving that an accepted
   set-aside reply followed by prose-only conductor output yields one new
   main-owned proposal with the selected risk moved to context, remaining
   risks preserved, a new identity, and no replay of the old action.
2. Prove a valid conductor-supplied replacement takes precedence and that
   non-risk reply kinds do not gain fallback proposal authority.
3. Run the focused App unit checks, full App unit suite, typecheck, and both
   production builds.
4. With the owner's app closed and both app-token directories held, run the
   focused fake-provider Electron path and verify the old card disappears,
   the fresh card appears, and **Review dispatch** has the correct enabled
   state. Inspect the visible result if the harness can capture it safely.
5. Run `git diff --check`, inspect the exact diff and final Git status, and
   verify every protected Task 180 hash is unchanged.

## DONE / STOPPED

**DONE** means the visible set-aside flow is deterministic at main's authority
boundary, the executable checks pass, protected Task 180 evidence is unchanged,
and only exact Task 181 paths are committed.

**STOPPED** means the fresh card can still depend on model formatting, a test
fails without a safe in-scope repair, protected work changes unexpectedly, or
the required single-tenant UI check cannot be run after waiting for its token.
