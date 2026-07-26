# Task 082 — The eval set covers the rules conductor-v2 added

## Requested visible outcome

`docs/superpowers/evals/conductor-v0.md` carries two new scenarios that
exercise the two `conductor-v2` rules nothing tested before — data fidelity
and result commentary — each naming the rule it tests and the observed
failure it comes from, and the comparison table records which constitution
version each row scored so a future row measures a rule change rather than
a model change.

## Boundary of intent

Documentation only. No code, no behavior, no dependencies. The existing
eight scenarios keep their wording; the recorded `conductor-v1` row keeps
its scores exactly as the owner gave them and gains `n/a` for the two
scenarios that did not exist when it was run — never a score it never
earned. No eval is run by this task: every run costs the owner real money
and waits for their explicit go, per the contract and the eval document's
own rule.

## Checks

- Scenario 9 tests data fidelity and cites the milestone-run failure it
  comes from (task 055's report).
- Scenario 10 tests result commentary and names the offline-demonstration
  lane as the cheap way to run it, with the reason that lane sharpens the
  test.
- The table gains a `constitution` column and `S9`/`S10` columns; the
  existing row reads `conductor-v1` with `n/a` in both new cells and no
  changed score.
- The core suite stays green (the contract-mirror test is the only thing
  that reads this tree, and this file is not mirrored — confirm no
  breakage).

## DONE / STOPPED

DONE: all four checks hold and the file is committed. STOPPED: a scenario
cannot be written without an owner decision about its pass bar.
