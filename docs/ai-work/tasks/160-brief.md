# Task 160 brief — project checkup: one button, an honest health report, fixes only suggested

**Lane:** A (main checkout)
**Base commit:** 6eb247e (Task 155 landed; tree clean apart from untracked strays — untouched here)

## Requested visible outcome

The owner: "We should create some kind of button/system that checks the
health of a selected project… Looks right, turn it into a task." — approving
the Checkup concept card shown in conversation (verdict first, findings
grouped Risk / Needs attention / Healthy, a suggested ordinary task beside
each fixable finding).

On the project picker, every healthy project gains a **Checkup** control
(the owner's words were "a selected project"; the picker is where selection
happens — placement is the owner's to veto at the result card). Pressing it
runs a read-only health audit of that project, on this machine, with no
model call, and shows a health report card:

1. A plain-language verdict up top — honest, never rounded up.
2. Findings grouped **Risk / Needs attention / Healthy**, in plain language.
3. A small records strip: one cell per task, 152-done-style counts, so the
   verdict is visible evidence rather than a gauge.
4. Every fixable finding carries a **suggested task**. Tapping it opens the
   project with the suggestion pre-filled in the composer — the owner
   reviews and presses send. The checkup itself never fixes, moves, or
   deletes anything, and a suggestion is never auto-sent or dispatched.
5. Run against Cairn itself, the card must tell today's truth: unpushed
   commits as the risk; in-flight briefs, untracked strays, and PROJECT.md's
   stale contract-version citation as attention items; intact pairing and
   in-sync contract versions as healthy.

## Why

The owner approved the concept from a hand-run sample. Cairn's promise is
honest state; a beginner cannot run these checks themselves. The contract's
risk boundaries mean cleanup stays owner-approved — so the checkup diagnoses
and prescribes, and never operates.

## Boundary of intent — what must not change

- **Read-only, always:** the checkup writes nothing to the checked project.
  No cleanup, no reordering, no auto-fix.
- **No model call, no network, no credentials, no dependency changes.** Every
  check is a local deterministic read plus the same user-git plumbing the app
  already relies on.
- Conductor conversation, dispatch gates, the envelope, the phone page:
  untouched.
- The untracked strays (`app/lab-server.log`, `app/launch-build.log`,
  `design/`) stay exactly as they are.
- `docs/ai-work/LOG.md`: one row appended, file left uncommitted (Task 149
  precedent; pending rows are the owner's pool).

## Plan (AI decision)

- New `app/src/main/checkup/` module: `runCheckup(projectPath)` returns a
  typed report `{ verdict, counts, findings: [{ group, title, detail,
  suggestion? }] }`. Checks: brief/report pairing and numbering gaps; LOG row
  count vs task files; in-flight briefs (brief without report); STOPPED log
  rows; git ahead-count plus modified/untracked status; AGENTS.md vs
  CONTRACT-TEMPLATE.md version strings and PROJECT.md's cited version;
  untracked strays matching log/tmp patterns. Verdict rule: any Risk →
  "Needs a decision"; else any attention → "Mostly healthy"; else "Healthy".
- IPC: one `projectCheckup` invoke channel on the existing bridge.
- Renderer: a quiet "Checkup" pill on healthy picker cards (beside the
  Task 158 remove control); the report renders as an overlay card in the
  app's own Lantern Dusk language, suggestion chips pre-fill the composer
  after opening the project (never auto-send).
- Regression pins (fixture-driven, no paid calls): unit pins for each check
  and the verdict rule; one new E2E spec driving the button against fixture
  projects with known defects, proving the card's rows match the fixture's
  true state and that tapping a suggestion only pre-fills.
- Truth spot-check: run the module against the Cairn repo root in a
  throwaway harness and confirm it reproduces the hand-audit findings.

## Checks that will show the outcome holds

1. `npm.cmd run typecheck`; `npm.cmd run test:unit` — green, including the
   new checkup pins.
2. `npm.cmd run build:vite`; `npm.cmd run build:lab` — green.
3. `npx playwright test tests/checkup.spec.ts` with BOTH app-token locations
   held (`app/.app-token`, `$TMPDIR/cairn-app-token`), windows parked
   off-display by the suite's own `CAIRN_E2E=1` seam.
4. The Cairn self-check output matches the hand-audit (unpushed risk;
   in-flight/strays/PROJECT.md attention; pairing + contract healthy).
5. Final `git status --porcelain` confirming exact-path staging only and
   protected strays untouched.

## DONE and STOPPED

- **DONE**: checks 1–5 pass; a picker Checkup press shows a truthful card for
  a fixture project and for Cairn itself, and nothing anywhere was modified
  by running it.
- **STOPPED**: the card can't be made truthful, or a check can't hold without
  crossing the read-only boundary; the report names what was tried and the
  safe state left behind.
