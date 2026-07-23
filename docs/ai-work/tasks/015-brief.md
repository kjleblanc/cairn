# Task 015 — the docs tell the truth and name the destination

Requested visible outcome: no active doc states a stale version or an outdated
milestone; the shared version is declared only where machines check or manage
it; and the front-door docs honestly describe both what works today and the
owner-approved conductor destination, with the new current milestone set in
`AGENTS.md` and `docs/ai-work/PROJECT.md`.

Why: README, EVERYDAY-WORKFLOW, MAINTAINERS, PROJECT-CONVERSION, cli/README,
and app/README still say 0.0.1 against a v0.0.5 contract — the
bump-everything-together procedure has already failed once, so prose stops
repeating the version instead of being bumped again. PROJECT.md still claims
the first milestone unmet; the log shows it was achieved twice (Tasks 006 and
010). The conductor direction exists only in the route spec; the front door
should name it honestly.

Boundary of intent: documentation and the two project-fact lines in AGENTS.md
(WHAT WE ARE BUILDING, CURRENT MILESTONE) only. No code, dependency, or
behavior change, and no change to the contract's rule text — the mirror set
(template, core asset, cairn.html embed) is untouched.

Checks:

- grep finds no stale standalone version claims in active docs (legacy/, the
  changelog, and historical task records rightly keep theirs);
- AGENTS.md keeps its structural markers (heading, "Contract v" line, facts
  labels) so project recognition still works; and
- core and cli suites stay green, including contract-mirror equality.

DONE means the greps and suites confirm the above. STOPPED means they do not.
Milestone movement: NO — this names the new milestone; reaching it is Phase 1
work.
