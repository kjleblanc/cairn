# Task 088 — Third Phase 4 amendment, and the plan opens with a spike

## Requested visible outcome

The Phase 4 spec carries a third dated amendment recording what reading the
SDK's implementation showed — that its type declarations do not describe its
behaviour — and the Phase 4 implementation plan lands in the repository with
a spike as its first task and its remaining tasks explicitly marked
provisional.

## Boundary of intent

Documentation only: no behavior, dependency, or contract change. No source
file, test, or configuration under `app/`, `core/`, or `cli/` is touched.
Neither the approved spec sections nor the first two amendments may be edited
in place.

Every claim about the SDK must come from reading `sdk.mjs` or `sdk.d.ts` in
this session. Where this amendment contradicts the second one, it must say so
plainly rather than quietly restating it.

The plan is committed in a state that is honest about not being executable:
its known defects are listed, and a reader must not be able to mistake tasks
1-10 for ready work.

## Checks

- The amendment corrects `skills: []` to a no-op, quoting the absence of any
  `--skills` flag, and states that two pins are load-bearing rather than
  three.
- `strictMcpConfig: true` and `persistSession: false` are each required with
  the reason and the flag that establishes it; the session-persistence entry
  names the consent consequence.
- The inverted fake-lane guard is corrected, with the reason the original was
  fail-open.
- The version-skew limitation is recorded: option-level assertions are
  retained but declared insufficient.
- The spike is required before any implementation task, with its questions
  named and its approval placed outside the agent loop.
- The redistribution question is recorded as the owner's.
- The plan carries a status block naming its six known defects, and Task 0
  changes no source file and stops before spending anything.
- One log row; exact-path commit.

## DONE / STOPPED

DONE: all eight checks hold and both documents are committed. STOPPED: a
correction turns out to need the owner rather than the record.
