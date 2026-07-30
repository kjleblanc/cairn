# Task 133 brief: contract v0.5.0 — apply the owner-approved evolution

**Lane:** B (`.lanes/b`)

## Requested visible outcome

The Cairn contract becomes **v0.5.0**, carrying the eight owner-approved
changes from Task 132's proposal
(`docs/ai-work/proposals/2026-07-29-contract-evolution.md`), applied
consistently to every place the contract text lives:

1. `AGENTS.md` — the working rulebook.
2. `CONTRACT-TEMPLATE.md` — the canonical template.
3. Any code or embed mirror that carries contract text (to be found by
   searching for the current version string and section text; 0.1.0's
   changelog names the `cairn.html` embed as a mirror).
4. `CHANGELOG.md` — a 0.5.0 entry in the established style, citing the
   proposal and the owner's approvals (0.5.0; four delegated calls).
5. `docs/ai-work/PROJECT.md` — declares evidence level **Verified**.
6. `.gitignore` — ignores `docs-review/staged/` (regenerable copies); the
   review's REPORT.md and notes/ stay tracked.

Delegated calls being applied: no mechanized milestone ratchet (records-rule
only, per P4's demonstrated-failure principle); Cairn declares Verified;
`docs-review/staged/` ignored; no proposal items struck.

## Boundary of intent

- Contract text and its mirrors, the changelog, PROJECT.md's facts, and
  `.gitignore` only. No runtime behavior change; no app logic changes.
- The eight changes are applied as drafted in the proposal — no new ideas
  added in this task.
- No other project on disk is touched; rollout happens per the proposal's
  table as separate owner-directed work.
- Existing records and legacy archives unchanged.

## Checks that show the outcome holds

- Every file that carried "0.4.0" contract text now carries 0.5.0 text —
  verified by searching for the old version string and section diffs.
- All eight P-items are present in the new text; nothing else substantively
  changed.
- Repo typecheck/build/unit checks relevant to the touched files pass (docs
  and embedded text only — run the unit suite since it pins contract strings,
  e.g. `constitution.test.ts`).

## DONE / STOPPED here

- **DONE:** the version string and all eight changes are live in every mirror,
  the changelog entry exists, the pinning tests pass, and the diff contains
  only the named files plus task records.
- **STOPPED:** a mirror can't be updated without touching runtime behavior,
  or the pinning tests fail in a way that reveals a real inconsistency rather
  than a stale fixture.
