# Task 055 — Report

## The milestone, verified

On 2026-07-24 the owner ran the first conductor-scoped dispatch through the
Phase 2 envelope, in the seeded Bookshelf evaluation project
(`Desktop\cairn-eval`, outside this repository), on Cairn 0.2.1 with the
connected conductor body OpenRouter / Kimi K2 and the Codex Exec worker
(OpenAI / gpt-5.6-sol).

Against the milestone's own terms, verified from the fixture's records and
Git (read-only), not from the screen:

- **Reading the real project records:** the conductor grounded its scoping
  in the fixture's shipped-task history (inferring the book data model from
  tasks 001–002) and referenced the fixture's stated milestone when
  weighing approaches.
- **A vague request:** "Let's make it so books are organized by them amount
  of words in them."
- **Clarifying questions, warranted and asked:** approach (add data now vs.
  wait for a future feature), sort direction, display-or-sort-only, then
  the data itself — one coherent question per turn, no interrogation of a
  trivial request, no silent guessing.
- **A well-scoped task that dispatched and completed DONE:** fixture task
  004, commit `5b65dab`, exactly `app.js` plus the three Cairn-owned
  records; protected work byte-identical; Cairn authored the report and log
  row itself with the worker's account quarantined as claims; the log row
  reads "(worker claim; files verified against Git by Cairn)".

Conductor conversation cost: about half a cent across four turns
(`.cairn/conversations/009.jsonl` in the fixture).

## One honest finding, carried to Phase 3 design

The owner supplied word counts (74, 477, 256). The conductor's card outcome
text — "sorted by word count (shortest first), with the word count visible" —
dropped those numbers, and the worker invented plausible real-world counts
for the actual books instead (65,252 / 95,356 / 168,000). The brief's
written outcome holds and the envelope verified everything it owns; the
fidelity gap is conductor-side (gathered data not carried into the card),
the same family as the eval's S3 invented-citation finding. Both now sit in
the Phase 3 design pile: the conductor must relay and preserve exactly what
it was given.

## What changed in this repository

- `docs/ai-work/LOG.md` — row 055, Milestone moved? **YES**.
- `docs/ai-work/PROJECT.md` — the conductor milestone moves into milestone
  history with its evidence; the next milestone (route spec, Phase 3) becomes
  current.
- `docs/ai-work/tasks/055-brief.md`, `055-report.md` — this record.
- `AGENTS.md` — CURRENT MILESTONE updated to match PROJECT.md.

The Phase 3 milestone wording is taken from the owner-approved route spec;
the Phase 3 design session is a phase-boundary re-plan and may refine it.

## Checks run

- Fixture verification: commit contents, clean tree, report structure
  (verified/claims separation), log-row honesty — all confirmed read-only. ✓
- Core suite after the doc edits (contract-mirror test included): green. ✓

## How to try it

Open `Desktop\cairn-eval` in the Cairn app: the Bookshelf lists books
shortest-first with visible word counts, and task 004's records show what
Cairn verified versus what the worker claimed.

Limitations: the fidelity finding is recorded, not fixed — it is Phase 3
design input, deliberately not patched ad hoc here.

Disposition: **DONE**
