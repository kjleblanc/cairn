# Task 085 — Record the acquiring-software contradiction and place it

## Requested visible outcome

The route spec carries a dated amendment stating that Cairn's contract grants
permission to install software while Cairn's code denies the capability, that
"tools" covers three categories with different reversibility, that only the
workspace-dependency category is in scope, and that the work belongs to
Phase 5 rather than Phase 4.

## Boundary of intent

Documentation only: no behavior, dependency, sandbox, or contract change. The
approved sections of the route spec may not be edited — the finding is
appended as a clearly dated amendment, because rewriting an approved decision
in place would hide that it was made later. No claim about Codex's sandbox
behavior may be stated as verified unless it was checked in this session;
what is inferred from Codex's documented default must say so.

## Checks

- The amendment names both sides of the contradiction with their exact
  locations (`core/assets/contract.md:113`, `core/src/codex.ts:718`, and the
  absence of `network_access`).
- It distinguishes the three categories, draws the in-scope line on Git
  revertibility, and gives the reason each out-of-scope category is out —
  including that category 3 would undo Phase 4's `settingSources` pin.
- It records the consent finding: a prompt the intended user cannot evaluate
  is not the mechanism that carries safety.
- It places the work in Phase 5 and says why Phase 4 is the wrong home.
- Verified and inferred claims are labelled as such.
- One log row; exact-path commit of the spec and this task's records.

## DONE / STOPPED

DONE: all six checks hold and the amendment is committed. STOPPED: the
finding turns out to require a contract or sandbox change rather than a
recorded decision.
