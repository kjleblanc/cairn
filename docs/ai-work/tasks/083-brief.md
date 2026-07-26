# Task 083 — Record the conductor-v2 eval run

## Requested visible outcome

`docs/superpowers/evals/conductor-v0.md` carries a second row: the same
body (OpenRouter moonshotai/kimi-k2) scored against all ten scenarios under
`conductor-v2`, with its real cost, the evidence behind every non-pass, and
the confounds that limit what the v1→v2 comparison can support.

## Boundary of intent

Documentation only. No code, no behavior. The recorded `conductor-v1` row is
history and keeps every score and note byte-identical. The evaluation was
run by the owner in their own app against a real provider; this task records
what happened, and does not re-run, re-score, or amend any prior row.

## Checks

- The new row scores all ten scenarios, names the constitution version, and
  carries the measured cost rather than an estimate.
- Every partial cites the specific sentence that earned it, and every claim
  about the project (commit counts, log rows, briefing contents) was
  verified against the fixture before being written down.
- The confounds are stated in the row itself, not omitted: one run per
  scenario, a fixture that changed between runs, and different graders for
  the two rows.
- The `conductor-v1` row is unchanged.

## DONE / STOPPED

DONE: all four checks hold and the row is committed. STOPPED: a score
cannot be justified from the recorded evidence.
