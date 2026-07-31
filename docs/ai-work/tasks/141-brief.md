# Task 141 brief: adopt the mobile groundwork — scope bend and decisions on record

**Lane:** B (`.lanes/b`)

## Requested visible outcome

The Task 142 mobile spec
(`docs/superpowers/specs/2026-07-30-cairn-mobile-groundwork-design.md`) is
adopted as the agreed direction, with the four owner-delegated decisions
recorded:

1. **Accept the PROJECT.md scope bend** — one LAN HTTP/WebSocket listener
   inside the existing app, no cloud, no relay, no accounts. PROJECT.md's
   out-of-scope line is rewritten to say exactly that.
2. **Plain HTTP on the home network with the pairing-screen disclosure** for
   v1; real encryption arrives with the away-from-home overlay phase.
3. **A fixed, printable default port** with an honest "already in use"
   fallback.
4. **The phone counts as a lane only when it works the repository** (the
   Task 140 contract text already says this).

Applied to: the spec's status block (accepted, with all four answers inline
including the rationale), `docs/ai-work/PROJECT.md` (the scope bend and a
route line naming the mobile milestone), and the task records. No version
bump: PROJECT.md scope is product direction, not contract text.

## Boundary of intent

- Spec status, PROJECT.md, and task records only. No code, no contract text
  (v0.6.0 already carries the lane rules the phone relies on), no
  dependency, no implementation.
- Implementation of the bridge is future recorded tasks, each with its own
  brief; this task only makes the direction and its decisions official.

## Checks that show the outcome holds

- Spec status reads "accepted" with all four answers and their reasons.
- PROJECT.md's out-of-scope line names the single listener bend and the
  milestone line references the mobile spec.
- Diff limited to those files plus task records.

## DONE / STOPPED here

- **DONE:** the two files carry the adopted decisions; owner gets a plain
  summary.
- **STOPPED:** writing the bend into PROJECT.md turns out to contradict a
  standing contract clause — surface it instead of forcing it.
