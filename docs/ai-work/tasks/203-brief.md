# Task 203 brief — record the owner-verdict design

**Lane:** A (the main checkout).

**Base commit:** `4dcdc73` — main after Task 199's model-connection vocabulary
merged.

**Number note.** 203 is the lowest genuinely free number. Finding it exposed a
gap between the contract's prose and its implementation — in the safe
direction, which is why this is a documentation fix and not a bug.

The contract says "a number is taken if its brief file exists". By that letter
148 is free: its brief was renumbered away by `3e0be00`, leaving
`148-report.md` on main and a STOPPED log row dated 2026-07-31. A reader
following the written rule would have reused 148 and collided a new task with a
stopped run's records.

**The code does not have this bug.** `taskNumbersInDir` matches `/^(\d{3,})-/`
against every file in the tasks directory, and the branch scan applies the same
match, so `cairn claim` already sees `148-report.md` and refuses the number
(`cli/src/flows/claim.ts:37,92`). The implementation is stricter than the
sentence describing it. **The amendment makes the prose match the code — a
number is taken if a brief or a report exists for it — and belongs to its own
task.**

**Attribution note.** The design this task records was taken in one
conversation on 2026-08-07. Six decisions are the owner's, made by explicit
choice and marked **Owner decision** in the spec. The owner then said: *"I
don't know enough to answer, so I am giving you complete control on these
decisions."* Everything after that point is **Cairn chose**, and the spec marks
it so. This follows the showing-not-asking spec's Decision 6: choosing is
permitted when the owner hands over the decision; attributing a choice to the
owner who did not make it is not.

## Requested visible outcome

Two documents exist in the repository, recording a design that did not exist
before: **what the owner thought of a finished job, recorded as a first-class
artifact.**

1. `docs/superpowers/specs/2026-08-07-cairn-owner-verdict-design.md` — seven
   Decisions covering the verdict record, its custody, the review queue, the
   rubric, and what the verdict deliberately does not touch.
2. An implementation plan, sequenced so the contract amendment lands before the
   app work that depends on it.

No product source changes. No app behaviour changes. This task records a
design and a plan; it builds neither.

## Why this design exists

The showing half of the owner's request is already built — evidence capture,
the album, evidence-led result cards, and the followups channel all ship. The
responding half exists nowhere: no spec, plan, type, store, or IPC call records
the owner's judgment.

It is not absent because nobody noticed. Seventeen of 197 task reports mention
the owner reviewing or approving the work, and **two quote what the owner
actually said**. The verdict already exists and survives as Cairn's summary of
it.

## Boundary of intent — what must not change

- **No product source is touched.** Recording only.
- **No risk boundary moves.** The design adds no capability to install, spend,
  send, delete, or publish, and says so.
- **Nothing is pushed.** The publication pause is untouched; every commit here
  is local.
- **No paid call is made.** The spec's eval scenario is recorded as owner-open
  work, not run.
- **No number is claimed beyond 203.** The follow-on tasks the plan describes
  are described, not claimed.
- **Attribution is not laundered.** No decision the owner did not make is
  marked as theirs.

## Checks that will show the outcome holds

Using the stable check ids the spec itself proposes, provisionally, as the
cheapest available proof that the format works before the contract adopts it.

1. **`203.c1` — the spec exists and is internally consistent.** No placeholder
   text, and no Decision contradicts another. The known risk is Decision 2
   ("recorded only") against Decision 5 (the conductor may read verdicts);
   the spec must resolve it in words rather than leave the reader to.
2. **`203.c2` — every file:line citation in the spec resolves to what it
   claims.** Checked by reading each cited line, not by trusting the search
   that found it. This project's eval has failed citation honesty twice.
3. **`203.c3` — the plan sequences the contract amendment before the app work
   that depends on it**, and claims no task number.
4. **`203.c4` — attribution is correct.** Exactly the six decisions the owner
   made are marked **Owner decision**; everything decided after the handover is
   marked as Cairn's.
5. **`203.c5` — the repository is otherwise untouched.** `git status` shows
   only this task's own files; no product source, no test, no build output.

Each check's evidence is a command or a file this report will name, per
`CONTRACT-TEMPLATE.md:143`.

## What DONE and STOPPED mean here

**DONE:** both documents are committed, all five checks pass, and the owner can
read the spec and disagree with it cheaply — nothing has been built on it yet.

**STOPPED:** any check fails and cannot be repaired inside this task; in
particular, if a citation proves wrong and the claim it supports cannot be
re-established, the claim comes out rather than being softened.

**Remaining human judgment.** Whether this design is worth building is the
owner's call and is not claimed by this task. The owner delegated the design
decisions, not the decision to proceed.
