# Task 140 report: contract v0.6.0 — lanes, not two lanes

**Lane:** B (`.lanes/b`) · **Base synced from:** main @ fd4a1d1 (Task 136)

## What changed

The contract's lane protocol is now N-lane at **v0.6.0**, applying the three
owner-delegated decisions from the Task 138 spec. Files touched, exactly:

- `AGENTS.md` — v0.6.0; "Working in two lanes" rewritten as "Working in
  lanes" (lane = conversation not device; three-by-default cap; claim
  hardening; landing etiquette with between-tasks rule; profile-not-device
  tenancy; automations-are-not-lanes; worktree onboarding parenthetical);
  the whole-workflow intro sentence updated to match.
- `CONTRACT-TEMPLATE.md` — identical text (script-applied from AGENTS.md to
  keep the mirrors byte-consistent).
- `cairn.html` — embed re-spliced from the new template; eyebrow v0.6.0.
- `MAINTAINERS.md` — lane paragraph updated (v0.6.0 reference, claim check,
  between-tasks settle rule).
- `CHANGELOG.md` — the 0.6.0 entry, naming the pilot evidence and the three
  delegated calls.
- `docs/superpowers/specs/2026-07-30-cairn-n-lane-protocol-design.md` —
  status now "accepted as v0.6.0" with all three answers recorded inline.
- `app/`, `cli/`, `core/package.json` + the three lock files — version 0.6.0.

Delegated calls applied: cap three by default (attention, not mechanism);
claim hardening in the contract text; the phone counts as a lane only when
it works the repository.

## Checks run and their real results

- `grep -c "0.5.0"` on AGENTS.md, CONTRACT-TEMPLATE.md, cairn.html,
  MAINTAINERS.md → **0** each; v0.6.0 present in all four.
- `npm test` in `core/` → **139/139 pass** (build re-synced
  `assets/contract.md` from the new template).
- `npm run test:unit` in `app/` → **124/124 pass**.
- `git status` before commit: only the 12 files above plus task records.

## How to try it

Read the new "Working in lanes" section in `AGENTS.md` or the contract tab
in `cairn.html`; the CHANGELOG 0.6.0 entry is the plain-language summary.

## Limitations / remaining human judgment

- The mobile spec (Task 142) is adopted separately in Task 141 — this task
  changed lane rules only.
- Landing into `main` waits for lane A to be between tasks, per the very
  etiquette this amendment writes down.
- The three-lane cap is stated honestly as an attention budget; the first
  time a fourth lane is genuinely wanted, raising it is one owner sentence.

**Disposition: DONE**
