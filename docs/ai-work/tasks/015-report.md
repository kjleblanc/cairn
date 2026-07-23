# Task 015 — docs truth-and-vision report

## What changed

- `README.md` — the hardcoded version line now points at the changelog; new
  "Where Cairn is heading" section describing the conductor destination
  honestly (what works today vs. where it is going) and linking the route
  spec.
- `EVERYDAY-WORKFLOW.md` — dropped the stale "0.0.1" from the opening line.
- `MAINTAINERS.md` — dropped the stale "(currently 0.0.1)"; added the rule
  that no prose file repeats the version (guides point at the changelog);
  added a pointer to the route spec under the product promise.
- `PROJECT-CONVERSION.md` — the paste prompt no longer names a contract
  version; it names the copied `CONTRACT-TEMPLATE.md` instead, so it can never
  go stale again.
- `cli/README.md` — replaced the stale version line with the honest
  positioning (a maintainer and development front end; the desktop app is the
  beginner surface) and a changelog pointer.
- `app/README.md` — replaced the stale version line with a changelog pointer.
- `docs/ai-work/PROJECT.md` — rewritten: the conductor vision as the goal, the
  long-term self-building mission, the achieved first milestone recorded as
  history (Tasks 006 and 010), the new conductor milestone as current, the
  route-spec pointer, and unchanged scope and working rules.
- `AGENTS.md` — project facts only: WHAT WE ARE BUILDING now names the
  conductor; CURRENT MILESTONE is the new conductor milestone. The contract
  rule text is untouched.
- This brief, this report, and one log row.

## Checks run

- grep: the only remaining "0.0.1" mentions in active docs are correct
  historical statements (the reset entry in README's History section and the
  changelog's starting point in MAINTAINERS).
- AGENTS.md structural markers verified present (heading, Contract v line,
  facts labels), so project recognition is unaffected.
- Core suite 51/51 (contract-mirror equality included) and cli 9/9 after the
  changes. App suite not rerun: no app code or asset changed (its README is
  not read by any test).

## How to try it

Read README top to bottom: the version claim can no longer go stale, and the
new section says plainly where Cairn is heading. `docs/ai-work/PROJECT.md` now
matches the log's milestone history.

## Limitations

cairn.html's descriptive page text still reflects the serial-only present; it
was left for a future pass since its embedded contract is byte-locked to the
template and the page text makes no version or milestone claim that could go
stale. The new milestone is named, not reached — reaching it is Phase 1 work.

Milestone movement: NO

Disposition: DONE
